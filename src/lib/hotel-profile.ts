export type ServiceCategory = "orm" | "marcom" | "production";

export const contractorTypes = [
  "บริษัทจำกัด",
  "บริษัทมหาชนจำกัด",
  "ห้างหุ้นส่วนจำกัด",
  "บุคคลธรรมดา",
  "เครือโรงแรม (Chain)",
] as const;

export const serviceCategoryOptions: { value: ServiceCategory; label: string }[] = [
  { value: "orm", label: "ORM" },
  { value: "marcom", label: "Marcom" },
  { value: "production", label: "Production / One-time" },
];

export const serviceTypeOptions: Record<ServiceCategory, string[]> = {
  orm: ["ORM Full Service", "ORM Lite Service"],
  marcom: ["Marcom Full Service", "Marcom Lite Service"],
  production: ["Production / One-time"],
};

export const marcomPlatforms = ["Meta", "Tiktok", "Google"] as const;

export const productionItems = [
  "Google My Business",
  "RevPlus+",
  "SocialPlus+",
  "Register OTA",
  "Register Meta",
  "Register Tiktok",
  "Photoshoot Half Day",
  "Photoshoot Full Day",
  "Photoshoot Full Day + VDO",
  "VDO Done",
  "KOL",
] as const;

export const upsellItems = [
  "Google My Business",
  "RevPlus+",
  "SocialPlus+",
  "Extra Creative Set",
  "Influencer / KOL",
  "Photoshoot Add-on",
  "Landing Page",
] as const;

export type Upsell = {
  id: string;
  item: string;
  mode: "one-time" | "contract";
  start?: Date | undefined;
  end?: Date | undefined;
};

export type ServiceBlock = {
  id: string;
  category: ServiceCategory | "";
  serviceType: string;
  periodStart?: Date | undefined;
  periodEnd?: Date | undefined;
  /* ORM */
  monthlyFee: string;
  commission: string;
  guarantee: "yes" | "no";
  guaranteeAmount: string;
  /* Marcom */
  platforms: string[];
  marcomFee: string;
  upsells: Upsell[];
  /* Production */
  productionItem: string;
  productionAmount: string;
};

export const emptyService = (): ServiceBlock => ({
  id: crypto.randomUUID(),
  category: "",
  serviceType: "",
  monthlyFee: "",
  commission: "",
  guarantee: "no",
  guaranteeAmount: "",
  platforms: [],
  marcomFee: "",
  upsells: [],
  productionItem: "",
  productionAmount: "",
});

export type HotelStatus = "active" | "overdue" | "contract-end" | "terminated";

export const statusMeta: Record<HotelStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/12 text-success" },
  overdue: { label: "ค้างชำระ 2 เดือน", className: "bg-warning/20 text-warning-foreground" },
  "contract-end": { label: "Contract End", className: "bg-muted text-muted-foreground" },
  terminated: { label: "Terminate", className: "bg-destructive/12 text-destructive" },
};

export function detectStatus(input: {
  contractEnd?: Date | undefined;
  terminated: boolean;
  overdueMonths: number;
}): HotelStatus {
  if (input.terminated) return "terminated";
  if (input.contractEnd && input.contractEnd.getTime() < Date.now()) return "contract-end";
  if (input.overdueMonths >= 2) return "overdue";
  return "active";
}

export function paymentScore(overdueMonths: number, latePayments: number) {
  const score = Math.max(0, 100 - overdueMonths * 25 - latePayments * 5);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
  return { score, grade };
}

export const formatDate = (d?: Date | undefined) =>
  d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

/* ---------------- Access permissions ---------------- */

export const accessPermissionOptions = [
  { value: "finance", label: "การเงิน", detail: "Invoice, ใบหักภาษี ณ ที่จ่าย, ใบกำกับภาษี" },
  { value: "report", label: "รายงาน", detail: "Production Report, Snapshot, Sync up" },
  { value: "looker", label: "Looker Studio", detail: "ORM, Marcom" },
  { value: "contract", label: "สัญญา", detail: "เอกสารสัญญาและภาคผนวก" },
  { value: "pricing", label: "Pricing", detail: "โครงสร้างราคาและส่วนลด" },
  { value: "content", label: "Content", detail: "คอนเทนต์และสื่อโฆษณา" },
  { value: "reservation", label: "Reservation", detail: "การจองและ availability" },
  { value: "inquiry", label: "Guest Inquiry", detail: "คำถามและเคสจากผู้เข้าพัก" },
] as const;

export type AccessPermission = (typeof accessPermissionOptions)[number]["value"];

export type Contact = {
  id: string;
  fullName: string;
  nickname: string;
  position: string;
  phone: string;
  email: string;
  permissions: AccessPermission[];
};

export const emptyContact = (): Contact => ({
  id: crypto.randomUUID(),
  fullName: "",
  nickname: "",
  position: "",
  phone: "",
  email: "",
  permissions: [],
});

/* ---------------- Contract terms ---------------- */

export type ContractTerm = {
  id: string;
  start?: Date | undefined;
  end?: Date | undefined;
  services: ServiceBlock[];
};

export const emptyContractTerm = (services?: ServiceBlock[]): ContractTerm => ({
  id: crypto.randomUUID(),
  services: services?.length ? services.map((s) => cloneService(s)) : [emptyService()],
});

export const cloneService = (s: ServiceBlock): ServiceBlock => ({
  ...s,
  id: crypto.randomUUID(),
  periodStart: undefined,
  periodEnd: undefined,
  upsells: s.upsells.map((u) => ({ ...u, id: crypto.randomUUID() })),
});

/** index (1-based) of the contract term currently active, or 0 if none */
export function activeContractIndex(terms: ContractTerm[]) {
  const now = Date.now();
  const idx = terms.findIndex(
    (t) => t.start && t.end && t.start.getTime() <= now && t.end.getTime() >= now,
  );
  return idx + 1;
}

/* ---------------- Termination ---------------- */

export type Termination = {
  active: boolean;
  date?: Date | undefined;
  fee: string;
  reason: string;
};

export const terminateReasons = [
  "ผลงานไม่เป็นไปตามเป้าหมาย",
  "ปัญหาด้านการชำระเงิน",
  "เปลี่ยนผู้บริหาร / เจ้าของ",
  "เปลี่ยนไปใช้ผู้ให้บริการรายอื่น",
  "ปิดกิจการ / ปรับปรุงโรงแรม",
  "อื่นๆ",
] as const;

/* ---------------- System cost ---------------- */

export const systemOptions = [
  "Hotelier.guru",
  "Bookandlink",
  "Cloudbed",
  "SiteMinder",
  "Ezee",
  "Exely",
  "Onehotel",
  "Stahh",
  "Sabeeapp",
] as const;

export const monthLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type MonthlyPayStatus = "unpaid" | "paid" | "na";

export type SystemCost = {
  system: string;
  hplusPays: boolean;
  monthlyCost: string;
  payments: MonthlyPayStatus[];
};

export const emptySystemCost = (): SystemCost => ({
  system: "",
  hplusPays: false,
  monthlyCost: "",
  payments: Array.from({ length: 12 }, () => "na" as MonthlyPayStatus),
});
