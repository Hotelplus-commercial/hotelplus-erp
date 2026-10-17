/**
 * Meeting & Analyzer v2.0 demo fixture — deterministic (no randomness), preview-safe.
 * Clock fixed at 2026-09-30 (Bangkok); demo card month = 2026-09, previous = 2026-08.
 * Anchor values per spec §6; invariants §5 win over example numbers where they conflict
 * (④a ORM teams: D is 3→2 because the REJECTED card HTL0083 belongs to team D).
 */
import type { MeetingReport, MeetingRow } from "./meeting-dashboard-types";

export const MEETING_DEMO_NOW = "2026-09-30T05:00:00.000Z";
const SEP = "2026-09";
const AUG = "2026-08";

type CardSpec = {
  id: string;
  hotel: string;
  name: string;
  service: "ORM" | "Marcom";
  tier?: "A" | "B" | "C" | undefined;
  status: string;
  date?: string | undefined;
  ae: string;
  team?: string | undefined;
  person?: string | undefined;
  survey?: string | undefined; // CONFIRMED | PENDING | COMMENTED | undefined (AE ยังไม่ส่ง)
};

const ORM_CARDS: CardSpec[] = [
  // Team A · Nont (4 done + 1 postponed-next-month + 1 Tier B)
  { id: "M-0101", hotel: "HTL0101", name: "Demo Hotel 101", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-05", ae: "Nont", team: "A", survey: "CONFIRMED" },
  { id: "M-0102", hotel: "HTL0102", name: "Demo Hotel 102", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-08", ae: "Nont", team: "A", survey: "CONFIRMED" },
  { id: "M-0103", hotel: "HTL0103", name: "Demo Hotel 103", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-12", ae: "Nont", team: "A", survey: "COMMENTED" },
  { id: "M-0104", hotel: "HTL0104", name: "Demo Hotel 104", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-15", ae: "Nont", team: "A" },
  { id: "M-0105", hotel: "HTL0105", name: "Demo Hotel 105", service: "ORM", tier: "A", status: "POSTPONED_NEXT_MONTH", ae: "Nont", team: "A" },
  { id: "M-0106", hotel: "HTL0106", name: "Demo Hotel 106", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-10", ae: "Nont", team: "A", survey: "CONFIRMED" },
  // Team B · Fern (2 done + NO_SHOW HTL0029 + 1 Tier B)
  { id: "M-0111", hotel: "HTL0111", name: "Demo Hotel 111", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-09", ae: "Fern", team: "B", survey: "PENDING" },
  { id: "M-0112", hotel: "HTL0112", name: "Demo Hotel 112", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-11", ae: "Fern", team: "B", survey: "CONFIRMED" },
  { id: "M-0029", hotel: "HTL0029", name: "Demo Hotel 029", service: "ORM", tier: "A", status: "NO_SHOW", date: "2026-09-22", ae: "Fern", team: "B" },
  { id: "M-0113", hotel: "HTL0113", name: "Demo Hotel 113", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-16", ae: "Fern", team: "B", survey: "CONFIRMED" },
  // Team C · Fern (3 done + 2 Tier B)
  { id: "M-0121", hotel: "HTL0121", name: "Demo Hotel 121", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-04", ae: "Fern", team: "C", survey: "CONFIRMED" },
  { id: "M-0122", hotel: "HTL0122", name: "Demo Hotel 122", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-17", ae: "Fern", team: "C", survey: "CONFIRMED" },
  { id: "M-0123", hotel: "HTL0123", name: "Demo Hotel 123", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-18", ae: "Fern", team: "C", survey: "CONFIRMED" },
  { id: "M-0124", hotel: "HTL0124", name: "Demo Hotel 124", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-19", ae: "Fern", team: "C", survey: "PENDING" },
  { id: "M-0125", hotel: "HTL0125", name: "Demo Hotel 125", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-23", ae: "Fern", team: "C", survey: "CONFIRMED" },
  // Team D · Boss (2 done + REJECTED HTL0083 + 2 Tier B)
  { id: "M-0081", hotel: "HTL0081", name: "Demo Hotel 081", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-03", ae: "Boss", team: "D", survey: "CONFIRMED" },
  { id: "M-0082", hotel: "HTL0082", name: "Demo Hotel 082", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-10", ae: "Boss", team: "D", survey: "CONFIRMED" },
  { id: "M-0083", hotel: "HTL0083", name: "Demo Hotel 083", service: "ORM", tier: "A", status: "REJECTED", ae: "Boss", team: "D" },
  { id: "M-0084", hotel: "HTL0084", name: "Demo Hotel 084", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-12", ae: "Boss", team: "D", survey: "CONFIRMED" },
  { id: "M-0085", hotel: "HTL0085", name: "Demo Hotel 085", service: "ORM", tier: "B", status: "COMPLETED", date: "2026-09-15", ae: "Boss", team: "D", survey: "CONFIRMED" },
  // Team E · Nont (2 done + 1 Tier C)
  { id: "M-0131", hotel: "HTL0131", name: "Demo Hotel 131", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-08", ae: "Nont", team: "E", survey: "CONFIRMED" },
  { id: "M-0132", hotel: "HTL0132", name: "Demo Hotel 132", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-22", ae: "Nont", team: "E", survey: "CONFIRMED" },
  { id: "M-0133", hotel: "HTL0133", name: "Demo Hotel 133", service: "ORM", tier: "C", status: "COMPLETED", date: "2026-09-24", ae: "Nont", team: "E", survey: "CONFIRMED" },
  // Re-active · Boss (2 done + 1 Tier B no-show)
  { id: "M-0141", hotel: "HTL0141", name: "Demo Hotel 141", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-09", ae: "Boss", team: "Re-active", survey: "CONFIRMED" },
  { id: "M-0142", hotel: "HTL0142", name: "Demo Hotel 142", service: "ORM", tier: "A", status: "COMPLETED", date: "2026-09-16", ae: "Boss", team: "Re-active", survey: "CONFIRMED" },
  { id: "M-0143", hotel: "HTL0143", name: "Demo Hotel 143", service: "ORM", tier: "B", status: "NO_SHOW", date: "2026-09-25", ae: "Boss", team: "Re-active" },
];

const MARCOM_CARDS: CardSpec[] = [
  // แนน (Lead) · AE Nont — 10 done + 1 REJECTED
  ...["0201", "0202", "0203", "0204", "0205", "0206"].map((h, i) => ({
    id: `M-${h}`, hotel: `HTL${h}`, name: `Demo Hotel ${h}`, service: "Marcom" as const,
    status: "COMPLETED", date: `2026-09-${String(3 + i).padStart(2, "0")}`, ae: "Nont", person: "แนน", survey: "CONFIRMED",
  })),
  { id: "M-0207", hotel: "HTL0207", name: "Demo Hotel 207", service: "Marcom", status: "REJECTED", ae: "Nont", person: "แนน" },
  { id: "M-0208", hotel: "HTL0208", name: "Demo Hotel 208", service: "Marcom", status: "COMPLETED", date: "2026-09-10", ae: "Nont", person: "แนน", survey: "COMMENTED" },
  { id: "M-0209", hotel: "HTL0209", name: "Demo Hotel 209", service: "Marcom", status: "COMPLETED", date: "2026-09-11", ae: "Nont", person: "แนน", survey: "PENDING" },
  { id: "M-0210", hotel: "HTL0210", name: "Demo Hotel 210", service: "Marcom", status: "COMPLETED", date: "2026-09-12", ae: "Nont", person: "แนน" },
  { id: "M-0211", hotel: "HTL0211", name: "Demo Hotel 211", service: "Marcom", status: "COMPLETED", date: "2026-09-15", ae: "Nont", person: "แนน", survey: "CONFIRMED" },
  // บิว · AE Nont(2+no-show) / Fern(7+postponed) — 9 done
  { id: "M-0221", hotel: "HTL0221", name: "Demo Hotel 221", service: "Marcom", status: "COMPLETED", date: "2026-09-04", ae: "Nont", person: "บิว", survey: "CONFIRMED" },
  { id: "M-0222", hotel: "HTL0222", name: "Demo Hotel 222", service: "Marcom", status: "COMPLETED", date: "2026-09-05", ae: "Nont", person: "บิว", survey: "CONFIRMED" },
  ...["0223", "0224", "0225", "0226", "0227"].map((h, i) => ({
    id: `M-${h}`, hotel: `HTL${h}`, name: `Demo Hotel ${h}`, service: "Marcom" as const,
    status: "COMPLETED", date: `2026-09-${String(8 + i).padStart(2, "0")}`, ae: "Fern", person: "บิว", survey: "CONFIRMED",
  })),
  { id: "M-0228", hotel: "HTL0228", name: "Demo Hotel 228", service: "Marcom", status: "COMPLETED", date: "2026-09-16", ae: "Fern", person: "บิว", survey: "COMMENTED" },
  { id: "M-0229", hotel: "HTL0229", name: "Demo Hotel 229", service: "Marcom", status: "NO_SHOW", date: "2026-09-19", ae: "Nont", person: "บิว" },
  { id: "M-0230", hotel: "HTL0230", name: "Demo Hotel 230", service: "Marcom", status: "POSTPONED", ae: "Fern", person: "บิว" },
  { id: "M-0231", hotel: "HTL0231", name: "Demo Hotel 231", service: "Marcom", status: "COMPLETED", date: "2026-09-22", ae: "Fern", person: "บิว", survey: "PENDING" },
  // โบว์ · AE Boss — 9 done + 1 no-show
  ...["0241", "0242", "0243", "0244", "0245", "0246", "0247", "0248"].map((h, i) => ({
    id: `M-${h}`, hotel: `HTL${h}`, name: `Demo Hotel ${h}`, service: "Marcom" as const,
    status: "COMPLETED", date: `2026-09-${String(4 + i).padStart(2, "0")}`, ae: "Boss", person: "โบว์", survey: "CONFIRMED",
  })),
  { id: "M-0249", hotel: "HTL0249", name: "Demo Hotel 249", service: "Marcom", status: "NO_SHOW", date: "2026-09-18", ae: "Boss", person: "โบว์" },
  { id: "M-0250", hotel: "HTL0250", name: "Demo Hotel 250", service: "Marcom", status: "COMPLETED", date: "2026-09-23", ae: "Boss", person: "โบว์" },
  // เจน · AE Fern(5) / Boss(3) / Nont(no-show) / Fern(not-assign) — 8 done
  ...["0261", "0262", "0263", "0264", "0265"].map((h, i) => ({
    id: `M-${h}`, hotel: `HTL${h}`, name: `Demo Hotel ${h}`, service: "Marcom" as const,
    status: "COMPLETED", date: `2026-09-${String(5 + i).padStart(2, "0")}`, ae: "Fern", person: "เจน", survey: "CONFIRMED",
  })),
  ...["0266", "0267", "0268"].map((h, i) => ({
    id: `M-${h}`, hotel: `HTL${h}`, name: `Demo Hotel ${h}`, service: "Marcom" as const,
    status: "COMPLETED", date: `2026-09-${String(12 + i).padStart(2, "0")}`, ae: "Boss", person: "เจน", survey: "CONFIRMED",
  })),
  { id: "M-0269", hotel: "HTL0269", name: "Demo Hotel 269", service: "Marcom", status: "NO_SHOW", date: "2026-09-24", ae: "Nont", person: "เจน" },
  { id: "M-0270", hotel: "HTL0270", name: "Demo Hotel 270", service: "Marcom", status: "NOT_ASSIGN", ae: "Fern", person: "เจน" },
];

/** August funnel: Tier A base 17 / completed 16 · Marcom base 40 / completed 34. */
const AUG_CARDS: CardSpec[] = [
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `M-A${i}`, hotel: `HTL08${String(i).padStart(2, "0")}`, name: `Demo Hotel 08${i}`,
    service: "ORM" as const, tier: "A" as const, status: i < 16 ? "COMPLETED" : "NO_SHOW",
    date: `2026-08-${String(5 + (i % 20)).padStart(2, "0")}`, ae: ["Nont", "Fern", "Boss"][i % 3]!,
    team: ["A", "B", "C", "D", "E", "Re-active"][i % 6]!, survey: i < 16 ? "CONFIRMED" : undefined,
  })),
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `M-B${i}`, hotel: `HTL09${String(i).padStart(2, "0")}`, name: `Demo Hotel 09${i}`,
    service: "Marcom" as const, status: i < 34 ? "COMPLETED" : "NO_SHOW",
    date: `2026-08-${String(4 + (i % 22)).padStart(2, "0")}`, ae: ["Nont", "Fern", "Boss"][i % 3]!,
    person: ["แนน", "บิว", "โบว์", "เจน"][i % 4]!, survey: i < 34 ? "CONFIRMED" : undefined,
  })),
];

const toRow = (c: CardSpec, month: string): MeetingRow => ({
  meeting_id: c.id,
  card_month: month,
  service_line: c.service,
  tier: c.tier ?? null,
  hotel_id: c.hotel,
  hotel_name: c.name,
  status: c.status,
  meeting_date: c.date ?? null,
  ae_owner_id: c.ae,
  orm_team: c.team ?? null,
  marcom_owner_id: c.person ?? null,
  survey_status: c.survey ?? null,
  pending_sync: false,
});

/** ④b portfolio sizes (hotels per owner, month-aware caretaker join). */
export const DEMO_HOTEL_COUNT: Record<string, number> = {
  A: 14, B: 12, C: 12, D: 11, E: 9, "Re-active": 8,
  "แนน": 11, "บิว": 11, "โบว์": 10, "เจน": 10,
  Nont: 15, Fern: 14, Boss: 13,
};

/* ---------- survey answers (⑤) ---------- */
const ORM_QS = ["Q1", "Q2", "Q3", "Q7", "Q8"] as const;
const MC_QS = ["Q4", "Q5", "Q6", "Q7", "Q8"] as const;
/** hotel → Q → [Sep score, Aug score] */
const SPECIAL_SCORES: Record<string, Record<string, [number, number]>> = {
  HTL0101: { Q1: [5, 8] }, // ธงแดง
  HTL0102: { Q1: [6, 8] }, // เตือน
  HTL0111: { Q1: [7, 9] }, // note only
  HTL0112: { Q2: [5, 8] }, // ธงแดง
  HTL0121: { Q2: [6, 7] }, // เตือนครั้งที่ 2 → ธงแดง (escalated)
  HTL0122: { Q3: [5, 8] }, // ธงแดง
  HTL0081: { Q3: [6, 7], Q1: [7, 8] }, // เตือน · team D Q1 cell
  HTL0082: { Q1: [8, 8] },
  HTL0084: { Q1: [9, 8] },
  HTL0085: { Q1: [9, 9] },
  HTL0131: { Q7: [5, 8] }, // ธงแดง ผลลัพธ์
  HTL0141: { Q8: [5, 7] }, // ธงแดง ผลลัพธ์
  HTL0201: { Q4: [5, 7] }, // ธงแดง
  HTL0202: { Q4: [6, 8] }, // เตือน
  HTL0203: { Q4: [7, 9] }, // note only
  HTL0204: { Q5: [5, 7] }, // ธงแดง · แนน (Lead) + PM
  HTL0205: { Q5: [7, 9] }, // note only
  HTL0221: { Q7: [6, 8] }, // เตือน ผลลัพธ์
};
/** default Sep score per Q (Aug default = PREV_DEFAULT). */
const SEP_DEFAULT: Record<string, number> = { Q1: 8, Q2: 8, Q3: 8, Q4: 8, Q5: 8, Q6: 8, Q7: 8, Q8: 8 };
const AUG_DEFAULT: Record<string, number> = { Q1: 8, Q2: 9, Q3: 8, Q4: 8, Q5: 9, Q6: 7, Q7: 8, Q8: 8 };
/** extra Sep scores to shape each Q's median (applied round-robin to non-special hotels). */
const SEP_SHAPE: Record<string, number[]> = {
  Q1: [9, 9, 9, 9, 9], // 5 nines, rest 8
  Q2: [7, 7, 7, 7, 9, 9, 9, 9, 9], // 4 sevens + 5 nines, rest 8
  Q3: [7, 7, 7, 9, 9, 9, 9, 9],
  Q4: [7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9],
  Q5: [7, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9],
  Q6: [7, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9],
  Q7: [7, 7, 7, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  Q8: [7, 7, 7, 7, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
};

function surveyRows(cards: MeetingRow[], month: string): MeetingRow[] {
  const rows: MeetingRow[] = [];
  const shapeIdx: Record<string, number> = {};
  for (const card of cards) {
    if (card["status"] !== "COMPLETED" || !card["survey_status"]) continue;
    const qs = card.service_line === "ORM" ? ORM_QS : MC_QS;
    const caretaker =
      card.service_line === "ORM" ? `ORM ทีม ${String(card["orm_team"])}` : `Marcom ${String(card["marcom_owner_id"])}`;
    for (const q of qs) {
      const special = month === SEP ? SPECIAL_SCORES[String(card.hotel_id)]?.[q] : undefined;
      let score: number;
      let prev: number | null;
      if (month === AUG) {
        score = SPECIAL_SCORES[String(card.hotel_id)]?.[q]?.[1] ?? AUG_DEFAULT[q]!;
        prev = null;
      } else if (special) {
        [score, prev] = special;
      } else {
        const shape = SEP_SHAPE[q] ?? [];
        const i = shapeIdx[q] ?? 0;
        shapeIdx[q] = i + 1;
        score = i < shape.length ? shape[i]! : SEP_DEFAULT[q]!;
        prev = AUG_DEFAULT[q]!;
      }
      rows.push({
        meeting_id: card["meeting_id"] ?? null,
        card_month: month,
        question: q,
        service_line: card.service_line ?? null,
        hotel_id: card.hotel_id ?? null,
        hotel_name: card.hotel_name ?? null,
        score,
        prev_score: prev,
        caretaker,
        ae_owner_id: card["ae_owner_id"] ?? null,
        orm_team: card["orm_team"] ?? null,
        marcom_owner_id: card["marcom_owner_id"] ?? null,
        disputed: card["survey_status"] === "COMMENTED",
        comment:
          month === SEP && (q === "Q7" || q === "Q8") && String(card.hotel_id).endsWith("1")
            ? "ขอรายละเอียดแผนราคาและขั้นตอนติดตามเพิ่มเติม"
            : null,
        pending_sync: false,
      });
    }
  }
  return rows;
}

/* ---------- flags (⑥) ---------- */
const flag = (
  id: string, group: string, topic: string, severity: string, hotel: string, name: string,
  score: number | null, flagged: string, routed: string, created: string, age: number,
  extra: Partial<MeetingRow> = {},
): MeetingRow => ({
  flag_id: id, group_name: group, topic, severity, hotel_id: hotel, hotel_name: name, score,
  flagged_user: flagged, route_target: routed, escalated_to_pm: false, escalated_from_warning: false,
  age_days: age, coaching_status: null, created_at: created, resolved_at: null, watch_until: null,
  meeting_id: `M-${hotel.slice(3)}`, service_line: group === "SYNCUP" ? "Marcom" : "ORM",
  ae_owner_id: null, orm_team: null, marcom_owner_id: null, pending_sync: false, ...extra,
});

const FLAGS: MeetingRow[] = [
  // SNAPSHOT open ×4
  flag("F-01", "SNAPSHOT", "Q1", "FLAG", "HTL0101", "Demo Hotel 101", 5, "ORM ทีม A", "GRM", "2026-09-06", 24, { ae_owner_id: "Nont", orm_team: "A", coaching_status: "กำลังโค้ช" }),
  flag("F-02", "SNAPSHOT", "Q2", "FLAG", "HTL0112", "Demo Hotel 112", 5, "ORM ทีม B", "GRM", "2026-09-12", 18, { ae_owner_id: "Fern", orm_team: "B", coaching_status: "รอรับงาน" }),
  flag("F-03", "SNAPSHOT", "Q2", "FLAG", "HTL0121", "Demo Hotel 121", 6, "ORM ทีม C", "GRM", "2026-09-18", 12, { ae_owner_id: "Fern", orm_team: "C", escalated_from_warning: true, coaching_status: "กำลังโค้ช" }),
  flag("F-04", "SNAPSHOT", "Q3", "FLAG", "HTL0122", "Demo Hotel 122", 5, "ORM ทีม C", "GRM", "2026-09-19", 11, { ae_owner_id: "Fern", orm_team: "C" }),
  // SYNCUP open ×2
  flag("F-05", "SYNCUP", "Q4", "FLAG", "HTL0201", "Demo Hotel 201", 5, "Marcom แนน", "Marcom Lead", "2026-09-07", 23, { ae_owner_id: "Nont", marcom_owner_id: "แนน", coaching_status: "รอรับงาน" }),
  flag("F-06", "SYNCUP", "Q5", "FLAG", "HTL0204", "Demo Hotel 204", 5, "Marcom แนน", "แนน (Lead) + PM", "2026-09-09", 21, { ae_owner_id: "Nont", marcom_owner_id: "แนน", escalated_to_pm: true }),
  // OUTCOME open ×2
  flag("F-07", "OUTCOME", "Q7", "FLAG", "HTL0131", "Demo Hotel 131", 5, "ORM ทีม E", "GRM + Marcom Lead · PM", "2026-09-10", 20, { ae_owner_id: "Nont", orm_team: "E", escalated_to_pm: true }),
  flag("F-08", "OUTCOME", "Q8", "FLAG", "HTL0141", "Demo Hotel 141", 5, "ORM ทีม Re-active", "GRM + Marcom Lead · PM", "2026-09-11", 19, { ae_owner_id: "Boss", orm_team: "Re-active", escalated_to_pm: true }),
  // DECLINE open ×1 (ties to ②) + closed Marcom REJECTED
  flag("F-09", "DECLINE", "REJECTED", "FLAG", "HTL0083", "Demo Hotel 083", null, "ORM ทีม D", "หัวหน้าทีมตามบริการ", "2026-09-20", 10, { ae_owner_id: "Boss", orm_team: "D", coaching_status: "รอรับงาน" }),
  flag("F-10", "DECLINE", "REJECTED", "FLAG", "HTL0207", "Demo Hotel 207", null, "Marcom แนน", "หัวหน้าทีมตามบริการ", "2026-08-12", 49, { ae_owner_id: "Nont", marcom_owner_id: "แนน", resolved_at: "2026-09-08" }),
  // Watch list (WARNING, not escalated, inside 3-month window) — 14 rows
  flag("W-01", "SNAPSHOT", "Q1", "WARNING", "HTL0102", "Demo Hotel 102", 6, "ORM ทีม A", "GRM", "2026-09-06", 24, { ae_owner_id: "Nont", orm_team: "A", watch_until: "2026-12-06" }),
  flag("W-02", "SNAPSHOT", "Q3", "WARNING", "HTL0081", "Demo Hotel 081", 6, "ORM ทีม D", "GRM", "2026-09-04", 26, { ae_owner_id: "Boss", orm_team: "D", watch_until: "2026-12-04" }),
  flag("W-03", "SYNCUP", "Q4", "WARNING", "HTL0202", "Demo Hotel 202", 6, "Marcom แนน", "Marcom Lead", "2026-09-05", 25, { ae_owner_id: "Nont", marcom_owner_id: "แนน", watch_until: "2026-12-05" }),
  flag("W-04", "OUTCOME", "Q7", "WARNING", "HTL0221", "Demo Hotel 221", 6, "Marcom บิว", "GRM + Marcom Lead · PM", "2026-09-05", 25, { ae_owner_id: "Nont", marcom_owner_id: "บิว", watch_until: "2026-12-05" }),
  ...Array.from({ length: 5 }, (_, i) =>
    flag(`W-1${i}`, "SNAPSHOT", ["Q1", "Q2", "Q3"][i % 3]!, "WARNING", `HTL07${i}`, `Demo Hotel 07${i}`, 6,
      `ORM ทีม ${["A", "B", "C", "D", "E"][i]}`, "GRM", `2026-08-${String(10 + i).padStart(2, "0")}`, 40 + i,
      { ae_owner_id: ["Nont", "Fern", "Boss"][i % 3]!, orm_team: ["A", "B", "C", "D", "E"][i]!, watch_until: `2026-11-${String(10 + i).padStart(2, "0")}` })),
  ...Array.from({ length: 5 }, (_, i) =>
    flag(`W-2${i}`, "SYNCUP", ["Q4", "Q5", "Q6"][i % 3]!, "WARNING", `HTL06${i}`, `Demo Hotel 06${i}`, 6,
      `Marcom ${["แนน", "บิว", "โบว์", "เจน"][i % 4]}`, "Marcom Lead", `2026-07-${String(12 + i).padStart(2, "0")}`, 70 + i,
      { ae_owner_id: ["Nont", "Fern", "Boss"][i % 3]!, marcom_owner_id: ["แนน", "บิว", "โบว์", "เจน"][i % 4]!, watch_until: `2026-10-${String(12 + i).padStart(2, "0")}` })),
];

/* ---------- report assembly ---------- */
export function demoMeetingReport(): MeetingReport {
  const sepCards = [...ORM_CARDS, ...MARCOM_CARDS].map((c) => toRow(c, SEP));
  const augCards = AUG_CARDS.map((c) => toRow(c, AUG));
  const cards = [...sepCards, ...augCards];

  // v_meeting_tierA_pending — current month, Tier A base, latest status ∉ {COMPLETED, SURVEY_SUBMITTED}
  const tierAPending: MeetingRow[] = [
    { meeting_id: "M-0083", card_month: SEP, hotel_id: "HTL0083", hotel_name: "Demo Hotel 083", owner_ae_id: "Boss", orm_team: "D", status: "REJECTED", meeting_date: null, days_to_cutoff: -5, pending_sync: false },
    { meeting_id: "M-0029", card_month: SEP, hotel_id: "HTL0029", hotel_name: "Demo Hotel 029", owner_ae_id: "Fern", orm_team: "B", status: "NO_SHOW", meeting_date: "2026-09-22", days_to_cutoff: -5, pending_sync: false },
  ];

  // v_meeting_by_owner — derived from the same cards (keeps invariants by construction)
  const byOwner: MeetingRow[] = [];
  const lenses: [string, (c: MeetingRow) => string | null][] = [
    ["ORM_TEAM", (c) => (c.service_line === "ORM" ? String(c["orm_team"]) : null)],
    ["MARCOM_PERSON", (c) => (c.service_line === "Marcom" ? String(c["marcom_owner_id"]) : null)],
    ["AE", (c) => String(c["ae_owner_id"])],
  ];
  for (const month of [SEP, AUG]) {
    const monthCards = cards.filter((c) => c["card_month"] === month);
    for (const [lens, key] of lenses) {
      const owners = [...new Set(monthCards.map(key).filter(Boolean))] as string[];
      for (const owner of owners) {
        const owned = monthCards.filter((c) => key(c) === owner);
        const ormA = owned.filter((c) => c.service_line === "ORM" && c["tier"] === "A" && c["status"] !== "POSTPONED_NEXT_MONTH");
        const mc = owned.filter((c) => c.service_line === "Marcom" && c["status"] !== "POSTPONED_NEXT_MONTH");
        const scheduled = owned.filter((c) => ["CONFIRMED", "COMPLETED", "NO_SHOW", "SURVEY_SUBMITTED"].includes(String(c["status"])));
        byOwner.push({
          card_month: month, lens, owner,
          a_base: ormA.length,
          a_completed: ormA.filter((c) => ["COMPLETED", "SURVEY_SUBMITTED"].includes(String(c["status"]))).length,
          mc_base: mc.length,
          mc_completed: mc.filter((c) => ["COMPLETED", "SURVEY_SUBMITTED"].includes(String(c["status"]))).length,
          scheduled_completed: scheduled.filter((c) => ["COMPLETED", "SURVEY_SUBMITTED"].includes(String(c["status"]))).length,
          scheduled_waiting: scheduled.filter((c) => c["status"] === "CONFIRMED").length,
          scheduled_no_show: scheduled.filter((c) => c["status"] === "NO_SHOW").length,
          hotel_count: month === SEP ? (DEMO_HOTEL_COUNT[owner] ?? 10) : 10,
          pending_sync: false,
        });
      }
    }
  }

  // v_meeting_completion — tile 2 grain (card month × service)
  const completion: MeetingRow[] = [SEP, AUG].flatMap((month) => {
    const mc = cards.filter((c) => c["card_month"] === month);
    return (["ORM", "Marcom"] as const).map((service) => {
      const rows = mc.filter((c) => c.service_line === service && c["status"] !== "POSTPONED_NEXT_MONTH");
      const base = service === "ORM" ? rows.filter((c) => c["tier"] === "A") : rows;
      return {
        meeting_id: null, card_month: month, service_line: service,
        completed: rows.filter((c) => ["COMPLETED", "SURVEY_SUBMITTED"].includes(String(c["status"]))).length,
        base: base.length, pending_sync: false,
      };
    });
  });

  const surveys = [...surveyRows(sepCards, SEP), ...surveyRows(augCards, AUG)];

  return {
    views: {
      v_meeting_funnel: cards,
      v_meeting_tierA_pending: tierAPending,
      v_meeting_by_owner: byOwner,
      v_meeting_completion: completion,
      v_meeting_survey_scores: surveys,
      v_meeting_flags: FLAGS,
      v_meeting_rubric_summary: [],
    },
    pending: ["v_meeting_rubric_summary"],
    demo: true,
  };
}
