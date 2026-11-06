import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/erp-ui";
import { getModule } from "@/lib/erp-data";
import { HrDashboardTop } from "@/components/suite-dash/ac-hr-auto-dashboards";

const mod = getModule("hr");

export const Route = createFileRoute("/hr/")({
  head: () => ({ meta: [
    { title: "HR Overview | Meridia Hotel ERP" },
    { name: "description", content: "People and workforce overview for Meridia Hotel ERP." },
    { property: "og:title", content: "HR Overview | Meridia Hotel ERP" },
    { property: "og:description", content: "People and workforce overview for Meridia Hotel ERP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <div className="space-y-6"><HrDashboardTop /><ModuleView module={mod} /></div>,
});
