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
  open: "รอเริ่ม", NEW: "New", "in-progress": "กำลังทำ", ACK: "กำลังทำ", IN_PROGRESS: "กำลังทำ", // Tab R1 §6.6: NEW = New (all ticket types)
  waiting: "รอลูกค้า", resolved: "เสร็จ", closed: "เสร็จ", DONE: "เสร็จ", CANCELLED: "ยกเลิก",
};
/** Ticket status (PS case + L0). waiting with a non-customer reason → "รอ · {reason}". */
export function ticketStatusTh(status: string, waitingReason?: string | null, reasonLabel?: string) {
  if (status === "waiting" && waitingReason && waitingReason.toUpperCase() !== "CUSTOMER") return `รอ · ${reasonLabel ?? waitingReason}`;
  return STATUS_TH[status] ?? status;
}
export const SOURCE_LABEL = { PS_CASE: "PS เปิดเอง", MEETING: "จากการประชุม", FOLLOWUP: "ติดตามจากแท็บอื่น", BOT: "ระบบสร้าง" } as const;
/** R1.2 §1 — PS Dashboard detail tabs, left → right. Keys are the stored tab keys (never renamed). */
export const DASHBOARD_TABS: readonly (readonly [string, string])[] = [
  ["ps", "สัญญา & ราคา"], // Tab R4 §1 (was ต่อสัญญา & ราคา) — label only, key unchanged
  ["ac", "ลูกหนี้ & ส่วนลด Partner"], // Debt Partner R1 DP1 — label only, key unchanged
  ["meeting", "Meeting & Survey"],
  ["task", "ติดตามงานผู้ให้บริการ"],
  ["servicing", "On-board / Off-board"], // Tab R4 §1 (was On-board) — label only, key unchanged
];
/** BD-AC อยู่ที่ The Office APP › BD-AC (ย้ายตาม RV23) — old ?tab=bdac links redirect via src/lib/office-bdac.ts. */
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
export const MEETING_STATUS_LABEL = { aeNotSent: "รอทำ Survey", surveyPending: "รอลูกค้าตอบ", surveyCommented: "ลูกค้าแย้ง", notDone: "ยังไม่สำเร็จ" } as const;
export const TIME_LABEL = { overdue: "เลยกำหนด", nearDue: "ใกล้ถึงกำหนด", onTime: "ทันกำหนด", dueToday: "ถึงกำหนดวันนี้" } as const;
/** AE display name from an owner id ("AE001-Nont" → "Nont"); missing → "ไม่พบชื่อ AE". */
export function aeNameTh(id: unknown): string {
  const s = id == null ? "" : String(id).trim();
  if (!s || s === "null" || s === "undefined") return "ไม่พบชื่อ AE";
  const m = /^AE\d+-(.+)$/.exec(s);
  return m ? m[1]! : s;
}
export const GRADE_D_LABEL = "ลูกค้าเกรด D";

/** Task tab · card ③ Survey stream rule line (display only; the stored survey status stays PENDING). */
export const TASK_SURVEY_RULE_TH = "รอตอบ เกิน 5 วัน";

/** Contract Renewal v1.0 — display labels (internal codes never render). */
export const RENEWAL_REQ_STATUS_TH: Record<string, string> = {
  DRAFT: "ร่าง", PENDING_APPROVAL: "รอ PM อนุมัติ", APPROVED: "อนุมัติแล้ว", RETURNED: "ส่งกลับ", READY_TO_SEND: "พร้อมส่ง",
  LINK_SENT: "ส่ง link แล้ว", SIGNED: "เซ็นแล้ว", DECLINED: "ลูกค้าไม่ต่อ", CANCELLED: "ยกเลิก",
};
export const renewalReqStatusTh = (s: string) => RENEWAL_REQ_STATUS_TH[s] ?? s;
export const RENEWAL_RECO_TH = {
  RAISE: (min: number, max: number) => `แนะนำขึ้นค่าบริการ +${min}–${max}%`,
  HOLD: "ยังไม่แนะนำให้ขึ้น", KEEP: "ต่อตามเงื่อนไขเดิม", NONE: "ไม่มีคำแนะนำ",
} as const;
export const RENEWAL_LABEL_TH = {
  renew: "ต่อสัญญา", needApproval: "ต้องให้ PM อนุมัติ", overdue: (d: number) => `รออนุมัติเกิน ${d} วัน`,
  sendLink: "ส่ง link ให้ลูกค้า", resendLink: "ส่ง link อีกครั้ง", simulateSign: "จำลองลูกค้าเซ็น",
  createAndLink: "สร้างสัญญาและ live link", submitPm: "ส่งให้ PM อนุมัติ", approve: "อนุมัติ", returnBack: "ส่งกลับ", cancel: "ยกเลิก",
  approvalItem: (h: string) => `อนุมัติเงื่อนไขต่อสัญญา · ${h}`, entityItem: (h: string) => `เปลี่ยนนิติบุคคล / ผู้ลงนาม · ${h}`,
  entityCheckbox: "ลูกค้าเปลี่ยนนิติบุคคลหรือผู้มีอำนาจลงนาม", waitEntity: "รอ AC ปิด ticket เปลี่ยนนิติบุคคล",
  reviewSend: "ตรวจและส่ง", continueEdit: "แก้ไขต่อ", viewRequest: "ดูคำขอ", previewLive: "ดูตัวอย่าง live link",
  createSendLive: "สร้าง live link และส่งให้ลูกค้า", resendLive: "ส่ง live link อีกครั้ง", openLive: "เปิด live link",
  notSigned: "ยังไม่เซ็น", signedAt: (d: string) => `เซ็นแล้ว · ${d}`, signedHint: "ลูกค้าเซ็นแล้ว · กด Mark as Done เพื่อปิดการ์ด",
  signedBadge: "ลูกค้าเซ็นแล้ว · รอ Mark as Done", scrollFirst: "เลื่อนอ่านให้ถึงหน้าสุดท้ายก่อน",
  previewWatermark: "ตัวอย่าง · ยังไม่ส่งลูกค้า", previewBanner: "ตัวอย่างสำหรับ AE · ลูกค้ายังไม่ได้รับ", needSigned: "ต้องให้ลูกค้าเซ็นก่อน",
  fields: { fee_amount: "ค่าบริการ/เดือน", commission_pct: "ค่าคอมมิชชัน %", term_months: "ระยะสัญญา (เดือน)", package: "แพ็กเกจ", start_date: "เริ่ม", end_date: "สิ้นสุด", billing_model: "รูปแบบค่าบริการ", fixed_fee: "Monthly fee", guarantee_fee: "Guarantee fee" },
  minRaise: (n: number) => `ขึ้นขั้นต่ำ ${n.toLocaleString("th-TH")} บาท`,
  ruleNote: "คำแนะนำนี้มาจากกฎตายตัวของกล่อง Repricing (ไม่ใช่ AI): ครบรอบขึ้นราคา · ราคาต่ำกว่ามูลค่าเทียบเคียง · แนวโน้มรายได้",
} as const;
export const APPROVER_ROLE_TH: Record<string, string> = { PM: "PM", HOC: "Head of Commercial", MD: "MD" };

/* ===================== Tab R1 · ต่อสัญญา & ราคา (2026-10-29) — display text only ===================== */
export const CONTRACT_SIGNAL_TYPE_TH = "แจ้งเรื่องของสัญญา";
TICKET_TYPE_TH["CONTRACT_SIGNAL"] = CONTRACT_SIGNAL_TYPE_TH;
/** §1 card titles in this tab (keys/routes/order unchanged). */
export const R1_TITLES = {
  inOut: "สัญญาเข้า–ออก (In / Out · Churn)",
  renewal: "การต่อสัญญา (Renewal)",
  lifetime: "อายุสัญญา (Contract Lifetime)",
  setup: "ระยะเวลา Setup (On-board → Go Live)",
  offboard: "การยกเลิกสัญญา (Off-board)",
  signals: "สัญญาณจากสัญญา (Contract Signals)",
  health: "สุขภาพสัญญา (Contract Health)",
  offer: "ข้อเสนอต่อสัญญา (Renewal Offer)",
} as const;
/** §6.6 ticket status display (all ticket types). ACK is shown as กำลังทำ. */
export const R1_STATUS_TH: Record<string, string> = { NEW: "New", ACK: "กำลังทำ", IN_PROGRESS: "กำลังทำ", DONE: "เสร็จ", CANCELLED: "ยกเลิก" };
export const R1_TIER_TH = { R: "แดง", A: "เหลือง", G: "เขียว" } as const;
export const R1_REASON_TH = { NOT_RENEWED: "ไม่ต่อ", EARLY_TERMINATION: "ยกเลิกก่อนกำหนด" } as const;
export const R1_INOUT = {
  question: "แต่ละบริการมีกี่สัญญา เดือนไหนได้ใครเข้า เสียใครไป",
  info: "แท่งสีเข้ม = เข้า · แท่งสีจาง = หลุด · สิ้นเดือน = เพิ่ม / ลดจากต้นเดือน หลังหักเข้า–หลุด (+0 = เท่าเดิม) · จำนวนที่ใช้งานดูที่ header “ใช้งาน” · เข้า = สัญญาบริการใหม่ · หลุด = ไม่ต่อ หรือ ยกเลิกก่อนกำหนด · การต่อสัญญาและการหยุดชั่วคราวไม่นับ · ชี้เดือนเพื่อดูรายชื่อ · ที่มา: สัญญา & บริการ · PS App",
  viewFlow: "Monthly Flow · เข้า–ออกรายเดือน",
  viewWaterfall: "Portfolio Waterfall · ฐานสัญญาสะสม",
  panelHead: (svc: string, n: number) => `■ ${svc} · ${n} สัญญา`,
  panelSum: (i: number, o: number) => `12 เดือน เข้า ${i} · หลุด ${o}`,
  axisIn: "เข้า ▲", axisOut: "หลุด ▼", endRow: "สิ้นเดือน",
  upTo: (d: number) => `ถึง ${d}`,
  net: (n: number) => `สุทธิ ${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)}`,
  inLine: (h: string) => `▲ เข้า · ${h}`,
  outLine: (h: string, r: string) => `▼ หลุด · ${h} · ${r}`,
  none: "ไม่มีความเคลื่อนไหว",
  showAll: "▾ ดูทั้ง 12 เดือน", hideOld: "▴ ซ่อน 11 เดือนก่อนหน้า",
  worst: (m: string, n: number, a: number, b: number) => `เดือนที่หลุดมากสุด ${m} · ${n} สัญญา (ORM ${a} · Marcom ${b})`,
  noWorst: "12 เดือนนี้ยังไม่มีสัญญาหลุด",
  /* v1.4.1 RN48 (Q58) */
  lapsedLine: (h: string) => `▼ ขาดอายุ รอผล · ${h} · ยังไม่นับ churn`,
  lapsedSum: (n: number) => `ขาดอายุ รอผล ${n}`,
  lapsedTip: "ขาดอายุ รอผล (ยังไม่นับ churn)",
  legend: ["เข้า", "หลุด", "ขาดอายุ รอผล (ยังไม่นับ churn)"] as const,
} as const;
/** v1.4.1 RN47 / RN49 / RN41 / RN51 (decision Q58) — header sub-lines, Tab R2 past-due banner, AC Billing notices. */
export const Q58 = {
  lapsed: "ขาดอายุ รอผล",
  headerLine: (n: number) => `ขาดอายุ รอผล ${n}`,
  headerTip: "เลยวันสิ้นสุดสัญญา · ยังไม่บันทึกผลต่อ / ไม่ต่อ · ไม่นับเป็นใช้งาน · ยังไม่นับ churn",
  unmatched: (n: number) => `ตรวจวันสิ้นสุดไม่ได้ ${n} สัญญา (ไม่มีในคลังสัญญาหลัก)`,
  pastDueBanner: (n: number) => `เลยกำหนด ${n} วัน · ขาดอายุ ไม่นับเป็นใช้งาน · AC หยุดวางบิล · ยังไม่นับ churn จนกว่าจะบันทึกผล`,
  guaranteeNotice: (x: string) => `Commission + Guarantee · Guarantee fee ฿${x} / เดือน · ระบบยังไม่คิดขั้นต่ำให้ · AC ตรวจยอดก่อนวางบิล`,
  lateManual: (start: string, signed: string, n: number, months: string) => `ต่อสัญญาล่าช้า · สัญญาเริ่ม ${start} · เซ็น ${signed} · ตรวจวางบิลย้อนหลัง ${n} รอบ (${months})`,
} as const;
export const R1_HEALTH = {
  question: "สัญญาไหนแดง / เหลือง / เขียว เพราะอะไร",
  info: "1 แถว = 1 สัญญาบริการที่ใช้งาน · ระดับสีคิดจากสัญญาณของระบบเท่านั้น · ป้ายที่ AE เลือกเองแยกอยู่แถว AE ✎ · กด “? วิธีใช้” เพื่อดูการใช้งานทีละส่วน",
  help: "? วิธีใช้",
  cols: { contract: "สัญญา", service: "บริการ", owner: "AE / ORM / Marcom", tier: "ระดับ", signals: "สัญญาณ", age: "อายุสัญญา", ticket: "Ticket" },
  ownerInfo: "บรรทัดบน = AE ผู้ดูแลสัญญา · บรรทัดล่าง = ทีม ORM หรือคน Marcom ที่ทำบริการนี้",
  tierInfo: "คิดจากสัญญาณของระบบเท่านั้น · ↑ / ↓ เปลี่ยนระดับ = ดีขึ้น / แย่ลงเทียบ 30 วันก่อน หายเองเมื่อครบ 30 วัน · แดง = ค้างชำระที่สัญญานี้ หรือเรื่องต้องระวัง ≥ 2 · เหลือง = 1 เรื่อง · เขียว = ไม่มี · เรื่องดีและโอกาสไม่หักล้าง",
  signalInfo: "แถว “ระบบ” = ระบบตรวจพบจากข้อมูล ใช้คิดระดับสี · แถว “AE ✎” = AE / PM เลือกเองตอนสร้าง ticket แสดงให้รู้ ไม่เปลี่ยนสี · ▼ ต้องระวัง · ▲ เรื่องดี · ป้าย “โอกาสขาย” = โอกาสเสนอบริการเพิ่ม · ชี้ป้ายเพื่อดูที่มา",
  oppTag: "โอกาสขาย",
  ticketInfo: "ตัวเลข = ticket ที่ยังไม่เสร็จของสัญญานี้ · ชี้ที่ตัวเลขเพื่อดูโดยย่อว่าส่งถึงใคร เรื่องอะไร · คลิกตัวเลขเพื่อไปแท็บ ติดตามงานผู้ให้บริการ · + สร้าง = ส่งเรื่องใหม่ถึงผู้เกี่ยวข้อง",
  zoneSystem: "ระบบ", zoneAe: "AE ✎", notFound: "ไม่พบ", otherOverdue: "ลูกค้าค้างชำระที่สัญญาอื่น",
  tierUp: "↑ เปลี่ยนระดับ", tierDown: "↓ เปลี่ยนระดับ", tierFrom: (t: string) => `จาก${t} ภายใน 30 วัน`,
  dueIn: (n: number) => `ครบกำหนดใน ${n} วัน`,
  create: "+ สร้าง",
  ticketHover: (h: string, s: string, n: number) => `${h} · ${s} · ${n} ticket ยังไม่เสร็จ`,
  ticketHoverFoot: "คลิกเพื่อดูรายละเอียดในแท็บ ติดตามงานผู้ให้บริการ",
  savedBy: (n: string, d: string) => `บันทึกโดย ${n} · ${d}`,
  tierAll: "ทั้งหมด", viewByContract: "รายสัญญา", viewByHotel: "จัดกลุ่มตามโรงแรม",
  groupHead: (h: string, n: number) => `${h} · ${n} สัญญา`,
  sim: "DEMO: จำลองพอร์ต 120 สัญญา",
  quick: "ตัวกรองด่วน",
  quickInfo: "กดได้หลายปุ่มพร้อมกัน (ต้องตรงทุกข้อ) · ตัวเลข = จำนวนสัญญาที่ตรงในตอนนี้ · ทั้ง 4 เรื่องแจ้งเตือนที่กระดิ่งของ AE Workspace ด้วย",
  qNoTicket: "แดง / เหลือง ยังไม่มี ticket", qDue: "ใกล้ครบกำหนด ≤ 60 วัน", qWorse: "ระดับแย่ลงใน 30 วัน", qOpp: "มีโอกาส",
  clearAll: "ล้างตัวกรองทั้งหมด",
  search: "ค้นหา ไทย / EN", svcAll: "ทั้งหมด", owners: "ผู้ดูแล ▾", groups: "หมวดสัญญาณ ▾",
  ownerGroups: { ae: "AE", orm: "ORM รายทีม", marcom: "Marcom รายคน" }, clear: "ล้าง", done: "เสร็จ",
  sortNone: "เรียง ↕", sortDesc: "มาก → น้อย ↓", sortAsc: "น้อย → มาก ↑",
  showGreen: (n: number) => `▾ แสดงระดับเขียว (${n} สัญญา)`, hideGreen: "▴ ซ่อนระดับเขียว",
  count: (n: number) => `${n} สัญญา`, hiddenGreen: (g: number) => ` · ซ่อนเขียว ${g}`,
  expanded: (n: number) => ` · หน้าแรกขยายให้แดง + เหลืองครบ ${n}`,
  perPage: ["แสดง", "สัญญาต่อหน้า"] as const,
  empty: "ไม่มีสัญญาในตัวกรองนี้",
  actAs: "สวมบท (โหมดทดสอบ)", actPm: "PM",
  ormTeam: (t: string) => `ORM ทีม ${t}`,
} as const;
export const R1_DIALOG = {
  title: "สร้าง Ticket",
  sec1: "สัญญาณของสัญญานี้", sec1System: "ระบบตรวจพบ", sec1Ae: "AE บันทึกไว้ ✎", addAll: "ใส่ทั้งหมดในทุก ticket",
  sec1Info: "เรื่องที่ระบบพบหรือ AE เคยบันทึกไว้ในสัญญานี้ · ลากหรือคลิกเพื่อใส่ ticket ที่เลือกอยู่ (กรอบน้ำเงิน) · “ใส่ทั้งหมดในทุก ticket” = ใส่ทุกป้ายในทุกใบทีเดียว",
  sec2: (n: number) => `เรื่องที่ AE แจ้งได้ (${n})`,
  sec2Info: "ทุกเรื่องที่ AE เลือกเองได้ เรียงตามหมวด · คลิกหรือลากไปใส่ ticket · พิมพ์ค้นหาเพื่อกรอง · เรื่องที่เลือกจะไปอยู่แถว AE ✎ ของสัญญา",
  search: "พิมพ์ค้นหา เช่น บิล · ประชุม · คู่แข่ง",
  sec3: (n: number) => `ระบบตรวจแล้ว ไม่พบ (${n})`,
  sec3Info: "เรื่องที่ระบบตรวจจากข้อมูลเอง และยังไม่พบในสัญญานี้ · ดูเพื่อรู้ เลือกใส่ ticket ไม่ได้ · ถ้าระบบพบเมื่อไร จะขึ้นที่ “สัญญาณของสัญญานี้” ด้านบนเอง · S = จากเซอร์เวย์ / การประชุม (เสียงลูกค้า)",
  reasonChecked: "ระบบตรวจแล้ว · ไม่พบ", reasonMarcom: "รอ Marcom App", reasonNoData: "ยังไม่มีข้อมูลให้ระบบตรวจ",
  systemOnly: "ระบบตรวจเอง · เลือกไม่ได้", noMatch: "ไม่พบเรื่องที่ตรงกับคำค้น",
  to: (n: number) => `ส่งถึง (${n} ticket)`,
  toInfo: "1 กล่อง = ผู้รับ 1 คน = 1 ticket · คลิกกล่องเพื่อเลือกว่าจะใส่ป้ายลงใบไหน · แต่ละใบมีข้อความและไฟล์แนบของตัวเอง · ทุกใบที่สร้างจากตรงนี้เป็นประเภท New · กดส่งครั้งเดียวได้ทุกใบ",
  addRecipient: "+ เพิ่มผู้รับ", newBadge: "New",
  drop: "ลากป้ายมาวาง หรือคลิกป้ายทางซ้าย", note: "ข้อความเพิ่มเติม (ไม่บังคับ)",
  attach: "+ แนบไฟล์", attachOff: "ยังไม่ได้เชื่อม Google Drive",
  attachInfo: "ไฟล์อัปโหลดเข้า Google Drive โฟลเดอร์เอกสารทั่วไปของสัญญานี้ · ticket เก็บแค่ลิงก์ · เปิดไฟล์ได้จาก ticket เท่านั้น",
  copyFirst: "ใช้ป้ายเหมือนใบแรก", remove: "ลบ", cancel: "ยกเลิก",
  send: (n: number) => `ส่ง ${n} Ticket`, resend: (n: number) => `ส่งใหม่ ${n} ใบ`,
  warnEmpty: (n: number) => `${n} ticket ยังไม่มีป้าย`, warnBdm: "มีเรื่องโอกาส · แนะนำเพิ่ม BDM", warnPartial: "มีใบที่ส่งไม่สำเร็จ · กดส่งอีกครั้งเฉพาะใบที่เหลือ",
  dupTitle: "ส่งเรื่องเดิมถึงคนเดิมซ้ำ",
  dupLine: (l: string, r: string, d: string, t: string, s: string) => `${l} ส่งถึง ${r} แล้วเมื่อ ${d} (#${t} · ${s})`,
  dupConfirm: "ยืนยันส่งอีกรอบ", dupBack: "ยกเลิก กลับไปแก้",
  ok: "✓ ส่งสำเร็จ", fail: (r: string) => `✗ ส่งไม่สำเร็จ (${r})`, timeout: "หมดเวลา",
  toastAll: (n: number) => `ส่งสำเร็จ ${n} ticket`, toastPartial: (a: number, b: number) => `ส่งสำเร็จ ${a} · ไม่สำเร็จ ${b} · ลองส่งใหม่ได้`,
  recipients: { AE: "AE", ORM: "ORM", MARCOM: "Marcom", HEAD_AE: "หัวหน้า AE", HEAD_ORM: "หัวหน้า ORM", HEAD_MARCOM: "หัวหน้า Marcom", BDM: "BDM" },
} as const;
export const R1_TOUR = {
  back: "ย้อน", close: "ปิด", next: "ถัดไป", finish: "เสร็จ",
  health: [
    { title: "ภาพรวมระดับสุขภาพ", text: "แถบนี้แบ่งสัญญาที่ใช้งานทั้งหมดเป็นแดง / เหลือง / เขียว ตามจำนวนสัญญา · ไม่เปลี่ยนตามตัวกรอง" },
    { title: "กรองตามระดับ", text: "เลือกดูเฉพาะแดง เหลือง หรือเขียว · เลือกดูรายสัญญาหรือจัดกลุ่มตามโรงแรม" },
    { title: "ตัวกรองด่วน", text: "กดได้หลายปุ่มพร้อมกัน ต้องตรงทุกข้อ · ตัวเลขคือจำนวนสัญญาที่ตรงในตอนนี้" },
    { title: "ตัวกรองใต้หัวคอลัมน์", text: "ค้นหาชื่อโรงแรมไทย / อังกฤษ เลือกบริการ ผู้ดูแล หมวดสัญญาณ และเรียงตามอายุสัญญาหรือจำนวน ticket" },
    { title: "สัญญาณ", text: "แถว ระบบ = ระบบตรวจพบ ใช้คิดสี · แถว AE ✎ = ป้ายที่ AE / PM เลือกเอง ไม่เปลี่ยนสี · ชี้ป้ายเพื่อดูที่มา" },
    { title: "Ticket", text: "ตัวเลข = ticket ที่ยังไม่เสร็จ · คลิกเพื่อไปแท็บติดตามงาน · + สร้าง = ส่งเรื่องใหม่ถึงผู้เกี่ยวข้อง" },
    { title: "ดูรายละเอียดลูกค้า", text: "คลิกชื่อหรือแถวเพื่อเปิดหน้ารายละเอียดลูกค้า (Account 360)" },
  ],
  dialog: [
    { title: "1 · เรื่องที่พบในสัญญานี้", text: "ป้ายที่ระบบพบหรือ AE เคยบันทึกไว้ · คลิกหรือลากไปใส่ ticket" },
    { title: "2 · เรื่องที่ AE แจ้งได้", text: "ทุกเรื่องที่เลือกเองได้ เรียงตามหมวด · พิมพ์ค้นหาเพื่อกรอง" },
    { title: "3 · ticket ต่อผู้รับ", text: "1 กล่อง = ผู้รับ 1 คน = 1 ticket · คลิกกล่องเพื่อเลือกว่าจะใส่ป้ายลงใบไหน" },
    { title: "4 · เพิ่มผู้รับ", text: "เพิ่มผู้รับได้ เช่น ทีม ORM หัวหน้า หรือ BDM · แต่ละคนได้ ticket ของตัวเอง" },
    { title: "5 · ส่งครั้งเดียว", text: "กดส่งครั้งเดียวได้ทุกใบ · ใบที่ส่งไม่สำเร็จส่งใหม่ได้ด้วยเลขเดิม" },
  ],
} as const;
/** §7 bell events (AE only). */
export const R1_ALERT_TH = {
  head: "สุขภาพสัญญา",
  viewAs: "ดูในนาม AE (โหมดทดสอบ)",
  CH_NO_TICKET: (n: number) => `${n} สัญญา แดง / เหลือง ยังไม่มี ticket`,
  CH_DUE_SOON: (h: string, s: string, n: number) => `${h} · ${s} ครบกำหนดสัญญาใน ${n} วัน`,
  CH_TIER_WORSE: (h: string, s: string, t: string, o: string) => `${h} · ${s} ระดับแย่ลงเป็น${t} (จาก${o})`,
  CH_OPPORTUNITY: (h: string, s: string, l: string) => `${h} · ${s} มีโอกาส: ${l}`,
} as const;
/** §9.2 renewal chip. */
export const R1_RENEWAL_CHIP = (pct: string) => `ไม่ต่อ ${pct}`;

/* ===================== Tab R2 · การ์ดการต่อสัญญา (Renewal, O-15) — display text only ===================== */
export const RN2_STAGE_TH = { NOT_STARTED: "ยังไม่เริ่ม", IN_PROGRESS: "กำลังดำเนินการ", LINK_SENT: "ส่ง link แล้ว", RENEWED: "ต่อแล้ว", LOST_OR_DECLINED: "ไม่ต่อ / หลุด" } as const;
export const RN2_ZONE_TH = { known: "รู้ผลแล้ว", open: "ยังไม่รู้ผล" } as const;
export const RN2_OUTCOME_TH = { NOT_RENEWED: "ไม่ต่อ", LOST: "ยกเลิกก่อนกำหนด" } as const;
export const RN2 = {
  title: "การต่อสัญญา (Renewal)",
  asOf: (d: string) => `ข้อมูลถึง ${d}`,
  help: "? วิธีใช้",
  info: "1 สัญญาบริการ = 1 หน่วย (โรงแรมที่มี ORM + Marcom = 2) · สัญญาอยู่ในช่วงตาม วันครบกำหนดสัญญา · ยกเลิกก่อนกำหนด ใช้วันที่มีผล · ต่อแล้ว = ลูกค้าเซ็นแล้ว (นับทันทีแม้เซ็นล่วงหน้า ไม่ต้องรอ Mark as Done) · ที่มา: การ์ดต่อสัญญา + คำขอต่อสัญญา · PS App · การ์ดสัญญาที่ยังไม่รู้ผลมี “ข้อมูลประกอบการต่อสัญญา” (สุขภาพ · ป้าย · Ticket · ค่าบริการ · คำแนะนำ) กดเปิดได้ · การ์ดที่รู้ผลแล้วบอกผลข้อเสนอ · ตัวเลขสรุปข้อเสนออยู่ใน The Office Dashboard",
  kinds: { month: "เดือน", quarter: "ไตรมาส", year: "ปี", custom: "Custom" },
  tabA: "ช่วง A · ที่ดู", tabB: "ช่วง B · ที่เทียบ", cancel: "ยกเลิก", apply: "ใช้ช่วงนี้", pickHint: "คลิกวันแรก แล้วคลิกวันสุดท้าย",
  futureNote: (l: string) => `${l} ยังไม่ถึงช่วง · ใช้วางแผนงานล่วงหน้า · ไม่มีการเทียบ`,
  currentNote: (a: string, b: string) => `ช่วงนี้ยังไม่จบ · ไม่ต่อ / หลุด คิดจากสัญญาที่ครบกำหนดแล้ว ${a} เทียบ ${b} (ความยาวเท่ากัน) · ต่อสำเร็จนับรวมที่เซ็นล่วงหน้าแล้ว`,
  pastNote: (a: string, b: string) => `เทียบ ${a} กับ ${b}`,
  noCompare: "ไม่มีข้อมูลเทียบ", same: "= เท่าเดิม",
  kpi: {
    total: "สัญญาที่ต้องต่อในช่วง", renewed: "ต่อสำเร็จ", lost: "ไม่ต่อ / หลุด · Renewal Churn", pastDue: "เลยกำหนด",
    unit: "สัญญา", svcLine: (o: number, m: number) => `ORM ${o} · Marcom ${m}`, cmpCount: (n: number) => `${n} สัญญาในช่วงเทียบ`,
    renewedSub: (y: number, e: number) => `จาก ${y} สัญญาที่รู้ผล · ล่วงหน้า ${e}`,
    lostSub: (a: number, b: number) => `ไม่ต่อ ${a} · ยกเลิกก่อนกำหนด ${b}`, smallBase: " · ฐาน < 10 ใช้สีตามจำนวน",
    pastDueSub: "ต้องจัดการทันที", pastDueNone: "ไม่มีสัญญาเลยกำหนดในช่วงนี้", pastDueFoot: (o: number, s: number) => `ยังไม่รู้ผลทั้งหมด ${o} · เกิน SLA ${s}`,
    xOfY: (x: number, y: number, p: string) => `${x} จาก ${y} · ${p}`,
  },
  kpiInfo: {
    total: "สัญญาบริการที่ครบกำหนด (หรือยกเลิกก่อนกำหนดมีผล) ในช่วงที่เลือก ทุก stage",
    renewed: "ต่อแล้ว ÷ สัญญาที่รู้ผล · รู้ผล = ต่อแล้ว + ไม่ต่อ / หลุด ที่ถึงวันแล้ว · สัญญาเลยกำหนดที่ยังไม่รู้ผล ไม่อยู่ในฐาน",
    lost: "ไม่ต่อ / หลุด ÷ สัญญาที่รู้ผล · สี: ฐาน ≥ 10 → < 15% ปกติ · 15–19% เฝ้าระวัง · ≥ 20% สูง · ฐาน < 10 → ≤ 3 ปกติ · 4 เฝ้าระวัง · ≥ 5 สูง",
    pastDue: "ยังไม่รู้ผล และเลยวันครบกำหนดสัญญาแล้ว (ยังไม่เซ็น ไม่ active) · แสดงอย่างเดียว ยังไม่เปลี่ยนสถานะสัญญา (รอตัดสิน Q58)",
  },
  owners: { titleAe: "แยกตาม AE", titleTeam: "แยกตามทีมผู้ให้บริการ", byAe: "ตาม AE", byTeam: "ตามทีมผู้ให้บริการ", colAe: "AE", colTeam: "ทีม",
    info: "1 แถว = AE (หรือทีม ORM / คน Marcom) ที่มีสัญญาของบริการนั้นในช่วง · ต่อแล้ว และ ไม่ต่อ / หลุด แสดง จาก {y} · % ของสัญญาที่รู้ผลของคนนั้น · คลิกชื่อหรือตัวเลขเพื่อไปเน้นการ์ดใน สถานะในช่วงนี้ · ตัวเลขด้านบนไม่เปลี่ยน",
    of: (y: number, p: string) => `จาก ${y} · ${p}`,
    legend: ["· = ไม่มี", "มีสัญญาเลยกำหนด", "เกิน SLA / รอบันทึกเหตุผล", "คลิกชื่อหรือตัวเลข = ไปเน้นการ์ดในสถานะในช่วงนี้"] as const,
    dotTip: (s: string, n: number, p: number, o: number, r: number) => `${s} ${n} สัญญา · เลยกำหนด ${p} · เกิน SLA ${o} · รอบันทึกเหตุผล ${r} · คลิกเพื่อดูการ์ด`,
  },
  status: { title: "สถานะในช่วงนี้",
    info: "ไทล์ด้านบน = เรื่องที่ต้องดูก่อน (เลยกำหนด และ รอบันทึกเหตุผล นับทุกช่วงเวลา) · เลือก ดูราย AE หรือค้นหา เพื่อเน้นการ์ด ที่เหลือเป็นสีเทา ไม่ซ่อน · stage ซ่อนไว้ก่อน กดสวิตช์เพื่อแสดง",
    tiles: {
      PAST_DUE: { t: "เลยกำหนด", d: "ยังไม่เซ็น · ไม่ active · กระทบวางบิล AC · นับทุกช่วงเวลา" },
      DUE_SOON: { t: "ใกล้ครบกำหนดสัญญา ≤ 60 วัน", d: "ยังไม่รู้ผล · เหลือ 0–60 วัน · ช่วงที่เลือก" },
      OVER_SLA: { t: "เกิน SLA", d: "อยู่ stage นาน / ไม่มี activity / รอ PM อนุมัติเกิน 2 วัน · ช่วงที่เลือก" },
      NO_REASON: { t: "รอบันทึกเหตุผล", d: "ไม่ต่อ / หลุด ที่ยังไม่มีเหตุผล · นับทุกช่วงเวลา" },
    },
    listHead: (t: string, n: number) => `${t} · ${n} สัญญา`, hide: "ซ่อนรายการ",
    cols: { contract: "สัญญา", service: "บริการ", ae: "AE", stage: "Stage", topic: "เรื่อง" },
    outside: (d: string) => `นอกช่วงที่เลือก · ${d}`, view: "ดูการ์ด", record: "บันทึกเหตุผล",
    overdue: (n: number) => `เลยกำหนด ${n} วัน`, left: (n: number) => `เหลือ ${n} วัน`, inStage: (n: number) => `อยู่ stage นี้ ${n} วันแล้ว`,
    actAgo: (n: number) => `activity ล่าสุด ${n} วันก่อน`, pending: (n: number) => `รอ PM อนุมัติ ${n} วัน`, noReason: (o: string, n: number) => `${o} · ยังไม่มีเหตุผล ${n} วัน`,
    allAe: "ทุก AE", allTeam: "ทุกทีม", seeAe: "ดูราย AE", seeTeam: "ดูราย ทีม", search: "ค้นหาชื่อโรงแรม หรือเลขสัญญา",
    hits: (n: number) => `เด่น ${n} สัญญา · ที่เหลือเป็นสีเทา ·`, noHits: "ไม่พบสัญญาที่ตรงในช่วงนี้ ·", clear: "ล้าง",
    showStages: "แสดง stage", hideStages: "ซ่อน stage", colHide: "▴ ซ่อน", emptyStage: "ไม่มีสัญญาในขั้นนี้", match: (n: number) => `ตรง ${n}`,
    zone: (z: string, n: number) => `${z} ${n} สัญญา`,
  },
  card: {
    due: "ครบกำหนดสัญญา", inStage: "อยู่ stage นี้", lastAct: "activity ล่าสุด", days: (n: number) => `${n} วันแล้ว`, scanOn: (d: string) => `ระบบจะสร้างงาน ${d}`,
    ago: (n: number) => (n <= 0 ? "วันนี้" : `${n} วันก่อน`), noAct: "ยังไม่มีความเคลื่อนไหว", sentNotSigned: (d: string) => `ส่ง ${d} · ยังไม่เซ็น`,
    left: (n: number) => `เหลือ ${n} วัน`, overdue: (n: number) => `เลยกำหนด ${n} วัน`,
    banner: (n: number) => `เลยกำหนด ${n} วัน · ขาดอายุ ไม่นับเป็นใช้งาน · AC หยุดวางบิล · ยังไม่นับ churn จนกว่าจะบันทึกผล`, // v1.4.1 RN49 (Q58)
    earlyTag: "สร้างคำขอล่วงหน้า · ระบบไม่สร้างงานซ้ำ", btnEarly: "สร้างคำขอล่วงหน้า ↗", btnStart: "สร้างคำขอต่อสัญญา ↗",
    signedOn: (d: string) => `เซ็นต่อ ${d}`, newStart: (d: string, up: boolean) => `สัญญาใหม่ เริ่ม ${d}${up ? " · Upcoming" : ""}`, earlySigned: "ต่อสำเร็จล่วงหน้า · ไม่มีแจ้งเตือน",
    result: "ผล", edit: (n: number) => `แก้ไข · เหลือ ${n} วัน`, locked: (d: string, by: string) => `บันทึก ${d} โดย ${by} · ล็อกแล้ว`,
    waiting: (n: number) => `รอบันทึกเหตุผล · ${n} วัน`, legacy: "หมายเหตุเดิม", team: (t: string) => `ทีม ${t}`,
    sub: { DRAFT: "ร่าง", RETURNED: "ถูกส่งกลับ", READY: "พร้อมส่ง", pending: (n: number) => `รอ PM อนุมัติ · ${n} วัน` }, over2: " (เกิน 2 วัน)",
  },
  reasons: { title: "ทำไมลูกค้าไม่ต่อ / หลุด", fromN: (n: number) => ` · จาก ${n} สัญญาที่บันทึกเหตุผลแล้ว`, viewLabels: "ป้ายที่พบบ่อย", viewGroups: "7 กลุ่ม",
    info: "ฐาน = ไม่ต่อ / หลุด ในช่วงที่เลือก ที่ถึงวันแล้ว · N = สัญญาที่บันทึกเหตุผลแล้ว · ป้ายที่พบบ่อย: % = จำนวนสัญญา ÷ N · 7 กลุ่ม: นับเป็นจำนวนป้าย",
    empty: "ไม่มีสัญญาไม่ต่อ / หลุดในช่วงนี้", emptyNoReason: (n: number) => `${n} สัญญาไม่ต่อ / หลุด แต่ยังไม่มีเหตุผล · บันทึกได้จากแถบ “รอบันทึกเหตุผล”`,
    primary: "เหตุผลหลัก · 3 อันดับแรก", secondary: "เหตุผลรอง · 3 อันดับแรก", n: (n: number) => `${n} สัญญา`,
    tie: (k: number, n: number) => `อีก ${k} เหตุผลมีจำนวนเท่ากับอันดับ 3 (${n} สัญญา)`,
    foot: (a: number, b: number, c: number) => `ไม่ต่อ / หลุดในช่วงนี้ ${a} สัญญา · บันทึกเหตุผลแล้ว ${b} · รอบันทึก ${c} ·`, footLink: "อยากรู้ว่ากลุ่มไหนโดนบ่อยสุด ดู 7 กลุ่ม",
    legendP: "เหตุผลหลัก", legendS: "เหตุผลรอง", share: (p: string, n: number) => `${p} · รวม ${n}`,
    tipHead: (g: string, n: number) => `${g} · ทั้งหมด ${n} ป้าย`, tipSplit: (p: number, s: number) => `หลัก ${p} · รอง ${s}`, tipLabel: (n: number, p: number, s: number) => `${n} ป้าย · หลัก ${p} · รอง ${s}`,
    groupsFoot: (t: number, n: number) => `นับเป็นจำนวนป้าย (2 ป้ายในกลุ่มเดียวกัน = 2) · % = ป้ายของกลุ่ม ÷ ป้ายทั้งหมด ${t} ป้ายจาก ${n} สัญญา · ชี้ที่แถบเพื่อดูป้ายในกลุ่ม`,
  },
  picker: { p1: "เหตุผลหลัก 1", p2: "เหตุผลหลัก 2", s: "เหตุผลรอง", none: "ยังไม่เลือก", note: "หมายเหตุ (ไม่บังคับ)", more: (n: number) => `เลือกอีก ${n} ป้าย`, full: "ครบ 3 ป้ายแล้ว", tagP: (n: number) => `หลัก ${n}`, tagS: "รอง" },
  dialog: { record: "บันทึกเหตุผลที่ไม่ต่อสัญญา", edit: "แก้ไขเหตุผลที่ไม่ต่อสัญญา", save: "บันทึก", cancel: "ยกเลิก",
    hintNew: "บันทึกแล้วแก้ได้ภายใน 7 วัน โดย AE เจ้าของสัญญา หรือ PM", hintEdit: (d: string) => `แก้ได้ถึง ${d} · หลังจากนั้นล็อก` },
  markDone: { confirm: "ยืนยันลูกค้าไม่ต่อ", reasons: "เหตุผล (เลือก 3 ป้าย)" },
  denied: "ไม่มีสิทธิ์สร้างการ์ดนี้",
  sim: "จำลองพอร์ต 120 สัญญา (เฉพาะโหมด DEMO)",
  actAs: "สวมบท (โหมดทดสอบ)", actPm: "PM", actOther: "ผู้ใช้อื่น (ดูอย่างเดียว)",
  tour: [
    { target: "rn2-period", title: "เลือกช่วงเวลา", text: "เลือก เดือน · ไตรมาส · ปี · Custom แล้วกด ‹ › เพื่อเลื่อนช่วง · ช่วงที่ยังไม่จบเทียบกับช่วงก่อนหน้าในความยาวเท่ากัน · ช่วงอนาคตใช้วางแผน ไม่มีการเทียบ" },
    { target: "rn2-kpi", title: "ตัวเลขหลัก", text: "สัญญาที่ต้องต่อ · ต่อสำเร็จ · ไม่ต่อ / หลุด · เลยกำหนด · อัตราคิดจากสัญญาที่รู้ผลแล้วเท่านั้น" },
    { target: "rn2-owners", title: "แยกตาม AE", text: "ORM ซ้าย · Marcom ขวา · รู้ผลแล้ว / ยังไม่รู้ผล · สลับดูตามทีมผู้ให้บริการได้" },
    { target: "rn2-owners-table", title: "คลิกชื่อหรือตัวเลข", text: "คลิกชื่อ AE → ไปเลือก “ดูราย AE” ในสถานะในช่วงนี้ และเน้นการ์ดของคนนั้น · คลิกตัวเลข → เปิด stage นั้นด้วย · ตัวเลขด้านบนไม่เปลี่ยน" },
    { target: "rn2-urgent", title: "เรื่องที่ต้องดู", text: "เลยกำหนด · ใกล้ครบกำหนด · เกิน SLA · รอบันทึกเหตุผล · คลิกไทล์เพื่อเปิดรายการ · ดูการ์ด เพื่อไปที่สัญญานั้น" },
    { target: "rn2-highlight", title: "ดูราย AE / ค้นหา", text: "เลือก AE หรือพิมพ์ชื่อโรงแรม / เลขสัญญา · การ์ดที่ตรงจะเด่นและขึ้นก่อน ที่เหลือเป็นสีเทา ไม่ซ่อน · กดชิป ข้อเสนอ (ขึ้น · คง · ลดค่าบริการ) เพื่อเน้นการ์ดตามคำแนะนำ เลือกได้หลายชิป ใช้ร่วมกับ AE / ค้นหา" },
    { target: "rn2-switch", title: "แสดง / ซ่อน stage", text: "stage ซ่อนไว้ก่อน · เปิดสวิตช์เพื่อแสดงทุก stage · ▴ ซ่อน ที่หัวคอลัมน์เพื่อปิดทีละ stage" },
    { target: "rn2-reasons", title: "ทำไมลูกค้าไม่ต่อ / หลุด", text: "ป้ายที่พบบ่อย = 3 อันดับแรกของเหตุผลหลัก / รอง · 7 กลุ่ม = กลุ่มไหนโดนบ่อยสุด (นับเป็นป้าย)" },
  ],
} as const;

/* Tab R5 (O-18) — Renewal Offer on card ③ การต่อสัญญา. */
export const RN5 = {
  help: "การ์ดสัญญาที่ยังไม่รู้ผลมี “ข้อมูลประกอบการต่อสัญญา” (สุขภาพ · ป้าย · Ticket · ค่าบริการ · คำแนะนำ) กดเปิดได้ · การ์ดที่รู้ผลแล้วบอกผลข้อเสนอ · ตัวเลขสรุปข้อเสนออยู่ใน The Office Dashboard",
  chipLabel: "ข้อเสนอ",
  chipInfo: "คำแนะนำจากสูตรตายตัว ไม่ใช่ AI · คำนวณรายวัน และใช้ค่าที่บันทึกไว้ตอน AE กดต่อสัญญา",
  openAll: "▾ เปิดข้อมูลประกอบการต่อสัญญาทุกการ์ด", closeAll: "▴ ซ่อนข้อมูลประกอบการต่อสัญญาทุกการ์ด",
  block: {
    title: "ข้อมูลประกอบการต่อสัญญา", health: "สุขภาพ", labels: "ป้าย", tickets: "Ticket คงค้าง", pkg: "Package", current: "ปัจจุบัน", reco: "คำแนะนำ",
    expected: "คาดหลังต่อ", aeOffer: "AE เสนอ", down: "↓ เปลี่ยนระดับ", up: "↑ เปลี่ยนระดับ", notFound: "ไม่พบ", avg: (x: string) => `เฉลี่ย ${x}`,
    none: "ต่อตามเงื่อนไขเดิม · ข้อมูลไม่พอคำนวณ", overdue: "ค้างชำระ", switchTag: "เปลี่ยน Package",
  },
  result: { result: "ผลข้อเสนอ", sent: "ข้อเสนอที่ส่ง", reco: "คำแนะนำ", avg: "ค่าเฉลี่ย", keepTerms: "ต่อตามเงื่อนไขเดิม" },
} as const;

/* R2.1 UAT fix (UF2 / UF3 / UF1) — renewal labels. */
export const RENEWAL_OWNER_ONLY_HINT = (ae: string) => `เฉพาะ AE เจ้าของสัญญา · ${ae}`;
export const RENEWAL_OWNER_ONLY_TOOLTIP = "ปุ่มนี้ใช้ได้เฉพาะ AE เจ้าของสัญญา (การต่อสัญญาเป็นงานของเจ้าของสัญญาเท่านั้น)";
export const RENEWAL_TEST_SWITCH = (ae: string) => `สลับเป็น ${ae} เพื่อทดสอบ`;
export const RENEWAL_TEST_BANNER = (role: string, member: string) => `ทดสอบในบทบาท ${role} · ${member}`;
export const RENEWAL_SECTION_TITLE = (n: number) => `ต้องต่อสัญญา (≤ ${n} วัน)`;
export const RENEWAL_SOURCE_NOT_FOUND = (contractId: string) => `ไม่พบสัญญาต้นทาง ${contractId} ใน สัญญา & บริการ · แจ้ง PM ตรวจสัญญา`;
/** v1.3 §3.6 (wired R2.1 §1.5): signing is all-or-nothing — shown on the live-link page when the new contract cannot be saved. */
export const RENEWAL_NEW_CONTRACT_FAILED = (why: string) => `ลงนามไม่สำเร็จ · บันทึกสัญญาใหม่ไม่ได้ (${why}) · ลองอีกครั้ง`;
export const RENEWAL_COPY_CONTRACT_ID = "คัดลอกเลขสัญญา";

/* ===================== Tab R3 · card ④ อายุสัญญา (Contract Lifetime) — section `contractLifetime` (display text only) ===================== */
TICKET_TYPE_TH["WELCOME_BACK"] = "Welcome Back";
export const CL = {
  title: "อายุสัญญา (Contract Lifetime)",
  asOf: (d: string) => `ข้อมูล ณ ${d} · อัปเดตรายวัน`,
  help: "? วิธีใช้",
  info: "1 จุด = 1 สัญญาบริการ (1 สัญญามี 2 บริการ = 2 จุด) · อายุนับจากวัน Go Live ครั้งแรก ต่อเนื่องข้ามการต่อสัญญา (ต่อสัญญาไม่เริ่มนับใหม่) · สัญญาที่ยังอยู่ช่วง Setup (ยังไม่ Go Live) ไม่นับ · ค่าเดียวกับอายุในการ์ด ⑦ สุขภาพสัญญา · ที่มา: วัน Go Live จากการ์ด On-board (Servicing), สายการต่อสัญญาจากคำขอต่อสัญญา, ผลไม่ต่อ / ยกเลิกก่อนกำหนดจากการ์ดต่อสัญญา, เหตุผลจากบันทึกเหตุผล",
  medianLabel: (svc: string) => `Median อายุสัญญา · ${svc}`,
  medianInfo: (svc: string) => `Median = ครึ่งหนึ่งของสัญญา ${svc} ที่ใช้งานอยู่ อายุน้อยกว่าค่านี้ · นับจาก Go Live ต่อเนื่องข้ามการต่อสัญญา · ภาพ ณ วันนี้ ไม่มีการเทียบ · โซนที่มีสัญญามากที่สุด เปลี่ยนตามมุมมองโซน`,
  days: (n: number) => `${n.toLocaleString("en-US")} วัน`,
  medianSub: (n: number, zone: string, unit: boolean, count: number, phase: string | null) => `ใช้งาน ${n} สัญญา · สัญญาส่วนใหญ่อยู่ในโซน ${zone}${unit ? " วัน" : ""}${phase ? ` (${phase})` : ""} ${count} สัญญา`,
  noActive: "ยังไม่มีสัญญาที่ใช้งาน",
  zoneView: "มุมมองโซน", viewHundred: "ทุก 100 วัน", viewLifecycle: "ช่วงชีวิตสัญญา",
  show: "แสดง", showActive: "เฉพาะที่ใช้งาน", showEnded: "รวมที่จบแล้ว",
  period: "ช่วง Go Live", periodAll: "ทั้งหมด", periodMonth: "เดือน", periodQuarter: "ไตรมาส",
  prev: "ช่วงก่อนหน้า", next: "ช่วงถัดไป",
  dayWord: "Day",
  rowCount: (n: number) => `${n} สัญญา`,
  medianTag: (t: string) => `Median ${t}`,
  legend: { orm: "ORM ใช้งาน", marcom: "Marcom ใช้งาน", ended: "จบแล้ว (ไม่ต่อ / ยกเลิกก่อนกำหนด) ณ อายุตอนจบ", median: "Median", darker: "ยิ่งเข้ม ยิ่งอายุมาก", outOfPeriod: "นอกช่วง Go Live ที่เลือก" },
  lifecycleNote: "มุมมองช่วงชีวิตสัญญา: ความกว้างโซนปรับตามจำนวนสัญญาในโซน (โซนน้อยสุด 7%) ระยะบนแกนแต่ละโซนจึงไม่เท่ากัน",
  chartLabel: "กราฟอายุสัญญา · ใช้ลูกศรซ้าย / ขวาเลื่อนเส้นอ่านค่า (Shift = ก้าวใหญ่) · Esc ปิด",
  hoverZone: (label: string, unit: boolean, phase: string | null) => `โซน ${label}${unit ? " วัน" : ""}${phase ? ` · ${phase}` : ""}`,
  hoverSvc: (svc: string, n: number) => `${svc} ${n} สัญญา`,
  hoverEnded: (n: number) => ` · จบแล้วในโซนนี้ ${n}`,
  dot: {
    ae: (n: string) => `AE ${n}`,
    age: (n: number, t: string) => `อายุ ${n.toLocaleString("en-US")} วัน (${t})`,
    goLive: (d: string) => `Go Live ${d}`,
    zone: (label: string, unit: boolean, phase: string | null) => `โซน ${label}${unit ? " วัน" : ""}${phase ? ` · ${phase}` : ""}`,
    renewals: (k: number) => `ต่อสัญญามาแล้ว ${k} ครั้ง`,
    endedAt: (outcome: string, n: number, t: string) => `${outcome} · หลุดตอนอายุ ${n.toLocaleString("en-US")} วัน (${t})`,
    endDate: (d: string, zone: string) => `จบ ${d} · โซน ${zone}`,
    primary: "เหตุผลหลัก", secondary: "เหตุผลรอง", noReason: "ยังไม่บันทึกเหตุผล",
  },
  outcome: { NOT_RENEWED: "ไม่ต่อ", LOST: "ยกเลิกก่อนกำหนด" } as Record<string, string>,
  period_: {
    head: (l: string) => `Go Live ${l}`,
    total: (n: number, a: number, b: number) => `ทั้งหมด ${n} สัญญา (ORM ${a} · Marcom ${b})`,
    active: (n: number, pct: number | null, min: number | null, max: number | null, zone: string | null) => `ยังใช้งาน ${n} (${pct ?? 0}%)${min != null && max != null ? ` · อายุตอนนี้ ${min}–${max} วัน` : ""}${zone ? ` · โซน ${zone}` : ""}`,
    ended: (nr: number[], lost: number[]) => `ไม่ต่อ ${nr.length}${nr.length ? ` (อายุตอนจบ ${nr.join(", ")} วัน)` : ""} · ยกเลิกก่อนกำหนด ${lost.length}${lost.length ? ` (อายุตอนจบ ${lost.join(", ")} วัน)` : ""}`,
    clear: "ล้าง ✕",
    empty: "ไม่มีสัญญาที่ Go Live ในช่วงนี้",
  },
  dist: {
    title: "การกระจายตัวตามโซน",
    info: "% = สัดส่วนสัญญาของบริการนั้นที่อยู่ในโซน · ฐานตามสวิตช์ “แสดง”: เฉพาะที่ใช้งาน → ใช้งานในโซน ÷ ใช้งานทั้งหมด · รวมที่จบแล้ว → (ใช้งาน + จบแล้วตามอายุตอนจบ) ในโซน ÷ (ใช้งาน + จบแล้ว) · ผ่านไปโซนถัดไป = a ÷ b โดย a = สัญญาที่อายุ (หรืออายุตอนจบ) ถึงปลายโซน, b = a + สัญญาที่จบในโซนนี้ · ไม่นับสัญญาที่ยังใช้งานอยู่ในโซน · ใช้ประวัติทั้งหมด ไม่ขึ้นกับสวิตช์ · เหตุผล = ป้ายเหตุผลหลัก 2 ป้ายของสัญญาที่จบในโซน (ไม่นับเหตุผลรอง)",
    baseActive: "ฐาน % ตอนนี้: เฉพาะสัญญาที่ใช้งาน",
    baseEnded: "ฐาน % ตอนนี้: สัญญาที่ใช้งาน + สัญญาที่จบแล้ว (ตามอายุตอนจบ)",
    baseHint: " · เปลี่ยนที่สวิตช์ “แสดง” ด้านบน",
    threshold: (n: number) => ` · เหตุผลแสดงเมื่อจบแล้วอย่างน้อย ${n} สัญญาในโซน`,
    total: "รวม",
    active: (n: number) => `ใช้งาน ${n} สัญญา`,
    ended: (n: number) => `จบแล้ว ${n} สัญญา`,
    pass: (p: number, a: number, b: number) => `ผ่านไปโซนถัดไป ${p}% (${a} จาก ${b})`,
    passNone: "ผ่านไปโซนถัดไป — ยังไม่มีผล",
    last: "โซนสุดท้าย",
    reasons: "เหตุผลที่ออก",
    more: "ดูอันดับ 2–3 ▾", less: "ซ่อนอันดับ 2–3 ▴",
    reason: (label: string, n: number) => `${label} · ${n} สัญญา`,
    unrecorded: (n: number) => `ยังไม่บันทึกเหตุผล ${n} สัญญา`,
    few: (n: number) => `ข้อมูลน้อย (จบแล้ว ${n} สัญญา)`,
  },
  churn: {
    title: "สัญญาที่หลุด",
    status: (filters: string, n: number) => `${filters ? ` · ${filters}` : ""} · ${n} สัญญา`,
    clearAll: "ล้างตัวกรองทั้งหมด ✕",
    note: "คลิกชื่อเพื่อดูประวัติสัญญา · + สร้าง เปิดหน้าเดียวกันที่ด้านบน · ตัวเลข = Ticket ที่ยังไม่เสร็จ · เรียงจากจบล่าสุดก่อน · เรียงได้ทีละคอลัมน์",
    cols: { contract: "สัญญา", service: "บริการ", outcome: "ผล", age: "หลุดตอนอายุ", since: "จบไปแล้ว", reasons: "เหตุผลหลัก", ticket: "Ticket" },
    ticketInfo: "ตัวเลข = Ticket ที่ยังไม่เสร็จของสัญญานี้ (ทุกประเภท) · + สร้าง = ส่ง Ticket Welcome Back ถึง BD · 🔒 = มี Welcome Back ที่ยังไม่เสร็จ สร้างใหม่ได้เมื่อ Ticket นั้นเสร็จหรือถูกยกเลิก (1 สัญญา 1 ใบ)",
    goLive: (id: string, q: string) => `${id} · Go Live ${q}`,
    search: "ค้นหา ไทย / EN",
    svcAll: "ทั้งหมด", outcomeAll: "ทั้งหมด",
    sortNone: "เรียง ↕", sortDesc: "มาก → น้อย ↓", sortAsc: "น้อย → มาก ↑",
    reasonsBtn: (k: number) => (k ? `เหตุผล (${k}) ▾` : "เหตุผล ▾"),
    clear: "ล้าง", close: "ปิด",
    create: "+ สร้าง",
    lock: (id: string, st: string) => `🔒 #${id} · ${st}`,
    lockTip: "มี Ticket ที่ยังไม่เสร็จ · สร้างใหม่ได้เมื่อ Ticket นี้เสร็จหรือถูกยกเลิก",
    empty: "ไม่มีสัญญาที่ตรงตัวกรอง",
    count: (n: number) => `${n} สัญญา`,
    perPage: ["แสดง", "สัญญาต่อหน้า"] as const,
    ticketHover: (id: string, to: string, st: string) => `#${id} · ${to} · ${st}`,
    filterHeat: (svc: string, q: string, range: string) => `${svc} · Go Live ${q} · ${range}`,
  },
  heat: {
    title: "รอด–หลุด ตามไตรมาสที่ Go Live",
    info: "แยกตามไตรมาสที่ Go Live ครั้งแรก · รอดถึง m = สัญญาที่อายุถึง m ÷ (สัญญาที่อายุถึง m + สัญญาที่จบก่อนอายุ m) ไม่นับสัญญาที่ยังใช้งานแต่อายุยังไม่ถึง m · หลุดในช่วง [a, m) = สัญญาที่จบตอนอายุ a ถึงก่อน m ÷ สัญญาที่อายุถึง a และ (อายุถึง m หรือจบแล้ว) · ช่องว่าง = ยังไม่ถึง (ไตรมาสยังไม่ครบ m วัน หรือไม่มีฐาน) · ช่องจาง = ฐานน้อยกว่า 3 สัญญา · คลิกชื่อไตรมาสเพื่อเลือกช่วง Go Live · คลิกช่องเพื่อกรองสัญญาที่หลุด",
    hide: "ซ่อน", show: "แสดง",
    sort: "เรียง", newFirst: "ใหม่ → เก่า", oldFirst: "เก่า → ใหม่",
    legendSurvive: "รอด", legendDrop: "หลุด",
    rowHead: "ไตรมาสที่ Go Live",
    surviveGroup: "รอด (สะสม)", dropGroup: "หลุดในช่วง",
    surviveCols: ["90 วัน", "180 วัน", "1 ปี", "2 ปี", "3 ปี"] as const,
    dropCols: ["0–90 วัน", "91–180 วัน", "181 วัน–1 ปี", "1–2 ปี", "2–3 ปี"] as const,
    none: "ไม่มีสัญญา Go Live ในไตรมาสนี้",
    young: "ยังไม่มีสัญญาไหนอายุถึง 90 วัน",
    all: "ดูทุกไตรมาส ▾", latest: (n: number) => `แสดง ${n} ไตรมาสล่าสุด ▴`,
    tipSurvive: (svc: string, q: string, m: string, a: number, b: number, few: boolean) => `${svc} · Go Live ${q} · รอดถึง ${m}: ${a} จาก ${b} สัญญา${few ? " · ฐานน้อย" : ""}`,
    tipDrop: (svc: string, q: string, r: string, a: number, b: number, few: boolean) => `${svc} · Go Live ${q} · หลุดในช่วง ${r}: ${a} จาก ${b} สัญญา${few ? " · ฐานน้อย" : ""}`,
    allQuarters: "ทุกไตรมาส",
  },
  drawer: {
    kicker: "ประวัติสัญญา", close: "ปิด",
    info: "ข้อมูลสัญญา", signed: "เซ็นสัญญา", goLive: "Go Live", renewals: (k: number) => `ต่อสัญญา ${k} ครั้ง`, renewalsLabel: "ต่อสัญญา",
    noticeNR: "แจ้งไม่ต่อ", noticeLost: "แจ้งยกเลิก", ae: "AE", ormTeam: "ทีม ORM", marcom: "Marcom",
    pkg: "แพ็กเกจและอัตราค่าบริการรอบสุดท้าย", pkgOrm: "แพ็กเกจรอบสุดท้าย", rateOrm: "อัตราค่าบริการรอบสุดท้าย",
    pkgMain: "แพ็กเกจหลัก", perMonth: (n: number) => `${n.toLocaleString("en-US")} บาท/เดือน`, upsell: "Upsell", none: "ไม่มี", noHistory: "ยังไม่มีประวัติราคา",
    timeline: "Timeline", shareOff: "ไม่แชร์", shareOn: "แชร์ไปกับ Ticket", showT: "แสดง", hideT: "ซ่อน",
    timelineOffNote: "Timeline ซ่อนอยู่และไม่ถูกแชร์ · เปิดสวิตช์เพื่อแสดงและแชร์ไปกับ Ticket",
    endedFor: (t: string) => `จบไปแล้ว ${t}`,
    endLine: (d: string, n: number, t: string) => `สิ้นสุด ${d} · หลุดตอนอายุ ${n.toLocaleString("en-US")} วัน (${t})`,
    why: "ทำไมถึงออก", aeNote: (name: string, note: string) => `หมายเหตุจาก AE (${name}): ${note}`,
    msg: "ข้อความถึง BD (ไม่บังคับ)", msgHint: "อะไรเปลี่ยนไปแล้ว ทำไมตอนนี้ควรกลับไปคุย หรือข้อมูลอื่นที่อยากให้ BD รู้",
    attach: "+ แนบไฟล์", attachOff: "ยังไม่ได้เชื่อม Google Drive",
    attachInfo: "ไฟล์แนบอัปโหลดไปโฟลเดอร์ทั่วไปของสัญญาใน Google Drive · Ticket เก็บเฉพาะลิงก์ · ยังไม่ได้เชื่อม Google Drive จึงแนบไม่ได้ (ส่ง Ticket ได้ตามปกติ)",
    tickets: "Ticket ของสัญญานี้", noTickets: "ยังไม่มี Ticket",
    ticketLine: (date: string, tl: boolean, files: number, assigned: string | null = null) => `Welcome Back → BDM · ${date}${assigned ? ` · มอบหมาย ${assigned}` : ""}${tl ? " · แนบ Timeline" : ""}${files ? ` · ไฟล์ ${files}` : ""}`,
    to: "ส่งถึง BD · BDM", newBadge: "New",
    summary: "BD จะเห็นใน Ticket:",
    sumItems: { info: "ข้อมูลสัญญา", pkg: "แพ็กเกจและอัตราค่าบริการรอบสุดท้าย", timeline: "Timeline", exit: "สถานะการออก", why: "ทำไมถึงออก", msg: "ข้อความถึง BD", files: (n: number) => `ไฟล์แนบ ${n} ไฟล์`, noTimeline: "(ไม่รวม Timeline)" },
    send: "ส่ง Ticket", sending: "กำลังส่ง…",
    sent: (id: string) => `ส่งสำเร็จ 1 ticket · #${id}`,
    failed: (e: string) => `ส่งไม่สำเร็จ · ${e} · ลองอีกครั้งด้วยเลขเดิม`,
    locked: (id: string, st: string) => `🔒 ส่ง Ticket ใหม่ไม่ได้ตอนนี้ — สัญญานี้มี Ticket Welcome Back #${id} สถานะ “${st}” อยู่ · ส่งใหม่ได้เมื่อ Ticket นี้เสร็จหรือถูกยกเลิก เพื่อไม่ให้ BD หลายคนติดต่อลูกค้ารายเดียวกันซ้ำ`,
    actAs: "สร้างในบทบาท (ทดสอบ)", roles: { PM: "PM", PS: "PS", AE: "AE" } as Record<string, string>,
    open360: "เปิด Account 360 ↗",
  },
  setupAge: "Setup · ยังไม่ Go Live",
  tour: [
    { title: "ตัวเลขหลัก", text: "Median อายุของสัญญาที่ใช้งานอยู่ แยก ORM / Marcom · บรรทัดล่างบอกโซนที่มีสัญญามากที่สุด" },
    { title: "มุมมองโซน", text: "ทุก 100 วัน = แกนเท่ากันทุกโซน · ช่วงชีวิตสัญญา = 6 ช่วง กว้างตามจำนวนสัญญาในโซน (น้อยสุด 7%)" },
    { title: "แสดงที่จบแล้ว", text: "รวมที่จบแล้ว = เพิ่มจุดจาง ณ อายุตอนจบ · ฐาน % ในตารางเปลี่ยนตามสวิตช์นี้" },
    { title: "ช่วง Go Live", text: "เลือกเดือนหรือไตรมาสที่ Go Live เพื่อเน้นกลุ่มนั้นบนกราฟ · ตารางสัญญาที่หลุดกรองตามไปด้วย" },
    { title: "ชี้บนกราฟ", text: "ชี้ที่ว่าง = จำนวนสัญญาในโซน · ชี้ที่จุด = รายละเอียดสัญญานั้นเท่านั้น · ใช้ลูกศรซ้าย / ขวาได้" },
    { title: "การกระจายตัวตามโซน", text: "% ต่อโซน · ผ่านไปโซนถัดไป = ส่วนที่อยู่ถึงปลายโซน · แถวเหตุผลแสดงอันดับ 1 กดดูอันดับ 2–3 ได้" },
    { title: "สัญญาที่หลุด", text: "ค้นหา กรองบริการ ผล เหตุผล และเรียงได้ทีละคอลัมน์ · + สร้าง ส่ง Welcome Back ถึง BD · 🔒 = มี Ticket ที่ยังไม่เสร็จ" },
    { title: "รอด–หลุด", text: "เปิดสวิตช์เพื่อดูตาราง · คลิกชื่อไตรมาสเพื่อเลือกช่วง Go Live · คลิกช่องเพื่อกรองสัญญาที่หลุด" },
  ],
} as const;

/* ===================== Tab R4 · สัญญา & ราคา · ระยะเวลา Setup (setupDuration) — display text only ===================== */
TICKET_TYPE_TH["HANDOVER_FIX"] = "ขอแก้งานส่งมอบ";
export const TAB_LABEL_R4 = { ps: "สัญญา & ราคา", servicing: "On-board / Off-board" } as const;
export const SD = {
  title: "ระยะเวลา Setup (On-board → Go Live)",
  asOf: (d: string) => `ข้อมูล ณ ${d} · อัปเดตรายวัน`,
  sub: "สัญญาที่กำลัง Setup อยู่ช่วงไหน ใช้เวลามากี่วัน และช่วงไหนใกล้หรือเลยกำหนดแล้ว",
  info: "นับวันปฏิทินจากวันที่สร้างการ์ด On-board (HR27) · สัญญาที่กำลัง Setup นับเพิ่มทุกวัน · 1 จุด = 1 สัญญาบริการ · สถานะใช้กำหนดเสร็จที่มีผล ณ วันที่สร้างการ์ดนั้น · ที่มา: Servicing / On-boarding Process · PS App",
  bigUnit: "สัญญา",
  inSetup: (a: number, b: number) => `กำลัง Setup · ORM ${a} · Marcom ${b}`,
  late: (n: number) => `เลยกำหนด ${n}`, near: (n: number) => `ใกล้ถึงกำหนด ${n}`,
  pmBtn: "⚙ ตั้งกำหนดเสร็จ", help: "? วิธีใช้",
  actAs: "สวมบท (ทดสอบ)", actPm: "PM", actOther: "ทีมอื่น",
  tabs: { all: "ภาพรวม", orm: "PS ทีม + ORM", mc: "PS ทีม + Marcom" } as Record<string, string>,
  period: "ช่วง Go Live", periodKinds: { all: "ทั้งหมด", month: "เดือน", quarter: "ไตรมาส" } as Record<string, string>,
  quick: "ตัวกรองด่วน", quickLate: (n: number) => `เลยกำหนด ${n}`, quickNear: (n: number) => `ใกล้ถึงกำหนด ${n}`, quickOk: (n: number) => `ทันกำหนด ${n}`,
  clear: "ล้างตัวกรอง", counted: (n: number) => `นับ ${n} สัญญาที่กำลัง Setup`,
  bands: {
    p1: { name: "P1 · ช่วง AE", sub: "สร้างการ์ด → Approved" },
    p2: { name: "P2 · ช่วงเตรียมระบบ", sub: "ทำพร้อมกันหลัง Approved" },
    p2mc: { name: "P2 · ช่วงเตรียมระบบ", sub: "MT → สร้างนัด · GMB → Go Live" },
    w: { name: "รอวันประชุม", sub: "ไม่มีกำหนด · เวลาลูกค้า" },
    p3: { name: "P3 · ช่วงก่อน Go Live", sub: "วันประชุม → Go Live" },
    golive: { name: "Go Live", sub: "" },
    golivemc: { name: "Go Live", sub: "GMB ขึ้นจาก P2 โดยตรง" },
  },
  reserved: "สงวนไว้ · ยังไม่มี handover ของ Specialist ฝั่ง Marcom",
  emptyLane: "ไม่มีสัญญาเข้า stage นี้",
  axis: "สัญญานี้ใช้เวลามาแล้ว (วัน) →",
  within: (n: number) => `ภายในวันที่ ${n}`,
  target: (n: number) => `เป้ารวม ${n} วัน`,
  legend: { ok: "ทันกำหนด", near: "ใกล้ถึงกำหนด", late: "เลยกำหนด", none: "ไม่มีกำหนด", goLive: "· แถว Go Live", ring: "· วงแหวนรอบจุด", noRing: "· ไม่มีวง = ทันกำหนด",
    box: "box = ช่วงที่ stage นั้นควรเกิดตาม KPI ที่ PM ตั้ง (เขียว ทัน · เหลือง ใกล้ถึงกำหนด)", path: "เส้นทางตาม KPI", side: "· จุดซ้ายของ box = เร็วกว่าแผน · ขวาของ box = ช้ากว่าแผน" },
  dotAria: (h: string) => `${h} เปิดในแท็บ On-board / Off-board`,
  tip: {
    at: (stage: string) => `อยู่ ${stage}`, used: (n: number) => `ใช้มาแล้ว ${n} วัน`, goLive: (d: string) => `Go Live ${d}`, total: (n: number) => `รวม ${n} วัน`,
    start: (d: string) => `เริ่ม ${d}`, left: (n: number) => `เหลือ ${n} วันถึงเป้ารวม`, over: (n: number) => `เลยเป้ารวม ${n} วัน`,
    range: (a: number, b: number | null) => `วันที่ ${a}–${b == null ? "วันนี้" : b}`,
    footer: "คลิกจุดเพื่อเปิดการ์ดนี้ในแท็บ On-board / Off-board ↗",
    dayHead: (n: number, x: number) => `ใช้เวลามาแล้ว ${n >= 21 ? "21 วันขึ้นไป" : `${n} วัน`} · ${x} สัญญา`,
    more: (n: number) => `และอีก ${n} รายการ`,
    dayFooter: "ชี้ที่จุดเพื่อดูรายละเอียด · คลิกจุดเพื่อเปิดในแท็บ On-board / Off-board",
    dayEmpty: "ไม่มีสัญญาที่ใช้เวลามาแล้วเท่านี้ · เลื่อนไปที่คอลัมน์ที่มีจุด",
  },
  laneTip: { p1: "P1 · AE", p2s: "P2 · Specialist", p2o: "P2 · ทีมบริการ", w: "รอวันประชุม", p3: "P3 · ก่อน Go Live" } as Record<string, string>,
  status: { ok: "ทันกำหนด", near: "ใกล้ถึงกำหนด", late: "เลยกำหนด" } as Record<string, string>,
  stage: {
    title: "ภาพรวมราย stage",
    info: "ตัวเลขตามสัญญาที่กำลัง Setup ณ วันนี้ (และตัวกรองด่วนที่เลือก) · ทันกำหนด + ใกล้ถึงกำหนด + เลยกำหนด = กำลังทำ · ถ้าใกล้ถึงกำหนดสูงต่อเนื่อง ใช้เป็นสัญญาณให้ PM ทบทวนกำหนดเสร็จ · แถว Go Live ตาม ช่วง Go Live ที่เลือก",
    cols: ["Stage", "แถว", "กำหนดของ stage", "กำลังทำ", "ทันกำหนด", "ใกล้ถึงกำหนด", "เลยกำหนด"],
    due: (n: number) => `≤ ${n} วัน`, noDue: "ไม่มีกำหนด", doing: (n: number) => `${n} สัญญา`, split: (a: number, b: number) => `(ORM ${a} · Marcom ${b})`,
    pill: (label: string, a: number, n: number) => `${label} ${a}/${n} สัญญา`,
    goLive: "Go Live", target: (n: number) => `เป้ารวม ${n} วัน`, goLiveN: (n: number) => `Go Live ${n} สัญญา`, frac: (a: number, n: number) => `${a}/${n} สัญญา`,
  },
  cmp: {
    title: "เปรียบเทียบผลงาน",
    info: "แถวในตารางเปลี่ยนตามแท็บที่เลือก · ส่วนใหญ่ = ช่วงที่สัญญาครึ่งกลาง (50%) อยู่ · ทันกำหนด = สัญญาที่ไม่เลยกำหนด (ใช้กำหนดเสร็จที่มีผล ณ วันสร้างการ์ดของแต่ละสัญญา) · เร็วขึ้น / ช้าลง เทียบวันกึ่งกลางของสัญญาทั้ง 2 ช่วง",
    mode: "เทียบแบบ", equal: "จำนวนสัญญาเท่ากัน (แนะนำ)", custom: "Custom ช่วง A vs ช่วง B",
    needPeriod: "เลือก “ช่วง Go Live” เป็นเดือนหรือไตรมาสก่อน ระบบจะหาช่วงในอดีตที่มีจำนวนสัญญาเท่ากันมาเทียบให้",
    pick: "ช่วงที่เทียบ", option: (l: string, n: number, eq: boolean) => `${l} · ${n} สัญญา${eq ? " (เท่ากัน)" : ""}`,
    descEqual: (a: string, n: number, b: string, m: number, back: string, k: number) => `${a} Go Live ${n} สัญญา เทียบกับ ${b} ${m} สัญญา · ช่วงที่จำนวนเท่ากันใน ${back}ก่อนหน้ามี ${k} ช่วง เลือกช่วงล่าสุดให้`,
    descNearest: (a: string, n: number, b: string, m: number) => `${a} Go Live ${n} สัญญา เทียบกับ ${b} ${m} สัญญา · ไม่มีช่วงที่จำนวนเท่ากัน ใช้ช่วงที่ใกล้เคียงที่สุด`,
    noneA: (a: string) => `${a} ยังไม่มีสัญญา Go Live`, back24: "24 เดือน", back8: "8 ไตรมาส",
    rangeA: "ช่วง A", rangeB: "ช่วง B", warn: "จำนวนสัญญาต่างกันมาก ตีความผลด้วยความระวัง",
    cols: (a: string, b: string) => ["ช่วงงาน", `${a} · ส่วนใหญ่`, "ทันกำหนด", `${b} · ส่วนใหญ่`, "ทันกำหนด", "เปลี่ยนแปลง"],
    onTime: (x: number, p: number) => `${x} สัญญา (${p}%)`,
    quality: "คุณภาพ",
    s1: "Survey #1 · ทีมบริการให้คะแนน Specialist", s2: "Survey #2 · ลูกค้าประเมินหลัง Go Live", ftr: "ส่งมอบครบในครั้งแรก",
    score: (x: number, scale: number) => `${x.toFixed(1)} / ${scale}`,
    notYet: "ยังไม่มี", waiting: "รอข้อมูล",
    ftrInfo: "เปิดใช้เมื่อทีมบริการเปิด ticket ขอแก้งานส่งมอบได้จาก checklist",
    foot: "ตัวเลขในวงเล็บ = จำนวนสัญญา · Survey #1 และส่งมอบครบในครั้งแรก ยังไม่มีฝั่ง Marcom (ยังไม่มี handover ของ Specialist ฝั่ง Marcom)",
  },
  pm: {
    note: (a: string, b: string, today: string) => `SLA ปัจจุบันคำนวณจากสัญญาที่ Go Live ใน 6 เดือนล่าสุด (${a} – ${b}) · ค่าใหม่มีผลกับการ์ดที่สร้างตั้งแต่ ${today} เท่านั้น สัญญาที่ Go Live แล้วและการ์ดที่สร้างก่อนวันนี้ใช้ค่าเดิม`,
    cols: ["ช่วงงาน", "ค่าปัจจุบัน", "ทันกำหนดถึง (วัน)", "กำหนดเสร็จ · เลยเมื่อเกิน (วัน)", "SLA ปัจจุบัน · ส่วนใหญ่", "80% เสร็จภายใน", "ทันตามค่าปัจจุบัน", "ทันตามค่าใหม่"],
    current: (ok: number, due: number) => `ทัน ≤ ${ok} · เลย > ${due}`,
    most: (r: string, n: number) => `${r} (${n} สัญญา)`, within: (n: number | null) => (n == null ? "—" : `${n} วัน`),
    save: (d: string) => `บันทึก · มีผลกับการ์ดที่สร้างตั้งแต่ ${d}`, cancel: "ยกเลิก", saved: "บันทึกกำหนดเสร็จแล้ว",
    history: "ประวัติการตั้งค่า", from: (d: string) => `ใช้กับการ์ดที่สร้างตั้งแต่ ${d}`, fromStart: "ตั้งแต่เริ่มระบบ",
  },
  helpSteps: [
    "1 จุด = 1 สัญญา · แกนนอนคือสัญญาใช้เวลามาแล้วกี่วันนับจากสร้างการ์ด On-board · แกนตั้งคือ stage ที่สัญญาอยู่ตอนนี้ จากล่าง (P1) ขึ้นบน (Go Live) · จุดจะขยับขวาทุกวัน และขยับขึ้นเมื่อผ่าน stage",
    "P2 มี 2 งานทำพร้อมกัน (Specialist และทีมบริการ) สัญญาจึงอยู่ได้ทั้ง 2 แถวย่อยจนกว่างานนั้นเสร็จ",
    "box คือช่วงที่ stage นั้นควรเกิดตาม KPI ที่ PM ตั้ง (สีเขียว = ทัน · สีเหลือง = ใกล้ถึงกำหนด) · เส้นประคือเส้นทางตาม KPI · จุดซ้ายของ box = เร็วกว่าแผน · ขวาของ box = ช้ากว่าแผน",
    "แท็บ PS ทีม: สีจุดบอกสถานะ เขียว ทัน · เหลือง ใกล้ถึงกำหนด · แดง เลยกำหนด · แท็บภาพรวม: สีจุดบอกบริการ และวงแหวนเหลือง / แดงบอกใกล้ถึงกำหนด / เลยกำหนด · แถว Go Live ตาม ช่วง Go Live ที่เลือก",
    "เลื่อนเมาส์ไปที่วันใดก็ได้ จะเห็นรายชื่อสัญญาทั้งหมดของวันนั้นแยกตาม stage · ชี้จุดจะเห็นเส้นประลงแกนวัน และเส้นทางที่สัญญานั้นผ่านมา · คลิกจุดเพื่อเปิดการ์ดในแท็บ On-board / Off-board",
  ],
  reset: {
    title: "ระยะเวลา Reset", soon: "Coming soon", sub: "Off-board → คืน Access",
    text: "ใช้หน้าตาเดียวกับการ์ดระยะเวลา Setup (แกนวัน × stage) เมื่อกำหนด protocol การ Off-board และขั้นตอนคืน Access เสร็จแล้ว",
  },
  queue: {
    title: "สัญญาในคิว และเวลาแต่ละเฟส",
    info: "ตัวเลข = จำนวนวันที่ใช้ในเฟสนั้น · กรอบ “กำลังทำ” = เฟสที่ทำอยู่ (นับถึงวันนี้) · สีแดง = เกินกำหนดของเฟส · — = ยังไม่ถึง · P2 ของ Specialist และทีมบริการทำพร้อมกัน",
    tabIn: (n: number) => `ในคิวตอนนี้ ${n}`, tabLive: (n: number) => `Go Live แล้ว (ช่วงที่เลือก) ${n}`,
    svc: { ALL: "ทุกบริการ", ORM: "ORM", Marcom: "Marcom" } as Record<string, string>, search: "ค้นหาโรงแรม",
    chips: { n: (n: number) => `กำลังทำ ${n}`, p1: (n: number) => `อยู่ P1 ${n}`, p2: (n: number) => `อยู่ P2 ${n}`, w: (n: number) => `รอวันประชุม ${n}`, p3: (n: number) => `อยู่ P3 ${n}`,
      laneLate: (n: number) => `เฟสที่ทำอยู่เกินกำหนด ${n}`, totalLate: (n: number) => `เลยเป้ารวมแล้ว ${n}`, live: (n: number) => `Go Live ${n}`, most: (r: string) => `ส่วนใหญ่ ${r}`, over: (n: number) => `เกินเป้ารวม ${n}` },
    cols: { contract: "สัญญา", svc: "บริการ", start: "เริ่ม", startLive: "เริ่ม → Go Live", p1: "P1", p2s: "P2", p2o: "P2", w: "รอวันประชุม", p3: "P3", elapsed: "ผ่านมาแล้ว", total: "รวม", stage: "อยู่เฟส" },
    sub: { p1: (d: number) => `AE · ≤ ${d}`, p2s: (d: number) => `Specialist · ≤ ${d}`, p2o: (t: string) => `ทีมบริการ · ${t}`, w: "ลูกค้า · ไม่มีเป้า", p3: (t: string) => `ทีมบริการ · ${t}`, total: (t: string) => `เป้า ${t}` },
    running: "กำลังทำ", na: "ไม่มี", gmb: " · GMB",
    stage: (s: string, q: string) => `${s} · คิว ${q}`, startQueue: (n: number, q: string) => `คิวตอนเริ่ม ${n} การ์ด · ${q}`,
    foot: "ส่วนใหญ่ (กลาง 50%)", footDone: " · เฉพาะเฟสที่ทำเสร็จแล้ว", unit: "หน่วย: วัน",
    pager: (n: number) => `${n} สัญญา`, empty: "ไม่มีสัญญาตามตัวกรองนี้",
    notFound: "ไม่พบการ์ดนี้", demoOpen: "DEMO · ไม่มีการ์ดจริงให้เปิด", notLocal: "ยังไม่พบการ์ดนี้ในเครื่องนี้ · เปิดที่ On-boarding Process",
  },
  liveNoSurvey: "ยังไม่มีข้อมูล",
} as const;

/* ===================== R3.1 · Welcome Back → BDM → BD (BD Workspace 🎫 lane + PS drawer line) — display text only ===================== */
export const WB = {
  roleBdm: "สวมบท BDM", roleBd: "สวมบท BD", member: (name: string) => `BD: ${name}`, memberAria: "เลือกสมาชิก BD (ทดสอบ)", testData: "ข้อมูลทดสอบ",
  section: "Welcome Back",
  pending: (n: number) => `รอมอบหมาย (${n})`, assigned: (n: number) => `มอบหมายแล้ว (${n})`, mine: (n: number) => `ของฉัน (${n})`, sent: (n: number) => `ที่ฉันส่ง (${n})`, closed: (n: number) => `เสร็จ / ยกเลิกแล้ว (${n})`,
  showClosed: "แสดงที่เสร็จ / ยกเลิกแล้ว",
  emptyBdm: "ไม่มี Welcome Back รอมอบหมาย", emptyBd: "ยังไม่มี Welcome Back ที่มอบหมายให้คุณ", emptySent: "ยังไม่มี Welcome Back ที่ส่ง",
  exitOn: (d: string) => `ออกเมื่อ ${d}`, sentBy: (who: string, d: string) => `ส่งโดย ${who} · ${d}`, sentByRole: (who: string, role: string, d: string) => `ส่งโดย ${who} (${role}) · ${d}`,
  pill: { pending: "รอมอบหมาย", assigned: (n: string) => `มอบหมายแล้ว · ${n}`, working: (n: string | null) => (n ? `กำลังทำ · ${n}` : "กำลังทำ"), done: "เสร็จ", cancelled: "ยกเลิก" },
  ps: { pending: "รอ BDM มอบหมาย (BDM Workspace)", assigned: "มอบหมายแล้ว", working: "กำลังทำ", done: "เสร็จ", cancelled: "ยกเลิก", assignedTo: (n: string) => ` · มอบหมาย ${n}` },
  detail: {
    title: (id: string) => `Welcome Back · #${id}`, close: "ปิด",
    info: "ข้อมูลสัญญา", hotel: "โรงแรม", contract: "เลขสัญญา", service: "บริการ", period: "เริ่ม → สิ้นสุด", ae: "AE เดิม",
    pkg: "แพ็กเกจและอัตราค่าบริการรอบสุดท้าย", pkgName: "แพ็กเกจ", rate: "อัตราค่าบริการ", upsell: "Upsell",
    exit: "สถานะการออก", why: "ทำไมถึงออก", primary: "เหตุผลหลัก", secondary: "เหตุผลรอง", aeNote: (n: string) => `หมายเหตุจาก AE: ${n}`, noReason: "ยังไม่บันทึกเหตุผล",
    msg: "ข้อความถึง BD", timeline: "Timeline", files: "ไฟล์แนบ", history: "ประวัติ Ticket",
    created: (who: string) => `สร้างโดย ${who}`, assignedEv: (by: string, to: string) => `มอบหมาย ${by} → ${to}`, started: (who: string) => `เริ่มทำ · ${who}`, doneEv: (who: string) => `เสร็จ · ${who}`, cancelledEv: (who: string) => `ยกเลิก · ${who}`,
    pick: "เลือก BD", assign: "มอบหมาย", reassign: "เปลี่ยนผู้รับผิดชอบ", self: "ฉันทำเอง", start: "เริ่มทำ", done: "เสร็จ", cancel: "ยกเลิก", readOnly: "ดูอย่างเดียว",
  },
  toast: { assigned: (n: string) => `มอบหมายให้ ${n} แล้ว`, started: "เริ่มทำแล้ว", closed: "ปิด Ticket แล้ว", cancelled: "ยกเลิก Ticket แล้ว" },
  conflict: "ข้อมูลเปลี่ยนแล้ว · โหลดใหม่", notAllowed: "บทบาทนี้ทำรายการนี้ไม่ได้",
  /* R3.2 WB9–WB15 — BD App › Workspace tabs (BD Workspace · BDM Workspace) */
  tabs: { aria: "Workspace", bd: "BD Workspace", bdm: "BDM Workspace" },
  bdmTitle: "BDM Workspace", bdmSub: "Ticket ที่ต้องมอบหมายให้ทีม BD",
  bdmOnly: "BDM Workspace ใช้ได้เฉพาะ BDM", bdmSwitch: "สลับเป็น BDM เพื่อทดสอบ",
  bdmHint: "Welcome Back อยู่ที่แท็บ BDM Workspace →",
  banner: (role: string, member: string | null) => `ทดสอบในบทบาท ${role}${member ? ` · ${member}` : ""}`,
  quickAssign: "มอบหมาย", allMembers: "ทุกคน", memberFilterAria: "กรองตามสมาชิก BD",
  closedBdm: (n: number) => `ปิดแล้ว (${n})`,
  bdMine: (n: number) => `Welcome Back · ของฉัน (${n})`, bdSent: "Welcome Back ที่ฉันส่ง",
  rowSub: (name: string, working: boolean) => `${name} · ${working ? "กำลังทำ" : "มอบหมายแล้ว"}`,
  legacyRow: (id: string) => `#${id} · ข้อมูลสัญญาไม่ครบ (ticket ทดสอบเก่า)`, legacyNote: "ข้อมูลสัญญาไม่ครบ (ticket ทดสอบเก่า)",
  /* R3.3 WB16–WB21 — one DEMO state, fresh reads, testing-mode check panel */
  modeName: (demo: boolean) => (demo ? "DEMO" : "ปกติ"),
  modeMismatch: (ps: string, page: string) => `PS Dashboard อยู่โหมด ${ps} แต่หน้านี้อยู่โหมด ${page} · ticket ที่ส่งจากอีกโหมดจะไม่แสดง`,
  modeFix: "สลับให้ตรงกัน",
  refresh: "รีเฟรช",
  check: {
    toggle: "ตรวจที่มาของ ticket ▾",
    page: (mode: string, date: string) => `โหมดหน้านี้: ${mode} · วันที่ที่ใช้: ${date}`,
    ps: (mode: string) => `โหมด PS Dashboard: ${mode}`,
    inStore: (n: number) => `Welcome Back ในที่เก็บ: ${n}`, pending: (n: number) => `รอมอบหมาย: ${n}`,
    assigned: (n: number) => `มอบหมายแล้ว: ${n}`, closed: (n: number) => `ปิดแล้ว: ${n}`,
    hidden: (n: number) => `ไม่แสดง ${n} ใบ`, hiddenRow: (id: string, reason: string) => `#${id} · เหตุผล: ${reason}`,
    reasonStatus: (s: string) => `สถานะ "${s}" ไม่อยู่ในกลุ่มใด`,
  },
} as const;

/* ===================== Contract Renewal v1.4 · Renewal Offer (RP127–RP153) — display text only ===================== */
export const RO = {
  type: { RAISE: "ขึ้นค่าบริการ", KEEP: "คงค่าบริการ", LOWER: "ลดค่าบริการ" } as Record<string, string>,
  chip: { RAISE: "▲ ขึ้นค่าบริการ", KEEP: "● คงค่าบริการ", LOWER: "▼ ลดค่าบริการ" } as Record<string, string>,
  model: { FLAT: "Flat Rate", FIXED_PLUS_COMMISSION: "Monthly fee + Commission", COMMISSION_GUARANTEE: "Commission + Guarantee fee" } as Record<string, string>,
  none: "ต่อตามเงื่อนไขเดิม · ข้อมูลไม่พอคำนวณ",
  overdue: "ค้างชำระ · ไม่แนะนำปรับค่าบริการ",
  overdueDays: (d: number) => `บิลของสัญญานี้เลยกำหนด ${d} วัน`,
  hint: "ทางเลือก: เสนอบริการที่ค่าบริการต่ำกว่า เช่น ORM Lite (ตัดบางบริการออก)",
  cadence: (m: string) => `ถึงรอบขึ้นราคา · ขึ้นล่าสุด ${m}`,
  noCadence: (m: string) => `ยังไม่ถึงรอบขึ้นราคา · ขึ้นล่าสุด ${m}`,
  below: "ราคาต่ำกว่ามูลค่าเทียบเคียง",
  trend: { stable: "รายได้ทรงตัว", moderate: "รายได้โตปานกลาง", strong: "รายได้โตแรง / ผันผวน", declining: "รายได้ขาลง", pending: "แนวโน้มรายได้ยังไม่พอประเมิน" } as Record<string, string>,
  band: (a: number, b: number) => `ช่วง Monthly fee +${a}–${b}%`,
  factor: { REVENUE_DOWN: "รายได้ขาลง", HEALTH_RED: "สุขภาพสัญญาแดง", PRICE_LABEL: "ป้ายเรื่องราคาและความคุ้มค่า (ระบบตรวจพบ)" } as Record<string, string>,
  notFound: "ไม่พบ",
  count: (n: number, word: string) => `แย่ ${n} จาก 3 ด้าน → ${word}`,
  missing: { model: "รูปแบบการคิดค่าบริการ", recurring: "รอบวางบิล (recurring) ของ AC App", repricing: "ข้อมูลรอบขึ้นราคา / แนวโน้มรายได้ (Repricing)", band: "ช่วงขึ้นราคาตามแนวโน้มรายได้", fee: "ค่าบริการปัจจุบัน", commission: "อัตรา Commission", guarantee: "Guarantee fee" } as Record<string, string>,
  missingLine: (list: string) => `ยังไม่มี: ${list}`,
  ruleInfo: "สูตรตายตัว ไม่ใช่ AI: ค้างชำระ → คงค่าบริการ · มีด้านที่แย่ (รายได้ขาลง · สุขภาพแดง · ป้ายเรื่องราคาที่ระบบตรวจพบ) → ลดค่าบริการ · ถึงรอบหรือราคาต่ำกว่ามูลค่า → ขึ้นค่าบริการ · นอกนั้น → คงค่าบริการ",
  section: {
    title: "ข้อมูลประกอบการต่อสัญญา", hide: "▴ ซ่อน", show: "▾ แสดง",
    info: "สรุปสัญญานี้ ณ วันนี้ · สุขภาพและป้ายมาจากการ์ดสุขภาพสัญญา · Ticket จากแท็บติดตามงานผู้ให้บริการ · คำแนะนำเป็นสูตรตายตัว ไม่ใช่ AI",
    health: "สุขภาพสัญญา", tickets: "Ticket คงค้าง", labels: "ป้ายปัจจุบันของสัญญา", none: "ไม่มี",
    down: (lv: string) => `↓ จาก${lv} ภายใน 30 วัน`, up: (lv: string) => `↑ จาก${lv} ภายใน 30 วัน`, same: "ไม่เปลี่ยนระดับใน 30 วัน", noHistory: "ไม่มีข้อมูลย้อนหลัง 30 วัน",
    ticketLink: "ดูในติดตามงานผู้ให้บริการ ↗",
    tone2: "ลูกค้ามีเรื่องไม่พอใจหลายด้าน · เตรียมคำตอบเรื่องเหล่านี้ก่อนคุยค่าบริการ",
    tone1: "มีเรื่องที่ต้องเคลียร์ 1 เรื่องก่อนคุยค่าบริการ",
    toneOpp: "ลูกค้าพอใจ และมีโอกาสเสนอบริการเพิ่ม", toneOk: "ลูกค้าพอใจ ไม่มีสัญญาณเสีย",
    fee: "ค่าบริการปัจจุบัน",
    feeInfo: "จากรอบวางบิล (recurring) ของ AC App · ค่าเฉลี่ย = ยอดวางบิลรายเดือน 12 เดือนล่าสุด (สัญญาสั้นกว่าใช้ทั้งอายุสัญญา)",
    fixed: (x: string) => `Monthly fee คงที่ ${x} / เดือน`, rate: (y: string) => `อัตรา Commission ${y}%`,
    avgComm: (z: string) => `Commission เฉลี่ย ${z} / เดือน`, guarantee: (g: string) => `Guarantee fee ${g} / เดือน`,
    actualComm: (z: string) => `Commission ตามจริงเฉลี่ย ${z} / เดือน`, gMonths: (m: number, n: number) => `เก็บ Guarantee fee ${m} จาก ${n} เดือน (ตลอดอายุสัญญา)`,
    avg: "ค่าบริการเฉลี่ย", perMonth: "/ เดือน", lastChange: (m: string) => `ปรับค่าบริการล่าสุด ${m}`,
    reco: "คำแนะนำของระบบ", recoSub: "· ค่าตาม Package ไม่ใช่ยอดวางบิล", startValue: (x: string) => `ค่าตั้งต้น ${x}`,
    unchanged: "คงเดิม", expected: "ค่าบริการเฉลี่ยที่คาดหลังต่อสัญญา", reasons: "เหตุผล",
    alt: "▾ เปลี่ยน Package (ค่าเฉลี่ยใกล้เคียงคำแนะนำ)", altHide: "▴ เปลี่ยน Package (ค่าเฉลี่ยใกล้เคียงคำแนะนำ)",
    altCols: ["Package", "ค่าบริการ", "ค่าบริการเฉลี่ยที่คาด", "เทียบปัจจุบัน"],
    altNote: (x: string) => `คิดจากรายได้เฉลี่ยที่ใช้คิด Commission ${x} / เดือน (Production Report) · AE ปรับตัวเลขเองได้ในหน้าต่อสัญญา · เปลี่ยน Package ต้องให้ PM อนุมัติ`,
    altNone: "ยังไม่มีรายได้เฉลี่ยที่ใช้คิด Commission (Production Report) · คำนวณ Package อื่นไม่ได้",
    marcomOne: "Marcom มี Package เดียว (Flat Rate)",
    soon: "Coming soon", valueAdded: "Value Added · ข้อเสนอเสริมคู่กับราคา",
  },
  match: { MATCH: "ตรงคำแนะนำ", ABOVE: "สูงกว่าที่แนะนำ", BELOW: "ต่ำกว่าที่แนะนำ" } as Record<string, string>,
  aeOffer: (pkg: string) => `AE เสนอ ${pkg}`, switchTag: "เปลี่ยน Package",
  offerAvg: (x: string, d: string) => `ค่าบริการเฉลี่ยที่คาด ${x} · ${d} จากปัจจุบัน`,
  needPm: "· เปลี่ยนค่าบริการ ต้องให้ PM อนุมัติ",
  startLine: (pkg: string) => `ค่าตั้งต้นในหน้าต่อสัญญา = ค่าที่แนะนำ (${pkg})`,
  live: (x: string, d: string, w: string) => `ค่าบริการเฉลี่ยที่คาด ${x} · Δ ${d} จากค่าเฉลี่ยปัจจุบัน ${w}`,
  pkgLabel: "Package", fixedFee: "Monthly fee", commission: "Commission %", guaranteeFee: "Guarantee fee",
  approval: { pkg: "Package", values: "ค่าบริการ", reco: "คำแนะนำ (ตามค่า)", avg: "ค่าเฉลี่ยที่คาด" },
} as const;

/** Debt Partner R1 §10 — ?วิธีใช้ text for the new Partner cards (②–⑤ are ณ วันนี้; only PM edits). */
export const DP_HELP = {
  rate: "ตอบว่าแต่ละระบบ H+ จ่าย Partner เท่าไร ก่อนและหลังส่วนลด · ข้อมูลจาก Rate Card ที่ PM บันทึก · ณ วันนี้ ไม่มีการเทียบ · PM บันทึกใน PM Workspace › จัดการ Partner · หน้านี้ดูอย่างเดียว",
  deals: "ตอบว่ามีส่วนลด / สิทธิพิเศษอะไรจาก Partner และ AC รับทราบแล้วหรือยัง · ข้อมูลจาก PM Workspace › จัดการ Partner และ ticket ถึง AC · ณ วันนี้ · PM บันทึกใน PM Workspace › จัดการ Partner · หน้านี้ดูอย่างเดียว",
  credit: "ตอบว่ามีค่าระบบจ่ายล่วงหน้าเกินวันสิ้นสุดสัญญาที่ต้องขอเก็บเป็นเครดิตไหม · ข้อมูลจากบิล Partner ที่ AC บันทึกและคำขอของ PM · ณ วันนี้ · PM บันทึกใน PM Workspace › จัดการ Partner · หน้านี้ดูอย่างเดียว",
  tour: "ส่วนลด Partner: ③ ต้นทุนค่าระบบ ④ ข้อตกลงกับ Partner ⑤ เครดิตค่าระบบ · PM บันทึก AC รับทราบ",
} as const;

/** PS Dashboard · Tab การประชุม & เซอร์เวย์ R1 (MS1–MS40) — labels, glossary and ⓘ text (one source). */
export const MEETING_R1 = {
  heroTitle: "ประชุมที่ต้องนัดเดือนนี้",
  heroOrm: "โควตา = การ์ด Tier A ของเดือน · นัดแทนด้วย Tier B / C ได้ · ไม่นับเลื่อนไปเดือนหน้า",
  heroMc: "ทุกโรงแรมที่มีผู้ดูแล Marcom · ไม่นับเลื่อนไปเดือนหน้า",
  noChannel: "ยังไม่มีข้อมูลช่องทางประชุม · นับทุกประชุมเป็น Online Meeting",
  sectionA: "นัดครบไหม",
  sectionB: "ประชุมแล้วได้ผลแค่ไหน",
  surveyPending: "รอทำ Survey",
  templateNote: "ชุดคำถามปัจจุบัน (ชุดที่ 1) · ใช้ไปก่อน · MD มีแผนปรับหัวข้อใหม่ · เมื่อเปลี่ยนชุด การ์ดแสดงตามชุดของเดือนนั้น และไม่เทียบหัวข้อที่ต่างชุดกัน",
  glossary: {
    "Online Meeting": "หน่วยนับของแท็บนี้ · ประชุมออนไลน์ ORM และ Marcom (Call / อีเมล / LINE ไม่นับ)",
    "โควตา": "ORM = การ์ด Tier A ของเดือน · Marcom = ทุกการ์ดของเดือน · ไม่นับเลื่อนไปเดือนหน้า",
    "นัดแทน": "Online Meeting กับโรงแรม Tier B / C เมื่อนัด Tier A ไม่ได้ · นับเข้าโควตา ORM",
    "เกินโควตา": "ประชุมที่เกินจากโควตา · ยังนับในทุกจำนวน",
    "ลูกค้าไม่ให้คะแนน": "ลูกค้าปฏิเสธให้คะแนน หรือลิงก์หมดอายุ · ธงเหลือง",
    "รอทำ Survey": "ประชุมจบแล้ว ยังไม่มีเซอร์เวย์ · ยังไม่เป็นธง",
    "เงียบ ≥2 เดือน": "ไม่มีคะแนนเซอร์เวย์ติดกันตั้งแต่ 2 เดือน · ธงแดง",
  },
  info: {
    unit: "นับเป็น Online Meeting เท่านั้น · Call / อีเมล / LINE ของ Tier B / C ไม่นับในแท็บนี้",
    quota: "ORM: การ์ด Tier A ของเดือนการ์ด ลบการ์ดที่เลื่อนไปเดือนหน้า · Marcom: ทุกการ์ดของเดือน ลบเลื่อนไปเดือนหน้า",
    booked: "สถานะ ยืนยันนัด · ประชุมแล้ว · ไม่มา · ส่งเซอร์เวย์แล้ว · Online Meeting เท่านั้น · รวมเกินโควตา",
    completed: "ประชุมแล้ว + ส่งเซอร์เวย์แล้ว",
    surveyed: "ประชุมจบแล้วที่มีเซอร์เวย์มีคะแนน (AE กรอก หรือ ลูกค้าตอบเอง) · ทุกชุดคำถาม · รวมลูกค้าแย้ง",
    score: "median ของคะแนนพึงพอใจรวม เฉพาะผู้ให้คะแนน · ลูกค้าไม่ให้คะแนนไม่อยู่ใน median · ≤6 ต่ำ · 7 กลาง · ≥8 พอใจ",
    funnel: "นัดได้ → Meeting Completed → ได้คะแนน Survey · % หารด้วยนัดได้เสมอ · กรอบเส้นประ = โควตา",
    hover: "ชี้ / แตะที่แถบเพื่อดูรายชื่อโรงแรม · แตะอีกครั้ง หรือกด Esc เพื่อปิด",
    tierA: "Tier A ของเดือนที่ยังไม่จบประชุม · อยู่ในรายการจนกว่าประชุมของตัวเองจะจบ",
    owner: "แถบ = โควตา · เต็ม = Tier A สำเร็จ · ลาย = นัดแทนสำเร็จ · เทา = ยังขาด · เรียงตามชื่อ ไม่ใช่อันดับ",
    workload: "ทุก Online Meeting ของเดือน รวมเกินโควตา · ต่อ 10 โรงแรม = นัด ÷ พอร์ต × 10 · ไม่ใช่อันดับ",
    survey: "ฐานต่อแถว = ได้คะแนน + ลูกค้าไม่ให้คะแนน (รอทำ Survey ไม่อยู่ในแถว) · ไม่เทียบหัวข้อต่างชุด",
    bands: "≤6 ต่ำ (แดง) · 7 กลาง (เหลือง) · ≥8 พอใจ (เขียว) · ลูกค้าไม่ให้คะแนน = ลายเทา ท้ายแถบ",
    analyzer: "เครื่องวิเคราะห์อยู่ที่ The Office App · ยังไม่เปิดใช้",
  },
} as const;

/** Workspace Coaching patch v1.0 (WC6–WC12) — Coaching group wording (topic names, never question numbers). */
export const COACH_TH = {
  picker: "สมาชิกที่ดู (DEMO)",
  mine: "งานที่ฉันต้องดูแล",
  about: "เรื่องที่เกี่ยวกับฉัน",
  empty: "ยังไม่มีงาน Coaching",
  fRed: "แดง", fYellow: "เหลือง", fOpen: "ยังไม่ปิด", fClosed: "ปิดแล้ว",
  sOpen: "เปิด", sCoaching: "กำลังโค้ช", sClosed: "ปิดแล้ว",
  owner: "ผู้ดูแล", assignee: "ผู้โค้ช",
  ack: "รับทราบ", ackDone: "รับทราบแล้ว",
  acked: (n: number, total: number) => `รับทราบแล้ว ${n}/${total}`,
  supervisorAck: (n: number, total: number) => `ผู้ดูแลรับทราบแล้ว ${n}/${total}`,
  meetingLink: "ดูการประชุม", surveyLink: "ดูเซอร์เวย์", healthLink: "ดูสุขภาพสัญญา",
  notePh: "บันทึกการโค้ช", addNote: "บันทึก", close: "ปิดงาน",
  roleName: { GRM: "GRM", MARCOM_LEAD: "Marcom Lead", PM: "PM" } as Record<"GRM" | "MARCOM_LEAD" | "PM", string>,
  newTask: (title: string) => `🎯 งาน Coaching ใหม่ · ${title}`,
} as const;
