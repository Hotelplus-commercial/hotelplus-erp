import { describe, expect, it, beforeEach } from 'bun:test';
import { PARTNER_DEMO_CONTRACTS } from '@/lib/debt-partner-demo';
import { creditTiles, getContractSystemCost, propertySystemHistory, rateCardRows, type PartnerContract } from '@/lib/debt-partner-calc';
import { DEMO_DAY } from '@/lib/demo-session';
import { getPartnerData, recordCreditAnswer, recordCreditRequest, saveRateCard, setPartnerDemo, setPropertySystem } from '@/lib/debt-partner-store';
import * as T from '@/lib/tickets-l0';
import { setTicketDemo, useTickets, transition, type L0Ticket } from '@/lib/tickets-l0';
import { CLOUD_DOC_KEYS } from '@/lib/cloud-sync-keys';
import { creditSections, partnerTodoItems, shutoffActions, tabOfHash } from '@/lib/partner-workspace';
import { seedShutoffDemo } from '@/lib/partner-todo';
import { saveAssignSystem, sysKey, systemOptions } from '@/components/ps/partner-system-ui';
import { WORKSPACES } from '@/lib/workspace-registry';
void useTickets;

const reset = () => { setPartnerDemo(false); setPartnerDemo(true); setTicketDemo(false); setTicketDemo(true); };
const hotel = (pid: string, cid: string): PartnerContract => ({ contract_id: cid, hotel: 'Test Hotel', service: 'ORM', allotment: null, start: '2026-01-01', end: null, end_reason: null, property_id: pid });

describe('PM Workspace Partner v1.0', () => {
  beforeEach(reset);

  it('storage: property_partner_system has its own key + Cloud doc', () => {
    expect(CLOUD_DOC_KEYS).toContain('partner:property_partner_system');
  });

  it('T1/T2 Assign save: empty system inserts nothing; chosen system inserts one row; renewal of same hotel resolves it', () => {
    const d0 = getPartnerData();
    const before = d0.property_partner_system.length;
    expect(saveAssignSystem(d0, 'HP-NEW', '', '', 'PM')).toBe('empty');
    expect(getPartnerData().property_partner_system.length).toBe(before);
    expect(systemOptions(d0).map((o) => o.label)).toContain('StayLink · Channel Manager');
    expect(saveAssignSystem(getPartnerData(), 'HP-NEW', sysKey('PTN-SL', 'Channel Manager'), '', 'PM')).toBe('saved');
    expect(getPartnerData().property_partner_system.length).toBe(before + 1);
    expect(saveAssignSystem(getPartnerData(), 'HP-NEW', sysKey('PTN-SL', 'Channel Manager'), '', 'PM')).toBe('unchanged');
    const today = new Date().toISOString().slice(0, 10);
    const orig = getContractSystemCost(getPartnerData(), hotel('HP-NEW', 'C-1'), today);
    const renewal = getContractSystemCost(getPartnerData(), hotel('HP-NEW', 'C-1-RENEW'), today);
    expect([orig?.partner, renewal?.partner, renewal?.system]).toEqual(['StayLink', 'StayLink', 'Channel Manager']);
  });

  it('DP-O1 allotment picks the tier; empty → lowest tier (fallback); contract override wins', () => {
    setPropertySystem({ property_id: 'HP-A', partner_id: 'PTN-HG', system_name: 'RMS Pro', effective_from: '2026-01-01', allotment: null, set_by: 'PM' });
    const c = hotel('HP-A', 'C-A');
    const low = getContractSystemCost(getPartnerData(), c, '2026-09-15')!;
    expect([low.base, low.fallback_tier]).toEqual([1200, true]);
    setPropertySystem({ property_id: 'HP-A', partner_id: 'PTN-HG', system_name: 'RMS Pro', effective_from: '2026-02-01', allotment: 90, set_by: 'PM' });
    const hi = getContractSystemCost(getPartnerData(), c, '2026-09-15')!;
    expect([hi.base, hi.fallback_tier]).toEqual([2400, false]);
    const d = getPartnerData();
    const ov = getContractSystemCost({ ...d, contract_partner_system: [...d.contract_partner_system, { contract_id: 'C-A', partner_id: 'PTN-HG', system_name: 'RMS Pro', set_by: 'PM', set_at: 'x', allotment: 50 }] }, c, '2026-09-15')!;
    expect(ov.base).toBe(1700);
  });

  it('T3 future change: today uses old system, on/after date uses new; history lists both', () => {
    const d = getPartnerData();
    const mp = hotel('HP-MAEPING', 'C-MP');
    expect(getContractSystemCost(d, mp, DEMO_DAY)?.partner).toBe('OTA Hub');
    expect(getContractSystemCost(d, mp, '2026-12-01')?.partner).toBe('StayLink');
    expect(propertySystemHistory(d, 'HP-MAEPING').map((h) => h.effective_from)).toEqual(['2026-12-01', '2025-09-01']);
  });

  it('T4 header button for PM only (registry adapter PM-only) and hash deep-links', () => {
    expect(tabOfHash('#credit-waiting')).toBe('credit');
    expect(tabOfHash('#deals')).toBe('deals');
    expect(tabOfHash('')).toBe('rate');
    const ps = WORKSPACES.find((w) => w.dept_key === 'PS')!;
    expect(ps.lanes.todo.map((g) => g.key)).toEqual(['partner']);
  });

  it('T5 rate card edit → new version; ③ totals follow', () => {
    const before = rateCardRows(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY).find((r) => r.partner === 'StayLink')!;
    expect(before.base).toBe(18000);
    saveRateCard({ partner_id: 'PTN-SL', system_name: 'Channel Manager', currency: 'THB', billing_cycle: 'MONTHLY', est_fx_to_thb: null, effective_from: '2026-10-01', created_by: 'PM', tiers: [{ allotment_min: 1, allotment_max: null, price_per_contract_month: 1000 }] });
    const d = getPartnerData();
    expect(d.partner_rate_cards.filter((r) => r.partner_id === 'PTN-SL')).toHaveLength(2);
    expect(rateCardRows(d, PARTNER_DEMO_CONTRACTS, DEMO_DAY).find((r) => r.partner === 'StayLink')!.base).toBe(20000);
  });

  it('T6 keep-credit candidate appears at close (before end date); request moves it to waiting', () => {
    const s = creditSections(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY);
    const chaba = s.pending.find((r) => r.contract.hotel === 'Chaba Grand')!;
    expect(chaba.contract.end! > DEMO_DAY).toBe(true); // contract ends 30 Nov; candidate already on 28 Oct
    expect([chaba.notified_at, chaba.amount]).toEqual(['2026-10-21', 2380]);
    const r = recordCreditRequest({ contract_id: chaba.contract.contract_id, partner_id: 'PTN-HG', contract_end_date: chaba.contract.end!, prepaid_until: chaba.prepaid_until, months_over: chaba.months_over, amount: chaba.amount, currency: 'THB', by: 'PM' });
    expect(r.ok).toBe(true);
    const s2 = creditSections(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY);
    expect(s2.pending.some((x) => x.contract.hotel === 'Chaba Grand')).toBe(false);
    expect(s2.waiting.some((x) => x.req.contract_id === chaba.contract.contract_id && x.req.status === 'REQUESTED')).toBe(true);
  });

  it('T7 Partner answer: approved needs amount + expiry; each result creates exactly one SYSTEM_CREDIT_NOTICE to AC; ⑤ uses approved_amount', () => {
    expect(recordCreditAnswer({ id: 'CR-NAN', result: 'APPROVED', approved_amount: null, credit_expires_at: null, hotel: 'Nan Valley Lodge', by: 'PM' }).ok).toBe(false);
    const before = creditTiles(getPartnerData()).gained;
    const a = recordCreditAnswer({ id: 'CR-NAN', result: 'APPROVED', approved_amount: 2000, credit_expires_at: '2027-10-31', hotel: 'Nan Valley Lodge', by: 'PM' });
    expect(a.ok).toBe(true);
    expect(creditTiles(getPartnerData()).gained).toBe(before + 2000);
    expect(recordCreditAnswer({ id: 'CR-NAN', result: 'REJECTED', approved_amount: null, credit_expires_at: null, hotel: 'x', by: 'PM' }).ok).toBe(false);
    // rejected path on a fresh request
    recordCreditRequest({ contract_id: 'C-REJ', partner_id: 'PTN-HG', contract_end_date: '2026-10-01', prepaid_until: '2026-12-31', months_over: 2, amount: 1000, currency: 'THB', by: 'PM' });
    const id = getPartnerData().system_credit_requests.find((r) => r.contract_id === 'C-REJ')!.id;
    const b = recordCreditAnswer({ id, result: 'REJECTED', approved_amount: null, credit_expires_at: null, hotel: 'Rej Hotel', by: 'PM' });
    expect(b.ok && a.ok && b.ticket_id !== a.ticket_id).toBe(true);
    const notices = [a, b].map((x) => (x.ok ? T.ticketById(x.ticket_id) : null)) as L0Ticket[];
    expect(notices.map((t) => [t.type, t.target_dept, t.payload.credit_notice?.result])).toEqual([['SYSTEM_CREDIT_NOTICE', 'AC', 'APPROVED'], ['SYSTEM_CREDIT_NOTICE', 'AC', 'REJECTED']]);
  });

  it('T8 to-do A–D on demo with 7 / 30 / 14-day triggers; PM only; items clear', () => {
    const items = partnerTodoItems(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY, 'today', 'PM');
    expect(items.map((i) => i.kind).sort()).toEqual(['A', 'B', 'C', 'D']);
    const by = (k: string) => items.find((i) => i.kind === k)!;
    expect(by('B').sub).toBe('รอมา 9 วัน');
    expect(by('C').trigger).toBe('2026-10-26');
    expect(by('D').sub).toBe('ไม่อัปเดต 18 วัน');
    expect(partnerTodoItems(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY, 'today', 'PS')).toEqual([]);
    recordCreditAnswer({ id: 'CR-NAN', result: 'REJECTED', approved_amount: null, credit_expires_at: null, hotel: 'Nan', by: 'PM' });
    expect(partnerTodoItems(getPartnerData(), PARTNER_DEMO_CONTRACTS, DEMO_DAY, 'today', 'PM').some((i) => i.kind === 'B')).toBe(false);
    // 30-day boundary: the day before the trigger the item is not shown for today
    expect(partnerTodoItems(getPartnerData(), PARTNER_DEMO_CONTRACTS, '2026-10-25', 'today', 'PM').some((i) => i.kind === 'C')).toBe(false);
  });

  it('T9 SYSTEM_SHUTOFF PS: only the assigned AE moves status; PM read-only; unassigned still listed', () => {
    const ids = seedShutoffDemo();
    const chaba = T.ticketById(ids.chaba) as L0Ticket; const sala = T.ticketById(ids.sala) as L0Ticket;
    expect([chaba.status, (T.ticketById(ids.twin) as L0Ticket).status, sala.payload.unassigned_owner]).toEqual(['IN_PROGRESS', 'IN_PROGRESS', true]);
    const next = T.allowedNext(chaba, 'PS');
    expect(shutoffActions(next, 'PS', 'hr-1', 'hr-1')).toEqual(['DONE']);
    expect(shutoffActions(next, 'PS', 'hr-2', 'hr-1')).toEqual([]);
    expect(shutoffActions(T.allowedNext(chaba, 'PM'), 'PM', null, 'hr-1')).toEqual([]);
    expect(shutoffActions(T.allowedNext(sala, 'PS'), 'PS', 'hr-1', null)).toEqual([]);
    expect(transition(chaba.ticket_id, chaba.revision, 'DONE', 'PS')).toBe(true);
  });
});
