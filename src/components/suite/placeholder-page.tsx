/* Suite Sidebar R1 §5 / §7 — ONE shared placeholder page (title · purpose · empty state, tabs empty). No buttons, no data.
 * Unknown path under an app prefix → replace-redirect to the app landing for the menu role (S10), keeping DEMO. */
import { useEffect, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/erp-ui";
import { appOfPath, guardTarget, landingOf, placeholderAt, withDemo } from "@/lib/sidebar-registry";
import { useMenuRole } from "@/lib/menu-role";
import { psDemoOn } from "@/lib/demo-session";

export function SuitePlaceholderPage() {
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({ select: (r) => ({ pathname: r.location.pathname, searchStr: r.location.searchStr }) });
  const role = useMenuRole();
  const hit = placeholderAt(pathname);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    if (hit) return;
    const app = appOfPath(pathname);
    const target = (app && landingOf(app, role)) || guardTarget(pathname, role) || "/";
    if (target !== pathname) router.navigate({ href: withDemo(target, searchStr, psDemoOn()), replace: true });
  }, [hit, pathname, role]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hit) return null;
  const { app, item, group } = hit;
  const isIssue = item.kind === "report_issue";
  const purpose = isIssue ? "แจ้งปัญหาระบบ หรือเรื่องร้องเรียน" : "purpose" in item ? item.purpose : "อยู่ระหว่างพัฒนา";
  const suffix = item.kind === "placeholder" && item.titleSuffix ? ` · ${item.titleSuffix}` : "";
  const tabs = (item.kind === "placeholder" ? item.tabs ?? [] : []).filter((t) => !t.access || t.access.includes(role));
  return (
    <div className="space-y-5" data-testid="suite-placeholder">
      <PageHeader eyebrow={group ? `${app.label} · ${group}` : app.label} title={`${item.label}${suffix}`} description={purpose} />
      {tabs.length > 0 && (
        <div role="tablist" className="flex gap-1 border-b">
          {tabs.map((t, i) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={tab === i ? "border-b-2 border-primary px-3 py-1.5 text-sm font-medium" : "px-3 py-1.5 text-sm text-muted-foreground"}>{t.label}</button>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">เมนูนี้อยู่ระหว่างพัฒนา</div>
    </div>
  );
}
