/* Patch B DB9 — AUTO Dashboard sample data (ข้อมูลตัวอย่าง). Read only. */
export const AUTO_SAMPLE_SOURCE = { pipeline: "Project Pipeline", tools: "Tool Catalog" } as const;
export const PIPELINE_STEPS = [
  { label: "Requirement", value: 4 },
  { label: "TOR", value: 3 },
  { label: "Spec", value: 2 },
  { label: "อนุมัติ", value: 2 },
  { label: "Build", value: 5 },
  { label: "UAT", value: 3 },
  { label: "Launch", value: 1 },
];
export const AUTO_TILES = { inProgress: PIPELINE_STEPS.slice(0, 6).reduce((a, s) => a + s.value, 0), waitingApproval: 2, uatThisWeek: 3 };
export const TOOL_CATALOG = [
  { label: "BD APP", value: 9 },
  { label: "PS App", value: 14 },
  { label: "ORM App", value: 7 },
  { label: "Marcom App", value: 6 },
  { label: "AC App", value: 8 },
  { label: "HR App", value: 4 },
];
