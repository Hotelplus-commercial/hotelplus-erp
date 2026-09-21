/* PS-6 · Block Group editor — A4 canvas, CI header/footer แบบจาง (ไม่ใช่ส่วนของ block) */
import { Link, createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Lock, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CIFooter, CIHeader, renderBody } from "@/lib/contract-renderer";
import { activeBlockVersion, coverageOf, usePsBlockGroups, type ConditionalBlock } from "@/lib/ps-block-groups";
import { sampleDataFor, serviceLineOf } from "@/lib/template-preview-sample-data";

export const Route = createFileRoute("/ps/templates/block-groups/$groupId")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s['from'] === "string" ? s['from'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Block Group editor — A4 canvas | PS App" },
      { name: "description", content: "แก้ไขเนื้อหา variant ของ block group บนกระดาษ A4 พร้อม SKU chips และ coverage" },
      { property: "og:title", content: "Block Group editor — A4 canvas | PS App" },
      { property: "og:description", content: "แก้ไขเนื้อหา variant ของ block group บนกระดาษ A4 พร้อม coverage" },
    ],
  }),
  component: BlockGroupEditor,
});

function VariantCard({
  variant,
  groupId,
  canEdit,
}: {
  variant: ConditionalBlock;
  groupId: string;
  canEdit: boolean;
}) {
  const { saveVariant, isSystemAdmin } = usePsBlockGroups();
  const [draft, setDraft] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const readOnly = !canEdit || (variant.locked && !isSystemAdmin);
  const sku = variant.applies_to_skus[0] ?? "ORM-MTH-FULL-SMART";
  const data = sampleDataFor({ sku, serviceLine: serviceLineOf(sku) });
  const text = draft ?? variant.content;

  return (
    <section className="a4-page">
      <CIHeader serviceLine={serviceLineOf(sku)} greyed />
      <div className="a4-body">
        <span className="a4-readonly-badge">CI header/footer · อ่านอย่างเดียว</span>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[8pt]">
          <span className="rounded bg-[color:var(--bg-chip-border)] px-1.5 py-0.5 text-white">
            V{variant.variant_seq} · {variant.variant_label}
          </span>
          {variant.locked && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              <Lock className="size-3" /> locked
            </span>
          )}
          {variant.applies_to_skus.map((s) => (
            <code key={s} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[7.5pt] text-muted-foreground" title="SKU mapping แก้ไขที่ระบบ">
              {s}
            </code>
          ))}
          <button
            type="button"
            className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[8pt] hover:bg-primary hover:text-primary-foreground"
            onClick={() => setEdit((e) => !e)}
          >
            {edit ? "ดูผลลัพธ์" : "แก้ไขเนื้อหา"}
          </button>
        </div>

        {edit ? (
          <>
            <Textarea
              value={text}
              readOnly={readOnly}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="min-h-[200px] bg-white font-mono text-[10px] leading-relaxed"
            />
            <div className="mt-2 flex items-center gap-2">
              {readOnly ? (
                <p className="flex items-center gap-1 text-[8pt] text-muted-foreground">
                  <Lock className="size-3" /> variant นี้ล็อกไว้ · ต้องเป็น System Admin
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[8pt]"
                  disabled={draft === null}
                  onClick={() => {
                    const ok = saveVariant(groupId, variant.block_id, text);
                    if (ok) {
                      setDraft(null);
                      setEdit(false);
                      toast.success(`บันทึก V${variant.variant_seq} แล้ว`);
                    } else toast.error("บันทึกไม่สำเร็จ · variant ถูกล็อก");
                  }}
                >
                  บันทึก variant
                </Button>
              )}
              <span className="text-[8pt] text-muted-foreground">อัปเดต {fmtDate(variant.updated_at)}</span>
            </div>
          </>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderBody(text, data, { pills: true }) }} />
        )}
      </div>
      <CIFooter greyed />
    </section>
  );
}

function BlockGroupEditor() {
  const { groupId } = useParams({ from: "/ps/templates/block-groups/$groupId" });
  const { from } = useSearch({ from: "/ps/templates/block-groups/$groupId" });
  const { blockGroups, hydrated, isSystemAdmin, setSystemAdmin } = usePsBlockGroups();
  const group = blockGroups.find((g) => g.block_group_id === groupId);

  if (!group) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {hydrated ? `ไม่พบ block group ${groupId}` : "กำลังโหลด…"}
      </p>
    );
  }

  const version = activeBlockVersion(group);
  const cov = coverageOf(group);
  const canEdit = group.edit_permission === "any" || isSystemAdmin;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={from ? "/ps/templates/$templateId" : "/ps/templates"}
          {...(from ? { params: { templateId: from } } : {})}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {from ? `กลับไปเทมเพลต ${from}` : "กลับไปหน้า Templates"}
        </Link>
      </div>


      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">🧩 {group.block_group_id}</code>
            <Chip tone="info">{version.version_label} active</Chip>
            <Chip tone={cov.missing.length ? "danger" : "success"}>
              coverage {cov.covered}/{cov.total}
            </Chip>
            {group.edit_permission === "system_admin" && <Chip tone="warn">System Admin only</Chip>}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{group.block_group_label}</h1>
          <p className="text-sm text-muted-foreground">
            render ที่ section “{group.render_section}” · {group.render_once_per_contract ? "ครั้งเดียวต่อสัญญา" : "ต่อ SKU"}
          </p>
        </div>
        <Button variant={isSystemAdmin ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSystemAdmin(!isSystemAdmin)}>
          <Shield className="size-4" /> {isSystemAdmin ? "ออกจากโหมด System Admin" : "สลับเป็น System Admin"}
        </Button>
      </div>

      {cov.missing.length > 0 && (
        <p className="rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          ⚠️ ยังไม่มี variant สำหรับ SKU: <span className="font-mono text-xs">{cov.missing.join(", ")}</span> — สร้างสัญญาสำหรับ SKU
          เหล่านี้จะถูกบล็อก
        </p>
      )}

      {!canEdit && (
        <Panel title="โหมดอ่านอย่างเดียว">
          <p className="text-sm text-muted-foreground">block group นี้แก้ไขได้เฉพาะ System Admin</p>
        </Panel>
      )}

      <div className="a4-canvas space-y-4">
        {version.variants.map((v) => (
          <VariantCard key={v.block_id} variant={v} groupId={group.block_group_id} canEdit={canEdit} />
        ))}
      </div>
    </div>
  );
}
