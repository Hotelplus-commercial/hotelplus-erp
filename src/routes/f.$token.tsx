import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useServicing } from "@/lib/ps-servicing";
import { SERVICE_LABEL, useWs2, type Answers, type TemplateField } from "@/lib/ws2-store";
import { fieldTarget, missingRequired, photoEvidence } from '@/lib/pi-form-rules';
import { cn } from '@/lib/utils';

export const Route = createFileRoute("/f/$token")({
  head: () => ({
    meta: [
      { title: "Property Information Form | Meridia Hotel ERP" },
      { name: "description", content: "Property Information Form สำหรับลูกค้า กรอกข้อมูลและอัปโหลดรูปภาพ" },
      { property: "og:title", content: "Property Information Form" },
      { property: "og:description", content: "Property Information Form สำหรับลูกค้า" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerForm,
});

const newRid = () => `rt-${Math.random().toString(36).slice(2, 8)}`;

function FieldInput({ f, id, value, onChange }: { f: TemplateField; id: string; value: unknown; onChange: (v: unknown) => void }) {
  const label = <label htmlFor={id} className="text-sm font-medium">{f.label}{f.required && <span className="ml-1 text-destructive">*</span>}{f.layer === "L3" && <span className="ml-1 text-xs text-muted-foreground">🔒 ข้อมูลส่วนตัว</span>}</label>;
  if (f.field_type === "heading") return <h4 className="pt-2 text-sm font-semibold">{f.label}</h4>;
  if (f.field_type === "note") return <p className="text-xs text-muted-foreground">{f.label}</p>;
  if (f.field_type === "select") return <div className="space-y-1">{label}<select id={id} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select></div>;
  if (f.field_type === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return <fieldset id={id} className="space-y-1"><legend className="text-sm font-medium">{f.label}{f.required && <span className="ml-1 text-destructive">*</span>}</legend><div className="flex flex-wrap gap-3">{(f.options ?? []).map((o) => <label key={o} className="flex items-center gap-1.5 text-sm"><Checkbox aria-label={`${f.label}: ${o}`} checked={arr.includes(o)} onCheckedChange={(c) => onChange(c ? [...arr, o] : arr.filter((x) => x !== o))} />{o}</label>)}</div></fieldset>;
  }
  if (f.field_type === "slider") return <div className="space-y-2">{label}<div className="flex items-center gap-3"><Slider id={id} aria-label={f.label} min={1} max={10} step={1} value={[Number(value ?? 5)]} onValueChange={([v]) => onChange(v)} /><span className="w-10 text-sm">{Number(value ?? 5)}/10</span></div></div>;
  if (f.field_type === "freetext") return <div className="space-y-1">{label}<Textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></div>;
  if (f.field_type === "file") return <div className="space-y-1">{label}<Input id={id} type="file" multiple onChange={e => { if (e.target.files?.length) onChange(Array.from(e.target.files).map(file => file.name)); }} />{Array.isArray(value) && value.length > 0 && <p className="text-xs text-muted-foreground">{value.length} ไฟล์ · {value.map(String).join(', ')}</p>}</div>;
  return <div className="space-y-1">{label}<Input id={id} type={f.field_type === "number" ? "number" : f.layer === "L3" && /password|รหัสผ่าน/i.test(f.label) ? "password" : "text"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></div>;
}

function CustomerForm() {
  const { token } = Route.useParams();
  const w = useWs2();
  const s = useServicing();
  const form = w.formByToken(token);
  const tpl = form ? w.templateFor(form) : undefined;
  const property = w.properties.find((p) => p.hotel_id === form?.property_id);
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const folders = useMemo(() => w.folders.filter((f) => f.property_id === form?.property_id && f.service === form?.service), [w.folders, form]);
  const missing = useMemo(() => attempted && tpl && form ? missingRequired(tpl.def, answers, () => true, photoEvidence(tpl.def, answers, folders, form.service)) : [], [attempted, tpl, answers, folders, form]);
  const jump = (target: string) => {
    const wrapper = document.getElementById(`wrap-${target}`);
    wrapper?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const input = wrapper?.querySelector<HTMLElement>('input, select, textarea, [role="checkbox"], [role="slider"]');
    input?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!form || !tpl || loaded) return;
    const init: Answers = { ...(form.answers ?? {}) };
    for (const sec of tpl.def.sections) {
      if (init[sec.id]?.length) continue;
      const entry: Record<string, unknown> = sec.repeat_group ? { _rid: newRid() } : {};
      for (const f of sec.fields) if (f.identity_key && property) entry[f.id] = (property as Record<string, unknown>)[f.identity_key] ?? "";
      init[sec.id] = [entry];
    }
    setAnswers(init);
    setLoaded(true);
  }, [form, tpl, property, loaded]);



  if (!form || !tpl) return <div className="mx-auto max-w-xl py-16 text-center text-sm text-muted-foreground">ไม่พบฟอร์มนี้ · ลิงก์อาจไม่ถูกต้อง</div>;
  const submitted = form.status === "submitted";

  const setField = (secId: string, idx: number, fid: string, v: unknown) =>
    setAnswers((a) => ({ ...a, [secId]: (a[secId] ?? [{}]).map((e, i) => (i === idx ? { ...e, [fid]: v } : e)) }));

  const save = (submit: boolean) => {
    if (submit) setAttempted(true);
    const r = w.saveAnswers(token, answers, form.customer_email, submit);
    if (!r.ok) { if (r.missing?.[0]) requestAnimationFrame(() => jump(r.missing?.[0]?.target ?? '')); toast.info(r.error); return; }
    if (submit && r.otaLogins?.length) {
      const card = s.cards.find((c) => c.property_id === form.property_id && c.service_variant === "ORM");
      if (card) s.seedCredentials(card.id, r.otaLogins);
    }
    toast.success(submit ? "ส่งข้อมูลเรียบร้อย ขอบคุณค่ะ" : "บันทึกแล้ว · กลับมากรอกต่อได้");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{SERVICE_LABEL[form.service]} · Hotel ID {form.property_id} · v{form.template_version}</p>
        <h1 className="font-display text-2xl font-semibold">{property?.hotel_name_th ?? "Property Information"}</h1>
        <p className="text-sm text-muted-foreground">{tpl.def.name} · ทีมงาน AE สามารถกรอกแทนได้</p>
        <p className="text-xs text-muted-foreground">* = ข้อมูลที่จำเป็นต้องกรอกก่อนส่ง</p>
        {submitted && <p className="rounded-md bg-muted px-3 py-2 text-sm">ส่งข้อมูลแล้วเมื่อ {form.submitted_at ? new Date(form.submitted_at).toLocaleString("th-TH") : '—'} · ฟอร์มนี้อ่านอย่างเดียว</p>}
      </header>
      {!submitted && missing.length > 0 && <section role="alert" className="rounded-md border border-destructive bg-destructive/5 p-4 text-sm"><p className="font-semibold text-destructive">ยังกรอกไม่ครบ {missing.length} ข้อ</p><ul className="mt-2 space-y-1">{missing.map(item => <li key={item.target}><a href={`#wrap-${item.target}`} className="text-destructive underline" onClick={e => { e.preventDefault(); jump(item.target); }}>{item.label}</a></li>)}</ul></section>}
      <fieldset disabled={submitted} className="m-0 min-w-0 space-y-6 border-0 p-0">
        {tpl.def.sections.map((sec, si) => (
          <section key={sec.id} className="space-y-4 rounded-lg border p-4">
            <h2 className="font-semibold">{si + 1}. {sec.title}</h2>
            {(answers[sec.id] ?? [{}]).map((entry, idx) => (
              <div key={String(entry["_rid"] ?? idx)} className={sec.repeat_group ? "space-y-3 rounded-md border border-dashed p-3" : "space-y-3"}>
                {sec.repeat_group && <div className="flex items-center justify-between text-xs text-muted-foreground"><span>รายการที่ {idx + 1}</span>{(answers[sec.id]?.length ?? 0) > 1 && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAnswers((a) => ({ ...a, [sec.id]: (a[sec.id] ?? []).filter((_, i) => i !== idx) }))}>ลบ</Button>}</div>}
                {sec.fields.map((f) => {
                  const id = fieldTarget(sec.id, idx, f.id);
                  const invalid = missing.some(item => item.target === id);
                  return <div key={f.id} id={`wrap-${id}`} className={cn('scroll-mt-24', invalid && 'rounded-md border border-destructive p-2 [&_input]:border-destructive [&_textarea]:border-destructive [&_select]:border-destructive')} aria-invalid={invalid || undefined} aria-describedby={invalid ? `error-${id}` : undefined}><FieldInput id={id} f={f} value={entry[f.id]} onChange={(v) => { setField(sec.id, idx, f.id, v); if (f.field_type === 'file' && Array.isArray(v)) { const folder = folders.find(folder => sec.repeat_group === 'room_type' ? folder.path.includes(`/${String(entry['_rid'])}/`) : folder.path.endsWith(form.service === 'MARCOM_GMB' ? '/_all/' : '/_property/')); if (folder) w.addPhotos(folder.id, v.length, form.customer_email); } }} />{invalid && <p id={`error-${id}`} className="mt-1 text-xs text-destructive">จำเป็นต้องกรอก</p>}</div>;
                })}
              </div>
            ))}
            {sec.repeat_group && <Button variant="outline" size="sm" onClick={() => setAnswers((a) => ({ ...a, [sec.id]: [...(a[sec.id] ?? []), { _rid: newRid() }] }))}>+ เพิ่มรายการ</Button>}
          </section>
        ))}
        <section className="space-y-3 rounded-lg border p-4" aria-label="Image Portal">
          <h2 className="font-semibold">Image Portal · อัปโหลดรูป</h2>
          <p className="text-xs text-muted-foreground">{form.service === "MARCOM_GMB" ? "อ้างอิง: อย่างน้อย 10 รูป" : form.service === "ORM" ? "อ้างอิง: ~15 รูปทั่วไป + รูปแต่ละประเภทห้อง · โฟลเดอร์ห้องจะเพิ่มหลังกดบันทึก" : "โฟลเดอร์ห้องจะเพิ่มหลังกดบันทึก"} · ไม่บังคับจำนวนขั้นต่ำ</p>
          <ul className="space-y-2">
            {folders.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{f.label} <span className="font-mono text-xs text-muted-foreground">{f.path.split("/").slice(-2).join("/")}</span></span>
                <span className="flex items-center gap-2"><span className="text-muted-foreground">{f.photo_count} รูป</span>
                  <label className="cursor-pointer rounded-md border px-2 py-1 text-xs">เลือกรูป<input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => { w.addPhotos(f.id, e.target.files?.length ?? 0, form.customer_email); e.target.value = ""; }} /></label>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">ต้นแบบ: บันทึกเฉพาะจำนวนรูป ยังไม่ได้เก็บไฟล์จริง</p>
        </section>
      </fieldset>
      {!submitted && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => save(false)}>บันทึกไว้ก่อน</Button><Button onClick={() => save(true)}>ส่งข้อมูล</Button></div>}
    </div>
  );
}
