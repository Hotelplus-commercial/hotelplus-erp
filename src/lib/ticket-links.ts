/** R1.2 §5.1 / §5.5 — ticket ↔ service contract / monthly meeting links and the pre-meeting backlog view.
 *  Pure helpers: no writes, no change to how responsible / watchers are derived. */
import type { WorkRow } from './task-worklist';

export type LinkService = 'ORM' | 'Marcom';
export type ServiceContractRef = { contract_id: string; hotel_id: string; hotel_name: string; service: LinkService; active: boolean };
export type MeetingRef = { meeting_id: string; hotel_id: string; hotel_name: string; service: LinkService; date: string; status: string; ae_owner_id: string | null };

/** Ticket department → service (PS / AC / BD … are hotel-level, no single service). */
export const teamService = (team: string | null | undefined): LinkService | null => (team === 'ORM' ? 'ORM' : team === 'MARCOM' ? 'Marcom' : null);

export function activeContracts(list: ServiceContractRef[], hotelId: string, team?: string | null): ServiceContractRef[] {
  const svc = teamService(team);
  return list.filter(c => c.active && c.hotel_id === hotelId && (!svc || c.service === svc));
}
/** Pre-fill only when the hotel has exactly one active contract for the ticket's service; otherwise the creator picks (optional). */
export function prefillContract(list: ServiceContractRef[], hotelId: string, team: string | null | undefined): string | null {
  const hits = activeContracts(list, hotelId, team);
  return hits.length === 1 ? hits[0]!.contract_id : null;
}
/** One-time backfill: hotel + service → exactly one active contract gets contract_id; the rest stay null. */
export function backfillContracts<T extends { hotel_id: string; routed_team: string; contract_id?: string | null }>(rows: T[], list: ServiceContractRef[]) {
  let linked = 0, nulls = 0;
  const out = rows.map(r => {
    if (r.contract_id) { linked++; return r; }
    const id = prefillContract(list, r.hotel_id, r.routed_team);
    if (id) { linked++; return { ...r, contract_id: id }; }
    nulls++; return { ...r, contract_id: null };
  });
  return { rows: out, linked, nulls };
}

const DAY = 864e5;
const dayNum = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`) / DAY;
const bkk = (ms: number) => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);

/** Meeting picker: that hotel's meetings in the last `days` days (Asia/Bangkok dates), newest first. */
export function recentMeetings(meetings: MeetingRef[], hotelId: string, now: Date, days = 60): MeetingRef[] {
  const t = dayNum(bkk(now.getTime()));
  return meetings.filter(m => m.hotel_id === hotelId && m.date && dayNum(m.date) <= t && dayNum(m.date) > t - days).sort((a, b) => b.date.localeCompare(a.date));
}

/** Monthly meeting statuses shown in the pre-meeting view. */
export const UPCOMING_STATUS_TH: Record<string, string> = { CONFIRMED: 'ยืนยันแล้ว', DRAFT: 'รอยืนยัน', PENDING: 'รอยืนยัน', PENDING_CONFIRM: 'รอยืนยัน', PROPOSED: 'รอยืนยัน' };
export const MEETING_NAME: Record<LinkService, string> = { ORM: 'ORM-Snapshot Meeting', Marcom: 'Marcom-Sync up Meeting' };
export const PRE_MEETING_WINDOWS = [7, 14, 30] as const;

export type PreMeetingGroup = {
  key: string; contract_id: string | null; hotel_id: string; hotel_name: string; service: LinkService;
  meeting: MeetingRef; status_th: string; ae_owner_id: string | null;
  items: { row: WorkRow; fromPrev: boolean }[];
};
/** §5.5 — contracts with a monthly meeting (ยืนยันแล้ว / รอยืนยัน) within `days`; open tickets per contract,
 *  tickets from the previous meeting of the same contract first. Contracts with no open ticket stay in the list. */
export function preMeetingBacklog(input: { meetings: MeetingRef[]; contracts: ServiceContractRef[]; rows: WorkRow[]; now: Date; days: number }): PreMeetingGroup[] {
  const t = dayNum(bkk(input.now.getTime()));
  const upcoming = input.meetings.filter(m => UPCOMING_STATUS_TH[m.status] && m.date && dayNum(m.date) >= t && dayNum(m.date) <= t + input.days);
  const groups = upcoming.map(m => {
    const hits = activeContracts(input.contracts, m.hotel_id, m.service === 'ORM' ? 'ORM' : 'MARCOM');
    const contract_id = hits.length === 1 ? hits[0]!.contract_id : null;
    const prev = input.meetings.filter(x => x.hotel_id === m.hotel_id && x.service === m.service && x.date && dayNum(x.date) < t).sort((a, b) => b.date.localeCompare(a.date))[0];
    const items = input.rows
      .filter(r => r.status_group !== 'CLOSED' && r.hotel_id === m.hotel_id)
      .filter(r => (r.contract_id ? r.contract_id === contract_id : (teamService(r.dept) ?? m.service) === m.service))
      .map(row => ({ row, fromPrev: !!prev && row.meeting_id === prev.meeting_id }))
      .sort((a, b) => Number(b.fromPrev) - Number(a.fromPrev) || a.row.created_at.localeCompare(b.row.created_at));
    return { key: `${m.meeting_id}`, contract_id, hotel_id: m.hotel_id, hotel_name: m.hotel_name, service: m.service, meeting: m, status_th: UPCOMING_STATUS_TH[m.status]!, ae_owner_id: m.ae_owner_id, items };
  });
  return groups.sort((a, b) => a.meeting.date.localeCompare(b.meeting.date) || a.hotel_name.localeCompare(b.hotel_name));
}

/** Live meetings from the v_meeting_funnel projection (empty until the meeting mirror is seeded). */
export function meetingsFromFunnel(rows: Record<string, unknown>[]): MeetingRef[] {
  return rows
    .filter(r => r['meeting_id'] && r['hotel_id'] && (r['service_line'] === 'ORM' || r['service_line'] === 'Marcom') && r['meeting_date'])
    .map(r => ({ meeting_id: String(r['meeting_id']), hotel_id: String(r['hotel_id']), hotel_name: String(r['hotel_name'] ?? r['hotel_id']), service: r['service_line'] as LinkService, date: String(r['meeting_date']).slice(0, 10), status: String(r['status'] ?? ''), ae_owner_id: r['ae_owner_id'] == null ? null : String(r['ae_owner_id']) }));
}
