/* Ticket Service SLA Core v1.0 — §11 tests 1–9. */
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/workspace/orm' }); });
// test hygiene: release the page simulator for later files
afterAll(async () => { if (GlobalRegistrator.isRegistered) await GlobalRegistrator.unregister(); });
import * as L0 from '../src/lib/tickets-l0';
import * as S from '../src/lib/service-tickets';
import { runServiceAlerts } from '../src/lib/service-ticket-alerts';
import { bellItems } from '../src/lib/bell-items';
import { slaDemoTickets } from '../src/lib/service-tickets-demo';
import { setPsDemoSession } from '../src/lib/demo-session';

const TODAY = '2026-10-28';
const mk = (p: Partial<L0.L0Ticket> & { created: string }): L0.L0Ticket => ({ ticket_id: p.ticket_id ?? `T-${Math.random().toString(36).slice(2, 8)}`, type: p.type ?? 'HANDOVER_FIX', source_app: 'PS_DASHBOARD', created_by: p.created_by ?? 'PS', target_dept: p.target_dept ?? 'ORM',
  subject_ref: { hotel_id: 'H1', hotel_name: 'Demo Hotel', gap_service: 'ORM' }, payload: { readiness_tier: '', chips: [], note: 'x' }, status: p.status ?? 'NEW', created_at: `${p.created}T09:00:00+07:00`, revision: 0,
  audit: p.audit ?? [{ at: `${p.created}T09:00:00+07:00`, by: 'PS', from_status: null, to_status: 'NEW', actor: 'นนท์' }], ...p });
const cats = S.seedCategories();
const view = (l0: L0.L0Ticket[], extra: Partial<S.ViewInput> = {}) => S.vServiceTickets({ l0, categories: cats, today: TODAY, ...extra });
const ormMember: S.SvcActor = { role: 'ORM', member_id: 'orm-toey', label: 'เตย (ORM-A)' };
let n = 0;
function liveTicket(created: string, target: L0.Dept = 'ORM') {
  const r = L0.createTask({ type: 'HANDOVER_FIX', target_dept: target, subject_ref: { hotel_id: `HX${++n}`, hotel_name: 'Demo Hotel', gap_service: `g${n}` }, payload: { readiness_tier: '', chips: [], note: 'x' }, created_by: 'PS' });
  L0.patchServiceTicket(r.ticket_id, (t) => ({ ...t, created_at: `${created}T09:00:00+07:00` }), { by: 'PS', note: 'test setup' });
  return () => view(L0.ticketSnapshot(), { followups: S.ticketFollowups.all(false) }).find((x) => x.ticket_id === r.ticket_id)!;
}
beforeEach(() => { localStorage.clear(); });

describe('SLA core', () => {
  test('1 · accept: day 0 and day 10 ok, day 11 refused, second accept refused, sender cannot set', () => {
    const a = liveTicket('2026-10-28');
    expect(S.acceptTicket(a(), '2026-11-08', ormMember, { demo: false, today: TODAY }).ok).toBe(false); // day 11
    expect(S.acceptTicket(a(), '2026-10-28', { role: 'PS', member_id: 'nont' }, { demo: false, today: TODAY }).ok).toBe(false); // sender
    expect(S.acceptTicket(a(), '2026-10-28', ormMember, { demo: false, today: TODAY }).ok).toBe(true); // day 0
    expect(S.acceptTicket(a(), '2026-11-07', ormMember, { demo: false, today: TODAY }).ok).toBe(false); // second
    const b = liveTicket('2026-10-28');
    expect(S.acceptTicket(b(), '2026-11-07', ormMember, { demo: false, today: TODAY }).ok).toBe(true); // day 10
    expect(b().assignee_id).toBe('orm-toey'); expect(b().due_source).toBe('SET');
  });
  test('2 · due date write-once; reopen keeps it', () => {
    const a = liveTicket('2026-10-25');
    S.acceptTicket(a(), '2026-10-30', ormMember, { demo: false, today: TODAY });
    expect(S.changeTicketStatus(a(), 'SOLVED', ormMember, { demo: false }).ok).toBe(true);
    expect(a().display_status).toBe('SOLVED');
    expect(S.changeTicketStatus(a(), 'IN_PROGRESS', ormMember, { demo: false }).ok).toBe(true);
    expect(a().due_date).toBe('2026-10-30'); expect(a().solved_at).toBeNull();
    expect(S.acceptTicket(a(), '2026-10-29', ormMember, { demo: false, today: TODAY }).ok).toBe(false);
  });
  test('3 · waiting third party needs waiting_on; OTHER needs a note', () => {
    const a = liveTicket('2026-10-25');
    S.acceptTicket(a(), '2026-10-30', ormMember, { demo: false, today: TODAY });
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false }).ok).toBe(false);
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false, waiting_on: 'OTHER' }).ok).toBe(false);
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false, waiting_on: 'OTA' }).ok).toBe(true);
    expect(a().display_status).toBe('WAITING_THIRD_PARTY');
  });
  test('4 · view: ACK → IN_PROGRESS; cancelled not counted; GRADE_RISK and PS-targeted absent', () => {
    const rows = view([mk({ created: '2026-10-20', status: 'ACK', ticket_id: 'A' }), mk({ created: '2026-10-20', status: 'CANCELLED', ticket_id: 'C' }), mk({ created: '2026-10-20', type: 'GRADE_RISK', ticket_id: 'G' }), mk({ created: '2026-10-20', target_dept: 'PS', ticket_id: 'P' })]);
    expect(rows.map((r) => r.ticket_id).sort()).toEqual(['A', 'C']);
    expect(rows.find((r) => r.ticket_id === 'A')!.display_status).toBe('IN_PROGRESS');
    expect(rows.find((r) => r.ticket_id === 'C')!.is_counted).toBe(false);
    expect(S.openRows(rows).length).toBe(1);
  });
  test('5 · due_state + remarks; solve_days includes waiting', () => {
    const d9 = view([mk({ created: '2026-10-19' })])[0]!; expect([d9.due_state, d9.overdue_remark]).toEqual(['NO_DATE', null]);
    const d11 = view([mk({ created: '2026-10-17' })])[0]!; expect([d11.due_state, d11.overdue_remark]).toEqual(['OVERDUE', 'NOT_ACCEPTED']);
    const w = mk({ created: '2026-10-14', status: 'IN_PROGRESS', accepted_at: '2026-10-14T10:00:00+07:00', assigned_to: 'orm-toey', due_date: '2026-10-26', audit: [
      { at: '2026-10-14T09:00:00+07:00', by: 'PS', from_status: null, to_status: 'NEW' }, { at: '2026-10-14T10:00:00+07:00', by: 'ORM', from_status: 'NEW', to_status: 'IN_PROGRESS' },
      { at: '2026-10-18T10:00:00+07:00', by: 'ORM', from_status: 'IN_PROGRESS', to_status: 'WAITING_CUSTOMER' }, { at: '2026-10-22T10:00:00+07:00', by: 'ORM', from_status: 'WAITING_CUSTOMER', to_status: 'IN_PROGRESS' }] });
    const r = view([w])[0]!; expect([r.due_state, r.overdue_remark, r.waiting_days]).toEqual(['OVERDUE', 'HAD_WAIT', 4]);
    const solved = view([{ ...w, status: 'DONE', solved_at: '2026-10-27T15:00:00+07:00' }])[0]!; expect(solved.solve_days).toBe(13);
  });
  test('6 · follow up: AE ok, PM ok next day, ORM refused, same day refused, recipients', () => {
    const a = liveTicket('2026-10-25');
    expect(S.sendFollowUp(a(), { role: 'ORM', member_id: 'x' }, { demo: false, at: '2026-10-28T10:00:00+07:00' }).ok).toBe(false);
    expect(S.sendFollowUp(a(), { role: 'AE', label: 'นนท์' }, { demo: false, at: '2026-10-28T10:00:00+07:00' }).ok).toBe(true);
    const dup = S.sendFollowUp(a(), { role: 'PM', label: 'Alex' }, { demo: false, at: '2026-10-28T20:00:00+07:00' });
    expect(dup).toEqual({ ok: false, error: S.FOLLOWUP_DUP_TH });
    expect(S.ticketFollowups.all(false)[0]!.recipient_kind).toBe('DEPT_QUEUE_AND_HEAD');
    S.acceptTicket(a(), '2026-10-30', ormMember, { demo: false, today: TODAY });
    expect(S.sendFollowUp(a(), { role: 'PM', label: 'Alex' }, { demo: false, at: '2026-10-29T09:00:00+07:00' }).ok).toBe(true);
    const f = S.ticketFollowups.all(false).filter((x) => x.ticket_id === a().ticket_id);
    expect(f[1]!.recipient_kind).toBe('ASSIGNEE'); expect(f[1]!.recipient_ids).toEqual(['orm-toey']); expect(a().followup_count).toBe(2);
    const b = bellItems.all(false).filter((x) => x.alert_type === 'TICKET_FOLLOWUP').map((x) => `${x.target_type}:${x.target_id}`);
    expect(b).toEqual(['DEPT_QUEUE:ORM', 'ROLE:GRM', 'USER:orm-toey']);
  });
  test('7 · categories: head adds, non-head / other dept refused, overlap refused, OGM request, no delete path', () => {
    const grm: S.SvcActor = { role: 'GRM', member_id: 'grm' };
    expect(S.addCategory('ORM', 'แคมเปญ Flash Sale', grm, { demo: false }).ok).toBe(true);
    expect(S.addCategory('ORM', 'อีกหมวดหนึ่ง', ormMember, { demo: false }).ok).toBe(false);
    expect(S.addCategory('AC', 'เรื่องใหม่ AC', grm, { demo: false }).ok).toBe(false);
    const before = S.getCategories(false).length;
    const c = S.addCategory('ORM', 'ราคา promotion', grm, { demo: false });
    expect(c.ok).toBe(false); expect(!c.ok && c.conflicts?.map((x) => x.key)).toContain('rate');
    expect(S.getCategories(false).length).toBe(before);
    const r = S.requestCategory('ORM', 'ราคา promotion', 'ต่างจากราคาห้อง', grm, { demo: false });
    expect(r.ok && r.request.status).toBe('PENDING');
    expect(bellItems.all(false).some((b) => b.alert_type === 'CATEGORY_REQUEST' && b.target_id === 'OGM')).toBe(true);
    expect('deleteCategory' in S).toBe(false);
  });
  test('8 · alerts: TICKET_NEW, day-3 head + queue once, daily grouped once per dept, due tomorrow / overdue once', () => {
    const rows = view([mk({ created: '2026-10-25', ticket_id: 'N3' }), mk({ created: '2026-10-28', ticket_id: 'N0' }),
      mk({ created: '2026-10-20', ticket_id: 'D1', status: 'IN_PROGRESS', accepted_at: 'x', assigned_to: 'orm-toey', due_date: '2026-10-29' }),
      mk({ created: '2026-10-15', ticket_id: 'O1', status: 'IN_PROGRESS', accepted_at: 'x', assigned_to: 'orm-ton', due_date: '2026-10-25' })]);
    const s1 = runServiceAlerts(rows, false, TODAY).map((a) => `${a.alert_type}>${a.target_type}:${a.target_id}`);
    expect(s1.filter((x) => x.startsWith('TICKET_NEW>')).length).toBe(2);
    expect(s1.filter((x) => x.startsWith('TICKET_NOT_ACCEPTED_3D>'))).toEqual(['TICKET_NOT_ACCEPTED_3D>ROLE:GRM', 'TICKET_NOT_ACCEPTED_3D>DEPT_QUEUE:ORM']);
    expect(s1.filter((x) => x.startsWith('TICKET_NO_DATE_DAILY>'))).toEqual(['TICKET_NO_DATE_DAILY>DEPT_QUEUE:ORM']);
    expect(s1).toContain('TICKET_DUE_TOMORROW>USER:orm-toey'); expect(s1).toContain('TICKET_OVERDUE>USER:orm-ton');
    expect(runServiceAlerts(rows, false, TODAY)).toEqual([]);
  });
  test('9 · old accepted ticket without due date → AUTO, NO_DATE until day 10, row untouched', () => {
    const old = mk({ created: '2026-10-20', status: 'IN_PROGRESS' });
    const snap = JSON.stringify(old);
    const r = view([old])[0]!; expect([r.due_source, r.due_state, r.effective_due_date]).toEqual(['AUTO', 'NO_DATE', '2026-10-30']);
    expect(view([old], { today: '2026-10-31' })[0]!.due_state).toBe('OVERDUE');
    expect(JSON.stringify(old)).toBe(snap);
  });
  test('§9 DEMO numbers on 28 Oct', () => {
    const rows = view(slaDemoTickets()); const open = S.openRows(rows);
    const by = (f: (r: S.ServiceTicketRow) => string) => open.reduce<Record<string, number>>((a, r) => ({ ...a, [f(r)]: (a[f(r)] ?? 0) + 1 }), {});
    expect(open.length).toBe(40);
    expect(by((r) => r.dept)).toEqual({ ORM: 18, MARCOM: 10, AC: 7, BD: 5 });
    expect(by((r) => r.display_status)).toEqual({ NEW: 15, IN_PROGRESS: 14, WAITING_CUSTOMER: 6, WAITING_THIRD_PARTY: 5 });
    const od = open.filter((r) => r.due_state === 'OVERDUE');
    expect(od.length).toBe(9);
    expect(od.reduce<Record<string, number>>((a, r) => ({ ...a, [r.overdue_remark ?? 'none']: (a[r.overdue_remark ?? 'none'] ?? 0) + 1 }), {})).toEqual({ HAD_WAIT: 3, NOT_ACCEPTED: 2, none: 4 });
    expect(rows.filter((r) => r.display_status === 'SOLVED').length).toBe(6);
    expect(open.every((r) => r.display_status !== 'NEW' || r.due_source === 'AUTO')).toBe(true);
    expect(rows.every((r) => !r.due_date || r.due_date <= S.addDays(r.created_date, 10))).toBe(true);
    setPsDemoSession(false);
  });
});
