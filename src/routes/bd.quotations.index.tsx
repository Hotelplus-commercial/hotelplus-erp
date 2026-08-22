import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Chip, FolderTree, Kpi, Panel, fmtDate, sameDay } from "@/components/crm/crm-ui";
import { Input } from "@/components/ui/input";
import { thb } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";

export const Route = createFileRoute("/bd/quotations/")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const { quotations, deals } = useCrm();
  const [day, setDay] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const rows = quotations
    .filter((x) => sameDay(x.created_at, day))
    .filter((x) => {
      const deal = deals.find((d) => d.pipedrive_deal_id === x.pipedrive_deal_id);
      return `${x.quote_id} ${deal?.hotel_name ?? ""} ${x.status}`.toLowerCase().includes(q.toLowerCase());
    });

  const count = (s: string) => quotations.filter((x) => x.status === s).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="ทั้งหมด" value={quotations.length} />
        <Kpi label="Draft" value={count("draft")} />
        <Kpi label="Sent" value={count("sent")} />
        <Kpi label="Approved" value={count("approved")} hint="ล็อกและ snapshot แล้ว" />
      </div>

      <Panel
        title="Quotation Dashboard"
        subtitle="จัดเก็บแบบโฟลเดอร์ ปี / เดือน-วัน"
        right={
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาเลขที่ / โรงแรม"
            className="h-9 w-56"
          />
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <FolderTree dates={quotations.map((x) => x.created_at)} value={day} onChange={setDay} />
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">เลขที่</th>
                  <th className="py-2 pr-3">โรงแรม / ดีล</th>
                  <th className="py-2 pr-3 text-right">รายการ</th>
                  <th className="py-2 pr-3 text-right">ยอดสุทธิ</th>
                  <th className="py-2 pr-3">สถานะ</th>
                  <th className="py-2 pr-3">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const deal = deals.find((d) => d.pipedrive_deal_id === x.pipedrive_deal_id);
                  return (
                    <tr key={x.quote_id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3">
                        <Link
                          to="/bd/quotations/$quoteId"
                          params={{ quoteId: x.quote_id }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {x.quote_id}
                        </Link>
                        {x.revision_of && (
                          <p className="text-[11px] text-muted-foreground">แก้ไขจาก {x.revision_of}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{deal?.hotel_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Deal #{x.pipedrive_deal_id}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{x.lines.length}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{thb(x.totals.total)}</td>
                      <td className="py-2.5 pr-3">
                        <Chip
                          tone={
                            x.status === "approved"
                              ? "success"
                              : x.status === "sent"
                                ? "info"
                                : x.status === "revised"
                                  ? "muted"
                                  : "warn"
                          }
                        >
                          {x.status}
                        </Chip>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(x.created_at)}</td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      ไม่พบใบเสนอราคา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
