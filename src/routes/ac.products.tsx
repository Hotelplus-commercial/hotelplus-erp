import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pctLabel, thb } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";
import type { ServiceLine } from "@/lib/crm-types";

export const Route = createFileRoute("/ac/products")({
  head: () => ({
    meta: [
      { title: "Product Catalog — AC App | Meridia Hotel ERP" },
      { name: "description", content: "ทะเบียนสินค้าและบริการ ราคา แพ็กเกจ และกฎการขาย" },
      { property: "og:title", content: "Product Catalog — AC App" },
      { property: "og:description", content: "ทะเบียนสินค้า ราคา แพ็กเกจ และกฎการขาย" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products, toggleProduct, upsertProduct } = useCrm();
  const [q, setQ] = useState("");
  const [line, setLine] = useState<string>("all");

  const rows = products
    .filter((p) => (line === "all" ? true : p.service_line === line))
    .filter((p) => `${p.sku} ${p.name_th} ${p.name_en}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="สินค้าทั้งหมด" value={products.length} />
        <Kpi label="เปิดขาย" value={products.filter((p) => p.active).length} />
        <Kpi label="รายเดือน" value={products.filter((p) => p.billing === "monthly").length} />
        <Kpi label="ราคายัง TBD" value={products.filter((p) => p.pricing_model === "tbd").length} />
      </div>

      <Panel
        title="Product Catalog"
        subtitle="ราคาในใบเสนอราคาถูก snapshot — การแก้ราคาที่นี่ไม่กระทบเอกสารเดิม"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={line} onValueChange={setLine}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุก service line</SelectItem>
                {(["ORM", "MARCOM", "PROD", "PP"] as ServiceLine[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา SKU / ชื่อ"
              className="h-9 w-56"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">ชื่อสินค้า</th>
                <th className="py-2 pr-3">Line / หมวด</th>
                <th className="py-2 pr-3">การเรียกเก็บ</th>
                <th className="py-2 pr-3 text-right">ราคา</th>
                <th className="py-2 pr-3 text-right">คอม</th>
                <th className="py-2 pr-3">กฎ</th>
                <th className="py-2 pr-3 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.sku} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-xs">{p.sku}</td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{p.name_th}</p>
                    <p className="text-xs text-muted-foreground">{p.name_en}</p>
                    {p.packages.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {p.packages.length} แพ็กเกจ: {p.packages.map((x) => x.name).join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs">
                    {p.service_line} · {p.category}
                  </td>
                  <td className="py-2.5 pr-3 text-xs">{p.billing}</td>
                  <td className="py-2.5 pr-3 text-right">
                    <Input
                      className="ml-auto h-8 w-32 text-right"
                      defaultValue={p.base_price ?? ""}
                      placeholder="TBD"
                      inputMode="decimal"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const next = v === "" ? null : Number(v);
                        if (next === p.base_price) return;
                        upsertProduct({ ...p, base_price: Number.isNaN(next) ? null : next });
                        toast.success(`อัปเดตราคา ${p.sku} → ${thb(next)}`);
                      }}
                    />
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{pctLabel(p.commission_rate)}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {p.tier_group && <Chip tone="info">1 ใน {p.tier_group}</Chip>}
                    {p.parent_sku && <Chip tone="muted">ต้องมี {p.parent_sku}</Chip>}
                    {p.max_quantity != null && <Chip tone="warn">สูงสุด {p.max_quantity}</Chip>}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <Button size="sm" variant={p.active ? "outline" : "secondary"} onClick={() => toggleProduct(p.sku)}>
                      {p.active ? "เปิดขาย" : "ปิดขาย"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
