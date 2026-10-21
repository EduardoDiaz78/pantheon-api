import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import Caller, current, get_store

from . import errors
from .routers import alerts, cenace, channels, finance, integrations, me, plans, products, sites

DESCRIPTION = """
Client API for Pantheon, Genau AI's forecasting and dispatch platform for solar + battery plants and battery fleets in Mexico.
It serves everything the Pantheon screens show, so a client's own systems, a lender's advisor or a white-label partner
can use the same data.

**Authentication.** Send your key in `X-API-Key`. Each key belongs to a person with a role:

| Role | Can |
|---|---|
| viewer | Read plans, settlement, reports, alerts |
| auditor | Viewer + audit log + raw forecast CSV (for a lender's technical advisor) |
| operator | Viewer + overrides, approvals, offer export, alert decisions |
| asset_manager | Operator + sign off soft limit breaches, maintenance, disputes, audit log |
| admin | Everything, including operating limits, roles and webhooks |

**Guardrails.** Every plan is checked against the site's limits, outside the forecasting engine. *Hard* breaches (power,
battery charge) can never be approved. *Soft* breaches (daily cycle limit, an uncovered likely critical hour) need an asset
manager's sign-off.

**Capacity value.** Likely critical hours come with a likelihood. Capacity value is always `status: "projection"` with a null
amount until it is verified against CENACE settlement data for the node.

**Daily replay.** `GET /v1/sites/{id}/replay/{date}` answers "did it earn its fee yesterday?": planned against actual, hour by hour,
against the battery sitting idle, with what drove the difference.

**CENACE.** Pantheon never submits to CENACE or controls the battery. An approved plan is an *offer*:
`GET /v1/sites/{id}/offer/{date}` and its `/export` give [TRADER] (the client's Market Participant) the self-schedule to
submit to the day-ahead market by 10:00 on D-1; `/offer/{date}/submitted` records the confirmation; `/cleared/{date}` stores
CENACE's result and the deviations; `/imports/meter` and `/imports/statement` take the meter intervals and the settlement
statements; `/data-sources` says where every number comes from. Lifecycle: offered → cleared → dispatched → measured → settled.

**WhatsApp.** The morning plan and incidents go out as WhatsApp messages with buttons. A tap arrives at
`POST /v1/channels/whatsapp/inbound` from a verified number, runs with that person's role and is written to the audit log with the
channel. Plans that need a sign-off can only be approved in the app.

**Language.** Send `Accept-Language: es-MX` for Spanish messages, explanations and alerts. Field names and codes stay in English.

**Errors.** Always `{"error": {"code", "message", "details"}}`.

**Units.** MXN, MXN/MWh, MW (positive = discharge, negative = charge), MWh, plant local time (America/Mexico_City).

**Product lines.** `GET /v1/products` lists the nine lines Genau offers in Mexico (battery optimization, plant
forecasting, critical-hour service, supplier and trader forecasts, white-label, bankability, revenue floors, grid forecasting,
Genau Mexico with QEnergy); `GET /v1/products/{id}` adds sample figures for its screen. `GET /v1/business/plan` is the
internal 2030 revenue build, admin only.

**Sample data.** This build runs on a sample engine and a demo clock (08:15, Saturday 17 October 2026). Responses carry
`sample_data: true` until the live engine is connected.
"""

app = FastAPI(title="Pantheon API", version="0.2.0", description=DESCRIPTION)
errors.install(app)

# Which websites may call this API from a browser. Set ALLOWED_ORIGINS on the host to a comma-separated list,
# e.g. "https://app.example.com,https://pantheon-demo.pages.dev". "*" allows any site (fine for public sample data).
_origins = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET", "POST", "PUT", "DELETE"],
                   allow_headers=["X-API-Key", "Content-Type", "Accept-Language"], expose_headers=["Content-Disposition"], max_age=3600)
for r in (me.router, sites.router, plans.router, cenace.router, alerts.router, finance.router, channels.router, integrations.router, products.router):
    app.include_router(r)


@app.get("/health", tags=["Service"], summary="Service health")
def service_health() -> dict:
    return {"status": "ok", "version": app.version}


@app.post("/v1/demo/reset", tags=["Service"], summary="Put the sample data back to how it started (demo only)")
def demo_reset(_: Caller = Depends(current)) -> dict:
    if os.getenv("PANTHEON_ALLOW_RESET", "true").lower() != "true":
        from .errors import ApiError
        raise ApiError(404, "not_found", what="Reset")
    get_store.cache_clear()
    return {"status": "reset"}
