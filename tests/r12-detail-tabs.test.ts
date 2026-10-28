/* MD Review R1.2 · Detail tabs — rule tests (values taken from the patch spec + demo fixture §8). */
import { describe, expect, test } from 'bun:test';
import { DASHBOARD_TABS } from '../src/lib/ps-glossary';
import { buildDemoReport, demoAcViews, DEMO_NOW } from '../src/lib/ps-demo-fixture';
import { contractAgeMonths, costLines, costSummary, gradeCustomers, toCostRows, type CostRow } from '../src/lib/ac-contract-cost';
import { debtorRows } from '../src/lib/ac-revenue';
import { accountHealthOf, DEMO_VALUE_RATIO_MIN, pendingWorkOf, riskRuleText } from '../src/lib/account-health';
import { isRecurringService, psScope } from '../src/lib/ps-dashboard-types';
import { priceDiff } from '../src/lib/renewal-price-diff';
import { backfillContracts, preMeetingBacklog, prefillContract, recentMeetings, type ServiceContractRef } from '../src/lib/ticket-links';
import { taskDemo, demoCareHotels, demoServiceContracts, demoTaskMeetings, TASK_DEMO_NOW } from '../src/lib/task-demo';
import { SEED_CATEGORIES } from '../src/lib/task-tickets';
import { getWorklist, sourceSplit } from '../src/lib/task-worklist';
import { workload, workloadPeople, indexActivity } from '../src/lib/task-history';

const now = new Date(DEMO_NOW);

describe('§1 tab order', () => {
  test('labels left → right, stored keys unchanged (BD-AC moved to The Office APP)', () => {
    expect(DASHBOARD_TABS.map(([, l]) => l)).toEqual(['ต่อสัญญา & ราคา', 'ลูกหนี้ & ค่าใช้จ่ายรายสัญญา', 'Meeting & Survey', 'ติดตามงานผู้ให้บริการ', 'On-board']);
    expect(DASHBOARD_TABS.map(([k]) => k)).toEqual(['ps', 'ac', 'meeting', 'task', 'servicing']);
  });
});

describe('§2 ลูกหนี้ & ค่าใช้จ่ายรายสัญญา', () => {
  test('merged debtor card total = old ⑧ overdue (write-off and paused excluded)', () => {
    const list = debtorRows(demoAcViews()['v_ac_debtors'] ?? []);
    const total = list.filter(r => r.status !== 'WRITTEN_OFF' && r.status !== 'PAUSED').reduce((s, r) => s + r.outstanding, 0);
    expect(total).toBe(276000);
    expect(list.filter(r => r.status === 'WRITTEN_OFF')).toHaveLength(1);
    expect(list.filter(r => r.status === 'PAUSED')).toHaveLength(1);
  });
  test('contract age = full calendar months from start to end of selected month', () => {
    expect(contractAgeMonths('2025-03-10', '2026-09')).toBe(18);
    expect(contractAgeMonths('2026-09-01', '2026-09')).toBe(1);
    expect(contractAgeMonths('2026-09-15', '2026-09')).toBe(0);
    expect(contractAgeMonths(null, '2026-09')).toBeNull();
  });
  const row = (p: Partial<CostRow>): CostRow => ({ contract_id: 'CT-1', service: 'ORM', month: '2026-09', hotel_id: 'H1', hotel_name: 'Hotel B', customer_id: 'C1', customer_name: 'Cust', fee_thb: 0, commission_thb: 0, guarantee_applied: false, has_bill: true, combined_bill: false, contract_start: '2026-07-01', contract_active: true, ae_owner_id: null, caretaker: null, grade_latest: 'A', grade_worst6: 'A', ...p });
  test('one row per service contract; lifetime monthly = billed sum ÷ billed months; Δ vs previous month', () => {
    const rows = [
      row({ month: '2026-07', fee_thb: 10000 }), row({ month: '2026-08', fee_thb: 10000 }), row({ month: '2026-09', fee_thb: 13000 }),
      row({ service: 'Marcom', month: '2026-08', has_bill: false }), row({ service: 'Marcom', month: '2026-09', fee_thb: 5000 }),
      row({ contract_id: 'CT-2', hotel_name: 'Hotel A', month: '2026-09', commission_thb: 80000, guarantee_applied: true }),
    ];
    const lines = costLines(rows, '2026-09');
    expect(lines.map(l => `${l.hotel_name}|${l.service}`)).toEqual(['Hotel A|ORM', 'Hotel B|Marcom', 'Hotel B|ORM']); // hotel A–Z only
    const orm = lines.find(l => l.contract_id === 'CT-1' && l.service === 'ORM')!;
    expect(orm.lifetime_monthly).toBe(11000);
    expect(orm.delta_prev).toBe(3000);
    expect(orm.delta_yoy).toBeNull();
    expect(lines.find(l => l.service === 'Marcom')!.delta_prev).toBeNull();
    const g = lines.find(l => l.contract_id === 'CT-2')!;
    expect([g.fee, g.commission, g.guarantee]).toEqual([null, 80000, true]);
    expect(costSummary(lines)).toMatchObject({ billed: 3, up: 1, same: 0, down: 0, noPrev: 2 });
  });
  test('demo §8: 170 service contracts in Sep 26, 13 months, บิลรวม 2 rows, one Guarantee row', () => {
    const rows = toCostRows(demoAcViews()['v_ac_contract_cost_monthly']);
    expect(new Set(rows.map(r => r.month)).size).toBe(13);
    const lines = costLines(rows, '2026-09');
    expect(lines).toHaveLength(170);
    expect(lines.filter(l => l.combined_bill)).toHaveLength(2);
    expect(lines.filter(l => l.guarantee)).toHaveLength(1);
    expect(lines.filter(l => l.delta_yoy != null).length).toBeGreaterThan(12);
  });
  test('grade list = stored per-customer grade; Sep 26 counts equal ⑥ totals (A 92 · B 35 · C 15 · D 0)', () => {
    const cs = gradeCustomers(toCostRows(demoAcViews()['v_ac_contract_cost_monthly']), '2026-09');
    expect(['A', 'B', 'C', 'D'].map(g => cs.filter(c => c.grade_latest === g).length)).toEqual([92, 35, 15, 0]);
    expect(cs.filter(c => c.contracts.length > 1).length).toBeGreaterThan(0);
  });
});

describe('§3 ต่อสัญญา & ราคา', () => {
  const v = buildDemoReport().views;
  test('In / Out counts recurring services only (demo: raw 4 / 3 → 2 / 2)', () => {
    const f = { service: 'ALL' as const, range: 'mtd' as const };
    expect(psScope(v.v_ps_lifecycle_flow, f, 'created_at', 0, now)).toHaveLength(4);
    expect(psScope(v.v_ps_lifecycle_flow, f, 'created_at', 0, now).filter(isRecurringService)).toHaveLength(2);
    expect(psScope(v.v_ps_lifecycle_flow, f, 'inactivated_at', 0, now).filter(isRecurringService)).toHaveLength(2);
    expect(isRecurringService({ service_line: 'SYSTEM_FEE' })).toBe(true);
    expect(isRecurringService({ service_line: 'ORM', billing_kind: 'ONE_TIME' })).toBe(false);
    expect(isRecurringService({ service_line: 'Production' })).toBe(false);
  });
  test('PI Form incomplete and renewal ≤ 60 days are not risk dimensions', () => {
    const tier = (name: string) => { const rows = v.v_ps_account_health.filter(r => r.hotel_name === name); return accountHealthOf({ ...rows[0]!, completeness: 'incomplete', end_date: '2026-10-15' }, { now, roi: v.v_ps_roi, flow: v.v_ps_lifecycle_flow, ratioMin: DEMO_VALUE_RATIO_MIN }); };
    expect(tier('Baan Talay').tier).toBe('healthy');
    expect(tier('Baan Talay').score).toBe(0);
    expect(riskRuleText(null).dims.map(d => d.label)).not.toContain('Property Information Form ไม่ครบ');
    expect(riskRuleText(null).tiers).toHaveLength(3);
  });
  test('งานค้างของสัญญา: demo PI incomplete 3 contracts; renewal ≤ 60 days not started', () => {
    const w = pendingWorkOf({ health: v.v_ps_account_health, lifetime: v.v_ps_contract_lifetime, renewals: v.v_ps_renewal, flow: v.v_ps_lifecycle_flow, now });
    expect(w.pi.map(p => `${p.hotel_name}/${p.service_line}`)).toEqual(['Baan Suan/Marcom', 'Baan Talay/ORM', 'Dusit Pool Villa/ORM']);
    expect(w.renew).toHaveLength(0); // the only contract ending ≤ 60 days (Baan Talay) already renewed
    const life = [{ contract_id: 'X1', hotel_id: 'H', hotel_name: 'H', service_line: 'ORM', status: 'ACTIVE', end_date: '2026-10-20' }, { contract_id: 'X2', hotel_id: 'H2', hotel_name: 'H2', service_line: 'ORM', status: 'ACTIVE', end_date: '2026-10-25' }];
    const w2 = pendingWorkOf({ health: [], lifetime: life, renewals: [{ contract_id: 'X2', outcome: 'IN_PROGRESS', renewal_due_date: '2026-10-25' }], flow: [], now });
    expect(w2.renew.map(r => r.key)).toEqual(['X1']);
  });
  test('renewal price: previous cycle → RENEWAL per term, empty terms hidden', () => {
    const h = [
      { contract_id: 'A', cycle_no: 1, fee_amount: 50000, commission_pct: null, source: 'INITIAL' as const },
      { contract_id: 'A', cycle_no: 2, fee_amount: 52500, commission_pct: 0, source: 'RENEWAL' as const },
      { contract_id: 'B', cycle_no: 1, fee_amount: null, commission_pct: 8, guarantee_amount: 25000, source: 'INITIAL' as const },
      { contract_id: 'B', cycle_no: 2, fee_amount: null, commission_pct: 6.5, guarantee_amount: 25000, source: 'RENEWAL' as const },
      { contract_id: 'C', cycle_no: 1, fee_amount: 30000, source: 'INITIAL' as const },
    ];
    expect(priceDiff(h, 'A')).toEqual({ status: 'OK', terms: [{ key: 'fee', label: 'ค่าบริการ', old: 50000, next: 52500, dir: 'up' }] });
    const b = priceDiff(h, 'B');
    expect(b.status === 'OK' && b.terms.map(t => `${t.key}:${t.dir}`)).toEqual(['commission:down', 'guarantee:same']);
    expect(priceDiff(h, 'C')).toEqual({ status: 'NO_RENEWAL' });
  });
});

describe('§5 ticket links + pre-meeting backlog', () => {
  const care = demoCareHotels(), contracts = demoServiceContracts(care), fx = taskDemo(SEED_CATEGORIES, care);
  const rows = getWorklist(fx.cases, fx.tickets, SEED_CATEGORIES, care, TASK_DEMO_NOW);
  const tnow = new Date(TASK_DEMO_NOW);
  test('pre-fill only when exactly one active contract matches the service', () => {
    const list: ServiceContractRef[] = [
      { contract_id: 'K1', hotel_id: 'H', hotel_name: 'H', service: 'ORM', active: true },
      { contract_id: 'K2', hotel_id: 'H', hotel_name: 'H', service: 'Marcom', active: true },
      { contract_id: 'K3', hotel_id: 'H', hotel_name: 'H', service: 'ORM', active: false },
    ];
    expect(prefillContract(list, 'H', 'ORM')).toBe('K1');
    expect(prefillContract(list, 'H', 'MARCOM')).toBe('K2');
    expect(prefillContract(list, 'H', 'PS')).toBeNull(); // two active contracts → creator picks
  });
  test('demo backfill: 33 cases linked, 1 left null (Chaba Grand PS has two contracts)', () => {
    const r = backfillContracts(fx.cases.map(c => ({ ...c, contract_id: null })), contracts);
    expect([r.linked, r.nulls]).toEqual([33, 1]);
    expect(fx.cases.find(c => c.case_no === 'Case-000017')!.contract_id).toBeNull();
  });
  test('meeting picker = that hotel\'s meetings in the last 60 days', () => {
    expect(recentMeetings(demoTaskMeetings(), 'DEMO-CHAAM-PEUMSUK', tnow).map(m => m.meeting_id)).toEqual(['MT-CHAAM-09']);
  });
  test('source chip: meeting-linked cases show จากการประชุม', () => {
    expect(rows.filter(r => r.origin === 'MEETING').map(r => r.work_id).sort()).toEqual(['Case-000008', 'Case-000011', 'Case-000014']);
    expect(sourceSplit(rows.filter(r => r.status_group !== 'CLOSED'))).toContain('จากการประชุม 3');
  });
  test('pre-meeting 14 days: 3 contracts; previous-meeting tickets first; clear contract kept', () => {
    const g = preMeetingBacklog({ meetings: demoTaskMeetings(), contracts, rows, now: tnow, days: 14 });
    expect(g.map(x => x.hotel_name)).toEqual(['Chaam Peumsuk', 'Anjali', 'Dusit Pool Villa']);
    expect(g[0]!.items.filter(i => i.fromPrev).map(i => i.row.work_id)).toEqual(['Case-000008', 'Case-000014']);
    expect(g[0]!.items[0]!.fromPrev && g[0]!.items[1]!.fromPrev).toBe(true);
    expect(g[2]!.items).toHaveLength(0);
    expect(preMeetingBacklog({ meetings: demoTaskMeetings(), contracts, rows, now: tnow, days: 7 })).toHaveLength(1);
    expect(preMeetingBacklog({ meetings: demoTaskMeetings(), contracts, rows, now: tnow, days: 30 })).toHaveLength(4);
  });
  test('workload person drill-down sums to the team "ค้างตอนนี้"', () => {
    const acts = indexActivity(fx.activity);
    const p = { from: '2026-10-01', to: '2026-10-17' };
    for (const team of workload('ORM', rows, acts, care, p)) {
      const ppl = workloadPeople('ORM', team.key, rows, care);
      expect(ppl.reduce((s, x) => s + x.openNow, 0)).toBe(team.openNow);
      expect(ppl.map(x => x.openNow)).toEqual([...ppl.map(x => x.openNow)].sort((a, b) => b - a));
    }
  });
});
