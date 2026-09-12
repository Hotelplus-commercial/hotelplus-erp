import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type MmRole = "AE" | "Partner Manager" | "On-boarding Specialist" | "ORM" | "GRM";

export const mmRoles: MmRole[] = [
  "AE",
  "Partner Manager",
  "On-boarding Specialist",
  "ORM",
  "GRM",
];

export type Tier = "A" | "B" | "C";

export type HotelStatus = "Active" | "NEW" | "REPORT ONLY";

export type MeetingStatus =
  | "Draft"
  | "Sent"
  | "Confirmed"
  | "Completed"
  | "Postponed"
  | "Postponed-Next-Month"
  | "Declined"
  | "No-show";

export type SurveyStatus = "—" | "Pending" | "Submitted" | "Confirmed";

export type Meeting = {
  id: string;
  hotel: string;
  hotel2?: string;
  tier: Tier;
  orm: string;
  ae: string;
  date: string; // ISO date
  time?: string;
  status: MeetingStatus;
  survey: SurveyStatus;
  email: string;
  tierPct?: number;
  hotelStatus?: HotelStatus;
  carriedOver?: boolean;
};

export type SurveyRow = {
  id: string;
  hotel: string;
  tier: Tier;
  meetingDate: string;
  submitted: string;
  overall: number;
  scores: { orm: number; ae: number; meeting: number; overall: number };
  confirmation: "Pending" | "Auto-confirmed" | "Customer-confirmed";
  confirmationHint?: string;
  flags: number;
};

export type Flag = {
  id: string;
  priority: "High" | "Medium";
  type:
    | "Decline"
    | "Survey ORM"
    | "Survey AE"
    | "Survey Overall"
    | "No-show"
    | "SLA Overdue";
  ae: string;
  orm?: string;
  hotel: string;
  detail: string;
  ageDays: number;
  status: "Open" | "In Coaching" | "Resolved";
  createdAt: string;
};

export const currentMonthLabel = "September 2026";

export const monthOptions = [
  "September 2026",
  "August 2026",
  "July 2026",
  "June 2026",
  "May 2026",
  "April 2026",
  "March 2026",
  "February 2026",
  "January 2026",
  "December 2025",
  "November 2025",
  "October 2025",
];

export const mmHotels: { name: string; tier: Tier; orm: string; email: string }[] = [
  { name: "Grand Palace Bangkok", tier: "A", orm: "Somchai K.", email: "gm@grandpalace.co.th" },
  { name: "Riverside Resort Krabi", tier: "B", orm: "Malee P.", email: "rm@riversidekrabi.com" },
  { name: "Ocean View Phuket", tier: "A", orm: "Somchai K.", email: "owner@oceanviewphuket.com" },
  { name: "Sunset Villa Phuket", tier: "A", orm: "Somchai K.", email: "owner@oceanviewphuket.com" },
  { name: "Sky Tower Bangkok", tier: "A", orm: "Nont W.", email: "gm@skytowerbkk.com" },
  { name: "Emerald Bay Pattaya", tier: "A", orm: "Prasert L.", email: "gm@emeraldbay.co.th" },
  { name: "Mountain View Chiang Mai", tier: "B", orm: "Malee P.", email: "gm@mvchiangmai.com" },
  { name: "Beach Front Hua Hin", tier: "A", orm: "Somchai K.", email: "gm@beachfronthh.com" },
  { name: "Lakeside Retreat Phayao", tier: "A", orm: "Malee P.", email: "gm@lakesidephayao.com" },
  { name: "City Center Bangkok", tier: "B", orm: "Nont W.", email: "gm@citycenterbkk.com" },
  { name: "Sunset Beach Samui", tier: "A", orm: "Prasert L.", email: "gm@sunsetsamui.com" },
];

export const mmMeetings: Meeting[] = [
  {
    id: "MTG-001",
    hotel: "Grand Palace Bangkok",
    tier: "A",
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "2026-09-12",
    time: "09:00",
    status: "Confirmed",
    survey: "—",
    email: "gm@grandpalace.co.th",
  },
  {
    id: "MTG-002",
    hotel: "Riverside Resort Krabi",
    tier: "B",
    orm: "Malee P.",
    ae: "Nont Wilson",
    date: "2026-09-15",
    time: "14:00",
    status: "Sent",
    survey: "—",
    email: "rm@riversidekrabi.com",
  },
  {
    id: "MTG-003",
    hotel: "Ocean View Phuket",
    hotel2: "Sunset Villa Phuket",
    tier: "A",
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "2026-09-18",
    time: "10:00",
    status: "Confirmed",
    survey: "—",
    email: "owner@oceanviewphuket.com",
  },
  {
    id: "MTG-004",
    hotel: "Sky Tower Bangkok",
    tier: "A",
    orm: "Nont W.",
    ae: "Boss Thompson",
    date: "2026-09-08",
    status: "Declined",
    survey: "—",
    email: "gm@skytowerbkk.com",
  },
  {
    id: "MTG-005",
    hotel: "Emerald Bay Pattaya",
    tier: "A",
    orm: "Prasert L.",
    ae: "Fern Anderson",
    date: "2026-09-05",
    time: "11:00",
    status: "Completed",
    survey: "Submitted",
    email: "gm@emeraldbay.co.th",
  },
  {
    id: "MTG-006",
    hotel: "Mountain View Chiang Mai",
    tier: "B",
    orm: "Malee P.",
    ae: "Boss Thompson",
    date: "2026-09-06",
    time: "13:00",
    status: "Completed",
    survey: "Confirmed",
    email: "gm@mvchiangmai.com",
  },
  {
    id: "MTG-007",
    hotel: "Beach Front Hua Hin",
    tier: "A",
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "2026-09-20",
    status: "Postponed",
    survey: "—",
    email: "gm@beachfronthh.com",
  },
  {
    id: "MTG-008",
    hotel: "Lakeside Retreat Phayao",
    tier: "A",
    orm: "Malee P.",
    ae: "Boss Thompson",
    date: "2026-09-04",
    time: "15:00",
    status: "No-show",
    survey: "—",
    email: "gm@lakesidephayao.com",
  },
  {
    id: "MTG-009",
    hotel: "City Center Bangkok",
    tier: "B",
    orm: "Nont W.",
    ae: "Nont Wilson",
    date: "2026-09-25",
    status: "Draft",
    survey: "—",
    email: "gm@citycenterbkk.com",
  },
  {
    id: "MTG-010",
    hotel: "Sunset Beach Samui",
    tier: "A",
    orm: "Prasert L.",
    ae: "Fern Anderson",
    date: "2026-09-22",
    time: "10:00",
    status: "Confirmed",
    survey: "—",
    email: "gm@sunsetsamui.com",
  },
];

export const todayMeetings: Meeting[] = [
  {
    id: "MTG-T1",
    hotel: "Grand Palace Bangkok",
    tier: "A",
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "2026-09-07",
    time: "09:00",
    status: "Confirmed",
    survey: "—",
    email: "gm@grandpalace.co.th",
  },
  {
    id: "MTG-T2",
    hotel: "Riverside Resort Krabi",
    tier: "B",
    orm: "Malee P.",
    ae: "Nont Wilson",
    date: "2026-09-07",
    time: "11:00",
    status: "Confirmed",
    survey: "—",
    email: "rm@riversidekrabi.com",
  },
  {
    id: "MTG-T3",
    hotel: "Ocean View Phuket",
    hotel2: "Sunset Villa Phuket",
    tier: "A",
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "2026-09-07",
    time: "14:00",
    status: "Confirmed",
    survey: "—",
    email: "owner@oceanviewphuket.com",
  },
];

export const mmSurveys: SurveyRow[] = [
  {
    id: "SV-001",
    hotel: "Emerald Bay Pattaya",
    tier: "A",
    meetingDate: "5 Sep 2026",
    submitted: "5 Sep 16:30",
    overall: 8.5,
    scores: { orm: 8, ae: 9, meeting: 8, overall: 9 },
    confirmation: "Customer-confirmed",
    flags: 0,
  },
  {
    id: "SV-002",
    hotel: "Grand Palace Bangkok",
    tier: "A",
    meetingDate: "3 Sep 2026",
    submitted: "3 Sep 15:00",
    overall: 6.0,
    scores: { orm: 5, ae: 7, meeting: 6, overall: 6 },
    confirmation: "Pending",
    confirmationHint: "day 2/5",
    flags: 2,
  },
  {
    id: "SV-003",
    hotel: "Mountain View Chiang Mai",
    tier: "B",
    meetingDate: "6 Sep 2026",
    submitted: "6 Sep 17:00",
    overall: 7.8,
    scores: { orm: 8, ae: 7, meeting: 8, overall: 8 },
    confirmation: "Auto-confirmed",
    flags: 0,
  },
];

export const pendingSurveys = [
  { id: "PS-1", hotel: "Grand Palace Bangkok", tier: "A" as Tier, meetingDate: "5 Sep 2026", overdue: false },
  { id: "PS-2", hotel: "Beach Front Hua Hin", tier: "A" as Tier, meetingDate: "4 Sep 2026", overdue: true },
  { id: "PS-3", hotel: "City Center Bangkok", tier: "B" as Tier, meetingDate: "6 Sep 2026", overdue: false },
];

export const mmFlags: Flag[] = [
  {
    id: "FL-001",
    priority: "High",
    type: "Decline",
    ae: "Boss Thompson",
    hotel: "Sky Tower Bangkok",
    detail: "Customer declined",
    ageDays: 3,
    status: "Open",
    createdAt: "4 Sep 2026",
  },
  {
    id: "FL-002",
    priority: "High",
    type: "Survey AE",
    ae: "Fern Anderson",
    hotel: "Grand Palace Bangkok",
    detail: "Score 5.5",
    ageDays: 1,
    status: "Open",
    createdAt: "6 Sep 2026",
  },
  {
    id: "FL-003",
    priority: "Medium",
    type: "Survey Overall",
    ae: "Nont Wilson",
    hotel: "Ocean View Phuket",
    detail: "Score 6.2",
    ageDays: 2,
    status: "In Coaching",
    createdAt: "5 Sep 2026",
  },
  {
    id: "FL-005",
    priority: "Medium",
    type: "SLA Overdue",
    ae: "Boss Thompson",
    hotel: "Green Valley",
    detail: "Property overdue 3d (1st Check)",
    ageDays: 2,
    status: "In Coaching",
    createdAt: "5 Sep 2026",
  },
  {
    id: "FL-004",
    priority: "Medium",
    type: "No-show",
    ae: "Boss Thompson",
    hotel: "Lakeside Retreat Phayao",
    detail: "Customer no-show",
    ageDays: 4,
    status: "Open",
    createdAt: "3 Sep 2026",
  },
];

export const ormSurveyFlags = [
  {
    id: "OF-1",
    orm: "Somchai K.",
    category: "ORM Quality (คำแนะนำที่ ORM ให้)",
    score: 5.0,
    hotel: "Grand Palace Bangkok",
    date: "5 Sep 2026",
  },
  {
    id: "OF-2",
    orm: "Malee P.",
    category: "ORM Quality (ความเข้าใจในธุรกิจโรงแรม)",
    score: 6.0,
    hotel: "Lakeside Retreat Phayao",
    date: "3 Sep 2026",
  },
  {
    id: "OF-3",
    orm: "Prasert L.",
    category: "ORM Quality (คำแนะนำที่ ORM ให้)",
    score: 6.2,
    hotel: "Sunset Beach Samui",
    date: "1 Sep 2026",
  },
];

export const teamPerformance = [
  { ae: "Nont Wilson", tierA: 100, quantity: "32/32", survey: 95, flags: 1 },
  { ae: "Fern Anderson", tierA: 92, quantity: "28/30", survey: 100, flags: 2 },
  { ae: "Boss Thompson", tierA: 75, quantity: "20/28", survey: 85, flags: 5 },
];

export const surveyQuestions = [
  {
    category: "ORM Quality",
    coach: "Coaching by: GRM",
    items: ["ความรู้/คำแนะนำที่ ORM ให้", "ความเข้าใจในธุรกิจโรงแรม"],
    notify: "notify GRM",
  },
  {
    category: "AE Service",
    coach: "Coaching by: Partner Manager",
    items: ["การ follow-up", "ความรวดเร็วในการตอบกลับ", "การ coordinate"],
    notify: "notify Partner Manager",
  },
  {
    category: "Meeting Quality",
    coach: "Coaching by: Partner Manager",
    items: ["ความชัดเจนของ report", "ความมีประโยชน์ของ discussion"],
    notify: "notify Partner Manager",
  },
  {
    category: "Overall Satisfaction",
    coach: "Coaching by: Partner Manager",
    items: ["ความพึงพอใจโดยรวม", "Likelihood to recommend"],
    notify: "notify Partner Manager",
  },
];

export const availableSlots = [
  { date: "12 Sep 2026", times: ["09:00", "14:00"] },
  { date: "13 Sep 2026", times: ["10:00", "15:00"] },
  { date: "16 Sep 2026", times: ["09:30", "13:30"] },
];

export type HotelFilter = "my" | "all";

type Ctx = {
  role: MmRole;
  setRole: (r: MmRole) => void;
  month: string;
  setMonth: (m: string) => void;
  ticks: Record<string, Partial<Record<ChecklistKey, Tick>>>;
  toggleTick: (cardId: string, key: ChecklistKey, by: string) => void;
  audit: { at: string; text: string }[];
  log: (text: string) => void;
};

const MmContext = createContext<Ctx | null>(null);

export function MeetingMgmtProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MmRole>("AE");
  const [month, setMonth] = useState(currentMonthLabel);
  const [ticks, setTicks] = useState<Record<string, Partial<Record<ChecklistKey, Tick>>>>(
    () => initialTicks,
  );
  const [audit, setAudit] = useState<{ at: string; text: string }[]>(initialAudit);

  const value = useMemo<Ctx>(
    () => ({
      role,
      setRole,
      month,
      setMonth,
      ticks,
      audit,
      log: (text: string) =>
        setAudit((prev) => [{ at: "เมื่อสักครู่", text }, ...prev].slice(0, 20)),
      toggleTick: (cardId, key, by) =>
        setTicks((prev) => {
          const card = prev[cardId] ?? {};
          const next = { ...card };
          if (next[key]) delete next[key];
          else next[key] = { at: "วันนี้ " + new Date().toTimeString().slice(0, 5), by };
          return { ...prev, [cardId]: next };
        }),
    }),
    [role, month, ticks, audit],
  );
  return <MmContext.Provider value={value}>{children}</MmContext.Provider>;
}

export function useMeetingMgmt() {
  const ctx = useContext(MmContext);
  if (!ctx) throw new Error("useMeetingMgmt must be used inside MeetingMgmtProvider");
  return ctx;
}


export const statusTone: Record<MeetingStatus, "muted" | "info" | "success" | "warn" | "danger"> = {
  Draft: "muted",
  Sent: "info",
  Confirmed: "success",
  Completed: "info",
  Postponed: "warn",
  "Postponed-Next-Month": "info",
  Declined: "danger",
  "No-show": "danger",
};

export const scoreTone = (n: number) => (n < 6.5 ? "danger" : n <= 7.5 ? "warn" : "success");

/* ------------------------------------------------------------------ */
/* AE Workspace v2 — portfolio, property pipeline, calendar model      */
/* ------------------------------------------------------------------ */

export const tierRule: Record<Tier, { criteria: string; meeting: string }> = {
  A: { criteria: "< 65% ของเป้ารายได้เดือนก่อน", meeting: "Required (100%)" },
  B: { criteria: "66–95% ของเป้ารายได้เดือนก่อน", meeting: "Optional (filler)" },
  C: { criteria: "≥ 96% ของเป้ารายได้เดือนก่อน", meeting: "ไม่ต้องนัด" },
};

export const portfolio = {
  totalHotels: 42,
  tierAHotels: 18,
  churnMonth: 2,
  churnPct: 20,
  churnYtd: 15,
  churnBreakdown: "ฉีกสัญญา 1 / ไม่ต่อ 1",
  surveysCollected: 27,
  surveyAvg: 7.8,
  tierACompletion: 88,
};

export const renewals = [
  { hotel: "Grand Palace BKK", daysLeft: 12 },
  { hotel: "Ocean View Phuket", daysLeft: 28 },
  { hotel: "City Center BKK", daysLeft: 41 },
];

export const tierAPipeline = [
  { label: "Not Assign", value: 4, tone: "muted" as const },
  { label: "Draft", value: 6, tone: "info" as const },
  { label: "Confirm Slot", value: 7, tone: "success" as const },
  { label: "Reject Slot", value: 1, tone: "danger" as const },
];

export const upcomingTeam = [
  { time: "09:00", hotel: "Grand Palace Bangkok", tier: "A" as Tier, mine: true },
  { time: "11:00", hotel: "Riverside Resort Krabi", tier: "B" as Tier, mine: false },
  { time: "14:00", hotel: "Ocean View Phuket + Sunset Villa", tier: "A" as Tier, mine: true },
];

export const upcomingSummary = { team: 15, mine: 8 };

/* --- Property Info pipeline --- */

export const preStages = [
  { key: "new", title: "New Property", sla: "24h" },
  { key: "intro", title: "Introduction & Sent Form", sla: "24h" },
  { key: "collect", title: "Collect Data", sla: "72h" },
  { key: "check1", title: "1st Check & Follow up", sla: "24h" },
  { key: "pending", title: "Property Pending", sla: "48h" },
  { key: "final", title: "Final Check", sla: "24h" },
];

export const servicingStages = [
  { key: "approved", title: "Approved", sla: "—" },
  { key: "processing", title: "On-boarding Processing", sla: "Overall SLA" },
  { key: "completed", title: "Completed", sla: "—" },
  { key: "score", title: "Survey Score", sla: "—" },
];

export type PropertyCard = {
  id: string;
  hotel: string;
  stage: string;
  daysInStage: number;
  slaDays: number;
  overdue: boolean;
  owner: string;
  action: string;
  note?: string;
  score?: string;
  readOnly?: boolean;
  journeyStep: number; // 0..4
  signedDaysAgo: number;
  rooms: number;
  location: string;
  roomTypes: string;
  otas: string;
  history: { at: string; text: string }[];
  lastActionBy?: string | undefined;
  specialist?: string | undefined;
  orm?: string | undefined;
  approvedDaysAgo?: number | undefined;
};


export const journeyPhases = ["BD", "AE", "On-boarding", "ทีมบริการ", "Lived"];

export const propertyCards: PropertyCard[] = [
  {
    id: "PC-1",
    hotel: "Hotel Aurora BKK",
    stage: "new",
    daysInStage: 0,
    slaDays: 1,
    overdue: false,
    owner: "Nont Wilson",
    action: "Move →",
    journeyStep: 1,
    signedDaysAgo: 2,
    rooms: 86,
    location: "สุขุมวิท, กรุงเทพฯ",
    roomTypes: "Deluxe / Suite",
    otas: "Agoda, Booking.com",
    history: [{ at: "9 Sep 2026", text: "BD ส่งต่อให้ AE" }],
  },
  {
    id: "PC-2",
    hotel: "Sunrise Hotel",
    stage: "collect",
    daysInStage: 2,
    slaDays: 3,
    overdue: false,
    owner: "Fern Anderson",
    lastActionBy: "Nont Wilson",
    specialist: "Dao S.",
    action: "Move →",

    journeyStep: 1,
    signedDaysAgo: 15,
    rooms: 120,
    location: "หัวหิน, ประจวบฯ",
    roomTypes: "Superior / Deluxe / Villa",
    otas: "Agoda, Expedia, Trip.com",
    history: [
      { at: "26 Aug 2026", text: "เซ็นสัญญา — BD ส่งต่อ AE" },
      { at: "5 Sep 2026", text: "ส่งฟอร์มเก็บข้อมูลให้โรงแรม" },
      { at: "7 Sep 2026", text: "เข้าสู่ Collect Data" },
    ],
  },
  {
    id: "PC-3",
    hotel: "Green Valley",
    stage: "check1",
    daysInStage: 4,
    slaDays: 1,
    overdue: true,
    owner: "Boss Thompson",
    specialist: "Dao S.",
    action: "Request Review",

    journeyStep: 2,
    signedDaysAgo: 22,
    rooms: 64,
    location: "เชียงใหม่",
    roomTypes: "Standard / Family",
    otas: "Agoda, Booking.com",
    history: [
      { at: "1 Sep 2026", text: "ส่งข้อมูลครบ" },
      { at: "4 Sep 2026", text: "เข้าสู่ 1st Check — เกิน SLA 3 วัน" },
    ],
  },
  {
    id: "PC-4",
    hotel: "Blue Lagoon",
    stage: "final",
    daysInStage: 1,
    slaDays: 1,
    overdue: false,
    owner: "Nont Wilson",
    specialist: "Nan A.",
    action: "Approve",

    journeyStep: 2,
    signedDaysAgo: 18,
    rooms: 45,
    location: "กระบี่",
    roomTypes: "Pool Villa",
    otas: "Agoda, Booking.com, Airbnb",
    history: [
      { at: "3 Sep 2026", text: "ผ่าน 1st Check" },
      { at: "6 Sep 2026", text: "เข้าสู่ Final Check" },
    ],
  },
];

export const servicingCards: PropertyCard[] = [
  {
    id: "SC-1",
    hotel: "Hotel Zenith",
    stage: "approved",
    daysInStage: 1,
    slaDays: 2,
    overdue: false,
    owner: "Fern Anderson",
    specialist: "Dao S.",
    orm: "Somchai K.",
    approvedDaysAgo: 2,
    action: "View Details",

    journeyStep: 2,
    signedDaysAgo: 24,
    rooms: 150,
    location: "พัทยา, ชลบุรี",
    roomTypes: "Deluxe / Suite",
    otas: "Agoda, Booking.com",
    history: [{ at: "8 Sep 2026", text: "อนุมัติข้อมูล — ส่ง ticket ให้ ORM/Marcom" }],
  },
  {
    id: "SC-2",
    hotel: "Hotel Yara",
    stage: "processing",
    daysInStage: 3,
    slaDays: 7,
    overdue: false,
    owner: "Fern Anderson",
    lastActionBy: "Nont Wilson",
    specialist: "Dao S.",
    orm: "Somchai K.",
    approvedDaysAgo: 3,
    action: "View Details",

    journeyStep: 3,
    signedDaysAgo: 34,
    rooms: 98,
    location: "ภูเก็ต",
    roomTypes: "Deluxe / Suite",
    otas: "Agoda, Expedia",
    history: [{ at: "3 Sep 2026", text: "เริ่ม on-boarding processing" }],
  },
  {
    id: "SC-4",
    hotel: "Hotel Aurora",
    stage: "completed",
    daysInStage: 1,
    slaDays: 7,
    overdue: false,
    owner: "Nont Wilson",
    specialist: "Nan A.",
    orm: "Malee P.",
    approvedDaysAgo: 6,
    action: "View Details",
    journeyStep: 4,
    signedDaysAgo: 40,
    rooms: 110,
    location: "กรุงเทพฯ",
    roomTypes: "Deluxe / Suite",
    otas: "Agoda, Booking.com",
    history: [
      { at: "2 Sep 2026", text: "อนุมัติ Final Check" },
      { at: "8 Sep 2026", text: "Go Lived 🚀 — ครบ checklist" },
    ],
  },
  {
    id: "SC-3",
    hotel: "Hotel Zephyr",
    stage: "score",
    daysInStage: 2,
    slaDays: 5,
    overdue: false,
    owner: "Nont Wilson",
    specialist: "Kwan P.",
    orm: "Prasert L.",
    action: "View Details",
    score: "8.5/10",
    journeyStep: 4,
    signedDaysAgo: 61,
    rooms: 72,
    location: "สมุย, สุราษฎร์ธานี",
    roomTypes: "Beachfront / Garden",
    otas: "Agoda, Booking.com, Trip.com",
    history: [
      { at: "20 Aug 2026", text: "On-boarding เสร็จสมบูรณ์" },
      { at: "5 Sep 2026", text: "ได้รับ Survey Score 8.5" },
    ],
  },
];


export const specialistStages = [
  { key: "check1", title: "1st Check", sla: "24h" },
  { key: "final", title: "Final Check", sla: "24h" },
  { key: "approved", title: "Approved", sla: "—" },
  { key: "processing", title: "On-boarding Processing", sla: "Overall SLA" },
  { key: "completed", title: "Completed", sla: "—" },
  { key: "score", title: "Survey Score", sla: "—" },
];

/* --- Calendar (default-available model) --- */

export type DayState = "available" | "block" | "dayoff" | "cutoff" | "past";

export type CalendarDay = {
  day: number;
  state: DayState;
  slots: ("available" | "block" | "dayoff" | "booked" | "cutoff")[];
  label?: string | undefined;
  marker?: string | undefined;
};

const baseSlots = ["09:00", "13:00", "15:00"] as const;
export const slotTimes = baseSlots;

export const septemberDays: CalendarDay[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dow = (i + 2) % 7; // 1 Sep 2026 = Tuesday
  const weekend = dow === 0 || dow === 6;
  const base: CalendarDay = {
    day,
    state: "available",
    slots: ["available", "available", "available"],
  };
  if (day === 3) base.marker = "🔄 Tier Classify";
  if (day === 10) base.marker = "✉ Report Send";
  if (day > 25) return { ...base, state: "cutoff", slots: ["cutoff", "cutoff", "cutoff"], label: "ปิดรับประชุม" };
  if (day < 11) return { ...base, state: "past", slots: ["cutoff", "cutoff", "cutoff"], label: day < 3 ? undefined : "draft ล่วงหน้า" };
  if (weekend || day === 18) return { ...base, state: "dayoff", slots: ["dayoff", "dayoff", "dayoff"], label: day === 18 ? "(ORM ลา)" : "HR day-off" };
  if (day === 16) return { ...base, slots: ["available", "block", "block"], label: "ORM: OTA" };
  if (day === 22) return { ...base, slots: ["available", "available", "booked"] };
  if (day === 24) return { ...base, slots: ["available", "booked", "booked"] };
  if (day === 25) return { ...base, marker: "↑ cutoff" };
  return base;
});

/** v3.1 — calendar meeting cards: Draft (gray + solid border + DRAFT badge) vs Confirmed (blue) */
export type CalendarMeetingCard = {
  day: number;
  time: string;
  hotel: string;
  tier: Tier;
  draft: boolean;
};

export const calendarMeetingCards: CalendarMeetingCard[] = [
  { day: 12, time: "09:00", hotel: "Grand Palace Bangkok", tier: "A", draft: false },
  { day: 15, time: "11:00", hotel: "Riverside Resort Krabi", tier: "B", draft: false },
  { day: 15, time: "14:00", hotel: "Ocean View Phuket", tier: "A", draft: true },
  { day: 17, time: "10:00", hotel: "Coral Reef Samui", tier: "A", draft: true },
  { day: 22, time: "15:00", hotel: "Beach Front Hua Hin", tier: "A", draft: true },
  { day: 24, time: "13:00", hotel: "Sunset Villa Krabi", tier: "A", draft: false },
];

export const slotReason: Record<string, string> = {
  block: "ORM ติดประชุม OTA / งานภายใน",
  dayoff: "วันหยุดตามตาราง HR",
  cutoff: "นอกช่วงประชุม (วันที่ 11–25 เท่านั้น)",
  booked: "มีนัดหมายแล้ว",
};

/* --- Extra meeting rows required by v2 --- */

export const extraMeetings: Meeting[] = [
  {
    id: "MTG-011",
    hotel: "Coral Reef Samui",
    tier: "A",
    tierPct: 44,
    orm: "Fern A.",
    ae: "Fern Anderson",
    date: "—",
    status: "Postponed-Next-Month",
    carriedOver: true,
    survey: "—",
    hotelStatus: "Active",
    email: "gm@coralreefsamui.com",
  },
  {
    id: "MTG-012",
    hotel: "Bangkok Boutique Sukhumvit",
    tier: "A",
    tierPct: 41,
    orm: "Somchai K.",
    ae: "Nont Wilson",
    date: "—",
    status: "Draft",
    survey: "—",
    hotelStatus: "NEW",
    email: "gm@bkkboutique.com",
  },
  {
    id: "MTG-013",
    hotel: "Old Town Ayutthaya",
    tier: "B",
    tierPct: 72,
    orm: "Malee P.",
    ae: "Nont Wilson",
    date: "—",
    status: "Draft",
    survey: "—",
    hotelStatus: "REPORT ONLY",
    email: "gm@oldtownayutthaya.com",
  },
];

const pctByHotel: Record<string, number> = {
  "Grand Palace Bangkok": 52,
  "Riverside Resort Krabi": 78,
  "Ocean View Phuket": 48,
  "Sunset Villa Phuket": 48,
  "Sky Tower Bangkok": 58,
  "Emerald Bay Pattaya": 61,
  "Mountain View Chiang Mai": 85,
  "Beach Front Hua Hin": 55,
  "Lakeside Retreat Phayao": 49,
  "City Center Bangkok": 91,
  "Sunset Beach Samui": 46,
};

export const allMeetings: Meeting[] = [
  ...mmMeetings.map((m) => ({
    ...m,
    tierPct: pctByHotel[m.hotel] ?? 60,
    hotelStatus: "Active" as HotelStatus,
  })),
  ...extraMeetings,
];

export const hotelStatusTone: Record<HotelStatus, "success" | "info" | "muted"> = {
  Active: "success",
  NEW: "info",
  "REPORT ONLY": "muted",
};

export const coachingSummary = { open: 12, inCoaching: 5, resolved: 18 };

export const flagTypes = [
  "All",
  "Decline",
  "Survey ORM",
  "Survey AE",
  "Survey Overall",
  "No-show",
  "SLA Overdue",
];

/* ------------------------------------------------------------------ */
/* v3.0 — Stage 8 checklist, cross-hotel ownership, On-boarding menu   */
/* ------------------------------------------------------------------ */

export const currentUserByRole: Record<MmRole, string> = {
  AE: "Nont Wilson",
  "Partner Manager": "Alex Chen",
  "On-boarding Specialist": "Dao S.",
  ORM: "Somchai K.",
  GRM: "Wichai T.",
};

export const aeUsers = ["All", "Nont Wilson", "Fern Anderson", "Boss Thompson"];

export type ChecklistKey = "handover" | "rate" | "setup" | "golive";
export type Tick = { at: string; by: string };

export const checklistDefs: {
  key: ChecklistKey;
  no: number;
  label: string;
  owner: "Specialist" | "ORM";
}[] = [
  { key: "handover", no: 1, label: "Handover to ORM", owner: "Specialist" },
  { key: "rate", no: 2, label: "Rate Structure Meeting", owner: "ORM" },
  { key: "setup", no: 3, label: "Setup / Mapping / Training", owner: "ORM" },
  { key: "golive", no: 4, label: "Go Lived 🚀", owner: "ORM" },
];

export const initialTicks: Record<string, Partial<Record<ChecklistKey, Tick>>> = {
  "SC-2": {
    handover: { at: "2 Sep 10:30", by: "Dao S." },
    rate: { at: "4 Sep 14:00", by: "Somchai K." },
  },
  "SC-4": {
    handover: { at: "2 Sep 09:00", by: "Nan A." },
    rate: { at: "3 Sep 11:00", by: "Malee P." },
    setup: { at: "5 Sep 16:00", by: "Malee P." },
    golive: { at: "8 Sep 10:00", by: "Malee P." },
  },
};

export const initialAudit: { at: string; text: string }[] = [
  {
    at: "7 Sep 11:20",
    text: "Nont Wilson ย้าย Sunrise Hotel → Collect Data (owner: Fern Anderson)",
  },
  { at: "4 Sep 14:00", text: "Somchai K. ติ๊ก Rate Structure Meeting — Hotel Yara" },
  { at: "2 Sep 10:30", text: "Dao S. ติ๊ก Handover to ORM — Hotel Yara" },
];

export const checklistProgress = (t: Partial<Record<ChecklistKey, Tick>>) =>
  checklistDefs.filter((d) => t[d.key]).length * 25;

export type SlaTone = "success" | "warn" | "danger";

export const stage8Sla = (daysElapsed: number, slaDays = 7): { tone: SlaTone; text: string } => {
  const left = slaDays - daysElapsed;
  if (left < 0) return { tone: "danger", text: `🔴 Overdue ${-left}d / ${slaDays}d SLA` };
  if (left <= 2) return { tone: "warn", text: `🟡 SLA warn ${daysElapsed}d / ${slaDays}d` };
  return { tone: "success", text: `🟢 ${daysElapsed}d / ${slaDays}d SLA` };
};

/* --- On-boarding Process dashboard --- */

export const opMetrics = [
  {
    key: "check1",
    label: "Pending 1st Check",
    value: 3,
    sub: "1 overdue",
    tone: "danger" as const,
  },
  { key: "final", label: "Pending Final Check", value: 2, sub: "On-time", tone: "success" as const },
  {
    key: "processing",
    label: "In Processing (Stage 8)",
    value: 5,
    sub: "SLA warn: 1",
    tone: "warn" as const,
  },
  { key: "processing", label: "Overdue Alerts", value: 2, sub: "escalated", tone: "danger" as const },
];

export const specialistTeam = [
  { name: "Dao S.", open: 8 },
  { name: "Nan A.", open: 5 },
  { name: "Kwan P.", open: 3 },
];

export const avgProcessing = { days: 4.2, trend: "▼ 0.8d vs August" };

export const recentlyApproved = [
  { id: "SC-1", hotel: "Hotel Zenith", approved: "Approved 2d ago", stage: "Stage 8", progress: 60 },
  { id: "SC-2", hotel: "Hotel Yara", approved: "Approved 4d ago", stage: "Stage 8", progress: 50 },
  { id: "SC-4", hotel: "Hotel Aurora", approved: "Approved 6d ago", stage: "Stage 9", progress: 100 },
];

export type OpHistoryRow = {
  id: string;
  hotel: string;
  owner: string;
  approved: string;
  goLived: string;
  duration: string;
  status: "Live" | "In Progress" | "SLA";
  statusText: string;
};

export const opHistory: OpHistoryRow[] = [
  {
    id: "H-1",
    hotel: "Hotel Aurora",
    owner: "Nont Wilson",
    approved: "2 Sep",
    goLived: "8 Sep",
    duration: "6 days",
    status: "Live",
    statusText: "✅ Live",
  },
  {
    id: "H-2",
    hotel: "Hotel Zenith",
    owner: "Fern Anderson",
    approved: "5 Sep",
    goLived: "—",
    duration: "4d elapsed",
    status: "In Progress",
    statusText: "🟡 60%",
  },
  {
    id: "H-3",
    hotel: "Hotel Yara",
    owner: "Boss Thompson",
    approved: "3 Sep",
    goLived: "—",
    duration: "6d elapsed",
    status: "SLA",
    statusText: "🔴 SLA",
  },
  {
    id: "H-4",
    hotel: "Hotel Zephyr",
    owner: "Nont Wilson",
    approved: "1 Sep",
    goLived: "7 Sep",
    duration: "6 days",
    status: "Live",
    statusText: "✅ Live",
  },
  {
    id: "H-5",
    hotel: "Hotel Blossom",
    owner: "Fern Anderson",
    approved: "28 Aug",
    goLived: "3 Sep",
    duration: "6 days",
    status: "Live",
    statusText: "✅ Live",
  },
];

export const opStatusFilters = ["All", "Approved", "Go Lived", "In Progress"];


