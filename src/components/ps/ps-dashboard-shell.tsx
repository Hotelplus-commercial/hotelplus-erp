/* PS Dashboard Shell v1.0 — Headline KPI strip + shared filter + AC tab (read-only).
 * AC data comes only from the existing v_ac_* views (cloud mirror, C5); nothing here mutates
 * AC data. Signed/Won are re-homed from BD-AC using the unchanged v_bdac_flow projection. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Minus, Triangle } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { BdacTab } from "@/components/ps/bdac-tab";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readAcDashboard } from "@/lib/ac-dashboard.functions";
import { filterLine, monthRange, v_bdac_flow } from "@/lib/bdac-views";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { cn } from "@/lib/utils";

type Service = "ALL" | "ORM" | "Marcom";
type RangeKey = "mtd" | "3m" | "6m" | "12m" | "all";
const RANGES: Record<RangeKey, string> = { mtd: "เดือนนี้", "3m": "3 เดือน", "6m": "6 เดือน", "12m": "12 เดือน", all: "ทั้งหมด" };
const MONTHS: Record<RangeKey, number | null> = { mtd: 1, "3m": 3, "6m": 6, "12m": 12, all: null };
type Filter = { service: Service; range: RangeKey };
const FilterCtx = createContext<Filter>({ service: "ALL", range: "6m" });

type RowKey = "billing_period" | "service_line" | "outstanding" | "customer_count" | "invoice_count" | "grade" | "customer_id" | "customer_segment" | "hotel_id" | "amount" | "rank" | "previous_month_rank" | "lifetime_average_rank";
type Row = Partial<Record<RowKey, string | number | boolean | null>>;
const ym = (offset: number) => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth() + offset, 1)).toISOString().slice(0, 7); };
const num = (v: unknown) => Number(v ?? 0) || 0;
const baht = (n: number) => "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

/** Rows inside the selected window; shift=-1 gives the same window one month earlier (MoM). */
function scope(rows: Row[], f: Filter, shift = 0) {
  const n = MONTHS[f.range];
  const end = ym(shift), start = n == null ? "0000-00" : ym(shift - n + 1);
  return rows.filter((r) => {
    const p = String(r.billing_period ?? "").slice(0, 7);
    if (f.service !== "ALL" && r.service_line !== f.service) return false;
    return n == null ? shift === 0 || p <= end : p >= start && p <= end;
  });
}

function useAcViews() {
  const read = useServerFn(readAcDashboard);
  return useQuery({ queryKey: ["ac-dashboard-views"], queryFn: () => read(), staleTime: 60_000 });
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

export function DashboardShell({ servicing, overview }: { servicing: ReactNode; overview?: ReactNode }) {
  const [filter, setFilter] = useState<Filter>({ service: "ALL", range: "6m" });
  const [tab, setTab] = useState("bdac");
  return (
    <FilterCtx.Provider value={filter}>
      <div className="flex flex-col gap-4">
        <HeadlineStrip />
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
          <span className="text-xs text-muted-foreground">บริการ</span>
          {(["ALL", "ORM", "Marcom"] as Service[]).map((s) => (
            <Button key={s} size="sm" variant={filter.service === s ? "default" : "ghost"} onClick={() => setFilter({ ...filter, service: s })}>{s === "ALL" ? "ทั้งหมด" : s}</Button>
          ))}
          <Select value={filter.range} onValueChange={(v) => setFilter({ ...filter, range: v as RangeKey })}>
            <SelectTrigger className="h-9 w-[140px]" aria-label="ช่วงเวลา"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(RANGES) as RangeKey[]).map((k) => <SelectItem key={k} value={k}>{RANGES[k]}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">"ไม่ระบุบริการ" นับเฉพาะ "ทั้งหมด"</span>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1" role="tablist">
          {[["bdac", "BD-AC"], ["ac", "AC"], ["ps", "PS·"], ["meeting", "Meeting·"], ["task", "Task·"], ["servicing", "Servicing"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k!)}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{l}</button>
          ))}
        </div>
        {tab === "bdac" && <BdacTab />}
        {tab === "ac" && <AcTab />}
        {tab === "ps" && overview}
        {(tab === "meeting" || tab === "task") && <Empty text="เร็วๆ นี้ (ตาม IA)" />}
        {tab === "servicing" && servicing}
      </div>
    </FilterCtx.Provider>
  );
}


function HeadlineStrip() {
  const f = useContext(FilterCtx);
  const q = useAcViews();
  const { lifecycles } = useContractLifecycle();
  const lines = filterLine(lifecycles, f.service === "ALL" ? "ALL" : f.service === "ORM" ? "ORM" : "MARCOM");
  const cur = v_bdac_flow(lines, monthRange(0));
  const prev = v_bdac_flow(lines, monthRange(-1));
  const od = (q.data?.v_ac_overdue ?? []) as Row[];
  const gd = (q.data?.v_ac_grade_distribution ?? []) as Row[];
  const sumOut = (rows: Row[]) => rows.reduce((s, r) => s + num(r.outstanding), 0);
  const abShare = (rows: Row[]) => {
    const t = rows.reduce((s, r) => s + num(r.customer_count), 0);
    return t ? Math.round((rows.filter((r) => r.grade === "A" || r.grade === "B").reduce((s, r) => s + num(r.customer_count), 0) / t) * 100) : null;
  };
  const odNow = scope(od, f), odPrev = scope(od, f, -1);
  const gNow = abShare(scope(gd, f)), gPrev = abShare(scope(gd, f, -1));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {odNow.length ? <Tile tone="warn" label="Collection outstanding" value={baht(sumOut(odNow))} mom={<Mom cur={sumOut(odNow)} prev={odPrev.length ? sumOut(odPrev) : null} />} />
        : <Tile label="Collection outstanding" placeholder={q.isError ? "อ่านรายงานไม่ได้" : "รอ Cloud Sync seed"} />}
      {gNow != null ? <Tile label="Grade A/B %" value={`${gNow}%`} mom={<Mom cur={gNow} prev={gPrev} />} />
        : <Tile label="Grade A/B %" placeholder="รอ Cloud Sync seed" />}
      <Tile label="Signed MTD" value={String(cur.signed)} mom={<Mom cur={cur.signed} prev={prev.signed} />} />
      <Tile label="Won MTD" value={String(cur.won)} mom={<Mom cur={cur.won} prev={prev.won} />} />
      <Tile label="MRR" placeholder="รอนิยาม" />
      <Tile label="Churn" placeholder="รอ PS tab" />
      <Tile label="NPS" placeholder="รอ survey / meeting" />
      <Tile label="Pipeline health" placeholder="รอ PipeDrive" />
    </div>
  );
}

const GRADE_COLOR: Record<string, string> = { A: "var(--primary)", B: "var(--chart-2, var(--primary))", C: "var(--warning)", D: "var(--muted-foreground)" };

function AcTab() {
  const f = useContext(FilterCtx);
  const q = useAcViews();
  const navigate = useNavigate();
  const open = () => navigate({ to: "/ac/hotel-profile" });
  const v = useMemo(() => {
    const d = q.data;
    const s = (k: "v_ac_debtors" | "v_ac_invoices_breakdown" | "v_ac_invoice_ranking" | "v_ac_grade_distribution" | "v_ac_overdue" | "v_ac_suspended" | "v_ac_legal") => scope((d?.[k] ?? []) as Row[], f);
    return { debt: s("v_ac_debtors"), br: s("v_ac_invoices_breakdown"), rank: s("v_ac_invoice_ranking"), grade: s("v_ac_grade_distribution"), gradePrev: scope((d?.v_ac_grade_distribution ?? []) as Row[], f, -1), od: s("v_ac_overdue"), sus: s("v_ac_suspended"), legal: s("v_ac_legal") };
  }, [q.data, f]);
  if (q.isLoading) return <Empty text="กำลังโหลดรายงาน…" />;
  if (q.isError) return <Empty text="อ่านรายงาน AC ไม่ได้ — ลองโหลดหน้าใหม่" />;
  const outstanding = v.od.reduce((s, r) => s + num(r.outstanding), 0);
  const debtors = new Set(v.debt.map((r) => r.customer_id)).size;
  const cnt = (rows: Row[], k: RowKey = "customer_count") => rows.reduce((s, r) => s + num(r[k]), 0);
  const gradeAgg = ["A", "B", "C", "D"].map((g) => ({ g, n: cnt(v.grade.filter((r) => r.grade === g)), p: cnt(v.gradePrev.filter((r) => r.grade === g)) }));
  const gTotal = gradeAgg.reduce((s, x) => s + x.n, 0), pTotal = gradeAgg.reduce((s, x) => s + x.p, 0);
  const latest = [...new Set(v.rank.map((r) => String(r.billing_period)))].sort().at(-1);
  const ranks = v.rank.filter((r) => String(r.billing_period) === latest).sort((a, b) => num(b.amount) - num(a.amount));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="A · ลูกหนี้ & ภาพรวมใบแจ้งหนี้" subtitle="v_ac_debtors · v_ac_invoices_breakdown">
        <div className="grid grid-cols-2 gap-3"><Tile label="ยอดค้าง" value={baht(outstanding)} tone="warn" /><Tile label="# ลูกหนี้" value={String(debtors)} /></div>
        {v.br.length ? <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>กลุ่ม</th><th>ORM</th><th>Marcom</th></tr></thead><tbody>
          {["NEW", "EXISTING"].map((seg) => <tr key={seg} className="border-t"><td>{seg === "NEW" ? "ลูกค้าใหม่" : "ลูกค้าเดิม"}</td>{["ORM", "Marcom"].map((l) => <td key={l} className="tabular-nums">{cnt(v.br.filter((r) => r.customer_segment === seg && r.service_line === l), "invoice_count")}</td>)}</tr>)}
        </tbody></table> : <div className="mt-3"><Empty /></div>}
        {v.debt.length ? <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>ลูกค้า</th><th>บริการ</th><th>รอบ</th></tr></thead><tbody>
          {v.debt.slice(0, 20).map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}><td className="font-mono text-xs">{String(r.customer_id).slice(0, 8)}</td><td>{String(r.service_line)}</td><td>{String(r.billing_period).slice(0, 7)}</td></tr>)}
        </tbody></table> : null}
      </Panel>

      <Panel title="B · Payment Grade A–D" subtitle="v_ac_grade_distribution · คำนวณใน AC App (อ่านผลเท่านั้น)">
        {gTotal ? <div className="flex items-center gap-4">
          <div className="h-40 w-40"><ResponsiveContainer><PieChart><Pie data={gradeAgg.filter((x) => x.n)} dataKey="n" nameKey="g" innerRadius={40} outerRadius={70}>{gradeAgg.filter((x) => x.n).map((x) => <Cell key={x.g} fill={GRADE_COLOR[x.g]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <ul className="space-y-1 text-sm">{gradeAgg.map((x) => <li key={x.g} className="flex items-center gap-2"><b>{x.g}</b> {Math.round((x.n / gTotal) * 100)}% <Mom cur={Math.round((x.n / gTotal) * 100)} prev={pTotal ? Math.round((x.p / pTotal) * 100) : null} /></li>)}</ul>
        </div> : <Empty />}
      </Panel>

      <Panel title="C · Collection" subtitle="v_ac_overdue · v_ac_suspended · v_ac_legal (PAUSED ไม่นับเป็น SUSPENDED)">
        <div className="grid grid-cols-3 gap-3">
          <Tile tone="warn" label="ค้างชำระ" value={v.od.length ? `${baht(outstanding)} / ${cnt(v.od)}` : "—"} />
          <Tile tone="warn" label="SUSPENDED" value={v.sus.length ? String(cnt(v.sus)) : "—"} />
          <Tile tone="warn" label="LEGAL" value={v.legal.length ? String(cnt(v.legal)) : "—"} />
        </div>
        {!v.od.length && !v.sus.length && !v.legal.length ? <div className="mt-3"><Empty /></div> :
          <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>รอบ</th><th>บริการ</th><th>ลูกค้า</th><th>ยอดค้าง</th></tr></thead><tbody>
            {v.od.map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}><td>{String(r.billing_period).slice(0, 7)}</td><td>{String(r.service_line)}</td><td>{num(r.customer_count)}</td><td><Chip tone="warn">{baht(num(r.outstanding))}</Chip></td></tr>)}
          </tbody></table>}
      </Panel>

      <Panel title="D · Invoice Ranking" subtitle={`v_ac_invoice_ranking${latest ? " · รอบ " + latest.slice(0, 7) : ""}`}>
        {ranks.length ? <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>#</th><th>โรงแรม</th><th>ยอด</th><th>ΔMoM</th><th>เฉลี่ย</th></tr></thead><tbody>
          {ranks.slice(0, 20).map((r, i) => <tr key={i} className="cursor-pointer border-t hover:bg-muted" onClick={open}>
            <td>{num(r.rank)}</td><td className="font-mono text-xs">{String(r.hotel_id).slice(0, 8)}</td><td className="tabular-nums">{baht(num(r.amount))}</td>
            <td>{r.previous_month_rank == null ? <span className="text-xs text-muted-foreground">— / รอสะสม</span> : <Mom cur={num(r.previous_month_rank)} prev={num(r.rank)} />}</td>
            <td className="tabular-nums">{r.lifetime_average_rank == null ? "—" : num(r.lifetime_average_rank).toFixed(1)}</td></tr>)}
        </tbody></table> : <Empty />}
      </Panel>

      <Panel title="E · ORM System Fee" subtitle="v_ac_system_fee">
        <Tile label="ค่าระบบ ORM" placeholder="รอ email ingestion" />
      </Panel>
    </div>
  );
}
