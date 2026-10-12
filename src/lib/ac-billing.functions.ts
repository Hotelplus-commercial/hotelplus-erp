import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const id = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const amount = z.coerce.number().positive().max(9999999999.99);
const text = z.string().trim().min(1).max(200);
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('subscription'), id: id.optional(), hotel_name: text, customer_name: text, contract_name: text, service_line: z.enum(['ORM', 'Marcom']), service_variant: z.enum(['ORM', 'ORM_LITE', 'MT', 'GMB']), monthly_fee: amount, billing_day: z.coerce.number().int().min(1).max(28), due_day: z.coerce.number().int().min(1).max(28), billing_start_date: date, orm_team_id: z.union([id, z.literal('')]).optional(), marcom_member_id: z.union([id, z.literal('')]).optional() }),
  z.object({ action: z.literal('subscription_status'), id, status: z.enum(['ACTIVE', 'PAUSED', 'TERMINATED']) }),
  z.object({ action: z.literal('invoice'), subscription_id: id, invoice_type: z.enum(['SETUP', 'SYSTEM_FEE']), issue_date: date, due_date: date, amount, billing_period: z.string().max(10).optional(), cadence: z.enum(['monthly', 'quarterly']).optional() }),
  z.object({ action: z.literal('payment'), invoice_id: id, gateway_paid_date: date, amount, method: text }),
  z.object({ action: z.literal('verify'), payment_id: id, tax_receipt_no: text }),
  z.object({ action: z.literal('collection'), customer_id: id, event: z.enum(['LEGAL_FILED', 'WRITTEN_OFF', 'SUSPENDED', 'REACTIVATED']), note: z.string().trim().min(1).max(1000) }),
]);
export type AcAction = z.infer<typeof input>;

export const getAcLedger = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: roles, error: roleError } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
  if (roleError) throw new Error('ไม่สามารถตรวจสอบสิทธิ์บัญชี');
  const granted = roles?.map(r => r.role) ?? [];
  if (!granted.some(r => ['ac', 'admin', 'legal', 'billing_reader'].includes(r))) {
    return { authorized: false as const, roles: granted, subscriptions: [], invoices: [], payments: [], grades: [], collections: [], events: [], hotels: [], customers: [], contracts: [], members: [] };
  }
  const [s, i, p, g, c, e, h, cu, co, m] = await Promise.all([
    context.supabase.from('service_subscription').select('*').order('created_at', { ascending: false }),
    context.supabase.from('ac_invoice_attributed').select('*').order('created_at', { ascending: false }),
    context.supabase.from('payment').select('*').order('created_at', { ascending: false }),
    context.supabase.from('payment_grade_record').select('*'),
    context.supabase.from('ac_collection_current').select('*'),
    context.supabase.from('collection_event').select('*').order('sequence', { ascending: false }),
    context.supabase.from('hotel').select('*'), context.supabase.from('customer').select('*'),
    context.supabase.from('contract').select('*'), context.supabase.from('member').select('*'),
  ]);
  if ([s,i,p,g,c,e,h,cu,co,m].some(r => r.error)) throw new Error('ไม่สามารถโหลดข้อมูลบัญชี');
  return { authorized: true as const, roles: granted, subscriptions: s.data ?? [], invoices: i.data ?? [], payments: p.data ?? [], grades: g.data ?? [], collections: c.data ?? [], events: e.data ?? [], hotels: h.data ?? [], customers: cu.data ?? [], contracts: co.data ?? [], members: m.data ?? [] };
});

export const mutateAcLedger = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(value => input.parse(value)).handler(async ({ data, context }) => {
  const result = data.action === 'verify'
    ? await context.supabase.rpc('ac_verify', { p_payment: data.payment_id, p_receipt: data.tax_receipt_no })
    : await context.supabase.rpc('ac_operate', { payload: data });
  if (result.error) throw new Error(result.error.message);
  return { ok: true };
});