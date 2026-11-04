/* PS Dashboard · Tab สัญญา & ราคา R4 — card ⑤ ระยะเวลา Setup + On-board / Off-board queue table.
 * Pure rules only (no React, no storage). `getSetupTiming` is the `v_ps_setup_timing` helper: computed from
 * stage timestamps every day, never snapshotted. Unit = service contract (one On-board card). No averages of
 * durations anywhere — ranges use "ส่วนใหญ่" (middle 50 %), changes use the median. */
import { monthKey, quarterKey, monthLabel, quarterLabel, nextPeriod, type GoLivePeriod } from './contract-age';
import { versionFor, type KpiKey, type KpiValues, type SetupKpiVersion, type Thr } from './setup-kpi-settings';

export type { GoLivePeriod };
export type SetupSvc = 'ORM' | 'Marcom';
export type SetupVariant = 'ORM' | 'MARCOM_META_TIKTOK' | 'MARCOM_GMB';
export type LaneKey = 'p1' | 'p2s' | 'p2o' | 'w' | 'p3';
export const LANE_KEYS: readonly LaneKey[] = ['p1', 'p2s', 'p2o', 'w', 'p3'];
export type LaneState = 'not_started' | 'running' | 'done' | 'na';
export type SetupStatus = 'ok' | 'near' | 'late';

/** Input = one On-board card with its stage timestamps (mapped from v_servicing_stage_cards or the DEMO additions). */
export type SetupInput = {
  card_id: string; hotel_id: string; hotel_name: string; service_variant: SetupVariant;
  created_at: string; approved_at: string | null; specialist_handover_done_at: string | null;
  meeting_created_at: string | null; meeting_date: string | null; go_live_at: string | null;
  ae: string | null; specialist: string | null; orm_team: string | null; marcom_owner: string | null;
  survey1?: number | null; survey2?: number | null;
};
export type LaneTiming = { key: LaneKey; state: LaneState; start: string | null; end: string | null; days: number | null; from: number | null; to: number | null };
export type SetupTiming = {
  card_id: string; hotel_id: string; hotel_name: string; svc: SetupSvc; gmb: boolean; day0: string; go_live: string | null;
  elapsed: number; done: boolean; lanes: Record<LaneKey, LaneTiming>; current: LaneKey[]; input: SetupInput;
};

const DAY = 86_400_000;
/** Asia/Bangkok calendar date of a timestamp (`yyyy-mm-dd` strings pass through). */
export const bkkDate = (s: string) => (s.length === 10 ? s : new Date(Date.parse(s) + 7 * 3_600_000).toISOString().slice(0, 10));
const ord = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY);
/** Calendar days a → b, integer, never negative. */
export const dayDiff = (a: string, b: string) => Math.max(0, ord(bkkDate(b)) - ord(bkkDate(a)));
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d.slice(0, 10)}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/* ================= §3 timing model ================= */
export function getSetupTiming(c: SetupInput, today: string): SetupTiming {
  const day0 = bkkDate(c.created_at);
  const live = c.go_live_at ? bkkDate(c.go_live_at) : null;
  const svc: SetupSvc = c.service_variant === 'ORM' ? 'ORM' : 'Marcom';
  const gmb = c.service_variant === 'MARCOM_GMB';
  const stop = live ?? today;
  const elapsed = dayDiff(day0, stop);
  const lane = (key: LaneKey, startRaw: string | null, endRaw: string | null, applies: boolean): LaneTiming => {
    if (!applies) return { key, state: 'na', start: null, end: null, days: null, from: null, to: null };
    const start = startRaw ? bkkDate(startRaw) : null;
    if (!start || start > stop) return { key, state: 'not_started', start, end: null, days: null, from: null, to: null };
    let end = endRaw ? bkkDate(endRaw) : null;
    if (end && end > stop) end = live; // end still in the future → running (done contracts close at Go Live)
    if (!end && live) end = live; // a done contract closes every open lane at Go Live
    const from = dayDiff(day0, start);
    if (end) return { key, state: 'done', start, end, days: dayDiff(start, end), from, to: dayDiff(day0, end) };
    return { key, state: 'running', start, end: null, days: dayDiff(start, today), from, to: elapsed };
  };
  const lanes: Record<LaneKey, LaneTiming> = {
    p1: lane('p1', c.created_at, c.approved_at, true),
    p2s: lane('p2s', c.approved_at, c.specialist_handover_done_at, svc === 'ORM'),
    p2o: lane('p2o', c.approved_at, gmb ? c.go_live_at : c.meeting_created_at, true),
    w: lane('w', c.meeting_created_at, c.meeting_date, !gmb),
    p3: lane('p3', c.meeting_date, c.go_live_at, !gmb),
  };
  const current = live ? [] : LANE_KEYS.filter((k) => lanes[k].state === 'running');
  return { card_id: c.card_id, hotel_id: c.hotel_id, hotel_name: c.hotel_name, svc, gmb, day0, go_live: live, elapsed, done: !!live, lanes, current, input: c };
}

/* ================= §3 statuses ================= */
export const laneKpiKey = (key: LaneKey, svc: SetupSvc): KpiKey | null =>
  key === 'p1' ? 'p1' : key === 'p2s' ? 'p2s' : key === 'p2o' ? (svc === 'ORM' ? 'p2o_orm' : 'p2o_mc') : key === 'p3' ? (svc === 'ORM' ? 'p3_orm' : 'p3_mc') : null;
export const totalKey = (svc: SetupSvc): KpiKey => (svc === 'ORM' ? 'total_orm' : 'total_mc');
export const statusOf = (days: number, t: Thr): SetupStatus => (days <= t.ok ? 'ok' : days <= t.due ? 'near' : 'late');
const RANK: Record<SetupStatus, number> = { ok: 0, near: 1, late: 2 };
export const worst = (xs: SetupStatus[]): SetupStatus => xs.reduce<SetupStatus>((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok');
export type SetupStatusResult = { lanes: Partial<Record<LaneKey, SetupStatus>>; total: SetupStatus; contract: SetupStatus };
/** `getSetupStatus(card, version)`: lane / total / contract status. Lane `w` has no status. */
export function getSetupStatus(t: SetupTiming, v: KpiValues): SetupStatusResult {
  const lanes: Partial<Record<LaneKey, SetupStatus>> = {};
  for (const k of LANE_KEYS) {
    const l = t.lanes[k]; const kk = laneKpiKey(k, t.svc);
    if (kk && l.days != null && (l.state === 'running' || l.state === 'done')) lanes[k] = statusOf(l.days, v[kk]);
  }
  const total = statusOf(t.elapsed, v[totalKey(t.svc)]);
  return { lanes, total, contract: worst([...Object.values(lanes), total]) };
}
/** Status with the version effective at the card's On-board created date (§4.3). */
export const statusFor = (t: SetupTiming, versions: readonly SetupKpiVersion[]) => getSetupStatus(t, versionFor(versions, t.day0).values);
export const thrFor = (t: SetupTiming, versions: readonly SetupKpiVersion[], key: LaneKey | 'total'): Thr | null => {
  const v = versionFor(versions, t.day0).values; const k = key === 'total' ? totalKey(t.svc) : laneKpiKey(key, t.svc);
  return k ? v[k] : null;
};

/* ================= §5 chart lanes ================= */
export type SetupTab = 'all' | 'orm' | 'mc';
export const tabSvcs = (tab: SetupTab): SetupSvc[] => (tab === 'all' ? ['ORM', 'Marcom'] : tab === 'orm' ? ['ORM'] : ['Marcom']);
export type Band = 'p1' | 'p2' | 'w' | 'p3' | 'golive';
export type ChartLane = { id: string; band: Band; key: LaneKey | 'golive'; svcs: SetupSvc[]; label: string; kpiSvc: SetupSvc; reserved?: boolean };
/** Lanes bottom → top per filter tab (§5.2). Shared lanes in ภาพรวม use ORM values. */
export function chartLanes(tab: SetupTab): ChartLane[] {
  const both: SetupSvc[] = ['ORM', 'Marcom'];
  if (tab === 'all') return [
    { id: 'p1', band: 'p1', key: 'p1', svcs: both, label: '', kpiSvc: 'ORM' },
    { id: 'p2s', band: 'p2', key: 'p2s', svcs: ['ORM'], label: 'Specialist (ORM)', kpiSvc: 'ORM' },
    { id: 'p2o-orm', band: 'p2', key: 'p2o', svcs: ['ORM'], label: 'ORM', kpiSvc: 'ORM' },
    { id: 'p2o-mc', band: 'p2', key: 'p2o', svcs: ['Marcom'], label: 'Marcom', kpiSvc: 'Marcom' },
    { id: 'w', band: 'w', key: 'w', svcs: both, label: '', kpiSvc: 'ORM' },
    { id: 'p3-orm', band: 'p3', key: 'p3', svcs: ['ORM'], label: 'ORM', kpiSvc: 'ORM' },
    { id: 'p3-mc', band: 'p3', key: 'p3', svcs: ['Marcom'], label: 'Marcom MT', kpiSvc: 'Marcom' },
    { id: 'golive', band: 'golive', key: 'golive', svcs: both, label: '', kpiSvc: 'ORM' },
  ];
  const s: SetupSvc = tab === 'orm' ? 'ORM' : 'Marcom';
  return [
    { id: 'p1', band: 'p1', key: 'p1', svcs: [s], label: '', kpiSvc: s },
    { id: 'p2s', band: 'p2', key: 'p2s', svcs: [s], label: 'Specialist', kpiSvc: s, ...(s === 'Marcom' ? { reserved: true } : {}) },
    { id: 'p2o', band: 'p2', key: 'p2o', svcs: [s], label: s === 'ORM' ? 'ORM' : 'Marcom', kpiSvc: s },
    { id: 'w', band: 'w', key: 'w', svcs: [s], label: '', kpiSvc: s },
    { id: 'p3', band: 'p3', key: 'p3', svcs: [s], label: s === 'ORM' ? 'ORM' : 'Marcom MT', kpiSvc: s },
    { id: 'golive', band: 'golive', key: 'golive', svcs: [s], label: '', kpiSvc: s },
  ];
}

/* ================= §2 Go Live period ================= */
export const inGoLive = (t: SetupTiming, p: GoLivePeriod) =>
  !!t.go_live && (p.kind === 'all' || (p.kind === 'month' ? monthKey(t.go_live) === p.key : quarterKey(t.go_live) === p.key));
export function goLiveBounds(ts: readonly SetupTiming[], kind: 'month' | 'quarter', today: string) {
  const keys = ts.flatMap((t) => (t.go_live ? [kind === 'month' ? monthKey(t.go_live) : quarterKey(t.go_live)] : [])).sort();
  const current = kind === 'month' ? monthKey(today) : quarterKey(today);
  return { first: keys[0] ?? current, current };
}
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const dayMonth = (d: string) => `${+d.slice(8, 10)} ${TH_MON[+d.slice(5, 7) - 1]}`;
/** `ต.ค. 69 (ถึง 30 ต.ค.)` for the current period; `ทั้งหมด` for all. */
export function periodTitle(p: GoLivePeriod, today: string) {
  if (p.kind === 'all') return 'ทั้งหมด';
  const label = p.kind === 'month' ? monthLabel(p.key) : quarterLabel(p.key);
  const current = p.kind === 'month' ? monthKey(today) : quarterKey(today);
  return p.key === current ? `${label} (ถึง ${dayMonth(today)})` : label;
}
export const shiftPeriod = (p: GoLivePeriod, step: number): GoLivePeriod => (p.kind === 'all' ? p : { kind: p.kind, key: nextPeriod(p.kind, p.key, step) });

/* ================= §5.4 KPI boxes (settings only, never history) ================= */
export type KpiBox = { start: number; ok: number; due: number };
export function kpiBox(key: LaneKey | 'golive', svc: SetupSvc, v: KpiValues): KpiBox | null {
  const p1 = v.p1;
  if (key === 'p1') return { start: 0, ok: p1.ok, due: p1.due };
  if (key === 'p2s' || key === 'p2o') {
    const t = key === 'p2s' ? v.p2s : svc === 'ORM' ? v.p2o_orm : v.p2o_mc;
    return { start: p1.due, ok: p1.due + t.ok, due: p1.due + t.due };
  }
  if (key === 'p3') {
    const start = p1.due + (svc === 'ORM' ? Math.max(v.p2s.due, v.p2o_orm.due) : v.p2o_mc.due);
    const t = svc === 'ORM' ? v.p3_orm : v.p3_mc;
    return { start, ok: start + t.ok, due: start + t.due };
  }
  return null;
}
export const X_CAP = 21;
export const X_MAX = 22;
export const X_TICKS = [0, 3, 5, 7, 10, 14, 17, 21] as const;
export const capX = (d: number) => Math.min(Math.max(d, 0), X_CAP);

/* ================= dots ================= */
export type SetupDot = { t: SetupTiming; laneId: string; day: number; status: SetupStatus | null };
export function laneDots(ts: readonly SetupTiming[], lane: ChartLane, st: Map<string, SetupStatusResult>, period: GoLivePeriod): SetupDot[] {
  if (lane.reserved) return [];
  if (lane.key === 'golive') return ts.filter((t) => t.done && lane.svcs.includes(t.svc) && inGoLive(t, period)).map((t) => ({ t, laneId: lane.id, day: t.elapsed, status: st.get(t.card_id)?.total ?? null }));
  const key = lane.key;
  return ts.filter((t) => !t.done && lane.svcs.includes(t.svc) && t.lanes[key].state === 'running')
    .map((t) => ({ t, laneId: lane.id, day: t.elapsed, status: key === 'w' ? null : st.get(t.card_id)?.lanes[key] ?? null }));
}

/* ================= §7 quick filters ================= */
export function quickCounts(inProgress: readonly SetupTiming[], st: Map<string, SetupStatusResult>) {
  const c = { late: 0, near: 0, ok: 0 };
  for (const t of inProgress) c[st.get(t.card_id)?.contract ?? 'ok']++;
  return c;
}
export const matchesQuick = (t: SetupTiming, quick: SetupStatus | null, st: Map<string, SetupStatusResult>) => !quick || st.get(t.card_id)?.contract === quick;

/* ================= §8.3 ส่วนใหญ่ ================= */
export function quantile(values: readonly number[], f: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b); const at = (s.length - 1) * f;
  const lo = s[Math.floor(at)]!, hi = s[Math.ceil(at)]!;
  return lo + (hi - lo) * (at - Math.floor(at));
}
export const median = (values: readonly number[]) => quantile(values, 0.5);
/** Middle 50 % (25th–75th percentile, whole days); fewer than 4 values → min–max. */
export function mostRange(values: readonly number[]): { a: number; b: number } | null {
  if (!values.length) return null;
  if (values.length < 4) return { a: Math.min(...values), b: Math.max(...values) };
  return { a: Math.round(quantile(values, 0.25)!), b: Math.round(quantile(values, 0.75)!) };
}
export const mostText = (values: readonly number[]) => { const r = mostRange(values); return !r ? '—' : r.a === r.b ? `${r.a} วัน` : `${r.a}–${r.b} วัน`; };
/** 80th percentile rounded up. */
export const p80 = (values: readonly number[]) => { const q = quantile(values, 0.8); return q == null ? null : Math.ceil(q - 1e-9); };

/* ================= §8 ภาพรวมราย stage ================= */
export type StageRow = { lane: ChartLane; due: number | null; n: number; orm: number; mc: number; ok: number; near: number; late: number };
export function stageSummary(ts: readonly SetupTiming[], tab: SetupTab, latest: KpiValues, st: Map<string, SetupStatusResult>, quick: SetupStatus | null, period: GoLivePeriod) {
  const lanes = chartLanes(tab).filter((l) => !l.reserved && l.key !== 'golive');
  const inProg = ts.filter((t) => !t.done && tabSvcs(tab).includes(t.svc) && matchesQuick(t, quick, st));
  const rows: StageRow[] = lanes.map((lane) => {
    const key = lane.key as LaneKey;
    const at = inProg.filter((t) => lane.svcs.includes(t.svc) && t.lanes[key].state === 'running');
    const kk = laneKpiKey(key, lane.kpiSvc);
    const c = { ok: 0, near: 0, late: 0 };
    if (key !== 'w') for (const t of at) c[st.get(t.card_id)?.lanes[key] ?? 'ok']++;
    return { lane, due: kk ? latest[kk].due : null, n: at.length, orm: at.filter((t) => t.svc === 'ORM').length, mc: at.filter((t) => t.svc === 'Marcom').length, ...c };
  });
  const goSvc: SetupSvc = tab === 'mc' ? 'Marcom' : 'ORM';
  const went = ts.filter((t) => t.done && tabSvcs(tab).includes(t.svc) && inGoLive(t, period));
  const over = went.filter((t) => st.get(t.card_id)?.total === 'late').length;
  return { rows, golive: { n: went.length, over, due: latest[totalKey(goSvc)].due } };
}

/* ================= §9 เปรียบเทียบผลงาน ================= */
export type CompareDef = { id: string; label: string; svc: SetupSvc | null; lane: LaneKey | 'total'; total: boolean };
export function compareDefs(tab: SetupTab): CompareDef[] {
  const tot = (s: SetupSvc): CompareDef => ({ id: `total-${s}`, label: s === 'ORM' ? 'รวม On-board → Go Live · ORM' : 'รวม On-board → Go Live · Marcom', svc: s, lane: 'total', total: true });
  if (tab === 'all') return [tot('ORM'), tot('Marcom')];
  if (tab === 'orm') return [tot('ORM'),
    { id: 'p1', label: 'ช่วง AE', svc: 'ORM', lane: 'p1', total: false },
    { id: 'p2s', label: 'ช่วงเตรียมระบบ · Specialist (ORM)', svc: 'ORM', lane: 'p2s', total: false },
    { id: 'p2o', label: 'ช่วงเตรียมระบบ · ORM', svc: 'ORM', lane: 'p2o', total: false },
    { id: 'w', label: 'รอวันประชุม · ORM', svc: 'ORM', lane: 'w', total: false },
    { id: 'p3', label: 'ช่วงก่อน Go Live · ORM', svc: 'ORM', lane: 'p3', total: false }];
  return [tot('Marcom'),
    { id: 'p1', label: 'ช่วง AE', svc: 'Marcom', lane: 'p1', total: false },
    { id: 'p2o', label: 'ช่วงเตรียมระบบ · Marcom', svc: 'Marcom', lane: 'p2o', total: false },
    { id: 'w', label: 'รอวันประชุม · Marcom MT', svc: 'Marcom', lane: 'w', total: false },
    { id: 'p3', label: 'ช่วงก่อน Go Live · Marcom MT', svc: 'Marcom', lane: 'p3', total: false }];
}
export type CompareCell = { values: number[]; n: number; onTime: number | null; pct: number | null; median: number | null };
/** Only done values of contracts that went live; ทันกำหนด = not late by each contract's own version. */
export function compareCell(went: readonly SetupTiming[], def: CompareDef, versions: readonly SetupKpiVersion[]): CompareCell {
  const vals: { d: number; t: SetupTiming }[] = [];
  for (const t of went) {
    if (def.svc && t.svc !== def.svc) continue;
    if (def.lane === 'total') { vals.push({ d: t.elapsed, t }); continue; }
    const l = t.lanes[def.lane];
    if (l.state === 'done' && l.days != null) vals.push({ d: l.days, t });
  }
  const values = vals.map((x) => x.d);
  if (def.lane === 'w') return { values, n: values.length, onTime: null, pct: null, median: median(values) };
  const onTime = vals.filter(({ d, t }) => { const thr = thrFor(t, versions, def.lane); return !thr || statusOf(d, thr) !== 'late'; }).length;
  return { values, n: values.length, onTime, pct: values.length ? Math.round((onTime / values.length) * 100) : null, median: median(values) };
}
const fmt1 = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 1 });
/** Time rows: median A − B → เร็วขึ้น / ช้าลง n วัน / 0 วัน (never ดีขึ้น / แย่ลง / เท่าเดิม, never “ทัน ±n จุด”). */
export function timeChange(a: number | null, b: number | null): { text: string; tone: 'good' | 'bad' | 'flat' } | null {
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  return d < 0 ? { text: `เร็วขึ้น ${fmt1(-d)} วัน`, tone: 'good' } : d > 0 ? { text: `ช้าลง ${fmt1(d)} วัน`, tone: 'bad' } : { text: '0 วัน', tone: 'flat' };
}
export function surveyChange(a: number | null, b: number | null): { text: string; tone: 'good' | 'bad' | 'flat' } | null {
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  return d > 0 ? { text: `+${d.toFixed(1)} คะแนน`, tone: 'good' } : d < 0 ? { text: `−${(-d).toFixed(1)} คะแนน`, tone: 'bad' } : { text: '0 คะแนน', tone: 'flat' };
}
export function pctChange(a: number | null, b: number | null): { text: string; tone: 'good' | 'bad' | 'flat' } | null {
  if (a == null || b == null) return null;
  const d = Math.round(a - b);
  return d > 0 ? { text: `+${d}%`, tone: 'good' } : d < 0 ? { text: `−${-d}%`, tone: 'bad' } : { text: '0%', tone: 'flat' };
}
export const pctTone = (p: number | null) => (p == null ? 'flat' : p >= 80 ? 'good' : p >= 60 ? 'watch' : 'bad');

/** Went-live set of one period key ('yyyy-mm' / 'yyyy-Qn') or a custom month range. */
export const wentIn = (ts: readonly SetupTiming[], svcs: SetupSvc[], kind: 'month' | 'quarter', key: string) =>
  ts.filter((t) => t.go_live && svcs.includes(t.svc) && (kind === 'month' ? monthKey(t.go_live) : quarterKey(t.go_live)) === key);
export const wentInRange = (ts: readonly SetupTiming[], svcs: SetupSvc[], from: string, to: string) =>
  ts.filter((t) => t.go_live && svcs.includes(t.svc) && monthKey(t.go_live) >= from && monthKey(t.go_live) <= to);
/** §9.2 equal-count candidates: earlier periods within 24 months / 8 quarters with ≥ 1 go-live, by |n − nA| then most recent. */
export function equalCountCandidates(ts: readonly SetupTiming[], svcs: SetupSvc[], kind: 'month' | 'quarter', keyA: string) {
  const nA = wentIn(ts, svcs, kind, keyA).length;
  const back = kind === 'month' ? 24 : 8;
  const list: { key: string; n: number; equal: boolean; recency: number }[] = [];
  for (let i = 1; i <= back; i++) {
    const key = nextPeriod(kind, keyA, -i); const n = wentIn(ts, svcs, kind, key).length;
    if (n >= 1) list.push({ key, n, equal: n === nA, recency: i });
  }
  list.sort((a, b) => Math.abs(a.n - nA) - Math.abs(b.n - nA) || a.recency - b.recency);
  return { nA, candidates: list.slice(0, 12), equalCount: list.filter((c) => c.equal).length };
}
const monthsBetween = (a: string, b: string) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
/** Custom range: from ≤ to and at most 24 months. */
export function rangeError(from: string, to: string): string | null {
  if (from > to) return 'เดือนเริ่มต้องไม่เกินเดือนสิ้นสุด';
  if (monthsBetween(from, to) + 1 > 24) return 'เลือกได้ไม่เกิน 24 เดือนต่อช่วง';
  return null;
}
export const countsDifferMuch = (a: number, b: number) => Math.max(a, b) > 0 && Math.abs(a - b) / Math.max(a, b) > 0.3;

/* ================= §10 quality ================= */
export function surveyMean(went: readonly SetupTiming[], which: 1 | 2, svc: SetupSvc | null): { mean: number; n: number } | null {
  const vals = went.filter((t) => !svc || t.svc === svc).flatMap((t) => { const v = which === 1 ? t.input.survey1 : t.input.survey2; return typeof v === 'number' ? [v] : []; });
  return vals.length ? { mean: vals.reduce((s, x) => s + x, 0) / vals.length, n: vals.length } : null; // survey scores are the only averages
}
/** First-time-right: ORM contracts went live with no HANDOVER_FIX ticket linked to the card. */
export function firstTimeRight(went: readonly SetupTiming[], fixCardIds: ReadonlySet<string>): { x: number; n: number; pct: number | null } {
  const orm = went.filter((t) => t.svc === 'ORM');
  const x = orm.filter((t) => !fixCardIds.has(t.card_id)).length;
  return { x, n: orm.length, pct: orm.length ? Math.round((x / orm.length) * 100) : null };
}
/** FTR shows `รอข้อมูล` until the flag is on and at least one HANDOVER_FIX ticket exists — never 100 % from missing data. */
export const ftrAvailable = (enabled: boolean, fixCount: number) => enabled && fixCount > 0;

/* ================= §4.2 PM panel base ================= */
/** Months of the 6-month base window ending this month. */
export function baseWindow(today: string) { const to = monthKey(today); return { from: nextPeriod('month', to, -5), to }; }
export function kpiBaseValues(ts: readonly SetupTiming[], key: KpiKey, today: string): number[] {
  const { from, to } = baseWindow(today);
  const went = ts.filter((t) => t.go_live && monthKey(t.go_live) >= from && monthKey(t.go_live) <= to);
  if (key === 'total_orm' || key === 'total_mc') return went.filter((t) => t.svc === (key === 'total_orm' ? 'ORM' : 'Marcom')).map((t) => t.elapsed);
  return went.flatMap((t) => LANE_KEYS.flatMap((k) => (laneKpiKey(k, t.svc) === key && t.lanes[k].state === 'done' && t.lanes[k].days != null ? [t.lanes[k].days!] : [])));
}
/** Share not late (≤ due), whole %. */
export const pctWithin = (values: readonly number[], t: Thr) => (values.length ? Math.round((values.filter((d) => d <= t.due).length / values.length) * 100) : null);

/* ================= §6 text helpers ================= */
/** Short status used by the day hover list. */
export function shortStatus(key: LaneKey | 'golive', days: number, thr: Thr | null, status: SetupStatus | null): string {
  if (key === 'w' || !thr) return 'ไม่มีกำหนด';
  if (key === 'golive') return days <= thr.due ? 'ทันเป้ารวม' : 'เกินเป้ารวม';
  if (status === 'ok') return 'ทันกำหนด';
  const left = thr.due - days;
  return left > 0 ? `เหลือ ${left} วัน` : left === 0 ? 'ครบกำหนดวันนี้' : `เลย ${-left} วัน`;
}
/** Tooltip lane row: `{กำลังทำ }{days} วัน / {due} · เหลือ n วัน | ครบกำหนดวันนี้ | เลย n วัน`. */
export function laneTip(l: LaneTiming, thr: Thr | null): string {
  if (l.state === 'not_started' || l.days == null) return 'ยังไม่ถึง';
  const run = l.state === 'running' ? 'กำลังทำ ' : '';
  if (l.key === 'w' || !thr) return `${run}${l.days} วัน · ไม่มีกำหนด`;
  const left = thr.due - l.days;
  const tail = left < 0 ? ` · เลย ${-left} วัน` : l.state !== 'running' ? '' : left === 0 ? ' · ครบกำหนดวันนี้' : ` · เหลือ ${left} วัน`;
  return `${run}${l.days} วัน / ${thr.due}${tail}`;
}

/* ================= §12 queue table ================= */
/** Same-service On-board cards in progress on the card's day 0 (incl. itself). */
export function queueCount(t: SetupTiming, all: readonly SetupTiming[]) {
  return all.filter((o) => o.svc === t.svc && o.day0 <= t.day0 && (!o.go_live || o.go_live > t.day0)).length;
}
export function queueLevel(n: number, svc: SetupSvc): 'เบา' | 'ปกติ' | 'หนัก' {
  return svc === 'ORM' ? (n <= 3 ? 'เบา' : n <= 5 ? 'ปกติ' : 'หนัก') : n <= 2 ? 'เบา' : n === 3 ? 'ปกติ' : 'หนัก';
}
export const BAND_SHORT: Record<LaneKey, string> = { p1: 'P1', p2s: 'P2', p2o: 'P2', w: 'รอวันประชุม', p3: 'P3' };
export const stageText = (t: SetupTiming) => [...new Set(t.current.map((k) => BAND_SHORT[k]))].join(' + ') || '—';
export function queueSummary(inQueue: readonly SetupTiming[], st: Map<string, SetupStatusResult>) {
  const has = (k: LaneKey[]) => inQueue.filter((t) => t.current.some((c) => k.includes(c))).length;
  return {
    n: inQueue.length, p1: has(['p1']), p2: has(['p2s', 'p2o']), w: has(['w']), p3: has(['p3']),
    laneLate: inQueue.filter((t) => t.current.some((k) => st.get(t.card_id)?.lanes[k] === 'late')).length,
    totalLate: inQueue.filter((t) => st.get(t.card_id)?.total === 'late').length,
  };
}
export const QUEUE_PAGE = 10;
