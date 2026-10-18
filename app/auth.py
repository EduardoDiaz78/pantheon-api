"""Dependencies: store, engine, clock, language and API-key auth with a permission matrix."""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache

from fastapi import Depends, Security
from fastapi.security import APIKeyHeader

from .engine import Engine, SampleEngine
from .errors import ApiError
from .models import DataFeed, Role, Site, User
from .planning import MX_TZ
from .store import PERMISSIONS, Store

_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


@dataclass(frozen=True)
class Caller:
    user: User

    @property
    def actor(self) -> str:
        return self.user.name

    @property
    def role(self) -> Role:
        return self.user.role

    def can(self, perm: str) -> bool:
        return perm in PERMISSIONS[self.role]


@lru_cache
def get_store() -> Store:
    return Store()


@lru_cache
def get_engine() -> Engine:
    # Connect the real Pantheon engine here.
    return SampleEngine()


DEMO_NOW = datetime(2026, 10, 17, 8, 15, tzinfo=MX_TZ)


def get_now() -> datetime:
    """The demo runs at 08:15 on Saturday 17 Oct 2026, the morning in the prototype.
    Set PANTHEON_CLOCK=real to use the wall clock."""
    if os.environ.get("PANTHEON_CLOCK", "demo") == "real":
        return datetime.now(MX_TZ)
    return DEMO_NOW


def current(key: str | None = Security(_key_header), store: Store = Depends(get_store)) -> Caller:
    uid = store.api_keys.get(key or "")
    if not uid:
        raise ApiError(401, "unauthorized")
    return Caller(store.users[uid])


def need(perm: str):
    def _dep(c: Caller = Depends(current)) -> Caller:
        if not c.can(perm):
            raise ApiError(403, "forbidden", role=c.role.value, perm=perm)
        return c
    return _dep


def get_site(site_id: str, store: Store = Depends(get_store)) -> Site:
    site = store.sites.get(site_id)
    if not site:
        raise ApiError(404, "site_not_found", site=site_id)
    return site


def feeds_for(store: Store, site_id: str, now: datetime) -> list[DataFeed]:
    def feed(name, last, stale_after):
        age = max(0, int((now - last).total_seconds() // 60))
        return DataFeed(name=name, status="stale" if age > stale_after else "live", last_update=last, age_minutes=age)
    return [
        feed("cenace_prices", store.prices_last, 24 * 60),
        feed("site_telemetry", store.telemetry_last.get(site_id, now - timedelta(minutes=2)), 5),
        feed("weather", now - timedelta(minutes=30), 6 * 60),
    ]
