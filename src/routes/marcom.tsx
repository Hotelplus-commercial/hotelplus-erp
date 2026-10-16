import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getModule } from "@/lib/erp-data";

const mod = getModule("marcom");

export const Route = createFileRoute("/marcom")({
  beforeLoad: ({ location }) => {
    if (location.pathname.replace(/\/$/, "") === "/marcom") throw redirect({ to: "/workspace/$dept", params: { dept: "marcom" }, search: { demo: new URLSearchParams(location.searchStr).get("demo") === "1" ? 1 : undefined, ticket: undefined } });
  },
  head: () => ({
    meta: [
      { title: "MARCOM App — Marketing & Comms | Meridia Hotel ERP" },
      { name: "description", content: mod.description },
      { property: "og:title", content: "MARCOM App — Marketing & Comms | Meridia Hotel ERP" },
      { property: "og:description", content: mod.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Outlet />,
});
