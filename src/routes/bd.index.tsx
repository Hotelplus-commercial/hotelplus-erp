import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("bd");

export const Route = createFileRoute("/bd/")({
  component: () => <ModuleView module={mod} />,
});
