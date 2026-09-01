import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, FileText, Home, Lock, Settings2, Target } from "lucide-react";

import { TierPill } from "@/components/orm/orm-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrmActionAProvider, ormHotels, useOrmActionA } from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orm/action-a")({
  head: () => ({
    meta: [
      { title: "Hotel Plus ORM — Revenue Strategy Loop | Meridia" },
      {
        name: "description",
        content:
          "Hotel Plus ORM (Action A): market visibility, 3 strategy options with a hard-stop gate, performance review and tier-aware customer reports.",
      },
      { property: "og:title", content: "Hotel Plus ORM — Revenue Strategy Loop | Meridia" },
      {
        property: "og:description",
        content: "Monthly revenue strategy loop for hotels: analysis, strategy gate, review and tier-aware reporting.",
      },
    ],
  }),
  component: ActionALayout,
});

const nav = [
  { to: "/orm/action-a", label: "ภาพรวม (Overview)", icon: Home, exact: true },
  { to: "/orm/action-a/analysis", label: "วิเคราะห์ตลาด (Analysis)", icon: BarChart3 },
  { to: "/orm/action-a/review", label: "วัดผล (Review)", icon: Target, gated: true },
  { to: "/orm/action-a/report", label: "รายงานลูกค้า (Customer Report)", icon: FileText },
  { to: "/orm/action-a/settings", label: "ตั้งค่าโรงแรม (Settings)", icon: Settings2 },
];

function ActionALayout() {
  return (
    <OrmActionAProvider>
      <Shell />
    </OrmActionAProvider>
  );
}

function Shell() {
  const { hotelId, setHotelId, tier, role } = useOrmActionA();
  const { confirmedOption } = useOrmActionA();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-orm px-2.5 py-1 font-display text-xs font-semibold text-orm-foreground">
            Hotel Plus ORM
          </span>
          <Select value={hotelId} onValueChange={setHotelId}>
            <SelectTrigger className="h-9 w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ormHotels.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TierPill tier={tier} />
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{role}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 shadow-sm lg:h-fit lg:flex-col lg:overflow-visible">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const locked = item.gated && confirmedOption === null;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-orm text-orm-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {locked && <Lock className={cn("ml-auto size-3.5", active ? "" : "text-orm-red")} />}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
