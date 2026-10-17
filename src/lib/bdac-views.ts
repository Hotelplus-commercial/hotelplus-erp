/* PS Dashboard · BD-AC v2.0 — read-only "v_bdac_*" views.
 * Contract Dashboard data is browser-local, so these are pure projections over the existing
 * ContractLifecycle entity (no new tables/stores). They never mutate state.
 * v2.0: SLA layer (bdac_sla_config), cohort re-keyed on Sent Contract month, carry list,
 * cycle time without IQR. ac_owner_id / bdac_aging_config / bdac_cohort_anchor_stage are
 * deprecated: kept for data compatibility, never read. */
import type { ContractLifecycle } from "@/lib/contract-lifecycle";
import type { L0Ticket } from "@/lib/tickets-l0";

/** Config stored as data (phase 1). */
export const bdacConfig = {
  /** @deprecated cohort is fixed to Sent Contract month — never read. */
  bdac_cohort_anchor_stage: "APPROVED_QT" as const,
  /** @deprecated replaced by bdac_sla_config — never read. */
  bdac_aging_config: {} as Record<number, number>,
  bdac_sla_config: { approved_to_sent: 2, sent_to_signed: 2, signed_to_won: 2, unit: "calendar_day" as const },
};

export type BdacLine = "ORM" | "MARCOM" | null;
export type LineFilter = "ALL" | "ORM" | "MARCOM" | "NONE";
export const LINE_LABEL = (l: BdacLine) => (l === "ORM" ? "ORM" : l === "MARCOM" ? "Marcom" : "ไม่ระบุบริการ");

const DAY = 86_400_000;
export const bdacLine = (l: ContractLifecycle): BdacLine =>
  l.service_line === "ORM" ? "ORM" : l.service_line === "MARCOM" ? "MARCOM" : null;
/** Lifecycle step → display stage 6–10 (BR1 names). */
export const displayStage = (s: number) => (s <= 6 ? 6 : s === 7 ? 7 : s === 8 ? 8 : s <= 10 ? 9 : 10);
export const STAGE_LABEL: Record<number, string> = { 6: "Approved QT", 7: "Sent Contract", 8: "Contract Signed", 9: "Set up fee", 10: "WON" };
export const SUBSTEP_LABEL = ["Draft", "Draft", "Request Invoice", "Create Customer ID", "Create Hotel ID", "Create Invoice", "Live Link Sent"];

const THAI_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const thaiShort = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${THAI_M[d.getMonth()]}`; };
export const thaiMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${THAI_M[(m ?? 1) - 1]} ${String((y ?? 0) + 543).slice(2)}`; };
const monthKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export type Range = { from: number; to: number };
const inRange = (ts: string | null | undefined, r: Range) => {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return t >= r.from && t < r.to;
};
const days = (a: string, b: string | number) => Math.max(0, ((typeof b === "number" ? b : new Date(b).getTime()) - new Date(a).getTime()) / DAY);

export const filterLine = (rows: ContractLifecycle[], f: LineFilter) =>
  rows.filter((l) => f === "ALL" || (f === "NONE" ? bdacLine(l) === null : bdacLine(l) === f));

/* ---------- SLA (§2.3) ---------- */
export type SlaTone = "ok" | "amber" | "red" | null;
export type SlaInfo = {
  stage: number; sla_days: number | null; sla_tone: SlaTone; is_on_time: boolean | null;
  sla_ref_at: string | null; sla_ref_label: string | null; limit: number | null;
};
export function bdacSla(l: ContractLifecycle, now: number): SlaInfo {
  const stage = displayStage(l.current_stage);
  const cfg = bdacConfig.bdac_sla_config;
  const leg =
    stage === 6 ? { ref: l.approved_at, label: "Approved QT", limit: cfg.approved_to_sent }
    : stage === 7 ? { ref: l.send_contract_at, label: "Sent Contract", limit: cfg.sent_to_signed }
    : stage === 8 || stage === 9 ? { ref: l.signed_at, label: "Contract Signed", limit: cfg.signed_to_won }
    : null;
  if (!leg) return { stage, sla_days: null, sla_tone: null, is_on_time: null, sla_ref_at: null, sla_ref_label: null, limit: null };
  if (!leg.ref) return { stage, sla_days: null, sla_tone: null, is_on_time: null, sla_ref_at: null, sla_ref_label: null, limit: leg.limit };
  const slaDays = Math.floor((now - new Date(leg.ref).getTime()) / DAY);
  const tone: SlaTone = slaDays < leg.limit ? "ok" : slaDays === leg.limit ? "amber" : "red";
  return { stage, sla_days: slaDays, sla_tone: tone, is_on_time: slaDays <= leg.limit, sla_ref_at: leg.ref, sla_ref_label: `${leg.label} ${thaiShort(leg.ref)}`, limit: leg.limit };
}

/* ---------- v_bdac_flow (§2.4) ---------- */
const splitOf = (ls: ContractLifecycle[]) => ({ count: ls.length, orm: ls.filter((l) => l.service_line === "ORM").length, marcom: ls.filter((l) => l.service_line === "MARCOM").length });
export function v_bdac_flow(rows: ContractLifecycle[], r: Range, prev?: Range) {
  const at = (k: "approved_at" | "send_contract_at" | "signed_at" | "payment_at" | "won_at") => rows.filter((l) => inRange(l[k], r));
  const wonRows = at("won_at");
  const prevCount = (k: "won_at" | "signed_at") => (prev ? rows.filter((l) => inRange(l[k], prev)).length : null);
  return {
    sent_qt: { count: null as number | null, pending_sync: true },
    approved: at("approved_at").length,
    contract_sent: at("send_contract_at").length,
    signed: at("signed_at").length,
    setup_fee: at("payment_at").length,
    won: wonRows.length,
    splits: { approved: splitOf(at("approved_at")), contract_sent: splitOf(at("send_contract_at")), signed: splitOf(at("signed_at")), setup_fee: splitOf(at("payment_at")), won: splitOf(wonRows) },
    won_hotels: new Set(wonRows.map((l) => l.hotel_id ?? l.hotel_name)).size,
    prev_won: prevCount("won_at"),
    prev_signed: prevCount("signed_at"),
  };
}

/* ---------- v_bdac_conversion_cohort — keyed on Sent Contract month (§2.4) ---------- */
export type CohortMonth = { month: string; size: number; won: number; open_current: number; carry: number; orm_won: number; marcom_won: number };
export function v_bdac_conversion_cohort(rows: ContractLifecycle[], now = Date.now()): CohortMonth[] {
  const cur = monthKey(now);
  const out: CohortMonth[] = [];
  const d = new Date(now);
  for (let i = 5; i >= 0; i--) {
    const key = monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1).getTime());
    const sent = rows.filter((l) => l.send_contract_at?.slice(0, 7) === key);
    const won = sent.filter((l) => l.won_at);
    const open = sent.length - won.length;
    out.push({
      month: key, size: sent.length, won: won.length,
      open_current: key === cur ? open : 0,
      carry: key === cur ? 0 : open,
      orm_won: won.filter((l) => l.service_line === "ORM").length,
      marcom_won: won.filter((l) => l.service_line === "MARCOM").length,
    });
  }
  return out;
}

/* ---------- v_bdac_carry — new (§2.4): open carry deals + open-ticket read-back ---------- */
export type CarryRow = {
  deal: ContractLifecycle; deal_id: string; hotel_id: string | null; hotel_name: string; service_line: BdacLine;
  cohort_month: string; current_stage: number; current_substep: string | null; bd_owner_id: string;
  days_since_sent_contract: number; open_ticket_id: string | null; open_ticket_status: L0Ticket["status"] | null;
};
export function v_bdac_carry(rows: ContractLifecycle[], tickets: L0Ticket[], now = Date.now()): CarryRow[] {
  const cur = monthKey(now);
  return rows
    .filter((l) => l.send_contract_at && l.send_contract_at.slice(0, 7) < cur && !l.won_at)
    .map((l) => {
      const t = tickets.find((x) => x.type === "CONTRACT_FOLLOWUP" && x.subject_ref.deal_id === l.id && ["NEW", "ACK", "IN_PROGRESS"].includes(x.status));
      const stage = displayStage(l.current_stage);
      return {
        deal: l, deal_id: l.id, hotel_id: l.hotel_id, hotel_name: l.hotel_name, service_line: bdacLine(l),
        cohort_month: l.send_contract_at!.slice(0, 7), current_stage: stage,
        current_substep: stage === 6 ? SUBSTEP_LABEL[l.current_stage] ?? "Draft" : null,
        bd_owner_id: l.bd_owner_id,
        days_since_sent_contract: Math.floor(days(l.send_contract_at!, now)),
        open_ticket_id: t?.ticket_id ?? null, open_ticket_status: t?.status ?? null,
      };
    })
    .sort((a, b) => b.days_since_sent_contract - a.days_since_sent_contract);
}

/* ---------- v_bdac_stage_current / v_bdac_deal_aging (§2.4) ---------- */
export function v_bdac_stage_current(rows: ContractLifecycle[], now = Date.now()) {
  return rows.map((l) => {
    const sla = bdacSla(l, now);
    return {
      deal: l,
      stage: sla.stage,
      substep: sla.stage === 6 ? SUBSTEP_LABEL[l.current_stage] ?? "Draft" : null,
      ...sla,
    };
  });
}

export function v_bdac_deal_aging(rows: ContractLifecycle[], now = Date.now()) {
  return v_bdac_stage_current(rows, now)
    .filter((x) => x.stage < 10)
    .sort((a, b) => (b.sla_days ?? -1) - (a.sla_days ?? -1));
}

/* ---------- v_bdac_cycle_time (§2.4): median only, no IQR, skip null timestamps ---------- */
export type CycleLeg = "SENT_TO_SIGNED" | "SIGNED_TO_PAID";
export const cycleLegLimit = (leg: CycleLeg) => (leg === "SENT_TO_SIGNED" ? bdacConfig.bdac_sla_config.sent_to_signed : bdacConfig.bdac_sla_config.signed_to_won);
export function v_bdac_cycle_time(rows: ContractLifecycle[], r: Range, leg: CycleLeg) {
  const limit = cycleLegLimit(leg);
  return rows.flatMap((l) => {
    const [a, b] = leg === "SENT_TO_SIGNED" ? [l.send_contract_at, l.signed_at] : [l.signed_at, l.payment_at];
    if (!a || !b || !inRange(b, r)) return [];
    const d = days(a, b);
    return [{ deal_id: l.id, hotel_name: l.hotel_name, service_line: bdacLine(l), bd_owner_id: l.bd_owner_id, leg, end_date: b, days: d, over_sla: d > limit, limit }];
  });
}
export function cycleAgg(rows: { days: number; over_sla: boolean }[]) {
  const vals = rows.map((r) => r.days);
  const q = quantiles(vals);
  return { median: q?.median ?? null, n: rows.length, over_sla_count: rows.filter((r) => r.over_sla).length };
}

export const v_bdac_diagnostic_bin = () => ({ rows: [] as never[], pending_sync: true });
export const v_bdac_special_deal = () => ({ rows: [] as never[], pending_sync: true });

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

export const monthRange = (offset = 0, now = Date.now()): Range => {
  const d = new Date(now);
  return { from: new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime(), to: new Date(d.getFullYear(), d.getMonth() + offset + 1, 1).getTime() };
};
