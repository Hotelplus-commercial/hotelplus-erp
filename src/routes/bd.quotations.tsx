import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bd/quotations")({
  head: () => ({
    meta: [
      { title: "ใบเสนอราคา — BD App | Meridia Hotel ERP" },
      { name: "description", content: "จัดการใบเสนอราคา พร้อมกฎการเลือกสินค้า ภาษี และการล็อกเอกสาร" },
      { property: "og:title", content: "ใบเสนอราคา — BD App" },
      { property: "og:description", content: "จัดการใบเสนอราคา ภาษี VAT/WHT และการอนุมัติ" },
    ],
  }),
  component: () => <Outlet />,
});
