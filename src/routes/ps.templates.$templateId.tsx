/* PS App v3.0 · Template editor with flat contract templates. */
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Lock, PenLine, Save, Shield } from "lucide-react";
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { QuoteNodeCanvas, QuoteNodePanel } from "@/components/ps/quote-node-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { A4Canvas, SIGNATURE_MARKER, renderBody } from "@/lib/contract-renderer";
import {
  AUTO_FIELDS,
  COMPUTED_FIELDS,
  GUARDRAIL_RULES,
  contractSkuSpec,
  fieldGroupLabel,
  lockMeta,
  parsePlaceholders,
  subTypeMeta,
  templateSku,
  unknownPlaceholders,
  usePsTemplates,
  type AutoField,
  type TemplateSection,
} from "@/lib/ps-templates";
import { parseQuoteNodes, serializeQuoteNodes, type QuoteNode } from "@/lib/quote-nodes";
import { quoteLineItemsFor, sampleDataFor, serviceLineOf, type PreviewCustomerType } from "@/lib/template-preview-sample-data";

export const Route = createFileRoute("/ps/templates/$templateId")({
  head: () => ({
    meta: [
      { title: "Template editor · A4 canvas | PS App" },
      { name: "description", content: "แก้ไข quote templates และ contract templates แบบ flat ต่อ SKU บนกระดาษ A4" },
      { property: "og:title", content: "Template editor · A4 canvas | PS App" },
      { property: "og:description", content: "แก้ไขเทมเพลตบนกระดาษ A4 พร้อม Cover Page, CI header/footer และ signature block" },
    ],
  }),
  component: TemplateEditor,
});

const ADDRESS_BREAKDOWN_FIELDS = new Set([
  "hotel.address_number",
  "hotel.street",
  "hotel.subdistrict",
  "hotel.district",
  "hotel.province",
  "hotel.postal_code",
]);

function FieldLibrary({ fields, onInsert, serviceLine }: { fields: AutoField[]; onInsert: (token: string) => void; serviceLine: "ORM" | "MARCOM" | null }) {
  const [q, setQ] = useState("");
  const list = fields
    .filter((f) => !ADDRESS_BREAKDOWN_FIELDS.has(f.field_path))
    .filter((f) => `${f.field_path} ${f.source}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(list.map((f) => f.group))];

  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา field…" className="mb-3 h-9" />
      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{fieldGroupLabel[g] ?? g}</p>
            <div className="space-y-1">
              {list
                .filter((f) => f.group === g)
                .map((f) => {
                  const sub = subTypeMeta[f.sub_type ?? "2a"];
                  const mismatch = f.applies_to_service_line && f.applies_to_service_line !== "ALL" && serviceLine ? f.applies_to_service_line !== serviceLine : false;
                  return (
                    <div key={f.field_path} className={`rounded-lg border p-2 ${mismatch ? "opacity-40" : ""}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={mismatch}
                        onClick={() => onInsert(`{{${f.field_path}}}`)}
                        className="h-auto w-full justify-start gap-1.5 px-1 py-0.5 text-left font-mono text-[11px]"
                      >
                        <span aria-hidden>{sub.icon}</span>
                        <span>{`{{${f.field_path}}}`}</span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground">{f.source}</p>
                      {f.supported_filters.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {f.supported_filters.map((flt) => (
                            <Button
                              key={flt}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={mismatch}
                              onClick={() => onInsert(`{{${f.field_path} | ${flt}}}`)}
                              className="h-6 px-1.5 font-mono text-[10px]"
                            >
                              | {flt}
                            </Button>
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

function SectionOnPaper({
  templateId,
  section,
  selected,
  onSelect,
  cursorRef,
  data,
  raw,
}: {
  templateId: string;
  section: TemplateSection;
  selected: boolean;
  onSelect: () => void;
  cursorRef: MutableRefObject<HTMLTextAreaElement | null>;
  data: Record<string, string>;
  raw: boolean;
}) {
  const { isLegalAdmin, saveSection } = usePsTemplates();
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const meta = lockMeta[section.lock_mode];
  const readOnly = !isLegalAdmin;
  const text = draft ?? section.content;

  return (
    <div onClick={onSelect} className={`a4-block rounded-md ${selected ? "outline outline-2 outline-[color:var(--bg-chip-border)]/40" : ""}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[8pt] text-muted-foreground">
        <span aria-hidden>{meta.icon}</span>
        <span className="font-semibold text-foreground">{section.title}</span>
        <span>· {meta.label}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[8pt]" onClick={() => setEditing((e) => !e)}>
            {editing ? "ดูผลลัพธ์" : "แก้ไข"}
          </Button>
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
                <Lock className="size-3" /> Contract template แก้ได้เฉพาะ System Admin
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
        <div dangerouslySetInnerHTML={{ __html: renderBody(text, data, { raw, pills: true }) }} />
      )}
    </div>
  );
}

function TemplateEditor() {
  const { templateId } = useParams({ from: "/ps/templates/$templateId" });
  const { templates, hydrated, activeVersion, draftVersion, saveDraft, activateDraft, isLegalAdmin, setLegalAdmin } = usePsTemplates();
  const tpl = templates.find((t) => t.template_id === templateId);

  const active = tpl ? activeVersion(tpl) : undefined;
  const draft = tpl ? draftVersion(tpl) : undefined;
  const baseBody = draft?.body ?? active?.body ?? "";

  const [body, setBody] = useState<string | null>(null);
  const [changelog, setChangelog] = useState(draft?.changelog ?? "");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [panel, setPanel] = useState<"fields" | "sigs">("fields");
  const [customerType, setCustomerType] = useState<PreviewCustomerType>("juristic");
  const [showCover, setShowCover] = useState(true);
  const [showCI, setShowCI] = useState(true);
  const [raw, setRaw] = useState(false);
  const [quoteNodes, setQuoteNodes] = useState<QuoteNode[]>(() => parseQuoteNodes(draft?.body ?? active?.body ?? ""));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const sectionRef = useRef<HTMLTextAreaElement | null>(null);

  const text = body ?? baseBody;
  const used = useMemo(() => parsePlaceholders(text), [text]);
  const unknown = useMemo(() => unknownPlaceholders(text), [text]);

  if (!tpl) {
    return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{hydrated ? `ไม่พบเทมเพลต ${templateId}` : "กำลังโหลด…"}</p>;
  }

  const isContract = tpl.template_type === "contract";
  const hasSections = tpl.sections.length > 0;
  const activeSku = templateSku(tpl) ?? "ORM-MTH-FULL-SMART";
  const spec = contractSkuSpec(activeSku);
  const line = tpl.service_line ?? serviceLineOf(activeSku);
  const data = sampleDataFor({ sku: activeSku, customerType, serviceLine: line });
  const fields = AUTO_FIELDS.filter((f) => f.available_in.includes(tpl.template_type));
  const sel = tpl.sections.find((s) => s.id === selectedSection) ?? tpl.sections[0];

  const numberingIssue = (() => {
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
            Templates · {isContract ? "Contract" : "Quote"} · {tpl.template_id} · {(draft ?? active)?.version_label} {draft ? "draft" : "active"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Chip tone="success">{active?.version_label} active</Chip>
            {draft && <Chip tone="warn">{draft.version_label} draft</Chip>}
            {tpl.superseded && <Chip tone="danger">rollback only</Chip>}
            {isLegalAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Shield className="size-3" /> System Admin
              </span>
            )}
            {isContract && <Chip tone="info">Applies to: {activeSku}</Chip>}
            {spec && <Chip tone="muted">{spec.tier} · {spec.channel}</Chip>}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{tpl.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={isLegalAdmin ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setLegalAdmin(!isLegalAdmin)}>
            <Shield className="size-4" /> {isLegalAdmin ? "ออกจากโหมด System Admin" : "สลับเป็น System Admin"}
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/ps/templates/preview/$templateId" params={{ templateId: tpl.template_id }} search={{ sku: activeSku, customer_type: customerType, show_cover: showCover, package_skus: [] }} target="_blank">
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

      {isContract && !isLegalAdmin && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
          <p>Contract templates เป็น read-only สำหรับ PS user · ต้องสลับเป็น System Admin ก่อนแก้เนื้อหา</p>
        </div>
      )}

      {numberingIssue && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
          <p>
            ⚠️ ตรวจพบการข้ามหมายเลขข้อ · แก้ไขให้เรียงต่อเนื่อง <span className="font-mono text-xs">ข้อ {numberingIssue.join(", ")}</span>
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
        <Panel title="Preview controls" subtitle="มีผลกับการแสดงผลเท่านั้น">
          <div className="space-y-3 text-xs">
            {isContract ? (
              <>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-[11px] text-muted-foreground">SKU</p>
                  <code className="font-mono text-[11px]">{activeSku}</code>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">ประเภทลูกค้า</span>
                  <div className="mt-1 flex gap-1">
                    {(["juristic", "individual"] as const).map((t) => (
                      <Button key={t} size="sm" variant={customerType === t ? "default" : "outline"} className="h-7 flex-1 px-2 text-[11px]" onClick={() => setCustomerType(t)}>
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
              <p className="rounded-lg bg-surface p-2 text-[11px] text-muted-foreground">Quote layout · ไม่มี cover page และ CI bar · Service line: {tpl.service_line ?? "ALL"}</p>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} /> Show raw placeholders
            </label>
          </div>
        </Panel>

        <div className="space-y-3">
          <A4Canvas showCover={isContract && showCover} showCIHeaderFooter={isContract && showCI} serviceLine={line} contractCode={data["contract.code"] ?? "—"} hotelName={data["hotel.name"] ?? "—"}>
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
                />
              ))
            ) : (
              <QuoteNodeCanvas
                nodes={quoteNodes}
                selectedId={selectedNode}
                onSelect={setSelectedNode}
                onChange={(next) => {
                  setQuoteNodes(next);
                  setBody(serializeQuoteNodes(next));
                }}
                data={data}
                lineItems={quoteLineItemsFor(tpl.service_line ?? line)}
                raw={raw}
              />
            )}
          </A4Canvas>

          {!hasSections && (
            <Panel title="Changelog ของ draft" subtitle={`${used.length} auto-fields ใช้อยู่`}>
              <Input value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="เช่น เพิ่มข้อกำหนดคอมมิชชั่น" className="h-9" />
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          {!hasSections && (
            <Panel title="Quote nodes" subtitle="เพิ่ม · ย้าย · ลบ · ตั้งค่า node">
              <QuoteNodePanel
                nodes={quoteNodes}
                selectedId={selectedNode}
                onSelect={setSelectedNode}
                onChange={(next) => {
                  setQuoteNodes(next);
                  setBody(serializeQuoteNodes(next));
                }}
              />
            </Panel>
          )}

          {hasSections && (
            <Panel title="Insert" subtitle="คลิกเพื่อวางที่ตำแหน่ง cursor">
              <div className="mb-3 flex gap-1">
                {([ ["fields", "🔧 Auto"], ["sigs", "📝 Sigs"] ] as const).map(([k, label]) => (
                  <Button key={k} size="sm" variant={panel === k ? "default" : "outline"} className="h-7 flex-1 px-1 text-[11px]" onClick={() => setPanel(k)}>
                    {label}
                  </Button>
                ))}
              </div>

              {panel === "fields" && <FieldLibrary fields={fields} onInsert={insert} serviceLine={tpl.service_line} />}

              {panel === "sigs" && (
                <div className="space-y-2 text-[11px]">
                  <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => insert(SIGNATURE_MARKER)}>
                    <PenLine className="size-4" /> วาง Signature block
                  </Button>
                  <p className="text-muted-foreground">
                    2 คอลัมน์ · ป้าย “เจ้าของโครงการ / ฝ่ายบริหารจัดการ” ล็อกไว้แก้ไม่ได้ · ชื่อผู้ลงนามดึงจาก <code className="font-mono">customer.signer_name</code> และ <code className="font-mono">hotelplus.authorized_signatory</code>
                  </p>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Inspector" subtitle={(hasSections ? sel?.title : "Quote template") ?? "—"}>
            {hasSections && sel ? (
              <div className="space-y-2 text-xs">
                <p>
                  Lock mode: <span className="font-medium">{lockMeta[sel.lock_mode].icon} {lockMeta[sel.lock_mode].label}</span>
                </p>
                <p>Fields ใน section: {parsePlaceholders(sel.content).length}</p>
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Guardrail ที่เกี่ยวข้อง</p>
                  {GUARDRAIL_RULES.filter((r) => sel.content.includes(r.field_path)).map((r) => (
                    <p key={r.rule_id} className="text-muted-foreground">🛡 {r.field_path} · {r.constraint.locked ? `locked = ${r.constraint.default}` : `min ${r.constraint.min} / max ${r.constraint.max}`}</p>
                  ))}
                </div>
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Computed field ที่ใช้</p>
                  {COMPUTED_FIELDS.filter((c) => sel.content.includes(c.field_path)).map((c) => (
                    <p key={c.field_path} className="text-muted-foreground">⚙ {c.field_path} · {c.formula_type} · {c.computed_when}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Quote template ประกอบจาก {quoteNodes.length} node · ไม่มีช่อง HTML source</p>
                <p>node atomic แก้ข้อความภายในไม่ได้ · ตั้งค่าได้เฉพาะ props ของ QuotePricingTable</p>
              </div>
            )}
          </Panel>

          <Panel title="Version history">
            <ul className="space-y-2">
              {tpl.versions.map((v) => (
                <li key={v.version_id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-[11px] last:border-0">
                  <Chip tone={v.status === "active" ? "success" : v.status === "draft" ? "warn" : "muted"}>{v.version_label} · {v.status}</Chip>
                  <span className="text-muted-foreground">{v.changelog ?? "—"}</span>
                  <span className="ml-auto text-muted-foreground">{v.activated_at ? `activated ${fmtDate(v.activated_at)}` : `created ${fmtDate(v.created_at)}`}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
