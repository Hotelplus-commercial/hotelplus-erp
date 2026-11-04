/* R3.1 — Welcome Back BDM-first routing (WB1–WB8): switcher roles, visibility, assign / start / finish / cancel,
 * lock, detail view, revision conflict, DEMO store, other ticket types unchanged, forbidden strings. */
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
const { WB, CL } = await import('../src/lib/ps-glossary');
const { setRenewalTestMode } = await import('../src/lib/renewal-test-actor');
import type { L0Ticket } from '../src/lib/tickets-l0';

const bdm = R.wbActorOf('BDM', null), bd1 = R.wbActorOf('BD', 'BD-T1'), bd2 = R.wbActorOf('BD', 'BD-T2'), pm = R.wbActorOf('PM', null);
const BD1 = R.WB_TEST_BDS[0], BD2 = R.WB_TEST_BDS[1];
let n = 0;
/** Normal mode send from card ④ (PM), exactly the R3 write path. */
function send(by: 'PM' | 'PS' = 'PM') {
  const cid = `CT-WB31-${++n}`;
  const o = TK.createWelcomeBack({ type: 'WELCOME_BACK', target_dept: 'BD', created_by: by, assignee: { member_id: 'BDM', display: 'BDM', role: 'BDM' },
    subject_ref: { hotel_id: `H-WB31-${n}`, hotel_name: 'โรงแรมทดสอบ', gap_service: 'ORM', contract_id: cid, service: 'ORM' }, payload: { readiness_tier: '', chips: [], note: '', contract_id: cid } });
  if (!o.ok) throw new Error('send failed');
  return { id: o.ticket_id, cid, t: () => TK.ticketById(o.ticket_id)! };
}
const ids = (g: ReturnType<typeof R.wbGroups>, key: string) => g.find((x) => x.key === key)?.rows.map((t) => t.ticket_id) ?? [];
const live = () => { TK.setTicketDemo(true); TK.setTicketDemo(false); };

/* ---------- mounting the real BD Workspace ---------- */
const roots: (() => unknown)[] = [];
afterEach(() => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; });
const until = async (f: () => boolean, ms = 8000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + document.body.textContent?.slice(0, 400)); await new Promise((r) => setTimeout(r, 15)); } };
async function mountShell(dept: 'BD' | 'PS', demo: boolean, ticket?: string) {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { WorkspaceShell } = await import('../src/components/workspace/workspace-shell');
  const { workspaceByDept } = await import('../src/lib/workspace-registry');
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { root.render(h(WorkspaceShell, { config: workspaceByDept(dept), demo, ticket })); });
  await until(() => !!div.querySelector('select[aria-label="สวมบท"]'));
  return div;
}
async function pickSelect(sel: HTMLSelectElement, value: string) {
  const { act } = await import('react');
  await act(async () => { sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function click(el: Element) { const { act } = await import('react'); await act(async () => { (el as HTMLElement).click(); }); }
const roleSelect = (d: Element) => d.querySelector('select[aria-label="สวมบท"]') as HTMLSelectElement;
const memberSelect = (d: Element) => d.querySelector(`select[aria-label="${WB.memberAria}"]`) as HTMLSelectElement | null;
const groupText = (d: Element, key: string) => d.querySelector(`[data-testid="wb-group-${key}"]`)?.textContent ?? '';

describe('R3.1 §2 testing-mode roles', () => {
  test('1 · BD Workspace switcher offers สวมบท BDM and สวมบท BD (+ member pick); default role unchanged; hidden outside testing mode / other workspaces', async () => {
    live();
    let d = await mountShell('BD', false);
    const labels = [...roleSelect(d).options].map((o) => o.textContent);
    expect(labels).toContain(WB.roleBdm); expect(labels).toContain(WB.roleBd);
    expect(labels).toEqual(['สวมบท PM', 'สวมบท BDM', 'สวมบท BD', 'สวมบท ORM', 'สวมบท MARCOM', 'สวมบท PS', 'สวมบท AC', 'สวมบท AUTO', 'สวมบท HR', 'สวมบท OFFICE']);
    expect(roleSelect(d).value).toBe('BD'); // default unchanged
    expect([...memberSelect(d)!.options].map((o) => o.textContent)).toEqual(['BD: BD 1 (ทดสอบ)', 'BD: BD 2 (ทดสอบ)', 'BD: BD 3 (ทดสอบ)']);
    expect(d.textContent).toContain(WB.testData);
    await pickSelect(roleSelect(d), 'BDM');
    expect(memberSelect(d)).toBeNull();
    roots.splice(0).forEach((f) => f()); document.body.innerHTML = '';
    setRenewalTestMode(false);
    d = await mountShell('BD', false);
    expect([...roleSelect(d).options].map((o) => o.textContent)).not.toContain(WB.roleBdm);
    expect(memberSelect(d)).toBeNull();
    setRenewalTestMode(true);
    roots.splice(0).forEach((f) => f()); document.body.innerHTML = '';
    d = await mountShell('PS', false);
    expect([...roleSelect(d).options].map((o) => o.textContent)).not.toContain(WB.roleBdm);
  });
});

describe('R3.1 §3 routing (normal mode, real ticket store)', () => {
  test('2 · a Welcome Back sent from card ④ lands under รอมอบหมาย for the BDM; no BD member sees it', async () => {
    live();
    const s = send();
    expect(ids(R.wbGroups(TK.ticketSnapshot(), bdm, false), 'pending')).toContain(s.id);
    expect(ids(R.wbGroups(TK.ticketSnapshot(), bd1, false), 'mine')).not.toContain(s.id);
    expect(ids(R.wbGroups(TK.ticketSnapshot(), bd2, false), 'mine')).not.toContain(s.id);
    const d = await mountShell('BD', false);
    expect(d.querySelector('[data-testid="wb-section"]')?.textContent).not.toContain(s.id); // default BD · BD 1
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(s.id);
    expect(groupText(d, 'pending')).toContain(WB.pill.pending);
  });
  test('3 · BDM assigns BD 1 → BD 1 ของฉัน, BD 2 not; PS drawer line shows มอบหมาย BD 1', async () => {
    live();
    const s = send();
    const o = TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(o.ok).toBe(true);
    const t = s.t();
    expect([t.assigned_to, t.assigned_to_label, t.assigned_by, t.status, t.revision]).toEqual(['BD-T1', 'BD 1 (ทดสอบ)', 'BDM-T', 'NEW', 1]);
    expect(t.assigned_at).toBeTruthy();
    expect(t.audit.at(-1)).toMatchObject({ from_status: 'NEW', to_status: 'NEW', note: 'assigned → BD 1 (ทดสอบ)' });
    expect(ids(R.wbGroups(TK.ticketSnapshot(), bd1, false), 'mine')).toContain(s.id);
    expect(ids(R.wbGroups(TK.ticketSnapshot(), bd2, false), 'mine')).not.toContain(s.id);
    expect(R.wbPsStatus(t)).toBe('มอบหมายแล้ว');
    expect(CL.drawer.ticketLine('4 พ.ย. 69', false, 0, t.assigned_to_label ?? null)).toBe('Welcome Back → BDM · 4 พ.ย. 69 · มอบหมาย BD 1 (ทดสอบ)');
    const d = await mountShell('BD', false);
    expect(groupText(d, 'mine')).toContain(s.id);
    await pickSelect(memberSelect(d)!, 'BD-T2');
    expect(groupText(d, 'mine')).not.toContain(s.id);
  });
  test('4 · BD 2 cannot start; BD 1 เริ่มทำ → กำลังทำ → เสร็จ; lock released after เสร็จ', () => {
    live();
    const s = send(); TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(TK.startWelcomeBack(s.t(), bd2)).toEqual({ ok: false, error: 'not_allowed' });
    expect(TK.finishWelcomeBack(s.t(), bd1)).toEqual({ ok: false, error: 'not_allowed' }); // not started yet
    expect(TK.startWelcomeBack(s.t(), bd1).ok).toBe(true);
    expect(R.wbPill(s.t())).toBe('กำลังทำ · BD 1 (ทดสอบ)');
    expect(R.wbPsStatus(s.t())).toBe('กำลังทำ');
    expect(TK.openWelcomeBackFor(s.cid)?.ticket_id).toBe(s.id);
    expect(TK.finishWelcomeBack(s.t(), bd2)).toEqual({ ok: false, error: 'not_allowed' });
    expect(TK.finishWelcomeBack(s.t(), bd1).ok).toBe(true);
    expect(s.t().status).toBe('DONE'); expect(R.wbPill(s.t())).toBe('เสร็จ');
    expect(TK.openWelcomeBackFor(s.cid)).toBeNull();
  });
  test('5 · BDM re-assigns while New (overwrites); cannot re-assign after กำลังทำ', () => {
    live();
    const s = send(); TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(TK.assignWelcomeBack(s.t(), BD2, bdm).ok).toBe(true);
    expect([s.t().assigned_to, s.t().assigned_to_label]).toEqual(['BD-T2', 'BD 2 (ทดสอบ)']);
    expect(TK.assignWelcomeBack(s.t(), BD1, bd1)).toEqual({ ok: false, error: 'not_allowed' }); // BD member never assigns
    TK.startWelcomeBack(s.t(), bd2);
    expect(TK.assignWelcomeBack(s.t(), BD1, bdm)).toEqual({ ok: false, error: 'not_allowed' });
  });
  test('6 · an unassigned New cannot be started by anyone; BDM ฉันทำเอง then BDM can start', () => {
    live();
    const s = send();
    for (const a of [bdm, bd1, bd2, pm]) expect(TK.startWelcomeBack(s.t(), a).ok).toBe(false);
    expect(R.wbActions(s.t(), bdm)).toEqual(['ASSIGN', 'SELF']);
    expect(TK.assignWelcomeBack(s.t(), R.WB_TEST_BDM, bdm).ok).toBe(true);
    expect(R.wbActions(s.t(), bdm)).toEqual(['ASSIGN', 'START']);
    expect(TK.startWelcomeBack(s.t(), bdm).ok).toBe(true);
    expect(TK.finishWelcomeBack(s.t(), bdm).ok).toBe(true);
  });
  test('7 · creator cancel works before เสร็จ and releases the lock; nobody else can cancel', () => {
    live();
    const s = send('PM'); TK.assignWelcomeBack(s.t(), BD1, bdm); TK.startWelcomeBack(s.t(), bd1);
    expect(TK.cancelWelcomeBack(s.t(), bd1)).toEqual({ ok: false, error: 'not_allowed' });
    expect(TK.cancelWelcomeBack(s.t(), R.wbActorOf('PS', null))).toEqual({ ok: false, error: 'not_allowed' });
    expect(R.wbVisible(s.t(), pm)).toBe(true); // creator keeps its own ticket (L0 cancel unchanged)
    expect(TK.cancelWelcomeBack(s.t(), pm).ok).toBe(true);
    expect(s.t().status).toBe('CANCELLED'); expect(TK.openWelcomeBackFor(s.cid)).toBeNull();
    const s2 = send('PM'); TK.assignWelcomeBack(s2.t(), BD1, bdm); TK.startWelcomeBack(s2.t(), bd1); TK.finishWelcomeBack(s2.t(), bd1);
    expect(TK.cancelWelcomeBack(s2.t(), pm).ok).toBe(false); // after เสร็จ
  });
  test('8 · lock holds while assigned-but-New and in progress; re-check on send still blocks', () => {
    live();
    const s = send(); TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(A.openWelcomeBack(TK.ticketSnapshot(), s.cid)?.ticket_id).toBe(s.id);
    const again = () => TK.createWelcomeBack({ type: 'WELCOME_BACK', target_dept: 'BD', created_by: 'PS', subject_ref: { hotel_id: 'H', hotel_name: 'H', gap_service: 'ORM', contract_id: s.cid }, payload: { readiness_tier: '', chips: [], note: '', contract_id: s.cid } });
    const o1 = again(); expect(!o1.ok && o1.locked?.ticket_id).toBe(s.id);
    TK.startWelcomeBack(s.t(), bd1);
    const o2 = again(); expect(!o2.ok && o2.locked?.ticket_id).toBe(s.id);
  });
  test('10 · stale revision is refused with ข้อมูลเปลี่ยนแล้ว · โหลดใหม่', async () => {
    live();
    const s = send(); const stale = s.t();
    TK.assignWelcomeBack(s.t(), BD1, bdm);
    expect(TK.assignWelcomeBack(stale, BD2, bdm)).toEqual({ ok: false, error: 'conflict' });
    expect(TK.cancelWelcomeBack(stale, pm)).toEqual({ ok: false, error: 'conflict' });
    expect(s.t().assigned_to).toBe('BD-T1');
    expect(WB.conflict).toBe('ข้อมูลเปลี่ยนแล้ว · โหลดใหม่');
  });
  test('12 · other ticket types: never in the Welcome Back section, same actions and same table as before', async () => {
    live();
    const r = TK.createTask({ type: 'UPSELL_PITCH', target_dept: 'BD', created_by: 'PM', subject_ref: { hotel_id: 'H-UP-31', hotel_name: 'โรงแรมอัปเซล', gap_service: 'MARCOM' }, payload: { readiness_tier: 'พร้อม', chips: [], note: '' } });
    const c = TK.createTask({ type: 'CONTRACT_SIGNAL', target_dept: 'BD', created_by: 'PM', subject_ref: { hotel_id: 'H-CS-31', hotel_name: 'โรงแรมสัญญาณ', gap_service: 'ORM' }, payload: { readiness_tier: '', chips: [], note: '', kind: 'NEW' } });
    const up = TK.ticketById(r.ticket_id)!, cs = TK.ticketById(c.ticket_id)!;
    for (const t of [up, cs]) for (const a of [bdm, bd1, pm]) { expect(R.wbVisible(t, a)).toBe(false); expect(TK.wbAllowed(t, a)).toEqual([]); }
    expect(TK.assignWelcomeBack(up, BD1, bdm)).toEqual({ ok: false, error: 'not_found' });
    expect(TK.allowedNext(up, 'BD')).toEqual(['IN_PROGRESS']);
    const d = await mountShell('BD', false);
    const table = () => d.querySelector('table')?.textContent ?? '';
    expect(table()).toContain(r.ticket_id); expect(table()).toContain(c.ticket_id);
    expect(d.querySelector('[data-testid="wb-section"]')?.textContent).not.toContain(r.ticket_id);
    const wbIds = TK.ticketSnapshot().filter((t) => t.type === 'WELCOME_BACK').map((t) => t.ticket_id);
    for (const id of wbIds) expect(table()).not.toContain(`#${id}`);
    await pickSelect(roleSelect(d), 'BDM'); // BDM works other types as BD
    expect(table()).toContain(r.ticket_id);
    expect(TK.transition(up.ticket_id, up.revision, 'IN_PROGRESS', 'BD')).toBe(true);
  });
});

describe('R3.1 §5 / §7 detail view and DEMO', () => {
  const seeds = () => AD.contractAgeDemo().tickets;
  test('11 · DEMO: 3 added tickets on existing lost contracts land in the right groups; card ④ demo send shows for BDM; nothing reaches real storage', () => {
    live();
    const liveBefore = localStorage.getItem('meridia.tickets.v1');
    const s = seeds();
    expect(s.map((t) => t.ticket_id)).toEqual(['TKT-000951', 'TKT-000952', 'TKT-000953', 'TKT-000954']);
    const sources = AD.contractAgeDemo().sources;
    for (const t of s.slice(1)) {
      const src = sources.find((x) => x.contract_id === t.subject_ref.contract_id)!;
      expect(src.end_kind === 'LOST' || src.end_kind === 'NOT_RENEWED').toBe(true);
      expect(t.payload.snapshot?.reasons.primary.length).toBe(2);
      expect(t.payload.snapshot?.package_rate['package']).toBeTruthy();
    }
    const all = R.wbMerge(TK.ticketSnapshot().filter(() => false), AD.demoWelcomeBackSink.items(), s);
    const g = R.wbGroups(all, bdm, false);
    expect(ids(g, 'pending')).toContain('TKT-000952');
    expect(ids(g, 'assigned')).toEqual(expect.arrayContaining(['TKT-000953', 'TKT-000954']));
    expect(ids(R.wbGroups(all, bd1, false), 'mine')).toEqual(['TKT-000953']);
    expect(ids(R.wbGroups(all, bd2, false), 'mine')).toEqual(['TKT-000954']);
    expect(R.wbPill(s[2]!)).toBe('มอบหมายแล้ว · BD 1 (ทดสอบ)'); expect(R.wbPill(s[3]!)).toBe('กำลังทำ · BD 2 (ทดสอบ)');
    // card ④ DEMO send (store in live mode → in-memory sink) appears for the BDM
    const row = A.churnRows(A.vPsContractAge(AD.contractAgeDemo().sources, { today: AD.CONTRACT_AGE_DEMO_NOW, links: [], history: AD.contractAgeDemo().prices }), AD.CONTRACT_AGE_DEMO_NOW, AD.contractAgeDemo().reasons, [...s, ...AD.demoWelcomeBackSink.items()]).find((x) => !x.lock)!;
    const id = AD.nextDemoTicketId();
    const inp = A.welcomeBackInput(row, { ticket_id: id, role: 'PM', draft: A.EMPTY_DRAFT, cycle: null, upsell: [], reason: null, timeline: [], label: (k) => k, today: AD.CONTRACT_AGE_DEMO_NOW });
    expect(TK.createWelcomeBack(inp, s, AD.demoWelcomeBackSink).ok).toBe(true);
    const ctx = { extra: s, sink: AD.demoWelcomeBackSink, at: `${AD.CONTRACT_AGE_DEMO_NOW}T03:00:00.000Z` };
    const merged = () => R.wbMerge([], AD.demoWelcomeBackSink.items(), s);
    expect(ids(R.wbGroups(merged(), bdm, false), 'pending')).toContain(id);
    // assign / start / finish in DEMO write only the in-memory copies (seed overridden by id), real storage untouched
    const sent = merged().find((t) => t.ticket_id === id)!;
    expect(TK.assignWelcomeBack(sent, BD1, bdm, ctx).ok).toBe(true);
    const seed952 = s[1]!;
    expect(TK.assignWelcomeBack(seed952, BD2, bdm, ctx).ok).toBe(true);
    expect(merged().find((t) => t.ticket_id === 'TKT-000952')?.assigned_to).toBe('BD-T2');
    expect(merged().find((t) => t.ticket_id === 'TKT-000952')?.assigned_at).toBe('2026-10-28T03:00:00.000Z'); // DEMO clock 28 ต.ค. 2569
    expect(seed952.assigned_to).toBeUndefined(); // seed entry itself never edited
    expect(localStorage.getItem('meridia.tickets.v1')).toBe(liveBefore);
    // with the ticket store in its DEMO mode the copy lives in that in-memory store instead
    TK.setTicketDemo(true);
    const s953 = s[2]!;
    expect(TK.startWelcomeBack(s953, bd1, { extra: s, at: ctx.at }).ok).toBe(true);
    expect(TK.ticketById('TKT-000953')?.status).toBe('IN_PROGRESS');
    expect(localStorage.getItem('meridia.tickets.v1')).toBe(liveBefore);
    TK.setTicketDemo(false);
  });
  test('9 · detail view: payload sections in order; Timeline only when shared; history lists created / assigned / started / done', async () => {
    TK.setTicketDemo(false);
    const d = await mountShell('BD', true, 'TKT-000954');
    await pickSelect(roleSelect(d), 'BD');
    await pickSelect(memberSelect(d)!, 'BD-T2');
    const row = [...d.querySelectorAll('[data-testid="wb-row"]')].find((b) => b.textContent?.includes('TKT-000954'))!;
    expect(row).toBeTruthy();
    await click(row);
    await until(() => !!document.querySelector('[data-testid="wb-detail"]'));
    const detail = () => document.querySelector('[data-testid="wb-detail"]')!;
    expect([...detail().querySelectorAll('[data-sec]')].map((e) => e.getAttribute('data-sec'))).toEqual(['info', 'package', 'exit', 'why', 'message', 'timeline', 'history']);
    expect(detail().textContent).toContain('Welcome Back · #TKT-000954');
    const hist = () => detail().querySelector('[data-sec="history"]')!.textContent ?? '';
    expect(hist()).toContain('สร้างโดย PS'); expect(hist()).toContain('มอบหมาย BDM (ทดสอบ) → BD 2 (ทดสอบ)'); expect(hist()).toContain('เริ่มทำ · BD 2 (ทดสอบ)');
    expect(domHits(document.body)).toEqual([]);
    const doneBtn = [...detail().querySelectorAll('button')].find((b) => b.textContent === WB.detail.done)!;
    await click(doneBtn);
    await until(() => (document.querySelector('[data-testid="wb-detail"] [data-sec="history"]')?.textContent ?? '').includes('เสร็จ · BD 2 (ทดสอบ)'));
    expect(document.querySelector('[data-testid="wb-detail"]')?.textContent).toContain(WB.detail.readOnly);
    // a ticket without a message / shared timeline hides those sections
    const s953 = AD.contractAgeDemo().tickets[2]!;
    expect(s953.payload.message).toBeUndefined(); expect(s953.payload.timeline_shared).toBe(false);
  });
  test('13 · forbidden strings stay out of the mounted BD Workspace (BDM, closed shown)', async () => {
    const d = await mountShell('BD', true);
    await pickSelect(roleSelect(d), 'BDM');
    const box = d.querySelector('[data-testid="wb-section"] input[type="checkbox"]')!;
    await click(box);
    await until(() => !!d.querySelector('[data-testid="wb-group-closed"]'));
    expect(d.querySelector('[data-testid="wb-section"]')?.textContent).toContain('TKT-000952');
    expect(domHits(d)).toEqual([]);
    const bad = document.createElement('span'); bad.textContent = 'IN_PROGRESS'; d.querySelector('[data-testid="wb-section"]')!.appendChild(bad);
    expect(domHits(d)).toEqual(['IN_PROGRESS']);
    bad.remove();
  });
});

export type { L0Ticket };
