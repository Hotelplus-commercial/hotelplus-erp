import { createServerFn } from '@tanstack/react-start';

/*
 * PS Dashboard · AC tab — read-only reads of the existing v_ac_* views (C5: dashboard reads
 * the cloud mirror, never browser storage). Returns aggregated view rows only; never writes.
 * Test mode (no auth) — close before production together with Cloud Sync writes.
 */
const VIEWS = ['v_ac_debtors','v_ac_invoices_breakdown','v_ac_invoice_ranking','v_ac_grade_distribution','v_ac_overdue','v_ac_suspended','v_ac_legal','v_ac_system_fee'] as const;
type Row = Record<string, string | number | boolean | null>;

export const readAcDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const out = {} as Record<(typeof VIEWS)[number], Row[]>;
  for (const v of VIEWS) {
    const r = await supabaseAdmin.from(v).select('*').limit(2000);
    if (r.error) throw new Error('อ่านรายงาน AC ไม่สำเร็จ');
    out[v] = (r.data ?? []) as Row[];
  }
  return out;
});
