/* Genau revenue model, Mexico, 2027–2031. Pure calculation, no DOM.
   Every driver is an assumption the page lets you change. Units: USD unless noted; MW; years are calendar years.
   Revenue in a year = average volume in that year × price that year. Planning estimates, not contracted revenue. */
(function (root) {
  "use strict";

  var YEARS = [2027, 2028, 2029, 2030, 2031];

  var LINES = [
    { id: "bess", n: 1, en: "Battery optimization", es: "Optimización de baterías", color: "#F59E0B" },
    { id: "plants", n: 2, en: "Plant forecasting", es: "Pronóstico para plantas", color: "#3BA7FF" },
    { id: "critical", n: 3, en: "Critical-hour service", es: "Servicio de horas críticas", color: "#3DDC97" },
    { id: "traders", n: 4, en: "Supplier and trader forecasts", es: "Pronósticos para suministradores", color: "#A78BFA" },
    { id: "whitelabel", n: 5, en: "Factory batteries, white-label", es: "Baterías industriales, marca blanca", color: "#E8C547" },
    { id: "bank", n: 6, en: "Bankability and curves", es: "Bancabilidad y curvas", color: "#7CC4FF" },
    { id: "floors", n: 7, en: "Revenue floors", es: "Pisos de ingreso", color: "#F87171" },
    { id: "grid", n: 8, en: "Grid and distributed solar", es: "Red y solar distribuida", color: "#2DD4BF" },
    { id: "qenergy", n: 9, en: "Genau Mexico with QEnergy", es: "Genau México con QEnergy", color: "#94A3B8" }
  ];

  // Scenario multipliers: on adoption (penetration, shares, client counts), on prices, and on how much of the second call gets built.
  var SCENARIOS = {
    bear: { adopt: 0.6, price: 0.9, build: 0.6 },
    base: { adopt: 1, price: 1, build: 1 },
    bull: { adopt: 1.35, price: 1.1, build: 1.4 }
  };

  function defaults() {
    return {
      scenario: "base",
      fromYear: 2027, toYear: 2031,
      lines: { bess: true, plants: true, critical: true, traders: true, whitelabel: true, bank: true, floors: true, grid: true, qenergy: true },
      market: {
        gatePass: true,          // Feb 2027: CENACE publishes 2026 critical hours; our frozen forecasts are scored
        cfeRunsMixed: true,      // CFE operates the batteries of its mixed-scheme projects
        conv2GW: 4,              // generation selected in the second private call (GW); each carries 30% storage
        capPriceK: 231,          // capacity price, USD k per MW-year (2025 settlement: 4.4M MXN)
        priceEscalator: 0,       // % a year on our software prices (0 = flat 2026 prices, as in the plan)
        fx: 17.5                 // MXN per USD, for the MXN view
      },
      bess: {
        privateMW: [150, 900, 1500, 1800, 2000],  // first-call storage (≈1,040 MW) + standalone (e.g. Energía Firme 780 MW), average MW operating
        conv2Ramp: [0, 0, 0.3, 0.75, 1],          // share of second-call storage operating
        mixedMW: 1850, mixedRamp: [0, 0, 0.3, 0.7, 1], mixedShareIfOpen: 0.15,
        share: [0.10, 0.30, 0.33, 0.40, 0.41],    // our share of addressable battery MW
        arbitrageK: 70,          // energy arbitrage and price timing, USD k per MW-year
        capCredit: 0.35,         // share of the capacity price a battery captures
        spreadTrend: -2,         // % a year: spreads compress as storage grows
        feePct: 6.5,             // our fee, % of the battery's market revenue
        viaQEnergyPct: 15, qenergyCutPct: 20  // share of our battery MW that QEnergy brings, and its cut of our fee on those
      },
      plants: { addressableMW: [15000, 17000, 19000, 21500, 24000], pen: [0.01, 0.05, 0.09, 0.14, 0.16], priceK: 1.5 },
      critical: {
        users2026: 1437, growth: 8, pen: [0.005, 0.04, 0.08, 0.13, 0.17],
        pricing: "fixed",        // "fixed" fee per site, or "savings" share
        feeK: 15, cutMW: 0.5, hitRate: 0.8, savingsShare: 22.5
      },
      traders: { clients: [2, 5, 10, 15, 17], priceK: 150, maxFirms: 60 },
      whitelabel: { btmMW: [600, 1000, 1500, 2100, 2800], pen: [0.02, 0.08, 0.14, 0.19, 0.21], priceK: 17.5, tierK: 12, tierAboveMW: 100, partners: [1, 2, 3, 4, 5] },
      bank: { reports: [3, 8, 12, 15, 18], reportK: 60, subs: [2, 8, 14, 20, 24], subK: 50 },
      floors: { partnerYear: 2028, shareOfBess: [0, 0.05, 0.2, 0.28, 0.3], marginK: 8 },
      grid: { contractsM: [0, 0.25, 0.75, 1.5, 2.0] },
      qenergy: { bookGWh: 300, growth: 10, feePerMWh: 0.4, ramp: [0.5, 1, 1, 1, 1], acueductoMW: 13.8 },
      net: { ownershipPct: 90, bookedInJVPct: 100 },
      costs: { team: [5, 10, 16, 22, 28], costPerHeadK: 130, costEscalator: 4, infraPct: 6, salesPct: 5, otherM: [0.4, 0.8, 1.2, 1.6, 2.0] }
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    if (!over || typeof over !== "object") return base;
    Object.keys(over).forEach(function (k) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && typeof over[k] === "object" && !Array.isArray(over[k])) merge(base[k], over[k]);
      else if (k in base) base[k] = over[k];
    });
    return base;
  }

  // Shift an adoption array one year later (used when the Feb 2027 gate fails).
  function delay(arr) { return [0].concat(arr.slice(0, arr.length - 1)); }

  function run(input) {
    var a = merge(clone(defaults()), input || {});
    var sc = SCENARIOS[a.scenario] || SCENARIOS.base;
    var m = a.market;
    var gate = m.gatePass;
    var out = { years: YEARS.slice(), lines: {}, total: [], gross: [], net: [], costs: [], ebitda: [], bessMW: [], drivers: {} };

    function esc(i) { return Math.pow(1 + m.priceEscalator / 100, i) * sc.price; }
    function capAdopt(x) { return Math.max(0, Math.min(1, x)); }

    // ---- 1. Battery optimization
    var b = a.bess;
    var share = (gate ? b.share : delay(b.share).map(function (x) { return x * 0.8; }));
    var conv2Storage = m.conv2GW * 1000 * 0.30 * sc.build;
    var bessMW = [], bessRevPerMW = [], bessRev = [], bessQcut = [];
    YEARS.forEach(function (y, i) {
      var addressable = b.privateMW[i] + conv2Storage * b.conv2Ramp[i];
      var mixed = m.cfeRunsMixed ? 0 : b.mixedMW * b.mixedRamp[i] * b.mixedShareIfOpen;
      var mw = addressable * capAdopt(share[i] * sc.adopt) + mixed;
      var revPerMW = (b.arbitrageK + m.capPriceK * b.capCredit) * 1000 * Math.pow(1 + b.spreadTrend / 100, i);
      var rev = mw * revPerMW * b.feePct / 100;
      bessMW.push(mw); bessRevPerMW.push(revPerMW); bessRev.push(rev);
      bessQcut.push(rev * b.viaQEnergyPct / 100 * b.qenergyCutPct / 100);
    });
    out.bessMW = bessMW;
    out.lines.bess = bessRev;
    out.drivers.bess = YEARS.map(function (y, i) { return { volume: bessMW[i], unit: "MW", price: bessRevPerMW[i] * b.feePct / 100, priceUnit: "USD/MW" }; });

    // ---- 2. Plant forecasting (second-call plants add to the addressable base)
    var p = a.plants;
    out.lines.plants = YEARS.map(function (y, i) {
      var extra = (m.conv2GW - 4) * 1000 * sc.build * b.conv2Ramp[i];
      var mw = Math.max(0, p.addressableMW[i] + extra) * capAdopt(p.pen[i] * sc.adopt);
      (out.drivers.plants = out.drivers.plants || [])[i] = { volume: mw, unit: "MW", price: p.priceK * 1000 * esc(i), priceUnit: "USD/MW" };
      return mw * p.priceK * 1000 * esc(i);
    });

    // ---- 3. Critical-hour service (needs the live proof; delayed a year if the gate fails)
    var c = a.critical;
    var cpen = gate ? c.pen : delay(c.pen);
    out.lines.critical = YEARS.map(function (y, i) {
      var users = c.users2026 * Math.pow(1 + c.growth / 100, i + 1);
      var sites = users * capAdopt(cpen[i] * sc.adopt);
      var perSite = c.pricing === "savings"
        ? c.cutMW * m.capPriceK * 1000 * c.hitRate * c.savingsShare / 100
        : c.feeK * 1000 * esc(i);
      (out.drivers.critical = out.drivers.critical || [])[i] = { volume: sites, unit: "sites", price: perSite, priceUnit: "USD/site" };
      return sites * perSite;
    });

    // ---- 4. Supplier and trader forecasts
    var t = a.traders;
    out.lines.traders = YEARS.map(function (y, i) {
      var n = Math.min(t.maxFirms, t.clients[i] * sc.adopt);
      (out.drivers.traders = out.drivers.traders || [])[i] = { volume: n, unit: "firms", price: t.priceK * 1000 * esc(i), priceUnit: "USD/firm" };
      return n * t.priceK * 1000 * esc(i);
    });

    // ---- 5. White-label: price per MW with a lower rate above the tier, per partner
    var w = a.whitelabel;
    out.lines.whitelabel = YEARS.map(function (y, i) {
      var mw = w.btmMW[i] * capAdopt(w.pen[i] * sc.adopt);
      var partners = Math.max(1, w.partners[i]);
      var per = mw / partners;
      var hi = Math.min(per, w.tierAboveMW), lo = Math.max(0, per - w.tierAboveMW);
      var rev = partners * (hi * w.priceK + lo * w.tierK) * 1000 * esc(i);
      (out.drivers.whitelabel = out.drivers.whitelabel || [])[i] = { volume: mw, unit: "MW", price: mw ? rev / mw : 0, priceUnit: "USD/MW" };
      return rev;
    });

    // ---- 6. Bankability: reports and curve subscriptions
    var k = a.bank;
    out.lines.bank = YEARS.map(function (y, i) {
      var r = k.reports[i] * sc.adopt, s = k.subs[i] * sc.adopt;
      (out.drivers.bank = out.drivers.bank || [])[i] = { volume: r + s, unit: "reports + subs", price: (r + s) ? (r * k.reportK + s * k.subK) * 1000 * esc(i) / (r + s) : 0, priceUnit: "USD each" };
      return (r * k.reportK + s * k.subK) * 1000 * esc(i);
    });

    // ---- 7. Revenue floors: a share of our battery MW, once a balance-sheet partner is signed
    var f = a.floors;
    var fshare = gate ? f.shareOfBess : delay(f.shareOfBess);
    out.lines.floors = YEARS.map(function (y, i) {
      var on = f.partnerYear && y >= f.partnerYear;
      var mw = on ? bessMW[i] * fshare[i] : 0;
      (out.drivers.floors = out.drivers.floors || [])[i] = { volume: mw, unit: "MW", price: f.marginK * 1000 * esc(i), priceUnit: "USD/MW" };
      return mw * f.marginK * 1000 * esc(i);
    });

    // ---- 8. Grid and distributed-solar forecasting: public contracts
    out.lines.grid = YEARS.map(function (y, i) {
      (out.drivers.grid = out.drivers.grid || [])[i] = { volume: a.grid.contractsM[i], unit: "USD M of contracts", price: null };
      return a.grid.contractsM[i] * 1e6 * sc.adopt;
    });

    // ---- 9. Genau Mexico with QEnergy: PPA-book forecasts + Acueducto optimization
    var q = a.qenergy;
    out.lines.qenergy = YEARS.map(function (y, i) {
      var gwh = q.bookGWh * Math.pow(1 + q.growth / 100, i + 1);
      var book = gwh * 1000 * q.feePerMWh * q.ramp[i] * esc(i);
      var acu = q.acueductoMW * bessRevPerMW[i] * b.feePct / 100 * (i === 0 ? 0.5 : 1);
      (out.drivers.qenergy = out.drivers.qenergy || [])[i] = { volume: gwh, unit: "GWh", price: q.feePerMWh, priceUnit: "USD/MWh" };
      return book + acu;
    });

    // ---- Totals, net to Genau, costs
    var co = a.costs;
    YEARS.forEach(function (y, i) {
      var tot = 0;
      LINES.forEach(function (L) { if (a.lines[L.id]) tot += out.lines[L.id][i]; });
      var cut = a.lines.bess ? bessQcut[i] : 0;
      var jv = (tot - cut) * a.net.bookedInJVPct / 100;
      var net = (tot - cut) - jv * (1 - a.net.ownershipPct / 100);
      var cost = co.team[i] * co.costPerHeadK * 1000 * Math.pow(1 + co.costEscalator / 100, i) + (co.otherM ? co.otherM[i] * 1e6 : 0) + tot * (co.infraPct + co.salesPct) / 100;
      out.total.push(tot); out.gross.push(tot); out.net.push(net); out.costs.push(cost); out.ebitda.push(tot - cost);
    });
    out.assumptions = a;
    return out;
  }

  var api = { YEARS: YEARS, LINES: LINES, SCENARIOS: SCENARIOS, defaults: defaults, run: run, merge: merge };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PantheonModel = api;
})(this);
