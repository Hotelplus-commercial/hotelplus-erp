/* Tab R2 — card การต่อสัญญา (Renewal) in tab "ต่อสัญญา & ราคา". Replaces the old renewal card in this tab only
 * (old code kept, unmounted). Reads renewal cards + renewal requests (live) or the R2 demo additions; the only
 * writes are `renewal_reasons` records (dialog) and the early-create hand-off to the AE Workspace. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoButton } from "./dash-card";
import { GuidedTour, type TourStep } from "./guided-tour";
import { RenewalReasonPicker } from "./renewal-reason-picker";
import { usePsRenewalCards, type RenewalCard } from "@/lib/ps-renewal";
import { useRenewalStore } from "@/lib/renewal-store";
import type { RenewalRequest } from "@/lib/renewal-rules";
import { editReason, reasonFor, recordReason, setReasonsDemo, useRenewalReasons, type RenewalReason } from "@/lib/renewal-reasons";
import { cardIdFor, dayDiff, scanDateOf, toIsoDate, writeEarlyHandoff, EARLY_PARAM } from "@/lib/renewal-scan";
import { renewalR2DemoItems, renewalR2DemoReasons, renewalR2Sim } from "@/lib/renewal-r2-demo";
import type { TabR1Data } from "@/lib/contract-tab-r1";
import {
  KNOWN_STAGES, NO_HIGHLIGHT, OPEN_STAGES, STAGE_ORDER, TH_MON_FULL, TILE_KEYS, activityDays, addDaysIso, addMonthsIso, boardSort, byOwner, canEarlyCreate, canEditReason,
  canRecordReason, churnTone, compareOf, countdown, daysLeftToEdit, groupBars, highlightActive, highlightHit, inPeriod, isEarlyRequest, isEarlySigned, isOpen, isPastDue,
  ownerClick, pendingDays, periodDate, periodLabel, periodOf, rangeText, reasonLabel, shiftAnchor, slaTone, stageDays, stageOf, stageTone, stagesWithHits, stepBounds,
  thShort, topLabels, urgentLists, validPick, windowStats, RENEWAL_SLA, CHURN_PILL,
  type Actor, type Highlight, type OwnerView, type PKind, type Range, type RenewalItem, type Stage, type TileKey, type WindowStats,
} from "@/lib/renewal-r2";
import { RN2, RN2_OUTCOME_TH, RN2_STAGE_TH, RN2_ZONE_TH, RENEWAL_OWNER_ONLY_HINT, RENEWAL_OWNER_ONLY_TOOLTIP, RENEWAL_TEST_BANNER, RENEWAL_TEST_SWITCH, aeNameTh } from "@/lib/ps-glossary";
import { isRenewalTestMode, setTestMember } from "@/lib/renewal-test-actor";
import { cn } from "@/lib/utils";

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const svcCls = (s: string) => (s === "ORM" ? "svc-orm" : "svc-marcom");
const teamText = (i: RenewalItem) => (i.team ? (i.service === "ORM" ? RN2.card.team(i.team) : i.team) : "—");

/* ---------------- data ---------------- */
function liveItems(data: TabR1Data, cards: RenewalCard[], requests: RenewalRequest[]): RenewalItem[] {
  const latest = (cardId: string) => [...requests].reverse().find((r) => r.renewal_card_id === cardId) ?? null;
  const out: RenewalItem[] = [];
  for (const b of data.base) {
    if (!b.term_end) continue;
    const end = b.term_end.slice(0, 10);
    const card = cards.find((c) => c.id === cardIdFor(b.contract_id)) ?? cards.find((c) => !c.created_source && c.hotelId === b.hotel_id && toIsoDate(c.contractEnd) === end) ?? null;
    out.push(withCard({ contract_id: b.contract_id, hotel_id: b.hotel_id, hotel_name: b.hotel_name_th ?? b.hotel_name, hotel_name_th: b.hotel_name_th, hotel_name_en: b.hotel_name_en, service: b.service, ae: b.ae, team: b.service === "ORM" ? b.orm_team : b.marcom, end, stage: "NOT_STARTED" }, card, card ? latest(card.id) : null));
  }
  for (const f of data.flow) {
    if (!f.end || !f.end_reason || f.end_reason === "PAUSE") continue;
    const end = f.end.slice(0, 10);
    const base = { contract_id: f.contract_id, hotel_id: f.hotel_id, hotel_name: f.hotel_name, hotel_name_th: null, hotel_name_en: null, service: f.service, ae: null, team: null, end };
    if (f.end_reason === "RENEWAL") out.push({ ...base, stage: "RENEWED" });
    else out.push({ ...base, stage: "LOST_OR_DECLINED", outcome: f.end_reason === "EARLY_TERMINATION" ? "LOST" : "NOT_RENEWED", effective: f.end_reason === "EARLY_TERMINATION" ? end : null });
  }
  return out;
}
/** Stage + timestamps from a renewal card and its latest request (fields: request created_at / submitted_at / link_sent_at / signed_at; last activity = card activity log). */
function withCard(i: RenewalItem, card: RenewalCard | null, req: RenewalRequest | null): RenewalItem {
  if (!card) return i;
  const s = stageOf({ card: card.status, churnEarly: !!card.churnType?.includes("Early"), request: req?.status ?? null });
  const a = card.activities[0];
  const at = a ? (() => { const t = Date.parse(a.at); return Number.isFinite(t) ? new Date(t).toISOString() : null; })() : null;
  return {
    ...i, stage: s.stage, sub: s.sub, outcome: s.outcome, card_id: card.id, created_source: card.created_source ?? "BOT",
    effective: s.outcome === "LOST" ? toIsoDate(card.inactivated_at ?? card.contractEnd) : i.effective ?? null,
    request_created_at: req?.created_at ?? null, pending_since: req?.status === "PENDING_APPROVAL" ? req.submitted_at : null,
    link_sent_at: req?.link_sent_at ?? null, signed_at: req?.signed_at ?? null,
    last_activity: at ? { at, what: `${a!.type} · ${a!.note}` } : i.last_activity ?? null, legacy_reason: card.churnReason ?? null,
  };
}

/* ---------------- day-range calendar (Custom) ---------------- */
function DayRangePicker({ a, b, today, onApply, onCancel }: { a: Range; b: Range | null; today: string; onApply: (a: Range, b: Range | null) => void; onCancel: () => void }) {
  const [tab, setTab] = useState<"A" | "B">("A");
  const [ra, setRa] = useState<Range>(a); const [rb, setRb] = useState<Range | null>(b);
  const [start, setStart] = useState<string | null>(null);
  const [view, setView] = useState((tab === "A" ? a.from : b?.from ?? a.from).slice(0, 7) + "-01");
  const cur = tab === "A" ? ra : rb;
  const y = +view.slice(0, 4), m = +view.slice(5, 7) - 1;
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const click = (d: string) => {
    const set = tab === "A" ? setRa : (r: Range) => setRb(r);
    if (!start) { setStart(d); set({ from: d, to: d }); } else { set(d < start ? { from: d, to: start } : { from: start, to: d }); setStart(null); }
  };
  return (
    <div className="rn2-cal" data-testid="rn2-calendar">
      <div className="rn2-seg" role="tablist">
        {(["A", "B"] as const).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={cn(tab === t && "is-on")} onClick={() => { setTab(t); setStart(null); }}>{t === "A" ? RN2.tabA : RN2.tabB}</button>)}
      </div>
      <div className="rn2-cal-head">
        <button type="button" aria-label="เดือนก่อน" onClick={() => setView(addMonthsIso(view, -1))}>‹</button>
        <strong>{TH_MON_FULL[m]} {y + 543}</strong>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => setView(addMonthsIso(view, 1))}>›</button>
      </div>
      <div className="rn2-cal-grid">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => <span key={d} className="rn2-cal-dow">{d}</span>)}
        {Array.from({ length: first }, (_, k) => <span key={`e${k}`} />)}
        {Array.from({ length: days }, (_, k) => {
          const d = `${view.slice(0, 7)}-${String(k + 1).padStart(2, "0")}`;
          const on = !!cur && d >= cur.from && d <= cur.to;
          return <button key={d} type="button" className={cn("rn2-cal-day", on && "is-on", d === today && "is-today")} onClick={() => click(d)}>{k + 1}</button>;
        })}
      </div>
      <p className="rn2-cal-hint">{RN2.pickHint} · A {rangeText(ra)}{rb ? ` · B ${rangeText(rb)}` : ""}</p>
      <div className="rn2-cal-actions">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{RN2.cancel}</Button>
        <Button type="button" size="sm" onClick={() => onApply(ra, rb)}>{RN2.apply}</Button>
      </div>
    </div>
  );
}

/* ---------------- small pieces ---------------- */
function Countdown({ end, today }: { end: string; today: string }) {
  const c = countdown(end, today);
  return <span className={cn("rn2-cd", `is-${c.tone}`)}>{c.tone === "past" ? RN2.card.overdue(-c.days) : RN2.card.left(c.days)}</span>;
}
const StagePill = ({ s }: { s: Stage }) => <span className={cn("rn2-stage", `s-${s}`)}>{RN2_STAGE_TH[s]}</span>;
function subText(i: RenewalItem, today: string) {
  if (i.stage !== "IN_PROGRESS" || !i.sub) return null;
  if (i.sub === "PENDING_APPROVAL") { const n = pendingDays(i, today) ?? 0; return <span className={cn(n > RENEWAL_SLA.PENDING_APPROVAL_MAX_DAYS && "rn2-amber")}>{RN2.card.sub.pending(n)}{n > RENEWAL_SLA.PENDING_APPROVAL_MAX_DAYS ? RN2.card.over2 : ""}</span>; }
  return <span>{RN2.card.sub[i.sub]}</span>;
}
function Delta({ a, b, goodUp, unit = "" }: { a: number | null; b: number | null; goodUp: boolean | null; unit?: string }) {
  if (a == null || b == null) return <span className="rn2-delta">{RN2.noCompare}</span>;
  const d = a - b;
  if (Math.abs(d) < 0.05) return <span className="rn2-delta">{RN2.same}</span>;
  const good = goodUp == null ? null : goodUp ? d > 0 : d < 0;
  return <span className={cn("rn2-delta", good === true && "is-good", good === false && "is-bad")}>{d > 0 ? "▲" : "▼"} {unit ? Math.abs(d).toFixed(1) : Math.abs(d)}{unit}</span>;
}

/* ---------------- main card ---------------- */
export function RenewalCardR2({ data }: { data: TabR1Data | undefined }) {
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const demo = !!data?.demo;
  const now = demo ? `${today}T03:00:00.000Z` : new Date().toISOString();
  const cards = usePsRenewalCards();
  const store = useRenewalStore();
  useEffect(() => { setReasonsDemo(demo, renewalR2DemoReasons); }, [demo]);
  const stored = useRenewalReasons();
  const [sim, setSim] = useState(false);
  const simData = useMemo(() => (demo && sim ? renewalR2Sim(120, today) : null), [demo, sim, today]);
  const items = useMemo(() => {
    if (!data) return [] as RenewalItem[];
    if (!demo) return liveItems(data, cards, store.requests);
    // DEMO: R2 demo additions + any card made this session through the create path (early create / scan).
    const latest = (id: string) => [...store.requests].reverse().find((r) => r.renewal_card_id === id) ?? null;
    const base = renewalR2DemoItems().map((i) => { const c = cards.find((k) => k.id === cardIdFor(i.contract_id)); return c ? withCard({ ...i, last_activity: i.last_activity }, c, latest(c.id)) : i; });
    return simData ? [...base, ...simData.items] : base;
  }, [data, demo, cards, store.requests, simData]);
  const reasons = useMemo(() => (simData ? [...stored, ...simData.reasons] : stored), [stored, simData]);
  const recOf = (i: RenewalItem) => reasonFor(reasons, i.contract_id, i.card_id);
  const hasReason = (i: RenewalItem) => !!recOf(i);

  /* actor (test mode — no login) */
  const aes = useMemo(() => [...new Set(items.map((i) => i.ae).filter((x): x is string => !!x))].sort(), [items]);
  const [actAs, setActAs] = useState("PM");
  const actor: Actor = actAs === "PM" ? { id: "PM001-Alex", role: "PM" } : actAs === "OTHER" ? { id: "OTHER", role: "OTHER" } : { id: actAs, role: "AE" };

  /* period */
  const [kind, setKind] = useState<PKind>("quarter");
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState<{ a: Range; b: Range | null } | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  useEffect(() => setAnchor(today), [today]);
  const range: Range = kind === "custom" ? custom?.a ?? periodOf("month", today) : periodOf(kind, anchor);
  const win = compareOf(kind, range, today, custom?.b ?? null);
  const firstData = useMemo(() => items.reduce<string | null>((m, i) => { const d = periodDate(i); return !m || d < m ? d : m; }, null), [items]);
  const bounds = kind === "custom" ? { back: false, fwd: false } : stepBounds(kind, anchor, firstData, today);
  const label = periodLabel(kind, anchor, custom?.a);
  const A = windowStats(items, range, win.cutA, today);
  const B: WindowStats | null = win.b && win.cutB ? windowStats(items, win.b, win.cutB, today) : null;
  const note = win.state === "future" ? RN2.futureNote(label)
    : win.state === "current" && win.b && win.cutB ? RN2.currentNote(rangeText({ from: range.from, to: win.cutA }), rangeText({ from: win.b.from, to: win.cutB }))
    : win.b ? RN2.pastNote(rangeText(range), rangeText(win.b)) : RN2.noCompare;

  /* sections state */
  const [view, setView] = useState<OwnerView>("ae");
  const [h, setH] = useState<Highlight>(NO_HIGHLIGHT);
  const [open, setOpen] = useState<Stage[]>([]);
  const [tile, setTile] = useState<TileKey | null | undefined>(undefined);
  const [tileChip, setTileChip] = useState<TileKey | null>(null);
  const [rView, setRView] = useState<"labels" | "groups">("labels");
  const [dlg, setDlg] = useState<{ item: RenewalItem; rec: RenewalReason | null } | null>(null);
  const [tour, setTour] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const root = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const periodItems = items.filter((i) => inPeriod(i, range));
  const lists = urgentLists(items, range, today, hasReason);
  const activeTile = tile === undefined ? TILE_KEYS.find((k) => lists[k].length) ?? null : tile;
  const hit = (i: RenewalItem) => highlightHit(i, h);
  const hl = highlightActive(h);
  const nHits = hl ? periodItems.filter(hit).length : 0;
  const nameOf = (k: string) => (view === "ae" ? aeNameTh(k) : k);
  const applyH = (next: Highlight, extra?: Stage[]) => {
    setH(next);
    const add = highlightActive(next) ? stagesWithHits(periodItems, (i) => highlightHit(i, next)) : [];
    setOpen((o) => [...new Set([...o, ...add, ...(extra ?? [])])]);
  };
  const scrollBoard = () => setTimeout(() => boardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  const viewCard = (i: RenewalItem) => {
    if (!inPeriod(i, range)) { setKind("month"); setAnchor(periodDate(i)); }
    const next = { ...NO_HIGHLIGHT, view: h.view, q: i.contract_id };
    setH(next); setTileChip(null); setOpen((o) => [...new Set([...o, i.stage])]); scrollBoard();
  };
  const onOwner = (key: string, stage?: Stage) => {
    const r = ownerClick(h, open, key, view, stage);
    applyH({ ...r.h, ids: null }, r.open.filter((s) => !open.includes(s)));
    setTileChip(null); scrollBoard();
  };
  const tileClick = (k: TileKey) => {
    if (activeTile === k) { setTile(null); if (tileChip === k) { setTileChip(null); applyH({ ...h, ids: null }); } return; }
    setTile(k); setTileChip(k); applyH({ ...h, ids: lists[k].map((i) => i.contract_id) });
  };
  const early = (i: RenewalItem) => {
    if (actor.role === "AE") setTestMember(actor.id); // UF2: carry the acting AE member into the AE Workspace / Wizard (testing mode)
    writeEarlyHandoff({ contract_id: i.contract_id, hotel_id: i.hotel_id, hotel_name: i.hotel_name, service: i.service, end: i.end, ae: i.ae });
    return `/ps/ae-workspace/dashboard?${EARLY_PARAM}=${encodeURIComponent(i.contract_id)}${demo ? "&demo=1" : ""}#renewal-activities`;
  };
  const openTour = () => { const r = root.current; setTourSteps(RN2.tour.filter((s) => r?.querySelector(`[data-tour="${s.target}"]`)).map((s) => ({ ...s }))); setTour(true); };

  /* reasons */
  const lostBase = periodItems.filter((i) => i.stage === "LOST_OR_DECLINED" && periodDate(i) <= win.cutA);
  const recs = lostBase.map(recOf).filter((r): r is RenewalReason => !!r);
  const tone = churnTone(A.lost, A.decided);

  if (!data) return null;
  return (
    <section className="dash-card rn2-card" data-testid="renewal-card-r2" ref={root}>
      <header className="rn2-head">
        <div className="min-w-0">
          <h2>{RN2.title}<InfoButton info={{ count: RN2.info }} /></h2>
          <p className="rn2-asof tabular-nums">{RN2.asOf(thShort(today))}</p>
        </div>
        <button type="button" className="rn2-help" onClick={openTour}>{RN2.help}</button>
      </header>
      {(
        <div className="rn2-test">
          <label>{RN2.actAs}
            <select value={actAs} onChange={(e) => setActAs(e.target.value)} aria-label={RN2.actAs}>
              <option value="PM">{RN2.actPm}</option>
              {aes.map((a) => <option key={a} value={a}>AE · {aeNameTh(a)}</option>)}
              <option value="OTHER">{RN2.actOther}</option>
            </select>
          </label>
          {demo && <label className="rn2-sim"><input type="checkbox" checked={sim} onChange={(e) => setSim(e.target.checked)} />{RN2.sim}</label>}
          {isRenewalTestMode() && <span className="rn2-test-banner" data-testid="rn2-test-banner">{RENEWAL_TEST_BANNER(actor.role === "OTHER" ? RN2.actOther : actor.role, actor.role === "PM" ? actor.id : actor.role === "AE" ? aeNameTh(actor.id) : "—")}</span>}
        </div>
      )}

      {/* §1.2 period bar */}
      <div className="rn2-period" data-tour="rn2-period">
        <div className="rn2-seg" role="group" aria-label="ช่วงเวลา">
          {(["month", "quarter", "year", "custom"] as PKind[]).map((k) => k === "custom" ? (
            <Popover key={k} open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild><button type="button" aria-pressed={kind === k} className={cn(kind === k && "is-on")}>{RN2.kinds[k]}</button></PopoverTrigger>
              <PopoverContent align="start" className="rn2-cal-pop">
                <DayRangePicker a={custom?.a ?? periodOf("month", today)} b={custom?.b ?? periodOf("month", addMonthsIso(today, -1))} today={today}
                  onCancel={() => setCalOpen(false)} onApply={(a, b) => { setCustom({ a, b }); setKind("custom"); setCalOpen(false); }} />
              </PopoverContent>
            </Popover>
          ) : <button key={k} type="button" aria-pressed={kind === k} className={cn(kind === k && "is-on")} onClick={() => { setKind(k); setAnchor(today); }}>{RN2.kinds[k]}</button>)}
        </div>
        <div className="rn2-stepper">
          <button type="button" aria-label="ช่วงก่อนหน้า" disabled={!bounds.back} onClick={() => kind !== "custom" && setAnchor(shiftAnchor(kind, anchor, -1))}>‹</button>
          <strong className="tabular-nums" data-testid="rn2-period-label">{label}</strong>
          <button type="button" aria-label="ช่วงถัดไป" disabled={!bounds.fwd} onClick={() => kind !== "custom" && setAnchor(shiftAnchor(kind, anchor, 1))}>›</button>
        </div>
      </div>
      <p className="rn2-note-line">{note}</p>

      {/* §3 KPI row */}
      <div className="rn2-kpis" data-tour="rn2-kpi">
        <div className="rn2-kpi">
          <span>{RN2.kpi.total}<InfoButton info={{ count: RN2.kpiInfo.total }} /></span>
          <strong className="tabular-nums">{A.total} <small>{RN2.kpi.unit}</small></strong>
          <small>{RN2.kpi.svcLine(A.orm, A.marcom)}</small>
          <hr />
          <small>{B ? <>{RN2.kpi.cmpCount(B.total)} · <Delta a={A.total} b={B.total} goodUp={null} /></> : RN2.noCompare}</small>
        </div>
        <div className="rn2-kpi">
          <span>{RN2.kpi.renewed}<InfoButton info={{ count: RN2.kpiInfo.renewed }} /></span>
          <strong className="tabular-nums">{A.renewed} <small>· {pct(A.renewedPct)}</small></strong>
          <small>{RN2.kpi.renewedSub(A.decided, A.early)}</small>
          <hr />
          <small>{B ? <><Delta a={A.renewed} b={B.renewed} goodUp /> · <Delta a={A.renewedPct} b={B.renewedPct} goodUp unit=" pts" /></> : RN2.noCompare}</small>
        </div>
        <div className={cn("rn2-kpi", `is-${tone.tone}`)}>
          <span>{RN2.kpi.lost}<InfoButton info={{ count: RN2.kpiInfo.lost }} /></span>
          <strong className="tabular-nums"><em className={cn("rn2-churn", `is-${tone.tone}`)}>{A.lost} · {pct(A.lostPct)}</em> <i className={cn("rn2-pill", `is-${tone.tone}`)}>{CHURN_PILL[tone.tone]}</i></strong>
          <small>{RN2.kpi.lostSub(A.notRenewed, A.lostEarly)}{tone.byCount ? RN2.kpi.smallBase : ""}</small>
          <hr />
          <small>{B ? <><Delta a={A.lost} b={B.lost} goodUp={false} /> · <Delta a={A.lostPct} b={B.lostPct} goodUp={false} unit=" pts" /></> : RN2.noCompare}</small>
        </div>
        <div className={cn("rn2-kpi", A.pastDue > 0 && "is-high")}>
          <span>{RN2.kpi.pastDue}<InfoButton info={{ count: RN2.kpiInfo.pastDue }} /></span>
          <strong className={cn("tabular-nums", A.pastDue > 0 && "rn2-red")}>{A.pastDue} <small>{RN2.kpi.unit}</small></strong>
          <small>{A.pastDue ? RN2.kpi.pastDueSub : RN2.kpi.pastDueNone}</small>
          <hr />
          <small>{RN2.kpi.pastDueFoot(A.open, A.overSla)}</small>
        </div>
      </div>

      {/* §4 by AE / team */}
      <section className="rn2-sec" data-tour="rn2-owners">
        <header className="rn2-sec-head">
          <h3>{view === "ae" ? RN2.owners.titleAe : RN2.owners.titleTeam}<InfoButton info={{ count: RN2.owners.info }} /></h3>
          <div className="rn2-seg" role="group">
            {(["ae", "team"] as OwnerView[]).map((v) => <button key={v} type="button" aria-pressed={view === v} className={cn(view === v && "is-on")} onClick={() => { setView(v); setH({ ...h, owner: null, view: v }); }}>{v === "ae" ? RN2.owners.byAe : RN2.owners.byTeam}</button>)}
          </div>
        </header>
        <div className="rn2-boxes" data-tour="rn2-owners-table">
          {(["ORM", "Marcom"] as const).map((svc) => {
            const rows = byOwner(items, svc, view, range, win.cutA, today, hasReason, nameOf);
            return (
              <div key={svc} className={cn("rn2-box", svcCls(svc))}>
                <div className="rn2-box-head">{svc}</div>
                <table className="rn2-table">
                  <colgroup><col className="c-name" /><col /><col /><col className="c-div" /><col /><col /></colgroup>
                  <thead>
                    <tr className="rn2-grp"><th /><th colSpan={2}>{RN2_ZONE_TH.known}</th><th colSpan={3} className="rn2-div">{RN2_ZONE_TH.open}</th></tr>
                    <tr><th>{view === "ae" ? RN2.owners.colAe : RN2.owners.colTeam}</th>{STAGE_ORDER.map((s, k) => <th key={s} className={cn(k === 2 && "rn2-div")}>{RN2_STAGE_TH[s]}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={cn(h.owner === r.key && h.view === view && "is-sel")}>
                        <td><button type="button" className="rn2-name" onClick={() => onOwner(r.key)}>{view === "ae" ? aeNameTh(r.key) : svc === "ORM" && r.key !== "—" ? RN2.card.team(r.key) : r.key}</button></td>
                        {STAGE_ORDER.map((s, k) => {
                          const c = r.cells[s];
                          return (
                            <td key={s} className={cn(k === 2 && "rn2-div")}>
                              {c.n ? (
                                <button type="button" className="rn2-num" title={RN2.owners.dotTip(RN2_STAGE_TH[s], c.n, c.pastDue, c.overSla, c.noReason)} onClick={() => onOwner(r.key, s)}>
                                  <b className={cn("tabular-nums", s === "LOST_OR_DECLINED" && `rn2-churn is-${churnTone(c.n, r.decided).tone}`)}>{c.n}</b>
                                  {c.red ? <i className="rn2-dot is-red" aria-label="มีสัญญาเลยกำหนด" /> : c.amber ? <i className="rn2-dot is-amber" aria-label="เกิน SLA / รอบันทึกเหตุผล" /> : null}
                                  {k < 2 && <small>{r.decided ? RN2.owners.of(r.decided, pct((c.n / r.decided) * 100)) : "·"}</small>}
                                </button>
                              ) : <span className="rn2-zero">·</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={6} className="rn2-zero">·</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <p className="rn2-legend"><span>{RN2.owners.legend[0]}</span><span><i className="rn2-dot is-red" />{RN2.owners.legend[1]}</span><span><i className="rn2-dot is-amber" />{RN2.owners.legend[2]}</span><span>{RN2.owners.legend[3]}</span></p>
      </section>

      {/* §5 status */}
      <section className="rn2-sec">
        <header className="rn2-sec-head"><h3>{RN2.status.title}<InfoButton info={{ count: RN2.status.info }} /></h3></header>
        <div className="rn2-tiles" data-tour="rn2-urgent">
          {TILE_KEYS.map((k) => {
            const n = lists[k].length; const T = RN2.status.tiles[k];
            return (
              <button key={k} type="button" disabled={!n} aria-pressed={activeTile === k} data-testid={`rn2-tile-${k}`}
                className={cn("rn2-tile", k === "PAST_DUE" ? "is-red" : "is-amber", !n && "is-zero", activeTile === k && "is-on")} onClick={() => tileClick(k)}>
                <span>{T.t}</span><strong className="tabular-nums">{n} <small>{RN2.kpi.unit}</small></strong><small>{T.d}</small>
              </button>
            );
          })}
        </div>
        {activeTile && lists[activeTile].length > 0 && (
          <div className="rn2-list" data-testid="rn2-urgent-list">
            <div className="rn2-list-head"><strong>{RN2.status.listHead(RN2.status.tiles[activeTile].t, lists[activeTile].length)}</strong><button type="button" onClick={() => { setTile(null); if (tileChip) { setTileChip(null); applyH({ ...h, ids: null }); } }}>{RN2.status.hide}</button></div>
            <table className="rn2-list-table">
              <thead><tr><th>{RN2.status.cols.contract}</th><th>{RN2.status.cols.service}</th><th>{RN2.status.cols.ae}</th><th>{RN2.status.cols.stage}</th><th>{RN2.status.cols.topic}</th><th /></tr></thead>
              <tbody>
                {lists[activeTile].map((i) => (
                  <tr key={i.contract_id}>
                    <td><strong>{i.hotel_name}</strong><small>{i.contract_id}</small></td>
                    <td><span className={cn("r1-svc", svcCls(i.service))}>{i.service}</span></td>
                    <td>{aeNameTh(i.ae)}</td>
                    <td><StagePill s={i.stage} />{!inPeriod(i, range) && <small>{RN2.status.outside(thShort(periodDate(i)))}</small>}</td>
                    <td>{topicText(activeTile, i, today)}</td>
                    <td className="rn2-actions">
                      <button type="button" onClick={() => viewCard(i)}>{RN2.status.view}</button>
                      {activeTile === "NO_REASON" && canRecordReason(actor, i.ae) && <button type="button" onClick={() => setDlg({ item: i, rec: null })}>{RN2.status.record}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* §5.2 highlight bar */}
        <div className="rn2-hl" data-tour="rn2-highlight">
          <label>{view === "ae" ? RN2.status.seeAe : RN2.status.seeTeam}
            <select value={h.owner ?? ""} onChange={(e) => applyH({ ...h, owner: e.target.value || null, view })}>
              <option value="">{view === "ae" ? RN2.status.allAe : RN2.status.allTeam}</option>
              {[...new Set(periodItems.map((i) => (view === "ae" ? i.ae : i.team) ?? "—"))].sort((a, b) => nameOf(a).localeCompare(nameOf(b), "th")).map((k) => <option key={k} value={k}>{view === "ae" ? aeNameTh(k) : k}</option>)}
            </select>
          </label>
          <input type="search" value={h.q} placeholder={RN2.status.search} aria-label={RN2.status.search} onChange={(e) => applyH({ ...h, q: e.target.value })} />
          {tileChip && <button type="button" className="rn2-chip-on" onClick={() => { setTileChip(null); applyH({ ...h, ids: null }); }}>{RN2.status.tiles[tileChip].t} ✕</button>}
          {hl && <span className="rn2-hint">{nHits ? RN2.status.hits(nHits) : RN2.status.noHits} <button type="button" onClick={() => { setTileChip(null); setH({ ...NO_HIGHLIGHT, view }); }}>{RN2.status.clear}</button></span>}
          <button type="button" role="switch" aria-checked={open.length > 0} data-tour="rn2-switch" className={cn("rn2-switch", open.length > 0 && "is-on")} onClick={() => setOpen(open.length ? [] : [...STAGE_ORDER])}>
            <i aria-hidden /> {open.length ? RN2.status.showStages : RN2.status.hideStages}
          </button>
        </div>

        {/* §5.3 board — hidden by default */}
        <div ref={boardRef} className="rn2-board-wrap">
          {open.length > 0 && (
            <div className="rn2-board" data-testid="rn2-board">
              {([["known", KNOWN_STAGES], ["open", OPEN_STAGES]] as const).map(([z, stages]) => {
                const shown = stages.filter((s) => open.includes(s));
                if (!shown.length) return null;
                const zn = periodItems.filter((i) => (stages as readonly Stage[]).includes(i.stage)).length;
                return (
                  <div key={z} className={cn("rn2-zone", z === "open" && "rn2-zone-open")} data-zone={z}>
                    <div className="rn2-zone-head">{RN2.status.zone(RN2_ZONE_TH[z], zn)}</div>
                    <div className="rn2-cols">
                      {shown.map((s) => {
                        const list = boardSort(s, periodItems.filter((i) => i.stage === s), hasReason, hl ? hit : undefined);
                        const m = hl ? list.filter(hit).length : 0;
                        return (
                          <div key={s} className="rn2-col" data-stage={s}>
                            <div className="rn2-col-head"><strong>{RN2_STAGE_TH[s]} · {list.length}</strong>{hl && <span className="rn2-match">{RN2.status.match(m)}</span>}<button type="button" onClick={() => setOpen(open.filter((x) => x !== s))}>{RN2.status.colHide}</button></div>
                            {list.length ? list.map((i) => (
                              <RnCard key={i.contract_id} i={i} today={today} now={now} rec={recOf(i)} dim={hl && !hit(i)} hot={hl && hit(i)} actor={actor}
                                earlyHref={canEarlyCreate(actor, i) ? () => early(i) : null} onSwitch={i.ae ? () => setActAs(i.ae!) : null}
                                onReason={(rec) => setDlg({ item: i, rec })} />
                            )) : <p className="rn2-empty">{RN2.status.emptyStage}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* §5.6 reasons */}
      <ReasonsSection lostBase={lostBase} recs={recs} view={rView} onView={setRView} />

      {dlg && <ReasonDialog item={dlg.item} rec={dlg.rec} actor={actor} now={now} onClose={() => setDlg(null)} />}
      <GuidedTour steps={tourSteps} open={tour && tourSteps.length > 0} onClose={() => setTour(false)} root={root.current} />
    </section>
  );
}

function topicText(k: TileKey, i: RenewalItem, today: string) {
  const S = RN2.status;
  if (k === "PAST_DUE") return S.overdue(-dayDiff(today, i.end));
  if (k === "DUE_SOON") return S.left(dayDiff(today, i.end));
  if (k === "NO_REASON") return S.noReason(RN2_OUTCOME_TH[i.outcome ?? "NOT_RENEWED"], Math.max(0, dayDiff(periodDate(i), today)));
  const parts: string[] = [];
  const sd = stageDays(i, today); if (sd != null && stageTone(i, today) !== "ok") parts.push(S.inStage(sd));
  const ad = activityDays(i, today); if (ad != null && slaTone(ad, RENEWAL_SLA.LAST_ACTIVITY) !== "ok") parts.push(S.actAgo(ad));
  const pd = pendingDays(i, today); if (pd != null && pd > RENEWAL_SLA.PENDING_APPROVAL_MAX_DAYS) parts.push(S.pending(pd));
  return parts.join(" · ");
}

/* ---------------- §5.4 contract card ---------------- */
export function RnCard({ i, today, now, rec, dim, hot, actor, earlyHref, onSwitch, onReason }: { i: RenewalItem; today: string; now: string; rec: RenewalReason | null; dim: boolean; hot: boolean; actor: Actor; earlyHref: (() => string) | null; onSwitch?: (() => void) | null; onReason: (rec: RenewalReason | null) => void }) {
  const C = RN2.card;
  const past = isPastDue(i, today);
  const sd = stageDays(i, today); const st = stageTone(i, today);
  const ad = activityDays(i, today);
  return (
    <article className={cn("rn2-ct", svcCls(i.service), dim && "is-dim", hot && "is-hot", past && "is-past")} data-contract={i.contract_id} data-dim={dim || undefined}>
      {past && <div className="rn2-ct-banner">{C.banner(-dayDiff(today, i.end))}</div>}
      <div className="rn2-ct-top">
        <strong className="rn2-ct-name">{i.hotel_name_en ?? i.hotel_name}</strong>
        {i.hotel_name_en && i.hotel_name_th && <small>{i.hotel_name_th}</small>}
        <small className="rn2-ct-id">{i.contract_id}</small>
        <div className="rn2-ct-meta"><span className={cn("r1-svc", svcCls(i.service))}>{i.service}</span><span>AE {aeNameTh(i.ae)}</span><span>{teamText(i)}</span></div>
      </div>
      {isOpen(i) && (
        <>
          <p className="rn2-ct-sub">{i.stage === "LINK_SENT" && i.link_sent_at ? C.sentNotSigned(thShort(i.link_sent_at)) : subText(i, today)}</p>
          <dl className="rn2-ct-grid">
            <dt>{C.due}</dt><dd>{thShort(i.end)} <Countdown end={i.end} today={today} /></dd>
            <dt>{C.inStage}</dt><dd>{sd == null ? (i.stage === "NOT_STARTED" ? C.scanOn(thShort(scanDateOf(i.end))) : "—") : <span className={cn(`rn2-sla-${st}`)}>{C.days(sd)}</span>}</dd>
            <dt>{C.lastAct}</dt><dd>{ad == null ? C.noAct : <><span className={cn(`rn2-sla-${slaTone(ad, RENEWAL_SLA.LAST_ACTIVITY)}`)}>{C.ago(ad)}</span>{i.last_activity?.what ? ` · ${i.last_activity.what}` : ""}</>}</dd>
          </dl>
          {isEarlyRequest(i) && i.stage !== "NOT_STARTED" && <span className="rn2-tag">{C.earlyTag}</span>}
          {earlyHref && <a className="rn2-early" href="#" onClick={(e) => { e.preventDefault(); window.location.assign(earlyHref()); }}>{i.card_id || today >= scanDateOf(i.end) ? C.btnStart : C.btnEarly}</a>}
          {/* R2.1 UF2: non-owners see the owner-only button disabled + hint (own-only rule unchanged) */}
          {!earlyHref && i.stage === "NOT_STARTED" && (
            <div className="rn2-early-off">
              <button type="button" disabled aria-disabled="true" title={RENEWAL_OWNER_ONLY_TOOLTIP}>{i.card_id || today >= scanDateOf(i.end) ? C.btnStart : C.btnEarly}</button>
              <small>{RENEWAL_OWNER_ONLY_HINT(aeNameTh(i.ae))}{isRenewalTestMode() && onSwitch && <> · <button type="button" className="rn2-link" onClick={onSwitch}>{RENEWAL_TEST_SWITCH(aeNameTh(i.ae))}</button></>}</small>
            </div>
          )}
        </>
      )}
      {i.stage === "RENEWED" && (
        <dl className="rn2-ct-grid">
          <dt>{C.due}</dt><dd>{thShort(i.end)}</dd>
          {i.signed_at && <><dt /><dd>{C.signedOn(thShort(i.signed_at))}</dd></>}
          <dt /><dd>{C.newStart(thShort(addDaysIso(i.end, 1)), addDaysIso(i.end, 1) > today)}</dd>
          {isEarlySigned(i) && <><dt /><dd><span className="rn2-tag is-good">{C.earlySigned}</span></dd></>}
        </dl>
      )}
      {i.stage === "LOST_OR_DECLINED" && (
        <div className="rn2-ct-lost">
          <p>{C.result} <strong>{RN2_OUTCOME_TH[i.outcome ?? "NOT_RENEWED"]}</strong> · {thShort(periodDate(i))} · {C.ago(dayDiff(periodDate(i), today))}</p>
          {rec ? (
            <>
              <div className="r1-chips">{rec.primary.map((k) => <span key={k} className="r1-chip is-bad">{reasonLabel(k)}</span>)}<span className="r1-chip is-amber">{reasonLabel(rec.secondary)}</span></div>
              {rec.note && <p className="rn2-ct-note">{rec.note}</p>}
              {canEditReason(actor, i.ae, rec, now) ? <button type="button" className="rn2-link" onClick={() => onReason(rec)}>{C.edit(daysLeftToEdit(rec, now))}</button>
                : <small>{C.locked(thShort(rec.created_at), aeNameTh(rec.created_by.display))}</small>}
            </>
          ) : (
            <>
              {i.legacy_reason && <p className="rn2-ct-note">{C.legacy}: {i.legacy_reason}</p>}
              {canRecordReason(actor, i.ae) && <button type="button" className="rn2-btn" onClick={() => onReason(null)}>{RN2.status.record}</button>}
              <small className="rn2-amber">{C.waiting(Math.max(0, dayDiff(periodDate(i), today)))}</small>
            </>
          )}
        </div>
      )}
    </article>
  );
}

/* ---------------- §5.6 reasons ---------------- */
function ReasonsSection({ lostBase, recs, view, onView }: { lostBase: RenewalItem[]; recs: RenewalReason[]; view: "labels" | "groups"; onView: (v: "labels" | "groups") => void }) {
  const R = RN2.reasons; const N = recs.length;
  const [tip, setTip] = useState<number | null>(null);
  const g = groupBars(recs); const max = Math.max(1, ...g.rows.map((r) => r.total));
  const col = (which: "primary" | "secondary") => {
    const t = topLabels(recs, which);
    return (
      <div className="rn2-top">
        <h4>{which === "primary" ? R.primary : R.secondary}</h4>
        {t.rows.map((r, k) => (
          <div key={r.key} className="rn2-top-row">
            <b className="rn2-rank">{k + 1}</b>
            <span>{r.label}<small>{r.group}. {groupName(r.group)}</small></span>
            <i className={cn("rn2-bar", which === "primary" ? "is-p" : "is-s")} style={{ width: `${Math.max(4, r.pct)}%` }} />
            <em className="tabular-nums">{R.n(r.n)} · {r.pct.toFixed(0)}%</em>
          </div>
        ))}
        {t.tie && <p className="rn2-tie">{R.tie(t.tie.k, t.tie.n)}</p>}
      </div>
    );
  };
  return (
    <section className="rn2-sec" data-tour="rn2-reasons">
      <header className="rn2-sec-head">
        <h3>{R.title}<InfoButton info={{ count: R.info }} />{N > 0 && <small>{R.fromN(N)}</small>}</h3>
        <div className="rn2-seg" role="group">
          {(["labels", "groups"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} className={cn(view === v && "is-on")} onClick={() => onView(v)}>{v === "labels" ? R.viewLabels : R.viewGroups}</button>)}
        </div>
      </header>
      {!lostBase.length ? <p className="rn2-empty">{R.empty}</p> : !N ? <p className="rn2-empty">{R.emptyNoReason(lostBase.length)}</p> : view === "labels" ? (
        <>
          <div className="rn2-tops">{col("primary")}{col("secondary")}</div>
          <p className="rn2-foot">{R.foot(lostBase.length, N, lostBase.length - N)} <button type="button" className="rn2-link" onClick={() => onView("groups")}>{R.footLink}</button></p>
        </>
      ) : (
        <>
          <p className="rn2-legend"><span><i className="rn2-sq is-p" />{R.legendP}</span><span><i className="rn2-sq is-s" />{R.legendS}</span></p>
          <div className="rn2-groups" data-testid="rn2-groups">
            {g.rows.map((r) => (
              <div key={r.group} className={cn("rn2-grow", !r.total && "is-zero")}>
                <span className="rn2-gname">{r.name}</span>
                <div className="rn2-gbar" tabIndex={0} role="img" aria-label={`${R.tipHead(r.name, r.total)} · ${R.tipSplit(r.primary, r.secondary)}`}
                  onMouseEnter={() => setTip(r.group)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(r.group)} onBlur={() => setTip(null)}>
                  <div className="rn2-gtrack" style={{ width: `${(r.total / max) * 100}%` }}>
                    {r.primary > 0 && <i className="is-p" style={{ flex: r.primary }}>{r.primary}</i>}
                    {r.secondary > 0 && <i className="is-s" style={{ flex: r.secondary }}>{r.secondary}</i>}
                  </div>
                  {tip === r.group && r.total > 0 && (
                    <div className="rn2-gtip" role="tooltip">
                      <strong>{R.tipHead(r.name, r.total)}</strong><span>{R.tipSplit(r.primary, r.secondary)}</span>
                      {r.labels.map((l) => <span key={l.key}>{l.label} <b>{l.pctOfGroup.toFixed(0)}%</b> · {R.tipLabel(l.n, l.primary, l.secondary)}</span>)}
                    </div>
                  )}
                </div>
                <em className="tabular-nums">{R.share(`${r.share.toFixed(0)}%`, r.total)}</em>
              </div>
            ))}
          </div>
          <p className="rn2-foot">{R.groupsFoot(g.totalLabels, N)}</p>
        </>
      )}
    </section>
  );
}
const GROUP_NAMES: Record<number, string> = { 1: "ราคาและความคุ้มค่า", 2: "ผลลัพธ์ที่โรงแรมได้", 3: "กำลังเงินของโรงแรม", 4: "งานของผู้ให้บริการ", 5: "การประชุม", 6: "ช่วงเริ่มต้น", 7: "เหตุผลฝั่งลูกค้าเอง" };
const groupName = (g: number) => GROUP_NAMES[g] ?? "";

/* ---------------- §6.3 record / edit dialog ---------------- */
function ReasonDialog({ item, rec, actor, now, onClose }: { item: RenewalItem; rec: RenewalReason | null; actor: Actor; now: string; onClose: () => void }) {
  const D = RN2.dialog;
  const [picks, setPicks] = useState<string[]>(rec ? [...rec.primary, rec.secondary] : []);
  const [note, setNote] = useState(rec?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const by = { member_id: actor.id, display: actor.role === "PM" ? "PM" : actor.id, role: actor.role };
  const save = () => {
    const o = rec ? editReason(rec.id, picks, note, by, now)
      : recordReason({ contract_id: item.contract_id, service: item.service, renewal_card_id: item.card_id ?? null, outcome: item.outcome === "LOST" ? "LOST" : "NOT_RENEWED", picks, note, by }, now);
    if (!o.ok) return setErr(o.error);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rec ? D.edit : D.record}</DialogTitle>
          <DialogDescription>{item.hotel_name} · {item.service} · {RN2.card.result} {RN2_OUTCOME_TH[item.outcome ?? "NOT_RENEWED"]} {thShort(periodDate(item))} · AE {aeNameTh(item.ae)} · {teamText(item)}</DialogDescription>
        </DialogHeader>
        {item.legacy_reason && <p className="rn2-ct-note">{RN2.card.legacy}: {item.legacy_reason}</p>}
        <RenewalReasonPicker value={picks} onChange={setPicks} note={note} onNote={setNote} idPrefix="rn2-dlg" />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <DialogFooter className="items-center">
          <small className="mr-auto text-muted-foreground">{rec ? D.hintEdit(thShort(rec.editable_until)) : D.hintNew}</small>
          <Button variant="outline" onClick={onClose}>{D.cancel}</Button>
          <Button disabled={!validPick(picks)} onClick={save}>{D.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
