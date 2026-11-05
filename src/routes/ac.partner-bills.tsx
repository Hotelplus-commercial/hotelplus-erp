import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/erp-ui";
import { PartnerBillsPage } from "@/components/ac/partner-bills-page";

const description = "AC App: บันทึกบิลค่าระบบที่ H+ จ่าย Partner ตรวจยอดกับ Rate Card ใช้เครดิต บันทึก Cashback และขอปิดระบบ";

export const Route = createFileRoute("/ac/partner-bills")({
  head: () => ({
    meta: [
      { title: "บิล Partner — AC App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "บิล Partner — AC App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="AC App · Billing" title="บิล Partner" description={description} />
      <PartnerBillsPage />
    </div>
  ),
});
