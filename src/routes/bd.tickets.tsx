import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BdWorkspacePage, type BdTab } from "@/components/workspace/bd-workspace-page";

export const Route = createFileRoute("/bd/tickets")({
  validateSearch: (s: Record<string, unknown>): { demo: 1 | undefined; ticket: string | undefined; tab?: BdTab } => ({
    demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined,
    ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined,
    // R3.2 WB9: ?tab=bd | bdm (optional; no tab → BD Workspace)
    ...(s["tab"] === "bdm" || s["tab"] === "bd" ? { tab: s["tab"] as BdTab } : {}),
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
      onTabChange={(t) => navigate({ search: (prev) => ({ ...prev, tab: t }), replace: true })}
      onDemoChange={(on) => navigate({ search: (prev) => ({ ...prev, demo: on ? 1 : undefined }), replace: true })} />
  );
}
