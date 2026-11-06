/* PR-O1 §8 DEMO (add only, in memory): service month ก.ย. 69 (2026-09), today = DEMO_DAY 28 ต.ค. 69 (cut-off 3 Oct passed).
 * DEMO sample hotels and revenue. G-DEMO-3 = the DF2 commission + Guarantee example with no report. */
import { emptyRow, prKey, type PrContract, type PrDropRow } from './pr-drop';

export const PR_DEMO_MONTH = '2026-09';
const orm = (id: string, hotel: string, caretaker: string, team: string, rate: number | null): PrContract => ({
  contract_id: id, hotel_id: `HP-${id}`, hotel, service: 'ORM', start: '2026-01-01', term_end: '2026-12-31',
  commission_sku: rate != null ? 'ORM-MTH-FULL' : null, commission_rate: rate, caretaker, team,
});
const mk = (id: string, hotel: string, caretaker: string): PrContract => ({
  contract_id: id, hotel_id: `HP-${id}`, hotel, service: 'Marcom', start: '2026-02-01', term_end: '2027-01-31', commission_sku: null, commission_rate: null, caretaker, team: 'Marcom',
});
export const PR_DEMO_CONTRACTS: PrContract[] = [
  orm('PRD-O1', 'DEMO · Lanna Garden Hotel', 'ต้น', 'ORM ทีม A', 0.03),
  orm('PRD-O2', 'DEMO · Krabi Bay Resort', 'ต้น', 'ORM ทีม A', 0.05),
  orm('PRD-O3', 'DEMO · Phuket Sands', 'ฝน', 'ORM ทีม B', 0.03),
  orm('PRD-O4', 'DEMO · Hua Hin Breeze', 'ฝน', 'ORM ทีม B', 0.04),
  orm('PRD-O5', 'DEMO · Korat Grand', 'ต้น', 'ORM ทีม A', 0.03),
  orm('PRD-O6', 'DEMO · Chiang Mai Old Town Inn', 'ฝน', 'ORM ทีม B', null),
  { ...orm('G-DEMO-3', 'DEMO · ไม่มี Production Report', 'ต้น', 'ORM ทีม A', 0.1), start: '2026-01-01', term_end: '2027-12-31' },
  mk('PRD-M1', 'DEMO · Siam Loft', 'แนน'),
  mk('PRD-M2', 'DEMO · Samui Palm Villa', 'บิว'),
  mk('PRD-M3', 'DEMO · Pattaya Sky', 'แนน'),
];
const file = (id: string, at: string, v = 1) => ({ ref: `DEMO-${id}-v${v}`, name: `ProductionReport_${id}_Sep69${v > 1 ? `_v${v}` : ''}.pdf`, size: 420_000, at, version: v });
const row = (id: string, p: Partial<PrDropRow>): PrDropRow => ({ ...emptyRow(id, PR_DEMO_MONTH), ...p });
/** Already billed in DEMO (วางบิลแล้ว). */
export const PR_DEMO_BILLED = new Set([prKey('PRD-O4', PR_DEMO_MONTH)]);
export const prDemoRows = (): PrDropRow[] => [
  // 1 customer confirmed + sent → พร้อมวางบิล
  row('PRD-O1', { sent_customer_at: '2026-10-01', customer: 'CONFIRMED', customer_at: '2026-10-02', files: [file('O1', '2026-10-02T04:00:00Z')], sent_ac_at: '2026-10-02T04:00:00Z', revenue_thb: 900_000 }),
  // 2 sent, no reply → ลูกค้ายืนยัน (อัตโนมัติ)
  row('PRD-O2', { sent_customer_at: '2026-10-01', files: [file('O2', '2026-10-02T05:00:00Z')], sent_ac_at: '2026-10-02T05:00:00Z', revenue_thb: 640_000 }),
  // 3 open dispute
  row('PRD-O3', { sent_customer_at: '2026-10-01', customer: 'DISPUTED', customer_at: '2026-10-02', dispute_reason: 'ลูกค้าแจ้งยอดห้องพักซ้ำ 2 รายการ', files: [file('O3', '2026-10-01T08:00:00Z')] }),
  // 7 billed (customer confirmed, AC billed)
  row('PRD-O4', { sent_customer_at: '2026-10-01', customer: 'CONFIRMED', customer_at: '2026-10-01', files: [file('O4', '2026-10-01T09:00:00Z')], sent_ac_at: '2026-10-01T09:00:00Z', revenue_thb: 1_200_000 }),
  // 4 AC sent back
  row('PRD-O5', { sent_customer_at: '2026-10-01', customer: 'CONFIRMED', customer_at: '2026-10-02', files: [file('O5', '2026-10-02T03:00:00Z')], sent_ac_at: '2026-10-02T03:00:00Z', revenue_thb: 510_000, returned_at: '2026-10-06T02:00:00Z', return_reason: 'ไฟล์เป็นเดือน ส.ค. ไม่ใช่ ก.ย.' }),
  // 5 PRD-O6: nothing recorded → เลยตัดรอบ (red)
  // 8 G-DEMO-3: nothing recorded → Guarantee billed (DF2)
  // 6 Marcom ready (file only)
  row('PRD-M1', { sent_customer_at: '2026-10-01', customer: 'CONFIRMED', customer_at: '2026-10-02', files: [file('M1', '2026-10-02T06:00:00Z')], sent_ac_at: '2026-10-02T06:00:00Z' }),
  row('PRD-M2', { sent_customer_at: '2026-10-02', files: [file('M2', '2026-10-03T02:00:00Z')], sent_ac_at: '2026-10-03T02:00:00Z' }),
  // PRD-M3: not sent → late
];
