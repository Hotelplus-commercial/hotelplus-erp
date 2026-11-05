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
  test('DEMO: one INITIAL row per main-store contract (none from SAMPLE_CONTRACTS alone), renewed RN-D7 contract skipped, RENEWAL row kept', () => {
    S.setRenewalDemo(true);
    const main = M.mainContracts().filter((x) => !x.renewal_of);
    const ini = S.renewalHistory().filter((h) => h.source === 'INITIAL');
    expect(new Set(ini.map((h) => h.contract_id))).toEqual(new Set(main.map((x) => x.contract_id)));
    expect(ini.length).toBe(main.length);
    expect(S.renewalHistory().filter((h) => h.source === 'RENEWAL')).toHaveLength(3); // RN-D7 + v1.4.1 RN52 late renewal + Commission + Guarantee
    const flat = ini.find((h) => h.contract_id === 'CT-HTL0042')!;
    expect(flat.fee_amount).toBe(30000); expect(flat.commission_pct).toBeNull();
    const comm = ini.find((h) => h.contract_id === 'CT-HTL0102')!;
    expect(comm.fee_amount).toBeNull(); expect(comm.commission_pct).toBe(8);
    S.setRenewalDemo(false);
  });
  test('DEMO: a materialised R2 contract gets its INITIAL row once', async () => {
    S.setRenewalDemo(true);
    const card = { id: 'RN-R2-O4', hotelId: 'X', hotel: 'ลานนา เฮอริเทจ', owner: 'AE001-Nont', contract_id: 'R2-O4', created_source: 'AE_EARLY' as const };
    S.startRenewal(card); await Promise.resolve(); await Promise.resolve();
    S.startRenewal(card); await Promise.resolve();
    expect(S.renewalHistory().filter((h) => h.contract_id === 'R2-O4' && h.source === 'INITIAL')).toHaveLength(M.mainContractById('R2-O4') ? 1 : 0);
    expect(M.mainContractById('R2-O4')).not.toBeNull();
    S.setRenewalDemo(false);
  });
});
