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
import { mmFlags, useMeetingMgmt, type Flag } from "@/lib/orm-meeting";

export const Route = createFileRoute("/ps/ae-workspace/coaching")({
  head: () => ({
    meta: [
      { title: "Coaching Queue — ORM Meeting Management | Meridia" },
      {
        name: "description",
        content: "คิว coaching ของ Partner Manager — flag จากการปฏิเสธนัดและคะแนนสำรวจต่ำ",
      },
      { property: "og:title", content: "Coaching Queue — ORM Meeting Management" },
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
      <Panel title="Coaching Queue" subtitle="เฉพาะ Partner Manager">
        <EmptyState text="หน้านี้เปิดให้เฉพาะ Partner Manager — สลับบทบาทด้านบนเพื่อเข้าดู" />
      </Panel>
    );
  }

  const open = mmFlags.filter((f) => f.status === "Open").length;
  const inCoaching = mmFlags.filter((f) => f.status === "In Coaching").length;
  const overdue = mmFlags.filter((f) => f.ageDays > 5 && f.status !== "Resolved").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · ORM Meeting Management · Coaching"
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
    </div>
  );
}
