import type { HotelProfile } from './hotel-store';
export const MARCOM_LITE_SEGMENT = 'LITE';
export const marcomSkuGroup = (sku: string | null | undefined) => !sku?.trim() ? null : sku.split('-').some(segment => segment.toUpperCase() === MARCOM_LITE_SEGMENT) ? 'lite' : 'full';
/** Display-only selection over the snapshot's existing hotel contracts; no CRM identity guessing. */
export function activePortfolioHotels(hotels: HotelProfile[], line: 'orm' | 'marcom', now: Date) {
  return hotels.flatMap(hotel => {
    if (hotel.termination.active) return [];
    const active = hotel.terms.flatMap(term => term.services.filter(service => service.category === line).flatMap(service => {
      const start = service.periodStart ?? term.start;
      const end = service.periodEnd ?? term.end;
      return start && end && start <= now && end >= now ? [{ start, service }] : [];
    })).sort((a, b) => b.start.getTime() - a.start.getTime());
    const contract = active[0];
    return contract ? [{ hotel, contract }] : [];
  });
}