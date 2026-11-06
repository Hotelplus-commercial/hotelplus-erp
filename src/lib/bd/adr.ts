/* Patch A SP6 — ADR Calculator rule (from the real portal guide, IMG-2):
 * weekday share 71.51% (Mon–Fri), weekend share 28.49% (Sat–Sun). Per type ADR = weekday × 71.51% + weekend × 28.49%.
 * Overall ADR = room-weighted average of per-type ADR. */
export const WEEKDAY_SHARE = 0.7151;
export const WEEKEND_SHARE = 0.2849;
export type RoomType = { name: string; rooms: number; weekday: number; weekend: number };
export const typeAdr = (t: RoomType) => t.weekday * WEEKDAY_SHARE + t.weekend * WEEKEND_SHARE;
export function overallAdr(types: RoomType[]): number {
  const rooms = types.reduce((s, t) => s + (t.rooms > 0 ? t.rooms : 0), 0);
  if (!rooms) return 0;
  return types.reduce((s, t) => s + (t.rooms > 0 ? t.rooms * typeAdr(t) : 0), 0) / rooms;
}
