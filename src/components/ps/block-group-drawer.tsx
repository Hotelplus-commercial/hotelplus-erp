/* PS App v2.1 Path A · Phase 2.3 — BlockGroupDrawer
 * Inline block group management inside the contract template editor (PS-3).
 * Replaces the standalone block group dashboard: every variant of the clicked
 * block group is listed here, the variant matching the previewed SKU is
 * highlighted, and editing hands off to the Block Group editor (PS-6). */
import { Link } from "@tanstack/react-router";
import { Eye, Lock, PencilLine, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { renderBody } from "@/lib/contract-renderer";
import { activeBlockVersion, coverageOf, usePsBlockGroups } from "@/lib/ps-block-groups";
import { sampleDataFor, serviceLineOf } from "@/lib/template-preview-sample-data";

const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function BlockGroupDrawer({
  groupId,
  currentSku,
  templateId,
  onClose,
  onReplace,
  onRemove,
}: {
  groupId: string;
  currentSku: string;
  templateId: string;
  onClose: () => void;
  onReplace?: (nextGroupId: string) => void;
  onRemove?: () => void;
}) {
  const { blockGroups } = usePsBlockGroups();
  const group = blockGroups.find((g) => g.block_group_id === groupId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [swap, setSwap] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const version = group ? activeBlockVersion(group) : null;
  const cov = group ? coverageOf(group) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="ปิด drawer" className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[480px] flex-col overflow-hidden border-l bg-card shadow-2xl">
        <header className="flex items-start gap-2 border-b p-4">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold">🧩 {groupId}</p>
            <p className="text-sm text-muted-foreground">{group?.block_group_label ?? "ไม่พบ block group นี้"}</p>
            {group && version && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Section: {group.render_section} ·{" "}
                {group.render_once_per_contract ? "render ครั้งเดียวต่อสัญญา" : "render ต่อ SKU"} ·{" "}
                {version.variants.length} variants
              </p>
            )}
            {cov && (
              <Chip tone={cov.missing.length ? "danger" : "success"}>
                coverage {cov.covered}/{cov.total}
              </Chip>
            )}
          </div>
          <Button size="icon" variant="ghost" className="ml-auto size-8" onClick={onClose} aria-label="ปิด">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {version?.variants.map((v) => {
            const match = v.applies_to_skus.includes(currentSku);
            const data = sampleDataFor({
              sku: v.applies_to_skus[0] ?? currentSku,
              serviceLine: serviceLineOf(v.applies_to_skus[0] ?? currentSku),
            });
            const open = expanded === v.block_id;
            return (
              <div
                key={v.block_id}
                className={`rounded-xl border p-3 text-xs ${
                  match ? "border-[color:var(--bg-chip-border)] bg-[color:var(--bg-chip-bg)]" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-[color:var(--bg-chip-border)] px-1.5 py-0.5 text-[10px] text-white">
                    V{v.variant_seq}
                  </span>
                  <span className="font-medium">{v.variant_label}</span>
                  {match && <Chip tone="info">SKU ที่กำลังพรีวิว</Chip>}
                  {v.locked && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="size-3" /> locked
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {v.applies_to_skus.map((s) => (
                    <code key={s} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {s}
                    </code>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ภาษา {v.language.toUpperCase()} · แก้ไขได้ {v.locked ? "เฉพาะ System Admin" : "ใช่"}
                </p>

                {open ? (
                  <div
                    className="mt-2 border-l-2 border-[color:var(--bg-chip-border)] pl-2 text-[11px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderBody(v.content, data, { pills: true }) }}
                  />
                ) : (
                  <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                    “{plain(v.content).slice(0, 150)}…”
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => setExpanded(open ? null : v.block_id)}
                  >
                    <Eye className="size-3" /> {open ? "ย่อเนื้อหา" : "Preview full"}
                  </Button>
                  <Button asChild size="sm" className="h-7 gap-1 px-2 text-[11px]">
                    <Link to="/ps/templates/block-groups/$groupId" params={{ groupId }} search={{ from: templateId }}>
                      <PencilLine className="size-3" /> แก้ไขใน Block Group Editor
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
          {version?.variants.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มี variant</p>}

          {swap && (
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-xs font-medium">เปลี่ยน block group ที่ตำแหน่งนี้</p>
              <div className="space-y-1">
                {blockGroups
                  .filter((g) => g.block_group_id !== groupId)
                  .map((g) => (
                    <Button
                      key={g.block_group_id}
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start px-2 font-mono text-[11px]"
                      onClick={() => {
                        onReplace?.(g.block_group_id);
                        setSwap(false);
                        onClose();
                      }}
                    >
                      🧩 {g.block_group_id}
                    </Button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <footer className="space-y-1.5 border-t p-4">
          <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
            <Link to="/ps/templates/block-groups/$groupId" params={{ groupId }} search={{ from: templateId }}>
              <Plus className="size-4" /> เพิ่ม variant ใหม่
            </Link>
          </Button>
          {onReplace && (
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setSwap((s) => !s)}>
              <RefreshCw className="size-4" /> เปลี่ยน block group ที่ตำแหน่งนี้
            </Button>
          )}
          {onRemove && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5 text-destructive"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              <Trash2 className="size-4" /> ลบ block group node
            </Button>
          )}
        </footer>
      </aside>
    </div>
  );
}
