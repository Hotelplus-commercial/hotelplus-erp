/* Bundled preview demo fixture — Demo Fixture Spec v1.0. Remove before production release.
 * Raw entities are derived into v_ps_*-shaped rows here (view layer only); nothing is written to cloud or browser. */
import { PS_VIEWS, type PsReport, type PsReportRow, type PsView } from './ps-dashboard-types';
import type { ContractLifecycle } from './contract-lifecycle';
import type { HotelProfile } from './hotel-store';
import type { OnboardingCard } from './ps-servicing';
import type { GlobalFilter } from './ps-dashboard-global';
import { matchesBook } from './ps-dashboard-global';
import { accountHealthOf, DEMO_VALUE_RATIO_MIN, roiSeries, trailingValueRatio } from './account-health';
import { crossSellRow, repricingRow, EXPANSION_DEMO, type RevenueProfile } from './expansion';

export const DEMO_ENABLED = true; // Preview-safe; default OFF is controlled by React state + URL.
export const DEMO_NOW = '2026-09-30T00:00:00.000Z';

type L = 'ORM' | 'Marcom';
const C: [string, string, L, 'ACTIVE' | 'INACTIVE', string, string, string | null, string][] = [
  ['C01', 'Chaam Peumsuk', 'ORM', 'ACTIVE', '2025-01-10', '2026-12-31', null, 'Nont'],
  ['C02', 'Baan Talay', 'ORM', 'ACTIVE', '2024-06-01', '2026-10-15', null, 'Fern'],
  ['C03', 'Sea Breeze', 'ORM', 'INACTIVE', '2024-03-01', '2026-09-20', '2026-09-20', 'Boss'],
  ['C04', 'Seefah', 'ORM', 'ACTIVE', '2025-08-01', '2027-07-31', null, 'Nont'],
  ['C05', 'Anjali', 'Marcom', 'ACTIVE', '2023-02-01', '2027-01-31', null, 'Fern'],
  ['C06', 'Baan Suan', 'Marcom', 'ACTIVE', '2025-05-01', '2026-12-15', null, 'Boss'],
  ['C07', 'Chaba Grand', 'ORM', 'ACTIVE', '2025-03-01', '2026-12-31', null, 'Nont'],
  ['C08', 'Chaba Grand', 'Marcom', 'ACTIVE', '2025-03-01', '2026-12-31', null, 'Nont'],
  ['C09', 'Dusit Pool Villa', 'ORM', 'ACTIVE', '2024-11-01', '2026-11-30', null, 'Fern'],
  ['C10', 'Dusit Pool Villa', 'Marcom', 'INACTIVE', '2025-06-01', '2026-09-10', '2026-09-10', 'Boss'],
  ['C11', 'Erawan Boutique', 'ORM', 'ACTIVE', '2026-09-05', '2028-09-04', null, 'Nont'],
  ['C12', 'Erawan Boutique', 'Marcom', 'ACTIVE', '2026-09-05', '2028-09-04', null, 'Nont'],
  ['C13', 'Baan Rim Nam', 'ORM', 'INACTIVE', '2024-01-01', '2025-12-31', '2025-12-31', 'Fern'],
  ['C14', 'Lanta Bay', 'Marcom', 'INACTIVE', '2023-07-01', '2025-06-30', '2025-06-30', 'Boss'],
];
const contracts = C.map(([id, hotel, line, status, start, end, inact, ae]) => ({ id, hotel, line, status, start, end, inact, ae }));
const NEW_PROPERTY: Record<string, string> = { C11: '2026-09-05', C12: '2026-09-05' }; // N11, N12 (in-flight)
// Finished cohort F-A…F-D: [created, go_live, line, ΣAE, ΣSpec, ΣORM, ΣMarcom, survey#1]
const FINISHED: [string, string, L, number, number, number | null, number | null, number][] = [
  ['2026-08-01', '2026-08-15', 'ORM', 6, 3, 9, null, 4],
  ['2026-08-05', '2026-08-25', 'ORM', 8, 4, 12, null, 5],
  ['2026-09-02', '2026-09-16', 'ORM', 5, 3, 8, null, 4],
  ['2026-09-01', '2026-09-21', 'Marcom', 7, 4, null, 13, 5],
];
const HISTORY_MONTHS = ['2025-07-01','2025-08-01','2025-09-01','2025-10-01','2025-11-01','2025-12-01','2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01'];
/** [month, median, p25, p75, n] — prior-year finished cohorts (no survey history). */
const COHORT_HISTORY: [string, number, number, number, number][] = [['2025-08-01',21,18,24,2],['2025-09-01',19,16,23,3],['2025-10-01',20,17,22,2],['2025-11-01',18,15,21,2],['2025-12-01',22,19,25,1],['2026-01-01',20,18,23,2],['2026-02-01',19,17,22,2],['2026-03-01',18,16,21,3],['2026-04-01',17,15,20,2],['2026-05-01',18,16,20,2],['2026-06-01',17,15,19,2],['2026-07-01',16,14,19,2]];
/** Prior renewal cycle (Sep 2025) — not owned by Nont so the owner-AND oracle is unchanged. */
const RENEWAL_HISTORY: [string, string, string, string][] = [['RH1', 'C05', '2025-09-08', 'RENEWED'], ['RH2', 'C09', '2025-09-18', 'RENEWED'], ['RH3', 'C14', '2025-09-22', 'NOT_RENEWED'], ['RH4', 'C06', '2025-09-26', 'LOST']];
const RENEWALS: [string, string, string, string][] = [['R1', 'C01', '2026-09-10', 'RENEWED'], ['R2', 'C02', '2026-09-15', 'RENEWED'], ['R3', 'C04', '2026-09-20', 'RENEWED'], ['R4', 'C05', '2026-09-25', 'NOT_RENEWED'], ['R5', 'C06', '2026-09-28', 'IN_PROGRESS']];
const SURVEY2: Record<string, [number, number]> = { 'Chaam Peumsuk': [5, 10], Seefah: [5, 9], 'Chaba Grand': [4, 9], 'Baan Suan': [4, 8], 'Dusit Pool Villa': [3, 5] };
const GRADES: Record<string, [string | null, string | null]> = { 'Chaam Peumsuk': ['A', 'A'], Seefah: ['A', 'A'], 'Erawan Boutique': [null, null], Anjali: ['C', 'C'], 'Baan Suan': ['B', 'B'], 'Baan Talay': ['B', 'B'], 'Dusit Pool Villa': ['C', 'C'], 'Chaba Grand': ['B', 'D'] };
/** Account Health 360 demo: ORM-commission revenue × fee × tier (closed months). Chaba Grand = compound; Chaam Peumsuk = healthy. */
const ROI_MONTHS = ['2026-03-01','2026-04-01','2026-05-01','2026-06-01','2026-07-01','2026-08-01'];
const ROI: Record<string, { rev: number[]; tier: string[]; fee: number; comm: number[] }> = {
  'Chaba Grand': { rev: [420000,410000,400000,360000,320000,280000], tier: ['B','B','A','A','A','A'], fee: 90000, comm: [42000,41000,40000,36000,32000,28000] },
  'Chaam Peumsuk': { rev: [500000,530000,560000,590000,620000,650000], tier: ['C','C','C','C','C','C'], fee: 50000, comm: [50000,53000,56000,59000,62000,65000] },
};
const WS2_INCOMPLETE = new Set(['Dusit Pool Villa', 'Baan Talay', 'Baan Suan']);
/** Expansion oracle: prime=Chaam Peumsuk · nurture=Seefah/Anjali · save-first=Dusit/Baan Talay · cadence=Baan Suan · signal=Chaam Peumsuk · declining=Chaba Grand · no-fixed=Dusit · pending=Seefah. */
const DEMO_PORTFOLIO_VR_MEDIAN = 3;
const REPRICE: [string, L, 'fixed' | 'commission', number | null, number | null, string | null, RevenueProfile, boolean | null][] = [
  ['Chaam Peumsuk', 'ORM', 'fixed', 50000, null, '2025-01-10', 'strong', true],
  ['Baan Suan', 'Marcom', 'fixed', 35000, null, '2024-05-01', 'stable', false],
  ['Chaba Grand', 'ORM', 'fixed', 90000, null, '2025-03-01', 'declining', false],
  ['Dusit Pool Villa', 'ORM', 'commission', null, null, null, 'moderate', false],
  ['Seefah', 'ORM', 'fixed', 40000, null, null, 'pending', null],
];

const day = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
const hid = (hotel: string) => 'DEMO-' + hotel.replace(/\s+/g, '-').toUpperCase();
const q = (v: number[], f: number) => { const s = [...v].sort((a, b) => a - b); const at = (s.length - 1) * f; const lo = s[Math.floor(at)] ?? 0, hi = s[Math.ceil(at)] ?? 0; return lo + (hi - lo) * (at - Math.floor(at)); };
const avg = (v: (number | null)[]) => { const x = v.filter((n): n is number => n != null); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };

export function buildDemoReport(filter?: GlobalFilter): PsReport {
  const now = DEMO_NOW.slice(0, 10);
  const views = Object.fromEntries(PS_VIEWS.map(v => [v, [] as PsReportRow[]])) as Record<PsView, PsReportRow[]>;
  views.v_ps_lifecycle_flow = contracts.map(c => ({ contract_id: c.id, hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, status: c.status, start_date: c.start, inactivated_at: c.inact, created_at: NEW_PROPERTY[c.id] ?? null }));
  // R1 §10: 12 extra months back (2025-07 … 2026-06) derived from the same contracts; existing months unchanged.
  for (const m of [...HISTORY_MONTHS, '2026-07-01', '2026-08-01', '2026-09-01']) {
    const next = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 10);
    for (const line of ['ORM', 'Marcom'] as L[]) {
      const cs = contracts.filter(c => c.line === line);
      for (const c of cs) views.v_ps_churn_monthly.push({ billing_period: m, service_line: line, hotel_id: hid(c.hotel), hotel_name: c.hotel, ae_owner_id: c.ae, active_at_start: c.start <= m && (!c.inact || c.inact >= m) ? 1 : 0, out_count: c.inact && c.inact >= m && c.inact < next ? 1 : 0 });
    }
  }
  views.v_ps_renewal = RENEWALS.flatMap(([rid, cid, due, outcome]) => { const c = contracts.find(x => x.id === cid); return c ? [{ renewal_id: rid, contract_id: cid, hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, renewal_due_date: due, outcome }] : []; });
  views.v_ps_contract_lifetime = contracts.map(c => ({ contract_id: c.id, hotel_id: hid(c.hotel), hotel_name: c.hotel, ae_owner_id: c.ae, service_line: c.line, status: c.status, end_date: c.end, age_days: c.status === 'INACTIVE' ? day(c.start, c.end) : day(c.start, now) }));
  for (const m of ['2026-08', '2026-09']) {
    const cs = FINISHED.filter(f => f[1].startsWith(m));
    const d = cs.map(f => day(f[0], f[1]));
    const sv = m === '2026-09' ? Object.values(SURVEY2) : [];
    views.v_ps_onboard_cohort.push({
      billing_period: m + '-01', service_line: null, median_days: q(d, .5), p25_days: q(d, .25), p75_days: q(d, .75),
      ae_days: avg(cs.map(f => f[3])), specialist_days: avg(cs.map(f => f[4])), orm_days: avg(cs.map(f => f[5])), marcom_days: avg(cs.map(f => f[6])), overall_days: avg(d),
      ae_sum: cs.reduce((s, f) => s + f[3], 0), ae_n: cs.length, specialist_sum: cs.reduce((s, f) => s + f[4], 0), specialist_n: cs.length,
      orm_sum: cs.reduce((s, f) => s + (f[5] ?? 0), 0), orm_n: cs.filter(f => f[5] != null).length, marcom_sum: cs.reduce((s, f) => s + (f[6] ?? 0), 0), marcom_n: cs.filter(f => f[6] != null).length,
      survey1_sum: cs.reduce((s, f) => s + f[7], 0), survey1_n: cs.length, survey2_sum: sv.reduce((s, x) => s + x[0], 0), survey2_n: sv.length,
      promoters: sv.filter(x => x[1] >= 9).length, detractors: sv.filter(x => x[1] <= 6).length, responses: sv.length,
    });
  }
  // R1 §10: on-board history cohorts (deterministic, prior year only) so "เดือนนี้ vs เดือนเดียวกันปีก่อน" has B data.
  for (const [m, med, p25, p75, n] of COHORT_HISTORY) views.v_ps_onboard_cohort.push({ billing_period: m, service_line: null, median_days: med, p25_days: p25, p75_days: p75, ae_n: n, specialist_n: n, survey1_n: 0, survey2_n: 0, responses: 0, promoters: 0, detractors: 0 });
  views.v_ps_onboard_cohort.sort((x, y) => String(x.billing_period).localeCompare(String(y.billing_period)));
  for (const [rid, cid, due, outcome] of RENEWAL_HISTORY) { const c = contracts.find(x => x.id === cid); if (c) views.v_ps_renewal.push({ renewal_id: rid, contract_id: cid, hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, renewal_due_date: due, outcome }); }
  const sv = Object.values(SURVEY2);
  views.v_ps_nps = Object.entries(SURVEY2).map(([hotel, scores]) => ({ billing_period: '2026-09-01', hotel_id: hid(hotel), hotel_name: hotel, ae_owner_id: contracts.find(c => c.hotel === hotel)?.ae ?? null, service_line: null, responses: 1, promoters: scores[1] >= 9 ? 1 : 0, detractors: scores[1] <= 6 ? 1 : 0 }));
  const active = contracts.filter(c => c.status === 'ACTIVE');
  const hotels = [...new Set(active.map(c => c.hotel))];
  views.v_ps_attach_rate = [{ service_line: null, active_hotels: hotels.length, attached_hotels: hotels.filter(h => active.filter(c => c.hotel === h).length >= 2).length }];
  views.v_ps_account_health = active.map(c => {
    const mine = active.filter(x => x.hotel === c.hotel);
    const [latest, worst] = GRADES[c.hotel] ?? [null, null];
    return { hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, status: c.status, latest_grade: latest, worst_grade: worst, survey2: SURVEY2[c.hotel]?.[0] ?? null, completeness: WS2_INCOMPLETE.has(c.hotel) ? 'incomplete' : 'complete', end_date: mine.map(x => x.end).sort()[0] ?? null, active_services: mine.length, has_orm_commission: !!ROI[c.hotel] };
  });
  views.v_ps_roi = Object.entries(ROI).flatMap(([hotel, r]) => ROI_MONTHS.map((period, i) => ({ hotel_id: hid(hotel), hotel_name: hotel, service_line: 'ORM', ae_owner_id: contracts.find(c => c.hotel === hotel)?.ae ?? null, period, revenue_thb: r.rev[i]!, fee_fixed_thb: r.fee, commission_thb: r.comm[i]!, value_ratio: Math.round(r.rev[i]! / (r.fee + r.comm[i]!) * 100) / 100, orm_tier: r.tier[i]!, achievement_pct: r.tier[i] === 'A' ? 55 : r.tier[i] === 'B' ? 80 : 105, portfolio_rev_median: null, portfolio_n: Object.keys(ROI).length })));
  // Expansion v1.0 — derived once from the same spine (health tier + ROI), consumed by both tracks.
  const clock = new Date(DEMO_NOW);
  const tierOf = (hotel: string) => { const rows = views.v_ps_account_health.filter(r => r.hotel_name === hotel); const first = rows[0] ?? {}; return accountHealthOf({ ...first, completeness: rows.some(r => r.completeness === 'incomplete') ? 'incomplete' : 'complete' }, { now: clock, roi: views.v_ps_roi, flow: views.v_ps_lifecycle_flow, ratioMin: DEMO_VALUE_RATIO_MIN }).tier; };
  const vr = (hotel: string) => trailingValueRatio(roiSeries(views.v_ps_roi, hid(hotel), clock));
  views.v_ps_crosssell = hotels.flatMap(h => { const mine = active.filter(c => c.hotel === h); const row = crossSellRow({ hotel_id: hid(h), hotel_name: h, ae_owner_id: mine[0]!.ae, owned: mine.map(c => c.line), health_tier: tierOf(h), grade: GRADES[h]?.[0] ?? null, survey: SURVEY2[h]?.[0] ?? null, onboard_complete: true, service_start: mine[0]!.start, tenure_start: mine[0]!.start, renewal_date: mine.map(c => c.end).sort()[0] ?? null, value_ratio: vr(h), portfolio_median: DEMO_PORTFOLIO_VR_MEDIAN, value_strong: false }, EXPANSION_DEMO, clock); return row ? [row] : []; });
  views.v_ps_repricing = REPRICE.flatMap(([h, line, model, fee, guar, hist, profile, under]) => { const c = active.find(x => x.hotel === h && x.line === line); if (!c) return []; const row = repricingRow({ hotel_id: hid(h), hotel_name: h, ae_owner_id: c.ae, service_line: line, billing_model: model, fee_fixed: fee, guarantee_fee: guar, price_history: hist ? [{ effective_date: hist, note: 'ปรับราคาล่าสุด (demo)' }] : null, revenue_profile: profile, underpriced: under, health_tier: tierOf(h), grade: GRADES[h]?.[0] ?? null, survey: SURVEY2[h]?.[0] ?? null }, EXPANSION_DEMO, clock); return row ? [row] : []; });
  if (filter) {
    for (const view of PS_VIEWS) if (view !== 'v_ps_attach_rate') views[view] = views[view].filter(row => matchesBook(row, filter, view === 'v_ps_lifecycle_flow' || view === 'v_ps_account_health'));
    const scopedActive = active.filter(c => matchesBook({ service_line: c.line, ae_owner_id: c.ae, hotel_id: hid(c.hotel), hotel_name: c.hotel, status: c.status }, filter, true));
    const ids = [...new Set(scopedActive.map(c => c.hotel))];
    views.v_ps_attach_rate = [{ service_line: filter.service === 'ALL' ? null : filter.service, active_hotels: ids.length, attached_hotels: ids.filter(h => scopedActive.filter(c => c.hotel === h).length >= 2).length }];
  }
  return { views, pending: [], demo: true, now: DEMO_NOW, wonMtd: 2 };
}

/** Data-access adapters: same contracts, no second seed and no provider writes. */
export function demoLifecycles(): ContractLifecycle[] {
  return contracts.map(c => ({ id: c.id, quote_id: c.id, contract_id: c.id, contract_service_line: c.line === 'ORM' ? 'ORM' : 'MARCOM', customer_id: hid(c.hotel), invoice_number: null, property_name: c.hotel, hotel_id: hid(c.hotel), hotel_name: c.hotel, customer_legal_name: c.hotel, service_line: c.line === 'ORM' ? 'ORM' : 'MARCOM', bd_owner_id: c.ae, current_stage: 11, live_link_token: null, live_link_sent_at: null, sent_to_ac_at: null, approved_at: NEW_PROPERTY[c.id] ?? c.start, send_contract_at: NEW_PROPERTY[c.id] ?? c.start, signed_at: NEW_PROPERTY[c.id] ?? c.start, payment_at: NEW_PROPERTY[c.id] ?? c.start, won_at: NEW_PROPERTY[c.id] ?? c.start, created_at: c.start, updated_at: c.start }));
}
/* ---------- AC Dashboard v2.0 demo fixture (§10) — A = Sep 26, B = Aug 26. ----------
 * Revenue: 155 billed hotels in Sep (odd N → half = 78), 150 in Aug (5 new in Sep),
 * 15 both-service hotels, 6 Active-unbilled, 2 hotels ≥ ฿100k, overlapping "Sala" names.
 * Debtors: all 4 collection statuses + PAUSED + not-yet-due, one customer with 3 hotels.
 * Grades: 6 periods, Sep still open (no D). Aggregates are derived from the debtor rows
 * so I1–I7 hold by construction. */
const AC_PERIODS = ['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'];
const AC_NAME_A = ['Sala', 'Baan', 'The', 'Grand', 'Villa', 'Anada', 'Nara', 'Chiva', 'Rim', 'Khao'];
const AC_NAME_B = ['Riverside', 'Talay', 'Suan', 'Boutique', 'Bay', 'Hills', 'Garden', 'Old Town', 'Cliff', 'Heritage', 'Seaview', 'Pool', 'Residence', 'Lagoon', 'Terrace'];
const AC_NAME_C = ['Hotel', 'Resort', 'Lodge', 'Inn', 'Villa', 'Retreat', 'Suites', 'House'];
type AcDemoHotel = { id: string; name: string; orm: number; marcom: number; both: boolean };
function acDemoHotels(): AcDemoHotel[] {
  const out: AcDemoHotel[] = [];
  for (let i = 0; i < 155; i++) {
    const name = `${AC_NAME_A[i % 10]} ${AC_NAME_B[Math.floor(i / 10) % 15]} ${AC_NAME_C[i % 8]}${i >= 120 ? ' ' + (Math.floor(i / 8) % 10 + 2) : ''}`;
    const both = i < 15;
    // Deterministic descending curve; ranks 1–2 ≥ ฿100k.
    const orm = i === 0 ? 132000 : i === 1 ? 118000 : Math.round(95000 - i * 580 + ((i * 37) % 11) * 40);
    const marcom = both ? Math.round(orm * 0.35) : 0;
    out.push({ id: hid(name), name, orm, marcom, both });
  }
  return out;
}
export function demoAcViews() {
  const views: Record<string, PsReportRow[]> = Object.fromEntries(['v_ac_debtors','v_ac_invoices_breakdown','v_ac_invoice_ranking','v_ac_grade_distribution','v_ac_overdue','v_ac_suspended','v_ac_legal','v_ac_system_fee'].map(k => [k, []]));
  const hotels = acDemoHotels();
  const NEW_IN_SEP = new Set(hotels.slice(-5).map(h => h.id)); // no previous period → "ใหม่"
  const UNBILLED: AcDemoHotel[] = [0, 1, 2, 3, 4, 5].map(i => ({ id: hid('Unbilled ' + i), name: `Sala Unbilled ${i + 1}`, orm: 0, marcom: 0, both: false }));
  // Rank rows per period × lens. Aug amounts ×0.94; earlier periods slightly lower still.
  const periodFactor = (p: string) => (p === '2026-09-01' ? 1 : p === '2026-08-01' ? 0.94 : 0.9);
  const rankOf = (rows: { id: string; name: string; amount: number }[]) =>
    new Map([...rows].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)).map((r, i) => [r.id, i + 1]));
  const lensRowsFor = (p: string, lens: 'ALL' | 'ORM' | 'MARCOM') => {
    const f = periodFactor(p);
    return hotels
      .filter(h => !(p !== '2026-09-01' && NEW_IN_SEP.has(h.id)))
      .map(h => ({ id: h.id, name: h.name, amount: Math.round((lens === 'ALL' ? h.orm + h.marcom : lens === 'ORM' ? h.orm : h.marcom) * f), h }))
      .filter(r => r.amount > 0);
  };
  for (const p of AC_PERIODS) {
    const f = periodFactor(p);
    const prevP = AC_PERIODS[AC_PERIODS.indexOf(p) - 1];
    for (const lens of ['ALL', 'ORM', 'MARCOM'] as const) {
      const rows = lensRowsFor(p, lens);
      const ranks = rankOf(rows);
      const prevRanks = prevP ? rankOf(lensRowsFor(prevP, lens)) : new Map<string, number>();
      // avg_rank over the periods so far (≥ 2 ranked periods, else null)
      const hist = new Map<string, number[]>();
      for (const hp of AC_PERIODS.slice(0, AC_PERIODS.indexOf(p) + 1)) {
        const hr = rankOf(lensRowsFor(hp, lens));
        for (const [id, rk] of hr) hist.set(id, [...(hist.get(id) ?? []), rk]);
      }
      for (const r of rows) {
        const h = hist.get(r.id) ?? [];
        views['v_ac_invoice_ranking']?.push({
          billing_period: p, hotel_id: r.id, hotel_name: r.name, lens,
          amount_thb: r.amount, orm_thb: Math.round(r.h.orm * f), marcom_thb: Math.round(r.h.marcom * f),
          invoice_count: r.h.both ? 2 : 1, rank: ranks.get(r.id) ?? null,
          prev_rank: prevRanks.get(r.id) ?? null,
          avg_rank: h.length >= 2 ? Math.round((h.reduce((a, b) => a + b, 0) / h.length) * 10) / 10 : null,
          has_bill: true,
        });
      }
      for (const u of UNBILLED) {
        if (lens === 'MARCOM') continue;
        views['v_ac_invoice_ranking']?.push({ billing_period: p, hotel_id: u.id, hotel_name: u.name, lens, amount_thb: 0, orm_thb: 0, marcom_thb: 0, invoice_count: 0, rank: null, prev_rank: null, avg_rank: null, has_bill: false });
      }
    }
  }
  // Grades — 6 periods; Sep 26 still open (no D). A+B% history: 78, 80, 79, 81, 80, 81 (both directions).
  const GRADE_MIX: Record<string, [number, number, number, number]> = {
    '2026-04-01': [88, 34, 14, 6], '2026-05-01': [90, 34, 12, 6], '2026-06-01': [89, 33, 14, 6],
    '2026-07-01': [91, 35, 11, 5], '2026-08-01': [90, 34, 12, 6], '2026-09-01': [92, 35, 15, 0],
  };
  for (const p of AC_PERIODS) {
    const mix = GRADE_MIX[p]!;
    (['A', 'B', 'C', 'D'] as const).forEach((g, gi) => {
      const total = mix[gi]!;
      if (!total) return;
      views['v_ac_grade_distribution']?.push({ billing_period: p, grade: g, customer_count: Math.ceil(total * 0.6), service_line: 'ORM' });
      views['v_ac_grade_distribution']?.push({ billing_period: p, grade: g, customer_count: Math.floor(total * 0.4), service_line: 'Marcom' });
    });
  }
  // Debtor worklist rows (per hotel) — one customer (Anan Group) owns 3 hotels.
  const DEBTORS: [string, string, L, number, number, number, string, string, string | null][] = [
    // hotel, customer, service, outstanding, invoices, overdueMonths, grade, status, caretaker
    ['Chaba Grand', 'Chaba Group', 'ORM', 90000, 2, 2, 'D', 'SUSPENDED', 'C-Rev-01'],
    ['Anjali', 'Anjali Co.', 'Marcom', 32000, 1, 1, 'C', 'OVERDUE', 'แนน'],
    ['Dusit Pool Villa', 'Dusit Co.', 'ORM', 41000, 1, 1, 'C', 'OVERDUE', 'A-Rev-01'],
    ['Sala Riverside Hotel', 'Anan Group', 'ORM', 55000, 1, 3, 'D', 'LEGAL', 'A-Rev-01'],
    ['Sala Talay Resort', 'Anan Group', 'ORM', 28000, 1, 2, 'D', 'SUSPENDED', 'B-Rev-01'],
    ['Sala Suan Lodge', 'Anan Group', 'Marcom', 12000, 1, 1, 'C', 'OVERDUE', 'บิว'],
    ['Baan Boutique Inn', 'Baan Boutique Co.', 'ORM', 21000, 1, 4, 'D', 'WRITTEN_OFF', null],
    ['The Bay Hotel', 'The Bay Co.', 'Marcom', 18000, 1, 1, 'C', 'OVERDUE', 'โบว์'],
    ['Grand Hills Resort', 'Grand Hills Co.', 'ORM', 15000, 1, 0, 'B', 'PAUSED', 'A-Rev-01'],
  ];
  for (const [hotel, customer, line, outstanding, invoices, months, grade, status, caretaker] of DEBTORS) {
    views['v_ac_debtors']?.push({
      billing_period: '2026-09-01', customer_id: hid(customer), customer_name: customer,
      hotel_id: hid(hotel), hotel_name: hotel, service_line: line, outstanding,
      invoice_count: invoices, overdue_months: months, grade, collection_status: status, caretaker,
      ae_owner_id: contracts.find(c => c.hotel === hotel)?.ae ?? null,
    });
  }
  // Aggregate collection views derived from the debtor rows (I4 holds by construction).
  const agg = (status: string) => {
    const rows = DEBTORS.filter(d => d[7] === status);
    return rows.length ? { billing_period: '2026-09-01', service_line: null, customer_count: rows.length, invoice_count: rows.reduce((s, d) => s + d[4], 0), outstanding: rows.reduce((s, d) => s + d[3], 0) } : null;
  };
  for (const [view, status] of [['v_ac_overdue', 'OVERDUE'], ['v_ac_suspended', 'SUSPENDED'], ['v_ac_legal', 'LEGAL']] as const) {
    const a = agg(status);
    if (a) views[view]?.push(a);
  }
  // Invoice breakdown: collected vs outstanding per segment × service (current state).
  const BREAKDOWN: [string, L, number, number, number, number, number, number, number][] = [
    // segment, service, invoice_count, collected, outstanding_count, outstanding, overdue_count, overdue_amount, notdue
    ['EXISTING', 'ORM', 96, 88, 8, 178000, 5, 139000, 3],
    ['EXISTING', 'Marcom', 40, 37, 3, 50000, 2, 38000, 1],
    ['NEW', 'ORM', 14, 12, 2, 36000, 1, 28000, 1],
    ['NEW', 'Marcom', 8, 7, 1, 12000, 1, 12000, 0],
  ];
  for (const [seg, line, inv, col, oc, os, odc, oda, nd] of BREAKDOWN) {
    views['v_ac_invoices_breakdown']?.push({ billing_period: '2026-09-01', customer_segment: seg, service_line: line, invoice_count: inv, collected_count: col, outstanding_count: oc, outstanding: os, overdue_count: odc, overdue_amount: oda, notdue_count: nd, notdue_amount: nd * 9000 });
  }
  return views;
}
export function demoOnboarding(): OnboardingCard[] {
  const base = (id: string, hotel: string, line: L, created: string, live: string | null, ref: string, ae: string): OnboardingCard => ({ id, property_id: hid(hotel), property_name: hotel, service_line: line === 'ORM' ? 'ORM' : 'MARCOM', service_variant: line === 'ORM' ? 'ORM' : 'MARCOM_META_TIKTOK', contract_ref: ref, created_at: created, current_stage: live ? 'go_live' : 'new_property', assigned_ae_id: ae, assigned_specialist_id: 'Dao', assigned_service_owner_id: '', billing_start_at: null, billing_anchor_stage: 'go_live', go_live_at: live, meeting_record_url: null, pre_service_form_ref: null, form_completion_status: 'not_started', external_app: null, external_ref_url: null });
  return [...contracts.filter(c => NEW_PROPERTY[c.id]).map(c => base(c.id === 'C11' ? 'N11' : 'N12', c.hotel, c.line, NEW_PROPERTY[c.id] ?? c.start, null, c.id, c.ae)), ...FINISHED.map((f, i) => base(`F-${String.fromCharCode(65+i)}`, '(demo)', f[2], f[0], f[1], '', ''))];
}
export function demoHotels(): HotelProfile[] {
  return [...new Set(contracts.map(c => c.hotel))].map(hotel => ({ id: hid(hotel), code: hid(hotel), name: hotel, contractorType: '', overdueMonths: 0, latePayments: 0, mainContact: { id: hid(hotel), fullName: '', nickname: '', position: '', phone: '', email: '', permissions: [] }, acSaved: true, model: '', registration: '', rooms: '', terms: contracts.filter(c => c.hotel === hotel).map(c => ({ id: c.id, start: new Date(c.start), end: new Date(c.end), services: [{ id: c.id, category: c.line === 'ORM' ? 'orm' : 'marcom', serviceType: c.line, periodStart: new Date(c.start), periodEnd: new Date(c.end), monthlyFee: '', commission: '', platforms: [], guarantee: 'no', guaranteeAmount: '', marcomFee: '', productionItem: '', productionAmount: '', upsells: [] }] })), termination: { active: false, fee: '', reason: '' }, otherContacts: [], psSaved: true, system: { system: '', hplusPays: false, monthlyCost: '', payments: {} } }));
}

export function demoOnboardingSums(id: string) {
  const index = ['F-A','F-B','F-C','F-D'].indexOf(id);
  const f = FINISHED[index];
  return f ? { ae:f[3], specialist:f[4], service:f[5] ?? f[6], overall:day(f[0],f[1]) } : { ae:null,specialist:null,service:null,overall:null };
}

/** Task tab demo (DP14): caretakers per spine hotel (nicknames). null = not yet assigned. Specialist never a watcher. */
const TASK_CARETAKERS: Record<string, { orm: string | null; marcom: string | null }> = {
  'Chaam Peumsuk': { orm: 'A-Rev-01', marcom: null }, 'Baan Talay': { orm: 'B-Rev-01', marcom: null }, Seefah: { orm: null, marcom: null },
  Anjali: { orm: null, marcom: 'แนน' }, 'Baan Suan': { orm: null, marcom: 'บิว' }, 'Chaba Grand': { orm: 'C-Rev-01', marcom: null }, 'Dusit Pool Villa': { orm: 'A-Rev-01', marcom: 'โบว์' },
};
export function demoTaskHotels() {
  const active = contracts.filter(c => c.status === 'ACTIVE' && TASK_CARETAKERS[c.hotel]);
  return [...new Set(active.map(c => c.hotel))].map(hotel => {
    const mine = active.filter(c => c.hotel === hotel);
    return { hotel_id: hid(hotel), hotel_name: hotel, ae: mine[0]?.ae ?? null, orm: mine.some(c => c.line === 'ORM') ? { member: TASK_CARETAKERS[hotel]!.orm } : null, marcom: mine.some(c => c.line === 'Marcom') ? { member: TASK_CARETAKERS[hotel]!.marcom } : null, status: 'ACTIVE' };
  });
}
/** Same cohort values the PS tab ④ shows (oracle: Avg onboarding cycle-time must match). */
export function demoOnboardCycle() {
  return FINISHED.map(([created, live, line], i) => ({ card_id: `F-${'ABCD'[i]}`, hotel_id: null, hotel_name: null, service_line: line, created_at: created, go_live_at: live, cycle_days: day(created, live) }));
}

/* ---------- BD-AC v2.0 demo fixture (§6) — own clock 2026-10-17, OFF → empty. ---------- */
export const BDAC_DEMO_NOW = '2026-10-17T12:00:00.000Z';
type DemoDeal = { id: string; hotel: string; line: 'ORM' | 'MARCOM'; stage: number; bd: string; approved?: string; sent?: string; signed?: string; paid?: string; won?: string };
const ISO9 = (d: string) => `${d}T09:00:00.000Z`;
const bdacDeal = (d: DemoDeal): ContractLifecycle => ({
  id: d.id, quote_id: d.id, contract_id: d.stage >= 11 ? d.id : null, contract_service_line: null,
  customer_id: null, invoice_number: null, property_name: d.hotel, hotel_id: hid(d.hotel), hotel_name: d.hotel,
  customer_legal_name: d.hotel, service_line: d.line, bd_owner_id: d.bd, current_stage: d.stage,
  live_link_token: null, live_link_sent_at: null, sent_to_ac_at: null,
  approved_at: d.approved ? ISO9(d.approved) : null, send_contract_at: d.sent ? ISO9(d.sent) : null,
  signed_at: d.signed ? ISO9(d.signed) : null, payment_at: d.paid ? ISO9(d.paid) : null, won_at: d.won ? ISO9(d.won) : null,
  created_at: ISO9(d.approved ?? d.sent ?? '2026-05-01'), updated_at: ISO9(d.won ?? d.paid ?? d.signed ?? d.sent ?? d.approved ?? '2026-05-01'),
});
/** Current pipeline (stages 6–9) — oracle §6. Stage-6 sub-step via lifecycle step; stage 9: 9 = pay ✓ · AC ✗, 10 = pay ✗ · AC ✗. */
const BDAC_PIPELINE: DemoDeal[] = [
  { id: 'D-2361', hotel: 'Nan Riverside Lodge', line: 'ORM', stage: 1, bd: 'ต้น', approved: '2026-07-22' },
  { id: 'D-2377', hotel: 'Rayong Seaview Hotel', line: 'MARCOM', stage: 2, bd: 'ปาล์ม', approved: '2026-08-19' },
  { id: 'D-2380', hotel: 'Hat Yai Central Hotel', line: 'MARCOM', stage: 10, bd: 'นุ่น', approved: '2026-08-20', sent: '2026-08-25', signed: '2026-08-28' },
  { id: 'D-2402', hotel: 'Phuket Sands Villa', line: 'ORM', stage: 7, bd: 'ปาล์ม', approved: '2026-09-20', sent: '2026-09-26' },
  { id: 'D-2398', hotel: 'Khao Yai Hills Resort', line: 'ORM', stage: 9, bd: 'นุ่น', approved: '2026-10-02', sent: '2026-10-06', signed: '2026-10-12', paid: '2026-10-15' },
  { id: 'D-2410', hotel: 'The Riverside Bangkok', line: 'ORM', stage: 5, bd: 'นุ่น', approved: '2026-10-13' },
  { id: 'D-2405', hotel: 'Ayutthaya Heritage Inn', line: 'ORM', stage: 8, bd: 'ต้น', approved: '2026-10-10', sent: '2026-10-13', signed: '2026-10-14' },
  { id: 'D-2415', hotel: 'Chiang Mai Old Town Hotel', line: 'ORM', stage: 4, bd: 'นุ่น', approved: '2026-10-15' },
  { id: 'D-2408', hotel: 'Pattaya Bay Hotel', line: 'MARCOM', stage: 7, bd: 'นุ่น', approved: '2026-09-30', sent: '2026-10-15' },
  { id: 'D-2403', hotel: 'Hua Hin Beach Club', line: 'MARCOM', stage: 10, bd: 'ปาล์ม', approved: '2026-10-08', sent: '2026-10-12', signed: '2026-10-15' },
  { id: 'D-2414', hotel: 'Baan Talay Hua Hin', line: 'MARCOM', stage: 1, bd: 'ต้น', approved: '2026-10-16' },
  { id: 'D-2412', hotel: 'Koh Samui Garden Resort', line: 'ORM', stage: 7, bd: 'ต้น', approved: '2026-10-14', sent: '2026-10-16' },
  { id: 'D-2409', hotel: 'Ari Residence Bangkok', line: 'MARCOM', stage: 8, bd: 'ปาล์ม', approved: '2026-10-11', sent: '2026-10-14', signed: '2026-10-16' },
  { id: 'D-2417', hotel: 'Krabi Cliff Resort', line: 'MARCOM', stage: 2, bd: 'ปาล์ม', approved: '2026-10-17' },
  { id: 'D-2418', hotel: 'Sukhumvit Loft', line: 'ORM', stage: 1, bd: 'ต้น', approved: '2026-10-17' },
];
/** WON in Oct (5 deals · 4 distinct hotels) + Sep-sent deals completing the ก.ย. cohort (sent Sep, won Sep 1–17 → prev WON 3). */
const BDAC_WON: DemoDeal[] = [
  { id: 'D-2385', hotel: 'Nimman Hideaway', line: 'ORM', stage: 11, bd: 'ต้น', approved: '2026-09-27', sent: '2026-09-30', signed: '2026-10-01', paid: '2026-10-03', won: '2026-10-05' },
  { id: 'D-2387', hotel: 'Bangsaen Breeze Hotel', line: 'MARCOM', stage: 11, bd: 'ปาล์ม', approved: '2026-09-22', sent: '2026-09-25', signed: '2026-09-30', paid: '2026-10-04', won: '2026-10-05' },
  { id: 'D-2390', hotel: 'Lanna Boutique Chiang Mai', line: 'ORM', stage: 11, bd: 'นุ่น', approved: '2026-09-25', sent: '2026-09-28', signed: '2026-09-30', paid: '2026-10-01', won: '2026-10-02' },
  { id: 'D-2391', hotel: 'Lanna Boutique Chiang Mai', line: 'MARCOM', stage: 11, bd: 'นุ่น', approved: '2026-09-29', sent: '2026-10-02', signed: '2026-10-04', paid: '2026-10-05', won: '2026-10-06' },
  { id: 'D-2393', hotel: 'Silom Urban Suites', line: 'ORM', stage: 11, bd: 'ต้น', approved: '2026-09-30', sent: '2026-10-03', signed: '2026-10-04', paid: '2026-10-07', won: '2026-10-08' },
  { id: 'D-2331', hotel: 'Pai River Corner', line: 'ORM', stage: 11, bd: 'ต้น', approved: '2026-08-30', sent: '2026-09-03', signed: '2026-09-04', paid: '2026-09-05', won: '2026-09-05' },
  { id: 'D-2332', hotel: 'Sukhothai Garden Inn', line: 'MARCOM', stage: 11, bd: 'ปาล์ม', approved: '2026-09-04', sent: '2026-09-08', signed: '2026-09-10', paid: '2026-09-12', won: '2026-09-14' },
  { id: 'D-2333', hotel: 'Trang Coast Lodge', line: 'ORM', stage: 11, bd: 'นุ่น', approved: '2026-09-08', sent: '2026-09-12', signed: '2026-09-13', paid: '2026-09-15', won: '2026-09-16' },
];
/** Closed cohorts พ.ค.–ส.ค. (all WON; ส.ค. carry = D-2380 lives in the pipeline). */
const BDAC_HISTORY: DemoDeal[] = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `D-22${90 + i}`, hotel: `Demo Resort May ${i + 1}`, line: i % 2 ? 'MARCOM' : 'ORM', stage: 11, bd: ['ต้น', 'ปาล์ม', 'นุ่น'][i % 3]!, approved: `2026-05-0${(i % 8) + 1}`, sent: `2026-05-1${i % 9}`, signed: `2026-05-1${(i % 8) + 1}`, paid: `2026-05-2${i % 8}`, won: `2026-05-2${(i % 8) + 1}` }) as DemoDeal),
  ...Array.from({ length: 11 }, (_, i) => ({ id: `D-23${String(i).padStart(2, '0')}`, hotel: `Demo Resort Jun ${i + 1}`, line: i % 2 ? 'MARCOM' : 'ORM', stage: 11, bd: ['ต้น', 'ปาล์ม', 'นุ่น'][i % 3]!, approved: `2026-06-0${(i % 8) + 1}`, sent: `2026-06-1${i % 9}`, signed: `2026-06-1${(i % 8) + 1}`, paid: `2026-06-2${i % 8}`, won: `2026-06-2${(i % 8) + 1}` }) as DemoDeal),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `D-231${i}`, hotel: `Demo Resort Jul ${i + 1}`, line: i % 2 ? 'MARCOM' : 'ORM', stage: 11, bd: ['ต้น', 'ปาล์ม', 'นุ่น'][i % 3]!, approved: `2026-07-0${(i % 8) + 1}`, sent: `2026-07-1${i % 9}`, signed: `2026-07-1${(i % 8) + 1}`, paid: `2026-07-2${i % 8}`, won: `2026-07-2${(i % 8) + 1}` }) as DemoDeal),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `D-234${i}`, hotel: `Demo Resort Aug ${i + 1}`, line: i % 2 ? 'MARCOM' : 'ORM', stage: 11, bd: ['ต้น', 'ปาล์ม', 'นุ่น'][i % 3]!, approved: `2026-08-0${(i % 8) + 1}`, sent: `2026-08-1${i % 9}`, signed: `2026-08-1${(i % 8) + 1}`, paid: `2026-08-2${i % 8}`, won: `2026-08-2${(i % 8) + 1}` }) as DemoDeal),
];
export function demoBdacLifecycles(): ContractLifecycle[] {
  return [...BDAC_PIPELINE, ...BDAC_WON, ...BDAC_HISTORY].map(bdacDeal);
}
