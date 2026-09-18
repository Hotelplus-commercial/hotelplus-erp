/* PS-2 / PS-3 · Template editor with A4 canvas (v2.1 delta)
 * PS-3 = 3 panels: preview controls · A4 canvas · inspector (auto-fields / block groups / signature)
 * PS-2 (quote template) = A4 canvas without cover page and CI bars. */
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Lock, PenLine, Save, Shield } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlockGroupDrawer } from "@/components/ps/block-group-drawer";
import { A4Canvas, SIGNATURE_MARKER, renderBody } from "@/lib/contract-renderer";
import { MONTHLY_SKUS, activeBlockVersion, coverageOf, usePsBlockGroups } from "@/lib/ps-block-groups";
import {
  AUTO_FIELDS,
  COMPUTED_FIELDS,
  GUARDRAIL_RULES,
  fieldGroupLabel,
  lockMeta,
  parsePlaceholders,
  subTypeMeta,
  unknownPlaceholders,
  usePsTemplates,
  type AutoField,
  type LockMode,
  type TemplateSection,
} from "@/lib/ps-templates";
import { sampleDataFor, serviceLineOf, type PreviewCustomerType } from "@/lib/template-preview-sample-data";

export const Route = createFileRoute("/ps/templates/$templateId")({
  head: () => ({
    meta: [
      { title: "Template editor · A4 canvas | PS App" },
      { name: "description", content: "แก้ไขเทมเพลตบนกระดาษ A4 จริง พร้อม Cover Page, CI header/footer, block group และ signature block" },
      { property: "og:title", content: "Template editor · A4 canvas | PS App" },
      { property: "og:description", content: "แก้ไขเทมเพลตบนกระดาษ A4 จริง พร้อม Cover Page, CI header/footer และ signature block" },
    ],
  }),
  component: TemplateEditor,
});

const LOCK_MODES: LockMode[] = ["locked", "structured", "free"];
const BLOCK_RE = /<ConditionalBlockPlaceholder\s+group="([^"]+)"\s*\/?>/g;

/* ---------------- right panel ---------------- */

function FieldLibrary({
  fields,
  onInsert,
  serviceLine,
}: {
  fields: AutoField[];
  onInsert: (token: string) => void;
  serviceLine: "ORM" | "MARCOM" | null;
}) {
  const [q, setQ] = useState("");
  const list = fields.filter((f) => `${f.field_path} ${f.source}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(list.map((f) => f.group))];

  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา field…" className="mb-3 h-9" />
      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
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
                    <div key={f.field_path} className={`rounded-lg border p-2 ${mismatch ? "opacity-40" : ""}`}>
                      <button
                        type="button"
                        disabled={mismatch}
                        onClick={() => onInsert(`{{${f.field_path}}}`)}
                        className="flex w-full items-start gap-1.5 text-left font-mono text-[11px] hover:text-primary disabled:cursor-not-allowed"
                      >
                        <span aria-hidden>{sub.icon}</span>
                        <span>{`{{${f.field_path}}}`}</span>
                      </button>
                      <p className="text-[11px] text-muted-foreground">{f.source}</p>
                      {f.supported_filters.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {f.supported_filters.map((flt) => (
                            <button
                              key={flt}
                              type="button"
                              disabled={mismatch}
                              onClick={() => onInsert(`{{${f.field_path} | ${flt}}}`)}
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
    </div>
  );
}

/* ---------------- A4 section (WYSIWYG) ---------------- */

function BlockGroupNode({
  groupId,
  sku,
  templateId,
  onReplace,
  onRemove,
}: {
  groupId: string;
  sku: string;
  templateId: string;
  onReplace?: ((nextGroupId: string) => void) | undefined;
  onRemove?: (() => void) | undefined;
}) {
  const { blockGroups } = usePsBlockGroups();
  const group = blockGroups.find((g) => g.block_group_id === groupId);
  const variant = group
    ? activeBlockVersion(group).variants.find((v) => v.applies_to_skus.includes(sku))
    : undefined;
  const [ask, setAsk] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="bg-node">
      <button
        type="button"
        className="bg-node-chip"
        title="คลิกเพื่อจัดการ block group นี้"
        onClick={(e) => {
          e.stopPropagation();
          setDrawer(true);
        }}
      >
        <span>🧩 {groupId}</span>
        <span>· {variant ? `V${variant.variant_seq} (${variant.variant_label})` : "ยังไม่มี variant สำหรับ SKU นี้"}</span>
      </button>
      <div className="bg-node-content" onClick={() => setAsk(true)}>
        {variant ? (
          <div dangerouslySetInnerHTML={{ __html: variant.content }} />
        ) : (
          <p className="text-[9pt] text-amber-700">⚠️ ยังไม่มีเนื้อหาสำหรับ {sku} — สร้างสัญญาจะถูกบล็อก</p>
        )}
      </div>
      {ask && (
        <div className="border-t border-dashed p-2 text-[9pt]">
          <p>⚠ แก้ไขเนื้อหา variant ต้องไปที่ Block Group Editor</p>
          <p className="text-muted-foreground">
            Variant: {groupId} · {variant ? `V${variant.variant_seq} (${variant.variant_label})` : "—"}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAsk(false)}>
              Cancel
            </Button>
            <Button asChild size="sm" className="h-7 px-2 text-xs">
              <Link
                to="/ps/templates/block-groups/$groupId"
                params={{ groupId }}
                search={{ from: templateId }}
              >
                Open in Block Group Editor →
              </Link>
            </Button>
          </div>
        </div>
      )}
      {drawer && (
        <BlockGroupDrawer
          groupId={groupId}
          currentSku={sku}
          templateId={templateId}
          onClose={() => setDrawer(false)}
          {...(onReplace ? { onReplace } : {})}
          {...(onRemove ? { onRemove } : {})}
        />
      )}
    </div>
  );
}


function SectionOnPaper({
  templateId,
  section,
  selected,
  onSelect,
  cursorRef,
  data,
  raw,
  sku,
}: {
  templateId: string;
  section: TemplateSection;
  selected: boolean;
  onSelect: () => void;
  cursorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  data: Record<string, string>;
  raw: boolean;
  sku: string;
}) {
  const { isLegalAdmin, saveSection, setLockMode } = usePsTemplates();
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const meta = lockMeta[section.lock_mode];
  const readOnly = section.lock_mode === "locked" && !isLegalAdmin;
  const text = draft ?? section.content;

  /* split content around block-group zones so each renders inline expanded */
  const parts = useMemo(() => {
    const out: { type: "html" | "block"; value: string }[] = [];
    let last = 0;
    for (const m of text.matchAll(BLOCK_RE)) {
      const idx = m.index ?? 0;
      if (idx > last) out.push({ type: "html", value: text.slice(last, idx) });
      out.push({ type: "block", value: m[1] ?? "" });
      last = idx + m[0].length;
    }
    if (last < text.length) out.push({ type: "html", value: text.slice(last) });
    return out;
  }, [text]);

  return (
    <div
      onClick={onSelect}
      className={`a4-block rounded-md ${selected ? "outline outline-2 outline-[color:var(--bg-chip-border)]/40" : ""}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[8pt] text-muted-foreground">
        <span aria-hidden>{meta.icon}</span>
        <span className="font-semibold text-foreground">{section.title}</span>
        <span>· {meta.label}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="rounded bg-muted px-1.5 py-0.5 text-[8pt] hover:bg-primary hover:text-primary-foreground"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "ดูผลลัพธ์" : "แก้ไข"}
          </button>
          {isLegalAdmin &&
            LOCK_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLockMode(templateId, section.id, m)}
                className={`rounded px-1.5 py-0.5 text-[8pt] ${section.lock_mode === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                title={lockMeta[m].label}
              >
                {lockMeta[m].icon}
              </button>
            ))}
        </div>
      </div>

      {editing ? (
        <>
          <Textarea
            ref={(el) => {
              if (selected) cursorRef.current = el;
            }}
            value={text}
            readOnly={readOnly}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="min-h-[110px] bg-white font-mono text-[10px] leading-relaxed"
          />
          <div className="mt-1 flex items-center gap-2">
            {readOnly ? (
              <p className="flex items-center gap-1 text-[8pt] text-muted-foreground">
                <Lock className="size-3" /> Locked · ติดต่อ System Admin
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[8pt]"
                disabled={draft === null}
                onClick={() => {
                  const res = saveSection(templateId, section.id, text);
                  if (res.ok) {
                    setDraft(null);
                    setEditing(false);
                    toast.success(`บันทึก ${section.title} แล้ว`);
                  } else toast.error(res.error ?? "บันทึกไม่สำเร็จ");
                }}
              >
                บันทึก section
              </Button>
            )}
          </div>
        </>
      ) : (
        <div>
          {parts.map((p, i) =>
            p.type === "block" ? (
              <BlockGroupNode
                key={`b${i}`}
                groupId={p.value}
                sku={sku}
                templateId={templateId}
                onReplace={
                  readOnly
                    ? undefined
                    : (next) => {
                        const marker = `<ConditionalBlockPlaceholder group="${p.value}" />`;
                        const res = saveSection(
                          templateId,
                          section.id,
                          text.replace(marker, `<ConditionalBlockPlaceholder group="${next}" />`),
                        );
                        if (res.ok) toast.success(`เปลี่ยนเป็น ${next} แล้ว`);
                        else toast.error(res.error ?? "แก้ไขไม่สำเร็จ");
                      }
                }
                onRemove={
                  readOnly
                    ? undefined
                    : () => {
                        const marker = `<ConditionalBlockPlaceholder group="${p.value}" />`;
                        const res = saveSection(templateId, section.id, text.replace(marker, ""));
                        if (res.ok) toast.success(`ลบ block group ${p.value} แล้ว`);
                        else toast.error(res.error ?? "ลบไม่สำเร็จ");
                      }
                }
              />
            ) : (
              <div key={`h${i}`} dangerouslySetInnerHTML={{ __html: renderBody(p.value, data, { raw, pills: true }) }} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- editor ---------------- */

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
  const { blockGroups } = usePsBlockGroups();
  const tpl = templates.find((t) => t.template_id === templateId);

  const active = tpl ? activeVersion(tpl) : undefined;
  const draft = tpl ? draftVersion(tpl) : undefined;
  const baseBody = draft?.body ?? active?.body ?? "";

  const [body, setBody] = useState<string | null>(null);
  const [changelog, setChangelog] = useState(draft?.changelog ?? "");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [panel, setPanel] = useState<"fields" | "blocks" | "sigs">("fields");
  const [sku, setSku] = useState<string>(MONTHLY_SKUS[0]);
  const [customerType, setCustomerType] = useState<PreviewCustomerType>("juristic");
  const [showCover, setShowCover] = useState(true);
  const [showCI, setShowCI] = useState(true);
  const [raw, setRaw] = useState(false);
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

  const isContract = tpl.template_type === "contract";
  const hasSections = tpl.sections.length > 0;
  const mappedSkus = tpl.mapped_skus.length > 0 ? tpl.mapped_skus : [...MONTHLY_SKUS];
  const activeSku = mappedSkus.includes(sku) ? sku : (mappedSkus[0] as string);
  const line = serviceLineOf(activeSku);
  const data = sampleDataFor({ sku: activeSku, customerType, serviceLine: tpl.service_line ?? line });

  const fields = AUTO_FIELDS.filter((f) => f.available_in.includes(tpl.template_type));
  const missing = missingConditionalBlocks(tpl);
  const sel = tpl.sections.find((s) => s.id === selectedSection) ?? tpl.sections[0];

  /* v2.1 Path A §3.6 — section numbering must be continuous up to template.max_section */
  const numberingIssue = ((): number[] | null => {
    const nums = tpl.sections
      .map((s) => /^(\d+)\./.exec(s.title)?.[1])
      .filter((n): n is string => !!n)
      .map(Number);
    if (nums.length === 0) return null;
    const max = tpl.max_section ?? Math.max(...nums);
    const gaps: number[] = [];
    for (let i = 1; i <= max; i++) if (!nums.includes(i)) gaps.push(i);
    const extra = nums.filter((n) => n > max);
    if (gaps.length === 0 && extra.length === 0) return null;
    return [...gaps, ...extra].sort((a, b) => a - b);
  })();

  /* coverage across every block-group zone used by this template */
  const allBodies = tpl.sections.map((s) => s.content).join(" ") + text;
  const usedGroups = [...new Set([...allBodies.matchAll(BLOCK_RE)].map((m) => m[1] ?? ""))];
  const coverage = ((): { covered: number; total: number } | null => {
    const groups = usedGroups
      .map((id) => blockGroups.find((g) => g.block_group_id === id))
      .filter((g): g is NonNullable<typeof g> => !!g);
    if (groups.length === 0) return null;
    const missingSkus = new Set<string>();
    for (const g of groups) for (const s of coverageOf(g).missing) missingSkus.add(s);
    const covered = mappedSkus.filter((s) => !missingSkus.has(s)).length;
    return { covered, total: mappedSkus.length };
  })();

  const insert = (token: string) => {
    const el = hasSections ? sectionRef.current : areaRef.current;
    if (hasSections) {
      if (!el) {
        void navigator.clipboard?.writeText(token);
        toast.message(`คัดลอก ${token} แล้ว · กด "แก้ไข" ใน section ที่ต้องการก่อนเพื่อวางอัตโนมัติ`);
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
  };

  return (
    <div className="space-y-4">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Templates · {isContract ? "Contract" : "Quote"} · {tpl.template_id} · {(draft ?? active)?.version_label}{" "}
            {draft ? "draft" : "active"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Chip tone="success">{active?.version_label} active</Chip>
            {draft && <Chip tone="warn">{draft.version_label} draft</Chip>}
            {tpl.superseded && <Chip tone="danger">superseded</Chip>}
            {isLegalAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Shield className="size-3" /> System Admin
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{tpl.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={isLegalAdmin ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setLegalAdmin(!isLegalAdmin)}>
            <Shield className="size-4" /> {isLegalAdmin ? "ออกจากโหมด System Admin" : "สลับเป็น System Admin"}
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link
              to="/ps/templates/preview/$templateId"
              params={{ templateId: tpl.template_id }}
              search={{ sku: activeSku, customer_type: customerType, show_cover: showCover }}
              target="_blank"
            >
              <ExternalLink className="size-4" /> Full Preview →
            </Link>
          </Button>
          {!hasSections && (
            <>
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
                  } else toast.message("กด Save draft ก่อนแล้วลองใหม่อีกครั้ง");
                }}
              >
                <CheckCircle2 className="size-4" /> Activate
              </Button>
            </>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
          <p>
            ⚠️ ยังขาดเนื้อหา block group:{" "}
            <span className="font-mono text-xs">{missing.map((m) => `${m.block_group}:${m.condition}`).join(", ")}</span>
          </p>
        </div>
      )}

      {numberingIssue && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
          <p>
            ⚠️ ตรวจพบการข้ามหมายเลขข้อ · แก้ไขให้เรียงต่อเนื่อง{" "}
            <span className="font-mono text-xs">ข้อ {numberingIssue.join(", ")}</span>
          </p>
        </div>
      )}

      {unknown.length > 0 && !hasSections && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <p>Placeholder ที่ไม่มีใน registry (activate ไม่ได้): {unknown.map((u) => `{{${u}}}`).join(", ")}</p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[240px_1fr_300px]">
        {/* LEFT · preview controls */}
        <Panel title="Preview controls" subtitle="มีผลกับการแสดงผลเท่านั้น">
          <div className="space-y-3 text-xs">
            {isContract ? (
              <>
                <label className="block">
                  <span className="text-[11px] text-muted-foreground">SKU</span>
                  <select
                    value={activeSku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs"
                  >
                    {mappedSkus.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="text-[11px] text-muted-foreground">ประเภทลูกค้า</span>
                  <div className="mt-1 flex gap-1">
                    {(["juristic", "individual"] as const).map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={customerType === t ? "default" : "outline"}
                        className="h-7 flex-1 px-2 text-[11px]"
                        onClick={() => setCustomerType(t)}
                      >
                        {t === "juristic" ? "นิติบุคคล" : "บุคคล"}
                      </Button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showCover} onChange={(e) => setShowCover(e.target.checked)} /> Include cover page
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showCI} onChange={(e) => setShowCI(e.target.checked)} /> Include CI header/footer
                </label>
              </>
            ) : (
              <p className="rounded-lg bg-surface p-2 text-[11px] text-muted-foreground">
                Quote layout · ไม่มี cover page และ CI bar · Service line: {tpl.service_line ?? "ALL"}
              </p>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} /> Show raw placeholders
            </label>
            {coverage && (
              <p
                className={`rounded-lg px-2 py-1 text-[11px] ${
                  coverage.covered === coverage.total
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {coverage.covered === coverage.total ? "✅" : "⚠"} Coverage: {coverage.covered}/{coverage.total} SKUs
              </p>
            )}
          </div>
        </Panel>

        {/* CENTER · A4 canvas */}
        <div className="space-y-3">
          <A4Canvas
            showCover={isContract && showCover}
            showCIHeaderFooter={isContract && showCI}
            serviceLine={tpl.service_line ?? serviceLineOf(activeSku)}
            contractCode={data["contract.code"] ?? "—"}
            hotelName={data["hotel.name"] ?? "—"}
          >
            {hasSections ? (
              tpl.sections.map((sec) => (
                <SectionOnPaper
                  key={sec.id}
                  templateId={tpl.template_id}
                  section={sec}
                  selected={sel?.id === sec.id}
                  onSelect={() => setSelectedSection(sec.id)}
                  cursorRef={sectionRef}
                  data={data}
                  raw={raw}
                  sku={activeSku}
                />
              ))
            ) : (
              <div className="space-y-2">
                <div dangerouslySetInnerHTML={{ __html: renderBody(text, data, { raw, pills: true }) }} />
                <Textarea
                  ref={areaRef}
                  value={text}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck={false}
                  className="min-h-[320px] bg-white font-mono text-[10px] leading-relaxed"
                />
              </div>
            )}
          </A4Canvas>

          {!hasSections && (
            <Panel title="Changelog ของ draft" subtitle={`${used.length} auto-fields ใช้อยู่`}>
              <Input
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="เช่น เพิ่มข้อกำหนดคอมมิชชั่น"
                className="h-9"
              />
            </Panel>
          )}
        </div>

        {/* RIGHT · 3 subsections */}
        <div className="space-y-4">
          <Panel title="Insert" subtitle="คลิกเพื่อวางที่ตำแหน่ง cursor">
            <div className="mb-3 flex gap-1">
              {(
                [
                  ["fields", "🔧 Auto"],
                  ["blocks", "🧩 Blocks"],
                  ["sigs", "📝 Sigs"],
                ] as const
              ).map(([k, label]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={panel === k ? "default" : "outline"}
                  className="h-7 flex-1 px-1 text-[11px]"
                  onClick={() => setPanel(k)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {panel === "fields" && <FieldLibrary fields={fields} onInsert={insert} serviceLine={tpl.service_line} />}

            {panel === "blocks" && (
              <div className="space-y-2">
                {blockGroups.map((g) => {
                  const cov = coverageOf(g);
                  return (
                    <div key={g.block_group_id} className="rounded-lg border p-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => insert(`<ConditionalBlockPlaceholder group="${g.block_group_id}" />`)}
                        className="text-left font-mono text-[11px] hover:text-primary"
                      >
                        🧩 {g.block_group_id}
                      </button>
                      <p className="text-muted-foreground">{g.block_group_label}</p>
                      <p className={cov.missing.length ? "text-destructive" : "text-emerald-600"}>
                        coverage {cov.covered}/{cov.total}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {panel === "sigs" && (
              <div className="space-y-2 text-[11px]">
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => insert(SIGNATURE_MARKER)}>
                  <PenLine className="size-4" /> วาง Signature block
                </Button>
                <p className="text-muted-foreground">
                  2 คอลัมน์ · ป้าย “เจ้าของโครงการ / ฝ่ายบริหารจัดการ” ล็อกไว้แก้ไม่ได้ · ชื่อผู้ลงนามดึงจาก{" "}
                  <code className="font-mono">customer.signer_name</code> และ{" "}
                  <code className="font-mono">hotelplus.authorized_signatory</code>
                </p>
                <p className="text-muted-foreground">วางได้หลายจุดในเทมเพลตเดียว · ลบด้วยการแก้ section แล้วเอา marker ออก</p>
              </div>
            )}
          </Panel>

          <Panel title="Inspector" subtitle={(hasSections ? sel?.title : "Quote template") ?? "—"}>
            {hasSections && sel ? (
              <div className="space-y-2 text-xs">
                <p>
                  Lock mode:{" "}
                  <span className="font-medium">
                    {lockMeta[sel.lock_mode].icon} {lockMeta[sel.lock_mode].label}
                  </span>
                </p>
                <p>Fields ใน section: {parsePlaceholders(sel.content).length}</p>
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Guardrail ที่เกี่ยวข้อง</p>
                  {GUARDRAIL_RULES.filter((r) => sel.content.includes(r.field_path)).map((r) => (
                    <p key={r.rule_id} className="text-muted-foreground">
                      🛡 {r.field_path} ·{" "}
                      {r.constraint.locked ? `locked = ${r.constraint.default}` : `min ${r.constraint.min} / max ${r.constraint.max}`}
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
              <p className="text-xs text-muted-foreground">Quote template ใช้ body เดียว · A4 canvas ไม่มี cover/CI ตามสเปก v2.1</p>
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
        </div>
      </div>
    </div>
  );
}
