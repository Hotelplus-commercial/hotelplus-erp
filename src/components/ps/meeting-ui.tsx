import { Chip } from "@/components/crm/crm-ui";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { tierRule, type HotelStatus, type Tier } from "@/lib/orm-meeting";

export function TierBadge({ tier, pct }: { tier: Tier; pct?: number }) {
  const tone = tier === "A" ? "danger" : tier === "B" ? "warn" : "success";
  return (
    <TooltipProvider>
      <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Chip tone={tone}>
            {tier}
            {pct !== undefined ? ` · ${pct}%` : ""}
          </Chip>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Tier {tier} — {tierRule[tier].criteria} · {tierRule[tier].meeting}
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HotelStatusBadge({ status }: { status: HotelStatus }) {
  if (status === "NEW") return <Chip tone="info">🆕 NEW</Chip>;
  if (status === "REPORT ONLY") return <Chip tone="muted">📄 REPORT ONLY</Chip>;
  return <Chip tone="success">Active</Chip>;
}

export function SlaBadge({ overdue, days }: { overdue: boolean; days: number }) {
  return overdue ? (
    <Chip tone="danger">🔴 Overdue {days}d</Chip>
  ) : (
    <Chip tone="success">🟢 On-time</Chip>
  );
}

export function JourneyBar({ step, signedDaysAgo }: { step: number; signedDaysAgo: number }) {
  const phases = ["BD", "AE", "On-boarding", "ทีมบริการ", "Lived"];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      {phases.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 rounded-full",
              i <= step ? "bg-primary" : "border border-muted-foreground/40 bg-transparent",
            )}
          />
          <span className={cn(i <= step && "font-medium text-foreground")}>{p}</span>
          {i < phases.length - 1 && <span className="text-muted-foreground/50">──</span>}
        </span>
      ))}
      <span>(signed {signedDaysAgo} วันที่แล้ว)</span>
    </div>
  );
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
