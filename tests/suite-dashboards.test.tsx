/* Suite Dashboards R1 (Patch B) §10 — acceptance tests. */
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';
import { landingOf, visibleApps, SIDEBAR_REGISTRY, itemsOf, canOpen } from '../src/lib/sidebar-registry';
import type { RoleKey } from '../src/lib/menu-role';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/?demo=1' });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => ({ measureText: (t: string) => ({ width: t.length * 7 }), font: '' }) });
});
afterAll(async () => { await GlobalRegistrator.unregister(); });
const roots: (() => unknown)[] = [];
afterEach(() => { roots.splice(0).forEach((f) => f()); document.body.innerHTML = ''; });
const until = async (f: () => boolean, ms = 15000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + document.body.textContent?.slice(0, 400)); await new Promise((r) => setTimeout(r, 20)); } };

async function mount(make: () => Promise<unknown>) {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { HrMembersProvider } = await import('../src/lib/hr-members');
  const { ContractLifecycleProvider } = await import('../src/lib/contract-lifecycle');
  const { ServicingProvider } = await import('../src/lib/ps-servicing');
  const { Ws2Provider } = await import('../src/lib/ws2-store');
  const { setPsDemoSession } = await import('../src/lib/demo-session');
  setPsDemoSession(true);
  const page = (await make()) as never;
  const el = h(ServicingProvider, { children: h(Ws2Provider, { children: h(HrMembersProvider, { children: h(ContractLifecycleProvider, { children: page }) }) }) });
  const router = createRouter({ routeTree: createRootRoute({ component: () => el }), history: createMemoryHistory({ initialEntries: ['/'] }) });
  if (!(document as { fonts?: unknown }).fonts) Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div); roots.push(() => act(() => root.unmount()));
  await act(async () => { await router.load(); root.render(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never))); });
  return div;
}
const h = async () => (await import('react')).createElement;

describe('DB2 Overview — visible apps + ไปที่', () => {
  const roles: RoleKey[] = ['HOC', 'PM', 'AC', 'GRM', 'MKT_LEAD', 'BDM', 'TM', 'OGM', 'HR'];
  test('each role sees only apps it can open, every landing opens for that role', () => {
    for (const r of roles) {
      const apps = visibleApps(r);
      expect(apps.length).toBeGreaterThan(0);
      for (const a of apps) { const l = landingOf(a, r); expect(l).toBeTruthy(); expect(canOpen(l!, r)).not.toBe(false); }
    }
    expect(visibleApps('TM').map((a) => a.key)).not.toContain('AC');
    expect(visibleApps('HOC').map((a) => a.key)).toEqual(SIDEBAR_REGISTRY.map((a) => a.key).filter((k) => visibleApps('HOC').some((x) => x.key === k)));
  }, 30000);
  test('placeholder Dashboards of BD / AC / AUTO became pages', () => {
    for (const [app, route] of [['BD', '/bd/dashboard'], ['AC', '/ac/dashboard'], ['AUTO', '/automation/dashboard']] as const) {
      const it = itemsOf(SIDEBAR_REGISTRY.find((a) => a.key === app)!).find((i) => i.key === 'dashboard')!;
      expect(it.kind).toBe('page');
      expect((it as { route: string }).route).toBe(route);
    }
  }, 30000);
});

describe('Mounted dashboards (DEMO)', () => {
  // mounted pages need more than the 5 s default
  const T = 30000;
  const check = (div: HTMLElement) => {
    expect(domHits(div)).toEqual([]);
    div.querySelectorAll('[data-testid="dash-sample"]').forEach((s) => { expect(s.textContent).toContain('ข้อมูลตัวอย่าง'); expect(s.textContent).toContain('ที่มา (เมื่อเชื่อมแล้ว)'); });
    div.querySelectorAll('[data-testid="dash-card"]').forEach((c) => expect(c.querySelector('[data-testid="dash-info"]')).not.toBeNull());
  };
  test('Overview: HOC sees all 8 app cards with ไปที่', async () => {
    const { SuiteOverviewPage } = await import('../src/components/suite-dash/overview');
    const div = await mount(async () => (await h())(SuiteOverviewPage));
    await until(() => !!div.querySelector('[data-testid="suite-overview"]'));
    expect(div.querySelectorAll('[data-testid^="ov-app-"]').length).toBe(visibleApps('HOC').length);
    expect(div.querySelector('[data-testid="ov-go-AC"]')?.textContent).toBe('ไปที่ AC App →');
    check(div);
  }, 30000);
  test('ORM: funnel is the Meeting & Survey component; active contracts = PS header', async () => {
    const { OrmDashboard } = await import('../src/components/suite-dash/orm-marcom-dashboards');
    const { headerDemoInput } = await import('../src/lib/ps-header-r2-demo');
    const { tabR1HeaderActive } = await import('../src/lib/contract-tab-r1-demo');
    const div = await mount(async () => (await h())(OrmDashboard, { assign: null }));
    await until(() => !!div.querySelector('[data-testid="orm-dashboard"]'));
    expect(div.querySelector('[data-testid="dash-mounted-funnel"] [data-testid="ms-funnel-ORM"]')).not.toBeNull();
    const expected = [...headerDemoInput().active, ...tabR1HeaderActive()].filter((r) => r.service === 'ORM').length;
    expect(div.querySelector('[data-testid="orm-tile-active"]')?.textContent).toContain(String(expected));
    check(div);
  }, 30000);
  test('Marcom: channel tiles + mounted funnel', async () => {
    const { MarcomDashboard } = await import('../src/components/suite-dash/orm-marcom-dashboards');
    const div = await mount(async () => (await h())(MarcomDashboard, { assign: null }));
    await until(() => !!div.querySelector('[data-testid="marcom-dashboard"]'));
    expect(div.querySelector('[data-testid="ms-funnel-MARCOM"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="mc-tile-meta"]')).not.toBeNull();
    check(div);
  }, 30000);
  test('AC: PS cards ① ② and the บิล Partner card are mounted', async () => {
    const { AcDashboardPage } = await import('../src/components/suite-dash/ac-hr-auto-dashboards');
    const div = await mount(async () => (await h())(AcDashboardPage));
    await until(() => !!div.querySelector('[data-testid="ac-dashboard"]'));
    expect(div.querySelector('[data-testid="dash-mounted-pb"] [data-testid="pb-card"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="dash-mounted-grade"]')?.textContent).toContain('เกรดการชำระ A–D');
    expect(div.querySelector('[data-testid="dash-mounted-debtor"]')?.textContent).toContain('ลูกหนี้ที่ต้องติดตาม');
    check(div);
  }, 30000);
  test('BD / AUTO / HR render with sample tags', async () => {
    const { BdDashboardPage } = await import('../src/components/suite-dash/bd-dashboard');
    const m = await import('../src/components/suite-dash/ac-hr-auto-dashboards');
    for (const [C, id] of [[BdDashboardPage, 'bd-dashboard'], [m.AutoDashboardPage, 'auto-dashboard'], [m.HrDashboardTop, 'hr-dashboard-top']] as const) {
      const div = await mount(async () => (await h())(C));
      await until(() => !!div.querySelector(`[data-testid="${id}"]`));
      expect(div.querySelectorAll('[data-testid="dash-sample"]').length).toBeGreaterThan(0);
      check(div);
      roots.splice(0).forEach((f) => f()); document.body.innerHTML = '';
    }
  }, 30000);
  test('period picker changes period cards only', async () => {
    const { OrmDashboard } = await import('../src/components/suite-dash/orm-marcom-dashboards');
    const { act } = await import('react');
    const div = await mount(async () => (await h())(OrmDashboard, { assign: null }));
    await until(() => !!div.querySelector('[data-testid="orm-dashboard"]'));
    const active = div.querySelector('[data-testid="orm-tile-active"]')!.textContent;
    const sel = div.querySelector('select[aria-label="ช่วงเวลา"]') as HTMLSelectElement;
    await act(async () => { sel.value = 'year'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(div.querySelector('[data-testid="orm-tile-active"]')!.textContent).toBe(active);
    expect(div.querySelector('[data-testid="orm-dashboard"]')!.textContent).not.toContain('เดือนนี้ ·');
  }, 30000);
});
