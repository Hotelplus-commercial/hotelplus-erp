/* AC Dashboard tab v2.0 — read-only Visual Standard cards ①–⑧ over the existing v_ac_* views.
 * Revenue cards read the re-grained v_ac_invoice_ranking (hotel × period × lens); collection
 * cards read v_ac_debtors / v_ac_overdue / v_ac_suspended / v_ac_legal / v_ac_invoices_breakdown.
 * No writes, no ticket buttons, no grade/collection logic — results only. */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartHint, ChartSkeleton, DashCard, Delta } from "@/components/ps/dash-card";
import { summaryRules } from "@/lib/summaryRules";
import {
  AC_BAND_CONFIG,
  COLLECTION_META,
  GRADE_META,
  bahtFull,
  bahtShort,
  bandCounts,
  bandIndexOf,
  debtorRows,
  lensOf,
  monYY,
  rankRows,
  sortDebtors,
  splitStats,
  unbilledCount,
  type AcRankRow,
  type CollectionStatus,
} from "@/lib/ac-revenue";
import { OPEN_STATUSES, STATUS_TH, useTickets } from "@/lib/tickets-l0";
import type { PsReportRow } from "@/lib/ps-dashboard-types";
import { cn } from "@/lib/utils";

const num = (v: unknown) => Number(v ?? 0) || 0;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

type AcViews = Record<string, PsReportRow[]>;
export type AcTabProps = {
  views: AcViews | undefined;
  loading: boolean;
  error: boolean;
  service: "ALL" | "ORM" | "Marcom";
  compare: boolean;
  periodALabel?: string;
  demo?: boolean;
};

export function AcTab({ views, loading, error, service, compare, demo }: AcTabProps) {
  const navigate = useNavigate();
  const openHotel = () => navigate({ to: "/ac/hotel-profile" });
  const [hoverHotel, setHoverHotel] = useState<string | null>(null);

  const lens = lensOf(service);
  const rankAll = useMemo(() => views?.["v_ac_invoice_ranking"] ?? [], [views]);
  const periods = useMemo(
    () =>
      [
        ...new Set(
          rankAll.filter((r) => r.has_bill === true).map((r) => String(r.billing_period).slice(0, 7)),
        ),
      ].sort(),
    [rankAll],
  );
  const latest = periods.at(-1) ?? null;
  const prev = periods.at(-2) ?? null;
  const rows = useMemo(() => rankRows(rankAll, latest, lens), [rankAll, latest, lens]);
  const brows = useMemo(() => (compare ? rankRows(rankAll, prev, lens) : []), [rankAll, prev, lens, compare]);
  const stats = useMemo(() => splitStats(rows), [rows]);
  const bstats = useMemo(() => splitStats(brows), [brows]);
  const unbilled = latest ? unbilledCount(rankAll, latest, lens) : 0;
  const chip = latest ? monYY(latest) : "—";
  const prevChip = prev ? monYY(prev) : "—";
  const lensLabel = service === "ALL" ? "ORM + Marcom" : service;

  const debtors = useMemo(() => views?.["v_ac_debtors"] ?? [], [views]);
  const breakdown = useMemo(() => views?.["v_ac_invoices_breakdown"] ?? [], [views]);
  const gradeDist = useMemo(() => views?.["v_ac_grade_distribution"] ?? [], [views]);
  const svc = (r: PsReportRow) => service === "ALL" || String(r.service_line ?? "") === service || r.service_line == null;

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลดรายงาน…</p>;
  if (error) return <p className="text-sm text-muted-foreground">อ่านรายงาน AC ไม่ได้ — ลองโหลดหน้าใหม่</p>;

  return (
    <div className="dash-grid grid-cols-1" data-testid="ac-tab" data-demo={demo || undefined}>
      <DefinitionStrip />
      <SectionHead
        title="รายได้รายโรงแรม"
        desc="บิลรายเดือน (RECURRING) · ยอดหลัง VAT/WHT · โรงแรมที่สัญญา Active และมีบิลในงวด"
      />
      <RevenueSplitCard
        rows={rows}
        brows={brows}
        stats={stats}
        bstats={bstats}
        chip={chip}
        prevChip={prevChip}
        lensLabel={lensLabel}
        lens={lens}
        unbilled={unbilled}
        compare={compare}
        hoverHotel={hoverHotel}
        setHoverHotel={setHoverHotel}
      />
      <RevenueBandCard rows={rows} brows={brows} stats={stats} chip={chip} prevChip={prevChip} compare={compare} />
      <RankingTableCard
        rows={rows}
        chip={chip}
        lens={lens}
        hoverHotel={hoverHotel}
        setHoverHotel={setHoverHotel}
        openHotel={openHotel}
      />
      <SectionHead title="ลูกหนี้ & การเก็บเงิน" desc="ค้างเท่าไร · อยู่ขั้นไหน · ใครจ่ายช้า · ต้องตามใคร" />
      <div className="ac-pair">
        <OutstandingCard debtors={debtors.filter(svc)} breakdown={breakdown.filter(svc)} compare={compare} />
        <CollectionCard views={views} svc={svc} debtors={debtors.filter(svc)} compare={compare} />
        <GradeCard gradeDist={gradeDist.filter(svc)} chip={chip} prevChip={prevChip} compare={compare} />
        <SystemFeeMock />
      </div>
      <FollowUpCard debtors={debtors.filter(svc)} breakdown={breakdown.filter(svc)} compare={compare} openHotel={openHotel} />
    </div>
  );
}

/* ---------- definition strip + section headers ---------- */

function DefinitionStrip() {
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
        {(["OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((s, i) => (
          <span key={s} className="ac-def-chain">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <span className={cn("ac-pill", COLLECTION_META[s].pill)}>
              {COLLECTION_META[s].label}
              {s === "OVERDUE" && " · เกรด C"}
              {s === "SUSPENDED" && " · เกรด D"}
            </span>
          </span>
        ))}
        <span className="ac-def-note">· พักบริการ (PAUSED) ไม่ใช่ลูกหนี้ · แยกกล่อง</span>
      </div>
      <p className="ac-def-caption">
        หน่วยนับ: เกรดและ collection นับราย customer (1 customer อาจมีหลายโรงแรม) · รายได้และ Ranking
        นับรายโรงแรม · ทั้ง tab อ่านอย่างเดียว คลิกชื่อเปิด AC App
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

const TimeChip = ({ label }: { label: string }) => <span className="ac-time-chip">{label}</span>;

/* ---------- ① revenue split ---------- */

function RevenueSplitCard({
  rows,
  brows,
  stats,
  bstats,
  chip,
  prevChip,
  lensLabel,
  lens,
  unbilled,
  compare,
  hoverHotel,
  setHoverHotel,
}: {
  rows: AcRankRow[];
  brows: AcRankRow[];
  stats: ReturnType<typeof splitStats>;
  bstats: ReturnType<typeof splitStats>;
  chip: string;
  prevChip: string;
  lensLabel: string;
  lens: string;
  unbilled: number;
  compare: boolean;
  hoverHotel: string | null;
  setHoverHotel: (id: string | null) => void;
}) {
  const top = rows.slice(0, stats.half);
  const bottom = rows.slice(stats.half);
  const first = rows[0];
  const mid = rows[stats.half - 1];
  const afterMid = rows[stats.half];
  const last = rows.at(-1);
  const prevTotal = brows.length ? bstats.total : null;
  const boxes = [
    { label: "อันดับ 1", row: first, brow: brows[0] },
    { label: `จุดแบ่งครึ่ง · อันดับ ${stats.half}`, row: mid, brow: brows[bstats.half - 1] },
    { label: `เริ่มครึ่งล่าง · อันดับ ${stats.half + 1}`, row: afterMid, brow: brows[bstats.half] },
    { label: `โรงแรมสุดท้าย · อันดับ ${stats.N}`, row: last, brow: brows.at(-1) },
  ];
  const notes = rows.length
    ? [
        `ครึ่งบน ${stats.half} โรงแรม ทำรายได้ ${stats.topShare.toFixed(0)}% ของทั้งหมด · ${stats.k} อันดับแรกทำได้ครึ่งหนึ่ง`,
        `อันดับ 1 ${bahtFull(first?.amount_thb ?? 0)} สูงกว่าจุดแบ่ง ${((first?.amount_thb ?? 0) / (stats.splitValue || 1)).toLocaleString("th-TH", { maximumFractionDigits: 1 })} เท่า · ครึ่งล่างอยู่ระหว่าง ${bahtFull(last?.amount_thb ?? 0)} ถึง ${bahtFull(afterMid?.amount_thb ?? 0)}`,
      ]
    : summaryRules({ metric: "รายได้", empty: true }, ["R-EMPTY"]);
  return (
    <DashCard
      title={
        <>
          ① รายได้รายโรงแรม · ครึ่งบน / ครึ่งล่าง <TimeChip label={chip} />
        </>
      }
      question="ครึ่งบนกับครึ่งล่างของโรงแรมที่วางบิล ต่างกันแค่ไหน?"
      answer={rows.length ? bahtShort(stats.total) : "—"}
      answerSub={
        rows.length ? (
          <>
            {prevTotal != null ? (
              <Delta a={stats.total} b={prevTotal} unit="%" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}{" "}
            จาก {prevChip} · {stats.N} โรงแรมที่วางบิล · {lensLabel}
          </>
        ) : undefined
      }
      noteKey="revenue-split"
      noteNamespace="ac"
      noteLines={notes}
      howToRead="1 แท่ง = 1 โรงแรม เรียงรายได้มาก → น้อย · แบ่งครึ่งตามจำนวนโรงแรม (ครึ่งบน = อันดับ 1 ถึง ceil(N/2)) · 2 กราฟใช้สเกลแกน Y ของตัวเอง · เส้นประส้ม = อันดับที่รายได้สะสมครบครึ่งหนึ่งของรอบบิล"
      legend={
        <>
          <span className="ac-leg ac-leg-top">● ครึ่งบน</span>
          <span className="ac-leg ac-leg-bottom">● ครึ่งล่าง</span>
          <span className="ac-leg ac-leg-target">╌ จุดที่รายได้สะสมครบ 50%</span>
          {compare && <span className="ac-leg ac-leg-b">● B · {prevChip} (อันดับเดียวกัน)</span>}
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
                <p className="ac-stat-name">{b.row?.hotel_name ?? ""}</p>
                {compare && (
                  <p className="ac-stat-b">
                    B {b.brow ? `อันดับ ${b.brow.rank} ${bahtFull(b.brow.amount_thb)}` : "—"}
                    {b.row && b.brow && (
                      <>
                        {" "}
                        · <Delta a={b.row.amount_thb} b={b.brow.amount_thb} />
                      </>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="ac-split-charts">
            <HalfChart
              label={`ครึ่งบน · อันดับ 1–${stats.half}`}
              rows={top}
              brows={compare ? brows.slice(0, bstats.half) : []}
              share={stats.topShare}
              crosshairK={stats.k <= stats.half ? stats.k : null}
              chip={chip}
              hoverHotel={hoverHotel}
              setHoverHotel={setHoverHotel}
              lens={lens}
              tone="top"
            />
            <HalfChart
              label={`ครึ่งล่าง · อันดับ ${stats.half + 1}–${stats.N}`}
              rows={bottom}
              brows={compare ? brows.slice(bstats.half) : []}
              share={stats.bottomShare}
              crosshairK={stats.k > stats.half ? stats.k - stats.half : null}
              chip={chip}
              hoverHotel={hoverHotel}
              setHoverHotel={setHoverHotel}
              lens={lens}
              tone="bottom"
            />
          </div>
          <p className="ac-footnote">
            Active แต่ไม่มีบิลงวดนี้ {unbilled} โรงแรม (ไม่นับในกราฟ) · ยอดหลัง VAT/WHT · บิลรายเดือน
            RECURRING
            {compare && ` · B = งวด ${prevChip} เทียบตามอันดับเดียวกัน`}
          </p>
        </>
      )}
    </DashCard>
  );
}

function HalfChart({
  label,
  rows,
  brows,
  share,
  crosshairK,
  chip,
  hoverHotel,
  setHoverHotel,
  lens,
  tone,
}: {
  label: string;
  rows: AcRankRow[];
  brows: AcRankRow[];
  share: number;
  crosshairK: number | null;
  chip: string;
  hoverHotel: string | null;
  setHoverHotel: (id: string | null) => void;
  lens: string;
  tone: "top" | "bottom";
}) {
  const max = Math.max(...rows.map((r) => r.amount_thb), 1);
  const kRow = crosshairK != null ? rows[crosshairK - 1] : null;
  const first = rows[0];
  const last = rows.at(-1);
  return (
    <div className="ac-half">
      <div className="ac-half-head">
        <span>
          {label} · {rows.length} โรงแรม · {bahtFull(first?.amount_thb ?? 0)} → {bahtFull(last?.amount_thb ?? 0)}
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
              <div key={r.hotel_id} className="ac-bar-slot">
                {b && (
                  <div
                    className="ac-bar ac-bar-b"
                    style={{ height: `${Math.min(100, (b.amount_thb / max) * 100)}%` }}
                  />
                )}
                <ChartHint
                  header={`#${r.rank} ${r.hotel_name} · ${bahtFull(r.amount_thb)}`}
                  lines={[
                    lens === "ALL"
                      ? r.orm_thb > 0 && r.marcom_thb > 0
                        ? `ORM ${bahtFull(r.orm_thb)} · Marcom ${bahtFull(r.marcom_thb)}`
                        : r.orm_thb > 0
                          ? "ORM อย่างเดียว"
                          : "Marcom อย่างเดียว"
                      : `เฉพาะ ${lens === "ORM" ? "ORM" : "Marcom"}`,
                    r.prev_rank != null
                      ? `${r.invoice_count} ใบ · งวดก่อนอันดับ ${r.prev_rank}`
                      : `ลูกค้าใหม่ · ไม่มีอันดับงวดก่อน`,
                    ...(b ? [`B อันดับ ${b.rank} = ${bahtFull(b.amount_thb)}`] : []),
                  ]}
                >
                  <div
                    className={cn(
                      "ac-bar",
                      tone === "top" ? "ac-bar-top" : "ac-bar-bottom",
                      hoverHotel === r.hotel_id && "ac-bar-hover",
                    )}
                    style={{ height: `${(r.amount_thb / max) * 100}%` }}
                    tabIndex={0}
                    role="button"
                    aria-label={`#${r.rank} ${r.hotel_name} ${bahtFull(r.amount_thb)}`}
                    onMouseEnter={() => setHoverHotel(r.hotel_id)}
                    onMouseLeave={() => setHoverHotel(null)}
                    onFocus={() => setHoverHotel(r.hotel_id)}
                    onBlur={() => setHoverHotel(null)}
                  />
                </ChartHint>
              </div>
            );
          })}
          {crosshairK != null && kRow && (
            <>
              <div className="ac-cross-v" style={{ left: `${((crosshairK - 0.5) / rows.length) * 100}%` }} />
              <div className="ac-cross-h" style={{ bottom: `${(kRow.amount_thb / max) * 100}%` }} />
              <div
                className="ac-target"
                style={{
                  left: `${((crosshairK - 0.5) / rows.length) * 100}%`,
                  bottom: `${(kRow.amount_thb / max) * 100}%`,
                }}
              />
              <span className="ac-tag-x" style={{ left: `${((crosshairK - 0.5) / rows.length) * 100}%` }}>
                #{crosshairK}
              </span>
              <span className="ac-tag-y" style={{ bottom: `${(kRow.amount_thb / max) * 100}%` }}>
                {bahtShort(kRow.amount_thb)}
              </span>
              <span
                className="ac-target-label"
                style={{
                  left: `${Math.min(62, ((crosshairK - 0.5) / rows.length) * 100 + 3)}%`,
                  bottom: `${Math.min(88, (kRow.amount_thb / max) * 100 + 6)}%`,
                }}
              >
                อันดับที่ {crosshairK} = 50% ของรายได้ในรอบบิล {chip}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="ac-half-foot">
        <span>
          #{first?.rank} · {bahtFull(first?.amount_thb ?? 0)} {first?.hotel_name}
        </span>
        <span>
          #{last?.rank} {tone === "top" ? "จุดแบ่ง" : "สุดท้าย"} · {bahtFull(last?.amount_thb ?? 0)}{" "}
          {last?.hotel_name}
        </span>
      </div>
    </div>
  );
}

/* ---------- ② revenue band ---------- */

function RevenueBandCard({
  rows,
  brows,
  stats,
  chip,
  prevChip,
  compare,
}: {
  rows: AcRankRow[];
  brows: AcRankRow[];
  stats: ReturnType<typeof splitStats>;
  chip: string;
  prevChip: string;
  compare: boolean;
}) {
  const bands = useMemo(() => bandCounts(rows), [rows]);
  const bbands = useMemo(() => (compare ? bandCounts(brows) : []), [brows, compare]);
  const maxCount = Math.max(...bands.map((b) => b.count), 1);
  const topBand = bands.reduce((a, b) => (b.count > a.count ? b : a), bands[0]!);
  const richBand = bands.reduce((a, b) => (b.sum > a.sum ? b : a), bands[0]!);
  const medianBand = bandIndexOf(stats.splitValue);
  const medianFrac =
    (stats.splitValue - medianBand * AC_BAND_CONFIG.step_thb) / AC_BAND_CONFIG.step_thb;
  const medianX = ((medianBand + Math.min(1, Math.max(0, medianFrac))) / bands.length) * 100;
  const notes = rows.length
    ? [
        `ช่วง ${topBand.label} มีโรงแรมมากสุด ${topBand.count} จาก ${stats.N} (${pct(topBand.count, stats.N)}%)`,
        `ช่วงที่ทำรายได้มากสุดคือ ${richBand.label} · ${bahtFull(richBand.sum)} (${pct(richBand.sum, stats.total)}%)`,
      ]
    : summaryRules({ metric: "ช่วงรายได้", empty: true }, ["R-EMPTY"]);
  return (
    <DashCard
      title={
        <>
          ② ช่วงรายได้ (revenue band) <TimeChip label={chip} />
        </>
      }
      question="โรงแรมส่วนใหญ่อยู่ช่วงรายได้เท่าไร? (ช่วงละ ฿10,000 · รายโรงแรม)"
      answer={rows.length ? `${topBand.label} · ${topBand.count} โรงแรม` : "—"}
      answerSub={rows.length ? `ช่วงที่โรงแรมกระจุกมากสุด (${pct(topBand.count, stats.N)}% ของ ${stats.N})` : undefined}
      noteKey="revenue-band"
      noteNamespace="ac"
      noteLines={notes}
      howToRead="1 แท่ง = 1 ช่วงรายได้ · ตัวเลขบนแท่ง = จำนวนโรงแรม · เส้นประ = จุดแบ่งครึ่ง (median) เดียวกับ ① · ช่วงบนสุดเปิด ≥ เพดาน (config)"
      legend={
        compare ? (
          <>
            <span className="ac-leg ac-leg-top">● A · {chip}</span>
            <span className="ac-leg ac-leg-bb">● B · {prevChip}</span>
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
                <span className="ac-band-count">{b.count || ""}</span>
                <div className="ac-band-bars">
                  {compare && (
                    <div
                      className="ac-band-bar ac-band-bar-b"
                      style={{ height: `${((bbands[i]?.count ?? 0) / maxCount) * 100}%` }}
                    />
                  )}
                  <ChartHint
                    header={`${b.hi ? `${bahtFull(b.lo)}–${bahtFull(b.hi)}` : `≥ ${bahtFull(b.lo)}`} · ${b.count} โรงแรม (${pct(b.count, stats.N)}%)`}
                    lines={[
                      `รายได้รวมช่วงนี้ ${bahtFull(b.sum)} (${pct(b.sum, stats.total)}% ของทั้งหมด)`,
                      ...(compare && bbands[i]
                        ? [`B ${prevChip} ${bbands[i]!.count} โรงแรม · Δ ${b.count - bbands[i]!.count >= 0 ? "+" : ""}${b.count - bbands[i]!.count}`]
                        : []),
                    ]}
                  >
                    <div
                      className="ac-band-bar ac-band-bar-a"
                      style={{ height: `${(b.count / maxCount) * 100}%` }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${b.label} ${b.count} โรงแรม`}
                    />
                  </ChartHint>
                </div>
                <span className="ac-band-label">{b.label}</span>
              </div>
            ))}
            <div className="ac-median-line" style={{ left: `${medianX}%` }}>
              <span className="ac-median-tag">จุดแบ่งครึ่ง {bahtFull(stats.splitValue)}</span>
            </div>
          </div>
        </div>
      )}
    </DashCard>
  );
}

/* ---------- ③ ranking table ---------- */

function RankingTableCard({
  rows,
  chip,
  lens,
  hoverHotel,
  setHoverHotel,
  openHotel,
}: {
  rows: AcRankRow[];
  chip: string;
  lens: string;
  hoverHotel: string | null;
  setHoverHotel: (id: string | null) => void;
  openHotel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const filtered = query.trim()
    ? rows.filter((r) => r.hotel_name.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;
  const shown = all || query.trim() ? filtered : filtered.slice(0, 10);
  const total = rows.reduce((s, r) => s + r.amount_thb, 0);
  return (
    <DashCard
      title={
        <>
          ③ ตารางอันดับรายได้ <TimeChip label={chip} />
        </>
      }
      question={`แสดง ${shown.length} จาก ${rows.length} · ฿ รวมหลัง VAT/WHT${query.trim() ? ` · พบ ${filtered.length} โรงแรม` : ""}`}
      answer={rows.length ? bahtShort(total) : "—"}
      answerSub={rows.length ? `${rows.length} โรงแรมที่วางบิล` : undefined}
      noteKey="ranking-table"
      noteNamespace="ac"
      noteLines={
        rows.length
          ? [`อันดับ 1 ${rows[0]!.hotel_name} ${bahtFull(rows[0]!.amount_thb)}`, `โรงแรมใหม่ในงวด ${rows.filter((r) => r.prev_rank == null).length} โรงแรม`]
          : summaryRules({ metric: "อันดับรายได้", empty: true }, ["R-EMPTY"])
      }
      howToRead="ชี้แท่งในกราฟ = ไฮไลต์แถวในตาราง (เมื่อแถวนั้นแสดงอยู่) · Δ เทียบอันดับงวดก่อน · อันดับเฉลี่ย 12 เดือนใช้เฉพาะงวดที่มีบิล"
      right={
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="พิมพ์ชื่อโรงแรม"
          aria-label="ค้นหาโรงแรม"
          className="h-8 w-44"
        />
      }
    >
      {!rows.length ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-table-wrap" style={all || query.trim() ? { maxHeight: 520 } : undefined}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>โรงแรม</th>
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
                    <tr
                      key={r.hotel_id}
                      className={cn(hoverHotel === r.hotel_id && "ac-row-hover")}
                      onMouseEnter={() => setHoverHotel(r.hotel_id)}
                      onMouseLeave={() => setHoverHotel(null)}
                    >
                      <td className="tabular-nums">{r.rank}</td>
                      <td>
                        <button type="button" className="ac-link" onClick={openHotel}>
                          {r.hotel_name}
                        </button>
                      </td>
                      <td>
                        {lens === "ALL" ? (
                          <>
                            {r.orm_thb > 0 && <span className="ac-pill ac-pill-svc-orm">ORM</span>}{" "}
                            {r.marcom_thb > 0 && <span className="ac-pill ac-pill-svc-marcom">Marcom</span>}
                          </>
                        ) : (
                          <span className={cn("ac-pill", lens === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>
                            {lens === "ORM" ? "ORM" : "Marcom"}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">{bahtFull(r.amount_thb)}</td>
                      <td className="text-right tabular-nums">{r.invoice_count}</td>
                      <td>
                        {r.prev_rank == null ? (
                          <span className="ac-pill ac-pill-new">ใหม่</span>
                        ) : d === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn("ac-pill", d! > 0 ? "ac-pill-good" : "ac-pill-watch")}>
                            {d! > 0 ? `▲ ${d}` : `▼ ${Math.abs(d!)}`}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {r.avg_rank == null ? (
                          <span className="text-xs text-muted-foreground">รอสะสม</span>
                        ) : (
                          r.avg_rank.toFixed(1)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!query.trim() && rows.length > 10 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setAll(!all)}>
              {all ? "แสดงแค่ 10 อันดับแรก" : `ดูทั้งหมด (${rows.length} โรงแรม)`}
            </Button>
          )}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ④ outstanding ---------- */

function OutstandingCard({
  debtors,
  breakdown,
  compare,
}: {
  debtors: PsReportRow[];
  breakdown: PsReportRow[];
  compare: boolean;
}) {
  const outstanding = breakdown.reduce((s, r) => s + num(r['outstanding']), 0);
  const invCount = breakdown.reduce((s, r) => s + num(r['outstanding_count']), 0);
  const customers = new Set(debtors.map((r) => String(r.customer_id ?? ""))).size;
  const collected = breakdown.reduce((s, r) => s + num(r['collected_count']), 0);
  const totalInv = collected + invCount;
  const overdueN = breakdown.reduce((s, r) => s + num(r['overdue_count']), 0);
  const overdueAmt = breakdown.reduce((s, r) => s + num(r['overdue_amount']), 0);
  const notdueN = breakdown.reduce((s, r) => s + num(r['notdue_count']), 0);
  const notdueAmt = breakdown.reduce((s, r) => s + num(r['notdue_amount']), 0);
  const groups = (["ORM", "Marcom"] as const).flatMap((line) =>
    (["EXISTING", "NEW"] as const).map((seg) => {
      const rows = breakdown.filter((r) => r['service_line'] === line && r['customer_segment'] === seg);
      return {
        label: `${line} · ${seg === "EXISTING" ? "ลูกค้าเดิม" : "ลูกค้าใหม่"}`,
        line,
        sum: rows.reduce((s, r) => s + num(r['outstanding']), 0),
        n: rows.reduce((s, r) => s + num(r['outstanding_count']), 0),
      };
    }),
  );
  const maxG = Math.max(...groups.map((g) => g.sum), 1);
  const biggest = groups.reduce((a, b) => (b.sum > a.sum ? b : a), groups[0]!);
  const empty = !breakdown.length;
  return (
    <DashCard
      title={
        <>
          ④ ลูกหนี้คงค้าง <TimeChip label="สถานะปัจจุบัน" />
        </>
      }
      question="ตอนนี้มีเงินค้างรับเท่าไร อยู่ที่บริการไหน?"
      answer={empty ? "—" : bahtShort(outstanding)}
      answerTone="neutral"
      answerSub={empty ? undefined : `${invCount} ใบ · ${customers} ราย · สถานะปัจจุบัน`}
      noteKey="outstanding"
      noteNamespace="ac"
      noteLines={
        empty
          ? summaryRules({ metric: "ลูกหนี้", empty: true }, ["R-EMPTY"])
          : [
              `กลุ่มใหญ่สุด ${biggest.label} ${bahtFull(biggest.sum)} (${pct(biggest.sum, outstanding)}%)`,
              `เกินกำหนดแล้ว ${overdueN} จาก ${invCount} ใบ (${bahtFull(overdueAmt)})`,
            ]
      }
      howToRead="การ์ดนี้แสดงสถานะปัจจุบัน ไม่เปลี่ยนตามช่วงเวลา · แท่งบน = ใบแจ้งหนี้ที่เก็บแล้วเทียบค้าง · 4 แท่งล่างแยกตามบริการและกลุ่มลูกค้า"
    >
      {empty ? (
        <ChartSkeleton />
      ) : (
        <>
          <ChartHint
            header={`ค้าง ${invCount} ใบ · ${bahtFull(outstanding)}`}
            lines={[
              `เกินกำหนด ${overdueN} ใบ · ${bahtFull(overdueAmt)}`,
              `ยังไม่ถึงกำหนด ${notdueN} ใบ · ${bahtFull(notdueAmt)}`,
            ]}
          >
            <div className="ac-topbar" tabIndex={0} role="button" aria-label={`เก็บแล้ว ${collected} จาก ${totalInv} ใบ`}>
              <div className="ac-topbar-collected" style={{ width: `${pct(collected, totalInv)}%` }} />
              <div className="ac-topbar-outstanding" style={{ width: `${pct(invCount, totalInv)}%` }} />
            </div>
          </ChartHint>
          <p className="ac-topbar-label">
            ใบแจ้งหนี้ที่เก็บแล้ว {collected} / {totalInv} ({pct(collected, totalInv)}%) · สถานะปัจจุบัน
          </p>
          <div className="ac-hbars">
            {groups.map((g) => (
              <ChartHint
                key={g.label}
                header={`${g.label} · ${bahtFull(g.sum)}`}
                lines={[`${g.n} ใบ · ${pct(g.sum, outstanding)}% ของยอดค้างทั้งหมด`]}
              >
                <div className="ac-hbar-row" tabIndex={0} role="button" aria-label={g.label}>
                  <span className="ac-hbar-label">{g.label}</span>
                  <div className="ac-hbar-track">
                    <div
                      className={cn("ac-hbar", g.line === "ORM" ? "ac-bar-top" : "ac-bar-marcom")}
                      style={{ width: `${(g.sum / maxG) * 100}%` }}
                    />
                  </div>
                  <span className="ac-hbar-value">
                    {bahtFull(g.sum)} · {g.n} ใบ
                  </span>
                </div>
              </ChartHint>
            ))}
          </div>
          {compare && <p className="ac-footnote">การ์ดนี้แสดงสถานะปัจจุบัน จึงไม่มี Compare A/B</p>}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ⑤ collection status ---------- */

function CollectionCard({
  views,
  svc,
  debtors,
  compare,
}: {
  views: AcViews | undefined;
  svc: (r: PsReportRow) => boolean;
  debtors: PsReportRow[];
  compare: boolean;
}) {
  const agg = (key: string) => (views?.[key] ?? []).filter(svc);
  const od = agg("v_ac_overdue");
  const sus = agg("v_ac_suspended");
  const legal = agg("v_ac_legal");
  const woRows = debtorRows(debtors).filter((r) => r.status === "WRITTEN_OFF");
  const paused = debtorRows(debtors).filter((r) => r.status === "PAUSED").length;
  const cnt = (rows: PsReportRow[]) => rows.reduce((s, r) => s + num(r['customer_count']), 0);
  const sumOut = (rows: PsReportRow[]) => rows.reduce((s, r) => s + num(r['outstanding']), 0);
  const sumInv = (rows: PsReportRow[]) => rows.reduce((s, r) => s + num(r['invoice_count']), 0);
  const stages: { status: CollectionStatus; n: number; amt: number; inv: number }[] = [
    { status: "OVERDUE", n: cnt(od), amt: sumOut(od), inv: sumInv(od) },
    { status: "SUSPENDED", n: cnt(sus), amt: sumOut(sus), inv: sumInv(sus) },
    { status: "LEGAL", n: cnt(legal), amt: sumOut(legal), inv: sumInv(legal) },
    { status: "WRITTEN_OFF", n: woRows.length, amt: woRows.reduce((s, r) => s + r.outstanding, 0), inv: woRows.reduce((s, r) => s + r.invoice_count, 0) },
  ];
  const act = stages[1]!.n + stages[2]!.n;
  const empty = stages.every((s) => !s.n);
  const maxAmt = Math.max(...stages.map((s) => s.amt), 1);
  const overdueTotal = stages[0]!.amt + stages[1]!.amt + stages[2]!.amt;
  return (
    <DashCard
      title={
        <>
          ⑤ สถานะ Collection <TimeChip label="สถานะปัจจุบัน" />
        </>
      }
      question="ลูกหนี้ที่เกินกำหนดอยู่ขั้นไหน ต้องลงมือกี่ราย?"
      answer={empty ? "—" : `${act} ราย`}
      answerTone="action"
      answerSub={empty ? undefined : `ต้องลงมือ · ปิดระบบ ${stages[1]!.n} · ส่งฟ้อง ${stages[2]!.n}`}
      noteKey="collection"
      noteNamespace="ac"
      noteLines={
        empty
          ? summaryRules({ metric: "Collection", empty: true }, ["R-EMPTY"])
          : [
              `ปิดระบบ + ส่งฟ้อง ${act} ราย ${bahtFull(stages[1]!.amt + stages[2]!.amt)} (${pct(stages[1]!.amt + stages[2]!.amt, overdueTotal)}% ของยอดเกินกำหนด)`,
              `ค้างชำระ ${stages[0]!.n} ราย ${bahtFull(stages[0]!.amt)}`,
            ]
      }
      howToRead="ขั้น collection เรียงตามความรุนแรง · PAUSED ไม่ใช่ลูกหนี้ปัญหาและไม่นับในกราฟ · สถานะปัจจุบัน ไม่เปลี่ยนตามช่วงเวลา"
    >
      {empty ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-hbars">
            {stages.map((s) => (
              <ChartHint
                key={s.status}
                header={`${COLLECTION_META[s.status].label} · ${s.n} ราย · ${bahtFull(s.amt)}`}
                lines={[`${s.inv} ใบ`, COLLECTION_META[s.status].rule]}
              >
                <div className="ac-hbar-row" tabIndex={0} role="button" aria-label={COLLECTION_META[s.status].label}>
                  <span className="ac-hbar-label">{COLLECTION_META[s.status].label}</span>
                  <div className="ac-hbar-track">
                    <div
                      className="ac-hbar"
                      style={{
                        width: `${Math.max(s.n ? 6 : 0, (s.amt / maxAmt) * 100)}%`,
                        background: COLLECTION_META[s.status].bar,
                      }}
                    >
                      {s.n > 0 && <span className="ac-hbar-in">{s.n}</span>}
                    </div>
                  </div>
                  <span className="ac-hbar-value">
                    {bahtFull(s.amt)} · {s.inv} ใบ
                  </span>
                </div>
              </ChartHint>
            ))}
          </div>
          <p className="ac-paused-chip">
            พักบริการ (PAUSED) {paused} ราย · ไม่ใช่ลูกหนี้ปัญหา · ไม่นับในกราฟ
          </p>
          {compare && <p className="ac-footnote">การ์ดนี้แสดงสถานะปัจจุบัน จึงไม่มี Compare A/B</p>}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ⑥ payment grades ---------- */

function GradeCard({
  gradeDist,
  chip,
  prevChip,
  compare,
}: {
  gradeDist: PsReportRow[];
  chip: string;
  prevChip: string;
  compare: boolean;
}) {
  const [hoverGrade, setHoverGrade] = useState<string | null>(null);
  const periods = useMemo(
    () => [...new Set(gradeDist.map((r) => String(r.billing_period).slice(0, 7)))].sort(),
    [gradeDist],
  );
  const latest = periods.at(-1) ?? null;
  const prev = periods.at(-2) ?? null;
  const byPeriod = (p: string | null) =>
    (["A", "B", "C", "D"] as const).map((g) => ({
      g,
      n: gradeDist
        .filter((r) => String(r.billing_period).slice(0, 7) === p && r.grade === g)
        .reduce((s, r) => s + num(r['customer_count']), 0),
    }));
  const cur = byPeriod(latest);
  const prv = byPeriod(prev);
  const total = cur.reduce((s, x) => s + x.n, 0);
  const pTotal = prv.reduce((s, x) => s + x.n, 0);
  const ab = pct(cur[0]!.n + cur[1]!.n, total);
  const abPrev = pTotal ? pct(prv[0]!.n + prv[1]!.n, pTotal) : null;
  const dCount = cur[3]!.n;
  const last6 = periods.slice(-6);
  const hover = hoverGrade ? cur.find((x) => x.g === hoverGrade) : null;
  return (
    <DashCard
      title={
        <>
          ⑥ เกรดการชำระ A–D <TimeChip label={chip} />
        </>
      }
      question="ลูกค้าจ่ายตรงเวลาแค่ไหน? (ราย customer)"
      answer={total ? `${ab}%` : "—"}
      answerTone="accent"
      answerSub={
        total
          ? compare && abPrev != null
            ? `A ${ab}% · B ${abPrev}% · Δ ${ab - abPrev >= 0 ? "▲ +" : "▼ "}${ab - abPrev}pp`
            : `${abPrev != null ? `▲ +${ab - abPrev}pp จาก ${prevChip} · ` : ""}เกรด A+B · ${cur[0]!.n + cur[1]!.n} / ${total} ราย`
          : undefined
      }
      noteKey="grades"
      noteNamespace="ac"
      noteLines={
        total
          ? [
              ...(abPrev != null && ab !== abPrev
                ? [`เกรด A+B ${ab > abPrev ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(ab - abPrev)}pp จาก ${prevChip}`]
                : []),
              `เกรด D ${dCount} จาก ${total} ราย (${pct(dCount, total)}%)`,
            ]
          : summaryRules({ metric: "เกรด", empty: true }, ["R-EMPTY"])
      }
      howToRead="โดนัท = เกรดล่าสุดต่อ customer · แท่งซ้อน = 6 งวดล่าสุด · งวดที่ยังไม่ปิดจะจางและนับใบค้างเป็น C ไว้ก่อน"
    >
      {!total ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-grade-wrap">
            <div className="ac-donut">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={cur.filter((x) => x.n)}
                    dataKey="n"
                    nameKey="g"
                    innerRadius={52}
                    outerRadius={76}
                    onMouseEnter={(d) => setHoverGrade(String((d as { g?: string }).g ?? ""))}
                    onMouseLeave={() => setHoverGrade(null)}
                  >
                    {cur.filter((x) => x.n).map((x) => (
                      <Cell key={x.g} fill={GRADE_META[x.g]!.bar} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="ac-donut-center">
                {hover ? (
                  <>
                    <b>{pct(hover.n, total)}%</b>
                    <span>
                      {hover.g} · {hover.n} จาก {total} ราย
                    </span>
                  </>
                ) : (
                  <>
                    <b>{total}</b>
                    <span>ราย customer</span>
                  </>
                )}
              </div>
            </div>
            <ul className="ac-grade-legend">
              {cur.map((x) => (
                <li
                  key={x.g}
                  onMouseEnter={() => setHoverGrade(x.g)}
                  onMouseLeave={() => setHoverGrade(null)}
                >
                  <span className="ac-dot" style={{ background: GRADE_META[x.g]!.bar }} />
                  <b>{x.g}</b> {x.n} ราย · {pct(x.n, total)}%
                </li>
              ))}
            </ul>
          </div>
          {last6.length > 1 && (
            <>
              <div className="ac-periods">
                {last6.map((p) => {
                  const rows = byPeriod(p);
                  const t = rows.reduce((s, x) => s + x.n, 0);
                  const open = p === latest;
                  return (
                    <ChartHint
                      key={p}
                      header={`${monYY(p)} · A+B ${pct(rows[0]!.n + rows[1]!.n, t)}%`}
                      lines={[`A ${rows[0]!.n} · B ${rows[1]!.n} · C ${rows[2]!.n} · D ${rows[3]!.n}`, `รวม ${t} ราย`]}
                    >
                      <div className={cn("ac-period-col", open && "ac-period-open")} tabIndex={0} role="button" aria-label={monYY(p)}>
                        <span className="ac-period-ab">{pct(rows[0]!.n + rows[1]!.n, t)}%</span>
                        <div className="ac-period-stack">
                          {(["D", "C", "B", "A"] as const).map((g) => {
                            const n = rows.find((x) => x.g === g)!.n;
                            return n ? (
                              <div key={g} style={{ height: `${(n / t) * 100}%`, background: GRADE_META[g]!.bar }} />
                            ) : null;
                          })}
                        </div>
                        <span className="ac-period-label">{monYY(p)}</span>
                      </div>
                    </ChartHint>
                  );
                })}
              </div>
              <p className="ac-footnote">
                {chip} ยังไม่ปิดงวด: ใบที่ยังค้างนับเป็น C ไว้ก่อน และเป็น D ได้หลัง 15 ของเดือนถัดไป
              </p>
            </>
          )}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ⑦ ORM system fee — greyed mock ---------- */

function SystemFeeMock() {
  const rows = [
    ["Sala Riverside Hotel", "ORM", 4200, "15 Sep 26", "ชำระแล้ว"],
    ["Baan Talay Resort", "ORM", 3800, "15 Sep 26", "ชำระแล้ว"],
    ["The Bay Hotel", "ORM", 2900, "15 Sep 26", "รอชำระ"],
    ["Grand Hills Resort", "ORM", 3100, "15 Sep 26", "รอชำระ"],
    ["Chaba Grand", "ORM", 4500, "15 Aug 26", "เลยกำหนด"],
  ];
  return (
    <section className="dash-card ac-mock-wrap" aria-label="⑦ ค่าระบบ ORM · รอ email ingestion">
      <div className="ac-mock" aria-hidden="true">
        <header className="dash-card-header">
          <div className="min-w-0">
            <h2>⑦ ค่าระบบ ORM</h2>
            <p className="dash-question">ค่าระบบเดือนนี้เท่าไร โรงแรมไหนยังไม่จ่าย?</p>
          </div>
          <div className="dash-answer-block">
            <div className="dash-answer text-primary">฿186,400</div>
            <div className="dash-answer-sub">62 โรงแรม</div>
          </div>
        </header>
        <div className="ac-answer-strip">
          {[
            ["ค่าระบบงวดนี้", "฿186,400"],
            ["ชำระแล้ว", "฿141,200"],
            ["รอชำระ", "฿32,800"],
            ["เลยกำหนด", "฿12,400"],
          ].map(([l, v]) => (
            <div key={l} className="ac-stat-box">
              <p className="ac-stat-label">{l}</p>
              <p className="ac-stat-value">{v}</p>
            </div>
          ))}
        </div>
        <div className="ac-topbar">
          <div className="ac-topbar-collected" style={{ width: "76%" }} />
          <div className="ac-topbar-outstanding" style={{ width: "17%" }} />
          <div style={{ width: "7%", background: "#C8553D" }} />
        </div>
        <table className="ac-table mt-3">
          <thead>
            <tr>
              <th>โรงแรม</th>
              <th>ระบบ</th>
              <th className="text-right">ยอด</th>
              <th>ครบกำหนด</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r[0])}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td className="text-right tabular-nums">฿{Number(r[2]).toLocaleString("th-TH")}</td>
                <td>{r[3]}</td>
                <td>{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ac-mock-overlay">
        <Lock className="size-5" />
        <b>⑦ ค่าระบบ ORM · รอ email ingestion</b>
        <span>ตัวอย่างหน้าตาเท่านั้น · จะแสดงข้อมูลจริงเมื่อเชื่อมแหล่งข้อมูลแล้ว</span>
      </div>
    </section>
  );
}

/* ---------- ⑧ debtor follow-up worklist ---------- */

function FollowUpCard({
  debtors,
  breakdown,
  compare,
  openHotel,
}: {
  debtors: PsReportRow[];
  breakdown: PsReportRow[];
  compare: boolean;
  openHotel: () => void;
}) {
  const [status, setStatus] = useState<CollectionStatus | "ALL">("ALL");
  const tickets = useTickets();
  const list = useMemo(() => sortDebtors(debtorRows(debtors)), [debtors]);
  const openTickets = tickets.filter((t) => t.type === "GRADE_RISK" && OPEN_STATUSES.includes(t.status));
  const ticketOf = (hotel_id: string) => openTickets.find((t) => t.subject_ref.hotel_id === hotel_id);
  const active = list.filter((r) => r.status !== "WRITTEN_OFF" && r.status !== "PAUSED");
  const wo = list.filter((r) => r.status === "WRITTEN_OFF");
  const shown = status === "ALL" ? list.filter((r) => r.status !== "PAUSED") : list.filter((r) => r.status === status);
  const counts = (s: CollectionStatus) => list.filter((r) => r.status === s).length;
  const notdueN = breakdown.reduce((s, r) => s + num(r['notdue_count']), 0);
  const notdueAmt = breakdown.reduce((s, r) => s + num(r['notdue_amount']), 0);
  const gradeD = list.filter((r) => r.grade === "D" && r.status !== "WRITTEN_OFF");
  const dWithTicket = gradeD.filter((r) => ticketOf(r.hotel_id)).length;
  const legalRows = list.filter((r) => r.status === "LEGAL");
  return (
    <DashCard
      title={
        <>
          ⑧ ลูกหนี้ที่ต้องติดตาม <TimeChip label="สถานะปัจจุบัน" />
        </>
      }
      question="ใครค้างเกินกำหนด ค้างเท่าไร และมีคนดูแลอยู่หรือยัง?"
      answer={list.length ? `${active.length} ราย` : "—"}
      answerSub={
        list.length
          ? `ค้างเกินกำหนด ${bahtFull(active.reduce((s, r) => s + r.outstanding, 0))} · + ตัดสูญ ${wo.length}`
          : undefined
      }
      noteKey="followup"
      noteNamespace="ac"
      noteLines={
        list.length
          ? [
              `ส่งฟ้อง ${legalRows.length} ราย รวม ${bahtFull(legalRows.reduce((s, r) => s + r.outstanding, 0))}`,
              `ticket GRADE_RISK เปิดอยู่ ${dWithTicket} จาก ${gradeD.length} รายเกรด D`,
            ]
          : summaryRules({ metric: "ลูกหนี้ติดตาม", empty: true }, ["R-EMPTY"])
      }
      howToRead="เรียง ส่งฟ้อง → ปิดระบบ → ค้างชำระ → ตัดสูญ แล้วตามยอด ฿ · ticket อ่านจากระบบ Ticket อย่างเดียว (BOT เปิดให้เกรด D)"
    >
      {!list.length ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-chip-row">
            {(["ALL", "OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={cn("ac-filter-chip", status === s && "ac-filter-chip-on")}
                onClick={() => setStatus(s)}
              >
                {s === "ALL" ? "ทั้งหมด" : COLLECTION_META[s].label} ·{" "}
                {s === "ALL" ? list.filter((r) => r.status !== "PAUSED").length : counts(s)}
              </button>
            ))}
          </div>
          <div className="ac-table-wrap" style={{ maxHeight: 520 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>โรงแรม · customer</th>
                  <th>บริการ</th>
                  <th>ผู้ดูแล</th>
                  <th className="text-right">฿ ค้าง</th>
                  <th className="text-right">ใบ</th>
                  <th>ค้างมาแล้ว</th>
                  <th>เกรด</th>
                  <th>สถานะ</th>
                  <th>Ticket GRADE_RISK</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const t = ticketOf(r.hotel_id);
                  return (
                    <tr key={`${r.hotel_id}-${r.service_line}`}>
                      <td>
                        <button type="button" className="ac-link" onClick={openHotel}>
                          {r.hotel_name}
                        </button>
                        <div className="text-xs text-muted-foreground">{r.customer_name}</div>
                      </td>
                      <td>
                        <span className={cn("ac-pill", r.service_line === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>
                          {r.service_line}
                        </span>
                      </td>
                      <td>{r.caretaker ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="text-right tabular-nums">{bahtFull(r.outstanding)}</td>
                      <td className="text-right tabular-nums">{r.invoice_count}</td>
                      <td className="tabular-nums">{r.overdue_months} เดือน</td>
                      <td>
                        <span className={cn("ac-pill", GRADE_META[r.grade]?.pill ?? "ac-pill-neutral")}>{r.grade}</span>
                      </td>
                      <td>
                        <span className={cn("ac-pill", COLLECTION_META[r.status].pill)}>
                          {COLLECTION_META[r.status].label}
                        </span>
                      </td>
                      <td>
                        {t ? (
                          <span className="ac-pill ac-pill-svc-orm">
                            #TKT-{t.ticket_id.slice(-4)} · {STATUS_TH[t.status]}
                          </span>
                        ) : r.grade === "D" && r.status !== "WRITTEN_OFF" ? (
                          <span className="ac-pill ac-pill-watch">ยังไม่มี · รอ BOT รอบถัดไป</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="ac-footnote">
            ไม่รวมใบที่ยังไม่ถึงกำหนด ({notdueN} ใบ · {bahtFull(notdueAmt)}) · เรียง ส่งฟ้อง → ปิดระบบ →
            ค้างชำระ → ตัดสูญ แล้วตามยอด ฿ · ticket อ่านจากระบบ Ticket อย่างเดียว (BOT เปิดให้เกรด D)
          </p>
          {compare && <p className="ac-footnote">การ์ดนี้แสดงสถานะปัจจุบัน จึงไม่มี Compare A/B</p>}
        </>
      )}
    </DashCard>
  );
}
