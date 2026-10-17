import type { HotelProfile } from '@/lib/hotel-store';
import { activePortfolioHotels } from '@/lib/portfolio-breakdown';
import { ChartHint } from '@/components/ps/dash-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function PortfolioBreakdown({ hotels, now }: { hotels: HotelProfile[]; now: Date }) {
  return <div className="grid gap-6 lg:grid-cols-2">{(['orm', 'marcom'] as const).map(line => {
    const rows = activePortfolioHotels(hotels, line, now);
    const title = line === 'orm' ? 'ORM' : 'Marcom';
    const groups = [{ title: 'การจดทะเบียน', categories: [['Corporate', rows.filter(r => ['corporate', 'นิติบุคคล'].includes(r.hotel.registration)).length], ['Personal', rows.filter(r => ['personal', 'บุคคลธรรมดา'].includes(r.hotel.registration)).length]] }, ...(line === 'orm' ? [{ title: 'รูปแบบค่าบริการ', categories: [['Flat Rate', rows.filter(r => ['flat', 'fixed'].includes(r.hotel.model)).length], ['Commission', rows.filter(r => r.hotel.model === 'commission').length]] }] : [])];
    return <div key={line} className="min-w-0 space-y-3"><h3 className={`text-sm font-semibold ${line === 'orm' ? 'text-primary' : 'text-series-2'}`}>{title} · {rows.length} โรงแรม</h3>{groups.map(group => <div key={group.title}><p className="mb-1 text-xs font-medium text-muted-foreground">{group.title}</p>{group.categories.map(([label, value]) => {
      const count = Number(value); const percent = rows.length ? count / rows.length * 100 : 0;
      return <ChartHint key={String(label)} header={`${label} · ${count} โรงแรม (${percent.toLocaleString('th-TH', { maximumFractionDigits: 1 })}% ของ ${title} ที่ active)`}><Button variant="ghost" className="grid h-auto w-full grid-cols-[7rem_2rem_minmax(0,1fr)] gap-3 px-0 py-2 text-xs"><span className="text-left">{label}</span><span className="tabular-nums">{count}</span><Progress value={percent} className={`h-1.5 ${line === 'marcom' ? '[&>div]:bg-series-2' : ''}`} /></Button></ChartHint>;
    })}</div>)}{line === 'marcom' && <div><p className="mb-2 text-xs font-medium text-muted-foreground">กลุ่มบริการ</p><div className="relative space-y-3 py-1"><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="w-28">Full Service</span><div className="h-1.5 flex-1 rounded bg-muted" /></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="w-28">Lite Service</span><div className="h-1.5 flex-1 rounded bg-muted" /></div><span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground">รอกำหนดข้อมูล</span></span></div></div>}</div>;
  })}</div>;
}