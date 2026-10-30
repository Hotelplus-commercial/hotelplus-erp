/* Tab R1 · ต่อสัญญา & ราคา — acceptance tests (§13). Values come from the spec and the Tab R1 demo additions. */
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const stage = mock(() => {});
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: stage }));
const L0 = await import('../src/lib/tickets-l0');
const R = await import('../src/lib/contract-tab-r1');
const D = await import('../src/lib/contract-tab-r1-demo');
const { headerDemoInput } = await import('../src/lib/ps-header-r2-demo');
const { STATUS_TH } = await import('../src/lib/ps-glossary');

const today = D.TAB_R1_DEMO_NOW;
const demoRows = () => {
  const base = D.tabR1DemoBase();
  return R.buildRows(base, { today, labels: D.tabR1DemoLabels(base), snaps: D.tabR1DemoSnapshots(base), tickets: D.tabR1DemoTickets(base) });
};
const row = (id: string) => demoRows().find((r) => r.contract_id === id)!;
beforeEach(() => { L0.setTicketDemo(false); L0.setTicketDemo(true); });

describe('§3 card ① In / Out', () => {
  const data = D.tabR1Demo();
  const orm = R.inOutSeries(data.flow, 'ORM', today, data.activeToday.ORM);
  const mk = R.inOutSeries(data.flow, 'Marcom', today, data.activeToday.Marcom);
  test('1 · active today per service = header ใช้งาน; current-month out = header หลุด', () => {
    const header = [...headerDemoInput().active, ...D.tabR1HeaderActive()];
    expect(data.activeToday).toEqual({ ORM: header.filter((a) => a.service === 'ORM').length, Marcom: header.filter((a) => a.service === 'Marcom').length });
    expect(data.activeToday).toEqual({ ORM: 8, Marcom: 5 });
    const churn = [...headerDemoInput().churn, ...D.tabR1HeaderChurn()].filter((c) => c.month === '2026-10-01');
    expect(orm.months.at(-1)!.outs.length).toBe(churn.filter((c) => c.service === 'ORM').reduce((s, c) => s + c.out, 0));
    expect(mk.months.at(-1)!.outs.length).toBe(churn.filter((c) => c.service === 'Marcom').reduce((s, c) => s + c.out, 0));
    expect(orm.months.at(-1)!.ins.map((c) => c.hotel_name)).toContain('ริเวอร์ไซด์ ลอดจ์');
  });
  test('2 · a renewal hand-over and a Pause produce no in / out', () => {
    const c = (o: Partial<import('../src/lib/contract-tab-r1').ServiceContract>) => ({ contract_id: 'X', hotel_id: 'H', hotel_name: 'H', service: 'Marcom' as const, start: '2026-03-01', end: null, end_reason: null, renewal_of: null, ...o });
    const s = R.inOutSeries([c({ contract_id: 'A', start: '2025-06-01', end: '2026-03-01', end_reason: 'RENEWAL' }), c({ contract_id: 'B', renewal_of: 'A' }), c({ contract_id: 'P', start: '2025-01-01', end: '2026-05-10', end_reason: 'PAUSE' })], 'Marcom', today, 1);
    expect(s.sumIn).toBe(0); expect(s.sumOut).toBe(0);
    // Anjali (demo): renewed in Mar → no in / no out; its renewed contract later went out (Aug, ไม่ต่อ).
    const mar = mk.months.find((m) => m.month === '2026-03')!, aug = mk.months.find((m) => m.month === '2026-08')!;
    expect(mar.ins.some((x) => x.hotel_name === 'อัญชลี') || mar.outs.some((x) => x.hotel_name === 'อัญชลี')).toBe(false);
    expect(aug.outs.map((x) => x.hotel_name)).toContain('อัญชลี');
  });
  test('3 · สิ้นเดือน pill = in − out; in 1 + out 1 shows +0', () => {
    for (const m of [...orm.months, ...mk.months]) expect(m.net).toBe(m.ins.length - m.outs.length);
    expect(R.netPill(0)).toBe('+0'); expect(R.netPill(2)).toBe('+2'); expect(R.netPill(-1)).toBe('−1');
    const s = R.inOutSeries([{ contract_id: 'a', hotel_id: 'a', hotel_name: 'a', service: 'ORM', start: '2026-10-02', end: null, end_reason: null, renewal_of: null }, { contract_id: 'b', hotel_id: 'b', hotel_name: 'b', service: 'ORM', start: '2025-01-01', end: '2026-10-05', end_reason: 'NOT_RENEWED', renewal_of: null }], 'ORM', today, 1);
    expect(R.netPill(s.months.at(-1)!.net)).toBe('+0');
  });
  test('waterfall levels end at active today and chain month to month', () => {
    expect(orm.months.at(-1)!.end).toBe(8);
    orm.months.slice(1).forEach((m, i) => expect(m.start).toBe(orm.months[i]!.end));
  });
});

describe('§4 card ⑦ Contract Health', () => {
  test('6 · rows = header ใช้งาน; a 2-service hotel has 2 rows', () => {
    const rows = demoRows();
    expect(rows.length).toBe(13);
    expect(rows.filter((r) => r.hotel_name === 'ภูผา บูทีค').length).toBe(2);
  });
  test('7 · overdue here → red; overdue only elsewhere → yellow; AE label alone never changes tier', () => {
    expect(row('R2-O1').tier).toBe('R');
    const m1 = row('R2-M1');
    expect(m1.tier).toBe('A'); expect(m1.signals.map((s) => s.key)).toEqual(['OVERDUE_OTHER']);
    const m4 = row('R2-M4');
    expect(m4.ae_labels.map((l) => l.label_key)).toEqual(['COMPETITOR_CHEAPER']);
    expect(m4.tier).toBe('G');
    expect(R.tierOf([{ key: 'X', group: 1, dir: 'bad', label: '', rule: '' }, { key: 'Y', group: 2, dir: 'bad', label: '', rule: '' }]).tier).toBe('R');
  });
  test('9 · tier mark only when a 30-day-old snapshot exists and differs', () => {
    expect(R.tierMark(row('R2-O4').tier, row('R2-O4').tier30)).toBe('down');
    expect(R.tierMark(row('R2-O2').tier, row('R2-O2').tier30)).toBe('up');
    expect(row('R1-O1').tier30).toBeNull(); // started 6 Oct → no 30-day-old snapshot
    expect(R.tierMark(row('R2-O1').tier, row('R2-O1').tier30)).toBeNull();
  });
  test('10 · green hidden by default; age sort = red + yellow first, then green', () => {
    const rows = demoRows();
    const sorted = R.sortRows(rows, { by: 'age', dir: 'desc' }, today);
    expect(sorted.ry.every((r) => r.tier !== 'G')).toBe(true);
    const ages = sorted.ry.map((r) => R.ageDays(r.start, today)!);
    expect([...ages].sort((a, b) => b - a)).toEqual(ages);
    const p = R.paginate(sorted, 'ALL', 20, false);
    expect(p.hiddenGreen).toBe(6); expect(p.pages.flat().some((r) => r.tier === 'G')).toBe(false);
  });
  test('11 · pager / page sizes / page 1 grows to fit red + yellow', () => {
    expect(R.pageList(5, 10)).toEqual([1, 2, '…', 5, '…', 9, 10]);
    expect(R.pageList(1, 4)).toEqual([1, 2, 3, 4]);
    expect(R.pageSizeOptions(120)).toEqual([20, 50, 100, 150]);
    const ry = Array.from({ length: 27 }, (_, i) => ({ ...row('R2-O1'), contract_id: `r${i}` }));
    const p = R.paginate({ ry, green: [row('R1-O1')] }, 'ALL', 20, false);
    expect(p.expandedFirst).toBe(true); expect(p.pages[0]!.length).toBe(27);
  });
  test('12 · search ดุสิต and pool vil find Dusit Pool Villa; multi-word = AND', () => {
    const d = row('R1-O2');
    expect(R.matchesSearch(d, 'ดุสิต')).toBe(true);
    expect(R.matchesSearch(d, 'pool vil')).toBe(true);
    expect(R.matchesSearch(d, 'pool lodge')).toBe(false);
  });
  test('13 · owners OR inside a group, AND across; หมวดสัญญาณ matches system + AE labels', () => {
    const rows = demoRows();
    const dao = rows.filter((r) => R.ownerHit(r, { ae: ['AE001-ดาว', 'AE003-ต้น'], orm: [], marcom: [] }));
    expect(dao.every((r) => r.ae === 'AE001-ดาว' || r.ae === 'AE003-ต้น')).toBe(true);
    const and = rows.filter((r) => R.ownerHit(r, { ae: ['AE002-มายด์'], orm: ['A'], marcom: [] }));
    expect(and.map((r) => r.contract_id)).toEqual(['R1-O2']);
    expect(R.groupHit(row('R2-M4'), [7])).toBe(true); // AE label คู่แข่งเสนอถูกกว่า (group 7)
    expect(R.groupHit(row('R2-O1'), [3])).toBe(true); // system OVERDUE (group 3)
  });
  test('14 · quick filters AND + live counts', () => {
    const rows = demoRows();
    const due = R.filterRows(rows, { ...R.EMPTY_FILTER, quick: ['DUE'] }, today);
    expect(due.map((r) => r.contract_id).sort()).toEqual(['R1-O2', 'R2-O4']);
    const both = R.filterRows(rows, { ...R.EMPTY_FILTER, quick: ['DUE', 'WORSE'] }, today);
    expect(both.map((r) => r.contract_id).sort()).toEqual(['R1-O2', 'R2-O4']);
    const noTicket = R.filterRows(rows, { ...R.EMPTY_FILTER, quick: ['NO_TICKET'] }, today);
    expect(noTicket.every((r) => r.tier !== 'G' && r.tickets.length === 0)).toBe(true);
    expect(noTicket.map((r) => r.contract_id)).not.toContain('R1-O2');
  });
});

describe('§6 ticket dialog', () => {
  const box = (id: string, rec: { member_id: string; display: string; role: import('../src/lib/contract-tab-r1').RecipientRole }, labels: string[]): import('../src/lib/contract-tab-r1').Box => ({ ticket_id: id, recipient: rec, labels, note: '', state: 'draft' });
  const ae = { member_id: 'AE002-มายด์', display: 'AE · มายด์', role: 'AE' as const };
  test('15 · consecutive numbers; send disabled while a box is empty; one ticket per box with shared batch', async () => {
    const a = L0.reserveTicketId(), b = L0.reserveTicketId();
    expect([a, b]).toEqual(['TKT-000001', 'TKT-000002']);
    const boxes = [box(a, ae, ['PRICE_HIGH']), box(b, { member_id: 'ORM:A', display: 'ORM ทีม A', role: 'ORM' }, [])];
    expect(R.canSend(boxes)).toBe(false);
    boxes[1]!.labels = ['COMPETITOR_CHEAPER'];
    expect(R.canSend(boxes)).toBe(true);
    const d = row('R1-O2');
    const res = await R.sendBatch(boxes, (x) => { L0.createTask({ type: 'CONTRACT_SIGNAL', ticket_id: x.ticket_id, target_dept: R.recipientDept(x.recipient.role), assignee: x.recipient, created_by: 'PM', subject_ref: { hotel_id: d.hotel_id, hotel_name: d.hotel_name, gap_service: d.service, contract_id: d.contract_id }, payload: { readiness_tier: '', chips: [], note: '', kind: 'NEW', labels: x.labels, batch_id: 'B1', contract_id: d.contract_id } }); return !!L0.ticketById(x.ticket_id); });
    expect(res.every((x) => x.state === 'ok')).toBe(true);
    const t1 = L0.ticketById(a)!, t2 = L0.ticketById(b)!;
    expect([t1.payload.batch_id, t2.payload.batch_id]).toEqual(['B1', 'B1']);
    expect([t1.target_dept, t2.target_dept]).toEqual(['PS', 'ORM']);
    expect(t1.status).toBe('NEW');
  });
  test('16 · section 2 = M + AM only; system-only labels are not selectable', () => {
    const sel = R.SIGNAL_CATALOG.filter(R.isSelectable);
    expect(sel.every((e) => e.src === 'M' || e.src === 'AM')).toBe(true);
    expect(sel.some((e) => e.key === 'OVERDUE')).toBe(false);
    expect(R.SIGNAL_CATALOG.length).toBe(44);
  });
  test('17 · duplicate = same contract + recipient + label (not CANCELLED)', () => {
    const tickets = D.tabR1DemoTickets();
    const hits = R.duplicateHits([box('TKT-000010', { member_id: 'ORM:A', display: 'ORM ทีม A', role: 'ORM' }, ['MEETING_IRREGULAR', 'PRICE_HIGH'])], 'R1-O2', tickets);
    expect(hits.map((h) => [h.label, h.ticket.ticket_id])).toEqual([['MEETING_IRREGULAR', 'TKT-000901']]);
    expect(R.duplicateHits([box('TKT-000011', ae, ['MEETING_IRREGULAR'])], 'R1-O2', tickets)).toEqual([]);
  });
  test('18 · partial failure locks successes; resend only failed boxes, same numbers', async () => {
    const boxes = [box('TKT-000021', ae, ['PRICE_HIGH']), box('TKT-000022', ae, ['PRICE_HIGH'])];
    const first = await R.sendBatch(boxes, (b) => b.ticket_id === 'TKT-000021');
    expect(first.map((b) => b.state)).toEqual(['ok', 'fail']);
    const tried: string[] = [];
    const second = await R.sendBatch(first, (b) => { tried.push(b.ticket_id); return true; });
    expect(tried).toEqual(['TKT-000022']);
    expect(second.map((b) => [b.ticket_id, b.state])).toEqual([['TKT-000021', 'ok'], ['TKT-000022', 'ok']]);
    const slow = await R.sendBatch([box('TKT-000023', ae, ['X'])], () => new Promise<boolean>(() => {}), 5, 'หมดเวลา');
    expect(slow[0]!.error).toBe('หมดเวลา');
  });
  test('19 · a sent manual label becomes an AE ✎ label with author + date; system labels are not copied', () => {
    const d = row('R1-O2');
    const by = { member_id: 'AE002-มายด์', display: 'มายด์', role: 'AE' };
    const out = R.newAeLabels(box('TKT-000031', ae, ['PRICE_HIGH', 'COMPETITOR_CHEAPER']), d, [], 'B9', '2026-10-28T03:00:00.000Z', by);
    expect(out.map((l) => [l.label_key, l.created_by.display, l.created_at])).toEqual([['COMPETITOR_CHEAPER', 'มายด์', '2026-10-28T03:00:00.000Z']]);
  });
  test('20 · no status control offers ACK; existing ACK displays as กำลังทำ and counts as open', () => {
    const { ticket_id } = L0.createTask({ type: 'UPSELL_PITCH', target_dept: 'BD', created_by: 'PM', subject_ref: { hotel_id: 'H1', hotel_name: 'H', gap_service: 'ORM' }, payload: { readiness_tier: '', chips: [], note: '' } });
    const t = L0.ticketById(ticket_id)!;
    expect(L0.allowedNext(t, 'BD')).toEqual(['IN_PROGRESS']);
    expect(L0.allowedNext({ ...t, status: 'ACK' }, 'BD')).toEqual(['DONE']);
    expect(L0.STATUS_TH.ACK).toBe('กำลังทำ'); expect(L0.STATUS_TH.NEW).toBe('New');
    expect(STATUS_TH.NEW).toBe('New');
    expect(R.ticketsOfContract(D.tabR1DemoTickets(), 'R2-M2').map((x) => x.status)).toEqual(['ACK']);
  });
});

describe('§7 bell events', () => {
  test('22 · once per dedupe key, owning AE only', () => {
    const rows = demoRows(), snaps = D.tabR1DemoSnapshots();
    const a = R.evaluateAlerts(rows, snaps, new Set(), today, 'T');
    const kinds = new Set(a.map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['CH_DUE_SOON', 'CH_NO_TICKET', 'CH_OPPORTUNITY', 'CH_TIER_WORSE']);
    for (const x of a) if (x.contract_id) expect(rows.find((r) => r.contract_id === x.contract_id)!.ae).toBe(x.ae);
    const again = R.evaluateAlerts(rows, snaps, new Set(a.map((x) => x.key)), today, 'T');
    expect(again).toEqual([]);
    expect(R.QUICK_OF.CH_DUE_SOON).toBe('DUE');
  });
});

describe('§2 service colours', () => {
  test('24 · no PS Dashboard chart draws Marcom dashed; shared blue / pink tokens', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('--svc-orm:#2563C9'); expect(css).toContain('--svc-marcom:#D63F7A');
    expect(css).toContain('--r2-orm:var(--svc-orm)');
    const tab = readFileSync('src/components/ps/ps-report-tab.tsx', 'utf8');
    expect(tab).not.toMatch(/stroke="var\(--series-2\)"\s+strokeDasharray/);
  });
});
