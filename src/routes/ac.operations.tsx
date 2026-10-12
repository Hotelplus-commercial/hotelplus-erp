import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/ac/operations')({
  beforeLoad: () => { throw redirect({ to: '/ac/billing', replace: true }); },
});