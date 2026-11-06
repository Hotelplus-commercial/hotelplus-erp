import { createFileRoute } from "@tanstack/react-router";
import { AdrCalculatorPage } from "@/components/bd/adr-calculator-page";

/* Patch A: BD APP page copied from the real portal. */
export const Route = createFileRoute("/bd_/adr-calculator")({
  head: () => ({
    meta: [
      { title: "ADR Calculator — BD APP | Meridia Suite" },
      { name: "description", content: "คำนวณ ADR ตามประเภทห้องพักและราคาวันธรรมดา / วันสุดสัปดาห์" },
      { property: "og:title", content: "ADR Calculator — BD APP" },
      { property: "og:description", content: "คำนวณ ADR ตามประเภทห้องพักและราคาวันธรรมดา / วันสุดสัปดาห์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdrCalculatorPage,
});
