"""In-memory store, seeded with the same sample data as the design mockups.

Swap for a database before production. Writes that matter go through
`log()` (append-only audit) and `emit()` (webhook outbox).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass, field
from datetime import date, datetime
from uuid import uuid4

from .models import Health, Interconnection, MaintenanceWindow, NotificationSettings, OperatingLimits, Role, Site, Strategy, User
from .planning import MX_TZ

PERMISSIONS: dict[Role, set[str]] = {
    Role.viewer: {"read"},
    Role.auditor: {"read", "audit.read", "track.export"},
    Role.operator: {"read", "track.export", "plan.edit", "plan.approve", "plan.export", "alert.act", "qenergy.read"},
    Role.asset_manager: {"read", "track.export", "plan.edit", "plan.approve", "plan.export", "alert.act",
                         "plan.signoff", "maintenance.edit", "audit.read", "dispute.create", "users.read", "qenergy.read"},
    Role.admin: {"read", "track.export", "plan.edit", "plan.approve", "plan.export", "alert.act",
                 "plan.signoff", "maintenance.edit", "audit.read", "dispute.create", "users.read",
                 "limits.edit", "users.edit", "webhooks.manage", "business.read", "forecast.write", "qenergy.read", "qenergy.write",
                 "vispera.admin", "vispera.disclose", "vispera.keys"},
    Role.engine: {"forecast.write"},
    Role.partner: {"qenergy.read", "qenergy.write", "vispera.disclose"},
    Role.client: {"vispera.disclose"},
}


def T(d: str, hm: str) -> datetime:
    return datetime.fromisoformat(f"{d}T{hm}:00").replace(tzinfo=MX_TZ)


@dataclass
class PlanState:
    approved: bool = False
    strategy: Strategy = Strategy.balanced
    overrides: dict[int, float] = field(default_factory=dict)
    approved_by: str | None = None
    approved_at: datetime | None = None


class Store:
    def __init__(self) -> None:
        self.organization = "[CLIENT]"
        self.users: dict[str, User] = {u.id: u for u in [
            User(id="u-daniela", name="Daniela", role=Role.operator, email="daniela@[client].mx"),
            User(id="u-mauricio", name="Mauricio", role=Role.asset_manager, email="mauricio@[client].mx"),
            User(id="u-lucia", name="Lucía", role=Role.viewer, email="lucia@[client].mx"),
            User(id="u-andres", name="Andrés", role=Role.auditor, email="andres@[lender].com", language="en"),
            User(id="u-admin", name="Genau", role=Role.admin, email="admin@[client].mx"),
            User(id="u-engine", name="Pantheon engine", role=Role.engine, email="engine@genau-ai.com", language="en"),
            User(id="u-jose", name="José Antonio", role=Role.partner, email="[jose-antonio]@qenergy.mx"),
            User(id="u-client", name="Bank analyst", role=Role.client, email="[analyst]@[bank].mx"),
        ]}
        # Demo keys only. Production: hashed keys, scoped to an organization's sites.
        self.api_keys: dict[str, str] = {
            "demo-operator": "u-daniela", "demo-manager": "u-mauricio", "demo-viewer": "u-lucia",
            "demo-auditor": "u-andres", "demo-admin": "u-admin", "demo-engine": "u-engine", "demo-qenergy": "u-jose",
            "demo-client": "u-client",
        }
        # Real keys for the engine and QEnergy come from the host's environment, never from code.
        import os
        for env, uid in (("PANTHEON_ENGINE_KEY", "u-engine"), ("PANTHEON_QENERGY_KEY", "u-jose")):
            if os.getenv(env):
                self.api_keys[os.environ[env]] = uid
        if os.getenv("PANTHEON_DEMO_KEYS", "true").lower() != "true":
            for k in ("demo-engine", "demo-qenergy", "demo-client"):
                self.api_keys.pop(k, None)
        # Verified WhatsApp numbers (digits only) → user. Sample numbers.
        self.whatsapp: dict[str, str] = {"528100004821": "u-daniela", "528100007310": "u-mauricio"}
        for num, uid in self.whatsapp.items():
            self.users[uid] = self.users[uid].model_copy(update={"whatsapp_masked": mask(num)})
        self.notifications: dict[str, NotificationSettings] = {uid: NotificationSettings() for uid in self.users}
        sites = [
            Site(id="site-a", name="[CLIENT] plant", region="Nuevo León", node_id="[NODE ID]", power_mw=10, energy_mwh=40, solar_mw=30, status="discharging", soc_pct=62),
            Site(id="site-b", name="Site B", region="Jalisco", node_id="[NODE ID]", power_mw=8, energy_mwh=32, status="charging", soc_pct=38),
            Site(id="site-c", name="Site C", region="Sonora", node_id="[NODE ID]", power_mw=12, energy_mwh=48, solar_mw=40, status="holding", soc_pct=91),
            Site(id="site-d", name="Site D", region="Yucatán", node_id="[NODE ID]", power_mw=6, energy_mwh=24, status="charging", soc_pct=24),
            Site(id="site-e", name="Site E", region="Querétaro", node_id="[NODE ID]", power_mw=5, energy_mwh=10, status="discharging", soc_pct=55),
            Site(id="site-f", name="Site F", region="Baja California", node_id="[NODE ID]", power_mw=7, energy_mwh=16, status="maintenance"),
            Site(id="site-g", name="[CLIENT] plant 2", region="Coahuila", node_id="[NODE ID]", power_mw=20, energy_mwh=80, solar_mw=60, status="onboarding"),
        ]
        self.sites: dict[str, Site] = {s.id: s for s in sites}
        self.first_plan_expected: dict[str, date] = {"site-g": date(2026, 10, 20)}
        self.limits: dict[str, OperatingLimits] = {s.id: OperatingLimits() for s in sites}
        self.plans: dict[tuple[str, date], PlanState] = {}
        # Matches the Fleet screen: B, D and E already approved for tomorrow; A and C pending.
        for sid in ("site-b", "site-d", "site-e"):
            self.plans[(sid, date(2026, 10, 18))] = PlanState(approved=True, approved_by="Daniela", approved_at=T("2026-10-17", "07:50"))
        self.health: dict[str, Health] = {s.id: Health(state_of_health_pct=98.1, warranty_minimum_pct_today=97.4, cycles_ytd=212,
                                                       annual_cycle_budget=365, availability_30d_pct=99.2, avg_cell_temp_c=27) for s in sites}
        self.maintenance: dict[str, list[MaintenanceWindow]] = {s.id: [] for s in sites}
        self.maintenance["site-a"].append(MaintenanceWindow(id="mw-1", start=T("2026-10-20", "08:00"), end=T("2026-10-20", "14:00"), reason="Inverter inspection"))
        # Sites not listed here report live (2 minutes before the clock). Site C's feed stopped at 07:42.
        self.telemetry_last: dict[str, datetime] = {"site-c": T("2026-10-17", "07:42")}
        self.prices_last = T("2026-10-17", "07:00")
        self.disputes: dict[str, dict] = {}
        self.disputed_days: set[tuple[str, date]] = set()
        # Alerts are stored as message keys so each reader gets their language.
        self.alerts: list[dict] = [
            {"id": "al-1", "severity": "action", "delivery": "push", "site_id": "site-a",
             "title": ("a_plan_ready_t", {"time": "10:00"}),
             "detail": ("a_plan_ready_d", {"n": 3, "window": "19:00–22:00", "covered": 3}),
             "created_at": T("2026-10-16", "18:02"), "due": T("2026-10-17", "10:00"), "options": [],
             "resource": "/v1/sites/site-a/plans/2026-10-18", "status": "open"},
            {"id": "al-2", "severity": "medium", "delivery": "digest", "site_id": "site-a",
             "title": ("a_settle_t", {"date": "2026-10-04", "pct": "−5.9"}), "detail": ("a_settle_d", {}),
             "created_at": T("2026-10-16", "09:15"), "due": None, "options": [],
             "resource": "/v1/sites/site-a/settlements?month=2026-10", "status": "open"},
            {"id": "al-3", "severity": "high", "delivery": "push", "site_id": "site-c",
             "title": ("a_stale_t", {"minutes": 6}), "detail": ("a_stale_d", {"pct": 91, "time": "07:42"}),
             "created_at": T("2026-10-17", "07:48"), "due": None, "options": ["keep_plan", "hold_battery"],
             "resource": "/v1/sites/site-c/now", "status": "open"},
            {"id": "al-4", "severity": "low", "delivery": "digest", "site_id": "site-a",
             "title": ("a_maint_t", {"window": "20 Oct 08:00–14:00"}), "detail": ("a_maint_d", {}),
             "created_at": T("2026-10-15", "11:00"), "due": None, "options": [],
             "resource": "/v1/sites/site-a/maintenance-windows", "status": "open"},
        ]
        self.audit: list[dict] = [
            {"at": T("2026-10-15", "09:28"), "actor": "Genau", "action": "maintenance.create", "detail": "Added maintenance window 20 Oct 08:00–14:00 (Inverter inspection)", "site_id": "site-a"},
            {"at": T("2026-10-15", "09:30"), "actor": "Genau", "action": "limits.update", "detail": "min_soc_pct 5 → 10", "site_id": "site-a"},
            {"at": T("2026-10-16", "18:02"), "actor": "Pantheon", "action": "plan.generated", "detail": "Day-ahead plan generated for 2026-10-18", "site_id": "site-a"},
        ]
        self.webhooks: dict[str, dict] = {}
        self.deliveries: dict[str, list[dict]] = {}
        # CENACE side. Offers are recorded when [TRADER] confirms submission; cleared schedules when the MDA result arrives.
        self.interconnection: dict[str, Interconnection] = {s.id: Interconnection(node=s.node_id, storage_registered=s.id in ("site-a", "site-b", "site-d", "site-e")) for s in sites}
        self.interconnection["site-a"] = Interconnection(node="[NODE ID]", export_cap_mw=38.0, grid_charging="allowed_with_limit", pml_limit_mxn=700.0, storage_registered=True)
        self.offers: dict[tuple[str, date], dict] = {}
        self.cleared: dict[tuple[str, date], dict] = {}
        self.meter: dict[tuple[str, date], dict] = {}
        self.statements: dict[tuple[str, date], dict] = {}
        # Yesterday (16 Oct) on site A: offered 3 MW at 22:00, CENACE cleared 1.5 MW (congestion). Shown on the replay.
        from .replay import FORECAST, PLANNED
        cleared_yday = list(PLANNED); cleared_yday[22] = 1.5
        self.cleared[("site-a", date(2026, 10, 16))] = {"mw": cleared_yday, "offered": list(PLANNED), "prices": FORECAST,
                                                      "received_at": T("2026-10-15", "14:10"), "source": "[TRADER] portal", "reasons": {22: "congestion"}}
        for sid in ("site-b", "site-d", "site-e"):
            self.offers[(sid, date(2026, 10, 18))] = {"submitted_at": T("2026-10-17", "08:05"), "by": "[TRADER]", "confirmation": f"MDA-2026-10-18-{sid[-1].upper()}01"}
        self.statements[("site-a", date(2026, 10, 16))] = {"energy": 80400.0, "capacity": 0.0, "charges": 1210.0, "kind": "preliminary",
                                                          "received_at": T("2026-10-17", "07:55"), "file": "edo-cuenta-prelim-2026-10-16.csv"}

    # ---- helpers ----
    def new_id(self, prefix: str) -> str:
        return f"{prefix}-{uuid4().hex[:8]}"

    def plan_state(self, site_id: str, day: date) -> PlanState:
        return self.plans.setdefault((site_id, day), PlanState())

    def battery_source(self, site_id: str, now: datetime) -> str:
        """'ems' when the site EMS reported in the last 5 minutes, else 'model' (state of charge is modelled)."""
        last = self.telemetry_last.get(site_id)
        return "model" if last and (now - last).total_seconds() > 300 else "ems"

    def log(self, now: datetime, actor: str, action: str, detail: str, site_id: str | None = None) -> None:
        self.audit.append({"at": now, "actor": actor, "action": action, "detail": detail, "site_id": site_id})

    def emit(self, now: datetime, event: str, data: dict) -> None:
        """Queue a signed webhook delivery for every subscriber of this event."""
        for wid, w in self.webhooks.items():
            if event not in w["events"]:
                continue
            payload = {"id": self.new_id("evt"), "type": event, "created_at": now.isoformat(), "data": data}
            body = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
            sig = hmac.new(w["secret"].encode(), body, hashlib.sha256).hexdigest()
            self.deliveries.setdefault(wid, []).append({"id": payload["id"], "event": event, "created_at": now,
                                                        "status": "queued", "signature": sig, "payload": payload})

    def new_secret(self) -> str:
        return "whsec_" + secrets.token_hex(16)


def digits(number: str) -> str:
    return "".join(ch for ch in number if ch.isdigit())


def mask(number_digits: str) -> str:
    return f"+{number_digits[:2]} ••• {number_digits[-4:]}"
