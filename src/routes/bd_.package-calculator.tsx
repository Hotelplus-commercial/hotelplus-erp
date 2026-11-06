import { createFileRoute } from "@tanstack/react-router";
import { PackageCalculatorPage } from "@/components/bd/package-calculator-page";

/* Patch A: BD APP page copied from the real portal. */
export const Route = createFileRoute("/bd_/package-calculator")({
  head: () => ({
    meta: [
      { title: "Package Calculator — BD APP | Meridia Suite" },
      { name: "description", content: "คำนวณแพ็กเกจ ORM และ Marcom สำหรับเสนอราคา" },
      { property: "og:title", content: "Package Calculator — BD APP" },
      { property: "og:description", content: "คำนวณแพ็กเกจ ORM และ Marcom สำหรับเสนอราคา" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PackageCalculatorPage,
});
