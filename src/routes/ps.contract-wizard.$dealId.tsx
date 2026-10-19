/* R1.1 — deal/renewal wizard URL restored: opens the Contract Wizard with the deal's customer pre-filled. */
import { createFileRoute } from "@tanstack/react-router";

import { ContractWizard } from "@/components/ps/contract-wizard";

export const Route = createFileRoute("/ps/contract-wizard/$dealId")({
  validateSearch: (search: Record<string, unknown>) => ({
    quote_id: typeof search["quote_id"] === "string" ? (search["quote_id"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Contract Wizard (ต่อสัญญา) — PS App | Meridia Hotel ERP" },
      { name: "description", content: "เปิด Contract Wizard จากการ์ดต่อสัญญา พร้อมข้อมูลลูกค้าเดิม" },
      { property: "og:title", content: "Contract Wizard (ต่อสัญญา) — PS App" },
      { property: "og:description", content: "เปิด Contract Wizard จากการ์ดต่อสัญญา พร้อมข้อมูลลูกค้าเดิม" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealWizardRoute,
});

function DealWizardRoute() {
  const { dealId } = Route.useParams();
  const { quote_id } = Route.useSearch();
  return <ContractWizard dealId={dealId} preselectQuoteId={quote_id} />;
}
