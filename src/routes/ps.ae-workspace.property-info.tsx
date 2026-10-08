import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { ServicingCardDrawer } from "@/components/ps/servicing-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGE_LABEL, currentDay, useServicing } from "@/lib/ps-servicing";

export const Route = createFileRoute("/ps/ae-workspace/property-info")({
  head: () => ({
    meta: [
      { title: "Property Info — AE Workspace | Meridia Hotel ERP" },
      { name: "description", content: "สถานะ On-boarding ของแต่ละโรงแรมแยกตามบริการ พร้อมเปิดการ์ด On-boarding" },
      { property: "og:title", content: "Property Info — AE Workspace" },
      { property: "og:description", content: "สถานะ On-boarding รายโรงแรมและปุ่มเปิดการ์ด" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyInfoTab,
});

function PropertyInfoTab() {
  const s = useServicing();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const hotels = useMemo(() => {
    const ids = [...new Set(s.cards.map((c) => c.property_id))];
    return ids
      .map((id) => ({ id, cards: s.cards.filter((c) => c.property_id === id) }))
      .filter((h) => h.cards[0]?.property_name.toLowerCase().includes(q.trim().toLowerCase()));
  }, [s.cards, q]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Property Info"
        title="Property Info"
        description="สถานะ On-boarding ของแต่ละโรงแรม — ทำงานต่อได้จากปุ่มเปิดการ์ด"
        actions={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงแรม…" className="h-9 w-[220px]" />}
      />
      <Panel title="สถานะ On-boarding รายโรงแรม" subtitle="หนึ่งชิปต่อหนึ่งบริการ · อ่านอย่างเดียว">
        <ul className="divide-y rounded-lg border">
          {hotels.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="min-w-[12rem] flex-1 text-sm font-medium">{h.cards[0]?.property_name} <span className="text-xs text-muted-foreground">· {h.id}</span></span>
              {h.cards.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Chip tone={c.service_line === "ORM" ? "info" : "muted"}>
                    {c.service_line === "ORM" ? "ORM" : "Marcom"} · {STAGE_LABEL[c.current_stage]} · Day {currentDay(c)}
                  </Chip>
                  <Button size="sm" variant="outline" onClick={() => setOpen(c.id)}>เปิดการ์ด On-boarding</Button>
                </div>
              ))}
            </li>
          ))}
          {!hotels.length && <li className="p-6 text-center text-sm text-muted-foreground">ไม่พบโรงแรม</li>}
        </ul>
      </Panel>
      <ServicingCardDrawer key={open ?? "closed"} id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
