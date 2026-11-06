/* Patch B DB9 — ORM Dashboard sample data (ข้อมูลตัวอย่าง). Teams = HR roster ORM teams. Read only. */
export const ORM_SAMPLE_SOURCE = { snapshot: "Snapshot Report drop view (AC App › Production Report)", revmax: "RevMax" } as const;
export const SNAPSHOT_SENT = { sent: 41, total: 52 };
/** Revenue vs target per ORM team this month (฿). */
export const REVMAX_TEAMS = [
  { label: "Team A", value: 1_840_000, target: 2_000_000 },
  { label: "Team B", value: 2_210_000, target: 2_100_000 },
  { label: "Team C", value: 1_520_000, target: 1_800_000 },
  { label: "Team D", value: 1_330_000, target: 1_400_000 },
  { label: "Team E", value: 980_000, target: 1_200_000 },
  { label: "Re-active", value: 410_000, target: 500_000 },
];
