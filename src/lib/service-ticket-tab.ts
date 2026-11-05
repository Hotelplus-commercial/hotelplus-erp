/* PS Dashboard · Tab "ติดตามงานผู้ให้บริการ" R1 (ST21–ST45) — pure read-only helpers named after the §2 views.
 * Source: vServiceTickets() rows (service-tickets.ts, file 1). No database view is created or read; nothing here writes.
 * Meetings come from getMeetings() (+ tab DEMO additions), caretaker from meeting-tab-r1 caretakerOf(), health from the
 * Contract Health engine rows (buildRows, same inputs as card ⑦) — passed in by the caller, never recomputed here. */
import { addDays, daysBetween, medianSolveDays, SVC_DEPTS, type DisplayStatus, type DueState, type ServiceTicketRow, type SvcDept, type TicketCategory } from './service-tickets';

export type DeptFilter = 'ALL' | SvcDept;
export const DEPT_TH: Record<SvcDept, string> = { ORM: 'ORM', MARCOM: 'Marcom', AC: 'AC', BD: 'BD' };
export const OPEN_STATUSES: DisplayStatus[] = ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY'];
const isOpenSt = (s: DisplayStatus) => OPEN_STATUSES.includes(s);
export const byDept = (rows: ServiceTicketRow[], dept: DeptFilter) => (dept === 'ALL' ? rows : rows.filter((r) => r.dept === dept));

/* ---------- v_stab_open ---------- */
/** Open counted rows (no CANCELLED, no SOLVED) for the department filter. */
export function vStabOpen(rows: ServiceTicketRow[], dept: DeptFilter = 'ALL'): ServiceTicketRow[] {
  return byDept(rows, dept).filter((r) => r.is_counted && isOpenSt(r.display_status));
}
/** ST4 — "ยังไม่ใส่วันที่" = New + accepted rows that still run on the AUTO due date. */
export const noDateYet = (r: ServiceTicketRow) => r.display_status === 'NEW' || r.due_source === 'AUTO';

export type OpenSummary = {
  total: number; noDate: number; dated: number; overdue: number;
  dueBar: Record<DueState, number>; statusBar: Record<'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY', number>;
  remark: { hadWait: number; notAccepted: number; working: number };
  depts: { dept: SvcDept; total: number; NEW: number; IN_PROGRESS: number; WAITING_CUSTOMER: number; WAITING_THIRD_PARTY: number; overdue: number; hadWait: number; notAccepted: number }[];
  noDueBell: number;
};
export function openSummary(open: ServiceTicketRow[], allOpen: ServiceTicketRow[] = open): OpenSummary {
  const c = (f: (r: ServiceTicketRow) => boolean, rs = open) => rs.filter(f).length;
  const od = open.filter((r) => r.due_state === 'OVERDUE');
  return {
    total: open.length, noDate: c(noDateYet), dated: c((r) => !noDateYet(r)), overdue: od.length,
    dueBar: { NO_DATE: c((r) => r.due_state === 'NO_DATE'), ON_TIME: c((r) => r.due_state === 'ON_TIME'), OVERDUE: od.length },
    statusBar: { NEW: c((r) => r.display_status === 'NEW'), IN_PROGRESS: c((r) => r.display_status === 'IN_PROGRESS'), WAITING_CUSTOMER: c((r) => r.display_status === 'WAITING_CUSTOMER'), WAITING_THIRD_PARTY: c((r) => r.display_status === 'WAITING_THIRD_PARTY') },
    remark: { hadWait: c((r) => r.overdue_remark === 'HAD_WAIT', od), notAccepted: c((r) => r.overdue_remark === 'NOT_ACCEPTED', od), working: c((r) => r.overdue_remark == null, od) },
    depts: SVC_DEPTS.map((dept) => {
      const d = allOpen.filter((r) => r.dept === dept); const dOd = d.filter((r) => r.due_state === 'OVERDUE');
      return { dept, total: d.length, NEW: c((r) => r.display_status === 'NEW', d), IN_PROGRESS: c((r) => r.display_status === 'IN_PROGRESS', d), WAITING_CUSTOMER: c((r) => r.display_status === 'WAITING_CUSTOMER', d), WAITING_THIRD_PARTY: c((r) => r.display_status === 'WAITING_THIRD_PARTY', d), overdue: dOd.length, hadWait: c((r) => r.overdue_remark === 'HAD_WAIT', dOd), notAccepted: c((r) => r.overdue_remark === 'NOT_ACCEPTED', dOd) };
    }),
    noDueBell: c((r) => r.display_status === 'NEW'),
  };
}

/* ---------- v_stab_period ---------- */
export type Range = { from: string; to: string };
const inR = (d: string | null | undefined, p: Range) => !!d && d >= p.from && d <= p.to;
export const solvedDate = (r: ServiceTicketRow) => (r.display_status === 'SOLVED' && r.solved_at ? r.solved_at.slice(0, 10) : null);
const bkk = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 10));
export const solvedDay = (r: ServiceTicketRow) => (r.display_status === 'SOLVED' && r.solved_at ? bkk(r.solved_at) : null);
export const acceptedFlag = (r: ServiceTicketRow) => r.accepted || r.display_status !== 'NEW';

export type PeriodStats = {
  created: number; solved: number; onTime: number; pct: number | null; median: number | null;
  cohort: { created: number; accepted: number; solvedOnTime: number; solvedLate: number; openNotAccepted: number; openAccepted: number };
};
/** Event counts by date in the period + cohort of tickets created in the period (CANCELLED excluded). */
export function vStabPeriod(rows: ServiceTicketRow[], p: Range): PeriodStats {
  const cnt = rows.filter((r) => r.is_counted);
  const solved = cnt.filter((r) => inR(solvedDay(r), p));
  const onTime = solved.filter((r) => r.due_state === 'ON_TIME').length;
  const born = cnt.filter((r) => inR(r.created_date, p));
  const bSolved = born.filter((r) => r.display_status === 'SOLVED');
  const bOpen = born.filter((r) => r.display_status !== 'SOLVED');
  return {
    created: born.length, solved: solved.length, onTime, pct: solved.length ? Math.round((onTime / solved.length) * 100) : null, median: medianSolveDays(solved),
    cohort: { created: born.length, accepted: born.filter(acceptedFlag).length, solvedOnTime: bSolved.filter((r) => r.due_state === 'ON_TIME').length, solvedLate: bSolved.filter((r) => r.due_state === 'OVERDUE').length, openNotAccepted: bOpen.filter((r) => !acceptedFlag(r)).length, openAccepted: bOpen.filter(acceptedFlag).length },
  };
}

/* ---------- ③ granularity buckets ---------- */
export type Gran = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year' | 'custom';
export const GRAN_TH: Record<Gran, string> = { day: 'รายวัน', week: 'รายสัปดาห์', month: 'รายเดือน', quarter: 'รายไตรมาส', half: 'ราย 6 เดือน', year: 'ราย 12 เดือน', custom: 'Custom' };
export type Bucket = { from: string; to: string; label: string; current: boolean };
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const be2 = (y: number) => String((y + 543) % 100).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const P = (s: string) => s.split('-').map(Number) as [number, number, number];
export const thDay = (d: string) => { const [, m, dd] = P(d); return `${dd} ${MON[m - 1]}`; };
export const thMonYY = (d: string) => { const [y, m] = P(d); return `${MON[m - 1]} ${be2(y)}`; };
/** Custom auto-granularity: ≤ 45 days daily · ≤ 180 weekly · else monthly. */
export const autoGran = (from: string, to: string): Exclude<Gran, 'custom'> => { const n = daysBetween(from, to) + 1; return n <= 45 ? 'day' : n <= 180 ? 'week' : 'month'; };
export function buckets(g: Gran, today: string, custom?: Range): Bucket[] {
  const [y, m, d] = P(today);
  const out: Bucket[] = [];
  const push = (from: string, to: string, label: string) => { const cur = to >= today; out.push({ from, to: cur ? today : to, label: cur ? `${label}*` : label, current: cur }); };
  if (g === 'custom' && custom) {
    const gg = autoGran(custom.from, custom.to);
    return buckets(gg, custom.to).filter((b) => b.to >= custom.from).map((b) => ({ ...b, from: b.from < custom.from ? custom.from : b.from }));
  }
  if (g === 'day') for (let i = 29; i >= 0; i--) { const x = addDays(today, -i); push(x, x, thDay(x)); }
  if (g === 'week') { const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; const mon = addDays(today, -dow); for (let i = 11; i >= 0; i--) { const f = addDays(mon, -7 * i); push(f, addDays(f, 6), thDay(f)); } }
  if (g === 'month' || g === 'custom') for (let i = 11; i >= 0; i--) { const f = ymd(y, m - 1 - i, 1); const t = ymd(y, m - i, 0); push(f, t, thMonYY(f)); }
  if (g === 'quarter') { const q = Math.floor((m - 1) / 3); for (let i = 7; i >= 0; i--) { const qq = q - i; const f = ymd(y, qq * 3, 1); const t = ymd(y, qq * 3 + 3, 0); const [fy] = P(f); push(f, t, `Q${((qq % 4) + 4) % 4 + 1}/${be2(fy)}`); } }
  if (g === 'half') { const h = m <= 6 ? 0 : 1; for (let i = 3; i >= 0; i--) { const hh = h - i; const f = ymd(y, hh * 6, 1); const t = ymd(y, hh * 6 + 6, 0); const [fy] = P(f); push(f, t, `H${((hh % 2) + 2) % 2 + 1}/${be2(fy)}`); } }
  if (g === 'year') for (let i = 2; i >= 0; i--) push(ymd(y - i, 0, 1), ymd(y - i, 11, 31), `ปี ${be2(y - i)}`);
  void d;
  return out;
}
/** Day a ticket became overdue (effective due + 1), if it did by `today`. */
export function overdueDay(r: ServiceTicketRow, today: string): string | null {
  const sd = solvedDay(r); const first = addDays(r.effective_due_date, 1);
  if (sd) return sd > r.effective_due_date ? first : null;
  return today > r.effective_due_date ? first : null;
}
export type CumPoint = Bucket & { created: number; solved: number; overdue: number; cumCreated: number; cumSolved: number; cumOverdue: number; median: number | null };
export function cumulative(rows: ServiceTicketRow[], bs: Bucket[], today: string): CumPoint[] {
  const cnt = rows.filter((r) => r.is_counted);
  let cc = 0, cs = 0, co = 0;
  return bs.map((b) => {
    const created = cnt.filter((r) => inR(r.created_date, b)).length;
    const sv = cnt.filter((r) => inR(solvedDay(r), b));
    const overdue = cnt.filter((r) => inR(overdueDay(r, today), b)).length;
    cc += created; cs += sv.length; co += overdue;
    return { ...b, created, solved: sv.length, overdue, cumCreated: cc, cumSolved: cs, cumOverdue: co, median: medianSolveDays(sv) };
  });
}

/* ---------- ④ categories ---------- */
export type CatSort = 'new' | 'median' | 'open' | 'overdue';
export type CatRow = { key: string; name: string; depts: SvcDept[]; created: number; median: number | null; prevMedian: number | null; open: number; overdue: number };
export function categoryRows(rows: ServiceTicketRow[], cats: TicketCategory[], dept: DeptFilter, a: Range, b: Range): CatRow[] {
  const scoped = byDept(rows, dept).filter((r) => r.is_counted);
  const key = (r: ServiceTicketRow) => cats.find((c) => c.id === r.category_id)?.key ?? r.category_id.split(':')[0] ?? 'other';
  const keys = new Map<string, { name: string; depts: Set<SvcDept> }>();
  for (const c of cats) if (!c.hidden && (dept === 'ALL' || c.dept === dept)) { const e = keys.get(c.key) ?? { name: c.name_th, depts: new Set() }; e.depts.add(c.dept); keys.set(c.key, e); }
  for (const r of scoped) if (!keys.has(key(r)) && (inR(r.created_date, a) || isOpenSt(r.display_status))) keys.set(key(r), { name: r.category_name_th, depts: new Set([r.dept]) }); // hidden categories that still have tickets
  return [...keys].map(([k, e]) => {
    const rs = scoped.filter((r) => key(r) === k);
    return { key: k, name: e.name, depts: [...e.depts], created: rs.filter((r) => inR(r.created_date, a)).length, median: medianSolveDays(rs.filter((r) => inR(solvedDay(r), a))), prevMedian: medianSolveDays(rs.filter((r) => inR(solvedDay(r), b))), open: rs.filter((r) => isOpenSt(r.display_status)).length, overdue: rs.filter((r) => isOpenSt(r.display_status) && r.due_state === 'OVERDUE').length };
  });
}
export function sortCats(rows: CatRow[], by: CatSort, desc: boolean): CatRow[] {
  const v = (r: CatRow) => (by === 'new' ? r.created : by === 'median' ? r.median ?? -1 : by === 'open' ? r.open : r.overdue);
  return [...rows].sort((x, y) => (desc ? v(y) - v(x) : v(x) - v(y)) || x.name.localeCompare(y.name));
}
/** ST35 — first 5 by the current sort + the slowest-median category (pinned) when outside the 5. */
export function topCats(sorted: CatRow[]): { rows: CatRow[]; pinned: string | null; hidden: number } {
  const withMed = sorted.filter((r) => r.median != null);
  const slow = withMed.length ? withMed.reduce((a, b) => (b.median! > a.median! ? b : a)) : null;
  const top = sorted.slice(0, 5);
  const pin = slow && !top.includes(slow) ? slow : null;
  const rows = pin ? [...top, pin] : top;
  return { rows, pinned: slow?.key ?? null, hidden: sorted.length - rows.length };
}
export const medianTone = (d: number | null) => (d == null ? 'none' : d > 10 ? 'red' : d >= 8 ? 'amber' : 'grey');

/* ---------- v_stab_meetings ---------- */
export type HealthInfo = { tier: 'R' | 'A' | 'G'; labels: { key: string; label: string; dir: 'bad' | 'good' | 'opp'; amber?: boolean }[] } | null;
export type StabMeetingInput = { id: string; hotel_id: string | null; hotel: string; service: 'ORM' | 'MARCOM'; date: string; ae: string; caretaker: string; health: HealthInfo };
export type StabMeetingCard = StabMeetingInput & { daysTo: number; tickets: ServiceTicketRow[]; overdue: number; followups: number; urgent: boolean; reasons: string[] };
/** ST37 — urgent when ≤ 3 days, any overdue open ticket, or Contract Health red. */
export function urgencyOf(daysTo: number, overdue: number, tier: 'R' | 'A' | 'G' | null): { urgent: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (daysTo <= 3) reasons.push(`ประชุมใน ${daysTo} วัน`);
  if (overdue > 0) reasons.push(`เลยกำหนด ${overdue}`);
  if (tier === 'R') reasons.push('สุขภาพแดง');
  return { urgent: reasons.length > 0, reasons };
}
/** Confirmed monthly meetings in [today+1, today+7] with their open service tickets (same hotel, department filter applied). */
export function vStabMeetings(meetings: StabMeetingInput[], open: ServiceTicketRow[], today: string): { cards: StabMeetingCard[]; ready: StabMeetingInput[] } {
  const lo = addDays(today, 1), hi = addDays(today, 7);
  const win = meetings.filter((m) => m.date >= lo && m.date <= hi);
  const cards: StabMeetingCard[] = []; const ready: StabMeetingInput[] = [];
  for (const m of win) {
    const tickets = open.filter((r) => !!m.hotel_id && r.hotel_id === m.hotel_id);
    if (!tickets.length) { ready.push(m); continue; }
    const daysTo = daysBetween(today, m.date); const overdue = tickets.filter((r) => r.due_state === 'OVERDUE').length;
    const u = urgencyOf(daysTo, overdue, m.health?.tier ?? null);
    cards.push({ ...m, daysTo, tickets, overdue, followups: tickets.reduce((s, r) => s + r.followup_count, 0), ...u });
  }
  cards.sort((a, b) => (a.urgent === b.urgent ? a.date.localeCompare(b.date) : a.urgent ? -1 : 1));
  ready.sort((a, b) => a.date.localeCompare(b.date));
  return { cards, ready };
}

/* ---------- ⑥ search + order ---------- */
export type Token = { kind: 'word'; v: string } | { kind: 'assignee' | 'opener'; v: string } | { kind: 'age'; op: '>' | '>=' | '<' | '<=' | '='; n: number };
export function parseSearch(q: string): Token[] {
  return q.trim().split(/\s+/).filter(Boolean).map((t): Token => {
    const age = /^อายุ(>=|<=|>|<|=)(\d+)$/.exec(t); if (age) return { kind: 'age', op: age[1] as '>', n: Number(age[2]) };
    if (t.startsWith('ผู้รับ:')) return { kind: 'assignee', v: t.slice(6).toLowerCase() };
    if (t.startsWith('เปิดโดย:')) return { kind: 'opener', v: t.slice(8).toLowerCase() };
    return { kind: 'word', v: t.toLowerCase() };
  });
}
export function matchSearch(r: ServiceTicketRow, toks: Token[]): boolean {
  return toks.every((t) => {
    if (t.kind === 'age') { const a = r.age_days; return t.op === '>' ? a > t.n : t.op === '>=' ? a >= t.n : t.op === '<' ? a < t.n : t.op === '<=' ? a <= t.n : a === t.n; }
    if (t.kind === 'assignee') return (r.assignee_label ?? '').toLowerCase().includes(t.v);
    if (t.kind === 'opener') return r.opened_by_label.toLowerCase().includes(t.v);
    return [r.ticket_no, r.hotel_name, r.subject, r.assignee_label ?? '', r.opened_by_label, r.category_name_th].join(' ').toLowerCase().includes(t.v);
  });
}
/** Open first by days to effective due (most overdue on top), solved last. */
export function listOrder(a: ServiceTicketRow, b: ServiceTicketRow): number {
  const sa = a.display_status === 'SOLVED', sb = b.display_status === 'SOLVED';
  if (sa !== sb) return sa ? 1 : -1;
  if (sa) return (b.solved_at ?? '').localeCompare(a.solved_at ?? '');
  return a.effective_due_date.localeCompare(b.effective_due_date) || a.ticket_no.localeCompare(b.ticket_no);
}
export type ListFilter = { q: string; status: 'ALL' | DisplayStatus; due: 'ALL' | DueState; cat: string; showSolved: boolean };
export const EMPTY_LIST_FILTER: ListFilter = { q: '', status: 'ALL', due: 'ALL', cat: 'ALL', showSolved: false };
export function listRows(rows: ServiceTicketRow[], dept: DeptFilter, f: ListFilter, today: string): ServiceTicketRow[] {
  const toks = parseSearch(f.q); const since = addDays(today, -30);
  return byDept(rows, dept).filter((r) => r.is_counted)
    .filter((r) => (isOpenSt(r.display_status) ? true : f.showSolved && r.display_status === 'SOLVED' && (solvedDay(r) ?? '') >= since))
    .filter((r) => f.status === 'ALL' || r.display_status === f.status)
    .filter((r) => f.due === 'ALL' || (r.due_state === f.due && isOpenSt(r.display_status)))
    .filter((r) => f.cat === 'ALL' || r.category_id === f.cat || r.category_id.split(':')[0] === f.cat)
    .filter((r) => matchSearch(r, toks)).sort(listOrder);
}
export const suggestions = (rows: ServiceTicketRow[]) => [...new Set(rows.map((r) => r.assignee_label).filter((x): x is string => !!x).map((x) => `ผู้รับ:${x.split(' ')[0]}`)), ...new Set(rows.map((r) => `เปิดโดย:${r.opened_by_label.split(' ')[0]}`)), 'อายุ>3', 'อายุ>7', 'อายุ>10'];
