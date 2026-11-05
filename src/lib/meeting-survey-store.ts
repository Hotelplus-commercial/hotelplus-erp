/* AE Workspace Survey v2 patch — ONE read path for meetings / surveys / survey label answers.
 * Live: existing sample lists (read-only inputs, never edited) + stored records in browser storage
 *   meridia.meetings.v1 · meridia.surveys.v1 · meridia.survey_label_answers.v1; every write stages Cloud doc
 *   ps:meetings · ps:surveys · ps:survey_label_answers (one-way mirror, existing Cloud Sync engine).
 * DEMO (shared DEMO switch): §7 DEMO entries in memory + this session's DEMO writes (session DEMO state, `ms` field);
 *   never written to the real keys. Reacts to the DEMO switch immediately.
 * Every page that shows meetings or surveys reads through getMeetings() / getSurveys() / getSurveyLabelAnswers() or the hooks. */
import { useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { DEMO_DAY, onDemoSessionChange, psDemoOn, readDemoMs, saveDemoMs } from './demo-session';
import { MS_COLLECTIONS, type MeetingRecord, type MeetingSurveyData, type MsCollection, type SurveyFlag, type SurveyLabelAnswer, type SurveyRecord } from './meeting-survey-types';
import { flagDeltaForSurvey, lowScoreTriggers, prevMonth, silentFlags } from './survey-flags';
import { demoContractOf, surveyFlagsDemo } from './survey-flags-demo';
import { meetingSurveyDemoData } from './meeting-survey-demo';
import { allMeetings } from './orm-meeting';
import { surveyPending, surveySubmitted, surveyUpcoming, v4CalendarCards, type MeetingCardV4 } from './ps-v4';
import { LINK_DAYS, addDays, isNoScore, linkState, newLinkToken, v2AllUnsure, v2Rows, type V2Answers } from './survey-v2';

export const MS_STORAGE_KEY = (c: MsCollection) => `meridia.${c}.v1`;
export const MS_DOC_KEY = (c: MsCollection) => `ps:${c}`;
export const MS_DOC_KEYS = MS_COLLECTIONS.map(MS_DOC_KEY);

const empty = (): MeetingSurveyData => ({ meetings: [], surveys: [], answers: [], flags: [] });
const field = (c: MsCollection): keyof MeetingSurveyData => (c === 'survey_label_answers' ? 'answers' : c === 'survey_flags' ? 'flags' : c);

/* ---------- read-only sample inputs (unchanged lists) ---------- */
const meetingTypeOf = (id: string): 'ORM' | 'MARCOM' => (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4 === 0 ? 'MARCOM' : 'ORM');
let samples: MeetingSurveyData | null = null;
function sampleData(): MeetingSurveyData {
  if (samples) return samples;
  const meetings: MeetingRecord[] = [
    ...allMeetings.map((m): MeetingRecord => ({ id: m.id, hotel: m.hotel, service: meetingTypeOf(m.id), tier: m.tier, ae: m.ae, contact_email: m.email, date: m.date, status: m.status, channel: null, origin: 'meetings', raw: m })),
    ...surveyPending.map((c): MeetingRecord => ({ id: c.id, hotel: c.hotel, hotel_id: c.hotelId, service: c.type, tier: c.tier, ae: (c.attendees.split(',')[0] ?? '').trim(), contact: c.contact, date: '', date_label: c.date, status: 'Completed', channel: null, origin: 'survey-queue', raw: c })),
    ...surveyUpcoming.map((c): MeetingRecord => ({ id: c.id, hotel: c.hotel, hotel_id: c.hotelId, service: c.type, tier: c.tier, ae: (c.attendees.split(',')[0] ?? '').trim(), contact: c.contact, date: '', date_label: c.date, status: 'Confirmed', channel: null, origin: 'survey-queue', raw: c })),
    ...v4CalendarCards.map((c): MeetingRecord => ({ id: c.id, hotel: c.hotel, hotel_id: c.hotelId, service: c.type, tier: c.tier, ae: c.owner, date: '', status: c.status, channel: null, origin: 'calendar', raw: c })),
  ];
  const surveys: SurveyRecord[] = surveySubmitted.map((s) => ({ id: s.id, meeting_id: s.id, hotel: s.hotel, service: s.type, tier: s.tier, meeting_date: s.meetingDate, submitted_at: s.submitted, overall: s.overall, customer_response_status: s.subStatus, flags: s.flags, raw: s }));
  samples = { meetings, surveys, answers: [] };
  return samples;
}

/* ---------- stored layers ---------- */
let live: MeetingSurveyData | null = null;
function loadLive(): MeetingSurveyData {
  if (live) return live;
  const d = empty();
  if (typeof localStorage !== 'undefined') for (const c of MS_COLLECTIONS) {
    try { const v = JSON.parse(localStorage.getItem(MS_STORAGE_KEY(c)) ?? '[]'); if (Array.isArray(v)) (d as Record<string, unknown[]>)[field(c)] = v; } catch { /* keep empty */ }
  }
  live = d; return d;
}
let demoBase: MeetingSurveyData | null = null;
const demoEntries = () => { if (!demoBase) { const d = meetingSurveyDemoData(); demoBase = { ...d, flags: surveyFlagsDemo(d) }; } return demoBase; };
const demoOverlay = (): MeetingSurveyData => readDemoMs() ?? empty();

function mergeById<T extends { id: string }>(base: T[], over: T[]): T[] {
  const ids = new Map(over.map((r) => [r.id, r]));
  return [...base.map((r) => ids.get(r.id) ?? r), ...over.filter((r) => !base.some((b) => b.id === r.id))];
}
const merged = (base: MeetingSurveyData, over: MeetingSurveyData): MeetingSurveyData => ({ meetings: mergeById(base.meetings, over.meetings), surveys: mergeById(base.surveys, over.surveys), answers: mergeById(base.answers, over.answers), flags: mergeById(base.flags ?? [], over.flags ?? []) });

export const isMsDemo = () => psDemoOn();
export function getMeetingSurveyData(demo = isMsDemo()): MeetingSurveyData { return demo ? merged(demoEntries(), demoOverlay()) : merged(sampleData(), loadLive()); }
export const getMeetings = (demo?: boolean) => getMeetingSurveyData(demo).meetings;
export const getSurveys = (demo?: boolean) => getMeetingSurveyData(demo).surveys;
export const getSurveyLabelAnswers = (demo?: boolean) => getMeetingSurveyData(demo).answers;
/** Contract Health · Survey signals patch — survey flags (rule_version 2). */
export const getSurveyFlags = (demo?: boolean): SurveyFlag[] => getMeetingSurveyData(demo).flags ?? [];
/** DEMO links demo survey hotels to card ⑦ DEMO contracts; live matches by hotel_id + service. */
export const flagContractOf = (demo = isMsDemo()) => (demo ? demoContractOf : undefined);
export const getCalendarCards = (demo?: boolean) => getMeetings(demo).filter((m) => m.origin === 'calendar').map((m) => m.raw as MeetingCardV4);
export const surveyForMeeting = (meetingId: string, demo?: boolean) => getSurveys(demo).find((s) => s.meeting_id === meetingId);
/** "now" for this mode: DEMO clock (28 ต.ค. 2569) or the real clock. */
export const msNow = (demo = isMsDemo()) => (demo ? `${DEMO_DAY}T10:00:00.000Z` : new Date().toISOString());

/* ---------- subscription (DEMO switch reacts immediately) ---------- */
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };
let wired = false;
function subscribe(l: () => void) {
  if (!wired && typeof window !== 'undefined') { wired = true; onDemoSessionChange(emit); window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith('meridia.')) { live = null; emit(); } }); }
  listeners.add(l); return () => { listeners.delete(l); };
}
/** Returns [data, demo]. Server render = live sample view; the client switches to DEMO right after hydration. */
export function useMeetingSurveyData(): { data: MeetingSurveyData; demo: boolean } {
  const snap = useSyncExternalStore(subscribe, () => `${version}:${psDemoOn() ? 1 : 0}`, () => '0:0');
  const demo = snap.endsWith(':1');
  return { data: getMeetingSurveyData(demo), demo };
}
export const useMeetings = () => useMeetingSurveyData().data.meetings;
export const useSurveys = () => useMeetingSurveyData().data.surveys;
export const useSurveyLabelAnswers = () => useMeetingSurveyData().data.answers;
export const useSurveyFlags = () => useMeetingSurveyData().data.flags ?? [];

/* ---------- writes (live = storage + Cloud mirror; DEMO = session overlay only) ---------- */
/** CH1 / CH5: flag rows for the surveys a write adds or changes (existing flags never edited except auto-close). */
function withFlags(fn: (d: MeetingSurveyData) => MeetingSurveyData, demo: boolean): (d: MeetingSurveyData) => MeetingSurveyData {
  return (d) => {
    const next = fn(d);
    const changed = next.surveys.filter((s) => !d.surveys.includes(s));
    if (!changed.length) return next;
    const all = merged(demo ? demoEntries() : sampleData(), next);
    let flags = all.flags ?? []; const delta: SurveyFlag[] = [];
    for (const s of changed) {
      const rows = flagDeltaForSurvey(s, all.answers, all.meetings.find((m) => m.id === s.meeting_id), flags, msNow(demo), flagContractOf(demo));
      flags = mergeById(flags, rows); delta.push(...rows);
    }
    return delta.length ? { ...next, flags: mergeById(next.flags ?? [], delta) } : next;
  };
}
function write(fn0: (d: MeetingSurveyData) => MeetingSurveyData, demo = isMsDemo()) {
  const fn = withFlags(fn0, demo);
  if (demo) { saveDemoMs(fn(demoOverlay())); emit(); return; }
  const before = loadLive(); const next = fn(before); live = next;
  for (const c of MS_COLLECTIONS) {
    const k = field(c);
    if (next[k] === before[k] || next[k] === undefined) continue;
    try { localStorage.setItem(MS_STORAGE_KEY(c), JSON.stringify(next[k])); } catch { /* quota */ }
    stageCloudDoc(MS_DOC_KEY(c), { items: next[k] });
  }
  emit();
}
const upsert = <T extends { id: string }>(rows: T[], r: T) => [...rows.filter((x) => x.id !== r.id), r];
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

/** §2 — book a meeting with its channel; keeps a copy of the tier at booking time. */
export function bookMeeting(m: Omit<MeetingRecord, 'id' | 'origin' | 'tier_at_booking' | 'created_at'>): MeetingRecord {
  const rec: MeetingRecord = { ...m, id: uid('MTG'), origin: 'booked', tier_at_booking: m.tier, created_at: msNow() };
  write((d) => ({ ...d, meetings: [...d.meetings, rec] }));
  return rec;
}

const baseSurvey = (m: MeetingRecord, version: number): SurveyRecord => ({
  id: uid('SVY'), meeting_id: m.id, hotel: m.hotel, service: m.service, tier: m.tier, meeting_date: m.date || m.date_label || '', submitted_at: null, scores: {}, overall: null, free_comment: null,
  customer_response_status: null, flags: 0, no_score_reason: null, respondent: 'AE', template_version: version, ae_display: m.ae_display ?? m.ae,
});
export type MsResult = { ok: true; survey: SurveyRecord } | { ok: false; error: string };
function guardNoSurvey(m: MeetingRecord): string | null { return surveyForMeeting(m.id) ? 'ประชุมนี้มี Survey แล้ว' : null; }

/** Template 1 submit by the AE (Q7 = overall field; Q8 referral hidden, not required). */
export function saveSurveyV1(m: MeetingRecord, scores: Record<string, number>, comment: string): MsResult {
  const e = guardNoSurvey(m); if (e) return { ok: false, error: e };
  const draft: SurveyRecord = { ...baseSurvey(m, 1), submitted_at: msNow(), scores, overall: scores['Q7'] ?? null, free_comment: comment || null };
  const low = lowScoreTriggers(draft, []).length > 0 ? 1 : 0; // CH1: old ≤ 5 / 6-warning counts retired
  const s: SurveyRecord = { ...draft, flags: low, customer_response_status: low > 0 ? 'Flagged' : 'Waiting Customer' };
  write((d) => ({ ...d, surveys: [...d.surveys, s] }));
  return { ok: true, survey: s };
}
/** §3 — customer gave no score: no scores, CUSTOMER_DECLINED, no score email (customer_response_status stays null). */
export function saveNoScore(m: MeetingRecord, comment: string, version: number): MsResult {
  const e = guardNoSurvey(m); if (e) return { ok: false, error: e };
  const s: SurveyRecord = { ...baseSurvey(m, version), submitted_at: msNow(), no_score_reason: 'CUSTOMER_DECLINED', free_comment: comment || null };
  write((d) => ({ ...d, surveys: [...d.surveys, s] }));
  return { ok: true, survey: s };
}
function v2Survey(s: SurveyRecord, a: V2Answers): { survey: SurveyRecord; rows: SurveyLabelAnswer[] } {
  if (v2AllUnsure(s.service, a)) return { survey: { ...s, no_score_reason: 'CUSTOMER_DECLINED', overall: null, scores: {}, free_comment: a.comment || null, customer_response_status: null }, rows: [] };
  const overall = typeof a.overall === 'number' ? a.overall : null;
  const draft: SurveyRecord = { ...s, overall, scores: a.recommend !== null ? { RECOMMEND: a.recommend } : {}, free_comment: a.comment || null };
  const rows = v2Rows(s.service, a).map((r) => ({ ...r, id: uid('SLA'), survey_id: s.id, created_at: s.submitted_at ?? msNow() }));
  return { survey: { ...draft, flags: lowScoreTriggers(draft, rows).length > 0 ? 1 : 0 }, rows };
}
/** Template 2 submit by the AE. */
export function saveSurveyV2(m: MeetingRecord, a: V2Answers): MsResult {
  const e = guardNoSurvey(m); if (e) return { ok: false, error: e };
  const { survey, rows } = v2Survey({ ...baseSurvey(m, 2), submitted_at: msNow() }, a);
  const s = isNoScore(survey) ? survey : { ...survey, customer_response_status: survey.flags > 0 ? 'Flagged' as const : 'Waiting Customer' as const };
  write((d) => ({ ...d, surveys: [...d.surveys, s], answers: [...d.answers, ...rows] }));
  return { ok: true, survey: s };
}

/** §4 — one link per completed meeting without survey; no resend. */
export function createSurveyLink(m: MeetingRecord, version: number): MsResult {
  if (m.status !== 'Completed') return { ok: false, error: 'ส่งลิงก์ได้เฉพาะประชุมที่จบแล้ว' };
  const e = guardNoSurvey(m); if (e) return { ok: false, error: e };
  const now = msNow();
  const s: SurveyRecord = { ...baseSurvey(m, version), respondent: 'CUSTOMER_LINK', link_token: newLinkToken(), link_expires_at: addDays(now, LINK_DAYS) };
  write((d) => ({ ...d, surveys: [...d.surveys, s] }));
  return { ok: true, survey: s };
}
export type TokenLookup = { status: 'UNKNOWN' } | { status: 'DEAD' | 'OPEN'; survey: SurveyRecord; meeting: MeetingRecord | undefined; demo: boolean };
/** Public page lookup: token only. Searches the live layer, and the DEMO layer when DEMO is on in this browser tab. */
export function findByToken(token: string): TokenLookup {
  if (!token || token.length < 12) return { status: 'UNKNOWN' };
  for (const demo of psDemoOn() ? [true, false] : [false]) {
    const d = getMeetingSurveyData(demo);
    const s = d.surveys.find((x) => x.link_token === token);
    if (s) return { status: linkState(s, msNow(demo)) === 'OPEN' ? 'OPEN' : 'DEAD', survey: s, meeting: d.meetings.find((m) => m.id === s.meeting_id), demo };
  }
  return { status: 'UNKNOWN' };
}
/** Customer answers through the link → scores saved, CONFIRMED, link closed. */
export function answerByLink(token: string, payload: { v1?: { scores: Record<string, number>; comment: string }; v2?: V2Answers }): MsResult {
  const f = findByToken(token);
  if (f.status !== 'OPEN') return { ok: false, error: 'DEAD' };
  const now = msNow(f.demo);
  let s: SurveyRecord = { ...f.survey, submitted_at: now, link_closed_at: now };
  let rows: SurveyLabelAnswer[] = [];
  if (payload.v2) { const r = v2Survey(s, payload.v2); s = r.survey; rows = r.rows; }
  else if (payload.v1) { s = { ...s, scores: payload.v1.scores, overall: payload.v1.scores['Q7'] ?? null, free_comment: payload.v1.comment || null }; s = { ...s, flags: lowScoreTriggers(s, []).length > 0 ? 1 : 0 }; }
  if (!isNoScore(s)) s = { ...s, customer_response_status: 'Confirmed' };
  write((d) => ({ ...d, surveys: upsert(d.surveys, s), answers: [...d.answers, ...rows] }), f.demo);
  return { ok: true, survey: s };
}
/** §4 AS13 — daily job (runs when AE Workspace or the public page opens): close expired unanswered links as LINK_EXPIRED. */
export function expireLinks(demo = isMsDemo()): number {
  const now = msNow(demo);
  const due = getSurveys(demo).filter((s) => s.link_token && !s.submitted_at && !s.link_closed_at && s.link_expires_at && s.link_expires_at < now);
  if (due.length === 0) return 0;
  write((d) => ({ ...d, surveys: due.reduce((rows, s) => upsert(rows, { ...s, link_closed_at: now, no_score_reason: 'LINK_EXPIRED' as const }), d.surveys) }), demo);
  return due.length;
}

/** CH3 — SURVEY_SILENT_2M for the card month that just closed. No daily job exists for meetings, so this runs on the first
 * PS Dashboard / AE Workspace load after month close; idempotent (one flag per contract × service × month × rule).
 * Live evaluates only meetings booked in the app (origin booked) — history is never re-evaluated into flags. */
export function runMonthClose(demo = isMsDemo()): number {
  const closed = prevMonth(msNow(demo).slice(0, 7));
  const d = getMeetingSurveyData(demo);
  const add = silentFlags(d, closed, d.flags ?? [], msNow(demo), { origins: demo ? ['demo', 'booked'] : ['booked'], contractOf: flagContractOf(demo) });
  if (add.length) write((x) => ({ ...x, flags: [...(x.flags ?? []), ...add] }), demo);
  return add.length;
}
/** Test hook: forget cached layers (tests reset storage between cases). */
export function __resetMeetingSurveyStore() { live = null; demoBase = null; emit(); }
