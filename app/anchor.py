"""Bitcoin timestamps for forecast fingerprints, via OpenTimestamps (https://opentimestamps.org).

Each forecast's SHA-256 is sent to public OpenTimestamps calendars the moment it arrives. The calendars batch many
hashes into one Bitcoin transaction (free to us, no wallet). Within minutes we hold a "pending" proof; once the
transaction is in a block (usually within a few hours) the proof is upgraded to point at that Bitcoin block.

The resulting .ots file plus the forecast's canonical bytes let anyone check, without trusting Genau or the
calendars, that this exact forecast existed no later than that block:

    ots verify --file forecast.json forecast.json.ots     (or drop both files on https://opentimestamps.org)

Only the hash leaves Pantheon; the forecast itself is never published. Set PANTHEON_OTS=false to switch off.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

CALENDARS = [u.strip() for u in os.getenv("PANTHEON_OTS_CALENDARS",
             "https://alice.btc.calendar.opentimestamps.org,https://bob.btc.calendar.opentimestamps.org,"
             "https://finney.calendar.eternitywall.com").split(",") if u.strip()]
TIMEOUT = float(os.getenv("PANTHEON_OTS_TIMEOUT", "10"))


def enabled() -> bool:
    return os.getenv("PANTHEON_OTS", "true").lower() == "true"


@dataclass
class Proof:
    ots: bytes            # the .ots file
    status: str           # "pending" (calendar promise) or "bitcoin" (anchored in a block)
    block_height: int | None
    calendars: list[str]


def _serialize(ts) -> bytes:
    from opentimestamps.core.op import OpSHA256
    from opentimestamps.core.serialize import BytesSerializationContext
    from opentimestamps.core.timestamp import DetachedTimestampFile
    ctx = BytesSerializationContext()
    DetachedTimestampFile(OpSHA256(), ts).serialize(ctx)
    return ctx.getbytes()


def _deserialize(ots: bytes):
    from opentimestamps.core.serialize import BytesDeserializationContext
    from opentimestamps.core.timestamp import DetachedTimestampFile
    return DetachedTimestampFile.deserialize(BytesDeserializationContext(ots)).timestamp


def describe(ots: bytes) -> Proof:
    from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
    ts = _deserialize(ots)
    atts = [a for _, a in ts.all_attestations()]
    heights = [a.height for a in atts if isinstance(a, BitcoinBlockHeaderAttestation)]
    cals = sorted({a.uri for a in atts if isinstance(a, PendingAttestation)})
    return Proof(ots, "bitcoin" if heights else "pending", min(heights) if heights else None, cals)


def stamp(sha256_hex: str, calendar_factory=None) -> Proof:
    """Send the hash to the calendars. Succeeds if at least one accepts it."""
    from opentimestamps.calendar import RemoteCalendar
    from opentimestamps.core.timestamp import Timestamp
    make = calendar_factory or RemoteCalendar
    ts = Timestamp(bytes.fromhex(sha256_hex))
    errors = []
    for url in CALENDARS:
        try:
            ts.merge(make(url).submit(ts.msg, timeout=TIMEOUT))
        except Exception as e:  # one calendar down is fine; we use several
            errors.append(f"{url}: {e}")
    if not any(True for _ in ts.all_attestations()):
        raise RuntimeError("no calendar accepted the hash; " + "; ".join(errors))
    return describe(_serialize(ts))


def upgrade(ots: bytes, calendar_factory=None) -> Proof:
    """Ask each calendar whether its promise is now in a Bitcoin block; merge any answer into the proof."""
    from opentimestamps.calendar import RemoteCalendar
    from opentimestamps.core.notary import PendingAttestation
    make = calendar_factory or RemoteCalendar
    ts = _deserialize(ots)

    def walk(stamp):
        yield stamp
        for sub in stamp.ops.values():
            yield from walk(sub)

    for sub in list(walk(ts)):
        for att in list(sub.attestations):
            if isinstance(att, PendingAttestation):
                try:
                    sub.merge(make(att.uri).get_timestamp(sub.msg, timeout=TIMEOUT))
                except Exception:
                    pass  # not in a block yet, or calendar unreachable: try again later
    return describe(_serialize(ts))
