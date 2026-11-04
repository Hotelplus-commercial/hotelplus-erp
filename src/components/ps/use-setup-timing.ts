/* Tab R4 — read-only feed for card ⑤ ระยะเวลา Setup and the On-board / Off-board queue table.
 * Live: existing v_servicing_stage_cards rows (same query as the On-board tab) + HANDOVER_FIX tickets from Ticket L0.
 * DEMO: the Tab R4 demo additions. Nothing here writes. */
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { readServicingDashboard } from '@/lib/servicing-dashboard.functions';
import { useDashboardGlobal } from '@/lib/ps-dashboard-global';
import { useTickets } from '@/lib/tickets-l0';
import { latestEntry } from '@/lib/servicing-time';
import type { ServicingRow } from '@/lib/servicing-dashboard-types';
import { bkkDate, getSetupTiming, type SetupInput, type SetupTiming, type SetupVariant } from '@/lib/setup-timing';
import { setupDemo, SETUP_DEMO_TODAY } from '@/lib/setup-duration-demo';
import { handoverFixEnabled } from '@/lib/setup-kpi-settings';

export type SetupFeed = { today: string; demo: boolean; pending: boolean; timings: SetupTiming[]; fixCardIds: Set<string>; fixCount: number; ftrEnabled: boolean };

const VARIANTS: SetupVariant[] = ['ORM', 'MARCOM_META_TIKTOK', 'MARCOM_GMB'];
/** Field mapping (§18.3): approved_at = latest `approved` stage event; others are the card's own timestamps. */
export function inputFromRow(r: ServicingRow): SetupInput | null {
  const v = r.service_variant as SetupVariant;
  if (!VARIANTS.includes(v) || !r.created_at) return null;
  return {
    card_id: r.card_id, hotel_id: r.hotel_id, hotel_name: r.hotel_name, service_variant: v, created_at: r.created_at,
    approved_at: latestEntry({ ...r, stage_events: r.stage_events ?? [] }, 'approved'), specialist_handover_done_at: r.specialist_handover_done_at ?? null,
    meeting_created_at: r.meeting_created_at ?? null, meeting_date: r.meeting_date ?? null, go_live_at: r.go_live_at,
    ae: r.ae_owner_id, specialist: r.specialist_id, orm_team: r.orm_team, marcom_owner: r.marcom_owner_id,
  };
}

export function useSetupFeed(): SetupFeed | undefined {
  const { demo, filter } = useDashboardGlobal();
  const read = useServerFn(readServicingDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({ queryKey: ['servicing-dashboard-views-v2'], queryFn: () => read(), enabled: ready && !demo, staleTime: 60_000 });
  const tickets = useTickets();
  return useMemo(() => {
    if (!ready) return undefined;
    const term = filter.search.trim().toLowerCase();
    const keep = (x: SetupInput) => !term || `${x.hotel_name} ${x.hotel_id}`.toLowerCase().includes(term);
    if (demo) {
      const d = setupDemo();
      const ids = new Set(d.fixTickets.flatMap((t) => (t.subject_ref.card_id ? [t.subject_ref.card_id] : [])));
      return { today: SETUP_DEMO_TODAY, demo, pending: false, timings: d.inputs.filter(keep).map((x) => getSetupTiming(x, SETUP_DEMO_TODAY)), fixCardIds: ids, fixCount: d.fixTickets.length, ftrEnabled: handoverFixEnabled(true) };
    }
    const today = bkkDate(new Date().toISOString());
    const fix = tickets.filter((t) => t.type === 'HANDOVER_FIX' && t.status !== 'CANCELLED');
    const rows = real.data?.rows ?? [];
    const timings = rows.flatMap((r) => { const x = inputFromRow(r); return x && keep(x) ? [getSetupTiming(x, today)] : []; });
    return { today, demo, pending: real.data?.pending ?? !real.data, timings, fixCardIds: new Set(fix.flatMap((t) => (t.subject_ref.card_id ? [t.subject_ref.card_id] : []))), fixCount: fix.length, ftrEnabled: handoverFixEnabled(false) };
  }, [ready, demo, filter.search, real.data, tickets]);
}

/** Card ⑤ dot click → tab On-board / Off-board with `?card={id}` (stored tab key `servicing` unchanged). */
export function openOnboardCard(cardId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'servicing');
  url.searchParams.set('card', cardId);
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new CustomEvent('psdash:open-tab', { detail: { tab: 'servicing', card: cardId } }));
}
