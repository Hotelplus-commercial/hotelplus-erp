/* Service SLA Core v1.0 §9 — DEMO additions only (shared DEMO ticket list + in-memory follow-ups / history). Never edits existing entries.
 * DEMO today = DEMO_DAY (28 ต.ค. 2569); ages are set so the §9 numbers hold on that day:
 * 40 open (ORM 18 · Marcom 10 · AC 7 · BD 5) · New 15 · กำลังดำเนินการ 14 · รอลูกค้า 6 · รอ 3rd Party 5 · overdue 9 (HAD_WAIT 3 · NOT_ACCEPTED 2 · none 4)
 * · 6 recently solved · follow-ups on 3 tickets (2 + 1 + 1 today) · ~36 months seeded solved history (view-only, not in the ticket list). */
import { DEMO_DAY } from './demo-session';
import type { L0Status, L0Ticket } from './tickets-l0';
import { addDays, ticketFollowups, type SvcDept, type TicketFollowup } from './service-tickets';

const TODAY = DEMO_DAY.slice(0, 10);
const iso = (d: string, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00+07:00`;
const ASSIGNEE: Record<SvcDept, { id: string; label: string }[]> = {
  ORM: [{ id: 'orm-toey', label: 'เตย (ORM-A)' }, { id: 'orm-ton', label: 'ต้น (ORM-B)' }, { id: 'orm-mint', label: 'มิ้นท์ (ORM-C)' }],
  MARCOM: [{ id: 'mk-biw', label: 'บิว (Marcom)' }, { id: 'mk-bow', label: 'โบว์ (Marcom)' }],
  AC: [{ id: 'ac-praew', label: 'แพร (AC)' }],
  BD: [{ id: 'BD-T1', label: 'BD 1 (ทดสอบ)' }],
};
const CAT: Record<SvcDept, string[]> = { ORM: ['rate:ORM', 'ota:ORM', 'report:ORM', 'sys3p:ORM'], MARCOM: ['content:MARCOM', 'ads:MARCOM', 'kol:MARCOM'], AC: ['bill:AC', 'cust:AC'], BD: ['offer:BD'] };
const OPENERS = [{ by: 'PS' as const, actor: 'นนท์' }, { by: 'PM' as const, actor: 'PM Alex' }, { by: 'PS' as const, actor: 'เฟิร์น' }];

type Spec = { status: 'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'DONE'; age: number; dueIn?: number; wait?: number; solvedAgo?: number };
/** 46 specs: dept order cycles so counts land at ORM 18 · MARCOM 10 · AC 7 · BD 5 among the 40 open. */
const OPEN_SPECS: Spec[] = [
  // New 15: 2 not accepted past day 10 (NOT_ACCEPTED), the rest inside the window (several ≥ 3 days)
  { status: 'NEW', age: 12 }, { status: 'NEW', age: 11 }, { status: 'NEW', age: 9 }, { status: 'NEW', age: 7 }, { status: 'NEW', age: 5 },
  { status: 'NEW', age: 4 }, { status: 'NEW', age: 3 }, { status: 'NEW', age: 3 }, { status: 'NEW', age: 2 }, { status: 'NEW', age: 2 },
  { status: 'NEW', age: 1 }, { status: 'NEW', age: 1 }, { status: 'NEW', age: 0 }, { status: 'NEW', age: 0 }, { status: 'NEW', age: 6 },
  // กำลังดำเนินการ 14: 4 overdue without waiting (remark none), 10 on time (one due tomorrow)
  { status: 'IN_PROGRESS', age: 13, dueIn: -5 }, { status: 'IN_PROGRESS', age: 12, dueIn: -3 }, { status: 'IN_PROGRESS', age: 11, dueIn: -2 }, { status: 'IN_PROGRESS', age: 10, dueIn: -1 },
  { status: 'IN_PROGRESS', age: 9, dueIn: 1 }, { status: 'IN_PROGRESS', age: 8, dueIn: 2 }, { status: 'IN_PROGRESS', age: 6, dueIn: 3 }, { status: 'IN_PROGRESS', age: 5, dueIn: 4 }, { status: 'IN_PROGRESS', age: 4, dueIn: 5 },
  { status: 'IN_PROGRESS', age: 3, dueIn: 5 }, { status: 'IN_PROGRESS', age: 2, dueIn: 6 }, { status: 'IN_PROGRESS', age: 2, dueIn: 7 }, { status: 'IN_PROGRESS', age: 1, dueIn: 8 }, { status: 'IN_PROGRESS', age: 1, dueIn: 9 },
  // รอลูกค้า 6: 2 overdue after waiting (HAD_WAIT)
  { status: 'WAITING_CUSTOMER', age: 14, dueIn: -4, wait: 5 }, { status: 'WAITING_CUSTOMER', age: 12, dueIn: -2, wait: 3 }, { status: 'WAITING_CUSTOMER', age: 6, dueIn: 2, wait: 2 },
  { status: 'WAITING_CUSTOMER', age: 5, dueIn: 3, wait: 1 }, { status: 'WAITING_CUSTOMER', age: 4, dueIn: 4, wait: 1 }, { status: 'WAITING_CUSTOMER', age: 3, dueIn: 5, wait: 1 },
  // รอ 3rd Party 5: 1 overdue after waiting (HAD_WAIT)
  { status: 'WAITING_THIRD_PARTY', age: 13, dueIn: -3, wait: 4 }, { status: 'WAITING_THIRD_PARTY', age: 7, dueIn: 2, wait: 2 }, { status: 'WAITING_THIRD_PARTY', age: 5, dueIn: 3, wait: 1 },
  { status: 'WAITING_THIRD_PARTY', age: 4, dueIn: 4, wait: 1 }, { status: 'WAITING_THIRD_PARTY', age: 2, dueIn: 6, wait: 1 },
];
const SOLVED_SPECS: Spec[] = [{ status: 'DONE', age: 9, dueIn: -1, solvedAgo: 1 }, { status: 'DONE', age: 8, dueIn: 0, solvedAgo: 2 }, { status: 'DONE', age: 12, dueIn: -4, solvedAgo: 1 }, { status: 'DONE', age: 6, dueIn: 2, solvedAgo: 3 }, { status: 'DONE', age: 5, dueIn: 3, solvedAgo: 0 }, { status: 'DONE', age: 14, dueIn: -6, solvedAgo: 2 }];
const DEPT_ORDER: SvcDept[] = [...Array(18).fill('ORM'), ...Array(10).fill('MARCOM'), ...Array(7).fill('AC'), ...Array(5).fill('BD')];
/** Interleave so every status group spreads over departments. */
const deptFor = (i: number): SvcDept => DEPT_ORDER[(i * 7) % 40]!;
const WAIT_ON = ['OTA', 'META', 'GOOGLE', 'PARTNER_SYSTEM', 'OTHER'] as const;

function makeTicket(i: number, s: Spec, dept: SvcDept): L0Ticket {
  const created = addDays(TODAY, -s.age); const opener = OPENERS[i % OPENERS.length]!;
  const id = `TKT-2026-${String(400 + i).padStart(4, '0')}`;
  const audit: L0Ticket['audit'] = [{ at: iso(created, 9), by: opener.by, from_status: null, to_status: 'NEW', actor: opener.actor }];
  const t: L0Ticket = { ticket_id: id, type: dept === 'BD' ? 'UPSELL_PITCH' : 'HANDOVER_FIX', source_app: 'PS_DASHBOARD', created_by: opener.by, target_dept: dept,
    subject_ref: { hotel_id: `HTL${String(600 + i).padStart(4, '0')}`, hotel_name: `โรงแรม ${600 + i}`, gap_service: dept, service: dept },
    payload: { readiness_tier: '', chips: [], note: `ข้อมูลสาธิต ticket บริการ ${i + 1}` }, status: 'NEW', created_at: iso(created, 9), revision: 0, audit,
    category_id: CAT[dept][i % CAT[dept].length]! };
  if (s.status === 'NEW') return t;
  const a = ASSIGNEE[dept][i % ASSIGNEE[dept].length]!;
  const accAt = iso(created, 11); const due = addDays(TODAY, s.dueIn ?? 5);
  const cap = addDays(created, 10); const dueDate = due > cap ? cap : due;
  Object.assign(t, { accepted_at: accAt, assigned_to: a.id, assigned_to_label: a.label, assigned_by: a.id, assigned_at: accAt, due_date: dueDate, due_set_at: accAt, due_set_by: a.id });
  audit.push({ at: accAt, by: dept, from_status: 'NEW', to_status: 'IN_PROGRESS', note: `รับงาน · กำหนดเสร็จ ${dueDate}`, actor: a.label });
  let st: L0Status = 'IN_PROGRESS';
  if (s.wait) {
    const to: L0Status = s.status === 'WAITING_CUSTOMER' ? 'WAITING_CUSTOMER' : s.status === 'WAITING_THIRD_PARTY' ? 'WAITING_THIRD_PARTY' : 'WAITING_CUSTOMER';
    audit.push({ at: iso(addDays(TODAY, -s.wait), 10), by: dept, from_status: 'IN_PROGRESS', to_status: to, actor: a.label }); st = to;
    if (to === 'WAITING_CUSTOMER') t.waiting_on = 'CUSTOMER'; else t.waiting_on = WAIT_ON[i % WAIT_ON.length]!;
    if (t.waiting_on === 'OTHER') t.waiting_on_note = 'รอผู้ให้บริการภายนอก';
  }
  if (s.status === 'DONE') { const sd = iso(addDays(TODAY, -(s.solvedAgo ?? 0)), 15); audit.push({ at: sd, by: dept, from_status: st, to_status: 'DONE', actor: a.label }); st = 'DONE'; t.solved_at = sd; }
  t.status = st; t.revision = audit.length - 1;
  return t;
}

/** The 46 DEMO service tickets (40 open + 6 recently solved), added to the shared DEMO ticket list. */
export function slaDemoTickets(): L0Ticket[] {
  const open = OPEN_SPECS.map((s, i) => makeTicket(i, s, deptFor(i)));
  const solved = SOLVED_SPECS.map((s, j) => makeTicket(40 + j, s, (['ORM', 'MARCOM', 'AC', 'BD', 'ORM', 'MARCOM'] as SvcDept[])[j]!));
  return [...open, ...solved];
}
/** Follow-ups on 3 tickets: 2 (3 days ago + yesterday) + 1 (2 days ago) + 1 (today). */
export function slaDemoFollowups(): TicketFollowup[] {
  const f = (tid: string, ago: number, by: string, role: 'AE' | 'PM', note: string): TicketFollowup => { const d = addDays(TODAY, -ago); return { id: `FU-L0-${tid}-${d}`, ticket_store: 'L0', ticket_id: tid, sent_by: by, sent_by_role: role, recipient_kind: 'DEPT_QUEUE_AND_HEAD', recipient_ids: [], note, sent_at: iso(d, 14), sent_date_bkk: d }; };
  return [f('TKT-2026-0400', 3, 'นนท์ (AE)', 'AE', 'ลูกค้าถามความคืบหน้า'), f('TKT-2026-0400', 1, 'PM Alex (PM)', 'PM', 'ช่วยรับงานด่วน'), f('TKT-2026-0415', 2, 'เฟิร์น (AE)', 'AE', 'รอคำตอบ'), f('TKT-2026-0429', 0, 'นนท์ (AE)', 'AE', 'ลูกค้าโทรมาตาม')];
}
/** ~36 months of solved history for medians (deterministic seeded generator; view-only, in memory). */
export function slaDemoHistory(): L0Ticket[] {
  let seed = 20261028; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out: L0Ticket[] = [];
  for (let m = 1; m <= 36; m++) for (const dept of ['ORM', 'MARCOM', 'AC', 'BD'] as SvcDept[]) {
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const age = m * 30 + Math.floor(rnd() * 25); const solve = 1 + Math.floor(rnd() * 14);
      const t = makeTicket(1000 + out.length, { status: 'DONE', age, dueIn: -age + 8, solvedAgo: age - solve }, dept);
      t.ticket_id = `TKT-H-${String(out.length + 1).padStart(4, '0')}`; out.push(t);
    }
  }
  return out;
}
/** Seeds the DEMO follow-ups once per DEMO session (in memory). */
export function ensureSlaDemoFollowups() { if (ticketFollowups.all(true).length === 0) ticketFollowups.save(true, slaDemoFollowups()); }
