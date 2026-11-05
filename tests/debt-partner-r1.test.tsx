import { describe, expect, it, beforeEach } from 'bun:test';
import { partnerDemoData, PARTNER_DEMO_CONTRACTS } from '@/lib/debt-partner-demo';
import { creditRows, creditTiles, getCashbackExpected, getContractSystemCost, getDealState, monthsOver, rateCardRows } from '@/lib/debt-partner-calc';
import { DEMO_DAY } from '@/lib/demo-session';
import { dealChipCounts } from '@/components/ps/partner-section';
import { getPartnerData, saveDeal, saveRateCard, setPartnerDemo } from '@/lib/debt-partner-store';
import { setTicketDemo, useTickets } from '@/lib/tickets-l0';
import { DASHBOARD_TABS } from '@/lib/ps-glossary';
import { CLOUD_DOC_KEYS } from '@/lib/cloud-sync-keys';
void useTickets;

const d = partnerDemoData();
describe('Debt Partner R1', () => {
  it('tab label renamed, key kept', () => { expect(DASHBOARD_TABS.find(([k]) => k === 'ac')?.[1]).toBe('ลูกหนี้ & ส่วนลด Partner'); });
  it('9 partner doc keys are in the push list', () => { expect(CLOUD_DOC_KEYS.filter((k) => k.startsWith('partner:'))).toHaveLength(10); });
  it('③ totals per partner', () => {
    const r = rateCardRows(d, PARTNER_DEMO_CONTRACTS, DEMO_DAY);
    const by = (n: string) => r.find((x) => x.partner === n)!;
    expect([by('Hotelier.guru').contracts, by('Hotelier.guru').base, by('Hotelier.guru').net]).toEqual([48, 81600, 57120]);
    expect([by('StayLink').base, by('StayLink').net]).toEqual([18000, 16000]);
    expect([by('OTA Hub').base, by('OTA Hub').toThb(640)]).toEqual([640, 22400]);
    expect(r.reduce((s, x) => s + (x.toThb(x.net) ?? 0), 0)).toBe(95520);
  });
  it('discount only inside its period', () => {
    const chaba = PARTNER_DEMO_CONTRACTS[0]!;
    expect(getContractSystemCost(d, chaba, DEMO_DAY)!.net).toBe(1190);
    expect(getContractSystemCost(d, chaba, '2026-09-15')!.net).toBe(1360); // −20% deal, before −30%
    expect(getContractSystemCost(d, { ...chaba, service: 'Marcom' }, DEMO_DAY)).toBeNull();
  });
  it('④ chip counts 4/1/2/7 and cashback 4/7', () => {
    expect(dealChipCounts(d, DEMO_DAY)).toEqual({ LIVE: 4, NEG: 1, DONE: 2, ALL: 7 });
    expect(getDealState(d.partner_deals[0]!, DEMO_DAY)).toBe('ACTIVE');
    const cb = getCashbackExpected(d, d.partner_deals[1]!, PARTNER_DEMO_CONTRACTS);
    expect([cb.eligible, cb.received]).toEqual([7, 4]);
  });
  it('⑤ derived row and tiles', () => {
    const rows = creditRows(d, PARTNER_DEMO_CONTRACTS, DEMO_DAY);
    const der = rows.filter((r) => r.kind === 'DERIVED');
    expect(der).toHaveLength(1);
    expect(der[0]!.kind === 'DERIVED' && [der[0]!.months_over, der[0]!.amount]).toEqual([2, 2380]);
    expect(creditTiles(d)).toMatchObject({ gained: 10540, used: 3400, balance: 7140, earliest: '2027-03-31' });
    expect(monthsOver('2026-11-30', '2027-01-31')).toBe(2);
  });
  describe('PM writes (demo in memory)', () => {
    beforeEach(() => { setPartnerDemo(false); setPartnerDemo(true); setTicketDemo(false); setTicketDemo(true); });
    it('SUCCESS deal creates exactly one PARTNER_DEAL_NOTICE and fills ac_ticket_id', () => {
      const base = { partner_id: 'PTN-OH', kind: 'COST_DISCOUNT' as const, status: 'SUCCESS' as const, title: 'x', start_date: '2026-10-01', end_date: null, benefit_type: 'PERCENT' as const, benefit_value: 5, benefit_currency: null, scope: 'ALL' as const, contract_ids: [], note: '', attachment_url: '', created_by: 'PM' };
      const a = saveDeal(base); expect(a.ok).toBe(true);
      const b = a.ok ? saveDeal({ ...base, id: a.id }) : null;
      expect(a.ok && b?.ok && a.ticket_id === (b.ok ? b.ticket_id : null)).toBe(true);
      expect(getPartnerData().partner_deals.find((x) => a.ok && x.id === a.id)?.ac_ticket_id).toBeTruthy();
      expect(saveDeal({ ...base, start_date: null })).toEqual({ ok: false, error: 'ใส่วันเริ่มมีผลก่อนบันทึกสถานะสำเร็จ' });
    });
    it('rate card save supersedes the old version', () => {
      const r = saveRateCard({ partner_id: 'PTN-SL', system_name: 'Channel Manager', currency: 'THB', billing_cycle: 'MONTHLY', est_fx_to_thb: null, effective_from: '2026-11-01', created_by: 'PM', tiers: [{ allotment_min: 1, allotment_max: null, price_per_contract_month: 950 }] });
      expect(r.ok).toBe(true);
      const cards = getPartnerData().partner_rate_cards.filter((c) => c.partner_id === 'PTN-SL');
      expect(cards.find((c) => c.id === 'RC-SL-1')?.superseded_at).toBe('2026-11-01');
      expect(cards.filter((c) => c.superseded_at == null)).toHaveLength(1);
    });
  });
});
