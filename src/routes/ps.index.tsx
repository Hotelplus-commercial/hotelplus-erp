import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { PsDashboard } from "@/components/hotel/ps-dashboard";
import { PsDashboardFilters } from "@/components/ps/ps-dashboard-filters";
import { NewContractUpdates } from "@/components/ps/renewal-ui";
import { useMeetingMgmt } from "@/lib/orm-meeting";

const description =
  "PS Dashboard: ภาพรวมสัญญาบริการของลูกค้าทั้งหมด — AC สร้างโรงแรม · PS เติมสัญญาให้ครบ พร้อมสถานะ ORM / Marcom / Production รายโรงแรม";

export const Route = createFileRoute("/ps/")({
  head: () => ({
    meta: [
      { title: "PS Dashboard — Partner Success | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "PS Dashboard — Partner Success" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PsDashboardPage,
});

function PsDashboardPage() {
  const { role } = useMeetingMgmt();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="PS App · Dashboard" title="PS Dashboard" description={description} />
      <PsDashboardFilters />
      {role === "Partner Manager" && <NewContractUpdates />}
      <PsDashboard />
    </div>
  );
}
