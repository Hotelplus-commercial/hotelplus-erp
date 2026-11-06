import { createFileRoute } from "@tanstack/react-router";

import { OrmTierPage } from "@/components/orm/orm-tier-page";

export const Route = createFileRoute("/orm/orm-tier")({
  head: () => ({
    meta: [
      { title: "ORM Tier — ORM App | Meridia Suite" },
      { name: "description", content: "Tier รายเดือนตาม % Revenue Achievement ของเดือนที่ปิดยอดแล้ว" },
      { property: "og:title", content: "ORM Tier — ORM App | Meridia Suite" },
      { property: "og:description", content: "Tier รายเดือนตาม % Revenue Achievement ของเดือนที่ปิดยอดแล้ว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrmTierPage,
});
