import { describe, expect, test } from 'bun:test';
import { demoBdacLifecycles, BDAC_DEMO_NOW } from '../src/lib/ps-demo-fixture';
import {
  bdacConfig, bdacSla, cycleAgg, monthRange, v_bdac_carry, v_bdac_conversion_cohort,
  v_bdac_cycle_time, v_bdac_deal_aging, v_bdac_flow, v_bdac_stage_current,
} from '../src/lib/bdac-views';

const now = new Date(BDAC_DEMO_NOW).getTime();
const rows = demoBdacLifecycles();
const range = monthRange(0, now);
const prev = monthRange(-1, now);

describe('BD-AC v2.0 oracle (demo clock 2026-10-17)', () => {
  test('① flow: 10/8/7/6/5, 4 distinct hotels, prev WON 3', () => {
    const f = v_bdac_flow(rows, range, prev);
    expect([f.approved, f.contract_sent, f.signed, f.setup_fee, f.won]).toEqual([10, 8, 7, 6, 5]);
    expect(f.won_hotels).toBe(4);
    expect(f.prev_won).toBe(3);
    expect(f.sent_qt.pending_sync).toBe(true);
  });

  test('② SLA: 15 ค้าง · on-time 8 (53%) · เกิน 7 · amber 3 นับเป็น on-time', () => {
    const wip = v_bdac_stage_current(rows, now).filter((x) => x.stage >= 6 && x.stage <= 9 && x.is_on_time !== null);
    expect(wip.length).toBe(15);
    expect(wip.filter((x) => x.is_on_time).length).toBe(8);
    expect(wip.filter((x) => x.sla_tone === 'amber').length).toBe(3);
    // amber (ครบ 2 วันพอดี) ยังนับ on-time
    for (const a of wip.filter((x) => x.sla_tone === 'amber')) expect(a.is_on_time).toBe(true);
  });

  test('SLA legs: stage 9 นับจาก signed_at; null ref → ไม่นับ', () => {
    const d2380 = rows.find((r) => r.id === 'D-2380')!;
    const sla = bdacSla(d2380, now);
    expect(sla.sla_days).toBe(50); // Contract Signed 28 ส.ค. → 17 ต.ค.
    expect(sla.sla_ref_label).toContain('Contract Signed');
    const legacy = bdacSla({ ...d2380, signed_at: null }, now);
    expect(legacy.sla_days).toBeNull();
    expect(legacy.is_on_time).toBeNull();
  });

  test('③ cohort keyed on Sent Contract month: 9/9 · 11/11 · 9/9 · 13/12 · 7/6 · 8/2', () => {
    const c = v_bdac_conversion_cohort(rows, now);
    expect(c.map((x) => [x.size, x.won])).toEqual([[9, 9], [11, 11], [9, 9], [13, 12], [7, 6], [8, 2]]);
    expect(c[3]!.carry).toBe(1);
    expect(c[4]!.carry).toBe(1);
    expect(c[5]!.open_current).toBe(6);
  });

  test('carry list: D-2380 (53 วัน) → D-2402 (21 วัน), Marcom filter เหลือ D-2380', () => {
    const carry = v_bdac_carry(rows, [], now);
    expect(carry.map((c) => [c.deal_id, c.days_since_sent_contract])).toEqual([['D-2380', 53], ['D-2402', 21]]);
    const mc = v_bdac_carry(rows.filter((r) => r.service_line === 'MARCOM'), [], now);
    expect(mc.map((c) => c.deal_id)).toEqual(['D-2380']);
  });

  test('④ cycle: Sent→Signed median 2 (เกิน 2/7) · Signed→Paid median 2.5 (เกิน 3/6)', () => {
    const c1 = v_bdac_cycle_time(rows, range, 'SENT_TO_SIGNED');
    expect(cycleAgg(c1)).toEqual({ median: 2, n: 7, over_sla_count: 2 });
    const c2 = v_bdac_cycle_time(rows, range, 'SIGNED_TO_PAID');
    expect(cycleAgg(c2)).toEqual({ median: 2.5, n: 6, over_sla_count: 3 });
    // hover 4 ต.ค. = D-2391 (2 วัน) + D-2393 (1 วัน)
    expect(c1.filter((x) => x.end_date.startsWith('2026-10-04')).map((x) => x.deal_id).sort()).toEqual(['D-2391', 'D-2393']);
  });

  test('⑤ aging: เรียง sla_days มาก→น้อย · แถวแรก D-2361 (87) · เกิน SLA 7', () => {
    const ag = v_bdac_deal_aging(rows, now);
    expect(ag.length).toBe(15);
    expect(ag[0]!.deal.id).toBe('D-2361');
    expect(ag[0]!.sla_days).toBe(87);
    expect(ag.filter((a) => a.sla_tone === 'red').length).toBe(7);
  });

  test('SLA config อ่านจาก bdac_sla_config (ไม่ hardcode)', () => {
    expect(bdacConfig.bdac_sla_config).toEqual({ approved_to_sent: 2, sent_to_signed: 2, signed_to_won: 2, unit: 'calendar_day' });
  });
});
