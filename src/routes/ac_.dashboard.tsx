import { createFileRoute } from "@tanstack/react-router";
import { AcDashboardPage } from "@/components/suite-dash/ac-hr-auto-dashboards";

/* Suite Dashboards R1 (Patch B). */
export const Route = createFileRoute("/ac_/dashboard")({
  head: () => ({
    meta: [
      { title: "AC Dashboard | Meridia Suite" },
      { name: "description", content: "ลูกหนี้ เกรดการชำระ และบิล Partner ที่ต้องจ่าย" },
      { property: "og:title", content: "AC Dashboard | Meridia Suite" },
      { property: "og:description", content: "ลูกหนี้ เกรดการชำระ และบิล Partner ที่ต้องจ่าย" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcDashboardPage,
});
