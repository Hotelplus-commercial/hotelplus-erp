/* AE Workspace System Cost / Shut-off v1.0 (AW1–AW8) — pure read helpers. Every number comes from the shared Partner
 * calculations (getContractSystemCost / getPrepaidUntil / monthsOver / creditRows); no local formula, no writes. */
import { creditRows, getContractSystemCost, getPrepaidUntil, monthsOver, type PartnerContract } from './debt-partner-calc';
import type { PartnerData } from './debt-partner-types';
import { partnerContracts } from './partner-contracts';
import { OPEN_STATUSES, type L0Ticket } from './tickets-l0';
import { shutoffAe, shutoffTwin } from './partner-workspace';

export const CYCLE_TH: Record<string, string> = { MONTHLY: 'รายเดือน', ADVANCE_3M: 'ล่วงหน้า 3 เดือน', ADVANCE_6M: 'ล่วงหน้า 6 เดือน', ANNUAL: 'รายปี' };
export const AW_TH = {
  tile: 'ต้นทุนค่าระบบ',
  info: 'ค่าระบบที่ H+ จ่าย Partner สำหรับสัญญานี้ (ลูกค้าไม่ได้จ่าย) · ราคาตามขั้น allotment ใน Rate Card หักส่วนลดที่มีผล · วันจ่ายล่วงหน้ามาจากบิล Partner ที่ AC บันทึก',
  marcom: 'ไม่มีค่าระบบ (Marcom)',
  noSystem: 'ยังไม่ระบุระบบ · แจ้ง PM',
  group: 'ปิด / เปิดระบบ',
  shut: 'ขอปิดระบบ', react: 'ขอเปิดระบบคืน',
  start: 'เริ่มทำ', done: 'เสร็จแล้ว',
  softConfirm: 'ทีมบริการยังไม่ปิดงาน · ยืนยันปิดฝั่ง AE?',
};

type CardLike = { id: string; hotel: string; hotelId: string; contractEnd: string; contract_id?: string | undefined; service?: 'ORM' | 'Marcom' | undefined };
const iso = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** Renewal card → Partner contract (same list as PM Workspace / AC App); unknown → card facts (no system). */
export function cardPartnerContract(d: PartnerData, demo: boolean, card: CardLike): PartnerContract {
  const cid = card.contract_id ?? card.id.replace(/^RN-/, '');
  const hit = partnerContracts(d, demo).find((c) => c.contract_id === cid);
  if (hit) return hit;
  return { contract_id: cid, hotel: card.hotel, service: card.service ?? 'ORM', allotment: null, property_id: card.hotelId, start: null, end: iso(card.contractEnd), end_reason: null };
}

export type CostTile =
  | { kind: 'MARCOM' } | { kind: 'NO_SYSTEM' }
  | { kind: 'COST'; partner: string; system: string; currency: string; net: number; base: number; discounted: boolean; est_thb: number | null;
      discounts: { label: string; start: string | null }[]; cycle: string | null; prepaid_until: string | null; months_over: number; fallback_tier: boolean };

export function costTile(d: PartnerData, c: PartnerContract, today: string): CostTile {
  if (c.service === 'Marcom') return { kind: 'MARCOM' };
  const cost = getContractSystemCost(d, c, today);
  if (!cost) return { kind: 'NO_SYSTEM' };
  const until = getPrepaidUntil(d, c.contract_id);
  const card = d.partner_rate_cards.find((r) => r.partner_id === cost.partner_id && r.system_name === cost.system && r.superseded_at == null);
  const discounts = cost.discounts.map((x) => {
    const deal = d.partner_deals.find((y) => y.id === x.deal_id);
    const label = deal?.benefit_type === 'PERCENT' ? `${deal.benefit_value ?? 0}%` : `${cost.currency === 'THB' ? '฿' : `${cost.currency} `}${Math.round(x.amount).toLocaleString('en-US')}`;
    return { label, start: deal?.start_date ?? null };
  });
  return { kind: 'COST', partner: cost.partner, system: cost.system, currency: cost.currency, net: cost.net, base: cost.base, discounted: cost.net < cost.base,
    est_thb: cost.currency !== 'THB' && cost.est_fx_to_thb ? Math.round(cost.net * cost.est_fx_to_thb) : null, discounts,
    cycle: card ? CYCLE_TH[card.billing_cycle] ?? card.billing_cycle : null, prepaid_until: until,
    months_over: until && c.end ? monthsOver(c.end, until) : 0, fallback_tier: cost.fallback_tier };
}

/** AW3: ไม่ต่อ + ORM + prepaid beyond end → the same DP-O3 numbers PM Workspace "รอส่งคำขอ" shows. Saves nothing. */
export function keepCreditWarning(d: PartnerData, c: PartnerContract): { prepaid_until: string; months_over: number; amount: number; partner: string } | null {
  if (c.service !== 'ORM' || !c.end) return null;
  const until = getPrepaidUntil(d, c.contract_id);
  if (!until || until <= c.end.slice(0, 10)) return null;
  const probe = { ...d, system_credit_requests: d.system_credit_requests.filter((r) => r.contract_id !== c.contract_id) };
  const row = creditRows(probe, [{ ...c, end_reason: 'NOT_RENEWED' }], until).find((r) => r.kind === 'DERIVED');
  return row && row.kind === 'DERIVED' ? { prepaid_until: row.prepaid_until, months_over: row.months_over, amount: row.amount, partner: row.partner } : null;
}

/* ---------- My Day group 🔌 (AW5–AW8) ---------- */
/** "AE001-Nont" / "hr-1" / "Nont" all name the same AE. */
export const sameAe = (currentUser: string, member: string | null, nick: string | null) => {
  const tail = currentUser.split('-').pop() ?? currentUser;
  return (!!member && (member === currentUser || member === tail)) || (!!nick && (nick === currentUser || nick === tail));
};
export type AeShutoffItem = { t: L0Ticket; title: string; team: 'ORM' | 'Marcom'; teamState: 'กำลังทำ' | 'เสร็จ'; days: number; service: string };
export function aeShutoffItems(all: L0Ticket[], currentUser: string, propAe: (hotel_id: string) => string | null | undefined, today: string): AeShutoffItem[] {
  return all
    .filter((t) => (t.type === 'SYSTEM_SHUTOFF' || t.type === 'SYSTEM_REACTIVATE') && t.target_dept === 'PS' && OPEN_STATUSES.includes(t.status))
    .filter((t) => { const a = shutoffAe(t, propAe(t.subject_ref.hotel_id)); return sameAe(currentUser, a.member_id, a.nickname); })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((t) => {
      const twin = shutoffTwin(all, t);
      const team = twin?.target_dept === 'MARCOM' || t.subject_ref.service_line === 'Marcom' ? 'Marcom' as const : 'ORM' as const;
      const days = Math.max(0, Math.round((Date.parse(today.slice(0, 10)) - Date.parse(t.created_at.slice(0, 10))) / 86400000));
      return { t, title: `${t.type === 'SYSTEM_SHUTOFF' ? AW_TH.shut : AW_TH.react} · ${t.subject_ref.hotel_name}`, team, teamState: twin?.status === 'DONE' ? 'เสร็จ' : 'กำลังทำ', days, service: t.subject_ref.service_line ?? team };
    });
}
/** AE actions without ACK: NEW → เริ่มทำ (IN_PROGRESS) → เสร็จแล้ว (DONE). Only the owning AE. */
export function aeNextAction(t: L0Ticket, isOwner: boolean): { to: 'IN_PROGRESS' | 'DONE'; label: string } | null {
  if (!isOwner) return null;
  if (t.status === 'NEW') return { to: 'IN_PROGRESS', label: AW_TH.start };
  if (t.status === 'IN_PROGRESS' || t.status === 'ACK') return { to: 'DONE', label: AW_TH.done };
  return null;
}
