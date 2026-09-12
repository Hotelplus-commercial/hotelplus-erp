import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { PsDashboard } from "@/components/hotel/ps-dashboard";
import { PsDashboardFilters } from "@/components/ps/ps-dashboard-filters";
import { NewContractUpdates } from "@/components/ps/renewal-ui";
import { ActivityFeedList, useAutoRefresh } from "@/components/ps/v4-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMeetingMgmt } from "@/lib/orm-meeting";
import type { AssignmentFilter } from "@/lib/ps-renewal";
import { activityFeed, feedTypes } from "@/lib/ps-v4";

const description =
  "PS Dashboard: ภาพรวมสัญญาบริการของลูกค้าทั้งหมด — AC สร้างโรงแรม · PS เติมสัญญาให้ครบ พร้อมสถานะ ORM / Marcom / Production รายโรงแรม";

export const Route = createFileRoute("/ps/")({
  head: () => ({
    meta: [
      { title: "PS Dashboard — Partner Success | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "PS Dashboard — Partner Success" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PsDashboardPage,
});

function PsDashboardPage() {
  const { role } = useMeetingMgmt();
  const [filter, setFilter] = useState<AssignmentFilter>({
    role: "none",
    teams: [],
    people: [],
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="PS App · Dashboard" title="PS Dashboard" description={description} />
      <PsDashboardFilters value={filter} onChange={setFilter} />
      {role === "Partner Manager" && (
        <>
          <NewContractUpdates />
          <TeamActivityFeed />
        </>
      )}
      <PsDashboard assignment={filter} />
    </div>
  );
}

/** v4.0 — PM-only activity feed, auto-refresh 30s */
function TeamActivityFeed() {
  const [type, setType] = useState<string>("All");
  const tick = useAutoRefresh(30);
  const events = activityFeed.filter((e) => type === "All" || e.type === type);

  return (
    <Panel
      title="📊 Team Activity Feed"
      subtitle="เหตุการณ์ล่าสุดของทีม (24 ชั่วโมง) — รีเฟรชอัตโนมัติทุก 30 วินาที"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {feedTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  Filter: {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Chip tone="muted">refresh #{tick}</Chip>
          <Button size="sm" variant="outline" onClick={() => setType("All")}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      }
    >
      <ActivityFeedList events={events} />
    </Panel>
  );
}
