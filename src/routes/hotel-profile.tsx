import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarIcon, Plus, Trash2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp-ui";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  contractorTypes,
  detectStatus,
  emptyService,
  formatDate,
  marcomPlatforms,
  paymentScore,
  productionItems,
  serviceCategoryOptions,
  serviceTypeOptions,
  statusMeta,
  upsellItems,
  type ServiceBlock,
  type ServiceCategory,
} from "@/lib/hotel-profile";

const description =
  "สร้างโปรไฟล์โรงแรมใหม่ แบ่งการกรอกข้อมูลเป็นพาร์ท AC App และ PS App พร้อมผูกรูปแบบการให้บริการและค่าบริการ";

function Section({
  code,
  title,
  subtitle,
  children,
}: {
  code: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b bg-surface/60 px-4 py-3.5">
        <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-primary">
          {code}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value?: Date | undefined;
  onChange: (d?: Date | undefined) => void;
  disabled?: ((date: Date) => boolean) | undefined;
  hint?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0" />
            <span className="truncate">{value ? formatDate(value) : "เลือกวันที่"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function HotelProfilePage() {
  // AC App
  const [hotelCode, setHotelCode] = useState("HTL-0001");
  const [hotelName, setHotelName] = useState("");
  const [contractorType, setContractorType] = useState("");
  const [overdueMonths, setOverdueMonths] = useState(0);
  const [latePayments, setLatePayments] = useState(0);
  const [contact, setContact] = useState({
    fullName: "",
    nickname: "",
    position: "",
    phone: "",
    email: "",
  });

  // PS App
  const [contractStart, setContractStart] = useState<Date | undefined>();
  const [contractEnd, setContractEnd] = useState<Date | undefined>();
  const [terminated, setTerminated] = useState(false);
  const [services, setServices] = useState<ServiceBlock[]>([emptyService()]);

  const status = detectStatus({ contractEnd, terminated, overdueMonths });
  const { score, grade } = paymentScore(overdueMonths, latePayments);
  const sm = statusMeta[status];

  const patch = (id: string, next: Partial<ServiceBlock>) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const submit = () => {
    if (!hotelName.trim()) {
      toast.error("กรุณาระบุชื่อโรงแรม");
      return;
    }
    if (!contractStart || !contractEnd) {
      toast.error("กรุณาระบุ Contract Start / End");
      return;
    }
    const invalid = services.find(
      (s) => s.periodEnd && contractEnd && s.periodEnd.getTime() > contractEnd.getTime(),
    );
    if (invalid) {
      toast.error("Period End ต้องไม่เกิน Contract End");
      return;
    }
    toast.success(`บันทึกโปรไฟล์ ${hotelName} เรียบร้อย`, {
      description: `${services.length} รูปแบบการให้บริการ · สถานะ ${sm.label}`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Master data"
        title="Create hotel profile"
        description={description}
        actions={
          <Button onClick={submit}>
            <Save className="mr-2 size-4" />
            บันทึกโปรไฟล์
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="card-elevated grid gap-4 p-4 sm:grid-cols-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{hotelName || "ยังไม่ระบุชื่อโรงแรม"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{hotelCode}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status (auto)</p>
          <span
            className={cn(
              "mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              sm.className,
            )}
          >
            {sm.label}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Score การชำระเงิน</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-xl font-bold">{score}</span>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              เกรด {grade}
            </span>
          </div>
          <Progress value={score} className="mt-2 h-1.5" />
        </div>
      </div>

      {/* AC App */}
      <Section code="AC App" title="ข้อมูลสัญญา & การเงิน" subtitle="กรอกโดยทีม Accounting">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="รหัสโรงแรม">
            <Input value={hotelCode} onChange={(e) => setHotelCode(e.target.value)} maxLength={20} />
          </Field>
          <Field label="ชื่อโรงแรม">
            <Input
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="เช่น Grand Marina Bangkok"
              maxLength={120}
            />
          </Field>
          <Field label="ประเภทผู้ทำสัญญา">
            <Select value={contractorType} onValueChange={setContractorType}>
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
              value={overdueMonths}
              onChange={(e) => setOverdueMonths(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
          <Field label="จำนวนครั้งที่ชำระล่าช้า (12 เดือน)" hint="ใช้คำนวณ Score การชำระเงิน">
            <Input
              type="number"
              min={0}
              max={24}
              value={latePayments}
              onChange={(e) => setLatePayments(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
          <Field label="Status (auto detect)" hint="อ้างอิงจาก PS App (contract end / terminate) และ AC App (ค้างชำระ 2 เดือน)">
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3">
              <span className="truncate text-sm font-medium">{sm.label}</span>
            </div>
          </Field>
        </div>

        <div className="mt-5 rounded-lg border bg-surface/50 p-4">
          <p className="text-sm font-semibold">ผู้ติดต่อหลัก</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ชื่อ-สกุล">
              <Input
                value={contact.fullName}
                onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                maxLength={120}
              />
            </Field>
            <Field label="ชื่อเล่น">
              <Input
                value={contact.nickname}
                onChange={(e) => setContact({ ...contact, nickname: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="ตำแหน่ง">
              <Input
                value={contact.position}
                onChange={(e) => setContact({ ...contact, position: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label="โทรศัพท์">
              <Input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Field label="อีเมล์">
              <Input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                maxLength={255}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* PS App */}
      <Section code="PS App" title="สัญญา & รูปแบบการให้บริการ" subtitle="กรอกโดยทีม Property Services">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DateField
            label="Contract Start"
            value={contractStart}
            onChange={setContractStart}
            disabled={(d) => (contractEnd ? d > contractEnd : false)}
          />
          <DateField
            label="Contract End"
            value={contractEnd}
            onChange={setContractEnd}
            disabled={(d) => (contractStart ? d < contractStart : false)}
          />
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface/50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Terminate สัญญา</p>
              <p className="truncate text-[11px] text-muted-foreground">ส่งสถานะให้ AC App</p>
            </div>
            <Switch checked={terminated} onCheckedChange={setTerminated} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">รูปแบบการให้บริการ</p>
            <p className="text-xs text-muted-foreground">
              Period ต้องไม่เกิน Contract End {contractEnd ? `(${formatDate(contractEnd)})` : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setServices((p) => [...p, emptyService()])}
          >
            <Plus className="mr-1.5 size-4" />
            Add บริการ
          </Button>
        </div>

        <div className="mt-3 space-y-4">
          {services.map((s, idx) => (
            <div key={s.id} className="rounded-lg border bg-surface/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  บริการ #{idx + 1}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setServices((p) => p.filter((x) => x.id !== s.id))}
                  aria-label="ลบบริการ"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="หมวดหมู่การให้บริการ">
                  <Select
                    value={s.category}
                    onValueChange={(v) =>
                      patch(s.id, { category: v as ServiceCategory, serviceType: "" })
                    }
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
                    onValueChange={(v) => patch(s.id, { serviceType: v })}
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
                  onChange={(d) => patch(s.id, { periodStart: d })}
                  disabled={(d) =>
                    (contractStart ? d < contractStart : false) ||
                    (contractEnd ? d > contractEnd : false)
                  }
                />
                <DateField
                  label="Period End"
                  value={s.periodEnd}
                  onChange={(d) => patch(s.id, { periodEnd: d })}
                  disabled={(d) =>
                    (s.periodStart ? d < s.periodStart : false) ||
                    (contractEnd ? d > contractEnd : true)
                  }
                  hint={contractEnd ? undefined : "ระบุ Contract End ก่อน"}
                />
              </div>

              {/* Model ค่าบริการ */}
              {s.category === "orm" && (
                <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Monthly fee (amount)">
                    <Input
                      type="number"
                      min={0}
                      value={s.monthlyFee}
                      onChange={(e) => patch(s.id, { monthlyFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Commission (%)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={s.commission}
                      onChange={(e) => patch(s.id, { commission: e.target.value })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Guarantee">
                    <RadioGroup
                      value={s.guarantee}
                      onValueChange={(v) =>
                        patch(s.id, { guarantee: v as "yes" | "no", guaranteeAmount: "" })
                      }
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
                        onChange={(e) => patch(s.id, { guaranteeAmount: e.target.value })}
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
                                patch(s.id, {
                                  platforms: on
                                    ? s.platforms.filter((x) => x !== p)
                                    : [...s.platforms, p],
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
                        onChange={(e) => patch(s.id, { marcomFee: e.target.value })}
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
                          patch(s.id, {
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
                            patch(s.id, {
                              upsells: s.upsells.map((x) =>
                                x.id === u.id ? { ...x, ...next } : x,
                              ),
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
                                  (u.start ? d < u.start : false) ||
                                  (contractEnd ? d > contractEnd : true)
                                }
                              />
                              <div className="flex items-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    patch(s.id, {
                                      upsells: s.upsells.filter((x) => x.id !== u.id),
                                    })
                                  }
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
                    <Select
                      value={s.productionItem}
                      onValueChange={(v) => patch(s.id, { productionItem: v })}
                    >
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
                      onChange={(e) => patch(s.id, { productionAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end gap-2 pb-2">
        <Button variant="outline" onClick={() => setServices([emptyService()])}>
          ล้างรายการบริการ
        </Button>
        <Button onClick={submit}>
          <Save className="mr-2 size-4" />
          บันทึกโปรไฟล์
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/hotel-profile")({
  head: () => ({
    meta: [
      { title: "Create Hotel Profile | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "Create Hotel Profile | Meridia Hotel ERP" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HotelProfilePage,
});
