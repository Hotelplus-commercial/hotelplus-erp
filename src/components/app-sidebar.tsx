import { Link, useRouterState } from "@tanstack/react-router";
import {
  Hotel,
  LifeBuoy,
  Settings,
  LayoutDashboard,
  BuildingIcon,
  FileSignature,
  Server,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { modules } from "@/lib/erp-data";

const masterItems = [
  { title: "Hotel Profile (AC)", url: "/ac/hotel-profile", icon: BuildingIcon },
  { title: "สัญญา & บริการ (PS)", url: "/ps/contracts", icon: FileSignature },
  { title: "ต้นทุนค่าระบบ", url: "/system-cost", icon: Server },
];


const systemItems = [
  { title: "Configuration", url: "/settings", icon: Settings },
  { title: "Support", url: "/settings", icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

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
              {modules.map((m) => (
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Master data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
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
