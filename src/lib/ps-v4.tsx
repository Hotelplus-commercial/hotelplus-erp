/**
 * PS App v4.0 mock data — additive layer on top of v3.1 (orm-meeting / ps-renewal).
 * Everything here is prototype mock data; no persistence.
 */

export type MeetingType = "ORM" | "MARCOM";

export type RequestedBy =
  | "SYS_AUTO"
  | "AE_SELF"
  | "ORM_REQUEST"
  | "MARCOM_REQUEST"
  | "CUSTOMER_REQUEST";

export type CardStatus = "NOT_ASSIGN" | "DRAFT" | "CONFIRMED" | "REJECTED" | "POSTPONED";

export type V4Tier = "A" | "B" | "C" | "—";

/** v4.0 visual tokens (exact values from spec) */
export const v4Color = {
  ormTint: "#DBEAFE",
  marcomTint: "#F3E8FF",
  ormFill: "#2563EB",
  marcomFill: "#8B5CF6",
  freeSlot: "#DCFCE7",
  busySlot: "#F1F5F9",
  draftFill: "#F1F5F9",
  draftBorder: "#94A3B8",
} as const;

export type MeetingCardV4 = {
  id: string;
  hotelId: string;
  hotel: string;
  tier: V4Tier;
  type: MeetingType;
  owner: string; // staffcode-nickname, "Unassigned"
  team: string;
  requestedBy: RequestedBy;
  status: CardStatus;
  day?: number;
  time?: string;
  note?: string;
  previouslyRejected?: boolean;
};

/* ────────────── Users (v4.0) ────────────── */

export const officeRoles = [
  { code: "MD001-Suriya", role: "Managing Director" },
  { code: "HOC001-Chai", role: "Head of Commercial" },
  { code: "AC001-Ploy", role: "Accounting" },
  { code: "HR001-Nid", role: "Human Resources" },
  { code: "OGM001-Kong", role: "Operation Growth Manager" },
  { code: "ADMIN001-Dev", role: "Full Stack Developer" },
];

export const ormStaff = [
  { code: "ORM001-Somchai", team: "Team A" },
  { code: "ORM002-Malee", team: "Team B" },
  { code: "ORM003-Prasert", team: "Team C" },
  { code: "ORM004-Somying", team: "Re-active" },
];

export const marcomStaff = [
  { code: "MC001-แนน", lead: true },
  { code: "MC002-บิว", lead: false },
  { code: "MC003-โบว์", lead: false },
  { code: "MC004-เจน", lead: false },
];

export const departments = ["All", "ORM", "Marcom"] as const;
export const v4OrmTeams = ["Team A", "Team B", "Team C", "Team D", "Team E", "Re-active"];
export const v4People = [...ormStaff.map((o) => o.code), ...marcomStaff.map((m) => m.code)];

export const marcomLeadLabel = (code: string) =>
  marcomStaff.find((m) => m.code === code)?.lead ? `${code} (Lead)` : code;

/* ────────────── Hotel pool ────────────── */

const hotelPool: { id: string; name: string; tier: V4Tier }[] = [
  { id: "HTL0042", name: "Grand Palace BKK", tier: "A" },
  { id: "HTL0055", name: "Ocean View Phuket", tier: "A" },
  { id: "HTL0071", name: "City Center Bangkok", tier: "A" },
  { id: "HTL0088", name: "Sky Tower BKK", tier: "A" },
  { id: "HTL0089", name: "Sunrise Boutique", tier: "B" },
  { id: "HTL0102", name: "Riverside Krabi", tier: "B" },
  { id: "HTL0110", name: "Coral Reef Samui", tier: "B" },
  { id: "HTL0114", name: "Beach Front Hua Hin", tier: "B" },
  { id: "HTL0121", name: "Sunset Villa", tier: "B" },
  { id: "HTL0126", name: "Bay Resort Pattaya", tier: "B" },
  { id: "HTL0130", name: "Mountain Pine Chiangmai", tier: "B" },
  { id: "HTL0135", name: "Lagoon Suites Phuket", tier: "B" },
  { id: "HTL0139", name: "Old Town Inn Chiangrai", tier: "B" },
  { id: "HTL0144", name: "Blue Wave Rayong", tier: "B" },
  { id: "HTL0151", name: "Palm Garden Khaoyai", tier: "B" },
  { id: "HTL0158", name: "Emerald Bay Trang", tier: "B" },
  { id: "HTL0163", name: "Silver Sand Samet", tier: "C" },
  { id: "HTL0167", name: "Nimman Loft", tier: "C" },
  { id: "HTL0172", name: "Rice Field Lodge", tier: "C" },
  { id: "HTL0178", name: "Hilltop Retreat Pai", tier: "C" },
  { id: "HTL0181", name: "Marina Court Chonburi", tier: "C" },
  { id: "HTL0187", name: "Lotus Pond Ayutthaya", tier: "C" },
  { id: "HTL0190", name: "Riverbank Kanchanaburi", tier: "C" },
  { id: "HTL0196", name: "Sunbird Hostel BKK", tier: "C" },
  { id: "HTL0203", name: "Coconut Grove Samui", tier: "C" },
  { id: "HTL0208", name: "Andaman Pearl Krabi", tier: "C" },
  { id: "HTL0212", name: "Bangkok Riverside Loft", tier: "C" },
  { id: "HTL0217", name: "Green Valley Resort", tier: "C" },
  { id: "HTL0223", name: "Pattaya Sky Condo Hotel", tier: "C" },
  { id: "HTL0229", name: "Isan Boutique Khonkaen", tier: "C" },
  { id: "HTL0234", name: "Sea Breeze Cha-am", tier: "C" },
  { id: "HTL0240", name: "Tropical Nest Phangan", tier: "C" },
  { id: "HTL0245", name: "Heritage House Lampang", tier: "C" },
  { id: "HTL0251", name: "Sapphire Court Udon", tier: "C" },
  { id: "HTL0256", name: "Bamboo Villas Krabi", tier: "C" },
  { id: "HTL0262", name: "Dusk Bay Phuket", tier: "C" },
  { id: "HTL0268", name: "Metro Stay Bangkok", tier: "C" },
  { id: "HTL0271", name: "Cliffside Samui", tier: "C" },
  { id: "HTL0277", name: "Orchid Court Nakhon", tier: "C" },
  { id: "HTL0283", name: "Sunflower Inn Buriram", tier: "C" },
  { id: "HTL0288", name: "Harbour Light Songkhla", tier: "C" },
  { id: "HTL0294", name: "Pine Hill Nan", tier: "C" },
];

export const v4Hotels = hotelPool;

const req: RequestedBy[] = ["SYS_AUTO", "AE_SELF", "ORM_REQUEST", "CUSTOMER_REQUEST"];

/* ────────────── Un-assign Box cards ────────────── */

export const ormUnassigned: MeetingCardV4[] = hotelPool.map((h, i) => {
  const staff = ormStaff[i % ormStaff.length]!;
  return {
    id: `orm-${h.id}`,
    hotelId: h.id,
    hotel: h.name,
    tier: h.tier,
    type: "ORM",
    owner: i % 11 === 5 ? "Unassigned" : staff.code,
    team: i % 11 === 5 ? "—" : staff.team,
    requestedBy: h.tier === "A" ? "SYS_AUTO" : req[i % req.length]!,
    status: "NOT_ASSIGN",
    previouslyRejected: h.id === "HTL0055",
  };
});

export const marcomUnassigned: MeetingCardV4[] = hotelPool.map((h, i) => {
  const staff = marcomStaff[i % marcomStaff.length]!;
  return {
    id: `mc-${h.id}`,
    hotelId: h.id,
    hotel: h.name,
    tier: "—",
    type: "MARCOM",
    owner: staff.code,
    team: "Marcom",
    requestedBy: i % 5 === 0 ? "MARCOM_REQUEST" : "SYS_AUTO",
    status: "NOT_ASSIGN",
  };
});

export const ormUnassignedByTier = (tier: "A" | "B" | "C") =>
  ormUnassigned.filter((c) => c.tier === tier);

/* ────────────── Calendar cards (Sep 2026) ────────────── */

export const v4CalendarCards: MeetingCardV4[] = [
  {
    id: "cal-1",
    hotelId: "HTL0055",
    hotel: "Ocean View Phuket",
    tier: "A",
    type: "ORM",
    owner: "ORM002-Malee",
    team: "Team B",
    requestedBy: "ORM_REQUEST",
    status: "DRAFT",
    day: 15,
    time: "14:00",
  },
  {
    id: "cal-2",
    hotelId: "HTL0110",
    hotel: "Coral Reef Samui",
    tier: "A",
    type: "ORM",
    owner: "ORM001-Somchai",
    team: "Team A",
    requestedBy: "SYS_AUTO",
    status: "DRAFT",
    day: 17,
    time: "10:00",
  },
  {
    id: "cal-3",
    hotelId: "HTL0114",
    hotel: "Beach Front Hua Hin",
    tier: "A",
    type: "ORM",
    owner: "ORM003-Prasert",
    team: "Team C",
    requestedBy: "AE_SELF",
    status: "DRAFT",
    day: 22,
    time: "15:00",
  },
  {
    id: "cal-4",
    hotelId: "HTL0042",
    hotel: "Grand Palace BKK",
    tier: "—",
    type: "MARCOM",
    owner: "MC001-แนน",
    team: "Marcom",
    requestedBy: "SYS_AUTO",
    status: "DRAFT",
    day: 16,
    time: "11:00",
  },
  {
    id: "cal-5",
    hotelId: "HTL0042",
    hotel: "Grand Palace Bangkok",
    tier: "A",
    type: "ORM",
    owner: "ORM001-Somchai",
    team: "Team A",
    requestedBy: "SYS_AUTO",
    status: "CONFIRMED",
    day: 12,
    time: "09:00",
  },
  {
    id: "cal-6",
    hotelId: "HTL0102",
    hotel: "Riverside Resort Krabi",
    tier: "B",
    type: "ORM",
    owner: "ORM003-Prasert",
    team: "Team C",
    requestedBy: "AE_SELF",
    status: "CONFIRMED",
    day: 15,
    time: "11:00",
  },
  {
    id: "cal-7",
    hotelId: "HTL0121",
    hotel: "Sunset Villa",
    tier: "—",
    type: "MARCOM",
    owner: "MC002-บิว",
    team: "Marcom",
    requestedBy: "CUSTOMER_REQUEST",
    status: "CONFIRMED",
    day: 18,
    time: "14:00",
  },
  {
    id: "cal-8",
    hotelId: "HTL0088",
    hotel: "Sky Tower BKK",
    tier: "A",
    type: "ORM",
    owner: "ORM003-Prasert",
    team: "Team C",
    requestedBy: "SYS_AUTO",
    status: "REJECTED",
    day: 10,
    time: "13:00",
    note: "ลูกค้าปฏิเสธ — ขอเลื่อนสัปดาห์หน้า",
  },
  {
    id: "cal-9",
    hotelId: "HTL0126",
    hotel: "Bay Resort Pattaya",
    tier: "—",
    type: "MARCOM",
    owner: "MC002-บิว",
    team: "Marcom",
    requestedBy: "CUSTOMER_REQUEST",
    status: "POSTPONED",
    day: 19,
    time: "10:00",
    note: "เลื่อนไปเดือนถัดไป",
  },
];

/* ────────────── Status pipelines ────────────── */

export const pipelineStatuses = [
  "Not Assign",
  "Draft",
  "Waiting Confirm",
  "Confirmed",
  "Completed",
  "Rejected",
  "Postponed",
] as const;

export const ormPipeline = [
  { label: "Not Assign", value: 26 },
  { label: "Draft", value: 3 },
  { label: "Waiting Confirm", value: 2 },
  { label: "Confirmed", value: 8 },
  { label: "Completed", value: 12 },
  { label: "Rejected", value: 1 },
  { label: "Postponed", value: 1 },
];

export const marcomPipeline = [
  { label: "Not Assign", value: 38 },
  { label: "Draft", value: 1 },
  { label: "Waiting Confirm", value: 1 },
  { label: "Confirmed", value: 2 },
  { label: "Completed", value: 5 },
  { label: "Rejected", value: 0 },
  { label: "Postponed", value: 1 },
];

export const ormQuantityBars = [
  { tier: "A" as const, count: 8, base: 10, tone: "danger" as const },
  { tier: "B" as const, count: 6, base: 10, tone: "warn" as const },
  { tier: "C" as const, count: 4, base: 10, tone: "success" as const },
];

export const marcomQuantityTotal = { done: 7, target: 42 };

export const surveyStatusBox = { queue: 3, filled: 27, meetings: 30 };

/* ────────────── Surveys ────────────── */

export type SurveyZoneCard = {
  id: string;
  hotelId: string;
  hotel: string;
  tier: V4Tier;
  type: MeetingType;
  date: string;
  daysAgo?: number;
  attendees: string;
  contact: string;
};

export const surveyUpcoming: SurveyZoneCard[] = [
  { id: "up-1", hotelId: "HTL0042", hotel: "Grand Palace BKK", tier: "A", type: "ORM", date: "Sep 15 10:00", attendees: "AE001-Nont, ORM001-Somchai", contact: "คุณสมศักดิ์" },
  { id: "up-2", hotelId: "HTL0016", hotel: "Ocean View PKT", tier: "A", type: "MARCOM", date: "Sep 17 13:00", attendees: "AE001-Nont, MC002-บิว", contact: "คุณปรียา" },
  { id: "up-3", hotelId: "HTL0071", hotel: "City Center BKK", tier: "A", type: "ORM", date: "Sep 18 09:30", attendees: "AE002-Fern, ORM001-Somchai", contact: "คุณธนา" },
  { id: "up-4", hotelId: "HTL0110", hotel: "Coral Reef Samui", tier: "B", type: "ORM", date: "Sep 19 11:00", attendees: "AE001-Nont, ORM002-Malee", contact: "คุณแนน" },
  { id: "up-5", hotelId: "HTL0121", hotel: "Sunset Villa", tier: "—", type: "MARCOM", date: "Sep 21 14:00", attendees: "AE003-Boss, MC001-แนน", contact: "คุณวิทย์" },
  { id: "up-6", hotelId: "HTL0130", hotel: "Mountain Pine Chiangmai", tier: "B", type: "ORM", date: "Sep 22 10:00", attendees: "AE002-Fern, ORM003-Prasert", contact: "คุณกิ่ง" },
  { id: "up-7", hotelId: "HTL0135", hotel: "Lagoon Suites Phuket", tier: "B", type: "MARCOM", date: "Sep 23 15:00", attendees: "AE001-Nont, MC003-โบว์", contact: "คุณอร" },
  { id: "up-8", hotelId: "HTL0163", hotel: "Silver Sand Samet", tier: "C", type: "ORM", date: "Sep 24 09:00", attendees: "AE003-Boss, ORM004-Somying", contact: "คุณพี" },
  { id: "up-9", hotelId: "HTL0167", hotel: "Nimman Loft", tier: "C", type: "ORM", date: "Sep 24 13:30", attendees: "AE002-Fern, ORM002-Malee", contact: "คุณต้น" },
  { id: "up-10", hotelId: "HTL0181", hotel: "Marina Court Chonburi", tier: "C", type: "MARCOM", date: "Sep 25 10:30", attendees: "AE001-Nont, MC004-เจน", contact: "คุณเจี๊ยบ" },
  { id: "up-11", hotelId: "HTL0190", hotel: "Riverbank Kanchanaburi", tier: "C", type: "ORM", date: "Sep 25 14:00", attendees: "AE003-Boss, ORM003-Prasert", contact: "คุณหนึ่ง" },
  { id: "up-12", hotelId: "HTL0203", hotel: "Coconut Grove Samui", tier: "C", type: "MARCOM", date: "Sep 25 16:00", attendees: "AE002-Fern, MC002-บิว", contact: "คุณเมย์" },
];

export const surveyPending: SurveyZoneCard[] = [
  { id: "pd-1", hotelId: "HTL0102", hotel: "Riverside Krabi", tier: "B", type: "ORM", date: "Sep 5 10:00", daysAgo: 5, attendees: "AE001-Nont, ORM003-Prasert", contact: "คุณหนึ่ง" },
  { id: "pd-2", hotelId: "HTL0089", hotel: "Sunrise Boutique", tier: "B", type: "MARCOM", date: "Sep 7 13:00", daysAgo: 3, attendees: "AE002-Fern, MC001-แนน", contact: "คุณดาว" },
  { id: "pd-3", hotelId: "HTL0088", hotel: "Sky Tower BKK", tier: "A", type: "ORM", date: "Sep 8 09:00", daysAgo: 2, attendees: "AE001-Nont, ORM003-Prasert", contact: "คุณกฤต" },
];

export type SubmittedSurvey = {
  id: string;
  hotel: string;
  tier: V4Tier;
  type: MeetingType;
  meetingDate: string;
  submitted: string;
  overall: number;
  subStatus: "Waiting Customer" | "Confirmed" | "Flagged";
  flags: number;
};

export const surveySubmitted: SubmittedSurvey[] = [
  { id: "sb-1", hotel: "Grand Palace BKK", tier: "A", type: "ORM", meetingDate: "Sep 2", submitted: "Sep 2", overall: 8.5, subStatus: "Confirmed", flags: 0 },
  { id: "sb-2", hotel: "Ocean View Phuket", tier: "A", type: "MARCOM", meetingDate: "Sep 3", submitted: "Sep 3", overall: 7.8, subStatus: "Waiting Customer", flags: 0 },
  { id: "sb-3", hotel: "Sunset Villa", tier: "B", type: "ORM", meetingDate: "Sep 3", submitted: "Sep 4", overall: 4.2, subStatus: "Flagged", flags: 1 },
  { id: "sb-4", hotel: "Bay Resort Pattaya", tier: "B", type: "MARCOM", meetingDate: "Sep 4", submitted: "Sep 4", overall: 5.6, subStatus: "Flagged", flags: 1 },
  { id: "sb-5", hotel: "City Center Bangkok", tier: "A", type: "ORM", meetingDate: "Sep 4", submitted: "Sep 5", overall: 9.1, subStatus: "Confirmed", flags: 0 },
  { id: "sb-6", hotel: "Nimman Loft", tier: "C", type: "ORM", meetingDate: "Sep 5", submitted: "Sep 5", overall: 8.0, subStatus: "Waiting Customer", flags: 0 },
  { id: "sb-7", hotel: "Lagoon Suites Phuket", tier: "B", type: "MARCOM", meetingDate: "Sep 6", submitted: "Sep 6", overall: 7.4, subStatus: "Confirmed", flags: 0 },
  { id: "sb-8", hotel: "Silver Sand Samet", tier: "C", type: "ORM", meetingDate: "Sep 6", submitted: "Sep 7", overall: 8.8, subStatus: "Confirmed", flags: 0 },
];

export const surveySubStatuses = ["All", "Waiting Customer", "Confirmed", "Flagged"] as const;

export type SurveyFlagCard = {
  id: string;
  hotel: string;
  question: string;
  score: number;
  type: MeetingType;
  owner: string;
  route: string;
};

export const surveyFlagCards: SurveyFlagCard[] = [
  { id: "fl-1", hotel: "Sunset Villa", question: "Q2", score: 3, type: "ORM", owner: "ORM001-Somchai", route: "GRM" },
  { id: "fl-2", hotel: "Bay Resort Pattaya", question: "Q5", score: 4, type: "MARCOM", owner: "MC002-บิว", route: "Marcom Lead" },
];

/* ────────────── Survey form questions (v4.0) ────────────── */

export type SurveyQ = { key: string; text: string; section: "ORM" | "MARCOM" | "OVERALL"; comment: boolean; open?: boolean };

export const v4SurveyQuestions: SurveyQ[] = [
  { key: "Q1", text: "การประชุมประจำเดือน มีเนื้อหาเป็นประโยชน์", section: "ORM", comment: true },
  { key: "Q2", text: "การประชุมประจำเดือน ใช้ระยะเวลาได้อย่างเหมาะสม", section: "ORM", comment: true },
  { key: "Q3", text: "ทีมงานสามารถให้คำแนะนำและแก้ไขปัญหาได้อย่างมีประสิทธิภาพ", section: "ORM", comment: true },
  { key: "Q4", text: "พาร์ท content หรือ content plan ที่ทางทีมดำเนินการหรือนำเสนอ", section: "MARCOM", comment: true },
  { key: "Q5", text: "พาร์ทด้านโฆษณาหรือผลลัพธ์ด้านการยิงโฆษณา ที่ทางทีมได้ดำเนินการ", section: "MARCOM", comment: true },
  { key: "Q6", text: "การนำเสนอประชุมของทีมในส่วนของการสื่อสารและการแนะนำ Suggestion", section: "MARCOM", comment: true },
  { key: "Q7", text: "ความพึงพอใจโดยรวมของการประชุมครั้งนี้", section: "OVERALL", comment: false },
  { key: "Q8", text: "โรงแรมจะแนะนำเพื่อนมาใช้บริการเราหรือไม่?", section: "OVERALL", comment: false },
  { key: "Q9", text: "คำแนะนำ/ความคิดเห็นเพิ่มเติม", section: "OVERALL", comment: false, open: true },
];

/* ────────────── Coaching (v4.0) ────────────── */

export type CoachTask = {
  id: string;
  hotel: string;
  question: string;
  score: number;
  opened: string;
  status: "Open" | "In Progress";
};

export const coachGroups: { coach: string; role: string; tasks: CoachTask[] }[] = [
  {
    coach: "Wichai T.",
    role: "GRM",
    tasks: [
      { id: "c1", hotel: "Sunset Villa", question: "Q2", score: 3, opened: "2d ago", status: "Open" },
      { id: "c2", hotel: "Sky Tower BKK", question: "Q1", score: 4, opened: "5d ago", status: "Open" },
      { id: "c3", hotel: "Riverside Krabi", question: "Q3", score: 5, opened: "6d ago", status: "In Progress" },
    ],
  },
  {
    coach: "MC001-แนน",
    role: "Marcom Lead",
    tasks: [
      { id: "c4", hotel: "Bay Resort Pattaya", question: "Q5", score: 4, opened: "1d ago", status: "Open" },
    ],
  },
  {
    coach: "Alex Chen",
    role: "PM",
    tasks: [
      { id: "c5", hotel: "Ocean View Phuket", question: "Q8", score: 4, opened: "3d ago", status: "Open" },
      { id: "c6", hotel: "Sky Tower BKK", question: "Q8", score: 5, opened: "4d ago", status: "In Progress" },
    ],
  },
];

export const coachRoles = ["All", "GRM", "Marcom Lead", "PM"];
export const coachStatuses = ["All", "Open", "In Progress"];

/* ────────────── Activity feed (Layer 2) ────────────── */

export type FeedType = "Flag" | "Survey" | "Meeting status" | "Renewal" | "Coaching" | "Calendar sync";

export type FeedEvent = {
  id: string;
  type: FeedType;
  icon: string;
  title: string;
  by: string;
  ago: string;
  link: "meetings" | "surveys" | "coaching" | "calendar" | "ps";
};

export const feedTypes: (FeedType | "All")[] = [
  "All",
  "Flag",
  "Survey",
  "Meeting status",
  "Renewal",
  "Coaching",
  "Calendar sync",
];

export const activityFeed: FeedEvent[] = [
  { id: "f1", type: "Flag", icon: "🔴", title: "Flag created — Sunset Villa · Q2 score 3 (ORM)", by: "Coach: GRM (Wichai T.)", ago: "5 min ago", link: "coaching" },
  { id: "f2", type: "Survey", icon: "✅", title: "Survey submitted — Grand Palace BKK · 8.5 avg (ORM)", by: "AE001-Nont", ago: "15 min ago", link: "surveys" },
  { id: "f3", type: "Meeting status", icon: "⚠", title: "Meeting rejected — Ocean View PKT (Marcom)", by: "Customer", ago: "1 hour ago", link: "meetings" },
  { id: "f4", type: "Renewal", icon: "✅", title: "Renewal marked done — HTL0089 Completed", by: "AE002-Fern", ago: "2 hours ago", link: "ps" },
  { id: "f5", type: "Calendar sync", icon: "📅", title: "Calendar synced (ORM) — 8 events pulled", by: "AE001-Nont", ago: "3 hours ago", link: "calendar" },
  { id: "f6", type: "Coaching", icon: "🎯", title: "Coaching task started — Sky Tower BKK · Q8", by: "Alex Chen", ago: "4 hours ago", link: "coaching" },
  { id: "f7", type: "Survey", icon: "✅", title: "Survey confirmed by customer — City Center BKK · 9.1 avg", by: "Customer", ago: "5 hours ago", link: "surveys" },
  { id: "f8", type: "Meeting status", icon: "🟦", title: "Meeting confirmed — Riverside Resort Krabi (ORM)", by: "ORM003-Prasert", ago: "6 hours ago", link: "meetings" },
  { id: "f9", type: "Flag", icon: "🔴", title: "Flag created — Bay Resort · Q5 score 4 (Marcom)", by: "Coach: Marcom Lead (MC001-แนน)", ago: "8 hours ago", link: "coaching" },
  { id: "f10", type: "Calendar sync", icon: "📅", title: "Calendar synced (Marcom) — 5 events pulled", by: "AE002-Fern", ago: "9 hours ago", link: "calendar" },
  { id: "f11", type: "Renewal", icon: "⚠", title: "Renewal at risk — HTL0121 no reply 7 วัน", by: "AE003-Boss", ago: "11 hours ago", link: "ps" },
  { id: "f12", type: "Meeting status", icon: "🟪", title: "Meeting postponed — Bay Resort Pattaya (Marcom)", by: "Customer", ago: "13 hours ago", link: "meetings" },
  { id: "f13", type: "Survey", icon: "📋", title: "Survey queued — Sky Tower BKK (ORM)", by: "SYS_AUTO", ago: "16 hours ago", link: "surveys" },
  { id: "f14", type: "Coaching", icon: "✅", title: "Coaching resolved — Green Valley · Q3", by: "Wichai T.", ago: "20 hours ago", link: "coaching" },
  { id: "f15", type: "Renewal", icon: "✅", title: "Contract renewed — HTL0071 (12 เดือน)", by: "AE001-Nont", ago: "23 hours ago", link: "ps" },
];

/* ────────────── The Office APP · ORM Bonus ────────────── */

export type BonusTier = "A" | "B" | "C";

export type BonusRow = {
  hotelId: string;
  hotel: string;
  month: string;
  revenue: number;
  target: number;
  achievement: number;
  tier: BonusTier;
  oldTier: BonusTier;
  stampedAt: string;
  ormOwner: string;
};

export const bonusTierOf = (achievement: number): BonusTier =>
  achievement < 70 ? "A" : achievement < 90 ? "B" : "C";

export const bonusTierDot: Record<BonusTier, string> = { A: "🔴", B: "🟡", C: "🟢" };

const bonusSeed: [string, string, number, number][] = [
  ["HTL0042", "Grand Palace BKK", 1_200_000, 2_000_000],
  ["HTL0055", "Ocean View PKT", 950_000, 1_200_000],
  ["HTL0089", "Sunrise Boutique", 1_500_000, 1_500_000],
  ["HTL0071", "City Center BKK", 2_100_000, 2_000_000],
  ["HTL0088", "Sky Tower BKK", 800_000, 1_500_000],
  ["HTL0102", "Riverside Krabi", 1_100_000, 1_300_000],
];

export const bonusRows: BonusRow[] = hotelPool.map((h, i) => {
  const seed = bonusSeed[i];
  const revenue = seed ? seed[2] : 400_000 + ((i * 137_000) % 1_600_000);
  const target = seed ? seed[3] : 900_000 + ((i * 91_000) % 1_200_000);
  const achievement = Math.round((revenue / target) * 100);
  const tier = bonusTierOf(achievement);
  const shift: Record<BonusTier, BonusTier> = { A: "B", B: "A", C: "B" };
  return {
    hotelId: h.id,
    hotel: seed ? seed[1] : h.name,
    month: "2026-08",
    revenue,
    target,
    achievement,
    tier,
    oldTier: i % 7 === 0 ? shift[tier] : tier,
    stampedAt: "2026-09-03 00:15",
    ormOwner: ormStaff[i % ormStaff.length]!.code,
  };
});

export const bonusMonths = ["August 2026", "July 2026", "June 2026"];

export const bonusLastRun = {
  at: "Sep 3, 2026 00:15",
  mode: "Auto",
  count: bonusRows.length,
};

export const bonusHistory = [
  { id: "r1", at: "Sep 3, 2026 00:15", mode: "AUTO", count: 42, period: "Aug 2026", by: "system" },
  { id: "r2", at: "Aug 3, 2026 00:15", mode: "AUTO", count: 40, period: "Jul 2026", by: "system" },
  { id: "r3", at: "Jul 3, 2026 09:45", mode: "MANUAL", count: 38, period: "Jun 2026", by: "HOC001-Chai (Preview then commit)" },
  { id: "r4", at: "Jun 3, 2026 00:15", mode: "AUTO", count: 36, period: "May 2026", by: "system" },
];

export const thb = (n: number) => n.toLocaleString("en-US");
