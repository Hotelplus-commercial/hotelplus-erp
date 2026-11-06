/* Patch B DB2 — Suite Overview: one card per app the menu role can open (sidebar order), 3 highlights + ต้องดูวันนี้ + ไปที่ {App} →.
 * Numbers come from the same adapters as the app dashboards (rule 2). Read only. */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMenuRole } from "@/lib/menu-role";
import { landingOf, visibleApps, type AppKey } from "@/lib/sidebar-registry";
import { thShort } from "@/lib/card-compare";
import { TM_TARGET, TM_PEOPLE, TM_TODAY } from "@/lib/suite-dashboards/bd-dashboard-sample";
import { AUTO_TILES, AUTO_SAMPLE_SOURCE } from "@/lib/suite-dashboards/auto-dashboard-sample";
import { COMMISSION_PENDING, HR_KPI_ROUND, HR_SAMPLE_SOURCE } from "@/lib/suite-dashboards/hr-dashboard-sample";
import { usePrWaiting } from "@/components/ac/use-pr-waiting";
import { SAMPLE_TAG, demoSearch, suiteToday, thb, useSuiteDemo } from "./kit";
import {
  SuiteDashProvider, useAllOverdueTickets, useRenewalRate, useAutoTicketsOpen, useBdacNumbers, useCategoryRequestsPending, useDebtHeadline,
  useFunnelNumbers, useOrmSignals, usePartnerBillNumbers, usePsHeadline, useRoster, useWelcomeBackPending,
} from "./sources";
import { cn } from "@/lib/utils";

const DOT: Record<AppKey, string> = { BD: "bg-primary", PS: "bg-success", ORM: "bg-primary/60", MARCOM: "bg-destructive/70", AC: "bg-warning", HR: "bg-secondary-foreground", AUTO: "bg-muted-foreground", OFFICE: "bg-foreground" };
type Hi = { label: string; value: ReactNode; sample?: string };

export function SuiteOverviewPage() {
  const demo = useSuiteDemo();
  if (demo == null) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  return <SuiteDashProvider demo={demo}><Body demo={demo} /></SuiteDashProvider>;
}

function Body({ demo }: { demo: boolean }) {
  const role = useMenuRole();
  const apps = visibleApps(role);
  const ps = usePsHeadline(demo);
  const prWait = usePrWaiting(demo);
  const bdac = useBdacNumbers(demo);
  const wb = useWelcomeBackPending(demo);
  const overdue = useAllOverdueTickets();
  const rr = useRenewalRate(demo);
  const fun = useFunnelNumbers();
  const sig = useOrmSignals(demo);
  const debt = useDebtHeadline(demo);
  const pb = usePartnerBillNumbers(demo);
  const reqs = useCategoryRequestsPending(demo);
  const autoOpen = useAutoTicketsOpen();
  const roster = useRoster();
  const g = (m: { value: number; k: number; n: number } | null) => (m ? `${m.value} วัน · ${m.k} จาก ${m.n}` : "—");
  const sc = (m: { value: number; k: number; n: number } | null | undefined) => (m ? `${m.value} · ${m.k} จาก ${m.n}` : "—");

  const content: Record<AppKey, { hi: Hi[]; today: string | null }> = {
    BD: { hi: [
      { label: "Online Meeting เดือนนี้ (TM) / KPI", value: `${TM_TODAY.meetingMonth} / ${TM_TARGET.meetingKpi * TM_PEOPLE.length}`, sample: "DTAC OneCall" },
      { label: "ดีล Sent Contract ค้าง", value: bdac.sentOpen },
      { label: "WON เดือนนี้", value: bdac.won },
    ], today: `Welcome Back รอ BDM มอบหมาย ${wb}` },
    PS: { hi: [
      { label: "สัญญาใช้งาน ORM / Marcom", value: `${ps.orm.active} / ${ps.marcom.active}` },
      { label: "อัตราต่อสัญญา (ไตรมาส)", value: rr.pct == null ? "—" : `${rr.pct.toFixed(1)}% · ${rr.renewed} จาก ${rr.decided}` },
      { label: "เวลา Go Live (ฐานนิยม) ORM", value: g(ps.orm.golive.mode) },
    ], today: `ขาดอายุ รอผล ${ps.lapsed} · ticket เลยกำหนด ${overdue}` },
    ORM: { hi: [
      { label: "Online Meeting นัดได้ / โควตา", value: `${fun.orm.booked.total} / ${fun.orm.quota}` },
      { label: "คะแนน Survey ORM (ฐานนิยม)", value: sc(ps.orm.score?.mode) },
      { label: "ธงคะแนนต่ำ", value: sig.lowScore("ORM") },
    ], today: `งาน Coaching ยังไม่ปิด ${sig.openTasks("ORM").length}` },
    MARCOM: { hi: [
      { label: "สัญญา Meta", value: ps.channels.Meta.n },
      { label: "สัญญา TikTok", value: ps.channels.TikTok.n },
      { label: "สัญญา Google", value: ps.channels.Google.n },
    ], today: `ขาดโควตาประชุม ${fun.mc.short_quota}` },
    AC: { hi: [
      { label: "ลูกหนี้คงค้าง (ไม่รวมตัดสูญ)", value: debt.empty ? "—" : thb(debt.debtTotal) },
      { label: "สัดส่วนเกรด A+B", value: debt.abPct == null ? "—" : `${debt.abPct}%` },
      { label: "บิล Partner รอจ่าย", value: thb(pb.pendingThb) },
      { label: "ใบแจ้งหนี้รอ Production Report", value: prWait },
    ], today: `บิล Partner เลยกำหนด ${pb.overdueN}` },
    HR: { hi: [
      { label: "พนักงาน active", value: roster.length },
      { label: "รอบคำนวณ commission รออนุมัติ", value: COMMISSION_PENDING, sample: HR_SAMPLE_SOURCE.payroll },
      { label: `KPI รอบนี้ (${HR_KPI_ROUND.label})`, value: `${HR_KPI_ROUND.submitted} / ${HR_KPI_ROUND.total}`, sample: HR_SAMPLE_SOURCE.kpi },
    ], today: null },
    AUTO: { hi: [
      { label: "โปรเจกต์กำลังทำ", value: AUTO_TILES.inProgress, sample: AUTO_SAMPLE_SOURCE.pipeline },
      { label: "คำขอเพิ่มหมวด ticket รอ OGM", value: reqs.length },
      { label: "ticket AUTO คงค้าง", value: autoOpen },
    ], today: `คำขอหมวดรอ OGM ${reqs.length}` },
    OFFICE: { hi: [
      { label: "BD-AC: WIP เกิน SLA", value: `${bdac.wipOver} / ${bdac.wipN}` },
      { label: "Cycle time median (ส่ง → เซ็น)", value: bdac.cycleMedian == null ? "—" : `${bdac.cycleMedian} วัน` },
      { label: "ลูกหนี้คงค้าง", value: debt.empty ? "—" : thb(debt.debtTotal) },
    ], today: null },
  };

  return (
    <div className="space-y-4" data-testid="suite-overview">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวม Meridia Suite</h1>
        <p className="text-sm text-muted-foreground">ไฮไลต์ของแต่ละแอป · {thShort(suiteToday(demo))}{demo && <span className="ml-2 font-semibold text-warning-foreground">DEMO</span>}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {apps.map((a) => {
          const c = content[a.key];
          const href = landingOf(a, role);
          return (
            <section key={a.key} className="flex flex-col gap-3 rounded-xl border bg-card p-4" data-testid={`ov-app-${a.key}`}>
              <h2 className="flex items-center gap-2 font-semibold"><span className={cn("size-2.5 rounded-full", DOT[a.key])} />{a.label}</h2>
              <div className="grid grid-cols-3 gap-3">
                {c.hi.map((h) => (
                  <div key={h.label} className="min-w-0">
                    <div className="text-xl font-bold tabular-nums">{h.value}</div>
                    <div className="text-[11px] text-muted-foreground">{h.label}</div>
                    {h.sample && <div className="mt-0.5 text-[10px]" data-testid="dash-sample"><span className="rounded bg-warning/15 px-1 font-semibold text-warning-foreground">{SAMPLE_TAG}</span> <span className="text-muted-foreground">ที่มา (เมื่อเชื่อมแล้ว): {h.sample}</span></div>}
                  </div>
                ))}
              </div>
              {c.today && <p className="rounded-md bg-muted/50 px-3 py-2 text-xs"><b>ต้องดูวันนี้:</b> {c.today}</p>}
              {href && <Link to={href as never} search={demoSearch(demo) as never} className="self-end text-sm font-semibold text-primary hover:underline" data-testid={`ov-go-${a.key}`}>ไปที่ {a.label} →</Link>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
