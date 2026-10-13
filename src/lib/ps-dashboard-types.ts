/** Cloud-only reporting DTOs. Pending source rows never carry invented values. */
type PsField = 'hotel_id' | 'hotel_name' | 'service_line' | 'status' | 'outcome' | 'contract_id' | 'created_at' | 'inactivated_at' | 'end_date' | 'billing_period' | 'age_days' | 'completeness' | 'worst_grade' | 'latest_grade' | 'monthly_survey_score' | 'monthly_billing' | 'survey2' | 'nps' | 'active_services' | 'responses' | 'promoters' | 'detractors' | 'p25_days' | 'p75_days';
export type PsReportRow = Partial<Record<PsField, string | number | boolean | null>> & Record<string, string | number | boolean | null | undefined>;
export const PS_VIEWS = ['v_ps_lifecycle_flow', 'v_ps_churn_monthly', 'v_ps_renewal', 'v_ps_contract_lifetime', 'v_ps_onboard_cohort', 'v_ps_attach_rate', 'v_ps_account_health', 'v_ps_nps', 'v_ps_offboard'] as const;
export type PsView = (typeof PS_VIEWS)[number];
export type PsReport = { views: Record<PsView, PsReportRow[]>; pending: PsView[] };
export type PsFilter = { service: 'ALL' | 'ORM' | 'Marcom'; range: 'mtd' | '3m' | '6m' | '12m' | 'all' };
export type RiskRules = { grades: string[]; monthlySurveyBelow: number; monthlyBillingBelow: number; monthlyBillingAbove: number };
export const DEFAULT_RISK_RULES: RiskRules = { grades: ['C', 'D'], monthlySurveyBelow: 7, monthlyBillingBelow: 10000, monthlyBillingAbove: 100000 };
export function riskReasons(row: PsReportRow, rules: RiskRules) {
  const reasons: string[] = [];
  if (rules.grades.includes(String(row.worst_grade ?? row.latest_grade ?? ''))) reasons.push('Payment Grade');
  if (typeof row.monthly_survey_score === 'number' && row.monthly_survey_score < rules.monthlySurveyBelow) reasons.push('Monthly Meeting');
  if (typeof row.monthly_billing === 'number' && (row.monthly_billing < rules.monthlyBillingBelow || row.monthly_billing > rules.monthlyBillingAbove)) reasons.push('ยอดวางบิล');
  return reasons;
}
export function psScope(rows: PsReportRow[], filter: PsFilter, dateKey = 'billing_period', shift = 0, now = new Date()) {
  const months = { mtd: 1, '3m': 3, '6m': 6, '12m': 12, all: null }[filter.range];
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift + 1, 1)).toISOString().slice(0, 10);
  const start = months === null ? '0000-01-01' : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift - months + 1, 1)).toISOString().slice(0, 10);
  return rows.filter(row => (filter.service === 'ALL' || row.service_line === filter.service) && (row[dateKey] === null || row[dateKey] === undefined || (String(row[dateKey]) >= start && String(row[dateKey]) < end)));
}
export function ratio(rows: PsReportRow[], numerator: string, denominator: string): number | null {
  const total = rows.reduce((sum, row) => sum + Number(row[denominator] ?? 0), 0);
  return total > 0 ? rows.reduce((sum, row) => sum + Number(row[numerator] ?? 0), 0) / total * 100 : null;
}