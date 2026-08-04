import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("orm");

export const Route = createFileRoute("/orm")({
  head: () => ({
    meta: [
      { title: "ORM App — Online Reputation | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "ORM App — Online Reputation | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
