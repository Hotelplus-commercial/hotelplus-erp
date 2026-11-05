/* Tab R2 · การ์ดการต่อสัญญา (Renewal) — acceptance tests (§13). Values come from the spec and the R2 demo additions. */
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: mock(() => {}) }));
const R = await import('../src/lib/renewal-r2');
const S = await import('../src/lib/renewal-scan');
const RS = await import('../src/lib/renewal-reasons');
const D = await import('../src/lib/renewal-r2-demo');
const { RN2 } = await import('../src/lib/ps-glossary');
const { tabR1Demo } = await import('../src/lib/contract-tab-r1-demo');
const { PsRenewalProvider } = await import('../src/lib/ps-renewal');
const { RenewalCardR2 } = await import('../src/components/ps/renewal-card-r2');
const { tabR1HeaderActive, tabR1HeaderChurn } = await import('../src/lib/contract-tab-r1-demo');

const today = D.RENEWAL_R2_DEMO_NOW; // 2026-10-28
const items = () => D.renewalR2DemoItems();
const item = (id: string) => items().find((i) => i.contract_id === id)!;
const reasons = () => D.renewalR2DemoReasons();
const hasR = (i: import('../src/lib/renewal-r2').RenewalItem) => !!RS.reasonFor(reasons(), i.contract_id, i.card_id);
const Q4 = R.periodOf('quarter', today);
const mk = (o: Partial<import('../src/lib/renewal-r2').RenewalItem>) => ({ contract_id: 'X', hotel_id: 'H', hotel_name: 'H', hotel_name_th: null, hotel_name_en: null, service: 'ORM' as const, ae: 'AE001-ดาว', team: 'A', end: '2026-12-01', stage: 'NOT_STARTED' as const, ...o });
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const renderCard = () => renderToStaticMarkup(h(PsRenewalProvider, null, h(RenewalCardR2, { data: tabR1Demo() })));

describe('§2 stages and rates', () => {
  test('1 · each request status maps to its stage; CANCELLED → ยังไม่เริ่ม; SIGNED → ต่อแล้ว before Mark as Done', () => {
    const m = (request: import('../src/lib/renewal-rules').RequestStatus) => R.stageOf({ card: 'ON_PROCESS', request });
    expect(['DRAFT', 'RETURNED', 'PENDING_APPROVAL', 'APPROVED', 'READY_TO_SEND'].map((s) => m(s as never).stage)).toEqual(Array(5).fill('IN_PROGRESS'));
    expect(m('LINK_SENT').stage).toBe('LINK_SENT');
    expect(m('SIGNED').stage).toBe('RENEWED');
    expect(m('DECLINED').stage).toBe('LOST_OR_DECLINED');
    expect(m('CANCELLED').stage).toBe('NOT_STARTED');
    expect(R.stageOf({}).stage).toBe('NOT_STARTED');
    expect(R.stageOf({ contractLost: true }).outcome).toBe('LOST');
    expect(R.STAGE_ORDER.slice(0, 2)).toEqual(['RENEWED', 'LOST_OR_DECLINED']);
  });
  test('2 · signed before its end date counts immediately, has no countdown alert and is tagged early', () => {
    const s = item('CT-ORM-Q-ORM-0405'); // Sukhumvit Suites — ends 18 Nov, signed 22 Oct
    expect(s.stage).toBe('RENEWED');
    expect(R.isEarlySigned(s)).toBe(true);
    expect(R.decidedRenewed(s, today)).toBe(true);
    const u = R.urgentLists(items(), Q4, today, hasR);
    for (const k of R.TILE_KEYS) expect(u[k].some((i) => i.contract_id === s.contract_id)).toBe(false);
  });
  test('3 · past-due open contracts are excluded from the base; churn colour by % (≥ 10) and by count (< 10)', () => {
    const list = [mk({ contract_id: 'A', stage: 'RENEWED', end: '2026-10-10' }), mk({ contract_id: 'B', stage: 'LOST_OR_DECLINED', outcome: 'NOT_RENEWED', end: '2026-10-11' }), mk({ contract_id: 'C', stage: 'IN_PROGRESS', end: '2026-10-20' })];
    const w = R.windowStats(list, Q4, today, today);
    expect(w.decided).toBe(2); expect(w.pastDue).toBe(1); expect(w.renewedPct).toBe(50);
    expect(R.churnTone(1, 10).tone).toBe('normal'); expect(R.churnTone(2, 10).tone).toBe('high'); expect(R.churnTone(3, 20).tone).toBe('watch');
    expect(R.churnTone(3, 9)).toEqual({ tone: 'normal', byCount: true }); expect(R.churnTone(4, 9).tone).toBe('watch'); expect(R.churnTone(5, 9).tone).toBe('high');
  });
});

describe('§1 period and compare', () => {
  test('4 · current quarter on 28 ต.ค. compares 1–28 ต.ค. with 1–28 ก.ค.; a future quarter has no compare; custom A / B works', () => {
    const w = R.compareOf('quarter', Q4, today);
    expect(w.state).toBe('current'); expect(w.cutA).toBe('2026-10-28');
    expect(w.b).toEqual({ from: '2026-07-01', to: '2026-09-30' }); expect(w.cutB).toBe('2026-07-28');
    const f = R.compareOf('quarter', R.periodOf('quarter', '2027-01-15'), today);
    expect(f.state).toBe('future'); expect(f.b).toBeNull();
    const c = R.compareOf('custom', { from: '2026-08-03', to: '2026-08-20' }, today, { from: '2026-05-01', to: '2026-05-18' });
    expect(c.b).toEqual({ from: '2026-05-01', to: '2026-05-18' }); expect(c.cutA).toBe('2026-08-20');
    expect(R.periodLabel('month', today)).toBe('ต.ค. 69'); expect(R.periodLabel('quarter', today)).toBe('Q4 69'); expect(R.periodLabel('year', today)).toBe('2569');
  });
  test('5 · stepper stops at the first data month and at today + 12 months', () => {
    expect(R.stepBounds('month', '2025-10-05', '2025-10-20', today).back).toBe(false);
    expect(R.stepBounds('month', '2025-11-05', '2025-10-20', today).back).toBe(true);
    expect(R.stepBounds('month', '2027-09-05', null, today).fwd).toBe(true);
    expect(R.stepBounds('month', '2027-10-05', null, today).fwd).toBe(false);
  });
});

describe('§4 by AE / team', () => {
  test('6 · no total column / row, divider present, zero = ·, dots follow the rules; team view lists ORM teams A–E', () => {
    const html = renderCard();
    const boxes = html.slice(html.indexOf('rn2-boxes'), html.indexOf('rn2-legend'));
    expect(boxes).not.toMatch(/รวม/); expect(boxes).not.toContain('rn2-stage');
    expect(html).toContain('rn2-div');
    const rows = R.byOwner(items(), 'ORM', 'ae', Q4, today, today, hasR);
    const dao = rows.find((r) => r.key === 'AE001-ดาว')!;
    expect(dao.cells.IN_PROGRESS.red).toBe(true); // Baan Chiang past due
    expect(dao.cells.LOST_OR_DECLINED.amber).toBe(true); // Chaam — waiting for a reason
    const teams = R.byOwner(items(), 'ORM', 'team', Q4, today, today, hasR).map((r) => r.key);
    expect(['A', 'B', 'C', 'D', 'E'].every((t) => teams.includes(t))).toBe(true);
    expect(R.byOwner(items(), 'Marcom', 'team', Q4, today, today, hasR).map((r) => r.key).sort()).toEqual(['บิว', 'แนน']);
  });
  test('7 · name click selects the person (same name again clears); number also opens the stage', () => {
    const a = R.ownerClick(R.NO_HIGHLIGHT, [], 'AE002-มายด์', 'ae');
    expect(a.h.owner).toBe('AE002-มายด์'); expect(a.open).toEqual([]);
    expect(R.ownerClick(a.h, a.open, 'AE002-มายด์', 'ae').h.owner).toBeNull();
    expect(R.ownerClick(R.NO_HIGHLIGHT, [], 'AE002-มายด์', 'ae', 'IN_PROGRESS').open).toEqual(['IN_PROGRESS']);
    const hit = (i: import('../src/lib/renewal-r2').RenewalItem) => R.highlightHit(i, a.h);
    expect(R.stagesWithHits(items().filter((i) => R.inPeriod(i, Q4)), hit)).toContain('IN_PROGRESS');
    // KPIs never depend on the highlight
    expect(R.windowStats(items(), Q4, today, today)).toEqual(R.windowStats(items(), Q4, today, today));
  });
});

describe('§5 status', () => {
  test('8 · เลยกำหนด and รอบันทึกเหตุผล ignore the period; the other two follow it', () => {
    const past = R.periodOf('quarter', '2026-04-15');
    const a = R.urgentLists(items(), Q4, today, hasR), b = R.urgentLists(items(), past, today, hasR);
    expect(b.PAST_DUE.length).toBe(a.PAST_DUE.length); expect(b.NO_REASON.length).toBe(a.NO_REASON.length);
    expect(a.NO_REASON.map((i) => i.contract_id).sort()).toEqual(['CT-ORM-Q-ORM-0301', 'CT-ORM-Q-ORM-0402']);
    expect(b.DUE_SOON.length).toBe(0); expect(a.DUE_SOON.length).toBeGreaterThan(0);
    expect(R.inPeriod(item('CT-ORM-Q-ORM-0301'), Q4)).toBe(false); // Sukho Inn — out of period, `ดูการ์ด` switches to its month
    expect(R.inPeriod(item('CT-ORM-Q-ORM-0301'), R.periodOf('month', R.periodDate(item('CT-ORM-Q-ORM-0301'))))).toBe(true);
  });
  test('9 · search ดุสิต, pool vil and the contract id all match Dusit Pool Villa', () => {
    const d = item('R1-O2');
    expect(R.matchItem(d, 'ดุสิต')).toBe(true); expect(R.matchItem(d, 'pool vil')).toBe(true); expect(R.matchItem(d, 'r1-o2')).toBe(true);
    expect(R.matchItem(item('CT-ORM-Q-ORM-0410'), 'pool vil')).toBe(false);
  });
  test('10 · board hidden on load (switch off)', () => {
    const html = renderCard();
    expect(html).not.toContain('data-testid="rn2-board"');
    expect(html).toContain('role="switch" aria-checked="false"');
    expect(text(html)).toContain(RN2.status.hideStages);
  });
  test('11 · countdown chip at 61 / 60 / 15 / 14 / 0 / −1 days', () => {
    const at = (n: number) => R.countdown(R.addDaysIso(today, n), today).tone;
    expect([at(61), at(60), at(15), at(14), at(0), at(-1)]).toEqual(['grey', 'amber', 'amber', 'red', 'red', 'past']);
  });
  test('12 · ยังไม่เริ่ม stage days start at end − 60; before that the card shows the scan date', () => {
    expect(R.stageDays(mk({ end: R.addDaysIso(today, 50) }), today)).toBe(10);
    expect(R.stageDays(mk({ end: R.addDaysIso(today, 70) }), today)).toBeNull();
    expect(S.scanDateOf('2026-12-22')).toBe('2026-10-23');
    expect(R.RENEWAL_SLA.NOT_STARTED).toEqual({ amberFrom: 8, redFrom: 15 });
  });
});

describe('§7 scan + early create', () => {
  const card = (o: Partial<import('../src/lib/ps-renewal').RenewalCard>) => ({ id: 'RN-1', hotelId: 'H', hotel: 'H', contractEnd: '22 Dec 2026', daysLeft: 0, status: 'ON_PROCESS' as const, owner: 'AE001-Nont', contact: { name: '', phone: '', email: '', line: '' }, contractFile: '', contractGeneratedAt: '', activities: [], ...o });
  const c = { contract_id: 'C1', hotel_id: 'H', hotel_name: 'H', service: 'ORM' as const, end: '2026-12-22', ae: 'AE001-ดาว' };
  test('13 · creates at 60 days, skips an AE_EARLY card, never two open cards for one end date', () => {
    expect(S.RENEWAL_CARD_LEAD_DAYS).toBe(60); expect(S.RENEWAL_SCAN_JOB).toBe('renewal-45day-scan');
    expect(S.scanCandidates([c], [], '2026-10-22')).toHaveLength(0);
    expect(S.scanCandidates([c], [], '2026-10-23')).toHaveLength(1);
    const early = S.newCardFrom(c, 'AE_EARLY', '2026-10-01', 'AE001-Nont');
    expect(early.created_source).toBe('AE_EARLY');
    expect(S.scanCandidates([c], [early], '2026-10-23')).toHaveLength(0);
    expect(S.scanCandidates([c], [card({})], '2026-10-23')).toHaveLength(0); // older card, same hotel + end date
    expect(S.scanCandidates([c, c], [], '2026-10-23')).toHaveLength(1);
  });
  test('14 · early create only for the owning AE', () => {
    const i = mk({ ae: 'AE001-ดาว' });
    expect(R.canEarlyCreate({ id: 'AE001-Nont', role: 'AE' }, i)).toBe(true);
    expect(R.canEarlyCreate({ id: 'AE002-มายด์', role: 'AE' }, i)).toBe(false);
    expect(R.canEarlyCreate({ id: 'PM001-Alex', role: 'PM' }, i)).toBe(false);
    expect(R.canEarlyCreate({ id: 'AE001-Nont', role: 'AE' }, mk({ stage: 'IN_PROGRESS' }))).toBe(false);
  });
});

describe('§6 reasons', () => {
  beforeEach(() => { RS.setReasonsDemo(false); RS.setReasonsDemo(true, () => []); });
  const by = { member_id: 'AE001-Nont', display: 'AE001-Nont', role: 'AE' };
  const now = '2026-10-28T03:00:00.000Z';
  test('15 · cannot be confirmed with < 3 labels; one record written on confirm', () => {
    expect(R.validPick(['PRICE_HIGH', 'REV_MISS'])).toBe(false);
    let sel: string[] = [];
    for (const k of ['PRICE_HIGH', 'REV_MISS', 'WORK_LATE', 'OVERDUE']) sel = R.pickToggle(sel, k);
    expect(sel).toEqual(['PRICE_HIGH', 'REV_MISS', 'WORK_LATE']);
    expect(R.pickToggle(sel, 'REV_MISS')).toEqual(['PRICE_HIGH', 'WORK_LATE']);
    expect(R.REASON_LABELS.every((e) => e.dir === 'bad' && e.group <= 7)).toBe(true);
    expect(RS.recordReason({ contract_id: 'C1', service: 'ORM', outcome: 'NOT_RENEWED', picks: ['PRICE_HIGH'], by }, now).ok).toBe(false);
    const o = RS.recordReason({ contract_id: 'C1', service: 'ORM', outcome: 'NOT_RENEWED', picks: sel, note: 'x', by }, now);
    expect(o.ok).toBe(true); expect(RS.readReasons()).toHaveLength(1);
    expect(RS.recordReason({ contract_id: 'C1', service: 'ORM', outcome: 'NOT_RENEWED', picks: sel, by }, now).ok).toBe(false);
  });
  test('16 · record / edit: owning AE and PM only; edit allowed for 7 days then locked', () => {
    const o = RS.recordReason({ contract_id: 'C2', service: 'ORM', outcome: 'LOST', picks: ['PRICE_HIGH', 'REV_MISS', 'WORK_LATE'], by }, now);
    if (!o.ok) throw new Error(o.error);
    expect(o.rec.editable_until).toBe('2026-11-04T03:00:00.000Z');
    const ae = { id: 'AE001-Nont', role: 'AE' as const }, pm = { id: 'PM001-Alex', role: 'PM' as const }, other = { id: 'AE002-มายด์', role: 'AE' as const };
    expect(R.canRecordReason(ae, 'AE001-ดาว')).toBe(true); expect(R.canRecordReason(pm, 'AE001-ดาว')).toBe(true); expect(R.canRecordReason(other, 'AE001-ดาว')).toBe(false);
    expect(R.canEditReason(pm, 'AE001-ดาว', o.rec, '2026-11-04T03:00:00.000Z')).toBe(true);
    expect(R.canEditReason(pm, 'AE001-ดาว', o.rec, '2026-11-05T03:00:00.000Z')).toBe(false);
    expect(RS.editReason(o.rec.id, ['PRICE_HIGH', 'REV_MISS', 'OVERDUE'], '', by, '2026-11-06T00:00:00.000Z').ok).toBe(false);
    expect(RS.editReason(o.rec.id, ['PRICE_HIGH', 'REV_MISS', 'OVERDUE'], '', by, '2026-10-30T00:00:00.000Z').ok).toBe(true);
    // Teeneedee demo: recorded 24 ต.ค. → 3 more days on 28 ต.ค.
    const t = D.renewalR2DemoReasons().find((r) => r.contract_id === 'CT-MAR-Q-MAR-0388')!;
    expect(R.daysLeftToEdit(t, now)).toBe(3);
  });
  test('17 · labels view pct = n ÷ N with tie note; groups view sorted, label counting, share sums to 100', () => {
    const recs = [
      { primary: ['PRICE_HIGH', 'COMPETITOR_CHEAPER'], secondary: 'MEETING_IRREGULAR' },
      { primary: ['PRICE_HIGH', 'REV_MISS'], secondary: 'WORK_LATE' },
      { primary: ['OVERDUE', 'CLOSED'], secondary: 'IN_HOUSE' },
      { primary: ['VALUE_UNSEEN', 'REV_MISS'], secondary: 'BILL_WRONG' },
    ];
    const t = R.topLabels(recs, 'primary');
    expect(t.rows.map((r) => [r.key, r.n])).toEqual([['PRICE_HIGH', 2], ['REV_MISS', 2], ['COMPETITOR_CHEAPER', 1]]);
    expect(t.rows[0]!.pct).toBe(50); expect(t.tie).toEqual({ k: 3, n: 1 });
    const g = R.groupBars(recs);
    expect(g.rows).toHaveLength(7); expect(g.totalLabels).toBe(12);
    expect(g.rows[0]!.group).toBe(1); expect(g.rows[0]!.primary).toBe(4); // PRICE_HIGH ×2 + COMPETITOR + VALUE_UNSEEN — 2 in one contract = 2
    expect(g.rows.map((r) => r.total)).toEqual([...g.rows.map((r) => r.total)].sort((a, b) => b - a));
    expect(Math.round(g.rows.reduce((s, r) => s + r.share, 0))).toBe(100);
    expect(g.rows[0]!.labels.find((l) => l.key === 'PRICE_HIGH')!.pctOfGroup).toBe(50);
  });
});

describe('§8 / §19', () => {
  test('18 · tour has 8 steps and the click step explains the §4 click behaviour', () => {
    expect(RN2.tour).toHaveLength(8);
    expect(RN2.tour[3]!.title).toBe('คลิกชื่อหรือตัวเลข');
    expect(RN2.tour[3]!.text).toContain('ตัวเลขด้านบนไม่เปลี่ยน');
  });
  test('19 · header demo “ใช้งาน” / “หลุด” unchanged by the renewal additions; demo shows the §11 cases', () => {
    expect(tabR1HeaderActive()).toHaveLength(4); // v1.4.1 RN52: + late renewal R1-O8 (Q58 additions; lapsed ones are not ใช้งาน)
    expect(tabR1HeaderChurn().filter((r) => r.out).length).toBe(4);
    expect(item('CT-MAR-Q-MAR-0388').stage).toBe('LOST_OR_DECLINED');
    expect(item('CT-ORM-Q-ORM-0402').outcome).toBe('LOST');
    expect(item('R1-O2').sub).toBe('PENDING_APPROVAL');
    expect(item('CT-ORM-Q-ORM-0410').stage).toBe('LINK_SENT');
    expect(item('CT-MAR-Q-MAR-0415').stage).toBe('NOT_STARTED');
    expect(item('CT-ORM-Q-ORM-0413').sub).toBe('DRAFT');
    const sim = D.renewalR2Sim();
    expect(sim.items).toHaveLength(120);
    expect(sim.items.some((i) => R.isPastDue(i, today))).toBe(true);
    expect(sim.reasons.length).toBeGreaterThan(10);
  });
});
