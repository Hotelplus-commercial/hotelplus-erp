import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_TABS } from '../src/lib/ps-glossary';
import { OFFICE_BDAC_PATH, bdacRedirectHref } from '../src/lib/office-bdac';
import { bdacSourceLines, dealBookLines } from '../src/lib/bdac-scope';
import { defaultGlobalFilter } from '../src/lib/ps-dashboard-global';
import { demoBdacLifecycles, demoLifecycles } from '../src/lib/ps-demo-fixture';

describe('BD-AC move to The Office APP (v1.0)', () => {
  test('PS Dashboard tab bar no longer has BD-AC; first tab is ต่อสัญญา & ราคา', () => {
    expect(DASHBOARD_TABS.some(([k, l]) => k === 'bdac' || l === 'BD-AC')).toBe(false);
    expect(DASHBOARD_TABS[0]![1]).toBe('ต่อสัญญา & ราคา');
  });
  test('old PS Dashboard links redirect to the new page, other params kept', () => {
    expect(OFFICE_BDAC_PATH).toBe('/the-office-app/bd-ac');
    expect(bdacRedirectHref('?tab=bdac&demo=1')).toBe('/the-office-app/bd-ac?demo=1');
    expect(bdacRedirectHref('?tab=bd-ac')).toBe('/the-office-app/bd-ac');
    expect(bdacRedirectHref('?tab=BD-AC&demo=1')).toBe('/the-office-app/bd-ac?demo=1');
    expect(bdacRedirectHref('?demo=1', '#bdac')).toBe('/the-office-app/bd-ac?demo=1');
    expect(bdacRedirectHref('?tab=ps&demo=1')).toBeNull();
    expect(bdacRedirectHref('')).toBeNull();
  });
  test('The Office APP: BD-AC is item 1, ORM Bonus keeps its route after it', () => {
    const src = readFileSync('src/routes/the-office-app.tsx', 'utf8');
    expect(src.indexOf('"/the-office-app/bd-ac"')).toBeGreaterThan(-1);
    expect(src.indexOf('"/the-office-app/bd-ac"')).toBeLessThan(src.indexOf('"/the-office-app/orm-bonus"'));
    const side = readFileSync('src/components/app-sidebar.tsx', 'utf8');
    expect(side.indexOf('<span className="truncate">BD-AC</span>')).toBeLessThan(side.indexOf('<span className="truncate">ORM Bonus</span>'));
    expect(side.indexOf('<span className="truncate">ORM Bonus</span>')).toBeLessThan(side.indexOf('{officeWs.label}'));
  });
  test('exactly one copy of each BD-AC component (no fork)', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p); } };
    walk('src');
    for (const name of ['BdacTab', 'BdacFinanceSection']) {
      const defs = files.filter(f => new RegExp(`export function ${name}\\b`).test(readFileSync(f, 'utf8')));
      expect(defs.length).toBe(1);
    }
  });
  test('shared scoping keeps the same demo rows as before the move', () => {
    expect(bdacSourceLines(demoBdacLifecycles(), defaultGlobalFilter, true).length).toBe(demoBdacLifecycles().length);
    const orm = bdacSourceLines(demoBdacLifecycles(), { ...defaultGlobalFilter, service: 'ORM' }, true);
    expect(orm.every(d => d.service_line === 'ORM')).toBe(true);
    expect(dealBookLines(demoLifecycles(), defaultGlobalFilter, [], true).length).toBe(demoLifecycles().length);
  });
});
