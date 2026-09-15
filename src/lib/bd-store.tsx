/* BD App v2.3 — Calculator-first quote store (prototype, localStorage) */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BdQuoteType = "ORM" | "MARCOM";

export type BdStatus =
  | "draft"
  | "ready_to_send"
  | "active"
  | "follow_up"
  | "aging_15_29"
  | "aging_30_45"
  | "aging_46_60"
  | "aging_61_90"
  | "expired"
  | "approved"
  /* v2.5 — PS App Contract Wizard handoff */
  | "contract_in_progress"
  | "contract_generated";

export type ActivityLogEntry = { timestamp: string; actor: string; action: string; details?: string };

export type LineItem = {
  category: "google" | "meta" | "tiktok" | "production";
  package_name: string;
  billing: "one_time" | "monthly";
  amount: number;
  is_addon: boolean;
};

export type OrmPackage = { base_price: number | null; commission: number | null; includes: string[] };

/* v2.3 — SKU entries carry pricing + approve-modal grouping */
export type SKUEntry = {
  sku_code: string;
  product_name: string;
  billing_summary: string;
  billing_type: "monthly" | "one_time" | "commission_only";
  monthly_price: number | null;
  onetime_price: number | null;
  commission_rate: number | null;
  pricing_option_group: string | null;
  is_pricing_option: boolean;
};

export type ApprovedSnapshot = {
  approved_skus: SKUEntry[];
  rejected_skus: SKUEntry[];
  approved_monthly_total: number;
  approved_onetime_total: number;
  approved_first_month_total: number;
  approved_commission_rate: number | null;
};

export type BdQuote = {
  quote_id: string;
  type: BdQuoteType;
  hotel_name: string;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  calculator_input: {
    room_key?: number;
    occupancy?: number;
    seasons?: Record<"high" | "shoulder" | "low", { months: number; adr: number }>;
    ota_selected?: string[];
    ota_percentage?: number;
    selected_services?: Record<string, string[]>;
  };
  calculator_output: {
    packages?: Record<"lite" | "smart" | "fixed" | "performance", OrmPackage>;
    recommended_package?: "lite" | "smart" | "fixed" | "performance";
    recommended_level?: string;
    selected_items?: LineItem[];
    monthly_total?: number;
    onetime_total?: number;
    first_month_total?: number;
  };
  skus: SKUEntry[];
  pdf_url: string;
  status: BdStatus;
  expired_at: string | null;
  expired_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approved_snapshot: ApprovedSnapshot | null;
  deal_id: string | null;
  pipedrive_deal_id: string | null;
  parent_quote_id: string | null;
  revision_number: number;
  activity_log: ActivityLogEntry[];
  /* v2.4 — note with @mentions */
  note: string | null;
  note_mentions: NoteMention[];
  note_updated_at: string | null;
  note_updated_by: string | null;
  /* v2.5 — populated by PS App when the Contract Wizard runs */
  contract_codes: string[] | null;
  package_code: string | null;
  wizard_step: number | null;
  wizard_started_at: string | null;
};

export type NoteMention = { target_app: "PS" | "AC"; mentioned_at: string; acknowledged: boolean };

export type BdDeal = {
  deal_id: string;
  pipedrive_deal_id: string;
  hotel_name: string;
  room_key: number;
  contact_person: { name: string; email: string };
  linked_quote_ids: string[];
  created_by: string;
  created_at: string;
  /* v2.5 — AC-owned IDs (null until AC App issues the first invoice) */
  customer_id: string | null;
  hotel_id: string | null;
  /* v2.5 — Signing Package tracking (incremented by PS App) */
  next_package_seq: number;
  active_package_code: string | null;
  archived_package_codes: string[];
};

export const CURRENT_USER = "somchai.n@hotelplus.asia";

/* ---------------- aging (R2 / R3) ---------------- */

export const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

export function agingStatus(days: number): BdStatus {
  if (days <= 6) return "active";
  if (days <= 14) return "follow_up";
  if (days <= 29) return "aging_15_29";
  if (days <= 45) return "aging_30_45";
  if (days <= 60) return "aging_46_60";
  if (days <= 90) return "aging_61_90";
  return "expired";
}

export const statusLabel: Record<BdStatus, string> = {
  draft: "📝 Draft",
  ready_to_send: "🔗 Ready to send",
  active: "🟢 Active 1-6d",
  follow_up: "🟡 Follow-up 7-14d",
  aging_15_29: "🟠 Aging 15-29d",
  aging_30_45: "🟠 Aging 30-45d",
  aging_46_60: "🟠 Aging 46-60d",
  aging_61_90: "🔴 Aging 61-90d",
  expired: "⚫ Expired",
  approved: "✅ Approved",
  contract_in_progress: "🧙 Contract in progress",
  contract_generated: "📄 Contract generated",
};

const HANDOFF_STATUSES: BdStatus[] = ["contract_in_progress", "contract_generated"];

export const statusTone = (s: BdStatus): "muted" | "info" | "success" | "warn" | "danger" =>
  s === "approved" || s === "contract_generated"
    ? "success"
    : s === "contract_in_progress"
      ? "info"
    : s === "expired"
      ? "danger"
      : s === "draft"
        ? "muted"
        : s === "ready_to_send" || s === "active"
          ? "info"
          : s === "aging_61_90"
            ? "danger"
            : "warn";

export const normalizeHotel = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();

/* not sent yet → draft / ready_to_send depends on deal link */
const preSendStatus = (q: BdQuote): BdStatus => (q.deal_id ? "ready_to_send" : "draft");

const applyAging = (q: BdQuote): BdQuote => {
  if (q.status === "approved" || q.status === "expired" || HANDOFF_STATUSES.includes(q.status)) return q;
  if (!q.sent_at) {
    const next = preSendStatus(q);
    return next === q.status ? q : { ...q, status: next };
  }
  const d = daysSince(q.sent_at) ?? 0;
  const next = agingStatus(d);
  if (next === q.status) return q;
  if (next === "expired")
    return {
      ...q,
      status: "expired",
      expired_reason: "aging",
      expired_at: new Date().toISOString(),
      activity_log: [
        ...q.activity_log,
        { timestamp: new Date().toISOString(), actor: "system", action: "expired", details: "aging 91+ days" },
      ],
    };
  return { ...q, status: next };
};

/* ---------------- seed ---------------- */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const log = (action: string, at: string, details?: string): ActivityLogEntry => ({
  timestamp: at,
  actor: CURRENT_USER,
  action,
  ...(details ? { details } : {}),
});

const base = (
  q: Partial<BdQuote> & Pick<BdQuote, "quote_id" | "type" | "hotel_name" | "created_at">,
): BdQuote => ({
  created_by: CURRENT_USER,
  sent_at: null,
  calculator_input: {},
  calculator_output: {},
  skus: [],
  pdf_url: `/pdfs/${q.quote_id}.pdf`,
  status: "draft",
  expired_at: null,
  expired_reason: null,
  approved_at: null,
  approved_by: null,
  approved_snapshot: null,
  deal_id: null,
  pipedrive_deal_id: null,
  parent_quote_id: null,
  revision_number: 0,
  activity_log: [log("created", q.created_at)],
  note: null,
  note_mentions: [],
  note_updated_at: null,
  note_updated_by: null,
  contract_codes: null,
  package_code: null,
  wizard_step: null,
  wizard_started_at: null,
  ...q,
});

const ormPackages = {
  lite: { base_price: 3900, commission: 0.05, includes: ["Revplus+"] },
  smart: { base_price: 5600, commission: 0.1, includes: ["Revplus+", "Register OTAs"] },
  fixed: { base_price: 10600, commission: null, includes: ["Revplus+", "Register OTAs"] },
  performance: { base_price: null, commission: 0.12, includes: ["Revplus+", "Register OTAs"] },
} satisfies Record<string, OrmPackage>;

export const mockOrmOutput = (roomKey: number) => ({
  packages: ormPackages,
  recommended_package: (roomKey <= 20 ? "lite" : roomKey <= 80 ? "smart" : "fixed") as
    | "lite"
    | "smart"
    | "fixed",
  recommended_level: roomKey <= 20 ? "L2" : roomKey <= 80 ? "L3" : "L4",
});

/* ---------------- SKU mapping (mocked alongside pricing) ---------------- */

const money = (n: number) => `฿${n.toLocaleString("en-US")}`;

const SETUP_SKU: Record<string, { code: string; price: number }> = {
  "Revplus+": { code: "ORM-SETUP-REVPLUS", price: 3500 },
  "Register OTAs": { code: "ORM-SETUP-OTA", price: 5000 },
};

export function ormSkus(
  packages: Record<string, OrmPackage> | undefined,
  selected: string[],
): SKUEntry[] {
  if (!packages) return [];
  const out: SKUEntry[] = [];
  const setups = new Set<string>();
  selected.forEach((key) => {
    const pkg = packages[key];
    if (!pkg) return;
    const parts: string[] = [];
    if (pkg.base_price) parts.push(`${money(pkg.base_price)}/mo`);
    if (pkg.commission) parts.push(`${Math.round(pkg.commission * 100)}%`);
    out.push({
      sku_code: `ORM-MTH-FULL-${key.toUpperCase()}`,
      product_name: `${key.charAt(0).toUpperCase()}${key.slice(1)} Package`,
      billing_summary: parts.join(" + ") || "TBD",
      billing_type: pkg.base_price ? "monthly" : "commission_only",
      monthly_price: pkg.base_price,
      onetime_price: null,
      commission_rate: pkg.commission,
      pricing_option_group: "orm_package",
      is_pricing_option: true,
    });
    pkg.includes.forEach((i) => setups.add(i));
  });
  setups.forEach((name) => {
    const meta = SETUP_SKU[name];
    out.push({
      sku_code: meta?.code ?? `ORM-SETUP-${name.replace(/\W+/g, "").toUpperCase()}`,
      product_name: name,
      billing_summary: meta ? `${money(meta.price)} one-time` : "one-time",
      billing_type: "one_time",
      monthly_price: null,
      onetime_price: meta?.price ?? 0,
      commission_rate: null,
      pricing_option_group: null,
      is_pricing_option: false,
    });
  });
  return out;
}

export function marcomSkus(items: LineItem[]): SKUEntry[] {
  return items.map((i) => ({
    sku_code: `MKT-${i.category.toUpperCase().slice(0, 4)}-${i.package_name
      .replace(/[^A-Za-z0-9]+/g, "")
      .toUpperCase()
      .slice(0, 10)}`,
    product_name: i.package_name,
    billing_summary: i.billing === "monthly" ? `${money(i.amount)}/mo` : `${money(i.amount)} one-time`,
    billing_type: i.billing === "monthly" ? ("monthly" as const) : ("one_time" as const),
    monthly_price: i.billing === "monthly" ? i.amount : null,
    onetime_price: i.billing === "one_time" ? i.amount : null,
    commission_rate: null,
    pricing_option_group: null,
    is_pricing_option: false,
  }));
}

/* legacy/partial rows loaded from storage may miss the new SKU fields */
const normalizeSku = (s: Partial<SKUEntry> & { sku_code: string; product_name: string }): SKUEntry => ({
  billing_summary: "",
  billing_type: "one_time",
  monthly_price: null,
  onetime_price: null,
  commission_rate: null,
  pricing_option_group: null,
  is_pricing_option: false,
  ...s,
});

export const withSkus = (q: BdQuote): BdQuote => {
  const skus = q.skus?.length
    ? q.skus.map(normalizeSku)
    : q.type === "ORM"
      ? ormSkus(
          q.calculator_output.packages,
          q.calculator_output.packages ? Object.keys(q.calculator_output.packages) : [],
        )
      : marcomSkus(q.calculator_output.selected_items ?? []);
  return {
    ...q,
    skus,
    approved_snapshot: q.approved_snapshot ?? null,
    note: q.note ?? null,
    note_mentions: q.note_mentions ?? [],
    note_updated_at: q.note_updated_at ?? null,
    note_updated_by: q.note_updated_by ?? null,
    contract_codes: q.contract_codes ?? null,
    package_code: q.package_code ?? null,
    wizard_step: q.wizard_step ?? null,
    wizard_started_at: q.wizard_started_at ?? null,
  };
};

export function snapshotOf(skus: SKUEntry[], approvedCodes: string[]): ApprovedSnapshot {
  const approved = skus.filter((s) => approvedCodes.includes(s.sku_code));
  const rejected = skus.filter((s) => !approvedCodes.includes(s.sku_code));
  const monthly = approved.reduce((sum, s) => sum + (s.monthly_price ?? 0), 0);
  const onetime = approved.reduce((sum, s) => sum + (s.onetime_price ?? 0), 0);
  const commission = approved.find((s) => s.commission_rate)?.commission_rate ?? null;
  return {
    approved_skus: approved,
    rejected_skus: rejected,
    approved_monthly_total: monthly,
    approved_onetime_total: onetime,
    approved_first_month_total: monthly + onetime,
    approved_commission_rate: commission,
  };
}

function seedQuotes(): BdQuote[] {
  return [
    base({
      quote_id: "Q-ORM-0301",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(1),
      status: "draft",
      calculator_input: { room_key: 9, occupancy: 40 },
      calculator_output: { packages: ormPackages, recommended_package: "fixed", recommended_level: "L4" },
      skus: ormSkus(ormPackages, ["fixed"]),
    }),
    base({
      quote_id: "Q-ORM-0287",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(7),
      status: "ready_to_send",
      calculator_input: {
        room_key: 9,
        occupancy: 40,
        seasons: {
          high: { months: 3, adr: 1900 },
          shoulder: { months: 7, adr: 1500 },
          low: { months: 2, adr: 1300 },
        },
        ota_selected: ["Agoda", "Booking.com", "Trip.com", "Expedia", "Traveloka"],
        ota_percentage: 50,
      },
      calculator_output: { packages: ormPackages, recommended_package: "lite", recommended_level: "L2" },
      skus: ormSkus(ormPackages, ["lite", "smart", "fixed", "performance"]),
      deal_id: "D-47312",
      pipedrive_deal_id: "47312",
      activity_log: [log("created", daysAgo(7)), log("linked_to_deal", daysAgo(6), "D-47312")],
    }),
    base({
      quote_id: "Q-MARCOM-0341",
      type: "MARCOM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(7),
      status: "ready_to_send",
      calculator_input: { selected_services: { meta: ["Social Plus", "Full Meta"], tiktok: ["KOL Basic 1"] } },
      calculator_output: {
        selected_items: [
          { category: "meta", package_name: "Social Plus", billing: "one_time", amount: 3500, is_addon: false },
          {
            category: "meta",
            package_name: "Meta Full (10 Content + KOL + Ads)",
            billing: "monthly",
            amount: 15000,
            is_addon: false,
          },
          {
            category: "tiktok",
            package_name: "TikTok Lite Basic",
            billing: "monthly",
            amount: 4000,
            is_addon: false,
          },
        ],
        monthly_total: 19000,
        onetime_total: 3500,
        first_month_total: 22500,
      },
      deal_id: "D-47312",
      pipedrive_deal_id: "47312",
      activity_log: [log("created", daysAgo(7)), log("linked_to_deal", daysAgo(6), "D-47312")],
    }),
    base({
      quote_id: "Q-ORM-0245",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(6),
      sent_at: daysAgo(4),
      status: "active",
      deal_id: "D-47298",
      pipedrive_deal_id: "47298",
      calculator_output: { packages: ormPackages, recommended_package: "lite" },
      skus: ormSkus(ormPackages, ["lite", "smart"]),
      activity_log: [log("created", daysAgo(6)), log("sent", daysAgo(4))],
    }),
    base({
      quote_id: "Q-MARCOM-0298",
      type: "MARCOM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(12),
      sent_at: daysAgo(11),
      status: "follow_up",
      deal_id: "D-47298",
      pipedrive_deal_id: "47298",
      calculator_output: {
        selected_items: [
          { category: "google", package_name: "Google Ads Managed", billing: "monthly", amount: 12000, is_addon: false },
        ],
        monthly_total: 12000,
        onetime_total: 0,
        first_month_total: 12000,
      },
      activity_log: [log("created", daysAgo(12)), log("sent", daysAgo(11))],
    }),
    base({
      quote_id: "Q-ORM-0198",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(70),
      sent_at: daysAgo(68),
      status: "aging_61_90",
      deal_id: "D-46812",
      pipedrive_deal_id: "46812",
      calculator_output: { packages: ormPackages, recommended_package: "smart" },
      skus: ormSkus(ormPackages, ["smart"]),
      activity_log: [log("created", daysAgo(70)), log("sent", daysAgo(68))],
    }),
    base({
      quote_id: "Q-ORM-0142",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(120),
      sent_at: daysAgo(118),
      status: "expired",
      expired_at: daysAgo(27),
      expired_reason: "aging",
      activity_log: [log("created", daysAgo(120)), log("sent", daysAgo(118))],
    }),
    base({
      quote_id: "Q-ORM-0302",
      type: "ORM",
      hotel_name: "Baan Talay Boutique",
      created_at: daysAgo(20),
      sent_at: daysAgo(18),
      status: "aging_15_29",
      deal_id: "D-47120",
      pipedrive_deal_id: "47120",
      calculator_input: { room_key: 42 },
      calculator_output: { packages: ormPackages, recommended_package: "smart", recommended_level: "L3" },
      skus: ormSkus(ormPackages, ["smart", "fixed"]),
      activity_log: [log("created", daysAgo(20)), log("sent", daysAgo(18))],
    }),
    base({
      quote_id: "Q-MARCOM-0355",
      type: "MARCOM",
      hotel_name: "Baan Talay Boutique",
      created_at: daysAgo(40),
      sent_at: daysAgo(38),
      status: "aging_30_45",
      calculator_output: {
        selected_items: [
          { category: "meta", package_name: "Meta Growth", billing: "monthly", amount: 25000, is_addon: false },
          { category: "production", package_name: "Photoshoot Full Day", billing: "one_time", amount: 8000, is_addon: false },
        ],
        monthly_total: 25000,
        onetime_total: 8000,
        first_month_total: 33000,
      },
      activity_log: [log("created", daysAgo(40)), log("sent", daysAgo(38))],
    }),
    /* --- v2.5 seed: PS App handoff states --- */
    base({
      quote_id: "Q-ORM-0410",
      type: "ORM",
      hotel_name: "Chaam Peumsuk",
      created_at: daysAgo(5),
      sent_at: daysAgo(5),
      status: "approved",
      approved_at: daysAgo(3),
      approved_by: CURRENT_USER,
      deal_id: "D-47512",
      pipedrive_deal_id: "47512",
      calculator_input: { room_key: 36 },
      calculator_output: { packages: ormPackages, recommended_package: "smart", recommended_level: "L3" },
      skus: ormSkus(ormPackages, ["smart", "fixed", "performance"]),
      activity_log: [log("created", daysAgo(5)), log("sent", daysAgo(5)), log("approved", daysAgo(3))],
    }),
    base({
      quote_id: "Q-ORM-0405",
      type: "ORM",
      hotel_name: "Bangkok Riverside",
      created_at: daysAgo(7),
      sent_at: daysAgo(7),
      status: "contract_in_progress",
      approved_at: daysAgo(4),
      approved_by: CURRENT_USER,
      deal_id: "D-47498",
      pipedrive_deal_id: "47498",
      wizard_step: 2,
      wizard_started_at: daysAgo(2),
      calculator_input: { room_key: 88 },
      calculator_output: { packages: ormPackages, recommended_package: "fixed", recommended_level: "L4" },
      skus: ormSkus(ormPackages, ["fixed"]),
      activity_log: [
        log("created", daysAgo(7)),
        log("sent", daysAgo(7)),
        log("approved", daysAgo(4)),
        log("contract_wizard_started", daysAgo(2), "Wizard step 2 of 5"),
      ],
    }),
    base({
      quote_id: "Q-ORM-0389",
      type: "ORM",
      hotel_name: "Hua Hin Beach Villa",
      created_at: daysAgo(14),
      sent_at: daysAgo(14),
      status: "contract_generated",
      approved_at: daysAgo(10),
      approved_by: CURRENT_USER,
      deal_id: "D-47421",
      pipedrive_deal_id: "47421",
      contract_codes: ["CT-00087-ORM-690910-01"],
      package_code: "SP-100084-01023-00087-P01-690910",
      calculator_input: { room_key: 24 },
      calculator_output: { packages: ormPackages, recommended_package: "smart", recommended_level: "L3" },
      skus: ormSkus(ormPackages, ["smart"]),
      activity_log: [
        log("created", daysAgo(14)),
        log("sent", daysAgo(14)),
        log("approved", daysAgo(10)),
        log("contract_wizard_started", daysAgo(5)),
        log("contract_generated", daysAgo(5), "CT-00087-ORM-690910-01 · Package v1"),
      ],
    }),
  ];
}

const dealBase = (d: Partial<BdDeal> & Pick<BdDeal, "deal_id" | "pipedrive_deal_id" | "hotel_name" | "room_key">): BdDeal => ({
  contact_person: { name: "ผู้ติดต่อโรงแรม", email: "contact@example.com" },
  linked_quote_ids: [],
  created_by: CURRENT_USER,
  created_at: daysAgo(6),
  customer_id: null,
  hotel_id: null,
  next_package_seq: 1,
  active_package_code: null,
  archived_package_codes: [],
  ...d,
});

const seedDeals = (): BdDeal[] => [
  dealBase({
    deal_id: "D-47312",
    pipedrive_deal_id: "47312",
    hotel_name: "Sumator Resort",
    room_key: 9,
    contact_person: { name: "คุณพิมพ์ใจ ศรีสุข", email: "pimjai@sumator.co.th" },
    linked_quote_ids: ["Q-ORM-0287", "Q-MARCOM-0341"],
  }),
  dealBase({
    deal_id: "D-47512",
    pipedrive_deal_id: "47512",
    hotel_name: "Chaam Peumsuk",
    room_key: 36,
    contact_person: { name: "คุณเปมสุข วงศ์ทอง", email: "owner@chaampeumsuk.com" },
    linked_quote_ids: ["Q-ORM-0410"],
    created_at: daysAgo(5),
  }),
  dealBase({
    deal_id: "D-47498",
    pipedrive_deal_id: "47498",
    hotel_name: "Bangkok Riverside",
    room_key: 88,
    contact_person: { name: "คุณธนพล อินทรีย์", email: "gm@bkkriverside.com" },
    linked_quote_ids: ["Q-ORM-0405"],
    created_at: daysAgo(7),
    customer_id: "01023",
    hotel_id: "00091",
    active_package_code: null,
  }),
  dealBase({
    deal_id: "D-47421",
    pipedrive_deal_id: "47421",
    hotel_name: "Hua Hin Beach Villa",
    room_key: 24,
    contact_person: { name: "คุณศิริพร ทะเลใส", email: "siriporn@hhbeachvilla.com" },
    linked_quote_ids: ["Q-ORM-0389"],
    created_at: daysAgo(14),
    customer_id: "01023",
    hotel_id: "00087",
    next_package_seq: 2,
    active_package_code: "SP-100084-01023-00087-P01-690910",
  }),
];

/* ---------------- store ---------------- */

const KEY = "meridia.bd.v25";

type Ctx = {
  hydrated: boolean;
  quotes: BdQuote[];
  deals: BdDeal[];
  createQuote: (input: {
    type: BdQuoteType;
    hotel_name: string;
    calculator_input: BdQuote["calculator_input"];
    calculator_output: BdQuote["calculator_output"];
    skus?: SKUEntry[];
    parent_quote_id?: string | null;
  }) => string;
  markSent: (quoteId: string) => void;
  saveNote: (quoteId: string, html: string, mentions: ("PS" | "AC")[]) => void;
  approveQuote: (quoteId: string, approvedSkuCodes: string[]) => string[];
  siblingsOf: (quote: BdQuote) => BdQuote[];
  createRevision: (quoteId: string) => string;
  registerDeal: (input: {
    hotel_name: string;
    room_key: number;
    pipedrive_deal_id: string;
    contact_person: { name: string; email: string };
    linked_quote_ids: string[];
    send?: boolean;
  }) => string;
  /* v2.5 — cross-app Contract Wizard events (mock event bus) */
  startWizard: (quoteId: string) => string | null;
  cancelWizard: (quoteId: string) => void;
  completeWizard: (quoteId: string, durationMonths?: number) => { contract_code: string; package_code: string } | null;
  setWizardStep: (quoteId: string, step: number) => void;
  dealHasActiveDraftPackage: (dealId: string | null) => boolean;
  resetDemo: () => void;
};

const BdCtx = createContext<Ctx | null>(null);

export function BdStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [quotes, setQuotes] = useState<BdQuote[]>([]);
  const [deals, setDeals] = useState<BdDeal[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { quotes: BdQuote[]; deals: BdDeal[] };
        setQuotes((parsed.quotes ?? []).map(withSkus).map(applyAging));
        setDeals(parsed.deals ?? []);
      } else {
        setQuotes(seedQuotes().map(withSkus).map(applyAging));
        setDeals(seedDeals());
      }
    } catch {
      setQuotes(seedQuotes().map(withSkus).map(applyAging));
      setDeals(seedDeals());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ quotes, deals }));
  }, [hydrated, quotes, deals]);

  const nextQuoteId = useCallback(
    (type: BdQuoteType) => {
      const prefix = `Q-${type}-`;
      const nums = quotes
        .filter((q) => q.quote_id.startsWith(prefix))
        .map((q) => Number(q.quote_id.slice(prefix.length).split("-")[0]))
        .filter((n) => Number.isFinite(n));
      return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
    },
    [quotes],
  );

  const createQuote: Ctx["createQuote"] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      let id = "";
      setQuotes((prev) => {
        const parent = input.parent_quote_id ? prev.find((q) => q.quote_id === input.parent_quote_id) : null;
        if (parent) {
          const rev = parent.revision_number + 1;
          const root = parent.quote_id.replace(/-R\d+$/, "");
          id = `${root}-R${rev + 1}`;
        } else {
          const prefix = `Q-${input.type}-`;
          const nums = prev
            .filter((q) => q.quote_id.startsWith(prefix))
            .map((q) => Number(q.quote_id.slice(prefix.length).split("-")[0]))
            .filter((n) => Number.isFinite(n));
          id = `${prefix}${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
        }
        const q = base({
          quote_id: id,
          type: input.type,
          hotel_name: input.hotel_name,
          created_at: now,
          status: "draft",
          calculator_input: input.calculator_input,
          calculator_output: input.calculator_output,
          skus: input.skus ?? [],
          parent_quote_id: input.parent_quote_id ?? null,
          revision_number: parent ? parent.revision_number + 1 : 0,
          activity_log: [
            log(parent ? "revised" : "created", now, parent ? `revision of ${parent.quote_id}` : undefined),
          ],
        });
        return [withSkus(q), ...prev];
      });
      return id || nextQuoteId(input.type);
    },
    [nextQuoteId],
  );

  const markSent = useCallback((quoteId: string) => {
    const now = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) =>
        q.quote_id === quoteId && !q.sent_at
          ? {
              ...q,
              sent_at: now,
              status: "active",
              activity_log: [...q.activity_log, log("sent", now, "ส่งใบเสนอราคาให้ลูกค้า")],
            }
          : q,
      ),
    );
  }, []);

  const saveNote = useCallback((quoteId: string, html: string, mentions: ("PS" | "AC")[]) => {
    const now = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) =>
        q.quote_id === quoteId
          ? {
              ...q,
              note: html,
              note_mentions: mentions.map((t) => ({ target_app: t, mentioned_at: now, acknowledged: false })),
              note_updated_at: now,
              note_updated_by: CURRENT_USER,
              activity_log: [
                ...q.activity_log,
                log(
                  "note_updated",
                  now,
                  mentions.length ? `mentioned ${mentions.map((m) => `@${m}`).join(", ")}` : "อัปเดตหมายเหตุ",
                ),
              ],
            }
          : q,
      ),
    );
  }, []);

  const siblingsOf = useCallback(
    (quote: BdQuote) =>
      quotes.filter(
        (q) =>
          q.quote_id !== quote.quote_id &&
          q.type === quote.type &&
          normalizeHotel(q.hotel_name) === normalizeHotel(quote.hotel_name) &&
          q.status !== "expired" &&
          q.status !== "approved",
      ),
    [quotes],
  );

  const approveQuote = useCallback((quoteId: string, approvedSkuCodes: string[]) => {
    const now = new Date().toISOString();
    const superseded: string[] = [];
    setQuotes((prev) => {
      const target = prev.find((q) => q.quote_id === quoteId);
      if (!target) return prev;
      return prev.map((q) => {
        if (q.quote_id === quoteId) {
          const snap = snapshotOf(q.skus, approvedSkuCodes);
          return {
            ...q,
            status: "approved" as BdStatus,
            approved_at: now,
            approved_by: CURRENT_USER,
            approved_snapshot: snap,
            activity_log: [
              ...q.activity_log,
              log(
                "approved",
                now,
                `approved ${snap.approved_skus.length} SKU · rejected ${snap.rejected_skus.length} · handed off to PS App`,
              ),
            ],
          };
        }
        const sib =
          q.type === target.type &&
          normalizeHotel(q.hotel_name) === normalizeHotel(target.hotel_name) &&
          q.status !== "expired" &&
          q.status !== "approved";
        if (!sib) return q;
        superseded.push(q.quote_id);
        return {
          ...q,
          status: "expired" as BdStatus,
          expired_at: now,
          expired_reason: `superseded_by:${quoteId}`,
          activity_log: [...q.activity_log, log("expired", now, `superseded by ${quoteId}`)],
        };
      });
    });
    return superseded;
  }, []);

  const createRevision = useCallback(
    (quoteId: string) => {
      const parent = quotes.find((q) => q.quote_id === quoteId);
      if (!parent) return "";
      return createQuote({
        type: parent.type,
        hotel_name: parent.hotel_name,
        calculator_input: parent.calculator_input,
        calculator_output: parent.calculator_output,
        skus: parent.skus,
        parent_quote_id: parent.quote_id,
      });
    },
    [quotes, createQuote],
  );

  const registerDeal: Ctx["registerDeal"] = useCallback((input) => {
    const now = new Date().toISOString();
    const dealId = `D-${input.pipedrive_deal_id || String(Math.floor(Math.random() * 90000) + 10000)}`;
    setDeals((prev) => [
      {
        deal_id: dealId,
        pipedrive_deal_id: input.pipedrive_deal_id,
        hotel_name: input.hotel_name,
        room_key: input.room_key,
        contact_person: input.contact_person,
        linked_quote_ids: input.linked_quote_ids,
        created_by: CURRENT_USER,
        created_at: now,
      },
      ...prev.filter((d) => d.deal_id !== dealId),
    ]);
    setQuotes((prev) =>
      prev.map((q) => {
        if (!input.linked_quote_ids.includes(q.quote_id)) return q;
        const linkedLog = [...q.activity_log, log("linked_to_deal", now, dealId)];
        if (!input.send)
          return {
            ...q,
            deal_id: dealId,
            pipedrive_deal_id: input.pipedrive_deal_id,
            status: q.sent_at ? q.status : ("ready_to_send" as BdStatus),
            activity_log: linkedLog,
          };
        return {
          ...q,
          deal_id: dealId,
          pipedrive_deal_id: input.pipedrive_deal_id,
          sent_at: q.sent_at ?? now,
          status: q.sent_at ? q.status : ("active" as BdStatus),
          activity_log: [
            ...linkedLog,
            log("sent", now, `sent via Register Deal → ${input.contact_person.email}`),
          ],
        };
      }),
    );
    return dealId;
  }, []);

  /* ---------------- v2.5 · PS App wizard event bus (mock) ---------------- */

  const dealHasActiveDraftPackage = useCallback(
    (dealId: string | null) => {
      if (!dealId) return false;
      return quotes.some((q) => q.deal_id === dealId && q.status === "contract_in_progress");
    },
    [quotes],
  );

  const startWizard = useCallback((quoteId: string) => {
    const now = new Date().toISOString();
    let dealId: string | null = null;
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.quote_id !== quoteId || q.status !== "approved") return q;
        dealId = q.deal_id;
        return {
          ...q,
          status: "contract_in_progress" as BdStatus,
          wizard_step: 1,
          wizard_started_at: now,
          activity_log: [...q.activity_log, log("contract_wizard_started", now, "Wizard step 1 of 5")],
        };
      }),
    );
    return dealId;
  }, []);

  const setWizardStep = useCallback((quoteId: string, step: number) => {
    setQuotes((prev) =>
      prev.map((q) => (q.quote_id === quoteId && q.status === "contract_in_progress" ? { ...q, wizard_step: step } : q)),
    );
  }, []);

  const cancelWizard = useCallback((quoteId: string) => {
    const now = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) =>
        q.quote_id === quoteId && q.status === "contract_in_progress"
          ? {
              ...q,
              status: "approved" as BdStatus,
              wizard_step: null,
              wizard_started_at: null,
              activity_log: [...q.activity_log, log("contract_wizard_cancelled", now, "wizard ถูกยกเลิก · quote กลับสถานะ approved")],
            }
          : q,
      ),
    );
  }, []);

  const completeWizard = useCallback(
    (quoteId: string, durationMonths = 12) => {
      const quote = quotes.find((q) => q.quote_id === quoteId);
      if (!quote) return null;
      const deal = deals.find((d) => d.deal_id === quote.deal_id);
      const now = new Date();
      const seq = deal?.next_package_seq ?? 1;
      const ymd = `${String((now.getFullYear() + 543) % 100).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const hotelId = deal?.hotel_id ?? "00000";
      const customerId = deal?.customer_id ?? "00000";
      const contractCode = `CT-${hotelId}-${quote.type}-${ymd}-${String(seq).padStart(2, "0")}`;
      const packageCode = `SP-100084-${customerId}-${hotelId}-P${String(seq).padStart(2, "0")}-${ymd}`;
      const iso = now.toISOString();

      setQuotes((prev) =>
        prev.map((q) =>
          q.quote_id === quoteId
            ? {
                ...q,
                status: "contract_generated" as BdStatus,
                wizard_step: 5,
                contract_codes: [contractCode],
                package_code: packageCode,
                activity_log: [
                  ...q.activity_log,
                  log("contract_generated", iso, `${contractCode} · Package v${seq} · ${durationMonths} เดือน`),
                ],
              }
            : q,
        ),
      );
      setDeals((prev) =>
        prev.map((d) =>
          d.deal_id === quote.deal_id
            ? {
                ...d,
                next_package_seq: (d.next_package_seq ?? 1) + 1,
                active_package_code: packageCode,
                archived_package_codes: d.active_package_code
                  ? [...(d.archived_package_codes ?? []), d.active_package_code]
                  : (d.archived_package_codes ?? []),
              }
            : d,
        ),
      );
      return { contract_code: contractCode, package_code: packageCode };
    },
    [quotes, deals],
  );

  const resetDemo = useCallback(() => {
    setQuotes(seedQuotes().map(withSkus).map(applyAging));
    setDeals(seedDeals());
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      quotes,
      deals,
      createQuote,
      markSent,
      saveNote,
      approveQuote,
      siblingsOf,
      createRevision,
      registerDeal,
      startWizard,
      cancelWizard,
      completeWizard,
      setWizardStep,
      dealHasActiveDraftPackage,
      resetDemo,
    }),
    [hydrated, quotes, deals, createQuote, markSent, saveNote, approveQuote, siblingsOf, createRevision, registerDeal, startWizard, cancelWizard, completeWizard, setWizardStep, dealHasActiveDraftPackage, resetDemo],
  );

  return <BdCtx.Provider value={value}>{children}</BdCtx.Provider>;
}

export function useBd() {
  const ctx = useContext(BdCtx);
  if (!ctx) throw new Error("useBd must be used inside BdStoreProvider");
  return ctx;
}

export const quoteValue = (q: BdQuote) => {
  if (q.approved_snapshot) return q.approved_snapshot.approved_first_month_total;
  if (q.type === "MARCOM") return q.calculator_output.first_month_total ?? q.calculator_output.monthly_total ?? 0;
  const rec = q.calculator_output.recommended_package;
  const pkg = rec ? q.calculator_output.packages?.[rec] : undefined;
  return pkg?.base_price ?? 0;
};

export const packageLabel = (q: BdQuote) => {
  if (q.type === "MARCOM") {
    const items = q.calculator_output.selected_items ?? [];
    return items.length ? `${items.length} รายการ Marcom` : "Marcom package";
  }
  const rec = q.calculator_output.recommended_package;
  return rec ? `${rec.toUpperCase()}${q.calculator_output.recommended_level ? ` · ${q.calculator_output.recommended_level}` : ""}` : "—";
};
