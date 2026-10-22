"""Víspera: a public, salted hash chain of forecasts, anchored in Bitcoin (OpenTimestamps) and Sigstore Rekor.

Keys (sealed, never public):
    month key  K_m   32 random bytes, one per calendar month of target days (12 a year), exportable for escrow
    chain key  C     = HMAC-SHA256(K_m, "chain|" + chain_id)
    salt       n_i   = HMAC-SHA256(C, "salt|" + target_day + "|" + seq)          (forecast entries only)

Entries (one chain per plant, zone or node; entry 0 = the terms):
    content_i  = canonical JSON of {"chain", "seq", "kind", "target_day", ...payload}
    s_i        = SHA-256( n_i ‖ content_i ‖ s_{i-1} )      n_i empty for clear entries; s_{-1} = 32 zero bytes
    kinds      terms (clear) · forecast (sealed) · actuals (clear)

Who checks what:
    anyone        sees every entry's hash, kind, target day and anchor times; counts the forecasts and checks each
                  anchor is earlier than the cutoff fixed in entry 0. Sees no forecast.
    client (NDA)  receives the whole chain from entry 0 to a date (all or nothing) with the forecasts and the chain
                  keys for those months; derives every salt, recomputes every hash, scores against the actuals.

Canonical JSON: keys sorted, no spaces, UTF-8 (json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import date, datetime, timedelta, timezone

ZERO = bytes(32)
REKOR_URL = os.getenv("PANTHEON_REKOR_URL", "https://rekor.sigstore.dev")


def canonical(obj: dict) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def chain_key(month_key: bytes, chain_id: str) -> bytes:
    return hmac.new(month_key, f"chain|{chain_id}".encode(), hashlib.sha256).digest()


def salt(chain_k: bytes, target_day: str, seq: int) -> bytes:
    return hmac.new(chain_k, f"salt|{target_day}|{seq}".encode(), hashlib.sha256).digest()


def preimage(salt_bytes: bytes, content: bytes, prev_hex: str | None) -> bytes:
    return salt_bytes + content + (bytes.fromhex(prev_hex) if prev_hex else ZERO)


def entry_hash(salt_bytes: bytes, content: bytes, prev_hex: str | None) -> str:
    return hashlib.sha256(preimage(salt_bytes, content, prev_hex)).hexdigest()


def month_of(day: str) -> str:
    return day[:7]


def cutoff_utc(target_day: str, terms: dict) -> datetime:
    """The deadline in entry 0: `cutoff_local` on the day `cutoff_days_before` the target day, Mexico City time
    (UTC−6 all year since 2022)."""
    d = date.fromisoformat(target_day) - timedelta(days=int(terms.get("cutoff_days_before", 1)))
    hh, mm = (int(x) for x in terms.get("cutoff_local", "10:00").split(":"))
    offset = int(terms.get("utc_offset_hours", -6))
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=timezone(timedelta(hours=offset))).astimezone(timezone.utc)


def verify_chain(entries: list[dict], chain_keys: dict[str, str] | None = None) -> dict:
    """Recompute every hash from entry 0. `entries` as disclosed (content as canonical string, prev, hash).
    Sealed entries need the chain key for their month (hex). Returns {"ok", "checked", "problems"}."""
    problems, prev = [], None
    for i, e in enumerate(entries):
        if e["seq"] != i:
            problems.append(f"entry {i}: sequence says {e['seq']}, so an entry is missing or out of order")
        if (e.get("prev") or None) != prev:
            problems.append(f"entry {i}: prev does not match the hash of entry {i - 1}")
        content = e["content"].encode()
        body = json.loads(e["content"])
        if body.get("seq") != e["seq"] or body.get("kind") != e["kind"] or body.get("target_day") != e.get("target_day"):
            problems.append(f"entry {i}: public label (kind, day or seq) differs from what was hashed")
        s = b""
        if e["kind"] == "forecast":
            ck = (chain_keys or {}).get(month_of(e["target_day"]))
            if not ck:
                problems.append(f"entry {i}: no chain key for {month_of(e['target_day'])}")
                prev = e["hash"]
                continue
            s = salt(bytes.fromhex(ck), e["target_day"], e["seq"])
        if entry_hash(s, content, prev) != e["hash"]:
            problems.append(f"entry {i}: hash does not match its content")
        prev = e["hash"]
    return {"ok": not problems, "checked": len(entries), "problems": problems}


# ---------- Sigstore Rekor ----------
def rekor_enabled() -> bool:
    return os.getenv("PANTHEON_REKOR", "true").lower() == "true"


def chain_signing_key(seed: bytes, chain_id: str):
    """One P-256 signing key per chain, derived from Genau's seed: same seed, same key, after any restart.
    Rekor indexes entries by public key, so everything ever logged for a chain can be listed by anyone."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551  # order of P-256
    d = int.from_bytes(hmac.new(seed, f"rekor-key|{chain_id}".encode(), hashlib.sha512).digest(), "big") % (n - 1) + 1
    key = ec.derive_private_key(d, ec.SECP256R1())
    pub = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    return key, pub


def private_pem(key) -> str:
    from cryptography.hazmat.primitives import serialization
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()


def rekor_submit(key, public_pem: str, pre: bytes, sha_hex: str, post=None) -> dict:
    """Log the entry's hash in Rekor as a hashedrekord signed by Pantheon's key. Rekor stamps integratedTime
    (seconds since 1970, UTC) from its own clock and returns an inclusion proof."""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec
    sig = key.sign(pre, ec.ECDSA(hashes.SHA256()))
    body = {"apiVersion": "0.0.1", "kind": "hashedrekord", "spec": {
        "signature": {"content": base64.b64encode(sig).decode(), "publicKey": {"content": base64.b64encode(public_pem.encode()).decode()}},
        "data": {"hash": {"algorithm": "sha256", "value": sha_hex}}}}
    if post is None:
        import urllib.request
        req = urllib.request.Request(REKOR_URL + "/api/v1/log/entries", data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=float(os.getenv("PANTHEON_REKOR_TIMEOUT", "15"))) as r:
            out = json.loads(r.read())
    else:
        out = post(body)
    uuid, e = next(iter(out.items()))
    return {"uuid": uuid, "log_index": e.get("logIndex"), "integrated_time": e.get("integratedTime"),
            "url": f"https://search.sigstore.dev/?logIndex={e.get('logIndex')}"}
