/* Task v2.1 — pure history engine: status replay, reconstructed backlog, time metrics, ⑥/⑦ selectors.
 * Read-only: never writes cases, L0, coaching, renewal, contract or assignment data. */
import type { Activity, Category, HotelCare, MonitorRow, SnapshotRow } from './task-tickets';
import type { L0Ticket } from './tickets-l0';
import { statusGroup, type StatusGroup, type WorkRow } from './task-worklist';
import { configAt, TASK_CONFIG_HISTORY, type TaskConfigHistory } from './task-config';
import type { Period } from './ps-dashboard-global';

const DAY = 864e5;
export const bkkDate = (ms: number) => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
export const endOfBkkDay = (date: string) => Date.parse(`${date}T23:59:59.999+07:00`);
const CASE_CLOSED = (s: string) => s === 'resolved' || s === 'closed';
const OTHER = ['AUTO', 'HR', 'OFFICE'];
export const deptBucket = (d: string) => (OTHER.includes(d) ? 'อื่น ๆ' : d);

type Change = { from: string; to: string; at: number };
const parseChange = (a: Activity): Change | null => { const m = /^(\S+)(?: \([A-Z]+\))? → (\S+)/.exec(a.body); return m ? { from: m[1]!, to: m[2]!, at: Date.parse(a.at) } : null; };
export type ActMap = Map<string, Activity[]>;
export function indexActivity(acts: Activity[]): ActMap {
  const m: ActMap = new Map();
  for (const a of acts) { const l = m.get(a.ticket_id) ?? []; l.push(a); m.set(a.ticket_id, l); }
  for (const l of m.values()) l.sort((a, b) => a.at.localeCompare(b.at));
  return m;
}
const changes = (acts: Activity[] | undefined, type: Activity['type']) => (acts ?? []).filter(a => a.type === type).map(parseChange).filter((c): c is Change => !!c);

/** Status at T by replaying STATUS_CHANGE; null = not yet created. */
export function caseStatusAt(r: WorkRow, acts: ActMap, T: number): string | null {
  const t = r.case!; if (Date.parse(t.created_at) > T) return null;
  const ch = changes(acts.get(t.id), 'STATUS_CHANGE');
  if (!ch.length) return t.resolved_at && CASE_CLOSED(t.status) && Date.parse(t.resolved_at) > T ? 'open' : t.status;
  let s = ch[0]!.from; for (const c of ch) if (c.at <= T) s = c.to; return s;
}
export function caseDeptAt(r: WorkRow, acts: ActMap, T: number): string {
  const ch = changes(acts.get(r.case!.id), 'DEPT_CHANGE');
  if (!ch.length) return r.dept;
  let d = ch[0]!.from; for (const c of ch) if (c.at <= T) d = c.to; return d;
}
export function l0StatusAt(t: L0Ticket, T: number): string | null {
  if (Date.parse(t.created_at) > T) return null;
  let s: string = t.audit[0]?.to_status ?? t.status;
  for (const a of [...t.audit].sort((x, y) => x.at.localeCompare(y.at))) if (Date.parse(a.at) <= T) s = a.to_status;
  return s;
}

export type BacklogInput = { rows: WorkRow[]; acts: ActMap; coaching: MonitorRow[]; renewals: MonitorRow[]; now: string; config?: TaskConfigHistory | undefined; snapshots: SnapshotRow[]; k3Today: number | null; coachingClosed?: { opened_at: string; resolved_at: string }[]; renewalsDecided?: { end_date: string; decided_at: string }[] };
export type Backlog = { k1: number; k1Case: number; k1L0: number; k2: number; k2Threshold: number; k3: number | null; k4: number; k5: number; dept: Record<string, [number, number, number]>; k2ByDept: Record<string, number> };
const GROUP_IDX: Partial<Record<StatusGroup, number>> = { OPEN: 0, IN_PROGRESS: 1, WAITING: 2 };
/** backlogAsOf(T): T = end of a Bangkok day, or `now` for today (invariant: equals live K1/K2/K4/K5/⑤). */
export function backlogAsOf(T: number, inp: BacklogInput): Backlog {
  const nowMs = Date.parse(inp.now), date = bkkDate(Math.min(T, nowMs)), threshold = configAt('case_overdue_days', date, inp.config ?? TASK_CONFIG_HISTORY);
  const out: Backlog = { k1: 0, k1Case: 0, k1L0: 0, k2: 0, k2Threshold: threshold, k3: null, k4: 0, k5: 0, dept: {}, k2ByDept: {} };
  for (const r of inp.rows) {
    const s = r.source_kind === 'CASE' ? caseStatusAt(r, inp.acts, T) : l0StatusAt(r.l0!, T);
    if (!s) continue; const g = statusGroup(s); if (g === 'CLOSED') continue;
    out.k1++; if (r.source_kind === 'CASE') out.k1Case++; else out.k1L0++;
    if (r.source_kind === 'CASE' && (s === 'open' || s === 'in-progress') && Math.floor((T - Date.parse(r.created_at)) / DAY) > threshold) out.k2++;
    const dept = deptBucket(r.source_kind === 'CASE' ? caseDeptAt(r, inp.acts, T) : r.dept), v: [number, number, number] = out.dept[dept] ?? [0, 0, 0];
    if (r.source_kind === 'CASE' && (s === 'open' || s === 'in-progress') && Math.floor((T - Date.parse(r.created_at)) / DAY) > threshold) out.k2ByDept[dept] = (out.k2ByDept[dept] ?? 0) + 1;
    const gi = GROUP_IDX[g] ?? 0; v[gi] = (v[gi] ?? 0) + 1; out.dept[dept] = v;
  }
  out.k4 = inp.coaching.filter(c => nowMs - Number(c.age_days ?? 0) * DAY <= T).length
    + (inp.coachingClosed ?? []).filter(c => Date.parse(c.opened_at) <= T && Date.parse(c.resolved_at) > T).length;
  out.k5 = inp.renewals.filter(c => { const end = c['deadline'] ? String(c['deadline']).slice(0, 10) : bkkDate(nowMs + Number(c.age_days ?? 0) * DAY); return end < date; }).length
    + (inp.renewalsDecided ?? []).filter(r => r.end_date < date && bkkDate(Date.parse(r.decided_at)) > date).length;
  out.k3 = date === bkkDate(nowMs) ? inp.k3Today : inp.snapshots.find(s => s.metric === 'K3_UNASSIGNED' && s.dim_key === 'ALL' && s.snapshot_date === date)?.value ?? null;
  return out;
}

export type Point = { date: string; T: number; isToday: boolean };
/** Points within period clipped to [earliest, today]: month ends, Sundays or days; last point = today when period includes it. */
export function historyPoints(p: Period, now: string, mode: 'month' | 'week' | 'day', earliest?: string): Point[] {
  const nowMs = Date.parse(now), today = bkkDate(nowMs);
  let from = p.from; if (earliest && from < earliest) from = earliest;
  const to = p.to < today ? p.to : today, out: Point[] = [];
  if (from > to) return out;
  for (let d = Date.parse(`${from}T00:00:00Z`); ; d += DAY) {
    const date = new Date(d).toISOString().slice(0, 10); if (date > to) break;
    const next = new Date(d + DAY).toISOString().slice(0, 10), isEnd = date === to;
    const pick = mode === 'day' || isEnd || (mode === 'month' ? next.slice(8) === '01' : new Date(d).getUTCDay() === 0);
    if (pick) out.push({ date, T: date === today ? nowMs : endOfBkkDay(date), isToday: date === today });
  }
  return out;
}
export const monthsIn = (p: Period, now: string, earliest?: string) => { const pts = historyPoints(p, now, 'month', earliest); return pts.length; };
export function periodStats(p: Period, inp: BacklogInput, pick: (b: Backlog) => number | null, earliest?: string) {
  const vals = historyPoints(p, inp.now, 'day', earliest).map(pt => pick(backlogAsOf(pt.T, inp)));
  const ok = vals.filter((v): v is number => v != null);
  return { avg: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null, peak: ok.length ? Math.max(...ok) : null, n_days_with_data: ok.length, n_days: vals.length };
}

/* ---------------- §3 time metrics ---------------- */
export type Timed = { days: number | null; at: string };
const days = (a: number, b: number) => Math.max(0, (b - a) / DAY);
/** Accept: first exit from open not into resolved/closed. null days = unmeasurable (in N not n); undefined = no event yet. */
export function acceptTime(r: WorkRow, acts: ActMap): Timed | undefined {
  const created = Date.parse(r.created_at);
  if (r.source_kind === 'CASE') {
    const first = changes(acts.get(r.case!.id), 'STATUS_CHANGE').find(c => c.from === 'open');
    if (!first) return undefined;
    return { days: CASE_CLOSED(first.to) ? null : days(created, first.at), at: new Date(first.at).toISOString() };
  }
  const audit = [...r.l0!.audit].sort((a, b) => a.at.localeCompare(b.at));
  const acc = audit.find(a => a.to_status === 'ACK' || a.to_status === 'IN_PROGRESS');
  if (acc) return { days: days(created, Date.parse(acc.at)), at: acc.at };
  const done = audit.find(a => a.to_status === 'DONE' || a.to_status === 'CANCELLED');
  return done ? { days: null, at: done.at } : undefined;
}
/** Net close: created → last entry into resolved/closed minus waiting time. L0 CANCELLED / not closed → undefined. */
export function netCloseTime(r: WorkRow, acts: ActMap): Timed | undefined {
  const created = Date.parse(r.created_at);
  if (r.source_kind === 'CASE') {
    const t = r.case!; if (!CASE_CLOSED(t.status)) return undefined;
    const ch = changes(acts.get(t.id), 'STATUS_CHANGE');
    const last = [...ch].reverse().find(c => CASE_CLOSED(c.to));
    const closeAt = last?.at ?? (t.resolved_at ? Date.parse(t.resolved_at) : null);
    if (closeAt == null) return undefined;
    let wait = 0, since: number | null = null;
    for (const c of ch) { if (c.at > closeAt) break; if (c.to === 'waiting' && since == null) since = c.at; else if (c.to !== 'waiting' && since != null) { wait += c.at - since; since = null; } }
    if (since != null) wait += closeAt - since;
    return { days: Math.max(0, (closeAt - created - wait) / DAY), at: new Date(closeAt).toISOString() };
  }
  if (r.l0!.status !== 'DONE') return undefined;
  const done = [...r.l0!.audit].sort((a, b) => a.at.localeCompare(b.at)).reverse().find(a => a.to_status === 'DONE');
  return done ? { days: days(created, Date.parse(done.at)), at: done.at } : undefined;
}
export const wasReopened = (r: WorkRow, acts: ActMap) => r.source_kind === 'CASE' && changes(acts.get(r.case!.id), 'STATUS_CHANGE').some(c => CASE_CLOSED(c.from) && !CASE_CLOSED(c.to));
export function median(xs: number[]): number | null { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
const inP = (iso: string | null | undefined, p: Period) => !!iso && bkkDate(Date.parse(iso)) >= p.from && bkkDate(Date.parse(iso)) <= p.to;
export function metricSummary(xs: (Timed | undefined)[], p: Period) { const inside = xs.filter((x): x is Timed => !!x && inP(x.at, p)); const ok = inside.map(x => x.days).filter((d): d is number => d != null); return { median: median(ok), n: ok.length, N: inside.length }; }

/* ---------------- ⑥ incoming by category ---------------- */
export const L0_TYPE_LABEL: Record<string, string> = { SERVICING_STALL: 'การ์ด Servicing ค้าง', GRADE_RISK: 'ลูกหนี้เกรด D', RENEWAL_DUE: 'ใกล้ครบ / เลยต่ออายุ', CONTRACT_FOLLOWUP: 'ติดตามสัญญา BD-AC', UPSELL_PITCH: 'Cross-sell', SURVEY_LOW: 'Survey ต่ำ' };
export function categoryIncoming(rows: WorkRow[], categories: Category[], p: Period) {
  const created = rows.filter(r => inP(r.created_at, p)), cases = created.filter(r => r.source_kind === 'CASE'), l0 = created.filter(r => r.source_kind === 'L0');
  const domains = ['ORM', 'MARCOM', 'PS', 'AC'].map(domain => {
    const mine = cases.filter(r => (categories.find(c => c.code === r.case!.category_id)?.domain ?? r.dept) === domain);
    const subs = [...new Set(mine.map(r => r.case!.category_id))].map(code => ({ code, label: categories.find(c => c.code === code)?.subcategory_label_th ?? code, n: mine.filter(r => r.case!.category_id === code).length })).sort((a, b) => b.n - a.n);
    return { domain, n: mine.length, subs };
  }).filter(d => d.n > 0).sort((a, b) => b.n - a.n);
  const types = [...new Set(l0.map(r => r.l0!.type))].map(type => ({ type, label: L0_TYPE_LABEL[type] ?? type, n: l0.filter(r => r.l0!.type === type).length })).sort((a, b) => b.n - a.n);
  return { domains, types, psN: cases.length, l0N: l0.length };
}

/* ---------------- ⑦ workload per team ---------------- */
export type WorkDept = 'ORM' | 'MARCOM' | 'PS' | 'AC' | 'BD';
export const ORM_ROWS = ['ORM-A', 'ORM-B', 'ORM-C', 'ORM-D', 'ORM-E', 'ORM-REACTIVE'];
export const teamLabelOf = (k: string) => (k === 'ORM-REACTIVE' ? 'Re-active' : k === 'UNSET' ? 'ไม่ระบุทีม' : k === 'MARCOM' ? 'Marcom' : k);
export const ormKey = (t: string | null | undefined) => (t ? `ORM-${t === 'RE_ACTIVE' ? 'REACTIVE' : t.replace(/^ORM-/, '')}` : 'UNSET');
const liveTeam = (dept: string, care: HotelCare | undefined) => (dept === 'ORM' ? ormKey(care?.orm_team) : dept);
const stampTeam = (team: string | null | undefined, fallbackDept: string) => (team ? { dept: team.startsWith('ORM') ? 'ORM' : team, team } : { dept: fallbackDept, team: fallbackDept === 'ORM' ? 'UNSET' : fallbackDept });
export type TeamRow = { key: string; label: string; inN: number; closedN: number; openNow: number; accept: { median: number | null; n: number; N: number }; close: { median: number | null; n: number; N: number }; reopen: { n: number; N: number } | null; hotels: number | null; per10: number | null; backfill: number };
export function workload(dept: WorkDept, rows: WorkRow[], acts: ActMap, care: HotelCare[], p: Period, people: string[] = []): TeamRow[] {
  const byHotel = new Map(care.map(c => [c.hotel_id, c])), who = new Set(people);
  const att = rows.map(r => {
    const c = byHotel.get(r.hotel_id ?? '');
    if (r.source_kind === 'L0') { const a = { dept: r.dept as string, team: liveTeam(r.dept, c) }; return { r, create: a, close: a, okCreate: true, okClose: true }; }
    const t = r.case!, initial = caseDeptAt(r, acts, Date.parse(t.created_at)), closeDept = t.resolved_at ? caseDeptAt(r, acts, Date.parse(t.resolved_at)) : r.dept;
    return { r, create: stampTeam(t.resp_team_at_create, initial), close: stampTeam(t.resp_team_at_close, closeDept), okCreate: !who.size || who.has(t.resp_id_at_create ?? ''), okClose: !who.size || who.has(t.resp_id_at_close ?? '') };
  });
  const keys = dept === 'ORM' ? [...ORM_ROWS, 'UNSET'] : [dept];
  const out = keys.map(key => {
    const incoming = att.filter(a => a.create.dept === dept && a.create.team === key && a.okCreate && inP(a.r.created_at, p));
    const closeTimed = att.filter(a => a.close.dept === dept && a.close.team === key && a.okClose).map(a => ({ a, t: netCloseTime(a.r, acts) }));
    const closed = att.filter(a => a.close.dept === dept && a.close.team === key && a.okClose && inP(a.r.closed_at, p));
    const accepts = att.filter(a => a.create.dept === dept && a.create.team === key && a.okCreate).map(a => acceptTime(a.r, acts));
    const openNow = rows.filter(r => r.status_group !== 'CLOSED' && r.dept === dept && liveTeam(r.dept, byHotel.get(r.hotel_id ?? '')) === key).length;
    const closedCases = closed.filter(a => a.r.source_kind === 'CASE');
    const hotels = dept === 'BD' ? null : dept === 'ORM' ? care.filter(c => c.orm && ormKey(c.orm_team) === key).length : dept === 'MARCOM' ? care.filter(c => c.marcom).length : care.length;
    const scope = new Set([...incoming, ...closed].map(a => a.r.work_id));
    return { key, label: dept === 'ORM' ? teamLabelOf(key) : teamLabelOf(dept), inN: incoming.length, closedN: closed.length, openNow, accept: metricSummary(accepts, p), close: metricSummary(closeTimed.map(x => x.t), p),
      reopen: closedCases.length ? { n: closedCases.filter(a => wasReopened(a.r, acts)).length, N: closedCases.length } : null, hotels, per10: hotels ? (incoming.length / hotels) * 10 : null,
      backfill: att.filter(a => scope.has(a.r.work_id) && a.r.case?.stamp_source === 'BACKFILL').length };
  });
  return out.filter(r => (r.key !== 'UNSET' || r.inN + r.closedN + r.openNow > 0) && (!who.size || r.inN + r.closedN + r.openNow > 0));
}

/** R1.2 §5.4 — people inside one Workload team row (live responsible person, same rows as "ค้างตอนนี้"). */
export type PersonLoad = { name: string; missing: boolean; openNow: number; todo: number; doing: number };
export function workloadPeople(dept: WorkDept, key: string, rows: WorkRow[], care: HotelCare[]): PersonLoad[] {
  const byHotel = new Map(care.map(c => [c.hotel_id, c]));
  const mine = rows.filter(r => r.status_group !== 'CLOSED' && r.dept === dept && liveTeam(r.dept, byHotel.get(r.hotel_id ?? '')) === key);
  const m = new Map<string, PersonLoad>();
  for (const r of mine) {
    const name = r.responsible_name ?? 'ยังไม่ระบุผู้ดูแล';
    const v = m.get(name) ?? { name, missing: !r.responsible_name, openNow: 0, todo: 0, doing: 0 };
    v.openNow++; if (r.status_group === 'OPEN') v.todo++; if (r.status_group === 'IN_PROGRESS') v.doing++;
    m.set(name, v);
  }
  return [...m.values()].sort((a, b) => b.openNow - a.openNow || Number(a.missing) - Number(b.missing) || a.name.localeCompare(b.name));
}

/* ---------------- snapshot job rows (post-step after Alert BOT) ---------------- */
export function snapshotRowsFor(date: string, T: number, inp: BacklogInput, source: 'JOB' | 'CATCHUP', k3?: { all: number; roles: Record<string, number> }): SnapshotRow[] {
  const b = backlogAsOf(T, inp), row = (metric: SnapshotRow['metric'], dim_key: string, value: number, threshold_used: number | null = null): SnapshotRow => ({ snapshot_date: date, metric, dim_key, value, threshold_used, source });
  const out = [row('K1_OPEN', 'ALL', b.k1), row('K2_OVERDUE', 'ALL', b.k2, b.k2Threshold), row('K4_COACHING', 'ALL', b.k4), row('K5_RENEWAL_EXPIRED', 'ALL', b.k5)];
  for (const [d, v] of Object.entries(b.dept)) { const key = d === 'อื่น ๆ' ? 'OTHER' : d; out.push(row('DEPT_OPEN', key, v[0] + v[1] + v[2]), row('DEPT_OPEN', `${key}|OPEN`, v[0]), row('DEPT_OPEN', `${key}|IN_PROGRESS`, v[1]), row('DEPT_OPEN', `${key}|WAITING`, v[2])); }
  if (source === 'JOB' && k3) { out.push(row('K3_UNASSIGNED', 'ALL', k3.all)); for (const [r, v] of Object.entries(k3.roles)) out.push(row('K3_UNASSIGNED', `ROLE:${r}`, v)); }
  return out;
}
/** Missing dates in the catch-up window (excluding today). */
export function missingDates(existing: Set<string>, today: string, windowDays: number): string[] {
  const out: string[] = []; for (let i = windowDays; i >= 1; i--) { const d = new Date(Date.parse(`${today}T00:00:00Z`) - i * DAY).toISOString().slice(0, 10); if (!existing.has(d)) out.push(d); } return out;
}
