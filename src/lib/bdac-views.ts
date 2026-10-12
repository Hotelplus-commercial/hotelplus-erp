/* PS Dashboard · BD-AC v1.0 — read-only "v_bdac_*" views.
 * Contract Dashboard data is browser-local, so these are pure projections over the existing
 * ContractLifecycle entity (no new tables/stores). They never mutate state.
 * QA reconcile invariant: COUNT(won_at in period) should equal COUNT(New Property cards created in
 * period). Handoff keys off the deal (lifecycle id), never dedupes by hotel — a 2-service hotel
 * yields 2 New Property cards. A mismatch signals a missed auto-create. */
import type { ContractLifecycle } from "@/lib/contract-lifecycle";

/** Config stored as data (phase 1). */
export const bdacConfig = {
  bdac_cohort_anchor_stage: "APPROVED_QT" as "APPROVED_QT" | "QT_SENT",
  bdac_aging_config: {} as Record<number, number>,
};

export type BdacLine = "ORM" | "MARCOM" | null;
export type LineFilter = "ALL" | "ORM" | "MARCOM" | "NONE";
export const LINE_LABEL = (l: BdacLine) => (l === "ORM" ? "ORM" : l === "MARCOM" ? "Marcom" : "ไม่ระบุบริการ");

const DAY = 86_400_000;
export const bdacLine = (l: ContractLifecycle): BdacLine =>
  l.service_line === "ORM" ? "ORM" : l.service_line === "MARCOM" ? "MARCOM" : null;
/** Lifecycle step → display stage 6–10. */
export const displayStage = (s: number) => (s <= 6 ? 6 : s === 7 ? 7 : s === 8 ? 8 : s <= 10 ? 9 : 10);
export const STAGE_LABEL: Record<number, string> = { 6: "Approved QT", 7: "Send Contract", 8: "Contract Signed", 9: "Set up fee", 10: "Prop Info (Won)" };
export const SUBSTEP_LABEL = ["Draft", "Draft", "Request Invoice", "Create Customer ID", "Create Hotel ID", "Create Invoice", "Live Link Sent"];

export type Range = { from: number; to: number };
const inRange = (ts: string | null | undefined, r: Range) => {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return t >= r.from && t < r.to;
};
const days = (a: string, b: string | number) => Math.max(0, ((typeof b === "number" ? b : new Date(b).getTime()) - new Date(a).getTime()) / DAY);

export const filterLine = (rows: ContractLifecycle[], f: LineFilter) =>
  rows.filter((l) => f === "ALL" || (f === "NONE" ? bdacLine(l) === null : bdacLine(l) === f));

export function v_bdac_flow(rows: ContractLifecycle[], r: Range) {
  const won = rows.filter((l) => inRange(l.won_at, r));
  return {
    qt_sent: { count: null, pending_sync: true },
    approved: rows.filter((l) => inRange(l.approved_at, r)).length,
    contract_sent: rows.filter((l) => inRange(l.send_contract_at, r)).length,
    signed: rows.filter((l) => inRange(l.signed_at, r)).length,
    won: won.length,
    won_hotels: new Set(won.map((l) => l.hotel_id ?? l.hotel_name)).size,
  };
}

export function v_bdac_conversion_cohort(rows: ContractLifecycle[], r: Range) {
  const cohort = rows.filter((l) => inRange(l.approved_at, r)); // nulls skipped
  const byMonth = new Map<string, ContractLifecycle[]>();
  for (const l of cohort) {
    const k = l.approved_at!.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), l]);
  }
  const sum = (ls: ContractLifecycle[]) => ({
    cohort_size: ls.length,
    signed_count: ls.filter((l) => l.signed_at).length,
    won_count: ls.filter((l) => l.won_at).length,
    still_open_count: ls.filter((l) => !l.won_at).length,
  });
  return { total: sum(cohort), months: [...byMonth.entries()].sort().map(([month, ls]) => ({ month, ...sum(ls) })) };
}

export const v_bdac_diagnostic_bin = () => ({ rows: [] as never[], pending_sync: true });
export const v_bdac_special_deal = () => ({ rows: [] as never[], pending_sync: true });

const entryOf = (l: ContractLifecycle) => {
  const d = displayStage(l.current_stage);
  return d === 6 ? l.approved_at : d === 7 ? l.send_contract_at : d === 8 ? l.signed_at : d === 9 ? l.payment_at ?? l.signed_at && null : l.won_at;
};

export function v_bdac_stage_current(rows: ContractLifecycle[], now = Date.now()) {
  return rows.map((l) => {
    const e = entryOf(l);
    return {
      deal: l,
      stage: displayStage(l.current_stage),
      substep: displayStage(l.current_stage) === 6 ? SUBSTEP_LABEL[l.current_stage] ?? "Draft" : null,
      days_in_stage: e ? days(e, now) : null,
    };
  });
}

export function v_bdac_cycle_time(rows: ContractLifecycle[], r: Range, kind: "7_8" | "8_9") {
  return rows.flatMap((l) => {
    const [a, b] = kind === "7_8" ? [l.send_contract_at, l.signed_at] : [l.signed_at, l.payment_at];
    if (!a || !b || !inRange(b, r)) return [];
    return [{ deal_id: l.id, hotel: l.hotel_name, completed_at: b, days: days(a, b), bd_owner_id: l.bd_owner_id }];
  });
}

export function v_bdac_deal_aging(rows: ContractLifecycle[], now = Date.now()) {
  return v_bdac_stage_current(rows, now)
    .filter((x) => x.stage < 10)
    .sort((a, b) => (b.days_in_stage ?? -1) - (a.days_in_stage ?? -1));
}

export function quantiles(vals: number[]) {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo]! + (s[Math.ceil(i)]! - s[lo]!) * (i - lo);
  };
  return { median: q(0.5), q1: q(0.25), q3: q(0.75), n: s.length };
}

export const monthRange = (offset = 0): Range => {
  const d = new Date();
  return { from: new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime(), to: new Date(d.getFullYear(), d.getMonth() + offset + 1, 1).getTime() };
};
