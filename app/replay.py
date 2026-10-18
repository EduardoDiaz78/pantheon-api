"""Yesterday's sample day for the daily replay. One source for the replay screen and the morning summary."""
from __future__ import annotations

from datetime import date

SAMPLE_SITE = "site-a"
SAMPLE_DAY = date(2026, 10, 16)
WEAR = 180.0
# Prices in MXN/MWh. Forecast = as frozen when the plan was approved; actual = CENACE published.
FORECAST = [920, 860, 810, 790, 800, 850, 980, 1150, 1080, 900, 720, 610, 560, 540, 580, 690, 940, 1480, 2340, 3120, 3080, 2750, 1650, 1180]
ACTUAL = [960, 880, 790, 770, 830, 900, 1050, 1210, 1020, 860, 690, 640, 600, 520, 610, 760, 1010, 1620, 2580, 3290, 3380, 2490, 1720, 1240]
# MW, positive = discharge. A cloud at 14:00 cut charging to 7 MW, so the battery ran short at 22:00.
PLANNED = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8.5, -8.5, -8.5, -8.5, 0, 0, 0, 3, 10, 10, 8, 3, 0]
ACTUAL_MW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8.5, -8.5, -8.5, -7, 0, 0, 0, 3, 10, 10, 8, 1.5, 0]
CONFIRMED_CRITICAL = [19, 20]


def hour_value(mw: float, price: float) -> float:
    """Value against the battery sitting idle: energy times price, minus wear on discharge.
    Charging from solar costs the solar not sold at the node price."""
    return mw * price - WEAR * max(mw, 0)


def totals() -> dict:
    planned = [hour_value(m, p) for m, p in zip(PLANNED, FORECAST)]
    actual = [hour_value(m, p) for m, p in zip(ACTUAL_MW, ACTUAL)]
    plan_at_actual_prices = sum(hour_value(m, p) for m, p in zip(PLANNED, ACTUAL))
    return {"planned": planned, "actual": actual, "plan_value": sum(planned), "value": sum(actual),
            "price_effect": plan_at_actual_prices - sum(planned), "dispatch_effect": sum(actual) - plan_at_actual_prices}


def replay_summary() -> dict:
    tt = totals()
    covered = sum(1 for h in CONFIRMED_CRITICAL if ACTUAL_MW[h] > 0)
    return {"value_vs_idle": tt["value"], "plan_value": tt["plan_value"], "vs_plan": tt["value"] - tt["plan_value"],
            "vs_plan_pct": round((tt["value"] - tt["plan_value"]) / tt["plan_value"] * 100, 1),
            "critical_hours": CONFIRMED_CRITICAL, "critical_hours_covered": f"{covered} / {len(CONFIRMED_CRITICAL)}", "covered": covered}
