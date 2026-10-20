/* Account Health + 360 v1.0 — pure, read-only selector. Score = COUNT(flagged dims); never weighted.
 * Reads already-computed source values (grade, revenue, tier); never recomputes them. */
import type { PsReportRow } from './ps-dashboard-types';
import { isRecurringService } from './ps-dashboard-types';

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

/** R1.2 §3.3: Property Information Form ไม่ครบ and ใกล้ต่อสัญญา are pending work, not risk — see pendingWorkOf(). */
export type DimCode = 'GRADE_CD' | 'SURVEY_LOW' | 'CHURN_PARTIAL' | 'ROI_REV_DECLINE' | 'ROI_REV_FLAT' | 'ROI_VALUE_LOW' | 'TIER_A_PERSIST' | 'FLAG_OPEN' | 'MARCOM_ADS' | 'MARCOM_PERF';
export const DIM_TH: Record<DimCode, string> = {
  GRADE_CD: 'Grade C/D', SURVEY_LOW: 'Survey ต่ำ', CHURN_PARTIAL: 'churn บางบริการ',
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
  const mean = last.reduce<number>((s, v) => s + (v ?? 0), 0) / last.length;
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
  const since = new Date(ctx.now); since.setUTCMonth(since.getUTCMonth() - CHURN_PARTIAL_WINDOW_MONTHS);
  const lost = ctx.flow.filter(isRecurringService).filter(f => f.hotel_id === id && f.inactivated_at && new Date(String(f.inactivated_at)) >= since && new Date(String(f.inactivated_at)) <= ctx.now);
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

/** R1.2 §3.2 — plain-Thai risk rules, generated from the same constants the scorecard uses (no drifting copy). */
export function riskRuleText(ratioMin: number | null) {
  const dims: { code: DimCode; label: string; trigger: string }[] = [
    { code: 'GRADE_CD', label: DIM_TH.GRADE_CD, trigger: 'เกรดการชำระล่าสุด หรือเกรดแย่สุด เป็น C หรือ D' },
    { code: 'SURVEY_LOW', label: DIM_TH.SURVEY_LOW, trigger: SURVEY_LOW_MAX == null ? 'ยังไม่ตั้งเกณฑ์ จึงยังไม่นับ' : `คะแนน Survey ครั้งที่ 2 ต่ำกว่า ${SURVEY_LOW_MAX}` },
    { code: 'CHURN_PARTIAL', label: DIM_TH.CHURN_PARTIAL, trigger: `มีบริการบางตัวสิ้นสุดใน ${CHURN_PARTIAL_WINDOW_MONTHS} เดือนที่ผ่านมา แต่ยังใช้บริการอื่นอยู่` },
    { code: 'ROI_REV_DECLINE', label: DIM_TH.ROI_REV_DECLINE, trigger: `ORM แบบค่าคอม: รายได้โรงแรมลดลงติดกัน ${ROI_DECLINE_MONTHS} เดือน และอยู่ Tier A ตลอด หรือต่ำกว่าค่ากลางของโรงแรมอื่นในเดือนเดียวกัน (เมื่อมีอย่างน้อย ${PORTFOLIO_MIN_N} โรงแรม)` },
    { code: 'ROI_REV_FLAT', label: DIM_TH.ROI_REV_FLAT, trigger: `ORM แบบค่าคอม: รายได้แกว่งไม่เกิน ±${ROI_FLAT_BAND_PCT}% ตลอด ${ROI_FLAT_MONTHS} เดือน` },
    { code: 'ROI_VALUE_LOW', label: DIM_TH.ROI_VALUE_LOW, trigger: ratioMin == null ? 'ยังไม่ตั้งเกณฑ์ value ratio จึงยังไม่นับ' : `ORM แบบค่าคอม: value ratio 3 เดือนล่าสุดต่ำกว่า ${ratioMin}×` },
    { code: 'TIER_A_PERSIST', label: DIM_TH.TIER_A_PERSIST, trigger: `ORM แบบค่าคอม: อยู่ Tier A ติดกันอย่างน้อย ${TIER_A_PERSIST_MONTHS} เดือน` },
  ];
  return {
    dims,
    score: 'คะแนน (Score) = จำนวนด้านที่มีสัญญาณเสี่ยง · ทุกด้านนับเท่ากัน ไม่ถ่วงน้ำหนัก',
    tiers: [
      { tier: 'high' as const, text: 'แดง = เกรด D หรือมีสัญญาณเสี่ยงตั้งแต่ 2 ด้านขึ้นไป' },
      { tier: 'watch' as const, text: 'เหลือง = มีสัญญาณเสี่ยง 1 ด้าน' },
      { tier: 'healthy' as const, text: 'เขียว = ไม่มีสัญญาณเสี่ยงตามเกณฑ์' },
    ],
    notes: [
      'ด้านที่ข้อมูลยังไม่เข้า หรือยังไม่ตั้งเกณฑ์ จะไม่นับ (ไม่ได้แปลว่าผ่าน)',
      'งานค้าง (Property Information Form ยังไม่ครบ · ใกล้ถึงวันต่อสัญญา) ไม่นับเป็นความเสี่ยง — ดูการ์ด งานค้างของสัญญา',
    ],
  };
}

export type PendingItem = { key: string; hotel_id: string; hotel_name: string; service_line: string; ae_owner_id: string | null; date: string | null };
/** R1.2 §3.3 — pending work per service contract (not risk). Renewal = ACTIVE contract ending ≤ RENEWAL_DAYS with no renewal started. */
export function pendingWorkOf(input: { health: PsReportRow[]; lifetime: PsReportRow[]; renewals: PsReportRow[]; flow: PsReportRow[]; now: Date }) {
  const startOf = (hotel: unknown, line: unknown) => input.flow.find(f => f.hotel_id === hotel && f.service_line === line && isRecurringService(f))?.start_date ?? null;
  const pi: PendingItem[] = input.health
    .filter(r => r.completeness != null && r.completeness !== 'complete')
    .map(r => ({ key: `${r.hotel_id}|${r.service_line}`, hotel_id: String(r.hotel_id ?? ''), hotel_name: String(r.hotel_name ?? r.hotel_id ?? ''), service_line: String(r.service_line ?? ''), ae_owner_id: r.ae_owner_id == null ? null : String(r.ae_owner_id), date: startOf(r.hotel_id, r.service_line) == null ? null : String(startOf(r.hotel_id, r.service_line)) }));
  const started = new Set(input.renewals.filter(r => ['IN_PROGRESS', 'RENEWED'].includes(String(r.outcome)) && r.renewal_due_date && (new Date(String(r.renewal_due_date)).getTime() >= input.now.getTime() - 120 * 864e5)).map(r => String(r.contract_id)));
  const renew: PendingItem[] = input.lifetime
    .filter(r => r.status === 'ACTIVE' && r.end_date && !started.has(String(r.contract_id)))
    .filter(r => { const d = (new Date(String(r.end_date)).getTime() - input.now.getTime()) / 864e5; return d >= 0 && d <= RENEWAL_DAYS; })
    .map(r => ({ key: String(r.contract_id), hotel_id: String(r.hotel_id ?? ''), hotel_name: String(r.hotel_name ?? r.hotel_id ?? ''), service_line: String(r.service_line ?? ''), ae_owner_id: r.ae_owner_id == null ? null : String(r.ae_owner_id), date: String(r.end_date).slice(0, 10) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { pi: pi.sort((a, b) => a.hotel_name.localeCompare(b.hotel_name)), renew };
}
