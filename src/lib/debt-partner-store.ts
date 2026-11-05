/* Debt Partner R1 — browser storage for the 9 Partner collections + one-way Cloud mirror.
 * Live: localStorage key `meridia.<collection>.v1` per collection; every write stages Cloud doc `partner:<collection>`
 * through the existing Cloud Sync engine (push-only, debounced, revision guard).
 * DEMO: one in-memory bundle (src/lib/debt-partner-demo.ts), never written to real storage, never mirrored.
 * Shared helpers for PM Workspace / AC App / AE Workspace: usePartnerData(), getPartnerData(), and the PM writers below.
 * AC-owned collections have no writer in this pass. "PM only" = testing role switcher (simulation, not security). */
import { useSyncExternalStore } from 'react';
import { stageCloudDoc } from './cloud-sync';
import { createTask } from './tickets-l0';
import { PARTNER_COLLECTIONS, emptyPartnerData, type PartnerCollection, type PartnerData, type PartnerDeal, type PartnerRateCard, type PartnerRateCardTier } from './debt-partner-types';
import { partnerDemoData } from './debt-partner-demo';

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

/** Follow the PS Dashboard DEMO switch (shared DEMO-state helper). Turning DEMO on starts a fresh in-memory bundle. */
export function setPartnerDemo(on: boolean) {
  if (on === demoOn) return;
  demoOn = on; if (on) demo = partnerDemoData();
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
