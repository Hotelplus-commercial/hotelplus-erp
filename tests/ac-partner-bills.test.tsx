/* AC App Partner Bills v1.0 §9 — acceptance tests (bills, credit, cashback, shut-off / reactivate, รับทราบ, live paid, DEMO). */
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

const staged: { key: string; body: unknown }[] = [];
const realSync = await import('../src/lib/cloud-sync');
mock.module('../src/lib/cloud-sync', () => ({ ...realSync, stageCloudDoc: (key: string, body: unknown) => { staged.push({ key, body }); } }));

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ac/partner-bills?demo=1' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const DAY = '2026-10-28';
const S = () => import('../src/lib/debt-partner-store');
const B = () => import('../src/lib/partner-bills');
const T = () => import('../src/lib/tickets-l0');
const X = () => import('../src/lib/partner-shutoff-ac');
async function reset(demo = true) { const s = await S(); s.setPartnerDemo(!demo); s.setPartnerDemo(demo); const t = await T(); t.setTicketDemo(!demo); t.setTicketDemo(demo); }
const src = (p: string) => readFileSync(p, 'utf8');

describe('AC App Partner Bills v1.0', () => {
  beforeEach(() => reset(true));

  it('1 · menu บิล Partner under the AC App billing area; page has card + tabs บิล / Cashback', async () => {
    const { acTabs } = await import('../src/routes/ac');
    const i = acTabs.findIndex((t) => t.to === '/ac/partner-bills');
    expect(acTabs[i]?.label).toBe('บิล Partner');
    expect(acTabs[i - 1]?.to).toBe('/ac/billing');
    const page = src('src/components/ac/partner-bills-page.tsx');
    expect(page).toContain('TabsTrigger value="bills">บิล<'); expect(page).toContain('TabsTrigger value="cashback">Cashback<');
  });

  it('2 · pre-fill from property system + partnerCost; 1-month expected = PS Dashboard ③ net', async () => {
    const { getPartnerData } = await S(); const { prefillLines } = await B();
    const { rateCardRows } = await import('../src/lib/debt-partner-calc'); const { PARTNER_DEMO_CONTRACTS } = await import('../src/lib/debt-partner-demo');
    const d = getPartnerData();
    const lines = prefillLines(d, PARTNER_DEMO_CONTRACTS, 'PTN-SL', '2026-10-01', '2026-10-31');
    expect(lines).toHaveLength(20);
    const sum = lines.reduce((s, l) => s + l.expected, 0);
    expect(sum).toBe(16000);
    expect(rateCardRows(d, PARTNER_DEMO_CONTRACTS, '2026-10-01').find((r) => r.card.partner_id === 'PTN-SL')!.net).toBe(sum);
    // Hotelier.guru 3 months: 48 × ฿1,190 × 3 = ฿171,360 (§8)
    expect(prefillLines(d, PARTNER_DEMO_CONTRACTS, 'PTN-HG', '2026-11-01', '2027-01-31').reduce((s, l) => s + l.expected, 0)).toBe(171360);
  });

  it('3 · mismatch lists the differing lines; save still works', async () => {
    const s = await S(); const { billCheck, prefillLines } = await B(); const { PARTNER_DEMO_CONTRACTS } = await import('../src/lib/debt-partner-demo');
    const lines = prefillLines(s.getPartnerData(), PARTNER_DEMO_CONTRACTS, 'PTN-SL', '2026-12-01', '2026-12-31');
    lines[0]!.amount += 500;
    const chk = billCheck(lines, 16500);
    expect(chk.ok).toBe(false); expect(chk.diff).toBe(500); expect(chk.differing.map((l) => l.contract_id)).toEqual([lines[0]!.contract_id]);
    const r = s.saveBill({ partner_id: 'PTN-SL', bill_no: 'SL-2612', bill_date: '2026-12-01', due_date: '2026-12-10', period_start: '2026-12-01', period_end: '2026-12-31', total: 16500, currency: 'THB', expected_total: chk.sumExpected, attachment_url: '', note: '', lines, credits: [], by: 'AC' });
    expect(r.ok).toBe(true);
    // DEMO SL-2611 shows ไม่ตรง ฿500
    const sl = s.getPartnerData().partner_bills.find((b) => b.bill_no === 'SL-2611')!; expect(sl.total - sl.expected_total).toBe(500);
  });

  it('4 · บันทึกว่าจ่ายแล้ว sets bill + lines paid_at; จ่ายล่วงหน้าถึง = latest paid period_end', async () => {
    const s = await S(); const { getPrepaidUntil } = await import('../src/lib/debt-partner-calc');
    expect(getPrepaidUntil(s.getPartnerData(), 'DP-HG-01')).toBe('2026-10-31');
    expect(s.markBillPaid('BILL-HG-2611', '2026-11-12').ok).toBe(true);
    const d = s.getPartnerData();
    expect(d.partner_bills.find((b) => b.id === 'BILL-HG-2611')).toMatchObject({ status: 'PAID', paid_at: '2026-11-12' });
    expect(d.partner_bill_lines.filter((l) => l.bill_id === 'BILL-HG-2611').every((l) => !!l.paid_at)).toBe(true);
    expect(getPrepaidUntil(d, 'DP-HG-01')).toBe('2027-01-31');
    expect(getPrepaidUntil(d, 'CT-ORM-Q-ORM-0410')).toBe('2027-01-31'); // Chaba Grand unchanged
  });

  it('5 · credit rules: ≤ remaining, ≤ bill total, APPROVED / same Partner / not expired; ⑤ follows; VOID ignored', async () => {
    const s = await S(); const { creditUseError, creditRemaining, usableCredits } = await B(); const { creditTiles } = await import('../src/lib/debt-partner-calc');
    const d = s.getPartnerData();
    const krabi = d.system_credit_requests.find((r) => r.id === 'CR-KRABI')!;
    expect(creditRemaining(d, krabi)).toBe(0); // reserved by pending HG-2611
    expect(creditUseError(d, 'PTN-HG', '2026-10-28', 1000, [{ credit_request_id: 'CR-NAN', amount: 10 }])).not.toBeNull(); // REQUESTED
    expect(creditUseError(d, 'PTN-SL', '2026-10-28', 1000, [{ credit_request_id: 'CR-BTALAY', amount: 10 }])).not.toBeNull(); // other Partner
    expect(creditUseError(d, 'PTN-HG', '2028-01-01', 1000, [{ credit_request_id: 'CR-BTALAY', amount: 10 }])).not.toBeNull(); // expired
    expect(creditUseError(d, 'PTN-HG', '2026-10-28', 1000, [{ credit_request_id: 'CR-BTALAY', amount: 3401 }])).toBe('ยอดเครดิตเกินยอดคงเหลือ');
    expect(creditUseError(d, 'PTN-HG', '2026-10-28', 100, [{ credit_request_id: 'CR-BTALAY', amount: 200 }])).toBe('ยอดเครดิตรวมเกินยอดบิล');
    expect(usableCredits(d, 'PTN-HG', '2026-10-28').map((x) => x.req.id).sort()).toEqual(['CR-BTALAY', 'CR-SEEFAH']);
    expect(creditTiles(d).used).toBe(3400); // pending use not yet counted
    s.markBillPaid('BILL-HG-2611', '2026-11-12');
    expect(creditTiles(s.getPartnerData())).toMatchObject({ used: 6800, balance: 3740 });
    // a VOID bill's usage is ignored
    const r = s.saveBill({ partner_id: 'PTN-HG', bill_no: 'HG-X', bill_date: '2026-10-28', due_date: '2026-11-15', period_start: '2026-11-01', period_end: '2026-11-30', total: 5000, currency: 'THB', expected_total: 5000, attachment_url: '', note: '', lines: [], credits: [{ credit_request_id: 'CR-BTALAY', amount: 3000 }], by: 'AC' });
    expect(r.ok).toBe(true);
    const bt = () => s.getPartnerData().system_credit_requests.find((x) => x.id === 'CR-BTALAY')!;
    expect(creditRemaining(s.getPartnerData(), bt())).toBe(400);
    s.voidBill((r as { id: string }).id);
    expect(creditRemaining(s.getPartnerData(), bt())).toBe(3400);
  });

  it('6 · card tiles per currency; overdue = PENDING past due; missed-bill line', async () => {
    const s = await S(); const { billTiles, missingBillPartners } = await B(); const { PARTNER_DEMO_CONTRACTS } = await import('../src/lib/debt-partner-demo');
    const t = billTiles(s.getPartnerData(), DAY);
    expect(t.total).toEqual({ THB: 203860, USD: 640 });
    expect(t.paid).toEqual({ THB: 16000 });
    expect(t.pending).toEqual({ THB: 187860 });
    expect(t.overdue).toEqual({ USD: 640 });
    expect(missingBillPartners(s.getPartnerData(), PARTNER_DEMO_CONTRACTS, DAY)).toEqual([]);
    expect(missingBillPartners(s.getPartnerData(), PARTNER_DEMO_CONTRACTS, '2026-12-05').sort()).toEqual(['Hotelier.guru', 'OTA Hub', 'StayLink']);
  });

  it('7 · cashback tick inserts one receipt; ④ progress updates; untick deletes only UI rows', async () => {
    const s = await S(); const { getCashbackExpected } = await import('../src/lib/debt-partner-calc'); const { PARTNER_DEMO_CONTRACTS } = await import('../src/lib/debt-partner-demo'); const { cashbackBlocks } = await B();
    const deal = () => s.getPartnerData().partner_deals.find((x) => x.id === 'DEAL-02')!;
    const block = cashbackBlocks(s.getPartnerData(), PARTNER_DEMO_CONTRACTS, DAY)[0]!;
    expect(block.rows).toHaveLength(7);
    expect(getCashbackExpected(s.getPartnerData(), deal(), PARTNER_DEMO_CONTRACTS)).toMatchObject({ eligible: 7, received: 4, received_amount: 400 });
    const free = block.rows.find((r) => !r.receipt)!;
    const r = s.recordCashbackReceipt({ deal_id: 'DEAL-02', contract_id: free.c.contract_id, received_at: '2026-10-28', amount: 95, currency: 'USD', by: 'AC' });
    expect(r.ok).toBe(true);
    expect(getCashbackExpected(s.getPartnerData(), deal(), PARTNER_DEMO_CONTRACTS)).toMatchObject({ received: 5, received_amount: 495 });
    expect(s.removeCashbackReceipt('CB-1')).toBe(false);
    expect(s.removeCashbackReceipt((r as { id: string }).id)).toBe(true);
    expect(getCashbackExpected(s.getPartnerData(), deal(), PARTNER_DEMO_CONTRACTS).received).toBe(4);
  });

  it('8 · ขอปิดระบบ only on SUSPENDED; exactly 2 linked tickets; ref while open; AC can cancel', async () => {
    const t = await T(); const x = await X();
    expect(src('src/components/hotel/ac-profile-form.tsx')).toContain("c.billing_status==='SUSPENDED' && (");
    const r = x.requestShutoff({ contract_id: 'C-1', hotel_id: 'HP-1', hotel_name: 'Sala Talay Resort', service_line: 'Marcom', partner: null, system_name: null, assigned_ae: 'Ploy', outstanding: 28000, overdue_cycles: 2, note: '' });
    expect(r.ok).toBe(true);
    const mine = t.ticketSnapshot().filter((k) => k.subject_ref.contract_id === 'C-1');
    expect(mine.map((k) => [k.type, k.target_dept, k.source_app]).sort()).toEqual([['SYSTEM_SHUTOFF', 'MARCOM', 'AC_APP'], ['SYSTEM_SHUTOFF', 'PS', 'AC_APP']]);
    const [a, b] = mine; expect(a!.payload.shutoff!.twin_ticket_id).toBe(b!.ticket_id); expect(b!.payload.shutoff!.twin_ticket_id).toBe(a!.ticket_id);
    expect(x.openShutoffs(t.ticketSnapshot(), 'C-1')).toHaveLength(2);
    expect(x.requestShutoff({ contract_id: 'C-1', hotel_id: 'HP-1', hotel_name: 'x', service_line: 'Marcom', partner: null, system_name: null, assigned_ae: null, outstanding: 1, overdue_cycles: 1, note: '' }).ok).toBe(false);
    const ps = t.ticketById(b!.ticket_id)!; expect(t.allowedNext(ps, 'AC')).toContain('CANCELLED');
    expect(t.transition(ps.ticket_id, ps.revision, 'CANCELLED', 'AC')).toBe(true);
  });

  it('9 · reactivation after a shut-off cancels open ones with the note + 2 SYSTEM_REACTIVATE; none without shut-off', async () => {
    const t = await T(); const x = await X();
    x.requestShutoff({ contract_id: 'C-2', hotel_id: 'HP-2', hotel_name: 'H2', service_line: 'ORM', partner: 'StayLink', system_name: 'Channel Manager', assigned_ae: null, outstanding: 1000, overdue_cycles: 1, note: '' });
    const ev = (id: string, type: string, at: string) => ({ id, customer_id: 'CUS-2', hotel_name: 'H2', event_type: type, occurred_at: at, by_member: 'daily', amount_outstanding: 0, note: '' });
    const prev = [ev('e1', 'SUSPENDED', '2026-10-01')];
    const next = [ev('e2', 'REACTIVATED', '2026-10-28'), ...prev];
    const re = x.newReactivations(prev, next); expect(re).toEqual([{ customer_id: 'CUS-2', reactivated_at: '2026-10-28', suspended_at: '2026-10-01' }]);
    const out = x.onReactivated(['C-2', 'C-NONE'], '2026-10-01', '2026-10-28');
    expect(out.cancelled).toHaveLength(2); expect(out.created).toHaveLength(2);
    const shut = t.ticketSnapshot().filter((k) => k.subject_ref.contract_id === 'C-2' && k.type === 'SYSTEM_SHUTOFF');
    expect(shut.every((k) => k.status === 'CANCELLED' && k.audit.at(-1)!.note === 'ลูกค้าชำระครบ ยกเลิกคำขอปิดระบบ')).toBe(true);
    const ra = t.ticketSnapshot().filter((k) => k.type === 'SYSTEM_REACTIVATE' && k.subject_ref.contract_id === 'C-2');
    expect(ra.map((k) => k.target_dept).sort()).toEqual(['ORM', 'PS']); expect(ra.every((k) => k.payload.shutoff?.auto && k.payload.shutoff.reactivated_at === '2026-10-28')).toBe(true);
    expect(t.ticketSnapshot().some((k) => k.subject_ref.contract_id === 'C-NONE')).toBe(false);
    expect(x.onReactivated(['C-2'], '2026-10-01', '2026-10-28').created).toEqual([]); // idempotent
    // collection engine untouched: the hook only reads; recompute source has no ticket import
    expect(src('src/lib/ac-v2-engine.ts')).not.toContain('tickets-l0');
  });

  it('10 · รับทราบ moves the two notice types NEW → DONE with audit รับทราบ; other types unchanged', async () => {
    const t = await T(); const x = await X();
    x.seedAcBillsDemo();
    const n = t.ticketSnapshot().filter((k) => k.target_dept === 'AC' && (k.type === 'PARTNER_DEAL_NOTICE' || k.type === 'SYSTEM_CREDIT_NOTICE'));
    expect(n.map((k) => [k.type, k.status]).sort()).toEqual([['PARTNER_DEAL_NOTICE', 'NEW'], ['SYSTEM_CREDIT_NOTICE', 'NEW']]);
    for (const k of n) expect(t.acknowledgeNotice(k.ticket_id, k.revision, 'AC')).toBe(true);
    for (const k of n) { const y = t.ticketById(k.ticket_id)!; expect(y.status).toBe('DONE'); expect(y.audit.at(-1)).toMatchObject({ from_status: 'NEW', to_status: 'DONE', note: 'รับทราบ' }); }
    const shut = t.ticketSnapshot().find((k) => k.type === 'SYSTEM_SHUTOFF')!;
    expect(t.acknowledgeNotice(shut.ticket_id, shut.revision, 'AC')).toBe(false);
    const { AcNotice } = await import('../src/components/ps/partner-section'); void AcNotice;
    expect(src('src/components/ps/partner-section.tsx')).toContain('AC รับทราบ'); // DONE shows AC รับทราบ (non-NEW branch)
  });

  it('11 · paying an invoice writes status + paid_at in the same action (no daily job)', async () => {
    const { confirmPayment } = await import('../src/lib/ac-v2-engine');
    const inv = { invoice_id: 'INV-1', invoice_type: 'RECURRING', status: 'issued', contract_ids: ['C'], customer_snapshot: { customer_id: 'CU', legal_name: 'H', hotel_name: 'H' }, billing_period_start: '2026-10-01', lines: [], totals: { total: 1000 }, paid_amount: 0 };
    const data = { contracts: [], invoices: [inv], reports: [], products: [], customers: [], taxReceipts: [], liveLinks: [], invRequests: [], gradeRecords: [], collectionEvents: [] } as never;
    const next = confirmPayment(data, 'INV-1', 'transfer', 1000, 'AC', '2026-10-28') as { invoices: { status: string; paid_at: string | null }[] };
    expect(next.invoices[0]).toMatchObject({ status: 'paid', paid_at: '2026-10-28T00:00:00Z' });
    expect(src('src/components/ps/debt-cards-r11.tsx')).toContain('useLastPaidChange');
  });

  it('12 · storage: partner_bills key + doc key; no database migration; SYSTEM_FEE untouched', async () => {
    const s = await S(); const { CLOUD_DOC_KEYS } = await import('../src/lib/cloud-sync-keys');
    expect(s.PARTNER_STORAGE_KEY('partner_bills')).toBe('meridia.partner_bills.v1');
    expect(CLOUD_DOC_KEYS).toContain('partner:partner_bills');
    await reset(false); staged.length = 0;
    const r = s.saveBill({ partner_id: 'P', bill_no: 'N1', bill_date: '2026-10-01', due_date: '2026-10-10', period_start: '2026-10-01', period_end: '2026-10-31', total: 1, currency: 'THB', expected_total: 1, attachment_url: '', note: '', lines: [{ contract_id: 'C', amount: 1 }], credits: [], by: 'AC' });
    expect(r.ok).toBe(true);
    expect(staged.map((x) => x.key)).toEqual(expect.arrayContaining(['partner:partner_bills', 'partner:partner_bill_lines']));
    expect(JSON.parse(localStorage.getItem('meridia.partner_bills.v1')!)[0].bill_no).toBe('N1');
    expect(s.saveBill({ partner_id: 'P', bill_no: 'N1', bill_date: '2026-10-01', due_date: '2026-10-10', period_start: '2026-10-01', period_end: '2026-10-31', total: 1, currency: 'THB', expected_total: 1, attachment_url: '', note: '', lines: [], credits: [], by: 'AC' }).ok).toBe(false); // unique (partner, bill_no)
    localStorage.removeItem('meridia.partner_bills.v1'); localStorage.removeItem('meridia.partner_bill_lines.v1'); localStorage.removeItem('meridia.system_credit_usage.v1');
  });

  it('DEMO switch: Workspace and PS Dashboard read and write the one shared DEMO state', async () => {
    const ds = await import('../src/lib/demo-session');
    ds.setPsDemoSession(false);
    expect(src('src/routes/workspace.$dept.tsx')).toContain('setPsDemoSession(true)');
    expect(src('src/components/ps/ps-dashboard-shell.tsx')).toContain('psDemoOn()));');
    expect(src('src/components/workspace/workspace-shell.tsx')).toContain('href={`?demo=${demo ? 0 : 1}`}');
    ds.setPsDemoSession(true); expect(ds.psDemoOn()).toBe(true);
    ds.setPsDemoSession(false); expect(ds.psDemoOn()).toBe(false);
  });

  it('forbidden strings: AC App › บิล Partner (DEMO, both tabs) has no raw keys', async () => {
    const { act, createElement: h } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { PartnerBillsPage } = await import('../src/components/ac/partner-bills-page');
    const { domHits } = await import('./forbidden-words');
    document.body.innerHTML = ''; const div = document.createElement('div'); document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => { root.render(h(PartnerBillsPage)); await new Promise((r) => setTimeout(r, 50)); });
    const t0 = Date.now();
    while (!div.querySelector('[data-testid="pb-table"]')) { if (Date.now() - t0 > 5000) throw new Error('page: ' + (div.textContent ?? '').slice(0, 300)); await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); }
    expect(div.textContent).toContain('ไม่ตรง ฿500');
    expect(div.querySelector('[data-testid="shutoff-btn"]')).not.toBeNull(); // Sala Talay: no ticket yet
    expect(div.querySelector('[data-testid="shutoff-ref"]')?.textContent).toContain('กำลังทำ'); // Chaba: ORM กำลังทำ
    expect(domHits(div)).toEqual([]);
    const tab = [...div.querySelectorAll('[role="tab"]')].find((e) => e.textContent === 'Cashback') as HTMLElement;
    await act(async () => { tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); tab.click(); await new Promise((r) => setTimeout(r, 30)); });
    expect(domHits(div)).toEqual([]);
    await act(async () => root.unmount());
  });
});
