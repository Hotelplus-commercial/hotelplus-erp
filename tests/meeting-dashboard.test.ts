import { describe, expect, test } from "bun:test";
import { demoMeetingReport, MEETING_DEMO_NOW } from "../src/lib/meeting-dashboard-demo";
import { defaultGlobalFilter, monthPeriod } from "../src/lib/ps-dashboard-global";
import {
  aggregateFunnel,
  completionRatio,
  isTierALate,
  median,
  meetingScope,
  MEETING_CONFIG,
  bkkDay,
  type MeetingRow,
} from "../src/lib/meeting-dashboard-types";

const report = demoMeetingReport();
const now = new Date(MEETING_DEMO_NOW);
const sep = monthPeriod(new Date("2026-09-30"));
const f = { ...defaultGlobalFilter, range: "mtd" as const };
const cards = meetingScope(report.views.v_meeting_funnel, f, sep);
const orm = aggregateFunnel(cards, "ORM", now);
const mc = aggregateFunnel(cards, "Marcom", now);
const surveys = meetingScope(report.views.v_meeting_survey_scores, f, sep);
const flags = report.views.v_meeting_flags;
const openFlags = flags.filter((r) => !r["resolved_at"]);
const sepNewFlags = flags.filter((r) => String(r["created_at"]).startsWith("2026-09"));

describe("Meeting v2.0 demo anchors (§6)", () => {
  test("funnel anchors: ORM 17/15 · Marcom 42/36 · tiles 88/98/83", () => {
    expect(orm.base).toBe(17);
    expect(orm.scheduled).toEqual({ A: 16, B: 7, C: 1, total: 24 });
    expect(orm.completed).toEqual({ A: 15, B: 6, C: 1, total: 22 });
    expect(orm.surveySuccess.total).toBe(18);
    expect(orm.drops.rejected).toBe(1);
    expect(orm.drops.noShow).toBe(1);
    expect(orm.drops.aeNotSent).toBe(1);
    expect(orm.drops.surveyPending).toBe(2);
    expect(orm.drops.surveyCommented).toBe(1);
    expect(mc.base).toBe(42);
    expect(mc.scheduled.total).toBe(39);
    expect(mc.completed.total).toBe(36);
    expect(mc.surveySuccess.total).toBe(30);
    expect(mc.drops.notAssigned).toBe(1);
    expect(mc.drops.postponed).toBe(1);
    expect(mc.drops.rejected).toBe(1);
    expect(mc.drops.noShow).toBe(3);
    const t = completionRatio(cards, now);
    expect(t.done).toBe(58);
    expect(t.base).toBe(59);
    expect(Math.round(t.pct!)).toBe(98);
    // tile 3: survey success 48/58 = 83%; old KPI #3 = submitted/completed = 55/58 = 95%
    expect(orm.surveySuccess.total + mc.surveySuccess.total).toBe(48);
    expect(Math.round((48 / 58) * 100)).toBe(83);
    expect(Math.round((55 / 58) * 100)).toBe(95);
  });
  test("② pending list = 2 rows (HTL0083 rejected · HTL0029 no-show)", () => {
    const pending = report.views.v_meeting_tierA_pending;
    expect(pending.map((r) => r.hotel_id).sort()).toEqual(["HTL0029", "HTL0083"]);
    expect(pending.every((r) => r["days_to_cutoff"] === -5)).toBe(true);
  });
  test("④a/④b owner lens totals reconcile with the funnel", () => {
    const sepOwner = report.views.v_meeting_by_owner.filter(
      (r) => r["card_month"] === "2026-09" && r["lens"] === "ORM_TEAM",
    );
    const sum = (key: string) => sepOwner.reduce((s, r) => s + Number(r[key] ?? 0), 0);
    expect(sum("a_base")).toBe(17);
    expect(sum("a_completed")).toBe(15);
    expect(sum("scheduled_completed")).toBe(22); // invariant 5
    const team = (o: string) => sepOwner.find((r) => r["owner"] === o)!;
    expect([team("A")!["a_base"], team("A")!["a_completed"]]).toEqual([4, 4]);
    expect([team("B")!["a_base"], team("B")!["a_completed"]]).toEqual([3, 2]);
    expect([team("D")!["a_base"], team("D")!["a_completed"]]).toEqual([3, 2]);
    expect(team("A")!["hotel_count"]).toBe(14);
    const ae = report.views.v_meeting_by_owner.filter(
      (r) => r["card_month"] === "2026-09" && r["lens"] === "AE",
    );
    const aeRow = (o: string) => ae.find((r) => r["owner"] === o)!;
    expect(aeRow("Nont")!["scheduled_completed"]).toBe(20);
    expect(aeRow("Nont")!["scheduled_no_show"]).toBe(2);
    expect(aeRow("Fern")!["scheduled_no_show"]).toBe(1);
    expect(aeRow("Boss")!["scheduled_completed"]).toBe(18);
  });
});

describe("Meeting v2.0 invariants (§5)", () => {
  test("I2: Tier A drop reasons reconcile at each funnel step", () => {
    expect(orm.base - orm.scheduled.A).toBe(
      orm.drops.notAssigned + orm.drops.postponed + orm.drops.rejected,
    );
    expect(orm.scheduled.A - orm.completed.A).toBe(
      orm.drops.waiting + orm.drops.pastNotUpdated + orm.drops.noShow,
    );
  });
  test("I3: completed − survey_success = AE ยังไม่ส่ง + รอลูกค้าตอบ + ลูกค้าแย้ง (per service)", () => {
    for (const a of [orm, mc])
      expect(a.completed.total - a.surveySuccess.total).toBe(
        a.drops.aeNotSent + a.drops.surveyPending + a.drops.surveyCommented,
      );
  });
  test("I4: ② row count = a_base − a_completed (current month)", () => {
    expect(report.views.v_meeting_tierA_pending.length).toBe(orm.base - orm.completed.A);
  });
  test("I6: survey n per service = completed − AE ยังไม่ส่ง; histogram base = submitted only", () => {
    const ormSurveys = surveys.filter((r) => r.service_line === "ORM");
    const mcSurveys = surveys.filter((r) => r.service_line === "Marcom");
    expect(new Set(ormSurveys.map((r) => r["meeting_id"])).size).toBe(orm.completed.total - orm.drops.aeNotSent);
    expect(new Set(mcSurveys.map((r) => r["meeting_id"])).size).toBe(mc.completed.total - mc.drops.aeNotSent);
    expect(new Set(surveys.map((r) => r["meeting_id"])).size).toBe(55);
  });
  test("I7: answers ≤5 = new FLAG flags (excl. escalations) · answers = 6 = new WARNINGs, per Q", () => {
    for (const q of ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]) {
      const answers = surveys.filter((r) => r["question"] === q);
      const le5 = answers.filter((r) => Number(r["score"]) <= 5).length;
      const eq6 = answers.filter((r) => Number(r["score"]) === 6).length;
      const newFlags = sepNewFlags.filter(
        (r) => r["topic"] === q && r["severity"] === "FLAG" && !r["escalated_from_warning"],
      ).length;
      const newWarns = sepNewFlags.filter(
        (r) => r["topic"] === q && (r["severity"] === "WARNING" || r["escalated_from_warning"]),
      ).length;
      expect([q, le5]).toEqual([q, newFlags]);
      expect([q, eq6]).toEqual([q, newWarns]);
    }
  });
  test("I8: ⑥ open total = open list rows = 9 · watch list = 14", () => {
    expect(openFlags.filter((r) => r["severity"] === "FLAG").length).toBe(9);
    expect(openFlags.filter((r) => r["severity"] === "WARNING").length).toBe(14);
    const byGroup = (g: string) =>
      openFlags.filter((r) => r["group_name"] === g && r["severity"] === "FLAG").length;
    expect(byGroup("SNAPSHOT")).toBe(4);
    expect(byGroup("SYNCUP")).toBe(2);
    expect(byGroup("OUTCOME")).toBe(2);
    expect(byGroup("DECLINE")).toBe(1);
  });
  test("I9: Q8 is never labelled NPS anywhere in the fixture", () => {
    expect(JSON.stringify(report)).not.toContain("NPS");
  });
});

describe("Meeting v2.0 helpers", () => {
  test("isTierALate: Bangkok cutoff rule (demo clock 30 Sep > cutoff 25 → late)", () => {
    expect(isTierALate("2026-09", now)).toBe(true);
    expect(isTierALate("2026-09", new Date("2026-09-25T16:59:59Z"))).toBe(false); // 25 Sep 23:59 BKK
    expect(isTierALate("2026-09", new Date("2026-09-25T17:00:01Z"))).toBe(true); // 26 Sep 00:00 BKK
    expect(isTierALate("2026-10", now)).toBe(false);
  });
  test("median: even count = midpoint with .5", () => {
    expect(median([7, 8, 9, 9])).toBe(8.5);
    expect(median([8])).toBe(8);
    expect(median([])).toBeNull();
  });
  test("⑤ survey medians: Q2/Q5 drop 1 · Q3 flat with rising ≤6 · Q6 rises", () => {
    const aug = report.views.v_meeting_survey_scores.filter((r) => r["card_month"] === "2026-08");
    const med = (rows: MeetingRow[], q: string) =>
      median(rows.filter((r) => r["question"] === q).map((r) => Number(r["score"])));
    expect(med(surveys, "Q2")).toBe(8);
    expect(med(aug, "Q2")).toBe(9);
    expect(med(surveys, "Q5")).toBe(8);
    expect(med(aug, "Q5")).toBe(9);
    expect(med(surveys, "Q3")).toBe(8);
    expect(med(aug, "Q3")).toBe(8);
    expect(med(surveys, "Q6")).toBe(8);
    expect(med(aug, "Q6")).toBe(7);
    const le6 = (rows: MeetingRow[], q: string) =>
      rows.filter((r) => r["question"] === q && Number(r["score"]) <= 6).length;
    expect(le6(surveys, "Q3")).toBe(2);
    expect(le6(aug, "Q3")).toBe(0);
  });
  test("deterministic: two builds are byte-identical", () => {
    expect(JSON.stringify(demoMeetingReport())).toBe(JSON.stringify(report));
  });
  test("config defaults per §1.4", () => {
    expect(MEETING_CONFIG.cutoff_day).toBe(25);
    expect(MEETING_CONFIG.funnel_scale).toBe(1.6);
    expect(MEETING_CONFIG.small_n).toBe(5);
    expect(bkkDay(now)).toBe("2026-09-30");
  });
});
