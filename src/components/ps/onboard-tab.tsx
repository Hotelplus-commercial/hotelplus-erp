/* PS Dashboard · Tab On-board / Off-board R1 (OB1–OB24). Read only: the only write in this round is a settings version
 * saved by PM on Settings › SLA On-board. "สร้าง ticket ติดตาม" reuses the SV11 action (createServicingStall) unchanged;
 * "เปิดการ์ด On-board" reuses ServicingCardDrawer. Rules: src/lib/onboard-tab.ts. Text: ps-glossary (onboard*). */
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ServicingCardDrawer } from './servicing-dashboard';
import { useDashboardGlobal } from '@/lib/ps-dashboard-global';
import { useServicing } from '@/lib/ps-servicing';
import { useHrMembers, type HrMember } from '@/lib/hr-members';
import { readServicingDashboard } from '@/lib/servicing-dashboard.functions';
import type { ServicingRow } from '@/lib/servicing-dashboard-types';
import { cardStatus, servicingLanes, stallEventKey } from '@/lib/servicing-time';
import { createServicingStall, stallRouting } from '@/lib/servicing-stall';
import { OPEN_STATUSES, useTickets } from '@/lib/tickets-l0';
import { inputFromRow } from './use-setup-timing';
import { bkkDate, dayMonth, getSetupTiming, type LaneKey, type SetupSvc } from '@/lib/setup-timing';
import { useSetupKpiVersions, versionFor, type KpiValues } from '@/lib/setup-kpi-settings';
import { monthKey, monthLabel, thDate } from '@/lib/contract-age';
import { onboardDemo, demoHrOverlay, ONB_DEMO_TEAMS, ONB_DEMO_TODAY } from '@/lib/onboard-tab-demo';
import {
  ONB_PAGE, customRangeError, doneStatus, inLastMonths, lastMonthsList, liveSort, matchSearch, mostRange, ownerLine1, ownerLine2, pctToneOf,
  personStats, queueChipMatch, queueSort, rangeLabel, rangeMonths, stagePhase, teamText, vOnbCards, vOnbDays, vOnbOverall, vOnbOwners, vOnbPipeline, wentInMonths,
  type DayLeft, type OnbCard, type QueueChip, type RangeSel, type StageKey, type Tone,
} from '@/lib/onboard-tab';
import { ONB_PHASE, onboardStages, onboardTips } from '@/lib/ps-glossary';
import { cn } from '@/lib/utils';

const SVC_TH = (s: SetupSvc) => (s === 'ORM' ? 'ORM' : 'Marcom');
const toneCls = (t: Tone) => `onb-tone-${t}`;

/* ================= feed ================= */
export type Feed = { demo: boolean; today: string; cards: OnbCard[]; rows: Map<string, ServicingRow>; members: HrMember[] };
/** `demoOverride`: pages outside the PS Dashboard (Settings › SLA On-board) pass the shared DEMO state. */
export function useOnbFeed(demoOverride?: boolean): Feed | undefined {
  const g = useDashboardGlobal(); const demo = demoOverride ?? g.demo; const filter = g.filter;
  const read = useServerFn(readServicingDashboard);
  const hr = useHrMembers();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({ queryKey: ['servicing-dashboard-views-v2'], queryFn: () => read(), enabled: ready && !demo, staleTime: 60_000 });
  const versions = useSetupKpiVersions(demo);
  return useMemo(() => {
    if (!ready && !demo) return undefined; // DEMO needs no fetch: renders on the server too
    const term = filter.search.trim().toLowerCase();
    const members = demo ? demoHrOverlay(hr.members) : hr.members;
    const today = demo ? ONB_DEMO_TODAY : bkkDate(new Date().toISOString());
    const rows = new Map<string, ServicingRow>();
    const inputs = demo ? onboardDemo() : (real.data?.rows ?? []).flatMap((r) => { const x = inputFromRow(r); if (x) rows.set(x.card_id, r); return x ? [x] : []; });
    const ts = inputs.filter((x) => !term || `${x.hotel_name} ${x.hotel_id}`.toLowerCase().includes(term)).map((x) => getSetupTiming(x, today));
    const who = {
      name: (id: string | null) => (!id ? null : demo ? id : hr.nick(id) ?? id),
      // ORM sub-team members: HR roster (active, same orm_team); DEMO adds the render's team names in memory.
      members: (team: string | null) => (!team ? [] : demo && ONB_DEMO_TEAMS[team] ? ONB_DEMO_TEAMS[team]! : members.filter((m) => m.active && m.orm_team === team && m.function.startsWith('ORM')).map((m) => m.nickname)),
    };
    return { demo, today, cards: vOnbCards(ts, versions, who), rows, members };
  }, [ready, demo, filter.search, real.data, versions, hr.members, hr]);
}

/* ================= §6.5 shared tooltip ================= */
export function InfoTip({ label = 'ความหมาย', children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open]);
  return <>
    <button ref={ref} type="button" className="onb-i" aria-label={label} aria-expanded={open}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>ⓘ</button>
    {open && ref.current && <TipLayer anchor={ref.current}>{children}</TipLayer>}
  </>;
}
function TipLayer({ anchor, children }: { anchor: Element; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  useEffect(() => {
    const r = anchor.getBoundingClientRect(); const w = box.current?.offsetWidth ?? 280; const h = box.current?.offsetHeight ?? 120;
    let left = r.left; let top = r.bottom + 6;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.right - w);
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setPos({ left, top });
  }, [anchor]);
  return createPortal(<div ref={box} role="tooltip" className="onb-tip" style={{ left: pos.left, top: pos.top }}>{children}</div>, document.body);
}
const Pill = ({ d, children }: { d: { tone: Tone; flipTomorrow?: boolean }; children: ReactNode }) => <span className={cn('onb-pill', toneCls(d.tone), d.flipTomorrow && 'is-flip')}><i />{children}</span>;

/* ================= tab ================= */
export function OnboardTab() {
  const feed = useOnbFeed();
  const { demo, filter } = useDashboardGlobal();
  const servicing = useServicing();
  const tickets = useTickets();
  const [drawer, setDrawer] = useState<{ id: string; back: HTMLElement | null } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [stageSel, setStageSel] = useState<{ svc: SetupSvc; stage: StageKey } | null>(null);
  const [goLiveSvc, setGoLiveSvc] = useState<{ svc: SetupSvc; n: number } | null>(null);
  const [demoTickets, setDemoTickets] = useState<string[]>([]);
  // queue table (the only place with phase codes besides card ⑤) renders after mount, as the R4 table did
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => { setDemoTickets([]); setStageSel(null); }, [demo]);
  if (!feed) return <p className="dash-empty">กำลังโหลด…</p>;
  const { cards, today } = feed;
  const o = vOnbOverall(cards, today);
  const openDrawer = (id: string, back: HTMLElement | null = null) => setDrawer({ id, back: back ?? (document.activeElement as HTMLElement | null) });
  const closeDrawer = () => { const b = drawer?.back; setDrawer(null); setTimeout(() => b?.focus?.(), 0); };
  const openCard = (id: string) => {
    if (feed.demo) { toast.info('DEMO · ไม่มีการ์ดจริงให้เปิด'); return; }
    if (!servicing.cards.some((c) => c.id === id)) { toast.info('ยังไม่พบการ์ดนี้ในเครื่องนี้ · เปิดที่ On-boarding Process'); return; }
    setDetail(id);
  };
  const hasTicket = (id: string) => demoTickets.includes(id) || tickets.some((t) => t.type === 'SERVICING_STALL' && t.subject_ref.card_id === id && OPEN_STATUSES.includes(t.status));
  /** SV11 reused: same create + dedup (one open follow-up per card lane); DEMO = in memory only. */
  const createTicket = (c: OnbCard) => {
    if (hasTicket(c.id)) return;
    if (feed.demo) { setDemoTickets((x) => [...x, c.id]); toast.success(`DEMO · สร้าง ticket ติดตามแล้ว · ${c.t.hotel_name} (ไม่บันทึกจริง)`); return; }
    const row = feed.rows.get(c.id); const cause = row ? cardStatus(servicingLanes(row, new Date().toISOString())).cause : null;
    if (!row || !cause) { toast.info('การ์ดนี้ยังไม่มีงานที่เลยหรือใกล้กำหนดตามเกณฑ์ Servicing เดิม'); return; }
    const routing = stallRouting(cause); const r = createServicingStall(row, cause);
    toast.success(r.deduped ? `มี ticket ติดตามเปิดอยู่แล้ว (${stallEventKey(row.card_id, cause)})` : `สร้าง Ticket #${r.ticket_id} แล้ว · ส่งถึง ${routing.recipient}`);
  };
  const dc = drawer ? cards.find((c) => c.id === drawer.id) ?? null : null;
  return (
    <section className="onb space-y-4" data-testid="onb-tab">
      {feed.demo && <p className="sv-demo-mark">DEMO · {thDate(today)}</p>}
      <Legend />
      <div className="onb-tiles">
        <Tile title="การ์ดบริการทั้งหมด" tip={onboardTips.cards} value={o.cards} sub={`กำลังทำ ${o.inProg.length} · Go Live ${o.live.length}`} />
        <Tile title="โรงแรม" tip={onboardTips.hotels} value={o.hotels} sub={`มีหลายบริการ ${o.multi}`} />
        <Tile title="Go Live" tip={onboardTips.golive} value={o.live.length} sub={`ORM ${o.liveOrm} · Marcom ${o.liveMc} · ทันเป้ารวม ${o.liveOnTime}`} />
        <Tile title="กำลังดำเนินการ" tip={onboardTips.inProg} value={o.inProg.length} sub={<><Pill d={{ tone: 'red' }}>เลยกำหนด {o.late}</Pill> <Pill d={{ tone: 'amber', flipTomorrow: true }}>พรุ่งนี้เปลี่ยนสี {o.flip}</Pill></>} />
      </div>
      <section className="dash-card onb-card" id="onb-pipeline">
        <header className="onb-head">
          <div className="min-w-0">
            <h2><span className="cl-num" aria-hidden>1</span>Pipeline ตอนนี้<InfoTip>{onboardTips.pipeline}</InfoTip><span className="onb-now">ณ วันนี้</span></h2>
            <p className="cl-note">การ์ดอยู่ stage ไหน และใกล้เปลี่ยนสีแล้วหรือยัง (1 การ์ด = 1 บริการ)</p>
          </div>
          <div className="onb-head-right"><strong>{o.inProg.length} การ์ด</strong>
            <div><span className="onb-t-red">เลยกำหนด {o.late}</span> <span className="onb-t-amber">· ใกล้ถึงกำหนด {o.near}</span> · พรุ่งนี้เปลี่ยนสี {o.flip}</div></div>
        </header>
        {(['ORM', 'Marcom'] as const).map((svc) => <PipelineLane key={svc} svc={svc} cards={cards} today={today} sel={stageSel}
          onPick={(stage) => {
            if (stage === 'go_live') { setStageSel(null); setGoLiveSvc((g) => ({ svc, n: (g?.n ?? 0) + 1 })); }
            else setStageSel((s) => (s && s.svc === svc && s.stage === stage ? null : { svc, stage }));
            setTimeout(() => document.getElementById('setup-queue')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30);
          }} />)}
        {mounted && <QueueSection feed={feed} stageSel={stageSel} clearStage={() => setStageSel(null)} goLive={goLiveSvc} onOpen={openDrawer} />}
      </section>
      <OwnersCard feed={feed} />
      <OverallCard feed={feed} onOpen={openDrawer} />
      <section className="onb-off" aria-label="Off-board">
        <div><strong>Off-board · ปิดบริการและคืน Access</strong> <span className="onb-soon">Coming soon</span>
          <p>รอ checklist ปิดบริการจากทีม ORM และ Marcom (O-21) · เมื่อมีแล้วจะใช้หน้าตาเดียวกับ On-board: Pipeline · ตารางคิว · Day left · เวลาราย owner</p></div>
        <div className="onb-off-ph" aria-hidden><i /><i /><i /></div>
      </section>
      {dc && <SummaryDrawer c={dc} today={today} onClose={closeDrawer} onOpenCard={() => openCard(dc.id)}
        canTicket={filter.role === 'PM' && !dc.t.done && (dc.status.tone === 'amber' || dc.status.tone === 'red')} ticketOpen={hasTicket(dc.id)} onTicket={() => createTicket(dc)} />}
      <ServicingCardDrawer key={detail ?? 'closed'} id={detail} readOnly onClose={() => setDetail(null)} />
    </section>
  );
}

function Tile({ title, tip, value, sub }: { title: string; tip: string; value: number; sub: ReactNode }) {
  return <div className="onb-tile"><span>{title}<InfoTip>{tip}</InfoTip></span><strong>{value}</strong><small>{sub}</small></div>;
}
function Legend() {
  return <div className="onb-legend" data-testid="onb-legend"><b>สีและ Day left</b>
    <Pill d={{ tone: 'green' }}>อีก 2 วันเหลือง</Pill> ทันกำหนด
    <Pill d={{ tone: 'amber', flipTomorrow: true }}>พรุ่งนี้แดง</Pill> ใกล้ถึงกำหนด
    <Pill d={{ tone: 'red' }}>เลย 2 วัน</Pill> เลยกำหนด
    <Pill d={{ tone: 'grey' }}>รอวันประชุม</Pill> ไม่นับกำหนด
    <span className="cl-muted">นับราย stage ที่ทำอยู่ · บรรทัดรอง = เป้ารวม On-board → Go Live · กำหนดจาก <Link to="/ps/settings/sla-onboard">ตั้งค่า › SLA On-board</Link></span>
  </div>;
}

/* ================= §6 pipeline lane ================= */
function PipelineLane({ svc, cards, today, sel, onPick }: { svc: SetupSvc; cards: OnbCard[]; today: string; sel: { svc: SetupSvc; stage: StageKey } | null; onPick: (s: StageKey) => void }) {
  const cells = vOnbPipeline(cards, svc, today);
  const groups: { phase: string; n: number }[] = [];
  for (const c of cells) { const g = groups.at(-1); if (g && g.phase === c.phase) g.n++; else groups.push({ phase: c.phase, n: 1 }); }
  const cols = { gridTemplateColumns: `repeat(${cells.length}, minmax(92px, 1fr))` };
  return <div className={cn('onb-lane', svc === 'ORM' ? 'is-orm' : 'is-mc')} data-testid={`onb-lane-${svc}`}>
    <div className="onb-lane-cap"><span className={cn('sd-svc', svc === 'ORM' ? 'is-orm' : 'is-mc')}>{SVC_TH(svc)}</span> <span className="cl-muted">{svc === 'ORM' ? 'Final Setup รอ handover ก่อน Training' : 'GMB ข้าม First Sync · First Sync นับเฉพาะ MT'}</span></div>
    <div className="onb-lane-scroll"><div className="onb-lane-inner">
      <div className="onb-phase-row" style={cols}>{groups.map((g, i) => <span key={i} className={`onb-phase is-${g.phase}`} style={{ gridColumn: `span ${g.n}` }}>{ONB_PHASE[g.phase]}</span>)}</div>
      <div className="onb-stage-row" style={cols}>{cells.map((c) => {
        const tx = onboardStages[svc][c.stage]!; const live = c.stage === 'go_live'; const on = sel?.svc === svc && sel.stage === c.stage;
        const total = c.tones.red + c.tones.amber + c.tones.green + c.tones.grey;
        return <div key={c.stage} role="button" tabIndex={0} aria-pressed={on} data-stage={c.stage}
          className={cn('onb-stage', on && 'is-on', live ? 'is-live' : c.top ? `top-${c.top}` : 'top-none')}
          onClick={() => onPick(c.stage)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(c.stage); } }}>
          <span className="onb-r1" title={`${tx.name}${tx.q ? ` ${tx.q}` : ''}`}><span className="onb-name">{tx.name}</span>{tx.q && <span className="onb-q">{tx.q}</span>}</span>
          <span className="onb-r2"><b className={cn(!c.n && 'is-zero')}>{c.n}</b>
            <InfoTip label={`ความหมาย ${tx.name}`}><b>{tx.name}{tx.q ? ` ${tx.q}` : ''} · {SVC_TH(svc)}</b><p>{tx.meaning}</p><hr /><p>อยู่ช่วง {ONB_PHASE[stagePhase(svc, c.stage)]}</p><p>ใครทำ {tx.who}</p><p>จบเมื่อ {tx.end}</p></InfoTip></span>
          <span className="onb-r3">{live ? (c.n ? <i className="is-svc" style={{ width: '100%' }} /> : null) : (['red', 'amber', 'green', 'grey'] as const).map((t) => <i key={t} className={`is-${t}`} style={{ width: `${total ? (c.tones[t] / total) * 100 : 0}%` }} />)}</span>
          <span className="onb-r4">{live ? <span className="cl-muted">6 เดือนล่าสุด</span> : c.lines.map((l, i) => <span key={i} className={`onb-t-${l.tone}`}>{l.text}</span>)}</span>
        </div>;
      })}</div>
    </div></div>
  </div>;
}

/* ================= §7 queue ================= */
type Col = LaneKey | 'total';
const COLS: Col[] = ['p1', 'p2s', 'p2o', 'w', 'p3', 'total'];
const dueOf = (v: KpiValues, a: keyof KpiValues, b: keyof KpiValues) => (v[a].due === v[b].due ? `≤ ${v[a].due}` : `ORM ≤ ${v[a].due} · MC ≤ ${v[b].due}`);
function QueueSection({ feed, stageSel, clearStage, goLive, onOpen }: { feed: Feed; stageSel: { svc: SetupSvc; stage: StageKey } | null; clearStage: () => void; goLive: { svc: SetupSvc; n: number } | null; onOpen: (id: string, back?: HTMLElement | null) => void }) {
  const { cards, today, demo } = feed;
  const versions = useSetupKpiVersions(demo);
  const [view, setView] = useState<'queue' | 'live'>('queue');
  const [svc, setSvc] = useState<'ALL' | SetupSvc>('ALL');
  const [chip, setChip] = useState<QueueChip>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const handled = useRef<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (stageSel) { setView('queue'); setChip('all'); setSvc('ALL'); setPage(1); } }, [stageSel]);
  useEffect(() => { if (goLive) { setView('live'); setSvc(goLive.svc); setPage(1); } }, [goLive]);
  const inQueue = useMemo(() => cards.filter((c) => !c.t.done).sort(queueSort), [cards]);
  const went = useMemo(() => cards.filter((c) => c.t.done && inLastMonths(c.t.go_live, today, 6)).sort(liveSort), [cards, today]);
  const base = (view === 'queue' ? inQueue : went).filter((c) => (svc === 'ALL' || c.svc === svc) && matchSearch(c, q) && (view !== 'queue' || !stageSel || (c.svc === stageSel.svc && c.stage === stageSel.stage)));
  const list = view === 'queue' ? base.filter((c) => queueChipMatch(c, chip)) : base;
  const pages = Math.max(1, Math.ceil(list.length / ONB_PAGE)); const pg = Math.min(page, pages);
  const rows = list.slice((pg - 1) * ONB_PAGE, pg * ONB_PAGE);
  /* R4 deep link `?card={id}` keeps working: tab, page, highlight ~3 s, then the summary drawer. */
  useEffect(() => {
    if (!cards.length) return;
    const run = (id: string | null) => {
      if (!id || handled.current === id) return; handled.current = id;
      const url = new URL(window.location.href); url.searchParams.delete('card'); window.history.replaceState(window.history.state, '', url);
      const c = cards.find((x) => x.id === id); if (!c) { toast.error('ไม่พบการ์ดนี้ในตาราง'); return; }
      const v = c.t.done ? 'live' : 'queue'; const src = c.t.done ? went : inQueue;
      setView(v); setSvc('ALL'); setQ(''); setChip('all'); clearStage();
      setPage(Math.floor(Math.max(0, src.findIndex((x) => x.id === id)) / ONB_PAGE) + 1);
      setFlash(id); setTimeout(() => setFlash((f) => (f === id ? null : f)), 3000);
      setTimeout(() => ref.current?.querySelector(`[data-card-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
      onOpen(id, null);
    };
    run(new URLSearchParams(window.location.search).get('card'));
    const on = (e: Event) => { handled.current = null; run((e as CustomEvent<{ card?: string }>).detail?.card ?? null); };
    window.addEventListener('psdash:open-tab', on); return () => window.removeEventListener('psdash:open-tab', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);
  const latest = versionFor(versions, today).values;
  const sub: Record<Col, string> = {
    p1: `AE · ≤ ${latest.p1.due}`, p2s: `Specialist · ≤ ${latest.p2s.due}`, p2o: `ทีมบริการ · ${dueOf(latest, 'p2o_orm', 'p2o_mc')}`, w: 'ลูกค้า · ไม่นับ', p3: `ทีมบริการ · ${dueOf(latest, 'p3_orm', 'p3_mc')}`, total: `เป้ารวม ${dueOf(latest, 'total_orm', 'total_mc')}`,
  };
  const head: Record<Col, string> = { p1: 'P1', p2s: 'P2', p2o: 'P2', w: 'รอวันประชุม', p3: 'P3', total: view === 'queue' ? 'ผ่านมาแล้ว' : 'รวม' };
  const qBase = inQueue.filter((c) => (svc === 'ALL' || c.svc === svc) && matchSearch(c, q) && (!stageSel || (c.svc === stageSel.svc && c.stage === stageSel.stage)));
  const chipN = (k: QueueChip) => qBase.filter((c) => queueChipMatch(c, k)).length;
  const foot = (c: Col) => { const v = list.flatMap((x) => (c === 'total' ? (x.t.done ? [x.t.elapsed] : []) : x.t.lanes[c].state === 'done' && x.t.lanes[c].days != null ? [x.t.lanes[c].days!] : [])); const m = mostRange(v); return !m ? '—' : m.a === m.b ? `${m.a}` : `${m.a}–${m.b}`; };
  const stageName = stageSel ? onboardStages[stageSel.svc][stageSel.stage]!.name : '';
  return <section ref={ref} className="onb-queue" id="setup-queue" data-testid="sd-queue">
    <h3>สัญญาในคิว และเวลาแต่ละเฟส<InfoTip>{onboardTips.queue}</InfoTip></h3>
    <div className="onb-ctrl">
      <div className="sd-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'queue'} className={cn('sd-pill', view === 'queue' && 'is-on')} onClick={() => { setView('queue'); setPage(1); }}>ในคิวตอนนี้ {inQueue.length}</button>
        <button type="button" role="tab" aria-selected={view === 'live'} className={cn('sd-pill', view === 'live' && 'is-on')} onClick={() => { setView('live'); setPage(1); clearStage(); }}>Go Live แล้ว · 6 เดือน {went.length}</button>
      </div>
      <div className="sd-seg" role="group">{(['ALL', 'ORM', 'Marcom'] as const).map((k) => <button key={k} type="button" aria-pressed={svc === k} className={cn(svc === k && 'is-on')} onClick={() => { setSvc(k); setPage(1); }}>{k === 'ALL' ? 'ทุกบริการ' : k}</button>)}</div>
      <input type="search" className="sd-search" placeholder="ค้นหาโรงแรม หรือผู้ดูแล" aria-label="ค้นหาโรงแรม หรือผู้ดูแล" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
    </div>
    <div className="sd-quick" data-testid="onb-chips">
      {view === 'queue' && stageSel && <button type="button" className="sd-chip is-on" onClick={clearStage}>stage: {SVC_TH(stageSel.svc)} · {stageName} ✕</button>}
      {view === 'queue' ? ([['all', 'ทั้งหมด'], ['watch', 'ต้องจับตา (เหลือง + แดง)'], ['late', 'เลยกำหนด'], ['flip', 'พรุ่งนี้เปลี่ยนสี'], ['over', 'เลยเป้ารวม']] as [QueueChip, string][]).map(([k, l]) =>
        <button key={k} type="button" aria-pressed={chip === k} className={cn('sd-chip', chip === k && 'is-on')} onClick={() => { setChip(k); setPage(1); }}>{l} {chipN(k)}</button>)
        : <><span className="sd-chip">Go Live {list.length}</span><span className="sd-chip">ส่วนใหญ่ {(() => { const m = mostRange(list.map((c) => c.t.elapsed)); return !m ? '—' : m.a === m.b ? `${m.a} วัน` : `${m.a}–${m.b} วัน`; })()}</span><span className="sd-chip">เลยเป้ารวม {list.filter((c) => c.total.tone === 'red').length}</span></>}
    </div>
    <div className="sd-table-scroll"><table className="sd-table onb-table" data-testid="onb-queue-table">
      <thead><tr><th>สัญญา</th><th>บริการ · stage</th>{COLS.map((c) => <th key={c}>{head[c]}<small>{sub[c]}</small></th>)}<th>ผู้ดูแล</th></tr></thead>
      <tbody>
        {rows.map((c) => <tr key={c.id} data-card-row={c.id} tabIndex={0} className={cn(flash === c.id && 'sd-flash')} onClick={(e) => onOpen(c.id, e.currentTarget)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.id, e.currentTarget); }}>
          <td><b>{c.t.hotel_name}</b>{c.gmb && <span className="cl-muted"> · GMB</span>}<small className="onb-sub">{c.t.done ? `${dayMonth(c.t.day0)} → Go Live ${dayMonth(c.t.go_live!)}` : `เริ่ม ${dayMonth(c.t.day0)}`}</small></td>
          <td><span className={cn('sd-svc', c.svc === 'ORM' ? 'is-orm' : 'is-mc')}>{SVC_TH(c.svc)}</span> {c.t.done ? 'Go Live' : onboardStages[c.svc][c.stage]!.name}</td>
          {COLS.map((k) => <QCell key={k} c={c} k={k} versions={versions} />)}
          <td className="onb-owner"><span>{ownerLine1(c)}</span><span>{ownerLine2(c)}</span></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={9} className="cl-muted">ไม่มีสัญญาตามเงื่อนไข · ลองล้างตัวกรอง</td></tr>}
      </tbody>
      <tfoot><tr><td colSpan={2}>ส่วนใหญ่ (กลาง 50%) · เฉพาะเฟสที่จบแล้ว <span className="cl-muted">· หน่วย: วัน</span></td>{COLS.map((k) => <td key={k}>{foot(k)}</td>)}<td /></tr></tfoot>
    </table></div>
    <div className="sd-pager"><span>{list.length} สัญญา</span>
      <button type="button" disabled={pg <= 1} onClick={() => setPage(pg - 1)} aria-label="ก่อนหน้า">‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((i) => <button key={i} type="button" aria-current={i === pg} className={cn(i === pg && 'is-on')} onClick={() => setPage(i)}>{i}</button>)}
      <button type="button" disabled={pg >= pages} onClick={() => setPage(pg + 1)} aria-label="ถัดไป">›</button></div>
  </section>;
}
function QCell({ c, k, versions }: { c: OnbCard; k: Col; versions: ReturnType<typeof useSetupKpiVersions> }) {
  if (k === 'total') return <td className="onb-cell"><b>{c.t.elapsed} วัน</b><small className={`onb-t-${c.total.tone}`}>{c.total.text}</small></td>;
  const l = c.t.lanes[k];
  if (l.state === 'na') return <td className="onb-cell cl-muted">ไม่มี</td>;
  if (l.state === 'not_started' || l.days == null) return <td className="onb-cell cl-muted">—</td>;
  const d = c.lanes[k];
  if (l.state === 'running' && d) return <td className={cn('onb-cell is-run', toneCls(d.tone), d.flipTomorrow && 'is-flip')}><small>กำลังทำ</small><b>{l.days}</b><small>{d.text}</small></td>;
  if (k === 'w') return <td className="onb-cell">{l.days}</td>;
  const v = versionFor(versions, c.t.day0).values; const key = k === 'p1' ? 'p1' : k === 'p2s' ? 'p2s' : k === 'p2o' ? (c.svc === 'ORM' ? 'p2o_orm' : 'p2o_mc') : c.svc === 'ORM' ? 'p3_orm' : 'p3_mc';
  const s = doneStatus(l.days, v[key]);
  return <td className="onb-cell"><b className={`onb-t-${s.tone}`}>{l.days}</b>{s.tone === 'red' && <small className="onb-t-red">{s.text}</small>}</td>;
}

/* ================= §8 summary drawer ================= */
const LANE_LABEL: Record<LaneKey, string> = { p1: 'ช่วง AE', p2s: 'ช่วงเตรียมระบบ · Specialist', p2o: 'ช่วงเตรียมระบบ · ทีมบริการ', w: 'รอวันประชุม', p3: 'ช่วงก่อน Go Live' };
function SummaryDrawer({ c, today, onClose, onOpenCard, canTicket, ticketOpen, onTicket }: { c: OnbCard; today: string; onClose: () => void; onOpenCard: () => void; canTicket: boolean; ticketOpen: boolean; onTicket: () => void }) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => { box.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const v = c.version.values;
  const thr = (k: LaneKey) => (k === 'w' ? null : v[k === 'p1' ? 'p1' : k === 'p2s' ? 'p2s' : k === 'p2o' ? (c.svc === 'ORM' ? 'p2o_orm' : 'p2o_mc') : c.svc === 'ORM' ? 'p3_orm' : 'p3_mc']);
  return createPortal(<div className="onb-overlay" onClick={onClose}>
    <aside ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={c.t.hotel_name} className="onb-drawer" data-testid="onb-drawer" onClick={(e) => e.stopPropagation()}>
      <h3>{c.t.hotel_name}</h3>
      <p><span className={cn('sd-svc', c.svc === 'ORM' ? 'is-orm' : 'is-mc')}>{SVC_TH(c.svc)}{c.gmb ? ' · GMB' : ''}</span> {c.t.done ? `Go Live ${thDate(c.t.go_live)}` : `stage ${onboardStages[c.svc][c.stage]!.name}`}</p>
      <div className="onb-dbox">
        <p>ใช้มาแล้ว {c.t.elapsed} วัน · เริ่ม {thDate(c.t.day0)} · <span className={`onb-t-${c.total.tone}`}>{c.total.text}</span></p>
        {!c.t.done && <p>สถานะการ์ด <Pill d={c.status}>{c.status.text}</Pill> <span className="cl-muted">(สีแย่ที่สุดของงานที่กำลังทำ)</span></p>}
        <p>{ownerLine1(c)}</p><p>{ownerLine2(c)}</p>
      </div>
      <ul className="onb-dlanes">{(['p1', 'p2s', 'p2o', 'w', 'p3'] as LaneKey[]).filter((k) => c.t.lanes[k].state !== 'na').map((k) => {
        const l = c.t.lanes[k]; const t = thr(k); const d = c.lanes[k];
        const line = l.state === 'running' ? `เริ่ม ${dayMonth(l.start!)} · ใช้มาแล้ว ${l.days} วัน${t ? ` / กำหนด ${t.due}` : ''}` : l.state === 'done' ? `${dayMonth(l.start!)}–${dayMonth(l.end!)} · ${l.days} วัน${t ? ` / กำหนด ${t.due}` : ''}` : t ? `กำหนด ${t.due} วัน` : 'ไม่มีกำหนด';
        const right = l.state === 'running' && d ? <Pill d={d}>{d.text}</Pill> : l.state === 'done' && t && l.days != null ? (() => { const s = doneStatus(l.days, t); return <Pill d={s}>{s.text}</Pill>; })() : l.state === 'done' ? <span className="cl-muted">{l.days} วัน</span> : <span className="cl-muted">ยังไม่ถึง</span>;
        return <li key={k}><div><b>{LANE_LABEL[k]}</b><small>{line}</small></div>{right}</li>;
      })}</ul>
      <p className="cl-muted">กำหนดจาก SLA On-board เวอร์ชันที่มีผล ณ วันสร้างการ์ด ({thDate(c.version.effective_from)})</p>
      <div className="onb-dbtns">
        <button type="button" className="sd-pill" onClick={onOpenCard}>เปิดการ์ด On-board</button>
        {canTicket && (ticketOpen ? <span className="cl-muted">มี ticket ติดตามเปิดอยู่แล้ว</span> : <button type="button" className="sd-pill" onClick={onTicket}>สร้าง ticket ติดตาม</button>)}
        <button type="button" className="sd-pill" onClick={onClose}>ปิด</button>
      </div>
      <span hidden>{today}</span>
    </aside>
  </div>, document.body);
}

/* ================= §10.2 range control ================= */
function RangeControl({ value, onChange, opts, today }: { value: RangeSel; onChange: (r: RangeSel) => void; opts: [RangeSel['kind'], string][]; today: string }) {
  const months = lastMonthsList(today, 30);
  const [from, setFrom] = useState(value.from ?? months[5]!); const [to, setTo] = useState(value.to ?? months[0]!);
  const err = value.kind === 'custom' ? customRangeError(from, to) : null;
  return <div className="onb-range">
    <div className="sd-seg" role="group">{opts.map(([k, l]) => <button key={k} type="button" aria-pressed={value.kind === k} className={cn(value.kind === k && 'is-on')} onClick={() => onChange(k === 'custom' ? { kind: 'custom', from: value.from ?? from, to: value.to ?? to } : { kind: k })}>{l}</button>)}</div>
    {value.kind === 'custom' && <div className="onb-custom">จาก <select aria-label="เดือนเริ่ม" value={from} onChange={(e) => { setFrom(e.target.value); if (!customRangeError(e.target.value, to)) onChange({ kind: 'custom', from: e.target.value, to }); }}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      ถึง <select aria-label="เดือนจบ" value={to} onChange={(e) => { setTo(e.target.value); if (!customRangeError(from, e.target.value)) onChange({ kind: 'custom', from, to: e.target.value }); }}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      <span className="cl-muted">ไม่เกิน 24 เดือน · เดือนปัจจุบันนับถึงวันนี้</span>{err && <span className="onb-t-red" role="alert">{err}</span>}</div>}
  </div>;
}

/* ================= §10 owners ================= */
function OwnersCard({ feed }: { feed: Feed }) {
  const { cards, today, demo } = feed;
  const versions = useSetupKpiVersions(demo);
  const [role, setRole] = useState<'ps' | 'orm' | 'mc'>('ps');
  const [phase, setPhase] = useState<'p2o' | 'p3'>('p2o');
  const [range, setRange] = useState<RangeSel>({ kind: 'm6' });
  const [more, setMore] = useState(false);
  const r = rangeMonths(range, today); const went = wentInMonths(cards, r, today);
  const latest = versionFor(versions, today).values;
  const tables = role === 'ps'
    ? [{ id: 'p1', title: 'ช่วง AE · สร้างการ์ด → Approved', lane: 'p1' as LaneKey, svc: null, who: (c: OnbCard) => c.owners.ae, thr: latest.p1 },
       { id: 'p2s', title: 'ช่วงเตรียมระบบ · Specialist (ORM) · Approved → ส่ง handover ครบ', lane: 'p2s' as LaneKey, svc: 'ORM' as SetupSvc, who: (c: OnbCard) => c.owners.specialist, thr: latest.p2s }]
    : [{ id: role, title: `${role === 'orm' ? 'ORM' : 'Marcom'} · ${phase === 'p2o' ? 'ช่วงเตรียมระบบ' : 'ช่วงก่อน Go Live'}`, lane: phase as LaneKey, svc: (role === 'orm' ? 'ORM' : 'Marcom') as SetupSvc,
        who: (c: OnbCard) => (role === 'orm' ? teamText(c.owners) : c.owners.marcom), thr: latest[role === 'orm' ? (phase === 'p2o' ? 'p2o_orm' : 'p3_orm') : phase === 'p2o' ? 'p2o_mc' : 'p3_mc'] }];
  const data = tables.map((t) => ({ ...t, ...vOnbOwners(cards, t.lane, t.svc, t.who, versions, went) }));
  const tot = data.reduce((s, d) => ({ x: s.x + d.sum.green + d.sum.amber, n: s.n + d.sum.total, h: s.h + d.sum.holding }), { x: 0, n: 0, h: 0 });
  const pct = tot.n ? Math.round((tot.x / tot.n) * 100) : null;
  return <section className="dash-card onb-card" id="onb-owners" data-testid="onb-owners">
    <header className="onb-head"><div className="min-w-0"><h2><span className="cl-num" aria-hidden>2</span>เวลาราย owner เทียบกำหนดเสร็จ<InfoTip>{onboardTips.owners}</InfoTip></h2>
      <p className="cl-note">ใครถืองานที่ใกล้เปลี่ยนสี และงานที่ส่งแล้วทันกำหนดกี่ %</p></div>
      <div className="onb-head-right"><strong>{pct == null ? '—' : `${pct}%`}</strong><div>ส่งแล้วทันกำหนด {tot.x} จาก {tot.n} · Go Live {rangeLabel(r)}</div></div></header>
    <div className="onb-ctrl">
      <div className="sd-seg" role="group">{([['ps', 'PS ทีม (AE / Specialist)'], ['orm', 'ORM'], ['mc', 'Marcom']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={role === k} className={cn(role === k && 'is-on')} onClick={() => setRole(k)}>{l}</button>)}</div>
      {role !== 'ps' && <div className="sd-seg" role="group">{([['p2o', 'ช่วงเตรียมระบบ'], ['p3', 'ช่วงก่อน Go Live']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={phase === k} className={cn(phase === k && 'is-on')} onClick={() => setPhase(k)}>{l}</button>)}</div>}
      <span className="cl-muted">งานที่ส่งแล้ว · Go Live ใน</span>
      <RangeControl value={range} onChange={setRange} today={today} opts={[['m1', 'เดือนนี้'], ['m3', '3 เดือน'], ['m6', '6 เดือน'], ['custom', 'Custom']]} />
      <button type="button" className="r1-help" aria-expanded={more} onClick={() => setMore((x) => !x)}>ดูสรุปสั้น</button>
    </div>
    {more && <p className="onb-more">ถืออยู่ {tot.h} การ์ด · ทันกำหนด = ส่งแล้วเขียวหรือเหลือง (ไม่เลยกำหนด) · กำหนดจาก ตั้งค่า › SLA On-board</p>}
    {data.map((d) => <div key={d.id} className="onb-otable"><h4>{d.title} · กำหนด ทันถึง {d.thr.ok} · เลยเมื่อเกิน {d.thr.due} วัน</h4>
      <div className="sd-table-scroll"><table className="sd-table">
        <thead><tr><th>ผู้ดูแล</th><th>ถืออยู่ตอนนี้ · Day left</th><th>ส่งแล้ว · ทัน (เขียว)</th><th>ใกล้กำหนด</th><th>เลยกำหนด</th><th>รวม</th><th>ส่วนใหญ่</th><th>ทันกำหนด</th></tr></thead>
        <tbody>{d.rows.map((x) => <tr key={x.name}><td>{x.name}</td>
          <td className="onb-hold">{x.holding.length ? x.holding.map(({ c, d: dl }) => <span key={c.id} title={c.t.hotel_name}><Pill d={dl}>{c.t.hotel_name.split(' ')[0]} · {dl.text}</Pill></span>) : <span className="cl-muted">ไม่มี</span>}</td>
          <td>{x.green}</td><td>{x.amber}</td><td className={cn(x.red > 0 && 'onb-t-red')}>{x.red}</td><td>{x.total}</td><td>{x.most}</td>
          <td>{x.pct == null ? '—' : <Pill d={{ tone: pctToneOf(x.pct) }}>{x.pct}%</Pill>}</td></tr>)}
          {!d.rows.length && <tr><td colSpan={8} className="cl-muted">ไม่มีข้อมูลในช่วงนี้</td></tr>}</tbody>
        <tfoot><tr><td>รวม · ถืออยู่ {d.sum.holding} การ์ด</td><td /><td>{d.sum.green}</td><td>{d.sum.amber}</td><td>{d.sum.red}</td><td>{d.sum.total}</td><td /><td>{d.pct == null ? '—' : `${d.pct}%`}</td></tr></tfoot>
      </table></div></div>)}
    {role === 'mc' && <p className="cl-muted">Specialist ฝั่ง Marcom ยังสงวนไว้ · GMB ไม่มีช่วงก่อน Go Live</p>}
  </section>;
}

/* ================= §11 overall days ================= */
function OverallCard({ feed, onOpen }: { feed: Feed; onOpen: (id: string, back?: HTMLElement | null) => void }) {
  const { cards, today, demo, members } = feed;
  const versions = useSetupKpiVersions(demo);
  const [svc, setSvc] = useState<SetupSvc>('ORM');
  const [range, setRange] = useState<RangeSel>({ kind: 'm6' });
  const [hl, setHl] = useState('');
  const [tip, setTip] = useState<{ c: OnbCard; el: Element } | null>(null);
  const [more, setMore] = useState(false);
  const r = rangeMonths(range, today);
  const { dots, median: med, onTime, late } = vOnbDays(cards, svc, r, today);
  const latest = versionFor(versions, today).values; const tot = latest[svc === 'ORM' ? 'total_orm' : 'total_mc'];
  useEffect(() => { if (svc === 'Marcom' && hl.startsWith('SP:')) setHl(''); }, [svc, hl]);
  const ae = members.filter((m) => m.active && m.function === 'AE').sort((a, b) => a.nickname.localeCompare(b.nickname));
  const sp = members.filter((m) => m.active && m.function === 'ONBOARDING_SPECIALIST').sort((a, b) => a.nickname.localeCompare(b.nickname));
  const matchHl = (c: OnbCard) => (hl.startsWith('AE:') ? c.owners.ae === hl.slice(3) : hl.startsWith('SP:') ? c.owners.specialist === hl.slice(3) : true);
  const cnt = (f: (c: OnbCard) => boolean) => dots.filter(f).length;
  const W = 1000, H = 330, L = 44, R = 128, T = 14, B = 34;
  const maxY = Math.max(24, tot.due + 4, ...dots.map((c) => c.t.elapsed + 2));
  const tickStep = maxY > 30 ? 7 : 4;
  const fromD = Date.parse(`${r.from}-01`), toD = Math.min(Date.parse(`${today}T00:00:00Z`), Date.parse(`${r.to}-28`) + 4 * 86400000);
  const x = (d: string) => L + ((Date.parse(d) - fromD) / Math.max(1, toD - fromD)) * (W - L - R);
  const y = (n: number) => T + (1 - n / maxY) * (H - T - B);
  const mons: string[] = []; for (let m = r.from; m <= r.to; m = monthKey(new Date(Date.parse(`${m}-01`) + 32 * 86400000).toISOString())) mons.push(m);
  const every = mons.length <= 6 ? 1 : mons.length <= 12 ? 2 : 3;
  const seen = new Map<string, number>();
  const pos = dots.map((c) => { const k = `${c.t.go_live}|${c.t.elapsed}`; const n = seen.get(k) ?? 0; seen.set(k, n + 1); return { c, cx: x(c.t.go_live!) + n * 7, cy: y(c.t.elapsed) }; });
  const ordered = hl ? [...pos.filter((p) => !matchHl(p.c)), ...pos.filter((p) => matchHl(p.c))] : pos;
  const ps = hl ? personStats(dots, matchHl, med) : null;
  const slow = (f: (c: OnbCard) => string | null) => { const by = new Map<string, number[]>(); dots.forEach((c) => { const n = f(c); if (n) by.set(n, [...(by.get(n) ?? []), c.t.elapsed]); }); return [...by.entries()].map(([n, v]) => ({ n, m: personStats(dots, (c) => f(c) === n, null).median ?? 0, len: v.length })).sort((a, b) => b.m - a.m)[0]; };
  const medY = med == null ? null : y(med);
  const labelY = (v: number, avoid: number[]) => { let p = v; for (const a of avoid) if (Math.abs(p - a) < 13) p = a + (p >= a ? 13 : -13); return p; };
  return <section className="dash-card onb-card" id="onb-overall" data-testid="onb-overall">
    <header className="onb-head"><div className="min-w-0"><h2><span className="cl-num" aria-hidden>3</span>Overall days to Go-Live<InfoTip>{onboardTips.overall}</InfoTip></h2>
      <p className="cl-note">สร้างการ์ด → Go Live ใช้กี่วัน และ AE / Specialist คนไหนช้าหรือเร็ว (1 จุด = 1 สัญญา)</p></div>
      <div className="onb-head-right"><strong>{med == null ? '—' : `${med.toFixed(1)} วัน`}</strong><div>ค่ากลาง · {SVC_TH(svc)} · Go Live {rangeLabel(r)} · {dots.length} สัญญา · ทันเป้ารวม {onTime}/{dots.length}</div></div></header>
    <div className="onb-ctrl">
      <div className="sd-seg" role="group">{(['ORM', 'Marcom'] as const).map((k) => <button key={k} type="button" aria-pressed={svc === k} className={cn(svc === k && 'is-on')} onClick={() => setSvc(k)}>{k}</button>)}</div>
      <span className="cl-muted">Go Live ใน</span>
      <RangeControl value={range} onChange={setRange} today={today} opts={[['m3', '3 เดือน'], ['m6', '6 เดือน'], ['m12', '12 เดือน'], ['custom', 'Custom']]} />
      <label className="onb-hl">ไฮไลต์ <select aria-label="ไฮไลต์" className={cn(hl && 'is-on')} value={hl} onChange={(e) => setHl(e.target.value)} data-testid="onb-hl">
        <option value="">ทุกคน · ไม่ไฮไลต์</option>
        <optgroup label="AE">{ae.map((m) => <option key={m.id} value={`AE:${m.nickname}`}>{m.nickname} ({cnt((c) => c.owners.ae === m.nickname)})</option>)}</optgroup>
        <optgroup label={svc === 'ORM' ? 'Specialist' : 'Specialist · Marcom ยังไม่มี'}>{svc === 'ORM' && sp.map((m) => <option key={m.id} value={`SP:${m.nickname}`}>{m.nickname} ({cnt((c) => c.owners.specialist === m.nickname)})</option>)}</optgroup>
      </select></label>
      <button type="button" className="r1-help" aria-expanded={more} onClick={() => setMore((v) => !v)}>ดูสรุปสั้น</button>
    </div>
    {more && <p className="onb-more">ค่ากลาง {med == null ? '—' : med.toFixed(1)} วัน · เลยเป้ารวม {late} สัญญา{slow((c) => c.owners.ae) ? ` · AE ที่ค่ากลางช้าสุด ${slow((c) => c.owners.ae)!.n}` : ''}{svc === 'ORM' && slow((c) => c.owners.specialist) ? ` · Specialist ที่ค่ากลางช้าสุด ${slow((c) => c.owners.specialist)!.n}` : ''} · ค่ากลางใช้แทนค่าเฉลี่ย เพราะไม่ถูกดึงด้วยสัญญาที่ช้ามากเพียงไม่กี่ใบ</p>}
    {!dots.length ? <p className="dash-empty">ไม่มีสัญญาที่ Go Live ในช่วงนี้ · ลองเลือกช่วงอื่น</p> :
      <svg viewBox={`0 0 ${W} ${H}`} className="onb-svg" role="img" aria-label="Overall days to Go-Live">
        <rect x={L} y={y(tot.ok)} width={W - L - R} height={y(0) - y(tot.ok)} className="z-green" />
        <rect x={L} y={y(tot.due)} width={W - L - R} height={y(tot.ok) - y(tot.due)} className="z-amber" />
        <rect x={L} y={T} width={W - L - R} height={y(tot.due) - T} className="z-red" />
        {Array.from({ length: Math.floor(maxY / tickStep) + 1 }, (_, i) => i * tickStep).map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="g" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="t">{v}</text></g>)}
        {mons.map((m, i) => <g key={m}><line x1={x(`${m}-01`)} x2={x(`${m}-01`)} y1={T} y2={H - B} className="g" />{i % every === 0 && <text x={x(`${m}-01`) + 3} y={H - B + 16} className="t">{monthLabel(m)}</text>}</g>)}
        <line x1={L} x2={W - R} y1={y(tot.due)} y2={y(tot.due)} className="due" />
        {medY != null && <line x1={L} x2={W - R} y1={medY} y2={medY} className="med" />}
        <text x={W - R + 6} y={y(tot.due) + 4} className="t onb-t-red">เลยเมื่อเกิน {tot.due} วัน</text>
        <text x={W - R + 6} y={y(tot.ok) + 4 + (Math.abs(y(tot.ok) - y(tot.due)) < 13 ? 13 : 0)} className="t onb-t-green">ทันกำหนดถึง {tot.ok} วัน</text>
        {medY != null && <text x={W - R + 6} y={labelY(medY + 4, [y(tot.due) + 4, y(tot.ok) + 4])} className="t">ค่ากลาง {med!.toFixed(1)} วัน</text>}
        {ordered.map(({ c, cx, cy }) => { const on = !hl || matchHl(c); return <g key={c.id} role="button" tabIndex={0} aria-label={`${c.t.hotel_name} ${c.t.elapsed} วัน`} className={cn('onb-dot', svc === 'ORM' ? 'is-orm' : 'is-mc', !on && 'is-off', hl && on && 'is-hl')}
          onMouseEnter={(e) => setTip({ c, el: e.currentTarget })} onMouseLeave={() => setTip(null)} onFocus={(e) => setTip({ c, el: e.currentTarget })} onBlur={() => setTip(null)}
          onClick={(e) => onOpen(c.id, e.currentTarget as unknown as HTMLElement)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c.id, e.currentTarget as unknown as HTMLElement); } }}>
          {hl && on && <circle cx={cx} cy={cy} r={10} className="ring" />}<circle cx={cx} cy={cy} r={on ? 6.5 : 5} /></g>; })}
      </svg>}
    {tip && <TipLayer anchor={tip.el}><DotTip c={tip.c} /></TipLayer>}
    <p className="onb-legend2"><span className={cn('onb-sw', svc === 'ORM' ? 'is-orm' : 'is-mc')} /> 1 สัญญา{hl ? ` ของ ${hl.slice(3)}` : ''}{hl && <> · <span className="onb-sw is-off" /> คนอื่น (หมดสี)</>} · <span className="onb-sw z-green" /> ทันกำหนด · <span className="onb-sw z-amber" /> ใกล้กำหนด · <span className="onb-sw z-red" /> เลยเป้ารวม · เส้นประเทา = ค่ากลางทั้งหมด · โซนสีจาก ตั้งค่า › SLA On-board</p>
    {ps && <div className="onb-person" data-testid="onb-person"><b>{hl.startsWith('AE:') ? 'AE' : 'Specialist'} {hl.slice(3)}</b> · สัญญา {ps.n} · ค่ากลาง {ps.median == null ? '—' : ps.median.toFixed(1)} วัน · ส่วนใหญ่ {ps.most} · ทันเป้ารวม {ps.onTime}/{ps.n}
      {ps.vs && <> · เทียบค่ากลางทั้งหมด <span className={`onb-t-${ps.vs.tone}`}>{ps.vs.text}</span></>} · <button type="button" className="onb-link" onClick={() => setHl('')}>ล้างไฮไลต์</button></div>}
  </section>;
}
function DotTip({ c }: { c: OnbCard }) {
  const v = c.version.values;
  return <div><b>{c.t.hotel_name} · {SVC_TH(c.svc)}{c.gmb ? ' GMB' : ''}</b>
    <p>AE {c.owners.ae ?? '—'}{c.svc === 'ORM' && ` · Specialist ${c.owners.specialist ?? '—'}`}</p>
    <p>ทีมบริการ {c.svc === 'ORM' ? teamText(c.owners) ?? '—' : c.owners.marcom ?? '—'}</p>
    <p>{thDate(c.t.day0)} → Go Live {thDate(c.t.go_live)}</p>
    <p className={`onb-t-${c.total.tone}`}>รวม {c.t.elapsed} วัน / เป้า {v[c.svc === 'ORM' ? 'total_orm' : 'total_mc'].due}</p><hr />
    {(['p1', 'p2s', 'p2o', 'w', 'p3'] as LaneKey[]).filter((k) => c.t.lanes[k].state === 'done').map((k) => {
      const l = c.t.lanes[k]; const key = k === 'p1' ? 'p1' : k === 'p2s' ? 'p2s' : k === 'p2o' ? (c.svc === 'ORM' ? 'p2o_orm' : 'p2o_mc') : k === 'p3' ? (c.svc === 'ORM' ? 'p3_orm' : 'p3_mc') : null;
      if (!key) return <p key={k}>{LANE_LABEL[k]} {l.days} วัน · ไม่นับกำหนด</p>;
      const s = doneStatus(l.days!, v[key]); return <p key={k}>{LANE_LABEL[k]} {l.days} วัน / {v[key].due} · <span className={`onb-t-${s.tone}`}>{s.text}</span></p>;
    })}
    <small>คลิกเพื่อเปิดการ์ดนี้</small></div>;
}
export type { DayLeft };
