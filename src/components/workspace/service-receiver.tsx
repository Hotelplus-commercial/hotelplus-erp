/* Service Ticket Receiver v1.0 (ST46–ST60) — 🎫 lane for Workspaces with service_sla (ORM · MARCOM · AC · BD), the "รับงาน" modal,
 * the receiver detail panel, the head category settings and the OGM category-request group (AUTO Workspace).
 * Rows: vServiceTickets() only. Writes: acceptTicket / changeTicketStatus / changeTicketCategory / addCategory / hideCategory /
 * requestCategory / decideCategoryRequest (service-tickets.ts). PS case status stays on the existing case screen. */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { addDemoTickets, isDemoTickets, useTickets, STATUS_TH, type L0Ticket } from "@/lib/tickets-l0";
import { ticketApi, resetDemoTickets, useDemoVersion } from "@/lib/task-tickets";
import { slaDemoTickets, ensureSlaDemoFollowups } from "@/lib/service-tickets-demo";
import { stabDemoTickets } from "@/lib/service-ticket-tab-demo";
import {
  acceptTicket, addCategory, categoryRequests, changeTicketCategory, changeTicketStatus, checkCategoryOverlap, decideCategoryRequest, getCategories, hideCategory,
  requestCategory, svcToday, ticketCategories, ticketFollowups, ticketSla, vServiceTickets, SVC_DEPTS, SVC_STATUS_TH, TEST_ROLE_LABEL,
  type ServiceTicketRow, type SvcActor, type SvcDept, type WaitingOn,
} from "@/lib/service-tickets";
import {
  LANE_FILTERS, RECEIVER_ROSTER, DEFAULT_RECV_VIEWER, WAIT_CHOICES, WAIT_TH, acceptCap, acceptChips, canPickDate, categoryUsage, defaultFilter, dueCell, followBadge,
  isHeadActor, isOpenRow, laneCounts, laneRows, membersOf, receiverActor, seedReceiverDemo, thDate, type LaneFilter,
} from "@/lib/service-receiver";
import { useWsViewer } from "@/lib/ws-viewer";
import { setBellViewer } from "@/lib/bell-items";
import { COACH_TH } from "@/lib/ps-glossary";

const DEPT_TH: Record<SvcDept, string> = { ORM: "ORM", MARCOM: "Marcom", AC: "AC", BD: "BD" };

/* ---------- data ---------- */
function useSvcVersion() {
  return useSyncExternalStore((cb) => { const u = [ticketFollowups, ticketSla, ticketCategories, categoryRequests].map((c) => c.subscribe(cb)); return () => u.forEach((f) => f()); },
    () => [ticketFollowups, ticketSla, ticketCategories, categoryRequests].map((c) => `${c.all(true).length}/${c.all(false).length}`).join(":") + JSON.stringify(ticketSla.all(isDemoTickets()).length), () => "0");
}
/** All service rows (L0 + PS cases) for the current DEMO state. DEMO: shared DEMO ticket list + DEMO PS cases (add-only seeding). */
export function useReceiverRows(demo: boolean) {
  const l0 = useTickets();
  const dv = useDemoVersion();
  const v = useSvcVersion();
  useEffect(() => {
    if (!demo || !isDemoTickets()) return;
    addDemoTickets(slaDemoTickets()); addDemoTickets(stabDemoTickets()); ensureSlaDemoFollowups(); seedReceiverDemo();
    void ticketApi.list(true).then((c) => { if (!c.length) resetDemoTickets(); });
  }, [demo, l0.length]);
  const cases = useQuery({ queryKey: ["task-tickets", demo, demo ? dv : 0], queryFn: () => ticketApi.list(demo), staleTime: demo ? Infinity : 15_000 });
  const today = svcToday(demo);
  const cats = useMemo(() => getCategories(demo), [demo, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => vServiceTickets({ l0, cases: cases.data ?? [], sla: ticketSla.all(demo), followups: ticketFollowups.all(demo), categories: cats, today }), [l0, cases.data, demo, v, cats, today]); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, today, cats, l0 };
}

/* ---------- picker (AC / BD; ORM / Marcom use the Coaching group's picker — same shared value) ---------- */
export function ReceiverPicker({ dept, value, onChange }: { dept: SvcDept; value: string; onChange: (v: string) => void }) {
  const r = RECEIVER_ROSTER[dept];
  return (
    <label className="flex items-center gap-2 text-xs" data-testid="recv-member-picker">
      <span className="text-muted-foreground">{COACH_TH.picker}</span>
      <select aria-label={COACH_TH.picker} className="rounded-md border bg-background px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="หัวหน้า">{r.filter((m) => m.head).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
        <optgroup label="สมาชิก">{r.filter((m) => !m.head).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
      </select>
    </label>
  );
}

/* ---------- §2 lane ---------- */
export function ServiceReceiverLane({ dept, demo, liveRole, initialTicket }: { dept: SvcDept; demo: boolean; liveRole: string; initialTicket?: string | undefined }) {
  const { rows, today, cats, l0 } = useReceiverRows(demo);
  const [memberId, setMemberId] = useWsViewer(dept, DEFAULT_RECV_VIEWER[dept]);
  const actor = receiverActor(dept, { demo, memberId, liveRole });
  const head = isHeadActor(actor, dept);
  const [filter, setFilter] = useState<LaneFilter>(defaultFilter(actor, dept));
  useEffect(() => { setFilter(defaultFilter(actor, dept)); }, [head, dept]); // eslint-disable-line react-hooks/exhaustive-deps
  const [openId, setOpenId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  // AC / BD: the picked member is the bell viewer (ORM / Marcom: the Coaching group already does this).
  useEffect(() => {
    if (!demo || (dept !== "AC" && dept !== "BD") || !actor) return;
    setBellViewer({ id: `member:${memberId}`, users: [memberId], roles: head ? [actor.role] : [], depts: [dept] });
  }, [demo, memberId, dept, head]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initialTicket) return;
    if (initialTicket === "filter:unaccepted") setFilter("unaccepted");
    else if (initialTicket === "settings") setSettings(true);
    else if (rows.some((r) => r.ticket_id === initialTicket && r.dept === dept)) setOpenId(initialTicket);
  }, [initialTicket, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const deptRows = useMemo(() => rows.filter((r) => r.type !== "WELCOME_BACK"), [rows]);
  const list = laneRows(deptRows, dept, actor, filter);
  const counts = laneCounts(deptRows, dept, actor);
  const open = deptRows.find((r) => r.ticket_id === openId) ?? null;
  const acc = deptRows.find((r) => r.ticket_id === accepting) ?? null;

  return (
    <div className="min-w-0 space-y-2" data-testid="recv-lane">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">ticket บริการ · {DEPT_TH[dept]}</h4>
        <div className="flex flex-wrap items-center gap-2">
          {demo && (dept === "AC" || dept === "BD") && <ReceiverPicker dept={dept} value={memberId} onChange={setMemberId} />}
          {head && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSettings(true)} data-testid="recv-gear">⚙️ หมวด ticket</Button>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="recv-counts">ยังไม่รับงาน {counts.unaccepted} · เลยกำหนด {counts.overdue}{actor ? ` · ดูในนาม ${actor.label}` : " · ดูอย่างเดียว"}</p>
      <div role="group" aria-label="ตัวกรอง ticket บริการ" className="flex flex-wrap gap-1">
        {LANE_FILTERS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} data-testid={`recv-f-${k}`}
            className={cn("rounded-full border px-2.5 py-0.5 text-xs", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">ไม่มี ticket ในมุมมองนี้</p> : (
        <ul className="divide-y rounded-lg border" data-testid="recv-list">
          {list.map((r) => <ReceiverRow key={`${r.ticket_store}:${r.ticket_id}`} r={r} today={today} l0={l0} canAccept={!!actor && r.display_status === "NEW"} onOpen={() => setOpenId(r.ticket_id)} onAccept={() => setAccepting(r.ticket_id)} />)}
        </ul>
      )}
      {acc && actor && <AcceptDialog r={acc} actor={actor} head={head} demo={demo} today={today} cats={cats.filter((c) => c.dept === dept && !c.hidden)} onClose={() => setAccepting(null)} />}
      {open && <ReceiverPanel r={open} actor={actor} head={head} demo={demo} today={today} l0={l0} cats={cats.filter((c) => c.dept === dept && !c.hidden)} onClose={() => setOpenId(null)} onAccept={() => setAccepting(open.ticket_id)} />}
      {settings && actor && head && <CategorySettings dept={dept} actor={actor} demo={demo} rows={deptRows} onClose={() => setSettings(false)} />}
    </div>
  );
}

const shutTypeTh = (r: ServiceTicketRow) => (r.type === "SYSTEM_SHUTOFF" ? "ขอปิดระบบ" : r.type === "SYSTEM_REACTIVATE" ? "ขอเปิดระบบคืน" : null);
const STATUS_TONE: Record<string, string> = { NEW: "border-warning/50 text-warning-foreground", SOLVED: "border-success/50 text-success", CANCELLED: "text-muted-foreground" };

function ReceiverRow({ r, today, l0, canAccept, onOpen, onAccept }: { r: ServiceTicketRow; today: string; l0: L0Ticket[]; canAccept: boolean; onOpen: () => void; onAccept: () => void }) {
  const due = dueCell(r, today); const fb = followBadge(r, today); const shut = shutTypeTh(r);
  const sp = shut ? l0.find((t) => t.ticket_id === r.ticket_id)?.payload.shutoff : undefined;
  return (
    <li className="space-y-1 p-2 text-xs" data-testid="recv-row" data-ticket={r.ticket_id}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="font-mono font-medium text-primary hover:underline" onClick={onOpen}>{r.ticket_no}</button>
        <Badge variant="outline" className="text-[10px]">{r.category_name_th}</Badge>
        {shut && <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive" data-testid="recv-shut-type">{shut}</Badge>}
        {r.ticket_store === "PS_CASE" && <Badge variant="outline" className="text-[10px]">PS case</Badge>}
        <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[r.display_status])}>{SVC_STATUS_TH[r.display_status]}</Badge>
        <span className="ml-auto tabular-nums text-muted-foreground">{r.age_days} วัน</span>
      </div>
      <button type="button" className="block w-full text-left" onClick={onOpen}>
        <span className="font-medium">{r.hotel_name}</span> · <span>{r.subject}</span>
        <span className="block text-muted-foreground">เปิดโดย {r.opened_by_label}{r.assignee_label ? ` · ผู้รับ ${r.assignee_label}` : ""}{sp ? ` · ${sp.system_name ?? sp.partner ?? "—"} · AE ${sp.assigned_ae ?? "—"}` : ""}</span>
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded px-1.5 py-0.5", due.tone === "red" ? "bg-destructive/10 text-destructive" : due.tone === "amber" ? "bg-warning/15 text-warning-foreground" : "bg-muted")} data-testid="recv-due">{due.text}</span>
        {due.waitChip && <span className="rounded bg-muted px-1.5 py-0.5">{due.waitChip}</span>}
        {fb && <span className={cn("rounded px-1.5 py-0.5", fb.today ? "bg-warning/15 text-warning-foreground" : "bg-muted")} data-testid="recv-fu">{fb.text}</span>}
        {canAccept && <Button size="sm" className="ml-auto h-6 px-2 text-xs" onClick={onAccept} data-testid="recv-accept">รับงาน</Button>}
      </div>
    </li>
  );
}

/* ---------- §3 accept ---------- */
function AcceptDialog({ r, actor, head, demo, today, cats, onClose }: { r: ServiceTicketRow; actor: SvcActor; head: boolean; demo: boolean; today: string; cats: { id: string; name_th: string }[]; onClose: () => void }) {
  const [date, setDate] = useState<string>("");
  const [other, setOther] = useState(false);
  const members = membersOf(r.dept);
  const [who, setWho] = useState<string>(actor.member_id ?? "");
  const [cat, setCat] = useState(r.category_id);
  const [err, setErr] = useState<string | null>(null);
  const cap = acceptCap(r.created_date);
  const submit = () => {
    if (cat !== r.category_id) { const c = changeTicketCategory(r, cat, actor, { demo }); if (!c.ok) { setErr(c.error); return; } }
    const m = members.find((x) => x.id === who);
    const res = acceptTicket(r, date, actor, { demo, today, ...(head && m && who !== actor.member_id ? { onBehalf: { member_id: m.id, label: m.name } } : {}) });
    if (!res.ok) { setErr(res.error); return; }
    toast.success(`รับงาน ${r.ticket_no} แล้ว`); onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="recv-accept-modal">
        <DialogHeader>
          <DialogTitle>กด “รับงาน” · {r.ticket_no}</DialogTitle>
          <DialogDescription>สร้าง {thDate(r.created_date)} โดย {r.opened_by_label} · {r.category_name_th} · {r.hotel_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <p className="font-medium">วันกำหนดเสร็จ (บังคับ)</p>
            <div className="flex flex-wrap gap-1.5">
              {acceptChips(r.created_date, today).map((c) => (
                <button key={c.days} type="button" disabled={c.disabled} aria-pressed={!other && date === c.date} onClick={() => { setOther(false); setDate(c.date); }} data-testid={`recv-chip-${c.days}`}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs disabled:opacity-40", !other && date === c.date ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>+{c.days} วัน · {thDate(c.date)}</button>
              ))}
              <button type="button" aria-pressed={other} onClick={() => { setOther(true); setDate(""); }} className={cn("rounded-full border px-2.5 py-0.5 text-xs", other ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>เลือกวันอื่น…</button>
            </div>
            {other && <input type="date" aria-label="วันกำหนดเสร็จ" min={today} max={cap} className="rounded border bg-background px-2 py-1 text-xs" value={date} onChange={(e) => setDate(canPickDate(e.target.value, r.created_date, today) ? e.target.value : "")} />}
            <p className="text-xs text-muted-foreground">เลือกได้ถึง {thDate(cap)} (วันสร้าง {thDate(r.created_date)} + 10 วัน) · ตั้งแล้วเลื่อนไม่ได้</p>
          </div>
          {head && (
            <label className="flex items-center gap-2 text-xs">ผู้รับ
              <select aria-label="ผู้รับ" className="rounded border bg-background px-2 py-1" value={who} onChange={(e) => setWho(e.target.value)}>
                <option value={actor.member_id ?? ""}>{actor.label} (ตัวเอง)</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-xs">หมวด
            <select aria-label="หมวด" className="rounded border bg-background px-2 py-1" value={cat} onChange={(e) => setCat(e.target.value)}>
              {!cats.some((c) => c.id === r.category_id) && <option value={r.category_id}>{r.category_name_th}</option>}
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          </label>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
            <Button size="sm" disabled={!date} onClick={submit} data-testid="recv-accept-submit">รับงาน</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- §4 detail panel ---------- */
function ReceiverPanel({ r, actor, head, demo, today, l0, cats, onClose, onAccept }: { r: ServiceTicketRow; actor: SvcActor | null; head: boolean; demo: boolean; today: string; l0: L0Ticket[]; cats: { id: string; name_th: string }[]; onClose: () => void; onAccept: () => void }) {
  const [waitOpen, setWaitOpen] = useState(false);
  const [waitOn, setWaitOn] = useState<WaitingOn | "">("");
  const [waitNote, setWaitNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const t = r.ticket_store === "L0" ? l0.find((x) => x.ticket_id === r.ticket_id) : undefined;
  const sp = t?.payload.shutoff; const shut = shutTypeTh(r);
  const twin = sp?.twin_ticket_id ? l0.find((x) => x.ticket_id === sp.twin_ticket_id) : undefined;
  const canAct = !!actor && (head || (!!actor.member_id && r.assignee_id === actor.member_id));
  const fus = ticketFollowups.all(demo).filter((f) => f.ticket_store === r.ticket_store && f.ticket_id === r.ticket_id).sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  const last = fus[fus.length - 1];
  const timeline = [
    ...(t?.audit ?? []).map((a) => ({ at: a.at, text: `${a.actor ?? a.by} · ${a.note ?? (a.to_status in SVC_STATUS_TH ? SVC_STATUS_TH[a.to_status as keyof typeof SVC_STATUS_TH] : STATUS_TH[a.to_status as keyof typeof STATUS_TH] ?? a.to_status)}` })),
    ...(r.ticket_store === "PS_CASE" ? [{ at: r.created_at, text: `${r.opened_by_label} · สร้าง case` }] : []),
    ...fus.map((f) => ({ at: f.sent_at, text: `📣 Follow up · ${f.sent_by}${f.note ? ` · “${f.note}”` : ""}` })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const go = (to: "IN_PROGRESS" | "WAITING_CUSTOMER" | "WAITING_THIRD_PARTY" | "SOLVED", extra: { waiting_on?: WaitingOn; note?: string } = {}) => {
    if (!actor) return;
    if (to === "SOLVED" && typeof window !== "undefined" && !window.confirm(`ยืนยัน Solve ${r.ticket_no}?`)) return;
    const res = changeTicketStatus(r, to, actor, { demo, ...extra });
    if (!res.ok) { setErr(res.error); return; }
    setErr(null); setWaitOpen(false); setWaitOn(""); setWaitNote("");
  };
  const kv: [string, string][] = [
    ["โรงแรม", r.hotel_name], ["สัญญา / บริการ", `${r.contract_id ?? "—"} · ${r.service ?? "—"}`], ["เปิดโดย", r.opened_by_label], ["สร้าง", thDate(r.created_date)],
    ["วันกำหนดเสร็จ", r.due_date ? thDate(r.due_date) : `ยังไม่ใส่วันที่ · สูงสุด ${thDate(r.effective_due_date)}`], ["ผู้รับ", r.assignee_label ?? "—"],
  ];
  if (t?.waiting_on && (r.display_status === "WAITING_CUSTOMER" || r.display_status === "WAITING_THIRD_PARTY")) kv.push(["รอใคร", `${WAIT_TH[t.waiting_on]}${t.waiting_on_note ? ` · ${t.waiting_on_note}` : ""}`]);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" data-testid="recv-panel">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2"><span className="font-mono">{r.ticket_no}</span><Badge variant="outline">{SVC_STATUS_TH[r.display_status]}</Badge>{shut && <Badge variant="outline" className="text-destructive">{shut}</Badge>}</SheetTitle>
          <SheetDescription>{r.subject}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <label className="flex items-center gap-2 text-xs">หมวด
            <select aria-label="หมวด ticket" disabled={!canAct} className="rounded border bg-background px-2 py-1" value={r.category_id}
              onChange={(e) => { if (!actor) return; const res = changeTicketCategory(r, e.target.value, actor, { demo }); setErr(res.ok ? null : res.error); }}>
              {!cats.some((c) => c.id === r.category_id) && <option value={r.category_id}>{r.category_name_th}</option>}
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          </label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">{kv.map(([k, v]) => <><dt key={`k-${k}`} className="text-muted-foreground">{k}</dt><dd key={`v-${k}`}>{v}</dd></>)}</dl>
          {sp && (
            <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs" data-testid="recv-shutoff">
              <p className="font-medium">{r.type === "SYSTEM_SHUTOFF" ? "เคลียร์ข้อมูลบนระบบของโรงแรม (คล้าย Off-board)" : "เปิดระบบและคืนข้อมูล"}</p>
              <p>สัญญา {sp.contract_id} · ระบบ Partner {sp.system_name ?? sp.partner ?? "—"} · AE {sp.assigned_ae ?? "—"}</p>
              <p data-testid="recv-twin">ticket ฝั่ง PS: {twin ? `${twin.ticket_id} · ${STATUS_TH[twin.status]}` : "—"}</p>
            </div>
          )}
          {last && <p className="rounded-md bg-warning/15 p-2 text-xs" data-testid="recv-fu-banner">📣 PS / AE ตามงานแล้ว {fus.length} ครั้ง · ล่าสุด {thDate(last.sent_at)} โดย {last.sent_by}{last.note ? ` · “${last.note}”` : ""}</p>}
          {r.display_status === "NEW" && actor && <Button size="sm" onClick={onAccept} data-testid="recv-panel-accept">รับงาน</Button>}
          {r.ticket_store === "PS_CASE" ? (
            <a href={`/ps?tab=task${demo ? "&demo=1" : ""}`} className="block text-xs text-primary underline" data-testid="recv-case-link">เปลี่ยนสถานะที่หน้าจอ case เดิม ↗</a>
          ) : canAct && r.display_status !== "NEW" && r.display_status !== "CANCELLED" && (
            <div className="space-y-2" data-testid="recv-status-actions">
              <div className="flex flex-wrap gap-1.5">
                {r.display_status === "IN_PROGRESS" && <>
                  <Button size="sm" variant="outline" onClick={() => go("WAITING_CUSTOMER")}>รอลูกค้า</Button>
                  <Button size="sm" variant="outline" onClick={() => setWaitOpen(true)} data-testid="recv-wait3p">รอ 3rd Party</Button>
                </>}
                {(r.display_status === "WAITING_CUSTOMER" || r.display_status === "WAITING_THIRD_PARTY") && <Button size="sm" variant="outline" onClick={() => go("IN_PROGRESS")}>กำลังดำเนินการ</Button>}
                {isOpenRow(r) && <Button size="sm" onClick={() => go("SOLVED")} data-testid="recv-solve">Solve</Button>}
                {r.display_status === "SOLVED" && <Button size="sm" variant="outline" onClick={() => go("IN_PROGRESS")} data-testid="recv-reopen">เปิดอีกครั้ง</Button>}
              </div>
              {waitOpen && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
                  <select aria-label="รอใคร" className="rounded border bg-background px-2 py-1" value={waitOn} onChange={(e) => setWaitOn(e.target.value as WaitingOn)}>
                    <option value="">รอใคร…</option>{WAIT_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  {waitOn === "OTHER" && <input aria-label="ระบุ" maxLength={120} className="min-w-32 flex-1 rounded border bg-background px-2 py-1" value={waitNote} onChange={(e) => setWaitNote(e.target.value)} placeholder="ระบุ" />}
                  <Button size="sm" disabled={!waitOn || (waitOn === "OTHER" && !waitNote.trim())} onClick={() => go("WAITING_THIRD_PARTY", { waiting_on: waitOn as WaitingOn, note: waitNote })}>บันทึก</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">เวลาไม่หยุดนับระหว่างรอ · วันกำหนดเสร็จเลื่อนไม่ได้</p>
            </div>
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ไทม์ไลน์</p>
            <ul className="space-y-0.5 text-xs" data-testid="recv-timeline">{timeline.map((x, i) => <li key={i}><span className="text-muted-foreground">{thDate(x.at)}</span> · {x.text}</li>)}</ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- §5 head category settings ---------- */
function CategorySettings({ dept, actor, demo, rows, onClose }: { dept: SvcDept; actor: SvcActor; demo: boolean; rows: ServiceTicketRow[]; onClose: () => void }) {
  useSvcVersion();
  const cats = getCategories(demo).filter((c) => c.dept === dept);
  const reqs = categoryRequests.all(demo).filter((r) => r.dept === dept);
  const [name, setName] = useState(""); const [kw, setKw] = useState(""); const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false); const [note, setNote] = useState("");
  useEffect(() => { const h = setTimeout(() => setQ(name), 250); return () => clearTimeout(h); }, [name]);
  const conflicts = q.trim() ? checkCategoryOverlap(dept, q, getCategories(demo)) : [];
  const create = () => {
    const res = addCategory(dept, name, actor, { demo, keywords: kw.split(",") });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`สร้างหมวด ${res.category.name_th} แล้ว`); setName(""); setKw(""); setQ("");
  };
  const ask = () => {
    const res = requestCategory(dept, name, note.trim() || null, actor, { demo });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("ส่งเรื่องขอเพิ่มหมวดถึง OGM ใน Auto App แล้ว"); setAsking(false); setNote(""); setName(""); setQ("");
  };
  const stTh = (s: string, n: string | null) => (s === "PENDING" ? "รอ OGM" : s === "APPROVED" ? "อนุมัติแล้ว" : `ไม่อนุมัติ (${n ?? "—"})`);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" data-testid="recv-settings">
        <DialogHeader><DialogTitle>⚙️ หมวด ticket · {DEPT_TH[dept]}</DialogTitle><DialogDescription>หัวหน้าแผนกเพิ่มหรือซ่อนหมวดที่แผนกเพิ่มเองได้ · ไม่มีการลบหมวด</DialogDescription></DialogHeader>
        <ul className="divide-y rounded-md border text-xs">
          {cats.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 p-2" data-testid="recv-cat-row">
              <span className="min-w-0 flex-1 font-medium">{c.name_th}</span>
              <span className="text-muted-foreground">{c.is_system ? "ระบบ" : `เพิ่มโดย ${c.created_by}`}</span>
              <span className="tabular-nums text-muted-foreground">ใช้ {categoryUsage(rows, c.id)}</span>
              <span>{c.hidden ? "ซ่อนอยู่" : "ใช้งาน"}</span>
              {c.is_system ? <span className="text-muted-foreground">ซ่อนได้โดย OGM เท่านั้น</span>
                : !c.hidden && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => { const r = hideCategory(c.id, actor, { demo }); if (!r.ok) toast.error(r.error); }}>ซ่อน</Button>}
            </li>
          ))}
        </ul>
        <div className="space-y-2 rounded-md border p-2 text-xs">
          <p className="font-medium">เพิ่มหมวด</p>
          <input aria-label="ชื่อหมวดใหม่" placeholder="ชื่อหมวดใหม่" className="w-full rounded border bg-background px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="คำค้น" placeholder="คำค้น (ไม่บังคับ คั่นด้วย ,)" className="w-full rounded border bg-background px-2 py-1" value={kw} onChange={(e) => setKw(e.target.value)} />
          {q.trim() && (conflicts.length === 0
            ? <p className="text-success" data-testid="recv-cat-ok">✓ ไม่ซ้ำกับหมวดที่มีอยู่ · สร้างได้</p>
            : <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive" data-testid="recv-cat-conflict">กำกวม / ทับซ้อนกับหมวดที่มีอยู่: {conflicts.map((c) => c.name_th).join(", ")} · สร้างเองไม่ได้ · ถ้าจำเป็นจริงให้ส่งเรื่องถึง OGM พิจารณา</p>)}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!q.trim() || name !== q || conflicts.length > 0} onClick={create} data-testid="recv-cat-create">{conflicts.length ? "🔒 สร้างหมวด" : "สร้างหมวด"}</Button>
            {conflicts.length > 0 && <Button size="sm" variant="outline" onClick={() => setAsking(true)} data-testid="recv-cat-ask">ส่งเรื่องถึง OGM (Auto App)</Button>}
          </div>
          {asking && (
            <div className="flex flex-wrap gap-2">
              <input aria-label="หมายเหตุถึง OGM" placeholder="เหตุผลสั้น ๆ" className="min-w-40 flex-1 rounded border bg-background px-2 py-1" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" onClick={ask} data-testid="recv-cat-send">ส่ง</Button>
            </div>
          )}
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-medium">คำขอของแผนก</p>
          {reqs.length === 0 ? <p className="text-muted-foreground">ยังไม่มีคำขอ</p> : (
            <ul className="divide-y rounded-md border" data-testid="recv-cat-reqs">{reqs.map((r) => <li key={r.id} className="flex justify-between gap-2 p-2"><span>{r.proposed_name}</span><span>{stTh(r.status, r.ogm_note)}</span></li>)}</ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- §6 OGM group (AUTO Workspace) ---------- */
export function OgmCategoryGroup({ demo }: { demo: boolean }) {
  useSvcVersion();
  useEffect(() => { if (demo) seedReceiverDemo(); }, [demo]);
  const [tab, setTab] = useState<"req" | "all">("req");
  const [rejecting, setRejecting] = useState<string | null>(null); const [reason, setReason] = useState("");
  const actor: SvcActor = { role: "OGM", member_id: "OGM", label: TEST_ROLE_LABEL.OGM };
  const cats = getCategories(demo);
  const reqs = categoryRequests.all(demo);
  const pending = reqs.filter((r) => r.status === "PENDING");
  const nameOf = (id: string) => cats.find((c) => c.id === id)?.name_th ?? id;
  const decide = (id: string, ok: boolean) => {
    const res = decideCategoryRequest(id, ok, actor, { demo, ...(ok ? {} : { note: reason.trim() }) });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(ok ? "อนุมัติหมวดแล้ว" : "ไม่อนุมัติแล้ว"); setRejecting(null); setReason("");
  };
  return (
    <section className="space-y-2 rounded-lg border p-3" data-testid="ogm-cat-group">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">📂 คำขอเพิ่มหมวด ticket ({pending.length})</h3>
        <span className="text-xs text-muted-foreground">ดูในนาม {TEST_ROLE_LABEL.OGM}</span>
      </div>
      <div role="group" aria-label="มุมมองหมวด" className="flex gap-1">
        {([["req", "คำขอ"], ["all", "หมวดทั้งหมด"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{l}</button>
        ))}
      </div>
      {tab === "req" ? (pending.length === 0 ? <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">ไม่มีคำขอรอพิจารณา</p> : (
        <ul className="divide-y rounded-md border text-xs">
          {pending.map((r) => (
            <li key={r.id} className="space-y-1 p-2" data-testid="ogm-req-row">
              <p><Badge variant="outline" className="mr-1 text-[10px]">{DEPT_TH[r.dept]}</Badge><span className="font-medium">{r.proposed_name}</span> · ขอโดย {r.requested_by} · {thDate(r.requested_at)}</p>
              {r.conflict_category_ids.length > 0 && <p className="flex flex-wrap gap-1">ทับซ้อน: {r.conflict_category_ids.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{nameOf(c)}</Badge>)}</p>}
              {r.proposed_note && <p className="text-muted-foreground">“{r.proposed_note}”</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-6 px-2 text-xs" onClick={() => decide(r.id, true)} data-testid="ogm-approve">อนุมัติ</Button>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setRejecting(r.id)}>ไม่อนุมัติ</Button>
              </div>
              {rejecting === r.id && (
                <div className="flex flex-wrap gap-2">
                  <input aria-label="เหตุผลที่ไม่อนุมัติ" placeholder="เหตุผล (บังคับ)" className="min-w-40 flex-1 rounded border bg-background px-2 py-1" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button size="sm" className="h-6 px-2 text-xs" disabled={!reason.trim()} onClick={() => decide(r.id, false)}>ยืนยัน</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )) : (
        <ul className="divide-y rounded-md border text-xs" data-testid="ogm-all-cats">
          {SVC_DEPTS.flatMap((d) => cats.filter((c) => c.dept === d)).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 p-2">
              <Badge variant="outline" className="text-[10px]">{DEPT_TH[c.dept]}</Badge>
              <span className="min-w-0 flex-1">{c.name_th}</span>
              <span className="text-muted-foreground">{c.is_system ? "ระบบ" : `เพิ่มโดย ${c.created_by}`}</span>
              {c.hidden ? <span>ซ่อนอยู่</span> : <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => { const r = hideCategory(c.id, actor, { demo }); if (!r.ok) toast.error(r.error); }}>ซ่อน</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
