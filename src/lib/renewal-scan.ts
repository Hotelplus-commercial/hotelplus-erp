/* Tab R2 §7 — renewal-card scan timing + early create (pure helpers, no React).
 * Job key `renewal-45day-scan` is kept as is; the lead time is now RENEWAL_CARD_LEAD_DAYS.
 * Duplicate rule: a contract end date never gets a second OPEN card (any source). A card made by this
 * path has id `RN-{contract_id}`; older cards (no contract id) match by hotel + contract end date. */
import type { RenewalCard } from './ps-renewal';

export const RENEWAL_SCAN_JOB = 'renewal-45day-scan';
export const RENEWAL_CARD_LEAD_DAYS = 60;

export type ScanContract = { contract_id: string; hotel_id: string; hotel_name: string; service: 'ORM' | 'Marcom'; end: string; ae: string | null };

const MON: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const MON_EN = Object.keys(MON);
/** "24 Sep 2026" or ISO → YYYY-MM-DD (null when unreadable). */
export function toIsoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(s.trim());
  if (!m || !MON[m[2]!]) return null;
  return `${m[3]}-${String(MON[m[2]!]).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}
export const enDate = (iso: string) => `${+iso.slice(8, 10)} ${MON_EN[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const dayDiff = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10) + 'T00:00:00Z') - Date.parse(from.slice(0, 10) + 'T00:00:00Z')) / 864e5);
export const scanDateOf = (end: string) => new Date(Date.parse(end.slice(0, 10) + 'T00:00:00Z') - RENEWAL_CARD_LEAD_DAYS * 864e5).toISOString().slice(0, 10);

export const cardIdFor = (contractId: string) => `RN-${contractId}`;
export const isOpenCard = (c: Pick<RenewalCard, 'status'>) => c.status === 'NOT_STARTED' || c.status === 'ON_PROCESS';
/** The open card that already covers this contract end date, if any. */
export function openCardFor(cards: RenewalCard[], c: Pick<ScanContract, 'contract_id' | 'hotel_id' | 'end'>): RenewalCard | null {
  return cards.find((k) => isOpenCard(k) && (k.id === cardIdFor(c.contract_id) || (!k.created_source && k.hotelId === c.hotel_id && toIsoDate(k.contractEnd) === c.end.slice(0, 10)))) ?? null;
}
/** Contracts the scan creates a card for today: scan date (end − 60) reached, not past the end, no open card. */
export function scanCandidates(contracts: ScanContract[], cards: RenewalCard[], today: string): ScanContract[] {
  const seen = new Set<string>();
  return contracts.filter((c) => {
    if (seen.has(c.contract_id)) return false; seen.add(c.contract_id);
    return today >= scanDateOf(c.end) && today <= c.end.slice(0, 10) && !openCardFor(cards, c);
  });
}
export const aeCode = (id: string | null | undefined) => (id ?? '').split('-')[0] ?? '';
export function newCardFrom(c: ScanContract, source: 'BOT' | 'AE_EARLY', today: string, owner: string): RenewalCard {
  return {
    id: cardIdFor(c.contract_id), hotelId: c.hotel_id, hotel: c.hotel_name, contractEnd: enDate(c.end.slice(0, 10)), daysLeft: dayDiff(today, c.end),
    status: 'NOT_STARTED', owner, contact: { name: '—', phone: '—', email: '—', line: '—' }, contractFile: '—', contractGeneratedAt: '—', activities: [], created_source: source,
    contract_id: c.contract_id, service: c.service,
  };
}

/* ---------- contract registry for cards made by this path (service lookup for renewal_reasons) ---------- */
const registry = new Map<string, ScanContract>();
export const rememberScanContract = (c: ScanContract) => { registry.set(c.contract_id, c); };
export const scanContractById = (id: string) => registry.get(id) ?? null;

/* ---------- §7.2 dashboard → AE Workspace hand-off (browser-local, one record per contract) ---------- */
const EARLY_KEY = 'meridia.renewal-early.v1';
export const EARLY_PARAM = 'createRenewal';
export function writeEarlyHandoff(c: ScanContract) {
  try { const all = JSON.parse(localStorage.getItem(EARLY_KEY) ?? '{}') as Record<string, ScanContract>; all[c.contract_id] = c; localStorage.setItem(EARLY_KEY, JSON.stringify(all)); } catch { /* storage optional */ }
}
export function readEarlyHandoff(contractId: string): ScanContract | null {
  try { return (JSON.parse(localStorage.getItem(EARLY_KEY) ?? '{}') as Record<string, ScanContract>)[contractId] ?? null; } catch { return null; }
}
