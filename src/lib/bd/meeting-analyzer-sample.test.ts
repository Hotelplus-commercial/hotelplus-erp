import { describe, expect, it } from "vitest";
import { MA_TILES, MA_TOPICS, filterFlags, filterLatest, inPeriod, sessionsOf } from "./meeting-analyzer-sample";

describe("SP9 BD Meeting Analyzer sample (IMG-7)", () => {
  it("tiles match IMG-7", () => expect(MA_TILES).toEqual({ sessions: 326, teamAvg: 59, flags: 461, processing: 0 }));
  it("eight topics S1–S8 with S6 = 5/15", () => {
    expect(MA_TOPICS.map((t) => t.code)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    expect(MA_TOPICS[5]).toMatchObject({ score: 5, max: 15 });
  });
  it("ชาร่า has 15 sessions", () => expect(sessionsOf("ชาร่า")).toHaveLength(15));
  it("team filter narrows flags and latest scores", () => {
    expect(filterFlags("มุนิน")).toHaveLength(2);
    expect(filterLatest("เหมียว")[0].score).toBe(86);
    expect(filterFlags("all")).toHaveLength(6);
  });
  it("period filter: 7 days before 6 Nov 2026", () => {
    expect(inPeriod("3/11", "7d")).toBe(true);
    expect(inPeriod("28/10", "7d")).toBe(false);
    expect(inPeriod("6/10", "30d")).toBe(false);
  });
});
