/* R1 §9 entry 1 — single "Workspace" entry (registry sidebar_entry of the PS row). Resolves by the existing role selector:
 * AE → AE Workspace · everyone else → PM Workspace. Ticket deep links always go to the PM Workspace. */
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMeetingMgmt } from "@/lib/orm-meeting";

export const Route = createFileRoute("/ps/workspace")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined, ticket: typeof s["ticket"] === "string" ? s["ticket"] : undefined }),
  head: () => ({
    meta: [
      { title: "Workspace — PS App | Meridia Hotel ERP" },
      { name: "description", content: "Workspace ของ PS: PM เห็นมุมทีม · AE เห็นงานของตัวเอง" },
      { property: "og:title", content: "Workspace — PS App" },
      { property: "og:description", content: "Workspace ของ PS: PM เห็นมุมทีม · AE เห็นงานของตัวเอง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspaceEntry,
});

function WorkspaceEntry() {
  const { role } = useMeetingMgmt();
  const { demo, ticket } = Route.useSearch();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <p className="p-6 text-sm text-muted-foreground">กำลังเปิด Workspace…</p>;
  if (role === "AE" && !ticket) return <Navigate to="/ps/ae-workspace/dashboard" replace />;
  return <Navigate to="/workspace/$dept" params={{ dept: "ps" }} search={{ demo, ticket }} replace />;
}
