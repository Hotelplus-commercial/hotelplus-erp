import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("orm");

export const ormTabs = [
  { label: "ORM Overview", to: "/orm" },
  { label: "Action A · Hotel Plus ORM", to: "/orm/action-a" },
];

export const Route = createFileRoute("/orm")({
  head: () => ({
    meta: [
      { title: "ORM App — Online Reputation | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "ORM App — Online Reputation | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleLayout tabs={ormTabs} />,
});
