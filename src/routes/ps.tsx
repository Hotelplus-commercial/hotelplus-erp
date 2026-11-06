import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("ps");

export const psTabs = [
  { label: "Workspace", to: "/ps/workspace" },
  { label: "PS Dashboard", to: "/ps" },
  { label: "Contract Dashboard", to: "/ps/contract-dashboard" },
  { label: "On-board", to: "/ps/onboarding-process" },
  { label: "Contract & Service Manager", to: "/ps/contracts" },
  { label: "Property Content", to: "/ps/property-content" },
  { label: "ตั้งค่า", to: "/ps/settings" },
];


export const Route = createFileRoute("/ps")({
  head: () => ({
    meta: [
      { title: "PS App — Partner Success | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "PS App — Partner Success | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModuleLayout tabs={psTabs} />,
});
