/* PS App v1.0 — Template Management (prototype store, localStorage) */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TemplateType = "quote" | "contract";
export type VersionStatus = "draft" | "active" | "archived";

export type TemplateVersion = {
  version_id: string;
  version_label: string;
  status: VersionStatus;
  body: string;
  auto_fields_used: string[];
  activated_at: string | null;
  activated_by: string | null;
  archived_at: string | null;
  changelog: string | null;
  created_at: string;
  created_by: string;
};

export type Template = {
  template_id: string;
  template_type: TemplateType;
  name: string;
  description: string | null;
  mapped_skus: string[];
  quote_type: "ORM" | "MARCOM" | null;
  versions: TemplateVersion[];
  active_version_id: string;
  docs_generated: number;
  created_at: string;
  created_by: string;
};

export type AutoField = {
  field_path: string;
  source: string;
  type: "string" | "number" | "date" | "datetime" | "array_iterator";
  available_in: TemplateType[];
  supported_filters: string[];
  example: string;
  group: string;
};

export const PS_USER = "napat.p@hotelplus.asia";

export const fieldGroupLabel: Record<string, string> = {
  company: "🏢 Company (PS config)",
  quote: "📄 Quote (จาก BD)",
  package: "📦 Package loop (Quote เท่านั้น)",
  hotel: "🏨 Hotel (Contract · AC master)",
  customer: "👤 Customer (Contract · AC master)",
  contract: "📜 Contract (Wizard + approved_snapshot)",
  sku: "📦 SKU loop (approved_skus)",
  system: "⚙ System (ตอน render PDF)",
};

export const AUTO_FIELDS: AutoField[] = [
  { field_path: "company.legal_name", source: "PS.config.company_legal_name", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "บริษัท พักดีพลัส จำกัด", group: "company" },
  { field_path: "company.tax_id", source: "PS.config.company_tax_id", type: "string", available_in: ["contract"], supported_filters: [], example: "0105558123456", group: "company" },
  { field_path: "company.address", source: "PS.config.company_address", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "92/5 อาคารสาธรธานี กรุงเทพฯ", group: "company" },
  { field_path: "company.phone", source: "PS.config.company_phone", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "(+66)82 898 9369", group: "company" },
  { field_path: "company.email", source: "PS.config.company_email", type: "string", available_in: ["quote", "contract"], supported_filters: [], example: "info@hotelplus.asia", group: "company" },

  { field_path: "quote.quote_id", source: "BD.quotes.quote_id", type: "string", available_in: ["quote"], supported_filters: [], example: "Q-ORM-0287", group: "quote" },
  { field_path: "quote.hotel_name", source: "BD.quotes.hotel_name (free text)", type: "string", available_in: ["quote"], supported_filters: [], example: "Sumator Resort", group: "quote" },
  { field_path: "quote.created_at", source: "BD.quotes.created_at", type: "datetime", available_in: ["quote"], supported_filters: ["date_th", "date_en", "datetime"], example: "15 สิงหาคม 2569", group: "quote" },
  { field_path: "quote.created_by.email", source: "Auth.users.email (join created_by)", type: "string", available_in: ["quote"], supported_filters: [], example: "somchai.n@hotelplus.asia", group: "quote" },

  { field_path: "package.name", source: "calculator_output.packages[i].name", type: "string", available_in: ["quote"], supported_filters: [], example: "Smart Package", group: "package" },
  { field_path: "package.base_price", source: "calculator_output.packages[i].base_price", type: "number", available_in: ["quote"], supported_filters: ["thb", "number", "currency:en"], example: "฿5,600", group: "package" },
  { field_path: "package.commission_rate", source: "calculator_output.packages[i].commission_rate", type: "number", available_in: ["quote"], supported_filters: ["pct"], example: "10.00%", group: "package" },
  { field_path: "package.first_month_total", source: "computed · base + setup", type: "number", available_in: ["quote"], supported_filters: ["thb", "number"], example: "฿12,600", group: "package" },
  { field_path: "package.includes[*].name", source: "calculator_output.packages[i].includes", type: "array_iterator", available_in: ["quote"], supported_filters: [], example: "Revplus+, Register OTAs", group: "package" },

  { field_path: "hotel.name", source: "AC.hotels.name", type: "string", available_in: ["contract"], supported_filters: [], example: "Sumator Resort", group: "hotel" },
  { field_path: "hotel.address", source: "AC.hotels.address", type: "string", available_in: ["contract"], supported_filters: [], example: "123 ถนนสุขุมวิท กรุงเทพฯ", group: "hotel" },
  { field_path: "hotel.room_key", source: "AC.hotels.room_key", type: "number", available_in: ["contract"], supported_filters: ["number"], example: "9", group: "hotel" },

  { field_path: "customer.legal_name", source: "AC.customers.legal_name (OCR ภพ.20 / บัตรประชาชน)", type: "string", available_in: ["contract"], supported_filters: [], example: "Sumator Hotel Group Co., Ltd.", group: "customer" },
  { field_path: "customer.tax_id", source: "AC.customers.tax_id", type: "string", available_in: ["contract"], supported_filters: [], example: "0105558123456", group: "customer" },
  { field_path: "customer.signer_name", source: "AC.customers.signer_name (KYC OCR)", type: "string", available_in: ["contract"], supported_filters: [], example: "คุณ ประเสริฐ อยู่ดี", group: "customer" },
  { field_path: "customer.signer_title", source: "manual entry ใน Wizard", type: "string", available_in: ["contract"], supported_filters: [], example: "ผู้จัดการทั่วไป", group: "customer" },

  { field_path: "contract.from_quote_id", source: "contract.from_quote_id", type: "string", available_in: ["contract"], supported_filters: [], example: "Q-ORM-0287", group: "contract" },
  { field_path: "contract.monthly_fee", source: "approved_snapshot.approved_monthly_total", type: "number", available_in: ["contract"], supported_filters: ["thb", "number"], example: "฿5,600", group: "contract" },
  { field_path: "contract.commission_rate", source: "approved_snapshot.approved_commission_rate", type: "number", available_in: ["contract"], supported_filters: ["pct"], example: "10.00%", group: "contract" },
  { field_path: "contract.setup_fee", source: "approved_snapshot.approved_onetime_total", type: "number", available_in: ["contract"], supported_filters: ["thb"], example: "฿3,500", group: "contract" },
  { field_path: "contract.start_date", source: "Wizard step 4", type: "date", available_in: ["contract"], supported_filters: ["date_th", "date_en"], example: "1 กันยายน 2569", group: "contract" },
  { field_path: "contract.duration_months", source: "Wizard step 4 · default 12", type: "number", available_in: ["contract"], supported_filters: [], example: "12", group: "contract" },

  { field_path: "sku.product_name", source: "approved_snapshot.approved_skus[i].product_name", type: "string", available_in: ["contract"], supported_filters: [], example: "Smart Package", group: "sku" },
  { field_path: "sku.billing_summary", source: "approved_snapshot.approved_skus[i].billing_summary", type: "string", available_in: ["contract"], supported_filters: [], example: "฿5,600/mo + 10%", group: "sku" },

  { field_path: "page.current", source: "PDF renderer", type: "number", available_in: ["quote", "contract"], supported_filters: [], example: "1", group: "system" },
  { field_path: "page.total", source: "PDF renderer", type: "number", available_in: ["quote", "contract"], supported_filters: [], example: "4", group: "system" },
];

const FIELD_PATHS = new Set(AUTO_FIELDS.map((f) => f.field_path));

/* ---------------- placeholder helpers (R4 / R5) ---------------- */

export const parsePlaceholders = (body: string): string[] => {
  const out = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([^}|]+?)\s*(\|[^}]*)?\}\}/g)) {
    const raw = (m[1] ?? "").trim();
    if (raw.startsWith("loop.")) continue;
    out.add(raw);
  }
  return [...out];
};

export const unknownPlaceholders = (body: string): string[] =>
  parsePlaceholders(body).filter((p) => !FIELD_PATHS.has(p));

const SAMPLE: Record<string, string> = Object.fromEntries(AUTO_FIELDS.map((f) => [f.field_path, f.example]));

/** Render a template body with the demo sample data (used by the preview). */
export const renderWithSample = (body: string) =>
  body.replace(/\{\{\s*([^}|]+?)\s*(\|\s*[a-z_:]+\s*)?\}\}/g, (_all, path: string) => {
    const key = path.trim();
    if (key.startsWith("loop.")) return key === "loop.index" ? "1" : "4";
    return SAMPLE[key] ?? `⟨${key}⟩`;
  });

/* ---------------- seed ---------------- */

const v = (
  templateId: string,
  label: string,
  status: VersionStatus,
  body: string,
  changelog: string,
  activatedAt: string | null = null,
): TemplateVersion => ({
  version_id: `${templateId}@${label}`,
  version_label: label,
  status,
  body,
  auto_fields_used: parsePlaceholders(body),
  activated_at: activatedAt,
  activated_by: activatedAt ? PS_USER : null,
  archived_at: status === "archived" ? "2026-07-15T00:00:00+07:00" : null,
  changelog,
  created_at: activatedAt ?? "2026-07-01T00:00:00+07:00",
  created_by: PS_USER,
});

const QUOTE_ORM_BODY = `<h2>ใบเสนอราคา · {{quote.quote_id}}</h2>
<p>{{company.legal_name}} · {{company.address}}<br/>โทร {{company.phone}} · {{company.email}}</p>
<p><strong>เสนอราคาให้:</strong> {{quote.hotel_name}}<br/>วันที่ {{quote.created_at | date_th}}</p>
<foreach items="quote.calculator_output.packages" as="package">
  <h3>{{loop.index}}. {{package.name}}</h3>
  <p>ค่าบริการ {{package.base_price | thb}} ต่อเดือน · คอมมิชชั่น {{package.commission_rate | pct}}</p>
  <p>รวมเดือนแรก {{package.first_month_total | thb}} · ประกอบด้วย {{package.includes[*].name}}</p>
</foreach>
<p>หน้า {{page.current}} / {{page.total}}</p>`;

const QUOTE_ORM_DRAFT = `${QUOTE_ORM_BODY}\n<p>ผู้เสนอราคา: {{quote.created_by.email}}</p>`;

const QUOTE_MARCOM_BODY = `<h2>ใบเสนอราคา Marcom · {{quote.quote_id}}</h2>
<p>{{company.legal_name}} · {{company.email}}</p>
<p><strong>โรงแรม:</strong> {{quote.hotel_name}} · วันที่ {{quote.created_at | date_th}}</p>
<foreach items="quote.calculator_output.packages" as="package">
  <p>{{loop.index}}. {{package.name}} — {{package.base_price | thb}}</p>
</foreach>
<p>หน้า {{page.current}} / {{page.total}}</p>`;

export const CONTRACT_SECTIONS = [
  "ผู้ทำสัญญา (Parties)",
  "ขอบเขตการให้บริการ (Service Scope)",
  "เงื่อนไขการชำระเงิน (Payment Terms)",
  "ระยะเวลาสัญญา (Duration)",
  "เงื่อนไขทั่วไป (Boilerplate)",
  "การระงับข้อพิพาท (Dispute resolution)",
  "ลายเซ็นผู้ทำสัญญา (Signatures)",
] as const;

const contractBody = (title: string) => `<section data-section="ผู้ทำสัญญา (Parties)">
<h3>ข้อ 1 · ผู้ทำสัญญา</h3>
<p>สัญญาฉบับนี้ทำขึ้นระหว่าง {{company.legal_name}} เลขประจำตัวผู้เสียภาษี {{company.tax_id}} ที่อยู่ {{company.address}} ("ผู้ให้บริการ")
กับ {{customer.legal_name}} เลขประจำตัวผู้เสียภาษี {{customer.tax_id}} โดย {{customer.signer_name}} ตำแหน่ง {{customer.signer_title}} ("ผู้รับบริการ")
สำหรับโรงแรม {{hotel.name}} จำนวน {{hotel.room_key}} ห้อง ที่อยู่ {{hotel.address}}</p>
</section>
<section data-section="ขอบเขตการให้บริการ (Service Scope)">
<h3>ข้อ 2 · ขอบเขตการให้บริการ (${title})</h3>
<foreach items="contract.approved_skus" as="sku">
  <p>{{loop.index}}. {{sku.product_name}} — {{sku.billing_summary}}</p>
</foreach>
<p>อ้างอิงใบเสนอราคา {{contract.from_quote_id}}</p>
</section>
<section data-section="เงื่อนไขการชำระเงิน (Payment Terms)">
<h3>ข้อ 3 · เงื่อนไขการชำระเงิน</h3>
<p>ค่าบริการรายเดือน {{contract.monthly_fee | thb}} · ค่าคอมมิชชั่น {{contract.commission_rate | pct}} · ค่าติดตั้งแรกเข้า {{contract.setup_fee | thb}}
ชำระภายในวันที่ 5 ของทุกเดือน หัก ณ ที่จ่ายตามที่กฎหมายกำหนด</p>
</section>
<section data-section="ระยะเวลาสัญญา (Duration)">
<h3>ข้อ 4 · ระยะเวลาสัญญา</h3>
<p>เริ่มให้บริการวันที่ {{contract.start_date | date_th}} เป็นระยะเวลา {{contract.duration_months}} เดือน</p>
</section>
<section data-section="เงื่อนไขทั่วไป (Boilerplate)">
<h3>ข้อ 5 · เงื่อนไขทั่วไป</h3>
<p>คู่สัญญาตกลงรักษาความลับของข้อมูลที่ได้รับจากอีกฝ่าย และจะไม่นำไปเปิดเผยแก่บุคคลภายนอกโดยไม่ได้รับความยินยอม</p>
</section>
<section data-section="การระงับข้อพิพาท (Dispute resolution)">
<h3>ข้อ 6 · การระงับข้อพิพาท</h3>
<p>หากเกิดข้อพิพาท คู่สัญญาจะเจรจาโดยสุจริตก่อน หากไม่สามารถตกลงได้ให้ใช้กฎหมายไทยและศาลไทยเป็นที่ยุติ</p>
</section>
<section data-section="ลายเซ็นผู้ทำสัญญา (Signatures)">
<h3>ข้อ 7 · ลายเซ็น</h3>
<p>ลงชื่อผู้ให้บริการ ____________________ · ลงชื่อ {{customer.signer_name}} ____________________</p>
<p>หน้า {{page.current}} / {{page.total}}</p>
</section>`;

function seedTemplates(): Template[] {
  const t = (
    template_id: string,
    template_type: TemplateType,
    name: string,
    opts: Partial<Template> & { versions: TemplateVersion[]; active_version_id: string },
  ): Template => ({
    template_id,
    template_type,
    name,
    description: null,
    mapped_skus: [],
    quote_type: null,
    docs_generated: 0,
    created_at: "2026-05-01T00:00:00+07:00",
    created_by: PS_USER,
    ...opts,
  });

  return [
    t("TPL-Q-ORM", "quote", "ORM Quote (4-package comparison)", {
      description: "Renders 4 pricing package comparison for ORM customer",
      quote_type: "ORM",
      docs_generated: 148,
      active_version_id: "TPL-Q-ORM@v3.1",
      versions: [
        v("TPL-Q-ORM", "v3.2", "draft", QUOTE_ORM_DRAFT, "Added: {{quote.created_by.email}}, {{page.total}}"),
        v("TPL-Q-ORM", "v3.1", "active", QUOTE_ORM_BODY, "Fixed: commission_rate formatting", "2026-07-15T00:00:00+07:00"),
        v("TPL-Q-ORM", "v3.0", "archived", QUOTE_ORM_BODY, "Major: 4-package comparison layout"),
      ],
    }),
    t("TPL-Q-MARCOM", "quote", "Marcom Quote (line items summary)", {
      quote_type: "MARCOM",
      docs_generated: 96,
      active_version_id: "TPL-Q-MARCOM@v2.4",
      versions: [
        v("TPL-Q-MARCOM", "v2.4", "active", QUOTE_MARCOM_BODY, "Line item summary layout", "2026-06-20T00:00:00+07:00"),
      ],
    }),
    t("TPL-C-ORM-FULL", "contract", "ORM Full Service Contract", {
      mapped_skus: ["ORM-MTH-FULL-SMART", "ORM-MTH-FULL-FIXED", "ORM-MTH-FULL-PERFORMANCE"],
      docs_generated: 42,
      active_version_id: "TPL-C-ORM-FULL@v2.0",
      versions: [
        v("TPL-C-ORM-FULL", "v2.0", "active", contractBody("ORM Full Service"), "Legal review 2026", "2026-04-01T00:00:00+07:00"),
        v("TPL-C-ORM-FULL", "v1.9", "archived", contractBody("ORM Full Service"), "เพิ่มข้อกำหนดคอมมิชชั่น"),
      ],
    }),
    t("TPL-C-ORM-LITE", "contract", "ORM Lite Service Contract", {
      mapped_skus: ["ORM-MTH-LITE-STD"],
      docs_generated: 17,
      active_version_id: "TPL-C-ORM-LITE@v1.5",
      versions: [
        v("TPL-C-ORM-LITE", "v1.5", "active", contractBody("ORM Lite Service"), "ปรับเงื่อนไขชำระเงิน", "2026-05-10T00:00:00+07:00"),
      ],
    }),
    t("TPL-C-MARCOM-META", "contract", "Marcom Meta Service Contract", {
      mapped_skus: ["MARCOM-MTH-META", "MARCOM-MTH-META-LITE-CONTENT", "MARCOM-MTH-META-LITE-ADS"],
      docs_generated: 23,
      active_version_id: "TPL-C-MARCOM-META@v1.2",
      versions: [
        v("TPL-C-MARCOM-META", "v1.2", "active", contractBody("Marcom Meta"), "เพิ่มขอบเขต Ads management", "2026-06-01T00:00:00+07:00"),
      ],
    }),
  ];
}

/* ---------------- store ---------------- */

const KEY = "meridia.ps.templates.v1";

type Ctx = {
  hydrated: boolean;
  templates: Template[];
  activeVersion: (t: Template) => TemplateVersion | undefined;
  draftVersion: (t: Template) => TemplateVersion | undefined;
  saveDraft: (templateId: string, body: string, changelog?: string) => void;
  activateDraft: (templateId: string) => { ok: boolean; unknown: string[] };
  resetTemplates: () => void;
};

const PsTplCtx = createContext<Ctx | null>(null);

const nextLabel = (labels: string[]) => {
  const nums = labels.map((l) => {
    const [maj, min] = l.replace(/^v/, "").split(".");
    return Number(maj ?? 0) * 100 + Number(min ?? 0);
  });
  const top = Math.max(0, ...nums) + 1;
  return `v${Math.floor(top / 100)}.${top % 100}`;
};

export function PsTemplateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setTemplates(raw ? (JSON.parse(raw) as Template[]) : seedTemplates());
    } catch {
      setTemplates(seedTemplates());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(templates));
  }, [hydrated, templates]);

  const activeVersion = useCallback(
    (t: Template) => t.versions.find((x) => x.version_id === t.active_version_id) ?? t.versions.find((x) => x.status === "active"),
    [],
  );
  const draftVersion = useCallback((t: Template) => t.versions.find((x) => x.status === "draft"), []);

  const saveDraft = useCallback((templateId: string, body: string, changelog?: string) => {
    const now = new Date().toISOString();
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.template_id !== templateId) return t;
        const existing = t.versions.find((x) => x.status === "draft");
        if (existing)
          return {
            ...t,
            versions: t.versions.map((x) =>
              x.status === "draft"
                ? { ...x, body, auto_fields_used: parsePlaceholders(body), changelog: changelog ?? x.changelog }
                : x,
            ),
          };
        const label = nextLabel(t.versions.map((x) => x.version_label));
        const draft: TemplateVersion = {
          version_id: `${t.template_id}@${label}`,
          version_label: label,
          status: "draft",
          body,
          auto_fields_used: parsePlaceholders(body),
          activated_at: null,
          activated_by: null,
          archived_at: null,
          changelog: changelog ?? "แก้ไขจาก editor",
          created_at: now,
          created_by: PS_USER,
        };
        return { ...t, versions: [draft, ...t.versions] };
      }),
    );
  }, []);

  const activateDraft = useCallback(
    (templateId: string) => {
      const t = templates.find((x) => x.template_id === templateId);
      const draft = t?.versions.find((x) => x.status === "draft");
      if (!t || !draft) return { ok: false, unknown: [] };
      const unknown = unknownPlaceholders(draft.body);
      if (unknown.length) return { ok: false, unknown };
      const now = new Date().toISOString();
      setTemplates((prev) =>
        prev.map((x) =>
          x.template_id !== templateId
            ? x
            : {
                ...x,
                active_version_id: draft.version_id,
                versions: x.versions.map((ver) =>
                  ver.version_id === draft.version_id
                    ? { ...ver, status: "active" as VersionStatus, activated_at: now, activated_by: PS_USER }
                    : ver.status === "active"
                      ? { ...ver, status: "archived" as VersionStatus, archived_at: now }
                      : ver,
                ),
              },
        ),
      );
      return { ok: true, unknown: [] };
    },
    [templates],
  );

  const resetTemplates = useCallback(() => setTemplates(seedTemplates()), []);

  const value = useMemo(
    () => ({ hydrated, templates, activeVersion, draftVersion, saveDraft, activateDraft, resetTemplates }),
    [hydrated, templates, activeVersion, draftVersion, saveDraft, activateDraft, resetTemplates],
  );

  return <PsTplCtx.Provider value={value}>{children}</PsTplCtx.Provider>;
}

export function usePsTemplates() {
  const ctx = useContext(PsTplCtx);
  if (!ctx) throw new Error("usePsTemplates must be used inside PsTemplateProvider");
  return ctx;
}
