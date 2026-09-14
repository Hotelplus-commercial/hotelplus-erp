import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Hash, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BLOCK_GROUPS,
  COMPUTED_FIELDS,
  CONDITIONAL_BLOCKS,
  DEMO_PACKAGE_CODES,
  GUARDRAIL_RULES,
  evaluateComputed,
  lockMeta,
  subTypeMeta,
  tierOfSku,
  usePsTemplates,
  validateGuardrail,
} from "@/lib/ps-templates";

const description = "Layer 2 registry — lock mode, guardrail rules, computed field formulas, conditional blocks และการออกรหัสสัญญา";

export const Route = createFileRoute("/ps/templates/layer2")({
  head: () => ({
    meta: [
      { title: "Layer 2 registry — Contract templates | PS App" },
      { name: "description", content: description },
      { property: "og:title", content: "Layer 2 registry — Contract templates | PS App" },
      { property: "og:description", content: description },
    ],
  }),
  component: Layer2Page,
});

function GuardrailPlayground() {
  const [skuId, setSkuId] = useState("ORM-MTH-FULL");
  const [duration, setDuration] = useState(6);
  const [renewal, setRenewal] = useState(12);
  const [dueDate, setDueDate] = useState(15);

  const tier = tierOfSku(skuId);
  const ctx = { sku_id: skuId, sku_tier: tier } as const;
  const checks = [
    { label: "contract.duration_months", res: validateGuardrail("contract.duration_months", duration, ctx) },
    { label: "contract.renewal_months", res: validateGuardrail("contract.renewal_months", renewal, ctx) },
    { label: "payment.due_date_of_month", res: validateGuardrail("payment.due_date_of_month", dueDate, ctx) },
  ];
  const blocked = checks.some((c) => !c.res.ok);

  return (
    <Panel title="R10 · ทดลอง guardrail" subtitle="แก้ค่าเพื่อดูว่าระบบบล็อกการบันทึกเมื่อไร">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs">
          SKU ID
          <Input value={skuId} onChange={(e) => setSkuId(e.target.value)} className="mt-1 h-9 font-mono text-xs" />
        </label>
        <label className="text-xs">
          duration_months
          <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          renewal_months
          <Input type="number" value={renewal} onChange={(e) => setRenewal(Number(e.target.value))} className="mt-1 h-9" />
        </label>
        <label className="text-xs">
          payment due date
          <Input type="number" value={dueDate} onChange={(e) => setDueDate(Number(e.target.value))} className="mt-1 h-9" />
        </label>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        SKU tier ที่คำนวณได้: <Chip tone={tier === "Full" ? "info" : "muted"}>{tier}</Chip>
      </p>

      <ul className="mt-2 space-y-1 text-xs">
        {checks.map((c) => (
          <li key={c.label} className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-[11px]">{c.label}</code>
            <Chip tone={c.res.ok ? "success" : "danger"}>{c.res.ok ? "ผ่าน" : "บล็อก"}</Chip>
            {c.res.errors.map((e) => (
              <span key={e} className="text-destructive">{e}</span>
            ))}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        className="mt-3"
        onClick={() =>
          blocked
            ? toast.error("บันทึกไม่ได้ · มี guardrail ที่ยังไม่ผ่าน")
            : toast.success("บันทึกได้ · ค่าทั้งหมดผ่าน guardrail")
        }
      >
        ทดลองบันทึกร่างสัญญา
      </Button>
    </Panel>
  );
}

function PackageCodeBox() {
  const { counter, generatePackageCode } = usePsTemplates();
  const [skuId, setSkuId] = useState("ORM-MTH-FULL");
  const [duration, setDuration] = useState(6);
  const [codes, setCodes] = useState<string[]>([]);

  return (
    <Panel title="รหัสสัญญา (package code)" subtitle="เลขลำดับรายวัน · รีเซ็ตเวลา 00:00 เวลากรุงเทพฯ · เติมศูนย์ 5 หลัก">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">
          SKU ID
          <Input value={skuId} onChange={(e) => setSkuId(e.target.value)} className="mt-1 h-9 font-mono text-xs" />
        </label>
        <label className="text-xs">
          ระยะเวลา (เดือน)
          <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 h-9" />
        </label>
        <div className="flex items-end">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const r = generatePackageCode({ sku_id: skuId, duration_months: duration });
              setCodes((prev) => [r.package_code, ...prev].slice(0, 6));
              toast.success(`ออกรหัสสัญญาลำดับที่ ${r.daily_sequence} ของวันนี้`);
            }}
          >
            <Hash className="size-4" /> Generate
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        ตัวนับวันที่ {counter.date} · ลำดับล่าสุด {String(counter.last_sequence).padStart(5, "0")}
      </p>

      <div className="mt-2 space-y-1">
        {codes.map((c) => (
          <p key={c} className="rounded bg-surface px-2 py-1 font-mono text-[11px]">{c}</p>
        ))}
        {codes.length === 0 &&
          DEMO_PACKAGE_CODES.map((c) => (
            <p key={c} className="rounded bg-surface px-2 py-1 font-mono text-[11px] text-muted-foreground">{c}</p>
          ))}
      </div>
    </Panel>
  );
}

function ComputedPreview() {
  const [customerType, setCustomerType] = useState<"individual" | "juristic">("juristic");
  const [serviceLine, setServiceLine] = useState<"ORM" | "MARCOM">("ORM");
  const ctx = { customer_type: customerType, service_line: serviceLine, monthly_fee: 3850, sku_id: "ORM-MTH-FULL", setup_products: ["Register OTAs", "RevPlus+"], duration_months: 6, daily_sequence: 3 };

  return (
    <Panel title="R9 · ผลลัพธ์ computed field" subtitle="สลับบริบทเพื่อดูค่าที่ระบบจะเติมให้">
      <div className="flex flex-wrap gap-2">
        {(["individual", "juristic"] as const).map((t) => (
          <Button key={t} size="sm" variant={customerType === t ? "default" : "outline"} onClick={() => setCustomerType(t)}>
            {t === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล"}
          </Button>
        ))}
        {(["ORM", "MARCOM"] as const).map((l) => (
          <Button key={l} size="sm" variant={serviceLine === l ? "default" : "outline"} onClick={() => setServiceLine(l)}>
            {l}
          </Button>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase text-muted-foreground">
              <th className="py-2 pr-3">Field</th>
              <th className="py-2 pr-3">สูตร</th>
              <th className="py-2 pr-3">คำนวณเมื่อ</th>
              <th className="py-2">ค่าที่ได้</th>
            </tr>
          </thead>
          <tbody>
            {COMPUTED_FIELDS.map((c) => (
              <tr key={c.field_path} className="border-b last:border-0 align-top">
                <td className="py-2 pr-3">
                  <code className="font-mono text-[11px]">⚙ {c.field_path}</code>
                  <p className="text-[11px] text-muted-foreground">{c.display_label}</p>
                </td>
                <td className="py-2 pr-3">{c.formula_type}</td>
                <td className="py-2 pr-3">
                  <Chip tone={c.computed_when === "on_generate" ? "warn" : "muted"}>{c.computed_when}</Chip>
                </td>
                <td className="py-2 font-mono text-[11px]">{evaluateComputed(c.field_path, ctx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Layer2Page() {
  const { isLegalAdmin, setLegalAdmin, templates } = usePsTemplates();
  const layer2Templates = templates.filter((t) => t.sections.length > 0);
  const sections = layer2Templates.flatMap((t) => t.sections);

  return (
    <div className="space-y-5">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Layer 2 registry</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant={isLegalAdmin ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setLegalAdmin(!isLegalAdmin)}>
          <Shield className="size-4" /> {isLegalAdmin ? "Legal Admin เปิดอยู่" : "สลับเป็น Legal Admin"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="🔒 Locked sections" value={sections.filter((s) => s.lock_mode === "locked").length} />
        <Kpi label="🟡 Structured sections" value={sections.filter((s) => s.lock_mode === "structured").length} />
        <Kpi label="🛡 Guardrail rules" value={GUARDRAIL_RULES.length} />
        <Kpi label="⚙ Computed fields" value={COMPUTED_FIELDS.length} />
      </div>

      <Panel title="§NEW-A · Lock mode 3 ระดับ">
        <div className="grid gap-3 sm:grid-cols-3">
          {(["locked", "structured", "free"] as const).map((m) => (
            <div key={m} className={`rounded-xl border p-3 text-xs ${lockMeta[m].className}`}>
              <p className="text-sm font-semibold">
                {lockMeta[m].icon} {lockMeta[m].label}
              </p>
              <p className="mt-1 text-muted-foreground">
                {m === "locked"
                  ? "PS อ่านได้เท่านั้น · Legal Admin แก้ได้ทั้งข้อความและ field"
                  : m === "structured"
                    ? "PS วาง field ได้ · ข้อความถูกล็อก"
                    : "PS แก้ได้อิสระ (ข้อความเพิ่มเติม / addendum)"}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="§NEW-B · Sub-type ของ Layer 2">
        <div className="grid gap-3 sm:grid-cols-4">
          {(["2a", "2b", "2c", "2d"] as const).map((k) => (
            <div key={k} className="rounded-xl border p-3 text-xs">
              <p className="text-sm font-semibold">
                {subTypeMeta[k].icon} {k} · {subTypeMeta[k].label}
              </p>
              <p className="mt-1 text-muted-foreground">
                {k === "2a"
                  ? "อ่านค่าตรงจากข้อมูลลูกค้า/โรงแรม/สัญญา"
                  : k === "2b"
                    ? "สลับเนื้อหาทั้งบล็อกตามเงื่อนไข · แก้ใน Wizard ไม่ได้"
                    : k === "2c"
                      ? "คำนวณจากสูตร · ไม่เก็บค่าไว้ล่วงหน้า"
                      : "กรอกใน Wizard ได้แต่ต้องผ่านการตรวจค่า"}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <GuardrailPlayground />
      <ComputedPreview />
      <PackageCodeBox />

      <Panel title="§NEW-E · Conditional block registry" subtitle="Wave 1 มีเฉพาะ party_b · กลุ่มอื่นรอเนื้อหาจากฝ่ายกฎหมาย">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase text-muted-foreground">
                <th className="py-2 pr-3">Block group</th>
                <th className="py-2 pr-3">เงื่อนไข</th>
                <th className="py-2 pr-3">Variants ที่ต้องมี</th>
                <th className="py-2 pr-3">ที่มีแล้ว</th>
                <th className="py-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {BLOCK_GROUPS.map((g) => {
                const rows = CONDITIONAL_BLOCKS.filter((b) => b.block_group === g.block_group);
                return (
                  <tr key={g.block_group} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <code className="font-mono text-[11px]">🔀 {g.block_group}</code>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px]">{g.condition_source}</td>
                    <td className="py-2 pr-3">{g.variants_expected}</td>
                    <td className="py-2 pr-3">{rows.length}</td>
                    <td className="py-2">
                      <Chip tone={rows.length ? "success" : "warn"}>{rows.length ? "พร้อมใช้" : "รอเนื้อหา (Wave 2)"}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="🛡 Guardrail rules ที่ใช้อยู่">
        <ul className="space-y-2 text-xs">
          {GUARDRAIL_RULES.map((r) => (
            <li key={r.rule_id} className="border-b pb-2 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-[11px]">{r.field_path}</code>
                <Chip tone={r.constraint.locked ? "danger" : "info"}>
                  {r.constraint.locked ? `locked = ${r.constraint.default}` : `min ${r.constraint.min} · max ${r.constraint.max} · default ${r.constraint.default}`}
                </Chip>
                {r.applies_when.sku_tier && <Chip tone="muted">tier {r.applies_when.sku_tier}</Chip>}
              </div>
              <p className="mt-0.5 text-muted-foreground">{r.error_message}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
