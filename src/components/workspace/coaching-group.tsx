/* Workspace Coaching patch v1.0 (WC7–WC11) — 🎯 Coaching group: งานที่ฉันต้องดูแล (supervisor, actionable) + เรื่องที่เกี่ยวกับฉัน (owner, รับทราบ only).
 * Reads only useCoachingTasks(). "สมาชิกที่ดู (DEMO)" picker shows whenever DEMO is on (simulation, never security). */
import { useEffect, useMemo, useState } from "react";
import { setBellViewer } from "@/lib/bell-items";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_DAY } from "@/lib/demo-session";
import { ackCount, ageDays, isAssignee, isOwner, sortTasks } from "@/lib/coaching-routing";
import { ackTask, addTaskNote, flagClosedNote, liveCoachRole, rosterFor, setTaskStatus, useCoachingTasks } from "@/lib/coaching-store";
import type { CoachMember, CoachRole, CoachingStatus, CoachingTask } from "@/lib/coaching-types";
import { COACH_TH } from "@/lib/ps-glossary";

type Scope = "ORM" | "MARCOM" | "AE";
const DEFAULT_VIEWER: Record<Scope, string> = { ORM: "grm", MARCOM: "mk-naen", AE: "ae-boss" };
const FILTERS = [["red", COACH_TH.fRed], ["yellow", COACH_TH.fYellow], ["open", COACH_TH.fOpen], ["closed", COACH_TH.fClosed]] as const;
type FilterKey = (typeof FILTERS)[number][0];

const roleOfMember = (m: CoachMember | undefined): CoachRole | null => (m && (m.kind === "GRM" || m.kind === "PM" || m.kind === "MARCOM_LEAD") ? m.kind : null);
const pickerGroups = (scope: Scope, roster: CoachMember[]) => {
  const g: [string, CoachMember[]][] = [["หัวหน้า / PM", roster.filter((m) => roleOfMember(m))]];
  if (scope !== "AE") { g.push(["ORM", roster.filter((m) => m.kind === "ORM")]); g.push(["Marcom", roster.filter((m) => m.kind === "MARCOM")]); }
  g.push(["AE", roster.filter((m) => m.kind === "AE")]);
  return g;
};

export function MemberPicker({ scope, value, onChange }: { scope: Scope; value: string; onChange: (v: string) => void }) {
  const roster = rosterFor(true);
  return (
    <label className="flex items-center gap-2 text-sm" data-testid="coach-member-picker">
      <span className="text-muted-foreground">{COACH_TH.picker}</span>
      <select aria-label={COACH_TH.picker} className="rounded-md border bg-background px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {pickerGroups(scope, roster).map(([label, ms]) => (
          <optgroup key={label} label={label}>
            {ms.map((m) => <option key={m.id} value={m.id}>{m.name}{m.orm_team ? ` (${m.orm_team === "RE_ACTIVE" ? "Re-active" : `ทีม ${m.orm_team}`})` : ""}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function CoachingGroup({ scope, demo, onlyRule, defaultViewer }: { scope: Scope; demo: boolean; onlyRule?: CoachingTask["rule"]; defaultViewer?: string }) {
  const tasks = useCoachingTasks(demo);
  const [viewer, setViewer] = useState(defaultViewer ?? DEFAULT_VIEWER[scope]);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const roster = rosterFor(demo);
  const me = demo ? roster.find((m) => m.id === viewer) : undefined;
  const v = demo ? { member: me?.id ?? null, role: roleOfMember(me) } : { member: null, role: liveCoachRole() };
  const nameOf = (id: string) => roster.find((m) => m.id === id)?.name ?? id;
  const pass = (t: CoachingTask) => (!onlyRule || t.rule === onlyRule) && (!filter || (filter === "red" ? t.severity === "RED" : filter === "yellow" ? t.severity === "YELLOW" : filter === "open" ? t.status !== "RESOLVED" : t.status === "RESOLVED"));
  const mine = useMemo(() => tasks.filter((t) => isAssignee(t, v) && pass(t)).sort(sortTasks), [tasks, v.member, v.role, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const about = useMemo(() => tasks.filter((t) => isOwner(t, v.member) && pass(t)).sort(sortTasks), [tasks, v.member, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = demo ? `${DEMO_DAY.slice(0, 10)}T09:00:00+07:00` : new Date().toISOString();
  const showMine = scope !== "AE" || v.role === "PM";
  // Service SLA Core v1.0: in DEMO the picked member is also the bell viewer (USER items + their role + this Workspace queue).
  useEffect(() => { if (!demo || scope === "AE") return; setBellViewer({ id: `member:${viewer}`, users: [viewer], roles: v.role ? [v.role] : [], depts: [scope] }); }, [demo, viewer, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-3 rounded-lg border p-3" data-testid="coaching-group">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">🎯 Coaching</h3>
        {demo && <MemberPicker scope={scope} value={viewer} onChange={setViewer} />}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="ตัวกรอง Coaching">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(filter === k ? null : k)}
            className={cn("rounded-full border px-2.5 py-0.5 text-xs", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{label}</button>
        ))}
      </div>
      {showMine && <TaskList title={COACH_TH.mine} testid="coach-mine" rows={mine} nameOf={nameOf} now={now} demo={demo} mode="assignee" actor={v} actorName={me?.name ?? (v.role ?? "")} />}
      <TaskList title={COACH_TH.about} testid="coach-about" rows={about} nameOf={nameOf} now={now} demo={demo} mode="owner" actor={v} actorName={me?.name ?? ""} />
    </section>
  );
}

const STATUS_LABEL: Record<CoachingStatus, string> = { OPEN: COACH_TH.sOpen, IN_COACHING: COACH_TH.sCoaching, RESOLVED: COACH_TH.sClosed };

function TaskList({ title, testid, rows, nameOf, now, demo, mode, actor, actorName }: {
  title: string; testid: string; rows: CoachingTask[]; nameOf: (id: string) => string; now: string; demo: boolean;
  mode: "assignee" | "owner"; actor: { member: string | null; role: CoachRole | null }; actorName: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-1.5" data-testid={testid}>
      <h4 className="text-xs font-medium text-muted-foreground">{title} ({rows.length})</h4>
      {rows.length === 0 ? <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">{COACH_TH.empty}</p> : (
        <ul className="divide-y rounded-md border">
          {rows.map((t) => {
            const a = ackCount(t); const closedNote = flagClosedNote(t, demo);
            const acked = !!actor.member && !!t.owner_ack_at[actor.member];
            return (
              <li key={t.id} className="space-y-1 p-2 text-sm" data-testid="coach-row">
                <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <span aria-label={t.severity === "RED" ? COACH_TH.fRed : COACH_TH.fYellow} className={cn("inline-block size-2.5 shrink-0 rounded-full", t.severity === "RED" ? "bg-destructive" : "bg-warning")} />
                  <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t.service === "ORM" ? "ORM" : "Marcom"}</Badge>
                  <span className="text-xs text-muted-foreground">{t.card_month}</span>
                  <span className="text-xs">{STATUS_LABEL[t.status]}</span>
                  <span className="text-xs text-muted-foreground" data-testid="coach-ack">{COACH_TH.acked(a.n, a.total)}</span>
                  <span className="text-xs text-muted-foreground">{ageDays(t, now)} วัน</span>
                </button>
                <p className="text-xs text-muted-foreground">{t.hotel} · {COACH_TH.owner}: {t.owner_member_ids.length ? t.owner_member_ids.map(nameOf).join(" · ") : "—"} · {COACH_TH.assignee}: {t.assignee_member_id ? nameOf(t.assignee_member_id) : COACH_TH.roleName[t.assignee_role]}</p>
                {closedNote && <p className="text-xs font-medium text-success" data-testid="coach-flag-closed">{closedNote}</p>}
                {open === t.id && (
                  <div className="space-y-2 rounded-md bg-muted/40 p-2 text-xs">
                    <p>{t.hotel} · {t.service === "ORM" ? "ORM" : "Marcom"} · {t.card_month} · {t.topics.join(", ")}</p>
                    <p className="flex flex-wrap gap-3">
                      <Link to="/ps/ae-workspace/meetings" className="text-primary underline">{COACH_TH.meetingLink}</Link>
                      <Link to="/ps/ae-workspace/surveys" className="text-primary underline">{COACH_TH.surveyLink}</Link>
                      <Link to="/ps" hash="contract-health" className="text-primary underline">{COACH_TH.healthLink}</Link>
                    </p>
                    {t.notes.length > 0 && <ul className="space-y-0.5">{t.notes.map((n, i) => <li key={i}>• {n.by}: {n.text}</li>)}</ul>}
                    {mode === "assignee" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select aria-label="สถานะ Coaching" className="rounded border bg-background px-1 py-0.5" value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value as CoachingStatus, actor, demo)}>
                          {(Object.keys(STATUS_LABEL) as CoachingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                        <input aria-label="บันทึก Coaching" className="min-w-40 flex-1 rounded border bg-background px-1 py-0.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder={COACH_TH.notePh} />
                        <Button size="sm" variant="outline" onClick={() => { if (addTaskNote(t.id, note, actorName || "—", demo)) setNote(""); }}>{COACH_TH.addNote}</Button>
                        {t.status !== "RESOLVED" && <Button size="sm" onClick={() => setTaskStatus(t.id, "RESOLVED", actor, demo)}>{COACH_TH.close}</Button>}
                      </div>
                    ) : null}
                  </div>
                )}
                {mode === "owner" && (
                  <div className="flex items-center gap-2">
                    {acked ? <span className="text-xs text-success">{COACH_TH.ackDone}</span> : <Button size="sm" variant="outline" data-testid="coach-ack-btn" onClick={() => actor.member && ackTask(t.id, actor.member, demo)}>{COACH_TH.ack}</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
