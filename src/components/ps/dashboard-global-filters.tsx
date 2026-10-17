import { ArrowLeftRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from './ps-dashboard-filters';
import { useHrMembers, teamLabel } from '@/lib/hr-members';
import { monthPeriod, type GlobalFilter, type Period } from '@/lib/ps-dashboard-global';

const ranges = { mtd: 'เดือนนี้', '3m': '3 เดือน', '6m': '6 เดือน', '12m': '12 เดือน', all: 'ทั้งหมด' };
const presets = { month: 'This month vs last month', previous: 'Last month vs 2 months ago', quarter: 'This quarter vs last quarter', year: 'This year vs last year', custom: 'Custom (pick A, pick B)' };
export function DashboardGlobalFilters({ value: f, onChange, demo, onDemo, now }: { value: GlobalFilter; onChange: (f: GlobalFilter) => void; demo: boolean; onDemo: () => void; now: Date }) {
  const { members } = useHrMembers();
  const active = members.filter(m => m.active);
  const roleMembers = active.filter(m => f.role === 'AE' ? m.function === 'AE' : f.role === 'ORM' ? m.function.startsWith('ORM_') : f.role === 'Marcom' ? m.function === 'MARCOM' : true);
  const teams = f.role === 'ORM' ? [...new Set(roleMembers.map(m => teamLabel(m.orm_team)).filter(Boolean))] : roleMembers.map(m => m.nickname);
  const people = active.map(m => m.nickname);
  const setPreset = (preset: string) => {
    if (preset === 'custom') return;
    let a = monthPeriod(now), b = monthPeriod(now, -1);
    if (preset === 'previous') { a = monthPeriod(now,-1); b = monthPeriod(now,-2); }
    if (preset === 'quarter') { const end = 2 - now.getUTCMonth() % 3; a = monthPeriod(now,end,3); b = monthPeriod(now,end-3,3); }
    if (preset === 'year') { a = { from: `${now.getUTCFullYear()}-01-01`, to: `${now.getUTCFullYear()}-12-31` }; b = { from: `${now.getUTCFullYear()-1}-01-01`, to: `${now.getUTCFullYear()-1}-12-31` }; }
    onChange({ ...f, periodA: a, periodB: b });
  };
  const periodPicker = (label: 'A' | 'B', period: Period) => <fieldset className="flex flex-wrap items-center gap-1.5"><legend className="sr-only">Period {label}</legend><span className="text-xs font-semibold">Period {label}</span><Input type="date" aria-label={`Period ${label} start`} value={period.from} max={period.to} className="h-9 w-[142px] text-xs" onChange={e => { if (e.target.value && e.target.value <= period.to) onChange({ ...f, [label === 'A' ? 'periodA' : 'periodB']: { ...period, from: e.target.value } }); }} /><span className="text-muted-foreground">–</span><Input type="date" aria-label={`Period ${label} end`} value={period.to} min={period.from} className="h-9 w-[142px] text-xs" onChange={e => { if (e.target.value && e.target.value >= period.from) onChange({ ...f, [label === 'A' ? 'periodA' : 'periodB']: { ...period, to: e.target.value } }); }} /></fieldset>;
  return <section aria-label="Global dashboard filters" data-testid="global-filters" className="sticky top-[65px] z-20 space-y-2 border-y bg-card/95 px-3 py-3 backdrop-blur">
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Service" className="flex gap-1">{(['ALL','ORM','Marcom'] as const).map(s => <Button key={s} size="sm" variant={f.service === s ? 'default' : 'ghost'} aria-pressed={f.service === s} onClick={() => onChange({ ...f, service:s })}>{s === 'ALL' ? 'All' : s}</Button>)}</div>
      <Select value={f.role} onValueChange={role => onChange({ ...f, role: role as GlobalFilter['role'], teams: [] })}><SelectTrigger aria-label="Role" className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent>{(['none','PM','AE','ORM','Marcom'] as const).map(r => <SelectItem key={r} value={r}>{r === 'none' ? 'Role: ทั้งหมด' : r}</SelectItem>)}</SelectContent></Select>
      <MultiSelect label="Team" options={teams} value={f.teams} disabled={f.role === 'none'} onChange={t => onChange({ ...f, teams:t })} />
      <MultiSelect label="Person" options={people} value={f.people} searchable onChange={p => onChange({ ...f, people:p })} />
      <div className="relative min-w-40 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Hotel search" placeholder="ค้นหาชื่อหรือรหัสโรงแรม" value={f.search} className="h-9 pl-8" onChange={e => onChange({ ...f, search:e.target.value })} /></div>
      <Select value={f.hotelStatus} onValueChange={hotelStatus => onChange({ ...f, hotelStatus })}><SelectTrigger aria-label="Hotel status" className="h-9 w-44"><SelectValue /></SelectTrigger><SelectContent>{[['all','สถานะโรงแรม: ทั้งหมด'],['active','Active'],['overdue','ค้างชำระ 2 เดือน'],['contract-end','Contract End'],['terminated','Terminate']].map(([v,l]) => <SelectItem key={v} value={v ?? 'all'}>{l}</SelectItem>)}</SelectContent></Select>
      <Button variant="ghost" size="sm" onClick={() => onChange({ ...f, service:'ALL',role:'none',teams:[],people:[],search:'',hotelStatus:'all',range:'6m',compare:false })}>Clear All</Button>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t pt-2">
      {!f.compare ? <Select value={f.range} onValueChange={range => onChange({ ...f, range:range as GlobalFilter['range'] })}><SelectTrigger aria-label="Time range" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ranges).map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select> : <><Select defaultValue="month" onValueChange={setPreset}><SelectTrigger aria-label="Compare preset" className="h-9 w-64"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(presets).map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>{periodPicker('A', f.periodA)}<span className="text-xs text-muted-foreground">vs</span>{periodPicker('B', f.periodB)}</>}
      <label className="flex items-center gap-2 text-sm"><ArrowLeftRight className="size-4 text-muted-foreground" />Compare<Switch aria-label="Compare" checked={f.compare} onCheckedChange={compare => onChange({ ...f, compare, ...(!f.compare ? { periodA:monthPeriod(now), periodB:monthPeriod(now,-1) } : {}) })} /></label>
      <Button variant={demo ? 'default' : 'outline'} size="sm" className="ml-auto" aria-pressed={demo} onClick={onDemo}>ดูข้อมูลตัวอย่าง (DEMO){demo ? ' · เปิด' : ''}</Button>
    </div>
    {(f.role !== 'none' || f.teams.length > 0 || f.people.length > 0) && <p className="text-xs text-muted-foreground">{[f.role !== 'none' ? f.role : '',...f.teams,...f.people].filter(Boolean).join(' · ')} · AND</p>}
  </section>;
}