/* PS-10 · Full render preview (deep link, ไม่อยู่ใน sidebar)
 * แสดงเอกสารทั้งฉบับเป็นหน้า A4 หลายหน้า + ปุ่มพิมพ์/บันทึก PDF ผ่าน browser print */
import { Link, createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { CIFooter, CIHeader, CoverPage, renderBody } from "@/lib/contract-renderer";
import { MONTHLY_SKUS, activeBlockVersion, usePsBlockGroups } from "@/lib/ps-block-groups";
import { usePsTemplates } from "@/lib/ps-templates";
import { sampleDataFor, serviceLineOf, type PreviewCustomerType } from "@/lib/template-preview-sample-data";

type Search = { sku?: string; customer_type?: PreviewCustomerType; show_cover?: boolean };

export const Route = createFileRoute("/ps/templates/preview/$templateId")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sku: typeof s['sku'] === "string" ? s['sku'] : undefined,
    customer_type: s['customer_type'] === "individual" ? "individual" : "juristic",
    show_cover: s['show_cover'] === false || s['show_cover'] === "false" ? false : true,
  }),
  head: () => ({
    meta: [
      { title: "Full render preview | PS App Templates" },
      { name: "description", content: "พรีวิวเอกสารสัญญาทั้งฉบับเป็นหน้า A4 พร้อม Cover Page, CI header/footer และบันทึกเป็น PDF" },
      { property: "og:title", content: "Full render preview | PS App Templates" },
      { property: "og:description", content: "พรีวิวเอกสารสัญญาทั้งฉบับเป็นหน้า A4 พร้อมบันทึกเป็น PDF" },
    ],
  }),
  component: FullPreview,
});

const BLOCK_RE = /<ConditionalBlockPlaceholder\s+group="([^"]+)"\s*\/?>/g;
const CHARS_PER_PAGE = 1700;

function FullPreview() {
  const { templateId } = useParams({ from: "/ps/templates/preview/$templateId" });
  const search = useSearch({ from: "/ps/templates/preview/$templateId" });
  const { templates, activeVersion, hydrated } = usePsTemplates();
  const { blockGroups } = usePsBlockGroups();

  const tpl = templates.find((t) => t.template_id === templateId);
  const mapped = tpl && tpl.mapped_skus.length > 0 ? tpl.mapped_skus : [...MONTHLY_SKUS];
  const [sku, setSku] = useState(search.sku && mapped.includes(search.sku) ? search.sku : (mapped[0] as string));
  const [customerType, setCustomerType] = useState<PreviewCustomerType>(search.customer_type ?? "juristic");
  const [showCover, setShowCover] = useState(search.show_cover !== false);
  const [page, setPage] = useState(0);

  const line = tpl?.service_line ?? serviceLineOf(sku);
  const data = useMemo(() => sampleDataFor({ sku, customerType, serviceLine: line }), [sku, customerType, line]);

  /* resolve block-group zones then paginate rendered HTML */
  const pages = useMemo(() => {
    if (!tpl) return [] as { kind: "cover" | "body"; html?: string }[];
    const body =
      tpl.sections.length > 0
        ? tpl.sections.map((s) => `<h3 class="a4-block-title">${s.title}</h3>${s.content}`).join("\n")
        : (activeVersion(tpl)?.body ?? "");
    const resolved = body.replace(BLOCK_RE, (_m, groupId: string) => {
      const g = blockGroups.find((b) => b.block_group_id === groupId);
      const v = g ? activeBlockVersion(g).variants.find((x) => x.applies_to_skus.includes(sku)) : undefined;
      return v ? v.content : `<p>⚠️ ไม่มีเนื้อหาสำหรับ ${sku}</p>`;
    });
    const html = renderBody(resolved, data, { pills: false });

    const chunks: string[] = [];
    let current = "";
    for (const part of html.split(/(?=<h3)|(?=<p)|(?=<div)/g)) {
      if (current.length + part.length > CHARS_PER_PAGE && current) {
        chunks.push(current);
        current = part;
      } else current += part;
    }
    if (current.trim()) chunks.push(current);

    const out: { kind: "cover" | "body"; html?: string }[] = [];
    if (showCover && tpl.template_type === "contract") out.push({ kind: "cover" });
    for (const c of chunks) out.push({ kind: "body", html: c });
    return out;
  }, [tpl, activeVersion, blockGroups, sku, data, showCover]);

  if (!tpl) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {hydrated ? `ไม่พบเทมเพลต ${templateId}` : "กำลังโหลด…"}
      </p>
    );
  }

  const withCI = tpl.template_type === "contract";
  const total = pages.length;
  const safePage = Math.min(page, Math.max(total - 1, 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/ps/templates/$templateId"
          params={{ templateId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> กลับไปแก้ไขเทมเพลต
        </Link>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" /> พิมพ์ / บันทึกเป็น PDF
        </Button>
      </div>

      <div className="grid gap-4 print:hidden lg:grid-cols-[260px_1fr]">
        <Panel title="Render controls" subtitle={`${tpl.name} · ${activeVersion(tpl)?.version_label ?? "—"}`}>
          <div className="space-y-3 text-xs">
            <label className="block">
              <span className="text-[11px] text-muted-foreground">SKU</span>
              <select
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setPage(0);
                }}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs"
              >
                {mapped.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1">
              {(["juristic", "individual"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={customerType === t ? "default" : "outline"}
                  className="h-7 flex-1 px-2 text-[11px]"
                  onClick={() => setCustomerType(t)}
                >
                  {t === "juristic" ? "นิติบุคคล" : "บุคคล"}
                </Button>
              ))}
            </div>
            {withCI && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showCover} onChange={(e) => setShowCover(e.target.checked)} /> Include cover page
              </label>
            )}
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <Button size="icon" variant="outline" className="size-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[11px] text-muted-foreground">
                หน้า {safePage + 1} / {total || 1}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="size-7"
                disabled={safePage >= total - 1}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              การแบ่งหน้าเป็นการประมาณจากความยาวเนื้อหา · ไฟล์จริงใช้ระบบ print ของเบราว์เซอร์ (A4, margin 0)
            </p>
          </div>
        </Panel>

        <div className="a4-canvas">
          {pages[safePage]?.kind === "cover" ? (
            <CoverPage
              serviceLine={line}
              contractCode={data["contract.code"] ?? "—"}
              hotelName={data["hotel.name"] ?? "—"}
            />
          ) : (
            <section className="a4-page a4-page--fixed">
              {withCI && <CIHeader serviceLine={line} />}
              <div className="a4-body" dangerouslySetInnerHTML={{ __html: pages[safePage]?.html ?? "" }} />
              {withCI && <CIFooter pageNum={safePage + 1} totalPages={total} />}
            </section>
          )}
        </div>
      </div>

      {/* print target: every page in order */}
      <div className="a4-print-root hidden print:block">
        {pages.map((p, i) =>
          p.kind === "cover" ? (
            <CoverPage
              key={i}
              serviceLine={line}
              contractCode={data["contract.code"] ?? "—"}
              hotelName={data["hotel.name"] ?? "—"}
            />
          ) : (
            <section key={i} className="a4-page a4-page--fixed">
              {withCI && <CIHeader serviceLine={line} />}
              <div className="a4-body" dangerouslySetInnerHTML={{ __html: p.html ?? "" }} />
              {withCI && <CIFooter pageNum={i + 1} totalPages={total} />}
            </section>
          ),
        )}
      </div>
    </div>
  );
}
