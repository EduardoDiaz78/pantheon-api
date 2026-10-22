"""Storage for the Víspera chains (see vispera.py). Mixed into QStore so it shares the SQLite file and lock."""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone

from . import vispera as V

SCHEMA = """
CREATE TABLE IF NOT EXISTS vkeys (month TEXT PRIMARY KEY, key BLOB, created_at TEXT, released_at TEXT);
CREATE TABLE IF NOT EXISTS vsettings (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS chains (id TEXT PRIMARY KEY, terms TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, chain TEXT, seq INTEGER, kind TEXT, target_day TEXT,
  content TEXT, prev TEXT, hash TEXT, recorded_at TEXT, forecast_id INTEGER,
  ots BLOB, ots_status TEXT, block_height INTEGER, ots_error TEXT,
  rekor_uuid TEXT, rekor_index INTEGER, rekor_time INTEGER, rekor_error TEXT, checked_at TEXT,
  UNIQUE(chain, seq));
CREATE INDEX IF NOT EXISTS en_forecast ON entries(forecast_id);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class ChainStore:
    db: object
    lock: object

    def _init_chains(self) -> None:
        self.db.executescript(SCHEMA)

    # ---------- keys ----------
    def month_key(self, month: str) -> bytes:
        """Random 32-byte key for a month of target days, made on first use and never changed."""
        r = self.db.execute("SELECT key FROM vkeys WHERE month=?", (month,)).fetchone()
        if r:
            return bytes(r["key"])
        k = secrets.token_bytes(32)
        self.db.execute("INSERT OR IGNORE INTO vkeys(month, key, created_at) VALUES (?,?,?)", (month, k, _now()))
        self.db.commit()
        return bytes(self.db.execute("SELECT key FROM vkeys WHERE month=?", (month,)).fetchone()["key"])

    def month_keys(self, mark_released: bool = False) -> list[dict]:
        rows = self.db.execute("SELECT month, key, created_at, released_at FROM vkeys ORDER BY month").fetchall()
        if mark_released:
            with self.lock:
                self.db.execute("UPDATE vkeys SET released_at=? WHERE released_at IS NULL", (_now(),))
                self.db.commit()
        return [{"month": r["month"], "key": bytes(r["key"]).hex(), "created_at": r["created_at"], "released_at": r["released_at"]} for r in rows]

    def setting(self, k: str) -> str | None:
        r = self.db.execute("SELECT v FROM vsettings WHERE k=?", (k,)).fetchone()
        return r["v"] if r else None

    def set_setting(self, k: str, v: str) -> None:
        with self.lock:
            self.db.execute("INSERT OR REPLACE INTO vsettings(k, v) VALUES (?,?)", (k, v))
            self.db.commit()

    def seed(self) -> bytes:
        """PANTHEON_REKOR_SEED (hex, set on the host) or, for tests and local runs only, a stored random one."""
        import os
        if os.getenv("PANTHEON_REKOR_SEED"):
            return bytes.fromhex(os.environ["PANTHEON_REKOR_SEED"])
        s = self.setting("rekor_seed")
        if not s:
            s = secrets.token_hex(32)
            self.set_setting("rekor_seed", s)
        return bytes.fromhex(s)

    def signing_key(self, chain_id: str):
        return V.chain_signing_key(self.seed(), chain_id)

    # ---------- chains ----------
    def chain(self, chain_id: str) -> dict | None:
        r = self.db.execute("SELECT * FROM chains WHERE id=?", (chain_id,)).fetchone()
        return {"id": r["id"], "terms": json.loads(r["terms"]), "created_at": r["created_at"]} if r else None

    def chains(self) -> list[dict]:
        rows = self.db.execute("""SELECT c.id, c.terms, c.created_at, COUNT(e.id) n, SUM(e.kind='forecast') nf, MAX(e.seq) last
                                  FROM chains c LEFT JOIN entries e ON e.chain = c.id GROUP BY c.id ORDER BY c.id""").fetchall()
        out = []
        for r in rows:
            head = self.db.execute("SELECT hash, recorded_at FROM entries WHERE chain=? ORDER BY seq DESC LIMIT 1", (r["id"],)).fetchone()
            out.append({"id": r["id"], "terms": json.loads(r["terms"]), "created_at": r["created_at"], "length": r["n"],
                        "forecasts": r["nf"] or 0, "head": head["hash"] if head else None, "last_recorded_at": head["recorded_at"] if head else None})
        return out

    def create_chain(self, chain_id: str, terms: dict, at: str | None = None) -> dict:
        with self.lock:
            if self.db.execute("SELECT 1 FROM chains WHERE id=?", (chain_id,)).fetchone():
                raise ValueError("chain exists")
            self.db.execute("INSERT INTO chains(id, terms, created_at) VALUES (?,?,?)", (chain_id, V.canonical(terms).decode(), _now()))
            self.db.commit()
        return self.append(chain_id, "terms", terms["start_date"], {"terms": terms}, at=at)

    def append(self, chain_id: str, kind: str, target_day: str, payload: dict, forecast_id: int | None = None, at: str | None = None) -> dict:
        """Add one entry. Forecasts are salted (sealed); terms and actuals are clear."""
        with self.lock:
            last = self.db.execute("SELECT seq, hash FROM entries WHERE chain=? ORDER BY seq DESC LIMIT 1", (chain_id,)).fetchone()
            seq, prev = (last["seq"] + 1, last["hash"]) if last else (0, None)
            recorded = at or _now()  # `at` only for the demo chain
            content = V.canonical({"chain": chain_id, "seq": seq, "kind": kind, "target_day": target_day, "recorded_at": recorded, **payload})
            s = V.salt(V.chain_key(self.month_key(V.month_of(target_day)), chain_id), target_day, seq) if kind == "forecast" else b""
            h = V.entry_hash(s, content, prev)
            cur = self.db.execute("""INSERT INTO entries(chain, seq, kind, target_day, content, prev, hash, recorded_at, forecast_id)
                                     VALUES (?,?,?,?,?,?,?,?,?)""", (chain_id, seq, kind, target_day, content.decode(), prev, h, recorded, forecast_id))
            self.db.commit()
        return self.entry(cur.lastrowid)

    def entry(self, entry_id: int) -> dict | None:
        r = self.db.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
        return dict(r) if r else None

    def entry_for_forecast(self, forecast_id: int) -> dict | None:
        r = self.db.execute("SELECT * FROM entries WHERE forecast_id=?", (forecast_id,)).fetchone()
        return dict(r) if r else None

    def entries(self, chain_id: str) -> list[dict]:
        return [dict(r) for r in self.db.execute("SELECT * FROM entries WHERE chain=? ORDER BY seq", (chain_id,)).fetchall()]

    def preimage_of(self, e: dict) -> bytes:
        s = b""
        if e["kind"] == "forecast":
            s = V.salt(V.chain_key(self.month_key(V.month_of(e["target_day"])), e["chain"]), e["target_day"], e["seq"])
        return V.preimage(s, e["content"].encode(), e["prev"])

    def set_entry(self, entry_id: int, **fields) -> None:
        fields["checked_at"] = _now()
        cols = ", ".join(f"{k}=?" for k in fields)
        with self.lock:
            self.db.execute(f"UPDATE entries SET {cols} WHERE id=?", (*fields.values(), entry_id))
            self.db.commit()

    def unfinished_entries(self) -> list[dict]:
        rows = self.db.execute("""SELECT * FROM entries WHERE (ots_status IS NULL OR ots_status != 'bitcoin' OR rekor_uuid IS NULL)
                                  AND chain NOT LIKE 'demo-%' ORDER BY id""").fetchall()
        return [dict(r) for r in rows]


# ---------- demo chain: sample data, simulated clocks, never sent to Rekor or Bitcoin ----------
DEMO_ID = "demo-atotonilco"


def seed_demo_chain(store, sell: list[float]) -> None:
    import hashlib
    from datetime import date, datetime, timedelta, timezone
    if store.chain(DEMO_ID):
        return
    mx = timezone(timedelta(hours=-6))
    iso = lambda d: d.astimezone(timezone.utc).isoformat(timespec="seconds")
    key, pub = store.signing_key(DEMO_ID)
    terms = {"chain": DEMO_ID, "demo": True, "subject": {"site": "atotonilco", "central": "01GTT", "unidad": "01GTT-EX1"},
             "market": "MDA", "quantity": "hourly sales offer, MW", "horizon": "D+1, 24 hours", "cutoff_local": "10:00",
             "cutoff_days_before": 1, "utc_offset_hours": -6, "start_date": "2026-10-15",
             "scoring": "MAE of offered vs metered MWh per hour, every day from the start date; missing days count as zero offer",
             "actuals_source": "CENACE, PML MDA and MTR", "signing_key": pub,
             "one_chain_rule": "Demo chain: sample data with simulated Rekor and Bitcoin times. Nothing here is logged publicly."}
    log = []
    t0 = datetime(2026, 10, 13, 12, 4, tzinfo=mx)
    log.append((store.create_chain(DEMO_ID, terms, at=iso(t0)), t0))
    def fc(k, d, rev=False):
        prev = d - timedelta(days=1)
        ins = [{"source": src, "as_of": a, "retrieved_at": f"{prev}T06:4{j}:00-06:00", "sha256": hashlib.sha256(f"{src}{d}".encode()).hexdigest()}
               for j, (src, a) in enumerate([("CENACE PML MDA, nodo 01GTT", f"{prev - timedelta(days=1)}T17:00:00-06:00"),
                                             ("GFS 0.25 deg, run 00Z", f"{prev}T00:00:00+00:00"),
                                             ("Plant SCADA, Atotonilco", f"{prev}T06:30:00-06:00")])]
        commit = ("41be07d" if rev else "3f9c2a1") + hashlib.sha1(str(rev).encode()).hexdigest()[7:]
        return {"site": "atotonilco", "model_version": "pantheon@" + commit[:7], "model_commit": commit,
                "model_repo": "github.com/genau-ai/pantheon-engine", "inputs": ins,
                "hours": [{"hour": h + 1, "sell_mw": round(sell[h] * (1 + 0.03 * ((k * 7 + h) % 5 - 2)) * (1.08 if rev else 1), 4),
                           "sell_price": 0, "buy_fixed_mw": 0, "buy_segments": []} for h in range(24)]}
    for k in range(8):
        d = date(2026, 10, 15) + timedelta(days=k)
        t = datetime(d.year, d.month, d.day, 8, 2, tzinfo=mx) - timedelta(days=1)
        log.append((store.append(DEMO_ID, "forecast", d.isoformat(), fc(k, d), at=iso(t)), t))
        if d == date(2026, 10, 20):  # a revision after the 10:00 deadline: kept, marked late, never counted
            t = datetime(2026, 10, 19, 11, 47, tzinfo=mx)
            log.append((store.append(DEMO_ID, "forecast", d.isoformat(), fc(k, d, rev=True), at=iso(t)), t))
        pd = d - timedelta(days=2)
        if pd >= date(2026, 10, 15):
            t = datetime(d.year, d.month, d.day, 18, 31, tzinfo=mx) - timedelta(days=1)
            prices = [{"hour": h + 1, "pml_mda": 1450 + 900 * (18 <= h <= 21) + 37 * ((h * 7 + k) % 5), "pml_mtr": 1500 + 41 * ((h * 3 + k) % 7)} for h in range(24)]
            log.append((store.append(DEMO_ID, "actuals", pd.isoformat(), {"site": "atotonilco", "source": "CENACE", "vintage": f"MDA {pd} v1",
                                                                      "retrieved_at": t.isoformat(), "prices": prices}, at=iso(t)), t))
    for e, t in log:  # simulated clocks: Rekor 2 s after recording; Bitcoin confirmed for entries older than 19 Oct
        btc = t < datetime(2026, 10, 19, tzinfo=mx)
        store.set_entry(e["id"], rekor_uuid="demo", rekor_index=None, rekor_time=int(t.timestamp()) + 2,
                        ots_status="bitcoin" if btc else "pending", block_height=None)
