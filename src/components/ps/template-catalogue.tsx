/* Template Management v1.0 Item 1 — single governance home. Edit/Publish = PM + System Admin; everyone else read-only. */
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Ws2TemplateEditor } from "@/components/ps/ws2-template-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_DISPLAY, activeEmail, canManageTemplates, useTemplateMgmt, type EmailKey } from "@/lib/email-templates";
import { AE_STAGES, STAGE_LABEL, VARIANT_LABEL, useServicing, type Role, type ServiceVariant } from "@/lib/ps-servicing";
import { SERVICE_LABEL, useWs2, type Ws2Service } from "@/lib/ws2-store";

type Section = "form" | "checklist" | "survey" | "email" | "document";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "form", label: "Form Templates" },
  { key: "checklist", label: "Checklist Templates" },
  { key: "survey", label: "Survey Templates" },
  { key: "email", label: "Email Templates" },
  { key: "document", label: "Documents (QT / Contract)" },
];
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

export function TemplateCatalogue({ onDocuments }: { onDocuments: () => void }) {
  const s = useServicing();
  const [sec, setSec] = useState<Section>("checklist");
  const can = canManageTemplates(s.role);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SECTIONS.map((x) => <Button key={x.key} size="sm" variant={sec === x.key ? "default" : "outline"} onClick={() => (x.key === "document" ? onDocuments() : setSec(x.key))}>{x.label}</Button>)}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">บทบาทจำลอง
          <select aria-label="Template role" className="h-8 rounded-md border bg-background px-2 text-xs text-foreground" value={s.role} onChange={(e) => s.setRole(e.target.value as Role)}>
            {Object.entries(ROLE_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {!can && <p className="text-xs text-muted-foreground">ดูได้อย่างเดียว · แก้ไข / Publish ได้เฉพาะ PM และ System Admin</p>}
      {sec === "form" && <FormCatalogue />}
      {sec === "checklist" && <ChecklistEditor can={can} />}
      {sec === "survey" && <SurveyCatalogue />}
      {sec === "email" && <EmailEditor can={can} />}
    </div>
  );
}

function FormCatalogue() {
  const w = useWs2();
  return (
    <Panel title="Form Templates · WS-2" subtitle="แก้ช่องข้อมูลอยู่ใน WS-2 · ฟอร์มเดิมคงเวอร์ชันตอน Generate">
      <ul className="divide-y text-sm">
        {(Object.keys(SERVICE_LABEL) as Ws2Service[]).map((sv) => { const t = w.latestTemplate(sv); return (
          <li key={sv} className="flex flex-wrap items-center gap-2 py-2"><span className="flex-1 font-medium">WS-2 · {SERVICE_LABEL[sv]}</span><Chip tone="info">Form</Chip><span className="text-xs text-muted-foreground">v{t.version}</span></li>
        ); })}
      </ul>
      <div className="mt-3"><Ws2TemplateEditor /></div>
    </Panel>
  );
}

type Row = { id: string; stage_key: string; group_label: string; item_label: string; ota_channel: string | null; isNew?: boolean; removed?: boolean; renamed?: boolean };
type Scope = { key: string; label: string; variant: ServiceVariant | null; handover: boolean };
const SCOPES: Scope[] = [
  { key: "ae-ORM", label: "AE · Collect-Data ORM", variant: "ORM", handover: false },
  { key: "ae-MT", label: "AE · Collect-Data MT", variant: "MARCOM_META_TIKTOK", handover: false },
  { key: "ae-GMB", label: "AE · Collect-Data GMB", variant: "MARCOM_GMB", handover: false },
  { key: "spec", label: "Specialist · Handover (OTA)", variant: null, handover: true },
  { key: "orm", label: "ORM · Prepare → Go Live", variant: "ORM", handover: false },
  { key: "mt", label: "Marcom · Meta/TikTok", variant: "MARCOM_META_TIKTOK", handover: false },
  { key: "gmb", label: "Marcom · GMB", variant: "MARCOM_GMB", handover: false },
];

function ChecklistEditor({ can }: { can: boolean }) {
  const s = useServicing();
  const tm = useTemplateMgmt();
  const [scopeKey, setScopeKey] = useState("ae-ORM");
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [stage, setStage] = useState("");
  const [group, setGroup] = useState("");
  const [label, setLabel] = useState("");
  const scope = SCOPES.find((x) => x.key === scopeKey)!;
  const isAe = scopeKey.startsWith("ae-");
  const live: Row[] = s.checklistTemplates
    .filter((t) => scope.handover ? t.has_two_tick : !t.has_two_tick && t.service_variant === scope.variant && AE_STAGES.has(t.stage_key) === isAe)
    .map((t) => ({ id: t.id, stage_key: t.stage_key, group_label: t.group_label ?? "", item_label: t.item_label, ota_channel: t.ota_channel }));
  const rows = draft ?? live;
  const stages = [...new Set(live.map((r) => r.stage_key))];
  const edit = (fn: (r: Row[]) => Row[]) => setDraft(fn(rows.map((r) => ({ ...r }))));
  const publish = () => {
    if (!draft) return;
    draft.forEach((r) => {
      if (r.isNew && !r.removed) scope.handover ? s.addHandoverTemplate(r.ota_channel ?? "Agoda", r.group_label, r.item_label) : s.addTemplateItem(r.stage_key, scope.variant!, r.group_label, r.item_label);
      else if (!r.isNew && r.removed) s.removeTemplateItem(r.id);
      else if (!r.isNew && r.renamed) s.renameTemplateItem(r.id, r.item_label);
    });
    const v = tm.bumpChecklist(ROLE_DISPLAY[s.role] ?? s.role);
    setDraft(null);
    toast.success(`Publish checklist v${v} · มีผลกับการ์ดใหม่เท่านั้น`);
  };
  const groups = [...new Set(rows.map((r) => `${r.stage_key}|${r.ota_channel ?? ""}`))];
  return (
    <Panel title="Checklist Templates" subtitle={`v${tm.checklist.version} · อัปเดต ${fmt(tm.checklist.published_at)} โดย ${tm.checklist.published_by} · มีผลกับการ์ดใหม่เท่านั้น`}>
      <div className="flex flex-wrap gap-1.5">{SCOPES.map((x) => <Button key={x.key} size="sm" variant={x.key === scopeKey ? "default" : "outline"} className="h-7 text-xs" onClick={() => { if (draft && !confirm("ยกเลิกการแก้ไขที่ยังไม่ Publish?")) return; setDraft(null); setScopeKey(x.key); setStage(""); }}>{x.label}</Button>)}</div>
      <div className="mt-3 space-y-3">
        {groups.map((gk) => { const [st, ota] = gk.split("|"); const list = rows.filter((r) => r.stage_key === st && (r.ota_channel ?? "") === ota && !r.removed); if (!list.length) return null; return (
          <div key={gk} className="space-y-1">
            <p className="text-xs font-semibold">{scope.handover ? ota : STAGE_LABEL[st!] ?? st}</p>
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-[11px] text-muted-foreground">{r.group_label}</span>
                {can ? <Input aria-label={`Checklist item ${r.id}`} className="h-7 text-xs" value={r.item_label} onChange={(e) => edit((d) => d.map((x) => x.id === r.id ? { ...x, item_label: e.target.value, renamed: true } : x))} /> : <span className="text-sm">{r.item_label}</span>}
                {can && <Button size="sm" variant="ghost" className="h-7" onClick={() => edit((d) => d.map((x) => x.id === r.id ? { ...x, removed: true } : x))}>ลบ</Button>}
              </div>
            ))}
          </div>
        ); })}
        {!rows.length && <p className="text-xs text-muted-foreground">ไม่มีรายการ</p>}
      </div>
      {can && <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
        <select aria-label={scope.handover ? "OTA" : "Stage"} className="h-8 rounded-md border bg-background px-2 text-xs" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">{scope.handover ? "— OTA —" : "— ขั้น —"}</option>
          {(scope.handover ? [...new Set(live.map((r) => r.ota_channel ?? ""))] : stages).map((x) => <option key={x} value={x}>{scope.handover ? x : STAGE_LABEL[x] ?? x}</option>)}
        </select>
        <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="กลุ่ม" className="h-8 w-28 text-xs" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="รายการใหม่" className="h-8 flex-1 text-xs" />
        <Button size="sm" variant="outline" className="h-8" disabled={!stage || !label.trim() || (scope.handover && !group.trim())} onClick={() => { edit((d) => [...d, { id: `new-${Date.now()}`, stage_key: scope.handover ? "handover" : stage, ota_channel: scope.handover ? stage : null, group_label: group.trim(), item_label: label.trim(), isNew: true }]); setLabel(""); }}>เพิ่ม</Button>
      </div>}
      {can && <div className="mt-3 flex gap-2"><Button size="sm" disabled={!draft} onClick={publish}>Publish</Button>{draft && <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>ยกเลิกการแก้ไข</Button>}</div>}
      {scope.variant && <p className="mt-2 text-[11px] text-muted-foreground">{VARIANT_LABEL[scope.variant]}</p>}
    </Panel>
  );
}

const SURVEYS = [
  { name: "#1 Internal (ORM → Specialist)", where: "ORM Handover · Completed" },
  { name: "#2 Customer (5 มิติ ภาษาไทย)", where: "หลังส่งอีเมลยืนยันวันเริ่มบริการ" },
  { name: "Monthly meeting — ORM", where: "AE Workspace › Zone B · Pending Survey Queue" },
  { name: "Monthly meeting — Marcom", where: "AE Workspace › Zone B · Pending Survey Queue" },
];
function SurveyCatalogue() {
  return (
    <Panel title="Survey Templates" subtitle="แคตตาล็อกแม่แบบ · ฟอร์มที่ใช้งานอยู่ไม่ถูกสร้างใหม่ · แบบประเมินที่เข้าคิวแล้วคงเวอร์ชันเดิม">
      <ul className="divide-y text-sm">{SURVEYS.map((x) => <li key={x.name} className="flex flex-wrap items-center gap-2 py-2"><span className="flex-1 font-medium">{x.name}</span><Chip tone="info">Survey</Chip><span className="text-xs text-muted-foreground">v1 · {x.where}</span></li>)}</ul>
    </Panel>
  );
}

function EmailEditor({ can }: { can: boolean }) {
  const s = useServicing();
  const tm = useTemplateMgmt();
  const [open, setOpen] = useState<EmailKey | null>(null);
  const by = ROLE_DISPLAY[s.role] ?? s.role;
  return (
    <Panel title="Email Templates" subtitle="ข้อความถูก snapshot ตอนส่ง · แก้แม่แบบมีผลกับการส่งครั้งถัดไปเท่านั้น">
      <ul className="divide-y text-sm">
        {tm.templates.map((t) => { const v = activeEmail(t); const cur = t.draft ?? { subject: v.subject, body: v.body }; return (
          <li key={t.key} className="py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 font-medium">{t.name}</span>
              <Chip tone="info">Email</Chip>
              {t.draft && <Chip tone="warn">draft</Chip>}
              <span className="text-xs text-muted-foreground">v{v.version} · {t.updated_by} · {fmt(t.updated_at)}</span>
              <Button size="sm" variant="outline" className="h-7" onClick={() => setOpen(open === t.key ? null : t.key)}>{can ? "Edit" : "View"}</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t.wiring} · ส่งแล้ว {tm.sent.filter((x) => x.email_key === t.key).length} ฉบับ</p>
            {open === t.key && <div className="mt-2 space-y-2 rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">Placeholders: {t.placeholders}</p>
              <Input aria-label="Email subject" disabled={!can} value={cur.subject} onChange={(e) => tm.saveDraft(t.key, { ...cur, subject: e.target.value }, by)} />
              <Textarea aria-label="Email body" disabled={!can} rows={10} value={cur.body} onChange={(e) => tm.saveDraft(t.key, { ...cur, body: e.target.value }, by)} />
              {can && <div className="flex gap-2"><Button size="sm" disabled={!t.draft} onClick={() => toast.success(`Publish ${t.name} v${tm.publish(t.key, by)}`)}>Publish</Button>{t.draft && <Button size="sm" variant="ghost" onClick={() => tm.discardDraft(t.key)}>ยกเลิกการแก้ไข</Button>}</div>}
            </div>}
          </li>
        ); })}
      </ul>
    </Panel>
  );
}
