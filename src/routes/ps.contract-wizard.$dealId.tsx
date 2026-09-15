import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AlertTriangle, Check, FileUp, Lock, Wand2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBd } from "@/lib/bd-store";
import { coverageOf, resolveVariants, usePsBlockGroups } from "@/lib/ps-block-groups";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/contract-wizard/$dealId")({
  component: DealWizard,
});

type CustomerType = "individual" | "juristic";

const STEPS = ["เลือกใบเสนอราคา", "อัปโหลดเอกสาร KYC", "ตรวจ OCR", "จับคู่เทมเพลต", "ตรวจทาน & Complete"];

const DOC_LABEL: Record<string, string> = {
  id_card: "บัตรประชาชนผู้ลงนาม",
  house_registration: "ทะเบียนบ้าน",
  company_certificate: "หนังสือรับรองบริษัท (ไม่เกิน 3 เดือน)",
  vat_registration: "ภ.พ.20",
  book_bank: "สำเนาบัญชีธนาคาร (ORM)",
};

/* R14 · required docs by customer type · book bank when any ORM SKU */
const requiredDocs = (type: CustomerType, hasOrm: boolean) => [
  ...(type === "individual" ? ["id_card", "house_registration"] : ["company_certificate", "vat_registration", "id_card"]),
  ...(hasOrm ? ["book_bank"] : []),
];

function DealWizard() {
  const { dealId } = useParams({ from: "/ps/contract-wizard/$dealId" });
  const navigate = useNavigate();
  const { quotes, deals, hydrated, setWizardStep, cancelWizard, completeWizard, startWizard } = useBd();
  const { blockGroups, bankFor, isSystemAdmin, saveBank } = usePsBlockGroups();

  const deal = deals.find((d) => d.deal_id === dealId);
  const dealQuotes = quotes.filter(
    (q) => q.deal_id === dealId && ["approved", "contract_in_progress", "contract_generated"].includes(q.status),
  );

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>(
    dealQuotes.filter((q) => q.status !== "contract_generated").map((q) => q.quote_id),
  );
  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [typeLocked, setTypeLocked] = useState(false);
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [certAge, setCertAge] = useState("2");
  const [ocr, setOcr] = useState({
    legal_name: deal?.hotel_name ? `บริษัท ${deal.hotel_name} จำกัด` : "",
    tax_id: "0105561234567",
    address: "เลขที่ 99 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
    signer_name: deal?.contact_person.name ?? "",
    signer_name_en: "Mr. Contact Person",
  });
  const [duration, setDuration] = useState("12");
  const [result, setResult] = useState<{ contract_code: string; package_code: string } | null>(null);

  const picked = dealQuotes.filter((q) => selected.includes(q.quote_id));
  const skuCodes = useMemo(
    () => [...new Set(picked.flatMap((q) => (q.approved_snapshot?.approved_skus ?? q.skus).map((s) => s.sku_code)))],
    [picked],
  );
  const hasOrm = picked.some((q) => q.type === "ORM");
  const needed = customerType ? requiredDocs(customerType, hasOrm) : [];
  const missingDocs = needed.filter((d) => !(files[d]?.length ?? 0));
  const bank = customerType ? bankFor(customerType) : undefined;
  const bankReady = !!bank?.configured;

  if (!deal)
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {hydrated ? `ไม่พบดีล ${dealId}` : "กำลังโหลด…"}
      </p>
    );

  const monthly = picked.reduce((s, q) => s + (q.approved_snapshot?.approved_monthly_total ?? 0), 0);
  const onetime = picked.reduce((s, q) => s + (q.approved_snapshot?.approved_onetime_total ?? 0), 0);

  const cancelAll = () => {
    picked.forEach((q) => cancelWizard(q.quote_id));
    toast.success("ยกเลิก Wizard · ใบเสนอราคากลับสถานะ approved · ไฟล์ KYC ถูกล้าง (เก็บ 30 วัน)");
    navigate({ to: "/bd/quotes" });
  };

  const go = (next: number) => {
    setStep(next);
    picked.forEach((q) => {
      if (q.status === "approved") startWizard(q.quote_id);
      setWizardStep(q.quote_id, next);
    });
  };

  const complete = () => {
    const first = picked[0];
    if (!first) return;
    const out = completeWizard(first.quote_id, Number(duration));
    picked.slice(1).forEach((q) => completeWizard(q.quote_id, Number(duration)));
    setResult(out);
    toast.success(`สร้างสัญญาแล้ว · ${out?.contract_code} · ส่ง invoice inquiry ให้ AC App`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-semibold">
            🧙 Contract Wizard · {deal.hotel_name}{" "}
            <span className="text-sm font-normal text-muted-foreground">({deal.deal_id})</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Step {step} of 5 · Package v{deal.next_package_seq} · customer {deal.customer_id ?? "—"} / hotel{" "}
            {deal.hotel_id ?? "—"}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={cancelAll} disabled={!!result}>
          <X className="size-4" /> Cancel wizard
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              i + 1 === step
                ? "border-[color:var(--ps,#7048A3)] bg-[color:var(--ps,#7048A3)] text-white"
                : i + 1 < step
                  ? "border-success/40 bg-success/10 text-success"
                  : "text-muted-foreground",
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-background/25 text-[10px]">
              {i + 1 < step ? <Check className="size-3" /> : i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>

      {/* ---------- Step 1 ---------- */}
      {step === 1 && (
        <Panel title="Step 1 · เลือกใบเสนอราคา + ประเภทคู่สัญญา" subtitle="R19 · ทุกใบต้องอยู่ในดีลเดียวกัน · R13 · ประเภทคู่สัญญาล็อกหลังผ่านขั้นนี้">
          <div className="space-y-2">
            {dealQuotes.map((q) => (
              <label
                key={q.quote_id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm",
                  selected.includes(q.quote_id) && "border-primary bg-primary/5",
                  q.status === "contract_generated" && "opacity-50",
                )}
              >
                <Checkbox
                  checked={selected.includes(q.quote_id)}
                  disabled={q.status === "contract_generated"}
                  onCheckedChange={(v) =>
                    setSelected((prev) => (v ? [...new Set([...prev, q.quote_id])] : prev.filter((id) => id !== q.quote_id)))
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {q.quote_id} <Chip tone="info">{q.type}</Chip>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(q.approved_snapshot?.approved_skus ?? q.skus).length} SKU · อนุมัติ {fmtDate(q.approved_at)}
                  </p>
                </div>
                <span className="tabular-nums text-sm">{thb(q.approved_snapshot?.approved_first_month_total ?? 0)}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label>ประเภทคู่สัญญา (Party B)</Label>
            <Select
              value={customerType ?? ""}
              onValueChange={(v) => setCustomerType(v as CustomerType)}
              disabled={typeLocked}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">บุคคลธรรมดา</SelectItem>
                <SelectItem value="juristic">นิติบุคคล</SelectItem>
              </SelectContent>
            </Select>
            {typeLocked && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="size-3" /> ล็อกแล้ว (R13) — ถ้าต้องเปลี่ยนให้ยกเลิก Wizard แล้วเริ่มใหม่
              </p>
            )}
          </div>

          <Button
            className="mt-4"
            disabled={!selected.length || !customerType}
            onClick={() => {
              setTypeLocked(true);
              go(2);
            }}
          >
            ถัดไป
          </Button>
        </Panel>
      )}

      {/* ---------- Step 2 ---------- */}
      {step === 2 && customerType && (
        <Panel title="Step 2 · เอกสาร KYC" subtitle="R15 · PDF/JPG/PNG · ไม่เกิน 10MB · สูงสุด 5 ไฟล์ต่อประเภท">
          <div className="space-y-3">
            {needed.map((d) => (
              <div key={d} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{DOC_LABEL[d]}</p>
                    <p className="text-xs text-muted-foreground">
                      {files[d]?.length ? files[d].join(" · ") : "ยังไม่มีไฟล์"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={(files[d]?.length ?? 0) >= 5}
                    onClick={() =>
                      setFiles((prev) => ({
                        ...prev,
                        [d]: [...(prev[d] ?? []), `${d}-${(prev[d]?.length ?? 0) + 1}.pdf`],
                      }))
                    }
                  >
                    <FileUp className="size-4" /> อัปโหลด (จำลอง)
                  </Button>
                </div>
                {d === "company_certificate" && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Label className="text-xs">อายุหนังสือรับรอง (เดือน)</Label>
                    <Input value={certAge} onChange={(e) => setCertAge(e.target.value)} className="h-8 w-20" />
                    {Number(certAge) > 3 && (
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle className="size-3" /> R16 · เกิน 3 เดือน (เตือน ไม่บล็อก)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {missingDocs.length > 0 && (
            <p className="mt-3 rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] dark:bg-amber-950/20">
              ยังขาดเอกสาร: {missingDocs.map((d) => DOC_LABEL[d]).join(", ")}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              ย้อนกลับ
            </Button>
            <Button disabled={missingDocs.length > 0} onClick={() => go(3)}>
              ถัดไป
            </Button>
          </div>
        </Panel>
      )}

      {/* ---------- Step 3 ---------- */}
      {step === 3 && (
        <Panel title="Step 3 · ตรวจข้อมูลจาก OCR" subtitle="ค่าที่อ่านได้แก้ไขได้ · R17 · เตือนเมื่อเอกสารไม่ตรงประเภทคู่สัญญา">
          {customerType === "juristic" && !files["company_certificate"]?.length && (
            <p className="mb-3 flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] dark:bg-amber-950/20">
              <AlertTriangle className="size-3" /> ประเภทนิติบุคคลแต่ยังไม่มีหนังสือรับรองบริษัท (เตือน ไม่บล็อก)
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["legal_name", "ชื่อคู่สัญญา"],
                ["tax_id", "เลขผู้เสียภาษี / เลขบัตร"],
                ["signer_name", "ผู้ลงนาม (ไทย)"],
                ["signer_name_en", "ผู้ลงนาม (EN)"],
                ["address", "ที่อยู่"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={ocr[k]} onChange={(e) => setOcr((prev) => ({ ...prev, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              ย้อนกลับ
            </Button>
            <Button disabled={!ocr.legal_name || !ocr.tax_id} onClick={() => go(4)}>
              ถัดไป
            </Button>
          </div>
        </Panel>
      )}

      {/* ---------- Step 4 ---------- */}
      {step === 4 && (
        <Panel title="Step 4 · จับคู่เทมเพลต + Block group variants" subtitle="R9 · เลือก variant ตาม SKU · R10 · snapshot ตอนสร้างสัญญา">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {skuCodes.map((s) => (
              <code key={s} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {s}
              </code>
            ))}
          </div>
          <div className="space-y-3">
            {blockGroups.map((g) => {
              const variants = resolveVariants(g, skuCodes);
              const cov = coverageOf(g);
              return (
                <div key={g.block_group_id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      🧩 {g.block_group_label}{" "}
                      <span className="font-mono text-[11px] text-muted-foreground">{g.render_section}</span>
                    </p>
                    <div className="flex gap-1.5">
                      <Chip tone={g.render_once_per_contract ? "muted" : "info"}>
                        {g.render_once_per_contract ? "render once" : "per SKU"}
                      </Chip>
                      <Chip tone={cov.missing.length ? "warn" : "success"}>
                        {cov.covered}/{cov.total} SKUs
                      </Chip>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {variants.map((v) => (
                      <li key={v.block_id} className="rounded-lg bg-surface/60 p-2">
                        <span className="font-medium">{v.variant_label}</span>{" "}
                        {v.locked && <Chip tone="warn">locked</Chip>}
                        <p className="mt-1 whitespace-pre-line text-muted-foreground">{v.content}</p>
                      </li>
                    ))}
                    {!variants.length && <li className="text-warning">⚠️ ไม่มี variant ที่ตรงกับ SKU ที่เลือก</li>}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              ย้อนกลับ
            </Button>
            <Button onClick={() => go(5)}>ถัดไป</Button>
          </div>
        </Panel>
      )}

      {/* ---------- Step 5 ---------- */}
      {step === 5 && (
        <div className="space-y-4">
          <Panel title="Step 5 · ตรวจทานสัญญา" subtitle="R21 · แก้ได้เฉพาะระยะเวลาสัญญา · ช่องอื่นมาจาก snapshot">
            <details open className="rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">1 · คำนิยาม</summary>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                {resolveVariants(blockGroups.find((g) => g.block_group_id === "definitions")!, skuCodes).map((v) => (
                  <p key={v.block_id} className="whitespace-pre-line">
                    {v.content}
                  </p>
                ))}
              </div>
            </details>
            <details open className="mt-2 rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">2 · ระยะเวลาสัญญา</summary>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Label className="text-xs">ระยะเวลา</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["6", "12", "24"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} เดือน
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </details>
            <details className="mt-2 rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">3 · ค่าบริการ</summary>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">รายเดือน</dt>
                <dd className="tabular-nums">{thb(monthly)}</dd>
                <dt className="text-muted-foreground">ค่าติดตั้งครั้งเดียว</dt>
                <dd className="tabular-nums">{thb(onetime)}</dd>
                <dt className="text-muted-foreground">บัญชีรับชำระ (R22)</dt>
                <dd>
                  {bankReady
                    ? `${bank?.bank_name} · ${bank?.account_number} · ${bank?.account_name}`
                    : "ยังไม่ตั้งค่า"}
                </dd>
              </dl>
            </details>
            <details className="mt-2 rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">4 · การสิ้นสุดสัญญา</summary>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                {["owner_asset_termination_notice", "owner_asset_termination_list"].flatMap((id) =>
                  resolveVariants(blockGroups.find((g) => g.block_group_id === id)!, skuCodes).map((v) => (
                    <p key={v.block_id} className="whitespace-pre-line">
                      {v.content}
                    </p>
                  )),
                )}
              </div>
            </details>
            <details className="mt-2 rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">5 · คู่สัญญา</summary>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">ชื่อ</dt>
                <dd>{ocr.legal_name}</dd>
                <dt className="text-muted-foreground">เลขผู้เสียภาษี</dt>
                <dd>{ocr.tax_id}</dd>
                <dt className="text-muted-foreground">ประเภท</dt>
                <dd>{customerType === "juristic" ? "นิติบุคคล" : "บุคคลธรรมดา"}</dd>
                <dt className="text-muted-foreground">ผู้ลงนาม</dt>
                <dd>{ocr.signer_name}</dd>
              </dl>
            </details>
          </Panel>

          {!bankReady && (
            <Panel title="⚠️ R23 · ต้องตั้งค่าบัญชีรับชำระก่อน Complete" subtitle={`ประเภทบัญชีที่ต้องใช้: ${customerType === "juristic" ? "company" : "personal"}`}>
              {isSystemAdmin ? (
                <BankForm
                  accountType={customerType === "juristic" ? "company" : "personal"}
                  onSave={(v) => {
                    saveBank(v);
                    toast.success("บันทึกบัญชีรับชำระแล้ว");
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  ต้องให้ System Admin ตั้งค่าบัญชีนี้ก่อน — เปิดโหมด System Admin ได้ที่{" "}
                  <Link to="/ps/templates" className="text-primary underline">
                    หน้า Templates
                  </Link>
                </p>
              )}
            </Panel>
          )}

          {result ? (
            <Panel title="✅ สร้างสัญญาสำเร็จ" subtitle="ส่ง invoice inquiry ให้ AC App แล้ว (จำลอง)">
              <ul className="space-y-1 font-mono text-xs">
                <li>Contract: {result.contract_code}</li>
                <li>Package: {result.package_code}</li>
                <li>Duration: {duration} เดือน</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/bd/quotes">กลับไป Quote Dashboard</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/ps/contract-dashboard">Contract Dashboard</Link>
                </Button>
              </div>
            </Panel>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>
                ย้อนกลับ
              </Button>
              <Button
                className="gap-1.5 bg-[color:var(--ps,#7048A3)] text-white hover:opacity-90"
                disabled={!bankReady}
                onClick={complete}
              >
                <Wand2 className="size-4" /> Review & Complete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BankForm({
  accountType,
  onSave,
}: {
  accountType: "company" | "personal";
  onSave: (v: { account_type: "company" | "personal"; bank_name: string; account_name: string; account_number: string }) => void;
}) {
  const [bank_name, setBankName] = useState("");
  const [account_name, setAccountName] = useState("");
  const [account_number, setAccountNumber] = useState("");
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="text-xs">ธนาคาร</Label>
        <Input value={bank_name} onChange={(e) => setBankName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ชื่อบัญชี</Label>
        <Input value={account_name} onChange={(e) => setAccountName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">เลขที่บัญชี</Label>
        <Input value={account_number} onChange={(e) => setAccountNumber(e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <Button
          size="sm"
          disabled={!bank_name || !account_name || !account_number}
          onClick={() => onSave({ account_type: accountType, bank_name, account_name, account_number })}
        >
          บันทึกบัญชี
        </Button>
      </div>
    </div>
  );
}

export type { BdQuote };
