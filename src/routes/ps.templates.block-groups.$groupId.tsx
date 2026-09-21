/* PS App v3.0 — Block Group UX retired. Old deep links return to flat Templates. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/templates/block-groups/$groupId")({
  beforeLoad: () => {
    throw redirect({ to: "/ps/templates", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Block Groups retired | PS App Templates" },
      { name: "description", content: "Block Group editing has been retired in favor of flat contract templates per SKU." },
      { property: "og:title", content: "Block Groups retired | PS App Templates" },
      { property: "og:description", content: "Legacy Block Group links return to the flat Templates dashboard." },
    ],
  }),
});
