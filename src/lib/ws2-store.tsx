/* WS-2 · Property Information Form — Phase 1 (data layer + config template engine + AE Generate).
 * Browser-local prototype. Property-scoped by Hotel ID; 1 property : N service profiles.
 * Never gates any Servicing stage; does not touch the pipeline engine. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import ormTpl from "@/lib/ws2/templates/orm.json";
import mtTpl from "@/lib/ws2/templates/marcom-mt.json";
import gmbTpl from "@/lib/ws2/templates/marcom-gmb.json";
import type { ServiceVariant } from "@/lib/ps-servicing";

export type Ws2Service = "ORM" | "MARCOM_MT" | "MARCOM_GMB";
export type FieldType = "text" | "number" | "select" | "multiselect" | "slider" | "file" | "freetext" | "heading" | "note";
export type Layer = "L1" | "L2" | "L3";
export type RestrictedCategory = "ota_login" | "hotel_email" | "pms" | "bank" | "national_id" | "document";
export type TemplateField = { id: string; label: string; field_type: FieldType; layer: Layer; restricted_category: RestrictedCategory | null; repeat_group: string | null; identity_key?: string; options?: string[] };
export type TemplateSection = { id: string; title: string; repeat_group: string | null; fields: TemplateField[] };
export type TemplateDef = { template_id: string; name: string; source: string; sections: TemplateSection[] };
export type TemplateVersion = { service: Ws2Service; version: number; published_at: string; published_by: string; def: TemplateDef };

export type Audit = { last_updated_at: string; last_updated_by: string; last_updated_app: string };
export type Property = { hotel_id: string; hotel_name_th: string; hotel_name_en: string; address_th: string; address_en: string; phone: string; key_contact: string } & Audit;
export type ProfileStatus = "not_sent" | "sent" | "partial" | "submitted";
export type ServiceProfile = { property_id: string; service: Ws2Service; photo_repo_url: string | null; form_completion_status: ProfileStatus; profile_data: Record<string, unknown> } & Audit;
export type Ws2Form = { id: string; property_id: string; service: Ws2Service; customer_email: string; status: "draft" | "generated" | "sent" | "submitted"; template_version: number; generated_by: string; generated_at: string; sent_at: string | null; submitted_at: string | null; form_token: string; answers?: Answers };
/** sectionId → one entry (or many for repeat groups); each entry maps fieldId → value. Repeat entries carry a stable `_rid`. */
export type Answers = Record<string, Record<string, unknown>[]>;
export type RestrictedRecord = { id: string; property_id: string; service: Ws2Service; category: RestrictedCategory; data: Record<string, unknown> } & Audit;
export type ActivityLog = { id: string; property_id: string; service: Ws2Service | null; app: string; user: string; action: "create" | "edit" | "view_restricted"; field: string; old_value: string; new_value: string; at: string };
export type PortalFolder = { id: string; property_id: string; service: Ws2Service; path: string; label: string; photo_count: number };

type State = { properties: Property[]; profiles: ServiceProfile[]; forms: Ws2Form[]; restricted: RestrictedRecord[]; log: ActivityLog[]; folders: PortalFolder[]; templates: TemplateVersion[] };

const KEY = "ps-ws2-v1";
const APP = "PS App";
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);

export const SERVICE_LABEL: Record<Ws2Service, string> = { ORM: "ORM", MARCOM_MT: "Marcom Meta/TikTok", MARCOM_GMB: "Marcom GMB" };
export const STATUS_LABEL: Record<ProfileStatus, string> = { not_sent: "ยังไม่ส่งฟอร์ม", sent: "ส่งฟอร์มแล้ว", partial: "กรอกบางส่วน", submitted: "ลูกค้าส่งแล้ว" };
export const serviceForVariant = (v: ServiceVariant): Ws2Service => (v === "ORM" ? "ORM" : v === "MARCOM_GMB" ? "MARCOM_GMB" : "MARCOM_MT");
/** Restricted layer (L3) is visible to ORM-side roles only; Marcom service owners are carved out. Prototype role flags, not real security. */
export const canSeeRestricted = (role: string, service: Ws2Service) => ["ae", "specialist", "pm", "management"].includes(role) || (role === "service" && service === "ORM");
export const canEditTemplates = (role: string) => role === "pm" || role === "management";
export const IDENTITY_FIELDS = ["hotel_name_th", "hotel_name_en", "address_th", "address_en", "phone", "key_contact"] as const;

const seedTemplates = (): TemplateVersion[] =>
  ([["ORM", ormTpl], ["MARCOM_MT", mtTpl], ["MARCOM_GMB", gmbTpl]] as const).map(([service, def]) => ({ service, version: 1, published_at: now(), published_by: "seed", def: def as TemplateDef }));

const empty = (): State => ({ properties: [], profiles: [], forms: [], restricted: [], log: [], folders: [], templates: seedTemplates() });

export function templateStats(def: TemplateDef) {
  const inputs = def.sections.flatMap((s) => s.fields).filter((f) => f.field_type !== "heading" && f.field_type !== "note");
  return { sections: def.sections.length, fields: inputs.length, restricted: inputs.filter((f) => f.layer === "L3").length, identity: inputs.filter((f) => f.layer === "L1").length };
}

type Api = State & {
  latestTemplate: (service: Ws2Service) => TemplateVersion;
  templateFor: (form: Ws2Form) => TemplateVersion | undefined;
  ensureProperty: (input: { hotel_id: string; hotel_name: string }, user: string) => void;
  updateProperty: (hotel_id: string, patch: Partial<Pick<Property, (typeof IDENTITY_FIELDS)[number]>>, user: string, app?: string) => void;
  formByToken: (token: string) => Ws2Form | undefined;
  saveAnswers: (token: string, answers: Answers, user: string, submit: boolean) => { ok: boolean; error?: string; otaLogins?: { ota: string; hotel_id: string; username: string; password: string }[] };
  addPhotos: (folderId: string, count: number, user: string) => void;
  logRestrictedView: (property_id: string, service: Ws2Service, user: string, app: string) => void;
  publishTemplate: (service: Ws2Service, def: TemplateDef, user: string) => number;
  generateForm: (input: { hotel_id: string; hotel_name: string; variant: ServiceVariant; customer_email: string }, user: string) => { ok: boolean; error?: string; form?: Ws2Form };
};

const Ctx = createContext<Api | null>(null);

export function Ws2Provider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw) as State; setS({ ...empty(), ...p, templates: p.templates?.length ? p.templates : seedTemplates() }); }
    } catch { /* ignore corrupt local data */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, ready]);

  const audit = (user: string, app = APP): Audit => ({ last_updated_at: now(), last_updated_by: user, last_updated_app: app });
  const logRow = (r: Omit<ActivityLog, "id" | "at">): ActivityLog => ({ ...r, id: rid(), at: now() });

  const latestTemplate = useCallback((service: Ws2Service) => s.templates.filter((t) => t.service === service).sort((a, b) => b.version - a.version)[0]!, [s.templates]);

  const ensureProperty = useCallback<Api["ensureProperty"]>((input, user) => {
    setS((st) => {
      if (st.properties.some((p) => p.hotel_id === input.hotel_id)) return st;
      const p: Property = { hotel_id: input.hotel_id, hotel_name_th: input.hotel_name, hotel_name_en: input.hotel_name, address_th: "", address_en: "", phone: "", key_contact: "", ...audit(user) };
      return { ...st, properties: [...st.properties, p], log: [...st.log, logRow({ property_id: p.hotel_id, service: null, app: APP, user, action: "create", field: "property", old_value: "", new_value: input.hotel_name })] };
    });
  }, []);

  const updateProperty = useCallback<Api["updateProperty"]>((hotel_id, patch, user, app = APP) => {
    setS((st) => {
      const cur = st.properties.find((p) => p.hotel_id === hotel_id);
      if (!cur) return st;
      const logs = Object.entries(patch).filter(([k, v]) => (cur as Record<string, unknown>)[k] !== v).map(([k, v]) => logRow({ property_id: hotel_id, service: null, app, user, action: "edit", field: k, old_value: String((cur as Record<string, unknown>)[k] ?? ""), new_value: String(v ?? "") }));
      if (!logs.length) return st;
      return { ...st, properties: st.properties.map((p) => (p.hotel_id === hotel_id ? { ...p, ...patch, ...audit(user, app) } : p)), log: [...st.log, ...logs] };
    });
  }, []);

  const generateForm = useCallback<Api["generateForm"]>((input, user) => {
    const email = input.customer_email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "กรุณาใส่อีเมลลูกค้าให้ถูกต้อง" };
    const service = serviceForVariant(input.variant);
    if (s.forms.some((f) => f.property_id === input.hotel_id && f.service === service)) return { ok: false, error: "บริการนี้สร้างฟอร์มแล้ว" };
    const tpl = latestTemplate(service);
    const t = now();
    const form: Ws2Form = { id: rid(), property_id: input.hotel_id, service, customer_email: email, status: "sent", template_version: tpl.version, generated_by: user, generated_at: t, sent_at: t, submitted_at: null, form_token: `${rid()}${rid()}` };
    const base = `portal://${input.hotel_id}/${service}/`;
    const folders: PortalFolder[] = (service === "MARCOM_GMB" ? [["_all/", "รูปทั้งหมด"]] : [["_property/", "รูปส่วนกลางโรงแรม"]]).map(([p, label]) => ({ id: rid(), property_id: input.hotel_id, service, path: base + p, label: label!, photo_count: 0 }));
    setS((st) => {
      const hasProp = st.properties.some((p) => p.hotel_id === input.hotel_id);
      const prop: Property[] = hasProp ? [] : [{ hotel_id: input.hotel_id, hotel_name_th: input.hotel_name, hotel_name_en: input.hotel_name, address_th: "", address_en: "", phone: "", key_contact: "", ...audit(user) }];
      const existing = st.profiles.find((p) => p.property_id === input.hotel_id && p.service === service);
      const profile: ServiceProfile = { property_id: input.hotel_id, service, photo_repo_url: base, form_completion_status: "sent", profile_data: existing?.profile_data ?? {}, ...audit(user) };
      return {
        ...st,
        properties: [...st.properties, ...prop],
        profiles: [...st.profiles.filter((p) => p !== existing), profile],
        forms: [...st.forms, form],
        folders: [...st.folders, ...folders],
        log: [
          ...st.log,
          ...(hasProp ? [] : [logRow({ property_id: input.hotel_id, service: null, app: APP, user, action: "create", field: "property", old_value: "", new_value: input.hotel_name })]),
          logRow({ property_id: input.hotel_id, service, app: APP, user, action: existing ? "edit" : "create", field: "service_profile", old_value: existing?.form_completion_status ?? "", new_value: "sent" }),
          logRow({ property_id: input.hotel_id, service, app: APP, user, action: "create", field: "ws2_form", old_value: "", new_value: `v${tpl.version} → ${email}` }),
          logRow({ property_id: input.hotel_id, service, app: APP, user, action: "edit", field: "photo_repo_url", old_value: existing?.photo_repo_url ?? "", new_value: base }),
        ],
      };
    });
    return { ok: true, form };
  }, [s.forms, latestTemplate]);

  const saveAnswers = useCallback<Api["saveAnswers"]>((token, answers, user, submit) => {
    const form = s.forms.find((f) => f.form_token === token);
    if (!form) return { ok: false, error: "ไม่พบฟอร์ม" };
    if (form.status === "submitted") return { ok: false, error: "ฟอร์มนี้ส่งแล้ว" };
    const tpl = s.templates.find((x) => x.service === form.service && x.version === form.template_version);
    if (!tpl) return { ok: false, error: "ไม่พบ template" };
    const app = "Customer form";
    const t = now();
    const l1: Record<string, string> = {};
    const l2: Record<string, unknown> = {};
    const l3: { category: RestrictedCategory; data: Record<string, unknown> }[] = [];
    const otaLogins: { ota: string; hotel_id: string; username: string; password: string }[] = [];
    const rooms: { rid: string; name: string }[] = [];
    for (const sec of tpl.def.sections) {
      const entries = answers[sec.id] ?? [];
      entries.forEach((entry, idx) => {
        const restrictedByCat: Partial<Record<RestrictedCategory, Record<string, unknown>>> = {};
        for (const f of sec.fields) {
          const v = entry[f.id];
          if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
          if (f.layer === "L1" && f.identity_key) l1[f.identity_key] = String(v);
          else if (f.layer === "L3" && f.restricted_category) (restrictedByCat[f.restricted_category] ??= {})[f.label] = v;
          else l2[sec.repeat_group ? `${sec.id}[${String(entry["_rid"] ?? idx)}].${f.label}` : `${sec.id}.${f.label}`] = v;
        }
        for (const [category, data] of Object.entries(restrictedByCat)) l3.push({ category: category as RestrictedCategory, data: { ...data, _entry: entry["_rid"] ?? idx } });
        if (sec.repeat_group === "ota" && form.service === "ORM") {
          const by = (re: RegExp) => String(sec.fields.find((f) => re.test(f.label)) ? entry[sec.fields.find((f) => re.test(f.label))!.id] ?? "" : "");
          otaLogins.push({ ota: by(/^OTA Name/i), hotel_id: by(/^HOTEL ID/i), username: by(/^USERNAME/i), password: by(/^PASSWORD/i) });
        }
        if (sec.repeat_group === "room_type" && entry["_rid"]) {
          const nameField = sec.fields.find((f) => f.field_type === "text");
          rooms.push({ rid: String(entry["_rid"]), name: String((nameField && entry[nameField.id]) || `Room ${idx + 1}`) });
        }
      });
    }
    const nextStatus: ProfileStatus = submit ? "submitted" : "partial";
    setS((st) => {
      const prop = st.properties.find((p) => p.hotel_id === form.property_id);
      const logs: ActivityLog[] = [];
      let properties = st.properties;
      if (prop) {
        const changed = Object.entries(l1).filter(([k, v]) => (prop as Record<string, unknown>)[k] !== v);
        changed.forEach(([k, v]) => logs.push(logRow({ property_id: form.property_id, service: form.service, app, user, action: "edit", field: k, old_value: String((prop as Record<string, unknown>)[k] ?? ""), new_value: v })));
        if (changed.length) properties = st.properties.map((p) => (p.hotel_id === form.property_id ? { ...p, ...l1, ...audit(user, app) } : p));
      }
      const profiles = st.profiles.map((p) => {
        if (p.property_id !== form.property_id || p.service !== form.service) return p;
        Object.entries(l2).filter(([k, v]) => JSON.stringify(p.profile_data[k]) !== JSON.stringify(v)).forEach(([k, v]) => logs.push(logRow({ property_id: p.property_id, service: p.service, app, user, action: "edit", field: k, old_value: p.profile_data[k] === undefined ? "" : JSON.stringify(p.profile_data[k]), new_value: JSON.stringify(v) })));
        if (p.form_completion_status !== nextStatus) logs.push(logRow({ property_id: p.property_id, service: p.service, app, user, action: "edit", field: "form_completion_status", old_value: p.form_completion_status, new_value: nextStatus }));
        return { ...p, profile_data: { ...p.profile_data, ...l2 }, form_completion_status: nextStatus, ...audit(user, app) };
      });
      const restricted = [
        ...st.restricted.filter((r) => !(r.property_id === form.property_id && r.service === form.service)),
        ...l3.map((r) => ({ id: rid(), property_id: form.property_id, service: form.service, category: r.category, data: r.data, ...audit(user, app) })),
      ];
      l3.forEach((r) => logs.push(logRow({ property_id: form.property_id, service: form.service, app, user, action: "edit", field: `🔒 ${r.category}`, old_value: "", new_value: "(hidden)" })));
      const base = `portal://${form.property_id}/${form.service}/`;
      let folders = st.folders;
      if (form.service !== "MARCOM_GMB") for (const r of rooms) {
        const path = `${base}${r.rid}/`;
        const hit = folders.find((f) => f.path === path);
        if (hit) folders = folders.map((f) => (f.id === hit.id ? { ...f, label: r.name } : f));
        else { folders = [...folders, { id: rid(), property_id: form.property_id, service: form.service, path, label: r.name, photo_count: 0 }]; logs.push(logRow({ property_id: form.property_id, service: form.service, app, user, action: "create", field: "image_folder", old_value: "", new_value: path })); }
      }
      const forms = st.forms.map((f) => (f.id === form.id ? { ...f, answers, ...(submit ? { status: "submitted" as const, submitted_at: t } : {}) } : f));
      return { ...st, properties, profiles, restricted, folders, forms, log: [...st.log, ...logs] };
    });
    return { ok: true, otaLogins: submit ? otaLogins.filter((o) => o.ota) : [] };
  }, [s.forms, s.templates]);

  const addPhotos = useCallback<Api["addPhotos"]>((folderId, count, user) => {
    setS((st) => {
      const f = st.folders.find((x) => x.id === folderId);
      if (!f || count <= 0) return st;
      return { ...st, folders: st.folders.map((x) => (x.id === folderId ? { ...x, photo_count: x.photo_count + count } : x)), log: [...st.log, logRow({ property_id: f.property_id, service: f.service, app: "Customer form", user, action: "edit", field: `photos ${f.path}`, old_value: String(f.photo_count), new_value: String(f.photo_count + count) })] };
    });
  }, []);

  const logRestrictedView = useCallback<Api["logRestrictedView"]>((property_id, service, user, app) => {
    setS((st) => ({ ...st, log: [...st.log, logRow({ property_id, service, app, user, action: "view_restricted", field: "🔒 restricted", old_value: "", new_value: "" })] }));
  }, []);

  const publishTemplate = useCallback<Api["publishTemplate"]>((service, def, user) => {
    const version = Math.max(...s.templates.filter((x) => x.service === service).map((x) => x.version)) + 1;
    setS((st) => ({ ...st, templates: [...st.templates, { service, version, published_at: now(), published_by: user, def }] }));
    return version;
  }, [s.templates]);

  const api = useMemo<Api>(() => ({ ...s, latestTemplate, templateFor: (f) => s.templates.find((t) => t.service === f.service && t.version === f.template_version), formByToken: (tk) => s.forms.find((f) => f.form_token === tk), saveAnswers, addPhotos, logRestrictedView, publishTemplate, ensureProperty, updateProperty, generateForm }), [s, latestTemplate, saveAnswers, addPhotos, logRestrictedView, publishTemplate, ensureProperty, updateProperty, generateForm]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWs2() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWs2 must be used inside Ws2Provider");
  return v;
}
