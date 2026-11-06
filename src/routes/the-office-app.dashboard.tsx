import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { OfficeBdacPage } from "@/components/office/office-bdac-page";

/* R2 C: The Office Dashboard — tab 1 BD-AC (existing page body, one copy) · tab 2 ข้อเสนอต่อสัญญา (empty state). */
const TABS = [{ key: "bd-ac", label: "BD-AC" }, { key: "renewal-offer", label: "ข้อเสนอต่อสัญญา" }] as const;

export const Route = createFileRoute("/the-office-app/dashboard")({
  head: () => ({
    meta: [
      { title: "The Office Dashboard — The Office APP | Meridia Suite" },
      { name: "description", content: "ภาพรวมผู้บริหาร · BD-AC และข้อเสนอต่อสัญญา" },
      { property: "og:title", content: "The Office Dashboard — The Office APP | Meridia Suite" },
      { property: "og:description", content: "ภาพรวมผู้บริหาร · BD-AC และข้อเสนอต่อสัญญา" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfficeDashboard,
});

function OfficeDashboard() {
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({ select: (r) => ({ pathname: r.location.pathname, searchStr: r.location.searchStr }) });
  const tab = new URLSearchParams(searchStr).get("tab") === "renewal-offer" ? "renewal-offer" : "bd-ac";
  const go = (key: string) => {
    const sp = new URLSearchParams(searchStr);
    sp.set("tab", key);
    router.navigate({ href: `${pathname}?${sp.toString()}`, replace: true });
  };
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="THE OFFICE APP" title="The Office Dashboard" description="ภาพรวมผู้บริหาร" />
      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => go(t.key)} data-testid={`office-tab-${t.key}`}
            className={tab === t.key ? "border-b-2 border-primary px-3 py-1.5 text-sm font-medium" : "px-3 py-1.5 text-sm text-muted-foreground"}>{t.label}</button>
        ))}
      </div>
      {tab === "bd-ac" ? <OfficeBdacPage embedded /> : (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">เมนูนี้อยู่ระหว่างพัฒนา</div>
      )}
    </div>
  );
}
