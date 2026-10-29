/* Tab R1 §10 — new browser-local collections: `contract_signals` (AE labels), `contract_tier_snapshots`
 * and the four AE bell events (§7). Live = localStorage (new key, nothing existing touched); DEMO = in-memory,
 * seeded from the demo additions, never persisted. Not mirrored to Cloud: the Cloud doc-key list has no entry
 * for these collections yet (adding one is outside this patch). */
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AeLabel, ChAlert, TierSnapshot } from './contract-tab-r1';
import { tabR1DemoLabels, tabR1DemoSnapshots } from './contract-tab-r1-demo';

export type ChAlertRec = ChAlert & { read?: boolean };
type State = { labels: AeLabel[]; snapshots: TierSnapshot[]; alerts: ChAlertRec[]; lastRun: string | null };
const KEY = 'meridia.contract-health.v1';
const empty = (): State => ({ labels: [], snapshots: [], alerts: [], lastRun: null });
let live: State | null = null;
let demo: State | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

function liveState(): State {
  if (live) return live;
  try { live = { ...empty(), ...(JSON.parse(localStorage.getItem(KEY) ?? '') as State) }; } catch { live = empty(); }
  return live;
}
function demoState(): State {
  if (!demo) demo = { labels: tabR1DemoLabels(), snapshots: tabR1DemoSnapshots(), alerts: [], lastRun: null };
  return demo;
}
export const contractHealthState = (isDemo: boolean) => (isDemo ? demoState() : liveState());
function commit(isDemo: boolean, s: State) {
  if (isDemo) demo = s;
  else { live = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } }
  emit();
}
/** Restart the demo collections (new demo session). */
export function resetContractHealthDemo() { demo = null; emit(); }

/** §6.5 — AE labels, once per contract + label (an existing record is kept). */
export function addAeLabels(isDemo: boolean, list: AeLabel[]) {
  const s = contractHealthState(isDemo);
  const have = new Set(s.labels.map((l) => `${l.contract_id}|${l.label_key}`));
  const add = list.filter((l) => { const k = `${l.contract_id}|${l.label_key}`; if (have.has(k)) return false; have.add(k); return true; });
  if (add.length) commit(isDemo, { ...s, labels: [...s.labels, ...add] });
}
/** §10.2 / §7 — first load of the day: one snapshot per active contract + new bell events. Idempotent per day. */
export function recordDay(isDemo: boolean, today: string, snaps: TierSnapshot[], alerts: ChAlert[]) {
  const s = contractHealthState(isDemo);
  if (s.lastRun === today) return false;
  const haveSnap = new Set(s.snapshots.filter((x) => x.date === today).map((x) => x.contract_id));
  const keys = new Set(s.alerts.map((a) => a.key));
  commit(isDemo, { ...s, lastRun: today, snapshots: [...s.snapshots, ...snaps.filter((x) => !haveSnap.has(x.contract_id))], alerts: [...s.alerts, ...alerts.filter((a) => !keys.has(a.key))] });
  return true;
}
export function markAlertRead(isDemo: boolean, key: string) {
  const s = contractHealthState(isDemo);
  commit(isDemo, { ...s, alerts: s.alerts.map((a) => (a.key === key ? { ...a, read: true } : a)) });
}
export function useContractHealthStore(isDemo: boolean): State {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => version, () => 0);
  return hydrated ? contractHealthState(isDemo) : empty();
}
