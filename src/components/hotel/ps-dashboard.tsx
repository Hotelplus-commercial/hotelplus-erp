import { Link } from "@tanstack/react-router";
import { AlertCircle, CalendarX, Clock, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, statusMeta, type HotelStatus } from "@/lib/hotel-profile";
import {
  aeDirectory,
  marcomDirectory,
  ormTeams,
  type AssignmentFilter,
} from "@/lib/ps-renewal";
import {
  contractRange,
  daysToEnd,
  hotelStatus,
  serviceStart,
  servicesByCategory,
  useHotelStore,
  type HotelProfile,
} from "@/lib/hotel-store";
import { cn } from "@/lib/utils";

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

function Stat({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: number | string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-surface/50 p-3", muted && "opacity-60")}>
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-bold">
        {value}
        {sub && <span className="ml-1.5 text-xs font-semibold text-muted-foreground">{sub}</span>}
      </p>
    </div>
  );
}

function ServiceCell({ items }: { items: { serviceType: string; periodStart?: Date | undefined; periodEnd?: Date | undefined }[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-1">
      {items.map((s, i) => (
        <div key={i} className="min-w-0">
          <p className="truncate text-xs font-semibold">{s.serviceType || "ยังไม่ระบุรูปแบบ"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {s.periodStart || s.periodEnd
              ? `${formatDate(s.periodStart) || "—"} → ${formatDate(s.periodEnd) || "—"}`
              : "ยังไม่ระบุช่วงเวลา"}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Deterministic mock assignment: AE owner / ORM team / Marcom owner per hotel */
function hotelAssignees(i: number) {
  return {
    AE: aeDirectory[i % aeDirectory.length]!,
    ORM: ormTeams[i % ormTeams.length]!,
    Marcom: marcomDirectory[i % marcomDirectory.length]!,
  };
}

function matchAssignment(
  a: { AE: string; ORM: string; Marcom: string },
  f?: AssignmentFilter,
): boolean {
  if (!f) return true;
  const people = [a.AE, a.ORM, a.Marcom];
  if (f.role !== "none" && f.teams.length && !f.teams.includes(a[f.role])) return false;
  if (f.people.length && !f.people.some((p) => people.includes(p))) return false;
  return true;
}

export function PsDashboard({ assignment }: { assignment?: AssignmentFilter }) {
  const { hotels, select } = useHotelStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | HotelStatus>("all");

  const rows = useMemo(
    () =>
      hotels.map((h: HotelProfile, i: number) => ({
        h,
        status: hotelStatus(h),
        services: servicesByCategory(h),
        start: serviceStart(h),
        end: contractRange(h).end,
        left: daysToEnd(h),
        assignees: hotelAssignees(i),
      })),
    [hotels],
  );

  const totalTerms = hotels.reduce((s, h) => s + h.terms.length, 0);
  const activeCount = rows.filter((r) => r.status === "active").length;
  const upcoming = rows.filter((r) => r.start && r.start.getTime() > Date.now()).length;
  const inactive = rows.filter((r) => r.status === "contract-end" || r.status === "terminated").length;
  const draft = rows.filter((r) => !r.h.psSaved).length;
  const expiring60 = rows.filter((r) => r.left !== null && r.left >= 0 && r.left <= 60).length;
  const endingThisMonth = rows.filter(
    (r) =>
      r.end &&
      r.end.getMonth() === new Date().getMonth() &&
      r.end.getFullYear() === new Date().getFullYear(),
  ).length;
  const noStart = rows.filter((r) => !r.start).length;

  const ormRows = rows.filter((r) => r.services.orm.length);
  const reg = {
    corporate: hotels.filter((h) => h.registration === "corporate").length,
    personal: hotels.filter((h) => h.registration === "personal").length,
    none: hotels.filter((h) => !h.registration).length,
  };
  const model = {
    flat: hotels.filter((h) => h.model === "flat").length,
    commission: hotels.filter((h) => h.model === "commission").length,
    none: hotels.filter((h) => !h.model).length,
  };

  const filtered = rows.filter((r) => {
    const term = q.trim().toLowerCase();
    const okQ =
      !term ||
      r.h.name.toLowerCase().includes(term) ||
      r.h.code.toLowerCase().includes(term);
    return okQ && (status === "all" || r.status === status) && matchAssignment(r.assignees, assignment);
  });

  return (
    <div className="space-y-4">
      <section className="card-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">ภาพรวมสัญญา</p>
            <p className="text-xs text-muted-foreground">
              นับสัญญาที่มีช่วงเวลาคาบเกี่ยวกับเดือนปัจจุบัน
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold">{activeCount}</span>
            <span className="text-sm text-muted-foreground">
              / {totalTerms} ฉบับที่ใช้งานอยู่
            </span>
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning-foreground">
              {pct(activeCount, hotels.length)}%
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-warning/12 px-3 py-1.5 text-xs font-semibold text-warning-foreground">
              <Clock className="size-3.5" /> {noStart} รอวันที่
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <AlertCircle className="size-3.5" /> {expiring60} ใกล้หมด 60 วัน
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
              <CalendarX className="size-3.5" /> {endingThisMonth} สิ้นสัญญาเดือนนี้
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active" value={activeCount} sub={`${pct(activeCount, hotels.length)}%`} />
          <Stat label="Upcoming" value={upcoming} muted={!upcoming} />
          <Stat label="Inactive" value={inactive} sub={`${pct(inactive, hotels.length)}%`} />
          <Stat label="Draft" value={draft} sub={`${pct(draft, hotels.length)}%`} />
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold">
            เฉพาะ ORM{" "}
            <span className="font-normal text-muted-foreground">
              {ormRows.length} โรงแรมที่ใช้งานอยู่
            </span>
          </p>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                การจดทะเบียน
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Corporate" value={reg.corporate} sub={`${pct(reg.corporate, hotels.length)}%`} />
                <Stat label="Personal" value={reg.personal} sub={`${pct(reg.personal, hotels.length)}%`} />
                <Stat label="ไม่ระบุ" value={reg.none} sub={`${pct(reg.none, hotels.length)}%`} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                รูปแบบค่าบริการ
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Flat Rate" value={model.flat} sub={`${pct(model.flat, hotels.length)}%`} />
                <Stat label="Commission" value={model.commission} sub={`${pct(model.commission, hotels.length)}%`} />
                <Stat label="ไม่ระบุ" value={model.none} sub={`${pct(model.none, hotels.length)}%`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสโรงแรม"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[13rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะโรงแรม: ทั้งหมด</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">ค้างชำระ 2 เดือน</SelectItem>
              <SelectItem value="contract-end">Contract End</SelectItem>
              <SelectItem value="terminated">Terminate</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} รายการ</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[62rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">รหัส</th>
                <th className="py-2 pr-3 font-medium">โรงแรม</th>
                <th className="py-2 pr-3 font-medium">ORM</th>
                <th className="py-2 pr-3 font-medium">Marcom</th>
                <th className="py-2 pr-3 font-medium">Production</th>
                <th className="py-2 pr-3 font-medium">Model</th>
                <th className="py-2 pr-3 text-right font-medium">ห้อง</th>
                <th className="py-2 pr-3 font-medium">Service start</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sm = statusMeta[r.status];
                return (
                  <tr key={r.h.id} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{r.h.code}</td>
                    <td className="py-3 pr-3 font-semibold">{r.h.name || "โรงแรมใหม่"}</td>
                    <td className="py-3 pr-3"><ServiceCell items={r.services.orm} /></td>
                    <td className="py-3 pr-3"><ServiceCell items={r.services.marcom} /></td>
                    <td className="py-3 pr-3"><ServiceCell items={r.services.production} /></td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {r.h.model === "flat"
                          ? "Flat Rate"
                          : r.h.model === "commission"
                            ? "Commission"
                            : "ไม่ระบุ"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{r.h.rooms || "—"}</td>
                    <td className="py-3 pr-3 text-xs">{formatDate(r.start) || "—"}</td>
                    <td className="py-3 pr-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", sm.className)}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        to="/ps/contracts"
                        onClick={() => select(r.h.id)}
                        aria-label={`แก้ไข ${r.h.name}`}
                        className="inline-grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    ไม่พบโรงแรมที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
