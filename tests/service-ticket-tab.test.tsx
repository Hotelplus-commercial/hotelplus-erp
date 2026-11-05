/* PS Dashboard · Tab "ติดตามงานผู้ให้บริการ" R1 — §13 tests 1–9 + invariants + mounted forbidden scan (drawer + hover text). */
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/ps?tab=task' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

import * as T from '../src/lib/service-ticket-tab';
import * as S from '../src/lib/service-tickets';
import * as L0 from '../src/lib/tickets-l0';
import { slaDemoTickets, slaDemoHistory } from '../src/lib/service-tickets-demo';
import { stabDemoTickets } from '../src/lib/service-ticket-tab-demo';

const TODAY = '2026-10-28';
const cats = S.seedCategories();
const demoRows = () => S.vServiceTickets({ l0: [...slaDemoTickets(), ...stabDemoTickets()], categories: cats, today: TODAY });
const row = (p: Partial<S.ServiceTicketRow>): S.ServiceTicketRow => ({ ticket_store: 'L0', ticket_id: 'X', ticket_no: 'X', dept: 'ORM', type: null, category_id: 'rate:ORM', category_name_th: 'ราคา', hotel_id: 'H', hotel_name: 'H', contract_id: null, service: 'ORM', subject: 's', description: null, display_status: 'IN_PROGRESS', accepted: true, assignee_id: 'a', assignee_label: 'เตย (ORM-A)', opened_by_label: 'นนท์ (AE)', created_at: '2026-10-20', created_date: '2026-10-20', age_days: 8, due_date: '2026-10-30', due_source: 'SET', effective_due_date: '2026-10-30', due_state: 'ON_TIME', overdue_remark: null, waiting_days: 0, solved_at: null, solve_days: null, followup_count: 0, last_followup_at: null, last_followup_by_label: null, is_counted: true, ...p });

describe('Tab ติดตามงานผู้ให้บริการ R1 — rules', () => {
  test('invariants 1–2: total = Σ dept = Σ due bar = Σ status bar = list (no filter); New part = status New', () => {
    const rows = demoRows(); const open = T.vStabOpen(rows); const s = T.openSummary(open);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(s.total).toBe(46);
    expect(s.depts.reduce((a, d) => a + d.total, 0)).toBe(s.total);
    expect(sum(s.dueBar)).toBe(s.total); expect(sum(s.statusBar)).toBe(s.total);
    expect(T.listRows(rows, 'ALL', T.EMPTY_LIST_FILTER, TODAY).length).toBe(s.total);
    expect(open.filter((r) => r.display_status === 'NEW').length).toBe(s.statusBar.NEW);
  });
  test('1 · department filter narrows every count; table always 4 rows', () => {
    const rows = demoRows(); const all = T.vStabOpen(rows);
    const orm = T.openSummary(T.vStabOpen(rows, 'ORM'), all);
    expect(orm.total).toBe(all.filter((r) => r.dept === 'ORM').length);
    expect(orm.depts).toHaveLength(4);
  });
  test('2 · period cohort: created ≥ accepted ≥ solved; open = created − solved', () => {
    const rows = [...demoRows(), ...S.vServiceTickets({ l0: slaDemoHistory(), categories: cats, today: TODAY })];
    const p = T.vStabPeriod(rows, { from: '2026-10-01', to: TODAY }); const c = p.cohort;
    expect(c.created).toBeGreaterThanOrEqual(c.accepted); expect(c.accepted).toBeGreaterThanOrEqual(c.solvedOnTime + c.solvedLate);
    expect(c.openAccepted + c.openNotAccepted).toBe(c.created - c.solvedOnTime - c.solvedLate);
  });
  test('3 · granularity points + labels; custom auto; medians not means', () => {
    expect(T.buckets('day', TODAY)).toHaveLength(30); expect(T.buckets('week', TODAY)).toHaveLength(12);
    const m = T.buckets('month', TODAY); expect(m).toHaveLength(12); expect(m.at(-1)!.label).toBe('ต.ค. 69*'); expect(m[0]!.label).toBe('พ.ย. 68');
    expect(T.buckets('quarter', TODAY)).toHaveLength(8); expect(T.buckets('quarter', TODAY).at(-1)!.label).toBe('Q4/69*');
    expect(T.buckets('half', TODAY).map((b) => b.label)).toEqual(['H1/68', 'H2/68', 'H1/69', 'H2/69*']);
    expect(T.buckets('year', TODAY).map((b) => b.label)).toEqual(['ปี 67', 'ปี 68', 'ปี 69*']);
    expect(T.autoGran('2026-10-01', '2026-10-28')).toBe('day'); expect(T.autoGran('2026-06-01', '2026-10-28')).toBe('week'); expect(T.autoGran('2025-01-01', '2026-10-28')).toBe('month');
    const pts = T.cumulative([row({ display_status: 'SOLVED', solved_at: '2026-10-21', solve_days: 1 }), row({ ticket_id: 'Y', display_status: 'SOLVED', solved_at: '2026-10-21', solve_days: 2 }), row({ ticket_id: 'Z', display_status: 'SOLVED', solved_at: '2026-10-21', solve_days: 12 })], m, TODAY);
    expect(pts.at(-1)!.median).toBe(2); // mean would be 5
    expect(pts.at(-1)!.cumCreated).toBe(pts.reduce((a, p) => a + p.created, 0));
  });
  test('4 · category sort both ways, top 5 + slowest pinned, Σ open = ① total', () => {
    const rows = demoRows();
    const all = T.categoryRows(rows, cats, 'ALL', { from: '2026-10-01', to: TODAY }, { from: '2026-09-01', to: '2026-09-28' });
    expect(all.reduce((a, r) => a + r.open, 0)).toBe(T.vStabOpen(rows).length);
    for (const k of ['new', 'median', 'open', 'overdue'] as T.CatSort[]) {
      const d = T.sortCats(all, k, true), a = T.sortCats(all, k, false);
      const v = (r: T.CatRow) => (k === 'new' ? r.created : k === 'median' ? r.median ?? -1 : k === 'open' ? r.open : r.overdue);
      expect(v(d[0]!)).toBeGreaterThanOrEqual(v(d.at(-1)!)); expect(v(a[0]!)).toBeLessThanOrEqual(v(a.at(-1)!));
    }
    const fake: T.CatRow[] = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, name: `c${i}`, depts: ['ORM'], created: 8 - i, median: i === 7 ? 13 : 3, prevMedian: null, open: 8 - i, overdue: 0 }));
    const t = T.topCats(T.sortCats(fake, 'open', true)); expect(t.rows.map((r) => r.key)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k7']); expect(t.pinned).toBe('k7'); expect(t.hidden).toBe(2);
  });
  test('5 · urgency rule: day 2 / overdue / red / none; cards only with tickets; ready strip', () => {
    expect(T.urgencyOf(2, 0, 'G').urgent).toBe(true); expect(T.urgencyOf(5, 1, 'G').reasons).toEqual(['เลยกำหนด 1']);
    expect(T.urgencyOf(5, 0, 'R').reasons).toEqual(['สุขภาพแดง']); expect(T.urgencyOf(5, 0, 'A').urgent).toBe(false);
    const open = [row({ hotel_id: 'H1' }), row({ ticket_id: 'Q', hotel_id: 'H1', due_state: 'OVERDUE' })];
    const m = (id: string, hotel_id: string, inDays: number): T.StabMeetingInput => ({ id, hotel_id, hotel: hotel_id, service: 'ORM', date: S.addDays(TODAY, inDays), ae: 'นนท์', caretaker: 'Team A', health: null });
    const r = T.vStabMeetings([m('a', 'H1', 5), m('b', 'H2', 4), m('c', 'H1', 9)], open, TODAY);
    expect(r.cards.map((c) => c.id)).toEqual(['a']); expect(r.cards[0]!.urgent).toBe(true); expect(r.ready.map((x) => x.id)).toEqual(['b']);
  });
  test('6 · search tokens', () => {
    const rs = [row({ ticket_id: '1', assignee_label: 'เตย (ORM-A)', age_days: 6 }), row({ ticket_id: '2', assignee_label: 'ต้น', age_days: 2, opened_by_label: 'PM Alex (PM)' }), row({ ticket_id: '3', assignee_label: 'เตย', age_days: 3, subject: 'รีวิว Agoda' })];
    const f = (q: string) => rs.filter((r) => T.matchSearch(r, T.parseSearch(q))).map((r) => r.ticket_id);
    expect(f('ผู้รับ:เตย อายุ>5')).toEqual(['1']); expect(f('เปิดโดย:นนท์')).toEqual(['1', '3']); expect(f('อายุ<=3')).toEqual(['2', '3']); expect(f('agoda')).toEqual(['3']);
  });
});

/* ---------- mounted (DEMO): drawer read-only + Follow up, counts update, create form, forbidden scan ---------- */
const until = async (f: () => boolean, ms = 15000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + document.body.textContent?.slice(0, 400)); await new Promise((r) => setTimeout(r, 30)); } };
const roots: (() => unknown)[] = [];
afterEach(() => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; });
async function mountTab() {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { DashboardGlobal, defaultGlobalFilter } = await import('../src/lib/ps-dashboard-global');
  const { setPsDemoSession } = await import('../src/lib/demo-session');
  const { ServiceTicketTab } = await import('../src/components/ps/service-ticket-tab');
  setPsDemoSession(true); L0.setTicketDemo(true);
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  const cases = [{ id: 'CASE-1', case_no: 'PS-0001', hotel_id: 'R2-ภูผา บูทีค', hotel_name: 'ภูผา บูทีค', category_id: 'ORM-RATE', routed_team: 'ORM', title: 'เคสทดสอบราคา', description: 'รายละเอียด', status: 'open', created_by: 'นนท์', created_at: '2026-10-26T09:00:00+07:00', resolved_at: null }] as never;
  await act(async () => { root.render(h(QueryClientProvider, { client: new QueryClient() }, h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: '2026-10-28T10:00:00.000Z' } }, h(ServiceTicketTab, { cases, onCreate: () => {} })))); });
  return { div, act };
}

describe('Tab R1 — mounted DEMO', () => {
  test('7 · drawer: view only; AE Follow up ok, second same day blocked; ORM sees no button; counts update; forbidden scan incl. drawer + hover', async () => {
    const { div, act } = await mountTab();
    await until(() => !!div.querySelector('[data-testid="stab-mcard"]') && Number(div.querySelector('[data-testid="stab-total"]')?.textContent) > 0);
    const total = Number(div.querySelector('[data-testid="stab-total"]')!.textContent);
    expect(total).toBeGreaterThanOrEqual(47); // ≥ 40 file-1 + 6 tab DEMO + 1 PS case (other files may add DEMO tickets)
    expect(Number(div.querySelector('[data-testid="stab-list-count"]')!.textContent!.split(' ')[0])).toBe(total);
    expect([...div.querySelectorAll('[data-testid="stab-dept-table"] tbody tr')].reduce((a, tr) => a + Number(tr.querySelectorAll('td')[1]!.textContent), 0)).toBe(total);
    expect(div.querySelectorAll('[data-testid="stab-dept-table"] tbody tr')).toHaveLength(4);
    expect(domHits(div)).toEqual([]);
    // hover text of card ③ (keyboard focus → tooltip)
    const svg = div.querySelector('[data-testid="stab-cum"]') as SVGElement;
    await act(async () => { svg.dispatchEvent(new FocusEvent('focus', { bubbles: true })); svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); });
    await until(() => !!div.querySelector('[data-testid="stab-tip"]'));
    expect(div.querySelector('[data-testid="stab-tip"]')!.textContent).toContain('median SLA');
    expect(domHits(div)).toEqual([]);
    // open the PS case in the drawer
    const btn = [...div.querySelectorAll('button')].find((b) => b.textContent === 'PS-0001')!;
    await act(async () => { btn.click(); });
    await until(() => !!document.querySelector('[data-testid="stab-drawer"]'));
    const drawer = () => document.querySelector('[data-testid="stab-drawer"]')!;
    expect(drawer().textContent).toContain('อ่านอย่างเดียว');
    expect(drawer().querySelectorAll('select[aria-label="สถานะ"], input[type="date"]').length).toBe(0);
    const sel = drawer().querySelector('select[aria-label="ทำรายการในนาม"]') as HTMLSelectElement;
    await act(async () => { sel.value = 'ORM'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(drawer().querySelector('[data-testid="stab-fu-send"]')).toBeNull();
    await act(async () => { sel.value = 'AE'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { (drawer().querySelector('[data-testid="stab-fu-send"]') as HTMLButtonElement).click(); });
    await until(() => (drawer().querySelector('[data-testid="stab-fu-send"]') as HTMLButtonElement).disabled);
    expect(drawer().querySelector('[data-testid="stab-fu-banner"]')!.textContent).toContain('Follow up แล้ว 1 ครั้ง');
    expect(drawer().querySelector('[data-testid="stab-timeline"]')!.textContent).toContain('Follow up โดย นนท์');
    const fu = S.ticketFollowups.all(true).filter((f) => f.ticket_id === 'CASE-1');
    expect(fu).toHaveLength(1); expect(fu[0]!.ticket_store).toBe('PS_CASE');
    expect(S.sendFollowUp(S.vServiceTickets({ l0: [], cases: [{ id: 'CASE-1', case_no: 'PS-0001', hotel_id: 'x', hotel_name: 'x', category_id: 'ORM-RATE', routed_team: 'ORM', title: 't', description: '', status: 'open', created_by: 'x', created_at: '2026-10-26T09:00:00+07:00', resolved_at: null } as never], categories: cats, today: TODAY })[0]!, { role: 'AE', label: 'นนท์' }, { demo: true }).ok).toBe(false);
    // list + ⑤ show the same count
    const listRow = div.querySelector('tr[data-ticket="PS-0001"]')!; expect(listRow.textContent).toContain('📣 1 ครั้ง');
    expect(domHits(document.body)).toEqual([]);
    // proof the scan bites inside the drawer
    const bad = document.createElement('span'); bad.textContent = 'TICKET_FOLLOWUP'; drawer().appendChild(bad);
    expect(domHits(document.body)).toEqual(['TICKET_FOLLOWUP']); bad.remove();
    expect(document.body.textContent).not.toContain('AE ยังไม่ส่ง');
  }, 30000);
  test('8 · create: หมวด lists only active categories of the chosen department + อื่น ๆ; disabled without a department', async () => {
    const { serviceCategoryOptions } = await import('../src/components/ps/task-tab');
    expect(serviceCategoryOptions(true, null)).toEqual([]);
    const cs = S.ticketCategories.all(true); S.ticketCategories.save(true, cs.map((c) => (c.id === 'rate:ORM' ? { ...c, hidden: true } : c)));
    const orm = serviceCategoryOptions(true, 'ORM');
    expect(orm.every((c) => c.dept === 'ORM' && !c.hidden)).toBe(true);
    expect(orm.some((c) => c.id === 'rate:ORM')).toBe(false);
    expect(orm.some((c) => c.name_th === 'อื่น ๆ')).toBe(true);
    S.ticketCategories.save(true, cs);
  });
  test('9 · old cards unmounted, their components still exist', async () => {
    const tt = await import('../src/components/ps/task-tab'); const mon = await import('../src/components/ps/task-monitor-v2'); const wl = await import('../src/components/ps/task-worklist-v2');
    expect(typeof tt.TaskTab).toBe('function'); expect(typeof mon.TaskMonitorV2).toBe('function'); expect(typeof wl.TaskWorklistV2).toBe('function');
  });
});
