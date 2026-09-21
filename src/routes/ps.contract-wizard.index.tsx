/* PS App v2.3 · Fix 1 (D-2 · D-3) — wizard landing removed · redirect to Contract Dashboard. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/contract-wizard/")({
  beforeLoad: () => {
    throw redirect({ to: "/ps/contract-dashboard", replace: true });
  },
});
