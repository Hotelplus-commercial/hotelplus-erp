/* Patch B DB9 — BD Dashboard sample data (ข้อมูลตัวอย่าง). Names: BD = SP9 Meeting Analyzer sample, TM = test labels. Read only. */
export const BD_SAMPLE_SOURCE = { onecall: "DTAC OneCall", pulse: "Pulse", pipedrive: "Pipedrive", specialDeal: "Special Deal (BD APP)" } as const;

export const TM_TARGET = { call: 100, answer: 50, meetingKpi: 40 } as const;
export const TM_TODAY = { call: 412, answer: 198, leadsNew: 36, meetingMonth: 118 }; // team totals
export const TM_PEOPLE = [
  { name: "TM 1 (ทดสอบ)", call: 104, answer: 52, meeting: 34 },
  { name: "TM 2 (ทดสอบ)", call: 96, answer: 47, meeting: 29 },
  { name: "TM 3 (ทดสอบ)", call: 110, answer: 55, meeting: 31 },
  { name: "TM 4 (ทดสอบ)", call: 102, answer: 44, meeting: 24 },
];
export const TM_FUNNEL = [
  { label: "Lead", value: 520 },
  { label: "Call", value: 412 },
  { label: "Answer", value: 198 },
  { label: "นัด Online Meeting", value: 21 },
];
/** 30 days of team totals ending on the DEMO day. */
export const TM_TREND = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, call: 360 + ((i * 37) % 90), meeting: 14 + ((i * 7) % 11) }));

export const BD_PIPELINE = [
  { label: "Qualified", value: 48 },
  { label: "Meeting", value: 31 },
  { label: "Proposal / QT", value: 22 },
  { label: "Negotiation", value: 12 },
];
export const BD_OPEN_DEALS = BD_PIPELINE.reduce((a, s) => a + s.value, 0);
export const SPECIAL_DEAL_PENDING = 3;
