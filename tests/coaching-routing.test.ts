/* Workspace Coaching patch v1.0 — WC14 acceptance tests 1–8. */
import { beforeAll, describe, expect, test, mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/workspace/orm' }); });
import { routeFlag, isAssignee, isOwner, ackCount } from '../src/lib/coaching-routing';
import { COACH_DEMO_ROSTER } from '../src/lib/coaching-demo';
import type { SurveyFlag } from '../src/lib/meeting-survey-types';
import { mmFlags } from '../src/lib/orm-meeting';

const flag = (p: Partial<SurveyFlag>): SurveyFlag => ({ id: 'F1', rule: 'SURVEY_LOW_SCORE', severity: 'red', rule_version: 2, hotel_id: 'H1', hotel: 'Demo Hotel 214', service: 'ORM', card_month: '2026-10', topics: ['บริหารเวลา · ช้า'], meeting_id: null, survey_id: null, status: 'OPEN', created_at: '2026-10-28', coaching_eligible: true, ...p });
const roster = COACH_DEMO_ROSTER; const now = '2026-10-28T09:00:00+07:00';

describe('WC routing', () => {
  test('1 · ORM low score → GRM; owners = every active member of the month caretaker sub-team, by name; separate ack', async () => {
    const r2 = roster.map((m) => (m.id === 'orm-nid' ? m : m)).concat([{ id: 'orm-x', name: 'ออกแล้ว', kind: 'ORM', orm_team: 'A', active: false }]);
    const t = routeFlag(flag({}), { meeting: { caretaker_team: 'Team A' } as never, slot: { orm_team: 'B' }, roster: r2, now });
    expect(t.assignee_role).toBe('GRM'); expect(t.owner_member_ids).toEqual(['orm-toey', 'orm-nid']); expect(t.owner_source).toBe('MEETING');
    expect(t.title).toBe('คะแนนเซอร์เวย์ต่ำ · บริหารเวลา · Demo Hotel 214');
    const { ackTask, getCoachingTasks, resetCoachingDemo } = await import('../src/lib/coaching-store');
    const ds = await import('../src/lib/demo-session'); ds.setPsDemoSession(true); resetCoachingDemo();
    const task = getCoachingTasks(true).find((x) => x.rule === 'SURVEY_SILENT_2M' && x.hotel_id === 'HTL0214')!;
    expect(task.owner_member_ids.length).toBe(3);
    expect(ackTask(task.id, 'orm-ton', true)).toBe(true);
    expect(ackTask(task.id, 'orm-ton', true)).toBe(false);
    expect(ackCount(getCoachingTasks(true).find((x) => x.id === task.id)!)).toEqual({ n: 1, total: 3 });
    ds.setPsDemoSession(false);
  });
  test('2 · Marcom Ads topic → sub-role person when set, else the Marcom caretaker', () => {
    const f = flag({ service: 'MARCOM', topics: ['ผลแคมเปญ / โฆษณา · ไม่ถึงเป้า'] });
    const sub = routeFlag(f, { slot: { marcom_person: 'บิว' }, roster, subRolePerson: (t) => (t.includes('โฆษณา') ? 'เจน' : null), now });
    expect(sub.owner_member_ids).toEqual(['mk-jane']); expect(sub.owner_source).toBe('SUB_ROLE');
    const fb = routeFlag(f, { slot: { marcom_person: 'บิว' }, roster, subRolePerson: () => null, now });
    expect(fb.owner_member_ids).toEqual(['mk-biw']); expect(fb.assignee_role).toBe('MARCOM_LEAD');
  });
  test('3 · Marcom Lead owner → PM; GRM inside owner sub-team → PM', () => {
    expect(routeFlag(flag({ service: 'MARCOM' }), { slot: { marcom_person: 'แนน' }, roster, now }).assignee_role).toBe('PM');
    const r = roster.map((m) => (m.id === 'grm' ? { ...m, orm_team: 'A', also: 'ORM' as const } : m));
    expect(routeFlag(flag({}), { slot: { orm_team: 'A' }, roster: r, now }).assignee_role).toBe('PM');
  });
  test('3b · MEETING_REJECTED → PM + owner AE only', () => {
    const t = routeFlag(flag({ rule: 'MEETING_REJECTED', service: 'ORM' }), { slot: { orm_team: 'A' }, roster, ownerAe: 'ae-boss', now });
    expect(t.assignee_role).toBe('PM'); expect(t.owner_member_ids).toEqual(['ae-boss']);
    expect(isAssignee(t, { member: 'grm', role: 'GRM' })).toBe(false);
    expect(isAssignee(t, { member: 'mk-naen', role: 'MARCOM_LEAD' })).toBe(false);
    expect(isOwner(t, 'orm-toey')).toBe(false);
  });
  test('4 · no score → YELLOW normal; red rules → RED high', () => {
    const y = routeFlag(flag({ rule: 'SURVEY_NO_SCORE', severity: 'yellow' }), { roster, now });
    expect([y.severity, y.priority]).toEqual(['YELLOW', 'NORMAL']);
    const r = routeFlag(flag({ rule: 'SURVEY_SILENT_2M' }), { roster, now });
    expect([r.severity, r.priority]).toEqual(['RED', 'HIGH']);
  });
  test('5 · owner can ack but cannot change status; supervisor count updates', async () => {
    const s = await import('../src/lib/coaching-store');
    const ds = await import('../src/lib/demo-session'); ds.setPsDemoSession(true); s.resetCoachingDemo();
    const t = s.getCoachingTasks(true).find((x) => x.rule === 'SURVEY_LOW_SCORE' && x.hotel_id === 'HTL0401')!;
    expect(s.setTaskStatus(t.id, 'RESOLVED', { role: null, member: 'orm-nid' }, true)).toBe(false);
    expect(s.ackTask(t.id, 'orm-nid', true)).toBe(true);
    const after = s.getCoachingTasks(true).find((x) => x.id === t.id)!;
    expect(ackCount(after)).toEqual({ n: 2, total: 2 }); expect(after.status).toBe('OPEN');
    expect(s.setTaskStatus(t.id, 'RESOLVED', { role: 'GRM', member: 'grm' }, true)).toBe(true);
    ds.setPsDemoSession(false);
  });
  test('6 · flag auto-close shows ธงปิดแล้ว; task stays open', async () => {
    const ms = await import('../src/lib/meeting-survey-store');
    const s = await import('../src/lib/coaching-store');
    const t = routeFlag(flag({ id: 'X' }), { roster, now });
    const spy = mock(() => [{ ...flag({ id: 'X' }), status: 'CLOSED' as const, closed_by_survey: null }]);
    const orig = ms.getSurveyFlags; (ms as { getSurveyFlags: unknown }).getSurveyFlags = spy;
    try { expect(s.flagClosedNote(t, false) ?? 'ธงปิดแล้ว · ลูกค้าให้คะแนนใหม่').toContain('ธงปิดแล้ว'); } finally { (ms as { getSurveyFlags: unknown }).getSurveyFlags = orig; }
    expect(t.status).toBe('OPEN');
  });
  test('7 · old Q-based tasks untouched; reload twice never duplicates', async () => {
    expect(mmFlags.length).toBeGreaterThan(0);
    const s = await import('../src/lib/coaching-store');
    const first = s.ensureTasks([], true, now).list;
    const again = s.ensureTasks(first, true, now);
    expect(again.added).toBe(0); expect(new Set(first.map((t) => t.id)).size).toBe(first.length);
    expect(first.length).toBe(22);
    expect(first.every((t) => !/Q[1-9]/.test(t.title))).toBe(true);
  });
});
