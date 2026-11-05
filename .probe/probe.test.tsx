/* probe: where does ★ appear in the mounted PS demo DOM? */
import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps?demo=1' }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => ({ measureText: (t: string) => ({ width: t.length * 7 }), font: '' }) }); });
afterAll(async () => { await GlobalRegistrator.unregister(); });
const until = async (f: () => boolean, ms = 15000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 20)); } };
test('locate star', async () => {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { DashboardGlobal, defaultGlobalFilter, selectedPeriod } = await import('../src/lib/ps-dashboard-global');
  const { buildDemoReport, DEMO_NOW } = await import('../src/lib/ps-demo-fixture');
  const { PsReportTab } = await import('../src/components/ps/ps-report-tab');
  const { Account360Provider } = await import('../src/components/ps/account-360');
  const value = { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW };
  const report = buildDemoReport(defaultGlobalFilter);
  const el = h(DashboardGlobal.Provider, { value }, h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW)) }, loading: false, error: false }) }));
  const router = createRouter({ routeTree: createRootRoute({ component: () => el }), history: createMemoryHistory({ initialEntries: ['/'] }) });
  if (!(document as any).fonts) Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div);
  await act(async () => { await router.load(); root.render(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never))); });
  await until(() => !!div.querySelector('#contract-health')?.textContent?.includes('คะแนนเซอร์เวย์ต่ำ'));
  const walk = (n: Element, path: string): any[] => {
    const out: any[] = [];
    for (const c of Array.from(n.children)) {
      const own = Array.from(c.childNodes).filter((x) => x.nodeType === 3).map((x) => x.textContent ?? '').join('');
      const p = `${path} > ${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''}${c.className && typeof c.className === 'string' ? '.' + c.className.split(' ').join('.') : ''}`;
      if (own.includes('★')) out.push({ p, text: own.trim().slice(0, 90) });
      out.push(...walk(c, p));
    }
    return out;
  };
  const hits = walk(div, 'root');
  console.log('STAR NODES:', hits.length);
  for (const x of hits.slice(0, 25)) console.log(' -', x.p, '::', x.text);
  const tips: string[] = [];
  const chips = [...div.querySelectorAll<HTMLElement>('#contract-health .r1-chip')];
  for (const c of chips) { await act(async () => { c.focus(); }); tips.push([...document.querySelectorAll('.dash-tooltip-popover')].map((e) => e.textContent ?? '').join(' ')); await act(async () => { c.blur(); }); }
  console.log('STAR IN TOOLTIPS:', tips.filter((t) => t.includes('★')).length, tips.filter((t) => t.includes('★')).slice(0, 5));
  root.unmount();
}, 40000);
