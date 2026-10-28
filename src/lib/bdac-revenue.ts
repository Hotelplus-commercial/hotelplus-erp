/** BD-AC v2.2 §3–§4 — pure selectors over v_bdac_contract_revenue_ranking
 *  (one row = contract × billing period × lens ALL / ORM / MARCOM). Read-only.
 *  §3.2 renewal chain: prev_rank / avg_rank are recomputed here across old → new contract ids read from the
 *  existing renewal records, so live and demo share one implementation (the view's own values are per contract). */
import type { AcLens, AcRankRow } from "./ac-revenue";
import type { PsReportRow } from "./ps-dashboard-types";

export type RevRow = AcRankRow & {
  contract_id: string;
  service_lines: string[];
  ae_owner_id: string | null;
  orm_owner_id: string | null;
  marcom_owner_id: string | null;
};
/** old contract → new contract (renewal_request.source_contract_id → new_contract_id). */
export type ChainLink = { contract_id: string; new_contract_id: string };

const num = (v: unknown) => Number(v ?? 0) || 0;
const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const period7 = (v: unknown) => String(v ?? "").slice(0, 7);

export function toRevRows(raw: PsReportRow[] | undefined): RevRow[] {
  return (raw ?? [])
    .filter((r) => str(r["contract_id"]) && str(r.hotel_id) && ["ALL", "ORM", "MARCOM"].includes(String(r["lens"] ?? "")))
    .map((r) => ({
      billing_period: period7(r.billing_period),
      contract_id: String(r["contract_id"]),
      hotel_id: String(r.hotel_id),
      hotel_name: String(r.hotel_name ?? ""),
      service_lines: Array.isArray(r["service_lines"])
        ? (r["service_lines"] as unknown[]).map(String)
        : String(r["service_lines"] ?? "").replace(/[{}]/g, "").split(",").filter(Boolean),
      lens: String(r["lens"]) as AcLens,
      amount_thb: num(r["amount_thb"]),
      orm_thb: num(r["orm_thb"]),
      marcom_thb: num(r["marcom_thb"]),
      invoice_count: num(r["invoice_count"]),
      rank: r["rank"] == null ? null : num(r["rank"]),
      prev_rank: r["prev_rank"] == null ? null : num(r["prev_rank"]),
      avg_rank: r["avg_rank"] == null ? null : num(r["avg_rank"]),
      has_bill: r["has_bill"] === true,
      ae_owner_id: str(r["ae_owner_id"]),
      orm_owner_id: str(r["orm_owner_id"]),
      marcom_owner_id: str(r["marcom_owner_id"]),
    }));
}

const shift = (ym: string, by: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Root contract id of every contract in a chain (a contract without a renewal link is its own chain). */
export function chainRoots(links: ChainLink[]): Map<string, string> {
  const parent = new Map<string, string>();
  for (const l of links) if (l.contract_id && l.new_contract_id && l.contract_id !== l.new_contract_id) parent.set(l.new_contract_id, l.contract_id);
  const roots = new Map<string, string>();
  const rootOf = (id: string) => {
    let cur = id;
    const seen = new Set<string>();
    while (parent.has(cur) && !seen.has(cur)) { seen.add(cur); cur = parent.get(cur)!; }
    return cur;
  };
  for (const id of new Set([...parent.keys(), ...parent.values()])) roots.set(id, rootOf(id));
  return roots;
}

/** Chains with more than one contract. */
export const chainCount = (links: ChainLink[]) => new Set([...chainRoots(links).values()]).size;

/** §3.1/§3.2 — prev_rank = rank one billing period earlier in the same lens and chain; avg_rank = mean rank over the
 *  last 12 ranked billing periods (≥ 2, else null = "รอสะสม"). Ranks themselves are never changed. */
export function applyChains(rows: RevRow[], links: ChainLink[]): RevRow[] {
  const roots = chainRoots(links);
  const key = (r: RevRow) => `${r.lens}|${roots.get(r.contract_id) ?? r.contract_id}`;
  const ranked = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.has_bill || r.rank == null) continue;
    const k = key(r);
    const m = ranked.get(k) ?? new Map<string, number>();
    const cur = m.get(r.billing_period);
    if (cur == null || r.rank < cur) m.set(r.billing_period, r.rank);
    ranked.set(k, m);
  }
  return rows.map((r) => {
    if (!r.has_bill || r.rank == null) return { ...r, prev_rank: null, avg_rank: null };
    const m = ranked.get(key(r)) ?? new Map<string, number>();
    const prev = m.get(shift(r.billing_period, -1)) ?? null;
    const hist = [...m.entries()].filter(([p]) => p <= r.billing_period).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-12).map(([, v]) => v);
    return { ...r, prev_rank: prev, avg_rank: hist.length >= 2 ? hist.reduce((s, v) => s + v, 0) / hist.length : null };
  });
}

/** §4.0 population: billed rows of one period and lens, in rank order. */
export function revenueRows(rows: RevRow[], period: string | null, lens: AcLens): RevRow[] {
  if (!period) return [];
  return rows
    .filter((r) => r.billing_period === period.slice(0, 7) && r.lens === lens && r.has_bill)
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.hotel_name.localeCompare(b.hotel_name) || a.contract_id.localeCompare(b.contract_id));
}

/** Active-but-unbilled contracts (note only, never charted). */
export const unbilledContracts = (rows: RevRow[], period: string | null, lens: AcLens) =>
  period ? new Set(rows.filter((r) => r.billing_period === period.slice(0, 7) && r.lens === lens && !r.has_bill).map((r) => r.contract_id)).size : 0;

/** Latest billing period with a bill inside [from, to] (YYYY-MM-DD bounds). */
export function latestRevenuePeriod(rows: RevRow[], range?: { from: string; to: string } | null): string | null {
  const ps = [...new Set(rows.filter((r) => r.has_bill && (!range || (r.billing_period >= range.from.slice(0, 7) && r.billing_period <= range.to.slice(0, 7)))).map((r) => r.billing_period))].sort();
  return ps.at(-1) ?? null;
}
export const previousPeriod = (p: string | null) => (p ? shift(p, -1) : null);

/** Distinct hotels among the rows. */
export const hotelCount = (rows: RevRow[]) => new Set(rows.map((r) => r.hotel_id)).size;

/** Row label everywhere: `{hotel_name} · {contract_id}`. */
export const rowLabel = (r: Pick<RevRow, "hotel_name" | "contract_id">) => `${r.hotel_name} · ${r.contract_id}`;

/** §4.1 tooltip line 1. */
export function serviceSplitLine(r: RevRow, lens: AcLens): string {
  if (lens !== "ALL") return `เฉพาะ ${lens === "ORM" ? "ORM" : "Marcom"}`;
  if (r.orm_thb > 0 && r.marcom_thb > 0) return `ORM ${baht(r.orm_thb)} · Marcom ${baht(r.marcom_thb)}`;
  return r.orm_thb > 0 ? "ORM อย่างเดียว" : "Marcom อย่างเดียว";
}
const baht = (n: number) => "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

/** F8 — lens-ALL amount vs fee + commission of the same contract and month in v_ac_contract_cost_monthly,
 *  skipping rows tagged บิลรวม there. Returns compared pairs and mismatches. */
export function costReconcile(rev: RevRow[], cost: PsReportRow[]) {
  const sums = new Map<string, { amt: number; combined: boolean }>();
  for (const c of cost) {
    if (c["has_bill"] === false) continue;
    const k = `${c["contract_id"]}|${period7(c["month"])}`;
    const s = sums.get(k) ?? { amt: 0, combined: false };
    s.amt += num(c["fee_thb"]) + num(c["commission_thb"]);
    s.combined ||= c["combined_bill"] === true;
    sums.set(k, s);
  }
  let compared = 0, mismatches = 0, notInCost = 0;
  for (const r of rev) {
    if (r.lens !== "ALL" || !r.has_bill) continue;
    const s = sums.get(`${r.contract_id}|${r.billing_period}`);
    if (!s) { notInCost++; continue; }
    if (s.combined) continue;
    compared++;
    if (Math.abs(s.amt - r.amount_thb) > 0.5) mismatches++;
  }
  return { compared, mismatches, notInCost };
}
