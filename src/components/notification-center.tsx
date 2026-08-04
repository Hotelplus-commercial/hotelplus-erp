import { useState } from "react";
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
  const [items, setItems] = useState(seed);
  const unread = items.filter((n) => n.unread).length;

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
