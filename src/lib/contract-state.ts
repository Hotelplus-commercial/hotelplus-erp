/* v1.4.1 RN45 (decision Q58, 5 Nov 2026) — one pure helper for a contract's state on a day. Derived only; never written.
 * - ACTIVE: started, not past its term end (or covered), no recorded outcome yet in force.
 * - LAPSED_PENDING: day > term end, no recorded outcome, no renewal contract covering the day → leaves “ใช้งาน”, not churn.
 * - ENDED_OUTCOME: an outcome (ไม่ต่อ / ยกเลิกก่อนกำหนด) is recorded and its end date has passed → churn (หลุด).
 * - RENEWED: handed over to a renewal contract (old end reached, renewal starts old end + 1 → continuous, no lapsed day).
 * - UPCOMING: not started yet. */
export type ContractState = 'UPCOMING' | 'ACTIVE' | 'LAPSED_PENDING' | 'ENDED_OUTCOME' | 'RENEWED';
export type Outcome = 'NOT_RENEWED' | 'EARLY_TERMINATION' | 'RENEWAL';
export type StateInput = {
  contract_id: string; start: string;
  /** Scheduled term end (inclusive last day). null = unknown → never lapses (no guessing). */
  term_end: string | null;
  /** Recorded end + outcome (existing `end` / `end_reason` fields). */
  end?: string | null; end_reason?: Outcome | string | null;
};
export type RenewalLink = { renewal_of: string | null | undefined; start: string };

const d10 = (s: string) => s.slice(0, 10);
export const isChurnOutcome = (r: unknown) => r === 'NOT_RENEWED' || r === 'EARLY_TERMINATION';

export function contractStateOn(c: StateInput, day: string, renewals: RenewalLink[] = []): ContractState {
  const t = d10(day);
  if (d10(c.start) > t) return 'UPCOMING';
  if (c.end && d10(c.end) <= t) return isChurnOutcome(c.end_reason) ? 'ENDED_OUTCOME' : 'RENEWED';
  if (c.term_end && d10(c.term_end) < t) {
    const covered = renewals.some((r) => r.renewal_of === c.contract_id && d10(r.start) <= t);
    return covered ? 'RENEWED' : 'LAPSED_PENDING';
  }
  return 'ACTIVE';
}
export const isActiveOn = (c: StateInput, day: string, renewals: RenewalLink[] = []) => contractStateOn(c, day, renewals) === 'ACTIVE';

/** Main-store contract → term end (inclusive): start + duration months − 1 day (same end as the AC engine's monthShift). */
export function contractTermEnd(c: { start_date: string; duration_months: number }): string {
  const [y, m, d] = c.start_date.slice(0, 10).split('-').map(Number) as [number, number, number];
  const end = new Date(Date.UTC(y, m - 1 + c.duration_months, d));
  return new Date(end.getTime() - 864e5).toISOString().slice(0, 10);
}
