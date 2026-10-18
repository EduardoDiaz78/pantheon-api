"""Turns engine output into a plan and checks it against the client's limits.

The guardrails live here, outside the engine, on purpose: whatever the
engine proposes, a plan that breaks a hard limit can never be approved.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .engine import Engine
from .i18n import t
from .models import (
    Capacity, DataFeed, HourPlan, LimitCheck, OperatingLimits, Plan, PlanStatus, PlanSummary,
    ScheduleBlock, Site, Strategy, Violation,
)

MX_TZ = ZoneInfo("America/Mexico_City")
# PLACEHOLDER: confirm the current CENACE day-ahead (MDA) offer deadline before go-live.
OFFER_DEADLINE_LOCAL = time(10, 0)
EPS = 1e-6


def offer_deadline(delivery_date: date) -> datetime:
    return datetime.combine(delivery_date - timedelta(days=1), OFFER_DEADLINE_LOCAL, tzinfo=MX_TZ)


def hh(h: int) -> str:
    return f"{h % 24:02d}:00"


def soc_path(start: float, mw: list[float]) -> list[float]:
    out, soc = [], start
    for v in mw:
        soc -= v
        out.append(round(soc, 4))
    return out


def flagged(likelihood: dict[int, float], limits: OperatingLimits) -> set[int]:
    return {h for h, p in likelihood.items() if p >= limits.critical_flag_threshold}


def check_limits(site: Site, mw: list[float], socs: list[float], critical: set[int],
                 limits: OperatingLimits, lang: str) -> LimitCheck:
    v: list[Violation] = []
    max_dis = limits.max_discharge_mw or site.power_mw
    max_chg = limits.max_charge_mw or site.power_mw
    lo = site.energy_mwh * limits.min_soc_pct / 100
    hi = site.energy_mwh * limits.max_soc_pct / 100
    for h, x in enumerate(mw):
        if x > max_dis + EPS:
            v.append(Violation(code="discharge_power", severity="hard", hour=h, message=t("v_discharge_power", lang, mw=f"{x:g}", limit=f"{max_dis:g}")))
        if -x > max_chg + EPS:
            v.append(Violation(code="charge_power", severity="hard", hour=h, message=t("v_charge_power", lang, mw=f"{-x:g}", limit=f"{max_chg:g}")))
    for h, s in enumerate(socs):
        if s < lo - EPS:
            v.append(Violation(code="soc_below_min", severity="hard", hour=h, message=t("v_soc_below_min", lang, pct=round(s / site.energy_mwh * 100), limit=f"{limits.min_soc_pct:g}")))
        if s > hi + EPS:
            v.append(Violation(code="soc_above_max", severity="hard", hour=h, message=t("v_soc_above_max", lang, pct=round(s / site.energy_mwh * 100), limit=f"{limits.max_soc_pct:g}")))
    cycles = sum(x for x in mw if x > 0) / site.energy_mwh
    if cycles > limits.max_cycles_per_day + EPS:
        v.append(Violation(code="cycles_per_day", severity="soft", message=t("v_cycles_per_day", lang, cycles=f"{cycles:.2f}", limit=f"{limits.max_cycles_per_day:g}")))
    if limits.reserve_for_critical_hours:
        for h in sorted(critical):
            if mw[h] <= EPS:
                v.append(Violation(code="critical_hour_uncovered", severity="soft", hour=h, message=t("v_critical_hour_uncovered", lang, hour=f"{h:02d}")))
    return LimitCheck(ok=not v, violations=v)


def schedule_blocks(mw: list[float], solar: list[float], lang: str) -> list[ScheduleBlock]:
    blocks: list[dict] = []
    for h, x in enumerate(mw):
        sg = 1 if x > EPS else (-1 if x < -EPS else 0)
        if sg == 0:
            continue
        if blocks and blocks[-1]["sg"] == sg and blocks[-1]["end"] == h:
            blocks[-1]["end"] = h + 1
            blocks[-1]["max"] = max(blocks[-1]["max"], abs(x))
        else:
            blocks.append({"sg": sg, "start": h, "end": h + 1, "max": abs(x)})
    out = []
    for b in blocks:
        if b["sg"] < 0:
            from_solar = all(solar[h] + EPS >= -mw[h] for h in range(b["start"], b["end"]))
            source = t("block_solar", lang) if from_solar else (t("block_grid_night", lang) if b["start"] < 7 else t("block_grid", lang))
        else:
            source = t("block_morning", lang) if b["start"] < 11 else t("block_peak", lang)
        out.append(ScheduleBlock(start=hh(b["start"]), end=hh(b["end"]), action="discharge" if b["sg"] > 0 else "charge",
                                 max_mw=round(b["max"], 3), source=source))
    return out


def summarize(prices: list[float], mw: list[float], solar: list[float], critical: set[int],
              limits: OperatingLimits, site: Site) -> PlanSummary:
    rev = sum(x * p for x, p in zip(mw, prices) if x > 0)
    cost = sum(-x * p for x, p in zip(mw, prices) if x < 0)
    dis = sum(x for x in mw if x > 0)
    chg = sum(-x for x in mw if x < 0)
    to_batt = sum(min(-x, s) for x, s in zip(mw, solar) if x < 0)
    solar_total = sum(solar)
    wear = dis * limits.wear_cost_per_mwh
    spread = (rev / dis - cost / chg) if dis > EPS and chg > EPS else None
    return PlanSummary(
        discharge_revenue=round(rev, 2), charging_cost=round(cost, 2), wear_cost=round(wear, 2),
        energy_margin=round(rev - cost - wear, 2), spread_captured=round(spread, 2) if spread is not None else None,
        cycles=round(dis / site.energy_mwh, 3), solar_total_mwh=round(solar_total, 3),
        solar_to_battery_mwh=round(to_batt, 3), solar_to_grid_mwh=round(solar_total - to_batt, 3),
        likely_critical_hours=len(critical), likely_critical_hours_covered=sum(1 for h in critical if mw[h] > EPS),
    )


def build_plan(engine: Engine, site: Site, day: date, strategy: Strategy, limits: OperatingLimits,
               overrides: dict[int, float], now: datetime, feeds: list[DataFeed], lang: str = "en",
               approved: bool = False, approved_by: str | None = None, approved_at: datetime | None = None,
               export_cap_mw: float | None = None) -> Plan:
    prices = engine.price_forecast(site, day)
    solar = engine.solar_forecast(site, day)
    likelihood = engine.critical_likelihood(site, day)
    d = engine.dispatch(site, day, prices, solar, likelihood, limits, strategy)
    if len(prices) != 24 or len(solar) != 24 or len(d.mw) != 24:
        raise ValueError("Engine must return 24 hourly values")
    critical = flagged(likelihood, limits)
    mw = list(d.mw)
    for h, v in overrides.items():
        mw[h] = v
    if export_cap_mw is not None:
        # The interconnection contract caps net export (solar + battery). Clip the discharge so the offer is feasible;
        # solar above the cap is curtailed by the plant, which the offer shows as net export at the cap.
        mw = [max(0.0, min(x, export_cap_mw - s)) if x > 0 and s + x > export_cap_mw else x for x, s in zip(mw, solar)]
    socs = soc_path(d.start_soc_mwh, mw)
    p50 = [p.p50 for p in prices]
    hours = []
    for h in range(24):
        chg = -mw[h] if mw[h] < 0 else 0.0
        from_solar = min(chg, solar[h])
        hours.append(HourPlan(
            hour=h, price_forecast=prices[h].p50, price_low=prices[h].low, price_high=prices[h].high,
            solar_mw=solar[h], dispatch_mw=mw[h], charge_from_solar_mw=round(from_solar, 4),
            charge_from_grid_mw=round(chg - from_solar, 4), soc_mwh_end=socs[h],
            soc_pct_end=round(socs[h] / site.energy_mwh * 100, 1),
            critical_likelihood=likelihood.get(h, 0.0), likely_critical=h in critical, overridden=h in overrides,
        ))
    deadline = offer_deadline(day)
    status = PlanStatus.approved if approved else (PlanStatus.missed if now > deadline else PlanStatus.draft)
    flagged_mw = [mw[h] for h in critical]
    return Plan(
        site_id=site.id, delivery_date=day, strategy=strategy, status=status, offer_deadline=deadline,
        minutes_to_deadline=max(0, int((deadline - now).total_seconds() // 60)),
        hours=hours, schedule=schedule_blocks(mw, solar, lang),
        summary=summarize(p50, mw, solar, critical, limits, site),
        capacity=Capacity(battery_available_mw_in_flagged_hours=round(min(flagged_mw), 3) if flagged_mw else 0.0,
                          note=t("capacity_note", lang)),
        limit_check=check_limits(site, mw, socs, critical, limits, lang),
        explanation=t("why_solar" if site.solar_mw > 0 else "why_grid", lang),
        data_status=feeds, approved_by=approved_by, approved_at=approved_at,
    )
