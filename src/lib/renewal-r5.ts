/* PS Dashboard · Tab "สัญญา & ราคา" R5 (O-18) — Renewal Offer on card ③ การต่อสัญญา: pure display rules only.
 * No formula here: recommendation values / expected averages / match always come from the v1.4 engine
 * (computeRenewalOffer · matchOffer · offerExpectedAvg in renewalOffer.ts) or a stored reco_snapshot. No storage, no React. */
import type { BillingModel, OfferMatch, OfferType, OfferValue } from './renewalOffer';
import { reasonGroup } from './renewal-r2';

export type ShortTerms = { fixed_fee?: number | null; commission_pct?: number | null; guarantee_fee?: number | null };
const n0 = (n: number) => Math.round(n).toLocaleString('en-US');
const thb = (n: number | null | undefined) => (n == null ? '—' : `฿${n0(n)}`);
const pc = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 100) / 100}%`);
const thbRange = (a: number, b: number) => (Math.round(a) === Math.round(b) ? thb(a) : `฿${n0(a)}–${n0(b)}`);
const pcRange = (a: number, b: number) => (Math.abs(a - b) < 1e-6 ? pc(a) : `${Math.round(a * 100) / 100}–${pc(b)}`);

/** Short values: `฿25,000` · `฿8,500 + 8%` · `12% · ขั้นต่ำ ฿8,000`. */
export function shortTerms(model: BillingModel | null | undefined, t: ShortTerms | null | undefined): string {
  if (!model || !t) return '—';
  if (model === 'FLAT') return thb(t.fixed_fee);
  if (model === 'FIXED_PLUS_COMMISSION') return `${thb(t.fixed_fee)} + ${pc(t.commission_pct)}`;
  return `${pc(t.commission_pct)} · ขั้นต่ำ ${thb(t.guarantee_fee)}`;
}
/** Recommended values from the engine's OfferValue list — range for RAISE, recommended default otherwise. */
export function shortReco(type: OfferType, model: BillingModel | null | undefined, values: OfferValue[]): string {
  if (!model || type === 'NONE') return '—';
  const v = (k: OfferValue['key']) => values.find((x) => x.key === k);
  const txt = (k: OfferValue['key']) => {
    const x = v(k); if (!x) return '—';
    if (type === 'RAISE' && x.min !== x.max) return k === 'commission_pct' ? pcRange(x.min, x.max) : thbRange(x.min, x.max);
    return k === 'commission_pct' ? pc(x.default) : thb(x.default);
  };
  if (model === 'FLAT') return txt('fixed_fee');
  if (model === 'FIXED_PLUS_COMMISSION') return `${txt('fixed_fee')} + ${txt('commission_pct')}`;
  return `${txt('commission_pct')} · ขั้นต่ำ ${txt('guarantee_fee')}`;
}
export type Delta = { kind: 'up' | 'down' | 'same'; text: string } | null;
/** `+฿y (+z%)` · `−฿y (−z%)` · `เท่าเดิม`. */
export function deltaOf(before: number | null | undefined, after: number | null | undefined): Delta {
  if (before == null || after == null) return null;
  const d = after - before;
  if (Math.abs(d) < 0.5) return { kind: 'same', text: 'เท่าเดิม' };
  const p = before ? Math.abs(Math.round((d / before) * 1000) / 10) : 0;
  const s = d > 0 ? '+' : '−';
  return { kind: d > 0 ? 'up' : 'down', text: `${s}฿${n0(Math.abs(d))} (${s}${p}%)` };
}

/* ---------- §3 decided-card tag ---------- */
export const isGroup1 = (key: string) => reasonGroup(key) === 1;
export type DecidedTag = 'MATCH' | 'ABOVE' | 'BELOW' | 'PRICE_LOST' | 'OTHER_LOST' | 'WAIT_REASON' | 'KEEP_TERMS' | 'NO_SNAPSHOT';
export const DECIDED_TAG_TH: Record<DecidedTag, string> = {
  MATCH: 'ต่อตามคำแนะนำ', ABOVE: 'ต่อสูงกว่าคำแนะนำ', BELOW: 'ต่อต่ำกว่าคำแนะนำ', PRICE_LOST: 'หลุดเพราะค่าบริการ',
  OTHER_LOST: 'ไม่ต่อด้วยเหตุผลอื่น ไม่เกี่ยวกับค่าบริการ', WAIT_REASON: 'รอบันทึกเหตุผล', KEEP_TERMS: 'ต่อตามเงื่อนไขเดิม', NO_SNAPSHOT: 'ไม่มีข้อมูลคำแนะนำ',
};
/** Tone: tags (green / amber / red) or grey text. */
export const DECIDED_TAG_TONE: Record<DecidedTag, 'good' | 'amber' | 'bad' | 'grey'> = {
  MATCH: 'good', ABOVE: 'amber', BELOW: 'bad', PRICE_LOST: 'bad', OTHER_LOST: 'grey', WAIT_REASON: 'grey', KEEP_TERMS: 'grey', NO_SNAPSHOT: 'grey',
};
/** RP145 / RP143. `reasons` = the 3 recorded labels (main + secondary) or null when not yet recorded. */
export function decidedTag(x: { stage: 'RENEWED' | 'LOST_OR_DECLINED'; hasSnapshot: boolean; recoType: OfferType | null; match: OfferMatch | null | undefined; reasons: string[] | null }): DecidedTag {
  if (!x.hasSnapshot) return 'NO_SNAPSHOT';
  if (x.stage === 'LOST_OR_DECLINED') {
    if (!x.reasons) return 'WAIT_REASON';
    return x.reasons.some(isGroup1) ? 'PRICE_LOST' : 'OTHER_LOST';
  }
  if (x.recoType === 'NONE' || !x.match) return 'KEEP_TERMS';
  return x.match;
}

/* ---------- §4 highlight chips ---------- */
export type ChipType = Exclude<OfferType, 'NONE'>;
export const OFFER_CHIPS: ChipType[] = ['RAISE', 'KEEP', 'LOWER'];
/** Counts per chip over the cards of the current period (NONE / unknown never counted — no chip for them). */
export function offerChipCounts<T>(items: T[], typeOf: (i: T) => OfferType | null): Record<ChipType, number> {
  const out: Record<ChipType, number> = { RAISE: 0, KEEP: 0, LOWER: 0 };
  for (const i of items) { const t = typeOf(i); if (t && t !== 'NONE') out[t]++; }
  return out;
}
/** Offer filter part of the highlight: empty selection = no filter; otherwise the card's type must be selected (AND with AE / search). */
export const offerHit = (sel: ReadonlySet<ChipType>, t: OfferType | null) => !sel.size || (!!t && t !== 'NONE' && sel.has(t));
