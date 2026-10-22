/* Pantheon demo website. Plain JavaScript, no build step.
   It talks to the Pantheon API at PANTHEON_CONFIG.apiBase using the public demo keys. Sample data only. */
(function () {
  "use strict";

  var API = ((window.PANTHEON_CONFIG && window.PANTHEON_CONFIG.apiBase) || "").replace(/\/+$/, "");
  var app = document.getElementById("app");

  // ---------- People you can sign in as (public demo keys) ----------
  var PEOPLE = [
    { key: "demo-operator", name: "Daniela", role: "operator" },
    { key: "demo-manager", name: "Mauricio", role: "asset_manager" },
    { key: "demo-viewer", name: "Lucía", role: "viewer" },
    { key: "demo-auditor", name: "Andrés", role: "auditor" },
    { key: "demo-admin", name: "Genau", role: "admin" },
    { key: "demo-qenergy", name: "José Antonio", role: "partner" },
    { key: "demo-client", name: "Bank analyst", role: "client" }
  ];

  // ---------- Interface words (the API translates its own messages) ----------
  var T = {
    en: {
      signin_title: "See Pantheon as one of the team",
      signin_lede: "This is a working demo on sample data. Pick a person to see what their role can do.",
      role_operator: "Operator", role_asset_manager: "Asset manager", role_viewer: "Viewer", role_auditor: "Lender’s advisor (auditor)", role_admin: "Admin",
      role_operator_d: "Reviews and approves tomorrow’s plan, handles incidents.",
      role_asset_manager_d: "Signs off plans that go past a battery limit, files disputes.",
      role_viewer_d: "Reads plans, settlement and alerts. Can’t change anything.",
      role_auditor_d: "Reads everything, plus the audit log and the raw forecast file.",
      language: "Language", sample: "SAMPLE DATA", switch_person: "Switch person",
      nav_home: "Home", nav_today: "Tomorrow’s offer", nav_alerts: "Alerts", nav_settlement: "Settlement", nav_fleet: "Fleet", nav_audit: "Audit log",
      good_morning: "Good morning", needs_you: "Needs you now", nothing_needed: "Nothing needs you right now.",
      yesterday: "Yesterday’s energy margin", vs_plan: "vs plan", crit_hours_yday: "Likely critical hours covered yesterday", open_alerts: "Open alerts",
      min_left: "min left", open: "Open",
      plan_for: "Offer for", deadline: "[TRADER] submits by", status_draft: "Draft, not yet approved", status_approved: "Approved", status_missed: "Deadline passed",
      energy_margin: "Energy margin", after: "after charging and battery wear", cycles: "Battery cycles", crit_covered: "Likely critical hours covered",
      capacity: "Capacity value", projection: "Projection", capacity_amount: "Shown as a figure once verified against CENACE settlement.",
      available_mw: "MW available in flagged hours",
      strategies: "Choose a strategy", within: "Within limits", needs_signoff: "Needs an asset manager’s sign-off",
      chart_title: "Tomorrow, hour by hour", lg_dis: "Battery discharges", lg_chg: "Battery charges", lg_price: "Price forecast (MXN/MWh)", lg_crit: "Likely critical hour",
      likely_title: "Likely critical hours", likely_lede: "CENACE publishes the year\u2019s critical hours once, around February. Until then Pantheon shows the chance for each hour and flags it at 50% or more.",
      planned: "Planned", discharge: "Discharge", charge: "Charge", idle: "Idle",
      schedule: "What the battery will do", why: "Why this plan",
      approve: "Approve offer · [TRADER] submits by 10:00", approve_title: "Approve tomorrow’s offer", approve_lede: "Once approved the offer is locked. Pantheon does not submit to CENACE or control the battery: [TRADER] submits this self-schedule to the day-ahead market by 10:00, CENACE clears and dispatches it.",
      note: "Note for the log (optional)", cancel: "Cancel", confirm: "Approve and lock", ack: "I’ve reviewed the limits this plan goes past and sign it off.",
      read_only: "Your role can read this plan but not approve it.", approved_by: "Approved by", download_offer: "Download offer file (CSV)",
      approved_toast: "Offer approved and locked.", feeds: "Data feeds", live: "live", stale: "stale", delayed: "delayed", min_ago: "min ago",
      alerts_title: "Alerts", resolved: "Resolved", decide: "Decide", keep_plan: "Keep the plan", hold_battery: "Hold the battery", acknowledge: "Acknowledge",
      decided_toast: "Decision recorded in the audit log.",
      settlement_title: "Settlement, October 2026", settled: "Settled so far", expected: "Expected on settled days", difference: "Difference",
      in_review: "days flagged for review", day: "Day", status: "Status", s_matched: "Matched", s_review: "Review", s_awaiting_statement: "Awaiting statement", s_disputed: "Disputed",
      dispute: "File dispute", dispute_title: "File a dispute", dispute_reason: "What looks wrong?", dispute_default: "Settled amount is below plan; please check metering and prices for this day.",
      submit: "Submit", dispute_toast: "Dispute opened and logged.", waterfall: "From revenue to net", pending: "Pending",
      fleet_title: "Fleet", st_discharging: "Discharging", st_charging: "Charging", st_holding: "Holding", st_maintenance: "Maintenance", st_onboarding: "Onboarding",
      battery: "Battery", solar: "Solar", charge_now: "charge",
      audit_title: "Audit log", audit_lede: "Every approval, override, decision and dispute, newest first. Nothing can be edited or removed.",
      when: "When", who: "Who", what: "What", detail: "Detail", no_access: "Your role can’t see this page.",
      reset: "Reset demo data", reset_done: "Demo data reset.", footer: "Pantheon demo · sample data, not real plant data",
      err_network: "Can’t reach the demo server. Check the address in config.js, or wait a minute if it is waking up.",
      nav_yesterday: "Yesterday", see_replay: "See yesterday, replayed",
      y_eyebrow: "Daily replay", y_title: "Did Pantheon earn its fee yesterday?", y_added: "Added vs doing nothing", y_after: "After charging cost and battery wear",
      y_plan: "The plan expected", y_on_day: "on the day", y_crit: "Likely critical hours covered", y_crit_ctx: "final count when CENACE publishes the year\u2019s list (~Feb)", y_fee: "Pantheon fee for the day", y_fee_v: "[YOUR FEE]",
      y_replay: "Replay, hour by hour", y_play: "Play the day", y_pause: "Pause", y_hour: "Hour", y_planned: "Planned", y_discharged: "Discharged", y_charged: "Charged from solar",
      y_gained: "Gained vs doing nothing", y_crit_lg: "Likely critical hour (\u2265 50%)", y_fc: "Price forecast", y_ac: "Price actual", y_pm: "Battery planned", y_am: "Battery actual",
      y_this: "This hour", y_run: "Running total vs doing nothing", y_why: "Why it differs from the plan", y_vs_plan: "Against the plan", y_idle: "Idle", y_critical: "LIKELY CRITICAL",
      y_idle_story: "Battery idle. The plant’s solar went straight to the grid, same as doing nothing.",
      y_story_charge: "Charging {mw} MW from solar that would have sold for {p} MXN/MWh.", y_story_dis: "Discharging {mw} MW at {p} MXN/MWh (forecast {f}).",
      y_story_short: " Planned {pm} MW.", y_story_crit: " Pantheon had rated this hour likely critical ({p}%).",
      wa_preview: "Preview the WhatsApp message", wa_title: "Pantheon on WhatsApp", wa_sub: "Business account", wa_sent: "The morning message, as sent to {to}.",
      wa_none: "No verified WhatsApp number for your role in this demo. Sign in as Daniela or Mauricio.", wa_signoff: "This plan needs a sign-off, so it can only be approved in Pantheon.", close: "Close",
      retry: "Try again", back_home: "Back to home",
      strat_conservative: "Conservative", strat_balanced: "Balanced", strat_aggressive: "Aggressive",
      feed_cenace_prices: "CENACE prices", feed_site_telemetry: "plant telemetry", feed_weather: "weather",
      lc_title: "Where tomorrow’s offer is", lc_offered: "Offered", lc_submitted: "Submitted", lc_cleared: "Cleared", lc_dispatched: "Dispatched", lc_measured: "Measured", lc_settled: "Settled",
      lc_not_yet: "Not yet approved", lc_offered_d: "Approved in Pantheon, waiting for [TRADER] to submit", lc_submitted_d: "Submitted by {by} · ref. {ref}", lc_cleared_d: "CENACE cleared it as offered", lc_cleared_dev: "CENACE cleared it with {n} deviation(s) · {mxn} MXN",
      lc_later: "tomorrow", lc_help: "Pantheon never submits to CENACE or controls the battery.",
      model_banner: "No EMS reading in the last 5 minutes. The battery state is modelled (about {soc}%, ±6). Approving needs an asset manager’s sign-off.",
      model_ack: "I know the battery state is modelled, not measured, and I sign off this offer.",
      y_sources: "Sources", y_src_dispatched: "dispatched", y_src_measured: "measured", y_src_prices: "prices", y_src_cleared: "cleared", y_src_settlement: "settlement",
      y_cleared: "CENACE cleared", y_story_cleared: " CENACE cleared {c} MW for this hour (offered {p}).",
      plan_approved: "plan approved"
    },
    es: {
      signin_title: "Conoce Pantheon como parte del equipo",
      signin_lede: "Es una demo funcional con datos de ejemplo. Elige una persona para ver qué puede hacer su rol.",
      role_operator: "Operadora", role_asset_manager: "Gerente de activos", role_viewer: "Consulta", role_auditor: "Asesor del banco (auditor)", role_admin: "Administrador",
      role_operator_d: "Revisa y aprueba el plan de mañana y atiende incidentes.",
      role_asset_manager_d: "Autoriza planes que rebasan un límite de la batería y abre disputas.",
      role_viewer_d: "Consulta planes, liquidación y alertas. No puede cambiar nada.",
      role_auditor_d: "Consulta todo, además de la bitácora y el archivo de pronóstico.",
      language: "Idioma", sample: "DATOS DE EJEMPLO", switch_person: "Cambiar persona",
      nav_home: "Inicio", nav_today: "Oferta de mañana", nav_alerts: "Alertas", nav_settlement: "Liquidación", nav_fleet: "Flota", nav_audit: "Bitácora",
      good_morning: "Buenos días", needs_you: "Requiere tu atención", nothing_needed: "Nada requiere tu atención ahora.",
      yesterday: "Margen de energía de ayer", vs_plan: "vs plan", crit_hours_yday: "Horas probablemente críticas cubiertas ayer", open_alerts: "Alertas abiertas",
      min_left: "min restantes", open: "Abrir",
      plan_for: "Oferta para", deadline: "[TRADER] la presenta antes de", status_draft: "Borrador, sin aprobar", status_approved: "Aprobado", status_missed: "Cierre vencido",
      energy_margin: "Margen de energía", after: "después de carga y desgaste", cycles: "Ciclos de batería", crit_covered: "Horas críticas probables cubiertas",
      capacity: "Valor de capacidad", projection: "Proyección", capacity_amount: "Se muestra como cifra al verificarse con la liquidación del CENACE.",
      available_mw: "MW disponibles en horas señaladas",
      strategies: "Elige una estrategia", within: "Dentro de límites", needs_signoff: "Requiere autorización del gerente de activos",
      chart_title: "Mañana, hora por hora", lg_dis: "Descarga de batería", lg_chg: "Carga de batería", lg_price: "Precio pronosticado (MXN/MWh)", lg_crit: "Hora crítica probable",
      likely_title: "Horas críticas probables", likely_lede: "El CENACE publica las horas críticas del año una sola vez, alrededor de febrero. Mientras tanto, Pantheon muestra la probabilidad de cada hora y la señala desde 50%.",
      planned: "Plan", discharge: "Descarga", charge: "Carga", idle: "En espera",
      schedule: "Qué hará la batería", why: "Por qué este plan",
      approve: "Aprobar oferta · [TRADER] la presenta antes de las 10:00", approve_title: "Aprobar la oferta de mañana", approve_lede: "Al aprobarla, la oferta se bloquea. Pantheon no presenta ofertas al CENACE ni controla la batería: [TRADER] presenta este autodespacho al mercado de día en adelanto antes de las 10:00; el CENACE lo asigna y lo despacha.",
      note: "Nota para la bitácora (opcional)", cancel: "Cancelar", confirm: "Aprobar y bloquear", ack: "Revisé los límites que rebasa este plan y lo autorizo.",
      read_only: "Tu rol puede consultar este plan pero no aprobarlo.", approved_by: "Aprobado por", download_offer: "Descargar archivo de oferta (CSV)",
      approved_toast: "Oferta aprobada y bloqueada.", feeds: "Fuentes de datos", live: "en vivo", stale: "sin datos", delayed: "con retraso", min_ago: "min",
      alerts_title: "Alertas", resolved: "Resuelta", decide: "Decidir", keep_plan: "Mantener el plan", hold_battery: "Detener la batería", acknowledge: "Enterado",
      decided_toast: "Decisión registrada en la bitácora.",
      settlement_title: "Liquidación, octubre 2026", settled: "Liquidado a la fecha", expected: "Esperado en días liquidados", difference: "Diferencia",
      in_review: "días señalados para revisión", day: "Día", status: "Estado", s_matched: "Coincide", s_review: "Revisar", s_awaiting_statement: "Esperando estado de cuenta", s_disputed: "En disputa",
      dispute: "Abrir disputa", dispute_title: "Abrir una disputa", dispute_reason: "¿Qué parece incorrecto?", dispute_default: "El monto liquidado está por debajo del plan; revisar medición y precios de este día.",
      submit: "Enviar", dispute_toast: "Disputa abierta y registrada.", waterfall: "De ingresos a neto", pending: "Pendiente",
      fleet_title: "Flota", st_discharging: "Descargando", st_charging: "Cargando", st_holding: "En espera", st_maintenance: "Mantenimiento", st_onboarding: "En alta",
      battery: "Batería", solar: "Solar", charge_now: "carga",
      audit_title: "Bitácora", audit_lede: "Cada aprobación, ajuste, decisión y disputa, de la más reciente a la más antigua. Nada se puede editar ni borrar.",
      when: "Cuándo", who: "Quién", what: "Qué", detail: "Detalle", no_access: "Tu rol no puede ver esta página.",
      reset: "Restablecer datos de la demo", reset_done: "Datos de la demo restablecidos.", footer: "Demo de Pantheon · datos de ejemplo, no datos reales de planta",
      err_network: "No se puede conectar con el servidor de la demo. Revisa la dirección en config.js o espera un minuto si se está activando.",
      nav_yesterday: "Ayer", see_replay: "Ver la repetición de ayer",
      y_eyebrow: "Repetición diaria", y_title: "¿Pantheon se ganó su comisión ayer?", y_added: "Aportado frente a no hacer nada", y_after: "Después de carga y desgaste",
      y_plan: "El plan esperaba", y_on_day: "en el día", y_crit: "Horas probablemente críticas cubiertas", y_crit_ctx: "conteo final cuando el CENACE publique la lista del año (~feb)", y_fee: "Comisión de Pantheon del día", y_fee_v: "[TU COMISIÓN]",
      y_replay: "Repetición, hora por hora", y_play: "Reproducir el día", y_pause: "Pausa", y_hour: "Hora", y_planned: "Planeado", y_discharged: "Descargado", y_charged: "Cargado con solar",
      y_gained: "Ganado frente a no hacer nada", y_crit_lg: "Hora probablemente crítica (\u2265 50%)", y_fc: "Precio pronosticado", y_ac: "Precio real", y_pm: "Batería planeada", y_am: "Batería real",
      y_this: "Esta hora", y_run: "Total acumulado frente a no hacer nada", y_why: "Por qué difiere del plan", y_vs_plan: "Frente al plan", y_idle: "En espera", y_critical: "PROBABLE HORA CRÍTICA",
      y_idle_story: "Batería en espera. La solar de la planta fue directo a la red, igual que sin hacer nada.",
      y_story_charge: "Carga de {mw} MW con solar que se habría vendido a {p} MXN/MWh.", y_story_dis: "Descarga de {mw} MW a {p} MXN/MWh (pronóstico {f}).",
      y_story_short: " Plan: {pm} MW.", y_story_crit: " Pantheon había calificado esta hora como probablemente crítica ({p}%).",
      wa_preview: "Ver el mensaje de WhatsApp", wa_title: "Pantheon en WhatsApp", wa_sub: "Cuenta de empresa", wa_sent: "El mensaje de la mañana, como se envió a {to}.",
      wa_none: "Tu rol no tiene número de WhatsApp verificado en esta demo. Entra como Daniela o Mauricio.", wa_signoff: "Este plan requiere autorización, así que solo se puede aprobar en Pantheon.", close: "Cerrar",
      retry: "Reintentar", back_home: "Volver al inicio",
      strat_conservative: "Conservadora", strat_balanced: "Balanceada", strat_aggressive: "Agresiva",
      feed_cenace_prices: "precios CENACE", feed_site_telemetry: "telemetría de planta", feed_weather: "clima",
      lc_title: "Dónde va la oferta de mañana", lc_offered: "Ofertada", lc_submitted: "Presentada", lc_cleared: "Asignada", lc_dispatched: "Despachada", lc_measured: "Medida", lc_settled: "Liquidada",
      lc_not_yet: "Aún no aprobada", lc_offered_d: "Aprobada en Pantheon, pendiente de que [TRADER] la presente", lc_submitted_d: "Presentada por {by} · ref. {ref}", lc_cleared_d: "El CENACE la asignó tal como se ofertó", lc_cleared_dev: "El CENACE la asignó con {n} desviación(es) · {mxn} MXN",
      lc_later: "mañana", lc_help: "Pantheon nunca presenta ofertas al CENACE ni controla la batería.",
      model_banner: "Sin lectura del EMS en los últimos 5 minutos. El estado de la batería es modelado (cerca de {soc}%, ±6). Aprobar requiere la autorización de un gerente de activos.",
      model_ack: "Sé que el estado de la batería es modelado, no medido, y autorizo esta oferta.",
      y_sources: "Fuentes", y_src_dispatched: "despacho", y_src_measured: "medición", y_src_prices: "precios", y_src_cleared: "asignación", y_src_settlement: "liquidación",
      y_cleared: "Asignado por CENACE", y_story_cleared: " El CENACE asignó {c} MW para esta hora (ofertados {p}).",
      plan_approved: "plan aprobado"
    }
  };

  // ---------- State (kept in memory; language and person remembered when the browser allows) ----------
  function load(k) { try { return window.localStorage.getItem("pantheon." + k); } catch (e) { return null; } }
  function save(k, v) { try { if (v == null) window.localStorage.removeItem("pantheon." + k); else window.localStorage.setItem("pantheon." + k, v); } catch (e) { /* ignore */ } }
  var state = { lang: load("lang") === "es" ? "es" : "en", key: load("key"), me: null, asOf: null, strategy: {} };

  function t(k) { return (T[state.lang] && T[state.lang][k]) || T.en[k] || k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loc() { return state.lang === "es" ? "es-MX" : "en-US"; }
  function money(n) { return n == null ? "—" : new Intl.NumberFormat(loc(), { maximumFractionDigits: 0 }).format(n) + " MXN"; }
  function num(n, d) { return new Intl.NumberFormat(loc(), { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: d || 0 }).format(n); }
  function pct(n, signed) { return (signed && n > 0 ? "+" : "") + num(n, 1) + "%"; }
  function hh(h) { return (h < 10 ? "0" : "") + h + ":00"; }
  function time(iso) { var d = new Date(iso); return d.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" }); }
  function dateLong(iso) { var d = new Date(iso + (iso.length === 10 ? "T12:00:00-06:00" : "")); return d.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" }); }
  function dateTime(iso) { var d = new Date(iso); return d.toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" }); }
  function addDays(isoDate, n) { var d = new Date(isoDate + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  // ---------- Talking to the API ----------
  var wake = document.getElementById("wake");
  function api(path, opts) {
    opts = opts || {};
    var headers = { "X-API-Key": state.key || "", "Accept-Language": state.lang === "es" ? "es-MX" : "en" };
    if (opts.body) headers["Content-Type"] = "application/json";
    var slow = setTimeout(function () { wake.hidden = false; }, 2500);
    return fetch(API + path, { method: opts.method || "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        clearTimeout(slow); wake.hidden = true;
        if (opts.raw) return r.ok ? r.text() : r.json().then(function (j) { throw j.error || j; });
        if (r.status === 204) return null;
        return r.json().then(function (j) { if (!r.ok) { var e = j.error || { code: "error", message: "Error " + r.status }; e.status = r.status; throw e; } return j; });
      }, function () { clearTimeout(slow); wake.hidden = true; throw { code: "network", message: t("err_network") }; });
  }

  var toastEl = document.getElementById("toast"), toastTimer;
  function toast(msg, isError) {
    toastEl.textContent = msg; toastEl.className = "toast" + (isError ? " error" : ""); toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4500);
  }

  function can(p) { return !!(state.me && state.me.permissions.indexOf(p) >= 0); }

  // ---------- Page frame ----------
  var LOGO = '<svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M2 9 L13 3 L24 9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 11 V21 M10 11 V21 M16 11 V21 M21 11 V21" stroke="currentColor" stroke-width="1.6"/><path d="M2 23 H24" stroke="currentColor" stroke-width="1.6"/></svg>';

  function langToggle() {
    return '<div class="seg" role="group" aria-label="' + esc(t("language")) + '">' +
      '<button type="button" data-lang="en" aria-pressed="' + (state.lang === "en") + '">EN</button>' +
      '<button type="button" data-lang="es" aria-pressed="' + (state.lang === "es") + '">ES</button></div>';
  }

  function frame(route, body, openAlerts) {
    var partner = state.me.user.role === "partner" || state.me.user.role === "client";
    var links = partner ? [] : [["home", t("nav_home")], ["yesterday", t("nav_yesterday")], ["today", t("nav_today")], ["alerts", t("nav_alerts")], ["settlement", t("nav_settlement")], ["fleet", t("nav_fleet")]];
    if (!partner) links.push(["lines", t("nav_lines")]);
    if (can("qenergy.read")) links.push(["qenergy", t("nav_qenergy")]);
    if (can("qenergy.read") || can("vispera.disclose")) links.push(["timestamps", t("nav_ts")]);
    if (can("audit.read")) links.push(["audit", t("nav_audit")]);
    if (can("business.read")) links.push(["plan", t("nav_plan")]);
    if (can("business.read")) links.push(["model", mt("nav_model")]);
    var nav = links.map(function (l) {
      var badge = l[0] === "alerts" && openAlerts ? ' <span class="badge">' + openAlerts + "</span>" : "";
      return '<a href="#/' + l[0] + '"' + (route === l[0] ? ' aria-current="page"' : "") + ">" + esc(l[1]) + badge + "</a>";
    }).join("");
    if (!partner) nav += '<a href="screens/index.html" title="' + (state.lang === "es" ? "Todas las pantallas diseñadas, en orden de recorrido" : "Every designed screen, in journey order") + '">' + (state.lang === "es" ? "Todas las pantallas" : "All screens") + "</a>";
    var u = state.me.user;
    app.innerHTML =
      '<header class="top"><div class="brand">' + LOGO + "PANTHEON</div>" +
      '<nav class="nav" aria-label="Main">' + nav + "</nav>" +
      '<div class="who"><span class="chip">' + esc(t("sample")) + "</span>" + langToggle() +
      '<button class="btn" type="button" data-act="signout" title="' + esc(t("switch_person")) + '">' + esc(u.name) + " · " + esc(t("role_" + u.role)) + "</button></div></header>" +
      "<main>" + body + "</main>" +
      '<footer class="footer">' + esc(t("footer")) + ' · <button type="button" data-act="reset">' + esc(t("reset")) + "</button></footer>";
    window.scrollTo(0, 0);
  }

  function errorPage(e) {
    var body = '<div class="card"><h2>' + esc(e.message || "Error") + "</h2>" +
      '<div class="row" style="flex:none">' + (e.status && e.status < 500 ? "" : '<button class="btn" type="button" data-act="retry">' + esc(t("retry")) + "</button> ") + '<a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="#/home">' + esc(t("back_home")) + "</a></div></div>";
    if (state.me) frame(currentRoute().name, body, 0); else app.innerHTML = '<main><div class="signin">' + body + "</div></main>";
  }

  // ---------- Sign in ----------
  function signinPage() {
    app.innerHTML = '<main><div class="signin">' +
      '<div class="head"><div class="brand">' + LOGO + "PANTHEON</div>" + langToggle() + "</div>" +
      '<div><h1 class="title">' + esc(t("signin_title")) + '</h1><p class="muted">' + esc(t("signin_lede")) + "</p></div>" +
      '<div class="people">' + PEOPLE.map(function (p) {
        return '<button class="person" type="button" data-person="' + p.key + '"><strong style="font-size:17px">' + esc(p.name) + "</strong>" +
          '<span class="peak small">' + esc(t("role_" + p.role)) + '</span><span class="muted small">' + esc(t("role_" + p.role + "_d")) + "</span></button>";
      }).join("") + "</div>" +
      '<p class="muted small"><span class="chip">' + esc(t("sample")) + "</span></p></div></main>";
  }

  function signIn(key) {
    state.key = key; save("key", key);
    return api("/v1/me").then(function (me) { state.me = me; route(); }, function (e) { state.key = null; save("key", null); toast(e.message, true); signinPage(); });
  }

  // ---------- Home ----------
  function homePage() {
    return api("/v1/home").then(function (h) {
      state.asOf = h.as_of;
      var acts = h.actions.length ? h.actions.map(function (a) {
        var href = a.kind === "approve_plan" ? "#/today/" + a.site_id : a.kind === "incident" ? "#/alerts" : "#/settlement";
        var color = a.kind === "approve_plan" ? "var(--peak)" : a.kind === "incident" ? "var(--critical)" : "var(--warn)";
        return '<div class="line"><span class="stripe" style="background:' + color + '"></span><div style="flex:1;min-width:0">' + esc(a.title) +
          (a.minutes_left != null ? '<div class="small peak mono">' + a.minutes_left + " " + esc(t("min_left")) + "</div>" : "") +
          '</div><a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="' + href + '">' + esc(t("open")) + "</a></div>";
      }).join("") : '<p class="muted">' + esc(t("nothing_needed")) + "</p>";
      frame("home",
        '<div class="head"><div><div class="eyebrow">' + esc(dateLong(h.as_of)) + " · " + esc(time(h.as_of)) + '</div><h1 class="title">' + esc(t("good_morning")) + ", " + esc(state.me.user.name) + "</h1></div></div>" +
        '<div class="row">' +
        kpi(t("yesterday"), money(h.yesterday_energy_margin), '<span class="ok">' + pct(h.yesterday_vs_plan_pct, true) + "</span> " + esc(t("vs_plan")) + ' · <a href="#/yesterday">' + esc(t("see_replay")) + "</a>") +
        kpi(t("crit_hours_yday"), esc(h.yesterday_critical_hours), "") +
        kpi(t("open_alerts"), String(h.open_alerts), "") + "</div>" +
        '<section class="card"><h2>' + esc(t("needs_you")) + '</h2><div class="lines">' + acts + "</div></section>", h.open_alerts);
    });
  }

  function kpi(label, value, ctx, cls) {
    return '<div class="card kpi ' + (cls || "") + '"><div class="label">' + esc(label) + '</div><div class="value">' + value + "</div>" + (ctx ? '<div class="ctx">' + ctx + "</div>" : "") + "</div>";
  }

  // ---------- Tomorrow's plan ----------
  function chart(plan) {
    var W = 720, H = window.innerWidth < 640 ? 420 : 260, L = 34, R = 46, Tp = 14, B = 26, iw = W - L - R, ih = H - Tp - B;
    var maxMw = Math.max(1, Math.max.apply(null, plan.hours.map(function (h) { return Math.abs(h.dispatch_mw); })));
    var maxP = Math.max.apply(null, plan.hours.map(function (h) { return h.price_high; }));
    var bw = iw / 24, zero = Tp + ih / 2;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("chart_title")) + '">';
    plan.hours.forEach(function (h, i) {
      if (h.likely_critical) s += '<rect x="' + (L + i * bw) + '" y="' + Tp + '" width="' + bw + '" height="' + ih + '" fill="#F59E0B" opacity="0.10"/>';
    });
    s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + zero + '" y2="' + zero + '" stroke="#5C6B7D" stroke-width="1"/>';
    plan.hours.forEach(function (h, i) {
      if (!h.dispatch_mw) return;
      var hgt = Math.abs(h.dispatch_mw) / maxMw * (ih / 2 - 4), x = L + i * bw + 3, w = bw - 6;
      s += h.dispatch_mw > 0
        ? '<rect x="' + x + '" y="' + (zero - hgt) + '" width="' + w + '" height="' + hgt + '" rx="2" fill="#F59E0B"/>'
        : '<rect x="' + x + '" y="' + zero + '" width="' + w + '" height="' + hgt + '" rx="2" fill="#3BA7FF"/>';
      if (h.overridden) s += '<circle cx="' + (x + w / 2) + '" cy="' + (h.dispatch_mw > 0 ? zero - hgt - 6 : zero + hgt + 6) + '" r="2.5" fill="#E6EDF5"/>';
    });
    var band = "", line = "";
    plan.hours.forEach(function (h, i) {
      var x = L + i * bw + bw / 2, y = Tp + ih - h.price_forecast / maxP * ih;
      line += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    });
    var up = plan.hours.map(function (h, i) { return (L + i * bw + bw / 2).toFixed(1) + "," + (Tp + ih - h.price_high / maxP * ih).toFixed(1); });
    var dn = plan.hours.slice().reverse().map(function (h, j) { var i = 23 - j; return (L + i * bw + bw / 2).toFixed(1) + "," + (Tp + ih - h.price_low / maxP * ih).toFixed(1); });
    band = '<polygon points="' + up.concat(dn).join(" ") + '" fill="#E6EDF5" opacity="0.08"/>';
    s += band + '<path d="' + line + '" fill="none" stroke="#E6EDF5" stroke-width="1.6"/>';
    for (var i = 0; i < 24; i += 3) s += '<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 8) + '" fill="#8A98A8" font-size="11" font-family="IBM Plex Mono" text-anchor="middle">' + hh(i).slice(0, 2) + "</text>";
    s += '<text x="' + (L - 6) + '" y="' + (Tp + 10) + '" fill="#8A98A8" font-size="10" font-family="IBM Plex Mono" text-anchor="end">+' + num(maxMw, 0) + "</text>";
    s += '<text x="' + (L - 6) + '" y="' + (Tp + ih) + '" fill="#8A98A8" font-size="10" font-family="IBM Plex Mono" text-anchor="end">−' + num(maxMw, 0) + "</text>";
    s += '<text x="' + (L - 6) + '" y="' + (zero + 4) + '" fill="#8A98A8" font-size="10" font-family="IBM Plex Mono" text-anchor="end">MW</text>';
    s += '<text x="' + (L + iw + 6) + '" y="' + (Tp + 10) + '" fill="#8A98A8" font-size="10" font-family="IBM Plex Mono">' + num(maxP / 1000, 1) + "k</text>";
    s += '<text x="' + (L + iw + 6) + '" y="' + (Tp + ih) + '" fill="#8A98A8" font-size="10" font-family="IBM Plex Mono">0</text>';
    return s + "</svg>";
  }

  function todayPage(siteId) {
    siteId = siteId || "site-a";
    var ensureDate = state.asOf ? Promise.resolve() : api("/v1/home").then(function (h) { state.asOf = h.as_of; });
    var day, picked;
    return ensureDate.then(function () {
      day = addDays(state.asOf.slice(0, 10), 1);
      picked = state.strategy[siteId];
      var q = picked ? "?strategy=" + picked : "";
      var soft = function (p) { return p.catch(function () { return null; }); };
      return Promise.all([api("/v1/sites/" + siteId), api("/v1/sites/" + siteId + "/plans/" + day + q), api("/v1/sites/" + siteId + "/plans/" + day + "/strategies"), api("/v1/alerts"), soft(api("/v1/sites/" + siteId + "/battery"))]);
    }).then(function (r) {
      // The offer and CENACE's cleared schedule exist only once the plan is approved.
      var approved = r[1].status === "approved";
      return Promise.all([r[0], r[1], r[2], r[3], approved ? soft(api("/v1/sites/" + siteId + "/offer/" + day)) : null, approved ? soft(api("/v1/sites/" + siteId + "/cleared/" + day)) : null, r[4]]);
    }).then(function (r) {
      var site = r[0], plan = r[1], opts = r[2], alerts = r[3], sm = plan.summary, offer = r[4], cleared = r[5], batt = r[6];
      var modelled = !!(batt && batt.state_source === "model");
      var locked = plan.status !== "draft";
      var statusTxt = plan.status === "approved" ? '<span class="ok">' + esc(t("status_approved")) + "</span>" : plan.status === "missed" ? '<span class="bad">' + esc(t("status_missed")) + "</span>" : '<span class="peak">' + esc(t("status_draft")) + "</span>";

      var banner = "";
      if (plan.status === "approved") banner = '<div class="banner done"><strong>' + esc(t("status_approved")) + "</strong><span class=\"muted\">" + esc(t("approved_by")) + " " + esc(plan.approved_by) + " · " + esc(dateTime(plan.approved_at)) + "</span>" +
        (can("plan.export") ? '<button class="btn" type="button" data-act="offer" data-site="' + siteId + '" data-day="' + day + '" style="margin-left:auto">' + esc(t("download_offer")) + "</button>" : "") + "</div>";
      if (plan.status === "missed") banner = '<div class="banner missed"><strong>' + esc(t("status_missed")) + "</strong></div>";
      if (modelled && plan.status === "draft") banner += '<div class="banner missed"><span class="warn">' + esc(fmtT("model_banner", { soc: num(batt.soc_pct, 0) })) + "</span></div>";

      var stage = plan.status !== "approved" ? -1 : !offer ? 0 : offer.status === "cleared" ? 2 : offer.status === "submitted" ? 1 : 0;
      var detail = stage < 0 ? t("lc_not_yet") : stage === 0 ? t("lc_offered_d") : stage === 1 ? fmtT("lc_submitted_d", { by: offer.submitted_by, ref: offer.confirmation })
        : (cleared && cleared.deviations.length ? fmtT("lc_cleared_dev", { n: cleared.deviations.length, mxn: sgn(cleared.margin_impact) }) : t("lc_cleared_d"));
      var lifecycle = '<section class="card lifecycle"><h2>' + esc(t("lc_title")) + '</h2><ol class="steps">' + ["offered", "submitted", "cleared", "dispatched", "measured", "settled"].map(function (k, i) {
        var cls = i < stage ? "done" : i === stage ? "cur" : "todo";
        return '<li class="' + cls + '"><span class="dot"></span><span>' + esc(t("lc_" + k)) + (i > 2 ? ' <span class="muted small">· ' + esc(t("lc_later")) + "</span>" : "") + "</span></li>";
      }).join("") + '</ol><p class="small" style="margin:0">' + esc(detail) + ' <span class="muted">· ' + esc(t("lc_help")) + "</span></p></section>";

      var stale = plan.data_status.filter(function (f) { return f.status !== "live"; });
      var feeds = '<div class="small muted">' + esc(t("feeds")) + ": " + plan.data_status.map(function (f) {
        var c = f.status === "live" ? "ok" : f.status === "stale" ? "bad" : "warn";
        return esc(t("feed_" + f.name)) + ' <span class="' + c + '">' + esc(t(f.status)) + "</span> (" + f.age_minutes + " " + esc(t("min_ago")) + ")";
      }).join(" · ") + "</div>";

      var strat = '<div class="strategies" role="radiogroup" aria-label="' + esc(t("strategies")) + '">' + opts.map(function (o) {
        var sel = o.strategy === plan.strategy;
        var lim = o.within_limits ? '<span class="ok small">' + esc(t("within")) + "</span>" : '<span class="warn small">' + esc(o.violations.map(function (v) { return v.message; }).join(" ")) + " " + esc(t("needs_signoff")) + "</span>";
        return '<button class="strategy" type="button" role="radio" aria-checked="' + sel + '" data-strategy="' + o.strategy + '" data-site="' + siteId + '"' + (locked ? " disabled" : "") + ">" +
          '<span class="name">' + esc(t("strat_" + o.strategy)) + '</span><span class="small muted">' + esc(o.description) + "</span>" +
          '<span class="mono" style="font-size:20px">' + money(o.energy_margin) + '</span><span class="small muted mono">' + num(o.cycles, 2) + " " + esc(t("cycles").toLowerCase()) + " · " + o.likely_critical_hours_covered + "/" + sm.likely_critical_hours + "</span>" + lim + "</button>";
      }).join("") + "</div>";

      var likely = plan.hours.filter(function (h) { return h.critical_likelihood >= 0.1; }).map(function (h) {
        var act = h.dispatch_mw > 0 ? t("discharge") + " " + num(h.dispatch_mw, 1) + " MW" : h.dispatch_mw < 0 ? t("charge") + " " + num(-h.dispatch_mw, 1) + " MW" : t("idle");
        return '<div class="likely"><span class="mono">' + hh(h.hour) + '</span><div class="bar"><span style="width:' + Math.round(h.critical_likelihood * 100) + "%;background:" + (h.likely_critical ? "var(--peak)" : "var(--neutral-mark)") + '"></span></div>' +
          '<span class="mono ' + (h.likely_critical ? "peak" : "muted") + '">' + Math.round(h.critical_likelihood * 100) + '%</span><span class="plan small ' + (h.likely_critical && h.dispatch_mw <= 0 ? "bad" : "muted") + '">' + esc(t("planned")) + ": " + esc(act) + "</span></div>";
      }).join("");

      var sched = plan.schedule.map(function (b) {
        return '<div class="line"><span class="stripe" style="background:' + (b.action === "charge" ? "var(--charge)" : "var(--peak)") + '"></span><div style="flex:1"><div class="mono">' + esc(b.start) + "–" + esc(b.end) + '</div><div class="small muted">' + esc(b.source) + '</div></div><span class="mono small">' + esc(t(b.action)) + " ≤" + num(b.max_mw, 1) + " MW</span></div>";
      }).join("");

      var action = "";
      if (plan.status === "draft") {
        action = can("plan.approve")
          ? '<button class="btn primary block" type="button" data-act="approve" data-site="' + siteId + '" data-day="' + day + '" data-plan-strategy="' + plan.strategy + '" data-modelled="' + modelled + '">' + esc(t("approve")) + " · " + money(sm.energy_margin) + "</button>"
          : '<p class="muted small">' + esc(t("read_only")) + "</p>";
        if (state.me.whatsapp_number) action += '<button class="btn block" type="button" data-act="wa" data-site="' + siteId + '" data-day="' + day + '">' + esc(t("wa_preview")) + "</button>";
      }

      var open = alerts.length;
      frame("today",
        '<div class="head"><div><div class="eyebrow">' + esc(site.name) + " · " + esc(site.region) + " · " + num(site.power_mw, 0) + " MW / " + num(site.energy_mwh, 0) + " MWh" + (site.solar_mw ? " · " + num(site.solar_mw, 0) + " MW " + esc(t("solar").toLowerCase()) : "") + "</div>" +
        '<h1 class="title">' + esc(t("plan_for")) + " " + esc(dateLong(day)) + "</h1></div>" +
        '<div class="small" style="text-align:right">' + statusTxt + '<div class="muted">' + esc(t("deadline")) + ' <span class="mono">' + esc(time(plan.offer_deadline)) + "</span>" + (plan.status === "draft" ? ' · <span class="mono peak">' + plan.minutes_to_deadline + " " + esc(t("min_left")) + "</span>" : "") + "</div></div></div>" +
        banner + (stale.length ? '<div class="banner missed">' + feeds + "</div>" : "") + lifecycle +
        '<div class="row">' +
        kpi(t("energy_margin"), money(sm.energy_margin), esc(t("after"))) +
        kpi(t("cycles"), num(sm.cycles, 2), "") +
        kpi(t("crit_covered"), sm.likely_critical_hours_covered + " / " + sm.likely_critical_hours, "") +
        kpi(t("capacity"), '<span style="font-size:20px">' + esc(t("projection")) + "</span>", esc(t("capacity_amount")) + " " + num(plan.capacity.battery_available_mw_in_flagged_hours, 1) + " " + esc(t("available_mw")) + ".", "projection") +
        "</div>" +
        '<div class="split"><div class="main" style="display:flex;flex-direction:column;gap:16px">' +
        '<section class="card chart"><h2>' + esc(t("chart_title")) + "</h2>" + chart(plan) +
        '<div class="legend"><span><i style="background:#F59E0B"></i>' + esc(t("lg_dis")) + '</span><span><i style="background:#3BA7FF"></i>' + esc(t("lg_chg")) + '</span><span><i style="background:#E6EDF5;height:2px"></i>' + esc(t("lg_price")) + '</span><span><i style="background:rgba(245,158,11,.25)"></i>' + esc(t("lg_crit")) + "</span></div>" +
        (stale.length ? "" : feeds) + "</section>" +
        '<section class="card"><h2>' + esc(t("strategies")) + "</h2>" + strat + "</section>" +
        '<section class="card"><h2>' + esc(t("likely_title")) + '</h2><p class="small muted" style="margin:0">' + esc(t("likely_lede")) + '</p><div style="display:flex;flex-direction:column;gap:10px">' + likely + "</div></section>" +
        "</div>" +
        '<aside class="side"><section class="card"><h2>' + esc(t("schedule")) + '</h2><div class="lines">' + sched + "</div>" + action + "</section>" +
        '<section class="card"><h2>' + esc(t("why")) + '</h2><p style="margin:0" class="small">' + esc(plan.explanation) + "</p></section></aside></div>", open);
    });
  }

  function approveDialog(siteId, day, strategy, violations, modelled) {
    var soft = violations || [];
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">' + esc(t("approve_title")) + '</h2><p class="muted small" style="margin:0">' + esc(t("approve_lede")) + "</p>" +
      (soft.length ? '<div class="banner missed" style="flex-direction:column;align-items:flex-start">' + soft.map(function (v) { return '<span class="warn">' + esc(v.message) + "</span>"; }).join("") + "</div>" +
        '<label class="check"><input type="checkbox" id="dlg-ack"><span>' + esc(t("ack")) + "</span></label>" : "") +
      (modelled ? '<label class="check"><input type="checkbox" id="dlg-model"><span>' + esc(t("model_ack")) + "</span></label>" : "") +
      '<label class="small muted" for="dlg-note">' + esc(t("note")) + '</label><textarea id="dlg-note" rows="2" maxlength="500"></textarea>' +
      '<div class="row" style="justify-content:flex-end;flex:none"><button class="btn" type="button" id="dlg-cancel" style="flex:0 0 auto">' + esc(t("cancel")) + '</button><button class="btn primary" type="button" id="dlg-ok" style="flex:0 0 auto"' + (soft.length ? " disabled" : "") + ">" + esc(t("confirm")) + "</button></div></div>";
    document.body.appendChild(scrim);
    var ok = scrim.querySelector("#dlg-ok"), ack = scrim.querySelector("#dlg-ack"), mod = scrim.querySelector("#dlg-model");
    function close() { scrim.remove(); }
    function gate() { ok.disabled = (ack && !ack.checked) || (mod && !mod.checked); }
    if (ack) ack.addEventListener("change", gate);
    if (mod) { mod.addEventListener("change", gate); gate(); }
    scrim.querySelector("#dlg-cancel").addEventListener("click", close);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    ok.addEventListener("click", function () {
      ok.disabled = true;
      api("/v1/sites/" + siteId + "/plans/" + day + "/approve", { method: "POST", body: { strategy: strategy, acknowledge_soft_violations: !!(ack && ack.checked), sign_off: !!(mod && mod.checked), note: scrim.querySelector("#dlg-note").value || null } })
        .then(function () { close(); delete state.strategy[siteId]; toast(t("approved_toast")); route(); },
          function (e) {
            if (e.code === "soft_needs_ack" && !soft.length) { close(); approveDialog(siteId, day, strategy, e.details || [], !!mod); return; }
            if (e.code === "model_needs_signoff" && !mod) { close(); approveDialog(siteId, day, strategy, soft, true); return; }
            ok.disabled = false; toast(e.message, true);
          });
    });
    (ack || ok).focus();
  }

  // ---------- Alerts ----------
  function alertsPage() {
    return Promise.all([api("/v1/alerts?status=all"), api("/v1/alerts")]).then(function (r) {
      var all = r[0], open = r[1].length;
      var sevColor = { action: ["var(--peak)", "var(--on-peak)"], high: ["var(--critical)", "#1A0808"], medium: ["var(--warn)", "#1A1506"], low: ["var(--neutral-mark)", "var(--ink)"] };
      var list = all.map(function (a) {
        var c = sevColor[a.severity];
        var acts = "";
        if (a.status === "open") {
          if (a.options.length && can("alert.act")) acts = a.options.map(function (o, i) { return '<button class="btn' + (i === 0 ? " primary" : "") + '" type="button" data-act="decide" data-alert="' + a.id + '" data-choice="' + o + '">' + esc(t(o)) + "</button>"; }).join("");
          else if (a.resource && a.resource.indexOf("/plans/") > 0) acts = '<a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="#/today/' + esc(a.site_id) + '">' + esc(t("open")) + "</a>";
          else if (a.resource && a.resource.indexOf("settlements") > 0) acts = '<a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="#/settlement">' + esc(t("open")) + "</a>";
          else if (can("alert.act")) acts = '<button class="btn" type="button" data-act="decide" data-alert="' + a.id + '" data-choice="acknowledge">' + esc(t("acknowledge")) + "</button>";
        } else {
          acts = '<span class="small ok">' + esc(t("resolved")) + (a.resolution ? " · " + esc(t(a.resolution) || a.resolution) : "") + (a.resolved_by ? " · " + esc(a.resolved_by) : "") + "</span>";
        }
        return '<div class="alert' + (a.severity === "action" && a.status === "open" ? " action" : "") + '"' + (a.status !== "open" ? ' style="opacity:.65"' : "") + '>' +
          '<span class="sev" style="background:' + c[0] + ";color:" + c[1] + '">' + esc(a.severity.toUpperCase()) + "</span>" +
          '<div class="body"><strong>' + esc(a.title) + '</strong><span class="small muted">' + esc(a.detail) + '</span><span class="small muted mono">' + esc(dateTime(a.created_at)) + " · " + esc(a.delivery) + "</span></div>" +
          '<div class="acts">' + acts + "</div></div>";
      }).join("");
      frame("alerts", '<div class="head"><h1 class="title">' + esc(t("alerts_title")) + "</h1></div>" + list, open);
    });
  }

  // ---------- Settlement ----------
  function settlementPage() {
    return Promise.all([api("/v1/sites/site-a/settlements?month=2026-10"), api("/v1/alerts"), api("/v1/sites/site-a")]).then(function (r) {
      var s = r[0];
      var rows = s.days.map(function (d) {
        var cls = d.status === "review" ? "warn" : d.status === "disputed" ? "bad" : d.status === "matched" ? "ok" : "muted";
        var btn = d.status === "review" && can("dispute.create") ? ' <button class="btn" type="button" data-act="dispute" data-day="' + d.date + '" style="min-height:36px;margin-left:8px">' + esc(t("dispute")) + "</button>" : "";
        return "<tr><td class=\"mono\">" + esc(d.date) + '</td><td class="mono">' + money(d.expected) + '</td><td class="mono">' + money(d.settled) + '</td><td class="mono ' + cls + '">' + (d.difference_pct == null ? "—" : pct(d.difference_pct, true)) + '</td><td class="' + cls + '">' + esc(t("s_" + d.status)) + btn + "</td></tr>";
      }).join("");
      var wf = s.waterfall.map(function (w) {
        var c = w.kind === "add" ? "ok" : w.kind === "cost" ? "bad" : w.kind === "pending" ? "muted" : "";
        return '<div class="line"' + (w.kind === "total" ? ' style="font-weight:600"' : "") + "><span>" + esc(w.label) + '</span><span class="mono ' + c + '">' + (w.amount == null ? esc(t("pending")) : money(w.amount)) + "</span></div>";
      }).join("");
      frame("settlement",
        '<div class="head"><div><div class="eyebrow">' + esc(r[2].name) + '</div><h1 class="title">' + esc(t("settlement_title")) + "</h1></div></div>" +
        '<div class="row">' + kpi(t("settled"), money(s.settled_total), "") + kpi(t("expected"), money(s.expected_on_settled_days), "") +
        kpi(t("difference"), pct(s.difference_pct, true), s.review_count + " " + esc(t("in_review")) + " (> " + num(s.review_threshold_pct, 0) + "%)") + "</div>" +
        '<div class="split"><section class="card main"><div class="tablewrap"><table><thead><tr><th>' + esc(t("day")) + "</th><th>" + esc(t("expected")) + "</th><th>" + esc(t("settled")) + "</th><th>" + esc(t("difference")) + "</th><th>" + esc(t("status")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>" +
        '<aside class="side"><section class="card"><h2>' + esc(t("waterfall")) + '</h2><div class="lines">' + wf + "</div></section></aside></div>", r[1].length);
    });
  }

  function disputeDialog(day) {
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dd-t"><h2 id="dd-t">' + esc(t("dispute_title")) + ' · <span class="mono">' + esc(day) + "</span></h2>" +
      '<label class="small muted" for="dd-r">' + esc(t("dispute_reason")) + '</label><textarea id="dd-r" rows="3" maxlength="1000">' + esc(t("dispute_default")) + "</textarea>" +
      '<div class="row" style="justify-content:flex-end;flex:none"><button class="btn" type="button" id="dd-c" style="flex:0 0 auto">' + esc(t("cancel")) + '</button><button class="btn primary" type="button" id="dd-ok" style="flex:0 0 auto">' + esc(t("submit")) + "</button></div></div>";
    document.body.appendChild(scrim);
    function close() { scrim.remove(); }
    scrim.querySelector("#dd-c").addEventListener("click", close);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    scrim.querySelector("#dd-ok").addEventListener("click", function () {
      api("/v1/sites/site-a/disputes", { method: "POST", body: { date: day, reason: scrim.querySelector("#dd-r").value } })
        .then(function () { close(); toast(t("dispute_toast")); route(); }, function (e) { toast(e.message, true); });
    });
    scrim.querySelector("#dd-r").focus();
  }

  // ---------- Fleet ----------
  function fleetPage() {
    return Promise.all([api("/v1/sites"), api("/v1/alerts")]).then(function (r) {
      var cards = r[0].map(function (s) {
        var c = s.status === "discharging" ? "peak" : s.status === "charging" ? "" : s.status === "maintenance" ? "warn" : "muted";
        var style = s.status === "charging" ? ' style="color:var(--charge-text)"' : "";
        return '<a class="card" style="text-decoration:none;color:inherit" href="#/today/' + esc(s.id) + '"><div class="eyebrow">' + esc(s.region) + "</div><h2>" + esc(s.name) + "</h2>" +
          '<div class="small mono muted">' + esc(t("battery")) + " " + num(s.power_mw, 0) + " MW / " + num(s.energy_mwh, 0) + " MWh" + (s.solar_mw ? " · " + esc(t("solar")) + " " + num(s.solar_mw, 0) + " MW" : "") + "</div>" +
          '<div class="' + c + '"' + style + ">" + esc(t("st_" + s.status)) + (s.soc_pct != null ? ' · <span class="mono">' + num(s.soc_pct, 0) + "% " + esc(t("charge_now")) + "</span>" : "") + "</div></a>";
      }).join("");
      frame("fleet", '<div class="head"><h1 class="title">' + esc(t("fleet_title")) + '</h1></div><div class="row">' + cards + "</div>", r[1].length);
    });
  }

  // ---------- Audit log ----------
  function auditPage() {
    if (!can("audit.read")) { return api("/v1/alerts").then(function (a) { frame("audit", '<div class="card"><h2>' + esc(t("no_access")) + "</h2></div>", a.length); }); }
    return Promise.all([api("/v1/audit-log?limit=100"), api("/v1/alerts")]).then(function (r) {
      var rows = r[0].map(function (e) { return '<tr><td class="mono">' + esc(dateTime(e.at)) + "</td><td>" + esc(e.actor) + '</td><td class="mono">' + esc(e.action) + "</td><td>" + esc(e.detail) + "</td></tr>"; }).join("");
      frame("audit", '<div class="head"><div><h1 class="title">' + esc(t("audit_title")) + '</h1><p class="muted small" style="margin:4px 0 0">' + esc(t("audit_lede")) + "</p></div></div>" +
        '<section class="card"><div class="tablewrap"><table><thead><tr><th>' + esc(t("when")) + "</th><th>" + esc(t("who")) + "</th><th>" + esc(t("what")) + "</th><th>" + esc(t("detail")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>", r[1].length);
    });
  }

  // ---------- Yesterday, replayed ----------
  var replay = { data: null, hour: 23, timer: null };
  function fmtT(k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, n) { return o[n]; }); }
  function sgn(n) { return n > 0 ? "+" + num(n, 0) : n < 0 ? "−" + num(-n, 0) : "0"; }

  function yesterdayPage() {
    stopReplay();
    var day = state.asOf ? addDays(state.asOf.slice(0, 10), -1) : "2026-10-16";
    var ensure = state.asOf ? Promise.resolve() : api("/v1/home").then(function (h) { state.asOf = h.as_of; day = addDays(h.as_of.slice(0, 10), -1); });
    return ensure.then(function () { return Promise.all([api("/v1/sites/site-a/replay/" + day), api("/v1/sites/site-a"), api("/v1/alerts")]); }).then(function (r) {
      var d = r[0], s = d.summary, site = r[1];
      replay.data = d; replay.hour = 23;
      var lg = function (style, label) { return '<span><i style="' + style + '"></i>' + esc(label) + "</span>"; };
      frame("yesterday",
        '<div class="head"><div style="max-width:820px"><div class="eyebrow">' + esc(site.name) + " · " + esc(dateLong(d.date)) + " · " + esc(t("y_eyebrow")) + "</div>" +
        '<h1 class="title">' + esc(t("y_title")) + '</h1><p style="margin:8px 0 0;font-size:17px;color:var(--ink-2)">' + esc(d.headline) + "</p></div></div>" +
        '<div class="row">' +
        kpi(t("y_added"), '<span class="ok">' + sgn(s.value_vs_idle) + '</span> <span class="unit">MXN</span>', esc(t("y_after"))) +
        kpi(t("y_plan"), money(s.plan_value), '<span class="ok">' + sgn(s.vs_plan) + " (" + pct(s.vs_plan_pct, true) + ")</span> " + esc(t("y_on_day"))) +
        kpi(t("y_crit"), '<span class="peak">' + esc(s.critical_hours_covered) + "</span>", s.critical_hours.map(hh).join(", ") + " · " + esc(t("y_crit_ctx"))) +
        kpi(t("y_fee"), '<span style="font-size:20px">' + (s.fee_mxn == null ? esc(t("y_fee_v")) : money(s.fee_mxn)) + "</span>", esc(s.fee_note), "projection") + "</div>" +
        '<div class="split"><section class="card main"><div class="replay-bar"><h2 style="flex:1 1 200px">' + esc(t("y_replay")) + "</h2>" +
        '<button class="btn primary" type="button" data-act="play" id="r-play">' + esc(t("y_play")) + "</button>" +
        '<label class="small muted" for="r-hour">' + esc(t("y_hour")) + '</label><input id="r-hour" type="range" min="0" max="23" step="1" value="23"></div>' +
        '<div class="legend">' + lg("border:1px dashed #A9B6C4;background:none", t("y_planned")) + lg("background:#F59E0B", t("y_discharged")) + lg("background:#3BA7FF", t("y_charged")) +
        lg("background:#3DDC97", t("y_gained")) + lg("background:rgba(245,158,11,.25)", t("y_crit_lg")) + "</div>" +
        '<div class="replay" id="r-cols"></div><p class="small muted" style="margin:0">' + esc(d.baseline) + "</p>" +
        (d.sources ? '<p class="small muted mono" style="margin:0">' + esc(t("y_sources")) + ": " + ["dispatched", "measured", "prices", "cleared", "settlement"].filter(function (k) { return d.sources[k]; }).map(function (k) { return esc(t("y_src_" + k)) + " = " + esc(d.sources[k]); }).join(" · ") + "</p>" : "") + "</section>" +
        '<aside class="side"><section class="card" style="border-color:var(--peak)" aria-live="polite" id="r-now"></section>' +
        '<section class="card"><h2>' + esc(t("y_why")) + '</h2><div class="lines">' + d.drivers.map(function (x) {
          return '<div class="line"><span class="small">' + esc(x.label) + '</span><span class="mono ' + (x.amount >= 0 ? "ok" : "") + '"' + (x.amount < 0 ? ' style="color:var(--charge-text)"' : "") + ">" + sgn(x.amount) + "</span></div>";
        }).join("") + '<div class="line" style="font-weight:600"><span>' + esc(t("y_vs_plan")) + '</span><span class="mono ok">' + sgn(s.vs_plan) + " MXN</span></div></div></section></aside></div>", r[2].length);
      document.getElementById("r-hour").addEventListener("input", function (e) { stopReplay(); replay.hour = Number(e.target.value); drawReplay(); });
      drawReplay();
    });
  }

  function drawReplay() {
    var d = replay.data, cur = replay.hour, cols = document.getElementById("r-cols"), now = document.getElementById("r-now");
    if (!d || !cols) return;
    var maxV = Math.max.apply(null, d.hours.map(function (h) { return Math.abs(h.value_vs_idle); })) || 1;
    cols.innerHTML = d.hours.map(function (h) {
      var up = function (v) { return (v > 0 ? v * 10 : 0) + "%"; }, dn = function (v) { return (v < 0 ? -v * 10 : 0) + "%"; };
      var v = h.value_vs_idle;
      return '<button type="button" class="rcol' + (h.hour === cur ? " cur" : "") + ((h.likely_critical || h.confirmed_critical) ? " crit" : "") + '" data-act="rhour" data-hour="' + h.hour + '" aria-label="' + hh(h.hour) + '" style="opacity:' + (h.hour > cur ? 0.22 : 1) + '">' +
        '<span class="lane mw"><span class="half up"><i class="p" style="height:' + up(h.planned_mw) + '"></i><i class="a dis" style="height:' + up(h.actual_mw) + '"></i></span>' +
        '<span class="half dn"><i class="p" style="height:' + dn(h.planned_mw) + '"></i><i class="a chg" style="height:' + dn(h.actual_mw) + '"></i></span></span>' +
        '<span class="lane val"><span class="half up"><i class="v pos" style="height:' + (v > 0 ? v / maxV * 100 : 0) + '%"></i></span><span class="half dn"><i class="v neg" style="height:' + (v < 0 ? -v / maxV * 100 : 0) + '%"></i></span></span>' +
        '<span class="hl">' + (h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : "") + "</span></button>";
    }).join("");
    var h = d.hours[cur];
    var mw = function (x) { return x > 0 ? t("discharge") + " " + num(x, 1) + " MW" : x < 0 ? t("charge") + " " + num(-x, 1) + " MW" : t("y_idle"); };
    var story = h.actual_mw < 0 ? fmtT("y_story_charge", { mw: num(-h.actual_mw, 1), p: num(h.price_actual, 0) })
      : h.actual_mw > 0 ? fmtT("y_story_dis", { mw: num(h.actual_mw, 1), p: num(h.price_actual, 0), f: num(h.price_forecast, 0) }) : t("y_idle_story");
    if (h.actual_mw !== h.planned_mw) story += fmtT("y_story_short", { pm: num(h.planned_mw, 1) });
    if (h.cleared_mw != null && h.cleared_mw !== h.planned_mw) story += fmtT("y_story_cleared", { c: num(h.cleared_mw, 1), p: num(h.planned_mw, 1) });
    if (h.likely_critical || h.confirmed_critical) story += fmtT("y_story_crit", { p: Math.round((h.critical_likelihood || 0) * 100) });
    var stat = function (label, val) { return '<span style="display:flex;flex-direction:column;gap:2px"><span class="muted">' + esc(label) + '</span><span class="mono">' + val + "</span></span>"; };
    var col = function (n) { return n > 0 ? "var(--good)" : n < 0 ? "var(--charge-text)" : "var(--ink-3)"; };
    now.innerHTML = '<span class="mono peak">' + hh(cur) + "–" + hh((cur + 1) % 24) + ((h.likely_critical || h.confirmed_critical) ? " · " + esc(t("y_critical")) : "") + "</span>" +
      '<span style="font-size:16px">' + esc(story) + "</span>" +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13px">' +
      stat(t("y_fc"), num(h.price_forecast, 0)) + stat(t("y_ac"), num(h.price_actual, 0)) + stat(t("y_pm"), esc(mw(h.planned_mw))) +
      (h.cleared_mw != null ? stat(t("y_cleared"), '<span' + (h.cleared_mw !== h.planned_mw ? ' class="warn"' : "") + ">" + esc(mw(h.cleared_mw)) + "</span>") : "") + stat(t("y_am"), esc(mw(h.actual_mw))) + "</div>" +
      '<div class="line"><span class="small muted">' + esc(t("y_this")) + '</span><span class="mono" style="color:' + col(h.value_vs_idle) + '">' + sgn(h.value_vs_idle) + " MXN</span></div>" +
      '<div class="line"><span class="small muted">' + esc(t("y_run")) + '</span><span class="mono" style="font-size:20px;color:' + col(h.running_total) + '">' + sgn(h.running_total) + " MXN</span></div>";
    var slider = document.getElementById("r-hour"); if (slider) slider.value = cur;
    var btn = document.getElementById("r-play"); if (btn) btn.textContent = replay.timer ? t("y_pause") : t("y_play");
  }

  function stopReplay() { if (replay.timer) { clearInterval(replay.timer); replay.timer = null; } }
  function togglePlay() {
    if (replay.timer) { stopReplay(); drawReplay(); return; }
    if (replay.hour >= 23) replay.hour = 0;
    replay.timer = setInterval(function () {
      if (!document.getElementById("r-cols")) { stopReplay(); return; }
      if (replay.hour >= 23) { stopReplay(); drawReplay(); return; }
      replay.hour += 1; drawReplay();
    }, 650);
    drawReplay();
  }

  // ---------- WhatsApp preview ----------
  function waDialog(siteId, day) {
    api("/v1/channels/whatsapp/plan-message?site_id=" + siteId + "&date=" + day).then(function (m) {
      var scrim = document.createElement("div");
      scrim.className = "scrim";
      var lines = esc(m.text).split("\n");
      var btns = m.buttons.map(function (b) { return '<button type="button" class="wa-btn" data-wa="' + b.id + '">' + esc(b.title) + "</button>"; }).join("");
      scrim.innerHTML = '<div class="phone" role="dialog" aria-modal="true" aria-labelledby="wa-t"><div class="wa-head"><span class="wa-avatar">' + LOGO + '</span><div style="flex:1;min-width:0"><strong id="wa-t">Pantheon</strong><div class="small muted">' + esc(t("wa_sub")) + "</div></div>" +
        '<button class="btn" type="button" id="wa-close">' + esc(t("close")) + "</button></div>" +
        '<div class="wa-chat" id="wa-chat"><p class="small muted" style="margin:0;text-align:center">' + esc(fmtT("wa_sent", { to: m.to || "" })) + "</p>" +
        '<div class="wa-in"><div class="wa-img"><span class="small muted">' + esc(m.chart_caption || "") + "</span>" + waBars() + "</div>" +
        '<div class="wa-text">' + lines.map(function (l, i) { return i === 0 ? "<p>" + l + "</p>" : '<p class="small">' + l + "</p>"; }).join("") + '<span class="wa-time mono">08:12</span></div>' + btns + "</div>" +
        (m.can_approve_here === false ? '<p class="small warn" style="margin:0;text-align:center">' + esc(t("wa_signoff")) + "</p>" : "") + "</div></div>";
      document.body.appendChild(scrim);
      function close() { scrim.remove(); route(); }
      scrim.querySelector("#wa-close").addEventListener("click", close);
      scrim.addEventListener("click", function (e) {
        if (e.target === scrim) { close(); return; }
        var b = e.target.closest("[data-wa]"); if (!b || b.disabled) return;
        scrim.querySelectorAll("[data-wa]").forEach(function (x) { x.disabled = true; });
        var chat = scrim.querySelector("#wa-chat");
        chat.insertAdjacentHTML("beforeend", '<div class="wa-out">' + esc(b.textContent) + "</div>");
        api("/v1/channels/whatsapp/inbound", { method: "POST", body: { from_number: state.me.whatsapp_number, button_id: b.dataset.wa, context: m.context } }).then(function (rep) {
          chat.insertAdjacentHTML("beforeend", '<div class="wa-in"><div class="wa-text"><p class="small">' + esc(rep.reply_text) + "</p>" +
            (rep.audit ? '<div class="wa-audit"><span class="mono small muted">' + esc(t("nav_audit").toUpperCase()) + " · " + esc(time(rep.audit.at)) + '</span><span class="small">' + esc(rep.audit.detail) + "</span></div>" : "") + "</div></div>");
          if (rep.status === "link") { setTimeout(function () { scrim.remove(); location.hash = "#/today/" + m.context.site_id; route(); }, 900); }
        }, function (err) { chat.insertAdjacentHTML("beforeend", '<p class="small bad" style="margin:0">' + esc(err.message) + "</p>"); });
      });
      scrim.querySelector("#wa-close").focus();
    }, function (e) { toast(e.message, true); });
  }
  function waBars() {
    var D = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8.5, -8.5, -8.5, -8.5, 0, 0, 0, 3, 10, 10, 8, 3, 0];
    return '<span class="wa-bars">' + D.map(function (d, i) {
      return '<span class="' + (i >= 19 && i <= 21 ? "c" : "") + '"><span class="half up"><i class="a dis" style="height:' + (d > 0 ? d * 10 : 0) + '%"></i></span><span class="half dn"><i class="a chg" style="height:' + (d < 0 ? -d * 10 : 0) + '%"></i></span></span>';
    }).join("") + "</span>";
  }


  // ---------- Product lines and business plan (added 22 Oct 2026) ----------
  Object.assign(T.en, {
    nav_lines: "Product lines", nav_plan: "Business plan",
    role_admin_d: "Genau internal: everything, plus the business plan.",
    lines_title: "What Pantheon does in Mexico", lines_lede: "Nine ways the same forecasts earn money, from batteries to the grid. Sample figures.",
    st_live: "Live", st_pilot: "Pilot", st_planned: "Planned",
    l_buyer: "Who buys", l_offer: "What we deliver", l_price: "Price", l_first: "First customers", l_needs: "What it needs", l_sample: "Sample figures", l_back: "All product lines",
    l_open: "Open",
    pf_title: "Atotonilco, 11–29 September", pf_realized: "Realized, fixed daily offer", pf_forecast: "With our forecasts", pf_target: "Target after 3 months", pf_max: "Theoretical maximum",
    pf_day: "A typical day, 21 September", pf_trader_mtr: "Settled at real-time prices, fixed offer", pf_fc_mtr: "Same, with our forecasts",
    ch_title: "Tomorrow’s likely critical hours", ch_hour: "Hour",
    plan_title: "The path to {total} a year in Mexico", plan_lede: "2030 annual recurring revenue by product line. Planning estimates, not contracted revenue.",
    plan_total: "Target 2030", plan_lines: "Revenue by line, 2030", plan_ramp: "How it ramps", plan_gate: "The gate", plan_cond: "What must be true",
    usd_m: "USD M",
    l_prospects: "Prospects", l_prospects_note: "Genau internal. Real companies from public sources; none is a client yet.",
    k_customer: "Customer", k_partner: "Partner", k_channel: "Channel", k_competitor: "Competitor", l_company: "Company", l_what: "What they do", l_evidence: "Evidence", l_source: "Source"
  });
  Object.assign(T.es, {
    nav_lines: "Líneas de producto", nav_plan: "Plan de negocio",
    role_admin_d: "Interno de Genau: todo, más el plan de negocio.",
    lines_title: "Lo que hace Pantheon en México", lines_lede: "Nueve formas en que los mismos pronósticos generan dinero, de las baterías a la red. Cifras de ejemplo.",
    st_live: "En vivo", st_pilot: "Piloto", st_planned: "Planeada",
    l_buyer: "Quién compra", l_offer: "Qué entregamos", l_price: "Precio", l_first: "Primeros clientes", l_needs: "Qué necesita", l_sample: "Cifras de ejemplo", l_back: "Todas las líneas",
    l_open: "Abrir",
    pf_title: "Atotonilco, 11–29 de septiembre", pf_realized: "Realizado, oferta fija diaria", pf_forecast: "Con nuestros pronósticos", pf_target: "Meta a 3 meses", pf_max: "Máximo teórico",
    pf_day: "Un día típico, 21 de septiembre", pf_trader_mtr: "Liquidado a precio de tiempo real, oferta fija", pf_fc_mtr: "Lo mismo, con nuestros pronósticos",
    ch_title: "Horas críticas probables de mañana", ch_hour: "Hora",
    plan_title: "El camino a {total} al año en México", plan_lede: "Ingreso recurrente anual 2030 por línea de producto. Estimaciones de planeación, no ingresos contratados.",
    plan_total: "Meta 2030", plan_lines: "Ingreso por línea, 2030", plan_ramp: "Cómo crece", plan_gate: "La compuerta", plan_cond: "Lo que debe cumplirse",
    usd_m: "M USD",
    l_prospects: "Prospectos", l_prospects_note: "Interno de Genau. Empresas reales de fuentes públicas; ninguna es cliente todavía.",
    k_customer: "Cliente", k_partner: "Socio", k_channel: "Canal", k_competitor: "Competidor", l_company: "Empresa", l_what: "Qué hacen", l_evidence: "Evidencia", l_source: "Fuente"
  });
  var SAMPLE_LBL = {
    site: ["Site", "Sitio"], power_mw: ["Power, MW", "Potencia, MW"], energy_mwh: ["Energy, MWh", "Energía, MWh"], status: ["Status", "Estado"],
    revenue_mxn_per_mw_year: ["Market revenue, MXN per MW-year", "Ingreso de mercado, MXN por MW-año"], fee_pct: ["Our fee, %", "Nuestra comisión, %"],
    peak_mw: ["Peak load, MW", "Carga pico, MW"], cuttable_mw: ["Load it can cut, MW", "Carga que puede bajar, MW"],
    book_mw: ["PPA book, MW", "Cartera de PPA, MW"], book_gwh: ["Energy a year, GWh", "Energía al año, GWh"], value_usd_per_year: ["Value to the trader, USD a year", "Valor para el comercializador, USD al año"],
    partner: ["Partner", "Socio"], sites: ["Sites", "Sitios"], mw: ["MW", "MW"], project: ["Project", "Proyecto"], duration_h: ["Duration, hours", "Duración, horas"],
    p50_revenue_mxn_per_mw_year: ["P50 revenue, MXN per MW-year", "Ingreso P50, MXN por MW-año"], p90_revenue_mxn_per_mw_year: ["P90 revenue, MXN per MW-year", "Ingreso P90, MXN por MW-año"],
    floor_mxn_per_mw_year: ["Floor, MXN per MW-year", "Piso, MXN por MW-año"], upside_split_owner_pct: ["Owner’s share above the floor, %", "Parte del dueño sobre el piso, %"],
    zone: ["Zone", "Zona"], dg_mw: ["Rooftop solar in the zone, MW", "Solar en techos en la zona, MW"], ppa_mw: ["PPAs managed, MW", "PPA gestionados, MW"], battery: ["Battery", "Batería"], note: ["Note", "Nota"]
  };
  function lineStatus(s) { var c = s === "live" ? "ok" : s === "pilot" ? "peak" : "muted"; return '<span class="chip ' + c + '">' + esc(t("st_" + s)) + "</span>"; }
  function val(v) {
    if (typeof v === "number") return num(v, v % 1 ? 1 : 0);
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number") return num(v[0], 0) + "–" + num(v[1], 0);
    return esc(v);
  }
  function hbar(label, v, max, color, txt) {
    return '<div style="display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:12px;align-items:center"><span class="small">' + esc(label) + "</span>" +
      '<span style="display:flex;align-items:center;gap:8px;min-width:0"><span style="height:14px;border-radius:3px;background:' + color + ";width:" + Math.max(1, v / max * 78).toFixed(1) + '%"></span><span class="mono small" style="white-space:nowrap">' + txt + "</span></span></div>";
  }

  function linesPage(id) {
    if (id) return lineDetail(id);
    return Promise.all([api("/v1/products"), api("/v1/alerts")]).then(function (r) {
      var cards = r[0].map(function (p) {
        return '<a class="card" style="text-decoration:none;color:inherit" href="#/lines/' + esc(p.id) + '">' +
          '<div class="head" style="align-items:center"><span class="eyebrow">' + p.number + "</span>" + lineStatus(p.status) + "</div>" +
          "<h2>" + esc(p.name) + '</h2><p class="small muted" style="margin:0">' + esc(p.buyer) + "</p>" +
          '<p class="small" style="margin:0">' + esc(p.headline) + '</p><span class="small peak">' + esc(p.price) + "</span></a>";
      }).join("");
      frame("lines", '<div class="head"><div><h1 class="title">' + esc(t("lines_title")) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(t("lines_lede")) + "</p></div></div>" +
        '<div class="row" style="align-items:stretch">' + cards + "</div>", r[1].length);
    });
  }

  function lineDetail(id) {
    return Promise.all([api("/v1/products/" + id), api("/v1/alerts")]).then(function (r) {
      var p = r[0], s = p.sample || {};
      var kpis = '<div class="row">' + p.metrics.map(function (m) { return kpi(m.label, val(m.value), ""); }).join("") + "</div>";
      var extra = "";
      if (p.id === "plant-forecasting" && s.realized_mxn) {
        var mx = s.theoretical_max_mxn;
        extra = '<section class="card"><h2>' + esc(t("pf_title")) + "</h2>" +
          hbar(t("pf_realized"), s.realized_mxn, mx, "var(--neutral-mark)", money(s.realized_mxn) + " · " + num(s.realized_mxn / mx * 100, 0) + "%") +
          hbar(t("pf_forecast"), s.with_forecasts_mxn, mx, "var(--charge)", money(s.with_forecasts_mxn) + " · " + num(s.with_forecasts_mxn / mx * 100, 0) + "%") +
          hbar(t("pf_target"), s.target_after_3_months_mxn, mx, "var(--peak)", money(s.target_after_3_months_mxn) + " · " + num(s.target_after_3_months_mxn / mx * 100, 0) + "%") +
          hbar(t("pf_max"), mx, mx, "var(--line-control)", money(mx)) +
          '<div class="lines"><div class="line"><span class="small">' + esc(t("pf_day")) + " · " + esc(t("pf_trader_mtr")) + '</span><span class="mono bad">' + money(s.typical_day.trader_mtr_mxn) + "</span></div>" +
          '<div class="line"><span class="small">' + esc(t("pf_fc_mtr")) + '</span><span class="mono ok">' + money(s.typical_day.forecast_mtr_mxn) + "</span></div></div></section>";
      }
      if (p.id === "critical-hours" && s.tomorrow) {
        extra = '<section class="card"><h2>' + esc(t("ch_title")) + "</h2>" + s.tomorrow.map(function (h) {
          return hbar(t("ch_hour") + " " + hh(h.hour), h.likelihood, 1, "var(--peak)", num(h.likelihood * 100, 0) + "%");
        }).join("") + (s.note ? '<p class="small muted" style="margin:0">' + esc(s.note) + "</p>" : "") + "</section>";
      }
      var rows = Object.keys(s).filter(function (k) { var v = s[k]; return SAMPLE_LBL[k] && (typeof v !== "object" || (Array.isArray(v) && typeof v[0] === "number")) && !(p.id === "critical-hours" && k === "note"); })
        .map(function (k) { return '<div class="line"><span class="small muted">' + esc(SAMPLE_LBL[k][state.lang === "es" ? 1 : 0]) + '</span><span class="mono">' + (k === "status" ? esc(t("st_" + s[k])) : val(s[k])) + "</span></div>"; }).join("");
      var list = function (xs) { return '<ul style="margin:0;padding-left:18px">' + xs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; };
      frame("lines",
        '<div class="head"><div><div class="eyebrow"><a href="#/lines">' + esc(t("l_back")) + "</a> · " + p.number + '</div><h1 class="title">' + esc(p.name) + "</h1>" +
        '<p class="muted" style="margin:4px 0 0">' + esc(p.headline) + "</p></div>" + lineStatus(p.status) + "</div>" + kpis + extra +
        '<div class="row" style="align-items:stretch">' +
        '<section class="card"><h2>' + esc(t("l_buyer")) + '</h2><p style="margin:0">' + esc(p.buyer) + "</p><h2>" + esc(t("l_offer")) + '</h2><p style="margin:0">' + esc(p.offer) + "</p><h2>" + esc(t("l_price")) + '</h2><p class="peak" style="margin:0">' + esc(p.price) + "</p></section>" +
        '<section class="card"><h2>' + esc(t("l_first")) + "</h2>" + list(p.first_customers) + "<h2>" + esc(t("l_needs")) + "</h2>" + list(p.needs) + "</section>" +
        (rows ? '<section class="card"><h2>' + esc(t("l_sample")) + '</h2><div class="lines">' + rows + "</div></section>" : "") + "</div>" + prospectsCard(p.prospects), r[1].length);
    });
  }

  function prospectsCard(ps) {
    if (!ps || !ps.length) return "";
    var col = { customer: "var(--good)", partner: "var(--charge-text)", channel: "var(--peak)", competitor: "var(--critical)" };
    var rows = ps.map(function (x) {
      var host = ""; if (x.url) { try { host = new URL(x.url).hostname.replace(/^www\./, ""); } catch (e) { host = x.url; } }
      return "<tr><td><strong>" + esc(x.name) + '</strong><div class="small" style="color:' + col[x.kind] + '">' + esc(t("k_" + x.kind)) + "</div></td>" +
        '<td class="small">' + esc(x.what) + '</td><td class="small">' + esc(x.evidence) + '</td><td class="small">' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(host) + "</a>" : esc(x.source || "")) + "</td></tr>";
    }).join("");
    return '<section class="card"><h2>' + esc(t("l_prospects")) + ' <span class="muted small mono">' + ps.length + '</span></h2><p class="small muted" style="margin:0">' + esc(t("l_prospects_note")) + "</p>" +
      '<div class="tablewrap"><table><thead><tr><th>' + esc(t("l_company")) + "</th><th>" + esc(t("l_what")) + "</th><th>" + esc(t("l_evidence")) + "</th><th>" + esc(t("l_source")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>";
  }

  function planPage() {
    if (!can("business.read")) { return api("/v1/alerts").then(function (a) { frame("plan", '<div class="card"><h2>' + esc(t("no_access")) + "</h2></div>", a.length); }); }
    return Promise.all([api("/v1/business/plan"), api("/v1/alerts")]).then(function (r) {
      var p = r[0], mx = p.lines[0].arr_2030_usd, total = p.lines.reduce(function (a, l) { return a + l.arr_2030_usd; }, 0);
      var m = function (v) { return "$" + (v / 1e6).toLocaleString(loc(), { maximumFractionDigits: 2 }) + "M"; };
      var bars = p.lines.map(function (l, i) {
        return '<a href="#/lines/' + esc(l.id) + '" style="text-decoration:none;color:inherit" title="' + esc(l.basis) + '">' +
          hbar(l.number + " · " + l.name, l.arr_2030_usd, mx, i === 0 ? "var(--peak)" : "var(--neutral-mark)", m(l.arr_2030_usd)) + "</a>";
      }).join("");
      var ramp = p.ramp.map(function (y) {
        return '<div class="card' + (y.year === p.target_year ? '" style="border-color:var(--peak)' : "") + '"><div class="eyebrow">' + y.year + '</div><div class="mono" style="font-size:24px">' + m(y.arr_usd) + "</div>" +
          '<ul class="small" style="margin:0;padding-left:18px">' + y.milestones.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
      }).join("");
      frame("plan",
        '<div class="head"><div><h1 class="title">' + esc(fmtT("plan_title", { total: m(total) })) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(t("plan_lede")) + "</p></div></div>" +
        '<div class="row">' + kpi(t("plan_total"), m(total), esc(p.note), "") + "</div>" +
        '<section class="card"><h2>' + esc(t("plan_lines")) + "</h2>" + bars + "</section>" +
        '<div class="banner" style="background:var(--peak-tint);border:1px solid var(--peak)"><strong>' + esc(t("plan_gate")) + "</strong><span>" + esc(p.gate) + "</span></div>" +
        '<div class="head" style="align-items:center"><h2 style="font-size:17px;font-weight:500">' + esc(t("plan_ramp")) + '</h2><a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="#/model">' + esc(mt("nav_model")) + ' →</a></div><div class="row" style="align-items:stretch">' + ramp + "</div>" +
        '<section class="card"><h2>' + esc(t("plan_cond")) + '</h2><ol style="margin:0;padding-left:18px">' + p.conditions.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol></section>", r[1].length);
    });
  }


  // ---------- Revenue model page (Genau internal) ----------
  var MT = {
    en: {
      nav_model: "Revenue model", title: "Revenue model, Mexico 2027–2031",
      lede: "Nine product lines, every driver adjustable. Planning estimates, not contracted revenue.",
      reset: "Reset to base", csv: "Download CSV", currency: "Currency", view: "View", gross: "Gross revenue", net: "Net to Genau",
      scenario: "Scenario", bear: "Bear", base: "Base", bull: "Bull", years: "Years", from: "From", to: "to",
      g_lines: "Revenue lines", all: "All", none: "None",
      g_market: "Market", g_bess: "1 · Battery optimization", g_plants: "2 · Plant forecasting", g_critical: "3 · Critical-hour service",
      g_traders: "4 · Supplier and trader forecasts", g_whitelabel: "5 · White-label", g_bank: "6 · Bankability", g_floors: "7 · Revenue floors",
      g_grid: "8 · Grid forecasting", g_qenergy: "9 · QEnergy", g_net: "Net to Genau", g_costs: "Costs",
      gatePass: "Feb 2027 proof passes", gatePass_d: "If not, batteries, critical hours and floors slip a year",
      cfeRunsMixed: "CFE runs its mixed-scheme batteries", cfeRunsMixed_d: "If not, we can win 15% of 1,850 MW",
      conv2GW: "Second call: generation selected", capPriceK: "Capacity price", priceEscalator: "Price increase a year", fx: "MXN per USD",
      feePct: "Our fee, % of battery revenue", bessShare: "Our share of addressable batteries, 2030", arbitrageK: "Battery arbitrage revenue",
      capCredit: "Share of capacity price a battery earns", spreadTrend: "Spread trend", viaQEnergyPct: "Battery MW brought by QEnergy", qenergyCutPct: "QEnergy's cut on those",
      plantsPrice: "Price per MW", plantsPen: "Adoption vs base", criticalPricing: "Pricing", fixed: "Fixed fee", savings: "Share of savings",
      criticalFee: "Fee per site", criticalPen: "Share of qualified users, 2030", savingsShare: "Our share of savings", cutMW: "Load cut per site in critical hours",
      tradersPrice: "Price per firm", tradersClients: "Clients, 2030", wlPrice: "Price per MW", wlTier: "Price above 100 MW per partner", wlPen: "Share of factory batteries, 2030", wlPartners: "Integrator partners, 2030",
      reportK: "Price per report", subK: "Price per subscription", partnerYear: "Floor partner signed in", never: "Never", marginK: "Our margin per MW",
      gridMult: "Contract value vs base", bookGWh: "QEnergy PPA book", feePerMWh: "Fee per MWh", ownershipPct: "Genau's share of Genau Mexico", bookedInJVPct: "Revenue booked in Genau Mexico",
      team2030: "Team, 2030", other2030: "Other operating costs, 2030", costPerHeadK: "Cost per person", infraPct: "Cloud and data, % of revenue", salesPct: "Sales costs, % of revenue",
      k_rev: "Revenue", k_cum: "Cumulative", k_cagr: "Growth a year", k_ebitda: "EBITDA", k_mw: "Battery MW we run", k_target: "vs $30M target, 2030",
      margin: "margin", chart_t: "Revenue by line", chart_target: "$30M target", ebitda_dots: "EBITDA", table_t: "By line and year", total: "Total", net_row: "Net to Genau", costs_row: "Costs", ebitda_row: "EBITDA",
      drivers: "Show volumes and prices", sens_t: "What moves {year} revenue most", sens_d: "Each driver 20% lower and higher, everything else as set",
      scen_t: "Scenarios in {year}", mix_t: "Mix in {year}", notes_t: "How the model works",
      notes: [
        "Revenue in a year = average volume in that year × price that year. Bear, base and bull scale adoption (×0.6 / 1 / 1.35), prices (×0.9 / 1 / 1.1) and how much of the second call gets built.",
        "Batteries: addressable MW = first-call storage (≈1,040 MW) and standalone projects, plus 30% of the generation selected in the second call as it is built. Battery market revenue = arbitrage + capacity price × capacity share, with spreads trending as set. Our fee is a share of that.",
        "CFE mixed-scheme batteries (1,850 MW) count only if CFE does not run them. If the February 2027 scoring fails, battery share drops 20% and batteries, critical hours and floors slip a year.",
        "Critical hours: qualified users grow 8% a year from 1,437. Savings pricing = load cut × capacity price × hit rate × our share.",
        "White-label: the lower rate applies above 100 MW per integrator partner. Floors: a share of our battery MW once a balance-sheet partner is signed.",
        "Net to Genau removes QEnergy's cut on batteries it brings and the 10% of Genau Mexico Genau does not own. Costs: team × cost per person (rising 4% a year), other operating costs (legal, offices, travel, insurance, market fees) and cloud, data and sales as % of revenue."
      ],
      vol: "Volume", price: "Price", units_MW: "MW", units_sites: "sites", units_firms: "firms", units_GWh: "GWh"
    },
    es: {
      nav_model: "Modelo de ingresos", title: "Modelo de ingresos, México 2027–2031",
      lede: "Nueve líneas de producto, cada supuesto ajustable. Estimaciones de planeación, no ingresos contratados.",
      reset: "Volver al caso base", csv: "Descargar CSV", currency: "Moneda", view: "Vista", gross: "Ingreso bruto", net: "Neto para Genau",
      scenario: "Escenario", bear: "Pesimista", base: "Base", bull: "Optimista", years: "Años", from: "De", to: "a",
      g_lines: "Líneas de ingreso", all: "Todas", none: "Ninguna",
      g_market: "Mercado", g_bess: "1 · Optimización de baterías", g_plants: "2 · Pronóstico para plantas", g_critical: "3 · Horas críticas",
      g_traders: "4 · Suministradores y comercializadores", g_whitelabel: "5 · Marca blanca", g_bank: "6 · Bancabilidad", g_floors: "7 · Pisos de ingreso",
      g_grid: "8 · Pronóstico de red", g_qenergy: "9 · QEnergy", g_net: "Neto para Genau", g_costs: "Costos",
      gatePass: "La prueba de feb 2027 se cumple", gatePass_d: "Si no, baterías, horas críticas y pisos se atrasan un año",
      cfeRunsMixed: "CFE opera sus baterías del esquema mixto", cfeRunsMixed_d: "Si no, podemos ganar 15% de 1,850 MW",
      conv2GW: "Segunda convocatoria: generación seleccionada", capPriceK: "Precio de potencia", priceEscalator: "Aumento de precio al año", fx: "MXN por USD",
      feePct: "Nuestra comisión, % del ingreso de la batería", bessShare: "Nuestra parte de las baterías, 2030", arbitrageK: "Ingreso por arbitraje de la batería",
      capCredit: "Parte del precio de potencia que gana la batería", spreadTrend: "Tendencia del diferencial", viaQEnergyPct: "MW de baterías que trae QEnergy", qenergyCutPct: "Comisión de QEnergy sobre esos",
      plantsPrice: "Precio por MW", plantsPen: "Adopción vs base", criticalPricing: "Precio", fixed: "Cuota fija", savings: "Parte del ahorro",
      criticalFee: "Cuota por sitio", criticalPen: "Parte de usuarios calificados, 2030", savingsShare: "Nuestra parte del ahorro", cutMW: "Carga que baja cada sitio en horas críticas",
      tradersPrice: "Precio por empresa", tradersClients: "Clientes, 2030", wlPrice: "Precio por MW", wlTier: "Precio arriba de 100 MW por socio", wlPen: "Parte de baterías industriales, 2030", wlPartners: "Socios integradores, 2030",
      reportK: "Precio por reporte", subK: "Precio por suscripción", partnerYear: "Socio del piso firmado en", never: "Nunca", marginK: "Nuestro margen por MW",
      gridMult: "Valor de contratos vs base", bookGWh: "Cartera de PPA de QEnergy", feePerMWh: "Cuota por MWh", ownershipPct: "Parte de Genau en Genau México", bookedInJVPct: "Ingreso registrado en Genau México",
      team2030: "Equipo, 2030", other2030: "Otros gastos de operación, 2030", costPerHeadK: "Costo por persona", infraPct: "Nube y datos, % del ingreso", salesPct: "Costos de venta, % del ingreso",
      k_rev: "Ingreso", k_cum: "Acumulado", k_cagr: "Crecimiento anual", k_ebitda: "EBITDA", k_mw: "MW de baterías que operamos", k_target: "vs meta de $30M, 2030",
      margin: "margen", chart_t: "Ingreso por línea", chart_target: "Meta $30M", ebitda_dots: "EBITDA", table_t: "Por línea y año", total: "Total", net_row: "Neto para Genau", costs_row: "Costos", ebitda_row: "EBITDA",
      drivers: "Ver volúmenes y precios", sens_t: "Lo que más mueve el ingreso de {year}", sens_d: "Cada supuesto 20% abajo y arriba, todo lo demás como está",
      scen_t: "Escenarios en {year}", mix_t: "Mezcla en {year}", notes_t: "Cómo funciona el modelo",
      notes: [
        "Ingreso del año = volumen promedio del año × precio del año. Pesimista, base y optimista escalan la adopción (×0.6 / 1 / 1.35), los precios (×0.9 / 1 / 1.1) y cuánto de la segunda convocatoria se construye.",
        "Baterías: MW atendibles = almacenamiento de la primera convocatoria (≈1,040 MW) y proyectos independientes, más 30% de la generación seleccionada en la segunda convocatoria conforme se construye. Ingreso de mercado de la batería = arbitraje + precio de potencia × parte de potencia, con la tendencia del diferencial que elijas. Nuestra comisión es una parte de eso.",
        "Las baterías del esquema mixto de CFE (1,850 MW) cuentan solo si CFE no las opera. Si la calificación de febrero 2027 falla, nuestra parte baja 20% y baterías, horas críticas y pisos se atrasan un año.",
        "Horas críticas: los usuarios calificados crecen 8% al año desde 1,437. Precio por ahorro = carga reducida × precio de potencia × tasa de acierto × nuestra parte.",
        "Marca blanca: la tarifa menor aplica arriba de 100 MW por socio integrador. Pisos: una parte de nuestros MW de baterías una vez firmado un socio con balance.",
        "Neto para Genau resta la comisión de QEnergy sobre las baterías que trae y el 10% de Genau México que no es de Genau. Costos: equipo × costo por persona (sube 4% al año), otros gastos de operación (legal, oficinas, viajes, seguros, cuotas de mercado) y nube, datos y ventas como % del ingreso."
      ],
      vol: "Volumen", price: "Precio", units_MW: "MW", units_sites: "sitios", units_firms: "empresas", units_GWh: "GWh"
    }
  };
  function mt(k) { return (MT[state.lang] && MT[state.lang][k]) || MT.en[k] || k; }

  // Sliders: key, min, max, step, display kind. "x.*" keys scale a default yearly array by the chosen 2030 value.
  var MCTRL = {
    market: [["market.conv2GW", 0, 10, 0.5, "gw"], ["market.capPriceK", 80, 400, 5, "kmw"], ["market.priceEscalator", 0, 8, 0.5, "pct"], ["market.fx", 15, 23, 0.1, "fx"]],
    bess: [["bess.feePct", 3, 12, 0.5, "pct"], ["x.bessShare2030", 0.05, 0.8, 0.01, "frac"], ["bess.arbitrageK", 20, 200, 5, "kmw"], ["bess.capCredit", 0, 1, 0.05, "frac"],
      ["bess.spreadTrend", -8, 4, 0.5, "pcty"], ["bess.viaQEnergyPct", 0, 60, 1, "pct"], ["bess.qenergyCutPct", 0, 50, 1, "pct"]],
    plants: [["plants.priceK", 0.5, 5, 0.1, "kmw"], ["x.plantsPen", 25, 250, 5, "pct"]],
    critical: [["critical.feeK", 5, 50, 1, "k"], ["x.criticalPen2030", 0.02, 0.4, 0.01, "frac"], ["critical.savingsShare", 5, 50, 0.5, "pct"], ["critical.cutMW", 0.1, 3, 0.1, "mw"]],
    traders: [["traders.priceK", 50, 400, 10, "k"], ["x.tradersClients2030", 1, 45, 1, "n"]],
    whitelabel: [["whitelabel.priceK", 5, 40, 0.5, "kmw"], ["whitelabel.tierK", 4, 30, 0.5, "kmw"], ["x.wlPen2030", 0.03, 0.5, 0.01, "frac"], ["x.wlPartners2030", 1, 12, 1, "n"]],
    bank: [["bank.reportK", 20, 200, 5, "k"], ["bank.subK", 10, 150, 5, "k"]],
    floors: [["floors.marginK", 2, 25, 0.5, "kmw"]],
    grid: [["x.gridMult", 0, 300, 10, "pct"]],
    qenergy: [["qenergy.bookGWh", 50, 1500, 25, "gwh"], ["qenergy.feePerMWh", 0.1, 3, 0.05, "usdmwh"]],
    net: [["net.ownershipPct", 50, 100, 1, "pct"], ["net.bookedInJVPct", 0, 100, 5, "pct"]],
    costs: [["x.team2030", 4, 80, 1, "n"], ["costs.costPerHeadK", 50, 300, 5, "k"], ["costs.infraPct", 0, 25, 0.5, "pct"], ["costs.salesPct", 0, 25, 0.5, "pct"], ["x.other2030", 0, 6, 0.1, "musd"]]
  };
  var MLABEL = {
    "market.conv2GW": "conv2GW", "market.capPriceK": "capPriceK", "market.priceEscalator": "priceEscalator", "market.fx": "fx",
    "bess.feePct": "feePct", "x.bessShare2030": "bessShare", "bess.arbitrageK": "arbitrageK", "bess.capCredit": "capCredit", "bess.spreadTrend": "spreadTrend",
    "bess.viaQEnergyPct": "viaQEnergyPct", "bess.qenergyCutPct": "qenergyCutPct", "plants.priceK": "plantsPrice", "x.plantsPen": "plantsPen",
    "critical.feeK": "criticalFee", "x.criticalPen2030": "criticalPen", "critical.savingsShare": "savingsShare", "critical.cutMW": "cutMW",
    "traders.priceK": "tradersPrice", "x.tradersClients2030": "tradersClients", "whitelabel.priceK": "wlPrice", "whitelabel.tierK": "wlTier",
    "x.wlPen2030": "wlPen", "x.wlPartners2030": "wlPartners", "bank.reportK": "reportK", "bank.subK": "subK", "floors.marginK": "marginK",
    "x.gridMult": "gridMult", "qenergy.bookGWh": "bookGWh", "qenergy.feePerMWh": "feePerMWh", "net.ownershipPct": "ownershipPct", "net.bookedInJVPct": "bookedInJVPct",
    "x.team2030": "team2030", "x.other2030": "other2030", "costs.costPerHeadK": "costPerHeadK", "costs.infraPct": "infraPct", "costs.salesPct": "salesPct"
  };

  function getPath(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, path, v) { var ks = path.split("."), last = ks.pop(); var t = ks.reduce(function (a, k) { return a[k]; }, o); t[last] = v; }

  function modelBaseUI() {
    var d = PantheonModel.defaults(), v = {};
    Object.keys(MCTRL).forEach(function (g) { MCTRL[g].forEach(function (c) { v[c[0]] = c[0].indexOf("x.") === 0 ? null : getPath(d, c[0]); }); });
    v["x.bessShare2030"] = d.bess.share[3]; v["x.plantsPen"] = 100; v["x.criticalPen2030"] = d.critical.pen[3]; v["x.tradersClients2030"] = d.traders.clients[3];
    v["x.wlPen2030"] = d.whitelabel.pen[3]; v["x.wlPartners2030"] = d.whitelabel.partners[3]; v["x.gridMult"] = 100; v["x.team2030"] = d.costs.team[3]; v["x.other2030"] = d.costs.otherM[3];
    return { scenario: "base", fromYear: 2027, toYear: 2031, currency: "USD", view: "gross", lines: clone(d.lines), v: v,
      gatePass: true, cfeRunsMixed: true, criticalPricing: "fixed", partnerYear: 2028, open: { lines: true, market: true }, showDrivers: false };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function modelInput(s) {
    var d = PantheonModel.defaults(), inp = clone(d);
    inp.scenario = s.scenario; inp.lines = clone(s.lines);
    Object.keys(s.v).forEach(function (k) { if (k.indexOf("x.") !== 0 && s.v[k] != null) setPath(inp, k, Number(s.v[k])); });
    function scale(arr, at, val) { var ref = arr[at] || 1; return arr.map(function (x) { return x * val / ref; }); }
    inp.bess.share = scale(d.bess.share, 3, s.v["x.bessShare2030"]);
    inp.plants.pen = d.plants.pen.map(function (x) { return x * s.v["x.plantsPen"] / 100; });
    inp.critical.pen = scale(d.critical.pen, 3, s.v["x.criticalPen2030"]);
    inp.traders.clients = scale(d.traders.clients, 3, s.v["x.tradersClients2030"]);
    inp.whitelabel.pen = scale(d.whitelabel.pen, 3, s.v["x.wlPen2030"]);
    inp.whitelabel.partners = scale(d.whitelabel.partners, 3, s.v["x.wlPartners2030"]).map(function (x) { return Math.max(1, Math.round(x)); });
    inp.grid.contractsM = d.grid.contractsM.map(function (x) { return x * s.v["x.gridMult"] / 100; });
    inp.costs.team = scale(d.costs.team, 3, s.v["x.team2030"]);
    inp.costs.otherM = scale(d.costs.otherM, 3, s.v["x.other2030"]);
    inp.market.gatePass = s.gatePass; inp.market.cfeRunsMixed = s.cfeRunsMixed; inp.critical.pricing = s.criticalPricing;
    inp.floors.partnerYear = Number(s.partnerYear) || 0;
    return inp;
  }

  var mstate = null;
  function mload() {
    var base = modelBaseUI();
    try { var raw = window.localStorage.getItem("pantheon.model.v1"); if (raw) { var o = JSON.parse(raw); Object.keys(o).forEach(function (k) { if (k === "v" || k === "lines") Object.assign(base[k], o[k]); else base[k] = o[k]; }); } } catch (e) { /* ignore */ }
    return base;
  }
  function msave() { try { window.localStorage.setItem("pantheon.model.v1", JSON.stringify(mstate)); } catch (e) { /* ignore */ } }

  function fmtVal(kind, v) {
    switch (kind) {
      case "gw": return num(v, 1) + " GW";
      case "kmw": return "$" + num(v, v < 10 ? 1 : 0) + "k/MW";
      case "k": return "$" + num(v, 0) + "k";
      case "pct": return num(v, 1) + "%";
      case "pcty": return (v > 0 ? "+" : "") + num(v, 1) + "%/" + (state.lang === "es" ? "año" : "yr");
      case "frac": return num(v * 100, 0) + "%";
      case "fx": return num(v, 1);
      case "mw": return num(v, 1) + " MW";
      case "gwh": return num(v, 0) + " GWh";
      case "usdmwh": return "$" + num(v, 2) + "/MWh";
      case "musd": return "$" + num(v, 1) + "M";
      default: return num(v, 0);
    }
  }
  function money2(usd) {
    var v = mstate.currency === "MXN" ? usd * mstate.v["market.fx"] : usd;
    var pre = mstate.currency === "MXN" ? "MXN " : "$";
    var a = Math.abs(v);
    var s = a >= 1e9 ? num(a / 1e9, 2) + "B" : a >= 1e6 ? num(a / 1e6, a >= 1e8 ? 0 : 1) + "M" : a >= 1e3 ? num(a / 1e3, 0) + "k" : num(a, 0);
    return (v < 0 ? "−" : "") + pre + s;
  }

  function mcontrols() {
    var s = mstate;
    function group(id, inner) {
      return '<details class="mgroup" data-g="' + id + '"' + (s.open[id] ? " open" : "") + "><summary>" + esc(mt("g_" + id)) + "</summary><div class=\"mbody\">" + inner + "</div></details>";
    }
    function slider(c) {
      var k = c[0], v = s.v[k];
      return '<label class="mslider"><span class="ml"><span>' + esc(mt(MLABEL[k])) + '</span><output class="mono" data-out="' + k + '">' + esc(fmtVal(c[4], v)) + "</output></span>" +
        '<input type="range" min="' + c[1] + '" max="' + c[2] + '" step="' + c[3] + '" value="' + v + '" data-k="' + k + '" data-kind="' + c[4] + '"></label>';
    }
    function toggle(k, d) {
      return '<label class="mtoggle"><input type="checkbox" data-t="' + k + '"' + (s[k] ? " checked" : "") + "><span><span>" + esc(mt(k)) + '</span><span class="small muted">' + esc(mt(d)) + "</span></span></label>";
    }
    function sliders(g) { return MCTRL[g].map(slider).join(""); }
    var yrs = PantheonModel.YEARS;
    var head = '<div class="mgroup mtop"><div class="mbody">' +
      '<div class="ml"><span>' + esc(mt("scenario")) + '</span></div><div class="seg mseg" role="group">' + ["bear", "base", "bull"].map(function (x) {
        return '<button type="button" data-scen="' + x + '" aria-pressed="' + (s.scenario === x) + '">' + esc(mt(x)) + "</button>";
      }).join("") + "</div>" +
      '<div class="ml" style="margin-top:12px"><span>' + esc(mt("years")) + '</span></div><div class="row" style="gap:8px;align-items:center">' +
      '<select data-y="fromYear" aria-label="' + esc(mt("from")) + '">' + yrs.map(function (y) { return "<option" + (s.fromYear === y ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select>" +
      '<span class="muted small" style="flex:none">' + esc(mt("to")) + '</span><select data-y="toYear" aria-label="' + esc(mt("to")) + '">' + yrs.map(function (y) { return "<option" + (s.toYear === y ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select></div></div></div>";
    var lines = PantheonModel.LINES.map(function (L) {
      return '<label class="mline"><input type="checkbox" data-line="' + L.id + '"' + (s.lines[L.id] ? " checked" : "") + '><i style="background:' + L.color + '"></i><span>' + L.n + " · " + esc(L[state.lang] || L.en) + "</span></label>";
    }).join("") + '<div class="row" style="gap:8px;margin-top:6px"><button class="btn sm" type="button" data-lines="all">' + esc(mt("all")) + '</button><button class="btn sm" type="button" data-lines="none">' + esc(mt("none")) + "</button></div>";
    var crit = '<label class="mslider"><span class="ml"><span>' + esc(mt("criticalPricing")) + '</span></span><select data-sel="criticalPricing"><option value="fixed"' + (s.criticalPricing === "fixed" ? " selected" : "") + ">" + esc(mt("fixed")) + '</option><option value="savings"' + (s.criticalPricing === "savings" ? " selected" : "") + ">" + esc(mt("savings")) + "</option></select></label>";
    var floorYear = '<label class="mslider"><span class="ml"><span>' + esc(mt("partnerYear")) + '</span></span><select data-sel="partnerYear">' + [0].concat(yrs).map(function (y) {
      return '<option value="' + y + '"' + (Number(s.partnerYear) === y ? " selected" : "") + ">" + (y ? y : esc(mt("never"))) + "</option>";
    }).join("") + "</select></label>";
    return head + group("lines", lines) +
      group("market", toggle("gatePass", "gatePass_d") + toggle("cfeRunsMixed", "cfeRunsMixed_d") + sliders("market")) +
      group("bess", sliders("bess")) + group("plants", sliders("plants")) + group("critical", crit + sliders("critical")) +
      group("traders", sliders("traders")) + group("whitelabel", sliders("whitelabel")) + group("bank", sliders("bank")) +
      group("floors", floorYear + sliders("floors")) + group("grid", sliders("grid")) + group("qenergy", sliders("qenergy")) +
      group("net", sliders("net")) + group("costs", sliders("costs"));
  }

  function mresult(s) { return PantheonModel.run(modelInput(s)); }
  function series(r) { return mstate.view === "net" ? r.net : r.total; }

  function moutputs() {
    var s = mstate, r = mresult(s), YRS = r.years;
    var i0 = YRS.indexOf(s.fromYear), i1 = YRS.indexOf(s.toYear);
    if (i1 < i0) { var tmp = i0; i0 = i1; i1 = tmp; }
    var idx = []; for (var i = i0; i <= i1; i++) idx.push(i);
    var lines = PantheonModel.LINES.filter(function (L) { return s.lines[L.id]; });
    var ser = series(r), fin = idx[idx.length - 1], first = idx[0];
    var cum = idx.reduce(function (a, i) { return a + ser[i]; }, 0);
    var cagr = idx.length > 1 && ser[first] > 0 ? (Math.pow(ser[fin] / ser[first], 1 / (idx.length - 1)) - 1) * 100 : null;
    var i2030 = YRS.indexOf(2030);
    var kp = '<div class="row">' +
      kpi(mt("k_rev") + " " + YRS[fin], money2(ser[fin]), esc(s.view === "net" ? mt("net") : mt("gross"))) +
      kpi(mt("k_cum") + " " + YRS[first] + "–" + YRS[fin], money2(cum), "") +
      kpi(mt("k_cagr"), cagr == null ? "—" : num(cagr, 0) + "%", YRS[first] + "–" + YRS[fin]) +
      kpi(mt("k_ebitda") + " " + YRS[fin], money2(r.ebitda[fin]), num(r.total[fin] ? r.ebitda[fin] / r.total[fin] * 100 : 0, 0) + "% " + esc(mt("margin"))) +
      kpi(mt("k_mw") + " " + YRS[fin], num(s.lines.bess ? r.bessMW[fin] : 0, 0) + " MW", "") +
      kpi(mt("k_target"), (r.total[i2030] >= 30e6 ? '<span class="ok">' : '<span class="warn">') + (r.total[i2030] >= 30e6 ? "+" : "−") + money2(Math.abs(r.total[i2030] - 30e6)) + "</span>", money2(r.total[i2030]) + " · 2030") + "</div>";

    // Stacked bars
    var W = 760, H = 330, L = 64, R = 16, T = 24, B = 40, ih = H - T - B, n = idx.length;
    var lineVals = function (L1, i) { var v = r.lines[L1.id][i]; return s.view === "net" && r.total[i] ? v * r.net[i] / r.total[i] : v; };
    var maxV = Math.max(30e6 * 1.08, Math.max.apply(null, idx.map(function (i) { return ser[i]; })) * 1.12, 1);
    var step = maxV > 60e6 ? 20e6 : maxV > 25e6 ? 10e6 : maxV > 10e6 ? 5e6 : 2e6;
    var y = function (v) { return T + ih - v / maxV * ih; };
    var bw = (W - L - R) / n, barw = Math.min(90, bw * 0.56);
    var grid = ""; for (var g = 0; g <= maxV; g += step) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="var(--line-subtle)"/><text x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="var(--ink-muted)" class="mono">' + esc(money2(g)) + "</text>";
    var bars = idx.map(function (i, j) {
      var x = L + j * bw + (bw - barw) / 2, acc = 0;
      var segs = lines.map(function (L1) {
        var v = lineVals(L1, i); if (v <= 0) return "";
        var y1 = y(acc + v), h = y(acc) - y1; acc += v;
        return '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + barw.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + L1.color + '"><title>' + esc(L1[state.lang] || L1.en) + " " + YRS[i] + ": " + esc(money2(v)) + "</title></rect>";
      }).join("");
      var ebd = s.view === "gross" ? '<circle cx="' + (x + barw / 2).toFixed(1) + '" cy="' + y(Math.max(0, r.ebitda[i])).toFixed(1) + '" r="4.5" fill="var(--bg-000)" stroke="var(--ink)" stroke-width="2"><title>EBITDA ' + YRS[i] + ": " + esc(money2(r.ebitda[i])) + "</title></circle>" : "";
      return segs + ebd + '<text x="' + (x + barw / 2).toFixed(1) + '" y="' + (y(acc) - 8).toFixed(1) + '" text-anchor="middle" font-size="12" fill="var(--ink)" class="mono">' + esc(money2(acc)) + "</text>" +
        '<text x="' + (x + barw / 2).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12" fill="var(--ink-3)">' + YRS[i] + "</text>";
    }).join("");
    var tgt = idx.indexOf(i2030) >= 0 ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(30e6) + '" y2="' + y(30e6) + '" stroke="var(--peak)" stroke-dasharray="5 5"/><text x="' + (L + 6) + '" y="' + (y(30e6) - 6) + '" font-size="11" fill="var(--peak)">' + esc(mt("chart_target")) + "</text>" : "";
    var legend = '<div class="mlegend">' + lines.map(function (L1) { return '<span><i style="background:' + L1.color + '"></i>' + L1.n + " · " + esc(L1[state.lang] || L1.en) + "</span>"; }).join("") +
      (s.view === "gross" ? '<span><i style="background:var(--bg-000);border:2px solid var(--ink);border-radius:50%"></i>' + esc(mt("ebitda_dots")) + "</span>" : "") + "</div>";
    var chart = '<section class="card"><h2>' + esc(mt("chart_t")) + '</h2><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto" role="img" aria-label="' + esc(mt("chart_t")) + '">' + grid + tgt + bars + "</svg>" + legend + "</section>";

    // Table
    var th = "<tr><th></th>" + idx.map(function (i) { return '<th class="mono" style="text-align:right">' + YRS[i] + "</th>"; }).join("") + '<th class="mono" style="text-align:right">' + YRS[first] + "–" + YRS[fin] + "</th></tr>";
    var rowOf = function (label, arr, cls, sw) {
      return '<tr class="' + (cls || "") + '"><td>' + (sw ? '<i class="sw" style="background:' + sw + '"></i>' : "") + esc(label) + "</td>" + idx.map(function (i) { return '<td class="mono" style="text-align:right">' + esc(money2(arr[i])) + "</td>"; }).join("") +
        '<td class="mono" style="text-align:right">' + esc(money2(idx.reduce(function (a, i) { return a + arr[i]; }, 0))) + "</td></tr>";
    };
    var drvRow = function (L1) {
      var d = r.drivers[L1.id]; if (!d || !s.showDrivers) return "";
      return '<tr class="drv"><td class="small muted">' + esc(mt("vol")) + " · " + esc(mt("price")) + "</td>" + idx.map(function (i) {
        var x = d[i]; var u = mt("units_" + x.unit); if (u.indexOf("units_") === 0) u = x.unit;
        return '<td class="small muted mono" style="text-align:right">' + num(x.volume, x.volume < 20 ? 1 : 0) + " " + esc(u) + (x.price != null ? "<br>" + esc(money2(x.price)) : "") + "</td>";
      }).join("") + "<td></td></tr>";
    };
    var tb = lines.map(function (L1) { return rowOf(L1.n + " · " + (L1[state.lang] || L1.en), r.lines[L1.id], "", L1.color) + drvRow(L1); }).join("") +
      rowOf(mt("total"), r.total, "tot") + rowOf(mt("net_row"), r.net, "") + rowOf(mt("costs_row"), r.costs.map(function (v) { return -v; }), "") + rowOf(mt("ebitda_row"), r.ebitda, "tot");
    var table = '<section class="card"><div class="head" style="align-items:center"><h2>' + esc(mt("table_t")) + '</h2><label class="mtoggle" style="flex:none"><input type="checkbox" data-t="showDrivers"' + (s.showDrivers ? " checked" : "") + "><span>" + esc(mt("drivers")) + '</span></label></div><div class="tablewrap"><table class="mtable"><thead>' + th + "</thead><tbody>" + tb + "</tbody></table></div></section>";

    // Sensitivity (tornado) on the final selected year
    var keys = [["x.bessShare2030", "bessShare", "1"], ["bess.feePct", "feePct", "1"], ["market.capPriceK", "capPriceK", ""], ["bess.arbitrageK", "arbitrageK", "1"], ["market.conv2GW", "conv2GW", ""],
      ["whitelabel.priceK", "wlPrice", "5"], ["x.wlPen2030", "wlPen", "5"], ["plants.priceK", "plantsPrice", "2"], ["x.criticalPen2030", "criticalPen", "3"], ["traders.priceK", "tradersPrice", "4"],
      ["x.team2030", "team2030", ""]];
    var baseV = ser[fin];
    var sens = keys.map(function (k) {
      var lo = clone(s), hi = clone(s); lo.v[k[0]] = s.v[k[0]] * 0.8; hi.v[k[0]] = s.v[k[0]] * 1.2;
      var a = series(mresult(lo))[fin], b = series(mresult(hi))[fin];
      return { k: k[1], p: k[2], lo: Math.min(a, b) - baseV, hi: Math.max(a, b) - baseV };
    }).filter(function (x) { return Math.abs(x.hi) + Math.abs(x.lo) > 1; }).sort(function (a, b) { return (b.hi - b.lo) - (a.hi - a.lo); });
    var sm = Math.max.apply(null, sens.map(function (x) { return Math.max(Math.abs(x.lo), Math.abs(x.hi)); }).concat([1]));
    var sW = 760, sL = 300, sHalf = (sW - sL - 150) / 2, sMid = sL + 75 + sHalf, rh = 26, sH = sens.length * rh + 20;
    var srows = sens.map(function (x, j) {
      var yy = 10 + j * rh;
      return '<text x="' + (sL - 10) + '" y="' + (yy + 13) + '" text-anchor="end" font-size="12" fill="var(--ink-2)">' + esc((x.p ? x.p + " · " : "") + mt(x.k)) + "</text>" +
        '<rect x="' + (sMid + x.lo / sm * sHalf).toFixed(1) + '" y="' + (yy + 2) + '" width="' + (-x.lo / sm * sHalf).toFixed(1) + '" height="16" fill="var(--critical)" opacity=".75"/>' +
        '<rect x="' + sMid + '" y="' + (yy + 2) + '" width="' + (x.hi / sm * sHalf).toFixed(1) + '" height="16" fill="var(--good)" opacity=".75"/>' +
        '<text x="' + (sMid + x.lo / sm * sHalf - 6).toFixed(1) + '" y="' + (yy + 14) + '" text-anchor="end" font-size="11" fill="var(--ink-muted)" class="mono">' + esc(money2(x.lo)) + "</text>" +
        '<text x="' + (sMid + x.hi / sm * sHalf + 6).toFixed(1) + '" y="' + (yy + 14) + '" font-size="11" fill="var(--ink-muted)" class="mono">' + (x.hi >= 0 ? "+" : "") + esc(money2(x.hi)) + "</text>";
    }).join("");
    var sensCard = '<section class="card"><h2>' + esc(mt("sens_t").replace("{year}", YRS[fin])) + '</h2><p class="small muted" style="margin:0">' + esc(mt("sens_d")) + "</p>" +
      '<svg viewBox="0 0 ' + sW + " " + sH + '" style="width:100%;height:auto" role="img" aria-label="' + esc(mt("sens_t").replace("{year}", YRS[fin])) + '"><line x1="' + sMid + '" x2="' + sMid + '" y1="4" y2="' + (sH - 4) + '" stroke="var(--line-control)"/>' + srows + "</svg></section>";

    // Scenarios + mix
    var scen = ["bear", "base", "bull"].map(function (x) { var c = clone(s); c.scenario = x; return { x: x, v: series(mresult(c))[fin] }; });
    var smax = Math.max.apply(null, scen.map(function (z) { return z.v; }).concat([1]));
    var scenCard = '<section class="card"><h2>' + esc(mt("scen_t").replace("{year}", YRS[fin])) + "</h2>" + scen.map(function (z) {
      return '<div class="mbar"><span class="small">' + esc(mt(z.x)) + '</span><span class="track"><i style="width:' + (z.v / smax * 100).toFixed(1) + "%;background:" + (z.x === s.scenario ? "var(--peak)" : "var(--neutral-mark)") + '"></i></span><span class="mono small">' + esc(money2(z.v)) + "</span></div>";
    }).join("") + "</section>";
    var tot = lines.reduce(function (a, L1) { return a + r.lines[L1.id][fin]; }, 0) || 1;
    var mix = '<section class="card"><h2>' + esc(mt("mix_t").replace("{year}", YRS[fin])) + "</h2>" + lines.slice().sort(function (a, b) { return r.lines[b.id][fin] - r.lines[a.id][fin]; }).map(function (L1) {
      var v = r.lines[L1.id][fin];
      return '<div class="mbar"><span class="small">' + L1.n + " · " + esc(L1[state.lang] || L1.en) + '</span><span class="track"><i style="width:' + (v / tot * 100).toFixed(1) + "%;background:" + L1.color + '"></i></span><span class="mono small">' + num(v / tot * 100, 0) + "%</span></div>";
    }).join("") + "</section>";

    var notes = '<section class="card"><h2>' + esc(mt("notes_t")) + '</h2><ul class="small" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + mt("notes").map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>";
    return kp + chart + '<div class="row" style="align-items:stretch">' + scenCard + mix + "</div>" + sensCard + table + notes;
  }

  function mcsv() {
    var s = mstate, r = mresult(s), YRS = r.years, rows = [["line"].concat(YRS)];
    PantheonModel.LINES.forEach(function (L1) { if (s.lines[L1.id]) rows.push([L1.n + " " + L1.en].concat(r.lines[L1.id].map(Math.round))); });
    rows.push(["Total"].concat(r.total.map(Math.round)), ["Net to Genau"].concat(r.net.map(Math.round)), ["Costs"].concat(r.costs.map(Math.round)), ["EBITDA"].concat(r.ebitda.map(Math.round)), ["Battery MW"].concat(r.bessMW.map(Math.round)));
    rows.push([], ["scenario", s.scenario], ["currency", "USD"]);
    Object.keys(s.v).forEach(function (k) { rows.push([k, s.v[k]]); });
    ["gatePass", "cfeRunsMixed", "criticalPricing", "partnerYear"].forEach(function (k) { rows.push([k, s[k]]); });
    var csv = rows.map(function (r1) { return r1.join(","); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "genau-revenue-model-" + s.scenario + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function modelPage() {
    if (!can("business.read")) { return api("/v1/alerts").then(function (a) { frame("model", '<div class="card"><h2>' + esc(t("no_access")) + "</h2></div>", a.length); }); }
    if (!window.PantheonModel) { return Promise.reject({ message: "Model not loaded" }); }
    return api("/v1/alerts").then(function (al) {
      if (!mstate) mstate = mload();
      var s = mstate;
      frame("model",
        '<div class="head"><div><h1 class="title">' + esc(mt("title")) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(mt("lede")) + "</p></div>" +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
        '<div class="seg" role="group" aria-label="' + esc(mt("view")) + '"><button type="button" data-mview="gross" aria-pressed="' + (s.view === "gross") + '">' + esc(mt("gross")) + '</button><button type="button" data-mview="net" aria-pressed="' + (s.view === "net") + '">' + esc(mt("net")) + "</button></div>" +
        '<div class="seg" role="group" aria-label="' + esc(mt("currency")) + '"><button type="button" data-mcur="USD" aria-pressed="' + (s.currency === "USD") + '">USD</button><button type="button" data-mcur="MXN" aria-pressed="' + (s.currency === "MXN") + '">MXN</button></div>' +
        '<button class="btn" type="button" data-mact="csv">' + esc(mt("csv")) + '</button><button class="btn" type="button" data-mact="reset">' + esc(mt("reset")) + "</button></div></div>" +
        '<div class="mgrid"><aside class="mctrl" id="mctrl">' + mcontrols() + '</aside><div class="mout" id="mout">' + moutputs() + "</div></div>", al.length);
      var ctrl = document.getElementById("mctrl"), out = document.getElementById("mout");
      var raf = null;
      function redraw() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { out.innerHTML = moutputs(); msave(); }); }
      ctrl.addEventListener("input", function (e) {
        var el = e.target;
        if (el.dataset.k) { s.v[el.dataset.k] = Number(el.value); var o = ctrl.querySelector('[data-out="' + el.dataset.k + '"]'); if (o) o.textContent = fmtVal(el.dataset.kind, Number(el.value)); redraw(); }
      });
      ctrl.addEventListener("change", function (e) {
        var el = e.target;
        if (el.dataset.line) { s.lines[el.dataset.line] = el.checked; redraw(); }
        else if (el.dataset.t) { s[el.dataset.t] = el.checked; redraw(); }
        else if (el.dataset.sel) { s[el.dataset.sel] = el.value; redraw(); }
        else if (el.dataset.y) { s[el.dataset.y] = Number(el.value); redraw(); }
      });
      ctrl.addEventListener("toggle", function (e) { var d = e.target; if (d.dataset && d.dataset.g) { s.open[d.dataset.g] = d.open; msave(); } }, true);
      ctrl.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (b.dataset.scen) { s.scenario = b.dataset.scen; ctrl.querySelectorAll("[data-scen]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.scen === s.scenario)); }); redraw(); }
        if (b.dataset.lines) { var on = b.dataset.lines === "all"; Object.keys(s.lines).forEach(function (k) { s.lines[k] = on; }); ctrl.querySelectorAll("[data-line]").forEach(function (x) { x.checked = on; }); redraw(); }
      });
      out.addEventListener("change", function (e) { if (e.target.dataset.t === "showDrivers") { s.showDrivers = e.target.checked; redraw(); } });
      app.querySelectorAll("[data-mview],[data-mcur],[data-mact]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.dataset.mview) s.view = b.dataset.mview;
          if (b.dataset.mcur) s.currency = b.dataset.mcur;
          if (b.dataset.mact === "csv") { mcsv(); return; }
          if (b.dataset.mact === "reset") { mstate = modelBaseUI(); msave(); }
          msave(); route();
        });
      });
    });
  }


  // ---------- QEnergy: offer files and settlements ----------
  Object.assign(T.en, {
    nav_qenergy: "QEnergy", role_partner: "QEnergy (Market Participant)", role_partner_d: "Downloads Atotonilco's offer files and settlements.",
    q_title: "Offers for QEnergy", q_lede: "Pantheon's forecast for each day, in QEnergy's own templates. QEnergy submits to CENACE; Pantheon never does.",
    q_day: "Operating day", q_sale: "Sales offer (Oferta No Despachable)", q_sale_d: "One day, plant {central}, unit {unidad}.",
    q_buy: "Purchase offer (Oferta de Compra)", q_buy_d: "Load centre {cc}. Same hourly profile for each day in the range.", q_days: "Days",
    q_download: "Download .xlsx", q_received: "Forecast received", q_version: "version", q_model: "model", q_fp: "SHA-256",
    q_sample: "Sample forecast. The Pantheon engine's forecasts replace it once connected.",
    q_hour: "Hour", q_sell: "Sale MW", q_price: "Price MXN/MWh", q_fixed: "Fixed purchase MW", q_segs: "Purchase blocks",
    q_total: "Total MWh offered", q_peak: "Peak hour", q_settle: "Settlement", q_month: "Month",
    q_settle_d: "Day-ahead revenue = cleared MW × day-ahead price. Real-time deviation = (metered − cleared) × real-time price. MXN.",
    q_none: "No results posted for this month yet.", q_csv: "Download .csv",
    q_cols: ["Day", "Offered MWh", "Cleared MWh", "Metered MWh", "Day-ahead MXN", "Real-time dev. MXN", "Total MXN"],
    q_no_fc: "No forecast for this day yet."
  });
  Object.assign(T.es, {
    nav_qenergy: "QEnergy", role_partner: "QEnergy (Participante del Mercado)", role_partner_d: "Descarga las ofertas y liquidaciones de Atotonilco.",
    q_title: "Ofertas para QEnergy", q_lede: "El pronóstico de Pantheon de cada día, en las plantillas de QEnergy. QEnergy presenta al CENACE; Pantheon nunca lo hace.",
    q_day: "Día de operación", q_sale: "Oferta de venta (Oferta No Despachable)", q_sale_d: "Un día, central {central}, unidad {unidad}.",
    q_buy: "Oferta de compra", q_buy_d: "Centro de carga {cc}. Mismo perfil horario para cada día del rango.", q_days: "Días",
    q_download: "Descargar .xlsx", q_received: "Pronóstico recibido", q_version: "versión", q_model: "modelo", q_fp: "SHA-256",
    q_sample: "Pronóstico de ejemplo. Los pronósticos del motor de Pantheon lo reemplazan al conectarse.",
    q_hour: "Hora", q_sell: "Venta MW", q_price: "Precio MXN/MWh", q_fixed: "Compra fija MW", q_segs: "Bloques de compra",
    q_total: "Total MWh ofertados", q_peak: "Hora pico", q_settle: "Liquidación", q_month: "Mes",
    q_settle_d: "Ingreso MDA = MW asignados × PML MDA. Desviación MTR = (medido − asignado) × PML MTR. MXN.",
    q_none: "Aún no hay resultados para este mes.", q_csv: "Descargar .csv",
    q_cols: ["Día", "Ofertado MWh", "Asignado MWh", "Medido MWh", "Ingreso MDA", "Desviación MTR", "Total MXN"],
    q_no_fc: "Aún no hay pronóstico para este día."
  });

  function download(path, fallbackName) {
    var slow = setTimeout(function () { wake.hidden = false; }, 2500);
    return fetch(API + path, { headers: { "X-API-Key": state.key || "", "Accept-Language": state.lang === "es" ? "es-MX" : "en" } }).then(function (r) {
      clearTimeout(slow); wake.hidden = true;
      if (!r.ok) return r.json().then(function (j) { throw j.error || { message: "Error " + r.status }; });
      var cd = r.headers.get("Content-Disposition") || "", m = /filename="([^"]+)"/.exec(cd);
      return r.blob().then(function (b) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = m ? m[1] : fallbackName;
        document.body.appendChild(a); a.click(); a.remove();
      });
    }).catch(function (e) { clearTimeout(slow); wake.hidden = true; toast((e && e.message) || t("err_network"), true); });
  }

  var qsel = { site: "atotonilco", days: 7 };
  function qenergyPage(arg) {
    var site = qsel.site, base = "/v1/qenergy/sites/" + site;
    return Promise.all([api("/v1/qenergy/sites"), api(base + "/forecasts")]).then(function (r) {
      var s = r[0].filter(function (x) { return x.id === site; })[0] || r[0][0];
      var list = r[1], day = arg || (list[0] && list[0].day);
      var month = (qsel.month || (day || "2026-10-01").slice(0, 7));
      return Promise.all([day ? api(base + "/forecasts/" + day).catch(function () { return null; }) : Promise.resolve(null),
        api(base + "/settlements?month=" + month)]).then(function (x) { return [s, list, day, x[0], x[1], month]; });
    }).then(function (v) {
      var s = v[0], list = v[1], day = v[2], f = v[3], st = v[4], month = v[5];
      var fill = function (k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, n) { return o[n]; }); };
      var opts = list.map(function (d) { return '<option value="' + d.day + '"' + (d.day === day ? " selected" : "") + ">" + esc(dateLong(d.day)) + "</option>"; }).join("");
      var meta = f ? '<p class="small muted mono" style="margin:0">' + esc(t("q_received")) + " " + esc(dateTime(f.received_at)) + " · " + esc(t("q_version")) + " " + f.version +
        " · " + esc(t("q_model")) + " " + esc(f.model_version) + " · " + esc(t("q_fp")) + " " + esc(f.sha256.slice(0, 16)) + "…</p>" +
        (f.sample ? '<div class="banner" style="background:var(--peak-tint);border:1px solid var(--peak)"><span>' + esc(t("q_sample")) + "</span></div>" : "") : "";
      var hrs = f ? f.hours : [];
      var tot = hrs.reduce(function (a, h) { return a + h.sell_mw; }, 0);
      var peak = hrs.reduce(function (a, h) { return h.sell_mw > a.sell_mw ? h : a; }, { sell_mw: -1, hour: 0 });
      var maxMw = Math.max.apply(null, hrs.map(function (h) { return h.sell_mw; }).concat([0.0001]));
      var rows = hrs.map(function (h) {
        return '<tr><td class="mono">' + h.hour + '</td><td><span style="display:inline-block;height:8px;border-radius:2px;background:var(--charge);width:' + (h.sell_mw / maxMw * 80).toFixed(1) + 'px;margin-right:8px"></span><span class="mono">' + num(h.sell_mw, 3) +
          '</span></td><td class="mono">' + num(h.sell_price, 0) + '</td><td class="mono">' + num(h.buy_fixed_mw, 3) + '</td><td class="mono small">' +
          (h.buy_segments.length ? h.buy_segments.map(function (g) { return num(g.mw, 3) + " MW @ " + num(g.price, 0); }).join(" · ") : "—") + "</td></tr>";
      }).join("");
      var daysSel = '<select data-qdays style="background:var(--bg-300);color:var(--ink);border:1px solid var(--line-control);border-radius:6px;min-height:40px;padding:0 8px">' +
        [1, 2, 3, 4, 5, 6, 7].map(function (n) { return "<option" + (n === qsel.days ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select>";
      var months = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"];
      if (months.indexOf(month) < 0) months.push(month);
      var mSel = '<select data-qmonth style="background:var(--bg-300);color:var(--ink);border:1px solid var(--line-control);border-radius:6px;min-height:40px;padding:0 8px">' +
        months.map(function (m) { return "<option" + (m === month ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select>";
      var srows = st.days.map(function (d) {
        return '<tr><td class="mono">' + d.day + "</td>" + ["offered_mwh", "cleared_mwh", "measured_mwh"].map(function (k) { return '<td class="mono" style="text-align:right">' + num(d[k], 3) + "</td>"; }).join("") +
          ["mda_mxn", "mtr_mxn", "total_mxn"].map(function (k) { return '<td class="mono' + (d[k] < 0 ? " bad" : "") + '" style="text-align:right">' + num(d[k], 0) + "</td>"; }).join("") + "</tr>";
      }).join("");
      var sum = function (k) { return st.days.reduce(function (a, d) { return a + d[k]; }, 0); };
      var stot = st.days.length ? '<tr class="tot"><td><strong>Total</strong></td>' + ["offered_mwh", "cleared_mwh", "measured_mwh"].map(function (k) { return '<td class="mono" style="text-align:right"><strong>' + num(sum(k), 3) + "</strong></td>"; }).join("") +
        ["mda_mxn", "mtr_mxn", "total_mxn"].map(function (k) { return '<td class="mono" style="text-align:right"><strong>' + num(sum(k), 0) + "</strong></td>"; }).join("") + "</tr>" : "";
      var cols = t("q_cols");
      frame("qenergy",
        '<div class="head"><div><div class="eyebrow">' + esc(s.market_participant) + " · " + esc(s.name) + '</div><h1 class="title">' + esc(t("q_title")) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(t("q_lede")) + "</p></div></div>" +
        '<section class="card"><label class="small muted" for="qday">' + esc(t("q_day")) + '</label><select id="qday" data-qday style="background:var(--bg-300);color:var(--ink);border:1px solid var(--line-control);border-radius:6px;min-height:44px;padding:0 10px;font:inherit;max-width:360px">' + opts + "</select>" + meta + "</section>" +
        (f ? '<div class="row" style="align-items:stretch">' +
          '<section class="card"><h2>' + esc(t("q_sale")) + '</h2><p class="small muted" style="margin:0">' + esc(fill("q_sale_d", s)) + '</p><div class="row" style="gap:12px">' +
          kpi(t("q_total"), num(tot, 3), "") + kpi(t("q_peak"), peak.hour ? hh(peak.hour - 1).replace(":00", "") + "–" + peak.hour + " h" : "—", num(Math.max(peak.sell_mw, 0), 3) + " MW") + '</div><button class="btn primary" type="button" data-qdl="venta">' + esc(t("q_download")) + "</button></section>" +
          '<section class="card"><h2>' + esc(t("q_buy")) + '</h2><p class="small muted" style="margin:0">' + esc(fill("q_buy_d", { cc: s.centro_carga })) + '</p><label class="small muted">' + esc(t("q_days")) + " " + daysSel + "</label>" +
          '<button class="btn primary" type="button" data-qdl="compra">' + esc(t("q_download")) + "</button></section></div>" +
          '<section class="card"><div class="tablewrap"><table><thead><tr><th>' + esc(t("q_hour")) + "</th><th>" + esc(t("q_sell")) + "</th><th>" + esc(t("q_price")) + "</th><th>" + esc(t("q_fixed")) + "</th><th>" + esc(t("q_segs")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>"
          : '<div class="card"><h2>' + esc(t("q_no_fc")) + "</h2></div>") +
        '<section class="card"><div class="head" style="align-items:center"><h2>' + esc(t("q_settle")) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="small muted">' + esc(t("q_month")) + "</span>" + mSel +
        '<button class="btn" type="button" data-qdl="liq-xlsx">' + esc(t("q_download")) + '</button><button class="btn" type="button" data-qdl="liq-csv">' + esc(t("q_csv")) + "</button></div></div>" +
        '<p class="small muted" style="margin:0">' + esc(t("q_settle_d")) + (st.sample_data ? " · " + esc(t("sample")) : "") + "</p>" +
        (st.days.length ? '<div class="tablewrap"><table class="mtable"><thead><tr>' + cols.map(function (c, i) { return "<th" + (i ? ' style="text-align:right"' : "") + ">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + srows + stot + "</tbody></table></div>"
          : '<p class="muted">' + esc(t("q_none")) + "</p>") + "</section>", 0);
      var root = document.getElementById("app");
      var dsel = root.querySelector("[data-qday]");
      if (dsel) dsel.addEventListener("change", function () { location.hash = "#/qenergy/" + dsel.value; });
      var nsel = root.querySelector("[data-qdays]");
      if (nsel) nsel.addEventListener("change", function () { qsel.days = Number(nsel.value); });
      var msel = root.querySelector("[data-qmonth]");
      if (msel) msel.addEventListener("change", function () { qsel.month = msel.value; route(); });
      root.querySelectorAll("[data-qdl]").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.dataset.qdl;
          if (k === "venta") download("/v1/qenergy/sites/" + site + "/offers/" + day + "/venta.xlsx", "venta.xlsx");
          if (k === "compra") download("/v1/qenergy/sites/" + site + "/offers/" + day + "/compra.xlsx?days=" + qsel.days, "compra.xlsx");
          if (k === "liq-xlsx") download("/v1/qenergy/sites/" + site + "/settlements?month=" + month + "&format=xlsx", "liquidacion.xlsx");
          if (k === "liq-csv") download("/v1/qenergy/sites/" + site + "/settlements?month=" + month + "&format=csv", "liquidacion.csv");
        });
      });
    });
  }


  // ---------- Víspera: the public forecast chain ----------
  Object.assign(T.en, {
    nav_ts: "Víspera", role_client: "Client under NDA", role_client_d: "Checks Pantheon's forecast record.",
    v_eyebrow: "Víspera · public forecast record", v_title: "{name}: forecast chain",
    v_lede: "Every forecast is sealed with a secret salt and linked to the one before it, then logged in Sigstore Rekor and anchored in Bitcoin, two public clocks Genau doesn't control. Anyone can count the forecasts and check each was logged before its deadline; a client under NDA can open them all and recompute every link.",
    v_none: "No chain yet.", v_none_d: "A chain starts with entry 0, the terms: what is forecast, the deadline, the start date and how it will be scored. It must be recorded before the start date, and it needs a permanent signing key and storage, so a restart can't orphan it.",
    v_start: "Start a chain", v_start_btn: "Record entry 0",
    v_terms: "Entry 0 · the terms", v_terms_d: "Fixed before the first forecast. Nobody can move the deadline, the window or the scoring later.",
    t_quantity: "What is forecast", t_market: "Market", t_horizon: "Horizon", t_cutoff: "Deadline", t_cutoff_v: "{t} Mexico City, {d} day(s) before",
    t_start: "First day", t_scoring: "Scoring", t_actuals: "Actuals from", t_recorded: "Entry 0 recorded",
    v_k_fc: "Forecasts", v_k_fc_c: "for {d} days", v_k_cut: "Logged before deadline", v_k_cut_c: "Rekor time vs. entry 0", v_k_btc: "In a Bitcoin block", v_k_btc_c: "of {n} entries", v_k_len: "Chain length", v_k_len_c: "head {h}…",
    v_strip: "The chain, newest last", v_sealed: "sealed", v_clear: "clear",
    k_terms: "Terms", k_forecast: "Forecast", k_actuals: "Actuals",
    v_entries: "Every entry", v_cols: ["#", "Kind", "Day", "Hash", "Logged in Rekor", "Deadline", "Bitcoin", ""],
    v_before: "before", v_late: "late", v_wait: "waiting",
    v_check: "Check it", v_check_pub: "Check the public chain", v_check_pub_d: "Anyone: numbering 0, 1, 2… with no gaps, each entry pointing at the one before, entry 0 holding the terms, and every forecast logged before its deadline. Runs in your browser.",
    v_check_cli: "Open and verify every forecast", v_check_cli_d: "Client under NDA: downloads the whole chain from entry 0 with every forecast and the chain keys, derives each salt and recomputes every hash in your browser.",
    v_dl: "Download disclosure (.json)", v_cmd: "It needs only Python's standard library:",
    r_ok: "Intact", r_bad: "Problems found", r_entries: "{n} entries checked", r_hashes: "{n} hashes recomputed from content and salts",
    r_cut: "{a} of {b} forecasts logged before their deadline", r_links: "Numbering and links: no gaps, no breaks",
    r_model: "{a} of {b} forecasts name the git commit that ran and their inputs, all before the deadline",
    v_demo: "Demo chain. Sample forecasts with simulated Rekor and Bitcoin times: nothing here is logged publicly. The live chain appears here once Genau starts it.",
    v_sim: "simulated", v_chains: "Chain",
    t_entry0: "Entry 0 fingerprint", t_entry0_d: "record this when you sign: any other chain is not ours",
    v_rekor_note: "Your browser can't reach Rekor directly. To compare every fingerprint with Rekor's copy and list everything signed with this chain's key, run the checker below: it does both by default."
  });
  Object.assign(T.es, {
    nav_ts: "Víspera", role_client: "Cliente con NDA", role_client_d: "Verifica el registro de pronósticos de Pantheon.",
    v_eyebrow: "Víspera · registro público de pronósticos", v_title: "{name}: cadena de pronósticos",
    v_lede: "Cada pronóstico se sella con una sal secreta y se enlaza con el anterior; luego se registra en Sigstore Rekor y se ancla en Bitcoin, dos relojes públicos que Genau no controla. Cualquiera puede contar los pronósticos y comprobar que cada uno se registró antes de su límite; un cliente con NDA puede abrirlos todos y recalcular cada enlace.",
    v_none: "Aún no hay cadena.", v_none_d: "Una cadena empieza con la entrada 0, los términos: qué se pronostica, el límite, la fecha de inicio y cómo se evaluará. Debe registrarse antes de la fecha de inicio y requiere una llave de firma y almacenamiento permanentes.",
    v_start: "Iniciar una cadena", v_start_btn: "Registrar la entrada 0",
    v_terms: "Entrada 0 · los términos", v_terms_d: "Fijados antes del primer pronóstico. Nadie puede mover después el límite, la ventana ni la evaluación.",
    t_quantity: "Qué se pronostica", t_market: "Mercado", t_horizon: "Horizonte", t_cutoff: "Límite", t_cutoff_v: "{t} hora de CDMX, {d} día(s) antes",
    t_start: "Primer día", t_scoring: "Evaluación", t_actuals: "Datos reales de", t_recorded: "Entrada 0 registrada",
    v_k_fc: "Pronósticos", v_k_fc_c: "para {d} días", v_k_cut: "Registrados antes del límite", v_k_cut_c: "Hora Rekor vs. entrada 0", v_k_btc: "En un bloque de Bitcoin", v_k_btc_c: "de {n} entradas", v_k_len: "Largo de la cadena", v_k_len_c: "cabeza {h}…",
    v_strip: "La cadena, la más reciente al final", v_sealed: "sellado", v_clear: "abierto",
    k_terms: "Términos", k_forecast: "Pronóstico", k_actuals: "Reales",
    v_entries: "Todas las entradas", v_cols: ["#", "Tipo", "Día", "Hash", "Registro en Rekor", "Límite", "Bitcoin", ""],
    v_before: "antes", v_late: "tarde", v_wait: "en espera",
    v_check: "Verifíquelo", v_check_pub: "Verificar la cadena pública", v_check_pub_d: "Cualquiera: numeración 0, 1, 2… sin huecos, cada entrada apunta a la anterior, la entrada 0 contiene los términos y cada pronóstico se registró antes de su límite. Corre en su navegador.",
    v_check_cli: "Abrir y verificar cada pronóstico", v_check_cli_d: "Cliente con NDA: descarga la cadena completa desde la entrada 0 con cada pronóstico y las llaves de cadena, deriva cada sal y recalcula cada hash en su navegador.",
    v_dl: "Descargar divulgación (.json)", v_cmd: "Solo requiere la biblioteca estándar de Python:",
    r_ok: "Íntegra", r_bad: "Se encontraron problemas", r_entries: "{n} entradas verificadas", r_hashes: "{n} hashes recalculados a partir del contenido y las sales",
    r_cut: "{a} de {b} pronósticos registrados antes de su límite", r_links: "Numeración y enlaces: sin huecos ni rupturas",
    r_model: "{a} de {b} pronósticos indican el commit de git que corrió y sus insumos, todo antes del límite",
    v_demo: "Cadena de demostración. Pronósticos de ejemplo con horas de Rekor y Bitcoin simuladas: nada aquí está registrado públicamente. La cadena real aparecerá aquí cuando Genau la inicie.",
    v_sim: "simulado", v_chains: "Cadena",
    t_entry0: "Huella de la entrada 0", t_entry0_d: "regístrela al firmar: cualquier otra cadena no es la nuestra",
    v_rekor_note: "Su navegador no puede consultar Rekor directamente. Para comparar cada huella con la copia de Rekor y listar todo lo firmado con la llave de esta cadena, ejecute el verificador de abajo: hace ambas cosas por defecto."
  });

  var KCOL = { terms: "var(--neutral-mark)", forecast: "var(--charge)", actuals: "var(--sun)" };
  var vsel = { chain: null };
  function fillT(k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, n) { return o[n]; }); }
  function hexOf(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function bytesOf(hex) { var a = new Uint8Array(hex.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16); return a; }
  function cat() { var n = 0, i, parts = arguments; for (i = 0; i < parts.length; i++) n += parts[i].length; var o = new Uint8Array(n), p = 0; for (i = 0; i < parts.length; i++) { o.set(parts[i], p); p += parts[i].length; } return o; }
  function hmac(keyHex, msg) {
    return crypto.subtle.importKey("raw", bytesOf(keyHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function (k) {
      return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
    }).then(function (b) { return new Uint8Array(b); });
  }
  function cutoffOf(day, terms) {
    var d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - (terms.cutoff_days_before == null ? 1 : terms.cutoff_days_before));
    var hm = (terms.cutoff_local || "10:00").split(":"), off = terms.utc_offset_hours == null ? -6 : terms.utc_offset_hours;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Number(hm[0]) - off, Number(hm[1]));
  }
  // The same checks as tools/verify_vispera.py. mode "public" (hashes only) or "client" (disclosure with chain keys).
  function verifyChain(doc, mode) {
    var probs = [], prev = null, late = 0, nf = 0, declared = 0, i = 0, es = doc.entries;
    function step() {
      if (i >= es.length) return Promise.resolve();
      var e = es[i], k = i;
      if (e.seq !== k) probs.push("#" + k + ": numbered " + e.seq);
      if ((e.prev || null) !== prev) probs.push("#" + k + ": does not point at #" + (k - 1));
      if (k === 0 && e.kind !== "terms") probs.push("#0 is not the terms");
      if (e.kind === "forecast") { nf++; if (!e.rekor.integrated_time || Date.parse(e.rekor.integrated_time) >= cutoffOf(e.target_day, doc.terms)) late++; }
      var done = function () { prev = e.hash; i++; return step(); };
      if (mode !== "client") return done();
      var body = JSON.parse(e.content);
      if (body.seq !== e.seq || body.kind !== e.kind || body.target_day !== e.target_day) probs.push("#" + k + ": label differs from what was hashed");
      if (e.kind === "forecast") {
        var c = cutoffOf(e.target_day, doc.terms), ins = body.inputs || [], okc = /^[0-9a-f]{40}$/.test(body.model_commit || "") && !!body.model_repo;
        var oki = ins.length && ins.every(function (x) { return /^[0-9a-f]{64}$/.test(x.sha256 || "") && Date.parse(x.as_of) < c && Date.parse(x.retrieved_at) < c; });
        if (!okc) probs.push("#" + k + ": no git commit for the code that ran");
        if (!oki) probs.push("#" + k + ": inputs missing or dated after the deadline");
        if (okc && oki) declared++;
      }
      var saltP = Promise.resolve(new Uint8Array(0));
      if (e.kind === "forecast") {
        var ck = doc.chain_keys[e.target_day.slice(0, 7)];
        if (!ck) { probs.push("#" + k + ": no chain key"); return done(); }
        saltP = hmac(ck, "salt|" + e.target_day + "|" + e.seq);
      }
      return saltP.then(function (s) {
        var pre = cat(s, new TextEncoder().encode(e.content), prev ? bytesOf(prev) : new Uint8Array(32));
        return crypto.subtle.digest("SHA-256", pre);
      }).then(function (h) { if (hexOf(h) !== e.hash) probs.push("#" + k + ": hash does not match its content"); return done(); });
    }
    return step().then(function () { return { ok: !probs.length, problems: probs, n: es.length, nf: nf, before: nf - late, declared: declared }; });
  }
  function showResult(el, r, mode) {
    el.innerHTML = '<div class="banner ' + (r.ok ? "done" : "missed") + '" style="flex-direction:column;align-items:flex-start;gap:4px"><strong>' + (r.ok ? "✓ " : "✗ ") + esc(t(r.ok ? "r_ok" : "r_bad")) + "</strong>" +
      '<span class="small">' + esc(fillT("r_entries", { n: r.n })) + " · " + esc(t("r_links")) + "</span>" +
      (mode === "client" ? '<span class="small">' + esc(fillT("r_hashes", { n: r.n })) + "</span>" + '<span class="small">' + esc(fillT("r_model", { a: r.declared, b: r.nf })) + "</span>" : "") +
      '<span class="small">' + esc(fillT("r_cut", { a: r.before, b: r.nf })) + "</span>" +
      r.problems.map(function (p) { return '<span class="small mono" style="color:var(--critical)">' + esc(p) + "</span>"; }).join("") + "</div>";
  }
  function short(h) { return h ? h.slice(0, 8) : "—"; }

  function timestampsPage() {
    return api("/v1/vispera/index").then(function (ix) {
      if (!ix.chains.length) return renderNoChain();
      var id = vsel.chain && ix.chains.some(function (c) { return c.id === vsel.chain; }) ? vsel.chain : ix.chains[0].id;
      vsel.chain = id;
      return api("/v1/vispera/chains/" + id).then(function (ch) { renderChain(ix, ch); });
    });
  }

  function renderNoChain() {
    var form = can("vispera.admin") ? '<section class="card"><h2>' + esc(t("v_start")) + '</h2><form data-vstart style="display:grid;gap:10px;max-width:640px">' +
      [["chain_id", "atotonilco"], ["quantity", "hourly sales offer, MW"], ["start_date", ""], ["scoring", "MAE of offered vs metered MWh, every day from the start date"]].map(function (f) {
        return '<label class="small muted">' + f[0] + '<input name="' + f[0] + '" value="' + esc(f[1]) + '"' + (f[0] === "start_date" ? ' type="date"' : "") + ' style="display:block;width:100%;min-height:40px;background:var(--bg-300);color:var(--ink);border:1px solid var(--line-control);border-radius:6px;padding:0 10px;font:inherit"></label>';
      }).join("") + '<button class="btn primary" type="submit">' + esc(t("v_start_btn")) + "</button></form></section>" : "";
    frame("timestamps", '<div class="head"><div><div class="eyebrow">' + esc(t("v_eyebrow")) + '</div><h1 class="title">' + esc(t("v_none")) + '</h1><p class="muted" style="margin:4px 0 0;max-width:760px">' + esc(t("v_none_d")) + "</p></div></div>" + form, 0);
    var f = document.querySelector("[data-vstart]");
    if (f) f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = {}; new FormData(f).forEach(function (x, k) { v[k] = x; });
      api("/v1/vispera/chains", { method: "POST", body: { chain_id: v.chain_id, subject: { site: v.chain_id }, quantity: v.quantity, start_date: v.start_date, scoring: v.scoring } })
        .then(function () { route(); }, function (e) { toast((e.details && e.details[0] && e.details[0].message) || e.message, true); });
    });
  }

  function renderChain(ix, ch) {
    var tm = ch.terms, sm = ch.summary, es = ch.entries;
    var name = (tm.subject && (tm.subject.site || tm.subject.zona || tm.subject.nodo)) || ch.chain;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    var row = function (k, v) { return '<div style="display:grid;grid-template-columns:170px 1fr;gap:12px;padding:6px 0;border-bottom:1px solid var(--line-subtle)"><span class="small muted">' + esc(t(k)) + '</span><span class="small">' + v + "</span></div>"; };
    var e0 = es[0];
    var terms = '<section class="card" style="border-left:4px solid var(--neutral-mark)"><h2>' + esc(t("v_terms")) + '</h2><p class="small muted" style="margin:0">' + esc(t("v_terms_d")) + "</p><div>" +
      row("t_quantity", esc(tm.quantity)) + row("t_market", esc(tm.market)) + row("t_horizon", esc(tm.horizon)) +
      row("t_cutoff", esc(fillT("t_cutoff_v", { t: tm.cutoff_local, d: tm.cutoff_days_before }))) + row("t_start", '<span class="mono">' + esc(tm.start_date) + "</span>") +
      row("t_scoring", esc(tm.scoring)) + row("t_actuals", esc(tm.actuals_source)) +
      row("t_entry0", '<span class="mono" style="overflow-wrap:anywhere">' + esc(e0.hash) + '</span><br><span class="muted">' + esc(t("t_entry0_d")) + "</span>") +
      row("t_recorded", esc(dateTime(e0.recorded_at)) + (e0.rekor.simulated ? ' <span class="muted">(' + esc(t("v_sim")) + ")</span>" : "") + (e0.rekor.log_index != null ? ' · Rekor <a href="' + e0.rekor.url + '" target="_blank" rel="noopener" class="mono">#' + e0.rekor.log_index + "</a>" : "")) + "</div></section>";
    var kpis = '<div class="row" style="gap:12px">' +
      kpi(t("v_k_fc"), '<span style="color:var(--charge)">' + sm.forecasts + "</span>", esc(fillT("v_k_fc_c", { d: sm.forecast_days }))) +
      kpi(t("v_k_cut"), '<span style="color:var(--good)">' + sm.rekor_before_cutoff + '</span><span class="unit"> / ' + sm.forecasts + "</span>", esc(t("v_k_cut_c"))) +
      kpi(t("v_k_btc"), '<span style="color:var(--peak)">' + sm.bitcoin + '</span><span class="unit"> / ' + ch.length + "</span>", esc(fillT("v_k_btc_c", { n: ch.length }))) +
      kpi(t("v_k_len"), String(ch.length), '<span class="mono">' + esc(fillT("v_k_len_c", { h: short(ch.head) })) + "</span>") + "</div>";
    var tail = es.slice(-7), skipped = es.length - tail.length;
    var strip = '<section class="card"><h2>' + esc(t("v_strip")) + '</h2><div class="vstrip">' + (skipped ? '<div class="vgap mono small muted">… ' + skipped + "</div>" : "") +
      tail.map(function (e, i) {
        var sealed = e.kind === "forecast";
        return (i || skipped ? '<span class="varrow">→</span>' : "") + '<div class="vblock ' + e.kind + '"><div class="mono small" style="opacity:.8">#' + e.seq + " · " + esc(t("k_" + e.kind)) + '</div><div class="mono small">' + esc(e.target_day) +
          '</div><div class="mono" style="font-size:13px">' + short(e.hash) + '…</div><div class="small" style="opacity:.8">' + (sealed ? "🔒 " + esc(t("v_sealed")) : esc(t("v_clear"))) + "</div></div>";
      }).join("") + "</div>" +
      '<p class="small muted mono" style="margin:6px 0 0">s<sub>i</sub> = SHA-256( salt<sub>i</sub> ‖ content<sub>i</sub> ‖ s<sub>i−1</sub> )</p></section>';
    var rows = es.slice().reverse().map(function (e) {
      var cut = e.kind !== "forecast" ? '<span class="muted">—</span>' : e.rekor_before_cutoff === true ? '<span style="color:var(--good)">✓ ' + esc(t("v_before")) + "</span>" : e.rekor_before_cutoff === false ? '<span style="color:var(--critical)">' + esc(t("v_late")) + "</span>" : '<span class="muted">' + esc(t("v_wait")) + "</span>";
      return '<tr><td class="mono">' + e.seq + '</td><td><span class="mono small" style="padding:2px 8px;border-radius:999px;border:1px solid ' + KCOL[e.kind] + ";color:" + KCOL[e.kind] + '">' + esc(t("k_" + e.kind)) + '</span></td><td class="mono small">' + esc(e.target_day) +
        '</td><td class="mono small" title="' + e.hash + '">' + short(e.hash) + "…</td><td class=\"small\">" + (e.rekor.integrated_time ? esc(dateTime(e.rekor.integrated_time)) + (e.rekor.url ? ' <a class="mono" href="' + e.rekor.url + '" target="_blank" rel="noopener">#' + e.rekor.log_index + "</a>" : (e.rekor.simulated ? ' <span class="muted small">(' + esc(t("v_sim")) + ")</span>" : "")) : '<span class="muted">—</span>') +
        "</td><td class=\"small\">" + cut + '</td><td class="small">' + (e.bitcoin.block_height ? '<a class="mono" href="https://blockstream.info/block-height/' + e.bitcoin.block_height + '" target="_blank" rel="noopener">#' + Number(e.bitcoin.block_height).toLocaleString(loc()) + "</a>" : '<span class="muted">' + esc(e.bitcoin.status) + (e.bitcoin.simulated ? " (" + esc(t("v_sim")) + ")" : "") + "</span>") +
        "</td><td>" + (e.bitcoin.proof_url ? '<button class="btn" type="button" data-vots="' + e.seq + '">.ots</button>' : "") + "</td></tr>";
    }).join("");
    var table = '<section class="card"><h2>' + esc(t("v_entries")) + '</h2><div class="tablewrap"><table class="tstable"><thead><tr>' + t("v_cols").map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div></section>";
    var checks = '<section class="card"><h2>' + esc(t("v_check")) + '</h2><div class="row" style="align-items:stretch;gap:12px">' +
      '<div class="card" style="background:var(--bg-200)"><strong>' + esc(t("v_check_pub")) + '</strong><p class="small muted" style="margin:0">' + esc(t("v_check_pub_d")) + '</p><button class="btn primary" type="button" data-vpub>' + esc(t("v_check_pub")) + '</button><div data-vpubres></div></div>' +
      (can("vispera.disclose") ? '<div class="card" style="background:var(--bg-200)"><strong>' + esc(t("v_check_cli")) + '</strong><p class="small muted" style="margin:0">' + esc(t("v_check_cli_d")) + '</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" data-vcli>' + esc(t("v_check_cli")) + '</button><button class="btn" type="button" data-vdl>' + esc(t("v_dl")) + '</button></div><div data-vclires></div></div>' : "") +
      '</div><p class="small muted" style="margin:0">' + esc(t("v_rekor_note")) + " " + esc(t("v_cmd")) + '</p><pre class="mono small" style="margin:0;padding:12px;background:var(--bg-300);border-radius:8px;overflow-x:auto">python verify_vispera.py public chain.json --entry0 ' + esc(e0.hash.slice(0, 12)) + '…\npython verify_vispera.py client disclosure.json --entry0 ' + esc(e0.hash.slice(0, 12)) + '…</pre></section>';
    frame("timestamps",
      '<style>.vstrip{display:flex;align-items:stretch;gap:6px;overflow-x:auto;padding:4px 0}.vblock{flex:none;min-width:104px;padding:10px;border-radius:10px;display:flex;flex-direction:column;gap:2px}' +
      '.vblock.terms{background:var(--bg-300);border:1px solid var(--neutral-mark)}.vblock.forecast{background:#0E2236;border:1px solid var(--charge)}.vblock.actuals{background:transparent;border:1px dashed var(--sun)}' +
      '.varrow{align-self:center;color:var(--ink-muted)}.vgap{align-self:center;padding:0 6px}' +
      '@media (max-width:720px){.tstable thead{display:none}.tstable,.tstable tbody{display:block;min-width:0}.tstable tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:12px 0;border-bottom:1px solid var(--line-subtle)}.tstable td{display:block;padding:0;border:0}}</style>' +
      '<div class="head"><div><div class="eyebrow">' + esc(t("v_eyebrow")) + '</div><h1 class="title">' + esc(fillT("v_title", { name: name })) + '</h1><p class="muted" style="margin:4px 0 0;max-width:820px">' + esc(t("v_lede")) + "</p></div></div>" +
      (ix.chains.length > 1 ? '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="small muted">' + esc(t("v_chains")) + "</span>" + ix.chains.map(function (c) {
        return '<button class="btn' + (c.id === ch.chain ? " primary" : "") + '" type="button" data-vchain="' + esc(c.id) + '">' + esc(c.id) + "</button>"; }).join("") + "</div>" : "") +
      (tm.demo ? '<div class="banner" style="background:var(--peak-tint);border:1px solid var(--peak)"><span>' + esc(t("v_demo")) + "</span></div>" : "") +
      kpis + terms + strip + checks + table, 0);
    var root = document.getElementById("app");
    root.querySelectorAll("[data-vchain]").forEach(function (b) { b.addEventListener("click", function () { vsel.chain = b.dataset.vchain; route(); }); });
    root.querySelector("[data-vpub]").addEventListener("click", function () {
      verifyChain(ch, "public").then(function (r) { showResult(root.querySelector("[data-vpubres]"), r, "public"); });
    });
    var cli = root.querySelector("[data-vcli]");
    if (cli) cli.addEventListener("click", function () {
      cli.disabled = true;
      api("/v1/vispera/chains/" + ch.chain + "/disclosure").then(function (d) { return verifyChain(d, "client"); })
        .then(function (r) { cli.disabled = false; showResult(root.querySelector("[data-vclires]"), r, "client"); }, function (e) { cli.disabled = false; toast(e.message, true); });
    });
    var dl = root.querySelector("[data-vdl]");
    if (dl) dl.addEventListener("click", function () { download("/v1/vispera/chains/" + ch.chain + "/disclosure", ch.chain + "-disclosure.json"); });
    root.querySelectorAll("[data-vots]").forEach(function (b) {
      b.addEventListener("click", function () { download("/v1/vispera/chains/" + ch.chain + "/entries/" + b.dataset.vots + "/proof.ots", ch.chain + "-" + b.dataset.vots + ".ots"); });
    });
  }

  // ---------- Routing ----------
  function currentRoute() {
    var parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/");
    return { name: parts[0] || "home", arg: parts[1] };
  }
  var PAGES = { home: homePage, yesterday: yesterdayPage, today: todayPage, alerts: alertsPage, settlement: settlementPage, fleet: fleetPage, audit: auditPage, lines: linesPage, plan: planPage, model: modelPage, qenergy: qenergyPage, timestamps: timestampsPage };

  function route() {
    stopReplay();
    if (!state.key) { signinPage(); return; }
    if (!state.me) { signIn(state.key); return; }
    var r = currentRoute(), page = PAGES[r.name] || homePage;
    if (state.me.user.role === "partner" && r.name !== "qenergy" && r.name !== "timestamps") { page = qenergyPage; r = { name: "qenergy" }; }
    if (state.me.user.role === "client" && r.name !== "timestamps") { page = timestampsPage; r = { name: "timestamps" }; }
    page(r.arg).catch(function (e) {
      if (e && e.status === 401) { state.key = null; state.me = null; save("key", null); signinPage(); return; }
      errorPage(e || {});
    });
  }

  // ---------- Clicks ----------
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("button, [data-person]");
    if (!el) return;
    if (el.dataset.lang) { state.lang = el.dataset.lang; save("lang", state.lang); document.documentElement.lang = state.lang === "es" ? "es-MX" : "en"; route(); return; }
    if (el.dataset.person) { signIn(el.dataset.person); return; }
    if (el.classList.contains("strategy") && !el.disabled) { state.strategy[el.dataset.site] = el.dataset.strategy; route(); return; }
    switch (el.dataset.act) {
      case "signout": state.key = null; state.me = null; state.strategy = {}; save("key", null); location.hash = "#/home"; signinPage(); break;
      case "retry": route(); break;
      case "play": togglePlay(); break;
      case "rhour": stopReplay(); replay.hour = Number(el.dataset.hour); drawReplay(); break;
      case "wa": waDialog(el.dataset.site, el.dataset.day); break;
      case "approve": approveDialog(el.dataset.site, el.dataset.day, el.dataset.planStrategy, null, el.dataset.modelled === "true"); break;
      case "dispute": disputeDialog(el.dataset.day); break;
      case "decide":
        el.disabled = true;
        api("/v1/alerts/" + el.dataset.alert + "/resolve", { method: "POST", body: { choice: el.dataset.choice } })
          .then(function () { toast(t("decided_toast")); route(); }, function (e) { el.disabled = false; toast(e.message, true); });
        break;
      case "offer":
        api("/v1/sites/" + el.dataset.site + "/offer/" + el.dataset.day + "/export?format=csv", { raw: true }).then(function (csv) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          a.download = "oferta-" + el.dataset.site + "-" + el.dataset.day + ".csv";
          document.body.appendChild(a); a.click(); a.remove();
        }, function (e) { toast(e.message, true); });
        break;
      case "reset":
        api("/v1/demo/reset", { method: "POST" }).then(function () { state.strategy = {}; toast(t("reset_done")); route(); }, function (e) { toast(e.message, true); });
        break;
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var s = document.querySelector(".scrim"); if (s) s.remove(); } });
  window.addEventListener("hashchange", route);

  document.documentElement.lang = state.lang === "es" ? "es-MX" : "en";
  route();
})();
