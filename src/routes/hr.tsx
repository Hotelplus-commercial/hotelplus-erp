import { createFileRoute, Outlet } from "@tanstack/react-router";

import { getModule } from "@/lib/erp-data";

const mod = getModule("hr");

export const Route = createFileRoute("/hr")({
  head: () => ({
    meta: [
      { title: "HR App — Human Resources | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "HR App — Human Resources | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <Outlet />,
});
