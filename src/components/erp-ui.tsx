import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Kpi, ModuleConfig, Row } from "@/lib/erp-data";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

const trendMap = {
  up: { icon: ArrowUpRight, className: "text-success" },
  down: { icon: ArrowDownRight, className: "text-destructive" },
  flat: { icon: Minus, className: "text-muted-foreground" },
} as const;

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const t = trendMap[kpi.trend];
  return (
    <div className="card-elevated p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {kpi.label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="truncate font-display text-2xl font-bold">{kpi.value}</p>
        <span className={cn("flex shrink-0 items-center gap-0.5 text-xs font-semibold", t.className)}>
          <t.icon className="size-3.5" />
          {kpi.delta}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.hint}</p>
    </div>
  );
}

const statusMap = {
  "on-track": { label: "On track", className: "bg-success/12 text-success" },
  "at-risk": { label: "At risk", className: "bg-warning/20 text-warning-foreground" },
  critical: { label: "Critical", className: "bg-destructive/12 text-destructive" },
  done: { label: "Complete", className: "bg-muted text-muted-foreground" },
} as const;

export function StatusPill({ status }: { status: Row["status"] }) {
  const s = statusMap[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

export function RecordTable({ module: m }: { module: ModuleConfig }) {
  return (
    <section className="card-elevated overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{m.tableTitle}</h2>
          <p className="truncate text-xs text-muted-foreground">{m.tableCaption}</p>
        </div>
        <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          {m.rows.length} records
        </span>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y md:hidden">
        {m.rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">
                {r.id} · {r.meta}
              </span>
              <span className="shrink-0 font-semibold text-foreground">{r.value}</span>
            </div>
            <Progress value={r.progress} className="mt-2 h-1.5" />
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Reference</th>
              <th className="px-4 py-2.5 font-medium">Record</th>
              <th className="px-4 py-2.5 font-medium">Owner / stage</th>
              <th className="px-4 py-2.5 font-medium">Progress</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              <th className="px-4 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {m.rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {r.id}
                </td>
                <td className="max-w-[22rem] px-4 py-3">
                  <p className="truncate font-medium">{r.primary}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.meta}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={r.progress} className="h-1.5 w-24" />
                    <span className="w-9 shrink-0 text-xs text-muted-foreground">{r.progress}%</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{r.value}</td>
                <td className="px-4 py-3 text-right">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  return (
    <section className="card-elevated p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3.5">
        {items.map((i) => (
          <li key={i.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-muted-foreground">{i.label}</span>
              <span className="shrink-0 font-semibold">{i.value}%</span>
            </div>
            <Progress value={i.value} className="mt-1.5 h-1.5" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActionQueue({
  items,
}: {
  items: { title: string; detail: string; owner: string; due: string }[];
}) {
  return (
    <section className="card-elevated p-4">
      <h2 className="text-base font-semibold">Action queue</h2>
      <ul className="mt-3 space-y-3">
        {items.map((i) => (
          <li key={i.title} className="rounded-lg border bg-surface/50 p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <p className="truncate text-sm font-medium">{i.title}</p>
              <span className="shrink-0 rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                {i.due}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              {i.owner}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ModuleView({ module: m }: { module: ModuleConfig }) {
  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-5">
      <PageHeader
        eyebrow={`${m.code} App`}
        title={m.name}
        description={m.description}
        actions={
          <span className="hidden rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            {m.tagline}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {m.kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecordTable module={m} />
        <div className="flex flex-col gap-4">
          <BreakdownCard title="Distribution" items={m.breakdown} />
          <ActionQueue items={m.queue} />
        </div>
      </div>
    </div>
  );
}
