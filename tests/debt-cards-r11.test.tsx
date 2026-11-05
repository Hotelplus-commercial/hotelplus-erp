import { describe, expect, it, beforeEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DASHBOARD_TABS } from '@/lib/ps-glossary';
import { DEMO_DAY } from '@/lib/demo-session';
import { debtFilter, debtSummary, deltaLine, gradeCounts, gradeList, paidHeadline, ticketCells, ticketStrip, trend } from '@/lib/debt-cards';
import { demoDebtRows, demoDebtTickets, demoGradeAt, demoGradeRows, demoPaidInvoices, markDemoInvoicePaid, resetDemoInvoices } from '@/lib/debt-cards-demo';
import { AcTab } from '@/components/ps/ac-tab';
import { DebtorCardR11, PaidGradeCard } from '@/components/ps/debt-cards-r11';

const acSrc = readFileSync('src/components/ps/ac-tab.tsx', 'utf8');
const tabHtml = () => renderToStaticMarkup(h(AcTab, { views: {}, loading: false, error: false, service: 'ALL', compare: false, demo: true, cardCompare: { raw: {}, today: DEMO_DAY } }));

describe('Debt Partner R1.1 — cards ① ②', () => {
  beforeEach(() => resetDemoInvoices());

  it('§13.1 tab label, ① ② before Partner cards, old cost / system-fee cards not rendered but kept', () => {
    expect(DASHBOARD_TABS.find(([k]) => k === 'ac')?.[1]).toBe('ลูกหนี้ & ส่วนลด Partner');
    const html = tabHtml();
    const i1 = html.indexOf('① เกรดการชำระ A–D'), i2 = html.indexOf('② ลูกหนี้ที่ต้องติดตาม'), i3 = html.indexOf('dp-partner-section');
    expect(i1).toBeGreaterThan(-1); expect(i2).toBeGreaterThan(i1); expect(i3).toBeGreaterThan(i2);
    expect(html).not.toContain('ค่าใช้จ่ายรายสัญญา <');
    expect(html).not.toContain('ค่าระบบ ORM');
    for (const c of ['function ContractCostCard', 'function SystemFeeMock', 'export function GradeCard', 'export function DebtorCard(']) expect(acSrc).toContain(c);
  });

  it('§13.2 headline from live paid status; paying a DEMO invoice updates N and %; Δ formats', () => {
    const a = paidHeadline(demoPaidInvoices(), DEMO_DAY, '2026-09-28')!;
    expect([a.period, a.now.paid, a.now.total, a.prev!.paid, a.prev!.total]).toEqual(['2026-10', 151, 170, 148, 168]);
    expect(deltaLine(a.now, a.prev)).toEqual({ tone: 'up', text: '▲ เพิ่มขึ้น 3 สัญญา · สัดส่วน 88.1% → 88.8% (+0.7%)' });
    // grades unchanged, invoice paid → N changes (not derived from grades)
    const before = gradeCounts(demoGradeRows());
    markDemoInvoicePaid('CT-DMO-0004', '2026-10', '2026-10-27');
    const b = paidHeadline(demoPaidInvoices(), DEMO_DAY, '2026-09-28')!;
    expect([b.now.paid, b.now.total]).toEqual([152, 170]);
    expect(gradeCounts(demoGradeRows())).toEqual(before);
    expect(renderToStaticMarkup(h(PaidGradeCard, { demo: true }))).toContain('คิดเป็น 89.4% ของสัญญาทั้งหมด 170 สัญญา');
    expect(deltaLine({ paid: 140, total: 170 }, { paid: 148, total: 168 })!.tone).toBe('down');
    expect(deltaLine({ paid: 140, total: 170 }, { paid: 148, total: 168 })!.text.startsWith('▼ ลดลง 8 สัญญา · ')).toBe(true);
    expect(deltaLine({ paid: 148, total: 168 }, { paid: 148, total: 168 })).toEqual({ tone: 'eq', text: '= เท่าเดิม · สัดส่วน 88.1% → 88.1% (±0%)' });
    const html = renderToStaticMarkup(h(PaidGradeCard, { demo: true }));
    expect(html).toMatch(/data-tone="up"[^>]*class="[^"]*text-dash-good/);
  });

  it('§13.2 demo grades + trend match §11', () => {
    expect(gradeCounts(demoGradeRows())).toEqual({ A: 112, B: 39, C: 16, D: 3 });
    expect(gradeList(demoGradeRows(), 'D').map((r) => r.hotel)).toEqual(['Chaba Grand', 'Sala Riverside Hotel', 'Sala Talay Resort']);
    const tr = trend(demoPaidInvoices(), demoGradeAt, '2026-10', DEMO_DAY);
    expect(tr.map((p) => `${p.paid}/${p.total}`)).toEqual(['142/160', '143/162', '146/164', '146/166', '148/168', '151/170']);
    expect(tr.map((p) => p.open)).toEqual([false, false, false, false, false, true]);
  });

  it('§13.3 segment and chip filter the same; sticky header; no trend inside the table', () => {
    const rows = demoGradeRows();
    for (const g of ['A', 'B', 'C', 'D'] as const) expect(gradeList(rows, g).length).toBe(gradeCounts(rows)[g]);
    const html = renderToStaticMarkup(h(PaidGradeCard, { demo: true }));
    for (const g of ['A', 'B', 'C', 'D']) { expect(html).toContain(`data-seg="${g}"`); expect(html).toContain(`data-chip="${g}"`); }
    const table = html.slice(html.indexOf('data-testid="dp-grade-table"'), html.indexOf('</table>'));
    expect(table).not.toContain('dp-trend');
    expect(html.indexOf('dp-trend')).toBeLessThan(html.indexOf('dp-grade-table'));
    expect(html).not.toContain('เกรดแย่สุดใน 6 งวด');
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/\.dp-table thead th\{position:sticky;top:0;z-index:2;background:var\(--bg-card\)/);
  });

  it('§13.4 bar sums to headline, write-off excluded + hatched, pause chip only paused rows', () => {
    const rows = demoDebtRows(); const s = debtSummary(rows);
    expect([s.total, s.n]).toEqual([276000, 7]);
    expect(s.segments.reduce((a, x) => a + x.amount, 0)).toBe(s.total);
    expect(s.writeOff).toEqual({ n: 1, amount: 21000 });
    expect(debtFilter(rows, 'PAUSED').map((r) => r.hotel)).toEqual(['Phuket Breeze']);
    expect(debtFilter(rows, null).some((r) => r.status === 'PAUSED')).toBe(false);
    expect(debtFilter(rows, null).map((r) => r.status)).toEqual(['LEGAL', 'SUSPENDED', 'SUSPENDED', 'OVERDUE', 'OVERDUE', 'OVERDUE', 'OVERDUE', 'WRITTEN_OFF']);
    const html = renderToStaticMarkup(h(DebtorCardR11, { demo: true }));
    expect(html).toContain('฿276,000'); expect(html).toContain('7 สัญญา · ไม่รวมตัดสูญ');
    expect(html).toContain('class="dp-hatch"'); expect(html).toContain('ตัดสูญ ฿21,000 · 1 สัญญา (นอกยอดรวม)');
    expect(html).not.toContain('data-seg="WRITTEN_OFF"');
    const amts = [...html.matchAll(/data-amount="(\d+)"/g)].map((m) => Number(m[1]));
    expect(amts.reduce((a, b) => a + b, 0)).toBe(276000);
  });

  it('§13.5 shut-off pills per department, CANCELLED ignored, no shut-off → –, strip = sum of rows', () => {
    const rows = demoDebtRows(), ts = demoDebtTickets();
    const by = (n: string) => ticketCells(rows.find((r) => r.hotel === n)!, ts);
    expect(by('Sala Riverside Hotel').shut).toEqual({ svc: { open: 0, done: 1 }, ps: { open: 0, done: 1 } });
    expect(by('Chaba Grand').shut).toEqual({ svc: { open: 1, done: 0 }, ps: { open: 0, done: 1 } });
    expect(by('Chaba Grand').other.map((t) => t.type)).toEqual(['GRADE_RISK']);
    expect(by('Sala Talay Resort').shut).toEqual({ svc: { open: 0, done: 1 }, ps: { open: 1, done: 0 } });
    expect(by('Anjali').shut).toBeNull(); // only a CANCELLED shut-off
    expect(by('Dusit Pool Villa').other).toHaveLength(2);
    expect(by('The Bay Hotel').other).toHaveLength(1);
    const strip = ticketStrip(rows.filter((r) => r.status !== 'PAUSED'), ts);
    expect(strip).toEqual({ svc: { open: 1, done: 2 }, ps: { open: 1, done: 2 }, other: 4 });
    const cells = rows.filter((r) => r.status !== 'PAUSED').map((r) => ticketCells(r, ts));
    expect(cells.reduce((a, c) => a + (c.shut ? c.shut.svc.done + c.shut.ps.done : 0), 0)).toBe(strip.svc.done + strip.ps.done);
    const html = renderToStaticMarkup(h(DebtorCardR11, { demo: true }));
    expect(html).toContain('ticket ปิดระบบ · ทีมบริการ ORM / Marcom กำลังทำ 1 · เสร็จ 2   PS / AE กำลังทำ 1 · เสร็จ 2   ticket งานอื่นที่ยังเปิด 4');
    const anj = html.slice(html.indexOf('Anjali'), html.indexOf('</tr>', html.indexOf('Anjali')));
    expect(anj).toContain('data-cell="shut"><span class="text-muted-foreground">–</span>');
  });
});
