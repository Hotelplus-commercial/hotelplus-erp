import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { workspaceByDept } from "@/lib/workspace-registry";

export const Route = createFileRoute("/bd/tickets")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined, ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined }),
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
  const { demo, ticket } = Route.useSearch();
  return <WorkspaceShell config={workspaceByDept("BD")} demo={!!demo} ticket={ticket} />;
}
