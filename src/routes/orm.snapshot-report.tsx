import { createFileRoute, redirect } from "@tanstack/react-router";

import { movedHref } from "@/lib/suite-r2-moves";

/* PR-O1 PR-Q1: old address → PS App › Report Automation, query (incl. ?demo=1) kept. */
export const Route = createFileRoute("/orm/snapshot-report")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: movedHref("/orm/snapshot-report", location.searchStr), replace: true });
  },
});
