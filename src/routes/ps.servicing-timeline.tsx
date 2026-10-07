import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/servicing-timeline")({
  beforeLoad: () => { throw redirect({ to: "/ps/onboarding-process", replace: true }); },
});
