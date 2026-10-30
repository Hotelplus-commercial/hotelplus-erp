/* Proactive Alert BOT v1.0 — converts Account Health risk signals into real L0 tickets.
 * Reads only what source systems already compute (gradeRecords / renewal_card / customer survey);
 * never recomputes a signal; empty source → no fire (never fake). Writes only `tickets` via
 * createTask()/stampConditionCleared(). One condition = one ticket (no fan-out); other
 * departments see it as read-only watchers. Never auto-closes. */
import {
  createTask, findOpenByEvent, openOfType, refreshBotTicket, stampConditionCleared,
  SYSTEM_CREATOR, type Dept, type L0Ticket, type Severity, type TicketType,
} from './tickets-l0';
import { runServicingStallBot, type StallCandidate } from './servicing-stall';

export const RENEWAL_DUE_DAYS = 30;
export const GRADE_RISK_BANDS = ['D'] as const; // D only this phase; NOT C
export const SURVEY_LOW_THRESHOLD = 3; // real X.X/5 scale

export type BotRenewal = { hotel_id: string; hotel_name: string; renewal_due_date: string; status: string };
export type BotGrade = { hotel_id: string; hotel_name: string; billing_period: string; grade: string };
export type BotSurvey = { hotel_id: string; hotel_name: string; survey_id: string; score: number };
export type BotRouting = {
  assigned_ae: { member_id: string; nickname: string } | null;
  watchers: { dept: Dept; member_id: string | null; nickname: string }[];
};
export type BotScanInput = {
  now: string; // ISO
  renewals: BotRenewal[];
  grades: BotGrade[];
  surveys: BotSurvey[];
  route: (hotel_id: string) => BotRouting;
  servicing?: StallCandidate[];
};
export type BotRunResult = { created: number; skipped: number; cleared: number; round: string };

const BOT_TYPES: TicketType[] = ['RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW'];
const dayMs = 86_400_000;

/** Evaluate one condition; returns event_key + payload detail, or null when it does not fire. */
function evaluate(type: TicketType, hotel_id: string, input: BotScanInput):
  { event_key: string; severity: Severity; signal_detail: NonNullable<L0Ticket['payload']['signal_detail']>; note: string } | null {
  const today = input.now.slice(0, 10);
  if (type === 'RENEWAL_DUE') {
    const r = input.renewals
      .filter((x) => x.hotel_id === hotel_id && (x.status === 'ON_PROCESS' || x.status === 'NOT_STARTED' || x.status === ''))
      .map((x) => ({ ...x, days: Math.ceil((new Date(x.renewal_due_date).getTime() - new Date(today).getTime()) / dayMs) }))
      .filter((x) => x.days >= 0 && x.days <= RENEWAL_DUE_DAYS)
      .sort((a, b) => a.days - b.days)[0];
    if (!r) return null;
    return {
      event_key: r.renewal_due_date,
      severity: r.days <= 7 ? 'high' : r.days <= 14 ? 'medium' : 'low',
      signal_detail: { renewal_due_date: r.renewal_due_date, days_left: r.days },
      note: `สัญญาครบ ${r.renewal_due_date} (เหลือ ${r.days} วัน)`,
    };
  }
  if (type === 'GRADE_RISK') {
    const g = [...input.grades.filter((x) => x.hotel_id === hotel_id)]
      .sort((a, b) => b.billing_period.localeCompare(a.billing_period))[0];
    if (!g || !(GRADE_RISK_BANDS as readonly string[]).includes(g.grade)) return null;
    return {
      event_key: g.billing_period,
      severity: 'high',
      signal_detail: { grade: g.grade },
      note: `เกรดการชำระ ${g.grade} รอบ ${g.billing_period.slice(0, 7)}`,
    };
  }
  const s = [...input.surveys.filter((x) => x.hotel_id === hotel_id && x.score < SURVEY_LOW_THRESHOLD)]
    .sort((a, b) => b.survey_id.localeCompare(a.survey_id))[0];
  if (!s) return null;
  return {
    event_key: s.survey_id,
    severity: s.score < 2 ? 'high' : 'medium',
    signal_detail: { survey_id: s.survey_id, score: s.score },
    note: `คะแนนบริการ ${s.score}/5`,
  };
}

/** One BOT scan over the portfolio. Idempotent: re-running on the same data creates nothing. */
export function runAlertBot(input: BotScanInput): BotRunResult {
  const round = input.now.slice(0, 10);
  const hotelIds = new Set<string>();
  [...input.renewals, ...input.grades, ...input.surveys].forEach((r) => hotelIds.add(r.hotel_id));
  let created = 0, skipped = 0, cleared = 0;

  for (const hotel_id of hotelIds) {
    const name =
      input.renewals.find((r) => r.hotel_id === hotel_id)?.hotel_name ??
      input.grades.find((g) => g.hotel_id === hotel_id)?.hotel_name ??
      input.surveys.find((s) => s.hotel_id === hotel_id)?.hotel_name ?? hotel_id;
    for (const type of BOT_TYPES) {
      const hit = evaluate(type, hotel_id, input);
      if (hit) {
        const existing = findOpenByEvent(type, hotel_id, hit.event_key);
        if (existing) {
          refreshBotTicket(existing.ticket_id, { generated_round: round, severity: hit.severity });
          skipped++;
          continue;
        }
        const routing = input.route(hotel_id);
        createTask({
          type,
          target_dept: 'PS', // primary: PM Workspace 🎫 lane
          created_by: SYSTEM_CREATOR,
          source_app: 'PS_DASHBOARD_BOT',
          subject_ref: { hotel_id, hotel_name: name, gap_service: TYPE_GAP[type] },
          payload: {
            readiness_tier: '', chips: [], note: hit.note,
            severity: hit.severity, event_key: hit.event_key, signal_detail: hit.signal_detail,
            assigned_ae: routing.assigned_ae, watchers: routing.watchers,
            generated_round: round, condition_cleared_at: null,
            unassigned_owner: !routing.assigned_ae,
          },
        });
        created++;
      } else {
        // Condition no longer holds → stamp condition_cleared_at on any open ticket; never auto-close.
        for (const t of openOfType(type, hotel_id)) {
          if (t.payload.condition_cleared_at) continue;
          // Only clear when the source actually has data for this hotel (empty ≠ cleared).
          const hasData =
            (type === 'RENEWAL_DUE' && input.renewals.some((r) => r.hotel_id === hotel_id)) ||
            (type === 'GRADE_RISK' && input.grades.some((g) => g.hotel_id === hotel_id)) ||
            (type === 'SURVEY_LOW' && input.surveys.some((s) => s.hotel_id === hotel_id));
          if (hasData && stampConditionCleared(t.ticket_id)) cleared++;
        }
      }
    }
  }
  const stalls = runServicingStallBot(input.servicing ?? [], input.now);
  return { created:created+stalls.created, skipped:skipped+stalls.skipped, cleared:cleared+stalls.cleared, round };
}

const TYPE_GAP: Record<TicketType, string> = {
  UPSELL_PITCH: '', RENEWAL_DUE: 'ต่อสัญญา', GRADE_RISK: 'การชำระ', SURVEY_LOW: 'แบบสำรวจ', CONTRACT_FOLLOWUP: '', SERVICING_STALL: '', CUSTOMER_ENTITY_CHANGE: '', CONTRACT_SIGNAL: '',
};

/* ---------------- digest (§5.2) ---------------- */
export type Digest = { fresh: number; carried: number; readyToClose: number; byType: Partial<Record<TicketType, number>> };
export function digestFor(tickets: L0Ticket[], round: string): Digest {
  const open = tickets.filter((t) => t.status === 'NEW' || t.status === 'ACK' || t.status === 'IN_PROGRESS');
  const fresh = open.filter((t) => t.payload.generated_round === round && t.created_at.slice(0, 10) === round);
  const byType: Digest['byType'] = {};
  fresh.forEach((t) => { byType[t.type] = (byType[t.type] ?? 0) + 1; });
  return {
    fresh: fresh.length,
    carried: open.length - fresh.length,
    readyToClose: open.filter((t) => t.payload.condition_cleared_at != null).length,
    byType,
  };
}
export const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
export function sortBotFirst(rows: L0Ticket[]) {
  return [...rows].sort((a, b) =>
    SEVERITY_ORDER[a.payload.severity ?? 'low'] - SEVERITY_ORDER[b.payload.severity ?? 'low'] ||
    a.created_at.localeCompare(b.created_at));
}
