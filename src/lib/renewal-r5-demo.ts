/* PS Dashboard Tab R5 §6 — DEMO additions only (used only while DEMO is on; never stored, no existing demo entry edited).
 * Six decided renewal cards for ต.ค. 69 (DEMO day = shared 28 ต.ค. 2569, Q4 69). Every recommendation, expected average and match is
 * produced by the v1.4 engine (feeAverageFrom · computeRenewalOffer · matchOffer · offerExpectedAvg) from the inputs below — no second formula. */
import { computeRenewalOffer, matchOffer, offerExpectedAvg, type BillingModel, type OfferMatch, type OfferTerms, type RenewalOffer, type RepricingFacts } from './renewalOffer';
import { feeAverageFrom, type FeeSource, type RecurringMonth } from './contract-fee-average';
import { DEFAULT_RENEWAL_CONFIG } from './renewal-rules';
import { editableUntil, type RenewalReason } from './renewal-reasons';
import type { RenewalItem } from './renewal-r2';
import type { Tier } from './contract-tab-r1';

/** Date the AE pressed ต่อสัญญา for these cards (snapshot date). */
export const R5_DEMO_SNAPSHOT_AT = '2026-09-01';
const T = (d: string) => `${d}T03:00:00.000Z`;
const A = 'AE001-ดาว', M = 'AE002-มายด์', N = 'AE003-ต้น';

const months = (from: string, to: string, f: (m: string) => RecurringMonth) => {
  const out: RecurringMonth[] = []; let y = +from.slice(0, 4), m = +from.slice(5, 7);
  while (`${y}-${String(m).padStart(2, '0')}` <= to) { out.push(f(`${y}-${String(m).padStart(2, '0')}`)); m++; if (m > 12) { m = 1; y++; } }
  return out;
};
const LAST = '2026-08';
const flat = (fee: number): RecurringMonth[] => months('2025-09', LAST, (month) => ({ month, billed: fee, commission: null, guarantee_applied: false, revenue_base: null }));
const fpc = (fixed: number, pct: number, comm: number): RecurringMonth[] => months('2025-09', LAST, (month) => ({ month, billed: fixed + comm, commission: comm, guarantee_applied: false, revenue_base: Math.round(comm / (pct / 100)) }));
const cg = (pct: number, g: number, comm: number): RecurringMonth[] => months('2025-09', LAST, (month) => ({ month, billed: Math.max(g, comm), commission: comm, guarantee_applied: comm < g, revenue_base: Math.round(comm / (pct / 100)) }));

type Spec = {
  id: string; en: string; th: string; svc: 'ORM' | 'Marcom'; ae: string; team: string; end: string; outcome: 'RENEWED' | 'NOT_RENEWED';
  model: BillingModel; fixed: number | null; pct: number | null; g: number | null; m: RecurringMonth[];
  rp: RepricingFacts; tier: Tier; signed?: string; link: string;
  /** offered = engine alternative of this model (package switch) or literal terms. */
  offered: OfferTerms | { alternative: BillingModel };
  reason?: [string, string, string, string];
};
const rp = (profile: string, cadence: boolean, band: [number, number] | null): RepricingFacts => ({ revenue_profile: profile, cadence, below_value: false, band_min_pct: band?.[0] ?? null, band_max_pct: band?.[1] ?? null, last_increase_at: '2024-09-01' });
const SPECS: Spec[] = [
  { id: 'CT-ORM-R5-UBON', en: 'Ubon Lotus', th: 'อุบล โลตัส', svc: 'ORM', ae: A, team: 'A', end: '2026-10-08', outcome: 'RENEWED', model: 'FLAT', fixed: 20000, pct: null, g: null, m: flat(20000),
    rp: rp('moderate', true, [8, 9]), tier: 'G', link: '2026-09-20', signed: '2026-09-28', offered: { billing_model: 'FLAT', fixed_fee: 21700, commission_pct: null, guarantee_fee: null } },
  { id: 'CT-ORM-R5-HATYAI', en: 'Hat Yai Central Inn', th: 'หาดใหญ่ เซ็นทรัล อินน์', svc: 'ORM', ae: N, team: 'C', end: '2026-10-14', outcome: 'RENEWED', model: 'FIXED_PLUS_COMMISSION', fixed: 6000, pct: 7, g: null, m: fpc(6000, 7, 3500),
    rp: rp('moderate', true, [3, 5]), tier: 'G', link: '2026-09-25', signed: '2026-10-05', offered: { billing_model: 'FIXED_PLUS_COMMISSION', fixed_fee: 6500, commission_pct: 7.5, guarantee_fee: null } },
  { id: 'CT-MAR-R5-LOEI', en: 'Loei Mist', th: 'เลย มิสต์', svc: 'Marcom', ae: M, team: 'แนน', end: '2026-10-18', outcome: 'RENEWED', model: 'FLAT', fixed: 13000, pct: null, g: null, m: flat(13000),
    rp: rp('stable', false, null), tier: 'G', link: '2026-09-30', signed: '2026-10-10', offered: { billing_model: 'FLAT', fixed_fee: 12000, commission_pct: null, guarantee_fee: null } },
  { id: 'CT-ORM-R5-UDON', en: 'Udon Park', th: 'อุดร พาร์ค', svc: 'ORM', ae: A, team: 'B', end: '2026-10-22', outcome: 'RENEWED', model: 'COMMISSION_GUARANTEE', fixed: null, pct: 13, g: 10000, m: cg(13, 10000, 16600),
    rp: rp('stable', false, null), tier: 'G', link: '2026-10-05', signed: '2026-10-15', offered: { alternative: 'FIXED_PLUS_COMMISSION' } },
  { id: 'CT-MAR-R5-SIAM', en: 'Siam Garden', th: 'สยาม การ์เดน', svc: 'Marcom', ae: N, team: 'บิว', end: '2026-10-11', outcome: 'NOT_RENEWED', model: 'FLAT', fixed: 15000, pct: null, g: null, m: flat(15000),
    rp: rp('moderate', true, [7, 9]), tier: 'G', link: '2026-09-22', offered: { billing_model: 'FLAT', fixed_fee: 16200, commission_pct: null, guarantee_fee: null },
    reason: ['PRICE_HIGH', 'PROMISE_BROKEN', 'POLICY_CHANGE', '2026-10-13'] },
  { id: 'CT-MAR-R5-KORAT', en: 'Korat Grand', th: 'โคราช แกรนด์', svc: 'Marcom', ae: M, team: 'แนน', end: '2026-10-20', outcome: 'NOT_RENEWED', model: 'FLAT', fixed: 22000, pct: null, g: null, m: flat(22000),
    rp: rp('stable', false, null), tier: 'R', link: '2026-10-01', offered: { billing_model: 'FLAT', fixed_fee: 21300, commission_pct: null, guarantee_fee: null },
    reason: ['RENOVATION', 'OWNERSHIP_CHANGE', 'FOLLOWUP_MISSING', '2026-10-22'] },
];

export type R5Decided = { contract_id: string; offer: RenewalOffer; old_model: BillingModel; offered: OfferTerms; offer_expected_avg: number | null; offer_match: OfferMatch | null };

function build(s: Spec): R5Decided {
  const src: FeeSource = { contract_id: s.id, model: s.model, fixed_fee: s.fixed, commission_pct: s.pct, guarantee_fee: s.g, start: '2025-09-01', months: s.m };
  const cfg = DEFAULT_RENEWAL_CONFIG;
  const fee = feeAverageFrom(src, R5_DEMO_SNAPSHOT_AT, cfg.fee_average_months);
  const offer = computeRenewalOffer({ service: s.svc, fee, repricing: s.rp, health: { tier: s.tier, red_by_own_overdue_only: false }, system_group1: [], overdue: { own: false, days: null }, cfg, computed_at: T(R5_DEMO_SNAPSHOT_AT) });
  const offered = 'alternative' in s.offered ? offer.alternatives.find((a) => a.model === (s.offered as { alternative: BillingModel }).alternative)!.terms : s.offered;
  return { contract_id: s.id, offer, old_model: s.model, offered, offer_expected_avg: offerExpectedAvg(fee, offered), offer_match: matchOffer(offer, offered, fee, cfg) };
}

let cache: R5Decided[] | null = null;
export const renewalR5DemoOffers = (): R5Decided[] => (cache ??= SPECS.map(build));
export const r5DemoOfferById = (id: string) => renewalR5DemoOffers().find((o) => o.contract_id === id) ?? null;

export function renewalR5DemoItems(): RenewalItem[] {
  return SPECS.map((s) => ({
    contract_id: s.id, hotel_id: `R5-${s.en}`, hotel_name: s.th, hotel_name_th: s.th, hotel_name_en: s.en, service: s.svc, ae: s.ae, team: s.team, end: s.end,
    stage: s.outcome === 'RENEWED' ? 'RENEWED' : 'LOST_OR_DECLINED', sub: null, outcome: s.outcome === 'RENEWED' ? null : 'NOT_RENEWED', effective: null,
    card_id: `RN-DEMO-${s.id}`, created_source: 'BOT', request_created_at: T(R5_DEMO_SNAPSHOT_AT), pending_since: null, link_sent_at: T(s.link), signed_at: s.signed ? T(s.signed) : null,
    last_activity: { at: T(s.signed ?? s.link), what: s.signed ? 'ลูกค้าเซ็นต่อสัญญา' : 'ลูกค้าแจ้งไม่ต่อสัญญา' }, legacy_reason: null,
  }));
}
export function renewalR5DemoReasons(): RenewalReason[] {
  return SPECS.filter((s) => s.reason).map((s, k) => {
    const [p1, p2, sec, at] = s.reason!; const created = T(at);
    return { id: `RR-REASON-R5-${k + 1}`, contract_id: s.id, service: s.svc, renewal_card_id: `RN-DEMO-${s.id}`, outcome: 'NOT_RENEWED', primary: [p1, p2], secondary: sec,
      created_by: { member_id: s.ae, display: s.ae, role: 'AE' }, created_at: created, editable_until: editableUntil(created) };
  });
}
