/* MD Review R1.1 §4 forbidden display strings — shared by the SSR and the mounted (after-load) checks.
 * R4.1: stand-alone P1 / P2 / P3 are allowed ONLY inside card ⑤ (data-testid="sd-card") and the
 * queue table "สัญญาในคิว และเวลาแต่ละเฟส" (data-testid="sd-queue"), decision RP98–RP126. */
export const FORBIDDEN = ['RENEWAL_TERMS_APPROVAL', 'CUSTOMER_ENTITY_CHANGE', 'SOFT_FORCE', 'ADVISORY', 'SERVICING_STALL', 'CONTRACT_FOLLOWUP', 'UPSELL_PITCH', 'RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW', 'ASSIGNMENT_PENDING', 'RENEWED', 'NOT_RENEWED', 'IN_PROGRESS', 'LOST', 'NPS', 'row-1', '★', 'เพดาน', 'เคส PS', 'Ticket ระบบ', 'HTL-', 'รอ BOT', 'customer_segment', 'EXISTING'];
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
