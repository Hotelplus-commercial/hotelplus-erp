/* O-26 · package change at renewal (PK1–PK14) — acceptance §6. */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const ss: Record<string, string> = {};
(globalThis as any).sessionStorage ??= { getItem: (k: string) => ss[k] ?? null, setItem: (k: string, v: string) => { ss[k] = v; }, removeItem: (k: string) => { delete ss[k]; } };

const S = await import('../src/lib/renewal-store');
const R = await import('../src/lib/renewal-rules');
const P = await import('../src/lib/renewal-package');
const M = await import('../src/lib/main-contract-store');
const B = await import('../src/lib/renewal-contract');
const T = await import('../src/lib/tickets-l0');
const { seedProducts } = await import('../src/lib/crm-products');
const { renderToString } = await import('react-dom/server');
const React = await import('react');
const { RenewalPackageCard, PackageChangeChip } = await import('../src/components/ps/renewal-package-card');

S.setRenewalDemo(true);
const terms = (o: Partial<import('../src/lib/renewal-rules').Terms> = {}) => ({ fee_amount: 10000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2026-01-01', end_date: '2026-12-31', ...o });
const reco = { type: 'KEEP' as const, band_min_pct: null, band_max_pct: null, reasons: [], inputs: {}, computed_at: '2026-10-28T00:00:00Z' };

describe('O-26 rules', () => {
  test('1 · keep package: evaluate unchanged (old terms → no approval)', () => {
    expect(R.evaluate(reco, terms(), terms(), 'SOFT_FORCE').approval_required).toBe(false);
    expect(R.evaluate(reco, terms(), terms(), 'SOFT_FORCE', 500, false).approval_required).toBe(false);
  });
  test('2 · package change needs PM approval + reason even when the fee rises', () => {
    const e = R.evaluate(reco, terms(), terms({ fee_amount: 14000 }), 'SOFT_FORCE', 500, true);
    expect(e.approval_required).toBe(true); expect(e.reason_required).toBe(true);
    const r = { ...S.latestRequestFor('RN-PK-MC2')!, status: 'DRAFT' as const, package_change_reason: null };
    expect(R.submit(r, 'SOFT_FORCE', true, '2026-10-28T00:00:00Z').ok).toBe(false);
    const ok = R.submit({ ...r, package_change_reason: { code: 'ลูกค้าใช้บริการไม่ครบ', text: '' } }, 'SOFT_FORCE', true, '2026-10-28T00:00:00Z');
    expect(ok.ok && ok.req.status).toBe('PENDING_APPROVAL');
  });
  test('3 · Marcom with 0 channels cannot be saved', () => {
    const oldL = [{ sku: 'MARCOM-MTH-GMB', name: 'GMB', unit_price: 3000, commission_rate: null, billing: 'monthly' as const }];
    expect(P.validatePackage('Marcom', seedProducts, oldL, [])).toBe('ต้องเลือกอย่างน้อย 1 ช่องทาง');
    const r = S.latestRequestFor('RN-PK-MC2')!;
    expect(S.updatePackage(r.id, []).ok).toBe(false);
  });
  test('4 · ORM Lite defaults to Monthly fee + Commission ฿3,900 + 5% (catalog D1)', () => {
    expect(P.ormLiteDefaults(seedProducts)).toEqual({ billing_model: 'FIXED_PLUS_COMMISSION', fixed_fee: 3900, commission_pct: 5 });
    const r = S.latestRequestFor('RN-PK-ORM1')!;
    expect(r.new_terms.billing_model).toBe('FIXED_PLUS_COMMISSION'); expect(r.new_terms.fee_amount).toBe(3900); expect(r.new_terms.commission_pct).toBe(5);
    expect(r.approval_required).toBe(true); expect(r.status).toBe('PENDING_APPROVAL');
  });
  test('5 · setup not charged again for existing channels; a new channel suggests setup', () => {
    const meta = { sku: 'MARCOM-MTH-META-LITE-CONTENT', name: 'Meta', unit_price: 4000, commission_rate: null, billing: 'monthly' as const };
    const tt = { sku: 'MARCOM-MTH-TIKTOK-LITE', name: 'TikTok', unit_price: 4000, commission_rate: null, billing: 'monthly' as const };
    expect(P.setupSuggestions(seedProducts, [meta], [meta])).toEqual([]);
    expect(P.setupSuggestions(seedProducts, [meta], [meta, tt]).map((s) => s.sku)).toEqual(['MARCOM-SETUP-TIKTOK']);
  });
  test('D2 · inactive KOL Travel is never offered, but kept as คงเดิม', () => {
    expect(P.marcomOptions(seedProducts).TikTok.some((p) => p.sku === 'MARCOM-ADDON-KOL-TRAVEL')).toBe(false);
    const kol = { sku: 'MARCOM-ADDON-KOL-TRAVEL', name: 'KOL', unit_price: 1000, commission_rate: null, billing: 'monthly' as const };
    const tt = { sku: 'MARCOM-MTH-TIKTOK-LITE', name: 'TikTok', unit_price: 4000, commission_rate: null, billing: 'monthly' as const };
    expect(P.validatePackage('Marcom', seedProducts, [kol, tt], [kol, tt])).toBeNull();
    expect(P.validatePackage('Marcom', seedProducts, [tt], [kol, tt])).toBe('บริการนี้ไม่มีใน Product Catalog');
  });
});

describe('O-26 signing', () => {
  test('6 · signed DEMO: new lines on the new contract, old contract unchanged, PACKAGE_CHANGE row', () => {
    const r = S.latestRequestFor('RN-PK-MC1')!;
    expect(r.status).toBe('SIGNED');
    const nc = M.mainContractById(r.new_contract_id!)!;
    expect(nc.start_date).toBe('2026-10-16');
    expect(nc.lines.filter((l) => l.billing === 'monthly').map((l) => l.sku_snapshot)).toEqual(['MARCOM-MTH-META-LITE-CONTENT', 'MARCOM-MTH-META-LITE-ADS', 'MARCOM-MTH-TIKTOK-LITE']);
    expect(nc.lines.filter((l) => l.billing === 'one_time').map((l) => l.sku_snapshot)).toEqual(['MARCOM-SETUP-TIKTOK']);
    expect(nc.monthly_value).toBe(12000);
    expect(M.mainContractById('CT-PK-MC1')!.lines.map((l) => l.sku_snapshot)).toEqual(['MARCOM-MTH-META-LITE-CONTENT', 'MARCOM-MTH-META-LITE-ADS']);
    expect(S.renewalHistory().filter((h) => h.renewal_request_id === r.id).map((h) => h.source)).toEqual(['PACKAGE_CHANGE']);
  });
  test('6b · ORM Lite build sets contract code ORM-LITE and the Lite line', () => {
    const r = S.latestRequestFor('RN-PK-ORM1')!;
    const b = B.buildRenewedContract(M.mainContractById('CT-PK-ORM1')!, { ...r, new_contract_id: 'X-1', signed_at: '2026-11-20T00:00:00Z' });
    expect(b.ok && b.contract.contract_code).toBe('ORM-LITE');
    expect(b.ok && b.contract.lines.map((l) => [l.sku_snapshot, l.unit_price, l.commission_rate])).toEqual([['ORM-MTH-LITE', 3900, 0.05]]);
  });
  test('7 · ORM → Lite sign creates exactly one ORM ticket (no duplicate)', () => {
    let r = S.latestRequestFor('RN-PK-ORM1')!;
    S.approveRequest(r.id, 'PM001-Alex', 'PM');
    const sent = S.createAndSendLink(r.id); expect(sent.ok).toBe(true);
    const o = S.signRequest(r.id); expect(o.ok).toBe(true);
    r = S.requestById(r.id)!;
    const list = () => T.ticketSnapshot().filter((t) => t.type === 'PACKAGE_OTA_ADJUST' && t.subject_ref.contract_id === r.new_contract_id);
    expect(list().length).toBe(1);
    expect(list()[0]!.target_dept).toBe('ORM');
    expect(list()[0]!.due_date).toBe('2026-12-31');
    expect(S.signRequest(r.id).ok).toBe(false); // already signed
    expect(list().length).toBe(1);
  });
  test('7b · signed ORM full → Lite → one PM Partner to-do + one bell item (stable key)', async () => {
    const W = await import('../src/lib/partner-workspace');
    const Bell = await import('../src/lib/bell-items');
    const sw = S.signedPackageSwitches().filter((s) => s.hotel_id === 'HTL0451');
    expect(sw.length).toBe(1); expect(sw[0]!.to).toBe('LITE'); expect(sw[0]!.start).toBe('2026-12-01');
    const empty = { partners: [], rate_cards: [], partner_deals: [], system_credit_requests: [], system_credit_usage: [], contract_partner_system: [], property_partner_system: [] } as any;
    const todos = W.partnerTodoItems(empty, [], '2026-11-25', 'today', 'PM', sw, true).filter((t) => t.kind === 'E');
    expect(todos.length).toBe(1);
    expect(todos[0]!.title).toBe('เปลี่ยนระบบ Partner ให้ตรงแพ็กเกจ ORM Lite · Chiang Rai Hill Lodge');
    expect(todos[0]!.sub).toContain('ระบบปัจจุบัน: ยังไม่ระบุระบบ · มีผล 1 Dec 26');
    expect(W.partnerTodoItems(empty, [], '2026-11-25', 'today', 'AE', sw, true).length).toBe(0);
    const bells = () => Bell.bellItems.all(true).filter((b) => b.key === `PKGSYS:${sw[0]!.contract_id}:2026-12-01`);
    expect(bells().length).toBe(1); expect(bells()[0]!.target_id).toBe('PM');
    // PM records a system after signing → to-do clears
    const done = { ...empty, property_partner_system: [{ id: 'x', property_id: 'HTL0451', partner_id: 'P1', system_name: 'Lite', effective_from: '2026-12-01', allotment: null, set_by: 'PM', set_at: '2099-01-01T00:00:00Z', note: null }] };
    expect(W.partnerTodoItems(done, [], '2026-11-25', 'today', 'PM', sw, true).filter((t) => t.kind === 'E').length).toBe(0);
  });
  test('7c · Lite → full = FULL; Marcom and full ↔ full never switch', async () => {
    const X = await import('../src/lib/partner-package-switch');
    const lite = [{ sku: 'ORM-MTH-LITE', name: 'Lite', unit_price: 3900, commission_rate: 0.05, billing: 'monthly' as const }];
    const full = [{ sku: 'ORM-MTH-FULL', name: 'Full', unit_price: 16000, commission_rate: 0.03, billing: 'monthly' as const, package_snapshot: 'ORM-MTH-FULL-SMART' }];
    const fixed = [{ ...full[0]!, package_snapshot: 'ORM-MTH-FULL-FIXED' }];
    expect(X.ormSystemSwitch(lite, full)).toBe('FULL');
    expect(X.ormSystemSwitch(full, fixed)).toBe(null);
    const meta = [{ sku: 'MARCOM-MTH-META', name: 'Meta', unit_price: 4000, commission_rate: null, billing: 'monthly' as const }];
    expect(X.ormSystemSwitch(meta, [...meta, { ...meta[0]!, sku: 'MARCOM-MTH-GMB' }])).toBe(null);
    expect(S.signedPackageSwitches().some((s) => s.hotel_id === 'HTL0452')).toBe(false); // Marcom DEMO signed case
  });
  test('9 · no raw product codes on the package card / chip', () => {
    const r = S.latestRequestFor('RN-PK-MC2')!;
    const html = renderToString(React.createElement('div', null, React.createElement(RenewalPackageCard, { req: r, editable: false }), React.createElement(PackageChangeChip, { req: r })));
    const text = html.replace(/<!-- -->/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/(ORM|MARCOM)-(MTH|SETUP|ADDON)/);
    expect(text).toMatch(/เปลี่ยนแพ็กเกจ: ?Meta \+ TikTok \+ Google ?→ ?Meta \+ Google/);
  });
});
