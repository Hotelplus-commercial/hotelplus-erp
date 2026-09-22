import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mmRoles,
  ormSurveyFlags,
  useMeetingMgmt,
  type MmRole,
} from "@/lib/orm-meeting";

import { cn } from "@/lib/utils";

const description =
  "AE Workspace: ศูนย์รวมงานของ Account Executive — Dashboard, Property Info pipeline, Calendar, Meetings, Surveys และ Coaching";

export const Route = createFileRoute("/ps/ae-workspace")({
  head: () => ({
    meta: [
      { title: "AE Workspace — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "AE Workspace — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspaceShell,
});


const allTabs: { label: string; to: string; roles: MmRole[] }[] = [
  {
    label: "Dashboard",
    to: "/ps/ae-workspace/dashboard",
    roles: ["AE", "Partner Manager", "ORM"],
  },
  {
    label: "My Tasks",
    to: "/ps/ae-workspace/my-tasks",
    roles: ["AE", "Partner Manager"],
  },
  {

    label: "Property Info",
    to: "/ps/ae-workspace/property-info",
    roles: ["AE", "Partner Manager", "On-boarding Specialist"],
  },
  {
    label: "Calendar",
    to: "/ps/ae-workspace/calendar",
    roles: ["AE", "Partner Manager"],
  },
  {
    label: "Meetings",
    to: "/ps/ae-workspace/meetings",
    roles: ["AE", "Partner Manager", "ORM"],
  },
  {
    label: "Surveys",
    to: "/ps/ae-workspace/surveys",
    roles: ["AE", "Partner Manager"],
  },
  {
    label: "Coaching",
    to: "/ps/ae-workspace/coaching",
    roles: ["Partner Manager"],
  },
];

function WorkspaceShell() {
  const { role, setRole } = useMeetingMgmt();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tabs = allTabs.filter((t) => t.roles.includes(role));

  const roleSwitcher = (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">View as</span>
      <Select value={role} onValueChange={(v) => setRole(v as MmRole)}>
        <SelectTrigger className="h-9 w-[210px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {mmRoles.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (role === "On-boarding Specialist" || role === "ORM") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            PS App · AE Workspace
          </p>
          {roleSwitcher}
        </div>
        <Panel
          title="ไม่มีสิทธิ์เข้าถึง AE Workspace"
          subtitle={
            role === "On-boarding Specialist"
              ? "On-boarding Specialist ใช้เมนู On-boarding Process เป็นพื้นที่ทำงานหลัก"
              : "ORM ใช้ ORM App สำหรับงาน servicing และ Stage 8 checklist"
          }
        >
          {role === "On-boarding Specialist" && (
            <Button asChild>
              <Link to="/ps/onboarding-process">ไปที่ On-boarding Process →</Link>
            </Button>
          )}
        </Panel>
      </div>
    );
  }

  if (role === "GRM") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            PS App · AE Workspace · GRM view
          </p>
          {roleSwitcher}
        </div>
        <Panel
          title={`ORM Survey Flags (${ormSurveyFlags.length})`}
          subtitle="GRM เห็นเฉพาะ flag หมวด ORM Quality"
        >
          <ul className="flex flex-col gap-2">
            {ormSurveyFlags.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">ORM: {f.orm}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.category} · {f.hotel} · {f.date}
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
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === t.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {roleSwitcher}
      </div>

      <Outlet />
    </div>
  );
}
