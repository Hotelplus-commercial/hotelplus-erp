import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BuildingIcon,
  Calculator,
  CalendarCheck,
  ClipboardCheck,

  Megaphone,
  FileSignature,
  FileText,
  Handshake,
  Hotel,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Receipt,
  Server,
  Settings,
  Users,
} from "lucide-react";

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
import { modules } from "@/lib/erp-data";
import { useMeetingMgmt } from "@/lib/orm-meeting";

const moduleChildren: Record<string, { title: string; url: string; icon: typeof BuildingIcon }[]> = {
  bd: [
    { title: "Quotes", url: "/bd/quotes", icon: FileText },
    { title: "Calculator · ORM", url: "/bd/calculator/orm", icon: Calculator },
    { title: "Calculator · Marcom", url: "/bd/calculator/marcom", icon: Megaphone },
    { title: "Register Deal", url: "/bd/register-deal", icon: Handshake },
  ],

  orm: [
    { title: "ORM Overview", url: "/orm", icon: LayoutDashboard },
    { title: "Action A · Hotel Plus ORM", url: "/orm/action-a", icon: BarChart3 },
  ],
  ac: [
    { title: "Hotel Profile", url: "/ac/hotel-profile", icon: BuildingIcon },
    { title: "ต้นทุนค่าระบบ", url: "/ac/system-cost", icon: Server },
    { title: "Product Catalog", url: "/ac/products", icon: Package },
    { title: "Customer Master", url: "/ac/customers", icon: Users },
    { title: "Invoice & ใบเสร็จ", url: "/ac/billing", icon: Receipt },
  ],
  ps: [
    { title: "PS Dashboard", url: "/ps", icon: LayoutDashboard },
    { title: "สัญญา & บริการ", url: "/ps/contracts", icon: FileSignature },
    { title: "สร้างสัญญา (Wizard)", url: "/ps/contract-wizard", icon: FileSignature },
    { title: "Contract Dashboard", url: "/ps/contract-dashboard", icon: LayoutDashboard },
    { title: "Production Report", url: "/ps/production", icon: BarChart3 },
    { title: "Templates", url: "/ps/templates", icon: FileText },
    { title: "AE Workspace", url: "/ps/ae-workspace/dashboard", icon: CalendarCheck },
    { title: "On-boarding Process", url: "/ps/onboarding-process", icon: ClipboardCheck },
  ],

};


const systemItems = [
  { title: "Configuration", url: "/settings", icon: Settings },
  { title: "Support", url: "/settings", icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { role } = useMeetingMgmt();

  const hiddenUrls = new Set<string>();
  if (role === "On-boarding Specialist" || role === "ORM" || role === "GRM") {
    hiddenUrls.add("/ps/ae-workspace/dashboard");
  }
  if (role === "ORM" || role === "GRM") hiddenUrls.add("/ps/onboarding-process");

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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Executive">
                  <Link to="/" className="flex items-center gap-2">
                    <LayoutDashboard className="size-4 shrink-0" />
                    <span className="truncate">Executive App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((m) => {
                const children = (moduleChildren[m.slug] ?? []).filter((c) => !hiddenUrls.has(c.url));
                const inSection = pathname === m.to || pathname.startsWith(`${m.to}/`);
                return (
                  <SidebarMenuItem key={m.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === m.to}
                      tooltip={`${m.code} App`}
                    >
                      <Link to={m.to} className="flex items-center gap-2">
                        <m.icon className="size-4 shrink-0" />
                        <span className="truncate">{m.code} App</span>
                      </Link>
                    </SidebarMenuButton>
                    {!collapsed && children.length > 0 && inSection && (
                      <SidebarMenuSub>
                        {children.map((c) => (
                          <SidebarMenuSubItem key={c.url}>
                            <SidebarMenuSubButton asChild isActive={pathname === c.url}>
                              <Link to={c.url} className="flex items-center gap-2">
                                <c.icon className="size-3.5 shrink-0" />
                                <span className="truncate">{c.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Shared</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/system-cost"}
                  tooltip="ต้นทุนค่าระบบ (ภาพรวม)"
                >
                  <Link to="/system-cost" className="flex items-center gap-2">
                    <Server className="size-4 shrink-0" />
                    <span className="truncate">ต้นทุนค่าระบบ (ภาพรวม)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
