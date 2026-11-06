import { createFileRoute, redirect } from "@tanstack/react-router";

/* Patch A SP1: one page only — AC App › ต้นทุนค่าระบบ. Replace-redirect keeps every search param (incl. ?demo=1). */
export const Route = createFileRoute("/system-cost")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/ac/system-cost${location.searchStr ?? ""}`, replace: true });
  },
  component: () => null,
});
