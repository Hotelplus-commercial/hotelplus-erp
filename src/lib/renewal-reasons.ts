/* Tab R2 §10.1 — `renewal_reasons` (new collection, browser-local like Ticket L0; demo = in-memory).
 * One record per non-renewal / early termination: 2 primary + 1 secondary label (R1 catalog keys, bad labels
 * of groups 1–7) + optional note. Editable for RENEWAL_REASON_EDIT_DAYS by the owning AE or PM; never deleted. */
import { useSyncExternalStore } from 'react';
import { REASON_KEYS, validPick } from './renewal-r2';
import type { Svc } from './contract-tab-r1';

export const RENEWAL_REASON_EDIT_DAYS = 7;
export type ReasonActor = { member_id: string; display: string; role: string };
export type RenewalReason = {
  id: string; contract_id: string; service: Svc; renewal_card_id?: string | null; outcome: 'NOT_RENEWED' | 'LOST';
  primary: [string, string]; secondary: string; note?: string | undefined;
  created_by: ReasonActor; created_at: string; updated_by?: ReasonActor; updated_at?: string; editable_until: string;
};

const KEY = 'meridia.renewal-reasons.v1';
let live: RenewalReason[] | null = null; let demo: RenewalReason[] | null = null; let demoOn = false; let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };
function liveList(): RenewalReason[] {
  if (live) return live;
  try { live = JSON.parse(localStorage.getItem(KEY) ?? '[]') as RenewalReason[]; } catch { live = []; }
  if (!Array.isArray(live)) live = [];
  return live;
}
const cur = () => (demoOn ? (demo ??= []) : liveList());
function commit(list: RenewalReason[]) {
  if (demoOn) demo = list; else { live = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ } }
  emit();
}
/** Demo on = fresh in-memory copy of the seed (reset only when DEMO toggles). */
export function setReasonsDemo(on: boolean, seed: () => RenewalReason[] = () => []) {
  if (on === demoOn) return;
  demoOn = on; demo = on ? seed() : null; emit();
}
export const isReasonsDemo = () => demoOn;
export function useRenewalReasons(): RenewalReason[] {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => 0);
  return cur();
}
export const readReasons = () => cur();
export const reasonFor = (list: RenewalReason[], contractId: string, cardId?: string | null) =>
  list.find((r) => r.contract_id === contractId) ?? (cardId ? list.find((r) => r.renewal_card_id === cardId) : undefined) ?? null;

export const editableUntil = (createdAt: string) => new Date(Date.parse(createdAt) + RENEWAL_REASON_EDIT_DAYS * 864e5).toISOString();
type Out = { ok: true; rec: RenewalReason } | { ok: false; error: string };
export function recordReason(input: { contract_id: string; service: Svc; renewal_card_id?: string | null; outcome: 'NOT_RENEWED' | 'LOST'; picks: string[]; note?: string; by: ReasonActor }, now: string): Out {
  if (!validPick(input.picks)) return { ok: false, error: 'เลือกเหตุผลให้ครบ 3 ป้าย' };
  const list = cur();
  if (reasonFor(list, input.contract_id, input.renewal_card_id)) return { ok: false, error: 'สัญญานี้บันทึกเหตุผลแล้ว' };
  const [p1, p2, s] = input.picks as [string, string, string];
  const rec: RenewalReason = {
    id: `RR-REASON-${String(list.length + 1).padStart(4, '0')}-${Date.parse(now).toString(36)}`, contract_id: input.contract_id, service: input.service,
    renewal_card_id: input.renewal_card_id ?? null, outcome: input.outcome, primary: [p1, p2], secondary: s, ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    created_by: input.by, created_at: now, editable_until: editableUntil(now),
  };
  commit([...list, rec]);
  return { ok: true, rec };
}
export function editReason(id: string, picks: string[], note: string, by: ReasonActor, now: string): Out {
  const list = cur(); const r = list.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'ไม่พบบันทึก' };
  if (now > r.editable_until) return { ok: false, error: 'เกิน 7 วันแล้ว · ล็อก' };
  if (!validPick(picks)) return { ok: false, error: 'เลือกเหตุผลให้ครบ 3 ป้าย' };
  const [p1, p2, s] = picks as [string, string, string];
  const next: RenewalReason = { ...r, primary: [p1, p2], secondary: s, note: note.trim() || undefined, updated_by: by, updated_at: now };
  commit(list.map((x) => (x.id === id ? next : x)));
  return { ok: true, rec: next };
}
export { REASON_KEYS };
