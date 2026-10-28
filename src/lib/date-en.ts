/** BD-AC v2.2 §6 — the one English month / date formatter for Tab BD-AC (display only).
 *  Month `Mon YY` · date in the clock's year `D Mon` · other year `D Mon YY` · full `D Mon YYYY`.
 *  Christian-era years only; never Thai month names. Local calendar getters, like the Thai helpers they replace. */
export const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));

/** `2026-09` / `2026-09-01` → `Sep 26`; `{ monthOnly: true }` → `Sep`. */
export function formatMonthEn(ym: string | null | undefined, opts: { monthOnly?: boolean } = {}): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym ?? ""));
  if (!m) return "—";
  const mon = MON_EN[Number(m[2]) - 1] ?? "";
  return opts.monthOnly ? mon : `${mon} ${m[1]!.slice(2)}`;
}

/** `22 Jul` when the date is in the same year as `now`, else `22 Jul 25`. */
export function formatDateEn(v: string | number | Date | null | undefined, now: number | Date = Date.now()): string {
  if (v == null || v === "") return "—";
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${d.getDate()} ${MON_EN[d.getMonth()]}`;
  return d.getFullYear() === toDate(now).getFullYear() ? base : `${base} ${String(d.getFullYear()).slice(2)}`;
}

/** `17 Oct 2026` (demo label). */
export function formatFullDateEn(v: string | number | Date): string {
  const d = toDate(v);
  return `${d.getDate()} ${MON_EN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Thai month abbreviations (ม.ค. … ธ.ค.) — used by the BD-AC F9 check. */
export const THAI_MONTH_ABBR = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
