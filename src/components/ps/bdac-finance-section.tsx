/* BD-AC v2.2 · "การเงินจาก AC" — one self-contained block at the bottom of Tab BD-AC.
 * Reads only the global filter (useDashboardGlobal) + AC report views; never BD-AC card state.
 * ⑥ ⑦ ⑧ = contract-level revenue over v_bdac_contract_revenue_ranking (RECURRING, after VAT/WHT).
 * ⑨ ⑩ ⑪ = the same GradeCard / SystemFeeMock / DebtorCard components as the tab "ลูกหนี้ & ค่าใช้จ่ายรายสัญญา",
 * mounted with context="bdac" (title number only). Read-only: no writes, no ticket buttons. */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartHint, ChartSkeleton, DashCard } from "@/components/ps/dash-card";
import { DebtorCard, GradeCard, SystemFeeMock, useAcCardModel } from "@/components/ps/ac-tab";
import { useAcTabInput } from "@/components/ps/use-ac-views";
import {
  AC_BAND_CONFIG,
  COLLECTION_META,
  GRADE_META,
  bahtFull,
  bahtShort,
  bandCounts,
  bandIndexOf,
  lensOf,
  splitStats,
  type AcLens,
} from "@/lib/ac-revenue";
import {
  applyChains,
  hotelCount,
  latestRevenuePeriod,
  previousPeriod,
  revenueRows,
  serviceSplitLine,
  toRevRows,
  unbilledContracts,
  type ChainLink,
  type RevRow,
} from "@/lib/bdac-revenue";
import { formatMonthEn } from "@/lib/date-en";
import { matchesBook, useDashboardGlobal } from "@/lib/ps-dashboard-global";
import { DEMO_REVENUE_RENEWAL_LINKS } from "@/lib/ps-demo-fixture";
import { useRenewalStore } from "@/lib/renewal-store";
import { summaryRules } from "@/lib/summaryRules";
import { cn } from "@/lib/utils";

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const TimeChip = ({ label }: { label: string }) => <span className="ac-time-chip">{label}</span>;

export function BdacFinanceSection() {
  const { filter, demo } = useDashboardGlobal();
  const input = useAcTabInput();
  const model = useAcCardModel({ views: input.views, service: input.service, periodA: input.periodA });
  const navigate = useNavigate();
  const openHotel = () => navigate({ to: "/ac/hotel-profile" });
  const renewals = useRenewalStore();
  const [hover, setHover] = useState<string | null>(null);

  /* §3.2 renewal chains — existing renewal records only (demo adds the AC sample's signed renewals). */
  const links = useMemo<ChainLink[]>(
    () => [
      ...renewals.requests.filter((r) => r.new_contract_id).map((r) => ({ contract_id: r.source_contract_id, new_contract_id: r.new_contract_id! })),
      ...(demo ? DEMO_REVENUE_RENEWAL_LINKS : []),
    ],
    [renewals, demo],
  );
  const lens = lensOf(filter.service);
  /* §8 owner lens (Role / Team / Person) on the owner of that service; service lens comes from the view. */
  const all = useMemo(() => {
    const ownerFilter = { ...filter, service: "ALL" as const };
    const rows = applyChains(toRevRows(input.raw?.["v_bdac_contract_revenue_ranking"]), links);
    return rows.filter((r) => matchesBook({ ...r, service_line: null, service_lines: null } as never, ownerFilter));
  }, [input.raw, links, filter]);
  const period = latestRevenuePeriod(all, input.periodA);
  const prevP = previousPeriod(period);
  const bPeriod = filter.compare ? latestRevenuePeriod(all, input.periodB) : null;
  const rows = useMemo(() => revenueRows(all, period, lens), [all, period, lens]);
  const prevRows = useMemo(() => revenueRows(all, prevP, lens), [all, prevP, lens]);
  const brows = useMemo(() => (bPeriod ? revenueRows(all, bPeriod, lens) : []), [all, bPeriod, lens]);
  const stats = useMemo(() => splitStats(rows), [rows]);
  const bstats = useMemo(() => splitStats(brows), [brows]);
  const prevTotal = prevRows.length ? splitStats(prevRows).total : null;
  const unbilled = unbilledContracts(all, period, lens);
  const chip = period ? formatMonthEn(period) : "—";
  const prevChip = prevP ? formatMonthEn(prevP) : "—";
  const bChip = bPeriod ? formatMonthEn(bPeriod) : "—";
  const lensLabel = filter.service === "ALL" ? "ORM + Marcom" : filter.service;

  return (
    <section className="flex min-w-0 flex-col gap-5 border-t pt-8" style={{ marginTop: 16 }} data-testid="bdac-finance" aria-label="การเงินจาก AC">
      <header>
        <h2 className="text-[18px] font-bold text-foreground">การเงินจาก AC</h2>
        <p className="text-xs text-muted-foreground">ข้อมูลจาก AC App · อ่านอย่างเดียว · หน่วยนับตามแต่ละการ์ด</p>
      </header>
      <AcDefinitionStrip />
      {input.loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลดรายงาน…</p>
      ) : input.error ? (
        <p className="text-sm text-muted-foreground">อ่านรายงาน AC ไม่ได้ — ลองโหลดหน้าใหม่</p>
      ) : (
        <>
          <SectionHead title="รายได้รายสัญญา" desc="บิลรายเดือน (RECURRING) · ยอดหลัง VAT/WHT · สัญญาที่ Active และมีบิลในงวด" />
          <RevenueSplitCard
            rows={rows} brows={brows} stats={stats} bstats={bstats} chip={chip} prevChip={prevChip} bChip={bChip}
            prevTotal={prevTotal} lensLabel={lensLabel} lens={lens} unbilled={unbilled} compare={filter.compare}
            hover={hover} setHover={setHover}
          />
          <RevenueBandCard rows={rows} brows={brows} stats={stats} chip={chip} bChip={bChip} compare={filter.compare} />
          <RankingTableCard rows={rows} chip={chip} lens={lens} hover={hover} setHover={setHover} openHotel={openHotel} />
          <SectionHead title="ลูกหนี้ & การเก็บเงิน" desc="ค้างเท่าไร · อยู่ขั้นไหน · ใครจ่ายช้า · ต้องตามใคร" />
          <div className="ac-row2">
            <GradeCard context="bdac" gradeDist={model.gradeDist.filter(model.svc)} chip={model.chip} prevChip={model.prevChip} compare={input.compare} customers={model.customers} />
            <SystemFeeMock context="bdac" />
          </div>
          <DebtorCard context="bdac" views={input.views} svc={model.svc} debtors={model.debtors.filter(model.svc)} breakdown={model.breakdown.filter(model.svc)} compare={input.compare} openHotel={model.openHotel} />
        </>
      )}
    </section>
  );
}

/* ---------- AC definitions strip (§2.3) ---------- */

function AcDefinitionStrip() {
  return (
    <section className="dash-card ac-def-strip">
      <div className="ac-def-row">
        <span className="ac-def-label">เกรดการชำระ</span>
        {(["A", "B", "C", "D"] as const).map((g) => (
          <span key={g} className={cn("ac-pill", GRADE_META[g]!.pill)}>
            <b>{g}</b> {GRADE_META[g]!.desc}
          </span>
        ))}
        <span className="ac-def-note">· คิดเฉพาะบิลรายเดือน (RECURRING) · คำนวณที่ AC App</span>
      </div>
      <div className="ac-def-row">
        <span className="ac-def-label">Collection</span>
        <span className="ac-pill ac-pill-neutral">ปกติ</span>
        <span className="text-muted-foreground">›</span>
        <span className={cn("ac-pill", COLLECTION_META.OVERDUE.pill)}>{COLLECTION_META.OVERDUE.label} · เกรด C</span>
        <span className="text-muted-foreground">›</span>
        <span className={cn("ac-pill", COLLECTION_META.SUSPENDED.pill)}>{COLLECTION_META.SUSPENDED.label} · เกรด D</span>
        <span className="text-muted-foreground">›</span>
        <span className={cn("ac-pill", COLLECTION_META.LEGAL.pill)}>{COLLECTION_META.LEGAL.label}</span>
        <span className="text-muted-foreground">·</span>
        <span className={cn("ac-pill", COLLECTION_META.WRITTEN_OFF.pill)}>{COLLECTION_META.WRITTEN_OFF.label}</span>
        <span className="ac-def-note">· พักบริการ (PAUSED) ไม่ใช่ลูกหนี้ · แยกกล่อง</span>
      </div>
      <p className="ac-def-caption">
        หน่วยนับ: เกรดและ collection นับราย customer (1 customer อาจมีหลายโรงแรม) · รายได้และ Ranking นับรายสัญญา
        (โรงแรมเดียวกันมีหลายสัญญา = หลายแถว) · อ่านอย่างเดียว คลิกชื่อเปิด AC App
      </p>
    </section>
  );
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="ac-section-head">
      <h2>{title}</h2>
      <p>{desc}</p>
    </header>
  );
}

const RowName = ({ r }: { r?: RevRow | undefined }) =>
  r ? (
    <p className="ac-stat-name">
      {r.hotel_name} <span className="text-muted-foreground">· {r.contract_id}</span>
    </p>
  ) : null;

const signedBaht = (d: number) => `${d >= 0 ? "+" : "−"}${bahtFull(Math.abs(d))}`;

/* ---------- ⑥ split ---------- */

function RevenueSplitCard({
  rows, brows, stats, bstats, chip, prevChip, bChip, prevTotal, lensLabel, lens, unbilled, compare, hover, setHover,
}: {
  rows: RevRow[]; brows: RevRow[]; stats: ReturnType<typeof splitStats>; bstats: ReturnType<typeof splitStats>;
  chip: string; prevChip: string; bChip: string; prevTotal: number | null; lensLabel: string; lens: AcLens; unbilled: number;
  compare: boolean; hover: string | null; setHover: (id: string | null) => void;
}) {
  const top = rows.slice(0, stats.half);
  const bottom = rows.slice(stats.half);
  const first = rows[0], mid = rows[stats.half - 1], afterMid = rows[stats.half], last = rows.at(-1);
  const bMid = brows[bstats.half - 1];
  const boxes = [
    { label: "อันดับ 1", row: first, brow: brows[0], bLabel: null as string | null },
    { label: `จุดแบ่งครึ่ง · อันดับ ${stats.half}`, row: mid, brow: bMid, bLabel: `B อันดับ ${bstats.half}` },
    { label: `เริ่มครึ่งล่าง · อันดับ ${stats.half + 1}`, row: afterMid, brow: brows[bstats.half], bLabel: null },
    { label: `สัญญาสุดท้าย · อันดับ ${stats.N}`, row: last, brow: brows.at(-1), bLabel: null },
  ];
  const notes = rows.length
    ? [
        `ครึ่งบน ${stats.half} สัญญา ทำรายได้ ${stats.topShare.toFixed(0)}% ของทั้งหมด · ${stats.k} อันดับแรกทำได้ครึ่งหนึ่ง`,
        `อันดับ 1 ${bahtFull(first?.amount_thb ?? 0)} สูงกว่าจุดแบ่ง ${((first?.amount_thb ?? 0) / (stats.splitValue || 1)).toLocaleString("th-TH", { maximumFractionDigits: 1 })} เท่า · ครึ่งล่างอยู่ระหว่าง ${bahtFull(last?.amount_thb ?? 0)} ถึง ${bahtFull(afterMid?.amount_thb ?? 0)}`,
      ]
    : summaryRules({ metric: "รายได้", empty: true }, ["R-EMPTY"]);
  const deltaPct = prevTotal != null && prevTotal > 0 ? ((stats.total - prevTotal) / prevTotal) * 100 : null;
  return (
    <DashCard
      title={<>⑥ รายได้รายสัญญา · ครึ่งบน / ครึ่งล่าง <TimeChip label={chip} /></>}
      question="ครึ่งบนกับครึ่งล่างของสัญญาที่วางบิล ต่างกันแค่ไหน?"
      answer={rows.length ? bahtShort(stats.total) : "—"}
      answerSub={
        rows.length ? (
          <span className="flex flex-col items-end gap-0.5">
            <span>
              {deltaPct == null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className={deltaPct >= 0 ? "text-[#1F7A6E]" : "text-[#A86B00]"}>
                  {deltaPct >= 0 ? "▲ +" : "▼ −"}
                  {Math.abs(deltaPct).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </span>
              )}{" "}
              จาก {prevChip}
            </span>
            <span>{stats.N} สัญญาที่วางบิล · {hotelCount(rows)} โรงแรม · {lensLabel}</span>
          </span>
        ) : undefined
      }
      noteKey="rev_split"
      noteNamespace="bdac"
      noteLines={notes}
      howToRead="1 แท่ง = 1 สัญญา เรียงรายได้มาก → น้อย · แบ่งครึ่งตามจำนวนสัญญา (ครึ่งบน = อันดับ 1 ถึง ceil(N/2)) · 2 กราฟใช้สเกลแกน Y ของตัวเอง · เส้นประส้ม = อันดับที่รายได้สะสมครบครึ่งหนึ่งของรอบบิล"
      legend={
        <>
          <span className="ac-leg ac-leg-top">● ครึ่งบน</span>
          <span className="ac-leg ac-leg-bottom">● ครึ่งล่าง</span>
          <span className="ac-leg ac-leg-target">╌ จุดที่รายได้สะสมครบ 50%</span>
          {compare && <span className="ac-leg ac-leg-b">● B · {bChip} (อันดับเดียวกัน)</span>}
        </>
      }
    >
      {!rows.length ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-answer-strip">
            {boxes.map((b, i) => (
              <div key={i} className="ac-stat-box">
                <p className="ac-stat-label">{b.label}</p>
                <p className="ac-stat-value">{b.row ? bahtFull(b.row.amount_thb) : "—"}</p>
                <RowName r={b.row} />
                {compare && (
                  <p className="ac-stat-b">
                    {b.bLabel ?? "B"} {b.brow ? bahtFull(b.brow.amount_thb) : "—"}
                    {b.row && b.brow && <> · Δ {signedBaht(b.row.amount_thb - b.brow.amount_thb)}</>}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="ac-split-charts">
            <HalfChart label={`ครึ่งบน · อันดับ 1–${stats.half}`} rows={top} brows={compare ? brows.slice(0, stats.half) : []} share={stats.topShare} crosshairK={stats.k <= stats.half ? stats.k : null} kRank={stats.k} chip={chip} hover={hover} setHover={setHover} lens={lens} tone="top" />
            <HalfChart label={`ครึ่งล่าง · อันดับ ${stats.half + 1}–${stats.N}`} rows={bottom} brows={compare ? brows.slice(stats.half) : []} share={stats.bottomShare} crosshairK={stats.k > stats.half ? stats.k - stats.half : null} kRank={stats.k} chip={chip} hover={hover} setHover={setHover} lens={lens} tone="bottom" />
          </div>
          <p className="ac-footnote">
            Active แต่ไม่มีบิลงวดนี้ {unbilled} สัญญา (ไม่นับในกราฟ) · ยอดหลัง VAT/WHT · บิลรายเดือน RECURRING · สัญญาต่ออายุนับต่อเนื่องจากสัญญาเดิม
            {compare && ` · B = งวด ${bChip} เทียบตามอันดับเดียวกัน`}
          </p>
        </>
      )}
    </DashCard>
  );
}

function HalfChart({
  label, rows, brows, share, crosshairK, kRank, chip, hover, setHover, lens, tone,
}: {
  label: string; rows: RevRow[]; brows: RevRow[]; share: number; crosshairK: number | null; kRank: number; chip: string;
  hover: string | null; setHover: (id: string | null) => void; lens: AcLens; tone: "top" | "bottom";
}) {
  const max = Math.max(...rows.map((r) => r.amount_thb), 1);
  const kRow = crosshairK != null ? rows[crosshairK - 1] : null;
  const first = rows[0], last = rows.at(-1);
  const x = (i: number) => `${((i - 0.5) / Math.max(1, rows.length)) * 100}%`;
  return (
    <div className="ac-half">
      <div className="ac-half-head">
        <span>
          {label} · {rows.length} สัญญา · {bahtFull(first?.amount_thb ?? 0)} → {bahtFull(last?.amount_thb ?? 0)}
        </span>
        <b className="ac-half-share">{share.toFixed(0)}% ของรายได้รวม</b>
      </div>
      <div className="ac-half-plot">
        <div className="ac-yaxis">
          <span>{bahtShort(max)}</span>
          <span>{bahtShort(max / 2)}</span>
          <span>฿0</span>
        </div>
        <div className="ac-bars" role="img" aria-label={label}>
          {rows.map((r, i) => {
            const b = brows[i];
            return (
              <div key={r.contract_id} className="ac-bar-slot">
                {b && <div className="ac-bar ac-bar-b" style={{ height: `${Math.min(100, (b.amount_thb / max) * 100)}%` }} />}
                <ChartHint
                  header={`#${r.rank} ${r.hotel_name} · ${r.contract_id} · ${bahtFull(r.amount_thb)}`}
                  lines={[
                    serviceSplitLine(r, lens),
                    r.prev_rank != null ? `${r.invoice_count} ใบ · งวดก่อนอันดับ ${r.prev_rank}` : "สัญญาใหม่ · ไม่มีอันดับงวดก่อน",
                    ...(b ? [`B อันดับ ${b.rank} = ${bahtFull(b.amount_thb)}`] : []),
                  ]}
                >
                  <div
                    className={cn("ac-bar", tone === "top" ? "ac-bar-top" : "ac-bar-bottom", hover === r.contract_id && "ac-bar-hover")}
                    style={{ height: `${(r.amount_thb / max) * 100}%` }}
                    tabIndex={0}
                    role="button"
                    aria-label={`#${r.rank} ${r.hotel_name} ${r.contract_id} ${bahtFull(r.amount_thb)}`}
                    onMouseEnter={() => setHover(r.contract_id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(r.contract_id)}
                    onBlur={() => setHover(null)}
                  />
                </ChartHint>
              </div>
            );
          })}
          {crosshairK != null && kRow && (
            <>
              <div className="ac-cross-v" style={{ left: x(crosshairK) }} />
              <div className="ac-cross-h" style={{ bottom: `${(kRow.amount_thb / max) * 100}%` }} />
              <div className="ac-target" style={{ left: x(crosshairK), bottom: `${(kRow.amount_thb / max) * 100}%` }} />
              <span className="ac-tag-x" style={{ left: x(crosshairK) }}>#{kRank}</span>
              <span className="ac-tag-y" style={{ bottom: `${(kRow.amount_thb / max) * 100}%` }}>{bahtShort(kRow.amount_thb)}</span>
              <span
                className="ac-target-label"
                style={{
                  left: `${Math.min(62, ((crosshairK - 0.5) / rows.length) * 100 + 3)}%`,
                  bottom: `${Math.min(88, (kRow.amount_thb / max) * 100 + 6)}%`,
                }}
              >
                อันดับที่ {kRank} = 50% ของรายได้ในรอบบิล {chip}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ac-half-foot">
        <span>
          #{first?.rank} · {bahtFull(first?.amount_thb ?? 0)} {first ? `${first.hotel_name} · ${first.contract_id}` : ""}
        </span>
        <span>
          #{last?.rank} {tone === "top" ? "จุดแบ่ง" : "สุดท้าย"} · {bahtFull(last?.amount_thb ?? 0)} {last ? `${last.hotel_name} · ${last.contract_id}` : ""}
        </span>
      </div>
    </div>
  );
}

/* ---------- ⑦ revenue band ---------- */

function RevenueBandCard({
  rows, brows, stats, chip, bChip, compare,
}: { rows: RevRow[]; brows: RevRow[]; stats: ReturnType<typeof splitStats>; chip: string; bChip: string; compare: boolean }) {
  const cfg = AC_BAND_CONFIG;
  const bands = useMemo(() => bandCounts(rows, cfg), [rows, cfg]);
  const bbands = useMemo(() => (compare ? bandCounts(brows, cfg) : []), [brows, compare, cfg]);
  const maxCount = Math.max(...bands.map((b) => b.count), ...bbands.map((b) => b.count), 1);
  const topBand = bands.reduce((a, b) => (b.count > a.count ? b : a), bands[0]!);
  const richBand = bands.reduce((a, b) => (b.sum > a.sum ? b : a), bands[0]!);
  const medianBand = bandIndexOf(stats.splitValue, cfg);
  const medianFrac = (stats.splitValue - medianBand * cfg.step_thb) / cfg.step_thb;
  const medianX = ((medianBand + Math.min(1, Math.max(0, medianFrac))) / bands.length) * 100;
  const notes = rows.length
    ? [
        `ช่วง ${topBand.label} มีสัญญามากสุด ${topBand.count} จาก ${stats.N} (${pct(topBand.count, stats.N)}%)`,
        `ช่วงที่ทำรายได้มากสุดคือ ${richBand.label} · ${bahtFull(richBand.sum)} (${pct(richBand.sum, stats.total)}%)`,
      ]
    : summaryRules({ metric: "ช่วงรายได้", empty: true }, ["R-EMPTY"]);
  return (
    <DashCard
      title={<>⑦ ช่วงรายได้ (revenue band) <TimeChip label={chip} /></>}
      question={`สัญญาส่วนใหญ่อยู่ช่วงรายได้เท่าไร? (ช่วงละ ${bahtFull(cfg.step_thb)} · รายสัญญา)`}
      answer={rows.length ? `${topBand.label} · ${topBand.count} สัญญา` : "—"}
      answerSub={rows.length ? `ช่วงที่สัญญากระจุกมากสุด (${pct(topBand.count, stats.N)}% of ${stats.N})` : undefined}
      noteKey="rev_band"
      noteNamespace="bdac"
      noteLines={notes}
      howToRead="1 แท่ง = 1 ช่วงรายได้ · ตัวเลขบนแท่ง = จำนวนสัญญา · เส้นประ = จุดแบ่งครึ่ง (median) เดียวกับ ⑥ · ช่วงบนสุดเปิด ≥ เพดาน (config)"
      legend={
        compare ? (
          <>
            <span className="ac-leg ac-leg-top">● A · {chip}</span>
            <span className="ac-leg ac-leg-bb">● B · {bChip}</span>
          </>
        ) : undefined
      }
    >
      {!rows.length ? (
        <ChartSkeleton />
      ) : (
        <div className="ac-band-plot">
          <div className="ac-bands">
            {bands.map((b, i) => (
              <div key={b.label} className="ac-band-col">
                <span className="ac-band-count">{b.count}</span>
                <div className="ac-band-bars">
                  {compare && <div className="ac-band-bar ac-band-bar-b" style={{ height: `${((bbands[i]?.count ?? 0) / maxCount) * 100}%` }} />}
                  <ChartHint
                    header={`${b.hi ? `${bahtFull(b.lo)}–${bahtFull(b.hi)}` : `≥ ${bahtFull(b.lo)}`} · ${b.count} สัญญา (${pct(b.count, stats.N)}%)`}
                    lines={[
                      `รายได้รวมช่วงนี้ ${bahtFull(b.sum)} (${pct(b.sum, stats.total)}% ของทั้งหมด)`,
                      ...(compare && bbands[i] ? [`B ${bChip} ${bbands[i]!.count} สัญญา · Δ ${b.count - bbands[i]!.count >= 0 ? "+" : "−"}${Math.abs(b.count - bbands[i]!.count)}`] : []),
                    ]}
                  >
                    <div className="ac-band-bar ac-band-bar-a" style={{ height: `${(b.count / maxCount) * 100}%` }} tabIndex={0} role="button" aria-label={`${b.label} ${b.count} สัญญา`} />
                  </ChartHint>
                </div>
                <span className="ac-band-label">{b.label}</span>
              </div>
            ))}
            <div className="ac-median-line" style={{ left: `${medianX}%` }} data-split={stats.splitValue}>
              <span className="ac-median-tag">จุดแบ่งครึ่ง {bahtFull(stats.splitValue)}</span>
            </div>
          </div>
        </div>
      )}
    </DashCard>
  );
}

/* ---------- ⑧ ranking table ---------- */

function RankingTableCard({
  rows, chip, lens, hover, setHover, openHotel,
}: { rows: RevRow[]; chip: string; lens: AcLens; hover: string | null; setHover: (id: string | null) => void; openHotel: () => void }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.hotel_name.toLowerCase().includes(q) || r.contract_id.toLowerCase().includes(q)) : rows;
  const shown = all || q ? filtered : filtered.slice(0, 10);
  const total = rows.reduce((s, r) => s + r.amount_thb, 0);
  const svcOf = (r: RevRow) => (lens === "ALL" ? (["ORM", "MARCOM"] as const).filter((s) => (s === "ORM" ? r.orm_thb : r.marcom_thb) > 0) : [lens as "ORM" | "MARCOM"]);
  return (
    <DashCard
      title={<>⑧ ตารางอันดับรายได้ <TimeChip label={chip} /></>}
      question={q ? `พบ ${filtered.length} สัญญา` : `แสดง ${shown.length} จาก ${rows.length} สัญญา · ฿ รวมหลัง VAT/WHT`}
      answer={rows.length ? bahtShort(total) : "—"}
      answerSub={rows.length ? `${rows.length} สัญญาที่วางบิล` : undefined}
      noteKey="rev_table"
      noteNamespace="bdac"
      noteLines={
        rows.length
          ? [`อันดับ 1 ${rows[0]!.hotel_name} · ${rows[0]!.contract_id} ${bahtFull(rows[0]!.amount_thb)}`, `สัญญาใหม่ในงวด ${rows.filter((r) => r.prev_rank == null).length} สัญญา`]
          : summaryRules({ metric: "อันดับรายได้", empty: true }, ["R-EMPTY"])
      }
      howToRead="ชี้แท่งในกราฟ = ไฮไลต์แถวในตาราง (เมื่อแถวนั้นแสดงอยู่) · Δ อันดับเทียบงวดก่อน · สัญญาต่ออายุนับต่อเนื่องจากสัญญาเดิม · อันดับเฉลี่ย 12 เดือนใช้เฉพาะงวดที่มีบิล"
      right={
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          ค้นหาโรงแรม / สัญญา
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="พิมพ์ชื่อโรงแรมหรือ Contract ID" aria-label="ค้นหาโรงแรม / สัญญา" className="h-8 w-56" />
        </label>
      }
    >
      {!rows.length ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-table-wrap" style={all || q ? { maxHeight: 520 } : undefined}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>สัญญา</th>
                  <th>บริการ</th>
                  <th className="text-right">฿ รวม</th>
                  <th className="text-right">ใบ</th>
                  <th>Δ อันดับ</th>
                  <th className="text-right">อันดับเฉลี่ย 12 เดือน</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const d = r.prev_rank != null && r.rank != null ? r.prev_rank - r.rank : null;
                  return (
                    <tr key={r.contract_id} data-contract={r.contract_id} className={cn(hover === r.contract_id && "ac-row-hover")} onMouseEnter={() => setHover(r.contract_id)} onMouseLeave={() => setHover(null)}>
                      <td className="tabular-nums">{r.rank}</td>
                      <td>
                        <button type="button" className="ac-link" onClick={openHotel}>{r.hotel_name}</button>
                        <div className="text-xs text-muted-foreground">{r.contract_id}</div>
                      </td>
                      <td>
                        {svcOf(r).map((s) => (
                          <span key={s} className={cn("ac-pill mr-1", s === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>{s === "ORM" ? "ORM" : "Marcom"}</span>
                        ))}
                      </td>
                      <td className="text-right tabular-nums">{bahtFull(r.amount_thb)}</td>
                      <td className="text-right tabular-nums">{r.invoice_count}</td>
                      <td>
                        {r.prev_rank == null ? (
                          <span className="ac-pill ac-pill-new">ใหม่</span>
                        ) : d === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn("ac-pill", d! > 0 ? "ac-pill-good" : "ac-pill-watch")}>{d! > 0 ? `▲ ${d}` : `▼ ${Math.abs(d!)}`}</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {r.avg_rank == null ? <span className="text-xs text-muted-foreground">รอสะสม</span> : r.avg_rank.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!q && rows.length > 10 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setAll(!all)}>
              {all ? "แสดงแค่ 10 อันดับแรก" : `ดูทั้งหมด (${rows.length} สัญญา)`}
            </Button>
          )}
          <p className="ac-footnote">ชี้แท่งในกราฟ = ไฮไลต์แถวในตาราง (เมื่อแถวนั้นแสดงอยู่)</p>
        </>
      )}
    </DashCard>
  );
}
