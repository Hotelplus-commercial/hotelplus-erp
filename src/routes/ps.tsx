import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";
import { getModule } from "@/lib/erp-data";

const mod = getModule("ps");

export const psTabs = [
  { label: "PS Dashboard", to: "/ps" },
  { label: "สัญญา & บริการ", to: "/ps/contracts" },
  { label: "สร้างสัญญา (Wizard)", to: "/ps/contract-wizard" },
  { label: "Contract Dashboard", to: "/ps/contract-dashboard" },
  { label: "Production Report", to: "/ps/production" },
];

export const Route = createFileRoute("/ps")({
  head: () => ({
    meta: [
      { title: "PS App — Partner Success | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "PS App — Partner Success | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleLayout tabs={psTabs} />,
});
