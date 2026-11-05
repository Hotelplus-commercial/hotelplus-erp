/* AE Workspace Survey v2 patch — pure rules: channel options (§2), template-2 topics (§5.2), chip order, link expiry, no-score labels. */
import type { LabelChoice, MeetingChannel, MeetingService, MeetingTier, SurveyRecord } from './meeting-survey-types';

export const CHANNEL_LABEL: Record<MeetingChannel, string> = { ONLINE: 'Online Meeting', CALL: 'Call Meeting', EMAIL: 'Email', LINE: 'LINE' };
export const channelOf = (c: MeetingChannel | null | undefined): MeetingChannel => c ?? 'ONLINE';
export const channelLabel = (c: MeetingChannel | null | undefined) => CHANNEL_LABEL[channelOf(c)];

/** §2 options + default per card. Tier A and Marcom: Online only (read-only). */
export function channelOptions(service: MeetingService, tier: MeetingTier): { options: MeetingChannel[]; def: MeetingChannel; readOnly: boolean } {
  if (service === 'MARCOM' || tier === 'A' || tier === '—') return { options: ['ONLINE'], def: 'ONLINE', readOnly: true };
  if (tier === 'B') return { options: ['ONLINE', 'CALL', 'EMAIL', 'LINE'], def: 'CALL', readOnly: false };
  return { options: ['ONLINE', 'EMAIL', 'LINE'], def: 'EMAIL', readOnly: false };
}
export const CHANNEL_HINT = 'นับเข้าโควตาประชุมเฉพาะ Online Meeting · ใช้นัดแทนเมื่อนัด Tier A ไม่ได้';
/** §2 AS7 — survey required only for Online meetings. */
export const surveyRequired = (c: MeetingChannel | null | undefined) => channelOf(c) === 'ONLINE';

/* ---------- §3 / §4 display ---------- */
export const SURVEY_TODO = 'รอทำ Survey';
export const NO_SCORE_TH = 'ลูกค้าไม่ให้คะแนน';
export const LINK_EXPIRED_TAG = 'ลิงก์หมดอายุ';
export const LINK_ANSWERED_TAG = 'ลูกค้าตอบเอง';
export const LINK_ACTION = 'ส่งลิงก์ให้ลูกค้าตอบเอง';
export const LINK_DEAD_MSG = 'ลิงก์นี้หมดอายุหรือถูกใช้แล้ว · กรุณาติดต่อ AE ของคุณ';
export const LINK_UNKNOWN_MSG = 'ไม่พบลิงก์นี้ · กรุณาตรวจสอบลิงก์อีกครั้ง หรือติดต่อ AE ของคุณ';
export const NO_SCORE_CONFIRM = 'บันทึกว่าลูกค้าไม่ให้คะแนนประชุมนี้? ระบบจะติดธงเหลืองที่สัญญานี้';
export const LINK_DAYS = 14;

const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const thShort = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${TH_MON[d.getUTCMonth()]}`; };
export const linkSentTag = (expiresIso: string) => `ส่งลิงก์แล้ว · หมดอายุ ${thShort(expiresIso)}`;
export const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86400000).toISOString();

/** Random, unguessable link token (24 bytes, base64url). */
export function newLinkToken(): string {
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type LinkState = 'NONE' | 'OPEN' | 'ANSWERED' | 'EXPIRED';
export function linkState(s: SurveyRecord | undefined, nowIso: string): LinkState {
  if (!s || !s.link_token) return 'NONE';
  if (s.submitted_at && s.no_score_reason !== 'LINK_EXPIRED') return 'ANSWERED';
  if (s.no_score_reason === 'LINK_EXPIRED' || s.link_closed_at || (s.link_expires_at && s.link_expires_at < nowIso)) return 'EXPIRED';
  return 'OPEN';
}
/** A no-score survey (declined or expired link) — counted as ลูกค้าไม่ให้คะแนน everywhere. */
export const isNoScore = (s: SurveyRecord) => s.no_score_reason === 'CUSTOMER_DECLINED' || s.no_score_reason === 'LINK_EXPIRED';
export const templateVersionOf = (s: Pick<SurveyRecord, 'template_version'> | undefined) => s?.template_version ?? 1;
export const respondentOf = (s: Pick<SurveyRecord, 'respondent'>) => s.respondent ?? 'AE';

/* ---------- §5 Template 2 ---------- */
export const UNSURE_TH = 'ยังบอกไม่ได้';
export type V2Topic = {
  key: string; name: string; script: string; service: 'BOTH' | MeetingService;
  kind: 'pair' | 'score' | 'multi' | 'text';
  good?: string; bad?: string; /** GOOD answer with no catalog label (chip text only). */ goodNoLabel?: boolean; unsure?: boolean;
};
export const V2_TOPICS: V2Topic[] = [
  { key: 'OVERALL', name: 'พึงพอใจรวม', script: 'โดยรวมพอใจกับผลลัพธ์ของบริการเดือนนี้แค่ไหน', service: 'BOTH', kind: 'score', unsure: true },
  { key: 'VALUE', name: 'ความคุ้มค่า', script: 'ค่าบริการคุ้มค่ากับผลที่ได้ไหม', service: 'BOTH', kind: 'pair', good: 'ค่าบริการคุ้มค่า', bad: 'มองไม่เห็นความคุ้มค่า', unsure: true },
  { key: 'REVENUE', name: 'รายได้ / ยอดจอง', script: 'ยอดจอง / รายได้เดือนนี้เป็นไปตามที่คาดไหม', service: 'ORM', kind: 'pair', good: 'รายได้ถึงเป้า', bad: 'รายได้หรือยอดจองไม่ถึงที่คาดหวัง', unsure: true },
  { key: 'OTA_VISIBILITY', name: 'การมองเห็นบน OTA', script: 'โรงแรมถูกมองเห็นบน OTA ดีขึ้นไหม', service: 'ORM', kind: 'pair', good: 'อันดับ OTA ดีขึ้น', bad: 'อันดับบน OTA ไม่ดีขึ้น', unsure: true },
  { key: 'PAGE_ATTENTION', name: 'ความสนใจของเพจ', script: 'เพจของโรงแรมได้รับความสนใจมากขึ้นไหม', service: 'MARCOM', kind: 'pair', good: 'เพจได้รับความสนใจมากขึ้น', bad: 'เพจไม่ได้รับความสนใจเพิ่ม', unsure: true },
  { key: 'CAMPAIGN', name: 'ผลแคมเปญ / โฆษณา', script: 'แคมเปญ / โฆษณาเดือนนี้ได้ผลตามที่คาดไหม', service: 'MARCOM', kind: 'pair', good: 'แคมเปญถึง KPI', bad: 'แคมเปญ Marcom ไม่ถึงเป้า KPI', unsure: true },
  { key: 'CONTENT_IMAGE', name: 'ภาพลักษณ์คอนเทนต์', script: 'คอนเทนต์สะท้อนภาพลักษณ์ของโรงแรมได้ตรงใจไหม', service: 'MARCOM', kind: 'pair', good: 'คอนเทนต์ตรงภาพลักษณ์', bad: 'คอนเทนต์ไม่ตรงภาพลักษณ์', unsure: true },
  { key: 'PROMISE', name: 'เรื่องที่รับปาก', script: 'เดือนนี้มีเรื่องที่ทีมรับปากแล้วยังไม่ได้ทำไหม', service: 'BOTH', kind: 'pair', good: 'ไม่มี', goodNoLabel: true, bad: 'ไม่ทำตามที่รับปาก' },
  { key: 'REPORT', name: 'ความถูกต้องของ Report', script: 'Report และข้อมูลที่ได้รับถูกต้องไหม', service: 'BOTH', kind: 'pair', good: 'ถูกต้อง', goodNoLabel: true, bad: 'Report หรือข้อมูลผิด' },
  { key: 'CONTACT', name: 'การติดต่อผู้ดูแล', script: 'ติดต่อผู้ดูแลได้สะดวกไหม', service: 'BOTH', kind: 'pair', good: 'ผู้ดูแลต่อเนื่อง', bad: 'เปลี่ยนผู้ดูแลบ่อยหรือติดต่อยาก' },
  { key: 'CONCLUSION', name: 'ข้อสรุปการประชุม', script: 'ประชุมวันนี้ได้ข้อสรุปที่ชัดเจนไหม', service: 'BOTH', kind: 'pair', good: 'ได้ข้อสรุป', goodNoLabel: true, bad: 'ประชุมแล้วไม่ได้ข้อสรุป' },
  { key: 'RECOMMEND', name: 'แนะนำต่อ', script: 'จะแนะนำ H+ ให้โรงแรมอื่นไหม', service: 'BOTH', kind: 'score' },
  { key: 'OPPORTUNITY', name: 'โอกาสขยาย', script: 'มีแผนขยายบริการหรือมีโรงแรมในเครือที่สนใจไหม', service: 'BOTH', kind: 'multi' },
  { key: 'COMMENT', name: 'ความเห็นอิสระ', script: 'เดือนหน้าอยากให้เราช่วยเรื่องอะไรเพิ่ม', service: 'BOTH', kind: 'text' },
];
export const OPPORTUNITY_LABELS = ['พร้อมขยายแพ็กเกจ', 'มีโรงแรมในเครือ / เปิดสาขาใหม่'] as const;
export const OPPORTUNITY_NONE = 'ไม่มี';
export const RECOMMEND_LABEL = 'ลูกค้าพร้อมแนะนำต่อ';
export const topicsFor = (service: MeetingService) => V2_TOPICS.filter((t) => t.service === 'BOTH' || t.service === service);

/** Chip order for one form: GOOD / BAD randomised, UNSURE always in the middle. */
export function chipOrder(t: V2Topic, rand: () => number = Math.random): LabelChoice[] {
  const pair: LabelChoice[] = rand() < 0.5 ? ['GOOD', 'BAD'] : ['BAD', 'GOOD'];
  return t.unsure ? [pair[0], 'UNSURE', pair[1]] : pair;
}
export const chipText = (t: V2Topic, c: LabelChoice) => (c === 'UNSURE' ? UNSURE_TH : c === 'GOOD' ? t.good! : t.bad!);
export const labelKeyFor = (t: V2Topic, c: LabelChoice): string | null => (c === 'UNSURE' ? null : c === 'GOOD' ? (t.goodNoLabel ? null : t.good!) : t.bad!);

/** v2 answers held by the form. score: number | 'UNSURE'. */
export type V2Answers = { choices: Record<string, LabelChoice>; overall: number | 'UNSURE' | null; recommend: number | null; opportunity: string[]; comment: string };
export const emptyV2 = (): V2Answers => ({ choices: {}, overall: null, recommend: null, opportunity: [], comment: '' });

export function v2Complete(service: MeetingService, a: V2Answers): boolean {
  if (a.overall === null || a.recommend === null || a.opportunity.length === 0) return false;
  return topicsFor(service).filter((t) => t.kind === 'pair').every((t) => a.choices[t.key] !== undefined);
}
/** §5.1 — every UNSURE-able topic is ยังบอกไม่ได้ and no overall score → saved as CUSTOMER_DECLINED. */
export function v2AllUnsure(service: MeetingService, a: V2Answers): boolean {
  if (a.overall !== 'UNSURE') return false;
  return topicsFor(service).filter((t) => t.kind === 'pair' && t.unsure).every((t) => a.choices[t.key] === 'UNSURE');
}
/** Rows for survey_label_answers (no ids yet). */
export function v2Rows(service: MeetingService, a: V2Answers): { topic_key: string; choice: LabelChoice; label_key: string | null }[] {
  const rows: { topic_key: string; choice: LabelChoice; label_key: string | null }[] = [];
  if (a.overall === 'UNSURE') rows.push({ topic_key: 'OVERALL', choice: 'UNSURE', label_key: null });
  for (const t of topicsFor(service)) if (t.kind === 'pair' && a.choices[t.key]) rows.push({ topic_key: t.key, choice: a.choices[t.key], label_key: labelKeyFor(t, a.choices[t.key]) });
  if (a.recommend !== null && a.recommend >= 9) rows.push({ topic_key: 'RECOMMEND', choice: 'GOOD', label_key: RECOMMEND_LABEL });
  for (const o of a.opportunity) if (o !== OPPORTUNITY_NONE) rows.push({ topic_key: 'OPPORTUNITY', choice: 'GOOD', label_key: o });
  return rows;
}
