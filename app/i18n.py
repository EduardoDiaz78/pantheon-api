"""English and Mexican Spanish messages.

Clients send `Accept-Language: es-MX` (or any `es`) to get Spanish text in
messages people read: errors, limit violations, plan explanations, alerts.
Field names, codes and enums stay in English so integrations don't break.
"""
from __future__ import annotations

from fastapi import Header

MESSAGES: dict[str, dict[str, str]] = {
    # errors
    "unauthorized": {"en": "Missing or invalid X-API-Key header.", "es": "Falta el encabezado X-API-Key o no es válido."},
    "forbidden": {"en": "Your role ({role}) cannot do this. It needs: {perm}.", "es": "Tu rol ({role}) no puede hacer esto. Se necesita: {perm}."},
    "site_not_found": {"en": "Site '{site}' not found.", "es": "No se encontró la planta '{site}'."},
    "site_maintenance": {"en": "{site} is in maintenance and has no plan.", "es": "{site} está en mantenimiento y no tiene plan."},
    "no_data_yet": {"en": "We are loading price history and plant data for {site}. First plan expected {date}.",
                    "es": "Estamos cargando el historial de precios y los datos de {site}. Primer plan previsto el {date}."},
    "plan_locked": {"en": "This plan is approved and locked.", "es": "Este plan está aprobado y bloqueado."},
    "deadline_passed": {"en": "The offer deadline for {date} passed at {time}. The plan is read-only.",
                        "es": "La hora límite de oferta para el {date} pasó a las {time}. El plan es de solo lectura."},
    "hard_violations": {"en": "This plan breaks hard limits and cannot be approved.", "es": "Este plan rompe límites duros y no se puede aprobar."},
    "soft_needs_ack": {"en": "This plan breaks soft limits. Resend with acknowledge_soft_violations=true.",
                       "es": "Este plan rompe límites flexibles. Reenvía con acknowledge_soft_violations=true."},
    "soft_needs_signoff": {"en": "Only an asset manager or admin can sign off soft limit breaches.",
                           "es": "Solo un gerente de activos o un administrador puede autorizar límites flexibles."},
    "approve_first": {"en": "Approve the plan before exporting an offer file.", "es": "Aprueba el plan antes de exportar el archivo de oferta."},
    "model_needs_signoff": {"en": "The battery state is modelled (no EMS reading in the last 5 minutes). An asset manager must approve with sign_off=true.",
                            "es": "El estado de la batería es modelado (sin lectura del EMS en los últimos 5 minutos). Un gerente de activos debe aprobar con sign_off=true."},
    "xlsx_unavailable": {"en": "xlsx export needs the openpyxl package on the server. Use format=csv.", "es": "La exportación xlsx requiere el paquete openpyxl en el servidor. Usa format=csv."},
    "csv_columns": {"en": "The CSV is missing required columns.", "es": "Al CSV le faltan columnas requeridas."},
    "csv_empty": {"en": "The CSV has no rows.", "es": "El CSV no tiene filas."},
    "csv_values": {"en": "A value in the CSV could not be read.", "es": "No se pudo leer un valor del CSV."},
    "no_override": {"en": "No override at hour {hour}.", "es": "No hay ajuste en la hora {hour}."},
    "not_found": {"en": "{what} not found.", "es": "No se encontró {what}."},
    "over_rated": {"en": "{field} ({value} MW) exceeds the site's rated power ({rated} MW).",
                   "es": "{field} ({value} MW) excede la potencia nominal de la planta ({rated} MW)."},
    "no_sample_month": {"en": "Sample data covers 2026-10 only.", "es": "Los datos de muestra solo cubren 2026-10."},
    "alert_closed": {"en": "This alert is already resolved.", "es": "Esta alerta ya está resuelta."},
    "bad_decision": {"en": "This alert does not accept the decision '{choice}'. Options: {options}.",
                     "es": "Esta alerta no acepta la decisión '{choice}'. Opciones: {options}."},
    "invalid_request": {"en": "The request is not valid.", "es": "La solicitud no es válida."},
    "day_not_settled": {"en": "{date} has no CENACE statement yet.", "es": "El {date} todavía no tiene estado de cuenta de CENACE."},
    "no_sample_day": {"en": "Sample replay data covers {site} on 2026-10-16 only.", "es": "Los datos de muestra de la repetición solo cubren {site} el 2026-10-16."},
    "needs_app_signoff": {"en": "This plan needs an asset manager’s sign-off, which can only be given in the Pantheon app.",
                          "es": "Este plan requiere la autorización de un gerente de activos, que solo se puede dar en la app de Pantheon."},
    "wa_unknown_number": {"en": "This WhatsApp number is not verified for anyone in your organization.",
                          "es": "Este número de WhatsApp no está verificado para nadie de tu organización."},
    "wa_bad_context": {"en": "This button needs {need} in its context.", "es": "Este botón necesita {need} en su contexto."},
    # replay
    "r_yes": {"en": "Yes. The battery added {value} MXN over doing nothing, {pct}% {dir} than planned, and was discharging in {cov} critical hours CENACE confirmed.",
              "es": "Sí. La batería aportó {value} MXN frente a no hacer nada, {pct}% {dir} de lo planeado, y descargó en {cov} horas críticas que confirmó el CENACE."},
    "r_no": {"en": "Not yesterday. The battery added {value} MXN over doing nothing, {pct}% {dir} than planned.",
             "es": "Ayer no. La batería aportó {value} MXN frente a no hacer nada, {pct}% {dir} de lo planeado."},
    "r_more": {"en": "more", "es": "más"}, "r_less": {"en": "less", "es": "menos"},
    "r_both": {"en": "both", "es": "las dos"},
    "r_baseline": {"en": "Doing nothing means the same plant with the battery idle, selling all its solar straight to the grid. Hourly value counts solar kept for the battery at the node price and battery wear per MWh discharged.",
                   "es": "No hacer nada significa la misma planta con la batería parada, vendiendo toda su solar directo a la red. El valor por hora cuenta la solar guardada en la batería al precio del nodo y el desgaste por MWh descargado."},
    "r_fee_note": {"en": "Set when the commercial terms are agreed. Net to you is the value minus the fee.",
                   "es": "Se define al acordar los términos comerciales. Lo neto para ti es el valor menos la comisión."},
    "r_prices": {"en": "Evening prices came in above forecast, most at 20:00 (3,380 vs 3,080)",
                 "es": "Los precios de la tarde salieron arriba del pronóstico, sobre todo a las 20:00 (3,380 vs 3,080)"},
    "r_dispatch": {"en": "A cloud at 14:00 cut charging to 7 MW, so 1.5 MWh less to sell at 22:00",
                   "es": "Una nube a las 14:00 bajó la carga a 7 MW, así que hubo 1.5 MWh menos para vender a las 22:00"},
    # WhatsApp
    "wa_plan": {"en": "Good morning, {name}. Tomorrow’s plan for {site} is ready.\nEnergy margin: {margin} MXN ({strategy})\nLikely critical hours: {window} · {covered}/{n}\nChecks: {checks}\nApprove before {deadline} · {left} left.",
                "es": "Buenos días, {name}. El plan de mañana para {site} está listo.\nMargen de energía: {margin} MXN ({strategy})\nHoras críticas probables: {window} · {covered}/{n}\nValidaciones: {checks}\nAprueba antes de las {deadline} · faltan {left}."},
    "wa_checks_ok": {"en": "all passed", "es": "todas OK"},
    "wa_checks_signoff": {"en": "needs a sign-off in the app", "es": "requiere autorización en la app"},
    "wa_chart": {"en": "Tomorrow: charge from solar, discharge at peak", "es": "Mañana: carga con solar, descarga en la punta"},
    "wa_b_approve": {"en": "Approve", "es": "Aprobar"},
    "wa_b_details": {"en": "See details", "es": "Ver detalle"},
    "wa_b_keep": {"en": "Keep the plan", "es": "Mantener el plan"},
    "wa_b_hold": {"en": "Hold the battery", "es": "Detener la batería"},
    "wa_b_hand": {"en": "Hand to {name}", "es": "Pasar a {name}"},
    "wa_incident": {"en": "{site} · {title}. {detail}", "es": "{site} · {title}. {detail}"},
    "wa_approved": {"en": "Approved and locked. {name} · {time} · {strategy} · {margin} MXN. Recorded in the audit log. The offer file is ready for CENACE.",
                    "es": "Aprobado y bloqueado. {name} · {time} · {strategy} · {margin} MXN. Registrado en la bitácora. El archivo de oferta está listo para el CENACE."},
    "wa_details": {"en": "Open the plan in Pantheon: {link}", "es": "Abre el plan en Pantheon: {link}"},
    "wa_kept": {"en": "Keeping the plan at {site}. Logged under {name} at {time}.", "es": "Se mantiene el plan en {site}. Registrado a nombre de {name} a las {time}."},
    "wa_held": {"en": "Holding the battery at {site} until data returns. Logged under {name} at {time}. I’ll message you when data is back.",
                "es": "Batería de {site} detenida hasta que vuelvan los datos. Registrado a nombre de {name} a las {time}. Te aviso cuando regresen."},
    "wa_handed": {"en": "Handed to {to}. Logged under {name} at {time}.", "es": "Se pasó a {to}. Registrado a nombre de {name} a las {time}."},
    "st_conservative": {"en": "Conservative", "es": "Conservadora"}, "st_balanced": {"en": "Balanced", "es": "Balanceada"}, "st_aggressive": {"en": "Aggressive", "es": "Agresiva"},
    # limit violations
    "v_discharge_power": {"en": "Discharge {mw} MW exceeds the limit of {limit} MW.", "es": "La descarga de {mw} MW excede el límite de {limit} MW."},
    "v_charge_power": {"en": "Charge {mw} MW exceeds the limit of {limit} MW.", "es": "La carga de {mw} MW excede el límite de {limit} MW."},
    "v_soc_below_min": {"en": "Battery charge {pct}% is below the {limit}% floor.", "es": "La carga de la batería de {pct}% está bajo el mínimo de {limit}%."},
    "v_soc_above_max": {"en": "Battery charge {pct}% is above the {limit}% ceiling.", "es": "La carga de la batería de {pct}% está sobre el máximo de {limit}%."},
    "v_cycles_per_day": {"en": "{cycles} cycles planned; the daily limit is {limit}.", "es": "{cycles} ciclos planeados; el límite diario es {limit}."},
    "v_critical_hour_uncovered": {"en": "Likely critical hour {hour}:00 has no discharge planned.",
                                  "es": "La hora crítica probable {hour}:00 no tiene descarga planeada."},
    # plan explanation
    "why_solar": {"en": "Midday solar is worth the least, so the battery fills from the plant instead of selling it. It holds that charge for the evening peak and the likely critical hours. Wear is priced in, so the battery only moves when the spread pays for it.",
                  "es": "La energía solar del mediodía vale menos, así que la batería se carga con la planta en lugar de venderla. Guarda esa carga para la punta de la tarde y las horas críticas probables. El desgaste está incluido, así que la batería solo opera cuando el diferencial lo paga."},
    "why_grid": {"en": "The battery charges in the cheapest hours and holds that charge for the evening peak and the likely critical hours. Wear is priced in, so it only moves when the spread pays for it.",
                 "es": "La batería se carga en las horas más baratas y guarda esa carga para la punta de la tarde y las horas críticas probables. El desgaste está incluido, así que solo opera cuando el diferencial lo paga."},
    "block_solar": {"en": "Charge from plant solar", "es": "Carga con la solar de la planta"},
    "block_grid_night": {"en": "Charge from grid, night off-peak", "es": "Carga de la red, horario nocturno"},
    "block_grid": {"en": "Charge from grid", "es": "Carga de la red"},
    "block_morning": {"en": "Morning shoulder", "es": "Hombro de la mañana"},
    "block_peak": {"en": "Evening peak and likely critical hours", "es": "Punta de la tarde y horas críticas probables"},
    "capacity_note": {"en": "Projection only. It is confirmed against CENACE settlement data for this node before it is shown as a figure.",
                      "es": "Solo es una proyección. Se confirma con los datos de liquidación de CENACE para este nodo antes de mostrarse como cifra."},
    # strategies
    "s_conservative": {"en": "Fills from solar only and keeps a 20% reserve.", "es": "Carga solo con solar y mantiene una reserva de 20%."},
    "s_balanced": {"en": "One full cycle from midday solar, built around the evening peak.", "es": "Un ciclo completo con la solar del mediodía, pensado para la punta de la tarde."},
    "s_aggressive": {"en": "Adds a night grid charge and a morning discharge.", "es": "Agrega una carga nocturna de la red y una descarga en la mañana."},
    # alerts
    "a_plan_ready_t": {"en": "Approve tomorrow’s plan before {time}", "es": "Aprueba el plan de mañana antes de las {time}"},
    "a_plan_ready_d": {"en": "{n} likely critical hours, {window}. Battery planned to discharge in {covered} of them.",
                       "es": "{n} horas críticas probables, {window}. La batería descarga en {covered} de ellas."},
    "a_settle_t": {"en": "Settlement for {date} is {pct}% off plan", "es": "La liquidación del {date} difiere {pct}% del plan"},
    "a_settle_d": {"en": "Flagged for review. Open settlement to file a dispute.", "es": "Marcada para revisión. Abre la liquidación para presentar una disputa."},
    "a_stale_t": {"en": "No battery data for {minutes} min", "es": "Sin datos de la batería desde hace {minutes} min"},
    "a_stale_d": {"en": "Last reading {pct}% at {time}. Keep the plan, or hold the battery until data returns.",
                  "es": "Última lectura {pct}% a las {time}. Mantén el plan o detén la batería hasta que vuelvan los datos."},
    "a_maint_t": {"en": "Maintenance window {window}", "es": "Ventana de mantenimiento {window}"},
    "a_maint_d": {"en": "Battery excluded from plans in that window.", "es": "La batería queda fuera de los planes en esa ventana."},
}


def lang_from_header(accept_language: str | None) -> str:
    if accept_language and accept_language.strip().lower().startswith("es"):
        return "es"
    return "en"


def get_lang(accept_language: str | None = Header(None, alias="Accept-Language")) -> str:
    return lang_from_header(accept_language)


def t(key: str, lang: str = "en", **kw) -> str:
    entry = MESSAGES.get(key)
    if not entry:
        return key
    return entry.get(lang, entry["en"]).format(**kw)
