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
import type { DateRange, WorkspaceConfig } from "@/lib/workspace-registry";
import { cn } from "@/lib/utils";
import { setRenewalDemo } from "@/lib/renewal-store";
import { RenewalApprovalList } from "@/components/ps/renewal-request-ui";
import { TicketAttachments } from "@/components/ps/renewal-request-ui";
import { reportStageLabel, statusText } from '@/lib/servicing-time';
import { servicingLanes } from '@/lib/servicing-time';
import { demoServicingRows, SERVICING_DEMO_NOW } from '@/lib/servicing-demo';
import { WelcomeBackSection } from "./welcome-back-section";
import { WB_TEST_BDS, wbActorOf } from "@/lib/welcome-back-routing";
import { isRenewalTestMode } from "@/lib/renewal-test-actor";
import { WB } from "@/lib/ps-glossary";
import { pageDateLabel } from "@/lib/demo-session";
import { Link } from "@tanstack/react-router";
import { setPartnerDemo, usePartnerData } from "@/lib/debt-partner-store";
import { seedShutoffDemo } from "@/lib/partner-todo";
import { ShutoffDetailRows, ShutoffRowHint, useShutoffActor } from "@/components/workspace/partner-shutoff";
import { isPsShutoff } from "@/lib/partner-workspace";
import type { TodoTypeGroup } from "@/lib/workspace-registry";

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const RANGES: { key: DateRange; label: string }[] = [{ key: "today", label: "วันนี้" }, { key: "7d", label: "7 วัน" }, { key: "14d", label: "14 วัน" }];

/** R3.2 WB12: the role the page plays (lifted to page level on BD App › Workspace; other workspaces keep their own). */
export type WsRoleState = { role: Role | "BDM"; setRole: (r: Role | "BDM") => void; bdMember: string; setBdMember: (m: string) => void };

/** The existing testing role switcher (options / defaults unchanged). BDM + BD member pick only on BD in testing mode. */
export function RoleSwitcher({ dept, state }: { dept: Dept; state: WsRoleState }) {
  const { role, setRole, bdMember, setBdMember } = state;
  const wbTest = dept === "BD" && isRenewalTestMode();
  const roles: (Role | "BDM")[] = ["PM", ...DEPTS];
  if (wbTest) roles.splice(roles.indexOf("BD"), 0, "BDM");
  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
        <select aria-label="สวมบท" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as Role | "BDM")}>
          {roles.map((r) => <option key={r} value={r}>สวมบท {r}</option>)}
        </select>
      </label>
      {wbTest && role === "BD" && (
        <label className="flex items-center gap-2 text-sm">
          <select aria-label={WB.memberAria} className="rounded-md border bg-background px-2 py-1" value={bdMember} onChange={(e) => setBdMember(e.target.value)}>
            {WB_TEST_BDS.map((m) => <option key={m.member_id} value={m.member_id}>{WB.member(m.label)}</option>)}
          </select>
          <Badge variant="outline" className="text-[10px]">{WB.testData}</Badge>
        </label>
      )}
    </>
  );
}

/** ONE generic shell (spec Layer 1 §2). Renders only from `config`. R3.2: `roleState` given → the page owns the switcher (not rendered here). */
export function WorkspaceShell({ config, demo, ticket, roleState, onGoBdm }: { config: WorkspaceConfig; demo: boolean; ticket?: string | undefined; roleState?: WsRoleState; onGoBdm?: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setRenewalDemo(demo); setTicketDemo(demo);
    // PM Workspace Partner v1.0: Partner data follows DEMO; §7 shut-off demo tickets live in the in-memory ticket store only.
    if (config.dept_key === "PS") { setPartnerDemo(demo); if (demo) seedShutoffDemo(); }
    setReady(true);
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps
  // R3.1 WB2: BD Workspace adds สวมบท BDM and a BD member pick under สวมบท BD (testing mode only). Default role unchanged.
  const [ownRole, setOwnRole] = useState<Role | "BDM">(config.dept_key);
  const [ownMember, setOwnMember] = useState<string>(WB_TEST_BDS[0].member_id);
  const [range, setRange] = useState<DateRange>("today");
  useEffect(() => { if (!roleState) setOwnRole(config.dept_key); }, [config.dept_key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return null;
  const rs: WsRoleState = roleState ?? { role: ownRole, setRole: setOwnRole, bdMember: ownMember, setBdMember: setOwnMember };
  const { role, bdMember } = rs;
  const deptRole: Role = role === "BDM" ? "BD" : role; // BDM works other ticket types as BD (unchanged rules)

  return (
    <div className="space-y-4">
      {/* R3.3 WB20: BD App › Workspace uses the PS Dashboard DEMO date; other workspaces keep theirs. */}
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs" data-testid="ws-demo-bar">ข้อมูลสาธิต · {/* v1.1 PW22: every workspace banner reads the shared DEMO-state helper */}{pageDateLabel(true)} · ไม่บันทึก</div>}
      {/* Partner v1.2 §2.5: testing mode, PM Workspace opened as a non-PM role (switcher default unchanged) */}
      {config.dept_key === "PS" && deptRole !== "PM" && isRenewalTestMode() && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs" data-testid="pm-partner-banner">
          หน้าจัดการ Partner ใช้ได้เฉพาะ PM ·
          <button type="button" className="font-medium text-primary underline" onClick={() => rs.setRole("PM")} data-testid="pm-partner-banner-switch">สลับเป็น PM</button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{config.label}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* v1.1 PW15: always visible on PM Workspace; PM → enabled · testing mode not PM → disabled + switch link · real use not PM → hidden */}
          {config.dept_key === "PS" && (deptRole === "PM" ? (
            <Button asChild size="sm" variant="outline" data-testid="pm-partner-btn"><Link to="/workspace/ps/partners" hash="partner" search={{ demo: demo ? 1 : undefined }}>🤝 จัดการ Partner</Link></Button>
          ) : isRenewalTestMode() ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="pm-partner-locked">
              <Button size="sm" variant="outline" disabled data-testid="pm-partner-btn">🤝 จัดการ Partner</Button>
              <span>เฉพาะ PM</span>
              <button type="button" className="text-primary underline" onClick={() => rs.setRole("PM")} data-testid="pm-partner-switch">สลับเป็น PM เพื่อทดสอบ</button>
            </span>
          ) : null)}
          {!roleState && <RoleSwitcher dept={config.dept_key} state={rs} />}
          <div role="group" aria-label="ช่วงวันที่" className="flex rounded-md border p-0.5">
            {RANGES.map((r) => (
              <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)}
                className={cn("rounded px-2.5 py-1 text-xs", range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">โหมดทดสอบ (เครื่องเดียว ไม่มีล็อกอิน) — การส่ง ticket ข้ามเครื่องจะใช้ได้เมื่อมี Cloud Sync Level B</p>

      {deptRole === "PM" && <PmTester />}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
        <Lane title="⏰ ตารางนัด">
          {/* scheduled adapter is null in every workspace this build → empty-state. `range` will feed it later. */}
          {config.lanes.scheduled ? null : <Empty text="ยังไม่มีนัดหมาย" />}
        </Lane>
        <Lane title="✅ งานที่ต้องทำ">
          {(config.dept_key === "PS" || config.dept_key === "OFFICE") && <RenewalApprovalList scope={config.dept_key === "PS" ? "PM" : "OVERDUE"} />}
          {config.lanes.todo.length === 0 && config.dept_key !== "PS" && config.dept_key !== "OFFICE" ? <Empty text="ไม่มีงานค้าง 🎉" /> : null}
          {config.lanes.todo.map((group) => group.adapter ? <AdapterTodoGroup key={group.key} group={group} person={deptRole} range={range} demo={demo} /> : (
            <div key={group.key} className="min-w-0 space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground"><span aria-hidden="true">{group.icon}</span>{group.label_th}</h4>
              {group.assignment_scope && <PendingAssignList scope={group.assignment_scope} />}
            </div>
          ))}
        </Lane>
        <Lane title="🎫 Tickets" focus>
          {config.ticket_target_dept === "BD" && <WelcomeBackSection actor={wbActorOf(role, bdMember)} demo={demo} initialTicket={ticket} {...(onGoBdm ? { onGoBdm } : {})} />}
          <TicketsLane dept={config.ticket_target_dept} role={deptRole} initialTicket={ticket} />
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
/** L1 TodoTypeGroup with an adapter: hidden when empty. Re-reads on Partner data changes. */
function AdapterTodoGroup({ group, person, range, demo }: { group: TodoTypeGroup; person: string; range: DateRange; demo: boolean }) {
  usePartnerData(); useTickets();
  const items = group.adapter ? (group.adapter({ person, range }) as (ReturnType<NonNullable<TodoTypeGroup["adapter"]>>[number] & { sub?: string })[]) : [];
  if (!items.length) return null;
  return (
    <div className="min-w-0 space-y-2" data-testid={`todo-group-${group.key}`}>
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground"><span aria-hidden="true">{group.icon}</span>{group.label_th} ({items.length})</h4>
      <ul className="divide-y rounded-lg border">
        {items.map((it) => {
          const [path, hash] = it.route_target.split("#");
          return (
            <li key={it.id} className="p-2 text-sm" data-testid="todo-item">
              <Link to={path as "/workspace/ps/partners"} hash={hash ?? ""} search={{ demo: demo ? 1 : undefined }} className="font-medium text-primary hover:underline">{it.title}</Link>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{it.sub}</span><span className="tabular-nums">{it.due_relative}</span></div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
const Empty = ({ text }: { text: string }) => <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;

/** Inbound: tickets WHERE target_dept = dept OR payload.watchers[] contains dept (👁 FYI, read-only). Never time-bound. */
function TicketsLane({ dept, role, initialTicket }: { dept: Dept; role: Role; initialTicket?: string | undefined }) {
  const tickets = useTickets();
  const [showClosed, setShowClosed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const t = initialTicket && tickets.find((x) => x.ticket_id === initialTicket && x.type !== "WELCOME_BACK" && (x.target_dept === dept || isWatcherOf(x, dept)));
    if (t) { setOpenId(t.ticket_id); setShowClosed(!OPEN_STATUSES.includes(t.status)); }
  }, [initialTicket, dept]); // eslint-disable-line react-hooks/exhaustive-deps
  const inbound = tickets.filter((t) => t.target_dept === dept || isWatcherOf(t, dept));
  // R3.1: Welcome Back has its own section (BDM-first visibility); every other type stays in this table unchanged.
  const listed = inbound.filter((t) => t.type !== "WELCOME_BACK");
  const rows = sortBotFirst(listed.filter((t) => OPEN_STATUSES.includes(t.status) !== showClosed));
  const open = listed.find((t) => t.ticket_id === openId) ?? null;
  // Digest round = the latest BOT round present in this lane (demo clock-safe), fallback to today.
  const round = inbound.map((t) => t.payload.generated_round).filter((r): r is string => !!r).sort().pop() ?? new Date().toISOString().slice(0, 10);
  const digest = digestFor(inbound, round);
  const breakdown = (Object.entries(digest.byType) as [keyof typeof TYPE_TH, number][]).map(([k, n]) => `${TYPE_TH[k]} ${n}`).join(" · ");
  return (
    <div className="space-y-3">
      {(digest.fresh > 0 || digest.carried > 0 || digest.readyToClose > 0) && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
          วันนี้: ใหม่ {digest.fresh}{breakdown ? ` (${breakdown})` : ""} · ค้าง {digest.carried} · รอปิด {digest.readyToClose}
        </p>
      )}
      <div role="group" aria-label="ตัวกรอง ticket" className="inline-flex rounded-md border p-0.5">
        {[{ v: false, l: "เปิดอยู่" }, { v: true, l: "เสร็จ / ยกเลิก" }].map((o) => (
          <button key={o.l} type="button" aria-pressed={showClosed === o.v} onClick={() => setShowClosed(o.v)}
            className={cn("rounded px-2.5 py-1 text-xs", showClosed === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{o.l}</button>
        ))}
      </div>
      <TicketTable rows={rows} dept={dept} onOpen={setOpenId} />
      {open && <Detail t={open} role={role} dept={dept} onClose={() => setOpenId(null)} />}
    </div>
  );
}

const SEVERITY_DOT: Record<string, string> = { high: "🔴", medium: "🟡", low: "⚪" };

function TicketTable({ rows, dept, onOpen }: { rows: L0Ticket[]; dept: Dept; onOpen: (id: string) => void }) {
  if (!rows.length) return <Empty text="ยังไม่มี ticket" />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr><th className="p-2">#</th><th className="p-2">ประเภท</th><th className="p-2">โรงแรม</th><th className="p-2">สถานะ</th><th className="p-2">สร้างเมื่อ</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.ticket_id} className="border-t hover:bg-muted/40">
              <td className="p-2 font-mono">
                <Button variant="link" size="sm" className="h-auto p-0 font-mono" onClick={() => onOpen(t.ticket_id)}>#{t.ticket_id}</Button>
                {isWatcherOf(t, dept) && <Badge variant="outline" className="ml-1 text-[10px]">👁 FYI</Badge>}
              </td>
              <td className="p-2">{t.payload.severity && <span aria-label={`severity ${t.payload.severity}`} className="mr-1">{SEVERITY_DOT[t.payload.severity]}</span>}{TYPE_TH[t.type]}</td>
              <td className="p-2">{isPsShutoff(t) ? <>ขอปิดระบบ · {t.subject_ref.hotel_name}<ShutoffRowHint t={t} /></> : <>{t.subject_ref.hotel_name} · {t.subject_ref.gap_service}</>}</td>
              <td className="p-2"><Badge variant="secondary">{STATUS_TH[t.status]}</Badge>{t.payload.condition_cleared_at && <Badge variant="outline" className="ml-1 border-warning/50 text-[10px] text-warning-foreground">รอปิด</Badge>}</td>
              <td className="whitespace-nowrap p-2 text-muted-foreground">{fmt(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ t, role, dept, onClose }: { t: L0Ticket; role: Role; dept: Dept; onClose: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const watcher = isWatcherOf(t, dept); // FYI rows are read-only: no status actions.
  const shut = useShutoffActor(t);
  const base = watcher ? [] : allowedNext(t, role);
  // PM Workspace Partner v1.0 §4: PS-side SYSTEM_SHUTOFF moves only for the assigned AE; PM read-only.
  const actions = isPsShutoff(t) ? shut.filter(base, role) : base;
  const isBot = t.created_by === SYSTEM_CREATOR;
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">#{t.ticket_id} · {STATUS_TH[t.status]} <span className="text-xs text-muted-foreground">รุ่น {t.revision}</span></h3>
        <Button variant="ghost" size="sm" onClick={onClose}>ปิด</Button>
      </div>
      {watcher && <p className="rounded-md border px-2 py-1 text-xs text-muted-foreground">👁 FYI — ดูอย่างเดียว แผนก {t.target_dept} เป็นผู้ดำเนินการ</p>}
      {t.payload.unassigned_owner && <p className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs text-warning-foreground">⚠ ยังไม่ได้ระบุผู้ดูแล (AE) — โปรดระบุก่อน</p>}
      <dl className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] gap-1 break-words text-sm">
        <dt className="text-muted-foreground">โรงแรม</dt><dd>{t.subject_ref.hotel_name} ({t.subject_ref.hotel_id})</dd>
        {t.type === "SERVICING_STALL" ? (
          <><dt className="text-muted-foreground">บริการ</dt><dd>{t.subject_ref.service_variant ?? t.subject_ref.service_line}</dd><dt className="text-muted-foreground">ช่วงงาน</dt><dd>{t.payload.phase} · {t.payload.lane} · วันที่ {t.payload.days_in_phase} · {t.payload.phase&&t.payload.days_in_phase!=null?statusText(t.payload.phase,t.payload.days_in_phase):'—'}</dd><dt className="text-muted-foreground">ตอนนี้</dt><dd>{reportStageLabel(t.payload.current_stage??'')}</dd><dt className="text-muted-foreground">ส่งถึง</dt><dd>{t.payload.recipient} {t.payload.recipient_member_id ? "" : "· รอระบุผู้รับ"}</dd></>
        ) : t.type === "CONTRACT_FOLLOWUP" && t.payload.followup ? (
          <>
            <dt className="text-muted-foreground">ดีล</dt><dd>{t.subject_ref.deal_id}</dd>
            <dt className="text-muted-foreground">cohort</dt><dd>{t.payload.followup.cohort_month}</dd>
            <dt className="text-muted-foreground">ตอนนี้</dt><dd>{t.payload.followup.stage_label}{t.payload.followup.substep ? ` · ${t.payload.followup.substep}` : ""}</dd>
            <dt className="text-muted-foreground">ค้าง</dt><dd>{t.payload.followup.days_since_sent_contract} วันนับจากส่งสัญญา</dd>
            <dt className="text-muted-foreground">BD</dt><dd>{t.payload.followup.bd_name ?? "— ยังไม่ระบุ"}</dd>
          </>
        ) : t.type === "CUSTOMER_ENTITY_CHANGE" ? null : (
          <><dt className="text-muted-foreground">บริการที่ขาด</dt><dd>{t.subject_ref.gap_service}</dd></>
        )}
        {t.type !== "CONTRACT_FOLLOWUP" && t.type !== "SERVICING_STALL" && t.type !== "CUSTOMER_ENTITY_CHANGE" && (isBot ? (
          <>
            <dt className="text-muted-foreground">สัญญาณ</dt><dd>{t.payload.note || "—"}</dd>
            <dt className="text-muted-foreground">AE ผู้ดูแล</dt><dd>{t.payload.assigned_ae?.nickname ?? "— ยังไม่ระบุ"}</dd>
            <dt className="text-muted-foreground">ผู้ติดตาม</dt><dd>{t.payload.watchers?.length ? t.payload.watchers.map((w) => `${w.dept} · ${w.nickname}`).join(", ") : "—"}</dd>
            <dt className="text-muted-foreground">รอบที่สร้าง</dt><dd>{t.payload.generated_round ?? "—"}</dd>
          </>
        ) : (
          <>
            <dt className="text-muted-foreground">ความพร้อม</dt><dd>{READY_TH[t.payload.readiness_tier] ?? t.payload.readiness_tier}</dd>
            <dt className="text-muted-foreground">เหตุผล</dt><dd className="flex flex-wrap gap-1">{t.payload.chips.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</dd>
            <dt className="text-muted-foreground">หมายเหตุ</dt><dd>{t.payload.note || "—"}</dd>
          </>
        ))}
        {t.type === "CUSTOMER_ENTITY_CHANGE" && t.payload.entity_change && <><dt className="text-muted-foreground">สิ่งที่เปลี่ยน</dt><dd>{t.payload.entity_change.what} · {t.payload.entity_change.detail}</dd></>}
        {isPsShutoff(t) && <ShutoffDetailRows t={t} actor={shut} role={role} />}
        <dt className="text-muted-foreground">ผู้สร้าง → แผนก</dt><dd>{isBot ? "The Office" : t.created_by} → {t.target_dept}</dd>
      </dl>
      {t.payload.condition_cleared_at && OPEN_STATUSES.includes(t.status) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          <span>คุณดำเนินการเรื่องนี้เรียบร้อยแล้ว · กด Solved ได้เลย</span>
          {!watcher && role === t.target_dept && (
            <Button size="sm" variant="outline" onClick={() => setMsg(transition(t.ticket_id, t.revision, "DONE", role) ? null : "ข้อมูลเปลี่ยนไปแล้ว กรุณาลองใหม่")}>Solved</Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.length === 0 && <span className="text-xs text-muted-foreground">บทบาทนี้เปลี่ยนสถานะไม่ได้</span>}
        {actions.map((s) => (
          <Button key={s} size="sm" variant={s === "CANCELLED" ? "outline" : "default"}
            onClick={() => setMsg(transition(t.ticket_id, t.revision, s, role) ? null : "ข้อมูลเปลี่ยนไปแล้ว กรุณาลองใหม่")}>
            {isBot && s === "DONE" ? "Solved" : STATUS_TH[s]}
          </Button>
        ))}
      </div>
      {msg && <p role="alert" className="text-xs text-warning-foreground">{msg}</p>}
      <TicketAttachments t={t} by={role} readOnly={watcher} />
      <ol className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
        {t.audit.map((a, i) => <li key={i}>{fmt(a.at)} · {a.by === SYSTEM_CREATOR ? "The Office" : a.by} · {a.from_status ? (a.from_status === a.to_status ? "เงื่อนไขหายแล้ว" : STATUS_TH[a.from_status]) : "—"} → {STATUS_TH[a.to_status]}</li>)}
      </ol>
    </div>
  );
}

/** L0 test consumer (PM): create button or read-back badge. Writes only via createTask(). */
function PmTester() {
  const [dept, setDept] = useState<Dept>("BD");
  const [note, setNote] = useState<string | null>(null);
  const [bot, setBot] = useState<BotRunResult | null>(null);
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
      <div className="flex flex-wrap items-center gap-2 border-t pt-2">
        <Button size="sm" variant="outline" onClick={() => setBot(runAlertBot({...demoScanInput(),servicing:demoServicingRows().filter(r=>!r.go_live_at).flatMap(row=>servicingLanes(row,SERVICING_DEMO_NOW).filter(l=>l.state==='running'&&l.tone==='red').map(lane=>({row,lane})))}))}>ประมวลผล Alert (ชั่วคราว)</Button>
        <span className="text-xs text-muted-foreground">BOT สาธิต · สแกนสัญญาณแล้วสร้าง ticket เข้า PM Workspace (เป้าหมาย PS)</span>
      </div>
      {bot && <p className="text-xs text-muted-foreground">ผลรอบ BOT ล่าสุด: สร้าง {bot.created} · ข้าม(ซ้ำ) {bot.skipped} · เงื่อนไขหาย {bot.cleared}</p>}
    </div>
  );
}
