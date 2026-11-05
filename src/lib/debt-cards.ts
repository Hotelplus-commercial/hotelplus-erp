/* Debt Partner R1.1 — cards ① เกรดการชำระ A–D (DP6–DP9) and ② ลูกหนี้ที่ต้องติดตาม (DP10–DP14). Pure rules only.
 * ① paid headline = invoice status 'paid' + paid_at for the latest billing_period_start (never derived from grades).
 * ② rows = grade, collection_status, overdue_months per service contract; tickets matched by contract_id, else hotel_id + service. */
import type { L0Status, TicketType, Dept } from './tickets-l0';

export type Grade = 'A' | 'B' | 'C' | 'D';
export type Svc = 'ORM' | 'Marcom';
/** One recurring invoice of one service contract. */
export type PaidInv = { contract_id: string; hotel: string; service: Svc; ae: string | null; period: string /* YYYY-MM */; status: string; paid_at: string | null };
export type GradeRowR = { contract_id: string; hotel: string; service: Svc; ae: string | null; grade: Grade | null; lapsed?: boolean };

const d10 = (s: string) => s.slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${d10(iso)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${d10(b)}T00:00:00Z`) - Date.parse(`${d10(a)}T00:00:00Z`)) / 86400000);
const lastDay = (p: string) => { const [y, m] = p.split('-').map(Number); return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10); };
export const pct1 = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export const periodsOf = (inv: PaidInv[]) => [...new Set(inv.map((i) => i.period))].sort();
/** Paid / total contracts of one billing period as of a day (paid_at ≤ asOf). */
export function paidOn(inv: PaidInv[], period: string, asOf: string) {
  const rows = inv.filter((i) => i.period === period);
  const all = new Set(rows.map((i) => i.contract_id));
  const paid = new Set(rows.filter((i) => i.status === 'paid' && i.paid_at && d10(i.paid_at) <= d10(asOf)).map((i) => i.contract_id));
  return { paid: paid.size, total: all.size };
}
/** DP7 headline + Δ: latest period with start ≤ aTo vs latest period with start ≤ bTo at the same day-offset. */
export function paidHeadline(inv: PaidInv[], aTo: string, bTo: string | null) {
  const ps = periodsOf(inv);
  const period = ps.filter((p) => `${p}-01` <= d10(aTo)).at(-1) ?? null;
  if (!period) return null;
  const offset = daysBetween(`${period}-01`, aTo);
  const now = paidOn(inv, period, aTo);
  const prevPeriod = bTo ? ps.filter((p) => `${p}-01` <= d10(bTo) && p < period).at(-1) ?? null : null;
  let prev = null as null | { paid: number; total: number };
  if (prevPeriod) { const end = lastDay(prevPeriod); const at = addDays(`${prevPeriod}-01`, offset); prev = paidOn(inv, prevPeriod, at > end ? end : at); }
  return { period, prevPeriod, offsetDay: offset + 1, now, prev };
}
export function deltaLine(now: { paid: number; total: number }, prev: { paid: number; total: number } | null) {
  if (!prev) return null;
  const n = now.paid - prev.paid, a = pct1(prev.paid, prev.total), b = pct1(now.paid, now.total);
  const d = Math.round((b - a) * 10) / 10;
  const tail = `สัดส่วน ${a}% → ${b}% (${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}%)`;
  if (n > 0) return { tone: 'up' as const, text: `▲ เพิ่มขึ้น ${n} สัญญา · ${tail}` };
  if (n < 0) return { tone: 'down' as const, text: `▼ ลดลง ${-n} สัญญา · ${tail}` };
  return { tone: 'eq' as const, text: `= เท่าเดิม · ${tail}` };
}
export const gradeCounts = (rows: GradeRowR[]) => {
  const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) if (r.grade) c[r.grade] += 1;
  return c;
};
/** DP8 list: one row per service contract invoiced in the period, sorted by name; filter by grade (bar = chips). */
export const gradeList = (rows: GradeRowR[], g: Grade | null) =>
  rows.filter((r) => !g || r.grade === g).sort((a, b) => a.hotel.localeCompare(b.hotel) || a.contract_id.localeCompare(b.contract_id));
/** 6-period trend: % paid label + paid/total + A–D stack; the latest is open when asOf is before its last day. */
export function trend(inv: PaidInv[], gradeAt: (contract_id: string, period: string) => Grade | null, period: string, asOf: string, n = 6) {
  return periodsOf(inv).filter((p) => p <= period).slice(-n).map((p) => {
    const isLatest = p === period;
    const t = paidOn(inv, p, isLatest ? asOf : lastDay(p));
    const ids = [...new Set(inv.filter((i) => i.period === p).map((i) => i.contract_id))];
    const g: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const id of ids) { const x = gradeAt(id, p); if (x) g[x] += 1; }
    return { period: p, ...t, pct: Math.round(pct1(t.paid, t.total)), grades: g, open: isLatest && d10(asOf) < lastDay(p) };
  });
}

/* ---------- card ② ---------- */
export type DebtStatus = 'LEGAL' | 'SUSPENDED' | 'OVERDUE' | 'WRITTEN_OFF' | 'PAUSED';
export const DEBT_ORDER: DebtStatus[] = ['LEGAL', 'SUSPENDED', 'OVERDUE', 'WRITTEN_OFF', 'PAUSED'];
export const DEBT_TH: Record<DebtStatus, string> = { LEGAL: 'ส่งฟ้อง', SUSPENDED: 'ปิดระบบ', OVERDUE: 'ค้างชำระ', WRITTEN_OFF: 'ตัดสูญ', PAUSED: 'พักบริการ' };
export type DebtRowR = {
  contract_id: string; hotel_id: string; hotel: string; service: Svc; ae: string | null; grade: Grade | null;
  cycles: number; outstanding: number; status: DebtStatus;
  /** contractStateOn() = LAPSED_PENDING ("ขาดอายุ รอผล") — still a debtor while it owes money. */
  lapsed?: boolean; pause_note?: string;
};
export type TicketLite = { ticket_id: string; type: TicketType; target_dept: Dept; status: L0Status; contract_id: string | null; hotel_id: string | null; service: string | null };
const OPEN: L0Status[] = ['NEW', 'ACK', 'IN_PROGRESS'];

export const sortDebt = (rows: DebtRowR[]) => [...rows].sort((a, b) => DEBT_ORDER.indexOf(a.status) - DEBT_ORDER.indexOf(b.status) || b.outstanding - a.outstanding);
/** Match: contract_id when the ticket has one, else hotel_id + service line. */
export const ticketsOf = (r: DebtRowR, ts: TicketLite[]) =>
  ts.filter((t) => (t.contract_id ? t.contract_id === r.contract_id : t.hotel_id === r.hotel_id && (t.service ?? '').toUpperCase() === r.service.toUpperCase()));
export type PillCount = { open: number; done: number };
export function ticketCells(r: DebtRowR, ts: TicketLite[]) {
  const mine = ticketsOf(r, ts).filter((t) => t.status !== 'CANCELLED');
  const shut = mine.filter((t) => t.type === 'SYSTEM_SHUTOFF');
  const cnt = (xs: TicketLite[]): PillCount => ({ open: xs.filter((t) => OPEN.includes(t.status)).length, done: xs.filter((t) => t.status === 'DONE').length });
  const svc = cnt(shut.filter((t) => t.target_dept === 'ORM' || t.target_dept === 'MARCOM'));
  const ps = cnt(shut.filter((t) => t.target_dept === 'PS'));
  const other = mine.filter((t) => t.type !== 'SYSTEM_SHUTOFF' && OPEN.includes(t.status));
  return { shut: shut.length ? { svc, ps } : null, other };
}
export function ticketStrip(rows: DebtRowR[], ts: TicketLite[]) {
  const s = { svc: { open: 0, done: 0 }, ps: { open: 0, done: 0 }, other: 0 };
  for (const r of rows) {
    const c = ticketCells(r, ts);
    if (c.shut) { s.svc.open += c.shut.svc.open; s.svc.done += c.shut.svc.done; s.ps.open += c.shut.ps.open; s.ps.done += c.shut.ps.done; }
    s.other += c.other.length;
  }
  return s;
}
/** Headline + bar: write-off and pause excluded from the total; bar order ส่งฟ้อง → ปิดระบบ → ค้างชำระ. */
export function debtSummary(rows: DebtRowR[]) {
  const seg = (['LEGAL', 'SUSPENDED', 'OVERDUE'] as const).map((s) => {
    const xs = rows.filter((r) => r.status === s);
    return { status: s, n: xs.length, amount: xs.reduce((a, r) => a + r.outstanding, 0) };
  });
  const total = seg.reduce((a, s) => a + s.amount, 0);
  const wo = rows.filter((r) => r.status === 'WRITTEN_OFF');
  return {
    total, n: seg.reduce((a, s) => a + s.n, 0),
    segments: seg.map((s) => ({ ...s, pct: total ? Math.round((s.amount / total) * 100) : 0 })),
    writeOff: { n: wo.length, amount: wo.reduce((a, r) => a + r.outstanding, 0) },
    paused: rows.filter((r) => r.status === 'PAUSED').length,
  };
}
/** Chip / segment filter: ALL hides paused rows; PAUSED shows only paused rows. */
export const debtFilter = (rows: DebtRowR[], f: DebtStatus | null) => sortDebt(f ? rows.filter((r) => r.status === f) : rows.filter((r) => r.status !== 'PAUSED'));
