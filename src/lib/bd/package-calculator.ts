/* Patch A SP7 — Package Calculator data. Marcom packages transcribed from the real portal (IMG-5).
 * ORM: the real portal formula is NOT known here → sample results for the sample input only (open item). */
export type CartItem = { id: string; label: string; price: number; unit: "month" | "once" | "percent"; group: string };

export type OrmInput = { hotel: string; rooms: number; occupancy: number; high: [number, number]; shoulder: [number, number]; low: [number, number]; hasOta: boolean; otas: string[]; otaShare: number };
export const ORM_SAMPLE: OrmInput = { hotel: "Three Bridges Hotel NAN", rooms: 28, occupancy: 35, high: [5, 1142], shoulder: [5, 1142], low: [2, 1142], hasOta: true, otas: ["Agoda", "Booking.com"], otaShare: 50 };
export const OTA_LIST = ["Agoda", "Booking.com", "Trip.com", "Expedia", "Traveloka", "Gother"];
export type OrmPackage = { key: "smart" | "fixed" | "perf"; name: string; desc: string; recommended?: boolean; main: string; sub: string };
/** Results shown by the real portal for ORM_SAMPLE (IMG-3). */
export const ORM_SAMPLE_RESULTS: OrmPackage[] = [
  { key: "smart", name: "Smart Package (A + B)", recommended: true, desc: "บริหารครบวงจร พร้อมกลยุทธ์เชิงลึกเฉพาะโรงแรม — ค่าบริการคงที่บวกคอมมิชชั่น", main: "฿8,320", sub: "ค่าคอมมิชชั่น 8.00%" },
  { key: "fixed", name: "Fixed Package (A Only)", desc: "บริหารครบวงจร ค่าบริการคงที่ไม่ขึ้นกับรายได้โรงแรมตลอดอายุสัญญา", main: "฿16,863", sub: "ค่าบริการคงที่รายเดือน" },
  { key: "perf", name: "Performance Package (B Only)", desc: "บริหารครบวงจร คิดค่าบริการตามผลงานจริง ไม่มีค่าใช้จ่ายคงที่รายเดือน", main: "10.00%", sub: "ขั้นต่ำ 8,000 บาท/เดือน" },
];
export const sameAsSample = (i: OrmInput) => JSON.stringify(i) === JSON.stringify(ORM_SAMPLE);

export type MarcomCard = { id: string; tier: "ONE-TIME" | "LITE" | "FULL" | "PHOTO" | "PHOTO + VDO" | "DRONE"; title: string; note?: string; price: number | null; unit: "once" | "month"; comingSoon?: boolean; bullets?: string[] };
export type MarcomSection = { label: string; cards: MarcomCard[] };
export type MarcomChannel = { key: "google" | "meta" | "tiktok" | "production"; label: string; sections: MarcomSection[] };
export const MARCOM_CATALOGUE: MarcomChannel[] = [
  { key: "google", label: "Google", sections: [
    { label: "ONE-TIME SETUP", cards: [{ id: "MARCOM-SETUP-GMB", tier: "ONE-TIME", title: "Register Google My Business", price: 1500, unit: "once" }] },
    { label: "PACKAGE", cards: [
      { id: "MARCOM-MTH-GMB", tier: "LITE", title: "Google My Business + IBE", note: "Internet Booking Engine — คำนวณจากจำนวนห้อง", price: null, unit: "month" },
      { id: "GOOGLE-SEM", tier: "FULL", title: "Google SEM + Ads", price: null, unit: "month", comingSoon: true },
    ] },
  ] },
  { key: "meta", label: "Meta", sections: [
    { label: "ONE-TIME SETUP", cards: [
      { id: "MARCOM-SETUP-META", tier: "ONE-TIME", title: "Register Meta", price: 1500, unit: "once" },
      { id: "MARCOM-SETUP-SOCIAL-META", tier: "ONE-TIME", title: "Social Plus", price: 3500, unit: "once" },
    ] },
    { label: "LITE PACKAGE", cards: [
      { id: "MARCOM-MTH-META-LITE-CONTENT", tier: "LITE", title: "Meta 4 Content (Single Post / Album)", note: "4 posts / เดือน · ไม่รวมงบ Ads", price: 4000, unit: "month" },
      { id: "MARCOM-MTH-META-LITE-ADS", tier: "LITE", title: "Ad Management", note: "ไม่จำกัดแคมเปญ · ไม่รวมงบ Ads", price: 3000, unit: "month" },
    ] },
    { label: "FULL PACKAGE", cards: [{ id: "MARCOM-MTH-META", tier: "FULL", title: "Meta 10 Content + KOL Basic 1 ท่าน (1 Slide + 1 VDO) + Ads Budget", note: "Reach/Engagement · ไม่รวมค่าเดินทาง+ที่พัก KOL", price: 15000, unit: "month" }] },
  ] },
  { key: "tiktok", label: "TikTok", sections: [
    { label: "ONE-TIME SETUP", cards: [
      { id: "MARCOM-SETUP-TIKTOK", tier: "ONE-TIME", title: "Register TikTok", price: 1500, unit: "once" },
      { id: "MARCOM-SETUP-SOCIAL-TIKTOK", tier: "ONE-TIME", title: "Social Plus", price: 3500, unit: "once" },
    ] },
    { label: "LITE PACKAGE", cards: [{ id: "MARCOM-MTH-TIKTOK-LITE", tier: "LITE", title: "KOL Basic 1 ท่าน (1 Slideshow + 1 VDO / 2 posts)", note: "ไม่รวมค่าเดินทาง+ที่พัก · ไม่รวมงบ Ads", price: 4000, unit: "month" }] },
    { label: "FULL PACKAGE", cards: [
      { id: "MARCOM-MTH-TIKTOK-BASIC", tier: "FULL", title: "KOL Basic 3 ท่าน (3 Slide+3 VDO/6 posts) + Ads + Google Review", note: "ไม่รวมค่าเดินทาง+ที่พัก KOL", price: 15000, unit: "month" },
      { id: "MARCOM-MTH-TIKTOK-STD", tier: "FULL", title: "KOL Standard 3 ท่าน (3 Slide+3 VDO/6 posts) + Ads + Google Review", note: "ไม่รวมค่าเดินทาง+ที่พัก KOL", price: 25000, unit: "month" },
      { id: "MARCOM-MTH-TIKTOK-PRO", tier: "FULL", title: "KOL Professional 3 ท่าน (3 Slide+3 VDO/6 posts) + Ads + Google Review", note: "ไม่รวมค่าเดินทาง+ที่พัก KOL", price: 35000, unit: "month" },
    ] },
  ] },
  { key: "production", label: "Production", sections: [
    { label: "", cards: [
      { id: "PROD-HALF", tier: "PHOTO", title: "Half Day", price: 8000, unit: "once", bullets: ["Retouch: ปรับสี/แสงทุกภาพ แต่งภาพ 60 ภาพ", "ระยะเวลา: 4 ชั่วโมง / ไม่เกิน 4 ประเภทห้องพัก", "พื้นที่: เฉพาะกรุงเทพฯ และปริมณฑล"] },
      { id: "PROD-FULL", tier: "PHOTO", title: "Full Day", price: 15000, unit: "once", bullets: ["Retouch: ปรับสี/แสงทุกภาพ แต่งภาพ 150 ภาพ", "ระยะเวลา: 8 ชั่วโมง / ไม่เกิน 10 ประเภทห้องพัก", "พื้นที่: ไม่จำกัด"] },
      { id: "PROD-PREMIUM", tier: "PHOTO + VDO", title: "Premium", price: 20000, unit: "once", bullets: ["Photo: ปรับสี/แสงทุกภาพ แต่งภาพ 150 ภาพ", "ระยะเวลา: 8 ชั่วโมง / ไม่เกิน 10 ประเภทห้องพัก", "VDO: Full HD ไม่จำกัดจำนวนชิ้นงาน Edit ชิ้นละไม่เกิน 2 ครั้ง"] },
      { id: "PROD-DRONE", tier: "DRONE", title: "VDO/Photo", price: 8000, unit: "once", bullets: ["FORMAT: ภาพนิ่ง และวิดีโอ ที่ถ่ายจากโดรน", "ระยะเวลา: 2 ชั่วโมง", "พื้นที่: ยกเว้นพื้นที่ No fly zone"] },
    ] },
  ] },
];
/** TikTok includes ADDON-KOL-TRAVEL (Sai's decision); not shown as a card in IMG-5 — listed for the channel map only. */
export const TIKTOK_ADDONS = ["MARCOM-ADDON-KOL-TRAVEL", "MARCOM-ADDON-TIKTOK-KOL2"];

export const SURVEY: { q: string; multi: number; options: string[] }[] = [
  { q: "โรงแรมของท่านมีเป้าหมายด้านการตลาดด้านใดเป็นสำคัญ? (เลือกได้สูงสุด 2 ข้อ)", multi: 2, options: ["เพิ่มการรับรู้และการรู้จักแบรนด์ของโรงแรม", "เพิ่มสัดส่วนการจองห้องพักโดยตรง (Direct Booking)", "ลดสัดส่วนการจองผ่าน OTA เพื่อลดค่าคอมมิชชั่น", "เสริมสร้างภาพลักษณ์และความน่าเชื่อถือของโรงแรม"] },
  { q: "โรงแรมของท่านมีงบประมาณสำหรับการดำเนินงานด้าน Marketing ต่อเดือนอยู่ในช่วงใด?", multi: 1, options: ["มากกว่า 50,000 บาทต่อเดือน", "30,000 – 50,000 บาทต่อเดือน", "15,000–30,000 บาท", "น้อยกว่า 15,000 บาทต่อเดือน", "ยังไม่ได้กำหนดงบประมาณที่ชัดเจน"] },
  { q: "ปัจจุบันโรงแรมของท่านมีการใช้ช่องทาง Social Media ใดบ้าง (สามารถเลือกได้มากกว่า 1 ข้อ)", multi: 4, options: ["Facebook", "TikTok", "Google My Business", "ยังไม่มีการใช้ Social Media อย่างเป็นทางการ"] },
  { q: "ปัจจุบันโรงแรมของท่านมีการดำเนินการโฆษณาออนไลน์ (ยิง Ads) หรือว่าจ้าง KOL หรือไม่?", multi: 1, options: ["ยังไม่เคยดำเนินการทั้งการยิง Ads และการใช้ KOL", "เคยดำเนินการโฆษณาออนไลน์ (ยิง Ads) เป็นครั้งคราว", "เคยใช้ KOL/Influencer ในการโปรโมทโรงแรม", "มีการดำเนินการทั้งการโฆษณาออนไลน์ (Ads) และการใช้ KOL อยู่แล้ว"] },
  { q: "ปัจจุบันโรงแรมของท่านมีระบบจองห้องพักโดยตรงผ่านเว็บไซต์หรือไม่?", multi: 1, options: ["ยังไม่มีระบบจองตรงผ่านเว็บไซต์", "มีระบบจองตรงผ่านเว็บไซต์ แต่ยังไม่ตอบโจทย์การใช้งาน", "มีระบบจองตรงผ่านเว็บไซต์ และสามารถใช้งานได้อย่างมีประสิทธิภาพ"] },
];
/** Recommendation placeholder (open item): channels the hotel already uses (Q3) first, then the rest. */
export function channelOrder(q3: number[]): MarcomChannel["key"][] {
  const used: MarcomChannel["key"][] = [];
  if (q3.includes(2)) used.push("google");
  if (q3.includes(0)) used.push("meta");
  if (q3.includes(1)) used.push("tiktok");
  const all: MarcomChannel["key"][] = ["google", "meta", "tiktok", "production"];
  return [...used, ...all.filter((k) => !used.includes(k))];
}
