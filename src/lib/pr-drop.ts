/* PR-O1 (6 Nov 2026) — Production Report drop: items, cut-off, statuses, lead overview, bell keys. Pure; no storage.
 * One item = one active service contract × one service month; key = contract + month. Cut-off = the 3rd of the next month. */
import { contractStateOn } from './contract-state';

export const PR_DROP_DUE_DAY = 3; // setting pr_drop_due_day
export const PR_MAX_BYTES = 20 * 1024 * 1024;
export type PrService = 'ORM' | 'Marcom';
export type PrFile = { ref: string; name: string; size: number; at: string; version: number };
export type PrEvent = { at: string; by: string; action: string; note?: string | null };
/** Stored row (collection meridia.production_report_drops.v1). Only what people recorded — statuses are derived. */
export type PrDropRow = {
  id: string; contract_id: string; month: string; // YYYY-MM
  sent_customer_at: string | null; customer: 'CONFIRMED' | 'DISPUTED' | null; customer_at: string | null; dispute_reason: string | null;
  files: PrFile[]; sent_ac_at: string | null; revenue_thb: number | null;
  returned_at: string | null; return_reason: string | null;
  /** AC's manual CRM revenue that differed when the drop became the source (kept as history) + AC acknowledgement. */
  ac_prev_revenue: number | null; ac_ack_at: string | null;
  history: PrEvent[];
};
/** Contract facts the drop needs (from the main contract store, or the DEMO bundle). */
export type PrContract = {
  contract_id: string; hotel_id: string | null; hotel: string; service: PrService; start: string; term_end: string | null;
  end?: string | null; end_reason?: string | null; commission_sku: string | null; commission_rate: number | null;
  caretaker: string; team: string;
};
export type PrStatus = 'NOT_YET' | 'DUE_TODAY' | 'LATE' | 'SENT_AC' | 'DISPUTE' | 'RETURNED' | 'READY' | 'BILLED';
export type PrItem = PrContract & { id: string; month: string; cutoff: string; row: PrDropRow | null; status: PrStatus; auto_confirmed: boolean; late_days: number; needs_revenue: boolean };

export const prKey = (contract_id: string, month: string) => `${contract_id}|${month}`;
const ym = (d: string) => d.slice(0, 7);
export const nextMonth = (m: string) => { const y = +m.slice(0, 4), n = +m.slice(5, 7); return n === 12 ? `${y + 1}-01` : `${y}-${String(n + 1).padStart(2, '0')}`; };
export const prevMonth = (m: string) => { const y = +m.slice(0, 4), n = +m.slice(5, 7); return n === 1 ? `${y - 1}-12` : `${y}-${String(n - 1).padStart(2, '0')}`; };
const lastDay = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
export const cutoffOf = (month: string) => `${nextMonth(month)}-${String(PR_DROP_DUE_DAY).padStart(2, '0')}`;
const days = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 864e5);

/** PR1: active at any time in the month (contractStateOn on the 1st or the last day; a mid-month end keeps its month). */
export function activeInMonth(c: PrContract, month: string): boolean {
  const s = { contract_id: c.contract_id, start: c.start, term_end: c.term_end, end: c.end ?? null, end_reason: c.end_reason ?? null };
  const first = `${month}-01`, last = lastDay(month);
  if (contractStateOn(s, first) === 'ACTIVE' || contractStateOn(s, last) === 'ACTIVE') return true;
  return c.start.slice(0, 10) <= last && (c.term_end ?? '9999') >= first && !(c.end && c.end.slice(0, 10) < first);
}
/** Items exist from the 1st of the following month; never a future / current month. */
export const monthOpen = (month: string, today: string) => `${nextMonth(month)}-01` <= today.slice(0, 10);

export function statusOf(row: PrDropRow | null, cutoff: string, today: string, billed: boolean): { status: PrStatus; auto: boolean } {
  const t = today.slice(0, 10);
  if (billed) return { status: 'BILLED', auto: false };
  const sentAc = !!row?.sent_ac_at && !(row.returned_at && row.returned_at > row.sent_ac_at);
  if (row?.returned_at && !sentAc) return { status: 'RETURNED', auto: false };
  if (row?.customer === 'DISPUTED') return { status: 'DISPUTE', auto: false };
  if (sentAc && row?.customer === 'CONFIRMED') return { status: 'READY', auto: false };
  if (sentAc && t > cutoff) return { status: 'READY', auto: true }; // PR5: no reply by the cut-off = confirmed
  if (sentAc) return { status: 'SENT_AC', auto: false };
  if (t > cutoff) return { status: 'LATE', auto: false };
  if (t === cutoff) return { status: 'DUE_TODAY', auto: false };
  return { status: 'NOT_YET', auto: false };
}

/** All items of a month (stable keys; rows matched by key, never duplicated). */
export function prItems(contracts: PrContract[], rows: PrDropRow[], month: string, today: string, billedKeys: Set<string> = new Set()): PrItem[] {
  if (!monthOpen(month, today)) return [];
  const byKey = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: PrItem[] = [];
  for (const c of contracts) {
    const id = prKey(c.contract_id, month);
    if (seen.has(id) || !activeInMonth(c, month)) continue;
    seen.add(id);
    const row = byKey.get(id) ?? null; const cutoff = cutoffOf(month);
    const st = statusOf(row, cutoff, today, billedKeys.has(id));
    out.push({ ...c, id, month, cutoff, row, status: st.status, auto_confirmed: st.auto, late_days: st.status === 'LATE' ? days(cutoff, today) : 0, needs_revenue: c.service === 'ORM' && c.commission_rate != null });
  }
  return out;
}

export const STATUS_TH: Record<PrStatus, string> = {
  NOT_YET: 'ยังไม่ส่ง', DUE_TODAY: 'ตัดรอบวันนี้', LATE: 'เลยตัดรอบ', SENT_AC: 'ส่ง AC แล้ว · รอลูกค้ายืนยัน', DISPUTE: 'ลูกค้าแย้ง',
  RETURNED: 'AC ส่งกลับแก้', READY: 'พร้อมวางบิล', BILLED: 'วางบิลแล้ว',
};
export const statusText = (i: Pick<PrItem, 'status' | 'late_days' | 'auto_confirmed'>) =>
  i.status === 'LATE' ? `เลยตัดรอบ ${i.late_days} วัน` : i.status === 'READY' && i.auto_confirmed ? 'พร้อมวางบิล · ลูกค้ายืนยัน (อัตโนมัติ)' : STATUS_TH[i.status];
export const STATUS_TONE: Record<PrStatus, 'grey' | 'yellow' | 'red' | 'orange' | 'green' | 'blue'> = {
  NOT_YET: 'grey', DUE_TODAY: 'yellow', LATE: 'red', SENT_AC: 'blue', DISPUTE: 'orange', RETURNED: 'red', READY: 'green', BILLED: 'green',
};

/** PR8–PR11 validation for "ส่งไฟล์ให้ AC". */
export function sendAcError(item: Pick<PrItem, 'needs_revenue' | 'status'>, files: PrFile[], revenue: number | null): string | null {
  if (item.status === 'READY' || item.status === 'BILLED') return 'ล็อกแล้ว · แก้ได้เมื่อ AC ส่งกลับแก้';
  if (!files.length) return 'แนบไฟล์ PDF อย่างน้อย 1 ไฟล์';
  if (item.needs_revenue && (revenue == null || !Number.isFinite(revenue) || revenue < 0)) return 'กรอกรายได้ที่ใช้คิดค่าคอม (฿)';
  return null;
}
export function pdfError(f: { name: string; size: number; type?: string }): string | null {
  if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return 'รับเฉพาะไฟล์ PDF';
  if (f.size > PR_MAX_BYTES) return 'ไฟล์ใหญ่เกิน 20 MB';
  return null;
}

/** PR13 lead overview counters — counts only, never money. */
export function leadCounters(items: PrItem[]) {
  const by = (s: PrService) => {
    const xs = items.filter((i) => i.service === s);
    const sent = xs.filter((i) => ['SENT_AC', 'READY', 'BILLED'].includes(i.status) || (i.status === 'DISPUTE' && !!i.row?.sent_ac_at)).length;
    return { total: xs.length, sent, late: xs.filter((i) => i.status === 'LATE').length, dispute: xs.filter((i) => i.status === 'DISPUTE').length };
  };
  return { ORM: by('ORM'), Marcom: by('Marcom') };
}
/** Lead rows: the fields a lead may see (no revenue / amounts). */
export const leadRow = (i: PrItem) => ({ id: i.id, hotel: i.hotel, service: i.service, team: i.team, caretaker: i.caretaker, status: i.status, text: statusText(i), files: i.row?.files.length ?? 0 });

/** PR18 dashboard count: items not ready to bill after their cut-off. */
export const waitingAfterCutoff = (items: PrItem[], today: string) => items.filter((i) => today.slice(0, 10) > i.cutoff && i.status !== 'READY' && i.status !== 'BILLED').length;

/** PR16 / PR17 bell items due today — key includes the day → once per item per day. */
export type PrBell = { key: string; to: 'SENDER' | 'LEAD'; type: string; text: string; tone: 'critical' | 'warning' | 'info' };
export function prBellsDue(items: PrItem[], today: string): PrBell[] {
  const t = today.slice(0, 10), day = +t.slice(8, 10), out: PrBell[] = [];
  const mk = (i: PrItem, type: string, to: PrBell['to'], text: string, tone: PrBell['tone']) => out.push({ key: `PR:${i.id}:${type}:${to}:${t}`, to, type, text: `${text} · ${i.hotel} (${i.month})`, tone });
  for (const i of items) {
    if (day === 1 && i.status === 'NOT_YET') mk(i, 'NEW_CYCLE', 'SENDER', 'รอบใหม่ · ส่ง Production Report', 'info');
    if (i.status === 'DUE_TODAY') mk(i, 'DUE', 'SENDER', 'ตัดรอบวันนี้ · ยังไม่ส่ง Production Report ให้ AC', 'warning');
    if (i.status === 'LATE') { mk(i, 'LATE', 'SENDER', `เลยตัดรอบ ${i.late_days} วัน`, 'critical'); mk(i, 'LATE', 'LEAD', `เลยตัดรอบ ${i.late_days} วัน`, 'critical'); }
    if (i.status === 'RETURNED') mk(i, 'RETURNED', 'SENDER', `AC ส่งกลับแก้: ${i.row?.return_reason ?? ''}`, 'warning');
    if (i.status === 'DISPUTE' && t > i.cutoff) { mk(i, 'DISPUTE', 'SENDER', 'ลูกค้าแย้ง · เลยตัดรอบ', 'warning'); mk(i, 'DISPUTE', 'LEAD', 'ลูกค้าแย้ง · เลยตัดรอบ', 'warning'); }
    if (i.status === 'READY' && i.auto_confirmed) mk(i, 'AUTO', 'SENDER', 'ลูกค้ายืนยัน (อัตโนมัติ)', 'info');
  }
  return out;
}

/** PR18: ready commission items → reports for the billing engine (drop wins over AC's manual report). */
export function readyDropReports(items: PrItem[]) {
  return items.filter((i) => i.status === 'READY' && i.commission_sku && i.commission_rate != null && i.row?.revenue_thb != null).map((i) => ({
    report_id: `PRD-${i.id}`, contract_id: i.contract_id, sku: i.commission_sku!, period_year: +i.month.slice(0, 4), period_month: +i.month.slice(5, 7),
    revenue_thb: i.row!.revenue_thb!, commission_thb: Math.round(i.row!.revenue_thb! * i.commission_rate! * 100) / 100,
    uploaded_by: i.service === 'ORM' ? 'ORM' : 'MARCOM', uploaded_at: i.row!.sent_ac_at!, approved_by_hotel: true,
  }));
}
/** Amber warning: AC's manual revenue for the same contract-month differs from the drop. */
export const revenueConflict = (row: PrDropRow | null) => !!row && row.ac_prev_revenue != null && row.revenue_thb != null && row.ac_prev_revenue !== row.revenue_thb && !row.ac_ack_at;
export const emptyRow = (contract_id: string, month: string): PrDropRow => ({ id: prKey(contract_id, month), contract_id, month, sent_customer_at: null, customer: null, customer_at: null, dispute_reason: null, files: [], sent_ac_at: null, revenue_thb: null, returned_at: null, return_reason: null, ac_prev_revenue: null, ac_ack_at: null, history: [] });
export { ym };
