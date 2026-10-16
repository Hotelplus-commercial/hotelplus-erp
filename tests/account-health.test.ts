import { describe, expect, test as it } from 'bun:test';
import { accountHealthOf, sortHealth } from '../src/lib/account-health';
import { buildDemoReport, DEMO_NOW } from '../src/lib/ps-demo-fixture';
const r = buildDemoReport(); const now = new Date(DEMO_NOW);
const of = (name: string) => { const rows = r.views.v_ps_account_health.filter(x => x.hotel_name === name); return accountHealthOf({ ...rows[0]!, has_orm_commission: rows.some(x => x.has_orm_commission === true) }, { now, roi: r.views.v_ps_roi, flow: r.views.v_ps_lifecycle_flow, ratioMin: 3 }); };
describe('Account Health 360', () => {
  it('compound hotel: Tier A + decline, red, top', () => {
    const h = of('Chaba Grand'); const codes = h.dims.map(d => d.code);
    expect(codes).toContain('TIER_A_PERSIST'); expect(codes).toContain('ROI_REV_DECLINE'); expect(codes).toContain('ROI_VALUE_LOW');
    expect(h.compound).toBe(true); expect(h.tier).toBe('high'); expect(h.score).toBe(h.dims.length);
    expect(sortHealth([of('Chaam Peumsuk'), of('Anjali'), h])[0]!.hotel_id).toBe(h.hotel_id);
  });
  it('healthy ORM and non-ORM N/A', () => {
    expect(of('Chaam Peumsuk').tier).toBe('healthy');
    const a = of('Anjali'); expect(a.hasOrm).toBe(false); expect(a.dims.some(d => d.code.startsWith('ROI'))).toBe(false);
  });
  it('TBD ratio threshold never flags', () => {
    const rows = r.views.v_ps_account_health.filter(x => x.hotel_name === 'Chaba Grand');
    const h = accountHealthOf({ ...rows[0]!, has_orm_commission: true }, { now, roi: r.views.v_ps_roi, flow: [], ratioMin: null });
    expect(h.dims.some(d => d.code === 'ROI_VALUE_LOW')).toBe(false);
  });
});
