/* Template Management v1.0 — email masters (draft → publish) + immutable send snapshots + checklist-template version meta.
 * Browser-local prototype; role flags are simulation, not authorization. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type EmailKey = "billing_survey2" | "go_live" | "post_meeting" | "production_report" | "ac_live_link";
export type EmailVersion = { version: number; subject: string; body: string; published_at: string; published_by: string };
export type EmailTemplate = {
  key: EmailKey; name: string; placeholders: string; wiring: string;
  versions: EmailVersion[]; draft: { subject: string; body: string } | null; updated_by: string; updated_at: string;
};
export type EmailSent = {
  id: string; email_key: EmailKey; email_template_version: number; rendered_subject: string; rendered_body: string;
  card_id: string | null; property_id: string; sent_by: string; sent_at: string;
};
/** P3 · Monthly-meeting survey definitions (B-lite: display text only; scale 1–10, question count/type, sections, Take-Notes locked). */
export type SurveyKey = "ORM_MONTHLY" | "MARCOM_MONTHLY";
export type SurveyText = { section_label: string; overall_label: string; comment_placeholder: string; open_placeholder: string; help: string; q: Record<string, string> };
export type SurveyVersion = SurveyText & { version: number; published_at: string; published_by: string };
export type SurveyDef = { key: SurveyKey; name: string; section: "ORM" | "MARCOM"; keys: string[]; versions: SurveyVersion[]; draft: SurveyText | null };
export const SURVEY_OPEN_KEY = "Q9";
const OVERALL_Q = { Q7: "ความพึงพอใจโดยรวมของการประชุมครั้งนี้", Q8: "โรงแรมจะแนะนำเพื่อนมาใช้บริการเราหรือไม่?", Q9: "คำแนะนำ/ความคิดเห็นเพิ่มเติม" };
const surveySeed = (key: SurveyKey, name: string, section: "ORM" | "MARCOM", q: Record<string, string>): SurveyDef => ({
  key, name, section, keys: [...Object.keys(q), "Q7", "Q8", "Q9"], draft: null,
  versions: [{ version: 1, section_label: section, overall_label: "OVERALL", comment_placeholder: "Comment (optional)", open_placeholder: "ความเห็นเพิ่มเติมจากลูกค้า…", help: "", q: { ...q, ...OVERALL_Q }, published_at: SEED_AT, published_by: "System" }],
});
const SURVEY_SEED: SurveyDef[] = [
  surveySeed("ORM_MONTHLY", "Monthly meeting — ORM", "ORM", { Q1: "การประชุมประจำเดือน มีเนื้อหาเป็นประโยชน์", Q2: "การประชุมประจำเดือน ใช้ระยะเวลาได้อย่างเหมาะสม", Q3: "ทีมงานสามารถให้คำแนะนำและแก้ไขปัญหาได้อย่างมีประสิทธิภาพ" }),
  surveySeed("MARCOM_MONTHLY", "Monthly meeting — Marcom", "MARCOM", { Q4: "พาร์ท content หรือ content plan ที่ทางทีมดำเนินการหรือนำเสนอ", Q5: "พาร์ทด้านโฆษณาหรือผลลัพธ์ด้านการยิงโฆษณา ที่ทางทีมได้ดำเนินการ", Q6: "การนำเสนอประชุมของทีมในส่วนของการสื่อสารและการแนะนำ Suggestion" }),
];
export const activeSurvey = (d: SurveyDef) => d.versions[d.versions.length - 1]!;

/** P2 · greeting from property.key_contact; blank → generic greeting (never "คุณ" + hotel name). */
export const greetingName = (keyContact: string | null | undefined) => (keyContact?.trim() ? `คุณ${keyContact.trim()}` : "เจ้าของโรงแรมและทีมงานผู้เกี่ยวข้อง");

export type ChecklistMeta = { version: number; published_at: string; published_by: string };

/** Template edit/publish = PM or System Admin (Management Level: HOC · MD · Automation). HR/Admin is excluded. */
export const canManageTemplates = (role: string) => role === "pm" || role === "management";
export const ROLE_DISPLAY: Record<string, string> = { ae: "AE", specialist: "Specialist", pm: "PM", service: "Service (ORM/Marcom)", management: "System Admin (HOC · MD · Automation)" };

const SEED_AT = "2026-10-01T00:00:00.000Z";
const seed = (key: EmailKey, name: string, placeholders: string, wiring: string, subject: string, body: string): EmailTemplate => ({
  key, name, placeholders, wiring, draft: null, updated_by: "System", updated_at: SEED_AT,
  versions: [{ version: 1, subject, body, published_at: SEED_AT, published_by: "System" }],
});
const SEED: EmailTemplate[] = [
  seed("billing_survey2", "Billing confirm + Survey #2", "{hotel_name} {contact_name} {service_name} {meeting_date} {meeting_record} {survey_link}", "ใช้งานจริง · ปุ่ม Send email ขั้นประชุม",
    "ยืนยันการประชุม {service_name} และวันเริ่มใช้บริการ — {hotel_name}",
    "เรียน {contact_name}\n\nทีม Hotel Plus ขอยืนยันว่าการประชุม {service_name} เสร็จเรียบร้อยแล้ว\n• วันที่ {meeting_date} (dd/mm/yyyy) = วันเริ่มคิดค่าบริการ และเป็นวันที่ 1 ของอายุสัญญา\n• บันทึกการประชุม: {meeting_record}\n\nรบกวนประเมินความพึงพอใจของท่าน: {survey_link}\n\nขอบคุณครับ/ค่ะ\nทีม Hotel Plus"),
  seed("go_live", "Go Live notice", "{hotel_name} {contact_name} {service_name}", "ใช้งานจริง · ติ๊ก “ส่งอีเมลแจ้งลูกค้า” ที่ Go Live",
    "{hotel_name} พร้อมเปิดใช้งาน (Go Live) แล้ว",
    "เรียน {contact_name}\n\nบริการ {service_name} ของ {hotel_name} พร้อมเปิดใช้งานเรียบร้อยแล้ว\nหากมีข้อสงสัยเพิ่มเติม ทีมงานยินดีให้บริการครับ/ค่ะ\n\nขอบคุณครับ/ค่ะ\nทีม Hotel Plus"),
  seed("post_meeting", "Post-meeting (record + survey) · ORM/Marcom", "{hotel_name} {contact_name} {team} {meeting_record} {survey_link}", "แม่แบบเท่านั้น · ปุ่มส่ง = งานรอบถัดไป",
    "สรุปการประชุมประจำเดือน — {hotel_name} ({team})",
    "เรียน {contact_name}\n\nขอบคุณสำหรับการประชุมประจำเดือนกับทีม {team}\n• บันทึกการประชุม: {meeting_record}\n• แบบประเมินความพึงพอใจ: {survey_link}\n\nขอบคุณครับ/ค่ะ\nทีม Hotel Plus"),
  seed("production_report", "Production Report", "{hotel_name} {contact_name} {period} {report_link}", "แม่แบบเท่านั้น",
    "รายงานผลการดำเนินงาน (Production Report) {period} — {hotel_name}",
    "เรียน {contact_name}\n\nขอนำส่งรายงานผลการดำเนินงานประจำงวด {period}\n• รายงาน: {report_link}\n\nขอบคุณครับ/ค่ะ\nทีม Hotel Plus"),
  seed("ac_live_link", "AC Live Link (e-contract + payment)", "{hotel_name} {contact_name} {live_link}", "แม่แบบเท่านั้น · AC APP ใช้ภายหลัง",
    "ลิงก์ลงนามสัญญาและชำระเงิน — {hotel_name}",
    "เรียน {contact_name}\n\nกรุณาคลิกลิงก์ด้านล่างเพื่อลงนามสัญญาบริการ (e-contract) และชำระเงินผ่านช่องทางที่ปลอดภัย\n• ลิงก์: {live_link}\n\nลิงก์นี้สำหรับ {hotel_name} เท่านั้น หากมีข้อสงสัยกรุณาติดต่อทีมงาน\nทีม Hotel Plus"),
];

export const fillPlaceholders = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
export const activeEmail = (t: EmailTemplate) => t.versions[t.versions.length - 1]!;

type State = { templates: EmailTemplate[]; sent: EmailSent[]; checklist: ChecklistMeta; surveys: SurveyDef[]; surveyStamps: Record<string, number> };
const KEY = "meridia.ps.templates.v1";
const initial = (): State => ({ templates: SEED, sent: [], checklist: { version: 1, published_at: SEED_AT, published_by: "System" }, surveys: SURVEY_SEED, surveyStamps: {} });

type Ctx = State & {
  render: (key: EmailKey, vars: Record<string, string>) => { subject: string; body: string; version: number };
  saveDraft: (key: EmailKey, draft: { subject: string; body: string }, by: string) => void;
  discardDraft: (key: EmailKey) => void;
  publish: (key: EmailKey, by: string) => number;
  recordSend: (key: EmailKey, vars: Record<string, string>, meta: { card_id: string | null; property_id: string; sent_by: string }) => EmailSent;
  bumpChecklist: (by: string) => number;
  saveSurveyDraft: (key: SurveyKey, draft: SurveyText) => void;
  discardSurveyDraft: (key: SurveyKey) => void;
  publishSurvey: (key: SurveyKey, by: string) => number;
  /** Freeze at queue-creation: stamps unseen queue entries with the current version. */
  stampSurveys: (ids: { id: string; key: SurveyKey }[]) => void;
  surveyFor: (id: string, key: SurveyKey) => SurveyVersion;
};
const C = createContext<Ctx | null>(null);

export function TemplateMgmtProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const l = JSON.parse(raw) as State; setState({ ...initial(), ...l, templates: SEED.map((s) => { const x = l.templates?.find((t) => t.key === s.key); return x ? { ...x, versions: x.versions.map((v) => ({ ...v, body: v.body.replace("เรียน คุณ{contact_name}", "เรียน {contact_name}") })) } : s; }), surveys: SURVEY_SEED.map((s) => l.surveys?.find((x) => x.key === s.key) ?? s), surveyStamps: l.surveyStamps ?? {} }); } } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, ready]);

  const render = useCallback((key: EmailKey, vars: Record<string, string>) => {
    const t = state.templates.find((x) => x.key === key)!; const v = activeEmail(t);
    return { subject: fillPlaceholders(v.subject, vars), body: fillPlaceholders(v.body, vars), version: v.version };
  }, [state.templates]);

  const value = useMemo<Ctx>(() => ({
    ...state,
    render,
    saveDraft: (key, draft, by) => setState((s) => ({ ...s, templates: s.templates.map((t) => t.key === key ? { ...t, draft, updated_by: by, updated_at: new Date().toISOString() } : t) })),
    discardDraft: (key) => setState((s) => ({ ...s, templates: s.templates.map((t) => t.key === key ? { ...t, draft: null } : t) })),
    publish: (key, by) => {
      const t = state.templates.find((x) => x.key === key)!; const next = activeEmail(t).version + 1;
      if (!t.draft) return activeEmail(t).version;
      const now = new Date().toISOString();
      setState((s) => ({ ...s, templates: s.templates.map((x) => x.key === key && x.draft ? { ...x, versions: [...x.versions, { version: next, ...x.draft, published_at: now, published_by: by }], draft: null, updated_by: by, updated_at: now } : x) }));
      return next;
    },
    recordSend: (key, vars, meta) => {
      const r = render(key, vars);
      const row: EmailSent = { id: `em-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, email_key: key, email_template_version: r.version, rendered_subject: r.subject, rendered_body: r.body, ...meta, sent_at: new Date().toISOString() };
      setState((s) => ({ ...s, sent: [...s.sent, row] }));
      return row;
    },
    saveSurveyDraft: (key, draft) => setState((s) => ({ ...s, surveys: s.surveys.map((d) => d.key === key ? { ...d, draft } : d) })),
    discardSurveyDraft: (key) => setState((s) => ({ ...s, surveys: s.surveys.map((d) => d.key === key ? { ...d, draft: null } : d) })),
    publishSurvey: (key, by) => {
      const d = state.surveys.find((x) => x.key === key)!; const cur = activeSurvey(d).version;
      if (!d.draft) return cur;
      const now = new Date().toISOString();
      setState((s) => ({ ...s, surveys: s.surveys.map((x) => x.key === key && x.draft ? { ...x, versions: [...x.versions, { ...x.draft, version: cur + 1, published_at: now, published_by: by }], draft: null } : x) }));
      return cur + 1;
    },
    stampSurveys: (ids) => {
      const missing = ids.filter((i) => state.surveyStamps[i.id] === undefined);
      if (!missing.length) return;
      setState((s) => { const st = { ...s.surveyStamps }; missing.forEach((i) => { if (st[i.id] === undefined) st[i.id] = activeSurvey(s.surveys.find((d) => d.key === i.key)!).version; }); return { ...s, surveyStamps: st }; });
    },
    surveyFor: (id, key) => { const d = state.surveys.find((x) => x.key === key)!; const v = state.surveyStamps[id]; return d.versions.find((x) => x.version === v) ?? activeSurvey(d); },
    bumpChecklist: (by) => {
      const next = state.checklist.version + 1;
      setState((s) => ({ ...s, checklist: { version: s.checklist.version + 1, published_at: new Date().toISOString(), published_by: by } }));
      return next;
    },
  }), [state, render]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useTemplateMgmt() {
  const c = useContext(C);
  if (!c) throw new Error("useTemplateMgmt must be used inside TemplateMgmtProvider");
  return c;
}
