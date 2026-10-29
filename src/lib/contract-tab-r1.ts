/* PS Dashboard · Tab "ต่อสัญญา & ราคา" R1 — pure rules (no React, no storage).
 * Card ① In / Out · Churn, card ⑦ Contract Health (signal catalog + engine + tier), list filters / sort /
 * pagination, CONTRACT_SIGNAL dialog helpers (recipients, duplicate check, batch send) and the four AE bell events.
 * Unit = service contract (a hotel with ORM + Marcom = 2). Labels live in ps-glossary.ts / here as catalog text. */
import type { L0Ticket, Dept, TicketAssignee } from './tickets-l0';

export type Svc = 'ORM' | 'Marcom';
export const SVCS: Svc[] = ['ORM', 'Marcom'];
export type Tier = 'R' | 'A' | 'G';
const TIER_RANK: Record<Tier, number> = { R: 0, A: 1, G: 2 };
/** true when `a` is worse than `b`. */
export const tierWorse = (a: Tier, b: Tier) => TIER_RANK[a] < TIER_RANK[b];

/* ================= Card ① In / Out ================= */
export type EndReason = 'NOT_RENEWED' | 'EARLY_TERMINATION' | 'RENEWAL' | 'PAUSE';
export type ServiceContract = {
  contract_id: string; hotel_id: string; hotel_name: string; service: Svc;
  start: string; end: string | null; end_reason: EndReason | null;
  /** Previous contract of the same hotel + service this one continues (renewal) → never counted as "in". */
  renewal_of: string | null;
};
const ym = (d: string) => d.slice(0, 7);
/** Last 12 calendar months ending with the month of `today` (oldest first). */
export function months12(today: string): string[] {
  const y = +today.slice(0, 4), m = +today.slice(5, 7) - 1;
  return Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(y, m - 11 + i, 1)); return d.toISOString().slice(0, 7); });
}
export const isIn = (c: ServiceContract, month: string, today: string) => !c.renewal_of && ym(c.start) === month && c.start.slice(0, 10) <= today;
export const isOut = (c: ServiceContract, month: string, today: string) =>
  !!c.end && ym(c.end) === month && c.end.slice(0, 10) <= today && (c.end_reason === 'NOT_RENEWED' || c.end_reason === 'EARLY_TERMINATION');
export type FlowMonth = { month: string; current: boolean; ins: ServiceContract[]; outs: ServiceContract[]; net: number; start: number; end: number };
/** 12-month flow for one service. End level of the current month = `activeToday` (header “ใช้งาน”); earlier levels walk back by in − out. */
export function inOutSeries(contracts: ServiceContract[], svc: Svc, today: string, activeToday: number) {
  const list = contracts.filter((c) => c.service === svc);
  const ms = months12(today);
  const rows: FlowMonth[] = ms.map((month) => {
    const ins = list.filter((c) => isIn(c, month, today)), outs = list.filter((c) => isOut(c, month, today));
    return { month, current: month === ym(today), ins, outs, net: ins.length - outs.length, start: 0, end: 0 };
  });
  let level = activeToday;
  for (let i = rows.length - 1; i >= 0; i--) { const r = rows[i]!; r.end = level; r.start = level - r.net; level = r.start; }
  return { months: rows, sumIn: rows.reduce((s, r) => s + r.ins.length, 0), sumOut: rows.reduce((s, r) => s + r.outs.length, 0) };
}
/** `+n` / `−n` / `+0` (no movement or in = out). */
export const netPill = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '+0');
/** Month with the most outs across both services; latest month wins a tie. null when nothing went out. */
export function worstMonth(orm: FlowMonth[], marcom: FlowMonth[]) {
  let best: { month: string; n: number; a: number; b: number } | null = null;
  orm.forEach((o, i) => { const m = marcom[i]; const n = o.outs.length + (m?.outs.length ?? 0); if (n > 0 && (!best || n >= best.n)) best = { month: o.month, n, a: o.outs.length, b: m?.outs.length ?? 0 }; });
  return best as { month: string; n: number; a: number; b: number } | null;
}

/* ================= §5 Signal catalog ================= */
export type SignalDir = 'bad' | 'good' | 'opp';
export type SignalSrc = 'A' | 'AM' | 'M' | 'MA';
export type CatalogEntry = { key: string; group: number; dir: SignalDir; src: SignalSrc; label: string; rule: string };
export const SIGNAL_GROUPS: Record<number, string> = {
  1: 'ราคาและความคุ้มค่า', 2: 'ผลลัพธ์ที่โรงแรมได้', 3: 'กำลังเงินของโรงแรม', 4: 'งานของผู้ให้บริการ',
  5: 'การประชุม', 6: 'ช่วงเริ่มต้น', 7: 'เหตุผลฝั่งลูกค้าเอง', 8: 'โอกาส',
};
const E = (key: string, group: number, dir: SignalDir, src: SignalSrc, label: string, rule = ''): CatalogEntry => ({ key, group, dir, src, label, rule });
export const SIGNAL_CATALOG: CatalogEntry[] = [
  E('PRICE_HIGH', 1, 'bad', 'A', 'ค่าบริการแพงเมื่อเทียบผลลัพธ์', 'ORM: ค่าบริการ ÷ รายได้ที่ H+ ทำให้ > 40% (รายได้ ÷ ค่าบริการ < 2.5 เท่า)'),
  E('PRICE_WORTH', 1, 'good', 'A', 'ค่าบริการคุ้มค่า', 'ORM: ค่าบริการ ÷ รายได้ ≤ 15% (รายได้ ÷ ค่าบริการ ≥ 6.67 เท่า) · Marcom รอ Marcom App'),
  E('GUARANTEE_HIGH', 1, 'bad', 'A', 'ค่าคอม / Guarantee fee สูงเกิน', 'เก็บ Guarantee fee แทนค่าคอม ≥ 2 เดือนติด'),
  E('ABOVE_MIN', 1, 'good', 'A', 'ผลงานเกินขั้นต่ำ', 'ค่าคอมสูงกว่า Guarantee 3 เดือนติด'),
  E('COMPETITOR_CHEAPER', 1, 'bad', 'M', 'คู่แข่งเสนอถูกกว่า'),
  E('VALUE_UNSEEN', 1, 'bad', 'AM', 'มองไม่เห็นความคุ้มค่า', 'Survey ครั้งที่ 2 ข้อความคุ้มค่า ≤ 5'),
  E('VALUE_SEEN', 1, 'good', 'AM', 'ลูกค้าเห็นความคุ้มค่า', 'Survey ครั้งที่ 2 ข้อความคุ้มค่า ≥ 7'),
  E('REV_MISS', 2, 'bad', 'A', 'รายได้หรือยอดจองไม่ถึงที่คาดหวัง', 'ORM: Production Report เดือนล่าสุด ต่ำกว่าเป้ารายได้รายเดือน'),
  E('REV_HIT', 2, 'good', 'A', 'รายได้ถึงเป้า', 'ORM: Production Report เดือนล่าสุด ถึงเป้ารายได้รายเดือน'),
  E('OTA_FLAT', 2, 'bad', 'M', 'อันดับบน OTA ไม่ดีขึ้น'),
  E('OTA_UP', 2, 'good', 'M', 'อันดับ OTA ดีขึ้น'),
  E('CAMPAIGN_MISS', 2, 'bad', 'MA', 'แคมเปญ Marcom ไม่ถึงเป้า KPI'),
  E('CAMPAIGN_HIT', 2, 'good', 'MA', 'แคมเปญถึง KPI'),
  E('OVERDUE', 3, 'bad', 'A', 'ค้างชำระหรือปัญหาสภาพคล่อง', 'มีใบแจ้งหนี้เลยกำหนดที่สัญญานี้ (ข้อมูลลูกหนี้ AC)'),
  E('OVERDUE_OTHER', 3, 'bad', 'A', 'ลูกค้าค้างชำระที่สัญญาอื่น', 'ลูกค้ารายเดียวกันมีใบแจ้งหนี้เลยกำหนดที่สัญญาอื่น (ข้อมูลลูกหนี้ AC)'),
  E('PAID_ON_TIME', 3, 'good', 'A', 'ชำระตรงเวลา', 'ไม่มีใบแจ้งหนี้เลยกำหนด และเกรดการชำระ A'),
  E('BUDGET_CUT', 3, 'bad', 'MA', 'ตัดงบการตลาด / ไม่เติมค่าโฆษณา'),
  E('BUDGET_UP', 3, 'good', 'MA', 'เพิ่มงบการตลาด'),
  E('RENOVATION', 3, 'bad', 'A', 'ปิดปรับปรุงหรือลดห้องขาย', 'สัญญาหยุดชั่วคราวแบบ “ปิดปรับปรุง”'),
  E('WORK_LATE', 4, 'bad', 'A', 'งานช้า / ต้องติดตามงานบ่อยครั้ง', 'งาน / ticket ของสัญญานี้เลยกำหนด ≥ 2 รายการใน 30 วัน'),
  E('WORK_ON_TIME', 4, 'good', 'A', 'งานตรงเวลา', 'ไม่มีงานเลยกำหนด 3 เดือน'),
  E('REPORT_WRONG', 4, 'bad', 'M', 'Report หรือข้อมูลผิด'),
  E('PROMISE_BROKEN', 4, 'bad', 'M', 'ไม่ทำตามที่รับปาก'),
  E('OWNER_CHURN', 4, 'bad', 'AM', 'เปลี่ยนผู้ดูแลบ่อยหรือติดต่อยาก', 'เปลี่ยนผู้ดูแล ≥ 2 ครั้งใน 6 เดือน'),
  E('OWNER_STEADY', 4, 'good', 'AM', 'ผู้ดูแลต่อเนื่อง', 'ไม่เปลี่ยนผู้ดูแลใน 6 เดือน'),
  E('BILL_WRONG', 4, 'bad', 'AM', 'บิลผิด', 'มี ticket แก้บิลถึง AC'),
  E('MEETING_IRREGULAR', 5, 'bad', 'A', 'ประชุมไม่สม่ำเสมอ', 'ขาดประชุมรายเดือน (ORM-Snapshot / Marcom-Sync up) ≥ 1 ครั้งใน 3 เดือนล่าสุด'),
  E('MEETING_FULL', 5, 'good', 'A', 'ประชุมครบทุกเดือน', 'ประชุมรายเดือนครบ 3 เดือนล่าสุด'),
  E('MEETING_NO_OUTCOME', 5, 'bad', 'M', 'ประชุมแล้วไม่ได้ข้อสรุป'),
  E('FOLLOWUP_MISSING', 5, 'bad', 'A', 'ไม่ตามเรื่องหลังประชุม', 'งานจากการประชุมเลยกำหนด'),
  E('FOLLOWUP_DONE', 5, 'good', 'A', 'ตามเรื่องครบ', 'ไม่มีงานจากการประชุมเลยกำหนด'),
  E('ONBOARD_SLOW', 6, 'bad', 'A', 'On-board ช้า', 'มีขั้น Setup เป็นสีแดง · แสดงถึง 90 วันหลัง Go Live'),
  E('GOLIVE_ON_TIME', 6, 'good', 'A', 'Go Live ตามกำหนด', 'ไม่มีขั้น Setup สีแดง · แสดงถึง 90 วันหลัง Go Live'),
  E('SETUP_WRONG', 6, 'bad', 'AM', 'ตั้งค่าหรือข้อมูลโรงแรมผิด', 'Property Information Form ยังไม่ครบ'),
  E('EXPECTATION_GAP', 6, 'bad', 'AM', 'ความคาดหวังไม่ตรงกับที่ BD ขาย', 'Survey ครั้งที่ 1'),
  E('EXPECTATION_MET', 6, 'good', 'AM', 'ตรงความคาดหวัง', 'Survey ครั้งที่ 1'),
  E('OWNERSHIP_CHANGE', 7, 'bad', 'AM', 'ขายกิจการ / เปลี่ยนเจ้าของ / ผู้บริหาร', 'มี ticket เปลี่ยนนิติบุคคล / ผู้ลงนามถึง AC'),
  E('IN_HOUSE', 7, 'bad', 'M', 'ทำเอง in-house'),
  E('CLOSED', 7, 'bad', 'M', 'ปิดกิจการ'),
  E('POLICY_CHANGE', 7, 'bad', 'M', 'เปลี่ยนนโยบาย'),
  E('UPSELL', 8, 'opp', 'A', 'โอกาสขายบริการเพิ่ม', 'ใช้บริการเดียว + เกรด A / B + มีเรื่องดีด้านผลลัพธ์อย่างน้อย 1 เรื่อง'),
  E('PACKAGE_UP', 8, 'opp', 'M', 'พร้อมขยายแพ็กเกจ'),
  E('GROUP_HOTELS', 8, 'opp', 'M', 'มีโรงแรมในเครือ / เปิดสาขาใหม่'),
  E('REFERRAL_READY', 8, 'opp', 'AM', 'ลูกค้าพร้อมแนะนำต่อ', 'Survey ครั้งที่ 2 ≥ 9'),
];
export const catalogByKey = new Map(SIGNAL_CATALOG.map((e) => [e.key, e]));
/** People can pick M + AM labels (21); A + MA are system-only (23). */
export const isSelectable = (e: CatalogEntry) => e.src === 'M' || e.src === 'AM';

/* ================= §5.2 Engine ================= */
/** Source values per active service contract. null / undefined = data source absent → the rule is “not evaluated”. */
export type SignalInputs = {
  overdue_this?: boolean | null; overdue_other?: boolean | null; grade?: string | null;
  value_ratio?: number | null; guarantee_months?: number | null; commission_above_months?: number | null;
  survey2_value?: number | null; rev_achievement_pct?: number | null; renovation_pause?: boolean | null;
  overdue_tasks_30d?: number | null; months_without_overdue_task?: number | null; owner_changes_6m?: number | null;
  billing_correction_ticket?: boolean | null; missed_meetings_3m?: number | null; meeting_actions_overdue?: number | null;
  onboard_red?: boolean | null; days_since_golive?: number | null; pi_incomplete?: boolean | null;
  entity_change_ticket?: boolean | null; survey2_score?: number | null; single_service?: boolean | null;
};
export type Signal = { key: string; group: number; dir: SignalDir; label: string; rule: string };
const has = <T,>(v: T | null | undefined): v is T => v !== null && v !== undefined;
/** Evaluates every wired system rule for one contract (as of today). Returns fired signals + the keys that were evaluated. */
export function evaluateSignals(svc: Svc, x: SignalInputs) {
  const fired: string[] = []; const evaluated = new Set<string>();
  const check = (keys: string[], ok: boolean) => { if (ok) keys.forEach((k) => evaluated.add(k)); };
  if (svc === 'ORM' && has(x.value_ratio)) { check(['PRICE_HIGH', 'PRICE_WORTH'], true); if (x.value_ratio < 2.5) fired.push('PRICE_HIGH'); else if (x.value_ratio >= 6.67) fired.push('PRICE_WORTH'); }
  if (has(x.guarantee_months)) { check(['GUARANTEE_HIGH'], true); if (x.guarantee_months >= 2) fired.push('GUARANTEE_HIGH'); }
  if (has(x.commission_above_months)) { check(['ABOVE_MIN'], true); if (x.commission_above_months >= 3) fired.push('ABOVE_MIN'); }
  if (has(x.survey2_value)) { check(['VALUE_UNSEEN', 'VALUE_SEEN'], true); if (x.survey2_value <= 5) fired.push('VALUE_UNSEEN'); else if (x.survey2_value >= 7) fired.push('VALUE_SEEN'); }
  if (svc === 'ORM' && has(x.rev_achievement_pct)) { check(['REV_MISS', 'REV_HIT'], true); fired.push(x.rev_achievement_pct >= 100 ? 'REV_HIT' : 'REV_MISS'); }
  if (has(x.overdue_this)) {
    check(['OVERDUE', 'OVERDUE_OTHER'], true);
    if (x.overdue_this) fired.push('OVERDUE'); else if (x.overdue_other === true) fired.push('OVERDUE_OTHER');
    if (has(x.grade)) { check(['PAID_ON_TIME'], true); if (!x.overdue_this && x.overdue_other !== true && x.grade === 'A') fired.push('PAID_ON_TIME'); }
  }
  if (has(x.renovation_pause)) { check(['RENOVATION'], true); if (x.renovation_pause) fired.push('RENOVATION'); }
  if (has(x.overdue_tasks_30d)) { check(['WORK_LATE'], true); if (x.overdue_tasks_30d >= 2) fired.push('WORK_LATE'); }
  if (has(x.months_without_overdue_task)) { check(['WORK_ON_TIME'], true); if (x.months_without_overdue_task >= 3) fired.push('WORK_ON_TIME'); }
  if (has(x.owner_changes_6m)) { check(['OWNER_CHURN', 'OWNER_STEADY'], true); if (x.owner_changes_6m >= 2) fired.push('OWNER_CHURN'); else if (x.owner_changes_6m === 0) fired.push('OWNER_STEADY'); }
  if (has(x.billing_correction_ticket)) { check(['BILL_WRONG'], true); if (x.billing_correction_ticket) fired.push('BILL_WRONG'); }
  if (has(x.missed_meetings_3m)) { check(['MEETING_IRREGULAR', 'MEETING_FULL'], true); fired.push(x.missed_meetings_3m >= 1 ? 'MEETING_IRREGULAR' : 'MEETING_FULL'); }
  if (has(x.meeting_actions_overdue)) { check(['FOLLOWUP_MISSING', 'FOLLOWUP_DONE'], true); fired.push(x.meeting_actions_overdue > 0 ? 'FOLLOWUP_MISSING' : 'FOLLOWUP_DONE'); }
  if (has(x.onboard_red) && (x.days_since_golive == null || x.days_since_golive <= 90)) { check(['ONBOARD_SLOW', 'GOLIVE_ON_TIME'], true); fired.push(x.onboard_red ? 'ONBOARD_SLOW' : 'GOLIVE_ON_TIME'); }
  if (has(x.pi_incomplete)) { check(['SETUP_WRONG'], true); if (x.pi_incomplete) fired.push('SETUP_WRONG'); }
  if (has(x.entity_change_ticket)) { check(['OWNERSHIP_CHANGE'], true); if (x.entity_change_ticket) fired.push('OWNERSHIP_CHANGE'); }
  if (has(x.survey2_score)) { check(['REFERRAL_READY'], true); if (x.survey2_score >= 9) fired.push('REFERRAL_READY'); }
  // Group 8 (replaces the old ⑦a cross-sell rule): single-service + grade A / B + ≥ 1 good result signal (groups 1–2).
  if (has(x.single_service) && has(x.grade)) {
    check(['UPSELL'], true);
    const goodResult = fired.some((k) => { const e = catalogByKey.get(k)!; return e.dir === 'good' && (e.group === 1 || e.group === 2); });
    if (x.single_service && ['A', 'B'].includes(x.grade) && goodResult) fired.push('UPSELL');
  }
  const signals: Signal[] = fired.map((k) => { const e = catalogByKey.get(k)!; return { key: k, group: e.group, dir: e.dir, label: e.label, rule: e.rule }; });
  return { signals, evaluated };
}
/** §4.4 tier — system signals only; AE labels never count; good / opportunity never offset bad. */
export function tierOf(signals: Signal[]): { tier: Tier; bad: number; overdueThis: boolean } {
  const bad = signals.filter((s) => s.dir === 'bad').length;
  const overdueThis = signals.some((s) => s.key === 'OVERDUE');
  return { tier: overdueThis || bad >= 2 ? 'R' : bad === 1 ? 'A' : 'G', bad, overdueThis };
}

/* ================= §10.1 AE labels · §10.2 snapshots ================= */
export type AeLabel = { id: string; contract_id: string; label_key: string; source: 'AE'; created_by: TicketAssignee; created_at: string; ticket_id: string; batch_id: string };
export type TierSnapshot = { contract_id: string; date: string; tier: Tier; bad_count: number };
export const addDays = (day: string, n: number) => new Date(Date.parse(day.slice(0, 10) + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
/** Tier 30 days ago, only from an existing snapshot of exactly that day (never estimated). */
export function tier30(snaps: TierSnapshot[], contractId: string, today: string): Tier | null {
  const d = addDays(today, -30);
  return snaps.find((s) => s.contract_id === contractId && s.date === d)?.tier ?? null;
}
export function tierMark(now: Tier, old: Tier | null): 'up' | 'down' | null {
  if (!old || old === now) return null;
  return tierWorse(now, old) ? 'down' : 'up';
}

/* ================= §4 rows ================= */
export type HealthRow = {
  contract_id: string; hotel_id: string; hotel_name: string; hotel_name_en: string | null; hotel_name_th: string | null;
  service: Svc; ae: string | null; ae_name: string; owner2: string | null; orm_team: string | null; marcom: string | null;
  start: string | null; term_end: string | null;
  signals: Signal[]; evaluated: string[]; ae_labels: AeLabel[];
  tier: Tier; bad: number; tier30: Tier | null; tickets: L0Ticket[];
};
const OPEN = ['NEW', 'ACK', 'IN_PROGRESS'];
/** Tickets not DONE / not CANCELLED that carry this contract (any type). */
export const ticketsOfContract = (tickets: L0Ticket[], contractId: string) =>
  tickets.filter((t) => OPEN.includes(t.status) && (t.subject_ref.contract_id === contractId || t.payload.contract_id === contractId));
export const dayDiff = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 864e5);
/** Age as today − start (same definition as the อายุสัญญา card: age_days = start → today for active contracts). */
export function ageDays(start: string | null, today: string) { return start ? Math.max(0, dayDiff(start, today)) : null; }
export function ageText(start: string | null, today: string): string {
  if (!start) return '—';
  const s = new Date(start.slice(0, 10) + 'T00:00:00Z'), t = new Date(today + 'T00:00:00Z');
  let months = (t.getUTCFullYear() - s.getUTCFullYear()) * 12 + (t.getUTCMonth() - s.getUTCMonth());
  if (t.getUTCDate() < s.getUTCDate()) months--;
  if (months < 1) return `${Math.max(0, dayDiff(start, today))} วัน`;
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} ปี` : '', m ? `${m} เดือน` : ''].filter(Boolean).join(' ');
}
/** Days until the scheduled end; shown when ≤ 60 (same rule as “ใกล้หมดสัญญา”). */
export function daysToEnd(row: Pick<HealthRow, 'term_end'>, today: string) { return row.term_end ? dayDiff(today, row.term_end) : null; }
export const DUE_DAYS = 60;
export const isDueSoon = (row: Pick<HealthRow, 'term_end'>, today: string) => { const d = daysToEnd(row, today); return d != null && d >= 0 && d <= DUE_DAYS; };
export const hasOpportunity = (row: HealthRow) => row.signals.some((s) => s.group === 8) || row.ae_labels.some((l) => catalogByKey.get(l.label_key)?.group === 8);

/* search */
export const normalizeName = (s: string) => s.toLowerCase().replace(/[\s\-·.,'’‘`]/g, '');
/** Every typed word must be contained in the EN or TH name (normalised; partial words match). */
export function matchesSearch(row: Pick<HealthRow, 'hotel_name' | 'hotel_name_en' | 'hotel_name_th'>, q: string) {
  const words = q.trim().split(/\s+/).map(normalizeName).filter(Boolean);
  if (!words.length) return true;
  const names = [row.hotel_name_en, row.hotel_name_th, row.hotel_name].filter((x): x is string => !!x).map(normalizeName);
  return names.some((n) => words.every((w) => n.includes(w)));
}
/** Range [from, to) in `name` of the first typed word, matching on the normalised text; null when absent. */
export function highlightRange(name: string, q: string): [number, number] | null {
  const w = q.trim().split(/\s+/).map(normalizeName).filter(Boolean)[0];
  if (!w) return null;
  const map: number[] = []; let norm = '';
  for (let i = 0; i < name.length; i++) { const c = normalizeName(name[i]!); if (c) { norm += c; for (let k = 0; k < c.length; k++) map.push(i); } }
  const at = norm.indexOf(w); if (at < 0) return null;
  return [map[at]!, map[at + w.length - 1]! + 1];
}

/* filters */
export type QuickKey = 'NO_TICKET' | 'DUE' | 'WORSE' | 'OPP';
export const QUICK_KEYS: QuickKey[] = ['NO_TICKET', 'DUE', 'WORSE', 'OPP'];
export type OwnerSel = { ae: string[]; orm: string[]; marcom: string[] };
export type SortKey = { by: 'age' | 'tickets'; dir: 'desc' | 'asc' } | null;
export type HealthFilter = { tier: Tier | 'ALL'; quick: QuickKey[]; q: string; svc: Svc | 'ALL'; owners: OwnerSel; groups: number[] };
export const EMPTY_FILTER: HealthFilter = { tier: 'ALL', quick: [], q: '', svc: 'ALL', owners: { ae: [], orm: [], marcom: [] }, groups: [] };
export function quickHit(row: HealthRow, k: QuickKey, today: string) {
  if (k === 'NO_TICKET') return row.tier !== 'G' && row.tickets.length === 0;
  if (k === 'DUE') return isDueSoon(row, today);
  if (k === 'WORSE') return tierMark(row.tier, row.tier30) === 'down';
  return hasOpportunity(row);
}
/** OR inside a group, AND across groups. */
export function ownerHit(row: HealthRow, o: OwnerSel) {
  return (!o.ae.length || (row.ae != null && o.ae.includes(row.ae))) && (!o.orm.length || (row.orm_team != null && row.service === 'ORM' && o.orm.includes(row.orm_team))) && (!o.marcom.length || (row.marcom != null && row.service === 'Marcom' && o.marcom.includes(row.marcom)));
}
export const groupHit = (row: HealthRow, groups: number[]) => !groups.length || row.signals.some((s) => groups.includes(s.group)) || row.ae_labels.some((l) => groups.includes(catalogByKey.get(l.label_key)?.group ?? 0));
/** Everything except the tier selection (used for live quick-filter counts per tier selection). */
export function filterRows(rows: HealthRow[], f: HealthFilter, today: string, skipQuick?: QuickKey) {
  return rows.filter((r) => (f.tier === 'ALL' || r.tier === f.tier) && f.quick.filter((k) => k !== skipQuick).every((k) => quickHit(r, k, today)) && matchesSearch(r, f.q) && (f.svc === 'ALL' || r.service === f.svc) && ownerHit(r, f.owners) && groupHit(r, f.groups));
}
const badCount = (r: HealthRow) => r.signals.filter((s) => s.dir === 'bad').length;
export function defaultOrder(a: HealthRow, b: HealthRow) {
  return TIER_RANK[a.tier] - TIER_RANK[b.tier] || badCount(b) - badCount(a) || a.hotel_name.localeCompare(b.hotel_name, 'th');
}
/** Red + yellow block first, green separately after; an age / ticket sort applies inside each block. */
export function sortRows(rows: HealthRow[], sort: SortKey, today: string) {
  const val = (r: HealthRow) => (sort?.by === 'age' ? ageDays(r.start, today) ?? -1 : r.tickets.length);
  const by = (a: HealthRow, b: HealthRow) => (sort ? (sort.dir === 'desc' ? val(b) - val(a) : val(a) - val(b)) || defaultOrder(a, b) : defaultOrder(a, b));
  const ry = rows.filter((r) => r.tier !== 'G').sort(by), g = rows.filter((r) => r.tier === 'G').sort(by);
  return { ry, green: g };
}
/** 20 · 50 · 100 · 150 … (steps of 50) up to the first value ≥ the portfolio size. */
export function pageSizeOptions(total: number) {
  const out = [20, 50]; while (out[out.length - 1]! < total) out.push(out[out.length - 1]! + 50);
  return out[1]! >= total && out.length > 2 ? out.slice(0, 2) : out;
}
/** Pager: ≤ 5 pages → all; else `1 2 … {current} … n−1 n`. */
export function pageList(current: number, n: number): (number | '…')[] {
  if (n <= 5) return Array.from({ length: n }, (_, i) => i + 1);
  const out: (number | '…')[] = [1, 2];
  if (current > 2 && current < n - 1) { if (current > 3) out.push('…'); out.push(current); if (current < n - 2) out.push('…'); } else out.push('…');
  out.push(n - 1, n);
  return out;
}
export type PageOut = { pages: HealthRow[][]; expandedFirst: boolean; hiddenGreen: number; showGreenRow: boolean };
/** §4.11: tier ALL → red + yellow always shown, green behind a row at the end (last page). Default size 20 grows page 1 to fit every red + yellow. */
export function paginate(sorted: { ry: HealthRow[]; green: HealthRow[] }, tier: Tier | 'ALL', size: number, showGreen: boolean): PageOut {
  const chunk = (list: HealthRow[]) => { const p: HealthRow[][] = []; for (let i = 0; i < list.length; i += size) p.push(list.slice(i, i + size)); return p; };
  if (tier !== 'ALL') { const list = [...sorted.ry, ...sorted.green]; const pages = chunk(list); return { pages: pages.length ? pages : [[]], expandedFirst: false, hiddenGreen: 0, showGreenRow: false }; }
  const hidden = showGreen ? 0 : sorted.green.length;
  const expandedFirst = size === 20 && !showGreen && sorted.ry.length > 20;
  let pages: HealthRow[][];
  if (expandedFirst) pages = [sorted.ry];
  else pages = chunk([...sorted.ry, ...(showGreen ? sorted.green : [])]);
  return { pages: pages.length ? pages : [[]], expandedFirst, hiddenGreen: hidden, showGreenRow: sorted.green.length > 0 };
}

/* ================= §6 CONTRACT_SIGNAL dialog ================= */
export type RecipientRole = 'AE' | 'ORM' | 'MARCOM' | 'HEAD_AE' | 'HEAD_ORM' | 'HEAD_MARCOM' | 'BDM';
/** AE / หัวหน้า AE → PS · ORM team / หัวหน้า ORM → ORM · Marcom person / หัวหน้า Marcom → MARCOM · BDM → BD. */
export function recipientDept(role: RecipientRole): Dept {
  return role === 'AE' || role === 'HEAD_AE' ? 'PS' : role === 'ORM' || role === 'HEAD_ORM' ? 'ORM' : role === 'MARCOM' || role === 'HEAD_MARCOM' ? 'MARCOM' : 'BD';
}
export type Box = { ticket_id: string; recipient: TicketAssignee & { role: RecipientRole }; labels: string[]; note: string; state: 'draft' | 'sending' | 'ok' | 'fail'; error?: string };
export const unsent = (boxes: Box[]) => boxes.filter((b) => b.state !== 'ok');
export const canSend = (boxes: Box[]) => boxes.length > 0 && unsent(boxes).length > 0 && unsent(boxes).every((b) => b.labels.length > 0);
export const sameRecipient = (a: TicketAssignee | undefined, b: TicketAssignee) => !!a && a.member_id === b.member_id && a.role === b.role;
export type DupHit = { box: string; label: string; recipient: string; ticket: L0Ticket };
/** Same contract + same recipient + same label on an existing ticket (any status except CANCELLED). */
export function duplicateHits(boxes: Box[], contractId: string, tickets: L0Ticket[]): DupHit[] {
  const out: DupHit[] = [];
  for (const b of unsent(boxes)) for (const l of b.labels) {
    const t = tickets.find((x) => x.status !== 'CANCELLED' && x.ticket_id !== b.ticket_id && (x.subject_ref.contract_id === contractId || x.payload.contract_id === contractId) && sameRecipient(x.assignee, b.recipient) && (x.payload.labels ?? []).includes(l));
    if (t) out.push({ box: b.ticket_id, label: l, recipient: b.recipient.display, ticket: t });
  }
  return out;
}
export const warnBdm = (boxes: Box[]) => boxes.some((b) => b.labels.some((l) => catalogByKey.get(l)?.group === 8)) && !boxes.some((b) => b.recipient.role === 'BDM');
/** Writes one ticket per unsent box (shared batch). A write that does not confirm within `timeoutMs` = หมดเวลา. */
export async function sendBatch(boxes: Box[], write: (b: Box) => Promise<boolean> | boolean, timeoutMs = 10_000, timeoutLabel = 'หมดเวลา'): Promise<Box[]> {
  const run = async (b: Box): Promise<Box> => {
    if (b.state === 'ok') return b;
    try {
      const ok = await Promise.race([Promise.resolve().then(() => write(b)), new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), timeoutMs))]);
      if (ok === 'timeout') return { ...b, state: 'fail', error: timeoutLabel };
      return ok ? { ...b, state: 'ok', error: undefined } : { ...b, state: 'fail', error: 'บันทึกไม่ได้' };
    } catch (e) { return { ...b, state: 'fail', error: e instanceof Error ? e.message : 'บันทึกไม่ได้' }; }
  };
  return Promise.all(boxes.map(run));
}
/** §6.5: labels that are not a current system signal of the contract become AE labels (once per contract + label). */
export function newAeLabels(box: Box, row: Pick<HealthRow, 'contract_id' | 'signals'>, existing: AeLabel[], batch: string, at: string, by: TicketAssignee): AeLabel[] {
  const sys = new Set(row.signals.map((s) => s.key));
  const have = new Set(existing.filter((l) => l.contract_id === row.contract_id).map((l) => l.label_key));
  return box.labels.filter((l) => !sys.has(l) && !have.has(l)).map((l, i) => ({ id: `${box.ticket_id}-L${i + 1}`, contract_id: row.contract_id, label_key: l, source: 'AE', created_by: by, created_at: at, ticket_id: box.ticket_id, batch_id: batch }));
}

/* ================= §7 bell events ================= */
export type ChKind = 'CH_NO_TICKET' | 'CH_DUE_SOON' | 'CH_TIER_WORSE' | 'CH_OPPORTUNITY';
export type ChAlert = { key: string; kind: ChKind; ae: string; at: string; contract_id: string | null; hotel_name: string | null; service: Svc | null; n?: number; tier?: Tier; from?: Tier; label?: string };
export const QUICK_OF: Record<ChKind, QuickKey> = { CH_NO_TICKET: 'NO_TICKET', CH_DUE_SOON: 'DUE', CH_TIER_WORSE: 'WORSE', CH_OPPORTUNITY: 'OPP' };
const DUE_STEPS = [60, 30, 14];
/** One pass of the daily evaluation. Only new dedupe keys are returned; recipient = the AE who owns the contract. */
export function evaluateAlerts(rows: HealthRow[], snaps: TierSnapshot[], existingKeys: Set<string>, today: string, at: string): ChAlert[] {
  const out: ChAlert[] = [];
  const push = (a: ChAlert) => { if (!existingKeys.has(a.key) && !out.some((x) => x.key === a.key)) out.push(a); };
  const yesterday = addDays(today, -1);
  const byAe = new Map<string, HealthRow[]>();
  for (const r of rows) { if (!r.ae) continue; byAe.set(r.ae, [...(byAe.get(r.ae) ?? []), r]); }
  for (const [ae, list] of byAe) {
    const n = list.filter((r) => r.tier !== 'G' && r.tickets.length === 0).length;
    if (n) push({ key: `CH_NO_TICKET|${ae}|${today}`, kind: 'CH_NO_TICKET', ae, at, contract_id: null, hotel_name: null, service: null, n });
  }
  for (const r of rows) {
    if (!r.ae) continue;
    const d = daysToEnd(r, today);
    if (d != null && d >= 0) { const step = [...DUE_STEPS].reverse().find((s) => d <= s); if (step) push({ key: `CH_DUE_SOON|${r.contract_id}|${r.term_end}|${step}`, kind: 'CH_DUE_SOON', ae: r.ae, at, contract_id: r.contract_id, hotel_name: r.hotel_name, service: r.service, n: d }); }
    const y = snaps.find((s) => s.contract_id === r.contract_id && s.date === yesterday);
    if (y && tierWorse(r.tier, y.tier)) push({ key: `CH_TIER_WORSE|${r.contract_id}|${today}|${y.tier}>${r.tier}`, kind: 'CH_TIER_WORSE', ae: r.ae, at, contract_id: r.contract_id, hotel_name: r.hotel_name, service: r.service, tier: r.tier, from: y.tier });
    const opp = [...r.signals.filter((s) => s.group === 8).map((s) => s.key), ...r.ae_labels.filter((l) => catalogByKey.get(l.label_key)?.group === 8).map((l) => l.label_key)];
    for (const k of new Set(opp)) push({ key: `CH_OPPORTUNITY|${r.contract_id}|${k}`, kind: 'CH_OPPORTUNITY', ae: r.ae, at, contract_id: r.contract_id, hotel_name: r.hotel_name, service: r.service, label: catalogByKey.get(k)?.label ?? k });
  }
  return out;
}
/** Today's snapshot rows (one per active contract). */
export const snapshotOf = (rows: HealthRow[], today: string): TierSnapshot[] => rows.map((r) => ({ contract_id: r.contract_id, date: today, tier: r.tier, bad_count: r.bad }));

/* ================= row assembly ================= */
/** Contract base for card ⑦ (one row per active service contract). */
export type BaseContract = {
  contract_id: string; hotel_id: string; hotel_name: string; hotel_name_en: string | null; hotel_name_th: string | null;
  service: Svc; ae: string | null; orm_team: string | null; marcom: string | null;
  start: string | null; term_end: string | null; inputs: SignalInputs;
};
export type TabR1Data = {
  today: string; demo: boolean;
  /** Card ① contracts (12-month in / out). */
  flow: ServiceContract[];
  /** Header “ใช้งาน” per service (same source as the header). */
  activeToday: Record<Svc, number>;
  base: BaseContract[];
  /** Demo-only existing tickets (merged with the ticket store for reads). */
  seedTickets: L0Ticket[];
};
const aeShort = (id: string | null) => { if (!id) return '—'; const m = /^AE\d+-(.+)$/.exec(id); return m ? m[1]! : id; };
export function buildRows(base: BaseContract[], ctx: { today: string; labels: AeLabel[]; snaps: TierSnapshot[]; tickets: L0Ticket[] }): HealthRow[] {
  return base.map((b) => {
    const { signals, evaluated } = evaluateSignals(b.service, b.inputs);
    const { tier, bad } = tierOf(signals);
    return {
      contract_id: b.contract_id, hotel_id: b.hotel_id, hotel_name: b.hotel_name, hotel_name_en: b.hotel_name_en, hotel_name_th: b.hotel_name_th,
      service: b.service, ae: b.ae, ae_name: aeShort(b.ae), orm_team: b.orm_team, marcom: b.marcom,
      owner2: b.service === 'ORM' ? (b.orm_team ? `ORM ทีม ${b.orm_team}` : null) : b.marcom,
      start: b.start, term_end: b.term_end, signals, evaluated: [...evaluated],
      ae_labels: ctx.labels.filter((l) => l.contract_id === b.contract_id),
      tier, bad, tier30: tier30(ctx.snaps, b.contract_id, ctx.today), tickets: ticketsOfContract(ctx.tickets, b.contract_id),
    };
  });
}
