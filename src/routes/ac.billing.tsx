import { createFileRoute } from "@tanstack/react-router";
import { FileText, Link2, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, PartyBlock, Panel, TotalsBlock, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { missingReports, monthName, thb } from "@/lib/crm-rules";
import { lastPeriod, useCrm } from "@/lib/crm-store";
import type { InvoiceLine } from "@/lib/crm-types";

export const Route = createFileRoute("/ac/billing")({
  head: () => ({
    meta: [
      { title: "Invoice & Tax Receipt — AC App | Meridia Hotel ERP" },
      { name: "description", content: "รับคำขอออกใบแจ้งหนี้จาก PS ออกเลข INV และใบเสร็จรับเงิน/ใบกำกับภาษี" },
      { property: "og:title", content: "Invoice & Tax Receipt — AC App" },
      { property: "og:description", content: "ออกใบแจ้งหนี้ ส่ง LIVE Link และออกใบเสร็จรับเงิน" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const {
    invRequests,
    invoices,
    taxReceipts,
    contracts,
    reports,
    createInvoice,
    issueInvoice,
    markPaid,
    voidTaxReceipt,
    liveLinks,
  } = useCrm();

  const [year, setYear] = useState(String(lastPeriod.year));
  const [month, setMonth] = useState(String(lastPeriod.month));
  const y = Number(year);
  const m = Number(month);

  const period = useMemo(() => {
    const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const end = new Date(Date.UTC(y, m, 0)).toISOString();
    return { start, end };
  }, [y, m]);

  const buildLines = (contractIds: string[]): InvoiceLine[] => {
    const list: InvoiceLine[] = [];
    contractIds.forEach((id) => {
      const c = contracts.find((x) => x.contract_id === id);
      if (!c) return;
      c.lines.forEach((l) => {
        if (l.commission_rate != null) {
          const r = reports.find(
            (x) => x.contract_id === id && x.sku === l.sku_snapshot && x.period_year === y && x.period_month === m,
          );
          if (r)
            list.push({
              line_id: crypto.randomUUID(),
              contract_id: id,
              sku_snapshot: l.sku_snapshot,
              name_snapshot: `${l.name_snapshot} — คอมมิชชั่น ${monthName(m)} ${y}`,
              line_type: "commission",
              quantity: 1,
              unit_price: r.commission_thb,
              amount: r.commission_thb,
              production_report_id: r.report_id,
            });
        }
        if (l.unit_price != null && l.unit_price > 0)
          list.push({
            line_id: crypto.randomUUID(),
            contract_id: id,
            sku_snapshot: l.sku_snapshot,
            name_snapshot: l.name_snapshot,
            line_type: l.billing === "one_time" ? "setup" : "fixed",
            quantity: l.quantity,
            unit_price: l.unit_price,
            amount: l.unit_price * l.quantity,
          });
      });
    });
    return list;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="คำขอออกใบแจ้งหนี้" value={invRequests.filter((r) => r.status !== "completed").length} />
        <Kpi label="ใบแจ้งหนี้ทั้งหมด" value={invoices.length} />
        <Kpi label="รอชำระ" value={invoices.filter((i) => i.status === "sent_via_live_link").length} />
        <Kpi label="ใบเสร็จ/ใบกำกับภาษี" value={taxReceipts.length} />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Inquiry INV</TabsTrigger>
          <TabsTrigger value="invoices">ใบแจ้งหนี้</TabsTrigger>
          <TabsTrigger value="receipts">ใบเสร็จ / ใบกำกับภาษี</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Panel
            title="คำขอออกใบแจ้งหนี้จาก PS"
            subtitle="ระบบดึงค่าบริการคงที่ + คอมมิชชั่นจาก Production Report ของรอบที่เลือก"
            right={
              <div className="flex gap-2">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((mm) => (
                      <SelectItem key={mm} value={mm}>
                        {monthName(Number(mm))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[lastPeriod.year - 1, lastPeriod.year, lastPeriod.year + 1].map((yy) => (
                      <SelectItem key={yy} value={String(yy)}>
                        {yy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="space-y-3">
              {invRequests.map((r) => {
                const cs = contracts.filter((c) => r.contract_ids.includes(c.contract_id));
                const gaps = missingReports(cs, reports, y, m);
                return (
                  <div key={r.case_number} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {r.case_number}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            · {cs[0]?.customer_snapshot.hotel_name ?? "—"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.contract_ids.join(", ")} · ขอโดย {r.requested_by} · {fmtDate(r.requested_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip tone={r.status === "completed" ? "success" : r.status === "new" ? "warn" : "info"}>
                          {r.status}
                        </Chip>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={!!r.invoice_id || gaps.length > 0}
                          onClick={() => {
                            const lines = buildLines(r.contract_ids);
                            if (!lines.length) {
                              toast.error("ไม่มีรายการที่เรียกเก็บได้ในรอบนี้");
                              return;
                            }
                            const id = createInvoice(r.case_number, lines, period);
                            toast.success(`สร้างใบแจ้งหนี้ร่าง ${id}`);
                          }}
                        >
                          <FileText className="size-4" /> สร้างใบแจ้งหนี้
                        </Button>
                      </div>
                    </div>
                    {gaps.length > 0 && (
                      <p className="mt-2 rounded-lg bg-warning/10 p-2 text-xs">
                        รอ Production Report {gaps.length} รายการ ({monthName(m)} {y}) จึงจะออกใบแจ้งหนี้ได้
                      </p>
                    )}
                    {r.invoice_id && (
                      <p className="mt-2 text-xs text-muted-foreground">ใบแจ้งหนี้: {r.invoice_id}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          {invoices.map((inv) => {
            const link = liveLinks.find((l) => l.invoice_id === inv.invoice_id);
            return (
              <Panel
                key={inv.invoice_id}
                title={`ใบแจ้งหนี้ ${inv.invoice_id}`}
                subtitle={`เคส ${inv.case_number} · รอบ ${fmtDate(inv.billing_period_start)} – ${fmtDate(inv.billing_period_end)}`}
                right={
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={inv.status === "paid" ? "success" : inv.status === "draft" ? "warn" : "info"}>
                      {inv.status}
                    </Chip>
                    {inv.status === "draft" && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          const token = issueInvoice(inv.invoice_id);
                          toast.success("ออกใบแจ้งหนี้และส่ง LIVE Link แล้ว", { description: `/l/${token}` });
                        }}
                      >
                        <Link2 className="size-4" /> ออกเลข & ส่ง LIVE Link
                      </Button>
                    )}
                    {inv.status === "sent_via_live_link" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          const re = markPaid(inv.invoice_id, "โอนเงินผ่านธนาคาร");
                          toast.success(`บันทึกรับชำระ — ออกใบเสร็จ ${re}`);
                        }}
                      >
                        <Receipt className="size-4" /> บันทึกรับชำระ
                      </Button>
                    )}
                    {link && (
                      <a href={`/l/${link.token}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        เปิด LIVE Link
                      </a>
                    )}
                  </div>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div>
                    <div className="rounded-lg border bg-surface/40 p-3">
                      <PartyBlock snapshot={inv.customer_snapshot} />
                    </div>
                    <table className="mt-3 w-full text-sm">
                      <tbody>
                        {inv.lines.map((l) => (
                          <tr key={l.line_id} className="border-b last:border-0">
                            <td className="py-2 pr-3">
                              <p>{l.name_snapshot}</p>
                              <p className="text-xs text-muted-foreground">
                                {l.sku_snapshot} · {l.contract_id}
                              </p>
                            </td>
                            <td className="py-2 text-right tabular-nums">{thb(l.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TotalsBlock
                    totals={inv.totals}
                    whtNote={inv.customer_snapshot.type === "juristic" ? "นิติบุคคล" : undefined}
                  />
                </div>
              </Panel>
            );
          })}
          {!invoices.length && (
            <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีใบแจ้งหนี้
            </p>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <Panel title="ใบเสร็จรับเงิน / ใบกำกับภาษี" subtitle="ออกอัตโนมัติเมื่อบันทึกรับชำระ (RE ใช้เลขชุดเดียวกับ INV)">
            <div className="space-y-3">
              {taxReceipts.map((t) => (
                <div key={t.tax_receipt_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <p className="font-semibold">
                      {t.tax_receipt_id}{" "}
                      <span className="text-xs font-normal text-muted-foreground">จาก {t.from_invoice_id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.customer_snapshot.legal_name} · ชำระ {fmtDate(t.paid_at)} · {t.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">{thb(t.totals.total)}</span>
                    <Chip tone={t.status === "issued" ? "success" : "danger"}>{t.status}</Chip>
                    {t.status === "issued" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          voidTaxReceipt(t.tax_receipt_id, "ยกเลิกโดยทีมบัญชี");
                          toast.success("ยกเลิกใบเสร็จแล้ว (เก็บประวัติไว้)");
                        }}
                      >
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!taxReceipts.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีใบเสร็จรับเงิน</p>
              )}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
