import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("bd");

export const bdTabs = [
  { label: "Overview", to: "/bd" },
  { label: "Deals (Pipedrive)", to: "/bd/deals" },
  { label: "ใบเสนอราคา", to: "/bd/quotations" },
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
