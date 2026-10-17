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
const inp = { rows, acts, coaching, renewals, now: TASK_DEMO_NOW, config: TASK_DEMO_CONFIG_HISTORY, snapshots: fx.snapshots, k3Today: fx.monitor.v_task_unassigned.length };
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
});
