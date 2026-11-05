/* Service Ticket Receiver v1.0 — §9 tests 1–9 (+ mounted lane / modal / panel / settings scan). */
import './dom-first';
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/workspace/orm' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { try { await GlobalRegistrator.unregister(); } catch { /* shared */ } });

import * as L0 from '../src/lib/tickets-l0';
import * as S from '../src/lib/service-tickets';
import * as R from '../src/lib/service-receiver';
import { WORKSPACES, workspaceByDept } from '../src/lib/workspace-registry';
import type { Ticket as PsCase } from '../src/lib/task-tickets';

const TODAY = '2026-10-28';
const cats = S.seedCategories();
const ormMember: S.SvcActor = { role: 'ORM', member_id: 'orm-toey', label: 'เตย', dept: 'ORM' };
const grm: S.SvcActor = { role: 'GRM', member_id: 'grm', label: 'GRM', dept: 'ORM' };
let n = 0;
function liveTicket(created: string, target: L0.Dept = 'ORM', type: L0.TicketType = 'HANDOVER_FIX') {
  const r = L0.createTask({ type, target_dept: target, subject_ref: { hotel_id: `HR${++n}`, hotel_name: 'Demo Hotel', gap_service: `r${n}` }, payload: { readiness_tier: '', chips: [], note: 'x' }, created_by: type === 'SYSTEM_SHUTOFF' ? 'AC' : 'PS' });
  L0.patchServiceTicket(r.ticket_id, (t) => ({ ...t, created_at: `${created}T09:00:00+07:00` }), { by: 'PS', note: 'test setup' });
  return () => S.vServiceTickets({ l0: L0.ticketSnapshot(), followups: S.ticketFollowups.all(false), categories: S.getCategories(false), today: TODAY }).find((x) => x.ticket_id === r.ticket_id)!;
}
const psCase = (p: Partial<PsCase>): PsCase => ({ id: 'case-1', case_no: 'Case-000001', hotel_id: 'H9', hotel_name: 'Case Hotel', title: 'ตรวจราคา', description: '', category_id: 'ORM-RATE', routed_team: 'ORM', status: 'open', waiting_reason: null, created_by: 'PM (Alex)', created_at: '2026-10-25T09:00:00+07:00', updated_at: '2026-10-25T09:00:00+07:00', resolved_at: null, revision: 0, ...p } as PsCase);
beforeEach(() => { localStorage.clear(); });

describe('Service Ticket Receiver v1.0', () => {
  test('1 · only ORM · MARCOM · AC · BD switch on; PM / HR / AUTO / Office unchanged', () => {
    expect(WORKSPACES.filter((w) => w.service_sla).map((w) => w.dept_key).sort()).toEqual(['AC', 'BD', 'MARCOM', 'ORM']);
    for (const d of ['PS', 'HR', 'AUTO', 'OFFICE'] as const) expect(workspaceByDept(d).service_sla).toBeUndefined();
  });
  test('2 · lane lists L0 tickets and PS cases of the department; GRADE_RISK stays out', () => {
    liveTicket('2026-10-27'); liveTicket('2026-10-27', 'ORM', 'GRADE_RISK');
    const rows = S.vServiceTickets({ l0: L0.ticketSnapshot(), cases: [psCase({})], categories: cats, today: TODAY });
    const lane = R.laneRows(rows, 'ORM', grm, 'open');
    expect(lane.some((r) => r.ticket_store === 'PS_CASE')).toBe(true);
    expect(lane.some((r) => r.ticket_store === 'L0')).toBe(true);
    expect(lane.some((r) => r.type === 'GRADE_RISK')).toBe(false);
    // members: queue (New) + own only
    const mineRows = R.visibleRows([...rows, { ...rows[0]!, ticket_id: 'other', display_status: 'IN_PROGRESS', assignee_id: 'orm-ton' }], 'ORM', ormMember);
    expect(mineRows.some((r) => r.ticket_id === 'other')).toBe(false);
  });
  test('3 · accept window: +10 ok, day 11 not selectable, second accept refused, head on behalf', () => {
    const chips = R.acceptChips('2026-10-27', TODAY);
    expect(chips.map((c) => c.disabled)).toEqual([false, false, false, false]);
    expect(R.canPickDate('2026-11-06', '2026-10-27', TODAY)).toBe(true);
    expect(R.canPickDate('2026-11-07', '2026-10-27', TODAY)).toBe(false); // day 11
    expect(R.acceptChips('2026-10-20', TODAY).find((c) => c.days === 3)!.disabled).toBe(true); // before today
    const a = liveTicket('2026-10-27');
    expect(S.acceptTicket(a(), '2026-11-06', ormMember, { demo: false, today: TODAY }).ok).toBe(true);
    expect(S.acceptTicket(a(), '2026-11-05', ormMember, { demo: false, today: TODAY }).ok).toBe(false);
    const b = liveTicket('2026-10-27');
    expect(S.acceptTicket(b(), '2026-10-30', grm, { demo: false, today: TODAY, onBehalf: { member_id: 'orm-ton', label: 'ต้น' } }).ok).toBe(true);
    expect(b().assignee_id).toBe('orm-ton'); expect(b().display_status).toBe('IN_PROGRESS');
  });
  test('4 · status: รอ 3rd Party needs รอใคร, อื่น ๆ needs text; Solve and reopen keep due date; PS case refused', () => {
    const a = liveTicket('2026-10-27');
    S.acceptTicket(a(), '2026-11-02', ormMember, { demo: false, today: TODAY });
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false }).ok).toBe(false);
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false, waiting_on: 'OTHER' }).ok).toBe(false);
    expect(S.changeTicketStatus(a(), 'WAITING_THIRD_PARTY', ormMember, { demo: false, waiting_on: 'OTHER', note: 'รอ vendor' }).ok).toBe(true);
    expect(S.changeTicketStatus(a(), 'SOLVED', ormMember, { demo: false }).ok).toBe(true);
    expect(S.changeTicketStatus(a(), 'IN_PROGRESS', ormMember, { demo: false }).ok).toBe(true);
    expect(a().due_date).toBe('2026-11-02');
    const c = S.vServiceTickets({ l0: [], cases: [psCase({})], categories: cats, today: TODAY })[0]!;
    expect(S.changeTicketStatus(c, 'SOLVED', grm, { demo: false }).ok).toBe(false);
    expect(S.acceptTicket(c, '2026-10-30', grm, { demo: false, today: TODAY }).ok).toBe(true); // PS case accepted via ticket_sla
  });
  test('5 · Follow up badge = count + last date (amber today); due cell wording', () => {
    const a = liveTicket('2026-10-27');
    expect(S.sendFollowUp(a(), { role: 'AE', label: 'นนท์' }, { demo: false, at: `${TODAY}T10:00:00+07:00` }).ok).toBe(true);
    expect(R.followBadge(a(), TODAY)).toEqual({ text: '📣 1 · ล่าสุด 28 ต.ค. 69', today: true });
    expect(R.dueCell(a(), TODAY).text).toBe('ยังไม่ใส่วันที่ · สูงสุด 6 พ.ย. 69');
    const old = liveTicket('2026-10-15');
    expect(R.dueCell(old(), TODAY)).toMatchObject({ text: 'ยังไม่รับงาน · เลย 3 วัน', tone: 'red' });
    expect(S.sendFollowUp(a(), ormMember, { demo: false }).ok).toBe(false); // receiver cannot Follow up
  });
  test('6 · category: head only; clean add; ราคา promotion locked → OGM request; system hide refused; no delete', () => {
    expect(R.receiverActor('ORM', { demo: true, memberId: 'orm-toey', liveRole: 'ORM' })?.role).toBe('ORM');
    expect(R.isHeadActor(R.receiverActor('ORM', { demo: true, memberId: 'orm-toey', liveRole: 'ORM' }), 'ORM')).toBe(false);
    expect(R.isHeadActor(R.receiverActor('ORM', { demo: true, memberId: 'grm', liveRole: 'ORM' }), 'ORM')).toBe(true);
    expect(S.addCategory('ORM', 'สัญญาณ Wi-Fi', ormMember, { demo: false }).ok).toBe(false);
    expect(S.addCategory('ORM', 'สัญญาณ Wi-Fi', grm, { demo: false }).ok).toBe(true);
    const locked = S.addCategory('ORM', 'ราคา promotion', grm, { demo: false });
    expect(locked.ok).toBe(false);
    expect(S.checkCategoryOverlap('ORM', 'ราคา promotion', S.getCategories(false)).map((c) => c.name_th)).toContain('ราคาห้อง & Rate');
    expect(S.requestCategory('ORM', 'ราคา promotion', null, grm, { demo: false }).ok).toBe(true);
    expect(S.hideCategory('rate:ORM', grm, { demo: false }).ok).toBe(false);
    expect('deleteCategory' in S).toBe(false);
  });
  test('7 · OGM approves → category for the department + head bell; reject needs reason (UI)', async () => {
    const r = S.requestCategory('ORM', 'ราคา promotion', null, grm, { demo: false });
    if (!r.ok) throw new Error(r.error);
    expect(S.decideCategoryRequest(r.request.id, true, grm, { demo: false }).ok).toBe(false);
    expect(S.decideCategoryRequest(r.request.id, true, { role: 'OGM' }, { demo: false }).ok).toBe(true);
    expect(S.getCategories(false).some((c) => c.dept === 'ORM' && c.name_th === 'ราคา promotion')).toBe(true);
    const { bellItems } = await import('../src/lib/bell-items');
    expect(bellItems.all(false).some((b) => b.target_type === 'ROLE' && b.target_id === 'GRM' && b.alert_type === 'CATEGORY_REQUEST')).toBe(true);
  });
  test('8 · shut-off row: type label, AC cancel still works (L0 rule)', () => {
    const a = liveTicket('2026-10-27', 'ORM', 'SYSTEM_SHUTOFF');
    expect(a().category_id).toBe('shutoff:ORM');
    expect(a().type).toBe('SYSTEM_SHUTOFF');
    const t = L0.ticketSnapshot().find((x) => x.ticket_id === a().ticket_id)!;
    expect(L0.transition(t.ticket_id, t.revision, 'CANCELLED', 'AC')).toBe(true);
    expect(a().display_status).toBe('CANCELLED');
  });
  test('9 · bell deep links: ticket / filter / OGM', () => {
    expect(R.bellTarget({ key: 'TICKET_NEW:L0:TKT-1', alert_type: 'TICKET_NEW', target_type: 'DEPT_QUEUE', target_id: 'ORM' }, null)).toEqual({ dept: 'ORM', ticket: 'TKT-1' });
    expect(R.bellTarget({ key: 'TICKET_OVERDUE:PS_CASE:case-9', alert_type: 'TICKET_OVERDUE', target_type: 'ROLE', target_id: 'MARCOM_LEAD' }, null)).toEqual({ dept: 'MARCOM', ticket: 'case-9' });
    expect(R.bellTarget({ key: 'TICKET_NO_DATE_DAILY:AC:2026-10-28', alert_type: 'TICKET_NO_DATE_DAILY', target_type: 'DEPT_QUEUE', target_id: 'AC' }, null)).toEqual({ dept: 'AC', ticket: 'filter:unaccepted' });
    expect(R.bellTarget({ key: 'CATEGORY_REQUEST:CR-1', alert_type: 'CATEGORY_REQUEST', target_type: 'ROLE', target_id: 'OGM' }, null)).toEqual({ dept: 'AUTO', ticket: 'ogm' });
  });
  test('mounted DEMO lane: GRM sees all, gear, modal and panel; member has no gear; no raw keys', async () => {
    const { createElement: h } = await import('react');
    const { act } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { setPsDemoSession } = await import('../src/lib/demo-session');
    const { setWsViewer } = await import('../src/lib/ws-viewer');
    const { ServiceReceiverLane, OgmCategoryGroup } = await import('../src/components/workspace/service-receiver');
    setPsDemoSession(true); L0.setTicketDemo(true);
    const div = document.createElement('div'); document.body.appendChild(div);
    const root = createRoot(div);
    const until = async (f: () => boolean, ms = 4000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await act(async () => { await new Promise((r) => setTimeout(r, 20)); }); } };
    setWsViewer('ORM', 'grm');
    await act(async () => { root.render(h(QueryClientProvider, { client: new QueryClient() }, h('div', null, h(ServiceReceiverLane, { dept: 'ORM', demo: true, liveRole: 'ORM' }), h(OgmCategoryGroup, { demo: true })))); });
    await until(() => div.querySelectorAll('[data-testid="recv-row"]').length > 5);
    expect(div.querySelector('[data-testid="recv-gear"]')).not.toBeNull();
    expect(div.textContent).toContain('ราคา promotion'); // OGM pending DEMO request
    expect(domHits(div)).toEqual([]);
    const accept = div.querySelector('[data-testid="recv-accept"]') as HTMLButtonElement;
    await act(async () => { accept.click(); });
    await until(() => !!document.querySelector('[data-testid="recv-accept-modal"]'));
    expect((document.querySelector('[data-testid="recv-accept-submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(domHits(document.body)).toEqual([]);
    await act(async () => { setWsViewer('ORM', 'orm-toey'); });
    await until(() => !div.querySelector('[data-testid="recv-gear"]'));
    await act(async () => { root.unmount(); }); div.remove();
    setPsDemoSession(false); L0.setTicketDemo(false);
  });
});
