import { FileSignature, Lock, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ServiceEditor } from "@/components/hotel/service-editor";
import { DateField, Field, Section } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyContractTerm,
  emptyService,
  formatDate,
  terminateReasons,
  type ContractTerm,
  type ServiceBlock,
} from "@/lib/hotel-profile";
import { activeTermOf, contractRange, useHotelStore, type HotelProfile } from "@/lib/hotel-store";
import { cn } from "@/lib/utils";

export function PsContractForm() {
  const { selected: h, patch } = useHotelStore();
  const set = (next: Partial<HotelProfile>) => patch(h.id, next);

  const locked = !h.acSaved;
  const { index: activeIdx } = activeTermOf(h);
  const { start: contractStart } = contractRange(h);

  const patchTerm = (termId: string, next: Partial<ContractTerm>) =>
    set({ terms: h.terms.map((t) => (t.id === termId ? { ...t, ...next } : t)) });

  const patchService = (termId: string, serviceId: string, next: Partial<ServiceBlock>) =>
    set({
      terms: h.terms.map((t) =>
        t.id === termId
          ? { ...t, services: t.services.map((s) => (s.id === serviceId ? { ...s, ...next } : s)) }
          : t,
      ),
    });

  const save = () => {
    if (h.terms.some((t) => !t.start || !t.end)) {
      toast.error("กรุณาระบุ Contract Start / End ให้ครบทุกสัญญา");
      return;
    }
    if (
      h.terms.some((t) =>
        t.services.some((s) => s.periodEnd && t.end && s.periodEnd.getTime() > t.end.getTime()),
      )
    ) {
      toast.error("Period End ต้องไม่เกิน Contract End ของสัญญานั้น");
      return;
    }
    if (h.termination.active && (!h.termination.date || !h.termination.reason)) {
      toast.error("กรุณาระบุวันที่สิ้นสุดและสาเหตุการ Terminate");
      return;
    }
    set({ psSaved: true });
    toast.success(`PS App บันทึกสัญญาของ ${h.name} แล้ว`, {
      description: `${h.terms.length} สัญญา — ข้อมูลถูกส่งไปแสดงใน AC App`,
    });
  };

  return (
    <Section
      code="PS App"
      title="สัญญา & รูปแบบการให้บริการ"
      subtitle="กรอกโดยทีม Partner Success · เมื่อบันทึกแล้วข้อมูลจะไปแสดงใน AC App"
      disabled={locked}
    >
      {locked && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">ยังกรอกข้อมูลไม่ได้</p>
            <p className="text-xs text-muted-foreground">
              ต้องรอให้ AC App บันทึก Hotel Profile ของโรงแรมนี้ก่อน
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={locked} className="min-w-0 space-y-5">
        <div className="rounded-xl border bg-surface/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">ข้อมูลโรงแรม</p>
            <span className="font-mono text-[11px] text-muted-foreground">{h.code}</span>
            <span className="text-[11px] text-muted-foreground">
              {activeIdx ? `สัญญาที่ ${activeIdx} · Active` : "ยังไม่มีสัญญา active"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            รหัส / ชื่อโรงแรม / ประเภทผู้ทำสัญญา กรอกโดย AC App · PS App ระบุ Model, Registration และจำนวนห้อง
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ชื่อโรงแรม (จาก AC App)">
              <Input value={h.name} readOnly className="bg-muted/50" />
            </Field>
            <Field label="ประเภทผู้ทำสัญญา (จาก AC App)">
              <Input value={h.contractorType} readOnly className="bg-muted/50" />
            </Field>
            <Field label="จำนวนห้อง (Rooms)">
              <Input
                type="number"
                min={0}
                value={h.rooms}
                onChange={(e) => set({ rooms: e.target.value })}
                placeholder="เช่น 42"
              />
            </Field>
            <Field label="Model รูปแบบค่าบริการ">
              <Select
                value={h.model}
                onValueChange={(v) => set({ model: v as HotelProfile["model"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Registration การจดทะเบียน">
              <Select
                value={h.registration}
                onValueChange={(v) => set({ registration: v as HotelProfile["registration"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกการจดทะเบียน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">จำนวนสัญญา ({h.terms.length})</p>
            <p className="text-xs text-muted-foreground">
              {activeIdx
                ? `กำลังอยู่ในสัญญาที่ ${activeIdx} — Active`
                : "ยังไม่มีสัญญาที่ active ในวันนี้"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set({ terms: [...h.terms, emptyContractTerm(h.terms[h.terms.length - 1]?.services)] })
            }
          >
            <Plus className="mr-1.5 size-4" />
            ต่อสัญญา (ใช้รูปแบบปัจจุบันเป็น default)
          </Button>
        </div>

        <div className="space-y-4">
          {h.terms.map((t, ti) => {
            const isActive = activeIdx === ti + 1;
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border p-4",
                  isActive ? "border-primary/50 bg-primary/[0.04]" : "bg-surface/40",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">สัญญาที่ {ti + 1}</p>
                    {isActive && (
                      <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
                        Active
                      </span>
                    )}
                  </div>
                  {h.terms.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => set({ terms: h.terms.filter((x) => x.id !== t.id) })}
                      aria-label="ลบสัญญา"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DateField
                    label="Contract Start"
                    value={t.start}
                    onChange={(d) => patchTerm(t.id, { start: d })}
                    disabled={(d) => (t.end ? d > t.end : false)}
                  />
                  <DateField
                    label="Contract End"
                    value={t.end}
                    onChange={(d) => patchTerm(t.id, { end: d })}
                    disabled={(d) => (t.start ? d < t.start : false)}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">รูปแบบการให้บริการ</p>
                    <p className="text-xs text-muted-foreground">
                      Period ต้องไม่เกิน Contract End {t.end ? `(${formatDate(t.end)})` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => patchTerm(t.id, { services: [...t.services, emptyService()] })}
                  >
                    <Plus className="mr-1.5 size-4" />
                    Add บริการ
                  </Button>
                </div>

                <div className="mt-3 space-y-4">
                  {t.services.map((s, si) => (
                    <ServiceEditor
                      key={s.id}
                      service={s}
                      index={si}
                      contractStart={t.start}
                      contractEnd={t.end}
                      patch={(next) => patchService(t.id, s.id, next)}
                      onRemove={() =>
                        patchTerm(t.id, { services: t.services.filter((x) => x.id !== s.id) })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminate */}
        <div className="rounded-lg border bg-surface/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Terminate สัญญา</p>
              <p className="text-xs text-muted-foreground">
                ระบุวันที่สิ้นสุดสัญญา, terminate fee และสาเหตุ — ส่งสถานะให้ AC App
              </p>
            </div>
            <Switch
              checked={h.termination.active}
              onCheckedChange={(v) => set({ termination: { ...h.termination, active: v } })}
            />
          </div>

          {h.termination.active && (
            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <DateField
                label="วันที่สิ้นสุดสัญญา"
                value={h.termination.date}
                onChange={(d) => set({ termination: { ...h.termination, date: d } })}
                disabled={(d) => (contractStart ? d < contractStart : false)}
              />
              <Field label="Terminate fee (amount)">
                <Input
                  type="number"
                  min={0}
                  value={h.termination.fee}
                  onChange={(e) => set({ termination: { ...h.termination, fee: e.target.value } })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="สาเหตุที่ Terminate">
                <Select
                  value={h.termination.reason}
                  onValueChange={(v) => set({ termination: { ...h.termination, reason: v } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสาเหตุ" />
                  </SelectTrigger>
                  <SelectContent>
                    {terminateReasons.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="รายละเอียดเพิ่มเติม" className="sm:col-span-2 lg:col-span-3">
                <Textarea rows={2} placeholder="อธิบายรายละเอียดการ terminate" maxLength={500} />
              </Field>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {h.psSaved && (
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
              บันทึกแล้ว — ส่งต่อให้ AC App
            </span>
          )}
          <Button onClick={save}>
            <Save className="mr-2 size-4" />
            บันทึกสัญญา
          </Button>
        </div>
      </fieldset>
    </Section>
  );
}
