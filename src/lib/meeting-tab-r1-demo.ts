/* PS Dashboard · Meeting & Survey tab R1 §11 — DEMO additions only (in memory, read only by this tab while DEMO is on;
 * never written to meridia.meetings.v1 / surveys.v1, never fed into the survey-flag DEMO or Contract Health).
 * The existing Survey v2 / Contract Health DEMO (ต.ค. 2569, set 2) is untouched and still supplies the October surveys.
 * Additions: October quota / booking / no-show rows · September set-1 sample (card ⑤ set 1 + Δ baseline) · silent-streak history. */
import type { MeetingRecord, MeetingSurveyData, SurveyRecord } from './meeting-survey-types';

type Svc = 'ORM' | 'MARCOM';
const ORM_TEAMS = ['A', 'B', 'C', 'D', 'E', 'Re-active'];
const MC_PEOPLE = ['แนน', 'บิว', 'โบว์', 'เจน'];
const AES = ['บอส', 'เฟิร์น', 'มิ้นท์', 'ปอ'];
const hid = (code: string) => `HTL${code.padStart(4, '0')}`;

/** Caretaker (role slot) for the EXISTING October DEMO hotels — DEMO roster only. Key `${service}:${hotel_id}`. */
export const DEMO_CARETAKER: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const orm = ['208', '219', '305', '236', '214', '205', ...Array.from({ length: 13 }, (_, i) => String(401 + i))];
  orm.forEach((c, i) => { out[`ORM:${hid(c)}`] = ORM_TEAMS[i % ORM_TEAMS.length]!; });
  const mc = [...Array.from({ length: 30 }, (_, i) => `0${501 + i}`), '0331', '0298', '0177', '0420'];
  mc.forEach((c, i) => { out[`MARCOM:${hid(c)}`] = MC_PEOPLE[i % MC_PEOPLE.length]!; });
  return out;
})();

let n = 0;
function row(code: string, service: Svc, tier: MeetingRecord['tier'], date: string | null, status: string, who: string, cardMonth: string, ae: string): MeetingRecord {
  n++;
  return {
    id: `MT1-${service}-${code}-${cardMonth}`, hotel: `โรงแรม ${code}`, hotel_id: hid(code), service, tier, tier_at_booking: tier, ae, ae_display: ae,
    date: date ?? '', status, channel: 'ONLINE', origin: 'demo', created_at: `${cardMonth}-01T0${n % 9}:00:00.000Z`, card_month: cardMonth,
    ...(service === 'ORM' ? { caretaker_team: who } : { caretaker_person: who }),
  };
}

/** Score list of n values with exactly (low, mid, sat) counts; sat values keep median 8. */
function scores(nn: number, low: number, mid: number, offset: number): number[] {
  const sat = nn - low - mid;
  const vals = [...Array.from({ length: low }, (_, i) => (i % 2 ? 5 : 6)), ...Array(mid).fill(7), ...Array.from({ length: sat }, (_, i) => (i < Math.ceil(sat * 0.6) ? 8 : i % 2 ? 9 : 10))];
  return vals.map((_, i) => vals[(i + offset) % nn]!);
}

let cache: MeetingSurveyData | null = null;
export function meetingTabDemoAdditions(): MeetingSurveyData {
  if (cache) return cache;
  n = 0;
  const meetings: MeetingRecord[] = []; const surveys: SurveyRecord[] = [];
  const OCT = '2026-10', SEP = '2026-09', AUG = '2026-08';

  /* ---- October ORM: Tier A cards → quota 17 (+2 เลื่อนไปเดือนหน้า) ---- */
  for (let i = 0; i < 8; i++) meetings.push(row(String(151 + i), 'ORM', 'A', `2026-10-${String(5 + i * 2).padStart(2, '0')}`, 'Completed', ['B', 'B', 'C', 'C', 'E', 'E', 'Re-active', 'Re-active'][i]!, OCT, AES[i % 4]!)); // ③ team quotas A4 · B3 · C3 · D3 · E2 · Re-active 2
  meetings.push(row('176', 'ORM', 'A', '2026-10-27', 'Confirmed', 'D', OCT, 'บอส')); // เลยวันนัด ยังไม่อัปเดต
  meetings.push(row('112', 'ORM', 'A', null, 'NOT_BOOKED', 'A', OCT, 'มิ้นท์'), row('147', 'ORM', 'A', null, 'NOT_BOOKED', 'B', OCT, 'เฟิร์น'), row('133', 'ORM', 'A', null, 'REJECTED', 'C', OCT, 'ปอ'));
  meetings.push(row('161', 'ORM', 'A', null, 'POSTPONED_NEXT_MONTH', 'E', OCT, 'บอส'), row('162', 'ORM', 'A', null, 'POSTPONED_NEXT_MONTH', 'Re-active', OCT, 'ปอ'));
  meetings.push(row('128', 'ORM', 'B', '2026-10-21', 'No Show', 'C', OCT, 'มิ้นท์')); // ไม่มา (Tier B)

  /* ---- October Marcom: quota 42 (+1 เลื่อนไปเดือนหน้า) · booked 39 · completed 36 ---- */
  meetings.push(row('0350', 'MARCOM', '—', '2026-10-23', 'Completed', 'แนน', OCT, 'บอส'), row('0366', 'MARCOM', '—', '2026-10-24', 'Completed', 'บิว', OCT, 'เฟิร์น'));
  meetings.push(row('0351', 'MARCOM', '—', '2026-10-20', 'Confirmed', 'โบว์', OCT, 'มิ้นท์'), row('0377', 'MARCOM', '—', '2026-10-22', 'Confirmed', 'เจน', OCT, 'ปอ'));
  meetings.push(row('0219', 'MARCOM', '—', '2026-10-16', 'No Show', 'โบว์', OCT, 'บอส'));
  meetings.push(row('0412', 'MARCOM', '—', null, 'NOT_BOOKED', 'แนน', OCT, 'เฟิร์น'), row('0388', 'MARCOM', '—', null, 'NOT_BOOKED', 'บิว', OCT, 'มิ้นท์'), row('0290', 'MARCOM', '—', null, 'REJECTED', 'เจน', OCT, 'ปอ'));
  meetings.push(row('0399', 'MARCOM', '—', null, 'POSTPONED_NEXT_MONTH', 'แนน', OCT, 'บอส'));

  /* ---- September set-1 sample (card ⑤ ชุดที่ 1 + header Δ baseline) ---- */
  const set1 = (svc: Svc, count: number, counts: [number, number][], prefix: number) => {
    const topics = svc === 'ORM' ? ['OVERALL', 'Q1', 'Q2', 'Q3'] : ['OVERALL', 'Q4', 'Q5', 'Q6'];
    const lists = topics.map((_, t) => scores(count, counts[t]![0], counts[t]![1], t * 3));
    for (let i = 0; i < count; i++) {
      const code = svc === 'ORM' ? String(prefix + i) : `0${prefix + i}`;
      const m = row(code, svc, svc === 'ORM' ? 'A' : '—', `2026-09-${String(2 + (i % 26)).padStart(2, '0')}`, 'Completed', svc === 'ORM' ? ORM_TEAMS[i % 6]! : MC_PEOPLE[i % 4]!, SEP, AES[i % 4]!);
      meetings.push(m);
      const sc: Record<string, number> = {}; topics.forEach((t, k) => { if (t !== 'OVERALL') sc[t] = lists[k]![i]!; });
      surveys.push({
        id: `MT1S-${svc}-${code}`, meeting_id: m.id, hotel: m.hotel, service: svc, tier: m.tier, meeting_date: m.date, submitted_at: `${m.date}T12:00:00.000Z`,
        scores: sc, overall: lists[0]![i]!, free_comment: i === 1 ? 'อยากให้สรุปตัวเลขสั้นลง ส่งก่อนประชุม 1 วัน' : i === 4 ? 'ทีมตอบเร็ว ชอบคำแนะนำเรื่องรีวิว' : null,
        customer_response_status: i === 3 ? 'Flagged' : 'Confirmed', flags: 0, no_score_reason: null, respondent: 'AE', template_version: 1, ae_display: m.ae_display ?? null,
      });
    }
  };
  set1('ORM', 13, [[2, 3], [1, 3], [3, 3], [2, 4]], 601);
  set1('MARCOM', 30, [[5, 5], [5, 6], [8, 7], [4, 6]], 701);

  /* ---- silent-streak history (completed, no score): 214 ×2 · 0331 ×2 · 0298 ×1 ---- */
  meetings.push(row('214', 'ORM', 'B', '2026-09-15', 'Completed', DEMO_CARETAKER[`ORM:${hid('214')}`]!, SEP, 'บอส'), row('214', 'ORM', 'B', '2026-08-15', 'Completed', DEMO_CARETAKER[`ORM:${hid('214')}`]!, AUG, 'บอส'));
  meetings.push(row('0331', 'MARCOM', '—', '2026-09-05', 'Completed', DEMO_CARETAKER[`MARCOM:${hid('0331')}`]!, SEP, 'เฟิร์น'), row('0331', 'MARCOM', '—', '2026-08-05', 'Completed', DEMO_CARETAKER[`MARCOM:${hid('0331')}`]!, AUG, 'เฟิร์น'));
  meetings.push(row('0298', 'MARCOM', '—', '2026-09-06', 'Completed', DEMO_CARETAKER[`MARCOM:${hid('0298')}`]!, SEP, 'มิ้นท์'));

  cache = { meetings, surveys, answers: [] };
  return cache;
}

/** ⑥ Meeting Analyzer DEMO sample (placeholder engine; DEMO only). */
export const ANALYZER_DEMO = {
  analysed: 52, avgMin: 34, customerTalkPct: 38, requests: 41, requestTickets: 38, promises: 33, promisesLate: 3,
  rows: [
    { hotel: 'โรงแรม 401', service: 'ORM', min: 38, talk: '42 / 58', req: 'ขอรายงานรีวิวรายสัปดาห์', promise: 'ส่งสรุปภายในศุกร์', ticket: 'สร้างแล้ว' },
    { hotel: 'โรงแรม 404', service: 'ORM', min: 31, talk: '35 / 65', req: 'ปรับราคาช่วงไฮซีซั่น', promise: 'เสนอราคาใหม่ 2 แบบ', ticket: 'สร้างแล้ว' },
    { hotel: 'โรงแรม 0503', service: 'Marcom', min: 29, talk: '40 / 60', req: 'เพิ่มโพสต์วิดีโอสั้น', promise: 'ร่างแผนคอนเทนต์ใหม่', ticket: 'สร้างแล้ว' },
    { hotel: 'โรงแรม 0507', service: 'Marcom', min: 36, talk: '33 / 67', req: 'สรุปผลโฆษณารายแคมเปญ', promise: 'ส่งรายงานโฆษณา', ticket: 'เลยกำหนด' },
    { hotel: 'โรงแรม 410', service: 'ORM', min: 40, talk: '38 / 62', req: 'อธิบายคะแนนการมองเห็น', promise: 'นัดคุยต่อสัปดาห์หน้า', ticket: 'สร้างแล้ว' },
  ],
};
