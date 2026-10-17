import { beforeEach, describe, expect, mock, test } from 'bun:test';

const stage = mock(() => {});
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: stage }));
const { createTask, transition, allowedNext, findOpen, findOpenByDeal, isPendingPickup, setTicketDemo } = await import('../src/lib/tickets-l0');
const input = { type: 'UPSELL_PITCH' as const, target_dept: 'BD' as const, created_by: 'PM' as const, subject_ref: { hotel_id: 'H1', hotel_name: 'โรงแรมทดสอบ', gap_service: 'Marcom' }, payload: { readiness_tier: 'ready', chips: ['ลูกค้าพอใจ'], note: '' } };
beforeEach(() => { setTicketDemo(false); setTicketDemo(true); stage.mockClear(); });
describe('Layer 0 ticket oracle', () => {
  test('creates, dedupes across departments and preserves the same demo session', () => {
    expect(createTask(input)).toEqual({ ticket_id: 'TKT-000001', deduped: false });
    expect(createTask({ ...input, target_dept: 'ORM' })).toEqual({ ticket_id: 'TKT-000001', deduped: true });
    setTicketDemo(true);
    expect(findOpen('UPSELL_PITCH', 'H1', 'Marcom')?.created_at).toBe('2026-09-30T00:00:00.000Z');
    expect(stage).not.toHaveBeenCalled();
  });
  test('target advances, creator cancels, revision rejects stale actions, terminal tickets cannot advance', () => {
    const { ticket_id } = createTask(input);
    expect(transition(ticket_id, 0, 'ACK', 'ORM')).toBe(false);
    expect(transition(ticket_id, 0, 'ACK', 'BD')).toBe(true);
    expect(transition(ticket_id, 0, 'CANCELLED', 'PM')).toBe(false);
    expect(transition(ticket_id, 1, 'IN_PROGRESS', 'BD')).toBe(true);
    expect(transition(ticket_id, 2, 'DONE', 'BD')).toBe(true);
    expect(transition(ticket_id, 3, 'CANCELLED', 'PM')).toBe(false);
    expect(findOpen('UPSELL_PITCH', 'H1', 'Marcom')).toBeUndefined();
    expect(createTask(input).ticket_id).toBe('TKT-000002');
    const open = findOpen('UPSELL_PITCH', 'H1', 'Marcom');
    expect(open && allowedNext(open, 'PM')).toEqual(['CANCELLED']);
    expect(transition('TKT-000002', 0, 'CANCELLED', 'BD')).toBe(false);
    expect(transition('TKT-000002', 0, 'CANCELLED', 'PM')).toBe(true);
  });
  test('OFFICE ticket lands in its own workspace (no pending pickup); restarting demo clears only its in-memory collection', () => {
    createTask({ ...input, target_dept: 'OFFICE' });
    const ticket = findOpen('UPSELL_PITCH', 'H1', 'Marcom');
    expect(ticket?.target_dept).toBe('OFFICE');
    expect(ticket && isPendingPickup(ticket)).toBe(false);
    expect(ticket?.audit).toHaveLength(1);
    setTicketDemo(false); setTicketDemo(true);
    expect(findOpen('UPSELL_PITCH', 'H1', 'Marcom')).toBeUndefined();
    expect(stage).not.toHaveBeenCalled();
  });
  test('CONTRACT_FOLLOWUP dedupes per deal while open; button returns after DONE', () => {
    const followup = { type: 'CONTRACT_FOLLOWUP' as const, target_dept: 'BD' as const, created_by: 'PM' as const, source_app: 'PS_DASHBOARD' as const, subject_ref: { deal_id: 'D-2402', hotel_id: 'H9', hotel_name: 'Phuket Sands Villa', gap_service: '', service_line: 'ORM' }, payload: { readiness_tier: '', chips: [], note: '', followup: { cohort_month: '2026-09', stage_label: 'Sent Contract', substep: null, days_since_sent_contract: 21, bd_name: 'ปาล์ม' }, assigned_bd: { member_id: 'ปาล์ม', nickname: 'ปาล์ม' } } };
    expect(createTask(followup)).toEqual({ ticket_id: 'TKT-000001', deduped: false });
    expect(createTask(followup)).toEqual({ ticket_id: 'TKT-000001', deduped: true });
    expect(findOpenByDeal('CONTRACT_FOLLOWUP', 'D-2402')?.payload.followup?.bd_name).toBe('ปาล์ม');
    expect(transition('TKT-000001', 0, 'ACK', 'BD')).toBe(true);
    expect(transition('TKT-000001', 1, 'IN_PROGRESS', 'BD')).toBe(true);
    expect(transition('TKT-000001', 2, 'DONE', 'BD')).toBe(true);
    expect(createTask(followup).ticket_id).toBe('TKT-000002'); // DONE แล้วสร้างใหม่ได้
  });
});