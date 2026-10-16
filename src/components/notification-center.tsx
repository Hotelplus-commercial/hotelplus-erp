import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { isPendingPickup, setTicketDemo, STATUS_TH, useTickets } from "@/lib/tickets-l0";
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
  const unread = items.filter((n) => n.unread).length + tickets.filter(t => t.status === "NEW").length;

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
          {tickets.length > 0 && <div className="border-b px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">งาน Ticket</p>
            <ul className="space-y-2">{tickets.map(t => <li key={t.ticket_id}>
              <Button asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left">
                <Link to="/bd/tickets" search={{ demo: demo ? 1 : undefined, ticket: t.ticket_id }}>
                  <span className="min-w-0 break-words"><span className="block text-xs font-medium">#{t.ticket_id} · {STATUS_TH[t.status]}</span>
                    <span className="block text-xs text-muted-foreground">{t.subject_ref.hotel_name} · {t.target_dept}{isPendingPickup(t) ? " · รอ pickup" : ""}</span>
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
