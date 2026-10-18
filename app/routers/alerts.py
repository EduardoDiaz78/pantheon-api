from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query

from ..auth import Caller, current, get_now, get_store, need
from ..errors import ApiError
from ..i18n import get_lang, t
from ..models import Alert, AlertDecision, AuditEntry, Escalation
from ..store import Store

router = APIRouter(prefix="/v1", tags=["Alerts and audit"])
_ORDER = {"action": 0, "high": 1, "medium": 2, "low": 3}


def render(a: dict, lang: str) -> Alert:
    return Alert(id=a["id"], severity=a["severity"], delivery=a["delivery"], site_id=a["site_id"],
                 title=t(a["title"][0], lang, **a["title"][1]), detail=t(a["detail"][0], lang, **a["detail"][1]),
                 created_at=a["created_at"], due=a.get("due"), status=a["status"], options=a["options"],
                 resource=a.get("resource"), resolution=a.get("resolution"), resolved_by=a.get("resolved_by"),
                 resolved_at=a.get("resolved_at"), escalated_to=a.get("escalated_to"))


def find(store: Store, alert_id: str) -> dict:
    a = next((x for x in store.alerts if x["id"] == alert_id), None)
    if not a:
        raise ApiError(404, "not_found", what=f"Alert '{alert_id}'")
    return a


@router.get("/alerts", response_model=list[Alert], summary="Alerts")
def alerts(severity: Optional[Literal["action", "high", "medium", "low"]] = None,
           status: Literal["open", "resolved", "all"] = "open", site_id: Optional[str] = None,
           _: Caller = Depends(current), store: Store = Depends(get_store), lang: str = Depends(get_lang)) -> list[Alert]:
    rows = [a for a in store.alerts if (status == "all" or a["status"] == status)
            and (not severity or a["severity"] == severity) and (not site_id or a["site_id"] == site_id)]
    rows.sort(key=lambda a: (_ORDER[a["severity"]], -a["created_at"].timestamp()))
    return [render(a, lang) for a in rows]


@router.get("/alerts/{alert_id}", response_model=Alert, summary="One alert")
def one(alert_id: str, _: Caller = Depends(current), store: Store = Depends(get_store), lang: str = Depends(get_lang)) -> Alert:
    return render(find(store, alert_id), lang)


@router.post("/alerts/{alert_id}/resolve", response_model=Alert, summary="Decide or acknowledge an alert")
def resolve(alert_id: str, body: AlertDecision, c: Caller = Depends(need("alert.act")), store: Store = Depends(get_store),
            now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> Alert:
    return render(do_resolve(store, find(store, alert_id), body.choice, body.note, c, now), lang)


def do_resolve(store: Store, a: dict, choice: str, note: str | None, c: Caller, now: datetime, channel: str | None = None) -> dict:
    alert_id = a["id"]
    if a["status"] != "open":
        raise ApiError(409, "alert_closed")
    allowed = a["options"] or ["acknowledge"]
    if choice not in allowed:
        raise ApiError(422, "bad_decision", choice=choice, options=", ".join(allowed))
    if choice == "hold_battery" and a["site_id"]:
        s = store.sites[a["site_id"]]
        store.sites[s.id] = s.model_copy(update={"status": "holding"})
    a.update(status="resolved", resolution=choice, resolved_by=c.actor, resolved_at=now)
    note_txt = f" Note: {note}" if note else ""
    via = f" Channel: {channel}." if channel else ""
    store.log(now, c.actor, "alert.resolve", f"{alert_id}: {choice}.{note_txt}{via}", a["site_id"])
    store.emit(now, "alert.resolved", {"alert_id": alert_id, "choice": choice, "by": c.actor, "channel": "whatsapp" if channel else "app"})
    return a


@router.post("/alerts/{alert_id}/escalate", response_model=Alert, summary="Hand an alert to someone else")
def escalate(alert_id: str, body: Escalation, c: Caller = Depends(need("alert.act")), store: Store = Depends(get_store),
             now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> Alert:
    return render(do_escalate(store, find(store, alert_id), body.to_user_id, body.note, c, now), lang)


def do_escalate(store: Store, a: dict, to_user_id: str, note: str | None, c: Caller, now: datetime, channel: str | None = None) -> dict:
    u = store.users.get(to_user_id)
    if not u:
        raise ApiError(404, "not_found", what=f"User '{to_user_id}'")
    a["escalated_to"] = u.name
    note_txt = f" Note: {note}" if note else ""
    via = f" Channel: {channel}." if channel else ""
    store.log(now, c.actor, "alert.escalate", f"{a['id']} → {u.name}.{note_txt}{via}", a["site_id"])
    return a


@router.get("/audit-log", response_model=list[AuditEntry], summary="Audit log, newest first (append-only)")
def audit_log(site_id: Optional[str] = None, limit: int = Query(50, ge=1, le=500),
              _: Caller = Depends(need("audit.read")), store: Store = Depends(get_store)) -> list[AuditEntry]:
    rows = [(i, e) for i, e in enumerate(store.audit) if not site_id or e["site_id"] == site_id]
    rows = sorted(rows, key=lambda r: (r[1]["at"], r[0]), reverse=True)[:limit]
    return [AuditEntry(**e) for _, e in rows]
