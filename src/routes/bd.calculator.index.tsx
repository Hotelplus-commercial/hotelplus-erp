import { createFileRoute, redirect } from "@tanstack/react-router";

/* Patch A SP7: /bd/calculator → Package Calculator page, keeping search params (DEMO). */
export const Route = createFileRoute("/bd/calculator/")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/bd/package-calculator${location.searchStr ?? ""}`, replace: true });
  },
  component: () => null,
});
