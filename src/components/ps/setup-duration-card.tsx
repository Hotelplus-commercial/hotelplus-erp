/* Tab R4 §2–§11 — card ⑤ ระยะเวลา Setup (On-board → Go Live) + card ⑥ ระยะเวลา Reset (Coming soon strip).
 * `ณ วันนี้` (daily, no snapshot, no period / compare control on the chart). Rules in src/lib/setup-timing.ts,
 * KPI versions in src/lib/setup-kpi-settings.ts, text in ps-glossary SD. The only write is the PM settings save. */
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { InfoButton } from './dash-card';
import { usePlotSize } from './use-plot-size';
import { openOnboardCard, useSetupFeed, type SetupFeed } from './use-setup-timing';
import { SD } from '@/lib/ps-glossary';
import { beeswarm, monthKey, quarterKey, monthLabel, quarterLabel, thDate } from '@/lib/contract-age';
import {
  KPI_KEYS, KPI_LABEL, saveKpiVersion, setKpiVersions, useSetupKpiVersions, versionFor, DEFAULT_KPI_VERSION,
  type KpiValues, type SetupKpiVersion,
} from '@/lib/setup-kpi-settings';
import {
  LANE_KEYS, X_CAP, X_MAX, X_TICKS, baseWindow, capX, chartLanes, compareCell, compareDefs, countsDifferMuch, equalCountCandidates,
  firstTimeRight, ftrAvailable, goLiveBounds, kpiBaseValues, kpiBox, laneDots, laneTip, matchesQuick, mostText, p80, pctChange, pctTone,
  pctWithin, periodTitle, quickCounts, rangeError, shiftPeriod, shortStatus, stageSummary, statusFor, surveyChange, surveyMean, tabSvcs,
  thrFor, timeChange, totalKey, wentIn, wentInRange,
  type ChartLane, type GoLivePeriod, type LaneKey, type SetupDot, type SetupStatus, type SetupStatusResult, type SetupTab, type SetupTiming,
} from '@/lib/setup-timing';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { dayLeft, doneStatus, totalLeft } from '@/lib/onboard-tab';
import { dayMonth } from '@/lib/setup-timing';

/** On-board R1 §14: the R4 inline PM panel is replaced by Settings › SLA On-board (kept, unmounted). */
const LEGACY_PM_PANEL = false;
const SVC_COLOR = { ORM: 'var(--svc-orm)', Marcom: 'var(--svc-marcom)' } as const;
const ST_COLOR: Record<SetupStatus, string> = { ok: 'var(--grade-good)', near: 'var(--grade-watch)', late: 'var(--grade-action)' };
const R = 5.5;
const STAGE_NAME: Record<LaneKey, string> = { p1: 'P1 · ช่วง AE', p2s: 'P2 · Specialist', p2o: 'P2 · ทีมบริการ', w: 'รอวันประชุม', p3: 'P3 · ช่วงก่อน Go Live' };
const svcText = (t: SetupTiming) => `${t.svc}${t.gmb ? ' · GMB' : ''}`;
const ownersText = (t: SetupTiming) => [t.input.ae && `AE ${t.input.ae}`, t.input.specialist && `Specialist ${t.input.specialist}`,
  t.svc === 'ORM' ? t.input.orm_team && `ORM Team ${t.input.orm_team}` : t.input.marcom_owner && `Marcom ${t.input.marcom_owner}`].filter(Boolean).join(' · ');
const toneClass = (s: SetupStatus | null | undefined) => (s === 'late' ? 'sd-t-late' : s === 'near' ? 'sd-t-near' : s === 'ok' ? 'sd-t-ok' : '');

export function SetupDurationCard() {
  const feed = useSetupFeed();
  const versions = useSetupKpiVersions(feed?.demo ?? false);
  const [tab, setTab] = useState<SetupTab>('all');
  const [period, setPeriod] = useState<GoLivePeriod | null>(null);
  const [quick, setQuick] = useState<SetupStatus | null>(null);
  const [panel, setPanel] = useState(false);
  const [help, setHelp] = useState(false);
  const [actAs, setActAs] = useState<'PM' | 'OTHER'>('PM');
  const today = feed?.today ?? '';
  const timings = useMemo(() => feed?.timings ?? [], [feed]);
  const st = useMemo(() => new Map(timings.map((t) => [t.card_id, statusFor(t, versions)])), [timings, versions]);
  if (!feed) return <section className="dash-card sd-card" data-testid="sd-card"><header className="dash-card-header"><h2><span className="cl-num" aria-hidden>5</span>{SD.title}</h2></header><p className="dash-empty">กำลังโหลด…</p></section>;
  const p: GoLivePeriod = period ?? { kind: 'month', key: monthKey(today) };
  const latest = versionFor(versions, today).values;
  const isPm = actAs === 'PM';
  const inProg = timings.filter((t) => !t.done);
  const lateN = inProg.filter((t) => st.get(t.card_id)?.contract === 'late').length;
  const nearN = inProg.filter((t) => st.get(t.card_id)?.contract === 'near').length;
  const scoped = timings.filter((t) => tabSvcs(tab).includes(t.svc));
  const counts = quickCounts(scoped.filter((t) => !t.done), st);
  return (
    <section className="dash-card sd-card" id="setup-duration" data-testid="sd-card">
      <header className="dash-card-header">
        <div className="min-w-0">
          <h2><span className="cl-num" aria-hidden>5</span>{SD.title}<InfoButton info={{ read: SD.info }} /></h2>
          <div className="cl-asof">{SD.asOf(thDate(today))}</div>
          <p className="cl-note">{SD.sub}</p>
        </div>
        <div className="sd-head-right">
          <div className="sd-big"><strong>{inProg.length}</strong> {SD.bigUnit}</div>
          <div className="sd-head-line">{SD.inSetup(inProg.filter((t) => t.svc === 'ORM').length, inProg.filter((t) => t.svc === 'Marcom').length)}</div>
          <div className="sd-head-line"><span className="sd-t-late">{SD.late(lateN)}</span> · <span className="sd-t-near">{SD.near(nearN)}</span></div>
          <div className="sd-head-btns">
            <label className="sd-actas">{SD.actAs}
              <select value={actAs} onChange={(e) => { setActAs(e.target.value as 'PM' | 'OTHER'); if (e.target.value !== 'PM') setPanel(false); }}>
                <option value="PM">{SD.actPm}</option><option value="OTHER">{SD.actOther}</option>
              </select>
            </label>
            {/* On-board R1 §14: one link for PM and others alike; the inline PM panel is unmounted (code kept). */}
            <Link to="/ps/settings/sla-onboard" className="r1-help" data-testid="sd-pm-btn">⚙ SLA On-board</Link>
            <button type="button" className="r1-help" aria-expanded={help} onClick={() => setHelp((v) => !v)}>{SD.help}</button>
          </div>
        </div>
      </header>
      {help && <ol className="sd-help" data-testid="sd-help">{SD.helpSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      {LEGACY_PM_PANEL && panel && isPm && <PmPanel feed={feed} versions={versions} latest={latest} onClose={() => setPanel(false)} />}
      <div className="sd-tabs" role="tablist">
        {(['all', 'orm', 'mc'] as const).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={cn('sd-pill', tab === k && 'is-on')} onClick={() => { setTab(k); setQuick(null); }}>{SD.tabs[k]}</button>)}
      </div>
      <GoLivePeriodControl period={p} onChange={setPeriod} timings={scoped} today={today} />
      <div className="sd-quick">
        <span className="cl-ctl-label">{SD.quick}</span>
        {(['late', 'near', 'ok'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={quick === k} className={cn('sd-chip', `sd-chip-${k}`, quick === k && 'is-on')} onClick={() => setQuick(quick === k ? null : k)}>
            {k === 'late' ? SD.quickLate(counts.late) : k === 'near' ? SD.quickNear(counts.near) : SD.quickOk(counts.ok)}
          </button>
        ))}
        {quick && <button type="button" className="sd-link" onClick={() => setQuick(null)}>{SD.clear}</button>}
        <span className="cl-muted">{SD.counted(counts.late + counts.near + counts.ok)}</span>
      </div>
      <Legend tab={tab} />
      <JourneyChart tab={tab} timings={scoped} st={st} period={p} quick={quick} latest={latest} versions={versions} today={today} />
      <StageTable tab={tab} timings={timings} st={st} quick={quick} period={p} latest={latest} today={today} />
      <CompareSection tab={tab} feed={feed} versions={versions} period={p} />
    </section>
  );
}

/** §2 step 2 — `ช่วง Go Live` segmented control + stepper (shared with the queue table). */
export function GoLivePeriodControl({ period, onChange, timings, today, label = SD.period }: { period: GoLivePeriod; onChange: (p: GoLivePeriod) => void; timings: SetupTiming[]; today: string; label?: string }) {
  const b = period.kind === 'all' ? null : goLiveBounds(timings, period.kind, today);
  return (
    <div className="cl-ctl sd-period">
      <span className="cl-ctl-label">{label}</span>
      <div className="sd-seg" role="group">
        {(['all', 'month', 'quarter'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={period.kind === k} className={cn(period.kind === k && 'is-on')}
            onClick={() => onChange(k === 'all' ? { kind: 'all' } : { kind: k, key: k === 'month' ? monthKey(today) : quarterKey(today) })}>{SD.periodKinds[k]}</button>
        ))}
      </div>
      {period.kind !== 'all' && b && (
        <span className="cl-stepper">
          <button type="button" aria-label="ก่อนหน้า" disabled={period.key <= b.first} onClick={() => onChange(shiftPeriod(period, -1))}>‹</button>
          <span data-testid="sd-period-label">{periodTitle(period, today)}</span>
          <button type="button" aria-label="ถัดไป" disabled={period.key >= b.current} onClick={() => onChange(shiftPeriod(period, 1))}>›</button>
        </span>
      )}
    </div>
  );
}

function Legend({ tab }: { tab: SetupTab }) {
  const dot = (c: string, ring?: string) => <svg width="16" height="14" aria-hidden><circle cx="8" cy="7" r="4" fill={c} />{ring && <circle cx="8" cy="7" r="6.4" fill="none" stroke={ring} strokeWidth="1.8" />}</svg>;
  return (
    <div className="sd-legend">
      <div>
        {tab === 'all' ? (<>
          <span>{dot(SVC_COLOR.ORM)}ORM</span><span>{dot(SVC_COLOR.Marcom)}Marcom</span><span>{SD.legend.ring}</span>
          <span>{dot('var(--card)', ST_COLOR.near)}{SD.legend.near}</span><span>{dot('var(--card)', ST_COLOR.late)}{SD.legend.late}</span><span>{SD.legend.noRing}</span>
        </>) : (<>
          <span>{dot(ST_COLOR.ok)}{SD.legend.ok}</span><span>{dot(ST_COLOR.near)}{SD.legend.near}</span><span>{dot(ST_COLOR.late)}{SD.legend.late}</span><span>{dot('var(--neutral-bar)')}{SD.legend.none}</span>
        </>)}
        <span>{SD.legend.goLive}</span><span>{dot(SVC_COLOR.ORM)}ORM</span><span>{dot(SVC_COLOR.Marcom)}Marcom</span>
      </div>
      <div>
        <span><svg width="22" height="12" aria-hidden><rect x="1" y="1" width="10" height="10" rx="2" className="sd-box-ok" /><rect x="11" y="1" width="10" height="10" rx="2" className="sd-box-near" /></svg>{SD.legend.box}</span>
        <span><svg width="24" height="10" aria-hidden><line x1="0" y1="5" x2="24" y2="5" className="sd-stair" /></svg>{SD.legend.path}</span>
        <span>{SD.legend.side}</span>
      </div>
    </div>
  );
}

/* ================= §5–§6 journey chart ================= */
type Hover = { kind: 'dot'; dot: SetupDot; cx: number; cy: number; clientX: number; clientY: number } | { kind: 'day'; day: number; clientX: number; clientY: number } | null;
type ChartProps = { tab: SetupTab; timings: SetupTiming[]; st: Map<string, SetupStatusResult>; period: GoLivePeriod; quick: SetupStatus | null; latest: KpiValues; versions: SetupKpiVersion[]; today: string };

function JourneyChart({ tab, timings, st, period, quick, latest, versions, today }: ChartProps) {
  const { ref, width } = usePlotSize();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const W = Math.max(width || 0, 820);
  const LEFT = 150, LBL = 118, X0 = LEFT + LBL, X1 = W - 28, TOP = 34;
  const x = (d: number) => X0 + (capX(d) / X_MAX) * (X1 - X0);
  const lanes = chartLanes(tab);
  const dots = lanes.map((l) => laneDots(timings, l, st, period));
  const swarm = dots.map((ds) => beeswarm(ds.map((d) => x(d.day)), R + 0.5));
  const heights = lanes.map((l, i) => (l.reserved ? 34 : Math.max(34, 2 * Math.max(0, ...swarm[i]!.map(Math.abs)) + 2 * R + 14)));
  const pos: { top: number; h: number; c: number }[] = new Array(lanes.length);
  let cur = TOP;
  for (let i = lanes.length - 1; i >= 0; i--) { pos[i] = { top: cur, h: heights[i]!, c: cur + heights[i]! / 2 }; cur += heights[i]!; }
  const bottom = cur, H = bottom + 46;
  const svc = tab === 'mc' ? 'Marcom' : 'ORM';
  const laneIdx = (pred: (l: ChartLane) => boolean) => lanes.findIndex(pred);
  const iP1 = laneIdx((l) => l.key === 'p1'), iP2 = laneIdx((l) => l.key === 'p2o' && l.kpiSvc === svc), iP3 = laneIdx((l) => l.key === 'p3' && l.kpiSvc === svc), iGo = laneIdx((l) => l.key === 'golive');
  const b1 = kpiBox('p1', svc, latest)!, b2 = kpiBox('p2o', svc, latest)!, b3 = kpiBox('p3', svc, latest)!;
  const stair = `M${x(0)} ${pos[iP1]!.c} H${x(b1.due)} V${pos[iP2]!.c} H${x(b3.start)} V${pos[iP3]!.c} H${x(b3.due)} V${pos[iGo]!.c}`;
  void b2;
  const target = latest[totalKey(svc)].due;
  const bands = [...new Set(lanes.map((l) => l.band))].map((band) => {
    const idx = lanes.map((l, i) => (l.band === band ? i : -1)).filter((i) => i >= 0);
    const top = Math.min(...idx.map((i) => pos[i]!.top)), bot = Math.max(...idx.map((i) => pos[i]!.top + pos[i]!.h));
    const meta = band === 'p2' && tab === 'mc' ? SD.bands.p2mc : band === 'golive' && tab === 'mc' ? SD.bands.golivemc : SD.bands[band];
    return { band, top, bot, meta };
  });
  const dimQuick = (d: SetupDot, l: ChartLane) => quick != null && l.key !== 'golive' && !matchesQuick(d.t, quick, st);
  const opacity = (d: SetupDot, l: ChartLane) => {
    if (dimQuick(d, l)) return 0.15;
    if (hover?.kind === 'dot') return hover.dot.t.card_id === d.t.card_id ? 1 : 0.22;
    if (hover?.kind === 'day') return capX(d.day) === hover.day ? 1 : 0.28;
    return 1;
  };
  const dayAt = (clientX: number) => { const r = svgRef.current?.getBoundingClientRect(); if (!r) return null; const lx = clientX - r.left; if (lx < X0 - 6 || lx > X1 + 6) return null; return Math.max(0, Math.min(X_CAP, Math.round(((lx - X0) / (X1 - X0)) * X_MAX))); };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest?.('[data-dot]')) return;
    const d = dayAt(e.clientX);
    setHover(d == null ? null : { kind: 'day', day: d, clientX: e.clientX, clientY: e.clientY });
  };
  const keyDay = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { setHover(null); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const start = Math.min(X_CAP, ...timings.filter((t) => !t.done).map((t) => capX(t.elapsed)));
    const d = hover?.kind === 'day' ? Math.max(0, Math.min(X_CAP, hover.day + (e.key === 'ArrowRight' ? 1 : -1))) : Number.isFinite(start) ? start : 0;
    const r = svgRef.current?.getBoundingClientRect();
    setHover({ kind: 'day', day: d, clientX: (r?.left ?? 0) + x(d), clientY: (r?.top ?? 0) + TOP + 24 });
  };
  const open = (t: SetupTiming) => openOnboardCard(t.card_id);
  const fill = (d: SetupDot, l: ChartLane) => (l.key === 'golive' || tab === 'all' ? SVC_COLOR[d.t.svc] : d.status ? ST_COLOR[d.status] : 'var(--neutral-bar)');
  const ht = hover?.kind === 'dot' ? hover.dot.t : null;
  const colW = (X1 - X0) / X_MAX;
  return (
    <div className="sd-chart-scroll">
      <div ref={ref} className="sd-chart-wrap" tabIndex={0} onKeyDown={keyDay} aria-label={SD.axis} data-testid="sd-chart">
        <svg ref={svgRef} width={W} height={H} className="sd-chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {/* grid + bands */}
          {X_TICKS.map((d) => <line key={d} x1={x(d)} x2={x(d)} y1={TOP} y2={bottom} className="sd-grid" />)}
          {bands.map((b, i) => (
            <g key={b.band}>
              {i > 0 && <line x1={0} x2={X1} y1={b.bot} y2={b.bot} className="sd-band-sep" />}
              <text x={8} y={(b.top + b.bot) / 2 - (b.meta.sub ? 4 : -4)} className="sd-band-name">{b.meta.name}</text>
              {b.meta.sub && <text x={8} y={(b.top + b.bot) / 2 + 11} className="sd-band-sub">{b.meta.sub}</text>}
            </g>
          ))}
          {lanes.map((l, i) => {
            const q = pos[i]!; const prev = lanes[i + 1];
            return <g key={l.id}>
              {prev && prev.band === l.band && <line x1={X0 - LBL + 6} x2={X1} y1={q.top} y2={q.top} className="sd-lane-sep" />}
              {l.label && <text x={X0 - 10} y={q.c + 4} textAnchor="end" className="sd-lane-name">{l.label}</text>}
            </g>;
          })}
          {/* KPI boxes (settings only) */}
          {lanes.map((l, i) => {
            if (l.reserved || l.key === 'golive' || l.key === 'w') return null;
            const b = kpiBox(l.key, l.kpiSvc, latest); if (!b) return null; const q = pos[i]!;
            return <g key={`b-${l.id}`}>
              <rect x={x(b.start)} y={q.c - 11} width={Math.max(0, x(b.ok) - x(b.start))} height={22} rx={6} className="sd-box-ok" />
              <rect x={x(b.ok)} y={q.c - 11} width={Math.max(0, x(b.due) - x(b.ok))} height={22} rx={6} className="sd-box-near" />
              <text x={x(b.due) + 5} y={q.c + 3.5} className="sd-within">{SD.within(b.due)}</text>
            </g>;
          })}
          <path d={stair} className="sd-stair" fill="none" />
          <line x1={x(target + 0.5)} x2={x(target + 0.5)} y1={TOP - 8} y2={bottom} className="sd-target" />
          <text x={x(target + 0.5)} y={TOP - 12} textAnchor="middle" className="sd-target-text">{SD.target(target)}</text>
          {/* hover day column */}
          {hover?.kind === 'day' && <g pointerEvents="none">
            <rect x={x(hover.day) - colW / 2} y={TOP} width={colW} height={bottom - TOP} className="sd-day-band" />
            <line x1={x(hover.day)} x2={x(hover.day)} y1={TOP} y2={bottom} className="sd-cross" />
            <AxisBadge x={x(hover.day)} y={bottom} text={hover.day >= X_CAP ? '21+' : String(hover.day)} />
          </g>}
          {/* reserved + empty lanes */}
          {lanes.map((l, i) => {
            const q = pos[i]!;
            if (l.reserved) return <g key={`r-${l.id}`}><rect x={X0} y={q.top + 4} width={X1 - X0} height={q.h - 8} rx={8} className="sd-reserved" /><text x={(X0 + X1) / 2} y={q.c + 4} textAnchor="middle" className="sd-empty">{SD.reserved}</text></g>;
            return dots[i]!.length ? null : <text key={`e-${l.id}`} x={(X0 + X1) / 2} y={q.c + 4} textAnchor="middle" className="sd-empty">{SD.emptyLane}</text>;
          })}
          {/* trajectory of the hovered contract */}
          {ht && <Trajectory t={ht} lanes={lanes} pos={pos} x={x} />}
          {hover?.kind === 'dot' && <g pointerEvents="none">
            <line x1={hover.cx} x2={hover.cx} y1={hover.cy} y2={bottom} className="sd-cross" />
            <line x1={X0} x2={hover.cx} y1={hover.cy} y2={hover.cy} className="sd-cross" />
            <AxisBadge x={hover.cx} y={bottom} text={hover.dot.day >= X_CAP ? '21+' : String(hover.dot.day)} />
          </g>}
          {/* dots */}
          {lanes.map((l, i) => dots[i]!.map((d, j) => {
            const cx = x(d.day), cy = pos[i]!.c + swarm[i]![j]!;
            const ring = tab === 'all' && l.key !== 'golive' && (d.status === 'near' || d.status === 'late') ? ST_COLOR[d.status] : null;
            const enter = (clientX: number, clientY: number) => setHover({ kind: 'dot', dot: d, cx, cy, clientX, clientY });
            return (
              <g key={`${l.id}-${d.t.card_id}`} data-dot role="button" tabIndex={0} aria-label={SD.dotAria(d.t.hotel_name)} opacity={opacity(d, l)} className="sd-dot"
                data-card={d.t.card_id} data-status={d.status ?? 'none'} data-ring={ring ? d.status : 'none'}
                onPointerEnter={(e) => enter(e.clientX, e.clientY)} onPointerMove={(e) => enter(e.clientX, e.clientY)}
                onPointerLeave={(e) => { const day = dayAt(e.clientX); setHover(day == null ? null : { kind: 'day', day, clientX: e.clientX, clientY: e.clientY }); }}
                onFocus={(e) => { const r = (e.currentTarget as SVGGElement).getBoundingClientRect(); enter(r.left + r.width / 2, r.top + r.height / 2); }}
                onBlur={() => setHover(null)} onClick={() => open(d.t)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(d.t); } }}>
                <circle cx={cx} cy={cy} r={R + 4} fill="transparent" />
                <circle cx={cx} cy={cy} r={R} fill={fill(d, l)} stroke="var(--card)" strokeWidth={1} />
                {ring && <circle cx={cx} cy={cy} r={R + 3.5} fill="none" stroke={ring} strokeWidth={2.6} />}
              </g>
            );
          }))}
          {/* X axis */}
          <line x1={X0} x2={X1} y1={bottom} y2={bottom} className="sd-axis" />
          {X_TICKS.map((d) => <text key={`t${d}`} x={x(d)} y={bottom + 16} textAnchor="middle" className="sd-tick">{d === X_CAP ? '21+' : d}</text>)}
          <text x={X1} y={bottom + 36} textAnchor="end" className="sd-axis-title">{SD.axis}</text>
        </svg>
      </div>
      {hover?.kind === 'dot' && <FixedTip x={hover.clientX} y={hover.clientY}><DotTip t={hover.dot.t} st={st.get(hover.dot.t.card_id)} versions={versions} /></FixedTip>}
      {hover?.kind === 'day' && <FixedTip x={hover.clientX} y={hover.clientY}><DayTip day={hover.day} lanes={lanes} dots={dots} quick={quick} st={st} versions={versions} tab={tab} today={today} /></FixedTip>}
    </div>
  );
}

function AxisBadge({ x, y, text }: { x: number; y: number; text: string }) {
  return <g><rect x={x - 14} y={y + 3} width={28} height={17} rx={4} className="sd-badge" /><text x={x} y={y + 15} textAnchor="middle" className="sd-badge-text">{text}</text></g>;
}

function Trajectory({ t, lanes, pos, x }: { t: SetupTiming; lanes: ChartLane[]; pos: { c: number }[]; x: (d: number) => number }) {
  const color = SVC_COLOR[t.svc];
  const mine = lanes.map((l, i) => ({ l, i })).filter(({ l }) => !l.reserved && l.svcs.includes(t.svc) && l.key !== 'golive');
  const segs = mine.flatMap(({ l, i }) => { const lt = t.lanes[l.key as LaneKey]; return (lt.state === 'running' || lt.state === 'done') && lt.from != null ? [{ i, key: l.key, from: lt.from, to: lt.to ?? t.elapsed, run: lt.state === 'running' }] : []; });
  const chainKeys: (LaneKey | 'golive')[] = ['p1', 'p2o', 'w', 'p3', 'golive'];
  const goI = lanes.findIndex((l) => l.key === 'golive');
  const chain = chainKeys.flatMap((k) => {
    if (k === 'golive') return t.done && goI >= 0 ? [{ i: goI, at: t.elapsed }] : [];
    const s = segs.find((g) => g.key === k); return s ? [{ i: s.i, at: s.from }] : [];
  });
  return (
    <g pointerEvents="none">
      {segs.map((s) => <g key={`s${s.i}`}><line x1={x(s.from)} x2={x(s.to)} y1={pos[s.i]!.c} y2={pos[s.i]!.c} stroke={color} strokeWidth={2} strokeDasharray={s.run ? '2 3' : '6 4'} /><circle cx={x(s.from)} cy={pos[s.i]!.c} r={2.5} fill={color} /></g>)}
      {chain.slice(1).map((n, k) => <line key={`c${k}`} x1={x(n.at)} x2={x(n.at)} y1={pos[chain[k]!.i]!.c} y2={pos[n.i]!.c} stroke={color} strokeWidth={1.4} strokeDasharray="3 3" />)}
    </g>
  );
}

function FixedTip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ left: x + 14, top: y + 12 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = x + 14; if (left + w > window.innerWidth - 8) left = Math.max(8, x - 14 - w);
    let top = y + 12; if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 8 - h);
    setP((o) => (o.left === left && o.top === top ? o : { left, top }));
  });
  if (typeof document === 'undefined') return null;
  return createPortal(<div ref={ref} className="sd-tip" role="tooltip" data-testid="sd-tip" style={{ left: p.left, top: p.top }}>{children}</div>, document.body);
}

function TipRow({ a, b, cls }: { a: ReactNode; b?: ReactNode; cls?: string }) {
  return <div className="sd-tip-row"><span>{a}</span>{b != null && <span className={cls}>{b}</span>}</div>;
}
function DotTip({ t, st, versions }: { t: SetupTiming; st: SetupStatusResult | undefined; versions: SetupKpiVersion[] }) {
  const tot = thrFor(t, versions, 'total')!;
  const tl = totalLeft(t.elapsed, tot, t.done);
  /* On-board R1 §14: Day-left wording (§0.2) for the status lines. */
  const laneLine = (k: LaneKey) => {
    const l = t.lanes[k]; const thr = thrFor(t, versions, k);
    if (l.state === 'not_started' || l.days == null) return 'ยังไม่ถึง';
    if (k === 'w') return `${l.days} วัน · ${t.input.meeting_date ? `ประชุม ${dayMonth(t.input.meeting_date)}` : 'รอวันประชุม'}`;
    if (!thr) return `${l.days} วัน`;
    return `${l.days} วัน / ${thr.due} · ${l.state === 'running' && !t.done ? dayLeft(l.days, thr).text : doneStatus(l.days, thr).text}`;
  };
  return (
    <div>
      <div className="sd-tip-head">{t.hotel_name} · {svcText(t)}</div>
      {ownersText(t) && <div className="sd-tip-sub">{ownersText(t)}</div>}
      {t.done
        ? <TipRow a={SD.tip.goLive(thDate(t.go_live))} b={SD.tip.total(t.elapsed)} cls={toneClass(st?.total)} />
        : <TipRow a={SD.tip.at(t.current.map((k) => STAGE_NAME[k]).join(' + ') || '—')} b={SD.tip.used(t.elapsed)} />}
      <TipRow a={SD.tip.start(thDate(t.day0))} b={`เป้ารวม ${tot.due} วัน · ${tl.text}`} cls={tl.tone === 'red' ? 'sd-t-late' : tl.tone === 'amber' ? 'sd-t-near' : tl.tone === 'green' ? 'sd-t-ok' : ''} />
      <div className="sd-tip-lanes">
        {LANE_KEYS.filter((k) => t.lanes[k].state !== 'na').map((k) => {
          const l = t.lanes[k];
          return <TipRow key={k} a={<>{SD.laneTip[k]}{l.from != null && <span className="sd-tip-dim"> {SD.tip.range(l.from, l.state === 'running' ? null : l.to)}</span>}</>} b={laneLine(k)} cls={toneClass(st?.lanes[k])} />;
        })}
      </div>
      <div className="sd-tip-foot">{SD.tip.footer}</div>
    </div>
  );
}
function DayTip({ day, lanes, dots, quick, st, versions, tab, today }: { day: number; lanes: ChartLane[]; dots: SetupDot[][]; quick: SetupStatus | null; st: Map<string, SetupStatusResult>; versions: SetupKpiVersion[]; tab: SetupTab; today: string }) {
  void today;
  const groups = lanes.map((l, i) => ({ l, ds: dots[i]!.filter((d) => capX(d.day) === day && (l.key === 'golive' || !quick || matchesQuick(d.t, quick, st))) })).filter((g) => g.ds.length);
  const distinct = new Set(groups.flatMap((g) => g.ds.map((d) => d.t.card_id))).size;
  const bandName = (l: ChartLane) => { const b = l.band === 'p2' && tab === 'mc' ? SD.bands.p2mc : SD.bands[l.band]; return `${b.name}${l.label ? ` · ${l.label}` : ''}`; };
  let shown = 0; const total = groups.reduce((s, g) => s + g.ds.length, 0);
  return (
    <div>
      <div className="sd-tip-head">{SD.tip.dayHead(day, distinct)}</div>
      {!groups.length && <div className="sd-tip-sub">{SD.tip.dayEmpty}</div>}
      {groups.map(({ l, ds }) => {
        if (shown >= 12) return null;
        const rows = ds.slice(0, 12 - shown); shown += rows.length;
        return <div key={l.id} className="sd-tip-group">
          <div className="sd-tip-gh">{bandName(l)} · {ds.length}</div>
          {rows.map((d) => {
            const key = l.key; const days = key === 'golive' ? d.t.elapsed : d.t.lanes[key].days ?? 0;
            const thr = thrFor(d.t, versions, key === 'golive' ? 'total' : key);
            const s = key === 'golive' ? st.get(d.t.card_id)?.total ?? null : d.status;
            return <TipRow key={d.t.card_id} a={`${d.t.hotel_name} ${d.t.svc}`} b={shortStatus(key, days, thr, s)} cls={key === 'golive' ? (days <= (thr?.due ?? 0) ? 'sd-t-ok' : 'sd-t-late') : toneClass(s)} />;
          })}
        </div>;
      })}
      {total > 12 && <div className="sd-tip-sub">{SD.tip.more(total - 12)}</div>}
      {groups.length > 0 && <div className="sd-tip-foot">{SD.tip.dayFooter}</div>}
    </div>
  );
}

/* ================= §8 ภาพรวมราย stage ================= */
function StagePill({ label, a, n, tone }: { label: string; a: number; n: number; tone: 'ok' | 'near' | 'late' }) {
  return <span className={cn('sd-pill-stat', a > 0 && `sd-pill-${tone}`)}>{SD.stage.pill(label, a, n)}</span>;
}
function StageTable({ tab, timings, st, quick, period, latest, today }: { tab: SetupTab; timings: SetupTiming[]; st: Map<string, SetupStatusResult>; quick: SetupStatus | null; period: GoLivePeriod; latest: KpiValues; today: string }) {
  const { rows, golive } = stageSummary(timings, tab, latest, st, quick, period);
  const bandName = (l: ChartLane) => (l.band === 'p2' && tab === 'mc' ? SD.bands.p2mc : SD.bands[l.band]).name;
  return (
    <div className="sd-section">
      <h3>{SD.stage.title}<InfoButton info={{ read: SD.stage.info }} /></h3>
      <div className="sd-table-scroll">
        <table className="sd-table" data-testid="sd-stage-table">
          <thead><tr>{SD.stage.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lane.id} data-lane={r.lane.id}>
                <td>{bandName(r.lane)}</td><td>{r.lane.label || '—'}</td>
                <td>{r.due == null ? SD.stage.noDue : SD.stage.due(r.due)}</td>
                {r.n === 0 ? <td colSpan={4} className="cl-muted">{SD.emptyLane}</td> : (<>
                  <td>{SD.stage.doing(r.n)}{tab === 'all' && r.orm > 0 && r.mc > 0 && <span className="cl-muted"> {SD.stage.split(r.orm, r.mc)}</span>}</td>
                  {r.lane.key === 'w' ? <><td>—</td><td>—</td><td>—</td></> : (<>
                    <td><span className="sd-pill-stat sd-pill-ok">{SD.stage.pill(SD.status['ok']!, r.ok, r.n)}</span></td>
                    <td><StagePill label={SD.status['near']!} a={r.near} n={r.n} tone="near" /></td>
                    <td><StagePill label={SD.status['late']!} a={r.late} n={r.n} tone="late" /></td>
                  </>)}
                </>)}
              </tr>
            ))}
            <tr className="sd-row-accent" data-lane="golive">
              <td>{SD.stage.goLive}</td><td>{periodTitle(period, today)}</td><td>{SD.stage.target(golive.due)}</td><td>{SD.stage.goLiveN(golive.n)}</td>
              <td><span className="sd-pill-stat sd-pill-ok">{SD.stage.frac(golive.n - golive.over, golive.n)}</span></td><td>—</td>
              <td><span className={cn('sd-pill-stat', golive.over > 0 && 'sd-pill-late')}>{SD.stage.frac(golive.over, golive.n)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= §9–§10 เปรียบเทียบผลงาน ================= */
type Change = { text: string; tone: 'good' | 'bad' | 'flat' } | null;
const ChangeCell = ({ c }: { c: Change }) => <td className={c?.tone === 'good' ? 'sd-t-ok' : c?.tone === 'bad' ? 'sd-t-late' : ''}>{c?.text ?? '—'}</td>;
const pctPill = (x: number | null, p: number | null) => (x == null || p == null ? '—' : <span className={cn('sd-pill-stat', `sd-pill-${pctTone(p) === 'good' ? 'ok' : pctTone(p) === 'watch' ? 'near' : 'late'}`)}>{SD.cmp.onTime(x, p)}</span>);
function CompareSection({ tab, feed, versions, period }: { tab: SetupTab; feed: SetupFeed; versions: SetupKpiVersion[]; period: GoLivePeriod }) {
  const today = feed.today;
  const [mode, setMode] = useState<'equal' | 'custom'>('equal');
  const [pickB, setPickB] = useState<string | null>(null);
  const cm = monthKey(today);
  const shift = (k: string, n: number) => { const d = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const [range, setRange] = useState({ aFrom: shift(cm, -2), aTo: cm, bFrom: shift(cm, -5), bTo: shift(cm, -3) });
  const [err, setErr] = useState<string | null>(null);
  const svcs = tabSvcs(tab);
  const ts = feed.timings;
  let A: SetupTiming[] = [], B: SetupTiming[] = [], la = '', lb = '', desc: ReactNode = null, table = true;
  if (mode === 'equal') {
    if (period.kind === 'all') { desc = SD.cmp.needPeriod; table = false; }
    else {
      const lab = (k: string) => (period.kind === 'month' ? monthLabel(k) : quarterLabel(k));
      const { nA, candidates, equalCount } = equalCountCandidates(ts, svcs, period.kind, period.key);
      const b = candidates.find((c) => c.key === pickB) ?? candidates[0];
      la = lab(period.key); A = wentIn(ts, svcs, period.kind, period.key);
      if (nA === 0) { desc = SD.cmp.noneA(la); table = false; }
      else if (!b) { desc = SD.cmp.noneA(la); table = false; }
      else {
        lb = lab(b.key); B = wentIn(ts, svcs, period.kind, b.key);
        desc = <>
          <label className="sd-inline">{SD.cmp.pick}
            <select value={b.key} onChange={(e) => setPickB(e.target.value)} data-testid="sd-pick-b">
              {candidates.map((c) => <option key={c.key} value={c.key}>{SD.cmp.option(lab(c.key), c.n, c.equal)}</option>)}
            </select>
          </label>
          <span className="cl-muted" data-testid="sd-cmp-desc">{equalCount > 0 ? SD.cmp.descEqual(la, nA, lb, b.n, period.kind === 'month' ? SD.cmp.back24 : SD.cmp.back8, equalCount) : SD.cmp.descNearest(la, nA, lb, b.n)}</span>
        </>;
      }
    }
  } else {
    A = wentInRange(ts, svcs, range.aFrom, range.aTo); B = wentInRange(ts, svcs, range.bFrom, range.bTo);
    la = `${monthLabel(range.aFrom)}–${monthLabel(range.aTo)}`; lb = `${monthLabel(range.bFrom)}–${monthLabel(range.bTo)}`;
    const set = (patch: Partial<typeof range>) => {
      const next = { ...range, ...patch };
      const e = rangeError(next.aFrom, next.aTo) ?? rangeError(next.bFrom, next.bTo);
      setErr(e); if (!e) setRange(next);
    };
    desc = <>
      {(['a', 'b'] as const).map((s) => (
        <span key={s} className="sd-inline">{s === 'a' ? SD.cmp.rangeA : SD.cmp.rangeB}
          <input type="month" value={s === 'a' ? range.aFrom : range.bFrom} onChange={(e) => e.target.value && set(s === 'a' ? { aFrom: e.target.value } : { bFrom: e.target.value })} />–
          <input type="month" value={s === 'a' ? range.aTo : range.bTo} onChange={(e) => e.target.value && set(s === 'a' ? { aTo: e.target.value } : { bTo: e.target.value })} />
        </span>
      ))}
      {err && <span className="sd-t-late" role="alert">{err}</span>}
      {countsDifferMuch(A.length, B.length) && <span className="sd-warn">{SD.cmp.warn}</span>}
    </>;
  }
  const defs = compareDefs(tab);
  const ftrOn = ftrAvailable(feed.ftrEnabled, feed.fixCount);
  const surveyRow = (which: 1 | 2) => {
    const svc = tab === 'all' ? (which === 1 ? 'ORM' : null) : tab === 'orm' ? 'ORM' : 'Marcom';
    if (which === 1 && tab === 'mc') return <tr key="s1"><td>{SD.cmp.s1}</td><td colSpan={5} className="cl-muted">{SD.cmp.notYet}</td></tr>;
    const a = surveyMean(A, which, svc), b = surveyMean(B, which, svc);
    const cell = (m: { mean: number; n: number } | null) => (m ? <>{SD.cmp.score(m.mean, 10)} <span className="cl-muted">({m.n})</span></> : feed.demo ? '—' : SD.liveNoSurvey);
    return <tr key={`s${which}`}><td>{which === 1 ? SD.cmp.s1 : SD.cmp.s2}</td><td>{cell(a)}</td><td>—</td><td>{cell(b)}</td><td>—</td><ChangeCell c={surveyChange(a?.mean ?? null, b?.mean ?? null)} /></tr>;
  };
  const ftrRow = () => {
    if (tab === 'mc') return <tr key="ftr"><td>{SD.cmp.ftr}</td><td colSpan={5} className="cl-muted">{SD.cmp.notYet}</td></tr>;
    if (!ftrOn) return <tr key="ftr"><td>{SD.cmp.ftr}<InfoButton info={{ read: SD.cmp.ftrInfo }} /></td><td colSpan={5} className="cl-muted" data-testid="sd-ftr">{SD.cmp.waiting}</td></tr>;
    const a = firstTimeRight(A, feed.fixCardIds), b = firstTimeRight(B, feed.fixCardIds);
    return <tr key="ftr"><td>{SD.cmp.ftr}</td><td data-testid="sd-ftr">{pctPill(a.n ? a.x : null, a.pct)} <span className="cl-muted">({a.n})</span></td><td>—</td><td>{pctPill(b.n ? b.x : null, b.pct)} <span className="cl-muted">({b.n})</span></td><td>—</td><ChangeCell c={pctChange(a.pct, b.pct)} /></tr>;
  };
  return (
    <div className="sd-section">
      <h3>{SD.cmp.title}<InfoButton info={{ read: SD.cmp.info }} /><span className="cl-muted"> · {SD.tabs[tab]}</span></h3>
      <div className="sd-cmp-controls">
        <span className="cl-ctl-label">{SD.cmp.mode}</span>
        <div className="sd-seg" role="group">
          <button type="button" aria-pressed={mode === 'equal'} className={cn(mode === 'equal' && 'is-on')} onClick={() => setMode('equal')}>{SD.cmp.equal}</button>
          <button type="button" aria-pressed={mode === 'custom'} className={cn(mode === 'custom' && 'is-on')} onClick={() => setMode('custom')}>{SD.cmp.custom}</button>
        </div>
      </div>
      <div className="sd-cmp-desc">{desc}</div>
      {table && (
        <div className="sd-table-scroll">
          <table className="sd-table" data-testid="sd-cmp-table">
            <thead><tr>{SD.cmp.cols(la, lb).map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {defs.map((d) => {
                const a = compareCell(A, d, versions), b = compareCell(B, d, versions);
                return <tr key={d.id} className={cn(d.total && 'sd-row-accent')}>
                  <td>{d.label}</td>
                  <td>{mostText(a.values)} <span className="cl-muted">({a.n})</span></td><td>{d.lane === 'w' ? '—' : pctPill(a.n ? a.onTime : null, a.pct)}</td>
                  <td>{mostText(b.values)} <span className="cl-muted">({b.n})</span></td><td>{d.lane === 'w' ? '—' : pctPill(b.n ? b.onTime : null, b.pct)}</td>
                  <ChangeCell c={timeChange(a.median, b.median)} />
                </tr>;
              })}
              <tr className="sd-subhead"><td colSpan={6}>{SD.cmp.quality}</td></tr>
              {ftrRow()}{surveyRow(1)}{surveyRow(2)}
            </tbody>
          </table>
        </div>
      )}
      <p className="cl-note">{SD.cmp.foot}</p>
    </div>
  );
}

/* ================= §4.2 PM panel ================= */
function PmPanel({ feed, versions, latest, onClose }: { feed: SetupFeed; versions: SetupKpiVersion[]; latest: KpiValues; onClose: () => void }) {
  const [draft, setDraft] = useState<KpiValues>(() => JSON.parse(JSON.stringify(latest)) as KpiValues);
  const [err, setErr] = useState<string | null>(null);
  const today = feed.today;
  const win = baseWindow(today);
  const setV = (k: (typeof KPI_KEYS)[number], f: 'ok' | 'due', v: string) => setDraft((d) => ({ ...d, [k]: { ...d[k], [f]: v === '' ? NaN : Number(v) } }));
  const save = () => {
    const r = saveKpiVersion(versions, draft, today, 'PM', new Date().toISOString());
    if (!r.ok) { setErr(r.error); return; }
    setKpiVersions(feed.demo, r.versions); setErr(null); toast.success(SD.pm.saved); onClose();
  };
  const pctCls = (p: number | null) => cn('sd-pill-stat', p != null && `sd-pill-${pctTone(p) === 'good' ? 'ok' : pctTone(p) === 'watch' ? 'near' : 'late'}`);
  const hist = [...versions].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return (
    <div className="sd-pm" data-testid="sd-pm-panel">
      <p className="cl-note">{SD.pm.note(monthLabel(win.from), monthLabel(win.to), thDate(today))}</p>
      <div className="sd-table-scroll">
        <table className="sd-table">
          <thead><tr>{SD.pm.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {KPI_KEYS.map((k) => {
              const vals = kpiBaseValues(feed.timings, k, today);
              const pNow = pctWithin(vals, latest[k]), pNew = Number.isFinite(draft[k].due) ? pctWithin(vals, draft[k]) : null;
              return <tr key={k} data-key={k}>
                <td>{KPI_LABEL[k]}</td><td>{SD.pm.current(latest[k].ok, latest[k].due)}</td>
                <td><input type="number" min={0} max={60} aria-label={`${KPI_LABEL[k]} ทันกำหนดถึง`} value={Number.isFinite(draft[k].ok) ? draft[k].ok : ''} onChange={(e) => setV(k, 'ok', e.target.value)} /></td>
                <td><input type="number" min={0} max={60} aria-label={`${KPI_LABEL[k]} กำหนดเสร็จ`} value={Number.isFinite(draft[k].due) ? draft[k].due : ''} onChange={(e) => setV(k, 'due', e.target.value)} /></td>
                <td>{vals.length ? SD.pm.most(mostText(vals), vals.length) : '—'}</td><td>{SD.pm.within(p80(vals))}</td>
                <td><span className={pctCls(pNow)}>{pNow == null ? '—' : `${pNow}%`}</span></td>
                <td><span className={pctCls(pNew)} data-testid={`sd-new-${k}`}>{pNew == null ? '—' : `${pNew}%`}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {err && <p className="sd-t-late" role="alert">{err}</p>}
      <div className="sd-pm-btns">
        <button type="button" className="sd-btn-primary" onClick={save}>{SD.pm.save(thDate(today))}</button>
        <button type="button" className="r1-help" onClick={onClose}>{SD.pm.cancel}</button>
      </div>
      <div className="sd-pm-hist">
        <strong>{SD.pm.history}</strong>
        <ul>{hist.map((v) => <li key={v.id}>{v.id === DEFAULT_KPI_VERSION.id ? SD.pm.fromStart : SD.pm.from(thDate(v.effective_from))} · {v.note}</li>)}</ul>
      </div>
    </div>
  );
}

/* ================= §11 card ⑥ — Coming soon strip ================= */
export function SetupResetStrip() {
  return (
    <section className="dash-card sd-reset" data-testid="sd-reset">
      <div className="sd-reset-main">
        <h2><span className="cl-num" aria-hidden>6</span>{SD.reset.title}<span className="sd-soon">{SD.reset.soon}</span></h2>
        <div className="cl-asof">{SD.reset.sub}</div>
        <p className="cl-note">{SD.reset.text}</p>
      </div>
      <svg className="sd-reset-sketch" width="150" height="56" viewBox="0 0 150 56" aria-hidden>
        <rect x="6" y="38" width="34" height="12" rx="3" /><rect x="50" y="22" width="34" height="12" rx="3" /><rect x="94" y="6" width="34" height="12" rx="3" />
        <path d="M6 44 H40 V28 H84 V12 H128" fill="none" strokeDasharray="3 3" />
        <circle cx="22" cy="44" r="3.5" /><circle cx="66" cy="28" r="3.5" /><circle cx="110" cy="12" r="3.5" />
      </svg>
    </section>
  );
}
