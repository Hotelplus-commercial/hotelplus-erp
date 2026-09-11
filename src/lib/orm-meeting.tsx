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
  type: "Decline" | "Survey ORM" | "Survey AE" | "Survey Overall" | "No-show";
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

type Ctx = {
  role: MmRole;
  setRole: (r: MmRole) => void;
  month: string;
  setMonth: (m: string) => void;
};

const MmContext = createContext<Ctx | null>(null);

export function MeetingMgmtProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MmRole>("AE");
  const [month, setMonth] = useState(currentMonthLabel);
  const value = useMemo(() => ({ role, setRole, month, setMonth }), [role, month]);
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
  Declined: "danger",
  "No-show": "danger",
};

export const scoreTone = (n: number) => (n < 6.5 ? "danger" : n <= 7.5 ? "warn" : "success");
