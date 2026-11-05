/* Ticket system Layer 0 (spec v1.0) — canonical browser-storage collection `tickets`.
 * Only write path: createTask() + transition(). Mirrors to Cloud doc 'tickets' (push-only, Level A).
 * Cross-machine delivery is Cloud Sync Level B — not simulated here. Demo = in-memory, never persisted. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { DEMO_NOW } from './ps-demo-fixture';
import { readDemoL0, saveDemoL0 } from './demo-session';

export type TicketType = 'UPSELL_PITCH' | 'RENEWAL_DUE' | 'GRADE_RISK' | 'SURVEY_LOW' | 'CONTRACT_FOLLOWUP' | 'SERVICING_STALL' | 'CUSTOMER_ENTITY_CHANGE' | 'CONTRACT_SIGNAL' | 'WELCOME_BACK' | 'HANDOVER_FIX' | 'SYSTEM_SHUTOFF' | 'PARTNER_DEAL_NOTICE' | 'SYSTEM_CREDIT_NOTICE' | 'SYSTEM_REACTIVATE';
/** Tab R3 §6.1 WELCOME_BACK snapshot (read-only for BD). */
export type WelcomeBackSnapshot = {
  contract_info: Record<string, string>; package_rate: Record<string, string>; exit_status: Record<string, string>;
  reasons: { primary: string[]; secondary: string | null; ae_note?: string };
};
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
  /** CONTRACT_FOLLOWUP (BD-AC v2.0): carry-deal context, read-only in the ticket detail. */
  followup?: { cohort_month: string; stage_label: string; substep: string | null; days_since_sent_contract: number; bd_name: string | null };
  assigned_bd?: { member_id: string; nickname: string } | null;
  /** Renewal v1.0: link to the renewal request + entity-change form. */
  renewal_request_id?: string; entity_change?: { what: string; detail: string };
  /** Ticket attachments (any type): ≤5 files, ≤5 MB each, PDF/JPG/PNG — stored with the ticket in browser canonical storage. */
  attachments?: TicketAttachment[];
  /** R1.2 §5.1: optional link to the service contract / monthly meeting the ticket is about. */
  contract_id?: string | null; meeting_id?: string | null;
  /** Tab R1 §6.1 CONTRACT_SIGNAL: always kind NEW here; labels = signal catalog keys; one batch per dialog send. */
  kind?: 'NEW'; labels?: string[]; batch_id?: string; drive_attachments?: { name: string; drive_url: string }[];
  /** Tab R3 §6.1 WELCOME_BACK: snapshot + optional message; timeline only when shared; attachment links in drive_attachments. */
  snapshot?: WelcomeBackSnapshot; message?: string; timeline_shared?: boolean; timeline?: { at: string; text: string; tone: string }[];
  /** PM Workspace Partner v1.0 §2.3 SYSTEM_CREDIT_NOTICE (to AC). */
  credit_notice?: { contract: string; partner: string; result: 'APPROVED' | 'REJECTED'; approved_amount: number | null; currency: string; credit_expires_at: string | null };
  /** AC App Partner Bills v1.0 §4: SYSTEM_SHUTOFF / SYSTEM_REACTIVATE payload (both twins). auto = created by AC App (อัตโนมัติ). */
  shutoff?: { contract_id: string; hotel_id: string; hotel_name: string; service_line: 'ORM' | 'Marcom'; partner: string | null; system_name: string | null; assigned_ae: string | null; outstanding: number; overdue_cycles: number; note: string; twin_ticket_id: string | null; reactivated_at?: string; auto?: boolean };
  /** PARTNER_DEAL_NOTICE detail (read-only in AC Workspace). */
  deal_notice?: { partner: string; kind: string; benefit: string; period: string; status: string; attachment_url: string };
  phase?: 'P1'|'P2'|'P3'; lane?: 'AE'|'Specialist'|'ORM'|'Marcom'; days_in_phase?: number; sla_days?: number; target_days?: number; tone?: 'ok'|'amber'|'red'; current_stage?: string; owner_id?: string|null; recipient?: string; recipient_member_id?: string|null;
};
export type TicketAttachment = { id: string; name: string; size: number; mime: string; by: string; at: string; data_url: string };
export const ATTACH_MAX_FILES = 5, ATTACH_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACH_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
/** Pure validation for one more file on a ticket. */
export function attachmentError(existing: number, f: { size: number; mime: string }): string | null {
  if (existing >= ATTACH_MAX_FILES) return 'แนบได้สูงสุด 5 ไฟล์';
  if (f.size > ATTACH_MAX_BYTES) return 'ไฟล์ต้องไม่เกิน 5 MB';
  if (!ATTACH_MIME.includes(f.mime)) return 'รองรับเฉพาะ PDF / JPG / PNG';
  return null;
}
export type L0Status = 'NEW' | 'ACK' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TicketAssignee = { member_id: string; display: string; role: string };
export type L0Ticket = {
  ticket_id: string; type: TicketType; source_app: 'PS_DASHBOARD' | 'BD_APP' | 'PS_DASHBOARD_BOT' | 'AC_APP'; created_by: Creator; target_dept: Dept;
  subject_ref: { hotel_id: string; hotel_name: string; gap_service: string; service_line?: string; deal_id?: string; card_id?:string; service_variant?:string; contract_id?: string; service?: string; /** Tab R4 §10.2 HANDOVER_FIX (optional) */ checklist_item_id?: string };
  payload: { readiness_tier: string; chips: string[]; note: string } & BotPayload;
  /** Tab R1 §6.1: optional single recipient (target_dept is derived from it). */
  assignee?: TicketAssignee;
  status: L0Status; created_at: string; revision: number;
  audit: { at: string; by: Creator; from_status: L0Status | null; to_status: L0Status; /** R3.1: e.g. `assigned → {label}` */ note?: string; /** R3.1: acting member label */ actor?: string }[];
  /** R3.1 WB3 — WELCOME_BACK only: the one person the BDM assigned (nullable; missing = not assigned). File 16 maps these. */
  assigned_to?: string | null; assigned_to_label?: string | null; assigned_by?: string | null; assigned_at?: string | null;
};

export const DEPTS: Dept[] = ['BD', 'ORM', 'MARCOM', 'PS', 'AC', 'AUTO', 'HR', 'OFFICE'];
/** Layer 1: every department now has a workspace, so nothing parks as "รอ pickup". */
export const DEPTS_WITH_WORKSPACE: Dept[] = [...DEPTS];
export const OPEN_STATUSES: L0Status[] = ['NEW', 'ACK', 'IN_PROGRESS'];
/** Tab R1 §6.6: NEW = New · legacy ACK shown as กำลังทำ (stored value unchanged). */
export const STATUS_TH: Record<L0Status, string> = { NEW: 'New', ACK: 'กำลังทำ', IN_PROGRESS: 'กำลังทำ', DONE: 'เสร็จ', CANCELLED: 'ยกเลิก' };
export const TYPE_TH: Record<TicketType, string> = { UPSELL_PITCH: 'เสนอขายบริการเพิ่ม', RENEWAL_DUE: 'ใกล้ครบสัญญา', GRADE_RISK: 'เสี่ยงเกรดการชำระ (D)', SURVEY_LOW: 'คะแนนบริการต่ำ', CONTRACT_FOLLOWUP: 'ติดตามดีลค้างข้ามเดือน', SERVICING_STALL: 'ติดตามการ์ดเกิน SLA', CUSTOMER_ENTITY_CHANGE: 'เปลี่ยนนิติบุคคล / ผู้ลงนาม', CONTRACT_SIGNAL: 'แจ้งเรื่องของสัญญา', WELCOME_BACK: 'Welcome Back', HANDOVER_FIX: 'ขอแก้งานส่งมอบ', SYSTEM_SHUTOFF: 'ปิดระบบ', PARTNER_DEAL_NOTICE: 'แจ้งข้อตกลง Partner', SYSTEM_CREDIT_NOTICE: 'แจ้งผลเครดิตค่าระบบ', SYSTEM_REACTIVATE: 'เปิดระบบคืน' };
const OPEN: L0Status[] = ['NEW', 'ACK', 'IN_PROGRESS'];
/** Tab R1 §6.6 — every type: NEW → IN_PROGRESS → DONE (+ CANCELLED by creator). ACK is never offered; legacy ACK continues like IN_PROGRESS. */
const NEXT: Partial<Record<L0Status, L0Status>> = { NEW: 'IN_PROGRESS', ACK: 'DONE', IN_PROGRESS: 'DONE' };
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
  if (demoOn) { demo = s; saveDemoL0(s); }
  else { live = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } stageCloudDoc('tickets', { items: s.items }); }
  version++; listeners.forEach((l) => l());
}
const now = () => (demoOn ? DEMO_NOW : new Date().toISOString());

/** Switch store mode; turning demo on starts from an empty bundle (preview-safe). */
export function setTicketDemo(on: boolean) {
  if (on === demoOn) return;
  demoOn = on; if (on) demo = readDemoL0() ?? { seq: 0, items: [] }; // shared DEMO session → same DEMO tickets on every page
  version++; listeners.forEach((l) => l());
}

export function findOpen(type: TicketType, hotel_id: string, gap_service: string) {
  return cur().items.find((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && t.subject_ref.gap_service === gap_service && OPEN.includes(t.status));
}
/** CONTRACT_FOLLOWUP dedup: open ticket with the same (type + deal_id). */
export function findOpenByDeal(type: TicketType, deal_id: string) {
  return cur().items.find((t) => t.type === type && t.subject_ref.deal_id === deal_id && OPEN.includes(t.status));
}

/** Central generic engine. Returns the new id, or the existing open id (dedup). */
export function createTask(i: { type: TicketType; target_dept: Dept; subject_ref: L0Ticket['subject_ref']; payload: L0Ticket['payload']; created_by: Creator; source_app?: L0Ticket['source_app']; ticket_id?: string; assignee?: TicketAssignee }): { ticket_id: string; deduped: boolean } {
  if (i.type === 'CONTRACT_SIGNAL') return createReserved(i);
  if (i.type === 'WELCOME_BACK') { const o = createWelcomeBack(i); return o.ok ? { ticket_id: o.ticket_id, deduped: false } : { ticket_id: o.locked?.ticket_id ?? i.ticket_id ?? '', deduped: true }; }
  const existing = i.type === 'SERVICING_STALL' && i.payload.event_key ? findOpenByEvent(i.type,i.subject_ref.hotel_id,i.payload.event_key) : i.subject_ref.deal_id ? findOpenByDeal(i.type, i.subject_ref.deal_id) : findOpen(i.type, i.subject_ref.hotel_id, i.subject_ref.gap_service);
  if (existing) return { ticket_id: existing.ticket_id, deduped: true };
  const s = cur(); const seq = s.seq + 1; const at = now(); // Level B: replace with revision-locked reservation.
  const t: L0Ticket = { ticket_id: `TKT-${String(seq).padStart(6, '0')}`, type: i.type, source_app: i.source_app ?? 'PS_DASHBOARD', created_by: i.created_by, target_dept: i.target_dept, subject_ref: i.subject_ref, payload: i.payload, status: 'NEW', created_at: at, revision: 0, audit: [{ at, by: i.created_by, from_status: null, to_status: 'NEW' }] };
  commit({ seq, items: [...s.items, t] });
  return { ticket_id: t.ticket_id, deduped: false };
}

/** Tab R1 §6.4: reserve the next consecutive number for one recipient box (unused numbers stay as gaps). */
export function reserveTicketId(): string {
  const s = cur(); const seq = s.seq + 1;
  commit({ ...s, seq });
  return `TKT-${String(seq).padStart(6, '0')}`;
}
/** Tab R1 §6.4: the next free sequence number, read-only (the dialog numbers its boxes from it; writing a box claims it). */
export const peekNextSeq = () => cur().seq + 1;
export const ticketIdOf = (seq: number) => `TKT-${String(seq).padStart(6, '0')}`;
/** CONTRACT_SIGNAL: one ticket per recipient box — no dedup (the dialog warns on duplicates); a reserved id is reused on resend. */
function createReserved(i: Parameters<typeof createTask>[0]): { ticket_id: string; deduped: boolean } {
  const s = cur();
  const id = i.ticket_id ?? `TKT-${String(s.seq + 1).padStart(6, '0')}`;
  const found = s.items.find((t) => t.ticket_id === id);
  if (found) return { ticket_id: id, deduped: true };
  const n = Number(id.replace(/\D/g, '')) || 0;
  const at = now();
  const t: L0Ticket = { ticket_id: id, type: i.type, source_app: i.source_app ?? 'PS_DASHBOARD', created_by: i.created_by, target_dept: i.target_dept, subject_ref: i.subject_ref, payload: i.payload, status: 'NEW', created_at: at, revision: 0, audit: [{ at, by: i.created_by, from_status: null, to_status: 'NEW' }], ...(i.assignee ? { assignee: i.assignee } : {}) };
  commit({ seq: Math.max(s.seq, n), items: [...s.items, t] });
  return { ticket_id: id, deduped: false };
}
const contractOf = (t: L0Ticket) => t.subject_ref.contract_id ?? t.payload.contract_id ?? null;
/** Tab R3 §6.3: open WELCOME_BACK (NEW / legacy ACK / IN_PROGRESS) on this contract id — per contract, never per hotel. */
export const openWelcomeBackFor = (contractId: string, extra: L0Ticket[] = []) =>
  [...extra, ...cur().items].find((t) => t.type === 'WELCOME_BACK' && OPEN.includes(t.status) && contractOf(t) === contractId) ?? null;
export type WelcomeBackOut = { ok: true; ticket_id: string } | { ok: false; locked: L0Ticket | null; error: string };
/** Tab R3 §6.2/§6.3: the WELCOME_BACK write. Re-checks the per-contract lock inside the write (against the current store
 * revision, plus `extra` read-only seed tickets); a locked contract writes nothing. A reserved number is reused on retry. */
export type TicketSink = { items: () => L0Ticket[]; add: (t: L0Ticket) => void; at: () => string; /** R3.1: replace-or-add (DEMO writes) */ put?: (t: L0Ticket) => void };
/** R3.2 §6.1: `at` (optional) = the DEMO clock passed by card ④'s DEMO send step; normal mode passes nothing (real time). */
export function createWelcomeBack(i: Parameters<typeof createTask>[0], extra: L0Ticket[] = [], sink?: TicketSink, at0?: string): WelcomeBackOut {
  const cid = i.subject_ref.contract_id ?? i.payload.contract_id;
  if (!cid) return { ok: false, locked: null, error: 'ไม่มีเลขสัญญา' };
  const others = sink ? [...extra, ...sink.items()] : extra;
  const lock = openWelcomeBackFor(cid, others);
  if (lock) return { ok: false, locked: lock, error: 'locked' };
  const s = cur();
  const id = i.ticket_id ?? `TKT-${String(s.seq + 1).padStart(6, '0')}`;
  if (s.items.some((t) => t.ticket_id === id) || others.some((t) => t.ticket_id === id)) return { ok: false, locked: null, error: 'เลข ticket นี้ถูกใช้แล้ว · ลองอีกครั้ง' };
  const n = Number(id.replace(/\D/g, '')) || 0; const at = sink ? sink.at() : at0 ?? now();
  const t: L0Ticket = { ticket_id: id, type: 'WELCOME_BACK', source_app: i.source_app ?? 'PS_DASHBOARD', created_by: i.created_by, target_dept: 'BD', subject_ref: i.subject_ref, payload: { ...i.payload, contract_id: cid }, status: 'NEW', created_at: at, revision: 0, audit: [{ at, by: i.created_by, from_status: null, to_status: 'NEW' }], ...(i.assignee ? { assignee: i.assignee } : {}) };
  // DEMO page with the store in live mode: the in-memory sink takes the write (DEMO never writes browser storage).
  if (sink) { sink.add(t); return { ok: true, ticket_id: id }; }
  commit({ seq: Math.max(s.seq, n), items: [...s.items, t] });
  return { ok: true, ticket_id: id };
}

/** Add an attachment (no status / routing change). */
export function addAttachment(id: string, a: Omit<TicketAttachment, 'id' | 'at'>): string | null {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id); if (!t) return 'ไม่พบ ticket';
  const list = t.payload.attachments ?? []; const err = attachmentError(list.length, a); if (err) return err;
  const att: TicketAttachment = { ...a, id: `${id}-A${list.length + 1}`, at: now() };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? { ...x, payload: { ...x.payload, attachments: [...list, att] } } : x)) });
  return null;
}
export const ticketById = (id: string | null | undefined) => (id ? cur().items.find((t) => t.ticket_id === id) : undefined);
export const isDemoTickets = () => demoOn;

/** BOT dedup: open ticket with same (hotel_id + type + event_key). */
export function findOpenByEvent(type: TicketType, hotel_id: string, event_key: string) {
  return cur().items.find((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && t.payload.event_key === event_key && OPEN.includes(t.status));
}
/** Open BOT tickets of a type for a hotel, regardless of event_key (for condition-cleared checks). */
export function openOfType(type: TicketType, hotel_id: string) {
  return cur().items.filter((t) => t.type === type && t.subject_ref.hotel_id === hotel_id && OPEN.includes(t.status));
}
/** Refresh generated_round/severity on a deduped ticket (no new ticket, no status change). */
export function refreshBotTicket(id: string, patch: Pick<BotPayload, 'generated_round' | 'severity' | 'days_in_phase' | 'tone'>) {
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
  // BOT tickets: the primary party may press "Solved" (DONE) directly from any open status; no CANCEL (creator is SYSTEM).
  if (t.created_by === SYSTEM_CREATOR && OPEN.includes(t.status) && role === t.target_dept && !out.includes('DONE')) out.push('DONE');
  if (t.type === 'SERVICING_STALL' && t.payload.condition_cleared_at && OPEN.includes(t.status) && role === t.target_dept && !out.includes('DONE')) out.push('DONE');
  if (OPEN.includes(t.status) && role === t.created_by) out.push('CANCELLED');
  return out;
}

/* ---------- AC App Partner Bills v1.0 ---------- */
/** §5 one-click รับทราบ — only PARTNER_DEAL_NOTICE / SYSTEM_CREDIT_NOTICE, target AC, status NEW → DONE with audit note รับทราบ (no ACK step). */
export const ACK_ONE_CLICK: TicketType[] = ['PARTNER_DEAL_NOTICE', 'SYSTEM_CREDIT_NOTICE'];
export const canAcknowledge = (t: L0Ticket, role: Role) => ACK_ONE_CLICK.includes(t.type) && t.target_dept === 'AC' && role === 'AC' && OPEN.includes(t.status);
export function acknowledgeNotice(id: string, revision: number, by: Role, actor?: string): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t || t.revision !== revision || !canAcknowledge(t, by)) return false;
  const next: L0Ticket = { ...t, status: 'DONE', revision: t.revision + 1, audit: [...t.audit, { at: now(), by, from_status: t.status, to_status: 'DONE', note: 'รับทราบ', ...(actor ? { actor } : {}) }] };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? next : x)) });
  return true;
}
/** §4.2 system cancel of an open ticket with an audit note (creator unchanged). */
export function systemCancel(id: string, note: string, by: Creator = 'AC'): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t || !OPEN.includes(t.status)) return false;
  const next: L0Ticket = { ...t, status: 'CANCELLED', revision: t.revision + 1, audit: [...t.audit, { at: now(), by, from_status: t.status, to_status: 'CANCELLED', note, actor: 'AC App (อัตโนมัติ)' }] };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? next : x)) });
  return true;
}
/** Set payload fields of an existing ticket (twin links). No status change. */
export function patchTicketPayload(id: string, patch: Partial<L0Ticket['payload']>): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id); if (!t) return false;
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? { ...x, payload: { ...x.payload, ...patch }, revision: x.revision + 1 } : x)) });
  return true;
}

/** True when `dept` sees this ticket only as a read-only watcher (👁 FYI). */
export const isWatcherOf = (t: L0Ticket, dept: Dept) => t.target_dept !== dept && (t.payload.watchers ?? []).some((w) => w.dept === dept);

/** Status transition with revision check. Returns false on conflict / not allowed. */
export function transition(id: string, revision: number, to: L0Status, by: Role): boolean {
  const s = cur(); const t = s.items.find((x) => x.ticket_id === id);
  if (!t || t.revision !== revision || !allowedNext(t, by).includes(to)) return false;
  const next: L0Ticket = { ...t, status: to, revision: t.revision + 1, audit: [...t.audit, { at: now(), by, from_status: t.status, to_status: to }] };
  commit({ ...s, items: s.items.map((x) => (x.ticket_id === id ? next : x)) });
  return true;
}

/* ================= R3.1 WELCOME_BACK routing: BDM inbox → assign one BD → that BD starts / finishes ================= */
/** Testing-mode actor (no login): role BDM / BD / PM / PS … plus the member it plays. Simulation only, never security. */
export type WbActor = { role: string; member_id: string | null; label: string };
export type WbAction = 'ASSIGN' | 'SELF' | 'START' | 'DONE' | 'CANCEL';
/** DEMO context: read-only seed tickets + the card ④ in-memory sink + the demo clock. Live mode passes nothing. */
export type WbCtx = { extra?: L0Ticket[]; sink?: TicketSink; at?: string };
export type WbOut = { ok: true; ticket: L0Ticket } | { ok: false; error: 'conflict' | 'not_allowed' | 'not_found' };
/** The one permission rule for Welcome Back actions (WB4 §3.2). Other ticket types never reach this. */
export function wbAllowed(t: L0Ticket, a: WbActor): WbAction[] {
  if (t.type !== 'WELCOME_BACK') return [];
  const out: WbAction[] = [];
  const mine = !!t.assigned_to && !!a.member_id && t.assigned_to === a.member_id;
  if (t.status === 'NEW' && a.role === 'BDM') { out.push('ASSIGN'); if (!mine) out.push('SELF'); }
  if (t.status === 'NEW' && mine) out.push('START');
  if ((t.status === 'IN_PROGRESS' || t.status === 'ACK') && mine) out.push('DONE');
  if (OPEN.includes(t.status) && a.role === t.created_by) out.push('CANCEL');
  return out;
}
function wbFind(id: string, ctx?: WbCtx): { t: L0Ticket; where: 'store' | 'sink' | 'extra' } | null {
  const s = cur().items.find((x) => x.ticket_id === id); if (s) return { t: s, where: 'store' };
  const k = ctx?.sink?.items().find((x) => x.ticket_id === id); if (k) return { t: k, where: 'sink' };
  const e = ctx?.extra?.find((x) => x.ticket_id === id); if (e) return { t: e, where: 'extra' };
  return null;
}
function wbWrite(where: 'store' | 'sink' | 'extra', next: L0Ticket, ctx?: WbCtx): boolean {
  const s = cur();
  if (where === 'store') { commit({ ...s, items: s.items.map((x) => (x.ticket_id === next.ticket_id ? next : x)) }); return true; }
  // R3.3: DEMO seed → its copy goes to the session DEMO store (same store card ④ writes), so it survives the page load.
  if (where === 'extra' && ctx?.sink?.put) { ctx.sink.put(next); return true; }
  if (where === 'extra' && demoOn) { commit({ ...s, items: [...s.items, next] }); return true; } // DEMO seed → in-memory copy overrides it
  if (ctx?.sink?.put) { ctx.sink.put(next); return true; }
  return false;
}
/** Shared write: revision check (optimistic lock as L0) → permission → write. Live store moves go through transition(). */
function wbApply(t: L0Ticket, a: WbActor, need: WbAction, ctx: WbCtx | undefined, build: (cur: L0Ticket, at: string) => L0Ticket, liveTo?: L0Status): WbOut {
  const f = wbFind(t.ticket_id, ctx);
  if (!f || f.t.type !== 'WELCOME_BACK') return { ok: false, error: 'not_found' };
  if (f.t.revision !== t.revision) return { ok: false, error: 'conflict' };
  if (!wbAllowed(f.t, a).includes(need)) return { ok: false, error: 'not_allowed' };
  if (liveTo && f.where === 'store' && !demoOn) {
    const by: Role = need === 'CANCEL' ? (f.t.created_by as Role) : 'BD';
    return transition(f.t.ticket_id, f.t.revision, liveTo, by) ? { ok: true, ticket: ticketById(f.t.ticket_id)! } : { ok: false, error: 'conflict' };
  }
  const next = build(f.t, ctx?.at ?? now());
  return wbWrite(f.where, next, ctx) ? { ok: true, ticket: next } : { ok: false, error: 'not_found' };
}
const move = (t: L0Ticket, to: L0Status, at: string, a: WbActor, by: Creator): L0Ticket =>
  ({ ...t, status: to, revision: t.revision + 1, audit: [...t.audit, { at, by, from_status: t.status, to_status: to, actor: a.label }] });
/** BDM only, while NEW. Sets assigned_* (overwrites on re-assign); status stays NEW; audit note `assigned → {label}`; revision +1. */
export function assignWelcomeBack(t: L0Ticket, member: { member_id: string; label: string }, by: WbActor, ctx?: WbCtx): WbOut {
  return wbApply(t, by, 'ASSIGN', ctx, (c, at) => ({
    ...c, assigned_to: member.member_id, assigned_to_label: member.label, assigned_by: by.member_id ?? by.role, assigned_at: at, revision: c.revision + 1,
    audit: [...c.audit, { at, by: 'BD', from_status: 'NEW', to_status: 'NEW', note: `assigned → ${member.label}`, actor: by.label }],
  }));
}
/** Assigned member only (BDM when assigned to self): NEW → IN_PROGRESS. An unassigned NEW cannot be started by anyone. */
export const startWelcomeBack = (t: L0Ticket, by: WbActor, ctx?: WbCtx): WbOut =>
  wbApply(t, by, 'START', ctx, (c, at) => move(c, 'IN_PROGRESS', at, by, 'BD'), 'IN_PROGRESS');
/** Assigned member only: IN_PROGRESS → DONE (live store: existing L0 transition()). Releases the R3 §6.3 lock. */
export const finishWelcomeBack = (t: L0Ticket, by: WbActor, ctx?: WbCtx): WbOut =>
  wbApply(t, by, 'DONE', ctx, (c, at) => move(c, 'DONE', at, by, 'BD'), 'DONE');
/** Creator only, before DONE (L0 rule unchanged). Releases the lock. */
export const cancelWelcomeBack = (t: L0Ticket, by: WbActor, ctx?: WbCtx): WbOut =>
  wbApply(t, by, 'CANCEL', ctx, (c, at) => move(c, 'CANCELLED', at, by, c.created_by), 'CANCELLED');

/** R3.3 WB17: re-read the real ticket store from browser storage (another tab / page may have written it). DEMO memory untouched. */
export function reloadTickets(): boolean {
  if (demoOn || typeof localStorage === 'undefined') return false;
  let raw: string | null = null; try { raw = localStorage.getItem(KEY); } catch { return false; }
  if (live && raw === JSON.stringify(live)) return false;
  live = null; liveState();
  version++; listeners.forEach((l) => l());
  return true;
}
export const TICKETS_KEY = KEY;

export const isPendingPickup = (t: L0Ticket) => !DEPTS_WITH_WORKSPACE.includes(t.target_dept);
export const ticketSnapshot = () => cur().items;
export const findAnyByEvent = (type: TicketType, hotel_id:string, event_key:string) => cur().items.find(t=>t.type===type&&t.subject_ref.hotel_id===hotel_id&&t.payload.event_key===event_key);

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
