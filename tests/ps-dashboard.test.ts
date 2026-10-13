import { describe, expect, it } from 'vitest';
import { DEFAULT_RISK_RULES, riskReasons, ratio, psScope } from '../src/lib/ps-dashboard-types';
describe('PS read-only reporting', () => {
  it('uses strict confirmed thresholds and OR risk', () => {
    expect(riskReasons({ latest_grade:'C' },DEFAULT_RISK_RULES)).toEqual(['Payment Grade']);
    expect(riskReasons({monthly_survey_score:7,monthly_billing:10000},DEFAULT_RISK_RULES)).toEqual([]);
    expect(riskReasons({monthly_billing:100000},DEFAULT_RISK_RULES)).toEqual([]);
    expect(riskReasons({monthly_survey_score:6.9,monthly_billing:100001},DEFAULT_RISK_RULES)).toHaveLength(2);
    expect(riskReasons({},DEFAULT_RISK_RULES)).toEqual([]);
  });
  it('supports edited rules without recomputing grade', () => {
    expect(riskReasons({latest_grade:'C',monthly_billing:12000},{...DEFAULT_RISK_RULES,grades:['D'],monthlyBillingBelow:15000})).toEqual(['ยอดวางบิล']);
  });
  it('keeps empty denominators empty', () => {
    expect(ratio([],'out','base')).toBeNull();
    expect(ratio([{out:1,base:4},{out:1,base:6}],'out','base')).toBe(20);
  });
  it('keeps per-service grain and unassigned only in ALL', () => {
    const rows = [{hotel_id:'same',service_line:'ORM',billing_period:'2026-10-01'}, {hotel_id:'same',service_line:'Marcom',billing_period:'2026-10-01'}, {service_line:null,billing_period:'2026-10-01'}, {service_line:'ORM',billing_period:'2026-09-01'}];
    const now = new Date('2026-10-13T00:00:00Z');
    expect(psScope(rows,{service:'ALL',range:'mtd'},'billing_period',0,now)).toHaveLength(3);
    expect(psScope(rows,{service:'ORM',range:'mtd'},'billing_period',0,now)).toHaveLength(1);
  });
});