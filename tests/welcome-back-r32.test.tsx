/* R3.2 — BD App › Workspace tabs (BD Workspace · BDM Workspace), Welcome Back lands in BDM Workspace first (WB9–WB15).
 * Mounts the real page (role switcher above the tab bar) against the real ticket store, plus the DEMO in-memory store. */
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/bd/tickets' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const TK = await import('../src/lib/tickets-l0');
const R = await import('../src/lib/welcome-back-routing');
const AD = await import('../src/lib/contract-age-demo');
const A = await import('../src/lib/contract-age');
const { WB } = await import('../src/lib/ps-glossary');
const { setRenewalTestMode } = await import('../src/lib/renewal-test-actor');

const bdm = R.wbActorOf('BDM', null), bd1 = R.wbActorOf('BD', 'BD-T1');
const BD1 = R.WB_TEST_BDS[0];
let n = 0;
function send(by: 'PM' | 'PS' = 'PM') {
  const cid = `CT-WB32-${++n}`;
  const o = TK.createWelcomeBack({ type: 'WELCOME_BACK', target_dept: 'BD', created_by: by, assignee: { member_id: 'BDM', display: 'BDM', role: 'BDM' },
    subject_ref: { hotel_id: `H-WB32-${n}`, hotel_name: 'โรงแรมทดสอบ R32', gap_service: 'ORM', contract_id: cid, service: 'ORM' }, payload: { readiness_tier: '', chips: [], note: '', contract_id: cid } });
  if (!o.ok) throw new Error('send failed');
  return { id: o.ticket_id, cid, t: () => TK.ticketById(o.ticket_id)! };
}
const live = () => { TK.setTicketDemo(true); TK.setTicketDemo(false); };

const roots: (() => unknown)[] = [];
afterEach(() => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; setRenewalTestMode(true); });
const until = async (f: () => boolean, ms = 3500) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + document.body.textContent?.slice(0, 400)); await new Promise((r) => setTimeout(r, 15)); } };
async function mountPage(demo: boolean, tab?: 'bd' | 'bdm') {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { BdWorkspacePage } = await import('../src/components/workspace/bd-workspace-page');
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { root.render(h(BdWorkspacePage, { demo, ...(tab ? { tab } : {}) })); });
  await until(() => !!div.querySelector('select[aria-label="สวมบท"]'));
  return div;
}
async function pickSelect(sel: HTMLSelectElement, value: string) { const { act } = await import('react'); await act(async () => { sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true })); }); }
/** Store writes after mount run inside act (React's scheduler is shared across test files in one process). */
async function inAct(f: () => unknown) { const { act } = await import('react'); await act(async () => { f(); }); }
async function click(el: Element) { const { act } = await import('react'); await act(async () => { (el as HTMLElement).click(); }); }
const roleSelect = (d: Element) => d.querySelector('select[aria-label="สวมบท"]') as HTMLSelectElement;
const memberSelect = (d: Element) => d.querySelector(`select[aria-label="${WB.memberAria}"]`) as HTMLSelectElement;
const tabs = (d: Element) => [...d.querySelectorAll('[role="tab"]')].map((t) => t.firstChild?.textContent ?? '');
const activeTab = (d: Element) => d.querySelector('[role="tab"][aria-selected="true"]')?.id;
const tabBtn = (d: Element, id: 'bd' | 'bdm') => d.querySelector(`#bdws-tab-${id}`)!;
const groupText = (d: Element, key: string) => d.querySelector(`[data-testid="wb-group-${key}"]`)?.textContent ?? '';
const bdSection = (d: Element) => d.querySelector('[data-testid="wb-section"]')?.textContent ?? '';
const asBd = async (d: Element, member: string) => { await pickSelect(roleSelect(d), 'BD'); await pickSelect(memberSelect(d), member); };

describe('R3.2 §1 / §4 tabs and role switcher', () => {
  test('1 · tabs BD Workspace · BDM Workspace in this order; ?tab=bdm opens BDM; no tab opens BD; route keeps /bd/tickets + ?tab', async () => {
    live();
    let d = await mountPage(false);
    expect(tabs(d)).toEqual(['BD Workspace', 'BDM Workspace']);
    expect(activeTab(d)).toBe('bdws-tab-bd');
    expect(d.textContent).toContain('ตารางนัด'); // the existing BD Workspace lanes
    roots.splice(0).forEach((f) => f()); document.body.innerHTML = '';
    d = await mountPage(false, 'bdm');
    expect(activeTab(d)).toBe('bdws-tab-bdm');
    const { Route } = await import('../src/routes/bd.tickets');
    const vs = (Route.options as { validateSearch: (s: Record<string, unknown>) => Record<string, unknown> }).validateSearch;
    expect(vs({ tab: 'bdm' })['tab']).toBe('bdm'); expect(vs({ tab: 'bd' })['tab']).toBe('bd'); expect('tab' in vs({})).toBe(false);
  });
  test('2 · role BDM → BDM tab · role BD → BD tab · switcher sits above the tab bar with the testing banner', async () => {
    live();
    const d = await mountPage(false);
    const sw = d.querySelector('[data-testid="bd-ws-switcher"]')!;
    expect(sw.compareDocumentPosition(d.querySelector('[role="tablist"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sw.textContent).toContain(WB.banner('BD', 'BD 1 (ทดสอบ)'));
    await pickSelect(roleSelect(d), 'BDM');
    expect(activeTab(d)).toBe('bdws-tab-bdm');
    expect(d.textContent).toContain(WB.banner('BDM', null));
    await pickSelect(roleSelect(d), 'BD');
    expect(activeTab(d)).toBe('bdws-tab-bd');
    expect(d.querySelectorAll('select[aria-label="สวมบท"]').length).toBe(1); // one switcher, page level only
  });
  test('3 · testing mode, role BD, BDM tab → only the box + switch link, no ticket data; testing off → BDM tab hidden for non-BDM', async () => {
    live();
    send();
    let d = await mountPage(false, 'bdm');
    const gate = d.querySelector('[data-testid="bdm-gate"]')!;
    expect(gate.textContent).toContain(WB.bdmOnly);
    expect(d.querySelectorAll('[data-testid="wb-row"]').length).toBe(0);
    expect(d.querySelector('[data-testid="wb-bdm-section"]')).toBeNull();
    await click([...gate.querySelectorAll('button')].find((b) => b.textContent === WB.bdmSwitch)!);
    expect(roleSelect(d).value).toBe('BDM');
    expect(d.querySelector('[data-testid="wb-bdm-section"]')).not.toBeNull();
    roots.splice(0).forEach((f) => f()); document.body.innerHTML = '';
    setRenewalTestMode(false);
    d = await mountPage(false, 'bdm');
    expect(tabs(d)).toEqual(['BD Workspace']);
    expect(activeTab(d)).toBe('bdws-tab-bd');
    expect(d.querySelector('[data-testid="bd-ws-banner"]')).toBeNull();
  });
});

describe('R3.2 §2 / §3 routing in normal mode (real ticket store)', () => {
  test('4 · PM sends → BDM Workspace › รอมอบหมาย; not in BD Workspace for BD 1, BD 2 or BDM', async () => {
    live();
    const s = send('PM');
    const d = await mountPage(false);
    await asBd(d, 'BD-T1'); expect(bdSection(d)).not.toContain(s.id);
    await asBd(d, 'BD-T2'); expect(bdSection(d)).not.toContain(s.id);
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(s.id);
    expect(groupText(d, 'pending')).toContain(WB.quickAssign);
    await click(tabBtn(d, 'bd'));
    expect(d.querySelector('[data-testid="wb-bdm-hint"]')?.textContent).toBe(WB.bdmHint);
    expect(d.textContent).not.toContain(s.id);
  });
  test('5 · BDM assigns BD 1 → มอบหมายแล้ว (BDM tab, sub-label) and BD 1 ของฉัน; BD 2 not', async () => {
    live();
    const s = send('PM');
    expect(TK.assignWelcomeBack(s.t(), BD1, bdm).ok).toBe(true);
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).not.toContain(s.id);
    expect(groupText(d, 'assigned')).toContain(s.id);
    expect(groupText(d, 'assigned')).toContain('BD 1 (ทดสอบ) · มอบหมายแล้ว');
    const chip = (label: string) => [...d.querySelectorAll('[data-testid="wb-member-chips"] button')].find((b) => b.textContent === label)!;
    await click(chip('BD 2 (ทดสอบ)')); expect(groupText(d, 'assigned')).not.toContain(s.id);
    await click(chip(WB.allMembers)); expect(groupText(d, 'assigned')).toContain(s.id);
    await asBd(d, 'BD-T1');
    expect(d.querySelector('[data-testid="wb-heading"]')?.textContent).toContain('Welcome Back · ของฉัน (');
    expect(groupText(d, 'mine')).toContain(s.id);
    await pickSelect(memberSelect(d), 'BD-T2');
    expect(groupText(d, 'mine')).not.toContain(s.id);
  });
  test('6 · BD 1 เริ่มทำ → เสร็จ; BDM tab shows it under ปิดแล้ว when the toggle is on; lock released', async () => {
    live();
    const s = send('PM'); TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(TK.startWelcomeBack(s.t(), bd1).ok).toBe(true);
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'assigned')).toContain('BD 1 (ทดสอบ) · กำลังทำ');
    await inAct(() => expect(TK.finishWelcomeBack(s.t(), bd1).ok).toBe(true));
    await until(() => !groupText(d, 'assigned').includes(s.id));
    expect(d.querySelector('[data-testid="wb-group-closed"]')).toBeNull();
    await click(d.querySelector('[data-testid="wb-bdm-section"] input[type="checkbox"]')!);
    expect(groupText(d, 'closed')).toContain(s.id);
    expect(groupText(d, 'closed')).toContain(WB.closedBdm(0).replace(' (0)', ''));
    expect(TK.openWelcomeBackFor(s.cid)).toBeNull();
  });
  test('7 · BDM tab badge = number in รอมอบหมาย (hidden at 0)', async () => {
    live();
    const pending = () => R.wbPendingCount(TK.ticketSnapshot());
    const before = pending();
    const s = send('PS'); send('PM');
    const d = await mountPage(false);
    const badge = () => d.querySelector('[data-testid="bdm-tab-badge"]')?.textContent ?? null;
    expect(badge()).toBe(String(before + 2));
    await inAct(() => TK.assignWelcomeBack(s.t(), BD1, bdm));
    await until(() => badge() === String(before + 1));
    await inAct(() => { for (const t of TK.ticketSnapshot().filter((x) => x.type === 'WELCOME_BACK' && x.status === 'NEW' && !x.assigned_to)) TK.assignWelcomeBack(t, BD1, bdm); });
    await until(() => badge() === null);
    expect(pending()).toBe(0);
  });
  test('8 · ที่ฉันส่ง only for PM / PS / AE; creator cancel works', async () => {
    live();
    const s = send('PM');
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'PM');
    expect(d.querySelector('[data-testid="wb-heading"]')?.textContent).toContain(WB.bdSent);
    expect(groupText(d, 'sent')).toContain(s.id);
    for (const r of ['ORM', 'AC', 'BDM']) { await pickSelect(roleSelect(d), r); await click(tabBtn(d, 'bd')); expect(d.textContent).not.toContain(WB.bdSent); }
    await asBd(d, 'BD-T1'); expect(d.textContent).not.toContain(WB.bdSent);
    expect(R.isWbSender('AE') && R.isWbSender('PS') && R.isWbSender('PM')).toBe(true);
    expect(R.wbBdGroups(TK.ticketSnapshot(), R.wbActorOf('ORM', null), true)).toEqual([]);
    expect(TK.cancelWelcomeBack(s.t(), R.wbActorOf('PM', null)).ok).toBe(true);
    expect(s.t().status).toBe('CANCELLED');
  });
  test('10 · other ticket types render in the BD Workspace table as before, for every role', async () => {
    live();
    const r = TK.createTask({ type: 'UPSELL_PITCH', target_dept: 'BD', created_by: 'PM', subject_ref: { hotel_id: 'H-UP-32', hotel_name: 'โรงแรมอัปเซล 32', gap_service: 'MARCOM' }, payload: { readiness_tier: 'พร้อม', chips: [], note: '' } });
    const d = await mountPage(false);
    const table = () => d.querySelector('table')?.textContent ?? '';
    expect(table()).toContain(r.ticket_id);
    await pickSelect(roleSelect(d), 'BDM'); await click(tabBtn(d, 'bd'));
    expect(table()).toContain(r.ticket_id);
    expect(TK.allowedNext(TK.ticketById(r.ticket_id)!, 'BD')).toEqual(['IN_PROGRESS']);
  });
});

describe('R3.2 §5 / §6 / §7 PS label and DEMO', () => {
  test('5b · PS-side unassigned label = รอ BDM มอบหมาย (BDM Workspace); others unchanged', () => {
    live();
    const s = send();
    expect(R.wbPsStatus(s.t())).toBe('รอ BDM มอบหมาย (BDM Workspace)');
    TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(R.wbPsStatus(s.t())).toBe('มอบหมายแล้ว');
  });
  test('9 · DEMO: card ④ send → BDM tab dated 28 ต.ค. 69; #952–#954 groups; #951 shows ข้อมูลสัญญาไม่ครบ (ticket ทดสอบเก่า)', async () => {
    TK.setTicketDemo(false); TK.setTicketDemo(true); // PS DEMO page: ticket store in its in-memory DEMO mode
    const liveBefore = localStorage.getItem('meridia.tickets.v1');
    const { act, createElement: h } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useContractAge } = await import('../src/components/ps/use-contract-age');
    const { tabR1Demo } = await import('../src/lib/contract-tab-r1-demo');
    const data = tabR1Demo();
    let feed: ReturnType<typeof useContractAge>;
    const Probe = () => { feed = useContractAge(data); return null; };
    const div = document.createElement('div'); document.body.appendChild(div);
    const root = createRoot(div); roots.push(() => act(() => root.unmount()));
    await act(async () => { root.render(h(Probe)); });
    await until(() => !!feed);
    const row = A.churnRows(feed!.rows, AD.CONTRACT_AGE_DEMO_NOW, feed!.reasons, feed!.tickets).find((x) => !x.lock)!;
    const id = feed!.nextTicketId();
    const o = feed!.send(A.welcomeBackInput(row, { ticket_id: id, role: 'PM', draft: A.EMPTY_DRAFT, cycle: null, upsell: [], reason: null, timeline: [], label: (k) => k, today: AD.CONTRACT_AGE_DEMO_NOW }));
    expect(o.ok).toBe(true);
    // R3.3 WB17: a DEMO send always lands in the session DEMO store (not the ticket store's in-memory mode).
    expect(AD.demoWelcomeBackSink.items().find((t) => t.ticket_id === id)?.created_at).toBe('2026-10-28T03:00:00.000Z'); // DEMO clock, not 30 ก.ย.
    const d = await mountPage(true);
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(id);
    expect(groupText(d, 'pending')).toContain('28 ต.ค. 69');
    // Seeds as bundled (pure): #952 รอมอบหมาย · #953 / #954 มอบหมายแล้ว (BD 1 / BD 2) · #951 legacy row.
    const seeds = AD.contractAgeDemo().tickets;
    const g = R.wbBdmGroups(seeds, false);
    expect(g[0]!.rows.map((t) => t.ticket_id)).toEqual(['TKT-000952']);
    expect(g[1]!.rows.map((t) => t.ticket_id)).toEqual(expect.arrayContaining(['TKT-000951', 'TKT-000953', 'TKT-000954']));
    expect(R.wbMissingSnapshot(seeds[0]!)).toBe(true);
    expect(seeds[0]!.payload.snapshot).toBeUndefined(); // #951 itself never edited
    // On screen (seeds not already moved by an earlier test in this process — the DEMO sink lives for the session).
    const moved = new Set(AD.demoWelcomeBackSink.items().map((t) => t.ticket_id));
    if (!moved.has('TKT-000952')) expect(groupText(d, 'pending')).toContain('TKT-000952');
    for (const id2 of ['TKT-000953', 'TKT-000954']) if (!moved.has(id2)) expect(groupText(d, 'assigned')).toContain(id2);
    if (!moved.has('TKT-000951')) expect(groupText(d, 'assigned')).toContain(WB.legacyRow('TKT-000951'));
    await asBd(d, 'BD-T1'); if (!moved.has('TKT-000953')) expect(groupText(d, 'mine')).toContain('TKT-000953'); expect(groupText(d, 'mine')).not.toContain('TKT-000954');
    await pickSelect(memberSelect(d), 'BD-T2'); if (!moved.has('TKT-000954')) expect(groupText(d, 'mine')).toContain('TKT-000954');
    expect(localStorage.getItem('meridia.tickets.v1')).toBe(liveBefore);
    TK.setTicketDemo(false);
  });
  test('11 · forbidden strings stay out of both tabs (DEMO, BDM, closed shown)', async () => {
    const d = await mountPage(true);
    await pickSelect(roleSelect(d), 'BDM');
    await click(d.querySelector('[data-testid="wb-bdm-section"] input[type="checkbox"]')!);
    expect(domHits(d)).toEqual([]);
    await click(tabBtn(d, 'bd'));
    expect(domHits(d)).toEqual([]);
    await asBd(d, 'BD-T2');
    expect(domHits(d)).toEqual([]);
  });
});
