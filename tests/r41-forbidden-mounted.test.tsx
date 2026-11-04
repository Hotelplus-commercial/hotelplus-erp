/* R4.1 §2 — forbidden-string check on the MOUNTED tabs: waits until card ⑤ and the queue table
 * (which render only after mount) show real content, then reads the text. */
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps?demo=1' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const until = async (f: () => boolean, ms = 5000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout waiting for late cards'); await new Promise((r) => setTimeout(r, 20)); } };

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
  const div = document.createElement('div'); document.body.appendChild(div);
  await act(async () => { await router.load(); createRoot(div).render(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never))); });
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
  });
  test('On-board / Off-board incl. queue table', async () => {
    const div = await mount('servicing');
    await until(() => !!div.querySelector('[data-testid="sd-queue"]'));
    expect(domHits(div)).toEqual([]);
    // P2 outside the allowed sections is still forbidden
    const bad = document.createElement('span'); bad.textContent = 'งาน P2'; div.appendChild(bad);
    expect(domHits(div)).toEqual(['P1/P2/P3']);
  });
});
