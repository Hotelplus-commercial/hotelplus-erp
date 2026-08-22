/* BD App v2.1 — Calculator-first quote store (prototype, localStorage) */
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
  | "not_sent"
  | "active"
  | "follow_up"
  | "aging_15_29"
  | "aging_30_45"
  | "aging_46_60"
  | "aging_61_90"
  | "expired"
  | "approved";

export type ActivityLogEntry = { timestamp: string; actor: string; action: string; details?: string };

export type LineItem = {
  category: "google" | "meta" | "tiktok" | "production";
  package_name: string;
  billing: "one_time" | "monthly";
  amount: number;
  is_addon: boolean;
};

export type OrmPackage = { base_price: number | null; commission: number | null; includes: string[] };

/* v2.2 — SKU entries shown on Register Deal + Quote Dashboard */
export type SKUEntry = { sku_code: string; product_name: string; billing_summary: string };

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
  pdf_url: string;
  status: BdStatus;
  expired_at: string | null;
  expired_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  deal_id: string | null;
  pipedrive_deal_id: string | null;
  parent_quote_id: string | null;
  revision_number: number;
  activity_log: ActivityLogEntry[];
};

export type BdDeal = {
  deal_id: string;
  pipedrive_deal_id: string;
  hotel_name: string;
  room_key: number;
  contact_person: { name: string; email: string };
  linked_quote_ids: string[];
  created_by: string;
  created_at: string;
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
  not_sent: "Not sent",
  active: "Active 1-6d",
  follow_up: "Follow-up 7-14d",
  aging_15_29: "Aging 15-29d",
  aging_30_45: "Aging 30-45d",
  aging_46_60: "Aging 46-60d",
  aging_61_90: "Aging 61-90d",
  expired: "Expired",
  approved: "Approved",
};

export const statusTone = (s: BdStatus): "muted" | "info" | "success" | "warn" | "danger" =>
  s === "approved"
    ? "success"
    : s === "expired"
      ? "danger"
      : s === "not_sent"
        ? "muted"
        : s === "active"
          ? "info"
          : "warn";

export const normalizeHotel = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();

const applyAging = (q: BdQuote): BdQuote => {
  if (q.status === "approved" || q.status === "expired" || !q.sent_at) return q;
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
  pdf_url: `/pdfs/${q.quote_id}.pdf`,
  status: "not_sent",
  expired_at: null,
  expired_reason: null,
  approved_at: null,
  approved_by: null,
  deal_id: null,
  pipedrive_deal_id: null,
  parent_quote_id: null,
  revision_number: 0,
  activity_log: [log("created", q.created_at)],
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

function seedQuotes(): BdQuote[] {
  return [
    base({
      quote_id: "Q-ORM-0287",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(7),
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
      deal_id: "D-47312",
      pipedrive_deal_id: "47312",
    }),
    base({
      quote_id: "Q-MARCOM-0341",
      type: "MARCOM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(7),
      calculator_input: { selected_services: { meta: ["Social Plus", "Full Meta"], tiktok: ["KOL Basic 1"] } },
      calculator_output: {
        selected_items: [
          { category: "meta", package_name: "Social Plus", billing: "one_time", amount: 3500, is_addon: false },
          {
            category: "meta",
            package_name: "Meta 10 Content + KOL Basic 1 + Ads Budget",
            billing: "monthly",
            amount: 15000,
            is_addon: false,
          },
          {
            category: "tiktok",
            package_name: "KOL Basic 1 (1 Slideshow + 1 VDO)",
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
    }),
    base({
      quote_id: "Q-ORM-0245",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(6),
      sent_at: daysAgo(4),
      status: "active",
      calculator_output: { packages: ormPackages, recommended_package: "lite" },
      activity_log: [log("created", daysAgo(6)), log("sent", daysAgo(4))],
    }),
    base({
      quote_id: "Q-MARCOM-0298",
      type: "MARCOM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(12),
      sent_at: daysAgo(11),
      status: "follow_up",
      calculator_output: { monthly_total: 12000, onetime_total: 0, first_month_total: 12000 },
      activity_log: [log("created", daysAgo(12)), log("sent", daysAgo(11))],
    }),
    base({
      quote_id: "Q-ORM-0198",
      type: "ORM",
      hotel_name: "Sumator Resort",
      created_at: daysAgo(70),
      sent_at: daysAgo(68),
      status: "aging_61_90",
      calculator_output: { packages: ormPackages, recommended_package: "smart" },
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
      quote_id: "Q-ORM-0301",
      type: "ORM",
      hotel_name: "Baan Talay Boutique",
      created_at: daysAgo(20),
      sent_at: daysAgo(18),
      status: "aging_15_29",
      calculator_output: { packages: ormPackages, recommended_package: "smart", recommended_level: "L3" },
      activity_log: [log("created", daysAgo(20)), log("sent", daysAgo(18))],
    }),
    base({
      quote_id: "Q-MARCOM-0355",
      type: "MARCOM",
      hotel_name: "Baan Talay Boutique",
      created_at: daysAgo(40),
      sent_at: daysAgo(38),
      status: "aging_30_45",
      calculator_output: { monthly_total: 25000, onetime_total: 8000, first_month_total: 33000 },
      activity_log: [log("created", daysAgo(40)), log("sent", daysAgo(38))],
    }),
  ];
}

const seedDeals = (): BdDeal[] => [
  {
    deal_id: "D-47312",
    pipedrive_deal_id: "47312",
    hotel_name: "Sumator Resort",
    room_key: 9,
    contact_person: { name: "คุณพิมพ์ใจ ศรีสุข", email: "pimjai@sumator.co.th" },
    linked_quote_ids: ["Q-ORM-0287", "Q-MARCOM-0341"],
    created_by: CURRENT_USER,
    created_at: daysAgo(6),
  },
];

/* ---------------- store ---------------- */

const KEY = "meridia.bd.v21";

type Ctx = {
  hydrated: boolean;
  quotes: BdQuote[];
  deals: BdDeal[];
  createQuote: (input: {
    type: BdQuoteType;
    hotel_name: string;
    calculator_input: BdQuote["calculator_input"];
    calculator_output: BdQuote["calculator_output"];
    parent_quote_id?: string | null;
  }) => string;
  markSent: (quoteId: string) => void;
  approveQuote: (quoteId: string) => string[];
  siblingsOf: (quote: BdQuote) => BdQuote[];
  createRevision: (quoteId: string) => string;
  registerDeal: (input: {
    hotel_name: string;
    room_key: number;
    pipedrive_deal_id: string;
    contact_person: { name: string; email: string };
    linked_quote_ids: string[];
  }) => string;
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
        setQuotes((parsed.quotes ?? []).map(applyAging));
        setDeals(parsed.deals ?? []);
      } else {
        setQuotes(seedQuotes().map(applyAging));
        setDeals(seedDeals());
      }
    } catch {
      setQuotes(seedQuotes().map(applyAging));
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
          calculator_input: input.calculator_input,
          calculator_output: input.calculator_output,
          parent_quote_id: input.parent_quote_id ?? null,
          revision_number: parent ? parent.revision_number + 1 : 0,
          activity_log: [
            log(parent ? "revised" : "created", now, parent ? `revision of ${parent.quote_id}` : undefined),
          ],
        });
        return [q, ...prev];
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

  const approveQuote = useCallback((quoteId: string) => {
    const now = new Date().toISOString();
    const superseded: string[] = [];
    setQuotes((prev) => {
      const target = prev.find((q) => q.quote_id === quoteId);
      if (!target) return prev;
      return prev.map((q) => {
        if (q.quote_id === quoteId)
          return {
            ...q,
            status: "approved" as BdStatus,
            approved_at: now,
            approved_by: CURRENT_USER,
            activity_log: [...q.activity_log, log("approved", now)],
          };
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
      prev.map((q) =>
        input.linked_quote_ids.includes(q.quote_id)
          ? {
              ...q,
              deal_id: dealId,
              pipedrive_deal_id: input.pipedrive_deal_id,
              activity_log: [...q.activity_log, log("linked_to_deal", now, dealId)],
            }
          : q,
      ),
    );
    return dealId;
  }, []);

  const resetDemo = useCallback(() => {
    setQuotes(seedQuotes().map(applyAging));
    setDeals(seedDeals());
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      quotes,
      deals,
      createQuote,
      markSent,
      approveQuote,
      siblingsOf,
      createRevision,
      registerDeal,
      resetDemo,
    }),
    [hydrated, quotes, deals, createQuote, markSent, approveQuote, siblingsOf, createRevision, registerDeal, resetDemo],
  );

  return <BdCtx.Provider value={value}>{children}</BdCtx.Provider>;
}

export function useBd() {
  const ctx = useContext(BdCtx);
  if (!ctx) throw new Error("useBd must be used inside BdStoreProvider");
  return ctx;
}

export const quoteValue = (q: BdQuote) => {
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
