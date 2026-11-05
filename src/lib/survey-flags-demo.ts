/* Contract Health · Survey signals patch §6 (CH18) — DEMO additions only (in memory, never written to meridia.survey_flags.v1).
 * Flags for ต.ค. 2569 matching the Meeting tab demo, and the DEMO link from demo survey hotels to existing card ⑦ DEMO contracts
 * (the §6 hotels are not card ⑦ contracts; several demo survey hotels may point at one DEMO contract). */
import type { MeetingSurveyData, SurveyFlag } from './meeting-survey-types';
import { flagDeltaForSurvey, lowScoreTriggers, makeFlag } from './survey-flags';

/** demo survey hotel_id → card ⑦ DEMO contract_id. */
export const DEMO_CONTRACT_OF: Record<string, string> = {
  HTL0401: 'R2-O3', HTL0403: 'R2-O2', HTL0214: 'R2-O5', HTL0133: 'R2-O6',
  HTL0331: 'R2-M1', HTL0502: 'R2-M1', HTL0298: 'R2-M3', HTL0505: 'R2-M3', HTL0420: 'R2-M4', HTL0290: 'R2-M2',
};
export const demoContractOf = (hotelId: string | null) => (hotelId ? DEMO_CONTRACT_OF[hotelId] ?? null : null);

const AT = '2026-10-28T03:00:00.000Z';
/** §6: ORM low 4 · no-score 1 (214) · silent 1 (214) · Marcom low 8 · no-score 4 · silent 2 (0331, 0298) · rejected 133 (ORM) + 0290 (Marcom). */
export function surveyFlagsDemo(d: MeetingSurveyData): SurveyFlag[] {
  const meetings = new Map(d.meetings.map((m) => [m.id, m]));
  const out: SurveyFlag[] = [];
  const low = { ORM: 4, MARCOM: 8 } as const; const taken = { ORM: 0, MARCOM: 0 };
  for (const s of d.surveys) {
    const m = meetings.get(s.meeting_id);
    if (lowScoreTriggers(s, d.answers).length) { if (taken[s.service] >= low[s.service]) continue; taken[s.service]++; }
    out.push(...flagDeltaForSurvey(s, d.answers, m, out, s.submitted_at ?? s.link_closed_at ?? AT, demoContractOf).filter((f) => f.status === 'OPEN'));
  }
  const ref = (code: string, service: 'ORM' | 'MARCOM') => { const hotel_id = `HTL${code.padStart(4, '0')}`; return { hotel_id, hotel: `โรงแรม ${code}`, service, contract_id: demoContractOf(hotel_id) }; };
  out.push(
    makeFlag('SURVEY_SILENT_2M', ref('214', 'ORM'), '2026-10', ['ไม่มีคะแนนเซอร์เวย์ 2 เดือนติด'], AT, 'DM-214', null),
    makeFlag('SURVEY_SILENT_2M', ref('0331', 'MARCOM'), '2026-10', ['ไม่มีคะแนนเซอร์เวย์ 2 เดือนติด'], AT, 'DM-0331', null),
    makeFlag('SURVEY_SILENT_2M', ref('0298', 'MARCOM'), '2026-10', ['ไม่มีคะแนนเซอร์เวย์ 2 เดือนติด'], AT, 'DM-0298', null),
    makeFlag('MEETING_REJECTED', ref('133', 'ORM'), '2026-10', ['ลูกค้าปฏิเสธนัดประชุม'], AT, 'DM-133', null),
    makeFlag('MEETING_REJECTED', ref('0290', 'MARCOM'), '2026-10', ['ลูกค้าปฏิเสธนัดประชุม'], AT, 'DM-0290', null),
  );
  return out;
}
