import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/system-cost")({
  beforeLoad: () => {
    throw redirect({ to: "/ac/system-cost" });
  },
});
