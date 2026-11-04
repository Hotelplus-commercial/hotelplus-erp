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

/* ===================== Tab R2 · การ์ดการต่อสัญญา (Renewal, O-15) — display text only ===================== */
export const RN2_STAGE_TH = { NOT_STARTED: "ยังไม่เริ่ม", IN_PROGRESS: "กำลังดำเนินการ", LINK_SENT: "ส่ง link แล้ว", RENEWED: "ต่อแล้ว", LOST_OR_DECLINED: "ไม่ต่อ / หลุด" } as const;
export const RN2_ZONE_TH = { known: "รู้ผลแล้ว", open: "ยังไม่รู้ผล" } as const;
export const RN2_OUTCOME_TH = { NOT_RENEWED: "ไม่ต่อ", LOST: "ยกเลิกก่อนกำหนด" } as const;
export const RN2 = {
  title: "การต่อสัญญา (Renewal)",
  asOf: (d: string) => `ข้อมูลถึง ${d}`,
  help: "? วิธีใช้",
  info: "1 สัญญาบริการ = 1 หน่วย (โรงแรมที่มี ORM + Marcom = 2) · สัญญาอยู่ในช่วงตาม วันครบกำหนดสัญญา · ยกเลิกก่อนกำหนด ใช้วันที่มีผล · ต่อแล้ว = ลูกค้าเซ็นแล้ว (นับทันทีแม้เซ็นล่วงหน้า ไม่ต้องรอ Mark as Done) · ที่มา: การ์ดต่อสัญญา + คำขอต่อสัญญา · PS App",
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
    banner: (n: number) => `เลยกำหนด ${n} วัน · สัญญาหมดอายุ ไม่ active · กระทบการวางบิล AC`,
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
    { target: "rn2-highlight", title: "ดูราย AE / ค้นหา", text: "เลือก AE หรือพิมพ์ชื่อโรงแรม / เลขสัญญา · การ์ดที่ตรงจะเด่นและขึ้นก่อน ที่เหลือเป็นสีเทา ไม่ซ่อน" },
    { target: "rn2-switch", title: "แสดง / ซ่อน stage", text: "stage ซ่อนไว้ก่อน · เปิดสวิตช์เพื่อแสดงทุก stage · ▴ ซ่อน ที่หัวคอลัมน์เพื่อปิดทีละ stage" },
    { target: "rn2-reasons", title: "ทำไมลูกค้าไม่ต่อ / หลุด", text: "ป้ายที่พบบ่อย = 3 อันดับแรกของเหตุผลหลัก / รอง · 7 กลุ่ม = กลุ่มไหนโดนบ่อยสุด (นับเป็นป้าย)" },
  ],
} as const;

/* R2.1 UAT fix (UF2 / UF3 / UF1) — renewal labels. */
export const RENEWAL_OWNER_ONLY_HINT = (ae: string) => `เฉพาะ AE เจ้าของสัญญา · ${ae}`;
export const RENEWAL_OWNER_ONLY_TOOLTIP = "ปุ่มนี้ใช้ได้เฉพาะ AE เจ้าของสัญญา (การต่อสัญญาเป็นงานของเจ้าของสัญญาเท่านั้น)";
export const RENEWAL_TEST_SWITCH = (ae: string) => `สลับเป็น ${ae} เพื่อทดสอบ`;
export const RENEWAL_TEST_BANNER = (role: string, member: string) => `ทดสอบในบทบาท ${role} · ${member}`;
export const RENEWAL_SECTION_TITLE = (n: number) => `ต้องต่อสัญญา (≤ ${n} วัน)`;
export const RENEWAL_SOURCE_NOT_FOUND = (contractId: string) => `ไม่พบสัญญาต้นทาง ${contractId} ใน สัญญา & บริการ · แจ้ง PM ตรวจสัญญา`;
export const RENEWAL_COPY_CONTRACT_ID = "คัดลอกเลขสัญญา";
