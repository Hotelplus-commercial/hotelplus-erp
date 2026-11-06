import { describe, expect, test } from 'bun:test';
import { guaranteeCharge, reportDeadline } from '../src/lib/ac-guarantee';
import { guaranteeDemoInvoices } from '../src/lib/ac-guarantee-demo';
import { renewalAcNotices } from '../src/lib/renewal-ac-notice';
import { MEETING_DEMO_NOW } from '../src/lib/meeting-dashboard-demo';
import { DEMO_DAY } from '../src/lib/demo-session';
import { readFileSync } from 'node:fs';

describe('DF2 · AC-G1 Guarantee minimum', () => {
  test('commission 8,000 / Guarantee 10,000 → 10,000', () => expect(guaranteeCharge(8000, 10000).amount).toBe(10000));
  test('commission 12,000 → 12,000', () => expect(guaranteeCharge(12000, 10000).amount).toBe(12000));
  test('no report → Guarantee 10,000', () => { const g = guaranteeCharge(null, 10000); expect(g.amount).toBe(10000); expect(g.text).toBe('ไม่มี Production Report → เรียกเก็บขั้นต่ำ Guarantee ฿10,000'); });
  test('breakdown text', () => expect(guaranteeCharge(8000, 10000).text).toBe('ค่าคอม ฿8,000 · ขั้นต่ำ Guarantee ฿10,000 → เรียกเก็บ ฿10,000'));
  test('drop deadline = 3rd of next month', () => { expect(reportDeadline('2026-09-01')).toBe('2026-10-03'); expect(reportDeadline('2026-12-01')).toBe('2027-01-03'); });
  test('engine bills the three DEMO cases', () => {
    expect(guaranteeDemoInvoices().map((r) => r.invoice?.totals.subtotal)).toEqual([12000, 10000, 10000]);
  });
  test('Guarantee notice no longer shown', () => {
    const c = { contract_id: 'X', renewal_of: 'Y', billing_model: 'COMMISSION_GUARANTEE', guarantee_fee: 10000, start_date: '2026-01-01', live_link_signed_at: null, customer_snapshot: { hotel_name: 'H' } };
    expect(renewalAcNotices([c as never]).filter((n) => n.kind === 'GUARANTEE')).toHaveLength(0);
  });
});

describe('DF6 · Meeting & Survey uses the shared DEMO date', () => {
  test('no fixed DEMO date', () => {
    expect(MEETING_DEMO_NOW).toBe(DEMO_DAY);
    expect(readFileSync('src/lib/meeting-dashboard-demo.ts', 'utf8')).not.toContain('2026-09-30T');
  });
});
