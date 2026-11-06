/* Workspace Coaching patch v1.0 §6 — DEMO additions only (in memory, never written to meridia.coaching_tasks.v1).
 * Roster, Assign role slots and acknowledgements for the Contract Health demo flags (ต.ค. 2569). */
import type { CoachMember } from './coaching-types';

export const COACH_DEMO_ROSTER: CoachMember[] = [
  { id: 'grm', name: 'GRM', kind: 'GRM', active: true },
  { id: 'pm-alex', name: 'PM Alex', kind: 'PM', active: true },
  { id: 'mk-naen', name: 'แนน', kind: 'MARCOM_LEAD', active: true, also: 'MARCOM' },
  { id: 'mk-biw', name: 'บิว', kind: 'MARCOM', active: true, marcom_sub_roles: ['CONTENT', 'PRESENTER'] },
  { id: 'mk-bow', name: 'โบว์', kind: 'MARCOM', active: true, marcom_sub_roles: ['ADS'] },
  { id: 'mk-jane', name: 'เจน', kind: 'MARCOM', active: true, marcom_sub_roles: ['CONTENT'] },
  { id: 'orm-toey', name: 'เตย', kind: 'ORM', orm_team: 'A', active: true },
  { id: 'orm-nid', name: 'นิด', kind: 'ORM', orm_team: 'A', active: true },
  { id: 'orm-ton', name: 'ต้น', kind: 'ORM', orm_team: 'B', active: true },
  { id: 'orm-fon', name: 'ฝน', kind: 'ORM', orm_team: 'B', active: true },
  { id: 'orm-koy', name: 'ก้อย', kind: 'ORM', orm_team: 'B', active: true },
  { id: 'orm-mint', name: 'มิ้นท์', kind: 'ORM', orm_team: 'C', active: true },
  { id: 'orm-beer', name: 'เบียร์', kind: 'ORM', orm_team: 'C', active: true },
  { id: 'orm-ice', name: 'ไอซ์', kind: 'ORM', orm_team: 'C', active: true },
  { id: 'orm-prae', name: 'แพร', kind: 'ORM', orm_team: 'D', active: true },
  { id: 'orm-oat', name: 'โอ๊ต', kind: 'ORM', orm_team: 'D', active: true },
  { id: 'orm-june', name: 'จูน', kind: 'ORM', orm_team: 'RE_ACTIVE', active: true },
  { id: 'orm-palm', name: 'ปาล์ม', kind: 'ORM', orm_team: 'RE_ACTIVE', active: true },
  { id: 'ae-boss', name: 'AE บอส', kind: 'AE', active: true },
  { id: 'ae-fern', name: 'AE Fern', kind: 'AE', active: true },
  { id: 'ae-nont', name: 'AE Nont', kind: 'AE', active: true },
];

/** DF5 DEMO (in memory): Marcom sub-roles on the roster above + one hotel override (HTL0503). */
/** DEMO hotel Assign role slots (ORM team / Marcom person). Demo meetings carry no caretaker_* so these are the source used. */
export const COACH_DEMO_SLOTS: Record<string, { orm_team?: string; marcom_person?: string; marcom_overrides?: Partial<Record<'CONTENT' | 'ADS' | 'PRESENTER', string>> }> = {
  'ORM:HTL0214': { orm_team: 'B' }, 'ORM:HTL0401': { orm_team: 'A' }, 'ORM:HTL0403': { orm_team: 'C' },
  'ORM:HTL0405': { orm_team: 'D' }, 'ORM:HTL0406': { orm_team: 'RE_ACTIVE' },
  'MARCOM:HTL0501': { marcom_person: 'บิว' }, 'MARCOM:HTL0503': { marcom_person: 'โบว์', marcom_overrides: { ADS: 'เจน' } }, /* DF5 DEMO: hotel override (Ads → เจน) */ 'MARCOM:HTL0504': { marcom_person: 'เจน' },
  'MARCOM:HTL0505': { marcom_person: 'บิว' }, 'MARCOM:HTL0506': { marcom_person: 'โบว์' }, 'MARCOM:HTL0508': { marcom_person: 'เจน' },
  'MARCOM:HTL0510': { marcom_person: 'บิว' }, 'MARCOM:HTL0511': { marcom_person: 'โบว์' },
  'MARCOM:HTL0331': { marcom_person: 'บิว' }, 'MARCOM:HTL0298': { marcom_person: 'โบว์' },
  'MARCOM:HTL0177': { marcom_person: 'แนน' }, 'MARCOM:HTL0420': { marcom_person: 'เจน' },
};
/** DEMO owner AE of the rejected-meeting hotels (demo flags carry no meeting record). */
export const COACH_DEMO_OWNER_AE: Record<string, string> = { HTL0133: 'ae-boss', HTL0290: 'ae-fern' };
/** Mixed acknowledgements (0/3 · 2/3 · 3/3) keyed by flag rule + hotel. */
export const COACH_DEMO_ACKS: Record<string, string[]> = {
  'SURVEY_NO_SCORE:HTL0214': ['orm-ton', 'orm-fon'],
  'SURVEY_LOW_SCORE:HTL0403': ['orm-mint', 'orm-beer', 'orm-ice'],
  'SURVEY_LOW_SCORE:HTL0401': ['orm-toey'],
};
/** DEMO task ages: created n days before DEMO_DAY. */
export const COACH_DEMO_AGE: Record<string, number> = { 'SURVEY_SILENT_2M:HTL0214': 9, 'SURVEY_NO_SCORE:HTL0214': 6, 'MEETING_REJECTED:HTL0133': 4, 'MEETING_REJECTED:HTL0290': 3 };
