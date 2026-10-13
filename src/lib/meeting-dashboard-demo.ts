/** Static reporting-only extension of the shared contract spine; never writes providers. */
import { demoLifecycles } from './ps-demo-fixture';
import { MEETING_VIEWS, QUESTIONS, type MeetingReport, type MeetingRow } from './meeting-dashboard-types';

export function demoMeetingReport(): MeetingReport {
  const views = Object.fromEntries(MEETING_VIEWS.map(key => [key, []])) as MeetingReport['views'];
  const spine = demoLifecycles().filter(row => !['C11','C12','C13','C14'].includes(row.id));
  for (const month of ['2026-08','2026-09']) spine.forEach((contract,index) => {
    const service = contract.service_line === 'ORM' ? 'ORM' : 'Marcom';
    const scheduled = 1, confirmed = 1, completed = month === '2026-08' ? Number(index < 7) : Number(index < 8);
    const survey = completed && index < (month === '2026-08' ? 5 : 6) ? 1 : 0;
    const tier = service === 'Marcom' ? '—' : ['A','A','B','C'][index % 4] ?? 'A';
    const common: MeetingRow = { meeting_id:`M-${month}-${contract.id}`, meeting_date:`${month}-${String(index+5).padStart(2,'0')}`, hotel_id:contract.hotel_id, hotel_name:contract.hotel_name, status:contract.id === 'C03' || contract.id === 'C10' ? 'INACTIVE' : 'ACTIVE', service_line:service, ae_owner_id:contract.bd_owner_id, orm_team:service === 'ORM' ? `Team ${index % 3 + 1}` : null, orm_owner_id:service === 'ORM' ? ['Dao','Ploy','Bank'][index % 3] ?? 'Dao' : null, marcom_owner_id:service === 'Marcom' ? ['Mint','Fai'][index % 2] ?? 'Mint' : null, tier, pending_sync:false };
    views.v_meeting_funnel.push({...common,scheduled,confirmed,completed,survey,postponed_next_month:0});
    views.v_meeting_completion.push({...common,scheduled,completed,postponed_next_month:0});
    views.v_meeting_count_by_ae.push({...common,meeting_count:1});
    views.v_meeting_survey_collection.push({...common,completed,submitted:survey,queue:completed ? 0 : 1});
    if (!survey) return;
    for (const [question] of QUESTIONS.slice(0,8)) {
      if (service === 'ORM' && ['Q4','Q5','Q6'].includes(question) || service === 'Marcom' && ['Q1','Q2','Q3'].includes(question)) continue;
      const score = month === '2026-09' && index === 0 && question === 'Q1' ? 5 : index === 1 && question === 'Q2' ? 6 : 7 + index % 3;
      views.v_meeting_survey_scores.push({...common,question,score,subject_owner_id:question === 'Q4' ? 'Mint' : question === 'Q5' ? 'Fai' : service === 'ORM' ? common['orm_owner_id'] : common['marcom_owner_id'],comment:index === 0 ? 'ขอรายละเอียดแผนราคาและขั้นตอนติดตามเพิ่มเติม' : null});
      if (score > 6) continue;
      const warnings = question === 'Q2' && month === '2026-09' ? 2 : score === 6 ? 1 : 0;
      views.v_meeting_flags.push({...common,topic:question,red_count:score <= 5 || warnings >= 2 ? 1 : 0,warn_count:score === 6 ? 1 : 0,warning_progress:warnings,age_days:30-index-5,route_target:'GRM',comment:'ขอรายละเอียดแผนราคาและขั้นตอนติดตามเพิ่มเติม',resolved_at:null});
    }
  });
  return {views,pending:['v_meeting_rubric_summary'],demo:true};
}