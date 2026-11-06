import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SIDEBAR_REGISTRY, canOpen, itemsOf, visibleNodes, itemVisible, guardTarget, PROD_REPORT } from '../src/lib/sidebar-registry';
import { movedHref } from '../src/lib/suite-r2-moves';

const app = (k: string) => SIDEBAR_REGISTRY.find((a) => a.key === k)!;
const labels = (k: string) => itemsOf(app(k)).map((i) => i.label);
const groupOf = (k: string, label: string) => (app(k).nodes.find((n) => n.kind === 'group' && n.label === label) as { children: { label: string; kind: string }[] }).children;

describe('Suite Sidebar R2 · page moves', () => {
  test('A.1 Production Report is AC Receivables item 1, gone from PS App', () => {
    const rec = groupOf('AC', 'วางบิล & รับเงิน (Receivables)');
    expect(rec[0]!.label).toBe('Production Report');
    expect(rec[1]!.label).toBe('AC Billing');
    expect(itemsOf(app('PS')).some((i) => i.kind === 'page' && i.route === '/ps/production')).toBe(false);
    for (const r of ['AC', 'HOC', 'MD'] as const) expect(canOpen(PROD_REPORT, r)).toBe(true);
    expect(canOpen(PROD_REPORT, 'AE')).toBe(false);
  });
  test('A.4 ORM / Marcom Production Report is a ↗ link-out to drop mode; ORM / MKT can open the page but do not see AC menu', () => {
    for (const k of ['ORM', 'MARCOM']) {
      const lo = itemsOf(app(k)).find((i) => i.key === 'production-report')!;
      expect(lo.kind).toBe('link_out');
      if (lo.kind === 'link_out') expect(lo.target).toEqual({ app: 'AC', route: PROD_REPORT, mode: 'drop_file' });
    }
    expect(canOpen(PROD_REPORT, 'ORM')).toBe(true);
    expect(canOpen(PROD_REPORT, 'MKT')).toBe(true);
    const acItem = itemsOf(app('AC')).find((i) => i.key === 'production-report')!;
    expect(itemVisible(acItem, 'ORM')).toBe(false);
  });
  test('B ORM Tier is the last Revenue item; ORM Bonus gone from The Office APP', () => {
    const rev = groupOf('ORM', 'Revenue');
    expect(rev[rev.length - 1]!.label).toBe('ORM Tier');
    expect(rev[rev.length - 2]!.label).toBe('RevMax Meeting Analyzer');
    expect(labels('OFFICE')).not.toContain('ORM Bonus');
    for (const r of ['ORM', 'ORM_LEAD', 'GRM', 'HOC', 'MD'] as const) expect(canOpen('/orm/orm-tier', r)).toBe(true);
    expect(readFileSync('src/components/orm/orm-tier-page.tsx', 'utf8').includes('ORM Bonus')).toBe(false);
  });
  test('C The Office APP sidebar = The Office Dashboard · Workspace · รายงานผู้บริหาร (P&L ↗ · HOD Meeting Minutes)', () => {
    const top = visibleNodes(app('OFFICE').nodes, 'HOC').filter((n) => n.kind !== 'report_issue').map((n) => n.label);
    expect(top).toEqual(['The Office Dashboard', 'Workspace', 'รายงานผู้บริหาร']);
    expect(groupOf('OFFICE', 'รายงานผู้บริหาร').map((c) => c.label)).toEqual(['P&L', 'HOD Meeting Minutes']);
  });
  test('P7 every old address redirects and keeps ?demo=1', () => {
    expect(movedHref('/ps/production', '?demo=1')).toBe('/ac/production-report?demo=1');
    expect(movedHref('/orm/production-report', '?demo=1')).toBe('/ac/production-report?demo=1&mode=drop');
    expect(movedHref('/marcom/production-report', '')).toBe('/ac/production-report?mode=drop');
    expect(movedHref('/the-office-app/orm-bonus', '?demo=1')).toBe('/orm/orm-tier?demo=1');
    expect(movedHref('/the-office-app/bd-ac', '?demo=1&compare=1')).toBe('/the-office-app/dashboard?demo=1&compare=1&tab=bd-ac');
    expect(movedHref('/office/bd-ac', '?demo=1')).toBe('/the-office-app/dashboard?demo=1&tab=bd-ac');
    expect(guardTarget('/the-office-app/bd-ac', 'HOC')).toBeNull();
  });
  test('P6 exactly one copy of each moved component', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p); } };
    walk('src');
    for (const name of ['ProductionPage', 'OrmTierPage', 'OfficeBdacPage']) {
      expect(files.filter((f) => new RegExp(`export function ${name}\\b`).test(readFileSync(f, 'utf8'))).length).toBe(1);
    }
  });
  test('R1 required pages still reachable (HOC / MD → The Office Dashboard BD-AC)', () => {
    expect(canOpen('/the-office-app/dashboard', 'HOC')).toBe(true);
    expect(canOpen('/the-office-app/dashboard', 'MD')).toBe(true);
  });
});
