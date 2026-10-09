import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServicing } from "@/lib/ps-servicing";
import { SERVICE_LABEL, canEditTemplates, templateStats, useWs2, type TemplateDef, type Ws2Service } from "@/lib/ws2-store";

/** PM + Admin only. Publishing creates a new version for new forms; existing forms keep their frozen version. */
export function Ws2TemplateEditor() {
  const s = useServicing();
  const w = useWs2();
  const [service, setService] = useState<Ws2Service>("ORM");
  const [draft, setDraft] = useState<TemplateDef | null>(null);
  const [newField, setNewField] = useState<Record<string, string>>({});
  if (!canEditTemplates(s.role)) return null;
  const latest = w.latestTemplate(service);
  const def = draft ?? latest.def;
  const edit = (fn: (d: TemplateDef) => TemplateDef) => setDraft(fn(structuredClone(def)));

  return (
    <Panel title="Form Templates (PM / Admin)" subtitle="แก้แล้วกด Publish · มีผลกับฟอร์มใหม่เท่านั้น · ฟอร์มเดิมคงเวอร์ชันเดิม">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(SERVICE_LABEL) as Ws2Service[]).map((sv) => <Button key={sv} size="sm" variant={sv === service ? "default" : "outline"} onClick={() => { setService(sv); setDraft(null); }}>{SERVICE_LABEL[sv]}</Button>)}
        <span className="text-xs text-muted-foreground">v{latest.version} · {templateStats(def).fields} ช่อง · ใช้อยู่ {w.forms.filter((f) => f.service === service).length} ฟอร์ม</span>
      </div>
      <ol className="mt-3 space-y-2 text-sm">
        {def.sections.map((sec, si) => (
          <li key={sec.id}>
            <details>
              <summary className="cursor-pointer">{si + 1}. {sec.title}</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {sec.fields.map((f, fi) => f.field_type === "note" || f.field_type === "heading" ? null : (
                  <li key={f.id}><Input aria-label={`Field label ${f.id}`} className="h-8 text-xs" value={f.label} onChange={(e) => edit((d) => { d.sections[si]!.fields[fi]!.label = e.target.value; return d; })} /></li>
                ))}
                <li className="flex gap-2 pt-1">
                  <Input className="h-8 text-xs" placeholder="ช่องใหม่…" value={newField[sec.id] ?? ""} onChange={(e) => setNewField((n) => ({ ...n, [sec.id]: e.target.value }))} />
                  <Button size="sm" variant="outline" className="h-8" disabled={!newField[sec.id]?.trim()} onClick={() => { edit((d) => { d.sections[si]!.fields.push({ id: `${sec.id}.x${Date.now()}`, label: newField[sec.id]!.trim(), field_type: "text", layer: "L2", restricted_category: null, repeat_group: sec.repeat_group }); return d; }); setNewField((n) => ({ ...n, [sec.id]: "" })); }}>เพิ่ม</Button>
                </li>
              </ul>
            </details>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={!draft} onClick={() => { const v = w.publishTemplate(service, def, s.role); setDraft(null); toast.success(`Publish v${v} แล้ว · ใช้กับฟอร์มใหม่`); }}>Publish</Button>
        {draft && <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>ยกเลิกการแก้ไข</Button>}
      </div>
    </Panel>
  );
}
