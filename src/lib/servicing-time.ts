/** Browser-safe reporting model; never mutates the operational stage engine. */
export const servicing_sla_config = { p1: { ok_max: 5, sla: 7 }, p2: { ok_max: 5, sla: 7 }, p3: { ok_max: 3, target: 3, sla: 7 }, unit: 'calendar_day', tz: 'Asia/Bangkok' } as const;
export type Phase = 'P1' | 'P2' | 'P3';
export type LaneName = 'AE' | 'Specialist' | 'ORM' | 'Marcom';
export type LaneTone = 'ok' | 'amber' | 'red';
export type ServicingLane = { phase: Phase; lane: LaneName; state: 'running' | 'done' | 'wait' | 'reserved' | 'none'; d: number | null; tone: LaneTone | null; start_at: string | null; end_at: string | null; wait_until: string | null; row2?: boolean };
export type TimingCard = { card_id: string; service_variant: string | null; current_stage: string; created_at: string; go_live_at: string | null; meeting_date?: string | null; meeting_created_at?: string | null; specialist_handover_done_at?: string | null; row2_complete?: boolean; stage_events?: { stage_key: string; entered_at: string }[] };
const day = 86_400_000;
const dateOrdinal = (s: string) => { const d = new Date(s.length === 10 ? `${s}T00:00:00+07:00` : s); return Math.floor((d.getTime() + 7 * 3_600_000) / day); };
export const calendarDays = (a: string, b: string) => Math.max(0, dateOrdinal(b) - dateOrdinal(a));
export const phaseConfig = (p: Phase) => servicing_sla_config[p === 'P1' ? 'p1' : p === 'P2' ? 'p2' : 'p3'];
export const laneTone = (p: Phase, d: number): LaneTone => d <= phaseConfig(p).ok_max ? 'ok' : d <= phaseConfig(p).sla ? 'amber' : 'red';
export function statusText(p: Phase, d: number) { const tone = laneTone(p, d), left = phaseConfig(p).sla - d; return tone === 'ok' ? 'เร็วกว่า SLA' : tone === 'red' ? `เกิน SLA แล้ว ${-left} วัน` : left === 0 ? 'ครบ SLA วันนี้' : `เหลือเวลาอีก ${left} วันของ SLA`; }
export function latestEntry(c: TimingCard, stage: string) { return (c.stage_events ?? []).filter(e => e.stage_key === stage).map(e => e.entered_at).sort().at(-1) ?? null; }
export function servicingLanes(c: TimingCard, now: string): ServicingLane[] {
  const approved = latestEntry(c, 'approved'), live = latestEntry(c, c.service_variant === 'ORM' ? 'orm_go_live' : 'marcom_go_live') ?? c.go_live_at;
  const lane = (phase: Phase, name: LaneName, start: string | null | undefined, end: string | null | undefined): ServicingLane => {
    const d = start ? calendarDays(start, end ?? now) : null;
    return { phase, lane: name, state: !start ? 'none' : end ? 'done' : 'running', d, tone: start && !end && d != null && !live ? laneTone(phase, d) : null, start_at: start ?? null, end_at: end ?? null, wait_until: null };
  };
  const out = [lane('P1', 'AE', c.created_at, approved)];
  if (c.service_variant === 'ORM') out.push(lane('P2', 'Specialist', approved, c.specialist_handover_done_at));
  else out.push({ ...lane('P2', 'Specialist', null, null), state: 'reserved' });
  const owner: LaneName = c.service_variant === 'ORM' ? 'ORM' : 'Marcom';
  if (c.service_variant === 'MARCOM_GMB') { out.push(lane('P2', owner, approved, live)); return out; }
  out.push(lane('P2', owner, approved, c.meeting_created_at));
  if (c.meeting_created_at && c.meeting_date && dateOrdinal(now) < dateOrdinal(c.meeting_date)) {
    out.push({ ...lane('P3', owner, c.meeting_created_at, null), state: 'wait', tone: null, wait_until: c.meeting_date });
  } else out.push(lane('P3', owner, c.meeting_created_at ? c.meeting_date : null, live));
  if (c.service_variant === 'ORM' && ['completed', 'completed_handover'].includes(c.current_stage) && c.specialist_handover_done_at && !c.row2_complete) out.push({ ...lane('P2', 'ORM', null, null), state: 'wait', row2: true });
  return out;
}
export function cardStatus(lanes: ServicingLane[]) { const cause = ['red', 'amber', 'ok'].flatMap(t => lanes.filter(l => l.state === 'running' && l.tone === t))[0]; return { tone: cause?.tone ?? (lanes.some(l => l.state === 'wait') ? 'wait' : null), cause, label: cause?.d != null ? statusText(cause.phase, cause.d) : lanes.some(l => l.state === 'wait') ? 'รอ · ไม่นับ' : '—' }; }
export const stallEventKey = (card_id: string, l: Pick<ServicingLane, 'phase' | 'lane'>) => `${card_id}:${l.phase}:${l.lane}`;
export const meetingDatePatch = (c: { meeting_created_at?: string | null }, date: string | null, now: string) => ({ meeting_date: date, meeting_created_at: c.meeting_created_at ?? (date ? now : null) });
export const shortThaiDate = (s: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: servicing_sla_config.tz }).format(new Date(s.length === 10 ? `${s}T00:00:00+07:00` : s));
export const ORM_REPORT_STAGES = ['new_property','introduction_sent_form','collect_data','property_pending','final_check','approved','orm_prepare_data','orm_rate_structure','orm_final_setup','completed_handover','orm_system_training','orm_go_live'];
export const MARCOM_REPORT_STAGES = ['new_property','introduction_sent_form','collect_data','property_pending','final_check','approved','completed_handover','marcom_prepare_data','marcom_first_sync','marcom_go_live'];
export const reportStageLabel = (s: string) => ({ new_property:'New Property', introduction_sent_form:'Introduction', collect_data:'Collect Data', property_pending:'(Property Pending)', final_check:'Final Check', approved:'Approved', orm_prepare_data:'Prepare Data', orm_rate_structure:'Rate Structure ★', orm_final_setup:'Final Setup ⟨เพดาน⟩', completed_handover:'Completed (Handover)', marcom_prepare_data:'Prepare Data', marcom_first_sync:'First Sync ★ (MT)', orm_system_training:'System Training', orm_go_live:'Go Live', marcom_go_live:'Go Live' }[s] ?? s);