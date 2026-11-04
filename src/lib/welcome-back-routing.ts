/* R3.1 WB2–WB5 — pure Welcome Back routing for the BD Workspace 🎫 lane and the PS drawer line.
 * Testing roster (HR roster has no BD members / BDM flag → additive testing list, testing mode only).
 * Visibility applies to WELCOME_BACK only: BDM sees all · a BD member sees only tickets assigned to them ·
 * the creator role (PM / PS) keeps its own tickets so the L0 creator cancel still works · everyone else none. */
import { OPEN_STATUSES, wbAllowed, type L0Ticket, type WbAction, type WbActor } from './tickets-l0';
import { WB } from './ps-glossary';

export const WB_TEST_BDM = { member_id: 'BDM-T', label: 'BDM (ทดสอบ)' } as const;
export const WB_TEST_BDS = [
  { member_id: 'BD-T1', label: 'BD 1 (ทดสอบ)' },
  { member_id: 'BD-T2', label: 'BD 2 (ทดสอบ)' },
  { member_id: 'BD-T3', label: 'BD 3 (ทดสอบ)' },
] as const;
export type WbMember = { member_id: string; label: string };

/** The actor the BD Workspace switcher plays (role value 'BDM' / 'BD' / any other existing role). */
export function wbActorOf(role: string, bdMember: string | null): WbActor {
  if (role === 'BDM') return { role: 'BDM', member_id: WB_TEST_BDM.member_id, label: WB_TEST_BDM.label };
  if (role === 'BD') { const m = WB_TEST_BDS.find((x) => x.member_id === bdMember) ?? WB_TEST_BDS[0]; return { role: 'BD', member_id: m.member_id, label: m.label }; }
  return { role, member_id: null, label: role };
}

export const isWelcomeBack = (t: L0Ticket) => t.type === 'WELCOME_BACK';
const isOpen = (t: L0Ticket) => OPEN_STATUSES.includes(t.status);
/** §3.3 visibility (Welcome Back only). HOC / MD = BDM read-only (not offered by this switcher). */
export function wbVisible(t: L0Ticket, a: WbActor): boolean {
  if (!isWelcomeBack(t)) return false;
  if (a.role === 'BDM' || a.role === 'HOC' || a.role === 'MD') return true;
  if (a.role === 'BD') return !!t.assigned_to && t.assigned_to === a.member_id;
  return t.created_by === a.role;
}
export type WbGroup = { key: 'pending' | 'assigned' | 'mine' | 'sent' | 'closed'; label: string; rows: L0Ticket[]; empty?: string };
const byCreated = (a: L0Ticket, b: L0Ticket) => a.created_at.localeCompare(b.created_at);
/** §4.2 groups in order. Closed (เสร็จ / ยกเลิก) only when the toggle is on. */
export function wbGroups(tickets: L0Ticket[], a: WbActor, showClosed: boolean): WbGroup[] {
  const vis = tickets.filter((t) => wbVisible(t, a));
  const open = vis.filter(isOpen);
  const closed = vis.filter((t) => !isOpen(t)).sort(byCreated);
  const out: WbGroup[] = [];
  if (a.role === 'BDM' || a.role === 'HOC' || a.role === 'MD') {
    const pending = open.filter((t) => t.status === 'NEW' && !t.assigned_to).sort(byCreated);
    const assigned = open.filter((t) => !pending.includes(t)).sort((x, y) => (x.assigned_to_label ?? '').localeCompare(y.assigned_to_label ?? '') || byCreated(x, y));
    out.push({ key: 'pending', label: WB.pending(pending.length), rows: pending, empty: WB.emptyBdm }, { key: 'assigned', label: WB.assigned(assigned.length), rows: assigned });
  } else if (a.role === 'BD') {
    out.push({ key: 'mine', label: WB.mine(open.length), rows: open.sort(byCreated), empty: WB.emptyBd });
  } else {
    out.push({ key: 'sent', label: WB.sent(open.length), rows: open.sort(byCreated), empty: WB.emptySent });
  }
  if (showClosed) out.push({ key: 'closed', label: WB.closed(closed.length), rows: closed });
  return out;
}
/* ---------- R3.2 WB10 / WB11 — BDM Workspace tab + BD Workspace tab (same visibility rules as wbVisible) ---------- */
/** Roles that keep a `ที่ฉันส่ง` group in BD Workspace (sender roles). */
export const WB_SENDER_ROLES = ['PM', 'PS', 'AE'] as const;
export const isWbSender = (role: string) => (WB_SENDER_ROLES as readonly string[]).includes(role);
/** BDM inbox count: Welcome Back, NEW, nobody assigned (tab badge + group 1). */
export const wbPendingCount = (tickets: L0Ticket[]) => tickets.filter((t) => isWelcomeBack(t) && t.status === 'NEW' && !t.assigned_to).length;
/** Members the BDM can filter `มอบหมายแล้ว` by: testing BDs + BDM (ฉันทำเอง). */
export const WB_FILTER_MEMBERS: WbMember[] = [...WB_TEST_BDS, WB_TEST_BDM];
/** §2 BDM tab groups: รอมอบหมาย (oldest first) · มอบหมายแล้ว (optional member filter) · ปิดแล้ว when the toggle is on. */
export function wbBdmGroups(tickets: L0Ticket[], showClosed: boolean, member: string | null = null): WbGroup[] {
  const vis = tickets.filter(isWelcomeBack);
  const open = vis.filter(isOpen);
  const pending = open.filter((t) => t.status === 'NEW' && !t.assigned_to).sort(byCreated);
  const assigned = open.filter((t) => !pending.includes(t)).filter((t) => !member || t.assigned_to === member)
    .sort((x, y) => (x.assigned_to_label ?? '').localeCompare(y.assigned_to_label ?? '') || byCreated(x, y));
  const out: WbGroup[] = [{ key: 'pending', label: WB.pending(pending.length), rows: pending, empty: WB.emptyBdm }, { key: 'assigned', label: WB.assigned(assigned.length), rows: assigned }];
  if (showClosed) { const closed = vis.filter((t) => !isOpen(t)).sort(byCreated); out.push({ key: 'closed', label: WB.closedBdm(closed.length), rows: closed }); }
  return out;
}
/** §3 BD tab groups: BD member → ของฉัน · sender role (PM / PS / AE) → ที่ฉันส่ง · anyone else (BDM included) → none. Never an unassigned ticket for BD. */
export function wbBdGroups(tickets: L0Ticket[], a: WbActor, showClosed: boolean): WbGroup[] {
  if (a.role !== 'BD' && !isWbSender(a.role)) return [];
  return wbGroups(tickets, a, showClosed);
}
/** §6.2 a Welcome Back without saved contract details (old test ticket #951) — display only. */
export const wbMissingSnapshot = (t: L0Ticket) => !t.payload.snapshot;
/** `{BD name} · {มอบหมายแล้ว | กำลังทำ}` for a row in มอบหมายแล้ว. */
export const wbRowSub = (t: L0Ticket) => WB.rowSub(t.assigned_to_label ?? '—', t.status !== 'NEW');

/** BD-side status pill. */
export function wbPill(t: L0Ticket): string {
  if (t.status === 'DONE') return WB.pill.done;
  if (t.status === 'CANCELLED') return WB.pill.cancelled;
  if (t.status === 'NEW') return t.assigned_to_label ? WB.pill.assigned(t.assigned_to_label) : WB.pill.pending;
  return WB.pill.working(t.assigned_to_label ?? null);
}
/** §6 PS-side status label. */
export function wbPsStatus(t: L0Ticket): string {
  if (t.status === 'DONE') return WB.ps.done;
  if (t.status === 'CANCELLED') return WB.ps.cancelled;
  if (t.status === 'NEW') return t.assigned_to ? WB.ps.assigned : WB.ps.pending;
  return WB.ps.working;
}
/** Buttons for this actor (HOC / MD: none, read only). */
export const wbActions = (t: L0Ticket, a: WbActor): WbAction[] => (a.role === 'HOC' || a.role === 'MD' ? [] : wbAllowed(t, a));
/** R3.3 WB19 — testing-mode check panel counts over every Welcome Back the page reads (keys only, never labels).
 * inStore = pending + assigned + closed + hidden; hidden = in no BDM group, with the reason. */
export type WbAudit = { inStore: number; pending: number; assigned: number; closed: number; hidden: { id: string; reason: string }[] };
export function wbAudit(tickets: L0Ticket[]): WbAudit {
  const vis = tickets.filter(isWelcomeBack);
  const groups = wbBdmGroups(vis, true);
  const of = (k: WbGroup['key']) => groups.find((g) => g.key === k)?.rows ?? [];
  const shown = new Set([...of('pending'), ...of('assigned'), ...of('closed')].map((t) => t.ticket_id));
  return {
    inStore: vis.length, pending: of('pending').length, assigned: of('assigned').length, closed: of('closed').length,
    hidden: vis.filter((t) => !shown.has(t.ticket_id)).map((t) => ({ id: t.ticket_id, reason: WB.check.reasonStatus(String(t.status)) })),
  };
}
/** Merge DEMO sources: store copies override sink copies override read-only seeds (same ticket id). */
export function wbMerge(store: L0Ticket[], sink: L0Ticket[], seed: L0Ticket[]): L0Ticket[] {
  const seen = new Set<string>(); const out: L0Ticket[] = [];
  for (const t of [...store, ...sink, ...seed]) if (isWelcomeBack(t) && !seen.has(t.ticket_id)) { seen.add(t.ticket_id); out.push(t); }
  return out;
}
