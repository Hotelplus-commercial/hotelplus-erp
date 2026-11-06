/* AC-G1 (Decisions Fix R1, DF2, decided 6 Nov 2026) — Guarantee minimum for contracts billed
 * commission + Guarantee. Pure; used by runDailyBilling() for NEW billing runs only (past invoices never re-billed). */
import type { Contract } from './crm-types';

/** Rule is live → the "ตรวจ Guarantee เอง" notice is no longer shown (notice code kept). */
export const GUARANTEE_RULE_LIVE = true;

export const isGuaranteeContract = (c: Pick<Contract, 'billing_model' | 'guarantee_fee'>) =>
  c.billing_model === 'COMMISSION_GUARANTEE' && c.guarantee_fee != null && c.guarantee_fee > 0;

/** Production Report drop deadline (PR-O1): the 3rd of the month after the billing period. */
export function reportDeadline(billingPeriod: string): string {
  const y = +billingPeriod.slice(0, 4), m = +billingPeriod.slice(5, 7);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-03`;
}

const thb = (n: number) => `฿${n.toLocaleString('en-US')}`;

export type GuaranteeCharge = { amount: number; text: string; noReport: boolean };

/** commission = that month's commission from the Production Report, or null when none arrived by the deadline. */
export function guaranteeCharge(commission: number | null, guarantee: number): GuaranteeCharge {
  if (commission == null) return { amount: guarantee, noReport: true, text: `ไม่มี Production Report → เรียกเก็บขั้นต่ำ Guarantee ${thb(guarantee)}` };
  const amount = Math.max(commission, guarantee);
  return { amount, noReport: false, text: `ค่าคอม ${thb(commission)} · ขั้นต่ำ Guarantee ${thb(guarantee)} → เรียกเก็บ ${thb(amount)}` };
}

export const LATE_REPORT_NOTE = 'ถ้า Production Report มาหลังออกบิล AC ปรับเอง (ไม่ออกบิลซ้ำอัตโนมัติ)';
