import { createFileRoute } from "@tanstack/react-router";

import { OfficeBdacPage } from "@/components/office/office-bdac-page";

const description = "ดีลจาก BD ถึง AC · Approved QT → WON · การเงินจาก AC";

export const Route = createFileRoute("/the-office-app/bd-ac")({
  head: () => ({
    meta: [
      { title: "BD-AC | The Office APP" },
      { name: "description", content: description },
      { property: "og:title", content: "BD-AC | The Office APP" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfficeBdacPage,
});
