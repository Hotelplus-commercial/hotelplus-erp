import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, Line, Area, ComposedChart, Legend, BarChart, Bar } from 'recharts';
import { Chip } from '@/components/crm/crm-ui';
import { Button } from '@/components/ui/button';
import { useTemplateMgmt } from '@/lib/email-templates';
import { psScope, ratio, riskReasons, type PsReport, type PsReportRow, type PsFilter } from '@/lib/ps-dashboard-types';

const n = (row: PsReportRow, key: string) => Number(row[key] ?? 0);
const fmt = (value: number | null, suffix = '') => value === null ? '—' : `${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })}${suffix}`;
const sum = (rows: PsReportRow[], key: string) => rows.reduce((s, r) => s + n(r, key), 0);
const pending = 'รอ Cloud Sync seed';
function Empty({ text = pending }: { text?: string }) { return <p className="py-7 text-center text-sm text-muted-foreground">{text}</p>; }
function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) { return <section className="min-w-0 border-b pb-6"><header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-base font-semibold">{title}</h2>{right}</header>{children}</section>; }
function Metric({ label, value, warn = false, detail }: { label: string; value: string; warn?: boolean; detail?: string }) { return <div className="min-w-0 border-l pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${warn ? 'text-warning-foreground' : 'text-foreground'}`}>{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>; }
function quantile(values: number[], fraction: number) { if (!values.length) return null; const sorted = [...values].sort((a,b) => a-b); const at = (sorted.length-1)*fraction; const lo = sorted[Math.floor(at)], hi = sorted[Math.ceil(at)]; return lo === undefined || hi === undefined ? null : lo + (hi-lo)*(at-Math.floor(at)); }

export function PsReportTab({ report, filter, loading, error }: { report?: PsReport; filter: PsFilter; loading: boolean; error: boolean }) {
  const [groupBy, setGroupBy] = useState<'service_line' | 'ae_owner_id'>('service_line');
  const { riskRules } = useTemplateMgmt(); // Governance configuration only; no browser domain data reads.
  const views = report?.views;
  const flow = psScope(views?.v_ps_lifecycle_flow ?? [], filter, 'created_at');
  const allContracts = psScope(views?.v_ps_lifecycle_flow ?? [], filter, 'none');
  const churn = psScope(views?.v_ps_churn_monthly ?? [], filter);
  const renewals = psScope(views?.v_ps_renewal ?? [], filter, 'renewal_due_date');
  const decided = renewals.filter(row => ['RENEWED','NOT_RENEWED','LOST'].includes(String(row.outcome)));
  const renewalSuccess = decided.length ? decided.filter(row => row.outcome === 'RENEWED').length / decided.length * 100 : null;
  const lifetime = psScope(views?.v_ps_contract_lifetime ?? [], filter, 'end_date');
  const ended = lifetime.filter(row => row.status === 'INACTIVE' && typeof row.age_days === 'number');
  const active = lifetime.filter(row => row.status === 'ACTIVE' && typeof row.age_days === 'number');
  const ages = ended.map(row => n(row, 'age_days'));
  const median = quantile(ages, .5), p25 = quantile(ages, .25), p75 = quantile(ages, .75);
  const cohort = psScope(views?.v_ps_onboard_cohort ?? [], filter).sort((a,b) => String(a.billing_period).localeCompare(String(b.billing_period)));
  const attach = psScope(views?.v_ps_attach_rate ?? [], filter, 'none');
  const health = psScope(views?.v_ps_account_health ?? [], filter, 'none');
  const hotels = useMemo(() => [...new Set(health.map(row => String(row.hotel_id)))].map((id): PsReportRow | null => {
    const rows = health.filter(row => row.hotel_id === id);
    const first = rows[0];
    if (!first) return null;
    // Hotel display groups only health rows, never lifecycle/churn/renewal events.
    return { ...first, completeness: [...new Set(rows.map(row => String(row.completeness ?? '—')))].join(' / ') };
  }).filter((row): row is PsReportRow => row !== null), [health]);
  const groups = [...new Set(renewals.map(row => String(row[groupBy] ?? 'ไม่ระบุ')))];
  const emptyText = loading ? 'กำลังโหลดรายงาน…' : error ? 'อ่านรายงาน PS ไม่ได้ — ลองใหม่อีกครั้ง' : pending;
  const empty = <Empty text={emptyText} />;
  const out = psScope(views?.v_ps_lifecycle_flow ?? [], filter, 'inactivated_at').filter(row => row.inactivated_at && String(row.inactivated_at) <= new Date().toISOString());
  const scatterRows = (rows: PsReportRow[], today: boolean) => rows.map(row => ({ x: new Date(today ? new Date().toISOString() : String(row.end_date)).getTime(), y: n(row,'age_days'), contract: row.contract_id }));
  return <div className="grid min-w-0 gap-6 lg:grid-cols-2" data-testid="ps-report-tab">
    <Section title="① Lifecycle & Flow">
      {allContracts.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Metric label="Active · บริการ" value={String(allContracts.filter(row => row.status === 'ACTIVE').length)} /><Metric label="Pause" value="—" warn detail="รอกลไก Pause ต้นทาง" /><Metric label="Inactive · บริการ" value={String(allContracts.filter(row => row.status === 'INACTIVE').length)} /><Metric label="In · New Property" value={String(flow.length)} detail={`${new Set(flow.map(row => row.hotel_id)).size} โรงแรม`} /><Metric label="Out · สิ้นสุดบริการ" value={String(out.length)} warn /></div> : <>{empty}<div className="grid grid-cols-2 gap-4"><Metric label="Pause" value="—" warn detail="รอกลไก Pause ต้นทาง" /><Metric label="In / Out" value="— / —" /></div></>}
    </Section>
    <Section title="② Churn">
      {churn.length ? <div className="grid grid-cols-2 gap-5"><Metric label="Gross Churn" value={fmt(ratio(churn,'out_count','active_at_start'),'%')} warn detail="บริการที่ Active ณ ต้นช่วงเวลา" />{['ORM','Marcom'].map(line => <Metric key={line} label={line} value={fmt(ratio(churn.filter(row => row.service_line === line),'out_count','active_at_start'),'%')} warn />)}<Metric label="Renewal Churn" value={fmt(decided.length ? (decided.filter(row => row.outcome !== 'RENEWED').length / decided.length * 100) : null,'%')} warn /></div> : empty}
    </Section>
    <Section title="③ Renewal" right={<div className="flex gap-1"><Button size="sm" variant={groupBy === 'service_line' ? 'default' : 'outline'} onClick={() => setGroupBy('service_line')}>บริการ</Button><Button size="sm" variant={groupBy === 'ae_owner_id' ? 'default' : 'outline'} onClick={() => setGroupBy('ae_owner_id')}>AE</Button></div>}>
      {renewals.length ? <><div className="mb-4 grid grid-cols-2 gap-4"><Metric label="รวม · ต่อบริการ" value={String(renewals.length)} /><Metric label="สำเร็จ · เฉพาะผลที่ตัดสินแล้ว" value={fmt(renewalSuccess,'%')} /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">{groupBy === 'service_line' ? 'บริการ' : 'AE'}</th>{['RENEWED','NOT_RENEWED','IN_PROGRESS','LOST'].map(label => <th className="px-2" key={label}>{label}</th>)}</tr></thead><tbody>{groups.map(group => <tr key={group} className="border-t"><td className="py-2">{group}</td>{['RENEWED','NOT_RENEWED','IN_PROGRESS','LOST'].map(outcome => <td key={outcome} className="px-2 tabular-nums">{renewals.filter(row => String(row[groupBy] ?? 'ไม่ระบุ') === group && row.outcome === outcome).length}</td>)}</tr>)}</tbody></table></div></> : empty}
    </Section>
    <Section title="④ Contract Lifetime">
      {lifetime.length ? <><div className="mb-3 grid grid-cols-2 gap-4"><Metric label="Median · สัญญาที่สิ้นสุดแล้ว" value={fmt(median,' วัน')} /><Metric label="IQR · P25–P75" value={`${fmt(p25)}–${fmt(p75)} วัน`} /></div><div className="h-64 w-full"><ResponsiveContainer><ScatterChart margin={{ left: 0, right: 15, bottom: 5 }}><CartesianGrid stroke="var(--border)" /><XAxis type="number" dataKey="x" domain={['dataMin','dataMax']} tickFormatter={v => new Date(v).toLocaleDateString('th-TH',{month:'short',year:'2-digit'})} /><YAxis type="number" dataKey="y" unit=" วัน" />{p25 !== null && p75 !== null && <ReferenceArea y1={p25} y2={p75} fill="var(--primary)" fillOpacity={.08} />}{median !== null && <ReferenceLine y={median} stroke="var(--primary)" />}<Tooltip labelFormatter={v => String(v)} /><Scatter name="Ended" data={scatterRows(ended,false)} fill="var(--primary)" /><Scatter name="Active · อ้างอิง" data={scatterRows(active,true)} fill="var(--background)" stroke="var(--muted-foreground)" /><Legend /></ScatterChart></ResponsiveContainer></div></> : empty}
    </Section>
    <div className="min-w-0 lg:col-span-2"><Section title="⑤ On-board · Finished Cohort">
      {cohort.length ? <div className="grid gap-6 lg:grid-cols-2"><div className="h-64"><ResponsiveContainer><ComposedChart data={cohort}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="billing_period" tickFormatter={v => String(v).slice(0,7)} /><YAxis unit=" วัน" /><Tooltip /><Area dataKey={row => [row.p25_days, row.p75_days]} name="IQR" fill="var(--primary)" fillOpacity={.1} stroke="none" /><Line type="monotone" dataKey="median_days" name="Median create → Go Live" stroke="var(--primary)" /><Legend /></ComposedChart></ResponsiveContainer></div><div className="h-64"><ResponsiveContainer><BarChart data={cohort}><XAxis dataKey="billing_period" tickFormatter={v => String(v).slice(0,7)} /><YAxis unit=" วัน" /><Tooltip /><Legend />{(['ae_days','specialist_days','orm_days','marcom_days','overall_days'] as const).map((key,i) => <Bar key={key} dataKey={key} name={['AE Σ','Specialist Σ','ORM Σ','Marcom Σ','Overall'][i]} fill={['var(--primary)','var(--chart-2)','var(--chart-3)','var(--muted-foreground)','var(--chart-4)'][i]} />)}</BarChart></ResponsiveContainer></div><div className="grid grid-cols-3 gap-4 lg:col-span-2">{['survey1','survey2'].map(key => { const rows = cohort.filter(row => typeof row[key] === 'number'); return <Metric key={key} label={key === 'survey1' ? 'Survey #1 · เฉลี่ย' : 'Survey #2 · ดาวเฉลี่ย'} value={fmt(rows.length ? sum(rows,key)/rows.length : null)} />; })}<Metric label="NPS · Promoters / Detractors" value={`${fmt(sum(cohort,'promoters'))} / ${fmt(sum(cohort,'detractors'))}`} /></div></div> : empty}
    </Section></div>
    <Section title="⑥ Off-board"><Empty text="รอ source" /></Section>
    <Section title="⑦ Account Health · Attach-rate" right={<Button asChild variant="ghost" size="sm"><Link to="/ps/templates">กฎความเสี่ยง<ArrowUpRight className="size-3.5" /></Link></Button>}>
      <Metric label="โรงแรมที่มี ≥2 Active services" value={fmt(ratio(attach,'attached_hotels','active_hotels'),'%')} />
      {!attach.length && <p className="mt-1 text-xs text-muted-foreground">{pending}</p>}
      {hotels.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[580px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{['โรงแรม','Grade ล่าสุด / แย่สุด','Survey #2','ความเสี่ยง','WS-2','Flag','#svc'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{hotels.map(row => { const reasons = riskReasons(row,riskRules); const hasAll = row.worst_grade != null && row.monthly_survey_score != null && row.monthly_billing != null; return <tr key={String(row.hotel_id)} className="border-t"><td className="px-2 py-3"><Button asChild variant="link" size="sm" className="h-auto justify-start whitespace-normal px-0 text-left"><Link to="/ps/property-content/$hotelId" params={{ hotelId: String(row.hotel_id) }}>{String(row.hotel_name ?? row.hotel_id)}<ArrowUpRight className="size-3 shrink-0" /></Link></Button></td><td className="px-2">{String(row.latest_grade ?? '—')} / {String(row.worst_grade ?? '—')}</td><td className="px-2">{row.survey2 == null ? '—' : String(row.survey2)}</td><td className="px-2"><Chip tone={reasons.length ? 'warn' : 'muted'}>{reasons.length ? reasons.join(' · ') : hasAll ? 'ไม่เข้าเกณฑ์' : 'รอข้อมูล'}</Chip></td><td className="px-2 text-xs">{String(row.completeness ?? '—')}</td><td className="px-2 text-xs text-muted-foreground">รอ Meeting tab</td><td className="px-2">{String(row.active_services ?? '—')}</td></tr>; })}</tbody></table></div> : empty}
    </Section>
  </div>;
}