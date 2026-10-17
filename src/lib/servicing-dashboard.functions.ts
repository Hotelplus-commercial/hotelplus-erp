import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ServicingReport, ServicingRow, PhaseTimeRow } from "./servicing-dashboard-types";

/** Reads only the granted v_servicing_stage_cards projection (empty + pending until seed+C5). */
export const readServicingDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<ServicingReport> => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("อ่านรายงาน Servicing ไม่ได้");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const rows: ServicingRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client.from("v_servicing_stage_cards").select("*").range(offset, offset + 999);
    if (result.error) throw new Error("อ่านรายงาน Servicing ไม่สำเร็จ");
    const page = (result.data ?? []) as unknown as ServicingRow[];
    rows.push(...page);
    if (page.length < 1000) break;
    if (offset >= 99000) throw new Error("ข้อมูล Servicing เกินขนาดที่รองรับ");
  }
  const phaseRows: PhaseTimeRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client.from('v_servicing_phase_time').select('*').range(offset,offset+999);
    if(result.error) throw new Error('อ่านเวลาราย owner ไม่สำเร็จ');
    const page=(result.data??[]) as unknown as PhaseTimeRow[];
    phaseRows.push(...page); if(page.length<1000)break;
    if(offset>=99000)throw new Error('ข้อมูล Servicing เกินขนาดที่รองรับ');
  }
  return { rows:rows.filter(r=>r.service_variant!=null), phaseRows, pending: rows.length === 0 };
});
