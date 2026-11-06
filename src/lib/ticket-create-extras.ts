/* UAT Polish R2 SP14 / SP15 — create-ticket attachments + duplicate check (pure helpers + side-record writes).
 * Attachments reuse the Partner file store (on-device, 20 MB, same type list); PS cases keep them on the ticket_sla side record. */
import { partnerFileError, putPartnerFile } from './partner-files';
import { ticketSla, type ServiceTicketRow, type TicketAttachmentRef } from './service-tickets';

export type PendingAttachment = { kind: 'file'; name: string; file: File } | { kind: 'link'; name: string; url: string };

/** Thai error per rejected file (Partner rule); accepted files returned separately. */
export function checkAttachments(files: { name: string; size: number }[]): { ok: number[]; errors: string[] } {
  const ok: number[] = []; const errors: string[] = [];
  files.forEach((f, i) => { const e = partnerFileError(f); if (e) errors.push(e); else ok.push(i); });
  return { ok, errors };
}
export function linkError(url: string): string | null {
  return /^https?:\/\/\S+$/i.test(url.trim()) ? null : 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://';
}

/** Store files on-device and write the refs onto the case's ticket_sla side record. */
export async function saveCaseAttachments(demo: boolean, caseId: string, items: PendingAttachment[], at: string): Promise<TicketAttachmentRef[]> {
  const refs: TicketAttachmentRef[] = [];
  for (const [i, a] of items.entries()) {
    if (a.kind === 'file') {
      const ref = `TKT-${caseId}-${Date.parse(at) || 0}-${i}`;
      await putPartnerFile(ref, a.file);
      refs.push({ name: a.name, ref, added_at: at });
    } else refs.push({ name: a.name || a.url, url: a.url.trim(), added_at: at });
  }
  if (!refs.length) return refs;
  const rows = ticketSla.all(demo); const cur = rows.find((r) => r.case_id === caseId);
  const next = { ...(cur ?? { case_id: caseId }), attachments: [...(cur?.attachments ?? []), ...refs] };
  ticketSla.save(demo, cur ? rows.map((r) => (r.case_id === caseId ? next : r)) : [...rows, next]);
  return refs;
}
export const caseAttachments = (demo: boolean, caseId: string): TicketAttachmentRef[] => ticketSla.all(demo).find((r) => r.case_id === caseId)?.attachments ?? [];

/** SP15: open tickets (not Solve / ยกเลิก) of the same hotel + responsible department; same category first, then newest. */
export function findOpenDuplicates(rows: ServiceTicketRow[], hotelId: string, dept: string | null, categoryId?: string | null): ServiceTicketRow[] {
  if (!dept) return [];
  return rows
    .filter((r) => r.hotel_id === hotelId && r.dept === dept && r.display_status !== 'SOLVED' && r.display_status !== 'CANCELLED')
    .sort((a, b) => Number(b.category_id === categoryId) - Number(a.category_id === categoryId) || b.created_at.localeCompare(a.created_at));
}

/** Audit of the user's choice when they create anyway (side record of the new case). */
export function recordDuplicateAck(demo: boolean, caseId: string, seen: string[], at: string, by: string) {
  if (!seen.length) return;
  const rows = ticketSla.all(demo); const cur = rows.find((r) => r.case_id === caseId);
  const next = { ...(cur ?? { case_id: caseId }), duplicate_ack: { seen, at, by } };
  ticketSla.save(demo, cur ? rows.map((r) => (r.case_id === caseId ? next : r)) : [...rows, next]);
}
