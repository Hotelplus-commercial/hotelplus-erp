import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, ClipboardList, Link2, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, MetricCard, TierBadge } from "@/components/ps/meeting-ui";
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
  ormSurveyFlags,
  teamPerformance,
  todayMeetings,
  useMeetingMgmt,
} from "@/lib/orm-meeting";

export const Route = createFileRoute("/ps/meeting-management/dashboard")({
  head: () => ({
    meta: [
      { title: "Meeting Dashboard — ORM Meeting Management | Meridia" },
      {
        name: "description",
        content: "ภาพรวมการจัดการนัดหมาย ORM ประจำเดือน — KPI, meeting pipeline และ flag ที่ต้อง coaching",
      },
      { property: "og:title", content: "Meeting Dashboard — ORM Meeting Management" },
      {
        property: "og:description",
        content: "ภาพรวม KPI, meeting pipeline และ flag ของทีม Partner Success",
      },
    ],
  }),
  component: DashboardTab,
});

function DashboardTab() {
  const { role, month, setMonth } = useMeetingMgmt();
  const showKpi = role === "AE" || role === "Partner Manager";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · ORM Meeting Management"
        title="ORM Meeting Management Dashboard"
        description="ภาพรวมการจัดการนัดหมาย ORM ประจำเดือน — ติดตาม KPI, Meeting pipeline, และ Flag ที่ต้อง coaching"
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

      {showKpi && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Tier A Completion"
            value="85%"
            badge="↓ 15%"
            sub="34 จาก 40 โรงแรม Tier A"
            percent={85}
            barTone="danger"
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
            value="90%"
            sub="27 จาก 30 meetings"
            percent={90}
            barTone="warn"
          />
        </div>
      )}

      {role === "AE" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.info("เปิดฟอร์ม Draft New Meeting ในแท็บ Meetings")}>
            <CalendarPlus className="size-4" /> Draft New Meeting
          </Button>
          <Button variant="outline" onClick={() => toast.info("Pending 5 รายการ")}>
            <ListChecks className="size-4" /> View Pending (5)
          </Button>
          <Button variant="outline" onClick={() => toast.info("Survey queue 3 รายการ")}>
            <ClipboardList className="size-4" /> Survey Queue (3)
          </Button>
        </div>
      )}

      {(role === "AE" || role === "ORM") && (
        <Panel title="Upcoming Today (7 Sep 2026)" subtitle="นัดหมายที่ต้องเข้าวันนี้">
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
        </Panel>
      )}

      {role !== "GRM" && (
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
                <p className="text-sm font-medium">Survey Flag: AE Service category, score 5.5</p>
                <p className="text-xs text-muted-foreground">yesterday</p>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone="warn">In coaching</Chip>
                <Button variant="link" size="sm" onClick={() => toast.info("เปิดรายละเอียด flag")}>
                  View Details
                </Button>
              </div>
            </li>
          </ul>
        </Panel>
      )}

      {role === "Partner Manager" && (
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
                      <Chip
                        tone={t.tierA >= 100 ? "success" : t.tierA >= 85 ? "warn" : "danger"}
                      >
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

      {role === "GRM" && (
        <Panel
          title={`Active ORM Survey Flags (${ormSurveyFlags.length})`}
          subtitle="เฉพาะหมวด ORM Quality"
        >
          {ormSurveyFlags.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="flex flex-col gap-2">
              {ormSurveyFlags.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">ORM: {f.orm}</p>
                    <p className="text-xs text-muted-foreground">
                      Category: {f.category} · Hotel: {f.hotel} · {f.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone="danger">Score {f.score.toFixed(1)}/10</Chip>
                    <Button size="sm" variant="outline" onClick={() => toast.info("เปิดรายละเอียด")}>
                      View
                    </Button>
                    <Button size="sm" onClick={() => toast.success("ทำเครื่องหมายว่าแก้ไขแล้ว")}>
                      Mark Resolved
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
