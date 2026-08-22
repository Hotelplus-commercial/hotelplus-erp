import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrm } from "@/lib/crm-store";

export const Route = createFileRoute("/bd/deals")({
  head: () => ({
    meta: [
      { title: "Deals จาก Pipedrive — BD App | Meridia Hotel ERP" },
      { name: "description", content: "ดีลที่ sync จาก Pipedrive พร้อมสร้างใบเสนอราคาต่อได้ทันที" },
      { property: "og:title", content: "Deals จาก Pipedrive — BD App" },
      { property: "og:description", content: "ดีลที่ sync จาก Pipedrive พร้อมสร้างใบเสนอราคา" },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { deals, quotations, customers, syncDeals, createQuote } = useCrm();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const rows = deals.filter((d) =>
    `${d.pipedrive_deal_id} ${d.hotel_name} ${d.contact_person} ${d.owner_email}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const won = deals.filter((d) => d.status.toLowerCase().includes("won")).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="ดีลทั้งหมด" value={deals.length} hint="sync จาก Pipedrive" />
        <Kpi label="Won" value={won} />
        <Kpi label="มีใบเสนอราคาแล้ว" value={new Set(quotations.map((x) => x.pipedrive_deal_id)).size} />
        <Kpi label="ลูกค้าใน Master" value={customers.length} />
      </div>

      <Panel
        title="Pipedrive Deals"
        subtitle="ข้อมูลอ่านอย่างเดียว — แก้ไขที่ Pipedrive แล้ว sync กลับ"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาโรงแรม / ผู้ติดต่อ"
              className="h-9 w-56"
            />
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                syncDeals();
                toast.success("Sync จาก Pipedrive เรียบร้อย (จำลอง)");
              }}
            >
              <RefreshCw className="size-4" /> Sync
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Deal ID</th>
                <th className="py-2 pr-3">โรงแรม</th>
                <th className="py-2 pr-3">ผู้ติดต่อ</th>
                <th className="py-2 pr-3 text-right">Room key</th>
                <th className="py-2 pr-3">สถานะ</th>
                <th className="py-2 pr-3">Sync ล่าสุด</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const qs = quotations.filter((x) => x.pipedrive_deal_id === d.pipedrive_deal_id);
                return (
                  <tr key={d.pipedrive_deal_id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium tabular-nums">#{d.pipedrive_deal_id}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{d.hotel_name}</p>
                      <p className="text-xs text-muted-foreground">{d.owner_email}</p>
                    </td>
                    <td className="py-2.5 pr-3">{d.contact_person}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{d.room_key}</td>
                    <td className="py-2.5 pr-3">
                      <Chip tone={d.status.toLowerCase().includes("won") ? "success" : "info"}>{d.status}</Chip>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(d.synced_at)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {qs.map((x) => (
                          <Chip key={x.quote_id} tone="muted">
                            {x.quote_id}
                          </Chip>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const id = createQuote(d.pipedrive_deal_id, d.customer_id);
                            toast.success(`สร้างใบเสนอราคา ${id}`);
                            navigate({ to: "/bd/quotations/$quoteId", params: { quoteId: id } });
                          }}
                        >
                          สร้างใบเสนอราคา
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
