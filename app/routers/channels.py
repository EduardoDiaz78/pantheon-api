"""Daily replay and the WhatsApp channel. Sample data only."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..auth import Caller, current, get_engine, get_now, get_site, get_store
from ..engine import Engine
from ..errors import ApiError
from ..i18n import get_lang, t
from ..models import (AuditEntry, Replay, ReplayDriver, ReplayHour, ReplaySummary, Site, Strategy, WhatsAppButton,
                      WhatsAppInbound, WhatsAppMessage, WhatsAppReply)
from ..planning import offer_deadline
from ..replay import ACTUAL, ACTUAL_MW, CONFIRMED_CRITICAL, FORECAST, PLANNED, SAMPLE_DAY, SAMPLE_SITE, WEAR, replay_summary, totals
from ..store import Store, digits, mask
from .alerts import do_escalate, do_resolve, find, render
from .plans import do_approve, make

router = APIRouter(tags=["Daily replay and WhatsApp"])


def fmt(n: float) -> str:
    return f"{n:,.0f}"


@router.get("/v1/sites/{site_id}/replay/{day}", response_model=Replay, summary="Yesterday, replayed: did it earn its fee?")
def replay(day: date, site: Site = Depends(get_site), _: Caller = Depends(current), lang: str = Depends(get_lang),
           store: Store = Depends(get_store)) -> Replay:
    if site.id != SAMPLE_SITE or day != SAMPLE_DAY:
        raise ApiError(404, "no_sample_day", site=SAMPLE_SITE)
    tt, s = totals(), replay_summary()
    cleared = store.cleared.get((site.id, day), {}).get("mw") or list(PLANNED)
    stmt = store.statements.get((site.id, day))
    sources = {"dispatched": "ems", "measured": "meter" if (site.id, day) in store.meter else "ems (meter intervals not imported)",
               "prices": "pml", "cleared": "cenace via [TRADER]",
               "settlement": f"{stmt['kind']} statement {stmt['received_at']:%Y-%m-%d}" if stmt else "awaiting statement"}
    run, hours = 0.0, []
    for h in range(24):
        run += tt["actual"][h]
        hours.append(ReplayHour(hour=h, price_forecast=FORECAST[h], price_actual=ACTUAL[h], planned_mw=PLANNED[h], actual_mw=ACTUAL_MW[h], cleared_mw=cleared[h],
                                planned_value=tt["planned"][h], value_vs_idle=tt["actual"][h], running_total=run,
                                confirmed_critical=h in CONFIRMED_CRITICAL))
    earned = s["value_vs_idle"] > 0
    direction = t("r_more" if s["vs_plan"] >= 0 else "r_less", lang)
    cov = t("r_both", lang) if s["covered"] == len(CONFIRMED_CRITICAL) == 2 else s["critical_hours_covered"]
    headline = t("r_yes" if earned else "r_no", lang, value=fmt(s["value_vs_idle"]), pct=abs(s["vs_plan_pct"]), dir=direction, cov=cov)
    return Replay(site_id=site.id, date=day, earned_its_fee=earned, headline=headline, baseline=t("r_baseline", lang), wear_cost_per_mwh=WEAR,
                  summary=ReplaySummary(value_vs_idle=s["value_vs_idle"], plan_value=s["plan_value"], vs_plan=s["vs_plan"],
                                        vs_plan_pct=s["vs_plan_pct"], critical_hours=s["critical_hours"],
                                        critical_hours_covered=s["critical_hours_covered"], fee_note=t("r_fee_note", lang)),
                  drivers=[ReplayDriver(code="prices", label=t("r_prices", lang), amount=tt["price_effect"]),
                           ReplayDriver(code="dispatch", label=t("r_dispatch", lang), amount=tt["dispatch_effect"])],
                  hours=hours, sources=sources)


def _number_of(store: Store, user_id: str) -> Optional[str]:
    return next((mask(n) for n, uid in store.whatsapp.items() if uid == user_id), None)


def _window(hours: list[int]) -> str:
    return f"{min(hours):02d}:00–{max(hours) + 1:02d}:00" if hours else "—"


@router.get("/v1/channels/whatsapp/plan-message", response_model=WhatsAppMessage, summary="Preview the morning plan message sent on WhatsApp")
def plan_message(site_id: str = Query(..., examples=["site-a"]), day: Optional[date] = Query(None, alias="date", description="Delivery date. Defaults to tomorrow."),
                 c: Caller = Depends(current), store: Store = Depends(get_store), engine: Engine = Depends(get_engine),
                 now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> WhatsAppMessage:
    site = get_site(site_id, store)
    day = day or now.date() + timedelta(days=1)
    plan = make(store, engine, site, day, now, lang)
    flagged = [h.hour for h in plan.hours if h.likely_critical]
    ok = plan.limit_check.ok
    left = max(0, plan.minutes_to_deadline)
    text = t("wa_plan", lang, name=c.user.name, site=site.name, margin=fmt(plan.summary.energy_margin), strategy=t(f"st_{plan.strategy.value}", lang),
             window=_window(flagged), covered=plan.summary.likely_critical_hours_covered, n=plan.summary.likely_critical_hours,
             checks=t("wa_checks_ok" if ok else "wa_checks_signoff", lang), deadline=offer_deadline(day).strftime("%H:%M"),
             left=f"{left // 60} h {left % 60} min")
    buttons = [WhatsAppButton(id="approve", title=t("wa_b_approve", lang))] if ok and plan.status.value == "draft" else []
    buttons.append(WhatsAppButton(id="see_details", title=t("wa_b_details", lang)))
    return WhatsAppMessage(kind="plan", to=_number_of(store, c.user.id), text=text, chart_caption=t("wa_chart", lang), buttons=buttons,
                           can_approve_here=ok, context={"site_id": site.id, "date": str(day)})


@router.get("/v1/channels/whatsapp/alert-message/{alert_id}", response_model=WhatsAppMessage, summary="Preview an incident message sent on WhatsApp")
def alert_message(alert_id: str, c: Caller = Depends(current), store: Store = Depends(get_store), lang: str = Depends(get_lang)) -> WhatsAppMessage:
    a = render(find(store, alert_id), lang)
    site = store.sites.get(a.site_id or "")
    buttons = [WhatsAppButton(id=o, title=t("wa_b_keep" if o == "keep_plan" else "wa_b_hold", lang)) for o in a.options]
    if a.options:
        buttons.append(WhatsAppButton(id="hand_off", title=t("wa_b_hand", lang, name="Mauricio")))
    return WhatsAppMessage(kind="incident", to=_number_of(store, c.user.id), buttons=buttons, context={"alert_id": alert_id},
                           text=t("wa_incident", lang, site=site.name if site else "", title=a.title, detail=a.detail))


@router.post("/v1/channels/whatsapp/inbound", response_model=WhatsAppReply, summary="A button tapped in WhatsApp (simulated webhook)",
             description="In production this is the WhatsApp Business webhook, checked against the provider's signature. "
                         "The sender must be a verified number on file; the action runs with that person's role and is written "
                         "to the audit log with the channel. Plans that need a sign-off cannot be approved here.")
def inbound(body: WhatsAppInbound, store: Store = Depends(get_store), engine: Engine = Depends(get_engine),
            now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> WhatsAppReply:
    num = digits(body.from_number)
    uid = store.whatsapp.get(num)
    if not uid:
        raise ApiError(403, "wa_unknown_number")
    c = Caller(store.users[uid])
    channel = f"WhatsApp, verified number {mask(num)}"
    hm = now.strftime("%H:%M")

    def need(perm: str) -> None:
        if not c.can(perm):
            raise ApiError(403, "forbidden", role=c.role.value, perm=perm)

    def last_audit() -> AuditEntry:
        return AuditEntry(**store.audit[-1])

    if body.button_id in ("approve", "see_details"):
        if not body.context.get("site_id") or not body.context.get("date"):
            raise ApiError(422, "wa_bad_context", need="site_id and date")
        site = get_site(body.context["site_id"], store)
        day = date.fromisoformat(body.context["date"])
        if body.button_id == "see_details":
            link = f"/v1/sites/{site.id}/plans/{day}"
            return WhatsAppReply(status="link", link=link, reply_text=t("wa_details", lang, link=link))
        need("plan.approve")
        st = store.plans.get((site.id, day))
        strategy = st.strategy if st else Strategy.balanced
        plan = do_approve(store, engine, site, day, strategy, False, c, now, lang, channel=channel)
        return WhatsAppReply(status="approved", audit=last_audit(),
                             reply_text=t("wa_approved", lang, name=c.actor, time=hm, strategy=t(f"st_{plan.strategy.value}", lang),
                                          margin=fmt(plan.summary.energy_margin)))
    if not body.context.get("alert_id"):
        raise ApiError(422, "wa_bad_context", need="alert_id")
    need("alert.act")
    a = find(store, body.context["alert_id"])
    site_name = store.sites[a["site_id"]].name if a["site_id"] in store.sites else ""
    if body.button_id == "hand_off":
        to = "u-mauricio" if uid != "u-mauricio" else "u-admin"
        do_escalate(store, a, to, None, c, now, channel=channel)
        return WhatsAppReply(status="escalated", audit=last_audit(), reply_text=t("wa_handed", lang, to=store.users[to].name, name=c.actor, time=hm))
    do_resolve(store, a, body.button_id, None, c, now, channel=channel)
    key = "wa_held" if body.button_id == "hold_battery" else "wa_kept"
    return WhatsAppReply(status="resolved", audit=last_audit(), reply_text=t(key, lang, site=site_name, name=c.actor, time=hm))
