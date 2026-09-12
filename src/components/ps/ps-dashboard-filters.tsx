import { Search, X } from "lucide-react";
import { useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aeDirectory,
  allPeople,
  marcomDirectory,
  ormTeams,
  type AssignmentFilter,
} from "@/lib/ps-renewal";

type Role = AssignmentFilter["role"];

const teamOptions: Record<Role, string[]> = {
  none: [],
  AE: aeDirectory,
  ORM: ormTeams,
  Marcom: marcomDirectory,
};

function MultiSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  searchable,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = searchable
    ? options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-9">
          {label}
          {value.length ? ` (${value.length})` : ""} ▼
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {disabled ? (
          <p className="p-2 text-xs text-muted-foreground">Select role first</p>
        ) : (
          <>
            {searchable && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหาชื่อ"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}
            <ul className="max-h-56 overflow-y-auto">
              {shown.map((o) => (
                <li key={o}>
                  <label className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs hover:bg-muted">
                    <Checkbox
                      checked={value.includes(o)}
                      onCheckedChange={() =>
                        onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])
                      }
                    />
                    {o}
                  </label>
                </li>
              ))}
              {!shown.length && (
                <li className="px-1.5 py-2 text-xs text-muted-foreground">ไม่พบรายชื่อ</li>
              )}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PsDashboardFilters({
  value,
  onChange,
}: {
  value: AssignmentFilter;
  onChange: (v: AssignmentFilter) => void;
}) {
  const { role, teams, people } = value;
  const setRole = (r: Role) => onChange({ role: r, teams: [], people });
  const setTeams = (t: string[]) => onChange({ ...value, teams: t });
  const setPeople = (p: string[]) => onChange({ ...value, people: p });


  const active = [
    ...(role !== "none" ? [`Role: ${role}`] : []),
    ...teams.map((t) => `Team: ${t}`),
    ...people.map((p) => `Person: ${p}`),
  ];

  return (
    <Panel
      title="Filters"
      subtitle="Role + Team + Person รวมกันแบบ AND — โรงแรมจะแสดงเมื่อผู้รับผิดชอบตรงทุกเงื่อนไข"
      right={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange({ role: "none", teams: [], people: [] })}
        >
          Clear All
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as Role);
            setTeams([]);
          }}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Role: ทั้งหมด</SelectItem>
            <SelectItem value="AE">AE</SelectItem>
            <SelectItem value="ORM">ORM</SelectItem>
            <SelectItem value="Marcom">Marcom</SelectItem>
          </SelectContent>
        </Select>

        <MultiSelect
          label="Team"
          options={teamOptions[role]}
          value={teams}
          onChange={setTeams}
          disabled={role === "none"}
        />

        <MultiSelect label="Person" options={allPeople} value={people} onChange={setPeople} searchable />

        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {active.map((a) => (
              <Chip key={a} tone="info">
                {a}
              </Chip>
            ))}
          </div>
        )}
        {!active.length && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <X className="size-3" /> ยังไม่มีตัวกรอง — แสดงทุกโรงแรมตามสิทธิ์ของผู้ใช้
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Dropdown ของ Team ขึ้นกับ Role ที่เลือก (AE = รายบุคคล · ORM = 6 ทีม · Marcom = 4 คน) และ
        sync อัตโนมัติเมื่อ ORM App เพิ่มทีมหรือ Marcom App เพิ่มคน
      </p>
    </Panel>
  );
}
