/* PS App v2.2 · Fix 3 — single wizard entry point: /ps/contract-wizard/new?quote_id=…
 * No confirmation modal: resolve the quote, then open the wizard on its deal with
 * the quote preselected. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useBd } from "@/lib/bd-store";

export const Route = createFileRoute("/ps/contract-wizard/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    quote_id: typeof search.quote_id === "string" ? search.quote_id : "",
  }),
  component: WizardEntry,
});

function WizardEntry() {
  const { quote_id } = Route.useSearch();
  const navigate = useNavigate();
  const { quotes, hydrated } = useBd();
  const quote = quotes.find((q) => q.quote_id === quote_id);

  useEffect(() => {
    if (!hydrated) return;
    if (quote?.deal_id) {
      void navigate({
        to: "/ps/contract-wizard/$dealId",
        params: { dealId: quote.deal_id },
        search: { quote_id: quote.quote_id },
        replace: true,
      });
    }
  }, [hydrated, quote, navigate]);

  return (
    <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      {!hydrated
        ? "กำลังเปิด Contract Wizard…"
        : !quote
          ? `ไม่พบใบเสนอราคา ${quote_id || "(ไม่ได้ระบุ)"}`
          : !quote.deal_id
            ? `ใบเสนอราคา ${quote.quote_id} ยังไม่ผูกกับดีล · เปิด Wizard ไม่ได้`
            : "กำลังเปิด Contract Wizard…"}
    </p>
  );
}
