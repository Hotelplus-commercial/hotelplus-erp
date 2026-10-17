import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PendingAssignList } from "@/components/ps/assignment-ui";
import { READY_TH } from "@/lib/expansion";
import {
  DEPTS, OPEN_STATUSES, STATUS_TH, TYPE_TH, allowedNext, createTask, isWatcherOf, setTicketDemo, transition,
  useTicketReadBack, useTickets, SYSTEM_CREATOR, type Dept, type L0Ticket, type Role,
} from "@/lib/tickets-l0";
import { digestFor, runAlertBot, sortBotFirst, type BotRunResult } from "@/lib/alert-bot";
import { demoScanInput } from "@/lib/alert-bot-sources";
import { DEMO_NOW } from "@/lib/ps-demo-fixture";
import type { DateRange, WorkspaceConfig } from "@/lib/workspace-registry";
import { cn } from "@/lib/utils";

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const RANGES: { key: DateRange; label: string }[] = [{ key: "today", label: "วันนี้" }, { key: "7d", label: "7 วัน" }, { key: "14d", label: "14 วัน" }];

/** ONE generic shell (spec Layer 1 §2). Renders only from `config`. */
export function WorkspaceShell({ config, demo, ticket }: { config: WorkspaceConfig; demo: boolean; ticket?: string | undefined }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setTicketDemo(demo); setReady(true); }, [demo]);
  const [role, setRole] = useState<Role>(config.dept_key);
  const [range, setRange] = useState<DateRange>("today");
  useEffect(() => { setRole(config.dept_key); }, [config.dept_key]);
  if (!ready) return null;

  return (
    <div className="space-y-4">
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">ข้อมูลสาธิต · 30 กันยายน 2569 · ไม่บันทึก</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{config.label}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
            <select aria-label="สวมบท" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(["PM", ...DEPTS] as Role[]).map((r) => <option key={r} value={r}>สวมบท {r}</option>)}
            </select>
          </label>
          <div role="group" aria-label="ช่วงวันที่" className="flex rounded-md border p-0.5">
            {RANGES.map((r) => (
              <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)}
                className={cn("rounded px-2.5 py-1 text-xs", range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">โหมดทดสอบ (เครื่องเดียว ไม่มีล็อกอิน) — การส่ง ticket ข้ามเครื่องจะใช้ได้เมื่อมี Cloud Sync Level B</p>

      {role === "PM" && <PmTester />}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
        <Lane title="⏰ ตารางนัด">
          {/* scheduled adapter is null in every workspace this build → empty-state. `range` will feed it later. */}
          {config.lanes.scheduled ? null : <Empty text="ยังไม่มีนัดหมาย" />}
        </Lane>
        <Lane title="✅ งานที่ต้องทำ">
          {config.lanes.todo.length === 0 ? <Empty text="ไม่มีงานค้าง 🎉" /> : null}
          {config.lanes.todo.map((group) => (
            <div key={group.key} className="min-w-0 space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground"><span aria-hidden="true">{group.icon}</span>{group.label_th}</h4>
              {group.assignment_scope && <PendingAssignList scope={group.assignment_scope} />}
            </div>
          ))}
        </Lane>
        <Lane title="🎫 Tickets" focus>
          <TicketsLane dept={config.ticket_target_dept} role={role} initialTicket={ticket} />
        </Lane>
      </div>
    </div>
  );
}

function Lane({ title, focus, children }: { title: string; focus?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 space-y-3 rounded-xl border bg-card p-3", focus && "border-primary/40")}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
const Empty = ({ text }: { text: string }) => <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;

/** Inbound-only: tickets WHERE target_dept = dept. Never time-bound. */
function TicketsLane({ dept, role, initialTicket }: { dept: Dept; role: Role; initialTicket?: string | undefined }) {
  const tickets = useTickets();
  const [showClosed, setShowClosed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const t = initialTicket && tickets.find((x) => x.ticket_id === initialTicket && x.target_dept === dept);
    if (t) { setOpenId(t.ticket_id); setShowClosed(!OPEN_STATUSES.includes(t.status)); }
  }, [initialTicket, dept]); // eslint-disable-line react-hooks/exhaustive-deps
  const inbound = tickets.filter((t) => t.target_dept === dept);
  const rows = inbound.filter((t) => OPEN_STATUSES.includes(t.status) !== showClosed);
  const open = inbound.find((t) => t.ticket_id === openId) ?? null;
  return (
    <div className="space-y-3">
      <div role="group" aria-label="ตัวกรอง ticket" className="inline-flex rounded-md border p-0.5">
        {[{ v: false, l: "เปิดอยู่" }, { v: true, l: "เสร็จ / ยกเลิก" }].map((o) => (
          <button key={o.l} type="button" aria-pressed={showClosed === o.v} onClick={() => setShowClosed(o.v)}
            className={cn("rounded px-2.5 py-1 text-xs", showClosed === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{o.l}</button>
        ))}
      </div>
      <TicketTable rows={rows} onOpen={setOpenId} />
      {open && <Detail t={open} role={role} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function TicketTable({ rows, onOpen }: { rows: L0Ticket[]; onOpen: (id: string) => void }) {
  if (!rows.length) return <Empty text="ยังไม่มี ticket" />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr><th className="p-2">#</th><th className="p-2">ประเภท</th><th className="p-2">โรงแรม</th><th className="p-2">สถานะ</th><th className="p-2">สร้างเมื่อ</th></tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((t) => (
            <tr key={t.ticket_id} className="border-t hover:bg-muted/40">
              <td className="p-2 font-mono"><Button variant="link" size="sm" className="h-auto p-0 font-mono" onClick={() => onOpen(t.ticket_id)}>#{t.ticket_id}</Button></td>
              <td className="p-2">{TYPE_TH[t.type]}</td>
              <td className="p-2">{t.subject_ref.hotel_name} · {t.subject_ref.gap_service}</td>
              <td className="p-2"><Badge variant="secondary">{STATUS_TH[t.status]}</Badge></td>
              <td className="whitespace-nowrap p-2 text-muted-foreground">{fmt(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ t, role, onClose }: { t: L0Ticket; role: Role; onClose: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const actions = allowedNext(t, role);
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">#{t.ticket_id} · {STATUS_TH[t.status]} <span className="text-xs text-muted-foreground">รุ่น {t.revision}</span></h3>
        <Button variant="ghost" size="sm" onClick={onClose}>ปิด</Button>
      </div>
      <dl className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] gap-1 break-words text-sm">
        <dt className="text-muted-foreground">โรงแรม</dt><dd>{t.subject_ref.hotel_name} ({t.subject_ref.hotel_id})</dd>
        <dt className="text-muted-foreground">บริการที่ขาด</dt><dd>{t.subject_ref.gap_service}</dd>
        <dt className="text-muted-foreground">ความพร้อม</dt><dd>{READY_TH[t.payload.readiness_tier] ?? t.payload.readiness_tier}</dd>
        <dt className="text-muted-foreground">เหตุผล</dt><dd className="flex flex-wrap gap-1">{t.payload.chips.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</dd>
        <dt className="text-muted-foreground">หมายเหตุ</dt><dd>{t.payload.note || "—"}</dd>
        <dt className="text-muted-foreground">ผู้สร้าง → แผนก</dt><dd>{t.created_by} → {t.target_dept}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        {actions.length === 0 && <span className="text-xs text-muted-foreground">บทบาทนี้เปลี่ยนสถานะไม่ได้</span>}
        {actions.map((s) => (
          <Button key={s} size="sm" variant={s === "CANCELLED" ? "outline" : "default"}
            onClick={() => setMsg(transition(t.ticket_id, t.revision, s, role) ? null : "ข้อมูลเปลี่ยนไปแล้ว กรุณาลองใหม่")}>
            {STATUS_TH[s]}
          </Button>
        ))}
      </div>
      {msg && <p role="alert" className="text-xs text-warning-foreground">{msg}</p>}
      <ol className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
        {t.audit.map((a, i) => <li key={i}>{fmt(a.at)} · {a.by} · {a.from_status ? STATUS_TH[a.from_status] : "—"} → {STATUS_TH[a.to_status]}</li>)}
      </ol>
    </div>
  );
}

/** L0 test consumer (PM): create button or read-back badge. Writes only via createTask(). */
function PmTester() {
  const [dept, setDept] = useState<Dept>("BD");
  const [note, setNote] = useState<string | null>(null);
  const subject = { hotel_id: "DEMO-SEEFAH", hotel_name: "Seefah", gap_service: "MARCOM" };
  const existing = useTicketReadBack("UPSELL_PITCH", subject.hotel_id, subject.gap_service);
  const otherSubject = { hotel_id: "DEMO-ANJALI", hotel_name: "Anjali", gap_service: "ORM" };
  return (
    <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
      <div className="font-medium">ทดสอบสร้าง Ticket (ตัวอย่างโรงแรม Seefah · ขาด Marcom)</div>
      <div className="flex flex-wrap items-center gap-2">
        {existing ? (
          <Badge>#{existing.ticket_id} · {STATUS_TH[existing.status]}</Badge>
        ) : (
          <Button size="sm" onClick={() => {
            const r = createTask({ type: "UPSELL_PITCH", target_dept: "BD", created_by: "PM", subject_ref: subject, payload: { readiness_tier: "พร้อม", chips: ["ORM อย่างเดียว", "Survey ดี"], note: "" } });
            setNote(r.deduped ? `มี ticket เปิดอยู่แล้ว: #${r.ticket_id}` : null);
          }}>สร้าง Ticket</Button>
        )}
        <span className="text-muted-foreground">·</span>
        <select aria-label="ส่งไปแผนก" className="rounded-md border bg-background px-2 py-1" value={dept} onChange={(e) => setDept(e.target.value as Dept)}>
          {DEPTS.map((d) => <option key={d} value={d}>ส่งไป {d}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={() => {
          const r = createTask({ type: "UPSELL_PITCH", target_dept: dept, created_by: "PM", subject_ref: otherSubject, payload: { readiness_tier: "พร้อม", chips: [], note: "ทดสอบส่งต่างแผนก" } });
          setNote(r.deduped ? `มี ticket เปิดอยู่แล้ว: #${r.ticket_id}` : `สร้าง #${r.ticket_id} แล้ว`);
        }}>สร้าง Ticket ไปแผนกนี้</Button>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
