/* Header R2 §2 — per-card compare periods (pure). Each time-based card owns its own choice; there is no
 * global period any more. Calendar dates (yyyy-mm-dd, Asia/Bangkok calendar), Buddhist-era years in labels.
 * Unfinished periods are compared on equal length: month = 1st → today vs the same days of the previous
 * month; quarter = quarter-to-date vs the same number of days of the previous quarter; year = 1 Jan → today
 * vs the same span last year. Rebuildable point-in-time values compare "as of today" vs "as of the same day"
 * of the previous period (asOfA / asOfB). */
import type { Period } from './ps-dashboard-global';

export type CmpMode = 'month' | 'quarter' | 'year' | 'custom';
export type MonthRange = { from: string; to: string }; // yyyy-mm … yyyy-mm
export type CmpChoice = { mode: CmpMode; custom?: { a: MonthRange; b: MonthRange } };
export const DEFAULT_CMP: CmpChoice = { mode: 'month' };
export const CMP_MODE_LABEL: Record<CmpMode, string> = { month: 'เดือน', quarter: 'ไตรมาส', year: 'ปี', custom: 'Custom…' };

export const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const beYear = (y: number) => y + 543;
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
export const daysIn = (p: Period) => Math.round((Date.parse(p.to) - Date.parse(p.from)) / 864e5) + 1;
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

export type ComparePeriods = { a: Period; b: Period; asOfA: string; asOfB: string; short: string; full: string };

/** Short Thai date "1 ต.ค. 69". */
export const thShort = (d: string) => { const [y, m, dd] = parts(d); return `${dd} ${TH_MONTH[m - 1]} ${String(beYear(y)).slice(-2)}`; };

export function comparePeriods(choice: CmpChoice, today: string): ComparePeriods {
  const [y, m1, d] = parts(today.slice(0, 10));
  const m = m1 - 1;
  if (choice.mode === 'quarter') {
    const q = Math.floor(m / 3);
    const aFrom = iso(y, q * 3, 1);
    const len = daysIn({ from: aFrom, to: today.slice(0, 10) });
    const pq = q === 0 ? 3 : q - 1, py = q === 0 ? y - 1 : y;
    const bFrom = iso(py, pq * 3, 1);
    const bEndQ = iso(py, pq * 3 + 3, 0);
    const bTo = [addDays(bFrom, len - 1), bEndQ].sort()[0]!;
    const a = { from: aFrom, to: today.slice(0, 10) }, b = { from: bFrom, to: bTo };
    return { a, b, asOfA: a.to, asOfB: b.to, short: `Q${q + 1} vs Q${pq + 1}`, full: `Q${q + 1} ${beYear(y)} (${thShort(a.from)} – ${thShort(a.to)}) เทียบ Q${pq + 1} ${beYear(py)} (${thShort(b.from)} – ${thShort(b.to)})` };
  }
  if (choice.mode === 'year') {
    const a = { from: iso(y, 0, 1), to: today.slice(0, 10) };
    const b = { from: iso(y - 1, 0, 1), to: iso(y - 1, m, Math.min(d, lastDay(y - 1, m))) };
    const span = m === 0 ? TH_MONTH[0]! : `${TH_MONTH[0]}–${TH_MONTH[m]}`;
    return { a, b, asOfA: a.to, asOfB: b.to, short: `${span} ${String(beYear(y)).slice(-2)} vs ${String(beYear(y - 1)).slice(-2)}`, full: `${span} ${beYear(y)} เทียบ ${span} ${beYear(y - 1)}` };
  }
  if (choice.mode === 'custom' && choice.custom) {
    const toPeriod = (r: MonthRange): Period => { const [fy, fm] = r.from.split('-').map(Number) as [number, number]; const [ty, tm] = r.to.split('-').map(Number) as [number, number]; const end = iso(ty, tm, 0); return { from: `${fy}-${pad(fm)}-01`, to: end > today.slice(0, 10) ? today.slice(0, 10) : end }; };
    const a = toPeriod(choice.custom.a), b = toPeriod(choice.custom.b);
    const lbl = (r: MonthRange) => { const f = r.from.split('-').map(Number) as [number, number], t = r.to.split('-').map(Number) as [number, number]; const one = (yy: number, mm: number) => `${TH_MONTH[mm - 1]} ${beYear(yy)}`; return r.from === r.to ? one(f[0], f[1]) : `${one(f[0], f[1])} – ${one(t[0], t[1])}`; };
    return { a, b, asOfA: a.to, asOfB: b.to, short: 'Custom', full: `ช่วง A ${lbl(choice.custom.a)} เทียบ ช่วง B ${lbl(choice.custom.b)}` };
  }
  const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y;
  const a = { from: iso(y, m, 1), to: today.slice(0, 10) };
  const b = { from: iso(py, pm, 1), to: iso(py, pm, Math.min(d, lastDay(py, pm))) };
  return { a, b, asOfA: a.to, asOfB: b.to, short: `${TH_MONTH[m]} vs ${TH_MONTH[pm]}`, full: `${TH_MONTH[m]} ${beYear(y)} เทียบ ${TH_MONTH[pm]} ${beYear(py)}` };
}

/** Months (yyyy-mm) touched by a period. */
export function monthsOf(p: Period): string[] {
  const out: string[] = [];
  let [y, m] = parts(p.from); const [ty, tm] = parts(p.to);
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${pad(m)}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
export const inPeriod = (date: string | null | undefined, p: Period) => !!date && date.slice(0, 10) >= p.from && date.slice(0, 10) <= p.to;

export const cmpStorageKey = (tab: string, card: string) => `psdash.cmp.${tab}.${card}`;
export function parseChoice(raw: string | null): CmpChoice {
  try { const v = raw ? (JSON.parse(raw) as CmpChoice) : null; if (v && ['month', 'quarter', 'year', 'custom'].includes(v.mode)) return v.mode === 'custom' && !v.custom ? DEFAULT_CMP : v; } catch { /* ignore */ }
  return DEFAULT_CMP;
}

/** §4.1 mode (ฐานนิยม): most frequent value, ties → the lower value; always reports its frequency. */
export function modeOf(values: number[]): { value: number; k: number; n: number } | null {
  if (!values.length) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | null = null, k = 0;
  for (const [v, c] of counts) if (c > k || (c === k && best != null && v < best)) { best = v; k = c; }
  return { value: best!, k, n: values.length };
}
