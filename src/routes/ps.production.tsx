import { createFileRoute, redirect } from "@tanstack/react-router";

import { movedHref } from "@/lib/suite-r2-moves";

/* Suite Sidebar R2: old address → new page, query (incl. ?demo=1) kept. */
export const Route = createFileRoute("/ps/production")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: movedHref("/ps/production", location.searchStr), replace: true });
  },
});
