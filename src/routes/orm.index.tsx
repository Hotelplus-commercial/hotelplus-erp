import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("orm");

export const Route = createFileRoute("/orm/")({
  head: () => ({
    meta: [
      { title: "ORM Overview — Reviews & Sentiment | Meridia" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "ORM Overview — Reviews & Sentiment | Meridia" },
      { property: "og:description", content: mod.description },
    ],
  }),
  component: () => <ModuleView module={mod} />,
});
