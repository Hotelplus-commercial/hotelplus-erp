import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ServicingReport, ServicingRow, PhaseTimeRow } from "./servicing-dashboard-types";
import type { StallCandidate } from './servicing-stall';
import { phaseConfig, servicingLanes } from './servicing-time';

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

/** Daily BOT consumes only explicit Cloud red candidates and explicit finished lane projections. */
export const readServicingBotSignals = createServerFn({method:'GET'}).handler(async ():Promise<StallCandidate[]>=>{
 const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];
 if(!url||!key)throw new Error('อ่านสัญญาณ Servicing ไม่สำเร็จ');
 const client=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
 const out:StallCandidate[]=[];
 for(let offset=0;;offset+=1000){
  const result=await client.from('v_servicing_stall_candidates').select('*').range(offset,offset+999);
  if(result.error)throw new Error('อ่านสัญญาณ Servicing ไม่สำเร็จ');
  const page=result.data??[];
  for(const hit of page){
   if(!hit.card_id||!hit.hotel_id||!['P1','P2','P3'].includes(hit.phase??'')||!['AE','Specialist','ORM','Marcom'].includes(hit.lane??'')||hit.d==null)continue;
   const phase=hit.phase as 'P1'|'P2'|'P3',lane=hit.lane as 'AE'|'Specialist'|'ORM'|'Marcom';
   if(hit.d<=phaseConfig(phase).sla)continue;
   const row:ServicingRow={card_id:hit.card_id,hotel_id:hit.hotel_id,hotel_name:hit.hotel_name??hit.hotel_id,service_line:hit.service_line==='ORM'?'ORM':'MARCOM',service_variant:hit.service_variant,current_stage:hit.current_stage??'',created_at:'',stage_entered_at:null,go_live_at:null,progress_done:0,progress_total:0,last_updated:null,ae_owner_id:lane==='AE'?hit.owner_id:null,specialist_id:lane==='Specialist'?hit.owner_id:null,orm_team:lane==='ORM'?hit.owner_id:null,marcom_owner_id:lane==='Marcom'?hit.owner_id:null};
   out.push({row,lane:{phase,lane,state:'running',tone:'red',d:hit.d,start_at:null,end_at:null,wait_until:null}});
  }
  if(page.length<1000)break;if(offset>=99000)throw new Error('ข้อมูล Servicing เกินขนาดที่รองรับ');
 }
 for(let offset=0;;offset+=1000){
  const result=await client.from('v_servicing_stage_cards').select('*').range(offset,offset+999);
  if(result.error)throw new Error('อ่านสัญญาณ Servicing ไม่สำเร็จ');
  const page=(result.data??[]) as unknown as ServicingRow[];
  for(const row of page){for(const lane of row.lanes??servicingLanes(row,new Date().toISOString()))if(lane.state==='done'||row.go_live_at)out.push({row,lane,ended:true});}
  if(page.length<1000)break;if(offset>=99000)throw new Error('ข้อมูล Servicing เกินขนาดที่รองรับ');
 }
 return out;
});
