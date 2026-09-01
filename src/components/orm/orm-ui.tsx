import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { GapStatus } from "@/lib/orm-action-a";

export const statusText: Record<GapStatus, string> = {
  green: "text-orm-green",
  amber: "text-orm-amber",
  red: "text-orm-red",
};

export const statusDot: Record<GapStatus, string> = {
  green: "bg-orm-green",
  amber: "bg-orm-amber",
  red: "bg-orm-red",
};

export const statusSoft: Record<GapStatus, string> = {
  green: "bg-orm-green/10 text-orm-green border-orm-green/25",
  amber: "bg-orm-amber/10 text-orm-amber border-orm-amber/25",
  red: "bg-orm-red/10 text-orm-red border-orm-red/25",
};

export function Dot({ tone, className }: { tone: GapStatus; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", statusDot[tone], className)} />;
}

export function OrmCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md", className)}>
      {(title || right) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function OrmKpi({
  label,
  value,
  delta,
  deltaTone = "green",
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: GapStatus;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta && <span className={cn("text-xs font-semibold", statusText[deltaTone])}>{delta}</span>}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

export function TierPill({ tier, className }: { tier: "A" | "B" | "C"; className?: string }) {
  const tone = tier === "A" ? "green" : tier === "B" ? "amber" : "red";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        statusSoft[tone as GapStatus],
        className,
      )}
    >
      Tier {tier}
    </span>
  );
}

export function Estimate() {
  return <span className="text-[11px] font-normal text-muted-foreground">(ประมาณการ ไม่ใช่การรับประกัน)</span>;
}
