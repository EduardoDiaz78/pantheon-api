"""Genau's nine product lines in Mexico, and the 2030 business plan.

`GET /v1/products` and `GET /v1/products/{id}` describe each line the way a client or partner would see it,
with sample figures for its screen. `GET /v1/business/plan` is Genau's internal revenue build (admin only).
Sample data: planning estimates from the October 2026 plan, not contracted revenue.
"""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..auth import Caller, current, need
from ..errors import ApiError
from ..i18n import get_lang

router = APIRouter(tags=["Product lines"])

Status = Literal["live", "pilot", "planned"]


class ProductLine(BaseModel):
    id: str
    number: int
    name: str
    buyer: str
    offer: str
    price: str
    status: Status
    headline: str
    sample_data: bool = True


class ProductDetail(ProductLine):
    first_customers: list[str]
    needs: list[str]
    metrics: list[dict]
    sample: dict


class PlanLine(BaseModel):
    id: str
    number: int
    name: str
    arr_2030_usd: float
    basis: str


class PlanYear(BaseModel):
    year: int
    arr_usd: float
    milestones: list[str]


class BusinessPlan(BaseModel):
    target_arr_usd: float
    target_year: int
    lines: list[PlanLine]
    ramp: list[PlanYear]
    gate: str
    conditions: list[str]
    note: str
    sample_data: bool = True


def _t(v, lang: str):
    return v["es"] if isinstance(v, dict) and lang == "es" else (v["en"] if isinstance(v, dict) else v)


def _tl(vs, lang: str):
    return [_t(v, lang) for v in vs]


# Each line: text fields are {"en", "es"}; metrics are label/value pairs for the screen's tiles.
LINES: list[dict] = [
    dict(
        id="battery-optimization", number=1, status="pilot", arr=10_000_000,
        basis={"en": "1,000 MW at about $10k per MW", "es": "1,000 MW a unos $10 mil USD por MW"},
        name={"en": "Battery optimization", "es": "Optimización de baterías"},
        buyer={"en": "Owners of batteries under the 30% storage mandate, tender winners, standalone batteries",
               "es": "Dueños de baterías del mandato de 30% de almacenamiento, ganadores de licitaciones, baterías independientes"},
        offer={"en": "We run the battery in the market: daily offers, charge and discharge plan, critical-hour positioning, settlement checks",
               "es": "Operamos la batería en el mercado: ofertas diarias, plan de carga y descarga, posición en horas críticas, revisión de liquidaciones"},
        price={"en": "5–8% of the battery's market revenue", "es": "5–8% de los ingresos de mercado de la batería"},
        headline={"en": "Every new renewable plant must add storage worth 30% of its capacity for 3 hours",
                  "es": "Toda nueva planta renovable debe sumar almacenamiento equivalente al 30% de su capacidad por 3 horas"},
        first_customers=[{"en": "Acueducto (13.8 MW / 25 MWh)", "es": "Acueducto (13.8 MW / 25 MWh)"},
                         {"en": "Tender winners in the pipeline", "es": "Ganadores de licitación en cartera"},
                         {"en": "Batteries QEnergy brings", "es": "Baterías que traiga QEnergy"}],
        needs=[{"en": "Market Participants to represent each battery", "es": "Participantes del Mercado que representen cada batería"},
               {"en": "Read access to each site's EMS", "es": "Acceso de lectura al EMS de cada sitio"},
               {"en": "A daily operations desk", "es": "Una mesa de operación diaria"}],
        metrics=[("storage_required_gw", 3.8, {"en": "GW of storage required by awarded plants", "es": "GW de almacenamiento exigido a plantas adjudicadas"}),
                 ("fee_pct", "5–8", {"en": "% of market revenue", "es": "% de los ingresos de mercado"}),
                 ("target_mw", 1000, {"en": "MW under management, 2030", "es": "MW bajo gestión, 2030"})],
        sample={"site": "Acueducto", "power_mw": 13.8, "energy_mwh": 25.075, "status": "pilot",
                "revenue_mxn_per_mw_year": [2_300_000, 3_500_000], "fee_pct": 6.5},
    ),
    dict(
        id="plant-forecasting", number=2, status="pilot", arr=4_500_000,
        basis={"en": "3,000 MW at about $1.5k per MW", "es": "3,000 MW a unos $1.5 mil USD por MW"},
        name={"en": "Plant forecasting", "es": "Pronóstico para plantas"},
        buyer={"en": "Solar and wind generators, and the traders who submit their offers",
               "es": "Generadores solares y eólicos, y los comercializadores que presentan sus ofertas"},
        offer={"en": "Hourly generation and price forecasts so the day-ahead offer matches delivery",
               "es": "Pronósticos horarios de generación y precio para que la oferta del día en adelanto coincida con la entrega"},
        price={"en": "About $1.5k per MW a year", "es": "Unos $1.5 mil USD por MW al año"},
        headline={"en": "Atotonilco, September: a fixed daily offer reached 78% of the maximum; our forecasts reached 85%",
                  "es": "Atotonilco, septiembre: una oferta fija diaria logró 78% del máximo; nuestros pronósticos, 85%"},
        first_customers=[{"en": "Atotonilco", "es": "Atotonilco"},
                         {"en": "Plants in QEnergy's PPA book", "es": "Plantas en la cartera de PPA de QEnergy"},
                         {"en": "The 67 awarded projects as they start", "es": "Los 67 proyectos adjudicados al arrancar"}],
        needs=[{"en": "Meter data and plant specifications", "es": "Datos de medidor y especificaciones de la planta"},
               {"en": "A diagnostic per plant as the sales tool", "es": "Un diagnóstico por planta como herramienta de venta"}],
        metrics=[("pct_of_max_today", 78, {"en": "% of maximum, fixed offer", "es": "% del máximo, oferta fija"}),
                 ("pct_of_max_forecast", 85, {"en": "% of maximum, our forecasts", "es": "% del máximo, nuestros pronósticos"}),
                 ("gain_mxn_per_day", 161, {"en": "MXN a day more on a 0.3 MW plant", "es": "MXN al día más en una planta de 0.3 MW"})],
        sample={"site": "Atotonilco", "period": "2026-09-11/2026-09-29", "realized_mxn": 36700, "with_forecasts_mxn": 39800,
                "target_after_3_months_mxn": 44200, "theoretical_max_mxn": 47100,
                "typical_day": {"date": "2026-09-21", "trader_mtr_mxn": -775, "forecast_mtr_mxn": -5,
                                "trader_gain_mxn": 3878, "forecast_gain_mxn": 4722}},
    ),
    dict(
        id="critical-hours", number=3, status="planned", arr=3_750_000,
        basis={"en": "250 sites at about $15k", "es": "250 sitios a unos $15 mil USD"},
        name={"en": "Critical-hour service", "es": "Servicio de horas críticas"},
        buyer={"en": "Qualified users of 1 MW and up, directly or through their supplier",
               "es": "Usuarios calificados de 1 MW o más, directo o a través de su suministrador"},
        offer={"en": "Daily likely critical hours, a load-cutting plan, and a yearly statement of savings once CENACE publishes the hours",
               "es": "Horas críticas probables cada día, un plan para bajar carga y un estado anual de ahorros cuando el CENACE publique las horas"},
        price={"en": "About $15k per site a year, or 20–25% of measured capacity savings",
               "es": "Unos $15 mil USD por sitio al año, o 20–25% del ahorro de potencia medido"},
        headline={"en": "Capacity cost 4.4 million MXN per MW-year in the 2025 settlement",
                  "es": "La potencia costó 4.4 millones de MXN por MW-año en la liquidación 2025"},
        first_customers=[{"en": "QEnergy's end buyers", "es": "Los clientes finales de QEnergy"},
                         {"en": "Customers of suppliers we sign", "es": "Clientes de los suministradores que firmemos"}],
        needs=[{"en": "Live proof when CENACE publishes the 2026 critical hours (about Feb 2027)",
                "es": "Prueba en vivo cuando el CENACE publique las horas críticas de 2026 (hacia feb 2027)"},
               {"en": "Site load data", "es": "Datos de carga del sitio"}],
        metrics=[("capacity_mxn_per_mw_year", 4_397_797, {"en": "MXN per MW-year, 2025", "es": "MXN por MW-año, 2025"}),
                 ("qualified_users", 1437, {"en": "registered qualified users", "es": "usuarios calificados registrados"}),
                 ("saving_mxn_per_half_mw", 2_198_899, {"en": "MXN a year if a site cuts 0.5 MW in critical hours",
                                                         "es": "MXN al año si un sitio baja 0.5 MW en horas críticas"})],
        sample={"tomorrow": [{"hour": 19, "likelihood": 0.62}, {"hour": 20, "likelihood": 0.81}, {"hour": 21, "likelihood": 0.57}],
                "site": "[QUALIFIED USER]", "peak_mw": 4.2, "cuttable_mw": 0.5,
                "note": {"en": "Likely critical hours. Final count when CENACE publishes the year's list, around February.",
                         "es": "Horas críticas probables. Conteo final cuando el CENACE publique la lista del año, hacia febrero."}},
    ),
    dict(
        id="trader-forecasts", number=4, status="pilot", arr=2_250_000,
        basis={"en": "15 firms at about $150k", "es": "15 empresas a unos $150 mil USD"},
        name={"en": "Supplier and trader forecasts", "es": "Pronósticos para suministradores y comercializadores"},
        buyer={"en": "Qualified suppliers and local traders", "es": "Suministradores calificados y comercializadores locales"},
        offer={"en": "Load, price and critical-hour forecasts for their books; price curves for new PPAs",
               "es": "Pronósticos de carga, precio y horas críticas para sus carteras; curvas de precio para nuevos PPA"},
        price={"en": "About $150k per firm a year", "es": "Unos $150 mil USD por empresa al año"},
        headline={"en": "45 qualified suppliers are operating; most lack an in-house forecasting desk",
                  "es": "Operan 45 suministradores calificados; la mayoría no tiene mesa de pronóstico propia"},
        first_customers=[{"en": "QEnergy as reference client", "es": "QEnergy como cliente de referencia"},
                         {"en": "Five suppliers chosen by book size", "es": "Cinco suministradores elegidos por tamaño de cartera"}],
        needs=[{"en": "Strict separation of each client's data", "es": "Separación estricta de los datos de cada cliente"}],
        metrics=[("suppliers_operating", 45, {"en": "qualified suppliers operating", "es": "suministradores calificados operando"}),
                 ("book_gwh", "250–350", {"en": "GWh a year, 100 MW PPA book", "es": "GWh al año, cartera de 100 MW en PPA"}),
                 ("saving_usd_per_mwh", "1–3", {"en": "USD/MWh less balancing cost", "es": "USD/MWh menos de costo de balance"})],
        sample={"book_mw": 100, "book_gwh": [250, 350], "value_usd_per_year": [250_000, 900_000]},
    ),
    dict(
        id="white-label", number=5, status="planned", arr=3_200_000,
        basis={"en": "400 MW at about $8k per MW", "es": "400 MW a unos $8 mil USD por MW"},
        name={"en": "Factory batteries, white-label", "es": "Baterías industriales, marca blanca"},
        buyer={"en": "Installers of batteries at factories and commercial sites; self-supply projects of 0.7–20 MW",
               "es": "Instaladores de baterías en fábricas y comercios; proyectos de autoconsumo de 0.7–20 MW"},
        offer={"en": "Our engine inside their product, under their brand: peak shaving, critical hours, solar shifting",
               "es": "Nuestro motor dentro de su producto, con su marca: recorte de picos, horas críticas, desplazamiento solar"},
        price={"en": "About $8k per installed MW a year", "es": "Unos $8 mil USD por MW instalado al año"},
        headline={"en": "New self-supply rules open projects of 0.7–20 MW to industrial users",
                  "es": "Las nuevas reglas de autoconsumo abren proyectos de 0.7–20 MW a usuarios industriales"},
        first_customers=[{"en": "Integrators competing with Quartux", "es": "Integradores que compiten con Quartux"},
                         {"en": "Equipment suppliers without their own software", "es": "Proveedores de equipo sin software propio"}],
        needs=[{"en": "A partner API and programme", "es": "Una API y un programa para socios"}],
        metrics=[("target_mw", 400, {"en": "MW under licence, 2030", "es": "MW bajo licencia, 2030"}),
                 ("partners", "3–5", {"en": "integrator partners", "es": "socios integradores"})],
        sample={"partner": "[INTEGRATOR]", "sites": 12, "mw": 18.5},
    ),
    dict(
        id="bankability", number=6, status="planned", arr=1_900_000,
        basis={"en": "15 reports at $60k + 20 subscriptions at $50k", "es": "15 reportes a $60 mil + 20 suscripciones a $50 mil USD"},
        name={"en": "Bankability and revenue curves", "es": "Bancabilidad y curvas de ingreso"},
        buyer={"en": "Banks, funds and developers financing batteries", "es": "Bancos, fondos y desarrolladores que financian baterías"},
        offer={"en": "An independent revenue forecast per project; a yearly subscription to Mexican price, spread and capacity curves",
               "es": "Un pronóstico independiente de ingresos por proyecto; una suscripción anual a curvas de precio, diferencial y potencia en México"},
        price={"en": "About $60k per report; $50k per subscription a year", "es": "Unos $60 mil USD por reporte; $50 mil por suscripción al año"},
        headline={"en": "Lenders who use our curves send us the plants they finance",
                  "es": "Los bancos que usan nuestras curvas nos mandan las plantas que financian"},
        first_customers=[{"en": "Banorte pilot report", "es": "Reporte piloto con Banorte"},
                         {"en": "Developers bidding in CFE mixed-project tenders", "es": "Desarrolladores en las licitaciones mixtas de CFE"}],
        needs=[{"en": "A published method and the live track record", "es": "Un método publicado y el historial en vivo"}],
        metrics=[("reports", 15, {"en": "project reports a year, 2030", "es": "reportes de proyecto al año, 2030"}),
                 ("subscriptions", 20, {"en": "curve subscriptions, 2030", "es": "suscripciones a curvas, 2030"})],
        sample={"project": "[BATTERY PROJECT]", "mw": 30, "duration_h": 3, "p50_revenue_mxn_per_mw_year": 2_900_000,
                "p90_revenue_mxn_per_mw_year": 2_100_000, "status": "draft"},
    ),
    dict(
        id="revenue-floors", number=7, status="planned", arr=2_400_000,
        basis={"en": "300 MW at about $8k per MW", "es": "300 MW a unos $8 mil USD por MW"},
        name={"en": "Revenue floors", "es": "Pisos de ingreso"},
        buyer={"en": "Battery owners and lenders who want a guaranteed minimum", "es": "Dueños de baterías y bancos que quieren un mínimo garantizado"},
        offer={"en": "A guaranteed minimum per MW, backed by a bank or insurer, with Genau running the battery; upside shared",
               "es": "Un mínimo garantizado por MW, respaldado por un banco o aseguradora, con Genau operando la batería; el excedente se comparte"},
        price={"en": "About $8k per MW a year on top of the optimization fee; the partner carries the risk",
               "es": "Unos $8 mil USD por MW al año además de la comisión de optimización; el socio asume el riesgo"},
        headline={"en": "A floor lets a battery borrow more", "es": "Un piso permite que una batería obtenga más deuda"},
        first_customers=[{"en": "Larger tender-winner batteries that need debt", "es": "Baterías grandes de ganadores de licitación que necesitan deuda"}],
        needs=[{"en": "A balance-sheet partner", "es": "Un socio con balance"}, {"en": "Two years of live results", "es": "Dos años de resultados en vivo"}],
        metrics=[("target_mw", 300, {"en": "MW under a floor, 2030", "es": "MW con piso, 2030"}),
                 ("genau_risk", 0, {"en": "market risk on Genau's balance sheet", "es": "riesgo de mercado en el balance de Genau"})],
        sample={"floor_mxn_per_mw_year": 1_800_000, "upside_split_owner_pct": 50},
    ),
    dict(
        id="grid-forecasting", number=8, status="planned", arr=1_500_000,
        basis={"en": "2–3 contracts", "es": "2–3 contratos"},
        name={"en": "Grid and distributed-solar forecasting", "es": "Pronóstico de red y solar distribuida"},
        buyer={"en": "CENACE, CFE distribution and supply, rooftop-solar aggregators", "es": "CENACE, CFE distribución y suministro, agregadores de solar en techos"},
        offer={"en": "Forecasts of rooftop solar the operator cannot see, and net load by zone",
               "es": "Pronósticos de la solar en techos que el operador no ve, y de la carga neta por zona"},
        price={"en": "Contracts of about $0.5–0.75M a year", "es": "Contratos de unos $0.5–0.75 millones USD al año"},
        headline={"en": "5,165 MW of distributed solar across about 600,000 systems at the end of 2025",
                  "es": "5,165 MW de solar distribuida en unos 600,000 sistemas a fines de 2025"},
        first_customers=[{"en": "A one-zone pilot", "es": "Un piloto en una zona"}],
        needs=[{"en": "Genau Mexico as the contracting entity", "es": "Genau México como entidad contratante"}],
        metrics=[("dg_mw", 5165, {"en": "MW of distributed solar", "es": "MW de solar distribuida"}),
                 ("dg_systems", 600368, {"en": "systems", "es": "sistemas"})],
        sample={"zone": "Occidental", "dg_mw": 748, "note": {"en": "Jalisco alone has 748 MW of rooftop solar.", "es": "Solo Jalisco tiene 748 MW de solar en techos."}},
    ),
    dict(
        id="qenergy", number=9, status="pilot", arr=500_000,
        basis={"en": "PPA book plus Acueducto", "es": "Cartera de PPA más Acueducto"},
        name={"en": "Genau Mexico with QEnergy", "es": "Genau México con QEnergy"},
        buyer={"en": "QEnergy's PPA book and Acueducto", "es": "La cartera de PPA de QEnergy y Acueducto"},
        offer={"en": "Trading forecasts for the PPA book; optimization of Acueducto",
               "es": "Pronósticos de trading para la cartera de PPA; optimización de Acueducto"},
        price={"en": "Fee per MWh or share of savings; 5–8% for Acueducto", "es": "Cuota por MWh o parte del ahorro; 5–8% para Acueducto"},
        headline={"en": "The first live trading book runs on our forecasts", "es": "La primera cartera de trading en vivo corre con nuestros pronósticos"},
        first_customers=[{"en": "Atotonilco trading book", "es": "Cartera de trading de Atotonilco"}],
        needs=[{"en": "The channel agreement", "es": "El contrato de canal"}, {"en": "QEnergy's book data", "es": "Los datos de la cartera de QEnergy"}],
        metrics=[("ppa_mw", 100, {"en": "MW of PPAs managed (estimate)", "es": "MW de PPA gestionados (estimado)"}),
                 ("acueducto_mw", 13.8, {"en": "MW battery, Acueducto", "es": "MW de batería, Acueducto"})],
        sample={"partner": "QEnergy", "ppa_mw": 100, "battery": "Acueducto"},
    ),
]
_BY_ID = {d["id"]: d for d in LINES}

RAMP = [
    (2027, 1_500_000, [{"en": "QEnergy book and Acueducto live", "es": "Cartera de QEnergy y Acueducto en vivo"},
                       {"en": "First 100–200 MW of batteries", "es": "Primeros 100–200 MW de baterías"},
                       {"en": "3–5 suppliers on forecasts; first bankability reports", "es": "3–5 suministradores con pronósticos; primeros reportes de bancabilidad"}]),
    (2028, 8_000_000, [{"en": "400 MW of batteries; 1 GW of plant forecasting", "es": "400 MW de baterías; 1 GW de pronóstico para plantas"},
                       {"en": "100 critical-hour sites; floor partner signed", "es": "100 sitios de horas críticas; socio de pisos firmado"}]),
    (2029, 18_000_000, [{"en": "700 MW of batteries; 2 GW of plants", "es": "700 MW de baterías; 2 GW de plantas"},
                        {"en": "White-label partners; first grid contract", "es": "Socios de marca blanca; primer contrato de red"}]),
    (2030, 30_000_000, [{"en": "1 GW of batteries; 3 GW of plants; 250 sites", "es": "1 GW de baterías; 3 GW de plantas; 250 sitios"},
                        {"en": "15 supplier and trader clients", "es": "15 clientes suministradores y comercializadores"}]),
]


def _line(d: dict, lang: str) -> ProductLine:
    return ProductLine(id=d["id"], number=d["number"], name=_t(d["name"], lang), buyer=_t(d["buyer"], lang),
                       offer=_t(d["offer"], lang), price=_t(d["price"], lang), status=d["status"], headline=_t(d["headline"], lang))


def _sample(v, lang: str):
    if isinstance(v, dict) and set(v) == {"en", "es"}:
        return _t(v, lang)
    if isinstance(v, dict):
        return {k: _sample(x, lang) for k, x in v.items()}
    if isinstance(v, list):
        return [_sample(x, lang) for x in v]
    return v


@router.get("/v1/products", response_model=list[ProductLine], summary="The nine product lines")
def list_products(_: Caller = Depends(current), lang: str = Depends(get_lang)) -> list[ProductLine]:
    return [_line(d, lang) for d in LINES]


@router.get("/v1/products/{product_id}", response_model=ProductDetail, summary="One product line, with sample figures for its screen")
def one_product(product_id: str, _: Caller = Depends(current), lang: str = Depends(get_lang)) -> ProductDetail:
    d = _BY_ID.get(product_id)
    if not d:
        raise ApiError(404, "not_found", what=product_id)
    base = _line(d, lang).model_dump()
    return ProductDetail(**base, first_customers=_tl(d["first_customers"], lang), needs=_tl(d["needs"], lang),
                         metrics=[{"key": k, "value": v, "label": _t(lbl, lang)} for k, v, lbl in d["metrics"]],
                         sample=_sample(d["sample"], lang))


@router.get("/v1/business/plan", response_model=BusinessPlan, summary="Genau's 2030 revenue build (internal; admin only)")
def business_plan(_: Caller = Depends(need("business.read")), lang: str = Depends(get_lang)) -> BusinessPlan:
    es = lang == "es"
    return BusinessPlan(
        target_arr_usd=30_000_000, target_year=2030,
        lines=[PlanLine(id=d["id"], number=d["number"], name=_t(d["name"], lang), arr_2030_usd=d["arr"], basis=_t(d["basis"], lang))
               for d in sorted(LINES, key=lambda d: -d["arr"])],
        ramp=[PlanYear(year=y, arr_usd=a, milestones=_tl(m, lang)) for y, a, m in RAMP],
        gate=("Feb 2027: CENACE publica las horas críticas de 2026 y se califican nuestros pronósticos congelados" if es
              else "Feb 2027: CENACE publishes the 2026 critical hours and our frozen forecasts are scored"),
        conditions=_tl([{"en": "The forecast proves itself live", "es": "El pronóstico se prueba en vivo"},
                        {"en": "Several Market Participants represent our clients", "es": "Varios Participantes del Mercado representan a nuestros clientes"},
                        {"en": "A team of about 20 by 2030", "es": "Un equipo de unas 20 personas para 2030"},
                        {"en": "A balance-sheet partner for revenue floors", "es": "Un socio con balance para los pisos de ingreso"}], lang),
        note=("Estimaciones de planeación de octubre de 2026, no ingresos contratados." if es
              else "Planning estimates from October 2026, not contracted revenue."),
    )
