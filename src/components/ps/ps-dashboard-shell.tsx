/* PS Dashboard Shell v1.0 — Headline KPI strip + shared filter + AC tab (read-only).
 * AC data comes only from the existing v_ac_* views (cloud mirror, C5); nothing here mutates
 * AC data. Signed/Won are re-homed from BD-AC using the unchanged v_bdac_flow projection. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Minus, Triangle } from "lucide-react";
import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { BdacTab } from "@/components/ps/bdac-tab";
import { PsReportTab } from '@/components/ps/ps-report-tab';
import { readPsDashboard } from '@/lib/ps-dashboard.functions';
import { latestPeriod, psScope, ratio, type PsReport } from '@/lib/ps-dashboard-types';
import { buildDemoReport, demoAcViews, demoLifecycles, DEMO_NOW } from '@/lib/ps-demo-fixture';
import { Button } from "@/components/ui/button";
import { readAcDashboard } from "@/lib/ac-dashboard.functions";
import { v_bdac_flow } from "@/lib/bdac-views";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { DashboardGlobal, defaultGlobalFilter, matchesBook, scopePeriod, selectedPeriod, periodRange, deltaText, useDashboardGlobal, type GlobalFilter } from '@/lib/ps-dashboard-global';
import { DashboardGlobalFilters } from './dashboard-global-filters';
import { DashboardCompare } from './dashboard-compare';
import { cn } from "@/lib/utils";

type Filter = GlobalFilter;
const FilterCtx = createContext<Filter>(defaultGlobalFilter);
const PsReportCtx = createContext<{ data?: PsReport | undefined; isLoading: boolean; isError: boolean }>({ isLoading: true, isError: false });

type RowKey = "billing_period" | "service_line" | "outstanding" | "customer_count" | "invoice_count" | "grade" | "customer_id" | "customer_segment" | "hotel_id" | "amount" | "rank" | "previous_month_rank" | "lifetime_average_rank";
type Row = Partial<Record<RowKey, string | number | boolean | null>>;
const ym = (offset: number) => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth() + offset, 1)).toISOString().slice(0, 7); };
const num = (v: unknown) => Number(v ?? 0) || 0;
const baht = (n: number) => "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

/** Rows inside the selected window; shift=-1 gives the same window one month earlier (MoM). */
function scope(rows: Row[], f: Filter, shift = 0, now = new Date()) {
  return scopePeriod(rows, f, selectedPeriod(f, now, shift === 0 ? 'A' : 'B'));
}

function useAcViews() {
  const { demo } = useDashboardGlobal();
  const read = useServerFn(readAcDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({ queryKey: ["ac-dashboard-views"], queryFn: () => read(), staleTime: 60_000, enabled: ready && !demo });
  return demo ? { data: demoAcViews(), isLoading: false, isError: false } : real;
}

function Mom({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null) return <span className="text-xs text-muted-foreground">— รอสะสม</span>;
  const d = cur - prev;
  const pct = prev ? ` (${((d / prev) * 100).toFixed(0)}%)` : "";
  const I = d === 0 ? Minus : Triangle;
  return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><I className={cn("size-3", d < 0 && "rotate-180")} />{d > 0 ? "+" : ""}{d.toLocaleString("th-TH")}{pct}</span>;
}

function Tile({ label, value, mom, tone, placeholder }: { label: string; value?: string; mom?: ReactNode; tone?: "warn"; placeholder?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", placeholder && "bg-muted/40 opacity-70", tone === "warn" && "border-warning/60")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {placeholder
        ? <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Clock className="size-3.5" />{placeholder}</p>
        : <><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><div className="mt-1">{mom}</div></>}
    </div>
  );
}

const Empty = ({ text = "รอ Cloud Sync seed — ยังไม่มีข้อมูลในรายงาน" }: { text?: string }) => (
  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{text}</p>
);

export function DashboardShell({ servicing, overview, header }: { servicing: ReactNode; overview?: ReactNode; header?: ReactNode }) {
  const read = useServerFn(readPsDashboard);
  const [filter, setFilter] = useState<Filter>(defaultGlobalFilter);
  const [tab, setTab] = useState("bdac");
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get('demo') === '1'); setReady(true); }, []);
  useEffect(() => {
    const update = () => setDemo(new URLSearchParams(window.location.search).get('demo') === '1');
    window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update);
  }, []);
  const toggleDemo = () => {
    const on = !demo; setDemo(on);
    const url = new URL(window.location.href);
    if (on) url.searchParams.set('demo','1'); else url.searchParams.delete('demo');
    window.history.replaceState(window.history.state, '', url);
  };
  const ps = useQuery({ queryKey: ['ps-dashboard-views'], queryFn: () => read(), staleTime: 60_000, enabled: ready && !demo });
  const demoReport = useMemo(() => demo ? buildDemoReport(filter) : undefined, [demo, filter]);
  const data = useMemo(() => {
    if (demoReport) return demoReport;
    if (!ps.data) return undefined;
    return { ...ps.data, views: Object.fromEntries(Object.entries(ps.data.views).map(([key, rows]) => [key, rows.filter(row => matchesBook(row, filter, key === 'v_ps_lifecycle_flow' || key === 'v_ps_account_health'))])) as PsReport['views'] };
  }, [demoReport, ps.data, filter]);
  const report = { data, isLoading: !demo && ps.isLoading, isError: !demo && ps.isError };
  const nowString = demo ? DEMO_NOW : new Date().toISOString();
  const now = new Date(nowString);
  const { lifecycles } = useContractLifecycle();
  const deals = demo ? demoLifecycles() : lifecycles;
  const lines = deals.filter(d => matchesBook({ service_line: d.service_line === 'MARCOM' ? 'Marcom' : d.service_line, hotel_id:d.hotel_id, hotel_name:d.hotel_name, ae_owner_id: data?.views.v_ps_account_health.find(r => r.hotel_id === d.hotel_id)?.['ae_owner_id'] ?? (demo ? d.bd_owner_id : null) }, filter));
  const wonMtd = v_bdac_flow(lines, periodRange(selectedPeriod(filter, now))).won;
  const periodFilter = { ...filter, ...(filter.compare ? { period:selectedPeriod(filter, now) } : {}) };
  return <DashboardGlobal.Provider value={{ filter, demo, now:nowString }}><FilterCtx.Provider value={filter}><PsReportCtx.Provider value={report}>
    <div className="flex flex-col gap-4">
      <DashboardGlobalFilters value={filter} onChange={setFilter} demo={demo} onDemo={toggleDemo} now={now} />
      <HeadlineStrip />
      {header}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Dashboard tabs">
        {[["bdac", "BD-AC"], ["ac", "AC"], ["ps", "PS"], ["meeting", "Meeting·"], ["task", "Task·"], ["servicing", "Servicing"]].map(([k,l]) => <Button key={k} role="tab" aria-selected={tab === k} onClick={() => { if (k) setTab(k); }} variant={tab === k ? 'default' : 'ghost'} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium">{l}</Button>)}
      </div>
      <div data-testid="active-dashboard-tab" className="min-w-0 space-y-4">
        {demo && <p className="text-xs font-semibold text-warning-foreground">DEMO · 30 Sep 2026</p>}
        {filter.compare && <DashboardCompare report={data} ac={demo ? demoAcViews() : undefined} deals={lines} tab={tab === 'ac' ? '' : tab} />}
        {tab === 'bdac' && (filter.compare ? <div className="grid min-w-0 gap-5 xl:grid-cols-2">{(['A','B'] as const).map(side => <div key={side} className="min-w-0"><h2 className="mb-3 text-sm font-semibold">Period {side}</h2><BdacTab source={lines} globalFilter={{...filter,periodA:selectedPeriod(filter,now,side)}} clock={now.getTime()} /></div>)}</div> : <BdacTab source={lines} globalFilter={filter} clock={now.getTime()} />)}
        {tab === 'ac' && <AcTab />}
        {tab === 'ps' && <>
          {filter.compare ? <div className="grid min-w-0 gap-6 xl:grid-cols-2">{(['A','B'] as const).map(side => <div key={side} className="min-w-0 space-y-3"><h2 className="border-b pb-2 font-semibold">Period {side} · {selectedPeriod(filter,now,side).from} — {selectedPeriod(filter,now,side).to}</h2><PsReportTab report={data} filter={{ ...filter, period:selectedPeriod(filter,now,side) }} loading={report.isLoading} error={report.isError} compareSide={side} /></div>)}</div> : <PsReportTab report={data} filter={periodFilter} loading={report.isLoading} error={report.isError} wonMtd={wonMtd} />}
          {overview}
        </>}
        {(tab === 'meeting' || tab === 'task') && <Empty text={demo ? 'DEMO: stub (ตาม IA)' : 'เร็วๆ นี้ (ตาม IA)'} />}
        {tab === 'servicing' && servicing}
      </div>
    </div>
  </PsReportCtx.Provider></FilterCtx.Provider></DashboardGlobal.Provider>;
}


function HeadlineStrip() {
  const f = useContext(FilterCtx);
  const global = useDashboardGlobal();
  const ps = useContext(PsReportCtx);
  const now = ps.data?.now ? new Date(ps.data.now) : new Date();
  const demoMark = ps.data?.demo ? ' · DEMO' : '';
  const pf = { ...f, ...(f.compare ? { period:f.periodA } : {}) };
  const bf = { ...f, ...(f.compare ? { period:f.periodB } : {}) };
  const churnNow = ratio(latestPeriod(psScope(ps.data?.views.v_ps_churn_monthly ?? [], pf, 'billing_period', 0, now)), 'out_count', 'active_at_start');
  const churnPrev = ratio(latestPeriod(psScope(ps.data?.views.v_ps_churn_monthly ?? [], bf, 'billing_period', -1, now)), 'out_count', 'active_at_start');
  const npsValue = (shift: number) => {
    const rows = psScope(ps.data?.views.v_ps_nps ?? [], shift === 0 ? pf : bf, 'billing_period', shift, now);
    const count = rows.reduce((s,r) => s + Number(r.responses ?? 0), 0);
    return count > 0 ? rows.reduce((s,r) => s + Number(r.promoters ?? 0) - Number(r.detractors ?? 0), 0) / count * 100 : null;
  };
  const npsNow = npsValue(0), npsPrev = npsValue(-1);
  const q = useAcViews();
  const { lifecycles } = useContractLifecycle();
  const lines = (global.demo ? demoLifecycles() : lifecycles).filter(d => matchesBook({ service_line: d.service_line === 'MARCOM' ? 'Marcom' : d.service_line, ae_owner_id: global.demo ? d.bd_owner_id : ps.data?.views.v_ps_account_health.find(r => r.hotel_id === d.hotel_id)?.['ae_owner_id'] }, f));
  const cur = v_bdac_flow(lines, periodRange(f.compare ? f.periodA : selectedPeriod({ ...f, range:'mtd' }, now)));
  const prev = v_bdac_flow(lines, periodRange(f.compare ? f.periodB : selectedPeriod({ ...f, range:'mtd' }, now,'B')));
  const od = (q.data?.['v_ac_overdue'] ?? []) as Row[];
  const gd = (q.data?.['v_ac_grade_distribution'] ?? []) as Row[];
  const sumOut = (rows: Row[]) => rows.reduce((s, r) => s + num(r['outstanding']), 0);
  const abShare = (rows: Row[]) => {
    const t = rows.reduce((s, r) => s + num(r['customer_count']), 0);
    return t ? Math.round((rows.filter((r) => r['grade'] === "A" || r['grade'] === "B").reduce((s, r) => s + num(r['customer_count']), 0) / t) * 100) : null;
  };
  const odNow = scope(od, f, 0, now), odPrev = scope(od, f, -1, now);
  const gNow = abShare(scope(gd, f, 0, now)), gPrev = abShare(scope(gd, f, -1, now));
  const compare = (a: number, b: number | null, unit: 'pp' | '%' | '' = '') => f.compare ? <span className="text-xs text-muted-foreground">A {a.toLocaleString('th-TH', { maximumFractionDigits:1 })} · B {b == null ? '—' : b.toLocaleString('th-TH',{ maximumFractionDigits:1 })} · {deltaText(a,b,unit)}</span> : unit === 'pp' ? <span className="text-xs text-muted-foreground">{deltaText(a,b,'pp')}</span> : <Mom cur={a} prev={b} />;
  return (
    <div data-testid="headline-strip" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {odNow.length ? <Tile tone="warn" label={"Collection outstanding" + demoMark} value={baht(sumOut(odNow))} mom={compare(sumOut(odNow), odPrev.length ? sumOut(odPrev) : null,'%')} />
        : <Tile label={"Collection outstanding" + demoMark} placeholder={q.isError ? "อ่านรายงานไม่ได้" : "รอ Cloud Sync seed"} />}
      {gNow != null ? <Tile label={"Grade A/B %" + demoMark} value={`${gNow}%`} mom={compare(gNow,gPrev,'pp')} />
        : <Tile label={"Grade A/B %" + demoMark} placeholder="รอ Cloud Sync seed" />}
      <Tile label={"Signed MTD" + demoMark} value={String(cur.signed)} mom={compare(cur.signed, global.demo && !lines.some(d => d.signed_at && new Date(d.signed_at).getTime() >= periodRange(f.periodB).from && new Date(d.signed_at).getTime() < periodRange(f.periodB).to) ? null : prev.signed)} />
      <Tile label={"Won MTD" + demoMark} value={String(cur.won)} mom={compare(cur.won, global.demo && prev.won === 0 ? null : prev.won)} />
      <Tile label={"MRR" + demoMark} placeholder="รอนิยาม" />
      {churnNow === null ? <Tile label="Churn %" placeholder={ps.isError ? 'อ่านรายงานไม่ได้' : 'รอ Cloud Sync seed'} /> : <Tile label={'Churn %' + demoMark} tone="warn" value={`${churnNow.toFixed(1)}%`} mom={compare(churnNow,churnPrev,'pp')} />}
      {npsNow === null ? <Tile label="NPS" placeholder={ps.isError ? 'อ่านรายงานไม่ได้' : 'รอ Cloud Sync seed'} /> : <Tile label={'NPS' + demoMark} value={npsNow.toFixed(1)} mom={compare(npsNow,npsPrev)} />}
      <Tile label={"Pipeline health" + demoMark} placeholder="รอ PipeDrive" />
    </div>
  );
}

const GRADE_COLOR: Record<string, string> = { A: "var(--primary)", B: "var(--chart-2, var(--primary))", C: "var(--warning)", D: "var(--muted-foreground)" };

function AcTab() {
  const f = useContext(FilterCtx);
  const q = useAcViews();
  const global = useDashboardGlobal();
  const now = new Date(global.now);
  const navigate = useNavigate();
  const open = () => navigate({ to: "/ac/hotel-profile" });
  const v = useMemo(() => {
    const d = q.data;
    const s = (k: "v_ac_debtors" | "v_ac_invoices_breakdown" | "v_ac_invoice_ranking" | "v_ac_grade_distribution" | "v_ac_overdue" | "v_ac_suspended" | "v_ac_legal") => scope((d?.[k] ?? []) as Row[], f, 0, now);
    return { debt: s("v_ac_debtors"), br: s("v_ac_invoices_breakdown"), rank: s("v_ac_invoice_ranking"), grade: s("v_ac_grade_distribution"), gradePrev: scope((d?.['v_ac_grade_distribution'] ?? []) as Row[], f, -1, now), od: s("v_ac_overdue"), sus: s("v_ac_suspended"), legal: s("v_ac_legal") };
  }, [q.data, f, global.now]);
  if (q.isLoading) return <Empty text="กำลังโหลดรายงาน…" />;
  if (q.isError) return <Empty text="อ่านรายงาน AC ไม่ได้ — ลองโหลดหน้าใหม่" />;
  const outstanding = v.od.reduce((s, r) => s + num(r['outstanding']), 0);
  const debtors = new Set(v.debt.map((r) => r['customer_id'])).size;
  const cnt = (rows: Row[], k: RowKey = "customer_count") => rows.reduce((s, r) => s + num(r[k]), 0);
  const gradeAgg = ["A", "B", "C", "D"].map((g) => ({ g, n: cnt(v['grade'].filter((r) => r['grade'] === g)), p: cnt(v.gradePrev.filter((r) => r['grade'] === g)) }));
  const gTotal = gradeAgg.reduce((s, x) => s + x.n, 0), pTotal = gradeAgg.reduce((s, x) => s + x.p, 0);
  const latest = [...new Set(v['rank'].map((r) => String(r.billing_period)))].sort().at(-1);
  const ranks = v['rank'].filter((r) => String(r.billing_period) === latest).sort((a, b) => num(b['amount']) - num(a['amount']));
  return (
    <><DashboardCompare report={undefined} ac={q.data} deals={[]} tab={f.compare ? "ac" : ""} /><div data-demo={global.demo || undefined} className="grid gap-4 lg:grid-cols-2">
      <Panel title={"A · ลูกหนี้ & ภาพรวมใบแจ้งหนี้" + (global.demo ? " · DEMO" : "")} subtitle="v_ac_debtors · v_ac_invoices_breakdown">
        <div className="grid grid-cols-2 gap-3"><Tile label="ยอดค้าง" value={baht(outstanding)} tone="warn" /><Tile label="# ลูกหนี้" value={String(debtors)} /></div>
        {v.br.length ? <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>กลุ่ม</th><th>ORM</th><th>Marcom</th></tr></thead><tbody>
          {["NEW", "EXISTING"].map((seg) => <tr key={seg} className="border-t"><td>{seg === "NEW" ? "ลูกค้าใหม่" : "ลูกค้าเดิม"}</td>{["ORM", "Marcom"].map((l) => <td key={l} className="tabular-nums">{cnt(v.br.filter((r) => r['customer_segment'] === seg && r.service_line === l), "invoice_count")}</td>)}</tr>)}
        </tbody></table> : <div className="mt-3"><Empty /></div>}
        {v.debt.length ? <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>ลูกค้า</th><th>บริการ</th><th>รอบ</th></tr></thead><tbody>
          {v.debt.slice(0, 20).map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}><td className="font-mono text-xs">{String(r['customer_id']).slice(0, 8)}</td><td>{String(r.service_line)}</td><td>{String(r.billing_period).slice(0, 7)}</td></tr>)}
        </tbody></table> : null}
      </Panel>

      <Panel title={"B · Payment Grade A–D" + (global.demo ? " · DEMO" : "")} subtitle="v_ac_grade_distribution · คำนวณใน AC App (อ่านผลเท่านั้น)">
        {gTotal ? <div className="flex items-center gap-4">
          <div className="h-40 w-40"><ResponsiveContainer><PieChart><Pie data={gradeAgg.filter((x) => x.n)} dataKey="n" nameKey="g" innerRadius={40} outerRadius={70}>{gradeAgg.filter((x) => x.n).map((x) => <Cell key={x.g} fill={GRADE_COLOR[x.g]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <ul className="space-y-1 text-sm">{gradeAgg.map((x) => <li key={x.g} className="flex items-center gap-2"><b>{x.g}</b> {Math.round((x.n / gTotal) * 100)}% <Mom cur={Math.round((x.n / gTotal) * 100)} prev={pTotal ? Math.round((x.p / pTotal) * 100) : null} /></li>)}</ul>
        </div> : <Empty />}
      </Panel>

      <Panel title={"C · Collection" + (global.demo ? " · DEMO" : "")} subtitle="v_ac_overdue · v_ac_suspended · v_ac_legal (PAUSED ไม่นับเป็น SUSPENDED)">
        <div className="grid grid-cols-3 gap-3">
          <Tile tone="warn" label="ค้างชำระ" value={v.od.length ? `${baht(outstanding)} / ${cnt(v.od)}` : "—"} />
          <Tile tone="warn" label="SUSPENDED" value={v.sus.length ? String(cnt(v.sus)) : "—"} />
          <Tile tone="warn" label="LEGAL" value={v.legal.length ? String(cnt(v.legal)) : "—"} />
        </div>
        {!v.od.length && !v.sus.length && !v.legal.length ? <div className="mt-3"><Empty /></div> :
          <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>รอบ</th><th>บริการ</th><th>ลูกค้า</th><th>ยอดค้าง</th></tr></thead><tbody>
            {v.od.map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}><td>{String(r.billing_period).slice(0, 7)}</td><td>{String(r.service_line)}</td><td>{num(r['customer_count'])}</td><td><Chip tone="warn">{baht(num(r['outstanding']))}</Chip></td></tr>)}
          </tbody></table>}
      </Panel>

      <Panel title={"D · Invoice Ranking" + (global.demo ? " · DEMO" : "")} subtitle={`v_ac_invoice_ranking${latest ? " · รอบ " + latest.slice(0, 7) : ""}`}>
        {ranks.length ? <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>#</th><th>โรงแรม</th><th>ยอด</th><th>ΔMoM</th><th>เฉลี่ย</th></tr></thead><tbody>
          {ranks.slice(0, 20).map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}>
            <td>{num(r['rank'])}</td><td className="font-mono text-xs">{String(r.hotel_id).slice(0, 8)}</td><td className="tabular-nums">{baht(num(r['amount']))}</td>
            <td>{r['previous_month_rank'] == null ? <span className="text-xs text-muted-foreground">— / รอสะสม</span> : <Mom cur={num(r['previous_month_rank'])} prev={num(r['rank'])} />}</td>
            <td className="tabular-nums">{r['lifetime_average_rank'] == null ? "—" : num(r['lifetime_average_rank']).toFixed(1)}</td></tr>)}
        </tbody></table> : <Empty />}
      </Panel>

      <Panel title={"E · ORM System Fee" + (global.demo ? " · DEMO" : "")} subtitle="v_ac_system_fee">
        <Tile label="ค่าระบบ ORM" placeholder="รอ email ingestion" />
      </Panel>
    </div></>
  );
}
