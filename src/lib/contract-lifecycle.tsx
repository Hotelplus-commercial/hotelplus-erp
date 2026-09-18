/* PS App v2.2 · Fix 2 — Contract Lifecycle (11 stages) + audit trail.
 * Rows are auto-created from approved BD quotes; AC App and Live Link stages are
 * mocked until those integrations land, so users advance them via testing mode. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useBd, type BdQuote } from "@/lib/bd-store";

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
  hotel_id: string;
  hotel_name: string;
  customer_legal_name: string;
  service_line: "ORM" | "MARCOM" | "PROD" | "PP";
  bd_owner_id: string;
  current_stage: number;
  live_link_token: string | null;
  live_link_sent_at: string | null;
  sent_to_ac_at: string | null;
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
  contract_id: q.contract_codes?.[0] ?? null,
  hotel_id: `H-${q.quote_id.slice(-4)}`,
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
  setStage: (id: string, to: number, opts?: { manual?: boolean; notes?: string }) => void;
  sendToAc: (id: string) => void;
  resendLiveLink: (id: string) => void;
  liveLinkUrl: (l: ContractLifecycle) => string;
  historyOf: (id: string) => StageHistory[];
};

const C = createContext<Ctx | null>(null);

export function ContractLifecycleProvider({ children }: { children: ReactNode }) {
  const { quotes, hydrated: bdHydrated } = useBd();
  const [lifecycles, setLifecycles] = useState<ContractLifecycle[]>([]);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as { lifecycles: ContractLifecycle[]; history: StageHistory[] };
        setLifecycles(p.lifecycles ?? []);
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

  const value = useMemo<Ctx>(
    () => ({
      hydrated,
      lifecycles,
      history,
      historyOf: (id) => history.filter((h) => h.lifecycle_id === id),
      liveLinkUrl: (l) => `${typeof window === "undefined" ? "" : window.location.origin}/l/${l.live_link_token ?? l.quote_id}`,
      setStage: (id, to, opts) =>
        setLifecycles((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            log(l, to, opts?.manual ?? false, opts?.notes ?? null);
            return {
              ...l,
              current_stage: to,
              updated_at: new Date().toISOString(),
              live_link_token: to >= 7 ? (l.live_link_token ?? rid()) : l.live_link_token,
              live_link_sent_at: to === 7 ? new Date().toISOString() : l.live_link_sent_at,
            };
          }),
        ),
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
    [hydrated, lifecycles, history],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useContractLifecycle = () => {
  const c = useContext(C);
  if (!c) throw new Error("useContractLifecycle must be used inside ContractLifecycleProvider");
  return c;
};
