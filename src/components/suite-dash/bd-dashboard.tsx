/* Patch B DB3 — BD Dashboard (tabs TM / BD). Real: BD-AC lines, Welcome Back, SP9 Meeting Analyzer sample. Rest = sample. Read only. */
import { useState } from "react";
import { BdacCohortBars } from "@/components/ps/bdac-tab";
import { useMenuRole } from "@/lib/menu-role";
import { SIDEBAR_REGISTRY } from "@/lib/sidebar-registry";
import { MA_FLAGS, MA_TILES } from "@/lib/bd/meeting-analyzer-sample";
import { BD_OPEN_DEALS, BD_PIPELINE, BD_SAMPLE_SOURCE, SPECIAL_DEAL_PENDING, TM_FUNNEL, TM_PEOPLE, TM_TARGET, TM_TODAY, TM_TREND } from "@/lib/suite-dashboards/bd-dashboard-sample";
import { CardGrid, DashHeader, DCard, HBars, Tile, TileStrip, suiteToday, useDashPeriod, useSuiteDemo } from "./kit";
import { SuiteDashProvider, useBdacNumbers, useWelcomeBackPending } from "./sources";
import { cn } from "@/lib/utils";

export function BdDashboardPage() {
  const demo = useSuiteDemo();
  if (demo == null) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  return <SuiteDashProvider demo={demo}><Body demo={demo} /></SuiteDashProvider>;
}

function Body({ demo }: { demo: boolean }) {
  const role = useMenuRole();
  const tabs = (SIDEBAR_REGISTRY[0]!.nodes[0] as { tabs?: { key: string; label: string; access?: string[] }[] }).tabs ?? [];
  const allowed = tabs.filter((t) => !t.access || t.access.includes(role));
  const [tab, setTab] = useState<string>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab")) || "");
  const active = allowed.find((t) => t.key === tab)?.key ?? allowed[0]?.key ?? "tm";
  const { period, control } = useDashPeriod(suiteToday(demo));
  return (
    <div className="space-y-4" data-testid="bd-dashboard">
      <DashHeader app="BD APP" title="BD Dashboard" period={period.label} control={control} demo={demo} />
      <div className="flex gap-1 border-b" role="tablist">
        {allowed.map((t) => (
          <button key={t.key} role="tab" aria-selected={active === t.key} onClick={() => setTab(t.key)}
            className={cn("border-b-2 px-3 py-2 text-sm", active === t.key ? "border-primary font-semibold" : "border-transparent text-muted-foreground")}>{t.label}</button>
        ))}
      </div>
      {active === "tm" ? <TmTab demo={demo} /> : <BdTab demo={demo} />}
    </div>
  );
}

function TmTab({ demo }: { demo: boolean }) {
  const s = BD_SAMPLE_SOURCE.onecall;
  return (
    <div className="space-y-4" data-testid="bd-tab-tm">
      <TileStrip>
        <Tile label="Call วันนี้ / 100 ต่อคน" value={`${TM_TODAY.call}`} sub={`เป้า ${TM_TARGET.call} × ${TM_PEOPLE.length} คน`} sample={s} />
        <Tile label="Answer / 50 ต่อคน" value={`${TM_TODAY.answer}`} sub={`เป้า ${TM_TARGET.answer} × ${TM_PEOPLE.length} คน`} sample={s} />
        <Tile label="Online Meeting เดือนนี้ / KPI" value={`${TM_TODAY.meetingMonth} / ${TM_TARGET.meetingKpi * TM_PEOPLE.length}`} sample={`${s} + Meeting Analyzer bookings`} />
        <Tile label="Lead ใหม่ (Pulse)" value={TM_TODAY.leadsNew} sample={BD_SAMPLE_SOURCE.pulse} />
      </TileStrip>
      <CardGrid>
        <DCard demo={demo} title="① Funnel ลีดวันนี้" question="ลีดวันนี้ไปถึงนัด Online Meeting เท่าไร?" info="Lead → Call → Answer → นัด Online Meeting ของทั้งทีม TM วันนี้" sample={s} href="/bd/lead-tracker">
          <HBars rows={TM_FUNNEL} />
        </DCard>
        <DCard demo={demo} title="② รายคน: Call · Answer · Meeting เทียบ KPI" question="ใครถึง KPI แล้ว ใครยังไม่ถึง?" info="Call / Answer วันนี้เทียบเป้ารายวัน · Meeting เดือนนี้เทียบ KPI รายเดือน" sample={s} href="/bd/call-monitor">
          <div className="space-y-3">
            {TM_PEOPLE.map((p) => (
              <div key={p.name}><div className="mb-1 text-xs font-semibold">{p.name}</div>
                <HBars rows={[{ label: "Call", value: p.call, target: TM_TARGET.call }, { label: "Answer", value: p.answer, target: TM_TARGET.answer }, { label: "Meeting", value: p.meeting, target: TM_TARGET.meetingKpi }]} max={120} />
              </div>
            ))}
          </div>
        </DCard>
        <DCard demo={demo} wide title="③ แนวโน้ม 30 วัน" question="Call และ Meeting ต่อวันดีขึ้นหรือแย่ลง?" info="ยอดรวมทั้งทีมต่อวัน 30 วันล่าสุด" sample={s} href="/bd/call-monitor">
          <div className="flex h-32 items-end gap-0.5">
            {TM_TREND.map((d) => <div key={d.day} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(d.call / 450) * 100}%` }} title={`วันที่ ${d.day}: Call ${d.call} · Meeting ${d.meeting}`} />)}
          </div>
        </DCard>
      </CardGrid>
    </div>
  );
}

function BdTab({ demo }: { demo: boolean }) {
  const b = useBdacNumbers(demo);
  const wb = useWelcomeBackPending(demo);
  const [sel, setSel] = useState<string | null>(null);
  const selected = b.cohort.find((c) => c.month === sel) ?? b.cohort[b.cohort.length - 2] ?? b.cohort[0];
  return (
    <div className="space-y-4" data-testid="bd-tab-bd">
      <TileStrip>
        <Tile label="ดีลค้างทั้งหมด" value={BD_OPEN_DEALS} sample={BD_SAMPLE_SOURCE.pipedrive} />
        <Tile label="Sent Contract ค้าง" value={b.sentOpen} now testId="bd-tile-sent" />
        <Tile label="WON เดือนนี้" value={b.won} testId="bd-tile-won" />
        <Tile label="คะแนน Meeting Analyzer เฉลี่ย" value={`${MA_TILES.teamAvg}/100`} sample="BD Meeting Analyzer" />
      </TileStrip>
      <CardGrid>
        <DCard demo={demo} title="① Pipeline ตาม stage" question="ดีลค้างอยู่ stage ไหนมากที่สุด?" info="จำนวนดีลที่ยังเปิดตาม stage ของ Pipedrive" sample={BD_SAMPLE_SOURCE.pipedrive} href="/bd/lead-tracker">
          <HBars rows={BD_PIPELINE} />
        </DCard>
        <DCard demo={demo} title="② Sent Contract → WON" question="ส่งสัญญาเดือนไหน ปิด WON ครบตาม KPI 100% หรือยัง?" info="การ์ดเดียวกับ The Office Dashboard › BD-AC ③ (ไม่ใช้ตัวกรองของหน้านั้น)" href="/the-office-app/dashboard">
          {selected && <p className="mb-2 text-xs text-muted-foreground">cohort {selected.month} · WON {selected.won}/{selected.size}</p>}
          <BdacCohortBars cohort={b.cohort} selected={selected} onSelect={setSel} />
        </DCard>
        <DCard demo={demo} title="③ Flag ต้อง coaching" question="BD คนไหนต้อง coaching เรื่องอะไรก่อน?" info="5 รายการแรกจาก Flag Alert Board ของ Meeting Analyzer" sample="BD Meeting Analyzer" href="/bd/meeting-analyzer">
          <ul className="space-y-2 text-xs">{MA_FLAGS.slice(0, 5).map((f, i) => <li key={i} className="rounded border border-destructive/30 bg-destructive/5 p-2"><b className="text-destructive">{f.text}</b><div className="text-muted-foreground">{f.hotel} · {f.bd}</div></li>)}</ul>
        </DCard>
        <DCard demo={demo} title="④ Welcome Back / Special Deal รอดำเนินการ" question="มีงานรอ BDM มอบหมายหรืออนุมัติกี่รายการ?" info="Welcome Back = ticket จริงที่รอ BDM มอบหมาย · Special Deal = ข้อมูลตัวอย่าง" href="/bd/tickets">
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Welcome Back รอ BDM มอบหมาย" value={wb} now testId="bd-tile-wb" />
            <Tile label="Special Deal รออนุมัติ" value={SPECIAL_DEAL_PENDING} sample={BD_SAMPLE_SOURCE.specialDeal} />
          </div>
        </DCard>
      </CardGrid>
    </div>
  );
}
