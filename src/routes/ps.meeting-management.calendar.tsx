import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { TierBadge } from "@/components/ps/meeting-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mmMeetings, statusTone, type Meeting } from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/meeting-management/calendar")({
  head: () => ({
    meta: [
      { title: "Meeting Calendar — ORM Meeting Management | Meridia" },
      {
        name: "description",
        content: "ปฏิทินนัดหมาย ORM รายเดือน พร้อมฟิลเตอร์ tier, สถานะ และวันสำคัญของรอบรายงาน",
      },
      { property: "og:title", content: "Meeting Calendar — ORM Meeting Management" },
      { property: "og:description", content: "ปฏิทินนัดหมาย ORM รายเดือนของทีม Partner Success" },
    ],
  }),
  component: CalendarTab,
});

const views = ["Day", "Week", "Month"] as const;
const tiers = ["A", "B"] as const;
const statuses = ["Confirmed", "Sent", "Declined", "Completed"] as const;
const orms = ["Somchai K.", "Malee P.", "Nont W.", "Prasert L."];

const legend = [
  { dot: "bg-success", label: "Confirmed" },
  { dot: "bg-warning", label: "Pending" },
  { dot: "bg-destructive", label: "Declined" },
  { dot: "bg-muted-foreground/40", label: "Available slot" },
  { dot: "bg-primary", label: "Completed" },
];

const dotFor = (m: Meeting) =>
  m.status === "Confirmed"
    ? "bg-success"
    : m.status === "Declined" || m.status === "No-show"
      ? "bg-destructive"
      : m.status === "Completed"
        ? "bg-primary"
        : "bg-warning";

function CalendarTab() {
  const [view, setView] = useState<(typeof views)[number]>("Month");
  const [tierFilter, setTierFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [ormFilter, setOrmFilter] = useState<string[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [detail, setDetail] = useState<Meeting | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(
    () =>
      mmMeetings.filter(
        (m) =>
          (tierFilter.length === 0 || tierFilter.includes(m.tier)) &&
          (statusFilter.length === 0 || statusFilter.includes(m.status)) &&
          (ormFilter.length === 0 || ormFilter.includes(m.orm)),
      ),
    [tierFilter, statusFilter, ormFilter],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, Meeting[]>();
    filtered.forEach((m) => {
      const d = Number(m.date.slice(8, 10));
      map.set(d, [...(map.get(d) ?? []), m]);
    });
    return map;
  }, [filtered]);

  // September 2026 starts on Tuesday
  const leading = 2;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const dayMeetings = openDay ? (byDay.get(openDay) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · ORM Meeting Management · Calendar"
        title="Meeting Calendar"
        description="ปฏิทินนัดหมายประจำเดือน กันยายน 2026 — คลิกวันเพื่อดูรายการนัดหมายในวันนั้น"
      />

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="card-elevated flex h-fit flex-col gap-4 p-4">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Tier</p>
            <div className="mt-2 flex flex-col gap-2">
              {tiers.map((t) => (
                <Label key={t} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={tierFilter.includes(t)}
                    onCheckedChange={() => toggle(tierFilter, setTierFilter, t)}
                  />
                  Tier {t}
                </Label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
            <div className="mt-2 flex flex-col gap-2">
              {statuses.map((s) => (
                <Label key={s} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={statusFilter.includes(s)}
                    onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                  />
                  {s}
                </Label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">ORM</p>
            <div className="mt-2 flex flex-col gap-2">
              {orms.map((o) => (
                <Label key={o} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={ormFilter.includes(o)}
                    onCheckedChange={() => toggle(ormFilter, setOrmFilter, o)}
                  />
                  {o}
                </Label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Legend</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {legend.map((l) => (
                <li key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", l.dot)} />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <Panel title="September 2026" subtitle={`${filtered.length} นัดหมายตามฟิลเตอร์ปัจจุบัน`}>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leading }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((d) => {
              const items = byDay.get(d) ?? [];
              return (
                <button
                  key={d}
                  onClick={() => setOpenDay(d)}
                  className="min-h-[74px] rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="text-xs font-semibold">{d}</span>
                  {d === 3 && (
                    <span className="mt-0.5 block text-[10px] text-primary">🔄 Tier Classify</span>
                  )}
                  {d === 10 && (
                    <span className="mt-0.5 block text-[10px] text-accent-foreground">
                      ✉ Report Send Day
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap gap-1">
                    {items.map((m) => (
                      <span key={m.id} className={cn("size-2 rounded-full", dotFor(m))} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <Dialog open={openDay !== null} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openDay} September 2026</DialogTitle>
            <DialogDescription>รายการนัดหมายของวันนี้</DialogDescription>
          </DialogHeader>
          {dayMeetings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีนัดหมายในวันนี้
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayMeetings.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setDetail(m)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {m.time ?? "—"} · {m.hotel}
                        {m.hotel2 && ` + ${m.hotel2}`}
                      </p>
                      <p className="text-xs text-muted-foreground">ORM: {m.orm}</p>
                    </div>
                    <div className="flex gap-2">
                      <TierBadge tier={m.tier} />
                      <Chip tone={statusTone[m.status]}>{m.status}</Chip>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detail.hotel}
                  {detail.hotel2 && ` + ${detail.hotel2}`}
                  <TierBadge tier={detail.tier} />
                </DialogTitle>
                <DialogDescription>
                  {detail.date} {detail.time ? `· ${detail.time}` : ""} ·{" "}
                  {detail.hotel2 ? "120 minutes (multi-property)" : "60 minutes"}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">ORM</dt>
                  <dd>{detail.orm}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    <Chip tone={statusTone[detail.status]}>{detail.status}</Chip>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Customer email</dt>
                  <dd className="truncate">{detail.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Meeting link</dt>
                  <dd className="truncate">
                    {detail.status === "Confirmed" ? "meet.meridia.app/" + detail.id : "—"}
                  </dd>
                </div>
              </dl>
              <DialogFooter className="flex-wrap gap-2">
                {detail.status === "Sent" || detail.status === "Draft" ? (
                  <>
                    <Button onClick={() => toast.success("ยืนยันนัดหมายแล้ว")}>Confirm</Button>
                    <Button variant="outline" onClick={() => toast.info("เลื่อนนัดหมาย")}>
                      Postpone
                    </Button>
                    <Button variant="outline" onClick={() => toast.warning("บันทึกว่าปฏิเสธนัด")}>
                      Mark Declined
                    </Button>
                  </>
                ) : detail.status === "Confirmed" ? (
                  <>
                    <Button onClick={() => toast.success("กำลังเข้าห้องประชุม")}>Join Meeting</Button>
                    <Button variant="outline" onClick={() => toast.info("ส่งคำขอเลื่อนนัด")}>
                      Reschedule
                    </Button>
                    <Button variant="outline" onClick={() => toast.warning("ยกเลิกนัดหมาย")}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => toast.info("เปิดแบบสอบถามหลัง meeting")}>
                    {detail.survey === "—" ? "Fill Survey" : "View Survey"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
