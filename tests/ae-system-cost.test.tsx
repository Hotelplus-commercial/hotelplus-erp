/* AE Workspace System Cost / Shut-off v1.0 — tile, keep-credit warning, My Day 🔌 group, real DEMO path. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { hits } from './forbidden-words';
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ps/ae-workspace/dashboard?demo=1' }); });
afterAll(async () => { await GlobalRegistrator.unregister(); });

describe('AE system cost v1.0', () => {
  it('tile + warning use the shared Partner calculations (Chaba Grand DEMO)', async () => {
    const s = await import('../src/lib/debt-partner-store'); const a = await import('../src/lib/ae-system-cost');
    const calc = await import('../src/lib/debt-partner-calc'); const { partnerToday } = await import('../src/lib/partner-todo');
    s.setPartnerDemo(true); const d = s.getPartnerData();
    const c = a.cardPartnerContract(d, true, { id: 'RN-CT-ORM-Q-ORM-0410', hotel: 'Chaba Grand', hotelId: 'X', contractEnd: '2026-12-07', service: 'ORM' });
    const v = a.costTile(d, c, partnerToday());
    const cost = calc.getContractSystemCost(d, c, partnerToday())!;
    expect(v.kind).toBe('COST');
    if (v.kind === 'COST') { expect(v.net).toBe(cost.net); expect(v.prepaid_until).toBe(calc.getPrepaidUntil(d, c.contract_id)); expect(v.months_over).toBe(2); }
    const w = a.keepCreditWarning(d, c)!;
    expect(w.months_over).toBe(2); expect(w.amount).toBe(Math.round(2 * calc.getContractSystemCost(d, c, '2026-11-01')!.net));
    expect(hits(`⚠ H+ จ่ายค่าระบบของสัญญานี้ไว้ถึง ${w.prepaid_until} ${w.partner}`)).toEqual([]);
    expect(a.costTile(d, { ...c, service: 'Marcom' }, partnerToday()).kind).toBe('MARCOM');
    expect(a.costTile(d, { ...c, contract_id: 'NONE', property_id: null }, partnerToday()).kind).toBe('NO_SYSTEM');
    s.setPartnerDemo(false);
  });

  it('real path: AC ขอปิดระบบ → page load → AE 🔌 → เริ่มทำ → เสร็จแล้ว → DONE for PS / PM', async () => {
    const ds = await import('../src/lib/demo-session'); const t = await import('../src/lib/tickets-l0');
    const x = await import('../src/lib/partner-shutoff-ac'); const a = await import('../src/lib/ae-system-cost');
    ds.setPsDemoSession(true); t.setTicketDemo(true);
    const r = x.requestShutoff({ contract_id: 'CT-AW-01', hotel_id: 'HP-AW-01', hotel_name: 'AW Test Hotel', service_line: 'ORM', partner: 'Hotelier.guru', system_name: 'RMS Pro', assigned_ae: 'Nont', outstanding: 1000, overdue_cycles: 2, note: '' });
    expect(r.ok).toBe(true);
    t.setTicketDemo(false); t.setTicketDemo(true); // full page load
    const mine = a.aeShutoffItems(t.ticketSnapshot(), 'AE001-Nont', () => null, '2026-10-28');
    const it0 = mine.find((i) => i.t.subject_ref.hotel_id === 'HP-AW-01')!;
    expect(it0.title).toBe('ขอปิดระบบ · AW Test Hotel');
    expect(hits(`${it0.title} ${it0.service} ทีม${it0.team}: ${it0.teamState} ${a.AW_TH.group}`)).toEqual([]);
    expect(a.aeShutoffItems(t.ticketSnapshot(), 'AE002-Dao', () => null, '2026-10-28').some((i) => i.t.subject_ref.hotel_id === 'HP-AW-01')).toBe(false);
    expect(a.aeNextAction(it0.t, false)).toBeNull();
    const s1 = a.aeNextAction(it0.t, true)!; expect(s1.to).toBe('IN_PROGRESS');
    expect(t.transition(it0.t.ticket_id, it0.t.revision, s1.to, 'PS')).toBe(true);
    const k = t.ticketById(it0.t.ticket_id)!; const s2 = a.aeNextAction(k, true)!; expect(s2.to).toBe('DONE');
    expect(t.transition(k.ticket_id, k.revision, s2.to, 'PS')).toBe(true);
    t.setTicketDemo(false); t.setTicketDemo(true); // PS / PM Workspace page load
    const done = t.ticketById(it0.t.ticket_id)!;
    expect(done.status).toBe('DONE'); expect(done.audit.map((e) => e.to_status)).toEqual(expect.arrayContaining(['IN_PROGRESS', 'DONE']));
    expect(a.aeShutoffItems(t.ticketSnapshot(), 'AE001-Nont', () => null, '2026-10-28').some((i) => i.t.ticket_id === done.ticket_id)).toBe(false);
    expect(localStorage.getItem(t.TICKETS_KEY)).toBeNull();
    ds.setPsDemoSession(false); t.setTicketDemo(false);
  });
});
