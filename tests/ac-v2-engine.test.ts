import { describe, expect, test } from 'bun:test';
import { confirmPayment, invoiceGrade, runDailyBilling } from '../src/lib/ac-v2-engine';
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