/* PS Dashboard · Tab "การประชุม & เซอร์เวย์" R1 (MS1–MS40) — pure read-only helpers named after the §2 views.
 * Data source: getMeetingSurveyData() (meeting-survey-store: getMeetings / getSurveys / getSurveyLabelAnswers / getSurveyFlags)
 * + tab DEMO additions (meeting-tab-r1-demo.ts, DEMO only). The database views v_meeting_* do NOT see browser-stored records,
 * so nothing here reads them; the DB views and their hooks stay untouched. No writes. Flags are read, never recomputed. */
import type { MeetingRecord, MeetingService, MeetingSurveyData, SurveyFlag, SurveyRecord } from './meeting-survey-types';
import { getMeetingSurveyData } from './meeting-survey-store';
import { isScored } from './survey-flags';
import { isNoScore, templateVersionOf, respondentOf, topicsFor, OPPORTUNITY_LABELS, RECOMMEND_LABEL } from './survey-v2';
import { median } from './meeting-dashboard-types';
import { meetingTabDemoAdditions, DEMO_CARETAKER } from './meeting-tab-r1-demo';

export type Svc = MeetingService; // 'ORM' | 'MARCOM'
export type Tier = 'A' | 'B' | 'C' | '—';
export type CaretakerSource = 'record' | 'role' | 'calendar' | 'none';
export type Status = 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'SURVEY_SUBMITTED' | 'NOT_BOOKED' | 'POSTPONED' | 'POSTPONED_NEXT_MONTH' | 'REJECTED' | 'OTHER';
export type TabMeeting = {
  id: string; hotel: string; hotel_id: string | null; service: Svc; tier: Tier; ae: string; date: string | null;
  card_month: string; status: Status; online: boolean; booked_at: string;
  team: string; person: string; caretakerSource: CaretakerSource;
  survey: SurveyRecord | null;
};

/* ---------- normalisation ---------- */
const ISO = /^\d{4}-\d{2}-\d{2}/;
export function normStatus(s: string): Status {
  const k = String(s ?? '').toUpperCase().replace(/[^A-Z]+/g, '_').replace(/^_|_$/g, '');
  if (k === 'COMPLETED' || k === 'DONE') return 'COMPLETED';
  if (k === 'SURVEY_SUBMITTED') return 'SURVEY_SUBMITTED';
  if (k === 'CONFIRMED' || k === 'BOOKED' || k === 'SCHEDULED') return 'CONFIRMED';
  if (k === 'NO_SHOW' || k === 'NOSHOW') return 'NO_SHOW';
  if (k === 'POSTPONED_NEXT_MONTH') return 'POSTPONED_NEXT_MONTH';
  if (k.startsWith('POSTPONE')) return 'POSTPONED';
  if (k === 'REJECTED' || k === 'DECLINED') return 'REJECTED';
  if (k === 'NOT_BOOKED' || k === 'NOT_ASSIGN' || k === 'NOT_ASSIGNED' || k === 'UNASSIGNED' || k === 'WAITING_BOOKING') return 'NOT_BOOKED';
  return 'OTHER';
}
export const isBooked = (s: Status) => s === 'CONFIRMED' || s === 'COMPLETED' || s === 'NO_SHOW' || s === 'SURVEY_SUBMITTED';
export const isCompleted = (s: Status) => s === 'COMPLETED' || s === 'SURVEY_SUBMITTED';
export const isCustomerNoScore = (s: SurveyRecord | null) => !!s && isNoScore(s);
export const isScoredSurvey = (s: SurveyRecord | null) => !!s && isScored(s);

/* ---------- caretaker (month-aware as far as the records carry it; never guessed) ---------- */
export type Ws2Profile = { property_id: string; service: string; orm_team?: string | null; assigned_to?: string | null };
export function ws2Profiles(): Ws2Profile[] {
  try { if (typeof localStorage === 'undefined') return []; const p = JSON.parse(localStorage.getItem('ps-ws2-v1') ?? 'null'); return Array.isArray(p?.profiles) ? p.profiles : []; } catch { return []; }
}
export function caretakerOf(m: MeetingRecord & { caretaker_team?: string | null; caretaker_person?: string | null }, profiles: Ws2Profile[], demo: boolean): { name: string; source: CaretakerSource } {
  const own = m.service === 'ORM' ? m.caretaker_team : m.caretaker_person;
  if (own) return { name: own, source: 'record' };
  if (demo) { const d = m.hotel_id ? DEMO_CARETAKER[`${m.service}:${m.hotel_id}`] : undefined; if (d) return { name: d, source: 'role' }; }
  else if (m.hotel_id) {
    const p = profiles.find((x) => x.property_id === m.hotel_id && (m.service === 'ORM' ? x.service === 'ORM' : x.service.startsWith('MARCOM')));
    const v = m.service === 'ORM' ? p?.orm_team : p?.assigned_to;
    if (v) return { name: String(v).replace(/^Team\s+/i, ''), source: 'role' };
  }
  const team = (m.raw as { team?: string } | undefined)?.team;
  if (m.origin === 'calendar' && team) return { name: String(team).replace(/^Team\s+/i, ''), source: 'calendar' };
  return { name: '—', source: 'none' };
}

/** Tab data = shared store (+ tab DEMO additions when DEMO is on). */
export function getMeetingTabData(demo: boolean, base: MeetingSurveyData = getMeetingSurveyData(demo)): MeetingSurveyData {
  if (!demo) return base;
  const add = meetingTabDemoAdditions();
  return { meetings: [...base.meetings, ...add.meetings], surveys: [...base.surveys, ...add.surveys], answers: base.answers, flags: base.flags ?? [] };
}

/** One normalised row per meeting / card with a card month. */
export function tabMeetings(data: MeetingSurveyData, demo: boolean): TabMeeting[] {
  const profiles = demo ? [] : ws2Profiles();
  const bySurvey = new Map<string, SurveyRecord>();
  for (const s of data.surveys) { const cur = bySurvey.get(s.meeting_id); if (!cur || (s.submitted_at ?? '') >= (cur.submitted_at ?? '')) bySurvey.set(s.meeting_id, s); }
  const out: TabMeeting[] = [];
  for (const m0 of data.meetings) {
    const m = m0 as MeetingRecord & { card_month?: string | null; caretaker_team?: string | null; caretaker_person?: string | null };
    const date = m.date && ISO.test(m.date) ? m.date.slice(0, 10) : null;
    const card_month = m.card_month ?? (date ? date.slice(0, 7) : null);
    if (!card_month) continue;
    const c = caretakerOf(m, profiles, demo);
    const tier = (m.tier_at_booking ?? m.tier ?? '—') as Tier;
    out.push({
      id: m.id, hotel: m.hotel, hotel_id: m.hotel_id ?? null, service: m.service, tier, ae: m.ae_display ?? m.ae, date, card_month,
      status: normStatus(m.status), online: (m.channel ?? 'ONLINE') === 'ONLINE', booked_at: m.created_at ?? date ?? card_month,
      team: m.service === 'ORM' ? c.name : '—', person: m.service === 'MARCOM' ? c.name : '—', caretakerSource: c.source,
      survey: bySurvey.get(m.id) ?? null,
    });
  }
  return out;
}

const inMonths = (rows: TabMeeting[], svc: Svc, months: string[]) => rows.filter((r) => r.service === svc && r.online && months.includes(r.card_month));

/* ---------- v_meeting_quota (MS2) ---------- */
export function vMeetingQuota(rows: TabMeeting[], svc: Svc, months: string[]) {
  const r = inMonths(rows, svc, months);
  const pnm = r.filter((x) => x.status === 'POSTPONED_NEXT_MONTH');
  const cards = svc === 'ORM' ? r.filter((x) => x.tier === 'A') : r;
  const pnmCards = svc === 'ORM' ? pnm.filter((x) => x.tier === 'A') : pnm;
  return { quota: cards.length - pnmCards.length, tierA_cards: svc === 'ORM' ? cards.length : 0, pnm_excluded: pnmCards.length };
}

/* ---------- MS4 in-quota ordering ---------- */
function overQuotaIds(r: TabMeeting[], quota: number): Set<string> {
  const booked = r.filter((x) => isBooked(x.status));
  const order = [...booked.filter((x) => x.tier === 'A'), ...booked.filter((x) => x.tier !== 'A').sort((a, b) => a.booked_at.localeCompare(b.booked_at) || a.id.localeCompare(b.id))];
  return new Set(order.slice(Math.max(0, quota)).map((x) => x.id));
}

/* ---------- v_meeting_funnel ---------- */
export type Split = { total: number; A: number; B: number; C: number };
const split = (r: TabMeeting[]): Split => ({ total: r.length, A: r.filter((x) => x.tier === 'A').length, B: r.filter((x) => x.tier === 'B').length, C: r.filter((x) => x.tier === 'C').length });
export function vMeetingFunnel(rows: TabMeeting[], svc: Svc, months: string[], today: string) {
  const r = inMonths(rows, svc, months);
  const q = vMeetingQuota(rows, svc, months);
  const booked = r.filter((x) => isBooked(x.status));
  const completed = booked.filter((x) => isCompleted(x.status));
  const scored = completed.filter((x) => isScoredSurvey(x.survey));
  const noScore = completed.filter((x) => isCustomerNoScore(x.survey));
  const pending = completed.filter((x) => !isScoredSurvey(x.survey) && !isCustomerNoScore(x.survey));
  const over = overQuotaIds(r, q.quota);
  const tierACards = r.filter((x) => x.tier === 'A' && x.status !== 'POSTPONED_NEXT_MONTH');
  return {
    ...q,
    booked: split(booked), completed: split(completed), scored: split(scored),
    over_quota: Math.max(0, booked.length - q.quota), short_quota: Math.max(0, q.quota - booked.length), overIds: over,
    customer_no_score: noScore.length, survey_pending: pending.length,
    disputed: scored.filter((x) => x.survey?.customer_response_status === 'Flagged').length,
    waiting: booked.filter((x) => x.status === 'CONFIRMED' && (!x.date || x.date >= today)).length,
    overdue: booked.filter((x) => x.status === 'CONFIRMED' && !!x.date && x.date < today).length,
    no_show: booked.filter((x) => x.status === 'NO_SHOW').length,
    not_booked: r.filter((x) => x.status === 'NOT_BOOKED').length, postponed: r.filter((x) => x.status === 'POSTPONED').length, rejected: r.filter((x) => x.status === 'REJECTED').length,
    chain: svc === 'ORM' ? { quota: tierACards.length, booked: booked.filter((x) => x.tier === 'A').length, completed: completed.filter((x) => x.tier === 'A').length, scored: scored.filter((x) => x.tier === 'A').length } : null,
  };
}
export type Funnel = ReturnType<typeof vMeetingFunnel>;

/* ---------- v_meeting_funnel_detail ---------- */
export type FunnelEvent = 'NOT_BOOKED' | 'POSTPONED' | 'REJECTED' | 'WAITING' | 'OVERDUE_NO_UPDATE' | 'NO_SHOW' | 'SURVEY_PENDING' | 'CUSTOMER_NO_SCORE' | 'SUBSTITUTE_B' | 'SUBSTITUTE_C' | 'TIER_A_BOOKED' | 'OVER_QUOTA';
export type DetailRow = { id: string; stage: 1 | 2 | 3; event: FunnelEvent; over: boolean; hotel: string; tier: Tier; ae: string; date: string | null };
export function vMeetingFunnelDetail(rows: TabMeeting[], svc: Svc, months: string[], today: string): DetailRow[] {
  const r = inMonths(rows, svc, months);
  const over = overQuotaIds(r, vMeetingQuota(rows, svc, months).quota);
  const out: DetailRow[] = [];
  const row = (x: TabMeeting, stage: 1 | 2 | 3, event: FunnelEvent) => out.push({ id: x.id, stage, event, over: over.has(x.id), hotel: x.hotel, tier: x.tier, ae: x.ae, date: x.date });
  for (const x of r) {
    if (x.status === 'NOT_BOOKED') row(x, 1, 'NOT_BOOKED');
    else if (x.status === 'POSTPONED') row(x, 1, 'POSTPONED');
    else if (x.status === 'REJECTED') row(x, 1, 'REJECTED');
    if (!isBooked(x.status)) continue;
    if (svc === 'ORM') row(x, 1, x.tier === 'A' ? 'TIER_A_BOOKED' : x.tier === 'C' ? 'SUBSTITUTE_C' : 'SUBSTITUTE_B');
    else if (over.has(x.id)) row(x, 1, 'OVER_QUOTA');
    if (x.status === 'NO_SHOW') row(x, 2, 'NO_SHOW');
    else if (x.status === 'CONFIRMED') row(x, 2, x.date && x.date < today ? 'OVERDUE_NO_UPDATE' : 'WAITING');
    else if (isCompleted(x.status) && !isScoredSurvey(x.survey)) row(x, 3, isCustomerNoScore(x.survey) ? 'CUSTOMER_NO_SCORE' : 'SURVEY_PENDING');
  }
  return out;
}

/* ---------- v_meeting_tierA_pending (② wording only) ---------- */
export function vMeetingTierAPending(rows: TabMeeting[], months: string[]) {
  const order: Status[] = ['REJECTED', 'NO_SHOW', 'CONFIRMED', 'NOT_BOOKED', 'POSTPONED', 'OTHER'];
  return inMonths(rows, 'ORM', months).filter((x) => x.tier === 'A' && !isCompleted(x.status) && x.status !== 'POSTPONED_NEXT_MONTH')
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.hotel.localeCompare(b.hotel));
}

/* ---------- v_meeting_by_owner ---------- */
export type OwnerLens = 'ORM_TEAM' | 'AE' | 'MARCOM_PERSON';
export const ORM_TEAMS = ['A', 'B', 'C', 'D', 'E', 'Re-active'];
export const MARCOM_PEOPLE = ['แนน', 'บิว', 'โบว์', 'เจน'];
export type OwnerRow = { name: string; quota: number; tierA_completed: number; sub_completed: number; completed_all: number; booked: number; completed: number; waiting: number; no_show: number; portfolio_hotels: number; booked_orm: number; booked_mc: number };
export function vMeetingByOwner(rows: TabMeeting[], lens: OwnerLens, months: string[]): OwnerRow[] {
  const svcRows = rows.filter((x) => x.online && (lens === 'ORM_TEAM' ? x.service === 'ORM' : lens === 'MARCOM_PERSON' ? x.service === 'MARCOM' : true));
  const keyOf = (x: TabMeeting) => (lens === 'ORM_TEAM' ? x.team : lens === 'MARCOM_PERSON' ? x.person : x.ae);
  const roster = lens === 'ORM_TEAM' ? ORM_TEAMS : lens === 'MARCOM_PERSON' ? MARCOM_PEOPLE : [];
  const names = [...roster, ...[...new Set(svcRows.filter((x) => months.includes(x.card_month)).map(keyOf))].filter((n) => !roster.includes(n)).sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b)))];
  return names.map((name) => {
    const all = svcRows.filter((x) => keyOf(x) === name);
    const r = all.filter((x) => months.includes(x.card_month));
    const ormR = r.filter((x) => x.service === 'ORM'), mcR = r.filter((x) => x.service === 'MARCOM');
    const quota = ormR.filter((x) => x.tier === 'A' && x.status !== 'POSTPONED_NEXT_MONTH').length + mcR.filter((x) => x.status !== 'POSTPONED_NEXT_MONTH').length;
    const booked = r.filter((x) => isBooked(x.status)), done = booked.filter((x) => isCompleted(x.status));
    return {
      name, quota,
      tierA_completed: done.filter((x) => x.service === 'ORM' && x.tier === 'A').length,
      sub_completed: done.filter((x) => x.service === 'ORM' && x.tier !== 'A').length,
      completed_all: done.length, booked: booked.length, completed: done.length,
      waiting: booked.filter((x) => x.status === 'CONFIRMED').length, no_show: booked.filter((x) => x.status === 'NO_SHOW').length,
      portfolio_hotels: new Set(all.map((x) => x.hotel_id ?? x.hotel)).size,
      booked_orm: booked.filter((x) => x.service === 'ORM').length, booked_mc: booked.filter((x) => x.service === 'MARCOM').length,
    };
  }).filter((o) => roster.includes(o.name) || o.quota > 0 || o.booked > 0);
}

/* ---------- v_meeting_survey_coverage ---------- */
export function vMeetingSurveyCoverage(rows: TabMeeting[], svc: Svc, months: string[]) {
  const done = inMonths(rows, svc, months).filter((x) => isCompleted(x.status));
  const scored = done.filter((x) => isScoredSurvey(x.survey));
  return {
    completed: done.length, scored: scored.length,
    customer_no_score: done.filter((x) => isCustomerNoScore(x.survey)).length,
    survey_pending: done.filter((x) => !isScoredSurvey(x.survey) && !isCustomerNoScore(x.survey)).length,
    disputed: scored.filter((x) => x.survey?.customer_response_status === 'Flagged').length,
    overall: scored.map((x) => x.survey!.overall).filter((n): n is number => n != null),
  };
}

/* ---------- v_meeting_survey_scores (MS7 bands · MS28 topics · set 1 / set 2) ---------- */
export const band = (n: number): 'low' | 'mid' | 'sat' => (n <= 6 ? 'low' : n === 7 ? 'mid' : 'sat');
export type ScoreTopic = { key: string; name: string; short: string; main?: boolean };
export const SET1_TOPICS: Record<Svc, ScoreTopic[]> = {
  ORM: [{ key: 'OVERALL', name: 'พึงพอใจรวม', short: 'พึงพอใจรวม', main: true }, { key: 'Q1', name: 'เนื้อหามีประโยชน์', short: 'เนื้อหา' }, { key: 'Q2', name: 'บริหารเวลา', short: 'บริหารเวลา' }, { key: 'Q3', name: 'คุณภาพคำแนะนำ', short: 'คำแนะนำ' }],
  MARCOM: [{ key: 'OVERALL', name: 'พึงพอใจรวม', short: 'พึงพอใจรวม', main: true }, { key: 'Q4', name: 'Content / Content Plan', short: 'Content' }, { key: 'Q5', name: 'Ads performance', short: 'Ads' }, { key: 'Q6', name: 'สื่อสาร & Suggestion', short: 'สื่อสาร' }],
};
const scoreOf = (s: SurveyRecord, key: string) => (key === 'OVERALL' ? s.overall ?? s.scores?.['Q7'] ?? null : s.scores?.[key] ?? null);
export type ScoreCell = { hotel: string; score: number | null; team: string; ae: string };
export type ScoreRow = ScoreTopic & { low: ScoreCell[]; mid: ScoreCell[]; sat: ScoreCell[]; no_score: ScoreCell[]; median: number | null; delta: number | null };
export function versionsIn(rows: TabMeeting[], svc: Svc, months: string[]): number[] {
  return [...new Set(inMonths(rows, svc, months).filter((x) => isCompleted(x.status) && isScoredSurvey(x.survey)).map((x) => templateVersionOf(x.survey!)))].sort();
}
const owner = (x: TabMeeting) => (x.service === 'ORM' ? x.team : x.person);
export function vMeetingSurveyScores(rows: TabMeeting[], svc: Svc, months: string[], prevMonths: string[], version: number): ScoreRow[] {
  const pick = (ms: string[]) => inMonths(rows, svc, ms).filter((x) => isCompleted(x.status) && x.survey && templateVersionOf(x.survey) === version);
  const cur = pick(months), prev = pick(prevMonths);
  const noScoreRows = inMonths(rows, svc, months).filter((x) => isCompleted(x.status) && isCustomerNoScore(x.survey) && templateVersionOf(x.survey!) === version);
  const topics = version === 1 ? SET1_TOPICS[svc] : [SET1_TOPICS[svc][0]!];
  return topics.map((t) => {
    const cells = cur.filter((x) => isScoredSurvey(x.survey)).map((x) => ({ x, v: scoreOf(x.survey!, t.key) })).filter((c): c is { x: TabMeeting; v: number } => c.v != null);
    const prevVals = prev.filter((x) => isScoredSurvey(x.survey)).map((x) => scoreOf(x.survey!, t.key)).filter((n): n is number => n != null);
    const mk = (c: { x: TabMeeting; v: number | null }): ScoreCell => ({ hotel: c.x.hotel, score: c.v, team: owner(c.x), ae: c.x.ae });
    const med = median(cells.map((c) => c.v)), pm = median(prevVals);
    return { ...t, low: cells.filter((c) => band(c.v) === 'low').map(mk), mid: cells.filter((c) => band(c.v) === 'mid').map(mk), sat: cells.filter((c) => band(c.v) === 'sat').map(mk), no_score: noScoreRows.map((x) => mk({ x, v: null })), median: med, delta: med != null && pm != null ? med - pm : null };
  });
}
/** ⑤ expander 2 — median per topic per team / person (set of the chosen version). */
export function vMeetingSurveyByOwner(rows: TabMeeting[], svc: Svc, months: string[], prevMonths: string[], version: number) {
  const names = svc === 'ORM' ? ORM_TEAMS : MARCOM_PEOPLE;
  const extra = [...new Set(inMonths(rows, svc, months).map(owner))].filter((n) => !names.includes(n));
  return [...names, ...extra].map((name) => {
    const only = rows.filter((x) => owner(x) === name);
    const r = vMeetingSurveyScores(only, svc, months, prevMonths, version);
    return { name, topics: r.map((t) => ({ key: t.key, median: t.median, delta: t.delta })), low: Math.max(0, ...r.map((t) => t.low.length)), no_score: r[0]?.no_score.length ?? 0, n: (r[0]?.low.length ?? 0) + (r[0]?.mid.length ?? 0) + (r[0]?.sat.length ?? 0) };
  }).filter((o) => o.n > 0 || o.no_score > 0);
}
/** ⑤ set 2 label rows (MS35–MS36). */
export function vMeetingSurveyLabels(rows: TabMeeting[], data: MeetingSurveyData, svc: Svc, months: string[]) {
  const cur = inMonths(rows, svc, months).filter((x) => isCompleted(x.status) && x.survey && templateVersionOf(x.survey) === 2);
  const scored = cur.filter((x) => isScoredSurvey(x.survey)); const ids = new Set(scored.map((x) => x.survey!.id));
  const noScore = cur.filter((x) => isCustomerNoScore(x.survey)).length;
  const ans = data.answers.filter((a) => ids.has(a.survey_id));
  const topics = topicsFor(svc).filter((t) => t.kind === 'pair').map((t) => {
    const a = ans.filter((x) => x.topic_key === t.key);
    const good = a.filter((x) => x.choice === 'GOOD').length, bad = a.filter((x) => x.choice === 'BAD').length, unsure = a.filter((x) => x.choice === 'UNSURE').length;
    const base = good + bad + unsure;
    return { key: t.key, name: t.name, goodLabel: t.good ?? '', badLabel: t.bad ?? '', good, bad, unsure, no_score: noScore, pctGood: base ? Math.round((good / base) * 100) : null, badShare: base ? bad / base : 0 };
  });
  const opp = {
    recommend: ans.filter((a) => a.topic_key === 'RECOMMEND' && a.label_key === RECOMMEND_LABEL).length,
    expand: ans.filter((a) => a.topic_key === 'OPPORTUNITY' && a.label_key === OPPORTUNITY_LABELS[0]).length,
    group: ans.filter((a) => a.topic_key === 'OPPORTUNITY' && a.label_key === OPPORTUNITY_LABELS[1]).length,
  };
  const resp = { ae: scored.filter((x) => respondentOf(x.survey!) === 'AE').length, customer: scored.filter((x) => respondentOf(x.survey!) === 'CUSTOMER_LINK').length };
  return { topics, opp, resp };
}

/* ---------- v_meeting_survey_silent ---------- */
export type SilentRow = { hotel: string; reason: 'no_score' | 'pending'; streak: number; caretaker: string; ae: string; date: string | null };
const prevYm = (ym: string) => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1)); return d.toISOString().slice(0, 7); };
export function vMeetingSurveySilent(rows: TabMeeting[], svc: Svc, months: string[]): SilentRow[] {
  const all = rows.filter((x) => x.service === svc && x.online && isCompleted(x.status));
  const hotelKey = (x: TabMeeting) => x.hotel_id ?? x.hotel;
  const silentIn = (k: string, ym: string) => { const r = all.filter((x) => hotelKey(x) === k && x.card_month === ym); return r.length > 0 && !r.some((x) => isScoredSurvey(x.survey)); };
  return all.filter((x) => months.includes(x.card_month) && !isScoredSurvey(x.survey)).map((x) => {
    let streak = 0; let ym = x.card_month; while (streak < 24 && silentIn(hotelKey(x), ym)) { streak++; ym = prevYm(ym); }
    return { hotel: x.hotel, reason: isCustomerNoScore(x.survey) ? 'no_score' as const : 'pending' as const, streak, caretaker: owner(x), ae: x.ae, date: x.date };
  }).sort((a, b) => (a.reason === b.reason ? b.streak - a.streak || a.hotel.localeCompare(b.hotel) : a.reason === 'no_score' ? -1 : 1));
}

/* ---------- v_meeting_signal_counts (reads survey flags; never recomputes) ---------- */
export function vMeetingSignalCounts(flags: SurveyFlag[], svc: Svc, months: string[]) {
  const open = flags.filter((f) => f.status === 'OPEN' && f.service === svc && months.includes(f.card_month));
  const hotels = (rule: SurveyFlag['rule']) => new Set(open.filter((f) => f.rule === rule).map((f) => f.hotel_id ?? f.hotel)).size;
  return { low: hotels('SURVEY_LOW_SCORE'), no_score: hotels('SURVEY_NO_SCORE'), silent: hotels('SURVEY_SILENT_2M') };
}

/* ---------- ⑤ free comments (not scored) ---------- */
export function vMeetingFreeComments(rows: TabMeeting[], svc: Svc, months: string[]) {
  return inMonths(rows, svc, months).filter((x) => x.survey?.free_comment).map((x) => ({ id: x.id, hotel: x.hotel, comment: String(x.survey!.free_comment) }));
}

/* ---------- v_meeting_rubric_summary: placeholder (pending_engine) ---------- */
export const vMeetingRubricSummary = () => ({ status: 'pending_engine' as const });

/** Live-mode report: which caretaker source each row used (record / role assignment / calendar card / none). */
export const caretakerSources = (rows: TabMeeting[]) => rows.reduce<Record<CaretakerSource, number>>((a, r) => { a[r.caretakerSource]++; return a; }, { record: 0, role: 0, calendar: 0, none: 0 });
