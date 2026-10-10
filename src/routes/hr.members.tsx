import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { AssignRolePicker } from "@/components/ps/assignment-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FUNCTION_LABEL, ORM_TEAMS, teamLabel, useHrMembers, type HrMember, type MemberFunction, type OrmTeam } from "@/lib/hr-members";

const description = "HR App · Members: รายชื่อทีมงานกลาง (ชื่อเล่น · หน้าที่ · ทีม ORM) ที่ทุกแอปใช้ในการระบุผู้ดูแลโรงแรม";

export const Route = createFileRoute("/hr/members")({
  head: () => ({
    meta: [
      { title: "Members — HR App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "Members — HR App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembersPage,
});

const isOrm = (f: MemberFunction) => f === "ORM_REVENUE" || f === "ORM_ECOMMERCE";

function MembersPage() {
  const hr = useHrMembers();
  const canEdit = hr.role === "HR_ADMIN";
  const [nick, setNick] = useState("");
  const [fn, setFn] = useState<MemberFunction>("AE");
  const [team, setTeam] = useState<OrmTeam>("A");
  const add = () => {
    const r = hr.upsert({ nickname: nick, function: fn, orm_team: isOrm(fn) ? team : null, active: true });
    if (!r.ok) { toast.info(r.error); return; }
    setNick(""); toast.success("เพิ่มสมาชิกแล้ว");
  };
  const toggle = (m: HrMember) => { const r = hr.upsert({ ...m, active: !m.active }); if (!r.ok) toast.info(r.error); };
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="HR App · Members" title="Members" description={description} actions={<AssignRolePicker />} />
      {canEdit && (
        <Panel title="เพิ่มสมาชิก" subtitle="HR / Admin เท่านั้น">
          <div className="flex flex-wrap gap-2">
            <Input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="ชื่อเล่น" className="h-9 w-40" />
            <select aria-label="Function" className="h-9 rounded-md border bg-background px-2 text-sm" value={fn} onChange={(e) => setFn(e.target.value as MemberFunction)}>
              {(Object.keys(FUNCTION_LABEL) as MemberFunction[]).map((f) => <option key={f} value={f}>{FUNCTION_LABEL[f]}</option>)}
            </select>
            {isOrm(fn) && <select aria-label="ORM team" className="h-9 rounded-md border bg-background px-2 text-sm" value={team} onChange={(e) => setTeam(e.target.value as OrmTeam)}>{ORM_TEAMS.map((t) => <option key={t} value={t}>{teamLabel(t)}</option>)}</select>}
            <Button size="sm" className="h-9" onClick={add}>เพิ่ม</Button>
          </div>
        </Panel>
      )}
      <Panel title={`รายชื่อ · ${hr.members.length}`} subtitle={canEdit ? "ปิดใช้งานแล้วการระบุเดิมยังคงอยู่" : "อ่านอย่างเดียว · เปลี่ยนบทบาทเป็น HR / Admin เพื่อแก้ไข"}>
        <ul className="divide-y rounded-lg border">
          {hr.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className={`min-w-[8rem] flex-1 font-medium ${m.active ? "" : "text-muted-foreground line-through"}`}>{m.nickname}</span>
              <Chip tone="muted">{FUNCTION_LABEL[m.function]}</Chip>
              {m.orm_team && <span className="text-xs text-muted-foreground">{teamLabel(m.orm_team)}</span>}
              {!m.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
              {canEdit && <Button size="sm" variant="ghost" onClick={() => toggle(m)}>{m.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</Button>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
