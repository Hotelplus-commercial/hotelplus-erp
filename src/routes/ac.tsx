import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("ac");

export const Route = createFileRoute("/ac")({
  head: () => ({
    meta: [
      { title: "AC App — Accounting | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "AC App — Accounting | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
