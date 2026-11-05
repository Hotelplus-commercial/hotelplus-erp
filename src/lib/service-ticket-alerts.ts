/* Service SLA Core v1.0 §7 — ticket alerts into bell_items. No scheduler exists: computed on the first open of the day (and on ticket
 * changes); every alert key is once-only (per ticket, or per dept per day for the grouped daily item), so re-runs never duplicate.
 * Every head alert also goes to the department queue. */
import { addBellItem } from './bell-items';
import { addDays, HEAD_OF, openRows, type ServiceTicketRow, type SvcDept } from './service-tickets';

export type AlertSent = { key: string; alert_type: string; target_type: 'USER' | 'ROLE' | 'DEPT_QUEUE'; target_id: string };

export function runServiceAlerts(rows: ServiceTicketRow[], demo: boolean, today: string): AlertSent[] {
  const sent: AlertSent[] = [];
  const at = `${today}T09:00:00+07:00`;
  const put = (key: string, alert_type: string, target_type: AlertSent['target_type'], target_id: string, text: string, tone: 'critical' | 'warning' | 'info') => {
    if (addBellItem(demo, { key, alert_type, target_type, target_id, text, link: null, created_at: at, tone })) sent.push({ key, alert_type, target_type, target_id });
  };
  const open = openRows(rows);
  const noDate: Partial<Record<SvcDept, number>> = {};
  for (const r of open) {
    const ref = `${r.ticket_store}:${r.ticket_id}`;
    const head = HEAD_OF[r.dept];
    if (r.display_status === 'NEW') {
      put(`TICKET_NEW:${ref}`, 'TICKET_NEW', 'DEPT_QUEUE', r.dept, `ticket ใหม่รอรับงาน · ${r.ticket_no} · ${r.hotel_name}`, 'info');
      noDate[r.dept] = (noDate[r.dept] ?? 0) + 1;
      if (today >= addDays(r.created_date, 3)) {
        const t = `ครบ 3 วัน ยังไม่รับงาน · ${r.ticket_no} · ${r.hotel_name}`;
        put(`TICKET_NOT_ACCEPTED_3D:${ref}`, 'TICKET_NOT_ACCEPTED_3D', 'ROLE', head, t, 'warning');
        put(`TICKET_NOT_ACCEPTED_3D:${ref}`, 'TICKET_NOT_ACCEPTED_3D', 'DEPT_QUEUE', r.dept, t, 'warning');
      }
    }
    const toUser = r.accepted && r.assignee_id;
    if (today === addDays(r.effective_due_date, -1)) {
      const t = `เหลือ 1 วันถึงกำหนด · ${r.ticket_no}`;
      if (toUser) put(`TICKET_DUE_TOMORROW:${ref}`, 'TICKET_DUE_TOMORROW', 'USER', r.assignee_id!, t, 'warning');
      else put(`TICKET_DUE_TOMORROW:${ref}`, 'TICKET_DUE_TOMORROW', 'DEPT_QUEUE', r.dept, t, 'warning');
    }
    if (today > r.effective_due_date) {
      const t = `เลยกำหนด · ${r.ticket_no}`;
      if (toUser) put(`TICKET_OVERDUE:${ref}`, 'TICKET_OVERDUE', 'USER', r.assignee_id!, t, 'critical');
      else { put(`TICKET_OVERDUE:${ref}`, 'TICKET_OVERDUE', 'DEPT_QUEUE', r.dept, t, 'critical'); put(`TICKET_OVERDUE:${ref}`, 'TICKET_OVERDUE', 'ROLE', head, t, 'critical'); }
    }
  }
  for (const [d, n] of Object.entries(noDate)) put(`TICKET_NO_DATE_DAILY:${d}:${today}`, 'TICKET_NO_DATE_DAILY', 'DEPT_QUEUE', d, `ยังไม่ได้ใส่วันกำหนดเสร็จ ${n} ticket`, 'warning');
  return sent;
}
