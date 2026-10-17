/* PS Dashboard · BD-AC tab v2.0 — Visual Standard rebuild over the existing Contract Dashboard entity.
 * Read-only except createTask(CONTRACT_FOLLOWUP). Never advances stages; row clicks only navigate
 * to the existing Contract Dashboard card. Median only — no average, no IQR on this tab. */
import { useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartHint, ChartTooltip, DashCard, SummaryNote } from "@/components/ps/dash-card";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import {
  LINE_LABEL, STAGE_LABEL, bdacConfig, bdacLine, cycleAgg, cycleLegLimit, filterLine, monthRange, thaiMonth, thaiShort,
  v_bdac_conversion_cohort, v_bdac_carry, v_bdac_cycle_time, v_bdac_deal_aging, v_bdac_diagnostic_bin, v_bdac_flow, v_bdac_stage_current,
  type CycleLeg, type LineFilter, type Range, type SlaTone,
} from "@/lib/bdac-views";
import type { ContractLifecycle } from "@/lib/contract-lifecycle";
import { periodRange, selectedPeriod, useDashboardGlobal, type GlobalFilter } from "@/lib/ps-dashboard-global";
import { summaryRules } from "@/lib/summaryRules";
import { STATUS_TH, createTask, useTickets } from "@/lib/tickets-l0";
import { cn } from "@/lib/utils";

const RANGES = { mtd: "เดือนนี้", "3m": "3 เดือน", "6m": "6 เดือน", all: "ทั้งหมด" } as const;
type RangeKey = keyof typeof RANGES;
const rangeOf = (k: RangeKey, now: number): Range => {
  if (k === "all") return { from: 0, to: now + 86_400_000 };
  if (k === "mtd") return monthRange(0, now);
  const m = k === "3m" ? -2 : -5;
  return { from: monthRange(m, now).from, to: monthRange(0, now).to };
};
/** Previous comparison period: month-aligned ranges compare the same day window of the previous month; others shift by equal length. */
const prevOf = (r: Range, now: number): Range => {
  const d = new Date(r.from);
  if (d.getDate() === 1 && d.getHours() === 0) {
    const pFrom = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    return { from: pFrom, to: pFrom + Math.min(r.to - r.from, now - r.from + 86_400_000) };
  }
  return { from: r.from - (r.to - r.from), to: r.from };
};
const owner = (id: string | null | undefined) => (id ? (id.includes("@") ? (id.split("@")[0] ?? id) : id) : "—");
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const fmtD = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const TONE_PILL: Record<Exclude<SlaTone, null>, string> = {
  ok: "bg-[#E2F1F2] text-[#0E7C86]",
  amber: "bg-[#FBF3E4] text-[#A86B00]",
  red: "bg-[#FBEDE9] text-[#A63E29]",
};
const TONE_DOT: Record<Exclude<SlaTone, null>, string> = { ok: "#0E7C86", amber: "#D9A13B", red: "#C8553D" };

const FLOW_DEF: Record<string, string> = {
  "Approved QT": "ดีลที่ Approved QT ในช่วง",
  "Sent Contract": "ดีลที่ส่งสัญญา (Live Link) ในช่วง",
  "Contract Signed": "ดีลที่ลูกค้าเซ็นในช่วง",
  "Set up fee": "ดีลที่ชำระ Set up fee ในช่วง",
  WON: "เซ็น + ชำระ + AC ออกใบเสร็จ/ใบกำกับภาษี",
};

function DeltaLine({ cur, prev, label }: { cur: number; prev: number | null; label: string }) {
  if (prev == null) return null;
  const d = cur - prev;
  return (
    <span className={cn("text-xs font-medium", d > 0 ? "text-[#1F7A6E]" : d < 0 ? "text-[#A86B00]" : "text-muted-foreground")}>
      {d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : "— คงที่"} จาก {label}
    </span>
  );
}

/** §3.1 Definitions strip. */
function DefinitionsStrip() {
  const sla = bdacConfig.bdac_sla_config;
  const stages = ["Sent QT", "Approved QT", "Sent Contract", "Contract Signed", "Set up fee", "WON"];
  return (
    <div className="rounded-[14px] border bg-card px-[18px] py-[14px]">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 font-semibold text-muted-foreground">Stage:</span>
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-medium",
                s === "Sent QT" && "border-dashed border-[#C9D3D8] text-muted-foreground",
                i > 0 && i < 5 && "border-transparent bg-[#E2F1F2] text-[#0E7C86]",
                s === "WON" && "border-transparent bg-[#0A5E66] font-bold text-white",
              )}
            >
              {s}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
        <span><b className="text-[#0A5E66]">WON</b> = เซ็นสัญญา + ชำระ Set up fee + AC ออกใบเสร็จรับเงิน/ใบกำกับภาษี</span>
        <span>SLA ช่วงละ ≤ {sla.approved_to_sent} วัน: Approved QT → Sent Contract · Sent Contract → Contract Signed · Contract Signed → WON</span>
        <span className="ml-auto flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-[#0E7C86]" />On-time (≤ {sla.approved_to_sent} วัน)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-[#C8553D]" />เกิน SLA (&gt; {sla.approved_to_sent} วัน)</span>
        </span>
      </div>
    </div>
  );
}

/** 100% stacked on-time/over bar (40px), labels inside segments. */
function SlaBar({ on, amber, over, big = false }: { on: number; amber: number; over: number; big?: boolean }) {
  const total = on + over;
  if (!total) return <div className="grid h-10 place-items-center rounded-[10px] bg-[#EEF4F5] text-xs text-muted-foreground">ไม่มีดีล</div>;
  const onPct = (on / total) * 100;
  return (
    <ChartHint header={`ดีลค้าง ${total} ดีล`} lines={[`On-time ${on} (${pct(on, total)}%) · ครบ 2 วันวันนี้ ${amber}`, `เกิน SLA ${over} (${pct(over, total)}%)`]}>
      <div className="flex h-10 w-full cursor-default gap-[3px]" aria-label={undefined}>
        {on > 0 && (
          <div
            className={cn("flex items-center overflow-hidden bg-[#0E7C86] pl-3 text-[12.5px] font-bold text-white", over === 0 ? "rounded-[10px]" : "rounded-l-[10px]")}
            style={{ width: `${onPct}%` }}
          >
            {big ? `On-time ${on} ดีล (${pct(on, total)}%)` : `${on} ดีล (${pct(on, total)}%)`}
          </div>
        )}
        {over > 0 && (
          <div
            className={cn("flex items-center justify-end overflow-hidden bg-[#C8553D] pr-3 text-[12.5px] font-bold text-white", on === 0 ? "rounded-[10px]" : "rounded-r-[10px]")}
            style={{ width: `${100 - onPct}%` }}
          >
            {big ? `เกิน SLA ${over} ดีล (${pct(over, total)}%)` : `${over} ดีล (${pct(over, total)}%)`}
          </div>
        )}
      </div>
    </ChartHint>
  );
}

const OWNER_COLORS = ["#0E7C86", "#6E62B6", "#3D4D55", "#D9A13B", "#C8553D", "#8A9AA2"];

export function BdacTab({ source, globalFilter, clock }: { source?: ContractLifecycle[]; globalFilter?: GlobalFilter; clock?: number }) {
  const { lifecycles } = useContractLifecycle();
  const navigate = useNavigate();
  const tickets = useTickets();
  const [line, setLine] = useState<LineFilter>("ALL");
  const [rk, setRk] = useState<RangeKey>("mtd");
  const [leg, setLeg] = useState<CycleLeg>("SENT_TO_SIGNED");
  const [byOwner, setByOwner] = useState(false);
  const now = clock ?? Date.now();
  const range = globalFilter ? periodRange(selectedPeriod(globalFilter, new Date(now))) : rangeOf(rk, now);
  const prev = prevOf(range, now);
  const rows = useMemo(() => source ?? filterLine(lifecycles, line), [source, lifecycles, line]);
  const { demo } = useDashboardGlobal();
  const isPm = globalFilter?.role === "PM";
  const svcFiltered = globalFilter && globalFilter.service !== "ALL" ? globalFilter.service : null;

  const flow = v_bdac_flow(rows, range, prev);
  const current = useMemo(() => v_bdac_stage_current(rows, now).filter((x) => x.stage >= 6 && x.stage <= 9), [rows, now]);
  const wip = current.filter((x) => x.is_on_time !== null);
  const cohort = useMemo(() => v_bdac_conversion_cohort(rows, now), [rows, now]);
  const [selCohort, setSelCohort] = useState<string | null>(null);
  const selected = cohort.find((c) => c.month === selCohort) ?? cohort[cohort.length - 2] ?? cohort[0];
  const carry = useMemo(() => v_bdac_carry(rows, tickets, now), [rows, tickets, now]);
  const cycleRows = useMemo(() => v_bdac_cycle_time(rows, range, leg), [rows, range, leg]);
  const agg = cycleAgg(cycleRows);
  const aging = useMemo(() => v_bdac_deal_aging(rows, now), [rows, now]);
  const bin = v_bdac_diagnostic_bin();

  const open = (id: string) => !demo && void navigate({ to: "/ps/contract-dashboard", hash: `contract-card-${id}` });
  const prevLabel = range.to - range.from > 32 * 86_400_000 ? "ช่วงก่อนหน้า" : (thaiMonth(new Date(prev.from).toISOString().slice(0, 7)).split(" ")[0] ?? "");
  const rangeLabel = `${thaiShort(new Date(range.from).toISOString())} – ${thaiShort(new Date(range.to - 1).toISOString())}`;

  /* ② numbers */
  const onN = wip.filter((x) => x.is_on_time).length;
  const amberN = wip.filter((x) => x.sla_tone === "amber").length;
  const overN = wip.length - onN;
  const onPct = pct(onN, wip.length);
  const worstStage = [6, 7, 8, 9]
    .map((s) => ({ s, rows: wip.filter((x) => x.stage === s) }))
    .filter((g) => g.rows.length)
    .map((g) => ({ ...g, over: g.rows.filter((x) => x.is_on_time === false).length }))
    .sort((a, b) => b.over / b.rows.length - a.over / a.rows.length)[0];

  /* ③ numbers */
  const selPct = selected && selected.size ? Math.round((selected.won / selected.size) * 100) : 0;
  const maxCarryDays = carry[0]?.days_since_sent_contract ?? 0;

  /* ④ owner groups */
  const ownerIds = [...new Set(cycleRows.map((c) => c.bd_owner_id))];
  const ownerGroups = ownerIds.length > 6 ? [...ownerIds.slice(0, 5), "__others"] : ownerIds;
  const ownerRows = (g: string) => (g === "__others" ? cycleRows.filter((c) => !ownerGroups.slice(0, 5).includes(c.bd_owner_id)) : cycleRows.filter((c) => c.bd_owner_id === g));

  const createFollowup = (c: (typeof carry)[number]) => {
    createTask({
      type: "CONTRACT_FOLLOWUP",
      target_dept: "BD",
      source_app: "PS_DASHBOARD",
      created_by: "PM",
      subject_ref: { deal_id: c.deal_id, hotel_id: c.hotel_id ?? c.deal_id, hotel_name: c.hotel_name, gap_service: "", ...(c.service_line ? { service_line: c.service_line } : {}) },
      payload: {
        readiness_tier: "", chips: [],
        note: `ดีล carry ข้ามเดือน — ส่งสัญญา ${thaiMonth(c.cohort_month)} แล้วยังไม่ WON`,
        followup: { cohort_month: c.cohort_month, stage_label: STAGE_LABEL[c.current_stage] ?? "", substep: c.current_substep, days_since_sent_contract: c.days_since_sent_contract, bd_name: owner(c.bd_owner_id) },
        assigned_bd: c.bd_owner_id ? { member_id: c.bd_owner_id, nickname: owner(c.bd_owner_id) } : null,
        unassigned_owner: !c.bd_owner_id,
      },
    });
  };

  return (
    <div className="bdac-theme flex min-w-0 flex-col gap-4">
      {!globalFilter && (
        <div className="bdac-filterbar">
          <div className="bdac-segmented" role="group" aria-label="บริการ">
            {(["ALL", "ORM", "MARCOM"] as LineFilter[]).map((f) => (
              <Button key={f} variant="ghost" size="sm" aria-pressed={line === f} onClick={() => setLine(f)} className="bdac-segment">
                {f === "ALL" ? "All" : LINE_LABEL(f === "NONE" ? null : f)}
              </Button>
            ))}
          </div>
          <Select value={rk} onValueChange={(v) => setRk(v as RangeKey)}>
            <SelectTrigger aria-label="ช่วงเวลา" className="h-9 w-[9rem]"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <span className="bdac-caption sm:ml-auto">นับต่อดีล · ดีลเก่าที่ไม่มี timestamp ไม่ถูกนับ</span>
        </div>
      )}

      <DefinitionsStrip />

      <div className="grid min-w-0 gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))" }}>
        {/* ① Flow */}
        <DashCard
          title="① ดีลขยับในช่วงนี้"
          question="ปิด WON ได้กี่ดีล และดีลเข้าแต่ละ stage เท่าไร? (นับรายดีล)"
          answer={<span className="text-[#0A5E66]">{flow.won} WON</span>}
          answerSub={
            <span className="flex flex-col items-end gap-0.5">
              <DeltaLine cur={flow.won} prev={flow.prev_won} label={prevLabel} />
              <span className="text-xs text-muted-foreground">Contract Signed {flow.signed} ดีล{flow.prev_signed != null && <> · <DeltaLine cur={flow.signed} prev={flow.prev_signed} label={prevLabel} /></>}</span>
            </span>
          }
          noteKey="bdac.flow"
          noteLines={summaryRules(
            { metric: "WON", current: flow.won, previous: flow.prev_won, prevLabel, unit: " ดีล", ...(svcFiltered ? {} : { split: [{ group: "ORM", value: flow.splits.won.orm }, { group: "Marcom", value: flow.splits.won.marcom }] }), empty: !rows.length },
            svcFiltered ? ["R-DELTA"] : ["R-DELTA", "R-SPLIT"],
          )}
          howToRead="แต่ละแท่ง = จำนวนดีลที่ &quot;เข้า&quot; stage นั้นในช่วงเวลา · ไม่ใช่อัตราแปลง (ดูอัตราที่การ์ด ③)"
        >
          {!rows.length ? <div className="dash-chart-skeleton"><div className="dash-skeleton-axis" /><span className="dash-source-pill">ยังไม่มีข้อมูลพอสรุป</span></div> : (
            <div className="space-y-1.5">
              {/* Sent QT placeholder */}
              <div className="grid grid-cols-[118px_1fr_44px] items-center gap-3">
                <span className="text-[13px] text-muted-foreground">Sent QT</span>
                <div className="grid h-[30px] place-items-center rounded-lg border border-dashed border-[#C9D3D8]">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">รอ PipeDrive sync</span>
                </div>
                <span className="text-right text-base font-bold text-muted-foreground">—</span>
              </div>
              {(["approved", "contract_sent", "signed", "setup_fee", "won"] as const).map((key) => {
                const label = { approved: "Approved QT", contract_sent: "Sent Contract", signed: "Contract Signed", setup_fee: "Set up fee", won: "WON" }[key];
                const n = flow[key];
                const sp = flow.splits[key];
                const max = Math.max(1, flow.approved, flow.contract_sent, flow.signed, flow.setup_fee, flow.won);
                return (
                  <div key={key} className="grid grid-cols-[118px_1fr_44px] items-center gap-3">
                    <span className={cn("text-[13px]", key === "won" ? "font-bold" : "text-muted-foreground")}>{label}</span>
                    <ChartHint
                      header={`${label} · ${n} ดีล`}
                      lines={[svcFiltered ? `${svcFiltered} ${n} ดีล` : `ORM ${sp.orm} · Marcom ${sp.marcom}`, FLOW_DEF[label] ?? "", `ช่วง ${rangeLabel}`]}
                    >
                      <div className="h-[30px] cursor-default rounded-lg bg-[#EEF4F5]">
                        <div className={cn("h-full rounded-lg", key === "won" ? "bg-[#0A5E66]" : "bg-[#0E7C86]")} style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                    </ChartHint>
                    <span className="text-right text-base font-bold tabular-nums">{n}</span>
                  </div>
                );
              })}
              <p className="pt-1 text-right text-xs text-muted-foreground">↳ WON = {flow.won_hotels} โรงแรม (distinct)</p>
            </div>
          )}
        </DashCard>

        {/* ② On-time vs เกิน SLA */}
        <DashCard
          title="② ดีลค้าง · On-time vs เกิน SLA"
          question="ดีลที่ยังไม่ WON ตอนนี้ ทันตาม SLA กี่ % ?"
          answer={<span className={onPct < 50 && wip.length ? "text-[#A63E29]" : "text-[#0A5E66]"}>{wip.length ? `${onPct}% on-time` : "—"}</span>}
          answerSub={wip.length > 0 && <span className="text-xs text-muted-foreground">{onN} จาก {wip.length} ดีล · <span className="text-[#A63E29]">เกิน SLA {overN} ({pct(overN, wip.length)}%)</span></span>}
          noteKey="bdac.wip"
          noteLines={wip.length ? [
            `On-time ${onN} จาก ${wip.length} ดีล (${onPct}%) · เกิน SLA ${overN} ดีล`,
            ...(worstStage && worstStage.over > 0 ? [`${STAGE_LABEL[worstStage.s]} เกิน SLA สัดส่วนสูงสุด ${worstStage.over} จาก ${worstStage.rows.length} ดีล (${pct(worstStage.over, worstStage.rows.length)}%)`] : []),
          ] : ["ยังไม่มีข้อมูลพอสรุป"]}
          howToRead="on-time = อยู่ในช่วงปัจจุบันไม่เกิน 2 วัน · นับวันจาก Approved QT / Sent Contract / Contract Signed ตามช่วง SLA · Set up fee อยู่ในช่วง Contract Signed → WON"
        >
          <SlaBar on={onN} amber={amberN} over={overN} big />
          <div className="mt-4 border-t pt-3">
            <div className="grid grid-cols-[128px_64px_1fr] gap-3 pb-2 text-xs font-medium text-muted-foreground">
              <span>Stage</span><span className="text-right">ดีล</span><span>สัดส่วน on-time / เกิน SLA</span>
            </div>
            {[6, 7, 8, 9].map((s) => {
              const g = wip.filter((x) => x.stage === s);
              const gOn = g.filter((x) => x.is_on_time).length;
              const gAmber = g.filter((x) => x.sla_tone === "amber").length;
              const sub = s === 6
                ? `Sub-step: Draft ${g.filter((x) => x.substep === "Draft").length} · Req INV ${g.filter((x) => x.substep === "Request Invoice").length} · Cust ID ${g.filter((x) => x.substep === "Create Customer ID").length} · Hotel ID ${g.filter((x) => x.substep === "Create Hotel ID").length} · INV ${g.filter((x) => x.substep === "Create Invoice").length} · Live Link ${g.filter((x) => x.substep === "Live Link Sent").length}`
                : s === 9
                  ? `ชำระแล้ว ${g.filter((x) => x.deal.current_stage === 9).length}/${g.length} · AC ออกใบเสร็จ 0/${g.length}`
                  : `SLA ${s === 7 ? "Sent Contract → Contract Signed" : "Contract Signed → WON"} ≤ ${g[0]?.limit ?? 2} วัน`;
              return (
                <div key={s} className="grid grid-cols-[128px_64px_1fr] items-center gap-3 py-1">
                  <span className="text-[13.5px] font-semibold">{STAGE_LABEL[s]}</span>
                  <span className="text-right text-[13px] tabular-nums">{g.length} ดีล</span>
                  <ChartHint
                    header={`${STAGE_LABEL[s]} · ${g.length} ดีล`}
                    lines={[`On-time ${gOn} ดีล (${pct(gOn, g.length)}%)${gAmber ? ` · ครบ 2 วันวันนี้ ${gAmber}` : ""}`, `เกิน SLA ${g.length - gOn} ดีล (${pct(g.length - gOn, g.length)}%)`, sub]}
                  >
                    <div className="cursor-default"><SlaBar on={gOn} amber={gAmber} over={g.length - gOn} /></div>
                  </ChartHint>
                </div>
              );
            })}
          </div>
        </DashCard>

        {/* ③ Cohort */}
        <DashCard
          title="③ Sent Contract → WON ราย cohort"
          question="ส่งสัญญาเดือนไหน ปิด WON ครบตาม KPI 100% หรือยัง?"
          answer={selected ? <span className={selPct === 100 ? "text-[#0A5E66]" : selected.carry > 0 ? "text-[#A63E29]" : "text-muted-foreground"}>{selPct}%</span> : "—"}
          answerSub={selected && (
            <span className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
              <span>cohort {thaiMonth(selected.month)} · WON {selected.won}/{selected.size} · KPI 100%</span>
              {selected.carry > 0 && <span className="font-semibold text-[#A63E29]">⚑ carry {selected.carry} ดีล</span>}
            </span>
          )}
          legend={
            <span className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-[#0E7C86]" />WON</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-[#C8553D]" />⚑ Carry ข้ามเดือน (ยังไม่ WON)</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-[#E2F1F2]" />ยังเปิด (cohort เดือนนี้)</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#0E7C86]" />KPI 100%</span>
            </span>
          }
          noteKey="bdac.coh"
          noteLines={selected ? [
            `cohort ${thaiMonth(selected.month)} ปิด WON ${selected.won} จาก ${selected.size} ดีล (${selPct}%) เทียบ KPI 100%${selected.carry > 0 ? ` · carry ${selected.carry} ดีล` : ""}`,
            carry.length ? `มีดีล carry ข้ามเดือน ${carry.length} ดีล · นานสุด ${maxCarryDays} วันนับจากส่งสัญญา` : `ฐานเล็ก: ดูจำนวนจริงประกอบ`,
          ] : ["ยังไม่มีข้อมูลพอสรุป"]}
          howToRead="1 แท่ง = ดีลที่ Sent Contract ในเดือนนั้น · เส้นประ = KPI 100% · ส่วนแดง ⚑ = ส่งไปตั้งแต่เดือนก่อนแต่ยังไม่ WON · คลิกแท่งเพื่อเลือก cohort"
        >
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t-2 border-dashed border-[#0E7C86]" aria-hidden />
            <div className="grid grid-cols-6 items-end gap-2 pt-2" role="group" aria-label="cohort รายเดือน">
              {cohort.map((c) => {
                const p = c.size ? Math.round((c.won / c.size) * 100) : 0;
                const isCur = c.open_current > 0 && c.carry === 0 && c.month === cohort.at(-1)?.month;
                const sel = selected?.month === c.month;
                return (
                  <ChartHint
                    key={c.month}
                    header={`Sent Contract ${thaiMonth(c.month)} · ${c.size} ดีล${isCur ? " (เดือนปัจจุบัน)" : ""}`}
                    lines={[`WON ${c.won} (${p}%) · KPI 100%`, c.carry > 0 ? `⚑ carry ${c.carry} ดีล (ยังไม่ WON)` : c.open_current > 0 ? `ยังเปิด ${c.open_current} ดีล (ยังอยู่ในเดือน)` : `ปิดครบตาม KPI`]}
                  >
                    <button
                      type="button"
                      aria-pressed={sel}
                      onClick={() => setSelCohort(c.month)}
                      className={cn("flex h-44 w-full flex-col items-center justify-end gap-1 rounded-md outline-none", sel && "bg-[#E2F1F2]/60 ring-2 ring-[#0E7C86]")}
                    >
                      <span className="text-xs font-bold tabular-nums">{p}%{c.carry > 0 && <span className="ml-0.5 text-[#A63E29]">⚑{c.carry}</span>}</span>
                      <span className={cn("flex h-32 w-full max-w-14 flex-col-reverse overflow-hidden rounded-t-md", isCur && "border border-dashed border-[#8A9AA2]")}>
                        <span className="w-full bg-[#0E7C86]" style={{ height: `${p}%` }} />
                        {c.carry > 0 && <span className="w-full bg-[#C8553D]" style={{ height: `${(c.carry / c.size) * 100}%` }} />}
                        {c.open_current > 0 && <span className="w-full bg-[#E2F1F2]" style={{ height: `${(c.open_current / c.size) * 100}%` }} />}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{thaiMonth(c.month)}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">n={c.size}</span>
                    </button>
                  </ChartHint>
                );
              })}
            </div>
          </div>
          {/* Carry list */}
          <div className="mt-4 rounded-xl border border-[#F1D5CD] bg-[#FDF6F4] p-3">
            <p className="text-sm font-bold text-[#A63E29]">⚑ ดีล carry ข้ามเดือน {carry.length} ดีล</p>
            <p className="mt-0.5 text-xs text-muted-foreground">ส่งสัญญาเดือนก่อนแล้วยังไม่ WON · PM สร้าง Ticket ให้ BD ติดตามได้</p>
            <div className="mt-3 space-y-2">
              {carry.map((c) => (
                <div key={c.deal_id} className="rounded-lg border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{c.hotel_name} <span className="ml-1 text-xs font-normal text-muted-foreground">{c.deal_id} · {c.service_line ? LINE_LABEL(c.service_line) : "—"}</span></p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        cohort {thaiMonth(c.cohort_month)} · ตอนนี้ {STAGE_LABEL[c.current_stage]} · {c.current_substep ?? (c.current_stage === 7 ? "รอลูกค้าเซ็น" : c.current_stage === 8 ? "รอชำระ Set up fee" : "รอ AC ออกใบเสร็จ")} · BD {owner(c.bd_owner_id)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#FBEDE9] px-2.5 py-1 text-xs font-semibold text-[#A63E29]">ค้าง {c.days_since_sent_contract} วันนับจากส่งสัญญา</span>
                  </div>
                  <div className="mt-2">
                    {c.open_ticket_id ? (
                      <span className="inline-flex items-center rounded-full bg-[#E2F1F2] px-2.5 py-1 text-xs font-medium text-[#0A5E66]">
                        #{c.open_ticket_id} · {c.open_ticket_status ? STATUS_TH[c.open_ticket_status] : ""} · ส่งถึง BD {owner(c.bd_owner_id)}
                      </span>
                    ) : isPm ? (
                      <Button size="sm" className="min-h-9 bg-[#0E7C86] text-white hover:bg-[#0A5E66]" onClick={() => createFollowup(c)}>
                        + สร้าง Ticket ติดตาม
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!carry.length && <p className="py-2 text-center text-xs text-muted-foreground">ไม่มีดีล carry ใน filter นี้</p>}
            </div>
          </div>
        </DashCard>
      </div>

      {/* ④ Cycle time — full width on its own row (v2.1) */}
      <CycleCard
        rows={cycleRows} agg={agg} leg={leg} setLeg={setLeg} byOwner={byOwner} setByOwner={setByOwner}
        ownerGroups={ownerGroups} ownerRows={ownerRows} range={range}
      />

      {/* ⑤ Deal table (full width, no SummaryNote) */}
      <section className="dash-card">
        <header className="dash-card-header">
          <div className="min-w-0">
            <h2>⑤ ดีลค้าง (เรียงวันมาก → น้อย)</h2>
            <p className="dash-question">ดีลไหนต้องตามก่อน? · คลิกเพื่อเปิดการ์ดใน Contract Dashboard</p>
          </div>
          <div className="dash-answer-block">
            <div className="dash-answer text-[#A63E29]">{aging.filter((a) => a.sla_tone === "red").length} เกิน SLA</div>
            <div className="dash-answer-sub">จาก {aging.length} ดีล · นานสุด {aging[0]?.sla_days ?? 0} วัน</div>
          </div>
        </header>
        <div className="bdac-table-scroll">
          <table className="bdac-table w-full text-sm">
            <thead>
              <tr>{["ดีล · โรงแรม", "บริการ", "Stage", "Sub-step / สถานะ", "วันในช่วง SLA", "นับจาก", "BD", ""].map((h) => <th key={h} className={h === "วันในช่วง SLA" ? "text-right" : "text-left"}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {aging.map((a) => (
                <tr key={a.deal.id} onClick={() => open(a.deal.id)} className="cursor-pointer">
                  <td><span className="font-semibold">{a.deal.hotel_name}</span><p className="bdac-caption mt-0.5 font-mono">{a.deal.id}</p></td>
                  <td>{bdacLine(a.deal) ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", bdacLine(a.deal) === "ORM" ? "bg-[#E2F1F2] text-[#0E7C86]" : "bg-[#F1EFFA] text-[#4F4596]")}>{LINE_LABEL(bdacLine(a.deal))}</span> : "—"}</td>
                  <td>{STAGE_LABEL[a.stage]}</td>
                  <td className="text-xs">
                    {a.stage === 6 ? a.substep : a.stage === 7 ? "รอลูกค้าเซ็น" : a.stage === 8 ? "รอชำระ Set up fee" : a.deal.current_stage === 9 ? "ชำระแล้ว · รอ AC ออกใบเสร็จ" : "รอชำระ · รอ AC ออกใบเสร็จ"}
                  </td>
                  <td className="text-right">
                    {a.sla_days == null ? "—" : (
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", TONE_PILL[a.sla_tone ?? "ok"])}>
                        <span className="inline-block size-1.5 rounded-full" style={{ background: TONE_DOT[a.sla_tone ?? "ok"] }} />{a.sla_days} วัน
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-muted-foreground">{a.sla_ref_label ?? "—"}</td>
                  <td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="grid size-6 place-items-center rounded-full bg-[#E2F1F2] text-[11px] font-bold text-[#0A5E66]">{owner(a.deal.bd_owner_id)[0] ?? "—"}</span>
                      {owner(a.deal.bd_owner_id)}
                    </span>
                  </td>
                  <td><Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); open(a.deal.id); }}>เปิดการ์ด ↗</Button></td>
                </tr>
              ))}
              {!aging.length && <tr><td colSpan={8} className="p-6 text-center bdac-caption">ไม่มีดีลค้าง</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">วันนับเป็นวันปฏิทินเต็ม · 0–1 วัน = ปกติ · 2 วัน = ครบกำหนด (amber · ยังนับ on-time) · มากกว่า 2 วัน = เกิน SLA (แดง) · หน้านี้ไม่เลื่อน stage</p>
      </section>

      {/* Pending-sync strip */}
      {bin.pending_sync && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-[#C9D3D8] px-[18px] py-3.5 text-sm">
          <LockKeyhole className="size-4 text-muted-foreground" />
          <span className="font-semibold">รอ PipeDrive sync</span>
          <span className="flex flex-wrap gap-2">
            {["Sent QT", "Follow up QT", "Special Deal · อัตราอนุมัติ", "Pending"].map((c) => (
              <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{c}</span>
            ))}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">ปลดพร้อมกันเมื่อ sync มา</span>
        </div>
      )}
    </div>
  );
}

/* ④ Cycle time — median + SLA line, hover-by-day summary, no IQR, no average. */
function CycleCard({ rows, agg, leg, setLeg, byOwner, setByOwner, ownerGroups, ownerRows, range }: {
  rows: ReturnType<typeof v_bdac_cycle_time>; agg: ReturnType<typeof cycleAgg>; leg: CycleLeg; setLeg: (l: CycleLeg) => void;
  byOwner: boolean; setByOwner: (b: boolean) => void; ownerGroups: string[]; ownerRows: (g: string) => ReturnType<typeof v_bdac_cycle_time>; range: Range;
}) {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const limit = cycleLegLimit(leg);
  const maxY = Math.max(8, Math.ceil(Math.max(0, ...rows.map((r) => r.days))));
  const W = 760, H = 240, PL = 36, PR = 76, PT = 14, PB = 26;
  const x = (t: number) => PL + ((t - range.from) / Math.max(1, range.to - range.from)) * (W - PL - PR);
  const y = (d: number) => PT + (1 - d / maxY) * (H - PT - PB);
  const days = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.end_date.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [rows]);
  const tone = (r: (typeof rows)[number]) => (r.days < r.limit ? "#0E7C86" : r.days === r.limit ? "#D9A13B" : "#C8553D");
  const colorOf = (r: (typeof rows)[number]) => {
    if (!byOwner) return tone(r);
    const i = ownerGroups.indexOf(r.bd_owner_id);
    return OWNER_COLORS[(i === -1 ? ownerGroups.length - 1 : i) % OWNER_COLORS.length];
  };
  const active = activeDay ? (days.find(([k]) => k === activeDay)?.[1] ?? []) : [];
  const activeAgg = cycleAgg(active);
  const flip = activeDay ? x(new Date(activeDay).getTime()) > W * 0.6 : false;

  return (
    <DashCard
      title="④ Cycle time"
      question={leg === "SENT_TO_SIGNED" ? "Sent Contract → Contract Signed ใช้กี่วัน?" : "Contract Signed → ชำระ Set up fee ใช้กี่วัน?"}
      answer={
        <span className={agg.median == null ? "text-muted-foreground" : agg.median < limit ? "text-[#0A5E66]" : agg.median === limit ? "text-[#A86B00]" : "text-[#A63E29]"}>
          {agg.median == null ? "—" : `${fmtD(agg.median)} วัน`}
        </span>
      }
      answerSub={agg.n > 0 && <span className="text-xs text-muted-foreground">ค่ากลาง (median) · <span className="text-[#A63E29]">เกิน SLA {agg.over_sla_count}/{agg.n}</span></span>}
      legend={byOwner ? (
        <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {ownerGroups.map((g, i) => {
            const rs = ownerRows(g);
            const a = cycleAgg(rs);
            return <span key={g} className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full" style={{ background: OWNER_COLORS[i % OWNER_COLORS.length] }} />BD {g === "__others" ? "อื่นๆ" : owner(g)} · median {a.median == null ? "—" : fmtD(a.median)} วัน · เกิน {a.over_sla_count}/{a.n}</span>;
          })}
        </span>
      ) : undefined}
      noteKey="bdac.cyc"
      noteLines={agg.n ? [
        `ช่วง ${leg === "SENT_TO_SIGNED" ? "Sent Contract → Signed" : "Signed → Set up fee"} ใช้ราว ${fmtD(agg.median ?? 0)} วัน (median) เทียบ SLA ${limit} วัน`,
        byOwner
          ? (() => {
              const aggs = ownerGroups.map((g) => ({ g, a: cycleAgg(ownerRows(g)) })).filter((x) => x.a.median != null && x.a.n > 0);
              if (aggs.length < 2) return `เกิน SLA ${limit} วัน ${agg.over_sla_count} จาก ${agg.n} ดีล (${pct(agg.over_sla_count, agg.n)}%)`;
              const fast = aggs.reduce((m, x) => (x.a.median! < m.a.median! ? x : m));
              const slow = aggs.reduce((m, x) => (x.a.median! > m.a.median! ? x : m));
              return fast.g === slow.g ? `เกิน SLA ${limit} วัน ${agg.over_sla_count} จาก ${agg.n} ดีล (${pct(agg.over_sla_count, agg.n)}%)` : `BD ${owner(fast.g)} เร็วกว่า BD ${owner(slow.g)} ${fmtD(slow.a.median! - fast.a.median!)} วัน (median)`;
            })()
          : `เกิน SLA ${limit} วัน ${agg.over_sla_count} จาก ${agg.n} ดีล (${pct(agg.over_sla_count, agg.n)}%)`,
      ] : ["ยังไม่มีข้อมูลพอสรุป"]}
      howToRead={`1 จุด = 1 ดีล · เส้นทึบ = median · เส้นประแดง = SLA ${limit} วัน · จุดเหนือเส้นประ = เกิน SLA`}
      right={
        <div className="mb-2 flex flex-wrap justify-end gap-2">
          <div className="bdac-segmented" role="group" aria-label="ช่วง Cycle time">
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={leg === "SENT_TO_SIGNED"} onClick={() => setLeg("SENT_TO_SIGNED")}>Sent Contract → Signed</Button>
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={leg === "SIGNED_TO_PAID"} onClick={() => setLeg("SIGNED_TO_PAID")}>Signed → Set up fee</Button>
          </div>
          <div className="bdac-segmented" role="group" aria-label="แยกตามผู้ดูแล">
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={!byOwner} onClick={() => setByOwner(false)}>รวม</Button>
            <Button size="sm" variant="ghost" className="bdac-segment" aria-pressed={byOwner} onClick={() => setByOwner(true)}>ราย BD</Button>
          </div>
        </div>
      }
    >
      {!rows.length ? (
        <div className="dash-chart-skeleton"><div className="dash-skeleton-axis" /><span className="dash-source-pill">ยังไม่มีดีลที่ครบช่วงนี้ในระยะที่เลือก</span></div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[520px]" role="img" aria-label="cycle time scatter">
            {[0, Math.round(maxY / 2), maxY].map((v) => (
              <g key={v}>
                <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#E7ECEF" />
                <text x={PL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#5A6B74">{v}</text>
              </g>
            ))}
            {/* median line */}
            {agg.median != null && (
              <g>
                <line x1={PL} x2={W - PR} y1={y(agg.median)} y2={y(agg.median)} stroke="#0E7C86" strokeWidth={2} />
                <text x={W - PR + 6} y={y(agg.median) + 4} fontSize="11" fontWeight={600} fill="#0A5E66">median {fmtD(agg.median)} วัน</text>
              </g>
            )}
            {/* SLA line */}
            <g>
              <line x1={PL} x2={W - PR} y1={y(limit)} y2={y(limit)} stroke="#C8553D" strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={PL + 2} y={y(limit) - 5} fontSize="11" fontWeight={600} fill="#A63E29">{leg === "SENT_TO_SIGNED" ? `SLA ${limit} วัน` : `SLA Contract Signed → WON ${limit} วัน`}</text>
            </g>
            {/* hover-by-day hit columns + dots */}
            {days.map(([k, rs]) => {
              const cx = x(new Date(k).getTime());
              const isActive = activeDay === k;
              return (
                <g key={k}>
                  <rect
                    x={cx - W * 0.025} y={PT} width={W * 0.05} height={H - PT - PB}
                    fill="transparent" tabIndex={0} role="button" aria-label={`${thaiShort(k)} · ${rs.length} ดีล`}
                    onMouseEnter={() => setActiveDay(k)} onMouseLeave={() => setActiveDay(null)}
                    onFocus={() => setActiveDay(k)} onBlur={() => setActiveDay(null)}
                  />
                  {isActive && <line x1={cx} x2={cx} y1={PT} y2={H - PB} stroke="#1C2B33" strokeOpacity={0.55} strokeDasharray="4 4" />}
                  {rs.map((r, i) => {
                    const sameSlot = rs.filter((o) => o.days === r.days);
                    const slot = sameSlot.indexOf(r);
                    const dx = (slot - (sameSlot.length - 1) / 2) * 10;
                    return <circle key={r.deal_id} cx={cx + dx} cy={y(r.days)} r={isActive ? 6 : 4.5} fill={colorOf(r)} fillOpacity={0.9} stroke="#fff" strokeWidth={1.2} />;
                  })}
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#6B7B83">{thaiShort(k)}</text>
                </g>
              );
            })}
          </svg>
          {activeDay && active.length > 0 && (
            <div
              className="pointer-events-none absolute top-3 z-10"
              style={flip ? { right: `${100 - ((x(new Date(activeDay).getTime()) - W * 0.03) / W) * 100}%` } : { left: `${((x(new Date(activeDay).getTime()) + W * 0.03) / W) * 100}%` }}
            >
              <ChartTooltip
                header={`${thaiShort(activeDay)} · ${active.length} ดีล${active.length > 1 && activeAgg.median != null ? ` · median ${fmtD(activeAgg.median)} วัน` : ""}${activeAgg.over_sla_count ? ` · เกิน ${activeAgg.over_sla_count}` : ""}`}
                lines={[...active]
                  .sort((a, b) => b.days - a.days)
                  .slice(0, 3)
                  .map((r, i, arr) => `${r.deal_id} · ${r.service_line ? LINE_LABEL(r.service_line) : "—"} · BD ${owner(r.bd_owner_id)} · ${fmtD(r.days)} วัน${r.over_sla ? " (เกิน)" : ""}${i === 2 && active.length > 3 ? ` +${active.length - 3} ดีล` : ""}`)}
              />
            </div>
          )}
        </div>
      )}
    </DashCard>
  );
}
