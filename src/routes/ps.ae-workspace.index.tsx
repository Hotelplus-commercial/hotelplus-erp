import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/meeting-management/")({
  beforeLoad: () => {
    throw redirect({ to: "/ps/meeting-management/dashboard" });
  },
});
