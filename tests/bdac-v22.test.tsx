/* BD-AC v2.2 — contract revenue (F1–F4, F8, chain, fixture), K1/K2, English dates (F9), mounted cards (F5). */
import { describe, expect, test } from 'bun:test';
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { demoAcViews, demoBdacLifecycles, BDAC_DEMO_NOW, DEMO_NOW, DEMO_REVENUE_RENEWAL_LINKS, DEMO_REVENUE_SKIPPED_INVOICES } from '../src/lib/ps-demo-fixture';
import { applyChains, chainCount, costReconcile, revenueRows, toRevRows, unbilledContracts } from '../src/lib/bdac-revenue';
import { AC_BAND_CONFIG, bandCounts, bandIndexOf, splitStats } from '../src/lib/ac-revenue';
import { monthRange, v_bdac_flow, type Range } from '../src/lib/bdac-views';
import { formatDateEn, formatFullDateEn, formatMonthEn, THAI_MONTH_ABBR } from '../src/lib/date-en';
import { DashboardGlobal, defaultGlobalFilter, periodRange, selectedPeriod } from '../src/lib/ps-dashboard-global';
import { BdacTab } from '../src/components/ps/bdac-tab';
import { BdacFinanceSection } from '../src/components/ps/bdac-finance-section';
import { AcTab } from '../src/components/ps/ac-tab';

async function render(el: ReactElement) {
  const rootRoute = createRootRoute({ component: () => el });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  await router.load();
  return renderToStaticMarkup(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never)));
}
const visible = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const views = demoAcViews();
const rows = applyChains(toRevRows(views['v_bdac_contract_revenue_ranking']), DEMO_REVENUE_RENEWAL_LINKS);
const sep = (lens: 'ALL' | 'ORM' | 'MARCOM') => revenueRows(rows, '2026-09', lens);

describe('§3–§4 contract revenue (demo Sep 26)', () => {
  test('one row per contract; odd N 167 → split at ceil(N/2) = 84', () => {
    const all = sep('ALL');
    expect(all.length).toBe(167);
    expect(new Set(all.map((r) => r.contract_id)).size).toBe(167);
    expect(splitStats(all).half).toBe(84);
  });
  test('F1 ⑥ split value = ⑦ median line value (rank half amount)', () => {
    const all = sep('ALL');
    const s = splitStats(all);
    expect(s.splitValue).toBe(all[s.half - 1]!.amount_thb);
    expect(bandIndexOf(s.splitValue)).toBeLessThanOrEqual(AC_BAND_CONFIG.ceiling_thb / AC_BAND_CONFIG.step_thb);
  });
  test('F2 shares add to 100% and sums to total', () => {
    const s = splitStats(sep('ALL'));
    expect(Math.round(s.topShare + s.bottomShare)).toBe(100);
    expect(s.topSum + s.bottomSum).toBe(s.total);
  });
  test('F3 lens ORM ฿ + MARCOM ฿ = ALL ฿; contract counts ORM + MARCOM ≥ ALL', () => {
    const sum = (l: 'ALL' | 'ORM' | 'MARCOM') => sep(l).reduce((t, r) => t + r.amount_thb, 0);
    expect(sum('ORM') + sum('MARCOM')).toBe(sum('ALL'));
    expect(sep('ORM').length + sep('MARCOM').length).toBeGreaterThanOrEqual(sep('ALL').length);
  });
  test('F4 band counts sum to N; bands step ฿10,000 with open last band ≥100k', () => {
    const b = bandCounts(sep('ALL'));
    expect(b.reduce((t, x) => t + x.count, 0)).toBe(167);
    expect(b.at(-1)!.label).toBe('≥100k');
    expect(b[0]!.label).toBe('<10k');
  });
  test('F8 lens-ALL amount = fee + commission in v_ac_contract_cost_monthly (0 mismatches)', () => {
    const r = costReconcile(rows, views['v_ac_contract_cost_monthly'] ?? []);
    expect(r.compared).toBeGreaterThan(1000);
    expect(r.mismatches).toBe(0);
  });
  test('§3.2 renewed contracts continue their rank (not ใหม่); without the chain they would be new', () => {
    expect(chainCount(DEMO_REVENUE_RENEWAL_LINKS)).toBe(2);
    const noChain = applyChains(toRevRows(views['v_bdac_contract_revenue_ranking']), []);
    for (const l of DEMO_REVENUE_RENEWAL_LINKS) {
      const now = sep('ALL').find((r) => r.contract_id === l.new_contract_id)!;
      const oldAug = revenueRows(rows, '2026-08', 'ALL').find((r) => r.contract_id === l.contract_id)!;
      expect(now.prev_rank).toBe(oldAug.rank);
      expect(now.avg_rank).not.toBeNull();
      expect(revenueRows(noChain, '2026-09', 'ALL').find((r) => r.contract_id === l.new_contract_id)!.prev_rank).toBeNull();
    }
  });
  test('§10 fixture coverage', () => {
    const all = sep('ALL');
    const perHotel = new Map<string, number>();
    for (const r of all) perHotel.set(r.hotel_id, (perHotel.get(r.hotel_id) ?? 0) + 1);
    expect([...perHotel.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(10);
    expect(all.some((r) => r.orm_thb > 0 && r.marcom_thb > 0)).toBe(true);
    expect(unbilledContracts(rows, '2026-09', 'ALL')).toBeGreaterThanOrEqual(5);
    expect(all.filter((r) => r.prev_rank == null).length).toBeGreaterThanOrEqual(5);
    expect(all.filter((r) => r.amount_thb >= 100_000).length).toBeGreaterThanOrEqual(2);
    expect(all.some((r) => r.avg_rank == null) && all.some((r) => r.avg_rank != null)).toBe(true);
    expect(new Set(rows.map((r) => r.billing_period)).size).toBeGreaterThanOrEqual(12);
    expect(DEMO_REVENUE_SKIPPED_INVOICES).toBe(1);
  });
});

describe('K1 · previous-period Δ only when computable', () => {
  const deals = demoBdacLifecycles();
  const now = new Date(BDAC_DEMO_NOW).getTime();
  test('MTD keeps the oracle value; 6-month previous window before the earliest data → null', () => {
    expect(v_bdac_flow(deals, monthRange(0, now), monthRange(-1, now)).prev_won).toBe(3);
    const p6 = periodRange(selectedPeriod({ ...defaultGlobalFilter, range: '6m' }, new Date(now)));
    const prev6: Range = { from: p6.from - (p6.to - p6.from), to: p6.from };
    const f = v_bdac_flow(deals, p6, prev6);
    expect(f.prev_won).toBeNull();
    expect(f.prev_signed).toBeNull();
  });
  test('a covered window with no deals stays a real 0', () => {
    const covered: Range = { from: new Date('2026-10-16T00:00:00Z').getTime(), to: new Date('2026-10-16T00:00:01Z').getTime() };
    expect(v_bdac_flow(deals, monthRange(0, now), covered).prev_won).toBe(0);
  });
});

describe('§6 English dates + K2', () => {
  test('formatters', () => {
    expect(formatMonthEn('2026-09')).toBe('Sep 26');
    expect(formatMonthEn('2026-09-01', { monthOnly: true })).toBe('Sep');
    expect(formatDateEn('2026-07-22T05:00:00', new Date('2026-10-17'))).toBe('22 Jul');
    expect(formatDateEn('2025-07-22T05:00:00', new Date('2026-10-17'))).toBe('22 Jul 25');
    expect(formatFullDateEn(BDAC_DEMO_NOW)).toBe('17 Oct 2026');
  });
  test('F9 no Thai month abbreviation or Buddhist-era year on Tab BD-AC (demo)', async () => {
    const value = { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW };
    const html = await render(
      h(DashboardGlobal.Provider, { value },
        h('div', null,
          h(BdacTab, { source: demoBdacLifecycles(), globalFilter: defaultGlobalFilter, clock: new Date(BDAC_DEMO_NOW).getTime() }),
          h(BdacFinanceSection))),
    );
    const text = visible(html);
    expect(text).toContain('⑥ รายได้รายสัญญา');
    expect(text).toContain('⑪ ลูกหนี้ที่ต้องติดตาม');
    expect(THAI_MONTH_ABBR.filter((m) => text.includes(m))).toEqual([]);
    expect(/(^|\D)25[5-7]\d(\D|$)/.test(text)).toBe(false);
    expect(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (6[6-9]|7\d)(\D|$)/.test(text)).toBe(false);
  });
});

describe('F5 mounted cards show the AC tab numbers', () => {
  test('⑨ grade and ⑪ debtor answers equal the AC tab', async () => {
    const value = { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW };
    const period = selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW));
    const answers = (html: string) => [...html.matchAll(/class="dash-answer[^"]*">([^<]+)</g)].map((m) => m[1]);
    const ac = answers(await render(h(DashboardGlobal.Provider, { value }, h(AcTab, { views: demoAcViews(), loading: false, error: false, service: 'ALL', compare: false, demo: true, periodA: period, periodB: null }))));
    const fin = answers(await render(h(DashboardGlobal.Provider, { value }, h(BdacFinanceSection))));
    // AC tab order: debtor, grade, ORM fee mock, cost · BD-AC order: ⑥ ⑦ ⑧, ⑨ grade, ⑩ mock, ⑪ debtor
    expect(fin[3]).toBe(ac[1]);
    expect(fin[4]).toBe(ac[2]);
    expect(fin[5]).toBe(ac[0]);
  });
});
