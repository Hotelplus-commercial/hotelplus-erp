/* Header R2 — read-only adapters feeding the scorecard + Active Portfolio. Live reads reuse the
 * existing projections/stores (no new query, no writes); DEMO swaps in the isolated R2 fixture. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { readServicingDashboard } from "@/lib/servicing-dashboard.functions";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { v_bdac_deal_aging } from "@/lib/bdac-views";
import { useCrmOptional } from "@/lib/crm-store";
import { useRenewalStore } from "@/lib/renewal-store";
import { latestCostMonth, toCostRows } from "@/lib/ac-contract-cost";
import { debtorRows } from "@/lib/ac-revenue";
import { aeNameTh } from "@/lib/ps-glossary";
import type { PsReport, PsReportRow } from "@/lib/ps-dashboard-types";
import type { GradeRow, HRow, JourneyInput, PortfolioContract, PriceRow, Svc } from "@/lib/ps-header-r2";
import { headerContractJoin } from "@/lib/header-contract-join";
import { HEADER_MARCOM_DEMO_OVERLAY } from "@/lib/header-marcom-overlay-demo";
import { headerDemoInput, headerDemoMarcom, headerDemoPortfolio, HEADER_DEMO_NOW } from "@/lib/ps-header-r2-demo";
import { tabR1DemoLapsed, tabR1HeaderActive, tabR1HeaderChurn, tabR1HeaderPortfolio } from "@/lib/contract-tab-r1-demo";
import { contractStateOn, contractTermEnd } from "@/lib/contract-state";
import type { Contract } from "@/lib/crm-types";
import type { MarcomRecord } from "@/lib/marcom-app-source";
import type { ServicingReport } from "@/lib/servicing-dashboard-types";
import { useAcViews } from "./use-ac-views";

const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const svcOf = (v: unknown): Svc | null => (v === "ORM" ? "ORM" : v === "Marcom" || v === "MARCOM" ? "Marcom" : null);
const owners = (r: PsReportRow): Pick<HRow, "ae" | "orm" | "marcom"> => ({ ae: str(r["ae_owner_id"]), orm: str(r["orm_team"]), marcom: str(r["marcom_owner_id"]) });

export type HeaderData = {
  today: string;
  journey: JourneyInput;
  portfolio: { contracts: PortfolioContract[]; prices: PriceRow[] };
  /** null = Marcom App not connected. */
  marcom: { posts: MarcomRecord[] | null; ads: MarcomRecord[] | null; kol: MarcomRecord[] | null };
  loading: boolean;
};

export function useHeaderR2(demo: boolean, report: PsReport | undefined): HeaderData {
  const read = useServerFn(readServicingDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const sv = useQuery({ queryKey: ["servicing-dashboard-views-v2"], queryFn: () => read() as Promise<ServicingReport>, enabled: ready && !demo, staleTime: 60_000 });
  const ac = useAcViews();
  const { lifecycles } = useContractLifecycle();
  const crm = useCrmOptional();
  const renewal = useRenewalStore();
  return useMemo(() => {
    if (demo) {
      // Tab R1 §11: demo additions also feed the header so header ใช้งาน / หลุด and cards ① / ⑦ agree (fixture itself unchanged).
      const j = headerDemoInput(), p = headerDemoPortfolio(), ap = tabR1HeaderPortfolio();
      const lapsed = tabR1DemoLapsed().map((l) => ({ service: l.service, hotel_id: l.hotel_id, hotel_name: l.hotel_name, ae: l.ae, orm: l.orm, marcom: l.marcom }));
      return { today: HEADER_DEMO_NOW, journey: { ...j, active: [...j.active, ...tabR1HeaderActive()], lapsed, unmatched: [], churn: [...j.churn, ...tabR1HeaderChurn()] }, portfolio: { contracts: [...p.contracts, ...ap.contracts].map((c) => (HEADER_MARCOM_DEMO_OVERLAY[c.contract_id] ? { ...c, lines: HEADER_MARCOM_DEMO_OVERLAY[c.contract_id] } : c)), prices: [...p.prices, ...ap.prices] }, marcom: headerDemoMarcom(), loading: false };
    }
    const today = new Date().toISOString().slice(0, 10);
    const views = report?.views;
    const upcoming: HRow[] = v_bdac_deal_aging(lifecycles, Date.now()).flatMap((x) => { const s = svcOf(x.deal.service_line); return s ? [{ service: s, hotel_name: x.deal.hotel_name ?? undefined, ae: null, orm: null, marcom: null }] : []; });
    const svRows = (sv.data as ServicingReport | undefined)?.rows ?? [];
    const onboard = svRows.flatMap((r) => { const s = svcOf(r.service_line); return s ? [{ service: s, hotel_id: r.hotel_id, hotel_name: r.hotel_name, ae: r.ae_owner_id, orm: r.orm_team, marcom: r.marcom_owner_id, created_at: r.created_at, go_live_at: r.go_live_at }] : []; });
    const seen = new Set<string>();
    // v1.4.1 Q58 (normal mode): a row is checked only when its contract_id matches the main contract store (that contract's end date); never guessed.
    const mainById = new Map<string, Contract>((crm?.contracts ?? []).map((c) => [c.contract_id, c]));
    const renewLinks = (crm?.contracts ?? []).map((c) => ({ renewal_of: c.renewal_of ?? null, start: c.start_date }));
    const lapsed: (HRow & { hotel_id: string })[] = [], unmatched: (HRow & { hotel_id: string })[] = [];
    const active = (views?.v_ps_account_health ?? []).flatMap((r) => {
      const s = svcOf(r.service_line); const id = str(r.hotel_id);
      if (!s || !id || r.status !== "ACTIVE" || seen.has(`${id}|${s}`)) return [];
      seen.add(`${id}|${s}`);
      const row = { service: s, hotel_id: id, hotel_name: String(r.hotel_name ?? id), ...owners(r) };
      // Header R3 HR28 / HR29: contract_id first, else hotel + service active today; never hotel alone.
      const jn = headerContractJoin([{ contract_id: str(r["contract_id"]), hotel_id: id, service: s }], today, crm?.contracts ?? [])[0]!;
      const mc = jn.contract_id ? mainById.get(jn.contract_id) : undefined;
      if (!mc) { unmatched.push(row); return [row]; }
      const st = contractStateOn({ contract_id: mc.contract_id, start: mc.start_date, term_end: contractTermEnd(mc) }, today, renewLinks);
      if (st === "LAPSED_PENDING") { lapsed.push(row); return []; }
      return [row];
    });
    const churn = (views?.v_ps_churn_monthly ?? []).flatMap((r) => { const s = svcOf(r.service_line); return s && r.billing_period ? [{ service: s, hotel_id: str(r.hotel_id) ?? undefined, ...owners(r), month: String(r.billing_period).slice(0, 10), base: Number(r["active_at_start"] ?? 0) || 0, out: Number(r["out_count"] ?? 0) || 0 }] : []; });
    // AC grade dataset (same as the AC / debtor tab): grade per customer, shown on each of its service contracts.
    const acViews = ac.data as Record<string, PsReportRow[]> | undefined;
    const cost = toCostRows(acViews?.["v_ac_contract_cost_monthly"]).filter((r) => r.contract_active && r.grade_latest);
    const gm = latestCostMonth(cost);
    const debt = debtorRows(acViews?.["v_ac_debtors"] ?? []);
    const gSeen = new Set<string>();
    const gradeRows: GradeRow[] = cost.filter((r) => r.month === gm).flatMap((r) => {
      const k = `${r.contract_id}|${r.service}`; if (gSeen.has(k)) return []; gSeen.add(k);
      const d = debt.find((x) => x.hotel_id === r.hotel_id && svcOf(x.service_line) === r.service);
      return [{ service: r.service, hotel_id: r.hotel_id, hotel_name: r.hotel_name, ae: r.ae_owner_id, orm: null, marcom: null, ae_name: aeNameTh(r.ae_owner_id), grade: r.grade_latest!, overdue: d ? d.overdue_months : null }];
    });
    // Active Portfolio: contract SKU lines (contracts & services) + contract_price_history (browser-local renewal store).
    const products = crm?.products ?? [];
    const lineSvc = (sku: string) => products.find((p) => p.sku === sku)?.service_line ?? null;
    const contracts: PortfolioContract[] = [];
    const prices: PriceRow[] = [];
    for (const c of crm?.contracts ?? []) {
      if (!c.hotel_id || c.status !== "contract_completed" || (c.billing_status ?? "ACTIVE") !== "ACTIVE") continue;
      for (const s of ["ORM", "Marcom"] as Svc[]) {
        const lines = c.lines.filter((l) => (lineSvc(l.sku_snapshot) === "MARCOM" ? "Marcom" : lineSvc(l.sku_snapshot)) === s && l.billing === "monthly");
        if (!lines.length) continue;
        const text = (l: (typeof lines)[number]) => `${l.sku_snapshot} ${l.name_snapshot} ${l.package_snapshot ?? ""}`.toUpperCase();
        const flat = lines.find((l) => (l.unit_price ?? 0) > 0), comm = lines.find((l) => (l.commission_rate ?? 0) > 0);
        const content = lines.find((l) => /CONTENT|POST/.test(text(l))), ads = lines.find((l) => /ADS|BOOST/.test(text(l))), kol = lines.find((l) => /KOL/.test(text(l)));
        const id = `${c.contract_id}|${s}`;
        contracts.push({ service: s, contract_id: id, hotel_id: c.hotel_id, hotel_name: c.customer_snapshot?.legal_name ?? c.hotel_id, ae: null, orm: c.orm_team_id ?? null, marcom: c.marcom_member_id ?? null, start: c.start_date, end: c.inactivated_at ?? null,
          sku: s === "ORM" ? { flat: !!flat, commission: !!comm } : { content: !!content, ads: !!ads, kol: !!kol },
          quota: s === "Marcom" ? { content: content?.quantity ?? null, kol: kol?.quantity ?? null } : undefined,
          lines: s === "Marcom" ? lines.map((l) => ({ sku: l.sku_snapshot, unit_price: l.unit_price == null ? null : l.unit_price * (l.quantity || 1), billing: l.billing, from: c.start_date.slice(0, 10), to: null })) : undefined });
        const hist = renewal.history.filter((h) => h.contract_id === c.contract_id);
        if (hist.length) for (const h of hist) prices.push({ contract_id: id, fee_amount: h.fee_amount, commission_pct: h.commission_pct, effective_from: h.effective_from, effective_to: h.effective_to || null });
        else if (s === "ORM") prices.push({ contract_id: id, fee_amount: flat?.unit_price ?? null, commission_pct: comm?.commission_rate ?? null, effective_from: c.start_date, effective_to: null });
      }
    }
    // Active Portfolio counts only the service contracts that are ใช้งาน in col 3 (same set, so totals match).
    const activeKeys = new Set(active.map((a) => `${a.hotel_id}|${a.service}`));
    const owned = contracts.filter((c) => activeKeys.has(`${c.hotel_id}|${c.service}`)).map((c) => ({ ...c, ae: active.find((a) => a.hotel_id === c.hotel_id && a.service === c.service)?.ae ?? null }));
    return {
      today,
      journey: { today, upcoming, onboard, active, lapsed, unmatched, churn, scores: null, grades: { month: gm, rows: gradeRows } },
      portfolio: { contracts: owned, prices },
      marcom: { posts: null, ads: null, kol: null },
      loading: sv.isLoading || ac.isLoading,
    };
  }, [demo, report, sv.data, sv.isLoading, ac.data, ac.isLoading, lifecycles, crm?.contracts, crm?.products, renewal]);
}
