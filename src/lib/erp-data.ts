import {
  Briefcase,
  Calculator,
  ConciergeBell,
  MessageSquareHeart,
  Megaphone,
  Users,
  Workflow,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type Trend = "up" | "down" | "flat";

export type Kpi = {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  hint: string;
};

export type Row = {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
  value: string;
  status: "on-track" | "at-risk" | "critical" | "done";
  progress: number;
};

export type ModuleConfig = {
  slug: string;
  code: string;
  name: string;
  to: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  kpis: Kpi[];
  tableTitle: string;
  tableCaption: string;
  rows: Row[];
  queue: { title: string; detail: string; owner: string; due: string }[];
  breakdown: { label: string; value: number }[];
};

const mod = (m: ModuleConfig) => m;

export const modules: ModuleConfig[] = [
  mod({
    slug: "bd",
    code: "BD",
    name: "Business Development",
    to: "/bd",
    icon: Briefcase,
    tagline: "Pipeline, RFPs & corporate accounts",
    description:
      "Track group leads, corporate rate agreements and MICE opportunities across the portfolio.",
    kpis: [
      { label: "Qualified pipeline", value: "$4.82M", delta: "+12.4%", trend: "up", hint: "vs. last quarter" },
      { label: "Open RFPs", value: "38", delta: "+6", trend: "up", hint: "9 closing this week" },
      { label: "Win rate", value: "31.6%", delta: "-2.1%", trend: "down", hint: "rolling 90 days" },
      { label: "Avg. deal size", value: "$126K", delta: "+4.8%", trend: "up", hint: "corporate & MICE" },
    ],
    tableTitle: "Active opportunities",
    tableCaption: "Weighted pipeline by account owner",
    rows: [
      { id: "OPP-2041", primary: "Nordwind Group — Annual RFP", secondary: "Corporate · 4 properties", meta: "A. Rahman", value: "$780K", status: "on-track", progress: 72 },
      { id: "OPP-2038", primary: "Pacific Med Congress 2027", secondary: "MICE · 1,200 rooms", meta: "L. Chandra", value: "$1.2M", status: "at-risk", progress: 44 },
      { id: "OPP-2033", primary: "Helios Airlines crew block", secondary: "Long stay · 12 months", meta: "S. Okafor", value: "$540K", status: "on-track", progress: 88 },
      { id: "OPP-2027", primary: "Vantage Capital offsite", secondary: "Corporate · Q1 2027", meta: "M. Duarte", value: "$310K", status: "critical", progress: 21 },
      { id: "OPP-2019", primary: "Riverstone Weddings retainer", secondary: "Social · Recurring", meta: "K. Lindqvist", value: "$188K", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Send Nordwind rate sheet", detail: "Negotiated LNR grid pending approval", owner: "A. Rahman", due: "Today" },
      { title: "Site inspection — Pacific Med", detail: "Ballroom + 3 breakout rooms", owner: "L. Chandra", due: "Thu" },
      { title: "Renew Helios contract", detail: "Auto-renewal window closes in 9 days", owner: "S. Okafor", due: "Aug 12" },
    ],
    breakdown: [
      { label: "Corporate", value: 42 },
      { label: "MICE", value: 28 },
      { label: "Leisure groups", value: 18 },
      { label: "Long stay", value: 12 },
    ],
  }),
  mod({
    slug: "ac",
    code: "AC",
    name: "Accounting",
    to: "/ac",
    icon: Calculator,
    tagline: "Revenue, AR/AP & month-end close",
    description:
      "Consolidated ledgers, receivables ageing and daily revenue posting across all operating units.",
    kpis: [
      { label: "MTD revenue", value: "$8.94M", delta: "+7.9%", trend: "up", hint: "vs. budget +3.1%" },
      { label: "Receivables > 60d", value: "$412K", delta: "-9.2%", trend: "down", hint: "18 accounts" },
      { label: "GOP margin", value: "38.2%", delta: "+1.4%", trend: "up", hint: "portfolio blended" },
      { label: "Close progress", value: "84%", delta: "Day 3", trend: "flat", hint: "July close cycle" },
    ],
    tableTitle: "Receivables ageing",
    tableCaption: "Top exposures by debtor account",
    rows: [
      { id: "AR-8812", primary: "Nordwind Group", secondary: "Corporate ledger", meta: "62 days", value: "$146K", status: "at-risk", progress: 62 },
      { id: "AR-8790", primary: "Skyline Travel DMC", secondary: "Wholesale", meta: "31 days", value: "$98K", status: "on-track", progress: 31 },
      { id: "AR-8771", primary: "Helios Airlines", secondary: "Crew accommodation", meta: "94 days", value: "$88K", status: "critical", progress: 94 },
      { id: "AR-8744", primary: "Vantage Capital", secondary: "Events & banqueting", meta: "12 days", value: "$54K", status: "on-track", progress: 12 },
      { id: "AR-8702", primary: "Meridian OTA", secondary: "Channel settlement", meta: "Settled", value: "$26K", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Post night audit variance", detail: "Property 04 — $2,140 unallocated", owner: "Finance ops", due: "Today" },
      { title: "Approve F&B accruals", detail: "July banqueting cost accrual", owner: "Controller", due: "Wed" },
      { title: "Dunning run — 90d bucket", detail: "3 accounts escalate to legal", owner: "Credit team", due: "Aug 08" },
    ],
    breakdown: [
      { label: "Rooms", value: 58 },
      { label: "F&B", value: 26 },
      { label: "Events", value: 10 },
      { label: "Other", value: 6 },
    ],
  }),
  mod({
    slug: "ps",
    code: "PS",
    name: "Property Services",
    to: "/ps",
    icon: ConciergeBell,
    tagline: "Housekeeping, engineering & guest requests",
    description:
      "Live room status, preventive maintenance and service recovery across housekeeping and engineering.",
    kpis: [
      { label: "Rooms ready", value: "412 / 480", delta: "+22", trend: "up", hint: "86% clean & inspected" },
      { label: "Open work orders", value: "57", delta: "-11", trend: "down", hint: "9 priority" },
      { label: "Avg. response", value: "11m 40s", delta: "-2m 05s", trend: "down", hint: "guest requests" },
      { label: "PM compliance", value: "93%", delta: "+3.0%", trend: "up", hint: "monthly schedule" },
    ],
    tableTitle: "Work orders",
    tableCaption: "Live queue across engineering and housekeeping",
    rows: [
      { id: "WO-5521", primary: "AC unit fault — Suite 1804", secondary: "Engineering · HVAC", meta: "Priority 1", value: "42m", status: "critical", progress: 30 },
      { id: "WO-5518", primary: "Deep clean turn — Floor 12", secondary: "Housekeeping", meta: "Team B", value: "2h 10m", status: "on-track", progress: 65 },
      { id: "WO-5509", primary: "Pool filtration service", secondary: "Engineering · PM", meta: "Scheduled", value: "3h", status: "on-track", progress: 40 },
      { id: "WO-5498", primary: "Minibar restock — Tower A", secondary: "Housekeeping", meta: "Team D", value: "55m", status: "at-risk", progress: 25 },
      { id: "WO-5480", primary: "Lift 3 annual inspection", secondary: "Vendor · Otis", meta: "Completed", value: "—", status: "done", progress: 100 },
    ],
    queue: [
      { title: "VIP arrival prep — 2201", detail: "Amenity set + turndown by 15:00", owner: "Housekeeping", due: "15:00" },
      { title: "Escalate HVAC vendor SLA", detail: "3rd fault on Tower B chiller", owner: "Chief engineer", due: "Today" },
      { title: "Linen par re-order", detail: "Below par on king duvet covers", owner: "Purchasing", due: "Fri" },
    ],
    breakdown: [
      { label: "Housekeeping", value: 46 },
      { label: "Engineering", value: 34 },
      { label: "Guest requests", value: 14 },
      { label: "Vendor", value: 6 },
    ],
  }),
  mod({
    slug: "orm",
    code: "ORM",
    name: "Online Reputation",
    to: "/orm",
    icon: MessageSquareHeart,
    tagline: "Reviews, sentiment & guest recovery",
    description:
      "Unified review inbox with sentiment scoring, response SLAs and service recovery tracking.",
    kpis: [
      { label: "Reputation index", value: "8.9 / 10", delta: "+0.3", trend: "up", hint: "portfolio weighted" },
      { label: "Reviews (30d)", value: "1,284", delta: "+18.2%", trend: "up", hint: "all channels" },
      { label: "Response SLA", value: "96%", delta: "+4.1%", trend: "up", hint: "within 24h" },
      { label: "Negative open", value: "23", delta: "+5", trend: "down", hint: "awaiting recovery" },
    ],
    tableTitle: "Review inbox",
    tableCaption: "Prioritised by sentiment and reach",
    rows: [
      { id: "RV-9931", primary: "\"Check-in took 40 minutes\"", secondary: "Google · 2★ · Grand Marina", meta: "Unanswered", value: "2★", status: "critical", progress: 15 },
      { id: "RV-9928", primary: "\"Spa was exceptional\"", secondary: "TripAdvisor · 5★ · Bayfront", meta: "Answered", value: "5★", status: "done", progress: 100 },
      { id: "RV-9921", primary: "\"Room noise from corridor\"", secondary: "Booking.com · 3★ · Metro", meta: "In recovery", value: "3★", status: "at-risk", progress: 55 },
      { id: "RV-9915", primary: "\"Breakfast variety limited\"", secondary: "Expedia · 3★ · Riverside", meta: "Drafted", value: "3★", status: "on-track", progress: 70 },
      { id: "RV-9902", primary: "\"Best concierge team\"", secondary: "Google · 5★ · Grand Marina", meta: "Answered", value: "5★", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Recovery call — RV-9931", detail: "Offer late checkout + F&B credit", owner: "Guest relations", due: "Today" },
      { title: "Weekly sentiment digest", detail: "Send to GM council", owner: "ORM lead", due: "Mon" },
      { title: "Tag corridor noise theme", detail: "12 mentions this month", owner: "Analyst", due: "Wed" },
    ],
    breakdown: [
      { label: "Positive", value: 71 },
      { label: "Neutral", value: 18 },
      { label: "Negative", value: 8 },
      { label: "Unrated", value: 3 },
    ],
  }),
  mod({
    slug: "marcom",
    code: "MARCOM",
    name: "Marketing & Comms",
    to: "/marcom",
    icon: Megaphone,
    tagline: "Campaigns, channels & brand demand",
    description:
      "Campaign performance, direct-booking share and content calendar across owned and paid channels.",
    kpis: [
      { label: "Direct share", value: "41.7%", delta: "+3.6%", trend: "up", hint: "of total bookings" },
      { label: "Campaign ROAS", value: "6.2x", delta: "+0.8x", trend: "up", hint: "paid blended" },
      { label: "Email CTR", value: "4.9%", delta: "-0.4%", trend: "down", hint: "loyalty base" },
      { label: "Cost per booking", value: "$28.40", delta: "-11.2%", trend: "down", hint: "paid channels" },
    ],
    tableTitle: "Live campaigns",
    tableCaption: "Spend pacing and contribution",
    rows: [
      { id: "CMP-311", primary: "Monsoon Escape — SEA", secondary: "Paid social · Meta", meta: "Pacing 104%", value: "$62K", status: "on-track", progress: 78 },
      { id: "CMP-308", primary: "Suite Upgrade Loyalty Push", secondary: "Email + app", meta: "Pacing 88%", value: "$14K", status: "on-track", progress: 61 },
      { id: "CMP-305", primary: "Corporate Q4 Retainer", secondary: "LinkedIn ABM", meta: "Pacing 51%", value: "$40K", status: "at-risk", progress: 34 },
      { id: "CMP-299", primary: "Brand Search Defense", secondary: "SEM · Google", meta: "Pacing 132%", value: "$88K", status: "critical", progress: 90 },
      { id: "CMP-288", primary: "Wedding Season Landing", secondary: "SEO + content", meta: "Completed", value: "$9K", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Approve Q4 creative set", detail: "6 assets pending brand review", owner: "Brand lead", due: "Today" },
      { title: "Cap brand search spend", detail: "Budget overrun risk of $12K", owner: "Performance", due: "Tomorrow" },
      { title: "Publish autumn content plan", detail: "Editorial calendar wk 33-40", owner: "Content", due: "Fri" },
    ],
    breakdown: [
      { label: "Direct", value: 42 },
      { label: "OTA", value: 33 },
      { label: "Corporate", value: 16 },
      { label: "Wholesale", value: 9 },
    ],
  }),
  mod({
    slug: "hr",
    code: "HR",
    name: "Human Resources",
    to: "/hr",
    icon: Users,
    tagline: "Headcount, rostering & talent",
    description:
      "Workforce planning, shift coverage, onboarding pipeline and training compliance by department.",
    kpis: [
      { label: "Headcount", value: "1,482", delta: "+34", trend: "up", hint: "across 6 properties" },
      { label: "Open roles", value: "62", delta: "-8", trend: "down", hint: "21 critical" },
      { label: "Turnover (12m)", value: "18.4%", delta: "-2.7%", trend: "down", hint: "target 17%" },
      { label: "Training compliance", value: "91%", delta: "+5.0%", trend: "up", hint: "mandatory modules" },
    ],
    tableTitle: "Requisitions & coverage",
    tableCaption: "Departmental hiring and shift fill",
    rows: [
      { id: "REQ-441", primary: "Front Office Supervisor", secondary: "Grand Marina · Rooms", meta: "3 candidates", value: "Stage 3", status: "on-track", progress: 68 },
      { id: "REQ-437", primary: "Sous Chef — Banquets", secondary: "Bayfront · F&B", meta: "1 candidate", value: "Stage 2", status: "at-risk", progress: 40 },
      { id: "REQ-430", primary: "Housekeeping Attendants ×12", secondary: "Metro · Rooms", meta: "Bulk hire", value: "Stage 1", status: "critical", progress: 18 },
      { id: "REQ-421", primary: "Revenue Analyst", secondary: "Corporate · Commercial", meta: "Offer out", value: "Stage 4", status: "on-track", progress: 86 },
      { id: "REQ-410", primary: "Spa Therapist", secondary: "Riverside · Wellness", meta: "Hired", value: "Closed", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Approve night shift roster", detail: "Week 33 — 4 gaps in Rooms", owner: "Ops manager", due: "Today" },
      { title: "Onboarding day — 9 starters", detail: "Orientation + systems access", owner: "HR ops", due: "Mon" },
      { title: "Fire safety recertification", detail: "58 staff overdue", owner: "L&D", due: "Aug 15" },
    ],
    breakdown: [
      { label: "Rooms", value: 38 },
      { label: "F&B", value: 31 },
      { label: "Engineering", value: 13 },
      { label: "Admin", value: 18 },
    ],
  }),
  mod({
    slug: "automation",
    code: "AUTO",
    name: "Automation",
    to: "/automation",
    icon: Workflow,
    tagline: "Workflows, integrations & rules engine",
    description:
      "Cross-module workflows, system integrations and the rules engine driving alerts and hand-offs.",
    kpis: [
      { label: "Active workflows", value: "148", delta: "+12", trend: "up", hint: "across 8 modules" },
      { label: "Runs (24h)", value: "26,410", delta: "+9.4%", trend: "up", hint: "99.2% success" },
      { label: "Failed runs", value: "212", delta: "+38", trend: "down", hint: "needs triage" },
      { label: "Hours saved / wk", value: "1,940", delta: "+120", trend: "up", hint: "estimated" },
    ],
    tableTitle: "Workflow health",
    tableCaption: "Highest-volume automations",
    rows: [
      { id: "WF-102", primary: "Night audit → GL posting", secondary: "AC · nightly 03:00", meta: "Success 99.9%", value: "1,240 runs", status: "on-track", progress: 99 },
      { id: "WF-097", primary: "Negative review → recovery task", secondary: "ORM → PS", meta: "Success 97.1%", value: "318 runs", status: "on-track", progress: 97 },
      { id: "WF-093", primary: "OTA rate parity sync", secondary: "Marcom · every 15m", meta: "Success 88.4%", value: "2,880 runs", status: "at-risk", progress: 88 },
      { id: "WF-088", primary: "Contract expiry → BD alert", secondary: "BD · daily", meta: "Failing", value: "44 runs", status: "critical", progress: 42 },
      { id: "WF-081", primary: "New hire → access provisioning", secondary: "HR · on event", meta: "Success 100%", value: "62 runs", status: "done", progress: 100 },
    ],
    queue: [
      { title: "Triage WF-088 failures", detail: "Auth token expired on CRM connector", owner: "Platform", due: "Today" },
      { title: "Publish parity retry rule", detail: "Exponential backoff, max 5", owner: "Automation eng", due: "Thu" },
      { title: "Quarterly rules audit", detail: "34 rules unused in 90 days", owner: "Ops excellence", due: "Aug 30" },
    ],
    breakdown: [
      { label: "Operations", value: 40 },
      { label: "Finance", value: 24 },
      { label: "Commercial", value: 22 },
      { label: "People", value: 14 },
    ],
  }),
];

export const executiveModule = {
  slug: "executive",
  code: "EXEC",
  name: "Executive",
  to: "/",
  icon: LayoutDashboard,
  tagline: "Portfolio performance at a glance",
};

export const getModule = (slug: string) => modules.find((m) => m.slug === slug)!;

export type Notification = {
  id: string;
  module: string;
  title: string;
  detail: string;
  time: string;
  severity: "critical" | "warning" | "info";
  unread: boolean;
};

export const notifications: Notification[] = [
  {
    id: "n1",
    module: "AUTO",
    title: "Workflow WF-088 failing",
    detail: "CRM connector token expired — 44 runs affected.",
    time: "6m ago",
    severity: "critical",
    unread: true,
  },
  {
    id: "n2",
    module: "ORM",
    title: "2★ review needs response",
    detail: "Grand Marina — check-in delay, SLA in 3h.",
    time: "24m ago",
    severity: "warning",
    unread: true,
  },
  {
    id: "n3",
    module: "AC",
    title: "Receivable past 90 days",
    detail: "Helios Airlines — $88K escalation ready.",
    time: "1h ago",
    severity: "warning",
    unread: true,
  },
  {
    id: "n4",
    module: "PS",
    title: "Priority 1 work order open",
    detail: "Suite 1804 HVAC fault, VIP arrival at 15:00.",
    time: "2h ago",
    severity: "critical",
    unread: false,
  },
  {
    id: "n5",
    module: "HR",
    title: "Night roster has 4 gaps",
    detail: "Week 33 Rooms division — approval pending.",
    time: "4h ago",
    severity: "info",
    unread: false,
  },
  {
    id: "n6",
    module: "BD",
    title: "RFP closing in 48 hours",
    detail: "Nordwind Group annual agreement.",
    time: "Yesterday",
    severity: "info",
    unread: false,
  },
];

export const properties = [
  "All properties",
  "Grand Marina",
  "Bayfront Residences",
  "Metro Central",
  "Riverside Retreat",
];
