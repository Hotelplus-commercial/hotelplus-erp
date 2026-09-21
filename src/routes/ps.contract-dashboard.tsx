/* PS App v2.3 · Fix 2 — Contract Dashboard as a full 11-column Kanban board. */
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Kpi } from "@/components/crm/crm-ui";
import { KanbanBoard } from "@/components/ps/contract-kanban";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isExpired, useContractLifecycle } from "@/lib/contract-lifecycle";

export const Route = createFileRoute("/ps/contract-dashboard")({
  head: () => ({
    meta: [
      { title: "Contract Dashboard — PS App | Meridia Hotel ERP" },
      { name: "description", content: "Kanban 11 ขั้นตอน ติดตามสัญญาตั้งแต่ Quote Approved ถึงใบกำกับภาษี" },
      { property: "og:title", content: "Contract Dashboard — PS App" },
      { property: "og:description", content: "Kanban 11 ขั้นตอน ติดตามสัญญาแบบครบวงจร" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContractDashboard,
});

const SERVICE_LINES = ["ORM", "MARCOM", "PROD", "PP"] as const;

function ContractDashboard() {
  const { lifecycles, hydrated } = useContractLifecycle();
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("all");
  const [owner, setOwner] = useState("all");
  const [hotel, setHotel] = useState("all");
  const [showSigned, setShowSigned] = useState(true);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const owners = useMemo(() => [...new Set(lifecycles.map((l) => l.bd_owner_id))], [lifecycles]);
  const hotels = useMemo(() => [...new Set(lifecycles.map((l) => l.hotel_name))], [lifecycles]);

  const rows = lifecycles.filter((l) => {
    if (line !== "all" && l.service_line !== line) return false;
    if (owner !== "all" && l.bd_owner_id !== owner) return false;
    if (hotel !== "all" && l.hotel_name !== hotel) return false;
    if (!showSigned && l.current_stage >= 8) return false;
    if (showExpired && !isExpired(l)) return false;
    const hay = `${l.hotel_name} ${l.quote_id} ${l.contract_id ?? ""} ${l.customer_legal_name}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const stats = {
    total: rows.length,
    awaiting: rows.filter((l) => l.current_stage === 1).length,
    inProgress: rows.filter((l) => l.current_stage >= 2 && l.current_stage <= 7).length,
    signed: rows.filter((l) => l.current_stage >= 8).length,
    expired: rows.filter(isExpired).length,
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-30 space-y-3 bg-background/95 py-2 backdrop-blur">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Kpi label="ทั้งหมด" value={stats.total} />
          <Kpi label="Awaiting" value={stats.awaiting} hint="stage 1" />
          <Kpi label="In progress" value={stats.inProgress} hint="stage 2-7" />
          <Kpi label="Signed" value={stats.signed} hint="stage 8-11" />
          <Kpi label="Expired" value={stats.expired} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={line} onValueChange={setLine}>
            <SelectTrigger className="h-9 w-[11rem]">
              <SelectValue placeholder="Service line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก service line</SelectItem>
              {SERVICE_LINES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9 w-[15rem]">
              <SelectValue placeholder="BD owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก BD owner</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hotel} onValueChange={setHotel}>
            <SelectTrigger className="h-9 w-[15rem]">
              <SelectValue placeholder="โรงแรม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกโรงแรม</SelectItem>
              {hotels.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="ค้นหาโรงแรม / quote / สัญญา / ชื่อนิติบุคคล"
              className="h-9 w-72 pl-8"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={showSigned} onChange={(e) => setShowSigned(e.target.checked)} /> Show signed
            (stage 8-11)
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> Show expired
            only
          </label>
        </div>
      </div>

      {!hydrated ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">กำลังโหลด…</p>
      ) : !lifecycles.length ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          ยังไม่มีสัญญาในระบบ · อนุมัติใบเสนอราคาใน BD App แล้วรายการจะขึ้นที่นี่อัตโนมัติ
        </p>
      ) : (
        <KanbanBoard rows={rows} />
      )}
    </div>
  );
}
