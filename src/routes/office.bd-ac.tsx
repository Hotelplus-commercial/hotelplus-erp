import { createFileRoute, redirect } from "@tanstack/react-router";

import { movedHref } from "@/lib/suite-r2-moves";

/* Suite Sidebar R2: old address → new page, query (incl. ?demo=1) kept. */
export const Route = createFileRoute("/office/bd-ac")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: movedHref("/office/bd-ac", location.searchStr), replace: true });
  },
});
