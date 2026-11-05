/* Contract Renewal v1.4 §1 — fee-average helper (RP139). READ ONLY: never writes contracts, invoices, reports or price history.
 * Pure core = feeAverageFrom(); getContractFeeAverage(contractId, asOfDate) reads the sources:
 * - live: main contract store (CRM browser store, monthly lines) + AC recurring invoices + Production Reports of that store;
 * - DEMO: the v1.4 demo additions (renewal-offer-demo.ts), which hold the billing model / guarantee the contract record cannot.
 * Missing data → the fields that exist + insufficient: true (never invented). */
import type { BillingModel, FeeAverage } from './renewalOffer';
import type { PriceHistoryRow } from './renewal-rules';
import type { Contract, Invoice, ProductionReport } from './crm-types';
import { mainContractById } from './main-contract-store';
import { v14DemoFeeSource } from './renewal-offer-demo';

/** One billed month of one contract (AC recurring). commission = commission actually computed (before the guarantee rule). */
export type RecurringMonth = { month: string; billed: number; commission: number | null; guarantee_applied: boolean; revenue_base: number | null };
export type FeeSource = {
  contract_id: string; model: BillingModel | null; fixed_fee: number | null; commission_pct: number | null; guarantee_fee: number | null;
  start: string | null; months: RecurringMonth[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Latest price-history row whose fee / commission differs from the row before it; else the contract start. */
export function lastPriceChange(rows: PriceHistoryRow[], contractId: string, start: string | null): string | null {
  const list = rows.filter((r) => r.contract_id === contractId).sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  for (let i = list.length - 1; i > 0; i--) {
    const a = list[i]!, b = list[i - 1]!;
    if (a.fee_amount !== b.fee_amount || a.commission_pct !== b.commission_pct) return a.effective_from;
  }
  return start ?? list[0]?.effective_from ?? null;
}

/** Pure §1. `window` = fee_average_months (config). */
export function feeAverageFrom(src: FeeSource, asOfDate: string, window: number, history: PriceHistoryRow[] = []): FeeAverage {
  const life = src.months.filter((m) => `${m.month}-01` < asOfDate.slice(0, 10)).sort((a, b) => b.month.localeCompare(a.month));
  const used = life.slice(0, Math.max(1, window));
  const m = src.model; const missing: string[] = [];
  const needFixed = m === 'FLAT' || m === 'FIXED_PLUS_COMMISSION'; const needComm = m === 'FIXED_PLUS_COMMISSION' || m === 'COMMISSION_GUARANTEE';
  const avgComm = needComm ? mean(used.map((x) => x.commission).filter((x): x is number => x != null)) : null;
  const bases = used.map((x) => x.revenue_base).filter((x): x is number => x != null);
  if (!m) missing.push('model');
  if (!used.length) missing.push('recurring');
  if (needFixed && src.fixed_fee == null) missing.push('fee');
  if (needComm && src.commission_pct == null) missing.push('commission');
  if (m === 'COMMISSION_GUARANTEE' && src.guarantee_fee == null) missing.push('guarantee');
  if (needComm && used.length && avgComm == null) missing.push('recurring');
  return {
    contract_id: src.contract_id, model: m, months_used: used.length,
    fixed_fee: needFixed ? src.fixed_fee : null, commission_pct: needComm ? src.commission_pct : null, guarantee_fee: m === 'COMMISSION_GUARANTEE' ? src.guarantee_fee : null,
    avg_commission: avgComm,
    avg_billed: !used.length ? null : m === 'FLAT' ? src.fixed_fee : mean(used.map((x) => x.billed)),
    guarantee_months: m === 'COMMISSION_GUARANTEE' && life.length ? life.filter((x) => x.guarantee_applied).length : null,
    total_months: m === 'COMMISSION_GUARANTEE' && life.length ? life.length : null,
    avg_revenue_base: bases.length ? mean(bases) : null,
    last_price_change: lastPriceChange(history, src.contract_id, src.start),
    insufficient: missing.length > 0, missing: [...new Set(missing)],
  };
}

/* ---------- live source: main contract store + AC recurring (CRM browser store), read only ---------- */
type Svc = 'ORM' | 'Marcom';
const lineSvc = (sku: string): Svc => (/^ORM/i.test(sku) ? 'ORM' : 'Marcom');
/** Billing model from the contract's monthly lines (no stored field exists). Commission without a fixed fee has no guarantee field → null. */
export function modelFromLines(c: Pick<Contract, 'lines'>, svc: Svc): { model: BillingModel | null; fixed: number | null; pct: number | null } {
  const lines = c.lines.filter((l) => l.billing === 'monthly' && lineSvc(l.sku_snapshot) === svc);
  const priced = lines.filter((l) => l.unit_price != null && l.unit_price > 0);
  const fixed = priced.length ? priced.reduce((s, l) => s + (l.unit_price ?? 0) * (l.quantity || 1), 0) : null;
  const rate = lines.find((l) => l.commission_rate != null)?.commission_rate;
  const pct = rate == null ? null : Math.round(rate * 10000) / 100;
  return { model: fixed != null && pct == null ? 'FLAT' : fixed != null ? 'FIXED_PLUS_COMMISSION' : null, fixed, pct };
}
function readCrm(): { invoices: Invoice[]; reports: ProductionReport[] } {
  try {
    if (typeof localStorage === 'undefined') return { invoices: [], reports: [] };
    const p = JSON.parse(localStorage.getItem('hotelplus-crm-v1') ?? 'null') as { invoices?: Invoice[]; reports?: ProductionReport[] } | null;
    return { invoices: Array.isArray(p?.invoices) ? p!.invoices! : [], reports: Array.isArray(p?.reports) ? p!.reports! : [] };
  } catch { return { invoices: [], reports: [] }; }
}
/** AC recurring invoices of one contract + service → billed months (pre-VAT subtotal of that service's lines; guarantee flag only if the line carries one). */
export function recurringMonthsFrom(invoices: Invoice[], reports: ProductionReport[], contractId: string, svc: Svc): RecurringMonth[] {
  const byMonth = new Map<string, RecurringMonth>();
  for (const i of invoices) {
    if (!i.contract_ids.includes(contractId) || ['draft', 'void'].includes(i.status) || (i.invoice_type && i.invoice_type !== 'RECURRING')) continue;
    const lines = i.lines.filter((l) => l.contract_id === contractId && lineSvc(l.sku_snapshot) === svc && l.line_type !== 'setup');
    if (!lines.length) continue;
    const month = i.billing_period_start.slice(0, 7);
    const comm = lines.filter((l) => l.line_type === 'commission').reduce((s, l) => s + l.amount, 0);
    const hasComm = lines.some((l) => l.line_type === 'commission');
    const rep = reports.find((r) => r.contract_id === contractId && lineSvc(r.sku) === svc && `${r.period_year}-${String(r.period_month).padStart(2, '0')}` === month);
    const prev = byMonth.get(month);
    byMonth.set(month, {
      month, billed: (prev?.billed ?? 0) + lines.reduce((s, l) => s + l.amount, 0),
      commission: hasComm ? (prev?.commission ?? 0) + comm : prev?.commission ?? null,
      guarantee_applied: !!prev?.guarantee_applied || lines.some((l) => (l as { guarantee_applied?: boolean }).guarantee_applied === true),
      revenue_base: rep ? rep.revenue_thb : prev?.revenue_base ?? null,
    });
  }
  return [...byMonth.values()];
}
export function liveFeeSource(contractId: string, svc: Svc): FeeSource | null {
  const c = mainContractById(contractId); if (!c) return null;
  const { model, fixed, pct } = modelFromLines(c, svc);
  const { invoices, reports } = readCrm();
  return { contract_id: contractId, model, fixed_fee: fixed, commission_pct: pct, guarantee_fee: null, start: c.start_date?.slice(0, 10) ?? null, months: recurringMonthsFrom(invoices, reports, contractId, svc) };
}

/** §1 store-backed helper (signature from the patch). `opts.demo` picks the DEMO additions; window from config. */
export function getContractFeeAverage(contractId: string, asOfDate: string, opts: { demo: boolean; service: Svc; window: number; history?: PriceHistoryRow[] }): FeeAverage {
  const src = opts.demo ? v14DemoFeeSource(contractId) ?? liveFeeSourceDemo(contractId, opts.service) : liveFeeSource(contractId, opts.service);
  return feeAverageFrom(src ?? { contract_id: contractId, model: null, fixed_fee: null, commission_pct: null, guarantee_fee: null, start: null, months: [] }, asOfDate, opts.window, opts.history ?? []);
}
/** DEMO contracts without v1.4 recurring additions: the demo contract record's lines, no billed months (→ insufficient). */
function liveFeeSourceDemo(contractId: string, svc: Svc): FeeSource | null {
  const c = mainContractById(contractId); if (!c) return null;
  const { model, fixed, pct } = modelFromLines(c, svc);
  return { contract_id: contractId, model, fixed_fee: fixed, commission_pct: pct, guarantee_fee: null, start: c.start_date?.slice(0, 10) ?? null, months: [] };
}
