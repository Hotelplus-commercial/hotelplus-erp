/* Service SLA Core v1.0 — tiny versioned browser collection: live = localStorage `meridia.<name>.v1` + one-way Cloud doc `ps:<name>`;
 * DEMO = in memory only (never the real key), cleared when the shared DEMO switch turns off. */
import { stageCloudDoc } from './cloud-sync';
import { onDemoSessionChange, psDemoOn } from './demo-session';

export type Collection<T> = { key: string; doc: string; all: (demo: boolean) => T[]; save: (demo: boolean, rows: T[]) => void; subscribe: (l: () => void) => () => void; resetDemo: () => void };

export function browserCollection<T>(name: string, demoSeed: () => T[] = () => []): Collection<T> {
  const key = `meridia.${name}.v1`; const doc = `ps:${name}`;
  let live: T[] | null = null; let demo: T[] | null = null;
  const ls = new Set<() => void>();
  const emit = () => ls.forEach((l) => l());
  const load = () => { if (live) return live; try { const v = typeof localStorage === 'undefined' ? null : JSON.parse(localStorage.getItem(key) ?? 'null'); live = Array.isArray(v) ? v : []; } catch { live = []; } return live!; };
  if (typeof window !== 'undefined') onDemoSessionChange(() => { if (!psDemoOn()) demo = null; emit(); });
  return {
    key, doc,
    all: (d) => (d ? (demo ??= demoSeed()) : load()),
    save: (d, rows) => {
      if (d) demo = rows;
      else { live = rows; try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* quota */ } stageCloudDoc(doc, rows); }
      emit();
    },
    subscribe: (l) => { ls.add(l); return () => { ls.delete(l); }; },
    resetDemo: () => { demo = null; emit(); },
  };
}
