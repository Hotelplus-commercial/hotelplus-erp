/* Tab R3 §1–§4 — card ④ อายุสัญญา (Contract Lifetime), `ณ วันนี้` (no period bar, no compare, no Δ).
 * Reads the read-only feed from use-contract-age; rules in src/lib/contract-age.ts; text in ps-glossary CL.
 * The only write path is the drawer's WELCOME_BACK send. */
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InfoButton } from "./dash-card";
import { GuidedTour } from "./guided-tour";
import { usePlotSize } from "./use-plot-size";
import { ContractHistoryDrawer } from "./contract-history-drawer";
import type { ContractAgeFeed } from "./use-contract-age";
import { CL, R1_STATUS_TH } from "@/lib/ps-glossary";
import { reasonLabel } from "@/lib/renewal-r2";
import { pageList } from "@/lib/contract-tab-r1";
import {
  AGE_SVCS, ALL_PERIOD, CONTRACT_AGE_CONFIG as CFG, EMPTY_CHURN_FILTER, EMPTY_DRAFT, HEAT_RANGES, NO_REASON,
  activeOf, ageText, beeswarm, churnRows, cycleSort, distribution, drawnRows, filterChurn, heatAlpha, heatQuarters, hundredTicks,
  inPeriod, makeScale, medianActive, nextPeriod, pageOf, pctText, periodBounds, periodLabelOf, periodSummary, phasePills, quarterLabel,
  reasonOf, reasonOptions, sinceText, sortChurn, survivalTable, thDate, topZone, zoneBoxes, zoneCounts, zoneOf, zoneWidths, zonesFor,
  type AgeSvc, type ChurnFilter, type ChurnRow, type ChurnSort, type ContractAgeRow, type GoLivePeriod, type HeatPick, type WelcomeBackDraft, type ZoneView,
} from "@/lib/contract-age";
import { cn } from "@/lib/utils";

const SVC_COLOR: Record<AgeSvc, string> = { ORM: "var(--svc-orm)", Marcom: "var(--svc-marcom)" };
const R = 4.6;
const GUTTER = 96;
type Hover = { kind: "zone"; x: number; y: number } | { kind: "dot"; row: ContractAgeRow; x: number; y: number } | null;

export function ContractLifetimeCard({ feed }: { feed: ContractAgeFeed | undefined }) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [tour, setTour] = useState(false);
  const [view, setView] = useState<ZoneView>("hundred");
  const [showEnded, setShowEnded] = useState(false);
  const [period, setPeriod] = useState<GoLivePeriod>(ALL_PERIOD);
  const [filter, setFilter] = useState<ChurnFilter>(EMPTY_CHURN_FILTER);
  const [sort, setSort] = useState<ChurnSort>(null);
  const [size, setSize] = useState<number>(CFG.CHURN_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, WelcomeBackDraft>>({});
  const today = feed?.today ?? new Date().toISOString().slice(0, 10);
  const rows = useMemo(() => feed?.rows ?? [], [feed]);
  const zones = useMemo(() => zonesFor(view), [view]);

  /* filters shared with the churn table: Go Live period + heatmap cell; any change → page 1 */
  const setF = (p: Partial<ChurnFilter>) => { setFilter((f) => ({ ...f, ...p })); setPage(1); };
  const selectPeriod = (p: GoLivePeriod) => { setPeriod(p); setF({ period: p }); };
  const churnAll = useMemo(() => (feed ? churnRows(rows, today, feed.reasons, feed.tickets) : []), [feed, rows, today]);
  const churn = sortChurn(filterChurn(churnAll, filter), sort);
  const pg = pageOf(churn, size, page);
  const openRow = open ? churnAll.find((r) => r.contract_id === open) : undefined;
  const dirty = JSON.stringify(filter) !== JSON.stringify(EMPTY_CHURN_FILTER) || sort != null;
  const clearAll = () => { setFilter(EMPTY_CHURN_FILTER); setSort(null); setPeriod(ALL_PERIOD); setPage(1); };

  return (
    <section className="dash-card cl-card" ref={cardRef} id="contract-lifetime" data-testid="cl-card">
      <header className="dash-card-header">
        <div className="min-w-0">
          <h2><span className="cl-num" aria-hidden>4</span>{CL.title}<InfoButton info={{ read: CL.info }} /></h2>
          <div className="cl-asof">{CL.asOf(thDate(today))}</div>
        </div>
        <button type="button" className="r1-help" onClick={() => setTour(true)}>{CL.help}</button>
      </header>
      {!feed ? <p className="dash-empty">ยังไม่มีข้อมูลสัญญา</p> : (
        <>
          <Kpis rows={rows} zones={zones} view={view} />
          <Controls view={view} setView={setView} showEnded={showEnded} setShowEnded={setShowEnded} period={period} setPeriod={selectPeriod} rows={rows} today={today} />
          {period.kind !== "all" && <PeriodStrip rows={rows} period={period} zones={zones} onClear={() => selectPeriod(ALL_PERIOD)} />}
          <Chart rows={rows} view={view} zones={zones} showEnded={showEnded} period={period} reasons={feed.reasons} />
          <Distribution rows={rows} zones={zones} view={view} showEnded={showEnded} reasons={feed.reasons} />
          <ChurnTable all={churnAll} list={churn} pg={pg} filter={filter} setF={setF} sort={sort} setSort={(s) => { setSort(s); setPage(1); }} size={size} setSize={(n) => { setSize(n); setPage(1); }}
            setPage={setPage} dirty={dirty} clearAll={clearAll} onOpen={setOpen} />
          <Survival rows={rows} today={today} period={period} onQuarter={(q) => selectPeriod(period.kind === "quarter" && period.key === q ? ALL_PERIOD : { kind: "quarter", key: q })}
            heat={filter.heat} onHeat={(h) => { const same = filter.heat?.key === h?.key; setF({ heat: same ? null : h, svc: same || !h ? "ALL" : h.svc }); if (!same) setTimeout(() => cardRef.current?.querySelector("#cl-churn")?.scrollIntoView({ block: "start" }), 30); }} />
        </>
      )}
      {feed && openRow && <ContractHistoryDrawer key={openRow.contract_id} row={openRow} feed={feed} draft={drafts[openRow.contract_id] ?? EMPTY_DRAFT} onDraft={(d) => setDrafts((m) => ({ ...m, [openRow.contract_id]: d }))} onClose={() => setOpen(null)} />}
      <GuidedTour open={tour} onClose={() => setTour(false)} root={cardRef.current} steps={CL.tour.map((s, i) => ({ ...s, target: `cl${i + 1}` }))} />
    </section>
  );
}

/* ---------------- §1.3 KPI tiles ---------------- */
function Kpis({ rows, zones, view }: { rows: ContractAgeRow[]; zones: ReturnType<typeof zonesFor>; view: ZoneView }) {
  return (
    <div className="cl-kpis" data-tour="cl1">
      {AGE_SVCS.map((svc) => {
        const med = medianActive(rows, svc); const n = activeOf(rows, svc).length; const top = topZone(rows, svc, zones);
        return (
          <div key={svc} className={cn("cl-kpi", svc === "ORM" ? "svc-orm" : "svc-marcom")} data-testid={`cl-kpi-${svc}`}>
            <div className="cl-kpi-label">{CL.medianLabel(svc)}<InfoButton info={{ read: CL.medianInfo(svc) }} /></div>
            {med == null ? <div className="cl-muted">{CL.noActive}</div> : (
              <>
                <div className="cl-kpi-value"><strong>{ageText(med)}</strong> <small className="tabular-nums">{CL.days(med)}</small></div>
                {top && <div className="cl-kpi-sub" data-testid={`cl-kpi-sub-${svc}`}>{CL.medianSub(n, top.zone.label, view === "hundred", top.count, view === "lifecycle" ? top.zone.phase : null)}</div>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- §2.1 controls ---------------- */
function Seg<T extends string>({ value, onChange, items, label, tour }: { value: T; onChange: (v: T) => void; items: [T, string][]; label: string; tour?: string }) {
  return (
    <div className="cl-ctl" data-tour={tour}>
      <span className="cl-ctl-label">{label}</span>
      <div className="r1-seg" role="tablist" aria-label={label}>
        {items.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={value === k} className={cn(value === k && "is-on")} onClick={() => onChange(k)}>{t}</button>)}
      </div>
    </div>
  );
}
function Controls({ view, setView, showEnded, setShowEnded, period, setPeriod, rows, today }: {
  view: ZoneView; setView: (v: ZoneView) => void; showEnded: boolean; setShowEnded: (b: boolean) => void; period: GoLivePeriod; setPeriod: (p: GoLivePeriod) => void; rows: ContractAgeRow[]; today: string;
}) {
  const kind = period.kind;
  const switchKind = (k: "all" | "month" | "quarter") => {
    if (k === "all") return setPeriod(ALL_PERIOD);
    setPeriod({ kind: k, key: periodBounds(rows, k, today).current });
  };
  const b = kind !== "all" ? periodBounds(rows, kind, today) : null;
  const step = (n: number) => { if (period.kind === "all") return; setPeriod({ kind: period.kind, key: nextPeriod(period.kind, period.key, n) }); };
  return (
    <div className="cl-controls">
      <Seg tour="cl2" label={CL.zoneView} value={view} onChange={setView} items={[["hundred", CL.viewHundred], ["lifecycle", CL.viewLifecycle]]} />
      <Seg tour="cl3" label={CL.show} value={showEnded ? "ended" : "active"} onChange={(v) => setShowEnded(v === "ended")} items={[["active", CL.showActive], ["ended", CL.showEnded]]} />
      <div className="cl-ctl" data-tour="cl4">
        <span className="cl-ctl-label">{CL.period}</span>
        <div className="r1-seg" role="tablist" aria-label={CL.period}>
          {([["all", CL.periodAll], ["month", CL.periodMonth], ["quarter", CL.periodQuarter]] as const).map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={kind === k} className={cn(kind === k && "is-on")} onClick={() => switchKind(k)}>{t}</button>)}
        </div>
        {period.kind !== "all" && b && (
          <span className="cl-stepper">
            <button type="button" aria-label={CL.prev} disabled={period.key <= b.first} onClick={() => step(-1)}>‹</button>
            <strong className="tabular-nums" data-testid="cl-period-label">{periodLabelOf(period)}</strong>
            <button type="button" aria-label={CL.next} disabled={period.key >= b.current} onClick={() => step(1)}>›</button>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------- §2.5 Go Live summary strip ---------------- */
function PeriodStrip({ rows, period, zones, onClear }: { rows: ContractAgeRow[]; period: GoLivePeriod; zones: ReturnType<typeof zonesFor>; onClear: () => void }) {
  const s = periodSummary(rows, period, zones);
  return (
    <div className="cl-strip" data-testid="cl-period-strip">
      <strong>{CL.period_.head(periodLabelOf(period))}</strong>
      {s.n === 0 ? <span>{CL.period_.empty}</span> : (
        <>
          <span>{CL.period_.total(s.n, s.orm, s.marcom)}</span>
          <span>{CL.period_.active(s.active, s.pct, s.minAge, s.maxAge, s.medianZone?.label ?? null)}</span>
          <span>{CL.period_.ended(s.notRenewed, s.lost)}</span>
        </>
      )}
      <button type="button" className="r1-linkbtn" onClick={onClear}>{CL.period_.clear}</button>
    </div>
  );
}

/* ---------------- §2.2–§2.4 chart ---------------- */
function Chart({ rows, view, zones, showEnded, period, reasons }: { rows: ContractAgeRow[]; view: ZoneView; zones: ReturnType<typeof zonesFor>; showEnded: boolean; period: GoLivePeriod; reasons: ContractAgeFeed["reasons"] }) {
  const { ref, width } = usePlotSize();
  const W = Math.max(520, width || 960);
  const PW = W - GUTTER - 14;
  const drawn = useMemo(() => drawnRows(rows, showEnded, period), [rows, showEnded, period]);
  const widths = useMemo(() => (view === "lifecycle" ? zoneWidths(zones.map((z) => drawn.filter((r) => zoneOf(zones, r.age_days!).i === z.i).length)) : undefined), [view, zones, drawn]);
  const scale = useMemo(() => makeScale(view, zones, widths), [view, zones, widths]);
  const boxes = zoneBoxes(view, zones, widths);
  const xOf = (age: number) => GUTTER + scale(age) * PW;
  const selected = period.kind !== "all";
  const phaseH = view === "lifecycle" ? 24 : 0;
  const headY = phaseH + 4, headH = 22, top = headY + headH + 8;
  const layout = AGE_SVCS.map((svc) => {
    const list = drawn.filter((r) => r.service_line === svc).sort((a, b) => Number(a.status === "ACTIVE") - Number(b.status === "ACTIVE"));
    const xs = list.map((r) => xOf(r.age_days!)); const ys = beeswarm(xs, R);
    const ext = Math.max(0, ...ys.map(Math.abs));
    return { svc, list, xs, ys, h: Math.max(64, ext * 2 + R * 2 + 18) };
  });
  const rowTop = (i: number) => top + layout.slice(0, i).reduce((s, l) => s + l.h, 0);
  const plotBottom = rowTop(layout.length);
  const H = plotBottom + 28;
  const [hover, setHover] = useState<Hover>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect(); const sx = W / box.width;
    const x = (e.clientX - box.left) * sx, y = (e.clientY - box.top) * (H / box.height);
    if (x < GUTTER || x > GUTTER + PW || y < top || y > plotBottom) { setHover(null); return; }
    let best: { row: ContractAgeRow; x: number; y: number; d: number } | null = null;
    layout.forEach((l, i) => l.list.forEach((r, k) => { const cy = rowTop(i) + l.h / 2 + l.ys[k]!; const d = Math.hypot(l.xs[k]! - x, cy - y); if (d <= 8 && (!best || d < best.d)) best = { row: r, x: l.xs[k]!, y: cy, d }; }));
    const b = best as { row: ContractAgeRow; x: number; y: number } | null;
    setHover(b ? { kind: "dot", row: b.row, x: b.x, y: b.y } : { kind: "zone", x, y });
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Escape") { setCursor(null); setHover(null); return; }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const stepPx = PW / (e.shiftKey ? 10 : 100); const cur = cursor ?? GUTTER;
    const nx = Math.min(GUTTER + PW, Math.max(GUTTER, cur + (e.key === "ArrowRight" ? stepPx : -stepPx)));
    setCursor(nx); setHover({ kind: "zone", x: nx, y: top });
  };
  const zoneAtX = (x: number) => { const f = (x - GUTTER) / PW; return zones[Math.max(0, boxes.findIndex((b, i) => f >= b.start && (f < b.start + b.width || i === boxes.length - 1)))]!; };

  const labelFits = (i: number, label: string) => boxes[i]!.width * PW >= label.length * 6.4 + 8;
  const ticks = view === "hundred" ? hundredTicks() : CFG.zonesLifecycle.ticks;
  const pills = phasePills(zones);
  const tip = hover?.kind === "zone" ? (() => { const z = zoneAtX(hover.x); const c = zoneCounts(rows, z, zones, showEnded); return { z, c }; })() : null;
  return (
    <div className="cl-chart-wrap" ref={ref} data-tour="cl5">
      <svg className="cl-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={CL.chartLabel} tabIndex={0} onPointerMove={move} onPointerLeave={() => setHover(null)} onKeyDown={key} onBlur={() => { setHover(null); setCursor(null); }} data-testid="cl-chart">
        {view === "lifecycle" && pills.map((p) => { const x0 = GUTTER + boxes[p.from]!.start * PW, x1 = GUTTER + (boxes[p.to]!.start + boxes[p.to]!.width) * PW; return (
          <g key={p.phase} className={cn("cl-phase", p.from === 0 && CFG.zonesLifecycle.highlightFirst && "is-first")}>
            <rect x={x0 + 1} y={2} width={Math.max(2, x1 - x0 - 2)} height={20} rx={10} /><text x={(x0 + x1) / 2} y={16} textAnchor="middle">{p.phase}</text>
          </g>); })}
        {view === "hundred" && <text className="cl-dayword" x={8} y={headY + 15}>{CL.dayWord}</text>}
        {zones.map((z, i) => { const x = GUTTER + boxes[i]!.start * PW, w = boxes[i]!.width * PW; const label = labelFits(i, z.label) ? z.label : String(z.from); return (
          <g key={`h${z.i}`} className="cl-zhead" data-testid="cl-zone-label"><rect x={x + 1} y={headY} width={Math.max(1, w - 2)} height={headH} rx={6} /><text x={x + w / 2} y={headY + 15} textAnchor="middle">{label}</text></g>); })}
        {zones.map((z, i) => <rect key={`b${z.i}`} className="cl-zbg" x={GUTTER + boxes[i]!.start * PW} y={top} width={boxes[i]!.width * PW} height={plotBottom - top} style={{ opacity: 0.05 + (0.32 * i) / Math.max(1, zones.length - 1) }} />)}
        {zones.slice(1).map((z, i) => <line key={`s${z.i}`} className="cl-zsep" x1={GUTTER + boxes[i + 1]!.start * PW} x2={GUTTER + boxes[i + 1]!.start * PW} y1={top} y2={plotBottom} />)}
        {layout.map((l, i) => {
          const y0 = rowTop(i), cy = y0 + l.h / 2; const med = medianActive(rows, l.svc);
          return (
            <g key={l.svc}>
              <text className="cl-rowname" x={8} y={cy - 2} fill={SVC_COLOR[l.svc]}>{l.svc}</text>
              <text className="cl-rowcount" x={8} y={cy + 13}>{CL.rowCount(activeOf(rows, l.svc).length)}</text>
              {i > 0 && <line className="cl-rowsep" x1={GUTTER} x2={GUTTER + PW} y1={y0} y2={y0} />}
              {l.list.map((r, k) => {
                const inP = !selected || inPeriod(r, period); const ended = r.status === "ENDED";
                return (
                  <circle key={r.contract_id} cx={l.xs[k]} cy={cy + l.ys[k]!} r={R} data-ended={ended ? "1" : undefined}
                    fill={selected && !inP ? "var(--neutral-bar)" : SVC_COLOR[l.svc]}
                    fillOpacity={selected && !inP ? CFG.OUT_OF_PERIOD_OPACITY : ended ? CFG.ENDED_DOT_OPACITY : 1}
                    stroke={selected && inP ? "var(--text-primary)" : "none"} strokeWidth={selected && inP ? 1 : 0} />
                );
              })}
              {selected && l.list.map((r, k) => inPeriod(r, period) && <circle key={`o${r.contract_id}`} cx={l.xs[k]} cy={cy + l.ys[k]!} r={R} fill={SVC_COLOR[l.svc]} fillOpacity={r.status === "ENDED" ? CFG.ENDED_DOT_OPACITY : 1} stroke="var(--text-primary)" strokeWidth={1} />)}
              {med != null && (() => { const mx = xOf(med); return <g className="cl-median"><line x1={mx} x2={mx} y1={y0 + 10} y2={y0 + l.h - 8} /><text x={mx + 4} y={y0 + 11}>{CL.medianTag(ageText(med))}</text></g>; })()}
            </g>
          );
        })}
        {ticks.map(([d, t]) => <text key={`t${d}`} className="cl-tick" x={xOf(d)} y={plotBottom + 16} textAnchor={d === 0 ? "start" : "middle"}>{t}</text>)}
        {hover?.kind === "zone" && <line className="cl-cursor" x1={hover.x} x2={hover.x} y1={top} y2={plotBottom} />}
        {hover?.kind === "dot" && <circle className="cl-ring" cx={hover.x} cy={hover.y} r={R + 3} />}
      </svg>
      {tip && hover && (
        <div className="cl-tip" style={{ left: `${(hover.x / W) * 100}%`, top: 8 }} role="tooltip" data-testid="cl-tip-zone">
          <strong>{CL.hoverZone(tip.z.label, view === "hundred", tip.z.phase)}</strong>
          <div>{CL.hoverSvc("ORM", tip.c.ORM)}</div>
          <div>{CL.hoverSvc("Marcom", tip.c.Marcom)}{tip.c.ended != null ? CL.hoverEnded(tip.c.ended) : ""}</div>
        </div>
      )}
      {hover?.kind === "dot" && <DotTip row={hover.row} left={(hover.x / W) * 100} view={view} zones={zones} reasons={reasons} />}
      <div className="cl-legend">
        <span><i className="cl-lg svc-orm" />{CL.legend.orm}</span>
        <span><i className="cl-lg svc-marcom" />{CL.legend.marcom}</span>
        {(showEnded || selected) && <span><i className="cl-lg is-ended" />{CL.legend.ended}</span>}
        <span><i className="cl-lg is-median" />{CL.legend.median}</span>
        <span><i className="cl-lg is-dark" />{CL.legend.darker}</span>
        {selected && <span><i className="cl-lg is-out" />{CL.legend.outOfPeriod}</span>}
      </div>
      {view === "lifecycle" && <p className="cl-note" data-testid="cl-lifecycle-note">{CL.lifecycleNote}</p>}
    </div>
  );
}
function DotTip({ row, left, view, zones, reasons }: { row: ContractAgeRow; left: number; view: ZoneView; zones: ReturnType<typeof zonesFor>; reasons: ContractAgeFeed["reasons"] }) {
  const z = zoneOf(zones, row.age_days!); const unit = view === "hundred";
  const rec = row.status === "ENDED" ? reasonOf(reasons, row) : null;
  return (
    <div className="cl-tip is-dot" style={{ left: `${left}%`, top: 8 }} role="tooltip" data-testid="cl-tip-dot">
      <strong>{row.hotel_name_en ?? row.hotel_name_th}</strong>
      {row.hotel_name_th && row.hotel_name_en && <div>{row.hotel_name_th}</div>}
      <div className="tabular-nums">{row.contract_id} · {row.service_line} · {CL.dot.ae(row.ae_name ?? "—")} · {row.team_label ?? "—"}</div>
      {row.status === "ACTIVE" ? (
        <>
          <div>{CL.dot.age(row.age_days!, ageText(row.age_days))}</div>
          <div>{CL.dot.goLive(thDate(row.first_go_live_at))}</div>
          <div>{CL.dot.zone(z.label, unit, view === "lifecycle" ? z.phase : null)}</div>
          <div>{CL.dot.renewals(row.renewals_count)}</div>
        </>
      ) : (
        <>
          <div>{CL.dot.endedAt(CL.outcome[row.outcome ?? ""] ?? "", row.age_days!, ageText(row.age_days))}</div>
          <div>{CL.dot.endDate(thDate(row.ended_at), `${z.label}${unit ? " วัน" : ""}`)}</div>
          {rec ? (
            <div className="cl-chiprow"><span className="cl-chiplabel">{CL.dot.primary}</span>{rec.primary.map((k) => <span key={k} className="cl-chip is-red">{reasonLabel(k)}</span>)}<span className="cl-chiplabel">{CL.dot.secondary}</span><span className="cl-chip is-amber">{reasonLabel(rec.secondary)}</span></div>
          ) : <div className="cl-muted">{CL.dot.noReason}</div>}
        </>
      )}
    </div>
  );
}

/* ---------------- §3 distribution ---------------- */
function Distribution({ rows, zones, view, showEnded, reasons }: { rows: ContractAgeRow[]; zones: ReturnType<typeof zonesFor>; view: ZoneView; showEnded: boolean; reasons: ContractAgeFeed["reasons"] }) {
  const [more, setMore] = useState<Record<AgeSvc, boolean>>({ ORM: false, Marcom: false });
  const D = CL.dist;
  return (
    <div className="cl-sec" data-tour="cl6" data-testid="cl-dist">
      <h3>{D.title}<InfoButton info={{ read: D.info }} /></h3>
      <p className="cl-note">{showEnded ? D.baseEnded : D.baseActive}{D.baseHint}{D.threshold(CFG.REASON_MIN_ENDED)}</p>
      <div className="cl-scroll">
        <table className="cl-dist">
          <thead><tr><th />{zones.map((z) => <th key={z.i}><div>{z.label}{view === "hundred" ? "" : ""}</div>{z.phase && <small>{z.phase}</small>}</th>)}<th className="is-total">{D.total}</th></tr></thead>
          <tbody>
            {AGE_SVCS.map((svc) => {
              const d = distribution(rows, svc, zones, showEnded, reasons);
              const maxPct = Math.max(1, ...d.cells.map((c) => c.pct ?? 0));
              return [
                <tr key={`${svc}-m`} className="cl-dist-main" data-testid={`cl-dist-${svc}`}>
                  <th className={svc === "ORM" ? "svc-orm" : "svc-marcom"}>{svc}</th>
                  {d.cells.map((c) => (
                    <td key={c.zone.i}>
                      <div className="cl-pct">{pctText(c.pct)}</div>
                      <div className="cl-bar" style={{ width: `${((c.pct ?? 0) / maxPct) * 100}%`, background: SVC_COLOR[svc] }} />
                      <div className="cl-small">{D.active(c.active)}</div>
                      <div className="cl-small">{D.ended(c.ended)}</div>
                      <div className="cl-pass" data-testid="cl-pass">{c.pass.kind === "last" ? D.last : c.pass.kind === "none" ? D.passNone : D.pass(c.pass.pct, c.pass.a, c.pass.b)}</div>
                    </td>
                  ))}
                  <td className="is-total"><div className="cl-pct">{d.total.any ? "100%" : "—"}</div><div className="cl-small">{D.active(d.total.active)}</div><div className="cl-small">{D.ended(d.total.ended)}</div></td>
                </tr>,
                <tr key={`${svc}-r`} className="cl-dist-reasons" data-testid={`cl-reasons-${svc}`}>
                  <th><div>{D.reasons}</div><button type="button" className="r1-linkbtn" onClick={() => setMore((m) => ({ ...m, [svc]: !m[svc] }))}>{more[svc] ? D.less : D.more}</button></th>
                  {d.cells.map((c) => (
                    <td key={c.zone.i}>
                      {c.reasons.kind === "none" ? "—" : c.reasons.kind === "few" ? <span className="cl-muted">{D.few(c.reasons.n)}</span> : (
                        <>
                          {c.reasons.top.slice(0, more[svc] ? 3 : 1).map((t, i) => <div key={t.key} className={cn("cl-rank", i === 0 && "is-first")}>{D.reason(reasonLabel(t.key), t.n)}</div>)}
                          {more[svc] && c.reasons.unrecorded > 0 && <div className="cl-muted">{D.unrecorded(c.reasons.unrecorded)}</div>}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="is-total" />
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- §4.1–§4.3 churn table ---------------- */
function ChurnTable({ all, list, pg, filter, setF, sort, setSort, size, setSize, setPage, dirty, clearAll, onOpen }: {
  all: ChurnRow[]; list: ChurnRow[]; pg: ReturnType<typeof pageOf<ChurnRow>>; filter: ChurnFilter; setF: (p: Partial<ChurnFilter>) => void; sort: ChurnSort; setSort: (s: ChurnSort) => void;
  size: number; setSize: (n: number) => void; setPage: (n: number) => void; dirty: boolean; clearAll: () => void; onOpen: (id: string) => void;
}) {
  const T = CL.churn;
  const sortLabel = (by: "age" | "since" | "tickets") => (!sort || sort.by !== by ? T.sortNone : sort.dir === "desc" ? T.sortDesc : T.sortAsc);
  const parts = [filter.period.kind !== "all" ? `Go Live ${periodLabelOf(filter.period)}` : "", filter.heat ? T.filterHeat(filter.heat.svc, filter.heat.quarter ? quarterLabel(filter.heat.quarter) : CL.heat.allQuarters, `${filter.heat.from}–${filter.heat.to - 1} วัน`) : "", filter.svc !== "ALL" ? filter.svc : "", filter.outcome !== "ALL" ? CL.outcome[filter.outcome] : "", filter.q ? `“${filter.q}”` : "", filter.reasons.length ? T.reasonsBtn(filter.reasons.length).replace(" ▾", "") : ""].filter(Boolean).join(" · ");
  return (
    <div className="cl-sec" id="cl-churn" data-tour="cl7" data-testid="cl-churn">
      <h3>{T.title}<span className="cl-status" data-testid="cl-churn-status">{T.status(parts, list.length)}</span>{dirty && <button type="button" className="r1-linkbtn" onClick={clearAll}>{T.clearAll}</button>}</h3>
      <p className="cl-note">{T.note}</p>
      <div className="r1-table-wrap">
        <table className="r1-table cl-churn">
          <thead>
            <tr>
              <th>{T.cols.contract}</th><th>{T.cols.service}</th><th>{T.cols.outcome}</th><th>{T.cols.age}</th><th>{T.cols.since}</th><th>{T.cols.reasons}</th>
              <th>{T.cols.ticket}<InfoButton info={{ read: T.ticketInfo }} /></th>
            </tr>
            <tr className="r1-filter-row">
              <th><input className="r1-input" value={filter.q} onChange={(e) => setF({ q: e.target.value })} placeholder={T.search} aria-label={T.search} /></th>
              <th><select className="r1-input" value={filter.svc} aria-label={T.cols.service} onChange={(e) => setF({ svc: e.target.value as ChurnFilter["svc"] })}><option value="ALL">{T.svcAll}</option><option value="ORM">ORM</option><option value="Marcom">Marcom</option></select></th>
              <th><select className="r1-input" value={filter.outcome} aria-label={T.cols.outcome} onChange={(e) => setF({ outcome: e.target.value as ChurnFilter["outcome"] })}><option value="ALL">{T.outcomeAll}</option><option value="LOST">{CL.outcome["LOST"]}</option><option value="NOT_RENEWED">{CL.outcome["NOT_RENEWED"]}</option></select></th>
              {(["age", "since"] as const).map((by) => <th key={by}><button type="button" className={cn("r1-sort", sort?.by === by && "is-on")} onClick={() => setSort(cycleSort(sort, by))}>{sortLabel(by)}</button></th>)}
              <th><ReasonPicker all={all} value={filter.reasons} onChange={(reasons) => setF({ reasons })} /></th>
              <th><button type="button" className={cn("r1-sort", sort?.by === "tickets" && "is-on")} onClick={() => setSort(cycleSort(sort, "tickets"))}>{sortLabel("tickets")}</button></th>
            </tr>
          </thead>
          <tbody>
            {pg.rows.length === 0 && <tr><td colSpan={7} className="r1-empty">{T.empty}</td></tr>}
            {pg.rows.map((r) => (
              <tr key={r.contract_id} className="r1-row cl-row" tabIndex={0} onClick={() => onOpen(r.contract_id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(r.contract_id); }} data-testid="cl-churn-row">
                <td><button type="button" className="r1-name" onClick={(e) => { e.stopPropagation(); onOpen(r.contract_id); }}>{r.hotel_name_en ?? r.hotel_name_th}</button><div className="r1-sub tabular-nums">{T.goLive(r.contract_id, r.go_live_quarter ? quarterLabel(r.go_live_quarter) : "—")}</div></td>
                <td><span className={cn("r1-svc", r.service_line === "ORM" ? "svc-orm" : "svc-marcom")}>{r.service_line}</span></td>
                <td className={r.outcome === "LOST" ? "cl-red" : "cl-amber"}>{CL.outcome[r.outcome ?? ""]}</td>
                <td className="tabular-nums">{CL.days(r.age_days!)}<div className="r1-sub">{ageText(r.age_days)}</div></td>
                <td className="tabular-nums">{sinceText(r.since_days)}<div className="r1-sub">{thDate(r.ended_at)}</div></td>
                <td>{r.reason ? r.reason.primary.map((k) => <div key={k} className={cn(filter.reasons.includes(k) && "cl-hit")}>{reasonLabel(k)}</div>) : <span className={cn("cl-muted", filter.reasons.includes(NO_REASON) && "cl-hit")}>{CL.dot.noReason}</span>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <span className="cl-tcount tabular-nums" title={r.open_tickets.map((t) => T.ticketHover(t.ticket_id, t.assignee?.display ?? t.target_dept, R1_STATUS_TH[t.status] ?? t.status)).join("\n")}>{r.open_tickets.length || "–"}</span>
                  {r.lock ? <span className="cl-lock" title={T.lockTip} data-testid="cl-lock">{T.lock(r.lock.ticket_id, R1_STATUS_TH[r.lock.status] ?? r.lock.status)}</span>
                    : <button type="button" className="r1-create" onClick={() => onOpen(r.contract_id)} data-testid="cl-create">{T.create}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="r1-pager">
        <span className="tabular-nums">{T.count(list.length)}</span>
        {pg.pages > 1 && (
          <nav className="r1-pages" aria-label="หน้า">
            <button type="button" disabled={pg.cur === 1} onClick={() => setPage(pg.cur - 1)} aria-label="ก่อนหน้า">‹</button>
            {pageList(pg.cur, pg.pages).map((p, i) => p === "…" ? <span key={`e${i}`}>…</span> : <button key={p} type="button" aria-current={p === pg.cur ? "page" : undefined} className={cn(p === pg.cur && "is-on")} onClick={() => setPage(p)}>{p}</button>)}
            <button type="button" disabled={pg.cur === pg.pages} onClick={() => setPage(pg.cur + 1)} aria-label="ถัดไป">›</button>
          </nav>
        )}
        <label className="r1-size">{T.perPage[0]}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label={T.perPage[1]}>{CFG.CHURN_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}</select>
          {T.perPage[1]}
        </label>
      </div>
    </div>
  );
}
function ReasonPicker({ all, value, onChange }: { all: ChurnRow[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const opts = reasonOptions(all);
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" className={cn("r1-input r1-dd", value.length > 0 && "is-on")}>{CL.churn.reasonsBtn(value.length)}</button></PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="r1-pop cl-pop">
        <div className="r1-pop-group">
          {opts.labels.map((o) => <label key={o.key}><input type="checkbox" checked={value.includes(o.key)} onChange={() => toggle(o.key)} /> {reasonLabel(o.key)} <small className="tabular-nums">{o.n}</small></label>)}
          <label><input type="checkbox" checked={value.includes(NO_REASON)} onChange={() => toggle(NO_REASON)} /> {CL.dot.noReason} <small className="tabular-nums">{opts.none}</small></label>
        </div>
        <div className="r1-pop-actions"><button type="button" onClick={() => onChange([])}>{CL.churn.clear}</button><button type="button" className="r1-primary" onClick={() => setOpen(false)}>{CL.churn.close}</button></div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- §4.4 survival ---------------- */
function Survival({ rows, today, period, onQuarter, heat, onHeat }: { rows: ContractAgeRow[]; today: string; period: GoLivePeriod; onQuarter: (q: string) => void; heat: HeatPick | null; onHeat: (h: HeatPick | null) => void }) {
  const [show, setShow] = useState(false);
  const [order, setOrder] = useState<"new" | "old">("new");
  const [allQ, setAllQ] = useState(false);
  const H = CL.heat;
  const quarters = useMemo(() => heatQuarters(rows, today), [rows, today]);
  const ordered = order === "new" ? [...quarters].reverse() : quarters;
  const visible = allQ ? ordered : order === "new" ? ordered.slice(0, CFG.HEAT_ROWS_DEFAULT) : ordered.slice(-CFG.HEAT_ROWS_DEFAULT);
  const mLabel = H.surviveCols;
  const cellView = (svc: AgeSvc, q: string | null, ql: string, c: ReturnType<typeof survivalTable>[number]["survive"][number] | undefined, kind: "s" | "d", i: number) => {
    const range = kind === "s" ? { from: 0, to: CFG.HEAT_MILESTONES[i]! } : HEAT_RANGES[i]!;
    const k = `${svc}|${q ?? "ALL"}|${kind}|${i}`;
    if (!c || c.kind === "empty") return <td key={k} className="cl-hc is-empty" />;
    const tip = kind === "s" ? H.tipSurvive(svc, ql, mLabel[i]!, c.a, c.b, c.faded) : H.tipDrop(svc, ql, H.dropCols[i]!, c.a, c.b, c.faded);
    const pick: HeatPick = { svc, quarter: q, from: range.from, to: range.to, key: k };
    const a = heatAlpha(c.p);
    return (
      <td key={k} className={cn("cl-hc", kind === "s" ? "is-s" : "is-d", c.faded && "is-faded", heat?.key === k && "is-on", a > 0.5 && "is-darktext")} style={{ ["--a" as string]: String(a) }} title={tip}
        role="button" tabIndex={0} onClick={() => onHeat(pick)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHeat(pick); } }}>{Math.round(c.p * 100)}%</td>
    );
  };
  return (
    <div className="cl-sec" data-tour="cl8" data-testid="cl-survival">
      <h3>{H.title}<InfoButton info={{ read: H.info }} />
        <button type="button" role="switch" aria-checked={show} className={cn("rn2-switch", show && "is-on")} onClick={() => setShow((x) => !x)} data-testid="cl-survival-switch"><i aria-hidden /> {show ? H.show : H.hide}</button>
      </h3>
      {show && (
        <>
          <div className="cl-heatbar">
            <div className="r1-seg" role="tablist" aria-label={H.sort}><button type="button" role="tab" aria-selected={order === "new"} className={cn(order === "new" && "is-on")} onClick={() => setOrder("new")}>{H.newFirst}</button><button type="button" role="tab" aria-selected={order === "old"} className={cn(order === "old" && "is-on")} onClick={() => setOrder("old")}>{H.oldFirst}</button></div>
            <span className="cl-heatlg">{H.legendSurvive} 0%<i className="is-s" />100%</span>
            <span className="cl-heatlg">{H.legendDrop} 0%<i className="is-d" />100%</span>
          </div>
          {AGE_SVCS.map((svc) => {
            const table = survivalTable(rows, svc, today, quarters);
            const byQ = new Map(table.map((r) => [r.quarter ?? "ALL", r]));
            const list = [byQ.get("ALL")!, ...visible.map((q) => byQ.get(q)!)];
            return (
              <div key={svc} className={cn("cl-heatbox", svc === "ORM" ? "svc-orm" : "svc-marcom")} data-testid={`cl-heat-${svc}`}>
                <div className="cl-heathead">{svc}</div>
                <div className="cl-scroll">
                  <table className="cl-heat">
                    <thead>
                      <tr><th rowSpan={2}>{H.rowHead}</th><th colSpan={5}>{H.surviveGroup}</th><th className="cl-spacer" rowSpan={2} /><th colSpan={5}>{H.dropGroup}</th></tr>
                      <tr>{H.surviveCols.map((c) => <th key={c}>{c}</th>)}{H.dropCols.map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.quarter ?? "ALL"} data-testid="cl-heat-row">
                          <th>{r.quarter ? <button type="button" className={cn("r1-linkbtn", period.kind === "quarter" && period.key === r.quarter && "is-on")} onClick={() => onQuarter(r.quarter!)}>{r.label}</button> : r.label}</th>
                          {r.state === "none" ? <td colSpan={11} className="cl-muted">{H.none}</td> : r.state === "young" ? <td colSpan={11} className="cl-muted">{H.young}</td> : (
                            <>{r.survive.map((c, i) => cellView(svc, r.quarter, r.label, c, "s", i))}<td className="cl-spacer" />{r.drop.map((c, i) => cellView(svc, r.quarter, r.label, c, "d", i))}</>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {quarters.length > CFG.HEAT_ROWS_DEFAULT && <button type="button" className="r1-linkbtn" onClick={() => setAllQ((x) => !x)}>{allQ ? H.latest(CFG.HEAT_ROWS_DEFAULT) : H.all}</button>}
        </>
      )}
    </div>
  );
}
