/* PM Workspace Partner v1.0 §4 — PS-side SYSTEM_SHUTOFF row hint + detail (AE closes; PM read-only). Testing-mode actor only. */
import { useState } from "react";
import { useHrMembers } from "@/lib/hr-members";
import { useWs2 } from "@/lib/ws2-store";
import { STATUS_TH, useTickets, type L0Status, type L0Ticket, type Role } from "@/lib/tickets-l0";
import { getContractSystemCost } from "@/lib/debt-partner-calc";
import { usePartnerData, isPartnerDemo } from "@/lib/debt-partner-store";
import { partnerContracts } from "@/lib/partner-contracts";
import { partnerToday } from "@/lib/partner-todo";
import { shutoffActions, shutoffAe, shutoffTwin } from "@/lib/partner-workspace";

function useAe(t: L0Ticket) {
  const w = useWs2(); const hr = useHrMembers();
  const prop = w.properties.find((p) => p.hotel_id === t.subject_ref.hotel_id);
  const ae = shutoffAe(t, prop?.assigned_ae_id);
  return { id: ae.member_id, nick: ae.nickname ?? hr.nick(ae.member_id), aes: hr.members.filter((m) => m.active && m.function === "AE") };
}
const Amber = ({ children }: { children: React.ReactNode }) => <span className="text-xs font-medium text-warning-foreground">{children}</span>;

export function ShutoffRowHint({ t }: { t: L0Ticket }) {
  const ae = useAe(t);
  return <div className="text-xs" data-testid="shutoff-ae">{ae.id ? <span className="text-muted-foreground">AE ผู้ดูแล {ae.nick ?? ae.id}</span> : <Amber>ยังไม่ได้ระบุผู้ดูแล</Amber>}</div>;
}

export function useShutoffActor(t: L0Ticket) {
  const ae = useAe(t);
  const [member, setMember] = useState<string>("");
  return { ae, member, setMember, filter: (next: L0Status[], role: Role) => shutoffActions(next, role, member || null, ae.id) };
}

export function ShutoffDetailRows({ t, actor, role }: { t: L0Ticket; actor: ReturnType<typeof useShutoffActor>; role: Role }) {
  const all = useTickets();
  const d = usePartnerData();
  const twin = shutoffTwin(all, t);
  const cid = t.subject_ref.contract_id ?? t.payload.contract_id ?? null;
  const c = partnerContracts(d, isPartnerDemo()).find((x) => x.contract_id === cid);
  const cost = c ? getContractSystemCost(d, c, partnerToday()) : null;
  const team = twin?.target_dept === "MARCOM" ? "Marcom" : "ORM";
  const partner = cost?.partner ?? "Partner";
  return (
    <>
      <dt className="text-muted-foreground">สัญญา</dt><dd>{cid ?? "—"}</dd>
      <dt className="text-muted-foreground">ระบบ / Partner</dt><dd>{cost ? `${cost.partner} · ${cost.system}` : <Amber>ยังไม่ระบุระบบ</Amber>}</dd>
      <dt className="text-muted-foreground">ทีม{team}</dt><dd data-testid="shutoff-twin">{twin ? (twin.status === "DONE" ? "เสร็จ" : twin.status === "CANCELLED" ? STATUS_TH.CANCELLED : "กำลังทำ") : "—"}</dd>
      <dt className="text-muted-foreground">AE ผู้ดูแล</dt><dd>{actor.ae.id ? actor.ae.nick ?? actor.ae.id : <Amber>ยังไม่ได้ระบุผู้ดูแล</Amber>}</dd>
      <dt className="text-muted-foreground">งานของ AE</dt>
      <dd><ul className="list-disc pl-4 text-xs"><li>ติดตามทีม ORM / Marcom เคลียร์ข้อมูลบนระบบ</li><li>ส่งอีเมลหา {partner} เพื่อขอปิดระบบ</li></ul></dd>
      <dt className="text-muted-foreground">ผู้ปิด ticket</dt>
      <dd className="space-y-1">
        {role === "PS" ? (
          <label className="flex items-center gap-2 text-xs">สวมบท AE (ทดสอบ)
            <select aria-label="สวมบท AE" className="rounded border bg-background px-1" value={actor.member} onChange={(e) => actor.setMember(e.target.value)}>
              <option value="">— เลือก —</option>{actor.ae.aes.map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
            </select>
          </label>
        ) : <span className="text-xs text-muted-foreground" data-testid="shutoff-pm-hint">AE เป็นผู้ปิด ticket นี้</span>}
      </dd>
    </>
  );
}
