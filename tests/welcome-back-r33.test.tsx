/* R3.3 WB16–WB21 — Welcome Back sent from card ④ reaches BDM Workspace › รอมอบหมาย on the REAL path:
 * two different pages, a full page load in between (everything unmounted, module memory reset, state re-read from storage),
 * the DEMO state of PS Dashboard followed by BD App › Workspace (no ?demo=1), fresh reads on focus / refresh. */
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
const DS = await import('../src/lib/demo-session');
const { WB } = await import('../src/lib/ps-glossary');
const { setRenewalTestMode } = await import('../src/lib/renewal-test-actor');

const roots: (() => unknown)[] = [];
const unmountAll = () => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; };
afterEach(() => { unmountAll(); DS.setPsDemoSession(false); TK.setTicketDemo(false); setRenewalTestMode(true); });
const until = async (f: () => boolean, ms = 3500) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + document.body.textContent?.slice(0, 400)); await new Promise((r) => setTimeout(r, 15)); } };
/** A full page load: nothing mounted, the ticket store back in its default (normal) mode, module memory re-read from storage. */
function fullLoad() { unmountAll(); TK.setTicketDemo(true); TK.setTicketDemo(false); TK.reloadTickets(); AD.reloadDemoWelcomeBack(); }

async function mountPage(urlDemo: boolean, opts: { tab?: 'bd' | 'bdm'; onDemoChange?: (on: boolean) => void } = {}) {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { BdWorkspacePage } = await import('../src/components/workspace/bd-workspace-page');
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { root.render(h(BdWorkspacePage, { demo: urlDemo, ...(opts.tab ? { tab: opts.tab } : {}), ...(opts.onDemoChange ? { onDemoChange: opts.onDemoChange } : {}) })); });
  await until(() => !!div.querySelector('select[aria-label="สวมบท"]'));
  return div;
}
/** PS Dashboard › card ④ send step (the same feed the drawer's `ส่ง Ticket` calls). */
async function cardFourSend(data: Parameters<typeof import('../src/components/ps/use-contract-age').useContractAge>[0], pick: (rows: import('../src/lib/contract-age').ChurnRow[]) => import('../src/lib/contract-age').ChurnRow | undefined) {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { useContractAge } = await import('../src/components/ps/use-contract-age');
  let feed: ReturnType<typeof useContractAge>;
  const Probe = () => { feed = useContractAge(data); return null; };
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { root.render(h(Probe)); });
  await until(() => !!feed);
  const row = pick(A.churnRows(feed!.rows, data!.today, feed!.reasons, feed!.tickets).filter((x) => !x.lock));
  if (!row) throw new Error('no lost contract to send');
  const id = feed!.nextTicketId();
  let o!: ReturnType<NonNullable<typeof feed>['send']>;
  await act(async () => { o = feed!.send(A.welcomeBackInput(row, { ticket_id: id, role: 'PM', draft: A.EMPTY_DRAFT, cycle: null, upsell: [], reason: null, timeline: [], label: (k) => k, today: data!.today })); });
  if (!o.ok) throw new Error('send failed');
  return { id: o.ticket_id, cid: row.contract_id };
}
async function pickSelect(sel: HTMLSelectElement, value: string) { const { act } = await import('react'); await act(async () => { sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function click(el: Element) { const { act } = await import('react'); await act(async () => { (el as HTMLElement).click(); }); }
async function fire(f: () => void) { const { act } = await import('react'); await act(async () => { f(); }); }
const roleSelect = (d: Element) => d.querySelector('select[aria-label="สวมบท"]') as HTMLSelectElement;
const memberSelect = (d: Element) => d.querySelector(`select[aria-label="${WB.memberAria}"]`) as HTMLSelectElement;
const groupText = (d: Element, key: string) => d.querySelector(`[data-testid="wb-group-${key}"]`)?.textContent ?? '';
const asBd = async (d: Element, member: string) => { await pickSelect(roleSelect(d), 'BD'); await pickSelect(memberSelect(d), member); };

let n = 0;
/** A Welcome Back written straight into browser storage, as another tab / page would (bypasses this page's module memory). */
function writeFromAnotherTab(over: Partial<import('../src/lib/tickets-l0').L0Ticket> = {}) {
  const s = JSON.parse(localStorage.getItem(TK.TICKETS_KEY) ?? '{"seq":0,"items":[]}') as { seq: number; items: unknown[] };
  const seq = s.seq + 1; const id = `TKT-${String(seq).padStart(6, '0')}`; const cid = `CT-R33-X${++n}`; const at = new Date().toISOString();
  const t = { ticket_id: id, type: 'WELCOME_BACK', source_app: 'PS_DASHBOARD', created_by: 'PM', target_dept: 'BD', assignee: { member_id: 'BDM', display: 'BDM', role: 'BDM' },
    subject_ref: { hotel_id: `H-R33-${n}`, hotel_name: 'โรงแรมอีกแท็บ R33', gap_service: 'ORM', contract_id: cid, service: 'ORM' },
    payload: { readiness_tier: '', chips: [], note: '', contract_id: cid }, status: 'NEW', created_at: at, revision: 0, audit: [{ at, by: 'PM', from_status: null, to_status: 'NEW' }], ...over };
  localStorage.setItem(TK.TICKETS_KEY, JSON.stringify({ seq, items: [...s.items, t] }));
  return id;
}

/* Normal-mode PS data: one lost ORM contract with a Go Live date (Servicing card in browser storage). */
const LIVE_CID = 'CT-R33-LIVE-1';
function liveData() {
  localStorage.setItem('meridia.ps.servicing.v5_0', JSON.stringify({ cards: [{ contract_ref: LIVE_CID, property_id: 'H-R33-LIVE', service_line: 'ORM', go_live_at: '2025-02-01' }] }));
  return { today: new Date().toISOString().slice(0, 10), demo: false, activeToday: { ORM: 0, Marcom: 0 }, base: [], seedTickets: [],
    flow: [{ contract_id: LIVE_CID, hotel_id: 'H-R33-LIVE', hotel_name: 'โรงแรมโหมดปกติ R33', service: 'ORM' as const, start: '2025-01-10', end: '2026-01-09', end_reason: 'NOT_RENEWED' as const, renewal_of: null }] };
}

describe('R3.3 WB21 — the real two-page path', () => {
  test('1 · normal mode: card ④ send as PM → full page load → BD App › Workspace as BDM → in รอมอบหมาย', async () => {
    fullLoad();
    const s = await cardFourSend(liveData(), (rows) => rows.find((r) => r.contract_id === LIVE_CID));
    const stored = (JSON.parse(localStorage.getItem(TK.TICKETS_KEY)!) as { items: { ticket_id: string; type: string; status: string; target_dept: string }[] }).items.find((t) => t.ticket_id === s.id)!;
    expect([stored.type, stored.status, stored.target_dept]).toEqual(['WELCOME_BACK', 'NEW', 'BD']);
    fullLoad();
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(s.id);
    // done with this contract: creator cancels (releases the lock for later runs in this process)
    TK.cancelWelcomeBack(TK.ticketById(s.id)!, R.wbActorOf('PM', null));
  });

  test('2 · DEMO on in PS Dashboard → full page load → BD page WITHOUT ?demo=1 → in รอมอบหมาย, dated 28 ต.ค. 69, DEMO bar 28 ตุลาคม 2569', async () => {
    fullLoad();
    const liveBefore = localStorage.getItem(TK.TICKETS_KEY);
    DS.setPsDemoSession(true); TK.setTicketDemo(true); // PS Dashboard with DEMO on (switch or /ps?demo=1)
    const { tabR1Demo } = await import('../src/lib/contract-tab-r1-demo');
    const s = await cardFourSend(tabR1Demo(), (rows) => rows[rows.length - 1]);
    expect(sessionStorage.getItem(DS.DEMO_WB_KEY)).toContain(s.id);
    fullLoad(); // DEMO in-memory state gone; only the session key is left
    let followed: boolean | null = null;
    const d = await mountPage(false, { onDemoChange: (on) => { followed = on; } });
    expect(followed).toBe(true); // the page puts DEMO in its own URL too
    expect(d.querySelector('[data-testid="ws-demo-bar"]')?.textContent).toContain('28 ตุลาคม 2569');
    expect(d.textContent).not.toContain('30 กันยายน 2569');
    expect(d.querySelector('[data-testid="bd-ws-mode-mismatch"]')).toBeNull();
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(s.id);
    expect(groupText(d, 'pending')).toContain('28 ต.ค. 69');
    expect(localStorage.getItem(TK.TICKETS_KEY)).toBe(liveBefore); // DEMO never reaches the real store
    DS.setPsDemoSession(false); // DEMO off → DEMO tickets cleared
    expect(sessionStorage.getItem(DS.DEMO_WB_KEY)).toBeNull();
    expect(AD.demoWelcomeBackSink.items().some((t) => t.ticket_id === s.id)).toBe(false);
  });

  test('3 · a Welcome Back dated after the page / DEMO date still shows in รอมอบหมาย (no date window, oldest first)', async () => {
    fullLoad();
    const late = writeFromAnotherTab({ created_at: '2027-03-01T03:00:00.000Z' });
    const early = writeFromAnotherTab({ created_at: '2020-01-01T03:00:00.000Z' });
    fullLoad();
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    const txt = groupText(d, 'pending');
    expect(txt).toContain(late); expect(txt).toContain(early);
    expect(txt.indexOf(early)).toBeLessThan(txt.indexOf(late));
    // DEMO: dated after 28 ต.ค. 2569
    DS.setPsDemoSession(true);
    const base = AD.contractAgeDemo().tickets[1]!;
    AD.demoWelcomeBackSink.add({ ...base, ticket_id: 'TKT-001901', created_at: '2026-12-15T03:00:00.000Z', status: 'NEW', subject_ref: { ...base.subject_ref, contract_id: 'CT-R33-FUTURE' }, payload: { ...base.payload, contract_id: 'CT-R33-FUTURE' } });
    expect(R.wbBdmGroups(AD.demoWelcomeBackSink.items(), false)[0]!.rows.map((t) => t.ticket_id)).toContain('TKT-001901');
    for (const id of [late, early]) TK.cancelWelcomeBack(TK.ticketById(id)!, R.wbActorOf('PM', null));
  });

  test('4 · BD page open first, ticket sent from another tab → appears on focus and on รีเฟรช without reloading the app', async () => {
    fullLoad();
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    const a = writeFromAnotherTab();
    expect(groupText(d, 'pending')).not.toContain(a); // not yet read
    await fire(() => window.dispatchEvent(new Event('focus')));
    expect(groupText(d, 'pending')).toContain(a);
    const b = writeFromAnotherTab();
    await click(d.querySelector('[data-testid="wb-group-pending"] [data-testid="wb-refresh"]')!);
    expect(groupText(d, 'pending')).toContain(b);
    const c = writeFromAnotherTab();
    await fire(() => window.dispatchEvent(new StorageEvent('storage', { key: TK.TICKETS_KEY })));
    expect(groupText(d, 'pending')).toContain(c);
    for (const id of [a, b, c]) TK.cancelWelcomeBack(TK.ticketById(id)!, R.wbActorOf('PM', null));
  });

  test('5 · filters use stored keys: WELCOME_BACK / NEW shows; display labels (Welcome Back / New) never match', async () => {
    fullLoad();
    const key = writeFromAnotherTab();
    const typeLabel = writeFromAnotherTab({ type: TK.TYPE_TH.WELCOME_BACK as never });
    const statusLabel = writeFromAnotherTab({ status: TK.STATUS_TH.NEW as never });
    fullLoad();
    const d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    const pending = groupText(d, 'pending');
    expect(pending).toContain(key);
    expect(pending).not.toContain(typeLabel);
    expect(pending).not.toContain(statusLabel);
    TK.cancelWelcomeBack(TK.ticketById(key)!, R.wbActorOf('PM', null));
  });

  test('6 · mode mismatch shows the amber bar; สลับให้ตรงกัน fixes it', async () => {
    fullLoad();
    let asked: boolean | null = null;
    const d = await mountPage(true, { onDemoChange: (on) => { asked = on; } }); // ?demo=1 but PS Dashboard is normal
    const bar = d.querySelector('[data-testid="bd-ws-mode-mismatch"]')!;
    expect(bar.textContent).toContain(WB.modeMismatch('ปกติ', 'DEMO'));
    await click([...bar.querySelectorAll('button')].find((b) => b.textContent === WB.modeFix)!);
    expect(asked).toBe(false);
    expect(d.querySelector('[data-testid="bd-ws-mode-mismatch"]')).toBeNull();
    expect(d.querySelector('[data-testid="ws-demo-bar"]')).toBeNull(); // now normal, like PS Dashboard
    // PS DEMO switched on while the page is open → the page follows (no bar)
    await fire(() => DS.setPsDemoSession(true));
    console.log('DBG', DS.psDemoOn(), d.querySelector('[data-testid="bd-ws-mode-mismatch"]')?.textContent);
    expect(d.querySelector('[data-testid="bd-ws-mode-mismatch"]')).toBeNull();
    expect(d.querySelector('[data-testid="ws-demo-bar"]')).not.toBeNull();
  });

  test('7 · check panel (testing mode only): ในที่เก็บ = รอมอบหมาย + มอบหมายแล้ว + ปิดแล้ว + ไม่แสดง, ไม่แสดง = 0', async () => {
    for (const demo of [false, true]) {
      fullLoad();
      if (demo) DS.setPsDemoSession(true);
      const d = await mountPage(false);
      await pickSelect(roleSelect(d), 'BDM');
      const body = d.querySelector('[data-testid="wb-check-body"]')!;
      const num = (re: RegExp) => Number(re.exec(body.textContent ?? '')?.[1] ?? NaN);
      const inStore = num(/Welcome Back ในที่เก็บ: (\d+)/), p = num(/รอมอบหมาย: (\d+)/), a = num(/มอบหมายแล้ว: (\d+)/), c = num(/ปิดแล้ว: (\d+)/);
      expect(inStore).toBeGreaterThan(0);
      expect(p + a + c).toBe(inStore);
      expect(d.querySelector('[data-testid="wb-check-hidden"]')).toBeNull();
      expect(body.textContent).toContain(WB.check.page(WB.modeName(demo), DS.pageDateLabel(demo)));
      expect(body.textContent).toContain(WB.check.ps(WB.modeName(demo)));
      unmountAll(); DS.setPsDemoSession(false);
    }
    const audit = R.wbAudit([{ ...AD.contractAgeDemo().tickets[1]!, ticket_id: 'TKT-X', status: 'NEW' }]);
    expect(audit.inStore).toBe(audit.pending + audit.assigned + audit.closed + audit.hidden.length);
    setRenewalTestMode(false);
    const d = await mountPage(false, { tab: 'bdm' });
    expect(d.querySelector('[data-testid="wb-check"]')).toBeNull(); // hidden when testing mode is off (BDM tab not shown either)
  });

  test('8 · full flow (normal): BDM assigns BD 1 → BD 1 ของฉัน → เริ่มทำ → เสร็จ → card ④ lock released; BD 2 never sees it', async () => {
    fullLoad();
    const s = await cardFourSend(liveData(), (rows) => rows.find((r) => r.contract_id === LIVE_CID));
    fullLoad();
    const d = await mountPage(false);
    const bdm = R.wbActorOf('BDM', null), bd1 = R.wbActorOf('BD', 'BD-T1');
    const bd2Sees = async () => { await asBd(d, 'BD-T2'); return groupText(d, 'mine').includes(s.id); };
    await pickSelect(roleSelect(d), 'BDM');
    expect(groupText(d, 'pending')).toContain(s.id);
    expect(await bd2Sees()).toBe(false);
    await fire(() => { expect(TK.assignWelcomeBack(TK.ticketById(s.id)!, R.WB_TEST_BDS[0], bdm).ok).toBe(true); });
    await asBd(d, 'BD-T1'); expect(groupText(d, 'mine')).toContain(s.id);
    expect(await bd2Sees()).toBe(false);
    await fire(() => { expect(TK.startWelcomeBack(TK.ticketById(s.id)!, bd1).ok).toBe(true); });
    expect(await bd2Sees()).toBe(false);
    await fire(() => { expect(TK.finishWelcomeBack(TK.ticketById(s.id)!, bd1).ok).toBe(true); });
    expect(TK.ticketById(s.id)!.status).toBe('DONE');
    expect(TK.openWelcomeBackFor(s.cid)).toBeNull(); // card ④ can send again
    expect(await bd2Sees()).toBe(false);
  });

  test('9 · other ticket types in BD Workspace unchanged; forbidden strings stay out (normal + DEMO, check panel open)', async () => {
    fullLoad();
    const o = TK.createTask({ type: 'UPSELL_PITCH', target_dept: 'BD', created_by: 'PM', subject_ref: { hotel_id: 'H-R33-UP', hotel_name: 'โรงแรมอัปเซล R33', gap_service: 'Marcom' }, payload: { readiness_tier: 'READY', chips: [], note: '' } });
    let d = await mountPage(false);
    expect(d.textContent).toContain(o.ticket_id); // generic BD table lists it as before
    expect(R.wbBdmGroups(TK.ticketSnapshot(), true).flatMap((g) => g.rows).some((t) => t.ticket_id === o.ticket_id)).toBe(false);
    expect(domHits(d)).toEqual([]);
    unmountAll();
    DS.setPsDemoSession(true);
    d = await mountPage(false);
    await pickSelect(roleSelect(d), 'BDM');
    (d.querySelector('[data-testid="wb-check"]') as HTMLDetailsElement).open = true;
    expect(domHits(d)).toEqual([]);
  });
});
