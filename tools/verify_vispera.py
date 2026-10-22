#!/usr/bin/env python3
"""Check a Víspera chain without trusting Genau. Python 3.9+, standard library only.

Anyone (public chain, no forecasts):
    python verify_vispera.py public  chain.json            # from GET /v1/vispera/chains/{id}
Client under NDA (disclosure with forecasts and chain keys):
    python verify_vispera.py client  disclosure.json       # from GET /v1/vispera/chains/{id}/disclosure
Add --rekor to fetch each entry's time and hash from Sigstore Rekor itself instead of reading them from the file:
then a disclosure Genau rebuilt after the fact fails, because Rekor still holds the original hashes.

What it checks
  public  every entry is numbered 0, 1, 2… with no gap; each entry points at the previous hash;
          entry 0 holds the terms; each forecast was logged in Rekor before the cutoff in entry 0.
  client  all of the above, plus: derives every salt from the chain keys, recomputes every hash from its content,
          and checks the public label (kind, day, number) is what was hashed.
For Bitcoin, download each entry's .ots and run `ots verify` or use opentimestamps.org.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone

ZERO = bytes(32)


def salt(chain_key_hex: str, target_day: str, seq: int) -> bytes:
    return hmac.new(bytes.fromhex(chain_key_hex), f"salt|{target_day}|{seq}".encode(), hashlib.sha256).digest()


def cutoff(target_day: str, terms: dict) -> datetime:
    d = date.fromisoformat(target_day) - timedelta(days=int(terms.get("cutoff_days_before", 1)))
    hh, mm = (int(x) for x in terms.get("cutoff_local", "10:00").split(":"))
    tz = timezone(timedelta(hours=int(terms.get("utc_offset_hours", -6))))
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=tz).astimezone(timezone.utc)


def rekor_record(uuid: str) -> tuple[datetime, str]:
    """Rekor's own time and the hash it holds for this entry, fetched from rekor.sigstore.dev, not from Genau."""
    import base64
    with urllib.request.urlopen(f"https://rekor.sigstore.dev/api/v1/log/entries/{uuid}", timeout=20) as r:
        e = next(iter(json.loads(r.read()).values()))
    body = json.loads(base64.b64decode(e["body"]))
    return datetime.fromtimestamp(e["integratedTime"], timezone.utc), body["spec"]["data"]["hash"]["value"]


def check(doc: dict, mode: str, online: bool) -> int:
    terms, entries, keys = doc["terms"], doc["entries"], doc.get("chain_keys", {})
    problems, prev, late, unlogged = [], None, [], []
    for i, e in enumerate(entries):
        if e["seq"] != i:
            problems.append(f"#{i}: numbered {e['seq']}: an entry is missing or out of order")
        if (e.get("prev") or None) != prev:
            problems.append(f"#{i}: does not point at the hash of #{i - 1}")
        if i == 0 and e["kind"] != "terms":
            problems.append("#0 is not the terms")
        if mode == "client":
            body = json.loads(e["content"])
            if (body.get("seq"), body.get("kind"), body.get("target_day")) != (e["seq"], e["kind"], e["target_day"]):
                problems.append(f"#{i}: public label differs from what was hashed")
            s = b""
            if e["kind"] == "forecast":
                k = keys.get(e["target_day"][:7])
                if not k:
                    problems.append(f"#{i}: no chain key for {e['target_day'][:7]}")
                    prev = e["hash"]
                    continue
                s = salt(k, e["target_day"], e["seq"])
            pre = s + e["content"].encode() + (bytes.fromhex(prev) if prev else ZERO)
            if hashlib.sha256(pre).hexdigest() != e["hash"]:
                problems.append(f"#{i}: hash does not match its content")
        t = None
        if online and e["rekor"].get("uuid"):
            t, logged = rekor_record(e["rekor"]["uuid"])
            if logged != e["hash"]:
                problems.append(f"#{i}: Rekor holds a different hash for this entry")
        elif e["rekor"].get("integrated_time"):
            t = datetime.fromisoformat(e["rekor"]["integrated_time"])
        if e["kind"] == "forecast":
            if t is None:
                unlogged.append(e["seq"])
            elif t >= cutoff(e["target_day"], terms):
                late.append(e["seq"])
        prev = e["hash"]
    f = [e for e in entries if e["kind"] == "forecast"]
    days = sorted({e["target_day"] for e in f})
    print(f"Chain {doc.get('chain')}: {len(entries)} entries, {len(f)} forecasts for {len(days)} days "
          f"({days[0] if days else '-'} to {days[-1] if days else '-'}), start date {terms.get('start_date')}")
    print(f"Terms: {terms.get('quantity')} · cutoff {terms.get('cutoff_local')} Mexico City, "
          f"{terms.get('cutoff_days_before')} day(s) before · scoring: {terms.get('scoring')}")
    print(f"Forecasts logged in Rekor before the cutoff: {len(f) - len(late) - len(unlogged)} of {len(f)}"
          + (f" · late: {late}" if late else "") + (f" · not yet in Rekor: {unlogged}" if unlogged else ""))
    if mode == "client":
        print(f"Hashes recomputed from content and salts: {len(entries)}")
    for p in problems:
        print("PROBLEM", p)
    print("OK: the chain is intact." if not problems else f"FAILED: {len(problems)} problem(s).")
    return 0 if not problems else 1


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("public", "client"):
        print(__doc__)
        sys.exit(2)
    sys.exit(check(json.load(open(sys.argv[2], encoding="utf-8")), sys.argv[1], "--rekor" in sys.argv))
