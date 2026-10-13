import { createServerFn } from '@tanstack/react-start';
import { PS_VIEWS, type PsReport, type PsReportRow } from './ps-dashboard-types';

/** Public testing report: fixed safe projections only; never returns document payloads or credentials.
 * Existing no-auth testing convention. Must be protected before production financial use. */
export const readPsDashboard = createServerFn({ method: 'GET' }).handler(async (): Promise<PsReport> => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const entries = await Promise.all(PS_VIEWS.map(async view => {
    const rows: PsReportRow[] = [];
    // Explicit pagination: never silently truncate reporting counts at the API default limit.
    for (let offset = 0; ; offset += 1000) {
      const result = await supabaseAdmin.from(view).select('*').range(offset, offset + 999);
      if (result.error) throw new Error('อ่านรายงาน PS ไม่สำเร็จ');
      const page = (result.data ?? []) as PsReportRow[];
      rows.push(...page);
      if (page.length < 1000) break;
      if (offset >= 99000) throw new Error('ข้อมูลรายงาน PS เกินขนาดที่รองรับ');
    }
    return [view, rows] as const;
  }));
  const views = Object.fromEntries(entries) as PsReport['views'];
  return { views, pending: PS_VIEWS.filter(view => views[view].length === 0) };
});