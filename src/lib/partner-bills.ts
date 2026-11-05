/* AC App Partner Bills v1.0 (AX1–AX9, AX13) — pure helpers for บิล Partner. Cost always comes from debt-partner-calc
 * (getContractSystemCost / resolveSystem); never re-implemented here. Writers live in debt-partner-store.ts. */
import { getCashbackExpected, getContractSystemCost, getDealState, monthsOver, resolveSystem, type PartnerContract } from './debt-partner-calc';
import type { PartnerBill, PartnerData, PartnerDeal, SystemCreditRequest } from './debt-partner-types';

const d10 = (s: string) => s.slice(0, 10);
const ms = (s: string) => Date.parse(`${d10(s)}T00:00:00Z`);
const dayBefore = (s: string) => new Date(ms(s) - 864e5).toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 864e5) + 1;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Calendar months of a bill period (1 Nov – 31 Jan = 3). Shorter than a month → share of 30 days. */
export function periodMonths(start: string, end: string): number {
  const m = monthsOver(dayBefore(start), end);
  return m > 0 ? m : Math.max(0, days(start, end)) / 30;
}

export type BillLineDraft = { contract_id: string; hotel: string; allotment: number | null; expected: number; amount: number; currency: string; fallback: boolean };

/** True when the contract's system (contract override → property row) is this Partner on any day of the period. */
function onPartner(data: PartnerData, c: PartnerContract, partnerId: string, start: string, end: string): string | null {
  const dates = [d10(start), ...data.property_partner_system.filter((r) => r.property_id === c.property_id && d10(r.effective_from) > d10(start) && d10(r.effective_from) <= d10(end)).map((r) => d10(r.effective_from))];
  return dates.find((d) => resolveSystem(data, c, d)?.partner_id === partnerId) ?? null;
}

/** Expected Partner cost of one contract for a period: monthly net × months; prorated by day when the contract starts
 *  inside the period. Contract end inside the period is not prorated: the Partner bills the whole prepaid period and
 *  the months after the end become a keep-credit (DebtPartner ⑤). */
export function expectedLine(data: PartnerData, c: PartnerContract, partnerId: string, start: string, end: string): BillLineDraft | null {
  if (c.service !== 'ORM') return null;
  if (c.start && d10(c.start) > d10(end)) return null;
  if (c.end && d10(c.end) < d10(start)) return null;
  const on = onPartner(data, c, partnerId, start, end); if (!on) return null;
  const cost = getContractSystemCost(data, c, on); if (!cost || cost.partner_id !== partnerId) return null;
  let v = cost.net * periodMonths(start, end);
  if (c.start && d10(c.start) > d10(start)) v *= days(c.start, end) / days(start, end);
  const sys = resolveSystem(data, c, on);
  const e = r2(v);
  return { contract_id: c.contract_id, hotel: c.hotel, allotment: sys?.allotment ?? null, expected: e, amount: e, currency: cost.currency, fallback: cost.fallback_tier };
}

/** AX6 pre-fill: one line per ORM contract on this Partner's system in the period. */
export function prefillLines(data: PartnerData, contracts: PartnerContract[], partnerId: string, start: string, end: string): BillLineDraft[] {
  if (!partnerId || !start || !end || d10(end) < d10(start)) return [];
  return contracts.map((c) => expectedLine(data, c, partnerId, start, end)).filter((x): x is BillLineDraft => !!x);
}

/** AX7: Σ ยอดตามบิล vs total vs Σ expected. */
export function billCheck(lines: Pick<BillLineDraft, 'contract_id' | 'expected' | 'amount'>[], total: number) {
  const sumLines = r2(lines.reduce((s, l) => s + l.amount, 0));
  const sumExpected = r2(lines.reduce((s, l) => s + l.expected, 0));
  const diff = r2(total - sumExpected);
  const differing = lines.filter((l) => Math.abs(l.amount - l.expected) > 0.005);
  return { sumLines, sumExpected, diff, differing, ok: Math.abs(diff) < 0.005 && Math.abs(sumLines - total) < 0.005 && !differing.length };
}

/** AX9: remaining = approved − Σ usage of non-VOID bills (pending bills reserve their credit). `exceptBill` = the bill being edited. */
export function creditRemaining(data: PartnerData, r: SystemCreditRequest, exceptBill?: string): number {
  const approved = r.approved_amount ?? r.amount;
  const voided = new Set(data.partner_bills.filter((b) => b.status === 'VOID').map((b) => b.id));
  const used = data.system_credit_usage.filter((u) => u.credit_request_id === r.id && !(u.bill_id && voided.has(u.bill_id)) && (!exceptBill || u.bill_id !== exceptBill)).reduce((s, u) => s + u.amount, 0);
  return r2(approved - used);
}
/** Credits AC may use on a bill of this Partner dated `on`: APPROVED, same Partner, not expired, balance > 0. */
export function usableCredits(data: PartnerData, partnerId: string, on: string, exceptBill?: string) {
  return data.system_credit_requests
    .filter((r) => r.status === 'APPROVED' && r.partner_id === partnerId && (!r.credit_expires_at || d10(r.credit_expires_at) >= d10(on)))
    .map((r) => ({ req: r, remaining: creditRemaining(data, r, exceptBill) })).filter((x) => x.remaining > 0.005);
}
export type CreditUseDraft = { credit_request_id: string; amount: number };
export function creditUseError(data: PartnerData, partnerId: string, billDate: string, total: number, uses: CreditUseDraft[], exceptBill?: string): string | null {
  const ok = new Map(usableCredits(data, partnerId, billDate, exceptBill).map((x) => [x.req.id, x.remaining]));
  let sum = 0;
  for (const u of uses) {
    if (!(u.amount > 0)) return 'ใส่ยอดเครดิตที่ใช้';
    const rem = ok.get(u.credit_request_id);
    if (rem == null) return 'เครดิตนี้ใช้ไม่ได้ (ต้องอนุมัติแล้ว · Partner เดียวกัน · ยังไม่หมดอายุ)';
    if (u.amount > rem + 0.005) return 'ยอดเครดิตเกินยอดคงเหลือ';
    sum += u.amount;
  }
  if (sum > total + 0.005) return 'ยอดเครดิตรวมเกินยอดบิล';
  return null;
}
export const creditUsedOn = (data: PartnerData, billId: string) => r2(data.system_credit_usage.filter((u) => u.bill_id === billId).reduce((s, u) => s + u.amount, 0));

export type BillView = 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';
export const billView = (b: PartnerBill, today: string): BillView => (b.status === 'PENDING' && d10(b.due_date) < d10(today) ? 'OVERDUE' : b.status);
export const BILL_VIEW_TH: Record<BillView, string> = { PENDING: 'รอจ่าย', PAID: 'จ่ายแล้ว', OVERDUE: 'เลยกำหนด', VOID: 'ยกเลิก' };

/** §2.3 tiles: bills dated in the month of `today`, per currency (THB first). VOID excluded. */
export function billTiles(data: PartnerData, today: string) {
  const ym = d10(today).slice(0, 7);
  const bills = data.partner_bills.filter((b) => b.status !== 'VOID' && d10(b.bill_date).slice(0, 7) === ym);
  const add = (m: Record<string, number>, c: string, v: number) => { m[c] = r2((m[c] ?? 0) + v); };
  const total: Record<string, number> = {}, paid: Record<string, number> = {}, pending: Record<string, number> = {}, overdue: Record<string, number> = {};
  for (const b of bills) {
    add(total, b.currency, b.total);
    const v = billView(b, today);
    add(v === 'PAID' ? paid : v === 'OVERDUE' ? overdue : pending, b.currency, b.total);
  }
  return { bills, total, paid, pending, overdue };
}
/** Per-currency amounts → [currency, value][] with THB first. */
export const byCurrency = (m: Record<string, number>) => Object.entries(m).sort(([a], [b]) => (a === 'THB' ? -1 : b === 'THB' ? 1 : a.localeCompare(b)));

/** Amber line: Partners with active ORM contracts on their system today but no bill dated this month. */
export function missingBillPartners(data: PartnerData, contracts: PartnerContract[], today: string): string[] {
  const ym = d10(today).slice(0, 7);
  const billed = new Set(data.partner_bills.filter((b) => b.status !== 'VOID' && d10(b.bill_date).slice(0, 7) === ym).map((b) => b.partner_id));
  const active = new Set<string>();
  for (const c of contracts) {
    if (c.service !== 'ORM' || (c.start && d10(c.start) > d10(today)) || (c.end && d10(c.end) < d10(today))) continue;
    const s = resolveSystem(data, c, today); if (s) active.add(s.partner_id);
  }
  return data.partners.filter((p) => active.has(p.id) && !billed.has(p.id)).map((p) => p.name);
}

/** §3 Cashback blocks: SUCCESS deals with benefit CASHBACK_PER_CONTRACT. Rows use the same eligibility as PS Dashboard ④. */
export function cashbackBlocks(data: PartnerData, contracts: PartnerContract[], today: string) {
  return data.partner_deals.filter((d) => d.benefit_type === 'CASHBACK_PER_CONTRACT' && d.status === 'SUCCESS').map((deal) => {
    const sum = getCashbackExpected(data, deal, contracts);
    const on = new Set(data.contract_partner_system.filter((s) => s.partner_id === deal.partner_id).map((s) => s.contract_id));
    const rows = contracts.filter((c) => c.service === 'ORM' && on.has(c.contract_id) && c.start && (!deal.start_date || d10(c.start) >= d10(deal.start_date)) && (!deal.end_date || d10(c.start) <= d10(deal.end_date)) && (deal.scope === 'ALL' || deal.contract_ids.includes(c.contract_id)))
      .map((c) => ({ c, receipt: data.partner_cashback_receipts.find((r) => r.deal_id === deal.id && r.contract_id === c.contract_id) ?? null }));
    return { deal, partner: data.partners.find((p) => p.id === deal.partner_id)?.name ?? deal.partner_id, state: getDealState(deal, today), sum, rows };
  });
}
export const dealPeriodText = (d: Pick<PartnerDeal, 'start_date' | 'end_date'>, fmt: (s: string) => string) =>
  `${d.start_date ? fmt(d.start_date) : '—'} – ${d.end_date ? fmt(d.end_date) : 'ไม่มีกำหนด'}`;

export const money = (v: number, cur: string) => (cur === 'THB' ? `฿${Math.round(v).toLocaleString('en-US')}` : `${cur} ${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
export const dmy = (iso: string | null | undefined) => (iso ? new Date(`${d10(iso)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }) : '—');
