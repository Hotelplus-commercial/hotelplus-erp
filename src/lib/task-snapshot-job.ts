/* Task v2.1 §2.2 — daily backlog snapshot post-step (runs after the Alert BOT in the AC daily action).
 * Writes only task_backlog_snapshot (upsert, idempotent). K3 is never back-filled. */
import { readSnapshots, readTaskMonitor, ticketApi, upsertSnapshots } from './task-tickets';
import type { L0Ticket } from './tickets-l0';
import { getWorklist } from './task-worklist';
import { backlogAsOf, bkkDate, endOfBkkDay, indexActivity, missingDates, snapshotRowsFor, type BacklogInput } from './task-history';
import { configAt } from './task-config';

export async function runTaskSnapshotJob(l0: L0Ticket[], now = new Date().toISOString()) {
  const [cases, acts, cats, monitor] = await Promise.all([ticketApi.list(false), ticketApi.activityAll(false), ticketApi.categories(false), readTaskMonitor()]);
  const rows = getWorklist(cases, l0, cats, [], now);
  const unassigned = monitor.v_task_unassigned;
  const inp: BacklogInput = {
    rows, acts: indexActivity(acts), now, snapshots: [], k3Today: unassigned.length,
    coaching: monitor.v_task_coaching_backlog.filter(r => r.status === 'open' || r.status === 'in-progress'),
    renewals: monitor.v_task_deadline_streams.filter(r => r.stream === 'renewal' && r['renewed'] !== true),
  };
  const today = bkkDate(Date.parse(now)), window = configAt('snapshot_catchup_days', today);
  const start = new Date(Date.parse(`${today}T00:00:00Z`) - window * 864e5).toISOString().slice(0, 10);
  const existing = await readSnapshots(start);
  const roles: Record<string, number> = {};
  for (const r of unassigned) roles[String(r.role)] = (roles[String(r.role)] ?? 0) + 1;
  const out = snapshotRowsFor(today, Date.parse(now), inp, 'JOB', { all: unassigned.length, roles });
  // Cross-check stored JOB values against the reconstruct (dev-only log; UI always uses the reconstruct).
  for (const s of existing) {
    if (s.source !== 'JOB' || s.metric === 'K3_UNASSIGNED' || s.dim_key !== 'ALL' || s.snapshot_date === today) continue;
    const b = backlogAsOf(endOfBkkDay(s.snapshot_date), inp);
    const v = { K1_OPEN: b.k1, K2_OVERDUE: b.k2, K4_COACHING: b.k4, K5_RENEWAL_EXPIRED: b.k5, DEPT_OPEN: null }[s.metric];
    if (v != null && v !== s.value && import.meta.env?.DEV) console.debug('[task-snapshot] discrepancy', s.snapshot_date, s.metric, { job: s.value, reconstruct: v });
  }
  const missing = missingDates(new Set(existing.map(s => s.snapshot_date)), today, window);
  for (const d of missing) out.push(...snapshotRowsFor(d, endOfBkkDay(d), inp, 'CATCHUP'));
  await upsertSnapshots(out);
  return { rows: out.length, catchup: missing.length };
}
