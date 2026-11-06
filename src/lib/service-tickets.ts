/* Ticket Service SLA Core v1.0 (ST1–ST20) — data rules + services for service tickets. No UI here (files 2–3 build it).
 * Stores: Layer 0 tickets (optional SLA fields on the record, written only via patchServiceTicket) · PS cases (database, never written here;
 * their SLA fields live in the side collection meridia.ticket_sla.v1 → ps:ticket_sla). New collections: ticket_categories ·
 * ticket_followups · ticket_category_requests (meridia.<name>.v1 → ps:<name>). Services check the testing role / member (simulation, not security). */
import { browserCollection } from './browser-collection';
import { addBellItem } from './bell-items';
import { DEMO_DAY } from './demo-session';
import { patchServiceTicket, type Dept, type L0Ticket, type TicketType } from './tickets-l0';
import type { Ticket as PsCase } from './task-tickets';

export type SvcDept = 'ORM' | 'MARCOM' | 'AC' | 'BD';
export const SVC_DEPTS: SvcDept[] = ['ORM', 'MARCOM', 'AC', 'BD'];
export type WaitingOn = 'CUSTOMER' | 'OTA' | 'META' | 'GOOGLE' | 'PARTNER_SYSTEM' | 'OTHER';
export type DisplayStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'SOLVED' | 'CANCELLED';
export type DueState = 'NO_DATE' | 'ON_TIME' | 'OVERDUE';
export type TicketStore = 'L0' | 'PS_CASE';

/** §0 Thai labels (internal codes never shown). */
export const SVC_STATUS_TH: Record<DisplayStatus, string> = { NEW: 'New', IN_PROGRESS: 'กำลังดำเนินการ', WAITING_CUSTOMER: 'รอลูกค้า', WAITING_THIRD_PARTY: 'รอ 3rd Party', SOLVED: 'Solve', CANCELLED: 'ยกเลิก' };
export const DUE_STATE_TH: Record<DueState, string> = { NO_DATE: 'ยังไม่ใส่วันที่', ON_TIME: 'ทันกำหนด', OVERDUE: 'เลยกำหนด' };
/** §1: FYI-only types — no solve needed, out of scope. */
export const FYI_TYPES: TicketType[] = ['GRADE_RISK', 'PARTNER_DEAL_NOTICE', 'SYSTEM_CREDIT_NOTICE'];
export const AUTO_DUE_DAYS = 10;

/* ---------- testing actors + department heads ---------- */
export type HeadRole = 'GRM' | 'MARCOM_LEAD' | 'AC_HEAD' | 'BDM';
export const HEAD_OF: Record<SvcDept, HeadRole> = { ORM: 'GRM', MARCOM: 'MARCOM_LEAD', AC: 'AC_HEAD', BD: 'BDM' };
export const TEST_ROLE_LABEL: Record<HeadRole | 'OGM', string> = { GRM: 'GRM', MARCOM_LEAD: 'Marcom Lead', AC_HEAD: 'AC Head (ทดสอบ)', BDM: 'BDM (ทดสอบ)', OGM: 'OGM (ทดสอบ)' };
/** role: the testing role the user plays; dept: their department (members); member_id / label: the person (optional). */
export type SvcActor = { role: 'AE' | 'PM' | SvcDept | HeadRole | 'OGM' | 'PS'; member_id?: string | null; label?: string | null; dept?: SvcDept | null };
const headDept = (r: SvcActor['role']): SvcDept | null => (Object.entries(HEAD_OF).find(([, h]) => h === r)?.[0] as SvcDept | undefined) ?? null;
const isHeadOf = (a: SvcActor, d: SvcDept) => headDept(a.role) === d;
const isMemberOf = (a: SvcActor, d: SvcDept) => a.role === d || a.dept === d;
const nameOf = (a: SvcActor) => a.label ?? a.member_id ?? a.role;
const roleTh = (a: SvcActor) => (a.role === 'PS' ? 'AE' : a.role in TEST_ROLE_LABEL ? TEST_ROLE_LABEL[a.role as HeadRole] : a.role);

/* ---------- dates (calendar days, Asia/Bangkok) ---------- */
export const bkkDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 10));
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const svcToday = (demo: boolean, now: Date = new Date()) => (demo ? DEMO_DAY.slice(0, 10) : bkkDate(now.toISOString()));
const stamp = (demo: boolean) => (demo ? `${DEMO_DAY.slice(0, 10)}T09:00:00+07:00` : new Date().toISOString());

/* ---------- collections ---------- */
export type TicketCategory = { id: string; key: string; name_th: string; dept: SvcDept; keywords: string[]; is_system: boolean; hidden: boolean; sort_order: number; created_by: string; created_at: string };
export type TicketFollowup = { id: string; ticket_store: TicketStore; ticket_id: string; sent_by: string; sent_by_role: 'AE' | 'PM' | 'ASSIGNEE' | 'HEAD'; /** DF4: 'PROGRESS' = receiver progress note (not a requester follow-up); empty = follow-up. */ kind?: 'PROGRESS'; recipient_kind: 'ASSIGNEE' | 'DEPT_QUEUE_AND_HEAD'; recipient_ids: string[]; note: string | null; sent_at: string; sent_date_bkk: string };
export type CategoryRequest = { id: string; dept: SvcDept; proposed_name: string; proposed_note: string | null; conflict_category_ids: string[]; requested_by: string; requested_at: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; ogm_note: string | null; decided_by: string | null; decided_at: string | null; created_category_id: string | null };
/** PS case SLA side record (one per case id). accepted_by_label = "name (team)". */
export type TicketSla = { case_id: string; category_id?: string | null; accepted_at?: string | null; accepted_by?: string | null; accepted_by_label?: string | null; due_date?: string | null; due_set_at?: string | null; due_set_by?: string | null; waiting_on?: WaitingOn | null; waiting_on_note?: string | null;
  /** UAT Polish R2 SP14: create-ticket attachments (on-device file ref or link). */
  attachments?: TicketAttachmentRef[];
  /** UAT Polish R2 SP15: audit — the creator saw these open tickets and confirmed a new one. */
  duplicate_ack?: { seen: string[]; at: string; by: string };
  /** ST-O2 (DF3): PS case routed to BD. The database routed_team stays as created (PS); vServiceTickets reads this. */
  routed_team_override?: 'BD' | null };
export type TicketAttachmentRef = { name: string; ref?: string; url?: string; added_at: string };

const SEED: [string, string, SvcDept[], string[]][] = [
  ['rate', 'ราคาห้อง & Rate', ['ORM'], ['ราคา', 'rate', 'เรท', 'parity', 'disparity']],
  ['ota', 'ช่องทาง OTA & ห้องพัก', ['ORM'], ['ota', 'ห้อง', 'allotment', 'mapping', 'listing', 'booking', 'agoda']],
  ['report', 'รายงาน & ตัวเลข', ['ORM'], ['รายงาน', 'report', 'ตัวเลข', 'snapshot']],
  ['content', 'Content & โพสต์', ['MARCOM'], ['content', 'โพสต์', 'กราฟิก']],
  ['ads', 'โฆษณา', ['MARCOM'], ['โฆษณา', 'ads', 'แอด', 'ยิง']],
  ['kol', 'KOL', ['MARCOM'], ['kol', 'influencer', 'รีวิว']],
  ['onboard', 'ตั้งค่าเริ่มต้น (On-board)', ['ORM', 'MARCOM'], ['ตั้งค่า', 'on-board', 'onboard', 'เริ่มต้น']],
  ['sys3p', 'ระบบ & บัญชีภายนอก', ['ORM', 'MARCOM'], ['ระบบ', 'channel', 'partner', 'บัญชี', 'meta', 'google']],
  ['meet', 'คำรับปากจากการประชุม', ['ORM', 'MARCOM'], ['ประชุม', 'รับปาก']],
  ['shutoff', 'ปิด / เปิดระบบ (ค้างชำระ)', ['ORM', 'MARCOM'], ['ปิดระบบ', 'เปิดระบบ', 'ค้างชำระ']],
  ['bill', 'บิล & เอกสารการเงิน', ['AC'], ['บิล', 'ใบลดหนี้', 'ใบกำกับ', 'invoice']],
  ['cust', 'ข้อมูลลูกค้า & นิติบุคคล', ['AC'], ['นิติบุคคล', 'ผู้มีอำนาจ', 'customer id']],
  ['bdterms', 'สัญญา / เงื่อนไขที่ BD ทำไว้', ['BD'], ['สัญญา', 'เงื่อนไข', 'ข้อตกลง']],
  ['quote', 'ใบเสนอราคา / ราคา', ['BD'], ['quotation', 'เสนอราคา']],
  ['offer', 'เพิ่มบริการ & ข้อเสนอ', ['BD'], ['ใบเสนอราคา', 'เพิ่มบริการ', 'special deal', 'upsell']],
  ['other', 'อื่น ๆ', ['ORM', 'MARCOM', 'AC', 'BD'], []],
];
/** §5.1 system seed (id = `{key}:{dept}`). */
export const seedCategories = (): TicketCategory[] => SEED.flatMap(([key, name_th, depts, keywords], i) => depts.map((dept) => ({ id: `${key}:${dept}`, key, name_th, dept, keywords, is_system: true, hidden: false, sort_order: key === 'other' ? 99 : i + 1, created_by: 'SYSTEM', created_at: '2026-11-03T00:00:00+07:00' })));
export const ticketCategories = browserCollection<TicketCategory>('ticket_categories', seedCategories);
export const ticketFollowups = browserCollection<TicketFollowup>('ticket_followups');
export const categoryRequests = browserCollection<CategoryRequest>('ticket_category_requests');
export const ticketSla = browserCollection<TicketSla>('ticket_sla');
/** Live: the seed is written once on first read (additive). */
export function getCategories(demo: boolean): TicketCategory[] {
  const rows = ticketCategories.all(demo);
  if (!demo && rows.length === 0) { const s = seedCategories(); ticketCategories.save(false, s); return s; }
  return rows;
}

/* ---------- §5.2 default category mapping (view-only; old rows never written) ---------- */
/** PS case category code → catalog key. */
export const PS_CASE_CATEGORY_MAP: Record<string, string> = { 'ORM-RATE': 'rate', 'ORM-CONN': 'sys3p', 'ORM-RESV': 'ota', 'ORM-REV': 'report', 'MKT-CONT': 'content', 'MKT-ADS': 'ads', 'MKT-KOL': 'kol', 'AC-PAY': 'bill' };
export function defaultCategoryKey(type: TicketType | null, dept: SvcDept, psCaseCode?: string): string {
  if (type === 'SYSTEM_SHUTOFF' || type === 'SYSTEM_REACTIVATE') return dept === 'ORM' || dept === 'MARCOM' ? 'shutoff' : 'other';
  if (type === 'UPSELL_PITCH') return dept === 'BD' ? 'offer' : 'other';
  if ((type === 'SERVICING_STALL' || type === 'PACKAGE_OTA_ADJUST') && (dept === 'ORM' || dept === 'MARCOM')) return 'onboard';
  if (psCaseCode) return PS_CASE_CATEGORY_MAP[psCaseCode] ?? 'other';
  return 'other';
}

/* ---------- §2.4 v_service_tickets (pure, read-only) ---------- */
export type ServiceTicketRow = {
  ticket_store: TicketStore; ticket_id: string; ticket_no: string; dept: SvcDept; type: TicketType | null;
  category_id: string; category_name_th: string; hotel_id: string; hotel_name: string; contract_id: string | null; service: string | null;
  subject: string; description: string | null; display_status: DisplayStatus; accepted: boolean; assignee_id: string | null; assignee_label: string | null;
  opened_by_label: string; created_at: string; created_date: string; age_days: number; due_date: string | null; due_source: 'SET' | 'AUTO';
  effective_due_date: string; due_state: DueState; overdue_remark: 'HAD_WAIT' | 'NOT_ACCEPTED' | null; waiting_days: number;
  solved_at: string | null; solve_days: number | null; followup_count: number; progress_notes: { at: string; by: string; text: string }[]; last_progress_at: string | null; last_progress_by_label: string | null; last_followup_at: string | null; last_followup_by_label: string | null; is_counted: boolean;
};
export type ViewInput = { l0: L0Ticket[]; cases?: PsCase[]; sla?: TicketSla[]; followups?: TicketFollowup[]; categories: TicketCategory[]; today: string; caseWaitDays?: Record<string, number> };

const isOpen = (s: DisplayStatus) => s !== 'SOLVED' && s !== 'CANCELLED';
export const inScopeL0 = (t: L0Ticket) => (SVC_DEPTS as Dept[]).includes(t.target_dept) && !FYI_TYPES.includes(t.type);
export const inScopeCase = (c: PsCase) => c.routed_team === 'ORM' || c.routed_team === 'MARCOM' || c.routed_team === 'AC';
const l0Status = (t: L0Ticket): DisplayStatus => (t.status === 'NEW' ? 'NEW' : t.status === 'ACK' || t.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : t.status === 'DONE' ? 'SOLVED' : t.status);
const WAIT = ['WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'];
/** Total calendar days in the two waiting statuses, from the audit trail (to solved date or today). */
export function l0WaitingDays(t: L0Ticket, end: string): number {
  let days = 0; let from: string | null = null;
  for (const a of t.audit) {
    const d = bkkDate(a.at);
    if (from && !WAIT.includes(a.to_status)) { days += daysBetween(from, d); from = null; }
    else if (!from && WAIT.includes(a.to_status)) from = d;
  }
  if (from) days += daysBetween(from, end);
  return Math.max(0, days);
}
/** §6 opened-by label from created_by / the creating audit actor. */
export function openedByLabel(t: L0Ticket): string {
  if (String(t.created_by).startsWith('SYSTEM:')) return 'ระบบ (BOT)';
  const role = t.created_by === 'PS' ? 'AE' : String(t.created_by);
  const actor = t.audit[0]?.actor;
  return actor ? `${actor} (${role})` : role;
}

export function vServiceTickets(i: ViewInput): ServiceTicketRow[] {
  const cat = (id: string | null | undefined, dept: SvcDept, key: string) => i.categories.find((c) => c.id === id) ?? i.categories.find((c) => c.key === key && c.dept === dept) ?? { id: `other:${dept}`, name_th: 'อื่น ๆ' };
  const fu = (store: TicketStore, id: string) => (i.followups ?? []).filter((f) => f.kind !== 'PROGRESS' && f.ticket_store === store && f.ticket_id === id).sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  const finish = (base: Omit<ServiceTicketRow, 'age_days' | 'effective_due_date' | 'due_source' | 'due_state' | 'overdue_remark' | 'solve_days' | 'followup_count' | 'progress_notes' | 'last_progress_at' | 'last_progress_by_label' | 'last_followup_at' | 'last_followup_by_label' | 'is_counted'>): ServiceTicketRow => {
    const eff = base.due_date ?? addDays(base.created_date, AUTO_DUE_DAYS);
    const solvedDate = base.display_status === 'SOLVED' && base.solved_at ? bkkDate(base.solved_at) : null;
    let state: DueState;
    if (solvedDate) state = solvedDate <= eff ? 'ON_TIME' : 'OVERDUE';
    else if (i.today > eff) state = 'OVERDUE';
    else state = base.due_date ? 'ON_TIME' : 'NO_DATE';
    const remark = state !== 'OVERDUE' ? null : base.waiting_days >= 1 ? 'HAD_WAIT' : base.display_status === 'NEW' ? 'NOT_ACCEPTED' : null;
    const f = fu(base.ticket_store, base.ticket_id); const last = f[f.length - 1];
    const pn = (i.followups ?? []).filter((x) => x.kind === 'PROGRESS' && x.ticket_store === base.ticket_store && x.ticket_id === base.ticket_id).sort((a, b) => a.sent_at.localeCompare(b.sent_at)).map((x) => ({ at: x.sent_at, by: x.sent_by, text: x.note ?? '' }));
    const lp = pn[pn.length - 1];
    return { ...base, age_days: daysBetween(base.created_date, solvedDate ?? i.today), effective_due_date: eff, due_source: base.due_date ? 'SET' : 'AUTO', due_state: state, overdue_remark: remark,
      solve_days: solvedDate ? daysBetween(base.created_date, solvedDate) : null, followup_count: f.length, progress_notes: pn, last_progress_at: lp?.at ?? null, last_progress_by_label: lp?.by ?? null, last_followup_at: last?.sent_at ?? null, last_followup_by_label: last?.sent_by ?? null, is_counted: base.display_status !== 'CANCELLED' };
  };
  const out: ServiceTicketRow[] = [];
  for (const t of i.l0) {
    if (!inScopeL0(t)) continue;
    const dept = t.target_dept as SvcDept; const ds = l0Status(t); const created_date = bkkDate(t.created_at);
    const c = cat(t.category_id, dept, defaultCategoryKey(t.type, dept));
    const accepted = !!t.accepted_at;
    out.push(finish({ ticket_store: 'L0', ticket_id: t.ticket_id, ticket_no: t.ticket_id, dept, type: t.type, category_id: c.id, category_name_th: c.name_th,
      hotel_id: t.subject_ref.hotel_id, hotel_name: t.subject_ref.hotel_name, contract_id: t.subject_ref.contract_id ?? t.payload.contract_id ?? null, service: t.subject_ref.service ?? t.subject_ref.service_line ?? t.subject_ref.gap_service ?? null,
      subject: t.payload.note || t.type, description: t.payload.note || null, display_status: ds, accepted,
      assignee_id: accepted ? t.assigned_to ?? null : null, assignee_label: accepted ? t.assigned_to_label ?? null : null,
      opened_by_label: openedByLabel(t), created_at: t.created_at, created_date, due_date: t.due_date ?? null,
      waiting_days: l0WaitingDays(t, ds === 'SOLVED' && t.solved_at ? bkkDate(t.solved_at) : i.today), solved_at: ds === 'SOLVED' ? t.solved_at ?? (t.audit.filter((a) => a.to_status === 'DONE').pop()?.at ?? null) : null }));
  }
  for (const cse of i.cases ?? []) {
    const x = (i.sla ?? []).find((s) => s.case_id === cse.id);
    const toBd = x?.routed_team_override === 'BD';
    if (!toBd && !inScopeCase(cse)) continue;
    const dept = (toBd ? 'BD' : cse.routed_team) as SvcDept;
    const accepted = !!x?.accepted_at;
    const ds: DisplayStatus = cse.status === 'resolved' || cse.status === 'closed' ? 'SOLVED' : cse.status === 'waiting' ? (cse.waiting_reason === 'CUSTOMER' && (!x?.waiting_on || x.waiting_on === 'CUSTOMER') ? 'WAITING_CUSTOMER' : 'WAITING_THIRD_PARTY') : cse.status === 'in-progress' || accepted ? 'IN_PROGRESS' : 'NEW';
    const c = cat(x?.category_id, dept, defaultCategoryKey(null, dept, cse.category_id));
    out.push(finish({ ticket_store: 'PS_CASE', ticket_id: cse.id, ticket_no: cse.case_no, dept, type: null, category_id: c.id, category_name_th: c.name_th,
      hotel_id: cse.hotel_id, hotel_name: cse.hotel_name, contract_id: cse.contract_id ?? null, service: dept, subject: cse.title, description: cse.description,
      display_status: ds, accepted, assignee_id: accepted ? x?.accepted_by ?? null : null, assignee_label: accepted ? x?.accepted_by_label ?? null : null,
      opened_by_label: cse.created_by, created_at: cse.created_at, created_date: bkkDate(cse.created_at), due_date: x?.due_date ?? null,
      waiting_days: i.caseWaitDays?.[cse.id] ?? 0, solved_at: ds === 'SOLVED' ? cse.resolved_at : null }));
  }
  return out;
}
/** §3.5 median of solve days (CANCELLED never counted). */
export function medianSolveDays(rows: ServiceTicketRow[]): number | null {
  const v = rows.filter((r) => r.is_counted && r.solve_days != null).map((r) => r.solve_days!).sort((a, b) => a - b);
  if (!v.length) return null; const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}
export const openRows = (rows: ServiceTicketRow[]) => rows.filter((r) => r.is_counted && isOpen(r.display_status));

/* ---------- services ---------- */
export type Res = { ok: true } | { ok: false; error: string };
const fail = (error: string): Res => ({ ok: false, error });

/** §4.1 accept + write-once due date in [today, created + 10]. Head may accept on behalf of a member. */
export function acceptTicket(row: ServiceTicketRow, due_date: string, actor: SvcActor, o: { demo: boolean; today?: string; onBehalf?: { member_id: string; label: string } }): Res {
  const today = o.today ?? svcToday(o.demo);
  const head = isHeadOf(actor, row.dept);
  if (!isMemberOf(actor, row.dept) && !head) return fail('เฉพาะทีมผู้รับงานเท่านั้น');
  if (row.accepted || row.due_date) return fail('ticket นี้รับงานแล้ว');
  if (row.display_status !== 'NEW' && row.display_status !== 'IN_PROGRESS') return fail('รับงานได้เฉพาะ ticket ที่ยังเปิดอยู่');
  const cap = addDays(row.created_date, AUTO_DUE_DAYS);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || due_date < today || due_date > cap) return fail(`วันกำหนดเสร็จต้องอยู่ระหว่าง ${today} ถึง ${cap}`);
  const who = head && o.onBehalf ? o.onBehalf : { member_id: actor.member_id ?? actor.role, label: nameOf(actor) };
  if (!who.member_id) return fail('ไม่พบผู้รับงาน');
  const at = stamp(o.demo); const setBy = actor.member_id ?? actor.role;
  if (row.ticket_store === 'L0') {
    const ok = patchServiceTicket(row.ticket_id, (t) => (t.accepted_at || t.due_date ? null : { ...t, status: 'IN_PROGRESS', accepted_at: at, assigned_to: who.member_id, assigned_to_label: who.label, assigned_by: setBy, assigned_at: at, due_date, due_set_at: at, due_set_by: setBy }),
      { by: row.dept, note: `รับงาน · กำหนดเสร็จ ${due_date}`, actor: nameOf(actor), at });
    return ok ? { ok: true } : fail('ticket นี้รับงานแล้ว');
  }
  const rows = ticketSla.all(o.demo); const x = rows.find((s) => s.case_id === row.ticket_id);
  if (x?.accepted_at || x?.due_date) return fail('ticket นี้รับงานแล้ว');
  const next: TicketSla = { ...(x ?? { case_id: row.ticket_id }), accepted_at: at, accepted_by: who.member_id, accepted_by_label: who.label, due_date, due_set_at: at, due_set_by: setBy };
  ticketSla.save(o.demo, x ? rows.map((s) => (s.case_id === row.ticket_id ? next : s)) : [...rows, next]);
  return { ok: true };
}

const THIRD: WaitingOn[] = ['OTA', 'META', 'GOOGLE', 'PARTNER_SYSTEM', 'OTHER'];
/** §4.2 receiver status changes (never touches due_date). PS case status itself lives in the database → only via the existing case screen. */
export function changeTicketStatus(row: ServiceTicketRow, to: 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'SOLVED', actor: SvcActor, o: { demo: boolean; waiting_on?: WaitingOn; note?: string }): Res {
  if (!isMemberOf(actor, row.dept) && !isHeadOf(actor, row.dept)) return fail('เฉพาะทีมผู้รับงานเท่านั้น');
  if (to === 'WAITING_THIRD_PARTY') {
    if (!o.waiting_on || !THIRD.includes(o.waiting_on)) return fail('กรุณาเลือกว่ารอใคร');
    if (o.waiting_on === 'OTHER' && !o.note?.trim()) return fail('กรุณาระบุรายละเอียด (อื่น ๆ)');
    if ((o.note ?? '').length > 120) return fail('รายละเอียดยาวเกิน 120 ตัวอักษร');
  }
  if (row.ticket_store === 'PS_CASE') return fail('สถานะ case เปลี่ยนที่หน้าจอ case เดิม');
  const from = row.display_status;
  const okMove = (from === 'IN_PROGRESS' && (to === 'WAITING_CUSTOMER' || to === 'WAITING_THIRD_PARTY')) || ((from === 'WAITING_CUSTOMER' || from === 'WAITING_THIRD_PARTY') && to === 'IN_PROGRESS') || (isOpen(from) && to === 'SOLVED') || (from === 'SOLVED' && to === 'IN_PROGRESS');
  if (!okMove) return fail('เปลี่ยนสถานะนี้ไม่ได้');
  const at = stamp(o.demo);
  const ok = patchServiceTicket(row.ticket_id, (t) => {
    if (to === 'SOLVED') return { ...t, status: 'DONE', solved_at: at };
    if (to === 'IN_PROGRESS') return { ...t, status: 'IN_PROGRESS', solved_at: null, waiting_on: null, waiting_on_note: null };
    if (to === 'WAITING_CUSTOMER') return { ...t, status: 'WAITING_CUSTOMER', waiting_on: 'CUSTOMER', waiting_on_note: null };
    return { ...t, status: 'WAITING_THIRD_PARTY', waiting_on: o.waiting_on!, waiting_on_note: o.waiting_on === 'OTHER' ? o.note!.trim() : null };
  }, { by: row.dept, note: `สถานะ → ${SVC_STATUS_TH[to]}${from === 'SOLVED' ? ' (เปิดใหม่)' : ''}`, actor: nameOf(actor), at });
  return ok ? { ok: true } : fail('ไม่พบ ticket');
}

export const FOLLOWUP_DUP_TH = 'ส่ง Follow up ticket นี้แล้ววันนี้ · ส่งได้อีกครั้งพรุ่งนี้';
/** §4.3 one Follow up per ticket per Bangkok calendar day (whoever sends). AE / PM only; open tickets only. */
export function sendFollowUp(row: ServiceTicketRow, actor: SvcActor, o: { demo: boolean; note?: string; at?: string }): Res {
  const role = actor.role === 'PS' ? 'AE' : actor.role;
  if (role !== 'AE' && role !== 'PM') return fail('ส่ง Follow up ได้เฉพาะ AE หรือ PM');
  if (!isOpen(row.display_status)) return fail('ticket นี้ปิดแล้ว');
  const note = o.note?.trim() || null; if (note && note.length > 300) return fail('ข้อความยาวเกิน 300 ตัวอักษร');
  const at = o.at ?? stamp(o.demo); const day = bkkDate(at);
  const rows = ticketFollowups.all(o.demo);
  if (rows.some((f) => f.kind !== 'PROGRESS' && f.ticket_store === row.ticket_store && f.ticket_id === row.ticket_id && f.sent_date_bkk === day)) return fail(FOLLOWUP_DUP_TH);
  const head = HEAD_OF[row.dept];
  const accepted = row.accepted && !!row.assignee_id;
  const sender = `${nameOf(actor)} (${role})`;
  const f: TicketFollowup = { id: `FU-${row.ticket_store}-${row.ticket_id}-${day}`, ticket_store: row.ticket_store, ticket_id: row.ticket_id, sent_by: sender, sent_by_role: role, recipient_kind: accepted ? 'ASSIGNEE' : 'DEPT_QUEUE_AND_HEAD', recipient_ids: accepted ? [row.assignee_id!] : [`queue:${row.dept}`, `role:${head}`], note, sent_at: at, sent_date_bkk: day };
  ticketFollowups.save(o.demo, [...rows, f]);
  const text = `${sender} ส่ง Follow up · ${row.ticket_no}${note ? ` · “${note}”` : ''}`;
  const base = { key: `TICKET_FOLLOWUP:${row.ticket_store}:${row.ticket_id}:${day}`, alert_type: 'TICKET_FOLLOWUP', text, link: null, created_at: at, tone: 'info' as const };
  if (accepted) addBellItem(o.demo, { ...base, target_type: 'USER', target_id: row.assignee_id! });
  else { addBellItem(o.demo, { ...base, target_type: 'DEPT_QUEUE', target_id: row.dept }); addBellItem(o.demo, { ...base, target_type: 'ROLE', target_id: head }); }
  if (row.ticket_store === 'L0') patchServiceTicket(row.ticket_id, (t) => t, { by: role === 'AE' ? 'PS' : 'PM', note: `Follow up โดย ${sender}${note ? ` · “${note}”` : ''}`, actor: nameOf(actor), at });
  return { ok: true };
}

/** §4.4 category change: opener at create, receiver (or head) later; same department, not hidden. */
export function changeTicketCategory(row: ServiceTicketRow, category_id: string, actor: SvcActor, o: { demo: boolean }): Res {
  const c = getCategories(o.demo).find((x) => x.id === category_id);
  if (!c || c.dept !== row.dept || c.hidden) return fail('หมวดนี้ใช้กับ ticket นี้ไม่ได้');
  if (!isMemberOf(actor, row.dept) && !isHeadOf(actor, row.dept)) return fail('เฉพาะทีมผู้รับงานเท่านั้น');
  if (row.ticket_store === 'L0') return patchServiceTicket(row.ticket_id, (t) => ({ ...t, category_id }), { by: row.dept, note: `หมวด → ${c.name_th}`, actor: nameOf(actor), at: stamp(o.demo) }) ? { ok: true } : fail('ไม่พบ ticket');
  const rows = ticketSla.all(o.demo); const x = rows.find((s) => s.case_id === row.ticket_id);
  ticketSla.save(o.demo, x ? rows.map((s) => (s.case_id === row.ticket_id ? { ...s, category_id } : s)) : [...rows, { case_id: row.ticket_id, category_id }]);
  return { ok: true };
}

/* ---------- §5.3–§5.4 categories ---------- */
export const normCat = (s: string) => s.toLowerCase().trim().replace(/[\s&/()·\-]/g, '');
export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}
/** Deterministic overlap check against visible categories of the same department (no AI). */
export function checkCategoryOverlap(dept: SvcDept, name: string, cats: TicketCategory[]): TicketCategory[] {
  const n = normCat(name); if (!n) return [];
  return cats.filter((c) => c.dept === dept && !c.hidden).filter((c) => {
    const cn = normCat(c.name_th);
    if (cn === n || cn.includes(n) || n.includes(cn)) return true;
    if (c.keywords.some((k) => k && n.includes(normCat(k)))) return true;
    return 1 - levenshtein(n, cn) / Math.max(n.length, cn.length) >= 0.6;
  });
}
export type AddCatRes = { ok: true; category: TicketCategory } | { ok: false; error: string; conflicts?: TicketCategory[] };
export function addCategory(dept: SvcDept, name_th: string, actor: SvcActor, o: { demo: boolean; keywords?: string[] }): AddCatRes {
  if (!isHeadOf(actor, dept)) return { ok: false, error: 'เพิ่มหมวดได้เฉพาะหัวหน้าแผนกของตัวเอง' };
  const cats = getCategories(o.demo);
  const conflicts = checkCategoryOverlap(dept, name_th, cats);
  if (conflicts.length) return { ok: false, error: 'ชื่อหมวดซ้ำหรือใกล้เคียงหมวดที่มีอยู่', conflicts };
  const at = stamp(o.demo);
  const c: TicketCategory = { id: `cat-${dept}-${normCat(name_th)}`, key: normCat(name_th), name_th: name_th.trim(), dept, keywords: (o.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean), is_system: false, hidden: false, sort_order: 50, created_by: actor.member_id ?? actor.role, created_at: at };
  ticketCategories.save(o.demo, [...cats, c]);
  return { ok: true, category: c };
}
/** Hide only (there is no delete path). Head hides own department's non-system categories; system categories only OGM. */
export function hideCategory(id: string, actor: SvcActor, o: { demo: boolean }): Res {
  const cats = getCategories(o.demo); const c = cats.find((x) => x.id === id);
  if (!c) return fail('ไม่พบหมวด');
  if (c.is_system ? actor.role !== 'OGM' : !isHeadOf(actor, c.dept)) return fail('ไม่มีสิทธิ์ซ่อนหมวดนี้');
  ticketCategories.save(o.demo, cats.map((x) => (x.id === id ? { ...x, hidden: true } : x)));
  return { ok: true };
}
export function requestCategory(dept: SvcDept, name: string, note: string | null, actor: SvcActor, o: { demo: boolean }): { ok: true; request: CategoryRequest } | { ok: false; error: string } {
  if (!isHeadOf(actor, dept)) return { ok: false, error: 'ส่งคำขอได้เฉพาะหัวหน้าแผนก' };
  const at = stamp(o.demo); const rows = categoryRequests.all(o.demo);
  const r: CategoryRequest = { id: `CR-${dept}-${rows.length + 1}`, dept, proposed_name: name.trim(), proposed_note: note, conflict_category_ids: checkCategoryOverlap(dept, name, getCategories(o.demo)).map((c) => c.id), requested_by: actor.member_id ?? actor.role, requested_at: at, status: 'PENDING', ogm_note: null, decided_by: null, decided_at: null, created_category_id: null };
  categoryRequests.save(o.demo, [...rows, r]);
  addBellItem(o.demo, { key: `CATEGORY_REQUEST:${r.id}`, target_type: 'ROLE', target_id: 'OGM', alert_type: 'CATEGORY_REQUEST', text: `ขอเพิ่มหมวด ticket · ${dept} · ${r.proposed_name}`, link: null, created_at: at, tone: 'info' });
  return { ok: true, request: r };
}
export function decideCategoryRequest(id: string, approve: boolean, actor: SvcActor, o: { demo: boolean; note?: string }): Res {
  if (actor.role !== 'OGM') return fail('เฉพาะ OGM');
  const rows = categoryRequests.all(o.demo); const r = rows.find((x) => x.id === id);
  if (!r || r.status !== 'PENDING') return fail('ไม่พบคำขอที่รอพิจารณา');
  const at = stamp(o.demo); let created: string | null = null;
  if (approve) {
    const cats = getCategories(o.demo);
    const c: TicketCategory = { id: `cat-${r.dept}-${normCat(r.proposed_name)}`, key: normCat(r.proposed_name), name_th: r.proposed_name, dept: r.dept, keywords: [], is_system: false, hidden: false, sort_order: 50, created_by: actor.member_id ?? 'OGM', created_at: at };
    if (!cats.some((x) => x.id === c.id)) ticketCategories.save(o.demo, [...cats, c]);
    created = c.id;
  }
  categoryRequests.save(o.demo, rows.map((x) => (x.id === id ? { ...x, status: approve ? 'APPROVED' : 'REJECTED', ogm_note: o.note ?? null, decided_by: actor.member_id ?? 'OGM', decided_at: at, created_category_id: created } : x)));
  addBellItem(o.demo, { key: `CATEGORY_DECIDED:${id}`, target_type: 'ROLE', target_id: HEAD_OF[r.dept], alert_type: 'CATEGORY_REQUEST', text: `${approve ? 'อนุมัติ' : 'ไม่อนุมัติ'}หมวด ticket · ${r.dept} · ${r.proposed_name}`, link: null, created_at: at, tone: 'info' });
  return { ok: true };
}
export { roleTh as svcRoleTh };

/* ---------- ST-O2 (DF3) · PS case → BD ---------- */
/** Mark a PS case as routed to BD (side record only; never writes the PS case tables). */
export function routeCaseToBd(demo: boolean, caseId: string, category_id?: string | null): Res {
  const rows = ticketSla.all(demo); const x = rows.find((s) => s.case_id === caseId);
  const next: TicketSla = { ...(x ?? { case_id: caseId }), routed_team_override: 'BD', ...(category_id ? { category_id } : {}) };
  ticketSla.save(demo, x ? rows.map((s) => (s.case_id === caseId ? next : s)) : [...rows, next]);
  return { ok: true };
}

/* ---------- DF4 · receiver progress notes ---------- */
/** Only the assignee or the department head adds a note; stored in ticket_followups with kind PROGRESS; no edit / delete. */
export function canAddProgressNote(row: ServiceTicketRow, actor: SvcActor): boolean {
  if (isHeadOf(actor, row.dept)) return true;
  return !!row.accepted && !!actor.member_id && actor.member_id === row.assignee_id;
}
export function addProgressNote(row: ServiceTicketRow, text: string, actor: SvcActor, o: { demo: boolean; at?: string }): Res {
  const note = text.trim();
  if (!note) return fail('กรุณาใส่ข้อความ');
  if (!canAddProgressNote(row, actor)) return fail('เฉพาะผู้รับงานหรือหัวหน้าแผนกเท่านั้น');
  const at = o.at ?? stamp(o.demo);
  const rows = ticketFollowups.all(o.demo);
  const head = isHeadOf(actor, row.dept);
  const f: TicketFollowup = { id: `PN-${row.ticket_store}-${row.ticket_id}-${rows.length + 1}-${Date.parse(at)}`, ticket_store: row.ticket_store, ticket_id: row.ticket_id, sent_by: `${nameOf(actor)} (${roleTh(actor)})`, sent_by_role: head ? 'HEAD' : 'ASSIGNEE', recipient_kind: 'ASSIGNEE', recipient_ids: [], note, sent_at: at, sent_date_bkk: bkkDate(at), kind: 'PROGRESS' };
  ticketFollowups.save(o.demo, [...rows, f]);
  return { ok: true };
}
