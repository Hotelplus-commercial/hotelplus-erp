import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_TABS } from '../src/lib/ps-glossary';
import { OFFICE_BDAC_PATH, bdacRedirectHref } from '../src/lib/office-bdac';
import { bdacSourceLines, dealBookLines } from '../src/lib/bdac-scope';
import { defaultGlobalFilter } from '../src/lib/ps-dashboard-global';
import { demoBdacLifecycles, demoLifecycles } from '../src/lib/ps-demo-fixture';

describe('BD-AC move to The Office APP (v1.0)', () => {
  test('PS Dashboard tab bar no longer has BD-AC; first tab is สัญญา & ราคา (Tab R4 label)', () => {
    expect(DASHBOARD_TABS.some(([k, l]) => k === 'bdac' || l === 'BD-AC')).toBe(false);
    expect(DASHBOARD_TABS[0]![1]).toBe('สัญญา & ราคา');
  });
  test('old PS Dashboard links redirect to The Office Dashboard tab BD-AC (R2 C), other params kept', () => {
    expect(OFFICE_BDAC_PATH).toBe('/the-office-app/dashboard');
    expect(bdacRedirectHref('?tab=bdac&demo=1')).toBe('/the-office-app/dashboard?tab=bd-ac&demo=1');
    expect(bdacRedirectHref('?tab=bd-ac')).toBe('/the-office-app/dashboard?tab=bd-ac');
    expect(bdacRedirectHref('?tab=BD-AC&demo=1')).toBe('/the-office-app/dashboard?tab=bd-ac&demo=1');
    expect(bdacRedirectHref('?demo=1', '#bdac')).toBe('/the-office-app/dashboard?demo=1&tab=bd-ac');
    expect(bdacRedirectHref('?tab=ps&demo=1')).toBeNull();
    expect(bdacRedirectHref('')).toBeNull();
  });
  test('Suite Sidebar R2 C supersedes G4: BD-AC is no longer an Office sub menu; it is tab 1 of The Office Dashboard', () => {
    const reg = readFileSync('src/lib/sidebar-registry.ts', 'utf8');
    const office = reg.slice(reg.indexOf("key: 'OFFICE'"));
    expect(office.includes("label: 'BD-AC', route")).toBe(false);
    expect(office.indexOf("{ key: 'bd-ac', label: 'BD-AC' }")).toBeGreaterThan(office.indexOf("label: 'The Office Dashboard'"));
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
