/* Cross-App Assignment & Alerts v1.0 — shared read/write UI over the property-scoped assignment master. Non-gating. */
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ASSIGN_ROLE_LABEL, ORM_TEAMS, canAssign, teamLabel, useHrMembers, type AssignRole, type AssignType, type MemberFunction } from "@/lib/hr-members";
import { STAGE_LABEL, fullSequence, useServicing, type OnboardingCard } from "@/lib/ps-servicing";
import { serviceForVariant, useWs2 } from "@/lib/ws2-store";

const TYPE_LABEL: Record<AssignType, string> = { AE: "AE", SPECIALIST: "Specialist", ORM: "ORM", MARCOM: "Marcom" };
/** v1.1 due rule: true only when the card's current stage is at/after the trigger stage (unknown stages → not due). */
const reached = (card: OnboardingCard, stage: string) => {
  const seq = fullSequence(card.service_variant);
  const target = seq.indexOf(stage);
  const cur = seq.indexOf(card.current_stage === "property_pending" ? "collect_data" : card.current_stage);
  if (target < 0 || cur < 0) return false;
  return cur >= target;
};

export function useAssignments() {
  const s = useServicing();
  const w = useWs2();
  return useMemo(() => {
    const prop = (id: string) => w.properties.find((p) => p.hotel_id === id);
    const profile = (id: string, svc: string) => w.profiles.find((p) => p.property_id === id && p.service === svc);
    const ormDone = (id: string) => { const p = profile(id, "ORM"); return !!(p?.orm_team && p.revenue_member_id && p.ecommerce_member_id); };
    /** Due role slots with completion flag (ORM = 1 slot, complete only with all 3 values). */
    const slotsOf = (card: OnboardingCard): { type: AssignType; done: boolean }[] => {
      const out: { type: AssignType; done: boolean }[] = [];
      const pr = prop(card.property_id);
      if (reached(card, "new_property")) out.push({ type: "AE", done: !!pr?.assigned_ae_id });
      if (reached(card, "final_check")) out.push({ type: "SPECIALIST", done: !!pr?.assigned_specialist_id });
      if (reached(card, "approved")) {
        if (card.service_variant === "ORM") out.push({ type: "ORM", done: ormDone(card.property_id) });
        else out.push({ type: "MARCOM", done: !!profile(card.property_id, serviceForVariant(card.service_variant))?.marcom_member_id });
      }
      return out;
    };
    const pendingOf = (card: OnboardingCard): AssignType[] => slotsOf(card).filter((x) => !x.done).map((x) => x.type);
    const rows = s.cards.map((card) => { const slots = slotsOf(card); return { card, slots, pending: slots.filter((x) => !x.done).map((x) => x.type) }; }).filter((r) => r.pending.length);
    const roleCount = rows.reduce((n, r) => n + r.pending.length, 0);
    return { rows, roleCount, prop, profile, pendingOf, slotsOf };
  }, [s.cards, w.properties, w.profiles]);
}

export function AssignRolePicker() {
  const hr = useHrMembers();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">บทบาทจำลอง
      <select aria-label="Assignment role" className="h-8 rounded-md border bg-background px-2 text-xs text-foreground" value={hr.role} onChange={(e) => hr.setRole(e.target.value as AssignRole)}>
        {(Object.keys(ASSIGN_ROLE_LABEL) as AssignRole[]).map((r) => <option key={r} value={r}>{ASSIGN_ROLE_LABEL[r]}</option>)}
      </select>
    </label>
  );
}

const Missing = () => <span className="font-medium text-warning-foreground">— ยังไม่ระบุ</span>;

/** "ผู้ดูแล Account" block on the card face (reads the property master). */
export function AccountOwners({ card }: { card: OnboardingCard }) {
  const s = useServicing();
  const hr = useHrMembers();
  const a = useAssignments();
  const pr = a.prop(card.property_id);
  const siblings = s.cards.filter((c) => c.property_id === card.property_id);
  const orm = siblings.some((c) => c.service_variant === "ORM") ? a.profile(card.property_id, "ORM") : undefined;
  const hasOrm = siblings.some((c) => c.service_variant === "ORM");
  const mc = siblings.find((c) => c.service_variant !== "ORM");
  const mp = mc ? a.profile(card.property_id, serviceForVariant(mc.service_variant)) : undefined;
  const v = (id: string | null | undefined) => hr.nick(id) ?? <Missing />;
  return (
    <span className="mt-1 block space-y-0.5 border-t pt-1 text-xs text-muted-foreground">
      <span className="block text-[10px] uppercase tracking-wide">ผู้ดูแล Account</span>
      <span className="block">AE: {v(pr?.assigned_ae_id)}</span>
      <span className="block">Specialist: {v(pr?.assigned_specialist_id)}</span>
      {hasOrm && <span className="block">ORM: {orm?.orm_team ? teamLabel(orm.orm_team) : <Missing />} · Rev: {v(orm?.revenue_member_id)} · Ecom: {v(orm?.ecommerce_member_id)}</span>}
      {mc && <span className="block">Marcom: {v(mp?.marcom_member_id)}</span>}
    </span>
  );
}

function AssignDialog({ card, type, onClose }: { card: OnboardingCard; type: AssignType; onClose: () => void }) {
  const hr = useHrMembers();
  const w = useWs2();
  const a = useAssignments();
  const pr = a.prop(card.property_id);
  const svc = type === "ORM" ? "ORM" : serviceForVariant(card.service_variant);
  const pf = a.profile(card.property_id, svc);
  const [team, setTeam] = useState<string>(pf?.orm_team ?? "A");
  const [rev, setRev] = useState<string>(pf?.revenue_member_id ?? "");
  const [ecom, setEcom] = useState<string>(pf?.ecommerce_member_id ?? "");
  const [one, setOne] = useState<string>((type === "AE" ? pr?.assigned_ae_id : type === "SPECIALIST" ? pr?.assigned_specialist_id : pf?.marcom_member_id) ?? "");
  const opts = (fn: MemberFunction, t?: string) => hr.members.filter((m) => m.active && m.function === fn && (!t || m.orm_team === t));
  const allowed = canAssign(hr.role, type);
  const pick = (label: string, value: string, set: (v: string) => void, list: ReturnType<typeof opts>) => (
    <label className="grid gap-1 text-sm">{label}
      <select aria-label={label} className="h-9 rounded-md border bg-background px-2" value={value} disabled={!allowed} onChange={(e) => set(e.target.value)}>
        <option value="">— เลือก —</option>{list.map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
      </select>
    </label>
  );
  const save = () => {
    if (!allowed) return;
    const user = ASSIGN_ROLE_LABEL[hr.role];
    if (type === "ORM") {
      if (!team || !rev || !ecom) { toast.info("ระบุทีม + Revenue + Ecommerce ให้ครบ"); return; }
      w.saveAssignment({ hotel_id: card.property_id, hotel_name: card.property_name, service: "ORM", patch: { orm_team: team, revenue_member_id: rev, ecommerce_member_id: ecom } }, user, "Assignment");
    } else {
      if (!one) { toast.info("เลือกผู้ดูแลก่อนบันทึก"); return; }
      const patch = type === "AE" ? { assigned_ae_id: one } : type === "SPECIALIST" ? { assigned_specialist_id: one } : { marcom_member_id: one };
      w.saveAssignment({ hotel_id: card.property_id, hotel_name: card.property_name, service: type === "MARCOM" ? svc : null, patch }, user, "Assignment");
    }
    toast.success(`บันทึกผู้ดูแล ${TYPE_LABEL[type]} · ${card.property_name}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign — {card.property_name} · {TYPE_LABEL[type]} · {STAGE_LABEL[card.current_stage]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {type === "ORM" ? <>
            <label className="grid gap-1 text-sm">Team
              <select aria-label="Team" className="h-9 rounded-md border bg-background px-2" value={team} disabled={!allowed} onChange={(e) => { setTeam(e.target.value); setRev(""); setEcom(""); }}>
                {ORM_TEAMS.map((t) => <option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
            </label>
            {pick("Revenue member", rev, setRev, opts("ORM_REVENUE", team))}
            {pick("Ecommerce member", ecom, setEcom, opts("ORM_ECOMMERCE", team))}
          </> : pick(type === "AE" ? "AE" : type === "SPECIALIST" ? "On-boarding Specialist" : "Marcom member", one, setOne, opts(type === "AE" ? "AE" : type === "SPECIALIST" ? "ONBOARDING_SPECIALIST" : "MARCOM"))}
          {!allowed && <p className="text-xs text-muted-foreground">บทบาท {ASSIGN_ROLE_LABEL[hr.role]} ดูได้อย่างเดียว</p>}
          <div className="flex justify-end"><Button disabled={!allowed} onClick={save}>Save</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Pending-assignment list. scope PS = all types; ORM / MARCOM = that service's assignment only. */
export function PendingAssignList({ scope }: { scope: "PS" | "ORM" | "MARCOM" }) {
  const hr = useHrMembers();
  const a = useAssignments();
  const [open, setOpen] = useState<{ card: OnboardingCard; type: AssignType } | null>(null);
  const rows = a.rows
    .map((r) => ({ ...r, pending: scope === "PS" ? r.pending : r.pending.filter((t) => t === scope) }))
    .filter((r) => r.pending.length);
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><AssignRolePicker /></div>
      <ul className="divide-y rounded-lg border">
        {rows.map(({ card, pending, slots }) => (
          <li key={card.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="min-w-[10rem] flex-1 font-medium">{card.property_name}</span>
            <Chip tone={card.service_line === "ORM" ? "info" : "muted"}>{card.service_line === "ORM" ? "ORM" : "Marcom"}</Chip>
            <span className="text-xs text-muted-foreground">{STAGE_LABEL[card.current_stage]}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{slots.filter((x) => x.done).length} of {slots.length} roles set</span>
            {pending.map((t) => (
              <Button key={t} size="sm" variant="outline" className="h-7 border-warning text-xs" onClick={() => setOpen({ card, type: t })}>
                {canAssign(hr.role, t) ? `ระบุผู้ดูแล · ${TYPE_LABEL[t]}` : `${TYPE_LABEL[t]} · ยังไม่ระบุ`}
              </Button>
            ))}
          </li>
        ))}
        {!rows.length && <li className="p-6 text-center text-sm text-muted-foreground">ไม่มีงานรอระบุผู้ดูแล</li>}
      </ul>
      {open && <AssignDialog card={open.card} type={open.type} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** PS Dashboard 5th tile + click-through list. */
export function PendingAssignTile() {
  const a = useAssignments();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-warning bg-warning/10 p-4 text-left transition-colors hover:bg-warning/20">
        <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground"><AlertTriangle className="size-3.5" /> รอระบุผู้ดูแล</p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums">{a.rows.length}</p>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>⚠ รอระบุผู้ดูแล · {a.rows.length} การ์ด</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto"><PendingAssignList scope="PS" /></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
