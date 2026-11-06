/* Header R3 HR27 / HR28 / HR30–HR32 — header rows ↔ main contract store join + Marcom channel mapping.
 * Pure and read-only: never writes the main store, renewal store or any storage. */
import type { PortfolioContract } from './ps-header-r2';

export type Channel = 'Meta' | 'TikTok' | 'Google';
export const CHANNELS: Channel[] = ['Meta', 'TikTok', 'Google'];
/** Decided by Sai (6 Nov 2026): Google = GMB · ADDON-KOL-TRAVEL = TikTok · MARCOM-SETUP-* never counted.
 * MARCOM-MTH-TIKTOK package options (BASIC / STD / PRO) are packages of that one SKU → TikTok. */
export const CHANNEL_SKUS: Record<Channel, string[]> = {
  Meta: ['MARCOM-MTH-META', 'MARCOM-MTH-META-LITE-CONTENT', 'MARCOM-MTH-META-LITE-ADS', 'MARCOM-ADDON-META-LITE-CONTENT4'],
  TikTok: ['MARCOM-MTH-TIKTOK', 'MARCOM-MTH-TIKTOK-BASIC', 'MARCOM-MTH-TIKTOK-STD', 'MARCOM-MTH-TIKTOK-PRO', 'MARCOM-MTH-TIKTOK-LITE', 'MARCOM-ADDON-TIKTOK-KOL2', 'MARCOM-ADDON-KOL-TRAVEL'],
  Google: ['MARCOM-MTH-GMB'],
};
/** 'SETUP' = one-time setup line (never counted) · null = ไม่ระบุช่องทาง (reported, never guessed). */
export function channelOfSku(sku: string): Channel | 'SETUP' | null {
  const s = sku.trim().toUpperCase();
  if (s.startsWith('MARCOM-SETUP-')) return 'SETUP';
  for (const ch of CHANNELS) if (CHANNEL_SKUS[ch].includes(s)) return ch;
  return null;
}

/** One service line as the header counts it (effective window allows a price change at renewal). */
export type ChannelLine = { sku: string; unit_price: number | null; billing: string; from: string; to: string | null };

type StoreLine = { sku_snapshot: string; unit_price?: number | null | undefined; billing: string; quantity?: number | undefined };
export type StoreContract = { contract_id: string; hotel_id?: string | null | undefined; start_date: string; duration_months: number; inactivated_at?: string | null | undefined; lines: StoreLine[] };
export type JoinRow = { contract_id?: string | null | undefined; hotel_id: string; service: 'ORM' | 'Marcom' };
export type Joined = { contract_id: string | null; start_date: string | null; end_date: string | null; lines: ChannelLine[]; match: 'ID' | 'HOTEL_SERVICE' | 'NONE' };

const addMonths = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
const minusDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);
const svcOfSku = (sku: string) => (/^ORM/i.test(sku) ? 'ORM' : /^MARCOM/i.test(sku) ? 'Marcom' : null);
const endOf = (c: StoreContract) => minusDay(addMonths(c.start_date.slice(0, 10), c.duration_months || 12));
const activeOnDay = (c: StoreContract, day: string) => c.start_date.slice(0, 10) <= day && !c.inactivated_at && endOf(c) >= day;

/** HR28: contract_id first; else hotel + service + active on `date`; else NONE. Never hotel alone. */
export function headerContractJoin(rows: JoinRow[], date: string, store: StoreContract[]): Joined[] {
  return rows.map((r) => {
    const hasSvc = (c: StoreContract) => c.lines.some((l) => svcOfSku(l.sku_snapshot) === r.service);
    let match: Joined['match'] = 'NONE';
    let c = r.contract_id ? store.find((x) => x.contract_id === r.contract_id) : undefined;
    if (c) match = 'ID';
    else {
      const cands = store.filter((x) => x.hotel_id === r.hotel_id && hasSvc(x) && activeOnDay(x, date));
      if (cands.length === 1) { c = cands[0]; match = 'HOTEL_SERVICE'; }
    }
    if (!c) return { contract_id: null, start_date: null, end_date: null, lines: [], match };
    const lines = c.lines.filter((l) => l.billing === 'monthly' && svcOfSku(l.sku_snapshot) === r.service)
      .map((l) => ({ sku: l.sku_snapshot, unit_price: l.unit_price == null ? null : l.unit_price * (l.quantity || 1), billing: l.billing, from: c!.start_date.slice(0, 10), to: null }));
    return { contract_id: c.contract_id, start_date: c.start_date.slice(0, 10), end_date: endOf(c), lines, match };
  });
}

const lineOn = (l: ChannelLine, day: string) => l.billing === 'monthly' && l.from <= day && (!l.to || day < l.to);
/** HR30–HR32: per channel as of `day` — contracts with ≥ 1 counted monthly line, average fee = channel sum ÷ contracts. */
export function marcomChannelsAsOf(contracts: PortfolioContract[], day: string) {
  const act = contracts.filter((c) => c.service === 'Marcom' && c.start.slice(0, 10) <= day && (!c.end || c.end.slice(0, 10) > day));
  const out = {} as Record<Channel, { n: number; value: number | null }>;
  for (const ch of CHANNELS) {
    const sums = act.flatMap((c) => { const ls = (c.lines ?? []).filter((l) => lineOn(l, day) && channelOfSku(l.sku) === ch); return ls.length ? [ls.reduce((s, l) => s + (l.unit_price ?? 0), 0)] : []; });
    out[ch] = { n: sums.length, value: sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null };
  }
  const unspecified = act.filter((c) => !(c.lines ?? []).some((l) => lineOn(l, day) && CHANNELS.includes(channelOfSku(l.sku) as Channel))).length;
  return { ...out, unspecified };
}
