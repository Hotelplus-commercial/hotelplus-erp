import { test, mock } from 'bun:test';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
test('oracle', async () => {
const { SEED_CATEGORIES } = await import('../src/lib/task-tickets');
const { taskDemo, TASK_DEMO_NOW, demoCareHotels } = await import('../src/lib/task-demo');
const W = await import('../src/lib/task-worklist');
const H = await import('../src/lib/task-history');
const { TASK_DEMO_CONFIG_HISTORY } = await import('../src/lib/task-config');
const care = demoCareHotels(), fx = taskDemo(SEED_CATEGORIES, care);
const rows = W.getWorklist(fx.cases, fx.tickets, SEED_CATEGORIES, care, TASK_DEMO_NOW), acts = H.indexActivity(fx.activity);
const inp = { rows, acts, coaching: fx.monitor.v_task_coaching_backlog, renewals: fx.monitor.v_task_deadline_streams.filter(r => r.stream === 'renewal'), now: TASK_DEMO_NOW, config: TASK_DEMO_CONFIG_HISTORY, snapshots: fx.snapshots, k3Today: 6, ...fx.history };
const ends = ['2025-11-30','2025-12-31','2026-01-31','2026-02-28','2026-03-31','2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-08-31','2026-09-30'];
for (const e of ends) { const b = H.backlogAsOf(H.endOfBkkDay(e), inp); console.log(e, b.k1, b.k2, b.k3, b.k4, b.k5); }
const t = H.backlogAsOf(Date.parse(TASK_DEMO_NOW), inp); console.log('today', t.k1, t.k2, t.k3, t.k4, t.k5, JSON.stringify(t.dept));
const P = { from: '2026-05-01', to: '2026-10-31' };
for (const [k, f] of [['k1', (b: any) => b.k1], ['k2', (b: any) => b.k2], ['k3', (b: any) => b.k3], ['k4', (b: any) => b.k4], ['k5', (b: any) => b.k5]] as const) { const s = H.periodStats(P, inp, f); console.log(k, s.avg?.toFixed(2), s.peak, s.n_days_with_data, s.n_days); }
console.log('dept', JSON.stringify(W.departmentWork(rows).map(d => [d.dept, d.counts])));
const open = rows.filter(r => r.status_group !== 'CLOSED'); console.log('open', open.length, open.filter(r => r.source_kind === 'CASE').length, ['OPEN','IN_PROGRESS','WAITING'].map(s => open.filter(r => r.status_group === s).length), 'overdue', rows.filter(r => r.is_overdue).length);
const fl = W.monthlyWork(rows, fx.flow, P); console.log('in', fl.map(r => r.in), 'closed', fl.map(r => r.closed), 'canc', fl.at(-1)?.cancelled);
console.log('closed30', rows.filter(r => r.closed_at && Date.parse(TASK_DEMO_NOW) - Date.parse(r.closed_at) <= 30 * 864e5).length);
const c = H.categoryIncoming(rows, SEED_CATEGORIES, P); console.log('cat', c.psN, c.l0N, JSON.stringify(c.domains.map(d => [d.domain, d.n, d.subs.map(s => s.label.slice(0, 12) + ':' + s.n)])), JSON.stringify(c.types.map(t => [t.type, t.n])));
for (const d of ['ORM','MARCOM','PS','AC','BD'] as const) for (const r of H.workload(d, rows, acts, care, P)) console.log(r.label, r.inN, r.closedN, r.openNow, r.accept.median?.toFixed(2), `${r.accept.n}/${r.accept.N}`, r.close.median?.toFixed(2), r.hotels, r.reopen ? `${r.reopen.n}/${r.reopen.N}` : '-', r.backfill);
console.log('overridden', rows.filter(r => r.dept_overridden).length, 'missingResp', rows.filter(r => r.responsible_missing).length);
});
