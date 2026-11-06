/* PR-O1 store adapter: collection meridia.production_report_drops.v1 → Cloud ps:production_report_drops (one-way);
 * PDF bytes in the on-device Partner file store (never synced). DEMO = in-memory rows + DEMO contracts. */
import { useSyncExternalStore } from 'react';
import { browserCollection } from './browser-collection';
import { addBellItem } from './bell-items';
import { liveSlot } from './coaching-store';
import { contractTermEnd } from './contract-state';
import { chargedServiceMonths } from './ac-v2-engine';
import type { Contract, Invoice, ProductionReport } from './crm-types';
import { putPartnerFile } from './partner-files';
import { emptyRow, nextMonth, pdfError, prBellsDue, prItems, prevMonth, prKey, readyDropReports, sendAcError, type PrContract, type PrDropRow, type PrFile, type PrItem } from './pr-drop';
import { PR_DEMO_BILLED, PR_DEMO_CONTRACTS, prDemoRows } from './pr-drop-demo';

export const prDrops = browserCollection<PrDropRow>('production_report_drops', prDemoRows);

/** Live contracts → drop contracts (one item per contract; service = its first monthly line). */
export function prContractsOf(contracts: Contract[]): PrContract[] {
  return contracts.filter((c) => c.status === 'contract_completed' && c.lines.some((l) => l.billing === 'monthly')).map((c) => {
    const monthly = c.lines.filter((l) => l.billing === 'monthly');
    const service = /^ORM/i.test(monthly[0]!.sku_snapshot) ? 'ORM' as const : 'Marcom' as const;
    const comm = monthly.find((l) => l.commission_rate != null) ?? null;
    const slot = liveSlot(c.hotel_id ?? null, service);
    const caretaker = (service === 'ORM' ? slot?.orm_team : slot?.marcom_person) ?? '—';
    return {
      contract_id: c.contract_id, hotel_id: c.hotel_id ?? null, hotel: c.customer_snapshot.hotel_name || c.customer_snapshot.legal_name || c.contract_id, service,
      start: c.start_date, term_end: contractTermEnd(c), end: c.billing_status === 'TERMINATED' ? c.inactivated_at ?? null : null, end_reason: c.billing_status === 'TERMINATED' ? 'EARLY_TERMINATION' : null,
      commission_sku: comm?.sku_snapshot ?? null, commission_rate: comm?.commission_rate ?? null, caretaker, team: service === 'ORM' ? (slot?.orm_team ?? '—') : 'Marcom',
    };
  });
}
/** Keys of contract-months already billed: a non-void invoice charged that service month (same rule as the engine guard). */
export function billedKeys(invoices: Invoice[], contracts: PrContract[]): Set<string> {
  const out = new Set<string>();
  for (const c of contracts) for (const m of chargedServiceMonths(invoices, c.contract_id)) out.add(prKey(c.contract_id, m));
  return out;
}
/** Months shown in the picker: the last three open service months (newest first). */
export const openMonths = (today: string) => { const m1 = prevMonth(today.slice(0, 7)); return [m1, prevMonth(m1), prevMonth(prevMonth(m1))]; };

/** PR18 for the billing engine: ready drop items of the recent months as reports (drop wins). Live only. */
export function liveDropReports(contracts: Contract[], invoices: Invoice[], today: string): ProductionReport[] {
  const pcs = prContractsOf(contracts); const rows = prDrops.all(false); const billed = billedKeys(invoices, pcs);
  return openMonths(today).flatMap((m) => readyDropReports(prItems(pcs, rows, m, today, billed)));
}

export function itemsFor(demo: boolean, month: string, today: string, live?: { contracts: Contract[]; invoices: Invoice[] }): PrItem[] {
  if (demo) return prItems(PR_DEMO_CONTRACTS, prDrops.all(true), month, today, PR_DEMO_BILLED);
  const pcs = prContractsOf(live?.contracts ?? []);
  return prItems(pcs, prDrops.all(false), month, today, billedKeys(live?.invoices ?? [], pcs));
}

let ver = 0; prDrops.subscribe(() => { ver++; });
export const usePrDrops = () => useSyncExternalStore(prDrops.subscribe, () => ver, () => 0);

type Out = { ok: true } | { ok: false; error: string };
function upsert(demo: boolean, item: Pick<PrItem, 'contract_id' | 'month'>, fn: (r: PrDropRow) => PrDropRow): void {
  const rows = prDrops.all(demo); const id = prKey(item.contract_id, item.month);
  const cur = rows.find((r) => r.id === id) ?? emptyRow(item.contract_id, item.month);
  const next = fn(cur);
  prDrops.save(demo, rows.some((r) => r.id === id) ? rows.map((r) => (r.id === id ? next : r)) : [...rows, next]);
}
const ev = (by: string, action: string, note?: string | null) => ({ at: new Date().toISOString(), by, action, note: note ?? null });
const locked = (i: PrItem) => i.status === 'READY' || i.status === 'BILLED';

export function recordSentCustomer(demo: boolean, i: PrItem, date: string, by: string): Out {
  if (locked(i)) return { ok: false, error: 'ล็อกแล้ว · แก้ได้เมื่อ AC ส่งกลับแก้' };
  upsert(demo, i, (r) => ({ ...r, sent_customer_at: date, history: [...r.history, ev(by, 'ส่งลูกค้าตรวจแล้ว', date)] })); return { ok: true };
}
export function recordCustomer(demo: boolean, i: PrItem, answer: 'CONFIRMED' | 'DISPUTED', reason: string, by: string): Out {
  if (locked(i)) return { ok: false, error: 'ล็อกแล้ว · แก้ได้เมื่อ AC ส่งกลับแก้' };
  if (answer === 'DISPUTED' && !reason.trim()) return { ok: false, error: 'ใส่เหตุผลที่ลูกค้าแย้ง' };
  upsert(demo, i, (r) => ({ ...r, customer: answer, customer_at: new Date().toISOString(), dispute_reason: answer === 'DISPUTED' ? reason.trim() : null, history: [...r.history, ev(by, answer === 'CONFIRMED' ? 'ลูกค้ายืนยัน' : 'ลูกค้าแย้ง', reason)] }));
  return { ok: true };
}
export async function addFiles(demo: boolean, i: PrItem, files: File[], by: string): Promise<Out> {
  if (locked(i)) return { ok: false, error: 'ล็อกแล้ว · แก้ได้เมื่อ AC ส่งกลับแก้' };
  for (const f of files) { const e = pdfError(f); if (e) return { ok: false, error: `${f.name}: ${e}` }; }
  const base = (i.row?.files.length ?? 0); const at = new Date().toISOString();
  const add: PrFile[] = [];
  for (const [n, f] of files.entries()) { const ref = `PRD-${i.id}-${Date.now()}-${n}`; await putPartnerFile(ref, f); add.push({ ref, name: f.name, size: f.size, at, version: base + n + 1 }); }
  upsert(demo, i, (r) => ({ ...r, files: [...r.files, ...add], history: [...r.history, ev(by, 'แนบไฟล์', add.map((x) => x.name).join(', '))] }));
  return { ok: true };
}
/** "ส่งไฟล์ให้ AC". acRevenue = AC's manual CRM revenue for the same month (kept as history when it differs). */
export function sendToAc(demo: boolean, i: PrItem, revenue: number | null, by: string, acRevenue: number | null = null): Out {
  const e = sendAcError(i, i.row?.files ?? [], revenue); if (e) return { ok: false, error: e };
  upsert(demo, i, (r) => ({ ...r, sent_ac_at: new Date().toISOString(), revenue_thb: i.needs_revenue ? revenue : null,
    ac_prev_revenue: i.needs_revenue && acRevenue != null && acRevenue !== revenue ? acRevenue : r.ac_prev_revenue, ac_ack_at: null,
    history: [...r.history, ev(by, 'ส่งไฟล์ให้ AC')] }));
  return { ok: true };
}
export function returnToSender(demo: boolean, i: PrItem, reason: string, by = 'AC'): Out {
  if (!reason.trim()) return { ok: false, error: 'ใส่เหตุผลที่ส่งกลับแก้' };
  if (i.status === 'BILLED') return { ok: false, error: 'วางบิลแล้ว' };
  upsert(demo, i, (r) => ({ ...r, returned_at: new Date().toISOString(), return_reason: reason.trim(), history: [...r.history, ev(by, 'ส่งกลับแก้', reason)] }));
  addBellItem(demo, { key: `PR:${i.id}:RETURNED:${Date.now()}`, ...senderTarget(i), alert_type: 'PR_DROP', text: `AC ส่งกลับแก้: ${reason.trim()} · ${i.hotel} (${i.month})`, link: '/ac/production-report?mode=drop', created_at: new Date().toISOString(), tone: 'warning' });
  return { ok: true };
}
export function ackConflict(demo: boolean, i: PrItem, by = 'AC') { upsert(demo, i, (r) => ({ ...r, ac_ack_at: new Date().toISOString(), history: [...r.history, ev(by, 'AC รับทราบรายได้ที่ต่าง')] })); }

const senderTarget = (i: Pick<PrItem, 'service'>) => ({ target_type: 'DEPT_QUEUE' as const, target_id: i.service === 'ORM' ? 'ORM' : 'MARCOM' });
const leadTarget = (i: Pick<PrItem, 'service'>) => ({ target_type: 'ROLE' as const, target_id: i.service === 'ORM' ? 'GRM' : 'MARCOM_LEAD' });
/** "เตือนผู้ดูแล" — one bell item per item per day. */
export function remindCaretaker(demo: boolean, i: PrItem, today: string): boolean {
  return addBellItem(demo, { key: `PR:${i.id}:REMIND:${today.slice(0, 10)}`, ...senderTarget(i), alert_type: 'PR_DROP', text: `หัวหน้าเตือน · ส่ง Production Report · ${i.hotel} (${i.month}) · ผู้ดูแล ${i.caretaker}`, link: '/ac/production-report?mode=drop', created_at: new Date().toISOString(), tone: 'warning' });
}
/** PR16 / PR17: add today's bell items (keys include the day → once per item per day). Returns how many were new. */
export function runPrBells(demo: boolean, items: PrItem[], today: string): number {
  let n = 0;
  for (const b of prBellsDue(items, today)) {
    const i = items.find((x) => b.key.startsWith(`PR:${x.id}:`))!;
    if (addBellItem(demo, { key: b.key, ...(b.to === 'LEAD' ? leadTarget(i) : senderTarget(i)), alert_type: 'PR_DROP', text: b.text, link: '/ac/production-report?mode=drop', created_at: `${today.slice(0, 10)}T01:00:00Z`, tone: b.tone })) n++;
  }
  return n;
}
export { nextMonth };
