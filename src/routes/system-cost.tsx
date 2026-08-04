import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { SystemCostBoard } from "@/components/hotel/system-cost-board";

const description =
  "Executive App: มุมมองอ่านอย่างเดียวของต้นทุนค่าระบบทุกโรงแรม สรุปยอดชำระรายเดือน ค่าเฉลี่ยต่อโรงแรม active และข้อมูลประกอบการตัดสินใจ";

export const Route = createFileRoute("/system-cost")({
  head: () => ({
    meta: [
      { title: "ต้นทุนค่าระบบ — Executive App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ต้นทุนค่าระบบ — Executive App" },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-4">
      <PageHeader
        eyebrow="Executive App · Shared"
        title="ต้นทุนค่าระบบ (ภาพรวม)"
        description={description}
      />
      <SystemCostBoard role="exec" />
    </div>
  ),
});
