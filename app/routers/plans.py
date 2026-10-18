from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse

from ..auth import Caller, current, feeds_for, get_engine, get_now, get_site, get_store, need
from ..engine import Engine
from ..errors import ApiError
from ..i18n import get_lang, t
from ..models import ApproveRequest, OverrideRequest, Plan, PlanStatus, Site, Strategy, StrategyOption
from ..planning import build_plan, offer_deadline
from ..store import Store
from .sites import require_data

router = APIRouter(prefix="/v1/sites/{site_id}/plans", tags=["Plans"])


def make(store: Store, engine: Engine, site: Site, day: date, now: datetime, lang: str, strategy: Strategy | None = None) -> Plan:
    require_data(store, site)
    if site.status == "maintenance":
        raise ApiError(409, "site_maintenance", site=site.name)
    st = store.plans.get((site.id, day))
    if st and st.approved:
        strategy = st.strategy
    else:
        strategy = strategy or (st.strategy if st else Strategy.balanced)
    return build_plan(engine, site, day, strategy, store.limits[site.id], dict(st.overrides) if st else {}, now,
                      feeds_for(store, site.id, now), lang, approved=bool(st and st.approved),
                      approved_by=st.approved_by if st else None, approved_at=st.approved_at if st else None,
                      export_cap_mw=store.interconnection[site.id].export_cap_mw)


def assert_editable(store: Store, site: Site, day: date, now: datetime) -> None:
    st = store.plans.get((site.id, day))
    if st and st.approved:
        raise ApiError(409, "plan_locked")
    dl = offer_deadline(day)
    if now > dl:
        raise ApiError(409, "deadline_passed", date=str(day), time=dl.strftime("%H:%M"))


@router.get("/{delivery_date}", response_model=Plan, summary="Day-ahead plan")
def get_plan(delivery_date: date, strategy: Strategy | None = Query(None, description="Preview another strategy. Ignored once approved."),
             site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
             engine: Engine = Depends(get_engine), now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> Plan:
    return make(store, engine, site, delivery_date, now, lang, strategy)


@router.get("/{delivery_date}/strategies", response_model=list[StrategyOption], summary="Compare the three strategies")
def strategies(delivery_date: date, site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
               engine: Engine = Depends(get_engine), now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> list[StrategyOption]:
    require_data(store, site)
    st = store.plans.get((site.id, delivery_date))
    out = []
    for s in Strategy:
        p = build_plan(engine, site, delivery_date, s, store.limits[site.id], dict(st.overrides) if st else {}, now,
                       feeds_for(store, site.id, now), lang)
        out.append(StrategyOption(strategy=s, description=t(f"s_{s.value}", lang), energy_margin=p.summary.energy_margin,
                                  cycles=p.summary.cycles, likely_critical_hours_covered=p.summary.likely_critical_hours_covered,
                                  within_limits=p.limit_check.ok, violations=p.limit_check.violations))
    return out


@router.post("/{delivery_date}/overrides", response_model=Plan, summary="Override one hour")
def add_override(delivery_date: date, body: OverrideRequest, site: Site = Depends(get_site), c: Caller = Depends(need("plan.edit")),
                 store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
                 lang: str = Depends(get_lang)) -> Plan:
    require_data(store, site)
    assert_editable(store, site, delivery_date, now)
    before = make(store, engine, site, delivery_date, now, lang).hours[body.hour].dispatch_mw
    store.plan_state(site.id, delivery_date).overrides[body.hour] = body.dispatch_mw
    store.log(now, c.actor, "plan.override", f"{delivery_date} {body.hour:02d}:00 {before:g} → {body.dispatch_mw:g} MW. Reason: {body.reason}", site.id)
    return make(store, engine, site, delivery_date, now, lang)


@router.delete("/{delivery_date}/overrides/{hour}", response_model=Plan, summary="Remove an override")
def remove_override(delivery_date: date, hour: int, site: Site = Depends(get_site), c: Caller = Depends(need("plan.edit")),
                    store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
                    lang: str = Depends(get_lang)) -> Plan:
    assert_editable(store, site, delivery_date, now)
    st = store.plan_state(site.id, delivery_date)
    if hour not in st.overrides:
        raise ApiError(404, "no_override", hour=hour)
    del st.overrides[hour]
    store.log(now, c.actor, "plan.override_removed", f"{delivery_date} {hour:02d}:00", site.id)
    return make(store, engine, site, delivery_date, now, lang)


def do_approve(store: Store, engine: Engine, site: Site, day: date, strategy: Strategy, ack: bool, c: Caller, now: datetime,
               lang: str, note: str | None = None, channel: str | None = None, sign_off: bool = False) -> Plan:
    """Approve and lock a plan. Shared by the app and the WhatsApp channel."""
    require_data(store, site)
    assert_editable(store, site, day, now)
    if store.battery_source(site.id, now) == "model" and not (sign_off and c.can("plan.signoff") and not channel):
        raise ApiError(428, "model_needs_signoff", details={"state_source": "model"})
    plan = make(store, engine, site, day, now, lang, strategy)
    hard = [v for v in plan.limit_check.violations if v.severity == "hard"]
    soft = [v for v in plan.limit_check.violations if v.severity == "soft"]
    if hard:
        raise ApiError(422, "hard_violations", details=[v.model_dump() for v in hard])
    if soft:
        if channel:
            raise ApiError(409, "needs_app_signoff", details=[v.model_dump() for v in soft])
        if not ack:
            raise ApiError(409, "soft_needs_ack", details=[v.model_dump() for v in soft])
        if not c.can("plan.signoff"):
            raise ApiError(403, "soft_needs_signoff")
    st = store.plan_state(site.id, day)
    st.approved, st.strategy, st.approved_by, st.approved_at = True, strategy, c.actor, now
    signed = f" Signed off: {', '.join(v.code for v in soft)}." if soft else ""
    if sign_off and store.battery_source(site.id, now) == "model":
        signed += " Signed off: modelled battery state."
    note_txt = f" Note: {note}" if note else ""
    via = f" Channel: {channel}." if channel else ""
    store.log(now, c.actor, "plan.approve", f"{day} {strategy.value}, energy margin {plan.summary.energy_margin:,.0f} MXN.{signed}{note_txt}{via}", site.id)
    for a in store.alerts:
        if a["status"] == "open" and a["resource"] == f"/v1/sites/{site.id}/plans/{day}":
            a.update(status="resolved", resolution="plan_approved", resolved_by=c.actor, resolved_at=now)
    store.emit(now, "plan.approved", {"site_id": site.id, "delivery_date": str(day), "strategy": strategy.value,
                                      "energy_margin": plan.summary.energy_margin, "approved_by": c.actor,
                                      "signed_off": [v.code for v in soft], "channel": "whatsapp" if channel else "app"})
    return make(store, engine, site, day, now, lang)


@router.post("/{delivery_date}/approve", response_model=Plan, summary="Approve and lock the plan")
def approve(delivery_date: date, body: ApproveRequest, site: Site = Depends(get_site), c: Caller = Depends(need("plan.approve")),
            store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
            lang: str = Depends(get_lang)) -> Plan:
    return do_approve(store, engine, site, delivery_date, body.strategy, body.acknowledge_soft_violations, c, now, lang, body.note,
                      sign_off=body.sign_off)


@router.get("/{delivery_date}/offer-file", response_class=PlainTextResponse, summary="Export the offer file (CSV)")
def offer_file(delivery_date: date, site: Site = Depends(get_site), c: Caller = Depends(need("plan.export")),
               store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
               lang: str = Depends(get_lang)) -> PlainTextResponse:
    plan = make(store, engine, site, delivery_date, now, lang)
    if plan.status != PlanStatus.approved:
        raise ApiError(409, "approve_first")
    rows = ["# Generic hourly schedule. Map to the CENACE submission format before use.",
            "site_id,node_id,delivery_date,hour,dispatch_mw,price_forecast_mxn_mwh"]
    rows += [f"{site.id},{site.node_id},{delivery_date},{h.hour},{h.dispatch_mw:g},{h.price_forecast:g}" for h in plan.hours]
    store.log(now, c.actor, "plan.export", f"Offer file for {delivery_date}", site.id)
    return PlainTextResponse("\n".join(rows) + "\n", media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="offer-{site.id}-{delivery_date}.csv"'})
