import { createFileRoute, redirect } from "@tanstack/react-router";

import { OFFICE_BDAC_PATH } from "@/lib/office-bdac";

/* /office/bd-ac (route named in the move spec) → the real The Office APP prefix, params kept. */
export const Route = createFileRoute("/office/bd-ac")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `${OFFICE_BDAC_PATH}${location.searchStr}`, replace: true });
  },
});
