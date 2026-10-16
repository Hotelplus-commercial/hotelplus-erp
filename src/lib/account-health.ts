/* Account Health + 360 v1.0 — pure, read-only selector. Score = COUNT(flagged dims); never weighted.
 * Reads already-computed source values (grade, revenue, tier); never recomputes them. */
import type { PsReportRow } from './ps-dashboard-types';

// Threshold config — PLACEHOLDER defaults, confirm before go-live (O-AH3). null = TBD → dim not computable.
export const CHURN_PARTIAL_WINDOW_MONTHS = 12; // TODO confirm
export const ROI_DECLINE_MONTHS = 3; // TODO confirm
export const ROI_FLAT_MONTHS = 6; // TODO confirm
export const ROI_FLAT_BAND_PCT = 5; // TODO confirm
export const ROI_VALUE_RATIO_MIN: number | null = null; // TODO business must confirm — no live default
export const TIER_A_PERSIST_MONTHS = 3; // TODO confirm
export const PORTFOLIO_MIN_N = 5; // TODO confirm
export const SURVEY_LOW_MAX: number | null = 3; // O-PS4 pending; existing v1.1 placeholder kept
export const RENEWAL_DAYS = 60;
export const DEMO_VALUE_RATIO_MIN = 3; // demo-only sample cutoff

export type DimCode = 'GRADE_CD' | 'SURVEY_LOW' | 'WS2_INCOMPLETE' | 'RENEWAL_60' | 'CHURN_PARTIAL' | 'ROI_REV_DECLINE' | 'ROI_REV_FLAT' | 'ROI_VALUE_LOW' | 'TIER_A_PERSIST' | 'FLAG_OPEN' | 'MARCOM_ADS' | 'MARCOM_PERF';
export const DIM_TH: Record<DimCode, string> = {
  GRADE_CD: 'Grade C/D', SURVEY_LOW: 'Survey ต่ำ', WS2_INCOMPLETE: 'WS-2 ไม่ครบ', RENEWAL_60: 'ต่อสัญญา ≤60 วัน', CHURN_PARTIAL: 'churn บางบริการ',
  ROI_REV_DECLINE: 'revenue ขาลง', ROI_REV_FLAT: 'revenue ทรงตัว', ROI_VALUE_LOW: 'value ratio ต่ำ', TIER_A_PERSIST: 'Tier A ต่อเนื่อง',
  FLAG_OPEN: 'Flag (รอ Meeting)', MARCOM_ADS: 'Marcom Ads (L2)', MARCOM_PERF: 'Marcom Perf (L2)',
};
/** Inert slots: never flag, never count. */
export const INERT_DIMS: DimCode[] = ['FLAG_OPEN', 'MARCOM_ADS', 'MARCOM_PERF'];
export const ORM_DIMS: DimCode[] = ['ROI_REV_DECLINE', 'ROI_REV_FLAT', 'ROI_VALUE_LOW', 'TIER_A_PERSIST'];
export type Dim = { code: DimCode; label: string; value?: string };
export type Tier = 'high' | 'watch' | 'healthy' | 'pending';
export type AccountHealth = { hotel_id: string; row: PsReportRow; dims: Dim[]; score: number; tier: Tier; compound: boolean; hasOrm: boolean; roi: PsReportRow[] };

export type HealthCtx = { now: Date; roi: PsReportRow[]; flow: PsReportRow[]; ratioMin: number | null };

const monthKey = (v: unknown) => String(v ?? '').slice(0, 7);
/** Closed months only, ascending; rows missing hotel_id/period are skipped (no mis-attribution). */
export function roiSeries(roi: PsReportRow[], hotelId: string, now: Date) {
  const cur = now.toISOString().slice(0, 7);
  return roi.filter(r => r.hotel_id === hotelId && r.period && monthKey(r.period) < cur).sort((a, b) => monthKey(a.period).localeCompare(monthKey(b.period)));
}
const num = (v: unknown) => (typeof v === 'number' ? v : v == null || v === '' ? null : Number(v));

export function tierAStreak(series: PsReportRow[]) { let k = 0; for (let i = series.length - 1; i >= 0 && series[i]!.orm_tier === 'A'; i--) k++; return k; }
/** 3-layer seasonality: own-baseline downtrend AND (absolute Tier A floor OR bottom-relative to same-month portfolio median when n ≥ MIN_N). Never raw MoM alone. */
export function revenueDecline(series: PsReportRow[]): boolean {
  const last = series.slice(-ROI_DECLINE_MONTHS);
  if (last.length < ROI_DECLINE_MONTHS) return false;
  const rev = last.map(r => num(r.revenue_thb));
  if (rev.some(v => v == null)) return false;
  const down = rev.every((v, i) => i === 0 || v! < rev[i - 1]!);
  if (!down) return false;
  const absolute = last.every(r => r.orm_tier === 'A');
  const relativeOk = last.every(r => (num(r.portfolio_n) ?? 0) >= PORTFOLIO_MIN_N && num(r.portfolio_rev_median) != null);
  const relative = relativeOk && last.every(r => num(r.revenue_thb)! < num(r.portfolio_rev_median)!);
  return absolute || relative;
}
export function revenueFlat(series: PsReportRow[]): boolean {
  const last = series.slice(-ROI_FLAT_MONTHS).map(r => num(r.revenue_thb));
  if (last.length < ROI_FLAT_MONTHS || last.some(v => v == null)) return false;
  const mean = last.reduce((s, v) => s + v!, 0) / last.length;
  return mean > 0 && last.every(v => Math.abs(v! - mean) / mean * 100 <= ROI_FLAT_BAND_PCT);
}
export function trailingValueRatio(series: PsReportRow[]) {
  const v = series.slice(-3).map(r => num(r.value_ratio)).filter((x): x is number => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export function accountHealthOf(row: PsReportRow, ctx: HealthCtx): AccountHealth {
  const id = String(row.hotel_id);
  const dims: Dim[] = [];
  const add = (code: DimCode, value?: string) => dims.push({ code, label: DIM_TH[code], ...(value ? { value } : {}) });
  const grades = [row.latest_grade, row.worst_grade].map(g => String(g ?? ''));
  if (grades.some(g => g === 'C' || g === 'D')) add('GRADE_CD');
  if (SURVEY_LOW_MAX != null && typeof row.survey2 === 'number' && row.survey2 < SURVEY_LOW_MAX) add('SURVEY_LOW', `${row.survey2}★`);
  if (row.completeness != null && row.completeness !== 'complete') add('WS2_INCOMPLETE');
  if (row.end_date) { const d = (new Date(String(row.end_date)).getTime() - ctx.now.getTime()) / 864e5; if (d >= 0 && d <= RENEWAL_DAYS) add('RENEWAL_60', `${Math.ceil(d)} วัน`); }
  const since = new Date(ctx.now); since.setUTCMonth(since.getUTCMonth() - CHURN_PARTIAL_WINDOW_MONTHS);
  const lost = ctx.flow.filter(f => f.hotel_id === id && f.inactivated_at && new Date(String(f.inactivated_at)) >= since && new Date(String(f.inactivated_at)) <= ctx.now);
  if (lost.length && row.active_services != null && Number(row.active_services) > 0) add('CHURN_PARTIAL', lost.map(l => String(l.service_line ?? '')).join('/'));
  const series = roiSeries(ctx.roi, id, ctx.now);
  const hasOrm = row.has_orm_commission === true;
  if (hasOrm && series.length) {
    const streak = tierAStreak(series);
    if (revenueDecline(series)) add('ROI_REV_DECLINE');
    if (revenueFlat(series)) add('ROI_REV_FLAT');
    const vr = trailingValueRatio(series);
    if (ctx.ratioMin != null && vr != null && vr < ctx.ratioMin) add('ROI_VALUE_LOW', vr.toFixed(1) + '×');
    if (streak >= TIER_A_PERSIST_MONTHS) add('TIER_A_PERSIST', `Tier A×${streak}`);
  }
  const score = dims.length;
  const compound = dims.some(d => d.code === 'TIER_A_PERSIST') && dims.some(d => d.code === 'ROI_REV_DECLINE');
  const tier: Tier = row.active_services == null ? 'pending' : grades.includes('D') || score >= 2 ? 'high' : score === 1 ? 'watch' : 'healthy';
  return { hotel_id: id, row, dims, score, tier, compound, hasOrm, roi: series };
}

const ORDER: Record<Tier, number> = { high: 0, watch: 1, healthy: 2, pending: 3 };
/** Compound first, then red→green, then score desc. */
export function sortHealth(list: AccountHealth[]) {
  return [...list].sort((a, b) => Number(b.compound) - Number(a.compound) || ORDER[a.tier] - ORDER[b.tier] || b.score - a.score);
}
