import { beforeEach, describe, expect, mock, test } from 'bun:test';

const stage = mock(() => {});
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: stage }));
const { setTicketDemo, transition, findOpenByEvent, openOfType, SYSTEM_CREATOR } = await import('../src/lib/tickets-l0');
const { runAlertBot, digestFor, RENEWAL_DUE_DAYS, SURVEY_LOW_THRESHOLD } = await import('../src/lib/alert-bot');
const { demoScanInput } = await import('../src/lib/alert-bot-sources');

const items = () => {
  // read the demo store through a fresh scan's side effects is awkward; expose via openOfType on known hotels
  return { renewal: openOfType('RENEWAL_DUE', 'DEMO-OCEAN'), grade: openOfType('GRADE_RISK', 'DEMO-CHABA'), survey: openOfType('SURVEY_LOW', 'DEMO-SEEFAH') };
};

beforeEach(() => { setTicketDemo(false); setTicketDemo(true); stage.mockClear(); });

describe('Proactive Alert BOT', () => {
  test('creates one ticket per type, routed to PS with SYSTEM creator; grade D carries watchers', () => {
    const r = runAlertBot(demoScanInput());
    expect(r.created).toBe(4); // 2 renewals + 1 grade + 1 survey
    const { renewal, grade, survey } = items();
    expect(renewal[0]?.target_dept).toBe('PS');
    expect(renewal[0]?.created_by).toBe(SYSTEM_CREATOR);
    expect(renewal[0]?.payload.event_key).toBe('2026-10-10');
    expect(grade[0]?.payload.severity).toBe('high');
    expect(grade[0]?.payload.watchers?.map((w) => w.dept)).toEqual(['ORM', 'ORM', 'MARCOM']);
    expect(survey[0]?.payload.unassigned_owner).toBe(true); // Seefah has no AE → not dropped
    expect(stage).not.toHaveBeenCalled(); // demo never mirrors
  });
  test('dedup: re-run same round creates nothing, only refreshes', () => {
    runAlertBot(demoScanInput());
    const r2 = runAlertBot(demoScanInput());
    expect(r2.created).toBe(0);
    expect(r2.skipped).toBe(4);
    expect(items().grade).toHaveLength(1);
  });
  test('cooldown: next grade cycle (new billing_period) re-fires even if previous closed', () => {
    runAlertBot(demoScanInput());
    const t = items().grade[0]!;
    expect(transition(t.ticket_id, t.revision, 'DONE', 'PS')).toBe(true); // Solved
    const next = demoScanInput();
    next.grades = [{ hotel_id: 'DEMO-CHABA', hotel_name: 'Chaba Grand', billing_period: '2026-10-31', grade: 'D' }];
    const r = runAlertBot(next);
    expect(r.created).toBe(1);
    expect(findOpenByEvent('GRADE_RISK', 'DEMO-CHABA', '2026-10-31')).toBeDefined();
  });
  test('condition-cleared stamps but never auto-closes; Solved = DONE by primary only', () => {
    runAlertBot(demoScanInput());
    const next = demoScanInput();
    next.grades = [{ hotel_id: 'DEMO-CHABA', hotel_name: 'Chaba Grand', billing_period: '2026-10-31', grade: 'A' }];
    const r = runAlertBot(next);
    expect(r.cleared).toBe(1);
    const t = items().grade[0]!;
    expect(t.payload.condition_cleared_at).toBeTruthy();
    expect(t.status).toBe('NEW'); // unchanged
    expect(transition(t.ticket_id, t.revision, 'DONE', 'ORM')).toBe(false); // watcher cannot close
    expect(transition(t.ticket_id, t.revision, 'DONE', 'PS')).toBe(true);
  });
  test('BOT tickets have no CANCEL; empty sources fire nothing', () => {
    runAlertBot(demoScanInput());
    const t = items().survey[0]!;
    expect(transition(t.ticket_id, t.revision, 'CANCELLED', 'PS')).toBe(false);
    const empty = runAlertBot({ now: '2026-09-30T00:00:00.000Z', renewals: [], grades: [], surveys: [], route: () => ({ assigned_ae: null, watchers: [] }) });
    expect(empty).toMatchObject({ created: 0, skipped: 0, cleared: 0 });
  });
  test('digest counts fresh vs carried vs ready-to-close', () => {
    runAlertBot(demoScanInput());
    const all = [...items().renewal, ...items().grade, ...items().survey, ...openOfType('RENEWAL_DUE', 'DEMO-CITY')];
    const d = digestFor(all, '2026-09-30');
    expect(d.fresh).toBe(4);
    expect(d.carried).toBe(0);
    expect(d.byType.RENEWAL_DUE).toBe(2);
    const d2 = digestFor(all, '2026-10-01');
    expect(d2.fresh).toBe(0);
    expect(d2.carried).toBe(4);
  });
  test('thresholds wired: renewal 30d, survey < 3/5, grade D only', () => {
    expect(RENEWAL_DUE_DAYS).toBe(30);
    expect(SURVEY_LOW_THRESHOLD).toBe(3);
    const input = demoScanInput();
    input.grades = [{ hotel_id: 'DEMO-X', hotel_name: 'X', billing_period: '2026-09-30', grade: 'C' }]; // C does NOT fire
    const r = runAlertBot(input);
    expect(openOfType('GRADE_RISK', 'DEMO-X')).toHaveLength(0);
    expect(r.created).toBe(4); // only the fixture's own four
  });
});
