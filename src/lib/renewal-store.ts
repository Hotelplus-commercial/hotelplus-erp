/* Contract Renewal v1.0 — browser-local store for renewal_request + contract_price_history.
 * Live = localStorage; demo (?demo=1) = in-memory, seeded per §8, reset when demo toggles. */
import { useSyncExternalStore } from 'react';
import { EXPANSION_DEMO, repricingRow, type RepriceInput } from './expansion';
import { DEMO_NOW } from './ps-demo-fixture';
import { addAttachment, createTask, setTicketDemo, ticketById } from './tickets-l0';
import {
  DEFAULT_RENEWAL_CONFIG, OPEN_REQUEST, approve, cancel, decline, defaultNewTerms, editTerms, evaluate, initialHistory, recommend,
  refreshGate, renewalHistoryRow, returnRequest, sendLink, sign, submit,
  type ApproverRole, type PriceHistoryRow, type RenewalConfig, type RenewalRequest, type Terms,
} from './renewal-rules';
import type { PsReportRow } from './ps-dashboard-types';
import type { RenewalCard } from './ps-renewal';

export type SourceContract = { contract_id: string; hotel_id: string; customer_id: string; legal_entity: string; signatory: string; kyc_docs: string[]; terms: Terms };

/** Sample contract terms for the bundled renewal cards (same sample set as the cards themselves). */
const SAMPLE_CONTRACTS: SourceContract[] = [
  { contract_id: 'CT-HTL0042', hotel_id: 'HTL0042', customer_id: 'CUS-0042', legal_entity: 'บริษัท แกรนด์ พาเลซ กรุงเทพ จำกัด', signatory: 'คุณสมศักดิ์ วงศ์ประเสริฐ', kyc_docs: ['หนังสือรับรองบริษัท.pdf', 'บัตรประชาชนผู้ลงนาม.pdf'], terms: { fee_amount: 30000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2025-09-25', end_date: '2026-09-24' } },
  { contract_id: 'CT-HTL0055', hotel_id: 'HTL0055', customer_id: 'CUS-0055', legal_entity: 'บริษัท โอเชียน วิว ภูเก็ต จำกัด', signatory: 'คุณวราภรณ์ ชูเกียรติ', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 18000, commission_pct: 0, term_months: 12, package: 'ORM Lite', start_date: '2025-10-11', end_date: '2026-10-10' } },
  { contract_id: 'CT-HTL0071', hotel_id: 'HTL0071', customer_id: 'CUS-0071', legal_entity: 'บริษัท ซิตี้ เซ็นเตอร์ จำกัด', signatory: 'คุณธนกฤต อารีย์', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 22000, commission_pct: 0, term_months: 12, package: 'Marcom', start_date: '2025-10-24', end_date: '2026-10-23' } },
  { contract_id: 'CT-HTL0089', hotel_id: 'HTL0089', customer_id: 'CUS-0089', legal_entity: 'บริษัท ซันไรส์ บูทีค จำกัด', signatory: 'คุณพิมพ์ชนก ศรีสุข', kyc_docs: [], terms: { fee_amount: 15000, commission_pct: 0, term_months: 12, package: 'ORM Lite', start_date: '2025-10-01', end_date: '2026-09-30' } },
  { contract_id: 'CT-HTL0102', hotel_id: 'HTL0102', customer_id: 'CUS-0102', legal_entity: 'บริษัท ริเวอร์ไซด์ กระบี่ จำกัด', signatory: 'คุณอนุชา แก้วมณี', kyc_docs: [], terms: { fee_amount: 0, commission_pct: 8, term_months: 12, package: 'ORM Commission', start_date: '2025-09-02', end_date: '2026-09-01' } },
];
const DEMO_CONTRACTS: SourceContract[] = [
  { contract_id: 'CT-HTL0118', hotel_id: 'HTL0118', customer_id: 'CUS-0118', legal_entity: 'บริษัท ล้านนา เฮอริเทจ จำกัด', signatory: 'คุณกมล ใจดี', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 25000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2025-11-01', end_date: '2026-10-31' } },
  { contract_id: 'CT-HTL0124', hotel_id: 'HTL0124', customer_id: 'CUS-0124', legal_entity: 'บริษัท บ้านสวน หัวหิน จำกัด', signatory: 'คุณปรีชา สวนงาม', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 20000, commission_pct: 0, term_months: 12, package: 'ORM Lite', start_date: '2025-11-06', end_date: '2026-11-05' } },
  { contract_id: 'CT-HTL0137', hotel_id: 'HTL0137', customer_id: 'CUS-0137', legal_entity: 'บริษัท กระบี่ คลิฟ วิลล่า จำกัด', signatory: 'คุณวิไล ผาสูง', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 24000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2025-10-21', end_date: '2026-10-20' } },
  { contract_id: 'CT-HTL0131', hotel_id: 'HTL0131', customer_id: 'CUS-0131', legal_entity: 'บริษัท สมุย เบย์ รีสอร์ท จำกัด', signatory: 'คุณนภา ทะเลใส', kyc_docs: ['หนังสือรับรองบริษัท.pdf'], terms: { fee_amount: 16000, commission_pct: 0, term_months: 12, package: 'Marcom', start_date: '2025-10-16', end_date: '2026-10-15' } },
];
const contact = (name: string) => ({ name, phone: '08x-xxx-xxxx', email: '—', line: '—' });
/** Demo-only renewal cards (§8 cases 4–7). Cases 1–3 reuse the bundled cards HTL0055 / HTL0042 / HTL0071. */
export const DEMO_EXTRA_CARDS: RenewalCard[] = [
  { id: 'RN-D4', hotelId: 'HTL0118', hotel: 'Lanna Heritage Chiang Mai', contractEnd: '31 Oct 2026', daysLeft: 31, status: 'ON_PROCESS', owner: 'AE001-Nont', contact: contact('คุณกมล ใจดี'), contractFile: 'Contract_v1_2025.pdf', contractGeneratedAt: '20 Oct 2025', activities: [] },
  { id: 'RN-D5', hotelId: 'HTL0124', hotel: 'Baan Suan Hua Hin', contractEnd: '5 Nov 2026', daysLeft: 36, status: 'ON_PROCESS', owner: 'AE001-Nont', contact: contact('คุณปรีชา สวนงาม'), contractFile: 'Contract_v1_2025.pdf', contractGeneratedAt: '25 Oct 2025', activities: [] },
  { id: 'RN-D6', hotelId: 'HTL0131', hotel: 'Koh Samui Bay Resort', contractEnd: '15 Oct 2026', daysLeft: 15, status: 'ON_PROCESS', owner: 'AE001-Nont', contact: contact('คุณนภา ทะเลใส'), contractFile: 'Contract_v1_2025.pdf', contractGeneratedAt: '10 Oct 2025', activities: [] },
  { id: 'RN-D7', hotelId: 'HTL0137', hotel: 'Krabi Cliff Villa', contractEnd: '20 Oct 2026', daysLeft: 20, status: 'ON_PROCESS', owner: 'AE001-Nont', contact: contact('คุณวิไล ผาสูง'), contractFile: 'Contract_v1_2025.pdf', contractGeneratedAt: '15 Oct 2025', activities: [] },
];

/** Demo v_ps_repricing rows, produced by the same repricingRow() engine with demo constants. */
function demoRepricing(): PsReportRow[] {
  const now = new Date(DEMO_NOW);
  const base = (hotel_id: string, hotel_name: string, fee: number, profile: RepriceInput['revenue_profile']): RepriceInput => ({ hotel_id, hotel_name, ae_owner_id: 'AE001-Nont', service_line: 'ORM', billing_model: 'fixed', fee_fixed: fee, guarantee_fee: null, price_history: [{ effective_date: '2023-09-01', note: 'เริ่มสัญญา' }], revenue_profile: profile, underpriced: true, health_tier: 'low', grade: 'A', survey: 4.5 });
  return [
    repricingRow(base('HTL0042', 'Grand Palace Bangkok', 30000, 'moderate'), EXPANSION_DEMO, now),
    repricingRow(base('HTL0071', 'City Center Bangkok', 22000, 'declining'), EXPANSION_DEMO, now),
    repricingRow(base('HTL0118', 'Lanna Heritage Chiang Mai', 25000, 'moderate'), EXPANSION_DEMO, now),
    repricingRow(base('HTL0137', 'Krabi Cliff Villa', 24000, 'moderate'), EXPANSION_DEMO, now),
  ].filter((r): r is PsReportRow => !!r);
}

type State = { seq: number; requests: RenewalRequest[]; history: PriceHistoryRow[] };
const KEY = 'meridia.renewals.v1';
let live: State | null = null; let demo: State | null = null; let demoOn = false; let version = 0;
const listeners = new Set<() => void>();
export const renewalConfig: RenewalConfig = { ...DEFAULT_RENEWAL_CONFIG };
const nowIso = () => (demoOn ? DEMO_NOW : new Date().toISOString());
const contracts = () => (demoOn ? [...SAMPLE_CONTRACTS, ...DEMO_CONTRACTS] : SAMPLE_CONTRACTS);
const backfill = (): PriceHistoryRow[] => initialHistory(contracts());

function liveState(): State {
  if (live) return live;
  try { live = JSON.parse(localStorage.getItem(KEY) ?? '') as State; } catch { live = null; }
  if (!live?.requests) live = { seq: 0, requests: [], history: backfill() };
  return live;
}
const cur = (): State => (demoOn ? (demo ??= seedDemo()) : liveState());
function commit(s: State) {
  if (demoOn) demo = s; else { live = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } }
  version++; listeners.forEach((l) => l());
}
export function setRenewalDemo(on: boolean) {
  if (on === demoOn) return;
  demoOn = on; setTicketDemo(on); demo = on ? seedDemo() : null; version++; listeners.forEach((l) => l());
}
export const isRenewalDemo = () => demoOn;

export const sourceContractFor = (hotelId: string) => contracts().find((c) => c.hotel_id === hotelId) ?? null;
export const sourceContractById = (id: string) => contracts().find((c) => c.contract_id === id) ?? null;
export function recoFor(hotelId: string, terms: Terms) {
  const rows = demoOn ? demoRepricing() : [];
  return recommend(rows.find((r) => r['hotel_id'] === hotelId), terms, demoOn, nowIso());
}

function newRequest(card: Pick<RenewalCard, 'id' | 'hotelId' | 'hotel' | 'owner'>, src: SourceContract, seq: number, at: string): RenewalRequest {
  const reco = recoFor(src.hotel_id, src.terms);
  const next = defaultNewTerms(src.terms, reco);
  const e = evaluate(reco, src.terms, next, renewalConfig.renewal_reco_mode);
  return { id: `RR-${String(seq).padStart(5, '0')}`, renewal_card_id: card.id, source_contract_id: src.contract_id, hotel_id: src.hotel_id, hotel_name: card.hotel, customer_id: src.customer_id, ae_owner_id: card.owner, reco_snapshot: reco, old_terms: src.terms, new_terms: next, changed_fields: e.changed_fields, deviates_from_reco: e.deviates_from_reco, approval_required: e.approval_required, reason_code: null, reason_text: '', entity_change: false, entity_ticket_id: null, entity_detail: null, status: 'DRAFT', submitted_at: null, approved_by: null, approver_role: null, approved_at: null, return_comment: null, link_sent_at: null, signed_at: null, new_contract_id: null, created_at: at, updated_at: at };
}

function seedDemo(): State {
  const s: State = { seq: 0, requests: [], history: initialHistory([...SAMPLE_CONTRACTS, ...DEMO_CONTRACTS]) };
  const mk = (card: RenewalCard) => { s.seq++; return newRequest(card, sourceContractFor(card.hotelId)!, s.seq, DEMO_NOW); };
  const [c4, c5, c6, c7] = DEMO_EXTRA_CARDS as [RenewalCard, RenewalCard, RenewalCard, RenewalCard];
  const r4 = mk(c4); const fee4 = r4.new_terms.fee_amount;
  s.requests.push({ ...r4, status: 'PENDING_APPROVAL', submitted_at: '2026-09-27T03:00:00.000Z', new_terms: { ...r4.new_terms, fee_amount: fee4 } });
  const r5 = mk(c5);
  const t = createTask({ type: 'CUSTOMER_ENTITY_CHANGE', target_dept: 'AC', created_by: 'PS', subject_ref: { hotel_id: c5.hotelId, hotel_name: c5.hotel, gap_service: r5.id }, payload: { readiness_tier: '', chips: [], note: 'เปลี่ยนผู้มีอำนาจลงนาม', renewal_request_id: r5.id, entity_change: { what: 'ผู้มีอำนาจลงนาม', detail: 'ผู้ลงนามใหม่: คุณสุดา สวนงาม' } } });
  addAttachment(t.ticket_id, { name: 'หนังสือมอบอำนาจ.pdf', size: 182_000, mime: 'application/pdf', by: 'AE001-Nont', data_url: 'data:application/pdf;base64,' });
  s.requests.push({ ...r5, entity_change: true, entity_ticket_id: t.ticket_id, entity_detail: { what: 'ผู้มีอำนาจลงนาม', detail: 'ผู้ลงนามใหม่: คุณสุดา สวนงาม' } });
  const r6 = mk(c6);
  s.requests.push({ ...r6, status: 'LINK_SENT', link_sent_at: '2026-09-29T04:00:00.000Z' });
  const r7 = mk(c7); const lo = r7.reco_snapshot.band_min_pct ?? 0;
  const t7 = { ...r7.new_terms, fee_amount: Math.round(r7.old_terms.fee_amount * (1 + lo / 100)) };
  const e7 = evaluate(r7.reco_snapshot, r7.old_terms, t7, renewalConfig.renewal_reco_mode);
  const signed7 = { ...r7, ...e7, new_terms: t7, status: 'SIGNED' as const, submitted_at: '2026-09-22T03:00:00.000Z', approved_by: 'PM001-Alex', approver_role: 'PM' as const, approved_at: '2026-09-23T03:00:00.000Z', link_sent_at: '2026-09-24T03:00:00.000Z', signed_at: '2026-09-28T07:15:00.000Z', new_contract_id: `${r7.source_contract_id}-R${r7.id.slice(-4)}` };
  s.requests.push(signed7); s.history.push(renewalHistoryRow(signed7, 1));
  return s;
}

/* ---------- reads ---------- */
export function useRenewalStore() {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => 0);
  return cur();
}
export const openRequestFor = (cardId: string) => cur().requests.find((r) => r.renewal_card_id === cardId && OPEN_REQUEST.includes(r.status)) ?? null;
export const latestRequestFor = (cardId: string) => [...cur().requests].reverse().find((r) => r.renewal_card_id === cardId) ?? null;
export const entityClosed = (r: RenewalRequest) => { const t = ticketById(r.entity_ticket_id); return !r.entity_change || t?.status === 'DONE'; };
export const renewalNow = nowIso;

/* ---------- writes ---------- */
type Out = { ok: true; req: RenewalRequest } | { ok: false; error: string };
function put(r: RenewalRequest, extra?: Partial<State>): Out { const s = cur(); commit({ ...s, ...extra, requests: s.requests.map((x) => (x.id === r.id ? r : x)) }); return { ok: true, req: r }; }
const apply = (id: string, f: (r: RenewalRequest) => Out): Out => { const r = cur().requests.find((x) => x.id === id); if (!r) return { ok: false, error: 'ไม่พบคำขอ' }; const o = f(r); return o.ok ? put(o.req) : o; };

/** AE pressed ต่อสัญญา: reuse the one open request, else start one with a fresh recommendation. */
export function startRenewal(card: Pick<RenewalCard, 'id' | 'hotelId' | 'hotel' | 'owner'>): Out {
  const open = openRequestFor(card.id); if (open) return { ok: true, req: open };
  const src = sourceContractFor(card.hotelId); if (!src) return { ok: false, error: 'ไม่พบสัญญาที่ใช้งานของโรงแรมนี้' };
  const s = cur(); const r = newRequest(card, src, s.seq + 1, nowIso());
  commit({ ...s, seq: s.seq + 1, requests: [...s.requests, r] }); return { ok: true, req: r };
}
export const updateTerms = (id: string, t: Terms) => apply(id, (r) => editTerms(r, t, renewalConfig.renewal_reco_mode, nowIso()));
export const updateReason = (id: string, code: RenewalRequest['reason_code'], text: string) => apply(id, (r) => ({ ok: true, req: { ...r, reason_code: code, reason_text: text, updated_at: nowIso() } }));
export const submitRequest = (id: string) => apply(id, (r) => submit(r, renewalConfig.renewal_reco_mode, entityClosed(r), nowIso()));
export const approveRequest = (id: string, by: string, role: ApproverRole) => apply(id, (r) => approve(r, by, role, entityClosed(r), nowIso(), nowIso(), renewalConfig));
export const returnBack = (id: string, by: string, role: ApproverRole, comment: string) => apply(id, (r) => returnRequest(r, by, role, comment, nowIso(), nowIso(), renewalConfig));
export const sendRenewalLink = (id: string) => apply(id, (r) => { const g = refreshGate(r, entityClosed(r), nowIso()); return sendLink(g, nowIso()); });
export const declineRequest = (id: string, reason: string) => apply(id, (r) => decline(r, reason, nowIso()));
export const cancelRequest = (id: string) => apply(id, (r) => cancel(r, nowIso()));
/** Re-check the gate (approval done + entity ticket closed). */
export const recheckGate = (id: string) => apply(id, (r) => ({ ok: true, req: refreshGate(r, entityClosed(r), nowIso()) }));

/** Entity-change form → L0 ticket for AC with ≥1 attachment. Runs in parallel with approval. */
export function raiseEntityChange(id: string, what: 'นิติบุคคล' | 'ผู้มีอำนาจลงนาม' | 'ทั้งคู่', detail: string, files: { name: string; size: number; mime: string; data_url: string }[], by: string): Out {
  const r = cur().requests.find((x) => x.id === id); if (!r) return { ok: false, error: 'ไม่พบคำขอ' };
  if (!files.length) return { ok: false, error: 'ต้องแนบไฟล์อย่างน้อย 1 ไฟล์' };
  if (!detail.trim()) return { ok: false, error: 'ระบุรายละเอียดใหม่' };
  const t = createTask({ type: 'CUSTOMER_ENTITY_CHANGE', target_dept: 'AC', created_by: 'PS', subject_ref: { hotel_id: r.hotel_id, hotel_name: r.hotel_name, gap_service: r.id }, payload: { readiness_tier: '', chips: [], note: `${what}: ${detail.trim()}`, renewal_request_id: r.id, entity_change: { what, detail: detail.trim() } } });
  for (const f of files) { const err = addAttachment(t.ticket_id, { ...f, by }); if (err) return { ok: false, error: err }; }
  return put({ ...r, entity_change: true, entity_ticket_id: t.ticket_id, entity_detail: { what, detail: detail.trim() }, updated_at: nowIso() });
}

/** Signing: new ACTIVE contract from new start + RENEWAL price-history row. v1.1: the card closes only via Mark as Done. */
export function signRequest(id: string): Out {
  const r = cur().requests.find((x) => x.id === id); if (!r) return { ok: false, error: 'ไม่พบคำขอ' };
  const o = sign(r, nowIso()); if (!o.ok) return o;
  const s = cur(); const prev = Math.max(0, ...s.history.filter((h) => h.contract_id === r.source_contract_id || h.renewal_request_id != null && s.requests.find((q) => q.id === h.renewal_request_id)?.source_contract_id === r.source_contract_id).map((h) => h.cycle_no));
  return put(o.req, { history: [...s.history, renewalHistoryRow(o.req, prev)] });
}
export const requestById = (id: string) => cur().requests.find((r) => r.id === id) ?? null;
/** Customer signing page path (renewal: no payment step). */
export const renewalSignPath = (id: string) => `/l/renew/${id}`;

/** v1.1 signed badge: latest request SIGNED and the card not yet marked done. */
export const signedAwaitingDone = (card: Pick<RenewalCard, 'id' | 'status'>) => card.status !== 'COMPLETED' && card.status !== 'CHURN' && latestRequestFor(card.id)?.status === 'SIGNED';
/** Customer page in AE preview mode (signature disabled, banner). */
export const renewalPreviewPath = (id: string) => `/l/renew/${id}?preview=1${demoOn ? '&demo=1' : ''}`;
/** "สร้าง live link และส่งให้ลูกค้า": submit (gates) then send in one action. */
export function createAndSendLink(id: string): Out {
  const r = cur().requests.find((x) => x.id === id); if (!r) return { ok: false, error: 'ไม่พบคำขอ' };
  let o: Out = { ok: true, req: r };
  if (r.status === 'DRAFT' || r.status === 'RETURNED') o = submitRequest(id);
  else if (r.status === 'APPROVED') o = recheckGate(id);
  if (!o.ok) return o;
  if (o.req.status === 'PENDING_APPROVAL') return o;
  if (o.req.status !== 'READY_TO_SEND') return { ok: false, error: 'รอ AC ปิด ticket เปลี่ยนนิติบุคคล' };
  return sendRenewalLink(id);
}
