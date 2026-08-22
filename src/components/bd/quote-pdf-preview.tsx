import { FileText, Maximize2 } from "lucide-react";
import { useState } from "react";

import { Chip } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { packageLabel, type BdQuote } from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

const fmt = (n: number | null | undefined) => (n == null ? "—" : thb(n));

/** Mock rendering of the exported quote PDF (real build swaps in the PDF renderer / pdf_url). */
export function QuotePdfDocument({ quote, compact }: { quote: BdQuote; compact?: boolean }) {
  const packages = quote.calculator_output.packages;
  const items = quote.calculator_output.selected_items ?? [];

  return (
    <article className="mx-auto w-full max-w-2xl bg-white text-[#2C2C2A] shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b-4 border-[#FFC426] px-6 py-4">
        <div>
          <p className="font-display text-lg font-extrabold tracking-tight">HOTEL PLUS</p>
          <p className="text-[11px] text-[#5F5E5A]">บริษัท พักดีพลัส จำกัด · info@hotelplus.asia</p>
        </div>
        <div className="text-right text-[11px]">
          <p className="font-semibold uppercase">Quotation</p>
          <p className="font-mono">{quote.quote_id}</p>
        </div>
      </header>

      <section className="grid gap-2 px-6 py-4 text-[12px] sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#5F5E5A]">เสนอราคาให้</p>
          <p className="font-semibold">{quote.hotel_name}</p>
          <p className="text-[#5F5E5A]">
            {quote.calculator_input.room_key ? `${quote.calculator_input.room_key} ห้อง` : "—"}
            {quote.calculator_input.occupancy ? ` · Occupancy ${quote.calculator_input.occupancy}%` : ""}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] uppercase tracking-wide text-[#5F5E5A]">ประเภท / ผู้เสนอ</p>
          <p className="font-semibold">{quote.type} · {packageLabel(quote)}</p>
          <p className="text-[#5F5E5A]">{quote.created_by}</p>
        </div>
      </section>

      <section className="px-6 pb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#5F5E5A]">
          {quote.type === "ORM" ? "Package comparison" : "รายการบริการ"}
        </p>

        {quote.type === "ORM" && packages ? (
          <div className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
            {Object.entries(packages).map(([key, pkg]) => (
              <div
                key={key}
                className={cn(
                  "rounded-lg border border-[#E5E3DB] p-3 text-[12px]",
                  quote.calculator_output.recommended_package === key && "border-[#FFC426] bg-[#FFF8E4]",
                )}
              >
                <p className="font-semibold capitalize">{key} Package</p>
                <p className="text-[#5F5E5A]">
                  {pkg.base_price ? `${fmt(pkg.base_price)}/เดือน` : "Commission only"}
                  {pkg.commission ? ` + ${Math.round(pkg.commission * 100)}%` : ""}
                </p>
                <ul className="mt-1 list-inside list-disc text-[11px] text-[#5F5E5A]">
                  {pkg.includes.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E3DB] text-left text-[10px] uppercase text-[#5F5E5A]">
                <th className="py-1">รายการ</th>
                <th className="py-1">รูปแบบ</th>
                <th className="py-1 text-right">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={`${i.package_name}-${idx}`} className="border-b border-[#F1EFE8]">
                  <td className="py-1.5">{i.package_name}</td>
                  <td className="py-1.5 text-[#5F5E5A]">{i.billing === "monthly" ? "รายเดือน" : "ครั้งเดียว"}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmt(i.amount)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-[#5F5E5A]">
                    ไม่มีรายการ (ตัวอย่างเอกสาร)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="mt-3 rounded-lg bg-[#F1EFE8] p-3 text-[12px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5F5E5A]">SKU ในเอกสารนี้</p>
          <ul className="mt-1 space-y-0.5">
            {quote.skus.map((s) => (
              <li key={s.sku_code} className="flex flex-wrap gap-2">
                <code className="font-mono text-[11px]">{s.sku_code}</code>
                <span>{s.product_name}</span>
                <span className="text-[#5F5E5A]">· {s.billing_summary}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-[#E5E3DB] px-6 py-3 text-[10px] text-[#5F5E5A]">
        <span>ใบเสนอราคานี้ยืนราคา 90 วัน</span>
        <span>หน้า 1 / 2</span>
      </footer>
    </article>
  );
}

/** Panel used in Quote Detail (left column, prominent). */
export function QuotePdfPanel({ quote }: { quote: BdQuote }) {
  const [full, setFull] = useState(false);
  const filename = `${quote.quote_id}.pdf`;

  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <h2 className="font-display text-base font-semibold">PDF Preview</h2>
          <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{filename}</code>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFull(true)}>
          <Maximize2 className="size-4" /> Full screen
        </Button>
      </div>

      <div className="max-h-[620px] overflow-y-auto bg-muted/40 p-4">
        <QuotePdfDocument quote={quote} />
        <p className="mt-3 text-center text-[11px] text-muted-foreground">⋮ หน้า 2 / 2 · เงื่อนไขการให้บริการ</p>
      </div>

      <p className="border-t bg-surface/60 px-4 py-2 text-[11px] text-muted-foreground">
        เอกสารที่ออกแล้วแก้ไม่ได้ · ถ้าต้องเปลี่ยนเนื้อหาให้ใช้ Create Revision
      </p>

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {filename} <Chip tone="muted">preview</Chip>
            </DialogTitle>
          </DialogHeader>
          <QuotePdfDocument quote={quote} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
