/* Task v2: PS cases retain RPC writes; L0 is read-only; monitors are projection-only. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Chip } from '@/components/crm/crm-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useHrMembers } from '@/lib/hr-members';
import { matchesBook, useDashboardGlobal, type GlobalFilter } from '@/lib/ps-dashboard-global';
import { demoTaskHotels } from '@/lib/ps-demo-fixture';
import {
  STATUSES, STATUS_LABEL, TEAMS, TEAM_LABEL, UNASSIGNED, WAITING_LABEL, readTaskMonitor, resetDemoTickets, responsibleOf, ticketApi, useDemoVersion, watchersOf,
  type Category, type HotelCare, type MonitorRow, type Team, type Ticket, type TicketStatus, type WaitingReason, type TaskMonitorView,
} from '@/lib/task-tickets';
import { useWs2 } from '@/lib/ws2-store';
import { cn } from '@/lib/utils';
import { taskDemo, TASK_DEMO_NOW } from '@/lib/task-demo';
import { SEED_CATEGORIES } from '@/lib/task-tickets';
import { useTickets, type L0Ticket } from '@/lib/tickets-l0';
import { getWorklist, workInScope, monitorScope, TASK_CONFIG, type WorkRow } from '@/lib/task-worklist';
import { readTaskFlow } from '@/lib/task-flow.functions';
import { ChartHint } from './dash-card';
import { TaskMonitorV2, CurrentNote } from './task-monitor-v2';
import { TaskFlowV2 } from './task-flow-v2';
import { TaskWorklistV2 } from './task-worklist-v2';

/** §3 read-only resolution from the assignment master (WS-2 property + service profiles + HR nicknames). */
function useHotelCare(demo: boolean): HotelCare[] {
  const w = useWs2();
  const { nick } = useHrMembers();
  return useMemo(() => {
    if (demo) return demoTaskHotels();
    return w.properties.map(p => {
      const profs = w.profiles.filter(x => x.property_id === p.hotel_id);
      const orm = profs.find(x => x.service === 'ORM');
      const mkt = profs.find(x => x.service !== 'ORM');
      return { hotel_id: p.hotel_id, hotel_name: p.hotel_name_th || p.hotel_name_en || p.hotel_id, ae: nick(p.assigned_ae_id), orm: orm ? { member: nick(orm.revenue_member_id) } : null, marcom: mkt ? { member: nick(mkt.marcom_member_id) } : null };
    });
  }, [demo, w.properties, w.profiles, nick]);
}

export function useTaskData() {
  const { demo, now } = useDashboardGlobal();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => { if (demo) resetDemoTickets(); }, [demo]);
  const v = useDemoVersion();
  const tickets = useQuery({ queryKey: ['task-tickets', demo, demo ? v : 0], queryFn: () => ticketApi.list(demo), enabled: ready, staleTime: demo ? Infinity : 15_000, refetchInterval: demo ? false : 30_000 });
  const categories = useQuery({ queryKey: ['task-categories', demo], queryFn: () => ticketApi.categories(demo), enabled: ready, staleTime: Infinity });
  const monitor = useQuery({ queryKey: ['task-monitor'], queryFn: readTaskMonitor, enabled: ready && !demo, staleTime: 60_000 });
  const monitorData: Record<TaskMonitorView, MonitorRow[]> | undefined = demo ? taskDemo(SEED_CATEGORIES, demoTaskHotels()).monitor : monitor.data;
  return { demo, now: new Date(demo ? TASK_DEMO_NOW : now || Date.now()), tickets: tickets.data ?? [], ticketsLoading: tickets.isLoading, ticketsError: tickets.isError, categories: categories.data ?? [], monitor: monitorData, monitorError: !demo && monitor.isError };
}

/** §8 mapping: Service → routed_team (AC/PS only under All); ownership lens → responsible OR watchers; hotel search/status. */
export function ticketInScope(t: Ticket, f: GlobalFilter, care: HotelCare | undefined) {
  if (f.service === 'ORM' && t.routed_team !== 'ORM') return false;
  if (f.service === 'Marcom' && t.routed_team !== 'MARCOM') return false;
  const resp = responsibleOf(t.routed_team, care);
  const w = watchersOf(care);
  const pick = (role: string) => [...w.filter(x => x.role === role).map(x => x.name), ...((role === 'AE' && t.routed_team === 'PS') || (role === 'ORM' && t.routed_team === 'ORM') || (role === 'Marcom' && t.routed_team === 'MARCOM') ? [resp] : [])].filter(n => n !== UNASSIGNED);
  const row = { ae_owner_id: pick('AE')[0] ?? null, orm_owner_id: pick('ORM')[0] ?? null, marcom_owner_id: pick('Marcom')[0] ?? null, hotel_id: t.hotel_id, hotel_name: t.hotel_name, status: care?.status ?? null };
  return matchesBook(row, { ...f, service: 'ALL', hotelStatus: care?.status ? f.hotelStatus : 'all' }, true);
}

const CASE_STATUS_TH: Record<TicketStatus,string> = {open:'เปิด','in-progress':'กำลังทำ',waiting:'รอ',resolved:'ปิดแล้ว',closed:'ปิดแล้ว'};
function LiveTicketReader({onChange}:{onChange:(rows:L0Ticket[])=>void}) {const tickets=useTickets();useEffect(()=>onChange(tickets),[tickets,onChange]);return null;}
const pill: Record<TicketStatus, string> = { open: 'bg-primary/10 text-primary', 'in-progress': 'bg-accent text-accent-foreground', waiting: 'bg-warning/20 text-warning-foreground', resolved: 'bg-muted text-muted-foreground', closed: 'bg-muted text-muted-foreground' };
const StatusPill = ({ t }: { t: Ticket }) => <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', pill[t.status])}>{CASE_STATUS_TH[t.status]}{t.waiting_reason ? ` · ${WAITING_LABEL[t.waiting_reason]}` : ''}</span>;
const EmptyState = ({ text }: { text: string }) => <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><Inbox className="size-6" />{text}</div>;

function CategoryPicker({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (v: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label="หมวดย่อย"><SelectValue placeholder="เลือกหมวดย่อย" /></SelectTrigger><SelectContent>{TEAMS.map(team => <SelectGroup key={team}><SelectLabel>{TEAM_LABEL[team]}</SelectLabel>{categories.filter(c => c.domain === team).sort((a, b) => a.sort - b.sort).map(c => <SelectItem key={c.code} value={c.code}>{c.subcategory_label_th}</SelectItem>)}</SelectGroup>)}</SelectContent></Select>;
}
function DeptPicker({ value, onChange, disabled }: { value: Team | null; onChange: (t: Team) => void; disabled?: boolean }) {
  return <Select value={value ?? ''} onValueChange={v => onChange(v as Team)} disabled={!!disabled}><SelectTrigger aria-label="แผนกรับผิดชอบ"><SelectValue placeholder="เลือกหมวดย่อยก่อน" /></SelectTrigger><SelectContent>{TEAMS.map(t => <SelectItem key={t} value={t}>{TEAM_LABEL[t]}</SelectItem>)}</SelectContent></Select>;
}
function People({ care, team }: { care: HotelCare | undefined; team: Team | null }) {
  return <div className="space-y-1 text-sm"><p>ผู้รับผิดชอบ (ตามแผนกที่เลือก): <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{team ? responsibleOf(team, care) : '—'}</span></p><div className="flex flex-wrap items-center gap-1"><span className="text-muted-foreground">ผู้ติดตาม:</span>{watchersOf(care).map(w => <Chip key={w.role} tone="muted">{w.role}: {w.name}</Chip>)}{!care && <span className="text-muted-foreground">—</span>}</div></div>;
}

export function TaskTab() {
  const d = useTaskData();
  const { filter } = useDashboardGlobal();
  const { members } = useHrMembers();
  const qc = useQueryClient();
  const care = useHotelCare(d.demo);
  const byHotel = useMemo(() => new Map(care.map(c => [c.hotel_id, c])), [care]);
  const actors = useMemo(() => ['PM (Alex)', ...members.filter(m => m.active).map(m => m.nickname)], [members]);
  const [actor, setActor] = useState('PM (Alex)');
  const [creating, setCreating] = useState(false), [openId, setOpenId] = useState<string|null>(null);
  const [liveL0,setLiveL0] = useState<L0Ticket[]>([]);
  const fixture = useMemo(() => taskDemo(SEED_CATEGORIES, demoTaskHotels()), []);
  const readFlow = useServerFn(readTaskFlow);
  const flow = useQuery({queryKey:['task-flow'],queryFn:()=>readFlow(),enabled:!d.demo,staleTime:30000});
  const all = getWorklist(d.tickets,d.demo?fixture.tickets:liveL0,d.categories,care,d.now.toISOString());
  const rows = all.filter(r=>workInScope(r,filter,byHotel.get(r.hotel_id??'')));
  const caseFlow = (d.demo?fixture.flow:flow.data??[]).filter(r=>{
    const c=care.find(c=>c.hotel_id===r.hotel_id);
    const stub = {source_kind:'CASE',dept:r.routed_team,hotel_id:r.hotel_id,hotel_name:r.hotel_name} as WorkRow;
    return workInScope(stub,filter,c);
  });
  const coaching=monitorScope(d.monitor?.v_task_coaching_backlog??[],filter,care).filter(r=>r.status==='open'||r.status==='in-progress');
  const unassigned=monitorScope(d.monitor?.v_task_unassigned??[],filter,care);
  const streams=monitorScope(d.monitor?.v_task_deadline_streams??[],filter,care).filter(r=>r.stream!=='coaching'&&r['renewed']!==true);
  const renewals=streams.filter(r=>r.stream==='renewal');
  const past=renewals.filter(r=>d.demo?Number(r.age_days)<0:!!r['deadline']&&String(r['deadline']).slice(0,10)<d.now.toISOString().slice(0,10));
  const soon=renewals.filter(r=>d.demo?Number(r.age_days)>=0&&Number(r.age_days)<=TASK_CONFIG.renewal_buckets[1]:!!r['deadline']&&String(r['deadline'])>=d.now.toISOString().slice(0,10)&&Date.parse(String(r['deadline']))-d.now.getTime()<=TASK_CONFIG.renewal_buckets[1]*864e5);
  const active=rows.filter(r=>r.status_group!=='CLOSED'),ps=active.filter(r=>r.source_kind==='CASE'),l0=active.filter(r=>r.source_kind==='L0');
  const kpis=[{label:'งานเปิดทั้งหมด',value:active.length,unit:'งาน',tone:'accent',caption:`เคส PS ${ps.length} · Ticket ระบบ ${l0.length}`,header:`งานที่ยังไม่ปิด ${active.length} งาน`,lines:[`เคส PS ${ps.length} (เปิด ${ps.filter(r=>r.status_group==='OPEN').length} · กำลังทำ ${ps.filter(r=>r.status_group==='IN_PROGRESS').length} · รอ ${ps.filter(r=>r.status_group==='WAITING').length})`,`Ticket ระบบ ${l0.length} (ใหม่ ${l0.filter(r=>r.status_group==='OPEN').length} · รับแล้ว/กำลังทำ ${l0.filter(r=>r.status_group==='IN_PROGRESS').length})`,'ไม่รวมงานในส่วน “งานค้างจากระบบ”']},
  {label:'เคสเกินกำหนด',value:ps.filter(r=>r.is_overdue).length,unit:'เคส',tone:'watch',caption:`เคส PS ค้างเกิน ${TASK_CONFIG.case_overdue_days} วัน`,header:`เคส PS ที่ค้างเกินเกณฑ์ ${ps.filter(r=>r.is_overdue).length} เคส`,lines:['นับเฉพาะสถานะเปิด / กำลังทำ',`เกณฑ์ ${TASK_CONFIG.case_overdue_days} วัน (ปรับได้ · รายหมวดรอ PM)`,'Ticket ระบบยังไม่มี SLA จึงไม่นับ']},
  {label:'รอระบุผู้ดูแล',value:unassigned.length||null,unit:'รายการ',tone:'watch',caption:unassigned.length?[...new Set(unassigned.map(r=>r.role))].map(role=>`${role} ${unassigned.filter(r=>r.role===role).length}`).join(' · '):'รอข้อมูล',header:`โรงแรม-role ที่ยังตั้งผู้ดูแลไม่ครบ ${unassigned.length}`,lines:[`ค้างเกิน ${TASK_CONFIG.case_overdue_days} วัน ${unassigned.filter(r=>Number(r.age_days)>TASK_CONFIG.case_overdue_days).length} รายการ`,`เก่าสุด ${Math.max(0,...unassigned.map(r=>Number(r.age_days)))} วัน`,'ดูรายละเอียดที่การ์ด ②']},
  {label:'Coaching ค้าง',value:coaching.length||null,unit:'งาน',tone:'neutral',caption:coaching.length?`เปิด ${coaching.filter(r=>r.status==='open').length} · กำลังทำ ${coaching.filter(r=>r.status==='in-progress').length}`:'รอข้อมูล',header:`Coaching ที่ยังไม่ resolved ${coaching.length}`,lines:[[...new Set(coaching.map(r=>r.coach))].map(c=>`${c} ${coaching.filter(r=>r.coach===c).length}`).join(' · '),`เก่าสุด ${Math.max(0,...coaching.map(r=>Number(r.age_days)))} วัน`,'ดูรายละเอียดที่การ์ด ①']},
  {label:'ต่ออายุเลยกำหนด',value:renewals.length?past.length:null,unit:'สัญญา',tone:past.length?'action':'neutral',caption:renewals.length?'เลยวันหมดอายุ ยังไม่ต่อ':'รอข้อมูล',header:`สัญญาที่เลยวันหมดอายุ ${past.length} สัญญา`,lines:past.slice(0,3).map(r=>`${r.hotel_name} · ${r.service_line} · เลยมา ${d.demo?Math.abs(Number(r.age_days)):Math.floor((d.now.getTime()-Date.parse(String(r['deadline'])))/864e5)} วัน`)}];
  const refresh=()=>{qc.invalidateQueries({queryKey:['task-tickets']});qc.invalidateQueries({queryKey:['task-flow']});};
  const selected=d.tickets.find(t=>t.id===openId)??null;
  return <div className="task-v2" data-testid="task-tab">
    {!d.demo&&<LiveTicketReader onChange={setLiveL0}/>}
    {d.demo&&<p className="task-demo-watermark">ข้อมูลสาธิต · 17 ตุลาคม 2569 · ไม่บันทึก</p>}
    <header className="task-section-header"><h2>งานค้างวันนี้</h2><span className="task-current-pill">สถานะปัจจุบัน</span></header>
    <CurrentNote compare={filter.compare}/>
    <div className="task-kpis">{kpis.map((k,i)=><ChartHint key={k.label} header={k.header} lines={k.lines}><Button variant="ghost" className={`task-kpi task-kpi-${k.tone}`}><span>{k.label}</span><strong data-testid={`task-k${i+1}`} className={k.tone==='action'?'text-dash-action':k.tone==='watch'&&k.value?'text-dash-watch':''}>{i<2&&(d.ticketsError||d.ticketsLoading)?'—':k.value??'—'} <small>{k.unit}</small></strong><span className={i===4&&soon.length?'text-dash-watch':''}>{i===4&&soon.length?`ใกล้ครบใน ${TASK_CONFIG.renewal_buckets[1]} วัน อีก ${soon.length}`:'—'}</span><small>{k.caption}</small></Button></ChartHint>)}</div>
    <header className="task-section-header"><h2>งานค้างจากระบบ</h2><p>อ่านอย่างเดียว · ปิดงานที่หน้าต้นทาง · ไม่มี Compare (สถานะปัจจุบัน)</p></header>
    <TaskMonitorV2 coaching={coaching} unassigned={unassigned} streams={streams} compare={filter.compare} demo={d.demo}/>
    <header className="task-section-header"><h2>Ticket และเคส</h2><p>รวมเคสที่ PS เปิดเอง กับ Ticket ที่ระบบหรือ tab อื่นส่งเข้าแผนก</p></header>
    {(d.ticketsError||flow.isError||d.monitorError)&&!d.demo&&<p className="task-readonly">อ่านข้อมูลงานบางส่วนไม่สำเร็จ โปรดลองอีกครั้ง</p>}
    <TaskFlowV2 rows={rows} flow={caseFlow} filter={filter} now={d.now}/>
    <div className="flex flex-wrap items-center justify-end gap-2"><label>ผู้ทำรายการ</label><Select value={actor} onValueChange={setActor}><SelectTrigger aria-label="ผู้ทำรายการ" className="w-44"><SelectValue/></SelectTrigger><SelectContent>{actors.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
    <TaskWorklistV2 rows={rows} categories={d.categories} now={d.now} demo={d.demo} compare={filter.compare} onCreate={()=>setCreating(true)} onCase={t=>setOpenId(t.id)}/>
    <CreateCase open={creating} onClose={()=>setCreating(false)} hotels={care} categories={d.categories} actor={actor} demo={d.demo} onDone={t=>{refresh();toast.success(`สร้าง ${t.case_no} แล้ว`);}}/>
    <CaseDrawer ticket={selected} onClose={()=>setOpenId(null)} care={selected?byHotel.get(selected.hotel_id):undefined} categories={d.categories} actor={actor} actors={actors} onActor={setActor} demo={d.demo} onSaved={refresh}/>
  </div>;
}

function CreateCase({ open, onClose, hotels, categories, actor, demo, onDone }: { open: boolean; onClose: () => void; hotels: HotelCare[]; categories: Category[]; actor: string; demo: boolean; onDone: (t: Ticket) => void }) {
  const [hq, setHq] = useState(''); const [hotel, setHotel] = useState<HotelCare | null>(null); const [cat, setCat] = useState(''); const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [dept, setDept] = useState<Team | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setHq(''); setHotel(null); setCat(''); setTitle(''); setDesc(''); setDept(null); } }, [open]);
  const team = dept ?? categories.find(c => c.code === cat)?.domain ?? null;
  const pickCat = (v: string) => { setCat(v); setDept(categories.find(c => c.code === v)?.domain ?? null); };
  const matches = hotels.filter(h => `${h.hotel_name} ${h.hotel_id}`.toLowerCase().includes(hq.trim().toLowerCase())).slice(0, 8);
  const save = async () => {
    if (!hotel || !cat || !title.trim()) { toast.error('กรุณาเลือกโรงแรม หมวดย่อย และใส่หัวข้อ'); return; }
    setBusy(true);
    try { const t = await ticketApi.create(demo, { hotel_id: hotel.hotel_id, hotel_name: hotel.hotel_name, category: cat, ...(team ? { routed_team: team } : {}), title, description: desc, actor }); onDone(t); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'สร้างเคสไม่สำเร็จ'); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={o => !o && onClose()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>สร้างเคส</DialogTitle></DialogHeader>
    <div className="space-y-3 text-sm">
      <div><label className="text-xs font-medium">โรงแรม *</label>{hotel ? <div className="mt-1 flex items-center justify-between rounded-md border px-3 py-2"><span>{hotel.hotel_name}</span><Button variant="ghost" size="sm" onClick={() => setHotel(null)}>เปลี่ยน</Button></div> : <><Input aria-label="ค้นหาโรงแรม" className="mt-1" placeholder="พิมพ์ชื่อหรือรหัสโรงแรม" value={hq} onChange={e => setHq(e.target.value)} /><div className="mt-1 max-h-40 overflow-y-auto rounded-md border">{matches.length ? matches.map(h => <button key={h.hotel_id} type="button" className="block w-full px-3 py-1.5 text-left hover:bg-muted" onClick={() => setHotel(h)}>{h.hotel_name} <span className="text-xs text-muted-foreground">{h.hotel_id}</span></button>) : <p className="px-3 py-2 text-muted-foreground">ไม่พบโรงแรม</p>}</div></>}</div>
      <div><label className="text-xs font-medium">หมวดย่อย *</label><CategoryPicker categories={categories} value={cat} onChange={pickCat} /></div>
      <div><label className="text-xs font-medium">แผนกรับผิดชอบ *</label><DeptPicker value={team} onChange={setDept} disabled={!cat} /><p className="mt-1 text-xs text-muted-foreground">ค่าเริ่มต้นตามหมวดย่อย · เปลี่ยนได้ · 1 เคส = 1 แผนก</p></div>
      <div><label className="text-xs font-medium">หัวข้อ *</label><Input aria-label="หัวข้อ" value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div><label className="text-xs font-medium">รายละเอียด</label><Textarea aria-label="รายละเอียด" value={desc} onChange={e => setDesc(e.target.value)} rows={3} /></div>
      <div className="rounded-lg bg-muted/50 p-2"><People care={hotel ?? undefined} team={team} /></div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button onClick={save} disabled={busy}>บันทึกเคส</Button></div>
    </div>
  </DialogContent></Dialog>;
}

function CaseDrawer({ ticket, onClose, care, categories, actor, actors, onActor, demo, onSaved }: { ticket: Ticket | null; onClose: () => void; care: HotelCare | undefined; categories: Category[]; actor: string; actors: string[]; onActor: (v:string)=>void; demo: boolean; onSaved: () => void }) {
  const qc = useQueryClient();
  const v = useDemoVersion();
  const [status, setStatus] = useState<TicketStatus>('open'); const [reason, setReason] = useState<WaitingReason | ''>(''); const [cat, setCat] = useState(''); const [dept, setDept] = useState<Team | null>(null); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false); const [conflict, setConflict] = useState(false);
  useEffect(() => { if (ticket) { setStatus(ticket.status); setReason(ticket.waiting_reason ?? ''); setCat(ticket.category_id); setDept(ticket.routed_team); setComment(''); setConflict(false); } }, [ticket?.id, ticket?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const timeline = useQuery({ queryKey: ['task-activity', ticket?.id, demo, ticket?.revision, demo ? v : 0], queryFn: () => ticket ? ticketApi.activity(demo, ticket.id) : Promise.resolve([]), enabled: !!ticket });
  const team = dept ?? ticket?.routed_team ?? null;
  const pickCat = (v: string) => { setCat(v); setDept(categories.find(c => c.code === v)?.domain ?? null); };
  const dirty = !!ticket && (status !== ticket.status || (status === 'waiting' && reason !== (ticket.waiting_reason ?? '')) || cat !== ticket.category_id || team !== ticket.routed_team || !!comment.trim());
  const save = async () => {
    if (!ticket) return;
    if (status === 'waiting' && !reason) { toast.error('สถานะรอต้องเลือกเหตุผล (รอลูกค้า / รอภายใน)'); return; }
    setBusy(true);
    try {
      const r = await ticketApi.update(demo, { id: ticket.id, revision: ticket.revision, actor, ...(status !== ticket.status || status === 'waiting' ? { status, waiting_reason: status === 'waiting' ? (reason as WaitingReason) : null } : {}), ...(cat !== ticket.category_id ? { category: cat } : {}), ...(team && (team !== ticket.routed_team || cat !== ticket.category_id) ? { routed_team: team } : {}), comment });
      if (!r.ok) { setConflict(true); onSaved(); return; }
      setComment(''); onSaved(); qc.invalidateQueries({ queryKey: ['task-activity'] }); toast.success('บันทึกแล้ว');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
  };
  return <Sheet open={!!ticket} onOpenChange={o => !o && onClose()}><SheetContent className="task-drawer" aria-describedby={undefined}>
    {ticket && <><SheetHeader><p className="task-drawer-eyebrow">{ticket.case_no} · เคส PS · PS เปิดเอง</p><SheetTitle>{ticket.title}</SheetTitle></SheetHeader>
      <div className="mt-3 space-y-4 text-sm">
        <div className="space-y-1"><p className="text-base font-semibold">{ticket.title}</p><p className="text-muted-foreground">{ticket.hotel_name} · {categories.find(c => c.code === ticket.category_id)?.subcategory_label_th} → {TEAM_LABEL[ticket.routed_team]}</p>{ticket.description && <p className="whitespace-pre-wrap">{ticket.description}</p>}<StatusPill t={ticket} /></div>
        <People care={care} team={team} />
        {conflict && <div className="rounded-lg border border-warning bg-warning/15 p-2 text-xs">มีคนแก้เคสนี้ก่อนหน้า · โหลดล่าสุดแล้วลองอีกครั้ง <Button size="sm" variant="outline" onClick={() => { setConflict(false); onSaved(); }}>โหลดใหม่</Button></div>}
        <div className="grid gap-2 rounded-lg border p-3 task-case-controls">
          <label className="text-xs font-medium">สถานะ (เปลี่ยนได้ทุกทิศทาง · เปิดใหม่ได้)</label>
          <Select value={status} onValueChange={s => setStatus(s as TicketStatus)}><SelectTrigger aria-label="สถานะเคส"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{CASE_STATUS_TH[s]}</SelectItem>)}</SelectContent></Select>
          {status === 'waiting' && <Select value={reason} onValueChange={r => setReason(r as WaitingReason)}><SelectTrigger aria-label="เหตุผลที่รอ"><SelectValue placeholder="เหตุผลที่รอ *" /></SelectTrigger><SelectContent>{(['CUSTOMER', 'INTERNAL'] as const).map(r => <SelectItem key={r} value={r}>{WAITING_LABEL[r]}</SelectItem>)}</SelectContent></Select>}
          <label className="text-xs font-medium">หมวดย่อย (เปลี่ยนแล้วตั้งแผนกใหม่ตามหมวด)</label>
          <CategoryPicker categories={categories} value={cat} onChange={pickCat} />
          <label className="text-xs font-medium">แผนกรับผิดชอบ (เปลี่ยนได้ · ผู้รับผิดชอบตามแผนก)</label>
          <DeptPicker value={team} onChange={setDept} />
          <label>เพิ่มคอมเมนต์</label><Textarea aria-label="เพิ่มคอมเมนต์" placeholder="พิมพ์ข้อความถึงทีม" value={comment} onChange={e => setComment(e.target.value)} rows={2} />
          <div className="flex items-center justify-between"><div><label>ในนามของ</label><Select value={actor} onValueChange={onActor}><SelectTrigger aria-label="ในนามของ"><SelectValue/></SelectTrigger><SelectContent>{actors.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div><Button size="sm" onClick={save} disabled={!dirty || busy}>{comment.trim()?'ส่งคอมเมนต์':'บันทึก'}</Button></div>
        </div>
        <div><p className="mb-2 text-xs font-semibold">ไทม์ไลน์</p><ol className="space-y-2">{[...(timeline.data ?? [])].reverse().sort((a,b)=>b.at.localeCompare(a.at)).map(a => <li key={a.id} className="rounded-md border-l-2 border-primary/40 pl-3"><p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString('th-TH')} · {a.actor_id} · {a.type}</p><p className="whitespace-pre-wrap">{a.body}</p></li>)}</ol></div>
      </div></>}
  </SheetContent></Sheet>;
}
