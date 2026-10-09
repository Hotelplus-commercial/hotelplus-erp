/* Servicing Revision 2: native stage actions with append-only timestamps.
 * Browser-local workflow prototype; role flags are not production authorization. */
import { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from "react";

export type ServiceLine = "ORM" | "MARCOM";
export type ExternalApp = "ORM_APP" | "MARCOM_APP";
export const externalAppFor = (line: ServiceLine): ExternalApp => line === "ORM" ? "ORM_APP" : "MARCOM_APP";
export type OwnerTrack = "AE" | "SPECIALIST" | "SERVICE";
export type Role = "ae" | "specialist" | "pm" | "service" | "management";
export type FormStatus = "not_started" | "in_progress" | "complete";

export type ServiceVariant = "ORM" | "MARCOM_META_TIKTOK" | "MARCOM_GMB";
export const lineOfVariant = (v: ServiceVariant): ServiceLine => (v === "ORM" ? "ORM" : "MARCOM");
export const variantsForLine = (line: ServiceLine): ServiceVariant[] =>
  line === "ORM" ? ["ORM"] : ["MARCOM_META_TIKTOK", "MARCOM_GMB"];
export const VARIANT_LABEL: Record<ServiceVariant, string> = {
  ORM: "ORM",
  MARCOM_META_TIKTOK: "Marcom (Meta/TikTok)",
  MARCOM_GMB: "Marcom (GMB)",
};

export type OnboardingCard = {
  id: string;
  property_id: string;
  property_name: string;
  service_line: ServiceLine;
  service_variant: ServiceVariant;
  contract_ref: string;
  contract_code?: string;
  orm_lite?: boolean;
  handover_otas?: string[];
  meeting_appointment_url?: string | null;
  created_at: string;
  current_stage: string;
  assigned_ae_id: string;
  assigned_specialist_id: string;
  assigned_service_owner_id: string;
  billing_start_at: string | null;
  billing_anchor_stage: string;
  go_live_at: string | null;
  meeting_record_url: string | null;
  pre_service_form_ref: string | null;
  form_completion_status: FormStatus;
  external_app: ExternalApp | null;
  external_ref_url: string | null;
};
export type StageEvent = { id: string; card_id: string; stage_key: string; entered_at: string; owner_track: OwnerTrack };
export type FinalCheckItem = { id: string; card_id: string; item_label: string; checked: boolean; checked_at: string | null };
export type HandoverItem = {
  id: string;
  card_id: string;
  item_label: string;
  specialist_checked: boolean;
  specialist_checked_at: string | null;
  verifier_checked: boolean;
  verifier_checked_at: string | null;
  /** v6.0 P2: ORM OTA handover rows (null on legacy free-form rows). */
  ota_channel?: string | null;
  group_label?: string;
};
export type HandoverCredential = { id: string; card_id: string; ota_channel: string; property_name: string; hotel_id: string; username: string; password: string; commission: string };
export type RoomMapping = { id: string; card_id: string; original_room_name: string; ota_channel: string; ota_room_name: string };
export const OTA_CHANNELS = ["Agoda", "Booking.com", "Expedia", "Trip.com", "Traveloka", "Tiket"] as const;
export const handoverOtas = (card: OnboardingCard): string[] => card.orm_lite
  ? OTA_CHANNELS.filter((ota) => card.handover_otas?.includes(ota))
  : [...OTA_CHANNELS];
export const validMeetingUrl = (value: string | null | undefined) => {
  try { return ["http:", "https:"].includes(new URL(value?.trim() ?? "").protocol); } catch { return false; }
};
export function handoverProgress(s: Pick<State, "handover" | "credentials" | "roomMappings">, card: OnboardingCard) {
  const otas = handoverOtas(card);
  const selectionComplete = otas.length === (card.orm_lite ? 3 : 6);
  const items = s.handover.filter((h) => h.card_id === card.id && (!h.ota_channel || otas.includes(h.ota_channel)));
  const names = [...new Set(s.roomMappings.filter((m) => m.card_id === card.id).map((m) => m.original_room_name))];
  const rowsPresent = otas.every((ota) => items.some((h) => h.ota_channel === ota)) || (items.length > 0 && items.every((h) => !h.ota_channel));
  return {
    otas, items, selectionComplete,
    specialistDone: selectionComplete && rowsPresent && items.every((h) => h.specialist_checked),
    verifierDone: selectionComplete && rowsPresent && items.every((h) => h.specialist_checked && h.verifier_checked),
    credentialsDone: selectionComplete && otas.every((ota) => s.credentials.some((c) => c.card_id === card.id && c.ota_channel === ota && c.hotel_id.trim() && credentialComplete(c))),
    roomsDone: selectionComplete && names.length > 0 && names.every((name) => otas.every((ota) => s.roomMappings.some((m) => m.card_id === card.id && m.original_room_name === name && m.ota_channel === ota && m.ota_room_name.trim()))),
  };
}
export type HandoverSurvey = {
  id: string;
  card_id: string;
  evaluatee_specialist_id: string;
  evaluator_service_id: string;
  score: number | null;
  comment: string | null;
  submitted_at: string | null;
  window_expires_at: string;
  status: "pending" | "submitted" | "expired";
};
export type CustomerSurvey = {
  id: string;
  card_id: string;
  dispatched_at: string;
  responded_at: string | null;
  score_bd: number | null;
  score_ae: number | null;
  score_service_exp: number | null;
  score_strategy: number | null;
  nps: number | null;
  comment: string | null;
  optional: boolean;
};

export type FieldType = "tick" | "data";
export type ChecklistTemplate = {
  id: string;
  stage_key: string;
  service_variant: ServiceVariant;
  ota_channel: string | null;
  group_label: string;
  item_label: string;
  order: number;
  has_two_tick: boolean;
  field_type: FieldType;
};
export type ChecklistItem = {
  id: string;
  card_id: string;
  template_ref: string;
  label: string;
  group_label: string;
  stage_key: string;
  checked: boolean;
  checked_at: string | null;
};

/* ---------------- stage constants (§3) ---------------- */

export const STAGE_LABEL: Record<string, string> = {
  new_property: "New Property",
  introduction_sent_form: "Introduction & Sent Form",
  collect_data: "Collect Data",
  property_pending: "Property Pending",
  final_check: "Final Check",
  approved: "Approved",
  completed: "Completed (Handover)",
  rate_structure_meeting: "Rate Structure Meeting",
  send_summary: "Send Summary",
  load_bar_rate: "Load BAR Rate",
  mapping: "Mapping",
  request_forward_booking: "Request Forward Booking",
  register_training: "Register & Training",
  brand_dna_wall: "Brand DNA Wall",
  audience_key_message: "Audience & Key Message",
  content_plan_52w: "Content Plan 52W",
  ads_planning: "Ads Planning",
  first_sync_up_meeting: "First Sync-up Meeting",
  go_live: "Go Live",
  orm_prepare_data: "Prepare Data",
  orm_rate_structure: "Rate Structure",
  orm_final_setup: "Final Setup",
  orm_system_training: "System Training",
  orm_go_live: "Go Live",
  marcom_prepare_data: "Prepare Data",
  marcom_first_sync: "First Sync",
  marcom_go_live: "Go Live",
};
export const STAGE_GUIDANCE: Record<string, string> = {
  new_property: "AE: ติดต่อโรงแรมและส่งแบบฟอร์มเตรียมข้อมูล แล้วบันทึกการส่ง",
  introduction_sent_form: "AE: ติดตามแบบฟอร์มและเริ่มรวบรวมข้อมูลของโรงแรม",
  collect_data: "AE: รวบรวมข้อมูลโรงแรมและบันทึกความคืบหน้า; หากรอโรงแรมให้พักที่ Property Pending",
  property_pending: "AE: ติดตามข้อมูลที่ยังขาดจากโรงแรมและบันทึกความคืบหน้า",
  final_check: "AE: ตรวจรายการทั้ง 4 ข้อให้ครบ จากนั้น Specialist หรือ PM อนุมัติ",
  approved: "Specialist: เตรียมส่งมอบงาน; Service ตรวจรับทุกรายการ แล้ว Specialist ใส่ลิงก์บันทึกการประชุมเพื่อยืนยัน Completed",
  completed: "Service: เริ่มงานบริการและบันทึกการเข้าสู่ขั้นแรก; แบบประเมินส่งมอบเป็นทางเลือก",
  rate_structure_meeting: "ORM: จัดประชุมโครงสร้างราคาและเตรียมส่งสรุปให้โรงแรม",
  send_summary: "ORM: ส่งสรุปที่ตกลงกับโรงแรม แล้วดำเนินการโหลด BAR Rate",
  load_bar_rate: "ORM: โหลดและตรวจสอบ BAR Rate ให้ครบก่อนเริ่ม Mapping",
  mapping: "ORM: จับคู่ประเภทห้องและราคา ตรวจสอบให้ครบก่อนขอ Forward Booking",
  request_forward_booking: "ORM: ขอและตรวจรายการจองล่วงหน้าก่อนนัดลงทะเบียนและฝึกอบรม",
  register_training: "ORM: ลงทะเบียนและฝึกอบรมให้ครบ ตรวจความพร้อมก่อนยืนยัน Go Live",
  brand_dna_wall: "Marcom: จัดทำและยืนยัน Brand DNA Wall ก่อนกำหนดกลุ่มเป้าหมายและข้อความหลัก",
  audience_key_message: "Marcom: ยืนยันกลุ่มเป้าหมายและ Key Message ก่อนจัดทำแผนเนื้อหา",
  content_plan_52w: "Marcom: จัดทำแผนเนื้อหา 52 สัปดาห์ให้ครบก่อนวางแผนโฆษณา",
  ads_planning: "Marcom: จัดทำแผนโฆษณาแล้วนัด First Sync-up Meeting",
  first_sync_up_meeting: "Marcom: ประชุม Sync-up ครั้งแรกและตรวจความพร้อมก่อนยืนยัน Go Live",
  go_live: "เปิดให้บริการแล้ว · วันที่ Go Live และจำนวนวันรวมถูกบันทึกเรียบร้อย",
  orm_prepare_data: "ORM: ทำ Revplus+ และ Rate Structure เบื้องต้น",
  orm_rate_structure: "ORM: นัดประชุมโครงสร้างราคาและแนบลิงก์บันทึกการประชุม",
  orm_final_setup: "ORM: ส่ง Summary, โหลด BAR Rate, Mapping และขอ Forward Booking ให้ครบ",
  orm_system_training: "ORM: สมัครคอร์ส นัดวันเทรน และยืนยันลูกค้าเข้าเรียน",
  orm_go_live: "ORM: ส่งอีเมลแจ้งลูกค้าเปิดให้บริการแล้ว",
  marcom_prepare_data: "Marcom: จัดทำ Brand DNA Wall, Audience/Key Message, Content Plan และ Ads Planning",
  marcom_first_sync: "Marcom: นัดประชุม First Sync-up และแนบลิงก์บันทึกการประชุม",
  marcom_go_live: "Marcom: ส่งอีเมลแจ้งลูกค้าเปิดให้บริการแล้ว",
};

export const AE_TRACK = ["new_property", "introduction_sent_form", "collect_data", "final_check", "approved"];
/** Legacy (v5.x) service-stage sets — retained only so old localStorage data can be migrated. */
export const SERVICE_TRACK: Record<ServiceLine, string[]> = {
  ORM: ["rate_structure_meeting", "send_summary", "load_bar_rate", "mapping", "request_forward_booking", "register_training", "go_live"],
  MARCOM: ["brand_dna_wall", "audience_key_message", "content_plan_52w", "ads_planning", "first_sync_up_meeting", "go_live"],
};
/** v6.0 service-stage sets, keyed by variant. GMB skips First Sync (conditional, like Property Pending). */
export const VARIANT_SERVICE_TRACK: Record<ServiceVariant, string[]> = {
  ORM: ["orm_prepare_data", "orm_rate_structure", "orm_final_setup", "orm_system_training", "orm_go_live"],
  MARCOM_META_TIKTOK: ["marcom_prepare_data", "marcom_first_sync", "marcom_go_live"],
  MARCOM_GMB: ["marcom_prepare_data", "marcom_go_live"],
};
export const BILLING_ANCHOR_VARIANT: Record<ServiceVariant, string> = {
  ORM: "orm_rate_structure",
  MARCOM_META_TIKTOK: "marcom_first_sync",
  MARCOM_GMB: "marcom_go_live",
};
export const MILESTONES = new Set(["new_property", "approved", "completed", "go_live", "orm_go_live", "marcom_go_live"]);
export const fullSequence = (variant: ServiceVariant) => [...AE_TRACK, "completed", ...VARIANT_SERVICE_TRACK[variant]];
/** Union of every service-stage key for a line (both variants), in logical order — used to build pipeline columns. */
export const lineSequence = (line: ServiceLine) => {
  const seen = new Set<string>();
  const svc: string[] = [];
  for (const v of variantsForLine(line)) for (const stage of VARIANT_SERVICE_TRACK[v]) if (!seen.has(stage)) { seen.add(stage); svc.push(stage); }
  const stages = [...AE_TRACK, "completed", ...svc];
  stages.splice(3, 0, "property_pending");
  return stages;
};
export const trackOf = (stage: string): OwnerTrack =>
  ["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"].includes(stage)
    ? "AE"
    : stage === "approved" || stage === "completed"
      ? "SPECIALIST"
      : "SERVICE";
/** Department badge (§2.5): AE / On-boarding Specialist / ORM / Marcom. */
export const deptBadge = (stage: string, variant: ServiceVariant): "AE" | "On-boarding Specialist" | "ORM" | "Marcom" => {
  const t = trackOf(stage);
  if (t === "AE") return "AE";
  if (t === "SPECIALIST") return "On-boarding Specialist";
  return lineOfVariant(variant) === "ORM" ? "ORM" : "Marcom";
};

/** Next stage in the linear flow (property_pending is a conditional detour from collect_data). */
export const nextStage = (variant: ServiceVariant, current: string) => {
  if (current === "property_pending") return "final_check";
  const seq = fullSequence(variant);
  const i = seq.indexOf(current);
  return i >= 0 && i < seq.length - 1 ? seq[i + 1] ?? null : null;
};

const FINAL_CHECK_ITEMS = [
  "Logins / report ครบถ้วน",
  "ข้อมูลในฟอร์มครบทุกช่อง",
  "รูปภาพครบและตรงกับห้องพัก",
  "ข้อมูลสำหรับเปิดระบบครบถ้วน",
];

/* ---------------- v6.0 Phase 2 · ORM Handover OTA template (2-tick, PM-managed) ---------------- */
const OTA_HANDOVER: Record<string, Record<string, string[]>> = {
  Agoda: { Registration: ["OTA reg", "Add H+ group", "Set contact (Acct Existing Y/N)"], Contents: ["Room Type + Amenities", "Location", "Setting & details", "Facility (Content Score ≥85%)"], Finance: ["Payment method", "Tax", "Rate plan (deactivate)", "Cancellation = Non-Ref"], Connectivity: ["Connectivity"], "Hotel User": ["Create hotel user"] },
  "Booking.com": { Registration: ["OTA reg", "Add H+ group", "Set contact"], Contents: ["Room Type + Amenities", "Location", "Property + Reservation policies", "Facility & service"], Finance: ["Finance Setting (bank no. → wait system)"], "Rate & Avail": ["Cancellation = Non-Ref"], Connectivity: ["Connectivity"], "Hotel User": ["Create hotel user"] },
  Expedia: { Registration: ["OTA reg", "Add H+ group", "Sign Contract"], Contents: ["Room Type", "Address & location", "Property amenities", "Room amenities"], Finance: ["Payment Setting"], "Rate & Avail": ["Cancellation = Non-Ref"], Connectivity: ["Connectivity"], "Hotel User": ["Create hotel user"] },
  "Trip.com": { Registration: ["OTA reg", "Add H+ group", "Set contact"], Contents: ["Room info", "General info", "Property policies", "Facility & service"], Finance: ["Bank accounts", "Financial Overview"], "Rate & Avail": ["Cancellation = Non-Ref"], Connectivity: ["Connectivity"], "Hotel User": ["Create hotel user"] },
  Traveloka: { Registration: ["OTA reg", "Add H+ group", "Set hotel contact"], Contents: ["Room data", "Property data", "Policy setting", "Photo"], Finance: ["Bank accounts", "Payment Method", "Rate plan"], Connectivity: ["Request room mapping (Extranet)"], "Hotel User": ["Create hotel user"] },
  Tiket: { Registration: ["OTA reg", "Add H+ group", "Manage User"], Contents: ["Room data", "Details", "General Info (Chain tag mail)", "Photo"], Finance: ["Bank accounts"], "Rate & Avail": ["Cancellation = Non-Ref"], Connectivity: ["Request room mapping (Extranet+MM)"], Other: ["Promotions: Close combine discount (Exclusive Private Deals)"] },
};
let _hoSeq = 0;
export const HANDOVER_TEMPLATE_SEED: ChecklistTemplate[] = Object.entries(OTA_HANDOVER).flatMap(([ota, groups]) =>
  Object.entries(groups).flatMap(([group_label, labels]) =>
    labels.map((item_label) => ({ id: `ho-${++_hoSeq}`, stage_key: "handover", service_variant: "ORM" as ServiceVariant, ota_channel: ota, group_label, item_label, order: 1000 + _hoSeq, has_two_tick: true, field_type: "tick" as const })),
  ),
);
const handoverFromTemplates = (cardId: string, variant: ServiceVariant, templates: ChecklistTemplate[]): HandoverItem[] =>
  variant !== "ORM" ? [] : templates.filter((t) => t.has_two_tick && t.service_variant === "ORM").map((t) => ({
    id: rid(), card_id: cardId, item_label: t.item_label, ota_channel: t.ota_channel, group_label: t.group_label,
    specialist_checked: false, specialist_checked_at: null, verifier_checked: false, verifier_checked_at: null,
  }));
const credentialRows = (card: { id: string; property_name: string; property_id: string; service_variant: ServiceVariant }): HandoverCredential[] =>
  card.service_variant !== "ORM" ? [] : OTA_CHANNELS.map((ota) => ({ id: rid(), card_id: card.id, ota_channel: ota, property_name: card.property_name, hotel_id: card.property_id, username: "", password: "", commission: "" }));
export const credentialComplete = (c: HandoverCredential) => !!(c.username.trim() && c.password.trim() && c.commission.trim());

/* ---------------- checklist template seed (§2.3 A–F) — PM-managed, patchable ---------------- */

let _tplSeq = 0;
const tpl = (
  stage_key: string,
  service_variant: ServiceVariant,
  group_label: string,
  item_label: string,
  field_type: FieldType = "tick",
): ChecklistTemplate => ({
  id: `tpl-${++_tplSeq}`,
  stage_key,
  service_variant,
  ota_channel: null,
  group_label,
  item_label,
  order: _tplSeq,
  has_two_tick: false,
  field_type,
});

export const CHECKLIST_TEMPLATE_SEED: ChecklistTemplate[] = [
  // (A) ORM Collect-Data — section-level, 9 sections, reads WS-2 form_completion_status
  ...[
    "ข้อมูลโรงแรม", "ข้อมูลเจ้าของ/ผู้ลงนาม", "บัญชีธนาคาร", "ช่องทาง OTA",
    "OTA credentials (user/pass ต่อ OTA)", "สิ่งอำนวยความสะดวก & บริการ", "ประเภทห้องพัก",
    "รายละเอียดห้อง/เตียง", "ข้อมูลสำหรับวิเคราะห์",
  ].map((label) => tpl("collect_data", "ORM", "AE Collect-Data (ORM · section-level)", label)),

  // (B) Marcom (MT) Collect-Data
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "แจ้งลูกค้าแอดไลน์ฝั่ง Marcom"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "แนะนำตัว+ส่งลิงก์ให้ลูกค้ากรอก (Prop info + Owner Interview)"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "เตรียมโฟลเดอร์รูป + แชร์ให้ที่พัก"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "ส่งคู่มือเพิ่ม access"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "ติดตามทีม Marcom ว่าเพิ่มสิทธิ์แล้วยัง"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "AE Collect-Data (Marcom)", "ดำเนินการตาม Prop info"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "Final Check", "ตรวจ Prop info+Owner Interview"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "Final Check", "รูปพอ+คุณภาพ"),
  tpl("collect_data", "MARCOM_META_TIKTOK", "Final Check", "แจ้งลูกค้าเพิ่มสิทธิ์เรียบร้อย"),

  // (C) Marcom (GMB) Collect-Data
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "Login Google Business"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "ชื่อโรงแรม"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "หมวดหมู่ (โรงแรม/รีสอร์ท)"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "เบอร์โทรศัพท์"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "เวลาทำการ"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "รูปภาพ (≥10)"),
  tpl("collect_data", "MARCOM_GMB", "AE Collect-Data (GMB)", "ข้อมูลด้านราคา"),

  // (D) ORM service stages
  tpl("orm_prepare_data", "ORM", "Prepare Data", "ทำ Revplus+"),
  tpl("orm_prepare_data", "ORM", "Prepare Data", "Rate Structure"),
  tpl("orm_rate_structure", "ORM", "Rate Structure Meeting", "ระบุวันนัดประชุม"),
  tpl("orm_rate_structure", "ORM", "Rate Structure Meeting", "แนบ record Google Meet"),
  tpl("orm_final_setup", "ORM", "Final Setup", "Send Summary"),
  tpl("orm_final_setup", "ORM", "Final Setup", "Load BAR Rate"),
  tpl("orm_final_setup", "ORM", "Final Setup", "Mapping"),
  tpl("orm_final_setup", "ORM", "Final Setup", "Request Forward booking"),
  tpl("orm_system_training", "ORM", "System Training", "สมัครคอร์ส"),
  tpl("orm_system_training", "ORM", "System Training", "นัดวันเทรน"),
  tpl("orm_system_training", "ORM", "System Training", "ยืนยันลูกค้าเข้าเรียน"),
  tpl("orm_go_live", "ORM", "Go Live", "ส่งอีเมลแจ้งลูกค้า"),

  // (E) Marcom (MT) service stages
  tpl("marcom_prepare_data", "MARCOM_META_TIKTOK", "Prepare Data", "Brand DNA Wall"),
  tpl("marcom_prepare_data", "MARCOM_META_TIKTOK", "Prepare Data", "Audience + Key Message"),
  tpl("marcom_prepare_data", "MARCOM_META_TIKTOK", "Prepare Data", "Content Plan 52 week"),
  tpl("marcom_prepare_data", "MARCOM_META_TIKTOK", "Prepare Data", "Ads Planning"),
  tpl("marcom_first_sync", "MARCOM_META_TIKTOK", "First Sync-up Meeting", "ระบุวันนัดประชุม"),
  tpl("marcom_first_sync", "MARCOM_META_TIKTOK", "First Sync-up Meeting", "แนบ record Google Meet"),
  tpl("marcom_go_live", "MARCOM_META_TIKTOK", "Go Live", "ส่งอีเมลแจ้งลูกค้า"),

  // (F) Marcom (GMB) service stages — marcom_prepare_data(GMB) = milestone only, no checklist
  tpl("marcom_go_live", "MARCOM_GMB", "Go Live", "คำอธิบาย"),
  tpl("marcom_go_live", "MARCOM_GMB", "Go Live", "Attributes"),
  tpl("marcom_go_live", "MARCOM_GMB", "Go Live", "Website/Social"),
  tpl("marcom_go_live", "MARCOM_GMB", "Go Live", "แนบลิงก์ Google My Business"),
  tpl("marcom_go_live", "MARCOM_GMB", "Go Live", "แนบลิงก์ IBE"),
];

export const instantiateChecklist = (cardId: string, variant: ServiceVariant, templates: ChecklistTemplate[]): ChecklistItem[] =>
  templates
    .filter((t) => t.service_variant === variant && !t.has_two_tick)
    .map((t) => ({ id: rid(), card_id: cardId, template_ref: t.id, label: t.item_label, group_label: t.group_label, stage_key: t.stage_key, checked: false, checked_at: null }));

/** v5.0 → v6.0 stage-key migration map, applied per variant to a reached legacy stage key. */
const LEGACY_STAGE_MAP: Record<ServiceVariant, Record<string, string>> = {
  ORM: {
    rate_structure_meeting: "orm_rate_structure",
    send_summary: "orm_final_setup",
    load_bar_rate: "orm_final_setup",
    mapping: "orm_final_setup",
    request_forward_booking: "orm_final_setup",
    register_training: "orm_system_training",
    go_live: "orm_go_live",
  },
  MARCOM_META_TIKTOK: {
    brand_dna_wall: "marcom_prepare_data",
    audience_key_message: "marcom_prepare_data",
    content_plan_52w: "marcom_prepare_data",
    ads_planning: "marcom_prepare_data",
    first_sync_up_meeting: "marcom_first_sync",
    go_live: "marcom_go_live",
  },
  MARCOM_GMB: {
    brand_dna_wall: "marcom_prepare_data",
    audience_key_message: "marcom_prepare_data",
    content_plan_52w: "marcom_prepare_data",
    ads_planning: "marcom_prepare_data",
    first_sync_up_meeting: "marcom_go_live", // GMB has no First Sync
    go_live: "marcom_go_live",
  },
};
export const migrateStageKey = (stage: string, variant: ServiceVariant) => LEGACY_STAGE_MAP[variant][stage] ?? stage;

/* ---------------- day math (§4) ---------------- */

const DAY = 86_400_000;
export const dateOnly = (iso: string | Date) => {
  const d = new Date(iso);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};
export const daysBetween = (a: string | Date, b: string | Date) => Math.round((dateOnly(b) - dateOnly(a)) / DAY);
export const fmtDayMon = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/* ---------------- state ---------------- */

type State = {
  cards: OnboardingCard[];
  events: StageEvent[];
  finalChecks: FinalCheckItem[];
  handover: HandoverItem[];
  handoverSurveys: HandoverSurvey[];
  customerSurveys: CustomerSurvey[];
  checklistTemplates: ChecklistTemplate[];
  checklistItems: ChecklistItem[];
  credentials: HandoverCredential[];
  roomMappings: RoomMapping[];
};
const KEY = "meridia.ps.servicing.v5_0";
const rid = () => Math.random().toString(36).slice(2, 10);
const isoAt = (base: number, d: number) => new Date(base + d * DAY).toISOString();

function buildCard(
  s: State,
  opts: {
    id: string;
    property_id: string;
    name: string;
    line: ServiceLine;
    variant?: ServiceVariant;
    ref: string;
    createdDaysAgo: number;
    gaps: number[]; // gap (days) before each subsequent stage
    pending?: number; // inserts property_pending with this gap after collect_data
  },
) {
  const variant: ServiceVariant = opts.variant ?? (opts.line === "ORM" ? "ORM" : "MARCOM_META_TIKTOK");
  const created = Date.now() - opts.createdDaysAgo * DAY;
  const seq = fullSequence(variant);
  if (opts.pending !== undefined) seq.splice(3, 0, "property_pending");
  const reached = seq.slice(0, opts.gaps.length + 1);
  let cursor = 0;
  const events: StageEvent[] = reached.map((stage, i) => {
    if (i > 0) cursor += (opts.gaps[i - 1] ?? 0);
    return { id: rid(), card_id: opts.id, stage_key: stage, entered_at: isoAt(created, Math.min(cursor, opts.createdDaysAgo)), owner_track: trackOf(stage) };
  });
  const at = (k: string) => events.find((e) => e.stage_key === k)?.entered_at ?? null;
  const anchor = BILLING_ANCHOR_VARIANT[variant];
  const card: OnboardingCard = {
    id: opts.id,
    property_id: opts.property_id,
    property_name: opts.name,
    service_line: opts.line,
    service_variant: variant,
    external_app: externalAppFor(opts.line),
    external_ref_url: null,
    contract_ref: opts.ref,
    created_at: new Date(created).toISOString(),
    current_stage: reached[reached.length - 1] ?? "new_property",
    assigned_ae_id: "AE · Ploy",
    assigned_specialist_id: "Specialist · Mint",
    assigned_service_owner_id: opts.line === "ORM" ? "ORM · Boss" : "Marcom · Fah",
    billing_start_at: at(anchor),
    billing_anchor_stage: anchor,
    go_live_at: at("go_live"),
    meeting_record_url: at("completed") ? "https://meet.google.com/rec-" + opts.id.toLowerCase() : null,
    pre_service_form_ref: `WS2-${opts.id}`,
    form_completion_status: at("final_check") ? "complete" : at("collect_data") ? "in_progress" : "not_started",
  };
  s.cards.push(card);
  s.events.push(...events);
  const reachedStages = new Set(reached);
  const items = instantiateChecklist(opts.id, variant, s.checklistTemplates);
  const now = new Date().toISOString();
  for (const item of items) {
    if (reachedStages.has(item.stage_key) && item.stage_key !== card.current_stage) {
      item.checked = true;
      item.checked_at = at(item.stage_key) ?? now;
    }
  }
  s.checklistItems.push(...items);
  const approvedAt = at("approved");
  FINAL_CHECK_ITEMS.forEach((label) =>
    s.finalChecks.push({ id: rid(), card_id: opts.id, item_label: label, checked: !!approvedAt, checked_at: approvedAt }),
  );
  const completedAt = at("completed");
  handoverFromTemplates(opts.id, variant, s.checklistTemplates).forEach((h) =>
    s.handover.push({ ...h, specialist_checked: !!completedAt, specialist_checked_at: completedAt, verifier_checked: !!completedAt, verifier_checked_at: completedAt }),
  );
  credentialRows(card).forEach((c) =>
    s.credentials.push(completedAt ? { ...c, username: `hplus.${opts.id.toLowerCase()}`, password: "••••••••", commission: "15%" } : c),
  );
  if (completedAt && variant === "ORM")
    OTA_CHANNELS.forEach((ota) => s.roomMappings.push({ id: rid(), card_id: opts.id, original_room_name: "Deluxe Double", ota_channel: ota, ota_room_name: "Deluxe Double Room" }));
  if (completedAt) {
    const submitted = opts.createdDaysAgo % 2 === 0;
    s.handoverSurveys.push({
      id: rid(),
      card_id: opts.id,
      evaluatee_specialist_id: card.assigned_specialist_id,
      evaluator_service_id: card.assigned_service_owner_id,
      score: submitted ? 4 : null,
      comment: null,
      submitted_at: submitted ? completedAt : null,
      window_expires_at: new Date(new Date(completedAt).getTime() + 7 * DAY).toISOString(),
      status: submitted ? "submitted" : "pending",
    });
  }
  if (card.billing_start_at)
    s.customerSurveys.push({
      id: rid(),
      card_id: opts.id,
      dispatched_at: card.billing_start_at,
      responded_at: null,
      score_bd: null,
      score_ae: null,
      score_service_exp: null,
      score_strategy: null,
      nps: null,
      comment: null,
      optional: true,
    });
}

function seed(): State {
  const s: State = { cards: [], events: [], finalChecks: [], handover: [], handoverSurveys: [], customerSurveys: [], checklistTemplates: [...CHECKLIST_TEMPLATE_SEED, ...HANDOVER_TEMPLATE_SEED], checklistItems: [], credentials: [], roomMappings: [] };
  // full ORM path = 4 AE gaps + approved→completed + 5 service = 10 gaps; Marcom MT = 7, GMB = 6
  const live = (aeGaps: number[], spec: number, svc: number[]) => [...aeGaps, spec, ...svc];
  const GMB: ServiceVariant = "MARCOM_GMB";
  const MT: ServiceVariant = "MARCOM_META_TIKTOK";
  buildCard(s, { id: "OB-101", property_id: "P-01", name: "Hotel Aurora BKK", line: "ORM", ref: "#1", createdDaysAgo: 120, gaps: live([2, 5, 6, 3], 4, [3, 2, 4, 5]) });
  buildCard(s, { id: "OB-102", property_id: "P-01", name: "Hotel Aurora BKK", line: "MARCOM", variant: MT, ref: "#2", createdDaysAgo: 120, gaps: live([2, 5, 6, 3], 5, [6, 5, 7]) });
  buildCard(s, { id: "OB-103", property_id: "P-02", name: "Sea Breeze Phuket", line: "ORM", ref: "#1", createdDaysAgo: 95, gaps: live([1, 4, 5, 2], 3, [2, 3, 3, 4]) });
  buildCard(s, { id: "OB-104", property_id: "P-02", name: "Sea Breeze Phuket", line: "MARCOM", variant: GMB, ref: "#2", createdDaysAgo: 95, gaps: [1, 4, 5, 2, 4] });
  buildCard(s, { id: "OB-105", property_id: "P-03", name: "42 Grand Residence", line: "ORM", ref: "#1", createdDaysAgo: 150, pending: 18, gaps: live([3, 6, 18, 9, 4], 6, [5, 4, 6, 8]) });
  buildCard(s, { id: "OB-106", property_id: "P-03", name: "42 Grand Residence", line: "MARCOM", variant: MT, ref: "#2", createdDaysAgo: 150, pending: 18, gaps: live([3, 6, 18, 9, 4], 5, [7, 6, 8]) });
  buildCard(s, { id: "OB-107", property_id: "P-04", name: "Chiang Mai Lanna Hill", line: "ORM", ref: "#1", createdDaysAgo: 80, gaps: live([2, 4, 4, 3], 3, [3, 2, 3, 4]) });
  buildCard(s, { id: "OB-108", property_id: "P-05", name: "Riverside Boutique", line: "ORM", ref: "#1", createdDaysAgo: 70, gaps: live([1, 5, 5, 2], 4, [2, 3, 4, 3]) });
  buildCard(s, { id: "OB-109", property_id: "P-06", name: "Hua Hin Coral Bay", line: "MARCOM", variant: GMB, ref: "#1", createdDaysAgo: 90, gaps: live([2, 4, 5, 3], 4, [5, 4]) });
  buildCard(s, { id: "OB-110", property_id: "P-07", name: "Pattaya Skyline", line: "ORM", ref: "#1", createdDaysAgo: 40, gaps: [2, 6, 7, 3, 2] });
  buildCard(s, { id: "OB-111", property_id: "P-08", name: "Krabi Cliff Villas", line: "MARCOM", variant: MT, ref: "#1", createdDaysAgo: 12, gaps: [2, 6] });
  buildCard(s, { id: "OB-112", property_id: "P-04", name: "Chiang Mai Lanna Hill", line: "MARCOM", variant: GMB, ref: "#2", createdDaysAgo: 3, gaps: [] });
  return s;
}


type CardInput = { property_name: string; service_line: ServiceLine; service_variant?: ServiceVariant | undefined; property_id?: string; contract_ref?: string; contract_code?: string; assigned_ae_id?: string | undefined };

/** One initializer for manual and contract-created cards, including checklist and first event. */
function insertNewCard(s: State, input: CardInput, id: string, now: string): State {
  const { property_name, service_line } = input;
  const service_variant: ServiceVariant = input.service_variant ?? (service_line === "ORM" ? "ORM" : "MARCOM_META_TIKTOK");
  const sibling = s.cards.find((c) => c.property_name.trim().toLowerCase() === property_name.trim().toLowerCase());
  const property_id = input.property_id ?? sibling?.property_id ?? `P-${rid()}`;
  const count = s.cards.filter((c) => c.property_id === property_id).length;
  const card: OnboardingCard = {
            id,
            property_id,
            property_name,
            service_line,
            service_variant,
            external_app: externalAppFor(service_line),
            external_ref_url: null,
            contract_ref: input.contract_ref ?? `#${count + 1}`,
             contract_code: input.contract_code ?? "",
             orm_lite: service_variant === "ORM" && /ORM-LITE/i.test(input.contract_code ?? input.contract_ref ?? ""),
             handover_otas: [],
             meeting_appointment_url: null,
            created_at: now,
            current_stage: "new_property",
            assigned_ae_id: input.assigned_ae_id ?? "AE · Ploy",
            assigned_specialist_id: "Specialist · Mint",
            assigned_service_owner_id: service_line === "ORM" ? "ORM · Boss" : "Marcom · Fah",
            billing_start_at: null,
            billing_anchor_stage: BILLING_ANCHOR_VARIANT[service_variant],
            go_live_at: null,
            meeting_record_url: null,
            pre_service_form_ref: null,
            form_completion_status: "not_started",
          };
          return {
            ...s,
            cards: [card, ...s.cards],
            checklistItems: [...s.checklistItems, ...instantiateChecklist(id, service_variant, s.checklistTemplates)],
            events: [...s.events, { id: rid(), card_id: id, stage_key: "new_property", entered_at: now, owner_track: "AE" }],
            finalChecks: [...s.finalChecks, ...FINAL_CHECK_ITEMS.map((l) => ({ id: rid(), card_id: id, item_label: l, checked: false, checked_at: null }))],
            handover: [...s.handover, ...handoverFromTemplates(id, service_variant, s.checklistTemplates)],
            credentials: [...(s.credentials ?? []), ...credentialRows(card)],
          };
}

/* ---------------- computed helpers ---------------- */

export const eventsOf = (s: Pick<State, "events">, id: string) =>
  s.events.filter((e) => e.card_id === id).sort((a, b) => a.entered_at.localeCompare(b.entered_at));

export function sums(card: OnboardingCard, events: StageEvent[]) {
  const at = (k: string) => events.find((e) => e.stage_key === k)?.entered_at ?? null;
  const fc = at("final_check");
  const ap = at("approved");
  const co = at("completed");
  return {
    ae: fc ? daysBetween(card.created_at, fc) : null,
    specialist: ap && co ? daysBetween(ap, co) : null,
    service: ap && card.go_live_at ? daysBetween(ap, card.go_live_at) : null,
    overall: card.go_live_at ? daysBetween(card.created_at, card.go_live_at) : null,
  };
}
/** Simulated signed-in AE for own-only AE surfaces (workflow simulation, not auth). */
export const CURRENT_AE = "AE · Ploy";
export const AE_STAGES = new Set(["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"]);
export const currentDay = (card: OnboardingCard) => daysBetween(card.created_at, card.go_live_at ?? new Date());
export const bottleneck = (s: ReturnType<typeof sums>): OwnerTrack | null => {
  const opts: [OwnerTrack, number | null][] = [
    ["AE", s.ae],
    ["SPECIALIST", s.specialist],
    ["SERVICE", s.service],
  ];
  const valid = opts.filter((o): o is [OwnerTrack, number] => o[1] !== null);
  if (!valid.length) return null;
  return valid.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};
export const surveyStatus = (h: HandoverSurvey): HandoverSurvey["status"] =>
  h.status === "pending" && Date.now() > new Date(h.window_expires_at).getTime() ? "expired" : h.status;

export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}

/* ---------------- provider ---------------- */

type Ctx = State & {
  hydrated: boolean;
  role: Role;
  setRole: (r: Role) => void;
  test_mode: boolean;
  setTestMode: (enabled: boolean) => void;
  createFromContract: (input: { deal_id: string; contract_id: string | null; contract_service_line: "ORM" | "MARCOM" | "BOTH" | null; hotel_id: string | null; property_name: string; assigned_ae_id?: string; service_variant?: ServiceVariant; contract_code?: string }) => { ok: boolean; created: string[] } ;
  createCard: (input: { property_name: string; service_line: ServiceLine; service_variant?: ServiceVariant }) => string;
  toggleChecklistItem: (itemId: string) => void;
  setHandoverOtas: (cardId: string, otas: string[]) => void;
  setMeetingAppointment: (cardId: string, url: string) => void;
  addTemplateItem: (stage_key: string, service_variant: ServiceVariant, group_label: string, item_label: string) => void;
  renameTemplateItem: (templateId: string, item_label: string) => void;
  removeTemplateItem: (templateId: string) => void;
  advance: (cardId: string, opts?: { to?: string; meetingUrl?: string }) => { ok: boolean; error?: string };
  canAdvance: (cardId: string) => { ok: boolean; reason?: string; reasons?: string[] };
  toggleFinalCheck: (itemId: string) => void;
  toggleHandover: (itemId: string, col: "specialist" | "verifier") => void;
  addHandover: (cardId: string, label: string) => void;
  editHandover: (itemId: string, label: string) => void;
  deleteHandover: (itemId: string) => void;
  submitHandoverSurvey: (id: string, score: number, comment: string) => void;
  setCredential: (id: string, patch: Partial<Pick<HandoverCredential, "hotel_id" | "username" | "password" | "commission">>) => void;
  addRoom: (cardId: string, name: string) => void;
  removeRoom: (cardId: string, name: string) => void;
  setRoomMapping: (id: string, ota_room_name: string) => void;
  addHandoverTemplate: (ota_channel: string, group_label: string, item_label: string) => void;
  submitCustomerSurvey: (id: string, patch: Partial<CustomerSurvey>) => void;
  setFormStatus: (cardId: string, st: FormStatus) => void;
  reset: () => void;
};
const C = createContext<Ctx | null>(null);

export function ServicingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ cards: [], events: [], finalChecks: [], handover: [], handoverSurveys: [], customerSurveys: [], checklistTemplates: [...CHECKLIST_TEMPLATE_SEED, ...HANDOVER_TEMPLATE_SEED], checklistItems: [], credentials: [], roomMappings: [] }));
  const stateRef = useRef(state);
  stateRef.current = state;
  const [role, setRole] = useState<Role>("specialist");
  const [testMode, setTestModeState] = useState(false);
  const test_mode = import.meta.env.DEV && testMode;
  const setTestMode = useCallback((enabled: boolean) => {
    if (!import.meta.env.DEV) return;
    setTestModeState(enabled);
    localStorage.setItem("meridia.ps.servicing.uat.test_mode", String(enabled));
  }, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      try {
        setTestModeState(localStorage.getItem("meridia.ps.servicing.uat.test_mode") !== "false");
      } catch {
        setTestModeState(true);
      }
    }
    try {
      const raw = localStorage.getItem(KEY);
      const loaded = raw ? (JSON.parse(raw) as State) : seed();
      const baseTemplates = loaded.checklistTemplates ?? CHECKLIST_TEMPLATE_SEED;
      const templates = baseTemplates.some((t) => t.has_two_tick) ? baseTemplates : [...baseTemplates, ...HANDOVER_TEMPLATE_SEED];
      let handover = [...(loaded.handover ?? [])];
      const credentials = [...(loaded.credentials ?? [])];
      const roomMappings = [...(loaded.roomMappings ?? [])];
      const items = [...(loaded.checklistItems ?? [])];
      const cards = loaded.cards.map((card) => {
        const service_variant: ServiceVariant = card.service_variant ?? (card.service_line === "ORM" ? "ORM" : "MARCOM_META_TIKTOK");
        if (!items.some((i) => i.card_id === card.id)) {
          const fresh = instantiateChecklist(card.id, service_variant, templates);
          const reached = new Set((loaded.events ?? []).filter((e) => e.card_id === card.id).map((e) => migrateStageKey(e.stage_key, service_variant)));
          const now = new Date().toISOString();
          for (const it of fresh) {
            if (reached.has(it.stage_key) && it.stage_key !== migrateStageKey(card.current_stage, service_variant)) {
              it.checked = true;
              it.checked_at = now;
            }
          }
          items.push(...fresh);
        }
        // v6.0 P2: ORM cards not yet Completed move to the OTA handover template; past cards keep their history.
        const reachedCompleted = (loaded.events ?? []).some((e) => e.card_id === card.id && e.stage_key === "completed");
        if (service_variant === "ORM" && !reachedCompleted && !handover.some((h) => h.card_id === card.id && h.ota_channel)) {
          handover = [...handover.filter((h) => h.card_id !== card.id), ...handoverFromTemplates(card.id, service_variant, templates)];
        }
        if (service_variant === "ORM" && !credentials.some((c) => c.card_id === card.id)) credentials.push(...credentialRows({ ...card, service_variant }));
        return {
          ...card,
          service_variant,
          contract_code: card.contract_code ?? "",
          orm_lite: service_variant === "ORM" && (card.orm_lite ?? /ORM-LITE/i.test(card.contract_code ?? card.contract_ref)),
          handover_otas: card.handover_otas ?? [],
          meeting_appointment_url: card.meeting_appointment_url ?? null,
          current_stage: migrateStageKey(card.current_stage, service_variant),
          billing_anchor_stage: BILLING_ANCHOR_VARIANT[service_variant],
          external_app: card.external_app ?? externalAppFor(card.service_line),
          external_ref_url: card.external_ref_url ?? null,
        };
      });
      setState({ ...loaded, cards, handover, credentials, roomMappings, checklistTemplates: templates, checklistItems: items });
    } catch {
      setState(seed());
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);
  /* scheduled check: flip pending → expired after the 7-day window */
  useEffect(() => {
    if (!hydrated) return;
    const tick = () =>
      setState((s) =>
        s.handoverSurveys.some((h) => surveyStatus(h) !== h.status)
          ? { ...s, handoverSurveys: s.handoverSurveys.map((h) => ({ ...h, status: surveyStatus(h) })) }
          : s,
      );
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [hydrated]);

  const createFromContract = useCallback<Ctx["createFromContract"]>((input) => {
    if (!input.contract_service_line || !input.hotel_id) return { ok: false, created: [] };
    const lines: ServiceLine[] = input.contract_service_line === "BOTH" ? ["ORM", "MARCOM"] : [input.contract_service_line];
    const ref = input.contract_id || input.deal_id;
    let next = stateRef.current;
    const created: string[] = [];
    const now = new Date().toISOString();
    for (const line of lines) {
      if (next.cards.some((card) => card.contract_ref === ref && card.service_line === line)) continue;
      const id = `OB-${rid()}-${Date.now()}`;
      const variant = line === "ORM" ? undefined : input.service_variant;
      next = insertNewCard(next, { property_name: input.property_name, service_line: line, service_variant: variant, property_id: input.hotel_id, contract_ref: ref, contract_code: input.contract_code, assigned_ae_id: input.assigned_ae_id }, id, now);
      created.push(id);
    }
    if (created.length) {
      stateRef.current = next;
      setState(next);
    }
    return { ok: true, created };
  }, []);

  const value = useMemo<Ctx>(() => {
    const gate = (s: State, cardId: string): { ok: boolean; reason?: string; reasons: string[] } => {
      const card = s.cards.find(c => c.id === cardId);
      if (!card) return { ok: false, reason: "ไม่พบการ์ด", reasons: ["ไม่พบการ์ด"] };
      const nxt = nextStage(card.service_variant, card.current_stage);
      const reasons: string[] = [];
      if (!nxt) reasons.push("Go Live แล้ว");
      else if (nxt === "approved") {
        const checks = s.finalChecks.filter(f => f.card_id === cardId);
        if (!checks.length) reasons.push("AE: เพิ่มรายการ Final Check ก่อนอนุมัติ");
        checks.filter(f => !f.checked).forEach(f => reasons.push(`AE: ตรวจ ${f.item_label}`));
        if (!["specialist", "pm"].includes(role)) reasons.push("Specialist / PM: เป็นผู้กด Approve หลัง AE ตรวจครบ");
      } else if (nxt === "completed") {
        if (card.service_variant === "ORM") {
          const progress = handoverProgress(s, card);
          if (!progress.selectionComplete) reasons.push("Specialist: เลือก OTA ให้ครบ 3 รายสำหรับ ORM-Lite");
          if (!progress.specialistDone) reasons.push("Specialist: ติ๊ก Handover OTA ให้ครบทุกช่องทางที่เลือก");
          if (!progress.credentialsDone) reasons.push("Specialist: กรอก Hotel ID และ OTA Log-in ให้ครบ");
          if (!progress.roomsDone) reasons.push("Specialist: จับคู่ชื่อห้องกับทุก OTA ที่เลือกให้ครบ");
        }
        if (role !== "specialist") reasons.push("Specialist: เป็นผู้กด Completed");
      } else if (card.service_variant === "ORM" && card.current_stage === "completed") {
        if (!handoverProgress(s, card).verifierDone) reasons.push("ORM: ตรวจรับ Handover ทุกช่องทางที่เลือกก่อน Prepare Data");
        if (role !== "service") reasons.push("ORM: เป็นผู้เริ่ม Prepare Data หลังตรวจรับ");
      } else if (card.service_variant === "ORM" && nxt === "orm_rate_structure") {
        if (!validMeetingUrl(card.meeting_appointment_url)) reasons.push("ORM: ใส่ลิงก์นัดประชุม (http/https) ก่อน Rate Structure");
        if (role !== "service") reasons.push("ORM: เป็นผู้ยืนยัน Rate Structure");
      } else if (["new_property", "introduction_sent_form", "collect_data", "property_pending"].includes(card.current_stage)) {
        if (role !== "ae") reasons.push("AE: เป็นผู้ดำเนินขั้นตอนข้อมูลโรงแรม");
      } else if (role !== "service") reasons.push("Service: เป็นผู้ทำและยืนยันขั้นตอนบริการนี้");
      return { ok: reasons.length === 0, ...(reasons[0] ? { reason: reasons[0] } : {}), reasons };
    };
    return {
      ...state,
      hydrated,
      role,
      setRole,
      test_mode,
      setTestMode,
      createFromContract,
      canAdvance: (id) => gate(state, id),
      createCard: ({ property_name, service_line, service_variant }) => {
        const id = `OB-${rid()}-${Date.now()}`;
        const next = insertNewCard(stateRef.current, { property_name, service_line, service_variant }, id, new Date().toISOString());
        stateRef.current = next;
        setState(next);
        return id;
      },
      advance: (cardId, opts) => {
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return { ok: false, error: "ไม่พบการ์ด" };
        const g = gate(state, cardId);
        const nxt = nextStage(card.service_variant, card.current_stage);
        const to = opts?.to ?? nxt;
        const pending = to === "property_pending" && card.current_stage === "collect_data" && role === "ae";
        if (!pending && to !== nxt) return { ok: false, error: "ดำเนินการได้เฉพาะขั้นถัดไป" };
        if (!pending && !g.ok) return { ok: false, error: g.reasons.join(" · ") };
        if (!to) return { ok: false, error: "ไม่มีขั้นถัดไป" };
        if (to === "completed" && card.service_variant !== "ORM") {
          try { const url = new URL(opts?.meetingUrl?.trim() ?? ""); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
          catch { return { ok: false, error: "Specialist: ใส่ลิงก์ Meeting record (http/https)" }; }
        }
        const now = new Date().toISOString();
        setState((s) => {
          const current = s.cards.find(c => c.id === cardId);
          if (current?.current_stage !== card.current_stage || s.events.some(e => e.card_id === cardId && e.stage_key === to)) return s;
          const ev: StageEvent = { id: rid(), card_id: cardId, stage_key: to, entered_at: now, owner_track: trackOf(to) };
          const isAnchor = to === card.billing_anchor_stage;
          return {
            ...s,
            events: [...s.events, ev],
            cards: s.cards.map((c) =>
              c.id !== cardId
                ? c
                : {
                    ...c,
                    current_stage: to,
                    ...(to === "go_live" ? { go_live_at: now } : {}),
                    ...(isAnchor ? { billing_start_at: now } : {}),
                    ...(to === "completed" && card.service_variant !== "ORM" ? { meeting_record_url: opts?.meetingUrl ?? null } : {}),
                  },
            ),
            handoverSurveys:
              to === "completed" && card.service_variant !== "ORM"
                ? [
                    ...s.handoverSurveys,
                    {
                      id: rid(),
                      card_id: cardId,
                      evaluatee_specialist_id: card.assigned_specialist_id,
                      evaluator_service_id: card.assigned_service_owner_id,
                      score: null,
                      comment: null,
                      submitted_at: null,
                      window_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
                      status: "pending",
                    },
                  ]
                : s.handoverSurveys,
            customerSurveys: isAnchor
              ? [
                  ...s.customerSurveys,
                  {
                    id: rid(),
                    card_id: cardId,
                    dispatched_at: now,
                    responded_at: null,
                    score_bd: null,
                    score_ae: null,
                    score_service_exp: null,
                    score_strategy: null,
                    nps: null,
                    comment: null,
                    optional: true,
                  },
                ]
              : s.customerSurveys,
          };
        });
        return { ok: true };
      },
      toggleFinalCheck: (itemId) => {
        if (!test_mode && role !== "ae") return;
        setState((s) => ({
          ...s,
          finalChecks: s.finalChecks.map((f) =>
            f.id === itemId ? { ...f, checked: !f.checked, checked_at: f.checked ? null : new Date().toISOString() } : f,
          ),
        }));
      },
      toggleHandover: (itemId, col) => {
        if (!test_mode && (col === "specialist" ? role !== "specialist" : role !== "service")) return;
        setState((s) => {
          const item = s.handover.find((h) => h.id === itemId);
          const card = s.cards.find((c) => c.id === item?.card_id);
          if (!item || !card || card.service_variant !== "ORM") return s;
          if (col === "specialist" ? card.current_stage !== "approved" : card.current_stage !== "completed" || !item.specialist_checked) return s;
          if (item.ota_channel && !handoverOtas(card).includes(item.ota_channel)) return s;
          const now = new Date().toISOString();
          const handover = s.handover.map((h) => h.id !== itemId ? h : col === "specialist"
            ? { ...h, specialist_checked: !h.specialist_checked, specialist_checked_at: h.specialist_checked ? null : now }
            : { ...h, verifier_checked: !h.verifier_checked, verifier_checked_at: h.verifier_checked ? null : now });
          const next = { ...s, handover };
          if (col === "verifier" && handoverProgress(next, card).verifierDone && !s.handoverSurveys.some((h) => h.card_id === card.id)) {
            return { ...next, handoverSurveys: [...s.handoverSurveys, { id: rid(), card_id: card.id, evaluatee_specialist_id: card.assigned_specialist_id, evaluator_service_id: card.assigned_service_owner_id, score: null, comment: null, submitted_at: null, window_expires_at: new Date(Date.now() + 7 * DAY).toISOString(), status: "pending" as const }] };
          }
          return next;
        });
      },
      addHandover: (cardId, label) =>
        setState((s) => ({
          ...s,
          handover: [
            ...s.handover,
            { id: rid(), card_id: cardId, item_label: label, specialist_checked: false, specialist_checked_at: null, verifier_checked: false, verifier_checked_at: null },
          ],
        })),
      editHandover: (itemId, label) =>
        setState((s) => ({ ...s, handover: s.handover.map((h) => (h.id === itemId ? { ...h, item_label: label } : h)) })),
      deleteHandover: (itemId) => setState((s) => ({ ...s, handover: s.handover.filter((h) => h.id !== itemId) })),
      submitHandoverSurvey: (id, score, comment) => {
        const survey = state.handoverSurveys.find(h => h.id === id);
        if (!survey || surveyStatus(survey) !== "pending" || role !== "service" || score < 1 || score > 5) return;
        setState((s) => ({
          ...s,
          handoverSurveys: s.handoverSurveys.map((h) =>
            h.id === id ? { ...h, score, comment, submitted_at: new Date().toISOString(), status: "submitted" } : h,
          ),
        }));
      },
      submitCustomerSurvey: (id, patch) =>
        setState((s) => ({
          ...s,
          customerSurveys: s.customerSurveys.map((c) => (c.id === id ? { ...c, ...patch, responded_at: new Date().toISOString() } : c)),
        })),
      setFormStatus: (cardId, st) => {
        if (role !== "ae") return;
        setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, form_completion_status: st } : c)) }));
      },
      toggleChecklistItem: (itemId) => {
        const item = state.checklistItems.find((i) => i.id === itemId);
        if (!item) return;
        const owner = item.stage_key === "collect_data" ? "ae" : "service";
        if (!test_mode && role !== owner) return;
        setState((s) => ({
          ...s,
          checklistItems: s.checklistItems.map((i) =>
            i.id === itemId ? { ...i, checked: !i.checked, checked_at: i.checked ? null : new Date().toISOString() } : i,
          ),
        }));
      },
      addTemplateItem: (stage_key, service_variant, group_label, item_label) => {
        if (role !== "pm") return;
        setState((s) => ({
          ...s,
          checklistTemplates: [
            ...s.checklistTemplates,
            { id: rid(), stage_key, service_variant, ota_channel: null, group_label, item_label, order: s.checklistTemplates.length + 1, has_two_tick: false, field_type: "tick" },
          ],
        }));
      },
      renameTemplateItem: (templateId, item_label) => {
        if (role !== "pm") return;
        setState((s) => ({ ...s, checklistTemplates: s.checklistTemplates.map((t) => (t.id === templateId ? { ...t, item_label } : t)) }));
      },
      removeTemplateItem: (templateId) => {
        if (role !== "pm") return;
        setState((s) => ({ ...s, checklistTemplates: s.checklistTemplates.filter((t) => t.id !== templateId) }));
      },
      setHandoverOtas: (cardId, otas) => {
        if (role !== "specialist") return;
        setState((s) => {
          const card = s.cards.find((c) => c.id === cardId);
          const selected = OTA_CHANNELS.filter((ota) => otas.includes(ota));
          if (!card?.orm_lite || card.current_stage !== "approved" || selected.length > 3) return s;
          const names = [...new Set(s.roomMappings.filter((m) => m.card_id === cardId).map((m) => m.original_room_name))];
          const fresh = names.flatMap((name) => selected.filter((ota) => !s.roomMappings.some((m) => m.card_id === cardId && m.original_room_name === name && m.ota_channel === ota)).map((ota) => ({ id: rid(), card_id: cardId, original_room_name: name, ota_channel: ota, ota_room_name: "" })));
          return { ...s, cards: s.cards.map((c) => c.id === cardId ? { ...c, handover_otas: selected } : c), roomMappings: [...s.roomMappings, ...fresh] };
        });
      },
      setMeetingAppointment: (cardId, url) => {
        if (!["specialist", "service"].includes(role)) return;
        setState((s) => ({ ...s, cards: s.cards.map((c) => c.id === cardId && c.service_variant === "ORM" && fullSequence("ORM").indexOf(c.current_stage) >= fullSequence("ORM").indexOf("approved") ? { ...c, meeting_appointment_url: url } : c) }));
      },
      setCredential: (id, patch) => {
        if (role !== "specialist") return;
        const credential = state.credentials.find((c) => c.id === id);
        if (!state.cards.some((c) => c.id === credential?.card_id && c.current_stage === "approved")) return;
        setState((s) => ({ ...s, credentials: s.credentials.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },
      addRoom: (cardId, name) => {
        if (role !== "specialist" || !name.trim()) return;
        const card = state.cards.find((c) => c.id === cardId);
        if (!card || card.current_stage !== "approved") return;
        setState((s) => s.roomMappings.some((m) => m.card_id === cardId && m.original_room_name.toLowerCase() === name.trim().toLowerCase()) ? s : ({
          ...s,
          roomMappings: [...s.roomMappings, ...handoverOtas(card).map((ota) => ({ id: rid(), card_id: cardId, original_room_name: name.trim(), ota_channel: ota, ota_room_name: "" }))],
        }));
      },
      removeRoom: (cardId, name) => {
        if (role !== "specialist") return;
        if (!state.cards.some((c) => c.id === cardId && c.current_stage === "approved")) return;
        setState((s) => ({ ...s, roomMappings: s.roomMappings.filter((m) => !(m.card_id === cardId && m.original_room_name === name)) }));
      },
      setRoomMapping: (id, ota_room_name) => {
        if (role !== "specialist") return;
        const mapping = state.roomMappings.find((m) => m.id === id);
        if (!state.cards.some((c) => c.id === mapping?.card_id && c.current_stage === "approved")) return;
        setState((s) => ({ ...s, roomMappings: s.roomMappings.map((m) => (m.id === id ? { ...m, ota_room_name } : m)) }));
      },
      addHandoverTemplate: (ota_channel, group_label, item_label) => {
        if (role !== "pm") return;
        setState((s) => ({
          ...s,
          checklistTemplates: [...s.checklistTemplates, { id: rid(), stage_key: "handover", service_variant: "ORM", ota_channel, group_label, item_label, order: s.checklistTemplates.length + 1000, has_two_tick: true, field_type: "tick" }],
        }));
      },
      reset: () => setState(seed()),
    };
  }, [state, hydrated, role, test_mode, setTestMode, createFromContract]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useServicing = () => {
  const c = useContext(C);
  if (!c) throw new Error("useServicing must be used inside ServicingProvider");
  return c;
};
