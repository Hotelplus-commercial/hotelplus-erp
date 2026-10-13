import type { PsReportRow } from "./ps-dashboard-types";
import { matchesBook, type GlobalFilter, type Period } from "./ps-dashboard-global";

export const MEETING_VIEWS = [
  "v_meeting_funnel",
  "v_meeting_count_by_ae",
  "v_meeting_survey_collection",
  "v_meeting_completion",
  "v_meeting_survey_scores",
  "v_meeting_flags",
  "v_meeting_rubric_summary",
] as const;
export type MeetingView = (typeof MEETING_VIEWS)[number];
export type MeetingRow = PsReportRow;
export type MeetingReport = {
  views: Record<MeetingView, MeetingRow[]>;
  pending: MeetingView[];
  demo?: boolean;
  sourceNote?: string;
};
export const QUESTIONS = [
  ["Q1", "เนื้อหามีประโยชน์", "ORM-RevMax", "GRM"],
  ["Q2", "บริหารเวลา", "ORM-RevMax", "GRM"],
  ["Q3", "คุณภาพคำแนะนำ", "ORM-RevMax", "GRM"],
  ["Q4", "Content / Content Plan", "Marcom-B2C", "Marcom Lead"],
  ["Q5", "Ads performance", "Marcom-B2C", "Marcom Lead"],
  ["Q6", "สื่อสาร & Suggestion", "Marcom-B2C", "Marcom Lead"],
  ["Q7", "พึงพอใจรวม", "Outcome / Escalation", "GRM + Marcom Lead"],
  ["Q8", "แนะนำต่อ · referral signal (not NPS)", "Outcome / Escalation", "PM"],
  ["DECLINE", "Meeting Decline", "Non-survey", "Team lead"],
] as const;
export const RUBRIC_CATEGORIES = [
  "Pre-Meeting",
  "Data Discipline",
  "Situation Framing",
  "Insight & Root Cause",
  "Strategy Options",
  "Explanation",
  "Agreement",
  "Next-Action & Loop",
  "Objection Handling",
];
export function meetingScope(rows: MeetingRow[], filter: GlobalFilter, period: Period) {
  return rows.filter(
    (row) =>
      matchesBook(row, filter, true) &&
      String(row["meeting_date"] ?? "").slice(0, 10) >= period.from &&
      String(row["meeting_date"] ?? "").slice(0, 10) <= period.to,
  );
}
export const meetingSum = (rows: MeetingRow[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
export function meetingPercent(
  rows: MeetingRow[],
  numerator: string,
  denominator: string,
  minus?: string,
) {
  const base = meetingSum(rows, denominator) - (minus ? meetingSum(rows, minus) : 0);
  return base > 0 ? (meetingSum(rows, numerator) / base) * 100 : null;
}
export function questionAverage(rows: MeetingRow[]) {
  const scored = rows.filter(
    (row) => row["score"] != null && Number(row["score"]) >= 1 && Number(row["score"]) <= 10,
  );
  return scored.length ? meetingSum(scored, "score") / scored.length : null;
}
