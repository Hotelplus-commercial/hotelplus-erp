import { Link } from "@tanstack/react-router";
import { AlertCircle, CalendarX, Clock, Pencil } from "lucide-react";
import { useMemo } from "react";

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
import { useDashboardGlobal, matchesBook, selectedPeriod } from '@/lib/ps-dashboard-global';
import { demoHotels, buildDemoReport } from '@/lib/ps-demo-fixture';
import { cn } from "@/lib/utils";
import { PortfolioBreakdown } from './portfolio-breakdown';

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

/** part: "overview" = Portfolio snapshot header (relocated, same logic) · "table" = hotel search table. */
export function PsDashboard({ assignment, part = "all" }: { assignment?: AssignmentFilter; part?: "all" | "overview" | "table" }) {
  const store = useHotelStore();
  const { filter, demo, now:clock } = useDashboardGlobal();
  const select = store.select;
  const now = clock ? new Date(clock) : new Date();
  const q = filter.search;
  const status = filter.hotelStatus;
  const demoSource = useMemo(() => demo ? demoHotels() : undefined,[demo]);
  const candidates = demoSource ?? store.hotels;
  const demoFlow = demo ? buildDemoReport().views.v_ps_lifecycle_flow : [];
  const hotels = candidates.filter((h,i) => {
    const assignees = hotelAssignees(i);
    const owners = demo ? demoFlow.filter(r => r.hotel_id === h.id) : [];
    const match = (line: string) => matchesBook({ hotel_id:h.id,hotel_name:h.name,service_line:line,ae_owner_id:demo ? owners.find(r => r.service_line === line)?.['ae_owner_id'] ?? null : (assignees.AE ?? null), orm_team:demo ? null : assignees.ORM,marcom_owner_id:demo ? null : assignees.Marcom }, filter);
    return (filter.service === 'ALL' ? (match('ORM') || match('Marcom')) : match(filter.service));
  });

  const allRows = useMemo(
    () =>
      hotels.map((h: HotelProfile, i: number) => ({
        h,
        status: demo ? (h.terms.some(t => t.start && t.end && t.start <= now && t.end >= now) ? "active" as const : "contract-end" as const) : hotelStatus(h),
        services: demo ? { orm:h.terms.flatMap(t => t.services.filter(s => s.category === 'orm')),marcom:h.terms.flatMap(t => t.services.filter(s => s.category === 'marcom')),production:[] } : servicesByCategory(h),
        start: serviceStart(h),
        end: contractRange(h).end,
        left: demo && contractRange(h).end ? Math.ceil(((contractRange(h).end?.getTime() ?? 0)-now.getTime())/864e5) : daysToEnd(h),
        assignees: hotelAssignees(i),
      })),
    [hotels,clock,demo],
  );

  const window = selectedPeriod(filter,now);
  const rows = allRows.filter(r => { const term=q.trim().toLowerCase(); return r.h.terms.some(t => (!t.start || t.start.toISOString().slice(0,10) <= window.to) && (!t.end || t.end.toISOString().slice(0,10) >= window.from)) && (!term || `${r.h.name} ${r.h.code}`.toLowerCase().includes(term)) && (status === 'all' || r.status === status) && matchAssignment(r.assignees,assignment); });
  const scopedHotels = rows.map(r => r.h);
  const totalTerms = scopedHotels.reduce((s, h) => s + h.terms.length, 0);
  const activeCount = rows.filter((r) => r.status === "active").length;
  const inactive = rows.filter((r) => r.status === "contract-end" || r.status === "terminated").length;
  const expiring60 = rows.filter((r) => r.left !== null && r.left >= 0 && r.left <= 60).length;
  const endingThisMonth = rows.filter(
    (r) =>
      r.end &&
      r.end.getMonth() === now.getMonth() &&
      r.end.getFullYear() === now.getFullYear(),
  ).length;
  const noStart = rows.filter((r) => !r.start).length;

  const ormRows = rows.filter((r) => r.services.orm.length);
  const reg = {
    corporate: scopedHotels.filter((h) => h.registration === "corporate").length,
    personal: scopedHotels.filter((h) => h.registration === "personal").length,
    none: scopedHotels.filter((h) => !h.registration).length,
  };
  const model = {
    flat: scopedHotels.filter((h) => h.model === "flat").length,
    commission: scopedHotels.filter((h) => h.model === "commission").length,
    none: scopedHotels.filter((h) => !h.model).length,
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
      {part !== "table" && <section className="card-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">ภาพรวมสัญญา{demo ? " · DEMO" : ""}</p>
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
              {pct(activeCount, scopedHotels.length)}%
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-warning/12 px-3 py-1.5 text-xs font-semibold text-warning-foreground">
              <Clock className="size-3.5" /> {noStart} รอวันที่
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <AlertCircle className="size-3.5" /> {expiring60} ใกล้หมด 60 วัน
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning-foreground">
              <CalendarX className="size-3.5" /> {endingThisMonth} สิ้นสัญญาเดือนนี้
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Stat label="Active" value={activeCount} sub={`${pct(activeCount, scopedHotels.length)}%`} />
          <Stat label="Inactive" value={inactive} sub={`${pct(inactive, scopedHotels.length)}%`} />
        </div>

        <div className="mt-4 border-t pt-4">
          <PortfolioBreakdown hotels={scopedHotels} now={now} />
        </div>
      </section>}

      {part !== "overview" && <section className="card-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{filtered.length} รายการ{demo ? ' · DEMO' : ''}</span>
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
                      {!demo && <Link
                        to="/ps/contracts"
                        onClick={() => select(r.h.id)}
                        aria-label={`แก้ไข ${r.h.name}`}
                        className="inline-grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Pencil className="size-3.5" />
                      </Link>}
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
      </section>}
    </div>
  );
}
