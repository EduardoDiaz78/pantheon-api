"""Track record, settlement, disputes and the monthly report. Sample data only."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse

from ..auth import Caller, current, get_now, get_site, get_store, need
from ..errors import ApiError
from ..i18n import get_lang, t
from ..models import (
    AccuracyDay, AccuracyReport, Capacity, Dispute, DisputeIn, MonthlyReport, SettlementDay, SettlementReport,
    Site, WaterfallStep,
)
from ..store import Store

router = APIRouter(prefix="/v1/sites/{site_id}", tags=["Track record and settlement"])

_ERR = [10.2, 9.4, 11.8, 12.6, 8.9, 10.1, 13.4, 16.2, 11.0, 9.7, 10.8, 12.2, 9.9, 8.6, 11.5,
        10.4, 14.1, 12.8, 9.3, 10.0, 17.1, 11.6, 10.9, 9.5, 12.0, 11.3, 10.6, 9.8, 11.9, 10.7]
_FCST = [920, 860, 810, 790, 800, 850, 980, 1150, 1080, 900, 720, 610, 560, 540, 580, 690, 940, 1480, 2350, 3120, 3380, 2760, 1650, 1180]
_ACT = [960, 880, 790, 770, 830, 900, 1050, 1210, 1020, 860, 690, 640, 600, 520, 610, 760, 1010, 1620, 2580, 3290, 3150, 2490, 1720, 1240]
_EXPECTED = [78400, 81200, 69800, 92300, 88100, 74500, 80900, 85600, 90200, 83300]
_SETTLED = [77950, 80400, 70100, 86900, 87600, 74100, 81300, None, None, None]
TARGET_ERROR_PCT = 15.0


def accuracy_report(site: Site, now: datetime, days: int = 30) -> AccuracyReport:
    errs = _ERR[-days:]
    end = now.date() - timedelta(days=1)
    return AccuracyReport(
        site_id=site.id, days=days, avg_error_pct=round(sum(errs) / len(errs), 2), target_error_pct=TARGET_ERROR_PCT,
        days_within_target=sum(1 for e in errs if e <= TARGET_ERROR_PCT), peak_hour_hits=round(27 * days / 30),
        critical_hours_caught=None, critical_hours_total=None, verification_status="in_progress",
        scoring_note="Each forecast is frozen before the offer deadline and scored against CENACE's published prices. Download the hourly comparison to check every number.",
        daily=[AccuracyDay(date=end - timedelta(days=len(errs) - 1 - i), error_pct=e) for i, e in enumerate(errs)],
    )


def settlement_report(store: Store, site: Site, month: str) -> SettlementReport:
    if month != "2026-10":
        raise ApiError(404, "no_sample_month")
    thr = store.limits[site.id].settlement_review_threshold_pct
    days, s_tot, e_tot, review = [], 0.0, 0.0, 0
    for i, (e, s) in enumerate(zip(_EXPECTED, _SETTLED)):
        d = date(2026, 10, i + 1)
        if s is None:
            days.append(SettlementDay(date=d, expected=e, settled=None, difference_pct=None, status="awaiting_statement"))
            continue
        diff = (s - e) / e * 100
        flag = abs(diff) > thr
        review += flag
        s_tot += s
        e_tot += e
        status = "disputed" if (site.id, d) in store.disputed_days else ("review" if flag else "matched")
        days.append(SettlementDay(date=d, expected=e, settled=s, difference_pct=round(diff, 2), status=status))
    waterfall = [
        WaterfallStep(label="Discharge revenue", amount=760350, kind="add"),
        WaterfallStep(label="Charging cost", amount=-186900, kind="cost"),
        WaterfallStep(label="Market & CENACE fees", amount=-15100, kind="cost"),
        WaterfallStep(label="Settled", amount=s_tot, kind="total"),
        WaterfallStep(label="Battery wear", amount=-41200, kind="cost"),
        WaterfallStep(label="Net after wear", amount=s_tot - 41200, kind="total"),
        WaterfallStep(label="Capacity payments", amount=None, kind="pending"),
    ]
    return SettlementReport(site_id=site.id, month=month, review_threshold_pct=thr, settled_total=s_tot,
                            expected_on_settled_days=e_tot, difference_pct=round((s_tot - e_tot) / e_tot * 100, 2),
                            review_count=review, days=days, waterfall=waterfall)


@router.get("/forecast-accuracy", response_model=AccuracyReport, summary="Forecast track record")
def accuracy(days: int = Query(30, ge=1, le=30), site: Site = Depends(get_site), _: Caller = Depends(current),
             now: datetime = Depends(get_now)) -> AccuracyReport:
    return accuracy_report(site, now, days)


@router.get("/forecast-accuracy/hourly.csv", response_class=PlainTextResponse, summary="Hourly forecast vs. actual (CSV)")
def accuracy_csv(site: Site = Depends(get_site), _: Caller = Depends(need("track.export")), now: datetime = Depends(get_now)) -> PlainTextResponse:
    d = now.date() - timedelta(days=1)
    rows = ["site_id,date,hour,forecast_frozen_at,forecast_mxn_mwh,actual_mxn_mwh,abs_error_pct"]
    frozen = f"{d - timedelta(days=1)}T10:00:00-06:00"
    for h, (f, a) in enumerate(zip(_FCST, _ACT)):
        rows.append(f"{site.id},{d},{h},{frozen},{f},{a},{abs(f - a) / a * 100:.2f}")
    return PlainTextResponse("\n".join(rows) + "\n", media_type="text/csv")


@router.get("/settlements", response_model=SettlementReport, summary="Settlement against plan for a month")
def settlements(month: str = Query(..., pattern=r"^\d{4}-\d{2}$", examples=["2026-10"]), site: Site = Depends(get_site),
                _: Caller = Depends(current), store: Store = Depends(get_store)) -> SettlementReport:
    return settlement_report(store, site, month)


@router.post("/disputes", response_model=Dispute, status_code=201, summary="Open a dispute for a settled day")
def open_dispute(body: DisputeIn, site: Site = Depends(get_site), c: Caller = Depends(need("dispute.create")),
                 store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> Dispute:
    idx = (body.date - date(2026, 10, 1)).days
    if not (0 <= idx < len(_SETTLED)) or _SETTLED[idx] is None:
        raise ApiError(409, "day_not_settled", date=str(body.date))
    e, s = _EXPECTED[idx], _SETTLED[idx]
    d = Dispute(id=store.new_id("dp"), site_id=site.id, date=body.date, reason=body.reason, status="open", expected=e, settled=s,
                difference_pct=round((s - e) / e * 100, 2),
                evidence=[f"Approved plan for {body.date}", f"CENACE statement for {body.date}", "Hourly dispatch against meter readings"],
                opened_by=c.actor, opened_at=now)
    store.disputes[d.id] = d.model_dump()
    store.disputed_days.add((site.id, body.date))
    store.log(now, c.actor, "dispute.open", f"{body.date}: {d.difference_pct}% off plan. {body.reason}", site.id)
    store.emit(now, "dispute.opened", {"dispute_id": d.id, "site_id": site.id, "date": str(body.date), "difference_pct": d.difference_pct})
    return d


@router.get("/disputes", response_model=list[Dispute], summary="Disputes")
def disputes(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store)) -> list[Dispute]:
    return [Dispute(**d) for d in store.disputes.values() if d["site_id"] == site.id]


@router.get("/reports/monthly", response_model=MonthlyReport, summary="Monthly report data (the PDF's content)")
def monthly(month: str = Query(..., pattern=r"^\d{4}-\d{2}$", examples=["2026-10"]), site: Site = Depends(get_site),
            _: Caller = Depends(current), store: Store = Depends(get_store), now: datetime = Depends(get_now),
            lang: str = Depends(get_lang)) -> MonthlyReport:
    s = settlement_report(store, site, month)
    net = next(w.amount for w in s.waterfall if w.label == "Net after wear")
    actions = [e for e in store.audit if e["site_id"] == site.id]
    return MonthlyReport(
        site_id=site.id, site_name=site.name, month=month, prepared_at=now,
        headline=f"{len([d for d in s.days if d.settled is not None])} days settled, net after wear {net:,.0f} MXN, {s.difference_pct:+.1f}% against plan.",
        settlement=s, track_record=accuracy_report(site, now), critical_hours_covered="[X] / [Y]",
        capacity=Capacity(battery_available_mw_in_flagged_hours=site.power_mw, note=t("capacity_note", lang)),
        cycles_used=store.health[site.id].cycles_ytd, approvals=sum(1 for e in actions if e["action"] == "plan.approve"),
        overrides=sum(1 for e in actions if e["action"] == "plan.override"),
    )
