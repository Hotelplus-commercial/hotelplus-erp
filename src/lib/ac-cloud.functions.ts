import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { runDailyBilling, type AccountingData } from './ac-v2-engine';
import type { Json } from '@/integrations/supabase/types';

const namespace = z.enum(['crm','hotels']);
const schema = z.object({namespace,revision:z.number().int().nonnegative(),payload:z.record(z.string(),z.unknown())});
export const readAccountingCloud = createServerFn({method:'GET'}).inputValidator(v=>namespace.parse(v)).handler(async({data})=>{
  if (!import.meta.env.DEV) throw new Error('ข้อมูลบัญชีทดสอบเปิดได้เฉพาะโหมดพัฒนา');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const result=await supabaseAdmin.from('crm_documents').select('payload,revision').eq('namespace',data).maybeSingle();
  if(result.error) throw new Error('ไม่สามารถอ่านข้อมูลบัญชี Cloud');
  return result.data;
});
export const saveAccountingCloud = createServerFn({method:'POST'}).inputValidator(v=>schema.parse(v)).handler(async({data})=>{
  if (!import.meta.env.DEV) throw new Error('ข้อมูลบัญชีทดสอบเปิดได้เฉพาะโหมดพัฒนา');
  if(JSON.stringify(data.payload).length>8_000_000) throw new Error('ข้อมูลเกินขนาดที่รองรับ');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const result=await supabaseAdmin.rpc('crm_compare_swap',{p_namespace:data.namespace,p_revision:data.revision,p_payload:data.payload as Json});
  if(result.error) throw new Error('ข้อมูล Cloud เปลี่ยนหรือบันทึกไม่สำเร็จ กรุณาโหลดใหม่ก่อนแก้ไข');
  return {revision:result.data};
});
export const runAccountingDaily = createServerFn({method:'POST'}).handler(async()=>{
  if (!import.meta.env.DEV) throw new Error('ข้อมูลบัญชีทดสอบเปิดได้เฉพาะโหมดพัฒนา');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const current=await supabaseAdmin.from('crm_documents').select('*').eq('namespace','crm').single();
  if(current.error || !current.data) throw new Error('กรุณาย้ายข้อมูลบัญชีไป Cloud ก่อน');
  const updated=runDailyBilling(current.data.payload as unknown as AccountingData);
  const saved=await supabaseAdmin.rpc('crm_compare_swap',{p_namespace:'crm',p_revision:current.data.revision,p_payload:updated as unknown as Json});
  if(saved.error) throw new Error('ข้อมูลเปลี่ยนระหว่างคำนวณ กรุณาลองใหม่');
  return {payload:updated as unknown as Json,revision:saved.data};
});