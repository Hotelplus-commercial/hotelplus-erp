/* Service SLA Core v1.0 — glue used by the existing bell: DEMO additions + the lazy "first open of the day" alert run. */
import { getCategories, svcToday, ticketFollowups, ticketSla, vServiceTickets, type ServiceTicketRow } from './service-tickets';
import { runServiceAlerts, type AlertSent } from './service-ticket-alerts';
import { ensureSlaDemoFollowups, slaDemoTickets } from './service-tickets-demo';
import { addDemoTickets, isDemoTickets, ticketSnapshot } from './tickets-l0';

/** View over the current ticket store (L0; PS cases are passed by callers that already loaded them). */
export function currentServiceRows(demo = isDemoTickets()): ServiceTicketRow[] {
  return vServiceTickets({ l0: ticketSnapshot(), sla: ticketSla.all(demo), followups: ticketFollowups.all(demo), categories: getCategories(demo), today: svcToday(demo) });
}
/** Idempotent: adds DEMO entries (DEMO only), then runs the alert keys for today (once-only keys → re-runs add nothing). */
export function runServiceTicketDay(): AlertSent[] {
  const demo = isDemoTickets();
  if (demo) { addDemoTickets(slaDemoTickets()); ensureSlaDemoFollowups(); }
  return runServiceAlerts(currentServiceRows(demo), demo, svcToday(demo));
}
