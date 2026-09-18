import { Link, createFileRoute } from "@tanstack/react-router";
import { FileSignature, FileText, Layers, PencilLine, RotateCcw, Shield, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lockMeta, usePsTemplates, type Template, type TemplateType } from "@/lib/ps-templates";

export const Route = createFileRoute("/ps/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Quote & Contract | PS App" },
      { name: "description", content: "จัดการเทมเพลตใบเสนอราคาและสัญญา พร้อมระบบเวอร์ชันและ auto-field" },
      { property: "og:title", content: "Templates — Quote & Contract | PS App" },
      { property: "og:description", content: "จัดการเทมเพลตใบเสนอราคาและสัญญา พร้อมระบบเวอร์ชันและ auto-field" },
    ],
  }),
  component: TemplatesDashboard,
});

const statusTone = (s: string): "success" | "warn" | "muted" => (s === "active" ? "success" : s === "draft" ? "warn" : "muted");

function TemplateCard({ t }: { t: Template }) {
  const { activeVersion, draftVersion, missingConditionalBlocks } = usePsTemplates();
  const active = activeVersion(t);
  const draft = draftVersion(t);
  const missing = t.sections.length > 0 ? missingConditionalBlocks(t) : [];
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
            {t.superseded && <Chip tone="danger">superseded</Chip>}
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
              : `${t.mapped_skus.length} SKU mapped · ${active?.auto_fields_used.length ?? 0} auto-fields`}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/ps/templates/$templateId" params={{ templateId: t.template_id }}>
            <PencilLine className="size-4" /> Edit
          </Link>
        </Button>
      </div>

      {t.mapped_skus.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.mapped_skus.map((s) => (
            <code key={s} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {s}
            </code>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] dark:bg-amber-950/20">
          ⚠️ ยังขาดเนื้อหา block group {missing.length} รายการ
        </p>
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

  const list = templates
    .filter((t) => t.template_type === tab)
    .filter((t) => `${t.template_id} ${t.name} ${t.mapped_skus.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  const drafts = templates.filter((t) => t.versions.some((v) => v.status === "draft")).length;
  const docs = templates.reduce((s, t) => s + t.docs_generated, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            เทมเพลตเอกสารกลาง — BD และ AC ใช้เวอร์ชัน active ตอนสร้างเอกสาร แล้ว snapshot ล็อกไว้ถาวร
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
            {isLegalAdmin ? "Legal Admin" : "โหมด PS user"}
          </Button>
          {/* v2.1 Path A · Phase 2.1 — "Layer 2 registry" entry removed (dev terminology) */}

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/ps/templates/auto-fields">
              <Layers className="size-4" /> Auto-field reference
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetTemplates}>
            <RotateCcw className="size-4" /> Reset demo
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Quote templates" value={templates.filter((t) => t.template_type === "quote").length} />
        <Kpi label="Contract templates" value={templates.filter((t) => t.template_type === "contract").length} />
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
