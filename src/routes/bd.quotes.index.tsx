import { Link, createFileRoute } from "@tanstack/react-router";
import { Mail, Megaphone, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

type DealFilter = "all" | "no_deal" | "in_deal";

const SEND_FILTERS: ("all" | BdStatus)[] = [
  "all",
  "draft",
  "ready_to_send",
  "active",
  "follow_up",
  "aging_15_29",
  "aging_30_45",
  "aging_46_60",
  "aging_61_90",
  "approved",
  "expired",
];

function QuoteDashboard() {
  const { quotes, markSent } = useBd();
  const [folder, setFolder] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [dealFilter, setDealFilter] = useState<DealFilter>("all");
  const [sendFilter, setSendFilter] = useState<"all" | BdStatus>("all");

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
  const rows = scoped.filter((q) => {
    if (dealFilter === "no_deal" && q.deal_id) return false;
    if (dealFilter === "in_deal" && !q.deal_id) return false;
    if (sendFilter !== "all" && q.status !== sendFilter) return false;
    return true;
  });

  const counts = {
    total: scoped.length,
    draft: scoped.filter((q) => q.status === "draft").length,
    ready: scoped.filter((q) => q.status === "ready_to_send").length,
    live: scoped.filter((q) => q.status === "active" || q.status === "follow_up").length,
    critical: scoped.filter((q) => ["aging_15_29", "aging_30_45", "aging_46_60", "aging_61_90"].includes(q.status))
      .length,
    expired: scoped.filter((q) => q.status === "expired").length,
    orm: scoped.filter((q) => q.type === "ORM").length,
    marcom: scoped.filter((q) => q.type === "MARCOM").length,
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
            <p className="text-xs text-muted-foreground">
              {counts.total} ใบเสนอราคา · ORM: {counts.orm} · Marcom: {counts.marcom}
            </p>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi label="ทั้งหมด" value={counts.total} />
          <Kpi label="📝 Draft (no deal)" value={counts.draft} />
          <Kpi label="🔗 Ready to send" value={counts.ready} />
          <Kpi label="🟢 Active / Follow-up" value={counts.live} />
          <Kpi label="🔴 Aging critical" value={counts.critical} />
          <Kpi label="⚫ Expired" value={counts.expired} />
        </div>

        <Panel title="Filters">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase text-muted-foreground">By deal</span>
              {(
                [
                  ["all", "All"],
                  ["no_deal", "📝 No deal"],
                  ["in_deal", "🔗 In deal"],
                ] as [DealFilter, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setDealFilter(v)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    dealFilter === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase text-muted-foreground">By send status</span>
              {SEND_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSendFilter(f)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    sendFilter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {f === "all" ? "All" : statusLabel[f]}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Quotes" subtitle="Draft/Ready to send = aging clock ยังไม่เริ่ม · เริ่มนับเมื่อกดส่งเท่านั้น">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Quote ID</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Package</th>
                  <th className="py-2 pr-3 text-right">Value</th>
                  <th className="py-2 pr-3">Deal</th>
                  <th className="py-2 pr-3">Sent</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const days = daysSince(q.sent_at);
                  return (
                    <tr
                      key={q.quote_id}
                      className={cn(
                        "border-b last:border-0",
                        q.status === "ready_to_send" && "bg-primary/5",
                        q.status === "expired" && "opacity-55",
                      )}
                    >
                      <td className="py-2.5 pr-3 font-medium">{q.quote_id}</td>
                      <td className="py-2.5 pr-3">
                        <Chip tone={q.type === "ORM" ? "info" : "warn"}>{q.type}</Chip>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{packageLabel(q)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{thb(quoteValue(q))}</td>
                      <td className="py-2.5 pr-3 text-xs">
                        {q.deal_id ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                            🔗 {q.deal_id}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">— No deal</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                        {q.sent_at ? fmtDate(q.sent_at) : <span className="italic">Not sent</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Chip tone={statusTone(q.status)}>
                          {statusLabel[q.status]}
                          {days !== null && !["approved", "expired"].includes(q.status) ? ` · ${days}d` : ""}
                        </Chip>
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {q.status === "ready_to_send" && (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                markSent(q.quote_id);
                                toast.success(`ส่ง ${q.quote_id} ให้ลูกค้าแล้ว (จำลอง) — เริ่มนับ aging`);
                              }}
                            >
                              <Mail className="size-3.5" /> Send now
                            </Button>
                          )}
                          <Button asChild size="sm" variant="outline">
                            <Link to="/bd/quotes/$quoteId" params={{ quoteId: q.quote_id }}>
                              Open
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-surface/50 p-4 text-xs">
            <p className="text-sm font-semibold">📝 Draft (No deal)</p>
            <p className="mt-1 text-muted-foreground">
              สร้างจาก Calculator แต่ยังไม่ได้ลงทะเบียนดีล · ยังไม่ส่ง · aging OFF · แก้ไข/สร้างใหม่ได้
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-xs">
            <p className="text-sm font-semibold">🔗 Ready to send</p>
            <p className="mt-1 text-muted-foreground">
              ผูกดีลแล้วแต่ Sales ยังไม่กดส่ง · aging ยังไม่เริ่ม · กด [📧 Send now] เพื่อส่งและเริ่มนับ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
