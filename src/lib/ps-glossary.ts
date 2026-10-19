/** R1 display glossary for the PS Dashboard — labels only; stored values/config keys never change. */
export const TICKET_TYPE_TH: Record<string, string> = {
  SERVICING_STALL: "On-board ค้างเกินกำหนด",
  CONTRACT_FOLLOWUP: "ตามดีลที่ยังไม่ปิด",
  UPSELL_PITCH: "เสนอขายบริการเพิ่ม",
  RENEWAL_DUE: "ใกล้ถึงวันต่อสัญญา",
  GRADE_RISK: "เกรดการชำระเงินเสี่ยง",
  SURVEY_LOW: "คะแนนเซอร์เวย์ต่ำ",
  ASSIGNMENT_PENDING: "รอระบุผู้ดูแล",
};
export const ticketTypeTh = (t: string | null | undefined) => (t ? TICKET_TYPE_TH[t] ?? t : "—");
export const PHASE_TH: Record<string, string> = { P1: "ช่วง AE", P2: "ช่วงเตรียมระบบ", P3: "ช่วงก่อน Go Live" };
export const PHASE_MEANING: Record<string, string> = {
  P1: "สร้างการ์ด → ผ่าน Final Check",
  P2: "Approved → ส่ง handover ครบ / สร้างนัดประชุม (GMB → Go Live)",
  P3: "วันประชุม → Go Live",
};
export const phaseTh = (p: string | null | undefined) => (p ? PHASE_TH[p] ?? p : "");
export const DEPT_TH: Record<string, string> = { MARCOM: "Marcom", OFFICE: "The Office", AUTO: "Automation" };
export const deptTh = (d: string | null | undefined) => (d ? DEPT_TH[d] ?? d : "—");
const STATUS_TH: Record<string, string> = {
  open: "รอเริ่ม", NEW: "รอเริ่ม", "in-progress": "กำลังทำ", ACK: "กำลังทำ", IN_PROGRESS: "กำลังทำ",
  waiting: "รอลูกค้า", resolved: "เสร็จ", closed: "เสร็จ", DONE: "เสร็จ", CANCELLED: "ยกเลิก",
};
/** Ticket status (PS case + L0). waiting with a non-customer reason → "รอ · {reason}". */
export function ticketStatusTh(status: string, waitingReason?: string | null, reasonLabel?: string) {
  if (status === "waiting" && waitingReason && waitingReason.toUpperCase() !== "CUSTOMER") return `รอ · ${reasonLabel ?? waitingReason}`;
  return STATUS_TH[status] ?? status;
}
export const SOURCE_LABEL = { PS_CASE: "PS เปิดเอง", FOLLOWUP: "ติดตามจากแท็บอื่น", BOT: "ระบบสร้าง" } as const;
export const CONTRACT_STATUS_TH: Record<string, string> = { ACTIVE: "ใช้งาน", INACTIVE: "สิ้นสุด", UPCOMING: "รอเริ่ม", DRAFT: "ร่าง" };
export const RENEWAL_TH: Record<string, string> = { RENEWED: "ต่อแล้ว", IN_PROGRESS: "กำลังคุย", NOT_RENEWED: "ไม่ต่อ", LOST: "ไม่ต่อ" };
/** Strings that must never render on the PS Dashboard (R1 §1.2, invariant 8). */
export const NEVER_SHOW = ["SERVICING_STALL", "CONTRACT_FOLLOWUP", "UPSELL_PITCH", "RENEWAL_DUE", "GRADE_RISK", "SURVEY_LOW", "ASSIGNMENT_PENDING", "row-1", "distinct", "cohort", "carry", "attach-rate"];

/** Servicing plain words (R1 §8.2) — display mapping over existing shared labels. */
export function plainSv(text: string): string {
  return text
    .replace(/เกิน SLA แล้ว (\d+) วัน/g, "เลยกำหนด $1 วัน")
    .replace(/เหลือเวลาอีก (\d+) วันของ SLA/g, "อีก $1 วันถึงกำหนด")
    .replace("ครบ SLA วันนี้", "ถึงกำหนดวันนี้")
    .replace(/เร็วกว่า SLA/g, "ทันกำหนด")
    .replace(/ใกล้ครบ SLA/g, "ใกล้ถึงกำหนด")
    .replace(/เกิน SLA/g, "เลยกำหนด")
    .replace("Rate Structure ★", "Rate Structure (วันประชุม)")
    .replace("First Sync ★ (MT)", "First Sync (วันประชุม · MT)")
    .replace("Final Setup ⟨เพดาน⟩", "Final Setup (รอ handover ก่อน Training)");
}

/** R1.1 — labels shared by Tab PS, Headline, snapshot and Meeting & Survey (display only). */
export const RENEWAL_LABEL = { renewed: "ต่อแล้ว", notRenewed: "ไม่ต่อ", inProgress: "กำลังคุย" } as const;
export const CONTRACT_LABEL = { active: "ใช้งาน", inactive: "สิ้นสุด" } as const;
export const FLAG_LABEL = { red: "ธงแดง", warn: "ธงเหลือง" } as const;
export const MEETING_STATUS_LABEL = { aeNotSent: "AE ยังไม่ส่ง", surveyPending: "รอลูกค้าตอบ", surveyCommented: "ลูกค้าแย้ง", notDone: "ยังไม่สำเร็จ" } as const;
export const TIME_LABEL = { overdue: "เลยกำหนด", nearDue: "ใกล้ถึงกำหนด", onTime: "ทันกำหนด", dueToday: "ถึงกำหนดวันนี้" } as const;
/** AE display name from an owner id ("AE001-Nont" → "Nont"); missing → "ไม่พบชื่อ AE". */
export function aeNameTh(id: unknown): string {
  const s = id == null ? "" : String(id).trim();
  if (!s || s === "null" || s === "undefined") return "ไม่พบชื่อ AE";
  const m = /^AE\d+-(.+)$/.exec(s);
  return m ? m[1]! : s;
}
