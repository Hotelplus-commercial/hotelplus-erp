/* PS Dashboard · Tab On-board / Off-board R1 — pure read-only helpers (the `v_onb_*` views live here as code,
 * never as database views). Built on getSetupTiming() / statusFor() / versionFor() (R4). Nothing here writes.
 * Day-left wording (§0.2) is the one wording for every per-contract status in this round. */
import { monthKey, monthLabel, nextPeriod } from './contract-age';
import { versionFor, type KpiKey, type SetupKpiVersion, type Thr } from './setup-kpi-settings';
import {
  LANE_KEYS, dayMonth, laneKpiKey, median, mostRange, p80, queueCount, queueLevel, thrFor, totalKey,
  type LaneKey, type SetupSvc, type SetupTiming,
} from './setup-timing';

export type Tone = 'green' | 'amber' | 'red' | 'grey';
export type DayLeft = { tone: Tone; text: string; left: number; flipTomorrow: boolean };
export const TONE_RANK: Record<Tone, number> = { grey: 0, green: 1, amber: 2, red: 3 };

/* ================= §0.2 Day left ================= */
export function dayLeft(days: number, t: Thr): DayLeft {
  const left = t.due - days;
  if (days > t.due) return { tone: 'red', text: `เลย ${days - t.due} วัน`, left, flipTomorrow: false };
  if (days === t.due) return { tone: 'amber', text: 'ครบกำหนดวันนี้ · พรุ่งนี้แดง', left, flipTomorrow: true };
  if (days > t.ok) {
    if (days === t.due - 1) return { tone: 'amber', text: 'พรุ่งนี้แดง', left, flipTomorrow: true };
    return { tone: 'amber', text: `อีก ${t.due - days + 1} วันแดง`, left, flipTomorrow: false };
  }
  if (days === t.ok) return { tone: 'green', text: 'พรุ่งนี้เหลือง', left, flipTomorrow: true };
  return { tone: 'green', text: `อีก ${t.ok - days + 1} วันเหลือง`, left, flipTomorrow: false };
}
export function waitLeft(meetingDate: string | null): DayLeft {
  return { tone: 'grey', text: meetingDate ? `ประชุม ${dayMonth(meetingDate)}` : 'รอวันประชุม', left: Number.POSITIVE_INFINITY, flipTomorrow: false };
}
export function doneStatus(days: number, t: Thr): { tone: Tone; text: string } {
  if (days <= t.ok) return { tone: 'green', text: 'ทัน' };
  if (days <= t.due) return { tone: 'amber', text: 'ทัน · ใกล้กำหนด' };
  return { tone: 'red', text: `เลย ${days - t.due} วัน` };
}
/** Total line; `done` = the contract went live. Neutral tone = 'grey'. */
export function totalLeft(e: number, t: Thr, done = false): { tone: Tone; text: string } {
  if (done) return e <= t.due ? { tone: 'green', text: 'ทันเป้ารวม' } : { tone: 'red', text: `เลยเป้ารวม ${e - t.due} วัน` };
  if (e > t.due) return { tone: 'red', text: `เลยเป้ารวม ${e - t.due} วัน` };
  if (e === t.due) return { tone: 'amber', text: 'ครบเป้ารวมวันนี้' };
  return { tone: e > t.ok ? 'amber' : 'grey', text: `เป้ารวมเหลือ ${t.due - e} วัน` };
}
/** One lane's running Day left (null when the lane is not running). */
export function laneLeft(t: SetupTiming, k: LaneKey, versions: readonly SetupKpiVersion[]): DayLeft | null {
  const l = t.lanes[k];
  if (t.done || l.state !== 'running' || l.days == null) return null;
  if (k === 'w') return waitLeft(t.input.meeting_date);
  const thr = thrFor(t, versions, k);
  return thr ? dayLeft(l.days, thr) : null;
}
/** Card status = running lane with the worst tone; ties → smallest left. Only `w` → grey meeting date. */
export function cardDayLeft(t: SetupTiming, versions: readonly SetupKpiVersion[]): DayLeft {
  const xs = LANE_KEYS.flatMap((k) => { const d = laneLeft(t, k, versions); return d ? [d] : []; });
  if (!xs.length) return { tone: 'grey', text: '—', left: Number.POSITIVE_INFINITY, flipTomorrow: false };
  return xs.reduce((a, b) => (TONE_RANK[b.tone] > TONE_RANK[a.tone] || (TONE_RANK[b.tone] === TONE_RANK[a.tone] && b.left < a.left) ? b : a));
}

/* ================= §6.6 stages ================= */
export type StageKey = 'new_property' | 'introduction' | 'collect_data' | 'property_pending' | 'final_check' | 'approved' | 'prepare_data' | 'rate_structure' | 'final_setup' | 'completed' | 'system_training' | 'first_sync' | 'go_live';
export type PhaseKey = 'p1' | 'p2' | 'w' | 'p3' | 'golive';
export const ORM_STAGES: StageKey[] = ['new_property', 'introduction', 'collect_data', 'property_pending', 'final_check', 'approved', 'prepare_data', 'rate_structure', 'final_setup', 'completed', 'system_training', 'go_live'];
export const MC_STAGES: StageKey[] = ['new_property', 'introduction', 'collect_data', 'property_pending', 'final_check', 'approved', 'completed', 'prepare_data', 'first_sync', 'go_live'];
export const stagesOf = (svc: SetupSvc) => (svc === 'ORM' ? ORM_STAGES : MC_STAGES);
export function stagePhase(svc: SetupSvc, s: StageKey): PhaseKey {
  if (s === 'go_live') return 'golive';
  if (['new_property', 'introduction', 'collect_data', 'property_pending', 'final_check'].includes(s)) return 'p1';
  if (svc === 'ORM') return s === 'rate_structure' ? 'w' : ['final_setup', 'completed', 'system_training'].includes(s) ? 'p3' : 'p2';
  return s === 'first_sync' ? 'p3' : 'p2';
}
/** Servicing `current_stage` (live) → tab stage key. */
export function stageFromServicing(raw: string | null | undefined): StageKey | null {
  if (!raw) return null;
  const s = raw.replace(/^(orm|marcom)_/, '');
  const map: Record<string, StageKey> = { introduction_sent_form: 'introduction', completed_handover: 'completed', completed: 'completed' };
  const k = (map[s] ?? s) as StageKey;
  return [...ORM_STAGES, ...MC_STAGES].includes(k) ? k : null;
}
/** Fallback when a card has no stage name (R4 DEMO inputs): derived from the running lanes. */
export function stageFromTiming(t: SetupTiming): StageKey {
  if (t.done) return 'go_live';
  const run = (k: LaneKey) => t.lanes[k].state === 'running';
  if (run('p3')) return t.svc === 'ORM' ? 'final_setup' : 'first_sync';
  if (run('w')) return t.svc === 'ORM' ? 'rate_structure' : 'first_sync';
  if (run('p2o') || run('p2s')) return 'prepare_data';
  return t.elapsed <= 1 ? 'new_property' : t.elapsed <= 3 ? 'introduction' : 'collect_data';
}

/* ================= v_onb_cards ================= */
export type Owners = { ae: string | null; specialist: string | null; team: string | null; members: string[]; marcom: string | null };
export type OnbCard = {
  t: SetupTiming; id: string; svc: SetupSvc; gmb: boolean; stage: StageKey; version: SetupKpiVersion;
  status: DayLeft; lanes: Partial<Record<LaneKey, DayLeft>>; total: { tone: Tone; text: string }; owners: Owners; search: string; queueN: number;
};
export type OwnerResolver = { name: (id: string | null) => string | null; members: (team: string | null) => string[] };
export const teamText = (o: Owners) => (o.team ? `Team ${o.team}${o.members.length ? ` (${o.members.join(' · ')})` : ''}` : null);
export const ownerLine2 = (c: OnbCard) => (c.svc === 'ORM' ? teamText(c.owners) ?? 'ทีม —' : c.owners.marcom ?? 'ทีม —');
export const ownerLine1 = (c: OnbCard) => `AE ${c.owners.ae ?? '—'}${c.svc === 'ORM' ? ` · ${c.owners.specialist ?? '—'}` : ''}`;
export function vOnbCards(ts: readonly SetupTiming[], versions: readonly SetupKpiVersion[], who: OwnerResolver): OnbCard[] {
  return ts.map((t) => {
    const owners: Owners = {
      ae: who.name(t.input.ae), specialist: t.svc === 'ORM' ? who.name(t.input.specialist) : null,
      team: t.svc === 'ORM' ? t.input.orm_team : null, members: t.svc === 'ORM' ? who.members(t.input.orm_team) : [], marcom: t.svc === 'Marcom' ? who.name(t.input.marcom_owner) : null,
    };
    const lanes: Partial<Record<LaneKey, DayLeft>> = {};
    for (const k of LANE_KEYS) { const d = laneLeft(t, k, versions); if (d) lanes[k] = d; }
    const stage = t.done ? 'go_live' : stageFromServicing(t.input.stage) ?? stageFromTiming(t);
    const total = totalLeft(t.elapsed, thrFor(t, versions, 'total')!, t.done);
    const search = [t.hotel_name, owners.ae, owners.specialist, owners.team ? `team ${owners.team}` : null, ...owners.members, owners.marcom].filter(Boolean).join(' ').toLowerCase();
    return { t, id: t.card_id, svc: t.svc, gmb: t.gmb, stage, version: versionFor(versions, t.day0), status: cardDayLeft(t, versions), lanes, total, owners, search, queueN: queueCount(t, ts) };
  });
}

/* ================= windows ================= */
export const inLastMonths = (d: string | null, today: string, n: number) => !!d && monthKey(d) >= nextPeriod('month', monthKey(today), -(n - 1)) && d.slice(0, 10) <= today;
export type RangeSel = { kind: 'm1' | 'm3' | 'm6' | 'm12' | 'custom'; from?: string; to?: string };
export function rangeMonths(r: RangeSel, today: string): { from: string; to: string } {
  const to = monthKey(today);
  if (r.kind === 'custom' && r.from && r.to) return { from: r.from, to: r.to };
  const n = r.kind === 'm1' ? 1 : r.kind === 'm3' ? 3 : r.kind === 'm12' ? 12 : 6;
  return { from: nextPeriod('month', to, -(n - 1)), to };
}
export const rangeLabel = (r: { from: string; to: string }) => (r.from === r.to ? monthLabel(r.from) : `${monthLabel(r.from)} – ${monthLabel(r.to)}`);
export function customRangeError(from: string, to: string): string | null {
  if (from > to) return 'เดือนเริ่มต้องมาก่อนเดือนจบ';
  const n = (+to.slice(0, 4) - +from.slice(0, 4)) * 12 + (+to.slice(5, 7) - +from.slice(5, 7)) + 1;
  return n > 24 ? 'เลือกได้ไม่เกิน 24 เดือน' : null;
}
export const lastMonthsList = (today: string, n = 30) => Array.from({ length: n }, (_, i) => nextPeriod('month', monthKey(today), -i));
export const wentInMonths = (cs: readonly OnbCard[], r: { from: string; to: string }, today: string) =>
  cs.filter((c) => c.t.go_live && monthKey(c.t.go_live) >= r.from && monthKey(c.t.go_live) <= r.to && c.t.go_live <= today);

/* ================= §5 tiles · §6 pipeline ================= */
export function vOnbOverall(cs: readonly OnbCard[], today: string) {
  const inProg = cs.filter((c) => !c.t.done);
  const live = cs.filter((c) => c.t.done && inLastMonths(c.t.go_live, today, 6));
  const all = [...inProg, ...live];
  const hotels = new Set(all.map((c) => c.t.hotel_id)).size;
  return {
    inProg, live, cards: all.length, hotels, multi: all.length - hotels,
    liveOrm: live.filter((c) => c.svc === 'ORM').length, liveMc: live.filter((c) => c.svc === 'Marcom').length,
    liveOnTime: live.filter((c) => c.total.tone === 'green').length,
    late: inProg.filter((c) => c.status.tone === 'red').length,
    near: inProg.filter((c) => c.status.tone === 'amber').length,
    flip: inProg.filter((c) => c.status.flipTomorrow && c.status.tone !== 'red').length,
  };
}
export type StageCell = { stage: StageKey; phase: PhaseKey; n: number; tones: Record<Tone, number>; top: Tone | null; lines: { tone: Tone; text: string }[] };
const byUrgency = (a: OnbCard, b: OnbCard) => TONE_RANK[b.status.tone] - TONE_RANK[a.status.tone] || a.status.left - b.status.left;
export function stageLines(at: readonly OnbCard[]): { tone: Tone; text: string }[] {
  const red = at.filter((c) => c.status.tone === 'red').length;
  const groups = new Map<string, { tone: Tone; text: string; n: number; left: number }>();
  for (const c of at) if (c.status.tone !== 'red') {
    const g = groups.get(c.status.text) ?? { tone: c.status.tone, text: c.status.text, n: 0, left: c.status.left };
    g.n++; g.left = Math.min(g.left, c.status.left); groups.set(c.status.text, g);
  }
  const rest = [...groups.values()].sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone] || a.left - b.left).map((g) => ({ tone: g.tone, text: g.n > 1 ? `${g.text} · ${g.n}` : g.text }));
  return [...(red ? [{ tone: 'red' as Tone, text: `เลยกำหนด · ${red}` }] : []), ...rest].slice(0, 2);
}
export function vOnbPipeline(cs: readonly OnbCard[], svc: SetupSvc, today: string): StageCell[] {
  return stagesOf(svc).map((stage) => {
    const live = stage === 'go_live';
    const at = cs.filter((c) => c.svc === svc && (live ? c.t.done && inLastMonths(c.t.go_live, today, 6) : !c.t.done && c.stage === stage));
    const tones: Record<Tone, number> = { red: 0, amber: 0, green: 0, grey: 0 };
    if (!live) for (const c of at) tones[c.status.tone]++;
    const top = live || !at.length ? null : [...at].sort(byUrgency)[0]!.status.tone;
    return { stage, phase: stagePhase(svc, stage), n: at.length, tones, top, lines: live ? [] : stageLines(at) };
  });
}

/* ================= §7 queue ================= */
export type QueueChip = 'all' | 'watch' | 'late' | 'flip' | 'over';
export const queueChipMatch = (c: OnbCard, k: QueueChip) =>
  k === 'all' ? true : k === 'watch' ? c.status.tone === 'amber' || c.status.tone === 'red' : k === 'late' ? c.status.tone === 'red'
    : k === 'flip' ? c.status.flipTomorrow && c.status.tone !== 'red' : c.total.tone === 'red';
export const queueSort = (a: OnbCard, b: OnbCard) => byUrgency(a, b) || b.t.elapsed - a.t.elapsed;
export const liveSort = (a: OnbCard, b: OnbCard) => (b.t.go_live ?? '').localeCompare(a.t.go_live ?? '');
export const matchSearch = (c: OnbCard, q: string) => !q.trim() || c.search.includes(q.trim().toLowerCase());
export const ONB_PAGE = 10;

/* ================= §10 owners ================= */
export type OwnerRole = 'ps' | 'orm' | 'mc';
export type OwnerRow = { name: string; holding: { c: OnbCard; d: DayLeft }[]; green: number; amber: number; red: number; total: number; most: string; pct: number | null };
export const pctToneOf = (p: number | null): Tone => (p == null ? 'grey' : p >= 80 ? 'green' : p >= 60 ? 'amber' : 'red');
/** One owner table: lane + who owns it on each card. Rows only for named owners (no unassigned row). */
export function vOnbOwners(cs: readonly OnbCard[], lane: LaneKey, svc: SetupSvc | null, ownerOf: (c: OnbCard) => string | null, versions: readonly SetupKpiVersion[], went: readonly OnbCard[]) {
  const rows = new Map<string, OwnerRow>();
  const row = (n: string) => { let r = rows.get(n); if (!r) { r = { name: n, holding: [], green: 0, amber: 0, red: 0, total: 0, most: '—', pct: null }; rows.set(n, r); } return r; };
  const vals = new Map<string, number[]>();
  for (const c of cs) {
    if (svc && c.svc !== svc) continue; const who = ownerOf(c); if (!who) continue;
    const d = c.lanes[lane]; if (d && !c.t.done) row(who).holding.push({ c, d });
  }
  for (const c of went) {
    if (svc && c.svc !== svc) continue; const who = ownerOf(c); if (!who) continue;
    const l = c.t.lanes[lane]; const thr = thrFor(c.t, versions, lane);
    if (l.state !== 'done' || l.days == null || !thr) continue;
    const s = doneStatus(l.days, thr).tone; const r = row(who);
    if (s === 'green') r.green++; else if (s === 'amber') r.amber++; else r.red++;
    r.total++; vals.set(who, [...(vals.get(who) ?? []), l.days]);
  }
  const list = [...rows.values()].map((r) => {
    const v = vals.get(r.name) ?? []; const m = mostRange(v);
    r.holding.sort((a, b) => TONE_RANK[b.d.tone] - TONE_RANK[a.d.tone] || a.d.left - b.d.left);
    return { ...r, most: !m ? '—' : m.a === m.b ? `${m.a} วัน` : `${m.a}–${m.b} วัน`, pct: r.total ? Math.round(((r.green + r.amber) / r.total) * 100) : null };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const sum = list.reduce((s, r) => ({ holding: s.holding + r.holding.length, green: s.green + r.green, amber: s.amber + r.amber, red: s.red + r.red, total: s.total + r.total }), { holding: 0, green: 0, amber: 0, red: 0, total: 0 });
  return { rows: list, sum, pct: sum.total ? Math.round(((sum.green + sum.amber) / sum.total) * 100) : null };
}

/* ================= §11 overall days ================= */
export function vOnbDays(cs: readonly OnbCard[], svc: SetupSvc, r: { from: string; to: string }, today: string) {
  const dots = wentInMonths(cs, r, today).filter((c) => c.svc === svc);
  const vals = dots.map((c) => c.t.elapsed);
  return { dots, median: median(vals), onTime: dots.filter((c) => c.total.tone === 'green').length, late: dots.filter((c) => c.total.tone === 'red').length };
}
export function personStats(dots: readonly OnbCard[], match: (c: OnbCard) => boolean, all: number | null) {
  const mine = dots.filter(match); const v = mine.map((c) => c.t.elapsed); const med = median(v); const m = mostRange(v);
  const diff = med == null || all == null ? null : Math.round((med - all) * 10) / 10;
  return { n: mine.length, median: med, most: !m ? '—' : m.a === m.b ? `${m.a} วัน` : `${m.a}–${m.b} วัน`, onTime: mine.filter((c) => c.total.tone === 'green').length,
    vs: diff == null ? null : diff > 0 ? { tone: 'red' as Tone, text: `ช้ากว่า ${diff.toFixed(1)} วัน` } : diff < 0 ? { tone: 'green' as Tone, text: `เร็วกว่า ${(-diff).toFixed(1)} วัน` } : { tone: 'grey' as Tone, text: 'เท่ากัน' } };
}

/* ================= §13 settings analysis ================= */
export type CompareMode = 'level' | 'prev';
export type Level = 'เบา' | 'ปกติ' | 'หนัก';
const keySvc = (k: KpiKey): SetupSvc | null => (k === 'p1' ? null : k === 'total_orm' || k === 'p2s' || k === 'p2o_orm' || k === 'p3_orm' ? 'ORM' : 'Marcom');
function valuesOf(cs: readonly OnbCard[], key: KpiKey): number[] {
  return cs.flatMap((c) => {
    if (key === totalKey(c.svc)) return [c.t.elapsed];
    if (key === 'total_orm' || key === 'total_mc') return [];
    return LANE_KEYS.flatMap((k) => (laneKpiKey(k, c.svc) === key && c.t.lanes[k].state === 'done' && c.t.lanes[k].days != null ? [c.t.lanes[k].days!] : []));
  });
}
export function vOnbSettingsAnalysis(cs: readonly OnbCard[], svc: SetupSvc, mode: CompareMode, level: Level | null, today: string) {
  const to = monthKey(today), from = nextPeriod('month', to, -5);
  const svcCards = cs.filter((c) => c.t.done && c.svc === svc);
  const inR = (c: OnbCard, a: string, b: string) => !!c.t.go_live && monthKey(c.t.go_live) >= a && monthKey(c.t.go_live) <= b && c.t.go_live <= today;
  const lvl = (c: OnbCard) => queueLevel(c.queueN, c.svc);
  const cur6 = svcCards.filter((c) => inR(c, from, to));
  const levels: Record<Level, number> = { 'เบา': 0, 'ปกติ': 0, 'หนัก': 0 };
  for (const c of cur6) levels[lvl(c)]++;
  const defLevel = (Object.keys(levels) as Level[]).reduce((a, b) => (levels[b] > levels[a] ? b : a), 'เบา');
  const useLevel = level ?? defLevel;
  let current = cur6, comp: OnbCard[], compRange: { from: string; to: string };
  if (mode === 'level') {
    current = cur6.filter((c) => lvl(c) === useLevel);
    compRange = { from: nextPeriod('month', from, -24), to: nextPeriod('month', from, -1) };
    comp = svcCards.filter((c) => inR(c, compRange.from, compRange.to) && lvl(c) === useLevel);
  } else {
    compRange = { from: nextPeriod('month', from, -6), to: nextPeriod('month', from, -1) };
    const cut = +today.slice(8, 10);
    comp = svcCards.filter((c) => inR(c, compRange.from, compRange.to) && (monthKey(c.t.go_live!) !== compRange.to || +c.t.go_live!.slice(8, 10) <= cut));
  }
  return { current, comp, compRange, levels, level: useLevel, values: (k: KpiKey, set: 'current' | 'comp') => valuesOf(set === 'current' ? current : comp, k), keySvc };
}
export const pctLe = (v: readonly number[], due: number) => (v.length ? Math.round((v.filter((x) => x <= due).length / v.length) * 100) : null);
export { p80, mostRange };
