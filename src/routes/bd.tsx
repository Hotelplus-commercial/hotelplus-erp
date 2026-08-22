import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("bd");

export const bdTabs = [
  { label: "Calculator · ORM", to: "/bd/calculator/orm" },
  { label: "Calculator · Marcom", to: "/bd/calculator/marcom" },
  { label: "Quotes", to: "/bd/quotes" },
  { label: "Register Deal", to: "/bd/register-deal" },
];

export const Route = createFileRoute("/bd")({
  head: () => ({
    meta: [
      { title: "BD App — Deals & Quotations | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "BD App — Deals & Quotations | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleLayout tabs={bdTabs} />,
});
