"""Offer files and settlements for QEnergy (José Antonio), the Market Participant that submits our plants' offers to CENACE.

Flow: the Pantheon engine POSTs each day's hourly forecast → QEnergy downloads the sales offer ("Oferta No Despachable",
one day) and the purchase offer ("Oferta de Compra de Energía", up to 7 days) in QEnergy's own templates → after the day,
cleared MW, metered MWh and prices are posted → the settlement report shows day-ahead revenue and real-time deviations.
Pantheon never submits to CENACE itself.
"""
from __future__ import annotations

import csv
import io
import os
from datetime import date, datetime, timedelta
from functools import lru_cache
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from .. import anchor as btc
from ..auth import Caller, need
from ..errors import ApiError
from ..qenergy_store import SITES, QStore

router = APIRouter(prefix="/v1/qenergy", tags=["QEnergy offers and settlements"])
TEMPLATES = os.path.join(os.path.dirname(__file__), "..", "templates", "qenergy")
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@lru_cache
def get_qstore() -> QStore:
    return QStore()


# ---------- schemas ----------
class Segment(BaseModel):
    mw: float = Field(ge=0)
    price: float = Field(description="MXN/MWh")


class ForecastHour(BaseModel):
    hour: int = Field(ge=1, le=25, description="CENACE hour 1–24 (25 only on the day clocks go back)")
    sell_mw: float = Field(ge=0, description="Energy offered for sale, MW (non-dispatchable offer)")
    sell_price: float = Field(0, description="MXN/MWh. 0 = price-taker, as in QEnergy's samples")
    buy_fixed_mw: float = Field(0, ge=0, description="Fixed purchase demand at the load centre, MW")
    buy_segments: list[Segment] = Field(default_factory=list, max_length=3, description="Up to 3 price-sensitive purchase blocks")


class ForecastIn(BaseModel):
    hours: list[ForecastHour] = Field(min_length=24, max_length=25)
    model_version: str = Field("unknown", max_length=80)

    @field_validator("hours")
    @classmethod
    def one_per_hour(cls, v: list[ForecastHour]) -> list[ForecastHour]:
        hs = [h.hour for h in v]
        if sorted(hs) != list(range(1, len(v) + 1)):
            raise ValueError("hours must be 1..24 (or 1..25), each once")
        return sorted(v, key=lambda h: h.hour)


class ForecastReceipt(BaseModel):
    site: str
    day: date
    version: int
    sha256: str
    received_at: str
    model_version: str
    sample: bool = False
    anchor: Optional[str] = Field(None, description="Bitcoin timestamp: 'queued' when sent to OpenTimestamps, 'off' if disabled")


class Anchor(BaseModel):
    status: Literal["queued", "pending", "bitcoin", "failed", "off"] = Field(
        description="queued = being sent; pending = calendars hold it, Bitcoin block not yet confirmed; bitcoin = anchored in a block")
    block_height: Optional[int] = Field(None, description="Bitcoin block that proves the forecast existed by then")
    stamped_at: Optional[str] = None
    checked_at: Optional[str] = None
    proof_url: Optional[str] = None
    error: Optional[str] = None


class ForecastOut(ForecastReceipt):
    posted_by: str
    hours: list[ForecastHour]
    anchor: Optional[Anchor] = None


class DayListing(BaseModel):
    day: date
    versions: int
    last_received_at: str
    sample: bool


class ResultHour(BaseModel):
    hour: int = Field(ge=1, le=25)
    cleared_mw: float = Field(description="Assigned by CENACE in the day-ahead market")
    measured_mwh: float = Field(description="From the certified meter")
    pml_mda: float = Field(description="Day-ahead nodal price, MXN/MWh")
    pml_mtr: float = Field(description="Real-time nodal price, MXN/MWh")


class ResultsIn(BaseModel):
    hours: list[ResultHour] = Field(min_length=24, max_length=25)


class Site(BaseModel):
    id: str
    name: str
    central: str
    unidad: str
    centro_carga: str
    market_participant: str


def site_or_404(site_id: str) -> dict:
    s = SITES.get(site_id)
    if not s:
        raise ApiError(404, "not_found", what=site_id)
    return s


def forecast_or_404(store: QStore, site_id: str, day: date, version: Optional[int] = None) -> dict:
    f = store.forecast(site_id, day, version)
    if not f:
        raise ApiError(404, "not_found", what=f"forecast {site_id} {day}")
    return f


# ---------- endpoints ----------
@router.get("/sites", response_model=list[Site], summary="Plants QEnergy represents")
def sites(_: Caller = Depends(need("qenergy.read"))) -> list[Site]:
    return [Site(**s) for s in SITES.values()]


@router.post("/sites/{site_id}/forecasts/{day}", response_model=ForecastReceipt, status_code=201,
             summary="Pantheon engine posts a day's hourly forecast (new version each time)")
def post_forecast(site_id: str, day: date, body: ForecastIn, tasks: BackgroundTasks, c: Caller = Depends(need("forecast.write")),
                  store: QStore = Depends(get_qstore)) -> ForecastReceipt:
    site_or_404(site_id)
    payload = {"hours": [h.model_dump() for h in body.hours]}
    rec = store.put_forecast(site_id, day, payload, posted_by=c.actor, model_version=body.model_version)
    if btc.enabled():
        tasks.add_task(stamp_forecast, store, rec["id"], rec["sha256"])  # after the reply, so posting is never slowed
    return ForecastReceipt(**rec, anchor="queued" if btc.enabled() else "off")


def stamp_forecast(store: QStore, forecast_id: int, sha256: str) -> None:
    try:
        p = btc.stamp(sha256)
        store.set_anchor(forecast_id, sha256, p.ots, p.status, p.block_height, stamped=True)
    except Exception as e:
        store.set_anchor(forecast_id, sha256, None, "failed", error=str(e)[:300])


def _anchor_out(site_id: str, day: date, f: dict) -> Optional[Anchor]:
    a = f.get("anchor")
    if not a:
        return None if f["sample"] else Anchor(status="queued" if btc.enabled() else "off")
    url = f"/v1/qenergy/sites/{site_id}/forecasts/{day}/proof.ots?version={f['version']}" if a["ots"] else None
    return Anchor(status=a["status"], block_height=a["block_height"], stamped_at=a["stamped_at"], checked_at=a["checked_at"],
                  proof_url=url, error=a["error"])


@router.get("/sites/{site_id}/forecasts", response_model=list[DayListing], summary="Days with a forecast, newest first")
def list_forecasts(site_id: str, _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> list[DayListing]:
    site_or_404(site_id)
    return [DayListing(**d) for d in store.forecast_days(site_id)]


@router.get("/sites/{site_id}/forecasts/{day}", response_model=ForecastOut, summary="Latest forecast for a day, with its fingerprint")
def get_forecast(site_id: str, day: date, _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> ForecastOut:
    site_or_404(site_id)
    f = forecast_or_404(store, site_id, day)
    return ForecastOut(site=site_id, day=day, version=f["version"], sha256=f["sha256"], received_at=f["received_at"],
                       model_version=f["model_version"], sample=f["sample"], posted_by=f["posted_by"], hours=f["payload"]["hours"],
                       anchor=_anchor_out(site_id, day, f))


@router.get("/sites/{site_id}/forecasts/{day}/canonical", summary="The exact bytes that were fingerprinted, to re-check the SHA-256 independently")
def forecast_canonical(site_id: str, day: date, version: Optional[int] = Query(None, ge=1, description="Default: latest"),
                       _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> Response:
    site_or_404(site_id)
    f = forecast_or_404(store, site_id, day, version)
    return Response(f["canonical"], media_type="application/json", headers={"X-Forecast-SHA256": f["sha256"]})


@router.get("/sites/{site_id}/forecasts/{day}/history", summary="Every version posted for a day (time and SHA-256)")
def forecast_history(site_id: str, day: date, _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> list[dict]:
    site_or_404(site_id)
    return store.history(site_id, day)


@router.get("/sites/{site_id}/forecasts/{day}/proof.ots",
            summary="Bitcoin timestamp proof (OpenTimestamps .ots) for a forecast version; verify it against /canonical")
def forecast_proof(site_id: str, day: date, version: Optional[int] = Query(None, ge=1, description="Default: latest"),
                   _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> Response:
    site_or_404(site_id)
    f = forecast_or_404(store, site_id, day, version)
    a = f["anchor"]
    if not a or not a["ots"]:
        raise ApiError(404, "not_found", what=f"Bitcoin proof for {site_id} {day} v{f['version']} (not stamped yet)")
    ots = a["ots"]
    if a["status"] == "pending" and btc.enabled():  # try to complete it now; harmless if Bitcoin hasn't confirmed yet
        p = btc.upgrade(ots)
        store.set_anchor(f["id"], f["sha256"], p.ots, p.status, p.block_height)
        ots = p.ots
    name = f"{site_id}-{day}-v{f['version']}.json.ots"
    return Response(ots, media_type="application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{name}"'})


def refresh_loop(every_s: int = 1800) -> None:
    """Background thread: every 30 minutes, stamp anything missed and complete pending Bitcoin proofs."""
    import threading
    import time

    def run():
        while True:
            time.sleep(every_s)
            try:
                _refresh(get_qstore())
            except Exception:
                pass
    threading.Thread(target=run, daemon=True, name="btc-anchor-refresh").start()


class AnchorRow(BaseModel):
    day: date
    version: int
    sha256: str
    received_at: str
    on_time: bool = Field(description="Received before 10:00 Mexico City time the day before (the day-ahead offer deadline)")
    model_version: str
    posted_by: str
    sample: bool
    status: Literal["sample", "queued", "pending", "bitcoin", "failed", "off"]
    block_height: Optional[int] = None
    stamped_at: Optional[str] = None
    checked_at: Optional[str] = None
    error: Optional[str] = None
    proof_url: Optional[str] = None
    canonical_url: str


class AnchorBoard(BaseModel):
    site: str
    enabled: bool
    calendars: list[str]
    counts: dict[str, int]
    versions: list[AnchorRow]


def _deadline_utc(day: date) -> str:
    # 10:00 the day before in Mexico City (UTC−6 all year since 2022) = 16:00 UTC the day before
    return (day - timedelta(days=1)).isoformat() + "T16:00:00+00:00"


@router.get("/sites/{site_id}/anchors", response_model=AnchorBoard, summary="Bitcoin timestamp progress for every forecast version")
def anchor_board(site_id: str, _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> AnchorBoard:
    site_or_404(site_id)
    on = btc.enabled()
    out, counts = [], {k: 0 for k in ("bitcoin", "pending", "queued", "failed", "sample", "off")}
    for r in store.versions(site_id):
        d = date.fromisoformat(r["day"])
        st = "sample" if r["sample"] else (r["status"] or ("queued" if on else "off"))
        counts[st] += 1
        base = f"/v1/qenergy/sites/{site_id}/forecasts/{d}"
        out.append(AnchorRow(day=d, version=r["version"], sha256=r["sha256"], received_at=r["received_at"],
                             on_time=r["received_at"] < _deadline_utc(d), model_version=r["model_version"], posted_by=r["posted_by"],
                             sample=bool(r["sample"]), status=st, block_height=r["block_height"], stamped_at=r["stamped_at"],
                             checked_at=r["checked_at"], error=r["error"],
                             proof_url=f"{base}/proof.ots?version={r['version']}" if r["has_proof"] else None,
                             canonical_url=f"{base}/canonical?version={r['version']}"))
    return AnchorBoard(site=site_id, enabled=on, calendars=btc.CALENDARS, counts=counts, versions=out)


@router.post("/anchors/refresh", summary="Stamp any forecast not yet sent and complete pending Bitcoin proofs (run hourly)")
def refresh_anchors(_: Caller = Depends(need("forecast.write")), store: QStore = Depends(get_qstore)) -> dict:
    return _refresh(store)


def _refresh(store: QStore) -> dict:
    if not btc.enabled():
        return {"enabled": False}
    out = {"enabled": True, "stamped": 0, "anchored": 0, "still_pending": 0, "failed": 0}
    for r in store.unfinished_anchors():
        if not r["ots"]:  # never sent, or the calendars were down last time
            stamp_forecast(store, r["id"], r["sha256"])
            out["failed" if store.anchor(r["id"])["status"] == "failed" else "stamped"] += 1
            continue
        p = btc.upgrade(r["ots"])
        store.set_anchor(r["id"], r["sha256"], p.ots, p.status, p.block_height)
        out["anchored" if p.status == "bitcoin" else "still_pending"] += 1
    return out


def _xlsx(wb) -> bytes:
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _load(name: str):
    try:
        import openpyxl
    except ImportError:  # pragma: no cover
        raise ApiError(501, "xlsx_unavailable")
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return openpyxl.load_workbook(os.path.join(TEMPLATES, name))


@router.get("/sites/{site_id}/offers/{day}/venta.xlsx", summary="Sales offer (Oferta No Despachable) for one day, in QEnergy's template")
def offer_venta(site_id: str, day: date, _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)) -> Response:
    s = site_or_404(site_id)
    f = forecast_or_404(store, site_id, day)
    wb = _load("oferta_venta.xlsx")
    ws = wb.active
    when = datetime(day.year, day.month, day.day)
    ws["D4"], ws["H4"], ws["L4"], ws["P4"] = when, when, s["central"], s["unidad"]
    by_hour = {h["hour"]: h for h in f["payload"]["hours"]}
    for hour in range(1, 26):
        r = 13 + hour
        h = by_hour.get(hour)
        ws[f"D{r}"] = round(h["sell_mw"], 6) if h else (None if hour == 25 else 0)
        ws[f"F{r}"] = h["sell_price"] if h else (None if hour == 25 else 0)
    name = f"{s['central']}_OfertaVenta_{day.isoformat()}.xlsx"
    return Response(_xlsx(wb), media_type=XLSX, headers={"Content-Disposition": f'attachment; filename="{name}"', "X-Forecast-SHA256": f["sha256"]})


@router.get("/sites/{site_id}/offers/{day}/compra.xlsx", summary="Purchase offer (Oferta de Compra) from a day, same hourly profile for 1–7 days")
def offer_compra(site_id: str, day: date, days: int = Query(7, ge=1, le=7), _: Caller = Depends(need("qenergy.read")),
                 store: QStore = Depends(get_qstore)) -> Response:
    s = site_or_404(site_id)
    f = forecast_or_404(store, site_id, day)
    wb = _load("oferta_compra.xlsx")
    ws = wb.active
    ws["D3"] = datetime(day.year, day.month, day.day)
    ws["H3"] = "=D3+6" if days == 7 else datetime(day.year, day.month, day.day) + timedelta(days=days - 1)
    ws["M3"] = s["centro_carga"]
    by_hour = {h["hour"]: h for h in f["payload"]["hours"]}
    cols = [("F", "H"), ("J", "L"), ("N", "P")]
    for hour in range(1, 26):
        r = 13 + hour
        h = by_hour.get(hour)
        if not h and hour == 25:
            for c in ["D"] + [x for p in cols for x in p]:
                ws[f"{c}{r}"] = None
            continue
        ws[f"D{r}"] = round(h["buy_fixed_mw"], 6) if h else 0
        segs = (h["buy_segments"] if h else []) + [{"mw": 0, "price": 0}] * 3
        for (mw_c, pr_c), seg in zip(cols, segs[:3]):
            ws[f"{mw_c}{r}"] = round(seg["mw"], 6)
            ws[f"{pr_c}{r}"] = seg["price"]
    name = f"{s['centro_carga']}_OfertaCompra_{day.isoformat()}_{days}d.xlsx"
    return Response(_xlsx(wb), media_type=XLSX, headers={"Content-Disposition": f'attachment; filename="{name}"', "X-Forecast-SHA256": f["sha256"]})


@router.post("/sites/{site_id}/results/{day}", status_code=201, summary="Post a day's cleared MW, metered MWh and nodal prices")
def post_results(site_id: str, day: date, body: ResultsIn, c: Caller = Depends(need("qenergy.write")),
                 store: QStore = Depends(get_qstore)) -> dict:
    site_or_404(site_id)
    store.put_results(site_id, day, {"hours": [h.model_dump() for h in body.hours]}, posted_by=c.actor)
    return {"site": site_id, "day": day.isoformat(), "status": "stored"}


def _settlement_rows(store: QStore, site_id: str, month: str) -> tuple[list[dict], list[dict], bool]:
    res = store.results_month(site_id, month)
    hours, days, sample = [], [], False
    for d, payload in res.items():
        f = store.forecast(site_id, date.fromisoformat(d))
        sample = sample or (f is not None and f["sample"])
        offered = {h["hour"]: h["sell_mw"] for h in (f["payload"]["hours"] if f else [])}
        tot = {"day": d, "offered_mwh": 0.0, "cleared_mwh": 0.0, "measured_mwh": 0.0, "mda_mxn": 0.0, "mtr_mxn": 0.0}
        for h in payload["hours"]:
            mda = h["cleared_mw"] * h["pml_mda"]
            mtr = (h["measured_mwh"] - h["cleared_mw"]) * h["pml_mtr"]
            row = {"day": d, "hour": h["hour"], "offered_mw": offered.get(h["hour"], 0.0), "cleared_mw": h["cleared_mw"],
                   "measured_mwh": h["measured_mwh"], "pml_mda": h["pml_mda"], "pml_mtr": h["pml_mtr"],
                   "mda_mxn": round(mda, 2), "mtr_mxn": round(mtr, 2), "total_mxn": round(mda + mtr, 2)}
            hours.append(row)
            tot["offered_mwh"] += row["offered_mw"]; tot["cleared_mwh"] += h["cleared_mw"]; tot["measured_mwh"] += h["measured_mwh"]
            tot["mda_mxn"] += mda; tot["mtr_mxn"] += mtr
        tot["total_mxn"] = tot["mda_mxn"] + tot["mtr_mxn"]
        days.append({k: (round(v, 4) if isinstance(v, float) else v) for k, v in tot.items()})
    return hours, days, sample


@router.get("/sites/{site_id}/settlements", summary="Settlement for a month: day-ahead revenue + real-time deviations, by day and hour")
def settlements(site_id: str, month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), format: Literal["json", "csv", "xlsx"] = "json",
                _: Caller = Depends(need("qenergy.read")), store: QStore = Depends(get_qstore)):
    s = site_or_404(site_id)
    hours, days, sample = _settlement_rows(store, site_id, month)
    if format == "json":
        return {"site": site_id, "month": month, "sample_data": sample, "days": days, "hours": hours,
                "method": "MDA = cleared MW × PML MDA; MTR = (metered MWh − cleared MW) × PML MTR; total = MDA + MTR. MXN."}
    cols = ["day", "hour", "offered_mw", "cleared_mw", "measured_mwh", "pml_mda", "pml_mtr", "mda_mxn", "mtr_mxn", "total_mxn"]
    if format == "csv":
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=cols)
        w.writeheader()
        w.writerows(hours)
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{s["central"]}_Liquidacion_{month}.csv"'})
    import openpyxl
    from openpyxl.styles import Font
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Resumen"
    ws.append([f"Liquidación {s['name']} ({s['central']}) — {month}" + (" — DATOS DE EJEMPLO" if sample else "")])
    ws.append(["MDA = MW asignados × PML MDA; MTR = (MWh medidos − MW asignados) × PML MTR. MXN."])
    head = ["Día", "Ofertado MWh", "Asignado MWh", "Medido MWh", "Ingreso MDA", "Desviación MTR", "Total"]
    ws.append(head)
    for d in days:
        ws.append([d["day"], d["offered_mwh"], d["cleared_mwh"], d["measured_mwh"], round(d["mda_mxn"], 2), round(d["mtr_mxn"], 2), round(d["total_mxn"], 2)])
    if days:
        n = len(days)
        ws.append(["Total"] + [f"=SUM({c}4:{c}{3 + n})" for c in "BCDEFG"])
    for c in ws[1] + ws[3]:
        c.font = Font(bold=True)
    hs = wb.create_sheet("Horas")
    hs.append(["Día", "Hora", "Ofertado MW", "Asignado MW", "Medido MWh", "PML MDA", "PML MTR", "Ingreso MDA", "Desviación MTR", "Total"])
    for c in hs[1]:
        c.font = Font(bold=True)
    for h in hours:
        hs.append([h[k] for k in cols])
    return Response(_xlsx(wb), media_type=XLSX,
                    headers={"Content-Disposition": f'attachment; filename="{s["central"]}_Liquidacion_{month}.xlsx"'})
