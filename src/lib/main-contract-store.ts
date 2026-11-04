/* Main contract store access for non-React modules (renewal flow) — v1.3 §2/§3 wired by R2.1 §1.5.
 * Live = the CRM browser store (`hotelplus-crm-v1`, AccountingData.contracts that AC Billing reads; CrmStoreProvider registers a writer).
 * DEMO = one in-memory demo contract state (CRM seed + renewal demo contracts), reset when DEMO toggles. Add-only: never edits or removes a record. */
import type { Contract, ProductionReport } from './crm-types';
import { seedContracts, seedCustomers, seedInvoices, seedProducts, seedReports } from './crm-seed';

const CRM_KEY = 'hotelplus-crm-v1';
type Writer = (c: Contract) => boolean;
let writer: Writer | null = null;
let demoOn = false; let demoContracts: Contract[] = []; let demoReports: ProductionReport[] = [];

/** CrmStoreProvider registers how a contract enters its React state (which then persists + stages Cloud Sync). */
export function registerMainContractWriter(w: Writer) { writer = w; return () => { if (writer === w) writer = null; }; }

export function setMainContractDemo(on: boolean, seed: Contract[] = []) {
  demoOn = on; demoContracts = on ? [...seedContracts, ...seed.filter((c) => !seedContracts.some((s) => s.contract_id === c.contract_id))] : []; demoReports = on ? [...seedReports] : [];
}
export const isMainContractDemo = () => demoOn;

function readLive(): { raw: Record<string, unknown> | null; contracts: Contract[] } {
  try {
    if (typeof localStorage === 'undefined') return { raw: null, contracts: seedContracts };
    const p = JSON.parse(localStorage.getItem(CRM_KEY) ?? 'null') as Record<string, unknown> | null;
    return { raw: p, contracts: Array.isArray(p?.contracts) ? (p!.contracts as Contract[]) : seedContracts };
  } catch { return { raw: null, contracts: seedContracts }; }
}
export const mainContracts = (): Contract[] => (demoOn ? demoContracts : readLive().contracts);
export const mainContractById = (id: string) => mainContracts().find((c) => c.contract_id === id) ?? null;

export type AddOut = { ok: true; created: boolean } | { ok: false; error: string };
/** Idempotent by contract_id (a second signing pick-up in another tab adds nothing). */
export function addMainContract(c: Contract): AddOut {
  if (demoOn) {
    if (demoContracts.some((x) => x.contract_id === c.contract_id)) return { ok: true, created: false };
    demoContracts = [c, ...demoContracts]; return { ok: true, created: true };
  }
  const { raw, contracts } = readLive();
  if (contracts.some((x) => x.contract_id === c.contract_id)) return { ok: true, created: false };
  let wrote = false;
  try {
    if (raw && Array.isArray(raw.products)) { localStorage.setItem(CRM_KEY, JSON.stringify({ ...raw, contracts: [c, ...contracts] })); wrote = true; }
  } catch { return { ok: false, error: 'บันทึกสัญญาใหม่ลงคลังสัญญาไม่สำเร็จ' }; }
  if (writer) { try { if (writer(c)) wrote = true; } catch { /* fall through */ } }
  return wrote ? { ok: true, created: true } : { ok: false, error: 'คลังสัญญายังไม่พร้อม · เปิดหน้าแอปแล้วลองอีกครั้ง' };
}

/* DEMO bill check (AC Billing has no DEMO screen): the demo contract state shaped as AccountingData for runDailyBilling(). */
export function addDemoReports(list: ProductionReport[]) { if (demoOn) demoReports = [...demoReports, ...list]; }
export function demoAccountingData() {
  return { contracts: demoContracts, invoices: seedInvoices, reports: demoReports, products: seedProducts, customers: seedCustomers, taxReceipts: [], liveLinks: [], invRequests: [] };
}
