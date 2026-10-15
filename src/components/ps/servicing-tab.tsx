/* PS Dashboard · Tab "Servicing" v1.0 — read-only cockpit over v_servicing_* + one write path (ระบุผู้ดูแล via existing v1.1 write). */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi } from "@/components/crm/crm-ui";
import { AssignDialog } from "@/components/ps/assignment-ui";
import { KpiView, ServicingCardDrawer } from "@/components/ps/servicing-dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHrMembers, type AssignType } from "@/lib/hr-members";
import { useDashboardGlobal } from "@/lib/ps-dashboard-global";
import { demoOnboarding } from "@/lib/ps-demo-fixture";
import { STAGE_LABEL, lineSequence, stageProgressLine, useServicing, type ServiceLine } from "@/lib/ps-servicing";
import { readServicingDashboard } from "@/lib/servicing-dashboard.functions";
import {
  assignmentComplete, daysFrom, laneStage, median, missingCaretakers, servicingScope, servicingStats,
  type CaretakerSlot, type ServicingReport, type ServicingRow,
} from "@/lib/servicing-dashboard-types";

const SLOT_LABEL: Record<CaretakerSlot, string> = { AE: "AE", SPECIALIST: "Specialist", ORM: "ORM team", MARCOM: "Marcom" };
const stageName = (s: string) => (s === "go_live" ? "Go Live" : STAGE_LABEL[s] ?? s);

function demoReport(): ServicingReport {
  const rows: ServicingRow[] = demoOnboarding().map((c) => ({
    card_id: c.id, hotel_id: c.property_id, hotel_name: c.property_name, service_line: c.service_line, service_variant: c.service_variant,
    current_stage: c.current_stage, stage_entered_at: c.go_live_at ?? c.created_at, created_at: c.created_at, go_live_at: c.go_live_at,
    progress_done: 0, progress_total: 0, last_updated: null,
    ae_owner_id: c.assigned_ae_id || null, specialist_id: c.assigned_specialist_id || null,
    orm_team: c.service_line === "ORM" ? c.assigned_service_owner_id || null : null,
    marcom_owner_id: c.service_line === "MARCOM" ? c.assigned_service_owner_id || null : null,
    hotel_status: c.go_live_at ? "ACTIVE" : null,
  }));
  return { rows, pending: false, demo: true };
}

function useServicingViews() {
  const { demo } = useDashboardGlobal();
  const read = useServerFn(readServicingDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({ queryKey: ["servicing-dashboard-views"], queryFn: () => read(), staleTime: 60_000, enabled: ready && !demo });
  const fixture = useMemo(() => (demo ? demoReport() : undefined), [demo]);
  return demo ? { data: fixture, isLoading: false, isError: false } : real;
}

export function ServicingTab() {
  const { filter, demo, now } = useDashboardGlobal();
  const report = useServicingViews();
  const s = useServicing();
  const [view, setView] = useState<"pipeline" | "golive">("pipeline");
  /** Optimistic in-session caretaker overlay (demo: never persisted to the spine). */
  const [overlay, setOverlay] = useState<Record<string, Partial<ServicingRow>>>({});
  const [assignRow, setAssignRow] = useState<ServicingRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  useEffect(() => setOverlay({}), [demo]);

  const rows = useMemo(() => servicingScope((report.data?.rows ?? []).map((r) => ({ ...r, ...overlay[r.card_id] })), filter), [report.data, overlay, filter]);
  const stats = servicingStats(rows);
  const gaps = rows.filter((r) => !assignmentComplete(r));
  const clock = demo ? now : new Date().toISOString();
  const openDrawer = (id: string) => {
    if (demo) { toast.info("DEMO · ไม่มีการ์ดจริงให้เปิด"); return; }
    if (!s.cards.some((c) => c.id === id)) { toast.info("ยังไม่พบการ์ดนี้ในเครื่องนี้ · เปิดที่ On-boarding Process"); return; }
    setDrawer(id);
  };

  if (report.isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด…</p>;
  if (report.isError) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">อ่านรายงาน Servicing ไม่สำเร็จ</p>;
  const pending = !demo && (report.data?.pending ?? true);

  return (
    <section className="space-y-4" aria-label="Servicing">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Servicing{demo ? " · DEMO" : ""}</p>
        <h2 className="font-display text-xl font-semibold">การ์ดบริการทั้งบริษัท · ORM / Marcom</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="การ์ดบริการ" value={pending ? "—" : stats.cards} />
        <Kpi label="โรงแรม" value={pending ? "—" : stats.hotels} />
        <Kpi label="Go Live" value={pending ? "—" : stats.goLive} />
        <Kpi label="กำลังดำเนินการ" value={pending ? "—" : stats.inProgress} />
        <div className="rounded-xl border border-warning bg-warning/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground"><AlertTriangle className="size-3.5" /> รอระบุผู้ดูแล</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{pending ? "—" : stats.awaiting}</p>
          <Button size="sm" variant="outline" className="mt-2 h-7 border-warning text-xs" disabled={pending} onClick={() => setBulkOpen(true)}><Plus className="size-3.5" /> ระบุผู้ดูแล</Button>
        </div>
      </div>
      <div role="tablist" aria-label="Servicing view" className="inline-flex rounded-full border p-0.5">
        {([["pipeline", "Pipeline"], ["golive", "Overall days to Go-Live"]] as const).map(([k, l]) => (
          <Button key={k} role="tab" aria-selected={view === k} size="sm" variant={view === k ? "default" : "ghost"} className="h-8 rounded-full" onClick={() => setView(k)}>{l}</Button>
        ))}
      </div>
      {pending ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">รอ Cloud Sync seed — ยังไม่มีข้อมูล Servicing บน Cloud (หน้า On-boarding Process ยังทำงานตามปกติ)</p>
      ) : view === "pipeline" ? (
        <Pipeline rows={rows} clock={clock} compare={filter.compare} service={filter.service} onAssign={setAssignRow} onOpen={openDrawer} />
      ) : (
        <GoLiveDays rows={rows} />
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>⚠ รอระบุผู้ดูแล · {gaps.length} การ์ด</DialogTitle></DialogHeader>
          <ul className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border">
            {gaps.map((r) => (
              <li key={r.card_id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="min-w-[9rem] flex-1 font-medium">{r.hotel_name}</span>
                <Chip tone="muted">{r.service_line === "ORM" ? "ORM" : r.service_line === "MARCOM" ? "Marcom" : "ไม่ระบุบริการ"}</Chip>
                <span className="text-xs text-muted-foreground">{stageName(r.current_stage)} · ขาด {missingCaretakers(r).map((m) => SLOT_LABEL[m]).join(", ")}</span>
                <Button size="sm" variant="outline" className="h-7 border-warning text-xs" onClick={() => { setBulkOpen(false); setAssignRow(r); }}>ระบุผู้ดูแล</Button>
              </li>
            ))}
            {!gaps.length && <li className="p-6 text-center text-sm text-muted-foreground">ไม่มีการ์ดรอระบุผู้ดูแล</li>}
          </ul>
        </DialogContent>
      </Dialog>
      {assignRow && <CaretakerModal row={assignRow} demo={demo} onClose={() => setAssignRow(null)} onOptimistic={(patch) => setOverlay((o) => ({ ...o, [assignRow.card_id]: { ...o[assignRow.card_id], ...patch } }))} />}
      <ServicingCardDrawer key={drawer ?? "closed"} id={drawer} readOnly onClose={() => setDrawer(null)} />
    </section>
  );
}

function Pipeline({ rows, clock, compare, service, onAssign, onOpen }: { rows: ServicingRow[]; clock: string; compare: boolean; service: string; onAssign: (r: ServicingRow) => void; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const lanes: { line: ServiceLine; label: string }[] = [
    ...(service !== "Marcom" ? [{ line: "ORM" as const, label: "🟦 ORM" }] : []),
    ...(service !== "ORM" ? [{ line: "MARCOM" as const, label: "🟪 Marcom" }] : []),
  ];
  return (
    <div className="space-y-4">
      {compare && <p className="text-xs text-muted-foreground">Pipeline = snapshot ปัจจุบัน · ไม่ใช้ Compare</p>}
      {lanes.map(({ line, label }) => {
        const stages = lineSequence(line);
        const laneRows = rows.filter((r) => r.service_line === line);
        const at = (stage: string) => laneRows.filter((r) => laneStage(r, stages) === stage);
        const key = (stage: string) => `${line}:${stage}`;
        const opened = open?.startsWith(`${line}:`) ? open.slice(line.length + 1) : null;
        return (
          <div key={line} className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-semibold">{label} · {laneRows.length} การ์ด</p>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {stages.map((stage) => (
                  <button key={stage} type="button" aria-expanded={open === key(stage)} onClick={() => setOpen(open === key(stage) ? null : key(stage))}
                    className={`w-28 shrink-0 rounded-md border p-2 text-left transition-colors hover:bg-muted ${open === key(stage) ? "border-primary bg-muted" : ""}`}>
                    <span className="block text-[11px] leading-tight text-muted-foreground">{stage === "property_pending" ? "(Property Pending)" : stageName(stage)}{stage === "marcom_first_sync" ? " · MT" : ""}</span>
                    <span className="mt-1 block font-display text-xl font-bold tabular-nums">{at(stage).length}</span>
                  </button>
                ))}
              </div>
            </div>
            {opened && (
              <ul className="divide-y rounded-md border">
                {at(opened).map((r) => <StageCard key={r.card_id} row={r} clock={clock} onAssign={onAssign} onOpen={onOpen} />)}
                {!at(opened).length && <li className="p-4 text-center text-xs text-muted-foreground">ไม่มีการ์ดในขั้นนี้</li>}
              </ul>
            )}
          </div>
        );
      })}
      {rows.some((r) => r.service_line == null) && service === "ALL" && <p className="text-xs text-muted-foreground">ไม่ระบุบริการ · {rows.filter((r) => r.service_line == null).length} การ์ด (นับเฉพาะ All)</p>}
    </div>
  );
}

function StageCard({ row, clock, onAssign, onOpen }: { row: ServicingRow; clock: string; onAssign: (r: ServicingRow) => void; onOpen: (id: string) => void }) {
  const hr = useHrMembers();
  const progress = stageProgressLine({ N: row.progress_done, M: row.progress_total, last_updated: row.last_updated } as Parameters<typeof stageProgressLine>[0]);
  const v = (id: string | null) => (id ? hr.nick(id) ?? id : <span className="font-medium text-warning-foreground">— ยังไม่ระบุ</span>);
  return (
    <li className="space-y-1 p-3 text-sm">
      <p className="font-medium">{row.hotel_name}</p>
      <p className="text-xs text-muted-foreground">ค้าง stage นี้ {daysFrom(row.stage_entered_at ?? row.created_at, row.go_live_at ?? clock)} วัน · Day {daysFrom(row.created_at, row.go_live_at ?? clock)}</p>
      {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
      <p className="text-xs text-muted-foreground">AE: {v(row.ae_owner_id)} · Specialist: {v(row.specialist_id)} · {row.service_line === "ORM" ? <>ORM: {v(row.orm_team)}</> : <>Marcom: {v(row.marcom_owner_id)}</>}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" className={!assignmentComplete(row) ? "border-warning" : ""} onClick={() => onAssign(row)}>ระบุผู้ดูแล</Button>
        <Button size="sm" variant="ghost" onClick={() => onOpen(row.card_id)}>ดูรายละเอียด <ArrowRight className="size-3.5" /></Button>
      </div>
    </li>
  );
}

/** Opens the existing v1.1 AssignDialog per slot (same write + audit as Hotel Profile). Demo = in-session no-op. */
function CaretakerModal({ row, demo, onClose, onOptimistic }: { row: ServicingRow; demo: boolean; onClose: () => void; onOptimistic: (p: Partial<ServicingRow>) => void }) {
  const s = useServicing();
  const hr = useHrMembers();
  const card = s.cards.find((c) => c.id === row.card_id);
  const [slot, setSlot] = useState<AssignType | null>(null);
  const slots: CaretakerSlot[] = ["AE", "SPECIALIST", row.service_line === "ORM" ? "ORM" : "MARCOM"];
  const current: Record<CaretakerSlot, string | null> = { AE: row.ae_owner_id, SPECIALIST: row.specialist_id, ORM: row.orm_team, MARCOM: row.marcom_owner_id };
  const field: Record<CaretakerSlot, keyof ServicingRow> = { AE: "ae_owner_id", SPECIALIST: "specialist_id", ORM: "orm_team", MARCOM: "marcom_owner_id" };
  const fn = { AE: "AE", SPECIALIST: "ONBOARDING_SPECIALIST", ORM: "ORM_REVENUE", MARCOM: "MARCOM" } as const;
  const [demoPick, setDemoPick] = useState<Partial<Record<CaretakerSlot, string>>>({});
  return (
    <>
      <Dialog open={!slot} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>ระบุผู้ดูแล — {row.hotel_name} · {row.service_line === "ORM" ? "ORM" : "Marcom"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {slots.map((k) => (
              <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 text-muted-foreground">{SLOT_LABEL[k]}</span>
                {demo ? (
                  <select aria-label={SLOT_LABEL[k]} className="h-9 flex-1 rounded-md border bg-background px-2" value={demoPick[k] ?? current[k] ?? ""} onChange={(e) => setDemoPick((p) => ({ ...p, [k]: e.target.value }))}>
                    <option value="">— เลือก —</option>
                    {hr.members.filter((m) => m.active && m.function === fn[k]).map((m) => <option key={m.id} value={k === "ORM" ? m.orm_team ?? m.id : m.id}>{k === "ORM" ? `Team ${m.orm_team ?? "—"} · ${m.nickname}` : m.nickname}</option>)}
                  </select>
                ) : (
                  <>
                    <span className="flex-1">{current[k] ? hr.nick(current[k]) ?? current[k] : <span className="text-warning-foreground">— ยังไม่ระบุ</span>}</span>
                    <Button size="sm" variant="outline" disabled={!card} onClick={() => setSlot(k)}>แก้ไข</Button>
                  </>
                )}
              </div>
            ))}
            {!demo && !card && <p className="text-xs text-muted-foreground">ยังไม่พบการ์ดนี้ในเครื่องนี้ จึงบันทึกจากที่นี่ไม่ได้</p>}
            {demo && <p className="text-xs text-muted-foreground">DEMO · บันทึกเฉพาะหน้าจอนี้ ไม่เขียนข้อมูลจริง</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            <Button onClick={() => {
              if (demo) { onOptimistic(Object.fromEntries(Object.entries(demoPick).filter(([, v]) => v).map(([k, v]) => [field[k as CaretakerSlot], v]))); toast.success("DEMO · อัปเดตชั่วคราว"); }
              onClose();
            }}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {slot && card && <AssignDialog card={card} type={slot} onClose={() => {
        // Optimistic: reflect the existing v1.1 write until the debounced sync refreshes the cloud view.
        onOptimistic({ [field[slot]]: current[slot] ?? "(บันทึกแล้ว)" } as Partial<ServicingRow>);
        setSlot(null);
      }} />}
    </>
  );
}

/** Old KPI #4 (label changed only) + Compare A·B·Δ medians by go-live month cohort. */
function GoLiveDays({ rows }: { rows: ServicingRow[] }) {
  const { filter } = useDashboardGlobal();
  const s = useServicing();
  const { demo } = useDashboardGlobal();
  const cards = demo ? demoOnboarding().filter((c) => rows.some((r) => r.card_id === c.id)) : s.cards.filter((c) => rows.some((r) => r.card_id === c.id));
  const med = (p: { from: string; to: string }) => median(rows.filter((r) => r.go_live_at && r.go_live_at.slice(0, 10) >= p.from && r.go_live_at.slice(0, 10) <= p.to).map((r) => daysFrom(r.created_at, r.go_live_at!)));
  const a = filter.compare ? med(filter.periodA) : null;
  const b = filter.compare ? med(filter.periodB) : null;
  const delta = a == null || b == null ? "Δ —" : `Δ ${a > b ? "▲ +" : a < b ? "▼ " : ""}${Math.round(a - b)} วัน`;
  return (
    <div className="space-y-3">
      {filter.compare && <p className="text-sm text-muted-foreground">median A {a == null ? "—" : `D${Math.round(a)}`} · B {b == null ? "—" : `D${Math.round(b)}`} · {delta}</p>}
      <KpiView cards={cards} />
    </div>
  );
}
