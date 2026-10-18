from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends

from ..auth import Caller, current, feeds_for, get_engine, get_now, get_site, get_store, need
from ..engine import Engine
from ..errors import ApiError
from ..i18n import get_lang
from ..models import Health, MaintenanceWindow, MaintenanceWindowIn, OperatingLimits, PlantNow, Site, Strategy
from ..planning import build_plan
from ..store import Store

router = APIRouter(prefix="/v1/sites", tags=["Sites and battery"])


def require_data(store: Store, site: Site) -> None:
    if site.status == "onboarding":
        raise ApiError(409, "no_data_yet", site=site.name, date=str(store.first_plan_expected.get(site.id, "soon")))


@router.get("", response_model=list[Site], summary="List sites")
def list_sites(_: Caller = Depends(current), store: Store = Depends(get_store)) -> list[Site]:
    return list(store.sites.values())


@router.get("/{site_id}", response_model=Site, summary="Get a site")
def one(site: Site = Depends(get_site), _: Caller = Depends(current)) -> Site:
    return site


@router.get("/{site_id}/now", response_model=PlantNow, summary="Live plant view")
def now_view(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store),
             engine: Engine = Depends(get_engine), now: datetime = Depends(get_now), lang: str = Depends(get_lang)) -> PlantNow:
    require_data(store, site)
    feeds = feeds_for(store, site.id, now)
    st = store.plans.get((site.id, now.date()))
    plan = build_plan(engine, site, now.date(), st.strategy if st else Strategy.balanced, store.limits[site.id],
                      dict(st.overrides) if st else {}, now, feeds, lang, approved=True)
    h = now.hour
    hp = plan.hours[h]
    soc_start = plan.hours[h - 1].soc_mwh_end if h > 0 else plan.hours[0].soc_mwh_end + hp.dispatch_mw
    soc_start -= hp.dispatch_mw * now.minute / 60  # part of the current hour already run
    wear = store.limits[site.id].wear_cost_per_mwh
    margin = sum(x.dispatch_mw * x.price_forecast - (wear * x.dispatch_mw if x.dispatch_mw > 0 else 0)
                 for x in plan.hours[:h])
    nxt = next((b for b in plan.schedule if int(b.start[:2]) > h), None)
    if nxt:
        verb = {"charge": ("Charge", "Cargar"), "discharge": ("Discharge", "Descargar")}[nxt.action][1 if lang == "es" else 0]
        next_action = f"{verb} ≤{nxt.max_mw:g} MW · {nxt.start}–{nxt.end}"
    else:
        next_action = "Hold until tomorrow's plan" if lang == "en" else "Sin acción hasta el plan de mañana"
    telemetry_live = next(f for f in feeds if f.name == "site_telemetry").status == "live"
    held = site.status == "holding" and hp.dispatch_mw != 0
    return PlantNow(
        site_id=site.id, as_of=now, battery_mw=0.0 if site.status == "maintenance" or held else hp.dispatch_mw,
        soc_pct=round(soc_start / site.energy_mwh * 100, 1), soc_mwh=round(soc_start, 2), solar_mw=hp.solar_mw,
        price_now=round(hp.price_forecast * 1.02), price_forecast=hp.price_forecast, energy_margin_today=round(margin),
        in_likely_critical_hour=hp.likely_critical, on_plan=telemetry_live and not held, next_action=next_action, feeds=feeds,
    )


@router.get("/{site_id}/limits", response_model=OperatingLimits, summary="Operating limits")
def get_limits(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store)) -> OperatingLimits:
    return store.limits[site.id]


@router.put("/{site_id}/limits", response_model=OperatingLimits, summary="Replace operating limits")
def put_limits(body: OperatingLimits, site: Site = Depends(get_site), c: Caller = Depends(need("limits.edit")),
               store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> OperatingLimits:
    for name in ("max_charge_mw", "max_discharge_mw"):
        v = getattr(body, name)
        if v is not None and v > site.power_mw:
            raise ApiError(422, "over_rated", field=name, value=f"{v:g}", rated=f"{site.power_mw:g}")
    old = store.limits[site.id].model_dump()
    changes = [f"{k} {old[k]} → {v}" for k, v in body.model_dump().items() if old[k] != v]
    store.limits[site.id] = body
    if changes:
        store.log(now, c.actor, "limits.update", "; ".join(changes), site.id)
    return body


@router.get("/{site_id}/health", response_model=Health, summary="Battery health")
def health(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store)) -> Health:
    return store.health[site.id]


@router.get("/{site_id}/maintenance-windows", response_model=list[MaintenanceWindow], summary="Maintenance windows")
def windows(site: Site = Depends(get_site), _: Caller = Depends(current), store: Store = Depends(get_store)) -> list[MaintenanceWindow]:
    return sorted(store.maintenance[site.id], key=lambda w: w.start)


@router.post("/{site_id}/maintenance-windows", response_model=MaintenanceWindow, status_code=201, summary="Add a maintenance window")
def add_window(body: MaintenanceWindowIn, site: Site = Depends(get_site), c: Caller = Depends(need("maintenance.edit")),
               store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> MaintenanceWindow:
    w = MaintenanceWindow(id=store.new_id("mw"), **body.model_dump())
    store.maintenance[site.id].append(w)
    store.log(now, c.actor, "maintenance.create", f"{w.start:%d %b %H:%M}–{w.end:%d %b %H:%M} ({w.reason})", site.id)
    return w


@router.delete("/{site_id}/maintenance-windows/{window_id}", status_code=204, summary="Remove a maintenance window")
def delete_window(window_id: str, site: Site = Depends(get_site), c: Caller = Depends(need("maintenance.edit")),
                  store: Store = Depends(get_store), now: datetime = Depends(get_now)) -> None:
    ws = store.maintenance[site.id]
    match = next((w for w in ws if w.id == window_id), None)
    if not match:
        raise ApiError(404, "not_found", what=f"Maintenance window '{window_id}'")
    ws.remove(match)
    store.log(now, c.actor, "maintenance.delete", f"Removed {window_id} ({match.reason})", site.id)
