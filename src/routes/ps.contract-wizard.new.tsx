/* PS App v2.3 · Fix 1 + Fix 3 — the single wizard entry: /ps/contract-wizard/new?quote_id=… */
import { createFileRoute } from "@tanstack/react-router";

import { ContractWizard } from "@/components/ps/contract-wizard";
import { useBd } from "@/lib/bd-store";

export const Route = createFileRoute("/ps/contract-wizard/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    quote_id: typeof search['quote_id'] === "string" ? (search['quote_id'] as string) : "",
  }),
  component: WizardEntry,
});

function WizardEntry() {
  const { quote_id } = Route.useSearch();
  const { quotes, hydrated } = useBd();
  const quote = quotes.find((q) => q.quote_id === quote_id);

  if (!hydrated)
    return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">กำลังเปิด Contract Wizard…</p>;

  if (!quote || !quote.deal_id)
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {!quote
          ? `ไม่พบใบเสนอราคา ${quote_id || "(ไม่ได้ระบุ)"}`
          : `ใบเสนอราคา ${quote.quote_id} ยังไม่ผูกกับดีล · เปิด Wizard ไม่ได้`}
      </p>
    );

  return <ContractWizard dealId={quote.deal_id} preselectQuoteId={quote.quote_id} />;
}
