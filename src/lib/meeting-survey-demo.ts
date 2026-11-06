/* AE Workspace Survey v2 patch §7 — DEMO entries only (in memory; never written to meridia.meetings.v1 / surveys.v1 / survey_label_answers.v1).
 * DEMO date = DEMO_DAY (28 ต.ค. 2569). All dates are October 2026 except the open link (expires in 10 days). */
import type { MeetingRecord, MeetingSurveyData, SurveyLabelAnswer, SurveyRecord } from './meeting-survey-types';
import { topicsFor, OPPORTUNITY_LABELS } from './survey-v2';

const AE = 'AE001-Nont';
const AE_NAME = 'Nont Wilson';
const at = (day: number, h = 10) => `2026-10-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000Z`;
const dt = (day: number) => `2026-10-${String(day).padStart(2, '0')}`;

function mtg(code: string, service: 'ORM' | 'MARCOM', tier: 'A' | 'B' | 'C' | '—', day: number, channel: NonNullable<MeetingRecord['channel']>, status = 'Completed'): MeetingRecord {
  return { id: `DM-${code}`, hotel: `โรงแรม ${code}`, hotel_id: `HTL${code.padStart(4, '0')}`, service, tier, tier_at_booking: tier, ae: AE, ae_display: AE_NAME, contact: 'คุณลูกค้า', contact_email: `gm${code}@example.com`, date: dt(day), status, channel, origin: 'demo', created_at: at(day - 3) };
}

export function meetingSurveyDemoData(): MeetingSurveyData {
  const meetings: MeetingRecord[] = [];
  const surveys: SurveyRecord[] = [];
  const answers: SurveyLabelAnswer[] = [];
  let seq = 0;

  /* Meetings waiting for a survey (UAT): Tier B Online 208 · 219 · Tier C Online 305 · open link ORM 205. */
  meetings.push(mtg('208', 'ORM', 'B', 22, 'ONLINE'), mtg('219', 'ORM', 'B', 24, 'ONLINE'), mtg('305', 'ORM', 'C', 26, 'ONLINE'), mtg('236', 'ORM', 'B', 20, 'ONLINE'));
  /* 3 Tier B Call + 4 Tier C Email contacts — no survey needed, not counted. */
  ['241', '252', '263'].forEach((c, i) => meetings.push(mtg(c, 'ORM', 'B', 10 + i, 'CALL')));
  ['311', '322', '333', '344'].forEach((c, i) => meetings.push(mtg(c, 'ORM', 'C', 13 + i, 'EMAIL')));

  const add = (code: string, service: 'ORM' | 'MARCOM', tier: 'A' | 'B' | 'C' | '—', day: number, opts: Partial<SurveyRecord> & { answered?: boolean }) => {
    const m = mtg(code, service, tier, day, 'ONLINE'); meetings.push(m);
    const s: SurveyRecord = {
      id: `DS-${code}`, meeting_id: m.id, hotel: m.hotel, service, tier, meeting_date: m.date, submitted_at: at(day, 12), scores: {}, overall: null, free_comment: null,
      customer_response_status: null, flags: 0, no_score_reason: null, respondent: 'AE', template_version: 2, ae_display: AE_NAME, ...opts,
    };
    surveys.push(s);
    if (opts.answered) {
      const n = Number(code.replace(/\D/g, '')) || 1;
      s.overall = 6 + (n % 5); s.scores = { RECOMMEND: 5 + (n % 6) }; s.customer_response_status = s.respondent === 'CUSTOMER_LINK' ? 'Confirmed' : n % 3 === 0 ? 'Waiting Customer' : 'Confirmed';
      for (const t of topicsFor(service)) {
        if (t.kind !== 'pair') continue;
        const choice = (n + t.key.length) % 7 === 0 ? 'BAD' : (n + t.key.length) % 5 === 0 && t.unsure ? 'UNSURE' : 'GOOD';
        answers.push({ id: `DA-${++seq}`, survey_id: s.id, topic_key: t.key, choice, label_key: choice === 'UNSURE' ? null : choice === 'GOOD' ? (t.goodNoLabel ? null : t.good!) : t.bad!, created_at: s.submitted_at! });
      }
      if ((s.scores['RECOMMEND'] ?? 0) >= 9) answers.push({ id: `DA-${++seq}`, survey_id: s.id, topic_key: 'RECOMMEND', choice: 'GOOD', label_key: 'ลูกค้าพร้อมแนะนำต่อ', created_at: s.submitted_at! });
      if (n % 4 === 0) answers.push({ id: `DA-${++seq}`, survey_id: s.id, topic_key: 'OPPORTUNITY', choice: 'GOOD', label_key: OPPORTUNITY_LABELS[n % 2] ?? null, created_at: s.submitted_at! });
    }
  };

  /* Template 2 · ORM 13 answered (2 by customer link) + 1 no-score (214). */
  for (let i = 0; i < 13; i++) add(String(401 + i), 'ORM', (['A', 'B', 'C'] as const)[i % 3] ?? 'A', 2 + i, { answered: true, ...(i < 2 ? { respondent: 'CUSTOMER_LINK', link_token: `demo-link-orm-${i}`, link_expires_at: at(16 + i), link_closed_at: at(2 + i, 12) } : {}) });
  add('214', 'ORM', 'B', 15, { no_score_reason: 'CUSTOMER_DECLINED' });
  /* Template 2 · Marcom 30 answered (5 by customer link) + 4 no-score (0331 · 0298 · 0177 declined, 0420 expired link). */
  for (let i = 0; i < 30; i++) add(`0${501 + i}`, 'MARCOM', '—', 1 + (i % 27), { answered: true, ...(i < 5 ? { respondent: 'CUSTOMER_LINK', link_token: `demo-link-mc-${i}`, link_expires_at: at(15 + i), link_closed_at: at(1 + i, 12) } : {}) });
  ['0331', '0298', '0177'].forEach((c, i) => add(c, 'MARCOM', '—', 5 + i, { no_score_reason: 'CUSTOMER_DECLINED' }));
  /* Header R3 follow-up (a): DEMO sample free comments (2 per service, one positive · one constructive) — text only, no count changes. */
  const SAMPLE_COMMENTS: Record<string, string> = {
    'DS-403': '(ตัวอย่าง DEMO) ทีมตอบรีวิวเร็วและสุภาพมาก คะแนนรีวิวดีขึ้นชัดเจน',
    'DS-406': '(ตัวอย่าง DEMO) อยากให้ส่งสรุปรายงานก่อนประชุมอย่างน้อย 1 วัน จะได้เตรียมคำถามได้',
    'DS-0507': '(ตัวอย่าง DEMO) คอนเทนต์เดือนนี้สวย ตรงกลุ่มลูกค้า ยอดเข้าถึงเพิ่มขึ้น',
    'DS-0510': '(ตัวอย่าง DEMO) อยากให้แจ้งแผนโพสต์ล่วงหน้า 1 สัปดาห์ เพื่อให้ทีมโรงแรมตรวจรูปทัน',
  };
  for (const s of surveys) if (SAMPLE_COMMENTS[s.id]) s.free_comment = SAMPLE_COMMENTS[s.id]!;
  add('0420', 'MARCOM', '—', 3, { respondent: 'CUSTOMER_LINK', link_token: 'demo-link-0420', link_expires_at: at(17), link_closed_at: at(18), submitted_at: null, no_score_reason: 'LINK_EXPIRED' });

  /* Open link: ORM 205, sent 25 ต.ค., expires in 10 days (7 พ.ย.). */
  const m205 = mtg('205', 'ORM', 'B', 25, 'ONLINE'); meetings.push(m205);
  surveys.push({ id: 'DS-205', meeting_id: m205.id, hotel: m205.hotel, service: 'ORM', tier: 'B', meeting_date: m205.date, submitted_at: null, scores: {}, overall: null, free_comment: null, customer_response_status: null, flags: 0, no_score_reason: null, respondent: 'CUSTOMER_LINK', template_version: 1, link_token: 'demo-link-205-open', link_expires_at: '2026-11-07T10:00:00.000Z', link_closed_at: null, ae_display: AE_NAME });

  return { meetings, surveys, answers };
}
