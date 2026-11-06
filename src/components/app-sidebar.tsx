import { Crown } from "lucide-react";
import { modules } from "@/lib/erp-data";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, ExternalLink, Flag, Hotel, LayoutDashboard, LifeBuoy, Server, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ROLE_KEYS, ROLE_LABEL, hydrateMenuRole, setMenuRole, useMenuRole, type RoleKey } from "@/lib/menu-role";
import { SUITE_ITEMS, appOfPath, guardTarget, landingOf, matchRoute, visibleApps, visibleNodes, withDemo, type SidebarItem, type SidebarNode } from "@/lib/sidebar-registry";
import { psDemoOn } from "@/lib/demo-session";

/* Suite Sidebar R1: every app's menu renders from SIDEBAR_REGISTRY. The menu role ("บทบาทเมนู (ทดสอบ)") only decides
 * visibility, landings and S10 redirects; in-page switchers stay where they are. Links and redirects keep DEMO. */
const SUITE_ICON = { overview: LayoutDashboard, "system-cost": Server, configuration: Settings, support: LifeBuoy } as const;
const demoSearch = (demo: boolean, extra: Record<string, string> = {}) => ({ ...(demo ? { demo: 1 } : {}), ...extra }) as never;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({ select: (r) => ({ pathname: r.location.pathname, searchStr: r.location.searchStr }) });
  const urlDemo = new URLSearchParams(searchStr).get("demo") === "1";
  const role = useMenuRole();
  useEffect(() => { hydrateMenuRole(); }, []);
  const [sharedDemo, setSharedDemo] = useState(false);
  useEffect(() => { setSharedDemo(psDemoOn()); }, [pathname, searchStr]);
  const demo = urlDemo || sharedDemo;
  // S10 + role switch: a hidden page replace-redirects to the app landing for the role, keeping ?demo=1 / shared DEMO.
  useEffect(() => {
    const t = guardTarget(pathname, role);
    if (t && t !== pathname) router.navigate({ href: withDemo(t, searchStr, psDemoOn()), replace: true });
  }, [pathname, role]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeApp = appOfPath(pathname);
  const activeItem = matchRoute(pathname)?.item;
  const apps = visibleApps(role);

  const renderItem = (i: SidebarItem, depth: number) => {
    const pad = depth > 1 ? "pl-3" : "";
    if (i.kind === "report_issue") return null;
    if (i.kind === "external") {
      const empty = !i.url;
      return (
        <SidebarMenuSubItem key={i.key} className={pad}>
          <SidebarMenuSubButton asChild isActive={pathname === i.fallback}>
            {empty ? <Link to={i.fallback as never} search={demoSearch(demo)}><span className="truncate">{i.label}</span><ExternalLink className="size-3 shrink-0 opacity-70" /></Link>
              : <a href={i.url} target="_blank" rel="noreferrer"><span className="truncate">{i.label}</span><ExternalLink className="size-3 shrink-0 opacity-70" /></a>}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }
    if (i.kind === "link_out") {
      const extra = i.target.mode === "drop_file" ? { mode: "drop" } : {};
      return (
        <SidebarMenuSubItem key={i.key} className={pad}>
          <SidebarMenuSubButton asChild>
            <Link to={i.target.route as never} search={demoSearch(demo, extra)} data-testid={`sb-link-out-${i.key}`}>
              <span className="truncate">{i.label}</span><ArrowUpRight className="size-3.5 shrink-0 opacity-70" aria-label="เปิดในแอปเจ้าของ" />
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }
    return (
      <SidebarMenuSubItem key={i.key} className={pad}>
        <SidebarMenuSubButton asChild isActive={activeItem === i}>
          <Link to={i.route as never} search={demoSearch(demo)} data-testid={`sb-item-${i.key}`}><span className="truncate">{i.label}</span></Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };
  const renderNodes = (ns: (SidebarNode | SidebarItem)[], depth: number): ReactNode => ns.map((n, idx) => {
    if (n.kind === "group" || n.kind === "subheader") {
      return (
        <Fragment key={`${n.label}-${idx}`}>
          <li aria-hidden="true" className={n.kind === "group" ? "px-2 pb-0.5 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-sidebar-foreground/60" : "pl-4 pr-2 pt-1 text-[10.5px] font-medium text-sidebar-foreground/60"}>{n.label}</li>
          {renderNodes(n.children, depth + 1)}
        </Fragment>
      );
    }
    return renderItem(n, depth);
  });

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Hotel className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-sidebar-accent-foreground">
                Meridia Suite
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">Hotel Management ERP</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      {!collapsed && (
        <div className="border-b border-sidebar-border/60 px-3 py-2">
          <label className="block text-[11px] font-medium text-sidebar-foreground/80">บทบาทเมนู (ทดสอบ)
            <select aria-label="บทบาทเมนู (ทดสอบ)" data-testid="menu-role" className="mt-1 w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1 text-xs text-sidebar-accent-foreground"
              value={role} onChange={(e) => setMenuRole(e.target.value as RoleKey)}>
              {ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <p className="mt-1 text-[10.5px] leading-snug text-sidebar-foreground/60">มีผลกับเมนูและหน้าที่เปิดได้เท่านั้น · บทบาทในหน้ายังเลือกที่ตัวเลือกของแต่ละหน้า</p>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Suite</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SUITE_ITEMS.map((s) => {
                const I = SUITE_ICON[s.key];
                return (
                  <SidebarMenuItem key={s.key}>
                    <SidebarMenuButton asChild isActive={pathname === s.route && s.key !== "support"} tooltip={s.label}>
                      <Link to={s.route} search={demoSearch(demo)} className="flex items-center gap-2"><I className="size-4 shrink-0" /><span className="truncate">{s.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Apps</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {apps.map((a) => {
                const mod = modules.find((m) => m.slug === (a.key === "AUTO" ? "automation" : a.key.toLowerCase()));
                const Icon = mod?.icon ?? Crown;
                const open = activeApp?.key === a.key;
                const nodes = visibleNodes(a.nodes, role);
                const issue = nodes.find((n) => n.kind === "report_issue") as SidebarItem | undefined;
                const landing = landingOf(a, role) ?? `/${a.prefix}`;
                return (
                  <SidebarMenuItem key={a.key} data-testid={`sb-app-${a.key}`}>
                    <SidebarMenuButton asChild isActive={open} tooltip={a.label}>
                      <Link to={landing as never} search={demoSearch(demo)} className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0" /><span className="truncate">{a.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {!collapsed && open && (
                      <SidebarMenuSub>
                        {renderNodes(nodes.filter((n) => n.kind !== "report_issue"), 1)}
                        {issue && issue.kind === "report_issue" && (
                          <>
                            <li aria-hidden="true" className="my-1 border-t border-sidebar-border/60" />
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname === issue.route}>
                                <Link to={issue.route as never} search={demoSearch(demo)} data-testid="sb-report-issue"><Flag className="size-3.5 shrink-0" /><span className="truncate">แจ้งปัญหา</span></Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </>
                        )}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <div className="flex min-w-0 items-center gap-3 px-1 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            IK
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-sidebar-accent-foreground">
                Ines Kovač
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/70">Group COO</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
