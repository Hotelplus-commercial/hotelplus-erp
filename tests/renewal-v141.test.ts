/* Contract Renewal v1.4.1 §7 — billing model + guarantee on the new contract · one DEMO clock · Q58 past-due rules. */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const ss: Record<string, string> = {};
(globalThis as any).sessionStorage ??= { getItem: (k: string) => ss[k] ?? null, setItem: (k: string, v: string) => { ss[k] = v; }, removeItem: (k: string) => { delete ss[k]; } };

const S = await import('../src/lib/renewal-store');
const R = await import('../src/lib/renewal-rules');
const M = await import('../src/lib/main-contract-store');
const B = await import('../src/lib/renewal-contract');
const CS = await import('../src/lib/contract-state');
const T1 = await import('../src/lib/contract-tab-r1');
const D1 = await import('../src/lib/contract-tab-r1-demo');
const R2 = await import('../src/lib/renewal-r2');
const R2D = await import('../src/lib/renewal-r2-demo');
const SC = await import('../src/lib/renewal-scan');
const N = await import('../src/lib/renewal-ac-notice');
const G = await import('../src/lib/ps-glossary');
const E = await import('../src/lib/ac-v2-engine');
const SEED = await import('../src/lib/crm-seed');
const OD = await import('../src/lib/renewal-offer-demo');
const DS = await import('../src/lib/demo-session');

const today = '2026-10-28';

describe('§1 new contract carries billing model + guarantee (RN41 / RN42)', () => {
  test('1 · Baan Suan: approve ฿8,500 + 5.5% → sign → FIXED_PLUS_COMMISSION, unit 8500, rate 0.055, guarantee null, sku ORM-MTH-FULL', () => {
    S.setRenewalDemo(false); S.setRenewalDemo(true);
    const r = S.latestRequestFor('RN-V14-BS')!;
    expect(S.approveRequest(r.id, 'PM001-Alex', 'PM').ok).toBe(true);
    expect(S.sendRenewalLink(r.id).ok).toBe(true);
    expect(S.signRequest(r.id).ok).toBe(true);
    const signed = S.latestRequestFor('RN-V14-BS')!;
    const c = M.mainContractById(signed.new_contract_id!)!;
    expect(c.billing_model).toBe('FIXED_PLUS_COMMISSION');
    expect(c.guarantee_fee).toBeNull();
    expect(c.lines[0]!.unit_price).toBe(8500);
    expect(c.lines[0]!.commission_rate).toBe(0.055);
    expect(c.lines[0]!.sku_snapshot).toBe('ORM-MTH-FULL');
    S.setRenewalDemo(false);
  });
  test('2 · Commission + Guarantee renewal keeps guarantee 22,500; RENEWAL history row has both fields', () => {
    S.setRenewalDemo(true);
    const cg = M.mainContractById('CT-HTL0422-R0142')!;
    expect(cg.billing_model).toBe('COMMISSION_GUARANTEE');
    expect(cg.guarantee_fee).toBe(22500);
    expect(cg.lines[0]!.unit_price).toBeNull();
    expect(cg.lines[0]!.commission_rate).toBe(0.15);
    const h = S.renewalHistory().find((x) => x.contract_id === 'CT-HTL0422-R0142' && x.source === 'RENEWAL')!;
    expect(h.billing_model).toBe('COMMISSION_GUARANTEE');
    expect(h.guarantee_fee).toBe(22500);
    S.setRenewalDemo(false);
  });
  test('3 · contracts without the fields stay unknown (no key added, never 0)', () => {
    const src = { contract_id: 'X', hotel_id: 'H', customer_id: 'C', legal_entity: 'L', signatory: 'S', kyc_docs: [], terms: { fee_amount: 9000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2025-01-01', end_date: '2025-12-31' } };
    const base = B.contractFromSource(src, today);
    expect('billing_model' in base).toBe(false);
    const out = B.buildRenewedContract(base, { id: 'RR-1', new_contract_id: 'X-R1', old_terms: src.terms, new_terms: { ...src.terms, start_date: '2026-01-01', end_date: '2026-12-31' }, signed_at: today, updated_at: today } as any);
    expect(out.ok && 'billing_model' in out.contract).toBe(false);
  });
});

describe('AC Billing: runDailyBilling() with renewal contracts', () => {
  const withRenewal = (prevInvoice: boolean) => {
    const inv = SEED.seedInvoices[0]!;
    const old = { ...SEED.seedContracts[0]!, contract_id: 'OLD-1', customer_snapshot: { ...SEED.seedContracts[0]!.customer_snapshot, customer_id: 'CUS-RNW' }, status: 'contract_completed' as const, start_date: '2025-10-01', duration_months: 12 };
    const neu = { ...old, contract_id: 'OLD-1-R1', renewal_of: 'OLD-1', start_date: '2026-10-01', duration_months: 12, billing_status: 'ACTIVE' as const, billing_model: 'COMMISSION_GUARANTEE' as const, guarantee_fee: 22500,
      lines: [{ line_id: 'L1', sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM Full', package_snapshot: null, billing: 'monthly' as const, unit_price: null, commission_rate: 0.15, quantity: 1 }] };
    const report = { ...SEED.seedReports[0]!, report_id: 'PR-RNW', contract_id: 'OLD-1-R1', sku: 'ORM-MTH-FULL', period_year: 2026, period_month: 11, commission_thb: 18000 };
    const invoices = prevInvoice ? [{ ...inv, invoice_id: 'INV-OLD', contract_ids: ['OLD-1'], customer_snapshot: { ...inv.customer_snapshot, customer_id: 'CUS-RNW' }, status: 'paid' as const }] : [];
    return { contracts: [old, neu], customers: SEED.seedCustomers, products: SEED.seedProducts, invoices, reports: [report], invRequests: [], liveLinks: [], taxReceipts: [] } as any;
  };
  test('Commission + Guarantee line (unit_price null) still bills its commission; guarantee not applied by the engine', () => {
    const out = E.runDailyBilling(withRenewal(true), '2026-11-05');
    const inv = out.invoices.find((i: any) => i.contract_ids.includes('OLD-1-R1'))!;
    expect(inv).toBeTruthy();
    expect(inv.lines.map((l: any) => [l.line_type, l.amount])).toEqual([['commission', 18000]]);
  });
  test('the "customer already has an invoice" rule does not block a renewal (old contract invoices count)', () => {
    expect(E.runDailyBilling(withRenewal(true), '2026-11-05').invoices.some((i: any) => i.contract_ids.includes('OLD-1-R1'))).toBe(true);
    expect(E.runDailyBilling(withRenewal(false), '2026-11-05').invoices.some((i: any) => i.contract_ids.includes('OLD-1-R1'))).toBe(false);
  });
  test('12 · no invoice for a lapsed, upcoming or inactive contract', () => {
    const d = withRenewal(true);
    const lapsed = E.runDailyBilling({ ...d, contracts: [d.contracts[1], { ...d.contracts[1], contract_id: 'LAPSED', renewal_of: null, start_date: '2025-09-01', duration_months: 12 }], reports: [{ ...d.reports[0], contract_id: 'LAPSED' }] }, '2026-11-05');
    expect(lapsed.invoices.some((i: any) => i.contract_ids.includes('LAPSED'))).toBe(false);
    const upcoming = E.runDailyBilling({ ...d, contracts: [{ ...d.contracts[1], start_date: '2026-12-01' }] }, '2026-11-05');
    expect(upcoming.invoices.some((i: any) => i.contract_ids.includes('OLD-1-R1'))).toBe(false);
    const paused = E.runDailyBilling({ ...d, contracts: [{ ...d.contracts[1], billing_status: 'PAUSED' }] }, '2026-11-05');
    expect(paused.invoices.some((i: any) => i.contract_ids.includes('OLD-1-R1'))).toBe(false);
  });
  test('12 · notices: Guarantee + late renewal with the right months', () => {
    const n = N.renewalAcNotices(S.v141DemoRenewedContracts());
    expect(n.find((x) => x.kind === 'GUARANTEE')!.text).toBe('Commission + Guarantee · Guarantee fee ฿22,500 / เดือน · ระบบยังไม่คิดขั้นต่ำให้ · AC ตรวจยอดก่อนวางบิล');
    const late = n.find((x) => x.kind === 'LATE' && x.contract_id === 'CT-HTL0421-R0141')!;
    expect(late.months).toEqual(['2026-10']);
    expect(late.text).toBe('ต่อสัญญาล่าช้า · สัญญาเริ่ม 1 ต.ค. 69 · เซ็น 20 ต.ค. 69 · ตรวจวางบิลย้อนหลัง 1 รอบ (ต.ค. 69)');
  });
});

describe('§2 one DEMO clock (RN43 / RN44)', () => {
  test('4 · DEMO timestamps = 28 ต.ค. 69; PM overdue fires for a request older than the threshold', () => {
    expect(DS.DEMO_DAY).toBe(today);
    expect(OD.RENEWAL_OFFER_DEMO_NOW).toBe(today);
    S.setRenewalDemo(true);
    expect(S.renewalNow().slice(0, 10)).toBe(today);
    const cfg = R.DEFAULT_RENEWAL_CONFIG;
    expect(R.isOverdue({ status: 'PENDING_APPROVAL', submitted_at: '2026-10-24T03:00:00.000Z' }, S.renewalNow(), cfg)).toBe(true);
    expect(R.isOverdue({ status: 'PENDING_APPROVAL', submitted_at: '2026-10-27T03:00:00.000Z' }, S.renewalNow(), cfg)).toBe(false);
    S.setRenewalDemo(false);
  });
  test('5 · same end date → same days left in AE Workspace and Tab R2 (19 ธ.ค. 69 → 52 วัน; RN-D6 / RN-D7 past-due)', () => {
    const bs = S.DEMO_EXTRA_CARDS.find((c) => c.id === 'RN-V14-BS')!;
    expect(SC.cardDaysLeft(bs, today)).toBe(52);
    expect(R2.countdown('2026-12-19', R2D.RENEWAL_R2_DEMO_NOW).days).toBe(52);
    const items = R2D.renewalR2DemoItems();
    for (const [card, cid] of [['RN-D6', 'R1-M5'], ['RN-D7', 'R1-O5']] as const) {
      const c = S.DEMO_EXTRA_CARDS.find((x) => x.id === card)!; const i = items.find((x) => x.contract_id === cid)!;
      expect(SC.cardDaysLeft(c, today)).toBe(R2.countdown(i.end, R2D.RENEWAL_R2_DEMO_NOW).days);
      expect(SC.cardDaysLeft(c, today)).toBeLessThan(0);
      expect(R2.isPastDue(i, today)).toBe(true);
    }
  });
});

describe('§3 Q58 (RN45–RN49)', () => {
  test('7 · contractStateOn: active → lapsed day after end; ไม่ต่อ → ended-outcome; late renewal from old end + 1 → no lapsed day', () => {
    const c = { contract_id: 'A', start: '2025-10-16', term_end: '2026-10-15' };
    expect(CS.contractStateOn(c, '2026-10-15')).toBe('ACTIVE');
    expect(CS.contractStateOn(c, '2026-10-16')).toBe('LAPSED_PENDING');
    expect(CS.contractStateOn({ ...c, end: '2026-10-15', end_reason: 'NOT_RENEWED' }, '2026-10-16')).toBe('ENDED_OUTCOME');
    const ren = [{ renewal_of: 'A', start: '2026-10-16' }];
    for (const d of ['2026-10-16', '2026-10-20', '2026-10-28']) expect(CS.contractStateOn(c, d, ren)).toBe('RENEWED');
    expect(CS.contractStateOn({ contract_id: 'B', start: '2026-10-16', term_end: '2027-10-15' }, '2026-10-16', ren)).toBe('ACTIVE');
  });
  test('8 · header ใช้งาน excludes lapsed; lapsed list feeds the sub-line; หลุด unchanged', () => {
    const lapsed = D1.tabR1DemoLapsed();
    expect(lapsed.map((l) => l.contract_id).sort()).toEqual(['R1-M5', 'R1-O5', 'R1-O6']);
    const hit = (r: { hotel_id?: string; service: string }) => lapsed.some((l) => l.hotel_id === r.hotel_id && l.service === r.service);
    expect(D1.tabR1HeaderActive().some(hit)).toBe(false);
    expect(D1.tabR1HeaderChurn().some((c) => c.out > 0 && hit(c))).toBe(false);
    expect(G.Q58.headerLine(2)).toBe('ขาดอายุ รอผล 2');
    expect(G.Q58.unmatched(3)).toBe('ตรวจวันสิ้นสุดไม่ได้ 3 สัญญา (ไม่มีในคลังสัญญาหลัก)');
  });
  test('9 · card ①: grey lapsed in ต.ค.; start + in − out − lapsed = end for all 12 months; current month = header', () => {
    const d = D1.tabR1Demo();
    for (const svc of ['ORM', 'Marcom'] as const) {
      const s = T1.inOutSeries(d.flow, svc, today, d.activeToday[svc]);
      for (const m of s.months) expect(m.start + m.ins.length - m.outs.length - m.lapsed.length).toBe(m.end);
      expect(s.months.at(-1)!.end).toBe(d.activeToday[svc]);
    }
    const oct = T1.inOutSeries(d.flow, 'ORM', today, d.activeToday.ORM).months.at(-1)!;
    expect(oct.lapsed.map((c) => c.contract_id).sort()).toEqual(['R1-O5', 'R1-O6']);
    expect(oct.ins.concat(oct.outs).some((c) => c.contract_id === 'R1-O8' || c.contract_id === 'R1-O7')).toBe(false); // late renewal continuous
  });
  test('10 · recording ไม่ต่อ on a lapsed contract moves it from grey to หลุด in its end month', () => {
    const c = { contract_id: 'Z', hotel_id: 'Z', hotel_name: 'Z', service: 'ORM' as const, start: '2025-10-16', end: null, end_reason: null, renewal_of: null, term_end: '2026-10-15' };
    const before = T1.inOutSeries([c], 'ORM', today, 0).months.at(-1)!;
    expect([before.lapsed.length, before.outs.length]).toEqual([1, 0]);
    const after = T1.inOutSeries([{ ...c, end: '2026-10-15', end_reason: 'NOT_RENEWED' }], 'ORM', today, 0).months.at(-1)!;
    expect([after.lapsed.length, after.outs.length]).toEqual([0, 1]);
  });
  test('11 · card ⑦ drops a lapsed contract', () => {
    const ids = D1.tabR1Demo().base.map((b) => b.contract_id);
    for (const id of ['R1-O5', 'R1-O6', 'R1-M5']) expect(ids).not.toContain(id);
    expect(ids).toContain('R1-O8');
  });
  test('13 · Tab R2 past-due banner text', () => {
    expect(G.RN2.card.banner(13)).toBe('เลยกำหนด 13 วัน · ขาดอายุ ไม่นับเป็นใช้งาน · AC หยุดวางบิล · ยังไม่นับ churn จนกว่าจะบันทึกผล');
  });
  test('14 · UI text never shows engine codes', () => {
    const texts = [G.Q58.headerTip, G.Q58.pastDueBanner(1), G.Q58.guaranteeNotice('1'), G.Q58.lateManual('a', 'b', 1, 'c'), G.R1_INOUT.lapsedLine('x'), ...G.R1_INOUT.legend].join(' ');
    for (const w of ['LAPSED_PENDING', 'FIXED_PLUS_COMMISSION', 'COMMISSION_GUARANTEE', 'ENDED_OUTCOME']) expect(texts).not.toContain(w);
  });
});
