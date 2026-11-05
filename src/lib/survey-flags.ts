/* Contract Health · Survey signals patch — pure rules (no React, no storage).
 * §1 survey flag rules CH1–CH6 (SURVEY_LOW_SCORE · SURVEY_NO_SCORE · SURVEY_SILENT_2M · MEETING_REJECTED),
 * score bands CH2, auto-close CH5, label text → catalog key (labelKeyFromText) and the S-source signals
 * one contract gets from its latest answered survey + open flags (CH10–CH16). */
import type { MeetingRecord, MeetingService, MeetingSurveyData, SurveyFlag, SurveyFlagRule, SurveyLabelAnswer, SurveyRecord } from './meeting-survey-types';
import { V2_TOPICS, isNoScore } from './survey-v2';
import { SIGNAL_CATALOG, SIGNAL_GROUPS, type SurveySignal, type Svc } from './contract-tab-r1';

/* ---------- CH2 score bands ---------- */
export type ScoreBand = 'LOW' | 'MID' | 'OK';
export const scoreBand = (n: number): ScoreBand => (n <= 6 ? 'LOW' : n === 7 ? 'MID' : 'OK');
export const SCORE_BAND_TH: Record<ScoreBand, string> = { LOW: 'ต่ำ', MID: 'กลาง', OK: 'พอใจ' };

/* ---------- CH1 display names / severity ---------- */
export const FLAG_RULE_TH: Record<SurveyFlagRule, string> = {
  SURVEY_LOW_SCORE: 'คะแนนเซอร์เวย์ต่ำ', SURVEY_NO_SCORE: 'ลูกค้าไม่ให้คะแนน', SURVEY_SILENT_2M: 'เงียบ ≥2 เดือน', MEETING_REJECTED: 'ปฏิเสธนัด',
};
export const FLAG_SEVERITY: Record<SurveyFlagRule, 'red' | 'yellow'> = { SURVEY_LOW_SCORE: 'red', SURVEY_NO_SCORE: 'yellow', SURVEY_SILENT_2M: 'red', MEETING_REJECTED: 'red' };
/** Template 1 topic names (scored questions only; referral is hidden, free comment has no score). */
export const V1_TOPIC_NAMES: Record<string, string> = {
  Q1: 'เนื้อหาการประชุม', Q2: 'เวลาการประชุม', Q3: 'คำแนะนำและการแก้ปัญหา', Q4: 'คอนเทนต์ / content plan', Q5: 'ผลโฆษณา', Q6: 'การสื่อสารและข้อแนะนำ', Q7: 'พึงพอใจรวม',
};
const topicByKey = new Map(V2_TOPICS.map((t) => [t.key, t]));

/* ---------- helpers ---------- */
const ISO = /^\d{4}-\d{2}/;
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** `dd MMM yy` in Thai (Buddhist year, 2 digits) — e.g. 28 ต.ค. 69. */
export function thDateShort(iso: string): string { const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso); return `${d.getUTCDate()} ${TH_MON[d.getUTCMonth()]} ${String((d.getUTCFullYear() + 543) % 100).padStart(2, '0')}`; }
export const prevMonth = (ym: string) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); };
/** A survey with a score (not no-score, submitted, overall or any score present). */
export const isScored = (s: SurveyRecord) => !!s.submitted_at && !isNoScore(s) && (s.overall != null || Object.keys(s.scores ?? {}).length > 0);
/** Card month of a survey: meeting date when ISO, else submitted date, else meeting_date text. */
export function cardMonthOf(s: SurveyRecord, m: MeetingRecord | undefined, now: string): string {
  for (const v of [m?.date, s.meeting_date, s.submitted_at, s.link_closed_at]) if (v && ISO.test(v)) return v.slice(0, 7);
  return now.slice(0, 7);
}

/* ---------- CH1 triggers ---------- */
/** Topic names that make a survey SURVEY_LOW_SCORE (empty = no trigger). v1: any topic ≤ 6 · v2: overall ≤ 6 or any BAD label. */
export function lowScoreTriggers(s: SurveyRecord, answers: SurveyLabelAnswer[]): string[] {
  if (!isScored(s)) return [];
  if ((s.template_version ?? 1) === 1) return Object.entries(s.scores ?? {}).filter(([k, n]) => V1_TOPIC_NAMES[k] && n <= 6).map(([k]) => V1_TOPIC_NAMES[k]!);
  const out: string[] = [];
  if (s.overall != null && s.overall <= 6) out.push(topicByKey.get('OVERALL')!.name);
  for (const a of answers) if (a.survey_id === s.id && a.choice === 'BAD') { const t = topicByKey.get(a.topic_key); if (t && t.kind === 'pair') out.push(`${t.name} · ${t.bad}`); }
  return out;
}

export type FlagRef = { hotel_id: string | null; hotel: string; service: MeetingService; contract_id: string | null };
const refId = (r: Pick<FlagRef, 'contract_id' | 'hotel_id' | 'hotel'>) => r.contract_id ?? r.hotel_id ?? r.hotel;
/** Dedupe key: contract × service × card month × rule. */
export const flagKey = (f: Pick<SurveyFlag, 'contract_id' | 'hotel_id' | 'hotel' | 'service' | 'card_month' | 'rule'>) => `${refId({ contract_id: f.contract_id ?? null, hotel_id: f.hotel_id, hotel: f.hotel })}|${f.service}|${f.card_month}|${f.rule}`;
export const sameRef = (f: SurveyFlag, r: FlagRef) => f.service === r.service && refId({ contract_id: f.contract_id ?? null, hotel_id: f.hotel_id, hotel: f.hotel }) === refId(r);
export function makeFlag(rule: SurveyFlagRule, ref: FlagRef, month: string, topics: string[], at: string, meetingId: string | null, surveyId: string | null): SurveyFlag {
  const f: SurveyFlag = { id: '', rule, severity: FLAG_SEVERITY[rule], rule_version: 2, hotel_id: ref.hotel_id, hotel: ref.hotel, service: ref.service, contract_id: ref.contract_id, card_month: month, topics, meeting_id: meetingId, survey_id: surveyId, status: 'OPEN', created_at: at, closed_at: null, closed_by_survey: null, coaching_eligible: true };
  f.id = `SF:${flagKey(f)}`;
  return f;
}

/** CH1 + CH5 for one new / changed survey: returns new flag rows and closed copies of open ones (never edits old-rule flags). */
export function flagDeltaForSurvey(s: SurveyRecord, answers: SurveyLabelAnswer[], m: MeetingRecord | undefined, existing: SurveyFlag[], now: string, contractOf?: (hotelId: string | null) => string | null): SurveyFlag[] {
  const hotel_id = m?.hotel_id ?? null;
  const ref: FlagRef = { hotel_id, hotel: s.hotel, service: s.service, contract_id: contractOf?.(hotel_id) ?? null };
  const month = cardMonthOf(s, m, now);
  const have = new Set(existing.map(flagKey));
  const open = existing.filter((f) => f.status === 'OPEN' && sameRef(f, ref));
  const out: SurveyFlag[] = [];
  const add = (f: SurveyFlag) => { if (!have.has(flagKey(f))) { have.add(flagKey(f)); out.push(f); } };
  const close = (f: SurveyFlag) => out.push({ ...f, status: 'CLOSED', closed_at: now, closed_by_survey: s.id });
  if (isNoScore(s)) {
    add(makeFlag('SURVEY_NO_SCORE', ref, month, [s.no_score_reason === 'LINK_EXPIRED' ? 'ลิงก์หมดอายุ' : 'ลูกค้าไม่ให้คะแนน'], now, s.meeting_id, s.id));
  } else if (isScored(s)) {
    const trig = lowScoreTriggers(s, answers);
    for (const f of open) if (f.rule === 'SURVEY_NO_SCORE' || f.rule === 'SURVEY_SILENT_2M' || (f.rule === 'SURVEY_LOW_SCORE' && trig.length === 0)) close(f);
    if (trig.length) add(makeFlag('SURVEY_LOW_SCORE', ref, month, trig, now, s.meeting_id, s.id));
  }
  return out;
}

/** CH3 — month close: per contract + service, completed meetings in each of the 2 last card months and no scored survey in either → SURVEY_SILENT_2M (card month = the month that just closed). */
export function silentFlags(data: MeetingSurveyData, closedMonth: string, existing: SurveyFlag[], now: string, opts: { origins: string[]; contractOf?: ((hotelId: string | null) => string | null) | undefined }): SurveyFlag[] {
  const months = [prevMonth(closedMonth), closedMonth];
  const have = new Set(existing.map(flagKey));
  const groups = new Map<string, MeetingRecord[]>();
  for (const m of data.meetings) {
    if (!opts.origins.includes(m.origin) || m.status !== 'Completed' || !ISO.test(m.date) || !months.includes(m.date.slice(0, 7))) continue;
    const k = `${opts.contractOf?.(m.hotel_id ?? null) ?? m.hotel_id ?? m.hotel}|${m.service}`;
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  const out: SurveyFlag[] = [];
  for (const list of groups.values()) {
    const scoredIn = (mon: string) => list.some((m) => m.date.startsWith(mon) && data.surveys.some((s) => s.meeting_id === m.id && isScored(s)));
    if (!months.every((mon) => list.some((m) => m.date.startsWith(mon)) && !scoredIn(mon))) continue;
    const m0 = list[list.length - 1]!;
    const f = makeFlag('SURVEY_SILENT_2M', { hotel_id: m0.hotel_id ?? null, hotel: m0.hotel, service: m0.service, contract_id: opts.contractOf?.(m0.hotel_id ?? null) ?? null }, closedMonth, ['ไม่มีคะแนนเซอร์เวย์ 2 เดือนติด'], now, m0.id, null);
    if (!have.has(flagKey(f))) { have.add(flagKey(f)); out.push(f); }
  }
  return out;
}

/* ---------- label text → catalog key ---------- */
/** Topic overrides where the stored text is not the catalog text of the intended label (VALUE GOOD text = PRICE_WORTH text). */
const TOPIC_KEY: Record<string, Partial<Record<'GOOD' | 'BAD', string>>> = { VALUE: { GOOD: 'VALUE_SEEN', BAD: 'VALUE_UNSEEN' } };
const byLabel = new Map(SIGNAL_CATALOG.map((e) => [e.label, e.key]));
/** Maps the stored label TEXT (survey_label_answers.label_key) to a catalog key. Unknown text → null (reported, never guessed). */
export function labelKeyFromText(text: string | null, topicKey?: string, choice?: 'GOOD' | 'UNSURE' | 'BAD'): string | null {
  if (!text) return null;
  if (topicKey && (choice === 'GOOD' || choice === 'BAD')) { const o = TOPIC_KEY[topicKey]?.[choice]; if (o) return o; }
  if (byLabel.has(text)) return byLabel.get(text)!;
  return catalogKeys.has(text) ? text : null;
}
const catalogKeys = new Set(SIGNAL_CATALOG.map((e) => e.key));
export const unmappedLabelTexts = (answers: SurveyLabelAnswer[]) => [...new Set(answers.filter((a) => a.label_key && a.topic_key !== 'REVENUE' && !labelKeyFromText(a.label_key, a.topic_key, a.choice)).map((a) => a.label_key!))];

/* ---------- S signals for one contract (CH10–CH16) ---------- */
export type ContractRef = { contract_id: string; hotel_id: string; service: Svc };
const svcOf = (s: Svc): MeetingService => (s === 'Marcom' ? 'MARCOM' : 'ORM');
export function surveySignalsFor(ref: ContractRef, data: MeetingSurveyData, flags: SurveyFlag[], contractOf?: (hotelId: string | null) => string | null): { signals: SurveySignal[]; revenue: string | null } {
  const svc = svcOf(ref.service);
  const belongs = (hotelId: string | null | undefined) => { const c = contractOf?.(hotelId ?? null); return c ? c === ref.contract_id : !!hotelId && hotelId === ref.hotel_id; };
  const meetings = new Map(data.meetings.map((m) => [m.id, m]));
  const mine = data.surveys.filter((s) => s.service === svc && belongs(meetings.get(s.meeting_id)?.hotel_id));
  // ties (same timestamp) → the later stored record is newer
  const latest = mine.map((s, i) => [s, i] as const).filter(([s]) => isScored(s)).sort(([a, ia], [b, ib]) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '') || ib - ia)[0]?.[0];
  const out: SurveySignal[] = []; let revenue: string | null = null;
  const push = (x: SurveySignal) => { if (!out.some((y) => y.key === x.key)) out.push(x); };
  if (latest) {
    const who = (latest.respondent ?? 'AE') === 'CUSTOMER_LINK' ? 'ลูกค้าตอบเอง' : 'AE กรอก';
    for (const a of data.answers) {
      if (a.survey_id !== latest.id || a.choice === 'UNSURE' || !a.label_key) continue; // CH12
      if (a.topic_key === 'REVENUE') { revenue = a.label_key; continue; } // CH11
      const key = labelKeyFromText(a.label_key, a.topic_key, a.choice); if (!key) continue;
      const e = SIGNAL_CATALOG.find((x) => x.key === key)!;
      const topic = topicByKey.get(a.topic_key)?.name ?? a.topic_key;
      push({ key, tip: `${e.group}. ${SIGNAL_GROUPS[e.group]} · จากเซอร์เวย์ ${thDateShort(latest.submitted_at!)} · ${topic} · ผู้ตอบ: ${who}` });
    }
  }
  for (const f of flags) {
    if (f.status !== 'OPEN' || f.service !== svc) continue;
    if (!(f.contract_id ? f.contract_id === ref.contract_id : belongs(f.hotel_id))) continue;
    push({ key: f.rule, tip: `จากธง${f.severity === 'yellow' ? 'เหลือง' : 'แดง'} ${thDateShort(f.created_at)} · ${f.topics.join(', ') || '—'}`, amber: f.severity === 'yellow' });
  }
  return { signals: out, revenue };
}
