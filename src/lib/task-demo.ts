import type { Category, HotelCare, MonitorRow, Ticket } from './task-tickets';
import type { Dept, L0Ticket, L0Status, TicketType } from './tickets-l0';
import type { FlowRow } from './task-worklist';
export const TASK_DEMO_NOW='2026-10-17T12:00:00.000Z';
const date=(month:number,day:number)=>`2026-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T09:00:00.000Z`;
export function taskDemo(categories:Category[],hotels:HotelCare[]) {
 const cases:Ticket[]=[],tickets:L0Ticket[]=[];let seq=0;
 const add=(dept:Dept,status:string,kind:'CASE'|'L0')=>{const i=seq++,h=hotels[i%hotels.length];if(!h)return;const at=date(10,16); if(kind==='CASE'){const c=categories.find(c=>c.domain===dept)??categories[0];if(!c)return;cases.push({id:`task-demo-case-${i}`,case_no:`Case-${String(i+1).padStart(6,'0')}`,hotel_id:h.hotel_id,hotel_name:h.hotel_name,title:['ตรวจสอบราคาและข้อมูลโรงแรม','ติดตามเอกสารจากลูกค้า','ตรวจสอบแผนบริการ'][i%3],description:'ข้อมูลสาธิต',category_id:c.code,routed_team:c.domain,status:status as Ticket['status'],waiting_reason:status==='waiting'?'CUSTOMER':null,created_by:'PM (Alex)',created_at:at,updated_at:at,resolved_at:status==='resolved'?date(10,10):null,revision:0});} else {const types:TicketType[]=['GRADE_RISK','RENEWAL_DUE','SERVICING_STALL','CONTRACT_FOLLOWUP','UPSELL_PITCH'];const type=types[i%5];tickets.push({ticket_id:`TKT-DEMO-${String(i+1).padStart(6,'0')}`,type,source_app:type==='GRADE_RISK'||type==='RENEWAL_DUE'?'PS_DASHBOARD_BOT':'PS_DASHBOARD',created_by:type==='GRADE_RISK'||type==='RENEWAL_DUE'?'SYSTEM:THE_OFFICE':'PM',target_dept:dept,subject_ref:{hotel_id:h.hotel_id,hotel_name:h.hotel_name,gap_service:'Marcom',service_line:dept==='MARCOM'?'Marcom':'ORM'},payload:{readiness_tier:'',chips:[],note:'ติดตามงานจากต้นทาง',event_key:'2026-10',signal_detail:{grade:'D',renewal_due_date:'2026-10-23'},phase:'P2',sla_days:7,days_in_phase:10},status:status as L0Status,created_at:at,revision:0,audit:[{at,by:'PM',from_status:null,to_status:'NEW'},...(['DONE','CANCELLED'].includes(status)?[{at:date(10,10),by:'PM' as const,from_status:'IN_PROGRESS' as const,to_status:status as L0Status}]:[])]});}};
 const open:[Dept,number[],number[]][]=[['ORM',[2,2,2],[1,2]],['MARCOM',[1,1,2],[1,1]],['BD',[0,0,0],[3,2]],['PS',[1,0,1],[1,2]],['AC',[1,0,1],[1,1]],['AUTO',[0,0,0],[1,0]],['OFFICE',[0,0,0],[0,1]]];
 for(const [dept,c,l]of open){c.forEach((n,j)=>{for(let k=0;k<n;k++)add(dept,['open','in-progress','waiting'][j]??'open','CASE');});l.forEach((n,j)=>{for(let k=0;k<n;k++)add(dept,j===0?'NEW':'ACK','L0');});}
 // 59 closures in May–Oct; 21 fall in the last 30 days (Sep 13 + Oct 8).
 const closed=[7,9,12,10,13,8];closed.forEach((n,j)=>{for(let k=0;k<n;k++){add(k%2?'ORM':'PS',k%2?'resolved':k===0&&j===5?'CANCELLED':'DONE',k%2?'CASE':'L0');const t=k%2?cases[cases.length-1]:tickets[tickets.length-1];if(!t)continue;const at=date(j+5,j===4?25:10);if('resolved_at'in t)t.resolved_at=at;else t.audit[t.audit.length-1]={at,by:'PM',from_status:'IN_PROGRESS',to_status:t.status};}});
 // One raw spine: fix eight actionable cases, then allocate remaining creation slots chronologically.
 const all=[...cases,...tickets];
 const actionable=cases.filter(t=>t.status==='open'||t.status==='in-progress');
 actionable.forEach((t,i)=>{t.created_at=i<5?date(10,1):date(10,16);});
 const others=all.filter(t=>!actionable.includes(t as Ticket)).sort((a,b)=>{
  const close=(t:Ticket|L0Ticket)=>'resolved_at'in t?t.resolved_at??'9999':t.audit.find(x=>x.to_status==='DONE'||x.to_status==='CANCELLED')?.at??'9999';return close(a).localeCompare(close(b));
 });
 const creation=[...Array(18).fill(date(4,10)),...[9,11,10,14,16,4].flatMap((n,j)=>Array(n).fill(date(j+5,1)))];
 others.forEach((t,i)=>{t.created_at=creation[i]??date(4,10);if('updated_at'in t)t.updated_at=t.created_at;if('audit'in t&&t.audit[0])t.audit[0].at=t.created_at;});
 const override=cases.find(t=>t.routed_team==='MARCOM');if(override)override.category_id=categories.find(c=>c.domain==='ORM')?.code??override.category_id;
 const missing=cases.find(t=>t.routed_team==='ORM');const missingHotel=hotels.find(h=>h.orm&&!h.orm.member);if(missing&&missingHotel){missing.hotel_id=missingHotel.hotel_id;missing.hotel_name=missingHotel.hotel_name;}
 const base=(i:number)=>{const h=hotels[i%hotels.length];return {hotel_id:h?.hotel_id??null,hotel_name:h?.hotel_name??'—',service_line:i%2?'Marcom':'ORM'};};
 const coaching:MonitorRow[]=[];[['GRM',3,2,6],['Marcom Team Lead',2,1,4],['PM',1,0,2]].forEach(([coach,a,b,age],j)=>{for(let i=0;i<Number(a)+Number(b);i++)coaching.push({...base(j+i),coach:String(coach),status:i<Number(a)?'open':'in-progress',age_days:Number(age),resolved_30:0});});
 const unassigned:MonitorRow[]=[];[['ORM',[1,1,1]],['Marcom',[2,0,0]],['AE',[0,1,0]]].forEach(([role,counts])=>(counts as number[]).forEach((n,j)=>{for(let i=0;i<n;i++)unassigned.push({...base(i+j),role:String(role),age_days:[2,5,9][j]});}));
 const streams:MonitorRow[]=[];[['renewal',[20,18,12,9,3,-2,-4]],['onboarding',[1,2,2,3,5,6,7,10,16]],['survey',[6,7,10,16]]].forEach(([stream,ages])=>(ages as number[]).forEach((age,i)=>streams.push({...base(i),stream:String(stream),age_days:age,deadline:date(10,17+Math.min(10,age)).slice(0,10),overdue:stream==='renewal'?age<0:stream==='survey'?age>5:age>3,owner_id:'Nont',renewed:false})));
 const flow:FlowRow[]=[];for(const t of cases){for(const [at,kind]of [[t.created_at,'created'],[t.resolved_at,'closed']]as const){if(at)flow.push({month:at.slice(0,7)+'-01',hotel_id:t.hotel_id,hotel_name:t.hotel_name,routed_team:t.routed_team,created_count:kind==='created'?1:0,closed_count:kind==='closed'?1:0});}}
 return {cases,tickets,flow,monitor:{v_task_coaching_backlog:coaching,v_task_unassigned:unassigned,v_task_deadline_streams:streams}};
}
