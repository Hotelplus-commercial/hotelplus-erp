/* PS Dashboard · Tab การประชุม & เซอร์เวย์ R1 — §13 acceptance (pure helpers + mounted tab in DEMO). */
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { domHits } from './forbidden-words';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/ps' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
// test hygiene: release the page simulator for later files
afterAll(async () => { if (GlobalRegistrator.isRegistered) await GlobalRegistrator.unregister(); });
afterAll(async () => { /* keep one DOM for the whole run (see r41 stability note) */ });

const OCT = ['2026-10'], SEP = ['2026-09'], TODAY = '2026-10-28';
async function demoRows() {
  const { getMeetingSurveyData } = await import('../src/lib/meeting-survey-store');
  const M = await import('../src/lib/meeting-tab-r1');
  const data = M.getMeetingTabData(true, getMeetingSurveyData(true));
  return { M, data, rows: M.tabMeetings(data, true) };
}

describe('Meeting tab R1 — helpers (DEMO 28 ต.ค. 2569)', () => {
  test('§11 Marcom funnel / quota and ORM quota + Tier A chain', async () => {
    const { M, rows } = await demoRows();
    const mc = M.vMeetingFunnel(rows, 'MARCOM', OCT, TODAY);
    expect([mc.quota, mc.pnm_excluded, mc.booked.total, mc.completed.total, mc.scored.total, mc.customer_no_score, mc.survey_pending, mc.short_quota]).toEqual([42, 1, 39, 36, 30, 4, 2, 3]);
    const orm = M.vMeetingFunnel(rows, 'ORM', OCT, TODAY);
    expect([orm.quota, orm.pnm_excluded, orm.booked.A, orm.completed.A, orm.scored.total]).toEqual([17, 2, 14, 13, 13]);
    expect(orm.over_quota).toBeGreaterThan(0);
  });
  test('MS1/MS3: channel ≠ ONLINE excluded everywhere; Tier B Online = substitute', async () => {
    const M = await import('../src/lib/meeting-tab-r1');
    const base = { hotel: 'h', service: 'ORM' as const, ae: 'x', status: 'Completed', origin: 'demo' as const };
    const data = { meetings: [
      { ...base, id: 'a', tier: 'A' as const, date: '2026-10-02', channel: 'ONLINE' as const },
      { ...base, id: 'b', tier: 'B' as const, date: '2026-10-03', channel: 'ONLINE' as const },
      { ...base, id: 'c', tier: 'B' as const, date: '2026-10-04', channel: 'CALL' as const },
      { ...base, id: 'd', tier: 'C' as const, date: '2026-10-05', channel: 'EMAIL' as const },
    ], surveys: [], answers: [] };
    const rows = M.tabMeetings(data, false);
    const f = M.vMeetingFunnel(rows, 'ORM', OCT, TODAY);
    expect([f.booked.total, f.booked.A, f.booked.B, f.booked.C, f.quota, f.over_quota]).toEqual([2, 1, 1, 0, 1, 1]);
    expect(M.vMeetingByOwner(rows, 'AE', OCT)[0]!.booked).toBe(2);
    expect(M.vMeetingFunnelDetail(rows, 'ORM', OCT, TODAY).find((r) => r.id === 'b')).toMatchObject({ event: 'SUBSTITUTE_B', over: true });
  });
  test('⑤ signal tags = open survey flags (no local recompute) · set-1 sample · silent streaks', async () => {
    const { M, data, rows } = await demoRows();
    const { getSurveyFlags } = await import('../src/lib/meeting-survey-store');
    expect(data.flags).toEqual(getSurveyFlags(true));
    expect(M.vMeetingSignalCounts(data.flags ?? [], 'ORM', OCT)).toEqual({ low: 4, no_score: 1, silent: 1 });
    expect(M.vMeetingSignalCounts(data.flags ?? [], 'MARCOM', OCT)).toEqual({ low: 8, no_score: 4, silent: 2 });
    const s1 = M.vMeetingSurveyScores(rows, 'MARCOM', SEP, ['2026-08'], 1).map((r) => [r.low.length, r.mid.length, r.sat.length, r.median]);
    expect(s1).toEqual([[5, 5, 20, 8], [5, 6, 19, 8], [8, 7, 15, 7.5], [4, 6, 20, 8]]);
    const sil = M.vMeetingSurveySilent(rows, 'MARCOM', OCT);
    expect(sil.find((r) => r.hotel === 'โรงแรม 0331')?.streak).toBe(3);
    expect(sil.find((r) => r.hotel === 'โรงแรม 0298')?.streak).toBe(2);
    expect(M.vMeetingSurveySilent(rows, 'ORM', OCT).find((r) => r.hotel === 'โรงแรม 214')?.streak).toBe(3);
  });
  test('MS7 bands + median excludes no-score; set-2 control only when version 2 exists; versions never mixed', async () => {
    const { M, rows } = await demoRows();
    expect([M.band(6), M.band(7), M.band(8)]).toEqual(['low', 'mid', 'sat']);
    expect(M.versionsIn(rows, 'ORM', OCT)).toEqual([2]);
    expect(M.versionsIn(rows, 'ORM', SEP)).toEqual([1]);
    const v2 = M.vMeetingSurveyScores(rows, 'ORM', OCT, SEP, 2);
    expect(v2.length).toBe(1); // set 2 = score row only (+ label rows); no set-1 topics
    expect(v2[0]!.delta).toBeNull(); // September is set 1 → no cross-set Δ
    expect(v2[0]!.no_score.length).toBe(1);
  });
  test('③ team quotas follow §11 (A4 · B3 · C3 · D3 · E2 · Re-active 2) · ④ AE chips sum = นัด', async () => {
    const { M, rows } = await demoRows();
    expect(M.vMeetingByOwner(rows, 'ORM_TEAM', OCT).map((o) => o.quota)).toEqual([4, 3, 3, 3, 2, 2]);
    expect(M.vMeetingByOwner(rows, 'MARCOM_PERSON', OCT).map((o) => o.quota)).toEqual([11, 11, 10, 10]);
    for (const o of M.vMeetingByOwner(rows, 'AE', OCT)) expect(o.booked_orm + o.booked_mc).toBe(o.booked);
  });
});

describe('Meeting tab R1 — mounted (DEMO switch on)', () => {
  test('layout, header = card numbers, ① hover lists, Esc, forbidden scan incl. every hover list', async () => {
    const { setPsDemoSession } = await import('../src/lib/demo-session');
    setPsDemoSession(true);
    const { act, createElement: h } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router');
    const { MeetingAnalyzerTab } = await import('../src/components/ps/meeting-analyzer-tab');
    const router = createRouter({ routeTree: createRootRoute({ component: () => h(MeetingAnalyzerTab, { report: undefined, loading: false, error: false }) }), history: createMemoryHistory({ initialEntries: ['/'] }) });
    const div = document.createElement('div'); document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => { await router.load(); root.render(h(RouterProvider, { router } as never)); });
    const t0 = Date.now();
    while (!(div.querySelector('[data-testid="ms-survey-MARCOM"]') && div.textContent?.includes('42'))) { if (Date.now() - t0 > 15000) throw new Error('late cards'); await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); }
    const text = div.textContent ?? '';
    // order: hero → tiles → section A → section B; Flag Board / old % tiles not rendered
    const idx = ['ประชุมที่ต้องนัดเดือนนี้', 'นัดได้', 'นัดครบไหม', '① Funnel', '② Tier A', '③ ', '④ ', 'ประชุมแล้วได้ผลแค่ไหน', '⑤ คะแนน Survey', '⑥ Meeting Analyzer'].map((s) => text.indexOf(s));
    expect(idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]!))).toBe(true);
    for (const gone of ['ธงแดงเปิดค้าง', 'นัดสำเร็จ %', 'แนะนำต่อ (referral', 'AE ยังไม่ส่ง']) expect(text).not.toContain(gone);
    expect(/Q[1-9]|\d ใบ/.test(text)).toBe(false);
    expect(text).toContain('ขาด 3 จากโควตา');
    expect(text).toContain('Coming soon · ตัวอย่างข้อมูล');
    // over quota: ORM bar overflows the dashed frame; % ≤ 100
    const bar = div.querySelector('[data-testid="ms-bar-ORM-1"]') as HTMLElement;
    const frame = div.querySelector('[data-testid="ms-funnel-ORM"] [data-testid="ms-quota-frame"]') as HTMLElement;
    expect(parseFloat(bar.dataset.width!)).toBeGreaterThan(parseFloat(frame.style.width));
    for (const m of text.matchAll(/(\d+)% ของนัดได้/g)) expect(+m[1]!).toBeLessThanOrEqual(100);
    expect(domHits(div)).toEqual([]);
    // every ① bar: hover → grouped list → scan → Esc closes
    for (const svc of ['ORM', 'MARCOM']) for (const st of [1, 2, 3]) {
      const b = div.querySelector(`[data-testid="ms-bar-${svc}-${st}"]`)!;
      await act(async () => { b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); (b as HTMLElement).focus(); });
      const tip = div.querySelector('[data-testid="ms-tip"]');
      expect(tip?.textContent).toContain('Online Meeting');
      expect(domHits(div)).toEqual([]);
      expect(tip?.textContent ?? '').not.toContain('AE ยังไม่ส่ง');
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
      expect(div.querySelector('[data-testid="ms-tip"]')).toBeNull();
    }
    // proof: a forbidden key injected into a hover list is caught
    const b = div.querySelector('[data-testid="ms-bar-ORM-3"]')!;
    await act(async () => { (b as HTMLElement).focus(); });
    const probe = document.createElement('span'); probe.textContent = 'SURVEY_NO_SCORE'; div.querySelector('[data-testid="ms-tip"]')!.appendChild(probe);
    expect(domHits(div)).toEqual(['SURVEY_NO_SCORE']);
    probe.remove();
    await act(async () => root.unmount());
    setPsDemoSession(false);
  });
  test('"AE ยังไม่ส่ง" does not appear in any PS Dashboard source', () => {
    const files = readdirSync('src/components/ps').filter((f) => f.endsWith('.tsx')).map((f) => `src/components/ps/${f}`);
    for (const f of [...files, 'src/lib/ps-glossary.ts', 'src/lib/meeting-dashboard-types.ts', 'src/lib/meeting-tab-r1.ts']) expect(readFileSync(f, 'utf8')).not.toContain('AE ยังไม่ส่ง');
  });
});
