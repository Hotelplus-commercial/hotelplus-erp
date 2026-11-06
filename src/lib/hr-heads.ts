/* Suite Sidebar R1 §3.1 / S11 — static heads + HOD list for the prototype, next to the HR roster (hr-members.tsx).
 * Read-only; never written to the HR roster. Real system: HR App › Roster. */
import type { RoleKey } from './menu-role';

export type HeadRow = { role: RoleKey; dept: string; label: string; hod: boolean };
export const HR_HEADS: HeadRow[] = [
  { role: 'BDM', dept: 'BD', label: 'BDM', hod: true },
  { role: 'PM', dept: 'PS', label: 'PM', hod: true },
  { role: 'AC_LEAD', dept: 'AC', label: 'AC Head', hod: true },
  { role: 'GRM', dept: 'ORM', label: 'GRM', hod: true },
  { role: 'ORM_LEAD', dept: 'ORM', label: 'ORM Lead', hod: false },
  { role: 'MKT_LEAD', dept: 'MARCOM', label: 'Marcom Lead', hod: true },
  { role: 'OGM', dept: 'AUTO', label: 'OGM', hod: true },
  { role: 'HR', dept: 'HR', label: 'HR', hod: true },
];
export const isHead = (r: RoleKey) => HR_HEADS.some((h) => h.role === r);
