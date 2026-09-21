/* PS App v2.3 · Fix 4 — Contract Wizard, 4 steps.
 * step 1 เลือกใบเสนอราคา · step 2 KYC · step 3 OCR · (processing overlay) · step 4 A4 preview + complete
 * The preview renders through the shared contract renderer (same module as PS-10) so the
 * operator preview and the admin QA preview can never drift. */
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, FileUp, Lock, RotateCcw, Wand2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { DurationStickyBar } from "@/components/ps/duration-sticky-bar";
import { WizardProcessingOverlay } from "@/components/ps/wizard-processing-overlay";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBd, type BdQuote } from "@/lib/bd-store";
import { CIFooter, CIHeader, CoverPage, renderBody } from "@/lib/contract-renderer";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { thb } from "@/lib/crm-rules";
import { usePsBlockGroups } from "@/lib/ps-block-groups";
import { findContractTemplateBySku, templateSku, usePsTemplates, type Template } from "@/lib/ps-templates";
import { canonicalSkuCode } from "@/lib/template-integrity";
import type { PreviewServiceLine } from "@/lib/template-preview-sample-data";
import { cn } from "@/lib/utils";

type CustomerType = "individual" | "juristic";

const STEPS = ["เลือกใบเสนอราคา", "อัปโหลดเอกสาร KYC", "ตรวจ OCR", "ตรวจทาน & Complete"];

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

export function ContractWizard({ dealId, preselectQuoteId }: { dealId: string; preselectQuoteId: string }) {
  const navigate = useNavigate();
  const { quotes, deals, hydrated, setWizardStep, cancelWizard, completeWizard, startWizard } = useBd();
  const { bankFor, isSystemAdmin, saveBank } = usePsBlockGroups();
  const { templates } = usePsTemplates();
  const { lifecycles, setStage } = useContractLifecycle();

  const deal = deals.find((d) => d.deal_id === dealId);
  const dealQuotes = quotes.filter(
    (q) => q.deal_id === dealId && ["approved", "contract_in_progress", "contract_generated"].includes(q.status),
  );

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const preselected = dealQuotes.find((q) => q.quote_id === preselectQuoteId);
  const [selected, setSelected] = useState<string[]>(
    preselected
      ? [preselected.quote_id]
      : dealQuotes.filter((q) => q.status !== "contract_generated").map((q) => q.quote_id),
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
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ contract_code: string; package_code: string } | null>(null);

  const picked = dealQuotes.filter((q) => selected.includes(q.quote_id));
  const contractTargets = useMemo(
    () =>
      picked.flatMap((quote) =>
        [...new Set((quote.approved_snapshot?.approved_skus ?? quote.skus).map((s) => canonicalSkuCode(s.sku_code)))]
          .map((sku) => ({ quote, sku, template: findContractTemplateBySku(templates, sku) }))
          .filter((target): target is { quote: BdQuote; sku: string; template: Template } => Boolean(target.template)),
      ),
    [picked, templates],
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
    toast.success("ยกเลิก Wizard · ใบเสนอราคากลับสถานะ approved · ไฟล์ KYC ถูกล้าง");
    navigate({ to: "/ps/contract-dashboard" });
  };

  const go = (next: number) => {
    setStep(next);
    picked.forEach((q) => {
      if (q.status === "approved") startWizard(q.quote_id);
      setWizardStep(q.quote_id, next);
    });
  };

  const runProcessing = () => {
    setTimedOut(false);
    setProcessing(true);
  };

  const complete = () => {
    const first = picked[0];
    if (!first) return;
    const months = durations[first.quote_id] ?? 12;
    const out = completeWizard(first.quote_id, months);
    picked.slice(1).forEach((q) => completeWizard(q.quote_id, durations[q.quote_id] ?? 12));
    picked.forEach((q) => {
      const lc = lifecycles.find((l) => l.quote_id === q.quote_id);
      if (lc && lc.current_stage < 2) setStage(lc.id, 2, { notes: "Wizard completed" });
    });
    setResult(out);
    toast.success(`สร้างสัญญาแล้ว · ${out?.contract_code} · ส่ง invoice inquiry ให้ AC App`);
  };

  return (
    <div className="space-y-4">
      {processing && (
        <WizardProcessingOverlay
          onDone={() => {
            setProcessing(false);
            go(4);
          }}
          onCancel={() => {
            setProcessing(false);
            cancelAll();
          }}
          onTimeout={() => {
            setProcessing(false);
            setTimedOut(true);
            go(4);
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="font-display text-lg font-semibold">
            🧙 Contract Wizard · {deal.hotel_name}{" "}
            <span className="text-sm font-normal text-muted-foreground">({deal.deal_id})</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Step {step} of 4 · Package v{deal.next_package_seq} · customer {deal.customer_id ?? "—"} / hotel{" "}
            {deal.hotel_id ?? "—"}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={cancelAll} disabled={!!result}>
          <X className="size-4" /> Cancel wizard
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
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
        <Panel
          title="Step 1 · เลือกใบเสนอราคา + ประเภทคู่สัญญา"
          subtitle="R19 · ทุกใบต้องอยู่ในดีลเดียวกัน · R13 · ประเภทคู่สัญญาล็อกหลังผ่านขั้นนี้"
        >
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
            <Select value={customerType ?? ""} onValueChange={(v) => setCustomerType(v as CustomerType)} disabled={typeLocked}>
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
                    <p className="text-xs text-muted-foreground">{files[d]?.length ? files[d].join(" · ") : "ยังไม่มีไฟล์"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={(files[d]?.length ?? 0) >= 5}
                    onClick={() =>
                      setFiles((prev) => ({ ...prev, [d]: [...(prev[d] ?? []), `${d}-${(prev[d]?.length ?? 0) + 1}.pdf`] }))
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
            <Button disabled={!ocr.legal_name || !ocr.tax_id} onClick={runProcessing}>
              ถัดไป
            </Button>
          </div>
        </Panel>
      )}

      {/* ---------- Step 4 · A4 continuous preview ---------- */}
      {step === 4 && (
        <div className="space-y-4">
          {timedOut ? (
            <Panel title="⚠️ Processing timed out" subtitle="ข้อมูลร่างยังอยู่ครบ · กดลองอีกครั้งเพื่อสร้างพรีวิวใหม่">
              <Button className="gap-1.5" onClick={runProcessing}>
                <RotateCcw className="size-4" /> ลองอีกครั้ง
              </Button>
            </Panel>
          ) : (
            <>
              <DurationStickyBar
                contracts={picked.map((q) => ({ id: q.quote_id, label: skuLabel(q) }))}
                values={durations}
                onChange={(id, months) => setDurations((prev) => ({ ...prev, [id]: months }))}
              />

              <div className="space-y-6">
                {contractTargets.map((target, i) => (
                  <div key={`${target.quote.quote_id}-${target.sku}`} className="space-y-3">
                    {contractTargets.length > 1 && (
                      <div className="rounded-lg bg-muted py-4 text-center text-sm font-bold">
                        ═══ Contract {i + 1} of {contractTargets.length} · {target.sku} ═══
                      </div>
                    )}
                    <ContractPaper
                      quote={target.quote}
                      sku={target.sku}
                      template={target.template}
                      months={durations[target.quote.quote_id] ?? 12}
                      ocr={ocr}
                      customerType={customerType ?? "juristic"}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <Panel title="สรุปค่าบริการ" subtitle="R21 · แก้ได้เฉพาะระยะเวลาสัญญา · ช่องอื่นมาจาก snapshot">
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">รายเดือน</dt>
              <dd className="tabular-nums">{thb(monthly)}</dd>
              <dt className="text-muted-foreground">ค่าติดตั้งครั้งเดียว</dt>
              <dd className="tabular-nums">{thb(onetime)}</dd>
              <dt className="text-muted-foreground">บัญชีรับชำระ (R22)</dt>
              <dd>{bankReady ? `${bank?.bank_name} · ${bank?.account_number} · ${bank?.account_name}` : "ยังไม่ตั้งค่า"}</dd>
            </dl>
          </Panel>

          {!bankReady && (
            <Panel
              title="⚠️ R23 · ต้องตั้งค่าบัญชีรับชำระก่อน Complete"
              subtitle={`ประเภทบัญชีที่ต้องใช้: ${customerType === "juristic" ? "company" : "personal"}`}
            >
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
              </ul>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm">
                  <Link to="/ps/contract-dashboard">ไปที่ Contract Dashboard</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/bd/quotes">กลับไป Quote Dashboard</Link>
                </Button>
              </div>
            </Panel>
          ) : (
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="ghost" onClick={cancelAll}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                ◀ ย้อนกลับ
              </Button>
              <Button
                className="gap-1.5 bg-[color:var(--ps,#7048A3)] text-white hover:opacity-90"
                disabled={!bankReady || timedOut}
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

/* ---------------- preview helpers ---------------- */

const skuLabel = (q: BdQuote) =>
  (q.approved_snapshot?.approved_skus ?? q.skus)[0]?.sku_code ?? q.type;

const serviceLineOfQuote = (q: BdQuote): PreviewServiceLine => (q.type === "MARCOM" ? "MARCOM" : "ORM");

function ContractPaper({
  quote,
  sku,
  template,
  months,
  ocr,
  customerType,
}: {
  quote: BdQuote;
  sku: string;
  template: Template;
  months: number;
  ocr: { legal_name: string; tax_id: string; address: string; signer_name: string; signer_name_en: string };
  customerType: CustomerType;
}) {
  const line = template.service_line ?? serviceLineOfQuote(quote);
  const code = quote.contract_codes?.[0] ?? `(ร่าง) ${quote.quote_id}`;
  const start = new Date();
  const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

  const approvedSkus = quote.approved_snapshot?.approved_skus ?? quote.skus;
  const skuEntry = approvedSkus.find((item) => canonicalSkuCode(item.sku_code) === sku) ?? approvedSkus[0];
  const data: Record<string, string> = {
    "hotel.name": quote.hotel_name,
    "customer.legal_name": ocr.legal_name,
    "customer.tax_id": ocr.tax_id,
    "customer.address": ocr.address,
    "customer.signer_name": ocr.signer_name,
    "customer.type": customerType === "juristic" ? "นิติบุคคล" : "บุคคลธรรมดา",
    "contract.code": code,
    "contract.duration_months": String(months),
    "contract.start_date": fmt(start),
    "contract.end_date": fmt(end),
    "contract.monthly_total": thb(quote.approved_snapshot?.approved_monthly_total ?? 0),
    "contract.onetime_total": thb(quote.approved_snapshot?.approved_onetime_total ?? 0),
    "contract.monthly_fee": thb(skuEntry?.monthly_price ?? quote.approved_snapshot?.approved_monthly_total ?? 0),
    "contract.setup_fee": thb(skuEntry?.onetime_price ?? quote.approved_snapshot?.approved_onetime_total ?? 0),
    "contract.commission_rate": skuEntry?.commission_rate ? `${Math.round(skuEntry.commission_rate * 100)}%` : "—",
    "sku.product_name": skuEntry?.product_name ?? sku,
    "sku.channel": sku.includes("META") ? "Meta" : sku.includes("TIKTOK") ? "TikTok" : sku.includes("GMB") ? "GMB / IBE" : "OTA",
    "sku.monthly_fee": thb(skuEntry?.monthly_price ?? quote.approved_snapshot?.approved_monthly_total ?? 0),
    "sku.setup_fee": thb(skuEntry?.onetime_price ?? quote.approved_snapshot?.approved_onetime_total ?? 0),
    "sku.commission_rate": skuEntry?.commission_rate ? `${Math.round(skuEntry.commission_rate * 100)}%` : "—",
    "quote.code": quote.quote_id,
    "hotelplus.authorized_signatory": "คุณณภัทร พ.",
    "hotelplus.bank_account": "ธนาคารกสิกรไทย · 123-4-56789-0",
  };

  const html = template.sections
    .map((section) => `<section class="a4-block"><h3 class="a4-block-title">${section.title}</h3>${section.content}</section>`)
    .join("");

  return (
    <div className="a4-canvas">
      <CoverPage serviceLine={line} contractCode={`${code} · ${templateSku(template) ?? sku}`} hotelName={quote.hotel_name} />
      <section className="a4-page a4-page--flow">
        <CIHeader serviceLine={line} />
        <div className="a4-body" dangerouslySetInnerHTML={{ __html: renderBody(html, data, { pills: false }) }} />
        <CIFooter />
      </section>
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
