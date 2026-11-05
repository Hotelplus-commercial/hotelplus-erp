/* Contracts behind the Partner cards / PM Workspace Partner page (shared; card ⑤ and the keep-credit trigger use the same list). */
import { PARTNER_DEMO_CONTRACTS } from "./debt-partner-demo";
import type { PartnerContract } from "./debt-partner-calc";
import type { PartnerData } from "./debt-partner-types";
import { mainContracts } from "./main-contract-store";
import { readReasons } from "./renewal-reasons";
import { contractTermEnd } from "./contract-state";

/** Contracts behind the Partner cards: DEMO bundle, else the system rows (allotment unknown → lowest tier, DP-O1). */
export function partnerContracts(d: PartnerData, demo: boolean): PartnerContract[] {
  if (demo) return PARTNER_DEMO_CONTRACTS;
  // PM Workspace Partner v1.0 §2.3 (PW10): ORM contracts of the main store; candidate fires when AE records ไม่ต่อ
  // (renewal_reasons.outcome, at created_at) or the contract is terminated early (billing_status TERMINATED, at inactivated_at).
  const reasons = readReasons();
  const main = mainContracts().filter((c) => c.lines.some((l) => /^ORM/i.test(l.sku_snapshot))).map((c): PartnerContract => {
    const rr = reasons.find((r) => r.contract_id === c.contract_id);
    const term = c.billing_status === "TERMINATED" && c.inactivated_at ? c.inactivated_at.slice(0, 10) : null;
    return {
      contract_id: c.contract_id, hotel: c.customer_snapshot.legal_name || c.contract_id, service: "ORM", allotment: null, property_id: c.hotel_id ?? null,
      start: c.start_date, end: term ?? (rr ? contractTermEnd(c) : null), end_reason: term ? "EARLY_TERMINATED" : rr ? "NOT_RENEWED" : null,
      outcome_at: term ?? rr?.created_at ?? null,
    };
  });
  const seen = new Set(main.map((c) => c.contract_id));
  return [...main, ...d.contract_partner_system.filter((s) => !seen.has(s.contract_id)).map((s): PartnerContract => ({ contract_id: s.contract_id, hotel: s.contract_id, service: "ORM", allotment: null, start: null, end: null, end_reason: null }))];
}
