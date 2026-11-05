/* R4.1 §2 — forbidden-string check on the MOUNTED tabs: waits until card ⑤ and the queue table
 * (which render only after mount) show real content, then reads the text. */
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits, hits } from './forbidden-words';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps?demo=1' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // another test file stubs canvas without measureText; give charts a minimal 2D context
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => ({ measureText: (t: string) => ({ width: t.length * 7 }), font: '' }) });
});
afterAll(async () => { await GlobalRegistrator.unregister(); });

const until = async (f: () => boolean, ms = 15000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout waiting for late cards: ' + document.body.textContent?.slice(0, 600)); await new Promise((r) => setTimeout(r, 20)); } };

const roots: (() => unknown)[] = [];
afterEach(() => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; });
async function mount(which: 'ps' | 'servicing') {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { DashboardGlobal, defaultGlobalFilter, selectedPeriod } = await import('../src/lib/ps-dashboard-global');
  const { buildDemoReport, DEMO_NOW } = await import('../src/lib/ps-demo-fixture');
  const value = { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW };
  let body;
  if (which === 'ps') {
    const { PsReportTab } = await import('../src/components/ps/ps-report-tab');
    const { Account360Provider } = await import('../src/components/ps/account-360');
    const report = buildDemoReport(defaultGlobalFilter);
    body = h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW)) }, loading: false, error: false }) });
  } else {
    const { ServicingTab } = await import('../src/components/ps/servicing-tab');
    const { ServicingProvider } = await import('../src/lib/ps-servicing');
    const { HrMembersProvider } = await import('../src/lib/hr-members');
    body = h(ServicingProvider, { children: h(HrMembersProvider, { children: h(ServicingTab) }) });
  }
  const el = h(DashboardGlobal.Provider, { value }, body);
  const router = createRouter({ routeTree: createRootRoute({ component: () => el }), history: createMemoryHistory({ initialEntries: ['/'] }) });
  if (!(document as { fonts?: unknown }).fonts) Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { await router.load(); root.render(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never))); });
  return div;
}

describe('R4.1 forbidden strings after every card mounts (demo)', () => {
  test('สัญญา & ราคา incl. card ⑤', async () => {
    const div = await mount('ps');
    await until(() => !!div.querySelector('#setup-duration'));
    expect(domHits(div)).toEqual([]);
    // proof: a forbidden word injected into card ⑤ makes the check fail
    const card = div.querySelector('#setup-duration')!;
    const bad = document.createElement('span'); bad.textContent = 'RENEWED'; card.appendChild(bad);
    expect(domHits(div)).toEqual(['RENEWED']);
    bad.remove();
    expect(domHits(div)).toEqual([]);
  }, 20000);
  test('card ⑦ after survey labels draw: chips + hover text', async () => {
    const { act } = await import('react');
    const ds = await import('../src/lib/demo-session'); ds.setPsDemoSession(true);
    const div = await mount('ps');
    const health = () => div.querySelector('#contract-health');
    await until(() => !!health()?.textContent?.includes('คะแนนเซอร์เวย์ต่ำ') && !!health()?.textContent?.includes('ลูกค้าไม่ให้คะแนน'));
    const chips = [...health()!.querySelectorAll<HTMLElement>('.r1-chip')];
    expect(chips.length).toBeGreaterThan(0);
    const tips: string[] = [];
    // Stable open: focus alone depends on whether react-dom first loaded with a DOM (other test files import it without one), so also
    // fire the hover the popover listens for (mouseover → onMouseEnter) and wait for the popover before reading it.
    for (const c of chips) { await act(async () => { c.focus(); c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); });
      await until(() => document.querySelectorAll('.dash-tooltip-popover').length > 0, 2000).catch(() => {}); tips.push([...document.querySelectorAll('.dash-tooltip-popover')].map((e) => e.textContent ?? '').join(' ')); await act(async () => { c.blur(); c.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); }); }
    expect(tips.some((t) => t.includes('ลูกค้าตอบ') || t.includes('·'))).toBe(true);
    // ★ is forbidden everywhere again: sales-opportunity labels carry the text tag "โอกาสขาย" instead (display only).
    const opp = chips.filter((c) => c.className.includes('is-opp'));
    expect(opp.length).toBeGreaterThan(0);
    expect(opp.every((c) => c.textContent?.includes('โอกาสขาย'))).toBe(true);
    expect(chips.some((c) => (c.textContent ?? '').includes('★'))).toBe(false);
    expect(domHits(div)).toEqual([]);
    expect([...new Set(tips.flatMap((t) => hits(t)))]).toEqual([]);
    // the signals column ⓘ is the marker legend: open it and scan the text that actually draws
    const info = [...div.querySelectorAll<HTMLElement>('button.dash-info-btn')].find((b) => b.closest('th')?.textContent?.includes('สัญญาณ'));
    expect(info).toBeTruthy();
    await act(async () => { info!.click(); });
    const legend = [...document.querySelectorAll('.dash-info-pop')].map((e) => e.textContent ?? '').join(' ');
    expect(legend.includes('โอกาสขาย')).toBe(true);
    expect(hits(legend)).toEqual([]);
    await act(async () => { info!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    // proof: a raw key injected into one new survey label makes the check fail
    const label = chips.find((c) => c.textContent?.includes('คะแนนเซอร์เวย์ต่ำ'))!;
    const old = label.textContent!;
    label.textContent = `${old} SURVEY_LOW_SCORE`;
    expect(domHits(div)).toEqual(['SURVEY_LOW', 'SURVEY_LOW_SCORE']);
    label.textContent = old;
    expect(domHits(div)).toEqual([]);
    ds.setPsDemoSession(false);
  }, 30000);
  test('On-board / Off-board incl. queue table', async () => {
    const div = await mount('servicing');
    await until(() => !!div.querySelector('[data-testid="sd-queue"]'));
    expect(domHits(div)).toEqual([]);
    // P2 outside the allowed sections is still forbidden
    const bad = document.createElement('span'); bad.textContent = 'งาน P2'; div.appendChild(bad);
    expect(domHits(div)).toEqual(['P1/P2/P3']);
  }, 20000);
});
