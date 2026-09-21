import { Link, createFileRoute } from "@tanstack/react-router";
import { FileSignature, FileText, PencilLine, RotateCcw, Shield, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activeContractTemplates,
  contractSkuSpec,
  lockMeta,
  templateSku,
  usePsTemplates,
  type Template,
  type TemplateType,
} from "@/lib/ps-templates";

export const Route = createFileRoute("/ps/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Quote & Contract | PS App" },
      { name: "description", content: "จัดการ quote templates และ contract templates แบบ 1 SKU ต่อ 1 สัญญา" },
      { property: "og:title", content: "Templates — Quote & Contract | PS App" },
      { property: "og:description", content: "จัดการ quote templates และ contract templates แบบ flat ต่อ SKU" },
    ],
  }),
  component: TemplatesDashboard,
});

const statusTone = (s: string): "success" | "warn" | "muted" => (s === "active" ? "success" : s === "draft" ? "warn" : "muted");

type ServiceFilter = "all" | "ORM" | "MARCOM";
type TierFilter = "all" | "Full" | "Lite";

function TemplateCard({ t }: { t: Template }) {
  const { activeVersion, draftVersion } = usePsTemplates();
  const active = activeVersion(t);
  const draft = draftVersion(t);
  const sku = templateSku(t);
  const spec = contractSkuSpec(sku);
  const counts = {
    locked: t.sections.filter((s) => s.lock_mode === "locked").length,
    structured: t.sections.filter((s) => s.lock_mode === "structured").length,
    free: t.sections.filter((s) => s.lock_mode === "free").length,
  };

  return (
    <div className="card-elevated flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{t.template_id}</code>
            <Chip tone={statusTone(active?.status ?? "muted")}>{active?.version_label ?? "—"} active</Chip>
            {draft && <Chip tone="warn">{draft.version_label} draft</Chip>}
            {t.superseded && <Chip tone="danger">rollback only</Chip>}
            {t.sections.length > 0 && (
              <Chip tone="info">
                {lockMeta.locked.icon} {counts.locked} · {lockMeta.structured.icon} {counts.structured} · {lockMeta.free.icon} {counts.free}
              </Chip>
            )}
          </div>
          <p className="mt-1 font-display text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-muted-foreground">
            {t.template_type === "quote"
              ? `Quote type: ${t.quote_type} · ${active?.auto_fields_used.length ?? 0} auto-fields`
              : `${t.service_line} · ${spec?.tier ?? "—"} · ${active?.auto_fields_used.length ?? 0} auto-fields`}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/ps/templates/$templateId" params={{ templateId: t.template_id }}>
            <PencilLine className="size-4" /> Edit
          </Link>
        </Button>
      </div>

      {sku && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Applies to:</span>
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{sku}</code>
          {spec && <Chip tone="muted">{spec.channel}</Chip>}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
        <span>เอกสารที่ออกแล้ว {t.docs_generated}</span>
        <span>Active ตั้งแต่ {active?.activated_at ? fmtDate(active.activated_at) : "—"}</span>
        <span>{t.versions.length} versions</span>
      </div>
    </div>
  );
}

function TemplatesDashboard() {
  const { templates, hydrated, resetTemplates, isLegalAdmin, setLegalAdmin } = usePsTemplates();
  const [tab, setTab] = useState<TemplateType>("quote");
  const [q, setQ] = useState("");
  const [service, setService] = useState<ServiceFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");

  const contractTemplates = useMemo(() => activeContractTemplates(templates), [templates]);
  const list = templates
    .filter((t) => (tab === "contract" ? contractTemplates.some((c) => c.template_id === t.template_id) : t.template_type === "quote"))
    .filter((t) => {
      const spec = contractSkuSpec(templateSku(t));
      if (tab === "contract" && service !== "all" && spec?.service_line !== service) return false;
      if (tab === "contract" && tier !== "all" && spec?.tier !== tier) return false;
      return `${t.template_id} ${t.name} ${templateSku(t) ?? ""}`.toLowerCase().includes(q.toLowerCase());
    });

  const drafts = templates.filter((t) => t.versions.some((v) => v.status === "draft")).length;
  const docs = templates.reduce((s, t) => s + t.docs_generated, 0);
  const activeContractCount = contractTemplates.filter((t) => t.versions.some((v) => v.status === "active")).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            เทมเพลตเอกสารกลาง — Contract ใช้โครงสร้าง flat แบบ 1 SKU ต่อ 1 template และ snapshot ล็อกตอนสร้างเอกสาร
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isLegalAdmin ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setLegalAdmin(!isLegalAdmin)}
          >
            {isLegalAdmin ? <ShieldCheck className="size-4" /> : <Shield className="size-4" />}
            {isLegalAdmin ? "System Admin" : "โหมด PS user"}
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/ps/templates/auto-fields">
              <FileText className="size-4" /> Auto-field reference
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetTemplates}>
            <RotateCcw className="size-4" /> Reset demo
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Quote templates" value={templates.filter((t) => t.template_type === "quote").length} />
        <Kpi label="Contract templates" value={`${contractTemplates.length} · Active ${activeContractCount}`} />
        <Kpi label="Draft รอ activate" value={drafts} />
        <Kpi label="เอกสารที่ออกแล้ว" value={docs} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["quote", "contract"] as const).map((k) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="gap-1.5" onClick={() => setTab(k)}>
            {k === "quote" ? <FileText className="size-4" /> : <FileSignature className="size-4" />}
            {k === "quote" ? "Quote templates" : "Contract templates"}
          </Button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา template หรือ SKU…"
          className="h-9 w-full sm:w-64"
        />
        {tab === "contract" && (
          <>
            <select value={service} onChange={(e) => setService(e.target.value as ServiceFilter)} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="all">ทุก service line</option>
              <option value="ORM">ORM</option>
              <option value="MARCOM">Marcom</option>
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="all">ทุก tier</option>
              <option value="Full">Full</option>
              <option value="Lite">Lite</option>
            </select>
          </>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((t) => (
          <TemplateCard key={t.template_id} t={t} />
        ))}
      </div>

      {list.length === 0 && (
        <Panel title="ไม่พบเทมเพลต">
          <p className="text-sm text-muted-foreground">{hydrated ? "ลองปรับคำค้นหา" : "กำลังโหลด…"}</p>
        </Panel>
      )}
    </div>
  );
}
