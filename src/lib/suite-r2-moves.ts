/* Suite Sidebar R2 — old addresses of moved pages → new page. Pure; query kept (never drops ?demo=1). */
export const R2_MOVES: Record<string, { to: string; set?: Record<string, string> }> = {
  '/ps/production': { to: '/ac/production-report' },
  '/orm/production-report': { to: '/ac/production-report', set: { mode: 'drop' } },
  '/marcom/production-report': { to: '/ac/production-report', set: { mode: 'drop' } },
  '/the-office-app/orm-bonus': { to: '/orm/orm-tier' },
  '/the-office-app/bd-ac': { to: '/the-office-app/dashboard', set: { tab: 'bd-ac' } },
  '/office/bd-ac': { to: '/the-office-app/dashboard', set: { tab: 'bd-ac' } },
};
export function movedHref(from: string, searchStr: string): string {
  const m = R2_MOVES[from];
  if (!m) return from;
  const sp = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  for (const [k, v] of Object.entries(m.set ?? {})) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${m.to}?${qs}` : m.to;
}
