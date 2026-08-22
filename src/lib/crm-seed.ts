/* HotelPlus CRM — demo seed (prototype only) */

import { seedProducts } from "@/lib/crm-products";
import { beYear, computeTotals } from "@/lib/crm-rules";
import type {
  Contract,
  ContractTemplate,
  Customer,
  Deal,
  Invoice,
  InvRequest,
  LiveLink,
  ProductionReport,
  Quotation,
  QuoteLine,
} from "@/lib/crm-types";

export { seedProducts };

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86_400_000));
const y = beYear();

const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
export const lastPeriod = { year: prev.getFullYear(), month: prev.getMonth() + 1 };

export const seedCustomers: Customer[] = [
  {
    customer_id: "H00147",
    legal_name: "บริษัท ชลธาร เมาน์เทนวิว จำกัด",
    type: "juristic",
    tax_id: "0105561023471",
    address: "88/12 หมู่ 4 ต.แม่แรม อ.แม่ริม จ.เชียงใหม่ 50180",
    signer_name: "คุณ สมศรี วิรุณราช",
    contact_phone: "081-234-5678",
    contact_email: "somsri@chondan.co.th",
    bank_account: "กสิกรไทย 012-3-45678-9",
    hotels: [
      { hotel_id: "HT-001", name: "Chondan Mountain View", room_key: 28, city: "เชียงใหม่", star_rating: 4 },
    ],
    created_at: daysAgo(120),
  },
  {
    customer_id: "H00148",
    legal_name: "คุณ ธันวา ศรีบูรพา",
    type: "individual",
    tax_id: "3102000512345",
    address: "45 ซ.สุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110",
    signer_name: "คุณ ธันวา ศรีบูรพา",
    contact_phone: "089-887-1122",
    contact_email: "thanwa@silverpine.com",
    hotels: [
      { hotel_id: "HT-002", name: "Silverpine Boutique", room_key: 18, city: "กรุงเทพฯ", star_rating: 3 },
    ],
    created_at: daysAgo(64),
  },
  {
    customer_id: "H00149",
    legal_name: "บริษัท บ้านอิงน้ำ รีสอร์ท จำกัด",
    type: "juristic",
    tax_id: "0125563008812",
    address: "199 หมู่ 7 ต.ริมกก อ.เมือง จ.เชียงราย 57100",
    signer_name: "คุณ กมล จันทร์เพ็ญ",
    contact_phone: "086-551-9090",
    contact_email: "kamol@baaningnam.co.th",
    hotels: [
      { hotel_id: "HT-003", name: "Baan Ing Nam Resort", room_key: 42, city: "เชียงราย", star_rating: 4 },
    ],
    created_at: daysAgo(21),
  },
];

export const seedDeals: Deal[] = [
  {
    pipedrive_deal_id: 47281,
    contact_person: "คุณ สมศรี วิรุณราช",
    hotel_name: "Chondan Mountain View",
    room_key: 28,
    status: "Negotiation",
    owner_email: "somchai.n@hotelplus.asia",
    synced_at: daysAgo(1),
    customer_id: "H00147",
  },
  {
    pipedrive_deal_id: 47289,
    contact_person: "คุณ ธันวา ศรีบูรพา",
    hotel_name: "Silverpine Boutique",
    room_key: 18,
    status: "Contract sent",
    owner_email: "nid.p@hotelplus.asia",
    synced_at: daysAgo(1),
    customer_id: "H00148",
  },
  {
    pipedrive_deal_id: 47294,
    contact_person: "คุณ กมล จันทร์เพ็ญ",
    hotel_name: "Baan Ing Nam Resort",
    room_key: 42,
    status: "Negotiation",
    owner_email: "somchai.n@hotelplus.asia",
    synced_at: daysAgo(2),
    customer_id: "H00149",
  },
  {
    pipedrive_deal_id: 47301,
    contact_person: "คุณ ปวีณา ทองแท้",
    hotel_name: "Sunset Pier Krabi",
    room_key: 63,
    status: "Qualified",
    owner_email: "nid.p@hotelplus.asia",
    synced_at: daysAgo(3),
    customer_id: null,
  },
  {
    pipedrive_deal_id: 47306,
    contact_person: "คุณ วิชัย มั่นคง",
    hotel_name: "The Nimman Loft",
    room_key: 22,
    status: "Proposal made",
    owner_email: "somchai.n@hotelplus.asia",
    synced_at: daysAgo(4),
    customer_id: null,
  },
];

export const seedTemplates: ContractTemplate[] = [
  {
    template_id: "TPL-ORM-FULL",
    name: "สัญญาบริการ ORM Full Service",
    mapped_skus: ["ORM-MTH-FULL", "ORM-SETUP-REVPLUS", "ORM-SETUP-OTA"],
    versions: [
      { version: "v3.2", effective_from: "2026-01-01", body_url: "/templates/tpl-orm-full-v3.2.pdf" },
      { version: "v3.1", effective_from: "2025-04-01", body_url: "/templates/tpl-orm-full-v3.1.pdf" },
    ],
  },
  {
    template_id: "TPL-ORM-LITE",
    name: "สัญญาบริการ ORM Lite Service",
    mapped_skus: [
      "ORM-MTH-LITE",
      "ORM-ADDON-SHOP-RATE",
      "ORM-ADDON-COMPSET",
      "ORM-ADDON-VISIBILITY",
      "ORM-ADDON-EXTRA-OTA",
      "ORM-ADDON-RESERVATION",
    ],
    versions: [
      { version: "v2.4", effective_from: "2025-10-01", body_url: "/templates/tpl-orm-lite-v2.4.pdf" },
    ],
  },
  {
    template_id: "TPL-MARCOM",
    name: "สัญญาบริการ Marketing Communication",
    mapped_skus: [
      "MARCOM-MTH-META",
      "MARCOM-MTH-META-LITE-CONTENT",
      "MARCOM-MTH-META-LITE-ADS",
      "MARCOM-ADDON-META-LITE-CONTENT4",
      "MARCOM-MTH-TIKTOK",
      "MARCOM-MTH-TIKTOK-LITE",
      "MARCOM-ADDON-TIKTOK-KOL2",
      "MARCOM-MTH-GMB",
      "MARCOM-SETUP-SOCIAL",
      "MARCOM-SETUP-GMB",
      "MARCOM-SETUP-META",
      "MARCOM-SETUP-TIKTOK",
    ],
    versions: [
      { version: "v1.8", effective_from: "2026-02-01", body_url: "/templates/tpl-marcom-v1.8.pdf" },
      { version: "v1.7", effective_from: "2025-06-01", body_url: "/templates/tpl-marcom-v1.7.pdf" },
    ],
  },
  {
    template_id: "TPL-PROD",
    name: "ใบสั่งงาน Production / One-time",
    mapped_skus: ["PROD-PHOTO-HALF", "PROD-PHOTO-FULL", "PROD-PHOTO-VDO", "PROD-DRONE"],
    versions: [
      { version: "v1.2", effective_from: "2025-08-01", body_url: "/templates/tpl-prod-v1.2.pdf" },
    ],
  },
  {
    template_id: "TPL-PP",
    name: "สัญญาที่ปรึกษา Pre-Opening / Project Planning",
    mapped_skus: [
      "PP-MARKET-SURVEY",
      "PP-CONCEPT-DESIGN",
      "PP-FIN-FEASIBILITY",
      "PP-SOP-SETUP",
      "PP-ANNUAL-BUDGET",
      "PP-OTA-SETUP",
    ],
    versions: [
      { version: "v1.0", effective_from: "2025-01-01", body_url: "/templates/tpl-pp-v1.0.pdf" },
    ],
  },
];

const line = (
  sku: string,
  pkgSku: string | null,
  qty: number,
  price: number | null,
  commission: number | null,
): QuoteLine => {
  const p = seedProducts.find((x) => x.sku === sku)!;
  return {
    line_id: `${sku}-${pkgSku ?? "base"}`,
    product_id: p.product_id,
    sku_snapshot: p.sku,
    name_snapshot: p.name_th,
    package_sku_snapshot: pkgSku,
    billing: p.billing,
    unit_price_snapshot: price,
    commission_rate_snapshot: commission,
    quantity: qty,
    amount: (price ?? 0) * qty,
    includes_snapshot: p.includes,
    line_type: p.category === "setup" ? "setup" : "fixed",
  };
};

const q1Lines = [
  line("ORM-MTH-FULL", "ORM-MTH-FULL-SMART", 1, 16000, 0.03),
  line("ORM-SETUP-REVPLUS", null, 1, 3500, null),
];
const q2Lines = [
  line("ORM-MTH-LITE", "ORM-MTH-LITE-STD", 1, 8000, 0.05),
  line("ORM-ADDON-COMPSET", null, 1, 2000, null),
  line("MARCOM-MTH-META-LITE-CONTENT", null, 1, 4000, null),
];
const q3Lines = [line("MARCOM-MTH-META-LITE-ADS", null, 1, 4000, null)];

const snap = (c: Customer) => ({
  customer_id: c.customer_id,
  legal_name: c.legal_name,
  type: c.type,
  tax_id: c.tax_id,
  address: c.address,
  signer_name: c.signer_name,
  contact_phone: c.contact_phone,
  contact_email: c.contact_email,
  hotel_name: c.hotels[0]!.name,
});

export const seedQuotations: Quotation[] = [
  {
    quote_id: `Q-${y}-0140`,
    pipedrive_deal_id: 47281,
    customer_id: "H00147",
    customer_snapshot: snap(seedCustomers[0]!),
    status: "approved",
    lines: q1Lines,
    totals: computeTotals(q1Lines, "juristic"),
    revision_of: null,
    superseded_by: null,
    approved_at: daysAgo(30),
    approved_by: "somchai.n@hotelplus.asia",
    created_at: daysAgo(34),
    created_by: "somchai.n@hotelplus.asia",
  },
  {
    quote_id: `Q-${y}-0141`,
    pipedrive_deal_id: 47294,
    customer_id: "H00149",
    customer_snapshot: null,
    status: "sent",
    lines: q2Lines,
    totals: computeTotals(q2Lines, "juristic"),
    revision_of: null,
    superseded_by: null,
    approved_at: null,
    approved_by: null,
    created_at: daysAgo(6),
    created_by: "somchai.n@hotelplus.asia",
  },
  {
    quote_id: `Q-${y}-0142`,
    pipedrive_deal_id: 47289,
    customer_id: "H00148",
    customer_snapshot: null,
    status: "draft",
    lines: q3Lines,
    totals: computeTotals(q3Lines, "individual"),
    revision_of: null,
    superseded_by: null,
    approved_at: null,
    approved_by: null,
    created_at: daysAgo(2),
    created_by: "nid.p@hotelplus.asia",
  },
];

const caseNo = `CS-${y}-0031`;

export const seedContracts: Contract[] = [
  {
    contract_id: `C-${y}-0286`,
    from_quote_id: `Q-${y}-0140`,
    customer_snapshot: snap(seedCustomers[0]!),
    template_snapshot: {
      template_id: "TPL-ORM-FULL",
      version: "v3.2",
      body_url: "/templates/tpl-orm-full-v3.2.pdf",
    },
    lines: [
      {
        line_id: "cl-1",
        sku_snapshot: "ORM-MTH-FULL",
        name_snapshot: "ORM Full Service",
        package_snapshot: "ORM-MTH-FULL-SMART",
        billing: "monthly",
        unit_price: 16000,
        commission_rate: 0.03,
        quantity: 1,
      },
      {
        line_id: "cl-2",
        sku_snapshot: "ORM-SETUP-REVPLUS",
        name_snapshot: "RevPlus+",
        package_snapshot: null,
        billing: "one_time",
        unit_price: 3500,
        commission_rate: null,
        quantity: 1,
      },
    ],
    monthly_value: 16000,
    start_date: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)).slice(0, 10),
    duration_months: 12,
    status: "inquiry_inv",
    case_number: caseNo,
    signing_type: "juristic",
    documents: ["หนังสือรับรองบริษัท", "ภ.พ.20", "บัตรประชาชนผู้มีอำนาจ", "หน้าสมุดบัญชี", "หนังสือมอบอำนาจ"],
    live_link_signed_at: null,
    created_at: daysAgo(28),
    created_by: "ps.team@hotelplus.asia",
  },
  {
    contract_id: `C-${y}-0287`,
    from_quote_id: `Q-${y}-0140`,
    customer_snapshot: snap(seedCustomers[0]!),
    template_snapshot: {
      template_id: "TPL-MARCOM",
      version: "v1.8",
      body_url: "/templates/tpl-marcom-v1.8.pdf",
    },
    lines: [
      {
        line_id: "cl-3",
        sku_snapshot: "MARCOM-MTH-META-LITE-CONTENT",
        name_snapshot: "Meta Lite — Content Posts",
        package_snapshot: null,
        billing: "monthly",
        unit_price: 4000,
        commission_rate: null,
        quantity: 1,
      },
    ],
    monthly_value: 4000,
    start_date: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)).slice(0, 10),
    duration_months: 12,
    status: "draft",
    case_number: null,
    signing_type: "juristic",
    documents: ["หนังสือรับรองบริษัท", "ภ.พ.20", "บัตรประชาชนผู้มีอำนาจ", "หน้าสมุดบัญชี", "หนังสือมอบอำนาจ"],
    live_link_signed_at: null,
    created_at: daysAgo(28),
    created_by: "ps.team@hotelplus.asia",
  },
];

export const seedReports: ProductionReport[] = [
  {
    report_id: "PR-0001",
    contract_id: `C-${y}-0286`,
    sku: "ORM-MTH-FULL",
    period_year: lastPeriod.year,
    period_month: lastPeriod.month,
    revenue_thb: 842_000,
    commission_thb: 25_260,
    uploaded_by: "ORM",
    uploaded_at: daysAgo(4),
    approved_by_hotel: true,
  },
];

const invLines = [
  {
    line_id: "il-1",
    contract_id: `C-${y}-0286`,
    sku_snapshot: "ORM-MTH-FULL",
    name_snapshot: "ORM Full Service (Smart) — ค่าบริการรายเดือน",
    line_type: "fixed" as const,
    quantity: 1,
    unit_price: 16000,
    amount: 16000,
  },
  {
    line_id: "il-2",
    contract_id: `C-${y}-0286`,
    sku_snapshot: "ORM-MTH-FULL",
    name_snapshot: "ORM Full Service (Smart) — ค่าคอมมิชชั่น",
    line_type: "commission" as const,
    quantity: 1,
    unit_price: 25_260,
    amount: 25_260,
    production_report_id: "PR-0001",
  },
];

export const seedInvoices: Invoice[] = [
  {
    invoice_id: `INV${y}776`,
    case_number: caseNo,
    contract_ids: [`C-${y}-0286`],
    customer_snapshot: snap(seedCustomers[0]!),
    billing_period_start: `${lastPeriod.year}-${String(lastPeriod.month).padStart(2, "0")}-01`,
    billing_period_end: new Date(lastPeriod.year, lastPeriod.month, 0).toISOString().slice(0, 10),
    lines: invLines,
    totals: computeTotals(invLines, "juristic"),
    status: "sent_via_live_link",
    issued_at: daysAgo(3),
    issued_by: "ac.team@hotelplus.asia",
    paid_at: null,
    created_at: daysAgo(3),
  },
];

export const seedInvRequests: InvRequest[] = [
  {
    case_number: caseNo,
    contract_ids: [`C-${y}-0286`],
    from_app: "PS",
    requested_by: "ps.team@hotelplus.asia",
    requested_at: daysAgo(5),
    status: "live_link_sent",
    invoice_id: `INV${y}776`,
  },
];

export const seedLiveLinks: LiveLink[] = [
  {
    token: "demo-link-0031",
    case_number: caseNo,
    contract_ids: [`C-${y}-0286`],
    invoice_id: `INV${y}776`,
    events: [{ type: "opened", at: daysAgo(2) }],
    signature_data_url: null,
    created_at: daysAgo(3),
  },
];
