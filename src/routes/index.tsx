import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { KpiCard, PageHeader, ActionQueue, BreakdownCard } from "@/components/erp-ui";
import { Progress } from "@/components/ui/progress";
import { modules, type Kpi } from "@/lib/erp-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "Portfolio-wide hotel management ERP: revenue, occupancy, reputation, workforce and automation health in one executive view.",
      },
      { property: "og:title", content: "Executive Dashboard | Meridia Hotel ERP" },
      {
        property: "og:description",
        content:
          "Portfolio-wide hotel management ERP: revenue, occupancy, reputation, workforce and automation health in one executive view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Executive,
});

const execKpis: Kpi[] = [
  { label: "RevPAR", value: "$214.80", delta: "+8.6%", trend: "up", hint: "portfolio, MTD" },
  { label: "Occupancy", value: "87.4%", delta: "+2.9%", trend: "up", hint: "6 properties" },
  { label: "GOP margin", value: "38.2%", delta: "+1.4%", trend: "up", hint: "vs. budget" },
  { label: "Guest satisfaction", value: "8.9 / 10", delta: "+0.3", trend: "up", hint: "1,284 reviews" },
];

const propertyPerformance = [
  { name: "Grand Marina", occ: 92, revpar: "$268", trend: "+9.1%" },
  { name: "Bayfront Residences", occ: 88, revpar: "$241", trend: "+6.4%" },
  { name: "Metro Central", occ: 84, revpar: "$186", trend: "+3.2%" },
  { name: "Riverside Retreat", occ: 79, revpar: "$174", trend: "-1.8%" },
];

function Executive() {
  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-5">
      <PageHeader
        eyebrow="Executive App"
        title="Portfolio command centre"
        description="Consolidated performance across commercial, financial, operational and people modules — updated every 15 minutes."
        actions={
          <span className="hidden rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            Period: Aug 2026 MTD
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {execKpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <section className="card-elevated overflow-hidden">
        <div className="border-b px-4 py-3.5">
          <h2 className="text-base font-semibold">Module health</h2>
          <p className="text-xs text-muted-foreground">
            Headline metric and status per operating application
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
          {modules.map((m) => {
            const kpi = m.kpis[0]!;
            return (
              <Link
                key={m.slug}
                to={m.to}
                className="group flex min-w-0 flex-col gap-2 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <m.icon className="size-4" />
                    </span>
                    <span className="truncate text-sm font-semibold">{m.code} App</span>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
                </div>
                <p className="truncate text-xs text-muted-foreground">{m.tagline}</p>
                <p className="mt-1 font-display text-xl font-bold">{kpi.value}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {kpi.label} · {kpi.delta}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card-elevated p-4">
          <h2 className="text-base font-semibold">Property performance</h2>
          <p className="text-xs text-muted-foreground">Occupancy and RevPAR, month to date</p>
          <ul className="mt-4 space-y-4">
            {propertyPerformance.map((p) => (
              <li key={p.name}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="shrink-0 text-sm font-semibold">
                    {p.revpar}{" "}
                    <span className="text-xs font-medium text-muted-foreground">{p.trend}</span>
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={p.occ} className="h-1.5" />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{p.occ}%</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-4">
          <BreakdownCard
            title="Revenue mix"
            items={[
              { label: "Rooms", value: 58 },
              { label: "F&B", value: 26 },
              { label: "Events", value: 10 },
              { label: "Ancillary", value: 6 },
            ]}
          />
          <ActionQueue
            items={[
              {
                title: "Approve Q4 commercial plan",
                detail: "BD + Marcom consolidated budget",
                owner: "Group COO",
                due: "Today",
              },
              {
                title: "Review 90-day receivables",
                detail: "$412K exposure across 18 accounts",
                owner: "Controller",
                due: "Wed",
              },
              {
                title: "Sign off workforce plan",
                detail: "62 open roles, 21 critical",
                owner: "Group HR",
                due: "Aug 12",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
