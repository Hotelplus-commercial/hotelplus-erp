/* PS Dashboard · BD-AC tab v1.0 — read-only analytics over the Contract Dashboard entity.
 * Never advances stages; row clicks only navigate to the existing Contract Dashboard card. */
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, LockKeyhole, Minus, Triangle } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import {
  LINE_LABEL, STAGE_LABEL, bdacLine, filterLine, monthRange, quantiles,
  v_bdac_conversion_cohort, v_bdac_cycle_time, v_bdac_deal_aging, v_bdac_diagnostic_bin, v_bdac_flow, v_bdac_stage_current,
  type LineFilter, type Range,
} from "@/lib/bdac-views";
import type { ContractLifecycle } from '@/lib/contract-lifecycle';
import { periodRange, selectedPeriod, useDashboardGlobal, type GlobalFilter } from '@/lib/ps-dashboard-global';
import { cn } from "@/lib/utils";

const RANGES = { mtd: "เดือนนี้", "3m": "3 เดือน", "6m": "6 เดือน", all: "ทั้งหมด" } as const;
type RangeKey = keyof typeof RANGES;
const rangeOf = (k: RangeKey): Range => {
  if (k === "all") return { from: 0, to: Date.now() + 86_400_000 };
  if (k === "mtd") return monthRange(0);
  const m = k === "3m" ? -2 : -5;
  return { from: monthRange(m).from, to: monthRange(0).to };
};
const owner = (id: string | null | undefined) => (id ? id.split("@")[0] ?? "—" : "—");
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

function Section({ n, title, sub, children, className }: { n: string; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  const { demo } = useDashboardGlobal();
  return <section className={cn("bdac-section min-w-0", className)}>
    <div className="flex items-center gap-2"><span className="bdac-section-number">{n}</span><h3>{title}{demo ? " · DEMO" : ""}</h3></div>
    {sub && <p className="bdac-caption mt-1">{sub}</p>}
    <div className="mt-5">{children}</div>
  </section>;
}
const Pending = () => <span className="bdac-pending"><LockKeyhole className="size-3" />รอ PipeDrive sync</span>;

function Mom({ cur, prev }: { cur: number; prev: number }) {
  const I = cur > prev ? Triangle : cur < prev ? Triangle : Minus;
  return <span className={cn("bdac-caption inline-flex items-center gap-1.5", cur > prev && "bdac-positive")}>
    <I className={cn("size-3", cur < prev && "rotate-180")} />{prev} เดือนก่อน
  </span>;
}

/** Headline KPI contribution — existing counts only; no fabricated monthly series. */
export function BdacHeadline() {
  const { lifecycles } = useContractLifecycle();
  const cur = v_bdac_flow(lifecycles, monthRange(0));
  const prev = v_bdac_flow(lifecycles, monthRange(-1));
  return <div className="bdac-theme grid gap-4 sm:grid-cols-2">
    {[["สัญญาที่ลงนามเดือนนี้", "Signed MTD", cur.signed, prev.signed], ["ดีลที่ชนะเดือนนี้", "Won MTD", cur.won, prev.won]].map(([label, en, c, p]) => (
      <div key={label as string} className="bdac-kpi">
        <div><p className="bdac-caption">{en}</p><h3 className="mt-1 text-sm font-medium">{label}</h3></div>
        <div className="mt-4 flex items-end justify-between gap-3"><span className="bdac-number">{c}</span><Mom cur={c as number} prev={p as number} /></div>
      </div>
    ))}
  </div>;
}

function OwnerCell({ id }: { id: string | null | undefined }) {
  const name = owner(id);
  return <span className="inline-flex items-center gap-2 whitespace-nowrap">
    {id && <span className="bdac-avatar">{name.split(/[. _-]/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>}{name}
  </span>;
}

export function BdacTab({ source, globalFilter, clock }: { source?: ContractLifecycle[]; globalFilter?: GlobalFilter; clock?: number }) {
  const { lifecycles } = useContractLifecycle();
  const navigate = useNavigate();
  const [line, setLine] = useState<LineFilter>("ALL");
  const [rk, setRk] = useState<RangeKey>("6m");
  const [cycle, setCycle] = useState<"7_8" | "8_9">("7_8");
  const [byOwner, setByOwner] = useState(false);
  const range = globalFilter ? periodRange(selectedPeriod(globalFilter,new Date(clock ?? Date.now()))) : rangeOf(rk);
  const rows = useMemo(() => source ?? filterLine(lifecycles, line), [source,lifecycles,line]);

  const flow = v_bdac_flow(rows, range);
  const cohort = v_bdac_conversion_cohort(rows, range).total;
  const current = v_bdac_stage_current(rows,clock);
  const cycleRows = v_bdac_cycle_time(rows, range, cycle);
  const aging = v_bdac_deal_aging(rows,clock);
  const bin = v_bdac_diagnostic_bin();
  const groups = byOwner ? [...new Set(cycleRows.map((c) => c.bd_owner_id))] : ["__all"];

  const pct = (n: number) => (cohort.cohort_size ? Math.round((n / cohort.cohort_size) * 100) : 0);
  const { demo } = useDashboardGlobal();
  const open = (id: string) => !demo && void navigate({ to: "/ps/contract-dashboard", hash: `contract-card-${id}` });

  const stageRows = [6, 7, 8, 9, 10].map((stage) => ({ stage, cards: current.filter((c) => c.stage === stage) }));
  const approvedCards = stageRows[0]?.cards ?? [];
  const setupCards = stageRows[3]?.cards ?? [];
  const stageDays = quantiles(approvedCards.flatMap((c) => c.days_in_stage == null ? [] : [c.days_in_stage]));
  const maxAging = Math.max(1, ...aging.map((a) => a.days_in_stage ?? 0));
  const flowSegments = [
    { label: "Approved QT", thai: "อนุมัติใบเสนอราคา", count: flow.approved },
    { label: "Contract Sent", thai: "ส่งสัญญา", count: flow.contract_sent },
    { label: "Signed", thai: "ลงนามสัญญา", count: flow.signed },
    { label: "Won", thai: "ชนะดีล", count: flow.won },
  ];

  return (
    <div className="bdac-theme bdac-dashboard">
      {!globalFilter && <div className="bdac-filterbar">
        <div className="bdac-segmented" role="group" aria-label="บริการ">
          {(["ALL", "ORM", "MARCOM", "NONE"] as LineFilter[]).map((f) => (
            <Button key={f} variant="ghost" size="sm" aria-pressed={line === f} onClick={() => setLine(f)} className="bdac-segment">
              {f === "ALL" ? "All" : f === "NONE" ? "ไม่ระบุบริการ" : LINE_LABEL(f)}
            </Button>
          ))}
        </div>
        <Select value={rk} onValueChange={(v) => setRk(v as RangeKey)}>
          <SelectTrigger aria-label="ช่วงเวลา" className="h-9 w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <span className="bdac-caption sm:ml-auto">นับต่อดีล · ดีลเก่าที่ไม่มี timestamp ไม่ถูกนับ</span>
      </div>}

      <Section n="01" title="Flow stats" sub="จำนวนเหตุการณ์ในช่วงที่เลือก (ต่อดีล)">
        <div className="bdac-chart-scroll">
          <div className="bdac-funnel">
            <div className="bdac-funnel-pending"><p className="bdac-caption">QT Sent</p><span className="bdac-number">—</span><span className="bdac-caption">รอ sync</span></div>
            {flowSegments.map((segment) => <div key={segment.label} className="bdac-funnel-step" style={{ flexGrow: segment.count }}>
              <ChevronRight className="bdac-connector size-4" />
              <div className={cn("bdac-funnel-fill", segment.count === 0 && "bdac-funnel-zero")}>
                <p className="bdac-caption">{segment.label}</p><span className="bdac-number">{segment.count}</span><p className="text-xs">{segment.thai}</p>
              </div>
              {segment.label === "Won" && <p className="bdac-caption mt-2">↳ {flow.won_hotels} โรงแรม (distinct)</p>}
            </div>)}
          </div>
        </div>
      </Section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Section n="02" title="Conversion cohort" sub="Cohort ตามเดือน Approved QT (anchor = 100%)">
          <div className="space-y-5">
            {[["Approved", 100], ["Signed", pct(cohort.signed_count)], ["Won", pct(cohort.won_count)]].map(([l, p]) => (
              <div key={l as string} className="grid grid-cols-[76px_1fr_44px] items-center gap-3 text-sm">
                <span>{l}</span><div className="bdac-track"><div className="bdac-bar" style={{ width: `${p}%` }} /></div><span className="text-right font-semibold">{p}%</span>
              </div>
            ))}
          </div>
          <p className="bdac-caption mt-6">Cohort {cohort.cohort_size} ดีล · ยังเปิดอยู่ {cohort.still_open_count} ดีล (ไม่ตี Lost)</p>
        </Section>
        <Section n="03" title="Diagnostic bin" sub="stage 3 / 4 / 5">
          <ul className="space-y-3">{["Follow up QT", "Special Deal", "Pending"].map((l) => (
            <li key={l} className="bdac-ghost-row"><span>{l}</span>{bin.pending_sync && <Pending />}</li>
          ))}</ul>
        </Section>
      </div>

      <Section n="04" title="Work in progress" sub="Snapshot ปัจจุบัน stage 6–10">
        <div className="bdac-stacked" aria-label="จำนวนดีลแยกตาม stage">
          {stageRows.map(({ stage, cards }, i) => cards.length > 0 && <div key={stage} className={`bdac-stage-color-${i}`} style={{ flexGrow: cards.length }} title={`${STAGE_LABEL[stage]}: ${cards.length} ดีล`}>{cards.length}</div>)}
          {!current.length && <span className="bdac-caption px-3">ไม่มีดีล</span>}
        </div>
        <div className="bdac-stage-legend">
          {stageRows.map(({ stage, cards }, i) => <div key={stage} className="flex items-start gap-2">
            <span className={`bdac-legend-dot bdac-stage-color-${i}`} /><div><p className="bdac-caption">{stage} · {STAGE_LABEL[stage]}</p><p className="mt-1 font-semibold">{cards.length} <span className="bdac-caption">ดีล</span></p></div>
          </div>)}
        </div>
        <div className="bdac-substeps">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Approved-QT sub-steps</p><p className="bdac-caption">median {fmt(stageDays?.median ?? null)} วันใน stage</p></div>
          <div className="flex flex-wrap gap-2">
            {[["Draft", "Draft"], ["Req INV", "Request Invoice"], ["Cust ID", "Create Customer ID"], ["Hotel ID", "Create Hotel ID"], ["INV", "Create Invoice"], ["Live Link", "Live Link Sent"]].map(([label, sub]) => {
              const count = approvedCards.filter((c) => c.substep === sub).length;
              return <span key={sub} title={sub} className={cn("bdac-step-chip", count > 0 && "bdac-step-chip-active")}>{label}<b>{count}</b></span>;
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <span className="bdac-caption">Set up fee · AND</span>
          <span className="inline-flex items-center gap-2"><Check className="bdac-check size-4" />Payment Complete: <b>{setupCards.filter((c) => c.deal.current_stage === 9).length}</b></span>
          <span className="inline-flex items-center gap-2"><span className="bdac-check grid size-4 place-items-center">⋯</span>AC Checking Payment: <b>{setupCards.filter((c) => c.deal.current_stage === 10).length}</b></span>
        </div>
      </Section>

      <Section n="05" title="Cycle time" sub="Median + IQR (ไม่ใช้ค่าเฉลี่ย) · ข้ามดีลที่ไม่มี timestamp">
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="bdac-segmented" role="group" aria-label="ช่วง Cycle time">
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={cycle === "7_8"} onClick={() => setCycle("7_8")}>7→8 Signed</Button>
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={cycle === "8_9"} onClick={() => setCycle("8_9")}>8→9 Paid</Button>
          </div>
          <div className="bdac-segmented" role="group" aria-label="แยกตามผู้ดูแล">
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={!byOwner} onClick={() => setByOwner(false)}>All</Button>
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={byOwner} onClick={() => setByOwner(true)}>by BD owner</Button>
          </div>
        </div>
        {!cycleRows.length ? <div className="bdac-empty-chart"><div className="bdac-empty-axis" /><p className="bdac-caption">ยังไม่มีดีลที่ครบช่วงนี้ในระยะที่เลือก</p></div> : (
          <div className={cn("grid gap-5", byOwner && "lg:grid-cols-2")}>
            {groups.map((g, groupIndex) => {
              const pts = cycleRows.filter((c) => g === "__all" || c.bd_owner_id === g).map((c) => ({ x: new Date(c.completed_at).getTime(), y: +c.days.toFixed(2), hotel: c.hotel }));
              const q = quantiles(pts.map((p) => p.y));
              if (!q) return null;
              const ownerColor = `var(--bdac-owner-${groupIndex % 5})`;
              return <div key={g} className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold">{byOwner && <span className="bdac-legend-dot" style={{ background: ownerColor }} />}{g === "__all" ? "All" : owner(g)}</span>
                  <span className="bdac-stat-chip">n={q.n}</span><span className="bdac-stat-chip">Median {fmt(q.median)} วัน</span><span className="bdac-stat-chip">IQR {fmt(q.q1)}–{fmt(q.q3)}</span>
                </div>
                <div className="bdac-chart-scroll"><div className="bdac-scatter">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 12, right: 20, bottom: 16, left: 0 }}>
                      <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="x" name="วันที่เสร็จ" type="number" domain={["auto", "auto"]} tickFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="y" name="ระยะเวลา" unit=" วัน" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={56} domain={[0, "auto"]} />
                      <ReferenceArea y1={q.q1} y2={q.q3} fill="var(--accent-soft)" fillOpacity={1} />
                      <ReferenceLine y={q.median} stroke="var(--bdac-accent)" strokeWidth={2} />
                      <Tooltip cursor={{ stroke: "var(--border-subtle)" }} content={({ active, payload }) => {
                        const point = payload?.[0]?.payload as { hotel?: string; x?: number; y?: number } | undefined;
                        return active && point ? <div className="bdac-tooltip"><b>{point.hotel}</b><p>{point.x ? new Date(point.x).toLocaleDateString("th-TH") : ""} · {point.y} วัน</p></div> : null;
                      }} />
                      <Scatter data={pts} fill={byOwner ? ownerColor : "var(--neutral-bar)"} />
                      {!byOwner && <Scatter data={pts.filter((p) => Math.abs(p.y - q.median) <= (q.q3 - q.q1) / 2)} fill="var(--bdac-accent)" />}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div></div>
              </div>;
            })}
          </div>
        )}
      </Section>

      <Section n="06" title="Aging deals" sub="ดีลที่เปิดอยู่ stage 6–9 เรียงตามวันรอมากสุด">
        <div className="bdac-table-scroll">
          <table className="bdac-table w-full text-sm">
            <thead><tr>{["Deal", "Service", "Stage", "Sub-step", "Days waiting", "BD owner", "AC owner"].map((h) => <th key={h} className={h === "Days waiting" ? "text-right" : "text-left"}>{h}</th>)}</tr></thead>
            <tbody>
              {aging.map((a) => <tr key={a.deal.id} onClick={() => open(a.deal.id)}>
                <td><Button variant="link" className="bdac-deal-link h-auto p-0 text-left" onClick={(e) => { e.stopPropagation(); open(a.deal.id); }}>{a.deal.hotel_name}</Button><p className="bdac-caption mt-1 font-mono">{a.deal.quote_id}</p></td>
                <td>{LINE_LABEL(bdacLine(a.deal))}</td><td>{a.stage} · {STAGE_LABEL[a.stage]}</td><td>{a.substep ?? "—"}</td>
                <td className="text-right"><div className="bdac-aging-number">{a.days_in_stage != null && <span className="bdac-aging-bar" style={{ width: `${(a.days_in_stage / maxAging) * 100}%` }} />}<b className="relative">{a.days_in_stage == null ? "—" : Math.floor(a.days_in_stage)}</b></div></td>
                <td><OwnerCell id={a.deal.bd_owner_id} /></td><td><OwnerCell id={a.deal.ac_owner_id} /></td>
              </tr>)}
              {!aging.length && <tr><td colSpan={7} className="p-6 text-center bdac-caption">ไม่มีดีลค้าง</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
