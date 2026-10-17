import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
  Line,
  ComposedChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  latestPeriod,
  psScope,
  ratio,
  type HealthTier,
  type PsReport,
  type PsReportRow,
  type PsFilter,
} from "@/lib/ps-dashboard-types";
import { cn } from "@/lib/utils";
import {
  accountHealthOf,
  sortHealth,
  DIM_TH,
  INERT_DIMS,
  DEMO_VALUE_RATIO_MIN,
  ROI_VALUE_RATIO_MIN,
  type DimCode,
} from "@/lib/account-health";
import { useAccount360 } from "@/components/ps/account-360";
import { CrossSellPanel, RepricingBox } from "@/components/ps/expansion-ui";
import { DashCard, ChartHint, ChartTooltip, ChartSkeleton, Delta } from "./dash-card";
import { summaryRules } from "@/lib/summaryRules";

const n = (row: PsReportRow, key: string) => Number(row[key] ?? 0);
const fmt = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value.toLocaleString("th-TH", { maximumFractionDigits: 1 })}${suffix}`;
const sum = (rows: PsReportRow[], key: string) => rows.reduce((s, r) => s + n(r, key), 0);
const pending = "รอ Cloud Sync seed";
function Metric({
  label,
  value,
  warn = false,
  detail,
}: {
  label: string;
  value: string;
  warn?: boolean;
  detail?: string;
}) {
  return (
    <div className="min-w-0 border-l pl-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 break-words text-xl font-semibold tabular-nums ${warn ? "text-warning-foreground" : "text-foreground"}`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
function quantile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * fraction;
  const lo = sorted[Math.floor(at)],
    hi = sorted[Math.ceil(at)];
  return lo === undefined || hi === undefined ? null : lo + (hi - lo) * (at - Math.floor(at));
}
/** Weighted average via *_sum / *_n when the view provides them; otherwise mean of row values. */
function wavg(rows: PsReportRow[], key: string) {
  const nn = sum(rows, key + "_n");
  if (nn > 0) return sum(rows, key + "_sum") / nn;
  const r = rows.filter((x) => typeof x[key] === "number");
  return r.length ? sum(r, key) / r.length : null;
}

const TIER: Record<HealthTier, { dot: string; label: string; order: number }> = {
  high: { dot: "🔴", label: "High-risk", order: 0 },
  watch: { dot: "🟡", label: "Watch", order: 1 },
  healthy: { dot: "🟢", label: "Healthy", order: 2 },
  pending: { dot: "⚪", label: "รอข้อมูล", order: 3 },
};

export function PsReportTab({
  report,
  filter,
  loading,
  error,
  wonMtd,
  compareSide,
  comparisonFilter,
}: {
  report?: PsReport | undefined;
  filter: PsFilter;
  loading: boolean;
  error: boolean;
  wonMtd?: number | undefined;
  compareSide?: "A" | "B";
  comparisonFilter?: PsFilter | undefined;
}) {
  const [groupBy, setGroupBy] = useState<"service_line" | "ae_owner_id">("service_line");
  const [tierFilter, setTierFilter] = useState<HealthTier | "all">("all");
  const [dimFilter, setDimFilter] = useState<DimCode | null>(null);
  const [distBy, setDistBy] = useState<"service_line" | "ae_owner_id">("service_line");
  const { openAccount360 } = useAccount360();
  const views = report?.views;
  const demo = !!report?.demo;
  const now = report?.now ? new Date(report.now) : new Date();
  const flow = psScope(views?.v_ps_lifecycle_flow ?? [], filter, "created_at", 0, now);
  const out = psScope(views?.v_ps_lifecycle_flow ?? [], filter, "inactivated_at", 0, now).filter(
    (row) => String(row.inactivated_at) <= now.toISOString(),
  );
  const hasFlow = (views?.v_ps_lifecycle_flow ?? []).length > 0;
  const churn = latestPeriod(
    psScope(views?.v_ps_churn_monthly ?? [], filter, "billing_period", 0, now),
  );
  const renewals = psScope(views?.v_ps_renewal ?? [], filter, "renewal_due_date", 0, now);
  const decided = renewals.filter((row) =>
    ["RENEWED", "NOT_RENEWED", "LOST"].includes(String(row.outcome)),
  );
  const renewalSuccess = decided.length
    ? (decided.filter((row) => row.outcome === "RENEWED").length / decided.length) * 100
    : null;
  const lifetime = psScope(
    views?.v_ps_contract_lifetime ?? [],
    filter,
    filter.period ? "end_date" : "none",
    0,
    now,
  );
  const ended = lifetime.filter(
    (row) => row.status === "INACTIVE" && typeof row.age_days === "number",
  );
  const active = lifetime.filter(
    (row) => row.status === "ACTIVE" && typeof row.age_days === "number",
  );
  const ages = ended.map((row) => n(row, "age_days"));
  const median = quantile(ages, 0.5),
    p25 = quantile(ages, 0.25),
    p75 = quantile(ages, 0.75);
  const cohort = psScope(views?.v_ps_onboard_cohort ?? [], filter, "billing_period", 0, now).sort(
    (a, b) => String(a.billing_period).localeCompare(String(b.billing_period)),
  );
  const attach = psScope(views?.v_ps_attach_rate ?? [], filter, "none");
  const health =
    compareSide === "B" ? [] : psScope(views?.v_ps_account_health ?? [], filter, "none");
  const roiRows = psScope(views?.v_ps_roi ?? [], filter, "none");
  const crossRows = compareSide === "B" ? [] : psScope(views?.v_ps_crosssell ?? [], filter, "none");
  const repriceRows =
    compareSide === "B" ? [] : psScope(views?.v_ps_repricing ?? [], filter, "none");
  const expansionPending =
    compareSide === "B" || (!!report?.pending.includes("v_ps_crosssell") && !demo);
  const repricePending =
    compareSide === "B" || (!!report?.pending.includes("v_ps_repricing") && !demo);
  const flowAll = views?.v_ps_lifecycle_flow ?? [];
  const hotels = useMemo(
    () =>
      sortHealth(
        [...new Set(health.map((row) => String(row.hotel_id)))].map((id) => {
          const rows = health.filter((row) => row.hotel_id === id);
          const first = rows[0] ?? {};
          const row: PsReportRow = {
            ...first,
            service_line: [...new Set(rows.map((r) => String(r.service_line ?? "")))].join("+"),
            completeness: rows.some((r) => r.completeness != null && r.completeness !== "complete")
              ? "incomplete"
              : (first.completeness ?? null),
            has_orm_commission: rows.some((r) => r.has_orm_commission === true),
          };
          return accountHealthOf(row, {
            now,
            roi: roiRows,
            flow: flowAll,
            ratioMin: demo ? DEMO_VALUE_RATIO_MIN : ROI_VALUE_RATIO_MIN,
          });
        }),
      ),
    [health, roiRows, flowAll, demo, now.getTime()],
  );
  const tiered = hotels.filter((h) => h.tier !== "pending");
  const tierCount = (t: HealthTier) => tiered.filter((h) => h.tier === t).length;
  const dimCodes = (Object.keys(DIM_TH) as DimCode[]).filter((c) => !INERT_DIMS.includes(c));
  const dims = dimCodes
    .map((d) => ({ d, count: tiered.filter((h) => h.dims.some((x) => x.code === d)).length }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count);
  const shown = hotels.filter(
    (h) =>
      (tierFilter === "all" || h.tier === tierFilter) &&
      (!dimFilter || h.dims.some((x) => x.code === dimFilter)),
  );
  const distKeys = [...new Set(tiered.map((h) => String(h.row[distBy] ?? "ไม่ระบุ")))].sort();
  const groups = [...new Set(renewals.map((row) => String(row[groupBy] ?? "ไม่ระบุ")))];
  const emptyText = loading
    ? "กำลังโหลดรายงาน…"
    : error
      ? "อ่านรายงาน PS ไม่ได้ — ลองใหม่อีกครั้ง"
      : pending;
  const scatterRows = (rows: PsReportRow[], today: boolean) =>
    rows.map((row) => ({
      x: (today ? now : new Date(String(row.end_date))).getTime(),
      y: n(row, "age_days"),
      contract: row.contract_id,
    }));
  const reconcileOk = wonMtd === undefined || filter.service !== "ALL" || flow.length === wonMtd;
  // Display transforms use only the card's existing scoped rows; never fetch or alter projections.
  const months = [
    ...new Set([
      ...flow.map((r) => String(r.created_at).slice(0, 7)),
      ...out.map((r) => String(r.inactivated_at).slice(0, 7)),
    ]),
  ].sort();
  const flowChart = months.map((month) => {
    const ins = flow.filter((r) => String(r.created_at).startsWith(month)),
      outs = out.filter((r) => String(r.inactivated_at).startsWith(month));
    return {
      month,
      incoming: ins.length,
      outgoing: -outs.length,
      net: ins.length - outs.length,
      ins,
      outs,
    };
  });
  const churnSeries = psScope(views?.v_ps_churn_monthly ?? [], filter, "billing_period", 0, now);
  const churnChart = [...new Set(churnSeries.map((r) => String(r.billing_period)))]
    .sort()
    .map((month) => {
      const rows = churnSeries.filter((r) => r.billing_period === month);
      return {
        month: month.slice(0, 7),
        ORM: ratio(
          rows.filter((r) => r.service_line === "ORM"),
          "out_count",
          "active_at_start",
        ),
        Marcom: ratio(
          rows.filter((r) => r.service_line === "Marcom"),
          "out_count",
          "active_at_start",
        ),
        gross: ratio(rows, "out_count", "active_at_start"),
        rows,
      };
    });
  const gross = ratio(churn, "out_count", "active_at_start"),
    churnPrevious = churnChart.at(-2)?.gross ?? null;
  const outcomes = ["RENEWED", "NOT_RENEWED", "LOST"].map((outcome) => ({
    outcome,
    count: decided.filter((r) => r.outcome === outcome).length,
  }));
  const renewed = outcomes[0]?.count ?? 0;
  const lastCohort = cohort.at(-1),
    previousCohort = cohort.at(-2);
  const onboardMedian =
    typeof lastCohort?.["median_days"] === "number" ? lastCohort["median_days"] : null;
  const previousMedian =
    typeof previousCohort?.["median_days"] === "number" ? previousCohort["median_days"] : null;
  const gradeD = tiered.filter((h) => [h.row.latest_grade, h.row.worst_grade].includes("D")).length;
  const summaries = (metric: string, values: number[], rules: Parameters<typeof summaryRules>[1]) =>
    summaryRules({ metric, values, compare: !!compareSide, empty: !values.length }, rules);
  const previousChurnRows = comparisonFilter
    ? latestPeriod(
        psScope(views?.v_ps_churn_monthly ?? [], comparisonFilter, "billing_period", 0, now),
      )
    : [];
  const comparisonChurn = comparisonFilter
    ? ratio(previousChurnRows, "out_count", "active_at_start")
    : churnPrevious;
  const comparisonCohort = comparisonFilter
    ? psScope(views?.v_ps_onboard_cohort ?? [], comparisonFilter, "billing_period", 0, now)
        .sort((a, b) => String(a.billing_period).localeCompare(String(b.billing_period)))
        .at(-1)
    : undefined;
  const comparisonOnboard = comparisonFilter
    ? typeof comparisonCohort?.["median_days"] === "number"
      ? comparisonCohort["median_days"]
      : null
    : previousMedian;
  const comparisonLife = comparisonFilter
    ? quantile(
        psScope(views?.v_ps_contract_lifetime ?? [], comparisonFilter, "end_date", 0, now)
          .filter((r) => r.status === "INACTIVE" && typeof r.age_days === "number")
          .map((r) => n(r, "age_days")),
        0.5,
      )
    : null;
  const compareSub = (value: number | null, unit = "", lowerGood = false) =>
    comparisonFilter ? (
      <span>
        vs B {fmt(value, unit)} ·{" "}
        <Delta
          a={unit === " วัน" ? (lowerGood ? onboardMedian : median) : gross}
          b={value}
          lowerGood={lowerGood}
          unit={unit === "%" ? "pp" : unit}
        />
      </span>
    ) : null;
  const donutColors = ["var(--primary)", "var(--watch-line)", "var(--grade-action)"];
  const pointShape = (props: {
    cx?: number;
    cy?: number;
    payload?: { row: PsReportRow; y: number; ended: boolean };
  }) => {
    const point = props.payload;
    if (props.cx == null || props.cy == null || !point) return <g />;
    return (
      <ChartHint
        header={String(point.row.hotel_name ?? point.row.contract_id ?? "สัญญา")}
        lines={[
          `${point.row.service_line ?? "—"} · ${point.row.start_date ?? "—"} – ${point.ended ? (point.row.end_date ?? "—") : "ยังใช้อยู่"}`,
          `อายุ ${fmt(point.y)} วัน`,
        ]}
      >
        <circle
          cx={props.cx}
          cy={props.cy}
          r={5}
          fill={point.ended ? "var(--primary)" : "var(--card)"}
          stroke="var(--primary)"
          strokeWidth={2}
          tabIndex={0}
          role="button"
          aria-label={`${point.row.hotel_name ?? point.row.contract_id} · ${fmt(point.y)} วัน`}
          className="dash-bar-interactive"
        />
      </ChartHint>
    );
  };
  const barShape =
    (kind: "incoming" | "outgoing" | "median_days") =>
    (props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      payload?: Record<string, unknown>;
    }) => {
      const r = props.payload;
      if (!r || props.x == null || props.y == null || props.width == null || props.height == null)
        return <g />;
      const val = Number(r[kind] ?? 0),
        period = String(r["month"] ?? r["billing_period"] ?? "").slice(0, 7);
      return (
        <ChartHint
          header={`${period} · ${kind === "median_days" ? "median" : "เข้า / ออก"} ${Math.abs(val)}${kind === "median_days" ? " วัน" : ""}`}
          lines={
            kind === "median_days"
              ? [`ORM ${r["orm_days"] ?? "—"} วัน · Marcom ${r["marcom_days"] ?? "—"} วัน`]
              : [`เข้า ${r["incoming"]} · ออก ${Math.abs(Number(r["outgoing"]))}`]
          }
        >
          <rect
            x={props.x}
            y={props.y}
            width={props.width}
            height={Math.abs(props.height)}
            rx={4}
            fill={
              kind === "incoming"
                ? "var(--primary)"
                : kind === "outgoing"
                  ? "var(--neutral-bar)"
                  : "var(--series-2)"
            }
            tabIndex={0}
            role="button"
            aria-label={`${period} ${kind} ${Math.abs(val)}`}
            className="dash-bar-interactive"
          />
        </ChartHint>
      );
    };
  const churnDot =
    (line: "ORM" | "Marcom") =>
    (props: { cx?: number; cy?: number; payload?: (typeof churnChart)[number] }) => {
      const r = props.payload;
      if (!r || props.cx == null || props.cy == null) return <g />;
      const rows = r.rows.filter((x) => x.service_line === line),
        value = ratio(rows, "out_count", "active_at_start");
      return (
        <ChartHint
          header={`${r.month} · ${line} ${fmt(value, "%")}`}
          lines={[`${sum(rows, "out_count")}/${sum(rows, "active_at_start")} โรงแรม`]}
        >
          <circle
            cx={props.cx}
            cy={props.cy}
            r={4}
            fill={line === "ORM" ? "var(--watch-line)" : "var(--series-2)"}
            tabIndex={0}
            role="button"
            aria-label={`${r.month} ${line} ${fmt(value, "%")}`}
            className="dash-bar-interactive"
          />
        </ChartHint>
      );
    };
  const lifePoints = (rows: PsReportRow[], isEnded: boolean) =>
    scatterRows(rows, !isEnded).map((p, i) => ({ ...p, row: rows[i] ?? {}, ended: isEnded }));
  return (
    <div
      className={cn("dash-grid", compareSide && "grid-cols-1")}
      data-testid="ps-report-tab"
      data-compare-side={compareSide}
    >
      <DashCard
        title="① Lifecycle & Flow"
        question="ฐานลูกค้าโตหรือหด? (นับราย service)"
        answer={
          hasFlow
            ? `${flowChart.at(-1)?.net && (flowChart.at(-1)?.net ?? 0) > 0 ? "+" : ""}${flowChart.at(-1)?.net ?? 0}`
            : "—"
        }
        answerSub="สุทธิเดือนนี้"
        noteKey="lifecycle"
        noteLines={summaries(
          "บริการสุทธิ",
          flowChart.map((r) => r.net),
          ["R-MAX", "R-MIN", "R-STABLE"],
        )}
        howToRead="แท่งบน = บริการใหม่ · แท่งล่าง = บริการที่จบ · นับราย service"
        legend={
          <>
            <span>● เข้า</span>
            <span className="text-neutral-bar">● ออก</span>
            <Chip tone="warn">Pause · รอ source</Chip>
          </>
        }
      >
        {hasFlow ? (
          <>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={flowChart} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ReferenceLine y={0} stroke="var(--neutral-bar)" />
                  <Tooltip
                    content={({ active, payload }) => {
                      const r = payload?.[0]?.payload;
                      return active && r ? (
                        <ChartTooltip
                          header={`${r.month} · สุทธิ ${r.net >= 0 ? "+" : ""}${r.net}`}
                          lines={[
                            `เข้า ${r.incoming} (ORM ${r.ins.filter((x: PsReportRow) => x.service_line === "ORM").length} · Marcom ${r.ins.filter((x: PsReportRow) => x.service_line === "Marcom").length})`,
                            `ออก ${-r.outgoing} (ORM ${r.outs.filter((x: PsReportRow) => x.service_line === "ORM").length} · Marcom ${r.outs.filter((x: PsReportRow) => x.service_line === "Marcom").length})`,
                          ]}
                        />
                      ) : null;
                    }}
                  />
                  <Bar
                    dataKey="incoming"
                    fill="var(--primary)"
                    shape={barShape("incoming")}
                    radius={[4, 4, 0, 0]}
                  >
                    {flowChart.length <= 8 && <LabelList dataKey="incoming" position="top" />}
                  </Bar>
                  <Bar
                    dataKey="outgoing"
                    fill="var(--neutral-bar)"
                    shape={barShape("outgoing")}
                    radius={[0, 0, 4, 4]}
                  >
                    {flowChart.length <= 8 && (
                      <LabelList
                        dataKey="outgoing"
                        position="bottom"
                        formatter={(v: number) => Math.abs(v)}
                      />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <span>
                In {flow.length} · {new Set(flow.map((r) => r.hotel_id)).size} โรงแรม
              </span>
              <span>Out {out.length}</span>
            </div>
            {!reconcileOk && (
              <p className="text-xs text-warning-foreground">
                QA: In ({flow.length}) ≠ Won MTD ({wonMtd})
              </p>
            )}
          </>
        ) : (
          <ChartSkeleton text={emptyText} />
        )}
      </DashCard>
      <DashCard
        title="② Churn"
        question="เดือนไหนหลุดผิดปกติ? แยก ORM / Marcom"
        answer={fmt(gross, "%")}
        answerTone="watch"
        answerSub={
          comparisonFilter ? (
            compareSub(comparisonChurn, "%", true)
          ) : (
            <Delta a={gross} b={churnPrevious} lowerGood unit="pp" />
          )
        }
        right={
          <Chip tone="warn">
            Renewal Churn{" "}
            {fmt(
              decided.length
                ? (decided.filter((r) => r.outcome !== "RENEWED").length / decided.length) * 100
                : null,
              "%",
            )}
          </Chip>
        }
        noteKey="churn"
        noteLines={summaryRules(
          {
            metric: "Gross Churn",
            values: churnChart.flatMap((r) => (r.gross == null ? [] : [r.gross])),
            base: sum(churn, "active_at_start"),
            unit: "%",
            empty: !churn.length,
          },
          ["R-MAX", "R-STABLE", "R-SMALLN"],
        )}
        howToRead="% = หลุดในเดือน ÷ active ต้นเดือน"
        legend={
          <>
            <span className="text-dash-watch">━ ORM</span>
            <span className="text-series-2">┄ Marcom</span>
          </>
        }
      >
        {churn.length ? (
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={churnChart}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    const r = payload?.[0]?.payload;
                    return active && r ? (
                      <ChartTooltip
                        header={r.month}
                        lines={["ORM", "Marcom"]
                          .filter((line) => filter.service === "ALL" || filter.service === line)
                          .map((line) => {
                            const rows = r.rows.filter((x: PsReportRow) => x.service_line === line);
                            return `${line} ${fmt(ratio(rows, "out_count", "active_at_start"), "%")} (${sum(rows, "out_count")}/${sum(rows, "active_at_start")} โรงแรม)`;
                          })}
                      />
                    ) : null;
                  }}
                />
                {filter.service !== "Marcom" && (
                  <Line
                    type="monotone"
                    dataKey="ORM"
                    stroke="var(--watch-line)"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={churnDot("ORM")}
                    activeDot={{ r: 6 }}
                  />
                )}
                {filter.service !== "ORM" && (
                  <Line
                    type="monotone"
                    dataKey="Marcom"
                    stroke="var(--series-2)"
                    strokeDasharray="6 4"
                    strokeWidth={2.5}
                    dot={churnDot("Marcom")}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartSkeleton text={emptyText} />
        )}
      </DashCard>
      <DashCard
        title="③ Renewal"
        question="ครบกำหนดงวดนี้ ต่อกี่ราย?"
        answer={fmt(renewalSuccess, "%")}
        answerSub={`ต่อสำเร็จ ${renewed} / ${decided.length}`}
        noteKey="renewal"
        noteLines={summaryRules(
          {
            metric: "ต่อสำเร็จ",
            share: [{ group: "ต่อสำเร็จ", n: renewed, total: decided.length }],
            split: groups.flatMap((group) => {
              const g = renewals.filter((r) => String(r[groupBy] ?? "ไม่ระบุ") === group),
                gd = g.filter((r) => r.outcome !== "IN_PROGRESS");
              return gd.length
                ? [
                    {
                      group,
                      value: (g.filter((r) => r.outcome === "RENEWED").length / gd.length) * 100,
                    },
                  ]
                : [];
            }),
            empty: !renewals.length,
          },
          ["R-SHARE", "R-SPLIT"],
        )}
        howToRead="ชี้วงหรือรายการเพื่อดูสัดส่วนแต่ละผล · IN_PROGRESS ไม่นับในตัวหาร"
      >
        {renewals.length ? (
          <>
            <RenewalDonut
              outcomes={outcomes}
              colors={donutColors}
              total={decided.length}
              success={renewalSuccess}
            />
            <p className="mb-4 text-xs text-muted-foreground">
              + กำลังเจรจา {renewals.filter((r) => r.outcome === "IN_PROGRESS").length} ราย
              (ไม่นับในตัวหาร)
            </p>
            <div className="mb-3 flex gap-1" role="group" aria-label="แยกผลการต่อสัญญา">
              {(["service_line", "ae_owner_id"] as const).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={groupBy === k ? "default" : "outline"}
                  onClick={() => setGroupBy(k)}
                >
                  {k === "service_line" ? "ราย service" : "ราย AE"}
                </Button>
              ))}
            </div>
            <div className="mb-4 space-y-2">
              {groups.map((group) => {
                const g = renewals.filter((r) => String(r[groupBy] ?? "ไม่ระบุ") === group),
                  gd = g.filter((r) => r.outcome !== "IN_PROGRESS"),
                  nr = g.filter((r) => r.outcome === "RENEWED").length;
                return (
                  <ChartHint
                    key={group}
                    header={`${group} · ${gd.length ? fmt((nr / gd.length) * 100, "%") : "—"}`}
                    lines={[`ต่อสำเร็จ ${nr}/${gd.length} ราย`]}
                  >
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-between gap-3 px-0 text-xs"
                    >
                      <span className="w-20 shrink-0 text-left">{group}</span>
                      <svg
                        className="h-5 min-w-0 flex-1"
                        viewBox="0 0 200 20"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <rect width="200" height="20" rx="4" fill="var(--accent-soft)" />
                        <rect
                          width={gd.length ? (nr / gd.length) * 200 : 0}
                          height="20"
                          rx="4"
                          fill="var(--primary)"
                        />
                      </svg>
                      <span>
                        {gd.length ? fmt((nr / gd.length) * 100, "%") : "—"} ({nr}/{gd.length})
                      </span>
                    </Button>
                  </ChartHint>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">{groupBy === "service_line" ? "บริการ" : "AE"}</th>
                    {["RENEWED", "NOT_RENEWED", "IN_PROGRESS", "LOST"].map((label) => (
                      <th className="px-2" key={label}>
                        {label}
                      </th>
                    ))}
                    <th>%สำเร็จ</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const g = renewals.filter((r) => String(r[groupBy] ?? "ไม่ระบุ") === group),
                      gd = g.filter((r) => r.outcome !== "IN_PROGRESS"),
                      success = gd.length
                        ? (g.filter((r) => r.outcome === "RENEWED").length / gd.length) * 100
                        : null;
                    return (
                      <tr className="border-t" key={group}>
                        <td className="py-3">{group}</td>
                        {["RENEWED", "NOT_RENEWED", "IN_PROGRESS", "LOST"].map((outcome) => (
                          <td key={outcome} className="px-2">
                            {g.filter((r) => r.outcome === outcome).length}
                          </td>
                        ))}
                        <td>{fmt(success, "%")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <ChartSkeleton text={emptyText} />
        )}
      </DashCard>
      <DashCard
        title="④ Contract Lifetime"
        question="ลูกค้าอยู่กับเรานานแค่ไหน?"
        answer={fmt(median, " วัน")}
        answerSub={
          comparisonFilter
            ? compareSub(comparisonLife, " วัน")
            : "ค่ากลาง (median) · สัญญาที่จบแล้ว"
        }
        noteKey="lifetime"
        noteLines={summaryRules(
          {
            metric: "อายุสัญญา",
            fixed:
              median == null
                ? ""
                : `สัญญาที่จบแล้วอยู่ได้ราว ${fmt(median)} วัน · ครึ่งกลางอยู่ ${fmt(p25)}–${fmt(p75)} วัน`,
            empty: !lifetime.length,
          },
          ["R-SHARE"],
        )}
        howToRead="1 จุด = 1 สัญญา · จุดยิ่งสูงยิ่งอยู่นาน · จุดกลวง = ยังใช้บริการอยู่"
        legend={
          <>
            <span>● จบแล้ว</span>
            <span>○ ยัง active</span>
            <span>▰ ช่วงครึ่งกลาง</span>
          </>
        }
      >
        {lifetime.length ? (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <ScatterChart margin={{ left: 0, right: 20, top: 20, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="number" dataKey="y" unit=" วัน" tick={{ fontSize: 11 }} />
                  {p25 !== null && p75 !== null && (
                    <ReferenceArea y1={p25} y2={p75} fill="var(--accent-soft)" fillOpacity={0.75} />
                  )}
                  {median !== null && (
                    <ReferenceLine
                      y={median}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      label={{
                        value: `median ${fmt(median)} วัน`,
                        position: "insideTopRight",
                        fill: "var(--accent-strong)",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Scatter name="จบแล้ว" data={lifePoints(ended, true)} shape={pointShape} />
                  <Scatter name="ยัง active" data={lifePoints(active, false)} shape={pointShape} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-primary">
              ครึ่งกลาง {fmt(p25)}–{fmt(p75)} วัน · {ended.length} สัญญาที่จบแล้ว
            </p>
          </>
        ) : (
          <ChartSkeleton text={emptyText} />
        )}
      </DashCard>
      <div className={compareSide ? "" : "lg:col-span-2"}>
        <DashCard
          title="⑤ On-board · Finished Cohort"
          question="เซ็นสัญญา → Go-Live ใช้กี่วัน?"
          answer={fmt(onboardMedian, " วัน")}
          answerTone="onboard"
          answerSub={
            comparisonFilter ? (
              compareSub(comparisonOnboard, " วัน", true)
            ) : (
              <Delta a={onboardMedian} b={previousMedian} lowerGood unit=" วัน" />
            )
          }
          noteKey="onboard"
          noteLines={summaryRules(
            {
              metric: "เวลา Go-Live",
              values: cohort.flatMap((r) =>
                typeof r["median_days"] === "number" ? [r["median_days"]] : [],
              ),
              unit: " วัน",
              split: lastCohort
                ? ["orm_days", "marcom_days"].flatMap((k) =>
                    typeof lastCohort[k] === "number"
                      ? [
                          {
                            group: k === "orm_days" ? "ORM" : "Marcom",
                            value: Number(lastCohort[k]),
                          },
                        ]
                      : [],
                  )
                : [],
              faster: true,
              empty: !cohort.length,
            },
            ["R-TREND", "R-SPLIT"],
          )}
          howToRead="แท่งเตี้ยลง = เร็วขึ้น · แต่ละแท่ง = การ์ดที่ Go-Live ในเดือนนั้น"
        >
          {cohort.length ? (
            <>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={cohort} margin={{ top: 25, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="billing_period" tickFormatter={(v) => String(v).slice(0, 7)} />
                    <YAxis unit=" วัน" />
                    <Tooltip
                      content={({ active, payload }) => {
                        const r = payload?.[0]?.payload;
                        return active && r ? (
                          <ChartTooltip
                            header={`${String(r.billing_period).slice(0, 7)} · median ${fmt(r["median_days"])} วัน`}
                            lines={[
                              `ORM ${fmt(typeof r.orm_days === "number" ? r.orm_days : null)} วัน · Marcom ${fmt(typeof r.marcom_days === "number" ? r.marcom_days : null)} วัน`,
                              ...(typeof r.go_live_count === "number"
                                ? [`Go-Live ${r.go_live_count} การ์ด`]
                                : []),
                            ]}
                          />
                        ) : null;
                      }}
                    />
                    <Bar
                      dataKey="median_days"
                      shape={barShape("median_days")}
                      fill="var(--series-2)"
                      fillOpacity={compareSide === "B" ? 0.45 : 1}
                      radius={[4, 4, 0, 0]}
                    >
                      {cohort.length <= 8 && <LabelList dataKey="median_days" position="top" />}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Metric label="Survey #1" value={fmt(wavg(cohort, "survey1"))} />
                <Metric label="Survey #2" value={fmt(wavg(cohort, "survey2"))} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["ae", "specialist", "orm", "marcom"] as const).map((k) => (
                  <Metric
                    key={k}
                    label={`Σ ${k} · ไม่บวกรวม`}
                    value={fmt(wavg(cohort, k) ?? wavg(cohort, k + "_days"), " วัน")}
                  />
                ))}
              </div>
            </>
          ) : (
            <ChartSkeleton text={emptyText} />
          )}
        </DashCard>
      </div>
      <DashCard
        title="⑥ Off-board"
        question="บริการที่สิ้นสุดเป็นอย่างไร?"
        noteKey="offboard"
        noteLines={summaryRules({ metric: "Off-board", empty: true }, ["R-EMPTY"])}
        howToRead="รอข้อมูลจากต้นทาง"
      >
        <ChartSkeleton source />
      </DashCard>
      <div className={compareSide ? "" : "lg:col-span-2"}>
        <DashCard
          title="⑦a Risk Scorecard"
          question="มีโรงแรมเสี่ยงกี่ราย เสี่ยงด้านไหน?"
          answer={tiered.length ? `${tierCount("high")} / ${tiered.length}` : "—"}
          answerTone="action"
          answerSub={`Attach-rate ${fmt(ratio(attach, "attached_hotels", "active_hotels"), "%")}`}
          right={
            <Button asChild variant="ghost" size="sm">
              <Link to="/ps/templates">
                กฎความเสี่ยง
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
          noteKey="risk"
          noteLines={summaryRules(
            {
              metric: "ความเสี่ยง",
              share: dims.map(({ d, count }) => ({
                group: DIM_TH[d],
                n: count,
                total: tiered.length,
              })),
              empty: !tiered.length,
            },
            ["R-SHARE"],
          )}
          howToRead="แต่ละแท่ง = โรงแรมที่มีสัญญาณด้านนั้น · โรงแรมเดียวอยู่ได้หลายด้าน"
        >
          {tiered.length ? (
            <div className="space-y-2">
              {dims.map(({ d, count }) => (
                <ChartHint
                  key={d}
                  header={`${DIM_TH[d]} · ${count} โรงแรม (${fmt((count / tiered.length) * 100)}% ของ active)`}
                  lines={[
                    `${count}/${tiered.length} โรงแรม`,
                    ...(d === "GRADE_CD" ? [`Grade D ${gradeD} โรงแรม`] : []),
                  ]}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setDimFilter(dimFilter === d ? null : d)}
                    className={cn(
                      "flex h-auto w-full justify-between gap-4 px-0 py-2 text-left",
                      dimFilter === d && "bg-secondary",
                    )}
                  >
                    <span className="w-36 shrink-0 whitespace-normal text-xs">{DIM_TH[d]}</span>
                    <svg
                      className="h-6 flex-1"
                      viewBox="0 0 300 24"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <rect width="300" height="24" rx="4" fill="var(--accent-soft)" />
                      <rect
                        width={(count / tiered.length) * 300}
                        height="24"
                        rx="4"
                        fill="var(--primary)"
                      />
                      {d === "GRADE_CD" && (
                        <rect
                          width={(gradeD / tiered.length) * 300}
                          height="24"
                          rx="4"
                          fill="var(--grade-action)"
                        />
                      )}
                    </svg>
                    <span className="w-8 text-right">{count} →</span>
                  </Button>
                </ChartHint>
              ))}
              <p className="text-xs text-text-caption">Flag · รอ source</p>
            </div>
          ) : (
            <ChartSkeleton text={emptyText} />
          )}
          <CrossSellPanel
            rows={crossRows}
            attachRows={attach.length}
            pending={expansionPending || !report}
          />
        </DashCard>
      </div>
      <div className={compareSide ? "" : "lg:col-span-2"}>
        <DashCard
          title="ถึงรอบขึ้นค่าบริการ (Repricing)"
          question="บัญชีใดมีข้อมูลอ้างอิงค่าบริการ?"
          noteKey="repricing"
          noteLines={summaryRules(
            {
              metric: "Repricing",
              share: [{ group: "ข้อมูลอ้างอิง", n: repriceRows.length, total: repriceRows.length }],
              empty: repricePending || !repriceRows.length,
            },
            ["R-SHARE"],
          )}
          howToRead="อ้างอิง · AE เคาะราคาจริง"
        >
          <RepricingBox rows={repriceRows} pending={repricePending || !report} />
        </DashCard>
      </div>
      {compareSide !== "B" && (
        <div className={compareSide ? "" : "lg:col-span-2"}>
          <DashCard
            title="⑦b Account Health"
            question="ใครเสี่ยง และเสี่ยงเพราะอะไร?"
            answer={
              tiered.length ? (
                <div className="flex gap-3 text-xl">
                  <span className="text-dash-good">● {tierCount("healthy")}</span>
                  <span className="text-dash-watch">● {tierCount("watch")}</span>
                  <span className="text-dash-action">● {tierCount("high")}</span>
                </div>
              ) : (
                "—"
              )
            }
            noteKey="health"
            noteLines={summaryRules(
              {
                metric: "Account Health",
                share: [
                  { group: "High-risk", n: tierCount("high"), total: tiered.length },
                  { group: "Watch", n: tierCount("watch"), total: tiered.length },
                ],
                empty: !tiered.length,
              },
              ["R-SHARE"],
            )}
            howToRead="เรียงเสี่ยงมาก → น้อย · chip บอกว่าเสี่ยงเพราะอะไร · คลิกแถวเปิด Account 360"
          >
            {hotels.length ? (
              <>
                <div className="dash-health-bar">
                  {(["healthy", "watch", "high"] as const).map(
                    (t) =>
                      tierCount(t) > 0 && (
                        <ChartHint
                          key={t}
                          header={`${TIER[t].label} · ${tierCount(t)} โรงแรม (${fmt((tierCount(t) / tiered.length) * 100)}%)`}
                          lines={[
                            `${tierCount(t)}/${tiered.length} โรงแรม`,
                            t === "high"
                              ? "Grade D หรือมีสัญญาณเสี่ยงอย่างน้อย 2 ด้าน"
                              : t === "watch"
                                ? "มีสัญญาณเสี่ยง 1 ด้าน"
                                : "ไม่พบสัญญาณเสี่ยงตามเกณฑ์",
                          ]}
                        >
                          <Button
                            variant="ghost"
                            className={
                              t === "healthy"
                                ? "health-good"
                                : t === "watch"
                                  ? "health-watch"
                                  : "health-action"
                            }
                            style={{ flexGrow: tierCount(t) }}
                            onClick={() => setTierFilter(t)}
                          >
                            {fmt((tierCount(t) / tiered.length) * 100, "%")}
                          </Button>
                        </ChartHint>
                      ),
                  )}
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {(["all", "high", "watch", "healthy"] as const).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={tierFilter === t ? "default" : "outline"}
                      onClick={() => setTierFilter(t)}
                    >
                      {t === "all" ? "ทั้งหมด" : `${TIER[t].dot} ${TIER[t].label} ${tierCount(t)}`}
                    </Button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {(["service_line", "ae_owner_id"] as const).map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={distBy === k ? "default" : "outline"}
                      onClick={() => setDistBy(k)}
                    >
                      {k === "service_line" ? "tier×service" : "tier×owner"}
                    </Button>
                  ))}
                </div>
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  {distKeys.map((k) => {
                    const g = tiered.filter((h) => String(h.row[distBy] ?? "ไม่ระบุ") === k);
                    return (
                      <span key={k} className="rounded border px-2 py-1">
                        <b>{k}</b> · 🔴{g.filter((h) => h.tier === "high").length} 🟡
                        {g.filter((h) => h.tier === "watch").length} 🟢
                        {g.filter((h) => h.tier === "healthy").length}
                      </span>
                    );
                  })}
                </div>
                {dimFilter && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    กรองด้าน: {DIM_TH[dimFilter]} ·{" "}
                    <Button variant="link" size="sm" onClick={() => setDimFilter(null)}>
                      ล้าง
                    </Button>
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        {[
                          "โรงแรม",
                          "Tier",
                          "Score",
                          "Grade ล่าสุด / แย่สุด",
                          "ด้านเสี่ยง",
                          "Flag",
                          "#svc",
                        ].map((label) => (
                          <th key={label} className="px-2 py-2">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map(({ row, dims: hit, tier, score, compound, hotel_id }) => (
                        <tr
                          key={hotel_id}
                          className="cursor-pointer border-t hover:bg-muted focus-visible:outline focus-visible:outline-primary"
                          tabIndex={0}
                          onClick={() => openAccount360(hotel_id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openAccount360(hotel_id);
                            }
                          }}
                          data-testid="health-row"
                        >
                          <td className="px-2 py-3">
                            <span className="inline-flex flex-wrap items-center gap-1 text-primary">
                              {String(row.hotel_name ?? hotel_id)}
                              <ArrowUpRight className="size-3 shrink-0" />
                              {compound && (
                                <span className="dash-tier-pill text-dash-action">
                                  ⚠ ORM churn-risk
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-2">
                            <span
                              className={cn(
                                "dash-tier-pill",
                                tier === "high"
                                  ? "text-dash-action"
                                  : tier === "watch"
                                    ? "text-dash-watch"
                                    : tier === "healthy"
                                      ? "text-dash-good"
                                      : "text-muted-foreground",
                              )}
                            >
                              ● {TIER[tier].label}
                            </span>
                          </td>
                          <td className="px-2">{tier === "pending" ? "—" : score}</td>
                          <td className="px-2">
                            {String(row.latest_grade ?? "—")} / {String(row.worst_grade ?? "—")}
                          </td>
                          <td className="px-2">
                            <div className="flex flex-wrap gap-1">
                              {tier === "pending" ? (
                                <span className="dash-signal-chip">รอข้อมูล</span>
                              ) : hit.length ? (
                                hit.map((d) => (
                                  <span key={d.code} className="dash-signal-chip">
                                    {d.code === "TIER_A_PERSIST"
                                      ? d.value
                                      : d.value
                                        ? `${d.label} ${d.value}`
                                        : d.label}
                                  </span>
                                ))
                              ) : (
                                <span className="dash-signal-chip">ไม่เข้าเกณฑ์</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 text-xs text-muted-foreground">รอ source</td>
                          <td className="px-2">{String(row.active_services ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <ChartSkeleton text={emptyText} />
            )}
          </DashCard>
        </div>
      )}
    </div>
  );
}

function RenewalDonut({
  outcomes,
  colors,
  total,
  success,
}: {
  outcomes: { outcome: string; count: number }[];
  colors: string[];
  total: number;
  success: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover == null ? null : outcomes[hover];
  return (
    <div className="mb-3 grid items-center gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="relative h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={outcomes}
              dataKey="count"
              nameKey="outcome"
              innerRadius={57}
              outerRadius={76}
              paddingAngle={3}
              onMouseEnter={(_, i) => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {outcomes.map((r, i) => (
                <Cell
                  key={r.outcome}
                  fill={colors[i]}
                  stroke="var(--card)"
                  strokeWidth={hover === i ? 4 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload;
                return active && r ? (
                  <ChartTooltip
                    header={`${r.outcome} ${total ? fmt((r.count / total) * 100, "%") : "—"}`}
                    lines={[`${r.count}/${total} ราย`]}
                  />
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <b className="text-xl text-primary">
            {current && total ? fmt((current.count / total) * 100, "%") : fmt(success, "%")}
          </b>
          <span className="text-xs text-muted-foreground">
            {current ? `${current.count} / ${total}` : "ต่อสำเร็จ"}
          </span>
        </div>
      </div>
      <ul>
        {outcomes.map((r, i) => (
          <li key={r.outcome}>
            <ChartHint
              header={`${r.outcome} ${total ? fmt((r.count / total) * 100, "%") : "—"}`}
              lines={[`${r.count}/${total} ราย`]}
            >
              <Button
                variant="ghost"
                className="h-auto w-full justify-between px-2 py-2 text-xs"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              >
                <span
                  className={
                    i === 0 ? "text-primary" : i === 1 ? "text-dash-watch" : "text-dash-action"
                  }
                >
                  ● {r.outcome}
                </span>
                <span>
                  {r.count} · {total ? fmt((r.count / total) * 100, "%") : "—"}
                </span>
              </Button>
            </ChartHint>
          </li>
        ))}
      </ul>
    </div>
  );
}
