/* Debt Partner R1 §2.1 — the one set of Partner cost / deal / credit calculations (pure). Cards ③④⑤, the §9 renewal
 * rows and later PM Workspace / AC App / AE Workspace screens call these; never re-implement them. */
import type { PartnerData, PartnerDeal, PartnerRateCard, PartnerRateCardTier, SystemCreditRequest } from './debt-partner-types';

/** Contract facts the calculations need (from the main contract store, or the DEMO bundle). */
export type PartnerContract = {
  contract_id: string; hotel: string; service: 'ORM' | 'Marcom';
  /** DP-O1: allotment source not settled; null → lowest tier and `fallback_tier` flag. */
  allotment: number | null;
  start: string | null; end: string | null; end_reason: 'NOT_RENEWED' | 'EARLY_TERMINATED' | null;
  /** When the not-renew / cancel outcome was recorded ("แจ้ง PM เมื่อ"). */
  outcome_at?: string | null;
};
export type SystemCost = {
  partner_id: string; partner: string; system: string; currency: string; base: number; net: number;
  est_fx_to_thb: number | null; discounts: { deal_id: string; title: string; amount: number }[]; fallback_tier: boolean;
};

const d10 = (s: string) => s.slice(0, 10);
export function rateCardOn(data: PartnerData, partner_id: string, system: string, date: string): PartnerRateCard | null {
  const t = d10(date);
  const rows = data.partner_rate_cards
    .filter((r) => r.partner_id === partner_id && r.system_name === system && d10(r.effective_from) <= t && (r.superseded_at == null || d10(r.superseded_at) > t))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return rows[0] ?? null;
}
export const tiersOf = (data: PartnerData, rate_card_id: string): PartnerRateCardTier[] =>
  data.partner_rate_card_tiers.filter((t) => t.rate_card_id === rate_card_id).sort((a, b) => a.allotment_min - b.allotment_min);

export function tierPrice(tiers: PartnerRateCardTier[], allotment: number | null): { price: number; fallback: boolean } | null {
  if (!tiers.length) return null;
  if (allotment == null) return { price: tiers[0]!.price_per_contract_month, fallback: true };
  const hit = tiers.find((t) => allotment >= t.allotment_min && (t.allotment_max == null || allotment <= t.allotment_max));
  return hit ? { price: hit.price_per_contract_month, fallback: false } : { price: tiers[0]!.price_per_contract_month, fallback: true };
}

export type DealState = 'NEGOTIATING' | 'FAILED' | 'UPCOMING' | 'ACTIVE' | 'EXPIRED';
export function getDealState(deal: Pick<PartnerDeal, 'status' | 'start_date' | 'end_date'>, today: string): DealState {
  if (deal.status !== 'SUCCESS') return deal.status;
  const t = d10(today);
  if (deal.start_date && t < d10(deal.start_date)) return 'UPCOMING';
  if (deal.end_date && t > d10(deal.end_date)) return 'EXPIRED';
  return 'ACTIVE';
}
const inScope = (deal: PartnerDeal, contract_id: string) => deal.scope === 'ALL' || deal.contract_ids.includes(contract_id);

/** base = tier price of the version effective on `date`; net = base after active SUCCESS cost discounts
 *  (AMOUNT_PER_CONTRACT first, then PERCENT, floor 0). Marcom or no system row → null. */
export function getContractSystemCost(data: PartnerData, c: PartnerContract, date: string): SystemCost | null {
  if (c.service !== 'ORM') return null;
  const sys = data.contract_partner_system.find((s) => s.contract_id === c.contract_id);
  if (!sys) return null;
  const card = rateCardOn(data, sys.partner_id, sys.system_name, date);
  if (!card) return null;
  const tp = tierPrice(tiersOf(data, card.id), c.allotment);
  if (!tp) return null;
  const deals = data.partner_deals.filter((d) => d.partner_id === sys.partner_id && d.kind === 'COST_DISCOUNT' && getDealState(d, date) === 'ACTIVE' && inScope(d, c.contract_id));
  let net = tp.price; const discounts: SystemCost['discounts'] = [];
  for (const d of deals.filter((x) => x.benefit_type === 'AMOUNT_PER_CONTRACT')) { const a = Math.min(net, d.benefit_value ?? 0); net -= a; discounts.push({ deal_id: d.id, title: d.title, amount: a }); }
  for (const d of deals.filter((x) => x.benefit_type === 'PERCENT')) { const a = net * ((d.benefit_value ?? 0) / 100); net -= a; discounts.push({ deal_id: d.id, title: d.title, amount: a }); }
  net = Math.max(0, Math.round(net * 100) / 100);
  return { partner_id: sys.partner_id, partner: data.partners.find((p) => p.id === sys.partner_id)?.name ?? sys.partner_id, system: sys.system_name, currency: card.currency, base: tp.price, net, est_fx_to_thb: card.est_fx_to_thb, discounts, fallback_tier: tp.fallback };
}

/** max partner_bill_lines.period_end with paid_at not null, else null. */
export function getPrepaidUntil(data: PartnerData, contract_id: string): string | null {
  const ends = data.partner_bill_lines.filter((l) => l.contract_id === contract_id && l.paid_at != null).map((l) => d10(l.period_end)).sort();
  return ends.at(-1) ?? null;
}

/** DP-O2 default: eligible = ORM contracts on that partner whose start date is inside the deal period. */
export function getCashbackExpected(data: PartnerData, deal: PartnerDeal, contracts: PartnerContract[]) {
  const on = new Set(data.contract_partner_system.filter((s) => s.partner_id === deal.partner_id).map((s) => s.contract_id));
  const eligible = contracts.filter((c) => c.service === 'ORM' && on.has(c.contract_id) && c.start && (!deal.start_date || d10(c.start) >= d10(deal.start_date)) && (!deal.end_date || d10(c.start) <= d10(deal.end_date)) && inScope(deal, c.contract_id));
  const ids = new Set(eligible.map((c) => c.contract_id));
  const received = data.partner_cashback_receipts.filter((r) => r.deal_id === deal.id && ids.has(r.contract_id)).length;
  const v = deal.benefit_value ?? 0;
  return { eligible: eligible.length, value: v, expected: eligible.length * v, received, received_amount: received * v, currency: deal.benefit_currency ?? 'THB' };
}

/** Full calendar months from `end` up to `until` (30 Nov → 31 Jan = 2). */
export function monthsOver(end: string, until: string): number {
  const a = new Date(`${d10(end)}T00:00:00Z`), b = new Date(`${d10(until)}T00:00:00Z`);
  if (b <= a) return 0;
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  const lastA = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 0)).getUTCDate();
  const lastB = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate();
  const aEnd = a.getUTCDate() === lastA, bEnd = b.getUTCDate() === lastB;
  if (!(aEnd && bEnd) && b.getUTCDate() < a.getUTCDate()) m -= 1;
  return Math.max(0, m);
}

export type CreditRow =
  | { kind: 'DERIVED'; contract: PartnerContract; partner: string; prepaid_until: string; months_over: number; amount: number; currency: string; notified_at: string | null }
  | { kind: 'STORED'; contract: PartnerContract | null; partner: string; req: SystemCreditRequest };

/** ⑤ rows: derived "รอ PM ส่งคำขอ" + stored requests (last 90 days, plus every open one). DP-O3 amount = months_over × net on the last paid period. */
export function creditRows(data: PartnerData, contracts: PartnerContract[], today: string): CreditRow[] {
  const byId = new Map(contracts.map((c) => [c.contract_id, c]));
  const pName = (id: string) => data.partners.find((p) => p.id === id)?.name ?? id;
  const derived: CreditRow[] = [];
  for (const c of contracts) {
    if (c.service !== 'ORM' || !c.end || !c.end_reason) continue;
    if (data.system_credit_requests.some((r) => r.contract_id === c.contract_id)) continue;
    const until = getPrepaidUntil(data, c.contract_id);
    if (!until || until <= d10(c.end)) continue;
    const lastPaid = data.partner_bill_lines.filter((l) => l.contract_id === c.contract_id && l.paid_at).sort((a, b) => b.period_end.localeCompare(a.period_end))[0]!;
    const cost = getContractSystemCost(data, c, lastPaid.period_start);
    if (!cost) continue;
    const m = monthsOver(c.end, until);
    derived.push({ kind: 'DERIVED', contract: c, partner: cost.partner, prepaid_until: until, months_over: m, amount: Math.round(m * cost.net), currency: cost.currency, notified_at: c.outcome_at ?? null });
  }
  const cut = new Date(`${d10(today)}T00:00:00Z`); cut.setUTCDate(cut.getUTCDate() - 90); const c90 = cut.toISOString().slice(0, 10);
  const stored: CreditRow[] = data.system_credit_requests
    .filter((r) => r.status === 'REQUESTED' || d10(r.requested_at) >= c90)
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
    .map((req) => ({ kind: 'STORED', contract: byId.get(req.contract_id) ?? null, partner: pName(req.partner_id), req }));
  return [...derived, ...stored];
}

/** ⑤ tiles from tables: gained = Σ APPROVED; used = Σ usage; balance = gained − used; earliest expiry of approved credits. */
export function creditTiles(data: PartnerData) {
  const approved = data.system_credit_requests.filter((r) => r.status === 'APPROVED');
  const gained = approved.reduce((s, r) => s + r.amount, 0);
  const usage = data.system_credit_usage.filter((u) => approved.some((r) => r.id === u.credit_request_id));
  const used = usage.reduce((s, u) => s + u.amount, 0);
  const latestBill = [...usage].sort((a, b) => b.used_at.localeCompare(a.used_at))[0]?.partner_bill_ref ?? null;
  const earliest = approved.map((r) => r.credit_expires_at).filter((x): x is string => !!x).sort()[0] ?? null;
  return { gained, gained_n: approved.length, used, latestBill, balance: gained - used, earliest, partners: [...new Set(approved.map((r) => r.partner_id))] };
}

/** ③ one row per current rate card: Σ base / Σ net over its contracts on `date`. */
export function rateCardRows(data: PartnerData, contracts: PartnerContract[], date: string) {
  const current = data.partner_rate_cards.filter((r) => r.superseded_at == null);
  return current.map((card) => {
    const on = data.contract_partner_system.filter((s) => s.partner_id === card.partner_id && s.system_name === card.system_name);
    const costs = on.map((s) => contracts.find((c) => c.contract_id === s.contract_id) ?? { contract_id: s.contract_id, hotel: '', service: 'ORM' as const, allotment: null, start: null, end: null, end_reason: null })
      .map((c) => ({ c, cost: getContractSystemCost(data, c, date) })).filter((x) => x.cost);
    const base = costs.reduce((s, x) => s + x.cost!.base, 0), net = costs.reduce((s, x) => s + x.cost!.net, 0);
    const deals = data.partner_deals.filter((d) => d.partner_id === card.partner_id && d.kind === 'COST_DISCOUNT');
    const active = deals.filter((d) => getDealState(d, date) === 'ACTIVE');
    const negotiating = deals.some((d) => d.status === 'NEGOTIATING');
    return {
      card, partner: data.partners.find((p) => p.id === card.partner_id)?.name ?? card.partner_id, contracts: costs.length,
      base, net, active, negotiating, fallback: costs.filter((x) => x.cost!.fallback_tier).map((x) => x.c.contract_id),
      toThb: (v: number) => (card.currency === 'THB' ? v : card.est_fx_to_thb ? v * card.est_fx_to_thb : null),
    };
  });
}
