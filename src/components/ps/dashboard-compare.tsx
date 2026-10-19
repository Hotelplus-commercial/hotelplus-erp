import type { ContractLifecycle } from '@/lib/contract-lifecycle';
import { v_bdac_flow } from '@/lib/bdac-views';
import { useDashboardGlobal, selectedPeriod, scopePeriod, periodRange, deltaText } from '@/lib/ps-dashboard-global';
import { latestPeriod, ratio, type PsReport, type PsReportRow } from '@/lib/ps-dashboard-types';

const median = (rows: number[]) => { if (!rows.length) return null; const s = [...rows].sort((a,b) => a-b); const lo = s[Math.floor((s.length-1)/2)], hi = s[Math.ceil((s.length-1)/2)]; return lo == null || hi == null ? null : (lo+hi)/2; };
export function DashboardCompare({ report, ac, deals, tab }: { report: PsReport | undefined; ac: Record<string, PsReportRow[]> | undefined; deals: ContractLifecycle[]; tab: string }) {
  const { filter:f, demo, now:clock } = useDashboardGlobal();
  const now = new Date(clock);
  const metric = (side: 'A' | 'B') => {
    const p = selectedPeriod(f,now,side);
    const v = report?.views;
    const rows = (key: keyof NonNullable<typeof v>, date = 'billing_period') => scopePeriod(v?.[key] ?? [],f,p,date);
    const flow = v_bdac_flow(deals,periodRange(p));
    const renewal = rows('v_ps_renewal','renewal_due_date');
    const decided = renewal.filter(r => ['RENEWED','NOT_RENEWED','LOST'].includes(String(r.outcome)));
    const life = rows('v_ps_contract_lifetime','end_date').filter(r => r.status === 'INACTIVE');
    const cohort = rows('v_ps_onboard_cohort');
    const invoices = scopePeriod(ac?.['v_ac_overdue'] ?? [],f,p);
    return {
      in: rows('v_ps_lifecycle_flow','created_at').length || (rows('v_ps_churn_monthly').length ? 0 : null),
      out: rows('v_ps_lifecycle_flow','inactivated_at').length || (rows('v_ps_churn_monthly').length ? 0 : null),
      churn: ratio(latestPeriod(rows('v_ps_churn_monthly')),'out_count','active_at_start'),
      renewal:renewal.length || null,
      success:decided.length ? decided.filter(r => r.outcome === 'RENEWED').length/decided.length*100 : null,
      renewalChurn:decided.length ? decided.filter(r => r.outcome !== 'RENEWED').length/decided.length*100 : null,
      lifetime:median(life.map(r => Number(r.age_days))),
      onboard:median(cohort.filter(r => typeof r['median_days'] === 'number').map(r => Number(r['median_days']))),
      attach:side === 'A' && p.to >= clock.slice(0,10) ? ratio(rows('v_ps_attach_rate','none'),'attached_hotels','active_hotels') : null,
      signed: deals.some(d => d.signed_at && new Date(d.signed_at).getTime() >= periodRange(p).from && new Date(d.signed_at).getTime() < periodRange(p).to) ? flow.signed : null,
      won:deals.some(d => d.won_at && new Date(d.won_at).getTime() >= periodRange(p).from && new Date(d.won_at).getTime() < periodRange(p).to) ? flow.won : null,
      collection:invoices.length ? invoices.reduce((s,r) => s + Number(r['outstanding'] ?? 0),0) : null,
    };
  };
  const a = metric('A'), b = metric('B');
  const list: [keyof typeof a,string,'pp' | '%' | ''][] = tab === 'ps' ? [['in','In','%'],['out','Out','%'],['churn','Churn %','pp'],['renewal','ครบกำหนดต่อสัญญา','%'],['success','ต่อแล้ว %','pp'],['renewalChurn','ไม่ต่อ %','pp'],['lifetime','Lifetime median · วัน','%'],['onboard','On-board median · วัน','%'],['attach','ใช้ทั้งสองบริการ %','pp']] : tab === 'bdac' ? [['signed','Signed','%'],['won','Won','%']] : tab === 'ac' ? [['collection','Collection ฿','%']] : [];
  if (!list.length) return null;
  return <section aria-label="Period comparison" className="border-y py-4"><h2 className="mb-3 text-sm font-semibold">Period A vs Period B{demo ? ' · DEMO' : ''}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map(([key,label,unit]) => <div key={key} className="min-w-0 border-l pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm tabular-nums">A {a[key] == null ? '—' : a[key]?.toLocaleString('th-TH',{maximumFractionDigits:1})} · B {b[key] == null ? '—' : b[key]?.toLocaleString('th-TH',{maximumFractionDigits:1})}</p><p className="mt-1 text-xs text-muted-foreground">{deltaText(a[key],b[key],unit)}</p></div>)}</div></section>;
}