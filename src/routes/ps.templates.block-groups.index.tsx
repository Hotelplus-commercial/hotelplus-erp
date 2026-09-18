/* PS-5 · Block Group dashboard */
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, PencilLine, Shield, ShieldCheck } from "lucide-react";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { activeBlockVersion, coverageOf, usePsBlockGroups } from "@/lib/ps-block-groups";

export const Route = createFileRoute("/ps/templates/block-groups/")({
  head: () => ({
    meta: [
      { title: "Block Groups — Conditional content | PS App" },
      { name: "description", content: "จัดการ block group ของสัญญา: variant ต่อ SKU, coverage และเวอร์ชัน" },
      { property: "og:title", content: "Block Groups — Conditional content | PS App" },
      { property: "og:description", content: "จัดการ block group ของสัญญา: variant ต่อ SKU, coverage และเวอร์ชัน" },
    ],
  }),
  component: BlockGroupDashboard,
});

function BlockGroupDashboard() {
  const { blockGroups, hydrated, isSystemAdmin, setSystemAdmin } = usePsBlockGroups();
  const full = blockGroups.filter((g) => coverageOf(g).missing.length === 0).length;

  return (
    <div className="space-y-5">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Block Groups</h1>
          <p className="text-sm text-muted-foreground">
            เนื้อหาเฉพาะ SKU ถูกแยกออกจากเทมเพลต — สัญญาจะดึง variant ที่ตรงกับ SKU ตอนสร้างเอกสาร
          </p>
        </div>
        <Button variant={isSystemAdmin ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSystemAdmin(!isSystemAdmin)}>
          {isSystemAdmin ? <ShieldCheck className="size-4" /> : <Shield className="size-4" />}
          {isSystemAdmin ? "System Admin" : "โหมด PS user"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Block groups" value={blockGroups.length} />
        <Kpi label="Coverage ครบ 10 SKU" value={full} />
        <Kpi label="ต้องเป็น System Admin" value={blockGroups.filter((g) => g.edit_permission === "system_admin").length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {blockGroups.map((g) => {
          const cov = coverageOf(g);
          const v = activeBlockVersion(g);
          return (
            <div key={g.block_group_id} className="card-elevated space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">🧩 {g.block_group_id}</code>
                    <Chip tone={cov.missing.length ? "danger" : "success"}>
                      coverage {cov.covered}/{cov.total}
                    </Chip>
                    <Chip tone="info">{v.version_label} active</Chip>
                    {g.edit_permission === "system_admin" && <Chip tone="warn">System Admin only</Chip>}
                  </div>
                  <p className="mt-1 font-display text-sm font-semibold">{g.block_group_label}</p>
                  <p className="text-xs text-muted-foreground">
                    section: {g.render_section} · {g.render_once_per_contract ? "render ครั้งเดียวต่อสัญญา" : "render ต่อ SKU"} ·{" "}
                    {v.variants.length} variants
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/ps/templates/block-groups/$groupId" params={{ groupId: g.block_group_id }} search={{ from: undefined }}>
                    <PencilLine className="size-4" /> Edit
                  </Link>
                </Button>
              </div>
              {cov.missing.length > 0 && (
                <p className="rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] dark:bg-amber-950/20">
                  ⚠️ ยังไม่มี variant สำหรับ: {cov.missing.join(", ")}
                </p>
              )}
              <p className="border-t pt-2 text-[11px] text-muted-foreground">
                แก้ไขล่าสุด {fmtDate(g.updated_at)} · {g.updated_by}
              </p>
            </div>
          );
        })}
      </div>

      {blockGroups.length === 0 && (
        <Panel title="ไม่มี block group">
          <p className="text-sm text-muted-foreground">{hydrated ? "ยังไม่มีข้อมูล" : "กำลังโหลด…"}</p>
        </Panel>
      )}
    </div>
  );
}
