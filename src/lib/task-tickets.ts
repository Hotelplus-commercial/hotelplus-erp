/* PS Dashboard · Task tab v1.0 — ticket system (WRITE, live cloud tables) + monitor helpers (read-only).
 * No assignee_id / priority: responsible + watchers are derived at read time from the assignment master. */
import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { demoTaskHotels } from './ps-demo-fixture';
import { TASK_DEMO_NOW, taskDemo } from './task-demo';
import { TASK_CONFIG } from './task-worklist';

export type Team = 'ORM' | 'MARCOM' | 'AC' | 'PS';
export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
export type WaitingReason = 'CUSTOMER' | 'INTERNAL';
export type Category = { code: string; domain: Team; subcategory_label_th: string; active: boolean; sort: number };
export type Ticket = { id: string; case_no: string; hotel_id: string; hotel_name: string; title: string; description: string | null; category_id: string; routed_team: Team; status: TicketStatus; waiting_reason: WaitingReason | null; created_by: string; created_at: string; updated_at: string; resolved_at: string | null; revision: number };
export type Activity = { id: string; ticket_id: string; actor_id: string; type: 'CREATE' | 'COMMENT' | 'STATUS_CHANGE' | 'CATEGORY_CHANGE' | 'DEPT_CHANGE'; body: string; at: string };
/** Hotel caretakers resolved from the assignment master (nicknames; null member = not assigned; null service = not bought). */
export type HotelCare = { hotel_id: string; hotel_name: string; ae: string | null; orm: { member: string | null } | null; marcom: { member: string | null } | null; status?: string };

export const TEAMS: Team[] = ['ORM', 'MARCOM', 'AC', 'PS'];
export const TEAM_LABEL: Record<Team, string> = { ORM: 'ORM', MARCOM: 'Marcom', AC: 'AC', PS: 'PS' };
export const STATUSES: TicketStatus[] = ['open', 'in-progress', 'waiting', 'resolved', 'closed'];
export const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Open', 'in-progress': 'In progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed' };
export const WAITING_LABEL: Record<WaitingReason, string> = { CUSTOMER: 'รอลูกค้า', INTERNAL: 'รอภายใน' };
export const AGING_THRESHOLD_DAYS = TASK_CONFIG.case_overdue_days; // O-T1: per-category values pending PM (config).
export const UNASSIGNED = '— ยังไม่ระบุผู้ดูแล';

/** §2 seed — mirrors the cloud ticket_category rows (used by demo; live reads the table). */
const CAT: [string, Team, string][] = [
  ['ORM-REV','ORM','ด้านรายได้ (Hotel Revenue)'],['ORM-RATE','ORM','ด้านราคา (Rates Investigation)'],['ORM-CONN','ORM','ด้านการเชื่อมต่อ (Connectivity)'],['ORM-RESV','ORM','เกี่ยวกับการจอง (Reservation)'],['ORM-CONT','ORM','การจัดการ Content'],['ORM-CAMP','ORM','การจัดการแคมเปญ (Visibility & Campaign Boost)'],['ORM-INFO','ORM','ขอข้อมูลทั่วไป'],['ORM-OTHER','ORM','อื่น ๆ'],
  ['MKT-CONT','MARCOM','ด้าน Content'],['MKT-ADS','MARCOM','ด้านกลยุทธ์โฆษณา'],['MKT-KOL','MARCOM','ด้าน KOL'],['MKT-OTHER','MARCOM','อื่น ๆ'],
  ['AC-PAY','AC','ปัญหาการชำระเงิน / ใบแจ้งหนี้'],['AC-OTHER','AC','อื่น ๆ'],
  ['PS-ONOFF','PS','ติดตามสถานะ On-board / Off-board'],['PS-CONTRACT','PS','ด้านสัญญา'],['PS-COMPLAIN','PS','ร้องเรียน (Complain)'],['PS-PACKAGE','PS','ปรึกษาปรับ/เปลี่ยนแพคเกจบริการ'],['PS-OTHER','PS','อื่น ๆ'],
];
export const SEED_CATEGORIES: Category[] = CAT.map(([code, domain, label]) => ({ code, domain, subcategory_label_th: label, active: true, sort: CAT.filter(c => c[1] === domain).findIndex(c => c[0] === code) + 1 }));

/** §3: responsible badge (highlight only, never a permission lock). */
export function responsibleOf(team: Team, care: HotelCare | undefined): string {
  if (team === 'AC') return 'ทีม AC';
  const v = team === 'ORM' ? care?.orm?.member : team === 'MARCOM' ? care?.marcom?.member : care?.ae;
  return v || UNASSIGNED;
}
/** §3: AE + ORM + Marcom of bought services only; Specialist excluded. */
export function watchersOf(care: HotelCare | undefined): { role: string; name: string }[] {
  if (!care) return [];
  return [{ role: 'AE', name: care.ae || UNASSIGNED }, ...(care.orm ? [{ role: 'ORM', name: care.orm.member || UNASSIGNED }] : []), ...(care.marcom ? [{ role: 'Marcom', name: care.marcom.member || UNASSIGNED }] : [])];
}
/** §4.5: aging counts only while open / in-progress. */
export function agingDays(t: Ticket, now: Date): number | null {
  if (t.status !== 'open' && t.status !== 'in-progress') return null;
  return Math.floor((now.getTime() - new Date(t.created_at).getTime()) / 864e5);
}
export const isOverdue = (t: Ticket, now: Date) => (agingDays(t, now) ?? -1) > AGING_THRESHOLD_DAYS;

/* ---------------- data access (live cloud | demo memory) ---------------- */
export type UpdateInput = { id: string; revision: number; actor: string; status?: TicketStatus; waiting_reason?: WaitingReason | null; category?: string; routed_team?: Team; comment?: string };
export type CreateInput = { hotel_id: string; hotel_name: string; category: string; routed_team?: Team; title: string; description: string; actor: string };
export type UpdateResult = { ok: true; ticket: Ticket } | { ok: false; conflict: true };

/** Demo store: bundled, in-memory only (no localStorage / cloud). Reset each time demo turns on. */
let demoState: { tickets: Ticket[]; activity: Activity[] } = { tickets: [], activity: [] };
let demoVersion = 0;
const listeners = new Set<() => void>();
const emit = () => { demoVersion++; listeners.forEach(l => l()); };
export function resetDemoTickets() {
  const { cases: tickets } = taskDemo(SEED_CATEGORIES, demoTaskHotels());
  const activity: Activity[] = tickets.flatMap(t => [{ id: `${t.id}-a0`, ticket_id: t.id, actor_id: t.created_by, type: 'CREATE' as const, body: t.case_no, at: t.created_at }]);
  demoState = { tickets, activity }; emit();
}
export function useDemoVersion() { return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => demoVersion, () => 0); }

const nowIso = (demo: boolean) => (demo ? TASK_DEMO_NOW : new Date().toISOString());
function applyUpdate(t: Ticket, i: UpdateInput, push: (a: Omit<Activity, 'id' | 'ticket_id' | 'at'>) => void): Ticket {
  const next = { ...t };
  if (i.category && i.category !== t.category_id) { const c = SEED_CATEGORIES.find(x => x.code === i.category); if (!c) throw new Error('ไม่พบหมวด'); push({ actor_id: i.actor, type: 'CATEGORY_CHANGE', body: `${t.category_id} → ${c.code}` }); next.category_id = c.code; next.routed_team = c.domain; }
  if (i.routed_team) next.routed_team = i.routed_team;
  if (next.routed_team !== t.routed_team) push({ actor_id: i.actor, type: 'DEPT_CHANGE', body: `${t.routed_team} → ${next.routed_team}` });
  const ns = i.status ?? t.status;
  const nr = ns === 'waiting' ? (i.waiting_reason ?? (t.status === 'waiting' ? t.waiting_reason : null)) : null;
  if (ns === 'waiting' && !nr) throw new Error('กรุณาเลือกเหตุผลที่รอ');
  if (ns !== t.status || nr !== t.waiting_reason) {
    push({ actor_id: i.actor, type: 'STATUS_CHANGE', body: `${t.status}${t.waiting_reason ? ` (${t.waiting_reason})` : ''} → ${ns}${nr ? ` (${nr})` : ''}` });
    next.resolved_at = ns === 'resolved' || ns === 'closed' ? (t.resolved_at && (t.status === 'resolved' || t.status === 'closed') ? t.resolved_at : nowIso(true)) : null;
    next.status = ns; next.waiting_reason = nr;
  }
  if (i.comment?.trim()) push({ actor_id: i.actor, type: 'COMMENT', body: i.comment.trim() });
  return { ...next, revision: t.revision + 1, updated_at: nowIso(true) };
}

export const ticketApi = {
  async categories(demo: boolean): Promise<Category[]> {
    if (demo) return SEED_CATEGORIES;
    const r = await supabase.from('ticket_category').select('*').eq('active', true).order('domain').order('sort');
    if (r.error) throw new Error('อ่านหมวดเคสไม่สำเร็จ');
    return r.data as Category[];
  },
  async list(demo: boolean): Promise<Ticket[]> {
    if (demo) return [...demoState.tickets].sort((a, b) => b.case_no.localeCompare(a.case_no));
    const out: Ticket[] = [];
    for (let from = 0; ; from += 1000) {
      const r = await supabase.from('v_task_tickets').select('*').order('case_no', { ascending: false }).range(from, from + 999);
      if (r.error) throw new Error('อ่านเคสไม่สำเร็จ');
      out.push(...(r.data as Ticket[]));
      if (r.data.length < 1000) break;
    }
    return out;
  },
  async activity(demo: boolean, id: string): Promise<Activity[]> {
    if (demo) return demoState.activity.filter(a => a.ticket_id === id).sort((a, b) => b.at.localeCompare(a.at));
    const r = await supabase.from('ticket_activity').select('*').eq('ticket_id', id).order('at', { ascending: false });
    if (r.error) throw new Error('อ่าน timeline ไม่สำเร็จ');
    return r.data as Activity[];
  },
  async create(demo: boolean, i: CreateInput): Promise<Ticket> {
    if (!i.hotel_id || !i.title.trim() || !i.category || !i.actor) throw new Error('กรอกโรงแรม หมวด และหัวข้อ');
    if (demo) {
      const c = SEED_CATEGORIES.find(x => x.code === i.category); if (!c) throw new Error('ไม่พบหมวด'); const n = demoState.tickets.length + 1; const at = nowIso(true);
      const t: Ticket = { id: `demo-t${n}-${Date.now()}`, case_no: `Case-${String(n).padStart(6, '0')}`, hotel_id: i.hotel_id, hotel_name: i.hotel_name, title: i.title.trim(), description: i.description.trim() || null, category_id: c.code, routed_team: i.routed_team ?? c.domain, status: 'open', waiting_reason: null, created_by: i.actor, created_at: at, updated_at: at, resolved_at: null, revision: 0 };
      demoState = { tickets: [...demoState.tickets, t], activity: [...demoState.activity, { id: `${t.id}-c`, ticket_id: t.id, actor_id: i.actor, type: 'CREATE', body: t.case_no, at }] }; emit();
      return t;
    }
    const r = await supabase.rpc('ticket_create_v2', { p_hotel_id: i.hotel_id, p_hotel_name: i.hotel_name, p_category: i.category, p_routed_team: i.routed_team ?? '', p_title: i.title, p_description: i.description, p_actor: i.actor });
    if (r.error) throw new Error('สร้างเคสไม่สำเร็จ');
    return r.data as unknown as Ticket;
  },
  async update(demo: boolean, i: UpdateInput): Promise<UpdateResult> {
    if (i.status === 'waiting' && !i.waiting_reason) throw new Error('กรุณาเลือกเหตุผลที่รอ');
    if (demo) {
      const t = demoState.tickets.find(x => x.id === i.id);
      if (!t) throw new Error('ไม่พบเคส');
      if (t.revision !== i.revision) return { ok: false, conflict: true };
      const acts: Activity[] = [];
      const next = applyUpdate(t, i, a => acts.push({ ...a, id: `${t.id}-${Date.now()}-${acts.length}`, ticket_id: t.id, at: nowIso(true) }));
      demoState = { tickets: demoState.tickets.map(x => (x.id === t.id ? next : x)), activity: [...demoState.activity, ...acts] }; emit();
      return { ok: true, ticket: next };
    }
    const r = await supabase.rpc('ticket_update_v2', { p_id: i.id, p_revision: i.revision, p_actor: i.actor, p_status: i.status ?? null, p_waiting_reason: i.waiting_reason ?? null, p_category: i.category ?? null, p_routed_team: i.routed_team ?? null, p_comment: i.comment ?? null } as never);
    if (r.error) throw new Error('บันทึกเคสไม่สำเร็จ');
    const d = r.data as unknown as Ticket & { conflict?: boolean };
    return d.conflict ? { ok: false, conflict: true } : { ok: true, ticket: d };
  },
};

/* ---------------- monitor (read-only v_task_* · empty until seed + C5) ---------------- */
export const TASK_MONITOR_VIEWS = ['v_task_coaching_backlog', 'v_task_unassigned', 'v_task_deadline_streams'] as const;
export type TaskMonitorView = (typeof TASK_MONITOR_VIEWS)[number];
type MonitorField = 'service_line' | 'go_live_at' | 'cycle_days' | 'owner_id' | 'coach' | 'hotel_name' | 'hotel_id' | 'role' | 'age_days' | 'stream' | 'overdue' | 'card_id' | 'status';
export type MonitorRow = Partial<Record<MonitorField, string | number | boolean | null>> & Record<string, string | number | boolean | null | undefined>;
export async function readTaskMonitor(): Promise<Record<TaskMonitorView, MonitorRow[]>> {
  const entries = await Promise.all(TASK_MONITOR_VIEWS.map(async v => {
    const rows: MonitorRow[] = [];
    for (let from = 0; ; from += 1000) {
      const r = await supabase.from(v).select('*').range(from, from + 999);
      if (r.error) throw new Error('อ่านข้อมูลงานค้างไม่สำเร็จ');
      rows.push(...(r.data as MonitorRow[]));
      if (r.data.length < 1000) break;
    }
    return [v, rows] as const;
  }));
  return Object.fromEntries(entries) as Record<TaskMonitorView, MonitorRow[]>;
}
export function avgCycle(rows: MonitorRow[], from: string, to: string): number | null {
  const xs = rows.filter(r => r.go_live_at && String(r.go_live_at) >= from && String(r.go_live_at) <= to && typeof r.cycle_days === 'number').map(r => Number(r.cycle_days));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
