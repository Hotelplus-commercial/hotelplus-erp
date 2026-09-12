import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/the-office-app/")({
  beforeLoad: () => {
    throw redirect({ to: "/the-office-app/orm-bonus" });
  },
});
