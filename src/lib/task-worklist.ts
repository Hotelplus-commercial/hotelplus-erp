import { phaseTh, ticketTypeTh, deptTh } from './ps-glossary';
import type { Category, HotelCare, Ticket, MonitorRow } from './task-tickets';
import { responsibleOf, UNASSIGNED, WAITING_LABEL } from './task-tickets';
import type { Dept, L0Ticket } from './tickets-l0';
import { SYSTEM_CREATOR } from './tickets-l0';
import { WORKSPACES } from './workspace-registry';
import { matchesBook, type GlobalFilter, type Period } from './ps-dashboard-global';

import { TASK_CONFIG } from './task-config';
export { TASK_CONFIG } from './task-config';
export type StatusGroup = 'OPEN'|'IN_PROGRESS'|'WAITING'|'CLOSED';
export const GROUP_LABEL: Record<StatusGroup,string> = { OPEN:'เปิด', IN_PROGRESS:'กำลังทำ', WAITING:'รอ', CLOSED:'ปิดแล้ว' };
export const ORIGIN_LABEL = { PS_CASE:'PS เปิดเอง', BOT:'ระบบสร้าง', FOLLOWUP:'ติดตามจากแท็บอื่น' };
export type WorkRow = { work_id:string; source_kind:'CASE'|'L0'; origin:keyof typeof ORIGIN_LABEL; origin_sub:string; hotel_id:string|null; hotel_name:string; title:string; category_label:string; category_key:string; dept:Dept; dept_overridden:boolean; responsible_label:string; responsible_missing:boolean; status_raw:string; status_group:StatusGroup; created_at:string; closed_at:string|null; aging_days:number|null; is_overdue:boolean; workspace_label:string|null; workspace_route:string|null; payload_lines:string[]; search_text:string; case?:Ticket; l0?:L0Ticket };
/** Asia/Bangkok calendar date (YYYY-MM-DD) of an ISO instant. */
export const bkkDay = (iso:string|number) => new Date((typeof iso==='number'?iso:Date.parse(iso))+7*36e5).toISOString().slice(0,10);
const dayNum = (d:string) => Date.parse(`${d}T00:00:00Z`)/864e5;
/** Aging in Bangkok calendar days. */
export const daysBetween = (a:string,b:string) => Math.max(0,dayNum(bkkDay(b))-dayNum(bkkDay(a)));
/** Closed-window rule: Bangkok closed date within the last `windowDays` dates including today. */
export const inClosedWindow = (closedAt:string|null|undefined,now:string,windowDays:number) => { if(!closedAt) return false; const d=dayNum(bkkDay(closedAt)),t=dayNum(bkkDay(now)); return d<=t&&d>t-windowDays; };
export const shortMonth = (date:string) => new Date(date).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
export function statusGroup(s:string):StatusGroup { return ['resolved','closed','DONE','CANCELLED'].includes(s)?'CLOSED':s==='waiting'?'WAITING':['in-progress','ACK','IN_PROGRESS'].includes(s)?'IN_PROGRESS':'OPEN'; }
function l0Title(t:L0Ticket,now:string) { const p=t.payload,s=t.subject_ref,signal=p.signal_detail; switch(t.type) {
case 'GRADE_RISK': return `ลูกหนี้เกรด D${p.event_key && /^\d{4}-\d{2}/.test(p.event_key)?` รอบบิล ${shortMonth(p.event_key.slice(0,7)+'-01')}`:''}`;
case 'RENEWAL_DUE': return `สัญญา${s.service_line||s.gap_service?` ${s.service_line||s.gap_service}`:''} ${signal?.renewal_due_date && signal.renewal_due_date<now.slice(0,10)?'เลยวันหมดอายุ':'ใกล้ครบ'}`;
case 'SURVEY_LOW':return 'คะแนน Survey ต่ำกว่าเกณฑ์';
case 'SERVICING_STALL':return `ค้าง${p.phase?`ใน${phaseTh(p.phase)}`:''}${p.sla_days!=null?` ${p.sla_days} วัน`:''}`;
case 'CONTRACT_FOLLOWUP':return 'ส่งสัญญาแล้วยังไม่เซ็นเกิน 2 วัน';
case 'UPSELL_PITCH':return `เสนอบริการ${s.gap_service?` ${s.gap_service}`:''} เพิ่ม`; default:return t.type; } }
export function getWorklist(cases:Ticket[],tickets:L0Ticket[],categories:Category[],care:HotelCare[],now:string,config=TASK_CONFIG):WorkRow[] {
 const hotels=new Map(care.map(c=>[c.hotel_id,c]));
 const rows:WorkRow[]=cases.map(t=>{ const c=categories.find(c=>c.code===t.category_id),group=statusGroup(t.status),age=group==='CLOSED'?null:daysBetween(t.created_at,now),resp=responsibleOf(t.routed_team,hotels.get(t.hotel_id));return {work_id:t.case_no,source_kind:'CASE',origin:'PS_CASE',origin_sub:'PS เปิดเอง',hotel_id:t.hotel_id,hotel_name:t.hotel_name||'—',title:t.title,category_label:`${c?.domain??t.routed_team} › ${c?.subcategory_label_th??t.category_id}`,category_key:t.category_id,dept:t.routed_team,dept_overridden:!!c&&c.domain!==t.routed_team,responsible_label:resp,responsible_missing:resp===UNASSIGNED,status_raw:t.status+(t.waiting_reason?` · ${WAITING_LABEL[t.waiting_reason]}`:''),status_group:group,created_at:t.created_at,closed_at:t.resolved_at,aging_days:age,is_overdue:(t.status==='open'||t.status==='in-progress')&&(age??0)>config.case_overdue_days,workspace_label:null,workspace_route:null,payload_lines:[],search_text:`${t.hotel_name} ${t.case_no} ${t.title} ${t.description??''}`.toLowerCase(),case:t}; });
 for(const t of tickets) { const group=statusGroup(t.status),ws=WORKSPACES.find(w=>w.dept_key===t.target_dept),title=l0Title(t,now),p=t.payload;
 const closed=group==='CLOSED'?[...t.audit].reverse().find(a=>a.to_status==='DONE'||a.to_status==='CANCELLED')?.at??null:null;
 const lines=[p.severity?`ความรุนแรง: ${{high:'สูง',medium:'กลาง',low:'ต่ำ'}[p.severity]}`:'',p.signal_detail?.grade?`เกรด: ${p.signal_detail.grade}`:'',p.signal_detail?.renewal_due_date?`วันหมดอายุ: ${p.signal_detail.renewal_due_date}`:'',p.signal_detail?.score!=null?`คะแนน: ${p.signal_detail.score}/5`:'',p.assigned_ae?`AE: ${p.assigned_ae.nickname}`:'',p.phase?`ระยะ: ${p.phase}`:'',p.days_in_phase!=null?`ค้างในระยะ: ${p.days_in_phase} วัน`:'',p.readiness_tier?`ความพร้อม: ${p.readiness_tier}`:'',...p.chips,p.note?`หมายเหตุ: ${p.note}`:'',p.condition_cleared_at?'ต้นทางดำเนินการเรียบร้อยแล้ว':''].filter(Boolean);
 rows.push({work_id:t.ticket_id,source_kind:'L0',origin:t.created_by===SYSTEM_CREATOR?'BOT':'FOLLOWUP',origin_sub:t.created_by===SYSTEM_CREATOR?ticketTypeTh(t.type):({SERVICING_STALL:'จากแท็บ Servicing',CONTRACT_FOLLOWUP:'จากแท็บ BD-AC',UPSELL_PITCH:'จากการเสนอขายบริการเพิ่ม'} as Record<string,string>)[t.type]??`จาก ${t.source_app}`,hotel_id:t.subject_ref.hotel_id||null,hotel_name:t.subject_ref.hotel_id?t.subject_ref.hotel_name||'—':'—',title,category_label:ticketTypeTh(t.type),category_key:t.type,dept:t.target_dept,dept_overridden:false,responsible_label:`ทีม ${deptTh(t.target_dept)}`,responsible_missing:false,status_raw:t.status,status_group:group,created_at:t.created_at,closed_at:closed,aging_days:group==='CLOSED'?null:daysBetween(t.created_at,now),is_overdue:false,workspace_label:ws?.label??null,workspace_route:ws?.path??null,payload_lines:lines,search_text:`${t.subject_ref.hotel_name} ${t.ticket_id} ${title} ${p.note}`.toLowerCase(),l0:t}); }
 return rows;
}
export function workInScope(r:WorkRow,f:GlobalFilter,care:HotelCare|undefined) {
 if(f.service!=='ALL') { const dept=f.service==='Marcom'?'MARCOM':f.service;if(r.source_kind==='CASE'){if(r.dept!==dept)return false;}else if(r.dept!==dept&&![r.l0?.subject_ref.service_line,r.l0?.subject_ref.gap_service].some(s=>s?.toUpperCase().startsWith(dept)))return false; }
 if(!r.hotel_id&&(f.search.trim()||f.hotelStatus!=='all'||f.role!=='none'||f.teams.length||f.people.length))return false;
 return matchesBook({hotel_id:r.hotel_id,hotel_name:r.hotel_name,status:care?.status??null,ae_owner_id:care?.ae??null,orm_owner_id:care?.orm?.member??null,marcom_owner_id:care?.marcom?.member??null},{...f,service:'ALL'},true);
}
export function departmentWork(rows:WorkRow[]) { const m=new Map<string,{dept:string;counts:number[];total:number;cases:number;l0:number;others:Record<string,number>}>();for(const r of rows.filter(r=>r.status_group!=='CLOSED')){const dept=['AUTO','HR','OFFICE'].includes(r.dept)?'อื่น ๆ':r.dept; const v=m.get(dept)??{dept,counts:[0,0,0],total:0,cases:0,l0:0,others:{}};const idx=['OPEN','IN_PROGRESS','WAITING'].indexOf(r.status_group);v.counts[idx]=(v.counts[idx]??0)+1;v.total++;r.source_kind==='CASE'?v.cases++:v.l0++;v.others[r.dept]=(v.others[r.dept]??0)+1;m.set(dept,v);}return [...m.values()].sort((a,b)=>a.dept==='อื่น ๆ'?1:b.dept==='อื่น ๆ'?-1:b.total-a.total); }
export type FlowRow = { month:string;hotel_id:string;hotel_name:string;routed_team:string;created_count:number;closed_count:number };
export function monthlyWork(rows:WorkRow[],caseFlow:FlowRow[],p:Period) { const out=[];let d=new Date(p.from.slice(0,7)+'-01T00:00:00Z');const end=p.to.slice(0,7); if(!Number.isFinite(d.getTime()))return []; if(d.getUTCFullYear()<2000){const dates=[...rows.map(r=>r.created_at),...caseFlow.map(r=>r.month)].filter(x=>x>= '2000');d=new Date((dates.sort()[0]??p.to).slice(0,7)+'-01T00:00:00Z');}for(let guard=0;guard<1200&&d.toISOString().slice(0,7)<=end;guard++){const month=d.toISOString().slice(0,7);const c=caseFlow.filter(r=>r.month.slice(0,7)===month),l=rows.filter(r=>r.source_kind==='L0');const caseIn=c.reduce((n,r)=>n+r.created_count,0),caseClosed=c.reduce((n,r)=>n+r.closed_count,0),l0In=l.filter(r=>bkkDay(r.created_at).slice(0,7)===month&&bkkDay(r.created_at)>=p.from&&bkkDay(r.created_at)<=p.to).length,l0Closed=l.filter(r=>!!r.closed_at&&bkkDay(r.closed_at).slice(0,7)===month&&bkkDay(r.closed_at)>=p.from&&bkkDay(r.closed_at)<=p.to).length;out.push({month,caseIn,caseClosed,l0In,l0Closed,in:caseIn+l0In,closed:caseClosed+l0Closed,cancelled:l.filter(r=>r.status_raw==='CANCELLED'&&!!r.closed_at&&bkkDay(r.closed_at).slice(0,7)===month).length});d.setUTCMonth(d.getUTCMonth()+1);}return out; }
export const ageBucket=(age:number,edges:number[])=>{const i=edges.findIndex(e=>age<=e);return i<0?edges.length:i;};
export function monitorScope(rows:MonitorRow[],f:GlobalFilter,care:HotelCare[]) {const m=new Map(care.map(c=>[c.hotel_id,c]));return rows.filter(r=>{const c=m.get(String(r.hotel_id));return matchesBook({...r,ae_owner_id:c?.ae??r.owner_id??r.coach??null,orm_owner_id:c?.orm?.member??null,marcom_owner_id:c?.marcom?.member??null,status:c?.status??null},f,true);});}

/** R1 display: "PS เปิดเอง a · ติดตามจากแท็บอื่น b · ระบบสร้าง c" (zero parts dropped); Σ = rows.length. */
export function sourceSplit(rows: WorkRow[]) {
  const n = (o: WorkRow['origin']) => rows.filter(r => r.origin === o).length;
  const parts = ([['PS_CASE', n('PS_CASE')], ['FOLLOWUP', n('FOLLOWUP')], ['BOT', n('BOT')]] as const).filter(([, v]) => v > 0).map(([k, v]) => `${ORIGIN_LABEL[k]} ${v}`);
  return parts.join(' · ') || '—';
}
