import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Lock, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Dot, OrmCard, statusSoft } from "@/components/orm/orm-ui";
import { baselineSnapshot, remainingDrags, useOrmActionA, verdictMatrix } from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orm/action-a/review")({
  head: () => ({
    meta: [
      { title: "วัดผล (Review) — Hotel Plus ORM | Meridia" },
      {
        name: "description",
        content: "Performance review of the selected strategy: baseline snapshot or verdict with target thread and drags.",
      },
      { property: "og:title", content: "วัดผล (Review) — Hotel Plus ORM | Meridia" },
      { property: "og:description", content: "Phase 3 performance review with verdict banner and KPI matrix." },
    ],
  }),
  component: ReviewScreen,
});

function ReviewScreen() {
  const { confirmedOption } = useOrmActionA();
  const [mode, setMode] = useState<"baseline" | "verdict">("verdict");

  if (confirmedOption === null) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="max-w-md rounded-xl border border-orm-red/30 bg-orm-red/5 p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-orm-red/10">
            <Lock className="size-5 text-orm-red" />
          </div>
          <h1 className="mt-4 font-display text-lg font-semibold">ยังเลือกกลยุทธ์ไม่ครบ</h1>
          <p className="mt-1 text-sm text-muted-foreground">กรุณาเลือก Strategy Option ก่อน จึงจะรันการวัดผลได้</p>
          <Link
            to="/orm/action-a/analysis"
            search={{ tab: "phase2" }}
            className="mt-5 inline-flex rounded-lg bg-orm px-4 py-2 text-sm font-semibold text-orm-foreground transition-opacity hover:opacity-90"
          >
            ไปหน้า 3 ทางเลือกกลยุทธ์
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">การวัดผลกลยุทธ์ (Performance Review)</h1>
          <span className="mt-1 inline-flex rounded-full bg-orm/10 px-2.5 py-0.5 text-xs font-semibold text-orm">
            กลยุทธ์ที่วัด: ทางเลือกที่ {confirmedOption}
          </span>
        </div>
        <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {(
            [
              { key: "baseline", label: "Loop แรก (Baseline)" },
              { key: "verdict", label: "Loop ที่ 2+ (Verdict)" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                mode === t.key ? "bg-orm text-orm-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "baseline" ? <Baseline /> : <Verdict />}
    </div>
  );
}

function Baseline() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-sm">
          นี่คือรอบแรกของโรงแรม — บันทึกเป็นจุดตั้งต้น (Baseline) ยังไม่ตัดสินผล เริ่มวัดจริงเดือนหน้า
        </p>
      </div>
      <OrmCard title="Snapshot ค่าตั้งต้น" subtitle="ไม่มีการตัดสินผล และยังไม่มีเป้าหมาย %">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <tbody>
              {baselineSnapshot.map((r) => (
                <tr key={r.kpi} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 text-muted-foreground">{r.kpi}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OrmCard>
    </div>
  );
}

function Verdict() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-orm-green/30 bg-orm-green/10 p-5">
        <TrendingUp className="size-6 shrink-0 text-orm-green" />
        <div>
          <p className="font-display text-lg font-semibold text-orm-green">ดีขึ้น (Improving)</p>
          <p className="text-sm text-muted-foreground">เทียบกับ Loop ก่อนหน้า — ทิศทางเป็นบวกทั้ง revenue และ content</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <OrmCard title="Target Thread" subtitle="เทียบกับ Loop ก่อน">
          <p className="font-display text-2xl font-semibold text-orm-green">ใกล้เป้าหมายขึ้น +8%</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-orm transition-all" style={{ width: "72%" }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Gap เหลือ ฿420K</p>
        </OrmCard>

        <OrmCard title="KPI Verdict Matrix" subtitle="OTA × Content / Review / Ranking">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                  <th className="py-2 pr-3">OTA</th>
                  <th className="py-2 pr-3">Content Score</th>
                  <th className="py-2 pr-3">Review Score</th>
                  <th className="py-2">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {verdictMatrix.map((r) => (
                  <tr key={r.ota} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.ota}</td>
                    <td className="py-2.5 pr-3">
                      <Dot tone={r.content} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Dot tone={r.review} />
                    </td>
                    <td className="py-2.5">
                      <Dot tone={r.ranking} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OrmCard>
      </div>

      <OrmCard title="ตัวฉุดที่ยังเหลือ (Remaining Drags)" subtitle="เรียงตามความรุนแรง">
        <ul className="flex flex-col gap-2">
          {remainingDrags.map((d) => (
            <li key={d.text} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", statusSoft[d.tone])}>
              <Dot tone={d.tone} />
              <span className="text-foreground">{d.text}</span>
            </li>
          ))}
        </ul>
      </OrmCard>
    </div>
  );
}
