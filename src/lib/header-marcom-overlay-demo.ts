/* Header R3 HR33 — DEMO-only in-memory service-line overlay for the 5 demo Marcom contracts.
 * DEMO SAMPLE PRICES (approved by Sai, 6 Nov 2026) — not real prices. Replaces the placeholder MARCOM-MTH-META
 * line for HEADER COUNTING ONLY; never written to the main store, renewal store or any storage. */
import type { ChannelLine } from './header-contract-join';

const L = (sku: string, unit_price: number, from: string, to: string | null = null): ChannelLine => ({ sku, unit_price, billing: 'monthly', from, to });
export const HEADER_MARCOM_DEMO_OVERLAY: Record<string, ChannelLine[]> = {
  'R2-M1': [L('MARCOM-MTH-META', 25000, '2025-04-01'), L('MARCOM-MTH-TIKTOK', 18000, '2025-04-01')],
  'R2-M2': [L('MARCOM-MTH-META', 30000, '2025-07-01'), L('MARCOM-MTH-GMB', 6000, '2025-07-01')],
  /* price change at renewal (1 Oct 2026) → drives the fee-change chip */
  'R2-M3': [L('MARCOM-MTH-META', 18000, '2025-10-01', '2026-10-01'), L('MARCOM-MTH-META', 20000, '2026-10-01')],
  'R2-M4': [L('MARCOM-MTH-TIKTOK', 22000, '2026-09-30'), L('MARCOM-MTH-GMB', 5000, '2026-09-30')],
  'R1-M1': [L('MARCOM-MTH-META', 18000, '2026-10-08')],
};
