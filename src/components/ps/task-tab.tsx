/* PS Dashboard · Tab "Task" v1.0
 * Layer 1 — Ticket system: WRITE · live cloud tables (ticket / ticket_activity / ticket_category) · independent of Cloud Sync.
 * Layer 2 — Work monitor: READ-ONLY v_task_* views · empty until Cloud Sync seed + C5 · drill-through navigates only.
 * Layer 3 — skeleton. Never touches assignment master, pipeline, billing or Portfolio snapshot. Amber only, no red. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Inbox, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Chip, Panel } from '@/components/crm/crm-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useHrMembers } from '@/lib/hr-members';
import { matchesBook, selectedPeriod, deltaText, useDashboardGlobal, type GlobalFilter } from '@/lib/ps-dashboard-global';
import { demoOnboardCycle, demoTaskHotels } from '@/lib/ps-demo-fixture';
import {
  AGING_THRESHOLD_DAYS, STATUSES, STATUS_LABEL, TEAMS, TEAM_LABEL, UNASSIGNED, WAITING_LABEL, agingDays, isOverdue, readTaskMonitor, resetDemoTickets, responsibleOf, ticketApi, useDemoVersion, watchersOf,
  type Category, type HotelCare, type MonitorRow, type Team, type Ticket, type TicketStatus, type WaitingReason, type TaskMonitorView,
} from '@/lib/task-tickets';
import { useWs2 } from '@/lib/ws2-store';
import { cn } from '@/lib/utils';

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
  const monitorData: Record<TaskMonitorView, MonitorRow[]> | undefined = demo ? { v_task_coaching_backlog: [], v_task_unassigned: [], v_task_deadline_streams: [], v_task_onboard_cycle: demoOnboardCycle() } : monitor.data;
  return { demo, now: new Date(now || Date.now()), tickets: tickets.data ?? [], ticketsLoading: tickets.isLoading, ticketsError: tickets.isError, categories: categories.data ?? [], monitor: monitorData, monitorError: !demo && monitor.isError };
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

export function useOverdueTile() {
  const d = useTaskData();
  const { filter } = useDashboardGlobal();
  const care = useHotelCare(d.demo);
  const byHotel = new Map(care.map(c => [c.hotel_id, c]));
  const scoped = d.tickets.filter(t => ticketInScope(t, filter, byHotel.get(t.hotel_id)));
  const overdue = scoped.filter(t => isOverdue(t, d.now)).length;
  const pa = selectedPeriod(filter, d.now, 'A'), pb = selectedPeriod(filter, d.now, 'B');
  const cycle = (p: { from: string; to: string }) => { const rows = (d.monitor?.v_task_onboard_cycle ?? []).filter(r => filter.service === 'ALL' || r.service_line === filter.service); const xs = rows.filter(r => r.go_live_at && String(r.go_live_at) >= (filter.compare ? p.from : `${d.now.toISOString().slice(0, 7)}-01`) && String(r.go_live_at) <= p.to).map(r => Number(r.cycle_days)); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const prevMonth = { from: new Date(Date.UTC(d.now.getUTCFullYear(), d.now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10), to: new Date(Date.UTC(d.now.getUTCFullYear(), d.now.getUTCMonth(), 0)).toISOString().slice(0, 10) };
  const cycleB = filter.compare ? cycle(pb) : (() => { const xs = (d.monitor?.v_task_onboard_cycle ?? []).filter(r => (filter.service === 'ALL' || r.service_line === filter.service) && r.go_live_at && String(r.go_live_at) >= prevMonth.from && String(r.go_live_at) <= prevMonth.to).map(r => Number(r.cycle_days)); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; })();
  return { overdue, loading: d.ticketsLoading, error: d.ticketsError, cycleA: cycle(pa), cycleB, demo: d.demo };
}

const pill: Record<TicketStatus, string> = { open: 'bg-primary/10 text-primary', 'in-progress': 'bg-accent text-accent-foreground', waiting: 'bg-warning/20 text-warning-foreground', resolved: 'bg-muted text-muted-foreground', closed: 'bg-muted text-muted-foreground' };
const StatusPill = ({ t }: { t: Ticket }) => <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', pill[t.status])}>{STATUS_LABEL[t.status]}{t.waiting_reason ? ` · ${WAITING_LABEL[t.waiting_reason]}` : ''}</span>;
const EmptyState = ({ text }: { text: string }) => <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><Inbox className="size-6" />{text}</div>;

function CategoryPicker({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (v: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label="หมวดย่อย"><SelectValue placeholder="เลือกหมวดย่อย" /></SelectTrigger><SelectContent>{TEAMS.map(team => <SelectGroup key={team}><SelectLabel>{TEAM_LABEL[team]}</SelectLabel>{categories.filter(c => c.domain === team).sort((a, b) => a.sort - b.sort).map(c => <SelectItem key={c.code} value={c.code}>{c.subcategory_label_th}</SelectItem>)}</SelectGroup>)}</SelectContent></Select>;
}
function People({ care, team }: { care: HotelCare | undefined; team: Team | null }) {
  return <div className="space-y-1 text-sm"><p>ผู้รับผิดชอบ: <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{team ? responsibleOf(team, care) : '—'}</span></p><div className="flex flex-wrap items-center gap-1"><span className="text-muted-foreground">Watchers:</span>{watchersOf(care).map(w => <Chip key={w.role} tone="muted">{w.role}: {w.name}</Chip>)}{!care && <span className="text-muted-foreground">—</span>}</div></div>;
}

export function TaskTab() {
  const d = useTaskData();
  const { filter } = useDashboardGlobal();
  const { members } = useHrMembers();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const care = useHotelCare(d.demo);
  const byHotel = useMemo(() => new Map(care.map(c => [c.hotel_id, c])), [care]);
  const actors = useMemo(() => ['PM (Alex)', ...members.filter(m => m.active).map(m => m.nickname)], [members]);
  const [actor, setActor] = useState('PM (Alex)');
  const [q, setQ] = useState(''); const [cat, setCat] = useState('all'); const [st, setSt] = useState('all'); const [team, setTeam] = useState('all');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const catOf = (code: string) => d.categories.find(c => c.code === code);
  const scoped = d.tickets.filter(t => ticketInScope(t, filter, byHotel.get(t.hotel_id)));
  const rows = scoped.filter(t => (cat === 'all' || t.category_id === cat) && (st === 'all' || t.status === st) && (team === 'all' || t.routed_team === team) && (!q.trim() || `${t.hotel_name} ${t.case_no} ${t.title} ${t.description ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  const refresh = () => qc.invalidateQueries({ queryKey: ['task-tickets'] });
  const agg = (p: { from: string; to: string }) => { const xs = scoped.filter(t => t.created_at.slice(0, 10) >= p.from && t.created_at.slice(0, 10) <= p.to); const ag = xs.map(t => agingDays(t, d.now)).filter((n): n is number => n != null); return { open: xs.filter(t => t.status === 'open' || t.status === 'in-progress').length, overdue: xs.filter(t => isOverdue(t, d.now)).length, aging: ag.length ? ag.reduce((a, b) => a + b, 0) / ag.length : null }; };
  const selected = d.tickets.find(t => t.id === openId) ?? null;

  return <div className="space-y-4" data-testid="task-tab">
    <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">แท็บนี้ <b>เขียนข้อมูลได้</b>: ระบบเคส (บันทึกทันที · ไม่ขึ้นกับ Cloud Sync){d.demo ? ' · DEMO: บันทึกในหน่วยความจำเท่านั้น ไม่แตะ Cloud' : ''} · Work monitor อ่านอย่างเดียว · ไม่แตะผู้ดูแล / pipeline / billing / ภาพรวมสัญญา</p>
    <Panel title="ระบบเคส (Ticket)" subtitle={`ทุก role แก้ไขได้ · ผู้ทำรายการบันทึกทุกครั้ง · aging เกิน ${AGING_THRESHOLD_DAYS} วัน = สีเหลืองอำพัน`} right={<div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">ผู้ทำรายการ</span><Select value={actor} onValueChange={setActor}><SelectTrigger aria-label="ผู้ทำรายการ" className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent>{actors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>}>
      {filter.compare && <div className="mb-3 grid gap-2 sm:grid-cols-3">{(['open', 'overdue', 'aging'] as const).map(k => { const a = agg(filter.periodA)[k], b = agg(filter.periodB)[k]; return <div key={k} className="rounded-lg border p-2 text-xs"><p className="text-muted-foreground">{k === 'open' ? 'เคสเปิด' : k === 'overdue' ? 'เกินกำหนด' : 'Avg aging (วัน)'} · สร้างในช่วง</p><p className="tabular-nums">A {a == null ? '—' : a.toFixed(k === 'aging' ? 1 : 0)} · B {b == null ? '—' : b.toFixed(k === 'aging' ? 1 : 0)} · {deltaText(a, b)}</p></div>; })}</div>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="ค้นหาเคส" placeholder="ค้นหา: โรงแรม / เลขเคส / หัวข้อ / รายละเอียด" value={q} onChange={e => setQ(e.target.value)} className="h-9 pl-8" /></div>
        <Select value={cat} onValueChange={setCat}><SelectTrigger aria-label="กรองหมวด" className="h-9 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">หมวด: ทั้งหมด</SelectItem>{d.categories.map(c => <SelectItem key={c.code} value={c.code}>{TEAM_LABEL[c.domain]} · {c.subcategory_label_th}</SelectItem>)}</SelectContent></Select>
        <Select value={st} onValueChange={setSt}><SelectTrigger aria-label="กรองสถานะ" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select>
        <Select value={team} onValueChange={setTeam}><SelectTrigger aria-label="กรองทีม" className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทีม: ทั้งหมด</SelectItem>{TEAMS.map(t => <SelectItem key={t} value={t}>{TEAM_LABEL[t]}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" />New case</Button>
      </div>
      {d.ticketsError ? <EmptyState text="อ่านเคสไม่สำเร็จ ลองใหม่อีกครั้ง" /> : d.ticketsLoading ? <EmptyState text="กำลังโหลด…" /> : !rows.length ? <EmptyState text={d.tickets.length ? 'ไม่พบเคสตามตัวกรอง' : 'ยังไม่มีเคส — กด New case เพื่อสร้าง'} /> :
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{['เลขเคส', 'โรงแรม', 'หัวข้อ', 'หมวดย่อย', 'ทีม', 'ผู้รับผิดชอบ', 'สถานะ', 'Aging'].map(h => <th key={h} className="border-b px-2 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(t => { const ag = agingDays(t, d.now); const over = isOverdue(t, d.now); return <tr key={t.id} className="cursor-pointer border-b hover:bg-muted/50" onClick={() => setOpenId(t.id)}><td className="px-2 py-2 font-mono text-xs">{t.case_no}</td><td className="px-2 py-2">{t.hotel_name}</td><td className="px-2 py-2">{t.title}</td><td className="px-2 py-2 text-muted-foreground">{catOf(t.category_id)?.subcategory_label_th ?? t.category_id}</td><td className="px-2 py-2">{TEAM_LABEL[t.routed_team]}</td><td className="px-2 py-2">{responsibleOf(t.routed_team, byHotel.get(t.hotel_id))}</td><td className="px-2 py-2"><StatusPill t={t} /></td><td className={cn('px-2 py-2 tabular-nums', over && 'font-semibold text-warning-foreground')}>{ag == null ? '—' : <span className={cn(over && 'rounded bg-warning/25 px-1.5 py-0.5')}>{ag} วัน</span>}</td></tr>; })}</tbody></table></div>}
    </Panel>

    <CreateCase open={creating} onClose={() => setCreating(false)} hotels={care} categories={d.categories} actor={actor} demo={d.demo} onDone={t => { refresh(); toast.success(`สร้าง ${t.case_no} แล้ว`); }} />
    <CaseDrawer ticket={selected} onClose={() => setOpenId(null)} care={selected ? byHotel.get(selected.hotel_id) : undefined} categories={d.categories} actor={actor} demo={d.demo} onSaved={refresh} />

    <WorkMonitor monitor={d.monitor} error={d.monitorError} filter={filter} now={d.now} onNavigate={to => navigate({ to: to as '/ps' })} />

    <section aria-label="Layer 3" className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground opacity-70">
      <p className="font-semibold">Layer 3 · อนาคต</p>
      <p>สร้างเคสอัตโนมัติจาก flag / SLA breach · เชื่อมเคส ↔ สัญญา / meeting · สร้างเคสด่วนจาก Hotel Profile & Meeting · cross-app alert inbox — รอ workstream ถัดไป</p>
    </section>
  </div>;
}

function CreateCase({ open, onClose, hotels, categories, actor, demo, onDone }: { open: boolean; onClose: () => void; hotels: HotelCare[]; categories: Category[]; actor: string; demo: boolean; onDone: (t: Ticket) => void }) {
  const [hq, setHq] = useState(''); const [hotel, setHotel] = useState<HotelCare | null>(null); const [cat, setCat] = useState(''); const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setHq(''); setHotel(null); setCat(''); setTitle(''); setDesc(''); } }, [open]);
  const team = categories.find(c => c.code === cat)?.domain ?? null;
  const matches = hotels.filter(h => `${h.hotel_name} ${h.hotel_id}`.toLowerCase().includes(hq.trim().toLowerCase())).slice(0, 8);
  const save = async () => {
    if (!hotel || !cat || !title.trim()) { toast.error('กรุณาเลือกโรงแรม หมวดย่อย และใส่หัวข้อ'); return; }
    setBusy(true);
    try { const t = await ticketApi.create(demo, { hotel_id: hotel.hotel_id, hotel_name: hotel.hotel_name, category: cat, title, description: desc, actor }); onDone(t); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'สร้างเคสไม่สำเร็จ'); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={o => !o && onClose()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New case</DialogTitle></DialogHeader>
    <div className="space-y-3 text-sm">
      <div><label className="text-xs font-medium">โรงแรม *</label>{hotel ? <div className="mt-1 flex items-center justify-between rounded-md border px-3 py-2"><span>{hotel.hotel_name}</span><Button variant="ghost" size="sm" onClick={() => setHotel(null)}>เปลี่ยน</Button></div> : <><Input aria-label="ค้นหาโรงแรม" className="mt-1" placeholder="พิมพ์ชื่อหรือรหัสโรงแรม" value={hq} onChange={e => setHq(e.target.value)} /><div className="mt-1 max-h-40 overflow-y-auto rounded-md border">{matches.length ? matches.map(h => <button key={h.hotel_id} type="button" className="block w-full px-3 py-1.5 text-left hover:bg-muted" onClick={() => setHotel(h)}>{h.hotel_name} <span className="text-xs text-muted-foreground">{h.hotel_id}</span></button>) : <p className="px-3 py-2 text-muted-foreground">ไม่พบโรงแรม</p>}</div></>}</div>
      <div><label className="text-xs font-medium">หมวดย่อย *</label><CategoryPicker categories={categories} value={cat} onChange={setCat} /><p className="mt-1 text-xs text-muted-foreground">ส่งต่อทีม (อัตโนมัติ): <b>{team ? TEAM_LABEL[team] : '—'}</b></p></div>
      <div><label className="text-xs font-medium">หัวข้อ *</label><Input aria-label="หัวข้อ" value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div><label className="text-xs font-medium">รายละเอียด</label><Textarea aria-label="รายละเอียด" value={desc} onChange={e => setDesc(e.target.value)} rows={3} /></div>
      <div className="rounded-lg bg-muted/50 p-2"><People care={hotel ?? undefined} team={team} /></div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button onClick={save} disabled={busy}>บันทึกเคส</Button></div>
    </div>
  </DialogContent></Dialog>;
}

function CaseDrawer({ ticket, onClose, care, categories, actor, demo, onSaved }: { ticket: Ticket | null; onClose: () => void; care: HotelCare | undefined; categories: Category[]; actor: string; demo: boolean; onSaved: () => void }) {
  const qc = useQueryClient();
  const v = useDemoVersion();
  const [status, setStatus] = useState<TicketStatus>('open'); const [reason, setReason] = useState<WaitingReason | ''>(''); const [cat, setCat] = useState(''); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false); const [conflict, setConflict] = useState(false);
  useEffect(() => { if (ticket) { setStatus(ticket.status); setReason(ticket.waiting_reason ?? ''); setCat(ticket.category_id); setComment(''); setConflict(false); } }, [ticket?.id, ticket?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const timeline = useQuery({ queryKey: ['task-activity', ticket?.id, demo, ticket?.revision, demo ? v : 0], queryFn: () => ticketApi.activity(demo, ticket!.id), enabled: !!ticket });
  const team = categories.find(c => c.code === cat)?.domain ?? ticket?.routed_team ?? null;
  const dirty = !!ticket && (status !== ticket.status || (status === 'waiting' && reason !== (ticket.waiting_reason ?? '')) || cat !== ticket.category_id || !!comment.trim());
  const save = async () => {
    if (!ticket) return;
    if (status === 'waiting' && !reason) { toast.error('สถานะ Waiting ต้องเลือกเหตุผล (รอลูกค้า / รอภายใน)'); return; }
    setBusy(true);
    try {
      const r = await ticketApi.update(demo, { id: ticket.id, revision: ticket.revision, actor, ...(status !== ticket.status || status === 'waiting' ? { status, waiting_reason: status === 'waiting' ? (reason as WaitingReason) : null } : {}), ...(cat !== ticket.category_id ? { category: cat } : {}), comment });
      if (!r.ok) { setConflict(true); return; }
      setComment(''); onSaved(); qc.invalidateQueries({ queryKey: ['task-activity'] }); toast.success('บันทึกแล้ว');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
  };
  return <Sheet open={!!ticket} onOpenChange={o => !o && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
    {ticket && <><SheetHeader><SheetTitle className="font-mono">{ticket.case_no}</SheetTitle></SheetHeader>
      <div className="mt-3 space-y-4 text-sm">
        <div className="space-y-1"><p className="text-base font-semibold">{ticket.title}</p><p className="text-muted-foreground">{ticket.hotel_name} · {categories.find(c => c.code === ticket.category_id)?.subcategory_label_th} → {TEAM_LABEL[ticket.routed_team]}</p>{ticket.description && <p className="whitespace-pre-wrap">{ticket.description}</p>}<StatusPill t={ticket} /></div>
        <People care={care} team={team} />
        {conflict && <div className="rounded-lg border border-warning bg-warning/15 p-2 text-xs">เคสนี้ถูกแก้ไขโดยผู้อื่น — <Button size="sm" variant="outline" onClick={() => { setConflict(false); onSaved(); }}>โหลดใหม่</Button></div>}
        <div className="grid gap-2 rounded-lg border p-3">
          <label className="text-xs font-medium">สถานะ (เปลี่ยนได้ทุกทิศทาง · เปิดใหม่ได้)</label>
          <Select value={status} onValueChange={s => setStatus(s as TicketStatus)}><SelectTrigger aria-label="สถานะเคส"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select>
          {status === 'waiting' && <Select value={reason} onValueChange={r => setReason(r as WaitingReason)}><SelectTrigger aria-label="เหตุผลที่รอ"><SelectValue placeholder="เหตุผลที่รอ *" /></SelectTrigger><SelectContent>{(['CUSTOMER', 'INTERNAL'] as const).map(r => <SelectItem key={r} value={r}>{WAITING_LABEL[r]}</SelectItem>)}</SelectContent></Select>}
          <label className="text-xs font-medium">หมวดย่อย (เปลี่ยนแล้วส่งต่อทีมใหม่อัตโนมัติ)</label>
          <CategoryPicker categories={categories} value={cat} onChange={setCat} />
          <Textarea aria-label="ความคิดเห็น" placeholder="เพิ่มความคิดเห็น…" value={comment} onChange={e => setComment(e.target.value)} rows={2} />
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">บันทึกในชื่อ: {actor}</span><Button size="sm" onClick={save} disabled={!dirty || busy}>บันทึก</Button></div>
        </div>
        <div><p className="mb-2 text-xs font-semibold">Timeline</p><ol className="space-y-2">{(timeline.data ?? []).map(a => <li key={a.id} className="rounded-md border-l-2 border-primary/40 pl-3"><p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString('th-TH')} · {a.actor_id} · {a.type}</p><p className="whitespace-pre-wrap">{a.body}</p></li>)}</ol></div>
      </div></>}
  </SheetContent></Sheet>;
}

function WorkMonitor({ monitor, error, filter, now, onNavigate }: { monitor: Record<TaskMonitorView, MonitorRow[]> | undefined; error: boolean; filter: GlobalFilter; now: Date; onNavigate: (to: string) => void }) {
  const scope = (rows: MonitorRow[]) => rows.filter(r => matchesBook({ ...r, service_line: r.service_line as string | null, ae_owner_id: (r.owner_id ?? r.coach ?? null) as string | null }, filter, true));
  const empty = error ? 'อ่านข้อมูลไม่ได้ในขณะนี้' : 'ข้อมูลจะเข้ามาหลัง Cloud Sync seed';
  const coaching = scope(monitor?.v_task_coaching_backlog ?? []), unassigned = scope(monitor?.v_task_unassigned ?? []), streams = scope(monitor?.v_task_deadline_streams ?? []);
  const cycle = (monitor?.v_task_onboard_cycle ?? []).filter(r => filter.service === 'ALL' || r.service_line === filter.service);
  const pa = selectedPeriod(filter, now, 'A');
  const inA = cycle.filter(r => String(r.go_live_at) >= pa.from && String(r.go_live_at) <= pa.to);
  const count = (rows: MonitorRow[], k: string) => Object.entries(rows.reduce<Record<string, number>>((m, r) => { const key = String(r[k] ?? '—'); m[key] = (m[key] ?? 0) + 1; return m; }, {}));
  return <section aria-label="Work monitor" className="grid gap-4 lg:grid-cols-2">
    <Panel title="① Coaching backlog 🟢" subtitle="อ่านอย่างเดียว · ต่อ coach · เปิดแท็บ Coaching">{coaching.length ? <ul className="space-y-1 text-sm">{count(coaching, 'coach').map(([k, n]) => <li key={k}><button className="hover:underline" onClick={() => onNavigate('/ps/ae-workspace/coaching')}>{k}: {n} รายการ</button></li>)}</ul> : <EmptyState text={empty} />}</Panel>
    <Panel title="② รอระบุผู้ดูแล 🟢" subtitle="อ่านอย่างเดียว · role × โรงแรม · เปิด Hotel Profile">{unassigned.length ? <ul className="space-y-1 text-sm">{unassigned.map((r, i) => <li key={i}><button className="hover:underline" onClick={() => onNavigate('/ps/ae-workspace/property-info')}>{String(r.hotel_name)} · {String(r.role)} · {String(r.age_days ?? '—')} วัน</button></li>)}</ul> : <EmptyState text={empty} />}</Panel>
    <Panel title="③ งานค้างตาม deadline 🟡" subtitle="🔄 Renewal (เลยวันหมดสัญญา) · 📞 Onboarding · 📋 Survey · 🎯 Coaching">{streams.length ? <ul className="space-y-1 text-sm">{count(streams, 'stream').map(([k, n]) => <li key={k}>{k}: {n} · เกินกำหนด {streams.filter(r => r.stream === k && r.overdue).length}</li>)}</ul> : <EmptyState text={empty} />}</Panel>
    <Panel title="④ Onboarding cycle-time 🟡" subtitle="created → Go Live (ตรรกะเดียวกับแท็บ PS)">{inA.length ? <ul className="space-y-1 text-sm">{inA.map(r => <li key={String(r.card_id)} className={cn(Number(r.cycle_days) > 30 && 'text-warning-foreground')}><button className="hover:underline" onClick={() => onNavigate('/ps/onboarding-process')}>{String(r.card_id)} · {String(r.service_line)} · {String(r.cycle_days)} วัน</button></li>)}</ul> : <EmptyState text={empty} />}</Panel>
  </section>;
}
