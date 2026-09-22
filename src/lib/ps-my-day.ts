/* PS App v4.1 · Zone 0 "My Day" — mock-only dataset (AE001-Nont logged in). */

export type MyDayRange = "today" | "7d" | "14d";

export type ScheduledItem = {
  id: string;
  meeting_type: "ORM" | "MARCOM";
  time: string;
  date: string;
  hotel_name: string;
  tier: string;
  counterparty: string;
};

export type TaskType = "renewal" | "onboarding" | "coaching" | "survey";

export type TodoItem = {
  id: string;
  type: TaskType;
  hotel_name?: string;
  task_name?: string;
  action?: string;
  target?: string;
  reference?: string;
  due_date: string;
  due_relative?: string;
  days_remaining?: number;
  display?: string;
};

export const MY_DAY_TODAY = "2026-09-22";

export const scheduledItems: ScheduledItem[] = [
  {
    id: "m001",
    meeting_type: "ORM",
    time: "10:00",
    date: "2026-09-22",
    hotel_name: "Grand Palace BKK",
    tier: "A",
    counterparty: "ORM001-Somchai",
  },
  {
    id: "m002",
    meeting_type: "MARCOM",
    time: "14:00",
    date: "2026-09-22",
    hotel_name: "Sunrise Boutique",
    tier: "—",
    counterparty: "MC001-แนน (Lead)",
  },
  {
    id: "m003",
    meeting_type: "ORM",
    time: "11:00",
    date: "2026-09-25",
    hotel_name: "Ocean View",
    tier: "B",
    counterparty: "ORM002-Ploy",
  },
  {
    id: "m004",
    meeting_type: "MARCOM",
    time: "09:30",
    date: "2026-10-02",
    hotel_name: "Green Valley",
    tier: "—",
    counterparty: "MC002-Ken",
  },
];

export const todoItems: TodoItem[] = [
  { id: "t001", type: "renewal", hotel_name: "Ocean View", due_date: "2026-09-22", due_relative: "due today" },
  { id: "t002", type: "renewal", hotel_name: "Blue Lagoon", due_date: "2026-09-22", due_relative: "due today" },
  {
    id: "t003",
    type: "onboarding",
    hotel_name: "Hotel Aurora",
    task_name: "Introduction & Sent Form",
    due_date: "2026-09-22",
    due_relative: "due today",
  },
  { id: "t004", type: "coaching", action: "Follow up", target: "AE001-Nont", reference: "Q3 flag", due_date: "2026-09-22" },
  { id: "t005", type: "coaching", action: "Coach", target: "AE002-Fern", reference: "Q7 flag", due_date: "2026-09-23" },
  { id: "t006", type: "survey", hotel_name: "Grand Palace", days_remaining: 1, display: "d-1", due_date: "2026-09-23" },
  { id: "t007", type: "survey", hotel_name: "Sunset Villa", days_remaining: 2, display: "d-2", due_date: "2026-09-24" },
];

const dayDiff = (iso: string) =>
  Math.round((new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${MY_DAY_TODAY}T00:00:00Z`).getTime()) / 86_400_000);

const rangeDays: Record<MyDayRange, number> = { today: 0, "7d": 7, "14d": 14 };

export const inRange = (iso: string, range: MyDayRange) => {
  const d = dayDiff(iso);
  return d >= 0 && d <= rangeDays[range];
};

export const rangeLabel: Record<MyDayRange, string> = { today: "Today", "7d": "7 days", "14d": "14 days" };

export const emptyScheduledText: Record<MyDayRange, string> = {
  today: "No meetings today 🎉",
  "7d": "No meetings this week 🎉",
  "14d": "No meetings in 14 days 🎉",
};

export const taskGroups: { type: TaskType; icon: string; label: string; color: string }[] = [
  { type: "renewal", icon: "🔄", label: "RENEWALS", color: "#0EA5E9" },
  { type: "onboarding", icon: "📞", label: "ONBOARDING", color: "#A855F7" },
  { type: "coaching", icon: "🎯", label: "COACHING", color: "#F97316" },
  { type: "survey", icon: "📋", label: "SURVEYS", color: "#10B981" },
];

export const todoText = (t: TodoItem) => {
  switch (t.type) {
    case "renewal":
      return `${t.hotel_name} · ${t.due_relative ?? ""}`.trim();
    case "onboarding":
      return `${t.hotel_name} · ${t.task_name} · ${t.due_relative ?? ""}`.trim();
    case "coaching":
      return `${t.action} ${t.target} · ${t.reference}`;
    case "survey":
      return `${t.hotel_name} · ${t.display}`;
  }
};
