"""The CENACE side: offers, cleared schedules, imports, data sources, interconnection and battery state source.

Pantheon never controls the battery. An approved plan becomes an OFFER that the client's Market Participant
([TRADER]) submits to CENACE's day-ahead market (MDA) by 10:00 on D-1. CENACE clears it in the afternoon,
dispatches it in real time, the meter measures it and the statement settles it:
offered → cleared → dispatched → measured → settled. Sample data only.
"""
from __future__ import annotations

import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import PlainTextResponse, Response

from ..auth import Caller, current, feeds_for, get_engine, get_now, get_site, get_store, need
from ..engine import Engine
from ..errors import ApiError
from ..i18n import get_lang
from ..models import (
    BatteryState, ClearedIn, ClearedSchedule, DataSources, Deviation, Interconnection, Offer, OfferHour, OfferStatus,
    PlanStatus, Site, SourceStatus, SubmittedIn, Imported,
)
from ..planning import offer_deadline
from ..store import Store
from .plans import make

router = APIRouter(prefix="/v1/sites/{site_id}", tags=["CENACE: offers, cleared schedules, imports"])


def build_offer(store: Store, engine: Engine, site: Site, day: date, now: datetime, lang: str) -> Offer:
    plan = make(store, engine, site, day, now, lang)
    if plan.status != PlanStatus.approved:
        raise ApiError(409, "approve_first")
    ic = store.interconnection[site.id]
    sub = store.offers.get((site.id, day), {})
    cleared = store.cleared.get((site.id, day))
    status = OfferStatus.cleared if cleared else (OfferStatus.submitted if sub.get("submitted_at") else OfferStatus.offered)
    cap = ic.export_cap_mw if ic.export_cap_mw is not None else float("inf")
    hours = [OfferHour(hour=h.hour, net_export_mw=round(min(h.solar_mw + h.dispatch_mw, cap), 3), battery_mw=h.dispatch_mw, solar_mw=h.solar_mw)
             for h in plan.hours]
    return Offer(site_id=site.id, delivery_date=day, node_id=ic.node, status=status, deadline=offer_deadline(day),
                 minutes_to_deadline=max(0, int((offer_deadline(day) - now).total_seconds() // 60)),
                 submitted_at=sub.get("submitted_at"), submitted_by=sub.get("by"), confirmation=sub.get("confirmation"),
                 export_cap_mw=ic.export_cap_mw, hours=hours)


@router.get("/offer/{delivery_date}", response_model=Offer, summary="The approved plan as an offer for [TRADER] to submit")
def get_offer(delivery_date: date, site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
              engine: Engine = Depends(get_engine), now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> Offer:
    return build_offer(store, engine, site, delivery_date, now, lang)


@router.get("/offer/{delivery_date}/export", summary="Offer file in the [TRADER] portal layout (csv or xlsx)")
def export_offer(delivery_date: date, format: str = Query("csv", pattern="^(csv|xlsx)$"), site: Site = Depends(get_site),
                 c: Caller = Depends(need("plan.export")), store: Store = Depends(get_store), engine: Engine = Depends(get_engine),
                 now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> Response:
    offer = build_offer(store, engine, site, delivery_date, now, lang)
    header = ["HORA", "MW_NETO", "MW_BATERIA", "MW_SOLAR", "TIPO"]
    rows = [[f"{h.hour:02d}", f"{h.net_export_mw:g}", f"{h.battery_mw:g}", f"{h.solar_mw:g}", "AUTODESPACHO"] for h in offer.hours]
    store.log(now, c.actor, "offer.export", f"Offer file ({format}) for {delivery_date}", site.id)
    name = f"oferta-{site.id}-{delivery_date}"
    if format == "xlsx":
        try:
            from openpyxl import Workbook
        except ImportError:
            raise ApiError(501, "xlsx_unavailable")
        wb = Workbook(); ws = wb.active; ws.title = "Oferta MDA"
        ws.append(header)
        for r in rows:
            ws.append([int(r[0]), float(r[1]), float(r[2]), float(r[3]), r[4]])
        buf = io.BytesIO(); wb.save(buf)
        return Response(buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": f'attachment; filename="{name}.xlsx"'})
    out = io.StringIO(); w = csv.writer(out); w.writerow(header); w.writerows(rows)
    return PlainTextResponse(out.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}.csv"'})


@router.post("/offer/{delivery_date}/submitted", response_model=Offer, summary="Record that [TRADER] submitted the offer to CENACE")
def mark_submitted(delivery_date: date, body: SubmittedIn, site: Site = Depends(get_site), c: Caller = Depends(need("plan.export")),
                   store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
                   lang: str = Depends(get_lang)) -> Offer:
    build_offer(store, engine, site, delivery_date, now, lang)  # must be approved
    dl = offer_deadline(delivery_date)
    if now > dl and not body.force:
        raise ApiError(409, "deadline_passed", date=str(delivery_date), time=dl.strftime("%H:%M"))
    store.offers[(site.id, delivery_date)] = {"submitted_at": now, "by": body.by, "confirmation": body.confirmation}
    late = " (after the deadline, forced)" if now > dl else ""
    store.log(now, c.actor, "offer.submitted", f"{delivery_date} submitted by {body.by}, confirmation {body.confirmation}{late}", site.id)
    store.emit(now, "offer.submitted", {"site_id": site.id, "delivery_date": str(delivery_date), "by": body.by, "confirmation": body.confirmation})
    return build_offer(store, engine, site, delivery_date, now, lang)


def _cleared(store: Store, engine: Engine, site: Site, day: date, now: datetime, lang: str) -> ClearedSchedule:
    rec = store.cleared.get((site.id, day))
    if not rec:
        raise ApiError(404, "not_found", what=f"Cleared schedule for {day}")
    if "offered" in rec:  # a past day kept as sample data: offer and prices were frozen with it
        offered, prices = rec["offered"], rec["prices"]
    else:
        offer = build_offer(store, engine, site, day, now, lang)
        plan = make(store, engine, site, day, now, lang)
        offered, prices = [o.net_export_mw for o in offer.hours], [h.price_forecast for h in plan.hours]
    wear = store.limits[site.id].wear_cost_per_mwh
    devs, impact = [], 0.0
    for h, om in enumerate(offered):
        cm = rec["mw"][h]
        if abs(cm - om) > 1e-6:
            delta_batt = cm - om
            price = prices[h]
            amount = delta_batt * price - (wear * delta_batt if delta_batt > 0 else 0)
            impact += amount
            devs.append(Deviation(hour=h, offered_mw=om, cleared_mw=cm, reason=rec.get("reasons", {}).get(h),
                                  margin_impact=round(amount, 2)))
    return ClearedSchedule(site_id=site.id, delivery_date=day, received_at=rec["received_at"], source=rec["source"],
                           cleared_mw=rec["mw"], deviations=devs, margin_impact=round(impact, 2), status="deviations" if devs else "as_offered")


@router.post("/cleared/{delivery_date}", response_model=ClearedSchedule, status_code=201, summary="Store CENACE's cleared schedule for the day")
def post_cleared(delivery_date: date, body: ClearedIn, site: Site = Depends(get_site), c: Caller = Depends(need("plan.export")),
                 store: Store = Depends(get_store), engine: Engine = Depends(get_engine), now: datetime = Depends(get_now),
                 lang: str = Depends(get_lang)) -> ClearedSchedule:
    build_offer(store, engine, site, delivery_date, now, lang)
    store.cleared[(site.id, delivery_date)] = {"mw": body.cleared_mw, "received_at": now, "source": body.source,
                                               "reasons": {d.hour: d.reason for d in body.notes}}
    cs = _cleared(store, engine, site, delivery_date, now, lang)
    store.log(now, c.actor, "offer.cleared", f"{delivery_date}: {len(cs.deviations)} deviation(s), margin impact {cs.margin_impact:,.0f} MXN", site.id)
    if cs.deviations:
        store.emit(now, "offer.deviation", {"site_id": site.id, "delivery_date": str(delivery_date), "deviations": [d.model_dump() for d in cs.deviations]})
    return cs


@router.get("/cleared/{delivery_date}", response_model=ClearedSchedule, summary="Cleared schedule and deviations from the offer")
def get_cleared(delivery_date: date, site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
                engine: Engine = Depends(get_engine), now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> ClearedSchedule:
    return _cleared(store, engine, site, delivery_date, now, lang)


# ---------------- Imports ----------------

async def _rows(file: UploadFile, required: list[str]) -> list[dict]:
    text = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in required if c not in (reader.fieldnames or [])]
    if missing:
        raise ApiError(422, "csv_columns", details={"missing": missing, "expected": required})
    rows = list(reader)
    if not rows:
        raise ApiError(422, "csv_empty")
    return rows


@router.post("/imports/meter", response_model=Imported, status_code=201, summary="Upload certified meter intervals (CSV: hour,kwh_export,kwh_import)")
async def import_meter(file: UploadFile = File(...), day: date = Query(..., alias="date"), site: Site = Depends(get_site),
                       c: Caller = Depends(need("plan.export")), store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> Imported:
    rows = await _rows(file, ["hour", "kwh_export", "kwh_import"])
    try:
        parsed = {int(r["hour"]): (float(r["kwh_export"]), float(r["kwh_import"])) for r in rows}
    except ValueError:
        raise ApiError(422, "csv_values")
    store.meter[(site.id, day)] = {"rows": parsed, "received_at": now, "file": file.filename}
    store.log(now, c.actor, "import.meter", f"{day}: {len(parsed)} hourly meter rows from {file.filename}", site.id)
    return Imported(kind="meter", day=day, rows=len(parsed), received_at=now, file=file.filename)


@router.post("/imports/statement", response_model=Imported, status_code=201,
             summary="Upload a CENACE statement as exported by [TRADER] (CSV: date,energy_mxn,capacity_mxn,charges_mxn,kind)")
async def import_statement(file: UploadFile = File(...), site: Site = Depends(get_site), c: Caller = Depends(need("plan.export")),
                           store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> Imported:
    rows = await _rows(file, ["date", "energy_mxn", "capacity_mxn", "charges_mxn", "kind"])
    n = 0
    for r in rows:
        if r["kind"] not in ("preliminary", "final"):
            raise ApiError(422, "csv_values")
        try:
            d = date.fromisoformat(r["date"])
            store.statements[(site.id, d)] = {"energy": float(r["energy_mxn"]), "capacity": float(r["capacity_mxn"] or 0),
                                              "charges": float(r["charges_mxn"] or 0), "kind": r["kind"], "received_at": now, "file": file.filename}
        except ValueError:
            raise ApiError(422, "csv_values")
        n += 1
    store.log(now, c.actor, "import.statement", f"{n} statement day(s) from {file.filename}", site.id)
    return Imported(kind="statement", day=None, rows=n, received_at=now, file=file.filename)


@router.get("/data-sources", response_model=DataSources, summary="Where each number comes from, and what is still missing")
def data_sources(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
                 now: datetime = Depends(get_now)) -> DataSources:
    feeds = {f.name: f for f in feeds_for(store, site.id, now)}
    tele = feeds["site_telemetry"]
    meter_days = sorted(d for s, d in store.meter if s == site.id)
    stmts = [v for (s, d), v in store.statements.items() if s == site.id]
    prelim = sum(1 for v in stmts if v["kind"] == "preliminary"); final = len(stmts) - prelim
    ic = store.interconnection[site.id]
    src = [
        SourceStatus(name="ems", label="Site EMS / BMS (battery state, dispatched MW)", status="live" if tele.status == "live" else "stale",
                     detail=f"Last reading {tele.last_update:%H:%M}" + ("" if tele.status == "live" else " · running on modelled state of charge"), last=tele.last_update),
        SourceStatus(name="meter", label="Certified meter at the interconnection point", status="live" if meter_days else "pending",
                     detail=f"{len(meter_days)} day(s) imported, last {meter_days[-1]}" if meter_days else "No interval export yet. Ask [TRADER] or the plant for hourly CSV.",
                     last=store.meter[(site.id, meter_days[-1])]["received_at"] if meter_days else None),
        SourceStatus(name="cenace_prices", label="CENACE prices (PML, day-ahead and real-time)", status=feeds["cenace_prices"].status,
                     detail=f"Published {feeds['cenace_prices'].last_update:%d %b %H:%M}", last=feeds["cenace_prices"].last_update),
        SourceStatus(name="cenace_instructions", label="CENACE dispatch instructions (real time)", status="pending",
                     detail="Comes from the plant's RTU link to CENACE's regional control centre. Not connected to Pantheon yet.", last=None),
        SourceStatus(name="cleared", label="Cleared day-ahead schedules", status="live" if any(s == site.id for s, _ in store.cleared) else "pending",
                     detail=f"{sum(1 for s, _ in store.cleared if s == site.id)} day(s) received", last=None),
        SourceStatus(name="statements", label="CENACE settlement statements (via [TRADER])", status="live" if stmts else "pending",
                     detail=f"{prelim} preliminary, {final} final parsed" if stmts else "No statement uploaded yet.", last=max((v["received_at"] for v in stmts), default=None)),
        SourceStatus(name="registration", label="Storage unit registered with CENACE", status="live" if ic.storage_registered else "blocked",
                     detail="Registered" if ic.storage_registered else "Battery parameters not yet registered; offers run on the solar unit only.", last=None),
    ]
    return DataSources(site_id=site.id, as_of=now, sources=src, blocked=[s.name for s in src if s.status == "blocked"],
                       pending=[s.name for s in src if s.status == "pending"])


# ---------------- Interconnection ----------------

@router.get("/interconnection", response_model=Interconnection, summary="Interconnection terms the offer must respect")
def get_ic(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store)) -> Interconnection:
    return store.interconnection[site.id]


@router.put("/interconnection", response_model=Interconnection, summary="Replace interconnection terms")
def put_ic(body: Interconnection, site: Site = Depends(get_site), c: Caller = Depends(need("limits.edit")), store: Store = Depends(get_store),
           now: datetime = Depends(get_now)) -> Interconnection:
    old = store.interconnection[site.id].model_dump()
    changes = [f"{k} {old[k]} → {v}" for k, v in body.model_dump().items() if old[k] != v]
    store.interconnection[site.id] = body
    if changes:
        store.log(now, c.actor, "interconnection.update", "; ".join(changes), site.id)
    return body


# ---------------- Battery state ----------------

@router.get("/battery", response_model=BatteryState, summary="Battery state and where it comes from (EMS or model)")
def battery(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> BatteryState:
    src = store.battery_source(site.id, now)
    h = store.health[site.id]
    soc = site.soc_pct or 0.0
    model = {"value": soc, "band": [max(0.0, soc - 6), min(100.0, soc + 6)]} if src == "model" else None
    return BatteryState(site_id=site.id, as_of=now, state_source=src, soc_pct=soc, soc_model=model,
                        approval_needs_signoff=src == "model", state_of_health_pct=h.state_of_health_pct, avg_cell_temp_c=h.avg_cell_temp_c,
                        note=("Live from the site EMS." if src == "ems" else
                              "No EMS reading in the last 5 minutes. State of charge is modelled from the plan; approving tomorrow's offer needs an asset manager's sign-off."))
