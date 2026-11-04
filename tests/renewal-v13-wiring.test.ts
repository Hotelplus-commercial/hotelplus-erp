/* R2.1 §1.5 — Contract Renewal v1.3 §2/§3 wiring: one contract store, new contract on SIGNED, Billing engine unchanged. */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const LS = (globalThis as any).localStorage as Storage;

const S = await import('../src/lib/renewal-store');
const M = await import('../src/lib/main-contract-store');
const { runDailyBilling } = await import('../src/lib/ac-v2-engine');
const { seedContracts, seedProducts } = await import('../src/lib/crm-seed');
import type { Contract, Invoice, ProductionReport } from '../src/lib/crm-types';

const CRM = 'hotelplus-crm-v1';
const toLinkSent = (id: string) => {
  for (const role of ['PM', 'HOC', 'MD'] as const) { if (S.requestById(id)?.status !== 'PENDING_APPROVAL') break; S.approveRequest(id, `${role}001`, role); }
  return S.createAndSendLink(id);
};
const report = (contract_id: string, sku: string, y: number, m: number): ProductionReport => ({ report_id: `PR-${contract_id}-${m}`, contract_id, sku, period_year: y, period_month: m, revenue_thb: 0, commission_thb: 0, uploaded_by: 'ORM', uploaded_at: '2026-10-01T00:00:00Z', approved_by_hotel: true });

describe('v1.3 §2 · one contract store (DEMO)', () => {
  test('bundled renewal contracts live in the demo contract state; the resolver finds them there by id', () => {
    S.setRenewalDemo(true);
    expect(M.mainContractById('CT-HTL0042')?.lines[0]?.unit_price).toBe(30000);
    const r = S.resolveSourceContract({ id: 'RN-1', hotelId: 'HTL0042', contractEnd: '24 Sep 2026' });
    expect(r.ok && r.via).toBe('MAIN_ID');
    expect(r.ok && r.contract.contract_id).toBe('CT-HTL0042');
    expect(r.ok && r.contract.terms.end_date).toBe('2026-09-24');
    S.setRenewalDemo(false);
    expect(M.isMainContractDemo()).toBe(false);
  });
});

describe('v1.3 §3 · on SIGNED → new contract in the main store', () => {
  test('demo sign (RN-D4 ลานนา เฮอริเทจ): new contract start = old end + 1, unit_price = new fee, source unchanged', () => {
    S.setRenewalDemo(true);
    const before = JSON.stringify(M.mainContractById('CT-HTL0118'));
    const req = S.latestRequestFor('RN-D4')!;
    expect(toLinkSent(req.id).ok).toBe(true);
    const o = S.signRequest(req.id);
    expect(o.ok).toBe(true);
    const id = o.ok ? o.req.new_contract_id! : '';
    const nc = M.mainContractById(id)!;
    expect(nc.start_date).toBe('2026-11-01');
    expect(nc.duration_months).toBe(12);
    expect(nc.lines[0]?.unit_price).toBe(o.ok ? o.req.new_terms.fee_amount : -1);
    expect(nc.lines[0]?.unit_price).not.toBe(25000);
    expect(nc.renewal_of).toBe('CT-HTL0118');
    expect(JSON.stringify(M.mainContractById('CT-HTL0118'))).toBe(before);
    S.setRenewalDemo(false);
  });
  test('demo bill: before the new start Billing uses the old fee, after it the new fee (engine unchanged)', () => {
    S.setRenewalDemo(true);
    const req = S.latestRequestFor('RN-D4')!; toLinkSent(req.id); const o = S.signRequest(req.id);
    const newId = o.ok ? o.req.new_contract_id! : ''; const newFee = o.ok ? o.req.new_terms.fee_amount : 0;
    const base = M.demoAccountingData();
    const old = M.mainContractById('CT-HTL0118')!; const sku = old.lines[0]!.sku_snapshot;
    const prior = { invoice_id: 'INV-PRIOR', invoice_type: 'RECURRING', contract_ids: ['CT-HTL0118'], customer_snapshot: old.customer_snapshot, status: 'paid', lines: [], totals: { subtotal: 0, vat: 0, wht: 0, total: 0 }, billing_period_start: '2026-09-01', billing_period_end: '2026-09-30' } as unknown as Invoice;
    const data = { ...base, invoices: [prior], reports: [report('CT-HTL0118', sku, 2026, 10), report(newId, sku, 2026, 11)] };
    const bill = (t: string, cid: string) => runDailyBilling(data, t).invoices.find((i) => i.contract_ids.includes(cid) && i.billing_period_start.startsWith(t.slice(0, 7)));
    expect(bill('2026-10-05', 'CT-HTL0118')?.lines[0]?.unit_price).toBe(25000);
    expect(bill('2026-10-05', newId)).toBeUndefined();
    expect(bill('2026-11-05', newId)?.lines[0]?.unit_price).toBe(newFee);
    expect(bill('2026-11-05', 'CT-HTL0118')).toBeUndefined();
    S.setRenewalDemo(false);
  });
  test('the seeded signed demo case (RN-D7) already has its new contract in the demo state', () => {
    S.setRenewalDemo(true);
    const r7 = S.latestRequestFor('RN-D7')!;
    expect(M.mainContractById(r7.new_contract_id!)?.renewal_of).toBe('CT-HTL0137');
    S.setRenewalDemo(false);
  });
  test('live: the Wizard reads a CRM contract; signing adds exactly one new contract to the CRM store', () => {
    S.setRenewalDemo(false);
    const live: Contract = { ...seedContracts[0]!, contract_id: 'C-LIVE-9001', hotel_id: 'HTL9001', start_date: '2025-12-01', duration_months: 12, status: 'contract_completed' };
    LS.setItem(CRM, JSON.stringify({ products: seedProducts, contracts: [live, ...seedContracts] }));
    expect(S.sourceContractById('C-LIVE-9001', 'ORM')?.terms.fee_amount).toBe(16000);
    const o = S.startRenewal({ id: 'RN-C-LIVE-9001', hotelId: 'HTL9001', hotel: 'Live Hotel', owner: 'AE001-Nont', contract_id: 'C-LIVE-9001', service: 'ORM' });
    expect(o.ok).toBe(true);
    const id = o.ok ? o.req.id : '';
    expect(toLinkSent(id).ok).toBe(true);
    const s = S.signRequest(id);
    expect(s.ok).toBe(true);
    const list = (JSON.parse(LS.getItem(CRM)!) as { contracts: Contract[] }).contracts;
    expect(list.length).toBe(seedContracts.length + 2);
    const nc = list.find((c) => c.renewal_request_id === id)!;
    expect(nc.start_date).toBe('2026-12-01');
    expect(nc.lines.every((l) => l.billing === 'monthly' && l.sku_snapshot.startsWith('ORM'))).toBe(true);
    expect(JSON.stringify(list.find((c) => c.contract_id === 'C-LIVE-9001'))).toBe(JSON.stringify(live));
  });
  test('live: when the new contract cannot be saved, the request does not move to SIGNED', () => {
    S.setRenewalDemo(false);
    const live: Contract = { ...seedContracts[0]!, contract_id: 'C-LIVE-9002', hotel_id: 'HTL9002', start_date: '2025-12-01', duration_months: 12, status: 'contract_completed' };
    LS.setItem(CRM, JSON.stringify({ products: seedProducts, contracts: [live] }));
    const o = S.startRenewal({ id: 'RN-C-LIVE-9002', hotelId: 'HTL9002', hotel: 'Live Hotel 2', owner: 'AE001-Nont', contract_id: 'C-LIVE-9002', service: 'ORM' });
    const id = o.ok ? o.req.id : '';
    toLinkSent(id);
    const set = LS.setItem.bind(LS);
    (LS as any).setItem = (k: string, v: string) => { if (k === CRM) throw new Error('quota'); set(k, v); };
    const s = S.signRequest(id);
    (LS as any).setItem = set;
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.error.startsWith('ลงนามไม่สำเร็จ')).toBe(true);
    expect(S.requestById(id)?.status).toBe('LINK_SENT');
    expect((JSON.parse(LS.getItem(CRM)!) as { contracts: Contract[] }).contracts.length).toBe(1);
  });
});
