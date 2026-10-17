import {describe,expect,test} from 'bun:test';
import {demoServicingRows,demoServicingPhases,SERVICING_DEMO_NOW} from '../src/lib/servicing-demo';
import {calendarDays,cardStatus,meetingDatePatch,servicingLanes,ORM_REPORT_STAGES} from '../src/lib/servicing-time';
import {servicingStats,median} from '../src/lib/servicing-dashboard-types';
import {quantile} from '../src/lib/ps-servicing';
const rows=demoServicingRows(),phases=demoServicingPhases();
describe('Servicing v2 concrete rules',()=>{
 test('37 cards, 35 hotels, 22 live, 15 in progress, 2 gaps',()=>{expect(servicingStats(rows)).toEqual({cards:37,hotels:35,goLive:22,inProgress:15,awaiting:2});});
 test('four red and four amber, meeting wait uncounted',()=>{const states=rows.filter(r=>!r.go_live_at).map(r=>cardStatus(servicingLanes(r,SERVICING_DEMO_NOW)));expect(states.filter(s=>s.tone==='red')).toHaveLength(4);expect(states.filter(s=>s.tone==='amber')).toHaveLength(4);expect(cardStatus(servicingLanes(rows[6],SERVICING_DEMO_NOW)).label).toBe('รอ · ไม่นับ');});
 test('exact SLA text on day 7 and day 9',()=>{expect(cardStatus(servicingLanes(rows[12],SERVICING_DEMO_NOW)).label).toBe('ครบ SLA วันนี้');expect(cardStatus(servicingLanes(rows[2],SERVICING_DEMO_NOW)).label).toBe('เกิน SLA แล้ว 2 วัน');});
 test('ORM phase medians and ok counts',()=>{const p2=phases.filter(r=>r.lane==='ORM'&&r.phase==='P2'),p3=phases.filter(r=>r.lane==='ORM'&&r.phase==='P3');expect(median(p2.map(r=>r.days))).toBe(6);expect(p2.filter(r=>r.zone==='ok')).toHaveLength(5);expect(median(p3.map(r=>r.days))).toBe(4);expect(p3.filter(r=>r.zone==='ok')).toHaveLength(6);expect(Math.round(11/28*100)).toBe(39);});
 test('overall ORM preserves existing interpolated IQR, not conflicting rounded spec',()=>{const d=rows.filter(r=>r.go_live_at&&r.service_line==='ORM').map(r=>calendarDays(r.created_at,r.go_live_at??'')).sort((a,b)=>a-b);expect(median(d)).toBe(20.5);expect(quantile(d,.25)).toBe(17.25);expect(quantile(d,.75)).toBe(23);});
 test('timestamp written once, editing/clearing does not overwrite',()=>{const first=meetingDatePatch({},'2026-10-24','2026-10-17T09:00:00Z');expect(first.meeting_created_at).toBe('2026-10-17T09:00:00Z');expect(meetingDatePatch(first,'2026-10-25','2026-10-18T09:00:00Z').meeting_created_at).toBe(first.meeting_created_at);expect(meetingDatePatch(first,null,'2026-10-18T09:00:00Z').meeting_created_at).toBe(first.meeting_created_at);expect(meetingDatePatch({},null,'2026-10-18T09:00:00Z').meeting_created_at).toBeNull();});
 test('Bangkok calendar day changes at local midnight',()=>{expect(calendarDays('2026-10-16T16:59:00Z','2026-10-16T17:01:00Z')).toBe(1);});
 test('legacy existing meeting does not backfill timestamp on edit',()=>{expect(meetingDatePatch({meeting_date:'2026-10-20'},'2026-10-21','2026-10-17T09:00:00Z').meeting_created_at).toBeNull();});
 test('Completed follows Final Setup without mutating engine',()=>{expect(ORM_REPORT_STAGES.indexOf('completed_handover')).toBe(ORM_REPORT_STAGES.indexOf('orm_final_setup')+1);});
 test('GMB has no P3 and reserved Specialist is never counted',()=>{const lanes=servicingLanes(rows[14],SERVICING_DEMO_NOW);expect(lanes.some(l=>l.phase==='P3')).toBe(false);expect(lanes.find(l=>l.lane==='Specialist')?.state).toBe('reserved');});
});