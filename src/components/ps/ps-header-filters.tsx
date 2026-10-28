/* Header R2 §1 — PS Dashboard filter bar: ทีม / คน · search · hotel status · Clear All · DEMO.
 * No period, no Compare, no All/ORM/Marcom, no separate Role/Team/Person (those live per card now).
 * The single picker maps onto the existing lens (service + role + team/person, AND logic). The shared
 * DashboardGlobalFilters component stays untouched for The Office APP › BD-AC. */
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoToggle } from "./dashboard-global-filters";
import { useHrMembers, teamLabel } from "@/lib/hr-members";
import { selFromFilter, selFromValue, selToFilter, selValue } from "@/lib/ps-header-r2";
import type { GlobalFilter } from "@/lib/ps-dashboard-global";

export type PickerOptions = { ormTeams: string[]; marcom: string[]; ae: string[] };
export function usePickerOptions(extra?: Partial<PickerOptions>): PickerOptions {
  const { members } = useHrMembers();
  const active = members.filter((m) => m.active);
  const uniq = (v: string[]) => [...new Set(v.filter(Boolean))];
  return {
    ormTeams: uniq([...active.filter((m) => m.function.startsWith("ORM_")).map((m) => teamLabel(m.orm_team)), ...(extra?.ormTeams ?? [])]),
    marcom: uniq([...active.filter((m) => m.function === "MARCOM").map((m) => m.nickname), ...(extra?.marcom ?? [])]),
    ae: uniq([...active.filter((m) => m.function === "AE").map((m) => m.nickname), ...(extra?.ae ?? [])]),
  };
}

export function PsHeaderFilters({ value: f, onChange, demo, onDemo, options }: { value: GlobalFilter; onChange: (f: GlobalFilter) => void; demo: boolean; onDemo: () => void; options: PickerOptions }) {
  const sel = selFromFilter(f);
  return (
    <section aria-label="ตัวกรอง PS Dashboard" data-testid="ps-header-filters" className="sticky top-[65px] z-20 border-y bg-card/95 px-3 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selValue(sel)} onValueChange={(v) => onChange(selToFilter(selFromValue(v), f))}>
          <SelectTrigger aria-label="ทีม / คน" className="h-9 w-56"><span className="mr-1 text-xs text-muted-foreground">ทีม / คน</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>ORM</SelectLabel>
              <SelectItem value="orm:*">ORM ทั้งหมด</SelectItem>
              {options.ormTeams.map((t) => <SelectItem key={t} value={`orm:${t}`}>{t}</SelectItem>)}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>MARCOM</SelectLabel>
              <SelectItem value="marcom:*">Marcom ทั้งหมด</SelectItem>
              {options.marcom.map((t) => <SelectItem key={t} value={`marcom:${t}`}>{t}</SelectItem>)}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>AE (PS) · ดูแลทั้ง 2 บริการ</SelectLabel>
              {options.ae.map((t) => <SelectItem key={t} value={`ae:${t}`}>{t}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="relative min-w-40 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Hotel search" placeholder="ค้นหาชื่อหรือรหัสโรงแรม" value={f.search} className="h-9 pl-8" onChange={(e) => onChange({ ...f, search: e.target.value })} /></div>
        <Select value={f.hotelStatus} onValueChange={(hotelStatus) => onChange({ ...f, hotelStatus })}>
          <SelectTrigger aria-label="Hotel status" className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{[["all", "สถานะโรงแรม: ทั้งหมด"], ["active", "Active"], ["overdue", "ค้างชำระ 2 เดือน"], ["contract-end", "Contract End"], ["terminated", "Terminate"]].map(([v, l]) => <SelectItem key={v} value={v ?? "all"}>{l}</SelectItem>)}</SelectContent>
        </Select>
        {/* Clear All resets ทีม / คน, search and status only — per-card compare choices are kept. */}
        <Button variant="ghost" size="sm" onClick={() => onChange({ ...selToFilter({ kind: "ALL" }, f), search: "", hotelStatus: "all" })}>Clear All</Button>
        <DemoToggle demo={demo} onDemo={onDemo} />
      </div>
    </section>
  );
}
