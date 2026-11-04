/* Tab R3 · card ④ อายุสัญญา (Contract Lifetime) + WELCOME_BACK — acceptance tests (§12) + DEMO backfill addendum.
 * Values come from the spec (RP72–RP97) and the R3 demo additions (clock 28 Oct 2026). */
import { describe, expect, mock, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };

const A = await import('../src/lib/contract-age');
const AD = await import('../src/lib/contract-age-demo');
const S = await import('../src/lib/renewal-store');
const M = await import('../src/lib/main-contract-store');
const TK = await import('../src/lib/tickets-l0');
const { CL } = await import('../src/lib/ps-glossary');
const { tabR1DemoFlow } = await import('../src/lib/contract-tab-r1-demo');
const { reasonLabel } = await import('../src/lib/renewal-r2');
import type { AgeContractSource, ContractAgeRow } from '../src/lib/contract-age';

const today = AD.CONTRACT_AGE_DEMO_NOW; // 2026-10-28
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const src = (o: Partial<AgeContractSource> & { contract_id: string }): AgeContractSource => ({
  hotel_id: 'H1', hotel_name_en: 'Hotel One', hotel_name_th: 'โรงแรมหนึ่ง', service: 'ORM', ae_id: 'AE001-ดาว', ae_name: 'ดาว', team_label: 'ทีม A',
  signed_at: '2024-01-01', go_live_at: null, renewal_of: null, ended_at: null, end_kind: null, notice_at: null, ...o,
});
function demoRows(): ContractAgeRow[] {
  S.setRenewalDemo(true);
  const d = AD.contractAgeDemo();
  return A.vPsContractAge(d.sources, { today, links: [], history: [...S.renewalHistory(), ...d.prices] });
}
async function renderTab() {
  const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { PsReportTab } = await import('../src/components/ps/ps-report-tab');
  const { Account360Provider } = await import('../src/components/ps/account-360');
  const { DashboardGlobal, defaultGlobalFilter, selectedPeriod } = await import('../src/lib/ps-dashboard-global');
  const { buildDemoReport, DEMO_NOW } = await import('../src/lib/ps-demo-fixture');
  S.setRenewalDemo(true);
  const report = buildDemoReport(defaultGlobalFilter);
  const el = h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
    h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW)) }, loading: false, error: false }) }));
  const rootRoute = createRootRoute({ component: () => el });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  await router.load();
  return renderToStaticMarkup(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never)));
}
const cardOf = (html: string, id: string) => html.split('<section class="dash-card').find((c) => c.includes(`data-testid="${id}"`)) ?? '';

describe('§1.2 / §8 age definition (shared with card ⑦)', () => {
  test('1 · renewal never restarts the age; Setup has no dot; card ⑦ shows Setup text and the same age as card ④', async () => {
    const rows = A.vPsContractAge([
      src({ contract_id: 'C1', go_live_at: '2024-02-01', ended_at: '2025-01-31', end_kind: 'RENEWAL' }),
      src({ contract_id: 'C1-R1', renewal_of: 'C1', signed_at: '2025-02-01', go_live_at: null }),
      src({ contract_id: 'C2', hotel_id: 'H2', go_live_at: null }),
    ], { today: '2026-02-01' });
    const chain = rows.find((r) => r.contract_id === 'C1-R1')!;
    expect(rows).toHaveLength(2);
    expect(chain.chain_ids).toEqual(['C1', 'C1-R1']);
    expect(chain.first_go_live_at).toBe('2024-02-01');
    expect(chain.age_days).toBe(731);
    expect(chain.renewals_count).toBe(1);
    const setup = rows.find((r) => r.contract_id === 'C2')!;
    expect(setup.status).toBe('SETUP');
    expect(A.drawnRows(rows, true, A.ALL_PERIOD).map((r) => r.contract_id)).toEqual(['C1-R1']);
    // card ⑦ in the rendered tab (DEMO): Sailom Beach Hotel (R2-O5, start 30 Sep, Go Live 21 Oct) shows 7 วัน = card ④ age (start-based would be 28 วัน)
    const html = await renderTab();
    const health = text(cardOf(html, 'r1-health'));
    const r2o5 = demoRows().find((r) => r.contract_id === 'R2-O5')!;
    expect(r2o5.age_days).toBe(7);
    expect(health).toContain(`Sailom Beach Hotel ORM มายด์ ORM ทีม A เหลือง ระบบ ▼ ตั้งค่าหรือข้อมูลโรงแรมผิด ${A.ageText(r2o5.age_days)}`);
    expect(A.ageIndex(demoRows()).get('R2-O5')?.age_days).toBe(r2o5.age_days);
    // R1-O1 (Go Live not yet) is Setup → card ⑦ shows the Setup text instead of an age, and sorts last by age
    const r1o1 = A.ageIndex(demoRows()).get('R1-O1');
    expect(r1o1?.status).toBe('SETUP');
    expect(A.healthAgeDays(r1o1)).toBeNull();
    const { ContractHealthCard } = await import('../src/components/ps/contract-health-card');
    const { tabR1Demo } = await import('../src/lib/contract-tab-r1-demo');
    const only = { ...tabR1Demo(), base: tabR1Demo().base.filter((b) => b.contract_id === 'R1-O1') };
    expect(text(renderToStaticMarkup(h(ContractHealthCard, { data: only, ages: A.ageIndex(demoRows()) })))).toContain(CL.setupAge);
  });
  test('ageText: month = 30.42 days; under a month → days', () => {
    expect(A.ageText(20)).toBe('20 วัน');
    expect(A.ageText(31)).toBe('1 เดือน');
    expect(A.ageText(400)).toBe('1 ปี 1 เดือน');
    expect(A.ageText(731)).toBe('2 ปี');
  });
});

describe('§1.3 KPI tiles', () => {
  test('2 · median from active contracts only; zone sub line appends “ วัน” only in ทุก 100 วัน', () => {
    const rows = A.vPsContractAge([
      src({ contract_id: 'A1', go_live_at: '2026-01-01' }), src({ contract_id: 'A2', go_live_at: '2025-10-01' }), src({ contract_id: 'A3', go_live_at: '2025-11-01' }),
      src({ contract_id: 'E1', go_live_at: '2020-01-01', ended_at: '2026-01-01', end_kind: 'NOT_RENEWED' }),
    ], { today: '2026-02-01' });
    expect(A.medianActive(rows, 'ORM')).toBe(92); // 31 · 92 · 123 — the ended 2,192-day contract is ignored
    const zh = A.topZone(rows, 'ORM', A.zonesFor('hundred'))!;
    expect(CL.medianSub(3, zh.zone.label, true, zh.count, null)).toBe(`ใช้งาน 3 สัญญา · สัญญาส่วนใหญ่อยู่ในโซน ${zh.zone.label} วัน ${zh.count} สัญญา`);
    const zl = A.topZone(rows, 'ORM', A.zonesFor('lifecycle'))!;
    expect(zl.zone.label).toBe('91–180 วัน');
    expect(CL.medianSub(3, zl.zone.label, false, zl.count, zl.zone.phase)).toBe('ใช้งาน 3 สัญญา · สัญญาส่วนใหญ่อยู่ในโซน 91–180 วัน (สร้างความเชื่อมั่น) 2 สัญญา');
  });
});

describe('§2 chart', () => {
  test('3 · ทุก 100 วัน: 18 header labels incl. 1000–1099 … 1700+ with Day at the left; nothing about “โซนละ 100 วัน”', async () => {
    const z = A.zonesFor('hundred');
    expect(z).toHaveLength(18);
    expect(z.map((x) => x.label).slice(10)).toEqual(['1000–1099', '1100–1199', '1200–1299', '1300–1399', '1400–1499', '1500–1599', '1600–1699', '1700+']);
    const card = cardOf(await renderTab(), 'cl-card');
    expect(card.match(/data-testid="cl-zone-label"/g)?.length).toBe(18);
    expect(text(card)).toContain('Day');
    expect(text(card)).toContain('1700+');
    expect(text(card)).not.toContain('โซนละ 100 วัน');
    expect(card).not.toContain('data-testid="cl-lifecycle-note"');
  });
  test('4 · ช่วงชีวิตสัญญา widths: proportional with a 7% floor, sum to 1; showing ended changes them', () => {
    const w = A.zoneWidths([1, 0, 50, 30, 10, 2]);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 9);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0.07 - 1e-9);
    expect(w[2]! / w[3]!).toBeCloseTo(50 / 30, 6);
    const rows = demoRows(); const zones = A.zonesFor('lifecycle');
    const counts = (showEnded: boolean) => zones.map((z) => A.drawnRows(rows, showEnded, A.ALL_PERIOD).filter((r) => A.zoneOf(zones, r.age_days!).i === z.i).length);
    expect(A.zoneWidths(counts(true))).not.toEqual(A.zoneWidths(counts(false)));
  });
  test('5 · ended dots: off by default; when shown, at age at end in service colour at 25%', async () => {
    const card = cardOf(await renderTab(), 'cl-card');
    expect(card).not.toContain('data-ended="1"');
    const rows = demoRows();
    const ended = A.drawnRows(rows, true, A.ALL_PERIOD).filter((r) => r.status === 'ENDED');
    expect(ended.length).toBeGreaterThan(40);
    expect(ended.every((r) => r.age_days === A.dayDiff(r.first_go_live_at!, r.ended_at!))).toBe(true);
    expect(A.CONTRACT_AGE_CONFIG.ENDED_DOT_OPACITY).toBe(0.25);
  });
  test('6 · zone hover = zone + ORM / Marcom counts (+ ended only when shown); ended dot = 2 primary + 1 secondary reasons', () => {
    const rows = demoRows(); const zones = A.zonesFor('hundred');
    const c = A.zoneCounts(rows, zones[0]!, zones, false);
    expect(Object.keys(c)).toEqual(['ORM', 'Marcom', 'ended']);
    expect(c.ended).toBeNull();
    expect(A.zoneCounts(rows, zones[0]!, zones, true).ended).not.toBeNull();
    const d = AD.contractAgeDemo();
    const withReason = A.endedOf(rows).map((r) => A.reasonOf(d.reasons, r)).find(Boolean)!;
    expect(withReason.primary).toHaveLength(2);
    expect(typeof withReason.secondary).toBe('string');
  });
  test('7 · Go Live พ.ค. 68: ทั้งหมด 8 · ยังใช้งาน 5 (63%) · ไม่ต่อ 1 · ยกเลิกก่อนกำหนด 2 · สัญญาที่หลุด 3 rows', () => {
    const rows = demoRows(); const p = { kind: 'month' as const, key: '2025-05' };
    expect(A.periodLabelOf(p)).toBe('พ.ค. 68');
    const s = A.periodSummary(rows, p, A.zonesFor('hundred'));
    expect([s.n, s.active, s.pct, s.notRenewed.length, s.lost.length]).toEqual([8, 5, 63, 1, 2]);
    expect(s.minAge).toBe(521); expect(s.maxAge).toBe(540);
    expect(s.notRenewed).toEqual([362]); expect(s.lost).toEqual([88, 141]);
    expect(CL.period_.total(s.n, s.orm, s.marcom)).toBe('ทั้งหมด 8 สัญญา (ORM 5 · Marcom 3)');
    expect(A.drawnRows(rows, false, p).filter((r) => A.inPeriod(r, p))).toHaveLength(8); // ended of the period drawn even with เฉพาะที่ใช้งาน
    const churn = A.churnRows(rows, today, AD.contractAgeDemo().reasons, []);
    expect(A.filterChurn(churn, { ...A.EMPTY_CHURN_FILTER, period: p })).toHaveLength(3);
  });
});

describe('§3 distribution', () => {
  test('8 · % base follows แสดง; each row sums to 100% ± rounding; ผ่านไปโซนถัดไป; last zone', () => {
    const rows = demoRows(); const zones = A.zonesFor('hundred'); const reasons = AD.contractAgeDemo().reasons;
    for (const showEnded of [false, true]) for (const svc of A.AGE_SVCS) {
      const d = A.distribution(rows, svc, zones, showEnded, reasons);
      expect(d.cells.reduce((s, c) => s + (c.pct ?? 0), 0)).toBeCloseTo(100, 6);
      expect(d.cells.at(-1)!.pass.kind).toBe('last');
    }
    const t = A.vPsContractAge([
      src({ contract_id: 'a', go_live_at: '2026-01-01' }), // active, 31 days (inside zone 0)
      src({ contract_id: 'b', go_live_at: '2025-01-01' }), // active 396 → passed zone 0
      src({ contract_id: 'c', go_live_at: '2025-06-01', ended_at: '2025-07-01', end_kind: 'LOST' }), // ended at 30 → in zone 0
      src({ contract_id: 'd', go_live_at: '2025-01-01', ended_at: '2025-06-01', end_kind: 'NOT_RENEWED' }), // ended at 151 → passed zone 0
    ], { today: '2026-02-01' });
    const z0 = A.distribution(t, 'ORM', zones, false, []).cells[0]!;
    expect(z0.pass).toEqual({ kind: 'rate', pct: 67, a: 2, b: 3 });
    expect(z0.pct).toBe(50); // active only: 1 of 2
    expect(A.distribution(t, 'ORM', zones, true, []).cells[0]!.pct).toBe(50); // (1 active + 1 ended) of 4
    expect(A.pctText(0.4)).toBe('<1%');
  });
  test('9 · reasons row: rank 1 by default; < 3 ended → ข้อมูลน้อย; รวม cell empty', async () => {
    const t = A.vPsContractAge(['e1', 'e2', 'e3', 'e4'].map((id, i) => src({ contract_id: id, go_live_at: '2025-01-01', ended_at: `2025-02-0${i + 1}`, end_kind: 'LOST' })), { today: '2026-02-01' });
    const rs = ['e1', 'e2', 'e3'].map((id) => ({ id, contract_id: id, service: 'ORM' as const, outcome: 'LOST' as const, primary: ['PRICE_HIGH', id === 'e3' ? 'OVERDUE' : 'REV_MISS'] as [string, string], secondary: 'WORK_LATE', created_by: { member_id: 'x', display: 'x', role: 'AE' }, created_at: '', editable_until: '' }));
    const cell = A.distribution(t, 'ORM', A.zonesFor('hundred'), false, rs).cells[0]!;
    expect(cell.reasons).toEqual({ kind: 'rank', top: [{ key: 'PRICE_HIGH', n: 3 }, { key: 'REV_MISS', n: 2 }, { key: 'OVERDUE', n: 1 }], unrecorded: 1 });
    const few = A.vPsContractAge([src({ contract_id: 'f', go_live_at: '2025-01-01', ended_at: '2025-02-01', end_kind: 'LOST' })], { today: '2026-02-01' });
    expect(A.distribution(few, 'ORM', A.zonesFor('hundred'), false, []).cells[0]!.reasons).toEqual({ kind: 'few', n: 1 });
    expect(CL.dist.few(1)).toBe('ข้อมูลน้อย (จบแล้ว 1 สัญญา)');
    const card = cardOf(await renderTab(), 'cl-card');
    const row = card.split('data-testid="cl-reasons-ORM"')[1]!.split('</tr>')[0]!;
    expect(row.endsWith('<td class="is-total"></td>')).toBe(true);
    expect(text(row)).toContain(CL.dist.more);
    expect(text(row)).not.toContain('ยังไม่บันทึกเหตุผล');
  });
});

describe('§4 สัญญาที่หลุด', () => {
  const rows = () => demoRows();
  const churn = () => A.churnRows(rows(), today, AD.contractAgeDemo().reasons, AD.contractAgeDemo().tickets);
  test('10 · default newest ended first; sort cycles 3 states; reason filter matches either primary; clear all resets', () => {
    const def = A.sortChurn(churn(), null);
    expect(def.map((r) => r.ended_at)).toEqual([...def.map((r) => r.ended_at)].sort().reverse());
    let s = A.cycleSort(null, 'age'); expect(s).toEqual({ by: 'age', dir: 'desc' });
    s = A.cycleSort(s, 'age'); expect(s).toEqual({ by: 'age', dir: 'asc' });
    expect(A.cycleSort(s, 'age')).toBeNull();
    expect(A.cycleSort({ by: 'age', dir: 'asc' }, 'since')).toEqual({ by: 'since', dir: 'desc' });
    const key = A.reasonOptions(churn()).labels[0]!.key;
    const hit = A.filterChurn(churn(), { ...A.EMPTY_CHURN_FILTER, reasons: [key] });
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((r) => r.reason!.primary.includes(key))).toBe(true);
    expect(hit.some((r) => r.reason!.primary[1] === key) || hit.some((r) => r.reason!.primary[0] === key)).toBe(true);
    expect(A.filterChurn(churn(), { ...A.EMPTY_CHURN_FILTER, reasons: [A.NO_REASON] }).every((r) => !r.reason)).toBe(true);
    expect(A.churnSearch({ hotel_name_en: 'Chiang Mai Resort', hotel_name_th: 'เชียงใหม่ รีสอร์ท', contract_id: 'CT-ORM-L001' }, 'chiangmai  resort')).toBe(true);
    expect(A.churnSearch({ hotel_name_en: 'Chiang Mai Resort', hotel_name_th: null, contract_id: 'CT-ORM-L001' }, 'ct-orm-l001')).toBe(true);
  });
  test('11 · pagination: 20 per page by default; options 10 / 20 / 50 / 100', () => {
    expect(A.CONTRACT_AGE_CONFIG.CHURN_PAGE_SIZE).toBe(20);
    expect([...A.CONTRACT_AGE_CONFIG.CHURN_PAGE_OPTIONS]).toEqual([10, 20, 50, 100]);
    const p = A.pageOf(churn(), 20, 1);
    expect(p.rows).toHaveLength(20);
    expect(A.pageOf(churn(), 20, 99).cur).toBe(p.pages);
  });
});

describe('§5 drawer · §6 WELCOME_BACK', () => {
  const feed = () => {
    const d = AD.contractAgeDemo(); const rows = demoRows(); const tickets = [...d.tickets, ...TK.ticketSnapshot()];
    return { today, demo: true, rows, index: A.ageIndex(rows), history: [...S.renewalHistory(), ...d.prices], upsell: d.upsell, reasons: d.reasons, tickets, seedTickets: d.tickets, firstMeeting: d.firstMeeting, lowSurveys: d.lowSurveys, setupCount: 0 };
  };
  const drawer = async (contractId: string, draft = A.EMPTY_DRAFT) => {
    const { ContractHistoryDrawer } = await import('../src/components/ps/contract-history-drawer');
    const f = feed(); const row = A.churnRows(f.rows, today, f.reasons, f.tickets).find((r) => r.contract_id === contractId)!;
    return renderToStaticMarkup(h(ContractHistoryDrawer, { row, feed: f, draft, onDraft: () => {}, onClose: () => {} }));
  };
  const unlocked = () => A.churnRows(feed().rows, today, feed().reasons, feed().tickets).find((r) => !r.lock && r.contract_id.startsWith('CT-MAR-L'))!;
  test('12 · one drawer for row click and + สร้าง, sections in the §5 order', async () => {
    const html = await drawer(unlocked().contract_id);
    const order = [...html.matchAll(/data-sec="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['header', 'info', 'package', 'timeline', 'exit', 'why', 'message', 'tickets']);
    expect(text(html)).toContain(CL.drawer.open360);
  });
  test('13 · timeline off by default → collapsed + summary (ไม่รวม Timeline); on → shown and in the payload', async () => {
    const id = unlocked().contract_id;
    const off = await drawer(id);
    expect(off).not.toContain('data-testid="cl-timeline"');
    expect(text(off)).toContain('(ไม่รวม Timeline)');
    const on = await drawer(id, { ...A.EMPTY_DRAFT, timelineShared: true });
    expect(on).toContain('data-testid="cl-timeline"');
    expect(text(on)).not.toContain('(ไม่รวม Timeline)');
    const r = unlocked(); const f = feed();
    const tl = A.timelineOf(r, { history: f.history, tickets: [], typeLabel: () => '' });
    const inp = A.welcomeBackInput(r, { ticket_id: 'TKT-X', role: 'PM', draft: { ...A.EMPTY_DRAFT, timelineShared: true }, cycle: null, upsell: [], reason: null, timeline: tl, label: reasonLabel, today });
    expect(inp.payload.timeline).toEqual(tl);
    expect(A.welcomeBackInput(r, { ticket_id: 'TKT-X', role: 'PM', draft: A.EMPTY_DRAFT, cycle: null, upsell: [], reason: null, timeline: tl, label: reasonLabel, today }).payload).not.toHaveProperty('timeline');
  });
  test('14 · empty message sends: type WELCOME_BACK · target BD · recipient BDM · timeline_shared · attachments as links', () => {
    S.setRenewalDemo(true);
    const r = unlocked(); const f = feed();
    const o = TK.createWelcomeBack(A.welcomeBackInput(r, { ticket_id: TK.ticketIdOf(TK.peekNextSeq()), role: 'AE', draft: { message: '', timelineShared: false, files: [{ name: 'quote.pdf', drive_url: 'https://drive.example/q' }] }, cycle: A.lastCycle(f.history, r.chain_ids), upsell: f.upsell[r.contract_id] ?? [], reason: r.reason, timeline: [], label: reasonLabel, today }), f.seedTickets);
    expect(o.ok).toBe(true);
    const t = TK.ticketById(o.ok ? o.ticket_id : '')!;
    expect([t.type, t.target_dept, t.assignee?.role, t.created_by, t.payload.timeline_shared]).toEqual(['WELCOME_BACK', 'BD', 'BDM', 'PS', false]);
    expect(t.payload.drive_attachments).toEqual([{ name: 'quote.pdf', drive_url: 'https://drive.example/q' }]);
    expect(t.payload.message).toBeUndefined();
    expect(t.payload.snapshot?.contract_info['contract_id']).toBe(r.contract_id);
    // 20 · BD Workspace lists target_dept = BD through the existing generic inbound filter
    expect(TK.ticketSnapshot().filter((x) => x.target_dept === 'BD').map((x) => x.ticket_id)).toContain(t.ticket_id);
    expect(TK.TYPE_TH[t.type]).toBe('Welcome Back');
    S.setRenewalDemo(false);
  });
  test('15 · lock: open Welcome Back (New / กำลังทำ / legacy ACK) blocks a second write; Done releases; same hotel other contract not locked', async () => {
    S.setRenewalDemo(true);
    const f = feed(); const r = unlocked();
    const input = (id: string, row = r) => A.welcomeBackInput(row, { ticket_id: id, role: 'PM', draft: A.EMPTY_DRAFT, cycle: null, upsell: [], reason: null, timeline: [], label: reasonLabel, today });
    const first = TK.createWelcomeBack(input(TK.ticketIdOf(TK.peekNextSeq())), f.seedTickets);
    expect(first.ok).toBe(true);
    const before = TK.ticketSnapshot().length;
    const stale = TK.createWelcomeBack(input('TKT-999990'), f.seedTickets); // second send from a stale drawer
    expect(stale.ok).toBe(false);
    expect(!stale.ok && stale.locked?.ticket_id).toBe(first.ok ? first.ticket_id : '');
    expect(TK.ticketSnapshot().length).toBe(before);
    const other = { ...r, contract_id: `${r.contract_id}-OTHER`, chain_ids: [`${r.contract_id}-OTHER`] };
    expect(TK.createWelcomeBack(input('TKT-999991', other), f.seedTickets).ok).toBe(true);
    const t = TK.ticketById(first.ok ? first.ticket_id : '')!;
    expect(TK.transition(t.ticket_id, t.revision, 'IN_PROGRESS', 'BD')).toBe(true);
    const t2 = TK.ticketById(t.ticket_id)!;
    expect(TK.transition(t2.ticket_id, t2.revision, 'DONE', 'BD')).toBe(true);
    expect(TK.createWelcomeBack(input('TKT-999992'), f.seedTickets).ok).toBe(true);
    // seeded demo lock (กำลังทำ) and legacy ACK both lock
    const seed = f.seedTickets[0]!;
    expect(seed.status).toBe('IN_PROGRESS');
    expect(A.openWelcomeBack(f.tickets, seed.subject_ref.contract_id!)?.ticket_id).toBe('TKT-000951');
    expect(A.openWelcomeBack([{ ...seed, status: 'ACK' }], seed.subject_ref.contract_id!)).not.toBeNull();
    expect(A.openWelcomeBack([{ ...seed, status: 'CANCELLED' }], seed.subject_ref.contract_id!)).toBeNull();
    const lockedHtml = await drawer(seed.subject_ref.contract_id!);
    expect(lockedHtml).toContain('data-testid="cl-locked"');
    expect(lockedHtml).not.toContain('data-testid="cl-send"');
    expect(lockedHtml).not.toContain('data-sec="message"');
    const tableHtml = cardOf(await renderTab(), 'cl-card');
    expect(text(tableHtml)).toContain('🔒 #TKT-000951 · กำลังทำ');
    S.setRenewalDemo(false);
  });
});

describe('§4.4 รอด–หลุด', () => {
  test('16 · hidden by default; both boxes list the same contiguous quarters', async () => {
    const card = cardOf(await renderTab(), 'cl-card');
    expect(card).toContain('data-testid="cl-survival-switch"');
    expect(card).not.toContain('data-testid="cl-heat-ORM"');
    const rows = demoRows(); const qs = A.heatQuarters(rows, today);
    expect(qs[qs.length - 1]).toBe('2026-Q4');
    for (let i = 1; i < qs.length; i++) expect(A.nextPeriod('quarter', qs[i - 1]!, 1)).toBe(qs[i]!);
    expect(A.survivalTable(rows, 'ORM', today, qs).map((r) => r.quarter)).toEqual(A.survivalTable(rows, 'Marcom', today, qs).map((r) => r.quarter));
    expect(A.CONTRACT_AGE_CONFIG.HEAT_ROWS_DEFAULT).toBe(8);
  });
  test('17 · formulas, not-reached cells empty, base < 3 faded', () => {
    const t = A.vPsContractAge([
      src({ contract_id: 's1', go_live_at: '2025-01-05' }), // active ~392
      src({ contract_id: 's2', go_live_at: '2025-01-10', ended_at: '2025-03-01', end_kind: 'LOST' }), // ended at 50
      src({ contract_id: 's3', go_live_at: '2025-02-01', ended_at: '2025-08-01', end_kind: 'NOT_RENEWED' }), // ended at 181
      src({ contract_id: 's4', go_live_at: '2025-03-20' }), // active ~318
    ], { today: '2026-02-01' });
    const row = A.survivalTable(t, 'ORM', '2026-02-01', ['2025-Q1'])[1]!;
    expect(row.state).toBe('ok');
    expect(row.survive[0]).toEqual({ kind: 'value', p: 0.75, a: 3, b: 4, faded: false }); // 90: s1, s3, s4 reached; s2 ended before
    expect(row.survive[2]).toMatchObject({ kind: 'value', a: 1, b: 3, faded: false }); // 365: s1 reached; s2, s3 ended before; s4 still younger → excluded
    expect(row.drop[0]).toMatchObject({ kind: 'value', a: 1, b: 4 });
    expect(row.survive[3]!.kind).toBe('empty'); // 730 not reached for Q1 2025 on 1 Feb 2026
    const small = A.survivalTable(t.slice(0, 2), 'ORM', '2026-02-01', ['2025-Q1'])[1]!;
    expect(small.survive[0]).toMatchObject({ faded: true });
    expect(A.heatAlpha(0)).toBeCloseTo(0.06); expect(A.heatAlpha(1)).toBeCloseTo(0.86);
    expect(CL.heat.legendSurvive).toBe('รอด'); expect(CL.heat.legendDrop).toBe('หลุด');
  });
  test('18 · a heatmap cell filters สัญญาที่หลุด to service + quarter + age range', () => {
    const rows = demoRows(); const churn = A.churnRows(rows, today, [], []);
    const q = churn.find((r) => r.service_line === 'ORM')!.go_live_quarter!;
    const pick = { svc: 'ORM' as const, quarter: q, from: 0, to: 365, key: 'k' };
    const hit = A.filterChurn(churn, { ...A.EMPTY_CHURN_FILTER, heat: pick, svc: 'ORM' });
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((r) => r.service_line === 'ORM' && r.go_live_quarter === q && r.age_days! < 365)).toBe(true);
  });
});

describe('§7 wording · preservation · DEMO addendum', () => {
  test('19 · “cohort” appears nowhere in the rendered card text; tour has 8 steps', async () => {
    const card = cardOf(await renderTab(), 'cl-card');
    expect(text(card).toLowerCase()).not.toContain('cohort');
    expect(text(card)).toContain(CL.title);
    expect(CL.tour).toHaveLength(8);
  });
  test('demo volumes (RP97): ~68 / ~31 active, ~47 ended, ≈10% ended without reasons', () => {
    const rows = demoRows(); const d = AD.contractAgeDemo();
    const r3 = rows.filter((r) => r.contract_id.startsWith('CT-'));
    expect(A.activeOf(rows, 'ORM').length).toBe(68);
    expect(A.activeOf(rows, 'Marcom').length).toBe(31);
    expect(A.endedOf(r3).length).toBe(47);
    const ended = A.endedOf(rows); const none = ended.filter((r) => !A.reasonOf(d.reasons, r)).length;
    expect(none / ended.length).toBeGreaterThan(0.04); expect(none / ended.length).toBeLessThan(0.16);
  });
  test('building card ④ writes nothing (contracts, price history, reasons, tickets unchanged)', () => {
    S.setRenewalDemo(true);
    const before = [M.mainContracts().length, S.renewalHistory().length, TK.ticketSnapshot().length];
    demoRows(); AD.contractAgeDemo(); A.churnRows(demoRows(), today, [], []);
    expect([M.mainContracts().length, S.renewalHistory().length, TK.ticketSnapshot().length]).toEqual(before);
    S.setRenewalDemo(false);
  });
  test('addendum · DEMO start backfills INITIAL rows for ALL R1-/R2- demo contracts (no open needed); live untouched', () => {
    S.setRenewalDemo(false);
    expect(M.mainContracts().some((c) => /^R[12]-/.test(c.contract_id))).toBe(false);
    S.setRenewalDemo(true);
    const ids = tabR1DemoFlow().map((f) => f.contract_id).filter((id) => /^R[12]-/.test(id));
    const ini = new Set(S.renewalHistory().filter((h) => h.source === 'INITIAL').map((h) => h.contract_id));
    const renewedFrom = tabR1DemoFlow().filter((f) => f.renewal_of).map((f) => f.contract_id); // R1-M4 continues R1-M3
    for (const id of ids) expect([id, ini.has(id)]).toEqual([id, !renewedFrom.includes(id)]);
    expect(M.mainContractById('R2-O7')?.billing_status).toBe('TERMINATED');
    const n = S.renewalHistory().length; S.startRenewal({ id: 'RN-R2-O4', hotelId: 'X', hotel: 'ลานนา เฮอริเทจ', owner: 'AE001-Nont', contract_id: 'R2-O4', created_source: 'AE_EARLY' });
    expect(S.renewalHistory().filter((h) => h.contract_id === 'R2-O4' && h.source === 'INITIAL')).toHaveLength(1);
    expect(S.renewalHistory().length).toBe(n);
    // card ④ never shows an empty last package for these demo contracts
    const rows = demoRows();
    for (const r of rows.filter((x) => x.chain_ids.some((id) => /^R[12]-/.test(id)))) expect(A.lastCycle(S.renewalHistory(), r.chain_ids)).not.toBeNull();
    expect(rows.find((r) => r.contract_id === 'R1-M4')?.renewals_count).toBe(1);
    S.setRenewalDemo(false);
  });
});
