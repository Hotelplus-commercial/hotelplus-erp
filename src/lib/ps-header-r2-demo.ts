/* Header R2 §8 — demo fixture used only by the new scorecard + Active Portfolio while DEMO is on.
 * Separate from the existing PS spine (30 Sep 2026) and BD-AC demo (17 Oct 2026); clock = 28 Oct 2026.
 * Month mode (ต.ค. 2569 vs ก.ย. 2569) reproduces the spec table exactly; quarter / year differ. */
import type { ChurnRow, GradeRow, HRow, JourneyInput, OnboardRow, PortfolioContract, PriceRow, ScoreRow, Svc } from './ps-header-r2';
import type { MarcomRecord } from './marcom-app-source';

export const HEADER_DEMO_NOW = '2026-10-28';
const own = (service: Svc, i: number): HRow => service === 'ORM'
  ? { service, ae: ['AE001-ดาว', 'AE002-มายด์', 'AE003-ต้น'][i % 3]!, orm: ['Team A', 'Team B'][i % 2]!, marcom: null }
  : { service, ae: ['AE002-มายด์', 'AE001-ดาว', 'AE003-ต้น'][i % 3]!, orm: null, marcom: ['แนน', 'บิว'][i % 2]! };
const back = (days: number, from = HEADER_DEMO_NOW) => new Date(Date.parse(from) - days * 864e5).toISOString().slice(0, 10);
const plus = (date: string, days: number) => new Date(Date.parse(date) + days * 864e5).toISOString().slice(0, 10);

/** Go Live durations (days) per month; dates spread from the 2nd so every point sits inside 1–28. */
const GOLIVE: Record<Svc, Record<string, number[]>> = {
  ORM: {
    '2026-10': [10, 18, 18, 18, 12, 9, 17, 7, 20, 27, 18, 11, 10, 24],
    '2026-09': [21, 21, 21, 15, 19, 25, 30, 14, 22, 16],
    '2026-08': [16, 16, 23, 19], '2026-07': [22, 22, 22, 18, 26, 14], '2026-04': [15, 15, 20], '2026-02': [19, 24],
  },
  Marcom: {
    '2026-10': [21, 21, 21, 15, 19, 25, 30, 14],
    '2026-09': [17, 17, 20, 24, 13],
    '2026-08': [19, 19, 28], '2026-07': [26, 26, 31, 18], '2026-05': [23, 23], '2026-03': [20, 27],
  },
};
const QUEUE: Record<Svc, number[]> = { ORM: [12, 12, 12, 5, 20, 30], Marcom: [25, 25, 40] };

/** Service contracts (start / end) — drive ใช้งาน, หลุด and Active Portfolio consistently. */
type Spec = { id: string; hotel: string; svc: Svc; start: string; end: string | null; sku: PortfolioContract['sku']; quota?: PortfolioContract['quota'] };
const CONTRACTS: Spec[] = [
  { id: 'R2-O1', hotel: 'บ้านสวนริมน้ำ รีสอร์ท', svc: 'ORM', start: '2025-03-01', end: null, sku: { flat: true } },
  { id: 'R2-O2', hotel: 'ภูผา บูทีค', svc: 'ORM', start: '2025-05-01', end: null, sku: { flat: true } },
  { id: 'R2-O3', hotel: 'ทะเลใส พูลวิลล่า', svc: 'ORM', start: '2025-06-01', end: null, sku: { flat: true, commission: true } },
  { id: 'R2-O4', hotel: 'ลานนา เฮอริเทจ', svc: 'ORM', start: '2025-08-01', end: null, sku: { flat: true } },
  { id: 'R2-O5', hotel: 'สายลม บีช โฮเทล', svc: 'ORM', start: '2026-09-30', end: null, sku: { commission: true } },
  { id: 'R2-O6', hotel: 'เดอะ ซีวิว หัวหิน', svc: 'ORM', start: '2025-09-01', end: null, sku: { commission: true } },
  { id: 'R2-O7', hotel: 'ริมโขง ลอดจ์', svc: 'ORM', start: '2025-01-01', end: '2026-10-10', sku: { flat: true } },
  { id: 'R2-O8', hotel: 'ดอยคำ เฮาส์', svc: 'ORM', start: '2024-11-01', end: '2026-07-15', sku: { flat: true } },
  { id: 'R2-O9', hotel: 'ชายหาด อินน์', svc: 'ORM', start: '2025-02-01', end: '2026-08-20', sku: { commission: true } },
  { id: 'R2-M1', hotel: 'บ้านสวนริมน้ำ รีสอร์ท', svc: 'Marcom', start: '2025-04-01', end: null, sku: { content: true, kol: true }, quota: { content: 12, kol: 4 } },
  { id: 'R2-M2', hotel: 'เดอะ ซีวิว หัวหิน', svc: 'Marcom', start: '2025-07-01', end: null, sku: { content: true, ads: true }, quota: { content: 12 } },
  { id: 'R2-M3', hotel: 'ภูผา บูทีค', svc: 'Marcom', start: '2025-10-01', end: null, sku: { content: true }, quota: { content: 12 } },
  { id: 'R2-M4', hotel: 'นาคา ฮิลล์', svc: 'Marcom', start: '2026-09-30', end: null, sku: { ads: true, kol: true }, quota: { kol: 4 } },
  { id: 'R2-M5', hotel: 'ริมโขง ลอดจ์', svc: 'Marcom', start: '2025-03-01', end: '2026-10-05', sku: { kol: true }, quota: { kol: 10 } },
  { id: 'R2-M6', hotel: 'ดอยคำ เฮาส์', svc: 'Marcom', start: '2025-01-01', end: '2026-09-12', sku: { content: true }, quota: { content: 10 } },
];
const PRICES: PriceRow[] = [
  { contract_id: 'R2-O1', fee_amount: 15000, commission_pct: null, effective_from: '2025-03-01', effective_to: null },
  { contract_id: 'R2-O2', fee_amount: 16000, commission_pct: null, effective_from: '2025-05-01', effective_to: '2026-10-01' },
  { contract_id: 'R2-O2', fee_amount: 18000, commission_pct: null, effective_from: '2026-10-01', effective_to: null },
  { contract_id: 'R2-O3', fee_amount: 20000, commission_pct: 13, effective_from: '2025-06-01', effective_to: '2026-10-01' },
  { contract_id: 'R2-O3', fee_amount: 20000, commission_pct: 12, effective_from: '2026-10-01', effective_to: null },
  { contract_id: 'R2-O4', fee_amount: 21000, commission_pct: null, effective_from: '2025-08-01', effective_to: null },
  { contract_id: 'R2-O5', fee_amount: null, commission_pct: 12.5, effective_from: '2026-09-30', effective_to: null },
  { contract_id: 'R2-O6', fee_amount: null, commission_pct: 13, effective_from: '2025-09-01', effective_to: null },
  { contract_id: 'R2-O7', fee_amount: 14500, commission_pct: null, effective_from: '2025-01-01', effective_to: '2026-10-10' },
  { contract_id: 'R2-O8', fee_amount: 13000, commission_pct: null, effective_from: '2024-11-01', effective_to: '2026-07-15' },
  { contract_id: 'R2-O9', fee_amount: null, commission_pct: 14, effective_from: '2025-02-01', effective_to: '2026-08-20' },
];
const SCORES: Record<Svc, Record<string, number[]>> = {
  ORM: { '2026-10': [9, 9, 9, 9, 9, 8, 10, 7], '2026-09': [9, 9, 8, 10], '2026-07': [8, 8, 8, 9, 7], '2026-08': [10, 9, 8] },
  Marcom: { '2026-10': [7, 7, 7, 5, 4, 8], '2026-09': [8, 8, 8, 9, 6], '2026-07': [6, 6, 9, 3], '2026-08': [9, 9, 7] },
};

const monthStarts = (from: string, to: string) => { const out: string[] = []; let d = new Date(from + 'T00:00:00Z'); while (d.toISOString().slice(0, 10) <= to) { out.push(d.toISOString().slice(0, 10)); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } return out; };

export function headerDemoInput(): JourneyInput {
  const onboard: OnboardRow[] = [];
  for (const svc of ['ORM', 'Marcom'] as Svc[]) {
    QUEUE[svc].forEach((d, i) => onboard.push({ ...own(svc, i), hotel_name: `${svc} คิว ${i + 1}`, created_at: back(d), go_live_at: null }));
    for (const [m, list] of Object.entries(GOLIVE[svc])) list.forEach((days, i) => { const live = `${m}-${String(2 + (i % 26)).padStart(2, '0')}`; onboard.push({ ...own(svc, i), hotel_name: `${svc} live ${m} ${i + 1}`, created_at: back(days, live), go_live_at: live }); });
  }
  const specs = CONTRACTS.map((c, i) => ({ ...c, owner: own(c.svc, i) }));
  const active = specs.filter((c) => c.start <= HEADER_DEMO_NOW && (!c.end || c.end > HEADER_DEMO_NOW)).map((c) => ({ ...c.owner, hotel_id: `R2-${c.hotel}`, hotel_name: c.hotel }));
  const churn: ChurnRow[] = [];
  for (const m of monthStarts('2026-01-01', HEADER_DEMO_NOW)) for (const c of specs) {
    const next = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 10);
    const base = c.start <= m && (!c.end || c.end >= m) ? 1 : 0;
    const out = c.end && c.end >= m && c.end < next ? 1 : 0;
    if (base || out) churn.push({ ...c.owner, hotel_name: c.hotel, month: m, base, out, out_date: out ? c.end : null });
  }
  const scores: ScoreRow[] = [];
  for (const svc of ['ORM', 'Marcom'] as Svc[]) for (const [m, list] of Object.entries(SCORES[svc])) list.forEach((score, i) => scores.push({ ...own(svc, i), date: `${m}-${String(3 + i * 2).padStart(2, '0')}`, score }));
  const grades: GradeRow[] = [
    { ...own('ORM', 0), hotel_name: 'บ้านสวนริมน้ำ รีสอร์ท', ae_name: 'ดาว', grade: 'C', overdue: 1 },
    { ...own('ORM', 1), hotel_name: 'ภูผา บูทีค', ae_name: 'มายด์', grade: 'A', overdue: 0 },
    { ...own('ORM', 2), hotel_name: 'ทะเลใส พูลวิลล่า', ae_name: 'ต้น', grade: 'B', overdue: 0 },
    { ...own('Marcom', 0), hotel_name: 'เดอะ ซีวิว หัวหิน', ae_name: 'มายด์', grade: 'C', overdue: 1 },
    { ...own('Marcom', 1), hotel_name: 'ภูผา บูทีค', ae_name: 'ดาว', grade: 'A', overdue: 0 },
  ];
  const upcoming: HRow[] = [
    ...Array.from({ length: 9 }, (_, i) => ({ service: 'ORM' as const, hotel_name: `ดีล ORM ${i + 1}`, ae: null, orm: null, marcom: null })),
    ...Array.from({ length: 6 }, (_, i) => ({ service: 'Marcom' as const, hotel_name: `ดีล Marcom ${i + 1}`, ae: null, orm: null, marcom: null })),
  ];
  return { today: HEADER_DEMO_NOW, upcoming, onboard, active, churn, scores, grades: { month: '2026-09', rows: grades } };
}

export function headerDemoPortfolio(): { contracts: PortfolioContract[]; prices: PriceRow[] } {
  return {
    contracts: CONTRACTS.map((c, i) => ({ ...own(c.svc, i), contract_id: c.id, hotel_id: `R2-${c.hotel}`, hotel_name: c.hotel, start: c.start, end: c.end, sku: c.sku, quota: c.quota })),
    prices: PRICES,
  };
}

/** Marcom App rows (DEMO only): one record per contract per month on the 15th. */
export function headerDemoMarcom(): { posts: MarcomRecord[]; ads: MarcomRecord[]; kol: MarcomRecord[] } {
  const posts: MarcomRecord[] = [], ads: MarcomRecord[] = [], kol: MarcomRecord[] = [];
  for (const m of monthStarts('2026-01-01', HEADER_DEMO_NOW).map((d) => d.slice(0, 7))) {
    const day = `${m}-15`;
    const oct = m === '2026-10', sep = m === '2026-09';
    for (const id of ['R2-M1', 'R2-M2', 'R2-M3']) posts.push({ contract_id: id, date: day, qty: oct ? 10 : sep ? 12 : 11 });
    posts.push({ contract_id: 'R2-M6', date: day, qty: m < '2026-09' ? 9 : 0 });
    ads.push({ contract_id: 'R2-M2', date: day, qty: oct ? 25000 : sep ? 22000 : 20000 });
    if (oct) ads.push({ contract_id: 'R2-M4', date: day, qty: 25000 });
    kol.push({ contract_id: 'R2-M1', date: day, qty: oct ? 3 : sep ? 4 : 3 });
    if (oct) kol.push({ contract_id: 'R2-M4', date: day, qty: 3 });
    if (m <= '2026-09') kol.push({ contract_id: 'R2-M5', date: day, qty: sep ? 7 : 6 });
  }
  return { posts, ads, kol };
}
export { plus as _plus };
