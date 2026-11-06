/* Workspace Coaching patch v1.0 (WC1–WC14) — Coaching task record (browser collection meridia.coaching_tasks.v1 → Cloud doc ps:coaching_tasks).
 * One task per survey / meeting flag; stable id = flag id (never duplicated on reload).
 * Rule-2 fields: owner_member_ids · owner_team · owner_ack_at · severity. The rest describe the flag the task came from. */
import type { MeetingService, SurveyFlagRule } from './meeting-survey-types';

export type CoachRole = 'GRM' | 'MARCOM_LEAD' | 'PM';
export type CoachingSeverity = 'RED' | 'YELLOW';
export type CoachingStatus = 'OPEN' | 'IN_COACHING' | 'RESOLVED';
/** Where the owner (ผู้ดูแล) came from: meeting.caretaker_* → hotel Assign role slot → none ("—"). Rejected meeting → the meeting's AE. */
export type OwnerSource = 'MEETING' | 'ASSIGN_SLOT' | 'MEETING_AE' | 'SUB_ROLE' | 'HOTEL_OVERRIDE' | 'ROSTER_SUB_ROLE' | 'NONE';
/** WC-O1 (DF5): Marcom sub-roles. HR roster = default, hotel Assign = override. */
export type MarcomSubRole = 'CONTENT' | 'ADS' | 'PRESENTER';
export const MARCOM_SUB_ROLE_LABEL: Record<MarcomSubRole, string> = { CONTENT: 'Content', ADS: 'Ads', PRESENTER: 'ผู้นำเสนอ' };
export type MarcomOverrides = Partial<Record<MarcomSubRole, string | null>>;

export type CoachingNote = { at: string; by: string; text: string };

export type CoachingTask = {
  id: string;
  flag_id: string;
  rule: SurveyFlagRule;
  severity: CoachingSeverity;
  priority: 'HIGH' | 'NORMAL';
  service: MeetingService;
  hotel: string;
  hotel_id: string | null;
  contract_id: string | null;
  card_month: string;
  topics: string[];
  title: string;
  meeting_id: string | null;
  survey_id: string | null;
  /** Supervisor (actionable). member null = role only (GRM has no stored person yet). */
  assignee_role: CoachRole;
  assignee_member_id: string | null;
  owner_member_ids: string[];
  owner_team: string | null;
  owner_ack_at: Record<string, string>;
  owner_source: OwnerSource;
  status: CoachingStatus;
  notes: CoachingNote[];
  created_at: string;
  closed_at: string | null;
};

/** Who can be picked in "สมาชิกที่ดู (DEMO)" and who owners / supervisors resolve to. */
export type CoachMember = { id: string; name: string; kind: CoachRole | 'ORM' | 'MARCOM' | 'AE'; orm_team?: string | null; active: boolean; /** also an ORM sub-team member (GRM) or a Marcom person (Lead) */ also?: 'ORM' | 'MARCOM'; /** DF5: Marcom sub-roles from the HR roster. */ marcom_sub_roles?: MarcomSubRole[] };
