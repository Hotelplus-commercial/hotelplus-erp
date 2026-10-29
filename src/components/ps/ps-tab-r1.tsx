/* Tab R1 — read-only adapters for cards ① and ⑦. Live reads the same sources as the Header R2
 * (ใช้งาน / หลุด) plus existing projections; DEMO swaps in the Tab R1 demo additions. Nothing here writes. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { readMeetingDashboard } from "@/lib/meeting-dashboard.functions";
import { COMPLETED_STATUSES } from "@/lib/meeting-dashboard-types";
import { useWs2 } from "@/lib/ws2-store";
import { useHrMembers } from "@/lib/hr-members";
import { useTickets } from "@/lib/tickets-l0";
import { useRenewalStore } from "@/lib/renewal-store";
import { debtorRows } from "@/lib/ac-revenue";
import { roiSeries, trailingValueRatio } from "@/lib/account-health";
import { isRecurringService, type PsReport, type PsReportRow } from "@/lib/ps-dashboard-types";
import { addDays, type BaseContract, type EndReason, type ServiceContract, type SignalInputs, type Svc, type TabR1Data } from "@/lib/contract-tab-r1";
import { tabR1Demo } from "@/lib/contract-tab-r1-demo";
import { useHeaderR2, type HeaderData } from "./use-header-r2";
import { useAcViews } from "./use-ac-views";
import { PsReportTab } from "./ps-report-tab";

const svcOf = (v: unknown): Svc | null => (v === "ORM" ? "ORM" : v === "Marcom" || v === "MARCOM" ? "Marcom" : null);
const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export function useTabR1(demo: boolean, raw: PsReport | undefined, header: HeaderData): TabR1Data | undefined {
  const ws2 = useWs2();
  const { nick } = useHrMembers();
  const tickets = useTickets();
  const renewal = useRenewalStore();
  const ac = useAcViews();
  const readMeeting = useServerFn(readMeetingDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const meeting = useQuery({ queryKey: ["meeting-dashboard-views"], queryFn: () => readMeeting(), staleTime: 60_000, enabled: ready && !demo });
  return useMemo(() => {
    if (demo) return tabR1Demo();
    if (!raw) return undefined;
    const today = header.today;
    const now = new Date(today + "T00:00:00Z");
    const v = raw.views;
    const lifetime = v.v_ps_contract_lifetime ?? [];
    const renewals = v.v_ps_renewal ?? [];
    /* ---------- card ① contracts ---------- */
    const outcome = (cid: string) => renewals.find((r) => String(r.contract_id) === cid)?.outcome;
    const linked = new Map(renewal.requests.filter((r) => r.new_contract_id).map((r) => [String(r.new_contract_id), r.source_contract_id]));
    const flowRows = (v.v_ps_lifecycle_flow ?? []).filter(isRecurringService);
    const flow: ServiceContract[] = flowRows.flatMap((r) => {
      const s = svcOf(r.service_line); const cid = str(r.contract_id); const start = str(r.start_date) ?? str(r.created_at);
      if (!s || !cid || !start) return [];
      const end = str(r.inactivated_at);
      const termEnd = str(lifetime.find((l) => String(l.contract_id) === cid)?.end_date);
      const o = outcome(cid);
      const reason: EndReason | null = !end ? null : o === "RENEWED" ? "RENEWAL" : o === "NOT_RENEWED" || o === "LOST" ? "NOT_RENEWED" : termEnd && end.slice(0, 10) < addDays(termEnd, -1) ? "EARLY_TERMINATION" : "NOT_RENEWED";
      return [{ contract_id: cid, hotel_id: String(r.hotel_id ?? ""), hotel_name: String(r.hotel_name ?? r.hotel_id ?? ""), service: s, start, end, end_reason: reason, renewal_of: linked.get(cid) ?? null }];
    });
    // Renewal continuation without an explicit link: same hotel + service, previous contract handed over as RENEWAL within 31 days before this start.
    for (const c of flow) if (!c.renewal_of) {
      const prev = flow.find((p) => p !== c && p.hotel_id === c.hotel_id && p.service === c.service && p.end_reason === "RENEWAL" && p.end && p.end.slice(0, 10) <= c.start.slice(0, 10) && p.end.slice(0, 10) >= addDays(c.start, -31));
      if (prev) c.renewal_of = prev.contract_id;
    }
    /* ---------- card ⑦ rows (same set as header “ใช้งาน”) ---------- */
    const active = header.journey.active;
    const activeToday = { ORM: active.filter((a) => a.service === "ORM").length, Marcom: active.filter((a) => a.service === "Marcom").length };
    const acViews = ac.data as Record<string, PsReportRow[]> | undefined;
    const debtRaw = acViews?.["v_ac_debtors"];
    const debts = debtorRows(debtRaw ?? []);
    const roi = v.v_ps_roi ?? [];
    const health = v.v_ps_account_health ?? [];
    const funnel = ((meeting.data as { views?: Record<string, PsReportRow[]> } | undefined)?.views?.["v_meeting_funnel"] ?? []) as PsReportRow[];
    const closedMonths = [1, 2, 3].map((k) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); return d.toISOString().slice(0, 7); });
    const servicesOf = (hid: string) => new Set(active.filter((a) => a.hotel_id === hid).map((a) => a.service)).size;
    const base: BaseContract[] = active.map((a) => {
      const lt = lifetime.find((r) => String(r.hotel_id) === a.hotel_id && svcOf(r.service_line) === a.service && r.status === "ACTIVE");
      const fr = flowRows.find((r) => String(r.hotel_id) === a.hotel_id && svcOf(r.service_line) === a.service && !r.inactivated_at);
      const cid = str(lt?.contract_id) ?? str(fr?.contract_id) ?? `${a.hotel_id}|${a.service}`;
      const age = num(lt?.age_days);
      const start = age != null ? addDays(today, -age) : str(fr?.start_date);
      const p = ws2.properties.find((x) => x.hotel_id === a.hotel_id);
      const prof = ws2.profiles.find((x) => x.property_id === a.hotel_id && (a.service === "ORM" ? x.service === "ORM" : x.service !== "ORM"));
      const ae = a.ae ?? (p?.assigned_ae_id ? nick(p.assigned_ae_id) : null);
      const inputs: SignalInputs = {};
      if (debtRaw && debtRaw.length) {
        const mine = debts.filter((d) => d.hotel_id === a.hotel_id);
        inputs.overdue_this = mine.some((d) => svcOf(d.service_line) === a.service && (d.overdue_months ?? 0) > 0);
        inputs.overdue_other = mine.some((d) => svcOf(d.service_line) !== a.service && (d.overdue_months ?? 0) > 0);
      }
      const g = header.journey.grades.rows.find((x) => x.hotel_id === a.hotel_id && x.service === a.service);
      inputs.grade = g?.grade ?? null;
      if (a.service === "ORM") {
        const series = roiSeries(roi, a.hotel_id, now);
        inputs.value_ratio = trailingValueRatio(series);
        inputs.rev_achievement_pct = num(series.at(-1)?.achievement_pct);
      }
      const hr = health.find((r) => String(r.hotel_id) === a.hotel_id && svcOf(r.service_line) === a.service) ?? health.find((r) => String(r.hotel_id) === a.hotel_id);
      inputs.pi_incomplete = hr?.completeness == null ? null : hr.completeness !== "complete";
      inputs.entity_change_ticket = tickets.some((t) => t.type === "CUSTOMER_ENTITY_CHANGE" && t.subject_ref.hotel_id === a.hotel_id && t.status !== "CANCELLED" && t.status !== "DONE");
      const cards = funnel.filter((r) => String(r.hotel_id) === a.hotel_id && (r.service_line == null || svcOf(r.service_line) === a.service));
      if (cards.some((r) => closedMonths.includes(String(r["card_month"] ?? "").slice(0, 7)))) {
        inputs.missed_meetings_3m = closedMonths.filter((m) => (!start || m >= start.slice(0, 7)) && !cards.some((r) => String(r["card_month"] ?? "").startsWith(m) && COMPLETED_STATUSES.includes(String(r.status)))).length;
      }
      inputs.single_service = servicesOf(a.hotel_id) === 1;
      return {
        contract_id: cid, hotel_id: a.hotel_id, hotel_name: a.hotel_name ?? a.hotel_id,
        hotel_name_th: p?.hotel_name_th || a.hotel_name || null, hotel_name_en: p?.hotel_name_en && p.hotel_name_en !== p.hotel_name_th ? p.hotel_name_en : null,
        service: a.service, ae, orm_team: prof?.orm_team ?? a.orm, marcom: prof?.marcom_member_id ? nick(prof.marcom_member_id) : a.marcom,
        start, term_end: str(lt?.end_date), inputs,
      };
    });
    return { today, demo: false, flow, activeToday, base, seedTickets: [] };
  }, [demo, raw, header, ws2.properties, ws2.profiles, nick, tickets, renewal, ac.data, meeting.data]);
}

/** Tab "ต่อสัญญา & ราคา" with the Tab R1 data feed (mounted by the dashboard shell inside its providers). */
export function PsReportWithR1({ raw, demo, ...props }: ComponentProps<typeof PsReportTab> & { raw: PsReport | undefined; demo: boolean }) {
  const header = useHeaderR2(demo, raw);
  const r1 = useTabR1(demo, raw, header);
  return <PsReportTab {...props} r1={r1} />;
}
