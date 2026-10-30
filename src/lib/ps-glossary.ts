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
  ["ps", "ต่อสัญญา & ราคา"],
  ["ac", "ลูกหนี้ & ค่าใช้จ่ายรายสัญญา"],
  ["meeting", "Meeting & Survey"],
  ["task", "ติดตามงานผู้ให้บริการ"],
  ["servicing", "On-board"],
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
export const MEETING_STATUS_LABEL = { aeNotSent: "AE ยังไม่ส่ง", surveyPending: "รอลูกค้าตอบ", surveyCommented: "ลูกค้าแย้ง", notDone: "ยังไม่สำเร็จ" } as const;
export const TIME_LABEL = { overdue: "เลยกำหนด", nearDue: "ใกล้ถึงกำหนด", onTime: "ทันกำหนด", dueToday: "ถึงกำหนดวันนี้" } as const;
/** AE display name from an owner id ("AE001-Nont" → "Nont"); missing → "ไม่พบชื่อ AE". */
export function aeNameTh(id: unknown): string {
  const s = id == null ? "" : String(id).trim();
  if (!s || s === "null" || s === "undefined") return "ไม่พบชื่อ AE";
  const m = /^AE\d+-(.+)$/.exec(s);
  return m ? m[1]! : s;
}
export const GRADE_D_LABEL = "ลูกค้าเกรด D";

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
  fields: { fee_amount: "ค่าบริการ/เดือน", commission_pct: "ค่าคอมมิชชัน %", term_months: "ระยะสัญญา (เดือน)", package: "แพ็กเกจ", start_date: "เริ่ม", end_date: "สิ้นสุด" },
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
} as const;
export const R1_HEALTH = {
  question: "สัญญาไหนแดง / เหลือง / เขียว เพราะอะไร",
  info: "1 แถว = 1 สัญญาบริการที่ใช้งาน · ระดับสีคิดจากสัญญาณของระบบเท่านั้น · ป้ายที่ AE เลือกเองแยกอยู่แถว AE ✎ · กด “? วิธีใช้” เพื่อดูการใช้งานทีละส่วน",
  help: "? วิธีใช้",
  cols: { contract: "สัญญา", service: "บริการ", owner: "AE / ORM / Marcom", tier: "ระดับ", signals: "สัญญาณ", age: "อายุสัญญา", ticket: "Ticket" },
  ownerInfo: "บรรทัดบน = AE ผู้ดูแลสัญญา · บรรทัดล่าง = ทีม ORM หรือคน Marcom ที่ทำบริการนี้",
  tierInfo: "คิดจากสัญญาณของระบบเท่านั้น · ↑ / ↓ เปลี่ยนระดับ = ดีขึ้น / แย่ลงเทียบ 30 วันก่อน หายเองเมื่อครบ 30 วัน · แดง = ค้างชำระที่สัญญานี้ หรือเรื่องต้องระวัง ≥ 2 · เหลือง = 1 เรื่อง · เขียว = ไม่มี · เรื่องดีและโอกาสไม่หักล้าง",
  signalInfo: "แถว “ระบบ” = ระบบตรวจพบจากข้อมูล ใช้คิดระดับสี · แถว “AE ✎” = AE / PM เลือกเองตอนสร้าง ticket แสดงให้รู้ ไม่เปลี่ยนสี · ▼ ต้องระวัง · ▲ เรื่องดี · ★ โอกาสขาย · ชี้ป้ายเพื่อดูที่มา",
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
  sec3Info: "เรื่องที่ระบบตรวจจากข้อมูลเอง และยังไม่พบในสัญญานี้ · ดูเพื่อรู้ เลือกใส่ ticket ไม่ได้ · ถ้าระบบพบเมื่อไร จะขึ้นที่ “สัญญาณของสัญญานี้” ด้านบนเอง",
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
