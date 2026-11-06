/* Patch B DB6 / DB7 / DB8 — AC, HR (top section) and AUTO Dashboards. Read only. */
import { InfoTip } from "./kit";
import type { ReactNode } from "react";
import { DebtorCardR11, PaidGradeCard } from "@/components/ps/debt-cards-r11";
import { PartnerBillCostCard } from "@/components/ac/partner-bills-page";
import { partnerContracts } from "@/lib/partner-contracts";
import { FUNCTION_LABEL } from "@/lib/hr-members";
import { AC_SAMPLE_SOURCE, COMMISSION_DUE, MISC_DUE } from "@/lib/suite-dashboards/ac-dashboard-sample";
import { COMMISSION_PENDING, COMMISSION_ROUNDS, HR_MOVES, HR_SAMPLE_SOURCE } from "@/lib/suite-dashboards/hr-dashboard-sample";
import { AUTO_SAMPLE_SOURCE, AUTO_TILES, PIPELINE_STEPS, TOOL_CATALOG } from "@/lib/suite-dashboards/auto-dashboard-sample";
import { CardGrid, DashHeader, DCard, DetailLink, HBars, SampleBadge, Tile, TileStrip, suiteToday, thb, useDashPeriod, useSuiteDemo } from "./kit";
import { SuiteDashProvider, useCategoryRequestsPending, useDebtHeadline, usePartnerBillNumbers, useRoster } from "./sources";

function Gate({ children }: { children: (demo: boolean) => ReactNode }) {
  const demo = useSuiteDemo();
  if (demo == null) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  return <SuiteDashProvider demo={demo}>{children(demo)}</SuiteDashProvider>;
}

/* ---------------- AC ---------------- */
export function AcDashboardPage() { return <Gate>{(demo) => <AcBody demo={demo} />}</Gate>; }
function AcBody({ demo }: { demo: boolean }) {
  const { period, control } = useDashPeriod(suiteToday(demo));
  const debt = useDebtHeadline(demo);
  const pb = usePartnerBillNumbers(demo);
  const contracts = partnerContracts(pb.data, demo);
  const prWait = usePrWaiting(demo);
  return (
    <div className="space-y-4" data-testid="ac-dashboard">
      <DashHeader app="AC App" title="AC Dashboard" period={period.label} control={control} demo={demo} extra={<DetailLink href="/ac/pnl" demo={demo} label="P&L →" />} />
      <TileStrip>
        <Tile label="ลูกหนี้คงค้าง ฿ (ไม่รวมตัดสูญ)" value={debt.empty ? "—" : thb(debt.debtTotal)} sub={debt.empty ? undefined : `${debt.debtN} สัญญา`} now testId="ac-tile-debt" />
        <Tile label="% ชำระตรงเกรด A+B (รอบล่าสุด)" value={debt.abPct == null ? "—" : `${debt.abPct}%`} sub={debt.gradeTotal ? `จาก ${debt.gradeTotal} สัญญา` : undefined} now testId="ac-tile-ab" />
        <Tile label="บิล Partner รอจ่าย ฿" value={thb(pb.pendingThb)} sub={pb.overdueN ? `เลยกำหนด ${pb.overdueN} ใบ` : undefined} now testId="ac-tile-pb" />
        <Tile label="ใบแจ้งหนี้รอ Production Report" value={prWait} sub="เลยตัดรอบ ยังไม่พร้อมวางบิล" now testId="ac-tile-pr" />
      </TileStrip>
      <CardGrid>
        <div data-testid="dash-mounted-grade"><PaidGradeCard demo={demo} /></div>
        <div data-testid="dash-mounted-debtor"><DebtorCardR11 demo={demo} /></div>
        <div data-testid="dash-mounted-pb"><PartnerBillCostCard d={pb.data} contracts={contracts} today={pb.today} /><div className="mt-2 text-right"><DetailLink href="/ac/partner-bills" demo={demo} /></div></div>
        <DCard demo={demo} title="④ รายการจ่ายที่ต้องทำ" question="ต้องจ่ายอะไร เมื่อไร เท่าไร?" info="บิล Partner รอจ่าย / เลยกำหนด (จริง) + รอบ commission และรายการอื่น (ตัวอย่าง)" href="/ac/partner-bills">
          <ul className="space-y-1 text-xs" data-testid="ac-pay-real">{pb.due.slice(0, 6).map((b) => <li key={b.id} className="flex justify-between gap-2"><span>บิล Partner {b.bill_no}</span><span className="tabular-nums">{thb(b.total)} · {b.due_date ?? "—"}</span></li>)}{!pb.due.length && <li className="text-muted-foreground">ไม่มีบิล Partner รอจ่าย</li>}</ul>
          <div className="mt-3 space-y-1 border-t pt-2 text-xs">
            <SampleBadge source={`${AC_SAMPLE_SOURCE.commission} · ${AC_SAMPLE_SOURCE.misc}`} />
            {[...COMMISSION_DUE, ...MISC_DUE].map((r) => <div key={r.label} className="flex justify-between gap-2"><span>{r.label}</span><span className="tabular-nums">{thb(r.amount)} · {r.due}</span></div>)}
          </div>
        </DCard>
      </CardGrid>
    </div>
  );
}
/* ---------------- HR (top section; the old HR Overview stays below) ---------------- */
export function HrDashboardTop() { return <Gate>{(demo) => <HrBody demo={demo} />}</Gate>; }
function HrBody({ demo }: { demo: boolean }) {
  const { period, control } = useDashPeriod(suiteToday(demo));
  const roster = useRoster();
  const byFn = Object.entries(roster.reduce<Record<string, number>>((m, r) => { const k = FUNCTION_LABEL[r.function] ?? r.function; m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([label, value]) => ({ label, value }));
  return (
    <div className="space-y-4" data-testid="hr-dashboard-top">
      <DashHeader app="HR App" title="HR Dashboard" period={period.label} control={control} demo={demo} />
      <TileStrip>
        <Tile label="พนักงาน active" value={roster.length} now testId="hr-tile-active" />
        <Tile label="เข้าใหม่เดือนนี้" value={HR_MOVES.joined} sample={HR_SAMPLE_SOURCE.people} />
        <Tile label="ออกเดือนนี้" value={HR_MOVES.left} sample={HR_SAMPLE_SOURCE.people} />
        <Tile label="รอบ commission รออนุมัติ" value={COMMISSION_PENDING} sample={HR_SAMPLE_SOURCE.payroll} />
      </TileStrip>
      <CardGrid>
        <DCard demo={demo} title="พนักงานตามแผนก" question="แต่ละแผนกมีคนกี่คน?" info="นับจากรายชื่อพนักงาน (HR › สมาชิก) ที่ยัง active ตามหน้าที่" now href="/hr/members"><HBars rows={byFn} unit=" คน" /></DCard>
        <DCard demo={demo} title="รอบคำนวณ commission / incentive" question="รอบไหนรออนุมัติ?" info="สถานะรอบคำนวณของ BD Commission · PS Incentive · ORM Bonus · Marcom Standard Line" sample={HR_SAMPLE_SOURCE.payroll}>
          <ul className="space-y-1 text-xs">{COMMISSION_ROUNDS.map((r) => <li key={r.label} className="flex justify-between gap-2"><span>{r.label} · {r.round}</span><span className={r.status === "รออนุมัติ" ? "font-semibold text-warning-foreground" : "text-muted-foreground"}>{r.status}</span></li>)}</ul>
        </DCard>
      </CardGrid>
      <h2 className="pt-2 text-sm font-semibold text-muted-foreground">HR Overview (เดิม)</h2>
    </div>
  );
}

/* ---------------- AUTO ---------------- */
export function AutoDashboardPage() { return <Gate>{(demo) => <AutoBody demo={demo} />}</Gate>; }
function AutoBody({ demo }: { demo: boolean }) {
  const { period, control } = useDashPeriod(suiteToday(demo));
  const reqs = useCategoryRequestsPending(demo);
  const s = AUTO_SAMPLE_SOURCE.pipeline;
  return (
    <div className="space-y-4" data-testid="auto-dashboard">
      <DashHeader app="AUTO APP" title="AUTO Dashboard" period={period.label} control={control} demo={demo} />
      <TileStrip>
        <Tile label="โปรเจกต์กำลังทำ" value={AUTO_TILES.inProgress} sample={s} />
        <Tile label="รอ Management อนุมัติ" value={AUTO_TILES.waitingApproval} sample={s} />
        <Tile label="UAT สัปดาห์นี้" value={AUTO_TILES.uatThisWeek} sample={s} />
        <Tile label="คำขอเพิ่มหมวด ticket รอ OGM" value={reqs.length} now testId="auto-tile-req" />
      </TileStrip>
      <CardGrid>
        <DCard demo={demo} wide title="① Project Pipeline ตามขั้น" question="โปรเจกต์ติดอยู่ขั้นไหน?" info="Requirement → TOR → Spec → อนุมัติ → Build → UAT → Launch" sample={s}><HBars rows={PIPELINE_STEPS} /></DCard>
        <DCard demo={demo} title="② คำขอหมวด ticket" question="มีคำขอเพิ่มหมวดรอ OGM ตัดสินกี่รายการ?" info="คำขอที่หัวหน้าแผนกส่งเมื่อชื่อหมวดซ้ำกับหมวดเดิม · OGM ตัดสินที่ AUTO Workspace" now href="/workspace/auto">
          <ul className="space-y-1 text-xs" data-testid="auto-req-list">{reqs.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.proposed_name}</span><span className="text-muted-foreground">{r.dept}</span></li>)}{!reqs.length && <li className="text-muted-foreground">ไม่มีคำขอรอ OGM</li>}</ul>
        </DCard>
        <DCard demo={demo} title="③ เครื่องมือในระบบ (Tool Catalog)" question="แต่ละแอปมีเครื่องมือกี่ตัว?" info="จำนวนเครื่องมือ / automation ต่อแอป" sample={AUTO_SAMPLE_SOURCE.tools}><HBars rows={TOOL_CATALOG} /></DCard>
      </CardGrid>
    </div>
  );
}
