import { describe, expect, test } from 'bun:test';
import { confirmPayment, invoiceGrade, runDailyBilling, recomputeAccounting, collectionStatus, manualCollection, paymentSummary } from '../src/lib/ac-v2-engine';
import { resolveContractHotel, stampInvoiceHotel, attributedOwner } from '../src/lib/ac-attribution';
import { detectStatus } from '../src/lib/hotel-profile';
import { seedContracts, seedCustomers, seedProducts, seedInvoices, seedReports, seedInvRequests, seedLiveLinks } from '../src/lib/crm-seed';

const base = () => ({contracts:seedContracts.map(c=>({...c,status:'contract_completed' as const,start_date:'2026-01-01',duration_months:24})),customers:seedCustomers,products:seedProducts,invoices:seedInvoices,reports:seedReports,invRequests:seedInvRequests,liveLinks:seedLiveLinks,taxReceipts:[]});
describe('AC v2 canonical accounting',()=>{
  test('grade date boundaries',()=>{
    const invoice=seedInvoices[0];
    if(!invoice) throw new Error('Fixture missing');
    expect(invoiceGrade(invoice,'2026-09-15')).toBe('A');
    expect(invoiceGrade(invoice,'2026-09-30')).toBe('B');
    expect(invoiceGrade(invoice,'2026-11-14')).toBe('C');
    expect(invoiceGrade(invoice,'2026-11-15')).toBe('D');
  });
  test('wait for report, issue on arrival and never duplicate',()=>{
    const waiting=runDailyBilling({...base(),reports:[]},'2026-10-05');
    expect(waiting.billingWaiting?.length).toBeGreaterThan(0);
    const issued=runDailyBilling({...waiting,reports:seedReports.map(r=>({...r,period_year:2026,period_month:10}))},'2026-10-06');
    expect(issued.invoices.length).toBeGreaterThan(base().invoices.length);
    expect(runDailyBilling(issued,'2026-10-06').invoices.length).toBe(issued.invoices.length);
  });
  test('partial does not settle; full AC confirmation freezes grade and creates one receipt',()=>{
    const data=base();
    const invoice=data.invoices[0];
    if(!invoice) throw new Error('Fixture missing');
    const partial=confirmPayment(data,invoice.invoice_id,'bank',100,'AC','2026-10-20');
    expect(partial.invoices[0]?.settled_date).toBeNull();
    expect(partial.taxReceipts).toHaveLength(0);
    const full=confirmPayment(partial,invoice.invoice_id,'bank',invoice.totals.total-100,'AC','2026-10-21');
    expect(full.invoices[0]?.settled_date).toBe('2026-10-21');
    expect(full.taxReceipts).toHaveLength(1);
    expect(confirmPayment(full,invoice.invoice_id,'bank',1,'AC','2026-10-21').taxReceipts).toHaveLength(1);
    const paid=full.invoices[0];
    if(!paid) throw new Error('Invoice missing');
    expect(invoiceGrade(paid,'2026-12-15')).toBe('C');
  });
  test('paused contracts have no billing or backfill',()=>{
    const paused=runDailyBilling({...base(),contracts:base().contracts.map(c=>({...c,billing_status:'PAUSED' as const}))},'2026-10-05');
    expect(paused.billingWaiting??[]).toHaveLength(0);
    expect(runDailyBilling({...paused,contracts:base().contracts},'2026-10-06').invoices.length).toBe(paused.invoices.length);
  });
});

describe('AC tightening T1–T4', () => {
  const fixture = () => {
    const data = base();
    const first = seedInvoices[0];
    if (!first) throw new Error('Fixture missing');
    return {...data, invoices:[{...first,invoice_type:'RECURRING' as const,due_date:'2026-09-15',paid_amount:0,status:'issued' as const}],gradeRecords:[],collectionEvents:[]};
  };
  test('only due recurring invoices grade; contaminated historical basis is not retained', () => {
    const data=fixture(); const invoice=data.invoices[0];
    if (!invoice) throw new Error('Fixture missing');
    const mixed={...data,invoices:[invoice,{...invoice,invoice_id:'SETUP',invoice_type:'SETUP' as const},{...invoice,invoice_id:'SYS',invoice_type:'SYSTEM_FEE' as const},{...invoice,invoice_id:'WAIT',due_date:''}],gradeRecords:[{customer_id:invoice.customer_snapshot.customer_id,billing_period:'2026-09-01',grade:'D' as const,basis:['SETUP'],computed_at:'2026-09-16'}]};
    const result=recomputeAccounting(mixed,'2026-09-16');
    expect(result.gradeRecords).toHaveLength(1);
    expect(result.gradeRecords[0]?.basis).toEqual([invoice.invoice_id]);
    expect(result.gradeRecords[0]?.grade).toBe('B');
  });
  test('C overdue, D suspend, full payment reactivates once and preserves PAUSED', () => {
    const data=fixture(); const i=data.invoices[0]; if (!i) throw new Error('Fixture missing');
    const customer=i.customer_snapshot.customer_id;
    const paused={...data,contracts:data.contracts.map(c=>({...c,billing_status:'PAUSED' as const}))};
    const c=recomputeAccounting(paused,'2026-10-12');
    expect(collectionStatus(c,customer,'2026-10-12')).toBe('OVERDUE');
    const d=recomputeAccounting(c,'2026-11-15');
    expect(collectionStatus(d,customer,'2026-11-15')).toBe('SUSPENDED');
    expect(d.contracts.every(c=>c.billing_status==='PAUSED')).toBe(true);
    const paid=confirmPayment(d,i.invoice_id,'bank',i.totals.total,'AC','2026-11-16');
    expect(collectionStatus(paid,customer,'2026-11-16')).toBe('NORMAL');
    expect(paid.collectionEvents[0]?.event_type).toBe('REACTIVATED');
    expect(recomputeAccounting(paid,'2026-11-17').collectionEvents.length).toBe(paid.collectionEvents.length);
  });
  test('LEGAL and WRITTEN_OFF stay terminal until manual zero-balance reactivation', () => {
    const data=fixture(); const i=data.invoices[0]; if (!i) throw new Error('Fixture missing');
    const customer=i.customer_snapshot.customer_id;
    const legal=manualCollection(data,customer,'LEGAL','legal case','AC','2026-10-12');
    const paid=confirmPayment(legal,i.invoice_id,'bank',i.totals.total,'AC','2026-10-13');
    expect(collectionStatus(paid,customer,'2026-10-13')).toBe('LEGAL');
    expect(collectionStatus(manualCollection(paid,customer,'REACTIVATED','cleared','AC','2026-10-13'),customer)).toBe('NORMAL');
    const written=manualCollection(legal,customer,'WRITTEN_OFF','approved','AC','2026-10-12');
    expect(collectionStatus(recomputeAccounting(written,'2027-01-01'),customer)).toBe('WRITTEN_OFF');
    expect(collectionStatus(manualCollection(written,customer,'REACTIVATED','cleared','AC'),customer)).toBe('NORMAL');
  });
  test('score derives from current recurring grade; lifecycle ignores debt', () => {
    const data=fixture(); const i=data.invoices[0]; if (!i) throw new Error('Fixture missing');
    const current=recomputeAccounting(data,'2026-09-16');
    const summary=paymentSummary(current,{id:'unknown',name:i.customer_snapshot.hotel_name},'2026-09-16');
    expect(summary.grade).toBe('B'); expect(summary.score).toBe(75);
    expect(summary.collection).toBe('NORMAL'); expect(summary.unpaidMonths).toBe(1);
    expect(detectStatus({terminated:false})).toBe('active');
  });
  test('stable identity persists after rename; ambiguous and unresolved hotels skip attribution', () => {
    const data=fixture(); const c=data.contracts[0]; const i=data.invoices[0];
    if (!c || !i) throw new Error('Fixture missing');
    const resolved=resolveContractHotel(c,data.customers);
    expect(resolved.hotel_id).toBeTruthy();
    expect(resolveContractHotel({...resolved,customer_snapshot:{...resolved.customer_snapshot,hotel_name:'Renamed'}},data.customers).hotel_id).toBe(resolved.hotel_id);
    expect(resolveContractHotel(c,data.customers,[{id:'1',name:c.customer_snapshot.hotel_name},{id:'2',name:c.customer_snapshot.hotel_name}]).hotel_id).toBeUndefined();
    const stamped=stampInvoiceHotel({...i,contract_ids:[c.contract_id]},[resolved]);
    expect(stamped.hotel_id).toBe(resolved.hotel_id);
    const hotel=resolved.hotel_id ?? '';
    expect(attributedOwner({...stamped,service_line:'ORM'},[{property_id:hotel,service:'ORM',orm_team:'team-current'},{property_id:hotel,service:'MARCOM_MT',marcom_member_id:'marcom-current'}])?.owner).toBe('team-current');
    expect(attributedOwner({...stamped,service_line:'Marcom'},[{property_id:hotel,service:'ORM',orm_team:'team-current'},{property_id:hotel,service:'MARCOM_MT',marcom_member_id:'marcom-current'}])?.owner).toBe('marcom-current');
    expect(attributedOwner({...i,service_line:'ORM'},[])).toBeNull();
  });
});