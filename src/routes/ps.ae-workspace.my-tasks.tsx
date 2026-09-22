/* PS App v4.1 Phase 2 · My Tasks dedicated view (own-only, mock data). */
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  taskGroups,
  todoDueLabel,
  todoItems,
  todoSearchText,
  todoSubject,
  todoText,
  type TaskType,
  type TodoItem,
} from "@/lib/ps-my-day";

const description =
  "My Tasks — รายการงานของฉันทั้งหมด (Renewals, Onboarding, Coaching, Surveys) พร้อมตัวกรองประเภท โรงแรม ช่วงวันครบกำหนด และค้นหา";

export const Route = createFileRoute("/ps/ae-workspace/my-tasks")({
  head: () => ({
    meta: [
      { title: "My Tasks — AE Workspace | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "My Tasks — AE Workspace" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyTasksPage;
});

const actionRoutes: Record<TaskType, { to: string; hash?: string; label: string }> = {
  renewal: { to: "/ps/ae-workspace/dashboard", hash: "zone1-renewals", label: "Open Renewal" },
  onboarding: { to: "/ps/ae-workspace/property-info", label: "Open Onboarding" },
  coaching: { to: "/ps/ae-workspace/coaching", label: "Open Coaching" },
  survey: { to: "/ps/ae-workspace/surveys", label: "Open Survey" },
};

type SortKey = "due" | "type" | "hotel";

function MyTasksPage() {
  const [types, setTypes] = useState<TaskType[]>([]);
  const [subject, setSubject] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("due");

  const subjects = useMemo(
    () => Array.from(new Set(todoItems.map(todoSubject))).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = todoItems.filter((t) => {
      if (types.length > 0 && !types.includes(t.type)) return false;
      if (subject !== "all" && todoSubject(t) !== subject) return false;
      if (from && t.due_date < from) return false;
      if (to && t.due_date > to) return false;
      if (q && !todoSearchText(t).includes(q)) return false;
      return true;
    });
    const byType = (t: TodoItem) => taskGroups.findIndex((g) => g.type === t.type);
    return rows.sort((a, b) => {
      if (sort === "type") return byType(a) - byType(b) || a.due_date.localeCompare(b.due_date);
      if (sort === "hotel") return todoSubject(a).localeCompare(todoSubject(b));
      return a.due_date.localeCompare(b.due_date) || byType(a) - byType(b);
    });
  }, [types, subject, from, to, query, sort]);

  const groups = taskGroups
    .map((g) => ({ ...g, items: filtered.filter((t) => t.type === g.type) }))
    .filter((g) => g.items.length > 0);

  const toggleType = (t: TaskType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="🌅 My Tasks"
        subtitle={`งานของฉันทั้งหมด · ${filtered.length} จาก ${todoItems.length} รายการ`}
        right={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ps/ae-workspace/dashboard">
              <ArrowLeft className="size-4" /> Back to Dashboard
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <div className="flex flex-wrap gap-3">
              {taskGroups.map((g) => (
                <label key={g.type} className="flex items-center gap-1.5 text-xs font-medium">
                  <Checkbox
                    checked={types.includes(g.type)}
                    onCheckedChange={() => toggleType(g.type)}
                    aria-label={g.label}
                  />
                  <span>
                    {g.icon} {g.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Hotel / Person</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Due date range</Label>
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
              <span className="text-xs text-muted-foreground">–</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาโรงแรม / งาน"
                  className="h-9 pl-8"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Panel>

      {groups.length === 0 ? (
        <Panel title="My Tasks">
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <span className="text-3xl">✨</span>
            <p className="text-sm font-semibold">You&apos;re all caught up 🎉</p>
            <p className="text-xs text-muted-foreground">ไม่มีงานที่ตรงกับตัวกรองนี้</p>
          </div>
        </Panel>
      ) : (
        groups.map((g) => (
          <Panel
            key={g.type}
            title={`${g.icon} ${g.label}`}
            right={<Chip>{g.items.length} งาน</Chip>}
          >
            <ul className="flex flex-col gap-2">
              {g.items.map((t) => {
                const route = actionRoutes[t.type];
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{todoText(t)}</p>
                      <p className="text-xs text-muted-foreground">
                        กำหนด {t.due_date} · {todoDueLabel(t)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={route.to} {...(route.hash ? { hash: route.hash } : {})}>
                        {route.label} →
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
