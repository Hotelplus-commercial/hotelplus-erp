import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { SIDEBAR_REGISTRY, SUITE_ITEMS, canOpen, itemsOf } from '../src/lib/sidebar-registry';
import { DEMAND_PROVINCES, filterProvinces, summaryOf } from '../src/lib/bd/demand-calendar-data';
import { overallAdr, typeAdr } from '../src/lib/bd/adr';
import { MARCOM_CATALOGUE, ORM_SAMPLE, ORM_SAMPLE_RESULTS, channelOrder, sameAsSample } from '../src/lib/bd/package-calculator';
import { QUOTE_SAMPLE, filterQuotes } from '../src/components/bd/quotation-list-page';
import { checkAttachments, findOpenDuplicates, linkError } from '../src/lib/ticket-create-extras';
import { sortDepts } from '../src/components/ps/service-ticket-tab';
import type { ServiceTicketRow } from '../src/lib/service-tickets';

const app = (k: string) => SIDEBAR_REGISTRY.find((a) => a.key === k)!;
const src = (p: string) => readFileSync(p, 'utf8');

describe('UAT Polish R2 · Patch A', () => {
  test('SP1/SP3 Suite has no ต้นทุนค่าระบบ (ภาพรวม) and no Support; /system-cost redirects keeping params', () => {
    const labels = SUITE_ITEMS.map((s) => s.label as string);
    expect(labels).not.toContain('ต้นทุนค่าระบบ (ภาพรวม)');
    expect(labels).not.toContain('Support');
    expect(labels).toContain('Configuration');
    const r = src('src/routes/system-cost.tsx');
    expect(r).toContain('/ac/system-cost${location.searchStr');
    expect(r).toContain('replace: true');
  });
  test('SP2 Payroll is the last Payables item (before รายงาน), AC · HOC · MD only', () => {
    const nodes = app('AC').nodes;
    const payIdx = nodes.findIndex((n) => n.kind === 'group' && n.label === 'ทำจ่าย (Payables)');
    const pay = nodes[payIdx] as { children: { label: string }[] };
    expect(pay.children.at(-1)!.label).toBe('Payroll');
    expect((nodes[payIdx + 1] as { label: string }).label).toBe('รายงาน');
    for (const r of ['AC', 'HOC', 'MD'] as const) expect(canOpen('/ac/payroll', r)).toBe(true);
    expect(canOpen('/ac/payroll', 'PM')).toBe(false);
  });
  test('SP4 BD Workspace opens /bd/tickets for BD · BDM · HOC · MD; Package Calculator opens its own page', () => {
    for (const r of ['BD', 'BDM', 'HOC', 'MD'] as const) {
      expect(canOpen('/bd/tickets', r)).toBe(true);
      expect(canOpen('/bd/package-calculator', r)).toBe(true);
    }
    const pc = itemsOf(app('BD')).find((i) => i.key === 'package-calculator')!;
    expect(pc.kind === 'page' && pc.route).toBe('/bd/package-calculator');
    expect(src('src/routes/bd.calculator.index.tsx')).toContain('/bd/package-calculator');
  });
  test('SP4 no locked menu items (hidden, never locked)', () => {
    expect(src('src/components/app-sidebar.tsx')).not.toMatch(/\bLock\b/);
  });
  test('SP5 Demand Calendar: 77 provinces, spot-check 5 against IMG-1, search + region filter', () => {
    expect(DEMAND_PROVINCES).toHaveLength(77);
    const m = (en: string) => DEMAND_PROVINCES.find((p) => p.en === en)!.months;
    expect(m('Amnat Charoen')).toBe('MMMLLLMMMMMM');
    expect(m('Chanthaburi')).toBe('HHMMMMHHHMMH');
    expect(m('Bangkok')).toBe('HHHMMMHHHHMH');
    expect(m('Chiang Mai')).toBe('HHMMLLMMMHHH');
    expect(m('Yasothon')).toBe('MMMLLLMMMMMM');
    expect(filterProvinces(DEMAND_PROVINCES, 'chiang', 'All').map((p) => p.en)).toEqual(['Chiang Mai', 'Chiang Rai']);
    expect(filterProvinces(DEMAND_PROVINCES, 'เชียง', 'N')).toHaveLength(2);
    expect(filterProvinces(DEMAND_PROVINCES, '', 'S').every((p) => p.region === 'S')).toBe(true);
    expect(summaryOf(DEMAND_PROVINCES.find((p) => p.en === 'Bangkok')!)).toEqual({ H: 7, M: 5, L: 0 });
  });
  test('SP6 ADR: per type = weekday × 71.51% + weekend × 28.49%; overall room-weighted', () => {
    const a = { name: 'Deluxe', rooms: 10, weekday: 1000, weekend: 2000 };
    const b = { name: 'Suite', rooms: 30, weekday: 3000, weekend: 4000 };
    expect(typeAdr(a)).toBeCloseTo(1284.9, 2);
    expect(typeAdr(b)).toBeCloseTo(3284.9, 2);
    expect(overallAdr([a, b])).toBeCloseTo((10 * 1284.9 + 30 * 3284.9) / 40, 2);
  });
  test('SP7 Package Calculator: ORM sample = IMG-3; Marcom 4 channels; TikTok BASIC/STD/PRO; Q3 order', () => {
    expect(ORM_SAMPLE).toMatchObject({ hotel: 'Three Bridges Hotel NAN', rooms: 28, occupancy: 35, otaShare: 50, otas: ['Agoda', 'Booking.com'] });
    expect(sameAsSample({ ...ORM_SAMPLE })).toBe(true);
    expect(sameAsSample({ ...ORM_SAMPLE, rooms: 30 })).toBe(false);
    expect(ORM_SAMPLE_RESULTS.map((r) => r.main)).toEqual(['฿8,320', '฿16,863', '10.00%']);
    expect(MARCOM_CATALOGUE.map((c) => c.label)).toEqual(['Google', 'Meta', 'TikTok', 'Production']);
    const tiktok = MARCOM_CATALOGUE.find((c) => c.key === 'tiktok')!.sections.flatMap((s) => s.cards.map((x) => x.price));
    expect(tiktok).toEqual([1500, 3500, 4000, 15000, 25000, 35000]);
    expect(channelOrder([1])).toEqual(['tiktok', 'google', 'meta', 'production']);
  });
  test('SP8 ใบเสนอราคา list = IMG-6 sample; filters work', () => {
    expect(QUOTE_SAMPLE[0]!.no).toBe('QT261105013');
    expect(filterQuotes(QUOTE_SAMPLE, { status: 'Contracted', service: '', by: '', q: '' }).map((r) => r.no)).toEqual(['QT261105011R01', 'QT261105003R01']);
    expect(filterQuotes(QUOTE_SAMPLE, { status: '', service: '', by: '', q: 'mug' })).toHaveLength(2);
  });
  test('SP10 Office ⑨ ⑩ ⑪ mount the PS cards ① ② ③ (same components)', () => {
    const s = src('src/components/ps/bdac-finance-section.tsx');
    expect(s).toContain('<PaidGradeCard demo={!!demo} />');
    expect(s).toContain('<PartnerRateCardReadOnly demo={!!demo} />');
    expect(s).toContain('<DebtorCardR11 demo={!!demo} />');
    expect(s).toContain('SHOW_LEGACY_DEBT_CARDS = false');
  });
  test('SP11 waterfall geometry: in left half dark, out right half light, connector, flat line, Y axis', () => {
    const s = src('src/components/ps/contract-inout-card.tsx');
    for (const id of ['r1-wf-in', 'r1-wf-out', 'r1-wf-link', 'r1-wf-flat', 'r1-wf-axis']) expect(s).toContain(id);
    const css = src('src/styles.css');
    expect(css).toContain('.r1-wf .r1-wf-in{left:8%;width:42%');
    expect(css).toContain('.r1-wf .r1-wf-out{left:50%;width:42%');
    expect(css).toContain('.dark .r1-io-panel{--wf-in:var(--svc-orm-light);--wf-out:var(--svc-orm);}');
  });
  test('SP12 Meeting & Survey sub-sections start collapsed', () => {
    const s = src('src/components/ps/meeting-tab-r1.tsx');
    expect(s).not.toContain('<details open className="ms-exp">');
    expect(s).toContain('useState(false)');
  });
  test('SP13/SP16b median box + งานค้างของสัญญา unmounted', () => {
    expect(src('src/components/ps/service-ticket-tab.tsx')).toContain('stab-median-box');
    expect(src('src/components/ps/ps-dashboard-shell.tsx')).toContain('SHOW_TASK_PENDING_WORK = false');
  });
  test('SP14 attachments: 20 MB Partner rule, Thai error per file, link fallback', () => {
    const r = checkAttachments([{ name: 'a.pdf', size: 100 }, { name: 'b.exe', size: 100 }, { name: 'c.pdf', size: 21 * 1024 * 1024 }]);
    expect(r.ok).toEqual([0]);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[1]).toContain('20 MB');
    expect(linkError('https://drive.google.com/x')).toBeNull();
    expect(linkError('drive/x')).not.toBeNull();
  });
  test('SP15 duplicates: open only, same hotel + dept, same category first', () => {
    const row = (p: Partial<ServiceTicketRow>) => ({ hotel_id: 'H1', dept: 'ORM', display_status: 'NEW', category_id: 'c1', created_at: '2026-10-01', ticket_no: 'x', ...p }) as ServiceTicketRow;
    const rows = [row({ ticket_no: 'A', category_id: 'c2', created_at: '2026-10-05' }), row({ ticket_no: 'B' }), row({ ticket_no: 'C', display_status: 'SOLVED' }), row({ ticket_no: 'D', dept: 'AC' }), row({ ticket_no: 'E', hotel_id: 'H2' })];
    expect(findOpenDuplicates(rows, 'H1', 'ORM', 'c1').map((r) => r.ticket_no)).toEqual(['B', 'A']);
    expect(findOpenDuplicates(rows, 'H1', null)).toEqual([]);
  });
  test('SP16 department table sorts both ways per column', () => {
    const d = [{ dept: 'ORM', total: 3, NEW: 1, IN_PROGRESS: 0, WAITING_CUSTOMER: 0, WAITING_THIRD_PARTY: 0, overdue: 5 }, { dept: 'AC', total: 7, NEW: 0, IN_PROGRESS: 2, WAITING_CUSTOMER: 0, WAITING_THIRD_PARTY: 0, overdue: 1 }];
    expect(sortDepts(d, { key: 'total', dir: 'desc' }).map((x) => x.dept)).toEqual(['AC', 'ORM']);
    expect(sortDepts(d, { key: 'total', dir: 'asc' }).map((x) => x.dept)).toEqual(['ORM', 'AC']);
    expect(sortDepts(d, { key: 'overdue', dir: 'desc' }).map((x) => x.dept)).toEqual(['ORM', 'AC']);
    expect(sortDepts(d, null)).toBe(d);
  });
  test('Forbidden strings: no internal codes in new BD pages / dialogs', () => {
    for (const f of ['src/components/bd/demand-calendar-page.tsx', 'src/components/bd/adr-calculator-page.tsx', 'src/components/bd/package-calculator-page.tsx', 'src/components/bd/quotation-list-page.tsx', 'src/components/ps/ticket-create-extras.tsx']) {
      const s = src(f).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const bad of ['Lovable', 'TODO', 'lorem', 'WAITING_CUSTOMER', 'IN_PROGRESS']) expect(s.includes(bad)).toBe(false);
    }
  });
});
