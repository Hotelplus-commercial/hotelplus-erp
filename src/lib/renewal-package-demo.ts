/* O-26 §5 DEMO (add only, in memory): three package-change renewals. Contracts enter the DEMO main contract state with explicit lines;
 * requests are seeded by renewal-store (seedPackageRequests). Prices are DEMO sample prices. */
import type { Contract, ContractLine } from './crm-types';
import type { PkgLine } from './renewal-package';

const line = (cid: string, n: number, sku: string, name: string, price: number | null, comm: number | null = null): ContractLine =>
  ({ line_id: `${cid}-L${n}`, sku_snapshot: sku, name_snapshot: name, package_snapshot: null, billing: 'monthly', unit_price: price, commission_rate: comm, quantity: 1 });
const contract = (cid: string, hotel_id: string, legal: string, signer: string, hotel: string, start: string, lines: ContractLine[]): Contract => ({
  contract_id: cid, hotel_id, from_quote_id: '', billing_status: 'ACTIVE', inactivated_at: null,
  customer_snapshot: { customer_id: `CUS-${hotel_id.slice(3)}`, legal_name: legal, type: 'juristic', tax_id: '', address: '', signer_name: signer, contact_phone: '', contact_email: '', hotel_name: hotel },
  template_snapshot: { template_id: '', version: '', body_url: '' }, lines, monthly_value: lines.reduce((s, l) => s + (l.unit_price ?? 0), 0),
  start_date: start, duration_months: 12, status: 'contract_completed', case_number: null, signing_type: 'juristic', documents: ['หนังสือรับรองบริษัท.pdf'],
  live_link_signed_at: null, created_at: `${start}T03:00:00.000Z`, created_by: 'seed:o26-demo',
});

export const PK_DEMO_CONTRACTS: Contract[] = [
  contract('CT-PK-ORM1', 'HTL0451', 'บริษัท เชียงราย ฮิลล์ ลอดจ์ จำกัด', 'คุณอรุณ ดอยงาม', 'Chiang Rai Hill Lodge', '2025-12-01',
    [{ ...line('CT-PK-ORM1', 1, 'ORM-MTH-FULL', 'ORM Full Service · Smart', 16000, 0.03), package_snapshot: 'ORM-MTH-FULL-SMART' }]),
  contract('CT-PK-MC1', 'HTL0452', 'บริษัท พัทยา บีช ลอฟท์ จำกัด', 'คุณชายหาด สมใจ', 'Pattaya Beach Loft', '2025-10-16',
    [line('CT-PK-MC1', 1, 'MARCOM-MTH-META-LITE-CONTENT', 'Meta Lite — Content Posts', 4000), line('CT-PK-MC1', 2, 'MARCOM-MTH-META-LITE-ADS', 'Meta Lite — Ads Management', 4000)]),
  contract('CT-PK-MC2', 'HTL0453', 'บริษัท หาดใหญ่ เซ็นทรัล โฮเทล จำกัด', 'คุณสงขลา ใจดี', 'Hat Yai Central Hotel', '2025-12-11',
    [line('CT-PK-MC2', 1, 'MARCOM-MTH-META-LITE-CONTENT', 'Meta Lite — Content Posts', 4000), line('CT-PK-MC2', 2, 'MARCOM-MTH-TIKTOK-LITE', 'TikTok Lite Basic', 4000), line('CT-PK-MC2', 3, 'MARCOM-MTH-GMB', 'Google My Business + IBE', 3000)]),
];

const pl = (sku: string, name: string, price: number | null): PkgLine => ({ sku, name, unit_price: price, commission_rate: null, billing: 'monthly' });
export type PkDemoCase = { card_id: string; contract_id: string; hotel_id: string; hotel: string; service: 'ORM' | 'Marcom'; contractEnd: string; end: string; daysLeft: number; contact: string;
  new_lines: PkgLine[]; setup?: PkgLine[]; reason: { code: string; text: string }; status: 'PENDING_APPROVAL' | 'SIGNED'; overdueDays?: number;
  at: { sub: string; app?: string; link?: string; signed?: string } };
export const PK_DEMO_CASES: PkDemoCase[] = [
  { card_id: 'RN-PK-ORM1', contract_id: 'CT-PK-ORM1', hotel_id: 'HTL0451', hotel: 'Chiang Rai Hill Lodge', service: 'ORM', contractEnd: '30 Nov 2026', end: '2026-11-30', daysLeft: 33, contact: 'คุณอรุณ ดอยงาม',
    new_lines: [pl('ORM-MTH-LITE', 'ORM Lite Service', 3900)], reason: { code: 'ค้างชำระ', text: 'ค้างชำระ 2 รอบ · เสนอ ORM Lite เพื่อรักษาลูกค้า' }, status: 'PENDING_APPROVAL', overdueDays: 24,
    at: { sub: '2026-10-27' } },
  { card_id: 'RN-PK-MC1', contract_id: 'CT-PK-MC1', hotel_id: 'HTL0452', hotel: 'Pattaya Beach Loft', service: 'Marcom', contractEnd: '15 Oct 2026', end: '2026-10-15', daysLeft: 0, contact: 'คุณชายหาด สมใจ',
    new_lines: [pl('MARCOM-MTH-META-LITE-CONTENT', 'Meta Lite — Content Posts', 4000), pl('MARCOM-MTH-META-LITE-ADS', 'Meta Lite — Ads Management', 4000), pl('MARCOM-MTH-TIKTOK-LITE', 'TikTok Lite Basic', 4000)],
    setup: [{ sku: 'MARCOM-SETUP-TIKTOK', name: 'Register TikTok', unit_price: 3000, commission_rate: null, billing: 'one_time' }],
    reason: { code: 'เพิ่มช่องทาง / ขยายบริการ', text: 'ลูกค้าต้องการเพิ่ม TikTok' }, status: 'SIGNED',
    at: { sub: '2026-10-01', app: '2026-10-02', link: '2026-10-03', signed: '2026-10-10' } },
  { card_id: 'RN-PK-MC2', contract_id: 'CT-PK-MC2', hotel_id: 'HTL0453', hotel: 'Hat Yai Central Hotel', service: 'Marcom', contractEnd: '10 Dec 2026', end: '2026-12-10', daysLeft: 43, contact: 'คุณสงขลา ใจดี',
    new_lines: [pl('MARCOM-MTH-META-LITE-CONTENT', 'Meta Lite — Content Posts', 4000), pl('MARCOM-MTH-GMB', 'Google My Business + IBE', 3000)],
    reason: { code: 'ลูกค้าใช้บริการไม่ครบ', text: 'ลูกค้าไม่ได้ใช้ TikTok 6 เดือน' }, status: 'PENDING_APPROVAL', at: { sub: '2026-10-26' } },
];
