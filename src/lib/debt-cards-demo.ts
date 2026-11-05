/* Debt Partner R1.1 §11 DEMO (add only) for cards ① ②. Mirrors ps_dashboard_tab_debt_partner_r2.html.
 * DEMO date = DEMO_DAY (28 Oct 2569); period Oct 26 is open. In memory only; markDemoInvoicePaid() is the only mutator. */
import type { DebtRowR, Grade, GradeRowR, PaidInv, Svc, TicketLite } from './debt-cards';

const NAMED: Record<number, { hotel: string; service: Svc; ae: string | null }> = {
  0: { hotel: 'Chaba Grand', service: 'ORM', ae: 'Nont' },
  1: { hotel: 'Sala Riverside Hotel', service: 'ORM', ae: 'Ploy' },
  2: { hotel: 'Sala Talay Resort', service: 'ORM', ae: 'Ploy' },
  3: { hotel: 'Dusit Pool Villa', service: 'ORM', ae: 'Dao' },
  4: { hotel: 'Anjali', service: 'ORM', ae: 'Nont' },
  5: { hotel: 'The Bay Hotel', service: 'ORM', ae: null },
  6: { hotel: 'Sala Suan Lodge', service: 'Marcom', ae: 'Mint' },
  7: { hotel: 'Baan Boutique Inn', service: 'ORM', ae: 'Dao' },
  60: { hotel: 'Phuket Breeze', service: 'ORM', ae: 'Mint' },
};
const AES = ['Dao', 'Nont', 'Ploy', 'Mint'];
export const DEMO_DEBT_CONTRACTS = Array.from({ length: 170 }, (_, i) => {
  const n = NAMED[i];
  const grade: Grade = i < 3 ? 'D' : i < 19 ? 'C' : i < 58 ? 'B' : 'A';
  return {
    contract_id: `CT-DMO-${String(i + 1).padStart(4, '0')}`,
    hotel_id: `HTL-DMO-${String(i + 1).padStart(4, '0')}`,
    hotel: n?.hotel ?? `Demo Hotel ${String(i + 1).padStart(3, '0')}`,
    service: n?.service ?? ((i % 4 === 3 ? 'Marcom' : 'ORM') as Svc),
    ae: n ? n.ae : AES[i % 4]!,
    grade,
  };
});
/** May–Oct 26: paid / total = 142/160 · 143/162 · 146/164 · 146/166 · 148/168 · 151/170 (Oct open). */
export const DEMO_TREND: [string, number, number][] = [['2026-05', 142, 160], ['2026-06', 143, 162], ['2026-07', 146, 164], ['2026-08', 146, 166], ['2026-09', 148, 168], ['2026-10', 151, 170]];

let paidOverride = new Set<string>();
let listeners = new Set<() => void>();
export const onDemoInvoiceChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Test / UAT only: mark one DEMO invoice (contract + period) paid — the card picks it up on the next tab focus. */
export function markDemoInvoicePaid(contract_id: string, period: string, paid_at: string) { paidOverride.add(`${contract_id}|${period}|${paid_at}`); listeners.forEach((l) => l()); }
export function resetDemoInvoices() { paidOverride = new Set(); listeners.forEach((l) => l()); }

export function demoPaidInvoices(): PaidInv[] {
  const out: PaidInv[] = [];
  for (const [p, paid, total] of DEMO_TREND) {
    const unpaid = total - paid;
    for (let i = 0; i < total; i++) {
      const c = DEMO_DEBT_CONTRACTS[i]!;
      const isPaid = i >= unpaid;
      out.push({ contract_id: c.contract_id, hotel: c.hotel, service: c.service, ae: c.ae, period: p, status: isPaid ? 'paid' : 'issued', paid_at: isPaid ? `${p}-10` : null });
    }
  }
  for (const k of paidOverride) {
    const [cid, p, at] = k.split('|');
    const row = out.find((r) => r.contract_id === cid && r.period === p);
    if (row) { row.status = 'paid'; row.paid_at = at!; }
  }
  return out;
}
export const demoGradeRows = (): GradeRowR[] => DEMO_DEBT_CONTRACTS.map((c) => ({ contract_id: c.contract_id, hotel: c.hotel, service: c.service, ae: c.ae, grade: c.grade }));
export const demoGradeAt = (id: string) => DEMO_DEBT_CONTRACTS.find((c) => c.contract_id === id)?.grade ?? null;

const C = (i: number) => DEMO_DEBT_CONTRACTS[i]!;
const row = (i: number, x: Pick<DebtRowR, 'cycles' | 'outstanding' | 'status'> & Partial<DebtRowR>): DebtRowR => ({ contract_id: C(i).contract_id, hotel_id: C(i).hotel_id, hotel: C(i).hotel, service: C(i).service, ae: C(i).ae, grade: C(i).grade, ...x });
/** ②: total ฿276,000 · 7 สัญญา (write-off and pause excluded). */
export const demoDebtRows = (): DebtRowR[] => [
  row(1, { status: 'LEGAL', outstanding: 55000, cycles: 3 }),
  row(0, { status: 'SUSPENDED', outstanding: 90000, cycles: 2 }),
  row(2, { status: 'SUSPENDED', outstanding: 28000, cycles: 2 }),
  row(3, { status: 'OVERDUE', outstanding: 41000, cycles: 1 }),
  row(4, { status: 'OVERDUE', outstanding: 32000, cycles: 1 }),
  row(5, { status: 'OVERDUE', outstanding: 18000, cycles: 1 }),
  row(6, { status: 'OVERDUE', outstanding: 12000, cycles: 1 }),
  row(7, { status: 'WRITTEN_OFF', outstanding: 21000, cycles: 4 }),
  row(60, { status: 'PAUSED', outstanding: 0, cycles: 0, pause_note: 'ปรับปรุงโรงแรม 1 Oct – 31 Dec 26' }),
];
const t = (n: number, i: number, type: TicketLite['type'], target_dept: TicketLite['target_dept'], status: TicketLite['status']): TicketLite =>
  ({ ticket_id: `TKT-DMO-${n}`, type, target_dept, status, contract_id: C(i).contract_id, hotel_id: C(i).hotel_id, service: C(i).service });
/** Display-only DEMO tickets (not written to the ticket store). Anjali's CANCELLED shut-off must be ignored. */
export const demoDebtTickets = (): TicketLite[] => [
  t(1, 1, 'SYSTEM_SHUTOFF', 'ORM', 'DONE'), t(2, 1, 'SYSTEM_SHUTOFF', 'PS', 'DONE'),
  t(3, 0, 'SYSTEM_SHUTOFF', 'ORM', 'IN_PROGRESS'), t(4, 0, 'SYSTEM_SHUTOFF', 'PS', 'DONE'), t(5, 0, 'GRADE_RISK', 'PS', 'ACK'),
  t(6, 2, 'SYSTEM_SHUTOFF', 'ORM', 'DONE'), t(7, 2, 'SYSTEM_SHUTOFF', 'PS', 'IN_PROGRESS'),
  t(8, 3, 'CONTRACT_SIGNAL', 'PS', 'NEW'), t(9, 3, 'RENEWAL_DUE', 'PS', 'IN_PROGRESS'),
  t(10, 5, 'CONTRACT_SIGNAL', 'PS', 'NEW'),
  t(11, 4, 'SYSTEM_SHUTOFF', 'ORM', 'CANCELLED'),
];
