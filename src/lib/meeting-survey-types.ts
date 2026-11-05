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

export type MeetingSurveyData = { meetings: MeetingRecord[]; surveys: SurveyRecord[]; answers: SurveyLabelAnswer[] };
export const MS_COLLECTIONS = ['meetings', 'surveys', 'survey_label_answers'] as const;
export type MsCollection = (typeof MS_COLLECTIONS)[number];
