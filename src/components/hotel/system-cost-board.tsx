import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Field, Section } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  monthLabels,
  statusMeta,
  systemOptions,
  type MonthlyPayStatus,
} from "@/lib/hotel-profile";
import {
  avgMonthlyFee,
  contractRange,
  emptyPayments,
  hotelStatus,
  paidThroughIndex,
  paymentsFor,
  useHotelStore,
  type HotelProfile,
} from "@/lib/hotel-store";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

const cycle: Record<MonthlyPayStatus, MonthlyPayStatus> = {
  na: "unpaid",
  unpaid: "paid",
  paid: "na",
};

const payStyle: Record<MonthlyPayStatus, string> = {
  paid: "bg-success/15 text-success border-success/30",
  unpaid: "bg-destructive/10 text-destructive border-destructive/30",
  na: "bg-muted text-muted-foreground",
};

const payLabel: Record<MonthlyPayStatus, string> = { paid: "จ่าย", unpaid: "ค้าง", na: "—" };

export function SystemCostBoard({ role }: { role: "ac" | "ps" | "exec" }) {
  const { hotels, selected: h, patch } = useHotelStore();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];

  const activeHotels = useMemo(() => hotels.filter((x) => hotelStatus(x) === "active"), [hotels]);

  const chartData = useMemo(
    () =>
      monthLabels.map((label, m) => {
        const total = hotels.reduce((sum, x) => {
          const p = paymentsFor(x, year)[m];
          return p === "paid" ? sum + (Number(x.system.monthlyCost) || 0) : sum;
        }, 0);
        return {
          month: label,
          total,
          average: activeHotels.length ? Math.round(total / activeHotels.length) : 0,
        };
      }),
    [hotels, activeHotels.length, year],
  );

  const yearTotal = chartData.reduce((s, d) => s + d.total, 0);

  const setPayment = (hotel: HotelProfile, m: number) => {
    const current = paymentsFor(hotel, year).slice();
    current[m] = cycle[current[m] ?? "na"];
    patch(hotel.id, {
      system: { ...hotel.system, payments: { ...hotel.system.payments, [year]: current } },
    });
  };

  return (
    <div className="space-y-4">
      {role === "ps" && (
        <Section
          code="PS App"
          title="ต้นทุนค่าระบบ — ข้อมูลระบบ"
          subtitle="PS App เป็นผู้ระบุระบบที่โรงแรมใช้ และ H+ เป็นผู้ชำระเงินหรือไม่"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ระบบที่ใช้งาน">
              <Select
                value={h.system.system}
                onValueChange={(v) => patch(h.id, { system: { ...h.system, system: v } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกระบบ" />
                </SelectTrigger>
                <SelectContent>
                  {systemOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="H+ เป็นผู้ชำระเงิน">
              <label className="flex h-9 items-center gap-2.5 rounded-md border px-3">
                <Checkbox
                  checked={h.system.hplusPays}
                  onCheckedChange={(v) =>
                    patch(h.id, { system: { ...h.system, hplusPays: v === true } })
                  }
                />
                <span className="text-sm">{h.system.hplusPays ? "Yes" : "No"}</span>
              </label>
            </Field>
            <Field label="ต้นทุนค่าระบบ / เดือน (AC ระบุ)">
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                {h.system.monthlyCost ? money(Number(h.system.monthlyCost)) : "รอ AC App ระบุ"}
              </div>
            </Field>
          </div>
        </Section>
      )}

      {role === "ac" && (
        <Section
          code="AC App"
          title="ต้นทุนค่าระบบ — ต้นทุนและการทำจ่าย"
          subtitle="AC App ระบุต้นทุนค่าระบบและบันทึกสถานะการชำระรายเดือน"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="ระบบ (PS ระบุ)">
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                {h.system.system || "รอ PS App ระบุ"}
              </div>
            </Field>
            <Field label="H+ เป็นผู้ชำระเงิน (PS ระบุ)">
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                {h.system.hplusPays ? "Yes" : "No"}
              </div>
            </Field>
            <Field label="ต้นทุนค่าระบบ / เดือน">
              <Input
                type="number"
                min={0}
                value={h.system.monthlyCost}
                onChange={(e) =>
                  patch(h.id, { system: { ...h.system, monthlyCost: e.target.value } })
                }
                placeholder="0.00"
              />
            </Field>
            <Field label="ปี">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              สถานะการชำระรายเดือน · {h.name || "โรงแรมใหม่"} · {year} (คลิกเพื่อสลับสถานะ)
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {(h.system.payments[year] ?? emptyPayments()).map((p, m) => (
                <Button
                  key={monthLabels[m]}
                  type="button"
                  variant="outline"
                  onClick={() => setPayment(h, m)}
                  className={cn("h-auto flex-col gap-0.5 py-2", payStyle[p])}
                >
                  <span className="text-[11px] font-semibold">{monthLabels[m]}</span>
                  <span className="text-[10px]">{payLabel[p]}</span>
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ชำระถึงเดือน:{" "}
              <span className="font-semibold text-foreground">
                {paidThroughIndex(h, year) >= 0
                  ? `${monthLabels[paidThroughIndex(h, year)]} ${year}`
                  : "ยังไม่มีการชำระ"}
              </span>
            </p>
          </div>
        </Section>
      )}

      {/* Shared summary — AC / PS / Executive */}
      <Section
        code="Shared"
        title="สรุปการชำระค่าระบบ"
        subtitle="ข้อมูลชุดเดียวกันสำหรับ AC App / PS App / Executive App (Executive อ่านอย่างเดียว)"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-surface/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                ชำระรวมทั้งปี {year}
              </p>
              <p className="mt-1 font-display text-lg font-bold">{money(yearTotal)}</p>
            </div>
            <div className="rounded-lg border bg-surface/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                โรงแรม Active
              </p>
              <p className="mt-1 font-display text-lg font-bold">{activeHotels.length}</p>
            </div>
            <div className="rounded-lg border bg-surface/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                เฉลี่ย / โรงแรม / ปี
              </p>
              <p className="mt-1 font-display text-lg font-bold">
                {money(activeHotels.length ? Math.round(yearTotal / activeHotels.length) : 0)}
              </p>
            </div>
          </div>
          <div className="w-40">
            <Field label="ปี">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={64} />
              <Tooltip
                formatter={(v: number) => money(v)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                name="ค่าระบบรวมที่ชำระ"
                dataKey="total"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                name="เฉลี่ยต่อโรงแรม active"
                type="monotone"
                dataKey="average"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">โรงแรม</th>
                {monthLabels.map((m) => (
                  <th key={m} className="px-1 py-2.5 text-center font-medium">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-medium">ชำระถึง</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {hotels.map((x) => {
                const p = paymentsFor(x, year);
                const through = paidThroughIndex(x, year);
                return (
                  <tr key={x.id}>
                    <td className="max-w-[14rem] px-3 py-2">
                      <p className="truncate font-medium">{x.name || "โรงแรมใหม่"}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {x.code}
                      </p>
                    </td>
                    {p.map((v, m) => (
                      <td key={m} className="px-1 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block size-4 rounded-sm border",
                            payStyle[v],
                          )}
                          title={`${monthLabels[m]} · ${payLabel[v]}`}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">
                      {through >= 0 ? `${monthLabels[through]} ${year}` : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t bg-surface/60 font-semibold">
                <td className="px-3 py-2">Total / เดือน</td>
                {chartData.map((d) => (
                  <td key={d.month} className="px-1 py-2 text-center text-[10px]">
                    {d.total ? Math.round(d.total / 1000) + "k" : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-xs">{money(yearTotal)}</td>
              </tr>
              <tr className="bg-surface/40 text-muted-foreground">
                <td className="px-3 py-2 text-xs">เฉลี่ย / โรงแรม active</td>
                {chartData.map((d) => (
                  <td key={d.month} className="px-1 py-2 text-center text-[10px]">
                    {d.average ? Math.round(d.average / 1000) + "k" : "—"}
                  </td>
                ))}
                <td className="px-3 py-2" />
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Decision table */}
      <Section
        code="Shared"
        title="ข้อมูลประกอบการตัดสินใจ (จ่ายค่าระบบ / ย้ายระบบ)"
        subtitle="AC App · PS App · Executive App เห็นข้อมูลชุดเดียวกัน"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">โรงแรม</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Contract Start</th>
                <th className="px-3 py-2.5 font-medium">Contract End</th>
                <th className="px-3 py-2.5 font-medium">ระบบ</th>
                <th className="px-3 py-2.5 font-medium">H+ จ่าย</th>
                <th className="px-3 py-2.5 text-right font-medium">ต้นทุนระบบ / เดือน</th>
                <th className="px-3 py-2.5 text-right font-medium">ค่าบริการเฉลี่ย / เดือน (AC)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {hotels.map((x) => {
                const { start, end } = contractRange(x);
                const sm = statusMeta[hotelStatus(x)];
                return (
                  <tr key={x.id} className="hover:bg-muted/40">
                    <td className="max-w-[16rem] px-3 py-2.5">
                      <p className="truncate font-medium">{x.name || "โรงแรมใหม่"}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {x.code}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          sm.className,
                        )}
                      >
                        {sm.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {formatDate(start) || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {formatDate(end) || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{x.system.system || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {x.system.hplusPays ? "Yes" : "No"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {money(Number(x.system.monthlyCost) || 0)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {money(avgMonthlyFee(x))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
