import { describe, expect, test } from 'bun:test';
import { latestGradeD } from '../src/lib/ac-revenue';
import { demoAcViews, buildDemoReport } from '../src/lib/ps-demo-fixture';
import { shiftPeriodMonths, psScope } from '../src/lib/ps-dashboard-types';
import { defaultGlobalFilter, selectedPeriod, validCustomRange } from '../src/lib/ps-dashboard-global';
import { sourceSplit, type WorkRow } from '../src/lib/task-worklist';
import { ticketTypeTh, ticketStatusTh, phaseTh, plainSv } from '../src/lib/ps-glossary';

describe('MD Review R1 rules', () => {
  test('[top1-6] tile 7 grade D = AC ⑥: latest billing period inside the range only', () => {
    const rows = demoAcViews()['v_ac_grade_distribution'] ?? [];
    const sep = latestGradeD(rows, { from: '2026-04-01', to: '2026-09-30' }, 'ALL');
    expect(sep?.period).toBe('2026-09');
    expect(sep?.d).toBe(0);
    const allD = rows.filter(r => r['grade'] === 'D').reduce((s, r) => s + Number(r['customer_count']), 0);
    expect(allD).toBe(29); // the old tile summed D across all 6 periods
  });
  test('[top1-1] year-ago presets shift by 12 months, end-of-month safe', () => {
    expect(shiftPeriodMonths({ from: '2026-09-01', to: '2026-09-30' }, -12)).toEqual({ from: '2025-09-01', to: '2025-09-30' });
    expect(shiftPeriodMonths({ from: '2024-02-01', to: '2024-02-29' }, -12)).toEqual({ from: '2023-02-01', to: '2023-02-28' });
  });
  test('[top1-1] custom range: end ≥ start, max 24 months, drives psScope like a preset', () => {
    expect(validCustomRange({ from: '2026-09-10', to: '2026-09-01' })).toBe(false);
    expect(validCustomRange({ from: '2024-09-01', to: '2026-09-01' })).toBe(true);
    expect(validCustomRange({ from: '2024-09-01', to: '2026-09-02' })).toBe(false);
    const f = { ...defaultGlobalFilter, range: 'custom' as const, customPeriod: { from: '2026-08-01', to: '2026-08-31' } };
    expect(selectedPeriod(f, new Date('2026-09-30'))).toEqual(f.customPeriod);
    const v = buildDemoReport().views.v_ps_churn_monthly;
    expect(new Set(psScope(v, f, 'billing_period').map(r => r.billing_period))).toEqual(new Set(['2026-08-01']));
  });
  test('[top1-1] demo has year-ago B data for churn, cohort and renewal', () => {
    const v = buildDemoReport().views;
    expect(v.v_ps_churn_monthly.some(r => r.billing_period === '2025-09-01')).toBe(true);
    expect(v.v_ps_onboard_cohort.some(r => r.billing_period === '2025-09-01')).toBe(true);
    expect(v.v_ps_renewal.filter(r => String(r.renewal_due_date).startsWith('2025-09'))).toHaveLength(4);
  });
  test('[tk2-2] source split sums to the total and drops zero parts', () => {
    const row = (origin: WorkRow['origin']) => ({ origin } as WorkRow);
    expect(sourceSplit([row('PS_CASE'), row('PS_CASE'), row('BOT')])).toBe('PS เปิดเอง 2 · ระบบสร้าง 1');
  });
  test('glossary: types, statuses, phases, plain servicing words', () => {
    expect(ticketTypeTh('SERVICING_STALL')).toBe('On-board ค้างเกินกำหนด');
    expect(ticketStatusTh('ACK')).toBe('กำลังทำ');
    expect(ticketStatusTh('waiting', 'CUSTOMER')).toBe('รอลูกค้า');
    expect(ticketStatusTh('waiting', 'INTERNAL', 'รอภายใน')).toBe('รอ · รอภายใน');
    expect(phaseTh('P2')).toBe('ช่วงเตรียมระบบ');
    expect(plainSv('เกิน SLA แล้ว 2 วัน')).toBe('เลยกำหนด 2 วัน');
    expect(plainSv('เหลือเวลาอีก 3 วันของ SLA')).toBe('อีก 3 วันถึงกำหนด');
  });
});

import { renewalWizardDealId, wizardPathRedirects } from '../src/lib/renewal-wizard';
import { aeNameTh } from '../src/lib/ps-glossary';
import { readFileSync } from 'node:fs';
describe('MD Review R1.1', () => {
  const deals = [{ deal_id: 'D-1', hotel_id: 'HTL0042', hotel_name: 'Grand Palace Bangkok' }, { deal_id: 'D-2', hotel_id: null, hotel_name: 'Riverside Krabi' }];
  test('(a) renewal card → Generate contract opens the wizard on the hotel\'s existing deal', () => {
    expect(renewalWizardDealId({ hotelId: 'HTL0042', hotel: 'X' }, deals)).toBe('D-1');
    expect(renewalWizardDealId({ hotelId: 'HTL0102', hotel: 'Riverside Krabi' }, deals)).toBe('D-2');
    // Renewal v1.0 supersedes the card button: it now opens renewal mode with contract_id (tests/renewal-rules.test.ts).
  });
  test('(b) bare /ps/contract-wizard/ redirects to Contract Dashboard', () => {
    expect(wizardPathRedirects('/ps/contract-wizard/')).toBe(true);
    expect(wizardPathRedirects('/ps/contract-wizard')).toBe(true);
    expect(readFileSync('src/routes/ps.contract-wizard.index.tsx', 'utf8')).toContain('to: "/ps/contract-dashboard"');
  });
  test('(c) /ps/contract-wizard/{id} does not redirect', () => {
    expect(wizardPathRedirects('/ps/contract-wizard/D-47312')).toBe(false);
    expect(wizardPathRedirects('/ps/contract-wizard/new', '?quote_id=Q1')).toBe(false);
    const r = readFileSync('src/routes/ps.contract-wizard.$dealId.tsx', 'utf8');
    expect(r).not.toContain('redirect');
    expect(r).toContain('<ContractWizard');
  });
  test('Meeting ⑤ AE names, missing → ไม่พบชื่อ AE; no "ไม่ใช่ NPS"', () => {
    expect(aeNameTh('AE001-Nont')).toBe('Nont');
    expect(aeNameTh('Fern')).toBe('Fern');
    expect(aeNameTh(null)).toBe('ไม่พบชื่อ AE');
    expect(readFileSync('src/components/ps/meeting-analyzer-tab.tsx', 'utf8')).not.toContain('ไม่ใช่ NPS');
  });
});
