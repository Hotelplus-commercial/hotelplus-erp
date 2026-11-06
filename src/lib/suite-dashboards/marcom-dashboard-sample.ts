/* Patch B DB9 — Marcom Dashboard sample data (ข้อมูลตัวอย่าง). Names = HR roster Marcom members. Read only. */
export const MARCOM_SAMPLE_SOURCE = { content: "Content Plan (B2C)", kol: "KOL Tracker", upsell: "Upsell Management" } as const;
export const CONTENT_PLAN = [
  { label: "แนน", value: 38, target: 40 },
  { label: "บิว", value: 31, target: 36 },
  { label: "โบว์", value: 29, target: 32 },
  { label: "เจน", value: 22, target: 30 },
];
export const KOL = { posted: 14, waitingPay: 5, waitingPayThb: 37_500 };
export const UPSELL = [
  { hotel: "ตัวอย่าง A", item: "TikTok Lite → TikTok", stage: "เสนอราคา" },
  { hotel: "ตัวอย่าง B", item: "เพิ่ม Google (GMB)", stage: "รอลูกค้าตัดสินใจ" },
  { hotel: "ตัวอย่าง C", item: "KOL Travel", stage: "เซ็นแล้ว รอเริ่ม" },
];
