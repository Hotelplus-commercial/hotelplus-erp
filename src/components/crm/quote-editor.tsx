import { Link } from "@tanstack/react-router";
import { Check, Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, PartyBlock, Panel, TotalsBlock, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canAddProduct,
  canRemoveLine,
  isQuoteLocked,
  lineTypeOf,
  pctLabel,
  quoteApprovalIssues,
  thb,
} from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";
import type { Product, QuoteLine, Quotation, ServiceLine } from "@/lib/crm-types";

const serviceLabel: Record<ServiceLine, string> = {
  ORM: "ORM · Online Reputation",
  MARCOM: "MARCOM · Digital Ads",
  PROD: "Production / One-time",
  PP: "Partner Program",
};

const categoryLabel: Record<string, string> = {
  setup: "Setup (ครั้งเดียว)",
  monthly: "รายเดือน",
  per_use: "ตามการใช้งาน",
  addon: "Add-on",
};

export function QuoteEditor({ quote }: { quote: Quotation }) {
  const { products, customers, deals, setQuoteLines, patchQuote, approveQuote, reviseQuote } = useCrm();
  const locked = isQuoteLocked(quote);

  const [line, setLine] = useState<ServiceLine | "">("");
  const [category, setCategory] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [pkg, setPkg] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const deal = deals.find((d) => d.pipedrive_deal_id === quote.pipedrive_deal_id);
  const customer = customers.find((c) => c.customer_id === quote.customer_id);

  const catalog = useMemo(() => products.filter((p) => p.active), [products]);
  const lines = catalog.filter((p) => (line ? p.service_line === line : true));
  const cats = [...new Set(lines.map((p) => p.category))];
  const choices = lines.filter((p) => (category ? p.category === category : true));
  const product = catalog.find((p) => p.sku === sku) ?? null;
  const selectedPkg = product?.packages.find((x) => x.package_sku === pkg) ?? null;

  const defaultPrice = selectedPkg?.base_price ?? product?.base_price ?? null;
  const commission = selectedPkg?.commission_rate ?? product?.commission_rate ?? null;

  const add = () => {
    if (!product) return;
    const check = canAddProduct(product, product.packages.length ? pkg || null : null, quote.lines, products);
    if (!check.ok) {
      toast.error("เพิ่มรายการไม่ได้", { description: check.reason });
      return;
    }
    const quantity = Math.max(1, Number(qty) || 1);
    const unit = price.trim() === "" ? defaultPrice : Number(price);
    const newLine: QuoteLine = {
      line_id: crypto.randomUUID(),
      product_id: product.product_id,
      sku_snapshot: product.sku,
      name_snapshot: product.name_th,
      package_sku_snapshot: selectedPkg?.package_sku ?? null,
      billing: product.billing,
      unit_price_snapshot: unit == null || Number.isNaN(unit) ? null : unit,
      commission_rate_snapshot: commission,
      quantity,
      amount: unit == null || Number.isNaN(unit) ? 0 : unit * quantity,
      includes_snapshot: [...product.includes],
      line_type: lineTypeOf(product),
    };
    setQuoteLines(quote.quote_id, [...quote.lines, newLine]);
    setSku("");
    setPkg("");
    setQty("1");
    setPrice("");
    toast.success(`เพิ่ม ${product.name_th} แล้ว`);
  };

  const remove = (l: QuoteLine) => {
    const check = canRemoveLine(l, quote.lines, products);
    if (!check.ok) {
      toast.error("ลบไม่ได้", { description: check.reason });
      return;
    }
    setQuoteLines(
      quote.quote_id,
      quote.lines.filter((x) => x.line_id !== l.line_id),
    );
  };

  const issues = quoteApprovalIssues(quote);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-4">
        <Panel
          title={`ใบเสนอราคา ${quote.quote_id}`}
          subtitle={`Deal #${quote.pipedrive_deal_id} · ${deal?.hotel_name ?? "—"} · สร้าง ${fmtDate(quote.created_at)}`}
          right={
            <div className="flex items-center gap-2">
              <Chip tone={quote.status === "approved" ? "success" : quote.status === "revised" ? "muted" : "info"}>
                {quote.status.toUpperCase()}
              </Chip>
              {locked && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3.5" /> ล็อกแล้ว
                </span>
              )}
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ลูกค้า (Customer Master)</Label>
              <Select
                value={quote.customer_id ?? ""}
                onValueChange={(v) => patchQuote(quote.quote_id, { customer_id: v })}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกลูกค้า" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.customer_id} value={c.customer_id}>
                      {c.customer_id} · {c.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {customer?.type === "juristic"
                  ? "นิติบุคคล — หัก ณ ที่จ่าย 3%"
                  : customer
                    ? "บุคคลธรรมดา — ไม่หัก ณ ที่จ่าย"
                    : "เลือกเพื่อคำนวณภาษี"}
              </p>
            </div>
            <div className="rounded-lg border bg-surface/40 p-3">
              <PartyBlock
                snapshot={
                  quote.customer_snapshot ??
                  (customer
                    ? {
                        customer_id: customer.customer_id,
                        legal_name: customer.legal_name,
                        type: customer.type,
                        tax_id: customer.tax_id,
                        address: customer.address,
                        signer_name: customer.signer_name,
                        contact_phone: customer.contact_phone,
                        contact_email: customer.contact_email,
                        hotel_name: deal?.hotel_name ?? customer.hotels[0]?.name ?? "",
                      }
                    : null)
                }
              />
            </div>
          </div>
        </Panel>

        {!locked && (
          <Panel title="เลือกสินค้า / บริการ" subtitle="Service line → หมวด → SKU → แพ็กเกจ">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Service line</Label>
                <Select
                  value={line}
                  onValueChange={(v) => {
                    setLine(v as ServiceLine);
                    setCategory("");
                    setSku("");
                    setPkg("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(serviceLabel) as ServiceLine[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {serviceLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>หมวด</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    setSku("");
                    setPkg("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>SKU</Label>
                <Select
                  value={sku}
                  onValueChange={(v) => {
                    setSku(v);
                    setPkg("");
                    setPrice("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสินค้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {choices.map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.sku} · {p.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {product && product.packages.length > 0 && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>แพ็กเกจ (บังคับเลือก)</Label>
                  <Select value={pkg} onValueChange={setPkg}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกแพ็กเกจ" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.packages.map((p) => (
                        <SelectItem key={p.package_sku} value={p.package_sku}>
                          {p.name} · {p.base_price == null ? "TBD" : thb(p.base_price)}
                          {p.commission_rate ? ` + ${pctLabel(p.commission_rate)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>จำนวน</Label>
                <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label>ราคา/หน่วย {defaultPrice == null && product ? "(TBD — ระบุเอง)" : ""}</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={defaultPrice == null ? "ระบุราคา" : String(defaultPrice)}
                  inputMode="decimal"
                />
              </div>
            </div>

            {product && (
              <div className="mt-3 rounded-lg border bg-surface/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{product.name_en}</p>
                {product.includes.length > 0 && <p className="mt-1">รวม: {product.includes.join(" · ")}</p>}
                {product.note && <p className="mt-1">หมายเหตุ: {product.note}</p>}
                {commission != null && <p className="mt-1">คอมมิชชั่น: {pctLabel(commission)}</p>}
              </div>
            )}

            <Button className="mt-3 gap-1.5" onClick={add} disabled={!product}>
              <Plus className="size-4" /> เพิ่มเข้าใบเสนอราคา
            </Button>
          </Panel>
        )}

        <Panel title="รายการในใบเสนอราคา" subtitle={`${quote.lines.length} รายการ`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">SKU / รายการ</th>
                  <th className="py-2 pr-3">ประเภท</th>
                  <th className="py-2 pr-3 text-right">จำนวน</th>
                  <th className="py-2 pr-3 text-right">ราคา/หน่วย</th>
                  <th className="py-2 pr-3 text-right">รวม</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l) => (
                  <tr key={l.line_id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{l.name_snapshot}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.sku_snapshot}
                        {l.package_sku_snapshot ? ` · ${l.package_sku_snapshot}` : ""}
                      </p>
                    </td>
                    <td className="py-2 pr-3">
                      <Chip tone={l.line_type === "commission" ? "warn" : "muted"}>
                        {l.line_type === "commission"
                          ? `คอม ${pctLabel(l.commission_rate_snapshot)}`
                          : l.billing === "monthly"
                            ? "รายเดือน"
                            : "ครั้งเดียว"}
                      </Chip>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{l.quantity}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{thb(l.unit_price_snapshot)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{thb(l.amount)}</td>
                    <td className="py-2 text-right">
                      {!locked && (
                        <Button size="icon" variant="ghost" onClick={() => remove(l)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!quote.lines.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex">
            <TotalsBlock totals={quote.totals} whtNote={customer?.type === "juristic" ? "นิติบุคคล" : undefined} />
          </div>
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel title="สถานะเอกสาร" subtitle="R5 · Approve แล้วล็อกทันที">
          {locked ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                อนุมัติเมื่อ {fmtDate(quote.approved_at)} โดย {quote.approved_by ?? "—"}
              </p>
              {quote.superseded_by && (
                <p className="text-xs">
                  ถูกแทนที่ด้วย{" "}
                  <Link
                    to="/bd/quotations/$quoteId"
                    params={{ quoteId: quote.superseded_by }}
                    className="font-semibold text-primary underline"
                  >
                    {quote.superseded_by}
                  </Link>
                </p>
              )}
              {quote.status === "approved" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const id = reviseQuote(quote.quote_id);
                    toast.success(`สร้างฉบับแก้ไข ${id}`);
                  }}
                >
                  สร้างฉบับแก้ไข (Revise)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {issues.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-destructive/8 p-3 text-xs text-destructive">
                  {issues.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    patchQuote(quote.quote_id, { status: "sent" });
                    toast.success("ส่งใบเสนอราคาให้ลูกค้าแล้ว (จำลอง)");
                  }}
                  disabled={!quote.lines.length}
                >
                  ส่งให้ลูกค้า
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  disabled={issues.length > 0}
                  onClick={() => {
                    approveQuote(quote.quote_id);
                    toast.success("อนุมัติแล้ว — ข้อมูลถูก snapshot และล็อก");
                  }}
                >
                  <Check className="size-4" /> Approve
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="พรีวิวเอกสาร" subtitle="รูปแบบใบเสนอราคาที่ลูกค้าเห็น">
          <div className="rounded-lg border bg-card p-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-sm font-bold">HotelPlus Co., Ltd.</p>
                <p className="text-muted-foreground">ใบเสนอราคา / Quotation</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{quote.quote_id}</p>
                <p className="text-muted-foreground">{fmtDate(quote.created_at)}</p>
              </div>
            </div>
            <div className="mt-3 border-t pt-3">
              <PartyBlock snapshot={quote.customer_snapshot} />
            </div>
            <div className="mt-3 space-y-1 border-t pt-3">
              {quote.lines.map((l) => (
                <div key={l.line_id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {l.name_snapshot} × {l.quantity}
                  </span>
                  <span className="tabular-nums">{thb(l.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3">
              <TotalsBlock totals={quote.totals} />
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
