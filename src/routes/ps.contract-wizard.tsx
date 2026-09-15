import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ps/contract-wizard")({
  head: () => ({
    meta: [
      { title: "Contract Wizard — PS App | Meridia Hotel ERP" },
      { name: "description", content: "Wizard 5 ขั้นตอน แปลงใบเสนอราคาที่อนุมัติแล้วเป็นสัญญาและ Signing Package" },
      { property: "og:title", content: "Contract Wizard — PS App" },
      { property: "og:description", content: "Wizard 5 ขั้นตอน จากใบเสนอราคาสู่สัญญาและ Signing Package" },
    ],
  }),
  component: () => <Outlet />,
});
