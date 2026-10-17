import { expect, test } from 'bun:test';
import { activePortfolioHotels, MARCOM_LITE_SEGMENT, marcomSkuGroup } from '../src/lib/portfolio-breakdown';
import type { HotelProfile } from '../src/lib/hotel-store';
import type { ServiceBlock } from '../src/lib/hotel-profile';
test('Lite is a whole case-insensitive SKU segment, missing excluded', () => { expect(MARCOM_LITE_SEGMENT).toBe('LITE'); expect(marcomSkuGroup('MARCOM-META-lite-CONTENT')).toBe('lite'); expect(marcomSkuGroup('MARCOM-SATELLITE')).toBe('full'); expect(marcomSkuGroup('')).toBe(null); });
test('active hotel counts once per line; latest start wins; terminated and future excluded', () => {
  const old = { id: 'old', category: 'marcom', periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-12-31') } as ServiceBlock;
  const h = { id: 'H', termination: { active: false }, terms: [{ id: 'T', start: new Date('2026-01-01'), end: new Date('2026-12-31'), services: [old, { ...old, id: 'latest', periodStart: new Date('2026-09-01') }, { ...old, id: 'orm', category: 'orm' }, { ...old, id: 'future', periodStart: new Date('2027-01-01') }] }] } as HotelProfile;
  const now = new Date('2026-09-30');
  expect(activePortfolioHotels([h], 'marcom', now).map(r => r.contract.service.id)).toEqual(['latest']); expect(activePortfolioHotels([h], 'orm', now)).toHaveLength(1);
  expect(activePortfolioHotels([{ ...h, termination: { ...h.termination, active: true } }], 'marcom', now)).toHaveLength(0);
});