import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bd/calculator")({
  head: () => ({
    meta: [
      { title: "Calculator — BD App | Meridia Hotel ERP" },
      { name: "description", content: "เครื่องคำนวณราคา ORM และ Marcom สำหรับสร้างใบเสนอราคา" },
      { property: "og:title", content: "Calculator — BD App" },
      { property: "og:description", content: "เครื่องคำนวณราคา ORM และ Marcom สำหรับสร้างใบเสนอราคา" },
    ],
  }),
  component: () => <Outlet />,
});
