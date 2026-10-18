"""Webhooks and project simulation."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends

from ..auth import Caller, current, get_now, get_store, need
from ..errors import ApiError
from ..models import (
    DurationOption, SimulationMonth, SimulationRequest, SimulationResult, Strategy, Webhook, WebhookCreated,
    WebhookDelivery, WebhookIn,
)
from ..store import Store

router = APIRouter(prefix="/v1", tags=["Webhooks and simulation"])


# ---------------- Webhooks ----------------

def _public(w: dict) -> Webhook:
    return Webhook(id=w["id"], url=w["url"], events=w["events"], secret_hint=w["secret"][-4:], created_at=w["created_at"])


@router.post("/webhooks", response_model=WebhookCreated, status_code=201, summary="Subscribe a URL to events")
def create_webhook(body: WebhookIn, c: Caller = Depends(need("webhooks.manage")), store: Store = Depends(get_store),
                   now: datetime = Depends(get_now)) -> WebhookCreated:
    w = {"id": store.new_id("wh"), "url": body.url, "events": list(dict.fromkeys(body.events)), "secret": store.new_secret(), "created_at": now}
    store.webhooks[w["id"]] = w
    store.log(now, c.actor, "webhook.create", f"{w['url']} for {', '.join(w['events'])}")
    return WebhookCreated(**_public(w).model_dump(), secret=w["secret"])


@router.get("/webhooks", response_model=list[Webhook], summary="Webhook subscriptions")
def list_webhooks(_: Caller = Depends(need("webhooks.manage")), store: Store = Depends(get_store)) -> list[Webhook]:
    return [_public(w) for w in store.webhooks.values()]


@router.delete("/webhooks/{webhook_id}", status_code=204, summary="Remove a subscription")
def delete_webhook(webhook_id: str, c: Caller = Depends(need("webhooks.manage")), store: Store = Depends(get_store),
                   now: datetime = Depends(get_now)) -> None:
    w = store.webhooks.pop(webhook_id, None)
    if not w:
        raise ApiError(404, "not_found", what=f"Webhook '{webhook_id}'")
    store.log(now, c.actor, "webhook.delete", w["url"])


@router.get("/webhooks/{webhook_id}/deliveries", response_model=list[WebhookDelivery], summary="Events queued for a subscription")
def deliveries(webhook_id: str, _: Caller = Depends(need("webhooks.manage")), store: Store = Depends(get_store)) -> list[WebhookDelivery]:
    if webhook_id not in store.webhooks:
        raise ApiError(404, "not_found", what=f"Webhook '{webhook_id}'")
    return [WebhookDelivery(**d) for d in store.deliveries.get(webhook_id, [])]


# ---------------- Simulation ----------------

_RATE = {2: 1900, 4: 2900, 6: 3400}      # thousand MXN per MW-year, sample
_CYCLES = {2: 330, 4: 300, 6: 260}
_REGION = {"Nuevo León": 1.0, "Jalisco": 0.95, "Sonora": 1.08, "Yucatán": 1.12, "Baja California": 1.15}
_STRATEGY = {Strategy.conservative: (0.88, 0.85), Strategy.balanced: (1.0, 1.0), Strategy.aggressive: (1.08, 1.18)}
_SEASON = [0.7, 0.75, 0.9, 1.05, 1.25, 1.35, 1.3, 1.25, 1.1, 0.95, 0.75, 0.65]
P10, P90 = 0.78, 1.20


@router.post("/simulations", response_model=SimulationResult, summary="Simulate a project before it is built")
def simulate(body: SimulationRequest, _: Caller = Depends(current)) -> SimulationResult:
    rev_f, cyc_f = _STRATEGY[body.strategy]
    solar_f = 1 + 0.06 * min(1.0, body.solar_mw / body.power_mw)  # charging from own solar, sample factor

    def per_mw(d: int) -> float:
        return _RATE[d] * 1000 * _REGION[body.region] * rev_f * solar_f

    annual = body.power_mw * per_mw(body.duration_h)
    total = sum(_SEASON)
    monthly = []
    for i, f in enumerate(_SEASON):
        p50 = annual * f / total
        monthly.append(SimulationMonth(month=i + 1, p10=round(p50 * P10), p50=round(p50), p90=round(p50 * P90)))
    return SimulationResult(
        annual_net_p10=round(annual * P10), annual_net_p50=round(annual), annual_net_p90=round(annual * P90),
        per_mw_year=round(per_mw(body.duration_h)), cycles_per_year=round(_CYCLES[body.duration_h] * cyc_f), monthly=monthly,
        duration_comparison=[DurationOption(duration_h=d, energy_mwh=body.power_mw * d, annual_net_p50=round(body.power_mw * per_mw(d)),
                                            per_mw_year=round(per_mw(d)), cycles_per_year=round(_CYCLES[d] * cyc_f)) for d in (2, 4, 6)],
        disclaimer="Indicative energy margin only, from sample factors, with wear included. Capacity payments are not included until verified against CENACE settlement data. Not a revenue guarantee.",
    )
