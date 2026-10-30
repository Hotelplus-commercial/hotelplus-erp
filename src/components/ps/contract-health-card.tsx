/* Tab R1 §4 — card ⑦ สุขภาพสัญญา (Contract Health). 1 row = 1 active service contract.
 * Tier is computed from system signals only; AE ✎ labels are shown beside them and never change the tier.
 * Writes: CONTRACT_SIGNAL tickets (dialog) + AE labels + daily tier snapshot / bell events (browser-local). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartHint, InfoButton } from "./dash-card";
import { NowChip } from "./compare-control";
import { GuidedTour } from "./guided-tour";
import { ContractSignalDialog } from "./contract-signal-dialog";
import { useAccount360 } from "./account-360";
import { R1_HEALTH, R1_STATUS_TH, R1_TIER_TH, R1_TITLES, R1_TOUR } from "@/lib/ps-glossary";
import { useTickets, type L0Ticket } from "@/lib/tickets-l0";
import { recordDay, useContractHealthStore } from "@/lib/contract-health-store";
import { tabR1SimBase } from "@/lib/contract-tab-r1-demo";
import {
  EMPTY_FILTER, QUICK_KEYS, SIGNAL_GROUPS, ageText, buildRows, catalogByKey, daysToEnd, evaluateAlerts, filterRows, highlightRange, isDueSoon,
  pageList, pageSizeOptions, paginate, snapshotOf, sortRows, tierMark,
  type HealthFilter, type HealthRow, type QuickKey, type SortKey, type Svc, type TabR1Data, type Tier,
} from "@/lib/contract-tab-r1";
import { cn } from "@/lib/utils";

const QUICK_LABEL: Record<QuickKey, string> = { NO_TICKET: R1_HEALTH.qNoTicket, DUE: R1_HEALTH.qDue, WORSE: R1_HEALTH.qWorse, OPP: R1_HEALTH.qOpp };
const thDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
const uniq = <T,>(a: T[]) => [...new Set(a)];

function Hl({ text, q }: { text: string; q: string }) {
  const r = highlightRange(text, q);
  if (!r) return <>{text}</>;
  return <>{text.slice(0, r[0])}<mark>{text.slice(r[0], r[1])}</mark>{text.slice(r[1])}</>;
}

export function ContractHealthCard({ data, onOpenTask }: { data: TabR1Data | undefined; onOpenTask?: ((contractId: string) => void) | undefined }) {
  const demo = !!data?.demo;
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const store = useContractHealthStore(demo);
  const storeTickets = useTickets();
  const { openAccount360 } = useAccount360();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [sim, setSim] = useState(false);
  const [filter, setFilter] = useState<HealthFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>(null);
  const [view, setView] = useState<"contract" | "hotel">("contract");
  const [size, setSize] = useState(20);
  const [page, setPage] = useState(1);
  const [showGreen, setShowGreen] = useState(false);
  const [actAs, setActAs] = useState<string>("PM");
  const [dialogRow, setDialogRow] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const tickets = useMemo<L0Ticket[]>(() => {
    const seen = new Set(storeTickets.map((t) => t.ticket_id));
    return [...(data?.seedTickets ?? []).filter((t) => !seen.has(t.ticket_id)), ...storeTickets];
  }, [data?.seedTickets, storeTickets]);
  const realRows = useMemo(() => (data ? buildRows(data.base, { today, labels: store.labels, snaps: store.snapshots, tickets }) : []), [data, today, store.labels, store.snapshots, tickets]);
  const simRows = useMemo(() => (demo && sim ? buildRows(tabR1SimBase(), { today, labels: [], snaps: [], tickets: [] }) : []), [demo, sim, today]);
  const rows = useMemo(() => [...realRows, ...simRows], [realRows, simRows]);

  // §10.2 / §7 — first load of the day (no scheduler): today's snapshot + the four AE bell events.
  useEffect(() => {
    if (!mounted || !data || !realRows.length) return;
    const keys = new Set(store.alerts.map((a) => a.key));
    recordDay(demo, today, snapshotOf(realRows, today), evaluateAlerts(realRows, store.snapshots, keys, today, new Date().toISOString()));
  }, [mounted, data, realRows, demo, today, store.alerts, store.snapshots]);

  // Bell deep link: ?ch=<quick>&chq=<hotel> opens the card with that filter.
  useEffect(() => {
    if (!mounted) return;
    const sp = new URLSearchParams(window.location.search);
    const ch = sp.get("ch") as QuickKey | null, chq = sp.get("chq");
    if ((ch && QUICK_KEYS.includes(ch)) || chq) {
      setFilter({ ...EMPTY_FILTER, quick: ch && QUICK_KEYS.includes(ch) ? [ch] : [], q: chq ?? "" });
      setTimeout(() => cardRef.current?.scrollIntoView({ block: "start" }), 50);
    }
  }, [mounted]);
  useEffect(() => setPage(1), [filter, sort, size, view, showGreen, sim]);

  const counts = { R: rows.filter((r) => r.tier === "R").length, A: rows.filter((r) => r.tier === "A").length, G: rows.filter((r) => r.tier === "G").length };
  const total = rows.length;
  const filtered = filterRows(rows, filter, today);
  const sorted = sortRows(filtered, sort, today);
  const pg = paginate(sorted, filter.tier, size, showGreen);
  const nPages = pg.pages.length;
  const cur = Math.min(page, nPages);
  const pageRows = pg.pages[cur - 1] ?? [];
  const lastPage = cur === nPages;
  const aes = uniq(rows.map((r) => r.ae).filter((x): x is string => !!x)).sort();
  const ormTeams = uniq(rows.filter((r) => r.service === "ORM").map((r) => r.orm_team).filter((x): x is string => !!x)).sort();
  const marcoms = uniq(rows.filter((r) => r.service === "Marcom").map((r) => r.marcom).filter((x): x is string => !!x)).sort();
  const aeName = (id: string) => rows.find((r) => r.ae === id)?.ae_name ?? id;
  const dirty = JSON.stringify(filter) !== JSON.stringify(EMPTY_FILTER) || sort != null;
  const canCreate = (r: HealthRow) => actAs === "PM" || actAs === r.ae;
  const openRow = dialogRow ? rows.find((r) => r.contract_id === dialogRow) : undefined;

  const setQuick = (k: QuickKey) => setFilter((f) => ({ ...f, quick: f.quick.includes(k) ? f.quick.filter((x) => x !== k) : [...f.quick, k] }));
  const cycleSort = (by: "age" | "tickets") => setSort((s) => (!s || s.by !== by ? { by, dir: "desc" } : s.dir === "desc" ? { by, dir: "asc" } : null));
  const sortLabel = (by: "age" | "tickets") => (!sort || sort.by !== by ? R1_HEALTH.sortNone : sort.dir === "desc" ? R1_HEALTH.sortDesc : R1_HEALTH.sortAsc);

  const groupsOfPage = view === "hotel"
    ? Object.values(pageRows.reduce<Record<string, HealthRow[]>>((acc, r) => { (acc[r.hotel_id] ??= []).push(r); return acc; }, {}))
    : [pageRows];

  return (
    <section className="dash-card r1-card r1-health" ref={cardRef} id="contract-health" data-testid="r1-health">
      <header className="dash-card-header">
        <div className="min-w-0">
          <h2>{R1_TITLES.health}<InfoButton info={{ read: R1_HEALTH.info }} /></h2>
          <div className="dash-card-period"><NowChip /></div>
          <p className="dash-question">{R1_HEALTH.question}</p>
        </div>
        <button type="button" className="r1-help" onClick={() => setTour(true)}>{R1_HEALTH.help}</button>
      </header>

      {!data ? <p className="dash-empty">ยังไม่มีข้อมูลสัญญา</p> : (
        <>
          <div className="r1-tierbar" data-tour="t1" aria-label="ภาพรวมระดับสุขภาพ">
            {(["R", "A", "G"] as Tier[]).map((t) => counts[t] > 0 && (
              <div key={t} className={cn("r1-tierbar-seg", `tier-${t}`)} style={{ flexGrow: counts[t] }}>
                <span className="tabular-nums">{R1_TIER_TH[t]} {counts[t]}</span>
              </div>
            ))}
            {total === 0 && <div className="r1-tierbar-seg is-empty">0</div>}
          </div>

          <div className="r1-toolbar">
            <div className="r1-seg" data-tour="t2" role="tablist" aria-label="ระดับ">
              {(["ALL", "R", "A", "G"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={filter.tier === t} className={cn(filter.tier === t && "is-on")} onClick={() => setFilter((f) => ({ ...f, tier: t }))}>{t === "ALL" ? R1_HEALTH.tierAll : R1_TIER_TH[t]}</button>
              ))}
            </div>
            <div className="r1-seg" role="tablist" aria-label="มุมมอง">
              <button type="button" role="tab" aria-selected={view === "contract"} className={cn(view === "contract" && "is-on")} onClick={() => setView("contract")}>{R1_HEALTH.viewByContract}</button>
              <button type="button" role="tab" aria-selected={view === "hotel"} className={cn(view === "hotel" && "is-on")} onClick={() => setView("hotel")}>{R1_HEALTH.viewByHotel}</button>
            </div>
            <label className="r1-actas">
              <span>{R1_HEALTH.actAs}</span>
              <select value={actAs} onChange={(e) => setActAs(e.target.value)}>
                <option value="PM">{R1_HEALTH.actPm}</option>
                {aes.map((a) => <option key={a} value={a}>AE · {aeName(a)}</option>)}
              </select>
            </label>
            {demo && <label className="r1-sim"><input type="checkbox" checked={sim} onChange={(e) => setSim(e.target.checked)} /> {R1_HEALTH.sim}</label>}
          </div>

          <div className="r1-quick" data-tour="t3">
            <span className="r1-quick-label">{R1_HEALTH.quick}<InfoButton info={{ read: R1_HEALTH.quickInfo }} /></span>
            {QUICK_KEYS.map((k) => {
              const n = filterRows(rows, { ...filter, quick: uniq([...filter.quick, k]) }, today).length;
              return <button key={k} type="button" aria-pressed={filter.quick.includes(k)} className={cn("r1-quick-btn", filter.quick.includes(k) && "is-on")} onClick={() => setQuick(k)}>{QUICK_LABEL[k]} <b className="tabular-nums">{n}</b></button>;
            })}
            {dirty && <button type="button" className="r1-linkbtn" onClick={() => { setFilter(EMPTY_FILTER); setSort(null); }}>{R1_HEALTH.clearAll}</button>}
          </div>

          <div className="r1-table-wrap">
            <table className="r1-table">
              <thead>
                <tr>
                  <th>{R1_HEALTH.cols.contract}</th>
                  <th>{R1_HEALTH.cols.service}</th>
                  <th>{R1_HEALTH.cols.owner}<InfoButton info={{ read: R1_HEALTH.ownerInfo }} /></th>
                  <th>{R1_HEALTH.cols.tier}<InfoButton info={{ read: R1_HEALTH.tierInfo }} /></th>
                  <th data-tour="t5">{R1_HEALTH.cols.signals}<InfoButton info={{ read: R1_HEALTH.signalInfo }} /></th>
                  <th>{R1_HEALTH.cols.age}</th>
                  <th data-tour="t6">{R1_HEALTH.cols.ticket}<InfoButton info={{ read: R1_HEALTH.ticketInfo }} /></th>
                </tr>
                <tr className="r1-filter-row" data-tour="t4">
                  <th><input className="r1-input" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} placeholder={R1_HEALTH.search} aria-label={R1_HEALTH.search} /></th>
                  <th>
                    <select className="r1-input" value={filter.svc} onChange={(e) => setFilter((f) => ({ ...f, svc: e.target.value as Svc | "ALL" }))} aria-label={R1_HEALTH.cols.service}>
                      <option value="ALL">{R1_HEALTH.svcAll}</option><option value="ORM">ORM</option><option value="Marcom">Marcom</option>
                    </select>
                  </th>
                  <th><OwnerFilter value={filter.owners} onChange={(owners) => setFilter((f) => ({ ...f, owners }))} aes={aes} aeName={aeName} orm={ormTeams} marcom={marcoms} /></th>
                  <th />
                  <th><GroupFilter value={filter.groups} onChange={(groups) => setFilter((f) => ({ ...f, groups }))} /></th>
                  <th><button type="button" className={cn("r1-sort", sort?.by === "age" && "is-on")} onClick={() => cycleSort("age")}>{sortLabel("age")}</button></th>
                  <th><button type="button" className={cn("r1-sort", sort?.by === "tickets" && "is-on")} onClick={() => cycleSort("tickets")}>{sortLabel("tickets")}</button></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && <tr><td colSpan={7} className="r1-empty">{R1_HEALTH.empty}</td></tr>}
                {groupsOfPage.map((grp, gi) => [
                  view === "hotel" && grp.length > 0 && <tr key={`g-${grp[0]!.hotel_id}`} className="r1-group-row"><td colSpan={7}>{R1_HEALTH.groupHead(grp[0]!.hotel_name, grp.length)}</td></tr>,
                  ...grp.map((r, ri) => (
                    <HealthRowView key={r.contract_id} r={r} q={filter.q} today={today} first={gi === 0 && ri === 0}
                      canCreate={canCreate(r)} onCreate={() => setDialogRow(r.contract_id)} onOpen={() => openAccount360(r.hotel_id)} onOpenTask={onOpenTask} />
                  )),
                ])}
                {filter.tier === "ALL" && pg.showGreenRow && lastPage && (
                  <tr className="r1-green-row"><td colSpan={7}><button type="button" className="r1-linkbtn" onClick={() => setShowGreen((x) => !x)}>{showGreen ? R1_HEALTH.hideGreen : R1_HEALTH.showGreen(sorted.green.length)}</button></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="r1-pager">
            <span className="tabular-nums">{R1_HEALTH.count(filtered.length)}{pg.hiddenGreen > 0 ? R1_HEALTH.hiddenGreen(pg.hiddenGreen) : ""}{pg.expandedFirst && cur === 1 ? R1_HEALTH.expanded(sorted.ry.length) : ""}</span>
            {nPages > 1 && (
              <nav className="r1-pages" aria-label="หน้า">
                <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="ก่อนหน้า">‹</button>
                {pageList(cur, nPages).map((p, i) => p === "…" ? <span key={`e${i}`}>…</span> : <button key={p} type="button" aria-current={p === cur ? "page" : undefined} className={cn(p === cur && "is-on")} onClick={() => setPage(p)}>{p}</button>)}
                <button type="button" disabled={cur === nPages} onClick={() => setPage(cur + 1)} aria-label="ถัดไป">›</button>
              </nav>
            )}
            <label className="r1-size">{R1_HEALTH.perPage[0]}
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>{pageSizeOptions(total).map((n) => <option key={n} value={n}>{n}</option>)}</select>
              {R1_HEALTH.perPage[1]}
            </label>
          </div>
        </>
      )}
      {openRow && (
        <ContractSignalDialog row={openRow} tickets={tickets} labels={store.labels} demo={demo}
          by={actAs === "PM" ? { member_id: "PM", display: "PM", role: "PM" } : { member_id: actAs, display: aeName(actAs), role: "AE" }}
          creator={actAs === "PM" ? "PM" : "PS"} onClose={() => setDialogRow(null)} />
      )}
      <GuidedTour open={tour} onClose={() => setTour(false)} root={cardRef.current} steps={R1_TOUR.health.map((s, i) => ({ ...s, target: `t${i + 1}` }))} />
    </section>
  );
}

function HealthRowView({ r, q, today, first, canCreate, onCreate, onOpen, onOpenTask }: {
  r: HealthRow; q: string; today: string; first: boolean; canCreate: boolean; onCreate: () => void; onOpen: () => void; onOpenTask?: ((contractId: string) => void) | undefined;
}) {
  const mark = tierMark(r.tier, r.tier30);
  const due = isDueSoon(r, today) ? daysToEnd(r, today) : null;
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const chip = (key: string, label: string, dir: string, tip: string[], ae?: boolean, extra?: string) => (
    <ChartHint key={`${ae ? "ae" : "s"}-${key}`} header={label} lines={tip}>
      <span tabIndex={0} className={cn("r1-chip", `is-${dir}`, ae && "is-ae", extra)} onClick={stop}>{dir === "bad" ? "▼" : dir === "good" ? "▲" : "★"} {label}</span>
    </ChartHint>
  );
  return (
    <tr className={cn("r1-row", `tier-${r.tier}`)} onClick={onOpen} data-testid="r1-row">
      <td data-label={R1_HEALTH.cols.contract} data-tour={first ? "t7" : undefined}>
        <button type="button" className="r1-name" onClick={(e) => { stop(e); onOpen(); }}><Hl text={r.hotel_name} q={q} /></button>
        {r.hotel_name_en && r.hotel_name_en !== r.hotel_name && <div className="r1-sub"><Hl text={r.hotel_name_en} q={q} /></div>}
      </td>
      <td data-label={R1_HEALTH.cols.service}><span className={cn("r1-svc", `svc-${r.service.toLowerCase()}`)}>{r.service}</span></td>
      <td data-label={R1_HEALTH.cols.owner}><div>{r.ae_name}</div><div className="r1-sub">{r.owner2 ?? "—"}</div></td>
      <td data-label={R1_HEALTH.cols.tier}>
        <span className={cn("r1-tier", `tier-${r.tier}`)}>{R1_TIER_TH[r.tier]}</span>
        {mark && r.tier30 && <div className={cn("r1-mark", mark === "up" ? "is-up" : "is-down")} title={R1_HEALTH.tierFrom(R1_TIER_TH[r.tier30])}>{mark === "up" ? R1_HEALTH.tierUp : R1_HEALTH.tierDown}</div>}
      </td>
      <td data-label={R1_HEALTH.cols.signals} className="r1-sigcell">
        <div className="r1-zone"><span className="r1-zone-label">{R1_HEALTH.zoneSystem}</span><div className="r1-chips">
          {r.signals.length ? r.signals.map((s) => chip(s.key, s.key === "OVERDUE_OTHER" ? R1_HEALTH.otherOverdue : s.label, s.dir, [`${s.group}. ${SIGNAL_GROUPS[s.group]}`, s.rule], false, s.key === "OVERDUE_OTHER" ? "is-amber" : undefined)) : <span className="r1-muted">{R1_HEALTH.notFound}</span>}
        </div></div>
        {r.ae_labels.length > 0 && (
          <div className="r1-zone"><span className="r1-zone-label">{R1_HEALTH.zoneAe}</span><div className="r1-chips">
            {r.ae_labels.map((l) => { const e = catalogByKey.get(l.label_key); if (!e) return null; return chip(l.label_key, e.label, e.dir, [`${e.group}. ${SIGNAL_GROUPS[e.group]}`, R1_HEALTH.savedBy(l.created_by.display, thDate(l.created_at))], true); })}
          </div></div>
        )}
      </td>
      <td data-label={R1_HEALTH.cols.age}>
        <div className="tabular-nums">{ageText(r.start, today)}</div>
        {due != null && <div className="r1-due tabular-nums">{R1_HEALTH.dueIn(due)}</div>}
      </td>
      <td data-label={R1_HEALTH.cols.ticket} onClick={stop}>
        {r.tickets.length > 0 && (
          <ChartHint header={R1_HEALTH.ticketHover(r.hotel_name, r.service, r.tickets.length)} lines={[...r.tickets.map((t) => `#${t.ticket_id} · ${t.assignee?.display ?? t.target_dept} · ${(t.payload.labels ?? []).map((k) => catalogByKey.get(k)?.label ?? k).join(", ") || "—"} · ${R1_STATUS_TH[t.status] ?? t.status}`), R1_HEALTH.ticketHoverFoot]}>
            <button type="button" className="r1-tcount tabular-nums" onClick={() => onOpenTask?.(r.contract_id)}>{r.tickets.length}</button>
          </ChartHint>
        )}
        {canCreate && <button type="button" className="r1-create" onClick={onCreate}>{R1_HEALTH.create}</button>}
      </td>
    </tr>
  );
}

function OwnerFilter({ value, onChange, aes, aeName, orm, marcom }: { value: HealthFilter["owners"]; onChange: (v: HealthFilter["owners"]) => void; aes: string[]; aeName: (id: string) => string; orm: string[]; marcom: string[] }) {
  const [open, setOpen] = useState(false);
  const n = value.ae.length + value.orm.length + value.marcom.length;
  const toggle = (k: keyof HealthFilter["owners"], v: string) => onChange({ ...value, [k]: value[k].includes(v) ? value[k].filter((x) => x !== v) : [...value[k], v] });
  const group = (k: keyof HealthFilter["owners"], title: string, list: string[], label: (v: string) => string) => (
    <div className="r1-pop-group"><strong>{title}</strong>{list.map((v) => <label key={v}><input type="checkbox" checked={value[k].includes(v)} onChange={() => toggle(k, v)} /> {label(v)}</label>)}</div>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" className={cn("r1-input r1-dd", n > 0 && "is-on")}>{R1_HEALTH.owners}{n > 0 ? ` (${n})` : ""}</button></PopoverTrigger>
      <PopoverContent align="start" className="r1-pop">
        {group("ae", R1_HEALTH.ownerGroups.ae, aes, aeName)}
        {group("orm", R1_HEALTH.ownerGroups.orm, orm, (t) => R1_HEALTH.ormTeam(t))}
        {group("marcom", R1_HEALTH.ownerGroups.marcom, marcom, (m) => m)}
        <div className="r1-pop-actions"><button type="button" onClick={() => onChange({ ae: [], orm: [], marcom: [] })}>{R1_HEALTH.clear}</button><button type="button" className="r1-primary" onClick={() => setOpen(false)}>{R1_HEALTH.done}</button></div>
      </PopoverContent>
    </Popover>
  );
}

function GroupFilter({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" className={cn("r1-input r1-dd", value.length > 0 && "is-on")}>{R1_HEALTH.groups}{value.length ? ` (${value.length})` : ""}</button></PopoverTrigger>
      <PopoverContent align="start" className="r1-pop">
        <div className="r1-pop-group">
          {Object.entries(SIGNAL_GROUPS).map(([g, name]) => { const k = Number(g); return <label key={g}><input type="checkbox" checked={value.includes(k)} onChange={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])} /> {g}. {name}</label>; })}
        </div>
        <div className="r1-pop-actions"><button type="button" onClick={() => onChange([])}>{R1_HEALTH.clear}</button><button type="button" className="r1-primary" onClick={() => setOpen(false)}>{R1_HEALTH.done}</button></div>
      </PopoverContent>
    </Popover>
  );
}
