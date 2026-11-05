/* Tab "ติดตามงานผู้ให้บริการ" R1 §12 — DEMO additions only (in memory, DEMO on). Never edits existing entries.
 * DEMO today = DEMO_DAY (28 ต.ค. 2569). The 46 file-1 service tickets stay as they are; ⑤ needs upcoming confirmed meetings
 * on hotels that also carry Contract Health rows (card ⑦ DEMO contracts), so this adds:
 *   · 7 meetings (29 ต.ค.–4 พ.ย.): 3 ORM-Snapshot + 2 Marcom-Sync up with open tickets, 2 ready (no ticket)
 *   · 6 open service tickets on the 5 meeting hotels (added to the shared DEMO ticket list).
 * Ages are relative to DEMO_DAY (the §12 render used 31 Oct). */
import { DEMO_DAY } from './demo-session';
import { addDays } from './service-tickets';
import type { L0Ticket } from './tickets-l0';
import type { MeetingRecord } from './meeting-survey-types';

const TODAY = DEMO_DAY.slice(0, 10);
const iso = (d: string, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00+07:00`;

export type StabDemoMeeting = MeetingRecord & { caretaker_team?: string | null; caretaker_person?: string | null };
const mt = (id: string, hotel_id: string, hotel: string, service: 'ORM' | 'MARCOM', inDays: number, ae: string, care: string): StabDemoMeeting => ({
  id: `STAB-MT-${id}`, hotel, hotel_id, service, tier: 'A', tier_at_booking: 'A', ae, ae_display: ae, date: addDays(TODAY, inDays), status: 'Confirmed', channel: 'ONLINE', origin: 'calendar', created_at: iso(addDays(TODAY, -10)),
  ...(service === 'ORM' ? { caretaker_team: care } : { caretaker_person: care }),
} as StabDemoMeeting);

export function stabDemoMeetings(): StabDemoMeeting[] {
  return [
    mt('1', 'R2-ภูผา บูทีค', 'ภูผา บูทีค', 'ORM', 1, 'นนท์', 'Team A (เตย, นิด)'),
    mt('2', 'R2-เดอะ ซีวิว หัวหิน', 'เดอะ ซีวิว หัวหิน', 'MARCOM', 3, 'แบม', 'มายด์'),
    mt('3', 'R2-ลานนา เฮอริเทจ', 'ลานนา เฮอริเทจ', 'ORM', 5, 'ปลา', 'Team B (ก้อย)'),
    mt('4', 'R2-นาคา ฮิลล์', 'นาคา ฮิลล์', 'MARCOM', 6, 'นนท์', 'ฟ้า'),
    mt('5', 'R1-Riverside Lodge', 'ริเวอร์ไซด์ ลอดจ์', 'ORM', 7, 'แบม', 'Team C (ต้น)'),
    mt('6', 'STAB-LANTA-SANDS', 'Lanta Sands', 'ORM', 2, 'ปลา', 'Team A (เตย, นิด)'),
    mt('7', 'STAB-SAMUI-PALM', 'Samui Palm', 'MARCOM', 4, 'นนท์', 'มายด์'),
  ];
}

type Spec = { n: number; hotel_id: string; hotel: string; dept: 'ORM' | 'MARCOM'; cat: string; age: number; status: 'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER'; dueIn?: number; who?: { id: string; label: string }; note: string };
const SPECS: Spec[] = [
  { n: 1, hotel_id: 'R2-ภูผา บูทีค', hotel: 'ภูผา บูทีค', dept: 'ORM', cat: 'rate:ORM', age: 2, status: 'NEW', note: 'ราคาบน Agoda ไม่ตรงกับเว็บโรงแรม' },
  { n: 2, hotel_id: 'R2-ภูผา บูทีค', hotel: 'ภูผา บูทีค', dept: 'ORM', cat: 'report:ORM', age: 11, status: 'IN_PROGRESS', dueIn: -1, who: { id: 'orm-toey', label: 'เตย (ORM-A)' }, note: 'รายงานรีวิวเดือน ก.ย. ตัวเลขไม่ครบ' },
  { n: 3, hotel_id: 'R2-เดอะ ซีวิว หัวหิน', hotel: 'เดอะ ซีวิว หัวหิน', dept: 'MARCOM', cat: 'content:MARCOM', age: 4, status: 'IN_PROGRESS', dueIn: 2, who: { id: 'mk-biw', label: 'บิว (Marcom)' }, note: 'แก้คอนเทนต์โปรโมชันปลายปี' },
  { n: 4, hotel_id: 'R2-ลานนา เฮอริเทจ', hotel: 'ลานนา เฮอริเทจ', dept: 'ORM', cat: 'ota:ORM', age: 3, status: 'IN_PROGRESS', dueIn: 3, who: { id: 'orm-ton', label: 'ต้น (ORM-B)' }, note: 'ปิดห้องบน Booking ไม่ได้' },
  { n: 5, hotel_id: 'R2-นาคา ฮิลล์', hotel: 'นาคา ฮิลล์', dept: 'MARCOM', cat: 'ads:MARCOM', age: 1, status: 'NEW', note: 'ขอปรับงบโฆษณา พ.ย.' },
  { n: 6, hotel_id: 'R1-Riverside Lodge', hotel: 'ริเวอร์ไซด์ ลอดจ์', dept: 'ORM', cat: 'sys3p:ORM', age: 5, status: 'WAITING_CUSTOMER', dueIn: 4, who: { id: 'orm-mint', label: 'มิ้นท์ (ORM-C)' }, note: 'รอลูกค้าส่งรหัส Channel Manager' },
];

/** 6 open DEMO service tickets on the ⑤ meeting hotels (ids TKT-2026-05xx, outside the file-1 range). */
export function stabDemoTickets(): L0Ticket[] {
  return SPECS.map((s) => {
    const created = addDays(TODAY, -s.age); const id = `TKT-2026-05${String(s.n).padStart(2, '0')}`;
    const audit: L0Ticket['audit'] = [{ at: iso(created, 9), by: 'PS', from_status: null, to_status: 'NEW', actor: 'นนท์' }];
    const t: L0Ticket = { ticket_id: id, type: 'HANDOVER_FIX', source_app: 'PS_DASHBOARD', created_by: 'PS', target_dept: s.dept,
      subject_ref: { hotel_id: s.hotel_id, hotel_name: s.hotel, gap_service: s.dept, service: s.dept },
      payload: { readiness_tier: '', chips: [], note: s.note }, status: 'NEW', created_at: iso(created, 9), revision: 0, audit, category_id: s.cat } as L0Ticket;
    if (s.status === 'NEW' || !s.who) return t;
    const accAt = iso(created, 11); const due = addDays(TODAY, s.dueIn ?? 5);
    Object.assign(t, { accepted_at: accAt, assigned_to: s.who.id, assigned_to_label: s.who.label, assigned_by: s.who.id, assigned_at: accAt, due_date: due, due_set_at: accAt, due_set_by: s.who.id });
    audit.push({ at: accAt, by: s.dept, from_status: 'NEW', to_status: 'IN_PROGRESS', note: `รับงาน · กำหนดเสร็จ ${due}`, actor: s.who.label });
    if (s.status === 'WAITING_CUSTOMER') { audit.push({ at: iso(addDays(TODAY, -1), 10), by: s.dept, from_status: 'IN_PROGRESS', to_status: 'WAITING_CUSTOMER', actor: s.who.label }); t.status = 'WAITING_CUSTOMER'; t.waiting_on = 'CUSTOMER'; }
    else t.status = 'IN_PROGRESS';
    t.revision = audit.length - 1;
    return t;
  });
}
