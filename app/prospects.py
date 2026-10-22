"""Named prospects per product line. Genau-internal (shown only to roles with business.read).

Real companies from public sources; none is a client yet. Every entry carries the page it came from.
kind: customer (would buy), partner (would work with us), channel (resells or brings customers), competitor.
Text fields are {"en", "es"} or a plain string when the same in both languages.
"""
from __future__ import annotations

PROSPECTS: dict[str, list[dict]] = {
    "white-label": [
        dict(name="SkySense", kind="customer",
             what={"en": "Solar, batteries and microgrids for factories, airports and food plants; financing with no capex; SkyLink monitoring",
                   "es": "Solar, baterías y microrredes para fábricas, aeropuertos y alimentos; financiamiento sin capex; monitoreo SkyLink"},
             evidence={"en": "Over 200 MWh of storage operating; 30 MWh BESS at a tech plant in Monterrey; BYD Energy Storage alliance",
                       "es": "Más de 200 MWh de almacenamiento en operación; BESS de 30 MWh en una planta tecnológica en Monterrey; alianza con BYD Energy Storage"},
             url="https://skysense.com.mx/"),
        dict(name="Quartux", kind="competitor",
             what={"en": "Behind-the-meter batteries as a service, with its own QUARTUX CONTROL software and a partner programme for energy companies",
                   "es": "Baterías detrás del medidor como servicio, con su propio software QUARTUX CONTROL y un programa de socios para empresas de energía"},
             evidence={"en": "Claims over 1 GWh installed, 100+ sites in 25+ states and 8 of 10 BESS in Mexico",
                       "es": "Afirma más de 1 GWh instalado, más de 100 sitios en más de 25 estados y 8 de cada 10 BESS en México"},
             url="https://content.quartux.com/partners"),
    ],
    "qenergy": [
        dict(name="QEnergy (AJOLOWATT)", kind="channel",
             what={"en": "Mexican generator Market Participant selling PPAs and fixed-price supply to large users and suppliers",
                   "es": "Generador Participante del Mercado mexicano que vende PPA y suministro a precio fijo a grandes usuarios y suministradores"},
             evidence={"en": "CENACE contract GEN-088-JUN-2019; said it was transacting 104 MW of renewables, 95% through PPAs (2023)",
                       "es": "Contrato CENACE GEN-088-JUN-2019; dijo transaccionar 104 MW renovables, 95% por PPA (2023)"},
             url="https://www.energiaestrategica.com/para-el-2023-la-comercializadora-qenergy-busca-aumentar-su-volumen-de-transacciones-de-renovables-por-encima-de-las-104-mw-en-mexico/"),
    ],
}
