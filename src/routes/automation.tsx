import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("automation");

export const Route = createFileRoute("/automation")({
  head: () => ({
    meta: [
      { title: "AUTO App — Automation | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "AUTO App — Automation | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
