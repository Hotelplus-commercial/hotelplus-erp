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
/** PM Workspace Partner v1.1 §3.2 (PW19): optional supporting documents (links; Drive not connected). Missing = none. */
export const PARTNER_ATTACHMENT_KINDS = ['สัญญา Partner', 'ใบเสนอราคา / Rate Card', 'อีเมล / หนังสือ', 'อื่น ๆ'] as const;
export type PartnerAttachmentKind = (typeof PARTNER_ATTACHMENT_KINDS)[number];
/** v1.2 §4.2 (PW27): optional upload fields. Missing source = LINK + STORED (v1.1 items). File bytes live only in the
 * browser IndexedDB store (src/lib/partner-files.ts, key = file_ref), never in this collection or its Cloud mirror. */
export type PartnerAttachmentSource = 'UPLOAD' | 'LINK';
export type PartnerStorageStatus = 'PENDING' | 'STORED';
export type PartnerAttachment = { id: string; name: string; kind: PartnerAttachmentKind; url: string; note?: string; added_by: string; added_at: string;
  source?: PartnerAttachmentSource; file_ref?: string; size?: number; mime?: string; storage_status?: PartnerStorageStatus; stored_url?: string };
/** v1.2 §3 / §4.1 (PW25–PW26): optional contact, storage location (doc_folder_url, https://) and note. */
export type Partner = { id: string; name: string; created_at: string; attachments?: PartnerAttachment[];
  doc_folder_url?: string; contact_name?: string; contact_email?: string; contact_phone?: string; note?: string };

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
export type ContractPartnerSystem = { contract_id: string; partner_id: string; system_name: string; set_by: string; set_at: string;
  /** PM Workspace Partner v1.0 (DP-O1): optional per-contract allotment override, no UI. */
  allotment?: number | null };

/** property_partner_system (PM Workspace Partner v1.0 §1.2) — system of a hotel's ORM service, effective-dated.
 * Current value for a date = latest row with effective_from ≤ date. allotment (DP-O1, PM entered) picks the Rate Card tier. */
export type PropertyPartnerSystem = {
  id: string; property_id: string; partner_id: string; system_name: string; effective_from: string;
  allotment: number | null; set_by: string; set_at: string; note: string | null;
};

/** partner_deals */
export type PartnerDeal = {
  id: string; partner_id: string; kind: DealKind; status: DealStatus; title: string;
  start_date: string | null; end_date: string | null;
  benefit_type: BenefitType; benefit_value: number | null; benefit_currency: Currency | null;
  scope: DealScope; contract_ids: string[]; note: string; attachment_url: string;
  ac_ticket_id: string | null; created_by: string; created_at: string; updated_at: string;
};

/** partner_cashback_receipts — AC-owned (AC App UI later). */
export type PartnerCashbackReceipt = { id: string; deal_id: string; contract_id: string; received_at: string; recorded_by: string;
  /** AC App Partner Bills v1.0 §3 (optional, additive): actual amount received. Missing = deal value. */
  amount?: number | null; currency?: Currency | null };

/** partner_bill_lines — AC-owned. "จ่ายล่วงหน้าถึง" = max period_end where paid_at not null. */
export type PartnerBillLine = {
  id: string; partner_id: string; contract_id: string; period_start: string; period_end: string;
  amount: number; currency: Currency; paid_at: string | null; recorded_by: string;
  /** AC App Partner Bills v1.0 §2.2 (optional, additive): the bill this line belongs to. */
  bill_id?: string | null;
};

/** partner_bills — AC App Partner Bills v1.0 §2.1 (AC-owned). Unique (partner_id, bill_no). */
export type PartnerBillStatus = 'PENDING' | 'PAID' | 'VOID';
export type PartnerBill = {
  id: string; partner_id: string; bill_no: string; bill_date: string; due_date: string; period_start: string; period_end: string;
  total: number; currency: Currency; expected_total: number; status: PartnerBillStatus; paid_at: string | null;
  attachment_url: string; note: string; created_by: string; created_at: string; updated_at: string;
};

/** system_credit_requests — created by PM Workspace later. "รอ PM ส่งคำขอ" is derived, never stored. */
export type SystemCreditRequest = {
  id: string; contract_id: string; partner_id: string; contract_end_date: string; prepaid_until: string;
  months_over: number; amount: number; currency: Currency; status: CreditRequestStatus;
  requested_at: string; decided_at: string | null; credit_expires_at: string | null; ac_ticket_id: string | null; created_by: string;
  /** PM Workspace Partner v1.0 §2.3 (optional, additive). */
  approved_amount?: number | null; note?: string | null; attachment_url?: string | null; answer_attachment_url?: string | null; requested_by?: string | null;
};

/** system_credit_usage — AC-owned. */
export type SystemCreditUsage = { id: string; credit_request_id: string; partner_bill_ref: string; amount: number; used_at: string; recorded_by: string;
  /** AC App Partner Bills v1.0 §2.2 (optional, additive). */
  bill_id?: string | null };

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
  property_partner_system: PropertyPartnerSystem[];
  partner_bills: PartnerBill[];
};
export type PartnerCollection = keyof PartnerData;
export const PARTNER_COLLECTIONS = [
  'partners', 'partner_rate_cards', 'partner_rate_card_tiers', 'contract_partner_system', 'partner_deals',
  'partner_cashback_receipts', 'partner_bill_lines', 'system_credit_requests', 'system_credit_usage',
  'property_partner_system', 'partner_bills',
] as const satisfies readonly PartnerCollection[];
/** AC-owned: written only from AC App › บิล Partner (AC role in the testing switcher). */
export const AC_OWNED: readonly PartnerCollection[] = ['partner_cashback_receipts', 'partner_bill_lines', 'system_credit_usage', 'partner_bills'];
export const emptyPartnerData = (): PartnerData => Object.fromEntries(PARTNER_COLLECTIONS.map((c) => [c, []])) as unknown as PartnerData;
