import { describe, expect, test as it } from 'bun:test';
import { buildDemoReport } from '../src/lib/ps-demo-fixture';
import { crossSellList, repricingList } from '../src/lib/expansion';
const v = buildDemoReport().views;
const cs = crossSellList(v.v_ps_crosssell), rp = repricingList(v.v_ps_repricing);
const name = (r: { hotel_name?: unknown }) => r.hotel_name;
describe('Expansion demo oracle', () => {
  it('cross-sell: prime top, nurture, save-first absent', () => {
    expect(name(cs[0]!)).toBe('Chaam Peumsuk'); expect(cs[0]!.is_prime).toBe(true); expect(cs[0]!.readiness_tier).toBe('ready');
    expect(cs.some(r => r.readiness_tier === 'nurture')).toBe(true);
    expect(cs.map(name)).not.toContain('Dusit Pool Villa');
    expect(v.v_ps_crosssell.find(r => r.hotel_name === 'Dusit Pool Villa')?.gate_pass).toBe(false);
  });
  it('repricing: cadence ceiling, signal floor, declining/no-fixed absent, pending badge', () => {
    const by = (h: string) => rp.find(r => r.hotel_name === h);
    expect(by('Baan Suan')).toMatchObject({ trigger: 'cadence', band_min_pct: 12 });
    expect(by('Chaam Peumsuk')).toMatchObject({ trigger: 'signal', band_min_pct: 3 });
    expect(by('Chaba Grand')).toBeUndefined();
    expect(v.v_ps_repricing.find(r => r.hotel_name === 'Dusit Pool Villa')).toBeUndefined();
    expect(by('Seefah')).toMatchObject({ trigger_pending: true, suggested_min_thb: null });
  });
});
