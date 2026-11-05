/* Contract Health · Survey signals patch — acceptance §7 (CH19) items 1–7 + DEMO §6 + reload / dedupe. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps' }); });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const load = async () => ({
  st: await import('../src/lib/meeting-survey-store'), F: await import('../src/lib/survey-flags'), R: await import('../src/lib/contract-tab-r1'),
  D: await import('../src/lib/contract-tab-r1-demo'), ds: await import('../src/lib/demo-session'), RR: await import('../src/lib/renewal-r2'),
});
beforeEach(async () => { localStorage.clear(); sessionStorage.clear(); const { st } = await load(); st.__resetMeetingSurveyStore(); });

const meeting = (id: string, hotel_id: string, service: 'ORM' | 'MARCOM' = 'ORM', date = '2026-11-02') => ({ id, hotel: `H ${hotel_id}`, hotel_id, service, tier: 'B' as const, ae: 'AE001-Nont', date, status: 'Completed', channel: 'ONLINE' as const, origin: 'booked' as const });
const book = async (hotel_id: string, service: 'ORM' | 'MARCOM' = 'ORM') => { const { st } = await load(); return st.bookMeeting({ ...meeting('x', hotel_id, service), id: undefined as never, origin: undefined as never }); };
const v2 = (over: Partial<{ choices: Record<string, 'GOOD' | 'UNSURE' | 'BAD'>; overall: number | 'UNSURE' | null; recommend: number | null }>) => ({ choices: {}, overall: 8, recommend: 7, opportunity: ['ไม่มี'], comment: '', ...over });

describe('Contract Health · Survey signals', () => {
  it('1 · v1 topic = 6 → one red SURVEY_LOW_SCORE; = 7 → none (old ≤5 / 6-warning rules retired)', async () => {
    const { st } = await load();
    const a = await book('H-V1-A'); st.saveSurveyV1(a, { Q1: 9, Q2: 6, Q7: 8 }, '');
    const b = await book('H-V1-B'); st.saveSurveyV1(b, { Q1: 7, Q2: 7, Q7: 7 }, '');
    const fl = st.getSurveyFlags(false);
    expect(fl.filter((f) => f.hotel_id === 'H-V1-A').map((f) => [f.rule, f.severity, f.topics])).toEqual([['SURVEY_LOW_SCORE', 'red', ['เวลาการประชุม']]]);
    expect(fl.filter((f) => f.hotel_id === 'H-V1-B')).toEqual([]);
    expect(JSON.parse(localStorage.getItem('meridia.survey_flags.v1')!).length).toBe(1);
  });

  it('2 · v2 overall 8 but VALUE = BAD → red SURVEY_LOW_SCORE + chip มองไม่เห็นความคุ้มค่า', async () => {
    const { st, R } = await load();
    const m = await book('H-V2'); st.saveSurveyV2(m, v2({ choices: { VALUE: 'BAD' } }));
    expect(st.getSurveyFlags(false).map((f) => f.rule)).toEqual(['SURVEY_LOW_SCORE']);
    const base = [{ contract_id: 'C-V2', hotel_id: 'H-V2', hotel_name: 'H', hotel_name_en: null, hotel_name_th: null, service: 'ORM' as const, ae: null, orm_team: null, marcom: null, start: null, term_end: null, inputs: {} }];
    const [row] = R.buildRows(base, { today: '2026-11-05', labels: [], snaps: [], tickets: [], survey: st.surveyContext(st.getMeetingSurveyData(false), false) });
    expect(row!.signals.map((s) => s.label)).toEqual(expect.arrayContaining(['มองไม่เห็นความคุ้มค่า', 'คะแนนเซอร์เวย์ต่ำ']));
    expect(row!.tier).toBe('R');
  });

  it('3 · CUSTOMER_DECLINED and LINK_EXPIRED → yellow SURVEY_NO_SCORE + amber chip', async () => {
    const { st, R } = await load();
    const a = await book('H-NS'); st.saveNoScore(a, '', 2);
    const b = await book('H-LE'); const l = st.createSurveyLink(b, 2); expect(l.ok).toBe(true);
    const all = JSON.parse(localStorage.getItem('meridia.surveys.v1')!); all[all.length - 1].link_expires_at = '2020-01-01T00:00:00.000Z'; localStorage.setItem('meridia.surveys.v1', JSON.stringify(all)); st.__resetMeetingSurveyStore();
    expect(st.expireLinks(false)).toBe(1);
    const fl = st.getSurveyFlags(false);
    expect(fl.map((f) => [f.hotel_id, f.rule, f.severity]).sort()).toEqual([['H-LE', 'SURVEY_NO_SCORE', 'yellow'], ['H-NS', 'SURVEY_NO_SCORE', 'yellow']]);
    const base = [{ contract_id: 'C-NS', hotel_id: 'H-NS', hotel_name: 'H', hotel_name_en: null, hotel_name_th: null, service: 'ORM' as const, ae: null, orm_team: null, marcom: null, start: null, term_end: null, inputs: {} }];
    const [row] = R.buildRows(base, { today: '2026-11-05', labels: [], snaps: [], tickets: [], survey: st.surveyContext(st.getMeetingSurveyData(false), false) });
    const chip = row!.signals.find((s) => s.key === 'SURVEY_NO_SCORE')!;
    expect(chip.label).toBe('ลูกค้าไม่ให้คะแนน'); expect(chip.amber).toBe(true);
  });

  it('4 · two card months without a scored survey (meetings completed) → SURVEY_SILENT_2M once', async () => {
    const { F } = await load();
    const data = { meetings: [meeting('M1', 'H-S', 'ORM', '2026-09-10'), meeting('M2', 'H-S', 'ORM', '2026-10-08'), meeting('M3', 'H-OK', 'ORM', '2026-09-10'), meeting('M4', 'H-OK', 'ORM', '2026-10-08')], surveys: [{ id: 'S4', meeting_id: 'M4', hotel: 'H', service: 'ORM' as const, tier: 'B' as const, meeting_date: '2026-10-08', submitted_at: '2026-10-09T00:00:00Z', overall: 9, scores: { Q7: 9 }, customer_response_status: null, flags: 0 }], answers: [] };
    const first = F.silentFlags(data, '2026-10', [], '2026-11-01T00:00:00Z', { origins: ['booked'] });
    expect(first.map((f) => [f.hotel_id, f.rule, f.card_month])).toEqual([['H-S', 'SURVEY_SILENT_2M', '2026-10']]);
    expect(F.silentFlags(data, '2026-10', first, '2026-11-02T00:00:00Z', { origins: ['booked'] })).toEqual([]);
  });

  it('5 · next scored survey without triggers closes flags and S chips; a no-score survey keeps S labels', async () => {
    const { st, R } = await load();
    const ctx = () => st.surveyContext(st.getMeetingSurveyData(false), false);
    const base = [{ contract_id: 'C-5', hotel_id: 'H-5', hotel_name: 'H', hotel_name_en: null, hotel_name_th: null, service: 'ORM' as const, ae: null, orm_team: null, marcom: null, start: null, term_end: null, inputs: {} }];
    const row = () => R.buildRows(base, { today: '2026-11-05', labels: [], snaps: [], tickets: [], survey: ctx() })[0]!;
    st.saveSurveyV2(await book('H-5'), v2({ choices: { PROMISE: 'BAD' } }));
    expect(row().signals.map((s) => s.key)).toEqual(expect.arrayContaining(['PROMISE_BROKEN', 'SURVEY_LOW_SCORE']));
    st.saveNoScore(await book('H-5'), '', 2);
    expect(row().signals.map((s) => s.key)).toEqual(expect.arrayContaining(['PROMISE_BROKEN', 'SURVEY_LOW_SCORE', 'SURVEY_NO_SCORE']));
    st.saveSurveyV2(await book('H-5'), v2({ choices: { PROMISE: 'GOOD' } }));
    expect(st.getSurveyFlags(false).every((f) => f.status === 'CLOSED')).toBe(true);
    expect(row().signals.map((s) => s.key).filter((k) => ['PROMISE_BROKEN', 'SURVEY_LOW_SCORE', 'SURVEY_NO_SCORE'].includes(k))).toEqual([]);
  });

  it('6 · UNSURE creates no label; revenue chip follows the automatic rule, tooltip shows the customer answer', async () => {
    const { st, R } = await load();
    st.saveSurveyV2(await book('H-6'), v2({ choices: { VALUE: 'UNSURE', REVENUE: 'GOOD' } }));
    const base = [{ contract_id: 'C-6', hotel_id: 'H-6', hotel_name: 'H', hotel_name_en: null, hotel_name_th: null, service: 'ORM' as const, ae: null, orm_team: null, marcom: null, start: null, term_end: null, inputs: { rev_achievement_pct: 80 } }];
    const [row] = R.buildRows(base, { today: '2026-11-05', labels: [], snaps: [], tickets: [], survey: st.surveyContext(st.getMeetingSurveyData(false), false) });
    expect(row!.signals.some((s) => s.key === 'VALUE_SEEN' || s.key === 'VALUE_UNSEEN')).toBe(false);
    const rev = row!.signals.find((s) => s.key === 'REV_MISS')!;
    expect(rev).toBeTruthy(); expect(row!.signals.some((s) => s.key === 'REV_HIT')).toBe(false);
    expect(rev.tip).toEqual(['ลูกค้าตอบ: รายได้ถึงเป้า']);
  });

  it('7 · catalog 52; new bad labels in the non-renewal reason picker; level counts S labels', async () => {
    const { R, RR } = await load();
    expect(R.SIGNAL_CATALOG.length).toBe(52);
    expect(R.SIGNAL_CATALOG.filter((e) => e.src === 'S').length).toBe(8);
    const reasons = RR.REASON_LABELS.map((e) => e.label);
    for (const l of ['เพจไม่ได้รับความสนใจเพิ่ม', 'คอนเทนต์ไม่ตรงภาพลักษณ์', 'คะแนนเซอร์เวย์ต่ำ', 'ลูกค้าไม่ให้คะแนน', 'เงียบ ≥2 เดือน', 'ปฏิเสธนัด']) expect(reasons).toContain(l);
    const { signals } = R.evaluateSignals('ORM', { survey_signals: [{ key: 'MEETING_REJECTED', tip: 'x' }] });
    expect(R.tierOf(signals).tier).toBe('A');
    expect(R.evaluateSignals('ORM', { survey2_value: 6 }).signals.map((s) => s.key)).toEqual(['VALUE_UNSEEN']);
    expect(R.evaluateSignals('ORM', { survey2_value: 7 }).signals).toEqual([]);
  });

  it('labelKeyFromText maps every stored text; VALUE GOOD → VALUE_SEEN (not PRICE_WORTH); unknown → null', async () => {
    const { F, st } = await load();
    expect(F.labelKeyFromText('ค่าบริการคุ้มค่า', 'VALUE', 'GOOD')).toBe('VALUE_SEEN');
    expect(F.labelKeyFromText('เพจได้รับความสนใจมากขึ้น', 'PAGE_ATTENTION', 'GOOD')).toBe('PAGE_UP');
    expect(F.labelKeyFromText('ข้อความที่ไม่รู้จัก')).toBeNull();
    expect(F.unmappedLabelTexts(st.getSurveyLabelAnswers(true))).toEqual([]);
  });

  it('DEMO §6 flags + chips; reload twice keeps the flag count', async () => {
    const { st, ds, R, D } = await load();
    ds.setPsDemoSession(true);
    const count = () => st.getSurveyFlags(true).length;
    const by = (svc: string, rule: string) => st.getSurveyFlags(true).filter((f) => f.service === svc && f.rule === rule).length;
    expect([by('ORM', 'SURVEY_LOW_SCORE'), by('ORM', 'SURVEY_NO_SCORE'), by('ORM', 'SURVEY_SILENT_2M'), by('ORM', 'MEETING_REJECTED')]).toEqual([4, 1, 1, 1]);
    expect([by('MARCOM', 'SURVEY_LOW_SCORE'), by('MARCOM', 'SURVEY_NO_SCORE'), by('MARCOM', 'SURVEY_SILENT_2M'), by('MARCOM', 'MEETING_REJECTED')]).toEqual([8, 4, 2, 1]);
    const n = count();
    st.runMonthClose(true); st.__resetMeetingSurveyStore(); st.runMonthClose(true); st.__resetMeetingSurveyStore();
    expect(count()).toBe(n);
    const d = D.tabR1Demo();
    const rows = R.buildRows(d.base, { today: d.today, labels: [], snaps: [], tickets: [], survey: st.surveyContext(st.getMeetingSurveyData(true), true) });
    const labels = rows.flatMap((r) => r.signals.map((s) => s.label));
    expect(labels).toContain('เพจได้รับความสนใจมากขึ้น'); expect(labels).toContain('คอนเทนต์ไม่ตรงภาพลักษณ์');
    expect(localStorage.getItem('meridia.survey_flags.v1')).toBeNull();
    ds.setPsDemoSession(false);
  });
});
