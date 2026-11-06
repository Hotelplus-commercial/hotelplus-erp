/* O-26 (PK1–PK14) — package change at renewal: pure helpers. Options come only from the Product Catalog (PK3);
 * Marcom channels reuse the Header R3 channel map (header-contract-join.ts). No storage access here. */
import type { Contract, ContractLine, Product } from './crm-types';
import { CHANNELS, CHANNEL_SKUS, channelOfSku, type Channel } from './header-contract-join';

export type Svc = 'ORM' | 'Marcom';
/** One monthly service line of a package (what `renewal_request.old_lines` / `new_lines` store). */
export type PkgLine = { sku: string; name: string; unit_price: number | null; commission_rate: number | null; billing: 'monthly' | 'one_time' };
export type OrmTier = 'LITE' | 'SMART' | 'FIXED' | 'PERFORMANCE';
export type PackageReasonCode = (typeof PACKAGE_REASONS)[number];
export const PACKAGE_REASONS = ['ลดค่าใช้จ่ายให้ลูกค้า', 'ลูกค้าใช้บริการไม่ครบ', 'ค้างชำระ', 'เพิ่มช่องทาง / ขยายบริการ', 'อื่น ๆ'] as const;
export const ORM_LITE_SKU = 'ORM-MTH-LITE';
export const ORM_FULL_SKU = 'ORM-MTH-FULL';
/** Contract code marker read by Servicing (`orm_lite` flag). */
export const ORM_LITE_CODE = 'ORM-LITE';
export const ORM_TIER_LABEL: Record<OrmTier, string> = { LITE: 'ORM Lite', SMART: 'ORM (เต็ม) · Smart', FIXED: 'ORM (เต็ม) · Fixed', PERFORMANCE: 'ORM (เต็ม) · Performance' };
const TIER_PKG: Record<OrmTier, string> = { LITE: 'ORM-MTH-LITE-STD', SMART: 'ORM-MTH-FULL-SMART', FIXED: 'ORM-MTH-FULL-FIXED', PERFORMANCE: 'ORM-MTH-FULL-PERFORMANCE' };
const SETUP_OF: Record<Channel, string> = { Meta: 'MARCOM-SETUP-META', TikTok: 'MARCOM-SETUP-TIKTOK', Google: 'MARCOM-SETUP-GMB' };

const up = (s: string) => s.trim().toUpperCase();
export const svcOfSku = (sku: string): Svc => (/^ORM/i.test(sku) ? 'ORM' : 'Marcom');

/** Monthly lines of one service on a main-store contract (setup / one-time lines are not part of the package). */
export function linesOfContract(c: Pick<Contract, 'lines'>, svc: Svc): PkgLine[] {
  return c.lines.filter((l) => l.billing === 'monthly' && svcOfSku(l.sku_snapshot) === svc)
    .map((l) => ({ sku: l.sku_snapshot, name: l.name_snapshot || l.sku_snapshot, unit_price: l.unit_price, commission_rate: l.commission_rate, billing: 'monthly' }));
}

/** ORM tier from the lines (a Lite line → LITE; full lines read the package snapshot / name, default SMART). */
export function ormTierOf(lines: (PkgLine & { package_snapshot?: string | null })[]): OrmTier | null {
  const main = lines.find((l) => up(l.sku).startsWith(ORM_LITE_SKU) || up(l.sku).startsWith(ORM_FULL_SKU));
  if (!main) return null;
  if (up(main.sku).startsWith(ORM_LITE_SKU)) return 'LITE';
  const key = `${main.package_snapshot ?? ''} ${main.sku} ${main.name}`.toUpperCase();
  return key.includes('FIXED') ? 'FIXED' : key.includes('PERFORMANCE') ? 'PERFORMANCE' : 'SMART';
}

/** Catalog price of one ORM tier (package price + commission %), null when the catalog has no such package. */
export function ormTierPrice(products: Product[], tier: OrmTier): { fee: number | null; commission_pct: number | null } | null {
  for (const p of products) for (const k of p.packages ?? []) if (k.package_sku === TIER_PKG[tier]) return { fee: k.base_price, commission_pct: k.commission_rate == null ? null : Math.round(k.commission_rate * 10000) / 100 };
  return null;
}
/** PK4: ORM Lite standard = Monthly fee + Commission, price read from the catalog package (฿3,900 + 5% after D1). */
export function ormLiteDefaults(products: Product[]) {
  const p = ormTierPrice(products, 'LITE');
  return { billing_model: 'FIXED_PLUS_COMMISSION' as const, fixed_fee: p?.fee ?? 3900, commission_pct: p?.commission_pct ?? 5 };
}

/** The new ORM main line for a tier (name / sku from the catalog). */
export function ormLine(products: Product[], tier: OrmTier, fee: number | null, commissionPct: number | null): PkgLine {
  const sku = tier === 'LITE' ? ORM_LITE_SKU : ORM_FULL_SKU;
  const p = products.find((x) => x.sku === sku);
  return { sku, name: tier === 'LITE' ? (p?.name_en ?? 'ORM Lite Service') : `${p?.name_en ?? 'ORM Full Service'} · ${ORM_TIER_LABEL[tier].split(' · ')[1]}`, unit_price: fee, commission_rate: commissionPct == null ? null : Math.round(commissionPct * 100) / 10000, billing: 'monthly' };
}

/** Active ORM monthly add-ons offered with Lite (catalog `parent_sku`). */
export function ormAddonOptions(products: Product[]): Product[] {
  return products.filter((p) => p.active && p.service_line === 'ORM' && p.category === 'addon' && p.billing === 'monthly');
}

/** PK5: Marcom options per channel — active monthly SKUs + add-ons of that channel (inactive SKUs never offered, D2). */
export function marcomOptions(products: Product[]): Record<Channel, Product[]> {
  const out = { Meta: [], TikTok: [], Google: [] } as Record<Channel, Product[]>;
  for (const p of products) {
    if (!p.active || p.service_line !== 'MARCOM' || p.billing !== 'monthly') continue;
    const ch = channelOfSku(p.sku); if (ch && ch !== 'SETUP') out[ch].push(p);
  }
  return out;
}
export const lineFromProduct = (p: Product, price?: number | null): PkgLine => ({ sku: p.sku, name: p.name_en || p.name_th, unit_price: price ?? p.base_price, commission_rate: null, billing: 'monthly' });
export const channelsOf = (lines: PkgLine[]): Channel[] => CHANNELS.filter((ch) => lines.some((l) => CHANNEL_SKUS[ch].includes(up(l.sku))));
export const CHANNELS_OF = (l: PkgLine): Channel[] => channelsOf([l]);

/** PK7: added (green) · removed (red) · kept (grey), by SKU. */
export function diffLines(oldL: PkgLine[], newL: PkgLine[]) {
  const has = (list: PkgLine[], l: PkgLine) => list.some((x) => up(x.sku) === up(l.sku));
  return { added: newL.filter((l) => !has(oldL, l)), removed: oldL.filter((l) => !has(newL, l)), kept: newL.filter((l) => has(oldL, l)) };
}
/** Same SKU set = the package did not change (prices are terms, not package). */
export function isPackageChanged(oldL: PkgLine[], newL: PkgLine[]) { const d = diffLines(oldL, newL); return d.added.length + d.removed.length > 0; }
export const monthlySum = (lines: PkgLine[]) => lines.reduce((s, l) => s + (l.billing === 'monthly' ? l.unit_price ?? 0 : 0), 0);

/** PK6: setup is suggested only for a Marcom channel the customer did not have; existing services never pay setup again. */
export function setupSuggestions(products: Product[], oldL: PkgLine[], newL: PkgLine[]): PkgLine[] {
  const had = channelsOf(oldL);
  return channelsOf(newL).filter((ch) => !had.includes(ch)).map((ch) => {
    const p = products.find((x) => x.sku === SETUP_OF[ch]);
    return { sku: SETUP_OF[ch], name: p?.name_en ?? `Register ${ch}`, unit_price: p?.base_price ?? null, commission_rate: null, billing: 'one_time' };
  });
}

/** PK5 / PK14 validation. Returns the Thai error or null. Kept old lines may be inactive in the catalog (D2: shown as คงเดิม). */
export function validatePackage(svc: Svc, products: Product[], oldL: PkgLine[], newL: PkgLine[]): string | null {
  if (svc === 'Marcom' && channelsOf(newL).length === 0) return 'ต้องเลือกอย่างน้อย 1 ช่องทาง';
  if (svc === 'ORM' && ormTierOf(newL) == null) return 'เลือกแพ็กเกจ ORM 1 ชุด';
  for (const l of newL) {
    if (svcOfSku(l.sku) !== svc) return 'เปลี่ยนข้ามบริการไม่ได้ · ต้องทำสัญญาใหม่ผ่าน BD';
    const kept = oldL.some((o) => up(o.sku) === up(l.sku));
    if (!kept && !products.some((p) => p.active && p.sku === l.sku)) return 'บริการนี้ไม่มีใน Product Catalog';
  }
  return null;
}
export const packageReasonValid = (r: { code: string | null; text: string } | null | undefined) => !!r?.code && (r.code !== 'อื่น ๆ' || r.text.trim().length > 0);

/** Human label of a package (no raw product codes on screen). */
export function packageLabel(svc: Svc, lines: PkgLine[]): string {
  if (svc === 'ORM') { const t = ormTierOf(lines); return t ? ORM_TIER_LABEL[t] : 'ORM'; }
  const ch = channelsOf(lines); return ch.length ? ch.join(' + ') : 'Marcom';
}
/** Full ORM → ORM Lite (PK-Q5 ticket to the ORM team). */
export const isOrmFullToLite = (oldL: PkgLine[], newL: PkgLine[]) => { const a = ormTierOf(oldL); return !!a && a !== 'LITE' && ormTierOf(newL) === 'LITE'; };
/** End of the first month of the new contract (ticket due date). */
export function firstMonthEnd(start: string): string {
  const d = new Date(`${start.slice(0, 10)}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
}
/** PK10: new contract lines from the package lines (ids derived from the new contract id). */
export function contractLinesOf(newId: string, lines: PkgLine[]): ContractLine[] {
  return lines.map((l, i) => ({ line_id: `${newId}-P${i + 1}`, sku_snapshot: l.sku, name_snapshot: l.name, package_snapshot: null, billing: l.billing, unit_price: l.unit_price, commission_rate: l.commission_rate, quantity: 1 }));
}
