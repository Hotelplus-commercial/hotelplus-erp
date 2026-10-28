/* PS Dashboard · Header R2 — Customer Journey scorecard + Active Portfolio (pure selectors, read-only).
 * Unit = service contract (a hotel with ORM + Marcom counts as 2). Counting rules for Upcoming, Active,
 * Churn and grade are unchanged; only the unit and the ORM / Marcom split are new here.
 *
 * Metric → source (mirrors spec §7):
 *   รอเริ่ม                   → BD deals at stage 6–9 (Contract Dashboard lifecycles) + service line on the deal — live
 *   ในคิว · ใช้เวลา Go Live    → On-board cards (v_servicing_* rows; start = card created_at, no AE-accept stamp exists) — live
 *   ใช้งาน                    → contracts & services (v_ps_account_health, status ACTIVE) — live
 *   หลุด                      → contracts & services (v_ps_churn_monthly out_count / active_at_start) — live
 *   คะแนนบริการ               → surveys / v_ps_service_score — view absent → empty state "รอข้อมูล"
 *   เกรด C · D                → AC grade dataset (v_ac_contract_cost_monthly grade_latest, latest billing month) — live
 *   Flat Rate · Commission    → contract SKU lines + contract_price_history (effective_from ≤ day < effective_to) — live
 *   Content quota             → contract line quantity — live
 *   Content posts · Ads top-ups · KOL visits → Marcom App via src/lib/marcom-app-source.ts — adapter stub ("not connected")
 */
import { aeNameTh } from './ps-glossary';
import { teamLabel } from './hr-members';
import { daysIn, inPeriod, modeOf, monthsOf } from './card-compare';
import type { Period } from './ps-dashboard-global';
import type { GlobalFilter } from './ps-dashboard-global';

/** HR26: the old "สรุปภาพรวมเดือนนี้" strip is hidden (not deleted) behind this flag. */
export const PSDASH_FLAGS = { 'psdash.monthSummary': false } as const;

export type Svc = 'ORM' | 'Marcom';
export const SVCS: Svc[] = ['ORM', 'Marcom'];
/** Owner keys carried by every header row (raw ids; display names resolved by aliases). */
export type HRow = { service: Svc; hotel_id?: string; hotel_name?: string; ae: string | null; orm: string | null; marcom: string | null };

/* ---------------- ทีม / คน picker ---------------- */
export type HeaderSel = { kind: 'ALL' } | { kind: 'ORM'; team: string | null } | { kind: 'MARCOM'; owner: string | null } | { kind: 'AE'; ae: string };
export const SEL_ALL: HeaderSel = { kind: 'ALL' };
export function selValue(s: HeaderSel): string {
  return s.kind === 'ALL' ? 'all' : s.kind === 'ORM' ? `orm:${s.team ?? '*'}` : s.kind === 'MARCOM' ? `marcom:${s.owner ?? '*'}` : `ae:${s.ae}`;
}
export function selFromValue(v: string): HeaderSel {
  const [k, ...rest] = v.split(':'); const x = rest.join(':');
  if (k === 'orm') return { kind: 'ORM', team: x === '*' ? null : x };
  if (k === 'marcom') return { kind: 'MARCOM', owner: x === '*' ? null : x };
  if (k === 'ae' && x) return { kind: 'AE', ae: x };
  return SEL_ALL;
}
export function selLabel(s: HeaderSel): string {
  return s.kind === 'ALL' ? 'ทั้งหมด' : s.kind === 'ORM' ? (s.team ? `ORM ${s.team}` : 'ORM ทั้งหมด') : s.kind === 'MARCOM' ? (s.owner ? `Marcom ${s.owner}` : 'Marcom ทั้งหมด') : `AE ${s.ae}`;
}
/** Maps the single picker onto the existing lens (service + role + team/person, AND logic) used by every card. */
export function selToFilter(s: HeaderSel, f: GlobalFilter): GlobalFilter {
  const base = { ...f, service: 'ALL' as const, role: 'none' as const, teams: [] as string[], people: [] as string[] };
  if (s.kind === 'ORM') return s.team ? { ...base, service: 'ORM', role: 'ORM', teams: [s.team] } : { ...base, service: 'ORM' };
  if (s.kind === 'MARCOM') return s.owner ? { ...base, service: 'Marcom', role: 'Marcom', people: [s.owner] } : { ...base, service: 'Marcom' };
  if (s.kind === 'AE') return { ...base, role: 'AE', people: [s.ae] };
  return base;
}
export function selFromFilter(f: GlobalFilter): HeaderSel {
  if (f.service === 'ORM') return { kind: 'ORM', team: f.role === 'ORM' ? f.teams[0] ?? null : null };
  if (f.service === 'Marcom') return { kind: 'MARCOM', owner: f.role === 'Marcom' ? f.people[0] ?? null : null };
  if (f.role === 'AE' && f.people[0]) return { kind: 'AE', ae: f.people[0] };
  return SEL_ALL;
}
type Aliases = Record<string, string[]> | undefined;
const keys = (v: string | null, aliases: Aliases) => (v == null || v === '' ? [] : [v, aeNameTh(v), teamLabel(v), ...(aliases?.[v] ?? [])]);
export function rowMatches(r: HRow, s: HeaderSel, aliases?: Aliases): boolean {
  if (s.kind === 'ALL') return true;
  if (s.kind === 'ORM') return r.service === 'ORM' && (s.team == null || keys(r.orm, aliases).includes(s.team));
  if (s.kind === 'MARCOM') return r.service === 'Marcom' && (s.owner == null || keys(r.marcom, aliases).includes(s.owner));
  return keys(r.ae, aliases).includes(s.ae);
}
export const inScope = (svc: Svc, s: HeaderSel) => (s.kind === 'ORM' ? svc === 'ORM' : s.kind === 'MARCOM' ? svc === 'Marcom' : true);
/** Header totals: shown for ทั้งหมด and AE; hidden for an ORM / Marcom selection (col 1 always shown). */
export const showTotals = (s: HeaderSel) => s.kind === 'ALL' || s.kind === 'AE';

/* ---------------- Δ ---------------- */
export type DeltaTone = 'good' | 'bad' | 'flat' | 'neutral';
export type Delta = { d: number; tone: DeltaTone; a: number; b: number } | null;
/** better: 'up' (higher = better), 'down' (lower = better) or 'neutral' (count changes stay grey). */
export function delta(a: number | null | undefined, b: number | null | undefined, better: 'up' | 'down' | 'neutral'): Delta {
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  const tone: DeltaTone = d === 0 ? 'flat' : better === 'neutral' ? 'neutral' : (d > 0) === (better === 'up') ? 'good' : 'bad';
  return { d, tone, a, b };
}

/* ---------------- Scorecard input ---------------- */
export type OnboardRow = HRow & { created_at: string; go_live_at: string | null };
export type ChurnRow = HRow & { month: string; base: number; out: number; out_date?: string | null };
export type ScoreRow = HRow & { date: string; score: number };
export type GradeRow = HRow & { hotel_name: string; ae_name: string; grade: string; overdue: number | null };
export type JourneyInput = {
  today: string;
  upcoming: HRow[];
  onboard: OnboardRow[];
  active: (HRow & { hotel_id: string })[];
  churn: ChurnRow[];
  /** null = source view absent → empty state. */
  scores: ScoreRow[] | null;
  grades: { month: string | null; rows: GradeRow[] };
};

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 864e5);

export function queueNow(rows: OnboardRow[], today: string) {
  const q = rows.filter((r) => !r.go_live_at && r.created_at.slice(0, 10) <= today);
  return { n: q.length, wait: modeOf(q.map((r) => Math.max(0, dayDiff(r.created_at, today)))) };
}
export function goLiveMode(rows: OnboardRow[], p: Period) {
  return modeOf(rows.filter((r) => inPeriod(r.go_live_at, p)).map((r) => Math.max(0, dayDiff(r.created_at, r.go_live_at!))));
}
/** Churn in a period: Σ out (dated end inside the period, else month inside) ÷ base active at the first month of the period. */
export function churnIn(rows: ChurnRow[], p: Period) {
  const months = monthsOf(p);
  const first = months[0]!;
  const base = rows.filter((r) => r.month.slice(0, 7) === first).reduce((s, r) => s + r.base, 0);
  const out = rows.reduce((s, r) => s + (r.out_date ? (inPeriod(r.out_date, p) ? r.out : 0) : months.includes(r.month.slice(0, 7)) ? r.out : 0), 0);
  return { out, base, pct: base ? Math.round((out / base) * 1000) / 10 : null };
}
export function scoreMode(rows: ScoreRow[], p: Period) {
  const v = rows.filter((r) => inPeriod(r.date, p)).map((r) => r.score);
  return { mode: modeOf(v), low: v.filter((s) => s <= 5).length };
}

export type CellCompare = { a: Period; b: Period };
export type ScoreRowOut = {
  service: Svc;
  scoped: boolean;
  upcoming: number;
  queue: { n: number; wait: ReturnType<typeof modeOf> };
  golive: { mode: ReturnType<typeof modeOf>; d: Delta };
  active: number;
  churn: { out: number; pct: number | null; d: Delta };
  score: { mode: ReturnType<typeof modeOf>; low: number; d: Delta } | null;
  grades: { c: GradeRow[]; d: GradeRow[] };
};
export type Scorecard = { rows: ScoreRowOut[]; totals: { upcoming: number; queue: number | null; active: number | null; churn: number | null }; gradeMonth: string | null };

export function journeyScorecard(input: JourneyInput, sel: HeaderSel, cmp: { golive: CellCompare; churn: CellCompare; score: CellCompare }, aliases?: Aliases): Scorecard {
  const pick = <T extends HRow>(rows: T[], svc: Svc) => rows.filter((r) => r.service === svc && rowMatches(r, sel, aliases));
  const rows = SVCS.map((svc): ScoreRowOut => {
    const ob = pick(input.onboard, svc);
    const gA = goLiveMode(ob, cmp.golive.a), gB = goLiveMode(ob, cmp.golive.b);
    const ch = pick(input.churn, svc);
    const cA = churnIn(ch, cmp.churn.a), cB = churnIn(ch, cmp.churn.b);
    const sc = input.scores ? pick(input.scores, svc) : null;
    const sA = sc ? scoreMode(sc, cmp.score.a) : null, sB = sc ? scoreMode(sc, cmp.score.b) : null;
    const gr = pick(input.grades.rows, svc);
    return {
      service: svc,
      scoped: inScope(svc, sel),
      upcoming: input.upcoming.filter((r) => r.service === svc).length, // never filtered by ทีม / คน
      queue: queueNow(ob, input.today),
      golive: { mode: gA, d: delta(gA?.value, gB?.value, 'down') },
      active: pick(input.active, svc).length,
      churn: { out: cA.out, pct: cA.pct, d: cA.base || cB.base ? delta(cA.out, cB.out, 'down') : null },
      score: sA ? { mode: sA.mode, low: sA.low, d: delta(sA.mode?.value, sB?.mode?.value, 'up') } : null,
      grades: { c: gr.filter((g) => g.grade === 'C'), d: gr.filter((g) => g.grade === 'D') },
    };
  });
  const tot = showTotals(sel);
  const sum = (f: (r: ScoreRowOut) => number) => rows.reduce((s, r) => s + f(r), 0);
  return {
    rows,
    totals: { upcoming: sum((r) => r.upcoming), queue: tot ? sum((r) => r.queue.n) : null, active: tot ? sum((r) => r.active) : null, churn: tot ? sum((r) => r.churn.out) : null },
    gradeMonth: input.grades.month,
  };
}

/* ---------------- Active Portfolio ---------------- */
export type PriceRow = { contract_id: string; fee_amount: number | null; commission_pct: number | null; effective_from: string; effective_to: string | null };
export type PortfolioContract = HRow & {
  contract_id: string; hotel_id: string; start: string; end: string | null;
  sku: { flat?: boolean; commission?: boolean; content?: boolean; ads?: boolean; kol?: boolean };
  /** Contract quotas per month (Content pieces / KOL people). */
  quota?: { content?: number | null; kol?: number | null };
};
export const activeOn = (c: Pick<PortfolioContract, 'start' | 'end'>, day: string) => c.start.slice(0, 10) <= day && (!c.end || c.end.slice(0, 10) > day);
/** The price row in force on `day`: effective_from ≤ day < effective_to (open end = still in force). */
export function priceOn(rows: PriceRow[], contractId: string, day: string): PriceRow | null {
  return rows.filter((r) => r.contract_id === contractId && r.effective_from.slice(0, 10) <= day && (!r.effective_to || day < r.effective_to.slice(0, 10))).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null;
}
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** ORM boxes as of one day: count + simple (unweighted) means of the effective price rows. */
export function ormAsOf(contracts: PortfolioContract[], prices: PriceRow[], day: string) {
  const act = contracts.filter((c) => c.service === 'ORM' && activeOn(c, day));
  const flat = act.filter((c) => c.sku.flat), comm = act.filter((c) => c.sku.commission);
  const fees = flat.map((c) => priceOn(prices, c.contract_id, day)?.fee_amount).filter((v): v is number => v != null && v > 0);
  const pcts = comm.map((c) => priceOn(prices, c.contract_id, day)?.commission_pct).filter((v): v is number => v != null && v > 0);
  return { flat: { n: flat.length, value: mean(fees), from: fees.length }, commission: { n: comm.length, value: mean(pcts), from: pcts.length } };
}

export type MarcomFeed = { contract_id: string; date: string; qty: number }[] | null; // null = not connected
export function marcomBox(contracts: PortfolioContract[], kind: 'content' | 'ads' | 'kol', day: string, p: Period, feed: MarcomFeed) {
  const set = contracts.filter((c) => c.service === 'Marcom' && c.sku[kind] && activeOn(c, day));
  const ids = new Set(set.map((c) => c.contract_id));
  const quotaKey = kind === 'kol' ? 'kol' : 'content';
  const quotas = set.map((c) => c.quota?.[quotaKey]).filter((v): v is number => v != null && v > 0);
  const quota = kind === 'ads' ? null : mean(quotas);
  if (!feed) return { n: set.length, value: null as number | null, quota, completion: null as number | null };
  const months = Math.max(1, monthsOf(p).length);
  if (!feed.some((r) => ids.has(r.contract_id) && inPeriod(r.date, p))) return { n: set.length, value: null as number | null, quota, completion: null as number | null };
  const per = (id: string) => feed.filter((r) => r.contract_id === id && inPeriod(r.date, p)).reduce((s, r) => s + r.qty, 0) / months;
  const value = set.length ? mean(set.map((c) => per(c.contract_id))) : null;
  const comps = kind === 'ads' ? [] : set.filter((c) => (c.quota?.[quotaKey] ?? 0) > 0).map((c) => (per(c.contract_id) / c.quota![quotaKey]!) * 100);
  return { n: ids.size, value, quota, completion: comps.length ? mean(comps) : null };
}
export { daysIn };
