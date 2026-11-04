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
import { seedContracts } from './crm-seed';
import type { Contract, ContractLine } from './crm-types';
import { RENEWAL_SOURCE_NOT_FOUND } from './ps-glossary';
import { readEarlyHandoff, toIsoDate } from './renewal-scan';
import { renewalR2DemoItems, renewalR2Sim, RENEWAL_R2_DEMO_NOW } from './renewal-r2-demo';
import { tabR1DemoBase, tabR1HeaderPortfolio } from './contract-tab-r1-demo';
import { headerDemoPortfolio } from './ps-header-r2-demo';

export type SourceContract = {
  contract_id: string; hotel_id: string; customer_id: string; legal_entity: string; signatory: string; kyc_docs: string[]; terms: Terms;
  /** R2.1: explicit service (else derived from package). */ service?: 'ORM' | 'Marcom';
  /** R2.1 §1.3: DEMO-only contract built from the R2 demo record (fields it lacks stay empty, listed in empty_fields). */
  demo_fallback?: true; empty_fields?: string[];
};

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
/** R2.1: DEMO contracts materialised from the R2 demo records (in memory, reset when DEMO toggles). */
let demoExtra: SourceContract[] = [];
const contracts = () => (demoOn ? [...SAMPLE_CONTRACTS, ...DEMO_CONTRACTS, ...demoExtra] : SAMPLE_CONTRACTS);
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
  demoOn = on; demoExtra = []; demoMisses = []; setTicketDemo(on); demo = on ? seedDemo() : null; if (demo) seedDemoLinks(demo); version++; listeners.forEach((l) => l());
}
export const isRenewalDemo = () => demoOn;

/** Kept for the bundled demo seed; startRenewal() now uses resolveSourceContract() (R2.1 UF1). */
export const sourceContractFor = (hotelId: string) => contracts().find((c) => c.hotel_id === hotelId) ?? null;
export const sourceContractById = (id: string) => contracts().find((c) => c.contract_id === id) ?? (demoOn ? null : mainSources().find((c) => c.contract_id === id) ?? null);

/* ---------- R2.1 UF1 — source contract resolved by contract, never by hotel alone ---------- */
type Svc = 'ORM' | 'Marcom';
export const svcOf = (c: SourceContract): Svc => c.service ?? (c.terms.package.startsWith('Marcom') ? 'Marcom' : 'ORM');
const addDaysIso = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const addMonthsIso = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
const lineSvc = (l: ContractLine): Svc => (/^ORM/i.test(l.sku_snapshot) ? 'ORM' : 'Marcom');
/** Main contract store (AccountingData.contracts, CRM browser copy) → one source contract per service it holds. Read only. */
export function sourcesFromMain(list: Contract[]): SourceContract[] {
  return list.flatMap((c) => (['ORM', 'Marcom'] as Svc[]).flatMap((svc): SourceContract[] => {
    const lines = c.lines.filter((l) => lineSvc(l) === svc); if (!lines.length) return [];
    const monthly = lines.filter((l) => l.billing === 'monthly'); const first = monthly[0] ?? lines[0]!;
    const comm = lines.find((l) => l.commission_rate != null)?.commission_rate ?? null;
    const name = first.name_snapshot || first.sku_snapshot;
    return [{
      contract_id: c.contract_id, hotel_id: c.hotel_id ?? '', customer_id: c.customer_snapshot.customer_id, legal_entity: c.customer_snapshot.legal_name,
      signatory: c.customer_snapshot.signer_name, kyc_docs: c.documents ?? [], service: svc,
      terms: { fee_amount: monthly.reduce((s, l) => s + (l.unit_price ?? 0) * (l.quantity || 1), 0), commission_pct: comm == null ? 0 : Math.round(comm * 10000) / 100, term_months: c.duration_months,
        package: name.startsWith(svc) ? name : `${svc} ${name}`, start_date: c.start_date, end_date: addDaysIso(addMonthsIso(c.start_date, c.duration_months), -1) },
      ...(c.billing_status === 'TERMINATED' || c.inactivated_at ? { empty_fields: ['inactive'] } : {}),
    }];
  }));
}
const CRM_KEY = 'hotelplus-crm-v1';
function mainSources(): SourceContract[] {
  let list: Contract[] = seedContracts;
  try { if (typeof localStorage !== 'undefined') { const p = JSON.parse(localStorage.getItem(CRM_KEY) ?? 'null') as { contracts?: Contract[] } | null; if (Array.isArray(p?.contracts)) list = p.contracts; } } catch { /* keep seed */ }
  return sourcesFromMain(list);
}

export type ResolveCard = Pick<RenewalCard, 'id' | 'hotelId'> & Partial<Pick<RenewalCard, 'contractEnd' | 'contract_id' | 'service' | 'created_source'>>;
export type ResolveVia = 'MAIN_ID' | 'RENEWAL_ID' | 'DEMO_R2' | 'HOTEL_SERVICE_END' | 'LATEST_ACTIVE' | 'LEGACY_SINGLE';
export type Resolved = { ok: true; contract: SourceContract; via: ResolveVia } | { ok: false; contract_id: string | null; tried: string[] };
/** contract_id on the card, else the id the create path encodes (`RN-{contract_id}`). Older cards → null. */
export const cardContractId = (c: ResolveCard): string | null => c.contract_id ?? (c.created_source && c.id.startsWith('RN-') ? c.id.slice(3) : null);
/** Pure resolver. Order: contract_id (main → renewal set → DEMO R2 record) · no id: hotel + service + end date (main → renewal set),
 * then latest ACTIVE hotel + service (main) · legacy bundled card with neither end date nor service: the hotel's only contract in the renewal set. */
export function resolveSourceIn(card: ResolveCard, src: { main: SourceContract[]; renewal: SourceContract[]; demo?: (id: string) => SourceContract | null }, today: string): Resolved {
  const tried: string[] = []; const cid = cardContractId(card); const svc = card.service ?? null; const end = toIsoDate(card.contractEnd);
  const svcOk = (c: SourceContract) => !svc || svcOf(c) === svc;
  const ok = (contract: SourceContract, via: ResolveVia): Resolved => ({ ok: true, contract, via });
  if (cid) {
    tried.push(`main:${cid}`); const m = src.main.find((c) => c.contract_id === cid && svcOk(c)); if (m) return ok(m, 'MAIN_ID');
    tried.push(`renewal:${cid}`); const r = src.renewal.find((c) => c.contract_id === cid); if (r) return ok(r, 'RENEWAL_ID');
    if (src.demo) { tried.push(`demo:${cid}`); const d = src.demo(cid); if (d) return ok(d, 'DEMO_R2'); }
    return { ok: false, contract_id: cid, tried };
  }
  const sameHotel = (c: SourceContract) => c.hotel_id === card.hotelId && svcOk(c);
  if (end) for (const [name, list] of [['main', src.main], ['renewal', src.renewal]] as const) {
    tried.push(`${name}:${card.hotelId}+${svc ?? '*'}+${end}`);
    const hit = list.filter((c) => sameHotel(c) && c.terms.end_date === end); if (hit.length === 1) return ok(hit[0]!, 'HOTEL_SERVICE_END');
  }
  if (svc) {
    tried.push(`main:${card.hotelId}+${svc} ACTIVE`);
    const act = src.main.filter((c) => sameHotel(c) && !c.empty_fields?.includes('inactive') && c.terms.start_date <= today && c.terms.end_date >= today).sort((a, b) => b.terms.start_date.localeCompare(a.terms.start_date));
    if (act[0]) return ok(act[0], 'LATEST_ACTIVE');
  }
  if (!end && !svc) { tried.push(`renewal:${card.hotelId} (only contract)`); const hit = src.renewal.filter((c) => c.hotel_id === card.hotelId); if (hit.length === 1) return ok(hit[0]!, 'LEGACY_SINGLE'); }
  return { ok: false, contract_id: null, tried };
}
/** DEMO §1.3 fallback: build the source contract from the R2 / Header R2 demo record (or the dashboard hand-off) — in memory only. */
function materialiseDemo(cid: string): SourceContract | null {
  const have = demoExtra.find((c) => c.contract_id === cid); if (have) return have;
  const item = renewalR2DemoItems().find((i) => i.contract_id === cid) ?? (cid.startsWith('SIM-') ? renewalR2Sim(120, RENEWAL_R2_DEMO_NOW).items.find((i) => i.contract_id === cid) : undefined);
  const rec = item ? { contract_id: item.contract_id, hotel_id: item.hotel_id, hotel_name: item.hotel_name, service: item.service, end: item.end } : readEarlyHandoff(cid);
  if (!rec) return null;
  const base = tabR1DemoBase().find((b) => b.contract_id === cid);
  const price = [...headerDemoPortfolio().prices, ...tabR1HeaderPortfolio().prices].find((p) => p.contract_id === cid);
  const end = rec.end.slice(0, 10); const start = base?.start ?? '';
  const months = start ? Math.max(1, Math.round((Date.parse(`${addDaysIso(end, 1)}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / (30.4375 * 864e5))) : 12;
  const empty = ['customer_id', 'signatory', 'kyc_docs', ...(start ? [] : ['start_date', 'term_months (ใช้ 12)']), ...(price?.fee_amount != null ? [] : ['fee_amount']), ...(price?.commission_pct != null ? [] : ['commission_pct'])];
  const sc: SourceContract = {
    contract_id: cid, hotel_id: rec.hotel_id, customer_id: '', legal_entity: rec.hotel_name, signatory: '', kyc_docs: [], service: rec.service,
    terms: { fee_amount: price?.fee_amount ?? 0, commission_pct: price?.commission_pct ?? 0, term_months: months, package: rec.service, start_date: start, end_date: end },
    demo_fallback: true, empty_fields: empty,
  };
  demoExtra = [...demoExtra, sc];
  return sc;
}
/** Store wrapper: live = main store + renewal set (never fabricates); DEMO = demo contract state + R2 fallback. */
export function resolveSourceContract(card: ResolveCard): Resolved {
  return resolveSourceIn(card, { main: demoOn ? [] : mainSources(), renewal: contracts(), ...(demoOn ? { demo: materialiseDemo } : {}) }, nowIso().slice(0, 10));
}
/** Wizard: the renewal card for a contract id (card contract id → card whose request uses it → older hotel match). */
export function wizardCardFor<T extends ResolveCard>(cards: T[], contractId: string, src: SourceContract | null): T | undefined {
  const reqCards = [...cur().requests].reverse().filter((r) => r.source_contract_id === contractId).map((r) => r.renewal_card_id);
  return cards.find((c) => cardContractId(c) === contractId) ?? reqCards.map((id) => cards.find((c) => c.id === id)).find(Boolean) ?? (src ? cards.find((c) => c.hotelId === src.hotel_id && !cardContractId(c)) : undefined);
}

/* activity log of misses (`source_contract_not_found`): live = localStorage, DEMO = memory */
export type SourceMiss = { card_id: string; event: 'source_contract_not_found'; contract_id: string | null; tried: string[]; at: string };
const MISS_KEY = 'meridia.renewal-source-miss.v1';
let demoMisses: SourceMiss[] = [];
const readMisses = (): SourceMiss[] => { if (demoOn) return demoMisses; try { return JSON.parse(localStorage.getItem(MISS_KEY) ?? '[]') as SourceMiss[]; } catch { return []; } };
function logMiss(m: SourceMiss) {
  if (demoOn) demoMisses = [...demoMisses, m]; else { try { localStorage.setItem(MISS_KEY, JSON.stringify([...readMisses(), m])); } catch { /* quota */ } }
  version++; listeners.forEach((l) => l());
}
export const sourceMissesFor = (cardId: string) => readMisses().filter((m) => m.card_id === cardId);
/** Tab R2 §7.1 scan feed (live): the source contracts with a term end date (read only). */
export const scanSourceContracts = () => contracts().map((c) => ({ contract_id: c.contract_id, hotel_id: c.hotel_id, hotel_name: c.legal_entity, service: (c.terms.package.startsWith('Marcom') ? 'Marcom' : 'ORM') as 'ORM' | 'Marcom', end: c.terms.end_date, ae: null as string | null }));
export function recoFor(hotelId: string, terms: Terms) {
  const rows = demoOn ? demoRepricing() : [];
  return recommend(rows.find((r) => r['hotel_id'] === hotelId), terms, demoOn, nowIso());
}

function newRequest(card: Pick<RenewalCard, 'id' | 'hotelId' | 'hotel' | 'owner'>, src: SourceContract, seq: number, at: string): RenewalRequest {
  const reco = recoFor(src.hotel_id, src.terms);
  const next = defaultNewTerms(src.terms, reco, renewalConfig.renewal_min_raise_thb);
  const e = evaluate(reco, src.terms, next, renewalConfig.renewal_reco_mode, renewalConfig.renewal_min_raise_thb);
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
  const e7 = evaluate(r7.reco_snapshot, r7.old_terms, t7, renewalConfig.renewal_reco_mode, renewalConfig.renewal_min_raise_thb);
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
type Out = { ok: true; req: RenewalRequest } | { ok: false; error: string; miss?: { contract_id: string | null; tried: string[] } };
function put(r: RenewalRequest, extra?: Partial<State>): Out { const s = cur(); commit({ ...s, ...extra, requests: s.requests.map((x) => (x.id === r.id ? r : x)) }); return { ok: true, req: r }; }
const apply = (id: string, f: (r: RenewalRequest) => Out): Out => { const r = cur().requests.find((x) => x.id === id); if (!r) return { ok: false, error: 'ไม่พบคำขอ' }; const o = f(r); return o.ok ? put(o.req) : o; };

/** AE pressed ต่อสัญญา: reuse the one open request, else start one with a fresh recommendation. */
export function startRenewal(card: Pick<RenewalCard, 'id' | 'hotelId' | 'hotel' | 'owner'> & Partial<Pick<RenewalCard, 'contractEnd' | 'contract_id' | 'service' | 'created_source'>>): Out {
  const open = openRequestFor(card.id); if (open) return { ok: true, req: open };
  const res = resolveSourceContract(card);
  if (!res.ok) {
    logMiss({ card_id: card.id, event: 'source_contract_not_found', contract_id: res.contract_id, tried: res.tried, at: nowIso() });
    return { ok: false, error: RENEWAL_SOURCE_NOT_FOUND(res.contract_id ?? `(${card.hotelId})`), miss: { contract_id: res.contract_id, tried: res.tried } };
  }
  const src = res.contract;
  const s = cur(); const r = newRequest(card, src, s.seq + 1, nowIso());
  commit({ ...s, seq: s.seq + 1, requests: [...s.requests, r] }); return { ok: true, req: r };
}
export const updateTerms = (id: string, t: Terms) => apply(id, (r) => editTerms(r, t, renewalConfig.renewal_reco_mode, nowIso(), renewalConfig.renewal_min_raise_thb));
export const updateReason = (id: string, code: RenewalRequest['reason_code'], text: string) => apply(id, (r) => ({ ok: true, req: { ...r, reason_code: code, reason_text: text, updated_at: nowIso() } }));
export const submitRequest = (id: string) => apply(id, (r) => submit(r, renewalConfig.renewal_reco_mode, entityClosed(r), nowIso(), renewalConfig.renewal_min_raise_thb));
export const approveRequest = (id: string, by: string, role: ApproverRole) => apply(id, (r) => approve(r, by, role, entityClosed(r), nowIso(), nowIso(), renewalConfig));
export const returnBack = (id: string, by: string, role: ApproverRole, comment: string) => apply(id, (r) => returnRequest(r, by, role, comment, nowIso(), nowIso(), renewalConfig));
/** Send / re-send: the live_link record is written BEFORE the request moves to LINK_SENT. */
export const sendRenewalLink = (id: string) => apply(id, (r) => {
  const g = refreshGate(r, entityClosed(r), nowIso());
  if (g.status !== 'READY_TO_SEND' && g.status !== 'LINK_SENT') return sendLink(g, nowIso());
  const at = nowIso(); const src = sourceContractById(g.source_contract_id);
  if (!src) return { ok: false, error: 'ไม่พบสัญญาต้นทาง' };
  const saved = issueRenewalLink({ ...g, status: 'LINK_SENT', link_sent_at: at }, src, at);
  if (!saved) return { ok: false, error: 'บันทึก live link ไม่สำเร็จ · ลองอีกครั้ง' };
  return sendLink(g, at);
});
export const declineRequest = (id: string, reason: string) => apply(id, (r) => { const o = decline(r, reason, nowIso()); if (o.ok) setLinkStatus(r.id, 'REVOKED'); return o; });
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
  setLinkStatus(r.id, 'SIGNED', o.req.signed_at, o.req);
  const s = cur(); const prev = Math.max(0, ...s.history.filter((h) => h.contract_id === r.source_contract_id || h.renewal_request_id != null && s.requests.find((q) => q.id === h.renewal_request_id)?.source_contract_id === r.source_contract_id).map((h) => h.cycle_no));
  return put(o.req, { history: [...s.history, renewalHistoryRow(o.req, prev)] });
}
export const requestById = (id: string) => cur().requests.find((r) => r.id === id) ?? null;
/** Customer signing page path (renewal: no payment step). */
export const renewalSignPath = (token: string) => `/l/renew/${token}`;
/** Card "เปิด live link": current token (ACTIVE or SIGNED) for the request. */
export const liveLinkPathFor = (requestId: string) => { const l = currentLinkFor(requestId); return l ? renewalSignPath(l.token) : null; };

/** v1.1 signed badge: latest request SIGNED and the card not yet marked done. */
export const signedAwaitingDone = (card: Pick<RenewalCard, 'id' | 'status'>) => card.status !== 'COMPLETED' && card.status !== 'CHURN' && latestRequestFor(card.id)?.status === 'SIGNED';
/** Customer page in AE preview mode (signature disabled, banner). */
/** Wizard step 3 preview: no token — snapshot of new_terms rendered directly. */
export function renewalPreviewPath(id: string) {
  const r = cur().requests.find((x) => x.id === id); const src = r ? sourceContractById(r.source_contract_id) : null;
  if (r && src) { try { localStorage.setItem(`${PREVIEW_KEY}${id}`, JSON.stringify({ request: r, contract: src })); } catch { /* quota */ } }
  return `/l/renew/preview-${id}?preview=1`;
}
export const readPreview = (id: string): { request: RenewalRequest; contract: SourceContract } | null => { try { return JSON.parse(localStorage.getItem(`${PREVIEW_KEY}${id}`) ?? 'null'); } catch { return null; } };
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

/* ---------- v1.2 live_link records (browser-local, shared by every tab; snapshot makes a link self-contained) ---------- */
export type LinkStatus = 'ACTIVE' | 'SIGNED' | 'REVOKED' | 'EXPIRED';
export type RenewalLiveLink = { token: string; kind: 'RENEWAL'; renewal_request_id: string; contract_id: string; created_at: string; expires_at: string | null; status: LinkStatus; signed_at: string | null; signer: string | null; snapshot: { request: RenewalRequest; contract: SourceContract } };
/** Validity in days; null = never expires (BD live links have no expiry either). */
export const RENEWAL_LINK_VALID_DAYS: number | null = null;
const LINK_KEY = 'meridia.renewal-links.v1'; const PREVIEW_KEY = 'meridia.renewal-preview.';
export function readLinks(): RenewalLiveLink[] { try { return JSON.parse(localStorage.getItem(LINK_KEY) ?? '[]') as RenewalLiveLink[]; } catch { return []; } }
function writeLinks(l: RenewalLiveLink[]): boolean { try { localStorage.setItem(LINK_KEY, JSON.stringify(l)); version++; listeners.forEach((f) => f()); return true; } catch { return false; } }
export const isExpired = (l: RenewalLiveLink, now = new Date().toISOString()) => l.status === 'EXPIRED' || (l.status === 'ACTIVE' && !!l.expires_at && now > l.expires_at);
export const linkByToken = (token: string) => readLinks().find((l) => l.token === token) ?? null;
export const currentLinkFor = (requestId: string) => [...readLinks()].reverse().find((l) => l.renewal_request_id === requestId && (l.status === 'ACTIVE' || l.status === 'SIGNED')) ?? null;
const newToken = () => `rl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
/** Active, unexpired link → reuse token; expired → mark EXPIRED and issue a new token. */
function issueRenewalLink(r: RenewalRequest, src: SourceContract, at: string): RenewalLiveLink | null {
  const links = readLinks(); const curL = [...links].reverse().find((l) => l.renewal_request_id === r.id && l.status === 'ACTIVE');
  if (curL && !isExpired(curL)) return writeLinks(links.map((l) => (l === curL ? { ...l, snapshot: { request: r, contract: src } } : l))) ? curL : null;
  const exp = RENEWAL_LINK_VALID_DAYS == null ? null : new Date(Date.parse(at) + RENEWAL_LINK_VALID_DAYS * 864e5).toISOString();
  const rec: RenewalLiveLink = { token: newToken(), kind: 'RENEWAL', renewal_request_id: r.id, contract_id: r.source_contract_id, created_at: at, expires_at: exp, status: 'ACTIVE', signed_at: null, signer: null, snapshot: { request: r, contract: src } };
  return writeLinks([...links.map((l) => (l === curL ? { ...l, status: 'EXPIRED' as const } : l)), rec]) ? rec : null;
}
function setLinkStatus(requestId: string, status: LinkStatus, signedAt?: string | null, req?: RenewalRequest) {
  const links = readLinks(); let hit = false;
  const next = links.map((l) => { if (l.renewal_request_id !== requestId || l.status !== 'ACTIVE') return l; hit = true; return { ...l, status, signed_at: signedAt ?? l.signed_at, snapshot: req ? { ...l.snapshot, request: req } : l.snapshot }; });
  if (hit) writeLinks(next);
}
/** Customer signs on the link page (any tab). The originating tab picks it up via the storage event. */
export function signByToken(token: string, signer: string): { ok: true; link: RenewalLiveLink } | { ok: false; error: string } {
  const l = linkByToken(token); if (!l) return { ok: false, error: 'ไม่พบ link' };
  if (l.status !== 'ACTIVE' || isExpired(l)) return { ok: false, error: 'link นี้ใช้ลงนามไม่ได้' };
  const local = cur().requests.find((x) => x.id === l.renewal_request_id && x.status === 'LINK_SENT');
  if (local) { const o = signRequest(local.id); if (!o.ok) return o; }
  else { const at = nowIso(); const req = { ...l.snapshot.request, status: 'SIGNED' as const, signed_at: at, new_contract_id: `${l.contract_id}-R${l.renewal_request_id.slice(-4)}` }; setLinkStatus(l.renewal_request_id, 'SIGNED', at, req); }
  const links = readLinks(); writeLinks(links.map((x) => (x.token === token ? { ...x, signer } : x)));
  return { ok: true, link: linkByToken(token)! };
}
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => {
  if (e.key !== LINK_KEY) return;
  for (const l of readLinks()) if (l.status === 'SIGNED') { const r = cur().requests.find((x) => x.id === l.renewal_request_id && x.status === 'LINK_SENT'); if (r) signRequest(r.id); }
  version++; listeners.forEach((f) => f());
});
/** Demo seeds: every LINK_SENT / SIGNED request gets a matching RENEWAL link (deterministic token). */
function seedDemoLinks(s: State) {
  if (typeof localStorage === 'undefined') return;
  const links = readLinks().filter((l) => !l.token.startsWith('demo-'));
  for (const r of s.requests) if (r.status === 'LINK_SENT' || r.status === 'SIGNED') {
    const src = [...SAMPLE_CONTRACTS, ...DEMO_CONTRACTS].find((c) => c.contract_id === r.source_contract_id); if (!src) continue;
    links.push({ token: `demo-${r.id.toLowerCase()}`, kind: 'RENEWAL', renewal_request_id: r.id, contract_id: r.source_contract_id, created_at: r.link_sent_at ?? DEMO_NOW, expires_at: null, status: r.status === 'SIGNED' ? 'SIGNED' : 'ACTIVE', signed_at: r.signed_at, signer: r.status === 'SIGNED' ? src.signatory : null, snapshot: { request: r, contract: src } });
  }
  try { localStorage.setItem(LINK_KEY, JSON.stringify(links)); } catch { /* quota */ }
}
