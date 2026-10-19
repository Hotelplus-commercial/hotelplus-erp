import { describe, expect, test as it } from 'bun:test';
import { buildDemoReport, demoLifecycles, demoAcViews, demoOnboarding, DEMO_NOW } from '../src/lib/ps-demo-fixture';
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
    expect(ratio(v.v_ps_nps,'promoters','responses')! - ratio(v.v_ps_nps,'detractors','responses')!).toBe(40);
  });
});

import { defaultGlobalFilter, selectedPeriod, periodRange, scopePeriod, deltaText } from '../src/lib/ps-dashboard-global';
import { v_bdac_flow } from '../src/lib/bdac-views';
describe('v1.2 shared demo spine and comparison', () => {
 it('shares Won/In and exact headline grade oracle', () => {
  const flow=v_bdac_flow(demoLifecycles(),periodRange(selectedPeriod({...defaultGlobalFilter,range:'mtd'},now)));
  expect(flow.signed).toBe(2); expect(flow.won).toBe(2);
  const grades=demoAcViews()['v_ac_grade_distribution'] ?? [];
  // AC v2.0 fixture: 6 billing periods; the latest (Sep 26) is still open → no D rows.
  expect([...new Set(grades.map(r => String(r['billing_period'])))]).toHaveLength(6);
  expect(grades.filter(r => String(r['billing_period']) === '2026-09-01' && r['grade'] === 'D')).toHaveLength(0);
  expect(grades.filter(r => r['grade'] === 'A' || r['grade'] === 'B').length).toBeGreaterThan(0);
  expect(demoOnboarding().filter(c => !c.go_live_at)).toHaveLength(2);
  expect(demoOnboarding().filter(c => c.go_live_at)).toHaveLength(4);
 });
 it('applies owner AND and period to both sides without inventing missing history', () => {
  const f={...defaultGlobalFilter,role:'AE' as const,teams:['Nont'],people:['Nont'],compare:true};
  const owned=buildDemoReport(f);expect(owned.views.v_ps_renewal).toHaveLength(2);
  expect(owned.views.v_ps_lifecycle_flow.every(r => r['ae_owner_id'] === 'Nont')).toBe(true);
  expect(scopePeriod(owned.views.v_ps_renewal,f,f.periodB,'renewal_due_date')).toHaveLength(0);
  expect(deltaText(20,0,'pp')).toBe('Δ ▲ +20 จุด');expect(deltaText(20,null,'pp')).toBe('Δ —');
 });
});
