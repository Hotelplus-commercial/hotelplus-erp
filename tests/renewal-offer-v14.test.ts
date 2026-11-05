/* Contract Renewal v1.4 §11 — Renewal Offer engine, fee average, match, approval, demo oracle (values from the patch §9). */
import { describe, expect, mock, test } from 'bun:test';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const ss: Record<string, string> = {};
(globalThis as any).sessionStorage ??= { getItem: (k: string) => ss[k] ?? null, setItem: (k: string, v: string) => { ss[k] = v; }, removeItem: (k: string) => { delete ss[k]; } };

const E = await import('../src/lib/renewalOffer');
const F = await import('../src/lib/contract-fee-average');
const R = await import('../src/lib/renewal-rules');
const S = await import('../src/lib/renewal-store');
const cfg = R.DEFAULT_RENEWAL_CONFIG;

const fee = (p: Partial<import('../src/lib/renewalOffer').FeeAverage>) => ({ contract_id: 'C', model: 'FLAT' as const, months_used: 12, fixed_fee: 9000, commission_pct: null, guarantee_fee: null, avg_commission: null, avg_billed: 9000, guarantee_months: null, total_months: null, avg_revenue_base: null, last_price_change: null, insufficient: false, missing: [], ...p });
const rp = (p: Partial<import('../src/lib/renewalOffer').RepricingFacts> = {}) => ({ revenue_profile: 'stable', cadence: true, below_value: false, band_min_pct: 12, band_max_pct: 15, last_increase_at: null, ...p });
const run = (p: Partial<Parameters<typeof E.computeRenewalOffer>[0]>) => E.computeRenewalOffer({ service: 'ORM', fee: fee({}), repricing: rp(), health: { tier: 'G', red_by_own_overdue_only: false }, system_group1: [], overdue: { own: false, days: null }, cfg, computed_at: 'x', ...p });

describe('§2 type order', () => {
  test('1 · own overdue → KEEP even with 3 bad factors; red from own overdue is not a factor', () => {
    const o = run({ overdue: { own: true, days: 45 }, repricing: rp({ revenue_profile: 'declining' }), health: { tier: 'R', red_by_own_overdue_only: false }, system_group1: ['ราคาแพง'] });
    expect(o.type).toBe('KEEP'); expect(o.reasons[0]!.text).toContain('ค้างชำระ · ไม่แนะนำปรับค่าบริการ'); expect(o.hint).toContain('ORM Lite');
    expect(run({ health: { tier: 'R', red_by_own_overdue_only: true } }).factors.find((f) => f.key === 'HEALTH_RED')!.bad).toBe(false);
  });
  test('2 · AE ✎ labels never enter; a system group-1 label counts', () => {
    expect(run({ system_group1: [] }).type).toBe('RAISE');
    expect(run({ system_group1: ['ราคาแพงเกินผลงาน'] }).type).toBe('LOWER');
  });
  test('3 · any bad factor blocks RAISE even when cadence is reached', () => {
    expect(run({ repricing: rp({ revenue_profile: 'declining', cadence: true }) }).type).toBe('LOWER');
  });
});

describe('§2.3 values', () => {
  test('4 · FLAT raise: exact range, default midpoint to 100, min +500 (old ฿9,000 strong band)', () => {
    const o = run({ repricing: rp({ band_min_pct: 2, band_max_pct: 5 }) });
    const v = o.values[0]!; expect(v.min).toBeCloseTo(9180); expect(v.max).toBeCloseTo(9450); expect(v.default).toBe(9500);
    expect(run({ fee: fee({ fixed_fee: 25000, avg_billed: 25000 }) }).values[0]).toEqual({ key: 'fixed_fee', old: 25000, min: 28000, max: 28750, default: 28400 });
  });
  test('5 · FIXED_PLUS_COMMISSION raise +0.5 point; lower −8% to 100, commission unchanged', () => {
    const f = fee({ model: 'FIXED_PLUS_COMMISSION', fixed_fee: 8500, commission_pct: 8, avg_commission: 23500, avg_billed: 32000 });
    const up = run({ fee: f }); expect(up.values.find((x) => x.key === 'commission_pct')!.default).toBe(8.5);
    const dn = run({ fee: f, repricing: rp({ revenue_profile: 'declining' }) });
    expect(dn.values.find((x) => x.key === 'fixed_fee')!.default).toBe(7800); expect(dn.values.find((x) => x.key === 'commission_pct')).toMatchObject({ old: 8, default: 8 });
  });
  test('6 · COMMISSION_GUARANTEE raise 12% → 14–17% default 15.5%, guarantee unchanged; lower −1/−2/−3', () => {
    const f = fee({ model: 'COMMISSION_GUARANTEE', fixed_fee: null, commission_pct: 12, guarantee_fee: 8000, avg_commission: 9300, avg_billed: 9900 });
    const up = run({ fee: f });
    expect(up.values.find((x) => x.key === 'commission_pct')).toMatchObject({ min: 14, max: 17, default: 15.5 });
    expect(up.values.find((x) => x.key === 'guarantee_fee')).toMatchObject({ old: 8000, default: 8000 });
    const lower = (n: number) => run({ fee: f, repricing: rp({ revenue_profile: 'declining' }), health: { tier: n >= 2 ? 'R' : 'G', red_by_own_overdue_only: false }, system_group1: n >= 3 ? ['x'] : [] }).values.find((x) => x.key === 'commission_pct')!.default;
    expect([lower(1), lower(2), lower(3)]).toEqual([11, 10, 9]);
  });
});

describe('§2.4–2.6', () => {
  test('7 · expected average: Chiang Mai ฿31,300 · Baan Suan ฿28,400', () => {
    const cm = run({ fee: fee({ model: 'FIXED_PLUS_COMMISSION', fixed_fee: 8500, commission_pct: 8, avg_commission: 23500, avg_billed: 32000 }), repricing: rp({ revenue_profile: 'declining' }) });
    expect(cm.expected_avg).toBe(31300);
    expect(run({ fee: fee({ fixed_fee: 25000, avg_billed: 25000 }) }).expected_avg).toBe(28400);
  });
  test('8 · alternatives: rounding, current model excluded, none without revenue base', () => {
    const f = fee({ fixed_fee: 25000, avg_billed: 25000, avg_revenue_base: 380000 });
    const alts = E.packageAlternatives(f, 28400, cfg);
    expect(alts.map((a) => a.model)).toEqual(['FIXED_PLUS_COMMISSION', 'COMMISSION_GUARANTEE']);
    expect(alts[0]!.terms).toMatchObject({ fixed_fee: 8500, commission_pct: 5.5 });
    expect(alts[1]!.terms).toMatchObject({ commission_pct: 7.5, guarantee_fee: 22500 });
    expect(E.packageAlternatives(fee({}), 28400, cfg)).toEqual([]);
  });
  test('9 · matchOffer inside / above / below; LOWER offering old = ABOVE; switch within tolerance = MATCH', () => {
    const flat = run({ fee: fee({ fixed_fee: 25000, avg_billed: 25000, avg_revenue_base: 380000 }) });
    const t = (x: number) => ({ billing_model: 'FLAT' as const, fixed_fee: x, commission_pct: null, guarantee_fee: null });
    expect(E.matchOffer(flat, t(28500))).toBe('MATCH'); expect(E.matchOffer(flat, t(29000))).toBe('ABOVE'); expect(E.matchOffer(flat, t(27000))).toBe('BELOW');
    const f = fee({ model: 'FIXED_PLUS_COMMISSION', fixed_fee: 8500, commission_pct: 8, avg_commission: 23500, avg_billed: 32000 });
    const dn = run({ fee: f, repricing: rp({ revenue_profile: 'declining' }) });
    const fc = (x: number) => ({ billing_model: 'FIXED_PLUS_COMMISSION' as const, fixed_fee: x, commission_pct: 8, guarantee_fee: null });
    expect(E.matchOffer(dn, fc(7800))).toBe('MATCH'); expect(E.matchOffer(dn, fc(8500))).toBe('ABOVE'); expect(E.matchOffer(dn, fc(7000))).toBe('BELOW');
    const cg = run({ fee: fee({ model: 'COMMISSION_GUARANTEE', fixed_fee: null, commission_pct: 12, guarantee_fee: 8000, avg_commission: 9300, avg_billed: 9900 }) });
    const c = (x: number) => ({ billing_model: 'COMMISSION_GUARANTEE' as const, fixed_fee: null, commission_pct: x, guarantee_fee: 8000 });
    expect([E.matchOffer(cg, c(14)), E.matchOffer(cg, c(18)), E.matchOffer(cg, c(13))]).toEqual(['MATCH', 'ABOVE', 'BELOW']);
    const sw = { billing_model: 'FIXED_PLUS_COMMISSION' as const, fixed_fee: 8500, commission_pct: 5, guarantee_fee: null }; // 8,500 + 19,000 = 27,500 vs 28,400 → outside 568
    expect(E.matchOffer(flat, sw, fee({ fixed_fee: 25000, avg_billed: 25000, avg_revenue_base: 380000 }), cfg)).toBe('BELOW');
    expect(E.matchOffer(flat, { ...sw, commission_pct: 5.25 }, fee({ fixed_fee: 25000, avg_billed: 25000, avg_revenue_base: 380000 }), cfg)).toBe('MATCH');
  });
  test('10 · approval: model change → approval + reason; existing rows unchanged', () => {
    const old = { fee_amount: 25000, commission_pct: 0, term_months: 24, package: 'ORM Full', start_date: 'a', end_date: 'b', billing_model: 'FLAT' as const };
    const reco = { type: 'KEEP' as const, band_min_pct: null, band_max_pct: null, reasons: [], inputs: {}, computed_at: 'x' };
    const e = R.evaluate(reco, old, { ...old, billing_model: 'FIXED_PLUS_COMMISSION', fee_amount: 8500, commission_pct: 5.5 }, 'soft', 500);
    expect(e).toMatchObject({ approval_required: true, reason_required: true });
    expect(R.evaluate(reco, old, old, 'soft', 500).approval_required).toBe(false);
  });
});

describe('§1 fee average', () => {
  const months = (n: number, billed: (i: number) => number, g = (_: number) => false) => Array.from({ length: n }, (_, i) => ({ month: `20${25 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, billed: billed(i), commission: billed(i), guarantee_applied: g(i), revenue_base: null }));
  test('13 · 12 months; fewer uses all; guarantee months over life; missing recurring → insufficient + NONE', () => {
    const src = (m: ReturnType<typeof months>) => ({ contract_id: 'C', model: 'COMMISSION_GUARANTEE' as const, fixed_fee: null, commission_pct: 12, guarantee_fee: 8000, start: '2025-01-01', months: m });
    const a = F.feeAverageFrom(src(months(22, (i) => (i < 10 ? 0 : 100), (i) => i % 3 === 0)), '2026-11-02', 12);
    expect(a.months_used).toBe(12); expect(a.avg_billed).toBe(100); expect(a.total_months).toBe(22); expect(a.guarantee_months).toBe(8);
    expect(F.feeAverageFrom(src(months(5, () => 50)), '2026-11-02', 12).months_used).toBe(5);
    const none = F.feeAverageFrom(src([]), '2026-11-02', 12); expect(none.insufficient).toBe(true); expect(none.missing).toContain('recurring');
    expect(run({ fee: none }).type).toBe('NONE');
  });
});

describe('§9 DEMO oracle + §3/§7 snapshot', () => {
  S.setRenewalDemo(true);
  const ctx = (id: string) => S.offerContextForSource(S.sourceContractById(id)!);
  test('demo values', () => {
    const cm = ctx('CT-HTL0411'); expect(cm.fee.avg_commission).toBe(23500); expect(cm.offer.type).toBe('LOWER'); expect(cm.offer.expected_avg).toBe(31300); expect(cm.health).toMatchObject({ tier: 'R', change: 'down' });
    const bs = ctx('CT-HTL0412'); expect(bs.offer.type).toBe('RAISE'); expect(bs.offer.values[0]).toMatchObject({ min: 28000, max: 28750, default: 28400 }); expect(bs.fee.avg_revenue_base).toBe(380000);
    const hh = ctx('CT-HTL0413'); expect(hh.fee).toMatchObject({ avg_commission: 9300, avg_billed: 9900, guarantee_months: 7, total_months: 22 }); expect(hh.offer.type).toBe('RAISE');
    const aj = ctx('CT-HTL0414'); expect(aj.offer.type).toBe('LOWER'); expect(aj.offer.bad_count).toBe(3); expect(aj.offer.values[0]!.default).toBe(17000);
    const mk = ctx('CT-HTL0415'); expect(mk.offer.type).toBe('KEEP'); expect(mk.offer.reasons[0]!.text).toContain('45 วัน');
    const pb = ctx('CT-HTL0416'); expect(pb.fee.avg_commission).toBe(30000); expect(pb.offer.type).toBe('RAISE');
  });
  test('12 · seeded requests carry the snapshot + §7 fields', () => {
    const cm = S.latestRequestFor('RN-V14-CM')!; expect(cm.reco_snapshot.type).toBe('LOWER'); expect(cm.offer_match).toBe('MATCH'); expect(cm.status).toBe('LINK_SENT');
    const bs = S.latestRequestFor('RN-V14-BS')!; expect(bs.model_changed).toBe(true); expect(bs.offer_match).toBe('ABOVE'); expect(bs.approval_required).toBe(true);
    const hh = S.latestRequestFor('RN-V14-HH')!; expect(hh.offer_match).toBe('MATCH'); expect(hh.status).toBe('DRAFT');
    expect(S.latestRequestFor('RN-V14-AJ')).toBeNull();
  });
});
