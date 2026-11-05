/* Debt Partner R1 §11 — DEMO bundle (in memory only, DEMO day 28 Oct 2026 = DEMO_DAY in demo-session.ts).
 * Date shifts vs §11 (written for 2 Nov 26), applied only to these new entries:
 * - Hotelier.guru −30%: start 1 Nov 26 → 1 Oct 26 (so it is "สำเร็จ · มีผลอยู่" on 28 Oct and ③ net matches).
 * - Hotelier.guru −20% (expired): end 31 Oct 26 → 30 Sep 26 (so it is "หมดอายุ" on 28 Oct).
 * PM Workspace Partner v1.0 §7 (written for 2 Nov 26) on DEMO day 28 Oct 26:
 * - Nan Valley REQUESTED 24 Oct → 19 Oct (9 days waiting on 28 Oct → to-do item B).
 * - StayLink PERK อบรมทีม: end date 25 Nov 26 set on the existing perk row (not a new row, so ④ chips stay 4 / 1 / 2 / 7) → item C.
 * - OTA Hub 15% NEGOTIATING last updated 10 Oct 26 → item D (18 days).
 * - Krabi Cliff approved_amount ฿3,400. Chaba Grand closed ไม่ต่อ on 21 Oct (R1 date kept) → item A.
 * - property_partner_system rows for the 48 / 20 / 16 hotels (allotment = the contract's) + Doi Mist Resort (no system)
 *   + Mae Ping Riverside (OTA Hub → StayLink from 1 Dec 26, future row). */
import type { L0Status } from './tickets-l0';
import type { PartnerData, PartnerDeal } from './debt-partner-types';
import type { PartnerContract } from './debt-partner-calc';

const P = { HG: 'PTN-HG', SL: 'PTN-SL', OH: 'PTN-OH' } as const;
const at = '2026-01-05T09:00:00.000Z';
const pad = (n: number) => String(n).padStart(2, '0');

/** Contracts behind the Partner cards (DEMO). Chaba Grand id = its renewal card contract (Tab R2 demo). */
export const PARTNER_DEMO_CONTRACTS: PartnerContract[] = (() => {
  const out: PartnerContract[] = [];
  out.push({ contract_id: 'CT-ORM-Q-ORM-0410', hotel: 'Chaba Grand', service: 'ORM', allotment: 50, start: '2025-12-01', end: '2026-11-30', end_reason: 'NOT_RENEWED', outcome_at: '2026-10-21' });
  for (let i = 1; i < 48; i++) {
    const start = i <= 7 ? `2026-${pad(5 + Math.ceil(i / 2))}-${pad(1 + i)}` : `2025-${pad(1 + (i % 12))}-01`; // 7 start inside the cashback period (from 1 Jun 26)
    out.push({ contract_id: `DP-HG-${pad(i)}`, hotel: `Hotelier Demo ${pad(i)}`, service: 'ORM', allotment: 31 + (i % 50), start, end: null, end_reason: null });
  }
  for (let i = 1; i <= 20; i++) out.push({ contract_id: `DP-SL-${pad(i)}`, hotel: `StayLink Demo ${pad(i)}`, service: 'ORM', allotment: 20 + i, start: '2025-08-01', end: null, end_reason: null });
  for (let i = 1; i <= 16; i++) out.push({ contract_id: `DP-OH-${pad(i)}`, hotel: `OTA Hub Demo ${pad(i)}`, service: 'ORM', allotment: 40, start: '2025-09-01', end: null, end_reason: null });
  out.push({ contract_id: 'DP-NAN', hotel: 'Nan Valley Lodge', service: 'ORM', allotment: 40, start: '2025-10-27', end: '2026-10-26', end_reason: 'NOT_RENEWED' });
  out.push({ contract_id: 'DP-KRABI', hotel: 'Krabi Cliff', service: 'ORM', allotment: 40, start: '2025-10-15', end: '2026-10-14', end_reason: 'NOT_RENEWED' });
  out.push({ contract_id: 'DP-LANNA', hotel: 'Lanna View', service: 'ORM', allotment: 40, start: '2025-08-06', end: '2026-08-05', end_reason: 'EARLY_TERMINATED' });
  out.push({ contract_id: 'DP-SEEFAH', hotel: 'Seefah', service: 'ORM', allotment: 40, start: '2025-03-01', end: '2026-02-28', end_reason: 'NOT_RENEWED' });
  out.push({ contract_id: 'DP-BTALAY', hotel: 'Baan Talay', service: 'ORM', allotment: 40, start: '2025-05-01', end: '2026-04-30', end_reason: 'NOT_RENEWED' });
  for (const c of out) c.property_id = `HP-${c.contract_id}`;
  return out;
})();
/** §7: ORM hotels shown on the Rate Card tab (system per hotel); two extra hotels have no contract in the cards. */
export const PARTNER_DEMO_EXTRA_HOTELS = [
  { property_id: 'HP-DOIMIST', hotel: 'Doi Mist Resort' },
  { property_id: 'HP-MAEPING', hotel: 'Mae Ping Riverside' },
];

/** DEMO status of the AC notice tickets referenced by demo deals / credit requests (no real tickets are written). */
export const PARTNER_DEMO_TICKET_STATUS: Record<string, L0Status> = {
  'TKT-DP-01': 'NEW', 'TKT-DP-02': 'ACK', 'TKT-DP-03': 'ACK', 'TKT-DP-04': 'ACK', 'TKT-DP-CR-KRABI': 'ACK', 'TKT-DP-CR-NAN': 'NEW',
};

const deal = (d: Partial<PartnerDeal> & Pick<PartnerDeal, 'id' | 'partner_id' | 'kind' | 'status' | 'title' | 'benefit_type'>): PartnerDeal => ({
  start_date: null, end_date: null, benefit_value: null, benefit_currency: null, scope: 'ALL', contract_ids: [], note: '', attachment_url: '',
  ac_ticket_id: null, created_by: 'PM001-Alex', created_at: at, updated_at: at, ...d,
});

export function partnerDemoData(): PartnerData {
  const hg = PARTNER_DEMO_CONTRACTS.filter((c) => c.contract_id === 'CT-ORM-Q-ORM-0410' || c.contract_id.startsWith('DP-HG-'));
  const sl = PARTNER_DEMO_CONTRACTS.filter((c) => c.contract_id.startsWith('DP-SL-'));
  const oh = PARTNER_DEMO_CONTRACTS.filter((c) => c.contract_id.startsWith('DP-OH-'));
  const cps = (cs: PartnerContract[], partner_id: string, system_name: string) => cs.map((c) => ({ contract_id: c.contract_id, partner_id, system_name, set_by: 'PM001-Alex', set_at: at }));
  return {
    partners: [
      { id: P.HG, name: 'Hotelier.guru', created_at: at }, { id: P.SL, name: 'StayLink', created_at: at }, { id: P.OH, name: 'OTA Hub', created_at: at },
    ],
    partner_rate_cards: [
      { id: 'RC-HG-1', partner_id: P.HG, system_name: 'RMS Pro', currency: 'THB', billing_cycle: 'ADVANCE_3M', est_fx_to_thb: null, effective_from: '2026-01-01', superseded_at: '2026-07-01', created_by: 'PM001-Alex', created_at: at },
      { id: 'RC-HG-2', partner_id: P.HG, system_name: 'RMS Pro', currency: 'THB', billing_cycle: 'ADVANCE_3M', est_fx_to_thb: null, effective_from: '2026-07-01', superseded_at: null, created_by: 'PM001-Alex', created_at: '2026-06-20T09:00:00.000Z' },
      { id: 'RC-SL-1', partner_id: P.SL, system_name: 'Channel Manager', currency: 'THB', billing_cycle: 'MONTHLY', est_fx_to_thb: null, effective_from: '2025-06-01', superseded_at: null, created_by: 'PM001-Alex', created_at: at },
      { id: 'RC-OH-1', partner_id: P.OH, system_name: 'Rate Shopper', currency: 'USD', billing_cycle: 'MONTHLY', est_fx_to_thb: 35, effective_from: '2025-06-01', superseded_at: null, created_by: 'PM001-Alex', created_at: at },
    ],
    partner_rate_card_tiers: [
      { id: 'T-HG1-1', rate_card_id: 'RC-HG-1', allotment_min: 1, allotment_max: 30, price_per_contract_month: 1200 },
      { id: 'T-HG1-2', rate_card_id: 'RC-HG-1', allotment_min: 31, allotment_max: 80, price_per_contract_month: 1600 },
      { id: 'T-HG1-3', rate_card_id: 'RC-HG-1', allotment_min: 81, allotment_max: null, price_per_contract_month: 2400 },
      { id: 'T-HG2-1', rate_card_id: 'RC-HG-2', allotment_min: 1, allotment_max: 30, price_per_contract_month: 1200 },
      { id: 'T-HG2-2', rate_card_id: 'RC-HG-2', allotment_min: 31, allotment_max: 80, price_per_contract_month: 1700 },
      { id: 'T-HG2-3', rate_card_id: 'RC-HG-2', allotment_min: 81, allotment_max: null, price_per_contract_month: 2400 },
      { id: 'T-SL-1', rate_card_id: 'RC-SL-1', allotment_min: 1, allotment_max: null, price_per_contract_month: 900 },
      { id: 'T-OH-1', rate_card_id: 'RC-OH-1', allotment_min: 1, allotment_max: null, price_per_contract_month: 40 },
    ],
    contract_partner_system: [...cps(hg, P.HG, 'RMS Pro'), ...cps(sl, P.SL, 'Channel Manager'), ...cps(oh, P.OH, 'Rate Shopper')],
    partner_deals: [
      deal({ id: 'DEAL-01', partner_id: P.HG, kind: 'COST_DISCOUNT', status: 'SUCCESS', title: 'ลดค่าระบบ RMS Pro 30%', start_date: '2026-10-01', benefit_type: 'PERCENT', benefit_value: 30, ac_ticket_id: 'TKT-DP-01' }),
      deal({ id: 'DEAL-02', partner_id: P.HG, kind: 'PERK', status: 'SUCCESS', title: 'Official Partner + Referral cashback 100 USD / สัญญาใหม่', start_date: '2026-06-01', benefit_type: 'CASHBACK_PER_CONTRACT', benefit_value: 100, benefit_currency: 'USD', ac_ticket_id: 'TKT-DP-02' }),
      deal({ id: 'DEAL-03', partner_id: P.SL, kind: 'COST_DISCOUNT', status: 'SUCCESS', title: 'ลดค่าระบบ ฿100 / สัญญา', start_date: '2026-07-01', end_date: '2027-06-30', benefit_type: 'AMOUNT_PER_CONTRACT', benefit_value: 100, benefit_currency: 'THB', ac_ticket_id: 'TKT-DP-03' }),
      deal({ id: 'DEAL-04', partner_id: P.SL, kind: 'PERK', status: 'SUCCESS', title: 'อบรมทีม ORM ฟรี', start_date: '2026-01-01', end_date: '2026-11-25', benefit_type: 'OTHER', note: 'อบรมทีม ORM ฟรี 2 รอบ / ปี', ac_ticket_id: 'TKT-DP-04' }),
      deal({ id: 'DEAL-05', partner_id: P.OH, kind: 'COST_DISCOUNT', status: 'NEGOTIATING', title: 'ขอส่วนลด Rate Shopper 15%', benefit_type: 'PERCENT', benefit_value: 15, updated_at: '2026-10-10T09:00:00.000Z' }),
      deal({ id: 'DEAL-06', partner_id: P.HG, kind: 'COST_DISCOUNT', status: 'SUCCESS', title: 'ลดค่าระบบ RMS Pro 20%', start_date: '2026-01-01', end_date: '2026-09-30', benefit_type: 'PERCENT', benefit_value: 20 }),
      deal({ id: 'DEAL-07', partner_id: P.OH, kind: 'COST_DISCOUNT', status: 'FAILED', title: 'ขอส่วนลด Rate Shopper 10%', benefit_type: 'PERCENT', benefit_value: 10, note: 'Partner ปฏิเสธ (Apr 26)', created_at: '2026-04-10T09:00:00.000Z', updated_at: '2026-04-28T09:00:00.000Z' }),
    ],
    partner_cashback_receipts: hg.filter((c) => c.start && c.start >= '2026-06-01').slice(0, 4).map((c, i) => ({ id: `CB-${i + 1}`, deal_id: 'DEAL-02', contract_id: c.contract_id, received_at: `2026-${pad(7 + i)}-15`, recorded_by: 'AC001' })),
    partner_bill_lines: [
      { id: 'BL-CHABA-1', partner_id: P.HG, contract_id: 'CT-ORM-Q-ORM-0410', period_start: '2026-08-01', period_end: '2026-10-31', amount: 4080, currency: 'THB', paid_at: '2026-08-03', recorded_by: 'AC001' },
      { id: 'BL-CHABA-2', partner_id: P.HG, contract_id: 'CT-ORM-Q-ORM-0410', period_start: '2026-11-01', period_end: '2027-01-31', amount: 3570, currency: 'THB', paid_at: '2026-10-05', recorded_by: 'AC001' },
    ],
    system_credit_requests: [
      { id: 'CR-NAN', contract_id: 'DP-NAN', partner_id: P.HG, contract_end_date: '2026-10-26', prepaid_until: '2026-12-31', months_over: 2, amount: 2380, currency: 'THB', status: 'REQUESTED', requested_at: '2026-10-19', decided_at: null, credit_expires_at: null, ac_ticket_id: 'TKT-DP-CR-NAN', created_by: 'PM001-Alex' },
      { id: 'CR-KRABI', contract_id: 'DP-KRABI', partner_id: P.HG, contract_end_date: '2026-10-14', prepaid_until: '2026-12-31', months_over: 2, amount: 3400, currency: 'THB', status: 'APPROVED', requested_at: '2026-10-15', decided_at: '2026-10-20', credit_expires_at: '2027-12-31', ac_ticket_id: 'TKT-DP-CR-KRABI', created_by: 'PM001-Alex', approved_amount: 3400 },
      { id: 'CR-LANNA', contract_id: 'DP-LANNA', partner_id: P.HG, contract_end_date: '2026-08-05', prepaid_until: '2026-09-30', months_over: 1, amount: 1700, currency: 'THB', status: 'REJECTED', requested_at: '2026-08-06', decided_at: '2026-08-20', credit_expires_at: null, ac_ticket_id: null, created_by: 'PM001-Alex' },
      { id: 'CR-SEEFAH', contract_id: 'DP-SEEFAH', partner_id: P.HG, contract_end_date: '2026-02-28', prepaid_until: '2026-05-31', months_over: 3, amount: 3740, currency: 'THB', status: 'APPROVED', requested_at: '2026-03-02', decided_at: '2026-03-10', credit_expires_at: '2027-03-31', ac_ticket_id: null, created_by: 'PM001-Alex' },
      { id: 'CR-BTALAY', contract_id: 'DP-BTALAY', partner_id: P.HG, contract_end_date: '2026-04-30', prepaid_until: '2026-06-30', months_over: 2, amount: 3400, currency: 'THB', status: 'APPROVED', requested_at: '2026-05-02', decided_at: '2026-05-12', credit_expires_at: '2027-06-30', ac_ticket_id: null, created_by: 'PM001-Alex' },
    ],
    property_partner_system: [
      ...[...hg.map((c) => [c, P.HG, 'RMS Pro'] as const), ...sl.map((c) => [c, P.SL, 'Channel Manager'] as const), ...oh.map((c) => [c, P.OH, 'Rate Shopper'] as const)]
        .map(([c, partner_id, system_name]) => ({ id: `PPS-${c.contract_id}`, property_id: c.property_id!, partner_id, system_name, effective_from: c.start ?? '2025-01-01', allotment: c.allotment, set_by: 'PM001-Alex', set_at: at, note: null })),
      { id: 'PPS-MAEPING-1', property_id: 'HP-MAEPING', partner_id: P.OH, system_name: 'Rate Shopper', effective_from: '2025-09-01', allotment: 35, set_by: 'PM001-Alex', set_at: at, note: null },
      { id: 'PPS-MAEPING-2', property_id: 'HP-MAEPING', partner_id: P.SL, system_name: 'Channel Manager', effective_from: '2026-12-01', allotment: 35, set_by: 'PM001-Alex', set_at: '2026-10-20T09:00:00.000Z', note: 'ย้ายไป StayLink ตามสัญญาใหม่' },
    ],
    system_credit_usage: [{ id: 'CU-1', credit_request_id: 'CR-SEEFAH', partner_bill_ref: 'Oct 26', amount: 3400, used_at: '2026-10-10', recorded_by: 'AC001' }],
  };
}
