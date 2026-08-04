import type { ReactNode } from "react";
import { Search, Sparkles } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { NotificationCenter } from "@/components/notification-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { properties } from "@/lib/erp-data";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <div className="relative hidden min-w-0 flex-1 md:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search guests, accounts, work orders…"
                    className="h-9 max-w-md pl-9"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Select defaultValue={properties[0]}>
                  <SelectTrigger className="hidden h-9 w-[170px] lg:flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="hidden gap-1.5 sm:flex">
                  <Sparkles className="size-4" /> Insights
                </Button>
                <NotificationCenter />
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  IK
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-7">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
