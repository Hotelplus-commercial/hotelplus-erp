import { Link, createFileRoute } from "@tanstack/react-router";
import { Megaphone, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  daysSince,
  normalizeHotel,
  packageLabel,
  quoteValue,
  statusLabel,
  statusTone,
  useBd,
  type BdStatus,
} from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/quotes/")({
  component: QuoteDashboard,
});

const FILTERS: ("all" | BdStatus)[] = [
  "all",
  "not_sent",
  "active",
  "follow_up",
  "aging_15_29",
  "aging_30_45",
  "aging_46_60",
  "aging_61_90",
  "expired",
  "approved",
];

function QuoteDashboard() {
  const { quotes } = useBd();
  const [folder, setFolder] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [filter, setFilter] = useState<"all" | BdStatus>("all");

  const folders = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    quotes.forEach((q) => {
      const key = normalizeHotel(q.hotel_name);
      const cur = map.get(key);
      map.set(key, { name: cur?.name ?? q.hotel_name, count: (cur?.count ?? 0) + 1 });
    });
    return [...map.entries()]
      .filter(([, v]) => v.name.toLowerCase().includes(folderSearch.trim().toLowerCase()))
      .sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [quotes, folderSearch]);

  const scoped = folder ? quotes.filter((q) => normalizeHotel(q.hotel_name) === folder) : quotes;
  const rows = filter === "all" ? scoped : scoped.filter((q) => q.status === filter);

  const counts = {
    total: scoped.length,
    active: scoped.filter((q) => !["expired", "approved", "not_sent"].includes(q.status)).length,
    inDeal: scoped.filter((q) => q.deal_id).length,
    expired: scoped.filter((q) => q.status === "expired").length,
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 rounded-xl border bg-surface/40 p-3 lg:w-64">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Folders (by hotel)
        </p>
        <Input
          value={folderSearch}
          onChange={(e) => setFolderSearch(e.target.value)}
          placeholder="ค้นหาโรงแรม"
          className="mb-2 h-9"
        />
        <button
          onClick={() => setFolder(null)}
          className={cn(
            "mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm",
            !folder ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          ทั้งหมด ({quotes.length})
        </button>
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {folders.map(([key, v]) => (
            <button
              key={key}
              onClick={() => setFolder(folder === key ? null : key)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                folder === key ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted",
              )}
            >
              <span className="truncate">{v.name}</span>
              <span className="text-xs text-muted-foreground">{v.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-lg font-semibold">
              {folder ? folders.find(([k]) => k === folder)?.[1].name : "ใบเสนอราคาทั้งหมด"}
            </h1>
            <p className="text-xs text-muted-foreground">{counts.total} ใบเสนอราคา</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/bd/calculator/orm">
                <Lightbulb className="size-4" /> New ORM Quote
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link to="/bd/calculator/marcom">
                <Megaphone className="size-4" /> New Marcom Quote
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="ทั้งหมด" value={counts.total} />
          <Kpi label="กำลังติดตาม" value={counts.active} hint="ส่งแล้วยังไม่หมดอายุ" />
          <Kpi label="อยู่ในดีลแล้ว" value={counts.inDeal} />
          <Kpi label="หมดอายุ" value={counts.expired} />
        </div>

        <Panel title="Quotes" subtitle="สถานะคำนวณจากจำนวนวันตั้งแต่ส่งใบเสนอราคา (aging clock)">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {f === "all" ? "All" : statusLabel[f]}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Quote ID</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Package</th>
                  <th className="py-2 pr-3 text-right">Value</th>
                  <th className="py-2 pr-3">Sent</th>
                  <th className="py-2 pr-3 text-right">Aging</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Deal</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const days = daysSince(q.sent_at);
                  return (
                    <tr
                      key={q.quote_id}
                      className={cn("border-b last:border-0", q.status === "expired" && "opacity-55")}
                    >
                      <td className="py-2.5 pr-3 font-medium">{q.quote_id}</td>
                      <td className="py-2.5 pr-3">
                        <Chip tone={q.type === "ORM" ? "info" : "warn"}>{q.type}</Chip>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{packageLabel(q)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{thb(quoteValue(q))}</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(q.sent_at)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{days === null ? "—" : `${days}d`}</td>
                      <td className="py-2.5 pr-3">
                        <Chip tone={statusTone(q.status)}>{statusLabel[q.status]}</Chip>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{q.deal_id ?? "—"}</td>
                      <td className="py-2.5 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/bd/quotes/$quoteId" params={{ quoteId: q.quote_id }}>
                            เปิด
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      ไม่มีใบเสนอราคาตามเงื่อนไขนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ดูกติกาวงจรใบเสนอราคาได้ที่{" "}
            <Link to="/bd/quotes/lifecycle" className="font-medium text-primary underline">
              Lifecycle guide
            </Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
