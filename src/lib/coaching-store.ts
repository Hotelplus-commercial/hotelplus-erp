/* Workspace Coaching patch v1.0 — ONE read path for Coaching tasks: getCoachingTasks() / useCoachingTasks().
 * Live: browser collection meridia.coaching_tasks.v1 (one task per flag, id = flag id) → Cloud doc ps:coaching_tasks (one-way mirror).
 *   New tasks are created only for open, coaching-eligible flags without a task (old Q-based sample tasks are never touched).
 * DEMO (shared DEMO switch): tasks built in memory from the demo flags; never written to the real key; reset when DEMO turns off.
 * Bell: the bell cannot target a role or a person yet, so Coaching events show inside the Workspace 🎯 Coaching groups only. */
import { useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { DEMO_DAY, onDemoSessionChange, psDemoOn } from './demo-session';
import { getMeetings, getSurveyFlags, getSurveys } from './meeting-survey-store';
import type { MeetingRecord } from './meeting-survey-types';
import { routeFlag } from './coaching-routing';
import type { CoachMember, CoachRole, CoachingStatus, CoachingTask, MarcomOverrides, MarcomSubRole } from './coaching-types';
import { COACH_DEMO_ACKS, COACH_DEMO_AGE, COACH_DEMO_OWNER_AE, COACH_DEMO_ROSTER, COACH_DEMO_SLOTS } from './coaching-demo';

export const COACHING_KEY = 'meridia.coaching_tasks.v1';
export const COACHING_DOC = 'ps:coaching_tasks';

const listeners = new Set<() => void>();
let version = 0;
const bump = () => { version++; cache = null; listeners.forEach((l) => l()); };

/* ---------- live roster + Assign slots (read only) ---------- */
type HrRaw = { id: string; nickname: string; function: string; orm_team: string | null; active: boolean; marcom_sub_roles?: MarcomSubRole[] };
function readJson<T>(k: string): T | null { try { return typeof localStorage === 'undefined' ? null : (JSON.parse(localStorage.getItem(k) ?? 'null') as T); } catch { return null; } }
export function liveRoster(): CoachMember[] {
  const hr = readJson<{ members?: HrRaw[] }>('meridia.hr.members.v1')?.members ?? [];
  return hr.map((m): CoachMember => ({ id: m.id, name: m.nickname, kind: m.function === 'AE' ? 'AE' : m.function === 'MARCOM' ? 'MARCOM' : m.function.startsWith('ORM') ? 'ORM' : 'AE', orm_team: m.orm_team, active: m.active, ...(m.marcom_sub_roles?.length ? { marcom_sub_roles: m.marcom_sub_roles } : {}) }));
}
type Ws2Profile = { property_id: string; service: string; orm_team?: string | null; assigned_to?: string | null; marcom_content_member_id?: string | null; marcom_ads_member_id?: string | null; marcom_presenter_member_id?: string | null };
function liveSlot(hotelId: string | null, service: string) {
  if (!hotelId) return undefined;
  const p = (readJson<{ profiles?: Ws2Profile[] }>('ps-ws2-v1')?.profiles ?? []).find((x) => x.property_id === hotelId && (service === 'ORM' ? x.service === 'ORM' : x.service.startsWith('MARCOM')));
  return p ? { orm_team: p.orm_team ?? null, marcom_person: p.assigned_to ?? null, marcom_overrides: { CONTENT: p.marcom_content_member_id ?? null, ADS: p.marcom_ads_member_id ?? null, PRESENTER: p.marcom_presenter_member_id ?? null } as MarcomOverrides } : undefined;
}
/** Live testing role (HR testing role switcher, simulation only). */
export function liveCoachRole(): CoachRole | null {
  const r = readJson<{ role?: string }>('meridia.hr.members.v1')?.role;
  return r === 'GRM' || r === 'PM' || r === 'MARCOM_LEAD' ? r : 'PM';
}
/** DF5: in DEMO the HR roster's Marcom sub-roles (same nickname, read only) replace the DEMO defaults once HR has set them. */
function demoRoster(): CoachMember[] {
  const hr = readJson<{ members?: HrRaw[] }>('meridia.hr.members.v1')?.members ?? [];
  return COACH_DEMO_ROSTER.map((m) => { const h = hr.find((x) => x.nickname === m.name && x.function === 'MARCOM' && Array.isArray(x.marcom_sub_roles)); return h?.marcom_sub_roles ? { ...m, marcom_sub_roles: h.marcom_sub_roles } : m; });
}
export const rosterFor = (demo: boolean) => (demo ? demoRoster() : liveRoster());

/* ---------- live store ---------- */
function loadLive(): CoachingTask[] { const v = readJson<CoachingTask[]>(COACHING_KEY); return Array.isArray(v) ? v : []; }
function saveLive(list: CoachingTask[]) {
  try { localStorage.setItem(COACHING_KEY, JSON.stringify(list)); } catch { /* quota */ }
  stageCloudDoc(COACHING_DOC, list);
}
const meetingMap = (demo: boolean) => new Map(getMeetings(demo).map((m) => [m.id, m as MeetingRecord & { caretaker_team?: string | null; caretaker_person?: string | null }]));

/** Adds one task per open, coaching-eligible flag that has none (id = flag id). Returns the list and whether anything was added. */
export function ensureTasks(existing: CoachingTask[], demo: boolean, now: string): { list: CoachingTask[]; added: number } {
  const have = new Set(existing.map((t) => t.id));
  const meetings = meetingMap(demo); const roster = rosterFor(demo);
  const add: CoachingTask[] = [];
  for (const f of getSurveyFlags(demo)) {
    if (have.has(f.id) || f.status !== 'OPEN' || !f.coaching_eligible) continue;
    const key = `${f.service}:${f.hotel_id}`;
    const t = routeFlag(f, {
      meeting: f.meeting_id ? meetings.get(f.meeting_id) : undefined,
      slot: demo ? COACH_DEMO_SLOTS[key] : liveSlot(f.hotel_id, f.service),
      roster, subRolePerson: () => null,
      ownerAe: demo ? (f.hotel_id ? COACH_DEMO_OWNER_AE[f.hotel_id] ?? null : null) : null,
      now: demo ? `${DEMO_DAY.slice(0, 10)}T09:00:00+07:00` : now,
    });
    if (demo) {
      const k = `${f.rule}:${f.hotel_id}`;
      const age = COACH_DEMO_AGE[k] ?? 1;
      t.created_at = new Date(Date.parse(`${DEMO_DAY.slice(0, 10)}T09:00:00+07:00`) - age * 86400000).toISOString();
      for (const m of COACH_DEMO_ACKS[k] ?? []) if (t.owner_member_ids.includes(m)) t.owner_ack_at[m] = t.created_at;
    }
    have.add(t.id); add.push(t);
  }
  return { list: add.length ? [...existing, ...add] : existing, added: add.length };
}

let demoTasks: CoachingTask[] | null = null;
let cache: { demo: boolean; v: number; list: CoachingTask[] } | null = null;
const isDemo = () => psDemoOn();

export function getCoachingTasks(demo: boolean = isDemo()): CoachingTask[] {
  if (cache && cache.demo === demo && cache.v === version) return cache.list;
  let list: CoachingTask[];
  if (demo) { if (!demoTasks) demoTasks = ensureTasks([], true, '').list; list = demoTasks; }
  else {
    const r = ensureTasks(loadLive(), false, new Date().toISOString());
    if (r.added) saveLive(r.list);
    list = r.list;
  }
  cache = { demo, v: version, list };
  return list;
}

function mutate(demo: boolean, id: string, f: (t: CoachingTask) => CoachingTask | null): boolean {
  const list = getCoachingTasks(demo);
  let ok = false;
  const next = list.map((t) => { if (t.id !== id) return t; const n = f(t); if (n) { ok = true; return n; } return t; });
  if (!ok) return false;
  if (demo) demoTasks = next; else saveLive(next);
  bump(); return true;
}
/** Owner one-click รับทราบ (WC6). Owners can't change status or close. */
export const ackTask = (id: string, member: string, demo = isDemo(), at = new Date().toISOString()) =>
  mutate(demo, id, (t) => (t.owner_member_ids.includes(member) && !t.owner_ack_at[member] ? { ...t, owner_ack_at: { ...t.owner_ack_at, [member]: at } } : null));
/** Supervisor-only actions (existing Coaching actions: status, note, close). */
export const setTaskStatus = (id: string, status: CoachingStatus, actor: { role: CoachRole | null; member: string | null }, demo = isDemo(), at = new Date().toISOString()) =>
  mutate(demo, id, (t) => (actor.role === t.assignee_role || (!!actor.member && actor.member === t.assignee_member_id) ? { ...t, status, closed_at: status === 'RESOLVED' ? at : null } : null));
export const addTaskNote = (id: string, text: string, by: string, demo = isDemo(), at = new Date().toISOString()) =>
  mutate(demo, id, (t) => (text.trim() ? { ...t, notes: [...t.notes, { at, by, text: text.trim() }] } : null));

/** WC5: flag closed by a newer scored survey → `ธงปิดแล้ว · ลูกค้าให้คะแนนใหม่ {score}` (task stays open). */
export function flagClosedNote(t: CoachingTask, demo: boolean = isDemo(), flags = getSurveyFlags(demo), surveys: { id: string }[] = getSurveys(demo)): string | null {
  const f = flags.find((x) => x.id === t.flag_id);
  if (!f || f.status !== 'CLOSED') return null;
  const s = f.closed_by_survey ? surveys.find((x) => x.id === f.closed_by_survey) : undefined;
  const score = (s as { overall?: number | null } | undefined)?.overall;
  return `ธงปิดแล้ว · ลูกค้าให้คะแนนใหม่${score != null ? ` ${score}` : ''}`;
}

if (typeof window !== 'undefined') onDemoSessionChange(() => { if (!psDemoOn()) demoTasks = null; bump(); });
/** Test hook: drop in-memory DEMO state. */
export function resetCoachingDemo() { demoTasks = null; bump(); }

const subscribe = (l: () => void) => { listeners.add(l); const off = onDemoSessionChange(l); return () => { listeners.delete(l); off(); }; };
export function useCoachingTasks(demo?: boolean): CoachingTask[] {
  return useSyncExternalStore(subscribe, () => getCoachingTasks(demo ?? isDemo()), () => []);
}
