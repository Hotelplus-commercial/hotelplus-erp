import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { setTicketDemo, STATUS_TH, useTickets } from "@/lib/tickets-l0";
import { workspaceByDept } from "@/lib/workspace-registry";
import { Bell, AlertTriangle, Info, CircleAlert, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { notifications as seed } from "@/lib/erp-data";
import { cn } from "@/lib/utils";
import { markAlertRead, resetContractHealthDemo, runDemoDayIfNeeded, useContractHealthStore } from "@/lib/contract-health-store";
import { QUICK_OF, type ChAlert } from "@/lib/contract-tab-r1";
import { R1_ALERT_TH, R1_TIER_TH } from "@/lib/ps-glossary";

/** Tab R1 §7 — the four contract-health events, shown only in the AE Workspace bell. */
const chText = (a: ChAlert) =>
  a.kind === "CH_NO_TICKET" ? R1_ALERT_TH.CH_NO_TICKET(a.n ?? 0)
  : a.kind === "CH_DUE_SOON" ? R1_ALERT_TH.CH_DUE_SOON(a.hotel_name ?? "", a.service ?? "", a.n ?? 0)
  : a.kind === "CH_TIER_WORSE" ? R1_ALERT_TH.CH_TIER_WORSE(a.hotel_name ?? "", a.service ?? "", R1_TIER_TH[a.tier ?? "A"], R1_TIER_TH[a.from ?? "G"])
  : R1_ALERT_TH.CH_OPPORTUNITY(a.hotel_name ?? "", a.service ?? "", a.label ?? "");
const aeShort = (id: string) => /^AE\d+-(.+)$/.exec(id)?.[1] ?? id;

const severityStyles = {
  critical: { icon: CircleAlert, className: "bg-destructive/10 text-destructive" },
  warning: { icon: AlertTriangle, className: "bg-warning/15 text-warning-foreground" },
  info: { icon: Info, className: "bg-info/10 text-info" },
} as const;

export function NotificationCenter() {
  const location = useRouterState({ select: r => r.location });
  const demo = new URLSearchParams(location.searchStr).get("demo") === "1";
  useEffect(() => { setTicketDemo(new URLSearchParams(window.location.search).get("demo") === "1"); }, [location.pathname, location.searchStr]);
  const tickets = useTickets().filter(t => t.status === "NEW" || t.status === "ACK" || t.status === "IN_PROGRESS");
  const [items, setItems] = useState(seed);
  useEffect(() => { if (!demo) resetContractHealthDemo(); }, [demo]);
  const aeBell = location.pathname.startsWith("/ps/ae-workspace");
  const ch = useContractHealthStore(demo);
  const allTickets = useTickets();
  useEffect(() => { if (demo && aeBell) runDemoDayIfNeeded(allTickets); }, [demo, aeBell, allTickets]);
  const chAes = [...new Set(ch.alerts.map((a) => a.ae))].sort();
  const [viewAe, setViewAe] = useState<string>("");
  const ae = viewAe && chAes.includes(viewAe) ? viewAe : chAes[0] ?? "";
  const chAlerts = aeBell ? ch.alerts.filter((a) => a.ae === ae).slice().reverse() : [];
  const unread = items.filter((n) => n.unread).length + tickets.filter(t => t.status === "NEW").length + chAlerts.filter((a) => !a.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread} unread alerts</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
          >
            <Check className="size-3.5" /> Mark all
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-[22rem]">
          {aeBell && chAes.length > 0 && <div className="border-b px-4 py-3" data-testid="ch-bell">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{R1_ALERT_TH.head}</p>
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">{R1_ALERT_TH.viewAs}
                <select className="rounded border bg-background px-1 py-0.5 text-[11px]" value={ae} onChange={(e) => setViewAe(e.target.value)}>
                  {chAes.map((a) => <option key={a} value={a}>{aeShort(a)}</option>)}
                </select>
              </label>
            </div>
            <ul className="space-y-1">{chAlerts.map((a) => <li key={a.key}>
              <Link className={cn("block rounded px-2 py-1.5 text-xs hover:bg-muted/60", !a.read && "bg-primary/[0.04] font-medium")}
                to="/ps" search={{ tab: "ps", ch: QUICK_OF[a.kind], chq: a.hotel_name ?? undefined, demo: demo ? 1 : undefined }}
                onClick={() => markAlertRead(demo, a.key)}>{chText(a)}</Link>
            </li>)}</ul>
          </div>}
          {tickets.length > 0 && <div className="border-b px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">งาน Ticket</p>
            <ul className="space-y-2">{tickets.map(t => <li key={t.ticket_id}>
              <Button asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left">
                <Link to={workspaceByDept(t.target_dept).path} search={{ demo: demo ? 1 : undefined, ticket: t.ticket_id }}>
                  <span className="min-w-0 break-words"><span className="block text-xs font-medium">#{t.ticket_id} · {STATUS_TH[t.status]}</span>
                    <span className="block text-xs text-muted-foreground">{t.subject_ref.hotel_name} · {workspaceByDept(t.target_dept).label}</span>
                  </span>
                </Link>
              </Button>
            </li>)}</ul>
          </div>}
          <ul className="divide-y">
            {items.map((n) => {
              const s = severityStyles[n.severity];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((i) => (i.id === n.id ? { ...i, unread: false } : i)),
                      )
                    }
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      n.unread && "bg-primary/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                        s.className,
                      )}
                    >
                      <s.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{n.detail}</span>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {n.module} · {n.time}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
