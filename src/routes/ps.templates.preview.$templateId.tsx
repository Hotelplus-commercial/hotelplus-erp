/* PS-10 · Full render preview for flat contract templates. */
import { Link, createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { CIFooter, CIHeader, CoverPage, paginateA4, renderBody } from "@/lib/contract-renderer";
import {
  CONTRACT_SKU_CODES,
  activeContractTemplates,
  findContractTemplateBySku,
  templateSku,
  usePsTemplates,
} from "@/lib/ps-templates";
import { quoteLineItemsFor, sampleDataFor, serviceLineOf, type PreviewCustomerType } from "@/lib/template-preview-sample-data";

const CHARS_PER_PAGE = 1700;
const DEFAULT_CONTRACT_SKU = "ORM-MTH-FULL-SMART";

type Search = {
  sku: string | undefined;
  customer_type: PreviewCustomerType;
  show_cover: boolean;
  package_skus: string[];
};

export const Route = createFileRoute("/ps/templates/preview/$templateId")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sku: typeof s["sku"] === "string" ? s["sku"] : undefined,
    customer_type: s["customer_type"] === "individual" ? "individual" : "juristic",
    show_cover: s["show_cover"] === false || s["show_cover"] === "false" ? false : true,
    package_skus:
      typeof s["package_skus"] === "string"
        ? String(s["package_skus"])
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
  }),
  head: () => ({
    meta: [
      { title: "Full render preview | PS App Templates" },
      { name: "description", content: "พรีวิวเอกสารทั้งฉบับแบบ flat contract template ต่อ SKU พร้อม Cover Page และ CI header/footer" },
      { property: "og:title", content: "Full render preview | PS App Templates" },
      { property: "og:description", content: "พรีวิวเอกสารทั้งฉบับแบบ flat contract template ต่อ SKU" },
    ],
  }),
  component: FullPreview,
});

function FullPreview() {
  const { templateId } = useParams({ from: "/ps/templates/preview/$templateId" });
  const search = useSearch({ from: "/ps/templates/preview/$templateId" });
  const { templates, activeVersion, hydrated } = usePsTemplates();
  const tpl = templates.find((t) => t.template_id === templateId);
  const contractTemplates = activeContractTemplates(templates);
  const firstContractTemplate = contractTemplates[0];
  const initialSku = search.sku ?? (firstContractTemplate ? templateSku(firstContractTemplate) : null) ?? DEFAULT_CONTRACT_SKU;
  const [sku, setSku] = useState(CONTRACT_SKU_CODES.includes(initialSku) ? initialSku : DEFAULT_CONTRACT_SKU);
  const [customerType, setCustomerType] = useState<PreviewCustomerType>(search.customer_type ?? "juristic");
  const [showCover, setShowCover] = useState(search.show_cover !== false);
  const [multiSku, setMultiSku] = useState(search.package_skus.length > 1);
  const [page, setPage] = useState(0);

  const renderTargets = useMemo(() => {
    if (multiSku) {
      const requested = search.package_skus.length ? search.package_skus : ["ORM-MTH-FULL-SMART", "MARCOM-MTH-META"];
      return requested
        .map((code) => findContractTemplateBySku(templates, code))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));
    }
    const direct = tpl?.template_type === "contract" ? tpl : findContractTemplateBySku(templates, sku);
    return direct ? [direct] : [];
  }, [multiSku, search.package_skus, sku, templates, tpl]);

  const pages = useMemo(() => {
    return renderTargets.flatMap((target, contractIndex) => {
      const targetSku = templateSku(target) ?? sku ?? DEFAULT_CONTRACT_SKU;
      const line = target.service_line ?? serviceLineOf(targetSku);
      const data = sampleDataFor({ sku: targetSku, customerType, serviceLine: line });
      const bodyBlocks = target.sections.length
        ? target.sections.map((section) => ({ title: section.title, html: renderBody(section.content, data, { pills: false }) }))
        : [
            {
              title: target.name,
              html: renderBody(activeVersion(target)?.body ?? "", data, {
                pills: false,
                lineItems: quoteLineItemsFor(line),
              }),
            },
          ];
      return paginateA4(bodyBlocks, { showCover: showCover && target.template_type === "contract", charsPerPage: CHARS_PER_PAGE }).map((p) => ({
        ...p,
        contractIndex,
        templateId: target.template_id,
        sku: targetSku,
        serviceLine: line,
        contractCode: data["contract.code"] ?? "—",
        hotelName: data["hotel.name"] ?? "—",
      }));
    });
  }, [activeVersion, customerType, renderTargets, showCover, sku]);

  if (!tpl && !hydrated) {
    return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">กำลังโหลด…</p>;
  }

  if (!tpl && !renderTargets.length) {
    return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">ไม่พบเทมเพลต {templateId}</p>;
  }

  const total = pages.length;
  const safePage = Math.min(page, Math.max(total - 1, 0));
  const current = pages[safePage];
  const withCI = current?.serviceLine === "ORM" || current?.serviceLine === "MARCOM";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/ps/templates/$templateId" params={{ templateId }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> กลับไปแก้ไขเทมเพลต
        </Link>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" /> พิมพ์
        </Button>
      </div>

      <div className="grid gap-4 print:hidden lg:grid-cols-[280px_1fr]">
        <Panel title="Render controls" subtitle={multiSku ? "multi-SKU package preview" : tpl?.name ?? "—"}>
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiSku}
                onChange={(e) => {
                  setMultiSku(e.target.checked);
                  setPage(0);
                }}
              />{" "}
              Multi-SKU package
            </label>
            {!multiSku && (
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
                  {CONTRACT_SKU_CODES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex gap-1">
              {(["juristic", "individual"] as const).map((t) => (
                <Button key={t} size="sm" variant={customerType === t ? "default" : "outline"} className="h-7 flex-1 px-2 text-[11px]" onClick={() => setCustomerType(t)}>
                  {t === "juristic" ? "นิติบุคคล" : "บุคคล"}
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showCover} onChange={(e) => setShowCover(e.target.checked)} /> Include cover page
            </label>
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <Button size="icon" variant="outline" className="size-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[11px] text-muted-foreground">หน้า {safePage + 1} / {total || 1}</span>
              <Button size="icon" variant="outline" className="size-7" disabled={safePage >= total - 1} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="rounded-lg bg-surface p-2 text-[11px] text-muted-foreground">
              {renderTargets.map((target) => (
                <p key={target.template_id} className="font-mono">{target.template_id} · {templateSku(target)}</p>
              ))}
            </div>
          </div>
        </Panel>

        <div className="a4-canvas">
          {current?.kind === "cover" ? (
            <CoverPage serviceLine={current.serviceLine} contractCode={current.contractCode} hotelName={current.hotelName} />
          ) : (
            <section className="a4-page a4-page--fixed">
              {current && withCI && <CIHeader serviceLine={current.serviceLine} />}
              <div className="a4-body" dangerouslySetInnerHTML={{ __html: current?.html ?? "" }} />
              {current && withCI && <CIFooter pageNum={safePage + 1} totalPages={total} />}
            </section>
          )}
        </div>
      </div>

      <div className="a4-print-root hidden print:block">
        {pages.map((p, i) =>
          p.kind === "cover" ? (
            <CoverPage key={`${p.templateId}-${i}`} serviceLine={p.serviceLine} contractCode={p.contractCode} hotelName={p.hotelName} />
          ) : (
            <section key={`${p.templateId}-${i}`} className="a4-page a4-page--fixed">
              <CIHeader serviceLine={p.serviceLine} />
              <div className="a4-body" dangerouslySetInnerHTML={{ __html: p.html ?? "" }} />
              <CIFooter pageNum={i + 1} totalPages={total} />
            </section>
          ),
        )}
      </div>
    </div>
  );
}
