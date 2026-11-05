/* PM Workspace Partner v1.0 — registry adapter for "🤝 งาน Partner" + DEMO shut-off tickets (in-memory ticket store only). */
import { getPartnerData, isPartnerDemo } from './debt-partner-store';
import { partnerContracts } from './partner-contracts';
import { partnerTodoItems } from './partner-workspace';
import { DEMO_DAY } from './demo-session';
import { createTask, transition } from './tickets-l0';
import type { DateRange, TodoItem } from './workspace-registry';

export const partnerToday = () => (isPartnerDemo() ? DEMO_DAY : new Date().toISOString().slice(0, 10));
export function partnerTodoAdapter(q: { person: string; range: DateRange }): (TodoItem & { sub?: string })[] {
  const d = getPartnerData();
  return partnerTodoItems(d, partnerContracts(d, isPartnerDemo()), partnerToday(), q.range, q.person);
}

/** §7 DEMO: Sala Talay Resort (no AE) + Chaba Grand (AE Nont, IN_PROGRESS; ORM twin IN_PROGRESS). Call only with the ticket store in DEMO. */
export function seedShutoffDemo() {
  const mk = (dept: 'PS' | 'ORM', hotel_id: string, hotel_name: string, contract_id: string, ae: { member_id: string; nickname: string } | null) => createTask({
    type: 'SYSTEM_SHUTOFF', target_dept: dept, created_by: 'AC',
    subject_ref: { hotel_id, hotel_name, gap_service: 'ORM', contract_id, deal_id: `SHUTOFF:${dept}:${contract_id}` },
    payload: { readiness_tier: '', chips: ['ขอปิดระบบ'], note: 'AC ขอปิดระบบ (สาธิต)', contract_id, assigned_ae: ae, unassigned_owner: dept === 'PS' && !ae },
  });
  const sala = mk('PS', 'HP-DP-SALATALAY', 'Sala Talay Resort', 'DP-SALATALAY', null);
  const chaba = mk('PS', 'HP-CT-ORM-Q-ORM-0410', 'Chaba Grand', 'CT-ORM-Q-ORM-0410', { member_id: 'hr-1', nickname: 'Nont' });
  const twin = mk('ORM', 'HP-CT-ORM-Q-ORM-0410', 'Chaba Grand', 'CT-ORM-Q-ORM-0410', null);
  if (!chaba.deduped) transition(chaba.ticket_id, 0, 'IN_PROGRESS', 'PS');
  if (!twin.deduped) transition(twin.ticket_id, 0, 'IN_PROGRESS', 'ORM');
  return { sala: sala.ticket_id, chaba: chaba.ticket_id, twin: twin.ticket_id };
}
