/* PS Dashboard Shell v1.0 — Headline KPI strip + shared filter + AC tab (read-only).
 * AC data comes only from the existing v_ac_* views (cloud mirror, C5); nothing here mutates
 * AC data. Signed/Won are re-homed from BD-AC using the unchanged v_bdac_flow projection. */
import { DASHBOARD_TABS, GRADE_D_LABEL } from "@/lib/ps-glossary";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Minus, Triangle } from "lucide-react";
import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";

import { Chip } from "@/components/crm/crm-ui";
import { BdacTab } from "@/components/ps/bdac-tab";
import { AcTab as AcTabV2 } from "@/components/ps/ac-tab";
import { PsReportTab } from "@/components/ps/ps-report-tab";
import { Account360Provider } from "@/components/ps/account-360";
import { MeetingAnalyzerTab } from "./meeting-analyzer-tab";
import { readMeetingDashboard } from "@/lib/meeting-dashboard.functions";
import { demoMeetingReport } from "@/lib/meeting-dashboard-demo";
import { readPsDashboard } from "@/lib/ps-dashboard.functions";
import { latestPeriod, psScope, ratio, type PsReport } from "@/lib/ps-dashboard-types";
import { buildDemoReport, demoAcViews, demoBdacLifecycles, demoLifecycles, BDAC_DEMO_NOW, DEMO_NOW } from "@/lib/ps-demo-fixture";
import { Button } from "@/components/ui/button";
import { useAcTabInput, useAcViews } from "./use-ac-views";
import { BdacFinanceSection } from "./bdac-finance-section";
import { formatFullDateEn } from "@/lib/date-en";
import { v_bdac_flow, v_bdac_deal_aging } from "@/lib/bdac-views";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import {
  DashboardGlobal,
  defaultGlobalFilter,
  matchesBook,
  scopePeriod,
  selectedPeriod,
  periodRange,
  deltaText,
  monthPeriod,
  useDashboardGlobal,
  type GlobalFilter,
} from "@/lib/ps-dashboard-global";
import { DashboardGlobalFilters } from "./dashboard-global-filters";
import { DashboardCompare } from "./dashboard-compare";
import { TaskTab } from "./task-tab";
import { useHrMembers, teamLabel } from "@/lib/hr-members";
import { cn } from "@/lib/utils";
import { ChartHint, SummaryNote, Delta } from "./dash-card";
import { summaryRules } from "@/lib/summaryRules";
import { latestGradeD, monYY } from "@/lib/ac-revenue";
import { InfoButton, type InfoBlocks } from "./dash-card";
import type { PsReportRow } from "@/lib/ps-dashboard-types";

type Filter = GlobalFilter;
const FilterCtx = createContext<Filter>(defaultGlobalFilter);
const PsReportCtx = createContext<{
  data?: PsReport | undefined;
  isLoading: boolean;
  isError: boolean;
}>({ isLoading: true, isError: false });

type RowKey =
  | "billing_period"
  | "service_line"
  | "outstanding"
  | "customer_count"
  | "invoice_count"
  | "grade"
  | "customer_id"
  | "customer_segment"
  | "hotel_id"
  | "amount"
  | "rank"
  | "previous_month_rank"
  | "lifetime_average_rank";
type Row = Partial<Record<RowKey, string | number | boolean | null>>;
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Rows inside the selected window; shift=-1 gives the same window one month earlier (MoM). */
function scope(rows: Row[], f: Filter, shift = 0, now = new Date()) {
  return scopePeriod(rows, f, selectedPeriod(f, now, shift === 0 ? "A" : "B"));
}

function useMeetingViews() {
  const { demo } = useDashboardGlobal();
  const read = useServerFn(readMeetingDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({
    queryKey: ["meeting-dashboard-views"],
    queryFn: () => read(),
    staleTime: 60_000,
    enabled: ready && !demo,
  });
  const fixture = useMemo(() => (demo ? demoMeetingReport() : undefined), [demo]);
  return demo ? { data: fixture, isLoading: false, isError: false } : real;
}
function MeetingTab() {
  const report = useMeetingViews();
  return (
    <MeetingAnalyzerTab report={report.data} loading={report.isLoading} error={report.isError} />
  );
}

function Mom({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null) return <span className="text-xs text-muted-foreground">— รอสะสม</span>;
  const d = cur - prev;
  const pct = prev ? ` (${((d / prev) * 100).toFixed(0)}%)` : "";
  const I = d === 0 ? Minus : Triangle;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <I className={cn("size-3", d < 0 && "rotate-180")} />
      {d > 0 ? "+" : ""}
      {d.toLocaleString("th-TH")}
      {pct}
    </span>
  );
}

function Tile({
  label,
  value,
  mom,
  tone,
  placeholder,
}: {
  label: string;
  value?: string;
  mom?: ReactNode;
  tone?: "warn";
  placeholder?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3",
        placeholder && "bg-muted/40 opacity-70",
        tone === "warn" && "border-warning/60",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      {placeholder ? (
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          {placeholder}
        </p>
      ) : (
        <>
          <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          <div className="mt-1">{mom}</div>
        </>
      )}
    </div>
  );
}

const Empty = ({ text = "รอ Cloud Sync seed — ยังไม่มีข้อมูลในรายงาน" }: { text?: string }) => (
  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
    {text}
  </p>
);

export function DashboardShell({
  servicing,
  overview,
  header,
}: {
  servicing: ReactNode;
  overview?: ReactNode;
  header?: ReactNode;
}) {
  const read = useServerFn(readPsDashboard);
  const [filterState, setFilter] = useState<Filter>(defaultGlobalFilter);
  const { members } = useHrMembers();
  const filter = useMemo(
    () => ({
      ...filterState,
      ownerAliases: Object.fromEntries(
        members.map((m) => [m.id, [m.nickname, teamLabel(m.orm_team)].filter(Boolean)]),
      ),
    }),
    [filterState, members],
  );
  const [tab, setTab] = useState("ps");
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setDemo(sp.get("demo") === "1");
    // R1.2 §1: tab keys are unchanged (labels/order only), so ?tab=<key> links keep opening the same tab.
    const t = sp.get("tab");
    if (t && DASHBOARD_TABS.some(([k]) => k === t)) setTab(t);
    setReady(true);
  }, []);
  useEffect(() => {
    const update = () => setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const toggleDemo = () => {
    const on = !demo;
    setDemo(on);
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("demo", "1");
    else url.searchParams.delete("demo");
    window.history.replaceState(window.history.state, "", url);
  };
  const ps = useQuery({
    queryKey: ["ps-dashboard-views"],
    queryFn: () => read(),
    staleTime: 60_000,
    enabled: ready && !demo,
  });
  const demoReport = useMemo(() => (demo ? buildDemoReport(filter) : undefined), [demo, filter]);
  const data = useMemo(() => {
    if (demoReport) return demoReport;
    if (!ps.data) return undefined;
    return {
      ...ps.data,
      views: Object.fromEntries(
        Object.entries(ps.data.views).map(([key, rows]) => [
          key,
          rows.filter((row) =>
            matchesBook(
              row,
              filter,
              key === "v_ps_lifecycle_flow" || key === "v_ps_account_health",
            ),
          ),
        ]),
      ) as PsReport["views"],
    };
  }, [demoReport, ps.data, filter]);
  const report = { data, isLoading: !demo && ps.isLoading, isError: !demo && ps.isError };
  const nowString = demo ? DEMO_NOW : new Date().toISOString();
  const now = new Date(nowString);
  const { lifecycles } = useContractLifecycle();
  const deals = demo ? demoLifecycles() : lifecycles;
  const lines = deals.filter((d) =>
    matchesBook(
      {
        service_line: d.service_line === "MARCOM" ? "Marcom" : d.service_line,
        hotel_id: d.hotel_id,
        hotel_name: d.hotel_name,
        ae_owner_id:
          data?.views.v_ps_account_health.find((r) => r.hotel_id === d.hotel_id)?.["ae_owner_id"] ??
          (demo ? d.bd_owner_id : null),
      },
      filter,
    ),
  );
  const wonMtd = v_bdac_flow(lines, periodRange(selectedPeriod(filter, now))).won;
  /* BD-AC v2.0 demo uses its own fixture + clock (2026-10-17); the PS spine stays unchanged. */
  const bdacNow = demo ? new Date(BDAC_DEMO_NOW) : now;
  const bdacLines = (demo ? demoBdacLifecycles() : lifecycles).filter((d) =>
    matchesBook(
      {
        service_line: d.service_line === "MARCOM" ? "Marcom" : d.service_line,
        hotel_id: d.hotel_id,
        hotel_name: d.hotel_name,
        ae_owner_id: demo ? d.bd_owner_id : null,
      },
      filter,
    ),
  );
  const periodFilter = {
    ...filter,
    ...(filter.compare || filter.range === "custom" ? { period: selectedPeriod(filter, now) } : {}),
  };
  return (
    <DashboardGlobal.Provider value={{ filter, demo, now: nowString }}>
      <FilterCtx.Provider value={filter}>
        <PsReportCtx.Provider value={report}>
          <Account360Provider report={report.data}>
            <div className="ps-dashboard-visual flex min-w-0 flex-col gap-4">
              <DashboardGlobalFilters
                value={filter}
                onChange={setFilter}
                demo={demo}
                onDemo={toggleDemo}
                now={now}
              />
              <HeadlineStrip />
              {header}
              <div
                className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1"
                role="tablist"
                aria-label="Dashboard tabs"
              >
                {DASHBOARD_TABS.map(([k, l]) => (
                  <Button
                    key={k}
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => {
                      if (k) setTab(k);
                    }}
                    data-tab-key={k}
                    variant={tab === k ? "default" : "ghost"}
                    className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium"
                  >
                    {l}
                  </Button>
                ))}
              </div>
              <div data-testid="active-dashboard-tab" className="min-w-0 space-y-4">
                {demo && (
                  <p className="text-xs font-semibold text-warning-foreground">
                    {/* BD-AC v2.2 K2: Tab BD-AC runs on its own demo clock (2026-10-17); other tabs keep theirs. */}
                    DEMO · {tab === "bdac" ? formatFullDateEn(BDAC_DEMO_NOW) : "30 Sep 2026"}
                  </p>
                )}
                {filter.compare && (
                  <DashboardCompare
                    report={data}
                    ac={demo ? demoAcViews() : undefined}
                    deals={lines}
                    tab={tab === "ac" ? "" : tab}
                  />
                )}
                {tab === "bdac" &&
                  (filter.compare ? (
                    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                      {(["A", "B"] as const).map((side) => (
                        <div key={side} className="min-w-0">
                          <h2 className="mb-3 text-sm font-semibold">Period {side}</h2>
                          <BdacTab
                            source={bdacLines}
                            globalFilter={{ ...filter, periodA: selectedPeriod(filter, bdacNow, side) }}
                            clock={bdacNow.getTime()}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <BdacTab source={bdacLines} globalFilter={filter} clock={bdacNow.getTime()} />
                  ))}
                {tab === "bdac" && <BdacFinanceSection />}
                {tab === "ac" && <AcTab />}
                {tab === "ps" && (
                  <>
                    {filter.compare ? (
                      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                        {(["A", "B"] as const).map((side) => (
                          <div key={side} className="min-w-0 space-y-3">
                            <h2 className="border-b pb-2 font-semibold">
                              Period {side} · {selectedPeriod(filter, now, side).from} —{" "}
                              {selectedPeriod(filter, now, side).to}
                            </h2>
                            <PsReportTab
                              report={data}
                              filter={{ ...filter, period: selectedPeriod(filter, now, side) }}
                              loading={report.isLoading}
                              error={report.isError}
                              comparisonFilter={
                                side === "A"
                                  ? { ...filter, period: selectedPeriod(filter, now, "B") }
                                  : undefined
                              }
                              compareSide={side}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <PsReportTab
                        report={data}
                        filter={periodFilter}
                        loading={report.isLoading}
                        error={report.isError}
                        wonMtd={wonMtd}
                      />
                    )}
                    {overview}
                  </>
                )}
                {tab === "meeting" && <MeetingTab />}
                {tab === "task" && <TaskTab />}
                {tab === "servicing" && servicing}
              </div>
            </div>
          </Account360Provider>
        </PsReportCtx.Provider>
      </FilterCtx.Provider>
    </DashboardGlobal.Provider>
  );
}

function HeadlineStrip() {
  const f = useContext(FilterCtx),
    global = useDashboardGlobal(),
    ps = useContext(PsReportCtx);
  const now = new Date(global.now),
    pf = { ...f, ...(f.compare ? { period: f.periodA } : {}) },
    bf = { ...f, ...(f.compare ? { period: f.periodB } : {}) };
  const churnRows = latestPeriod(
    psScope(ps.data?.views.v_ps_churn_monthly ?? [], pf, "billing_period", 0, now),
  );
  const churnPrev = ratio(
    latestPeriod(psScope(ps.data?.views.v_ps_churn_monthly ?? [], bf, "billing_period", -1, now)),
    "out_count",
    "active_at_start",
  );
  const churnNow = ratio(churnRows, "out_count", "active_at_start");
  const q = useAcViews();
  const { lifecycles } = useContractLifecycle();
  const lines = (global.demo ? demoBdacLifecycles() : lifecycles).filter((d) =>
    matchesBook(
      {
        service_line: d.service_line === "MARCOM" ? "Marcom" : d.service_line,
        ae_owner_id: global.demo
          ? d.bd_owner_id
          : (ps.data?.views.v_ps_account_health.find((r) => r.hotel_id === d.hotel_id)
              ?.ae_owner_id ?? null),
      },
      f,
    ),
  );
  const upcoming = v_bdac_deal_aging(lines, (global.demo ? new Date(BDAC_DEMO_NOW) : now).getTime());
  const active = (ps.data?.views.v_ps_account_health ?? []).filter(
    (r) => r.status === "ACTIVE" && r.active_services != null,
  );
  const activeIds = new Set(active.map((r) => r.hotel_id));
  const cohort = latestPeriod(
    psScope(ps.data?.views.v_ps_onboard_cohort ?? [], pf, "billing_period", 0, now),
  );
  // Queue and collection percentage are not exposed by the current sources. Never substitute a different metric.
  const median =
    cohort.length === 1 && typeof cohort[0]?.["median_days"] === "number"
      ? cohort[0]["median_days"]
      : null;
  const gradeD = latestGradeD((q.data?.["v_ac_grade_distribution"] ?? []) as PsReportRow[], selectedPeriod(f, now, "A"), f.service);
  const dCount = gradeD?.d ?? null;
  const lost =
    churnRows.length && churnRows.every((r) => r.hotel_id != null)
      ? new Set(churnRows.filter((r) => num(r["out_count"]) > 0).map((r) => r.hotel_id)).size
      : null;
  const serviceCount = (line: string) =>
    new Set(active.filter((r) => r.service_line === line).map((r) => r.hotel_id)).size;
  const empty = summaryRules({ metric: "ภาพรวม", empty: true }, ["R-EMPTY"]);
  const growth = [
    ...summaryRules({ metric: "Upcoming Hotel", current: upcoming.length }, ["R-DELTA"]),
    ...summaryRules({ metric: "Active Hotel", current: activeIds.size }, ["R-DELTA"]),
  ];
  const onboard = summaryRules(
    { metric: "On-board", current: median, unit: " วัน", empty: median == null },
    ["R-SPLIT"],
  );
  const watch =
    churnNow != null && churnPrev != null && churnNow > churnPrev
      ? summaryRules({ metric: "Churn", current: churnNow, previous: churnPrev, unit: "pp" }, [
          "R-DELTA",
        ])
      : ["ไม่มีตัวชี้วัดที่แย่ลงจากเดือนก่อน"];
  const tile = (
    label: string,
    value: string,
    sub: ReactNode,
    caption: string,
    details: string[],
    info: InfoBlocks,
  ) => (
    <div className="relative">
    <span className="absolute right-1 top-1 z-10"><InfoButton info={info} label={`ที่มา ${label}`} /></span>
    <ChartHint header={`${label} · ${value}`} lines={details}>
      <Button variant="ghost" className="dash-kpi">
        <span className="dash-kpi-label">{label}</span>
        <span className="dash-kpi-number">{value}</span>
        <span className="text-xs">{sub}</span>
        <span className="dash-kpi-caption">{caption}</span>
      </Button>
    </ChartHint>
    </div>
  );
  return (
    <div data-testid="headline-strip">
      <div className="dash-headline-groups">
        <div className="dash-headline-group dash-growth">
          <p className="dash-headline-label">โต</p>
          <div className="dash-headline-tiles">
            {tile(
              "Upcoming Hotel",
              lines.length ? String(upcoming.length) : "—",
              <Delta a={null} b={null} />,
              "Stage 6–9",
              [
                `ORM ${upcoming.filter((r) => r.deal.service_line === "ORM").length} · Marcom ${upcoming.filter((r) => r.deal.service_line === "MARCOM").length}`,
                "นับรายดีล stage 6–9",
                "ที่มา: Contract Dashboard",
              ],
              { source: "Contract Dashboard (ฝั่ง BD)", count: "จำนวนดีลที่อยู่ stage 6–9 ณ วันนี้ (ไม่ย้อนตามวันสุดท้ายของช่วง) · 1 ดีล = 1 บริการ" },
            )}
            {tile(
              "Active Hotel",
              active.length ? String(activeIds.size) : "—",
              active.length
                ? `ORM ${serviceCount("ORM")} · Marcom ${serviceCount("Marcom")}`
                : "Δ —",
              "โรงแรมที่ใช้บริการ",
              active.length
                ? [
                    `ใช้ทั้งสองบริการ ${[...activeIds].filter((id) => active.some((r) => r.hotel_id === id && r.service_line === "ORM") && active.some((r) => r.hotel_id === id && r.service_line === "Marcom")).length} โรงแรม`,
                    "ยอดย่อยรวมมากกว่า total ได้",
                  ]
                : ["รอข้อมูล"],
              { source: "สัญญา & บริการ", count: "โรงแรมที่มีสัญญาสถานะใช้งาน ณ วันนี้ (สถานะปัจจุบัน ไม่ย้อนตามช่วง) · โรงแรมที่ใช้ทั้ง ORM และ Marcom นับ 1" },
            )}
          </div>
        </div>
        <div className="dash-headline-group dash-onboard">
          <p className="dash-headline-label">On-board</p>
          <div className="dash-headline-tiles">
            {tile(
              "Onboarding",
              "—",
              median == null ? "median —" : `median ${median.toLocaleString("th-TH")} วัน`,
              "รอข้อมูลคิว",
              [
                "รอข้อมูลคิว",
                ...(median == null ? [] : [`median ${median.toLocaleString("th-TH")} วัน`]),
              ],
              { source: "On-board", count: "การ์ดที่ยังไม่ Go Live (ยังไม่มีข้อมูลคิว จึงแสดง —) · ค่ากลางวัน = จากเซ็นสัญญาถึง Go Live ของการ์ดที่ Go Live ในเดือนล่าสุดของช่วง" },
            )}
          </div>
        </div>
        <div className="dash-headline-group dash-risk">
          <p className="dash-headline-label">สุขภาพ / เสี่ยง</p>
          <div className="dash-headline-tiles">
            {tile(
              "Churn เดือนนี้",
              lost == null ? "—" : String(lost),
              <>
                <Delta a={churnNow} b={churnPrev} lowerGood unit=" จุด" /> ·{" "}
                {churnNow == null ? "—" : churnNow.toFixed(1) + "%"}
              </>,
              "โรงแรมที่หลุด ≥1 บริการ",
              churnRows.length
                ? ["ORM", "Marcom"]
                    .filter((line) => f.service === "ALL" || f.service === line)
                    .map((line) => {
                      const rows = churnRows.filter((r) => r.service_line === line),
                        base = rows.reduce((s, r) => s + num(r["active_at_start"]), 0),
                        n = rows.reduce((s, r) => s + num(r["out_count"]), 0);
                      return `${line} ${ratio(rows, "out_count", "active_at_start")?.toFixed(1) ?? "—"}% (${n}/${base} โรงแรม)`;
                    })
                : ["รอข้อมูล"],
              { source: "สัญญา & บริการ (วันที่สัญญาสิ้นสุด)", count: "โรงแรมที่หลุดอย่างน้อย 1 บริการในเดือน ÷ โรงแรมที่ใช้งานต้นเดือน (เดือนล่าสุดของช่วง)" },
            )}
            {tile("คะแนนบริการ", "—", <Delta a={null} b={null} />, "รอข้อมูล", [
              "รอข้อมูลคะแนนบริการ / 5",
            ], { source: "ยังไม่มีข้อมูล", count: "จะคำนวณจากเซอร์เวย์ลูกค้าเมื่อกำหนดเกณฑ์แล้ว" })}
            {tile(
              "Collection",
              "—",
              <span className="text-dash-watch">{GRADE_D_LABEL} {dCount ?? "—"}</span>,
              "รอข้อมูล % collected",
              ["รอข้อมูล collected / total", `${GRADE_D_LABEL} ${dCount ?? "—"}${gradeD ? ` · งวด ${monYY(gradeD.period + "-01")}` : ""}`],
              { source: "AC Billing · เกรดคำนวณโดยงานประจำวันของ AC", count: "% เก็บแล้ว = เหมือนการ์ดลูกหนี้ในแท็บ ลูกหนี้ & ค่าใช้จ่ายรายสัญญา เมื่อเลือกเดือนปัจจุบัน (ยังไม่มีข้อมูล จึงแสดง —) · ลูกค้าเกรด D = จำนวนลูกค้าที่ได้เกรด D ในงวดบิลล่าสุดของช่วง = ตัวเลขเดียวกับการ์ดเกรดในแท็บ AC" },
            )}
          </div>
        </div>
      </div>
      <SummaryNote noteKey="headline.overview" title="สรุปภาพรวมเดือนนี้" noteLines={empty}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["โต", growth, ""],
            ["On-board", onboard, "dash-note-onboard"],
            ["ต้องจับตา", watch, "dash-note-watch"],
          ].map(([label, lines, tone], i) => (
            <div key={i} className={cn("dash-note-panel", typeof tone === "string" ? tone : "")}>
              <h3 className="mb-2 text-sm font-semibold">{label}</h3>
              {Array.isArray(lines) &&
                lines.map((line, j) => (
                  <p key={j} className="text-xs">
                    {line}
                  </p>
                ))}
            </div>
          ))}
        </div>
      </SummaryNote>
    </div>
  );
}

/** AC tab v2.0 — delegates to the Visual Standard cards; period-scoped rows for ①②③⑥ only. */
function AcTab() {
  const { raw: _raw, ...props } = useAcTabInput();
  return <AcTabV2 {...props} />;
}

