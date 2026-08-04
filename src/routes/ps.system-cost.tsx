import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { HotelSwitcher } from "@/components/hotel/hotel-switcher";
import { SystemCostBoard } from "@/components/hotel/system-cost-board";

const description =
  "PS App: ระบุระบบที่โรงแรมใช้และ H+ เป็นผู้ชำระเงินหรือไม่ พร้อมดูสรุปต้นทุนค่าระบบร่วมกับ AC App และ Executive";

export const Route = createFileRoute("/ps/system-cost")({
  head: () => ({
    meta: [
      { title: "ต้นทุนค่าระบบ — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ต้นทุนค่าระบบ — PS App" },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="PS App · Shared" title="ต้นทุนค่าระบบ" description={description} />
      <HotelSwitcher canAdd={false} />
      <SystemCostBoard role="ps" />
    </div>
  ),
});
