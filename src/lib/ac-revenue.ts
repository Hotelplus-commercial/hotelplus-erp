/** AC Dashboard v2.0 — pure presentation selectors over the re-grained v_ac_invoice_ranking
 *  (one row = hotel × billing period × lens) and the existing v_ac_* collection views.
 *  Read-only: no writes, no signal recomputation. Shared by the AC tab and its tests. */
import type { PsReportRow } from "@/lib/ps-dashboard-types";

/** §7.3 — editable without code; last band is open (≥ ceiling). */
export const AC_BAND_CONFIG = { step_thb: 10_000, ceiling_thb: 100_000 } as const;

export type AcLens = "ALL" | "ORM" | "MARCOM";
export type AcRankRow = {
  billing_period: string;
  hotel_id: string;
  hotel_name: string;
  lens: AcLens;
  amount_thb: number;
  orm_thb: number;
  marcom_thb: number;
  invoice_count: number;
  rank: number | null;
  prev_rank: number | null;
  avg_rank: number | null;
  has_bill: boolean;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

/** `2026-09-01` / `2026-09` → `Sep 26` (never Thai month names). */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monYY(period: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(period ?? ""));
  if (!m) return "—";
  return `${MON[Number(m[2]) - 1]} ${m[1].slice(2)}`;
}

export const bahtFull = (n: number) => "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
/** ฿4.24M / ฿130.9k style for big answers. */
export function bahtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })}M`;
  if (Math.abs(n) >= 10_000) return `฿${(n / 1_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}k`;
  return bahtFull(n);
}

/** Map the global service filter to a ranking lens. */
export const lensOf = (service: "ALL" | "ORM" | "Marcom"): AcLens =>
  service === "ALL" ? "ALL" : service === "ORM" ? "ORM" : "MARCOM";

export function rankRows(rows: PsReportRow[], period: string | null, lens: AcLens): AcRankRow[] {
  return rows
    .filter(
      (r) =>
        String(r.billing_period ?? "").slice(0, 7) === (period ?? "").slice(0, 7) &&
        String(r.lens ?? "ALL") === lens &&
        r.has_bill === true,
    )
    .map((r) => ({
      billing_period: String(r.billing_period),
      hotel_id: String(r.hotel_id ?? ""),
      hotel_name: String(r.hotel_name ?? ""),
      lens,
      amount_thb: num(r.amount_thb),
      orm_thb: num(r.orm_thb),
      marcom_thb: num(r.marcom_thb),
      invoice_count: num(r.invoice_count),
      rank: r.rank == null ? null : num(r.rank),
      prev_rank: r.prev_rank == null ? null : num(r.prev_rank),
      avg_rank: r.avg_rank == null ? null : num(r.avg_rank),
      has_bill: true,
    }))
    .sort((a, b) => (a.rank ?? 9e9) - (b.rank ?? 9e9));
}

/** Active-but-unbilled count for the footnote (never in charts/table). */
export function unbilledCount(rows: PsReportRow[], period: string | null, lens: AcLens): number {
  return rows.filter(
    (r) =>
      String(r.billing_period ?? "").slice(0, 7) === (period ?? "").slice(0, 7) &&
      String(r.lens ?? "ALL") === lens &&
      r.has_bill === false,
  ).length;
}

export type SplitStats = {
  N: number;
  half: number;
  total: number;
  topSum: number;
  bottomSum: number;
  topShare: number;
  bottomShare: number;
  /** first rank whose cumulative revenue reaches ≥ 50% of total */
  k: number;
  /** revenue at rank `half` — the split value, reused as the median line in ② (I5) */
  splitValue: number;
};
export function splitStats(rows: AcRankRow[]): SplitStats {
  const N = rows.length;
  const half = Math.ceil(N / 2);
  const total = rows.reduce((s, r) => s + r.amount_thb, 0);
  const topSum = rows.slice(0, half).reduce((s, r) => s + r.amount_thb, 0);
  const bottomSum = total - topSum;
  let cum = 0;
  let k = N || 0;
  for (let i = 0; i < rows.length; i++) {
    cum += rows[i]!.amount_thb;
    if (cum >= total / 2) {
      k = i + 1;
      break;
    }
  }
  return {
    N,
    half,
    total,
    topSum,
    bottomSum,
    topShare: total ? (topSum / total) * 100 : 0,
    bottomShare: total ? (bottomSum / total) * 100 : 0,
    k,
    splitValue: rows[half - 1]?.amount_thb ?? 0,
  };
}

export type Band = { index: number; lo: number; hi: number | null; label: string; count: number; sum: number };
export function bandLabels(config = AC_BAND_CONFIG): { lo: number; hi: number | null; label: string }[] {
  const out: { lo: number; hi: number | null; label: string }[] = [];
  for (let lo = 0; lo < config.ceiling_thb; lo += config.step_thb) {
    const hi = lo + config.step_thb;
    out.push({ lo, hi, label: lo === 0 ? `<${config.step_thb / 1000}k` : `${lo / 1000}–${hi / 1000}k` });
  }
  out.push({ lo: config.ceiling_thb, hi: null, label: `≥${config.ceiling_thb / 1000}k` });
  return out;
}
export const bandIndexOf = (amount: number, config = AC_BAND_CONFIG) =>
  Math.min(Math.floor(amount / config.step_thb), config.ceiling_thb / config.step_thb);
export function bandCounts(rows: AcRankRow[], config = AC_BAND_CONFIG): Band[] {
  const labels = bandLabels(config);
  const bands: Band[] = labels.map((b, index) => ({ index, ...b, count: 0, sum: 0 }));
  for (const r of rows) {
    const b = bands[bandIndexOf(r.amount_thb, config)];
    if (b) {
      b.count += 1;
      b.sum += r.amount_thb;
    }
  }
  return bands;
}

/* ---------- Section 2: collection / grades ---------- */

export type CollectionStatus = "OVERDUE" | "SUSPENDED" | "LEGAL" | "WRITTEN_OFF" | "PAUSED";
export const COLLECTION_META: Record<
  CollectionStatus,
  { label: string; bar: string; pill: string; rule: string; order: number }
> = {
  OVERDUE: {
    label: "ค้างชำระ",
    bar: "#D9A13B",
    pill: "ac-pill-watch",
    rule: "ชำระก่อน 15 ของ M+2 → กลับเป็นปกติอัตโนมัติ",
    order: 2,
  },
  SUSPENDED: {
    label: "ปิดระบบ",
    bar: "#C8553D",
    pill: "ac-pill-action",
    rule: "ชำระครบ → เปิดระบบคืนอัตโนมัติ",
    order: 1,
  },
  LEGAL: {
    label: "ส่งฟ้อง",
    bar: "#8E2F1E",
    pill: "ac-pill-legal",
    rule: "เปิดคืนต้องให้ AC ทำเองเท่านั้น",
    order: 0,
  },
  WRITTEN_OFF: {
    label: "ตัดสูญ",
    bar: "#4A5A62",
    pill: "ac-pill-off",
    rule: "บันทึกเป็นหนี้สูญแล้ว · ไม่นับในยอดค้าง",
    order: 3,
  },
  PAUSED: { label: "พักบริการ", bar: "#8A9AA2", pill: "ac-pill-neutral", rule: "ไม่ใช่ลูกหนี้ · ไม่นับในกราฟ", order: 4 },
};

export const GRADE_META: Record<string, { bar: string; pill: string; desc: string }> = {
  A: { bar: "#1F7A6E", pill: "ac-pill-good", desc: "ชำระ ≤ วันที่ 15" },
  B: { bar: "#7CC4B8", pill: "ac-pill-good2", desc: "ชำระ ≤ สิ้นเดือน" },
  C: { bar: "#D9A13B", pill: "ac-pill-watch", desc: "ชำระ < วันที่ 15 ของเดือน M+2" },
  D: { bar: "#C8553D", pill: "ac-pill-action", desc: "เกินกว่านั้น" },
};

/** Debtor worklist row (⑧) — read from v_ac_debtors rows when they carry per-hotel fields. */
export type DebtorRow = {
  hotel_id: string;
  hotel_name: string;
  customer_name: string;
  service_line: string;
  caretaker: string | null;
  outstanding: number;
  invoice_count: number;
  overdue_months: number;
  grade: string;
  status: CollectionStatus;
};
export function debtorRows(rows: PsReportRow[]): DebtorRow[] {
  return rows
    .filter((r) => r.hotel_id != null && r.collection_status != null)
    .map((r) => ({
      hotel_id: String(r.hotel_id),
      hotel_name: String(r.hotel_name ?? ""),
      customer_name: String(r.customer_name ?? r.customer_id ?? ""),
      service_line: String(r.service_line ?? ""),
      caretaker: r.caretaker == null ? null : String(r.caretaker),
      outstanding: num(r.outstanding),
      invoice_count: num(r.invoice_count ?? 1),
      overdue_months: num(r.overdue_months),
      grade: String(r.grade ?? ""),
      status: String(r.collection_status) as CollectionStatus,
    }));
}
/** ⑧ sort: ส่งฟ้อง → ปิดระบบ → ค้างชำระ → ตัดสูญ, then ฿ high → low. */
export const sortDebtors = (rows: DebtorRow[]) =>
  [...rows].sort(
    (a, b) => COLLECTION_META[a.status].order - COLLECTION_META[b.status].order || b.outstanding - a.outstanding,
  );
