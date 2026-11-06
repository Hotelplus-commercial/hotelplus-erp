import { createFileRoute } from "@tanstack/react-router";
import { SuiteOverviewPage } from "@/components/suite-dash/overview";

/* Suite Dashboards R1 (Patch B). */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ภาพรวม Meridia Suite | Meridia Suite" },
      { name: "description", content: "ไฮไลต์ของแต่ละแอปที่คุณเปิดได้ พร้อมปุ่มไปที่แอป" },
      { property: "og:title", content: "ภาพรวม Meridia Suite | Meridia Suite" },
      { property: "og:description", content: "ไฮไลต์ของแต่ละแอปที่คุณเปิดได้ พร้อมปุ่มไปที่แอป" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuiteOverviewPage,
});
