import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* v3.1 — Contract Renewal, org directory, PS Dashboard updates feed   */
/* ------------------------------------------------------------------ */

export type RenewalStatus = "NOT_STARTED" | "ON_PROCESS" | "COMPLETED" | "CHURN";
export type ActivityType = "Meeting" | "Call" | "Email" | "LINE" | "Documents" | "Contract";
export type ChurnType = "ฉีกสัญญา (Early Termination)" | "ไม่ต่อ (Non-renewal)";

export const activityIcon: Record<ActivityType, string> = {
  Meeting: "🤝",
  Call: "📞",
  Email: "✉",
  LINE: "💬",
  Documents: "📄",
  Contract: "✍",
};

export const activityTypes: ActivityType[] = [
  "Meeting",
  "Call",
  "Email",
  "LINE",
  "Documents",
  "Contract",
];

export const renewalStatusLabel: Record<RenewalStatus, string> = {
  NOT_STARTED: "Not Started",
  ON_PROCESS: "On Process",
  COMPLETED: "Completed",
  CHURN: "Churn",
};

export type Activity = {
  id: string;
  type: ActivityType;
  at: string;
  note: string;
  file?: string | undefined;
  by: string;
};

export type RenewalCard = {
  id: string;
  hotelId: string;
  hotel: string;
  contractEnd: string;
  daysLeft: number;
  status: RenewalStatus;
  owner: string;
  contact: { name: string; phone: string; email: string; line: string };
  contractFile: string;
  contractGeneratedAt: string;
  signedFile?: string | undefined;
  activities: Activity[];
  nextActivity?: string | undefined;
  markedBy?: string | undefined;
  markedAt?: string | undefined;
  churnType?: ChurnType | undefined;
  churnReason?: string | undefined;
};

/* --- Org directory (employee code + nickname) --- */

export const aeDirectory = ["AE001-Nont", "AE002-Fern", "AE003-Boss"];
export const ormTeams = ["Team A", "Team B", "Team C", "Team D", "Team E", "Re-active"];
export const ormDirectory = [
  { code: "ORM001", nickname: "Somchai", team: "Team A" },
  { code: "ORM002", nickname: "Malee", team: "Team B" },
  { code: "ORM003", nickname: "Prasert", team: "Team C" },
  { code: "ORM004", nickname: "Somying", team: "Re-active" },
  { code: "—", nickname: "(empty)", team: "Team D" },
  { code: "—", nickname: "(empty)", team: "Team E" },
];
export const marcomDirectory = ["MC001-แนน", "MC002-บิว", "MC003-โบว์", "MC004-เจน"];
export const specialistDirectory = ["SP001-Dao"];
export const allPeople = [
  ...aeDirectory,
  "PM001-Alex",
  ...specialistDirectory,
  ...ormDirectory.filter((o) => o.code !== "—").map((o) => `${o.code}-${o.nickname}`),
  ...marcomDirectory,
  "GRM001-Wichai",
];

export const aeCodeByRole: Record<string, string> = {
  AE: "AE001-Nont",
  "Partner Manager": "PM001-Alex",
};

/* --- Zone 2 performance mock --- */

export const meetingQuantity = {
  base: 18,
  bars: [
    { tier: "A", count: 15, tone: "danger" as const },
    { tier: "B", count: 5, tone: "warn" as const },
    { tier: "C", count: 0, tone: "success" as const },
  ],
};

export const surveyCollection = { filled: 27, meetings: 30 };

export const tierAPipeline7 = [
  { label: "Not Assign", value: 4 },
  { label: "Draft", value: 6 },
  { label: "Confirm", value: 7 },
  { label: "Reject", value: 1 },
  { label: "Completed", value: 3 },
  { label: "No-show", value: 1 },
  { label: "Postpone", value: 2 },
];

/* --- Renewal rate mock --- */

export const renewalRate = {
  month: { label: "Sep 2026", total: 5, onProcess: 3, completed: 1, churn: 1 },
  ytd: { label: "YTD 2026", total: 42, completed: 35, churn: 7 },
};

export const portfolioTotals = { totalHotels: 42, renewals45d: 3 };

/* --- Cards --- */

const initialCards: RenewalCard[] = [
  {
    id: "RN-1",
    hotelId: "HTL0042",
    hotel: "Grand Palace Bangkok",
    contractEnd: "24 Sep 2026",
    daysLeft: 12,
    status: "ON_PROCESS",
    owner: "AE001-Nont",
    contact: {
      name: "คุณสมศักดิ์ วงศ์ประเสริฐ",
      phone: "081-234-5678",
      email: "somsak@grandpalace-bkk.com",
      line: "@grandpalacebkk",
    },
    contractFile: "Contract_v1_2025.pdf",
    contractGeneratedAt: "15 Sep 2025",
    activities: [
      {
        id: "A-3",
        type: "Call",
        at: "8 Sep 2026 14:30",
        note: "รอลูกค้ายืนยันราคาห้อง Deluxe ก่อนส่งสัญญาใหม่",
        by: "AE001-Nont",
      },
      {
        id: "A-2",
        type: "Meeting",
        at: "1 Sep 2026 14:00",
        note: "นัดคุย face-to-face ที่โรงแรม",
        by: "AE001-Nont",
      },
      {
        id: "A-1",
        type: "Email",
        at: "25 Aug 2026 09:15",
        note: "ส่ง proposal ต่อสัญญา rate เดิม",
        file: "proposal_v1.pdf",
        by: "AE001-Nont",
      },
    ],
    nextActivity: "🤝 Meeting · 12 Sep 10:00",
  },
  {
    id: "RN-2",
    hotelId: "HTL0055",
    hotel: "Ocean View Phuket",
    contractEnd: "10 Oct 2026",
    daysLeft: 28,
    status: "ON_PROCESS",
    owner: "AE001-Nont",
    contact: {
      name: "คุณวราภรณ์ ชูเกียรติ",
      phone: "089-556-1200",
      email: "wara@oceanview-pkt.com",
      line: "@oceanviewpkt",
    },
    contractFile: "Contract_v1_2025.pdf",
    contractGeneratedAt: "8 Oct 2025",
    activities: [
      {
        id: "B-2",
        type: "Call",
        at: "8 Sep 2026 14:30",
        note: "รอลูกค้ายืนยันราคาห้อง Deluxe ก่อนส่งสัญญาใหม่",
        by: "AE001-Nont",
      },
      {
        id: "B-1",
        type: "Email",
        at: "1 Sep 2026 10:00",
        note: "ส่งสรุปผลงาน 12 เดือนเพื่อประกอบการต่อสัญญา",
        file: "performance_2026.pdf",
        by: "AE001-Nont",
      },
    ],
    nextActivity: "🤝 Meeting · 12 Sep 10:00",
  },
  {
    id: "RN-3",
    hotelId: "HTL0071",
    hotel: "City Center Bangkok",
    contractEnd: "23 Oct 2026",
    daysLeft: 41,
    status: "ON_PROCESS",
    owner: "AE001-Nont",
    contact: {
      name: "คุณธนกฤต อารีย์",
      phone: "086-119-4477",
      email: "thanakrit@citycenter-bkk.com",
      line: "@citycenterbkk",
    },
    contractFile: "Contract_v1_2025.pdf",
    contractGeneratedAt: "20 Oct 2025",
    activities: [
      {
        id: "C-1",
        type: "Email",
        at: "5 Sep 2026 09:00",
        note: "ส่ง proposal ต่อสัญญาปีต่อไป (rate เดิม + เพิ่ม SocialPlus+)",
        file: "proposal_citycenter.pdf",
        by: "AE001-Nont",
      },
    ],
  },
  {
    id: "RN-4",
    hotelId: "HTL0089",
    hotel: "Sunrise Boutique",
    contractEnd: "30 Sep 2026",
    daysLeft: 18,
    status: "COMPLETED",
    owner: "AE002-Fern",
    contact: {
      name: "คุณพิมพ์ชนก ศรีสุข",
      phone: "081-777-3321",
      email: "pim@sunrise-boutique.com",
      line: "@sunriseboutique",
    },
    contractFile: "Contract_v1_2025.pdf",
    contractGeneratedAt: "25 Sep 2025",
    signedFile: "signed_contract_2026.pdf",
    activities: [
      {
        id: "D-3",
        type: "Contract",
        at: "3 Sep 2026 16:00",
        note: "ลูกค้าเซ็นแล้ว",
        file: "signed_contract_2026.pdf",
        by: "AE002-Fern",
      },
      {
        id: "D-2",
        type: "Meeting",
        at: "20 Aug 2026 11:00",
        note: "ลูกค้าตกลงต่อสัญญา",
        by: "AE002-Fern",
      },
      {
        id: "D-1",
        type: "Email",
        at: "15 Aug 2026 09:00",
        note: "ส่ง proposal ปีต่อไป",
        by: "AE002-Fern",
      },
    ],
    markedBy: "AE002-Fern",
    markedAt: "3 Sep 2026",
  },
  {
    id: "RN-5",
    hotelId: "HTL0102",
    hotel: "Riverside Krabi",
    contractEnd: "1 Sep 2026",
    daysLeft: 0,
    status: "CHURN",
    owner: "AE003-Boss",
    contact: {
      name: "คุณอนุชา แก้วมณี",
      phone: "082-448-9012",
      email: "anucha@riverside-krabi.com",
      line: "@riversidekrabi",
    },
    contractFile: "Contract_v1_2025.pdf",
    contractGeneratedAt: "28 Aug 2025",
    activities: [
      {
        id: "E-1",
        type: "Call",
        at: "28 Aug 2026 13:00",
        note: "ลูกค้าแจ้งไม่ต่อสัญญา — เปลี่ยนไปทำ in-house",
        by: "AE003-Boss",
      },
    ],
    markedBy: "AE003-Boss",
    markedAt: "1 Sep 2026",
    churnType: "ไม่ต่อ (Non-renewal)",
    churnReason: "ลูกค้าตั้งทีม revenue in-house เอง",
  },
];

export type ContractUpdate = {
  id: string;
  outcome: "COMPLETED" | "CHURN";
  hotelId: string;
  hotel: string;
  churnType?: ChurnType | undefined;
  by: string;
  ago: string;
  read: boolean;
};

const initialUpdates: ContractUpdate[] = [
  {
    id: "U-1",
    outcome: "COMPLETED",
    hotelId: "HTL0089",
    hotel: "Sunrise Boutique",
    by: "AE002-Fern",
    ago: "2 hours ago",
    read: false,
  },
  {
    id: "U-2",
    outcome: "CHURN",
    hotelId: "HTL0102",
    hotel: "Riverside Krabi",
    churnType: "ฉีกสัญญา (Early Termination)",
    by: "AE003-Boss",
    ago: "5 hours ago",
    read: false,
  },
];

type Ctx = {
  cards: RenewalCard[];
  updates: ContractUpdate[];
  unread: number;
  addActivity: (cardId: string, activity: Omit<Activity, "id">) => void;
  markDone: (
    cardId: string,
    outcome: "COMPLETED" | "CHURN",
    by: string,
    churnType?: ChurnType,
    reason?: string,
  ) => void;
  markAllRead: () => void;
};

const PsRenewalContext = createContext<Ctx | null>(null);

export function PsRenewalProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<RenewalCard[]>(initialCards);
  const [updates, setUpdates] = useState<ContractUpdate[]>(initialUpdates);

  const value = useMemo<Ctx>(
    () => ({
      cards,
      updates,
      unread: updates.filter((u) => !u.read).length,
      addActivity: (cardId, activity) =>
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  status: c.status === "NOT_STARTED" ? "ON_PROCESS" : c.status,
                  signedFile: activity.type === "Contract" ? activity.file : c.signedFile,
                  activities: [{ ...activity, id: `${cardId}-${Date.now()}` }, ...c.activities],
                }
              : c,
          ),
        ),
      markDone: (cardId, outcome, by, churnType, reason) => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  status: outcome,
                  markedBy: by,
                  markedAt: "วันนี้",
                  churnType: outcome === "CHURN" ? churnType : undefined,
                  churnReason: outcome === "CHURN" ? reason : undefined,
                }
              : c,
          ),
        );
        const card = cards.find((c) => c.id === cardId);
        if (card)
          setUpdates((prev) => [
            {
              id: `U-${Date.now()}`,
              outcome,
              hotelId: card.hotelId,
              hotel: card.hotel,
              churnType: outcome === "CHURN" ? churnType : undefined,
              by,
              ago: "just now",
              read: false,
            },
            ...prev,
          ]);
      },
      markAllRead: () => setUpdates((prev) => prev.map((u) => ({ ...u, read: true }))),
    }),
    [cards, updates],
  );

  return <PsRenewalContext.Provider value={value}>{children}</PsRenewalContext.Provider>;
}

export function usePsRenewal() {
  const ctx = useContext(PsRenewalContext);
  if (!ctx) throw new Error("usePsRenewal must be used inside PsRenewalProvider");
  return ctx;
}

export const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);
