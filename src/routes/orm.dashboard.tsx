import { createFileRoute } from "@tanstack/react-router";

import { Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { PendingAssignList } from "@/components/ps/assignment-ui";

const description = "รายการโรงแรมที่มีบริการ ORM และยังไม่ได้ระบุทีม + ผู้ดูแล Revenue / Ecommerce";

export const Route = createFileRoute("/orm/dashboard")({
  head: () => ({
    meta: [
      { title: "ORM Dashboard | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ORM Dashboard" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Assignment inbox" title="ORM Dashboard" description={description} />
      <Panel title="รอระบุผู้ดูแล" subtitle="บันทึกแล้วอัปเดตข้อมูลโรงแรมชุดเดียวกับ PS Dashboard">
        <PendingAssignList scope="ORM" />
      </Panel>
    </div>
  ),
});
