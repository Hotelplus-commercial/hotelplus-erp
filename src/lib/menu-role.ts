/* Suite Sidebar R1 §3.1 — menu role (testing simulation only, never security).
 * Controls ONLY the sidebar, which pages open and app landings. In-page switchers ("สวมบท", "AE ที่ดู (DEMO)",
 * "สมาชิกที่ดู (DEMO)") are separate and untouched. sessionStorage per tab; fresh session = HOC. */
import { useSyncExternalStore } from 'react';

export type RoleKey = 'TM' | 'BD' | 'BDM' | 'PM' | 'AE' | 'OBS' | 'AC' | 'AC_LEAD' | 'ORM' | 'ORM_LEAD' | 'MKT' | 'MKT_LEAD' | 'GRM' | 'HR' | 'AUTO' | 'OGM' | 'HOC' | 'MD' | 'HOD';
export const ROLE_KEYS: RoleKey[] = ['TM', 'BD', 'BDM', 'PM', 'AE', 'OBS', 'AC', 'AC_LEAD', 'ORM', 'ORM_LEAD', 'MKT', 'MKT_LEAD', 'GRM', 'HR', 'AUTO', 'OGM', 'HOC', 'MD', 'HOD'];
export const ROLE_LABEL: Record<RoleKey, string> = {
  TM: 'TM', BD: 'BD', BDM: 'BDM', PM: 'PM', AE: 'AE', OBS: 'On-boarding Specialist', AC: 'AC', AC_LEAD: 'AC Head',
  ORM: 'ORM', ORM_LEAD: 'ORM Lead', MKT: 'Marcom', MKT_LEAD: 'Marcom Lead', GRM: 'GRM', HR: 'HR', AUTO: 'AUTO', OGM: 'OGM', HOC: 'HOC', MD: 'MD', HOD: 'HOD',
};
export const DEFAULT_MENU_ROLE: RoleKey = 'HOC';
export const MENU_ROLE_KEY = 'meridia.menu_role.v1';

/** §1 item 4: existing in-page roles → menu RoleKey (documentation + tests; the in-page switchers are not changed). */
export const EXISTING_ROLE_MAP: Record<string, RoleKey> = {
  PM: 'PM', BD: 'BD', BDM: 'BDM', ORM: 'ORM', MARCOM: 'MKT', PS: 'AE', AC: 'AC', AUTO: 'AUTO', HR: 'HR', OFFICE: 'HOC',
  GRM: 'GRM', MARCOM_LEAD: 'MKT_LEAD', AC_HEAD: 'AC_LEAD', OGM: 'OGM',
  AE: 'AE', 'Partner Manager': 'PM', 'On-boarding Specialist': 'OBS',
};

let role: RoleKey = DEFAULT_MENU_ROLE;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function hydrateMenuRole() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try { const v = window.sessionStorage.getItem(MENU_ROLE_KEY) as RoleKey | null; if (v && ROLE_KEYS.includes(v) && v !== role) { role = v; emit(); } } catch { /* ignore */ }
}
export const getMenuRole = () => role;
export function setMenuRole(r: RoleKey) {
  if (r === role) return;
  role = r;
  try { window.sessionStorage.setItem(MENU_ROLE_KEY, r); } catch { /* ignore */ }
  emit();
}
export function useMenuRole(): RoleKey {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => role, () => DEFAULT_MENU_ROLE);
}
