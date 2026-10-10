import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";

const mod = getModule("marcom");

export const Route = createFileRoute("/marcom/")({
  component: () => <ModuleView module={mod} />,
});
