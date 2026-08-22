import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nextCustomerId } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";
import type { Customer, CustomerType } from "@/lib/crm-types";

export const Route = createFileRoute("/ac/customers")({
  head: () => ({
    meta: [
      { title: "Customer Master — AC App | Meridia Hotel ERP" },
      { name: "description", content: "ทะเบียนลูกค้า นิติบุคคล/บุคคลธรรมดา เลขผู้เสียภาษี และโรงแรมในเครือ" },
      { property: "og:title", content: "Customer Master — AC App" },
      { property: "og:description", content: "ทะเบียนลูกค้าและข้อมูลออกเอกสารภาษี" },
    ],
  }),
  component: CustomersPage,
});

const blank = (id: string): Customer => ({
  customer_id: id,
  legal_name: "",
  type: "juristic",
  tax_id: "",
  address: "",
  signer_name: "",
  contact_phone: "",
  contact_email: "",
  hotels: [],
  created_at: new Date().toISOString(),
});

function CustomersPage() {
  const { customers, contracts, upsertCustomer } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Customer>(() => blank("H00000"));

  const start = () => {
    setForm(blank(nextCustomerId(customers.map((c) => c.customer_id))));
    setOpen(true);
  };

  const set = (k: keyof Customer, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="ลูกค้าทั้งหมด" value={customers.length} />
        <Kpi label="นิติบุคคล" value={customers.filter((c) => c.type === "juristic").length} hint="หัก ณ ที่จ่าย 3%" />
        <Kpi label="บุคคลธรรมดา" value={customers.filter((c) => c.type === "individual").length} />
        <Kpi label="โรงแรมในเครือ" value={customers.reduce((s, c) => s + c.hotels.length, 0)} />
      </div>

      <Panel
        title="Customer Master"
        subtitle="ข้อมูลชุดนี้ถูก snapshot ลงใบเสนอราคา สัญญา และใบแจ้งหนี้"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5" onClick={start}>
                <Plus className="size-4" /> เพิ่มลูกค้า
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มลูกค้าใหม่ · {form.customer_id}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ชื่อตามกฎหมาย</Label>
                  <Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>ประเภท</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as CustomerType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juristic">นิติบุคคล</SelectItem>
                      <SelectItem value="individual">บุคคลธรรมดา</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>เลขประจำตัวผู้เสียภาษี</Label>
                  <Input value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ที่อยู่ออกใบกำกับภาษี</Label>
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>ผู้มีอำนาจลงนาม</Label>
                  <Input value={form.signer_name} onChange={(e) => set("signer_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>โทรศัพท์</Label>
                  <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>อีเมล</Label>
                  <Input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!form.legal_name.trim()) {
                      toast.error("กรุณาระบุชื่อลูกค้า");
                      return;
                    }
                    upsertCustomer(form);
                    setOpen(false);
                    toast.success(`บันทึกลูกค้า ${form.customer_id}`);
                  }}
                >
                  บันทึก
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">รหัส</th>
                <th className="py-2 pr-3">ชื่อตามกฎหมาย</th>
                <th className="py-2 pr-3">ประเภท</th>
                <th className="py-2 pr-3">เลขผู้เสียภาษี</th>
                <th className="py-2 pr-3">โรงแรม</th>
                <th className="py-2 pr-3 text-right">สัญญา</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.customer_id} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-xs">{c.customer_id}</td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{c.legal_name}</p>
                    <p className="text-xs text-muted-foreground">{c.contact_email}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Chip tone={c.type === "juristic" ? "info" : "muted"}>
                      {c.type === "juristic" ? "นิติบุคคล" : "บุคคลธรรมดา"}
                    </Chip>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{c.tax_id}</td>
                  <td className="py-2.5 pr-3 text-xs">{c.hotels.map((h) => h.name).join(", ") || "—"}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {contracts.filter((x) => x.customer_snapshot.customer_id === c.customer_id).length}
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
