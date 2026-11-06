/* Decisions & Fix R1 — DF1 SLA, DF3 BD routing, DF4 progress notes, DF5 Marcom sub-roles, DF2 other models unchanged. */
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));
beforeAll(() => { if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/ps' }); });
afterAll(async () => { if (GlobalRegistrator.isRegistered) await GlobalRegistrator.unregister(); });
import * as S from '../src/lib/service-tickets';
import { cardStatus, laneSla, servicingLanes, slaTone } from '../src/lib/servicing-time';
import { demoServicingRows, SERVICING_DEMO_NOW } from '../src/lib/servicing-demo';
import { getSetupTiming, statusFor, type SetupInput } from '../src/lib/setup-timing';
import { DEFAULT_KPI_VERSION } from '../src/lib/setup-kpi-settings';
import { resolveMarcomOwner, routeFlag } from '../src/lib/coaching-routing';
import { runDailyBilling } from '../src/lib/ac-v2-engine';
import type { CoachMember } from '../src/lib/coaching-types';

const V = [DEFAULT_KPI_VERSION];
describe('DF1 · one SLA everywhere (SLA On-board)', () => {
  test('lane colour = SLA On-board lane status for 3 DEMO cards (c3 · c8 · c13)', () => {
    const map = { ok: 'ok', near: 'amber', late: 'red' } as const;
    for (const id of ['c3', 'c8', 'c13']) {
      const r = demoServicingRows().find((x) => x.card_id === id)!;
      const cause = cardStatus(servicingLanes(r, SERVICING_DEMO_NOW, V)).cause!;
      const thr = laneSla(cause.phase, cause.lane, r.service_variant, r.created_at, V);
      expect(cause.tone).toBe(slaTone(cause.d!, thr));
      const key = cause.phase === 'P1' ? 'p1' : cause.phase === 'P3' ? 'p3' : cause.lane === 'Specialist' ? 'p2s' : 'p2o';
      const input: SetupInput = { card_id: r.card_id, hotel_id: r.hotel_id, hotel_name: r.hotel_name, service_variant: (r.service_variant ?? 'ORM') as SetupInput['service_variant'], created_at: r.created_at, approved_at: cause.phase === 'P1' ? null : cause.start_at, specialist_handover_done_at: null, meeting_created_at: cause.phase === 'P3' ? cause.start_at : null, meeting_date: cause.phase === 'P3' ? cause.start_at : null, go_live_at: null, ae: null, specialist: null, orm_team: null, marcom_owner: null };
      const st = statusFor(getSetupTiming(input, SERVICING_DEMO_NOW.slice(0, 10)), V).lanes[key];
      if (st && getSetupTiming(input, SERVICING_DEMO_NOW.slice(0, 10)).lanes[key].days === cause.d) expect(map[st]).toBe(cause.tone!);
    }
  });
  test('c8 สมุย ปาล์ม P3 day 5 is red under SLA On-board (P3 ORM 2 / 3 days)', () => {
    const r = demoServicingRows().find((x) => x.card_id === 'c8')!;
    expect(cardStatus(servicingLanes(r, SERVICING_DEMO_NOW, V)).tone).toBe('red');
  });
});

const cats = S.seedCategories();
const psCase = (id: string, team = 'PS') => ({ id, case_no: `Case-${id}`, hotel_id: 'H1', hotel_name: 'Demo Hotel', title: 't', description: null, category_id: 'PS-OTHER', routed_team: team, status: 'open', waiting_reason: null, created_by: 'AE', created_at: '2026-10-27T09:00:00+07:00', updated_at: '2026-10-27T09:00:00+07:00', resolved_at: null, revision: 0 }) as never;
describe('DF3 · PS case → BD', () => {
  test('BD system categories exist', () => {
    const bd = cats.filter((c) => c.dept === 'BD').map((c) => c.name_th);
    expect(bd).toEqual(expect.arrayContaining(['สัญญา / เงื่อนไขที่ BD ทำไว้', 'ใบเสนอราคา / ราคา', 'อื่น ๆ']));
  });
  test('override routes a PS case to the BD row; without it a PS-team case is out of scope', () => {
    S.ticketSla.save(true, []);
    expect(S.vServiceTickets({ l0: [], cases: [psCase('c1')], sla: S.ticketSla.all(true), categories: cats, today: '2026-10-28' })).toHaveLength(0);
    S.routeCaseToBd(true, 'c1', 'quote:BD');
    const rows = S.vServiceTickets({ l0: [], cases: [psCase('c1')], sla: S.ticketSla.all(true), categories: cats, today: '2026-10-28' });
    expect(rows.map((r) => [r.dept, r.category_name_th])).toEqual([['BD', 'ใบเสนอราคา / ราคา']]);
    expect(S.HEAD_OF.BD).toBe('BDM');
  });
});

describe('DF4 · receiver progress notes', () => {
  const row = () => S.vServiceTickets({ l0: [], cases: [psCase('c2', 'ORM')], sla: [{ case_id: 'c2', accepted_at: '2026-10-27T10:00:00+07:00', accepted_by: 'orm-toey', accepted_by_label: 'เตย (ORM-A)', due_date: '2026-10-30' }], followups: S.ticketFollowups.all(true), categories: cats, today: '2026-10-28' })[0]!;
  test('assignee adds a note → timeline + latest update; follow-up counter unchanged', () => {
    S.ticketFollowups.save(true, []);
    expect(S.addProgressNote(row(), 'โทรหาโรงแรมแล้ว', { role: 'ORM', member_id: 'orm-toey', label: 'เตย' }, { demo: true, at: '2026-10-28T11:00:00+07:00' })).toEqual({ ok: true });
    const r = row();
    expect(r.progress_notes.map((n) => n.text)).toEqual(['โทรหาโรงแรมแล้ว']);
    expect(r.last_progress_by_label).toBe('เตย (ORM)');
    expect(r.followup_count).toBe(0);
  });
  test('requester (AE) and other members cannot add a progress note; head can', () => {
    expect(S.addProgressNote(row(), 'x', { role: 'AE' }, { demo: true }).ok).toBe(false);
    expect(S.addProgressNote(row(), 'x', { role: 'ORM', member_id: 'orm-ton' }, { demo: true }).ok).toBe(false);
    expect(S.addProgressNote(row(), 'หัวหน้าตามแล้ว', { role: 'GRM', label: 'GRM' }, { demo: true }).ok).toBe(true);
  });
  test('a progress note does not block the daily follow-up', () => {
    expect(S.sendFollowUp(row(), { role: 'AE', label: 'นนท์' }, { demo: true, at: '2026-10-28T12:00:00+07:00' }).ok).toBe(true);
    expect(row().followup_count).toBe(1);
  });
});

describe('DF5 · Marcom sub-roles', () => {
  const roster: CoachMember[] = [
    { id: 'm1', name: 'บิว', kind: 'MARCOM', active: true, marcom_sub_roles: ['CONTENT'] },
    { id: 'm2', name: 'โบว์', kind: 'MARCOM', active: true, marcom_sub_roles: ['ADS'] },
    { id: 'm3', name: 'เจน', kind: 'MARCOM', active: true },
  ];
  const flag = (topic: string) => ({ id: 'F', rule: 'SURVEY_LOW_SCORE', severity: 'red', service: 'Marcom', hotel: 'H', hotel_id: 'H1', topics: [topic], card_month: '2026-10', meeting_id: null, survey_id: null }) as never;
  test('override beats roster', () => {
    expect(resolveMarcomOwner(['ภาพลักษณ์คอนเทนต์ · x'], { overrides: { CONTENT: 'เจน' }, caretaker: 'บิว', roster }).source).toBe('HOTEL_OVERRIDE');
    const t = routeFlag(flag('ภาพลักษณ์คอนเทนต์ · x'), { slot: { marcom_person: 'บิว', marcom_overrides: { CONTENT: 'เจน' } }, roster, now: '2026-10-28' });
    expect([t.owner_member_ids, t.owner_source]).toEqual([['m3'], 'HOTEL_OVERRIDE']);
  });
  test('roster beats caretaker-only (source ROSTER_SUB_ROLE when the caretaker holds that sub-role)', () => {
    const t = routeFlag(flag('ภาพลักษณ์คอนเทนต์ · x'), { slot: { marcom_person: 'บิว' }, roster, now: '2026-10-28' });
    expect([t.owner_member_ids, t.owner_source]).toEqual([['m1'], 'ROSTER_SUB_ROLE']);
  });
  test('no sub-role match → caretaker; nobody → —', () => {
    expect(routeFlag(flag('ผลแคมเปญ / โฆษณา · x'), { slot: { marcom_person: 'บิว' }, roster, now: '2026-10-28' }).owner_source).toBe('ASSIGN_SLOT');
    expect(routeFlag(flag('ผลแคมเปญ / โฆษณา · x'), { roster, now: '2026-10-28' }).owner_source).toBe('NONE');
  });
});

describe('DF2 · other billing models unchanged', () => {
  test('a commission contract without Guarantee still waits for its report', () => {
    const c = { contract_id: 'K1', status: 'contract_completed', start_date: '2026-01-01', duration_months: 24, billing_status: 'ACTIVE', billing_model: 'FIXED_PLUS_COMMISSION', customer_snapshot: { customer_id: 'X', type: 'juristic', hotel_name: 'K Hotel' },
      lines: [{ line_id: 'l', sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM', package_snapshot: null, billing: 'monthly', unit_price: 5000, commission_rate: 0.1, quantity: 1 }] };
    const out = runDailyBilling({ contracts: [c], customers: [], products: [], invoices: [], reports: [], invRequests: [], liveLinks: [], taxReceipts: [], billingWaiting: [{ contract_id: 'K1', service_line: 'ORM', billing_period: '2026-09-01' }] } as never, '2026-10-05');
    expect(out.invoices).toHaveLength(0);
    expect(out.billingWaiting).toHaveLength(1);
  });
});
