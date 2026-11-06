/* Patch A SP9 — BD Meeting Analyzer sample data, transcribed from IMG-7 (ข้อมูลตัวอย่าง). Read only. */
export type Topic = { code: string; label: string; score: number; max: number };
export type BdScore = { name: string; meets: number; avg: number };
export type Session = { date: string; score: number }; // date = d/m (2026)
export type Flag = { text: string; hotel: string; bd: string };
export type Latest = { name: string; date: string; hotel: string; score: number; delta: number | null };

export const MA_TILES = { sessions: 326, teamAvg: 59, flags: 461, processing: 0 };
export const MA_DURATION = { minutes: 37, bdPct: 72, customerPct: 28 };

export const MA_TOPICS: Topic[] = [
  { code: "S1", label: "Research ข้อมูลโรงแรม", score: 8, max: 15 },
  { code: "S2", label: "ความถูกต้องข้อมูลบริการ", score: 14, max: 20 },
  { code: "S3", label: "ค้นหา Pain Point", score: 9, max: 15 },
  { code: "S4", label: "นำเสนอบริการ/Detect ความสนใจ", score: 6, max: 10 },
  { code: "S5", label: "ข้อจำกัดความพร้อมโรงแรม", score: 6, max: 10 },
  { code: "S6", label: "Calculator/ปิดราคา", score: 5, max: 15 },
  { code: "S7", label: "Decision Maker/ผลสัพธ์", score: 6, max: 10 },
  { code: "S8", label: "Next Action/Promise", score: 3, max: 5 },
];

export const MA_BD: BdScore[] = [
  { name: "ชาร่า", meets: 15, avg: 50 },
  { name: "โบ๊ท", meets: 15, avg: 52 },
  { name: "โบ", meets: 76, avg: 55 },
  { name: "พัช", meets: 62, avg: 57 },
  { name: "มุนิน", meets: 63, avg: 58 },
  { name: "เกล", meets: 68, avg: 61 },
  { name: "เหมียว", meets: 13, avg: 69 },
  { name: "ทอม", meets: 5, avg: 70 },
];

/** ชาร่า sessions transcribed from IMG-7; others are derived samples around their average. */
const SHARA: Session[] = [
  ["6/10", 61], ["6/10", 61], ["9/10", 56], ["16/10", 37], ["16/10", 50], ["22/10", 57], ["22/10", 58],
  ["26/10", 43], ["27/10", 51], ["28/10", 32], ["29/10", 56], ["30/10", 38], ["30/10", 51], ["3/11", 56], ["3/11", 45],
].map(([date, score]) => ({ date: date as string, score: score as number }));

const DATES = ["6/10", "9/10", "13/10", "16/10", "20/10", "22/10", "24/10", "27/10", "29/10", "31/10", "3/11", "5/11"];
export function sessionsOf(name: string): Session[] {
  if (name === "ชาร่า") return SHARA;
  const bd = MA_BD.find((b) => b.name === name);
  if (!bd) return [];
  const n = Math.min(bd.meets, DATES.length);
  return DATES.slice(DATES.length - n).map((date, i) => ({ date, score: Math.max(0, Math.min(100, bd.avg + ((i * 7) % 15) - 7)) }));
}

/** Period filter on the sample: DEMO today = 6 Nov 2026. */
export type MaPeriod = "all" | "30d" | "7d";
export function inPeriod(date: string, period: MaPeriod): boolean {
  if (period === "all") return true;
  const [d = 1, m = 1] = date.split("/").map(Number);
  const t = Date.UTC(2026, m - 1, d);
  const today = Date.UTC(2026, 10, 6);
  const days = (today - t) / 86400000;
  return days >= 0 && days < (period === "30d" ? 30 : 7);
}

export const MA_FLAGS: Flag[] = [
  { text: "ไม่มีการ walk-through Calculator ร่วมกับลูกค้า ไม่มีการ prefill ข้อมูลจากการ research เพื่อแสดง Net-to-Hotel ที่ลูกค้าจะได้รับ", hotel: "THE MUG Resort/CBI/Khun Ying", bd: "พัช" },
  { text: "ไม่มีการ research ข้อมูลโรงแรมมาล่วงหน้าอย่างเป็นรูปธรรม ข้อมูลทั้งหมดได้จากการถามในที่ประชุม", hotel: "PS Sriphu Hotel | Hat Yai | Khun Jutasinee", bd: "โบ" },
  { text: "ไม่มีข้อมูล Competitive Market หรือ Comp Set เลย ข้อมูลโรงแรมส่วนใหญ่ได้จากการถามในที่ประชุม ไม่ใช่จากการ research ล่วงหน้า", hotel: "Lanta School Beach Resort/Krabi/Khun Nong Kan", bd: "เกล" },
  { text: "ADR ที่ใช้คำนวณราคาในตอนแรกดึงมาจาก Booking แต่ลูกค้าแจ้งว่ายอดขายหลักมาจาก Agoda ทำให้ต้องคำนวณใหม่ระหว่างประชุม ส่งผลให้เสียความน่าเชื่อถือและเสียเวลา", hotel: "โรงแรมแม่ยมพาเลส/แพร่/คุณชัชวัสส์", bd: "โบ" },
  { text: "BD บอกว่า Plug-in กับ Easy ได้เลย แต่ต่อมาบอกว่าต้องถามทีมก่อน ข้อมูลขัดแย้งกันในการประชุมเดียวกัน สร้างความไม่น่าเชื่อถือ", hotel: "Lake House ถ้ำนาคา (Lake House Naka Cave)/พังงา/Khun Sukanya", bd: "มุนิน" },
  { text: "ไม่มีการทำ Calculator ร่วมกับลูกค้าในที่ประชุมเลย ไม่มีการแสดงตัวเลข Selling Rate / Commission / Net-to-Hotel และไม่มีการ close หรือสร้าง momentum ไปสู่การปิดดีล", hotel: "Proud Chiang Mai Poshtel/Khun Soontorn", bd: "มุนิน" },
];

export const MA_LATEST: Latest[] = [
  { name: "โบ", date: "5/11", hotel: "PS Sriphu Hotel | Hat Yai | Khun Jutasinee", score: 47, delta: -10 },
  { name: "พัช", date: "5/11", hotel: "THE MUG Resort/CBI/Khun Ying", score: 46, delta: null },
  { name: "เกล", date: "4/11", hotel: "Lanta School Beach Resort/Krabi/Khun Nong Kan", score: 46, delta: -11 },
  { name: "มุนิน", date: "4/11", hotel: "Proud Chiang Mai Poshtel/Khun Soontorn", score: 47, delta: 3 },
  { name: "โบ๊ท", date: "4/11", hotel: "โรงแรมเปิดใหม่/Phuket/Khun Win", score: 46, delta: -7 },
  { name: "ชาร่า", date: "3/11", hotel: "Buritel Hotel/Buri Ram/Khun Junny", score: 45, delta: -11 },
  { name: "ทอม", date: "4/9", hotel: "Project Planning/คุณนิตยาและคุณปูนิ่ม", score: 61, delta: -26 },
  { name: "เหมียว", date: "10/7", hotel: "test", score: 86, delta: 6 },
];

/** Team filter → which BDs. "all" = ทั้งทีม. */
export function filterFlags(person: string) { return person === "all" ? MA_FLAGS : MA_FLAGS.filter((f) => f.bd === person); }
export function filterLatest(person: string) { return person === "all" ? MA_LATEST : MA_LATEST.filter((l) => l.name === person); }
export function teamAverage(rows: BdScore[]) { return rows.length ? Math.round(rows.reduce((s, r) => s + r.avg * r.meets, 0) / rows.reduce((s, r) => s + r.meets, 0)) : 0; }
