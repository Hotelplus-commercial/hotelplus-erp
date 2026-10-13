import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, Line, Area, ComposedChart, Legend, BarChart, Bar } from 'recharts';
import { Chip } from '@/components/crm/crm-ui';
import { Button } from '@/components/ui/button';
import { useTemplateMgmt } from '@/lib/email-templates';
import { DIM_LABEL, healthOf, latestPeriod, psScope, ratio, type HealthDim, type HealthTier, type PsReport, type PsReportRow, type PsFilter } from '@/lib/ps-dashboard-types';
import { cn } from '@/lib/utils';

const n = (row: PsReportRow, key: string) => Number(row[key] ?? 0);
const fmt = (value: number | null, suffix = '') => value === null ? '—' : `${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })}${suffix}`;
const sum = (rows: PsReportRow[], key: string) => rows.reduce((s, r) => s + n(r, key), 0);
const pending = 'รอ Cloud Sync seed';
function Empty({ text = pending }: { text?: string }) { return <p className="py-7 text-center text-sm text-muted-foreground">{text}</p>; }
function DemoMark() { return <span className="rounded border border-warning/60 bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-warning-foreground">DEMO</span>; }
function Section({ title, children, right, demo }: { title: string; children: ReactNode; right?: ReactNode; demo?: boolean }) { return <section className="min-w-0 border-b pb-6"><header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display text-base font-semibold">{title}{demo && <DemoMark />}</h2>{right}</header>{children}</section>; }
function Metric({ label, value, warn = false, detail }: { label: string; value: string; warn?: boolean; detail?: string }) { return <div className="min-w-0 border-l pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${warn ? 'text-warning-foreground' : 'text-foreground'}`}>{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>; }
function quantile(values: number[], fraction: number) { if (!values.length) return null; const sorted = [...values].sort((a,b) => a-b); const at = (sorted.length-1)*fraction; const lo = sorted[Math.floor(at)], hi = sorted[Math.ceil(at)]; return lo === undefined || hi === undefined ? null : lo + (hi-lo)*(at-Math.floor(at)); }
/** Weighted average via *_sum / *_n when the view provides them; otherwise mean of row values. */
function wavg(rows: PsReportRow[], key: string) { const nn = sum(rows, key + '_n'); if (nn > 0) return sum(rows, key + '_sum') / nn; const r = rows.filter(x => typeof x[key] === 'number'); return r.length ? sum(r, key) / r.length : null; }

const TIER: Record<HealthTier, { dot: string; label: string; order: number }> = {
  high: { dot: '🔴', label: 'High-risk', order: 0 }, watch: { dot: '🟡', label: 'Watch', order: 1 }, healthy: { dot: '🟢', label: 'Healthy', order: 2 }, pending: { dot: '⚪', label: 'รอข้อมูล', order: 3 },
};

export function PsReportTab({ report, filter, loading, error, wonMtd, compareSide }: { report?: PsReport | undefined; filter: PsFilter; loading: boolean; error: boolean; wonMtd?: number | undefined; compareSide?: 'A' | 'B' }) {
  const [groupBy, setGroupBy] = useState<'service_line' | 'ae_owner_id'>('service_line');
  const [tierFilter, setTierFilter] = useState<HealthTier | 'all'>('all');
  const [dimFilter, setDimFilter] = useState<HealthDim | null>(null);
  const navigate = useNavigate();
  const { riskRules } = useTemplateMgmt(); // Governance configuration only; no browser domain data reads.
  const views = report?.views;
  const demo = !!report?.demo;
  const now = report?.now ? new Date(report.now) : new Date();
  const flow = psScope(views?.v_ps_lifecycle_flow ?? [], filter, 'created_at', 0, now);
  const out = psScope(views?.v_ps_lifecycle_flow ?? [], filter, 'inactivated_at', 0, now).filter(row => String(row.inactivated_at) <= now.toISOString());
  const hasFlow = (views?.v_ps_lifecycle_flow ?? []).length > 0;
  const churn = latestPeriod(psScope(views?.v_ps_churn_monthly ?? [], filter, 'billing_period', 0, now));
  const renewals = psScope(views?.v_ps_renewal ?? [], filter, 'renewal_due_date', 0, now);
  const decided = renewals.filter(row => ['RENEWED','NOT_RENEWED','LOST'].includes(String(row.outcome)));
  const renewalSuccess = decided.length ? decided.filter(row => row.outcome === 'RENEWED').length / decided.length * 100 : null;
  const lifetime = psScope(views?.v_ps_contract_lifetime ?? [], filter, 'none', 0, now);
  const ended = lifetime.filter(row => row.status === 'INACTIVE' && typeof row.age_days === 'number');
  const active = lifetime.filter(row => row.status === 'ACTIVE' && typeof row.age_days === 'number');
  const ages = ended.map(row => n(row, 'age_days'));
  const median = quantile(ages, .5), p25 = quantile(ages, .25), p75 = quantile(ages, .75);
  const cohort = psScope(views?.v_ps_onboard_cohort ?? [], filter, 'billing_period', 0, now).sort((a,b) => String(a.billing_period).localeCompare(String(b.billing_period)));
  const attach = psScope(views?.v_ps_attach_rate ?? [], filter, 'none');
  const health = psScope(views?.v_ps_account_health ?? [], filter, 'none');
  const hotels = useMemo(() => [...new Set(health.map(row => String(row.hotel_id)))].map(id => {
    const rows = health.filter(row => row.hotel_id === id);
    const first = rows[0] ?? {};
    const row: PsReportRow = { ...first, completeness: rows.some(r => r.completeness != null && r.completeness !== 'complete') ? 'incomplete' : first.completeness ?? null };
    return { row, ...healthOf(row, riskRules, now) };
  }).sort((a, b) => TIER[a.tier].order - TIER[b.tier].order), [health, riskRules, now.getTime()]);
  const tiered = hotels.filter(h => h.tier !== 'pending');
  const tierCount = (t: HealthTier) => tiered.filter(h => h.tier === t).length;
  const dims = (Object.keys(DIM_LABEL) as HealthDim[]).map(d => ({ d, count: tiered.filter(h => h.dims.includes(d)).length })).sort((a, b) => b.count - a.count);
  const shown = hotels.filter(h => (tierFilter === 'all' || h.tier === tierFilter) && (!dimFilter || h.dims.includes(dimFilter)));
  const groups = [...new Set(renewals.map(row => String(row[groupBy] ?? 'ไม่ระบุ')))];
  const emptyText = loading ? 'กำลังโหลดรายงาน…' : error ? 'อ่านรายงาน PS ไม่ได้ — ลองใหม่อีกครั้ง' : pending;
  const empty = <Empty text={emptyText} />;
  const scatterRows = (rows: PsReportRow[], today: boolean) => rows.map(row => ({ x: (today ? now : new Date(String(row.end_date))).getTime(), y: n(row,'age_days'), contract: row.contract_id }));
  const openProfile = () => navigate({ to: '/ac/hotel-profile' });
  const reconcileOk = wonMtd === undefined || filter.service !== 'ALL' || flow.length === wonMtd;
  return <div className="grid min-w-0 gap-6 lg:grid-cols-2" data-testid="ps-report-tab">
    <Section demo={demo} title="① Lifecycle & Flow">
      {hasFlow ? <div className="grid grid-cols-3 gap-4"><Metric label="In · New Property" value={String(flow.length)} detail={`${new Set(flow.map(row => row.hotel_id)).size} โรงแรม`} /><Metric label="Out · บริการ→Inactive" value={String(out.length)} warn /><Metric label="Pause" value="—" warn detail="รอกลไก Pause ต้นทาง" /></div> : <>{empty}<div className="grid grid-cols-2 gap-4"><Metric label="In / Out" value="— / —" /><Metric label="Pause" value="—" warn detail="รอกลไก Pause ต้นทาง" /></div></>}
      {hasFlow && !reconcileOk && <p className="mt-3 text-xs text-warning-foreground">QA: In ({flow.length}) ≠ Won MTD ({wonMtd})</p>}
      {hasFlow && reconcileOk && wonMtd !== undefined && filter.service === 'ALL' && <p className="mt-3 text-xs text-muted-foreground">In = Won MTD ({wonMtd}) ✓ · In/Out แสดงแยก ไม่หักลบ</p>}
    </Section>
    <Section demo={demo} title="② Churn">
      {churn.length ? <div className="grid grid-cols-2 gap-5"><Metric label="Gross Churn" value={fmt(ratio(churn,'out_count','active_at_start'),'%')} warn detail={`งวด ${String(churn[0]?.billing_period ?? '').slice(0,7)} · Active ณ ต้นงวด ${sum(churn,'active_at_start')}`} />{['ORM','Marcom'].map(line => <Metric key={line} label={line} value={fmt(ratio(churn.filter(row => row.service_line === line),'out_count','active_at_start'),'%')} warn />)}<Metric label="Renewal Churn" value={fmt(decided.length ? (decided.filter(row => row.outcome !== 'RENEWED').length / decided.length * 100) : null,'%')} warn /></div> : empty}
    </Section>
    <Section demo={demo} title="③ Renewal" right={<div className="flex gap-1"><Button size="sm" variant={groupBy === 'service_line' ? 'default' : 'outline'} onClick={() => setGroupBy('service_line')}>บริการ</Button><Button size="sm" variant={groupBy === 'ae_owner_id' ? 'default' : 'outline'} onClick={() => setGroupBy('ae_owner_id')}>AE</Button></div>}>
      {renewals.length ? <><div className="mb-4 grid grid-cols-2 gap-4"><Metric label="รวม · ต่อบริการ" value={String(renewals.length)} /><Metric label="สำเร็จ · เฉพาะผลที่ตัดสินแล้ว" value={fmt(renewalSuccess,'%')} /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">{groupBy === 'service_line' ? 'บริการ' : 'AE'}</th>{['RENEWED','NOT_RENEWED','IN_PROGRESS','LOST'].map(label => <th className="px-2" key={label}>{label}</th>)}<th className="px-2">%สำเร็จ</th></tr></thead><tbody>{groups.map(group => { const g = renewals.filter(row => String(row[groupBy] ?? 'ไม่ระบุ') === group); const gd = g.filter(r => r.outcome !== 'IN_PROGRESS'); return <tr key={group} className="border-t"><td className="py-2">{group}</td>{['RENEWED','NOT_RENEWED','IN_PROGRESS','LOST'].map(outcome => <td key={outcome} className="px-2 tabular-nums">{g.filter(row => row.outcome === outcome).length}</td>)}<td className="px-2 tabular-nums">{fmt(gd.length ? g.filter(r => r.outcome === 'RENEWED').length / gd.length * 100 : null, '%')}</td></tr>; })}</tbody></table></div></> : empty}
    </Section>
    <Section demo={demo} title="④ Contract Lifetime">
      {lifetime.length ? <><div className="mb-3 grid grid-cols-2 gap-4"><Metric label="Median · สัญญาที่สิ้นสุดแล้ว" value={fmt(median,' วัน')} detail={`${ended.length} สัญญา · Active ไม่นับใน median`} /><Metric label="IQR · P25–P75" value={`${fmt(p25)}–${fmt(p75)} วัน`} /></div><div className="h-64 w-full"><ResponsiveContainer><ScatterChart margin={{ left: 0, right: 15, bottom: 5 }}><CartesianGrid stroke="var(--border)" /><XAxis type="number" dataKey="x" domain={['dataMin','dataMax']} tickFormatter={v => new Date(v).toLocaleDateString('th-TH',{month:'short',year:'2-digit'})} /><YAxis type="number" dataKey="y" unit=" วัน" />{p25 !== null && p75 !== null && <ReferenceArea y1={p25} y2={p75} fill="var(--primary)" fillOpacity={.08} />}{median !== null && <ReferenceLine y={median} stroke="var(--primary)" />}<Tooltip labelFormatter={v => String(v)} /><Scatter name="Ended" data={scatterRows(ended,false)} fill="var(--primary)" /><Scatter name="Active · ○ อ้างอิง" data={scatterRows(active,true)} fill="var(--background)" stroke="var(--muted-foreground)" /><Legend /></ScatterChart></ResponsiveContainer></div></> : empty}
    </Section>
    <div className="min-w-0 lg:col-span-2"><Section demo={demo} title="⑤ On-board · Finished Cohort">
      {cohort.length ? <div className="grid gap-6 lg:grid-cols-2"><div className="h-64"><ResponsiveContainer><ComposedChart data={cohort}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="billing_period" tickFormatter={v => String(v).slice(0,7)} /><YAxis unit=" วัน" /><Tooltip /><Area dataKey={row => [row.p25_days, row.p75_days]} name="IQR" fill="var(--primary)" fillOpacity={.1} stroke="none" /><Line type="monotone" dataKey="median_days" name="Median create → Go Live" stroke="var(--primary)" /><Legend /></ComposedChart></ResponsiveContainer></div><div className="h-64"><ResponsiveContainer><BarChart data={cohort}><XAxis dataKey="billing_period" tickFormatter={v => String(v).slice(0,7)} /><YAxis unit=" วัน" /><Tooltip /><Legend />{(['ae_days','specialist_days','orm_days','marcom_days','overall_days'] as const).map((key,i) => <Bar key={key} dataKey={key} name={(['AE Σ','Specialist Σ','ORM Σ','Marcom Σ','Overall'][i] ?? key)} fill={(['var(--primary)','var(--chart-2)','var(--chart-3)','var(--muted-foreground)','var(--chart-4)'][i] ?? 'var(--primary)')} />)}</BarChart></ResponsiveContainer></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-2">{cohort.map(row => <Metric key={String(row.billing_period)} label={`Median ${String(row.billing_period).slice(0,7)}`} value={fmt(typeof row['median_days'] === 'number' ? row['median_days'] : null,' วัน')} />)}{(['ae','specialist','orm','marcom'] as const).map(k => <Metric key={k} label={`Σ ${k === 'ae' ? 'AE' : k === 'specialist' ? 'Specialist' : k === 'orm' ? 'ORM' : 'Marcom'} · เฉลี่ย (ไม่บวกรวม)`} value={fmt(wavg(cohort, k === 'ae' ? 'ae' : k) ?? wavg(cohort, k + '_days'),' วัน')} />)}</div>
        <div className="grid grid-cols-3 gap-4 lg:col-span-2"><Metric label="Survey #1 · เฉลี่ย" value={fmt(wavg(cohort,'survey1'))} /><Metric label="Survey #2 · ดาวเฉลี่ย" value={fmt(wavg(cohort,'survey2'))} /><Metric label="NPS · Promoters / Detractors" value={`${fmt(sum(cohort,'promoters'))} / ${fmt(sum(cohort,'detractors'))}`} /></div></div> : empty}
    </Section></div>
    <Section demo={demo} title="⑥ Off-board"><Empty text="รอ source" /></Section>
    <div className="min-w-0 lg:col-span-2"><Section demo={demo} title="⑦a Risk Scorecard" right={<Button asChild variant="ghost" size="sm"><Link to="/ps/templates">กฎความเสี่ยง<ArrowUpRight className="size-3.5" /></Link></Button>}>
      {tiered.length ? <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><div className="grid gap-4"><Metric label="Attach-rate · โรงแรม ≥2 บริการ" value={fmt(ratio(attach,'attached_hotels','active_hotels'),'%')} /><Metric label="🔴 High-risk / Active" value={`${tierCount('high')} / ${tiered.length}`} /></div>
        <ul className="divide-y rounded-lg border text-sm">{dims.map(({ d, count }) => <li key={d}><button type="button" onClick={() => setDimFilter(dimFilter === d ? null : d)} className={cn('flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted', dimFilter === d && 'bg-muted font-semibold')}><span>{DIM_LABEL[d]}</span><span className="tabular-nums">{count} →</span></button></li>)}<li className="flex items-center justify-between px-3 py-2 text-muted-foreground"><span>Flag</span><span>🔴 รอ Meeting tab</span></li></ul></div> : empty}
    </Section></div>
    {compareSide !== 'B' && <div className="min-w-0 lg:col-span-2"><Section demo={demo} title="⑦b Account Health" right={<div className="flex flex-wrap gap-1">{(['all','high','watch','healthy'] as const).map(t => <Button key={t} size="sm" variant={tierFilter === t ? 'default' : 'outline'} onClick={() => setTierFilter(t)}>{t === 'all' ? 'ทั้งหมด' : `${TIER[t].dot} ${TIER[t].label} ${tierCount(t)}`}</Button>)}</div>}>
      {dimFilter && <p className="mb-2 text-xs text-muted-foreground">กรองด้าน: {DIM_LABEL[dimFilter]} · <button type="button" className="underline" onClick={() => setDimFilter(null)}>ล้าง</button></p>}
      {hotels.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{['โรงแรม','Tier','Grade ล่าสุด / แย่สุด','Survey #2','ด้านเสี่ยง','WS-2','Flag','#svc'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{shown.map(({ row, dims: hit, tier }) => <tr key={String(row.hotel_id)} className="cursor-pointer border-t hover:bg-muted" onClick={openProfile}><td className="px-2 py-3"><span className="inline-flex items-center gap-1 text-primary">{String(row.hotel_name ?? row.hotel_id)}<ArrowUpRight className="size-3 shrink-0" /></span></td><td className="px-2 whitespace-nowrap">{TIER[tier].dot} {TIER[tier].label}</td><td className="px-2">{String(row.latest_grade ?? '—')} / {String(row.worst_grade ?? '—')}</td><td className="px-2">{row.survey2 == null ? '—' : String(row.survey2)}</td><td className="px-2"><div className="flex flex-wrap gap-1">{tier === 'pending' ? <Chip tone="muted">รอข้อมูล</Chip> : hit.length ? hit.map(d => <Chip key={d} tone="warn">{DIM_LABEL[d]}</Chip>) : <Chip tone="muted">ไม่เข้าเกณฑ์</Chip>}</div></td><td className="px-2 text-xs">{String(row.completeness ?? '—')}</td><td className="px-2 text-xs text-muted-foreground">🔴 รอ</td><td className="px-2">{String(row.active_services ?? '—')}</td></tr>)}</tbody></table></div> : empty}
    </Section></div>}
  </div>;
}
