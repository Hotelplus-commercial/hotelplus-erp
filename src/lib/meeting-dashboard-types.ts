import type { PsReportRow } from "./ps-dashboard-types";
import { matchesBook, type GlobalFilter, type Period } from "./ps-dashboard-global";

/**
 * Meeting & Analyzer tab v2.0 — read-only projections.
 * Card-month grain (never meeting_date); all dates use the Asia/Bangkok calendar.
 * v_meeting_count_by_ae / v_meeting_survey_collection are deprecated (kept in DB, unread).
 */
export const MEETING_VIEWS = [
  "v_meeting_funnel",
  "v_meeting_tierA_pending",
  "v_meeting_by_owner",
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

/** §1.4 config — stored as data, never re-hard-coded inside components. */
export const MEETING_CONFIG = {
  cutoff_day: 25,
  window_start_day: 11,
  funnel_scale: 1.6,
  decline_note_pts: 2,
  small_n: 5,
  warning_window_months: 3,
  flag_red_max: 5,
  flag_warn_score: 6,
} as const;

export const QUESTIONS = [
  ["Q7", "พึงพอใจรวม", "ภาพรวม"],
  ["Q8", "แนะนำต่อ (referral signal)", "ภาพรวม"],
  ["Q1", "เนื้อหามีประโยชน์", "ORM"],
  ["Q2", "บริหารเวลา", "ORM"],
  ["Q3", "คุณภาพคำแนะนำ", "ORM"],
  ["Q4", "Content / Content Plan", "Marcom"],
  ["Q5", "Ads performance", "Marcom"],
  ["Q6", "สื่อสาร & Suggestion", "Marcom"],
] as const;
export type QuestionId = (typeof QUESTIONS)[number][0];
export const SERVICE_NAME = { ORM: "ORM · Snapshot Meeting", Marcom: "Marcom · Sync up Meeting" } as const;
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

/** Real status enums (§1.2). */
export const SCHEDULED_STATUSES = ["CONFIRMED", "COMPLETED", "NO_SHOW", "SURVEY_SUBMITTED"];
export const COMPLETED_STATUSES = ["COMPLETED", "SURVEY_SUBMITTED"];
export const SURVEY_SUCCESS = ["CONFIRMED", "AUTO_CONFIRMED"];

/* ---------- Asia/Bangkok calendar dates (§1.1) ---------- */
const bkkFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const bkkDay = (d: Date | string) => bkkFmt.format(typeof d === "string" ? new Date(d) : d);
export const cardMonthOf = (d: Date | string) => bkkDay(d).slice(0, 7);
const dayNum = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) / 864e5;
export const bkkDayNum = (d: Date | string) => dayNum(bkkDay(d));

/** §1.5 red rule — one helper reused by tile 1, ①, ② and ④a. */
export function isTierALate(cardMonth: string, today: Date, cutoffDay = MEETING_CONFIG.cutoff_day) {
  const t = bkkDay(today);
  const cutoff = `${cardMonth}-${String(cutoffDay).padStart(2, "0")}`;
  return t > cutoff;
}
/** Multi-month range: red only when every month in the range is past its cutoff. */
export function isRangeLate(months: string[], today: Date) {
  return months.length > 0 && months.every((m) => isTierALate(m, today));
}
export function daysToCutoff(cardMonth: string, today: Date, cutoffDay = MEETING_CONFIG.cutoff_day) {
  return dayNum(`${cardMonth}-${String(cutoffDay).padStart(2, "0")}`) - bkkDayNum(today);
}

/* ---------- median (§1.6 — never averages) ---------- */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] ?? null) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}
export const fmtMedian = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: 1 });

/* ---------- period scoping by card month (§1.3) ---------- */
export function monthsInPeriod(period: Period): string[] {
  const out: string[] = [];
  const [fy, fm] = period.from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = period.to.slice(0, 7).split("-").map(Number);
  let y = fy ?? 0, m = fm ?? 1;
  while (y < (ty ?? 0) || (y === ty && m <= (tm ?? 1))) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
export function meetingScope(rows: MeetingRow[], filter: GlobalFilter, period: Period) {
  const months = new Set(monthsInPeriod(period));
  const term = filter.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      matchesBook(row, filter, false) &&
      months.has(String(row["card_month"] ?? "")) &&
      (!term || `${row.hotel_name ?? ""} ${row.hotel_id ?? ""}`.toLowerCase().includes(term)),
  );
}
export const meetingSum = (rows: MeetingRow[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);

/* ---------- funnel aggregation (①, tiles 1–3, ②, ④) ---------- */
export type FunnelAgg = {
  base: number;
  scheduled: { A: number; B: number; C: number; total: number };
  completed: { A: number; B: number; C: number; total: number };
  surveySuccess: { A: number; B: number; C: number; total: number };
  drops: {
    notAssigned: number; postponed: number; rejected: number;
    waiting: number; pastNotUpdated: number; noShow: number;
    aeNotSent: number; surveyPending: number; surveyCommented: number;
  };
};
const emptyTier = () => ({ A: 0, B: 0, C: 0, total: 0 });
export function aggregateFunnel(cards: MeetingRow[], service: "ORM" | "Marcom", today: Date): FunnelAgg {
  const rows = cards.filter((r) => r.service_line === service);
  const agg: FunnelAgg = {
    base: 0,
    scheduled: emptyTier(),
    completed: emptyTier(),
    surveySuccess: emptyTier(),
    drops: { notAssigned: 0, postponed: 0, rejected: 0, waiting: 0, pastNotUpdated: 0, noShow: 0, aeNotSent: 0, surveyPending: 0, surveyCommented: 0 },
  };
  const todayNum = bkkDayNum(today);
  for (const r of rows) {
    const status = String(r["status"] ?? "");
    const tier = (String(r["tier"] ?? "A") || "A") as "A" | "B" | "C";
    const inBase = service === "Marcom" || tier === "A";
    // ORM drop lines are Tier A only (§3 ①); Marcom has no tiers. Survey drops stay all tiers.
    const dropScope = service === "Marcom" || tier === "A";
    if (status === "POSTPONED_NEXT_MONTH") continue;
    if (inBase) agg.base += 1;
    const scheduled = SCHEDULED_STATUSES.includes(status);
    const completed = COMPLETED_STATUSES.includes(status);
    if (scheduled) {
      agg.scheduled[tier] += 1; agg.scheduled.total += 1;
      if (completed) {
        agg.completed[tier] += 1; agg.completed.total += 1;
        const ss = String(r["survey_status"] ?? "");
        if (SURVEY_SUCCESS.includes(ss)) { agg.surveySuccess[tier] += 1; agg.surveySuccess.total += 1; }
        else if (!ss) agg.drops.aeNotSent += 1;
        else if (ss === "PENDING") agg.drops.surveyPending += 1;
        else if (ss === "COMMENTED") agg.drops.surveyCommented += 1;
      } else if (dropScope && status === "NO_SHOW") {
        agg.drops.noShow += 1;
      } else if (dropScope) {
        const md = r["meeting_date"] ? dayNum(String(r["meeting_date"]).slice(0, 10)) : null;
        if (md != null && md < todayNum) agg.drops.pastNotUpdated += 1;
        else agg.drops.waiting += 1;
      }
    } else if (inBase) {
      if (status === "REJECTED") agg.drops.rejected += 1;
      else if (status === "POSTPONED") agg.drops.postponed += 1;
      else agg.drops.notAssigned += 1; // NOT_ASSIGN / DRAFT
    }
  }
  return agg;
}

/** Tile 2 / v_meeting_completion retarget: (ORM completed all tiers + Marcom completed) ÷ (ORM Tier A base + Marcom base). */
export function completionRatio(cards: MeetingRow[], today: Date) {
  const orm = aggregateFunnel(cards, "ORM", today);
  const mc = aggregateFunnel(cards, "Marcom", today);
  const base = orm.base + mc.base;
  const done = orm.completed.total + mc.completed.total;
  return { done, base, pct: base ? (done / base) * 100 : null, orm, mc };
}

/* ---------- flags (⑥) ---------- */
export const FLAG_GROUPS = [
  { key: "SNAPSHOT", title: "ORM-Snapshot Meeting", sub: "Q1–Q3", routed: "GRM", accent: "teal" },
  { key: "SYNCUP", title: "Marcom-Sync up Meeting", sub: "Q4–Q6", routed: "Marcom Lead", accent: "indigo" },
  { key: "OUTCOME", title: "ผลลัพธ์ / Escalation", sub: "Q7 พึงพอใจ · Q8 แนะนำต่อ", routed: "GRM + Marcom Lead · PM", accent: "grey" },
  { key: "DECLINE", title: "ลูกค้าปฏิเสธนัด", sub: "นอก survey", routed: "หัวหน้าทีมตามบริการ", accent: "grey" },
] as const;
export const isOpenFlag = (row: MeetingRow) => !row["resolved_at"];
