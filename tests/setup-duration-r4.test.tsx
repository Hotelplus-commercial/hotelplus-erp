/* Tab R4 · สัญญา & ราคา · ระยะเวลา Setup (O-11) — acceptance tests (§17). Values come from the spec defaults and the R4 demo additions. */
import { describe, expect, test, beforeEach } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { DASHBOARD_TABS, SD } from '../src/lib/ps-glossary';
import { PsReportTab } from '../src/components/ps/ps-report-tab';
import { Account360Provider } from '../src/components/ps/account-360';
import { DashboardGlobal, defaultGlobalFilter, selectedPeriod } from '../src/lib/ps-dashboard-global';
import { buildDemoReport, DEMO_NOW } from '../src/lib/ps-demo-fixture';
import { TICKET_TYPE_TH } from '../src/lib/ps-glossary';
import { TYPE_TH } from '../src/lib/tickets-l0';
import {
  DEFAULT_KPI_VALUES, DEFAULT_KPI_VERSION, handoverFixEnabled, resetKpiVersions, saveKpiVersion, validateKpi, versionFor, type KpiValues,
} from '../src/lib/setup-kpi-settings';
import {
  addDays, chartLanes, compareCell, compareDefs, countsDifferMuch, equalCountCandidates, firstTimeRight, ftrAvailable, getSetupStatus, getSetupTiming,
  goLiveBounds, inGoLive, kpiBox, laneDots, mostRange, mostText, p80, pctChange, pctWithin, queueCount, queueLevel, QUEUE_PAGE, quickCounts, rangeError,
  shiftPeriod, shortStatus, stageSummary, statusFor, statusOf, surveyChange, timeChange, wentIn, type SetupInput, type SetupTiming,
} from '../src/lib/setup-timing';
import { setupDemo, SETUP_DEMO_TODAY } from '../src/lib/setup-duration-demo';

async function render(el: ReactElement) {
  const rootRoute = createRootRoute({ component: () => el });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  await router.load();
  return renderToStaticMarkup(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never)));
}
const card = (p: Partial<SetupInput>): SetupInput => ({
  card_id: 'C1', hotel_id: 'H1', hotel_name: 'Test', service_variant: 'ORM', created_at: '2026-10-01', approved_at: null, specialist_handover_done_at: null,
  meeting_created_at: null, meeting_date: null, go_live_at: null, ae: null, specialist: null, orm_team: null, marcom_owner: null, ...p,
});
const V = DEFAULT_KPI_VALUES;
const demo = setupDemo();
const T = demo.inputs.map((x) => getSetupTiming(x, SETUP_DEMO_TODAY));
const ST = new Map(T.map((t) => [t.card_id, statusFor(t, [DEFAULT_KPI_VERSION])]));
beforeEach(() => resetKpiVersions());

describe('§1 tabs and card removal', () => {
  test('1 · tab bar shows สัญญา & ราคา and On-board / Off-board; keys unchanged', () => {
    expect(DASHBOARD_TABS.map(([, l]) => l)).toEqual(['สัญญา & ราคา', 'ลูกหนี้ & ค่าใช้จ่ายรายสัญญา', 'Meeting & Survey', 'ติดตามงานผู้ให้บริการ', 'On-board / Off-board']);
    expect(DASHBOARD_TABS.map(([k]) => k)).toEqual(['ps', 'ac', 'meeting', 'task', 'servicing']);
  });
  test('2 · สัญญาณจากสัญญา no longer renders in tab สัญญา & ราคา; card ⑤ + ⑥ do', async () => {
    const report = buildDemoReport(defaultGlobalFilter);
    const html = await render(h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
      h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW)) }, loading: false, error: false }) })));
    expect(html).not.toContain('สัญญาณจากสัญญา');
    expect(html).toContain(SD.title);
    expect(html).toContain('ระยะเวลา Reset');
    expect(html).toContain('Coming soon');
    expect(html.indexOf(SD.title)).toBeLessThan(html.indexOf('ระยะเวลา Reset'));
  });
  test('HANDOVER_FIX is registered as ขอแก้งานส่งมอบ', () => {
    expect(TYPE_TH.HANDOVER_FIX).toBe('ขอแก้งานส่งมอบ');
    expect(TICKET_TYPE_TH['HANDOVER_FIX']).toBe('ขอแก้งานส่งมอบ');
  });
});

describe('§3 timing model', () => {
  test('3 · elapsed days grow by 1 when today advances by 1', () => {
    const c = card({ created_at: '2026-10-20T03:00:00.000Z' });
    expect(getSetupTiming(c, '2026-10-28').elapsed).toBe(8);
    expect(getSetupTiming(c, '2026-10-29').elapsed).toBe(9);
  });
  test('4 · approved, no P2 end → both P2 lanes at the same x; after specialist handover only the ORM lane', () => {
    const c = card({ created_at: '2026-10-20', approved_at: '2026-10-24' });
    const a = getSetupTiming(c, '2026-10-28');
    expect(a.current).toEqual(['p2s', 'p2o']);
    const lanes = chartLanes('orm'); const st = new Map([[a.card_id, getSetupStatus(a, V)]]);
    const xs = lanes.filter((l) => l.key === 'p2s' || l.key === 'p2o').map((l) => laneDots([a], l, st, { kind: 'all' })[0]!.day);
    expect(xs).toEqual([8, 8]);
    const b = getSetupTiming({ ...c, specialist_handover_done_at: '2026-10-27' }, '2026-10-28');
    expect(b.current).toEqual(['p2o']);
    expect(b.lanes.p2s.state).toBe('done');
  });
  test('5 · Marcom GMB: p2o ends at Go Live, never in w / p3', () => {
    const c = card({ service_variant: 'MARCOM_GMB', created_at: '2026-10-01', approved_at: '2026-10-04' });
    const run = getSetupTiming(c, '2026-10-08');
    expect(run.current).toEqual(['p2o']);
    expect(run.lanes.w.state).toBe('na'); expect(run.lanes.p3.state).toBe('na'); expect(run.lanes.p2s.state).toBe('na');
    const live = getSetupTiming({ ...c, go_live_at: '2026-10-10' }, '2026-10-12');
    expect(live.lanes.p2o).toMatchObject({ state: 'done', end: '2026-10-10', days: 6 });
    expect(live.done).toBe(true); expect(live.elapsed).toBe(9);
  });
  test('6 · thresholds: P3 2/3/4 · P1 5/6/7/8 · total 11/12/14/15', () => {
    expect([2, 3, 4].map((d) => statusOf(d, V.p3_orm))).toEqual(['ok', 'near', 'late']);
    expect([5, 6, 7, 8].map((d) => statusOf(d, V.p1))).toEqual(['ok', 'near', 'near', 'late']);
    expect([11, 12, 14, 15].map((d) => statusOf(d, V.total_orm))).toEqual(['ok', 'near', 'near', 'late']);
  });
  test('7 · contract status = worst of lanes + total; quick counts match', () => {
    const t = getSetupTiming(card({ created_at: '2026-10-01', approved_at: '2026-10-09' }), '2026-10-10'); // P1 8 = late (done)
    expect(getSetupStatus(t, V)).toMatchObject({ contract: 'late', total: 'ok' });
    const inProg = T.filter((x) => !x.done);
    const c = quickCounts(inProg, ST);
    expect(c.late + c.near + c.ok).toBe(inProg.length);
    expect(c.late).toBe(inProg.filter((x) => ST.get(x.card_id)!.contract === 'late').length);
  });
});

describe('§4 settings', () => {
  test('9 · KPI boxes come only from settings; default P3 box ends at day 17', () => {
    expect(kpiBox('p3', 'ORM', V)).toEqual({ start: 14, ok: 16, due: 17 });
    expect(kpiBox('p1', 'ORM', V)).toEqual({ start: 0, ok: 5, due: 7 });
    const next: KpiValues = { ...V, p1: { ok: 3, due: 4 } };
    expect(kpiBox('p2o', 'ORM', next)).toEqual({ start: 4, ok: 9, due: 11 });
  });
  test('10 · save = version effective today; yesterday card keeps old values; same day → one version', () => {
    const next: KpiValues = { ...V, p1: { ok: 3, due: 4 } };
    const r = saveKpiVersion([DEFAULT_KPI_VERSION], next, '2026-10-28', 'PM', '2026-10-28T05:00:00Z');
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.versions).toHaveLength(2);
    expect(r.versions[1]!.note).toBe('แก้ไขโดย PM · ช่วง AE 4 วัน');
    expect(versionFor(r.versions, '2026-10-27').values.p1.due).toBe(7);
    expect(versionFor(r.versions, '2026-10-28').values.p1.due).toBe(4);
    const old = getSetupTiming(card({ created_at: '2026-10-27' }), '2026-10-28'), fresh = getSetupTiming(card({ created_at: '2026-10-28' }), '2026-10-30');
    expect(statusFor(old, r.versions).lanes.p1).toBe('ok');
    expect(statusFor(getSetupTiming(card({ created_at: '2026-10-28' }), '2026-11-02'), r.versions).lanes.p1).toBe('near'); // 5 days vs new 3/4 → late? 5 > 4
    expect(statusFor(fresh, r.versions).lanes.p1).toBe('ok');
    const r2 = saveKpiVersion(r.versions, { ...next, p1: { ok: 2, due: 5 } }, '2026-10-28', 'PM', '2026-10-28T06:00:00Z');
    expect(r2.ok && r2.versions.filter((v) => v.effective_from === '2026-10-28')).toHaveLength(1);
  });
  test('11 · ok ≥ due is rejected with a message; ทันตามค่าใหม่ recomputes from values', () => {
    expect(validateKpi({ ...V, p3_orm: { ok: 3, due: 3 } })).toContain('ช่วงก่อน Go Live · ORM');
    expect(validateKpi({ ...V, p1: { ok: 5, due: 61 } })).not.toBeNull();
    expect(validateKpi(V)).toBeNull();
    expect(pctWithin([2, 3, 4, 5], { ok: 2, due: 3 })).toBe(50);
    expect(pctWithin([2, 3, 4, 5], { ok: 2, due: 4 })).toBe(75);
  });
  test('FTR flag: off live, on in DEMO', () => {
    expect(handoverFixEnabled(false)).toBe(false);
    expect(handoverFixEnabled(true)).toBe(true);
  });
});

describe('§5–§8 chart and tables', () => {
  test('12 · Go Live lane follows ช่วง Go Live (month default, quarter, all) and stepper bounds', () => {
    const go = chartLanes('all').find((l) => l.key === 'golive')!;
    const m = laneDots(T, go, ST, { kind: 'month', key: '2026-10' }).length;
    const q = laneDots(T, go, ST, { kind: 'quarter', key: '2026-Q4' }).length;
    const all = laneDots(T, go, ST, { kind: 'all' }).length;
    expect(m).toBe(5); expect(q).toBe(m); expect(all).toBe(T.filter((t) => t.done).length);
    const b = goLiveBounds(T, 'month', SETUP_DEMO_TODAY);
    expect(b).toEqual({ first: '2024-10', current: '2026-10' });
    expect(shiftPeriod({ kind: 'month', key: '2026-01' }, -1)).toEqual({ kind: 'month', key: '2025-12' });
  });
  test('13 · day-hover short statuses', () => {
    expect(shortStatus('p1', 4, V.p1, 'ok')).toBe('ทันกำหนด');
    expect(shortStatus('p1', 6, V.p1, 'near')).toBe('เหลือ 1 วัน');
    expect(shortStatus('p1', 7, V.p1, 'near')).toBe('ครบกำหนดวันนี้');
    expect(shortStatus('p1', 9, V.p1, 'late')).toBe('เลย 2 วัน');
    expect(shortStatus('w', 3, null, null)).toBe('ไม่มีกำหนด');
    expect(shortStatus('golive', 15, V.total_orm, 'late')).toBe('เกินเป้ารวม');
  });
  test('16 · stage table: ทัน + ใกล้ + เลย = กำลังทำ; Go Live row = Go Live lane', () => {
    for (const tab of ['all', 'orm', 'mc'] as const) {
      const { rows, golive } = stageSummary(T, tab, V, ST, null, { kind: 'month', key: '2026-10' });
      for (const r of rows) if (r.lane.key !== 'w') expect(r.ok + r.near + r.late).toBe(r.n);
      const go = chartLanes(tab).find((l) => l.key === 'golive')!;
      expect(golive.n).toBe(laneDots(T, go, ST, { kind: 'month', key: '2026-10' }).length);
    }
    const late = stageSummary(T, 'all', V, ST, 'late', { kind: 'all' });
    const allRows = stageSummary(T, 'all', V, ST, null, { kind: 'all' });
    expect(late.rows.reduce((s, r) => s + r.n, 0)).toBeLessThan(allRows.rows.reduce((s, r) => s + r.n, 0));
  });
  test('8 · tab ภาพรวม lanes: shared lanes use ORM values, Marcom lanes use Marcom values; Marcom Specialist lane reserved', () => {
    expect(chartLanes('all').filter((l) => l.svcs.length === 2).every((l) => l.kpiSvc === 'ORM')).toBe(true);
    expect(chartLanes('mc').find((l) => l.key === 'p2s')?.reserved).toBe(true);
    expect(laneDots(T, chartLanes('mc').find((l) => l.key === 'p2s')!, ST, { kind: 'all' })).toEqual([]);
  });
});

describe('§9–§10 compare and quality', () => {
  test('17 · equal-count picks the latest earlier period with the same count; nearest fallback; ranges', () => {
    const r = equalCountCandidates(T, ['ORM'], 'month', '2026-10');
    expect(r.nA).toBe(3);
    expect(r.candidates[0]).toMatchObject({ key: '2026-09', n: 3, equal: true });
    const lone = equalCountCandidates(T.filter((t) => t.card_id !== 'SD-O-2026-09-1'), ['ORM'], 'month', '2026-10');
    expect(lone.candidates[0]!.equal).toBe(true);
    expect(rangeError('2026-05', '2026-03')).not.toBeNull();
    expect(rangeError('2024-01', '2026-01')).not.toBeNull();
    expect(rangeError('2025-01', '2026-12')).toBeNull();
    expect(countsDifferMuch(10, 6)).toBe(true); expect(countsDifferMuch(10, 8)).toBe(false);
  });
  test('18 · formats: x สัญญา (p%), เร็วขึ้น / ช้าลง n วัน, ±x.x คะแนน, ±n%; never ดีขึ้น / แย่ลง / เท่าเดิม', () => {
    const A = wentIn(T, ['ORM'], 'month', '2026-10');
    const c = compareCell(A, compareDefs('orm')[0]!, [DEFAULT_KPI_VERSION]);
    expect(c.n).toBe(3); expect(c.onTime! + A.filter((t) => ST.get(t.card_id)!.total === 'late').length).toBe(3);
    expect(timeChange(5, 7)!.text).toBe('เร็วขึ้น 2 วัน'); expect(timeChange(8, 7)!.text).toBe('ช้าลง 1 วัน'); expect(timeChange(7, 7)!.text).toBe('0 วัน');
    expect(surveyChange(8.4, 8)!.text).toBe('+0.4 คะแนน'); expect(surveyChange(7, 8)!.text).toBe('−1.0 คะแนน'); expect(surveyChange(8, 8)!.text).toBe('0 คะแนน');
    expect(pctChange(80, 70)!.text).toBe('+10%'); expect(pctChange(60, 70)!.text).toBe('−10%'); expect(pctChange(70, 70)!.text).toBe('0%');
    const all = JSON.stringify(SD);
    for (const w of ['ดีขึ้น', 'แย่ลง', 'เท่าเดิม', 'ทัน ±']) expect(all).not.toContain(w);
  });
  test('19 · FTR = รอข้อมูล when the flag is off; DEMO tickets give x สัญญา (p%)', () => {
    expect(ftrAvailable(false, 5)).toBe(false); expect(ftrAvailable(true, 0)).toBe(false);
    expect(ftrAvailable(true, demo.fixTickets.length)).toBe(true);
    const ids = new Set(demo.fixTickets.map((t) => t.subject_ref.card_id!));
    const all = T.filter((t) => t.done);
    const f = firstTimeRight(all, ids);
    expect(f.n).toBe(all.filter((t) => t.svc === 'ORM').length);
    expect(f.x).toBe(f.n - demo.fixTickets.length);
    expect(f.pct).toBeLessThan(100);
  });
  test('ส่วนใหญ่ = middle 50 % (min–max under 4 values); p80 rounded up', () => {
    expect(mostRange([3, 9, 5])).toEqual({ a: 3, b: 9 });
    expect(mostRange([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ a: 3, b: 6 });
    expect(mostText([4, 4, 4, 4])).toBe('4 วัน');
    expect(p80([1, 2, 3, 4, 5])).toBe(5);
  });
  test('21 · no average of durations in card ⑤ / queue texts', () => {
    expect(JSON.stringify(SD)).not.toContain('เฉลี่ย');
  });
});

describe('§12 queue table + §15 DEMO', () => {
  test('22 · queue level and paging', () => {
    expect([3, 4, 5, 6].map((n) => queueLevel(n, 'ORM'))).toEqual(['เบา', 'ปกติ', 'ปกติ', 'หนัก']);
    expect([2, 3, 4].map((n) => queueLevel(n, 'Marcom'))).toEqual(['เบา', 'ปกติ', 'หนัก']);
    expect(QUEUE_PAGE).toBe(10);
    const a = getSetupTiming(card({ card_id: 'A', created_at: '2026-10-01' }), '2026-10-10');
    const b = getSetupTiming(card({ card_id: 'B', created_at: '2026-10-05' }), '2026-10-10');
    const done = getSetupTiming(card({ card_id: 'D', created_at: '2026-09-01', go_live_at: '2026-10-03' }), '2026-10-10');
    expect(queueCount(b, [a, b, done])).toBe(2);
  });
  test('DEMO additions: ≥ 10 in progress (ORM ≥ 5, Marcom ≥ 4) covering every required case', () => {
    const ip = T.filter((t) => !t.done);
    expect(demo.counts.inProgressOrm).toBeGreaterThanOrEqual(5); expect(demo.counts.inProgressMc).toBeGreaterThanOrEqual(4);
    expect(ip.some((t) => t.svc === 'ORM' && t.current.includes('p2s') && t.current.includes('p2o'))).toBe(true);
    expect(ip.some((t) => t.lanes.p2s.state === 'done' && t.current.includes('p2o'))).toBe(true);
    expect(ip.filter((t) => Object.values(ST.get(t.card_id)!.lanes).includes('late')).length).toBeGreaterThanOrEqual(2);
    expect(ip.filter((t) => ST.get(t.card_id)!.contract === 'near').length).toBeGreaterThanOrEqual(2);
    expect(ip.some((t) => t.elapsed > 14)).toBe(true);
    expect(ip.some((t) => t.gmb && t.current.includes('p2o'))).toBe(true);
    expect(ip.some((t) => t.elapsed <= 1)).toBe(true);
    for (const k of ['p1', 'p2s', 'p2o', 'w', 'p3'] as const) expect(ip.some((t) => t.current.includes(k))).toBe(true);
  });
  test('DEMO additions: ≥ 24 months of went-live history per service; current month go-lives past the target', () => {
    for (const svc of ['ORM', 'Marcom'] as const) {
      const months = new Set(T.filter((t) => t.done && t.svc === svc).map((t) => t.go_live!.slice(0, 7)));
      expect(months.size).toBeGreaterThanOrEqual(24);
      const cur = T.filter((t) => t.svc === svc && inGoLive(t, { kind: 'month', key: '2026-10' }));
      expect(cur.some((t) => ST.get(t.card_id)!.total === 'late')).toBe(true);
    }
    expect(T.filter((t) => t.done).every((t) => t.input.survey2 != null && t.input.survey2 >= 0 && t.input.survey2 <= 10)).toBe(true);
    expect(demo.fixTickets.every((t) => t.type === 'HANDOVER_FIX' && !!t.subject_ref.card_id)).toBe(true);
    expect(addDays('2026-10-28', 2)).toBe('2026-10-30');
  });
  test('timings type sanity', () => { const x: SetupTiming = T[0]!; expect(x.day0 <= SETUP_DEMO_TODAY).toBe(true); });
});
