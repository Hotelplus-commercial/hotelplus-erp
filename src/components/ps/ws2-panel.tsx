import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServicing, type OnboardingCard } from "@/lib/ps-servicing";
import { SERVICE_LABEL, STATUS_LABEL, serviceForVariant, templateStats, useWs2, type ProfileStatus } from "@/lib/ws2-store";

const toCardStatus = (st: ProfileStatus) => (st === "submitted" ? "complete" : st === "not_sent" ? "not_started" : "in_progress") as const;

export function useWs2Status(card: Pick<OnboardingCard, "property_id" | "service_variant">): ProfileStatus {
  const w = useWs2();
  return w.profiles.find((p) => p.property_id === card.property_id && p.service === serviceForVariant(card.service_variant))?.form_completion_status ?? "not_sent";
}

export function Ws2StatusChip({ card }: { card: Pick<OnboardingCard, "property_id" | "service_variant"> }) {
  const st = useWs2Status(card);
  return <Chip tone={st === "submitted" ? "success" : st === "not_sent" ? "muted" : "info"}>Form · {STATUS_LABEL[st]}</Chip>;
}

/** WS-2 panel inside the shared drawer. Guidance only — never gates any stage. */
export function Ws2Panel({ card, readOnly }: { card: OnboardingCard; readOnly: boolean }) {
  const s = useServicing();
  const w = useWs2();
  const service = serviceForVariant(card.service_variant);
  const form = w.forms.find((f) => f.property_id === card.property_id && f.service === service);
  const profile = w.profiles.find((p) => p.property_id === card.property_id && p.service === service);
  const folders = w.folders.filter((f) => f.property_id === card.property_id && f.service === service);
  const property = w.properties.find((p) => p.hotel_id === card.property_id);
  const otherProfiles = w.profiles.filter((p) => p.property_id === card.property_id && p.service !== service);
  const tpl = form ? w.templateFor(form) : w.latestTemplate(service);
  const stats = tpl ? templateStats(tpl.def) : null;
  const [email, setEmail] = useState("");
  const [showFields, setShowFields] = useState(false);
  const canGenerate = !readOnly && (s.role === "ae" || s.test_mode);

  const generate = () => {
    const r = w.generateForm({ hotel_id: card.property_id, hotel_name: card.property_name, variant: card.service_variant, customer_email: email }, card.assigned_ae_id || "AE");
    if (!r.ok) return toast.info(r.error);
    s.setFormStatus(card.id, toCardStatus("sent"));
    toast.success("สร้างฟอร์มแล้ว · แนบลิงก์ Image Portal ให้การ์ด");
  };

  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Property Information Form">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Property Information Form (WS-2)</h3>
        <Ws2StatusChip card={card} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Hotel ID</dt><dd className="font-mono">{card.property_id}</dd>
        <dt className="text-muted-foreground">Hotel</dt><dd>{property?.hotel_name_th ?? card.property_name}</dd>
        <dt className="text-muted-foreground">Service</dt><dd>{SERVICE_LABEL[service]}</dd>
        {stats && <><dt className="text-muted-foreground">Template</dt><dd>{tpl!.def.name} · v{tpl!.version} · {stats.sections} ส่วน · {stats.fields} ช่อง{stats.restricted ? ` · 🔒 ${stats.restricted}` : ""}</dd></>}
      </dl>

      {!form ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">AE ใส่อีเมลลูกค้าแล้วกด Generate · ระบบประทับ Hotel ID / ชื่อโรงแรม / บริการ และสร้างโฟลเดอร์รูปให้อัตโนมัติ</p>
          <div className="flex flex-wrap gap-2">
            <Input type="email" aria-label="Customer email" className="h-9 min-w-0 flex-1 text-sm" placeholder="customer@hotel.com" value={email} disabled={!canGenerate} onChange={(e) => setEmail(e.target.value)} />
            <Button size="sm" className="h-9" disabled={!canGenerate} onClick={generate}>Generate Form</Button>
          </div>
          {!canGenerate && !readOnly && <p className="text-[11px] text-muted-foreground">เฉพาะ AE กด Generate ได้</p>}
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <p>ส่งถึง <span className="font-medium">{form.customer_email}</span> · {new Date(form.sent_at ?? form.generated_at).toLocaleString("th-TH")} · โดย {form.generated_by}</p>
          <p className="text-muted-foreground">Template ล็อกไว้ที่ v{form.template_version} · Form token <span className="font-mono">{form.form_token.slice(0, 8)}…</span> · หน้าให้ลูกค้ากรอกจะมาใน Phase 2</p>
        </div>
      )}

      {profile?.photo_repo_url && (
        <div className="space-y-1 text-xs">
          <p className="font-medium">Image Portal</p>
          <p className="break-all font-mono text-muted-foreground">{profile.photo_repo_url}</p>
          <ul className="space-y-0.5">{folders.map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{f.path.replace(profile.photo_repo_url!, "")} · {f.label}</span><span className="text-muted-foreground">{f.photo_count} รูป</span></li>)}</ul>
          <p className="text-[11px] text-muted-foreground">นับจำนวนรูปต่อโฟลเดอร์เท่านั้น · ไม่บังคับขั้นต่ำ{service === "MARCOM_GMB" ? " (อ้างอิง ≥10 รูป)" : service === "ORM" ? " (อ้างอิง ~15 รูปทั่วไป + รายห้อง)" : ""}</p>
        </div>
      )}

      {otherProfiles.length > 0 && <p className="text-[11px] text-muted-foreground">โรงแรมนี้มีโปรไฟล์บริการอื่นด้วย: {otherProfiles.map((p) => `${SERVICE_LABEL[p.service]} (${STATUS_LABEL[p.form_completion_status]})`).join(", ")} · ใช้ข้อมูลชื่อ/ที่อยู่/โทรศัพท์ชุดเดียวกัน</p>}

      {tpl && (
        <div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowFields((v) => !v)}>{showFields ? "ซ่อนโครงสร้างฟอร์ม" : "ดูโครงสร้างฟอร์ม"}</Button>
          {showFields && (
            <ol className="mt-1 space-y-1.5 text-xs">
              {tpl.def.sections.map((sec, i) => {
                const inputs = sec.fields.filter((f) => f.field_type !== "heading" && f.field_type !== "note");
                return (
                  <li key={sec.id}>
                    <details>
                      <summary className="cursor-pointer">{i + 1}. {sec.title} · {inputs.length} ช่อง{sec.repeat_group ? " · เพิ่มได้หลายรายการ" : ""}{inputs.some((f) => f.layer === "L3") ? " · 🔒" : ""}</summary>
                      <ul className="mt-1 space-y-0.5 pl-4 text-muted-foreground">
                        {inputs.map((f) => <li key={f.id}>{f.label} <span className="text-[10px]">({f.field_type}{f.layer !== "L2" ? ` · ${f.layer}` : ""}{f.restricted_category ? ` · ${f.restricted_category}` : ""})</span></li>)}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">สถานะฟอร์มเป็นข้อมูลแนะนำเท่านั้น · ไม่ล็อกปุ่มขั้นตอนใด</p>
    </section>
  );
}
