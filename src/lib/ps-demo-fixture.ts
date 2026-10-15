/* Bundled preview demo fixture — Demo Fixture Spec v1.0. Remove before production release.
 * Raw entities are derived into v_ps_*-shaped rows here (view layer only); nothing is written to cloud or browser. */
import { PS_VIEWS, type PsReport, type PsReportRow, type PsView } from './ps-dashboard-types';
import type { ContractLifecycle } from './contract-lifecycle';
import type { HotelProfile } from './hotel-store';
import type { OnboardingCard } from './ps-servicing';
import type { GlobalFilter } from './ps-dashboard-global';
import { matchesBook } from './ps-dashboard-global';

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
const RENEWALS: [string, string, string, string][] = [['R1', 'C01', '2026-09-10', 'RENEWED'], ['R2', 'C02', '2026-09-15', 'RENEWED'], ['R3', 'C04', '2026-09-20', 'RENEWED'], ['R4', 'C05', '2026-09-25', 'NOT_RENEWED'], ['R5', 'C06', '2026-09-28', 'IN_PROGRESS']];
const SURVEY2: Record<string, [number, number]> = { 'Chaam Peumsuk': [5, 10], Seefah: [5, 9], 'Chaba Grand': [4, 9], 'Baan Suan': [4, 8], 'Dusit Pool Villa': [3, 5] };
const GRADES: Record<string, [string | null, string | null]> = { 'Chaam Peumsuk': ['A', 'A'], Seefah: ['A', 'A'], 'Erawan Boutique': [null, null], Anjali: ['C', 'C'], 'Baan Suan': ['B', 'B'], 'Baan Talay': ['B', 'B'], 'Dusit Pool Villa': ['C', 'C'], 'Chaba Grand': ['B', 'D'] };
const WS2_INCOMPLETE = new Set(['Dusit Pool Villa', 'Baan Talay', 'Baan Suan']);

const day = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
const hid = (hotel: string) => 'DEMO-' + hotel.replace(/\s+/g, '-').toUpperCase();
const q = (v: number[], f: number) => { const s = [...v].sort((a, b) => a - b); const at = (s.length - 1) * f; const lo = s[Math.floor(at)] ?? 0, hi = s[Math.ceil(at)] ?? 0; return lo + (hi - lo) * (at - Math.floor(at)); };
const avg = (v: (number | null)[]) => { const x = v.filter((n): n is number => n != null); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };

export function buildDemoReport(filter?: GlobalFilter): PsReport {
  const now = DEMO_NOW.slice(0, 10);
  const views = Object.fromEntries(PS_VIEWS.map(v => [v, [] as PsReportRow[]])) as Record<PsView, PsReportRow[]>;
  views.v_ps_lifecycle_flow = contracts.map(c => ({ contract_id: c.id, hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, status: c.status, start_date: c.start, inactivated_at: c.inact, created_at: NEW_PROPERTY[c.id] ?? null }));
  for (const m of ['2026-07-01', '2026-08-01', '2026-09-01']) {
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
  const sv = Object.values(SURVEY2);
  views.v_ps_nps = Object.entries(SURVEY2).map(([hotel, scores]) => ({ billing_period: '2026-09-01', hotel_id: hid(hotel), hotel_name: hotel, ae_owner_id: contracts.find(c => c.hotel === hotel)?.ae ?? null, service_line: null, responses: 1, promoters: scores[1] >= 9 ? 1 : 0, detractors: scores[1] <= 6 ? 1 : 0 }));
  const active = contracts.filter(c => c.status === 'ACTIVE');
  const hotels = [...new Set(active.map(c => c.hotel))];
  views.v_ps_attach_rate = [{ service_line: null, active_hotels: hotels.length, attached_hotels: hotels.filter(h => active.filter(c => c.hotel === h).length >= 2).length }];
  views.v_ps_account_health = active.map(c => {
    const mine = active.filter(x => x.hotel === c.hotel);
    const [latest, worst] = GRADES[c.hotel] ?? [null, null];
    return { hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, status: c.status, latest_grade: latest, worst_grade: worst, survey2: SURVEY2[c.hotel]?.[0] ?? null, completeness: WS2_INCOMPLETE.has(c.hotel) ? 'incomplete' : 'complete', end_date: mine.map(x => x.end).sort()[0] ?? null, active_services: mine.length };
  });
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
export function demoAcViews() {
  const views: Record<string, PsReportRow[]> = Object.fromEntries(['v_ac_debtors','v_ac_invoices_breakdown','v_ac_invoice_ranking','v_ac_grade_distribution','v_ac_overdue','v_ac_suspended','v_ac_legal','v_ac_system_fee'].map(k => [k, []]));
  for (const [hotel, grades] of Object.entries(GRADES)) {
    const c = contracts.find(c => c.hotel === hotel);
    if (!c || !grades[0]) continue;
    const common = { billing_period: '2026-09-01', hotel_id: hid(hotel), hotel_name: hotel, customer_id: hid(hotel), service_line: c.line, ae_owner_id: c.ae };
    // Hotel collection oracle uses existing worst grade (Chaba B/D counts as D).
    const grade = grades[1] ?? grades[0];
    views['v_ac_grade_distribution']?.push({ ...common, grade, customer_count: 1 });
    if (grade === 'C' || grade === 'D') {
      const outstanding = grade === 'D' ? 5000 : 2500;
      views['v_ac_debtors']?.push({ ...common, outstanding });
      views['v_ac_overdue']?.push({ ...common, outstanding, customer_count: 1 });
      views['v_ac_invoices_breakdown']?.push({ ...common, customer_segment: 'EXISTING', invoice_count: 1 });
      views['v_ac_invoice_ranking']?.push({ ...common, amount: outstanding, rank: grade === 'D' ? 1 : 2 });
    }
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
