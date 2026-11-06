/* PS Dashboard · Tab "ติดตามงานผู้ให้บริการ" R1 — department filter · cards ①–⑥ · view-only drawer with Follow up.
 * Reads vServiceTickets() (L0 + PS cases), getMeetings(), caretakerOf(), Contract Health rows (buildRows, card ⑦ inputs).
 * Writes only: sendFollowUp() (and "+ สร้าง ticket" via the existing CreateCase in task-tab). */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useDashboardGlobal } from '@/lib/ps-dashboard-global';
import { useTickets, addDemoTickets, isDemoTickets, type L0Ticket } from '@/lib/tickets-l0';
import type { Ticket as PsCase } from '@/lib/task-tickets';
import {
  DUE_STATE_TH, HEAD_OF, SVC_STATUS_TH, TEST_ROLE_LABEL, getCategories, sendFollowUp, svcToday, ticketFollowups, ticketSla, vServiceTickets,
  type DisplayStatus, type DueState, type ServiceTicketRow, type SvcActor, type SvcDept, type TicketCategory,
} from '@/lib/service-tickets';
import { slaDemoHistory, slaDemoTickets, ensureSlaDemoFollowups } from '@/lib/service-tickets-demo';
import { stabDemoMeetings, stabDemoTickets } from '@/lib/service-ticket-tab-demo';
import {
  DEPT_TH, EMPTY_LIST_FILTER, GRAN_TH, buckets, categoryRows, cumulative, listRows, medianTone, noDateYet, openSummary, sortCats, suggestions, thDay, thMonYY, topCats, vStabMeetings, vStabOpen, vStabPeriod,
  type CatSort, type DeptFilter, type Gran, type HealthInfo, type ListFilter, type StabMeetingCard, type StabMeetingInput,
} from '@/lib/service-ticket-tab';
import { getMeetings } from '@/lib/meeting-survey-store';
import { caretakerOf, ws2Profiles } from '@/lib/meeting-tab-r1';
import { buildRows } from '@/lib/contract-tab-r1';
import { tabR1Demo, tabR1DemoTickets, TAB_R1_DEMO_NOW } from '@/lib/contract-tab-r1-demo';
import { contractHealthState } from '@/lib/contract-health-store';
import { getMeetingSurveyData, surveyContext } from '@/lib/meeting-survey-store';
import { addDays, daysBetween } from '@/lib/service-tickets';
import { useCardCompare } from './compare-control';
import { SignalMark } from './signal-mark';
import { ChartHint } from './dash-card';
import { STAB } from '@/lib/ps-glossary';

const DEPTS: SvcDept[] = ['ORM', 'MARCOM', 'AC', 'BD'];
const deptTone: Record<SvcDept, string> = { ORM: 'stab-dept-orm', MARCOM: 'stab-dept-marcom', AC: 'stab-dept-ac', BD: 'stab-dept-bd' };
const statusTone: Record<string, string> = { NEW: 'stab-st-new', IN_PROGRESS: 'stab-st-prog', WAITING_CUSTOMER: 'stab-st-cust', WAITING_THIRD_PARTY: 'stab-st-3p', SOLVED: 'stab-st-solved' };
const dueTone: Record<DueState, string> = { NO_DATE: 'stab-due-none', ON_TIME: 'stab-due-ok', OVERDUE: 'stab-due-late' };
const OPEN_ST: DisplayStatus[] = ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'];

/* ---------- data ---------- */
function useFollowupVersion() {
  return useSyncExternalStore((cb) => { const a = ticketFollowups.subscribe(cb); const b = ticketSla.subscribe(cb); return () => { a(); b(); }; }, () => `${ticketFollowups.all(true).length}:${ticketFollowups.all(false).length}`, () => '0');
}
export function useServiceTicketRows(cases: PsCase[]) {
  const { demo } = useDashboardGlobal();
  const l0 = useTickets();
  const fv = useFollowupVersion();
  useEffect(() => { if (demo && isDemoTickets()) { addDemoTickets(slaDemoTickets()); addDemoTickets(stabDemoTickets()); ensureSlaDemoFollowups(); } }, [demo, l0.length]);
  const today = svcToday(demo);
  const cats = useMemo(() => getCategories(demo), [demo, fv]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => vServiceTickets({ l0, cases, sla: ticketSla.all(demo), followups: ticketFollowups.all(demo), categories: cats, today }), [l0, cases, demo, fv, cats, today]); // eslint-disable-line react-hooks/exhaustive-deps
  /** DEMO history (view-only, solved) feeds ② ③ ④ only. */
  const history = useMemo(() => (demo ? vServiceTickets({ l0: slaDemoHistory(), categories: cats, today }) : []), [demo, cats, today]);
  return { demo, today, rows, history, cats };
}

/** ⑤ meetings: getMeetings() (+ tab DEMO additions), caretaker via caretakerOf(), health via the card ⑦ engine rows (DEMO). */
function useStabMeetings(demo: boolean): StabMeetingInput[] {
  return useMemo(() => {
    const base = getMeetings(demo); const add = demo ? stabDemoMeetings() : [];
    const profiles = demo ? [] : ws2Profiles();
    const health = new Map<string, HealthInfo>();
    if (demo) {
      const hs = contractHealthState(true);
      for (const r of buildRows(tabR1Demo().base, { today: TAB_R1_DEMO_NOW, labels: hs.labels, snaps: hs.snapshots, tickets: tabR1DemoTickets(), survey: surveyContext(getMeetingSurveyData(true), true) })) {
        health.set(`${r.hotel_id}|${r.service === 'ORM' ? 'ORM' : 'MARCOM'}`, { tier: r.tier, labels: r.signals.filter((s) => s.dir !== 'good').map((s) => ({ key: s.key, label: s.label, dir: s.dir, ...(s.amber ? { amber: true } : {}) })) });
      }
    }
    return [...base, ...add].filter((m) => /^confirmed$/i.test(m.status) && /^\d{4}-\d{2}-\d{2}/.test(m.date ?? '')).map((m) => ({
      id: m.id, hotel_id: m.hotel_id ?? null, hotel: m.hotel, service: m.service, date: m.date.slice(0, 10), ae: m.ae_display ?? m.ae ?? '—',
      caretaker: caretakerOf(m, profiles, demo).name, health: health.get(`${m.hotel_id}|${m.service}`) ?? null,
    }));
  }, [demo]);
}

/* ---------- small UI ---------- */
const Card = ({ id, n, title, q, right, info, children, now }: { id?: string; n: string; title: string; q: string; right?: ReactNode; info?: readonly string[]; children: ReactNode; now?: boolean }) => (
  <section id={id} className="stab-card" data-testid={`stab-card-${n}`}>
    <header className="stab-card-head"><div><h3><span className="stab-n">{n}</span> {title}{info && <ChartHint header={title} lines={[...info]}><button type="button" className="stab-info" aria-label={`ⓘ ${title}`}>ⓘ</button></ChartHint>}</h3><p className="stab-q">{q}</p></div><div className="stab-card-right">{now && <span className="stab-now">ณ วันนี้</span>}{right}</div></header>
    {children}
  </section>
);
const Seg = ({ label, n, total, tone, onClick }: { label: string; n: number; total: number; tone: string; onClick?: () => void }) =>
  n ? <button type="button" className={cn('stab-seg', tone)} style={{ flexGrow: n, minWidth: 28 }} onClick={onClick} title={`${label} ${n}`} aria-label={`${label} ${n} ticket`}>{n}</button> : null;
export const fuCell = (r: ServiceTicketRow, today: string) => r.followup_count
  ? <span className="stab-fu">📣 {r.followup_count} ครั้ง<small>ล่าสุด {r.last_followup_at && r.last_followup_at.slice(0, 10) === today ? 'วันนี้' : r.last_followup_at ? thDay(r.last_followup_at.slice(0, 10)) : '—'} · {r.last_followup_by_label}</small></span>
  : <span className="text-muted-foreground">—</span>;
export function DueCell({ r, today }: { r: ServiceTicketRow; today: string }) {
  if (r.display_status === 'SOLVED') { const sd = (r.solved_at ?? '').slice(0, 10); const late = r.due_state === 'OVERDUE'; return <span>Solve {sd ? thDay(sd) : '—'}<small className={late ? 'text-destructive' : ''}>{late ? `เลยกำหนด ${daysBetween(r.effective_due_date, sd)} วัน` : 'ทันกำหนด'} · ใช้ {r.solve_days ?? '—'} วัน</small></span>; }
  const wait = r.waiting_days > 0 ? <em className="stab-wait">มีช่วงรอ {r.waiting_days} วัน</em> : null;
  if (r.due_state === 'OVERDUE') return <span className="text-destructive">เลย {daysBetween(r.effective_due_date, today)} วัน<small>{r.display_status === 'NEW' ? `ยังไม่รับงาน · กำหนดอัตโนมัติ ${thDay(r.effective_due_date)}` : `กำหนด ${thDay(r.effective_due_date)}`}</small>{wait}</span>;
  if (noDateYet(r)) return <span className="stab-amber">ยังไม่ใส่วันที่<small>สูงสุด {thDay(r.effective_due_date)}</small>{wait}</span>;
  return <span>เหลือ {daysBetween(today, r.effective_due_date)} วัน<small>กำหนด {thDay(r.effective_due_date)}</small>{wait}</span>;
}

/* ---------- tab ---------- */
export function ServiceTicketTab({ cases, onCreate }: { cases: PsCase[]; onCreate: () => void }) {
  const { demo, today, rows, history, cats } = useServiceTicketRows(cases);
  const meetings = useStabMeetings(demo);
  const [dept, setDept] = useState<DeptFilter>('ALL');
  const [list, setList] = useState<ListFilter>(EMPTY_LIST_FILTER);
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const toList = (f: Partial<ListFilter>) => { setList({ ...EMPTY_LIST_FILTER, ...f }); requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const allOpen = useMemo(() => vStabOpen(rows), [rows]);
  const openRowsD = useMemo(() => vStabOpen(rows, dept), [rows, dept]);
  const sum = openSummary(openRowsD, allOpen);
  const allRows = useMemo(() => [...rows, ...history], [rows, history]);
  const scoped = dept === 'ALL' ? allRows : allRows.filter((r) => r.dept === dept);
  const cmp = useCardCompare('stab', 'flow', today);
  const sel = rows.find((r) => `${r.ticket_store}:${r.ticket_id}` === open) ?? null;

  return <div className="stab-tab" data-testid="stab-tab">
    {demo && <p className="task-demo-watermark">ข้อมูลสาธิต · 28 ตุลาคม 2569 · ไม่บันทึก</p>}
    <div className="stab-filter" role="toolbar" aria-label="แผนก">
      <span>แผนก:</span>
      {(['ALL', ...DEPTS] as DeptFilter[]).map((d) => <button key={d} type="button" aria-pressed={dept === d} className={cn('stab-chip', d !== 'ALL' && deptTone[d], dept === d && 'is-on')} onClick={() => setDept(d)}>{d === 'ALL' ? 'ทั้งหมด' : DEPT_TH[d]}</button>)}
      <small>ใช้กับทุกการ์ดในแท็บนี้</small>
      <Button size="sm" className="ml-auto" onClick={onCreate}>+ สร้าง ticket</Button>
    </div>

    <h2 className="stab-section">ticket คงค้างตอนนี้</h2>
    <Card n="①" title="ticket คงค้างของทีมบริการ" q="ตอนนี้ทีมบริการมี ticket ค้างกี่ใบ ใส่วันที่แล้วกี่ใบ เลยกำหนดกี่ใบ?" now info={STAB.info1}>
      <div className="stab-c1">
        <div className="stab-hero"><strong data-testid="stab-total">{sum.total}</strong> ticket
          <p>ยังไม่ใส่วันที่ <b data-testid="stab-nodate">{sum.noDate}</b></p><p>ใส่วันที่แล้ว <b>{sum.dated}</b></p><p className="text-destructive">เลยกำหนด <b data-testid="stab-overdue">{sum.overdue}</b></p>
          {dept === 'ALL' && <div className="stab-chips">{sum.depts.map((d) => <span key={d.dept} className={cn('stab-chip', deptTone[d.dept])}>{DEPT_TH[d.dept]} {d.total}</span>)}</div>}
        </div>
        <div className="stab-bars">
          <div className="stab-bar-head"><b>วันกำหนดเสร็จ</b><small>ยังไม่ใส่วันที่ใช้กำหนด = วันสร้าง + 10</small></div>
          <div className="stab-bar" data-testid="stab-duebar"><Seg label="ยังไม่ใส่วันที่ (ยังไม่ถึง 10 วัน)" n={sum.dueBar.NO_DATE} total={sum.total} tone="stab-due-none" onClick={() => toList({ due: 'NO_DATE' })} /><Seg label="ใส่แล้ว · ทันกำหนด" n={sum.dueBar.ON_TIME} total={sum.total} tone="stab-due-ok" onClick={() => toList({ due: 'ON_TIME' })} /><Seg label="เลยกำหนด" n={sum.dueBar.OVERDUE} total={sum.total} tone="stab-due-late" onClick={() => toList({ due: 'OVERDUE' })} /></div>
          <p className="stab-legend"><i className="stab-due-none" />ยังไม่ใส่วันที่ (ยังไม่ถึง 10 วัน) <i className="stab-due-ok" />ใส่แล้ว · ทันกำหนด <i className="stab-due-late" />เลยกำหนด</p>
          {sum.overdue > 0 && <p className="stab-remark">หมายเหตุเลยกำหนด {sum.overdue}: มีช่วงรอลูกค้า / 3rd Party {sum.remark.hadWait} · ยังไม่รับงานเกิน 10 วัน {sum.remark.notAccepted} · ระหว่างดำเนินการ {sum.remark.working} · SLA นับรวมช่วงรอ</p>}
          <div className="stab-bar-head"><b>สถานะ</b><small>กดแถบเพื่อดูรายการด้านล่าง</small></div>
          <div className="stab-bar" data-testid="stab-statusbar">{(['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'] as const).map((s) => <Seg key={s} label={SVC_STATUS_TH[s]} n={sum.statusBar[s]} total={sum.total} tone={statusTone[s]!} onClick={() => toList({ status: s })} />)}</div>
          <p className="stab-legend">{(['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'] as const).map((s) => <span key={s}><i className={statusTone[s]} />{SVC_STATUS_TH[s]} </span>)}</p>
          {sum.noDueBell > 0 && <p className="stab-pill">🔔 แจ้งกระดิ่ง Workspace ผู้รับแล้ว · {sum.noDueBell} ticket ยังไม่ใส่วันกำหนดเสร็จ</p>}
        </div>
      </div>
      <table className="stab-table" data-testid="stab-dept-table"><thead><tr><th>แผนก</th>{DEPT_SORT_COLS.map(([k, label]) => (
          <th key={k}><button type="button" className="stab-sort" data-testid={`stab-sort-${k}`} aria-sort={deptSort?.key === k ? (deptSort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
            onClick={() => setDeptSort((cur) => (cur?.key === k ? { key: k, dir: cur.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' }))}>
            {label}<span aria-hidden>{deptSort?.key === k ? (deptSort.dir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span></button></th>
        ))}</tr></thead>
        <tbody>{sortDepts(sum.depts, deptSort).map((d) => <tr key={d.dept} tabIndex={0} data-dept={d.dept} className={cn(dept !== 'ALL' && (dept === d.dept ? 'is-on' : 'is-dim'))} onClick={() => setDept(dept === d.dept ? 'ALL' : d.dept)} onKeyDown={(e) => e.key === 'Enter' && setDept(dept === d.dept ? 'ALL' : d.dept)}>
          <td><span className={cn('stab-chip', deptTone[d.dept])}>{DEPT_TH[d.dept]}</span></td><td><b>{d.total}</b></td><td>{d.NEW}</td><td>{d.IN_PROGRESS}</td><td>{d.WAITING_CUSTOMER}</td><td>{d.WAITING_THIRD_PARTY}</td>
          <td className={d.overdue ? 'text-destructive' : ''}><b>{d.overdue}</b>{d.overdue > 0 && <small className="text-muted-foreground">มีช่วงรอ {d.hadWait} · ยังไม่รับงาน {d.notAccepted}</small>}</td></tr>)}</tbody></table>
      <p className="stab-foot">กดแถวเพื่อกรองทั้งแท็บเป็นแผนกนั้น · เวลาไม่หยุดนับระหว่างรอ · “มีช่วงรอ” เป็นหมายเหตุให้เห็นเหตุผลเท่านั้น</p>
    </Card>

    <h2 className="stab-section">ticket ในช่วงเวลา</h2>
    <Card2 rows={scoped} a={cmp.a} b={cmp.b} control={cmp.control} label={cmp.full} />
    <Card3 rows={scoped} today={today} />
    <Card4 rows={allRows} cats={cats} dept={dept} a={cmp.a} b={cmp.b} label={cmp.full} onCat={(c) => toList({ cat: c })} />

    <h2 className="stab-section">ก่อนประชุมประจำเดือน</h2>
    {SHOW_PENDING_BEFORE_MEETING && <Card5 meetings={meetings} open={openRowsD} today={today} onTicket={setOpen} />}

    <h2 className="stab-section">รายการ ticket</h2>
    <div ref={listRef}><Card6 rows={rows} cats={cats} dept={dept} f={list} setF={setList} today={today} onTicket={setOpen} /></div>

    <TicketDrawer row={sel} today={today} demo={demo} onClose={() => setOpen(null)} />
  </div>;
}

/* ---------- ② ---------- */
function Card2({ rows, a, b, control, label }: { rows: ServiceTicketRow[]; a: { from: string; to: string }; b: { from: string; to: string }; control: ReactNode; label: string }) {
  const A = vStabPeriod(rows, a), B = vStabPeriod(rows, b);
  const d = (x: number, y: number) => x - y;
  const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
  const c = A.cohort; const w = (n: number) => `${c.created ? Math.max(n ? 3 : 0, (n / c.created) * 100) : 0}%`;
  return <Card n="②" title="ticket ใหม่และ Solve" q="ช่วงนี้มี ticket ใหม่กี่ใบ ปิดได้กี่ใบ และปิดทันกำหนดกี่ %?" right={<>{control}<small>{label}</small></>} info={STAB.info2}>
    <div className="stab-kpis">
      <div className="stab-kpi"><span>ticket ใหม่</span><strong data-testid="stab-new">{A.created}</strong><small className="text-muted-foreground">{sign(d(A.created, B.created))} · ช่วงก่อน {B.created}</small></div>
      <div className="stab-kpi"><span>Solve</span><strong data-testid="stab-solved">{A.solved}</strong><small className={d(A.solved, B.solved) > 0 ? 'text-success' : d(A.solved, B.solved) < 0 ? 'text-destructive' : 'text-muted-foreground'}>{sign(d(A.solved, B.solved))} · ช่วงก่อน {B.solved}</small></div>
      <div className="stab-kpi"><span>Solve ทันกำหนด</span><strong>{A.pct ?? '—'}{A.pct != null && '%'}</strong><small>{A.onTime} จาก {A.solved}</small><small className={(A.pct ?? 0) - (B.pct ?? 0) >= 0 ? 'text-success' : 'text-destructive'}>{A.pct != null && B.pct != null ? `${sign(A.pct - B.pct)} จุด` : '—'} · ช่วงก่อน {B.pct ?? '—'}{B.pct != null && '%'}</small></div>
    </div>
    <p className="stab-sub">ticket ที่สร้างในช่วงนี้ ไปถึงไหนแล้ว</p>
    <div className="stab-cohort" data-testid="stab-cohort">
      <div><span>สร้าง {c.created}</span><div className="stab-bar"><i className="stab-c-full" style={{ width: '100%' }} /></div></div>
      <div><span>รับงาน + ใส่วันที่ {c.accepted}</span><div className="stab-bar"><i className="stab-st-prog" style={{ width: w(c.accepted) }} /><i className="stab-due-none" style={{ width: w(c.created - c.accepted) }} /></div></div>
      <div><span>Solve แล้ว {c.solvedOnTime + c.solvedLate}</span><div className="stab-bar"><i className="stab-due-ok" style={{ width: w(c.solvedOnTime) }} title={`ทันกำหนด ${c.solvedOnTime}`}>{c.solvedOnTime ? `ทันกำหนด ${c.solvedOnTime}` : ''}</i><i className="stab-due-late" style={{ width: w(c.solvedLate) }}>{c.solvedLate || ''}</i></div></div>
      <div><span>ยังค้าง {c.openNotAccepted + c.openAccepted}</span><div className="stab-bar"><i className="stab-due-none" style={{ width: w(c.openNotAccepted) }} /><i className="stab-st-cust" style={{ width: w(c.openAccepted) }} /></div></div>
    </div>
    <p className="stab-foot">เทา = ยังไม่รับงาน · เขียวเข้ม = รับงานแล้ว · เขียว = Solve ทันกำหนด · แดง = Solve เลยกำหนด · เหลือง = รับแล้ว กำลังทำหรือรอ</p>
  </Card>;
}

/* ---------- ③ ---------- */
function Card3({ rows, today }: { rows: ServiceTicketRow[]; today: string }) {
  const [g, setG] = useState<Gran>('month');
  const [cf, setCf] = useState(addDays(today, -60)), [ct, setCt] = useState(today);
  const bs = useMemo(() => buckets(g, today, g === 'custom' ? { from: cf, to: ct } : undefined), [g, today, cf, ct]);
  const pts = useMemo(() => cumulative(rows, bs, today), [rows, bs, today]);
  const [idx, setIdx] = useState<number | null>(null);
  const last = pts[pts.length - 1];
  const W = 640, H = 200, S = 70, n = pts.length, max = Math.max(1, ...pts.map((p) => p.cumCreated));
  const x = (i: number) => 30 + (n <= 1 ? 0 : (i * (W - 50)) / (n - 1)); const y = (v: number) => H - 20 - (v / max) * (H - 40);
  const ys = (v: number) => S - 10 - (Math.min(v, 14) / 14) * (S - 20);
  const line = (k: 'cumCreated' | 'cumSolved' | 'cumOverdue') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[k])}`).join(' ');
  const area = `${line('cumCreated')} ${pts.slice().reverse().map((p, j) => `L${x(n - 1 - j)},${y(p.cumSolved)}`).join(' ')} Z`;
  const step = Math.max(1, Math.ceil(n / 12));
  const tot = pts.reduce((a, p) => ({ c: a.c + p.created, s: a.s + p.solved }), { c: 0, s: 0 });
  const allSolvedDays = rows.filter((r) => r.is_counted && r.solve_days != null && r.solved_at && r.solved_at.slice(0, 10) >= (bs[0]?.from ?? '') && r.solved_at.slice(0, 10) <= today).map((r) => r.solve_days!).sort((a, b) => a - b);
  const med = allSolvedDays.length ? (allSolvedDays.length % 2 ? allSolvedDays[(allSolvedDays.length - 1) / 2]! : (allSolvedDays[allSolvedDays.length / 2 - 1]! + allSolvedDays[allSolvedDays.length / 2]!) / 2) : null;
  const gap = tot.c - tot.s;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); setIdx((i) => Math.min(n - 1, (i ?? -1) + 1)); } if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx((i) => Math.max(0, (i ?? n) - 1)); } if (e.key === 'Escape') setIdx(null); };
  const p = idx != null ? pts[idx] : null;
  const caption = `${GRAN_TH[g]} · ${g === 'custom' ? `${thDay(cf)} – ${thDay(ct)}` : `${bs.length} จุดล่าสุด`} · ${bs[0] ? (g === 'month' ? thMonYY(bs[0].from) : thDay(bs[0].from)) : ''} – ${last ? (g === 'month' ? thMonYY(last.from) : thDay(last.to)) : ''}`;
  return <Card n="③" title="ticket สะสม" q="ย้อนหลังแล้ว ticket เข้ามากกว่าปิดไหม และใช้เวลาปิดสั้นลงหรือยาวขึ้น?" info={STAB.info3}
    right={<div className="stab-gran" role="group" aria-label="ความละเอียด">{(Object.keys(GRAN_TH) as Gran[]).map((k) => <button key={k} type="button" aria-pressed={g === k} className={cn('stab-chip', g === k && 'is-on')} onClick={() => setG(k)}>{GRAN_TH[k]}</button>)}</div>}>
    <p className="stab-sub" data-testid="stab-gran-caption">{caption}{g === 'custom' && <> · <input type="date" aria-label="จาก" value={cf} max={ct} onChange={(e) => setCf(e.target.value)} /> – <input type="date" aria-label="ถึง" value={ct} max={today} onChange={(e) => setCt(e.target.value)} /></>}</p>
    <div className="stab-c3">
      <div className="stab-chart" onMouseLeave={() => setIdx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0} aria-label="ticket สะสม" onKeyDown={onKey} onFocus={() => setIdx((i) => i ?? n - 1)} data-testid="stab-cum">
          <path d={area} className="stab-gap" />
          <path d={line('cumCreated')} className="stab-l-created" /><path d={line('cumSolved')} className="stab-l-solved" /><path d={line('cumOverdue')} className="stab-l-overdue" />
          {pts.map((pt, i) => <rect key={i} x={x(i) - (W - 50) / Math.max(1, n - 1) / 2} y={0} width={(W - 50) / Math.max(1, n - 1)} height={H} fill="transparent" onMouseEnter={() => setIdx(i)} data-testid={`stab-hit-${i}`} />)}
          {p && idx != null && <><line x1={x(idx)} x2={x(idx)} y1={10} y2={H - 20} className="stab-cross" />{(['cumCreated', 'cumSolved', 'cumOverdue'] as const).map((k) => <circle key={k} cx={x(idx)} cy={y(p[k])} r={4} className={`stab-dot-${k}`} />)}</>}
          {pts.map((pt, i) => i % step === 0 || i === n - 1 ? <text key={i} x={x(i)} y={H - 4} className="stab-x">{pt.label}</text> : null)}
          {last && <><text x={W - 4} y={y(last.cumCreated) - 4} className="stab-end">สร้าง {last.cumCreated}</text><text x={W - 4} y={y(last.cumSolved) + 12} className="stab-end">Solve {last.cumSolved}</text><text x={W - 4} y={y(last.cumOverdue) - 4} className="stab-end text-destructive">เลยกำหนด {last.cumOverdue}</text></>}
        </svg>
        <div className="stab-median-box" data-testid="stab-median-box"><span>median วัน Solve (วันสร้าง → Solve)</span><b>{med ?? '—'} วัน</b></div>
        <svg viewBox={`0 0 ${W} ${S}`} aria-label="median วัน Solve" data-testid="stab-median">
          <line x1={20} x2={W - 10} y1={ys(10)} y2={ys(10)} className="stab-ceil" /><text x={W - 10} y={ys(10) - 3} className="stab-end text-destructive">เกณฑ์ 10 วัน</text>
          {idx != null && <line x1={x(idx)} x2={x(idx)} y1={0} y2={S} className="stab-cross" />}
          {pts.map((pt, i) => pt.median == null ? null : <g key={i}><circle cx={x(i)} cy={ys(pt.median)} r={idx === i ? 5 : 3.5} className={pt.median > 10 ? 'stab-dot-cumOverdue' : 'stab-dot-cumSolved'} data-testid="stab-median-dot" />{n <= 14 && <text x={x(i)} y={S - 1} className="stab-x">{pt.median}</text>}</g>)}
        </svg>
        {p && <div className="stab-tip" role="status" data-testid="stab-tip"><b>{p.label}</b><span>ช่วงนี้: สร้าง {p.created} · Solve {p.solved}</span><span>median SLA {p.median ?? '—'} วัน{p.median != null && p.median > 10 ? ' (เกินเกณฑ์)' : ''}</span><small>สะสม: สร้าง {p.cumCreated} · Solve {p.cumSolved} · {p.cumCreated - p.cumSolved >= 0 ? `ค้างเพิ่ม ${p.cumCreated - p.cumSolved}` : `ค้างลด ${p.cumSolved - p.cumCreated}`} · เลยกำหนด {p.cumOverdue}</small></div>}
        <p className="stab-legend"><i className="stab-l-created-k" />สร้างสะสม <i className="stab-l-solved-k" />Solve สะสม <i className="stab-l-overdue-k" />เลยกำหนดสะสม <i className="stab-gap-k" />ค้างเพิ่ม {bs.some((b) => b.current) && <small>* ช่วงปัจจุบันยังไม่จบ (ถึง {thDay(today)})</small>}</p>
      </div>
      <aside className="stab-side"><strong>{Math.abs(gap)}</strong><span>{gap >= 0 ? 'ค้างเพิ่ม' : 'ค้างลด'} ในช่วงนี้</span><small>สร้าง {tot.c} · Solve {tot.s} · เลยกำหนด {last?.cumOverdue ?? 0}</small><small>median วัน Solve ทั้งช่วง {med ?? '—'} วัน</small></aside>
    </div>
  </Card>;
}

/* ---------- ④ ---------- */
function Card4({ rows, cats, dept, a, b, label, onCat }: { rows: ServiceTicketRow[]; cats: TicketCategory[]; dept: DeptFilter; a: { from: string; to: string }; b: { from: string; to: string }; label: string; onCat: (key: string) => void }) {
  const [sort, setSort] = useState<{ by: CatSort; desc: boolean }>({ by: 'open', desc: true });
  const [more, setMore] = useState(false);
  const all = sortCats(categoryRows(rows, cats, dept, a, b), sort.by, sort.desc);
  const top = topCats(all);
  const shown = more ? all : top.rows;
  const slow = all.find((r) => r.key === top.pinned);
  const H = ({ k, children }: { k: CatSort; children: ReactNode }) => { const on = sort.by === k; return <th aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : 'none'}><button type="button" onClick={() => setSort(on ? { by: k, desc: !sort.desc } : { by: k, desc: true })}>{children} <small>{on ? (sort.desc ? '▼ มาก→น้อย' : '▲ น้อย→มาก') : '↕'}</small></button></th>; };
  return <Card n="④" title="ticket ตามหมวด" q="หมวดไหนใช้เวลาแก้นาน และยังมี ticket ค้างอยู่ไหม?" info={STAB.info4} right={<small>ticket ใหม่ / median: {label}</small>}>
    <div className="stab-c3">
      <table className="stab-table" data-testid="stab-cat-table"><thead><tr><th>หมวด</th><H k="new">ticket ใหม่</H><H k="median">median วัน Solve</H><H k="open">คงค้าง <em>ณ วันนี้</em></H><H k="overdue">เลยกำหนด <em>ณ วันนี้</em></H></tr></thead>
        <tbody>{shown.map((r) => { const dl = r.median != null && r.prevMedian != null ? r.median - r.prevMedian : null; return <tr key={r.key} tabIndex={0} data-cat={r.key} onClick={() => onCat(r.key)} onKeyDown={(e) => e.key === 'Enter' && onCat(r.key)}>
          <td>{r.name} {r.depts.map((d) => <span key={d} className={cn('stab-chip stab-chip-xs', deptTone[d])}>{DEPT_TH[d]}</span>)}{r.key === top.pinned && <span className="stab-pin">ใช้เวลานานสุด</span>}</td>
          <td>{r.created}</td>
          <td>{r.median == null ? <small className="text-muted-foreground">ยังไม่มี ticket ที่ Solve</small> : <span className="stab-med"><span className="stab-med-track"><i className={`stab-med-${medianTone(r.median)}`} style={{ width: `${(Math.min(r.median, 14) / 14) * 100}%` }} /><b style={{ left: `${(10 / 14) * 100}%` }} /></span>{r.median} {dl != null && dl !== 0 && <small className={dl < 0 ? 'text-success' : 'text-destructive'}>{dl < 0 ? `▼ ${Math.abs(dl)}` : `▲ ${dl}`}</small>}</span>}</td>
          <td>{r.open}</td><td className={r.overdue ? 'text-destructive' : ''}>{r.overdue}</td></tr>; })}</tbody></table>
      <aside className="stab-side"><strong>{slow?.median ?? '—'} วัน</strong><span>หมวดที่ใช้เวลานานสุด · {slow?.name ?? '—'}</span></aside>
    </div>
    {(top.hidden > 0 || more) && <button type="button" className="stab-link" onClick={() => setMore(!more)}>{more ? 'ย่อเหลือ 5 หมวด + หมวดที่ใช้เวลานานสุด' : `ดูอีก ${top.hidden} หมวด`}</button>}
  </Card>;
}

/* ---------- ⑤ ---------- */
const tierTh = { R: 'แดง', A: 'เหลือง', G: 'เขียว' } as const;
function Card5({ meetings, open, today, onTicket }: { meetings: StabMeetingInput[]; open: ServiceTicketRow[]; today: string; onTicket: (k: string) => void }) {
  const { cards, ready } = vStabMeetings(meetings, open, today);
  const [selId, setSel] = useState<string | null>(null);
  const sel = cards.find((c) => c.id === selId) ?? cards[0] ?? null;
  const tickets = cards.reduce((s, c) => s + c.tickets.length, 0);
  return <Card n="⑤" title="งานค้างของสัญญาก่อนประชุมประจำเดือน" q="ประชุมไหนกำลังจะมาถึง แต่ยังมีงานค้างกับลูกค้า?" now info={STAB.info5} right={<small>เป้า = 0 ก่อนประชุม</small>}>
    <div className="stab-c3">
      <div className="stab-mgrid" data-testid="stab-meetings">{cards.map((c) => <MeetingCard key={c.id} c={c} on={sel?.id === c.id} onPick={() => setSel(c.id)} />)}{!cards.length && <p className="text-muted-foreground">ไม่มีประชุมใน 7 วันที่ยังมี ticket ค้าง</p>}</div>
      <aside className="stab-side"><strong>{cards.length} สัญญา</strong><small>เร่งด่วน {cards.filter((c) => c.urgent).length} · ticket ค้างรวม {tickets} ใบ · เป้า = 0 ก่อนประชุม</small></aside>
    </div>
    {sel && <div className="stab-detail" data-testid="stab-detail"><h4>{sel.hotel} · ticket คงค้าง {sel.tickets.length} · ประชุม {thDay(sel.date)}</h4><p>AE {sel.ae} · {sel.service === 'ORM' ? 'ORM' : 'Marcom'} {sel.caretaker}</p>
      <TicketTable rows={sel.tickets} today={today} onTicket={onTicket} cols={['ticket', 'cat', 'subject', 'dept', 'assignee', 'status', 'due', 'fu']} /></div>}
    {ready.length > 0 && <p className="stab-ready" data-testid="stab-ready">🟢 พร้อมประชุม (ticket = 0) · {ready.map((m) => `${m.hotel} ${thDay(m.date)}`).join(' · ')}</p>}
  </Card>;
}
function MeetingCard({ c, on, onPick }: { c: StabMeetingCard; on: boolean; onPick: () => void }) {
  return <article className={cn('stab-mcard', c.urgent ? 'is-urgent' : 'is-clear', on && 'is-sel')} data-testid="stab-mcard">
    <div className="stab-mtop"><span>{c.urgent ? '🔴 เร่งด่วน' : '🟡 ต้องเคลียร์'}</span><span className={cn('stab-chip stab-chip-xs', c.service === 'ORM' ? 'stab-dept-orm' : 'stab-dept-marcom')}>{c.service === 'ORM' ? 'ORM' : 'Marcom'}</span></div>
    <h4>{c.hotel}</h4>{c.urgent && <small className="text-destructive">{c.reasons.join(' · ')}</small>}
    <dl><dt>ประชุม</dt><dd>{c.service === 'ORM' ? 'ORM-Snapshot Meeting' : 'Marcom-Sync up Meeting'}</dd><dt>วันที่</dt><dd>{thDay(c.date)} · อีก {c.daysTo} วัน</dd><dt>AE</dt><dd>{c.ae}</dd><dt>{c.service === 'ORM' ? 'ORM' : 'Marcom'}</dt><dd>{c.caretaker}</dd>
      <dt>สุขภาพ</dt><dd>{c.health ? <><i className={`stab-tier stab-tier-${c.health.tier}`} />{tierTh[c.health.tier]} {c.health.labels.map((l) => <span key={l.key} className={cn('stab-sig', l.dir === 'bad' && !l.amber ? 'is-bad' : 'is-warn')}><SignalMark dir={l.dir} />{l.label}</span>)}</> : <span className="text-muted-foreground">—</span>}</dd></dl>
    <div className="stab-mfoot"><strong>{c.tickets.length}</strong> ticket คงค้าง {c.overdue > 0 && <span className="text-destructive">เลยกำหนด {c.overdue}</span>}</div>
    {c.followups > 0 && <small>📣 Follow up แล้ว {c.followups} ครั้ง</small>}
    <Button size="sm" variant={on ? 'outline' : 'secondary'} onClick={onPick}>{on ? 'กำลังแสดงด้านล่าง' : 'ดูรายละเอียด'}</Button>
  </article>;
}

/* ---------- ⑥ ---------- */
type Col = 'ticket' | 'cat' | 'hotel' | 'subject' | 'dept' | 'assignee' | 'status' | 'due' | 'fu' | 'age' | 'opener';
const COL_TH: Record<Col, string> = { ticket: 'ticket', cat: 'หมวด', hotel: 'โรงแรม', subject: 'เรื่อง', dept: 'แผนก', assignee: 'ผู้รับ', status: 'สถานะ', due: 'กำหนดเสร็จ', fu: 'Follow up', age: 'อายุ', opener: 'เปิดโดย' };
function TicketTable({ rows, today, onTicket, cols }: { rows: ServiceTicketRow[]; today: string; onTicket: (k: string) => void; cols: Col[] }) {
  const cell = (r: ServiceTicketRow, c: Col): ReactNode => {
    switch (c) {
      case 'ticket': return <button type="button" className="stab-link" onClick={() => onTicket(`${r.ticket_store}:${r.ticket_id}`)}>{r.ticket_no}</button>;
      case 'cat': return r.category_name_th; case 'hotel': return r.hotel_name; case 'subject': return r.subject;
      case 'dept': return <span className={cn('stab-chip stab-chip-xs', deptTone[r.dept])}>{DEPT_TH[r.dept]}</span>;
      case 'assignee': return r.display_status === 'NEW' ? <span className="text-muted-foreground">— คิวแผนก</span> : r.assignee_label ?? '—';
      case 'status': return <span className={cn('stab-status', statusTone[r.display_status])}>{SVC_STATUS_TH[r.display_status]}</span>;
      case 'due': return <DueCell r={r} today={today} />; case 'fu': return fuCell(r, today);
      case 'age': return `${r.age_days} วัน`; case 'opener': return r.opened_by_label;
    }
  };
  return <div className="stab-scroll"><table className="stab-table stab-list"><thead><tr>{cols.map((c) => <th key={c}>{COL_TH[c]}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={`${r.ticket_store}:${r.ticket_id}`} data-ticket={r.ticket_no}>{cols.map((c) => <td key={c}>{cell(r, c)}</td>)}</tr>)}</tbody></table></div>;
}
function Card6({ rows, cats, dept, f, setF, today, onTicket }: { rows: ServiceTicketRow[]; cats: TicketCategory[]; dept: DeptFilter; f: ListFilter; setF: (f: ListFilter) => void; today: string; onTicket: (k: string) => void }) {
  const list = listRows(rows, dept, f, today);
  const sugg = suggestions(rows).filter((s) => f.q && s.includes(f.q.split(/\s+/).pop() ?? '') && !f.q.includes(s)).slice(0, 6);
  const catOpts = [...new Map(cats.filter((c) => !c.hidden && (dept === 'ALL' || c.dept === dept)).map((c) => [c.key, c.name_th])).entries()];
  const add = (t: string) => setF({ ...f, q: t });
  return <Card id="stab-list" n="⑥" title="รายการ ticket" q="ค้นหา ticket จากเลข ticket ชื่อโรงแรม หรือเรื่อง" info={STAB.info6}>
    <div className="stab-filters">
      <div className="stab-search"><input aria-label="ค้นหา ticket" placeholder="ค้นหา ticket / โรงแรม / เรื่อง / ผู้รับ / เปิดโดย / อายุ" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        {sugg.length > 0 && <ul role="listbox" className="stab-sugg">{sugg.map((s) => <li key={s} role="option" aria-selected={false}><button type="button" onClick={() => setF({ ...f, q: [...f.q.split(/\s+/).slice(0, -1), s].join(' ') })}>{s}</button></li>)}</ul>}</div>
      <select aria-label="สถานะ" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ListFilter['status'] })}><option value="ALL">สถานะ: ทั้งหมด</option>{OPEN_ST.map((s) => <option key={s} value={s}>{SVC_STATUS_TH[s]}</option>)}</select>
      <select aria-label="กำหนดเสร็จ" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value as ListFilter['due'] })}><option value="ALL">กำหนดเสร็จ: ทั้งหมด</option>{(['NO_DATE', 'ON_TIME', 'OVERDUE'] as DueState[]).map((s) => <option key={s} value={s}>{DUE_STATE_TH[s]}</option>)}</select>
      <select aria-label="หมวด" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}><option value="ALL">หมวด: ทั้งหมด</option>{catOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      <label><input type="checkbox" checked={f.showSolved} onChange={(e) => setF({ ...f, showSolved: e.target.checked })} /> แสดง Solve ใน 30 วัน</label>
      <button type="button" className="stab-link" onClick={() => setF(EMPTY_LIST_FILTER)}>ล้างตัวกรอง</button>
    </div>
    <p className="stab-hint">ตัวอย่าง: {['ผู้รับ:เตย', 'เปิดโดย:นนท์', 'อายุ>7', 'อายุ<3', 'ผู้รับ:เตย อายุ>5'].map((t) => <button key={t} type="button" className="stab-link" onClick={() => add(t)}>{t}</button>)}</p>
    <p className="stab-sub" data-testid="stab-list-count">{list.length} ticket · เรียงตามกำหนดเสร็จที่ใกล้ / เลยมากสุดก่อน</p>
    <TicketTable rows={list} today={today} onTicket={onTicket} cols={['ticket', 'cat', 'hotel', 'subject', 'dept', 'assignee', 'status', 'due', 'fu', 'age', 'opener']} />
  </Card>;
}

/* ---------- drawer ---------- */
type ActRole = 'PM' | 'AE' | 'ORM' | 'MARCOM';
const ACTORS: Record<ActRole, SvcActor> = { PM: { role: 'PM', label: 'PM Alex' }, AE: { role: 'AE', label: 'นนท์', member_id: 'ae-nont' }, ORM: { role: 'ORM', label: 'เตย', member_id: 'orm-toey', dept: 'ORM' }, MARCOM: { role: 'MARCOM', label: 'บิว', member_id: 'mk-biw', dept: 'MARCOM' } };
const ACT_TH: Record<ActRole, string> = { PM: 'PM (Alex)', AE: 'AE นนท์', ORM: 'ORM เตย', MARCOM: 'Marcom บิว' };
export function timelineOf(r: ServiceTicketRow, l0: L0Ticket | undefined, demo: boolean): { at: string; text: string }[] {
  const items: { at: string; text: string }[] = [];
  if (l0) for (const a of l0.audit) if (!(a.note ?? '').startsWith('Follow up')) items.push({ at: a.at, text: `${a.actor ?? a.by}${a.to_status && a.to_status !== a.from_status ? ` · ${a.to_status === 'NEW' ? 'สร้าง ticket' : SVC_STATUS_TH[(a.to_status === 'DONE' ? 'SOLVED' : a.to_status) as DisplayStatus] ?? a.to_status}` : ''}${a.note ? ` · ${a.note}` : ''}` });
  if (!l0) { items.push({ at: r.created_at, text: `${r.opened_by_label} · สร้าง ticket` }); if (r.solved_at) items.push({ at: r.solved_at, text: 'Solve' }); }
  for (const f of ticketFollowups.all(demo).filter((x) => x.ticket_store === r.ticket_store && x.ticket_id === r.ticket_id)) items.push({ at: f.sent_at, text: `📣 Follow up โดย ${f.sent_by}${f.note ? ` · “${f.note}”` : ''}` });
  return items.sort((a, b) => a.at.localeCompare(b.at));
}
function TicketDrawer({ row, today, demo, onClose }: { row: ServiceTicketRow | null; today: string; demo: boolean; onClose: () => void }) {
  const l0all = useTickets();
  const [who, setWho] = useState<ActRole>('PM');
  const [note, setNote] = useState('');
  useEffect(() => setNote(''), [row?.ticket_id]);
  if (!row) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>;
  const l0 = row.ticket_store === 'L0' ? l0all.find((t) => t.ticket_id === row.ticket_id) : undefined;
  const sentToday = !!row.last_followup_at && ticketFollowups.all(demo).some((f) => f.ticket_store === row.ticket_store && f.ticket_id === row.ticket_id && f.sent_date_bkk === today);
  const isOpen = row.display_status !== 'SOLVED' && row.display_status !== 'CANCELLED';
  const canFu = who === 'AE' || who === 'PM';
  const recipient = row.accepted && row.assignee_label ? row.assignee_label : `คิว ${DEPT_TH[row.dept]} + ${TEST_ROLE_LABEL[HEAD_OF[row.dept]]}`;
  const send = () => { const r = sendFollowUp(row, ACTORS[who], { demo, note }); if (r.ok) { toast.success(`ส่ง Follow up ถึง ${recipient} แล้ว · ${row.ticket_no}`); setNote(''); } else toast.error(r.error); };
  return <Sheet open onOpenChange={(o) => !o && onClose()}>
    <SheetContent className="stab-drawer w-full overflow-y-auto sm:max-w-xl" data-testid="stab-drawer">
      <SheetHeader><small className="text-muted-foreground">{row.category_name_th}</small><SheetTitle>{row.ticket_no}</SheetTitle>
        <SheetDescription asChild><div className="flex flex-wrap gap-1"><span className={cn('stab-status', statusTone[row.display_status])}>{SVC_STATUS_TH[row.display_status]}</span><span className={cn('stab-chip stab-chip-xs', deptTone[row.dept])}>{DEPT_TH[row.dept]}</span><span className="stab-chip stab-chip-xs">อ่านอย่างเดียว · PS / AE</span></div></SheetDescription></SheetHeader>
      {row.followup_count > 0 && <p className="stab-pill" data-testid="stab-fu-banner">📣 Follow up แล้ว {row.followup_count} ครั้ง · ล่าสุด {row.last_followup_at?.slice(0, 10) === today ? 'วันนี้' : thDay((row.last_followup_at ?? today).slice(0, 10))} โดย {row.last_followup_by_label}{sentToday ? ' · ส่งได้อีกครั้งพรุ่งนี้' : ''}</p>}
      <h4 className="mt-3 font-semibold">{row.subject}</h4>{row.description && row.description !== row.subject && <p className="text-sm">{row.description}</p>}
      <dl className="stab-kv"><dt>โรงแรม</dt><dd>{row.hotel_name}</dd><dt>ผู้รับ</dt><dd>{row.display_status === 'NEW' ? '— คิวแผนก' : row.assignee_label ?? '—'}</dd><dt>เปิดโดย</dt><dd>{row.opened_by_label}</dd><dt>สร้างเมื่อ</dt><dd>{thDay(row.created_date)} · {row.age_days} วันก่อน</dd><dt>กำหนดเสร็จ</dt><dd><DueCell r={row} today={today} /></dd></dl>
      <h5 className="mt-3 text-sm font-semibold">ความคืบหน้าจากทีม</h5>
      <ol className="stab-timeline" data-testid="stab-timeline">{timelineOf(row, l0, demo).map((t, i) => <li key={i}><time>{thDay(t.at.slice(0, 10))}</time> {t.text}</li>)}</ol>
      <div className="stab-fubox">
        <label className="text-xs">ทำรายการในนาม (ทดสอบ) <select aria-label="ทำรายการในนาม" value={who} onChange={(e) => setWho(e.target.value as ActRole)}>{(Object.keys(ACT_TH) as ActRole[]).map((k) => <option key={k} value={k}>{ACT_TH[k]}</option>)}</select></label>
        {!isOpen ? <p className="text-muted-foreground">ticket นี้ Solve แล้ว · Follow up ไม่ได้</p> : canFu ? <>
          <Textarea aria-label="ข้อความถึงทีม (ไม่บังคับ)" maxLength={300} placeholder={`เช่น ลูกค้าจะประชุม ${thDay(addDays(today, 3))} ขอคำตอบก่อนวันนั้น`} value={note} onChange={(e) => setNote(e.target.value)} disabled={sentToday} />
          <Button onClick={send} disabled={sentToday} data-testid="stab-fu-send">{sentToday ? 'ส่งแล้ววันนี้ · ส่งได้อีกครั้งพรุ่งนี้' : 'Follow up'}</Button>
          <small className="text-muted-foreground">แจ้งกระดิ่ง Workspace ของ {recipient} · ส่งได้วันละ 1 ครั้งต่อ ticket · เคยส่งแล้ว {row.followup_count} ครั้ง</small></> : null}
      </div>
      <Button variant="ghost" className="mt-3" onClick={onClose}>ปิด</Button>
    </SheetContent>
  </Sheet>;
}

/* UAT Polish R2 SP16: sortable count columns (one active sort; มาก → น้อย first). */
export type DeptSortKey = 'total' | 'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'overdue';
export type DeptSort = { key: DeptSortKey; dir: 'desc' | 'asc' } | null;
const DEPT_SORT_COLS: [DeptSortKey, string][] = [['total', 'คงค้าง'], ['NEW', 'ยังไม่ใส่วันที่ (New)'], ['IN_PROGRESS', 'กำลังดำเนินการ'], ['WAITING_CUSTOMER', 'รอลูกค้า'], ['WAITING_THIRD_PARTY', 'รอ 3rd Party'], ['overdue', 'เลยกำหนด']];
export function sortDepts<T extends Record<DeptSortKey, number>>(rows: T[], sort: DeptSort): T[] {
  if (!sort) return rows;
  const m = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => (a[sort.key] - b[sort.key]) * m);
}
/* UAT Polish R2 SP16b: งานค้างของสัญญา (card ⑤) unmounted from this tab; code kept. */
const SHOW_PENDING_BEFORE_MEETING = false;
