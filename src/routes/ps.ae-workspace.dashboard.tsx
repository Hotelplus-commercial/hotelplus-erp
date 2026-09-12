import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, ClipboardList, Link2, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { JourneyBar, MetricCard, TierBadge } from "@/components/ps/meeting-ui";
import { Button } from "@/components/ui/button";
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
  portfolio,
  propertyCards,
  renewals,
  teamPerformance,
  tierAPipeline,
  todayMeetings,
  upcomingSummary,
  upcomingTeam,
  useMeetingMgmt,
} from "@/lib/orm-meeting";

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
  const isPm = role === "Partner Manager";
  const showKpi = role === "AE" || isPm;
  const overdue = propertyCards.filter((p) => p.overdue).length;
  const firstProperty = propertyCards[1] ?? propertyCards[0]!;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Dashboard"
        title={isPm ? "Team Dashboard" : "AE Dashboard"}
        description="Zone 1 Portfolio · Zone 2 Performance · Zone 3 Property Pipeline · Zone 4 Upcoming & Flags"
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

      {/* Zone 1 — Portfolio Overview */}
      <Panel title="Zone 1 · Portfolio Overview" subtitle="ภาพรวมพอร์ตโรงแรมที่ดูแล">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Total Hotels" value={`${portfolio.totalHotels}`} hint="โรงแรมในพอร์ต" />
          <Kpi
            label="Tier A This Month"
            value={`${portfolio.tierAHotels}`}
            hint="ต้องนัดประชุม 100%"
          />
          <Kpi
            label="Churn (เดือนนี้)"
            value={`${portfolio.churnMonth} (${portfolio.churnPct}%)`}
            hint={portfolio.churnBreakdown}
          />
          <Kpi label="Churn YTD" value={`${portfolio.churnYtd}`} hint="สะสมตั้งแต่ต้นปี" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Contract renewals:</span>
          {renewals.map((r) => (
            <Chip key={r.hotel} tone={r.daysLeft <= 14 ? "danger" : "warn"}>
              {r.hotel} · {r.daysLeft}d
            </Chip>
          ))}
        </div>
      </Panel>

      {/* Zone 2 — Performance */}
      {showKpi && (
        <Panel
          title="Zone 2 · My Performance"
          subtitle="ตัวชี้วัดหลักของเดือนนี้ (Tier A completion, quantity, survey)"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Tier A Completion"
              value={`${portfolio.tierACompletion}%`}
              badge="↓ 12%"
              sub={`${Math.round((portfolio.tierAHotels * portfolio.tierACompletion) / 100)} จาก ${portfolio.tierAHotels} โรงแรม Tier A`}
              percent={portfolio.tierACompletion}
              barTone="warn"
            />
            <MetricCard
              label="Meeting Quantity"
              value="34/40"
              sub="รวม Tier A + Tier B filler"
              percent={85}
              barTone="warn"
            />
            <MetricCard
              label="Survey Collection"
              value={`${portfolio.surveysCollected}/30`}
              sub={`คะแนนเฉลี่ย ${portfolio.surveyAvg.toFixed(1)}/10`}
              percent={90}
              barTone="success"
            />
          </div>

          {role === "AE" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/ps/ae-workspace/meetings">
                  <CalendarPlus className="size-4" /> Draft New Meeting
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/ps/ae-workspace/meetings">
                  <ListChecks className="size-4" /> View Pending (5)
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/ps/ae-workspace/surveys">
                  <ClipboardList className="size-4" /> Survey Queue (3)
                </Link>
              </Button>
            </div>
          )}
        </Panel>
      )}

      {/* Zone 3 — Property Info Pipeline (deep-link) */}
      <Panel
        title="Zone 3 · 🏨 Property Info Pipeline"
        subtitle={`On-boarding: ${propertyCards.length} โรงแรม · คลิกการ์ดเพื่อไปที่ On-boarding Process`}
        right={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/ps/ae-workspace/property-info">→ Property Info tab</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/ps/onboarding-process">→ On-boarding Process</Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pre-Services (On-boarding)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip tone="info">{propertyCards.length} properties</Chip>
              <Chip tone={overdue > 0 ? "danger" : "success"}>{overdue} overdue SLA</Chip>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {propertyCards.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/ps/onboarding-process"
                    hash={`hotel-${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 truncate font-medium">{p.hotel}</span>
                    <span className="text-xs text-muted-foreground">
                      Owner: {p.owner}
                      {p.lastActionBy && p.lastActionBy !== p.owner
                        ? ` · last action: ${p.lastActionBy}`
                        : ""}
                    </span>
                    <Chip tone={p.overdue ? "danger" : "success"}>
                      {p.overdue ? `🔴 Overdue ${p.daysInStage - p.slaDays}d` : "🟢 On-time"}
                    </Chip>
                    <span className="text-xs text-muted-foreground">
                      {p.daysInStage}d ในขั้นนี้ →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border bg-muted/30 p-2.5">
              <p className="text-xs font-semibold">Customer Journey · {firstProperty.hotel}</p>
              <div className="mt-1.5">
                <JourneyBar
                  step={firstProperty.journeyStep}
                  signedDaysAgo={firstProperty.signedDaysAgo}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier A Meeting Pipeline
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tierAPipeline.map((s) => (
                <div key={s.label} className="rounded-lg border p-2.5">
                  <p className="font-display text-2xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">
              🔜 Upcoming (ทั้งทีม): {upcomingSummary.team} โรงแรม · ของฉัน {upcomingSummary.mine}{" "}
              โรงแรม
            </p>
          </div>
        </div>
      </Panel>


      {/* Zone 4 — Upcoming + Flags */}
      <Panel
        title={`Zone 4 · Upcoming Meetings — ${isPm ? `ทีม ${upcomingSummary.team} นัด` : `ของฉัน ${upcomingSummary.mine} นัด`}`}
        subtitle="นัดหมายวันนี้ (7 Sep 2026)"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Multi</TableHead>
                <TableHead>ORM</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayMeetings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.time}</TableCell>
                  <TableCell>
                    {m.hotel}
                    {m.hotel2 && ` + ${m.hotel2}`}
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={m.tier} />
                  </TableCell>
                  <TableCell>
                    {m.hotel2 ? (
                      <Chip tone="info">
                        <Link2 className="mr-1 size-3" /> 2 hotels
                      </Chip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{m.orm}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => toast.success(`เข้าห้องประชุม ${m.hotel}`)}>
                        Join
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("ส่งคำขอเลื่อนนัดแล้ว")}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {isPm && (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {upcomingTeam.map((u) => (
              <li key={u.time + u.hotel} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {u.time} · {u.hotel}
                </span>
                <div className="flex items-center gap-2">
                  <TierBadge tier={u.tier} />
                  <Chip tone={u.mine ? "info" : "muted"}>{u.mine ? "ทีมฉัน" : "ทีมอื่น"}</Chip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

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
