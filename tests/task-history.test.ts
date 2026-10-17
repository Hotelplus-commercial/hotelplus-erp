import { describe, expect, test, mock } from 'bun:test';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const { SEED_CATEGORIES } = await import('../src/lib/task-tickets');
const { taskDemo, TASK_DEMO_NOW, demoCareHotels } = await import('../src/lib/task-demo');
const { getWorklist, departmentWork, monthlyWork } = await import('../src/lib/task-worklist');
const H = await import('../src/lib/task-history');
const { configAt, TASK_DEMO_CONFIG_HISTORY, appendConfig, TASK_CONFIG_HISTORY } = await import('../src/lib/task-config');

const care = demoCareHotels(), fx = taskDemo(SEED_CATEGORIES, care);
const rows = getWorklist(fx.cases, fx.tickets, SEED_CATEGORIES, care, TASK_DEMO_NOW);
const acts = H.indexActivity(fx.activity);
const coaching = fx.monitor.v_task_coaching_backlog, renewals = fx.monitor.v_task_deadline_streams.filter(r => r.stream === 'renewal');
const inp = { rows, acts, coaching, renewals, now: TASK_DEMO_NOW, config: TASK_DEMO_CONFIG_HISTORY, snapshots: fx.snapshots, k3Today: fx.monitor.v_task_unassigned.length, ...fx.history };
const P = { from: '2026-05-01', to: '2026-10-31' };

describe('Task v2.1 history', () => {
  test('backlogAsOf(today) equals live K1 31, K2 5, K4 9, K5 2 and ⑤ rows', () => {
    const b = H.backlogAsOf(Date.parse(TASK_DEMO_NOW), inp);
    expect([b.k1, b.k2, b.k4, b.k5, b.k3]).toEqual([31, 5, 9, 2, 6]);
    const live = Object.fromEntries(departmentWork(rows).map(d => [d.dept, d.counts]));
    expect(b.dept).toEqual(live as never);
  });
  test('configAt picks latest effective entry; editing appends', () => {
    expect(configAt('case_overdue_days', '2026-07-15', TASK_DEMO_CONFIG_HISTORY)).toBe(5);
    expect(configAt('case_overdue_days', '2026-08-01', TASK_DEMO_CONFIG_HISTORY)).toBe(3);
    const next = appendConfig(TASK_CONFIG_HISTORY, 'case_overdue_days', 4, '2026-11-01');
    expect(next.case_overdue_days).toHaveLength(2);
    expect(configAt('case_overdue_days', '2026-10-31', next)).toBe(3);
    expect(configAt('workload_small_base', '2026-10-17')).toBe(5);
    expect(configAt('snapshot_catchup_days', '2026-10-17')).toBe(14);
  });
  test('accept unmeasurable on straight close; reopen counted; net close excludes waiting', () => {
    const cases = rows.filter(r => r.source_kind === 'CASE');
    const acc = cases.map(r => H.acceptTime(r, acts)).filter(Boolean);
    expect(acc.some(a => a!.days === null)).toBe(true);
    expect(cases.some(r => H.wasReopened(r, acts))).toBe(true);
    const r = cases.find(r => (acts.get(r.case!.id) ?? []).some(a => a.body.startsWith('in-progress → waiting')) && r.case!.status === 'resolved');
    if (!r) throw Error('fixture');
    const gross = (Date.parse(r.case!.resolved_at!) - Date.parse(r.created_at)) / 864e5;
    expect(H.netCloseTime(r, acts)!.days!).toBeCloseTo(gross - 1, 5);
    const s = H.metricSummary(acc, P); expect(s.n).toBeLessThanOrEqual(s.N);
  });
  test('⑥ sums equal ④ incoming (PS cases and L0)', () => {
    const c = H.categoryIncoming(rows, SEED_CATEGORIES, P), flow = monthlyWork(rows, fx.flow, P);
    expect(c.psN).toBe(flow.reduce((n, r) => n + r.caseIn, 0));
    expect(c.l0N).toBe(flow.reduce((n, r) => n + r.l0In, 0));
  });
  test('⑦ incoming across depts + other = ④; open now = ⑤; no unset ORM team', () => {
    const depts = ['ORM', 'MARCOM', 'PS', 'AC', 'BD'] as const;
    const wl = depts.map(d => H.workload(d, rows, acts, care, P));
    const other = rows.filter(r => ['AUTO', 'HR', 'OFFICE'].includes(r.dept) && r.created_at.slice(0, 10) >= P.from).length;
    const flow = monthlyWork(rows, fx.flow, P);
    expect(wl.flat().reduce((n, r) => n + r.inN, 0) + other).toBe(flow.reduce((n, r) => n + r.in, 0));
    const live = Object.fromEntries(departmentWork(rows).map(d => [d.dept, d.total]));
    depts.forEach((d, i) => expect(wl[i]!.reduce((n, r) => n + r.openNow, 0)).toBe(live[d] ?? 0));
    expect(wl[0]!.some(r => r.key === 'UNSET')).toBe(false);
    expect(wl.flat().some(r => r.backfill > 0)).toBe(true);
  });
  test('catch-up never writes K3; JOB includes K3', () => {
    const c = H.snapshotRowsFor('2026-10-10', H.endOfBkkDay('2026-10-10'), inp, 'CATCHUP');
    expect(c.some(r => r.metric === 'K3_UNASSIGNED')).toBe(false);
    const j = H.snapshotRowsFor('2026-10-17', Date.parse(TASK_DEMO_NOW), inp, 'JOB', { all: 6, roles: { ORM: 3 } });
    expect(j.find(r => r.metric === 'K3_UNASSIGNED' && r.dim_key === 'ALL')?.value).toBe(6);
    expect(H.missingDates(new Set(['2026-10-16']), '2026-10-17', 3)).toEqual(['2026-10-14', '2026-10-15']);
  });
  test('last sparkline point is today and equals tile value', () => {
    const pts = H.historyPoints(P, TASK_DEMO_NOW, 'month');
    expect(pts.at(-1)?.isToday).toBe(true);
    expect(H.backlogAsOf(pts.at(-1)!.T, inp).k1).toBe(31);
  });
  const at = (d: string) => H.backlogAsOf(H.endOfBkkDay(d), inp);
  const ENDS = ['2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30'];
  test('§12 month-ends May–Oct match the approved prototype', () => {
    const today = H.backlogAsOf(Date.parse(TASK_DEMO_NOW), inp), pts = [...ENDS.map(at), today];
    expect(pts.map(b => b.k1)).toEqual([20, 22, 20, 24, 27, 31]);
    expect(pts.map(b => b.k2)).toEqual([2, 2, 1, 3, 3, 5]);
    expect(pts.map(b => b.k3)).toEqual([null, null, null, null, 7, 6]);
    expect(pts.map(b => b.k4)).toEqual([8, 7, 9, 9, 9, 9]);
    expect(pts.map(b => b.k5)).toEqual([0, 1, 0, 1, 1, 2]);
  });
  test('§12 period B: end of Apr and Nov–Apr K1 month-ends', () => {
    const apr = at('2026-04-30');
    expect([apr.k1, apr.k2, apr.k3, apr.k4, apr.k5]).toEqual([18, 2, null, 8, 0]);
    expect(['2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'].map(d => at(d).k1)).toEqual([12, 14, 15, 15, 16, 18]);
  });
  test('§12 ⑥ PS cases 31 by domain/subcategory and L0 41 by type', () => {
    const c = H.categoryIncoming(rows, SEED_CATEGORIES, P);
    expect([c.psN, c.l0N]).toEqual([31, 41]);
    expect(c.domains.map(d => [d.domain, d.n])).toEqual([['ORM', 14], ['MARCOM', 8], ['PS', 5], ['AC', 4]]);
    expect(c.domains[0]!.subs.map(s => s.n)).toEqual([4, 3, 2, 2, 1, 1, 1]);
    expect(c.domains[1]!.subs.map(s => s.n)).toEqual([3, 3, 1, 1]);
    expect(c.types.map(t => [t.type, t.n])).toEqual([['SERVICING_STALL', 10], ['GRADE_RISK', 9], ['RENEWAL_DUE', 8], ['CONTRACT_FOLLOWUP', 7], ['UPSELL_PITCH', 5], ['SURVEY_LOW', 2]]);
  });
  test('§12 ⑦ in/closed/open per team; ORM-A has most incoming', () => {
    const orm = H.workload('ORM', rows, acts, care, P);
    expect(orm.map(r => [r.label, r.inN, r.closedN, r.openNow])).toEqual([['ORM-A', 6, 5, 3], ['ORM-B', 4, 4, 2], ['ORM-C', 3, 2, 2], ['ORM-D', 3, 3, 1], ['ORM-E', 2, 2, 1], ['Re-active', 2, 2, 0]]);
    const one = (d: 'MARCOM' | 'PS' | 'AC' | 'BD') => { const r = H.workload(d, rows, acts, care, P)[0]!; return [r.inN, r.closedN, r.openNow]; };
    expect([one('MARCOM'), one('PS'), one('AC'), one('BD')]).toEqual([[12, 10, 6], [15, 12, 5], [13, 11, 4], [12, 8, 5]]);
    expect(orm[0]!.close.median).toBeCloseTo(2.5, 5);
  });
  test('fixture is deterministic', () => {
    expect(JSON.stringify(taskDemo(SEED_CATEGORIES, demoCareHotels()))).toBe(JSON.stringify(fx));
  });
  const bare = { rows: [], acts: new Map(), coaching: [], renewals: [], now: TASK_DEMO_NOW, snapshots: [], k3Today: null,
    coachingClosed: [{ opened_at: '2026-05-01T09:00:00.000Z', resolved_at: '2026-07-01T09:00:00.000Z' }],
    renewalsDecided: [{ end_date: '2026-06-05', decided_at: '2026-07-03T09:00:00.000Z' }] };
  test('engine replay: coaching resolved after T counted, before T not', () => {
    expect(H.backlogAsOf(H.endOfBkkDay('2026-06-15'), bare).k4).toBe(1);
    expect(H.backlogAsOf(H.endOfBkkDay('2026-07-15'), bare).k4).toBe(0);
  });
  test('engine replay: renewal decided after T counted in K5, before T not', () => {
    expect(H.backlogAsOf(H.endOfBkkDay('2026-06-15'), bare).k5).toBe(1);
    expect(H.backlogAsOf(H.endOfBkkDay('2026-07-15'), bare).k5).toBe(0);
  });
});
