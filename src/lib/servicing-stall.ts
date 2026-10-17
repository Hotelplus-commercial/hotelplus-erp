import { createTask, findAnyByEvent, findOpenByEvent, refreshBotTicket, stampConditionCleared, SYSTEM_CREATOR, ticketSnapshot, type Dept } from './tickets-l0';
import { phaseConfig, stallEventKey, type ServicingLane } from './servicing-time';
import type { ServicingRow } from './servicing-dashboard-types';
export type StallCandidate = { row:ServicingRow; lane:ServicingLane; ended?:boolean };
type RosterMember={id:string;nickname:string;active:boolean;flags?:string[]};
export function stallRouting(lane:ServicingLane, roster:RosterMember[]=[]) {
 const role=lane.lane==='ORM'?'GRM':lane.lane==='Marcom'?'MARCOM_LEAD':'PM';
 const dept:Dept=role==='GRM'?'ORM':role==='MARCOM_LEAD'?'MARCOM':'PS';
 const name=role==='MARCOM_LEAD'?'Marcom Team Lead':role;
 const member=roster.find(m=>m.active&&m.flags?.includes(role)), pm=roster.find(m=>m.active&&m.flags?.includes('PM'));
 return {target_dept:dept,recipient:name,recipient_member_id:member?.id??null,watchers:dept==='PS'?[]:[{dept:'PS' as const,member_id:pm?.id??null,nickname:pm?.nickname??'PM'}]};
}
export function createServicingStall(row:ServicingRow,lane:ServicingLane,bot=false,roster:RosterMember[]=[],round?:string) {
 const routing=stallRouting(lane,roster), cfg=phaseConfig(lane.phase);
 return createTask({type:'SERVICING_STALL',target_dept:routing.target_dept,created_by:bot?SYSTEM_CREATOR:'PM',source_app:bot?'PS_DASHBOARD_BOT':'PS_DASHBOARD',subject_ref:{card_id:row.card_id,hotel_id:row.hotel_id,hotel_name:row.hotel_name,service_line:row.service_line??'',service_variant:row.service_variant??'',gap_service:''},payload:{readiness_tier:'',chips:[],note:'',phase:lane.phase,lane:lane.lane,days_in_phase:lane.d??0,sla_days:cfg.sla,...('target'in cfg?{target_days:cfg.target}:{}),...(lane.tone?{tone:lane.tone}:{}),current_stage:row.current_stage,owner_id:lane.lane==='AE'?row.ae_owner_id:lane.lane==='Specialist'?row.specialist_id:row.orm_team??row.marcom_owner_id,event_key:stallEventKey(row.card_id,lane),recipient:routing.recipient,recipient_member_id:routing.recipient_member_id,watchers:routing.watchers,...(round?{generated_round:round}:{})}});
}
/** Consumes explicit projection signals only; empty input never means cleared. */
export function runServicingStallBot(candidates:StallCandidate[],now:string,roster:RosterMember[]=[]) {
 let created=0,skipped=0,cleared=0;
 for(const {row,lane,ended} of candidates){
   const key=stallEventKey(row.card_id,lane), open=findOpenByEvent('SERVICING_STALL',row.hotel_id,key);
   if(ended||row.go_live_at||lane.state==='done') { if(open&&stampConditionCleared(open.ticket_id))cleared++; continue; }
   if(lane.state!=='running'||lane.tone!=='red')continue;
   if(findAnyByEvent('SERVICING_STALL',row.hotel_id,key)){if(open)refreshBotTicket(open.ticket_id,{days_in_phase:lane.d??0,tone:lane.tone,generated_round:now.slice(0,10)});skipped++;continue;}
   createServicingStall(row,lane,true,roster,now.slice(0,10));created++;
 }
 return {created,skipped,cleared};
}
export function clearEndedStallTickets(rows:ServicingRow[]) {
 for(const t of ticketSnapshot().filter(t=>t.type==='SERVICING_STALL')){
   const row=rows.find(r=>r.card_id===t.subject_ref.card_id);if(!row)continue;
   const lane=row.lanes?.find(l=>l.phase===t.payload.phase&&l.lane===t.payload.lane&&l.state==='done');
   if(row.go_live_at||lane)stampConditionCleared(t.ticket_id);
 }
}