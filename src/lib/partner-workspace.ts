/* PM Workspace Partner v1.0 — pure rules for the "จัดการ Partner" page, the ✅ "🤝 งาน Partner" to-do group and the
 * PS-side SYSTEM_SHUTOFF ticket detail. Numbers come from debt-partner-calc only; no writes here. */
import { creditRows, getDealState, type CreditRow, type PartnerContract } from './debt-partner-calc';
import type { PartnerData } from './debt-partner-types';
import type { L0Status, L0Ticket, Role } from './tickets-l0';
import type { DateRange, TodoItem } from './workspace-registry';

export const PARTNER_PAGE = '/workspace/ps/partners';
export const PARTNER_TABS = ['partner', 'rate', 'deals', 'credit'] as const;
export type PartnerTab = (typeof PARTNER_TABS)[number];
/** URL hash → tab (credit-pending / credit-waiting deep-link into the credit tab). */
export const tabOfHash = (hash: string): PartnerTab => {
  const h = hash.replace(/^#/, '');
  if (h.startsWith('credit')) return 'credit';
  if (h === 'ratecard') return 'rate';
  if (h.startsWith('deals')) return 'deals'; // v1.2: #deals/{partner_id} deep link
  return (PARTNER_TABS as readonly string[]).includes(h) ? (h as PartnerTab) : 'rate';
};
/** v1.1 PW16: tab → URL hash (#partner · #ratecard · #deals · #credit). */
export const hashOfTab = (t: PartnerTab): string => (t === 'rate' ? 'ratecard' : t);
export const REMIND = { DEAL_END_DAYS: 30, CREDIT_WAIT_DAYS: 7, NEGOTIATING_STALE_DAYS: 14, CLOSED_WINDOW_DAYS: 180 } as const;

const d10 = (s: string) => s.slice(0, 10);
const ms = (s: string) => Date.parse(`${d10(s)}T00:00:00Z`);
export const addDays = (iso: string, n: number) => new Date(ms(iso) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 864e5);
const RANGE_DAYS: Record<DateRange, number> = { today: 0, '7d': 7, '14d': 14 };
export function dueRelative(trigger: string, today: string): string {
  const n = daysBetween(today, trigger);
  return n === 0 ? 'วันนี้' : n < 0 ? `เกินมา ${-n} วัน` : `อีก ${n} วัน`;
}

/** §2.3 sections. */
export function creditSections(data: PartnerData, contracts: PartnerContract[], today: string) {
  const rows = creditRows(data, contracts, today);
  const pending = rows.filter((r): r is Extract<CreditRow, { kind: 'DERIVED' }> => r.kind === 'DERIVED');
  const byId = new Map(contracts.map((c) => [c.contract_id, c]));
  const waiting = data.system_credit_requests.filter((r) => r.status === 'REQUESTED')
    .map((req) => ({ req, contract: byId.get(req.contract_id) ?? null, days: Math.max(0, daysBetween(req.requested_at, today)) }));
  const cut = addDays(today, -REMIND.CLOSED_WINDOW_DAYS);
  const closed = data.system_credit_requests.filter((r) => r.status !== 'REQUESTED' && d10(r.decided_at ?? r.requested_at) >= cut)
    .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? ''))
    .map((req) => {
      const used = data.system_credit_usage.filter((u) => u.credit_request_id === req.id).reduce((s, u) => s + u.amount, 0);
      const granted = req.approved_amount ?? req.amount;
      return { req, contract: byId.get(req.contract_id) ?? null, used, remaining: req.status === 'APPROVED' ? granted - used : 0 };
    });
  return { pending, waiting, closed };
}

export type PartnerTodo = TodoItem & { kind: 'A' | 'B' | 'C' | 'D'; trigger: string; sub: string };
/** §3 items A–D. Show when trigger ≤ end of range; stay until the condition clears. PM only. */
export function partnerTodoItems(data: PartnerData, contracts: PartnerContract[], today: string, range: DateRange, person: string): PartnerTodo[] {
  if (person !== 'PM') return [];
  const end = addDays(today, RANGE_DAYS[range]);
  const pName = (id: string) => data.partners.find((p) => p.id === id)?.name ?? id;
  const hotelOf = (cid: string) => contracts.find((c) => c.contract_id === cid)?.hotel || cid;
  const thb = (n: number, cur: string) => (cur === 'THB' ? `฿${Math.round(n).toLocaleString('en-US')}` : `${cur} ${Math.round(n).toLocaleString('en-US')}`);
  const out: PartnerTodo[] = [];
  const { pending, waiting } = creditSections(data, contracts, today);
  for (const r of pending) {
    const trigger = d10(r.notified_at ?? today);
    out.push({ kind: 'A', id: `A-${r.contract.contract_id}`, trigger, title: `ขอ keep credit ค่าระบบ · ${r.contract.hotel}`, sub: `${r.partner} · จ่ายล่วงหน้าถึง ${r.prepaid_until} · ${thb(r.amount, r.currency)}`, due_relative: '', route_target: `${PARTNER_PAGE}#credit-pending` });
  }
  for (const w of waiting) {
    const trigger = addDays(w.req.requested_at, REMIND.CREDIT_WAIT_DAYS);
    out.push({ kind: 'B', id: `B-${w.req.id}`, trigger, title: `ตาม Partner · คำขอเครดิต ${hotelOf(w.req.contract_id)}`, sub: `รอมา ${w.days} วัน`, due_relative: '', route_target: `${PARTNER_PAGE}#credit-waiting` });
  }
  for (const d of data.partner_deals) {
    if (d.status === 'SUCCESS' && d.end_date && d10(today) <= d10(d.end_date)) {
      out.push({ kind: 'C', id: `C-${d.id}`, trigger: addDays(d.end_date, -REMIND.DEAL_END_DAYS), title: `ข้อเสนอใกล้หมดอายุ · ${pName(d.partner_id)}`, sub: `${d.title} · หมด ${d10(d.end_date)}`, due_relative: '', route_target: `${PARTNER_PAGE}#deals/${d.partner_id}` });
    }
    if (d.status === 'NEGOTIATING') {
      out.push({ kind: 'D', id: `D-${d.id}`, trigger: addDays(d.updated_at, REMIND.NEGOTIATING_STALE_DAYS), title: `ข้อเสนอไม่มีความคืบหน้า · ${pName(d.partner_id)}`, sub: `ไม่อัปเดต ${Math.max(0, daysBetween(d.updated_at, today))} วัน`, due_relative: '', route_target: `${PARTNER_PAGE}#deals/${d.partner_id}` });
    }
  }
  return out.filter((x) => x.trigger <= end).map((x) => ({ ...x, due_relative: dueRelative(x.trigger, today) })).sort((a, b) => a.trigger.localeCompare(b.trigger));
}
/** NEGOTIATING with no update > 14 days → amber "อัปเดตล่าสุด". */
export const isStaleNegotiation = (d: { status: string; updated_at: string }, today: string) => d.status === 'NEGOTIATING' && daysBetween(d.updated_at, today) > REMIND.NEGOTIATING_STALE_DAYS;
export const dealStateOf = getDealState;

/* ---------- §4 SYSTEM_SHUTOFF (PS side) ---------- */
export const isPsShutoff = (t: Pick<L0Ticket, 'type' | 'target_dept'>) => t.type === 'SYSTEM_SHUTOFF' && t.target_dept === 'PS';
/** AE of the ticket: live property.assigned_ae_id first, else the ticket payload snapshot. */
export function shutoffAe(t: L0Ticket, propertyAeId: string | null | undefined): { member_id: string | null; nickname: string | null } {
  if (propertyAeId) return { member_id: propertyAeId, nickname: null };
  return { member_id: t.payload.assigned_ae?.member_id ?? null, nickname: t.payload.assigned_ae?.nickname ?? null };
}
/** Only the assigned AE (role PS + matching member) moves status; PM read-only; CANCEL stays with the creator (L0). */
export function shutoffActions(next: L0Status[], role: Role, actorMember: string | null, aeMember: string | null): L0Status[] {
  const own = role === 'PS' && !!aeMember && actorMember === aeMember;
  return next.filter((s) => (s === 'CANCELLED' ? true : own));
}
/** Twin ticket (ORM / MARCOM) of the same contract / hotel. */
export function shutoffTwin(all: L0Ticket[], t: L0Ticket): L0Ticket | null {
  const key = t.subject_ref.contract_id ?? t.payload.contract_id ?? null;
  return all.find((x) => x.ticket_id !== t.ticket_id && x.type === 'SYSTEM_SHUTOFF' && (x.target_dept === 'ORM' || x.target_dept === 'MARCOM')
    && (key ? (x.subject_ref.contract_id ?? x.payload.contract_id) === key : x.subject_ref.hotel_id === t.subject_ref.hotel_id)) ?? null;
}

/* ---------- v1.2 PW23 — views: ภาพรวม · หน้า Partner · คำขอเครดิตทั้งหมด (replaces the 4 tabs; old hashes map here) ---------- */
export const PARTNER_SECTIONS = ['docs', 'hotels', 'price', 'deals', 'credit'] as const;
export type PartnerSection = (typeof PARTNER_SECTIONS)[number];
export type PartnerView = { v: 'overview' } | { v: 'partner'; id: string; section: PartnerSection | null } | { v: 'credit'; anchor: string | null };
export function viewOfHash(hash: string): PartnerView {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  if (h.startsWith('partner/')) {
    const [, id = '', sec] = h.split('/');
    return { v: 'partner', id, section: (PARTNER_SECTIONS as readonly string[]).includes(sec ?? '') ? (sec as PartnerSection) : null };
  }
  if (h.startsWith('deals/')) return { v: 'partner', id: h.slice(6), section: 'deals' };
  if (h.startsWith('credit')) return { v: 'credit', anchor: h === 'credit' ? null : h };
  return { v: 'overview' }; // '', #overview and the old #partner / #ratecard / #deals
}
export const hashOfView = (v: PartnerView): string =>
  v.v === 'overview' ? 'overview' : v.v === 'credit' ? (v.anchor ?? 'credit') : `partner/${v.id}${v.section ? `/${v.section}` : ''}`;

/** §4.1 short label of a storage location URL, e.g. "Google Drive › Partners › StayLink"; else the URL. */
export function folderLabel(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const svc = /drive\.google\./.test(u.hostname) ? 'Google Drive' : /sharepoint|onedrive/.test(u.hostname) ? 'OneDrive' : /dropbox/.test(u.hostname) ? 'Dropbox' : null;
    const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const i = parts.indexOf('folders');
    const tail = (i >= 0 ? parts.slice(i + 1) : []).filter((x) => /[\s.]|^[A-Z][a-z]/.test(x) || x.length <= 20);
    return svc && tail.length ? [svc, ...tail].join(' › ') : url;
  } catch { return url; }
}

/** §5.1–5.2 hotels of one Partner on `today`: current users, upcoming moves in (first), and moving out. */
export type PartnerHotelRow = { pid: string; name: string; allotment: number | null; from: string | null; status: 'ACTIVE' | 'UPCOMING' | 'LEAVING'; other: string | null; date: string | null };
export function partnerHotelRows(data: PartnerData, contracts: PartnerContract[], today: string, partnerId: string, nameOf: (pid: string) => string): PartnerHotelRow[] {
  const pids = new Set<string>([...data.property_partner_system.map((r) => r.property_id), ...contracts.filter((c) => c.service === 'ORM' && c.property_id).map((c) => c.property_id!)]);
  const out: PartnerHotelRow[] = [];
  for (const pid of pids) {
    const rows = data.property_partner_system.filter((r) => r.property_id === pid);
    const cur = rows.filter((r) => d10(r.effective_from) <= today).sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.set_at.localeCompare(a.set_at))[0] ?? null;
    const next = rows.filter((r) => d10(r.effective_from) > today).sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0] ?? null;
    let curPartner = cur?.partner_id ?? null, allot = cur?.allotment ?? null, from = cur ? d10(cur.effective_from) : null;
    if (!cur) { // contract-level system only
      const c = contracts.find((x) => x.property_id === pid && x.service === 'ORM');
      const s = c ? data.contract_partner_system.find((x) => x.contract_id === c.contract_id) : null;
      if (s && c) { curPartner = s.partner_id; allot = s.allotment ?? c.allotment ?? null; from = c.start; }
    }
    if (curPartner === partnerId) {
      const leaving = next && next.partner_id !== partnerId;
      out.push({ pid, name: nameOf(pid), allotment: allot, from, status: leaving ? 'LEAVING' : 'ACTIVE', other: leaving ? next.partner_id : null, date: leaving ? d10(next.effective_from) : null });
    } else if (next?.partner_id === partnerId) {
      out.push({ pid, name: nameOf(pid), allotment: next.allotment, from: d10(next.effective_from), status: 'UPCOMING', other: curPartner, date: d10(next.effective_from) });
    }
  }
  return out.sort((a, b) => (a.status === 'UPCOMING' ? 0 : 1) - (b.status === 'UPCOMING' ? 0 : 1) || a.name.localeCompare(b.name));
}

/** §5.1 history tags, newest first: รอมีผล {date} / ใช้อยู่ตอนนี้ / เดิม. */
export function historyTag(rows: { id: string; effective_from: string }[], today: string): Record<string, 'FUTURE' | 'CURRENT' | 'OLD'> {
  const sorted = [...rows].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const cur = sorted.find((r) => d10(r.effective_from) <= today)?.id;
  return Object.fromEntries(sorted.map((r) => [r.id, d10(r.effective_from) > today ? 'FUTURE' : r.id === cur ? 'CURRENT' : 'OLD']));
}
