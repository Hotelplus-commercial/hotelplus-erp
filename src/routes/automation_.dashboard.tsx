import { createFileRoute } from "@tanstack/react-router";
import { AutoDashboardPage } from "@/components/suite-dash/ac-hr-auto-dashboards";

/* Suite Dashboards R1 (Patch B). */
export const Route = createFileRoute("/automation_/dashboard")({
  head: () => ({
    meta: [
      { title: "AUTO Dashboard | Meridia Suite" },
      { name: "description", content: "Project Pipeline คำขอหมวด ticket และเครื่องมือในระบบ" },
      { property: "og:title", content: "AUTO Dashboard | Meridia Suite" },
      { property: "og:description", content: "Project Pipeline คำขอหมวด ticket และเครื่องมือในระบบ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutoDashboardPage,
});
