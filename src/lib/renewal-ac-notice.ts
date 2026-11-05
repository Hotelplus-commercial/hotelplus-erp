/* v1.4.1 RN41 / RN51 — AC Billing notices for renewal contracts (display only; the billing engine is unchanged).
 * - Guarantee: runDailyBilling() bills the commission line only (no max(commission, guarantee)) → AC checks before billing.
 * - Late renewal: the engine captures only the current period on the 5th and never back-bills → AC bills the missed rounds by hand. */
import type { Contract } from './crm-types';
import { Q58 } from './ps-glossary';

export type AcNotice = { contract_id: string; hotel: string; kind: 'GUARANTEE' | 'LATE'; text: string; months?: string[] };
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thShort = (d: string) => `${+d.slice(8, 10)} ${TH_MON[+d.slice(5, 7) - 1]} ${(+d.slice(0, 4) + 543) % 100}`;
const thMonth = (ym: string) => `${TH_MON[+ym.slice(5, 7) - 1]} ${(+ym.slice(0, 4) + 543) % 100}`;

/** Billing rounds (the 5th of each month) that fell between the contract start and the signing date — missed by the engine. */
export function missedRounds(start: string, signed: string): string[] {
  const out: string[] = []; let y = +start.slice(0, 4), m = +start.slice(5, 7);
  for (;;) {
    const day = `${y}-${String(m).padStart(2, '0')}-05`;
    if (day >= signed.slice(0, 10)) break;
    if (day >= start.slice(0, 10)) out.push(day.slice(0, 7));
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

export function renewalAcNotices(contracts: Contract[]): AcNotice[] {
  const out: AcNotice[] = [];
  for (const c of contracts) {
    if (!c.renewal_of) continue;
    const hotel = c.customer_snapshot?.hotel_name || c.customer_snapshot?.legal_name || c.contract_id;
    if (c.billing_model === 'COMMISSION_GUARANTEE' && c.guarantee_fee != null) out.push({ contract_id: c.contract_id, hotel, kind: 'GUARANTEE', text: Q58.guaranteeNotice(c.guarantee_fee.toLocaleString('en-US')) });
    const signed = c.live_link_signed_at;
    if (signed && c.start_date.slice(0, 10) < signed.slice(0, 10)) {
      const months = missedRounds(c.start_date, signed);
      out.push({ contract_id: c.contract_id, hotel, kind: 'LATE', months, text: Q58.lateManual(thShort(c.start_date), thShort(signed), months.length, months.length ? months.map(thMonth).join(', ') : '—') });
    }
  }
  return out;
}
