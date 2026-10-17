import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { FlowRow } from './task-worklist';
export const readTaskFlow = createServerFn({method:'GET'}).handler(async ():Promise<FlowRow[]> => {
 const key=process.env['SUPABASE_PUBLISHABLE_KEY']; const url=process.env['SUPABASE_URL'];
 if(!key||!url)throw new Error('อ่านข้อมูลงานรายเดือนไม่สำเร็จ');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
 const rows:FlowRow[]=[];for(let from=0;;from+=1000){const r=await client.from('v_task_flow_monthly').select('*').order('month').order('hotel_id').order('routed_team').range(from,from+999);if(r.error)throw new Error('อ่านข้อมูลงานรายเดือนไม่สำเร็จ');rows.push(...r.data as FlowRow[]);if(r.data.length<1000)break;}return rows;
});
