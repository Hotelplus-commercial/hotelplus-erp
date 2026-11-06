import { createFileRoute } from "@tanstack/react-router";
import { SuitePlaceholderPage } from "@/components/suite/placeholder-page";

/* Suite Sidebar R1 §5 / §7: placeholder menus + แจ้งปัญหา of this app (one shared page). Unknown paths → app landing (S10). */
export const Route = createFileRoute("/automation_/$")({
  head: () => ({
    meta: [
      { title: "เมนูอยู่ระหว่างพัฒนา — automation | Meridia Suite" },
      { name: "description", content: "เมนูนี้อยู่ระหว่างพัฒนา · Meridia Suite" },
      { property: "og:title", content: "เมนูอยู่ระหว่างพัฒนา — Meridia Suite" },
      { property: "og:description", content: "เมนูนี้อยู่ระหว่างพัฒนา · Meridia Suite" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuitePlaceholderPage,
});
