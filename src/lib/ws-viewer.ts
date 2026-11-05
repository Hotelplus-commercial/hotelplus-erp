/* Shared "สมาชิกที่ดู (DEMO)" selection per Workspace scope (simulation only, never security).
 * One value per scope so the 🎯 Coaching picker and the 🎫 service-ticket lane read the same member. In memory only. */
import { useSyncExternalStore } from 'react';

const state: Record<string, string> = {};
const listeners = new Set<() => void>();
let ver = 0;
export function setWsViewer(scope: string, id: string) { if (state[scope] === id) return; state[scope] = id; ver++; listeners.forEach((l) => l()); }
export const getWsViewer = (scope: string, def: string) => state[scope] ?? def;
export function useWsViewer(scope: string, def: string): [string, (id: string) => void] {
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => ver, () => 0);
  return [state[scope] ?? def, (id: string) => setWsViewer(scope, id)];
}
