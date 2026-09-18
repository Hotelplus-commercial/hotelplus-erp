/* PS App v1.1 — Template Management + Layer 2 patch (prototype store, localStorage) */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TemplateType = "quote" | "contract";
export type VersionStatus = "draft" | "active" | "archived";

/* ---------------- Layer 2 types (§NEW-A / §NEW-B / §4) ---------------- */

export type LockMode = "locked" | "structured" | "free";
/** 2a field slot · 2b conditional block · 2c computed · 2d guardrail */
export type FieldSubType = "2a" | "2b" | "2c" | "2d";

export type TemplateSection = {
  id: string;
  title: string;
  lock_mode: LockMode;
  uses_conditional_block?: string | null;
  content: string;
};

export type ConditionalBlock = {
  block_id: string;
  block_group: string;
  condition_type: "sku_id" | "service_line" | "customer_type" | "sku_tier" | "sku_channel";
  condition_value: string;
  content: string;
  created_by: "legal_admin" | "system";
  version: string;
};

export type ComputedField = {
  field_path: string;
  display_label: string;
  formula_type: "multiply" | "lookup" | "concat" | "thai_words" | "template_concat" | "sku_setup_join";
  formula_config: Record<string, unknown>;
  editable_in_wizard: boolean;
  computed_when: "on_generate" | "on_render" | "on_wizard_load";
  category: string;
  applies_to_service_line: "ORM" | "MARCOM" | "ALL";
};

export type GuardrailRule = {
  rule_id: string;
  field_path: string;
  applies_when: { sku_pattern?: string; service_line?: "ORM" | "MARCOM"; sku_tier?: "Full" | "Lite" };
  constraint: { min?: number; max?: number; default?: number | string; locked?: boolean; enum?: string[] };
  error_message: string;
  warning_message?: string;
};

export type TemplateVersion = {
  version_id: string;
  version_label: string;
  status: VersionStatus;
  body: string;
  auto_fields_used: string[];
  activated_at: string | null;
  activated_by: string | null;
  archived_at: string | null;
  changelog: string | null;
  created_at: string;
  created_by: string;
};

export type Template = {
  template_id: string;
  template_type: TemplateType;
  name: string;
  description: string | null;
  mapped_skus: string[];
  quote_type: "ORM" | "MARCOM" | null;
  service_line: "ORM" | "MARCOM" | null;
  sections: TemplateSection[];
  /** v2.1 Path A §3.6 — highest legitimate section number (ORM 9 · Marcom 7) */
  max_section?: number;
  superseded: boolean;
  versions: TemplateVersion[];
  active_version_id: string;
  docs_generated: number;
  created_at: string;
  created_by: string;
};

export type AutoField = {
  field_path: string;
  source: string;
  type: "string" | "number" | "date" | "datetime" | "array" | "array_iterator";
  available_in: TemplateType[];
  supported_filters: string[];
  example: string;
  group: string;
  sub_type?: FieldSubType;
  computed_when?: ComputedField["computed_when"];
  editable_in_wizard?: boolean;
  applies_when?: string;
  applies_to_service_line?: "ORM" | "MARCOM" | "ALL";
};

export const PS_USER = "napat.p@hotelplus.asia";
export const PS_USER_EMPLOYEE_CODE = "E024";

export const subTypeMeta: Record<FieldSubType, { icon: string; label: string }> = {
  "2a": { icon: "🎯", label: "Field slot" },
  "2b": { icon: "🔀", label: "Conditional block" },
  "2c": { icon: "⚙", label: "Computed field" },
  "2d": { icon: "🛡", label: "Guardrail field" },
};

export const lockMeta: Record<LockMode, { icon: string; label: string; className: string }> = {
  locked: { icon: "🔒", label: "Locked", className: "bg-muted/70 text-muted-foreground" },
  structured: { icon: "🟡", label: "Structured", className: "bg-card" },
  free: { icon: "🟢", label: "Free", className: "bg-emerald-50 dark:bg-emerald-950/30" },
};

export const fieldGroupLabel: Record<string, string> = {
  company: "🏢 Company (PS config)",
  quote: "📄 Quote (จาก BD)",
  package: "📦 Package loop (Quote เท่านั้น)",
  hotel: "🏨 Hotel (Contract · AC master)",
  customer: "👤 Customer (Contract · AC master)",
  contract: "📜 Contract (Wizard + approved_snapshot)",
  payment: "💰 Payment",
  sku: "📦 SKU / Package (approved_skus)",
  system: "⚙ System (ตอน render PDF)",
  branding: "🎨 Branding v2.1 (Cover · CI · Signature)",
};

export const AUTO_FIELDS: AutoField[] = [
  { field_path: "company.legal_name", source: "PS.config.company_legal_name", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "บริษัท พักดีพลัส จำกัด", group: "company", sub_type: "2a" },
  { field_path: "company.tax_id", source: "PS.config.company_tax_id", type: "string", available_in: ["contract"], supported_filters: [], example: "0105558123456", group: "company", sub_type: "2a" },
  { field_path: "company.address", source: "PS.config.company_address", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "92/5 อาคารสาธรธานี กรุงเทพฯ", group: "company", sub_type: "2a" },
  { field_path: "company.phone", source: "PS.config.company_phone", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "(+66)82 898 9369", group: "company", sub_type: "2a" },
  { field_path: "company.email", source: "PS.config.company_email", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "info@hotelplus.asia", group: "company", sub_type: "2a" },

  /* v2.1 · branding fields for Cover Page / CI header / signature block */
  { field_path: "service_line.label", source: "Computed: LOOKUP(sku.service_line) · CI header + cover", type: "string", available_in: ["contract"], supported_filters: [], example: "ONLINE REVENUE MANAGEMENT", group: "branding", sub_type: "2c", computed_when: "on_render" },
  { field_path: "contract.code", source: "Computed ตอน Wizard Step 5 · Cover Page มุมซ้ายบน", type: "string", available_in: ["contract"], supported_filters: [], example: "CT-00001-ORM-690101-01", group: "branding", sub_type: "2c", computed_when: "on_generate" },
  { field_path: "hotelplus.authorized_signatory", source: "PS.config.authorized_signatory", type: "string", available_in: ["contract"], supported_filters: [], example: "นาย ปราบ เอื้อพัชรพล", group: "branding", sub_type: "2a" },


  { field_path: "quote.quote_id", source: "BD.quotes.quote_id", type: "string", available_in: ["quote"], supported_filters: [], example: "Q-ORM-0287", group: "quote", sub_type: "2a" },
  { field_path: "quote.hotel_name", source: "BD.quotes.hotel_name (free text)", type: "string", available_in: ["quote"], supported_filters: [], example: "Sumator Resort", group: "quote", sub_type: "2a" },
  { field_path: "quote.created_at", source: "BD.quotes.created_at", type: "datetime", available_in: ["quote"], supported_filters: ["date_th", "date_en", "datetime"], example: "15 สิงหาคม 2569", group: "quote", sub_type: "2a" },
  { field_path: "quote.created_by.email", source: "Auth.users.email (join created_by)", type: "string", available_in: ["quote"], supported_filters: [], example: "somchai.n@hotelplus.asia", group: "quote", sub_type: "2a" },

  { field_path: "package.name", source: "calculator_output.packages[i].name", type: "string", available_in: ["quote"], supported_filters: [], example: "Smart Package", group: "package", sub_type: "2a" },
  { field_path: "package.base_price", source: "calculator_output.packages[i].base_price", type: "number", available_in: ["quote"], supported_filters: ["thb", "number", "currency:en"], example: "฿5,600", group: "package", sub_type: "2a" },
  { field_path: "package.commission_rate", source: "calculator_output.packages[i].commission_rate", type: "number", available_in: ["quote"], supported_filters: ["pct"], example: "10.00%", group: "package", sub_type: "2a" },
  { field_path: "package.first_month_total", source: "computed · base + setup", type: "number", available_in: ["quote"], supported_filters: ["thb", "number"], example: "฿12,600", group: "package", sub_type: "2c", computed_when: "on_render" },
  { field_path: "package.includes[*].name", source: "calculator_output.packages[i].includes", type: "array_iterator", available_in: ["quote"], supported_filters: [], example: "Revplus+, Register OTAs", group: "package", sub_type: "2a" },

  { field_path: "hotel.name", source: "AC.hotels.name", type: "string", available_in: ["contract"], supported_filters: [], example: "Sumator Resort", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.address", source: "AC.hotels.address", type: "string", available_in: ["contract"], supported_filters: [], example: "123 ถนนสุขุมวิท กรุงเทพฯ", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.room_key", source: "AC.hotels.room_key", type: "number", available_in: ["contract"], supported_filters: ["number"], example: "9", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.address_number", source: "AC.hotels.address_number (OCR ทะเบียนบ้านโรงแรม)", type: "string", available_in: ["contract"], supported_filters: [], example: "240/6", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.street", source: "AC.hotels.street", type: "string", available_in: ["contract"], supported_filters: [], example: "ถนนร่วมจิตร", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.subdistrict", source: "AC.hotels.subdistrict", type: "string", available_in: ["contract"], supported_filters: [], example: "ตำบลชะอำ", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.district", source: "AC.hotels.district", type: "string", available_in: ["contract"], supported_filters: [], example: "อำเภอชะอำ", group: "hotel", sub_type: "2a" },
  { field_path: "hotel.province", source: "AC.hotels.province", type: "string", available_in: ["contract"], supported_filters: [], example: "จังหวัดเพชรบุรี", group: "hotel", sub_type: "2a" },

  { field_path: "customer.legal_name", source: "AC.customers.legal_name (OCR ภพ.20 / บัตรประชาชน)", type: "string", available_in: ["contract"], supported_filters: [], example: "บริษัท ชะอำเพิ่มสุข จำกัด", group: "customer", sub_type: "2a" },
  { field_path: "customer.tax_id", source: "AC.customers.tax_id", type: "string", available_in: ["contract"], supported_filters: [], example: "0105558123456", group: "customer", sub_type: "2a" },
  { field_path: "customer.signer_name", source: "AC.customers.signer_name (KYC OCR)", type: "string", available_in: ["contract"], supported_filters: [], example: "คุณ ประเสริฐ อยู่ดี", group: "customer", sub_type: "2a" },
  { field_path: "customer.signer_title", source: "manual entry ใน Wizard", type: "string", available_in: ["contract"], supported_filters: [], example: "ผู้จัดการทั่วไป", group: "customer", sub_type: "2a" },
  { field_path: "customer.type", source: "AC.customers.type (set in Wizard Step 2)", type: "string", available_in: ["contract"], supported_filters: [], example: "juristic", group: "customer", sub_type: "2a", editable_in_wizard: true },
  { field_path: "customer.registration_no", source: "AC.customers.registration_no (OCR ใบจดทะเบียนบริษัท)", type: "string", available_in: ["contract"], supported_filters: [], example: "0105558123456", group: "customer", sub_type: "2a", applies_when: "customer.type == 'juristic'" },
  { field_path: "customer.registered_address", source: "AC.customers.registered_address (OCR)", type: "string", available_in: ["contract"], supported_filters: [], example: "92/5 อาคารสาธรธานี ชั้น 2 ...", group: "customer", sub_type: "2a", applies_when: "customer.type == 'juristic'" },
  { field_path: "customer.id_number", source: "AC.customers.id_number (OCR บัตร ปชช)", type: "string", available_in: ["contract"], supported_filters: [], example: "1-2345-67890-12-3", group: "customer", sub_type: "2a", applies_when: "customer.type == 'individual'" },
  { field_path: "customer.address_full", source: "AC.customers.address_full (OCR)", type: "string", available_in: ["contract"], supported_filters: [], example: "8 ต.ศรีสุทุลไทย อ.ชะอำ จ.เพชรบุรี", group: "customer", sub_type: "2a", applies_when: "customer.type == 'individual'" },

  { field_path: "contract.from_quote_id", source: "contract.from_quote_id", type: "string", available_in: ["contract"], supported_filters: [], example: "Q-ORM-0287", group: "contract", sub_type: "2a" },
  { field_path: "contract.monthly_fee", source: "approved_snapshot.approved_monthly_total", type: "number", available_in: ["contract"], supported_filters: ["thb", "number"], example: "฿5,600", group: "contract", sub_type: "2a" },
  { field_path: "contract.commission_rate", source: "approved_snapshot.approved_commission_rate", type: "number", available_in: ["contract"], supported_filters: ["pct"], example: "10.00%", group: "contract", sub_type: "2a", applies_to_service_line: "ORM" },
  { field_path: "contract.setup_fee", source: "approved_snapshot.approved_onetime_total", type: "number", available_in: ["contract"], supported_filters: ["thb"], example: "฿3,500", group: "contract", sub_type: "2a" },
  { field_path: "contract.start_date", source: "Wizard step 4", type: "date", available_in: ["contract"], supported_filters: ["date_th", "date_en"], example: "1 กันยายน 2569", group: "contract", sub_type: "2a" },
  { field_path: "contract.duration_months", source: "Wizard step 4 · guarded by tier", type: "number", available_in: ["contract"], supported_filters: [], example: "6", group: "contract", sub_type: "2d" },
  { field_path: "contract.renewal_months", source: "Locked default: 12", type: "number", available_in: ["contract"], supported_filters: [], example: "12", group: "contract", sub_type: "2d" },
  { field_path: "contract.signed_date", source: "Populated at signing time (Path A or B)", type: "date", available_in: ["contract"], supported_filters: ["date_th", "date_en"], example: "22 สิงหาคม 2569", group: "contract", sub_type: "2a" },
  { field_path: "contract.package_code", source: "Computed: {employee_code}/{sku_id}/{duration}M/{YYYY-MM-DD}/{seq5}", type: "string", available_in: ["contract"], supported_filters: [], example: "E024/ORM-MTH-FULL-SMART/6M/2026-08-22/00003", group: "contract", sub_type: "2c", computed_when: "on_generate" },
  { field_path: "contract.cover_title", source: "Computed: LOOKUP(sku.service_line)", type: "string", available_in: ["contract"], supported_filters: [], example: "สัญญาบริหารกิจการห้องพักรายเดือน", group: "contract", sub_type: "2c", computed_when: "on_render" },
  { field_path: "contract.cover_service_badge", source: "Computed: LOOKUP(sku.service_line)", type: "string", available_in: ["contract"], supported_filters: [], example: "ONLINE REVENUE MANAGEMENT", group: "contract", sub_type: "2c", computed_when: "on_render" },
  { field_path: "contract.late_penalty_amount", source: "Computed: sku.monthly_fee × 2", type: "number", available_in: ["contract"], supported_filters: ["thb"], example: "7,700", group: "contract", sub_type: "2c", computed_when: "on_generate", editable_in_wizard: true },

  { field_path: "payment.due_date_of_month", source: "Locked default: 15", type: "number", available_in: ["contract"], supported_filters: [], example: "15", group: "payment", sub_type: "2d" },
  { field_path: "payment.bank_account_name", source: "Computed: LOOKUP(customer.type)", type: "string", available_in: ["contract"], supported_filters: [], example: "Prabt Aurpatcharaphon", group: "payment", sub_type: "2c", computed_when: "on_render" },
  { field_path: "payment.bank_account_no", source: "Computed: LOOKUP(customer.type)", type: "string", available_in: ["contract"], supported_filters: [], example: "009 800 9889", group: "payment", sub_type: "2c", computed_when: "on_render" },
  { field_path: "payment.bank_name", source: "Computed: LOOKUP(customer.type)", type: "string", available_in: ["contract"], supported_filters: [], example: "ธนาคารกรุงเทพ", group: "payment", sub_type: "2c", computed_when: "on_render" },

  { field_path: "sku.product_name", source: "approved_snapshot.approved_skus[i].product_name", type: "string", available_in: ["contract"], supported_filters: [], example: "Smart Package", group: "sku", sub_type: "2a" },
  { field_path: "sku.billing_summary", source: "approved_snapshot.approved_skus[i].billing_summary", type: "string", available_in: ["contract"], supported_filters: [], example: "฿5,600/mo + 10%", group: "sku", sub_type: "2a" },
  { field_path: "sku.tier", source: "Derived from sku_id (contains -LITE ? 'Lite' : 'Full')", type: "string", available_in: ["contract"], supported_filters: [], example: "Full", group: "sku", sub_type: "2c", computed_when: "on_render" },
  { field_path: "sku.channel", source: "SKU.channel (Marcom only: Meta / Tiktok / GMB)", type: "string", available_in: ["contract"], supported_filters: [], example: "Meta", group: "sku", sub_type: "2a", applies_to_service_line: "MARCOM" },
  { field_path: "sku.setup_product_names", source: "approved_skus[Setup].product_name (joined)", type: "array", available_in: ["contract"], supported_filters: ["join_thai", "join_and"], example: "Register OTAs และ RevPlus+", group: "sku", sub_type: "2c", computed_when: "on_generate" },
  { field_path: "sku.setup_fee", source: "approved_snapshot.approved_onetime_total", type: "number", available_in: ["contract"], supported_filters: ["thb", "thb_thai_words"], example: "3,500", group: "sku", sub_type: "2a" },
  { field_path: "sku.monthly_fee", source: "approved_snapshot.approved_monthly_total", type: "number", available_in: ["contract"], supported_filters: ["thb", "thb_thai_words"], example: "3,850", group: "sku", sub_type: "2a" },
  { field_path: "sku.commission_rate", source: "approved_snapshot.approved_commission_rate", type: "number", available_in: ["contract"], supported_filters: ["pct"], example: "8.50%", group: "sku", sub_type: "2a", applies_to_service_line: "ORM" },

  { field_path: "page.current", source: "PDF renderer", type: "number", available_in: ["quote", "contract"], supported_filters: [], example: "1", group: "system", sub_type: "2c", computed_when: "on_render" },
  { field_path: "page.total", source: "PDF renderer", type: "number", available_in: ["quote", "contract"], supported_filters: [], example: "4", group: "system", sub_type: "2c", computed_when: "on_render" },
];

const FIELD_PATHS = new Set(AUTO_FIELDS.map((f) => f.field_path));

/* ---------------- §NEW-C Guardrail rules ---------------- */

export const GUARDRAIL_RULES: GuardrailRule[] = [
  {
    rule_id: "duration_full",
    field_path: "contract.duration_months",
    applies_when: { sku_tier: "Full" },
    constraint: { min: 6, max: 24, default: 6 },
    error_message: "SKU ประเภท Full ต้องมีระยะเวลาสัญญาขั้นต่ำ 6 เดือน",
  },
  {
    rule_id: "duration_lite",
    field_path: "contract.duration_months",
    applies_when: { sku_tier: "Lite" },
    constraint: { min: 1, max: 12, default: 1 },
    error_message: "SKU ประเภท Lite ต้องมีระยะเวลาสัญญาระหว่าง 1-12 เดือน",
  },
  {
    rule_id: "renewal_locked",
    field_path: "contract.renewal_months",
    applies_when: {},
    constraint: { default: 12, locked: true },
    error_message: "Renewal ล็อกไว้ที่ 12 เดือนตามนโยบาย",
  },
  {
    rule_id: "payment_date_locked",
    field_path: "payment.due_date_of_month",
    applies_when: {},
    constraint: { default: 15, locked: true },
    error_message: "วันชำระค่าบริการล็อกไว้ที่วันที่ 15 ของเดือนตามนโยบาย",
  },
];

/* ---------------- §NEW-D Computed fields ---------------- */

export const COMPUTED_FIELDS: ComputedField[] = [
  {
    field_path: "contract.package_code",
    display_label: "รหัสสัญญา (Cover Package Code)",
    formula_type: "template_concat",
    formula_config: { template: "{employee_code}/{sku_id}/{duration}M/{date}/{seq}", timezone: "Asia/Bangkok", seq_format: "zero_pad_5" },
    editable_in_wizard: false,
    computed_when: "on_generate",
    category: "contract",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "contract.late_penalty_amount",
    display_label: "ค่าปรับผิดนัดชำระ (Monthly × 2)",
    formula_type: "multiply",
    formula_config: { source_field: "sku.monthly_fee", multiplier: 2 },
    editable_in_wizard: true,
    computed_when: "on_generate",
    category: "contract",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "contract.cover_title",
    display_label: "หัวสัญญา (ตาม Service Line)",
    formula_type: "lookup",
    formula_config: {
      lookup_key: "sku.service_line",
      lookup_table: { ORM: "สัญญาบริหารกิจการห้องพักรายเดือน", MARCOM: "สัญญาว่าจ้างบริหารจัดการตลาดผ่านสื่อสังคมออนไลน์" },
    },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "contract",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "contract.cover_service_badge",
    display_label: "แถบ Service Line (สีเหลืองบนหน้าปก)",
    formula_type: "lookup",
    formula_config: { lookup_key: "sku.service_line", lookup_table: { ORM: "ONLINE REVENUE MANAGEMENT", MARCOM: "MARKETING COMMUNICATION" } },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "contract",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "payment.bank_account_no",
    display_label: "เลขบัญชีรับชำระ (ตามประเภทลูกค้า)",
    formula_type: "lookup",
    formula_config: { lookup_key: "customer.type", lookup_table: { individual: "009 800 9889", juristic: "242 044 5245" } },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "payment",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "payment.bank_account_name",
    display_label: "ชื่อบัญชีรับชำระ (ตามประเภทลูกค้า)",
    formula_type: "lookup",
    formula_config: { lookup_key: "customer.type", lookup_table: { individual: "Prabt Aurpatcharaphon", juristic: "บริษัท พักดีพลัส จำกัด" } },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "payment",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "payment.bank_name",
    display_label: "ธนาคาร (ตามประเภทลูกค้า)",
    formula_type: "lookup",
    formula_config: { lookup_key: "customer.type", lookup_table: { individual: "ธนาคารกรุงเทพ", juristic: "ธนาคารกรุงเทพ" } },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "payment",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "sku.tier",
    display_label: "SKU Tier (derived)",
    formula_type: "lookup",
    formula_config: { lookup_key: "regex_test", regex_pattern: "-LITE", match_value: "Lite", default_value: "Full", source_field: "contract.sku_id" },
    editable_in_wizard: false,
    computed_when: "on_render",
    category: "sku",
    applies_to_service_line: "ALL",
  },
  {
    field_path: "sku.setup_product_names",
    display_label: "รายชื่อ Product Setup ที่ซื้อจริง",
    formula_type: "sku_setup_join",
    formula_config: { source: "approved_snapshot.approved_skus", filter: { category: "Setup" }, extract_field: "product_name", join: " และ " },
    editable_in_wizard: false,
    computed_when: "on_generate",
    category: "sku",
    applies_to_service_line: "ALL",
  },
];

/* ---------------- §NEW-E ConditionalBlock registry ---------------- */

export const BLOCK_GROUPS: { block_group: string; condition_source: string; variants_expected: string; note: string }[] = [
  { block_group: "party_b", condition_source: "customer.type", variants_expected: "2 (individual · juristic)", note: "Wave 1 · seeded" },
  { block_group: "definitions", condition_source: "sku_id", variants_expected: "~5 variants", note: "Schema ready · text pending" },
  { block_group: "scope_of_work", condition_source: "sku_id", variants_expected: "1 per SKU", note: "Schema ready · text pending" },
  { block_group: "owner_asset_termination", condition_source: "sku_id", variants_expected: "1 per SKU", note: "Schema ready · text pending" },
  { block_group: "letter_of_authorization", condition_source: "sku_id", variants_expected: "1 per SKU", note: "Schema ready · text pending" },
  { block_group: "work_proposal", condition_source: "sku_id", variants_expected: "1 per SKU", note: "Schema ready · text pending" },
];

/** Wave 1 seeds only party_b (Wave 2 populates the rest from Legal). */
export const CONDITIONAL_BLOCKS: ConditionalBlock[] = [
  {
    block_id: "party_b_individual",
    block_group: "party_b",
    condition_type: "customer_type",
    condition_value: "individual",
    content:
      '<p>{{customer.legal_name}} เลขที่บัตรประชาชน {{customer.id_number}} {{customer.address_full}} ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า "เจ้าของโครงการ"</p>',
    created_by: "legal_admin",
    version: "1.0",
  },
  {
    block_id: "party_b_juristic",
    block_group: "party_b",
    condition_type: "customer_type",
    condition_value: "juristic",
    content:
      '<p>{{customer.legal_name}} ทะเบียนนิติบุคคลเลขที่ {{customer.registration_no}} สำนักงานจดทะเบียน {{customer.registered_address}} โดย {{customer.signer_name}} ตำแหน่ง {{customer.signer_title}} ผู้มีอำนาจลงนาม ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า "เจ้าของโครงการ"</p>',
    created_by: "legal_admin",
    version: "1.0",
  },
];

/* ---------------- placeholder helpers (R4 / R5) ---------------- */

export const parsePlaceholders = (body: string): string[] => {
  const out = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([^}|]+?)\s*(\|[^}]*)?\}\}/g)) {
    const raw = (m[1] ?? "").trim();
    if (raw.startsWith("loop.")) continue;
    out.add(raw);
  }
  return [...out];
};

export const unknownPlaceholders = (body: string): string[] =>
  parsePlaceholders(body).filter((p) => !FIELD_PATHS.has(p));

/** block_groups referenced in a body via <ConditionalBlockPlaceholder group="…" /> */
export const parseConditionalPlaceholders = (body: string): string[] => {
  const out = new Set<string>();
  for (const m of body.matchAll(/<ConditionalBlockPlaceholder\s+group="([^"]+)"\s*\/?>/g)) out.add(m[1] ?? "");
  return [...out];
};

const SAMPLE: Record<string, string> = Object.fromEntries(AUTO_FIELDS.map((f) => [f.field_path, f.example]));

export const renderWithSample = (body: string) =>
  body.replace(/\{\{\s*([^}|]+?)\s*(\|\s*[a-z_:]+\s*)?\}\}/g, (_all, path: string) => {
    const key = path.trim();
    if (key.startsWith("loop.")) return key === "loop.index" ? "1" : "4";
    return SAMPLE[key] ?? `⟨${key}⟩`;
  });

export const subTypeOf = (fieldPath: string): FieldSubType =>
  AUTO_FIELDS.find((f) => f.field_path === fieldPath)?.sub_type ?? "2a";

export const tierOfSku = (skuId: string): "Full" | "Lite" => (/-LITE/i.test(skuId) ? "Lite" : "Full");

/* ---------------- R8 · conditional resolution ---------------- */

export type BlockContext = {
  sku_id?: string;
  service_line?: "ORM" | "MARCOM";
  customer_type?: "individual" | "juristic";
  sku_tier?: "Full" | "Lite";
  sku_channel?: string;
};

export const resolveConditionalBlock = (
  blockGroup: string,
  ctx: BlockContext,
  blocks: ConditionalBlock[] = CONDITIONAL_BLOCKS,
): { ok: true; block: ConditionalBlock } | { ok: false; error: string } => {
  const candidates = blocks.filter((b) => b.block_group === blockGroup);
  for (const c of candidates) {
    const value =
      c.condition_type === "sku_id" ? ctx.sku_id
        : c.condition_type === "service_line" ? ctx.service_line
        : c.condition_type === "customer_type" ? ctx.customer_type
        : c.condition_type === "sku_tier" ? ctx.sku_tier
        : ctx.sku_channel;
    if (value && value === c.condition_value) return { ok: true, block: c };
  }
  return { ok: false, error: `Missing block group: ${blockGroup} for ${JSON.stringify(ctx)}` };
};

/* ---------------- R9 · computed evaluation ---------------- */

export type ComputeContext = BlockContext & {
  employee_code?: string;
  duration_months?: number;
  monthly_fee?: number;
  generated_at?: string;
  daily_sequence?: number;
  setup_products?: string[];
};

export const evaluateComputed = (fieldPath: string, ctx: ComputeContext): string => {
  const def = COMPUTED_FIELDS.find((c) => c.field_path === fieldPath);
  if (!def) return "—";
  const cfg = def.formula_config as Record<string, never> & Record<string, unknown>;

  switch (def.formula_type) {
    case "multiply": {
      const base = ctx.monthly_fee ?? 0;
      const mult = Number(cfg["multiplier"] ?? 1);
      return (base * mult).toLocaleString("th-TH");
    }
    case "template_concat": {
      const date = (ctx.generated_at ?? bangkokDate()).slice(0, 10);
      const seq = String(ctx.daily_sequence ?? 1).padStart(5, "0");
      return `${ctx.employee_code ?? PS_USER_EMPLOYEE_CODE}/${ctx.sku_id ?? "SKU"}/${ctx.duration_months ?? 0}M/${date}/${seq}`;
    }
    case "sku_setup_join":
      return (ctx.setup_products ?? []).join(String(cfg["join"] ?? " และ ")) || "—";
    case "lookup": {
      const key = String(cfg["lookup_key"] ?? "");
      if (key === "regex_test") {
        const pattern = new RegExp(String(cfg["regex_pattern"] ?? ""), "i");
        return pattern.test(ctx.sku_id ?? "") ? String(cfg["match_value"]) : String(cfg["default_value"]);
      }
      const table = (cfg["lookup_table"] ?? {}) as Record<string, string>;
      const lookupValue = key === "customer.type" ? ctx.customer_type : ctx.service_line;
      return table[String(lookupValue ?? "")] ?? "—";
    }
    default:
      return "—";
  }
};

/* ---------------- R10 · guardrail validation ---------------- */

export type GuardrailResult = { ok: boolean; errors: string[]; warnings: string[]; matched: GuardrailRule[] };

export const guardrailsFor = (fieldPath: string, ctx: BlockContext): GuardrailRule[] =>
  GUARDRAIL_RULES.filter((r) => r.field_path === fieldPath).filter((r) => {
    const w = r.applies_when;
    if (w.sku_tier && w.sku_tier !== (ctx.sku_tier ?? (ctx.sku_id ? tierOfSku(ctx.sku_id) : undefined))) return false;
    if (w.service_line && w.service_line !== ctx.service_line) return false;
    if (w.sku_pattern && !new RegExp(w.sku_pattern).test(ctx.sku_id ?? "")) return false;
    return true;
  });

export const validateGuardrail = (fieldPath: string, value: number | string, ctx: BlockContext): GuardrailResult => {
  const matched = guardrailsFor(fieldPath, ctx);
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const r of matched) {
    const c = r.constraint;
    if (c.locked && String(value) !== String(c.default)) errors.push(`${r.error_message} · Field is locked to default value (${c.default})`);
    if (typeof value === "number") {
      if (c.min !== undefined && value < c.min) errors.push(r.error_message);
      if (c.max !== undefined && value > c.max) errors.push(r.error_message);
    }
    if (c.enum && !c.enum.includes(String(value))) errors.push(`${r.error_message} · allowed: ${c.enum.join(", ")}`);
    if (r.warning_message) warnings.push(r.warning_message);
  }
  return { ok: errors.length === 0, errors, warnings, matched };
};

/* ---------------- daily sequence (package code) ---------------- */

const bangkokDate = () => new Date(Date.now() + 7 * 3600_000).toISOString();
export const bangkokToday = () => bangkokDate().slice(0, 10);

const SEQ_KEY = "meridia.ps.daily_seq.v1";

export type DailySequenceCounter = { date: string; last_sequence: number };

const readCounter = (): DailySequenceCounter => {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const parsed = raw ? (JSON.parse(raw) as DailySequenceCounter) : null;
    if (parsed && parsed.date === bangkokToday()) return parsed;
  } catch {
    /* ignore */
  }
  return { date: bangkokToday(), last_sequence: 0 };
};

/* ---------------- seed ---------------- */

const v = (
  templateId: string,
  label: string,
  status: VersionStatus,
  body: string,
  changelog: string,
  activatedAt: string | null = null,
): TemplateVersion => ({
  version_id: `${templateId}@${label}`,
  version_label: label,
  status,
  body,
  auto_fields_used: parsePlaceholders(body),
  activated_at: activatedAt,
  activated_by: activatedAt ? PS_USER : null,
  archived_at: status === "archived" ? "2026-07-15T00:00:00+07:00" : null,
  changelog,
  created_at: activatedAt ?? "2026-07-01T00:00:00+07:00",
  created_by: PS_USER,
});

const QUOTE_ORM_BODY = `<h2>ใบเสนอราคา · {{quote.quote_id}}</h2>
<p>{{company.legal_name}} · {{company.address}}<br/>โทร {{company.phone}} · {{company.email}}</p>
<p><strong>เสนอราคาให้:</strong> {{quote.hotel_name}}<br/>วันที่ {{quote.created_at | date_th}}</p>
<foreach items="quote.calculator_output.packages" as="package">
  <h3>{{loop.index}}. {{package.name}}</h3>
  <p>ค่าบริการ {{package.base_price | thb}} ต่อเดือน · คอมมิชชั่น {{package.commission_rate | pct}}</p>
  <p>รวมเดือนแรก {{package.first_month_total | thb}} · ประกอบด้วย {{package.includes[*].name}}</p>
</foreach>`;

const QUOTE_ORM_DRAFT = `${QUOTE_ORM_BODY}\n<p>ผู้เสนอราคา: {{quote.created_by.email}}</p>`;

const QUOTE_MARCOM_BODY = `<h2>ใบเสนอราคา Marcom · {{quote.quote_id}}</h2>
<p>{{company.legal_name}} · {{company.email}}</p>
<p><strong>โรงแรม:</strong> {{quote.hotel_name}} · วันที่ {{quote.created_at | date_th}}</p>
<foreach items="quote.calculator_output.packages" as="package">
  <p>{{loop.index}}. {{package.name}} — {{package.base_price | thb}}</p>
</foreach>`;

export const CONTRACT_SECTIONS = [
  "ผู้ทำสัญญา (Parties)",
  "ขอบเขตการให้บริการ (Service Scope)",
  "เงื่อนไขการชำระเงิน (Payment Terms)",
  "ระยะเวลาสัญญา (Duration)",
  "เงื่อนไขทั่วไป (Boilerplate)",
  "การระงับข้อพิพาท (Dispute resolution)",
  "ลายเซ็นผู้ทำสัญญา (Signatures)",
] as const;


const s = (
  id: string,
  title: string,
  lock_mode: LockMode,
  content: string,
  uses_conditional_block: string | null = null,
): TemplateSection => ({ id, title, lock_mode, uses_conditional_block, content });

/* v2.1 Path A · Phase 3 — real skeleton bodies taken from the signed contracts.
 * ORM = §1-9 + App A/B · MARCOM = §1-7 + App A/B (no §8-9).
 * Locked boilerplate is verbatim; every placeholder is in field-registry v2.1. */

const PAYMENT_CONDITION = `<h4>PAYMENT CONDITION</h4>
<p>COMPLETE TOTAL QUOTATION TO START CONTRACT<br/>PLEASE PROCESS THE PAYMENT AS FOLLOWING ACCOUNT INFORMATION</p>
<p>ACCOUNT NAME<br/>{{payment.bank_account_name}}</p>
<p>ACCOUNT NUMBER<br/>{{payment.bank_name}} {{payment.bank_account_no}}</p>`;

const DEFAULT_CLAUSES = `<p>7.1 ในการยกเลิกสัญญาย้อนหลัง ค่าบริการในข้อ 4 จะถูกคำนวณจนถึงรอบเดือนถัดไป หรือไม่เกินกว่า 30 วัน นับจากวันที่แจ้งยกเลิกสัญญาเป็นลายลักษณ์อักษรเท่านั้น</p>
<p>7.2 การเรียกเก็บดอกเบี้ยจากยอดค้างชำระ : โดยนับจากวันที่ครบกำหนดชำระจนถึงปัจจุบัน ตามอัตราดอกเบี้ย 1.25 เปอร์เซ็นต์ ต่อเดือน จากยอดมูลค่าที่ค้างชำระ</p>
<p>7.3 ทางบริษัทขอสงวนสิทธิ์ในการเรียกเก็บค่าทวงถาม ครั้งละ 500 บาท หากเจ้าของโครงการชำระค่าบริการล่าช้ากว่าวันที่ 15 ของทุกเดือน</p>
<p>7.4 ระงับการให้บริการและสิทธิการเข้าถึงข้อมูล จนกว่าจะมีการชำระค่าบริการทั้งหมด (รวมถึงดอกเบี้ย)</p>
<p>7.5 หากมีการผิดนัดชำระค่าบริการจนเป็นเหตุทำให้ฝ่ายบริหารจัดการต้องระงับการให้บริการ และปิดระบบ หากภายหลังมีการดำเนินการและตั้งค่าระบบใหม่ เจ้าของโครงการจะต้องชำระค่าติดตั้งระบบใหม่มูลค่าไม่น้อยกว่า 7,000 บาท</p>
<p>7.6 หากทำการผิดต่อหน้าที่ของคู่สัญญา ที่ระบุอยู่ในข้อ 3 ของเอกสารข้อตกลงนี้ ให้อีกฝ่ายสามารถบอกยกเลิกสัญญา และต้องชดใช้ค่าเสียหายหรือค่าปรับตามที่ระบุไว้ในเอกสารสัญญาหลัก</p>`;

const DURATION_CLAUSES = `<p>2.1 สัญญานี้กำหนดระยะเวลา {{contract.duration_months}} เดือน</p>
<p>2.1.1 การมีผลผูกพัน : สัญญานี้มีผลผูกพันและมีผลบังคับใช้นับแต่วันที่ลงนามตามที่ระบุในข้อ 1.4 เพื่อให้ฝ่ายบริหารจัดการมีสิทธิ์เข้าดำเนินการและเตรียมความพร้อมในระยะตั้งค่าที่ระบุในข้อ 1.6</p>
<p>2.1.2 การนับระยะเวลาและการคิดค่าบริการ : การคำนวณค่าบริการให้เริ่มนับจาก วันเริ่มให้บริการตามที่ระบุในข้อ 1.5 โดยฝ่ายบริหารจัดการจะยืนยันวันดังกล่าวเป็นลายลักษณ์อักษรผ่านอีเมลของฝ่ายบริหารจัดการภายหลังการประชุมเสร็จสิ้น</p>
<p>2.2 กรณีสัญญาฉบับนี้ครบกำหนด เจ้าของโครงการหากประสงค์ให้ฝ่ายบริหารจัดการเข้าบริหารกิจการต่อไป เจ้าของโครงการสามารถให้สิทธิ์แก่ฝ่ายบริหารจัดการ ที่จะแจ้งต่อสัญญาไปได้อีก 12 เดือน โดยเงื่อนไขสัญญาฉบับใหม่เป็นไปตามที่บริษัทกำหนด</p>`;

const HEADER_AND_PARTIES = (title: string) => `<div class="ct-header">
<div class="ct-header-left"><h2>${title}</h2><p>ข้อตกลงในการใช้บริการ</p><p>ระหว่าง</p></div>
<div class="ct-header-right"><p>ข้อตกลงนี้ทำขึ้นที่ บริษัท พักดีพลัส จำกัด</p><p>เลขที่ 92/5 ชั้นสอง ห้อง 208 อาคารสาธรธานี 2</p><p>ถนนสาทรเหนือ แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500</p></div>
</div>
<p>(1) บริษัท พักดีพลัส จำกัด เลขที่ 92/5 ชั้น 2 ห้อง 208 อาคารสาธรธานี 2 ถนนสาทรเหนือ สีลม บางรัก กรุงเทพมหานคร 10500 ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า "ฝ่ายบริหารจัดการ"</p>
<p>(2) {{customer.legal_name}} {{customer.address_full}} ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า "เจ้าของโครงการ"</p>`;

const LIABILITY_EXCLUSION = `<p>เอกสารสัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน</p>`;

const TERMINATION_EFFECT = `<p>การสิ้นสุดหรือสัญญาที่หมดอายุ จะไม่มีผลกระทบต่อสิทธิ์ การแก้ไขปัญหา หรือความรับผิดชอบในหนี้สินของคู่สัญญาที่เกิดขึ้น และยังรวมถึงสิทธิ์ในการเรียกร้องค่าเสียหายจากการฝ่าฝืนข้อตกลงที่มีอยู่ในสัญญา</p>`;

const ormContractSections = (): TemplateSection[] => [
  s("header_parties", "หัวสัญญา + คู่สัญญา", "locked", HEADER_AND_PARTIES("สัญญาบริหารกิจการห้องพักรายเดือน")),
  s("definitions", "1. คำนิยาม", "structured", `<ConditionalBlockPlaceholder group="definitions" />`, "definitions"),
  s("duration", "2. วันเริ่มต้น และระยะเวลา", "locked", DURATION_CLAUSES),
  s(
    "duties",
    "3. หน้าที่ของคู่สัญญา",
    "structured",
    `<ConditionalBlockPlaceholder group="scope_of_work" />\n<SignatureBlock />`,
    "scope_of_work",
  ),
  s(
    "fees",
    "4. ค่าบริการ, การชำระ, และระยะเวลา",
    "structured",
    `<p>4.1 ค่า One Time Service เป็นจำนวนเงิน {{sku.setup_fee | thb}} บาท ({{sku.setup_fee | thb_thai_words}}) โดยเจ้าของโครงการต้องชำระเงินภายใน 3 วันนับจากวันที่ลงนามในสัญญา</p>
<p>4.2 ค่าบริการจัดการห้องพักรายเดือน เป็นจำนวนเงิน {{sku.monthly_fee | thb}} บาท ({{sku.monthly_fee | thb_thai_words}}) ต่อเดือน + ค่าคอมมิชชั่นจากยอดขาย {{sku.commission_rate | pct}} จากยอดจองห้องพักที่เกิดขึ้นจริงในแต่ละเดือน</p>
<p>{{contract.addon_lines_display}}</p>
<p>4.3 เจ้าของโครงการมีหน้าที่ในการชำระค่าบริการที่ระบุในข้อ 4.2 ให้แก่ฝ่ายบริหารจัดการภายในทุกวันที่ 15 ของเดือนถัดไปโดยการโอนเข้าบัญชีเลขที่ {{payment.bank_account_no}} ธนาคาร{{payment.bank_name}} ชื่อบัญชี {{payment.bank_account_name}}</p>
<p>4.4 การรายงานยอดขายและใบแจ้งหนี้ : ฝ่ายบริหารจัดการจะจัดส่งรายงานยอดขายรายเดือน พร้อมใบแจ้งหนี้ให้แก่เจ้าของโครงการ ภายในวันที่ 5 ของเดือนถัดไป โดยส่งผ่านทางอีเมลของเจ้าของโครงการที่ระบุไว้ในสัญญาฉบับนี้ เจ้าของโครงการมีหน้าที่ตรวจสอบใบแจ้งหนี้และแจ้งข้อโต้แย้ง (หากมี) เป็นลายลักษณ์อักษรภายใน 5 วันทำการนับจากวันที่ได้รับใบแจ้งหนี้ หากไม่มีการโต้แย้งภายในระยะเวลาดังกล่าว ถือว่าเจ้าของโครงการยอมรับความถูกต้องของใบแจ้งหนี้</p>
<p>4.5 ในกรณีที่เจ้าของโครงการชำระค่าบริการล่าช้ากว่ากำหนดในข้อ 4.3 เจ้าของโครงการยินยอมชำระเบี้ยปรับให้แก่ฝ่ายบริหารจัดการในอัตรา {{contract.late_penalty_amount | thb}} บาท ({{contract.late_penalty_amount | thb_thai_words}}) ต่อวัน จนกว่าจะชำระเสร็จสิ้น</p>`,
  ),
  s(
    "termination",
    "5. การสิ้นสุดของสัญญา",
    "structured",
    `<ConditionalBlockPlaceholder group="owner_asset_termination_notice" />\n<ConditionalBlockPlaceholder group="owner_asset_termination_list" />`,
    "owner_asset_termination_list",
  ),
  s("termination_effect", "6. ผลของการสิ้นสุด", "locked", TERMINATION_EFFECT),
  s(
    "default",
    "7. การผิดนัดชำระ, การยกเลิกสัญญาก่อนครบกำหนด",
    "locked",
    `<p>ในกรณีเจ้าของโครงการกระทำการยกเลิกสัญญาก่อนครบกำหนดอายุจะมีการเรียกค่าปรับจำนวน {{sku.monthly_fee | thb}} บาท ({{sku.monthly_fee | thb_thai_words}}) หรือในกรณีที่เจ้าของโครงการผิดนัดชำระค่าบริการตามที่ระบุในสัญญาฉบับนี้ ทางบริษัทจะดำเนินการอย่างใดอย่างหนึ่ง หรือ มากกว่า ตามข้อกำหนดที่ระบุไว้ ดังนี้</p>\n${DEFAULT_CLAUSES}`,
  ),
  s(
    "start_calc",
    "8. วันที่เริ่มคำนวนค่าบริการ",
    "locked",
    `<p>การคำนวณค่าบริการจะเริ่มต้นในวันที่ฝ่ายบริหารจัดการดำเนินการติดตั้งระบบและเริ่มให้บริการ ตามที่ระบุในข้อ 1.5 ของสัญญานี้</p>\n<SignatureBlock />`,
  ),
  s(
    "liability",
    "9. ขอบเขตการรับผิดชอบ",
    "locked",
    `<p>9.1 ฝ่ายบริหารจัดการรับผิดชอบเฉพาะการดำเนินการภายใต้ขอบเขตของบริการที่ระบุในสัญญาฉบับนี้เท่านั้น</p>
<p>9.2 ฝ่ายบริหารจัดการไม่รับผิดชอบต่อความเสียหายทางอ้อม ความเสียหายที่เกิดจากเหตุสุดวิสัย ความเสียหายจากการกระทำหรือการละเว้นการกระทำของบุคคลที่สาม รวมถึงความเสียหายที่เกิดจากระบบ Online Travel Agent, ระบบชำระเงิน, ระบบธนาคาร, หรือระบบเทคโนโลยีอื่นๆที่อยู่นอกเหนือการควบคุมของฝ่ายบริหารจัดการ</p>
<p>9.3 ความรับผิดสูงสุดของฝ่ายบริหารจัดการต่อเจ้าของโครงการภายใต้สัญญานี้จะไม่เกินมูลค่าค่าบริการรวม 3 เดือนล่าสุดที่เจ้าของโครงการชำระให้แก่ฝ่ายบริหารจัดการ</p>`,
  ),
  s(
    "appendix_a",
    "APPENDIX A · Letter of Authorization",
    "structured",
    `<ConditionalBlockPlaceholder group="letter_of_authorization" />`,
    "letter_of_authorization",
  ),
  s(
    "appendix_b",
    "APPENDIX B · Work Proposal + Payment Condition",
    "structured",
    `<ConditionalBlockPlaceholder group="work_proposal" />\n${PAYMENT_CONDITION}\n<SignatureBlock />`,
    "work_proposal",
  ),
  s("exclusion", "ข้อยกเว้นความรับผิด", "locked", LIABILITY_EXCLUSION),
];

const marcomContractSections = (): TemplateSection[] => [
  s("header_parties", "หัวสัญญา + คู่สัญญา", "locked", HEADER_AND_PARTIES("สัญญาว่าจ้างบริหารจัดการตลาดผ่านสื่อสังคมออนไลน์")),
  s("definitions", "1. คำนิยาม", "structured", `<ConditionalBlockPlaceholder group="definitions" />`, "definitions"),
  s("duration", "2. วันเริ่มต้น และระยะเวลา", "locked", DURATION_CLAUSES),
  s(
    "duties",
    "3. หน้าที่ของคู่สัญญา",
    "structured",
    `<ConditionalBlockPlaceholder group="scope_of_work" />\n<SignatureBlock />`,
    "scope_of_work",
  ),
  s(
    "fees",
    "4. ค่าบริการ, การชำระ, และระยะเวลา",
    "structured",
    `<p>4.1 ค่าบริการจัดการด้านการตลาดออนไลน์จำนวน {{hotel.room_key}} ห้อง เป็นจำนวนเงิน {{sku.monthly_fee | thb}} บาท ({{sku.monthly_fee | thb_thai_words}}) ต่อเดือน</p>
<p>4.1.1 บริหารจัดการด้านการตลาดออนไลน์ Package Content ({{sku.channel}}) จำนวน 10 โพสต์ (Single or Album) ต่อเดือน</p>
<p>4.1.2 บริหารจัดการโฆษณา Package Ads Management ({{sku.channel}})</p>
<p>4.1.3 รวมค่าแพ็คเกจโฆษณาที่ใช้ตั้งขึ้นบนโซเชียลมีเดีย ({{sku.channel}}) แล้ว ตาม Ads KPIs ที่ฝ่ายบริหารจัดการกำหนด</p>
<p>4.1.4 รวม 1 วิดีโอ และ 1 สไลด์โชว์ จาก 1 KOL สำหรับการโพสต์เท่านั้น (จำนวนไม่หมด 2 โพสต์) ต่อเดือน แต่ยังไม่รวมค่าเดินทางและค่าที่พักของ KOL</p>
<p>4.1.5 ค่าบริหารจัดการที่ระบุในข้อที่ 4.1 ฝ่ายบริหารจัดการจะจัดส่งใบแจ้งหนี้ตามที่ระบุในข้อที่ 4.2</p>
<p>4.2 เจ้าของโครงการมีหน้าที่ชำระค่าบริการ ที่ระบุในข้อที่ 4.1 ภายในทุกวันที่ 15 ของเดือนโดยนำเข้าบัญชีเลขที่ {{payment.bank_account_no}} ธนาคาร{{payment.bank_name}} โดยฝ่ายบริหารจัดการจะจัดส่งใบแจ้งหนี้ให้เจ้าของโครงการทุกวันที่ 5 ของเดือน</p>`,
  ),
  s(
    "termination",
    "5. การสิ้นสุดของสัญญา",
    "locked",
    `<p>เมื่อครบกำหนดตามอายุสัญญานี้แล้ว และหลังจากนั้นจะมีผลใช้ต่อไปจนกระทั่งผู้ทำสัญญาฝ่ายใดฝ่ายหนึ่งบอกเลิก โดยให้มีการแจ้งให้ทราบล่วงหน้าอย่างน้อย 30 วัน เป็นลายลักษณ์อักษรเท่านั้น เพื่อเป็นหลักฐานความประสงค์สำหรับการบอกเลิกสัญญา พร้อมระบุวันที่ต้องการสิ้นสุดสัญญา โดยฝ่ายบริหารจัดการจะขอสงวนสิทธิ์ในการคิดค่าบริการ และนำออก H+ Asset ทั้งหมด ภายใน 48 ชั่วโมง หลังวันสิ้นสุดสัญญา</p>
<p>เมื่อสิ้นสุดสัญญา ฝ่ายบริหารจัดการ จะส่งมอบ Owner Asset อันได้แก่ อีเมลของเจ้าของโครงการ บัญชีผู้ใช้งาน รหัสผ่านเพจ Facebook, Instagram หลักของโรงแรม คืนให้แก่เจ้าของโครงการภายใน 48 ชั่วโมง หลังจากได้รับชำระ ค่าบริการ ค่าธรรมเนียมการขาย ค่าปรับ หรือค่าใช้จ่ายอื่นๆทั้งหมด จากทางเจ้าของโครงการเรียบร้อยแล้ว</p>`,
  ),
  s("termination_effect", "6. ผลของการสิ้นสุด", "locked", TERMINATION_EFFECT),
  s(
    "default",
    "7. การผิดนัดชำระ, การยกเลิกสัญญาก่อนครบกำหนด",
    "locked",
    `<p>ในกรณีเจ้าของโครงการกระทำการยกเลิกสัญญาก่อนครบกำหนดอายุจะมีการเรียกค่าปรับจำนวน {{sku.monthly_fee | thb}} บาท</p>
<p>หรือในกรณีที่เจ้าของโครงการผิดนัดชำระค่าบริการตามที่ระบุในสัญญาฉบับนี้ ทางบริษัทจะดำเนินการอย่างใดอย่างหนึ่ง หรือ มากกว่า ตามข้อกำหนดที่ระบุไว้ ดังนี้</p>\n${DEFAULT_CLAUSES}\n<SignatureBlock />`,
  ),
  s(
    "appendix_a",
    "APPENDIX A · Letter of Authorization",
    "structured",
    `<ConditionalBlockPlaceholder group="letter_of_authorization" />`,
    "letter_of_authorization",
  ),
  s(
    "appendix_b",
    "APPENDIX B · Work Proposal + Payment Condition",
    "structured",
    `<ConditionalBlockPlaceholder group="work_proposal" />\n${PAYMENT_CONDITION}\n<SignatureBlock />`,
    "work_proposal",
  ),
  s("exclusion", "ข้อยกเว้นความรับผิด", "locked", LIABILITY_EXCLUSION),
];


const sectionsToBody = (sections: TemplateSection[]) =>
  sections
    .map((sec) => `<section data-section="${sec.id}" data-lock="${sec.lock_mode}">\n<h3>${sec.title}</h3>\n${sec.content}\n</section>`)
    .join("\n");

function seedTemplates(): Template[] {
  const t = (
    template_id: string,
    template_type: TemplateType,
    name: string,
    opts: Partial<Template> & { versions: TemplateVersion[]; active_version_id: string },
  ): Template => ({
    template_id,
    template_type,
    name,
    description: null,
    mapped_skus: [],
    quote_type: null,
    service_line: null,
    sections: [],
    superseded: false,
    docs_generated: 0,
    created_at: "2026-05-01T00:00:00+07:00",
    created_by: PS_USER,
    ...opts,
  });

  const ormSections = ormContractSections();
  const marcomSections = marcomContractSections();

  return [
    t("TPL-Q-ORM", "quote", "ORM Quote (4-package comparison)", {
      description: "Renders 4 pricing package comparison for ORM customer",
      quote_type: "ORM",
      service_line: "ORM",
      docs_generated: 148,
      active_version_id: "TPL-Q-ORM@v3.1",
      versions: [
        v("TPL-Q-ORM", "v3.2", "draft", QUOTE_ORM_DRAFT, "Added: {{quote.created_by.email}}, {{page.total}}"),
        v("TPL-Q-ORM", "v3.1", "active", QUOTE_ORM_BODY, "Fixed: commission_rate formatting", "2026-07-15T00:00:00+07:00"),
        v("TPL-Q-ORM", "v3.0", "archived", QUOTE_ORM_BODY, "Major: 4-package comparison layout"),
      ],
    }),
    t("TPL-Q-MARCOM", "quote", "Marcom Quote (line items summary)", {
      quote_type: "MARCOM",
      service_line: "MARCOM",
      docs_generated: 96,
      active_version_id: "TPL-Q-MARCOM@v2.4",
      versions: [v("TPL-Q-MARCOM", "v2.4", "active", QUOTE_MARCOM_BODY, "Line item summary layout", "2026-06-20T00:00:00+07:00")],
    }),
    t("TPL-C-ORM", "contract", "ORM Service Contract (Full/Lite unified)", {
      description: "Layer 2 · 17 sections · commission section included",
      mapped_skus: ["ORM-MTH-FULL", "ORM-MTH-LITE"],
      service_line: "ORM",
      sections: ormSections,
      max_section: 9,
      docs_generated: 59,
      active_version_id: "TPL-C-ORM@v3.1",
      versions: [v("TPL-C-ORM", "v3.1", "active", sectionsToBody(ormSections), "โครงสัญญาจริง §1-9 + ภาคผนวก ก/ข", "2026-09-18T00:00:00+07:00")],
    }),
    t("TPL-C-MARCOM", "contract", "Marcom Service Contract (Full/Lite unified · no commission)", {
      description: "โครงสัญญาจริง §1-7 · ไม่มี §4.2 Commission",
      mapped_skus: ["MARCOM-MTH-META", "MARCOM-MTH-META-LITE", "MARCOM-MTH-TIKTOK", "MARCOM-MTH-TIKTOK-LITE", "MARCOM-MTH-GMB"],
      service_line: "MARCOM",
      sections: marcomSections,
      max_section: 7,
      docs_generated: 23,
      active_version_id: "TPL-C-MARCOM@v1.1",
      versions: [v("TPL-C-MARCOM", "v1.1", "active", sectionsToBody(marcomSections), "โครงสัญญาจริง §1-7 + ภาคผนวก ก/ข", "2026-09-18T00:00:00+07:00")],
    }),
    /* v2.1 Path A · Phase 1.1 — TPL-C-ORM-FULL / TPL-C-ORM-LITE / TPL-C-MARCOM-META
     * hard-deleted. Issued contracts keep their own snapshot (template code +
     * version stored as strings on the signing package), so history stays readable. */

  ];
}

/** Demo package codes (§8 seed) */
export const DEMO_PACKAGE_CODES = [
  "E024/ORM-MTH-FULL/6M/2026-08-22/00003",
  "E024/ORM-MTH-LITE/1M/2026-09-14/00157",
  "E001/MARCOM-MTH-META/12M/2026-09-14/00158",
  "E015/MARCOM-MTH-TIKTOK-LITE/3M/2026-09-14/00892",
];

/* ---------------- store ---------------- */

const KEY = "meridia.ps.templates.v2_1a";
const ADMIN_KEY = "meridia.ps.templates.legal_admin";

export type MissingBlock = { block_group: string; condition: string };

type Ctx = {
  hydrated: boolean;
  templates: Template[];
  isLegalAdmin: boolean;
  setLegalAdmin: (v: boolean) => void;
  activeVersion: (t: Template) => TemplateVersion | undefined;
  draftVersion: (t: Template) => TemplateVersion | undefined;
  saveDraft: (templateId: string, body: string, changelog?: string) => void;
  activateDraft: (templateId: string) => { ok: boolean; unknown: string[] };
  /** R7 — locked sections refuse edits from non Legal Admin */
  saveSection: (templateId: string, sectionId: string, content: string) => { ok: boolean; error?: string };
  setLockMode: (templateId: string, sectionId: string, mode: LockMode) => { ok: boolean; error?: string };
  /** R8 gap report used by the warning banner */
  missingConditionalBlocks: (t: Template) => MissingBlock[];
  /** package code + atomic-ish daily counter */
  counter: DailySequenceCounter;
  generatePackageCode: (input: { sku_id: string; duration_months: number; employee_code?: string }) => {
    package_code: string;
    daily_sequence: number;
    generated_at: string;
  };
  resetTemplates: () => void;
};

const PsTplCtx = createContext<Ctx | null>(null);

const nextLabel = (labels: string[]) => {
  const nums = labels.map((l) => {
    const [maj, min] = l.replace(/^v/, "").split(".");
    return Number(maj ?? 0) * 100 + Number(min ?? 0);
  });
  const top = Math.max(0, ...nums) + 1;
  return `v${Math.floor(top / 100)}.${top % 100}`;
};

export function PsTemplateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLegalAdmin, setIsLegalAdmin] = useState(false);
  const [counter, setCounter] = useState<DailySequenceCounter>({ date: bangkokToday(), last_sequence: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setTemplates(raw ? (JSON.parse(raw) as Template[]) : seedTemplates());
    } catch {
      setTemplates(seedTemplates());
    }
    setIsLegalAdmin(localStorage.getItem(ADMIN_KEY) === "1");
    setCounter(readCounter());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(templates));
  }, [hydrated, templates]);

  const setLegalAdmin = useCallback((v: boolean) => {
    setIsLegalAdmin(v);
    localStorage.setItem(ADMIN_KEY, v ? "1" : "0");
  }, []);

  const activeVersion = useCallback(
    (t: Template) => t.versions.find((x) => x.version_id === t.active_version_id) ?? t.versions.find((x) => x.status === "active"),
    [],
  );
  const draftVersion = useCallback((t: Template) => t.versions.find((x) => x.status === "draft"), []);

  const saveDraft = useCallback((templateId: string, body: string, changelog?: string) => {
    const now = new Date().toISOString();
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.template_id !== templateId) return t;
        const existing = t.versions.find((x) => x.status === "draft");
        if (existing)
          return {
            ...t,
            versions: t.versions.map((x) =>
              x.status === "draft"
                ? { ...x, body, auto_fields_used: parsePlaceholders(body), changelog: changelog ?? x.changelog }
                : x,
            ),
          };
        const label = nextLabel(t.versions.map((x) => x.version_label));
        const draft: TemplateVersion = {
          version_id: `${t.template_id}@${label}`,
          version_label: label,
          status: "draft",
          body,
          auto_fields_used: parsePlaceholders(body),
          activated_at: null,
          activated_by: null,
          archived_at: null,
          changelog: changelog ?? "แก้ไขจาก editor",
          created_at: now,
          created_by: PS_USER,
        };
        return { ...t, versions: [draft, ...t.versions] };
      }),
    );
  }, []);

  const activateDraft = useCallback(
    (templateId: string) => {
      const t = templates.find((x) => x.template_id === templateId);
      const draft = t?.versions.find((x) => x.status === "draft");
      if (!t || !draft) return { ok: false, unknown: [] };
      const unknown = unknownPlaceholders(draft.body);
      if (unknown.length) return { ok: false, unknown };
      const now = new Date().toISOString();
      setTemplates((prev) =>
        prev.map((x) =>
          x.template_id !== templateId
            ? x
            : {
                ...x,
                active_version_id: draft.version_id,
                versions: x.versions.map((ver) =>
                  ver.version_id === draft.version_id
                    ? { ...ver, status: "active" as VersionStatus, activated_at: now, activated_by: PS_USER }
                    : ver.status === "active"
                      ? { ...ver, status: "archived" as VersionStatus, archived_at: now }
                      : ver,
                ),
              },
        ),
      );
      return { ok: true, unknown: [] };
    },
    [templates],
  );

  const saveSection = useCallback(
    (templateId: string, sectionId: string, content: string) => {
      const tpl = templates.find((t) => t.template_id === templateId);
      const sec = tpl?.sections.find((x) => x.id === sectionId);
      if (!tpl || !sec) return { ok: false, error: "ไม่พบ section" };
      if (sec.lock_mode === "locked" && !isLegalAdmin)
        return { ok: false, error: "Section is locked · request Legal Admin" };
      setTemplates((prev) =>
        prev.map((t) =>
          t.template_id !== templateId
            ? t
            : { ...t, sections: t.sections.map((x) => (x.id === sectionId ? { ...x, content } : x)) },
        ),
      );
      return { ok: true };
    },
    [templates, isLegalAdmin],
  );

  const setLockMode = useCallback(
    (templateId: string, sectionId: string, mode: LockMode) => {
      if (!isLegalAdmin) return { ok: false, error: "เฉพาะ Legal Admin เท่านั้นที่เปลี่ยน lock mode ได้" };
      setTemplates((prev) =>
        prev.map((t) =>
          t.template_id !== templateId
            ? t
            : { ...t, sections: t.sections.map((x) => (x.id === sectionId ? { ...x, lock_mode: mode } : x)) },
        ),
      );
      return { ok: true };
    },
    [isLegalAdmin],
  );

  const missingConditionalBlocks = useCallback((t: Template): MissingBlock[] => {
    const out: MissingBlock[] = [];
    const groups = [...new Set(t.sections.flatMap((sec) => (sec.uses_conditional_block ? [sec.uses_conditional_block] : [])))];
    for (const g of groups) {
      const source = BLOCK_GROUPS.find((b) => b.block_group === g)?.condition_source ?? "sku_id";
      const conditions =
        source === "customer.type" ? ["individual", "juristic"] : t.mapped_skus;
      for (const cond of conditions) {
        const ctx: BlockContext =
          source === "customer.type"
            ? { customer_type: cond as "individual" | "juristic" }
            : { sku_id: cond, sku_tier: tierOfSku(cond) };
        if (!resolveConditionalBlock(g, ctx).ok) out.push({ block_group: g, condition: cond });
      }
    }
    return out;
  }, []);

  const generatePackageCode = useCallback(
    (input: { sku_id: string; duration_months: number; employee_code?: string }) => {
      const today = bangkokToday();
      const current = readCounter();
      const next: DailySequenceCounter = {
        date: today,
        last_sequence: (current.date === today ? current.last_sequence : 0) + 1,
      };
      localStorage.setItem(SEQ_KEY, JSON.stringify(next));
      setCounter(next);
      const generated_at = new Date().toISOString();
      const package_code = evaluateComputed("contract.package_code", {
        sku_id: input.sku_id,
        duration_months: input.duration_months,
        employee_code: input.employee_code ?? PS_USER_EMPLOYEE_CODE,
        generated_at: bangkokDate(),
        daily_sequence: next.last_sequence,
      });
      return { package_code, daily_sequence: next.last_sequence, generated_at };
    },
    [],
  );

  const resetTemplates = useCallback(() => setTemplates(seedTemplates()), []);

  const value = useMemo(
    () => ({
      hydrated,
      templates,
      isLegalAdmin,
      setLegalAdmin,
      activeVersion,
      draftVersion,
      saveDraft,
      activateDraft,
      saveSection,
      setLockMode,
      missingConditionalBlocks,
      counter,
      generatePackageCode,
      resetTemplates,
    }),
    [
      hydrated,
      templates,
      isLegalAdmin,
      setLegalAdmin,
      activeVersion,
      draftVersion,
      saveDraft,
      activateDraft,
      saveSection,
      setLockMode,
      missingConditionalBlocks,
      counter,
      generatePackageCode,
      resetTemplates,
    ],
  );

  return <PsTplCtx.Provider value={value}>{children}</PsTplCtx.Provider>;
}

export function usePsTemplates() {
  const ctx = useContext(PsTplCtx);
  if (!ctx) throw new Error("usePsTemplates must be used inside PsTemplateProvider");
  return ctx;
}
