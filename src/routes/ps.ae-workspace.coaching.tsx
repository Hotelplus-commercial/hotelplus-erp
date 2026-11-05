import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState } from "@/components/ps/meeting-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeedList, useAutoRefresh } from "@/components/ps/v4-ui";
import { activityFeed, coachGroups, coachRoles, coachStatuses, feedTypes } from "@/lib/ps-v4";
import { mmFlags, useMeetingMgmt, type Flag } from "@/lib/orm-meeting";
import { useSyncExternalStore } from "react";
import { onDemoSessionChange, psDemoOn } from "@/lib/demo-session";
import { CoachingGroup } from "@/components/workspace/coaching-group";
import { ackCount } from "@/lib/coaching-routing";
import { rosterFor, useCoachingTasks } from "@/lib/coaching-store";
import { COACH_TH } from "@/lib/ps-glossary";

/** Workspace Coaching patch v1.0: follows the shared DEMO switch immediately. */
const useDemoOn = () => useSyncExternalStore(onDemoSessionChange, psDemoOn, () => false);

export const Route = createFileRoute("/ps/ae-workspace/coaching")({
  head: () => ({
    meta: [
      { title: "Coaching Queue — AE Workspace | Meridia" },
      {
        name: "description",
        content: "คิว coaching ของ Partner Manager — flag จากการปฏิเสธนัดและคะแนนสำรวจต่ำ",
      },
      { property: "og:title", content: "Coaching Queue — AE Workspace" },
      { property: "og:description", content: "คิว coaching และ flag ของทีม Partner Success" },
    ],
  }),
  component: CoachingTab,
});

const aes = ["All", "Nont Wilson", "Fern Anderson", "Boss Thompson"];
const types = ["All", "Decline", "Survey ORM", "Survey AE", "Survey Overall", "No-show"];
const statuses = ["All", "Open", "In Coaching", "Resolved"];

function CoachingTab() {
  const { role } = useMeetingMgmt();
  const demoOn = useDemoOn();
  const [ae, setAe] = useState("All");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [active, setActive] = useState<Flag | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState("follow-up");

  const rows = useMemo(
    () =>
      mmFlags.filter(
        (f) =>
          (ae === "All" || f.ae === ae) &&
          (type === "All" || f.type === type) &&
          (status === "All" || f.status === status),
      ),
    [ae, type, status],
  );

  if (role !== "Partner Manager") {
    return (
      <div className="space-y-4">
      {/* WC7 note: AE awareness — ปฏิเสธนัด tasks where the AE is owner, with รับทราบ */}
      <CoachingGroup scope="AE" demo={demoOn} onlyRule="MEETING_REJECTED" />
      <Panel title="Coaching Queue" subtitle="เฉพาะ Partner Manager">
        <EmptyState text="หน้านี้เปิดให้เฉพาะ Partner Manager — สลับบทบาทด้านบนเพื่อเข้าดู" />
      </Panel>
      </div>
    );
  }

  const open = mmFlags.filter((f) => f.status === "Open").length;
  const inCoaching = mmFlags.filter((f) => f.status === "In Coaching").length;
  const overdue = mmFlags.filter((f) => f.ageDays > 5 && f.status !== "Resolved").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Coaching"
        title="Coaching Queue"
        description="Flag ที่เกิดจากการปฏิเสธนัด, no-show และคะแนนสำรวจต่ำ — ติดตามจนปิดเคส"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Open flags" value={open} hint="ยังไม่เริ่ม coaching" />
        <Kpi label="In coaching" value={inCoaching} hint="กำลังติดตาม" />
        <Kpi label="Overdue (>5 วัน)" value={overdue} hint="ต้องเร่งปิดเคส" />
      </div>

      <Panel title="Flags" subtitle={`${rows.length} รายการ`}>
        <div className="flex flex-wrap gap-2">
          <Select value={ae} onValueChange={setAe}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aes.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === "All" ? "All AEs" : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "All" ? "All types" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState text="ไม่มี flag ตามเงื่อนไขที่เลือก" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>AE</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{COACH_TH.owner}</TableHead>
                  <TableHead>{COACH_TH.ack}</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Chip tone={f.priority === "High" ? "danger" : "warn"}>{f.priority}</Chip>
                    </TableCell>
                    <TableCell>{f.type}</TableCell>
                    <TableCell className="font-medium">{f.ae}</TableCell>
                    <TableCell>{f.hotel}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {f.detail}
                    </TableCell>
                    <TableCell>{f.ageDays} วัน</TableCell>
                    <TableCell>
                      <Chip
                        tone={
                          f.status === "Resolved"
                            ? "success"
                            : f.status === "In Coaching"
                              ? "info"
                              : "warn"
                        }
                      >
                        {f.status}
                      </Chip>
                    </TableCell>
                    {/* old task: original routing kept, no owner recorded */}
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={f.status === "Resolved" ? "outline" : "default"}
                        onClick={() => setActive(f)}
                      >
                        {f.status === "Resolved" ? "View" : "Coach"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Panel>

      <Dialog
        open={active !== null}
        onOpenChange={(o) => {
          if (!o) {
            setActive(null);
            setNotes("");
          }
        }}
      >
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Coaching Session — {active.ae}</DialogTitle>
                <DialogDescription>
                  {active.type} · {active.hotel} · เปิดเคสเมื่อ {active.createdAt}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border bg-muted/40 p-3 text-sm">{active.detail}</div>

                <div>
                  <Label className="text-xs">Action taken</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow-up">1:1 follow-up call</SelectItem>
                      <SelectItem value="training">Assign refresher training</SelectItem>
                      <SelectItem value="shadow">Shadow next meeting</SelectItem>
                      <SelectItem value="escalate">Escalate to Head of PS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Coaching notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="สรุปสิ่งที่คุยและสิ่งที่ต้องปรับปรุง…"
                    className="mt-1"
                  />
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("บันทึกเป็น In Coaching");
                    setActive(null);
                    setNotes("");
                  }}
                >
                  Save & Keep Open
                </Button>
                <Button
                  disabled={notes.trim() === ""}
                  onClick={() => {
                    toast.success("ปิดเคส coaching แล้ว");
                    setActive(null);
                    setNotes("");
                  }}
                >
                  Mark Resolved
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <NewCoachingPanel demo={demoOn} />
      <CoachingGroup scope="AE" demo={demoOn} />
      <TeamCoachingTabs />
    </div>
  );
}

/** v4.0 additions — 2 new tabs, PM only (rendered inside the PM-gated view) */
function TeamCoachingTabs() {
  const [tab, setTab] = useState<"overview" | "feed">("overview");
  const [coachRole, setCoachRole] = useState("All");
  const [taskStatus, setTaskStatus] = useState("All");
  const [feedType, setFeedType] = useState<string>("All");
  useAutoRefresh(30);

  const groups = coachGroups.filter((g) => coachRole === "All" || g.role === coachRole);
  const events = activityFeed.filter((e) => feedType === "All" || e.type === feedType);

  return (
    <Panel
      title="Team Coaching & Notifications (v4.0)"
      subtitle="Layer 2 feed = สตรีมอ่านอย่างเดียวสำหรับ PM — ลงมือทำผ่าน deep link ในหน้าที่เกี่ยวข้อง"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "overview" | "feed")}>
        <TabsList>
          <TabsTrigger value="overview">Team Coaching Overview</TabsTrigger>
          <TabsTrigger value="feed">All Team Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Select value={coachRole} onValueChange={setCoachRole}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coachRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    Coach: {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={taskStatus} onValueChange={setTaskStatus}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coachStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    Status: {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groups.map((g) => {
            const tasks = g.tasks.filter((t) => taskStatus === "All" || t.status === taskStatus);
            return (
              <div key={g.coach} className="rounded-xl border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                  <p className="text-sm font-semibold">
                    {g.role} ({g.coach})
                  </p>
                  <Chip tone={tasks.length > 2 ? "danger" : "warn"}>{tasks.length} open tasks</Chip>
                </div>
                <ul className="flex flex-col gap-1.5 p-2">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                    >
                      <span className="font-medium">{t.hotel}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.question} · Score {t.score} · Opened {t.opened}
                      </span>
                      <Chip tone={t.status === "Open" ? "warn" : "info"}>{t.status}</Chip>
                      <Button size="sm" variant="outline" onClick={() => toast.info(`เปิดเคส ${t.hotel}`)}>
                        Open
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="feed" className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={feedType} onValueChange={setFeedType}>
              <SelectTrigger className="h-9 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    Event: {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Chip tone="muted">Auto-refresh 30s</Chip>
          </div>
          <ActivityFeedList events={events} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}

/** WC10: new Coaching tasks (routed by service) with ผู้ดูแล + รับทราบ columns; topic-name titles. */
function NewCoachingPanel({ demo }: { demo: boolean }) {
  const tasks = useCoachingTasks(demo);
  const roster = rosterFor(demo);
  const nameOf = (id: string) => roster.find((m) => m.id === id)?.name ?? id;
  return (
    <Panel title="งาน Coaching จากธงเซอร์เวย์ / การประชุม" subtitle={`${tasks.length} รายการ`}>
      {tasks.length === 0 ? <EmptyState text={COACH_TH.empty} /> : (
        <div className="overflow-x-auto" data-testid="coach-pm-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>งาน</TableHead>
                <TableHead>บริการ</TableHead>
                <TableHead>{COACH_TH.assignee}</TableHead>
                <TableHead>{COACH_TH.owner}</TableHead>
                <TableHead>{COACH_TH.ack}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => { const a = ackCount(t); return (
                <TableRow key={t.id}>
                  <TableCell><Chip tone={t.severity === "RED" ? "danger" : "warn"}>{t.severity === "RED" ? COACH_TH.fRed : COACH_TH.fYellow}</Chip> <span className="ml-1">{t.title}</span></TableCell>
                  <TableCell>{t.service === "ORM" ? "ORM" : "Marcom"}</TableCell>
                  <TableCell>{t.assignee_member_id ? nameOf(t.assignee_member_id) : COACH_TH.roleName[t.assignee_role]}</TableCell>
                  <TableCell>{t.owner_team ? `${t.owner_team === "RE_ACTIVE" ? "Re-active" : `ทีม ${t.owner_team}`}: ` : ""}{t.owner_member_ids.length ? t.owner_member_ids.map(nameOf).join(" · ") : "—"}</TableCell>
                  <TableCell>{COACH_TH.supervisorAck(a.n, a.total)}</TableCell>
                </TableRow>
              ); })}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
