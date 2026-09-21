/* PS App v2.3 · Fix 1 (D-2) — deal-based wizard URL retired · redirect to Contract Dashboard. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/contract-wizard/$dealId")({
  beforeLoad: () => {
    throw redirect({ to: "/ps/contract-dashboard", replace: true });
  },
});
