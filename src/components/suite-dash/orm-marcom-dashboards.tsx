/* Patch B DB4 / DB5 — ORM and Marcom Dashboards. Real: PS header, Meeting & Survey funnel (mounted), survey flags,
 * Coaching tasks, service tickets. Sample: Snapshot / RevMax / Content / KOL / Upsell. The existing assign list stays last. Read only. */
import type { ReactNode } from "react";
import { MeetingFunnel } from "@/components/ps/meeting-tab-r1";
import { MARCOM_SAMPLE_SOURCE, CONTENT_PLAN, KOL, UPSELL } from "@/lib/suite-dashboards/marcom-dashboard-sample";
import { ORM_SAMPLE_SOURCE, REVMAX_TEAMS, SNAPSHOT_SENT } from "@/lib/suite-dashboards/orm-dashboard-sample";
import { CardGrid, DashHeader, DCard, HBars, Tile, TileStrip, suiteToday, thb, useDashPeriod, useSuiteDemo } from "./kit";
import { SuiteDashProvider, useFunnelNumbers, useOrmSignals, usePsHeadline, useTicketCounts } from "./sources";

function Gate({ children }: { children: (demo: boolean) => ReactNode }) {
  const demo = useSuiteDemo();
  if (demo == null) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  return <SuiteDashProvider demo={demo}>{children(demo)}</SuiteDashProvider>;
}

export function OrmDashboard({ assign }: { assign: ReactNode }) {
  return <Gate>{(demo) => <OrmBody demo={demo} assign={assign} />}</Gate>;
}
function OrmBody({ demo, assign }: { demo: boolean; assign: ReactNode }) {
  const { period, control } = useDashPeriod(suiteToday(demo));
  const h = usePsHeadline(demo);
  const f = useFunnelNumbers(period).orm;
  const sig = useOrmSignals(demo);
  const tk = useTicketCounts()("ORM");
  const flags = sig.flagsOpen("ORM");
  const tasks = sig.openTasks("ORM");
  return (
    <div className="space-y-4" data-testid="orm-dashboard">
      <DashHeader app="ORM App" title="ORM Dashboard" period={period.label} control={control} demo={demo} />
      <TileStrip>
        <Tile label="สัญญา ORM ใช้งาน" value={h.orm.active} now testId="orm-tile-active" />
        <Tile label="Online Meeting นัดได้ / โควตา" value={`${f.booked.total} / ${f.quota}`} testId="orm-tile-meet" />
        <Tile label="Snapshot Report ส่งแล้ว / ทั้งหมด" value={`${SNAPSHOT_SENT.sent} / ${SNAPSHOT_SENT.total}`} sample={ORM_SAMPLE_SOURCE.snapshot} />
        <Tile label="ธง Survey เปิดอยู่" value={flags.length} now tone={flags.length ? "bad" : undefined} testId="orm-tile-flags" />
      </TileStrip>
      <CardGrid>
        <div className="lg:col-span-2" data-testid="dash-mounted-funnel"><MeetingFunnel svc="ORM" period={period} /></div>
        <DCard demo={demo} title="② รายได้เทียบเป้า (RevMax)" question="ทีมไหนถึงเป้ารายได้แล้ว?" info="รายได้ที่โรงแรมได้จาก OTA ต่อทีม ORM เทียบเป้าเดือนนี้" sample={ORM_SAMPLE_SOURCE.revmax}>
          <HBars rows={REVMAX_TEAMS.map((t) => ({ ...t, value: Math.round(t.value / 1000), target: Math.round(t.target / 1000) }))} unit="k" />
        </DCard>
        <DCard demo={demo} title="③ ธงและงาน Coaching ของทีม ORM" question="ธงไหนยังเปิด และงาน Coaching ปิดหรือยัง?" info="ธงจาก Survey (เปิดอยู่) + งาน Coaching ที่ยังไม่ปิด ของ ORM" now href="/workspace/orm">
          <p className="mb-2 text-xs">ธงเปิด {flags.length} · งาน Coaching ยังไม่ปิด {tasks.length}</p>
          <ul className="space-y-1 text-xs">{tasks.slice(0, 5).map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.hotel}</span><span className="text-muted-foreground">{t.status === "OPEN" ? "เปิด" : "กำลัง coaching"}</span></li>)}</ul>
        </DCard>
        <DCard demo={demo} title="④ ticket ทีม ORM คงค้าง / เลยกำหนด" question="ticket ที่ส่งถึง ORM ค้างกี่ใบ เลยกำหนดกี่ใบ?" info="ticket ที่ยังไม่ Solve / ยกเลิก ของแผนก ORM (ไม่รวม FYI)" now href="/workspace/orm">
          <div className="grid grid-cols-2 gap-3"><Tile label="คงค้าง" value={tk.open} testId="orm-tk-open" /><Tile label="เลยกำหนด" value={tk.overdue} tone={tk.overdue ? "bad" : undefined} testId="orm-tk-over" /></div>
        </DCard>
        <div className="lg:col-span-2">{assign}</div>
      </CardGrid>
    </div>
  );
}

export function MarcomDashboard({ assign }: { assign: ReactNode }) {
  return <Gate>{(demo) => <McBody demo={demo} assign={assign} />}</Gate>;
}
function McBody({ demo, assign }: { demo: boolean; assign: ReactNode }) {
  const { period, control } = useDashPeriod(suiteToday(demo));
  const h = usePsHeadline(demo);
  const f = useFunnelNumbers(period).mc;
  const tk = useTicketCounts()("MARCOM");
  const ch = h.channels;
  return (
    <div className="space-y-4" data-testid="marcom-dashboard">
      <DashHeader app="Marcom App" title="Marcom Dashboard" period={period.label} control={control} demo={demo} />
      <TileStrip>
        <Tile label="สัญญา Meta" value={ch.Meta.n} now testId="mc-tile-meta" />
        <Tile label="สัญญา TikTok" value={ch.TikTok.n} now testId="mc-tile-tiktok" />
        <Tile label="สัญญา Google" value={ch.Google.n} now testId="mc-tile-google" />
        <Tile label="Online Meeting นัดได้ / โควตา" value={`${f.booked.total} / ${f.quota}`} testId="mc-tile-meet" />
      </TileStrip>
      <CardGrid>
        <div className="lg:col-span-2" data-testid="dash-mounted-funnel"><MeetingFunnel svc="MARCOM" period={period} /></div>
        <DCard demo={demo} title="② Content ส่งตามแผน (B2C)" question="ใครส่ง Content ครบตามแผนแล้ว?" info="ชิ้นงานที่ส่งเทียบแผนเดือนนี้ รายคน" sample={MARCOM_SAMPLE_SOURCE.content}><HBars rows={CONTENT_PLAN} unit=" ชิ้น" /></DCard>
        <DCard demo={demo} title="③ KOL โพสต์แล้ว / รอจ่าย" question="KOL โพสต์แล้วกี่คน ยังรอจ่ายเท่าไร?" info="KOL ที่โพสต์ในเดือนนี้ และค่าตอบแทนที่ยังไม่จ่าย" sample={MARCOM_SAMPLE_SOURCE.kol}>
          <div className="grid grid-cols-2 gap-3"><Tile label="โพสต์แล้ว" value={KOL.posted} /><Tile label="รอจ่าย" value={`${KOL.waitingPay} · ${thb(KOL.waitingPayThb)}`} /></div>
        </DCard>
        <DCard demo={demo} title="④ Upsell ระหว่างทำ" question="มีดีล upsell ไหนกำลังเดิน?" info="รายการ upsell ที่ยังไม่ปิด" sample={MARCOM_SAMPLE_SOURCE.upsell}>
          <ul className="space-y-1 text-xs">{UPSELL.map((u) => <li key={u.hotel} className="flex justify-between gap-2"><span>{u.hotel} · {u.item}</span><span className="text-muted-foreground">{u.stage}</span></li>)}</ul>
        </DCard>
        <DCard demo={demo} title="⑤ ticket ทีม Marcom คงค้าง" question="ticket ที่ส่งถึง Marcom ค้างกี่ใบ?" info="ticket ที่ยังไม่ Solve / ยกเลิก ของแผนก Marcom (ไม่รวม FYI)" now href="/workspace/marcom">
          <div className="grid grid-cols-2 gap-3"><Tile label="คงค้าง" value={tk.open} testId="mc-tk-open" /><Tile label="เลยกำหนด" value={tk.overdue} tone={tk.overdue ? "bad" : undefined} /></div>
        </DCard>
        <div className="lg:col-span-2">{assign}</div>
      </CardGrid>
    </div>
  );
}
