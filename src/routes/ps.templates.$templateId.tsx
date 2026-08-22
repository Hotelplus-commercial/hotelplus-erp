import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTO_FIELDS,
  fieldGroupLabel,
  parsePlaceholders,
  renderWithSample,
  unknownPlaceholders,
  usePsTemplates,
} from "@/lib/ps-templates";

export const Route = createFileRoute("/ps/templates/$templateId")({
  head: () => ({
    meta: [
      { title: "Template editor | PS App" },
      { name: "description", content: "แก้ไขเทมเพลตเอกสารพร้อมแทรก auto-field และจัดการเวอร์ชัน" },
      { property: "og:title", content: "Template editor | PS App" },
      { property: "og:description", content: "แก้ไขเทมเพลตเอกสารพร้อมแทรก auto-field และจัดการเวอร์ชัน" },
    ],
  }),
  component: TemplateEditor,
});

function TemplateEditor() {
  const { templateId } = useParams({ from: "/ps/templates/$templateId" });
  const { templates, hydrated, activeVersion, draftVersion, saveDraft, activateDraft } = usePsTemplates();
  const tpl = templates.find((t) => t.template_id === templateId);

  const active = tpl ? activeVersion(tpl) : undefined;
  const draft = tpl ? draftVersion(tpl) : undefined;
  const baseBody = draft?.body ?? active?.body ?? "";

  const [body, setBody] = useState<string | null>(null);
  const [changelog, setChangelog] = useState(draft?.changelog ?? "");
  const [fieldQuery, setFieldQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const text = body ?? baseBody;
  const used = useMemo(() => parsePlaceholders(text), [text]);
  const unknown = useMemo(() => unknownPlaceholders(text), [text]);

  if (!tpl) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {hydrated ? `ไม่พบเทมเพลต ${templateId}` : "กำลังโหลด…"}
      </p>
    );
  }

  const fields = AUTO_FIELDS.filter((f) => f.available_in.includes(tpl.template_type)).filter((f) =>
    f.field_path.toLowerCase().includes(fieldQuery.toLowerCase()),
  );
  const groups = [...new Set(fields.map((f) => f.group))];

  const insert = (path: string, filter: string | null) => {
    const token = `{{${path}${filter ? ` | ${filter}` : ""}}}`;
    const el = areaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-4">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{tpl.template_id}</code>
            <Chip tone="success">{active?.version_label} active</Chip>
            {draft && <Chip tone="warn">{draft.version_label} draft</Chip>}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{tpl.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreview((p) => !p)}>
            <Eye className="size-4" /> {preview ? "แก้ไขต่อ" : "Preview (sample data)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              saveDraft(tpl.template_id, text, changelog || undefined);
              setBody(null);
              toast.success("บันทึกเป็น draft แล้ว");
            }}
          >
            <Save className="size-4" /> Save draft
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              saveDraft(tpl.template_id, text, changelog || undefined);
              const res = activateDraft(tpl.template_id);
              if (res.ok) {
                setBody(null);
                toast.success("Activate แล้ว · เวอร์ชันเดิมถูก archive");
              } else if (res.unknown.length) {
                toast.error(`พบ placeholder ที่ไม่รู้จัก: ${res.unknown.join(", ")}`);
              } else {
                toast.message("กด Save draft ก่อนแล้วลองใหม่อีกครั้ง");
              }
            }}
          >
            <CheckCircle2 className="size-4" /> Activate
          </Button>
        </div>
      </div>

      {unknown.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <p>
            Placeholder ที่ไม่มีใน registry (activate ไม่ได้): {unknown.map((u) => `{{${u}}}`).join(", ")}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Panel title={preview ? "Preview · sample data" : "Template body"} subtitle={`${used.length} auto-fields ใช้อยู่`}>
            {preview ? (
              <div
                className="prose-sm max-h-[560px] overflow-y-auto rounded-lg border bg-white p-5 text-[13px] leading-relaxed text-[#2C2C2A]"
                dangerouslySetInnerHTML={{ __html: renderWithSample(text) }}
              />
            ) : (
              <Textarea
                ref={areaRef}
                value={text}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
                className="min-h-[520px] font-mono text-xs leading-relaxed"
              />
            )}
          </Panel>

          <Panel title="Version history">
            <ul className="space-y-2">
              {tpl.versions.map((v) => (
                <li key={v.version_id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs last:border-0">
                  <Chip tone={v.status === "active" ? "success" : v.status === "draft" ? "warn" : "muted"}>
                    {v.version_label} · {v.status}
                  </Chip>
                  <span className="text-muted-foreground">{v.changelog ?? "—"}</span>
                  <span className="ml-auto text-muted-foreground">
                    {v.activated_at ? `activated ${fmtDate(v.activated_at)}` : `created ${fmtDate(v.created_at)}`}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Changelog ของ draft">
            <Input
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="เช่น เพิ่มข้อกำหนดคอมมิชชั่น"
              className="h-9"
            />
          </Panel>

          <Panel title="แทรก auto-field" subtitle="คลิกเพื่อวางที่ตำแหน่ง cursor">
            <Input
              value={fieldQuery}
              onChange={(e) => setFieldQuery(e.target.value)}
              placeholder="ค้นหา field…"
              className="mb-3 h-9"
            />
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {fieldGroupLabel[g] ?? g}
                  </p>
                  <div className="space-y-1">
                    {fields
                      .filter((f) => f.group === g)
                      .map((f) => (
                        <div key={f.field_path} className="rounded-lg border p-2">
                          <button
                            type="button"
                            onClick={() => insert(f.field_path, null)}
                            className="block w-full text-left font-mono text-[11px] hover:text-primary"
                          >
                            {`{{${f.field_path}}}`}
                          </button>
                          <p className="text-[11px] text-muted-foreground">ตัวอย่าง: {f.example}</p>
                          {f.supported_filters.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {f.supported_filters.map((flt) => (
                                <button
                                  key={flt}
                                  type="button"
                                  onClick={() => insert(f.field_path, flt)}
                                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-primary hover:text-primary-foreground"
                                >
                                  | {flt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="กติกาสำคัญ">
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>เอกสารที่ออกไปแล้ว snapshot เวอร์ชันไว้ ไม่เปลี่ยนตามเทมเพลตใหม่</li>
              <li>1 template มี active ได้เวอร์ชันเดียว · activate แล้วเวอร์ชันเดิมกลายเป็น archived</li>
              <li>placeholder ที่ไม่อยู่ใน registry จะบล็อกการ activate</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
