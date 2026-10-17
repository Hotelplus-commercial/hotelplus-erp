import type { ServicingLane } from './servicing-time';
/** A projection adapter may pass the existing v1.1 assign.* transition log. No browser reads here. */
export function ownerAtPhaseEnd(lane:ServicingLane,end:string,current:string|null,log:{field:string;old_value:string;new_value:string;at:string}[]) {
 const field=lane.lane==='AE'?'assign.assigned_ae_id':lane.lane==='Specialist'?'assign.assigned_specialist_id':lane.lane==='ORM'?'assign.orm_team':'assign.marcom_member_id';
 const atEnd=log.filter(l=>l.field===field&&l.at<=end).sort((a,b)=>b.at.localeCompare(a.at))[0];
 return {owner_id:atEnd?.new_value||current,fallback:!atEnd};
}