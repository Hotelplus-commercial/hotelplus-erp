import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Dot, OrmCard, OrmKpi, TierPill } from "@/components/orm/orm-ui";
import { bookingPace, loopSteps, ormHotels, useOrmActionA } from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orm/action-a/")({
  head: () => ({
    meta: [
      { title: "ภาพรวม — Hotel Plus ORM | Meridia" },
      {
        name: "description",
        content: "Monthly loop status, OTB revenue, ADR, room nights and booking pace for each managed hotel.",
      },
      { property: "og:title", content: "ภาพรวม — Hotel Plus ORM | Meridia" },
      { property: "og:description", content: "Monthly revenue loop overview per hotel with booking pace tracking." },
    ],
  }),
  component: OverviewScreen,
});

function OverviewScreen() {
  const { hotel, confirmedOption } = useOrmActionA();
  const currentStep = confirmedOption ? "REVIEW" : hotel.step;
  const currentIndex = loopSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold">ภาพรวม Hotel Plus ORM</h1>
        <p className="text-sm text-muted-foreground">รอบการทำงานรายเดือน · KPI · Booking Pace · โรงแรมที่ดูแล</p>
      </div>
      <OrmCard
        title="รอบเดือนนี้ (Monthly Loop)"
        subtitle={`รอบเดือน มิถุนายน 2026 — Loop ที่ ${hotel.loop} · ${hotel.name}`}
      >
        <ol className="flex flex-wrap items-center gap-2">
          {loopSteps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const blocked = step.key === "OPTION" && confirmedOption === null;
            return (
              <li key={step.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    done && "border-orm-green/30 bg-orm-green/10 text-orm-green",
                    active && "border-orm bg-orm text-orm-foreground",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {done && <Check className="size-3.5" />}
                  {blocked && !done && <Lock className={cn("size-3.5", active ? "" : "text-orm-red")} />}
                  {step.label}
                </div>
                {i < loopSteps.length - 1 && <span className="h-px w-5 bg-border" />}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          รอบเดือน มิถุนายน 2026 — Loop ที่ {hotel.loop}
          {confirmedOption === null && " · ⛔ ต้องเลือก Strategy Option ก่อนจึงจะรัน Phase 3 ได้"}
        </p>
      </OrmCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OrmKpi label="รายได้รวมสะสม (Total OTB Revenue)" value="฿9.63M" delta="+12% vs เดือนก่อน" />
        <OrmKpi label="ราคาห้องเฉลี่ย (ADR)" value="฿1,273" delta="+3.1%" hint="เทียบ Loop ก่อน" />
        <OrmKpi label="ห้องที่จองแล้ว (Room Nights)" value="7,570 คืน" delta="+8.4%" />
        <OrmKpi label="ช่องขายดีที่สุด (Top Channel)" value="Agoda 51.6%" hint="ส่วนแบ่งรายได้" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <OrmCard title="แนวโน้มการจอง (Booking Pace)" subtitle="OTB สะสม (฿ ล้าน) เทียบเป้าหมายรายปี">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookingPace} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                  formatter={(v, n) => [v == null ? "—" : `฿${v}M`, n === "otb" ? "OTB สะสม" : "เป้าหมาย"]}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="var(--orm-accent)"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="otb"
                  stroke="var(--orm)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </OrmCard>

        <OrmCard title="สถานะรอบนี้ (This Loop Status)" subtitle="งานที่ต้องครบก่อนปิด loop">
          <ul className="flex flex-col gap-3 text-sm">
            <ChecklistRow state="done" label="Meta Search PDF uploaded" />
            <ChecklistRow state="done" label="Looker Studio connected" />
            <ChecklistRow
              state={confirmedOption ? "done" : "pending"}
              label={confirmedOption ? `เลือกทางเลือกที่ ${confirmedOption} แล้ว` : "รอเลือก Strategy Option"}
            />
            <ChecklistRow state="todo" label="OTA actuals (ปลายเดือน)" />
          </ul>
          {confirmedOption === null && (
            <Link
              to="/orm/action-a/analysis"
              search={{ tab: "phase2" }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-orm px-4 py-2 text-sm font-semibold text-orm-foreground transition-opacity hover:opacity-90"
            >
              ไปเลือก Strategy Option
            </Link>
          )}
        </OrmCard>
      </div>

      <OrmCard title="โรงแรมในความดูแล (My Hotels)" subtitle="สถานะ loop ล่าสุดของแต่ละโรงแรม">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                <th className="py-2 pr-3">โรงแรม</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Loop ปัจจุบัน</th>
                <th className="py-2 pr-3">สถานะ</th>
                <th className="py-2">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {ormHotels.map((h) => (
                <tr key={h.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                  <td className="py-2.5 pr-3 font-medium">{h.name}</td>
                  <td className="py-2.5 pr-3">
                    <TierPill tier={h.tier} />
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">Loop {h.loop}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{h.status}</td>
                  <td className="py-2.5 text-muted-foreground">{h.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OrmCard>
    </div>
  );
}

function ChecklistRow({ state, label }: { state: "done" | "pending" | "todo"; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {state === "done" ? (
        <Dot tone="green" />
      ) : state === "pending" ? (
        <Dot tone="amber" />
      ) : (
        <span className="inline-block size-2.5 rounded-full border border-border" />
      )}
      <span className={cn(state === "todo" && "text-muted-foreground")}>{label}</span>
    </li>
  );
}
