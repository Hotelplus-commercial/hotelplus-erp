/* PS Dashboard · UAT polish R1 (UP1–UP12) acceptance tests. UP3 skipped by decision (roadmap). */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEMO_DAY } from '@/lib/demo-session';
import { Q58, RN2 } from '@/lib/ps-glossary';
import { groupBars, REASON_LABELS } from '@/lib/renewal-r2';
import { SEL_ALL } from '../src/lib/ps-header-r2';
import { AcTab } from '@/components/ps/ac-tab';
import { debtSegFull } from '@/components/ps/debt-cards-r11';
import { demoDateTh } from '@/components/ps/ps-dashboard-shell';
import { CustomerJourneyScorecard } from '../src/components/ps/customer-journey-scorecard';
import { headerDemoInput } from '../src/lib/ps-header-r2-demo';
import { DEF_UNIT_GRADE, DEF_UNIT_COST, DEF_READONLY } from '@/components/ps/ac-definitions';

const src = (p: string) => readFileSync(p, 'utf8');

describe('UAT polish R1', () => {
  it('UP1 header sub-line carries the unit', () => {
    expect(Q58.headerLine(2)).toBe('ขาดอายุ รอผล 2 สัญญา');
    expect(Q58.headerLine(1)).toBe('ขาดอายุ รอผล 1 สัญญา');
  });

  it('UP2 journey order ④ คะแนนบริการ · ⑤ เกรดชำระเงิน · ⑥ หลุด (Churn)', () => {
    const html = renderToStaticMarkup(h(CustomerJourneyScorecard, { input: headerDemoInput(), sel: SEL_ALL }));
    const i4 = html.indexOf('คะแนนบริการ'), i5 = html.indexOf('เกรดชำระเงิน'), i6 = html.indexOf('หลุด (Churn)');
    expect(i4).toBeGreaterThan(-1);
    expect(i5).toBeGreaterThan(i4);
    expect(i6).toBeGreaterThan(i5);
  });

  it('UP4 Waterfall and Monthly Flow share the สิ้นเดือน pill row; current month highlighted', () => {
    const s = src('src/components/ps/contract-inout-card.tsx');
    expect(s).toContain('data-testid={`r1-net-${view}`}');
    expect(s).toContain('m.current && "is-current"');
  });

  it('UP5 group totals show labels and distinct contracts; % unchanged', () => {
    const sameGroup = REASON_LABELS.filter((e) => e.group === REASON_LABELS[0]!.group).map((e) => e.key);
    const k = sameGroup[0]!, k2 = sameGroup[1] ?? sameGroup[0]!;
    // one contract with two labels of the same group + one contract with one → 3 labels, 2 contracts
    const g = groupBars([{ primary: [k, k2], secondary: 'x' }, { primary: [k], secondary: 'x' }] as never);
    const top = g.rows.find((r) => r.group === REASON_LABELS[0]!.group)!;
    expect(top.total).toBe(3);
    expect(top.contracts).toBe(2);
    expect(RN2.reasons.share('50%', 4, 2)).toBe('50% · รวม 4 ป้าย · 2 สัญญา');
  });

  it('UP6 Off-board card unmounted; ⑥ ระยะเวลา Reset kept', () => {
    const s = src('src/components/ps/ps-report-tab.tsx');
    const i = s.indexOf('title={R1_TITLES.offboard}');
    expect(s.slice(Math.max(0, i - 200), i)).toContain('{false && (');
    expect(src('src/lib/ps-glossary.ts')).toContain('title: "ระยะเวลา Reset"');
  });

  it('UP7 debt tab has no top strip; texts live in ⓘ of ① ② ③', () => {
    const html = renderToStaticMarkup(h(AcTab, { views: {}, loading: false, error: false, service: 'ALL', compare: false, demo: true, cardCompare: { raw: {}, today: DEMO_DAY } } as never));
    expect(html).not.toContain('ac-def-strip');
    const d = src('src/components/ps/debt-cards-r11.tsx');
    expect(d).toContain('{ label: "เกรดการชำระ", body: <GradeDefs /> }');
    expect(d).toContain('{ label: "Collection", body: <CollectionDefs /> }');
    expect(src('src/components/ps/partner-section.tsx')).toContain('body: DEF_UNIT_COST');
    expect(DEF_UNIT_GRADE).toBe('หน่วยนับ: เกรดและ collection นับราย customer (1 customer อาจมีหลายโรงแรม)');
    expect(DEF_UNIT_COST).toBe('ค่าใช้จ่ายรายสัญญา นับรายสัญญาบริการ');
    expect(DEF_READONLY).toBe('ทั้ง tab อ่านอย่างเดียว คลิกชื่อเปิด AC App');
  });

  it('UP8 card ② segment label', () => {
    expect(debtSegFull('ส่งฟ้อง', 1, '฿55,000')).toBe('ส่งฟ้อง 1 สัญญา · มูลค่า ฿55,000');
  });

  it('UP9 Rate Card: เอกสารประกอบ (n) under the system name, no 📎 by the Partner', () => {
    const s = src('src/components/ps/partner-section.tsx');
    expect(s).toContain('{r.card.system_name}<AttachmentCountPopover partnerId={r.card.partner_id} variant="docs" />');
    expect(s).not.toContain('{r.partner}<AttachmentCountPopover');
    expect(src('src/components/ps/partner-attachments.tsx')).toContain('`เอกสารประกอบ (${items.length})`');
  });

  it('UP10 funnel: connectors, quota frame, legend, summary row', () => {
    const s = src('src/components/ps/meeting-tab-r1.tsx');
    for (const k of ['ms-conn-', 'ms-quota-frame', 'นัดแทนด้วย Tier B / C', 'ms-summary-', 'ชี้ที่แถบเพื่อดูรายละเอียด', 'ของนัดได้', 'เกินโควตา']) expect(s).toContain(k);
  });

  it('UP11 card ③ rows end with ประชุม ✓', () => {
    expect(src('src/components/ps/meeting-tab-r1.tsx')).toContain('{d}/{o.quota} ประชุม{ok ? " ✓" : ""}');
  });

  it('UP12 tab-bar DEMO label = shared DEMO date', () => {
    expect(demoDateTh(DEMO_DAY)).toBe('28 ต.ค. 2569');
    expect(src('src/components/ps/ps-dashboard-shell.tsx')).not.toContain('DEMO · 30 Sep 2026');
  });
});
