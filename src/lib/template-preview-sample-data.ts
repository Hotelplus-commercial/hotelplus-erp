/* PS App v2.1 — Template preview sample data seed (field-registry v2.1 §8)
 * Used ONLY for editor/preview rendering. Never used at contract generation. */

export type PreviewCustomerType = "juristic" | "individual";
export type PreviewServiceLine = "ORM" | "MARCOM" | "PROD" | "PP";

export const SERVICE_LINE_LABEL: Record<PreviewServiceLine, string> = {
  ORM: "ONLINE REVENUE MANAGEMENT",
  MARCOM: "MARKETING COMMUNICATION",
  PROD: "PRODUCTION SERVICE",
  PP: "PROJECT PLANNING",
};

export const HOTELPLUS_AUTHORIZED_SIGNATORY = "นาย ปราบ เอื้อพัชรพล";

/* §8.1 base dataset */
export const TEMPLATE_PREVIEW_SAMPLE_DATA: Record<string, string> = {
  "company.legal_name": "บริษัท โฮเทลพลัส เอเชีย จำกัด",
  "company.tax_id": "0105558123456",
  "company.address": "92/5 อาคารสาธรธานี 2 ถนนสาทรเหนือ สีลม บางรัก กรุงเทพฯ 10500",
  "company.phone": "082-8989-369",
  "company.email": "info@hotelplus.asia",

  "hotel.name": "โรงแรมตัวอย่างเพลส",
  "hotel.name_en": "Sample Place Hotel",
  "hotel.address": "240/6 ถนนร่วมจิตร ตำบลชะอำ อำเภอชะอำ จังหวัดเพชรบุรี",
  "hotel.room_key": "36",

  "customer.legal_name": "บริษัท โรงแรมตัวอย่าง จำกัด",
  "customer.signer_name": "นาย สมชาย ตัวอย่าง",
  "customer.signer_name_en": "Mr. Somchai Tuayang",
  "customer.signer_title": "กรรมการผู้จัดการ",
  "customer.type": "juristic",
  "customer.tax_id": "0105558123456",
  "customer.registration_no": "0105558123456",
  "customer.registered_address": "92/5 อาคารสาธรธานี ชั้น 2 กรุงเทพฯ",

  "contract.code": "CT-00001-ORM-690101-01",
  "contract.duration_months": "12",
  "contract.renewal_months": "12",
  "contract.signed_date": "1 มกราคม 2569",
  "contract.start_date": "1 มกราคม 2569",
  "contract.monthly_fee": "฿5,600",
  "contract.setup_fee": "฿3,500",
  "contract.commission_rate": "10.00%",
  "contract.package_code": "E024/ORM-MTH-FULL-SMART/12M/2026-09-18/00003",

  "payment.bank_name": "ธนาคารกสิกรไทย",
  "payment.account_name": "บริษัท โฮเทลพลัส เอเชีย จำกัด",
  "payment.account_no": "123-4-56789-0",
  "payment.guarantee": "เงินประกัน 1 เดือน",

  "sku.channel": "Google My Business",
  "sku.product_name": "ORM Full · Smart Package",
  "sku.tier": "Full",

  "service_line.label": SERVICE_LINE_LABEL.ORM,
  "hotelplus.authorized_signatory": HOTELPLUS_AUTHORIZED_SIGNATORY,
};

/* §8.2 · switching SKU auto-updates contract code sample + SKU-derived fields */
const serviceLineOfSku = (sku: string): PreviewServiceLine =>
  sku.startsWith("MARCOM") ? "MARCOM" : sku.startsWith("PROD") ? "PROD" : sku.startsWith("PP") ? "PP" : "ORM";

const channelOfSku = (sku: string) =>
  sku.includes("META") ? "Meta (Facebook / Instagram)" : sku.includes("TIKTOK") ? "TikTok" : sku.includes("GOOGLE") ? "Google Ads" : "Google My Business";

const JURISTIC = {
  "customer.type": "juristic",
  "customer.legal_name": "บริษัท โรงแรมตัวอย่าง จำกัด",
  "customer.signer_name": "นาย สมชาย ตัวอย่าง",
  "payment.bank_name": "ธนาคารกสิกรไทย",
  "payment.account_name": "บริษัท โฮเทลพลัส เอเชีย จำกัด",
  "payment.account_no": "123-4-56789-0",
} satisfies Record<string, string>;

const INDIVIDUAL = {
  "customer.type": "individual",
  "customer.legal_name": "นาย สมชาย ตัวอย่าง",
  "customer.signer_name": "นาย สมชาย ตัวอย่าง",
  "customer.id_number": "1-2345-67890-12-3",
  "customer.address_full": "8 ตำบลศรีสุทุลไทย อำเภอชะอำ จังหวัดเพชรบุรี",
  "payment.bank_name": "ธนาคารไทยพาณิชย์",
  "payment.account_name": "นาย ปราบ เอื้อพัชรพล",
  "payment.account_no": "987-6-54321-0",
} satisfies Record<string, string>;

/* §2.8 Quote fields (v2.1 Path A · Phase 4) */
export type QuoteLineItemCategory = "MTH" | "SETUP" | "ADDON";

export type QuoteLineItem = {
  product_name: string;
  price: number;
  unit?: "%" | "THB";
  is_setup?: boolean;
  category: QuoteLineItemCategory;
};

export const QUOTE_LINE_ITEMS_SAMPLE: Record<"ORM" | "MARCOM", QuoteLineItem[]> = {
  ORM: [
    { product_name: "ค่าบริการบริหารรายได้รายเดือน (ORM Full · Smart)", price: 5600, unit: "THB", category: "MTH" },
    { product_name: "ค่าคอมมิชชั่นจากยอดขายห้องพัก", price: 10, unit: "%", category: "MTH" },
    { product_name: "ค่าติดตั้งระบบและตั้งค่าเริ่มต้น", price: 3500, unit: "THB", is_setup: true, category: "SETUP" },
    { product_name: "เชื่อมต่อ Channel Manager (โปรโมชั่นเดือนแรก)", price: 0, unit: "THB", category: "ADDON" },
  ],
  MARCOM: [
    { product_name: "ค่าบริหารจัดการการตลาดออนไลน์ (Meta Full)", price: 18000, unit: "THB", category: "MTH" },
    { product_name: "ค่าเปิดระบบและตั้งค่าเพจเริ่มต้น", price: 5000, unit: "THB", is_setup: true, category: "SETUP" },
    { product_name: "ถ่ายภาพนิ่งชุดแรก (โปรโมชั่นเดือนแรก)", price: 0, unit: "THB", category: "ADDON" },
  ],
};

const QUOTE_SAMPLE_ORM: Record<string, string> = {
  "quote.quote_id": "Q-ORM-0287",
  "quote.issue_date": "18 กันยายน 2569",
  "quote.package_name": "ORM Full · Smart Package (A + B)",
  "quote.package_description": "บริหารรายได้ห้องพักครบวงจร · ดูแลราคาและช่องทางขายทุก OTA พร้อมรายงานรายเดือน",
  "quote.first_month_total": "฿9,100",
  "quote.recurring_total": "฿5,600",
  "quote.commission_rate": "10.00%",
  "quote.created_by_email": "somchai.n@hotelplus.asia",
};

const QUOTE_SAMPLE_MARCOM: Record<string, string> = {
  "quote.quote_id": "Q-MKT-0142",
  "quote.issue_date": "18 กันยายน 2569",
  "quote.package_name": "Marcom Meta Full Package",
  "quote.package_description": "ดูแลคอนเทนต์และโฆษณาบน Facebook / Instagram 10 โพสต์ต่อเดือน พร้อมรายงานผลโฆษณา",
  "quote.first_month_total": "฿23,000",
  "quote.recurring_total": "฿18,000",
  "quote.created_by_email": "napat.p@hotelplus.asia",
};

export function sampleDataFor(opts: {
  sku?: string | null;
  customerType?: PreviewCustomerType;
  serviceLine?: PreviewServiceLine;
}): Record<string, string> {
  const sku = opts.sku ?? "ORM-MTH-FULL-SMART";
  const line = opts.serviceLine ?? serviceLineOfSku(sku);
  const customerType = opts.customerType ?? "juristic";

  return {
    ...TEMPLATE_PREVIEW_SAMPLE_DATA,
    ...(customerType === "juristic" ? JURISTIC : INDIVIDUAL),
    "service_line.label": SERVICE_LINE_LABEL[line],
    "sku.channel": channelOfSku(sku),
    "sku.product_name": sku,
    "sku.tier": /-LITE/i.test(sku) ? "Lite" : "Full",
    "contract.code": `CT-00001-${line}-690101-01`,
    "contract.package_code": `E024/${sku}/12M/2026-09-18/00003`,
  };
}

export const serviceLineOf = serviceLineOfSku;
