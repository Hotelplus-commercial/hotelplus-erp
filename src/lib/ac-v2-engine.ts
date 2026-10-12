import type { Contract, Invoice, InvoiceLine, ProductionReport, Product, Customer, TaxReceipt, LiveLink, InvRequest } from './crm-types';
import { computeTotals, nextInvoiceId, taxReceiptIdFor } from './crm-rules';
import { resolveContractHotel, stampInvoiceHotel } from './ac-attribution';

export type Grade = 'A' | 'B' | 'C' | 'D';
export type GradeRecord = { customer_id: string; billing_period: string; grade: Grade; basis: string[]; computed_at: string };
export type CollectionEvent = { id: string; customer_id: string; hotel_name: string; event_type: string; occurred_at: string; by_member: string; amount_outstanding: number; note: string };
export type AccountingData = { contracts: Contract[]; invoices: Invoice[]; reports: ProductionReport[]; products: Product[]; customers: Customer[]; taxReceipts: TaxReceipt[]; liveLinks: LiveLink[]; invRequests: InvRequest[]; gradeRecords?: GradeRecord[]; collectionEvents?: CollectionEvent[]; billingWaiting?: { contract_id: string; service_line: string; billing_period: string }[] };
export const bangkokDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
const monthShift = (period: string, shift: number, day = 1) => {
  const [year, month] = period.slice(0,7).split('-').map(Number);
  return new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1 + shift, day)).toISOString().slice(0,10);
};
export function invoiceGrade(invoice: Invoice, t = bangkokDate()): Grade {
  const period = invoice.billing_period_start.slice(0,7) + '-01';
  const ref = invoice.settled_date ?? (invoice.status === 'paid' ? invoice.paid_at?.slice(0,10) : null) ?? t;
  if (ref <= period.slice(0,7) + '-15') return 'A';
  if (ref <= monthShift(period,1,0)) return 'B';
  return ref < monthShift(period,2,15) ? 'C' : 'D';
}
export const outstandingOf = (i: Invoice) => ['draft','void','written_off'].includes(i.status) ? 0 : Math.max(0, i.totals.total - (i.paid_amount ?? (i.status === 'paid' ? i.totals.total : 0)));
export const serviceOf = (sku: string, products: Product[]): 'ORM' | 'Marcom' | null => {
  const line = products.find(p => p.sku === sku)?.service_line;
  if (line === 'ORM' || sku.startsWith('ORM-')) return 'ORM';
  if (line === 'MARCOM' || sku.startsWith('MARCOM-')) return 'Marcom';
  return null;
};
export const isGradeInvoice = (i: Invoice) => i.invoice_type === 'RECURRING' && Boolean(i.due_date) && !['draft','void','written_off'].includes(i.status);
export type CollectionStatus = 'NORMAL' | 'OVERDUE' | 'SUSPENDED' | 'LEGAL' | 'WRITTEN_OFF';

export function collectionStatus(data: Pick<AccountingData, 'invoices' | 'collectionEvents' | 'gradeRecords'>, customer: string, t = bangkokDate()): CollectionStatus {
  const events = (data.collectionEvents ?? []).filter(e => e.customer_id === customer);
  // Reactivation is the only event that clears a manual terminal lane.
  for (const event of events) {
    if (event.event_type === 'REACTIVATED') break;
    if (event.event_type === 'WRITTEN_OFF') return 'WRITTEN_OFF';
  }
  for (const event of events) {
    if (event.event_type === 'REACTIVATED') break;
    if (event.event_type === 'LEGAL') return 'LEGAL';
  }
  const invoices = data.invoices.filter(i => i.customer_snapshot.customer_id === customer);
  if (invoices.reduce((n, i) => n + outstandingOf(i), 0) === 0) return 'NORMAL';
  const grades = invoices.filter(i => isGradeInvoice(i) && outstandingOf(i) > 0).map(i => {
    const period = i.billing_period_start.slice(0,7);
    const old = data.gradeRecords?.find(g => g.customer_id === customer && g.billing_period.slice(0,7) === period && g.basis.includes(i.invoice_id))?.grade;
    const current = invoiceGrade(i, t);
    return old && old > current ? old : current;
  });
  if (grades.includes('D')) return 'SUSPENDED';
  if (grades.includes('C')) return 'OVERDUE';
  return 'NORMAL';
}

export function paymentSummary(data: Pick<AccountingData, 'customers' | 'invoices' | 'gradeRecords' | 'collectionEvents'>, hotel: {id: string; name: string}, t = bangkokDate()) {
  const customer = data.customers.find(c => c.hotels.some(h => h.hotel_id === hotel.id))
    ?? data.customers.find(c => c.hotels.some(h => h.name === hotel.name));
  const rows = data.invoices.filter(i => customer ? i.customer_snapshot.customer_id === customer.customer_id : i.hotel_id === hotel.id || (!i.hotel_id && i.customer_snapshot.hotel_name === hotel.name));
  const customerId = customer?.customer_id ?? rows[0]?.customer_snapshot.customer_id;
  const current = rows.filter(i => isGradeInvoice(i) && i.billing_period_start.slice(0,7) === t.slice(0,7));
  const record = data.gradeRecords?.find(g => g.customer_id === customerId && g.billing_period.slice(0,7) === t.slice(0,7) && g.basis.some(id => current.some(i => i.invoice_id === id)));
  const grade: Grade | '—' = record?.grade ?? (current.length ? current.map(i => invoiceGrade(i,t)).sort().at(-1) ?? 'A' : '—');
  const score = grade === 'A' ? 100 : grade === 'B' ? 75 : grade === 'C' ? 50 : grade === 'D' ? 25 : 0;
  const start = monthShift(t, -11);
  const late = data.gradeRecords?.filter(g => g.customer_id === customerId && g.billing_period >= start && g.billing_period <= t && g.grade !== 'A' && g.basis.some(id => rows.some(i => i.invoice_id === id && isGradeInvoice(i)))).length ?? 0;
  const unpaidMonths = new Set(rows.filter(i => outstandingOf(i)>0 && i.due_date && i.due_date<t).map(i => i.billing_period_start.slice(0,7))).size;
  return {customerId, rows, grade, score, late, unpaidMonths, collection: customerId ? collectionStatus(data,customerId,t) : 'NORMAL' as CollectionStatus};
}

export function manualCollection<T extends AccountingData>(data: T, customer: string, event: 'LEGAL' | 'WRITTEN_OFF' | 'REACTIVATED', note: string, actor: string, t = bangkokDate()): T {
  const invoices = data.invoices.filter(i => i.customer_snapshot.customer_id === customer);
  const debt = invoices.reduce((n,i) => n+outstandingOf(i),0);
  const previous = collectionStatus(data,customer,t);
  if (!note.trim() || (event === 'REACTIVATED' ? debt > 0 || previous === 'NORMAL' : debt <= 0) || previous === event || (previous === 'WRITTEN_OFF' && event !== 'REACTIVATED')) return data;
  const updated = {...data,
    invoices: event === 'WRITTEN_OFF' ? data.invoices.map(i => i.customer_snapshot.customer_id === customer && outstandingOf(i)>0 ? {...i,status:'written_off' as const} : i) : data.invoices,
    contracts: event === 'REACTIVATED' ? data.contracts.map(c => c.customer_snapshot.customer_id === customer && c.billing_status === 'SUSPENDED' ? {...c,billing_status:'ACTIVE' as const} : c) : data.contracts,
    collectionEvents: [{id:crypto.randomUUID(),customer_id:customer,hotel_name:invoices[0]?.customer_snapshot.hotel_name ?? '',event_type:event,occurred_at:t,by_member:actor,amount_outstanding:debt,note},...(data.collectionEvents ?? [])]
  };
  return recomputeAccounting(updated,t);
}

export function recomputeAccounting<T extends AccountingData>(data: T, t = bangkokDate()): T {
  const records = new Map<string, GradeRecord>();
  for (const i of data.invoices) {
    if (!isGradeInvoice(i)) continue;
    const customer = i.customer_snapshot.customer_id;
    const period = i.billing_period_start.slice(0,7) + '-01';
    const key = customer + ':' + period;
    const grade = invoiceGrade(i,t);
    const previous = records.get(key);
    records.set(key,{customer_id:customer,billing_period:period,grade: previous && previous.grade > grade ? previous.grade : grade,basis:[...(previous?.basis ?? []),i.invoice_id],computed_at:t});
  }
  const gradeRecords = [...records.values()].map(r => {
    const old = data.gradeRecords?.find(g => g.customer_id === r.customer_id && g.billing_period === r.billing_period);
    const validBasis = old?.basis.every(id => r.basis.includes(id));
    return old && validBasis && old.grade > r.grade ? {...r,grade:old.grade} : r;
  });
  let contracts = data.contracts;
  const events = [...(data.collectionEvents ?? [])];
  for (const customer of new Set(data.invoices.map(i => i.customer_snapshot.customer_id))) {
    const invoices = data.invoices.filter(i => i.customer_snapshot.customer_id === customer);
    const debt = invoices.reduce((n,i) => n + outstandingOf(i),0);
    const prev = events.find(e => e.customer_id === customer)?.event_type ?? 'NORMAL';
    const derived = collectionStatus({...data, gradeRecords, collectionEvents: events}, customer, t);
    const prior = prev === 'REACTIVATED' ? 'NORMAL' : prev;
    const terminal = ['LEGAL','WRITTEN_OFF'].includes(derived);
    const target = terminal ? null : debt === 0 && ['OVERDUE','SUSPENDED'].includes(prior) ? 'REACTIVATED' : derived !== prior ? derived : null;
    if (!target) continue;
    contracts = contracts.map(c => c.customer_snapshot.customer_id !== customer ? c : target==='SUSPENDED' && (c.billing_status ?? 'ACTIVE')==='ACTIVE' ? {...c,billing_status:'SUSPENDED'} : target==='REACTIVATED' && c.billing_status==='SUSPENDED' ? {...c,billing_status:'ACTIVE'} : c);
    events.unshift({id:crypto.randomUUID(),customer_id:customer,hotel_name:invoices[0]?.customer_snapshot.hotel_name ?? '',event_type:target,occurred_at:t,by_member:'daily',amount_outstanding:debt,note:'Automatic payment-grade evaluation'});
  }
  return {...data,contracts,gradeRecords,collectionEvents:events};
}
export function runDailyBilling<T extends AccountingData>(original: T, t = bangkokDate()): T {
  const contracts = original.contracts.map(c => resolveContractHotel(c, original.customers));
  let data = {...original, contracts, invoices: original.invoices.map(i => stampInvoiceHotel(i,contracts))};
  let invoices = [...data.invoices];
  const waiting = [...(data.billingWaiting ?? [])];
  const period = t.slice(0,7) + '-01';
  // Capture only today's eligible period on the 5th; waiting items persist for late reports.
  if (t.endsWith('-05')) for (const c of data.contracts) {
    const end = monthShift(c.start_date,c.duration_months,Number(c.start_date.slice(8,10)));
    if ((c.billing_status ?? 'ACTIVE')!=='ACTIVE' || c.status!=='contract_completed' || c.start_date>t || end<=t) continue;
    if (!invoices.some(i => i.customer_snapshot.customer_id===c.customer_snapshot.customer_id && !['draft','void'].includes(i.status))) continue;
    for (const service of ['ORM','Marcom']) {
      if (!c.lines.some(l => l.billing==='monthly' && serviceOf(l.sku_snapshot,data.products)===service)) continue;
      if (!waiting.some(w => w.contract_id===c.contract_id && w.service_line===service && w.billing_period===period)) waiting.push({contract_id:c.contract_id,service_line:service,billing_period:period});
    }
  }
  const pending: NonNullable<AccountingData['billingWaiting']> = [];
  for (const item of waiting) {
    const c = data.contracts.find(c => c.contract_id===item.contract_id);
    if (!c || (c.billing_status ?? 'ACTIVE')!=='ACTIVE' || monthShift(c.start_date,c.duration_months,Number(c.start_date.slice(8,10)))<=t) continue;
    if (invoices.some(i => i.contract_ids.includes(c.contract_id) && i.billing_period_start.slice(0,7)===item.billing_period.slice(0,7) && (i.service_line===item.service_line || i.lines.some(l=>serviceOf(l.sku_snapshot,data.products)===item.service_line)) && i.status!=='void')) continue;
    const relevant = c.lines.filter(l => l.billing==='monthly' && serviceOf(l.sku_snapshot,data.products)===item.service_line);
    const reports = data.reports.filter(r=>r.contract_id===c.contract_id && `${r.period_year}-${String(r.period_month).padStart(2,'0')}`===item.billing_period.slice(0,7) && serviceOf(r.sku,data.products)===item.service_line);
    if (!reports.length || relevant.some(l=>l.commission_rate!=null && !reports.some(r=>r.sku===l.sku_snapshot))) { pending.push(item); continue; }
    const lines: InvoiceLine[] = [];
    for (const l of relevant) {
      if (l.unit_price && l.unit_price>0) lines.push({line_id:crypto.randomUUID(),contract_id:c.contract_id,sku_snapshot:l.sku_snapshot,name_snapshot:l.name_snapshot,line_type:'fixed',quantity:l.quantity,unit_price:l.unit_price,amount:l.unit_price*l.quantity});
      const r = reports.find(r=>r.sku===l.sku_snapshot);
      if (l.commission_rate!=null && r) lines.push({line_id:crypto.randomUUID(),contract_id:c.contract_id,sku_snapshot:l.sku_snapshot,name_snapshot:l.name_snapshot+' — Commission',line_type:'commission',quantity:1,unit_price:r.commission_thb,amount:r.commission_thb,production_report_id:r.report_id});
    }
    if (!lines.length) continue;
    invoices.unshift({...(c.hotel_id ? {hotel_id:c.hotel_id} : {}),invoice_type:'RECURRING',invoice_id:nextInvoiceId(invoices.map(i=>i.invoice_id)),case_number:c.case_number ?? '',contract_ids:[c.contract_id],customer_snapshot:c.customer_snapshot,billing_period_start:item.billing_period,billing_period_end:monthShift(item.billing_period,1,0),lines,totals:computeTotals(lines,c.customer_snapshot.type),status:'issued',issued_at:item.billing_period.slice(0,7)+'-05T00:00:00Z',issued_by:'daily',paid_at:null,created_at:t+'T00:00:00Z',issue_date:item.billing_period.slice(0,7)+'-05',due_date:item.billing_period.slice(0,7)+'-15',customer_segment:'EXISTING',service_line:item.service_line as 'ORM'|'Marcom',paid_amount:0,settled_date:null});
  }
  data = {...data,invoices,billingWaiting:pending};
  return recomputeAccounting(data,t);
}
export function confirmPayment<T extends AccountingData>(data:T, id:string, method:string, amount:number, actor:string, t=bangkokDate()):T {
  const invoice = data.invoices.find(i=>i.invoice_id===id);
  if (!invoice || ['paid','void','draft','written_off'].includes(invoice.status) || amount<=0 || amount>outstandingOf(invoice)+0.005) return data;
  const paid = Math.round(((invoice.paid_amount ?? 0)+amount)*100)/100;
  const full = paid>=invoice.totals.total-0.005;
  const at=t+'T00:00:00Z';
  const invoices=data.invoices.map(i=>i.invoice_id===id?{...i,paid_amount:paid,status:full?'paid' as const:'partially_paid' as const,settled_date:full?t:null,paid_at:full?at:null,payment_records:[...(i.payment_records??[]),{id:crypto.randomUUID(),amount,method,confirmed_at:t,actor}]}:i);
  const reId=taxReceiptIdFor(id);
  const receipt:TaxReceipt={tax_receipt_id:reId,from_invoice_id:id,customer_snapshot:invoice.customer_snapshot,lines:invoice.lines,totals:invoice.totals,payment_method:method,paid_at:at,issued_at:at,status:'issued'};
  return recomputeAccounting({...data,invoices,taxReceipts:full&&!data.taxReceipts.some(r=>r.tax_receipt_id===reId)?[receipt,...data.taxReceipts]:data.taxReceipts,invRequests:full?data.invRequests.map(r=>r.invoice_id===id?{...r,status:'completed' as const}:r):data.invRequests,contracts:full?data.contracts.map(c=>invoice.contract_ids.includes(c.contract_id)?{...c,status:'contract_completed' as const}:c):data.contracts},t);
}