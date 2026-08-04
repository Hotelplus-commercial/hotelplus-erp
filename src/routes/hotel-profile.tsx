import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hotel-profile")({
  beforeLoad: () => {
    throw redirect({ to: "/ac/hotel-profile" });
  },
});
