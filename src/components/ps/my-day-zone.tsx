/* PS App v4.1 · Zone 0 "My Day" — own-only hero zone (Scheduled + To Do). */
import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  emptyScheduledText,
  inRange,
  rangeLabel,
  scheduledItems,
  taskGroups,
  todoItems,
  todoText,
  type MyDayRange,
  type ScheduledItem,
  type TaskType,
  type TodoItem,
} from "@/lib/ps-my-day";

const ORM_TINT = "#DBEAFE";
const MARCOM_TINT = "#F3E8FF";

const taskRoutes: Record<TaskType, { to: string; hash?: string; label: string }> = {
  renewal: { to: "/ps/ae-workspace/dashboard", hash: "zone1-renewals", label: "Renewals" },
  onboarding: { to: "/ps/ae-workspace/property-info", label: "Onboarding" },
  coaching: { to: "/ps/ae-workspace/coaching", label: "Coaching" },
  survey: { to: "/ps/ae-workspace/surveys", label: "Surveys" },
};

export function MyDayZone() {
  const [range, setRange] = useState<MyDayRange>("today");
  const [meeting, setMeeting] = useState<ScheduledItem | null>(null);
  const [taskModal, setTaskModal] = useState(false);

  const scheduled = useMemo(() => {
    return scheduledItems
      .filter((m) => inRange(m.date, range))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [range]);

  const todos = useMemo(
    () => todoItems.filter((t) => inRange(t.due_date, range)).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [range],
  );

  const topTodos = todos.slice(0, 5);
  const groupedTop = taskGroups
    .map((g) => ({ ...g, items: topTodos.filter((t) => t.type === g.type), total: todos.filter((t) => t.type === g.type).length }))
    .filter((g) => g.total > 0);

  return (
    <Panel
      title="🌅 My Day"
      subtitle="งานของฉันวันนี้ · Scheduled + To Do (own-only)"
      right={
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={() => toast.info("🔧 Google Calendar sync coming soon")}>
            <RefreshCw className="size-4" /> Sync Google Calendar
          </Button>
          <span className="text-[11px] text-muted-foreground">Last synced: —</span>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "7d", "14d"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              range === r ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {rangeLabel[r]}
          </button>
        ))}
        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link to="/ps/ae-workspace/calendar">Go to my calendar →</Link>
        </Button>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {/* Left — Scheduled */}
        <div className="rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ⏰ Scheduled ({scheduled.length})
          </p>
          {scheduled.length === 0 ? (
            <EmptyState icon="☀️" title={emptyScheduledText[range]} sub="You're all caught up" />
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {scheduled.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setMeeting(m)}
                    className="w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 size-3.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: m.meeting_type === "ORM" ? ORM_TINT : MARCOM_TINT }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {m.time} {m.hotel_name}
                        </p>
                        <p className="text-xs">
                          {m.meeting_type === "ORM" ? "ORM Meeting" : "Marcom Meeting"} · Tier {m.tier}
                        </p>
                        <p className="text-[11px] text-muted-foreground">with {m.counterparty}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {scheduled.length > 0 && (
            <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
              <Link to="/ps/ae-workspace/calendar">View all ({scheduled.length}) →</Link>
            </Button>
          )}
        </div>

        {/* Right — To Do */}
        <div className="rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ✅ To Do ({todos.length})
          </p>
          {todos.length === 0 ? (
            <EmptyState icon="✨" title="You're all caught up 🎉" sub="No pending tasks" />
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              {groupedTop.map((g) => (
                <div key={g.type}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span style={{ color: g.color }}>{g.icon}</span> {g.label} ({g.total})
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {g.items.map((t) => (
                      <li key={t.id} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span className="min-w-0">{todoText(t)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {todos.length > 0 && (
            <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
              <Link to="/ps/ae-workspace/my-tasks">View all ({todos.length}) →</Link>
            </Button>
          )}

        </div>
      </div>

      <Dialog open={Boolean(meeting)} onOpenChange={(o) => !o && setMeeting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{meeting?.hotel_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <p>
              {meeting?.meeting_type === "ORM" ? "ORM Meeting" : "Marcom Meeting"} · Tier {meeting?.tier}
            </p>
            <p>
              {meeting?.date} · {meeting?.time}
            </p>
            <p className="text-muted-foreground">with {meeting?.counterparty}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link to="/ps/ae-workspace/meetings">เปิดใน Meetings tab</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Panel>

  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
