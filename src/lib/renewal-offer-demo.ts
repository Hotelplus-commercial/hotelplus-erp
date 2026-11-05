/* Contract Renewal v1.4 §9 — DEMO additions only (used only while DEMO is on; nothing here is ever stored).
 * DEMO date = the shared R3.3 DEMO day 28 ต.ค. 2569 (v1.4.1 RN43; timestamps shifted −5 days). Adds six renewal cards + contracts + billed months + signal inputs +
 * tier history + tickets, and billed months for the existing bundled demo contracts (flat fee each month) so their
 * recommendation can be computed. No existing demo entry is edited. Values follow render r5 (illustrative). */
import type { BillingModel } from './renewalOffer';
import type { RecurringMonth, FeeSource } from './contract-fee-average';
import type { BaseContract, SignalInputs, Tier, TierSnapshot } from './contract-tab-r1';
import { addDays, evaluateSignals, tierOf } from './contract-tab-r1';
import type { L0Status, L0Ticket } from './tickets-l0';
import type { RepriceInput } from './expansion';

import { DEMO_DAY } from './demo-session';

/** v1.4.1 RN43: alias of the one R3.3 DEMO clock (28 ต.ค. 2569). */
export const RENEWAL_OFFER_DEMO_NOW = DEMO_DAY;

export type V14Demo = {
  card_id: string; contract_id: string; hotel_id: string; hotel: string; service: 'ORM' | 'Marcom'; package: string;
  model: BillingModel; fixed_fee: number | null; commission_pct: number | null; guarantee_fee: number | null;
  start: string; end: string; contractEnd: string; daysLeft: number; term_months: number;
  profile: RepriceInput['revenue_profile']; underpriced: boolean; last_increase: string;
  inputs: SignalInputs; tier30: Tier | null; overdue_days: number | null; contact: string; legal: string; signatory: string;
  months: RecurringMonth[];
};

/* ---------- billed months ---------- */
const monthsBetween = (start: string, lastMonth: string) => { const out: string[] = []; let y = +start.slice(0, 4), m = +start.slice(5, 7); while (`${y}-${String(m).padStart(2, '0')}` <= lastMonth) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; };
const LAST = '2026-10'; // last billed month before 2 Nov 2026
const flatMonths = (start: string, fee: number, base: number | null = null) => monthsBetween(start, LAST).map((month): RecurringMonth => ({ month, billed: fee, commission: null, guarantee_applied: false, revenue_base: base }));
/** Fixed + commission: `recent` = the last 12 commissions (oldest first); older months repeat `older`. */
function fcMonths(start: string, fixed: number, pct: number, recent: number[], older: number): RecurringMonth[] {
  const all = monthsBetween(start, LAST); const k = all.length - recent.length;
  return all.map((month, i) => { const c = i < k ? older : recent[i - k]!; return { month, billed: fixed + c, commission: c, guarantee_applied: false, revenue_base: Math.round(c / (pct / 100)) }; });
}
/** Commission + guarantee: billed = max(guarantee, commission). */
const cgMonths = (start: string, pct: number, g: number, comms: number[]) => monthsBetween(start, LAST).map((month, i): RecurringMonth => { const c = comms[i]!; return { month, billed: Math.max(g, c), commission: c, guarantee_applied: c < g, revenue_base: Math.round(c / (pct / 100)) }; });

const down12 = Array.from({ length: 12 }, (_, i) => 26250 - i * 500); // avg 23,500 (Chiang Mai, declining)
// Hua Hin (22 months, Jan 2025 → Oct 2026): first 10 = 4 guarantee months + 6 × 9,000; last 12 = 3 × 5,600 (guarantee) + 8 × 10,500 + 10,800
const huaHin = [6000, 9000, 6000, 9000, 9000, 6000, 9000, 6000, 9000, 9000, 10500, 5600, 10500, 10500, 5600, 10500, 10800, 10500, 10500, 5600, 10500, 10500];

const sig = (x: SignalInputs) => x;
export const V14_DEMO: V14Demo[] = [
  { card_id: 'RN-V14-CM', contract_id: 'CT-HTL0411', hotel_id: 'HTL0411', hotel: 'Chiang Mai Riverside', service: 'ORM', package: 'ORM Full', model: 'FIXED_PLUS_COMMISSION', fixed_fee: 8500, commission_pct: 8, guarantee_fee: null,
    start: '2024-12-16', end: '2026-12-15', contractEnd: '15 Dec 2026', daysLeft: 43, term_months: 24, profile: 'declining', underpriced: false, last_increase: '2024-12-16',
    inputs: sig({ value_ratio: 4, rev_achievement_pct: 72, missed_meetings_3m: 1, grade: 'B', overdue_this: false, single_service: true }), tier30: 'A', overdue_days: null,
    contact: 'คุณสมชาย ริมน้ำ', legal: 'บริษัท เชียงใหม่ ริเวอร์ไซด์ จำกัด', signatory: 'คุณสมชาย ริมน้ำ', months: fcMonths('2024-12-16', 8500, 8, down12, 27000) },
  { card_id: 'RN-V14-BS', contract_id: 'CT-HTL0412', hotel_id: 'HTL0412', hotel: 'Baan Suan Resort', service: 'ORM', package: 'ORM Full', model: 'FLAT', fixed_fee: 25000, commission_pct: null, guarantee_fee: null,
    start: '2024-12-20', end: '2026-12-19', contractEnd: '19 Dec 2026', daysLeft: 47, term_months: 24, profile: 'stable', underpriced: true, last_increase: '2024-06-01',
    inputs: sig({ value_ratio: 5.2, rev_achievement_pct: 108, missed_meetings_3m: 0, grade: 'A', overdue_this: false, single_service: true }), tier30: 'G', overdue_days: null,
    contact: 'คุณวรรณา สวนสวย', legal: 'บริษัท บ้านสวน รีสอร์ท จำกัด', signatory: 'คุณวรรณา สวนสวย', months: flatMonths('2024-12-20', 25000, 380000) },
  { card_id: 'RN-V14-HH', contract_id: 'CT-HTL0413', hotel_id: 'HTL0413', hotel: 'Hua Hin Villa', service: 'ORM', package: 'ORM Full', model: 'COMMISSION_GUARANTEE', fixed_fee: null, commission_pct: 12, guarantee_fee: 8000,
    start: '2025-01-01', end: '2026-12-31', contractEnd: '31 Dec 2026', daysLeft: 59, term_months: 24, profile: 'stable', underpriced: true, last_increase: '2025-01-01',
    inputs: sig({ value_ratio: 5, guarantee_months: 1, missed_meetings_3m: 0, grade: 'A', overdue_this: false, single_service: false }), tier30: 'G', overdue_days: null,
    contact: 'คุณปิยะ หาดทราย', legal: 'บริษัท หัวหิน วิลล่า จำกัด', signatory: 'คุณปิยะ หาดทราย', months: cgMonths('2025-01-01', 12, 8000, huaHin) },
  { card_id: 'RN-V14-AJ', contract_id: 'CT-HTL0414', hotel_id: 'HTL0414', hotel: 'Anjali', service: 'Marcom', package: 'Marcom', model: 'FLAT', fixed_fee: 20000, commission_pct: null, guarantee_fee: null,
    start: '2024-12-29', end: '2026-12-28', contractEnd: '28 Dec 2026', daysLeft: 56, term_months: 24, profile: 'declining', underpriced: false, last_increase: '2024-12-29',
    inputs: sig({ survey2_value: 4, missed_meetings_3m: 1, grade: 'B', overdue_this: false, single_service: true }), tier30: 'A', overdue_days: null,
    contact: 'คุณอัญชลี ใจงาม', legal: 'บริษัท อัญชลี จำกัด', signatory: 'คุณอัญชลี ใจงาม', months: flatMonths('2024-12-29', 20000) },
  { card_id: 'RN-V14-MK', contract_id: 'CT-HTL0415', hotel_id: 'HTL0415', hotel: 'Makka Homestay', service: 'Marcom', package: 'Marcom', model: 'FLAT', fixed_fee: 12000, commission_pct: null, guarantee_fee: null,
    start: '2024-12-11', end: '2026-12-10', contractEnd: '10 Dec 2026', daysLeft: 38, term_months: 24, profile: 'moderate', underpriced: true, last_increase: '2024-06-01',
    inputs: sig({ overdue_this: true, grade: 'C', missed_meetings_3m: 0, single_service: true }), tier30: 'A', overdue_days: 45,
    contact: 'คุณมักกะ บ้านไม้', legal: 'บริษัท มักกะ โฮมสเตย์ จำกัด', signatory: 'คุณมักกะ บ้านไม้', months: flatMonths('2024-12-11', 12000) },
  { card_id: 'RN-V14-PB', contract_id: 'CT-HTL0416', hotel_id: 'HTL0416', hotel: 'Pattaya Bay Hotel', service: 'ORM', package: 'ORM Full', model: 'FIXED_PLUS_COMMISSION', fixed_fee: 10000, commission_pct: 6, guarantee_fee: null,
    start: '2024-12-25', end: '2026-12-24', contractEnd: '24 Dec 2026', daysLeft: 52, term_months: 24, profile: 'moderate', underpriced: true, last_increase: '2024-06-01',
    inputs: sig({ value_ratio: 5, rev_achievement_pct: 104, missed_meetings_3m: 0, grade: 'A', overdue_this: false, single_service: true }), tier30: 'G', overdue_days: null,
    contact: 'คุณพัทยา ทะเลงาม', legal: 'บริษัท พัทยา เบย์ โฮเทล จำกัด', signatory: 'คุณพัทยา ทะเลงาม', months: fcMonths('2024-12-25', 10000, 6, Array.from({ length: 12 }, () => 30000), 30000) },
];
export const v14DemoById = (contractId: string) => V14_DEMO.find((d) => d.contract_id === contractId) ?? null;

/** Existing bundled demo contracts (flat fee): one billed month per month from start to Oct 2026 (added, demo only). */
const EXISTING_FLAT: Record<string, { fee: number; start: string }> = {
  'CT-HTL0042': { fee: 30000, start: '2025-09-25' }, 'CT-HTL0055': { fee: 18000, start: '2025-10-11' }, 'CT-HTL0071': { fee: 22000, start: '2025-10-24' },
  'CT-HTL0089': { fee: 15000, start: '2025-10-01' }, 'CT-HTL0118': { fee: 25000, start: '2025-11-01' }, 'CT-HTL0124': { fee: 20000, start: '2025-11-06' },
  'CT-HTL0131': { fee: 16000, start: '2025-10-16' }, 'CT-HTL0137': { fee: 24000, start: '2025-10-21' },
};
/** DEMO fee source: v1.4 additions first, then the billed months added for the existing bundled demo contracts. */
export function v14DemoFeeSource(contractId: string): FeeSource | null {
  const d = v14DemoById(contractId);
  if (d) return { contract_id: d.contract_id, model: d.model, fixed_fee: d.fixed_fee, commission_pct: d.commission_pct, guarantee_fee: d.guarantee_fee, start: d.start, months: d.months };
  const e = EXISTING_FLAT[contractId];
  return e ? { contract_id: contractId, model: 'FLAT', fixed_fee: e.fee, commission_pct: null, guarantee_fee: null, start: e.start, months: flatMonths(e.start, e.fee) } : null;
}
/** v_ps_repricing inputs for the v1.4 demo contracts (rows built by the same repricingRow() engine). */
export const v14RepriceInputs = (): RepriceInput[] => V14_DEMO.map((d) => ({
  hotel_id: d.hotel_id, hotel_name: d.hotel, ae_owner_id: 'AE001-Nont', service_line: d.service, billing_model: d.model === 'COMMISSION_GUARANTEE' ? 'commission' : 'fixed',
  fee_fixed: d.fixed_fee, guarantee_fee: d.guarantee_fee, price_history: [{ effective_date: d.last_increase, note: 'ปรับราคาล่าสุด' }], revenue_profile: d.profile, underpriced: d.underpriced,
  health_tier: 'low', grade: 'A', survey: 4.5,
}));

/* ---------- health (system signals) · tier history · tickets ---------- */
export const v14DemoBase = (): BaseContract[] => V14_DEMO.map((d) => ({ contract_id: d.contract_id, hotel_id: d.hotel_id, hotel_name: d.hotel, hotel_name_en: d.hotel, hotel_name_th: null, service: d.service, ae: 'AE001-Nont', orm_team: d.service === 'ORM' ? 'A' : null, marcom: d.service === 'Marcom' ? 'แนน' : null, start: d.start, term_end: d.end, inputs: d.inputs }));
export function v14DemoSnapshots(): TierSnapshot[] {
  return V14_DEMO.flatMap((d) => {
    const { tier, bad } = tierOf(evaluateSignals(d.service, d.inputs).signals);
    return Array.from({ length: 31 }, (_, k) => k + 1).map((back): TierSnapshot => { const t = back >= 12 && d.tier30 ? d.tier30 : tier; return { contract_id: d.contract_id, date: addDays(RENEWAL_OFFER_DEMO_NOW, -back), tier: t, bad_count: t === tier ? bad : t === 'G' ? 0 : 1 }; });
  });
}
const tk = (id: string, d: V14Demo, dept: L0Ticket['target_dept'], display: string, labels: string[], status: L0Status, at: string): L0Ticket => ({
  ticket_id: id, type: 'CONTRACT_SIGNAL', source_app: 'PS_DASHBOARD', created_by: 'PM', target_dept: dept,
  subject_ref: { hotel_id: d.hotel_id, hotel_name: d.hotel, gap_service: d.service, service_line: d.service, contract_id: d.contract_id, service: d.service },
  payload: { readiness_tier: '', chips: [], note: '', kind: 'NEW', labels, batch_id: `B-${id}`, contract_id: d.contract_id },
  assignee: { member_id: dept, display, role: dept }, status, created_at: at, revision: status === 'NEW' ? 0 : 1,
  audit: [{ at, by: 'PM', from_status: null, to_status: 'NEW' }, ...(status === 'NEW' ? [] : [{ at, by: dept, from_status: 'NEW' as L0Status, to_status: status }])],
});
export function v14DemoTickets(): L0Ticket[] {
  const by = (id: string) => V14_DEMO.find((d) => d.card_id === id)!;
  return [
    tk('TKT-001401', by('RN-V14-CM'), 'ORM', 'ORM ทีม A', ['REV_MISS'], 'IN_PROGRESS', '2026-10-16T03:00:00.000Z'),
    tk('TKT-001402', by('RN-V14-CM'), 'ORM', 'ORM ทีม A', ['MEETING_IRREGULAR'], 'NEW', '2026-10-24T03:00:00.000Z'),
    tk('TKT-001403', by('RN-V14-BS'), 'ORM', 'ORM ทีม A', ['REPORT_WRONG'], 'NEW', '2026-10-25T03:00:00.000Z'),
    tk('TKT-001404', by('RN-V14-AJ'), 'MARCOM', 'Marcom · แนน', ['CAMPAIGN_MISS'], 'IN_PROGRESS', '2026-10-20T03:00:00.000Z'),
    tk('TKT-001405', by('RN-V14-MK'), 'AC', 'AC', ['OVERDUE'], 'NEW', '2026-10-23T03:00:00.000Z'),
  ];
}
