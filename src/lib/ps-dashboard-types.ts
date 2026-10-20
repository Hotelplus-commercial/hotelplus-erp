/** Cloud-only reporting DTOs. Pending source rows never carry invented values. */
type PsField = 'hotel_id' | 'hotel_name' | 'service_line' | 'status' | 'outcome' | 'contract_id' | 'created_at' | 'inactivated_at' | 'end_date' | 'billing_period' | 'age_days' | 'completeness' | 'worst_grade' | 'latest_grade' | 'monthly_survey_score' | 'monthly_billing' | 'survey2' | 'nps' | 'active_services' | 'responses' | 'promoters' | 'detractors' | 'p25_days' | 'p75_days' | 'ae_owner_id' | 'start_date' | 'renewal_id' | 'renewal_due_date' | 'period' | 'revenue_thb' | 'fee_fixed_thb' | 'commission_thb' | 'value_ratio' | 'orm_tier' | 'achievement_pct' | 'portfolio_rev_median' | 'portfolio_n' | 'has_orm_commission' | 'pending_sync' | 'owned_service' | 'gap_service' | 'health_tier' | 'grade' | 'survey_score' | 'gate_pass' | 'gate_fail_reason' | 'sig_value_proof' | 'sig_happy' | 'sig_mature' | 'sig_timely' | 'readiness_score' | 'readiness_tier' | 'is_prime' | 'billing_model' | 'lever_field' | 'lever_amount' | 'last_increase_at' | 'months_since_increase' | 'signal_path' | 'cadence_path' | 'trigger' | 'trigger_pending' | 'revenue_profile' | 'band_bucket' | 'band_min_pct' | 'band_max_pct' | 'suggested_min_thb' | 'suggested_max_thb' | 'why_chips';
export type PsReportRow = Partial<Record<PsField, string | number | boolean | null>> & Record<string, string | number | boolean | null | undefined>;
export const PS_VIEWS = ['v_ps_lifecycle_flow', 'v_ps_churn_monthly', 'v_ps_renewal', 'v_ps_contract_lifetime', 'v_ps_onboard_cohort', 'v_ps_attach_rate', 'v_ps_account_health', 'v_ps_nps', 'v_ps_offboard', 'v_ps_risk_scorecard', 'v_ps_roi', 'v_ps_crosssell', 'v_ps_repricing'] as const;
export type PsView = (typeof PS_VIEWS)[number];
/** demo/now are set only by the bundled preview fixture (fixed clock). */
export type PsReport = { views: Record<PsView, PsReportRow[]>; pending: PsView[]; demo?: boolean; now?: string; wonMtd?: number };
export type PsFilter = { service: 'ALL' | 'ORM' | 'Marcom'; range: 'mtd' | '3m' | '6m' | '12m' | 'all' | 'custom'; period?: { from: string; to: string }; customPeriod?: { from: string; to: string } };
export type RiskRules = { grades: string[]; monthlySurveyBelow: number; monthlyBillingBelow: number; monthlyBillingAbove: number };
export const DEFAULT_RISK_RULES: RiskRules = { grades: ['C', 'D'], monthlySurveyBelow: 7, monthlyBillingBelow: 10000, monthlyBillingAbove: 100000 };
/** R1.2 §3.1 — In / Out counts recurring (monthly) services only: ORM, Marcom and a monthly system-fee service line
 *  when it exists as its own row. Setup fees and one-time jobs (billing_kind ONE_TIME or any other line) are excluded. */
export const RECURRING_SERVICE_LINES = ['ORM', 'Marcom', 'SYSTEM_FEE'] as const;
export const isRecurringService = (row: PsReportRow) =>
  row['billing_kind'] !== 'ONE_TIME' && (RECURRING_SERVICE_LINES as readonly string[]).includes(String(row.service_line ?? ''));
export function riskReasons(row: PsReportRow, rules: RiskRules) {
  const reasons: string[] = [];
  if (rules.grades.includes(String(row.worst_grade ?? row.latest_grade ?? ''))) reasons.push('Payment Grade');
  if (typeof row.monthly_survey_score === 'number' && row.monthly_survey_score < rules.monthlySurveyBelow) reasons.push('Monthly Meeting');
  if (typeof row.monthly_billing === 'number' && (row.monthly_billing < rules.monthlyBillingBelow || row.monthly_billing > rules.monthlyBillingAbove)) reasons.push('ยอดวางบิล');
  return reasons;
}
export function psScope(rows: PsReportRow[], filter: PsFilter, dateKey = 'billing_period', shift = 0, now = new Date()) {
  if (!filter.period && filter.range === 'custom' && filter.customPeriod) filter = { ...filter, period: shiftPeriodMonths(filter.customPeriod, shift) };
  const months = { mtd: 1, '3m': 3, '6m': 6, '12m': 12, all: null, custom: 1 }[filter.range];
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift + 1, 1)).toISOString().slice(0, 10);
  const start = months === null ? '0000-01-01' : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift - months + 1, 1)).toISOString().slice(0, 10);
  return rows.filter(row => (filter.service === 'ALL' || row.service_line === filter.service) && (dateKey === 'none' || (row[dateKey] != null && (filter.period ? String(row[dateKey]).slice(0,10) >= filter.period.from && String(row[dateKey]).slice(0,10) <= filter.period.to : String(row[dateKey]) >= start && String(row[dateKey]) < end))));
}
export function ratio(rows: PsReportRow[], numerator: string, denominator: string): number | null {
  const total = rows.reduce((sum, row) => sum + Number(row[denominator] ?? 0), 0);
  return total > 0 ? rows.reduce((sum, row) => sum + Number(row[numerator] ?? 0), 0) / total * 100 : null;
}
/** Latest billing period present in rows (Churn = Gross Churn of the latest month in the window, MoM). */
export function latestPeriod(rows: PsReportRow[]) {
  const last = [...new Set(rows.map(r => String(r.billing_period ?? '')))].sort().at(-1);
  return rows.filter(r => String(r.billing_period ?? '') === last);
}
export const SURVEY2_LOW_BELOW = 3; // O-PS4 pending confirmation: Survey #2 stars below this = low.
export const NEAR_END_DAYS = 60; // same threshold as Portfolio snapshot "ใกล้หมด 60 วัน".
export type HealthTier = 'high' | 'watch' | 'healthy' | 'pending';
export type HealthDim = 'grade' | 'survey' | 'ws2' | 'nearEnd';
export const DIM_LABEL: Record<HealthDim, string> = { grade: 'Grade C/D', survey: 'Survey ต่ำ', ws2: 'Property Information Form ไม่ครบ', nearEnd: 'ใกล้หมด ≤60 วัน' };
/** v1.1 §E: binary dims (Flag excluded); tier only when the confirmed active-service source exists. */
export function healthOf(row: PsReportRow, rules: RiskRules, now = new Date()): { dims: HealthDim[]; tier: HealthTier } {
  const dims: HealthDim[] = [];
  if (rules.grades.includes(String(row.worst_grade ?? ''))) dims.push('grade');
  if (typeof row.survey2 === 'number' && row.survey2 < SURVEY2_LOW_BELOW) dims.push('survey');
  if (row.completeness != null && row.completeness !== 'complete') dims.push('ws2');
  if (row.end_date) { const d = (new Date(String(row.end_date)).getTime() - now.getTime()) / 864e5; if (d >= 0 && d <= NEAR_END_DAYS) dims.push('nearEnd'); }
  if (row.active_services == null) return { dims, tier: 'pending' };
  return { dims, tier: row.worst_grade === 'D' || dims.length >= 2 ? 'high' : dims.length === 1 ? 'watch' : 'healthy' };
}

/** Shift a Bangkok-calendar period by whole months (end-of-month safe). */
export function shiftPeriodMonths(p: { from: string; to: string }, months: number) {
  if (!months) return p;
  const mv = (iso: string, endSnap: boolean) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    const isEnd = d === new Date(Date.UTC(y, m, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + months, endSnap && isEnd ? last : Math.min(d, last))).toISOString().slice(0, 10);
  };
  return { from: mv(p.from, false), to: mv(p.to, true) };
}
