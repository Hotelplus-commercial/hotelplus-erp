import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BdWorkspacePage } from "@/components/workspace/bd-workspace-page";

export const Route = createFileRoute("/bd/tickets")({
  validateSearch: (s: Record<string, unknown>) => ({
    demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined,
    ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined,
    // R3.2 WB9: ?tab=bd | bdm (no tab → BD Workspace unless the role is BDM)
    tab: s["tab"] === "bdm" ? ("bdm" as const) : s["tab"] === "bd" ? ("bd" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "BD Workspace — Ticket Inbox | Meridia Hotel ERP" },
      { name: "description", content: "BD Workspace: ตารางนัด งานที่ต้องทำ และกล่อง Ticket ของ BD" },
      { property: "og:title", content: "BD Workspace — Ticket Inbox | Meridia Hotel ERP" },
      { property: "og:description", content: "BD Workspace: ตารางนัด งานที่ต้องทำ และกล่อง Ticket ของ BD" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BdWorkspace,
});

function BdWorkspace() {
  const { demo, ticket, tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/bd/tickets" });
  return (
    <BdWorkspacePage demo={!!demo} ticket={ticket} tab={tab}
      onTabChange={(t) => navigate({ search: (prev) => ({ ...prev, tab: t }), replace: true })} />
  );
}
