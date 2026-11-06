import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/the-office-app/")({
  beforeLoad: ({ location }) => {
    const sp = new URLSearchParams(location.searchStr);
    if (!sp.get("tab")) sp.set("tab", "bd-ac");
    throw redirect({ href: `/the-office-app/dashboard?${sp.toString()}`, replace: true });
  },
});
