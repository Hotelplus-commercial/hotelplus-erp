/** R1.2 §2.3–§2.4 — pure selectors over v_ac_contract_cost_monthly
 *  (one row = service contract (contract × service) × billing month). Read-only: no writes,
 *  no grade recalculation (grades are the stored per-customer values carried on each row). */
import type { PsReportRow } from "./ps-dashboard-types";

export type CostService = "ORM" | "Marcom";
export type CostRow = {
  contract_id: string;
  service: CostService;
  month: string; // YYYY-MM
  hotel_id: string;
  hotel_name: string;
  customer_id: string;
  customer_name: string;
  fee_thb: number;
  commission_thb: number;
  guarantee_applied: boolean;
  has_bill: boolean;
  combined_bill: boolean;
  contract_start: string | null;
  contract_active: boolean;
  ae_owner_id: string | null;
  caretaker: string | null;
  grade_latest: string | null;
  grade_worst6: string | null;
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));

export function toCostRows(rows: PsReportRow[] | undefined): CostRow[] {
  return (rows ?? [])
    .filter((r) => r["contract_id"] != null && (r["service"] === "ORM" || r["service"] === "Marcom"))
    .map((r) => ({
      contract_id: str(r["contract_id"]),
      service: r["service"] as CostService,
      month: str(r["month"]).slice(0, 7),
      hotel_id: str(r["hotel_id"]),
      hotel_name: str(r["hotel_name"]) || str(r["hotel_id"]),
      customer_id: str(r["customer_id"]),
      customer_name: str(r["customer_name"]) || str(r["customer_id"]),
      fee_thb: num(r["fee_thb"]),
      commission_thb: num(r["commission_thb"]),
      guarantee_applied: r["guarantee_applied"] === true,
      has_bill: r["has_bill"] === true,
      combined_bill: r["combined_bill"] === true,
      contract_start: r["contract_start"] == null ? null : str(r["contract_start"]).slice(0, 10),
      contract_active: r["contract_active"] !== false,
      ae_owner_id: r["ae_owner_id"] == null || r["ae_owner_id"] === "" ? null : str(r["ae_owner_id"]),
      caretaker: r["caretaker"] == null || r["caretaker"] === "" ? null : str(r["caretaker"]),
      grade_latest: r["grade_latest"] == null ? null : str(r["grade_latest"]),
      grade_worst6: r["grade_worst6"] == null ? null : str(r["grade_worst6"]),
    }));
}

export const billTotal = (r: Pick<CostRow, "fee_thb" | "commission_thb">) => r.fee_thb + r.commission_thb;
export const pairKey = (r: Pick<CostRow, "contract_id" | "service">) => `${r.contract_id}|${r.service}`;

/** `YYYY-MM` shifted by whole months. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** อายุสัญญา (เดือน) = full calendar months from start to the end of the selected month. */
export function contractAgeMonths(start: string | null, month: string): number | null {
  if (!start || !/^\d{4}-\d{2}-\d{2}/.test(start)) return null;
  const [sy, sm, sd] = start.slice(0, 10).split("-").map(Number) as [number, number, number];
  const [ey, em] = shiftMonth(month, 1).split("-").map(Number) as [number, number]; // exclusive end = 1st of next month
  const months = (ey - sy) * 12 + (em - sm) - (1 < sd ? 1 : 0);
  return Math.max(0, months);
}

export type CostLine = {
  key: string;
  contract_id: string;
  service: CostService;
  hotel_name: string;
  customer_name: string;
  ae_owner_id: string | null;
  caretaker: string | null;
  age_months: number | null;
  /** sum of billed amounts since start ÷ months that had a bill (≤ selected month) */
  lifetime_monthly: number | null;
  fee: number | null;
  commission: number | null;
  guarantee: boolean;
  has_bill: boolean;
  combined_bill: boolean;
  delta_prev: number | null;
  delta_yoy: number | null;
  grade: string | null;
};

/** §2.4 table — one row per active service contract present in the selected month. Sorted hotel A–Z only. */
export function costLines(rows: CostRow[], month: string, compareMonth?: string | null): CostLine[] {
  const prevMonth = compareMonth ?? shiftMonth(month, -1);
  const yoyMonth = shiftMonth(month, -12);
  const at = new Map<string, CostRow>();
  for (const r of rows) at.set(`${pairKey(r)}@${r.month}`, r);
  const current = rows.filter((r) => r.month === month && r.contract_active);
  return current
    .map((r) => {
      const k = pairKey(r);
      const hist = rows.filter((x) => pairKey(x) === k && x.month <= month && x.has_bill);
      const total = hist.reduce((s, x) => s + billTotal(x), 0);
      const prev = at.get(`${k}@${prevMonth}`);
      const yoy = at.get(`${k}@${yoyMonth}`);
      const cur = r.has_bill ? billTotal(r) : null;
      return {
        key: k,
        contract_id: r.contract_id,
        service: r.service,
        hotel_name: r.hotel_name,
        customer_name: r.customer_name,
        ae_owner_id: r.ae_owner_id,
        caretaker: r.caretaker,
        age_months: contractAgeMonths(r.contract_start, month),
        lifetime_monthly: hist.length ? Math.round(total / hist.length) : null,
        fee: r.has_bill && r.fee_thb ? r.fee_thb : null,
        commission: r.has_bill && (r.commission_thb || r.guarantee_applied) ? r.commission_thb : null,
        guarantee: r.guarantee_applied,
        has_bill: r.has_bill,
        combined_bill: r.combined_bill,
        delta_prev: cur != null && prev?.has_bill ? cur - billTotal(prev) : null,
        delta_yoy: cur != null && yoy?.has_bill ? cur - billTotal(yoy) : null,
        grade: r.grade_latest,
      };
    })
    .sort((a, b) => a.hotel_name.localeCompare(b.hotel_name, "th") || a.contract_id.localeCompare(b.contract_id) || a.service.localeCompare(b.service));
}

/** Card face: billed contracts in the month and the ขึ้น / เท่าเดิม / ลด split vs the compare month. */
export function costSummary(lines: CostLine[]) {
  const billed = lines.filter((l) => l.has_bill);
  const withPrev = billed.filter((l) => l.delta_prev != null);
  return {
    billed: billed.length,
    up: withPrev.filter((l) => (l.delta_prev ?? 0) > 0).length,
    same: withPrev.filter((l) => l.delta_prev === 0).length,
    down: withPrev.filter((l) => (l.delta_prev ?? 0) < 0).length,
    noPrev: billed.length - withPrev.length,
    combined: lines.filter((l) => l.combined_bill).length,
  };
}

/** Latest month in a period that has any billed row. */
export function latestCostMonth(rows: CostRow[], period?: { from: string; to: string }): string | null {
  const months = [...new Set(rows.filter((r) => r.has_bill && (!period || (r.month >= period.from.slice(0, 7) && r.month <= period.to.slice(0, 7)))).map((r) => r.month))].sort();
  return months.at(-1) ?? null;
}

export type GradeCustomer = {
  customer_id: string;
  customer_name: string;
  grade_latest: string;
  grade_worst6: string | null;
  contracts: { hotel_name: string; service: CostService; contract_id: string }[];
  ae: string[];
};
/** §2.3 — customers per latest grade (stored per-customer grade, no recalculation), name A–Z. */
export function gradeCustomers(rows: CostRow[], month: string | null): GradeCustomer[] {
  const scope = rows.filter((r) => r.contract_active && (!month || r.month === month) && r.grade_latest);
  const by = new Map<string, GradeCustomer>();
  for (const r of scope) {
    const c = by.get(r.customer_id) ?? { customer_id: r.customer_id, customer_name: r.customer_name, grade_latest: r.grade_latest!, grade_worst6: r.grade_worst6, contracts: [], ae: [] };
    if (!c.contracts.some((x) => x.contract_id === r.contract_id && x.service === r.service)) c.contracts.push({ hotel_name: r.hotel_name, service: r.service, contract_id: r.contract_id });
    if (r.ae_owner_id && !c.ae.includes(r.ae_owner_id)) c.ae.push(r.ae_owner_id);
    by.set(r.customer_id, c);
  }
  return [...by.values()]
    .map((c) => ({ ...c, contracts: c.contracts.sort((a, b) => a.hotel_name.localeCompare(b.hotel_name, "th") || a.service.localeCompare(b.service)) }))
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name, "th"));
}
