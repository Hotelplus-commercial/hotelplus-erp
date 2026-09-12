import { createFileRoute } from "@tanstack/react-router";

import { ModuleLayout } from "@/components/hotel/module-layout";

const description =
  "The Office APP — งานส่วนกลางของสำนักงาน: ORM Bonus tier classification และรายงานสำหรับ MD / HOC / AC / HR / OGM";

export const officeTabs = [{ label: "ORM Bonus", to: "/the-office-app/orm-bonus" }];

export const Route = createFileRoute("/the-office-app")({
  head: () => ({
    meta: [
      { title: "The Office APP | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "The Office APP | Meridia Hotel ERP" },
      { property: "og:description", content: description },
    ],
  }),
  component: () => <ModuleLayout tabs={officeTabs} />,
});
