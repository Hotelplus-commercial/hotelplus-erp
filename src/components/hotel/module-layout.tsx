import { Link, Outlet, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type Tab = { label: string; to: string };

export function AppTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
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
  );
}

export function ModuleLayout({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-4">
      <AppTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
