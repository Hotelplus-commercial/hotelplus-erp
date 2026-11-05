/* Contract Renewal v1.4 §2.1 / §4 — read-only input collection for one renewal card (no writes, no React).
 * Gathers: fee average (§1) · v_ps_repricing facts · health level + 30-day change · system / AE ✎ labels · open tickets ·
 * own-bill overdue, then calls the one shared engine (renewalOffer.ts).
 * live: health level / 30-day change from the stored daily snapshots, AE ✎ labels from the same store, overdue from AC invoices of
 *   this contract (CRM browser store). System labels are computed only on PS Dashboard (they need its Cloud projections) → not found here.
 * DEMO: Tab R1 demo rows + the v1.4 demo additions, evaluated in memory with the same Tab R1 engine. */
import { computeRenewalOffer, type FeeAverage, type OfferConfig, type RenewalOffer, type RepricingFacts } from './renewalOffer';
import { getContractFeeAverage } from './contract-fee-average';
import { buildRows, catalogByKey, tier30 as tierThirty, ticketsOfContract, type AeLabel, type HealthRow, type Signal, type Tier, type TierSnapshot } from './contract-tab-r1';
import { tabR1Demo, tabR1DemoTickets, TAB_R1_DEMO_NOW } from './contract-tab-r1-demo';
import { RENEWAL_OFFER_DEMO_NOW, v14DemoBase, v14DemoById, v14DemoSnapshots, v14DemoTickets } from './renewal-offer-demo';
import { contractHealthState } from './contract-health-store';
import type { PriceHistoryRow } from './renewal-rules';
import type { PsReportRow } from './ps-dashboard-types';
import type { Invoice } from './crm-types';
import type { L0Ticket } from './tickets-l0';

export type Chip = { key: string; label: string; dir: 'bad' | 'good' | 'opp'; ae: boolean };
export type OfferContext = {
  contract_id: string; asOf: string; service: 'ORM' | 'Marcom'; package: string;
  fee: FeeAverage; offer: RenewalOffer;
  health: { tier: Tier; change: 'up' | 'down' | 'same' | null; from: Tier | null } | null;
  tickets: L0Ticket[]; chips: Chip[]; badChips: number; opportunity: boolean;
};
export type OfferArgs = {
  contract_id: string; hotel_id: string; service: 'ORM' | 'Marcom'; package: string; demo: boolean;
  history: PriceHistoryRow[]; repricing: PsReportRow | null; tickets: L0Ticket[]; cfg: OfferConfig; today?: string;
};

export const offerAsOf = (demo: boolean, now = new Date()) => (demo ? RENEWAL_OFFER_DEMO_NOW : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now));

/** v_ps_repricing row → the facts the engine reads. */
export function repricingFacts(row: PsReportRow | null): RepricingFacts | null {
  if (!row) return null;
  const why = Array.isArray(row['why_chips']) ? (row['why_chips'] as string[]) : String(row['why_chips'] ?? '').split('|').filter(Boolean);
  const n = (v: unknown) => (v == null || v === '' ? null : Number(v));
  return {
    revenue_profile: row['revenue_profile'] == null ? null : String(row['revenue_profile']),
    cadence: typeof row['cadence_path'] === 'boolean' ? (row['cadence_path'] as boolean) : null,
    below_value: why.length || row['signal_path'] != null ? why.includes('ราคาต่ำกว่ามูลค่า') : null,
    band_min_pct: n(row['band_min_pct']), band_max_pct: n(row['band_max_pct']),
    last_increase_at: row['last_increase_at'] == null ? null : String(row['last_increase_at']),
  };
}

/** Own bill overdue from AC invoices of this contract: null when the contract has no invoice in the AC data. */
export function ownOverdue(invoices: Invoice[], contractId: string, today: string): { own: boolean; days: number | null } | null {
  const mine = invoices.filter((i) => i.contract_ids.includes(contractId) && !['draft', 'void'].includes(i.status));
  if (!mine.length) return null;
  const late = mine.filter((i) => ['issued', 'sent_via_live_link', 'partially_paid'].includes(i.status) && !!i.due_date && i.due_date < today);
  if (!late.length) return { own: false, days: null };
  const first = late.map((i) => i.due_date!).sort()[0]!;
  return { own: true, days: Math.round((Date.parse(today) - Date.parse(first)) / 864e5) };
}
const readInvoices = (): Invoice[] => { try { const p = JSON.parse(localStorage.getItem('hotelplus-crm-v1') ?? 'null') as { invoices?: Invoice[] } | null; return Array.isArray(p?.invoices) ? p!.invoices! : []; } catch { return []; } };

const chipsOf = (signals: Signal[] | null, labels: AeLabel[]): Chip[] => [
  ...(signals ?? []).map((s) => ({ key: s.key, label: s.label, dir: s.dir, ae: false })),
  ...labels.flatMap((l) => { const e = catalogByKey.get(l.label_key); return e ? [{ key: l.label_key, label: e.label, dir: e.dir, ae: true }] : []; }),
];

/** One card's full context (section 1 + Wizard). Pure given its args, except the read-only store reads named above. */
export function offerContextFor(a: OfferArgs): OfferContext {
  const asOf = a.today ?? offerAsOf(a.demo);
  const fee = getContractFeeAverage(a.contract_id, asOf, { demo: a.demo, service: a.service, window: a.cfg.fee_average_months, history: a.history });
  const hs = contractHealthState(a.demo);
  let row: HealthRow | null = null; let snaps: TierSnapshot[] = hs.snapshots; let rowToday = asOf;
  let tickets = a.tickets;
  if (a.demo) {
    const v14 = v14DemoById(a.contract_id);
    const seed = v14 ? v14DemoTickets() : tabR1DemoTickets();
    const seen = new Set(a.tickets.map((t) => t.ticket_id)); tickets = [...seed.filter((t) => !seen.has(t.ticket_id)), ...a.tickets];
    const base = v14 ? v14DemoBase() : tabR1Demo().base;
    if (!v14) { rowToday = TAB_R1_DEMO_NOW; } else snaps = v14DemoSnapshots();
    row = buildRows(base.filter((b) => b.contract_id === a.contract_id), { today: rowToday, labels: hs.labels, snaps, tickets })[0] ?? null;
  }
  const aeLabels = hs.labels.filter((l) => l.contract_id === a.contract_id);
  let health: OfferContext['health'] = null;
  let tier: Tier | null = row?.tier ?? null;
  if (!row) { // live: latest stored daily snapshot on or before today
    const mine = snaps.filter((s) => s.contract_id === a.contract_id && s.date <= asOf).sort((x, y) => y.date.localeCompare(x.date));
    tier = mine[0]?.tier ?? null; if (mine[0]) rowToday = mine[0].date;
  }
  if (tier) {
    const old = tierThirty(snaps, a.contract_id, rowToday);
    const rank = { R: 0, A: 1, G: 2 } as const;
    health = { tier, from: old, change: old == null ? null : old === tier ? 'same' : rank[tier] < rank[old] ? 'down' : 'up' };
  }
  const signals = row ? row.signals : null;
  const group1Evaluated = row ? [...row.evaluated].some((k) => catalogByKey.get(k)?.group === 1) : false;
  const system_group1 = row && group1Evaluated ? row.signals.filter((s) => s.group === 1 && s.dir === 'bad').map((s) => s.label) : null;
  const ownBad = row ? row.signals.filter((s) => s.dir === 'bad') : [];
  const overdueSig = ownBad.some((s) => s.key === 'OVERDUE');
  const demoRec = a.demo ? v14DemoById(a.contract_id) : null;
  const overdue = a.demo
    ? demoRec ? { own: demoRec.overdue_days != null, days: demoRec.overdue_days } : row && row.evaluated.includes('OVERDUE') ? { own: overdueSig, days: null } : null
    : ownOverdue(readInvoices(), a.contract_id, asOf);
  const offer = computeRenewalOffer({
    service: a.service, fee, repricing: repricingFacts(a.repricing),
    health: tier ? { tier, red_by_own_overdue_only: tier === 'R' && overdueSig && ownBad.filter((s) => s.key !== 'OVERDUE').length < 2 } : null,
    system_group1, overdue, cfg: a.cfg, computed_at: `${asOf}T00:00:00.000Z`,
  });
  const chips = chipsOf(signals, aeLabels);
  return {
    contract_id: a.contract_id, asOf, service: a.service, package: a.package, fee, offer, health,
    tickets: ticketsOfContract(tickets, a.contract_id), chips, badChips: chips.filter((c) => c.dir === 'bad').length, opportunity: chips.some((c) => c.dir === 'opp'),
  };
}
