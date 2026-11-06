/* Contract Renewal v1.4 §2 — Renewal Offer engine (RP130–RP142). ONE pure module shared by the AE Workspace renewal card,
 * the renewal Wizard and (next prompt) PS Dashboard R5 — never copy it. Fixed rules, not AI. No storage, no React.
 * Inputs: the contract's fee average (contract-fee-average.ts) · a v_ps_repricing row · health level · system group-1 labels ·
 * own-bill overdue flag · config (renewal-rules RenewalConfig v1.4 keys, read at runtime). */
import { RO } from './ps-glossary';
import type { RenewalConfig } from './renewal-rules';
import type { Tier } from './contract-tab-r1';

export type BillingModel = 'FLAT' | 'FIXED_PLUS_COMMISSION' | 'COMMISSION_GUARANTEE';
export const BILLING_MODELS: BillingModel[] = ['FLAT', 'FIXED_PLUS_COMMISSION', 'COMMISSION_GUARANTEE'];
export type OfferType = 'RAISE' | 'KEEP' | 'LOWER' | 'NONE';
export type OfferMatch = 'MATCH' | 'ABOVE' | 'BELOW';
export type OfferConfig = Pick<RenewalConfig, 'renewal_min_raise_thb' | 'lower_fee_steps' | 'lower_commission_steps' | 'mc_commission_raise_points' | 'cg_commission_raise_points'
  | 'switch_fixed_share' | 'switch_guarantee_share' | 'switch_match_tolerance_baht' | 'switch_match_tolerance_pct' | 'fee_average_months'>;

/** §1 — returned by getContractFeeAverage(); fields the data does not hold stay null and `insufficient` is true. */
export type FeeAverage = {
  contract_id: string; model: BillingModel | null; months_used: number;
  fixed_fee: number | null; commission_pct: number | null; guarantee_fee: number | null;
  avg_commission: number | null; avg_billed: number | null;
  guarantee_months: number | null; total_months: number | null; avg_revenue_base: number | null;
  last_price_change: string | null; insufficient: boolean; missing: string[];
};
/** The v_ps_repricing facts the engine reads (one row, read only). */
export type RepricingFacts = { revenue_profile: string | null; cadence: boolean | null; below_value: boolean | null; band_min_pct: number | null; band_max_pct: number | null; last_increase_at: string | null };
export type OfferInput = {
  service: 'ORM' | 'Marcom'; fee: FeeAverage; repricing: RepricingFacts | null;
  /** Health level (system). `red_by_own_overdue_only` = red only because of this contract's overdue bill → not a factor. null = not evaluated. */
  health: { tier: Tier; red_by_own_overdue_only: boolean } | null;
  /** System-detected group-1 (ราคาและความคุ้มค่า) bad label names. AE ✎ labels never enter here. null = not evaluated. */
  system_group1: string[] | null;
  /** Own bill overdue. null = AC data absent. */
  overdue: { own: boolean; days: number | null } | null;
  cfg: OfferConfig; computed_at: string;
};
export type ValueKey = 'fixed_fee' | 'commission_pct' | 'guarantee_fee';
/** One recommended value: old → min…max (exact range, RAISE / LOWER) · default (rounded). KEEP / unchanged: all equal to old. */
export type OfferValue = { key: ValueKey; old: number; min: number; max: number; default: number };
export type FactorKey = 'REVENUE_DOWN' | 'HEALTH_RED' | 'PRICE_LABEL';
/** bad: true = counts · false = checked, fine · null = ไม่พบ (data absent). */
export type Factor = { key: FactorKey; bad: boolean | null; detail: string };
export type OfferTerms = { billing_model: BillingModel; fixed_fee: number | null; commission_pct: number | null; guarantee_fee: number | null };
export type Alternative = { model: BillingModel; terms: OfferTerms; expected_avg: number };
export type Reason = { kind: 'cadence' | 'below' | 'trend' | 'factor' | 'count' | 'overdue' | 'hint'; text: string; tone: 'bad' | 'none' | 'normal' };
export type RenewalOffer = {
  type: OfferType; model: BillingModel | null; values: OfferValue[]; factors: Factor[]; bad_count: number;
  overdue: { own: boolean; days: number | null } | null;
  avg_before: number | null; expected_avg: number | null; delta: number | null; delta_pct: number | null;
  alternatives: Alternative[]; reasons: Reason[]; missing: string[]; hint: string | null; default_terms: OfferTerms | null; computed_at: string;
};

/* ---------- rounding (half-up, float-safe) ---------- */
const roundTo = (x: number, step: number) => Math.floor(x / step + 0.5 + 1e-9) * step;
export const round100 = (x: number) => roundTo(x, 100);
export const round500 = (x: number) => roundTo(x, 500);
export const roundHalfPoint = (x: number) => Math.round(roundTo(x, 0.5) * 10) / 10;
const ceil100 = (x: number) => Math.ceil(x / 100 - 1e-9) * 100;
const pts = (x: number) => Math.round(x * 100) / 100;

/** The value keys each billing model holds. */
export const keysOf = (m: BillingModel): ValueKey[] => (m === 'FLAT' ? ['fixed_fee'] : m === 'FIXED_PLUS_COMMISSION' ? ['fixed_fee', 'commission_pct'] : ['commission_pct', 'guarantee_fee']);
const oldOf = (f: FeeAverage, k: ValueKey) => f[k];
const same = (k: ValueKey, old: number): OfferValue => ({ key: k, old, min: old, max: old, default: old });

/* ---------- §2.4 expected monthly average ---------- */
/** Expected average per month for terms on the contract's current model (§2.4) or another model (cross-model, needs avg_revenue_base). */
export function offerExpectedAvg(fee: FeeAverage, t: OfferTerms): number | null {
  if (t.billing_model === 'FLAT') return t.fixed_fee;
  if (t.billing_model !== fee.model) {
    const base = fee.avg_revenue_base; if (base == null || t.commission_pct == null) return null;
    const comm = (base * t.commission_pct) / 100;
    if (t.billing_model === 'FIXED_PLUS_COMMISSION') return t.fixed_fee == null ? null : t.fixed_fee + comm;
    return t.guarantee_fee == null ? null : Math.max(t.guarantee_fee, comm);
  }
  const oldPct = fee.commission_pct; const avgC = fee.avg_commission;
  if (oldPct == null || !(oldPct > 0) || avgC == null || t.commission_pct == null) return null;
  const projected = (avgC * t.commission_pct) / oldPct;
  if (t.billing_model === 'FIXED_PLUS_COMMISSION') return t.fixed_fee == null ? null : t.fixed_fee + projected;
  const g = fee.guarantee_fee; if (g == null || t.guarantee_fee == null || fee.avg_billed == null) return null;
  if (t.guarantee_fee === g) return Math.max(g, projected) + (fee.avg_billed - Math.max(g, avgC));
  return Math.max(t.guarantee_fee, projected);
}

/* ---------- §2.5 package alternatives (ORM only) ---------- */
export function packageAlternatives(fee: FeeAverage, target: number | null, cfg: OfferConfig): Alternative[] {
  const base = fee.avg_revenue_base; if (target == null || base == null || !(base > 0)) return [];
  const out: Alternative[] = [];
  const add = (terms: OfferTerms) => { if (terms.billing_model === fee.model) return; const e = offerExpectedAvg(fee, terms); if (e != null) out.push({ model: terms.billing_model, terms, expected_avg: e }); };
  add({ billing_model: 'FLAT', fixed_fee: round100(target), commission_pct: null, guarantee_fee: null });
  const fixed = round100(target * cfg.switch_fixed_share);
  add({ billing_model: 'FIXED_PLUS_COMMISSION', fixed_fee: fixed, commission_pct: roundHalfPoint(((target - fixed) / base) * 100), guarantee_fee: null });
  add({ billing_model: 'COMMISSION_GUARANTEE', fixed_fee: null, commission_pct: roundHalfPoint((target / base) * 100), guarantee_fee: round500(target * cfg.switch_guarantee_share) });
  return out;
}

/* ---------- §2.3 values by billing model ---------- */
function valuesFor(type: Exclude<OfferType, 'NONE'>, fee: FeeAverage, model: BillingModel, bad: number, band: [number, number] | null, cfg: OfferConfig): OfferValue[] | null {
  const vals: OfferValue[] = [];
  for (const k of keysOf(model)) {
    const old = oldOf(fee, k); if (old == null) return null;
    if (type === 'KEEP' || k === 'guarantee_fee') { vals.push(same(k, old)); continue; } // RN31: guarantee never recommended to change
    const step = Math.max(0, Math.min(bad, 3) - 1);
    if (k === 'fixed_fee') {
      if (type === 'RAISE') {
        if (!band) return null;
        const mid = old * (1 + (band[0] + band[1]) / 2 / 100); let def = round100(mid);
        if (model === 'FLAT' && def - old < cfg.renewal_min_raise_thb) def = ceil100(old + cfg.renewal_min_raise_thb); // RN30, FLAT only
        vals.push({ key: k, old, min: pts(old * (1 + band[0] / 100)), max: pts(old * (1 + band[1] / 100)), default: def });
      } else { const rec = round100(old * (1 - (cfg.lower_fee_steps[step] ?? 0) / 100)); vals.push({ key: k, old, min: rec, max: old, default: rec }); }
      continue;
    }
    // commission_pct
    if (model === 'FIXED_PLUS_COMMISSION') {
      if (type === 'RAISE') { const v = pts(old + cfg.mc_commission_raise_points); vals.push({ key: k, old, min: v, max: v, default: v }); } else vals.push(same(k, old)); // LOWER: commission unchanged
    } else if (type === 'RAISE') {
      const [a, b] = cfg.cg_commission_raise_points; vals.push({ key: k, old, min: pts(old + a), max: pts(old + b), default: pts(old + (a + b) / 2) });
    } else { const rec = pts(old - (cfg.lower_commission_steps[step] ?? 0)); vals.push({ key: k, old, min: rec, max: old, default: rec }); }
  }
  return vals;
}
export const termsOf = (model: BillingModel, values: OfferValue[], pick: 'default' | 'old' = 'default'): OfferTerms => {
  const v = (k: ValueKey) => values.find((x) => x.key === k)?.[pick] ?? null;
  return { billing_model: model, fixed_fee: v('fixed_fee'), commission_pct: v('commission_pct'), guarantee_fee: v('guarantee_fee') };
};

const monthTh = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('th-TH', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : '—');

/* ---------- §2.2 type + §2.7 reasons ---------- */
export function computeRenewalOffer(i: OfferInput): RenewalOffer {
  const f = i.fee; const missing = [...f.missing];
  const factors: Factor[] = [
    { key: 'REVENUE_DOWN', bad: i.repricing?.revenue_profile && i.repricing.revenue_profile !== 'pending' ? i.repricing.revenue_profile === 'declining' : null, detail: RO.trend[i.repricing?.revenue_profile ?? ''] ?? RO.notFound },
    { key: 'HEALTH_RED', bad: i.health ? i.health.tier === 'R' && !i.health.red_by_own_overdue_only : null, detail: i.health ? `ระดับ${i.health.tier === 'R' ? 'แดง' : i.health.tier === 'A' ? 'เหลือง' : 'เขียว'}${i.health.red_by_own_overdue_only ? ' (จากค้างชำระ · ไม่นับ)' : ''}` : RO.notFound },
    { key: 'PRICE_LABEL', bad: i.system_group1 ? i.system_group1.length > 0 : null, detail: i.system_group1 ? (i.system_group1.join(' · ') || 'ไม่มี') : RO.notFound },
  ];
  const bad = factors.filter((x) => x.bad === true).length;
  const base: RenewalOffer = { type: 'NONE', model: f.model, values: [], factors, bad_count: bad, overdue: i.overdue, avg_before: f.avg_billed, expected_avg: null, delta: null, delta_pct: null, alternatives: [], reasons: [], missing, hint: null, default_terms: null, computed_at: i.computed_at };
  const none = (...why: string[]): RenewalOffer => ({ ...base, missing: [...new Set([...missing, ...why])] });
  if (!f.model) return none('model');
  if (f.insufficient) return none();
  const reasons: Reason[] = [];
  const rp = i.repricing;
  let type: Exclude<OfferType, 'NONE'>;
  if (i.overdue?.own) {
    type = 'KEEP';
    reasons.push({ kind: 'overdue', text: RO.overdue + (i.overdue.days != null ? ` · ${RO.overdueDays(i.overdue.days)}` : ''), tone: 'bad' });
  } else if (bad >= 1) type = 'LOWER';
  else {
    if (!rp || (rp.cadence == null && rp.below_value == null)) return none('repricing');
    type = rp.cadence || rp.below_value ? 'RAISE' : 'KEEP';
  }
  const band: [number, number] | null = rp?.band_min_pct != null && rp.band_max_pct != null ? [rp.band_min_pct, rp.band_max_pct] : null;
  const values = valuesFor(type, f, f.model, bad, band, i.cfg);
  if (!values) return none(type === 'RAISE' && !band ? 'band' : 'fee');
  if (type !== 'KEEP' || !i.overdue?.own) {
    const last = f.last_price_change ?? rp?.last_increase_at ?? null;
    if (rp?.cadence != null) reasons.push({ kind: 'cadence', text: rp.cadence ? RO.cadence(monthTh(last)) : RO.noCadence(monthTh(last)), tone: rp.cadence ? 'normal' : 'none' });
    if (rp?.below_value) reasons.push({ kind: 'below', text: RO.below, tone: 'normal' });
    if (rp?.revenue_profile) reasons.push({ kind: 'trend', text: `${RO.trend[rp.revenue_profile] ?? rp.revenue_profile}${band && rp.revenue_profile !== 'declining' ? ` → ${RO.band(band[0], band[1])}` : ''}`, tone: 'normal' });
    for (const x of factors) reasons.push({ kind: 'factor', text: `${RO.factor[x.key]}: ${x.detail}`, tone: x.bad === true ? 'bad' : x.bad == null ? 'none' : 'normal' });
    reasons.push({ kind: 'count', text: RO.count(bad, RO.type[type]!), tone: bad ? 'bad' : 'normal' });
  }
  const hint = i.overdue?.own && i.service === 'ORM' ? RO.hint : null;
  if (hint) reasons.push({ kind: 'hint', text: hint, tone: 'normal' });
  const default_terms = termsOf(f.model, values);
  const expected = offerExpectedAvg(f, default_terms);
  const delta = expected != null && f.avg_billed != null ? expected - f.avg_billed : null;
  return {
    ...base, type, values, reasons, hint, default_terms, expected_avg: expected, delta,
    delta_pct: delta != null && f.avg_billed ? (delta / f.avg_billed) * 100 : null,
    alternatives: i.service === 'ORM' ? packageAlternatives(f, expected, i.cfg) : [],
  };
}

/* ---------- §2.6 match ---------- */
const EPS = 1e-6;
/** `MATCH` · `ABOVE` · `BELOW` of an AE offer against the recommendation; null when the recommendation is NONE (or the offer can't be valued). */
export function matchOffer(reco: Pick<RenewalOffer, 'type' | 'model' | 'values' | 'expected_avg'>, offered: OfferTerms, fee?: FeeAverage | null, cfg?: Pick<OfferConfig, 'switch_match_tolerance_baht' | 'switch_match_tolerance_pct'>, packageChanged = false): OfferMatch | null {
  if (reco.type === 'NONE' || !reco.model) return null;
  // O-26 PK9: a package change compares the expected average with the switch tolerance (same as a model switch).
  if (offered.billing_model !== reco.model || packageChanged) {
    if (!fee || !cfg || reco.expected_avg == null) return null;
    const e = offerExpectedAvg(fee, offered); if (e == null) return null;
    const tol = Math.max(cfg.switch_match_tolerance_baht, (reco.expected_avg * cfg.switch_match_tolerance_pct) / 100);
    return Math.abs(e - reco.expected_avg) <= tol + EPS ? 'MATCH' : e > reco.expected_avg ? 'ABOVE' : 'BELOW';
  }
  let below = false; let above = false;
  for (const v of reco.values) {
    const o = offered[v.key]; if (o == null) { below = true; continue; }
    if (Math.abs(o - v.default) < EPS) continue; // the system default always follows the recommendation (v1.3)
    if (reco.type === 'LOWER' && v.min < v.old - EPS) { // the ranged value: between recommended and old, not old
      if (Math.abs(o - v.old) < EPS || o > v.old) above = true; else if (o < v.min - EPS) below = true;
      continue;
    }
    if (o < v.min - EPS) below = true; else if (o > v.max + EPS) above = true;
  }
  return below ? 'BELOW' : above ? 'ABOVE' : 'MATCH';
}
