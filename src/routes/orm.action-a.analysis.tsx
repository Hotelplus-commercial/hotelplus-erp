import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, ChevronDown, Lock, Star } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Dot, Estimate, OrmCard, OrmKpi, statusSoft, statusText } from "@/components/orm/orm-ui";
import {
  compHotels,
  gapStatus,
  heatMap,
  otaColumns,
  pricePosition,
  strategyOptions,
  useOrmActionA,
  type StrategyOption,
} from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

type Search = { tab?: "phase1" | "phase2" };

export const Route = createFileRoute("/orm/action-a/analysis")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "phase2" ? "phase2" : "phase1",
  }),
  head: () => ({
    meta: [
      { title: "วิเคราะห์ตลาด — Hotel Plus ORM | Meridia" },
      {
        name: "description",
        content: "Meta Search market visibility heat map and three strategy options with a hard-stop decision gate.",
      },
      { property: "og:title", content: "วิเคราะห์ตลาด — Hotel Plus ORM | Meridia" },
      { property: "og:description", content: "Phase 1 market visibility and Phase 2 strategy option selection." },
    ],
  }),
  component: AnalysisScreen,
});

function AnalysisScreen() {
  const search = Route.useSearch();
  const tab = search["tab"] ?? "phase1";
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
        {(
          [
            { key: "phase1", label: "ภาพตลาด (Phase 1)" },
            { key: "phase2", label: "3 ทางเลือกกลยุทธ์ (Phase 2)" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => navigate({ to: "/orm/action-a/analysis", search: { tab: t.key } })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-orm text-orm-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "phase2" ? <Phase2 /> : <Phase1 />}
    </div>
  );
}

/* ---------------- Phase 1 ---------------- */

function Phase1() {
  const chartData = ["14d WD", "14d WE", "60d WD", "60d WE", "LH"].map((period, i) => {
    const row: Record<string, string | number> = { period, benchmark: 0 };
    let compSum = 0;
    compHotels.forEach((h) => {
      const rate = h.rates[i] ?? 0;
      row[h.name] = rate;
      if (!h.subject) compSum += rate;
    });
    row["benchmark"] = Math.round(compSum / (compHotels.length - 1));
    return row;
  });

  const compColors = ["var(--chart-1)", "var(--orm-amber)", "var(--orm-accent)", "var(--orm)", "var(--chart-4)"];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold">ภาพตลาดบน Meta Search</h1>
        <p className="text-sm text-muted-foreground">เทียบราคา 6 โรงแรม × 5 ช่วงเวลา (Periods)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <OrmKpi label="Floor WD" value="฿1,120" hint="ต่ำสุดวันธรรมดา" />
        <OrmKpi label="Floor WE" value="฿1,490" hint="ต่ำสุดวันหยุด" />
        <OrmKpi label="Violation รวม (นับ)" value="6 รายการ" delta="gap > 30%" deltaTone="red" />
        <OrmKpi label="Booking.com Gap เฉลี่ย" value="36.3%" delta="At Risk" deltaTone="amber" />
        <OrmKpi label="ตำแหน่งราคา (Position)" value="3 / 6" hint="ถูกไปหาแพง" />
        <OrmKpi label="WD/WE Floor Gap %" value="+33.0%" hint="WE สูงกว่า WD" />
      </div>

      <OrmCard
        title="Heat Map — Gap % ต่อ OTA ต่อ Period"
        subtitle="เทียบราคาแต่ละ OTA กับ Floor Rate ของช่วงเวลานั้น"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                <th className="py-2 pr-3">Period</th>
                <th className="py-2 pr-3">Floor</th>
                {otaColumns.map((o) => (
                  <th key={o} className="py-2 pr-3">
                    {o}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatMap.map((row) => (
                <tr key={row.period} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{row.period}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                    ฿{row.floor.toLocaleString()}
                  </td>
                  {otaColumns.map((o) => {
                    const gap = row.gaps[o] ?? 0;
                    const tone = gapStatus(gap);
                    return (
                      <td key={o} className="py-1.5 pr-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums",
                            statusSoft[tone],
                          )}
                        >
                          <Dot tone={tone} />
                          {gap.toFixed(1)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Dot tone="green" /> In Range (0–15%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot tone="amber" /> At Risk (16–30%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot tone="red" /> Violation (&gt;30%)
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          หมายเหตุ: Booking.com ไม่ใช้เป็น BAR Reference (Genius activated)
        </p>
      </OrmCard>

      <OrmCard title="Floor Rate เทียบ 6 โรงแรม × 5 Periods" subtitle="เส้นประม่วง = Comp Benchmark (ค่าเฉลี่ยคู่แข่ง)">
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {compHotels.map((h, i) => (
                <Bar
                  key={h.name}
                  dataKey={h.name}
                  fill={h.subject ? "var(--orm-red)" : compColors[(i - 1 + compColors.length) % compColors.length]!}
                  radius={[4, 4, 0, 0]}
                />
              ))}
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Comp Benchmark"
                stroke="var(--orm-accent)"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </OrmCard>

      <OrmCard title="ตำแหน่งราคา (Price Position)" subtitle="เรียงจากถูกไปแพง — Subject อยู่อันดับ 3 จาก 6">
        <div className="flex flex-col gap-2">
          {pricePosition.map((h, i) => {
            const max = Math.max(...pricePosition.map((p) => p.avg)) || 1;
            return (
              <div key={h.name} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <span className={cn("w-52 shrink-0 truncate text-sm", h.subject && "font-semibold text-orm")}>
                  {h.name}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className={cn("h-full rounded-md transition-all", h.subject ? "bg-orm" : "bg-orm-accent/40")}
                    style={{ width: `${(h.avg / max) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-sm tabular-nums">฿{h.avg.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </OrmCard>
    </div>
  );
}

/* ---------------- Phase 2 ---------------- */

function Phase2() {
  const { selectedOption, setSelectedOption, confirmOption, confirmedOption } = useOrmActionA();
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h1 className="font-display text-xl font-semibold">3 ทางเลือกกลยุทธ์ — เลือกแบบไหนได้ผลแบบไหน</h1>
        <p className="text-sm text-muted-foreground">
          ตัวเลขรายได้ทั้งหมดเป็นการประมาณการ <Estimate />
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-orm-amber/30 bg-orm-amber/10 p-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orm-amber" />
        <p className="text-sm font-medium text-orm-amber">
          ⛔ ต้องเลือก 1 ทางเลือกก่อน จึงจะรันการวัดผล (Phase 3) ได้
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          วิธีอ่านคะแนน (Scoring legend)
          <ChevronDown className={cn("size-4 transition-transform", legendOpen && "rotate-180")} />
        </button>
        {legendOpen && (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">คะแนนผลกระทบ (Revenue Impact Score 1–10)</strong> — ประเมินจากขนาดรายได้ที่คาดว่าจะกู้คืนได้
              เทียบกับความเร็วและความเสี่ยง
            </p>
            <p className="mt-1">
              <strong className="text-foreground">สถานะราคา (ADR Flag)</strong> — 🟢 ADR คงที่ · 🟡 ADR ลดเล็กน้อย · 🔴 ADR ลดลงชัดเจน
            </p>
          </div>
        )}
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        {strategyOptions.map((o) => (
          <OptionCard
            key={o.id}
            option={o}
            selected={selectedOption === o.id}
            locked={confirmedOption !== null}
            onSelect={() => confirmedOption === null && setSelectedOption(o.id)}
          />
        ))}
      </div>

      <OrmCard title="ตารางเปรียบเทียบ (Comparison)" subtitle="ทุกมิติเรียงข้างกัน">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                <th className="py-2 pr-3">ทางเลือก</th>
                <th className="py-2 pr-3">คะแนน</th>
                <th className="py-2 pr-3">สถานะราคา</th>
                <th className="py-2 pr-3">รายได้เพิ่ม</th>
                <th className="py-2 pr-3">เวลา</th>
                <th className="py-2">ความเสี่ยง</th>
              </tr>
            </thead>
            <tbody>
              {strategyOptions.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium">ทางเลือกที่ {o.id}</td>
                  <td className={cn("py-2.5 pr-3 font-semibold tabular-nums", statusText[o.flag])}>{o.score}/10</td>
                  <td className="py-2.5 pr-3">{o.adrFlag}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{o.uplift}</td>
                  <td className="py-2.5 pr-3">{o.time}</td>
                  <td className="py-2.5">{o.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ตัวเลขรายได้เพิ่มทั้งหมด <Estimate />
        </p>
      </OrmCard>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:left-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {selectedOption ? (
              <>
                เลือกไว้: <strong>ทางเลือกที่ {selectedOption}</strong>
                {confirmedOption && <span className="ml-2 text-xs text-orm-green">· ยืนยันแล้ว</span>}
              </>
            ) : (
              <span className="text-muted-foreground">ยังไม่ได้เลือกทางเลือก</span>
            )}
          </p>
          <button
            disabled={!selectedOption || confirmedOption !== null}
            onClick={() => {
              if (!selectedOption) return;
              confirmOption(selectedOption);
              toast.success(`เลือกทางเลือกที่ ${selectedOption} แล้ว — พร้อมรันการวัดผลปลายเดือน`);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-orm px-4 py-2 text-sm font-semibold text-orm-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmedOption === null && <Lock className="size-4" />}
            ยืนยันเลือกทางเลือกนี้ → ปลดล็อก Phase 3
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  locked,
  onSelect,
}: {
  option: StrategyOption;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const [openDo, setOpenDo] = useState(false);
  const [openNot, setOpenNot] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-all hover:shadow-md",
        selected ? "border-orm ring-2 ring-orm/15" : "border-border",
        locked && !selected && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dot tone={option.flag} />
          <span className="font-display text-sm font-semibold">{option.title}</span>
        </div>
        {option.primary && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orm px-2 py-0.5 text-[11px] font-semibold text-orm-foreground">
            <Star className="size-3" /> Primary
          </span>
        )}
        {selected && !option.primary && <Check className="size-4 text-orm" />}
      </div>

      <p className="mt-2 text-sm">
        <strong>กลยุทธ์:</strong> {option.strategy}
      </p>

      <dl className="mt-3 divide-y rounded-lg border text-xs">
        <Row label="คะแนนผลกระทบ" value={`${option.score}/10`} tone={option.flag} />
        <Row label="สถานะราคา" value={option.adrFlag} />
        <Row label="เวลาเห็นผล" value={option.time} />
        <Row label="รายได้เพิ่ม (ประมาณการ)" value={option.uplift} />
      </dl>

      <p className="mt-3 text-xs font-semibold text-muted-foreground">สิ่งที่ต้องทำ</p>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-xs">
        {option.actions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Collapse
          open={openDo}
          onToggle={(e) => {
            e.stopPropagation();
            setOpenDo((v) => !v);
          }}
          label="ถ้าเลือกทางนี้"
          tone="green"
          items={option.ifDo}
        />
        <Collapse
          open={openNot}
          onToggle={(e) => {
            e.stopPropagation();
            setOpenNot((v) => !v);
          }}
          label="ถ้าไม่ทำ"
          tone="red"
          items={option.ifNot}
        />
      </div>
    </button>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "red" }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", tone && statusText[tone])}>{value}</dd>
    </div>
  );
}

function Collapse({
  open,
  onToggle,
  label,
  tone,
  items,
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  label: string;
  tone: "green" | "red";
  items: string[];
}) {
  return (
    <div className={cn("rounded-lg border", statusSoft[tone])}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle(e as unknown as React.MouseEvent)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold"
      >
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </div>
      {open && (
        <ul className="flex list-disc flex-col gap-1 border-t border-current/10 px-6 py-2 text-xs">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
