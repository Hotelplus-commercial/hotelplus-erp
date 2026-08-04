import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Save, Building2, Lock, FileSignature } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp-ui";
import { ContactFields, DateField, Field, Section } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  activeContractIndex,
  contractorTypes,
  detectStatus,
  emptyContact,
  emptyContractTerm,
  emptyService,
  emptySystemCost,
  formatDate,
  marcomPlatforms,
  monthLabels,
  paymentScore,
  productionItems,
  serviceCategoryOptions,
  serviceTypeOptions,
  statusMeta,
  systemOptions,
  terminateReasons,
  upsellItems,
  type Contact,
  type ContractTerm,
  type MonthlyPayStatus,
  type ServiceBlock,
  type ServiceCategory,
  type SystemCost,
  type Termination,
} from "@/lib/hotel-profile";

const description =
  "สร้างโปรไฟล์โรงแรมใหม่ แบ่งการกรอกข้อมูลเป็นพาร์ท AC App และ PS App พร้อมสัญญาหลายรอบ ผู้ติดต่อพร้อมสิทธิ์การเข้าถึง และต้นทุนค่าระบบ";

function ServiceEditor({
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

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

function HotelProfilePage() {
  /* ---------- AC App ---------- */
  const [hotelCode, setHotelCode] = useState("HTL-0001");
  const [hotelName, setHotelName] = useState("");
  const [contractorType, setContractorType] = useState("");
  const [overdueMonths, setOverdueMonths] = useState(0);
  const [latePayments, setLatePayments] = useState(0);
  const [mainContact, setMainContact] = useState<Contact>(emptyContact());

  /* ---------- PS App ---------- */
  const [terms, setTerms] = useState<ContractTerm[]>([emptyContractTerm()]);
  const [termination, setTermination] = useState<Termination>({
    active: false,
    fee: "",
    reason: "",
  });
  const [otherContacts, setOtherContacts] = useState<Contact[]>([]);

  /* ---------- System cost (PS + AC) ---------- */
  const [systemCost, setSystemCost] = useState<SystemCost>(emptySystemCost());

  // PS App is locked until AC App has started the hotel profile
  const acStarted = hotelName.trim().length > 0 && hotelCode.trim().length > 0 && !!contractorType;

  const activeIdx = activeContractIndex(terms);
  const activeTerm = activeIdx ? terms[activeIdx - 1] : terms[terms.length - 1];
  const contractStart = terms[0]?.start;
  const contractEnd = termination.active
    ? termination.date
    : terms[terms.length - 1]?.end;

  const status = detectStatus({
    contractEnd,
    terminated: termination.active,
    overdueMonths,
  });
  const { score, grade } = paymentScore(overdueMonths, latePayments);
  const sm = statusMeta[status];

  const avgMonthlyFee =
    (activeTerm?.services ?? []).reduce(
      (sum, s) => sum + (Number(s.monthlyFee) || 0) + (Number(s.marcomFee) || 0),
      0,
    ) || 0;

  const patchTerm = (termId: string, next: Partial<ContractTerm>) =>
    setTerms((prev) => prev.map((t) => (t.id === termId ? { ...t, ...next } : t)));

  const patchService = (termId: string, serviceId: string, next: Partial<ServiceBlock>) =>
    setTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? { ...t, services: t.services.map((s) => (s.id === serviceId ? { ...s, ...next } : s)) }
          : t,
      ),
    );

  const setPayment = (i: number, v: MonthlyPayStatus) =>
    setSystemCost((p) => ({
      ...p,
      payments: p.payments.map((x, idx) => (idx === i ? v : x)),
    }));

  const submit = () => {
    if (!acStarted) {
      toast.error("กรุณากรอกข้อมูล AC App (รหัส / ชื่อโรงแรม / ประเภทผู้ทำสัญญา) ก่อน");
      return;
    }
    const missing = terms.find((t) => !t.start || !t.end);
    if (missing) {
      toast.error("กรุณาระบุ Contract Start / End ให้ครบทุกสัญญา");
      return;
    }
    const invalid = terms.find((t) =>
      t.services.some((s) => s.periodEnd && t.end && s.periodEnd.getTime() > t.end.getTime()),
    );
    if (invalid) {
      toast.error("Period End ต้องไม่เกิน Contract End ของสัญญานั้น");
      return;
    }
    if (termination.active && (!termination.date || !termination.reason)) {
      toast.error("กรุณาระบุวันที่สิ้นสุดและสาเหตุการ Terminate");
      return;
    }
    toast.success(`บันทึกโปรไฟล์ ${hotelName} เรียบร้อย`, {
      description: `${terms.length} สัญญา · สถานะ ${sm.label}`,
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
      <div className="card-elevated grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-xs uppercase tracking-wide text-muted-foreground">สัญญาปัจจุบัน</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {activeIdx ? `สัญญาที่ ${activeIdx} / ${terms.length} (Active)` : "ยังไม่มีสัญญา active"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {activeTerm?.start && activeTerm.end
              ? `${formatDate(activeTerm.start)} — ${formatDate(activeTerm.end)}`
              : "ระบุช่วงสัญญาใน PS App"}
          </p>
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
          <Field
            label="Status (auto detect)"
            hint="อ้างอิงจาก PS App (contract end / terminate) และ AC App (ค้างชำระ 2 เดือน)"
          >
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3">
              <span className="truncate text-sm font-medium">{sm.label}</span>
            </div>
          </Field>
        </div>

        <div className="mt-5">
          <ContactFields
            title="ผู้ติดต่อหลัก"
            contact={mainContact}
            onChange={(next) => setMainContact({ ...mainContact, ...next })}
          />
        </div>
      </Section>

      {/* PS App */}
      <Section
        code="PS App"
        title="สัญญา & รูปแบบการให้บริการ"
        subtitle="กรอกโดยทีม Property Services"
        disabled={!acStarted}
      >
        {!acStarted && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">PS App ยังไม่สามารถกรอกข้อมูลได้</p>
              <p className="text-xs text-muted-foreground">
                ต้องให้ AC App เริ่มสร้าง Hotel Profile (รหัสโรงแรม, ชื่อโรงแรม, ประเภทผู้ทำสัญญา) ก่อน
              </p>
            </div>
          </div>
        )}

        <fieldset disabled={!acStarted} className="min-w-0 space-y-5">
          {/* Contract terms */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">จำนวนสัญญา ({terms.length})</p>
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
                setTerms((p) => [...p, emptyContractTerm(p[p.length - 1]?.services)])
              }
            >
              <Plus className="mr-1.5 size-4" />
              ต่อสัญญา (ใช้รูปแบบปัจจุบันเป็น default)
            </Button>
          </div>

          <div className="space-y-4">
            {terms.map((t, ti) => {
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
                    {terms.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setTerms((p) => p.filter((x) => x.id !== t.id))}
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
                checked={termination.active}
                onCheckedChange={(v) => setTermination({ ...termination, active: v })}
              />
            </div>

            {termination.active && (
              <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <DateField
                  label="วันที่สิ้นสุดสัญญา"
                  value={termination.date}
                  onChange={(d) => setTermination({ ...termination, date: d })}
                  disabled={(d) => (contractStart ? d < contractStart : false)}
                />
                <Field label="Terminate fee (amount)">
                  <Input
                    type="number"
                    min={0}
                    value={termination.fee}
                    onChange={(e) => setTermination({ ...termination, fee: e.target.value })}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="สาเหตุที่ Terminate">
                  <Select
                    value={termination.reason}
                    onValueChange={(v) => setTermination({ ...termination, reason: v })}
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
                  <Textarea
                    rows={2}
                    placeholder="อธิบายรายละเอียดการ terminate"
                    maxLength={500}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Other contacts */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">ผู้ติดต่ออื่นๆ ({otherContacts.length})</p>
                <p className="text-xs text-muted-foreground">
                  ระบุสิทธิ์ในการเข้าถึงของแต่ละผู้ติดต่อ
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOtherContacts((p) => [...p, emptyContact()])}
              >
                <Plus className="mr-1.5 size-4" />
                เพิ่มผู้ติดต่อ
              </Button>
            </div>
            {otherContacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีผู้ติดต่ออื่น</p>
            ) : (
              otherContacts.map((c, i) => (
                <ContactFields
                  key={c.id}
                  title={`ผู้ติดต่อ #${i + 1}`}
                  contact={c}
                  onChange={(next) =>
                    setOtherContacts((p) => p.map((x) => (x.id === c.id ? { ...x, ...next } : x)))
                  }
                  onRemove={() => setOtherContacts((p) => p.filter((x) => x.id !== c.id))}
                />
              ))
            )}
          </div>
        </fieldset>
      </Section>

      {/* System cost — shared PS / AC / Executive */}
      <Section
        code="PS · AC · EXEC"
        title="ต้นทุนค่าระบบ"
        subtitle="PS App ระบุระบบและผู้ชำระเงิน · AC App ระบุต้นทุนและสถานะการชำระรายเดือน"
        disabled={!acStarted}
      >
        <fieldset disabled={!acStarted} className="min-w-0 space-y-5">
          <div className="rounded-lg border bg-surface/50 p-4">
            <p className="text-sm font-semibold">ข้อมูลจาก PS App</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="ระบบ">
                <Select
                  value={systemCost.system}
                  onValueChange={(v) => setSystemCost({ ...systemCost, system: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระบบ" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="H+ เป็นผู้ชำระเงิน">
                <label className="flex h-9 items-center gap-2.5 rounded-md border bg-background px-3 text-sm">
                  <Checkbox
                    checked={systemCost.hplusPays}
                    onCheckedChange={(v) =>
                      setSystemCost({ ...systemCost, hplusPays: v === true })
                    }
                  />
                  {systemCost.hplusPays ? "Yes" : "No"}
                </label>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border bg-surface/50 p-4">
            <p className="text-sm font-semibold">ข้อมูลจาก AC App</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="ต้นทุนค่าระบบ / เดือน (amount)">
                <Input
                  type="number"
                  min={0}
                  value={systemCost.monthlyCost}
                  onChange={(e) => setSystemCost({ ...systemCost, monthlyCost: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">
              สถานะการชำระเงินรายเดือน
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {monthLabels.map((m, i) => {
                const v = systemCost.payments[i] ?? "na";
                const next: MonthlyPayStatus =
                  v === "na" ? "unpaid" : v === "unpaid" ? "paid" : "na";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(i, next)}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-2.5 py-2 text-xs font-medium transition-colors",
                      v === "paid" && "border-success/40 bg-success/12 text-success",
                      v === "unpaid" && "border-destructive/40 bg-destructive/10 text-destructive",
                      v === "na" && "text-muted-foreground",
                    )}
                  >
                    <span>{m}</span>
                    <span className="text-[10px] uppercase">
                      {v === "paid" ? "Paid" : v === "unpaid" ? "Unpaid" : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shared view */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-surface/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">โรงแรม</th>
                  <th className="px-3 py-2.5 text-left font-medium">Contract Start</th>
                  <th className="px-3 py-2.5 text-left font-medium">Contract End</th>
                  <th className="px-3 py-2.5 text-left font-medium">ระบบ</th>
                  <th className="px-3 py-2.5 text-right font-medium">ต้นทุนค่าระบบ / เดือน</th>
                  <th className="px-3 py-2.5 text-right font-medium">ค่าบริการรายเดือนเฉลี่ย (AC)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{hotelName || "—"}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{hotelCode}</p>
                  </td>
                  <td className="px-3 py-2.5">{contractStart ? formatDate(contractStart) : "—"}</td>
                  <td className="px-3 py-2.5">{contractEnd ? formatDate(contractEnd) : "—"}</td>
                  <td className="px-3 py-2.5">
                    {systemCost.system || "—"}
                    {systemCost.hplusPays && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        H+ pays
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {systemCost.monthlyCost ? money(Number(systemCost.monthlyCost)) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{money(avgMonthlyFee)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>
      </Section>

      <div className="flex justify-end gap-2 pb-2">
        <Button variant="outline" onClick={() => setTerms([emptyContractTerm()])}>
          ล้างรายการสัญญา
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
