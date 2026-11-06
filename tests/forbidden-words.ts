/* MD Review R1.1 §4 forbidden display strings — shared by the SSR and the mounted (after-load) checks.
 * R4.1: stand-alone P1 / P2 / P3 are allowed ONLY inside card ⑤ (data-testid="sd-card") and the
 * queue table "สัญญาในคิว และเวลาแต่ละเฟส" (data-testid="sd-queue"), decision RP98–RP126.
 * Partner v1.2 §7.2: the allowed sd-queue scope is the WHOLE section (queue table, its phase chips `อยู่ P1 n …`, column headers). */
export const FORBIDDEN = [/* PR-O1: drop status keys never shown */ 'NOT_YET', 'DUE_TODAY', 'SENT_AC', 'PR_DROP', 'RETURNED', 'DISPUTED', 'RENEWAL_TERMS_APPROVAL', 'CUSTOMER_ENTITY_CHANGE', 'SOFT_FORCE', 'ADVISORY', 'SERVICING_STALL', 'CONTRACT_FOLLOWUP', 'UPSELL_PITCH', 'RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW', 'ASSIGNMENT_PENDING', 'RENEWED', 'NOT_RENEWED', 'IN_PROGRESS', 'LOST', 'NPS', 'row-1', '★', 'เพดาน', 'เคส PS', 'Ticket ระบบ', 'HTL-', 'รอ BOT', 'customer_segment', 'EXISTING',
  /* Partner v1.2 §7.2 (PW33): raw keys never shown */ 'WELCOME_BACK', 'SYSTEM_SHUTOFF', 'PARTNER_DEAL_NOTICE', 'SYSTEM_CREDIT_NOTICE', 'SYSTEM_REACTIVATE', 'LAPSED_PENDING', 'FIXED_PLUS_COMMISSION', 'COMMISSION_GUARANTEE', 'PENDING', 'STORED',
  /* Survey v2 patch: raw keys never shown */ 'CUSTOMER_DECLINED', 'LINK_EXPIRED', 'CUSTOMER_LINK', 'GOOD', 'UNSURE', 'BAD', 'OTA_VISIBILITY', 'PAGE_ATTENTION', 'CONTENT_IMAGE',
  /* Contract Health · Survey signals patch: raw keys never shown */ 'SURVEY_LOW_SCORE', 'SURVEY_NO_SCORE', 'SURVEY_SILENT_2M', 'MEETING_REJECTED', 'PAGE_FLAT', 'PAGE_UP', 'CONTENT_OFF', 'CONTENT_ON', 'VALUE_UNSEEN', 'VALUE_SEEN',
  /* Service SLA Core v1.0: raw keys never shown */ 'WAITING_CUSTOMER', 'WAITING_THIRD_PARTY', 'TICKET_FOLLOWUP', 'CATEGORY_REQUEST', 'TICKET_NEW', 'TICKET_NO_DATE_DAILY', 'TICKET_NOT_ACCEPTED_3D', 'TICKET_DUE_TOMORROW', 'TICKET_OVERDUE', 'NO_DATE', 'ON_TIME', 'OVERDUE', 'HAD_WAIT', 'NOT_ACCEPTED', 'DEPT_QUEUE_AND_HEAD', 'PARTNER_SYSTEM'];
export const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
export function hits(text: string, opts: { allowPhase?: boolean } = {}) {
  const found = FORBIDDEN.filter((w) => text.includes(w));
  if (!opts.allowPhase && /(^|[^A-Za-z0-9])P[123](?![A-Za-z0-9])/.test(text)) found.push('P1/P2/P3');
  if (/(^|[^A-Za-z0-9_])NEW(?![A-Za-z0-9_])/.test(text)) found.push('NEW');
  return found;
}
export const PHASE_ALLOWED = ['[data-testid="sd-card"]', '[data-testid="sd-queue"]'];
/** Checks a mounted DOM: phase labels allowed only inside the allowed sections; every other word forbidden everywhere. */
export function domHits(root: Element) {
  const clone = root.cloneNode(true) as Element;
  const allowed = PHASE_ALLOWED.flatMap((s) => [...clone.querySelectorAll(s)]);
  const inside = allowed.map((e) => e.textContent ?? '').join(' ');
  allowed.forEach((e) => e.remove());
  return [...new Set([...hits(clone.textContent ?? ''), ...hits(inside, { allowPhase: true })])];
}
