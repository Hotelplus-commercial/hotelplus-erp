/* Debt Partner R1 — browser storage for the 9 Partner collections + one-way Cloud mirror.
 * Live: localStorage key `meridia.<collection>.v1` per collection; every write stages Cloud doc `partner:<collection>`
 * through the existing Cloud Sync engine (push-only, debounced, revision guard).
 * DEMO: one in-memory bundle (src/lib/debt-partner-demo.ts), never written to real storage, never mirrored.
 * Shared helpers for PM Workspace / AC App / AE Workspace: usePartnerData(), getPartnerData(), and the PM writers below.
 * AC-owned collections have no writer in this pass. "PM only" = testing role switcher (simulation, not security). */
import { useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { createTask } from './tickets-l0';
import { PARTNER_COLLECTIONS, emptyPartnerData, PARTNER_ATTACHMENT_KINDS, type PartnerAttachment, type PartnerCollection, type PartnerData, type PartnerDeal, type PartnerRateCard, type PartnerRateCardTier, type PropertyPartnerSystem, type SystemCreditRequest } from './debt-partner-types';
import { partnerDemoData } from './debt-partner-demo';
import { deletePartnerFile, getPartnerFile, partnerFileError, putPartnerFile, setPartnerFilesMemoryOnly } from './partner-files';

export const PARTNER_STORAGE_KEY = (c: PartnerCollection) => `meridia.${c}.v1`;
export const PARTNER_DOC_KEY = (c: PartnerCollection) => `partner:${c}`;

let demoOn = false;
let demo: PartnerData = partnerDemoData();
let live: PartnerData | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

function loadLive(): PartnerData {
  if (live) return live;
  const d = emptyPartnerData();
  if (typeof localStorage !== 'undefined') {
    for (const c of PARTNER_COLLECTIONS) {
      try { const v = JSON.parse(localStorage.getItem(PARTNER_STORAGE_KEY(c)) ?? '[]'); if (Array.isArray(v)) (d as Record<string, unknown[]>)[c] = v; } catch { /* keep empty */ }
    }
  }
  live = d; return d;
}
export const getPartnerData = (): PartnerData => (demoOn ? demo : loadLive());
export const isPartnerDemo = () => demoOn;
/** Read for a given mode without switching (e.g. the §9 renewal rows on another tab). */
export const partnerDataFor = (isDemo: boolean): PartnerData => (isDemo ? demo : loadLive());

/** Follow the PS Dashboard DEMO switch (shared DEMO-state helper). Turning DEMO on starts a fresh in-memory bundle. */
export function setPartnerDemo(on: boolean) {
  if (on === demoOn) return;
  demoOn = on; if (on) demo = partnerDemoData();
  setPartnerFilesMemoryOnly(on); // v1.2: DEMO uploads stay in memory

  emit();
}

function write<C extends PartnerCollection>(c: C, rows: PartnerData[C]) {
  if (demoOn) { demo = { ...demo, [c]: rows }; emit(); return; }
  const d = { ...loadLive(), [c]: rows }; live = d;
  try { localStorage.setItem(PARTNER_STORAGE_KEY(c), JSON.stringify(rows)); } catch { /* quota */ }
  stageCloudDoc(PARTNER_DOC_KEY(c), { items: rows });
  emit();
}

export function usePartnerData(): PartnerData {
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => version, () => 0);
  return getPartnerData();
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

/* ---------------- PM writers (partners, rate cards + tiers, deals) ---------------- */

export function addPartner(name: string, by: string): { ok: true; id: string } | { ok: false; error: string } {
  const n = name.trim(); if (!n) return { ok: false, error: 'ใส่ชื่อ Partner' };
  const d = getPartnerData();
  const hit = d.partners.find((p) => p.name.toLowerCase() === n.toLowerCase());
  if (hit) return { ok: true, id: hit.id };
  const id = uid('PTN'); void by;
  write('partners', [...d.partners, { id, name: n, created_at: nowIso() }]);
  return { ok: true, id };
}

/* ---------------- PM Workspace Partner v1.1 §3.2 — attachments on partners (same collection, Cloud mirror follows) ---------------- */
export type PartnerAttachmentInput = { name: string; kind: string; url: string; note?: string };
export function partnerAttachmentError(i: PartnerAttachmentInput): string | null {
  if (!i.name.trim()) return 'ใส่ชื่อเอกสาร';
  if (!(PARTNER_ATTACHMENT_KINDS as readonly string[]).includes(i.kind)) return 'เลือกประเภทเอกสาร';
  if (!/^https:\/\/\S+$/.test(i.url.trim())) return 'ลิงก์ไฟล์ต้องขึ้นต้นด้วย https://';
  return null;
}
type AttRes = { ok: true; id: string } | { ok: false; error: string };
function editAttachments(partnerId: string, fn: (a: PartnerAttachment[]) => PartnerAttachment[] | null): boolean {
  const d = getPartnerData(); const p = d.partners.find((x) => x.id === partnerId); if (!p) return false;
  const next = fn(p.attachments ?? []); if (!next) return false;
  write('partners', d.partners.map((x) => (x.id === partnerId ? { ...x, attachments: next } : x)));
  return true;
}
const clean = (i: PartnerAttachmentInput) => ({ name: i.name.trim(), kind: i.kind as PartnerAttachment['kind'], url: i.url.trim(), ...(i.note?.trim() ? { note: i.note.trim() } : {}) });
export function addPartnerAttachment(partnerId: string, i: PartnerAttachmentInput, by: string): AttRes {
  const e = partnerAttachmentError(i); if (e) return { ok: false, error: e };
  const id = uid('ATT');
  return editAttachments(partnerId, (a) => [...a, { id, ...clean(i), added_by: by, added_at: nowIso() }]) ? { ok: true, id } : { ok: false, error: 'ไม่พบ Partner' };
}
export function updatePartnerAttachment(partnerId: string, attachmentId: string, i: PartnerAttachmentInput): AttRes {
  /* v1.2: uploaded files have no link — edit keeps url / file fields, changes name, kind, note only. */
  const ex = getPartnerData().partners.find((p) => p.id === partnerId)?.attachments?.find((a) => a.id === attachmentId);
  if (ex?.source === 'UPLOAD') {
    const e = partnerAttachmentError({ ...i, url: 'https://x' }); if (e) return { ok: false, error: e };
    return editAttachments(partnerId, (a) => a.map((x) => { if (x.id !== attachmentId) return x; const { note: _n, ...rest } = x; void _n; return { ...rest, name: i.name.trim(), kind: i.kind as PartnerAttachment['kind'], ...(i.note?.trim() ? { note: i.note.trim() } : {}) }; }))
      ? { ok: true, id: attachmentId } : { ok: false, error: 'ไม่พบเอกสาร' };
  }
  const e = partnerAttachmentError(i); if (e) return { ok: false, error: e };
  return editAttachments(partnerId, (a) => (a.some((x) => x.id === attachmentId) ? a.map((x) => { if (x.id !== attachmentId) return x; const { note: _n, ...rest } = x; void _n; return { ...rest, ...clean(i) }; }) : null))
    ? { ok: true, id: attachmentId } : { ok: false, error: 'ไม่พบเอกสาร' };
}
export function removePartnerAttachment(partnerId: string, attachmentId: string): AttRes {
  /* v1.2 §4.5: deleting an uploaded item also deletes its local bytes. */
  const ref = getPartnerData().partners.find((p) => p.id === partnerId)?.attachments?.find((a) => a.id === attachmentId)?.file_ref;
  if (ref) void deletePartnerFile(ref);
  return editAttachments(partnerId, (a) => (a.some((x) => x.id === attachmentId) ? a.filter((x) => x.id !== attachmentId) : null))
    ? { ok: true, id: attachmentId } : { ok: false, error: 'ไม่พบเอกสาร' };
}
/* ---------------- PM Workspace Partner v1.2 — edit Partner, uploads, delivery to the storage location ---------------- */
export type PartnerInfoInput = { name: string; contact_name?: string; contact_email?: string; contact_phone?: string; doc_folder_url?: string; note?: string };
export function partnerInfoError(id: string, i: PartnerInfoInput): string | null {
  const n = i.name.trim(); if (!n) return 'ใส่ชื่อ Partner';
  if (getPartnerData().partners.some((p) => p.id !== id && p.name.toLowerCase() === n.toLowerCase())) return 'มี Partner ชื่อนี้แล้ว';
  if (i.doc_folder_url?.trim() && !/^https:\/\/\S+$/.test(i.doc_folder_url.trim())) return 'ที่เก็บเอกสารต้องขึ้นต้นด้วย https://';
  if (i.contact_email?.trim() && !/^\S+@\S+\.\S+$/.test(i.contact_email.trim())) return 'อีเมลไม่ถูกต้อง';
  return null;
}
/** Edit Partner (name / contact / storage location / note). Empty optional field = removed. */
export function updatePartner(id: string, i: PartnerInfoInput): AttRes {
  const err = partnerInfoError(id, i); if (err) return { ok: false, error: err };
  const d = getPartnerData(); if (!d.partners.some((p) => p.id === id)) return { ok: false, error: 'ไม่พบ Partner' };
  const keys = ['contact_name', 'contact_email', 'contact_phone', 'doc_folder_url', 'note'] as const;
  write('partners', d.partners.map((p) => {
    if (p.id !== id) return p;
    const next = { ...p, name: i.name.trim() } as Record<string, unknown>;
    for (const k of keys) { const v = i[k]?.trim(); if (v) next[k] = v; else delete next[k]; }
    return next as unknown as typeof p;
  }));
  return { ok: true, id };
}
/** Uploads: bytes go to the local file store; metadata (PENDING) goes to the partners collection. */
export async function addPartnerUploads(partnerId: string, files: File[], kind: string, by: string): Promise<{ added: string[]; errors: string[] }> {
  if (!(PARTNER_ATTACHMENT_KINDS as readonly string[]).includes(kind)) return { added: [], errors: ['เลือกประเภทเอกสาร'] };
  const errors: string[] = []; const items: PartnerAttachment[] = [];
  for (const f of files) {
    const e = partnerFileError(f); if (e) { errors.push(e); continue; }
    const id = uid('ATT'); const file_ref = uid('FILE');
    await putPartnerFile(file_ref, f);
    items.push({ id, name: f.name, kind: kind as PartnerAttachment['kind'], url: '', added_by: by, added_at: nowIso(), source: 'UPLOAD', file_ref, size: f.size, mime: f.type || 'application/octet-stream', storage_status: 'PENDING' });
  }
  if (items.length && !editAttachments(partnerId, (a) => [...a, ...items])) return { added: [], errors: [...errors, 'ไม่พบ Partner'] };
  return { added: items.map((x) => x.id), errors };
}
/** Status of an item (v1.1 link items = LINK + STORED). */
export const attachmentStatus = (a: PartnerAttachment): 'STORED' | 'PENDING' | 'LINK' =>
  a.source === 'UPLOAD' ? (a.storage_status === 'STORED' ? 'STORED' : 'PENDING') : 'LINK';
/** The one delivery function (§4.4). Google Drive not connected → leaves PENDING. When a Drive connector exists,
 *  only this function changes: upload the bytes to the Partner's doc_folder_url, then mark STORED + stored_url. */
export type PartnerDriveConnector = (folderUrl: string, file: Blob, name: string) => Promise<string>;
export async function deliverPartnerFile(partnerId: string, attachmentId: string, connector: PartnerDriveConnector | null = null): Promise<{ ok: true; stored_url: string } | { ok: false; reason: 'NOT_CONNECTED' | 'NO_FOLDER' | 'NOT_FOUND' }> {
  if (!connector) return { ok: false, reason: 'NOT_CONNECTED' };
  const p = getPartnerData().partners.find((x) => x.id === partnerId); const a = p?.attachments?.find((x) => x.id === attachmentId);
  if (!p || !a?.file_ref) return { ok: false, reason: 'NOT_FOUND' };
  if (!p.doc_folder_url) return { ok: false, reason: 'NO_FOLDER' };
  const blob = await getPartnerFile(a.file_ref); if (!blob) return { ok: false, reason: 'NOT_FOUND' };
  const stored_url = await connector(p.doc_folder_url, blob, a.name);
  editAttachments(partnerId, (all) => all.map((x) => (x.id === attachmentId ? { ...x, storage_status: 'STORED', stored_url } : x)));
  return { ok: true, stored_url };
}

/** Newest first. */
export const partnerAttachments = (d: PartnerData, partnerId: string): PartnerAttachment[] =>
  [...(d.partners.find((p) => p.id === partnerId)?.attachments ?? [])].sort((a, b) => b.added_at.localeCompare(a.added_at));

export type RateCardInput = Omit<PartnerRateCard, 'id' | 'superseded_at' | 'created_at'> & { tiers: Omit<PartnerRateCardTier, 'id' | 'rate_card_id'>[] };
/** Save = new version; the current version of the same partner + system gets superseded_at = new effective_from. */
export function saveRateCard(i: RateCardInput): { ok: true; id: string } | { ok: false; error: string } {
  const err = rateCardError(i); if (err) return { ok: false, error: err };
  const d = getPartnerData(); const id = uid('RC'); const at = nowIso();
  const cards = d.partner_rate_cards.map((r) => (r.partner_id === i.partner_id && r.system_name === i.system_name && r.superseded_at == null ? { ...r, superseded_at: i.effective_from } : r));
  const { tiers, ...card } = i;
  write('partner_rate_cards', [...cards, { ...card, id, superseded_at: null, created_at: at }]);
  write('partner_rate_card_tiers', [...d.partner_rate_card_tiers, ...tiers.map((t) => ({ ...t, id: uid('TIER'), rate_card_id: id }))]);
  return { ok: true, id };
}
export function rateCardError(i: RateCardInput): string | null {
  if (!i.partner_id) return 'เลือก Partner';
  if (!i.system_name.trim()) return 'ใส่ชื่อระบบ';
  if (!i.effective_from) return 'ใส่วันเริ่มใช้ราคานี้';
  if (!i.tiers.length) return 'ใส่ราคาขั้นบันไดอย่างน้อย 1 ขั้น';
  for (const t of i.tiers) {
    if (!(t.price_per_contract_month >= 0) || Number.isNaN(t.price_per_contract_month)) return 'ใส่ราคาต่อสัญญา / เดือนให้ครบทุกขั้น';
    if (t.allotment_max != null && t.allotment_max < t.allotment_min) return 'allotment สิ้นสุดต้องไม่น้อยกว่าเริ่มต้น';
  }
  if (i.currency !== 'THB' && i.est_fx_to_thb != null && !(i.est_fx_to_thb > 0)) return 'อัตรา estimate THB ต้องมากกว่า 0';
  return null;
}

export type DealInput = Omit<PartnerDeal, 'id' | 'ac_ticket_id' | 'created_at' | 'updated_at'> & { id?: string };
export function dealError(i: DealInput): string | null {
  if (!i.partner_id) return 'เลือก Partner';
  if (!i.title.trim()) return 'ใส่รายละเอียดข้อตกลง';
  if (i.status === 'SUCCESS' && !i.start_date) return 'ใส่วันเริ่มมีผลก่อนบันทึกสถานะสำเร็จ';
  if (i.start_date && i.end_date && i.end_date < i.start_date) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มมีผล';
  if (i.benefit_type !== 'OTHER' && (i.benefit_value == null || !(i.benefit_value > 0))) return 'ใส่มูลค่าสิทธิประโยชน์';
  if (i.benefit_type === 'PERCENT' && (i.benefit_value ?? 0) > 100) return 'ส่วนลด % ต้องไม่เกิน 100';
  if (i.scope === 'SELECTED' && !i.contract_ids.length) return 'เลือกสัญญาอย่างน้อย 1 สัญญา';
  return null;
}

/** Insert / update a deal. SUCCESS or FAILED → one PARTNER_DEAL_NOTICE ticket (target AC) via Ticket L0 createTask
 *  (dedup on open tickets of the same deal; editing after AC acknowledged opens a new notice). */
export function saveDeal(i: DealInput): { ok: true; id: string; ticket_id: string | null } | { ok: false; error: string } {
  const err = dealError(i); if (err) return { ok: false, error: err };
  const d = getPartnerData(); const at = nowIso();
  const prev = i.id ? d.partner_deals.find((x) => x.id === i.id) : undefined;
  const id = prev?.id ?? uid('DEAL');
  let ac_ticket_id = prev?.ac_ticket_id ?? null;
  if (i.status === 'SUCCESS' || i.status === 'FAILED') {
    const partner = d.partners.find((p) => p.id === i.partner_id)?.name ?? i.partner_id;
    const r = createTask({
      type: 'PARTNER_DEAL_NOTICE', target_dept: 'AC', created_by: 'PM',
      subject_ref: { hotel_id: `PARTNER:${i.partner_id}`, hotel_name: partner, gap_service: 'PARTNER', deal_id: id },
      payload: { readiness_tier: '', chips: [i.kind, i.status], note: i.title },
    });
    ac_ticket_id = r.ticket_id;
  }
  const { id: _drop, ...body } = i; void _drop;
  const row: PartnerDeal = { ...body, id, ac_ticket_id, created_at: prev?.created_at ?? at, updated_at: at };
  write('partner_deals', prev ? d.partner_deals.map((x) => (x.id === id ? row : x)) : [...d.partner_deals, row]);
  return { ok: true, id, ticket_id: ac_ticket_id };
}

/* ---------------- PM Workspace Partner v1.0 — PM writers (property system, keep-credit requests) ---------------- */

export type PropertySystemInput = { property_id: string; partner_id: string; system_name: string; effective_from: string; allotment: number | null; set_by: string; note?: string | null };
export function propertySystemError(i: PropertySystemInput): string | null {
  if (!i.property_id) return 'ไม่พบโรงแรม';
  if (!i.partner_id || !i.system_name) return 'เลือกระบบ';
  if (!/^\d{4}-\d{2}-\d{2}/.test(i.effective_from)) return 'ใส่วันที่เริ่มใช้';
  if (i.allotment != null && (!Number.isFinite(i.allotment) || i.allotment < 0)) return 'allotment ต้องเป็นตัวเลขไม่ติดลบ';
  return null;
}
/** Insert one property_partner_system row (history kept; never edits old rows). */
export function setPropertySystem(i: PropertySystemInput): { ok: true; id: string } | { ok: false; error: string } {
  const err = propertySystemError(i); if (err) return { ok: false, error: err };
  const d = getPartnerData(); const id = uid('PPS');
  const row: PropertyPartnerSystem = { id, property_id: i.property_id, partner_id: i.partner_id, system_name: i.system_name, effective_from: i.effective_from.slice(0, 10), allotment: i.allotment, set_by: i.set_by, set_at: nowIso(), note: i.note?.trim() || null };
  write('property_partner_system', [...d.property_partner_system, row]);
  return { ok: true, id };
}

export type CreditRequestInput = Pick<SystemCreditRequest, 'contract_id' | 'partner_id' | 'contract_end_date' | 'prepaid_until' | 'months_over' | 'amount' | 'currency'> & { note?: string; attachment_url?: string; by: string; at?: string };
/** "บันทึกว่าส่งคำขอแล้ว" — one REQUESTED row per contract. */
export function recordCreditRequest(i: CreditRequestInput): { ok: true; id: string } | { ok: false; error: string } {
  if (!(i.amount >= 0) || Number.isNaN(i.amount)) return { ok: false, error: 'ใส่มูลค่าที่ขอ' };
  const d = getPartnerData();
  if (d.system_credit_requests.some((r) => r.contract_id === i.contract_id)) return { ok: false, error: 'สัญญานี้บันทึกคำขอแล้ว' };
  const id = uid('CR'); const at = i.at ?? nowIso();
  const row: SystemCreditRequest = { id, contract_id: i.contract_id, partner_id: i.partner_id, contract_end_date: i.contract_end_date, prepaid_until: i.prepaid_until, months_over: i.months_over, amount: i.amount, currency: i.currency,
    status: 'REQUESTED', requested_at: at, decided_at: null, credit_expires_at: null, ac_ticket_id: null, created_by: i.by, requested_by: i.by, note: i.note?.trim() || null, attachment_url: i.attachment_url?.trim() || null };
  write('system_credit_requests', [...d.system_credit_requests, row]);
  return { ok: true, id };
}

export type CreditAnswerInput = { id: string; result: 'APPROVED' | 'REJECTED'; approved_amount: number | null; credit_expires_at: string | null; answer_attachment_url?: string; note?: string; hotel: string; by: string; at?: string };
export function creditAnswerError(i: CreditAnswerInput): string | null {
  if (i.result === 'APPROVED') {
    if (i.approved_amount == null || !(i.approved_amount > 0)) return 'ใส่มูลค่าที่ได้จริง';
    if (!i.credit_expires_at) return 'ใส่วันที่เครดิตใช้ได้ถึง';
  }
  return null;
}
/** "บันทึกผลจาก Partner" — APPROVED / REJECTED + one SYSTEM_CREDIT_NOTICE ticket to AC (Ticket L0 createTask). */
export function recordCreditAnswer(i: CreditAnswerInput): { ok: true; ticket_id: string } | { ok: false; error: string } {
  const err = creditAnswerError(i); if (err) return { ok: false, error: err };
  const d = getPartnerData(); const r = d.system_credit_requests.find((x) => x.id === i.id);
  if (!r) return { ok: false, error: 'ไม่พบคำขอ' };
  if (r.status !== 'REQUESTED') return { ok: false, error: 'คำขอนี้บันทึกผลแล้ว' };
  const partner = d.partners.find((p) => p.id === r.partner_id)?.name ?? r.partner_id;
  const approved = i.result === 'APPROVED';
  const t = createTask({
    type: 'SYSTEM_CREDIT_NOTICE', target_dept: 'AC', created_by: 'PM',
    subject_ref: { hotel_id: `CONTRACT:${r.contract_id}`, hotel_name: i.hotel || r.contract_id, gap_service: 'PARTNER', deal_id: `CR:${r.id}`, contract_id: r.contract_id },
    payload: { readiness_tier: '', chips: [approved ? 'Partner อนุมัติ' : 'Partner ปฏิเสธ'], note: i.note?.trim() ?? '', contract_id: r.contract_id,
      credit_notice: { contract: r.contract_id, partner, result: i.result, approved_amount: approved ? i.approved_amount : null, currency: r.currency, credit_expires_at: approved ? i.credit_expires_at : null } },
  });
  const row: SystemCreditRequest = { ...r, status: i.result, decided_at: i.at ?? nowIso(), approved_amount: approved ? i.approved_amount : null, credit_expires_at: approved ? i.credit_expires_at : null,
    answer_attachment_url: i.answer_attachment_url?.trim() || null, note: i.note?.trim() || r.note || null, ac_ticket_id: t.ticket_id };
  write('system_credit_requests', d.system_credit_requests.map((x) => (x.id === r.id ? row : x)));
  return { ok: true, ticket_id: t.ticket_id };
}
