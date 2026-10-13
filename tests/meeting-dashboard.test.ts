import { describe, expect, test } from 'bun:test';
import { demoMeetingReport } from '../src/lib/meeting-dashboard-demo';
import { demoLifecycles } from '../src/lib/ps-demo-fixture';
import { defaultGlobalFilter, monthPeriod } from '../src/lib/ps-dashboard-global';
import { meetingScope, meetingSum, meetingPercent, questionAverage } from '../src/lib/meeting-dashboard-types';

const report = demoMeetingReport(), period=monthPeriod(new Date('2026-09-30'));
const f={...defaultGlobalFilter,range:'mtd' as const};
describe('Meeting reporting shared spine',()=>{
  test('reconciles latest unique meetings, cumulative reach and completed headline',()=>{
    const rows=meetingScope(report.views.v_meeting_funnel,f,period);
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map(row=>`${row.hotel_id}:${row.service_line}:${String(row['meeting_date']).slice(0,7)}`)).size).toBe(10);
    expect(meetingSum(rows,'scheduled')).toBe(10);
    expect(meetingSum(rows,'completed')).toBe(8);
    expect(meetingSum(rows,'survey')).toBe(6);
    expect(meetingPercent(rows,'completed','scheduled','postponed_next_month')).toBe(80);
    for(const row of rows) expect(Number(row['survey'])).toBeLessThanOrEqual(Number(row['completed']));
  });
  test('survey and flags originate from completed shared-spine meetings',()=>{
    const hotels=new Set(demoLifecycles().map(row=>row.hotel_id));
    for(const row of report.views.v_meeting_survey_scores){
      expect(hotels.has(String(row.hotel_id))).toBe(true);
      expect(report.views.v_meeting_funnel.find(meeting=>meeting['meeting_id']===row['meeting_id'])?.['survey']).toBe(1);
    }
    for(const row of report.views.v_meeting_flags) expect(report.views.v_meeting_survey_scores.some(s=>s['meeting_id']===row['meeting_id'] && s['question']===row['topic'])).toBe(true);
    expect(report.views.v_meeting_rubric_summary).toHaveLength(0);
  });
  test('scope applies service/time/ownership AND, missing scores stay empty',()=>{
    const rows=meetingScope(report.views.v_meeting_funnel,{...f,service:'ORM',role:'AE',people:['Nont']},period);
    expect(rows.every(row=>row.service_line==='ORM'&&row['ae_owner_id']==='Nont')).toBe(true);
    expect(meetingScope(report.views.v_meeting_funnel,{...f,role:'ORM',people:['unknown']},period)).toHaveLength(0);
    expect(questionAverage([])).toBeNull();
    expect(meetingPercent([],'completed','scheduled')).toBeNull();
    expect(meetingPercent([{scheduled:4,completed:3,postponed_next_month:1}],'completed','scheduled','postponed_next_month')).toBe(100);
  });
});