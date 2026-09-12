import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  checklistDefs,
  checklistProgress,
  currentUserByRole,
  stage8Sla,
  useMeetingMgmt,
  type ChecklistKey,
  type MmRole,
  type PropertyCard,
} from "@/lib/orm-meeting";

export function OwnerLabel({ owner, lastActionBy }: { owner: string; lastActionBy?: string | undefined }) {
  return (
    <div className="mt-1">
      <p className="text-xs font-semibold">Owner: {owner}</p>
      {lastActionBy && lastActionBy !== owner && (
        <p className="text-[11px] text-muted-foreground">Last action by: {lastActionBy}</p>
      )}
    </div>
  );
}

export function Stage8SlaBadge({ days, slaDays = 7 }: { days: number; slaDays?: number }) {
  const sla = stage8Sla(days, slaDays);
  return <Chip tone={sla.tone === "warn" ? "warn" : sla.tone}>{sla.text}</Chip>;
}

/** Stage 8 checklist — Specialist ticks item 1, ORM items 2–4 (disabled in PS App). */
export function Stage8Checklist({ card }: { card: PropertyCard }) {
  const { role, ticks, toggleTick, log } = useMeetingMgmt();
  const t = ticks[card.id] ?? {};
  const progress = checklistProgress(t);

  const reasonFor = (
    key: ChecklistKey,
    owner: "Specialist" | "ORM",
    prevChecked: boolean,
  ): string | null => {
    if (owner === "ORM") return "Tick via ORM App";
    if (role !== "On-boarding Specialist") return "เฉพาะ On-boarding Specialist ติ๊กได้";
    if (!prevChecked) return "Complete previous step first";
    void key;
    return null;
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Stage 8 Checklist
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {checklistDefs.map((d, i) => {
            const prev = i === 0 ? true : Boolean(t[checklistDefs[i - 1]!.key]);
            const reason = reasonFor(d.key, d.owner, prev);
            const tick = t[d.key];
            const row = (
              <label className="flex items-start gap-2 text-xs">
                <Checkbox
                  className="mt-0.5"
                  checked={Boolean(tick)}
                  disabled={reason !== null}
                  onCheckedChange={() => {
                    toggleTick(card.id, d.key, currentUserByRole["On-boarding Specialist"]);
                    log(
                      `${currentUserByRole["On-boarding Specialist"]} ${tick ? "ยกเลิก" : "ติ๊ก"} ${d.label} — ${card.hotel}`,
                    );
                    toast.success(
                      tick ? `ยกเลิก ${d.label}` : `${d.label} เสร็จแล้ว — ${card.hotel}`,
                    );
                  }}
                />
                <span className={reason ? "text-muted-foreground" : ""}>
                  <span className="font-medium">
                    {d.no}. {d.label}
                  </span>
                  <span className="ml-1 text-[10px] text-muted-foreground">({d.owner})</span>
                  {tick && (
                    <span className="block text-[10px] text-muted-foreground">
                      ↳ {tick.by}, {tick.at}
                    </span>
                  )}
                </span>
              </label>
            );
            return (
              <li key={d.key}>
                {reason ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block cursor-not-allowed">{row}</span>
                    </TooltipTrigger>
                    <TooltipContent>{reason}</TooltipContent>
                  </Tooltip>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-2.5 flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1 transition-all" />
          <span className="text-[11px] font-semibold">{progress}%</span>
        </div>
        {(card.specialist || card.orm) && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Specialist: {card.specialist ?? "—"} · ORM: {card.orm ?? "—"}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}

export function roleCanApprove(role: MmRole) {
  return role === "On-boarding Specialist" || role === "Partner Manager";
}
