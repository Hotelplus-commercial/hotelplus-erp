/*
 * Cloud Sync Level A engine (spec v1.0).
 * One-way: browser (write layer) → crm_documents (read layer for views). Never pulls payloads.
 * C1 debounce 2.5s + Sync now · C2 one doc per collection · C3 optimistic lock on revision.
 * Seen revisions live in memory per tab (persisted only after success) so two tabs/machines
 * with stale revisions get a conflict instead of a silent overwrite (C3 + C4 seed guard).
 */
import { pushCloudDoc } from './ac-cloud.functions';

const STATE_KEY = 'meridia.cloud-sync.v1';
const LOG_KEY = 'meridia.cloud-sync.log';
const DEBOUNCE_MS = 2500;

export type SyncConflict = { key: string; localRevision: number; cloudRevision: number };
export type SyncSnapshot = {
  phase: 'idle' | 'pending' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  conflicts: SyncConflict[];
  error: string | null;
  docs: number;
};

type Doc = { json: string; hash: string; revision: number; pushedHash: string; conflict: SyncConflict | null };

const hashOf = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${h >>> 0}`;
};

const docs = new Map<string, Doc>();
const listeners = new Set<() => void>();
let snapshot: SyncSnapshot = { phase: 'idle', lastSyncedAt: null, conflicts: [], error: null, docs: 0 };
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let rerun = false;

function persisted(): Record<string, { revision: number; hash: string }> {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}'); } catch { return {}; }
}
function persist(key: string, d: Doc) {
  const all = persisted();
  all[key] = { revision: d.revision, hash: d.pushedHash };
  try { localStorage.setItem(STATE_KEY, JSON.stringify(all)); } catch { /* quota */ }
}
function log(event: string, key: string, detail: Record<string, unknown> = {}) {
  const entry = { at: new Date().toISOString(), event, key, ...detail };
  console.info('[cloud-sync]', entry);
  try {
    const prev = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as unknown[];
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...prev].slice(0, 50)));
  } catch { /* ignore */ }
}
function emit(patch: Partial<SyncSnapshot>) {
  const conflicts = [...docs.values()].flatMap((d) => (d.conflict ? [d.conflict] : []));
  snapshot = { ...snapshot, ...patch, conflicts, docs: docs.size };
  listeners.forEach((l) => l());
}
const dirty = (d: Doc) => !d.conflict && d.hash !== d.pushedHash;

/** Stores call this after every local write. Only changed collections are scheduled. */
export function stageCloudDoc(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(value);
  const hash = hashOf(json);
  let d = docs.get(key);
  if (!d) {
    const saved = persisted()[key];
    d = { json, hash, revision: saved?.revision ?? 0, pushedHash: saved?.hash ?? '', conflict: null };
    docs.set(key, d);
  } else { d.json = json; d.hash = hash; }
  if (!dirty(d)) return emit({});
  emit({ phase: running ? 'syncing' : 'pending' });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(false), DEBOUNCE_MS);
}

async function pushOne(key: string, d: Doc, force: boolean) {
  const sentHash = d.hash;
  const res = await pushCloudDoc({ data: { key, revision: d.revision, force, payload: JSON.parse(d.json) } });
  if (res.ok) {
    if (force) log('conflict.resolved.force', key, { revision: res.revision });
    d.revision = res.revision; d.pushedHash = sentHash; d.conflict = null;
    persist(key, d);
    return;
  }
  d.conflict = { key, localRevision: d.revision, cloudRevision: res.cloudRevision };
  log('conflict.detected', key, { localRevision: d.revision, cloudRevision: res.cloudRevision });
}

/** all=true is "Sync now": pushes every non-conflicted doc immediately (still revision-guarded). */
export async function flush(all: boolean) {
  if (typeof window === 'undefined') return;
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) { rerun = true; return; }
  running = true;
  emit({ phase: 'syncing', error: null });
  let error: string | null = null;
  try {
    for (const [key, d] of docs) {
      if (d.conflict || (!all && !dirty(d))) continue;
      try { await pushOne(key, d, false); } catch (e) { error = e instanceof Error ? e.message : 'Sync ไม่สำเร็จ'; }
    }
  } finally { running = false; }
  const pending = [...docs.values()].some(dirty);
  emit({ phase: error ? 'error' : pending ? 'pending' : 'idle', error, lastSyncedAt: error ? snapshot.lastSyncedAt : new Date().toISOString() });
  if (rerun || pending) { rerun = false; if (pending && !error) timer = setTimeout(() => void flush(false), DEBOUNCE_MS); }
}

/** Force push: overwrite cloud with this browser's copy and bump revision. */
export async function forcePush(key: string) {
  const d = docs.get(key);
  if (!d) return;
  emit({ phase: 'syncing' });
  try { await pushOne(key, d, true); emit({ phase: 'idle', error: null, lastSyncedAt: new Date().toISOString() }); }
  catch (e) { emit({ phase: 'error', error: e instanceof Error ? e.message : 'Force push ไม่สำเร็จ' }); }
}

/**
 * Keep cloud: Level A has no pull, so the cloud copy stays as-is, this tab adopts the cloud
 * revision and drops its pending push for that doc. A later local edit pushes the whole collection.
 */
export function keepCloud(key: string) {
  const d = docs.get(key);
  if (!d?.conflict) return;
  log('conflict.resolved.keep_cloud', key, { cloudRevision: d.conflict.cloudRevision });
  d.revision = d.conflict.cloudRevision; d.pushedHash = d.hash; d.conflict = null;
  persist(key, d);
  emit({});
}

export function subscribeCloudSync(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export const getCloudSyncSnapshot = () => snapshot;
const serverSnapshot: SyncSnapshot = { phase: 'idle', lastSyncedAt: null, conflicts: [], error: null, docs: 0 };
export const getCloudSyncServerSnapshot = () => serverSnapshot;
