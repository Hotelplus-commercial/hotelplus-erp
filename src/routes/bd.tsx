import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("bd");

export const Route = createFileRoute("/bd")({
  head: () => ({
    meta: [
      { title: "BD App — Business Development | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "BD App — Business Development | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
