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
    { key: "demo-admin", name: "Genau", role: "admin" }
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
    var links = [["home", t("nav_home")], ["yesterday", t("nav_yesterday")], ["today", t("nav_today")], ["alerts", t("nav_alerts")], ["settlement", t("nav_settlement")], ["fleet", t("nav_fleet")]];
    links.push(["lines", t("nav_lines")]);
    if (can("audit.read")) links.push(["audit", t("nav_audit")]);
    if (can("business.read")) links.push(["plan", t("nav_plan")]);
    var nav = links.map(function (l) {
      var badge = l[0] === "alerts" && openAlerts ? ' <span class="badge">' + openAlerts + "</span>" : "";
      return '<a href="#/' + l[0] + '"' + (route === l[0] ? ' aria-current="page"' : "") + ">" + esc(l[1]) + badge + "</a>";
    }).join("");
    nav += '<a href="screens/index.html" title="' + (state.lang === "es" ? "Todas las pantallas diseñadas, en orden de recorrido" : "Every designed screen, in journey order") + '">' + (state.lang === "es" ? "Todas las pantallas" : "All screens") + "</a>";
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
    plan_title: "The path to $30M a year in Mexico", plan_lede: "2030 annual recurring revenue by product line. Planning estimates, not contracted revenue.",
    plan_total: "Target 2030", plan_lines: "Revenue by line, 2030", plan_ramp: "How it ramps", plan_gate: "The gate", plan_cond: "What must be true",
    usd_m: "USD M"
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
    plan_title: "El camino a 30 millones de dólares al año en México", plan_lede: "Ingreso recurrente anual 2030 por línea de producto. Estimaciones de planeación, no ingresos contratados.",
    plan_total: "Meta 2030", plan_lines: "Ingreso por línea, 2030", plan_ramp: "Cómo crece", plan_gate: "La compuerta", plan_cond: "Lo que debe cumplirse",
    usd_m: "M USD"
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
        (rows ? '<section class="card"><h2>' + esc(t("l_sample")) + '</h2><div class="lines">' + rows + "</div></section>" : "") + "</div>", r[1].length);
    });
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
        '<div class="head"><div><h1 class="title">' + esc(t("plan_title")) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(t("plan_lede")) + "</p></div></div>" +
        '<div class="row">' + kpi(t("plan_total"), m(total), esc(p.note), "") + "</div>" +
        '<section class="card"><h2>' + esc(t("plan_lines")) + "</h2>" + bars + "</section>" +
        '<div class="banner" style="background:var(--peak-tint);border:1px solid var(--peak)"><strong>' + esc(t("plan_gate")) + "</strong><span>" + esc(p.gate) + "</span></div>" +
        '<h2 style="font-size:17px;font-weight:500">' + esc(t("plan_ramp")) + '</h2><div class="row" style="align-items:stretch">' + ramp + "</div>" +
        '<section class="card"><h2>' + esc(t("plan_cond")) + '</h2><ol style="margin:0;padding-left:18px">' + p.conditions.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol></section>", r[1].length);
    });
  }

  // ---------- Routing ----------
  function currentRoute() {
    var parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/");
    return { name: parts[0] || "home", arg: parts[1] };
  }
  var PAGES = { home: homePage, yesterday: yesterdayPage, today: todayPage, alerts: alertsPage, settlement: settlementPage, fleet: fleetPage, audit: auditPage, lines: linesPage, plan: planPage };

  function route() {
    stopReplay();
    if (!state.key) { signinPage(); return; }
    if (!state.me) { signIn(state.key); return; }
    var r = currentRoute(), page = PAGES[r.name] || homePage;
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
