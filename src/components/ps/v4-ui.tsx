import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marcomLeadLabel,
  v4Color,
  type CardStatus,
  type FeedEvent,
  type MeetingCardV4,
  type MeetingType,
} from "@/lib/ps-v4";

export function TypeBadge({ type }: { type: MeetingType }) {
  return type === "ORM" ? <Chip tone="info">🟦 ORM</Chip> : <Chip tone="muted">🟪 Marcom</Chip>;
}

export function RequestedByBadge({ by }: { by: string }) {
  return (
    <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      * {by}
    </span>
  );
}

const statusChip: Record<CardStatus, { tone: "muted" | "info" | "success" | "warn" | "danger"; label: string }> = {
  NOT_ASSIGN: { tone: "muted", label: "Not Assign" },
  DRAFT: { tone: "muted", label: "DRAFT" },
  CONFIRMED: { tone: "success", label: "Confirmed" },
  REJECTED: { tone: "danger", label: "Rejected" },
  POSTPONED: { tone: "warn", label: "Postponed" },
};

/**
 * Meeting card visual system (v4.0):
 * header tint blue (#DBEAFE) for ORM / purple (#F3E8FF) for Marcom,
 * requested_by badge always visible, all info on the front.
 */
export function MeetingCard({
  card,
  dimmed,
  compact,
  selected,
  onSelect,
  onClick,
}: {
  card: MeetingCardV4;
  dimmed?: boolean;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (() => void) | undefined;
  onClick?: (() => void) | undefined;
}) {
  const isOrm = card.type === "ORM";
  const confirmed = card.status === "CONFIRMED";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      className={cn(
        "group overflow-hidden rounded-lg border text-left transition-all",
        onClick && "cursor-pointer hover:shadow-sm",
        dimmed && "opacity-40 grayscale",
        selected && "ring-2 ring-primary",
        card.status === "DRAFT" && "border-2 border-solid",
        card.status === "REJECTED" && "bg-destructive/5",
        card.status === "POSTPONED" && "bg-warning/10",
      )}
      style={{
        borderColor: card.status === "DRAFT" ? v4Color.draftBorder : undefined,
        backgroundColor: card.status === "DRAFT" ? v4Color.draftFill : undefined,
      }}
    >
      <div
        className="flex items-center justify-between gap-1 px-1.5 py-1"
        style={{
          backgroundColor: confirmed
            ? isOrm
              ? v4Color.ormFill
              : v4Color.marcomFill
            : isOrm
              ? v4Color.ormTint
              : v4Color.marcomTint,
          color: confirmed ? "#fff" : "#0f172a",
        }}
      >
        <span className={cn("truncate text-[11px] font-bold", card.status === "REJECTED" && "line-through")}>
          {isOrm ? "🟦" : "🟪"} {card.hotel}
        </span>
        {onSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onClick={(e) => e.stopPropagation()}
            onChange={onSelect}
            aria-label={`select ${card.hotel}`}
            className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[on=true]:opacity-100"
            data-on={selected ? "true" : "false"}
          />
        )}
      </div>
      <div className={cn("flex flex-col gap-0.5 px-1.5 py-1", compact ? "text-[10px]" : "text-[11px]")}>
        <span className="truncate text-muted-foreground">
          {card.hotelId} · Tier {card.tier}
          {card.time ? ` · ${card.time}` : ""}
        </span>
        <span className="truncate">
          {card.type === "MARCOM" ? marcomLeadLabel(card.owner) : card.owner}
          {card.team && card.team !== "—" && card.team !== "Marcom" ? ` · ${card.team}` : ""}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <RequestedByBadge by={card.requestedBy} />
          {card.status !== "NOT_ASSIGN" && (
            <Chip tone={statusChip[card.status].tone}>{statusChip[card.status].label}</Chip>
          )}
          {card.previouslyRejected && <Chip tone="danger">Previously rejected</Chip>}
        </span>
        {card.note && <span className="truncate text-muted-foreground">{card.note}</span>}
      </div>
    </div>
  );
}

/** 10-point discrete Likert row */
export function LikertRow({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const tone =
          n <= 4
            ? "border-destructive/40 text-destructive"
            : n <= 6
              ? "border-warning/50 text-warning"
              : "border-success/50 text-success";
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "size-8 rounded-full border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              tone,
              active && "bg-foreground text-background",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

const feedTarget = {
  meetings: "/ps/ae-workspace/meetings",
  surveys: "/ps/ae-workspace/surveys",
  coaching: "/ps/ae-workspace/coaching",
  calendar: "/ps/ae-workspace/calendar",
  ps: "/ps",
} as const;

/** Layer 2 feed = read-only stream (PM oversight). Actions happen via deep links. */
export function ActivityFeedList({ events }: { events: FeedEvent[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => (
        <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {e.icon} {e.title}
            </p>
            <p className="text-xs text-muted-foreground">
              By: {e.by} · {e.ago}
            </p>
          </div>
          <Button variant="link" size="sm" asChild>
            <Link to={feedTarget[e.link]}>Deep link →</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** shows a ticking "updated Xs ago" label for 30s auto-refresh streams */
export function useAutoRefresh(seconds = 30) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), seconds * 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return tick;
}
