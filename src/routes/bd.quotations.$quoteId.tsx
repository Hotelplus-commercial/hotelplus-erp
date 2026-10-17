import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuoteEditor } from "@/components/crm/quote-editor";
import { useCrm } from "@/lib/crm-store";

export const Route = createFileRoute("/bd/quotations/$quoteId")({
  head: () => ({ meta: [
    { title: "Quotation Editor | Meridia Hotel ERP" },
    { name: "description", content: "Prepare and review hotel service quotations in Meridia Hotel ERP." },
    { property: "og:title", content: "Quotation Editor | Meridia Hotel ERP" },
    { property: "og:description", content: "Prepare and review hotel service quotations in Meridia Hotel ERP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
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
