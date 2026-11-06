/* PR-O1 · Production Report drop + one month rule — acceptance §9. */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
(globalThis as any).sessionStorage ??= (globalThis as any).localStorage;

const D = await import('../src/lib/pr-drop');
const St = await import('../src/lib/pr-drop-store');
const Demo = await import('../src/lib/pr-drop-demo');
const E = await import('../src/lib/ac-v2-engine');
const G = await import('../src/lib/ac-guarantee-demo');
const Bell = await import('../src/lib/bell-items');
const R = await import('../src/lib/sidebar-registry');
const { movedHref } = await import('../src/lib/suite-r2-moves');
const SEED = await import('../src/lib/crm-seed');

const TODAY = '2026-10-28';
const demoItems = () => St.itemsFor(true, Demo.PR_DEMO_MONTH, TODAY);
const by = (id: string) => demoItems().find((i) => i.contract_id === id)!;

describe('PR-O1 items and cut-off', () => {
  test('1 · one item per active contract-month; stable keys, no duplicate on reload', () => {
    const a = demoItems(); const b = demoItems();
    expect(a.length).toBe(Demo.PR_DEMO_CONTRACTS.length);
    expect(new Set(a.map((i) => i.id)).size).toBe(a.length);
    expect(b.map((i) => i.id)).toEqual(a.map((i) => i.id));
    expect(D.prItems(Demo.PR_DEMO_CONTRACTS, [], '2026-10', TODAY).length).toBe(0); // current month not open yet
    const ended = { ...Demo.PR_DEMO_CONTRACTS[0]!, contract_id: 'X', term_end: '2026-09-15' };
    expect(D.activeInMonth(ended, '2026-09')).toBe(true);
    expect(D.activeInMonth(ended, '2026-10')).toBe(false);
  });
  test('2 · cut-off: sent + no reply → auto-confirmed; dispute → not confirmed; not sent → red', () => {
    expect(D.cutoffOf('2026-09')).toBe('2026-10-03');
    expect(by('PRD-O2').status).toBe('READY'); expect(by('PRD-O2').auto_confirmed).toBe(true);
    expect(by('PRD-O3').status).toBe('DISPUTE');
    expect(by('PRD-O6').status).toBe('LATE'); expect(D.statusText(by('PRD-O6'))).toBe('เลยตัดรอบ 25 วัน');
    expect(D.statusOf(null, '2026-10-03', '2026-10-03', false).status).toBe('DUE_TODAY');
    expect(by('PRD-O5').status).toBe('RETURNED'); expect(by('PRD-O4').status).toBe('BILLED');
  });
  test('3 · PDF only; revenue required only for ORM commission', () => {
    expect(D.pdfError({ name: 'a.xlsx', size: 10 })).toBe('รับเฉพาะไฟล์ PDF');
    expect(D.pdfError({ name: 'a.pdf', size: 21 * 1024 * 1024 })).toBe('ไฟล์ใหญ่เกิน 20 MB');
    const f = [{ ref: 'r', name: 'a.pdf', size: 1, at: '', version: 1 }];
    expect(D.sendAcError(by('G-DEMO-3'), f, null)).toBe('กรอกรายได้ที่ใช้คิดค่าคอม (฿)');
    expect(D.sendAcError(by('PRD-M3'), f, null)).toBe(null);
    expect(by('PRD-O6').needs_revenue).toBe(false); // flat ORM
  });
  test('4 · lead overview shows no money', () => {
    const rows = demoItems().map(D.leadRow);
    expect(JSON.stringify(rows)).not.toMatch(/revenue|commission|฿/);
    const c = D.leadCounters(demoItems());
    expect(c.ORM).toEqual({ total: 7, sent: 3, late: 2, dispute: 1 });
    expect(c.Marcom).toEqual({ total: 3, sent: 2, late: 1, dispute: 0 });
  });
});

describe('PR-O1 billing (one month rule)', () => {
  const contract = (id: string, extra: object = {}) => ({ ...SEED.seedContracts[0]!, contract_id: id, status: 'contract_completed', start_date: '2026-01-01', duration_months: 24, billing_status: 'ACTIVE',
    lines: [{ line_id: 'l', sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM', package_snapshot: null, billing: 'monthly', unit_price: 1000, commission_rate: 0.1, quantity: 1 }], ...extra }) as any;
  const base = (c: any, invoices: any[] = []) => ({ contracts: [c], customers: [], products: SEED.seedProducts, invoices, reports: [], invRequests: [], liveLinks: [], taxReceipts: [], billingWaiting: [{ contract_id: c.contract_id, service_line: 'ORM', billing_period: '2026-10-01' }] }) as any;
  const rep = (cid: string, m: number, c: number) => ({ report_id: `R${m}`, contract_id: cid, sku: 'ORM-MTH-FULL', period_year: 2026, period_month: m, revenue_thb: c * 10, commission_thb: c, uploaded_by: 'ORM', uploaded_at: '', approved_by_hotel: false });
  test('5a · October invoice charges September (manual report); a ready drop item wins', () => {
    const c = contract('C1');
    const out = E.runDailyBilling({ ...base(c), reports: [rep('C1', 9, 500), rep('C1', 10, 999)] }, '2026-10-05');
    const inv = out.invoices.find((i: any) => i.contract_ids.includes('C1'))!;
    expect(inv.lines.find((l: any) => l.line_type === 'commission')).toMatchObject({ amount: 500, service_month: '2026-09' });
    const drop = { ...rep('C1', 9, 700), report_id: 'PRD-1' };
    const out2 = E.runDailyBilling({ ...base(c), reports: [rep('C1', 9, 500)], prDropReports: [drop] }, '2026-10-05');
    expect(out2.invoices[0]!.lines.find((l: any) => l.line_type === 'commission')!.amount).toBe(700);
  });
  test('5b · switch-over guard: a month already charged is never charged again', () => {
    const c = contract('C2');
    const old = { ...SEED.seedInvoices[0]!, invoice_id: 'OLD', contract_ids: ['C2'], status: 'paid', billing_period_start: '2026-09-01', lines: [{ line_type: 'commission', contract_id: 'C2', amount: 1 }], customer_snapshot: c.customer_snapshot } as any;
    const out = E.runDailyBilling({ ...base(c, [old]), reports: [rep('C2', 9, 500)] }, '2026-10-05');
    const inv = out.invoices.find((i: any) => i.invoice_id !== 'OLD')!;
    expect(inv.lines.map((l: any) => l.line_type)).toEqual(['fixed']);
    expect(E.chargedServiceMonths(out.invoices, 'C2').has('2026-09')).toBe(true);
  });
  test('5c · DF2 examples on the October invoice keep ฿12,000 / ฿10,000 / ฿10,000', () => {
    const rows = G.guaranteeDemoInvoices();
    expect(rows.map((r) => r.invoice!.lines.find((l: any) => l.line_type === 'commission')!.amount)).toEqual([12000, 10000, 10000]);
    expect(rows.every((r) => r.invoice!.billing_period_start === '2026-10-01')).toBe(true);
    expect(rows[0]!.invoice!.lines[0]!.service_month).toBe('2026-09');
  });
  test('5d · commission-only not ready waits; Guarantee not ready after cut-off bills Guarantee', () => {
    const c = contract('C3', { lines: [{ line_id: 'l', sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM', package_snapshot: null, billing: 'monthly', unit_price: null, commission_rate: 0.1, quantity: 1 }] });
    expect(E.runDailyBilling(base(c), '2026-10-05').invoices.length).toBe(0);
    const g = { ...c, billing_model: 'COMMISSION_GUARANTEE', guarantee_fee: 10000 };
    expect(E.runDailyBilling(base(g), '2026-10-05').invoices[0]!.totals).toBeTruthy();
  });
  test('ready drop items → reports for the engine (revenue × rate)', () => {
    const r = D.readyDropReports(demoItems());
    expect(r.map((x) => [x.contract_id, x.commission_thb])).toEqual([['PRD-O1', 27000], ['PRD-O2', 32000]]);
  });
  test('revenue conflict warning until AC acknowledges', () => {
    const row = { ...D.emptyRow('C', '2026-09'), revenue_thb: 900, ac_prev_revenue: 800 };
    expect(D.revenueConflict(row)).toBe(true);
    expect(D.revenueConflict({ ...row, ac_ack_at: 'x' })).toBe(false);
  });
});

describe('PR-O1 bells, links, dashboards', () => {
  test('6 · bells once per item per day; เตือนผู้ดูแล creates one', () => {
    const n1 = St.runPrBells(true, demoItems(), TODAY); const n2 = St.runPrBells(true, demoItems(), TODAY);
    expect(n1).toBeGreaterThan(0); expect(n2).toBe(0);
    expect(St.remindCaretaker(true, by('PRD-O6'), TODAY)).toBe(true);
    expect(St.remindCaretaker(true, by('PRD-O6'), TODAY)).toBe(false);
    expect(Bell.bellItems.all(true).filter((b) => b.key.includes('PRD-O6') && b.key.includes('REMIND')).length).toBe(1);
  });
  test('7 · Snapshot / Sync Up open Report Automation (DEMO kept)', () => {
    const items = JSON.stringify(R.SIDEBAR_REGISTRY);
    expect(items).toContain('"key":"snapshot-report","label":"Snapshot Report","target":{"app":"PS","route":"/ps/report-automation"}');
    expect(items).toContain('"key":"sync-up-report","label":"Sync Up Report","target":{"app":"PS","route":"/ps/report-automation"}');
    expect(movedHref('/orm/snapshot-report', '?demo=1')).toBe('/ps/report-automation?demo=1');
    expect(movedHref('/marcom/sync-up-report', '')).toBe('/ps/report-automation');
  });
  test('8 · dashboard count = page items not ready after the cut-off', () => {
    expect(St.prWaitingCount(true, TODAY)).toBe(D.waitingAfterCutoff(demoItems(), TODAY));
    expect(St.prWaitingCount(true, TODAY)).toBe(5); // O3 dispute · O5 returned · O6 late · G-DEMO-3 late · M3 late
  });
});

describe('PR-O1 forbidden strings', () => {
  test('9 · status texts, lead rows and bell texts show no raw keys', async () => {
    const { hits } = await import('./forbidden-words');
    const txt = [...demoItems().map((i) => D.statusText(i)), JSON.stringify(demoItems().map(D.leadRow).map((r) => r.text)), ...D.prBellsDue(demoItems(), TODAY).map((b) => b.text), ...Object.values(D.STATUS_TH)].join(' | ');
    expect(hits(txt)).toEqual([]);
  });
});
