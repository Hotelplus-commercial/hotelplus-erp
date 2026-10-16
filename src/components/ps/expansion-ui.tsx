/* Expansion / Upsell v1.0 — read-only lists. Every action is a deep-link; nothing writes. */
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Chip } from '@/components/crm/crm-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccount360 } from '@/components/ps/account-360';
import { bandLabel, crossSellList, READY_TH, repricingList, SIG_TH, TRIGGER_TH, UPLIFT_CEILING_MIN, UPLIFT_FLOOR_MIN, UPLIFT_MID_MIN } from '@/lib/expansion';
import type { PsReportRow } from '@/lib/ps-dashboard-types';

const HEALTH = { high: '🔴', watch: '🟡', healthy: '🟢', pending: '⚪' } as Record<string, string>;
export const thb = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('th-TH') : '—');
const SYNC = 'รอ sync ข้อมูล';
const TBD = 'รอกำหนดเกณฑ์';

function AeSelect({ rows, value, onChange }: { rows: PsReportRow[]; value: string; onChange: (v: string) => void }) {
  const aes = [...new Set(rows.map(r => String(r.ae_owner_id ?? '—')))].sort();
  return <select aria-label="ราย AE" className="h-8 rounded-md border bg-background px-2 text-xs" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">ราย AE ▾ (ทั้งหมด)</option>{aes.map(a => <option key={a} value={a}>{a}</option>)}</select>;
}
export const BdLink = () => <Link to="/bd/deals" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline">เปิดใน BD <ArrowUpRight className="size-3" /></Link>;
export const RenewalLink = () => <Link to="/ps/contracts" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline">เปิด Renewal Card <ArrowUpRight className="size-3" /></Link>;
export const sigChips = (r: PsReportRow) => (Object.keys(SIG_TH) as (keyof typeof SIG_TH)[]).filter(k => r[k] === true).map(k => <Chip key={k} tone="muted">{SIG_TH[k]}</Chip>);
export const readyTag = (r: PsReportRow) => r.readiness_tier ? <Chip tone={r.readiness_tier === 'ready' ? 'success' : r.readiness_tier === 'nurture' ? 'warn' : 'muted'}>{READY_TH[String(r.readiness_tier)]}</Chip> : <Chip tone="muted">{TBD}</Chip>;
export const triggerBadge = (r: PsReportRow) => r.trigger_pending === true && r.trigger === 'none' ? <Chip tone="muted">รอประวัติค่าบริการ</Chip> : <Chip tone="warn">{TRIGGER_TH[String(r.trigger)] ?? '—'}</Chip>;
export const priceLine = (r: PsReportRow) => r.suggested_min_thb == null ? `ปัจจุบัน ${thb(r.lever_amount)} → ${bandLabel(r)}` : `ปัจจุบัน ${thb(r.lever_amount)} → แนะนำ ${thb(r.suggested_min_thb)}–${thb(r.suggested_max_thb)}`;

export function CrossSellPanel({ rows, attachRows, pending }: { rows: PsReportRow[]; attachRows: number; pending: boolean }) {
  const { openAccount360 } = useAccount360();
  const [prime, setPrime] = useState(false);
  const [ae, setAe] = useState('');
  const single = rows.length;
  const list = crossSellList(rows).filter(r => (!prime || r.is_prime === true) && (!ae || String(r.ae_owner_id ?? '—') === ae));
  return <div className="mt-5 rounded-lg border p-3" data-testid="crosssell">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-semibold">ขายบริการเพิ่ม (Cross-sell)</h3>
        <p className="text-xs text-muted-foreground">single-service {single} · [ORM-only {rows.filter(r => r.owned_service === 'ORM').length}] [Marcom-only {rows.filter(r => r.owned_service === 'Marcom').length}]{attachRows ? '' : ''}</p></div>
      <div className="flex flex-wrap items-center gap-3 text-xs"><label className="flex items-center gap-1.5"><Checkbox checked={prime} onCheckedChange={v => setPrime(v === true)} />เฉพาะเป้าชั้นดี (A/B + ROI ดี)</label><AeSelect rows={rows} value={ae} onChange={setAe} /></div>
    </header>
    {pending ? <p className="py-4 text-center text-sm text-muted-foreground">{SYNC}</p> : !list.length ? <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีโรงแรมที่ผ่านเกณฑ์</p> :
      <ul className="divide-y text-sm">{list.map(r => <li key={String(r.hotel_id)} data-testid="crosssell-row" className="flex cursor-pointer flex-wrap items-center gap-2 py-2 hover:bg-muted" onClick={() => openAccount360(String(r.hotel_id))}>
        <span className="font-medium text-primary">{String(r.hotel_name ?? r.hotel_id)}</span>
        <span className="text-muted-foreground">{String(r.owned_service)} → เสนอเพิ่ม {String(r.gap_service)}</span>
        <span>{HEALTH[String(r.health_tier)] ?? '⚪'}</span><span className="text-xs">Grade {String(r.grade ?? '—')}</span>
        {readyTag(r)}{r.is_prime === true && <Chip tone="info">เป้าชั้นดี</Chip>}{sigChips(r)}
        <span className="ml-auto"><BdLink /></span></li>)}</ul>}
  </div>;
}

export function RepricingBox({ rows, pending }: { rows: PsReportRow[]; pending: boolean }) {
  const { openAccount360 } = useAccount360();
  const [ae, setAe] = useState('');
  const all = repricingList(rows);
  const list = all.filter(r => !ae || String(r.ae_owner_id ?? '—') === ae);
  const by = (min: number) => all.filter(r => r.band_min_pct === min).length;
  return <div data-testid="repricing">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>ครบรอบ {all.length} · by band [+12–15%: {by(UPLIFT_CEILING_MIN)}] [+5–12%: {by(UPLIFT_MID_MIN)}] [+3–5%: {by(UPLIFT_FLOOR_MIN)}]</span><AeSelect rows={all} value={ae} onChange={setAe} /></div>
    {pending ? <p className="py-6 text-center text-sm text-muted-foreground">{SYNC}</p> : !list.length ? <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีโรงแรมที่ถึงรอบ</p> :
      <ul className="divide-y text-sm">{list.map(r => <li key={`${r.hotel_id}-${r.service_line}`} data-testid="repricing-row" className="flex cursor-pointer flex-wrap items-center gap-2 py-2 hover:bg-muted" onClick={() => openAccount360(String(r.hotel_id))}>
        <span className="font-medium text-primary">{String(r.hotel_name ?? r.hotel_id)}</span><span className="text-xs text-muted-foreground">{String(r.service_line)}</span>
        <span className="tabular-nums">{priceLine(r)}</span>{triggerBadge(r)}<Chip tone="muted">{bandLabel(r)}</Chip>
        {String(r.why_chips ?? '').split('|').filter(Boolean).map(w => <Chip key={w} tone="muted">{w}</Chip>)}
        <span className="ml-auto"><RenewalLink /></span></li>)}</ul>}
    <p className="mt-2 text-xs text-muted-foreground">อ้างอิง · AE เคาะราคาจริง</p>
  </div>;
}
