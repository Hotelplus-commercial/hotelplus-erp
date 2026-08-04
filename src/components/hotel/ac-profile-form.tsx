import { Save } from "lucide-react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ContactFields, Field, Section } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contractorTypes, emptyContact, statusMeta } from "@/lib/hotel-profile";
import { hotelScore, hotelStatus, useHotelStore, type HotelProfile } from "@/lib/hotel-store";
import { cn } from "@/lib/utils";

export function AcProfileForm() {
  const { selected: h, patch } = useHotelStore();
  const set = (next: Partial<HotelProfile>) => patch(h.id, next);

  const status = hotelStatus(h);
  const sm = statusMeta[status];
  const { score, grade } = hotelScore(h);

  const save = () => {
    if (!h.code.trim() || !h.name.trim() || !h.contractorType) {
      toast.error("กรุณากรอก รหัสโรงแรม / ชื่อโรงแรม / ประเภทผู้ทำสัญญา");
      return;
    }
    set({ acSaved: true });
    toast.success(`AC App บันทึก Hotel Profile ${h.name} แล้ว`, {
      description: "PS App สามารถกรอกข้อมูลสัญญาได้แล้ว",
    });
  };

  return (
    <Section
      code="AC App"
      title="Hotel Profile"
      subtitle="กรอกโดยทีม Accounting · เมื่อบันทึกแล้ว PS App จึงจะกรอกข้อมูลสัญญาได้"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="รหัสโรงแรม">
          <Input value={h.code} onChange={(e) => set({ code: e.target.value })} maxLength={20} />
        </Field>
        <Field label="ชื่อโรงแรม">
          <Input
            value={h.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="เช่น Grand Marina Bangkok"
            maxLength={120}
          />
        </Field>
        <Field label="ประเภทผู้ทำสัญญา">
          <Select value={h.contractorType} onValueChange={(v) => set({ contractorType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภท" />
            </SelectTrigger>
            <SelectContent>
              {contractorTypes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="จำนวนเดือนที่ค้างชำระ" hint="ใช้ auto detect สถานะ (≥ 2 เดือน)">
          <Input
            type="number"
            min={0}
            max={24}
            value={h.overdueMonths}
            onChange={(e) => set({ overdueMonths: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="จำนวนครั้งที่ชำระล่าช้า (12 เดือน)" hint="ใช้คำนวณ Score การชำระเงิน">
          <Input
            type="number"
            min={0}
            max={24}
            value={h.latePayments}
            onChange={(e) => set({ latePayments: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field
          label="Status (auto detect)"
          hint="อ้างอิงจาก PS App (contract end / terminate) และ AC App (ค้างชำระ 2 เดือน)"
        >
          <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3">
            <span
              className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", sm.className)}
            >
              {sm.label}
            </span>
          </div>
        </Field>
      </div>

      <div className="mt-4 rounded-lg border bg-surface/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Score การชำระเงิน</span>
          <span className="font-display text-lg font-bold">
            {score} <span className="text-xs font-semibold text-muted-foreground">เกรด {grade}</span>
          </span>
        </div>
        <Progress value={score} className="mt-2 h-1.5" />
      </div>

      <div className="mt-5 space-y-3">
        <ContactFields
          title="ผู้ติดต่อหลัก"
          contact={h.mainContact}
          onChange={(next) => set({ mainContact: { ...h.mainContact, ...next } })}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">ผู้ติดต่ออื่นๆ ({h.otherContacts.length})</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ otherContacts: [...h.otherContacts, emptyContact()] })}
          >
            <Plus className="mr-1.5 size-4" />
            เพิ่มผู้ติดต่อ
          </Button>
        </div>
        {h.otherContacts.map((c, i) => (
          <ContactFields
            key={c.id}
            title={`ผู้ติดต่อ #${i + 1}`}
            contact={c}
            onChange={(next) =>
              set({
                otherContacts: h.otherContacts.map((x) => (x.id === c.id ? { ...x, ...next } : x)),
              })
            }
            onRemove={() => set({ otherContacts: h.otherContacts.filter((x) => x.id !== c.id) })}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {h.acSaved && (
          <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
            บันทึกแล้ว — ส่งต่อให้ PS App
          </span>
        )}
        <Button onClick={save}>
          <Save className="mr-2 size-4" />
          บันทึก Hotel Profile
        </Button>
      </div>
    </Section>
  );
}
