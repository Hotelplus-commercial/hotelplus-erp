import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("bd");

export const bdTabs = [
  { label: "Quotes", to: "/bd/quotes" },
  { label: "Calculator · ORM", to: "/bd/calculator/orm" },
  { label: "Calculator · Marcom", to: "/bd/calculator/marcom" },
  { label: "Register Deal", to: "/bd/register-deal" },
  { label: "BD Workspace · 🎫 Tickets", to: "/bd/tickets" },
];


export const Route = createFileRoute("/bd")({
  head: () => ({
    meta: [
      { title: "BD App — Deals & Quotations | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "BD App — Deals & Quotations | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleLayout tabs={bdTabs} />,
});
