/* Service Ticket Receiver v1.0 (ST46–ST60) — pure helpers for the 🎫 lane of the ORM · MARCOM · AC · BD Workspaces.
 * Reads vServiceTickets() rows only; every write goes through the file 1 services in service-tickets.ts. No storage of its own. */
import { addDays, daysBetween, HEAD_OF, AUTO_DUE_DAYS, categoryRequests, getCategories, ticketCategories, type CategoryRequest, type ServiceTicketRow, type SvcActor, type SvcDept, type WaitingOn } from './service-tickets';
import { COACH_DEMO_ROSTER } from './coaching-demo';
import type { BellItem } from './bell-items';
import { DEMO_DAY } from './demo-session';

/* ---------- testing members (DEMO picker) ---------- */
export type RecvMember = { id: string; name: string; head: boolean };
const coach = (kinds: string[]) => COACH_DEMO_ROSTER.filter((m) => kinds.includes(m.kind)).map((m) => ({ id: m.id, name: m.name, head: m.kind === 'GRM' || m.kind === 'MARCOM_LEAD' }));
/** Heads first. ORM / Marcom reuse the Coaching DEMO roster (same picker); AC / BD are testing members. */
export const RECEIVER_ROSTER: Record<SvcDept, RecvMember[]> = {
  ORM: coach(['GRM', 'ORM']),
  MARCOM: coach(['MARCOM_LEAD', 'MARCOM']),
  AC: [{ id: 'ac-head', name: 'AC Head (ทดสอบ)', head: true }, { id: 'ac-praew', name: 'แพร (AC)', head: false }, { id: 'ac-nam', name: 'น้ำ (AC)', head: false }],
  BD: [{ id: 'bdm', name: 'BDM (ทดสอบ)', head: true }, { id: 'BD-T1', name: 'BD 1 (ทดสอบ)', head: false }, { id: 'BD-T2', name: 'BD 2 (ทดสอบ)', head: false }, { id: 'BD-T3', name: 'BD 3 (ทดสอบ)', head: false }],
};
export const DEFAULT_RECV_VIEWER: Record<SvcDept, string> = { ORM: 'grm', MARCOM: 'mk-naen', AC: 'ac-head', BD: 'bdm' };
export const membersOf = (d: SvcDept) => RECEIVER_ROSTER[d].filter((m) => !m.head);

/** DEMO: the picked member. Live (no login): the testing role switcher — the department role = a member, BDM = BD head. */
export function receiverActor(dept: SvcDept, o: { demo: boolean; memberId: string; liveRole: string }): SvcActor | null {
  if (o.demo) {
    const m = RECEIVER_ROSTER[dept].find((x) => x.id === o.memberId);
    if (!m) return null;
    return m.head ? { role: HEAD_OF[dept], member_id: m.id, label: m.name, dept } : { role: dept, member_id: m.id, label: m.name, dept };
  }
  if (dept === 'BD' && o.liveRole === 'BDM') return { role: 'BDM', member_id: 'BDM', label: 'BDM', dept };
  if (o.liveRole === dept) return { role: dept, member_id: dept, label: dept, dept };
  return null;
}
export const isHeadActor = (a: SvcActor | null, d: SvcDept) => !!a && a.role === HEAD_OF[d];

/* ---------- §2 list ---------- */
export type LaneFilter = 'unaccepted' | 'mine' | 'overdue' | 'open' | 'closed';
export const LANE_FILTERS: [LaneFilter, string][] = [['unaccepted', 'ยังไม่รับงาน'], ['mine', 'ของฉัน'], ['overdue', 'เลยกำหนด'], ['open', 'เปิดทั้งหมด'], ['closed', 'Solve / ยกเลิก']];
const OPEN = ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'];
export const isOpenRow = (r: ServiceTicketRow) => OPEN.includes(r.display_status);
export const defaultFilter = (a: SvcActor | null, d: SvcDept): LaneFilter => (isHeadActor(a, d) ? 'open' : 'mine');

/** Own-only (L1): members see the department queue (New) + their own accepted tickets; heads see all. */
export function visibleRows(rows: ServiceTicketRow[], dept: SvcDept, a: SvcActor | null): ServiceTicketRow[] {
  const mine = rows.filter((r) => r.dept === dept);
  if (isHeadActor(a, dept)) return mine;
  const me = a?.member_id ?? null;
  return mine.filter((r) => r.display_status === 'NEW' || (!!me && r.assignee_id === me));
}
export function laneRows(rows: ServiceTicketRow[], dept: SvcDept, a: SvcActor | null, f: LaneFilter): ServiceTicketRow[] {
  const me = a?.member_id ?? null;
  const v = visibleRows(rows, dept, a).filter((r) =>
    f === 'unaccepted' ? r.display_status === 'NEW'
    : f === 'mine' ? isOpenRow(r) && (r.display_status === 'NEW' || (!!me && r.assignee_id === me))
    : f === 'overdue' ? isOpenRow(r) && r.due_state === 'OVERDUE'
    : f === 'open' ? isOpenRow(r) : !isOpenRow(r));
  return v.sort((x, y) => {
    const xn = x.display_status === 'NEW' ? 0 : 1; const yn = y.display_status === 'NEW' ? 0 : 1;
    if (xn !== yn) return xn - yn;
    if (xn === 0) return x.created_at.localeCompare(y.created_at);
    return x.effective_due_date.localeCompare(y.effective_due_date);
  });
}
export const laneCounts = (rows: ServiceTicketRow[], dept: SvcDept, a: SvcActor | null) => {
  const v = visibleRows(rows, dept, a);
  return { unaccepted: v.filter((r) => r.display_status === 'NEW').length, overdue: v.filter((r) => isOpenRow(r) && r.due_state === 'OVERDUE').length };
};

/* ---------- §2.1 due cell (same wording as PS Dashboard ⑥) ---------- */
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const thDate = (d: string) => { const [y, m, dd] = d.slice(0, 10).split('-').map(Number); return `${dd} ${TH_MON[(m ?? 1) - 1]} ${String(((y ?? 2026) + 543) % 100).padStart(2, '0')}`; };
export type DueCell = { text: string; tone: 'amber' | 'red' | 'neutral'; waitChip: string | null };
export function dueCell(r: ServiceTicketRow, today: string): DueCell {
  const late = daysBetween(r.effective_due_date, today);
  const waitChip = r.waiting_days > 0 && r.due_state === 'OVERDUE' ? `มีช่วงรอ ${r.waiting_days} วัน` : null;
  if (!isOpenRow(r)) return { text: r.display_status === 'SOLVED' ? `Solve · กำหนด ${thDate(r.effective_due_date)}` : 'ยกเลิก', tone: 'neutral', waitChip: null };
  if (r.display_status === 'NEW') return late > 0 ? { text: `ยังไม่รับงาน · เลย ${late} วัน`, tone: 'red', waitChip: null } : { text: `ยังไม่ใส่วันที่ · สูงสุด ${thDate(r.effective_due_date)}`, tone: 'amber', waitChip: null };
  if (late > 0) return { text: `เลย ${late} วัน`, tone: 'red', waitChip };
  return { text: `เหลือ ${-late} วัน · กำหนด ${thDate(r.effective_due_date)}`, tone: 'neutral', waitChip: null };
}
export function followBadge(r: ServiceTicketRow, today: string): { text: string; today: boolean } | null {
  if (!r.followup_count || !r.last_followup_at) return null;
  const d = r.last_followup_at.slice(0, 10);
  return { text: `📣 ${r.followup_count} · ล่าสุด ${thDate(d)}`, today: d === today };
}

/* ---------- §3 accept window ---------- */
export const acceptCap = (created: string) => addDays(created, AUTO_DUE_DAYS);
export function acceptChips(created: string, today: string) {
  const cap = acceptCap(created);
  return [3, 5, 7, 10].map((n) => { const date = addDays(created, n); return { days: n, date, disabled: date < today || date > cap }; });
}
export const canPickDate = (d: string, created: string, today: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && d <= acceptCap(created);
export const WAIT_CHOICES: [WaitingOn, string][] = [['OTA', 'OTA'], ['META', 'Meta'], ['GOOGLE', 'Google'], ['PARTNER_SYSTEM', 'Partner ระบบ'], ['OTHER', 'อื่น ๆ (ระบุ)']];
export const WAIT_TH: Record<WaitingOn, string> = { CUSTOMER: 'ลูกค้า', OTA: 'OTA', META: 'Meta', GOOGLE: 'Google', PARTNER_SYSTEM: 'Partner ระบบ', OTHER: 'อื่น ๆ' };

/* ---------- §5 category usage ---------- */
export const categoryUsage = (rows: ServiceTicketRow[], id: string) => rows.filter((r) => r.category_id === id).length;

/* ---------- §8 bell rendering ---------- */
export const BELL_ICON: Record<string, string> = { TICKET_NEW: '🆕', TICKET_NO_DATE_DAILY: '⏰', TICKET_NOT_ACCEPTED_3D: '⏫', TICKET_DUE_TOMORROW: '⚠️', TICKET_OVERDUE: '🔴', TICKET_FOLLOWUP: '📣', CATEGORY_REQUEST: '📂' };
const DEPT_OF_HEAD: Record<string, SvcDept> = Object.fromEntries(Object.entries(HEAD_OF).map(([d, h]) => [h, d as SvcDept]));
/** Where a bell item leads: { dept Workspace, ticket id or `filter:unaccepted` / `settings` } (null = no deep link). */
export function bellTarget(b: Pick<BellItem, 'key' | 'alert_type' | 'target_type' | 'target_id'>, currentDept: string | null): { dept: string; ticket: string } | null {
  const dept = b.target_type === 'DEPT_QUEUE' ? b.target_id : b.target_type === 'ROLE' ? (b.target_id === 'OGM' ? 'AUTO' : DEPT_OF_HEAD[b.target_id] ?? currentDept) : currentDept;
  if (!dept) return null;
  if (b.alert_type === 'TICKET_NO_DATE_DAILY') return { dept, ticket: 'filter:unaccepted' };
  if (b.alert_type === 'CATEGORY_REQUEST') return { dept, ticket: dept === 'AUTO' ? 'ogm' : 'settings' };
  const m = /^[A-Z_0-9]+:(?:L0|PS_CASE):(.+)$/.exec(b.key);
  return m ? { dept, ticket: m[1]! } : null;
}

/* ---------- §8 DEMO additions (DEMO on only, in memory, add-only) ---------- */
const at = (d: string) => `${d}T09:00:00+07:00`;
export function receiverDemoRequests(): CategoryRequest[] {
  const today = DEMO_DAY.slice(0, 10);
  return [
    { id: 'CR-DEMO-ORM-1', dept: 'ORM', proposed_name: 'ราคา promotion', proposed_note: 'ลูกค้าขอแยกเรื่องโปรโมชันออกจากราคาห้อง', conflict_category_ids: ['rate:ORM'], requested_by: 'GRM', requested_at: at(addDays(today, -1)), status: 'PENDING', ogm_note: null, decided_by: null, decided_at: null, created_category_id: null },
    { id: 'CR-DEMO-MARCOM-1', dept: 'MARCOM', proposed_name: 'Live สด', proposed_note: 'งานไลฟ์ขายห้อง', conflict_category_ids: [], requested_by: 'แนน', requested_at: at(addDays(today, -6)), status: 'APPROVED', ogm_note: null, decided_by: 'OGM', decided_at: at(addDays(today, -5)), created_category_id: 'cat-MARCOM-live' },
  ];
}
/** Adds the §8 DEMO requests (+ the approved Marcom category) once per DEMO session; never edits existing rows. */
export function seedReceiverDemo() {
  const reqs = categoryRequests.all(true);
  const add = receiverDemoRequests().filter((r) => !reqs.some((x) => x.id === r.id));
  if (add.length) categoryRequests.save(true, [...reqs, ...add]);
  const cats = getCategories(true);
  if (!cats.some((c) => c.id === 'cat-MARCOM-live')) ticketCategories.save(true, [...cats, { id: 'cat-MARCOM-live', key: 'live', name_th: 'Live สด', dept: 'MARCOM', keywords: ['live', 'ไลฟ์'], is_system: false, hidden: false, sort_order: 50, created_by: 'OGM', created_at: at(addDays(DEMO_DAY.slice(0, 10), -5)) }]);
}
