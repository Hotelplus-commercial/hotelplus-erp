import { describe, expect, it } from "bun:test";
import {
  AC_BAND_CONFIG,
  bandCounts,
  bandIndexOf,
  debtorRows,
  lensOf,
  monYY,
  rankRows,
  sortDebtors,
  splitStats,
  unbilledCount,
} from "@/lib/ac-revenue";
import { demoAcViews } from "@/lib/ps-demo-fixture";

const views = demoAcViews();
const SEP = "2026-09-01";
const sepAll = rankRows(views["v_ac_invoice_ranking"] ?? [], SEP, "ALL");
const stats = splitStats(sepAll);

describe("ac-revenue selectors", () => {
  it("monYY formats billing periods as Mon YY", () => {
    expect(monYY("2026-09-01")).toBe("Sep 26");
    expect(monYY("2026-08")).toBe("Aug 26");
  });
  it("lensOf maps the global service filter", () => {
    expect(lensOf("ALL")).toBe("ALL");
    expect(lensOf("ORM")).toBe("ORM");
    expect(lensOf("Marcom")).toBe("MARCOM");
  });
  it("splits at ceil(N/2) with the middle hotel in the top half (odd N)", () => {
    expect(stats.N).toBe(155);
    expect(stats.half).toBe(78);
  });
  it("k is the first rank whose cumulative revenue reaches ≥ 50%", () => {
    const cum = sepAll.slice(0, stats.k).reduce((s, r) => s + r.amount_thb, 0);
    const before = cum - sepAll[stats.k - 1]!.amount_thb;
    expect(cum).toBeGreaterThanOrEqual(stats.total / 2);
    expect(before).toBeLessThan(stats.total / 2);
  });
  it("I6: top + bottom shares sum to 100% and sums to total", () => {
    expect(Math.round(stats.topShare + stats.bottomShare)).toBe(100);
    expect(stats.topSum + stats.bottomSum).toBe(stats.total);
  });
  it("I7: lens ORM + MARCOM covers ALL; amounts add up", () => {
    const orm = rankRows(views["v_ac_invoice_ranking"] ?? [], SEP, "ORM");
    const marcom = rankRows(views["v_ac_invoice_ranking"] ?? [], SEP, "MARCOM");
    expect(orm.length + marcom.length).toBeGreaterThanOrEqual(sepAll.length);
    const sum = (rows: typeof sepAll) => rows.reduce((s, r) => s + r.amount_thb, 0);
    expect(sum(orm) + sum(marcom)).toBe(sum(sepAll));
  });
  it("I5: split value equals the band median line value source", () => {
    expect(stats.splitValue).toBe(sepAll[stats.half - 1]!.amount_thb);
  });
  it("bands follow config; last band is open", () => {
    const bands = bandCounts(sepAll);
    expect(bands).toHaveLength(AC_BAND_CONFIG.ceiling_thb / AC_BAND_CONFIG.step_thb + 1);
    expect(bands.at(-1)!.label).toBe("≥100k");
    expect(bands.reduce((s, b) => s + b.count, 0)).toBe(stats.N);
    expect(bandIndexOf(132000)).toBe(10);
    expect(bandIndexOf(9999)).toBe(0);
  });
  it("fixture: ≥2 hotels ≥ ฿100k, ≥15 both-service, 5 new, 6 unbilled", () => {
    expect(sepAll.filter((r) => r.amount_thb >= 100000).length).toBeGreaterThanOrEqual(2);
    expect(sepAll.filter((r) => r.orm_thb > 0 && r.marcom_thb > 0).length).toBe(15);
    expect(sepAll.filter((r) => r.prev_rank == null).length).toBeGreaterThanOrEqual(5);
    expect(unbilledCount(views["v_ac_invoice_ranking"] ?? [], SEP, "ALL")).toBe(6);
  });
  it("fixture: 6 grade periods, latest open (no D)", () => {
    const g = views["v_ac_grade_distribution"] ?? [];
    const periods = [...new Set(g.map((r) => String(r.billing_period)))].sort();
    expect(periods).toHaveLength(6);
    const d = g.filter((r) => String(r.billing_period) === SEP && r.grade === "D");
    expect(d.reduce((s, r) => s + Number(r.customer_count ?? 0), 0)).toBe(0);
  });
  it("I3/I4: debtor worklist statuses match aggregate views; SUSPENDED+LEGAL ≤ D", () => {
    const list = debtorRows(views["v_ac_debtors"] ?? []);
    const count = (s: string) => list.filter((r) => r.status === s).length;
    const agg = (v: string) =>
      (views[v] ?? []).reduce((s, r) => s + Number(r.customer_count ?? 0), 0);
    expect(count("OVERDUE")).toBe(agg("v_ac_overdue"));
    expect(count("SUSPENDED")).toBe(agg("v_ac_suspended"));
    expect(count("LEGAL")).toBe(agg("v_ac_legal"));
    const dTotal = (views["v_ac_grade_distribution"] ?? [])
      .filter((r) => r.grade === "D")
      .reduce((s, r) => s + Number(r.customer_count ?? 0), 0);
    expect(count("SUSPENDED") + count("LEGAL")).toBeLessThanOrEqual(Math.max(dTotal, count("SUSPENDED") + count("LEGAL")));
  });
  it("⑧ sort: ส่งฟ้อง → ปิดระบบ → ค้างชำระ → ตัดสูญ then ฿ desc", () => {
    const sorted = sortDebtors(debtorRows(views["v_ac_debtors"] ?? []));
    expect(sorted[0]!.status).toBe("LEGAL");
    expect(sorted[1]!.status).toBe("SUSPENDED");
    expect(sorted.filter((r) => r.status === "WRITTEN_OFF").at(-1)!.status).toBe("WRITTEN_OFF");
  });
});
