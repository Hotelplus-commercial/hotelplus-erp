import { Chip } from "@/components/crm/crm-ui";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/orm-meeting";

export function TierBadge({ tier }: { tier: Tier }) {
  return <Chip tone={tier === "A" ? "danger" : "warn"}>Tier {tier}</Chip>;
}

export function MetricCard({
  label,
  value,
  badge,
  badgeTone = "danger",
  sub,
  percent,
  barTone = "warn",
}: {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: "success" | "danger" | "warn";
  sub: string;
  percent: number;
  barTone?: "success" | "danger" | "warn";
}) {
  const bar = {
    success: "[&>div]:bg-success",
    warn: "[&>div]:bg-warning",
    danger: "[&>div]:bg-destructive",
  }[barTone];
  return (
    <div className="card-elevated p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-end gap-2">
        <p className="font-display text-3xl font-bold leading-none">{value}</p>
        {badge && <Chip tone={badgeTone}>{badge}</Chip>}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      <Progress value={percent} className={cn("mt-3 h-1.5", bar)} />
    </div>
  );
}

export function EmptyState({ text = "ยังไม่มีข้อมูลในเดือนนี้" }: { text?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
