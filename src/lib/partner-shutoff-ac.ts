/* AC App Partner Bills v1.0 §4 (AX10 / AX11) — ขอปิดระบบ (AC presses) + automatic ขอเปิดระบบคืน.
 * Tickets only through the Layer 0 write path (createTask / systemCancel / patchTicketPayload). Collection logic is never
 * changed here: the reactivation hook only reads the existing SUSPENDED → REACTIVATED events. */
import type { CollectionEvent } from './ac-v2-engine';
import { OPEN_STATUSES, createTask, patchTicketPayload, systemCancel, ticketSnapshot, transition, type L0Ticket } from './tickets-l0';

export type ShutoffInput = {
  contract_id: string; hotel_id: string; hotel_name: string; service_line: 'ORM' | 'Marcom'; partner: string | null; system_name: string | null;
  assigned_ae: string | null; outstanding: number; overdue_cycles: number; note: string;
};
const cidOf = (t: L0Ticket) => t.subject_ref.contract_id ?? t.payload.contract_id ?? null;
export const serviceDept = (s: 'ORM' | 'Marcom') => (s === 'Marcom' ? 'MARCOM' as const : 'ORM' as const);
export const SHUTOFF_CANCEL_NOTE = 'ลูกค้าชำระครบ ยกเลิกคำขอปิดระบบ';

/** Open SYSTEM_SHUTOFF tickets of this contract (the button is hidden while any is open). */
export const openShutoffs = (all: L0Ticket[], contractId: string) => all.filter((t) => t.type === 'SYSTEM_SHUTOFF' && cidOf(t) === contractId && OPEN_STATUSES.includes(t.status));

function mk(type: 'SYSTEM_SHUTOFF' | 'SYSTEM_REACTIVATE', dept: 'ORM' | 'MARCOM' | 'PS', i: ShutoffInput, key: string, extra: { reactivated_at?: string; auto?: boolean } = {}) {
  return createTask({
    type, target_dept: dept, created_by: 'AC', source_app: 'AC_APP',
    subject_ref: { hotel_id: i.hotel_id, hotel_name: i.hotel_name, gap_service: serviceDept(i.service_line), service_line: i.service_line, contract_id: i.contract_id, deal_id: `${type === 'SYSTEM_SHUTOFF' ? 'SHUTOFF' : 'REACTIVATE'}:${dept}:${i.contract_id}${key}` },
    payload: { readiness_tier: '', chips: [type === 'SYSTEM_SHUTOFF' ? 'ขอปิดระบบ' : 'ขอเปิดระบบคืน'], note: i.note, contract_id: i.contract_id,
      assigned_ae: i.assigned_ae ? { member_id: '', nickname: i.assigned_ae } : null, unassigned_owner: dept === 'PS' && !i.assigned_ae,
      shutoff: { ...i, twin_ticket_id: null, ...extra } },
  });
}
function link(a: string, b: string, base: L0Ticket['payload']['shutoff']) {
  if (!base) return;
  patchTicketPayload(a, { shutoff: { ...base, twin_ticket_id: b } });
  patchTicketPayload(b, { shutoff: { ...base, twin_ticket_id: a } });
}

/** AX10: two linked SYSTEM_SHUTOFF tickets — service team (ORM / MARCOM) + PS. Refused while one is open. */
export function requestShutoff(i: ShutoffInput): { ok: true; team: string; ps: string } | { ok: false; error: string } {
  const open = openShutoffs(ticketSnapshot(), i.contract_id);
  if (open.length) return { ok: false, error: `มีคำขอปิดระบบเปิดอยู่แล้ว #${open[0]!.ticket_id}` };
  const n = ticketSnapshot().filter((t) => t.type === 'SYSTEM_SHUTOFF' && cidOf(t) === i.contract_id).length;
  const key = n ? `:${n + 1}` : '';
  const team = mk('SYSTEM_SHUTOFF', serviceDept(i.service_line), i, key);
  const ps = mk('SYSTEM_SHUTOFF', 'PS', i, key);
  link(team.ticket_id, ps.ticket_id, { ...i, twin_ticket_id: null });
  return { ok: true, team: team.ticket_id, ps: ps.ticket_id };
}

/** SUSPENDED → REACTIVATED (automatic, by the existing recompute) events that are new in `next`. */
export function newReactivations(prev: CollectionEvent[], next: CollectionEvent[]) {
  const seen = new Set(prev.map((e) => e.id));
  const out: { customer_id: string; reactivated_at: string; suspended_at: string }[] = [];
  for (let k = 0; k < next.length; k++) {
    const e = next[k]!;
    if (seen.has(e.id) || e.event_type !== 'REACTIVATED' || e.by_member !== 'daily') continue;
    const before = next.slice(k + 1).find((x) => x.customer_id === e.customer_id);
    if (before?.event_type !== 'SUSPENDED') continue;
    out.push({ customer_id: e.customer_id, reactivated_at: e.occurred_at, suspended_at: before.occurred_at });
  }
  return out;
}

/** AX11: for each contract with a SYSTEM_SHUTOFF created in this suspension → cancel the open ones with a note and
 *  open two SYSTEM_REACTIVATE tickets to the same destinations. No shut-off in this suspension → nothing. */
export function onReactivated(contractIds: string[], suspendedAt: string, reactivatedAt: string): { cancelled: string[]; created: string[] } {
  const cancelled: string[] = [], created: string[] = [];
  for (const cid of contractIds) {
    const all = ticketSnapshot();
    const shut = all.filter((t) => t.type === 'SYSTEM_SHUTOFF' && cidOf(t) === cid && t.created_at.slice(0, 10) >= suspendedAt.slice(0, 10));
    if (!shut.length) continue;
    if (all.some((t) => t.type === 'SYSTEM_REACTIVATE' && cidOf(t) === cid && t.payload.shutoff?.reactivated_at === reactivatedAt)) continue;
    for (const t of shut) if (OPEN_STATUSES.includes(t.status) && systemCancel(t.ticket_id, SHUTOFF_CANCEL_NOTE)) cancelled.push(t.ticket_id);
    const src = shut.find((t) => t.payload.shutoff)?.payload.shutoff;
    const team = shut.find((t) => t.target_dept !== 'PS');
    const i: ShutoffInput = src
      ? { contract_id: cid, hotel_id: src.hotel_id, hotel_name: src.hotel_name, service_line: src.service_line, partner: src.partner, system_name: src.system_name, assigned_ae: src.assigned_ae, outstanding: 0, overdue_cycles: 0, note: '' }
      : { contract_id: cid, hotel_id: shut[0]!.subject_ref.hotel_id, hotel_name: shut[0]!.subject_ref.hotel_name, service_line: team?.target_dept === 'MARCOM' ? 'Marcom' : 'ORM', partner: null, system_name: null, assigned_ae: shut[0]!.payload.assigned_ae?.nickname ?? null, outstanding: 0, overdue_cycles: 0, note: '' };
    const key = `:${reactivatedAt.slice(0, 10)}`;
    const a = mk('SYSTEM_REACTIVATE', serviceDept(i.service_line), i, key, { reactivated_at: reactivatedAt, auto: true });
    const b = mk('SYSTEM_REACTIVATE', 'PS', i, key, { reactivated_at: reactivatedAt, auto: true });
    link(a.ticket_id, b.ticket_id, { ...i, twin_ticket_id: null, reactivated_at: reactivatedAt, auto: true });
    created.push(a.ticket_id, b.ticket_id);
  }
  return { cancelled, created };
}

/* ---------- §8 DEMO (in-memory ticket store only; DEMO day 28 Oct 26) ----------
 * Chaba Grand: shut-off ORM กำลังทำ / PS เสร็จ · Sala Talay Resort: no ticket (shows the button) ·
 * Baan Rim Nam (demo): reactivated 27 Oct 26 (shift from 1 Nov 26) after a DONE shut-off → 2 SYSTEM_REACTIVATE New ·
 * AC notices: PARTNER_DEAL_NOTICE (Hotelier.guru −30%) New · SYSTEM_CREDIT_NOTICE (Lanna View ปฏิเสธ) New. */
export const AC_DEMO = {
  chaba: { contract_id: 'CT-DMO-0001', hotel_id: 'HP-CT-DMO-0001', hotel_name: 'Chaba Grand', service_line: 'ORM' as const, partner: 'Hotelier.guru', system_name: 'RMS Pro', assigned_ae: 'Nont', outstanding: 90000, overdue_cycles: 2, note: '' },
  reactivated: { contract_id: 'CT-DMO-RA01', hotel_id: 'HP-CT-DMO-RA01', hotel_name: 'Baan Rim Nam', service_line: 'ORM' as const, partner: 'StayLink', system_name: 'Channel Manager', assigned_ae: 'Dao', outstanding: 26000, overdue_cycles: 2, note: '' },
  reactivated_at: '2026-10-27', suspended_at: '2026-09-20',
};
export function seedAcBillsDemo() {
  const all = ticketSnapshot();
  if (all.some((t) => t.type === 'PARTNER_DEAL_NOTICE' && t.subject_ref.deal_id === 'DEAL-01')) return; // already seeded in this DEMO store
  const ch = requestShutoff(AC_DEMO.chaba);
  if (ch.ok) { transition(ch.team, 1, 'IN_PROGRESS', 'ORM'); transition(ch.ps, 1, 'IN_PROGRESS', 'PS'); const t = ticketSnapshot().find((x) => x.ticket_id === ch.ps); if (t) transition(t.ticket_id, t.revision, 'DONE', 'PS'); }
  const ra = requestShutoff(AC_DEMO.reactivated);
  if (ra.ok) for (const [id, d] of [[ra.team, 'ORM'], [ra.ps, 'PS']] as const) { transition(id, 1, 'IN_PROGRESS', d); const t = ticketSnapshot().find((x) => x.ticket_id === id); if (t) transition(id, t.revision, 'DONE', d); }
  onReactivated([AC_DEMO.reactivated.contract_id], AC_DEMO.suspended_at, AC_DEMO.reactivated_at);
  createTask({ type: 'PARTNER_DEAL_NOTICE', target_dept: 'AC', created_by: 'PM',
    subject_ref: { hotel_id: 'PARTNER:PTN-HG', hotel_name: 'Hotelier.guru', gap_service: 'PARTNER', deal_id: 'DEAL-01' },
    payload: { readiness_tier: '', chips: ['ส่วนลดค่าระบบ', 'สำเร็จ'], note: 'ลดค่าระบบ RMS Pro 30%',
      deal_notice: { partner: 'Hotelier.guru', kind: 'ส่วนลดค่าระบบ', benefit: '−30%', period: '1 Oct 26 – ไม่มีกำหนด', status: 'สำเร็จ', attachment_url: '' } } });
  createTask({ type: 'SYSTEM_CREDIT_NOTICE', target_dept: 'AC', created_by: 'PM',
    subject_ref: { hotel_id: 'CONTRACT:DP-LANNA', hotel_name: 'Lanna View', gap_service: 'PARTNER', deal_id: 'CR:CR-LANNA', contract_id: 'DP-LANNA' },
    payload: { readiness_tier: '', chips: ['Partner ปฏิเสธ'], note: '', contract_id: 'DP-LANNA',
      credit_notice: { contract: 'DP-LANNA', partner: 'Hotelier.guru', result: 'REJECTED', approved_amount: null, currency: 'THB', credit_expires_at: null } } });
}
