import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bd/")({
  beforeLoad: () => {
    throw redirect({ to: "/bd/quotes" });
  },
  component: () => null,
});
