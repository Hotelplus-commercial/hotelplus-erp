/* Patch B DB9 — HR Dashboard sample data (ข้อมูลตัวอย่าง). Read only. */
export const HR_SAMPLE_SOURCE = { people: "HR records (เข้า / ออก)", payroll: "Payroll / รอบคำนวณ commission", kpi: "KPI รอบประเมิน" } as const;
export const HR_MOVES = { joined: 2, left: 1 };
export const HR_KPI_ROUND = { label: "KPI H2 2569", submitted: 18, total: 26 };
export const COMMISSION_ROUNDS = [
  { label: "BD Commission", round: "ต.ค. 2569", status: "รออนุมัติ" },
  { label: "PS Incentive", round: "Q3 2569", status: "รออนุมัติ" },
  { label: "ORM Bonus", round: "ต.ค. 2569", status: "กำลังคำนวณ" },
  { label: "Marcom Standard Line", round: "ต.ค. 2569", status: "อนุมัติแล้ว" },
];
export const COMMISSION_PENDING = COMMISSION_ROUNDS.filter((r) => r.status === "รออนุมัติ").length;
