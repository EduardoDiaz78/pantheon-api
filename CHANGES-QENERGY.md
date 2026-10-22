# QEnergy offer files and settlements (22 Oct 2026)

Pantheon prepares the offers; QEnergy (José Antonio, the Market Participant) downloads them in its own templates
and submits them to CENACE. Pantheon never submits to CENACE.

## For the forecasting engine (Leo)

Post each day's hourly forecast once it is ready, before QEnergy's deadline. Every post is kept as a new version
with the time it arrived and its SHA-256, so the record of what was forecast, and when, cannot be changed later.

```
POST /v1/qenergy/sites/atotonilco/forecasts/2026-10-23
X-API-Key: <engine key>
Content-Type: application/json

{
  "model_version": "pantheon-2026.10.3",
  "hours": [
    {"hour": 1,  "sell_mw": 0.0,   "sell_price": 0, "buy_fixed_mw": 0, "buy_segments": []},
    ...
    {"hour": 20, "sell_mw": 0.174, "sell_price": 0, "buy_fixed_mw": 0, "buy_segments": [{"mw": 0.05, "price": 900}]},
    ...
    {"hour": 24, "sell_mw": 0.0,   "sell_price": 0, "buy_fixed_mw": 0, "buy_segments": []}
  ]
}
```

- `hour`: CENACE hours 1–24 (25 only on a day the clocks go back).
- `sell_mw`: energy offered for sale that hour (the "Oferta No Despachable").
- `sell_price`: MXN/MWh; 0 = price-taker, as in QEnergy's samples.
- `buy_fixed_mw`, `buy_segments` (up to 3): the purchase offer at load centre AXC0611GTT79.
- Answer: `201` with `version` and `sha256`. A missing or repeated hour is refused with `422`.

## For QEnergy

On the Pantheon site, the QEnergy login sees one page: choose the operating day, then download

- **Sales offer** `…/offers/{day}/venta.xlsx`: one day, plant 01GTT, unit 01GTT-EX1, in QEnergy's "ONDvr1" template.
- **Purchase offer** `…/offers/{day}/compra.xlsx?days=1..7`: the day's hourly profile for 1–7 days, in the "OCEvr1" template.
- **Settlement** `…/settlements?month=YYYY-MM&format=xlsx|csv|json`: day-ahead revenue (cleared MW × PML MDA) and
  real-time deviation ((metered − cleared) × PML MTR), by day and hour. This is Genau's format until QEnergy sends its own.

Results for settlement (cleared MW, metered MWh, PML MDA, PML MTR per hour) are posted to
`POST /v1/qenergy/sites/atotonilco/results/{day}` by QEnergy or the engine.

## Before real data flows

1. **Keys.** Set `PANTHEON_ENGINE_KEY` and `PANTHEON_QENERGY_KEY` on Render (long random values, shared privately),
   and `PANTHEON_DEMO_KEYS=false` so the public demo keys stop working for these two roles.
2. **Storage.** Forecasts are stored in SQLite at `PANTHEON_DB`. On Render's free plan that file is wiped when the
   service restarts or sleeps. Use a paid instance with a persistent disk (mount it and point `PANTHEON_DB` there) or a database.
3. **Sample data.** A sample week (12–18 Oct 2026) loads when the store is empty; set `PANTHEON_QENERGY_SAMPLE=false` to stop it.
