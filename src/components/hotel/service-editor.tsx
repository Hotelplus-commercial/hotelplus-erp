import { Plus, Trash2 } from "lucide-react";

import { DateField, Field } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  marcomPlatforms,
  productionItems,
  serviceCategoryOptions,
  serviceTypeOptions,
  upsellItems,
  type ServiceBlock,
  type ServiceCategory,
} from "@/lib/hotel-profile";

export function ServiceEditor({
  service: s,
  index,
  contractStart,
  contractEnd,
  patch,
  onRemove,
}: {
  service: ServiceBlock;
  index: number;
  contractStart?: Date | undefined;
  contractEnd?: Date | undefined;
  patch: (next: Partial<ServiceBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border bg-surface/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          บริการ #{index + 1}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="ลบบริการ"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="หมวดหมู่การให้บริการ">
          <Select
            value={s.category}
            onValueChange={(v) => patch({ category: v as ServiceCategory, serviceType: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              {serviceCategoryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="รูปแบบบริการ">
          <Select
            value={s.serviceType}
            onValueChange={(v) => patch({ serviceType: v })}
            disabled={!s.category}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกรูปแบบ" />
            </SelectTrigger>
            <SelectContent>
              {(s.category ? serviceTypeOptions[s.category] : []).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DateField
          label="Period Start"
          value={s.periodStart}
          onChange={(d) => patch({ periodStart: d })}
          disabled={(d) =>
            (contractStart ? d < contractStart : false) || (contractEnd ? d > contractEnd : false)
          }
        />
        <DateField
          label="Period End"
          value={s.periodEnd}
          onChange={(d) => patch({ periodEnd: d })}
          disabled={(d) =>
            (s.periodStart ? d < s.periodStart : false) || (contractEnd ? d > contractEnd : true)
          }
          hint={contractEnd ? undefined : "ระบุ Contract End ก่อน"}
        />
      </div>

      {s.category === "orm" && (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Monthly fee (amount)">
            <Input
              type="number"
              min={0}
              value={s.monthlyFee}
              onChange={(e) => patch({ monthlyFee: e.target.value })}
              placeholder="0.00"
            />
          </Field>
          <Field label="Commission (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={s.commission}
              onChange={(e) => patch({ commission: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Guarantee">
            <RadioGroup
              value={s.guarantee}
              onValueChange={(v) => patch({ guarantee: v as "yes" | "no", guaranteeAmount: "" })}
              className="flex h-9 items-center gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="yes" id={`${s.id}-g-yes`} /> Yes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="no" id={`${s.id}-g-no`} /> No
              </label>
            </RadioGroup>
          </Field>
          {s.guarantee === "yes" && (
            <Field label="Guarantee amount">
              <Input
                type="number"
                min={0}
                value={s.guaranteeAmount}
                onChange={(e) => patch({ guaranteeAmount: e.target.value })}
                placeholder="0.00"
              />
            </Field>
          )}
        </div>
      )}

      {s.category === "marcom" && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Package ตั้งต้น — Platform ที่ให้บริการ" hint="เลือกได้มากกว่า 1">
              <div className="flex flex-wrap gap-2">
                {marcomPlatforms.map((p) => {
                  const on = s.platforms.includes(p);
                  return (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() =>
                        patch({
                          platforms: on ? s.platforms.filter((x) => x !== p) : [...s.platforms, p],
                        })
                      }
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
            </Field>
            <Field label="อัตราค่าบริการ (amount)">
              <Input
                type="number"
                min={0}
                value={s.marcomFee}
                onChange={(e) => patch({ marcomFee: e.target.value })}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">รายการ upsell</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  patch({
                    upsells: [
                      ...s.upsells,
                      { id: crypto.randomUUID(), item: "", mode: "one-time" },
                    ],
                  })
                }
              >
                <Plus className="mr-1.5 size-4" />
                Add upsell
              </Button>
            </div>

            {s.upsells.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">ยังไม่มีรายการ upsell</p>
            ) : (
              <div className="mt-3 space-y-3">
                {s.upsells.map((u) => {
                  const setU = (next: Partial<typeof u>) =>
                    patch({
                      upsells: s.upsells.map((x) => (x.id === u.id ? { ...x, ...next } : x)),
                    });
                  return (
                    <div
                      key={u.id}
                      className="grid gap-3 rounded-md border bg-surface/50 p-3 sm:grid-cols-2 lg:grid-cols-5"
                    >
                      <Field label="รายการ">
                        <Select value={u.item} onValueChange={(v) => setU({ item: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกรายการ" />
                          </SelectTrigger>
                          <SelectContent>
                            {upsellItems.map((i) => (
                              <SelectItem key={i} value={i}>
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="รูปแบบการบริการ">
                        <Select
                          value={u.mode}
                          onValueChange={(v) => setU({ mode: v as "one-time" | "contract" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one-time">One-time</SelectItem>
                            <SelectItem value="contract">สัญญา</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <DateField
                        label="Start date"
                        value={u.start}
                        onChange={(d) => setU({ start: d })}
                        disabled={(d) => (contractEnd ? d > contractEnd : false)}
                      />
                      <DateField
                        label="End date"
                        value={u.end}
                        onChange={(d) => setU({ end: d })}
                        disabled={(d) =>
                          (u.start ? d < u.start : false) || (contractEnd ? d > contractEnd : true)
                        }
                      />
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => patch({ upsells: s.upsells.filter((x) => x.id !== u.id) })}
                        >
                          <Trash2 className="mr-1.5 size-4" />
                          ลบ
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {s.category === "production" && (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ระบุรายการ">
            <Select value={s.productionItem} onValueChange={(v) => patch({ productionItem: v })}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกรายการ" />
              </SelectTrigger>
              <SelectContent>
                {productionItems.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="อัตราค่าบริการ (amount)">
            <Input
              type="number"
              min={0}
              value={s.productionAmount}
              onChange={(e) => patch({ productionAmount: e.target.value })}
              placeholder="0.00"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
