/* PR-O1 PR18: dashboard count = the drop page's items not ready to bill after the cut-off (one selector). */
import { bangkokDate } from "@/lib/ac-v2-engine";
import { useCrmOptional } from "@/lib/crm-store";
import { DEMO_DAY } from "@/lib/demo-session";
import { prWaitingCount, usePrDrops } from "@/lib/pr-drop-store";

export function usePrWaiting(demo: boolean): number {
  usePrDrops();
  const crm = useCrmOptional();
  return prWaitingCount(demo, demo ? DEMO_DAY : bangkokDate(), crm ? { contracts: crm.contracts, invoices: crm.invoices } : undefined);
}
