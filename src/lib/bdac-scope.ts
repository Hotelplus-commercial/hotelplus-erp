/* BD-AC deal scoping, shared by PS Dashboard (Headline/Compare) and The Office APP › BD-AC.
 * Pure move of the inline filters that lived in ps-dashboard-shell.tsx — same fields, same rules,
 * so BD-AC numbers are identical wherever the cards are mounted. */
import type { ContractLifecycle } from "@/lib/contract-lifecycle";
import { matchesBook, type GlobalFilter } from "@/lib/ps-dashboard-global";
import type { PsReportRow } from "@/lib/ps-dashboard-types";

const svc = (d: ContractLifecycle) => (d.service_line === "MARCOM" ? "Marcom" : d.service_line);

/** Source rows for the BD-AC cards ①–⑤ (owner = BD owner in demo only, as before). */
export function bdacSourceLines(deals: ContractLifecycle[], filter: GlobalFilter, demo: boolean) {
  return deals.filter((d) =>
    matchesBook(
      { service_line: svc(d), hotel_id: d.hotel_id, hotel_name: d.hotel_name, ae_owner_id: demo ? d.bd_owner_id : null },
      filter,
    ),
  );
}

/** Deal rows for Signed/Won (Headline Won MTD + Compare): AE owner from Account Health, BD owner fallback in demo. */
export function dealBookLines(
  deals: ContractLifecycle[],
  filter: GlobalFilter,
  health: PsReportRow[] | undefined,
  demo: boolean,
) {
  return deals.filter((d) =>
    matchesBook(
      {
        service_line: svc(d),
        hotel_id: d.hotel_id,
        hotel_name: d.hotel_name,
        ae_owner_id: health?.find((r) => r.hotel_id === d.hotel_id)?.["ae_owner_id"] ?? (demo ? d.bd_owner_id : null),
      },
      filter,
    ),
  );
}
