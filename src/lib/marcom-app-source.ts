/* Header R2 §7 — Marcom App adapter (PS App pulls). Stub only in this pass: every call returns
 * "not connected" until the real Marcom App integration exists. The DEMO fixture supplies its own rows.
 *
 * Metric → source:
 *   Content delivered (posts) → Marcom App · getPostsByContract       → not connected
 *   Ads top-ups (฿)           → Marcom App · getAdsTopUpsByContract   → not connected
 *   KOL visits (people)       → Marcom App · getKolVisitsByContract   → not connected
 *   Content / KOL quota       → contract (PS App) — read live, not from this adapter
 */
import type { Period } from './ps-dashboard-global';

export type MarcomRecord = { contract_id: string; date: string; qty: number };
export type MarcomResult = { connected: false; reason: 'not_connected' } | { connected: true; rows: MarcomRecord[] };
export type MarcomAppSource = {
  getPostsByContract(contractIds: string[], range: Period): Promise<MarcomResult>;
  getAdsTopUpsByContract(contractIds: string[], range: Period): Promise<MarcomResult>;
  getKolVisitsByContract(contractIds: string[], range: Period): Promise<MarcomResult>;
};
const notConnected = async (): Promise<MarcomResult> => ({ connected: false, reason: 'not_connected' });
export const marcomAppSource: MarcomAppSource = {
  getPostsByContract: notConnected,
  getAdsTopUpsByContract: notConnected,
  getKolVisitsByContract: notConnected,
};
export const MARCOM_NOT_CONNECTED = 'รอข้อมูลจาก Marcom App';
