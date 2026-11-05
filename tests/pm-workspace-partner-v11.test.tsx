import { describe, expect, it, beforeEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { DEMO_DAY, pageDateLabel } from '@/lib/demo-session';
import { addPartnerAttachment, getPartnerData, partnerAttachments, removePartnerAttachment, saveDeal, setPartnerDemo, updatePartnerAttachment } from '@/lib/debt-partner-store';
import { propertySystemHistory, propertySystemOn, rateCardRows } from '@/lib/debt-partner-calc';
import { partnerContracts } from '@/lib/partner-contracts';
import { hashOfTab, partnerTodoItems, PARTNER_TABS, tabOfHash } from '@/lib/partner-workspace';
import { dealChipCounts } from '@/components/ps/partner-section';
import { partnerDemoHotel, partnerDemoHotels } from '@/components/ps/partner-system-ui';
import * as T from '@/lib/tickets-l0';
import { setTicketDemo } from '@/lib/tickets-l0';

const reset = () => { setPartnerDemo(false); setPartnerDemo(true); setTicketDemo(false); setTicketDemo(true); };
const src = (p: string) => readFileSync(p, 'utf8');

describe('PM Workspace Partner v1.1', () => {
  beforeEach(reset);

  it('1 tabs Partner · Rate Card · ข้อเสนอ · คำขอเครดิต with hash deep links', () => {
    expect([...PARTNER_TABS]).toEqual(['partner', 'rate', 'deals', 'credit']);
    expect(PARTNER_TABS.map(hashOfTab)).toEqual(['partner', 'ratecard', 'deals', 'credit']);
    for (const h of ['#partner', '#ratecard', '#deals', '#credit']) expect(hashOfTab(tabOfHash(h))).toBe(h.slice(1));
  });

  it('2 header button: PM enabled; testing-mode other role disabled with เฉพาะ PM + switch link', () => {
    const s = src('src/components/workspace/workspace-shell.tsx');
    expect(s).toContain('deptRole === "PM" ? (');
    expect(s).toContain('isRenewalTestMode() ? (');
    expect(s).toContain('เฉพาะ PM');
    expect(s).toContain('onClick={() => rs.setRole("PM")}');
  });

  it('3 to-do งาน Partner: 4 items for PM in DEMO, each linking to its tab', () => {
    const d = getPartnerData();
    const items = partnerTodoItems(d, partnerContracts(d, true), DEMO_DAY, 'today', 'PM');
    expect(items.length).toBe(4);
    for (const it of items) expect(['credit', 'deals']).toContain(tabOfHash(`#${it.route_target.split('#')[1]}`));
    expect(partnerTodoItems(d, partnerContracts(d, true), DEMO_DAY, 'today', 'PS').length).toBe(0);
  });

  it('4 PS Dashboard Partner section renders no edit controls for any role; manage links deep-link', () => {
    const s = src('src/components/ps/partner-section.tsx');
    expect(s).toContain('isPm={false} onForm={setForm} manage=');
    expect(s).toContain('{false && <PartnerFormDrawer');
    expect(s).toContain('hash="ratecard"'); expect(s).toContain('hash="deals"'); expect(s).toContain('hash="credit"');
    expect(src('src/components/ps/renewal-offer-r5.tsx')).not.toContain('PartnerFormDrawer');
  });

  it('5 DEMO card ③ ≈ ฿95,520 and card ④ chips 4 / 1 / 2 / 7 unchanged', () => {
    const d = getPartnerData();
    const rows = rateCardRows(d, partnerContracts(d, true), DEMO_DAY);
    const net = rows.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0);
    expect(Math.abs(net - 95520)).toBeLessThan(600);
    expect(dealChipCounts(d, DEMO_DAY)).toEqual({ LIVE: 4, NEG: 1, DONE: 2, ALL: 7 });
  });

  it('6 SUCCESS deal from PM Workspace creates exactly one PARTNER_DEAL_NOTICE ticket', () => {
    const before = T.listTickets?.() ?? [];
    const n0 = before.filter((t) => t.ticket_type === 'PARTNER_DEAL_NOTICE').length;
    const r = saveDeal({ partner_id: 'PTN-SL', kind: 'COST_DISCOUNT', status: 'SUCCESS', title: 'ทดสอบ', benefit_type: 'PERCENT', benefit_value: 5, benefit_currency: null, start_date: '2026-11-01', end_date: null, scope: 'ALL', contract_ids: [], note: '', attachment_url: '', created_by: 'PM001-Alex' });
    expect(r.ok).toBe(true);
    const n1 = (T.listTickets?.() ?? []).filter((t) => t.ticket_type === 'PARTNER_DEAL_NOTICE').length;
    expect(n1 - n0).toBe(1);
  });

  it('7 attachments: validation, add, edit, remove; newest first; upload disabled with Drive tooltip', () => {
    const pid = getPartnerData().partners[0]!.id;
    expect(addPartnerAttachment(pid, { name: '', kind: 'สัญญา Partner', url: 'https://x' }, 'PM').ok).toBe(false);
    expect(addPartnerAttachment(pid, { name: 'A', kind: 'ผิด', url: 'https://x' }, 'PM').ok).toBe(false);
    expect(addPartnerAttachment(pid, { name: 'A', kind: 'สัญญา Partner', url: 'http://x' }, 'PM').ok).toBe(false);
    const a = addPartnerAttachment(pid, { name: 'สัญญา 2026', kind: 'สัญญา Partner', url: 'https://drive.google.com/a' }, 'PM');
    expect(a.ok).toBe(true);
    expect(partnerAttachments(getPartnerData(), pid).length).toBe(1);
    if (!a.ok) return;
    expect(updatePartnerAttachment(pid, a.id, { name: 'สัญญา 2027', kind: 'อื่น ๆ', url: 'https://drive.google.com/b' }).ok).toBe(true);
    expect(partnerAttachments(getPartnerData(), pid)[0]!.name).toBe('สัญญา 2027');
    expect(removePartnerAttachment(pid, a.id).ok).toBe(true);
    expect(partnerAttachments(getPartnerData(), pid).length).toBe(0);
    const ui = src('src/components/ps/partner-attachments.tsx');
    expect(ui).toContain('disabled title="ยังไม่ได้เชื่อม Google Drive"');
  });

  it('8/9 Mae Ping: current OTA Hub, future StayLink 1 Dec 26 on top of history; demo hotel resolvable', () => {
    const d = getPartnerData();
    const oh = d.partners.find((p) => p.name === 'OTA Hub')!.id, sl = d.partners.find((p) => p.name === 'StayLink')!.id;
    expect(propertySystemOn(d, 'HP-MAEPING', DEMO_DAY)?.partner_id).toBe(oh);
    const top = propertySystemHistory(d, 'HP-MAEPING')[0]!;
    expect([top.partner_id, top.effective_from > DEMO_DAY, top.effective_from]).toEqual([sl, true, '2026-12-01']);
    expect(partnerDemoHotel('HP-MAEPING')).toBe('Mae Ping Riverside');
    expect(partnerDemoHotels().length).toBeGreaterThanOrEqual(86);
  });

  it('10 every Workspace DEMO banner reads 28 ตุลาคม 2569', () => {
    expect(pageDateLabel(true)).toContain('28 ตุลาคม 2569');
    expect(src('src/components/workspace/workspace-shell.tsx')).not.toContain('30 กันยายน 2569');
  });
});
