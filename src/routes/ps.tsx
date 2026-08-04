import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("ps");

export const Route = createFileRoute("/ps")({
  head: () => ({
    meta: [
      { title: "PS App — Property Services | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "PS App — Property Services | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
