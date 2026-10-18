# CENACE changes (18 Oct 2026)

Nothing new to deploy: the same GitHub → Render steps in the manual. Render installs the two new
packages from `requirements.txt` on its own (`python-multipart` for file uploads, `openpyxl` for xlsx).
The website folder goes up to Cloudflare Pages exactly as before.

## What changed in the idea

A plan is an **offer**. Pantheon never submits to CENACE and never controls the battery. The client's
Market Participant ([TRADER]) submits the offer to the day-ahead market by 10:00 on D-1; CENACE clears it,
dispatches it, the meter measures it, the statement settles it. The API now carries that lifecycle:
**offered → cleared → dispatched → measured → settled**, and a **deviation** whenever cleared ≠ offered.

## New endpoints

| Endpoint | What it does |
|---|---|
| `GET /v1/sites/{id}/offer/{date}` | The approved plan as a self-schedule offer: net export, battery and solar MW per hour, deadline, status, submission record |
| `GET /v1/sites/{id}/offer/{date}/export?format=csv\|xlsx` | The offer file in the [TRADER] portal layout: `HORA, MW_NETO, MW_BATERIA, MW_SOLAR, TIPO` |
| `POST /v1/sites/{id}/offer/{date}/submitted` | `{by, confirmation}` records that [TRADER] submitted it; 409 after 10:00 D-1 unless `force` |
| `POST/GET /v1/sites/{id}/cleared/{date}` | Store CENACE's cleared MW per hour; returns deviations vs the offer and their margin impact |
| `POST /v1/sites/{id}/imports/meter?date=` | Upload `hour,kwh_export,kwh_import` CSV from the certified meter |
| `POST /v1/sites/{id}/imports/statement` | Upload `date,energy_mxn,capacity_mxn,charges_mxn,kind` CSV (preliminary or final statements) |
| `GET /v1/sites/{id}/data-sources` | EMS, meter, prices, CENACE instructions, cleared schedules, statements, registration: live / stale / pending / blocked |
| `GET/PUT /v1/sites/{id}/interconnection` | Node, export cap (offers are clipped to it), grid charging rule and price limit, storage registered with CENACE |
| `GET /v1/sites/{id}/battery` | State of charge and its source: `ems` or `model` (no EMS reading in 5 min). Modelled state → approving needs an asset manager with `sign_off: true` (else 428) |

Changed: `GET …/replay/{date}` now carries `sources` (dispatched, measured, prices, cleared, settlement) and
`cleared_mw` per hour. `POST …/plans/{date}/approve` accepts `sign_off`. Two new webhook events:
`offer.submitted`, `offer.deviation`.

## Sample data

- Site A: export cap 38 MW, grid charging allowed below 700 MXN/MWh, storage registered.
- Yesterday (16 Oct): offered 3 MW at 22:00, CENACE cleared 1.5 MW (congestion); preliminary statement received 17 Oct.
- Sites B, D, E: tomorrow's offers already submitted by [TRADER] at 08:05.
- Site C: EMS feed stopped at 07:42, so its battery state is modelled and its approval needs sign-off.
- Site G: storage not yet registered with CENACE (blocked).

## What you must confirm before a real client

The MDA deadline (10:00 is a placeholder), the exact portal layout [TRADER] uses, how the battery is registered
with CENACE, and the interconnection export cap. All are placeholders in the sample data.
