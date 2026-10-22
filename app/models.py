"""Request and response schemas for the Pantheon API (v1, release 0.2).

Everything here is an engine OUTPUT (disclosure level T0): forecasts, plans,
likelihoods, results. No model features, drivers or internals.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class Role(str, Enum):
    viewer = "viewer"
    auditor = "auditor"
    operator = "operator"
    asset_manager = "asset_manager"
    admin = "admin"
    engine = "engine"      # the Pantheon forecasting engine: posts forecasts, nothing else
    partner = "partner"    # QEnergy (José Antonio): offer files and settlements only


class Strategy(str, Enum):
    conservative = "conservative"
    balanced = "balanced"
    aggressive = "aggressive"


class PlanStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    missed = "missed"


# ---------- People ----------

class User(BaseModel):
    id: str
    name: str
    role: Role
    email: str
    language: Literal["en", "es"] = "es"
    whatsapp_masked: Optional[str] = Field(None, description="Verified WhatsApp number, masked. Null if none on file.")


class Me(BaseModel):
    user: User
    organization: str
    permissions: list[str]
    site_ids: list[str]
    whatsapp_number: Optional[str] = Field(None, description="Your own verified WhatsApp number, in full.")


class RoleChange(BaseModel):
    role: Role


class NotificationSettings(BaseModel):
    email: bool = True
    whatsapp: bool = True
    sms: bool = False
    digest_time_local: str = Field("07:30", pattern=r"^\d{2}:\d{2}$", description="When the daily digest goes out.")


# ---------- Sites ----------

class DataFeed(BaseModel):
    name: Literal["cenace_prices", "site_telemetry", "weather"]
    status: Literal["live", "stale", "delayed"]
    last_update: datetime
    age_minutes: int


class Site(BaseModel):
    id: str
    name: str
    region: str
    node_id: str = Field(description="CENACE pricing node. Placeholder in sample data.")
    power_mw: float
    energy_mwh: float
    solar_mw: float = Field(0, description="Co-located solar capacity; 0 for standalone batteries.")
    status: Literal["discharging", "charging", "holding", "maintenance", "onboarding"]
    soc_pct: Optional[float] = None


class PlantNow(BaseModel):
    site_id: str
    as_of: datetime
    battery_mw: float = Field(description="Positive = discharging, negative = charging.")
    soc_pct: float
    soc_mwh: float
    solar_mw: float
    price_now: float
    price_forecast: float
    energy_margin_today: float
    in_likely_critical_hour: bool
    on_plan: bool
    next_action: str
    feeds: list[DataFeed]
    sample_data: bool = True


# ---------- Plans ----------

class HourPlan(BaseModel):
    hour: int = Field(ge=0, le=23, description="Hour starting, plant local time.")
    price_forecast: float = Field(description="Middle case, MXN/MWh.")
    price_low: float
    price_high: float
    solar_mw: float
    dispatch_mw: float = Field(description="Positive = discharge, negative = charge.")
    charge_from_solar_mw: float
    charge_from_grid_mw: float
    soc_mwh_end: float
    soc_pct_end: float
    critical_likelihood: float = Field(ge=0, le=1, description="Chance this hour is confirmed critical by CENACE.")
    likely_critical: bool
    overridden: bool = False


class ScheduleBlock(BaseModel):
    start: str
    end: str
    action: Literal["charge", "discharge"]
    max_mw: float
    source: str


class Capacity(BaseModel):
    status: Literal["projection", "verified"] = "projection"
    annual_value_mxn: Optional[float] = Field(None, description="Null until verified against CENACE settlement for this node.")
    battery_available_mw_in_flagged_hours: float
    note: str


class PlanSummary(BaseModel):
    currency: Literal["MXN"] = "MXN"
    discharge_revenue: float
    charging_cost: float = Field(description="Grid purchases plus solar not sold, valued at the node price.")
    wear_cost: float
    energy_margin: float
    spread_captured: Optional[float]
    cycles: float
    solar_total_mwh: float
    solar_to_battery_mwh: float
    solar_to_grid_mwh: float
    likely_critical_hours: int
    likely_critical_hours_covered: int


class Violation(BaseModel):
    code: str
    severity: Literal["hard", "soft"]
    message: str
    hour: Optional[int] = None


class LimitCheck(BaseModel):
    ok: bool
    violations: list[Violation] = []


class Plan(BaseModel):
    site_id: str
    delivery_date: date
    market: Literal["MDA"] = "MDA"
    strategy: Strategy
    status: PlanStatus
    offer_deadline: datetime
    minutes_to_deadline: int
    hours: list[HourPlan]
    schedule: list[ScheduleBlock]
    summary: PlanSummary
    capacity: Capacity
    limit_check: LimitCheck
    explanation: str
    data_status: list[DataFeed]
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    sample_data: bool = True


class StrategyOption(BaseModel):
    strategy: Strategy
    description: str
    energy_margin: float
    cycles: float
    likely_critical_hours_covered: int
    within_limits: bool
    violations: list[Violation] = []


class ApproveRequest(BaseModel):
    strategy: Strategy = Strategy.balanced
    acknowledge_soft_violations: bool = False
    sign_off: bool = Field(False, description="Required from an asset manager when the battery state is modelled (no EMS reading).")
    note: Optional[str] = Field(None, max_length=500)


class OverrideRequest(BaseModel):
    hour: int = Field(ge=0, le=23)
    dispatch_mw: float
    reason: str = Field(min_length=3, max_length=500)


# ---------- Home (morning summary) ----------

class ActionItem(BaseModel):
    kind: Literal["approve_plan", "review_settlement", "incident"]
    site_id: str
    title: str
    due: Optional[datetime] = None
    minutes_left: Optional[int] = None
    resource: str


class Home(BaseModel):
    as_of: datetime
    actions: list[ActionItem]
    yesterday_energy_margin: float
    yesterday_vs_plan_pct: float
    yesterday_critical_hours: str
    open_alerts: int
    sample_data: bool = True


# ---------- Battery ----------

class OperatingLimits(BaseModel):
    min_soc_pct: float = Field(10, ge=0, le=100)
    max_soc_pct: float = Field(95, ge=0, le=100)
    max_charge_mw: Optional[float] = Field(None, gt=0, description="Defaults to rated power.")
    max_discharge_mw: Optional[float] = Field(None, gt=0, description="Defaults to rated power.")
    max_cycles_per_day: float = Field(1.0, gt=0, le=5)
    annual_cycle_budget: int = Field(365, gt=0)
    wear_cost_per_mwh: float = Field(180, ge=0, description="MXN per MWh discharged, charged against every plan.")
    reserve_for_critical_hours: bool = True
    require_approval: bool = True
    intraday_reoptimization: bool = False
    critical_flag_threshold: float = Field(0.5, gt=0, lt=1, description="Likelihood at which an hour is flagged as likely critical.")
    settlement_review_threshold_pct: float = Field(3.0, gt=0, le=50)

    @model_validator(mode="after")
    def _order(self) -> "OperatingLimits":
        if self.min_soc_pct >= self.max_soc_pct:
            raise ValueError("min_soc_pct must be below max_soc_pct")
        return self


class Health(BaseModel):
    state_of_health_pct: float
    warranty_minimum_pct_today: float
    cycles_ytd: int
    annual_cycle_budget: int
    availability_30d_pct: float
    avg_cell_temp_c: float
    sample_data: bool = True


class MaintenanceWindowIn(BaseModel):
    start: datetime
    end: datetime
    reason: str = Field(min_length=3, max_length=200)

    @model_validator(mode="after")
    def _order(self) -> "MaintenanceWindowIn":
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class MaintenanceWindow(MaintenanceWindowIn):
    id: str


# ---------- Track record ----------

class AccuracyDay(BaseModel):
    date: date
    error_pct: float


class AccuracyReport(BaseModel):
    site_id: str
    days: int
    avg_error_pct: float
    target_error_pct: float
    days_within_target: int
    peak_hour_hits: int
    critical_hours_caught: Optional[int] = Field(None, description="Null until the live forward test reports.")
    critical_hours_total: Optional[int] = None
    verification_status: Literal["not_started", "in_progress", "verified"]
    scoring_note: str
    daily: list[AccuracyDay]
    sample_data: bool = True


# ---------- Settlement, disputes, reports ----------

class SettlementDay(BaseModel):
    date: date
    expected: float
    settled: Optional[float]
    difference_pct: Optional[float]
    status: Literal["matched", "review", "awaiting_statement", "disputed"]


class WaterfallStep(BaseModel):
    label: str
    amount: Optional[float] = Field(description="Null for a line that is still pending settlement.")
    kind: Literal["add", "cost", "total", "pending"]


class SettlementReport(BaseModel):
    site_id: str
    month: str
    currency: Literal["MXN"] = "MXN"
    review_threshold_pct: float
    settled_total: float
    expected_on_settled_days: float
    difference_pct: float
    review_count: int
    days: list[SettlementDay]
    waterfall: list[WaterfallStep]
    sample_data: bool = True


class DisputeIn(BaseModel):
    date: date
    reason: str = Field(min_length=5, max_length=1000)


class Dispute(BaseModel):
    id: str
    site_id: str
    date: date
    reason: str
    status: Literal["open", "submitted", "resolved"]
    expected: float
    settled: float
    difference_pct: float
    evidence: list[str]
    opened_by: str
    opened_at: datetime


class MonthlyReport(BaseModel):
    site_id: str
    site_name: str
    month: str
    prepared_at: datetime
    headline: str
    settlement: SettlementReport
    track_record: AccuracyReport
    critical_hours_covered: str
    capacity: Capacity
    cycles_used: int
    approvals: int
    overrides: int
    sample_data: bool = True


# ---------- Alerts & audit ----------

class Alert(BaseModel):
    id: str
    severity: Literal["action", "high", "medium", "low"]
    delivery: Literal["push", "digest"]
    site_id: Optional[str]
    title: str
    detail: str
    created_at: datetime
    due: Optional[datetime] = None
    status: Literal["open", "resolved"] = "open"
    options: list[str] = Field([], description="Decisions this alert accepts, if any.")
    resource: Optional[str] = None
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    escalated_to: Optional[str] = None


class AlertDecision(BaseModel):
    choice: str = Field(description="One of the alert's options, or 'acknowledge'.")
    note: Optional[str] = Field(None, max_length=500)


class Escalation(BaseModel):
    to_user_id: str
    note: Optional[str] = Field(None, max_length=500)


class AuditEntry(BaseModel):
    at: datetime
    actor: str
    action: str
    detail: str
    site_id: Optional[str] = None


# ---------- Webhooks ----------

WebhookEvent = Literal["alert.created", "alert.resolved", "plan.approved", "plan.deadline_missed", "settlement.flagged", "dispute.opened"]


class WebhookIn(BaseModel):
    url: str = Field(pattern=r"^https://")
    events: list[WebhookEvent] = Field(min_length=1)


class Webhook(BaseModel):
    id: str
    url: str
    events: list[str]
    secret_hint: str = Field(description="Last 4 characters of the signing secret.")
    created_at: datetime


class WebhookCreated(Webhook):
    secret: str = Field(description="Shown once. Verify X-Pantheon-Signature (HMAC-SHA256 of the body) with it.")


class WebhookDelivery(BaseModel):
    id: str
    event: str
    created_at: datetime
    status: Literal["queued", "delivered", "failed"]
    signature: str
    payload: dict


# ---------- Simulation ----------

class SimulationRequest(BaseModel):
    region: Literal["Nuevo León", "Jalisco", "Sonora", "Yucatán", "Baja California"]
    power_mw: float = Field(ge=1, le=500)
    duration_h: Literal[2, 4, 6]
    strategy: Strategy = Strategy.balanced
    solar_mw: float = Field(0, ge=0, le=2000, description="Co-located solar, if any. Lowers charging cost.")
    start_of_operation: Optional[str] = Field(None, examples=["2027-Q3"])


class SimulationMonth(BaseModel):
    month: int
    p10: float
    p50: float
    p90: float


class DurationOption(BaseModel):
    duration_h: int
    energy_mwh: float
    annual_net_p50: float
    per_mw_year: float
    cycles_per_year: int


class SimulationResult(BaseModel):
    currency: Literal["MXN"] = "MXN"
    annual_net_p10: float
    annual_net_p50: float
    annual_net_p90: float
    per_mw_year: float
    cycles_per_year: int
    monthly: list[SimulationMonth]
    duration_comparison: list[DurationOption]
    capacity_value: Literal["not_included"] = "not_included"
    disclaimer: str
    sample_data: bool = True


# ---------- Daily replay ----------

class ReplayHour(BaseModel):
    hour: int = Field(ge=0, le=23)
    price_forecast: float = Field(description="MXN/MWh, as forecast when the plan was approved.")
    price_actual: float = Field(description="MXN/MWh, CENACE published price.")
    planned_mw: float = Field(description="Positive = discharge, negative = charge.")
    actual_mw: float
    cleared_mw: Optional[float] = Field(None, description="What CENACE cleared for the hour. Differs from planned_mw on a deviation.")
    planned_value: float = Field(description="MXN the plan expected this hour, against the battery sitting idle.")
    value_vs_idle: float = Field(description="MXN this hour actually added against the battery sitting idle.")
    running_total: float
    confirmed_critical: bool = Field(description="CENACE confirmed this hour as critical.")


class ReplayDriver(BaseModel):
    code: Literal["prices", "dispatch"]
    label: str
    amount: float


class ReplaySummary(BaseModel):
    currency: Literal["MXN"] = "MXN"
    value_vs_idle: float
    plan_value: float
    vs_plan: float
    vs_plan_pct: float
    critical_hours: list[int]
    critical_hours_covered: str
    fee_mxn: Optional[float] = Field(None, description="Pantheon's fee for the day. Null until the commercial terms are set.")
    fee_note: str


class Replay(BaseModel):
    site_id: str
    date: date
    earned_its_fee: bool
    headline: str
    baseline: str = Field(description="What 'doing nothing' means.")
    wear_cost_per_mwh: float
    summary: ReplaySummary
    drivers: list[ReplayDriver]
    hours: list[ReplayHour]
    sources: dict[str, str] = Field(default_factory=dict, description="Where each series comes from: dispatched, measured, prices, settlement.")
    sample_data: bool = True


# ---------- WhatsApp channel ----------

class WhatsAppButton(BaseModel):
    id: Literal["approve", "see_details", "keep_plan", "hold_battery", "hand_off"]
    title: str


class WhatsAppMessage(BaseModel):
    kind: Literal["plan", "incident"]
    to: Optional[str] = Field(None, description="Recipient, masked. Null if you have no verified number.")
    text: str
    chart_caption: Optional[str] = None
    buttons: list[WhatsAppButton]
    can_approve_here: Optional[bool] = Field(None, description="False when the plan needs a sign-off, which only the app can take.")
    context: dict
    sample_data: bool = True


class WhatsAppInbound(BaseModel):
    from_number: str = Field(examples=["+52 81 0000 4821"])
    button_id: Literal["approve", "see_details", "keep_plan", "hold_battery", "hand_off"]
    context: dict = Field(description='{"site_id", "date"} for a plan, or {"alert_id"} for an incident.')


class WhatsAppReply(BaseModel):
    status: Literal["approved", "link", "resolved", "escalated"]
    reply_text: str
    link: Optional[str] = None
    audit: Optional[AuditEntry] = None


# ---------- CENACE: offers, cleared schedules, imports, interconnection, battery state ----------

class OfferStatus(str, Enum):
    offered = "offered"          # approved in Pantheon, not yet submitted by [TRADER]
    submitted = "submitted"      # [TRADER] confirmed submission to CENACE (MDA)
    cleared = "cleared"          # CENACE's day-ahead result received


class OfferHour(BaseModel):
    hour: int = Field(ge=0, le=23)
    net_export_mw: float = Field(description="Solar plus battery at the interconnection point. This is what CENACE sees.")
    battery_mw: float = Field(description="Positive = discharge, negative = charge.")
    solar_mw: float
    offer_type: Literal["self_schedule"] = "self_schedule"


class Offer(BaseModel):
    site_id: str
    delivery_date: date
    market: Literal["MDA"] = "MDA"
    node_id: str
    status: OfferStatus
    deadline: datetime = Field(description="D-1 10:00 America/Mexico_City. PLACEHOLDER: confirm the current MDA deadline.")
    minutes_to_deadline: int
    submitted_at: Optional[datetime] = None
    submitted_by: Optional[str] = None
    confirmation: Optional[str] = Field(None, description="[TRADER]'s portal confirmation reference.")
    export_cap_mw: Optional[float] = None
    hours: list[OfferHour]
    note: str = "Pantheon does not submit to CENACE or control the battery. [TRADER] submits this self-schedule; CENACE clears and dispatches it."
    sample_data: bool = True


class SubmittedIn(BaseModel):
    by: str = Field(min_length=1, max_length=120, examples=["[TRADER]"])
    confirmation: str = Field(min_length=1, max_length=120, examples=["MDA-2026-10-18-00412"])
    force: bool = Field(False, description="Record a submission after the deadline (late or corrected offer).")


class ClearedNote(BaseModel):
    hour: int = Field(ge=0, le=23)
    reason: str = Field(max_length=200)


class ClearedIn(BaseModel):
    cleared_mw: list[float] = Field(min_length=24, max_length=24, description="Net export MW per hour as cleared by CENACE.")
    source: str = Field("[TRADER] portal", max_length=120)
    notes: list[ClearedNote] = []


class Deviation(BaseModel):
    hour: int
    offered_mw: float
    cleared_mw: float
    reason: Optional[str] = None
    margin_impact: float = Field(description="MXN, at the frozen price forecast, wear included.")


class ClearedSchedule(BaseModel):
    site_id: str
    delivery_date: date
    received_at: datetime
    source: str
    cleared_mw: list[float]
    deviations: list[Deviation]
    margin_impact: float
    status: Literal["as_offered", "deviations"]
    sample_data: bool = True


class Imported(BaseModel):
    kind: Literal["meter", "statement"]
    day: Optional[date] = Field(None, description="The day the meter file covers. Null for a statement file (its rows carry dates).")
    rows: int
    received_at: datetime
    file: Optional[str] = None


class SourceStatus(BaseModel):
    name: Literal["ems", "meter", "cenace_prices", "cenace_instructions", "cleared", "statements", "registration"]
    label: str
    status: Literal["live", "stale", "pending", "blocked"]
    detail: str
    last: Optional[datetime] = None


class DataSources(BaseModel):
    site_id: str
    as_of: datetime
    sources: list[SourceStatus]
    blocked: list[str]
    pending: list[str]
    sample_data: bool = True


class Interconnection(BaseModel):
    node: str = Field("[NODE ID]", description="CENACE pricing node.")
    export_cap_mw: Optional[float] = Field(None, gt=0, description="Maximum net export allowed by the interconnection contract. Offers are clipped to it.")
    grid_charging: Literal["not_allowed", "allowed_with_limit", "allowed"] = "allowed_with_limit"
    pml_limit_mxn: Optional[float] = Field(None, ge=0, description="Only charge from the grid below this price (MXN/MWh), when grid charging is allowed with a limit.")
    storage_registered: bool = Field(False, description="Battery parameters registered with CENACE as part of the unit.")


class BatteryState(BaseModel):
    site_id: str
    as_of: datetime
    state_source: Literal["ems", "model"]
    soc_pct: float
    soc_model: Optional[dict] = Field(None, description='{"value", "band": [low, high]} when the state is modelled.')
    approval_needs_signoff: bool
    state_of_health_pct: float
    avg_cell_temp_c: float
    note: str
    sample_data: bool = True
