/** R1.2 §3.4 — old → new price per term from contract_price_history (previous cycle → RENEWAL cycle).
 *  Pure display helper: empty terms are hidden (never shown as 0). */
export type PriceCycle = { contract_id: string; cycle_no: number; fee_amount?: number | null; commission_pct?: number | null; guarantee_amount?: number | null; source: 'INITIAL' | 'RENEWAL' };
export type TermKey = 'fee' | 'commission' | 'guarantee';
export type TermDiff = { key: TermKey; label: string; old: number | null; next: number | null; dir: 'up' | 'down' | 'same' };
export const TERM_LABEL: Record<TermKey, string> = { fee: 'ค่าบริการ', commission: 'ค่าคอม', guarantee: 'Guarantee' };
const FIELD: Record<TermKey, 'fee_amount' | 'commission_pct' | 'guarantee_amount'> = { fee: 'fee_amount', commission: 'commission_pct', guarantee: 'guarantee_amount' };
const present = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v !== 0;

export function priceDiff(history: PriceCycle[], contractId: string): { status: 'NO_RENEWAL' } | { status: 'OK'; terms: TermDiff[] } {
  const rows = history.filter(h => h.contract_id === contractId).sort((a, b) => a.cycle_no - b.cycle_no);
  const renewal = [...rows].reverse().find(r => r.source === 'RENEWAL');
  if (!renewal) return { status: 'NO_RENEWAL' };
  const prev = [...rows].reverse().find(r => r.cycle_no < renewal.cycle_no);
  const terms = (['fee', 'commission', 'guarantee'] as TermKey[]).flatMap(key => {
    const o = prev?.[FIELD[key]] ?? null, n = renewal[FIELD[key]] ?? null;
    if (!present(o) && !present(n)) return [];
    const ov = present(o) ? o : null, nv = present(n) ? n : null;
    const dir: TermDiff['dir'] = ov != null && nv != null ? (nv > ov ? 'up' : nv < ov ? 'down' : 'same') : nv != null ? 'up' : 'down';
    return [{ key, label: TERM_LABEL[key], old: ov, next: nv, dir }];
  });
  return { status: 'OK', terms };
}
export const formatTerm = (key: TermKey, v: number | null) => (v == null ? '—' : key === 'commission' ? `${v}%` : `฿${v.toLocaleString('th-TH')}`);
