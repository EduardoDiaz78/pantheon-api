"""The engine slot.

Pantheon's forecasting and dispatch model plugs in here. The API calls only
the `Engine` interface and exposes only what it returns: prices, solar,
critical-hour likelihoods and a dispatch schedule. How the engine produces
them never crosses this boundary.

`SampleEngine` returns fixed, illustrative numbers that match the design
mockups exactly, so the API and the screens can be demoed together before the
real engine is connected. To connect it, implement `Engine` and return it
from `get_engine()` in `app/auth.py`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol

from .models import OperatingLimits, Site, Strategy


@dataclass(frozen=True)
class PricePoint:
    p50: float
    low: float
    high: float


@dataclass(frozen=True)
class Dispatch:
    start_soc_mwh: float
    mw: list[float]  # 24 values: + discharge, - charge


class Engine(Protocol):
    def price_forecast(self, site: Site, day: date) -> list[PricePoint]:
        """24 hourly prices at the site's node, MXN/MWh."""
        ...

    def solar_forecast(self, site: Site, day: date) -> list[float]:
        """24 hourly solar output values, MW. All zeros for standalone batteries."""
        ...

    def critical_likelihood(self, site: Site, day: date) -> dict[int, float]:
        """Chance (0–1) each hour is confirmed critical by CENACE. Hours left out are 0."""
        ...

    def dispatch(self, site: Site, day: date, prices: list[PricePoint], solar: list[float],
                 likelihood: dict[int, float], limits: OperatingLimits, strategy: Strategy) -> Dispatch:
        """Hourly charge/discharge plan for the delivery day."""
        ...


# ---------------- Sample implementation (illustrative only) ----------------

_P50 = [920, 860, 810, 790, 800, 850, 980, 1150, 1080, 900, 720, 610,
        560, 540, 580, 690, 940, 1480, 2350, 3120, 3380, 2760, 1650, 1180]
_SOLAR_30MW = [0, 0, 0, 0, 0, 0, 0, 2, 8, 15, 21, 26, 29, 30, 29, 26, 20, 13, 5, 1, 0, 0, 0, 0]
_LIKELY = {17: 0.12, 18: 0.31, 19: 0.72, 20: 0.81, 21: 0.58, 22: 0.19}

# Reference profiles for 10 MW / 40 MWh, within a 10–95% charge window.
# Identical to the Today screen: Balanced 73,495 MXN, Conservative 66,005,
# Aggressive 72,775 at 180 MXN/MWh wear. Aggressive deliberately exceeds one
# cycle a day so the guardrails have something to catch.
_PROFILES: dict[Strategy, tuple[float, list[float]]] = {
    Strategy.conservative: (0.20, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -7.5, -7.5, -7.5, -7.5,
                                   0, 0, 0, 2, 9, 9, 8, 2, 0]),
    Strategy.balanced: (0.10, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8.5, -8.5, -8.5, -8.5,
                               0, 0, 0, 3, 10, 10, 8, 3, 0]),
    Strategy.aggressive: (0.10, [0, 0, -4.5, -4.5, -4.5, -4.5, 0, 4, 4, 0, 0, -6, -6, -6, -6,
                                 0, 0, 0, 4, 10, 10, 8, 2, 0]),
}


class SampleEngine:
    """Deterministic sample data. Not a forecast. Not an optimizer."""

    def price_forecast(self, site: Site, day: date) -> list[PricePoint]:
        return [PricePoint(p50=p, low=round(p * 0.90, 2), high=round(p * 1.12, 2)) for p in _P50]

    def solar_forecast(self, site: Site, day: date) -> list[float]:
        k = site.solar_mw / 30.0
        return [round(v * k, 3) for v in _SOLAR_30MW]

    def critical_likelihood(self, site: Site, day: date) -> dict[int, float]:
        return dict(_LIKELY)

    def dispatch(self, site, day, prices, solar, likelihood, limits, strategy) -> Dispatch:
        start_pct, ref = _PROFILES[strategy]
        k = min(site.power_mw / 10.0, site.energy_mwh / 40.0)
        return Dispatch(start_soc_mwh=round(start_pct * site.energy_mwh, 4), mw=[round(v * k, 4) for v in ref])
