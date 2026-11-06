import { describe, expect, it } from 'vitest';
import { SIDEBAR_REGISTRY, canOpen, guardTarget, landingOf, visibleApps, visibleNodes, withDemo, itemsOf } from '@/lib/sidebar-registry';
import { EXISTING_ROLE_MAP, ROLE_KEYS, type RoleKey } from '@/lib/menu-role';

const app = (k: string) => SIDEBAR_REGISTRY.find((a) => a.key === k)!;
const labels = (k: string, r: RoleKey) => {
  const out: string[] = [];
  const walk = (ns: ReturnType<typeof visibleNodes>) => ns.forEach((n) => ('children' in n ? walk(n.children) : out.push(n.label)));
  walk(visibleNodes(app(k).nodes, r));
  return out;
};

describe('Suite Sidebar R1', () => {
  it('suite order and Workspace at position 2 of every app', () => {
    expect(SIDEBAR_REGISTRY.map((a) => a.label)).toEqual(['BD APP', 'PS App', 'ORM App', 'Marcom App', 'AC App', 'HR App', 'AUTO APP', 'The Office APP']);
    for (const a of SIDEBAR_REGISTRY) expect(itemsOf(a)[1].label).toBe('Workspace');
  });

  it('6 required pages stay reachable for the role that uses them today', () => {
    expect(canOpen('/bd/tickets', 'BDM')).toBe(true);
    expect(canOpen('/workspace/ps/partners', 'PM')).toBe(true);
    expect(canOpen('/ac/partner-bills', 'AC')).toBe(true);
    expect(canOpen('/ps/settings/sla-onboard', 'PM')).toBe(true);
    expect(canOpen('/ps/templates', 'PM')).toBe(true);
    expect(canOpen('/workspace/auto', 'OGM')).toBe(true);
    expect(canOpen('/the-office-app/bd-ac', 'HOC')).toBe(true);
    expect(canOpen('/the-office-app/bd-ac', 'MD')).toBe(true);
  });

  it('hidden route redirects to the app landing and keeps DEMO', () => {
    expect(guardTarget('/ac/billing', 'PM')).toBe('/ac/hotel-profile');
    expect(guardTarget('/the-office-app/bd-ac', 'AE')).toBe('/ps');
    expect(withDemo('/ps', '?demo=1', false)).toBe('/ps?demo=1');
    expect(withDemo('/ps', '', true)).toBe('/ps?demo=1');
    expect(withDemo('/ps', '', false)).toBe('/ps');
  });

  it('PM sees only Hotel Profile in AC App; The Office hidden for AE; everyone sees HR App', () => {
    expect(labels('AC', 'PM')).toEqual(['Hotel Profile', 'แจ้งปัญหา']);
    expect(visibleApps('AE').map((a) => a.key)).not.toContain('OFFICE');
    for (const r of ROLE_KEYS) expect(visibleApps(r).map((a) => a.key)).toContain('HR');
    expect(labels('OFFICE', 'HOC')).not.toContain('แจ้งปัญหา');
  });

  it('landings per role', () => {
    expect(landingOf(app('BD'), 'AUTO')).toBe('/bd/pulse');
    expect(landingOf(app('HR'), 'AE')).toBe('/hr/announcements');
    expect(landingOf(app('OFFICE'), 'HOD')).toBe('/the-office-app/hod-meeting-minutes');
  });

  it('existing in-page roles map to menu RoleKeys', () => {
    expect(EXISTING_ROLE_MAP.MARCOM_LEAD).toBe('MKT_LEAD');
    expect(EXISTING_ROLE_MAP.AC_HEAD).toBe('AC_LEAD');
    expect(EXISTING_ROLE_MAP.OGM).toBe('OGM');
    expect(EXISTING_ROLE_MAP.PS).toBe('AE');
  });
});
