import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, ListChecks } from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import {
  marcomPipeline,
  marcomQuantityTotal,
  ormPipeline,
  ormQuantityBars,
  surveyStatusBox,
  v4Color,
} from "@/lib/ps-v4";
import { PageHeader } from "@/components/erp-ui";
import { JourneyBar } from "@/components/ps/meeting-ui";
import { AeOnboardingEntry } from "@/components/ps/ae-onboarding-entry";
import { MyDayZone } from "@/components/ps/my-day-zone";
import { RenewalActivityCards } from "@/components/ps/renewal-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  meetingQuantity,
  portfolioTotals,
  renewalRate,
  surveyCollection,
  tierAPipeline7,
  usePsRenewal,
} from "@/lib/ps-renewal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  monthOptions,
  propertyCards,
  teamPerformance,
  useMeetingMgmt,
} from "@/lib/orm-meeting";


const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export const Route = createFileRoute("/ps/ae-workspace/dashboard")({
  head: () => ({
    meta: [
      { title: "AE Dashboard — AE Workspace | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "ภาพรวมพอร์ตโรงแรม, ผลงานรายเดือน, สถานะ property pipeline และนัดหมายที่กำลังจะถึงของทีม AE",
      },
      { property: "og:title", content: "AE Dashboard — AE Workspace" },
      {
        property: "og:description",
        content: "Portfolio, performance, property pipeline และ upcoming meetings ของทีม AE",
      },
    ],
  }),
  component: DashboardTab,
});

function DashboardTab() {
  const { role, month, setMonth } = useMeetingMgmt();
  const { cards: renewalCards } = usePsRenewal();
  const [scope, setScope] = useState<"my" | "team">("my");
  const isPm = role === "Partner Manager";
  const currentUser = isPm ? "PM001-Alex" : "AE001-Nont";
  const showKpi = role === "AE" || isPm;
  const overdue = propertyCards.filter((p) => p.overdue).length;
  const firstProperty = propertyCards[1] ?? propertyCards[0]!;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Dashboard"
        title={isPm ? "Team Dashboard" : "AE Dashboard"}
        description="Zone 0 My Day · Zone 1 Portfolio · Zone 2 Performance · Zone 3 Property Pipeline"
        actions={
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Zone 0 — My Day (v4.1) */}
      <MyDayZone />

      {/* Zone 1 — Portfolio Overview (v3.1) */}
      <div id="zone1-renewals" className="scroll-mt-20" />
      <Panel
        title="Zone 1 · Portfolio Overview"


        subtitle="ภาพรวมพอร์ตโรงแรม + กิจกรรมการต่อสัญญา"
        right={
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {(["my", "team"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {s === "my" ? "My" : "Team"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border bg-surface/50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total Hotels
            </p>
            <p className="mt-1 font-display text-4xl font-bold">
              {scope === "my" ? portfolioTotals.totalHotels : portfolioTotals.totalHotels * 3}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">โรงแรมในพอร์ต</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0" asChild>
              <Link to="/ps">more details →</Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-surface/50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contract Renewals
            </p>
            <p className="mt-1 font-display text-4xl font-bold">
              {renewalCards.filter((c) => (scope === "my" ? c.owner === currentUser : true)).length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">ต้องต่อสัญญา (≤ 45 วัน)</p>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0" asChild>
              <Link to="/ps">more details →</Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-surface/50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              อัตราการต่อสัญญา
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 divide-x">
              <div>
                <p className="text-xs font-semibold">{renewalRate.month.label}</p>
                <p className="mt-1 text-xs">Total: {renewalRate.month.total}</p>
                <p className="text-xs font-semibold text-primary">
                  On Process: {renewalRate.month.onProcess} (
                  {pct(renewalRate.month.onProcess, renewalRate.month.total)}%)
                </p>
                <p className="text-xs font-semibold text-success">
                  Completed: {renewalRate.month.completed} (
                  {pct(renewalRate.month.completed, renewalRate.month.total)}%)
                </p>
                <p className="text-xs font-semibold text-destructive">
                  Churn: {renewalRate.month.churn} (
                  {pct(renewalRate.month.churn, renewalRate.month.total)}%)
                </p>
              </div>
              <div className="pl-3">
                <p className="text-xs font-semibold">{renewalRate.ytd.label}</p>
                <p className="mt-1 text-xs">Total: {renewalRate.ytd.total}</p>
                <p className="text-xs font-semibold text-success">
                  Completed: {renewalRate.ytd.completed} (
                  {pct(renewalRate.ytd.completed, renewalRate.ytd.total)}%)
                </p>
                <p className="text-xs font-semibold text-destructive">
                  Churn: {renewalRate.ytd.churn} ({pct(renewalRate.ytd.churn, renewalRate.ytd.total)}
                  %)
                </p>
              </div>
            </div>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0" asChild>
              <Link to="/ps">more details →</Link>
            </Button>
          </div>
        </div>

        <RenewalActivityCards scope={scope} currentUser={currentUser} canOverride={isPm} />
      </Panel>

      {/* Zone 2 — Meeting & Survey Performance (v4.0 refactor) */}
      {showKpi && (
        <Panel
          title="Zone 2 · Meeting & Survey Performance"
          subtitle={isPm ? "ผลรวมของทีม (team aggregate)" : "KPI ของฉันเดือนนี้"}
        >
          {/* Row 1 — 3 cards */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="card-elevated p-4">
              <p className="text-sm font-semibold">🟦 ORM Meeting Quantity ({month})</p>
              <p className="text-xs text-muted-foreground">Base: Tier target ต่อเดือน</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {ormQuantityBars.map((b) => {
                  const p = pct(b.count, b.base);
                  const bar =
                    b.tone === "danger"
                      ? "bg-destructive"
                      : b.tone === "warn"
                        ? "bg-warning"
                        : "bg-success";
                  return (
                    <li key={b.tier} className="flex items-center gap-2 text-xs">
                      <span className="w-12 font-semibold">Tier {b.tier}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", bar)}
                          style={{ width: `${Math.min(p, 100)}%` }}
                        />
                      </span>
                      <span className="w-20 text-right tabular-nums">
                        {b.count} ({p}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card-elevated p-4">
              <p className="text-sm font-semibold">🟪 Marcom Meeting Quantity ({month})</p>
              <div className="mt-1 rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
                Marcom Tier TBD — ยังไม่มีเกณฑ์ tier สำหรับ Marcom
              </div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {(["A", "B", "C"] as const).map((t) => (
                  <li key={t} className="flex items-center gap-2 text-xs opacity-50">
                    <span className="w-12 font-semibold">Tier {t}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" />
                    <span className="w-20 text-right text-muted-foreground">—</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 rounded-lg border p-2 text-xs">
                Overall total: <span className="font-semibold">{marcomQuantityTotal.done}</span> /{" "}
                {marcomQuantityTotal.target} โรงแรม
              </div>
            </div>

            <div className="card-elevated p-4">
              <p className="text-sm font-semibold">Survey Status ({month})</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border p-3 text-center">
                  <p className="font-display text-3xl font-bold">{surveyStatusBox.queue}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Queue Count</p>
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link to="/ps/ae-workspace/surveys">ไปกรอก →</Link>
                  </Button>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="font-display text-3xl font-bold text-success">
                    {pct(surveyStatusBox.filled, surveyStatusBox.meetings)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Collection {surveyStatusBox.filled}/{surveyStatusBox.meetings}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 / Row 3 — separate pipelines */}
          {[
            { key: "ORM", title: "🟦 ORM Meeting Pipeline", data: ormPipeline, tint: v4Color.ormTint },
            {
              key: "Marcom",
              title: "🟪 Marcom Meeting Pipeline",
              data: marcomPipeline,
              tint: v4Color.marcomTint,
            },
          ].map((row) => (
            <div key={row.key} className="card-elevated mt-3 overflow-hidden">
              <p
                className="px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: row.tint, color: "#0f172a" }}
              >
                {row.title} ({month})
              </p>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 overflow-x-auto sm:grid-cols-4 xl:grid-cols-7">
                  {row.data.map((s) => (
                    <div key={s.label} className="rounded-lg border p-2.5 text-center">
                      <Link
                        to="/ps/ae-workspace/meetings"
                        className="block transition-colors hover:text-primary"
                      >
                        <p className="font-display text-2xl font-bold leading-none">{s.value}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
                      </Link>
                      {s.label === "Not Assign" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1.5 h-7 w-full text-[11px]"
                          disabled={isPm}
                          asChild={!isPm}
                        >
                          {isPm ? (
                            <span>+ Draft Meeting</span>
                          ) : (
                            <Link to="/ps/ae-workspace/calendar" hash="draft">
                              <CalendarPlus className="size-3" /> + Draft Meeting
                            </Link>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/ps/ae-workspace/calendar">
                      <ListChecks className="size-4" /> → Take Action on Calendar
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {/* Zone 3 — v5.3 AE entry (per-hotel, shared guided drawer) */}
      <AeOnboardingEntry />

      <Panel title="Recent Flags" subtitle="Flag ล่าสุดที่เกี่ยวข้องกับคุณ">
        <ul className="flex flex-col gap-2">
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Hotel &quot;Sky Tower Bangkok&quot; declined meeting
              </p>
              <p className="text-xs text-muted-foreground">2 days ago</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip tone="danger">Coaching pending</Chip>
              <Button variant="link" size="sm" onClick={() => toast.info("เปิดรายละเอียด flag")}>
                View Details
              </Button>
            </div>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Property &quot;Green Valley&quot; overdue SLA 3 วัน (1st Check)
              </p>
              <p className="text-xs text-muted-foreground">yesterday</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip tone="danger">SLA Overdue</Chip>
              <Button variant="link" size="sm" asChild>
                <Link to="/ps/ae-workspace/property-info">View Details</Link>
              </Button>
            </div>
          </li>
        </ul>
      </Panel>

      {isPm && (
        <Panel title="Team Performance This Month" subtitle="ผลงานทีม AE ประจำเดือน">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AE Name</TableHead>
                  <TableHead>Tier A %</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Survey %</TableHead>
                  <TableHead>Active Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance.map((t) => (
                  <TableRow key={t.ae}>
                    <TableCell className="font-medium">{t.ae}</TableCell>
                    <TableCell>
                      <Chip tone={t.tierA >= 100 ? "success" : t.tierA >= 85 ? "warn" : "danger"}>
                        {t.tierA}%
                      </Chip>
                    </TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell>{t.survey}%</TableCell>
                    <TableCell>
                      <Chip tone={t.flags >= 5 ? "danger" : "muted"}>{t.flags}</Chip>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={t.flags >= 5 ? "default" : "outline"}
                        onClick={() => toast.info(`เปิดข้อมูลของ ${t.ae}`)}
                      >
                        {t.flags >= 5 ? "Coach Now" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  );
}
