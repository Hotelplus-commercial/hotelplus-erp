import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileSignature } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, PartyBlock, Panel, TotalsBlock, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activeVersion, groupLinesByTemplate, thb } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";
import type { Contract } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/contract-wizard/classic")({
  head: () => ({
    meta: [
      { title: "Wizard (classic) — สร้างสัญญาจากใบเสนอราคา | PS App" },
      { name: "description", content: "แปลงใบเสนอราคาที่อนุมัติแล้วเป็นสัญญาตามเทมเพลต 5 ขั้นตอน" },
      { property: "og:title", content: "สร้างสัญญาจากใบเสนอราคา — PS App" },
      { property: "og:description", content: "Wizard 5 ขั้นตอน จากใบเสนอราคาสู่สัญญาและ Inquiry INV" },
    ],
  }),
  component: WizardPage,
});

const steps = ["เลือกใบเสนอราคา", "จับคู่เทมเพลต", "ข้อมูลสัญญา", "ตรวจทาน", "ส่ง Inquiry INV"];

function WizardPage() {
  const { quotations, templates, deals, contracts, addContracts, requestInv, newContractId } = useCrm();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [quoteId, setQuoteId] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("12");
  const [created, setCreated] = useState<Contract[]>([]);

  const approved = quotations.filter(
    (q) => q.status === "approved" && !contracts.some((c) => c.from_quote_id === q.quote_id),
  );
  const quote = quotations.find((q) => q.quote_id === quoteId) ?? null;
  const deal = deals.find((d) => d.pipedrive_deal_id === quote?.pipedrive_deal_id);
  const groups = useMemo(
    () => (quote ? groupLinesByTemplate(quote.lines, templates) : []),
    [quote, templates],
  );

  const build = () => {
    if (!quote?.customer_snapshot) return;
    let seq = 0;
    const base = newContractId();
    const stem = base.slice(0, base.length - 4);
    const startNo = Number(base.slice(-4));
    const list: Contract[] = groups.map((g) => {
      const version = g.template ? activeVersion(g.template) : null;
      const monthly = g.lines
        .filter((l) => l.billing === "monthly")
        .reduce((s, l) => s + (l.unit_price_snapshot ?? 0) * l.quantity, 0);
      const id = `${stem}${String(startNo + seq++).padStart(4, "0")}`;
      return {
        contract_id: id,
        from_quote_id: quote.quote_id,
        customer_snapshot: quote.customer_snapshot!,
        template_snapshot: {
          template_id: g.template?.template_id ?? "UNMAPPED",
          version: version?.version ?? "-",
          body_url: version?.body_url ?? "",
        },
        lines: g.lines.map((l) => ({
          line_id: l.line_id,
          sku_snapshot: l.sku_snapshot,
          name_snapshot: l.name_snapshot,
          package_snapshot: l.package_sku_snapshot,
          billing: l.billing,
          unit_price: l.unit_price_snapshot,
          commission_rate: l.commission_rate_snapshot,
          quantity: l.quantity,
        })),
        monthly_value: monthly,
        start_date: new Date(start).toISOString(),
        duration_months: Number(duration) || 12,
        status: "draft",
        case_number: null,
        signing_type: quote.customer_snapshot!.type,
        documents: [],
        live_link_signed_at: null,
        created_at: new Date().toISOString(),
        created_by: "ps.team@hotelplus.asia",
      };
    });
    addContracts(list);
    setCreated(list);
    setStep(4);
    toast.success(`สร้างสัญญา ${list.length} ฉบับ`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : i < step
                  ? "border-success/40 bg-success/10 text-success"
                  : "text-muted-foreground",
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-background/25 text-[10px]">
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Panel title="เลือกใบเสนอราคาที่อนุมัติแล้ว" subtitle="เฉพาะสถานะ Approved ที่ยังไม่มีสัญญา">
          <div className="space-y-3">
            {approved.map((q) => (
              <button
                key={q.quote_id}
                onClick={() => setQuoteId(q.quote_id)}
                className={cn(
                  "flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-left",
                  quoteId === q.quote_id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div>
                  <p className="font-semibold">{q.quote_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.customer_snapshot?.hotel_name} · {q.lines.length} รายการ · อนุมัติ {fmtDate(q.approved_at)}
                  </p>
                </div>
                <span className="tabular-nums font-medium">{thb(q.totals.total)}</span>
              </button>
            ))}
            {!approved.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ยังไม่มีใบเสนอราคาที่อนุมัติแล้วและรอสร้างสัญญา
              </p>
            )}
          </div>
          <Button className="mt-4" disabled={!quote} onClick={() => setStep(1)}>
            ถัดไป
          </Button>
        </Panel>
      )}

      {step === 1 && quote && (
        <Panel title="จับคู่เทมเพลตสัญญา" subtitle="1 เทมเพลต = 1 สัญญา (แยกฉบับอัตโนมัติ)">
          <div className="space-y-3">
            {groups.map((g, i) => (
              <div key={i} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{g.template?.name ?? "ยังไม่มีเทมเพลตที่จับคู่"}</p>
                  <Chip tone={g.template ? "info" : "danger"}>
                    {g.template ? `v${activeVersion(g.template).version}` : "UNMAPPED"}
                  </Chip>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {g.lines.map((l) => (
                    <li key={l.line_id}>
                      • {l.sku_snapshot} — {l.name_snapshot} ({thb(l.unit_price_snapshot)})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              ย้อนกลับ
            </Button>
            <Button onClick={() => setStep(2)}>ถัดไป</Button>
          </div>
        </Panel>
      )}

      {step === 2 && quote && (
        <Panel title="ข้อมูลสัญญา" subtitle="ข้อมูลคู่สัญญา snapshot มาจากใบเสนอราคา แก้ไขไม่ได้">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-surface/40 p-3">
              <PartyBlock snapshot={quote.customer_snapshot} />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>วันเริ่มสัญญา</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ระยะเวลา (เดือน)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["3", "6", "12", "24"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} เดือน
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                ประเภทผู้ลงนาม: {quote.customer_snapshot?.type === "juristic" ? "นิติบุคคล" : "บุคคลธรรมดา"} ·{" "}
                {deal?.hotel_name}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              ย้อนกลับ
            </Button>
            <Button onClick={() => setStep(3)}>ถัดไป</Button>
          </div>
        </Panel>
      )}

      {step === 3 && quote && (
        <Panel title="ตรวจทานก่อนสร้างสัญญา" subtitle={`จะสร้าง ${groups.length} ฉบับ`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-2 text-sm">
              {groups.map((g, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="font-semibold">{g.template?.name ?? "UNMAPPED"}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.lines.map((l) => l.sku_snapshot).join(", ")} · เริ่ม {fmtDate(new Date(start).toISOString())} ·{" "}
                    {duration} เดือน
                  </p>
                </div>
              ))}
            </div>
            <TotalsBlock totals={quote.totals} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              ย้อนกลับ
            </Button>
            <Button className="gap-1.5" onClick={build}>
              <FileSignature className="size-4" /> สร้างสัญญา
            </Button>
          </div>
        </Panel>
      )}

      {step === 4 && (
        <Panel title="สัญญาถูกสร้างแล้ว" subtitle="ขั้นตอนสุดท้าย: ส่ง Inquiry INV ให้ทีมบัญชี (AC)">
          <ul className="space-y-2 text-sm">
            {created.map((c) => (
              <li key={c.contract_id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-semibold">{c.contract_id}</span>
                <span className="text-xs text-muted-foreground">
                  {c.template_snapshot.template_id} v{c.template_snapshot.version} · {thb(c.monthly_value)}/เดือน
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const caseNo = requestInv(created.map((c) => c.contract_id));
                toast.success(`ส่ง Inquiry INV แล้ว — เคส ${caseNo}`);
                navigate({ to: "/ps/contract-dashboard" });
              }}
            >
              ส่ง Inquiry INV ไปยัง AC
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/ps/contract-dashboard" })}>
              ไปหน้า Contract Dashboard
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
