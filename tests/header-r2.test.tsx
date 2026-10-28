/* PS Dashboard · Header R2 — rule tests (§9). Values come from the spec (§4–§8) and the R2 demo fixture. */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { comparePeriods, daysIn, modeOf } from '../src/lib/card-compare';
import { delta, journeyScorecard, ormAsOf, marcomBox, priceOn, selToFilter, SEL_ALL, type GradeRow, type HeaderSel, type JourneyInput, type PortfolioContract, type PriceRow } from '../src/lib/ps-header-r2';
import { headerDemoInput, headerDemoMarcom, headerDemoPortfolio, HEADER_DEMO_NOW } from '../src/lib/ps-header-r2-demo';
import { marcomAppSource, MARCOM_NOT_CONNECTED } from '../src/lib/marcom-app-source';
import { defaultGlobalFilter } from '../src/lib/ps-dashboard-global';
import { CustomerJourneyScorecard } from '../src/components/ps/customer-journey-scorecard';
import { ActivePortfolio } from '../src/components/ps/active-portfolio';
import { PsHeaderFilters } from '../src/components/ps/ps-header-filters';

const month = comparePeriods({ mode: 'month' }, HEADER_DEMO_NOW);
const cmp = { golive: month, churn: month, score: month };
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const renderCard = (sel: HeaderSel, input: JourneyInput = headerDemoInput()) => renderToStaticMarkup(h(CustomerJourneyScorecard, { input, sel }));
/** Splits rendered scorecard HTML into cells keyed by data-col per row. */
function cells(html: string, svc: 'ORM' | 'Marcom') {
  const row = html.split(`data-testid="r2-row-${svc}"`)[1]!.split('data-testid="r2-row-')[0]!;
  return Object.fromEntries(row.split('data-col="').slice(1).map((c) => [c.slice(0, c.indexOf('"')), c]));
}

describe('§1 filter bar', () => {
  test('no period, Compare, All/ORM/Marcom or separate Role/Team/Person; one ทีม / คน picker', () => {
    const html = renderToStaticMarkup(h(PsHeaderFilters, { value: defaultGlobalFilter, onChange: () => {}, demo: false, onDemo: () => {}, options: { ormTeams: ['Team A'], marcom: ['แนน'], ae: ['Nont'] } }));
    expect(html).toContain('aria-label="ทีม / คน"');
    for (const gone of ['aria-label="ช่วงเวลา"', 'aria-label="Compare"', 'aria-label="Compare preset"', 'aria-label="Service"', 'aria-label="Role"', '>Team', '>Person', '6 เดือน']) expect(html).not.toContain(gone);
    expect(html).toContain('Clear All');
  });
  test('picker maps onto the existing AND lens', () => {
    expect(selToFilter({ kind: 'ORM', team: 'Team A' }, defaultGlobalFilter)).toMatchObject({ service: 'ORM', role: 'ORM', teams: ['Team A'], people: [] });
    expect(selToFilter({ kind: 'MARCOM', owner: 'แนน' }, defaultGlobalFilter)).toMatchObject({ service: 'Marcom', role: 'Marcom', people: ['แนน'] });
    expect(selToFilter({ kind: 'AE', ae: 'Nont' }, defaultGlobalFilter)).toMatchObject({ service: 'ALL', role: 'AE', people: ['Nont'] });
    expect(selToFilter(SEL_ALL, { ...defaultGlobalFilter, service: 'ORM', role: 'ORM', teams: ['x'] })).toMatchObject({ service: 'ALL', role: 'none', teams: [], people: [] });
  });
});

describe('§8 demo scorecard (month · ต.ค. 2569 vs ก.ย. 2569)', () => {
  const sc = journeyScorecard(headerDemoInput(), SEL_ALL, cmp);
  const [orm, mc] = sc.rows;
  test('ORM row', () => {
    expect([orm!.upcoming, orm!.queue.n, orm!.queue.wait, orm!.active]).toEqual([9, 6, { value: 12, k: 3, n: 6 }, 6]);
    expect(orm!.golive.mode).toEqual({ value: 18, k: 4, n: 14 });
    expect(orm!.golive.d).toMatchObject({ d: -3, tone: 'good' });
    expect(orm!.churn).toMatchObject({ out: 1, pct: 14.3, d: { d: 1, tone: 'bad' } });
    expect(orm!.score).toMatchObject({ mode: { value: 9, k: 5, n: 8 }, low: 0, d: { d: 0, tone: 'flat' } });
    expect([orm!.grades.c.length, orm!.grades.d.length]).toEqual([1, 0]);
  });
  test('Marcom row', () => {
    expect([mc!.upcoming, mc!.queue.n, mc!.queue.wait, mc!.active]).toEqual([6, 3, { value: 25, k: 2, n: 3 }, 4]);
    expect(mc!.golive).toMatchObject({ mode: { value: 21, k: 3, n: 8 }, d: { d: 4, tone: 'bad' } });
    expect(mc!.churn).toMatchObject({ out: 1, pct: 20, d: { d: 0, tone: 'flat' } });
    expect(mc!.score).toMatchObject({ mode: { value: 7, k: 3, n: 6 }, low: 2, d: { d: -1, tone: 'bad' } });
  });
  test('header totals 15 · 9 · 10 · 2', () => expect(sc.totals).toEqual({ upcoming: 15, queue: 9, active: 10, churn: 2 }));
  test('quarter and year values differ from month', () => {
    const q = comparePeriods({ mode: 'quarter' }, HEADER_DEMO_NOW), y = comparePeriods({ mode: 'year' }, HEADER_DEMO_NOW);
    const sq = journeyScorecard(headerDemoInput(), SEL_ALL, { golive: q, churn: q, score: q });
    const sy = journeyScorecard(headerDemoInput(), SEL_ALL, { golive: y, churn: y, score: y });
    expect(sq.rows[0]!.golive.d?.d).not.toBe(-3);
    expect(sy.rows[0]!.churn.out).not.toBe(1);
  });
});

describe('§4.4 / §5 ทีม / คน on the scorecard', () => {
  test('ORM team → Marcom row dimmed "นอกขอบเขต", totals hidden except col 1, col 1 unchanged', () => {
    const sel: HeaderSel = { kind: 'ORM', team: 'Team A' };
    const sc = journeyScorecard(headerDemoInput(), sel, cmp);
    expect(sc.rows[1]!.scoped).toBe(false);
    expect(sc.totals).toEqual({ upcoming: 15, queue: null, active: null, churn: null });
    expect(sc.rows.map((r) => r.upcoming)).toEqual([9, 6]);
    const html = renderCard(sel);
    const mc = cells(html, 'Marcom');
    expect(html.split('data-testid="r2-row-Marcom"')[1]!.split('data-col')[0]).toContain('นอกขอบเขต');
    expect(mc['c3']).toContain('r2-dim');
    expect(text(mc['c3']!)).not.toMatch(/\b0\b/);
    expect(text(mc['c1']!)).toContain('6');
    for (const k of ['c2a', 'c3', 'c4']) expect(html).toMatch(new RegExp(`data-testid="total-${k}"></div>`));
    expect(html).toContain('รวม 15 สัญญา');
    expect(html).toContain('เฉพาะสัญญาของ ORM Team A (ยกเว้นรอเริ่ม)');
  });
  test('AE → both rows filtered; totals = sum of rows for cols 1, 2a, 3, 4', () => {
    const sc = journeyScorecard(headerDemoInput(), { kind: 'AE', ae: 'ดาว' }, cmp);
    const [o, m] = sc.rows;
    expect(o!.active + m!.active).toBeLessThan(10);
    expect(sc.totals).toEqual({ upcoming: o!.upcoming + m!.upcoming, queue: o!.queue.n + m!.queue.n, active: o!.active + m!.active, churn: o!.churn.out + m!.churn.out });
    const all = journeyScorecard(headerDemoInput(), SEL_ALL, cmp);
    expect(all.totals.active).toBe(all.rows[0]!.active + all.rows[1]!.active);
  });
});

describe('§2 ณ วันนี้ cards and CompareControl', () => {
  test('ณ วันนี้ columns (1, 2a, 3) render no Δ', () => {
    const html = renderCard(SEL_ALL);
    for (const svc of ['ORM', 'Marcom'] as const) for (const k of ['c1', 'c2a', 'c3']) expect(cells(html, svc)[k]).not.toContain('delta-pill');
    expect(cells(html, 'ORM')['c2b']).toContain('delta-pill');
  });
  test('Active Portfolio header carries ณ วันนี้ and no Δ next to the total', () => {
    const p = headerDemoPortfolio();
    const html = renderToStaticMarkup(h(ActivePortfolio, { today: HEADER_DEMO_NOW, total: 10, active: headerDemoInput().active, contracts: p.contracts, prices: p.prices, marcom: headerDemoMarcom(), sel: SEL_ALL }));
    const head = html.split('class="ap-panels"')[0]!;
    expect(head).toContain('ณ วันนี้');
    expect(head).not.toContain('delta-pill');
    expect(head).toContain('รวม 10 สัญญา');
  });
  test('labels for 28 Oct 2569 and equal-length ranges', () => {
    const q = comparePeriods({ mode: 'quarter' }, HEADER_DEMO_NOW), y = comparePeriods({ mode: 'year' }, HEADER_DEMO_NOW);
    expect([month.short, q.short, y.short]).toEqual(['ต.ค. vs ก.ย.', 'Q4 vs Q3', 'ม.ค.–ต.ค. 69 vs 68']);
    expect(month.full).toBe('ต.ค. 2569 เทียบ ก.ย. 2569');
    for (const c of [month, q, y]) expect(daysIn(c.a)).toBe(daysIn(c.b));
    expect(month.b).toEqual({ from: '2026-09-01', to: '2026-09-28' });
    expect(q.b).toEqual({ from: '2026-07-01', to: '2026-07-28' });
    expect(y.b).toEqual({ from: '2025-01-01', to: '2025-10-28' });
  });
  test('Custom applies A and B', () => {
    const c = comparePeriods({ mode: 'custom', custom: { a: { from: '2026-07', to: '2026-09' }, b: { from: '2025-07', to: '2025-09' } } }, HEADER_DEMO_NOW);
    expect(c.a).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(c.b).toEqual({ from: '2025-07-01', to: '2025-09-30' });
    expect(c.short).toBe('Custom');
  });
});

describe('§4.1 mode helper', () => {
  test('values from the spec', () => {
    expect(modeOf([10, 18, 18, 18, 12, 9, 17, 7, 20, 27, 18, 11, 10, 24])).toEqual({ value: 18, k: 4, n: 14 });
    expect(modeOf([9, 14, 21])).toEqual({ value: 9, k: 1, n: 3 });
    expect(modeOf([])).toBeNull();
  });
});

describe('§3 layout', () => {
  test('every column header has the same 4 fixed layers (track · title · slot · total) so titles align', () => {
    const html = renderCard(SEL_ALL);
    const heads = html.split('data-testid="r2-colhead"').slice(1).map((s) => s.split('role="columnheader"')[0]!);
    expect(heads).toHaveLength(7);
    for (const hd of heads) {
      const order = ['r2-track', 'r2-col-title', 'r2-slot', 'r2-total'].map((c) => hd.indexOf(`class="${c}"`));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    }
    expect(readFileSync('src/styles.css', 'utf8')).toContain('.r2-colhead{display:grid;grid-template-rows:22px auto 30px 22px;');
  });
});

describe('§4.2 col 6 grade popover', () => {
  test('only C / D contracts; a two-service customer appears in both rows', () => {
    const g = (service: 'ORM' | 'Marcom', hotel: string, grade: string): GradeRow => ({ service, hotel_name: hotel, ae_name: 'ดาว', grade, overdue: 1, ae: 'AE001-ดาว', orm: null, marcom: null });
    const input = { ...headerDemoInput(), grades: { month: '2026-09', rows: [g('ORM', 'สองบริการ', 'D'), g('Marcom', 'สองบริการ', 'D'), g('ORM', 'ดีมาก', 'A'), g('Marcom', 'ปานกลาง', 'B'), g('ORM', 'ค้าง', 'C')] } };
    const sc = journeyScorecard(input, SEL_ALL, cmp);
    expect(sc.rows[0]!.grades.c.map((x) => x.hotel_name)).toEqual(['ค้าง']);
    expect(sc.rows[0]!.grades.d.map((x) => x.hotel_name)).toEqual(['สองบริการ']);
    expect(sc.rows[1]!.grades.d.map((x) => x.hotel_name)).toEqual(['สองบริการ']);
    expect([...sc.rows[0]!.grades.c, ...sc.rows[0]!.grades.d, ...sc.rows[1]!.grades.c, ...sc.rows[1]!.grades.d].every((x) => x.grade === 'C' || x.grade === 'D')).toBe(true);
  });
});

describe('§6 Active Portfolio', () => {
  const c = (id: string, sku: PortfolioContract['sku']): PortfolioContract => ({ service: 'ORM', contract_id: id, hotel_id: id, start: '2026-01-01', end: null, sku, ae: null, orm: null, marcom: null });
  test('Flat + Commission contract counted in both; Commission mean is unweighted', () => {
    const contracts = [c('X', { flat: true, commission: true }), c('Y', { commission: true }), c('Z', { flat: true })];
    const prices: PriceRow[] = [
      { contract_id: 'X', fee_amount: 10000, commission_pct: 10, effective_from: '2026-01-01', effective_to: null },
      { contract_id: 'Y', fee_amount: null, commission_pct: 16, effective_from: '2026-01-01', effective_to: null },
      { contract_id: 'Z', fee_amount: 30000, commission_pct: null, effective_from: '2026-01-01', effective_to: null },
    ];
    const r = ormAsOf(contracts, prices, '2026-10-28');
    expect([r.flat.n, r.commission.n]).toEqual([2, 2]);
    expect(r.commission.value).toBe(13); // (10 + 16) / 2, not revenue-weighted
    expect(r.flat.value).toBe(20000);
  });
  test('ORM compare uses the price row effective on the compare date', () => {
    const p = headerDemoPortfolio();
    expect(priceOn(p.prices, 'R2-O2', '2026-09-28')?.fee_amount).toBe(16000);
    expect(priceOn(p.prices, 'R2-O2', '2026-10-01')?.fee_amount).toBe(18000);
    const a = ormAsOf(p.contracts, p.prices, month.asOfA), b = ormAsOf(p.contracts, p.prices, month.asOfB);
    expect([a.flat.n, a.flat.value, a.commission.n, a.commission.value]).toEqual([4, 18500, 3, 12.5]);
    expect([b.flat.n, b.flat.value, b.commission.n, b.commission.value]).toEqual([5, 17300, 2, 13]);
    expect(delta(a.flat.value, b.flat.value, 'up')).toMatchObject({ d: 1200, tone: 'good' });
    expect(delta(a.commission.value, b.commission.value, 'down')).toMatchObject({ d: -0.5, tone: 'good' });
    expect(delta(a.flat.n, b.flat.n, 'neutral')?.tone).toBe('neutral');
  });
  test('Marcom demo boxes (totals within each period)', () => {
    const p = headerDemoPortfolio(), m = headerDemoMarcom();
    const ct = marcomBox(p.contracts, 'content', month.asOfA, month.a, m.posts), ctB = marcomBox(p.contracts, 'content', month.asOfB, month.b, m.posts);
    expect([ct.n, ct.value, ct.quota, Math.round(ct.completion!)]).toEqual([3, 10, 12, 83]);
    expect(ct.value! - ctB.value!).toBe(-2);
    const ad = marcomBox(p.contracts, 'ads', month.asOfA, month.a, m.ads), adB = marcomBox(p.contracts, 'ads', month.asOfB, month.b, m.ads);
    expect([ad.n, ad.value, adB.n, adB.value]).toEqual([2, 25000, 1, 22000]);
    const kl = marcomBox(p.contracts, 'kol', month.asOfA, month.a, m.kol), klB = marcomBox(p.contracts, 'kol', month.asOfB, month.b, m.kol);
    expect([kl.n, kl.value, kl.quota, kl.completion]).toEqual([2, 3, 4, 75]);
    expect(kl.completion! - klB.completion!).toBe(-10);
  });
});

describe('§7 Marcom App adapter', () => {
  test('stub reports not connected for all three pulls', async () => {
    for (const f of [marcomAppSource.getPostsByContract, marcomAppSource.getAdsTopUpsByContract, marcomAppSource.getKolVisitsByContract]) expect(await f(['C1'], month.a)).toEqual({ connected: false, reason: 'not_connected' });
  });
  test('not connected → "รอข้อมูลจาก Marcom App", no Δ, counts and quotas still shown', () => {
    const p = headerDemoPortfolio();
    const html = renderToStaticMarkup(h(ActivePortfolio, { today: HEADER_DEMO_NOW, total: 10, active: headerDemoInput().active, contracts: p.contracts, prices: p.prices, marcom: { posts: null, ads: null, kol: null }, sel: SEL_ALL }));
    for (const box of ['Content', 'Ads', 'KOL']) {
      const part = html.split(`data-testid="ap-box-${box}"`)[1]!.split('data-testid="ap-box-')[0]!;
      expect(part).toContain(MARCOM_NOT_CONNECTED);
      expect(part.split('class="ap-rows"')[1]).not.toContain('delta-pill');
    }
    const content = html.split('data-testid="ap-box-Content"')[1]!.split('data-testid="ap-box-')[0]!;
    expect(text(content)).toContain('3 สัญญา');
  });
});

describe('§9.11 forbidden strings (scorecard + Active Portfolio)', () => {
  const FORBIDDEN = ['RENEWAL_TERMS_APPROVAL', 'CUSTOMER_ENTITY_CHANGE', 'SOFT_FORCE', 'ADVISORY', 'SERVICING_STALL', 'CONTRACT_FOLLOWUP', 'UPSELL_PITCH', 'RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW', 'ASSIGNMENT_PENDING', 'RENEWED', 'NOT_RENEWED', 'IN_PROGRESS', 'LOST', 'NPS', 'row-1', '★', 'เพดาน', 'HTL-', 'customer_segment', 'EXISTING', 'ACTIVE ', 'INACTIVE', 'distinct', 'cohort', 'Cohort', 'median', 'average', 'Average'];
  test('none present in rendered text (incl. ⓘ definitions)', () => {
    const p = headerDemoPortfolio();
    const sc = text(renderCard(SEL_ALL)) + text(renderCard({ kind: 'ORM', team: 'Team A' }));
    const ap = text(renderToStaticMarkup(h(ActivePortfolio, { today: HEADER_DEMO_NOW, total: 10, active: headerDemoInput().active, contracts: p.contracts, prices: p.prices, marcom: headerDemoMarcom(), sel: SEL_ALL })));
    const src = readFileSync('src/components/ps/customer-journey-scorecard.tsx', 'utf8') + readFileSync('src/components/ps/active-portfolio.tsx', 'utf8');
    const infos = [...src.matchAll(/info: "([^"]+)"|info="([^"]+)"/g)].map((m) => m[1] ?? m[2]).join(' ');
    for (const t of [sc, ap, infos]) {
      expect(FORBIDDEN.filter((w) => t.includes(w))).toEqual([]);
      expect(/(^|[^A-Za-z])pp([^A-Za-z]|$)/.test(t)).toBe(false);
    }
  });
});

describe('§9.12 dark mode', () => {
  test('new header styles use tokens only (no hard-coded colours)', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    const block = css.slice(css.indexOf('/* Header R2 §2'));
    expect(block.length).toBeGreaterThan(1000);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/:\s*(white|black)\b/);
    expect(block).toContain('.dark{--r2-indigo:');
  });
});
