import type { PhaseTimeRow, ServicingRow } from './servicing-dashboard-types';
import { calendarDays, laneTone, servicingLanes } from './servicing-time';
export const SERVICING_DEMO_NOW = '2026-10-17T09:07:00.000Z';
const ago = (n: number, end = SERVICING_DEMO_NOW) => new Date(new Date(end).getTime() - n * 86_400_000).toISOString();
const inFlight: [string,string,string,number,number,string,string|null,number|null,number|null,number|null,number|null,number|null][] = [
 ['บ้านริมน้ำ รีสอร์ท','ORM','collect_data',4,2,'Nont','B',6,null,null,null,null,null],
 ['ลานนา คอร์ทยาร์ด','ORM','property_pending',6,3,'Fern','A',4,null,null,null,null,null],
 ['สยาม ฮาร์เบอร์','ORM','final_check',9,2,'Boss','C',9,null,null,null,null,null],
 ['เจ้าพระยา ลอฟท์','ORM','approved',8,1,'Nont','D',10,1,null,null,null,null],
 ['กระบี่ คลิฟไซด์','ORM','orm_prepare_data',12,5,'Fern','B',null,6,4,null,null,null],
 ['หัวหิน บรีซ','ORM','orm_prepare_data',14,8,'Boss','E',8,9,null,5,null,null],
 ['นิมมาน สวีท','ORM','orm_rate_structure',13,4,'Nont','A',10,7,3,6,null,null],
 ['สมุย ปาล์ม','ORM','orm_final_setup',22,3,'Fern','C',10,15,3,5,5,null],
 ['ภูเก็ต โอลด์ทาวน์ อินน์','ORM','completed_handover',25,4,'Boss','D',10,18,4,5,8,null],
 ['พัทยา เบย์ฟรอนท์','ORM','orm_system_training',17,1,'Nont','E',10,10,3,5,2,null],
 ['อยุธยา เฮอริเทจ','ORM','approved',9,2,'Fern',null,9,2,null,null,null,null],
 ['เชียงราย ฮิลไซด์','MARCOM_META_TIKTOK','introduction_sent_form',2,1,'Boss','แนน',null,null,null,null,null,null],
 ['บางแสน ซีวิว','MARCOM_META_TIKTOK','marcom_prepare_data',15,7,'Nont',null,7,7,null,null,null,null],
 ['เขาใหญ่ ลอดจ์','MARCOM_META_TIKTOK','marcom_first_sync',16,1,'Fern','บิว',10,9,null,5,1,null],
 ['หาดใหญ่ เซ็นทรัล','MARCOM_GMB','marcom_prepare_data',16,9,'Boss','โบว์',8,9,null,null,null,null],
];
type Finished = [string,string,number,number|null,number,number,number,string,string,string];
const finished: Finished[] = [
 ['ริเวอร์ไซด์ ชาร์ม','ORM',5,4,6,5,3,'05-08','A','Nont'],['สุขุมวิท การ์เด้น','ORM',7,5,5,6,4,'05-21','B','Fern'],['ลันตา แซนด์ส','ORM',4,3,6,3,2,'06-03','C','Boss'],['แม่ริม วัลเลย์','ORM',9,6,8,7,5,'06-12','D','Nont'],['กาญจน์ แพริมน้ำ','ORM',6,4,5,4,3,'06-25','E','Fern'],['พีพี ฮอไรซัน','ORM',5,8,7,5,6,'07-04','A','Boss'],['ระยอง เบย์','ORM',8,4,6,9,4,'07-18','B','Nont'],['สาทร เรสซิเดนซ์','ORM',3,3,4,2,2,'07-18','C','Fern'],['อุดร แกรนด์','ORM',6,5,9,6,8,'08-09','D','Boss'],['ตราด ไอส์แลนด์ วิลล่า','ORM',5,4,5,3,3,'08-09','E','Nont'],['น่าน เฮอริเทจ','ORM',7,6,6,5,5,'09-05','A','Fern'],['เลย มิสท์ รีสอร์ท','ORM',4,3,5,4,4,'09-18','B','Boss'],['สีลม บูทีค','ORM',6,4,6,6,3,'10-02','C','Nont'],['กะตะ ซันเซ็ท','ORM',5,5,7,4,4,'10-02','D','Fern'],
 ['กระบี่ คลิฟไซด์','MARCOM_META_TIKTOK',4,null,5,3,2,'05-15','แนน','Fern'],['ปาย วัลเลย์','MARCOM_META_TIKTOK',6,null,4,4,1,'06-18','บิว','Nont'],['ชุมพร ชอร์','MARCOM_META_TIKTOK',5,null,6,5,3,'07-22','โบว์','Boss'],['สุโขทัย โลตัส','MARCOM_META_TIKTOK',3,null,5,2,2,'08-27','เจน','Fern'],['ราชบุรี ฟาร์มสเตย์','MARCOM_META_TIKTOK',7,null,6,4,4,'09-24','แนน','Nont'],
 ['นิมมาน สวีท','MARCOM_GMB',5,null,6,0,0,'06-08','บิว','Nont'],['อารีย์ สตูดิโอ','MARCOM_GMB',4,null,8,0,0,'08-27','โบว์','Boss'],['โคราช พลาซ่า','MARCOM_GMB',6,null,5,0,0,'10-06','เจน','Fern'],
];
const hotelId = (name: string) => `SV-${name}`;
const base = (id: string, name: string, variant: string, ae: string, owner: string|null): ServicingRow => ({ card_id:id, hotel_id:hotelId(name), hotel_name:name, service_line:variant === 'ORM' ? 'ORM':'MARCOM', service_variant:variant, current_stage:'', created_at:'', stage_entered_at:null, go_live_at:null, progress_done:0, progress_total:0, last_updated:null, ae_owner_id:ae, specialist_id:'Dao', orm_team:variant === 'ORM' ? owner:null, marcom_owner_id:variant !== 'ORM' ? owner:null, owner_label:variant === 'ORM' ? `ORM Team ${owner}`:`Marcom ${owner}`, hotel_status:'ACTIVE' });
export function demoServicingRows(): ServicingRow[] {
 const current = inFlight.map(([name,v,stage,N,X,ae,owner,form,approved,spec,meeting,p3],i) => {
   const r = base(`c${i+1}`,name,v,ae,owner); r.current_stage=stage; r.created_at=ago(N); r.stage_entered_at=ago(X); r.stage_events=[{stage_key:stage,entered_at:r.stage_entered_at}];
   if (approved != null) r.stage_events.push({stage_key:'approved',entered_at:ago(approved)});
   if (spec != null && approved != null) r.specialist_handover_done_at=ago(approved-spec);
   if (meeting != null && approved != null) r.meeting_created_at=ago(approved-meeting);
   if (p3 != null) r.meeting_date=ago(p3).slice(0,10);
   if (i===5) r.meeting_date='2026-10-24';
   if (i===6) r.meeting_date='2026-10-24';
   r.row2_complete=i!==8;
   r.form_required_total=i===4 ? 0:form==null ? null:10; r.form_required_filled=form; r.form_all_pct=i===4 ? 70:form==null ? null:form*10; r.form_status=form===10 ? 'submitted':form==null && i!==4 ? null:'partial';
   return r;
 });
 const live=finished.map(([name,v,p1,spec,p2,wait,p3,date,owner,ae],i)=>{
   const r=base(`g${i+1}`,name,v,ae,owner), end=`2026-${date}T09:07:00.000Z`, total=p1+p2+wait+p3;
   r.created_at=ago(total,end); r.go_live_at=end; r.stage_entered_at=end; r.current_stage=v==='ORM'?'orm_go_live':'marcom_go_live'; r.stage_events=[{stage_key:'approved',entered_at:ago(p2+wait+p3,end)},{stage_key:r.current_stage,entered_at:end}];
   if(spec!=null) r.specialist_handover_done_at=ago(p2+wait+p3-spec,end);
   if(v!=='MARCOM_GMB'){ r.meeting_created_at=ago(wait+p3,end); r.meeting_date=ago(p3,end).slice(0,10); }
   r.form_required_total=10;r.form_required_filled=10;r.form_all_pct=100;r.form_status='submitted';r.row2_complete=true;return r;
 });
 return [...current,...live];
}
export function demoServicingPhases(rows=demoServicingRows()): PhaseTimeRow[] { return rows.flatMap(r=> !r.go_live_at ? []:servicingLanes(r,SERVICING_DEMO_NOW).flatMap(l=>l.state==='done'&&l.start_at&&l.end_at?[{card_id:r.card_id,hotel_id:r.hotel_id,hotel_name:r.hotel_name,service_variant:r.service_variant??'',phase:l.phase,lane:l.lane,days:calendarDays(l.start_at,l.end_at),zone:laneTone(l.phase,calendarDays(l.start_at,l.end_at)),owner_id_at_end:l.lane==='AE'?r.ae_owner_id:l.lane==='Specialist'?r.specialist_id:r.orm_team??r.marcom_owner_id,owner_label:l.lane==='AE'?`AE ${r.ae_owner_id}`:l.lane==='Specialist'?`Specialist ${r.specialist_id}`:r.owner_label??'—',go_live_at:r.go_live_at??'',owner_fallback:false}]:[])); }