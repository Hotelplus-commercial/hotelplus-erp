/* Tab R3 — read-only data feed for card ④ อายุสัญญา and the card ⑦ age cell (`v_ps_contract_age` selector input).
 * Live: card ① contracts (data.flow) + card ⑦ contracts (data.base) · first Go Live from the Servicing On-board cards
 * (browser storage `meridia.ps.servicing.v5_0` → cards[].go_live_at, matched by contract_ref, else hotel + service) ·
 * renewal chains from renewal_request.source_contract_id → new_contract_id · price cycles from contract_price_history.
 * DEMO: the R3 demo additions (src/lib/contract-age-demo.ts) beside the existing demo data. Nothing here writes. */
import { useEffect, useMemo, useState } from "react";
import type { TabR1Data } from "@/lib/contract-tab-r1";
import { demoPriceHistory, useRenewalStore } from "@/lib/renewal-store";
import { isReasonsDemo, useRenewalReasons, type RenewalReason } from "@/lib/renewal-reasons";
import { createWelcomeBack, isDemoTickets, peekNextSeq, ticketIdOf, useTickets, type L0Ticket, type WelcomeBackOut } from "@/lib/tickets-l0";
import type { PriceHistoryRow } from "@/lib/renewal-rules";
import { ageIndex, vPsContractAge, type AgeContractSource, type ContractAgeRow, type UpsellLine } from "@/lib/contract-age";
import { contractAgeDemo, demoWelcomeBackSink, nextDemoTicketId, useDemoWelcomeBack } from "@/lib/contract-age-demo";

export type ContractAgeFeed = {
  today: string; demo: boolean; rows: ContractAgeRow[]; index: Map<string, ContractAgeRow>;
  history: PriceHistoryRow[]; upsell: Record<string, UpsellLine[]>; reasons: RenewalReason[];
  /** Store tickets + read-only demo seed tickets (seed passed to the lock re-check). */
  tickets: L0Ticket[]; seedTickets: L0Ticket[];
  firstMeeting: Record<string, string>; lowSurveys: Record<string, { at: string; score: number }[]>;
  /** §9.3 report: active service contracts without a Go Live date (Setup). */
  setupCount: number;
  /** Next ticket number to reserve, and the WELCOME_BACK write (lock re-checked inside). DEMO never writes the live store. */
  nextTicketId: () => string;
  send: (input: Parameters<typeof createWelcomeBack>[0]) => WelcomeBackOut;
};
type GoLiveCard = { property_id?: string; service_line?: string; contract_ref?: string; go_live_at?: string | null };
const SERVICING_KEY = "meridia.ps.servicing.v5_0";
function readGoLiveCards(): GoLiveCard[] {
  try { const p = JSON.parse(localStorage.getItem(SERVICING_KEY) ?? "null") as { cards?: GoLiveCard[] } | null; return Array.isArray(p?.cards) ? p!.cards! : []; } catch { return []; }
}
const svcOfCard = (s: string | undefined) => (s === "ORM" ? "ORM" : s ? "Marcom" : null);

/** Pure live source assembly (exported for tests). */
export function liveAgeSources(data: TabR1Data, cards: GoLiveCard[]): AgeContractSource[] {
  const goLive = (cid: string, hotel: string, svc: "ORM" | "Marcom") => {
    const mine = cards.filter((c) => c.go_live_at && (c.contract_ref === cid || (c.property_id === hotel && svcOfCard(c.service_line) === svc)));
    return mine.map((c) => c.go_live_at!.slice(0, 10)).sort()[0] ?? null;
  };
  const out: AgeContractSource[] = [];
  for (const f of data.flow) {
    const b = data.base.find((x) => x.contract_id === f.contract_id);
    const kind = f.end_reason === "EARLY_TERMINATION" ? "LOST" : f.end_reason === "NOT_RENEWED" ? "NOT_RENEWED" : f.end_reason === "RENEWAL" ? "RENEWAL" : null;
    out.push({
      contract_id: f.contract_id, hotel_id: f.hotel_id, hotel_name_en: b?.hotel_name_en ?? null, hotel_name_th: b?.hotel_name_th ?? f.hotel_name, service: f.service,
      ae_id: b?.ae ?? null, ae_name: b?.ae ? b.ae.replace(/^AE\d+-/, "") : null, team_label: f.service === "ORM" ? (b?.orm_team ? `ทีม ${b.orm_team}` : null) : b?.marcom ?? null,
      signed_at: f.start, go_live_at: goLive(f.contract_id, f.hotel_id, f.service), renewal_of: f.renewal_of,
      ended_at: f.end, end_kind: kind, notice_at: null,
    });
  }
  for (const b of data.base) if (!out.some((o) => o.contract_id === b.contract_id)) out.push({
    contract_id: b.contract_id, hotel_id: b.hotel_id, hotel_name_en: b.hotel_name_en, hotel_name_th: b.hotel_name_th ?? b.hotel_name, service: b.service,
    ae_id: b.ae, ae_name: b.ae ? b.ae.replace(/^AE\d+-/, "") : null, team_label: b.service === "ORM" ? (b.orm_team ? `ทีม ${b.orm_team}` : null) : b.marcom,
    signed_at: b.start, go_live_at: goLive(b.contract_id, b.hotel_id, b.service), renewal_of: null, ended_at: null, end_kind: null, notice_at: null,
  });
  return out;
}

export function useContractAge(data: TabR1Data | undefined): ContractAgeFeed | undefined {
  const store = useRenewalStore();
  const stored = useRenewalReasons();
  const storeTickets = useTickets();
  const [cards, setCards] = useState<GoLiveCard[]>([]);
  const demoSent = useDemoWelcomeBack();
  useEffect(() => {
    if (data?.demo) return;
    setCards(readGoLiveCards());
    const on = (e: StorageEvent) => { if (e.key === SERVICING_KEY) setCards(readGoLiveCards()); };
    window.addEventListener("storage", on); return () => window.removeEventListener("storage", on);
  }, [data?.demo]);
  return useMemo(() => {
    if (!data) return undefined;
    const today = data.today;
    const links = store.requests.filter((r) => r.new_contract_id).map((r) => ({ from: r.source_contract_id, to: r.new_contract_id! }));
    if (data.demo) {
      const d = contractAgeDemo();
      const history = [...demoPriceHistory(), ...d.prices];
      const rows = vPsContractAge(d.sources, { today, links: [...links, ...d.links], history });
      const base = isReasonsDemo() ? stored : [];
      const reasons = [...base, ...d.reasons.filter((r) => !base.some((x) => x.contract_id === r.contract_id))];
      // DEMO: other ticket types are read from the ticket store only while it is in its in-memory demo mode.
      // R3.3 WB17: DEMO Welcome Back always goes to ONE store — the session DEMO store shared with BD App › Workspace
      // (survives the page load; never the real ticket store), however DEMO was turned on.
      const inStore = isDemoTickets();
      const sent = new Set(demoSent.map((t) => t.ticket_id));
      const own = [...demoSent, ...(inStore ? storeTickets.filter((t) => !sent.has(t.ticket_id)) : [])];
      const seen = new Set(own.map((t) => t.ticket_id));
      const seed = d.tickets.filter((t) => !seen.has(t.ticket_id));
      return {
        today, demo: true, rows, index: ageIndex(rows), history, upsell: d.upsell, reasons, tickets: [...seed, ...own], seedTickets: seed, firstMeeting: d.firstMeeting, lowSurveys: d.lowSurveys, setupCount: rows.filter((r) => r.status === "SETUP").length,
        nextTicketId: () => nextDemoTicketId(),
        // R3.2 §6.1: DEMO send stamps the DEMO clock (28 ต.ค. 2569), the same clock the assign / start / finish actions use.
        send: (input) => createWelcomeBack(input, seed, demoWelcomeBackSink),
      };
    }
    const rows = vPsContractAge(liveAgeSources(data, cards), { today, links, history: store.history });
    return { today, demo: false, rows, index: ageIndex(rows), history: store.history, upsell: {}, reasons: stored, tickets: storeTickets, seedTickets: [], firstMeeting: {}, lowSurveys: {}, setupCount: rows.filter((r) => r.status === "SETUP").length,
      nextTicketId: () => ticketIdOf(peekNextSeq()), send: (input) => createWelcomeBack(input) };
  }, [data, store.requests, store.history, stored, storeTickets, cards, demoSent]);
}
