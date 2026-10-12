import { runDailyBilling, type AccountingData } from './ac-v2-engine';

export async function processAccountingDaily() {
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  for(let attempt=0;attempt<3;attempt++) {
    const current=await supabaseAdmin.from('crm_documents').select('*').eq('namespace','crm').maybeSingle();
    if(current.error) throw new Error('Cannot read canonical accounting records');
    if(!current.data) return {created:0,skipped:true};
    const payload=current.data.payload as unknown as AccountingData;
    const updated=runDailyBilling(payload);
    const saved=await supabaseAdmin.rpc('crm_compare_swap',{p_namespace:'crm',p_revision:current.data.revision,p_payload:updated as unknown as import('@/integrations/supabase/types').Json});
    if(!saved.error) return {created:updated.invoices.length-payload.invoices.length,skipped:false};
  }
  throw new Error('Accounting records changed during evaluation');
}