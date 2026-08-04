import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("marcom");

export const Route = createFileRoute("/marcom")({
  head: () => ({
    meta: [
      { title: "MARCOM App — Marketing & Comms | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "MARCOM App — Marketing & Comms | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
