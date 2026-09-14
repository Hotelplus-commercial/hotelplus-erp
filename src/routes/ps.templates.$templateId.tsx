import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, Lock, Save, Shield } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTO_FIELDS,
  CONDITIONAL_BLOCKS,
  COMPUTED_FIELDS,
  GUARDRAIL_RULES,
  fieldGroupLabel,
  lockMeta,
  parsePlaceholders,
  renderWithSample,
  subTypeMeta,
  unknownPlaceholders,
  usePsTemplates,
  type AutoField,
  type LockMode,
  type TemplateSection,
} from "@/lib/ps-templates";

export const Route = createFileRoute("/ps/templates/$templateId")({
  head: () => ({
    meta: [
      { title: "Template editor | PS App" },
      { name: "description", content: "แก้ไขเทมเพลตเอกสารพร้อม Layer 2 lock mode, guardrail, computed field และ conditional block" },
      { property: "og:title", content: "Template editor | PS App" },
      { property: "og:description", content: "แก้ไขเทมเพลตเอกสารพร้อม Layer 2 lock mode, guardrail, computed field และ conditional block" },
    ],
  }),
  component: TemplateEditor,
});

const LOCK_MODES: LockMode[] = ["locked", "structured", "free"];

function FieldLibrary({
  fields,
  onInsert,
  serviceLine,
}: {
  fields: AutoField[];
  onInsert: (path: string, filter: string | null) => void;
  serviceLine: "ORM" | "MARCOM" | null;
}) {
  const [q, setQ] = useState("");
  const list = fields.filter((f) => `${f.field_path} ${f.source}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(list.map((f) => f.group))];

  return (
    <Panel title="Auto-field Library" subtitle="คลิกเพื่อวางที่ตำแหน่ง cursor">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา field…" className="mb-3 h-9" />
      <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {fieldGroupLabel[g] ?? g}
            </p>
            <div className="space-y-1">
              {list
                .filter((f) => f.group === g)
                .map((f) => {
                  const sub = subTypeMeta[f.sub_type ?? "2a"];
                  const mismatch =
                    f.applies_to_service_line && f.applies_to_service_line !== "ALL" && serviceLine
                      ? f.applies_to_service_line !== serviceLine
                      : false;
                  return (
                    <div
                      key={f.field_path}
                      className={`rounded-lg border p-2 ${mismatch ? "opacity-40" : ""}`}
                      title={mismatch ? `ใช้ได้เฉพาะ ${f.applies_to_service_line} template` : `${sub.label}${f.computed_when ? ` · ${f.computed_when}` : ""}`}
                    >
                      <button
                        type="button"
                        disabled={mismatch}
                        onClick={() => onInsert(f.field_path, null)}
                        className="flex w-full items-start gap-1.5 text-left font-mono text-[11px] hover:text-primary disabled:cursor-not-allowed"
                      >
                        <span aria-hidden>{sub.icon}</span>
                        <span>{`{{${f.field_path}}}`}</span>
                      </button>
                      <p className="text-[11px] text-muted-foreground">{f.source}</p>
                      {f.applies_when && <p className="text-[10px] text-muted-foreground">เงื่อนไข: {f.applies_when}</p>}
                      {f.supported_filters.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {f.supported_filters.map((flt) => (
                            <button
                              key={flt}
                              type="button"
                              disabled={mismatch}
                              onClick={() => onInsert(f.field_path, flt)}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-primary hover:text-primary-foreground"
                            >
                              | {flt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SectionCard({
  templateId,
  section,
  selected,
  onSelect,
  cursorRef,
}: {
  templateId: string;
  section: TemplateSection;
  selected: boolean;
  onSelect: () => void;
  cursorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const { isLegalAdmin, saveSection, setLockMode } = usePsTemplates();
  const [draft, setDraft] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const meta = lockMeta[section.lock_mode];
  const readOnly = section.lock_mode === "locked" && !isLegalAdmin;
  const text = draft ?? section.content;

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-3 transition ${meta.className} ${selected ? "ring-2 ring-primary/60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden>{meta.icon}</span>
        <p className="text-sm font-semibold">{section.title}</p>
        <Chip tone={section.lock_mode === "locked" ? "muted" : section.lock_mode === "free" ? "success" : "warn"}>
          {meta.label}
        </Chip>
        {section.uses_conditional_block && <Chip tone="info">🔀 {section.uses_conditional_block}</Chip>}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPreviewMode((p) => !p)}>
            {previewMode ? "แก้ไข" : "Preview"}
          </Button>
          {isLegalAdmin && (
            <div className="flex gap-1">
              {LOCK_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLockMode(templateId, section.id, m)}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${section.lock_mode === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {lockMeta[m].icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewMode ? (
        <div
          className="prose-sm mt-2 rounded-lg border bg-white p-3 text-[12px] leading-relaxed text-[#2C2C2A]"
          dangerouslySetInnerHTML={{
            __html: renderWithSample(
              text.replace(
                /<ConditionalBlockPlaceholder\s+group="([^"]+)"\s*\/?>/g,
                (_m, g: string) =>
                  CONDITIONAL_BLOCKS.find((b) => b.block_group === g)?.content ??
                  `<p style="border:1px dashed #999;padding:6px">⚠️ ยังไม่มีเนื้อหา conditional block: ${g}</p>`,
              ),
            ),
          }}
        />
      ) : (
        <>
          <Textarea
            ref={(el) => {
              if (selected) cursorRef.current = el;
            }}
            value={text}
            readOnly={readOnly}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="mt-2 min-h-[110px] font-mono text-[11px] leading-relaxed"
          />
          <div className="mt-2 flex items-center gap-2">
            {readOnly ? (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="size-3" /> Locked · ติดต่อ Legal Admin
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={draft === null}
                onClick={() => {
                  const res = saveSection(templateId, section.id, text);
                  if (res.ok) {
                    setDraft(null);
                    toast.success(`บันทึก ${section.title} แล้ว`);
                  } else toast.error(res.error ?? "บันทึกไม่สำเร็จ");
                }}
              >
                บันทึก section
              </Button>
            )}
            {section.lock_mode === "structured" && !isLegalAdmin && (
              <p className="text-[11px] text-muted-foreground">Structured · แก้ได้เฉพาะการวาง field</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TemplateEditor() {
  const { templateId } = useParams({ from: "/ps/templates/$templateId" });
  const {
    templates,
    hydrated,
    activeVersion,
    draftVersion,
    saveDraft,
    activateDraft,
    isLegalAdmin,
    setLegalAdmin,
    missingConditionalBlocks,
  } = usePsTemplates();
  const tpl = templates.find((t) => t.template_id === templateId);

  const active = tpl ? activeVersion(tpl) : undefined;
  const draft = tpl ? draftVersion(tpl) : undefined;
  const baseBody = draft?.body ?? active?.body ?? "";

  const [body, setBody] = useState<string | null>(null);
  const [changelog, setChangelog] = useState(draft?.changelog ?? "");
  const [preview, setPreview] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const sectionRef = useRef<HTMLTextAreaElement | null>(null);

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

  const hasSections = tpl.sections.length > 0;
  const fields = AUTO_FIELDS.filter((f) => f.available_in.includes(tpl.template_type));
  const missing = missingConditionalBlocks(tpl);
  const lockCounts = {
    locked: tpl.sections.filter((s) => s.lock_mode === "locked").length,
    structured: tpl.sections.filter((s) => s.lock_mode === "structured").length,
    free: tpl.sections.filter((s) => s.lock_mode === "free").length,
  };
  const sel = tpl.sections.find((s) => s.id === selectedSection) ?? tpl.sections[0];

  const insert = (path: string, filter: string | null) => {
    const token = `{{${path}${filter ? ` | ${filter}` : ""}}}`;
    const el = hasSections ? sectionRef.current : areaRef.current;
    if (hasSections) {
      if (!el) {
        void navigator.clipboard?.writeText(token);
        toast.message(`คัดลอก ${token} แล้ว · คลิก section ที่ต้องการก่อนเพื่อวางอัตโนมัติ`);
        return;
      }
      const start = el.selectionStart;
      const next = el.value.slice(0, start) + token + el.value.slice(el.selectionEnd);
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
      return;
    }
    const start = areaRef.current?.selectionStart ?? text.length;
    const end = areaRef.current?.selectionEnd ?? text.length;
    setBody(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      areaRef.current?.focus();
      areaRef.current?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-4">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Templates · {tpl.template_type === "quote" ? "Quote" : "Contract"} · {tpl.template_id} · Edit{" "}
            {(draft ?? active)?.version_label} {draft ? "draft" : "active"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Chip tone="success">{active?.version_label} active</Chip>
            {draft && <Chip tone="warn">{draft.version_label} draft</Chip>}
            {tpl.superseded && <Chip tone="danger">superseded</Chip>}
            {isLegalAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Shield className="size-3" /> Legal Admin
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{tpl.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isLegalAdmin ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setLegalAdmin(!isLegalAdmin)}
          >
            <Shield className="size-4" /> {isLegalAdmin ? "ออกจากโหมด Legal Admin" : "สลับเป็น Legal Admin"}
          </Button>
          {!hasSections && (
            <>
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
            </>
          )}
        </div>
      </div>

      {hasSections && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Template ID", tpl.template_id],
            ["Version", `${active?.version_label ?? "—"} active`],
            ["Mapped SKUs", `${tpl.mapped_skus.length} SKU`],
            ["Layer 1/2/3", `🔒 ${lockCounts.locked} · 🟡 ${lockCounts.structured} · 🟢 ${lockCounts.free}`],
            ["เอกสารที่ออกแล้ว", `${tpl.docs_generated} ฉบับ`],
          ].map(([label, value]) => (
            <div key={label} className="card-elevated p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
          <p>
            ⚠️ Missing conditional blocks for:{" "}
            <span className="font-mono text-xs">
              {missing.map((m) => `${m.block_group}:${m.condition}`).join(", ")}
            </span>{" "}
            — Generate จะถูกบล็อกจนกว่า Legal Admin เพิ่มเนื้อหา (Wave 2)
          </p>
        </div>
      )}

      {hasSections && tpl.docs_generated > 0 && (
        <p className="rounded-xl border bg-surface p-3 text-xs text-muted-foreground">
          ⚖ {active?.version_label} ใช้อยู่กับสัญญา {tpl.docs_generated} ฉบับ · เวอร์ชันใหม่จะมีผลกับสัญญาที่สร้างหลังจากนี้เท่านั้น
        </p>
      )}

      {unknown.length > 0 && !hasSections && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <p>Placeholder ที่ไม่มีใน registry (activate ไม่ได้): {unknown.map((u) => `{{${u}}}`).join(", ")}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <FieldLibrary fields={fields} onInsert={insert} serviceLine={tpl.service_line} />

        <div className="space-y-4">
          {hasSections ? (
            <Panel title="A4 Canvas · sections" subtitle={`${tpl.sections.length} sections · คลิก section เพื่อเลือกและวาง field`}>
              <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {tpl.sections.map((sec) => (
                  <SectionCard
                    key={sec.id}
                    templateId={tpl.template_id}
                    section={sec}
                    selected={sel?.id === sec.id}
                    onSelect={() => setSelectedSection(sec.id)}
                    cursorRef={sectionRef}
                  />
                ))}
              </div>
            </Panel>
          ) : (
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
          )}

          {!hasSections && (
            <Panel title="Changelog ของ draft">
              <Input
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="เช่น เพิ่มข้อกำหนดคอมมิชชั่น"
                className="h-9"
              />
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Inspector" subtitle={(hasSections ? sel?.title : "Quote template") ?? "—"}>
            {hasSections && sel ? (
              <div className="space-y-2 text-xs">
                <p>
                  Lock mode: <span className="font-medium">{lockMeta[sel.lock_mode].icon} {lockMeta[sel.lock_mode].label}</span>
                </p>
                <p>Fields ใน section: {parsePlaceholders(sel.content).length}</p>
                {sel.uses_conditional_block && (
                  <div>
                    <p className="mb-1">Conditional block group: <code className="font-mono">{sel.uses_conditional_block}</code></p>
                    {CONDITIONAL_BLOCKS.filter((b) => b.block_group === sel.uses_conditional_block).map((b) => (
                      <p key={b.block_id} className="text-muted-foreground">
                        · {b.condition_type} = {b.condition_value} (v{b.version})
                      </p>
                    ))}
                    {CONDITIONAL_BLOCKS.every((b) => b.block_group !== sel.uses_conditional_block) && (
                      <p className="text-muted-foreground">ยังไม่มี variant · รอเนื้อหาจากฝ่ายกฎหมาย (Wave 2)</p>
                    )}
                  </div>
                )}
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Guardrail ที่เกี่ยวข้อง</p>
                  {GUARDRAIL_RULES.filter((r) => sel.content.includes(r.field_path)).map((r) => (
                    <p key={r.rule_id} className="text-muted-foreground">
                      🛡 {r.field_path} · {r.constraint.locked ? `locked = ${r.constraint.default}` : `min ${r.constraint.min} / max ${r.constraint.max}`}
                    </p>
                  ))}
                </div>
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Computed field ที่ใช้</p>
                  {COMPUTED_FIELDS.filter((c) => sel.content.includes(c.field_path)).map((c) => (
                    <p key={c.field_path} className="text-muted-foreground">
                      ⚙ {c.field_path} · {c.formula_type} · {c.computed_when}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">เทมเพลตนี้ยังใช้ body เดียวแบบ v1.0 · เลือก contract template เพื่อดู Layer 2</p>
            )}
          </Panel>

          <Panel title="Version history">
            <ul className="space-y-2">
              {tpl.versions.map((v) => (
                <li key={v.version_id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-[11px] last:border-0">
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

          <Panel title="กติกาสำคัญ">
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>R7 · section ที่ 🔒 Locked แก้ได้เฉพาะ Legal Admin</li>
              <li>R8 · conditional block ที่ยังไม่มีเนื้อหาจะบล็อกการสร้างสัญญา</li>
              <li>R9 · computed field แบบ on_generate ล็อกค่าไว้ถาวรตั้งแต่ครั้งแรก</li>
              <li>R10 · guardrail ตรวจค่าทุกครั้งที่แก้ใน Wizard</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
