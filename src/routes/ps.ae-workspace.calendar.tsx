import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calendarMeetingCards,
  septemberDays,
  slotReason,
  slotTimes,
  useMeetingMgmt,
  type CalendarDay,
} from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/ae-workspace/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — AE Workspace | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "ปฏิทินความว่างของ ORM แบบ default-available พร้อมช่วงรับประชุมวันที่ 11–25 และการร่างนัดหมาย",
      },
      { property: "og:title", content: "Calendar — AE Workspace" },
      {
        property: "og:description",
        content: "ปฏิทินความว่างรายเดือนของทีม ORM พร้อม cutoff และ day-off",
      },
    ],
  }),
  component: CalendarTab,
});

const orms = ["ทั้งหมด", "Somchai K.", "Malee P.", "Nont W.", "Prasert L."];

const legend = [
  { dot: "bg-primary", label: "Confirmed meeting" },
  { dot: "bg-muted-foreground/60", label: "Draft meeting (DRAFT)" },
  { dot: "bg-success", label: "Available (ค่าเริ่มต้น)" },
  { dot: "bg-warning", label: "Blocked (ORM ติดงาน)" },
  { dot: "bg-muted-foreground/40", label: "Day-off / นอกเวลา" },
  { dot: "bg-primary", label: "Booked" },
  { dot: "bg-destructive", label: "Cutoff (นอกช่วง 11–25)" },
];

const slotClass: Record<string, string> = {
  available: "border-success/40 bg-success/10 text-success",
  block: "border-warning/40 bg-warning/10 text-warning",
  dayoff: "border-muted bg-muted text-muted-foreground",
  booked: "border-primary/40 bg-primary/10 text-primary",
  cutoff: "border-destructive/30 bg-destructive/5 text-destructive",
};

function CalendarTab() {
  const { month, setMonth } = useMeetingMgmt();
  const [orm, setOrm] = useState(orms[0]!);
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  const openable = septemberDays.filter((d) => d.state === "available").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Calendar"
        title="ORM Availability Calendar"
        description="ทุกช่วงเวลาว่างเป็นค่าเริ่มต้น — จะไม่ว่างก็ต่อเมื่อ ORM บล็อกเอง, เป็นวันหยุด, มีนัดแล้ว หรืออยู่นอกช่วงวันที่ 11–25"
        actions={
          <div className="flex items-center gap-2">
            <Select value={orm} onValueChange={setOrm}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orms.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={month}>{month}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Panel
        title="September 2026"
        subtitle={`${openable} วันเปิดรับนัดหมาย · ช่วงประชุม 11–25 · ORM: ${orm}`}
        right={
          <div className="flex flex-wrap items-center gap-3">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-full", l.dot)} />
                {l.label}
              </span>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          <span />
          {septemberDays.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setDay(d);
                setSlot(null);
              }}
              className={cn(
                "min-h-[74px] rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/60",
                d.state === "cutoff" && "border-destructive/30 bg-destructive/5",
                d.state === "dayoff" && "bg-muted",
                d.state === "past" && "opacity-60",
              )}
            >
              <span className="text-xs font-semibold">{d.day}</span>
              <div className="mt-1 flex flex-col gap-0.5">
                {d.slots.map((s, i) => (
                  <span
                    key={i}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px]",
                      slotClass[s] ?? "",
                    )}
                  >
                    {slotTimes[i]}
                  </span>
                ))}
              </div>
              {calendarMeetingCards
                .filter((m) => m.day === d.day)
                .map((m) => (
                  <div
                    key={m.hotel + m.time}
                    className={cn(
                      "relative mt-1 rounded px-1 py-0.5 text-[10px] leading-tight",
                      m.draft
                        ? "border-2 border-solid border-muted-foreground/60 bg-muted text-muted-foreground"
                        : "bg-primary font-bold text-primary-foreground",
                    )}
                  >
                    <span className="block truncate">{m.hotel}</span>
                    <span className="block">
                      Tier {m.tier} · {m.time}
                    </span>
                    {m.draft && (
                      <span className="mt-0.5 inline-block rounded-full bg-muted-foreground px-1.5 text-[9px] font-bold text-background">
                        DRAFT
                      </span>
                    )}
                  </div>
                ))}
              {d.marker && (
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {d.marker}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          Draft meeting = AE จองช่วงเวลาไว้ แต่ ORM ยังไม่ยืนยัน (สีเทา + ขอบทึบ + ป้าย DRAFT) ·
          เมื่อ ORM กด Confirm การ์ดจะเปลี่ยนเป็นสีน้ำเงิน (Confirmed) และช่วงเวลานั้นจะถูกจองถาวร ·
          ถ้า ORM ปฏิเสธหรือ AE ยกเลิก การ์ดจะหายไปและช่วงเวลากลับเป็น Available
        </p>
      </Panel>

      <Dialog open={day !== null} onOpenChange={(o) => !o && setDay(null)}>
        <DialogContent>
          {day && (
            <>
              <DialogHeader>
                <DialogTitle>{day.day} September 2026</DialogTitle>
                <DialogDescription>
                  {day.label ?? "เลือกช่วงเวลาที่ว่างเพื่อร่างนัดหมาย"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                {day.slots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={s !== "available"}
                    onClick={() => setSlot(i)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                      slot === i ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="font-medium">{slotTimes[i]}</span>
                    {s === "available" ? (
                      <Chip tone="success">ว่าง</Chip>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Chip tone={s === "booked" ? "info" : s === "cutoff" ? "danger" : "warn"}>
                          {s}
                        </Chip>
                        <span className="text-xs text-muted-foreground">{slotReason[s]}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <DialogFooter>
                <Button
                  disabled={slot === null}
                  onClick={() => {
                    toast.success(
                      `ร่างนัดหมายวันที่ ${day.day} Sep เวลา ${slotTimes[slot ?? 0]} แล้ว`,
                    );
                    setDay(null);
                  }}
                >
                  Draft Meeting
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
