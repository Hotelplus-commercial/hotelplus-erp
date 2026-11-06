/* AC-G1 DEMO (DF2) — three commission + Guarantee example contracts, DEMO only, in memory, never written.
 * The invoices come from the real runDailyBilling() (no forked rule). DEMO sample prices. */
import type { AccountingData } from './ac-v2-engine';
import { runDailyBilling } from './ac-v2-engine';
import type { Contract, Invoice, ProductionReport } from './crm-types';
import { seedContracts } from './crm-seed';

/** Billing period of the examples (Sep 2026) and the DEMO run date after the 3 Oct drop deadline. */
export const G_DEMO_PERIOD = '2026-09-01';
export const G_DEMO_RUN_DAY = '2026-10-05';
const GUARANTEE = 10_000;

const CASES = [
  { id: 'G-DEMO-1', hotel: 'DEMO · ค่าคอมสูงกว่า Guarantee', commission: 12_000 as number | null },
  { id: 'G-DEMO-2', hotel: 'DEMO · ค่าคอมต่ำกว่า Guarantee', commission: 8_000 as number | null },
  { id: 'G-DEMO-3', hotel: 'DEMO · ไม่มี Production Report', commission: null as number | null },
];

function contractOf(id: string, hotel: string): Contract {
  const t = seedContracts[0]!;
  return {
    ...t, contract_id: id, status: 'contract_completed', start_date: '2026-01-01', duration_months: 24, billing_status: 'ACTIVE',
    billing_model: 'COMMISSION_GUARANTEE', guarantee_fee: GUARANTEE,
    customer_snapshot: { ...t.customer_snapshot, hotel_name: hotel },
    lines: [{ line_id: `${id}-l1`, sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM Commission', package_snapshot: null, billing: 'monthly', unit_price: null, commission_rate: 0.1, quantity: 1 }],
  } as Contract;
}

export type GuaranteeDemoRow = { contract_id: string; hotel: string; invoice: Invoice | null };

export function guaranteeDemoInvoices(): GuaranteeDemoRow[] {
  const contracts = CASES.map((c) => contractOf(c.id, c.hotel));
  const reports: ProductionReport[] = CASES.filter((c) => c.commission != null).map((c) => ({
    report_id: `PR-${c.id}`, contract_id: c.id, sku: 'ORM-MTH-FULL', period_year: 2026, period_month: 9,
    revenue_thb: c.commission! * 10, commission_thb: c.commission!, uploaded_by: 'ORM', uploaded_at: '2026-10-02T03:00:00Z', approved_by_hotel: true,
  }));
  const data = {
    contracts, customers: [], products: [], invoices: [], reports, invRequests: [], liveLinks: [], taxReceipts: [],
    billingWaiting: CASES.map((c) => ({ contract_id: c.id, service_line: 'ORM', billing_period: G_DEMO_PERIOD })),
  } as unknown as AccountingData;
  const out = runDailyBilling(data, G_DEMO_RUN_DAY);
  return CASES.map((c) => ({ contract_id: c.id, hotel: c.hotel, invoice: out.invoices.find((i) => i.contract_ids.includes(c.id)) ?? null }));
}
