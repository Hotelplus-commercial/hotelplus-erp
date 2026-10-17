import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isInputField, requiredChanges } from '@/lib/pi-form-rules';
import { useServicing } from "@/lib/ps-servicing";
import { SERVICE_LABEL, canEditTemplates, templateStats, useWs2, type TemplateDef, type Ws2Service } from "@/lib/ws2-store";

/** PM + Admin only. Publishing creates a new version for new forms; existing forms keep their frozen version. */
export function Ws2TemplateEditor({ service = "ORM" }: { service?: Ws2Service }) {
  const s = useServicing();
  const w = useWs2();
  const [draft, setDraft] = useState<TemplateDef | null>(null);
  const can = canEditTemplates(s.role);
  const latest = w.latestTemplate(service);
  const def = draft ?? latest.def;
  const edit = (fn: (d: TemplateDef) => TemplateDef) => setDraft(fn(structuredClone(def)));
  const changes = requiredChanges(latest.def, def);
  const required = def.sections.flatMap(sec => sec.fields).filter(f => isInputField(f) && f.required).length;

  return (
    <Panel title={`Property Information Form · ${SERVICE_LABEL[service]}`} subtitle={`v${latest.version} · ${required} / ${templateStats(def).fields} จำเป็น`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{new Date(latest.published_at).toLocaleString('th-TH')} · {latest.published_by} · ใช้อยู่ {w.forms.filter((f) => f.service === service).length} ฟอร์ม</span>
      </div>
      {changes.length > 0 && <p role="status" className="mt-3 rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">มีการเปลี่ยนแปลงที่ยังไม่ Publish · {changes.length} ช่อง</p>}
      <ol className="mt-3 space-y-2 text-sm">
        {def.sections.map((sec, si) => (
          <li key={sec.id}>
            <details>
              <summary className="cursor-pointer">{si + 1}. {sec.title} · {sec.fields.filter(f => isInputField(f) && f.required).length} / {sec.fields.filter(isInputField).length} จำเป็น</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {sec.fields.map((f, fi) => f.field_type === "note" || f.field_type === "heading" ? null : (
                  <li key={f.id} className="flex items-center justify-between gap-3 border-b py-2"><span className="min-w-0 break-words">{f.label}<span className="block text-xs text-muted-foreground">{f.field_type}</span></span><span className="flex shrink-0 items-center gap-2"><span className="text-xs text-muted-foreground">{f.required ? 'จำเป็น' : 'ไม่จำเป็น'}</span><Switch aria-label={`จำเป็น: ${f.label}`} checked={f.required === true} disabled={!can} onCheckedChange={checked => edit(d => { const field = d.sections[si]?.fields[fi]; if (field) field.required = checked; return d; })} /></span></li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>
      {can && <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={!changes.length} onClick={() => { const v = w.publishTemplate(service, def, s.role); setDraft(null); toast.success(`Publish v${v} แล้ว · ใช้กับฟอร์มใหม่`); }}>Publish</Button>
        {draft && <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>ยกเลิกการแก้ไข</Button>}
      </div>}
    </Panel>
  );
}
