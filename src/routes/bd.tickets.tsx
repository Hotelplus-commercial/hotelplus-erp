import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { READY_TH } from "@/lib/expansion";
import {
  DEPTS, STATUS_TH, TYPE_TH, allowedNext, createTask, isPendingPickup, setTicketDemo, transition,
  useTicketReadBack, useTickets, type Dept, type L0Ticket, type Role,
} from "@/lib/tickets-l0";

export const Route = createFileRoute("/bd/tickets")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined, ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined }),
  head: () => ({
    meta: [
      { title: "BD 🎫 Tickets — Ticket Inbox | Meridia Hotel ERP" },
      { name: "description", content: "กล่อง Ticket ของ BD: รับงานเสนอขายบริการเพิ่มและอัปเดตสถานะ" },
      { property: "og:title", content: "BD 🎫 Tickets — Ticket Inbox | Meridia Hotel ERP" },
      { property: "og:description", content: "กล่อง Ticket ของ BD: รับงานเสนอขายบริการเพิ่มและอัปเดตสถานะ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsPage,
});

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

function TicketsPage() {
  const { demo, ticket } = Route.useSearch();
  const [ready, setReady] = useState(false);
  useEffect(() => { setTicketDemo(!!demo); setReady(true); }, [demo]);
  const [role, setRole] = useState<Role>("BD");
  const [openId, setOpenId] = useState<string | null>(null);
  const tickets = useTickets();
  useEffect(() => {
    if (!ready || !ticket) return;
    const selected = tickets.find(t => t.ticket_id === ticket);
    if (!selected) return;
    setOpenId(selected.ticket_id);
    setRole(isPendingPickup(selected) ? selected.target_dept : "BD");
  }, [ready, ticket]);
  if (!ready) return null;
  const bd = tickets.filter((t) => t.target_dept === "BD");
  const parked = tickets.filter(t => isPendingPickup(t) && (role === "PM" || t.target_dept === role));
  const open = tickets.find((t) => t.ticket_id === openId) ?? null;

  return (
    <div className="space-y-5">
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">ข้อมูลสาธิต · 30 กันยายน 2569 · ไม่บันทึก</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">BD Workspace › 🎫 Tickets</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
          <select aria-label="สวมบท" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => { setRole(e.target.value as Role); setOpenId(null); }}>
            {(["PM", ...DEPTS] as Role[]).map((r) => <option key={r} value={r}>สวมบท {r}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">โหมดทดสอบ (เครื่องเดียว ไม่มีล็อกอิน) — การส่ง ticket ข้ามเครื่องจะใช้ได้เมื่อมี Cloud Sync Level B</p>

      {role === "PM" && <PmTester />}

      {role === "BD" || role === "PM" ? (
        <TicketTable rows={bd} onOpen={setOpenId} />
      ) : (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">แผนก {role} · รอ pickup</div>
      )}

      {parked.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">รอ pickup ({parked.length})</h3>
          <TicketTable rows={parked} onOpen={setOpenId} />
        </div>
      )}

      {open && <Detail t={open} role={role} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function TicketTable({ rows, onOpen }: { rows: L0Ticket[]; onOpen: (id: string) => void }) {
  if (!rows.length) return <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">ยังไม่มี ticket</div>;
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
              <td className="p-2"><Badge variant="secondary">{STATUS_TH[t.status]}</Badge>{isPendingPickup(t) && <Badge variant="outline" className="ml-1">รอ pickup · {t.target_dept}</Badge>}</td>
              <td className="p-2 text-muted-foreground">{fmt(t.created_at)}</td>
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

/** Test consumer (PM): shows create button or the read-back badge when an open ticket exists. */
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
