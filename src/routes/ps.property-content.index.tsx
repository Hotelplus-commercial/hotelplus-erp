import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { Ws2GenerateNewProperty } from "@/components/ps/ws2-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PC_VIEWERS, SERVICE_LABEL, useWs2, type ServiceProfile } from "@/lib/ws2-store";

const description = "Property Content: คลังข้อมูลโรงแรมทั้งพอร์ต ค้นหา เรียง และกรอง My Hotel พร้อมสร้างฟอร์มให้โรงแรมใหม่";

export const Route = createFileRoute("/ps/property-content/")({
  head: () => ({
    meta: [
      { title: "Property Content — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "Property Content — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyContentPage,
});

const SHORT: Record<string, string> = { ORM: "ORM", MARCOM_MT: "MT", MARCOM_GMB: "GMB" };
export const rollup = (ps: ServiceProfile[]) =>
  ps.length && ps.every((p) => p.form_completion_status === "submitted") ? { icon: "●", label: "complete" }
    : ps.some((p) => p.form_completion_status !== "not_sent") ? { icon: "◐", label: "partial" } : { icon: "○", label: "not sent" };

function PropertyContentPage() {
  const w = useWs2();
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [viewer, setViewer] = useState<string>("Nont");
  const [sort, setSort] = useState<"az" | "year">("az");
  const [gen, setGen] = useState(false);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return w.properties
      .map((p) => ({ p, profiles: w.profiles.filter((x) => x.property_id === p.hotel_id) }))
      .filter(({ p }) => !term || `${p.hotel_name_th} ${p.hotel_name_en}`.toLowerCase().includes(term))
      .filter(({ p, profiles }) => !mine || p.owner_ae === viewer || profiles.some((x) => x.assigned_to === viewer))
      .sort((a, b) => sort === "year" ? (b.p.start_year ?? 0) - (a.p.start_year ?? 0) || a.p.hotel_name_en.localeCompare(b.p.hotel_name_en) : a.p.hotel_name_en.localeCompare(b.p.hotel_name_en));
  }, [w.properties, w.profiles, q, mine, viewer, sort]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="PS App · Property Content" title="Property Content" description="หนึ่งโฟลเดอร์ต่อหนึ่งโรงแรม · ใช้ข้อมูลชุดเดียวกับการ์ด On-boarding"
        actions={<Button onClick={() => setGen((v) => !v)}>+ Generate for new property</Button>} />
      {gen && <Ws2GenerateNewProperty />}
      <Panel title="คลังโรงแรม" subtitle="สถานะรวมเป็นข้อมูลแนะนำเท่านั้น">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ค้นหาชื่อโรงแรม…" className="h-9 min-w-[14rem] flex-1" />
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={mine} onCheckedChange={(c) => setMine(!!c)} aria-label="My Hotel" />My Hotel</label>
          <select aria-label="ดูในฐานะ" className="h-9 rounded-md border bg-background px-2 text-sm" value={viewer} onChange={(e) => setViewer(e.target.value)}>{PC_VIEWERS.map((v) => <option key={v}>{v}</option>)}</select>
          <select aria-label="Sort" className="h-9 rounded-md border bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as "az" | "year")}><option value="az">Sort: A–Z</option><option value="year">Sort: Start year</option></select>
        </div>
        <ul className="divide-y rounded-lg border">
          {rows.map(({ p, profiles }) => { const r = rollup(profiles); return (
            <li key={p.hotel_id}>
              <Link to="/ps/property-content/$hotelId" params={{ hotelId: p.hotel_id }} search={{ viewer }} className="flex flex-wrap items-center gap-3 p-3 text-sm hover:bg-muted/40">
                <span className="min-w-[12rem] flex-1 font-medium">📁 {p.hotel_name_th}</span>
                <span className="text-xs text-muted-foreground">{profiles.map((x) => SHORT[x.service]).join(" · ") || "—"}</span>
                {p.start_year && <span className="text-xs text-muted-foreground">{p.start_year}</span>}
                <Chip tone="muted">{r.icon} {r.label}</Chip>
              </Link>
            </li>
          ); })}
          {!rows.length && <li className="p-6 text-center text-sm text-muted-foreground">ไม่พบโรงแรม</li>}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">"ดูในฐานะ" ใช้จำลองผู้ใช้สำหรับตัวกรอง My Hotel เท่านั้น · บริการ: {Object.values(SERVICE_LABEL).join(", ")}</p>
      </Panel>
    </div>
  );
}
