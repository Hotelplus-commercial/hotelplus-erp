import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { Dot, Estimate, OrmCard, statusSoft } from "@/components/orm/orm-ui";
import {
  gapStatus,
  heatMap,
  otaColumns,
  remainingDrags,
  strategyOptions,
  useOrmActionA,
  type Tier,
} from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orm/action-a/report")({
  head: () => ({
    meta: [
      { title: "รายงานลูกค้า — Hotel Plus ORM | Meridia" },
      {
        name: "description",
        content: "Tier-aware customer report preview: market view, performance verdict, target thread and strategy options.",
      },
      { property: "og:title", content: "รายงานลูกค้า — Hotel Plus ORM | Meridia" },
      { property: "og:description", content: "Preview what hotel owners see per tier (A / B / C)." },
    ],
  }),
  component: ReportScreen,
});

export function tierVisibility(tier: Tier) {
  return {
    market: true,
    phase3Full: tier === "A" || tier === "B",
    targetThread: tier === "A" || tier === "B",
    strategy: tier === "A",
  };
}

function ReportScreen() {
  const { reportTier, setReportTier, hotel } = useOrmActionA();
  const v = tierVisibility(reportTier);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">รายงานลูกค้า (Customer Report)</h1>
          <p className="text-sm text-muted-foreground">
            ตัวอย่างสิ่งที่เจ้าของโรงแรมเห็น — ลำดับการนำเสนอ: ผลการวัด → ภาพตลาด → กลยุทธ์
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {(["A", "B", "C"] as Tier[]).map((t) => (
            <button
              key={t}
              onClick={() => setReportTier(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                reportTier === t ? "bg-orm text-orm-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              Tier {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <article className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <header className="border-b pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orm">Hotel Plus ORM — Monthly Report</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{hotel.name}</h2>
            <p className="text-sm text-muted-foreground">รอบเดือน มิถุนายน 2026 · Tier {reportTier}</p>
          </header>

          {/* Phase 3 */}
          <section className="animate-in fade-in duration-300">
            <h3 className="font-display text-base font-semibold">1. ผลการวัด (Performance)</h3>
            {v.phase3Full ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="rounded-lg border border-orm-green/30 bg-orm-green/10 px-4 py-3">
                  <p className="font-display text-lg font-semibold text-orm-green">ดีขึ้น (Improving)</p>
                  <p className="text-sm text-muted-foreground">ผลจากกลยุทธ์ที่เลือกในรอบนี้</p>
                </div>
                {v.targetThread && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold">ใกล้เป้าหมายขึ้น +8%</p>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-orm" style={{ width: "72%" }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Gap เหลือ ฿420K — เทียบกับ Loop ก่อน</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">ตัวฉุดที่ยังเหลือ</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {remainingDrags.slice(0, 4).map((d) => (
                      <li key={d.text} className="flex items-center gap-2 text-sm">
                        <Dot tone={d.tone} />
                        {d.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <div className="rounded-lg border bg-surface/60 px-4 py-3">
                  <p className="text-sm font-medium">ภาพรวมล่าสุดอยู่ในเกณฑ์ดี</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">ดูแลโดยทีม Hotel Plus</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">ประเด็นหลักที่กำลังดูแล</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {remainingDrags.slice(0, 2).map((d) => (
                      <li key={d.text} className="flex items-center gap-2 text-sm">
                        <Dot tone={d.tone} />
                        {d.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* Phase 1 */}
          <section className="animate-in fade-in duration-300">
            <h3 className="font-display text-base font-semibold">2. ภาพตลาด (Market View)</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                    <th className="py-2 pr-3">Period</th>
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
                      {otaColumns.map((o) => {
                        const gap = row.gaps[o] ?? 0;
                        const tone = gapStatus(gap);
                        return (
                          <td key={o} className="py-1.5 pr-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
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
          </section>

          {/* Phase 2 */}
          {v.strategy && (
            <section className="animate-in fade-in duration-300">
              <h3 className="font-display text-base font-semibold">3. กลยุทธ์ (3 ทางเลือกให้เลือกเอง)</h3>
              <p className="text-xs text-muted-foreground">
                ตัวเลขรายได้เพิ่ม <Estimate />
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {strategyOptions.map((o) => (
                  <div key={o.id} className={cn("rounded-lg border p-3", statusSoft[o.flag])}>
                    <p className="text-xs font-semibold text-foreground">ทางเลือกที่ {o.id}</p>
                    <p className="mt-1 text-sm text-foreground">{o.strategy}</p>
                    <p className="mt-2 text-xs text-foreground/80">
                      คะแนน {o.score}/10 · {o.uplift} · {o.time}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="h-fit rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier {reportTier} เห็น</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <LegendRow on={v.market} label="ภาพตลาด" />
            <LegendRow on={v.phase3Full} label={v.phase3Full ? "ผลเต็ม (verdict + %)" : "ผลแบบย่อ (ไม่มีตัวเลขเป้า)"} />
            <LegendRow on={v.targetThread} label="Target Thread" />
            <LegendRow on={v.strategy} label="เลือกกลยุทธ์เอง" />
          </ul>
        </aside>
      </div>
    </div>
  );
}

function LegendRow({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {on ? <Check className="size-4 text-orm-green" /> : <Minus className="size-4 text-muted-foreground" />}
      <span className={cn(!on && "text-muted-foreground")}>{label}</span>
    </li>
  );
}
