/* Patch B DB9 — AC Dashboard sample data (ข้อมูลตัวอย่าง). Read only. */
export const AC_SAMPLE_SOURCE = { commission: "Payroll / รอบคำนวณ commission", misc: "AC App › รายการจ่ายอื่น" } as const;
export const COMMISSION_DUE = [
  { label: "BD Commission รอบ ต.ค.", amount: 186_000, due: "2026-11-05" },
  { label: "PS Incentive รอบ Q3", amount: 92_500, due: "2026-11-10" },
];
export const MISC_DUE = [
  { label: "ค่าโฆษณา Meta (บัตรบริษัท)", amount: 48_000, due: "2026-11-03" },
  { label: "ค่าเช่า Software รายปี", amount: 21_400, due: "2026-11-15" },
];
