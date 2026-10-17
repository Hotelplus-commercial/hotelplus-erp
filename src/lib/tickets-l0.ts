/* Ticket system Layer 0 (spec v1.0) — canonical browser-storage collection `tickets`.
 * Only write path: createTask() + transition(). Mirrors to Cloud doc 'tickets' (push-only, Level A).
 * Cross-machine delivery is Cloud Sync Level B — not simulated here. Demo = in-memory, never persisted. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { DEMO_NOW } from './ps-demo-fixture';

export type TicketType = 'UPSELL_PITCH' | 'RENEWAL_DUE' | 'GRADE_RISK' | 'SURVEY_LOW';
export type Dept = 'BD' | 'ORM' | 'MARCOM' | 'PS' | 'AC' | 'AUTO' | 'HR' | 'OFFICE';
export type Role = 'PM' | Dept;
/** Pseudo-user for BOT-generated tickets (display "The Office"); never a switcher role, so BOT tickets have no CANCEL action. */
export const SYSTEM_CREATOR = 'SYSTEM:THE_OFFICE' as const;
export type Creator = Role | typeof SYSTEM_CREATOR;
export type Severity = 'high' | 'medium' | 'low';
export type BotPayload = {
  severity?: Severity; event_key?: string;
  signal_detail?: { grade?: string; renewal_due_date?: string; days_left?: number; survey_id?: string; score?: number };
  assigned_ae?: { member_id: string; nickname: string } | null;
  watchers?: { dept: Dept; member_id: string | null; nickname: string }[];
  generated_round?: string; condition_cleared_at?: string | null; unassigned_owner?: boolean;
};
export type L0Status = 'NEW' | 'ACK' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type L0Ticket = {
  ticket_id: string; type: TicketType; source_app: 'PS_DASHBOARD' | 'BD_APP' | 'PS_DASHBOARD_BOT'; created_by: Creator; target_dept: Dept;
  subject_ref: { hotel_id: string; hotel_name: string; gap_service: string; service_line?: string };
  payload: { readiness_tier: string; chips: string[]; note: string } & BotPayload;
  status: L0Status; created_at: string; revision: number;
  audit: { at: string; by: Creator; from_status: L0Status | null; to_status: L0Status }[];
};

export const DEPTS: Dept[] = ['BD', 'ORM', 'MARCOM', 'PS', 'AC', 'AUTO', 'HR', 'OFFICE'];
/** Layer 1: every department now has a workspace, so nothing parks as "รอ pickup". */
export const DEPTS_WITH_WORKSPACE: Dept[] = [...DEPTS];
export const OPEN_STATUSES: L0Status[] = ['NEW', 'ACK', 'IN_PROGRESS'];
export const STATUS_TH: Record<L0Status, string> = { NEW: 'ใหม่', ACK: 'รับแล้ว', IN_PROGRESS: 'กำลังทำ', DONE: 'เสร็จ', CANCELLED: 'ยกเลิก' };
export const TYPE_TH: Record<TicketType, string> = { UPSELL_PITCH: 'เสนอขายบริการเพิ่ม', RENEWAL_DUE: 'ใกล้ครบสัญญา', GRADE_RISK: 'เสี่ยงเกรดการชำระ (D)', SURVEY_LOW: 'คะแนนบริการต่ำ' };
const OPEN: L0Status[] = ['NEW', 'ACK', 'IN_PROGRESS'];
const NEXT: Partial<Record<L0Status, L0Status>> = { NEW: 'ACK', ACK: 'IN_PROGRESS', IN_PROGRESS: 'DONE' };
const KEY = 'meridia.tickets.v1';

type State = { seq: number; items: L0Ticket[] };
let live: State | null = null;
let demo: State = { seq: 0, items: [] };
let demoOn = false;
let version = 0;
const listeners = new Set<() => void>();

function liveState(): State {
  if (live) return live;
  try { live = JSON.parse(localStorage.getItem(KEY) ?? '') as State; } catch { live = { seq: 0, items: [] }; }
  if (!live?.items) live = { seq: 0, items: [] };
  return live;
}
const cur = () => (demoOn ? demo : liveState());
function commit(s: State) {
  if (demoOn) demo = s;
  else { live = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } stageCloudDoc('tickets', { items: s.items }); }
  version++; listeners.forEach((l) => l());
}
const now = () => (demoOn ? DEMO_NOW : new Date().toISOString());

/** Switch store mode; turning demo on starts from an empty bundle (preview-safe). */
export function setTicketDemo(on: boolean) {
  if (on === demoOn) return;
  demoOn = on; if (on) demo = { seq: 0, items: [] };
  version++; listeners.forEach((l) => l());
}

export function findOpen(type: TicketType, hotel_id: string, gap_service: string) {
  return cur().items.find((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && t.subject_ref.gap_service === gap_service && OPEN.includes(t.status));
}

/** Central generic engine. Returns the new id, or the existing open id (dedup). */
export function createTask(i: { type: TicketType; target_dept: Dept; subject_ref: L0Ticket['subject_ref']; payload: L0Ticket['payload']; created_by: Creator; source_app?: L0Ticket['source_app'] }): { ticket_id: string; deduped: boolean } {
  const existing = findOpen(i.type, i.subject_ref.hotel_id, i.subject_ref.gap_service);
  if (existing) return { ticket_id: existing.ticket_id, deduped: true };
  const s = cur(); const seq = s.seq + 1; const at = now(); // Level B: replace with revision-locked reservation.
  const t: L0Ticket = { ticket_id: `TKT-${String(seq).padStart(6, '0')}`, type: i.type, source_app: i.source_app ?? 'PS_DASHBOARD', created_by: i.created_by, target_dept: i.target_dept, subject_ref: i.subject_ref, payload: i.payload, status: 'NEW', created_at: at, revision: 0, audit: [{ at, by: i.created_by, from_status: null, to_status: 'NEW' }] };
  commit({ seq, items: [...s.items, t] });
  return { ticket_id: t.ticket_id, deduped: false };
}

/** BOT dedup: open ticket with same (hotel_id + type + event_key). */
export function findOpenByEvent(type: TicketType, hotel_id: string, event_key: string) {
  return cur().items.find((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && t.payload.event_key === event_key && OPEN.includes(t.status));
}
/** Open BOT tickets of a type for a hotel, regardless of event_key (for condition-cleared checks). */
export function openOfType(type: TicketType, hotel_id: string) {
  return cur().items.filter((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && OPEN.includes(t.status));
}
/** Refresh generated_round/severity on a deduped ticket (no new ticket, no status change). */
export function refreshBotTicket(id: string, patch: Pick<BotPayload, 'generated_round' | 'severity'>) {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t) return false;
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? { ...x, payload: { ...x.payload, ...patch } } : x)) });
  return true;
}
/** Condition-cleared stamp (AL5/AL12): sets payload.condition_cleared_at, appends audit, bumps revision. Never changes status. */
export function stampConditionCleared(id: string): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t || !OPEN.includes(t.status) || t.payload.condition_cleared_at) return false;
  const at = now();
  const next: L0Ticket = { ...t, payload: { ...t.payload, condition_cleared_at: at }, revision: t.revision + 1, audit: [...t.audit, { at, by: SYSTEM_CREATOR, from_status: t.status, to_status: t.status }] };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? next : x)) });
  return true;
}

export function allowedNext(t: L0Ticket, role: Role): L0Status[] {
  const out: L0Status[] = [];
  const n = NEXT[t.status]; if (n && role === t.target_dept) out.push(n);
  if (OPEN.includes(t.status) && role === t.created_by) out.push('CANCELLED');
  return out;
}

/** Status transition with revision check. Returns false on conflict / not allowed. */
export function transition(id: string, revision: number, to: L0Status, by: Role): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t || t.revision !== revision || !allowedNext(t, by).includes(to)) return false;
  const next: L0Ticket = { ...t, status: to, revision: t.revision + 1, audit: [...t.audit, { at: now(), by, from_status: t.status, to_status: to }] };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? next : x)) });
  return true;
}

export const isPendingPickup = (t: L0Ticket) => !DEPTS_WITH_WORKSPACE.includes(t.target_dept);

export function useTickets(): L0Ticket[] {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => version, () => 0);
  return hydrated ? cur().items : [];
}
/** Read-back for consumers: open ticket for hotel+gap+type, or undefined → show create button. */
export function useTicketReadBack(type: TicketType, hotel_id: string, gap_service: string) {
  return useTickets().find(t => t.type === type && t.subject_ref.hotel_id === hotel_id && t.subject_ref.gap_service === gap_service && OPEN.includes(t.status));
}
