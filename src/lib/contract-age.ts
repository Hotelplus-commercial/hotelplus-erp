/* Tab R3 · card ④ อายุสัญญา (Contract Lifetime) — pure rules (no React, no storage).
 * `v_ps_contract_age` is built here as a selector (Go Live cards, renewal chains and price history are browser-local,
 * so a Cloud SQL view cannot join them — same reason as BD-AC renewal chains). Card ⑦ reads the same rows for its age cell.
 * Unit = service contract chain (a renewal continues the same chain). Thai UI text lives in ps-glossary CL_*. */
import type { PriceHistoryRow } from './renewal-rules';
import type { L0Ticket } from './tickets-l0';
import type { RenewalReason } from './renewal-reasons';
import { normalizeName } from './contract-tab-r1';

export type AgeSvc = 'ORM' | 'Marcom';
export const AGE_SVCS: AgeSvc[] = ['ORM', 'Marcom'];

/* ================= §9.2 config (one place) ================= */
export const CONTRACT_AGE_CONFIG = {
  zonesHundred: { step: 100, cap: 1800 },
  zonesLifecycle: {
    bounds: [0, 91, 181, 366, 731, 1096] as readonly number[],
    cap: 1825,
    labels: ['0–90 วัน', '91–180 วัน', '181 วัน–1 ปี', '1–2 ปี', '2–3 ปี', '3 ปี+'] as readonly string[],
    phases: ['เฝ้าระวัง', 'สร้างความเชื่อมั่น', 'ก่อนต่อครั้งแรก', 'ผ่านต่อครั้งแรก', 'ลูกค้าประจำ', 'ลูกค้าระยะยาว'] as readonly string[],
    /** The first phase pill is highlighted (amber). */
    highlightFirst: true,
    ticks: [[0, '0'], [91, '90'], [181, '180'], [366, '1 ปี'], [731, '2 ปี'], [1096, '3 ปี'], [1825, '5 ปี+']] as readonly (readonly [number, string])[],
  },
  ZONE_MIN_SHARE: 0.07,
  ENDED_DOT_OPACITY: 0.25,
  OUT_OF_PERIOD_OPACITY: 0.2,
  REASON_MIN_ENDED: 3,
  HEAT_MILESTONES: [90, 180, 365, 730, 1095] as readonly number[],
  HEAT_MIN_BASE: 3,
  HEAT_ROWS_DEFAULT: 8,
  CHURN_PAGE_SIZE: 20,
  CHURN_PAGE_OPTIONS: [10, 20, 50, 100] as readonly number[],
  /** ageText month length (days). */
  MONTH_DAYS: 30.42,
} as const;
const C = CONTRACT_AGE_CONFIG;

/* ================= dates / text ================= */
export const dayDiff = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10) + 'T00:00:00Z') - Date.parse(from.slice(0, 10) + 'T00:00:00Z')) / 864e5);
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const be2 = (y: number) => String((y + 543) % 100).padStart(2, '0');
/** §1.2 — `n ปี m เดือน` (month = 30.42 days); under 1 month → `n วัน`. */
export function ageText(days: number | null | undefined): string {
  if (days == null) return '—';
  const months = Math.floor(days / C.MONTH_DAYS);
  if (months < 1) return `${Math.max(0, days)} วัน`;
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} ปี` : '', m ? `${m} เดือน` : ''].filter(Boolean).join(' ');
}
/** §4.1 จบไปแล้ว — `n วัน` under 31 days, `n เดือน` under 12 months, else ageText. */
export function sinceText(days: number): string {
  if (days < 31) return `${Math.max(0, days)} วัน`;
  const months = Math.floor(days / C.MONTH_DAYS);
  return months < 12 ? `${months} เดือน` : ageText(days);
}
export const thDate = (d: string | null | undefined) => (d ? `${+d.slice(8, 10)} ${TH_MON[+d.slice(5, 7) - 1]} ${be2(+d.slice(0, 4))}` : '—');
export const monthKey = (d: string) => d.slice(0, 7);
export const quarterKey = (d: string) => `${d.slice(0, 4)}-Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}`;
/** `พ.ค. 68` */
export const monthLabel = (k: string) => `${TH_MON[+k.slice(5, 7) - 1]} ${be2(+k.slice(0, 4))}`;
/** `Q2 68` */
export const quarterLabel = (k: string) => `Q${k.slice(6)} ${be2(+k.slice(0, 4))}`;
export const quarterStart = (k: string) => `${k.slice(0, 4)}-${String((+k.slice(6) - 1) * 3 + 1).padStart(2, '0')}-01`;
export function nextPeriod(kind: 'month' | 'quarter', k: string, step: number): string {
  if (kind === 'month') { const d = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1 + step, 1)); return d.toISOString().slice(0, 7); }
  const idx = +k.slice(0, 4) * 4 + (+k.slice(6) - 1) + step; return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
}

/* ================= §9.1 v_ps_contract_age ================= */
export type AgeStatus = 'ACTIVE' | 'ENDED' | 'SETUP';
export type AgeOutcome = 'NOT_RENEWED' | 'LOST';
/** One contract record (one cycle) as read from the sources. */
export type AgeContractSource = {
  contract_id: string; hotel_id: string; hotel_name_en: string | null; hotel_name_th: string | null; service: AgeSvc;
  ae_id: string | null; ae_name: string | null; team_label: string | null;
  signed_at: string | null; go_live_at: string | null;
  /** Previous contract of the same chain (renewal continuation). */
  renewal_of: string | null;
  ended_at: string | null; end_kind: AgeOutcome | 'RENEWAL' | null; notice_at: string | null;
};
export type ContractAgeRow = {
  contract_id: string; chain_root_contract_id: string; chain_ids: string[];
  hotel_id: string; hotel_name_en: string | null; hotel_name_th: string | null; service_line: AgeSvc;
  ae_id: string | null; ae_name: string | null; team_label: string | null;
  signed_at: string | null; first_go_live_at: string | null; status: AgeStatus;
  ended_at: string | null; outcome: AgeOutcome | null; notice_at: string | null;
  age_days: number | null; renewals_count: number; go_live_month: string | null; go_live_quarter: string | null;
};
export type RenewalLink = { from: string; to: string };

/** Builds one row per service-contract chain. Age = today (or ended_at) − first Go Live, continuous across renewals. */
export function vPsContractAge(src: AgeContractSource[], ctx: { today: string; links?: RenewalLink[]; history?: PriceHistoryRow[] }): ContractAgeRow[] {
  const byId = new Map(src.map((s) => [s.contract_id, s]));
  const prev = new Map<string, string>();
  for (const s of src) if (s.renewal_of && byId.has(s.renewal_of)) prev.set(s.contract_id, s.renewal_of);
  for (const l of ctx.links ?? []) if (byId.has(l.from) && byId.has(l.to) && !prev.has(l.to)) prev.set(l.to, l.from);
  const hasNext = new Set(prev.values());
  const rows: ContractAgeRow[] = [];
  for (const last of src) {
    if (hasNext.has(last.contract_id)) continue; // part of a later chain
    const chain: AgeContractSource[] = [last]; const seen = new Set([last.contract_id]);
    for (let p = prev.get(last.contract_id); p && !seen.has(p); p = prev.get(p)) { seen.add(p); chain.unshift(byId.get(p)!); }
    const root = chain[0]!;
    const fgl = root.go_live_at ?? chain.map((c) => c.go_live_at).filter((x): x is string => !!x).sort()[0] ?? null;
    const ended = (last.end_kind === 'NOT_RENEWED' || last.end_kind === 'LOST') && !!last.ended_at && last.ended_at.slice(0, 10) <= ctx.today;
    const live = !!fgl && fgl.slice(0, 10) <= ctx.today;
    const status: AgeStatus = ended ? 'ENDED' : live ? 'ACTIVE' : 'SETUP';
    const age = !live ? null : ended ? Math.max(0, dayDiff(fgl!, last.ended_at!)) : Math.max(0, dayDiff(fgl!, ctx.today));
    const ids = chain.map((c) => c.contract_id);
    const renewalRows = (ctx.history ?? []).filter((h) => h.source === 'RENEWAL' && ids.includes(h.contract_id)).length;
    rows.push({
      contract_id: last.contract_id, chain_root_contract_id: root.contract_id, chain_ids: ids,
      hotel_id: last.hotel_id, hotel_name_en: last.hotel_name_en ?? root.hotel_name_en, hotel_name_th: last.hotel_name_th ?? root.hotel_name_th, service_line: last.service,
      ae_id: last.ae_id ?? root.ae_id, ae_name: last.ae_name ?? root.ae_name, team_label: last.team_label ?? root.team_label,
      signed_at: root.signed_at, first_go_live_at: fgl, status,
      ended_at: ended ? last.ended_at!.slice(0, 10) : null, outcome: ended ? (last.end_kind as AgeOutcome) : null, notice_at: ended ? last.notice_at : null,
      age_days: age, renewals_count: Math.max(renewalRows, chain.length - 1),
      go_live_month: fgl ? monthKey(fgl) : null, go_live_quarter: fgl ? quarterKey(fgl) : null,
    });
  }
  return rows;
}
/** Every chain contract id → its row (card ⑦ looks up its contract id here). */
export function ageIndex(rows: ContractAgeRow[]): Map<string, ContractAgeRow> {
  const m = new Map<string, ContractAgeRow>();
  for (const r of rows) for (const id of r.chain_ids) m.set(id, r);
  return m;
}
/** §8 card ⑦ cell: age text or the Setup text (null when the contract is Setup / unknown). */
export const healthAgeDays = (r: ContractAgeRow | undefined) => (r && r.status === 'ACTIVE' ? r.age_days : null);

/* ================= §2.2 zones ================= */
export type ZoneView = 'hundred' | 'lifecycle';
export type Zone = { i: number; from: number; to: number; label: string; phase: string | null };
export function zonesFor(view: ZoneView): Zone[] {
  if (view === 'hundred') {
    const n = C.zonesHundred.cap / C.zonesHundred.step;
    return Array.from({ length: n }, (_, i) => {
      const from = i * C.zonesHundred.step, last = i === n - 1;
      return { i, from, to: last ? Infinity : from + C.zonesHundred.step, label: last ? `${from}+` : `${from}–${from + C.zonesHundred.step - 1}`, phase: null };
    });
  }
  const b = C.zonesLifecycle.bounds;
  return b.map((from, i) => ({ i, from, to: b[i + 1] ?? Infinity, label: C.zonesLifecycle.labels[i]!, phase: C.zonesLifecycle.phases[i]! }));
}
export const zoneOf = (zones: Zone[], age: number) => zones.find((z) => age >= z.from && age < z.to) ?? zones[zones.length - 1]!;
export const axisCap = (view: ZoneView) => (view === 'hundred' ? C.zonesHundred.cap : C.zonesLifecycle.cap);

/** Adaptive zone widths (lifecycle view): share of drawn dots, floor `min`, normalised to 1 (floor kept after normalising). */
export function zoneWidths(counts: number[], min: number = C.ZONE_MIN_SHARE): number[] {
  const n = counts.length; const total = counts.reduce((s, c) => s + c, 0);
  if (!n) return [];
  if (!total || min * n >= 1) return counts.map(() => 1 / n);
  const fixed = new Set<number>();
  for (let guard = 0; guard < n; guard++) {
    const free = 1 - fixed.size * min;
    const rest = counts.reduce((s, c, i) => (fixed.has(i) ? s : s + c), 0);
    let changed = false;
    for (let i = 0; i < n; i++) if (!fixed.has(i) && (rest === 0 || (counts[i]! / rest) * free < min)) { fixed.add(i); changed = true; }
    if (!changed) break;
  }
  const free = 1 - fixed.size * min;
  const rest = counts.reduce((s, c, i) => (fixed.has(i) ? s : s + c), 0);
  return counts.map((c, i) => (fixed.has(i) ? min : rest ? (c / rest) * free : free / Math.max(1, n - fixed.size)));
}
/** x scale: hundred = linear 0 → cap (clamped); lifecycle = adaptive zone widths, linear by age inside a zone. Returns 0..1. */
export function makeScale(view: ZoneView, zones: Zone[], widths?: number[]) {
  const cap = axisCap(view);
  if (view === 'hundred') return (age: number) => Math.min(Math.max(age, 0), cap) / cap;
  const w = widths ?? zones.map(() => 1 / zones.length);
  const starts = w.map((_, i) => w.slice(0, i).reduce((s, x) => s + x, 0));
  return (age: number) => {
    const a = Math.min(Math.max(age, 0), cap); const z = zoneOf(zones, a);
    const to = Number.isFinite(z.to) ? z.to : cap; const span = Math.max(1, to - z.from);
    return starts[z.i]! + Math.min(1, (a - z.from) / span) * w[z.i]!;
  };
}
/** Zone boxes in 0..1 (start, width). */
export function zoneBoxes(view: ZoneView, zones: Zone[], widths?: number[]) {
  if (view === 'hundred') { const cap = axisCap(view); return zones.map((z) => ({ start: z.from / cap, width: (Math.min(Number.isFinite(z.to) ? z.to : cap, cap) - z.from) / cap })); }
  const w = widths ?? zones.map(() => 1 / zones.length);
  return w.map((width, i) => ({ start: w.slice(0, i).reduce((s, x) => s + x, 0), width }));
}
/** Phase strip pills: consecutive zones with the same phase merge. */
export function phasePills(zones: Zone[]) {
  const out: { phase: string; from: number; to: number }[] = [];
  for (const z of zones) { if (!z.phase) continue; const l = out[out.length - 1]; if (l && l.phase === z.phase) l.to = z.i; else out.push({ phase: z.phase, from: z.i, to: z.i }); }
  return out;
}
/** ทุก 100 วัน axis ticks every 200 days (`0 · 200 · … · 1,800+`). */
export const hundredTicks = () => Array.from({ length: C.zonesHundred.cap / 200 + 1 }, (_, i) => i * 200).map((d) => [d, d === C.zonesHundred.cap ? `${d.toLocaleString('en-US')}+` : d.toLocaleString('en-US')] as const);

/* ================= §1.3 KPI ================= */
export const isDrawable = (r: ContractAgeRow) => r.age_days != null && (r.status === 'ACTIVE' || r.status === 'ENDED');
export const activeOf = (rows: ContractAgeRow[], svc?: AgeSvc) => rows.filter((r) => r.status === 'ACTIVE' && r.age_days != null && (!svc || r.service_line === svc));
export const endedOf = (rows: ContractAgeRow[], svc?: AgeSvc) => rows.filter((r) => r.status === 'ENDED' && r.age_days != null && (!svc || r.service_line === svc));
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}
/** Median of active contracts only. */
export const medianActive = (rows: ContractAgeRow[], svc: AgeSvc) => median(activeOf(rows, svc).map((r) => r.age_days!));
/** Zone of the current view with the most active contracts of the service (tie → lower zone). */
export function topZone(rows: ContractAgeRow[], svc: AgeSvc, zones: Zone[]): { zone: Zone; count: number } | null {
  const act = activeOf(rows, svc); if (!act.length) return null;
  let best: { zone: Zone; count: number } | null = null;
  for (const z of zones) { const n = act.filter((r) => zoneOf(zones, r.age_days!).i === z.i).length; if (!best || n > best.count) best = { zone: z, count: n }; }
  return best;
}

/* ================= §2.5 Go Live period ================= */
export type GoLivePeriod = { kind: 'all' } | { kind: 'month' | 'quarter'; key: string };
export const ALL_PERIOD: GoLivePeriod = { kind: 'all' };
export const inPeriod = (r: ContractAgeRow, p: GoLivePeriod) => p.kind === 'all' || (p.kind === 'month' ? r.go_live_month === p.key : r.go_live_quarter === p.key);
export const periodLabelOf = (p: GoLivePeriod) => (p.kind === 'all' ? '' : p.kind === 'month' ? monthLabel(p.key) : quarterLabel(p.key));
/** Stepper bounds: first Go Live period → current period. */
export function periodBounds(rows: ContractAgeRow[], kind: 'month' | 'quarter', today: string) {
  const keys = rows.map((r) => (kind === 'month' ? r.go_live_month : r.go_live_quarter)).filter((x): x is string => !!x).sort();
  const cur = kind === 'month' ? monthKey(today) : quarterKey(today);
  return { first: keys[0] ?? cur, current: cur };
}
/** Dots drawn: active (+ ended when shown, + ended of the selected Go Live period even when not shown). */
export function drawnRows(rows: ContractAgeRow[], showEnded: boolean, p: GoLivePeriod) {
  return rows.filter((r) => isDrawable(r) && (r.status === 'ACTIVE' || showEnded || (p.kind !== 'all' && inPeriod(r, p))));
}
export type PeriodSummary = { n: number; orm: number; marcom: number; active: number; pct: number | null; minAge: number | null; maxAge: number | null; medianZone: Zone | null; notRenewed: number[]; lost: number[] };
export function periodSummary(rows: ContractAgeRow[], p: GoLivePeriod, zones: Zone[]): PeriodSummary {
  const list = rows.filter((r) => isDrawable(r) && inPeriod(r, p));
  const act = list.filter((r) => r.status === 'ACTIVE'); const ages = act.map((r) => r.age_days!);
  const med = median(ages);
  return {
    n: list.length, orm: list.filter((r) => r.service_line === 'ORM').length, marcom: list.filter((r) => r.service_line === 'Marcom').length,
    active: act.length, pct: list.length ? Math.round((act.length / list.length) * 100) : null,
    minAge: ages.length ? Math.min(...ages) : null, maxAge: ages.length ? Math.max(...ages) : null, medianZone: med == null ? null : zoneOf(zones, med),
    notRenewed: list.filter((r) => r.outcome === 'NOT_RENEWED').map((r) => r.age_days!).sort((a, b) => a - b),
    lost: list.filter((r) => r.outcome === 'LOST').map((r) => r.age_days!).sort((a, b) => a - b),
  };
}

/* ================= §2.3 beeswarm ================= */
/** Vertical offsets so dots of radius r at the given x (px) never overlap. Order: 0, +d, −d, +2d … */
export function beeswarm(xs: number[], r: number): number[] {
  const d = r * 2 + 0.6; const placed: { x: number; y: number }[] = []; const out: number[] = new Array(xs.length).fill(0);
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  for (const { x, i } of order) {
    const near = placed.filter((p) => Math.abs(p.x - x) < d);
    let y = 0;
    for (let k = 0; k < 400; k++) {
      y = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (d * 0.9);
      if (near.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= d * d)) break;
    }
    placed.push({ x, y }); out[i] = y;
  }
  return out;
}

/* ================= §2.4 hover ================= */
export function zoneCounts(rows: ContractAgeRow[], zone: Zone, zones: Zone[], showEnded: boolean) {
  const inZ = (r: ContractAgeRow) => zoneOf(zones, r.age_days!).i === zone.i;
  return {
    ORM: activeOf(rows, 'ORM').filter(inZ).length, Marcom: activeOf(rows, 'Marcom').filter(inZ).length,
    ended: showEnded ? endedOf(rows).filter(inZ).length : null,
  };
}

/* ================= reasons ================= */
export const reasonOf = (reasons: RenewalReason[], r: ContractAgeRow) => reasons.find((x) => r.chain_ids.includes(x.contract_id) && x.contract_id === r.contract_id) ?? reasons.find((x) => r.chain_ids.includes(x.contract_id)) ?? null;

/* ================= §3 distribution ================= */
export type DistCell = {
  zone: Zone; pct: number | null; active: number; ended: number;
  pass: { kind: 'last' } | { kind: 'none' } | { kind: 'rate'; pct: number; a: number; b: number };
  reasons: { kind: 'none' } | { kind: 'few'; n: number } | { kind: 'rank'; top: { key: string; n: number }[]; unrecorded: number };
};
export function distribution(rows: ContractAgeRow[], svc: AgeSvc, zones: Zone[], showEnded: boolean, reasons: RenewalReason[]) {
  const act = activeOf(rows, svc), end = endedOf(rows, svc);
  const base = showEnded ? act.length + end.length : act.length;
  const zi = (r: ContractAgeRow) => zoneOf(zones, r.age_days!).i;
  const cells: DistCell[] = zones.map((z, idx) => {
    const a = act.filter((r) => zi(r) === z.i), e = end.filter((r) => zi(r) === z.i);
    const num = showEnded ? a.length + e.length : a.length;
    const last = idx === zones.length - 1;
    const passed = [...act, ...end].filter((r) => r.age_days! >= z.to).length;
    const b = passed + e.length;
    const counts = new Map<string, number>(); let unrecorded = 0;
    for (const r of e) { const rec = reasonOf(reasons, r); if (!rec) { unrecorded++; continue; } for (const k of rec.primary) counts.set(k, (counts.get(k) ?? 0) + 1); }
    const top = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 3).map(([key, n]) => ({ key, n }));
    return {
      zone: z, pct: base ? (num / base) * 100 : null, active: a.length, ended: e.length,
      pass: last ? { kind: 'last' } : b === 0 ? { kind: 'none' } : { kind: 'rate', pct: Math.round((passed / b) * 100), a: passed, b },
      reasons: e.length === 0 ? { kind: 'none' } : e.length < C.REASON_MIN_ENDED ? { kind: 'few', n: e.length } : { kind: 'rank', top, unrecorded },
    };
  });
  return { cells, total: { active: act.length, ended: end.length, any: base > 0 } };
}
/** `<1%` for 0 < x < 1; else rounded. */
export const pctText = (v: number | null) => (v == null ? '—' : v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`);

/* ================= §4 churn table ================= */
export type ChurnRow = ContractAgeRow & { since_days: number; reason: RenewalReason | null; open_tickets: L0Ticket[]; lock: L0Ticket | null };
export const OPEN_STATUSES = ['NEW', 'ACK', 'IN_PROGRESS'];
export const ticketsOfChain = (tickets: L0Ticket[], r: ContractAgeRow) =>
  tickets.filter((t) => OPEN_STATUSES.includes(t.status) && r.chain_ids.some((id) => t.subject_ref.contract_id === id || t.payload.contract_id === id));
/** §6.3 lock: an open WELCOME_BACK (New / กำลังทำ / legacy ACK) on this contract id. Done / Cancelled releases it. */
export const openWelcomeBack = (tickets: L0Ticket[], contractId: string) =>
  tickets.find((t) => t.type === 'WELCOME_BACK' && OPEN_STATUSES.includes(t.status) && (t.subject_ref.contract_id === contractId || t.payload.contract_id === contractId)) ?? null;
export function churnRows(rows: ContractAgeRow[], today: string, reasons: RenewalReason[], tickets: L0Ticket[]): ChurnRow[] {
  return endedOf(rows).map((r) => ({ ...r, since_days: Math.max(0, dayDiff(r.ended_at!, today)), reason: reasonOf(reasons, r), open_tickets: ticketsOfChain(tickets, r), lock: openWelcomeBack(tickets, r.contract_id) }));
}
export const NO_REASON = '__NONE__';
export type HeatPick = { svc: AgeSvc; quarter: string | null; from: number; to: number; key: string };
export type ChurnSortKey = 'age' | 'since' | 'tickets';
export type ChurnSort = { by: ChurnSortKey; dir: 'desc' | 'asc' } | null;
export type ChurnFilter = { q: string; svc: AgeSvc | 'ALL'; outcome: AgeOutcome | 'ALL'; reasons: string[]; period: GoLivePeriod; heat: HeatPick | null };
export const EMPTY_CHURN_FILTER: ChurnFilter = { q: '', svc: 'ALL', outcome: 'ALL', reasons: [], period: ALL_PERIOD, heat: null };
/** Search EN, TH and contract id; every word must match; spaces / case / dots ignored. */
export function churnSearch(r: Pick<ContractAgeRow, 'hotel_name_en' | 'hotel_name_th' | 'contract_id'>, q: string) {
  const words = q.trim().split(/\s+/).map(normalizeName).filter(Boolean);
  if (!words.length) return true;
  const hay = [r.hotel_name_en, r.hotel_name_th, r.contract_id].filter((x): x is string => !!x).map(normalizeName);
  return words.every((w) => hay.some((h) => h.includes(w)));
}
export const reasonHit = (r: ChurnRow, picks: string[]) => !picks.length || (r.reason ? r.reason.primary.some((k) => picks.includes(k)) : picks.includes(NO_REASON));
export function filterChurn(list: ChurnRow[], f: ChurnFilter): ChurnRow[] {
  return list.filter((r) => churnSearch(r, f.q) && (f.svc === 'ALL' || r.service_line === f.svc) && (f.outcome === 'ALL' || r.outcome === f.outcome) && reasonHit(r, f.reasons) && inPeriod(r, f.period)
    && (!f.heat || (r.service_line === f.heat.svc && (!f.heat.quarter || r.go_live_quarter === f.heat.quarter) && r.age_days! >= f.heat.from && r.age_days! < f.heat.to)));
}
/** Default newest ended first; one sort at a time; ties by newest ended. */
export function sortChurn(list: ChurnRow[], s: ChurnSort): ChurnRow[] {
  const newest = (a: ChurnRow, b: ChurnRow) => (b.ended_at ?? '').localeCompare(a.ended_at ?? '') || a.contract_id.localeCompare(b.contract_id);
  if (!s) return [...list].sort(newest);
  const v = (r: ChurnRow) => (s.by === 'age' ? r.age_days! : s.by === 'since' ? r.since_days : r.open_tickets.length);
  return [...list].sort((a, b) => (s.dir === 'desc' ? v(b) - v(a) : v(a) - v(b)) || newest(a, b));
}
export const cycleSort = (s: ChurnSort, by: ChurnSortKey): ChurnSort => (!s || s.by !== by ? { by, dir: 'desc' } : s.dir === 'desc' ? { by, dir: 'asc' } : null);
/** Labels that appear as either primary reason of ended contracts, by count (+ unrecorded count). */
export function reasonOptions(list: ChurnRow[]) {
  const m = new Map<string, number>(); let none = 0;
  for (const r of list) { if (!r.reason) { none++; continue; } for (const k of new Set(r.reason.primary)) m.set(k, (m.get(k) ?? 0) + 1); }
  return { labels: [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, n]) => ({ key, n })), none };
}
export function pageOf<T>(list: T[], size: number, page: number) {
  const pages = Math.max(1, Math.ceil(list.length / size)); const cur = Math.min(Math.max(1, page), pages);
  return { pages, cur, rows: list.slice((cur - 1) * size, cur * size) };
}

/* ================= §4.4 survival by Go Live quarter ================= */
export type HeatCell = { kind: 'value'; p: number; a: number; b: number; faded: boolean } | { kind: 'empty' };
export type HeatRow = { quarter: string | null; label: string; state: 'ok' | 'none' | 'young'; survive: HeatCell[]; drop: HeatCell[] };
/** Contiguous calendar quarters from the first Go Live quarter (both services) to the current quarter. */
export function heatQuarters(rows: ContractAgeRow[], today: string): string[] {
  const keys = rows.filter(isDrawable).map((r) => r.go_live_quarter!).sort();
  if (!keys.length) return [];
  const out: string[] = []; const last = quarterKey(today);
  for (let k = keys[0]!; k <= last && out.length < 200; k = nextPeriod('quarter', k, 1)) out.push(k);
  return out;
}
export function heatCells(list: ContractAgeRow[], startDay: string, today: string) {
  const ms = C.HEAT_MILESTONES; const elapsed = dayDiff(startDay, today);
  const cell = (a: number, b: number, reached: boolean): HeatCell => (!reached || b === 0 ? { kind: 'empty' } : { kind: 'value', p: a / b, a, b, faded: b < C.HEAT_MIN_BASE });
  const ended = (r: ContractAgeRow) => r.status === 'ENDED';
  const survive = ms.map((m) => { const a = list.filter((r) => r.age_days! >= m).length; const b = list.filter((r) => r.age_days! >= m || (ended(r) && r.age_days! < m)).length; return cell(a, b, elapsed >= m); });
  const drop = ms.map((m, i) => { const lo = i ? ms[i - 1]! : 0; const a = list.filter((r) => ended(r) && r.age_days! >= lo && r.age_days! < m).length; const b = list.filter((r) => r.age_days! >= lo && (r.age_days! >= m || ended(r))).length; return cell(a, b, elapsed >= m); });
  return { survive, drop };
}
export function survivalTable(rows: ContractAgeRow[], svc: AgeSvc, today: string, quarters: string[]): HeatRow[] {
  const mine = rows.filter((r) => isDrawable(r) && r.service_line === svc);
  const row = (quarter: string | null, list: ContractAgeRow[], start: string, label: string): HeatRow => {
    if (!list.length) return { quarter, label, state: 'none', survive: [], drop: [] };
    if (list.every((r) => r.status === 'ACTIVE' && r.age_days! < C.HEAT_MILESTONES[0]!)) return { quarter, label, state: 'young', survive: [], drop: [] };
    return { quarter, label, state: 'ok', ...heatCells(list, start, today) };
  };
  const first = quarters[0] ? quarterStart(quarters[0]) : today;
  return [row(null, mine, first, 'ทุกไตรมาส'), ...quarters.map((q) => row(q, mine.filter((r) => r.go_live_quarter === q), quarterStart(q), quarterLabel(q)))];
}
/** Colour alpha: 0.06 + 0.8·p (linear 0–100%). */
export const heatAlpha = (p: number) => 0.06 + 0.8 * Math.min(1, Math.max(0, p));
export const HEAT_RANGES = C.HEAT_MILESTONES.map((m, i) => ({ from: i ? C.HEAT_MILESTONES[i - 1]! : 0, to: m }));

/* ================= §5 drawer: package / timeline ================= */
export type UpsellLine = { sku: string; price: number };
/** Latest cycle of `contract_price_history` for the chain. */
export function lastCycle(history: PriceHistoryRow[], chainIds: string[]): PriceHistoryRow | null {
  return history.filter((h) => chainIds.includes(h.contract_id)).sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.cycle_no - a.cycle_no)[0] ?? null;
}
const thb = (n: number) => n.toLocaleString('en-US');
/** `Monthly fee 8,500 บาท + Commission 10%` · fee only / commission only as stored. */
export function rateText(h: Pick<PriceHistoryRow, 'fee_amount' | 'commission_pct'> | null): string {
  if (!h) return '—';
  const fee = h.fee_amount != null && h.fee_amount > 0 ? `Monthly fee ${thb(h.fee_amount)} บาท` : null;
  const com = h.commission_pct != null && h.commission_pct > 0 ? `Commission ${h.commission_pct}%` : null;
  return [fee, com].filter(Boolean).join(' + ') || '—';
}
export type TimelineEvent = { at: string; text: string; tone: 'neutral' | 'green' | 'amber' | 'red' };
export function timelineOf(r: ContractAgeRow, ctx: { history: PriceHistoryRow[]; tickets: L0Ticket[]; firstMeeting?: string | null; lowSurveys?: { at: string; score: number }[]; typeLabel: (t: L0Ticket) => string }): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  if (r.signed_at) ev.push({ at: r.signed_at.slice(0, 10), text: 'เซ็นสัญญา', tone: 'neutral' });
  if (r.first_go_live_at) ev.push({ at: r.first_go_live_at.slice(0, 10), text: 'Go Live', tone: 'green' });
  if (ctx.firstMeeting) ev.push({ at: ctx.firstMeeting.slice(0, 10), text: 'ประชุม / รายงานรายเดือนครั้งแรก', tone: 'neutral' });
  ctx.history.filter((h) => h.source === 'RENEWAL' && r.chain_ids.includes(h.contract_id)).forEach((h, i) => ev.push({ at: h.effective_from, text: `ต่อสัญญาครั้งที่ ${i + 1}`, tone: 'green' }));
  for (const t of ctx.tickets) if (r.chain_ids.some((id) => t.subject_ref.contract_id === id || t.payload.contract_id === id)) ev.push({ at: t.created_at.slice(0, 10), text: `Ticket #${t.ticket_id} · ${ctx.typeLabel(t)}`, tone: 'amber' });
  for (const s of ctx.lowSurveys ?? []) ev.push({ at: s.at.slice(0, 10), text: `คะแนนบริการต่ำ ${s.score}`, tone: 'amber' });
  if (r.notice_at) ev.push({ at: r.notice_at.slice(0, 10), text: r.outcome === 'LOST' ? 'แจ้งยกเลิก' : 'แจ้งไม่ต่อ', tone: 'red' });
  if (r.ended_at) ev.push({ at: r.ended_at, text: 'สิ้นสุดสัญญา', tone: 'red' });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}
