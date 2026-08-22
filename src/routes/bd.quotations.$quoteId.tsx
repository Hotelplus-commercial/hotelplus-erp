import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuoteEditor } from "@/components/crm/quote-editor";
import { useCrm } from "@/lib/crm-store";

export const Route = createFileRoute("/bd/quotations/$quoteId")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { quoteId } = useParams({ from: "/bd/quotations/$quoteId" });
  const { quotations, hydrated } = useCrm();
  const quote = quotations.find((q) => q.quote_id === quoteId);

  return (
    <div className="space-y-4">
      <Link to="/bd/quotations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้ารวมใบเสนอราคา
      </Link>
      {quote ? (
        <QuoteEditor quote={quote} />
      ) : (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {hydrated ? `ไม่พบใบเสนอราคา ${quoteId}` : "กำลังโหลด…"}
        </p>
      )}
    </div>
  );
}
