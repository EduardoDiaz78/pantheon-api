"""Víspera: the public forecast chain. See app/vispera.py for the construction.

Public, no sign-in:  the index of chains, each chain's entries (hashes, kinds, target days, anchor times, clear
                     content for terms and actuals), Bitcoin proofs and Pantheon's Rekor public key.
Client under NDA:    the whole chain from entry 0 with every forecast and the chain keys to derive the salts.
Genau (admin):       exports the month keys for backup or escrow.
"""
from __future__ import annotations

import json
import os
import threading
import time
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field

from .. import anchor as btc
from .. import vispera as V
from ..auth import Caller, need
from ..errors import ApiError
from ..qenergy_store import QStore
from .qenergy import get_qstore

router = APIRouter(prefix="/v1/vispera", tags=["Víspera forecast chain"])


# ---------- anchoring ----------
def anchor_entry(store: QStore, entry_id: int, calendar_factory=None, rekor_post=None) -> None:
    """Send one entry's hash to Bitcoin (OpenTimestamps) and to Rekor. Each half retries later on failure."""
    e = store.entry(entry_id)
    if btc.enabled() and not e["ots"]:
        try:
            p = btc.stamp(e["hash"], calendar_factory)
            store.set_entry(entry_id, ots=p.ots, ots_status=p.status, block_height=p.block_height, ots_error=None)
        except Exception as x:
            store.set_entry(entry_id, ots_status="failed", ots_error=str(x)[:300])
    if V.rekor_enabled() and not e["rekor_uuid"]:
        try:
            key, pub = store.signing_key(e["chain"])
            r = V.rekor_submit(key, pub, store.preimage_of(e), e["hash"], post=rekor_post or _rekor_override)
            store.set_entry(entry_id, rekor_uuid=r["uuid"], rekor_index=r["log_index"], rekor_time=r["integrated_time"], rekor_error=None)
        except Exception as x:
            store.set_entry(entry_id, rekor_error=str(x)[:300])


_rekor_override = None  # tests replace this with a stand-in Rekor


def refresh(store: QStore) -> dict:
    out = {"stamped": 0, "anchored": 0, "still_pending": 0, "rekor_logged": 0, "failed": 0}
    for e in store.unfinished_entries():
        before = (e["ots"] is not None, e["rekor_uuid"] is not None)
        if not before[0] or not before[1]:
            anchor_entry(store, e["id"])
            e2 = store.entry(e["id"])
            out["stamped"] += int(not before[0] and e2["ots"] is not None)
            out["rekor_logged"] += int(not before[1] and e2["rekor_uuid"] is not None)
            out["failed"] += int((btc.enabled() and e2["ots"] is None) or (V.rekor_enabled() and e2["rekor_uuid"] is None))
            e = e2
        if e["ots"] and e["ots_status"] == "pending" and btc.enabled():
            p = btc.upgrade(e["ots"])
            store.set_entry(e["id"], ots=p.ots, ots_status=p.status, block_height=p.block_height)
            out["anchored" if p.status == "bitcoin" else "still_pending"] += 1
    return out


def refresh_loop(every_s: int = 1800) -> None:
    def run():
        while True:
            time.sleep(every_s)
            try:
                refresh(get_qstore())
            except Exception:
                pass
    threading.Thread(target=run, daemon=True, name="vispera-refresh").start()


# ---------- schemas ----------
class TermsIn(BaseModel):
    chain_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,40}$", description="One chain per plant, zona or nodo, e.g. 'atotonilco'")
    subject: dict = Field(description="What is forecast, e.g. {'site': 'atotonilco', 'central': '01GTT'} or {'zona': 'CENTRO ORIENTE'}")
    market: str = Field("MDA", description="Market the forecast is for")
    quantity: str = Field(description="What each forecast contains, e.g. 'hourly sales offer, MW'")
    horizon: str = Field("D+1, 24 hours")
    cutoff_local: str = Field("10:00", pattern=r"^\d{2}:\d{2}$", description="Deadline, Mexico City time")
    cutoff_days_before: int = Field(1, ge=0, le=7)
    utc_offset_hours: int = Field(-6)
    start_date: date = Field(description="First target day. Entry 0 must be recorded before it")
    scoring: str = Field(description="How forecasts will be scored, fixed before any result is known")
    actuals_source: str = Field("CENACE, PML MDA and MTR", description="Where the actuals come from")


def _cutoff_ok(e: dict, terms: dict) -> dict:
    out = {"cutoff_utc": None, "recorded_before_cutoff": None, "rekor_before_cutoff": None}
    if e["kind"] != "forecast":
        return out
    c = V.cutoff_utc(e["target_day"], terms)
    out["cutoff_utc"] = c.isoformat()
    out["recorded_before_cutoff"] = datetime.fromisoformat(e["recorded_at"]) < c
    if e["rekor_time"]:
        out["rekor_before_cutoff"] = datetime.fromtimestamp(e["rekor_time"], timezone.utc) < c
    return out


def public_entry(e: dict, terms: dict) -> dict:
    if terms.get("demo"):  # simulated clocks: no proof file, no public log link
        e = {**e, "ots": None}
    return {"seq": e["seq"], "kind": e["kind"], "target_day": e["target_day"], "hash": e["hash"], "prev": e["prev"],
            "recorded_at": e["recorded_at"],
            "content": e["content"] if e["kind"] != "forecast" else None,
            "bitcoin": {"status": e["ots_status"] or ("queued" if btc.enabled() else "off"), "block_height": e["block_height"],
                        "simulated": bool(terms.get("demo")),
                        "proof_url": f"/v1/vispera/chains/{e['chain']}/entries/{e['seq']}/proof.ots" if e["ots"] else None},
            "rekor": {"log_index": e["rekor_index"], "uuid": e["rekor_uuid"],
                      "integrated_time": datetime.fromtimestamp(e["rekor_time"], timezone.utc).isoformat() if e["rekor_time"] else None,
                      "url": f"https://search.sigstore.dev/?logIndex={e['rekor_index']}" if e["rekor_index"] is not None else None,
                      "simulated": bool(terms.get("demo"))},
            **_cutoff_ok(e, terms)}


def chain_or_404(store: QStore, chain_id: str) -> dict:
    c = store.chain(chain_id)
    if not c:
        raise ApiError(404, "not_found", what=f"chain {chain_id}")
    return c


# ---------- public ----------
@router.get("/index", summary="Every chain: terms, length, head hash (public, no sign-in)")
def index(store: QStore = Depends(get_qstore)) -> dict:
    return {"chains": [{**c, "entry0": (store.entries(c["id"]) or [{}])[0].get("hash"),
                        "public_key_url": f"/v1/vispera/chains/{c['id']}/public-key"} for c in store.chains()],
            "anchors": {"bitcoin": btc.enabled(), "rekor": V.rekor_enabled()},
            "construction": "s_i = SHA-256(salt_i || content_i || s_(i-1)); salt empty for terms and actuals; s_(-1) = 32 zero bytes"}


@router.get("/chains/{chain_id}", summary="All entries of a chain: hashes, kinds, days, anchor times (public, no sign-in)")
def public_chain(chain_id: str, store: QStore = Depends(get_qstore)) -> dict:
    c = chain_or_404(store, chain_id)
    es = store.entries(chain_id)
    rows = [public_entry(e, c["terms"]) for e in es]
    f = [r for r in rows if r["kind"] == "forecast"]
    return {"chain": chain_id, "terms": c["terms"], "length": len(rows), "head": rows[-1]["hash"] if rows else None,
            "entry0": rows[0]["hash"] if rows else None,
            "summary": {"forecasts": len(f), "actuals": sum(r["kind"] == "actuals" for r in rows),
                        "forecast_days": len({r["target_day"] for r in f}),
                        "bitcoin": sum(r["bitcoin"]["status"] == "bitcoin" for r in rows),
                        "rekor": sum(r["rekor"]["log_index"] is not None for r in rows),
                        "rekor_before_cutoff": sum(bool(r["rekor_before_cutoff"]) for r in f),
                        "recorded_before_cutoff": sum(bool(r["recorded_before_cutoff"]) for r in f)},
            "entries": rows}


@router.get("/chains/{chain_id}/entries/{seq}/proof.ots", summary="Bitcoin proof for one entry's hash (public)")
def entry_proof(chain_id: str, seq: int, store: QStore = Depends(get_qstore)) -> Response:
    chain_or_404(store, chain_id)
    e = next((x for x in store.entries(chain_id) if x["seq"] == seq), None)
    if not e or not e["ots"]:
        raise ApiError(404, "not_found", what=f"Bitcoin proof for {chain_id} #{seq}")
    ots = e["ots"]
    if e["ots_status"] == "pending" and btc.enabled():
        p = btc.upgrade(ots)
        store.set_entry(e["id"], ots=p.ots, ots_status=p.status, block_height=p.block_height)
        ots = p.ots
    return Response(ots, media_type="application/octet-stream",
                    headers={"Content-Disposition": f'attachment; filename="{chain_id}-{seq}.ots"'})


@router.get("/chains/{chain_id}/public-key", response_class=PlainTextResponse,
            summary="The chain's Rekor signing key (public). Rekor lists every entry signed with it")
def public_key(chain_id: str, store: QStore = Depends(get_qstore)) -> str:
    return chain_or_404(store, chain_id)["terms"]["signing_key"]


# ---------- Genau ----------
@router.post("/chains", status_code=201, summary="Start a chain: records entry 0 (the terms) before the start date")
def create_chain(body: TermsIn, tasks: BackgroundTasks, c: Caller = Depends(need("vispera.admin")),
                 store: QStore = Depends(get_qstore)) -> dict:
    if body.start_date <= datetime.now(timezone.utc).date():
        raise ApiError(422, "validation_error", details=[{"field": "start_date", "message": "must be after today: the terms come first"}])
    if not os.getenv("PANTHEON_REKOR_SEED") and os.getenv("PANTHEON_VISPERA_ALLOW_EPHEMERAL", "false").lower() != "true":
        raise ApiError(409, "conflict", details=[{"message": "Set PANTHEON_REKOR_SEED and persistent storage first: "
                                                  "a key or database lost on restart would orphan the chain."}])
    if store.chain(body.chain_id):
        raise ApiError(409, "conflict", details=[{"message": f"chain {body.chain_id} exists"}])
    key, pub = store.signing_key(body.chain_id)
    terms = {**body.model_dump(mode="json", exclude={"chain_id"}), "chain": body.chain_id,
             "signing_key": pub,
             "one_chain_rule": "This is the only chain for this subject. Every entry is signed with signing_key and logged in Rekor; "
                               "any Rekor entry signed with it that is not in this chain voids Genau's claims for the period.",
             "forecast_must_include": ["model_commit (git SHA-1 of the code that ran)", "model_repo",
                                       "inputs: source, as_of, retrieved_at, sha256 of each input file"],
             "anchors": ["bitcoin-opentimestamps", "sigstore-rekor"],
             "construction": "s_i = SHA-256(salt_i || content_i || s_(i-1)); chain key = HMAC-SHA256(month key, 'chain|'+chain); "
                             "salt = HMAC-SHA256(chain key, 'salt|'+target_day+'|'+seq); forecasts salted, terms and actuals clear",
             "created_by": c.actor}
    try:
        e = store.create_chain(body.chain_id, terms)
    except ValueError:
        raise ApiError(409, "conflict", details=[{"message": f"chain {body.chain_id} exists"}])
    tasks.add_task(anchor_entry, store, e["id"])
    return public_entry(e, terms)


@router.get("/chains/{chain_id}/disclosure", summary="Client under NDA: the whole chain from entry 0 with forecasts and chain keys")
def disclosure(chain_id: str, through: Optional[date] = Query(None, description="Last recorded day to include. Always starts at entry 0"),
               c: Caller = Depends(need("vispera.disclose")), store: QStore = Depends(get_qstore)) -> dict:
    ch = chain_or_404(store, chain_id)
    es = store.entries(chain_id)
    if through:
        es = [e for e in es if e["recorded_at"][:10] <= through.isoformat()]
    months = sorted({V.month_of(e["target_day"]) for e in es if e["kind"] == "forecast"})
    keys = {m: V.chain_key(store.month_key(m), chain_id).hex() for m in months}
    return {"chain": chain_id, "terms": ch["terms"], "entry0": es[0]["hash"] if es else None, "disclosed_to": c.actor, "disclosed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "rule": "All or nothing: every entry from 0 to the last one recorded by the date asked for.",
            "chain_keys": keys,
            "entries": [{**public_entry(e, ch["terms"]), "content": e["content"]} for e in es]}


@router.get("/keys", summary="Admin: export the month keys (sealed) for backup or escrow. Each export is logged")
def month_keys(c: Caller = Depends(need("vispera.keys")), store: QStore = Depends(get_qstore)) -> dict:
    return {"released_to": c.actor, "keys": store.month_keys(mark_released=True)}


@router.post("/refresh", summary="Anchor anything missed and complete pending Bitcoin proofs (runs every 30 minutes)")
def refresh_now(_: Caller = Depends(need("forecast.write")), store: QStore = Depends(get_qstore)) -> dict:
    return refresh(store)
