/* On-board R1 §17 tests — Day left wording, invariants, queue chips / search / sort, owners, overall, settings versions,
 * card ⑤ Day-left lines, and the mounted tab (stage filter, Go Live card, deep link, drawer, highlight dropdown). */
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/ps?tab=servicing' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const lib = () => import('../src/lib/onboard-tab');
async function demoCards(versions?: import('../src/lib/setup-kpi-settings').SetupKpiVersion[]) {
  const { onboardDemo, ONB_DEMO_TODAY, ONB_DEMO_TEAMS } = await import('../src/lib/onboard-tab-demo');
  const { getSetupTiming } = await import('../src/lib/setup-timing');
  const { DEFAULT_KPI_VERSION } = await import('../src/lib/setup-kpi-settings');
  const { vOnbCards } = await lib();
  const ts = onboardDemo().map((x) => getSetupTiming(x, ONB_DEMO_TODAY));
  return { today: ONB_DEMO_TODAY, ts, cards: vOnbCards(ts, versions ?? [DEFAULT_KPI_VERSION], { name: (x) => x, members: (t) => (t ? ONB_DEMO_TEAMS[t] ?? [] : []) }) };
}

describe('§0.2 Day left', () => {
  test('table incl. edges', async () => {
    const { dayLeft, doneStatus, totalLeft } = await lib();
    expect([3, 5, 6, 7, 8].map((d) => dayLeft(d, { ok: 5, due: 7 }).text)).toEqual(['อีก 3 วันเหลือง', 'พรุ่งนี้เหลือง', 'พรุ่งนี้แดง', 'ครบกำหนดวันนี้ · พรุ่งนี้แดง', 'เลย 1 วัน']);
    expect(dayLeft(2, { ok: 2, due: 3 }).text).toBe('พรุ่งนี้เหลือง');
    expect(dayLeft(3, { ok: 2, due: 3 }).text).toBe('ครบกำหนดวันนี้ · พรุ่งนี้แดง');
    expect(dayLeft(6, { ok: 6, due: 7 })).toMatchObject({ tone: 'green', text: 'พรุ่งนี้เหลือง', flipTomorrow: true });
    expect(dayLeft(9, { ok: 5, due: 12 })).toMatchObject({ tone: 'amber', text: 'อีก 4 วันแดง', left: 3, flipTomorrow: false });
    expect(doneStatus(5, { ok: 5, due: 7 }).text).toBe('ทัน');
    expect(doneStatus(7, { ok: 5, due: 7 }).text).toBe('ทัน · ใกล้กำหนด');
    expect(doneStatus(9, { ok: 5, due: 7 }).text).toBe('เลย 2 วัน');
    expect(totalLeft(10, { ok: 11, due: 14 })).toEqual({ tone: 'grey', text: 'เป้ารวมเหลือ 4 วัน' });
    expect(totalLeft(14, { ok: 11, due: 14 }).text).toBe('ครบเป้ารวมวันนี้');
    expect(totalLeft(21, { ok: 11, due: 14 }).text).toBe('เลยเป้ารวม 7 วัน');
    expect(totalLeft(13, { ok: 11, due: 14 }, true).text).toBe('ทันเป้ารวม');
  });
});

describe('§16 DEMO + §17 invariants', () => {
  test('render numbers and named contracts', async () => {
    const { cards, today } = await demoCards();
    const { vOnbOverall, vOnbPipeline } = await lib();
    const o = vOnbOverall(cards, today);
    expect([o.inProg.length, o.inProg.filter((c) => c.svc === 'ORM').length, o.liveOrm, o.liveMc, o.cards, o.hotels]).toEqual([15, 11, 14, 8, 37, 35]);
    const by = (n: string) => cards.find((c) => c.t.hotel_name === n)!;
    expect(by('ภูผา บูทีค เชียงใหม่').status.text).toBe('เลย 2 วัน');
    expect(by('เดอะ ลากูน่า หัวหิน').status.text).toBe('ครบกำหนดวันนี้ · พรุ่งนี้แดง');
    expect(by('มณีรัตน์ เขาใหญ่').status).toMatchObject({ tone: 'grey', text: 'ประชุม 29 ต.ค.' });
    expect(by('ริเวอร์ไซด์ อยุธยา').lanes.w?.text).toBe('ประชุม 31 ต.ค.');
    expect(by('แกรนด์ พาเลซ ขอนแก่น').t.elapsed).toBe(21);
    expect(by('ทะเลหมอก ปาย').status.text).toBe('พรุ่งนี้เหลือง');
    // invariant 1/2: tile = pipeline Σ (excl. Go Live); Go Live tile = Σ Go Live cells
    const cells = [...vOnbPipeline(cards, 'ORM', today), ...vOnbPipeline(cards, 'Marcom', today)];
    expect(cells.filter((c) => c.stage !== 'go_live').reduce((s, c) => s + c.n, 0)).toBe(o.inProg.length);
    expect(cells.filter((c) => c.stage === 'go_live').reduce((s, c) => s + c.n, 0)).toBe(o.live.length);
    expect(new Set(cards.filter((c) => c.t.go_live).map((c) => c.t.go_live!.slice(0, 7))).size).toBeGreaterThanOrEqual(30);
  });
  test('stage lines: red grouped, then by text, max 2', async () => {
    const { stageLines } = await lib();
    const { cards } = await demoCards();
    const p1 = cards.filter((c) => !c.t.done && c.svc === 'ORM' && ['collect_data'].includes(c.stage));
    expect(stageLines(p1)[0]).toEqual({ tone: 'red', text: 'เลยกำหนด · 1' });
  });
  test('statuses use the card version; settings save leaves earlier cards unchanged', async () => {
    const { DEFAULT_KPI_VERSION, saveKpiVersion, DEFAULT_KPI_VALUES } = await import('../src/lib/setup-kpi-settings');
    const before = await demoCards();
    const vals = JSON.parse(JSON.stringify(DEFAULT_KPI_VALUES)); vals.p1 = { ok: 3, due: 4 };
    const r = saveKpiVersion([DEFAULT_KPI_VERSION], vals, before.today, 'PM', `${before.today}T05:00:00Z`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const after = await demoCards(r.versions);
    expect(after.cards.map((c) => c.status.text)).toEqual(before.cards.map((c) => c.status.text));
    // same-day save replaces that day's version
    const again = saveKpiVersion(r.versions, { ...vals, p1: { ok: 4, due: 6 } }, before.today, 'PM', `${before.today}T06:00:00Z`);
    expect(again.ok && again.versions.length).toBe(2);
    expect(again.ok && again.versions.at(-1)!.values.p1).toEqual({ ok: 4, due: 6 });
  });
});

describe('§7 queue · §10 owners · §11 overall', () => {
  test('chips, search by owner, sort', async () => {
    const { queueChipMatch, queueSort, matchSearch } = await lib();
    const { cards } = await demoCards();
    const q = cards.filter((c) => !c.t.done).sort(queueSort);
    expect(q[0]!.status.tone).toBe('red');
    expect(q.filter((c) => queueChipMatch(c, 'late')).length).toBe(4);
    expect(q.filter((c) => queueChipMatch(c, 'watch')).length).toBe(9);
    expect(q.filter((c) => queueChipMatch(c, 'flip')).every((c) => c.status.tone !== 'red')).toBe(true);
    expect(q.filter((c) => matchSearch(c, 'เตย')).every((c) => c.owners.team === 'A')).toBe(true);
    expect(q.filter((c) => matchSearch(c, 'แพร')).length).toBeGreaterThan(0);
  });
  test('owners table + custom range validation', async () => {
    const { vOnbOwners, wentInMonths, rangeMonths, customRangeError } = await lib();
    const { DEFAULT_KPI_VERSION } = await import('../src/lib/setup-kpi-settings');
    const { cards, today } = await demoCards();
    const went = wentInMonths(cards, rangeMonths({ kind: 'm6' }, today), today);
    const t = vOnbOwners(cards, 'p1', null, (c) => c.owners.ae, [DEFAULT_KPI_VERSION], went);
    expect(t.rows.map((r) => r.name).sort()).toEqual(['Fern', 'Nont', 'Ploy']);
    expect(t.sum.total).toBe(22);
    expect(t.sum.holding).toBeGreaterThan(0);
    expect(customRangeError('2026-10', '2026-05')).toBe('เดือนเริ่มต้องมาก่อนเดือนจบ');
    expect(customRangeError('2024-01', '2026-10')).toBe('เลือกได้ไม่เกิน 24 เดือน');
    expect(customRangeError('2025-01', '2026-10')).toBeNull();
  });
  test('overall: highlight never removes dots; person stats', async () => {
    const { vOnbDays, personStats, rangeMonths } = await lib();
    const { cards, today } = await demoCards();
    const d = vOnbDays(cards, 'ORM', rangeMonths({ kind: 'm6' }, today), today);
    expect(d.dots.length).toBe(14);
    const p = personStats(d.dots, (c) => c.owners.ae === 'Fern', d.median);
    expect(p.n).toBeLessThan(14);
    expect(d.dots.length).toBe(14);
  });
  test('HR demo overlay adds only missing members, in memory', async () => {
    const { demoHrOverlay } = await import('../src/lib/onboard-tab-demo');
    const base = [{ id: 'x', nickname: 'Fern', function: 'AE' as const, orm_team: null, active: true }];
    const out = demoHrOverlay(base);
    expect(out.filter((m) => m.nickname === 'Fern').length).toBe(1);
    expect(out.map((m) => m.nickname).sort()).toEqual(['Dao', 'Fern', 'Mint', 'Nont', 'Ploy']);
    expect(base.length).toBe(1);
  });
});

describe('mounted tab (DEMO)', () => {
  test('stage filter, Go Live card, drawer, highlight, unmounted pieces', async () => {
    const { act, createElement: h } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { DashboardGlobal, defaultGlobalFilter } = await import('../src/lib/ps-dashboard-global');
    const { ServicingTab, ServicingTabLegacy } = await import('../src/components/ps/servicing-tab');
    const { ServicingProvider } = await import('../src/lib/ps-servicing');
    const { HrMembersProvider } = await import('../src/lib/hr-members');
    expect(typeof ServicingTabLegacy).toBe('function');
    const el = h(DashboardGlobal.Provider, { value: { filter: { ...defaultGlobalFilter, role: 'PM' }, demo: true, now: '2026-10-28' } }, h(ServicingProvider, { children: h(HrMembersProvider, { children: h(ServicingTab) }) }));
    const router = createRouter({ routeTree: createRootRoute({ component: () => el }), history: createMemoryHistory({ initialEntries: ['/'] }) });
    const div = document.createElement('div'); document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => { await router.load(); root.render(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never))); });
    const until = async (f: () => boolean) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > 8000) throw new Error('timeout'); await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); } };
    await until(() => !!div.querySelector('[data-testid="onb-queue-table"]'));
    expect(div.textContent).not.toContain('รอระบุผู้ดูแล');
    expect(div.textContent).not.toContain('การ์ดที่ต้องจับตา');
    const rows = () => div.querySelectorAll('[data-testid="onb-queue-table"] tbody tr[data-card-row]').length;
    expect(div.querySelector('[data-testid="sd-queue"]')!.textContent).toContain('ในคิวตอนนี้ 15');
    // stage click filters + chip; second click clears
    const stage = div.querySelector<HTMLElement>('[data-testid="onb-lane-ORM"] [data-stage="rate_structure"]')!;
    await act(async () => { stage.click(); });
    expect(div.querySelector('[data-testid="onb-chips"]')!.textContent).toContain('stage: ORM · Rate Structure ✕');
    expect(rows()).toBe(2);
    await act(async () => { stage.click(); });
    expect(div.querySelector('[data-testid="onb-chips"]')!.textContent).not.toContain('stage:');
    // ⓘ click never filters
    await act(async () => { stage.querySelector<HTMLElement>('.onb-i')!.click(); });
    expect(div.querySelector('[data-testid="onb-chips"]')!.textContent).not.toContain('stage:');
    // Go Live card → Go Live tab + service
    await act(async () => { div.querySelector<HTMLElement>('[data-testid="onb-lane-Marcom"] [data-stage="go_live"]')!.click(); });
    await until(() => div.querySelector('[role="tab"][aria-selected="true"]')!.textContent!.includes('Go Live แล้ว'));
    expect(rows()).toBe(8);
    // row click opens the drawer; Esc closes
    await act(async () => { div.querySelector<HTMLElement>('[data-testid="onb-queue-table"] tbody tr[data-card-row]')!.click(); });
    expect(document.querySelector('[data-testid="onb-drawer"]')).toBeTruthy();
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(document.querySelector('[data-testid="onb-drawer"]')).toBeNull();
    // deep link opens the drawer
    await act(async () => { window.dispatchEvent(new CustomEvent('psdash:open-tab', { detail: { card: 'ONB-IP-1' } })); });
    await until(() => !!document.querySelector('[data-testid="onb-drawer"]'));
    expect(document.querySelector('[data-testid="onb-drawer"]')!.textContent).toContain('ภูผา บูทีค เชียงใหม่');
    expect(document.querySelector('[data-testid="onb-drawer"]')!.textContent).toContain('สร้าง ticket ติดตาม');
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    // highlight dropdown: AE + Specialist groups; selection shows the panel
    const sel = div.querySelector<HTMLSelectElement>('[data-testid="onb-hl"]')!;
    expect([...sel.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['AE', 'Specialist']);
    expect(sel.textContent).toContain('Ploy');
    await act(async () => { sel.value = 'AE:Fern'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(div.querySelector('[data-testid="onb-person"]')!.textContent).toContain('AE Fern');
    expect(div.querySelectorAll('.onb-dot').length).toBe(14);
    await act(async () => root.unmount());
  }, 30000);
});
