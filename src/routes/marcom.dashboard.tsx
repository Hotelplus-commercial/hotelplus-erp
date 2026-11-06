import { createFileRoute } from "@tanstack/react-router";

import { Panel } from "@/components/crm/crm-ui";
import { MarcomDashboard } from "@/components/suite-dash/orm-marcom-dashboards";
import { PendingAssignList } from "@/components/ps/assignment-ui";

const description = "รายการโรงแรมที่มีบริการ Marcom และยังไม่ได้ระบุผู้ดูแล Marcom";

export const Route = createFileRoute("/marcom/dashboard")({
  head: () => ({
    meta: [
      { title: "Marcom Dashboard | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "Marcom Dashboard" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <MarcomDashboard assign={
      <Panel title="รอระบุผู้ดูแล" subtitle="บันทึกแล้วอัปเดตข้อมูลโรงแรมชุดเดียวกับ PS Dashboard">
        <PendingAssignList scope="MARCOM" />
      </Panel>
    } />
  ),
});
