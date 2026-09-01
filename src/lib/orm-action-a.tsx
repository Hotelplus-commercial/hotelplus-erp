import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Tier = "A" | "B" | "C";
export type Season = "High" | "Shoulder" | "Low";
export type LoopStep = "IDLE" | "ANALYSIS" | "OPTION" | "REVIEW" | "DONE";

export type OrmHotel = {
  id: string;
  name: string;
  tier: Tier;
  loop: number;
  step: LoopStep;
  status: string;
  updatedAt: string;
  adr: number;
  season: Season;
};

export const ormHotels: OrmHotel[] = [
  {
    id: "rodina",
    name: "Rodina Beach Hotel",
    tier: "A",
    loop: 3,
    step: "OPTION",
    status: "รอเลือก Strategy Option",
    updatedAt: "2 ชม. ที่แล้ว",
    adr: 1273,
    season: "High",
  },
  {
    id: "azure",
    name: "Azure Bay Resort",
    tier: "B",
    loop: 2,
    step: "REVIEW",
    status: "กำลังวัดผล",
    updatedAt: "เมื่อวาน",
    adr: 2140,
    season: "High",
  },
  {
    id: "grand42",
    name: "42 Grand Residence",
    tier: "C",
    loop: 1,
    step: "ANALYSIS",
    status: "กำลังวิเคราะห์ตลาด",
    updatedAt: "3 วันก่อน",
    adr: 980,
    season: "Shoulder",
  },
  {
    id: "siam",
    name: "Siam Riverside Hotel",
    tier: "B",
    loop: 4,
    step: "DONE",
    status: "ปิด loop แล้ว",
    updatedAt: "5 วันก่อน",
    adr: 1640,
    season: "Low",
  },
  {
    id: "kata",
    name: "Kata Cliff Villas",
    tier: "A",
    loop: 2,
    step: "IDLE",
    status: "รอเริ่มรอบเดือน",
    updatedAt: "1 สัปดาห์ก่อน",
    adr: 3450,
    season: "High",
  },
];

export const loopSteps: { key: LoopStep; label: string }[] = [
  { key: "IDLE", label: "IDLE" },
  { key: "ANALYSIS", label: "ANALYSIS" },
  { key: "OPTION", label: "เลือก Option" },
  { key: "REVIEW", label: "REVIEW" },
  { key: "DONE", label: "เสร็จ loop" },
];

/* ---------- Phase 1 mock data ---------- */

export type GapStatus = "green" | "amber" | "red";

export function gapStatus(gap: number): GapStatus {
  if (gap <= 15) return "green";
  if (gap <= 30) return "amber";
  return "red";
}

export const periods = ["14d WD", "14d WE", "60d WD", "60d WE", "Long Holiday (LH)"] as const;
export const otaColumns = ["Agoda", "Booking.com", "Expedia", "Trip.com", "Traveloka"] as const;

export const heatMap: { period: string; floor: number; gaps: Record<string, number> }[] = [
  {
    period: "14d WD",
    floor: 1180,
    gaps: { Agoda: 4.2, "Booking.com": 22.0, Expedia: 11.4, "Trip.com": 8.1, Traveloka: 17.6 },
  },
  {
    period: "14d WE",
    floor: 1490,
    gaps: { Agoda: 18.3, "Booking.com": 34.7, Expedia: 27.9, "Trip.com": 12.6, Traveloka: 31.2 },
  },
  {
    period: "60d WD",
    floor: 1120,
    gaps: { Agoda: 6.8, "Booking.com": 19.5, Expedia: 9.7, "Trip.com": 5.2, Traveloka: 14.9 },
  },
  {
    period: "60d WE",
    floor: 1520,
    gaps: { Agoda: 24.4, "Booking.com": 41.3, Expedia: 33.8, "Trip.com": 21.7, Traveloka: 28.5 },
  },
  {
    period: "Long Holiday (LH)",
    floor: 2280,
    gaps: { Agoda: 82.7, "Booking.com": 64.1, Expedia: 45.6, "Trip.com": 38.9, Traveloka: 52.3 },
  },
];

export const compHotels = [
  { name: "Rodina Beach (Subject)", subject: true, rates: [1180, 1490, 1120, 1520, 2280] },
  { name: "Sunset Pier Hotel", subject: false, rates: [1050, 1380, 1010, 1420, 2050] },
  { name: "Bluewave Resort", subject: false, rates: [1240, 1610, 1180, 1660, 2460] },
  { name: "Coral Sands", subject: false, rates: [990, 1290, 960, 1340, 1880] },
  { name: "Palm Grove Hotel", subject: false, rates: [1320, 1720, 1260, 1780, 2620] },
  { name: "Marina View", subject: false, rates: [1160, 1520, 1100, 1580, 2340] },
];

export const pricePosition = [
  { name: "Coral Sands", avg: 1292 },
  { name: "Sunset Pier Hotel", avg: 1382 },
  { name: "Rodina Beach (Subject)", avg: 1518, subject: true },
  { name: "Marina View", avg: 1540 },
  { name: "Bluewave Resort", avg: 1630 },
  { name: "Palm Grove Hotel", avg: 1740 },
];

/* ---------- Phase 2 mock data ---------- */

export type StrategyOption = {
  id: 1 | 2 | 3;
  flag: GapStatus;
  primary: boolean;
  title: string;
  strategy: string;
  score: number;
  adrFlag: string;
  adrTone: GapStatus;
  time: string;
  uplift: string;
  risk: string;
  actions: string[];
  ifDo: string[];
  ifNot: string[];
};

export const strategyOptions: StrategyOption[] = [
  {
    id: 1,
    flag: "green",
    primary: true,
    title: "ทางเลือกที่ 1 ★ คำแนะนำหลัก",
    strategy: "เปิด Non-Refundable Rate + Refresh รูปภาพ Agoda",
    score: 8,
    adrFlag: "🟢 คงที่",
    adrTone: "green",
    time: "4 สัปดาห์",
    uplift: "+฿380K",
    risk: "ต่ำ",
    actions: [
      "เปิด NRF −10% ทุก room type บน Agoda + Booking.com",
      "อัปโหลดชุดรูปใหม่ 12 ภาพ (hero + pool + premium room)",
      "ปรับ Content Score ให้ถึง 90% ภายใน 2 สัปดาห์",
      "ตรวจ rate parity รายสัปดาห์",
    ],
    ifDo: [
      "Conversion บน Agoda เพิ่มประมาณ 6–9%",
      "ADR ไม่ถูกกดลง เพราะไม่ได้ลด BAR",
      "อันดับการค้นหาดีขึ้นจาก content freshness",
    ],
    ifNot: [
      "Gap LH 82.7% ยังค้าง ทำให้เสีย visibility ช่วง peak",
      "รายได้ที่ควรได้ราว ฿380K หลุดไปที่คู่แข่ง",
    ],
  },
  {
    id: 2,
    flag: "amber",
    primary: false,
    title: "ทางเลือกที่ 2",
    strategy: "ปรับ Floor Rate ช่วง Weekend + เพิ่มงบ Meta Search",
    score: 6,
    adrFlag: "🟡 ปรับลดเล็กน้อย",
    adrTone: "amber",
    time: "2 สัปดาห์",
    uplift: "+฿240K",
    risk: "ปานกลาง",
    actions: [
      "ลด Floor WE ลง 5% เพื่อปิด gap 34.7%",
      "เพิ่มงบ Meta Search 15% เน้น 60d WE",
      "ตั้ง alert เมื่อ gap > 25%",
    ],
    ifDo: ["เห็นผลเร็วภายใน 2 สัปดาห์", "ปิด gap weekend ได้ทันที"],
    ifNot: ["Weekend ยังเสียส่วนแบ่งให้ Bluewave / Palm Grove"],
  },
  {
    id: 3,
    flag: "red",
    primary: false,
    title: "ทางเลือกที่ 3 — ไม่แนะนำเป็นหลัก",
    strategy: "ลด BAR ทั้งกระดาน 12% เพื่อไล่ราคาคู่แข่ง",
    score: 3,
    adrFlag: "🔴 ลดลงชัดเจน",
    adrTone: "red",
    time: "1 สัปดาห์",
    uplift: "+฿120K",
    risk: "สูง",
    actions: ["ลด BAR 12% ทุก period", "แจ้ง OTA ทุกช่องทางพร้อมกัน"],
    ifDo: ["Volume เพิ่มเร็ว แต่ ADR ลดทันที"],
    ifNot: ["ไม่มีผลเสีย — ทางเลือกนี้มีความเสี่ยงกดค่าห้องระยะยาว"],
  },
];

/* ---------- Phase 3 mock data ---------- */

export const verdictMatrix = [
  { ota: "Agoda", content: "green", review: "green", ranking: "amber" },
  { ota: "Booking.com", content: "amber", review: "green", ranking: "red" },
  { ota: "Expedia", content: "green", review: "amber", ranking: "green" },
  { ota: "Trip.com", content: "green", review: "green", ranking: "green" },
  { ota: "Traveloka", content: "amber", review: "amber", ranking: "amber" },
] as const;

export const remainingDrags: { tone: GapStatus; text: string }[] = [
  { tone: "red", text: "Agoda Rate Parity หลุด −18% vs median" },
  { tone: "red", text: "Booking.com ranking ตกลง 4 อันดับใน 30 วัน" },
  { tone: "amber", text: "Premium room volume ต่ำ 1.2% ของ room nights" },
  { tone: "amber", text: "Content Score Traveloka 74% (เป้า 90%)" },
  { tone: "green", text: "Review Score เฉลี่ย 8.7 — อยู่ในเกณฑ์ดี" },
];

export const baselineSnapshot = [
  { kpi: "รายได้รวมสะสม (OTB Revenue)", value: "฿9.63M" },
  { kpi: "ราคาห้องเฉลี่ย (ADR)", value: "฿1,273" },
  { kpi: "ห้องที่จองแล้ว (Room Nights)", value: "7,570 คืน" },
  { kpi: "Content Score เฉลี่ย", value: "82%" },
  { kpi: "Review Score เฉลี่ย", value: "8.7 / 10" },
  { kpi: "Violation รวม", value: "6 รายการ" },
];

export const bookingPace = [
  { month: "ม.ค.", otb: 1.1, target: 1.3 },
  { month: "ก.พ.", otb: 2.4, target: 2.7 },
  { month: "มี.ค.", otb: 3.8, target: 4.2 },
  { month: "เม.ย.", otb: 5.2, target: 5.6 },
  { month: "พ.ค.", otb: 7.1, target: 7.4 },
  { month: "มิ.ย.", otb: 9.63, target: 9.9 },
  { month: "ก.ค.", otb: null, target: 12.2 },
  { month: "ส.ค.", otb: null, target: 14.6 },
];

export const tierAudit = [
  { at: "12 พ.ค. 2026 14:20", by: "Napat S. (Group Revenue Manager)", from: "B", to: "A" },
  { at: "03 ก.พ. 2026 09:05", by: "Napat S. (Group Revenue Manager)", from: "C", to: "B" },
  { at: "18 ต.ค. 2025 16:44", by: "System Migration", from: "—", to: "C" },
];

/* ---------- store ---------- */

type OrmState = {
  hotelId: string;
  setHotelId: (id: string) => void;
  hotel: OrmHotel;
  selectedOption: number | null;
  setSelectedOption: (id: number | null) => void;
  confirmedOption: number | null;
  confirmOption: (id: number) => void;
  tier: Tier;
  setTier: (t: Tier) => void;
  season: Season;
  setSeason: (s: Season) => void;
  role: string;
  setRole: (r: string) => void;
  reportTier: Tier;
  setReportTier: (t: Tier) => void;
};

const Ctx = createContext<OrmState | null>(null);
const KEY = "hotelplus-orm-action-a";

export function OrmActionAProvider({ children }: { children: ReactNode }) {
  const [hotelId, setHotelId] = useState("rodina");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confirmedOption, setConfirmedOption] = useState<number | null>(null);
  const [tier, setTier] = useState<Tier>("A");
  const [season, setSeason] = useState<Season>("High");
  const [role, setRole] = useState("Group Revenue Manager");
  const [reportTier, setReportTier] = useState<Tier>("A");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.hotelId) setHotelId(s.hotelId);
        if (s.selectedOption !== undefined) setSelectedOption(s.selectedOption);
        if (s.confirmedOption !== undefined) setConfirmedOption(s.confirmedOption);
        if (s.tier) setTier(s.tier);
        if (s.season) setSeason(s.season);
        if (s.role) setRole(s.role);
        if (s.reportTier) setReportTier(s.reportTier);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      KEY,
      JSON.stringify({ hotelId, selectedOption, confirmedOption, tier, season, role, reportTier }),
    );
  }, [hydrated, hotelId, selectedOption, confirmedOption, tier, season, role, reportTier]);

  const value = useMemo<OrmState>(() => {
    const hotel = (ormHotels.find((h) => h.id === hotelId) ?? ormHotels[0]) as OrmHotel;
    return {
      hotelId,
      setHotelId: (id) => {
        setHotelId(id);
        const next = ormHotels.find((h) => h.id === id);
        if (next) {
          setTier(next.tier);
          setSeason(next.season);
          setReportTier(next.tier);
        }
        setSelectedOption(null);
        setConfirmedOption(null);
      },
      hotel: { ...hotel, tier, season },
      selectedOption,
      setSelectedOption,
      confirmedOption,
      confirmOption: (id) => {
        setSelectedOption(id);
        setConfirmedOption(id);
      },
      tier,
      setTier,
      season,
      setSeason,
      role,
      setRole,
      reportTier,
      setReportTier,
    };
  }, [hotelId, selectedOption, confirmedOption, tier, season, role, reportTier]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrmActionA() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrmActionA must be used inside OrmActionAProvider");
  return ctx;
}
