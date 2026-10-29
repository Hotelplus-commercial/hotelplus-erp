/* Tab R1 §11 — DEMO additions only (used only while DEMO is on). Clock = 28 Oct 2026 (same as Header R2).
 * Reads the Header R2 demo contracts as they are and ADDS new contracts / names / reasons / signal inputs /
 * snapshots / tickets / AE labels beside them — no existing demo entry is edited. */
import { HEADER_DEMO_NOW, headerDemoPortfolio } from './ps-header-r2-demo';
import type { ChurnRow, HRow, PortfolioContract, PriceRow } from './ps-header-r2';
import type { L0Status, L0Ticket } from './tickets-l0';
import { aeNameTh } from './ps-glossary';
import { addDays, evaluateSignals, tierOf, type AeLabel, type BaseContract, type EndReason, type ServiceContract, type SignalInputs, type Svc, type TabR1Data, type Tier, type TierSnapshot } from './contract-tab-r1';

export const TAB_R1_DEMO_NOW = HEADER_DEMO_NOW;

export type { BaseContract, TabR1Data } from './contract-tab-r1';

/* ---------- additions ---------- */
type Add = { id: string; en: string; th: string; svc: Svc; start: string; end: string | null; reason: EndReason | null; renewal_of?: string; ae: string; orm: string | null; marcom: string | null; sku: PortfolioContract['sku']; quota?: PortfolioContract['quota']; price?: Omit<PriceRow, 'contract_id' | 'effective_from' | 'effective_to'> };
const ADDED: Add[] = [
  { id: 'R1-O1', en: 'Riverside Lodge', th: 'ริเวอร์ไซด์ ลอดจ์', svc: 'ORM', start: '2026-10-06', end: null, reason: null, ae: 'AE003-ต้น', orm: 'C', marcom: null, sku: { flat: true }, price: { fee_amount: 15000, commission_pct: null } },
  { id: 'R1-O2', en: 'Dusit Pool Villa', th: 'ดุสิต พูล วิลล่า', svc: 'ORM', start: '2025-09-15', end: null, reason: null, ae: 'AE002-มายด์', orm: 'A', marcom: null, sku: { commission: true }, price: { fee_amount: null, commission_pct: 12 } },
  { id: 'R1-M1', en: 'Siam Loft', th: 'สยาม ลอฟท์', svc: 'Marcom', start: '2026-10-08', end: null, reason: null, ae: 'AE001-ดาว', orm: null, marcom: 'แนน', sku: { content: true }, quota: { content: 8 } },
  { id: 'R1-O3', en: 'Chaam Resort', th: 'ชะอำ เปี่ยมสุข', svc: 'ORM', start: '2026-01-12', end: '2026-06-20', reason: 'EARLY_TERMINATION', ae: 'AE001-ดาว', orm: 'B', marcom: null, sku: { flat: true } },
  { id: 'R1-O4', en: 'Chaba Grand', th: 'ชบา แกรนด์', svc: 'ORM', start: '2025-11-20', end: '2026-02-27', reason: 'NOT_RENEWED', ae: 'AE003-ต้น', orm: 'D', marcom: null, sku: { flat: true } },
  { id: 'R1-M2', en: 'Teeneedee Hotel', th: 'ที่นี่ดี โฮเทล', svc: 'Marcom', start: '2025-12-03', end: '2026-04-30', reason: 'NOT_RENEWED', ae: 'AE003-ต้น', orm: null, marcom: 'บิว', sku: { content: true } },
  { id: 'R1-M3', en: 'Anjali', th: 'อัญชลี', svc: 'Marcom', start: '2025-06-01', end: '2026-03-01', reason: 'RENEWAL', ae: 'AE002-มายด์', orm: null, marcom: 'แนน', sku: { content: true } },
  { id: 'R1-M4', en: 'Anjali', th: 'อัญชลี', svc: 'Marcom', start: '2026-03-01', end: '2026-08-31', reason: 'NOT_RENEWED', renewal_of: 'R1-M3', ae: 'AE002-มายด์', orm: null, marcom: 'แนน', sku: { content: true } },
];
/** EN names for the existing Header R2 demo hotels (search ไทย / EN). */
const NAME_EN: Record<string, string> = {
  'บ้านสวนริมน้ำ รีสอร์ท': 'Baan Suan Rim Nam Resort', 'ภูผา บูทีค': 'Phupha Boutique', 'ทะเลใส พูลวิลล่า': 'Talay Sai Pool Villa',
  'ลานนา เฮอริเทจ': 'Lanna Heritage', 'สายลม บีช โฮเทล': 'Sailom Beach Hotel', 'เดอะ ซีวิว หัวหิน': 'The Seaview Hua Hin',
  'นาคา ฮิลล์': 'Naka Hill', 'ริมโขง ลอดจ์': 'Rim Khong Lodge', 'ดอยคำ เฮาส์': 'Doi Kham House', 'ชายหาด อินน์': 'Chaihad Inn',
};
/** End reasons for the existing Header R2 demo contracts that ended (added beside them). */
const R2_REASON: Record<string, EndReason> = { 'R2-O7': 'EARLY_TERMINATION', 'R2-M5': 'NOT_RENEWED', 'R2-O8': 'NOT_RENEWED', 'R2-O9': 'EARLY_TERMINATION', 'R2-M6': 'NOT_RENEWED' };
/** Scheduled term ends (≤ 60 days: R1-O2 · R2-O4). */
const TERM_END: Record<string, string> = {
  'R2-O1': '2027-02-28', 'R2-O2': '2027-04-30', 'R2-O3': '2027-05-31', 'R2-O4': '2026-12-15', 'R2-O5': '2027-09-29', 'R2-O6': '2027-08-31',
  'R2-M1': '2027-03-31', 'R2-M2': '2027-06-30', 'R2-M3': '2027-09-30', 'R2-M4': '2027-09-29', 'R1-O1': '2027-10-05', 'R1-O2': '2026-11-30', 'R1-M1': '2027-10-07',
};
/** System-signal source values (demo data source; live reads the real projections). */
const INPUTS: Record<string, SignalInputs> = {
  'R2-O1': { overdue_this: true, overdue_other: false, grade: 'C', value_ratio: 4.1, missed_meetings_3m: 0, single_service: false },
  'R2-M1': { overdue_this: false, overdue_other: true, grade: 'C', missed_meetings_3m: 0, single_service: false },
  'R2-O2': { overdue_this: false, overdue_other: false, grade: 'A', value_ratio: 7.2, missed_meetings_3m: 0, single_service: false },
  'R2-M3': { overdue_this: false, overdue_other: false, grade: 'A', single_service: false },
  'R2-O3': { overdue_this: false, overdue_other: false, grade: 'B', value_ratio: 7.0, missed_meetings_3m: 0, single_service: true },
  'R2-O4': { overdue_this: false, overdue_other: false, grade: 'B', value_ratio: 3.5, missed_meetings_3m: 1, single_service: true },
  'R2-O5': { overdue_this: false, overdue_other: false, grade: 'B', pi_incomplete: true, single_service: true },
  'R2-O6': { overdue_this: false, overdue_other: true, grade: 'C', value_ratio: 5.0, single_service: false },
  'R2-M2': { overdue_this: true, overdue_other: false, grade: 'C', survey2_value: 5, single_service: false },
  'R2-M4': { overdue_this: false, overdue_other: false, grade: 'A', single_service: true },
  'R1-O1': {}, 'R1-M1': {},
  'R1-O2': { overdue_this: false, overdue_other: false, grade: 'B', value_ratio: 2.1, missed_meetings_3m: 2, single_service: true },
};

const hid = (a: Add) => `R1-${a.en}`;
const activeOn = (start: string, end: string | null, day: string) => start <= day && (!end || end > day);
const monthStarts = (from: string, to: string) => { const out: string[] = []; let d = new Date(from + 'T00:00:00Z'); while (d.toISOString().slice(0, 10) <= to) { out.push(d.toISOString().slice(0, 10)); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } return out; };
const ownRow = (a: Add): HRow => ({ service: a.svc, hotel_id: hid(a), hotel_name: a.th, ae: a.ae, orm: a.orm, marcom: a.marcom });

/** Header “ใช้งาน” additions (merged into the header demo feed so the header and cards ① / ⑦ agree). */
export function tabR1HeaderActive(): (HRow & { hotel_id: string })[] {
  return ADDED.filter((a) => activeOn(a.start, a.end, TAB_R1_DEMO_NOW)).map((a) => ({ ...ownRow(a), hotel_id: hid(a) }));
}
/** Header “หลุด” additions — same month rows as the header fixture; renewal hand-over / pause never count as out. */
export function tabR1HeaderChurn(): ChurnRow[] {
  const out: ChurnRow[] = [];
  for (const m of monthStarts('2026-01-01', TAB_R1_DEMO_NOW)) for (const a of ADDED) {
    const next = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 10);
    const base = a.start <= m && (!a.end || a.end >= m) ? 1 : 0;
    const ends = a.end && a.end >= m && a.end < next && (a.reason === 'NOT_RENEWED' || a.reason === 'EARLY_TERMINATION') ? 1 : 0;
    if (base || ends) out.push({ ...ownRow(a), month: m, base, out: ends, out_date: ends ? a.end : null });
  }
  return out;
}
/** Active Portfolio additions (active contracts only). */
export function tabR1HeaderPortfolio(): { contracts: PortfolioContract[]; prices: PriceRow[] } {
  const act = ADDED.filter((a) => activeOn(a.start, a.end, TAB_R1_DEMO_NOW));
  return {
    contracts: act.map((a) => ({ ...ownRow(a), contract_id: a.id, hotel_id: hid(a), start: a.start, end: a.end, sku: a.sku, quota: a.quota })),
    prices: act.filter((a) => a.price).map((a) => ({ contract_id: a.id, ...a.price!, effective_from: a.start, effective_to: null })),
  };
}

/** Card ① demo contracts = Header R2 demo contracts (+ reasons) + additions. */
export function tabR1DemoFlow(): ServiceContract[] {
  const r2 = headerDemoPortfolio().contracts.map((c): ServiceContract => ({ contract_id: c.contract_id, hotel_id: c.hotel_id, hotel_name: c.hotel_name ?? c.hotel_id, service: c.service, start: c.start, end: c.end, end_reason: c.end ? R2_REASON[c.contract_id] ?? 'NOT_RENEWED' : null, renewal_of: null }));
  const add = ADDED.map((a): ServiceContract => ({ contract_id: a.id, hotel_id: hid(a), hotel_name: a.th, service: a.svc, start: a.start, end: a.end, end_reason: a.reason, renewal_of: a.renewal_of ?? null }));
  return [...r2, ...add];
}
export function tabR1DemoBase(): BaseContract[] {
  const r2 = headerDemoPortfolio().contracts.filter((c) => activeOn(c.start, c.end, TAB_R1_DEMO_NOW)).map((c): BaseContract => ({
    contract_id: c.contract_id, hotel_id: c.hotel_id, hotel_name: c.hotel_name ?? c.hotel_id, hotel_name_th: c.hotel_name ?? null, hotel_name_en: NAME_EN[c.hotel_name ?? ''] ?? null,
    service: c.service, ae: c.ae, orm_team: c.orm ? c.orm.replace(/^Team\s+/, '') : null, marcom: c.marcom, start: c.start, term_end: TERM_END[c.contract_id] ?? null, inputs: INPUTS[c.contract_id] ?? {},
  }));
  const add = ADDED.filter((a) => activeOn(a.start, a.end, TAB_R1_DEMO_NOW)).map((a): BaseContract => ({
    contract_id: a.id, hotel_id: hid(a), hotel_name: a.th, hotel_name_th: a.th, hotel_name_en: a.en, service: a.svc, ae: a.ae, orm_team: a.orm, marcom: a.marcom,
    start: a.start, term_end: TERM_END[a.id] ?? null, inputs: INPUTS[a.id] ?? {},
  }));
  return [...r2, ...add];
}

/* ---------- tickets / AE labels / snapshots ---------- */
const tk = (id: string, b: BaseContract, to: { member_id: string; display: string; role: string }, dept: L0Ticket['target_dept'], labels: string[], status: L0Status, at: string): L0Ticket => ({
  ticket_id: id, type: 'CONTRACT_SIGNAL', source_app: 'PS_DASHBOARD', created_by: 'PM', target_dept: dept,
  subject_ref: { hotel_id: b.hotel_id, hotel_name: b.hotel_name, gap_service: b.service, service_line: b.service, contract_id: b.contract_id, service: b.service },
  payload: { readiness_tier: '', chips: [], note: '', kind: 'NEW', labels, batch_id: `B-${id}`, contract_id: b.contract_id },
  assignee: to, status, created_at: at, revision: status === 'NEW' ? 0 : 1,
  audit: [{ at, by: 'PM', from_status: null, to_status: 'NEW' }, ...(status === 'NEW' ? [] : [{ at, by: dept, from_status: 'NEW' as L0Status, to_status: status }])],
});
const aeTo = (b: BaseContract) => ({ member_id: b.ae ?? 'AE', display: `AE · ${aeNameTh(b.ae)}`, role: 'AE' });
export function tabR1DemoTickets(base = tabR1DemoBase()): L0Ticket[] {
  const by = (id: string) => base.find((b) => b.contract_id === id)!;
  return [
    tk('TKT-000901', by('R1-O2'), { member_id: 'ORM:A', display: 'ORM ทีม A', role: 'ORM' }, 'ORM', ['MEETING_IRREGULAR'], 'IN_PROGRESS', '2026-10-20T03:00:00.000Z'),
    tk('TKT-000902', by('R1-O2'), aeTo(by('R1-O2')), 'PS', ['PRICE_HIGH'], 'NEW', '2026-10-22T03:00:00.000Z'),
    tk('TKT-000903', by('R2-M2'), aeTo(by('R2-M2')), 'PS', ['OVERDUE'], 'ACK', '2026-10-18T03:00:00.000Z'),
    tk('TKT-000904', by('R2-M4'), aeTo(by('R2-M4')), 'PS', ['COMPETITOR_CHEAPER'], 'DONE', '2026-10-12T04:00:00.000Z'),
    tk('TKT-000905', by('R2-M3'), { member_id: 'BDM', display: 'BDM', role: 'BDM' }, 'BD', ['GROUP_HOTELS'], 'DONE', '2026-10-15T04:00:00.000Z'),
  ];
}
export function tabR1DemoLabels(base = tabR1DemoBase()): AeLabel[] {
  const by = (id: string) => base.find((b) => b.contract_id === id)!;
  const m4 = by('R2-M4');
  return [
    { id: 'TKT-000904-L1', contract_id: 'R2-M4', label_key: 'COMPETITOR_CHEAPER', source: 'AE', created_by: { member_id: m4.ae ?? 'AE', display: aeNameTh(m4.ae), role: 'AE' }, created_at: '2026-10-12T04:00:00.000Z', ticket_id: 'TKT-000904', batch_id: 'B-TKT-000904' },
    { id: 'TKT-000905-L1', contract_id: 'R2-M3', label_key: 'GROUP_HOTELS', source: 'AE', created_by: { member_id: 'PM001-Alex', display: 'Alex (PM)', role: 'PM' }, created_at: '2026-10-15T04:00:00.000Z', ticket_id: 'TKT-000905', batch_id: 'B-TKT-000905' },
  ];
}
/** 31 days of tier history: R2-O4 got worse (G → A), R2-O2 got better (A → G), R1-O2 worsened yesterday → today (A → R). */
export function tabR1DemoSnapshots(base = tabR1DemoBase()): TierSnapshot[] {
  const out: TierSnapshot[] = [];
  for (const b of base) {
    const { tier, bad } = tierOf(evaluateSignals(b.service, b.inputs).signals);
    for (let back = 1; back <= 31; back++) {
      const date = addDays(TAB_R1_DEMO_NOW, -back);
      if (b.start && date < b.start.slice(0, 10)) continue;
      let t: Tier = tier;
      if (b.contract_id === 'R2-O4' && back >= 18) t = 'G';
      if (b.contract_id === 'R2-O2' && back >= 13) t = 'A';
      if (b.contract_id === 'R1-O2') t = 'A';
      out.push({ contract_id: b.contract_id, date, tier: t, bad_count: t === tier ? bad : t === 'G' ? 0 : 1 });
    }
  }
  return out;
}
export function tabR1Demo(): TabR1Data {
  const base = tabR1DemoBase();
  const count = (s: Svc) => base.filter((b) => b.service === s).length;
  return { today: TAB_R1_DEMO_NOW, demo: true, flow: tabR1DemoFlow(), activeToday: { ORM: count('ORM'), Marcom: count('Marcom') }, base, seedTickets: tabR1DemoTickets(base) };
}

/** DEMO-only checkbox “จำลองพอร์ต 120 สัญญา”: ~108 generated rows, in memory only (never stored). */
export function tabR1SimBase(n = 108): BaseContract[] {
  const AES = ['AE001-ดาว', 'AE002-มายด์', 'AE003-ต้น'], TEAMS = ['A', 'B', 'C', 'D', 'E', 'RE_ACTIVE'], MK = ['แนน', 'บิว'];
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => {
    const svc: Svc = i % 3 === 2 ? 'Marcom' : 'ORM';
    const start = addDays(TAB_R1_DEMO_NOW, -Math.floor(20 + rnd() * 900));
    const r = rnd();
    const inputs: SignalInputs = { overdue_this: r < 0.08, overdue_other: r >= 0.08 && r < 0.16, grade: r < 0.16 ? 'C' : rnd() < 0.5 ? 'A' : 'B', value_ratio: svc === 'ORM' ? Math.round((1.5 + rnd() * 7) * 10) / 10 : null, missed_meetings_3m: rnd() < 0.2 ? 1 : 0, single_service: rnd() < 0.5, pi_incomplete: rnd() < 0.07 };
    const no = String(i + 1).padStart(3, '0');
    return { contract_id: `SIM-${no}`, hotel_id: `SIM-H${no}`, hotel_name: `โรงแรมจำลอง ${no}`, hotel_name_th: `โรงแรมจำลอง ${no}`, hotel_name_en: `Sim Hotel ${no}`, service: svc, ae: AES[i % 3]!, orm_team: svc === 'ORM' ? TEAMS[i % 6]! : null, marcom: svc === 'Marcom' ? MK[i % 2]! : null, start, term_end: addDays(TAB_R1_DEMO_NOW, Math.floor(5 + rnd() * 400)), inputs };
  });
}
