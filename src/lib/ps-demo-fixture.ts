/* BUILD-ONLY demo fixture (DP11) — Demo Fixture Spec v1.0. Strip before production.
 * Raw entities are derived into v_ps_*-shaped rows here (view layer only); nothing is written to cloud or browser. */
import { PS_VIEWS, type PsReport, type PsReportRow, type PsView } from './ps-dashboard-types';

export const DEMO_ENABLED = import.meta.env.DEV; // hard-off outside development builds
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

export function buildDemoReport(): PsReport {
  const now = DEMO_NOW.slice(0, 10);
  const views = Object.fromEntries(PS_VIEWS.map(v => [v, [] as PsReportRow[]])) as Record<PsView, PsReportRow[]>;
  views.v_ps_lifecycle_flow = contracts.map(c => ({ contract_id: c.id, hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, ae_owner_id: c.ae, status: c.status, start_date: c.start, inactivated_at: c.inact, created_at: NEW_PROPERTY[c.id] ?? null }));
  for (const m of ['2026-07-01', '2026-08-01', '2026-09-01']) {
    const next = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 10);
    for (const line of ['ORM', 'Marcom'] as L[]) {
      const cs = contracts.filter(c => c.line === line);
      views.v_ps_churn_monthly.push({ billing_period: m, service_line: line, active_at_start: cs.filter(c => c.start <= m && (!c.inact || c.inact >= m)).length, out_count: cs.filter(c => c.inact && c.inact >= m && c.inact < next).length });
    }
  }
  views.v_ps_renewal = RENEWALS.map(([rid, cid, due, outcome]) => { const c = contracts.find(x => x.id === cid)!; return { renewal_id: rid, contract_id: cid, hotel_id: hid(c.hotel), service_line: c.line, ae_owner_id: c.ae, renewal_due_date: due, outcome }; });
  views.v_ps_contract_lifetime = contracts.map(c => ({ contract_id: c.id, hotel_id: hid(c.hotel), service_line: c.line, status: c.status, end_date: c.end, age_days: c.status === 'INACTIVE' ? day(c.start, c.end) : day(c.start, now) }));
  for (const m of ['2026-08', '2026-09']) {
    const cs = FINISHED.filter(f => f.go_live_month === undefined && f[1].startsWith(m));
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
  views.v_ps_nps = [{ billing_period: '2026-09-01', service_line: null, responses: sv.length, promoters: sv.filter(x => x[1] >= 9).length, detractors: sv.filter(x => x[1] <= 6).length }];
  const active = contracts.filter(c => c.status === 'ACTIVE');
  const hotels = [...new Set(active.map(c => c.hotel))];
  views.v_ps_attach_rate = [{ service_line: null, active_hotels: hotels.length, attached_hotels: hotels.filter(h => active.filter(c => c.hotel === h).length >= 2).length }];
  views.v_ps_account_health = active.map(c => {
    const mine = active.filter(x => x.hotel === c.hotel);
    const [latest, worst] = GRADES[c.hotel] ?? [null, null];
    return { hotel_id: hid(c.hotel), hotel_name: c.hotel, service_line: c.line, latest_grade: latest, worst_grade: worst, survey2: SURVEY2[c.hotel]?.[0] ?? null, completeness: WS2_INCOMPLETE.has(c.hotel) ? 'incomplete' : 'complete', end_date: mine.map(x => x.end).sort()[0] ?? null, active_services: mine.length };
  });
  return { views, pending: [], demo: true, now: DEMO_NOW, wonMtd: 2 };
}
