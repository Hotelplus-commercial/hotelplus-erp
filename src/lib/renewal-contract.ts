/* Contract Renewal v1.3 §2/§3 (wired by R2.1 §1.5) — pure builders for the main contract store (AccountingData.contracts).
 * The AC Billing engine is not touched: Billing prices a period from whichever contract is ACTIVE on the billing date. */
import type { Contract, ContractLine } from './crm-types';
import type { RenewalRequest, Terms } from './renewal-rules';

type Svc = 'ORM' | 'Marcom';
/** Minimal source shape (same fields as renewal-store SourceContract). */
export type SourceLike = { contract_id: string; hotel_id: string; customer_id: string; legal_entity: string; signatory: string; kyc_docs: string[]; terms: Terms; service?: Svc };

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const svcOfPackage = (pkg: string): Svc => (/^marcom/i.test(pkg) ? 'Marcom' : 'ORM');
const lineSvc = (l: ContractLine): Svc => (/^ORM/i.test(l.sku_snapshot) ? 'ORM' : 'Marcom');
/** Existing product SKUs only (crm-products); the prefix is what Billing's serviceOf() reads. */
export function skuForPackage(pkg: string): string {
  if (svcOfPackage(pkg) === 'Marcom') return 'MARCOM-MTH-META';
  return /lite|commission/i.test(pkg) ? 'ORM-MTH-LITE' : 'ORM-MTH-FULL';
}

/** Seed / DEMO only: a main-store contract record built from a renewal-module source contract (v1.3 §2 "seed data written into the main store").
 * Fields the source does not hold stay empty (tax_id, address, contact, hotel_name, template). */
export function contractFromSource(src: SourceLike, createdAt: string): Contract {
  const fee = src.terms.fee_amount; const comm = src.terms.commission_pct;
  return {
    contract_id: src.contract_id, ...(src.hotel_id ? { hotel_id: src.hotel_id } : {}), from_quote_id: '', billing_status: 'ACTIVE', inactivated_at: null,
    customer_snapshot: { customer_id: src.customer_id, legal_name: src.legal_entity, type: 'juristic', tax_id: '', address: '', signer_name: src.signatory, contact_phone: '', contact_email: '', hotel_name: '' },
    template_snapshot: { template_id: '', version: '', body_url: '' },
    lines: [{ line_id: `${src.contract_id}-L1`, sku_snapshot: skuForPackage(src.terms.package), name_snapshot: src.terms.package, package_snapshot: null, billing: 'monthly', unit_price: fee > 0 ? fee : null, commission_rate: comm > 0 ? Math.round(comm * 100) / 10000 : null, quantity: 1 }],
    monthly_value: fee, start_date: src.terms.start_date, duration_months: src.terms.term_months, status: 'contract_completed', case_number: null,
    signing_type: 'juristic', documents: [...src.kyc_docs], live_link_signed_at: null, created_at: createdAt, created_by: 'seed:renewal',
  };
}

export type RenewedOut = { ok: true; contract: Contract; unmapped: string[] } | { ok: false; error: string };
/** v1.3 §3.1: the new contract built from the source contract with new_terms applied. Source contract is never changed. */
export function buildRenewedContract(base: Contract, req: RenewalRequest): RenewedOut {
  const svc = svcOfPackage(req.old_terms.package);
  const id = req.new_contract_id; if (!id) return { ok: false, error: 'ไม่มีเลขสัญญาใหม่' };
  const kept = base.lines.filter((l) => l.billing === 'monthly' && lineSvc(l) === svc);
  if (!kept.length) return { ok: false, error: `สัญญาต้นทาง ${base.contract_id} ไม่มีรายการรายเดือนของ ${svc}` };
  const t = req.new_terms; const unmapped: string[] = [];
  const oldSum = kept.reduce((s, l) => s + (l.unit_price ?? 0) * (l.quantity || 1), 0);
  // fee → unit_price: one line takes the fee; several lines keep their proportion (last line absorbs rounding)
  let left = t.fee_amount;
  const lines = kept.map((l, i): ContractLine => {
    const q = l.quantity || 1; const last = i === kept.length - 1;
    const share = last ? left : oldSum > 0 ? Math.round((t.fee_amount * ((l.unit_price ?? 0) * q)) / oldSum) : i === 0 ? t.fee_amount : 0;
    left -= share;
    const unit = share > 0 ? Math.round((share / q) * 100) / 100 : null;
    const hadComm = l.commission_rate != null;
    const commission_rate = hadComm || (i === 0 && t.commission_pct > 0) ? (t.commission_pct > 0 ? Math.round(t.commission_pct * 100) / 10000 : null) : null;
    return { ...l, line_id: `${id}-${l.line_id}`, unit_price: unit, commission_rate };
  });
  // service package unchanged (O-26): sku / name / package snapshots stay as on the source contract.
  // COMMISSION_GUARANTEE: fee_amount = 0 → unit_price null (commission-only line; the engine bills commission from the report).
  if (t.package !== req.old_terms.package) unmapped.push('service package unchanged (O-26)');
  if (base.lines.some((l) => l.billing !== 'monthly' && lineSvc(l) === svc)) unmapped.push('one_time lines (ค่าติดตั้งไม่ยกไปสัญญาใหม่)');
  const contract: Contract = {
    ...base, contract_id: id, lines, monthly_value: lines.reduce((s, l) => s + (l.unit_price ?? 0) * (l.quantity || 1), 0),
    start_date: addDays(req.old_terms.end_date, 1), duration_months: t.term_months,
    status: 'contract_completed', billing_status: 'ACTIVE', inactivated_at: null,
    live_link_signed_at: req.signed_at, created_at: req.signed_at ?? req.updated_at, created_by: `renewal:${req.id}`,
    renewal_of: base.contract_id, renewal_request_id: req.id,
    // v1.4.1 RN41: billing model + guarantee from new_terms (absent on terms stored before v1.4 → field left out = unknown)
    ...(t.billing_model ? { billing_model: t.billing_model, guarantee_fee: t.billing_model === 'COMMISSION_GUARANTEE' ? t.guarantee_fee ?? null : null } : {}),
  };
  return { ok: true, contract, unmapped };
}
