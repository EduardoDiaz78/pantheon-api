"""Storage for the QEnergy offer files: forecasts posted by the Pantheon engine and the results used for settlement.

SQLite, so forecasts survive between requests. Set PANTHEON_DB to a file on a persistent disk in production
(on Render's free plan the file is wiped when the service restarts or sleeps). Default: a file next to the app.
Every posted forecast is kept as a new version with its SHA-256 and the time it arrived (the Víspera record).
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import threading
from datetime import date, datetime, timedelta, timezone

# Plants QEnergy represents. Codes come from José Antonio's templates.
SITES: dict[str, dict] = {
    "atotonilco": {"id": "atotonilco", "name": "Atotonilco", "central": "01GTT", "unidad": "01GTT-EX1",
                   "centro_carga": "AXC0611GTT79", "market_participant": "QEnergy"},
}

# Hourly sales profile from José Antonio's sample file (16 Oct 2026), hours 1–24, MW.
SAMPLE_SELL = [0, 0, 0, 0, 0, 0, 0.00051125, 0.009182375, 0.01526275, 0.022855625, 0.033017625, 0.074724375,
               0.09212275, 0.099948625, 0.09028125, 0.041162625, 0.01661775, 0.009006625, 0.001615, 0.173631375,
               0.173273625, 0.0100795, 0, 0]


def canonical(payload: dict) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


class QStore:
    def __init__(self, path: str | None = None, sample: bool | None = None) -> None:
        self.path = path or os.getenv("PANTHEON_DB", os.path.join(os.path.dirname(__file__), "..", "pantheon.db"))
        self.lock = threading.Lock()
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS forecasts (id INTEGER PRIMARY KEY AUTOINCREMENT, site TEXT, day TEXT, payload TEXT,
              sha256 TEXT, received_at TEXT, posted_by TEXT, model_version TEXT, sample INTEGER DEFAULT 0);
            CREATE INDEX IF NOT EXISTS fc_site_day ON forecasts(site, day);
            CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT, site TEXT, day TEXT, payload TEXT,
              received_at TEXT, posted_by TEXT, sample INTEGER DEFAULT 0);
            CREATE INDEX IF NOT EXISTS rs_site_day ON results(site, day);
        """)
        if sample is None:
            sample = os.getenv("PANTHEON_QENERGY_SAMPLE", "true").lower() == "true"
        if sample and not self.db.execute("SELECT 1 FROM forecasts LIMIT 1").fetchone():
            self._seed()

    # ---------- forecasts ----------
    def put_forecast(self, site: str, day: date, payload: dict, posted_by: str, model_version: str, sample: bool = False) -> dict:
        # The fingerprint covers what was forecast AND for which plant, day and model, so none can be swapped later.
        body = canonical({"site": site, "day": day.isoformat(), "model_version": model_version, "hours": payload["hours"]})
        sha = hashlib.sha256(body.encode()).hexdigest()
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self.lock:
            cur = self.db.execute("INSERT INTO forecasts(site, day, payload, sha256, received_at, posted_by, model_version, sample) VALUES (?,?,?,?,?,?,?,?)",
                                  (site, day.isoformat(), body, sha, now, posted_by, model_version, int(sample)))
            self.db.commit()
            version = self.db.execute("SELECT COUNT(*) FROM forecasts WHERE site=? AND day=? AND id<=?", (site, day.isoformat(), cur.lastrowid)).fetchone()[0]
        return {"site": site, "day": day.isoformat(), "version": version, "sha256": sha, "received_at": now, "model_version": model_version, "sample": sample}

    def forecast(self, site: str, day: date) -> dict | None:
        r = self.db.execute("SELECT * FROM forecasts WHERE site=? AND day=? ORDER BY id DESC LIMIT 1", (site, day.isoformat())).fetchone()
        if not r:
            return None
        version = self.db.execute("SELECT COUNT(*) FROM forecasts WHERE site=? AND day=?", (site, day.isoformat())).fetchone()[0]
        return {"site": site, "day": r["day"], "version": version, "sha256": r["sha256"], "received_at": r["received_at"],
                "posted_by": r["posted_by"], "model_version": r["model_version"], "sample": bool(r["sample"]),
                "payload": {"hours": json.loads(r["payload"])["hours"]}, "canonical": r["payload"]}

    def forecast_days(self, site: str) -> list[dict]:
        rows = self.db.execute("""SELECT day, COUNT(*) n, MAX(received_at) last, MAX(sample) sample FROM forecasts WHERE site=?
                                  GROUP BY day ORDER BY day DESC""", (site,)).fetchall()
        return [{"day": r["day"], "versions": r["n"], "last_received_at": r["last"], "sample": bool(r["sample"])} for r in rows]

    def history(self, site: str, day: date) -> list[dict]:
        rows = self.db.execute("SELECT sha256, received_at, posted_by, model_version FROM forecasts WHERE site=? AND day=? ORDER BY id",
                               (site, day.isoformat())).fetchall()
        return [{"version": i + 1, **dict(r)} for i, r in enumerate(rows)]

    # ---------- results (cleared, metered, prices) ----------
    def put_results(self, site: str, day: date, payload: dict, posted_by: str, sample: bool = False) -> None:
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self.lock:
            self.db.execute("INSERT INTO results(site, day, payload, received_at, posted_by, sample) VALUES (?,?,?,?,?,?)",
                            (site, day.isoformat(), canonical(payload), now, posted_by, int(sample)))
            self.db.commit()

    def results_month(self, site: str, month: str) -> dict[str, dict]:
        rows = self.db.execute("""SELECT r.day, r.payload FROM results r JOIN (SELECT day, MAX(id) mid FROM results WHERE site=? AND day LIKE ? GROUP BY day) m
                                  ON r.id = m.mid ORDER BY r.day""", (site, month + "-%")).fetchall()
        return {r["day"]: json.loads(r["payload"]) for r in rows}

    # ---------- sample data so the page works before the engine is connected ----------
    def _seed(self) -> None:
        start = date(2026, 10, 12)
        for k in range(7):
            d = start + timedelta(days=k)
            scale = 1 + 0.06 * ((k * 37) % 5 - 2) / 2
            hours = [{"hour": h + 1, "sell_mw": round(SAMPLE_SELL[h] * scale, 6), "sell_price": 0,
                      "buy_fixed_mw": 0, "buy_segments": []} for h in range(24)]
            self.put_forecast("atotonilco", d, {"hours": hours}, posted_by="sample", model_version="sample", sample=True)
            if d <= date(2026, 10, 16):
                res = []
                for h in range(24):
                    mda = 1450 + 900 * (1 if 18 <= h <= 21 else 0) + 120 * ((h * 7 + k) % 5)
                    mtr = mda + 180 * (((h * 13 + k * 3) % 7) - 3)
                    cleared = hours[h]["sell_mw"]
                    measured = round(cleared * (1 + 0.05 * (((h * 5 + k) % 9) - 4)), 6)
                    res.append({"hour": h + 1, "cleared_mw": cleared, "measured_mwh": measured, "pml_mda": mda, "pml_mtr": mtr})
                self.put_results("atotonilco", d, {"hours": res}, posted_by="sample", sample=True)
