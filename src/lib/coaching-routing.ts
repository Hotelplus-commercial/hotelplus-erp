/* Workspace Coaching patch v1.0 — pure routing WC1–WC5 (new tasks only; old Q-based sample tasks are untouched).
 * Route by the flag's service, never by question number. */
import type { MeetingRecord, SurveyFlag } from './meeting-survey-types';
import type { CoachMember, CoachRole, CoachingSeverity, CoachingTask, MarcomOverrides, MarcomSubRole, OwnerSource } from './coaching-types';

export type RouteCtx = {
  meeting?: (MeetingRecord & { caretaker_team?: string | null; caretaker_person?: string | null }) | undefined;
  /** Hotel Assign role slots (ORM team / Marcom person) for the flag's hotel + service. */
  slot?: { orm_team?: string | null; marcom_person?: string | null; marcom_overrides?: MarcomOverrides | null } | undefined;
  roster: CoachMember[];
  /** Marcom sub-role person (Content / Ads / presenter, DM12) for a topic — no stored field yet, so live returns null. */
  subRolePerson?: (topic: string) => string | null;
  /** The AE who books the meeting (MEETING_REJECTED owner). */
  ownerAe?: string | null;
  now: string;
};

export const severityOf = (f: SurveyFlag): CoachingSeverity => (f.severity === 'yellow' ? 'YELLOW' : 'RED');
const topicName = (t: string) => t.split(' · ')[0]!.trim();
export const RULE_TITLE: Record<SurveyFlag['rule'], string> = {
  SURVEY_LOW_SCORE: 'คะแนนเซอร์เวย์ต่ำ', SURVEY_NO_SCORE: 'ลูกค้าไม่ให้คะแนน', SURVEY_SILENT_2M: 'เงียบ ≥2 เดือน', MEETING_REJECTED: 'ปฏิเสธนัด',
};
/** WC4: topic names, never Q numbers. */
export function coachingTitle(f: SurveyFlag): string {
  const parts = [RULE_TITLE[f.rule]];
  if (f.rule === 'SURVEY_LOW_SCORE' && f.topics[0]) parts.push(topicName(f.topics[0]));
  parts.push(f.hotel);
  return parts.join(' · ');
}
const normTeam = (t: string | null | undefined) => (t ? String(t).replace(/^Team\s+|^ทีม\s+/i, '').trim() : null);
const memberOf = (roster: CoachMember[], idOrName: string) => roster.find((m) => m.id === idOrName || m.name === idOrName);
const roleMember = (roster: CoachMember[], r: CoachRole) => roster.find((m) => m.kind === r && m.active)?.id ?? null;

/** DF5: survey topic → Marcom sub-role (topics without one fall to the caretaker). */
export const SUB_ROLE_OF_TOPIC: Record<string, MarcomSubRole> = {
  'ภาพลักษณ์คอนเทนต์': 'CONTENT', 'ความสนใจของเพจ': 'CONTENT', 'ผลแคมเปญ / โฆษณา': 'ADS', 'ข้อสรุปการประชุม': 'PRESENTER', 'ความถูกต้องของ Report': 'PRESENTER',
};
export const subRoleOfTopics = (topics: string[]): MarcomSubRole | null => topics.map((t) => SUB_ROLE_OF_TOPIC[topicName(t)] ?? null).find(Boolean) ?? null;
/** Pure: hotel override → caretaker holding that sub-role in the HR roster → caretaker (source decided by caller) → none. */
export function resolveMarcomOwner(topics: string[], ctx: { overrides: MarcomOverrides | null; caretaker: string | null; roster: CoachMember[] }): { person: string | null; source: OwnerSource | null; role: MarcomSubRole | null } {
  const role = subRoleOfTopics(topics);
  if (role && ctx.overrides?.[role]) return { person: ctx.overrides[role]!, source: 'HOTEL_OVERRIDE', role };
  if (role && ctx.caretaker) {
    const m = memberOf(ctx.roster, ctx.caretaker);
    if (m?.marcom_sub_roles?.includes(role)) return { person: ctx.caretaker, source: 'ROSTER_SUB_ROLE', role };
  }
  return { person: null, source: null, role };
}

export function routeFlag(f: SurveyFlag, ctx: RouteCtx): CoachingTask {
  let owners: string[] = []; let team: string | null = null; let source: OwnerSource = 'NONE'; let assignee: CoachRole;
  if (f.rule === 'MEETING_REJECTED') {
    // WC2c: PM + owner AE only.
    assignee = 'PM';
    const ae = ctx.ownerAe ?? ctx.meeting?.ae ?? null;
    const m = ae ? memberOf(ctx.roster, ae) : undefined;
    if (m) { owners = [m.id]; source = 'MEETING_AE'; }
  } else if (f.service === 'ORM') {
    assignee = 'GRM';
    const fromMeeting = normTeam(ctx.meeting?.caretaker_team);
    team = fromMeeting ?? normTeam(ctx.slot?.orm_team);
    source = fromMeeting ? 'MEETING' : team ? 'ASSIGN_SLOT' : 'NONE';
    // WC2b: each active member of the caretaker sub-team, by name (frozen at creation).
    const inTeam = team ? ctx.roster.filter((m) => m.active && normTeam(m.orm_team) === team && (m.kind === 'ORM' || m.also === 'ORM')) : [];
    owners = inTeam.map((m) => m.id);
    if (inTeam.some((m) => m.kind === 'GRM')) assignee = 'PM'; // WC2: GRM in the owner sub-team → PM
  } else {
    assignee = 'MARCOM_LEAD';
    const sub = f.topics.map((t) => ctx.subRolePerson?.(topicName(t)) ?? null).find(Boolean) ?? null;
    const fromMeeting = ctx.meeting?.caretaker_person ?? null;
    const caretaker = fromMeeting ?? ctx.slot?.marcom_person ?? null;
    // WC-O1 (DF5): hotel override → roster member with that sub-role who is the caretaker → caretaker → "—".
    const r = sub ? null : resolveMarcomOwner(f.topics, { overrides: ctx.slot?.marcom_overrides ?? null, caretaker, roster: ctx.roster });
    const person = sub ?? r?.person ?? caretaker;
    source = sub ? 'SUB_ROLE' : r?.source ?? (fromMeeting ? 'MEETING' : person ? 'ASSIGN_SLOT' : 'NONE');
    const m = person ? memberOf(ctx.roster, person) : undefined;
    if (m) owners = [m.id]; else if (person) source = 'NONE';
    if (m && m.kind === 'MARCOM_LEAD') assignee = 'PM'; // WC2: Marcom Lead self-flag → PM
  }
  const severity = severityOf(f);
  return {
    id: f.id, flag_id: f.id, rule: f.rule, severity, priority: severity === 'RED' ? 'HIGH' : 'NORMAL',
    service: f.service, hotel: f.hotel, hotel_id: f.hotel_id, contract_id: f.contract_id ?? null, card_month: f.card_month,
    topics: f.topics, title: coachingTitle(f), meeting_id: f.meeting_id, survey_id: f.survey_id,
    assignee_role: assignee, assignee_member_id: roleMember(ctx.roster, assignee),
    owner_member_ids: owners, owner_team: team, owner_ack_at: {}, owner_source: source,
    status: 'OPEN', notes: [], created_at: ctx.now, closed_at: null,
  };
}

/** Viewer's two lists (WC7 / WC8). A viewer is a member id plus the coach role they hold, if any. */
export const isAssignee = (t: CoachingTask, v: { member: string | null; role: CoachRole | null }) =>
  (!!v.member && t.assignee_member_id === v.member) || (!!v.role && t.assignee_role === v.role && (!t.assignee_member_id || !v.member || t.assignee_member_id === v.member));
export const isOwner = (t: CoachingTask, member: string | null) => !!member && t.owner_member_ids.includes(member);
export const ackCount = (t: CoachingTask) => ({ n: t.owner_member_ids.filter((m) => t.owner_ack_at[m]).length, total: t.owner_member_ids.length });
/** WC9: red first, then age desc. */
export const sortTasks = (a: CoachingTask, b: CoachingTask) => (a.severity === b.severity ? a.created_at.localeCompare(b.created_at) : a.severity === 'RED' ? -1 : 1);
export const ageDays = (t: CoachingTask, now: string) => Math.max(0, Math.floor((Date.parse(now) - Date.parse(t.created_at)) / 86400000));
