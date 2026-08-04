import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("ac");

export const acTabs = [
  { label: "Overview", to: "/ac" },
  { label: "Hotel Profile", to: "/ac/hotel-profile" },
  { label: "ต้นทุนค่าระบบ", to: "/ac/system-cost" },
];

export const Route = createFileRoute("/ac")({
  head: () => ({
    meta: [
      { title: "AC App — Accounting | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "AC App — Accounting | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleLayout tabs={acTabs} />,
});
