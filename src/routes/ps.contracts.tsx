import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { CrossAppSummary } from "@/components/hotel/cross-app-summary";
import { HotelSwitcher } from "@/components/hotel/hotel-switcher";
import { PsContractForm } from "@/components/hotel/ps-contract-form";

const description =
  "PS App: บันทึกสัญญา การต่อสัญญา รูปแบบการให้บริการ การ terminate และผู้ติดต่อ — ปลดล็อกเมื่อ AC App บันทึก Hotel Profile แล้ว";

export const Route = createFileRoute("/ps/contracts")({
  head: () => ({
    meta: [
      { title: "สัญญา & รูปแบบการให้บริการ — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "สัญญา & รูปแบบการให้บริการ — PS App" },
      { property: "og:description", content: description },
    ],
  }),
  component: PsContracts,
});

function PsContracts() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · Contracts"
        title="สัญญา & รูปแบบการให้บริการ"
        description={description}
      />
      <HotelSwitcher canAdd={false} />
      <CrossAppSummary source="ac" />
      <PsContractForm />
    </div>
  );
}
