/* Account 360 — shared, read-only hotel drawer. Invoke with openAccount360(hotel_id) from any dashboard tab.
 * Composes existing v_ps_* views only; every action is a deep-link to the source app. Nothing here writes. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Chip } from '@/components/crm/crm-ui';
import { accountHealthOf, DEMO_VALUE_RATIO_MIN, ROI_VALUE_RATIO_MIN, tierAStreak, trailingValueRatio } from '@/lib/account-health';
import type { PsReport, PsReportRow } from '@/lib/ps-dashboard-types';
import { BdLink, RenewalLink, priceLine, readyTag, sigChips, triggerBadge } from '@/components/ps/expansion-ui';
import { bandLabel } from '@/lib/expansion';

type Ctx = { openAccount360: (hotelId: string) => void };
const A360 = createContext<Ctx>({ openAccount360: () => {} });
export const useAccount360 = () => useContext(A360);

const TIER_DOT = { high: '🔴 High-risk', watch: '🟡 Watch', healthy: '🟢 Healthy', pending: '⚪ รอข้อมูล' } as const;
const thb = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('th-TH') : '—');

function Block({ title, to, children }: { title: string; to?: string; children: ReactNode }) {
  return <section className="border-b py-4">
    <header className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>
      {to && <Link to={to} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">เปิดต้นทาง <ArrowUpRight className="size-3" /></Link>}</header>
    <div className="text-sm">{children}</div>
  </section>;
}
const Kv = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>;

export function Account360Provider({ report, children }: { report?: PsReport | undefined; children: ReactNode }) {
  const [hotelId, setHotelId] = useState<string | null>(null);
  const openAccount360 = useCallback((id: string) => setHotelId(id), []);
  const value = useMemo(() => ({ openAccount360 }), [openAccount360]);
  return <A360.Provider value={value}>{children}
    <Sheet open={!!hotelId} onOpenChange={o => { if (!o) setHotelId(null); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {hotelId && <Account360Body report={report} hotelId={hotelId} />}
      </SheetContent>
    </Sheet>
  </A360.Provider>;
}

function Account360Body({ report, hotelId }: { report?: PsReport | undefined; hotelId: string }) {
  const v = report?.views;
  const now = report?.now ? new Date(report.now) : new Date();
  const of = (rows?: PsReportRow[]) => (rows ?? []).filter(r => r.hotel_id === hotelId);
  const healthRows = of(v?.v_ps_account_health);
  const contracts = of(v?.v_ps_lifecycle_flow);
  const renewals = of(v?.v_ps_renewal);
  const nps = of(v?.v_ps_nps);
  const base: PsReportRow = { ...(healthRows[0] ?? { hotel_id: hotelId }), completeness: healthRows.some(r => r.completeness != null && r.completeness !== 'complete') ? 'incomplete' : healthRows[0]?.completeness ?? null };
  const h = accountHealthOf(base, { now, roi: v?.v_ps_roi ?? [], flow: v?.v_ps_lifecycle_flow ?? [], ratioMin: report?.demo ? DEMO_VALUE_RATIO_MIN : ROI_VALUE_RATIO_MIN });
  const name = String(base.hotel_name ?? contracts[0]?.hotel_name ?? hotelId);
  const lines = [...new Set([...healthRows, ...contracts].map(r => String(r.service_line ?? '')).filter(Boolean))];
  const vr = trailingValueRatio(h.roi);
  return <>
    <SheetHeader className="border-b pb-3 text-left">
      <SheetTitle className="flex flex-wrap items-center gap-2">{name}{report?.demo && <span className="rounded border border-warning/60 bg-warning/15 px-1.5 text-[10px] font-bold tracking-widest text-warning-foreground">DEMO</span>}</SheetTitle>
      <p className="text-xs text-muted-foreground">Account 360 · อ่านอย่างเดียว · {TIER_DOT[h.tier]} · score {h.score}{h.compound ? ' · ⚠ ORM churn-risk' : ''}</p>
    </SheetHeader>
    <Block title="① ตัวตน & ผู้ดูแล" to="/ps/ae-workspace/property-info">
      <Kv k="AE" v={String(base.ae_owner_id ?? contracts[0]?.ae_owner_id ?? '—')} />
      <Kv k="Specialist / ORM team / Marcom" v="— (อ่านจาก Assignment ต้นทาง)" />
      <Kv k="บริการ" v={lines.join(' · ') || '—'} />
    </Block>
    <Block title="② สัญญา & Lifecycle" to="/ps/contracts">
      {contracts.length ? contracts.map(c => <Kv key={String(c.contract_id)} k={`${c.contract_id} · ${c.service_line}`} v={`${c.status}${c.start_date ? ` · เริ่ม ${String(c.start_date).slice(0, 10)}` : ''}${c.inactivated_at ? ` · ปิด ${String(c.inactivated_at).slice(0, 10)}` : ''}`} />) : <p className="text-muted-foreground">รอ Cloud Sync seed</p>}
      {renewals.map(r => <Kv key={String(r.renewal_id)} k={`Renewal ${String(r.renewal_due_date ?? '').slice(0, 10)}`} v={String(r.outcome ?? '—')} />)}
      {base.end_date != null && <Kv k="สิ้นสุดใกล้สุด" v={String(base.end_date).slice(0, 10)} />}
    </Block>
    <Block title="③ Billing & Grade" to="/ac/billing">
      <Kv k="Grade ล่าสุด / แย่สุด" v={`${base.latest_grade ?? '—'} / ${base.worst_grade ?? '—'}`} />
      <Kv k="สถานะเก็บเงิน" v={<span className="text-warning-foreground">ดูใน AC Billing</span>} />
    </Block>
    <Block title="④ Survey" to="/ps/ae-workspace/surveys">
      <Kv k="#1 ทีม" v="— (ระดับ cohort เท่านั้น)" />
      <Kv k="#2 ลูกค้า ล่าสุด" v={base.survey2 == null ? '—' : `${base.survey2}★`} />
      {nps.map((r, i) => <Kv key={i} k={`ประวัติ ${String(r.billing_period ?? '').slice(0, 7)}`} v={`${r.promoters ? 'Promoter' : r.detractors ? 'Detractor' : 'Passive'}`} />)}
    </Block>
    <Block title="⑤ Flags" to="/ps/ae-workspace/meetings"><p className="text-muted-foreground">🔴 รอ Meeting (placeholder)</p></Block>
    <Block title="⑥ WS-2 completeness" to="/ps/ae-workspace/property-info">
      {healthRows.length ? healthRows.map((r, i) => <Kv key={i} k={String(r.service_line ?? '—')} v={String(r.completeness ?? '—')} />) : <p className="text-muted-foreground">รอ Cloud Sync seed</p>}
    </Block>
    <Block title="⑦ ROI / Performance (ORM)" {...(h.hasOrm ? { to: '/orm/dashboard' } : {})}>
      {!h.hasOrm ? <p className="text-muted-foreground">ไม่มีบริการ ORM — ไม่มีข้อมูล ROI</p> : !h.roi.length ? <p className="text-muted-foreground">รอ Cloud Sync seed</p> : <>
        <div className="mb-2 flex flex-wrap gap-1">{h.dims.filter(d => d.code.startsWith('ROI') || d.code === 'TIER_A_PERSIST').map(d => <Chip key={d.code} tone="warn">{d.value ?? d.label}{d.value && d.code !== 'TIER_A_PERSIST' ? ` ${d.label}` : ''}</Chip>)}</div>
        <table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th>เดือน</th><th className="text-right">Revenue</th><th className="text-right">Fee+Comm</th><th className="text-right">Ratio</th><th className="text-right">Tier</th></tr></thead>
          <tbody>{h.roi.map(r => <tr key={String(r.period)} className="border-t"><td className="py-1">{String(r.period).slice(0, 7)}</td><td className="text-right tabular-nums">{thb(r.revenue_thb)}</td><td className="text-right tabular-nums">{thb(Number(r.fee_fixed_thb ?? 0) + Number(r.commission_thb ?? 0))}</td><td className="text-right tabular-nums">{String(r.value_ratio ?? '—')}</td><td className="text-right">{String(r.orm_tier ?? '—')}</td></tr>)}</tbody></table>
        <p className="mt-2 text-xs text-muted-foreground">Tier A ต่อเนื่อง {tierAStreak(h.roi)} เดือน · value ratio 3 เดือนล่าสุด {vr == null ? '—' : vr.toFixed(2)} · เทียบ portfolio เฉพาะเมื่อ n ≥ 5 (ไม่งั้นใช้ Tier อย่างเดียว)</p>
      </>}
    </Block>
    <Block title="โอกาสขยายบัญชี (Expansion)">
      <ExpansionSection report={report} hotelId={hotelId} lines={[...new Set(healthRows.map(r => String(r.service_line ?? "")).filter(Boolean))]} />
    </Block>
    <Block title="⑧ Timeline">
      {contracts.length ? [...contracts].flatMap(c => [[c.start_date, `เริ่ม ${c.contract_id}`], [c.inactivated_at, `ปิด ${c.contract_id}`]]).filter(([d]) => d).sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([d, t], i) => <Kv key={i} k={String(d).slice(0, 10)} v={String(t)} />) : <p className="text-muted-foreground">—</p>}
    </Block>
  </>;
}

function ExpansionSection({ report, hotelId, lines }: { report?: PsReport | undefined; hotelId: string; lines: string[] }) {
  const v = report?.views;
  const syncing = !report || (!report.demo && (report.pending.includes('v_ps_crosssell') || report.pending.includes('v_ps_repricing')));
  if (syncing) return <p className="text-muted-foreground">รอ sync ข้อมูล</p>;
  const cs = (v?.v_ps_crosssell ?? []).find(r => r.hotel_id === hotelId);
  const rp = (v?.v_ps_repricing ?? []).filter(r => r.hotel_id === hotelId);
  return <div className="space-y-3">
    <div><p className="mb-1 font-medium">ขายบริการเพิ่ม (Cross-sell)</p>
      {lines.length >= 2 ? <p className="text-muted-foreground">ครบ 2 บริการ</p> : !cs ? <p className="text-muted-foreground">—</p> : cs.gate_pass !== true ?
        <p className="text-warning-foreground">{String(cs.gate_fail_reason ?? '')} · ดูแลก่อน ยังไม่ขาย</p> :
        <div className="flex flex-wrap items-center gap-1"><span>{String(cs.owned_service)} → เสนอเพิ่ม {String(cs.gap_service)}</span>{readyTag(cs)}{sigChips(cs)}<span className="ml-auto"><BdLink /></span></div>}
    </div>
    <div><p className="mb-1 font-medium">ขึ้นค่าบริการ (Fee-uplift)</p>
      {!rp.length ? <p className="text-muted-foreground">ไม่มีค่าบริการ fixed — ไม่เข้าเกณฑ์ repricing</p> : rp.map(r => <div key={String(r.service_line)} className="mb-1">
        {r.revenue_profile === 'declining' ? <p className="text-warning-foreground">{String(r.service_line)} · รายได้ขาลง — ยังไม่ขึ้นราคา (ดูแลก่อน)</p> : r.gate_pass !== true ? <p className="text-muted-foreground">{String(r.service_line)} · ไม่ผ่านเกณฑ์: {String(r.gate_fail_reason ?? '')}</p> :
          <div className="flex flex-wrap items-center gap-1"><span>{String(r.service_line)}</span>{r.trigger === 'none' && r.trigger_pending !== true ? <span className="text-muted-foreground">ยังไม่ถึงรอบ</span> : triggerBadge(r)}<Chip tone="muted">{bandLabel(r)}</Chip><span className="w-full tabular-nums">{priceLine(r)} · ขึ้นราคาล่าสุด {r.last_increase_at ? String(r.last_increase_at).slice(0, 10) : '—'}</span><span className="text-xs text-muted-foreground">อ้างอิง · AE เคาะราคาจริง</span><span className="ml-auto"><RenewalLink /></span></div>}
      </div>)}
    </div>
  </div>;
}
