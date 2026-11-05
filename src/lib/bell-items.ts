/* Service SLA Core v1.0 §7 — targeted bell items: browser collection meridia.bell_items.v1 → Cloud doc ps:bell_items (one-way).
 * Each item targets a USER, a ROLE or a DEPT_QUEUE; `key` is once-only (no duplicate on reload / re-run); read / unread per viewer.
 * Read by the existing bell (NotificationCenter) for the current viewer. Used for the §7 ticket alerts only in this pass. */
import { useSyncExternalStore } from 'react';
import { browserCollection } from './browser-collection';

export type BellTargetType = 'USER' | 'ROLE' | 'DEPT_QUEUE';
export type BellItem = { id: string; key: string; target_type: BellTargetType; target_id: string; alert_type: string; text: string; link: string | null; created_at: string; read_by: string[]; tone?: 'critical' | 'warning' | 'info' };
export const bellItems = browserCollection<BellItem>('bell_items');

/** Adds one item per (key, target); returns false when it already exists. */
export function addBellItem(demo: boolean, i: Omit<BellItem, 'id' | 'read_by'>): boolean {
  const rows = bellItems.all(demo);
  const id = `${i.key}|${i.target_type}:${i.target_id}`;
  if (rows.some((r) => r.id === id)) return false;
  bellItems.save(demo, [...rows, { ...i, id, read_by: [] }]);
  return true;
}

/** Current viewer of the bell: set by Workspace pages (role / member pickers); default = the department of the Workspace URL. */
export type BellViewer = { id: string; users: string[]; roles: string[]; depts: string[] };
let viewer: BellViewer | null = null; let vv = 0;
const vl = new Set<() => void>();
export function setBellViewer(v: BellViewer | null) { if (JSON.stringify(v) === JSON.stringify(viewer)) return; viewer = v; vv++; vl.forEach((l) => l()); }
export const getBellViewer = () => viewer;
export const useBellViewer = () => useSyncExternalStore((l) => { vl.add(l); return () => { vl.delete(l); }; }, () => viewer, () => null);
export const viewerFromPath = (path: string): BellViewer | null => { const m = /^\/workspace\/([a-z]+)/.exec(path); if (!m) return null; const d = m[1]!.toUpperCase(); return { id: `dept:${d}`, users: [], roles: [], depts: [d] }; };

export const matchesViewer = (b: BellItem, v: BellViewer | null) => !!v && ((b.target_type === 'USER' && v.users.includes(b.target_id)) || (b.target_type === 'ROLE' && v.roles.includes(b.target_id)) || (b.target_type === 'DEPT_QUEUE' && v.depts.includes(b.target_id)));
export const bellFor = (demo: boolean, v: BellViewer | null) => bellItems.all(demo).filter((b) => matchesViewer(b, v)).sort((a, b) => b.created_at.localeCompare(a.created_at));
export function markBellRead(demo: boolean, id: string, viewerId: string) {
  const rows = bellItems.all(demo); const b = rows.find((r) => r.id === id);
  if (!b || b.read_by.includes(viewerId)) return;
  bellItems.save(demo, rows.map((r) => (r.id === id ? { ...r, read_by: [...r.read_by, viewerId] } : r)));
}
let ver = 0; bellItems.subscribe(() => { ver++; });
export const useBellItems = (demo: boolean, v: BellViewer | null) => { useSyncExternalStore(bellItems.subscribe, () => ver, () => 0); return bellFor(demo, v); };
