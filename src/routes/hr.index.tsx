import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("hr");

export const Route = createFileRoute("/hr/")({
  component: () => <ModuleView module={mod} />,
});
