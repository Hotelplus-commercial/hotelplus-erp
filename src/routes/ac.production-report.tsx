import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { ProductionPage } from "@/components/ac/production-report-page";
import { PageHeader } from "@/components/erp-ui";
import { PrAcPanel, PrLeadView, PrSenderView } from "@/components/ac/pr-drop-view";
import { useMenuRole } from "@/lib/menu-role";

/* R2 A: Production Report lives in AC App › วางบิล & รับเงิน. ?mode=drop = drop view for ORM / MKT (coming soon until its mini-spec). */
const DROP_ONLY = new Set(["ORM", "ORM_LEAD", "GRM", "MKT", "MKT_LEAD"]);
const LEADS = new Set(["ORM_LEAD", "GRM", "MKT_LEAD"]);

export const Route = createFileRoute("/ac/production-report")({
  head: () => ({
    meta: [
      { title: "Production Report — AC App | Meridia Suite" },
      { name: "description", content: "ยอดผลิตรายเดือนสำหรับสัญญาแบบคอมมิชชั่น ก่อน AC วางบิลวันที่ 5" },
      { property: "og:title", content: "Production Report — AC App | Meridia Suite" },
      { property: "og:description", content: "ยอดผลิตรายเดือนสำหรับสัญญาแบบคอมมิชชั่น ก่อน AC วางบิลวันที่ 5" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductionReportRoute,
});

function ProductionReportRoute() {
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({ select: (r) => ({ pathname: r.location.pathname, searchStr: r.location.searchStr }) });
  const role = useMenuRole();
  const drop = new URLSearchParams(searchStr).get("mode") === "drop";
  useEffect(() => {
    if (drop || !DROP_ONLY.has(role)) return;
    const sp = new URLSearchParams(searchStr);
    sp.set("mode", "drop");
    router.navigate({ href: `${pathname}?${sp.toString()}`, replace: true });
  }, [drop, role]); // eslint-disable-line react-hooks/exhaustive-deps
  if (drop || DROP_ONLY.has(role)) {
    const lead = LEADS.has(role); const service = role === "MKT" || role === "MKT_LEAD" ? "Marcom" : "ORM";
    return (
      <div className="space-y-5" data-testid="production-report-drop">
        <PageHeader eyebrow="AC APP · วางไฟล์" title="Production Report · วางไฟล์" description={lead ? "ภาพรวมการส่งไฟล์ของทีม (ตรวจความครบ · ไม่แสดงยอดเงิน)" : "ส่งไฟล์ Production Report (เฉพาะโรงแรมที่ดูแล)"} />
        {lead ? <PrLeadView service={service} /> : <PrSenderView service={service} />}
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="production-report-full">
      <PageHeader eyebrow="AC APP · วางบิล & รับเงิน" title="Production Report" description="ยอดผลิตรายเดือนสำหรับสัญญาแบบคอมมิชชั่น ก่อน AC วางบิลวันที่ 5" />
      <PrAcPanel />
      <ProductionPage />
    </div>
  );
}
