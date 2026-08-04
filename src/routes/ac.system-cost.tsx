import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { HotelSwitcher } from "@/components/hotel/hotel-switcher";
import { SystemCostBoard } from "@/components/hotel/system-cost-board";

const description =
  "AC App: ระบุต้นทุนค่าระบบต่อเดือน บันทึกการทำจ่ายรายเดือน และดูสรุปยอดรวม/ค่าเฉลี่ยต่อโรงแรม active";

export const Route = createFileRoute("/ac/system-cost")({
  head: () => ({
    meta: [
      { title: "ต้นทุนค่าระบบ — AC App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ต้นทุนค่าระบบ — AC App" },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="AC App · Shared" title="ต้นทุนค่าระบบ" description={description} />
      <HotelSwitcher canAdd={false} />
      <SystemCostBoard role="ac" />
    </div>
  ),
});
