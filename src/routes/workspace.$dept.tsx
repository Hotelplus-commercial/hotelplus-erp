import { createFileRoute, notFound } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { workspaceBySlug } from "@/lib/workspace-registry";

export const Route = createFileRoute("/workspace/$dept")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined, ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined }),
  loader: ({ params }) => {
    const ws = workspaceBySlug(params.dept);
    if (!ws) throw notFound();
    return { label: ws.label };
  },
  head: ({ loaderData }) => {
    const label = loaderData?.label ?? "Workspace";
    const title = `${label} — ตารางนัด · งานที่ต้องทำ · Tickets | Meridia Hotel ERP`;
    const description = `${label}: กล่อง Ticket ของแผนก พร้อมช่องตารางนัดและงานที่ต้องทำ`;
    return {
      meta: [
        { title }, { name: "description", content: description },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => <p className="p-6 text-sm text-muted-foreground">ไม่พบ Workspace นี้</p>,
  component: WorkspacePage,
});

function WorkspacePage() {
  const { dept } = Route.useParams();
  const { demo, ticket } = Route.useSearch();
  const ws = workspaceBySlug(dept)!;
  return <div className="mx-auto w-full max-w-[100rem]"><WorkspaceShell config={ws} demo={!!demo} ticket={ticket} /></div>;
}
