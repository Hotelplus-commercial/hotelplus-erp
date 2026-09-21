import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bd/quotes")({
  head: () => ({
    meta: [
      { title: "Quote Dashboard — BD App | Meridia Hotel ERP" },
      { name: "description", content: "ใบเสนอราคาแยกตามโฟลเดอร์โรงแรม พร้อมสถานะ aging และการอนุมัติ" },
      { property: "og:title", content: "Quote Dashboard — BD App" },
      { property: "og:description", content: "ใบเสนอราคาแยกตามโรงแรม พร้อมสถานะ aging" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Outlet />,
});
