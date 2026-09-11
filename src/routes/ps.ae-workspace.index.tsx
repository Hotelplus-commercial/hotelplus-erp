import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/ae-workspace/")({
  beforeLoad: () => {
    throw redirect({ to: "/ps/ae-workspace/dashboard" });
  },
});
