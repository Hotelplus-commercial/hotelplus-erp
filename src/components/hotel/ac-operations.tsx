import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { CheckCheck, Plus, RefreshCw, LogOut, Receipt, Pencil, Pause, Play, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Chip } from '@/components/crm/crm-ui';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { getAcLedger, mutateAcLedger, type AcAction } from '@/lib/ac-billing.functions';
import type { Tables } from '@/integrations/supabase/types';

const money = (n: number | null | undefined) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n ?? 0);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const displayDate = (d: string | null | undefined) => d ? new Date(`${d.slice(0,10)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '—';
type Ledger = Awaited<ReturnType<typeof getAcLedger>>;
type Sub = Tables<'service_subscription'>;
type Invoice = Ledger['invoices'][number];
type FormMode = { kind: 'subscription'; sub?: Sub } | { kind: 'invoice' } | { kind: 'payment'; invoice: Invoice } | { kind: 'verify'; payment: Tables<'payment'> } | { kind: 'collection'; customer_id: string; event: 'LEGAL_FILED' | 'WRITTEN_OFF' | 'SUSPENDED' | 'REACTIVATED' };

function SelectField({ name, label, value, children, onChange }: { name: string; label: string; value?: string; children: React.ReactNode; onChange?: (value: string) => void }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={value} onChange={e => onChange?.(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{children}</select></div>;
}
function Field({ name, label, value, type = 'text', min, max, required = true }: { name: string; label: string; value?: string | number | null; type?: string; min?: number | string; max?: number | string; required?: boolean }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} defaultValue={value ?? ''} type={type} min={min} max={max} required={required} step={type === 'number' ? '0.01' : undefined} maxLength={type === 'text' ? 200 : undefined} /></div>;
}
function Status({ value }: { value?: string | null }) {
  return <Chip tone={['OVERDUE','SUSPENDED','LEGAL','WRITTEN_OFF','D','C'].includes(value ?? '') ? 'warn' : ['PAID','ACTIVE','NORMAL','A'].includes(value ?? '') ? 'success' : 'muted'}>{value ?? '—'}</Chip>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto border-y"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{headers.map(h => <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div>;
}
const cell = 'px-3 py-3 align-top';

export function AcOperations() {
  const queryClient = useQueryClient();
  const fetchLedger = useServerFn(getAcLedger);
  const mutateLedger = useServerFn(mutateAcLedger);
  const session = useQuery({ queryKey: ['ac-session'], queryFn: async () => (await supabase.auth.getUser()).data.user, retry: false });
  const query = useQuery({ queryKey: ['ac-ledger', session.data?.id], queryFn: () => fetchLedger(), enabled: !!session.data, retry: false });
  const [mode, setMode] = useState<FormMode | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [invoiceType, setInvoiceType] = useState('ALL');
  const [period, setPeriod] = useState('');
  const [tab, setTab] = useState('subscriptions');
  const data = query.data;
  const canEdit = data?.roles.some(r => ['ac','admin'].includes(r)) ?? false;
  const canLegal = canEdit || (data?.roles.includes('legal') ?? false);
  const nameOf = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name ?? '—';
  const run = async (action: AcAction) => {
    setSaving(true);
    try { await mutateLedger({ data: action }); await queryClient.invalidateQueries({ queryKey: ['ac-ledger'] }); toast.success('บันทึกแล้ว'); setMode(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'ไม่สามารถบันทึกได้'); }
    finally { setSaving(false); }
  };
  const login = async () => {
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/ac/operations` });
    if (result.error) toast.error(result.error.message);
    await queryClient.invalidateQueries({ queryKey: ['ac-session'] });
  };
  const logout = async () => {
    await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut();
    setDetail(null); setMode(null); await queryClient.invalidateQueries({ queryKey: ['ac-session'] });
  };
  if (session.isPending) return <p className="py-10 text-muted-foreground">กำลังตรวจสอบบัญชี…</p>;
  if (!session.data) return <section className="space-y-4 border-y py-10"><h1 className="font-display text-2xl font-semibold">AC Operations</h1><p className="text-muted-foreground">เข้าสู่ระบบบัญชี</p><Button onClick={login}>เข้าสู่ระบบด้วย Google</Button></section>;
  if (query.isPending) return <p className="py-10 text-muted-foreground">กำลังโหลดงานบัญชี…</p>;
  if (query.isError) return <section className="space-y-3 py-8"><p>{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>ลองอีกครั้ง</Button><Button variant="ghost" onClick={logout}>ออกจากระบบ</Button></section>;
  if (!data?.authorized) return <section className="space-y-3 py-8"><h1 className="font-display text-2xl font-semibold">AC Operations</h1><p className="text-muted-foreground">บัญชีนี้ยังไม่มีสิทธิ์งานบัญชี</p><Button variant="outline" onClick={logout}>ออกจากระบบ</Button></section>;
  const matches = (hotel: string, customer: string) => `${hotel} ${customer}`.toLowerCase().includes(search.toLowerCase());
  const subscriptions = data.subscriptions.filter(s => (service === 'ALL' || s.service_line === service) && (status === 'ALL' || s.status === status) && matches(nameOf(data.hotels,s.hotel_id),nameOf(data.customers,s.customer_id)));
  const invoices = data.invoices.filter(i => (service === 'ALL' || i.service_line === service) && (status === 'ALL' || i.status === status) && (invoiceType === 'ALL' || i.invoice_type === invoiceType) && (!period || i.billing_period === `${period}-01`) && matches(i.hotel_name ?? '',i.customer_name ?? ''));
  const selected = data.invoices.find(i => i.id === detail);
  const worklist = invoices.filter(i => !['PAID','VOID','WRITTEN_OFF'].includes(i.status ?? '') || data.payments.some(p => p.invoice_id === i.id && !p.verified_by_ac));
  const collections = data.collections.filter(c => (status === 'ALL' || c.collection_status === status) && (c.name ?? '').toLowerCase().includes(search.toLowerCase()) && (service === 'ALL' || data.subscriptions.some(s => s.customer_id === c.customer_id && s.service_line === service)));
  const pending = data.payments.filter(p => !p.verified_by_ac).length;
  const statuses = tab === 'subscriptions' ? ['ACTIVE','PAUSED','SUSPENDED','TERMINATED'] : tab === 'collection' ? ['NORMAL','OVERDUE','SUSPENDED','LEGAL','WRITTEN_OFF'] : ['ISSUED','PARTIALLY_PAID','PAID','OVERDUE','WRITTEN_OFF','VOID'];
  const invoiceRows = (rows: Invoice[], payments = false) => rows.map(i => <tr key={i.id}><td className={cell}><Button variant="link" className="h-auto p-0" onClick={() => setDetail(i.id ?? null)}>{i.hotel_name}</Button><p className="text-xs text-muted-foreground">{i.customer_name}</p></td><td className={cell}>{i.invoice_type}<p className="text-xs text-muted-foreground">{i.service_line} · {i.customer_segment}</p></td><td className={cell}>{i.billing_period?.slice(0,7) ?? '—'}</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{money(i.amount)}<p className="text-xs text-muted-foreground">รับแล้ว {money(i.paid_amount)}</p></td><td className={cell}><Status value={i.status} /></td><td className={`${cell} whitespace-nowrap`}>{displayDate(i.due_date)}<p className="text-xs text-muted-foreground">ยืนยัน {displayDate(i.settled_date)}</p></td><td className={cell}>{i.tax_receipt_no ?? '—'}</td>{payments && <td className={cell}><div className="flex flex-col items-start gap-1">{canEdit && <Button size="sm" variant="outline" onClick={() => setMode({ kind: 'payment', invoice: i })}><Plus className="size-3.5" />รับชำระ</Button>}{data.payments.filter(p => p.invoice_id === i.id && !p.verified_by_ac).map(p => <Button key={p.id} size="sm" variant="outline" disabled={!canEdit || saving} onClick={() => setMode({ kind: 'verify', payment: p })}><CheckCheck className="size-3.5" /> AC Verify {money(p.amount)}</Button>)}</div></td>}</tr>);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold">AC Operations</h1><p className="mt-1 text-sm text-muted-foreground">บัญชีเรียกเก็บเงิน · {session.data.email}</p></div><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="โหลดใหม่" onClick={() => query.refetch()}><RefreshCw className="size-4" /></Button><Button variant="outline" size="icon" aria-label="ออกจากระบบ" onClick={logout}><LogOut className="size-4" /></Button></div></header>
    <div className="grid grid-cols-2 gap-4 border-y py-4 lg:grid-cols-5">{[['ยอดค้างทั้งหมด',money(data.collections.reduce((n,c) => n+(c.outstanding ?? 0),0))],['รอ AC ยืนยัน',pending],['ACTIVE',data.subscriptions.filter(s => s.status==='ACTIVE').length],['PAUSED',data.subscriptions.filter(s => s.status==='PAUSED').length],['SUSPENDED',data.subscriptions.filter(s => s.status==='SUSPENDED').length]].map(([label,value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>)}</div>
    <Tabs value={tab} onValueChange={value => { setTab(value); setStatus('ALL'); }}><TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="subscriptions">Subscriptions</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="payments">AC Worklist</TabsTrigger><TabsTrigger value="collection">Collection</TabsTrigger></TabsList>
      <div className="my-4 flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><Label htmlFor="search">ค้นหาโรงแรม / ลูกค้า</Label><Input id="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา" /></div><div><Label htmlFor="service-filter">บริการ</Label><select id="service-filter" className="h-10 rounded-md border bg-background px-3 text-sm" value={service} onChange={e => setService(e.target.value)}><option value="ALL">ทั้งหมด</option><option>ORM</option><option>Marcom</option></select></div><div><Label htmlFor="status-filter">สถานะ</Label><select id="status-filter" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">ทั้งหมด</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>{['invoices','payments'].includes(tab) && <><div><Label htmlFor="type-filter">ประเภท</Label><select id="type-filter" className="h-10 rounded-md border bg-background px-3 text-sm" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}><option value="ALL">ทั้งหมด</option>{['SETUP','RECURRING','SYSTEM_FEE'].map(t => <option key={t}>{t}</option>)}</select></div><div><Label htmlFor="period-filter">รอบเดือน</Label><Input id="period-filter" type="month" value={period} onChange={e => setPeriod(e.target.value)} /></div></>}{canEdit && ['subscriptions','invoices'].includes(tab) && <Button onClick={() => setMode({ kind: tab === 'subscriptions' ? 'subscription' : 'invoice' })}><Plus className="size-4" />{tab === 'subscriptions' ? 'เพิ่ม Subscription' : 'สร้างใบแจ้งหนี้'}</Button>}</div>
      <TabsContent value="subscriptions"><Table headers={['โรงแรม / ลูกค้า','สัญญา','บริการ','ค่าบริการ / เดือน','วันเรียกเก็บ / ครบกำหนด','เริ่มเรียกเก็บ','ผู้ดูแล','สถานะ','จัดการ']}>{subscriptions.map(s => <tr key={s.id}><td className={cell}>{nameOf(data.hotels,s.hotel_id)}<p className="text-xs text-muted-foreground">{nameOf(data.customers,s.customer_id)}</p></td><td className={cell}>{nameOf(data.contracts,s.contract_id)}</td><td className={cell}>{s.service_line}<p className="text-xs text-muted-foreground">{s.service_variant}</p></td><td className={`${cell} whitespace-nowrap tabular-nums`}>{money(s.monthly_fee)}</td><td className={cell}>{s.billing_day} / {s.due_day}</td><td className={`${cell} whitespace-nowrap`}>{displayDate(s.billing_start_date)}</td><td className={cell}>{nameOf(data.members,s.orm_team_id ?? s.marcom_member_id ?? '')}</td><td className={cell}><Status value={s.status} /></td><td className={cell}>{canEdit && s.status !== 'TERMINATED' && <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="แก้ไข Subscription" onClick={() => setMode({ kind:'subscription',sub:s })}><Pencil className="size-4" /></Button>{['ACTIVE','PAUSED'].includes(s.status) && <Button variant="ghost" size="icon" aria-label={s.status==='ACTIVE'?'Pause':'Resume'} disabled={saving} onClick={() => run({ action:'subscription_status',id:s.id,status:s.status==='ACTIVE'?'PAUSED':'ACTIVE' })}>{s.status==='ACTIVE'?<Pause className="size-4"/>:<Play className="size-4"/>}</Button>}<Button variant="ghost" size="icon" aria-label="Terminate" disabled={saving} onClick={() => { if(window.confirm('ยุติ Subscription นี้?')) run({action:'subscription_status',id:s.id,status:'TERMINATED'}); }}><Ban className="size-4" /></Button></div>}</td></tr>)}</Table>{!subscriptions.length && <Empty />}</TabsContent>
      <TabsContent value="invoices"><Table headers={['โรงแรม / ลูกค้า','ประเภท / บริการ','รอบ','ยอด / รับแล้ว','สถานะ','ครบกำหนด / ยืนยัน','ใบกำกับภาษี']}>{invoiceRows(invoices)}</Table>{!invoices.length && <Empty />}</TabsContent>
      <TabsContent value="payments"><Table headers={['โรงแรม / ลูกค้า','ประเภท / บริการ','รอบ','ยอด / รับแล้ว','สถานะ','ครบกำหนด / ยืนยัน','ใบกำกับภาษี','รับชำระ / ยืนยัน']}>{invoiceRows(worklist,true)}</Table>{!worklist.length && <Empty />}</TabsContent>
      <TabsContent value="collection"><Table headers={['ลูกค้า','สถานะ','ยอดค้าง','จัดการ']}>{collections.map(c => <tr key={c.customer_id}><td className={cell}>{c.name}</td><td className={cell}><Status value={c.collection_status} /></td><td className={`${cell} tabular-nums`}>{money(c.outstanding)}</td><td className={cell}><div className="flex flex-wrap gap-2">{(c.outstanding ?? 0)>0 && <>{canLegal && <Button size="sm" variant="outline" onClick={() => c.customer_id && setMode({kind:'collection',customer_id:c.customer_id,event:'LEGAL_FILED'})}>File legal</Button>}{canEdit && <><Button size="sm" variant="outline" onClick={() => c.customer_id && setMode({kind:'collection',customer_id:c.customer_id,event:'SUSPENDED'})}>Suspend</Button><Button size="sm" variant="outline" onClick={() => c.customer_id && setMode({kind:'collection',customer_id:c.customer_id,event:'WRITTEN_OFF'})}>Write off</Button></>}</>}{canEdit && c.collection_status !== 'NORMAL' && <Button size="sm" variant="outline" disabled={(c.outstanding ?? 0)>0} onClick={() => c.customer_id && setMode({kind:'collection',customer_id:c.customer_id,event:'REACTIVATED'})}>Reactivate</Button>}</div>{data.events.filter(e => e.customer_id===c.customer_id).slice(0,2).map(e => <p key={e.id} className="mt-1 text-xs text-muted-foreground">{displayDate(e.occurred_at)} · {e.event_type} · {e.note}</p>)}</td></tr>)}</Table>{!collections.length && <Empty />}</TabsContent>
    </Tabs>
    <Dialog open={!!mode} onOpenChange={open => { if(!open && !saving) setMode(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{mode?.kind==='subscription'?'Subscription':mode?.kind==='invoice'?'สร้างใบแจ้งหนี้':mode?.kind==='payment'?'บันทึกรับชำระ':mode?.kind==='verify'?'AC Verify':'Collection action'}</DialogTitle></DialogHeader>{mode && <OperationsForm key={mode.kind + ('sub' in mode ? mode.sub?.id ?? '' : '')} mode={mode} data={data} saving={saving} onSave={run} nameOf={nameOf} />}</DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if(!open) setDetail(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Invoice · {selected?.hotel_name}</DialogTitle></DialogHeader>{selected && <div className="space-y-4"><p className="break-all text-xs text-muted-foreground">{selected.id}</p><div className="flex flex-wrap items-center gap-4"><Status value={selected.status} /><span>{money(selected.amount)} · รับแล้ว {money(selected.paid_amount)}</span><span>เกรดลูกค้า <Status value={data.grades.find(g => g.customer_id===selected.customer_id && g.billing_period===(selected.billing_period ?? `${selected.issue_date?.slice(0,7)}-01`))?.grade} /></span></div><p className="text-sm">ครบกำหนด {displayDate(selected.due_date)} · ยืนยันรับชำระ {displayDate(selected.settled_date)} · ใบกำกับภาษี {selected.tax_receipt_no ?? '—'}</p><Table headers={['วันที่ Gateway','จำนวน','วิธี','AC ยืนยัน','จัดการ']}>{data.payments.filter(p => p.invoice_id===selected.id).map(p => <tr key={p.id}><td className={cell}>{displayDate(p.gateway_paid_date)}</td><td className={cell}>{money(p.amount)}</td><td className={cell}>{p.method}</td><td className={cell}>{displayDate(p.verified_at)}</td><td className={cell}>{!p.verified_by_ac && canEdit && <Button size="sm" onClick={() => { setDetail(null); setMode({kind:'verify',payment:p}); }}><CheckCheck className="size-4" />AC Verify</Button>}</td></tr>)}</Table>{canEdit && !['PAID','VOID','WRITTEN_OFF'].includes(selected.status ?? '') && <Button onClick={() => { setDetail(null); setMode({kind:'payment',invoice:selected}); }}><Receipt className="size-4" />บันทึกรับชำระ</Button>}</div>}</DialogContent></Dialog>
  </div>;
}

function Empty() { return <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบรายการ</p>; }
function OperationsForm({mode,data,saving,onSave,nameOf}:{mode:FormMode;data:Ledger;saving:boolean;onSave:(action:AcAction)=>Promise<void>;nameOf:(list:{id:string;name:string}[],id:string)=>string}) {
  const [line,setLine] = useState(mode.kind==='subscription' ? mode.sub?.service_line ?? 'ORM' : 'ORM');
  const [type,setType] = useState('SETUP');
  const sub = mode.kind==='subscription' ? mode.sub : undefined;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const raw = Object.fromEntries(new FormData(e.currentTarget));
    if(mode.kind==='subscription') onSave({ action:'subscription',...(sub?{id:sub.id}:{}),hotel_name:String(raw.hotel_name),customer_name:String(raw.customer_name),contract_name:String(raw.contract_name),service_line:line as 'ORM'|'Marcom',service_variant:String(raw.service_variant) as 'ORM'|'ORM_LITE'|'MT'|'GMB',monthly_fee:Number(raw.monthly_fee),billing_day:Number(raw.billing_day),due_day:Number(raw.due_day),billing_start_date:String(raw.billing_start_date),orm_team_id:line==='ORM'?String(raw.assignee ?? ''):'',marcom_member_id:line==='Marcom'?String(raw.assignee ?? ''):'' });
    if(mode.kind==='invoice') onSave({action:'invoice',subscription_id:String(raw.subscription_id),invoice_type:type as 'SETUP'|'SYSTEM_FEE',amount:Number(raw.amount),issue_date:String(raw.issue_date),due_date:String(raw.due_date),...(type==='SYSTEM_FEE'?{billing_period:String(raw.billing_period)+'-01',cadence:String(raw.cadence) as 'monthly'|'quarterly'}:{})});
    if(mode.kind==='payment' && mode.invoice.id) onSave({action:'payment',invoice_id:mode.invoice.id,gateway_paid_date:String(raw.gateway_paid_date),amount:Number(raw.amount),method:String(raw.method)});
    if(mode.kind==='verify') onSave({action:'verify',payment_id:mode.payment.id,tax_receipt_no:String(raw.tax_receipt_no)});
    if(mode.kind==='collection') onSave({action:'collection',customer_id:mode.customer_id,event:mode.event,note:String(raw.note)});
  };
  return <form onSubmit={submit} className="space-y-4">{mode.kind==='subscription' && <><div className="grid gap-4 sm:grid-cols-2"><Field name="hotel_name" label="โรงแรม" value={sub?nameOf(data.hotels,sub.hotel_id):''}/><Field name="customer_name" label="ลูกค้า" value={sub?nameOf(data.customers,sub.customer_id):''}/><Field name="contract_name" label="สัญญา" value={sub?nameOf(data.contracts,sub.contract_id):''}/><SelectField name="service_line" label="บริการ" value={line} onChange={setLine}><option>ORM</option><option>Marcom</option></SelectField><SelectField key={line} name="service_variant" label="Variant" value={sub?.service_line===line?sub.service_variant ?? undefined:undefined}>{(line==='ORM'?['ORM','ORM_LITE']:['MT','GMB']).map(v=><option key={v}>{v}</option>)}</SelectField><Field name="monthly_fee" label="ค่าบริการรายเดือน (THB)" type="number" min="0.01" value={sub?.monthly_fee}/><Field name="billing_day" label="วันเรียกเก็บ (1–28)" type="number" min={1} max={28} value={sub?.billing_day ?? 5}/><Field name="due_day" label="วันครบกำหนด (1–28)" type="number" min={1} max={28} value={sub?.due_day ?? 15}/><Field name="billing_start_date" label="เริ่มเรียกเก็บ" type="date" value={sub?.billing_start_date ?? today()}/><SelectField name="assignee" label={line==='ORM'?'ORM Team':'Marcom Member'} value={sub?.orm_team_id ?? sub?.marcom_member_id ?? ''}><option value="">ไม่ระบุ</option>{data.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</SelectField></div></>}
    {mode.kind==='invoice' && <><SelectField name="subscription_id" label="Subscription"><option value="">เลือก Subscription</option>{data.subscriptions.map(s=><option key={s.id} value={s.id}>{nameOf(data.hotels,s.hotel_id)} · {s.service_line} · {nameOf(data.contracts,s.contract_id)}</option>)}</SelectField><SelectField name="invoice_type" label="ประเภท" value={type} onChange={setType}><option>SETUP</option><option>SYSTEM_FEE</option></SelectField><Field name="amount" label="จำนวนเงิน (THB)" type="number" min="0.01"/><div className="grid grid-cols-2 gap-4"><Field name="issue_date" label="วันที่ออก" type="date" value={today()}/><Field name="due_date" label="ครบกำหนด" type="date" value={today()}/></div>{type==='SYSTEM_FEE' && <><Field name="billing_period" label="รอบเดือน" type="month" value={today().slice(0,7)}/><SelectField name="cadence" label="รอบเรียกเก็บ"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></SelectField></>}</>}
    {mode.kind==='payment' && <><p className="text-sm">{mode.invoice.hotel_name} · ค้าง {money((mode.invoice.amount ?? 0)-(mode.invoice.paid_amount ?? 0))}</p><Field name="gateway_paid_date" label="วันที่ Gateway รับชำระ" type="date" value={today()} max={today()}/><Field name="amount" label="จำนวนเงิน (THB)" type="number" min="0.01"/><Field name="method" label="วิธีชำระเงิน" value="โอนผ่านธนาคาร"/></>}
    {mode.kind==='verify' && <><p className="text-sm">ยืนยันรับชำระ {money(mode.payment.amount)} · {mode.payment.method}</p><Field name="tax_receipt_no" label="เลขใบเสร็จ / ใบกำกับภาษี"/><p className="text-xs text-muted-foreground">วันที่ยืนยัน {displayDate(today())}</p></>}
    {mode.kind==='collection' && <><Status value={mode.event}/><Field name="note" label="หมายเหตุ"/></>}
    <Button type="submit" disabled={saving || (mode.kind==='invoice'&&!data.subscriptions.length)} className="w-full">{saving?'กำลังบันทึก…':mode.kind==='verify'?'ยืนยัน AC Verify':'บันทึก'}</Button>
  </form>;
}