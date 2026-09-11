import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingMgmtProvider, mmRoles, useMeetingMgmt, type MmRole } from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

const description =
  "ORM Meeting Management: จัดการนัดหมาย ORM รายเดือน — Dashboard, Calendar, Meetings, Surveys และ Coaching queue";

export const Route = createFileRoute("/ps/ae-workspace")({
  head: () => ({
    meta: [
      { title: "ORM Meeting Management — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ORM Meeting Management — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <MeetingMgmtProvider>
      <MeetingShell />
    </MeetingMgmtProvider>
  ),
});

const allTabs = [
  { label: "Dashboard", to: "/ps/meeting-management/dashboard", roles: mmRoles },
  {
    label: "Calendar",
    to: "/ps/meeting-management/calendar",
    roles: ["AE", "Partner Manager"] as MmRole[],
  },
  {
    label: "Meetings",
    to: "/ps/meeting-management/meetings",
    roles: ["AE", "Partner Manager", "ORM"] as MmRole[],
  },
  {
    label: "Surveys",
    to: "/ps/meeting-management/surveys",
    roles: ["AE", "Partner Manager"] as MmRole[],
  },
  {
    label: "Coaching",
    to: "/ps/meeting-management/coaching",
    roles: ["Partner Manager"] as MmRole[],
  },
];

function MeetingShell() {
  const { role, setRole } = useMeetingMgmt();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tabs = allTabs.filter((t) => t.roles.includes(role));

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

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">View as</span>
          <Select value={role} onValueChange={(v) => setRole(v as MmRole)}>
            <SelectTrigger className="h-9 w-[190px]">
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
      </div>

      <Outlet />
    </div>
  );
}
