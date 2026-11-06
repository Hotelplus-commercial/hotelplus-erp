/* PS Dashboard · Tab "ต่อสัญญา & ราคา" R2 — renewal card (การต่อสัญญา) pure rules. No React, no storage.
 * Unit = service contract. Period membership = contract end date (early termination = effective date).
 * Stages, rates, compare windows, SLA (proposal config, Q59), urgent tiles, by-AE table, highlight and the
 * non-renewal reason views. Labels = R1 signal catalog (bad labels of groups 1–7). */
import { SIGNAL_CATALOG, SIGNAL_GROUPS, type Svc } from './contract-tab-r1';
import type { RequestStatus } from './renewal-rules';
import { dayDiff, scanDateOf } from './renewal-scan';

export { RENEWAL_CARD_LEAD_DAYS } from './renewal-scan';
export type { Svc };

/* ================= §2.2 Stages ================= */
export type Stage = 'NOT_STARTED' | 'IN_PROGRESS' | 'LINK_SENT' | 'RENEWED' | 'LOST_OR_DECLINED';
export const KNOWN_STAGES: Stage[] = ['RENEWED', 'LOST_OR_DECLINED'];
export const OPEN_STAGES: Stage[] = ['NOT_STARTED', 'IN_PROGRESS', 'LINK_SENT'];
/** Everywhere stages are listed: รู้ผลแล้ว first, then ยังไม่รู้ผล. */
export const STAGE_ORDER: Stage[] = [...KNOWN_STAGES, ...OPEN_STAGES];
export type SubStep = 'DRAFT' | 'RETURNED' | 'PENDING_APPROVAL' | 'READY';
export type Outcome = 'NOT_RENEWED' | 'LOST';
export type CardStatus = 'NOT_STARTED' | 'ON_PROCESS' | 'COMPLETED' | 'CHURN';

export function stageOf(x: { card?: CardStatus | null; churnEarly?: boolean; request?: RequestStatus | null; contractLost?: boolean }): { stage: Stage; sub: SubStep | null; outcome: Outcome | null } {
  if (x.contractLost) return { stage: 'LOST_OR_DECLINED', sub: null, outcome: 'LOST' };
  if (x.card === 'CHURN') return { stage: 'LOST_OR_DECLINED', sub: null, outcome: x.churnEarly ? 'LOST' : 'NOT_RENEWED' };
  switch (x.request) {
    case 'DECLINED': return { stage: 'LOST_OR_DECLINED', sub: null, outcome: 'NOT_RENEWED' };
    case 'SIGNED': return { stage: 'RENEWED', sub: null, outcome: null };
    case 'LINK_SENT': return { stage: 'LINK_SENT', sub: null, outcome: null };
    case 'DRAFT': return { stage: 'IN_PROGRESS', sub: 'DRAFT', outcome: null };
    case 'RETURNED': return { stage: 'IN_PROGRESS', sub: 'RETURNED', outcome: null };
    case 'PENDING_APPROVAL': return { stage: 'IN_PROGRESS', sub: 'PENDING_APPROVAL', outcome: null };
    case 'APPROVED': case 'READY_TO_SEND': return { stage: 'IN_PROGRESS', sub: 'READY', outcome: null };
    default: break;
  }
  if (x.card === 'COMPLETED') return { stage: 'RENEWED', sub: null, outcome: null };
  return { stage: 'NOT_STARTED', sub: null, outcome: null };
}

export type RenewalItem = {
  contract_id: string; hotel_id: string; hotel_name: string; hotel_name_th: string | null; hotel_name_en: string | null;
  service: Svc; ae: string | null; team: string | null;
  /** Contract end date (ครบกำหนดสัญญา), YYYY-MM-DD. */
  end: string;
  stage: Stage; sub?: SubStep | null; outcome?: Outcome | null;
  /** Early termination effective date (LOST). */
  effective?: string | null;
  card_id?: string | null; created_source?: 'BOT' | 'AE_EARLY' | null;
  request_created_at?: string | null; pending_since?: string | null; link_sent_at?: string | null; signed_at?: string | null;
  last_activity?: { at: string; what: string } | null | undefined;
  /** Old free-text reason (RN17) — shown read-only as a note. */
  legacy_reason?: string | null;
};
export const isOpen = (i: Pick<RenewalItem, 'stage'>) => OPEN_STAGES.includes(i.stage);
export const periodDate = (i: RenewalItem) => (i.stage === 'LOST_OR_DECLINED' && i.outcome === 'LOST' && i.effective ? i.effective : i.end).slice(0, 10);
export const isPastDue = (i: RenewalItem, today: string) => isOpen(i) && i.end.slice(0, 10) < today;
export const isEarlySigned = (i: RenewalItem) => i.stage === 'RENEWED' && !!i.signed_at && i.signed_at.slice(0, 10) < i.end.slice(0, 10);
/** Request created before the scan date (end − 60) → "สร้างคำขอล่วงหน้า". */
export const isEarlyRequest = (i: RenewalItem) => (!!i.request_created_at && i.request_created_at.slice(0, 10) < scanDateOf(i.end)) || i.created_source === 'AE_EARLY';

/* ================= §1.2 / §1.3 Periods & compare ================= */
export type PKind = 'month' | 'quarter' | 'year' | 'custom';
export type Range = { from: string; to: string };
const iso = (y: number, m0: number, d = 1) => new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);
export const addDaysIso = (d: string, n: number) => new Date(Date.parse(d.slice(0, 10) + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const addMonthsIso = (d: string, n: number) => { const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1, day = +d.slice(8, 10); const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate(); return iso(y, m + n, Math.min(day, last)); };
export function periodOf(kind: Exclude<PKind, 'custom'>, anchor: string): Range {
  const y = +anchor.slice(0, 4), m = +anchor.slice(5, 7) - 1;
  if (kind === 'month') return { from: iso(y, m), to: iso(y, m + 1, 0) };
  if (kind === 'quarter') { const q = Math.floor(m / 3) * 3; return { from: iso(y, q), to: iso(y, q + 3, 0) }; }
  return { from: iso(y, 0), to: iso(y, 12, 0) };
}
export const shiftAnchor = (kind: Exclude<PKind, 'custom'>, anchor: string, dir: number) => {
  const p = periodOf(kind, anchor);
  return kind === 'month' ? addMonthsIso(p.from, dir) : kind === 'quarter' ? addMonthsIso(p.from, 3 * dir) : addMonthsIso(p.from, 12 * dir);
};
export const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const be2 = (y: number) => String((y + 543) % 100).padStart(2, '0');
/** Thai BE short date: `28 ต.ค. 69`. */
export const thShort = (d: string) => `${+d.slice(8, 10)} ${TH_MON[+d.slice(5, 7) - 1]} ${be2(+d.slice(0, 4))}`;
/** `1–28 ต.ค. 69` (same month) · `1 ต.ค. – 5 พ.ย. 69` otherwise. */
export function rangeText(r: Range) {
  if (r.from.slice(0, 7) === r.to.slice(0, 7)) return `${+r.from.slice(8, 10)}–${thShort(r.to)}`;
  return `${thShort(r.from)} – ${thShort(r.to)}`;
}
export function periodLabel(kind: PKind, anchor: string, custom?: Range | null) {
  if (kind === 'custom') return custom ? rangeText(custom) : 'Custom';
  const y = +anchor.slice(0, 4), m = +anchor.slice(5, 7) - 1;
  if (kind === 'month') return `${TH_MON[m]} ${be2(y)}`;
  if (kind === 'quarter') return `Q${Math.floor(m / 3) + 1} ${be2(y)}`;
  return String(y + 543);
}
/** Back: down to the first month with renewal data. Forward: up to today + 12 months (planning). */
export function stepBounds(kind: Exclude<PKind, 'custom'>, anchor: string, firstData: string | null, today: string) {
  const prev = periodOf(kind, shiftAnchor(kind, anchor, -1)), next = periodOf(kind, shiftAnchor(kind, anchor, 1));
  return { back: !!firstData && prev.to >= firstData.slice(0, 7) + '-01', fwd: next.from <= addMonthsIso(today, 12) };
}
export type CompareState = 'past' | 'current' | 'future';
export type Windows = { state: CompareState; a: Range; cutA: string; b: Range | null; cutB: string | null };
/** Past → previous period of the same type · current → cut A at today, B cut at the same day offset · future → no compare. */
export function compareOf(kind: PKind, a: Range, today: string, customB?: Range | null): Windows {
  const state: CompareState = a.from > today ? 'future' : a.to < today ? 'past' : 'current';
  if (state === 'future') return { state, a, cutA: today, b: null, cutB: null };
  const b = kind === 'custom' ? customB ?? null : periodOf(kind, shiftAnchor(kind, a.from, -1));
  const cutA = state === 'current' ? today : a.to;
  if (!b) return { state, a, cutA, b: null, cutB: null };
  const cutB = state === 'current' && kind !== 'custom' ? (() => { const c = addDaysIso(b.from, dayDiff(a.from, today)); return c > b.to ? b.to : c; })() : b.to;
  return { state, a, cutA, b, cutB };
}

/* ================= §2.3 Rates ================= */
const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;
export const inPeriod = (i: RenewalItem, r: Range) => inRange(periodDate(i), r);
export const decidedRenewed = (i: RenewalItem, cut: string) => i.stage === 'RENEWED' && (!i.signed_at || i.signed_at.slice(0, 10) <= cut);
export const decidedLost = (i: RenewalItem, cut: string) => i.stage === 'LOST_OR_DECLINED' && periodDate(i) <= cut;
export type WindowStats = {
  total: number; orm: number; marcom: number; renewed: number; early: number; lost: number; notRenewed: number; lostEarly: number;
  decided: number; renewedPct: number | null; lostPct: number | null; pastDue: number; open: number; overSla: number;
};
export function windowStats(items: RenewalItem[], r: Range, cut: string, today: string): WindowStats {
  const inR = items.filter((i) => inPeriod(i, r));
  const ren = inR.filter((i) => decidedRenewed(i, cut)), lost = inR.filter((i) => decidedLost(i, cut));
  const decided = ren.length + lost.length;
  return {
    total: inR.length, orm: inR.filter((i) => i.service === 'ORM').length, marcom: inR.filter((i) => i.service === 'Marcom').length,
    renewed: ren.length, early: ren.filter(isEarlySigned).length, lost: lost.length,
    notRenewed: lost.filter((i) => i.outcome !== 'LOST').length, lostEarly: lost.filter((i) => i.outcome === 'LOST').length,
    decided, renewedPct: decided ? (ren.length / decided) * 100 : null, lostPct: decided ? (lost.length / decided) * 100 : null,
    pastDue: inR.filter((i) => isPastDue(i, today)).length, open: inR.filter(isOpen).length, overSla: inR.filter((i) => overSla(i, today)).length,
  };
}
export type ChurnTone = 'normal' | 'watch' | 'high';
export const CHURN_PILL: Record<ChurnTone, string> = { normal: 'ปกติ', watch: 'เฝ้าระวัง', high: 'สูง' };
/** decided ≥ 10 → < 15 % normal · 15–19 % watch · ≥ 20 % high; decided < 10 → by count ≤ 3 · 4 · ≥ 5. */
export function churnTone(lost: number, decided: number): { tone: ChurnTone; byCount: boolean } {
  if (decided >= 10) { const p = (lost / decided) * 100; return { tone: p >= 20 ? 'high' : p >= 15 ? 'watch' : 'normal', byCount: false }; }
  return { tone: lost >= 5 ? 'high' : lost === 4 ? 'watch' : 'normal', byCount: true };
}

/* ================= §5.5 SLA (Q59 — proposals, one config) ================= */
export const RENEWAL_SLA = {
  NOT_STARTED: { amberFrom: 8, redFrom: 15 },
  IN_PROGRESS: { amberFrom: 6, redFrom: 8 },
  LINK_SENT: { amberFrom: 8, redFrom: 15 },
  LAST_ACTIVITY: { amberFrom: 8, redFrom: 15 },
  PENDING_APPROVAL_MAX_DAYS: 2,
} as const;
export type SlaTone = 'ok' | 'amber' | 'red';
export const slaTone = (days: number | null, t: { amberFrom: number; redFrom: number }): SlaTone => (days == null ? 'ok' : days >= t.redFrom ? 'red' : days >= t.amberFrom ? 'amber' : 'ok');
/** `อยู่ stage นี้` — NOT_STARTED from the scan date (null before it) · IN_PROGRESS from request created · LINK_SENT from first link sent. */
export function stageDays(i: RenewalItem, today: string): number | null {
  if (i.stage === 'NOT_STARTED') { const s = scanDateOf(i.end); return today < s ? null : dayDiff(s, today); }
  if (i.stage === 'IN_PROGRESS') return i.request_created_at ? dayDiff(i.request_created_at, today) : null;
  if (i.stage === 'LINK_SENT') return i.link_sent_at ? dayDiff(i.link_sent_at, today) : null;
  return null;
}
export const stageTone = (i: RenewalItem, today: string): SlaTone => (isOpen(i) ? slaTone(stageDays(i, today), RENEWAL_SLA[i.stage as 'NOT_STARTED' | 'IN_PROGRESS' | 'LINK_SENT']) : 'ok');
export const pendingDays = (i: RenewalItem, today: string) => (i.sub === 'PENDING_APPROVAL' && i.pending_since ? dayDiff(i.pending_since, today) : null);
export const activityDays = (i: RenewalItem, today: string) => (i.last_activity ? dayDiff(i.last_activity.at, today) : null);
export function overSla(i: RenewalItem, today: string): boolean {
  if (!isOpen(i) || stageDays(i, today) == null) return false;
  return stageTone(i, today) !== 'ok' || slaTone(activityDays(i, today), RENEWAL_SLA.LAST_ACTIVITY) !== 'ok' || (pendingDays(i, today) ?? 0) > RENEWAL_SLA.PENDING_APPROVAL_MAX_DAYS;
}
/** Countdown chip: > 60 grey · 15–60 amber · 0–14 red · < 0 past due (solid red). */
export function countdown(end: string, today: string): { days: number; tone: 'grey' | 'amber' | 'red' | 'past' } {
  const days = dayDiff(today, end);
  return { days, tone: days < 0 ? 'past' : days <= 14 ? 'red' : days <= 60 ? 'amber' : 'grey' };
}

/* ================= §5.1 Urgent tiles ================= */
export type TileKey = 'PAST_DUE' | 'DUE_SOON' | 'OVER_SLA' | 'NO_REASON';
export const TILE_KEYS: TileKey[] = ['PAST_DUE', 'DUE_SOON', 'OVER_SLA', 'NO_REASON'];
/** PAST_DUE + NO_REASON are counted over all periods; DUE_SOON + OVER_SLA follow the selected period. Most severe first. */
export function urgentLists(items: RenewalItem[], r: Range, today: string, hasReason: (i: RenewalItem) => boolean): Record<TileKey, RenewalItem[]> {
  const d = (i: RenewalItem) => dayDiff(today, i.end);
  return {
    PAST_DUE: items.filter((i) => isPastDue(i, today)).sort((a, b) => d(a) - d(b)),
    DUE_SOON: items.filter((i) => isOpen(i) && inPeriod(i, r) && d(i) >= 0 && d(i) <= 60).sort((a, b) => d(a) - d(b)),
    OVER_SLA: items.filter((i) => inPeriod(i, r) && overSla(i, today)).sort((a, b) => (stageDays(b, today) ?? 0) - (stageDays(a, today) ?? 0)),
    NO_REASON: items.filter((i) => i.stage === 'LOST_OR_DECLINED' && !hasReason(i) && periodDate(i) <= today).sort((a, b) => periodDate(a).localeCompare(periodDate(b))),
  };
}

/* ================= §4 By AE / team ================= */
export type OwnerView = 'ae' | 'team';
export type Cell = { n: number; pastDue: number; overSla: number; noReason: number; red: boolean; amber: boolean };
export type OwnerRow = { key: string; cells: Record<Stage, Cell>; decided: number };
export const ORM_TEAMS = ['A', 'B', 'C', 'D', 'E'];
export const ownerKey = (i: RenewalItem, view: OwnerView) => (view === 'ae' ? i.ae : i.team) ?? '—';
/** Items of one service in the period → one row per AE (or team / Marcom person), sorted by name. No totals. */
export function byOwner(items: RenewalItem[], svc: Svc, view: OwnerView, r: Range, cut: string, today: string, hasReason: (i: RenewalItem) => boolean, nameOf: (k: string) => string = (k) => k): OwnerRow[] {
  const list = items.filter((i) => i.service === svc && inPeriod(i, r));
  const keys = new Set(list.map((i) => ownerKey(i, view)));
  if (view === 'team' && svc === 'ORM') ORM_TEAMS.forEach((t) => keys.add(t));
  const rows = [...keys].map((key): OwnerRow => {
    const mine = list.filter((i) => ownerKey(i, view) === key);
    const cells = Object.fromEntries(STAGE_ORDER.map((s) => {
      const inCell = mine.filter((i) => (s === 'RENEWED' ? decidedRenewed(i, cut) : s === 'LOST_OR_DECLINED' ? decidedLost(i, cut) : i.stage === s));
      const pastDue = inCell.filter((i) => isPastDue(i, today)).length, ov = inCell.filter((i) => overSla(i, today)).length;
      const noReason = s === 'LOST_OR_DECLINED' ? inCell.filter((i) => !hasReason(i)).length : 0;
      return [s, { n: inCell.length, pastDue, overSla: ov, noReason, red: pastDue > 0, amber: ov > 0 || noReason > 0 }];
    })) as Record<Stage, Cell>;
    return { key, cells, decided: cells.RENEWED.n + cells.LOST_OR_DECLINED.n };
  });
  return rows.sort((a, b) => nameOf(a.key).localeCompare(nameOf(b.key), 'th'));
}

/* ================= §5.2 Highlight ================= */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
/** Thai / English hotel name or contract id · case- and space-insensitive · several words = AND. */
export function matchItem(i: RenewalItem, q: string): boolean {
  const words = q.trim().split(/\s+/).filter(Boolean).map(norm);
  if (!words.length) return true;
  const hay = norm([i.hotel_name, i.hotel_name_th ?? '', i.hotel_name_en ?? '', i.contract_id].join('|'));
  return words.every((w) => hay.includes(w));
}
export type Highlight = { owner: string | null; view: OwnerView; q: string; ids: string[] | null };
export const NO_HIGHLIGHT: Highlight = { owner: null, view: 'ae', q: '', ids: null };
export const highlightActive = (h: Highlight) => !!h.owner || !!h.q.trim() || !!h.ids;
export const highlightHit = (i: RenewalItem, h: Highlight) => (!h.owner || ownerKey(i, h.view) === h.owner) && matchItem(i, h.q) && (!h.ids || h.ids.includes(i.contract_id));
/** §4 click: name → select that person (same name again clears) · number → also open that stage. KPIs / table / reasons never change. */
export function ownerClick(h: Highlight, open: Stage[], key: string, view: OwnerView, stage?: Stage): { h: Highlight; open: Stage[] } {
  if (!stage && h.owner === key && h.view === view) return { h: { ...h, owner: null }, open };
  return { h: { ...h, owner: key, view }, open: stage && !open.includes(stage) ? [...open, stage] : open };
}
/** Board order: highlighted first, then ยังไม่รู้ผล = end asc · ไม่ต่อ / หลุด = without reason first, newest · ต่อแล้ว = newest end first. */
export function boardSort(stage: Stage, list: RenewalItem[], hasReason: (i: RenewalItem) => boolean, hit?: (i: RenewalItem) => boolean): RenewalItem[] {
  const base = (a: RenewalItem, b: RenewalItem) => {
    if (stage === 'RENEWED') return b.end.localeCompare(a.end);
    if (stage === 'LOST_OR_DECLINED') return Number(hasReason(a)) - Number(hasReason(b)) || periodDate(b).localeCompare(periodDate(a));
    return a.end.localeCompare(b.end);
  };
  return [...list].sort((a, b) => (hit ? Number(hit(b)) - Number(hit(a)) : 0) || base(a, b));
}
/** Stages that open because they contain highlighted cards. */
export const stagesWithHits = (items: RenewalItem[], hit: (i: RenewalItem) => boolean) => STAGE_ORDER.filter((s) => items.some((i) => i.stage === s && hit(i)));

/* ================= §6 / §5.6 Reasons ================= */
/** Reason labels = bad labels of groups 1–7 from the R1 catalog. */
export const REASON_LABELS = SIGNAL_CATALOG.filter((e) => e.dir === 'bad' && e.group >= 1 && e.group <= 7);
export const REASON_KEYS = REASON_LABELS.map((e) => e.key);
const reasonByKey = new Map(REASON_LABELS.map((e) => [e.key, e]));
export const reasonLabel = (k: string) => reasonByKey.get(k)?.label ?? k;
export const reasonGroup = (k: string) => reasonByKey.get(k)?.group ?? 0;
/** Click order: 1st + 2nd = primary, 3rd = secondary; click again removes; max 3. */
export function pickToggle(sel: string[], key: string): string[] {
  if (sel.includes(key)) return sel.filter((k) => k !== key);
  return sel.length >= 3 || !reasonByKey.has(key) ? sel : [...sel, key];
}
export const validPick = (keys: string[]) => keys.length === 3 && new Set(keys).size === 3 && keys.every((k) => reasonByKey.has(k));
type Rec = { primary: [string, string] | string[]; secondary: string };
export type TopRow = { key: string; label: string; group: number; n: number; pct: number };
/** Top 3 labels (primary = primary 1 + primary 2) with pct = n ÷ N; ties beyond rank 3 reported as a note. */
export function topLabels(records: Rec[], which: 'primary' | 'secondary'): { rows: TopRow[]; tie: { k: number; n: number } | null; N: number } {
  const N = records.length; const count = new Map<string, number>();
  for (const r of records) for (const k of which === 'primary' ? r.primary : [r.secondary]) count.set(k, (count.get(k) ?? 0) + 1);
  const all = REASON_KEYS.filter((k) => count.get(k)).map((k) => ({ key: k, label: reasonLabel(k), group: reasonGroup(k), n: count.get(k)!, pct: N ? (count.get(k)! / N) * 100 : 0 }))
    .sort((a, b) => b.n - a.n);
  const rows = all.slice(0, 3); const third = rows[2]?.n;
  const k = third == null ? 0 : all.slice(3).filter((r) => r.n === third).length;
  return { rows, tie: k ? { k, n: third! } : null, N };
}
export type GroupBar = { group: number; name: string; primary: number; secondary: number; total: number; share: number; /** UP5: distinct contracts with ≥1 label in this group */ contracts: number; labels: { key: string; label: string; n: number; primary: number; secondary: number; pctOfGroup: number }[] };
/** 7 groups, label counts (2 labels of one group in one contract = 2), share = group labels ÷ all labels, sorted desc. */
export function groupBars(records: Rec[]): { rows: GroupBar[]; totalLabels: number } {
  const p = new Map<string, number>(), s = new Map<string, number>();
  for (const r of records) { for (const k of r.primary) p.set(k, (p.get(k) ?? 0) + 1); s.set(r.secondary, (s.get(r.secondary) ?? 0) + 1); }
  const totalLabels = [...p.values(), ...s.values()].reduce((a, b) => a + b, 0);
  const rows = [1, 2, 3, 4, 5, 6, 7].map((g): GroupBar => {
    const keys = REASON_KEYS.filter((k) => reasonGroup(k) === g);
    const primary = keys.reduce((a, k) => a + (p.get(k) ?? 0), 0), secondary = keys.reduce((a, k) => a + (s.get(k) ?? 0), 0), total = primary + secondary;
    const labels = keys.map((k) => ({ key: k, label: reasonLabel(k), primary: p.get(k) ?? 0, secondary: s.get(k) ?? 0, n: (p.get(k) ?? 0) + (s.get(k) ?? 0), pctOfGroup: 0 }))
      .filter((l) => l.n).map((l) => ({ ...l, pctOfGroup: total ? (l.n / total) * 100 : 0 })).sort((a, b) => b.n - a.n);
    const contracts = records.filter((r) => r.primary.some((k) => reasonGroup(k) === g) || reasonGroup(r.secondary) === g).length;
    return { group: g, name: SIGNAL_GROUPS[g]!, primary, secondary, total, contracts, share: totalLabels ? (total / totalLabels) * 100 : 0, labels };
  });
  return { rows: rows.sort((a, b) => b.total - a.total || a.group - b.group), totalLabels };
}

/* ================= §6.3 / §7.2 Permissions (test-mode actor, no login) ================= */
export type Actor = { id: string; role: 'AE' | 'PM' | 'OTHER' };
const code = (id: string | null | undefined) => (id ?? '').split('-')[0] ?? '';
export const isOwningAe = (a: Actor, ae: string | null | undefined) => a.role === 'AE' && !!ae && code(a.id) === code(ae);
/** Owning AE or PM may record (any time when missing). */
export const canRecordReason = (a: Actor, ae: string | null | undefined) => a.role === 'PM' || isOwningAe(a, ae);
/** …and edit within 7 days of the first record; then locked. */
export const canEditReason = (a: Actor, ae: string | null | undefined, rec: { editable_until: string }, now: string) => canRecordReason(a, ae) && now <= rec.editable_until;
/** Early create: owning AE only, stage ยังไม่เริ่ม. */
export const canEarlyCreate = (a: Actor, i: RenewalItem) => i.stage === 'NOT_STARTED' && isOwningAe(a, i.ae);
export const daysLeftToEdit = (rec: { editable_until: string }, now: string) => Math.max(0, Math.ceil((Date.parse(rec.editable_until) - Date.parse(now)) / 864e5));
