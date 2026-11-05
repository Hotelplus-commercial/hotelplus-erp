/* AE Workspace Survey v2 patch §1 — one file with the meeting / survey / label-answer shapes.
 * Prototype: browser storage + one-way Cloud mirror (meridia.meetings.v1 · meridia.surveys.v1 · meridia.survey_label_answers.v1).
 * Portal: turn these into database tables (§1). Every new field is optional; NULL / missing keeps the old meaning:
 *   channel NULL = ONLINE · respondent NULL = AE · template_version NULL = 1. */

export type MeetingChannel = 'ONLINE' | 'CALL' | 'EMAIL' | 'LINE';
export type NoScoreReason = 'CUSTOMER_DECLINED' | 'LINK_EXPIRED';
export type SurveyRespondent = 'AE' | 'CUSTOMER_LINK';
export type LabelChoice = 'GOOD' | 'UNSURE' | 'BAD';
export type MeetingService = 'ORM' | 'MARCOM';
export type MeetingTier = 'A' | 'B' | 'C' | '—';
/** Where a meeting row comes from (internal, never displayed). */
export type MeetingOrigin = 'meetings' | 'survey-queue' | 'calendar' | 'booked' | 'demo';
/** Existing customer response status values (`subStatus`). null = no score email sent. */
export type CustomerResponseStatus = 'Waiting Customer' | 'Confirmed' | 'Flagged';

export type MeetingRecord = {
  id: string;
  hotel: string;
  hotel_id?: string | null;
  service: MeetingService;
  tier: MeetingTier;
  /** Copy of the tier at booking time (there is no tier_at_generation); the hotel tier may change later. */
  tier_at_booking?: MeetingTier | null;
  ae: string;
  ae_display?: string | null;
  contact?: string | null;
  contact_email?: string | null;
  /** ISO date `YYYY-MM-DD` when known; sample queue rows keep their display date in `date_label`. */
  date: string;
  date_label?: string | null;
  /** Existing meeting status text (Completed, Confirmed, …). */
  status: string;
  /** §1.1 — NULL = ONLINE (old rows). */
  channel?: MeetingChannel | null;
  origin: MeetingOrigin;
  /** Original sample row (read-only input), so existing pages render exactly as before. */
  raw?: unknown;
  created_at?: string | null;
  /** Meeting tab R1 (optional): card month `YYYY-MM` when it differs from / is missing in `date` (unbooked cards). */
  card_month?: string | null;
  /** Meeting tab R1 (optional): caretaker copy — ORM team / Marcom person. Missing = role assignment / calendar card / "—". */
  caretaker_team?: string | null;
  caretaker_person?: string | null;
};

export type SurveyRecord = {
  id: string;
  meeting_id: string;
  hotel: string;
  service: MeetingService;
  tier: MeetingTier;
  meeting_date: string;
  /** null until answered (open customer link). */
  submitted_at: string | null;
  /** Existing per-question score fields Q1–Q9 (template 1) or RECOMMEND (template 2). */
  scores?: Record<string, number>;
  /** Existing overall-satisfaction score field (Q7). null = no overall score. */
  overall: number | null;
  free_comment?: string | null;
  customer_response_status: CustomerResponseStatus | null;
  flags: number;
  /** §1.2 */
  no_score_reason?: NoScoreReason | null;
  respondent?: SurveyRespondent | null;
  template_version?: number | null;
  link_token?: string | null;
  link_expires_at?: string | null;
  /** Set when the link is used or closed by the expiry job. */
  link_closed_at?: string | null;
  ae_display?: string | null;
  raw?: unknown;
};

/** §1.3 — one row per answered topic (template 2 only). */
export type SurveyLabelAnswer = {
  id: string;
  survey_id: string;
  topic_key: string;
  choice: LabelChoice;
  /** Catalog key; for now the label text (Contract Health maps texts to catalog keys). null for UNSURE / no-label answers. */
  label_key: string | null;
  created_at: string;
};

/** Contract Health · Survey signals patch §1 — new survey flag rules (CH1–CH6). Stored in meridia.survey_flags.v1 → Cloud doc ps:survey_flags.
 * rule_version 2 = rules from this patch (older flags, e.g. the sample Coaching list, have no row here and stay as they are). */
export type SurveyFlagRule = 'SURVEY_LOW_SCORE' | 'SURVEY_NO_SCORE' | 'SURVEY_SILENT_2M' | 'MEETING_REJECTED';
export type SurveyFlagSeverity = 'red' | 'yellow';
export type SurveyFlag = {
  id: string;
  rule: SurveyFlagRule;
  severity: SurveyFlagSeverity;
  rule_version: 2;
  hotel_id: string | null;
  hotel: string;
  service: MeetingService;
  /** Known only when the record carries it (DEMO mapping); live matches contracts by hotel_id + service. */
  contract_id?: string | null;
  /** Card month `YYYY-MM` (dedupe: one flag per contract × service × card month × rule). */
  card_month: string;
  /** Triggering topic names (v1 topic names / v2 topic · label) — never question numbers. */
  topics: string[];
  meeting_id: string | null;
  survey_id: string | null;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  closed_at?: string | null;
  closed_by_survey?: string | null;
  /** CH6: red and yellow flags are both coaching-eligible; routing is defined by the Coaching prompt. */
  coaching_eligible: boolean;
};

export type MeetingSurveyData = { meetings: MeetingRecord[]; surveys: SurveyRecord[]; answers: SurveyLabelAnswer[]; flags?: SurveyFlag[] };
export const MS_COLLECTIONS = ['meetings', 'surveys', 'survey_label_answers', 'survey_flags'] as const;
export type MsCollection = (typeof MS_COLLECTIONS)[number];
