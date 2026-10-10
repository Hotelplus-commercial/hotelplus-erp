import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServicing } from "@/lib/ps-servicing";
import { IDENTITY_FIELDS, MARCOM_VIEWERS, SERVICE_LABEL, STATUS_LABEL, canSeeRestricted, serviceForVariant, useWs2, type Ws2Service } from "@/lib/ws2-store";

export const Route = createFileRoute("/ps/property-content/$hotelId")({
  validateSearch: (s: Record<string, unknown>) => ({
    card: typeof s.card === "string" ? s.card : undefined,
    viewer: typeof s.viewer === "string" ? s.viewer : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Property Info (ทีม) — Property Content | Meridia Hotel ERP" },
      { name: "description", content: "ข้อมูลฟอร์มและคลังรูปของโรงแรมสำหรับทีมงาน ดูและแก้ไขได้ตามสิทธิ์" },
      { property: "og:title", content: "Property Info (ทีม) — Property Content" },
      { property: "og:description", content: "ข้อมูลโรงแรมรายบริการและคลังรูป" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PropertyInfoInternal,
});

const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));

function PropertyInfoInternal() {
  const { hotelId } = Route.useParams();
  const { card: cardParam, viewer } = Route.useSearch();
  const w = useWs2();
  const s = useServicing();
  const property = w.properties.find((p) => p.hotel_id === hotelId);
  const profiles = w.profiles.filter((p) => p.property_id === hotelId);
  const [tab, setTab] = useState<Ws2Service | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showL3, setShowL3] = useState(false);
  if (!property) return <p className="py-16 text-center text-sm text-muted-foreground">ไม่พบโรงแรมนี้</p>;
  const service = tab ?? profiles[0]?.service ?? null;
  const profile = profiles.find((p) => p.service === service);
  const user = viewer ?? s.role;
  const isMarcom = (viewer ? MARCOM_VIEWERS.has(viewer) : false) || (s.role === "service" && service !== "ORM");
  const mayL3 = !!service && canSeeRestricted(s.role, service) && !isMarcom;
  const form = w.forms.find((f) => f.property_id === hotelId && f.service === service);
  const tpl = service ? (form ? w.templateFor(form) : w.latestTemplate(service)) : undefined;
  const cardId = cardParam ?? form?.card_id ?? s.cards.find((c) => c.property_id === hotelId && serviceForVariant(c.service_variant) === service)?.id;
  const folders = w.folders.filter((f) => f.property_id === hotelId && f.service === service);
  const images = (w.images ?? []).filter((i) => i.property_id === hotelId && i.service === service);
  const restricted = w.restricted.filter((r) => r.property_id === hotelId && r.service === service);
  const canPhotos = !isMarcom;

  const valueOf = (secId: string, f: { label: string; layer: string; identity_key?: string }) =>
    f.layer === "L1" && f.identity_key ? (property as Record<string, unknown>)[f.identity_key] : profile?.profile_data[`${secId}.${f.label}`];
  const save = () => {
    if (!service) return;
    const l1: Record<string, string> = {}; const l2: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (k.startsWith("L1:")) { const key = k.slice(3); if ((IDENTITY_FIELDS as readonly string[]).includes(key)) l1[key] = v; }
      else l2[k] = v;
    }
    if (Object.keys(l1).length) w.updateProperty(hotelId, l1, user, "Property Content");
    if (Object.keys(l2).length) w.updateProfileData(hotelId, service, l2, user);
    setEditing(false); setDraft({});
    toast.success("บันทึกแล้ว · บันทึกประวัติการแก้ไขเรียบร้อย");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="PS App · Property Content · Property Info (ทีม)" title={property.hotel_name_th}
        description={`Hotel ID: ${property.hotel_id} · Start year: ${property.start_year ?? "—"} · Owner AE: ${property.owner_ae ?? "—"}`}
        actions={<div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/ps/property-content">← Property Content</Link></Button>
          {cardId && <Button asChild variant="outline" size="sm"><Link to="/ps/onboarding-process" hash={`servicing-card-${cardId}`}>↩ Back to card</Link></Button>}
        </div>} />
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => (
          <Button key={p.service} size="sm" variant={p.service === service ? "default" : "outline"} onClick={() => { setTab(p.service); setEditing(false); setShowL3(false); }}>
            {SERVICE_LABEL[p.service]} · {STATUS_LABEL[p.form_completion_status]}{p.assigned_to ? ` · ${p.assigned_to}` : ""}
          </Button>
        ))}
        {!profiles.length && <p className="text-sm text-muted-foreground">ยังไม่มีโปรไฟล์บริการ</p>}
      </div>

      {service && tpl && (
        <section className="space-y-3 rounded-lg border p-4" aria-label="Form data">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Form data · {SERVICE_LABEL[service]} · {tpl.def.sections.length} ส่วน · v{tpl.version}</h2>
            {editing ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft({}); }}>ยกเลิก</Button><Button size="sm" onClick={save}>บันทึก</Button></div>
              : <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          </div>
          {tpl.def.sections.map((sec, i) => {
            const fields = sec.fields.filter((f) => f.field_type !== "heading" && f.field_type !== "note" && f.field_type !== "file" && f.layer !== "L3");
            const repeatKeys = sec.repeat_group ? Object.keys(profile?.profile_data ?? {}).filter((k) => k.startsWith(`${sec.id}[`)) : [];
            const filled = sec.repeat_group ? repeatKeys.length : fields.filter((f) => !empty(valueOf(sec.id, f))).length;
            return (
              <details key={sec.id} className="rounded-md border p-2 text-sm">
                <summary className="cursor-pointer">{i + 1}. {sec.title} · {filled}{sec.repeat_group ? " ค่า (หลายรายการ)" : `/${fields.length} ช่อง`}</summary>
                {sec.repeat_group ? (
                  <ul className="mt-2 space-y-0.5 text-xs">{repeatKeys.map((k) => <li key={k}><span className="text-muted-foreground">{k.replace(`${sec.id}`, "")}</span>: {show(profile!.profile_data[k])}</li>)}{!repeatKeys.length && <li className="text-muted-foreground">ยังไม่มีข้อมูล</li>}</ul>
                ) : (
                  <dl className="mt-2 grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[minmax(10rem,auto)_1fr]">
                    {fields.map((f) => {
                      const key = f.layer === "L1" && f.identity_key ? `L1:${f.identity_key}` : `${sec.id}.${f.label}`;
                      const v = valueOf(sec.id, f);
                      return [
                        <dt key={`t${f.id}`} className="text-muted-foreground">{f.label}{f.layer === "L1" ? " · L1" : ""}</dt>,
                        <dd key={`d${f.id}`}>{editing && f.field_type !== "multiselect" ? <Input className="h-7 text-xs" defaultValue={empty(v) ? "" : show(v)} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} /> : empty(v) ? "—" : show(v)}</dd>,
                      ];
                    })}
                  </dl>
                )}
              </details>
            );
          })}
          {mayL3 ? (
            <div className="space-y-1 rounded-md border p-2 text-xs">
              <p className="font-medium">🔒 Restricted (credentials / financial / national-ID) · {restricted.length} รายการ</p>
              {!showL3 ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { w.logRestrictedView(hotelId, service, user, "Property Content"); setShowL3(true); }}>แสดงข้อมูล (บันทึกการเข้าดู)</Button>
                : <ul className="space-y-1">{restricted.map((r) => <li key={r.id} className="rounded border p-1.5"><span className="font-medium">{r.category}</span> · {Object.entries(r.data).filter(([k]) => k !== "_entry").map(([k, v]) => `${k.split(" (")[0]}: ${String(v)}`).join(" · ")}</li>)}{!restricted.length && <li className="text-muted-foreground">ยังไม่มีข้อมูล</li>}</ul>}
            </div>
          ) : null}
        </section>
      )}

      {service && (
        <section className="space-y-3 rounded-lg border p-4" aria-label="Photo library">
          <h2 className="font-semibold">Photo library · {SERVICE_LABEL[service]}</h2>
          <p className="text-xs text-muted-foreground">{folders.map((f) => `${f.path.split("/").slice(-2).join("/")} (${images.filter((i) => i.folder_id === f.id).length})`).join(" · ") || "ยังไม่มีโฟลเดอร์"}</p>
          {folders.map((f) => {
            const rows = images.filter((i) => i.folder_id === f.id);
            return (
              <div key={f.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{f.label} <span className="font-mono text-xs text-muted-foreground">{f.path.split("/").slice(-2).join("/")}</span> · {rows.length} รูป</span>
                  {canPhotos && <label className="cursor-pointer rounded-md border px-2 py-1 text-xs">Upload<input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => { w.addPhotos(f.id, e.target.files?.length ?? 0, user); e.target.value = ""; }} /></label>}
                </div>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {rows.map((r) => <li key={r.id} className="space-y-1"><div className="flex aspect-square items-center justify-center rounded-md border bg-muted text-lg text-muted-foreground">🖼</div><p className="truncate text-[10px] text-muted-foreground">{r.file_url.split("/").pop()}</p></li>)}
                </ul>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">ต้นแบบ: รูปเป็นตัวอย่าง ยังไม่ได้เก็บไฟล์จริง · นับจำนวนเท่านั้น ไม่บังคับขั้นต่ำ{!canPhotos ? " · ทีม Marcom แก้ได้เฉพาะข้อมูล L1/L2" : ""}</p>
        </section>
      )}
      {profile && <div><Chip tone="muted">Form · {STATUS_LABEL[profile.form_completion_status]}</Chip> <span className="text-[11px] text-muted-foreground">ข้อมูลแนะนำ · ไม่ล็อกขั้นตอนใด</span></div>}
    </div>
  );
}
