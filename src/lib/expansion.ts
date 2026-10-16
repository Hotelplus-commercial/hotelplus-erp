/* Expansion / Upsell v1.0 — one pure, read-only engine for v_ps_crosssell (Track 1) and v_ps_repricing (Track 2).
 * Never recomputes revenue/grade/tier/fee; never sets a price (reference band only); never touches commission %.
 * null constant = <TBD> → dependent signal is not computable (never a fabricated cutoff). */
import type { PsReportRow } from './ps-dashboard-types';

export const UPLIFT_FLOOR_MIN = 3, UPLIFT_FLOOR_MAX = 5;
export const UPLIFT_MID_MIN = 5, UPLIFT_MID_MAX = 12;
export const UPLIFT_CEILING_MIN = 12, UPLIFT_CEILING_MAX = 15;
export type ExpansionConsts = { CADENCE_MIN_YEARS: number | null; UPLIFT_SIGNAL_MULT: number | null; SERVICE1_STABLE_MONTHS: number | null; TENURE_MIN_MONTHS: number | null; RENEWAL_WINDOW_DAYS: number | null; READY_MIN: number | null; SURVEY_OK: number | null };
/** Live: all <TBD> (O-EX4) — business must confirm. */
export const EXPANSION_TBD: ExpansionConsts = { CADENCE_MIN_YEARS: null, UPLIFT_SIGNAL_MULT: null, SERVICE1_STABLE_MONTHS: null, TENURE_MIN_MONTHS: null, RENEWAL_WINDOW_DAYS: null, READY_MIN: null, SURVEY_OK: null };
/** Demo-only sample cutoffs for the bundled preview spine. */
export const EXPANSION_DEMO: ExpansionConsts = { CADENCE_MIN_YEARS: 2, UPLIFT_SIGNAL_MULT: 1.2, SERVICE1_STABLE_MONTHS: 6, TENURE_MIN_MONTHS: 12, RENEWAL_WINDOW_DAYS: 120, READY_MIN: 3, SURVEY_OK: 4 };
export const BASKET = ['ORM', 'Marcom'] as const;

export type RevenueProfile = 'declining' | 'strong' | 'moderate' | 'stable' | 'pending';
export type PriceHistory = { effective_date: string; note: string }[];
export const BAND: Record<'floor' | 'mid' | 'ceiling', [number, number]> = { floor: [UPLIFT_FLOOR_MIN, UPLIFT_FLOOR_MAX], mid: [UPLIFT_MID_MIN, UPLIFT_MID_MAX], ceiling: [UPLIFT_CEILING_MIN, UPLIFT_CEILING_MAX] };

const months = (from: string, now: Date) => { const d = new Date(from); return (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + now.getUTCMonth() - d.getUTCMonth(); };
const tbd = <T,>(c: number | null, f: (c: number) => T): T | null => (c == null ? null : f(c));

export type CrossInput = { hotel_id: string; hotel_name: string; ae_owner_id: string | null; owned: string[]; health_tier: string; grade: string | null; survey: number | null; onboard_complete: boolean; service_start: string | null; tenure_start: string | null; renewal_date: string | null; value_ratio: number | null; portfolio_median: number | null; value_strong: boolean };
export function crossSellRow(i: CrossInput, c: ExpansionConsts, now: Date): PsReportRow | null {
  const gap = BASKET.filter(s => !i.owned.includes(s));
  if (!gap.length || i.owned.length !== 1) return null; // fully attached / none → not in view
  const age = i.service_start ? months(i.service_start, now) : null;
  const stable = i.onboard_complete && age != null && c.SERVICE1_STABLE_MONTHS != null && age >= c.SERVICE1_STABLE_MONTHS;
  const reason = i.health_tier === 'high' ? 'Health 🔴 — อยู่ใน flow save/churn' : i.grade === 'D' ? 'Grade D' : c.SERVICE1_STABLE_MONTHS == null ? 'รอกำหนดเกณฑ์ (บริการแรกเสถียร)' : !stable ? 'บริการแรกยังไม่เสถียร' : null;
  const gate = reason == null;
  const proof = i.value_strong || (i.value_ratio != null && i.portfolio_median != null && i.value_ratio >= i.portfolio_median);
  const happy = tbd(c.SURVEY_OK, k => i.survey != null && i.survey >= k);
  const mature = tbd(c.TENURE_MIN_MONTHS, k => i.tenure_start != null && months(i.tenure_start, now) >= k);
  const timely = tbd(c.RENEWAL_WINDOW_DAYS, k => { if (!i.renewal_date) return false; const d = (new Date(i.renewal_date).getTime() - now.getTime()) / 864e5; return d >= 0 && d <= k; });
  const sigs = gate ? [proof, happy, mature, timely] : [];
  const score = sigs.filter(Boolean).length;
  const tier = !gate ? null : c.READY_MIN == null || sigs.some(s => s == null) ? null : score >= c.READY_MIN ? 'ready' : score >= 1 ? 'nurture' : 'notyet';
  return { hotel_id: i.hotel_id, hotel_name: i.hotel_name, ae_owner_id: i.ae_owner_id, service_line: i.owned[0]!, owned_service: i.owned[0]!, gap_service: gap.join('+'), health_tier: i.health_tier, grade: i.grade, survey_score: i.survey, gate_pass: gate, gate_fail_reason: reason, sig_value_proof: gate ? proof : null, sig_happy: gate ? happy : null, sig_mature: gate ? mature : null, sig_timely: gate ? timely : null, readiness_score: gate ? score : null, readiness_tier: tier, is_prime: gate && (i.grade === 'A' || i.grade === 'B') && i.value_ratio != null && i.portfolio_median != null && i.value_ratio >= i.portfolio_median, pending_sync: false };
}

export type RepriceInput = { hotel_id: string; hotel_name: string; ae_owner_id: string | null; service_line: string; billing_model: 'fixed' | 'commission'; fee_fixed: number | null; guarantee_fee: number | null; price_history: PriceHistory | null; revenue_profile: RevenueProfile; underpriced: boolean | null; health_tier: string; grade: string | null; survey: number | null };
export function repricingRow(i: RepriceInput, c: ExpansionConsts, now: Date): PsReportRow | null {
  const lever = i.billing_model === 'fixed' ? i.fee_fixed : i.guarantee_fee;
  if (!lever || lever <= 0) return null; // pure commission → skipped
  const last = i.price_history?.length ? [...i.price_history].sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0]!.effective_date : null;
  const since = last ? months(last, now) : null;
  const pending = last == null;
  const signal = i.revenue_profile === 'pending' && i.underpriced == null ? 'pending' : i.underpriced || i.revenue_profile === 'strong' ? 'yes' : 'no';
  const cadence = since != null && c.CADENCE_MIN_YEARS != null ? since >= c.CADENCE_MIN_YEARS * 12 : false;
  const trigger = signal === 'yes' && cadence ? 'both' : signal === 'yes' ? 'signal' : cadence ? 'cadence' : 'none';
  const bucket = i.revenue_profile === 'declining' ? null : i.revenue_profile === 'strong' ? 'floor' : i.revenue_profile === 'moderate' ? 'mid' : i.revenue_profile === 'stable' ? 'ceiling' : 'manual';
  const reason = i.health_tier === 'high' ? 'Health 🔴' : !(i.grade === 'A' || i.grade === 'B') ? `Grade ${i.grade ?? '—'}` : c.SURVEY_OK == null ? 'รอกำหนดเกณฑ์ (Survey)' : i.survey == null || i.survey < c.SURVEY_OK ? 'Survey #2 ต่ำ/ไม่มี' : i.revenue_profile === 'declining' ? 'รายได้ขาลง' : null;
  const band = bucket && bucket !== 'manual' ? BAND[bucket] : null;
  const why = [i.underpriced ? 'ราคาต่ำกว่ามูลค่า' : null, i.revenue_profile === 'strong' ? 'รายได้โต' : null, cadence && since != null ? `ครบ ${Math.floor(since / 12)} ปี` : null].filter((x): x is string => !!x);
  return { hotel_id: i.hotel_id, hotel_name: i.hotel_name, ae_owner_id: i.ae_owner_id, service_line: i.service_line, billing_model: i.billing_model, lever_field: i.billing_model === 'fixed' ? 'fee_fixed' : 'guarantee_fee', lever_amount: lever, last_increase_at: last, months_since_increase: since, signal_path: signal, cadence_path: cadence, trigger, trigger_pending: pending, revenue_profile: i.revenue_profile, gate_pass: reason == null, gate_fail_reason: reason, band_bucket: bucket, band_min_pct: band?.[0] ?? null, band_max_pct: band?.[1] ?? null, suggested_min_thb: band ? Math.round(lever * (1 + band[0] / 100)) : null, suggested_max_thb: band ? Math.round(lever * (1 + band[1] / 100)) : null, why_chips: why.join('|'), pending_sync: false };
}

/** List rules (UI): gate-failed rows never appear. */
export const crossSellList = (rows: PsReportRow[]) => rows.filter(r => r.gate_pass === true).sort((a, b) => RANK(a) - RANK(b) || Number(b.is_prime) - Number(a.is_prime));
const RANK = (r: PsReportRow) => ({ ready: 0, nurture: 1, notyet: 2 } as Record<string, number>)[String(r.readiness_tier)] ?? 3;
export const repricingList = (rows: PsReportRow[]) => rows.filter(r => r.gate_pass === true && (r.trigger !== 'none' || r.trigger_pending === true));
export const READY_TH: Record<string, string> = { ready: '🟢 พร้อมขาย', nurture: '🟡 กำลังบ่ม', notyet: '⚪ ยังไม่พร้อม' };
export const SIG_TH = { sig_value_proof: 'มูลค่าพิสูจน์แล้ว', sig_happy: 'ลูกค้าพอใจ', sig_mature: 'อยู่มานาน', sig_timely: 'ใกล้รอบต่อสัญญา' } as const;
export const TRIGGER_TH: Record<string, string> = { signal: 'สัญญาณคุ้ม', cadence: 'ครบรอบ', both: 'ครบรอบ + สัญญาณ' };
export const bandLabel = (r: PsReportRow) => r.band_min_pct == null ? 'ประเมินด้วยมือ (ไม่มีข้อมูลรายได้)' : `แนะนำ +${r.band_min_pct}–${r.band_max_pct}%`;
