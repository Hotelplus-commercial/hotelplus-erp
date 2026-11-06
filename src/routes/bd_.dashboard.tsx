import { createFileRoute } from "@tanstack/react-router";
import { BdDashboardPage } from "@/components/suite-dash/bd-dashboard";

/* Suite Dashboards R1 (Patch B). */
export const Route = createFileRoute("/bd_/dashboard")({
  head: () => ({
    meta: [
      { title: "BD Dashboard | Meridia Suite" },
      { name: "description", content: "ภาพรวมทีม TM และ BD: Call, Online Meeting, Sent Contract, WON" },
      { property: "og:title", content: "BD Dashboard | Meridia Suite" },
      { property: "og:description", content: "ภาพรวมทีม TM และ BD: Call, Online Meeting, Sent Contract, WON" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BdDashboardPage,
});
