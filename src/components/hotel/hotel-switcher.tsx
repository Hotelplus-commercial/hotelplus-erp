import { Building2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/hotel-profile";
import { hotelStatus, useHotelStore } from "@/lib/hotel-store";

export function HotelSwitcher({ canAdd = true }: { canAdd?: boolean }) {
  const { hotels, selectedId, select, addHotel, removeHotel } = useHotelStore();

  return (
    <section className="card-elevated p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          โรงแรมทั้งหมด ({hotels.length})
        </p>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => addHotel()}>
            <Plus className="mr-1.5 size-4" />
            เพิ่มโรงแรม
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {hotels.map((h) => {
          const sm = statusMeta[hotelStatus(h)];
          const on = h.id === selectedId;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => select(h.id)}
              className={cn(
                "group flex min-w-[13rem] shrink-0 items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                on ? "border-primary/50 bg-primary/[0.06]" : "bg-surface/50 hover:bg-muted/60",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {h.name || "โรงแรมใหม่"}
                </span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {h.code}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  sm.className,
                )}
              >
                {sm.label}
              </span>
              {canAdd && hotels.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="ลบโรงแรม"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHotel(h.id);
                  }}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
