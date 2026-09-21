/* PS App v2.0 — Block Groups + System Config (prototype, localStorage)
 * Contract templates no longer inline SKU-specific text: they drop block_group
 * zones that resolve to SKU-appropriate variants at generation time (R7–R12). */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CANONICAL_ORM_LITE_SKU, canonicalSkuCode, isPhantomOrmLiteSku, repairHotelAddressText } from "@/lib/template-integrity";

export type BlockLanguage = "th" | "en";
export type BlockVersionStatus = "draft" | "active" | "archived";

export type ConditionalBlock = {
  block_id: string;
  block_group: string;
  variant_seq: number;
  variant_label: string;
  applies_to_skus: string[];
  language: BlockLanguage;
  locked: boolean;
  content: string;
  updated_at: string;
};

export type BlockGroupVersion = {
  version_id: string;
  version_label: string;
  status: BlockVersionStatus;
  variants: ConditionalBlock[];
  activated_at: string | null;
  changelog: string | null;
};

export type BlockGroup = {
  block_group_id: string;
  block_group_label: string;
  render_section: string;
  render_once_per_contract: boolean;
  edit_permission: "any" | "system_admin";
  active_version_id: string;
  versions: BlockGroupVersion[];
  updated_at: string;
  updated_by: string;
};

export type CompanyBankAccount = {
  account_type: "company" | "personal";
  bank_name: string;
  account_name: string;
  account_number: string;
  configured: boolean;
  updated_at: string;
  updated_by: string;
};

/* Monthly SKUs — coverage target for every block group (R7). ORM Lite is one canonical SKU. */
export const MONTHLY_SKUS = [
  "ORM-MTH-FULL-SMART",
  "ORM-MTH-FULL-FIXED",
  "ORM-MTH-FULL-PERFORMANCE",
  CANONICAL_ORM_LITE_SKU,
  "MARCOM-MTH-META-FULL",
  "MARCOM-MTH-META-LITE",
  "MARCOM-MTH-TIKTOK-FULL",
  "MARCOM-MTH-TIKTOK-LITE",
  "MARCOM-MTH-GOOGLE-FULL",
] as const;

const ORM_SKUS = MONTHLY_SKUS.filter((s) => s.startsWith("ORM"));
const MARCOM_SKUS = MONTHLY_SKUS.filter((s) => s.startsWith("MARCOM"));
const META = MARCOM_SKUS.filter((s) => s.includes("META"));
const TIKTOK = MARCOM_SKUS.filter((s) => s.includes("TIKTOK"));
const GOOGLE = MARCOM_SKUS.filter((s) => s.includes("GOOGLE"));

const now = "2026-09-01T00:00:00+07:00";

const block = (
  b: Omit<ConditionalBlock, "updated_at" | "locked" | "language"> &
    Partial<Pick<ConditionalBlock, "locked" | "language">>,
): ConditionalBlock => ({ locked: false, language: "th", updated_at: now, ...b });

function group(
  id: string,
  label: string,
  section: string,
  once: boolean,
  variants: ConditionalBlock[],
  permission: "any" | "system_admin" = "any",
): BlockGroup {
  return {
    block_group_id: id,
    block_group_label: label,
    render_section: section,
    render_once_per_contract: once,
    edit_permission: permission,
    active_version_id: `${id}-v1`,
    versions: [
      {
        version_id: `${id}-v1`,
        version_label: "v2.3",
        status: "active",
        variants,
        activated_at: now,
        changelog: "v2.3 template integrity · ORM Lite canonical SKU + hotel address placeholder repair",
      },
    ],
    updated_at: now,
    updated_by: "napat.p@hotelplus.asia",
  };
}

const seedGroups = (): BlockGroup[] => [
  group("definitions", "คำนิยาม (§1)", "§1", true, [
    block({
      block_id: "DEF-V1-ORMFULL",
      block_group: "definitions",
      variant_seq: 1,
      variant_label: "ORM Full",
      applies_to_skus: ["ORM-MTH-FULL-SMART", "ORM-MTH-FULL-FIXED", "ORM-MTH-FULL-PERFORMANCE"],
      content:
        '“บริการ ORM Full” หมายถึง การบริหารรายได้และช่องทางการขายออนไลน์ของ {{hotel.name}} แบบเต็มรูปแบบ ตามขอบเขตงานในภาคผนวก ข\n“ค่าคอมมิชชั่น” หมายถึง ค่าตอบแทนที่คำนวณจากรายได้ที่เกิดขึ้นจริงในอัตรา {{sku.commission_rate}}',
    }),
    block({
      block_id: "DEF-V2-ORMLITE",
      block_group: "definitions",
      variant_seq: 2,
      variant_label: "ORM Lite",
      applies_to_skus: [CANONICAL_ORM_LITE_SKU],
      content:
        '“บริการ ORM Lite” หมายถึง การดูแลช่องทางการขายออนไลน์เฉพาะรายการที่ระบุไว้ในภาคผนวก ข ของ {{hotel.name}}',
    }),
    block({
      block_id: "DEF-V1-META",
      block_group: "definitions",
      variant_seq: 3,
      variant_label: "Marcom · Meta",
      applies_to_skus: [...META],
      content: '“บริการ Meta” หมายถึง การผลิตคอนเทนต์และบริหารโฆษณาบนแพลตฟอร์ม Meta ให้แก่ {{hotel.name}}',
    }),
    block({
      block_id: "DEF-V1-TIKTOK",
      block_group: "definitions",
      variant_seq: 4,
      variant_label: "Marcom · TikTok",
      applies_to_skus: [...TIKTOK],
      content: '“บริการ TikTok” หมายถึง การผลิตวิดีโอสั้นและบริหารโฆษณาบน TikTok ให้แก่ {{hotel.name}}',
    }),
    block({
      block_id: "DEF-V1-GOOGLE",
      block_group: "definitions",
      variant_seq: 5,
      variant_label: "Marcom · Google",
      applies_to_skus: [...GOOGLE],
      content: '“บริการ Google” หมายถึง การบริหารโฆษณา Google Ads และ Google Business Profile ของ {{hotel.name}}',
    }),
  ]),

  group(
    "scope_of_work",
    "ขอบเขตการให้บริการ (§4)",
    "§4",
    false,
    MONTHLY_SKUS.map((sku, i) =>
      sku === CANONICAL_ORM_LITE_SKU
        ? block({
            block_id: "SOW-V4-ORMLITE",
            block_group: "scope_of_work",
            variant_seq: i + 1,
            variant_label: "ORM Lite",
            applies_to_skus: [CANONICAL_ORM_LITE_SKU],
            content:
              "ผู้ให้บริการจะดูแลช่องทางการขายออนไลน์ของ {{hotel.name}} ตามรายการ ORM Lite ที่ระบุในใบเสนอราคา โดยเริ่มตั้งแต่วันที่ {{contract.start_date_display}} เป็นเวลา {{contract.duration_months}} เดือน\nครอบคลุมการตรวจสอบราคา การตั้งค่าพื้นฐาน และรายงานผลรายเดือนตามขอบเขตของแพ็กเกจ Lite",
          })
        : block({
            block_id: `SOW-V1-${sku}`,
            block_group: "scope_of_work",
            variant_seq: i + 1,
            variant_label: sku.replace(/^(ORM|MARCOM)-MTH-/, ""),
            applies_to_skus: [sku],
            content: `ผู้ให้บริการจะดำเนินงานตามรายการของ {{sku.product_name}} ({{sku.channel}}) ให้แก่ {{hotel.name}} โดยเริ่มตั้งแต่วันที่ {{contract.start_date_display}} เป็นเวลา {{contract.duration_months}} เดือน\n${
              sku.startsWith("ORM")
                ? "ครอบคลุมการตั้งค่าช่องทางการขาย การปรับราคา และรายงานผลรายเดือน"
                : "ครอบคลุมการผลิตคอนเทนต์ การบริหารงบโฆษณา และรายงานผลรายเดือน"
            }`,
          }),
    ),
  ),

  group(
    "owner_asset_termination_notice",
    "ข้อกำหนดการสิ้นสุด · ประกาศ (§5)",
    "§5",
    true,
    [
      block({
        block_id: "OAT-NOTICE-V1",
        block_group: "owner_asset_termination_notice",
        variant_seq: 1,
        variant_label: "ประกาศมาตรฐาน (Locked)",
        applies_to_skus: [...MONTHLY_SKUS],
        locked: true,
        content:
          "คู่สัญญาฝ่ายใดฝ่ายหนึ่งมีสิทธิบอกเลิกสัญญาโดยแจ้งเป็นหนังสือล่วงหน้าไม่น้อยกว่า 30 วัน และผู้ว่าจ้างจะได้รับคืนสิทธิในทรัพย์สินดิจิทัลตามรายการที่ระบุไว้ในสัญญานี้",
      }),
    ],
    "system_admin",
  ),

  group("owner_asset_termination_list", "รายการทรัพย์สินเมื่อสิ้นสุด (§5)", "§5", false, [
    block({
      block_id: "OAT-LIST-V1-ORM",
      block_group: "owner_asset_termination_list",
      variant_seq: 1,
      variant_label: "ORM (ทุก tier)",
      applies_to_skus: [...ORM_SKUS],
      content: "บัญชี Extranet ของทุก OTA · Channel Manager · รายงานราคาย้อนหลัง · บัญชี Google Business Profile",
    }),
    block({
      block_id: "OAT-LIST-V1-META",
      block_group: "owner_asset_termination_list",
      variant_seq: 2,
      variant_label: "Meta",
      applies_to_skus: [...META],
      content: "Facebook Page · Instagram Account · Meta Business Manager · ไฟล์คอนเทนต์ต้นฉบับ",
    }),
    block({
      block_id: "OAT-LIST-V1-TIKTOK",
      block_group: "owner_asset_termination_list",
      variant_seq: 3,
      variant_label: "TikTok",
      applies_to_skus: [...TIKTOK],
      content: "TikTok Business Account · ไฟล์วิดีโอต้นฉบับ · TikTok Ads Manager",
    }),
    block({
      block_id: "OAT-LIST-V1-GOOGLE",
      block_group: "owner_asset_termination_list",
      variant_seq: 4,
      variant_label: "Google",
      applies_to_skus: [...GOOGLE],
      content: "Google Ads Account · Google Business Profile · Google Analytics property",
    }),
  ]),

  group("letter_of_authorization", "Letter of Authorization (ภาคผนวก ก)", "appendix_a", true, [
    block({
      block_id: "LOA-V1-ORM",
      block_group: "letter_of_authorization",
      variant_seq: 1,
      variant_label: "ORM channels",
      applies_to_skus: [...ORM_SKUS],
      language: "en",
      content:
        "We, {{customer.legal_name}}, hereby authorize Hotel Plus Co., Ltd. to act on our behalf in managing online distribution channels of {{hotel.name_en}}. Signed by {{customer.signer_name_en}}.",
    }),
    block({
      block_id: "LOA-V1-MARCOM",
      block_group: "letter_of_authorization",
      variant_seq: 2,
      variant_label: "Marcom channels",
      applies_to_skus: [...MARCOM_SKUS],
      language: "en",
      content:
        "We, {{customer.legal_name}}, hereby authorize Hotel Plus Co., Ltd. to manage social media and advertising accounts of {{hotel.name_en}}. Signed by {{customer.signer_name_en}}.",
    }),
  ]),

  group("work_proposal", "Work Proposal + เงื่อนไขชำระเงิน (ภาคผนวก ข)", "appendix_b", false, [
    ...MONTHLY_SKUS.map((sku, i) =>
      sku === CANONICAL_ORM_LITE_SKU
        ? block({
            block_id: "WP-V2-ORMLITE",
            block_group: "work_proposal",
            variant_seq: i + 1,
            variant_label: "ORM Lite",
            applies_to_skus: [CANONICAL_ORM_LITE_SKU],
            language: "en",
            content:
              "Work proposal for ORM Lite — channel setup review, rate visibility checks, monthly summary and scoped online distribution support for {{hotel.name_en}}.",
          })
        : block({
            block_id: `WP-V1-${sku}`,
            block_group: "work_proposal",
            variant_seq: i + 1,
            variant_label: sku.replace(/^(ORM|MARCOM)-MTH-/, ""),
            applies_to_skus: [sku],
            language: "en",
            content: `Work proposal for {{sku.product_name}} — deliverables, KPIs and monthly reporting cadence for {{hotel.name_en}}.`,
          }),
    ),
    block({
      block_id: "WP-V1-PAYMENT-BOILERPLATE",
      block_group: "work_proposal",
      variant_seq: MONTHLY_SKUS.length + 1,
      variant_label: "เงื่อนไขชำระเงิน (Locked)",
      applies_to_skus: [...MONTHLY_SKUS],
      locked: true,
      content:
        "ชำระค่าบริการภายในวันที่ 15 ของทุกเดือน เข้าบัญชี {{payment.bank_name}} เลขที่ {{payment.bank_account_no}} ชื่อบัญชี {{payment.bank_account_name}} · ผิดนัดชำระคิดค่าปรับ {{contract.late_penalty}}",
    }),
  ]),
];

function legitimateOrmLiteVariant(groupId: string, seq: number): ConditionalBlock | null {
  switch (groupId) {
    case "definitions":
      return block({
        block_id: "DEF-V2-ORMLITE",
        block_group: groupId,
        variant_seq: seq,
        variant_label: "ORM Lite",
        applies_to_skus: [CANONICAL_ORM_LITE_SKU],
        content:
          '“บริการ ORM Lite” หมายถึง การดูแลช่องทางการขายออนไลน์เฉพาะรายการที่ระบุไว้ในภาคผนวก ข ของ {{hotel.name}}',
      });
    case "scope_of_work":
      return block({
        block_id: "SOW-V4-ORMLITE",
        block_group: groupId,
        variant_seq: seq,
        variant_label: "ORM Lite",
        applies_to_skus: [CANONICAL_ORM_LITE_SKU],
        content:
          "ผู้ให้บริการจะดูแลช่องทางการขายออนไลน์ของ {{hotel.name}} ตามรายการ ORM Lite ที่ระบุในใบเสนอราคา โดยเริ่มตั้งแต่วันที่ {{contract.start_date_display}} เป็นเวลา {{contract.duration_months}} เดือน\nครอบคลุมการตรวจสอบราคา การตั้งค่าพื้นฐาน และรายงานผลรายเดือนตามขอบเขตของแพ็กเกจ Lite",
      });
    case "work_proposal":
      return block({
        block_id: "WP-V2-ORMLITE",
        block_group: groupId,
        variant_seq: seq,
        variant_label: "ORM Lite",
        applies_to_skus: [CANONICAL_ORM_LITE_SKU],
        language: "en",
        content:
          "Work proposal for ORM Lite — channel setup review, rate visibility checks, monthly summary and scoped online distribution support for {{hotel.name_en}}.",
      });
    default:
      return null;
  }
}

function normalizeBlockGroupsV23(groups: BlockGroup[]): BlockGroup[] {
  return groups.map((g) => ({
    ...g,
    updated_at: now,
    versions: g.versions.map((version) => {
      const retained = version.variants
        .filter((variant) => !variant.applies_to_skus.every(isPhantomOrmLiteSku))
        .map((variant) => {
          const repaired = repairHotelAddressText(variant.content);
          return {
            ...variant,
            applies_to_skus: [...new Set(variant.applies_to_skus.map(canonicalSkuCode))],
            content: repaired.content,
          };
        });
      const coversLite = retained.some((variant) => variant.applies_to_skus.includes(CANONICAL_ORM_LITE_SKU));
      const inserted = coversLite ? null : legitimateOrmLiteVariant(g.block_group_id, retained.length + 1);
      return {
        ...version,
        version_label: "v2.3",
        changelog: "v2.3 template integrity · phantom ORM Lite variants removed · hotel address placeholders normalized",
        variants: inserted ? [...retained, inserted] : retained,
      };
    }),
  }));
}

const seedBanks = (): CompanyBankAccount[] => [
  {
    account_type: "company",
    bank_name: "ธนาคารกสิกรไทย",
    account_name: "บริษัท โฮเทล พลัส จำกัด",
    account_number: "123-4-56789-0",
    configured: true,
    updated_at: now,
    updated_by: "system_admin",
  },
  {
    account_type: "personal",
    bank_name: "",
    account_name: "",
    account_number: "",
    configured: false,
    updated_at: now,
    updated_by: "system_admin",
  },
];

/* ---------------- coverage (R7) ---------------- */

export const activeBlockVersion = (g: BlockGroup) =>
  g.versions.find((v) => v.version_id === g.active_version_id) ?? g.versions[0]!;

export const coverageOf = (g: BlockGroup) => {
  const covered = new Set(activeBlockVersion(g).variants.flatMap((v) => v.applies_to_skus));
  const missing = MONTHLY_SKUS.filter((s) => !covered.has(s));
  return { covered: MONTHLY_SKUS.length - missing.length, total: MONTHLY_SKUS.length, missing };
};

/* R9 · variant resolution at Wizard Step 4 */
export const resolveVariants = (g: BlockGroup, skus: string[]) => {
  const matched = skus
    .map((sku) => activeBlockVersion(g).variants.find((v) => v.applies_to_skus.includes(sku)))
    .filter((v): v is ConditionalBlock => !!v);
  const unique = [...new Map(matched.map((v) => [v.block_id, v])).values()];
  return g.render_once_per_contract ? unique.slice(0, 1) : unique;
};

/* ---------------- store ---------------- */

const KEY = "meridia.ps.block_groups.v2";
const ADMIN_KEY = "meridia.ps.templates.legal_admin";

type Ctx = {
  hydrated: boolean;
  blockGroups: BlockGroup[];
  banks: CompanyBankAccount[];
  isSystemAdmin: boolean;
  setSystemAdmin: (v: boolean) => void;
  saveVariant: (groupId: string, blockId: string, content: string) => boolean;
  saveBank: (account: Omit<CompanyBankAccount, "updated_at" | "updated_by" | "configured">) => void;
  bankFor: (customerType: "individual" | "juristic") => CompanyBankAccount | undefined;
  resetBlockGroups: () => void;
};

const BgCtx = createContext<Ctx | null>(null);

export function PsBlockGroupProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [banks, setBanks] = useState<CompanyBankAccount[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as { blockGroups: BlockGroup[]; banks: CompanyBankAccount[] }) : null;
      setBlockGroups(normalizeBlockGroupsV23(parsed?.blockGroups?.length ? parsed.blockGroups : seedGroups()));
      setBanks(parsed?.banks?.length ? parsed.banks : seedBanks());
      setIsSystemAdmin(localStorage.getItem(ADMIN_KEY) === "1");
    } catch {
      setBlockGroups(normalizeBlockGroupsV23(seedGroups()));
      setBanks(seedBanks());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ blockGroups, banks }));
  }, [hydrated, blockGroups, banks]);

  const setSystemAdmin = useCallback((v: boolean) => {
    setIsSystemAdmin(v);
    localStorage.setItem(ADMIN_KEY, v ? "1" : "0");
  }, []);

  /* R8 · locked variants are System-Admin-only */
  const saveVariant = useCallback(
    (groupId: string, blockId: string, content: string) => {
      let ok = true;
      setBlockGroups((prev) =>
        prev.map((g) => {
          if (g.block_group_id !== groupId) return g;
          return {
            ...g,
            updated_at: new Date().toISOString(),
            versions: g.versions.map((v) =>
              v.version_id !== g.active_version_id
                ? v
                : {
                    ...v,
                    variants: v.variants.map((b) => {
                      if (b.block_id !== blockId) return b;
                      if (b.locked && !isSystemAdmin) {
                        ok = false;
                        return b;
                      }
                      return { ...b, content, updated_at: new Date().toISOString() };
                    }),
                  },
            ),
          };
        }),
      );
      return ok;
    },
    [isSystemAdmin],
  );

  const saveBank: Ctx["saveBank"] = useCallback((account) => {
    setBanks((prev) =>
      prev.map((b) =>
        b.account_type === account.account_type
          ? { ...b, ...account, configured: true, updated_at: new Date().toISOString(), updated_by: "system_admin" }
          : b,
      ),
    );
  }, []);

  /* R22 · bank fields auto-derive from customer_type · no toggle */
  const bankFor = useCallback(
    (customerType: "individual" | "juristic") =>
      banks.find((b) => b.account_type === (customerType === "juristic" ? "company" : "personal")),
    [banks],
  );

  const resetBlockGroups = useCallback(() => {
    setBlockGroups(normalizeBlockGroupsV23(seedGroups()));
    setBanks(seedBanks());
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      blockGroups,
      banks,
      isSystemAdmin,
      setSystemAdmin,
      saveVariant,
      saveBank,
      bankFor,
      resetBlockGroups,
    }),
    [hydrated, blockGroups, banks, isSystemAdmin, setSystemAdmin, saveVariant, saveBank, bankFor, resetBlockGroups],
  );

  return <BgCtx.Provider value={value}>{children}</BgCtx.Provider>;
}

export function usePsBlockGroups() {
  const ctx = useContext(BgCtx);
  if (!ctx) throw new Error("usePsBlockGroups must be used inside PsBlockGroupProvider");
  return ctx;
}
