/* AE Workspace · Meeting channel + Survey no-score / link / template v2 — acceptance §8 items 1–9 (+ DEMO link path). */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { readFileSync } from 'node:fs';
import { hits } from './forbidden-words';
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps/ae-workspace/surveys' }); });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const load = async () => {
  const st = await import('../src/lib/meeting-survey-store'); const v = await import('../src/lib/survey-v2'); const ds = await import('../src/lib/demo-session');
  return { st, v, ds };
};
beforeEach(async () => { localStorage.clear(); sessionStorage.clear(); const { st } = await load(); st.__resetMeetingSurveyStore(); });

describe('Survey v2 patch', () => {
  it('1–2 channel options / defaults per card; NULL channel = Online Meeting', async () => {
    const { v } = await load();
    expect(v.channelOptions('ORM', 'A')).toEqual({ options: ['ONLINE'], def: 'ONLINE', readOnly: true });
    expect(v.channelOptions('MARCOM', 'B')).toEqual({ options: ['ONLINE'], def: 'ONLINE', readOnly: true });
    expect(v.channelOptions('ORM', 'B')).toEqual({ options: ['ONLINE', 'CALL', 'EMAIL', 'LINE'], def: 'CALL', readOnly: false });
    expect(v.channelOptions('ORM', 'C')).toEqual({ options: ['ONLINE', 'EMAIL', 'LINE'], def: 'EMAIL', readOnly: false });
    expect(v.channelLabel(null)).toBe('Online Meeting');
    expect(v.CHANNEL_LABEL.CALL).toBe('Call Meeting');
    expect(v.surveyRequired('CALL')).toBe(false); expect(v.surveyRequired(null)).toBe(true);
  });

  it('booking keeps a copy of the tier and the channel; stored in meridia.meetings.v1', async () => {
    const { st } = await load();
    const m = st.bookMeeting({ hotel: 'H1', service: 'ORM', tier: 'B', ae: 'AE001-Nont', date: '', status: 'Sent', channel: 'CALL' });
    expect(m.tier_at_booking).toBe('B');
    expect(JSON.parse(localStorage.getItem('meridia.meetings.v1')!)[0].channel).toBe('CALL');
  });

  it('3 ลูกค้าไม่ให้คะแนน → no scores, CUSTOMER_DECLINED, no score email (status null)', async () => {
    const { st } = await load();
    const m = st.getMeetings().find((x) => x.origin === 'survey-queue' && x.status === 'Completed')!;
    const r = st.saveNoScore(m, '', 1);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.survey.no_score_reason).toBe('CUSTOMER_DECLINED'); expect(r.survey.overall).toBeNull(); expect(r.survey.scores).toEqual({}); expect(r.survey.customer_response_status).toBeNull(); }
  });

  it('4 "AE ยังไม่ส่ง" not in AE Workspace; รอทำ Survey used', async () => {
    for (const f of ['ps.ae-workspace.surveys.tsx', 'ps.ae-workspace.meetings.tsx', 'ps.ae-workspace.dashboard.tsx']) expect(readFileSync(`src/routes/${f}`, 'utf8')).not.toContain('AE ยังไม่ส่ง');
    const { v } = await load(); expect(v.SURVEY_TODO).toBe('รอทำ Survey');
  });

  it('5 link: completed + no survey only, once, answered → CUSTOMER_LINK + Confirmed; expiry → LINK_EXPIRED', async () => {
    const { st, v } = await load();
    const upcoming = st.getMeetings().find((x) => x.origin === 'survey-queue' && x.status !== 'Completed')!;
    expect(st.createSurveyLink(upcoming, 1).ok).toBe(false);
    const m = st.getMeetings().find((x) => x.origin === 'survey-queue' && x.status === 'Completed')!;
    const r = st.createSurveyLink(m, 1); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.survey.link_token!.length).toBeGreaterThanOrEqual(30);
    expect(st.createSurveyLink(m, 1).ok).toBe(false); // no resend
    expect(st.findByToken('nope-nope-nope').status).toBe('UNKNOWN');
    expect(st.findByToken(r.survey.link_token!).status).toBe('OPEN');
    const a = st.answerByLink(r.survey.link_token!, { v1: { scores: { Q1: 8, Q2: 8, Q3: 9, Q7: 9 }, comment: '' } });
    expect(a.ok).toBe(true); if (a.ok) { expect(a.survey.respondent).toBe('CUSTOMER_LINK'); expect(a.survey.customer_response_status).toBe('Confirmed'); expect(a.survey.overall).toBe(9); }
    expect(st.findByToken(r.survey.link_token!).status).toBe('DEAD'); // used
    expect(st.answerByLink(r.survey.link_token!, { v1: { scores: {}, comment: '' } }).ok).toBe(false);
    // expiry
    const m2 = st.getMeetings().filter((x) => x.origin === 'survey-queue' && x.status === 'Completed')[1]!;
    const r2 = st.createSurveyLink(m2, 1); if (!r2.ok) throw new Error();
    const rows = JSON.parse(localStorage.getItem('meridia.surveys.v1')!); rows.find((x: { id: string }) => x.id === r2.survey.id).link_expires_at = '2020-01-01T00:00:00.000Z';
    localStorage.setItem('meridia.surveys.v1', JSON.stringify(rows)); st.__resetMeetingSurveyStore();
    expect(st.expireLinks(false)).toBe(1);
    const ex = st.surveyForMeeting(m2.id)!; expect(ex.no_score_reason).toBe('LINK_EXPIRED'); expect(v.isNoScore(ex)).toBe(true);
    expect(st.findByToken(r2.survey.link_token!).status).toBe('DEAD');
  });

  it('6 setting default = 1; a survey keeps its version', async () => {
    const src = readFileSync('src/lib/email-templates.tsx', 'utf8'); expect(src).toContain('surveyVersion: state.surveyActiveVersion ?? 1');
    const { v } = await load(); expect(v.templateVersionOf({ template_version: null })).toBe(1); expect(v.templateVersionOf({ template_version: 2 })).toBe(2);
  });

  it('7 v2: chip text = label names, GOOD/BAD order varies, UNSURE middle; all-UNSURE → no-score', async () => {
    const { v, st } = await load();
    const t = v.V2_TOPICS.find((x) => x.key === 'VALUE')!;
    expect(v.chipOrder(t, () => 0.1)).toEqual(['GOOD', 'UNSURE', 'BAD']); expect(v.chipOrder(t, () => 0.9)).toEqual(['BAD', 'UNSURE', 'GOOD']);
    expect(v.chipText(t, 'BAD')).toBe('มองไม่เห็นความคุ้มค่า');
    expect(v.chipOrder(v.V2_TOPICS.find((x) => x.key === 'PROMISE')!, () => 0.1)).toEqual(['GOOD', 'BAD']);
    const a = v.emptyV2(); a.overall = 'UNSURE'; for (const x of v.topicsFor('ORM')) if (x.kind === 'pair') a.choices[x.key] = x.unsure ? 'UNSURE' : 'GOOD';
    a.recommend = 7; a.opportunity = ['ไม่มี'];
    expect(v.v2AllUnsure('ORM', a)).toBe(true);
    const m = st.getMeetings().find((x) => x.origin === 'survey-queue' && x.status === 'Completed')!;
    const r = st.saveSurveyV2(m, a); expect(r.ok && r.survey.no_score_reason).toBe('CUSTOMER_DECLINED');
    const form = readFileSync('src/components/ps/survey-v2-form.tsx', 'utf8'); expect(form).not.toMatch(/previous|lastMonth/i);
  });

  it('8 referral Q8 hidden + not required; Q9 comment kept', async () => {
    const src = readFileSync('src/routes/ps.ae-workspace.surveys.tsx', 'utf8');
    expect(src).toContain('.filter((q) => q.key !== "Q8")');
    const { v4SurveyQuestions } = await import('../src/lib/ps-v4'); expect(v4SurveyQuestions.some((q) => q.key === 'Q8')).toBe(true);
    expect(v4SurveyQuestions.some((q) => q.key === 'Q9')).toBe(true);
  });

  it('DEMO: §7 counts, never writes real keys, reacts to the switch; link path survives a page load', async () => {
    const { st, ds, v } = await load();
    ds.setPsDemoSession(true);
    const ss = st.getSurveys();
    const v2 = ss.filter((x) => x.template_version === 2 && (x.submitted_at || v.isNoScore(x)));
    expect(v2.filter((x) => x.service === 'ORM' && !v.isNoScore(x)).length).toBe(13);
    expect(v2.filter((x) => x.service === 'ORM' && v.isNoScore(x)).length).toBe(1);
    expect(v2.filter((x) => x.service === 'MARCOM' && !v.isNoScore(x)).length).toBe(30);
    expect(v2.filter((x) => x.service === 'MARCOM' && v.isNoScore(x)).length).toBe(4);
    expect(ss.find((x) => x.id === 'DS-205')!.link_expires_at).toBe('2026-11-07T10:00:00.000Z');
    const m = st.getMeetings().find((x) => x.id === 'DM-208')!;
    const r = st.createSurveyLink(m, 1); if (!r.ok) throw new Error(r.error);
    expect(localStorage.getItem('meridia.surveys.v1')).toBeNull();
    st.__resetMeetingSurveyStore(); // full page load
    expect(st.findByToken(r.survey.link_token!).status).toBe('OPEN');
    expect(st.answerByLink(r.survey.link_token!, { v1: { scores: { Q1: 9, Q7: 9 }, comment: '' } }).ok).toBe(true);
    expect(st.surveyForMeeting('DM-208')!.respondent).toBe('CUSTOMER_LINK');
    ds.setPsDemoSession(false);
    expect(st.surveyForMeeting('DM-208')).toBeUndefined();
    expect(localStorage.getItem('meridia.surveys.v1')).toBeNull();
  });

  it('forbidden scan: survey form, settings and public page texts', async () => {
    const { v } = await load();
    const texts = [v.NO_SCORE_TH, v.NO_SCORE_CONFIRM, v.LINK_ACTION, v.LINK_DEAD_MSG, v.LINK_UNKNOWN_MSG, v.LINK_EXPIRED_TAG, v.LINK_ANSWERED_TAG, v.SURVEY_TODO, v.CHANNEL_HINT, v.linkSentTag('2026-11-07T00:00:00Z'),
      ...Object.values(v.CHANNEL_LABEL), ...v.V2_TOPICS.flatMap((t) => [t.name, t.script, t.good ?? '', t.bad ?? '']), v.UNSURE_TH, ...v.OPPORTUNITY_LABELS,
      'ชุดคำถาม Survey ที่ใช้งาน ชุดที่ 1 (ปัจจุบัน) ชุดที่ 2 (แบบเลือกป้าย) เปลี่ยนเป็นชุดที่ 2 เมื่อ MD อนุมัติ · มีผลกับ Survey ที่สร้างหลังเปลี่ยน'];
    expect(hits(texts.join(' '))).toEqual([]);
    for (const w of ['CUSTOMER_DECLINED', 'LINK_EXPIRED', 'CUSTOMER_LINK', 'GOOD', 'UNSURE', 'BAD']) expect(hits(w)).toContain(w);
  });
});
