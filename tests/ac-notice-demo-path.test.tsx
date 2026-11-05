/* UAT fix: AC Workspace 🎫 in DEMO reads the one shared DEMO ticket store (survives a full page load) → รับทราบ → AC รับทราบ on PS / PM. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/ac/partner-bills?demo=1' }); });
afterAll(async () => { await GlobalRegistrator.unregister(); });

describe('DEMO notices: AC App → full page load → AC Workspace → รับทราบ → PS / PM', () => {
  it('both notices visible to AC after reload; รับทราบ → DONE with audit; noticeStatus = DONE; nothing in real storage', async () => {
    const ds = await import('../src/lib/demo-session');
    const t = await import('../src/lib/tickets-l0');
    const x = await import('../src/lib/partner-shutoff-ac');
    const ps = await import('../src/components/ps/partner-section');
    ds.setPsDemoSession(true);              // AC App ?demo=1 writes the shared DEMO state
    t.setTicketDemo(true); x.seedAcBillsDemo();
    t.setTicketDemo(false); t.setTicketDemo(true); // full page load: memory gone, session store restored
    const ac = t.ticketSnapshot().filter((k) => k.target_dept === 'AC');
    const deal = ac.find((k) => k.type === 'PARTNER_DEAL_NOTICE')!; const cr = ac.find((k) => k.type === 'SYSTEM_CREDIT_NOTICE')!;
    expect(deal.status).toBe('NEW'); expect(cr.status).toBe('NEW');
    expect(ps.noticeStatus('TKT-DP-01', true)).toBe('NEW');
    expect(t.canAcknowledge(deal, 'AC')).toBe(true);
    expect(t.acknowledgeNotice(deal.ticket_id, deal.revision, 'AC')).toBe(true);
    expect(t.acknowledgeNotice(cr.ticket_id, cr.revision, 'AC')).toBe(true);
    t.setTicketDemo(false); t.setTicketDemo(true); // open PS Dashboard / PM Workspace (another page load)
    const d2 = t.ticketById(deal.ticket_id)!;
    expect(d2.status).toBe('DONE'); expect(d2.audit.some((a) => a.note === 'รับทราบ')).toBe(true);
    expect(ps.noticeStatus('TKT-DP-01', true)).toBe('DONE');        // card ④ → AC รับทราบ
    expect(ps.noticeStatus('TKT-DP-CR-LANNA', true)).toBe('DONE');  // card ⑤ / PM credit → AC รับทราบ
    expect(t.ticketSnapshot().some((k) => k.type === 'SYSTEM_SHUTOFF' && k.target_dept === 'ORM')).toBe(true);
    expect(t.ticketSnapshot().some((k) => k.type === 'SYSTEM_REACTIVATE' && k.target_dept === 'PS')).toBe(true);
    expect(localStorage.getItem(t.TICKETS_KEY)).toBeNull();
    ds.setPsDemoSession(false); t.setTicketDemo(false); t.setTicketDemo(true);
    expect(t.ticketSnapshot().length).toBe(0); // DEMO off clears the DEMO tickets
    t.setTicketDemo(false);
  });
});
