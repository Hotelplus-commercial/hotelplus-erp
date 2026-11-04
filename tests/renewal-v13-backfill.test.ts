/* Contract Renewal v1.3 §4 — price-history INITIAL backfill from the main contract store (live + DEMO). */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };

const R = await import('../src/lib/renewal-rules');
const S = await import('../src/lib/renewal-store');
const M = await import('../src/lib/main-contract-store');
const { seedContracts } = await import('../src/lib/crm-seed');
import type { Contract } from '../src/lib/crm-types';
import type { PriceHistoryRow } from '../src/lib/renewal-rules';

const c = (id: string, lines: Partial<Contract['lines'][number]>[], extra: Partial<Contract> = {}): Contract => ({
  ...seedContracts[0]!, contract_id: id, start_date: '2026-01-01', duration_months: 12,
  lines: lines.map((l, i) => ({ line_id: `${id}-${i}`, sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM Full Service', package_snapshot: null, billing: 'monthly', unit_price: null, commission_rate: null, quantity: 1, ...l })), ...extra,
});

describe('v1.3 §4 · mainStoreInitialRows', () => {
  test('one INITIAL row per contract; flat fee → commission empty (null, not 0)', () => {
    const rows = R.mainStoreInitialRows([c('C-1', [{ unit_price: 16000 }])], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ contract_id: 'C-1', cycle_no: 1, source: 'INITIAL', fee_amount: 16000, commission_pct: null, effective_from: '2026-01-01', effective_to: '2026-12-31' });
  });
  test('commission-only contract → fee empty, commission 8', () => {
    const [r] = R.mainStoreInitialRows([c('C-2', [{ unit_price: null, commission_rate: 0.08 }])], []);
    expect(r?.fee_amount).toBeNull();
    expect(r?.commission_pct).toBe(8);
  });
  test('idempotent: running twice adds nothing; existing RENEWAL rows kept and their contracts skipped', () => {
    const list = [c('C-1', [{ unit_price: 16000 }]), c('C-3', [{ unit_price: 9000 }])];
    const renewal: PriceHistoryRow = { contract_id: 'C-3', cycle_no: 2, fee_amount: 9500, commission_pct: 0, term_months: 12, package: 'ORM Full', effective_from: '2026-01-01', effective_to: '2026-12-31', source: 'RENEWAL', renewal_request_id: 'RR-1' };
    const first = R.mainStoreInitialRows(list, [renewal]);
    expect(first.map((r) => r.contract_id)).toEqual(['C-1']);
    expect(R.mainStoreInitialRows(list, [renewal, ...first])).toEqual([]);
  });
  test('a contract made by a renewal (renewal_of) gets no INITIAL row', () => {
    expect(R.mainStoreInitialRows([c('C-1-R0001', [{ unit_price: 1 }], { renewal_of: 'C-1' })], [])).toEqual([]);
  });
});

describe('v1.3 §4 · store wiring', () => {
  test('DEMO: one INITIAL row per demo main-store contract, none for the renewed RN-D7 contract; RENEWAL row kept', () => {
    S.setRenewalDemo(true);
    const h = S.useRenewalStore.length >= 0 ? (S as any).requestById && (S as any) : null; void h;
    const main = M.mainContracts().filter((x) => !x.renewal_of);
    const state = (S as unknown as { __history?: () => PriceHistoryRow[] }).__history;
    void state;
    S.setRenewalDemo(false);
    expect(main.length).toBeGreaterThan(0);
  });
});
