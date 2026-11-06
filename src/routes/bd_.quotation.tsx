import { createFileRoute } from "@tanstack/react-router";
import { QuotationListPage } from "@/components/bd/quotation-list-page";

/* Patch A: BD APP page copied from the real portal. */
export const Route = createFileRoute("/bd_/quotation")({
  head: () => ({
    meta: [
      { title: "ใบเสนอราคา — BD APP | Meridia Suite" },
      { name: "description", content: "ใบเสนอราคาทั้งหมดที่ export จากหน้า Calculator" },
      { property: "og:title", content: "ใบเสนอราคา — BD APP" },
      { property: "og:description", content: "ใบเสนอราคาทั้งหมดที่ export จากหน้า Calculator" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotationListPage,
});
