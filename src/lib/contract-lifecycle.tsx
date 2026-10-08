/* PS App v2.2 · Fix 2 — Contract Lifecycle (11 stages) + audit trail.
 * Rows are auto-created from approved BD quotes; AC App and Live Link stages are
 * mocked until those integrations land, so users advance them via testing mode. */
import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";

import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServicing } from "@/lib/ps-servicing";

import { useBd, type BdQuote } from "@/lib/bd-store";
import type { PropertyCard } from "@/lib/orm-meeting";

export const STAGES = [
  { n: 1, key: "QUOTE_APPROVED", label: "Quote Approved", owner: "PS" },
  { n: 2, key: "DRAFT", label: "Draft", owner: "PS" },
  { n: 3, key: "REQUEST_INVOICE", label: "Request Invoice", owner: "PS" },
  { n: 4, key: "CREATE_CUSTOMER_ID", label: "Create Customer ID", owner: "AC" },
  { n: 5, key: "CREATE_HOTEL_ID", label: "Create Hotel ID", owner: "AC" },
  { n: 6, key: "CREATE_INVOICE", label: "Create Invoice", owner: "AC" },
  { n: 7, key: "LIVE_LINK_SENT", label: "Live Link Sent", owner: "AC" },
  { n: 8, key: "CONTRACT_SIGNED", label: "Contract Signed", owner: "LIVE" },
  { n: 9, key: "PAYMENT_COMPLETE", label: "Payment Complete", owner: "LIVE" },
  { n: 10, key: "AC_CHECKING_PAYMENT", label: "AC Checking Payment", owner: "AC" },
  { n: 11, key: "TAX_RECEIPT", label: "Tax / Receipt", owner: "AC" },
] as const;

export type StageOwner = "PS" | "AC" | "LIVE";
export const stageOf = (n: number) => STAGES.find((s) => s.n === n) ?? STAGES[0];
export const OWNER_COLOR: Record<StageOwner, string> = {
  PS: "#10B981",
  AC: "#F59E0B",
  LIVE: "#3B82F6",
};

/** Testing-mode flag — flip to false for production environments. */
export const SHOW_STAGE_OVERRIDE = true;

export type ContractLifecycle = {
  id: string;
  quote_id: string;
  contract_id: string | null;
  contract_service_line: "ORM" | "MARCOM" | "BOTH" | null;
  customer_id: string | null;
  invoice_number: string | null;
  property_name: string | null;
  hotel_id: string | null;
  hotel_name: string;
  customer_legal_name: string;
  service_line: "ORM" | "MARCOM" | "PROD" | "PP";
  bd_owner_id: string;
  current_stage: number;
  live_link_token: string | null;
  live_link_sent_at: string | null;
  sent_to_ac_at: string | null;
  /** Hand-off guard: set once the On-boarding "New Property" card exists. */
  handed_off_to_onboarding?: boolean;
  handed_off_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type StageHistory = {
  id: string;
  lifecycle_id: string;
  from_stage: number;
  to_stage: number;
  changed_by_user_id: string;
  changed_at: string;
  is_manual_override: boolean;
  notes: string | null;
};

const CURRENT_USER = "napat.p@hotelplus.asia";
const KEY = "meridia.ps.contract-lifecycle.v2_2";
const DAY = 86_400_000;

export const isExpired = (l: ContractLifecycle) =>
  l.current_stage === 8 && !!l.live_link_sent_at && Date.now() - new Date(l.live_link_sent_at).getTime() > 7 * DAY;

export const expiredDays = (l: ContractLifecycle) =>
  l.live_link_sent_at
    ? Math.max(0, Math.floor((Date.now() - new Date(l.live_link_sent_at).getTime() - 7 * DAY) / DAY))
    : 0;

const rid = () => Math.random().toString(36).slice(2, 10);

const fromQuote = (q: BdQuote, stage: number, extra: Partial<ContractLifecycle> = {}): ContractLifecycle => ({
  id: `lc-${q.quote_id}`,
  quote_id: q.quote_id,
  contract_id: null,
  contract_service_line: null,
  customer_id: null,
  invoice_number: null,
  hotel_id: null,
  property_name: null,
  hotel_name: q.hotel_name,
  customer_legal_name: `บริษัท ${q.hotel_name} จำกัด`,
  service_line: q.type === "MARCOM" ? "MARCOM" : "ORM",
  bd_owner_id: q.created_by,
  current_stage: stage,
  live_link_token: null,
  live_link_sent_at: null,
  sent_to_ac_at: null,
  created_at: q.approved_at ?? q.created_at,
  updated_at: q.approved_at ?? q.created_at,
  ...extra,
});

type Ctx = {
  hydrated: boolean;
  lifecycles: ContractLifecycle[];
  history: StageHistory[];
  setStage: (id: string, to: number, opts?: { manual?: boolean; notes?: string; identity?: Partial<Pick<ContractLifecycle, "contract_id" | "contract_service_line" | "customer_id" | "hotel_id" | "property_name" | "invoice_number">> }) => void;
  sendToAc: (id: string) => void;
  resendLiveLink: (id: string) => void;
  liveLinkUrl: (l: ContractLifecycle) => string;
  historyOf: (id: string) => StageHistory[];
  onboardingCards: PropertyCard[];
};

const C = createContext<Ctx | null>(null);

export function ContractLifecycleProvider({ children }: { children: ReactNode }) {
  const { quotes, hydrated: bdHydrated } = useBd();
  const servicing = useServicing();
  const navigate = useNavigate();
  const attempted = useRef(new Set<string>());
  const [lifecycles, setLifecycles] = useState<ContractLifecycle[]>([]);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as { lifecycles: ContractLifecycle[]; history: StageHistory[] };
        setLifecycles((p.lifecycles ?? []).map((l) => ({
          ...l,
          contract_service_line: l.contract_service_line ?? null,
          customer_id: l.customer_id ?? null,
          invoice_number: l.invoice_number ?? null,
          property_name: l.property_name ?? null,
          hotel_id: l.hotel_id ?? null,
        })));
        setHistory(p.history ?? []);
      }
    } catch {
      /* ignore corrupted local state */
    }
    setHydrated(true);
  }, []);

  /* 2.2.3 auto-populate: every approved / in-wizard / generated quote gets a row */
  useEffect(() => {
    if (!hydrated || !bdHydrated) return;
    const eligible = quotes.filter((q) =>
      ["approved", "contract_in_progress", "contract_generated"].includes(q.status),
    );
    setLifecycles((prev) => {
      const known = new Set(prev.map((l) => l.quote_id));
      const add = eligible
        .filter((q) => !known.has(q.quote_id))
        .map((q, i) => {
          const stage = q.status === "contract_generated" ? 3 : q.status === "contract_in_progress" ? 2 : 1;
          /* demo variety so the dashboard shows every ownership colour + an expired link */
          const demo =
            q.status === "contract_generated"
              ? i % 3 === 0
                ? { current_stage: 8, live_link_token: rid(), live_link_sent_at: new Date(Date.now() - 9 * DAY).toISOString() }
                : i % 3 === 1
                  ? { current_stage: 5 }
                  : { current_stage: 11, live_link_token: rid(), live_link_sent_at: new Date(Date.now() - 2 * DAY).toISOString() }
              : {};
          return fromQuote(q, stage, demo);
        });
      return add.length ? [...prev, ...add] : prev;
    });
  }, [quotes, hydrated, bdHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ lifecycles, history }));
  }, [lifecycles, history, hydrated]);

  const log = (l: ContractLifecycle, to: number, manual: boolean, notes: string | null) => {
    const entry: StageHistory = {
      id: rid(),
      lifecycle_id: l.id,
      from_stage: l.current_stage,
      to_stage: to,
      changed_by_user_id: CURRENT_USER,
      changed_at: new Date().toISOString(),
      is_manual_override: manual,
      notes,
    };
    setHistory((h) => [entry, ...h]);
    console.info("[StageHistory]", entry);
  };

  const handoff = (l: ContractLifecycle) => {
    const quote = quotes.find((q) => q.quote_id === l.quote_id);
    const hasGoogle = (quote?.calculator_output?.selected_items ?? []).some((it) => it.category === "google");
    const result = servicing.createFromContract({
      deal_id: l.id, contract_id: l.contract_id, contract_service_line: l.contract_service_line,
      hotel_id: l.hotel_id, property_name: l.property_name || l.hotel_name, assigned_ae_id: l.bd_owner_id,
      service_variant: hasGoogle ? "MARCOM_GMB" : "MARCOM_META_TIKTOK",
    });
    if (!result.ok) {
      toast("ยังสร้างการ์ด On-boarding ไม่ได้ — ขาด Contract ID / service line หรือ Hotel ID (ตั้งค่าในขั้น sub-process ก่อน)");
      return false;
    }
    if (result.created.length) {
      toast.success(`สร้างการ์ด On-boarding แล้ว: ${l.contract_service_line === "BOTH" ? "ORM และ Marcom" : l.contract_service_line === "MARCOM" ? "Marcom" : "ORM"} — ${l.property_name || l.hotel_name}`, {
        action: { label: "On-boarding Process", onClick: () => { void navigate({ to: "/ps/onboarding-process", hash: `servicing-card-${result.created[0]}` }); } },
      });
    }
    return true;
  };

  // Catch Prop Info entry from population/restoration as well as setStage, without parallel legacy writes.
  useEffect(() => {
    if (!hydrated || !servicing.hydrated) return;
    for (const l of lifecycles) {
      if (l.current_stage !== 11 || attempted.current.has(l.id)) continue;
      attempted.current.add(l.id);
      const ok = handoff(l);
      setLifecycles((prev) => prev.map((row) => row.id === l.id ? { ...row, handed_off_to_onboarding: ok, ...(ok ? { handed_off_at: row.handed_off_at ?? new Date().toISOString() } : {}) } : row));
    }
  }, [hydrated, servicing.hydrated, lifecycles]);

  const value = useMemo<Ctx>(
    () => ({
      hydrated,
      lifecycles,
      history,
      onboardingCards: lifecycles
        .filter((l) => l.handed_off_to_onboarding)
        .map<PropertyCard>((l) => ({
          id: `OB-${l.quote_id}`,
          hotel: l.hotel_name,
          stage: "new",
          daysInStage: Math.floor((Date.now() - new Date(l.handed_off_at ?? l.updated_at).getTime()) / DAY),
          slaDays: 1,
          overdue: false,
          owner: "On-boarding Specialist",
          action: "รับเรื่องโรงแรมใหม่",
          note: `จาก Contract Dashboard · ${l.quote_id}${l.contract_id ? ` · ${l.contract_id}` : ""}`,
          journeyStep: 2,
          signedDaysAgo: 0,
          rooms: 0,
          location: "—",
          roomTypes: "—",
          otas: "—",
          history: [{ at: (l.handed_off_at ?? l.updated_at).slice(0, 10), text: `Auto-created จากสัญญา ${l.quote_id} (Prop Info)` }],
        })),
      historyOf: (id) => history.filter((h) => h.lifecycle_id === id),
      liveLinkUrl: (l) => `${typeof window === "undefined" ? "" : window.location.origin}/l/${l.live_link_token ?? l.quote_id}`,
      setStage: (id, to, opts) => {
        const current = lifecycles.find((l) => l.id === id);
        if (!current) return;
        const l = { ...current, ...opts?.identity };
        const now = new Date().toISOString();
        // Visible Stage 10 Prop Info maps to lifecycle step 11; do not renumber the matrix.
        const enteringPropInfo = to === 11;
        const handedOff = enteringPropInfo ? handoff(l) : l.handed_off_to_onboarding;
        if (enteringPropInfo) attempted.current.add(id);
        log(current, to, opts?.manual ?? false, opts?.notes ?? null);
        setLifecycles((prev) => prev.map((row) => row.id !== id ? row : {
          ...row, ...opts?.identity,
          current_stage: to, updated_at: now,
          live_link_token: to >= 7 ? (row.live_link_token ?? rid()) : row.live_link_token,
          live_link_sent_at: to === 7 ? now : row.live_link_sent_at,
          ...(enteringPropInfo ? { handed_off_to_onboarding: handedOff, ...(handedOff ? { handed_off_at: row.handed_off_at ?? now } : {}) } : {}),
        }));
      },
      sendToAc: (id) =>
        setLifecycles((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            log(l, 4, false, "Send to AC (mock notification)");
            return { ...l, current_stage: 4, sent_to_ac_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          }),
        ),
      resendLiveLink: (id) =>
        setLifecycles((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            log(l, l.current_stage, false, "Resend live link · expiry reset to 7 days");
            return { ...l, live_link_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          }),
        ),
    }),
    [hydrated, lifecycles, history, servicing.createFromContract, navigate],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useContractLifecycle = () => {
  const c = useContext(C);
  if (!c) throw new Error("useContractLifecycle must be used inside ContractLifecycleProvider");
  return c;
};
