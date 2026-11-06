import { createFileRoute } from "@tanstack/react-router";
import { DemandCalendarPage } from "@/components/bd/demand-calendar-page";

/* Patch A: BD APP page copied from the real portal. */
export const Route = createFileRoute("/bd_/demand-calendar")({
  head: () => ({
    meta: [
      { title: "Demand Calendar — BD APP | Meridia Suite" },
      { name: "description", content: "ระดับ demand ของที่พักแต่ละจังหวัดในประเทศไทย" },
      { property: "og:title", content: "Demand Calendar — BD APP" },
      { property: "og:description", content: "ระดับ demand ของที่พักแต่ละจังหวัดในประเทศไทย" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemandCalendarPage,
});
