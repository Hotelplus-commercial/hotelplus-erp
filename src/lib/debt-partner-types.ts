/* Tab ลูกหนี้ & ส่วนลด Partner R1 §2 — the 9 Partner collections, exact names / fields / enums / nullability.
 * Prototype: browser storage + one-way Cloud mirror (src/lib/debt-partner-store.ts).
 * Portal: the dev team turns each type below into one database table with role-based RLS (needs login). */

export type Currency = 'THB' | 'USD' | (string & {});
export type BillingCycle = 'MONTHLY' | 'ADVANCE_3M' | 'ADVANCE_6M' | 'ANNUAL';
export type DealKind = 'COST_DISCOUNT' | 'PERK';
export type DealStatus = 'NEGOTIATING' | 'SUCCESS' | 'FAILED';
export type BenefitType = 'PERCENT' | 'AMOUNT_PER_CONTRACT' | 'CASHBACK_PER_CONTRACT' | 'OTHER';
export type DealScope = 'ALL' | 'SELECTED';
export type CreditRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

/** partners — PM manages; unique name. */
export type Partner = { id: string; name: string; created_at: string };

/** partner_rate_cards — price change = new row; previous row gets superseded_at. Current = superseded_at null. */
export type PartnerRateCard = {
  id: string; partner_id: string; system_name: string; currency: Currency; billing_cycle: BillingCycle;
  est_fx_to_thb: number | null; effective_from: string; superseded_at: string | null; created_by: string; created_at: string;
};

/** partner_rate_card_tiers — step pricing by contract allotment; allotment_max null = and above. */
export type PartnerRateCardTier = {
  id: string; rate_card_id: string; allotment_min: number; allotment_max: number | null; price_per_contract_month: number;
};

/** contract_partner_system — one system per ORM contract (contract_id unique). Written by PM Workspace later. */
export type ContractPartnerSystem = { contract_id: string; partner_id: string; system_name: string; set_by: string; set_at: string };

/** partner_deals */
export type PartnerDeal = {
  id: string; partner_id: string; kind: DealKind; status: DealStatus; title: string;
  start_date: string | null; end_date: string | null;
  benefit_type: BenefitType; benefit_value: number | null; benefit_currency: Currency | null;
  scope: DealScope; contract_ids: string[]; note: string; attachment_url: string;
  ac_ticket_id: string | null; created_by: string; created_at: string; updated_at: string;
};

/** partner_cashback_receipts — AC-owned (AC App UI later). */
export type PartnerCashbackReceipt = { id: string; deal_id: string; contract_id: string; received_at: string; recorded_by: string };

/** partner_bill_lines — AC-owned. "จ่ายล่วงหน้าถึง" = max period_end where paid_at not null. */
export type PartnerBillLine = {
  id: string; partner_id: string; contract_id: string; period_start: string; period_end: string;
  amount: number; currency: Currency; paid_at: string | null; recorded_by: string;
};

/** system_credit_requests — created by PM Workspace later. "รอ PM ส่งคำขอ" is derived, never stored. */
export type SystemCreditRequest = {
  id: string; contract_id: string; partner_id: string; contract_end_date: string; prepaid_until: string;
  months_over: number; amount: number; currency: Currency; status: CreditRequestStatus;
  requested_at: string; decided_at: string | null; credit_expires_at: string | null; ac_ticket_id: string | null; created_by: string;
};

/** system_credit_usage — AC-owned. */
export type SystemCreditUsage = { id: string; credit_request_id: string; partner_bill_ref: string; amount: number; used_at: string; recorded_by: string };

export type PartnerData = {
  partners: Partner[];
  partner_rate_cards: PartnerRateCard[];
  partner_rate_card_tiers: PartnerRateCardTier[];
  contract_partner_system: ContractPartnerSystem[];
  partner_deals: PartnerDeal[];
  partner_cashback_receipts: PartnerCashbackReceipt[];
  partner_bill_lines: PartnerBillLine[];
  system_credit_requests: SystemCreditRequest[];
  system_credit_usage: SystemCreditUsage[];
};
export type PartnerCollection = keyof PartnerData;
export const PARTNER_COLLECTIONS = [
  'partners', 'partner_rate_cards', 'partner_rate_card_tiers', 'contract_partner_system', 'partner_deals',
  'partner_cashback_receipts', 'partner_bill_lines', 'system_credit_requests', 'system_credit_usage',
] as const satisfies readonly PartnerCollection[];
/** AC-owned: read only in this pass (write UI comes with the AC App prompt). */
export const AC_OWNED: readonly PartnerCollection[] = ['partner_cashback_receipts', 'partner_bill_lines', 'system_credit_usage'];
export const emptyPartnerData = (): PartnerData => Object.fromEntries(PARTNER_COLLECTIONS.map((c) => [c, []])) as unknown as PartnerData;
