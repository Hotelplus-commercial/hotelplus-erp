/* Task v2.1 demo fixture (§12) — deterministic: every date/count is hand-placed, no random values.
 * Oracle (reconciles with §13): month-ends May–Oct K1 20,22,20,24,27,31 · K2 2,2,1,3,3,5 · K3 —,—,—,—,7,6 · K4 8,7,9,9,9,9 · K5 0,1,0,1,1,2;
 * end of Apr K1 18 · K2 2 · K4 8 · K5 0; Nov–Apr K1 12,14,15,15,16,18; ⑥ PS 31 / L0 41; ⑦ ORM-A most incoming. */
import type { Activity, Category, HotelCare, MonitorRow, SnapshotRow, Team, Ticket } from './task-tickets';
import { stampOf } from './task-tickets';
import { demoTaskHotels } from './ps-demo-fixture';
import type { Dept, L0Ticket, L0Status, TicketType } from './tickets-l0';
import type { FlowRow } from './task-worklist';
export const TASK_DEMO_NOW = '2026-10-17T12:00:00.000Z';
const DAY = 864e5;
const ORM_TEAM_CYCLE = ['A', 'B', 'C', 'D', 'E', 'RE_ACTIVE'];
/** Demo caretakers + an orm_team per hotel (so ORM rows always resolve a sub-team). */
export function demoCareHotels(): HotelCare[] { return demoTaskHotels().map((h, i) => ({ ...h, orm_team: ORM_TEAM_CYCLE[i % ORM_TEAM_CYCLE.length] ?? 'A' })); }
/** 09:00Z on y-m-d plus fractional days. */
const at = (y: number, m: number, d: number, plusDays = 0) => new Date(Date.UTC(y, m - 1, d, 9) + plusDays * DAY).toISOString();
const D = (m: number, d: number, plus = 0) => at(2026, m, d, plus);
const plus = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

type OrmTeam = 'A' | 'B' | 'C' | 'D' | 'E' | 'RE_ACTIVE';
type Lane = OrmTeam | 'MARCOM' | 'PS' | 'AC' | 'BD' | 'AUTO' | 'OFFICE';
const deptOf = (l: Lane): Dept => (l.length === 1 || l === 'RE_ACTIVE' ? 'ORM' : l as Dept);
/** Spec §12 ⑦ medians used as per-lane accept / net-close durations (days). */
const ACCEPT: Record<string, number> = { A: 0.4, B: 0.3, C: 0.8, D: 0.5, E: 0.2, RE_ACTIVE: 1.2, MARCOM: 0.6, PS: 0.5, AC: 0.7, BD: 1.0, AUTO: 0.5, OFFICE: 0.5 };
const CLOSE: Record<string, number> = { A: 2.5, B: 1.8, C: 3.1, D: 2.0, E: 1.5, RE_ACTIVE: 4.0, MARCOM: 2.7, PS: 2.2, AC: 3.4, BD: 3.8, AUTO: 2, OFFICE: 2 };

type CaseSpec = { lane: Lane; created: string; closed?: string; now: 'open' | 'in-progress' | 'waiting' | 'resolved'; waitFrom?: string; waitTo?: string; straight?: boolean; reopen?: boolean; backfill?: boolean };
type L0Spec = { lane: Lane; created: string; closed?: string; cancelled?: boolean; now?: 'NEW' | 'ACK'; type?: TicketType };

/* ---------- PS cases (31 in May–Oct + 4 before May) ---------- */
function caseSpecs(): CaseSpec[] {
  const s: CaseSpec[] = [
    // before May: two long-running cases (K2 Apr/May/Jun) and two long waits
    { lane: 'A', created: D(4, 10), closed: D(6, 15), now: 'resolved', backfill: true },
    { lane: 'B', created: D(4, 20), closed: D(7, 10), now: 'resolved' },
    { lane: 'MARCOM', created: D(1, 15), now: 'waiting', waitFrom: D(1, 16) },
    { lane: 'PS', created: D(3, 10), now: 'waiting', waitFrom: D(3, 11) },
    // long-running in period (drive K2 month-ends)
    { lane: 'D', created: D(6, 1), closed: D(7, 20), now: 'resolved' },
    { lane: 'D', created: D(7, 10), closed: D(8, 20), now: 'resolved' },
    { lane: 'MARCOM', created: D(8, 15), closed: D(9, 10), now: 'resolved' },
    { lane: 'PS', created: D(8, 20), closed: D(9, 12), now: 'resolved' },
    // open today: overdue five (C5, C8, C10, C11, C12) + three young + four waiting
    { lane: 'A', created: D(8, 5), now: 'in-progress' },
    { lane: 'A', created: D(9, 5), now: 'in-progress' },
    { lane: 'MARCOM', created: D(9, 15), now: 'waiting', waitFrom: D(10, 5) },
    { lane: 'A', created: D(10, 1), now: 'in-progress' },
    { lane: 'B', created: D(10, 2), now: 'in-progress' },
    { lane: 'B', created: D(10, 8), now: 'open' },
    { lane: 'C', created: D(10, 15), now: 'open' },
    { lane: 'MARCOM', created: D(10, 16), now: 'open' },
    { lane: 'PS', created: D(10, 16), now: 'open' },
    { lane: 'PS', created: D(10, 10), now: 'waiting', waitFrom: D(10, 10, 0.3) },
    { lane: 'AC', created: D(10, 11), now: 'waiting', waitFrom: D(10, 11, 0.3) },
    { lane: 'AC', created: D(10, 12), now: 'waiting', waitFrom: D(10, 12, 0.3) },
  ];
  // 15 short cases, 3 per month May–Sep, opened and closed inside the month.
  const order: Lane[] = ['A', 'MARCOM', 'PS', 'B', 'MARCOM', 'AC', 'C', 'MARCOM', 'PS', 'E', 'MARCOM', 'AC', 'RE_ACTIVE', 'MARCOM', 'A'];
  order.forEach((lane, i) => {
    const created = D(5 + Math.floor(i / 3), [4, 9, 14][i % 3]!), closed = plus(created, CLOSE[lane]!);
    s.push({ lane, created, closed, now: 'resolved', straight: i === 0, reopen: i === 6, ...(i === 1 ? { waitFrom: plus(created, ACCEPT.MARCOM! + 0.3), waitTo: plus(created, ACCEPT.MARCOM! + 1.3) } : {}) });
  });
  return s;
}
/** Category per routed domain (⑥ §12) — one ORM↔Marcom swap keeps domain totals and shows a dept override. */
const CAT_QUEUE: Record<Team, string[]> = {
  ORM: ['ORM-REV', 'ORM-REV', 'ORM-REV', 'ORM-REV', 'ORM-CONN', 'ORM-CONN', 'ORM-CONN', 'ORM-RATE', 'ORM-RATE', 'ORM-CONT', 'ORM-CONT', 'ORM-RESV', 'ORM-CAMP', 'ORM-INFO'],
  MARCOM: ['MKT-CONT', 'MKT-CONT', 'MKT-CONT', 'MKT-ADS', 'MKT-ADS', 'MKT-ADS', 'MKT-KOL', 'MKT-OTHER'],
  PS: ['PS-ONOFF', 'PS-ONOFF', 'PS-COMPLAIN', 'PS-COMPLAIN', 'PS-CONTRACT'],
  AC: ['AC-PAY', 'AC-PAY', 'AC-PAY', 'AC-OTHER'],
};

/* ---------- L0 tickets (41 in May–Oct + 14 before May) ---------- */
function l0Specs(): L0Spec[] {
  const s: L0Spec[] = [];
  // before May: 12 in Nov 25 + 2 in Dec 25; four stay open, ten close in May–Oct (one cancelled).
  const preClose = [D(5, 20), D(6, 20), D(7, 20), D(8, 20), D(9, 20), D(10, 2), D(10, 4), D(10, 6), D(10, 8), D(10, 10)];
  const preLanes: Lane[] = ['A', 'B', 'C', 'D', 'E', 'MARCOM', 'PS', 'AC', 'AC', 'MARCOM'];
  s.push({ lane: 'AUTO', created: at(2025, 11, 10), now: 'NEW' }, { lane: 'OFFICE', created: at(2025, 11, 12), now: 'ACK' }, { lane: 'BD', created: at(2025, 11, 14), now: 'NEW' }, { lane: 'MARCOM', created: at(2025, 12, 5), now: 'ACK' });
  preLanes.forEach((lane, i) => s.push({ lane, created: i === 9 ? at(2025, 12, 12) : at(2025, 11, 16 + i), closed: preClose[i]!, cancelled: i === 7 }));
  // in period: created per month / closed in the same month (others stay open).
  const created = [6, 7, 6, 8, 11, 3], closedSame = [3, 4, 6, 5, 7, 3];
  const openLanes: Lane[] = ['BD', 'PS', 'AC', 'BD', 'MARCOM', 'C', 'BD', 'PS', 'D', 'AC', 'BD', 'MARCOM', 'E'];
  const closedLanes: Lane[] = ['PS', 'AC', 'BD', 'A', 'PS', 'AC', 'BD', 'MARCOM', 'PS', 'AC', 'BD', 'B', 'PS', 'AC', 'BD', 'MARCOM', 'PS', 'AC', 'BD', 'RE_ACTIVE', 'PS', 'AC', 'BD', 'PS', 'AC', 'BD', 'PS', 'BD'];
  let oi = 0, ci = 0, nw = 0;
  created.forEach((n, j) => { for (let k = 0; k < n; k++) {
    const day = 2 + 2 * k, c = D(5 + j, day);
    if (k < closedSame[j]!) { const lane = closedLanes[ci++]!; s.push({ lane, created: c, closed: plus(c, CLOSE[lane]!) }); }
    else s.push({ lane: openLanes[oi++]!, created: c, now: nw++ % 2 ? 'ACK' : 'NEW' });
  } });
  // Types (⑥ §12): ORM/Marcom → SERVICING_STALL · AC → GRADE_RISK · PS → RENEWAL_DUE ×8 + SURVEY_LOW ×2 · BD → CONTRACT_FOLLOWUP ×7 + UPSELL_PITCH ×5.
  let ps = 0, bd = 0;
  for (const t of s) {
    const inPeriod = t.created >= '2026-05-01', dept = deptOf(t.lane);
    t.type = dept === 'AC' ? 'GRADE_RISK' : dept === 'PS' ? (inPeriod && ps++ >= 8 ? 'SURVEY_LOW' : 'RENEWAL_DUE') : dept === 'BD' ? (inPeriod && bd++ >= 7 ? 'UPSELL_PITCH' : 'CONTRACT_FOLLOWUP') : 'SERVICING_STALL';
  }
  return s;
}

export function taskDemo(categories: Category[], hotels: HotelCare[]) {
  const cases: Ticket[] = [], tickets: L0Ticket[] = [], activity: Activity[] = [];
  const care = new Map(hotels.map(h => [h.hotel_id, h])), nowMs = Date.parse(TASK_DEMO_NOW);
  const missing = hotels.find(h => h.orm && !h.orm.member);
  const pools = new Map<Lane, HotelCare[]>(), cursor = new Map<Lane, number>();
  const pool = (lane: Lane) => {
    let p = pools.get(lane);
    if (!p) {
      const dept = deptOf(lane);
      p = dept === 'ORM' ? hotels.filter(h => h.orm && h.orm_team === lane) : dept === 'MARCOM' ? hotels.filter(h => h.marcom) : hotels;
      if (!p.length) p = hotels;
      if (missing && p.includes(missing)) p = [missing, ...p.filter(h => h !== missing)];
      pools.set(lane, p);
    }
    return p;
  };
  const hotelFor = (lane: Lane) => { const p = pool(lane), i = cursor.get(lane) ?? 0; cursor.set(lane, i + 1); return p[i % p.length]!; };
  const queue = Object.fromEntries(Object.entries(CAT_QUEUE).map(([k, v]) => [k, [...v]])) as Record<Team, string[]>;

  caseSpecs().forEach((sp, i) => {
    const team = deptOf(sp.lane) as Team, h = hotelFor(sp.lane), code = queue[team].shift() ?? categories.find(c => c.domain === team)?.code ?? '';
    const st = stampOf(team, care.get(h.hotel_id)), closed = sp.closed ?? null;
    const t: Ticket = { id: `task-demo-case-${i}`, case_no: `Case-${String(i + 1).padStart(6, '0')}`, hotel_id: h.hotel_id, hotel_name: h.hotel_name, title: ['ตรวจสอบราคาและข้อมูลโรงแรม', 'ติดตามเอกสารจากลูกค้า', 'ตรวจสอบแผนบริการ'][i % 3]!, description: 'ข้อมูลสาธิต', category_id: code, routed_team: team, status: sp.now, waiting_reason: sp.now === 'waiting' ? 'CUSTOMER' : null, created_by: 'PM (Alex)', created_at: sp.created, updated_at: closed ?? sp.waitFrom ?? sp.created, resolved_at: closed, revision: 0,
      resp_id_at_create: st.resp_id, resp_team_at_create: st.resp_team, resp_id_at_close: closed ? st.resp_id : null, resp_team_at_close: closed ? st.resp_team : null, stamp_source: sp.backfill ? 'BACKFILL' : 'LIVE' };
    cases.push(t);
    const act = (type: Activity['type'], body: string, when: string) => activity.push({ id: `${t.id}-a${activity.length}`, ticket_id: t.id, actor_id: t.created_by, type, body, at: when });
    act('CREATE', t.case_no, t.created_at);
    if (sp.straight && closed) { act('STATUS_CHANGE', 'open → resolved', closed); return; }
    if (sp.now === 'open') return;
    act('STATUS_CHANGE', 'open → in-progress', plus(t.created_at, Math.min(ACCEPT[sp.lane]!, sp.waitFrom ? (Date.parse(sp.waitFrom) - Date.parse(t.created_at)) / DAY / 2 : 99)));
    if (sp.waitFrom) act('STATUS_CHANGE', 'in-progress → waiting (CUSTOMER)', sp.waitFrom);
    if (sp.waitTo) act('STATUS_CHANGE', 'waiting (CUSTOMER) → in-progress', sp.waitTo);
    if (closed) {
      if (sp.reopen) { act('STATUS_CHANGE', 'in-progress → resolved', plus(closed, -1)); act('STATUS_CHANGE', 'resolved → in-progress', plus(closed, -0.5)); }
      act('STATUS_CHANGE', 'in-progress → resolved', closed);
    }
  });
  // Swap one ORM-routed and one Marcom-routed short case category (dept override, domain totals unchanged).
  const ormShort = cases.find(c => c.routed_team === 'ORM' && c.created_at >= '2026-05-01' && c.resolved_at && c.category_id === 'ORM-INFO');
  const mktShort = cases.find(c => c.routed_team === 'MARCOM' && c.created_at >= '2026-05-01' && c.resolved_at);
  if (ormShort && mktShort) [ormShort.category_id, mktShort.category_id] = [mktShort.category_id, ormShort.category_id];

  l0Specs().forEach((sp, i) => {
    const dept = deptOf(sp.lane), h = hotelFor(sp.lane), type = sp.type ?? 'SERVICING_STALL', bot = type === 'GRADE_RISK' || type === 'RENEWAL_DUE' || type === 'SURVEY_LOW';
    const final: L0Status = sp.closed ? (sp.cancelled ? 'CANCELLED' : 'DONE') : sp.now === 'ACK' ? 'ACK' : 'NEW';
    const audit: L0Ticket['audit'] = [{ at: sp.created, by: 'PM', from_status: null, to_status: 'NEW' }];
    if (final !== 'NEW' && final !== 'CANCELLED') audit.push({ at: plus(sp.created, ACCEPT[sp.lane]!), by: 'PM', from_status: 'NEW', to_status: 'ACK' });
    if (sp.closed) audit.push({ at: sp.closed, by: 'PM', from_status: final === 'CANCELLED' ? 'NEW' : 'ACK', to_status: final });
    tickets.push({ ticket_id: `TKT-DEMO-${String(i + 1).padStart(6, '0')}`, type, source_app: bot ? 'PS_DASHBOARD_BOT' : 'PS_DASHBOARD', created_by: bot ? 'SYSTEM:THE_OFFICE' : 'PM', target_dept: dept,
      subject_ref: { hotel_id: h.hotel_id, hotel_name: h.hotel_name, gap_service: 'Marcom', service_line: dept === 'MARCOM' ? 'Marcom' : 'ORM' },
      payload: { readiness_tier: '', chips: [], note: 'ติดตามงานจากต้นทาง', event_key: sp.created.slice(0, 7), signal_detail: { grade: 'D', renewal_due_date: '2026-10-23' }, phase: 'P2', sla_days: 7, days_in_phase: 10 },
      status: final, created_at: sp.created, revision: 0, audit } as L0Ticket);
  });

  const base = (i: number) => { const h = hotels[i % hotels.length]; return { hotel_id: h?.hotel_id ?? null, hotel_name: h?.hotel_name ?? '—', service_line: i % 2 ? 'Marcom' : 'ORM' }; };
  // K4: nine open coaching items (opened Apr ×5, Jun ×1, Jul ×3) + resolved history below.
  const coachAges = [180, 180, 180, 180, 180, 120, 95, 95, 95];
  const coaching: MonitorRow[] = []; let ci = 0;
  ([['GRM', 3, 2], ['Marcom Team Lead', 2, 1], ['PM', 1, 0]] as const).forEach(([coach, a, b], j) => { for (let i = 0; i < a + b; i++) coaching.push({ ...base(j + i), coach, status: i < a ? 'open' : 'in-progress', age_days: coachAges[ci++] ?? 0, resolved_30: 0 }); });
  const coachingClosed = [{ opened_at: D(3, 5), resolved_at: D(6, 10) }, { opened_at: D(3, 20), resolved_at: D(6, 20) }, { opened_at: D(4, 15), resolved_at: D(7, 5) }, { opened_at: D(8, 10), resolved_at: D(8, 20) }];
  const unassigned: MonitorRow[] = []; ([['ORM', [1, 1, 1]], ['Marcom', [2, 0, 0]], ['AE', [0, 1, 0]]] as const).forEach(([role, counts]) => counts.forEach((n, j) => { for (let i = 0; i < n; i++) unassigned.push({ ...base(i + j), role, age_days: [2, 5, 9][j] ?? 0 }); }));
  const streams: MonitorRow[] = []; ([['renewal', [20, 18, 12, 9, 3, -2, -4]], ['onboarding', [1, 2, 2, 3, 5, 6, 7, 10, 16]], ['survey', [6, 7, 10, 16]]] as const).forEach(([stream, ages]) => ages.forEach((age, i) => streams.push({ ...base(i), stream, age_days: age, deadline: plus(TASK_DEMO_NOW, age).slice(0, 10), overdue: stream === 'renewal' ? age < 0 : stream === 'survey' ? age > 5 : age > 3, owner_id: 'Nont', renewed: false })));
  // K5 history: contracts that expired and were decided later (not in today's list).
  const renewalsDecided = [{ end_date: '2026-06-05', decided_at: D(7, 3) }, { end_date: '2026-08-10', decided_at: D(9, 10) }, { end_date: '2026-09-20', decided_at: D(10, 5) }];
  const flow: FlowRow[] = []; for (const t of cases) for (const [when, kind] of [[t.created_at, 'created'], [t.resolved_at, 'closed']] as const) if (when) flow.push({ month: when.slice(0, 7) + '-01', hotel_id: t.hotel_id, hotel_name: t.hotel_name, routed_team: t.routed_team, created_count: kind === 'created' ? 1 : 0, closed_count: kind === 'closed' ? 1 : 0 });
  // K3 (not reconstructable): fixed in-memory snapshots from 1 Sep; Sep 30 = 7, peak 8.
  const snapshots: SnapshotRow[] = [];
  for (let d = Date.parse('2026-09-01T00:00:00Z'); d < nowMs - 12 * 36e5; d += DAY) { const day = new Date(d).toISOString().slice(0, 10), dom = new Date(d).getUTCDate(); const n = day === '2026-09-30' ? 7 : day > '2026-09-30' ? 6 + (dom % 3 === 0 ? 1 : 0) : 6 + (dom % 4 === 0 ? 2 : dom % 2); snapshots.push({ snapshot_date: day, metric: 'K3_UNASSIGNED', dim_key: 'ALL', value: n, threshold_used: null, source: 'JOB' }); }
  return { cases, tickets, flow, activity, snapshots, history: { coachingClosed, renewalsDecided }, monitor: { v_task_coaching_backlog: coaching, v_task_unassigned: unassigned, v_task_deadline_streams: streams } };
}
