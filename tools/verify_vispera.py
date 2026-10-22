#!/usr/bin/env python3
"""Check a Víspera chain without trusting Genau. Python 3.9+, standard library only.

Anyone (public chain, no forecasts):
    python verify_vispera.py public  chain.json            # from GET /v1/vispera/chains/{id}
Client under NDA (disclosure with forecasts and chain keys):
    python verify_vispera.py client  disclosure.json       # from GET /v1/vispera/chains/{id}/disclosure
Options:
    --entry0 HASH   the entry-0 hash you recorded when you signed (or that is in your contract)
    --offline       skip Sigstore Rekor (not recommended: only Rekor catches a chain rebuilt after the fact)

What it checks
  public  entry 0 holds the terms (and matches --entry0); entries are numbered 0, 1, 2… with no gap and each points
          at the previous hash; Rekor holds the same hash for every entry, at a time Genau doesn't set; every forecast
          was logged before the deadline in entry 0; and Rekor has NO other entry signed with this chain's key
          (no second chain).
  client  all of the above, plus: derives every salt from the chain keys and recomputes every hash from its content;
          checks the public label (kind, day, number) is what was hashed; and that every forecast names the git commit
          of the code that ran and lists its inputs, all published and downloaded before the deadline.
For Bitcoin, download each entry's .ots and run `ots verify` or use opentimestamps.org.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone

ZERO = bytes(32)
REKOR = "https://rekor.sigstore.dev"


def salt(chain_key_hex: str, target_day: str, seq: int) -> bytes:
    return hmac.new(bytes.fromhex(chain_key_hex), f"salt|{target_day}|{seq}".encode(), hashlib.sha256).digest()


def cutoff(target_day: str, terms: dict) -> datetime:
    d = date.fromisoformat(target_day) - timedelta(days=int(terms.get("cutoff_days_before", 1)))
    hh, mm = (int(x) for x in terms.get("cutoff_local", "10:00").split(":"))
    tz = timezone(timedelta(hours=int(terms.get("utc_offset_hours", -6))))
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=tz).astimezone(timezone.utc)


def _json(url: str, body: dict | None = None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method="POST" if body else "GET",
                                 headers={"Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def rekor_record(uuid: str) -> tuple[datetime, str]:
    """Rekor's own time and the hash it holds for one entry."""
    e = next(iter(_json(f"{REKOR}/api/v1/log/entries/{uuid}").values()))
    body = json.loads(base64.b64decode(e["body"]))
    return datetime.fromtimestamp(e["integratedTime"], timezone.utc), body["spec"]["data"]["hash"]["value"]


def rekor_entries_for_key(public_pem: str) -> list[str]:
    """Every Rekor entry ever signed with this key, as Rekor's own index lists them."""
    return _json(f"{REKOR}/api/v1/index/retrieve",
                 {"publicKey": {"format": "x509", "content": base64.b64encode(public_pem.encode()).decode()}})


def check(doc: dict, mode: str, online: bool = True, entry0: str | None = None) -> int:
    terms, entries, keys = doc["terms"], doc["entries"], doc.get("chain_keys", {})
    problems, prev, late, unlogged, declared = [], None, [], [], 0
    if entry0 and (not entries or entries[0]["hash"] != entry0):
        problems.append("entry 0 is not the one you recorded: this is a different chain")
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
                c = cutoff(e["target_day"], terms)
                ok = bool(re.fullmatch(r"[0-9a-f]{40}", body.get("model_commit") or "")) and bool(body.get("model_repo"))
                ins = body.get("inputs") or []
                if not ok:
                    problems.append(f"#{i}: no git commit and repository for the code that ran")
                if not ins:
                    problems.append(f"#{i}: no inputs listed")
                for x in ins:
                    if not re.fullmatch(r"[0-9a-f]{64}", x.get("sha256", "")) or datetime.fromisoformat(x["as_of"]) >= c \
                            or datetime.fromisoformat(x["retrieved_at"]) >= c:
                        problems.append(f"#{i}: input '{x.get('source')}' is unfingerprinted or dated after the deadline")
                declared += int(ok and bool(ins))
            pre = s + e["content"].encode() + (bytes.fromhex(prev) if prev else ZERO)
            if hashlib.sha256(pre).hexdigest() != e["hash"]:
                problems.append(f"#{i}: hash does not match its content")
        t = None
        if online:
            if not e["rekor"].get("uuid"):
                problems.append(f"#{i}: not logged in Rekor")
            else:
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
    extra = []
    if online and terms.get("signing_key"):
        mine = {e["rekor"]["uuid"][-64:] for e in entries if e["rekor"].get("uuid")}
        extra = [u for u in rekor_entries_for_key(terms["signing_key"]) if u[-64:] not in mine]
        if extra:
            problems.append(f"Rekor holds {len(extra)} other entr{'y' if len(extra) == 1 else 'ies'} signed with this chain's key "
                            f"and missing from this chain (a second chain?): {', '.join(u[-12:] for u in extra[:5])}")
    f = [e for e in entries if e["kind"] == "forecast"]
    days = sorted({e["target_day"] for e in f})
    print(f"Chain {doc.get('chain')}: {len(entries)} entries, {len(f)} forecasts for {len(days)} days "
          f"({days[0] if days else '-'} to {days[-1] if days else '-'}), start date {terms.get('start_date')}, entry 0 {entries[0]['hash'][:12] if entries else '-'}")
    print(f"Terms: {terms.get('quantity')} · cutoff {terms.get('cutoff_local')} Mexico City, "
          f"{terms.get('cutoff_days_before')} day(s) before · scoring: {terms.get('scoring')}")
    print(f"Forecasts logged in Rekor before the cutoff: {len(f) - len(late) - len(unlogged)} of {len(f)}"
          + (f" · late: {late}" if late else "") + (f" · not yet in Rekor: {unlogged}" if unlogged else ""))
    if online:
        print(f"Rekor: every hash matches, and no other entry is signed with this chain's key" if not extra and not any("Rekor" in p for p in problems)
              else "Rekor: see problems below")
    else:
        print("Rekor: NOT checked (--offline). A chain rebuilt after the fact would pass.")
    if mode == "client":
        print(f"Hashes recomputed from content and salts: {len(entries)}")
        print(f"Forecasts naming their git commit and inputs, all before the deadline: {declared} of {len(f)}")
    for p in problems:
        print("PROBLEM", p)
    print("OK: the chain is intact." if not problems else f"FAILED: {len(problems)} problem(s).")
    return 0 if not problems else 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in ("public", "client"):
        print(__doc__)
        sys.exit(2)
    e0 = args[args.index("--entry0") + 1] if "--entry0" in args else None
    sys.exit(check(json.load(open(args[1], encoding="utf-8")), args[0], "--offline" not in args, e0))
