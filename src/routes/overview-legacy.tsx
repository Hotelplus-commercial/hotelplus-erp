import { createFileRoute } from "@tanstack/react-router";
import { LegacyExecutiveOverview } from "@/components/suite/legacy-overview";

/* Suite Dashboards R1 (Patch B). */
export const Route = createFileRoute("/overview-legacy")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard (เดิม) | Meridia Suite" },
      { name: "description", content: "หน้าสรุป ERP เดิม เก็บไว้เพื่ออ้างอิง" },
      { property: "og:title", content: "Executive Dashboard (เดิม) | Meridia Suite" },
      { property: "og:description", content: "หน้าสรุป ERP เดิม เก็บไว้เพื่ออ้างอิง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegacyExecutiveOverview,
});
