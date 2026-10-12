/* PS Dashboard · BD-AC tab v1.0 — read-only analytics over the Contract Dashboard entity.
 * Never advances stages; row clicks only navigate to the existing Contract Dashboard card. */
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, Minus } from "lucide-react";
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
import { cn } from "@/lib/utils";

const RANGES = { mtd: "เดือนนี้", "3m": "3 เดือน", "6m": "6 เดือน", all: "ทั้งหมด" } as const;
type RangeKey = keyof typeof RANGES;
const rangeOf = (k: RangeKey): Range => {
  if (k === "all") return { from: 0, to: Date.now() + 86_400_000 };
  if (k === "mtd") return monthRange(0);
  const m = k === "3m" ? -2 : -5;
  return { from: monthRange(m).from, to: monthRange(0).to };
};
const owner = (id: string | null | undefined) => (id ? id.split("@")[0] : "—");
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

function Section({ n, title, sub, children, className }: { n: string; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card-elevated p-4", className)}>
      <h3 className="text-sm font-semibold"><span className="mr-1.5 text-muted-foreground">{n}</span>{title}</h3>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
const Pending = () => <span className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">รอ PipeDrive sync</span>;

function Mom({ cur, prev }: { cur: number; prev: number }) {
  const I = cur > prev ? ArrowUp : cur < prev ? ArrowDown : Minus;
  return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><I className="size-3" />{prev} เดือนก่อน</span>;
}

/** Headline KPI contribution — counts only, no ฿. */
export function BdacHeadline() {
  const { lifecycles } = useContractLifecycle();
  const cur = v_bdac_flow(lifecycles, monthRange(0));
  const prev = v_bdac_flow(lifecycles, monthRange(-1));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[["Contract Signed MTD", cur.signed, prev.signed, "leading"], ["Won MTD", cur.won, prev.won, "lagging"]].map(([l, c, p, h]) => (
        <div key={l as string} className="card-elevated p-4">
          <p className="text-xs text-muted-foreground">{l} · {h}</p>
          <div className="mt-1 flex items-baseline gap-2"><span className="font-display text-2xl font-bold">{c}</span><Mom cur={c as number} prev={p as number} /></div>
        </div>
      ))}
    </div>
  );
}

export function BdacTab() {
  const { lifecycles } = useContractLifecycle();
  const navigate = useNavigate();
  const [line, setLine] = useState<LineFilter>("ALL");
  const [rk, setRk] = useState<RangeKey>("6m");
  const [cycle, setCycle] = useState<"7_8" | "8_9">("7_8");
  const [byOwner, setByOwner] = useState(false);
  const range = rangeOf(rk);
  const rows = useMemo(() => filterLine(lifecycles, line), [lifecycles, line]);

  const flow = v_bdac_flow(rows, range);
  const cohort = v_bdac_conversion_cohort(rows, range).total;
  const current = v_bdac_stage_current(rows);
  const cycleRows = v_bdac_cycle_time(rows, range, cycle);
  const aging = v_bdac_deal_aging(rows);
  const bin = v_bdac_diagnostic_bin();
  const groups = byOwner ? [...new Set(cycleRows.map((c) => c.bd_owner_id))] : ["__all"];

  const pct = (n: number) => (cohort.cohort_size ? Math.round((n / cohort.cohort_size) * 100) : 0);
  const open = (id: string) => void navigate({ to: "/ps/contract-dashboard", hash: `contract-card-${id}` });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border p-0.5">
          {(["ALL", "ORM", "MARCOM", "NONE"] as LineFilter[]).map((f) => (
            <button key={f} onClick={() => setLine(f)} className={cn("rounded-md px-3 py-1 text-xs font-medium", line === f ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {f === "ALL" ? "All" : f === "NONE" ? "ไม่ระบุบริการ" : LINE_LABEL(f)}
            </button>
          ))}
        </div>
        <Select value={rk} onValueChange={(v) => setRk(v as RangeKey)}>
          <SelectTrigger className="h-8 w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">นับต่อดีล · ดีลเก่าที่ไม่มี timestamp ไม่ถูกนับ</span>
      </div>

      <Section n="①" title="Flow stats" sub="จำนวนเหตุการณ์ในช่วงที่เลือก (ต่อดีล)">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex min-w-28 flex-1 flex-col justify-between rounded-lg border border-dashed bg-muted/30 p-3 opacity-70">
            <p className="text-xs text-muted-foreground">QT Sent</p><Pending />
          </div>
          <div className="grid place-items-center rounded-md border border-dashed px-2 text-[10px] text-muted-foreground">2→6<br />placeholder</div>
          {[["Approved QT", flow.approved], ["Contract Sent", flow.contract_sent], ["Signed", flow.signed], ["Won", flow.won]].map(([l, v], i) => (
            <div key={l as string} className="flex min-w-28 flex-1 items-center gap-2">
              {i > 0 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
              <div className="flex-1 rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="font-display text-2xl font-bold">{v}</p>
                {l === "Won" && <p className="text-[11px] text-muted-foreground">↳ {flow.won_hotels} hotels (distinct)</p>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section n="②" title="Conversion" sub="Cohort ตามเดือน Approved QT (anchor = 100%)">
          {[["Approved", 100], ["Signed", pct(cohort.signed_count)], ["Won", pct(cohort.won_count)]].map(([l, p]) => (
            <div key={l as string} className="mb-2">
              <div className="flex justify-between text-xs"><span>{l}</span><span className="font-semibold">{p}%</span></div>
              <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${p}%` }} /></div>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Cohort {cohort.cohort_size} ดีล · ยังเปิดอยู่ {cohort.still_open_count} ดีล (ไม่ตี Lost)</p>
        </Section>
        <Section n="③" title="Diagnostic bin" sub="stage 3 / 4 / 5">
          <ul className="space-y-2">
            {["Follow up QT", "Special Deal", "Pending"].map((l) => (
              <li key={l} className="flex items-center justify-between rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground">{l}{bin.pending_sync && <Pending />}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section n="④" title="Work in progress" sub="Snapshot ปัจจุบัน stage 6–10">
        <ul className="divide-y">
          {[6, 7, 8, 9, 10].map((s) => {
            const cs = current.filter((c) => c.stage === s);
            const d = quantiles(cs.flatMap((c) => (c.days_in_stage == null ? [] : [c.days_in_stage])));
            return (
              <li key={s} className="py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{s} · {STAGE_LABEL[s]}</span>
                  <span className="text-xs text-muted-foreground"><b className="text-base text-foreground">{cs.length}</b> ดีล{s === 6 && ` · median ${fmt(d?.median ?? null)} วันใน stage`}</span>
                </div>
                {s === 6 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["Draft", "Request Invoice", "Create Customer ID", "Create Hotel ID", "Create Invoice", "Live Link Sent"].map((sub) => (
                      <span key={sub} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{sub}: {cs.filter((c) => c.substep === sub).length}</span>
                    ))}
                  </div>
                )}
                {s === 9 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-muted px-2 py-0.5">Payment Complete: {cs.filter((c) => c.deal.current_stage === 9).length}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5">AC Checking Payment: {cs.filter((c) => c.deal.current_stage === 10).length}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section n="⑤" title="Cycle time" sub="Median + IQR (ไม่ใช้ค่าเฉลี่ย) · ข้ามดีลที่ไม่มี timestamp">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant={cycle === "7_8" ? "default" : "outline"} onClick={() => setCycle("7_8")}>7→8 Signed</Button>
          <Button size="sm" variant={cycle === "8_9" ? "default" : "outline"} onClick={() => setCycle("8_9")}>8→9 Paid</Button>
          <span className="mx-1 w-px bg-border" />
          <Button size="sm" variant={!byOwner ? "secondary" : "ghost"} onClick={() => setByOwner(false)}>All</Button>
          <Button size="sm" variant={byOwner ? "secondary" : "ghost"} onClick={() => setByOwner(true)}>by BD owner</Button>
        </div>
        {!cycleRows.length ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">ยังไม่มีดีลที่ครบช่วงนี้ในระยะที่เลือก</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => {
              const pts = cycleRows.filter((c) => g === "__all" || c.bd_owner_id === g).map((c) => ({ x: new Date(c.completed_at).getTime(), y: +c.days.toFixed(2), hotel: c.hotel }));
              const q = quantiles(pts.map((p) => p.y))!;
              return (
                <div key={g}>
                  <p className="mb-1 text-xs"><b>{g === "__all" ? "All" : owner(g)}</b> · n={q.n} · median {fmt(q.median)} วัน · IQR {fmt(q.q1)}–{fmt(q.q3)}</p>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="x" type="number" domain={["auto", "auto"]} tickFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="y" tick={{ fontSize: 10 }} />
                        <ReferenceArea y1={q.q1} y2={q.q3} fill="var(--primary)" fillOpacity={0.08} />
                        <ReferenceLine y={q.median} stroke="var(--primary)" strokeDasharray="4 2" />
                        <Tooltip formatter={(v) => [`${v} วัน`, "days"]} labelFormatter={() => ""} />
                        <Scatter data={pts} fill="var(--primary)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section n="⑥" title="Aging deals" sub="ดีลที่เปิดอยู่ stage 6–9 เรียงตามวันรอมากสุด · คลิกเพื่อเปิดการ์ดใน Contract Dashboard">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>{["Deal", "Service", "Stage", "Sub-step", "Days waiting", "BD owner", "AC owner"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {aging.map((a) => (
                <tr key={a.deal.id} onClick={() => open(a.deal.id)} className="cursor-pointer hover:bg-muted/50">
                  <td className="px-2 py-2"><p className="font-medium">{a.deal.hotel_name}</p><p className="font-mono text-[11px] text-muted-foreground">{a.deal.quote_id}</p></td>
                  <td className="px-2 py-2">{LINE_LABEL(bdacLine(a.deal))}</td>
                  <td className="px-2 py-2">{a.stage} · {STAGE_LABEL[a.stage]}</td>
                  <td className="px-2 py-2">{a.substep ?? "—"}</td>
                  <td className="px-2 py-2 font-semibold">{a.days_in_stage == null ? "—" : Math.floor(a.days_in_stage)}</td>
                  <td className="px-2 py-2">{owner(a.deal.bd_owner_id)}</td>
                  <td className="px-2 py-2">{owner(a.deal.ac_owner_id)}</td>
                </tr>
              ))}
              {!aging.length && <tr><td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">ไม่มีดีลค้าง</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
