import { describe, expect, test as it } from 'bun:test';
import { buildDemoReport, DEMO_NOW } from '../src/lib/ps-demo-fixture';
import { DEFAULT_RISK_RULES, healthOf, latestPeriod, psScope, ratio } from '../src/lib/ps-dashboard-types';

const r = buildDemoReport(); const v = r.views; const now = new Date(DEMO_NOW);
const f = (service: 'ALL' | 'ORM' | 'Marcom') => ({ service, range: '3m' as const });
describe('PS demo fixture oracle (Demo Fixture Spec v1.0 §2)', () => {
  it('① In 2 / Out 2', () => {
    expect(psScope(v.v_ps_lifecycle_flow, f('ALL'), 'created_at', 0, now)).toHaveLength(2);
    expect(psScope(v.v_ps_lifecycle_flow, f('ALL'), 'inactivated_at', 0, now)).toHaveLength(2);
  });
  it('② churn 20 / 16.7 / 25 and Aug 0', () => {
    const c = (s: 'ALL' | 'ORM' | 'Marcom', shift = 0) => ratio(latestPeriod(psScope(v.v_ps_churn_monthly, f(s), 'billing_period', shift, now)), 'out_count', 'active_at_start');
    expect(c('ALL')).toBe(20); expect(c('ORM')!.toFixed(1)).toBe('16.7'); expect(c('Marcom')).toBe(25); expect(c('ALL', -1)).toBe(0);
  });
  it('④ median 730', () => {
    const a = v.v_ps_contract_lifetime.filter(x => x.status === 'INACTIVE').map(x => Number(x.age_days)).sort((x, y) => x - y);
    expect(a).toEqual([466, 730, 730, 933]);
  });
  it('⑦ tiers 3/2/3 and NPS +40', () => {
    const hotels = new Map(v.v_ps_account_health.map(h => [h.hotel_id, h]));
    const tiers = [...hotels.values()].map(h => healthOf(h, DEFAULT_RISK_RULES, now).tier);
    expect([tiers.filter(t => t === 'high').length, tiers.filter(t => t === 'watch').length, tiers.filter(t => t === 'healthy').length]).toEqual([3, 2, 3]);
    const n = v.v_ps_nps[0]!; expect((Number(n.promoters) - Number(n.detractors)) / Number(n.responses) * 100).toBe(40);
  });
});
