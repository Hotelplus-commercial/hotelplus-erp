import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { commissionSkusOf, missingReports, monthName, pctLabel, reportAlertLevel, thb } from "@/lib/crm-rules";
import { lastPeriod, useCrm } from "@/lib/crm-store";
import type { ProductionReport } from "@/lib/crm-types";

export const Route = createFileRoute("/ps/production")({
  head: () => ({
    meta: [
      { title: "Production Report — PS App | Meridia Hotel ERP" },
      { name: "description", content: "อัปโหลดยอดผลิตรายเดือนสำหรับสัญญาแบบคอมมิชชั่นก่อนวันที่ 5" },
      { property: "og:title", content: "Production Report — PS App" },
      { property: "og:description", content: "ยอดผลิตรายเดือนสำหรับคำนวณคอมมิชชั่นในใบแจ้งหนี้" },
    ],
  }),
  component: ProductionPage,
});

function ProductionPage() {
  const { contracts, reports, addReports } = useCrm();
  const [year, setYear] = useState(String(lastPeriod.year));
  const [month, setMonth] = useState(String(lastPeriod.month));
  const [draft, setDraft] = useState<Record<string, string>>({});

  const y = Number(year);
  const m = Number(month);
  const missing = missingReports(contracts, reports, y, m);
  const alert = reportAlertLevel();

  const commissionRows = contracts.flatMap((c) =>
    commissionSkusOf(c).map((sku) => {
      const line = c.lines.find((l) => l.sku_snapshot === sku)!;
      const report = reports.find(
        (r) => r.contract_id === c.contract_id && r.sku === sku && r.period_year === y && r.period_month === m,
      );
      return { contract: c, sku, rate: line.commission_rate ?? 0, report };
    }),
  );

  const save = () => {
    const list: ProductionReport[] = commissionRows
      .filter((r) => draft[`${r.contract.contract_id}:${r.sku}`])
      .map((r) => {
        const revenue = Number(draft[`${r.contract.contract_id}:${r.sku}`]) || 0;
        return {
          report_id: crypto.randomUUID(),
          contract_id: r.contract.contract_id,
          sku: r.sku,
          period_year: y,
          period_month: m,
          revenue_thb: revenue,
          commission_thb: Math.round(revenue * r.rate * 100) / 100,
          uploaded_by: r.sku.startsWith("MK") ? "MARCOM" : "ORM",
          uploaded_at: new Date().toISOString(),
          approved_by_hotel: false,
        };
      });
    if (!list.length) {
      toast.error("ยังไม่ได้กรอกยอดผลิต");
      return;
    }
    addReports(list);
    setDraft({});
    toast.success(`บันทึกยอดผลิต ${list.length} รายการ`);
  };

  return (
    <div className="space-y-4">
      {alert !== "none" && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {alert === "final"
              ? "เลยวันที่ 5 แล้ว — ทีมบัญชีปิดยอดรอบนี้ กรุณาประสาน AC ก่อนอัปโหลดเพิ่ม"
              : "วันที่ 4 ของเดือน — เหลืออีก 1 วันก่อน AC ปิดยอดคอมมิชชั่น"}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="สัญญาแบบคอมมิชชั่น" value={commissionRows.length} />
        <Kpi label="ยังขาดรายงาน" value={missing.length} hint={`${monthName(m)} ${y}`} />
        <Kpi
          label="ยอดผลิตรวมรอบนี้"
          value={thb(
            reports
              .filter((r) => r.period_year === y && r.period_month === m)
              .reduce((s, r) => s + r.revenue_thb, 0),
          )}
        />
        <Kpi
          label="คอมมิชชั่นรวมรอบนี้"
          value={thb(
            reports
              .filter((r) => r.period_year === y && r.period_month === m)
              .reduce((s, r) => s + r.commission_thb, 0),
          )}
        />
      </div>

      <Panel
        title="อัปโหลดยอดผลิตรายเดือน"
        subtitle="ORM / Marcom กรอกยอดขาย ระบบคำนวณคอมมิชชั่นตามสัญญา"
        right={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">เดือน</Label>
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
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">ปี</Label>
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
            <Button className="gap-1.5" onClick={save}>
              <Upload className="size-4" /> บันทึก
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">สัญญา / โรงแรม</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3 text-right">อัตราคอม</th>
                <th className="py-2 pr-3 text-right">ยอดผลิต (บาท)</th>
                <th className="py-2 pr-3 text-right">คอมมิชชั่น</th>
                <th className="py-2 pr-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {commissionRows.map((r) => {
                const key = `${r.contract.contract_id}:${r.sku}`;
                const typed = Number(draft[key] ?? "") || 0;
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{r.contract.customer_snapshot.hotel_name}</p>
                      <p className="text-xs text-muted-foreground">{r.contract.contract_id}</p>
                    </td>
                    <td className="py-2.5 pr-3">{r.sku}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{pctLabel(r.rate)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {r.report ? (
                        <span className="tabular-nums">{thb(r.report.revenue_thb)}</span>
                      ) : (
                        <Input
                          className="ml-auto h-8 w-36 text-right"
                          inputMode="decimal"
                          value={draft[key] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                          placeholder="0.00"
                        />
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                      {thb(r.report ? r.report.commission_thb : typed * r.rate)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Chip tone={r.report ? "success" : "warn"}>{r.report ? "อัปโหลดแล้ว" : "รออัปโหลด"}</Chip>
                    </td>
                  </tr>
                );
              })}
              {!commissionRows.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    ยังไม่มีสัญญาแบบคอมมิชชั่น
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
