/* Contract Renewal v1.0 — renewal-mode Wizard entry (from the renewal card's ต่อสัญญา, carries contract_id). Never redirects. */
import { createFileRoute } from "@tanstack/react-router";

import { RenewalWizard } from "@/components/ps/renewal-wizard-mode";

export const Route = createFileRoute("/ps/contract-wizard/renew/$contractId")({
  head: () => ({
    meta: [
      { title: "ต่อสัญญา — Contract Wizard | Meridia Hotel ERP" },
      { name: "description", content: "ต่อสัญญาจากสัญญาที่ใช้งานอยู่ ตามคำแนะนำระบบ พร้อมขั้นอนุมัติเมื่อเงื่อนไขเปลี่ยน" },
      { property: "og:title", content: "ต่อสัญญา — Contract Wizard" },
      { property: "og:description", content: "ต่อสัญญาจากสัญญาที่ใช้งานอยู่ พร้อมขั้นอนุมัติเมื่อเงื่อนไขเปลี่ยน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RenewalWizard contractId={Route.useParams().contractId} />,
});
