/* Suite Dashboards R1 (Patch B) — read-only adapters. Every real number is read through the helper / hook that its
 * source page already uses (rule 2); nothing here recomputes a rule or writes. */
import { useMemo, type ReactNode } from "react";
import { useHeaderR2 } from "@/components/ps/use-header-r2";
import { useServiceTicketRows } from "@/components/ps/service-ticket-tab";
import { useDebtHeadline } from "@/components/ps/debt-cards-r11";
import { useMeetingFunnel } from "@/components/ps/meeting-tab-r1";
import { useWelcomeBackSource } from "@/components/workspace/welcome-back-section";
import { journeyScorecard, SEL_ALL } from "@/lib/ps-header-r2";
import { comparePeriods, DEFAULT_CMP } from "@/lib/card-compare";
import { marcomChannelsAsOf } from "@/lib/header-contract-join";
import { DashboardGlobal, defaultGlobalFilter } from "@/lib/ps-dashboard-global";
import { DEMO_NOW, BDAC_DEMO_NOW, demoBdacLifecycles } from "@/lib/ps-demo-fixture";
import { bdacSourceLines } from "@/lib/bdac-scope";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { cycleAgg, monthRange, v_bdac_conversion_cohort, v_bdac_cycle_time, v_bdac_flow, v_bdac_stage_current } from "@/lib/bdac-views";
import { wbActorOf, wbGroups } from "@/lib/welcome-back-routing";
import { getSurveyFlags, useMeetingSurveyData } from "@/lib/meeting-survey-store";
import { useCoachingTasks } from "@/lib/coaching-store";
import { categoryRequests, type SvcDept } from "@/lib/service-tickets";
import { useTickets } from "@/lib/tickets-l0";
import { usePartnerData } from "@/lib/debt-partner-store";
import { billTiles, billView } from "@/lib/partner-bills";
import { useHrMembers } from "@/lib/hr-members";
import { suiteToday } from "./kit";

/** Same context the PS tabs read (ticket rows hook needs it). */
export function SuiteDashProvider({ demo, children }: { demo: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ filter: defaultGlobalFilter, demo, now: demo ? DEMO_NOW : new Date().toISOString() }), [demo]);
  return <DashboardGlobal.Provider value={value}>{children}</DashboardGlobal.Provider>;
}

/** PS header (Header R2/R3): active contracts, Go Live mode, ขาดอายุ รอผล, Marcom channels — same inputs as the PS Dashboard header (no filter). */
export function usePsHeadline(demo: boolean) {
  const h = useHeaderR2(demo, undefined);
  return useMemo(() => {
    const p = comparePeriods(DEFAULT_CMP, h.today);
    const sc = journeyScorecard(h.journey, SEL_ALL, { golive: p, churn: p, score: p });
    const row = (s: "ORM" | "Marcom") => sc.rows.find((r) => r.service === s)!;
    const lapsed = (s: string) => (h.journey.lapsed ?? []).filter((x) => x.service === s).length;
    const ch = marcomChannelsAsOf(h.portfolio.contracts, h.today);
    return { today: h.today, orm: row("ORM"), marcom: row("Marcom"), lapsed: lapsed("ORM") + lapsed("Marcom"), channels: ch, loading: h.loading };
  }, [h]);
}

/** vServiceTickets rows (L0; PS cases are loaded only by the PS tab) → open / overdue per department. */
export function useTicketCounts() {
  const { rows } = useServiceTicketRows([]);
  return (dept: SvcDept) => {
    const open = rows.filter((r) => r.dept === dept && r.is_counted && r.display_status !== "SOLVED" && r.display_status !== "CANCELLED");
    return { open: open.length, overdue: open.filter((r) => r.due_state === "OVERDUE").length, rows: open };
  };
}
export function useAllOverdueTickets() {
  const { rows } = useServiceTicketRows([]);
  return rows.filter((r) => r.is_counted && r.display_status !== "SOLVED" && r.display_status !== "CANCELLED" && r.due_state === "OVERDUE").length;
}

/** BD-AC numbers (same lines + clock as The Office Dashboard › BD-AC, default filter, current month). */
export function useBdacNumbers(demo: boolean) {
  const { lifecycles } = useContractLifecycle();
  return useMemo(() => {
    const now = demo ? new Date(BDAC_DEMO_NOW).getTime() : Date.now();
    const rows = bdacSourceLines(demo ? demoBdacLifecycles() : lifecycles, defaultGlobalFilter, demo);
    const range = monthRange(0, now);
    const cur = v_bdac_stage_current(rows, now);
    const wip = cur.filter((x) => x.stage >= 6 && x.stage <= 9 && x.is_on_time !== null);
    const cohort = v_bdac_conversion_cohort(rows, now);
    return {
      won: v_bdac_flow(rows, range).won,
      sentOpen: cur.filter((x) => x.stage === 7).length,
      wipOver: wip.filter((x) => !x.is_on_time).length,
      wipN: wip.length,
      cycleMedian: cycleAgg(v_bdac_cycle_time(rows, range, "SENT_TO_SIGNED")).median,
      cohort,
    };
  }, [demo, lifecycles]);
}

export function useWelcomeBackPending(demo: boolean) {
  const { tickets } = useWelcomeBackSource(demo);
  return wbGroups(tickets, wbActorOf("BDM", null), false).find((g) => g.key === "pending")?.rows.length ?? 0;
}

export function useOrmSignals(demo: boolean) {
  useMeetingSurveyData();
  const flags = getSurveyFlags(demo).filter((f) => f.status === "OPEN");
  const tasks = useCoachingTasks(demo);
  const openTasks = (svc: "ORM" | "MARCOM") => tasks.filter((t) => t.service === svc && t.status !== "RESOLVED");
  return {
    flagsOpen: (svc: "ORM" | "MARCOM") => flags.filter((f) => f.service === svc),
    lowScore: (svc: "ORM" | "MARCOM") => flags.filter((f) => f.service === svc && f.rule === "SURVEY_LOW_SCORE").length,
    openTasks,
  };
}

export function useFunnelNumbers(period?: { from: string; to: string }) {
  const orm = useMeetingFunnel("ORM", period).f;
  const mc = useMeetingFunnel("MARCOM", period).f;
  return { orm, mc };
}

export function usePartnerBillNumbers(demo: boolean) {
  const d = usePartnerData();
  const today = suiteToday(demo);
  const t = billTiles(d, today);
  const overdue = d.partner_bills.filter((b) => billView(b, today) === "OVERDUE");
  return { pendingThb: t.pending["THB"] ?? 0, overdueN: overdue.length, overdueThb: t.overdue["THB"] ?? 0, data: d, today,
    due: d.partner_bills.filter((b) => { const v = billView(b, today); return v === "PENDING" || v === "OVERDUE"; }) };
}

export function useCategoryRequestsPending(demo: boolean) {
  return categoryRequests.all(demo).filter((r) => r.status === "PENDING");
}
export function useAutoTicketsOpen() {
  return useTickets().filter((t) => t.target_dept === "AUTO" && t.status !== "DONE" && t.status !== "CANCELLED").length;
}
export function useRoster() {
  const { members } = useHrMembers();
  return members.filter((m) => m.active);
}
export { useDebtHeadline };
