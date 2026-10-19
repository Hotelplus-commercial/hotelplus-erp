/* Contract Renewal v1.0 — pure rules (recommendation, approval matrix, gates, state machine).
 * Reads a v_ps_repricing-shaped row; never sets a price outside the Repricing band, never recommends commission. */
import type { PsReportRow } from './ps-dashboard-types';

export type RecoType = 'KEEP' | 'RAISE' | 'HOLD' | 'NONE';
export type RecoMode = 'SOFT_FORCE' | 'ADVISORY';
export type Terms = { fee_amount: number; commission_pct: number; term_months: number; package: string; start_date: string; end_date: string };
export type RecoSnapshot = { type: RecoType; band_min_pct: number | null; band_max_pct: number | null; reasons: string[]; inputs: Record<string, unknown>; computed_at: string };
export type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RETURNED' | 'READY_TO_SEND' | 'LINK_SENT' | 'SIGNED' | 'DECLINED' | 'CANCELLED';
export type ApproverRole = 'PM' | 'HOC' | 'MD';
export const REASON_CODES = ['ลูกค้าต่อรอง', 'แข่งขันกับคู่แข่ง', 'ผลงานยังไม่ถึงเป้า', 'ลูกค้าลดขอบเขตงาน', 'ลูกค้าเพิ่มขอบเขตงาน', 'อื่นๆ'] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type RenewalRequest = {
  id: string; renewal_card_id: string; source_contract_id: string; hotel_id: string; hotel_name: string; customer_id: string; ae_owner_id: string;
  reco_snapshot: RecoSnapshot; old_terms: Terms; new_terms: Terms; changed_fields: (keyof Terms)[]; deviates_from_reco: boolean; approval_required: boolean;
  reason_code: ReasonCode | null; reason_text: string; entity_change: boolean; entity_ticket_id: string | null;
  entity_detail?: { what: 'นิติบุคคล' | 'ผู้มีอำนาจลงนาม' | 'ทั้งคู่'; detail: string } | null;
  status: RequestStatus; submitted_at: string | null; approved_by: string | null; approver_role: ApproverRole | null; approved_at: string | null; return_comment: string | null;
  link_sent_at: string | null; signed_at: string | null; new_contract_id: string | null; decline_reason?: string | null;
  created_at: string; updated_at: string;
};
export type PriceHistoryRow = { contract_id: string; cycle_no: number; fee_amount: number; commission_pct: number; term_months: number; package: string; effective_from: string; effective_to: string; source: 'INITIAL' | 'RENEWAL'; renewal_request_id: string | null };
export type RenewalConfig = { renewal_reco_mode: RecoMode; renewal_approval_overdue_days: number };
export const DEFAULT_RENEWAL_CONFIG: RenewalConfig = { renewal_reco_mode: 'SOFT_FORCE', renewal_approval_overdue_days: 2 };

export const OPEN_REQUEST: RequestStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED', 'READY_TO_SEND', 'LINK_SENT'];

/* ---------- dates (calendar dates, Asia/Bangkok) ---------- */
export const bkkDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const addMonths = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
/** New start = old end + 1 day; new end = start + term − 1 day. Never counted as a change. */
export function rollDates(oldEnd: string, termMonths: number) { const start = addDays(oldEnd, 1); return { start_date: start, end_date: addDays(addMonths(start, termMonths), -1) }; }
export function daysBetween(fromIso: string, nowIso: string) { return Math.round((Date.parse(bkkDate(nowIso)) - Date.parse(bkkDate(fromIso))) / 864e5); }
export function isOverdue(r: Pick<RenewalRequest, 'status' | 'submitted_at'>, nowIso: string, cfg: RenewalConfig) {
  return r.status === 'PENDING_APPROVAL' && !!r.submitted_at && daysBetween(r.submitted_at, nowIso) > cfg.renewal_approval_overdue_days;
}

/* ---------- §2 recommendation from v_ps_repricing ---------- */
export function recommend(row: PsReportRow | null | undefined, old: Terms, hasData: boolean, computedAt: string): RecoSnapshot {
  const base = { band_min_pct: null, band_max_pct: null, inputs: {}, computed_at: computedAt };
  if (!hasData) return { ...base, type: 'NONE', reasons: ['ยังไม่มีข้อมูล Repricing ของสัญญานี้'] };
  if (!(old.fee_amount > 0)) return { ...base, type: 'KEEP', reasons: ['สัญญาคิดค่าคอมมิชชันอย่างเดียว · Repricing แนะนำเฉพาะค่าบริการรายเดือน'] };
  const listed = !!row && row['gate_pass'] === true && (row['trigger'] !== 'none' || row['trigger_pending'] === true);
  if (!row || !listed) return { ...base, type: 'KEEP', reasons: ['ไม่อยู่ในรายการ Repricing'] };
  const why = String(row['why_chips'] ?? '').split('|').filter(Boolean);
  const inputs = { trigger: row['trigger'], revenue_profile: row['revenue_profile'], months_since_increase: row['months_since_increase'] };
  if (row['revenue_profile'] === 'declining' || row['band_min_pct'] == null) return { ...base, inputs, type: 'HOLD', reasons: why.length ? why : ['รายได้ขาลง'] };
  return { band_min_pct: Number(row['band_min_pct']), band_max_pct: Number(row['band_max_pct']), inputs, computed_at: computedAt, type: 'RAISE', reasons: why };
}
/** Default new terms: RAISE → fee × (1 + band midpoint), Math.round like the Repricing box; else old terms. Dates roll forward. */
export function defaultNewTerms(old: Terms, reco: RecoSnapshot): Terms {
  const fee = reco.type === 'RAISE' && reco.band_min_pct != null && reco.band_max_pct != null ? Math.round(old.fee_amount * (1 + (reco.band_min_pct + reco.band_max_pct) / 2 / 100)) : old.fee_amount;
  return { ...old, fee_amount: fee, ...rollDates(old.end_date, old.term_months) };
}

/* ---------- §3 approval matrix ---------- */
const TERM_KEYS: (keyof Terms)[] = ['fee_amount', 'commission_pct', 'term_months', 'package'];
export const changedFields = (o: Terms, n: Terms) => TERM_KEYS.filter((k) => o[k] !== n[k]);
export type Evaluation = { changed_fields: (keyof Terms)[]; approval_required: boolean; reason_required: boolean; deviates_from_reco: boolean };
export function evaluate(reco: RecoSnapshot, old: Terms, next: Terms, mode: RecoMode): Evaluation {
  const changed = changedFields(old, next);
  const pct = old.fee_amount > 0 ? ((next.fee_amount - old.fee_amount) / old.fee_amount) * 100 : 0;
  const otherChange = changed.some((k) => k !== 'fee_amount');
  const decrease = next.fee_amount < old.fee_amount;
  const inBand = reco.type === 'RAISE' && reco.band_min_pct != null && reco.band_max_pct != null && next.fee_amount > old.fee_amount && pct >= reco.band_min_pct - 1e-9 && pct <= reco.band_max_pct + 1e-9;
  if (otherChange || decrease) return { changed_fields: changed, approval_required: true, reason_required: true, deviates_from_reco: true };
  if (reco.type === 'RAISE') {
    if (inBand) return { changed_fields: changed, approval_required: true, reason_required: false, deviates_from_reco: false };
    return { changed_fields: changed, approval_required: mode === 'SOFT_FORCE', reason_required: true, deviates_from_reco: true };
  }
  // KEEP / HOLD / NONE: old terms → no approval; any fee increase deviates from the recommendation.
  if (!changed.length) return { changed_fields: changed, approval_required: false, reason_required: false, deviates_from_reco: false };
  return { changed_fields: changed, approval_required: true, reason_required: true, deviates_from_reco: true };
}
export const reasonValid = (code: ReasonCode | null, text: string) => !!code && (code !== 'อื่นๆ' || text.trim().length > 0);

/* ---------- §5 gates + state machine ---------- */
export function gatesPass(r: Pick<RenewalRequest, 'approval_required' | 'status' | 'entity_change'>, entityTicketClosed: boolean) {
  const approvalOk = !r.approval_required || r.status === 'APPROVED' || r.status === 'READY_TO_SEND' || r.status === 'LINK_SENT';
  return approvalOk && (!r.entity_change || entityTicketClosed);
}
type Res = { ok: true; req: RenewalRequest } | { ok: false; error: string };
const set = (r: RenewalRequest, p: Partial<RenewalRequest>, at: string): Res => ({ ok: true, req: { ...r, ...p, updated_at: at } });

/** Edit terms: re-runs §3; any edit after approval returns to DRAFT. */
export function editTerms(r: RenewalRequest, next: Terms, mode: RecoMode, at: string): Res {
  if (!['DRAFT', 'RETURNED', 'APPROVED', 'READY_TO_SEND'].includes(r.status)) return { ok: false, error: 'แก้ไขไม่ได้ในสถานะนี้' };
  const e = evaluate(r.reco_snapshot, r.old_terms, next, mode);
  const terms = changedFields(r.new_terms, next).length > 0;
  return set(r, { new_terms: next, changed_fields: e.changed_fields, approval_required: e.approval_required, deviates_from_reco: e.deviates_from_reco, ...(terms || r.status === 'RETURNED' ? { status: 'DRAFT', approved_by: null, approver_role: null, approved_at: null } : {}) }, at);
}
/** Step 3 primary action. */
export function submit(r: RenewalRequest, mode: RecoMode, entityTicketClosed: boolean, at: string): Res {
  if (r.status !== 'DRAFT') return { ok: false, error: 'ส่งได้เฉพาะร่าง' };
  const e = evaluate(r.reco_snapshot, r.old_terms, r.new_terms, mode);
  if (e.reason_required && !reasonValid(r.reason_code, r.reason_text)) return { ok: false, error: 'ต้องระบุเหตุผล' };
  if (e.approval_required) return set(r, { ...e, status: 'PENDING_APPROVAL', submitted_at: at }, at);
  return set(r, { ...e, status: gatesPass({ ...r, ...e }, entityTicketClosed) ? 'READY_TO_SEND' : 'DRAFT' }, at);
}
/** First action wins: only a PENDING_APPROVAL request can be approved / returned. */
export function approve(r: RenewalRequest, by: string, role: ApproverRole, entityTicketClosed: boolean, at: string, nowIso: string, cfg: RenewalConfig): Res {
  if (r.status !== 'PENDING_APPROVAL') return { ok: false, error: 'รายการนี้มีผู้ดำเนินการแล้ว' };
  if (role !== 'PM' && !isOverdue(r, nowIso, cfg)) return { ok: false, error: 'HOC / MD อนุมัติได้เมื่อเกินกำหนดเท่านั้น' };
  const approved = { ...r, status: 'APPROVED' as const, approved_by: by, approver_role: role, approved_at: at };
  return set(approved, { status: gatesPass(approved, entityTicketClosed) ? 'READY_TO_SEND' : 'APPROVED' }, at);
}
export function returnRequest(r: RenewalRequest, by: string, role: ApproverRole, comment: string, at: string, nowIso: string, cfg: RenewalConfig): Res {
  if (r.status !== 'PENDING_APPROVAL') return { ok: false, error: 'รายการนี้มีผู้ดำเนินการแล้ว' };
  if (!comment.trim()) return { ok: false, error: 'ต้องระบุความเห็น' };
  if (role !== 'PM' && !isOverdue(r, nowIso, cfg)) return { ok: false, error: 'HOC / MD ส่งกลับได้เมื่อเกินกำหนดเท่านั้น' };
  return set(r, { status: 'RETURNED', return_comment: comment.trim(), approved_by: by, approver_role: role }, at);
}
/** Re-evaluate the gate (e.g. after AC closes the entity ticket). */
export function refreshGate(r: RenewalRequest, entityTicketClosed: boolean, at: string): RenewalRequest {
  if (r.status === 'APPROVED' && gatesPass(r, entityTicketClosed)) return { ...r, status: 'READY_TO_SEND', updated_at: at };
  return r;
}
export function sendLink(r: RenewalRequest, at: string): Res {
  if (r.status !== 'READY_TO_SEND' && r.status !== 'LINK_SENT') return { ok: false, error: 'ยังส่ง link ไม่ได้' };
  return set(r, { status: 'LINK_SENT', link_sent_at: at }, at);
}
export function sign(r: RenewalRequest, at: string): Res {
  if (r.status !== 'LINK_SENT') return { ok: false, error: 'ต้องส่ง link ก่อน' };
  return set(r, { status: 'SIGNED', signed_at: at, new_contract_id: `${r.source_contract_id}-R${r.id.slice(-4)}` }, at);
}
export function decline(r: RenewalRequest, reason: string, at: string): Res {
  if (!OPEN_REQUEST.includes(r.status)) return { ok: false, error: 'ปิดไปแล้ว' };
  if (!reason.trim()) return { ok: false, error: 'ต้องระบุเหตุผล' };
  return set(r, { status: 'DECLINED', decline_reason: reason.trim() }, at);
}
export function cancel(r: RenewalRequest, at: string): Res {
  if (r.status !== 'DRAFT' && r.status !== 'RETURNED') return { ok: false, error: 'ยกเลิกได้เฉพาะร่าง / ส่งกลับ' };
  return set(r, { status: 'CANCELLED' }, at);
}

/* ---------- price history ---------- */
export function initialHistory(contracts: { contract_id: string; terms: Terms }[]): PriceHistoryRow[] {
  return contracts.map(({ contract_id, terms: t }) => ({ contract_id, cycle_no: 1, fee_amount: t.fee_amount, commission_pct: t.commission_pct, term_months: t.term_months, package: t.package, effective_from: t.start_date, effective_to: t.end_date, source: 'INITIAL', renewal_request_id: null }));
}
export function renewalHistoryRow(r: RenewalRequest, prevCycle: number): PriceHistoryRow {
  const t = r.new_terms;
  return { contract_id: r.new_contract_id ?? r.source_contract_id, cycle_no: prevCycle + 1, fee_amount: t.fee_amount, commission_pct: t.commission_pct, term_months: t.term_months, package: t.package, effective_from: t.start_date, effective_to: t.end_date, source: 'RENEWAL', renewal_request_id: r.id };
}
/** Billing price on a date = the price-history row whose cycle is ACTIVE on that date. */
export function priceOn(rows: PriceHistoryRow[], dateIso: string) {
  const d = dateIso.slice(0, 10);
  return rows.filter((r) => r.effective_from <= d && r.effective_to >= d).sort((a, b) => b.cycle_no - a.cycle_no)[0] ?? null;
}
