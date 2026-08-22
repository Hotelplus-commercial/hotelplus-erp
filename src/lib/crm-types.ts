/* HotelPlus CRM Suite — shared domain types (prototype, client-side store) */

export type ServiceLine = "ORM" | "MARCOM" | "PROD" | "PP";
export type ProductCategory = "setup" | "monthly" | "per_use" | "addon";
export type Billing = "one_time" | "monthly" | "per_use";
export type PricingModel = "fixed" | "commission_only" | "fixed_plus_commission" | "tbd";
export type TierGroup = "ORM" | "META" | "TIKTOK";

export type Package = {
  package_id: string;
  package_sku: string;
  name: string;
  base_price: number | null;
  commission_rate: number | null;
};

export type Product = {
  product_id: string;
  sku: string;
  name_th: string;
  name_en: string;
  service_line: ServiceLine;
  category: ProductCategory;
  tier_group: TierGroup | null;
  billing: Billing;
  pricing_model: PricingModel;
  base_price: number | null;
  commission_rate: number | null;
  parent_sku: string | null;
  max_quantity: number | null;
  includes: string[];
  note: string | null;
  packages: Package[];
  active: boolean;
};

/* ---------------- customer master ---------------- */

export type CustomerType = "individual" | "juristic";

export type Hotel = {
  hotel_id: string;
  name: string;
  room_key: number;
  city: string;
  star_rating?: number;
};

export type Customer = {
  customer_id: string;
  legal_name: string;
  type: CustomerType;
  tax_id: string;
  address: string;
  signer_name: string;
  contact_phone: string;
  contact_email: string;
  bank_account?: string;
  hotels: Hotel[];
  created_at: string;
};

export type CustomerSnapshot = {
  customer_id: string;
  legal_name: string;
  type: CustomerType;
  tax_id: string;
  address: string;
  signer_name: string;
  contact_phone: string;
  contact_email: string;
  hotel_name: string;
};

/* ---------------- deals ---------------- */

export type Deal = {
  pipedrive_deal_id: number;
  contact_person: string;
  hotel_name: string;
  room_key: number;
  status: string;
  owner_email: string;
  synced_at: string;
  customer_id: string | null;
};

/* ---------------- templates ---------------- */

export type TemplateVersion = {
  version: string;
  effective_from: string;
  body_url: string;
};

export type ContractTemplate = {
  template_id: string;
  name: string;
  mapped_skus: string[];
  versions: TemplateVersion[];
};

/* ---------------- quotation ---------------- */

export type QuoteStatus = "draft" | "sent" | "approved" | "revised";

export type QuoteLine = {
  line_id: string;
  product_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  package_sku_snapshot: string | null;
  billing: Billing;
  unit_price_snapshot: number | null;
  commission_rate_snapshot: number | null;
  quantity: number;
  amount: number;
  includes_snapshot: string[];
  line_type: "fixed" | "commission" | "setup";
};

export type Totals = {
  subtotal: number;
  vat: number;
  wht: number;
  total: number;
};

export type Quotation = {
  quote_id: string;
  pipedrive_deal_id: number;
  customer_id: string | null;
  customer_snapshot: CustomerSnapshot | null;
  status: QuoteStatus;
  lines: QuoteLine[];
  totals: Totals;
  revision_of: string | null;
  superseded_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  created_by: string;
};

/* ---------------- contract ---------------- */

export type ContractStatus =
  | "draft"
  | "inquiry_inv"
  | "live_link_completed"
  | "follow_up_contract"
  | "follow_up_payment"
  | "customer_completed"
  | "contract_completed";

export const contractStatusLabel: Record<ContractStatus, string> = {
  draft: "Draft",
  inquiry_inv: "Inquiry INV",
  live_link_completed: "LIVE Link completed",
  follow_up_contract: "Follow up Contract",
  follow_up_payment: "Follow up Payment",
  customer_completed: "Customer Completed",
  contract_completed: "Contract Completed",
};

export type ContractLine = {
  line_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  package_snapshot: string | null;
  billing: Billing;
  unit_price: number | null;
  commission_rate: number | null;
  quantity: number;
};

export type Contract = {
  contract_id: string;
  from_quote_id: string;
  customer_snapshot: CustomerSnapshot;
  template_snapshot: { template_id: string; version: string; body_url: string };
  lines: ContractLine[];
  monthly_value: number;
  start_date: string;
  duration_months: number;
  status: ContractStatus;
  case_number: string | null;
  signing_type: CustomerType;
  documents: string[];
  live_link_signed_at: string | null;
  created_at: string;
  created_by: string;
};

/* ---------------- production report ---------------- */

export type ProductionReport = {
  report_id: string;
  contract_id: string;
  sku: string;
  period_year: number;
  period_month: number;
  revenue_thb: number;
  commission_thb: number;
  uploaded_by: "ORM" | "MARCOM";
  uploaded_at: string;
  approved_by_hotel: boolean;
};

/* ---------------- invoice / tax receipt ---------------- */

export type InvoiceStatus = "draft" | "sent_via_live_link" | "paid" | "void";

export type InvoiceLine = {
  line_id: string;
  contract_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  line_type: "fixed" | "commission" | "setup";
  quantity: number;
  unit_price: number;
  amount: number;
  production_report_id?: string;
};

export type Invoice = {
  invoice_id: string;
  case_number: string;
  contract_ids: string[];
  customer_snapshot: CustomerSnapshot;
  billing_period_start: string;
  billing_period_end: string;
  lines: InvoiceLine[];
  totals: Totals;
  status: InvoiceStatus;
  issued_at: string | null;
  issued_by: string | null;
  paid_at: string | null;
  created_at: string;
};

export type TaxReceipt = {
  tax_receipt_id: string;
  from_invoice_id: string;
  customer_snapshot: CustomerSnapshot;
  lines: InvoiceLine[];
  totals: Totals;
  payment_method: string;
  paid_at: string;
  issued_at: string;
  status: "issued" | "void";
  void_reason?: string;
};

/* ---------------- request INV / live link ---------------- */

export type InvRequestStatus = "new" | "in_progress" | "live_link_sent" | "completed";

export type InvRequest = {
  case_number: string;
  contract_ids: string[];
  from_app: "PS";
  requested_by: string;
  requested_at: string;
  status: InvRequestStatus;
  invoice_id: string | null;
};

export type LiveLinkEvent = { type: "opened" | "signed" | "paid"; at: string };

export type LiveLink = {
  token: string;
  case_number: string;
  contract_ids: string[];
  invoice_id: string | null;
  events: LiveLinkEvent[];
  signature_data_url: string | null;
  created_at: string;
};

/* ---------------- audit ---------------- */

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
};
