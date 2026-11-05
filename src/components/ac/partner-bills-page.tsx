/* AC App Partner Bills v1.0 — page บิล Partner: system-cost card (AX4) · tab บิล (AX5–AX9) · tab Cashback (AX13)
 * · สัญญาที่ปิดระบบ list with ขอปิดระบบ (AX10). Reads Partner data via usePartnerData(); writes only with the AC writers
 * in debt-partner-store.ts. "AC only" = the testing role switcher on this page (simulation, not security). */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { psDemoOn, onDemoSessionChange, setPsDemoSession, DEMO_DAY, pageDateLabel } from "@/lib/demo-session";
import { billFileName, billFileRef, markBillPaid, recordCashbackReceipt, removeCashbackReceipt, isUiReceipt, saveBill, setPartnerDemo, storeBillFile, usePartnerData, voidBill } from "@/lib/debt-partner-store";
import type { PartnerBill, PartnerData } from "@/lib/debt-partner-types";
import { partnerContracts } from "@/lib/partner-contracts";
import { BILL_VIEW_TH, billCheck, billTiles, billView, byCurrency, cashbackBlocks, creditUsedOn, dealPeriodText, dmy, expectedLine, missingBillPartners, money, prefillLines, usableCredits, type BillLineDraft, type BillView } from "@/lib/partner-bills";
import { getContractSystemCost, type PartnerContract } from "@/lib/debt-partner-calc";
import { openPartnerFile } from "@/lib/partner-files";
import { setTicketDemo } from "@/lib/tickets-l0";
import { AC_DEMO, seedAcBillsDemo } from "@/lib/partner-shutoff-ac";
import { demoDebtRows } from "@/lib/debt-cards-demo";
import { liveDebtModel } from "@/components/ps/debt-cards-r11";
import { useCrmOptional } from "@/lib/crm-store";
import { ShutoffRequest } from "./shutoff-request";

export const PB = {
  title: "ค่าระบบ Partner",
  tip: "ค่าระบบที่ H+ จ่าย Partner (ไม่ใช่บิลค่าระบบที่เก็บจากโรงแรม) · AC บันทึกจากบิลของ Partner · ยอดที่ควรเป็นคำนวณจาก Rate Card ที่ PM บันทึก",
  question: "ค่าระบบงวดนี้ต้องจ่าย Partner เท่าไร จ่ายแล้วหรือยัง?",
} as const;
const ROLES = ["AC", "PM", "PS"] as const;
type PbRole = (typeof ROLES)[number];
const todayIso = (demo: boolean) => (demo ? DEMO_DAY : new Date().toISOString().slice(0, 10));
const amounts = (m: Record<string, number>) => { const e = byCurrency(m); if (!e.length) return "฿0"; const [first, ...rest] = e; return [money(first![1], first![0]), ...rest.map(([c, v]) => `+ ${money(v, c)}`)].join(" "); };
const VIEW_TONE: Record<BillView, string> = { PENDING: "bg-warning/15 text-warning-foreground", PAID: "bg-success/15 text-success", OVERDUE: "bg-destructive/15 text-destructive", VOID: "bg-muted text-muted-foreground" };

function usePageDemo() {
  const [demo, setDemo] = useState<boolean | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "1") setPsDemoSession(true); else if (q === "0") setPsDemoSession(false); // one shared DEMO state
    const read = () => setDemo(q === "1" || (q !== "0" && psDemoOn()));
    read(); return onDemoSessionChange(read);
  }, []);
  useEffect(() => {
    if (demo == null) return;
    setPartnerDemo(demo); setTicketDemo(demo); if (demo) seedAcBillsDemo();
  }, [demo]);
  return demo;
}

export function PartnerBillsPage() {
  const demo = usePageDemo();
  if (demo == null) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  return <PageBody demo={demo} />;
}

function PageBody({ demo }: { demo: boolean }) {
  const d = usePartnerData();
  const [role, setRole] = useState<PbRole>("AC");
  const canWrite = role === "AC";
  const today = todayIso(demo);
  const contracts = useMemo(() => partnerContracts(d, demo), [d, demo]);
  return (
    <div className="space-y-4" data-testid="ac-partner-bills">
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">ข้อมูลสาธิต · {pageDateLabel(true)} · ไม่บันทึก</div>}
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <label className="flex items-center gap-2"><span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
          <select aria-label="สวมบท" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as PbRole)}>
            {ROLES.map((r) => <option key={r} value={r}>สวมบท {r}</option>)}
          </select>
        </label>
        {!canWrite && <span className="text-xs text-muted-foreground" data-testid="pb-readonly">ดูอย่างเดียว · AC เป็นผู้บันทึก</span>}
      </div>
      <CostCard d={d} contracts={contracts} today={today} />
      <Tabs defaultValue="bills">
        <TabsList><TabsTrigger value="bills">บิล</TabsTrigger><TabsTrigger value="cashback">Cashback</TabsTrigger></TabsList>
        <TabsContent value="bills"><BillsTab d={d} contracts={contracts} today={today} canWrite={canWrite} /></TabsContent>
        <TabsContent value="cashback"><CashbackTab d={d} contracts={contracts} today={today} canWrite={canWrite} /></TabsContent>
      </Tabs>
      <SuspendedList demo={demo} d={d} contracts={contracts} today={today} canWrite={canWrite} />
    </div>
  );
}

/* ---------- §2.3 card ---------- */
function CostCard({ d, contracts, today }: { d: PartnerData; contracts: PartnerContract[]; today: string }) {
  const t = billTiles(d, today);
  const missing = missingBillPartners(d, contracts, today);
  const thb = (m: Record<string, number>) => m["THB"] ?? 0;
  const sum = thb(t.paid) + thb(t.pending) + thb(t.overdue);
  const pct = (v: number) => (sum ? `${(v / sum) * 100}%` : "0%");
  const other = byCurrency(t.total).filter(([c]) => c !== "THB");
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" data-testid="pb-card">
      <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{PB.title}</h2><Popover><PopoverTrigger className="text-muted-foreground" aria-label="คำอธิบาย">ⓘ</PopoverTrigger><PopoverContent className="text-xs">{PB.tip}</PopoverContent></Popover></div>
      <p className="text-sm text-muted-foreground">{PB.question}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {([["ยอดงวดนี้", t.total, ""], ["จ่ายแล้ว", t.paid, ""], ["รอจ่าย", t.pending, ""], ["เลยกำหนด", t.overdue, "text-destructive"]] as const).map(([l, m, tone]) => (
          <div key={l} className="rounded-lg border p-3" data-testid={`pb-tile-${l}`}><div className="text-xs text-muted-foreground">{l}</div><div className={cn("text-lg font-semibold tabular-nums", tone)}>{amounts(m)}</div></div>
        ))}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-label="สัดส่วนสถานะบิล (บาท)">
        <div className="bg-success" style={{ width: pct(thb(t.paid)) }} /><div className="bg-warning" style={{ width: pct(thb(t.pending)) }} /><div className="bg-destructive" style={{ width: pct(thb(t.overdue)) }} />
      </div>
      <p className="text-xs text-muted-foreground">จ่ายแล้ว · รอจ่าย · เลยกำหนด (คิดเป็นบาท){other.length ? ` · สกุลอื่นไม่รวมในแถบ: ${other.map(([c, v]) => money(v, c)).join(", ")}` : ""}</p>
      {missing.length > 0 && <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground" data-testid="pb-missing">ยังไม่มีบิลงวดนี้: {missing.join(", ")}</p>}
    </section>
  );
}

/* ---------- §2.4 tab บิล ---------- */
function BillsTab({ d, contracts, today, canWrite }: { d: PartnerData; contracts: PartnerContract[]; today: string; canWrite: boolean }) {
  const [partner, setPartner] = useState(""); const [status, setStatus] = useState<"" | BillView>(""); const [month, setMonth] = useState("");
  const [form, setForm] = useState<PartnerBill | "new" | null>(null);
  const [paying, setPaying] = useState<PartnerBill | null>(null);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const months = [...new Set(d.partner_bills.map((b) => b.bill_date.slice(0, 7)))].sort().reverse();
  const rows = [...d.partner_bills].filter((b) => (!partner || b.partner_id === partner) && (!status || billView(b, today) === status) && (!month || b.bill_date.startsWith(month)))
    .sort((a, b) => b.bill_date.localeCompare(a.bill_date) || a.bill_no.localeCompare(b.bill_no));
  const sel = "h-9 rounded-md border bg-background px-2 text-sm";
  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Partner" className={sel} value={partner} onChange={(e) => setPartner(e.target.value)}><option value="">ทุก Partner</option>{d.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="สถานะ" className={sel} value={status} onChange={(e) => setStatus(e.target.value as BillView | "")}><option value="">ทุกสถานะ</option>{(Object.keys(BILL_VIEW_TH) as BillView[]).map((s) => <option key={s} value={s}>{BILL_VIEW_TH[s]}</option>)}</select>
        <select aria-label="เดือน" className={sel} value={month} onChange={(e) => setMonth(e.target.value)}><option value="">ทุกเดือน</option>{months.map((m) => <option key={m} value={m}>{dmy(`${m}-01`).replace(/^\d+ /, "")}</option>)}</select>
        {canWrite && <Button size="sm" className="ml-auto" onClick={() => setForm("new")} data-testid="pb-new">+ บันทึกบิล Partner</Button>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm" data-testid="pb-table">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Partner", "เลขบิล", "งวด", "ยอดตามบิล", "ใช้เครดิต", "ครบกำหนด", "สถานะ", "ตรวจยอด", ""].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {!rows.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">ยังไม่มีบิล Partner</td></tr>}
            {rows.map((b) => {
              const v = billView(b, today); const credit = creditUsedOn(d, b.id); const diff = Math.round((b.total - b.expected_total) * 100) / 100;
              return (
                <tr key={b.id} className="border-t" data-testid={`pb-row-${b.bill_no}`}>
                  <td className="p-2">{pName(b.partner_id)}</td>
                  <td className="p-2 font-mono">{b.bill_no}</td>
                  <td className="whitespace-nowrap p-2">{dmy(b.period_start)} – {dmy(b.period_end)}</td>
                  <td className="p-2 tabular-nums">{money(b.total, b.currency)}</td>
                  <td className="p-2 tabular-nums">{credit ? `−${money(credit, b.currency)}` : "–"}</td>
                  <td className="whitespace-nowrap p-2">{dmy(b.due_date)}</td>
                  <td className="p-2"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", VIEW_TONE[v])} data-testid="pb-status">{BILL_VIEW_TH[v]}{v === "PAID" && b.paid_at ? ` ${dmy(b.paid_at)}` : ""}</span></td>
                  <td className="p-2" data-testid="pb-check">{Math.abs(diff) < 0.005 ? <span className="text-xs text-muted-foreground">ตรง</span> : <span className="text-xs font-medium text-warning-foreground">ไม่ตรง {money(Math.abs(diff), b.currency)}</span>}</td>
                  <td className="whitespace-nowrap p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setForm(b)}>เปิด</Button>
                    {canWrite && b.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => setPaying(b)} data-testid="pb-pay">บันทึกว่าจ่ายแล้ว</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {form && <BillForm key={form === "new" ? "new" : form.id} d={d} contracts={contracts} today={today} bill={form === "new" ? null : form} canWrite={canWrite} onClose={() => setForm(null)} />}
      {paying && <PayDialog bill={paying} today={today} onClose={() => setPaying(null)} />}
    </div>
  );
}

function PayDialog({ bill, today, onClose }: { bill: PartnerBill; today: string; onClose: () => void }) {
  const [at, setAt] = useState(today);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader><SheetTitle>บันทึกว่าจ่ายแล้ว · {bill.bill_no}</SheetTitle></SheetHeader>
        <div className="space-y-3 p-4 text-sm">
          <label className="block space-y-1"><span className="text-muted-foreground">วันที่จ่าย</span><Input type="date" aria-label="วันที่จ่าย" value={at} onChange={(e) => setAt(e.target.value)} /></label>
          <Button data-testid="pb-pay-confirm" onClick={() => { const r = markBillPaid(bill.id, at); if (!r.ok) { toast.error(r.error); return; } toast.success("บันทึกว่าจ่ายแล้ว"); onClose(); }}>ยืนยัน</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- §2.2 bill form ---------- */
type CreditRow = { credit_request_id: string; amount: string };
function BillForm({ d, contracts, today, bill, canWrite, onClose }: { d: PartnerData; contracts: PartnerContract[]; today: string; bill: PartnerBill | null; canWrite: boolean; onClose: () => void }) {
  const editable = canWrite && (!bill || bill.status === "PENDING");
  const rcCurrency = (pid: string) => d.partner_rate_cards.find((r) => r.partner_id === pid && r.superseded_at == null)?.currency ?? "THB";
  const [f, setF] = useState({ partner_id: bill?.partner_id ?? "", bill_no: bill?.bill_no ?? "", bill_date: bill?.bill_date ?? today, period_start: bill?.period_start ?? "", period_end: bill?.period_end ?? "", due_date: bill?.due_date ?? "", total: bill ? String(bill.total) : "", currency: bill?.currency ?? "THB", attachment_url: bill?.attachment_url ?? "", note: bill?.note ?? "" });
  const initialLines = (): BillLineDraft[] => {
    if (!bill) return [];
    return d.partner_bill_lines.filter((l) => l.bill_id === bill.id).map((l) => {
      const c = contracts.find((x) => x.contract_id === l.contract_id);
      const e = c ? expectedLine(d, c, bill.partner_id, bill.period_start, bill.period_end) : null;
      return { contract_id: l.contract_id, hotel: c?.hotel ?? l.contract_id, allotment: e?.allotment ?? null, expected: e?.expected ?? l.amount, amount: l.amount, currency: l.currency, fallback: e?.fallback ?? false };
    });
  };
  const [lines, setLines] = useState<BillLineDraft[]>(initialLines);
  const [credits, setCredits] = useState<CreditRow[]>(() => bill ? d.system_credit_usage.filter((u) => u.bill_id === bill.id).map((u) => ({ credit_request_id: u.credit_request_id, amount: String(u.amount) })) : []);
  const [add, setAdd] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const refill = (pid: string, s: string, e: string) => { if (!bill && pid && s && e) setLines(prefillLines(d, contracts, pid, s, e)); };
  const total = Number(f.total || 0);
  const chk = billCheck(lines, total);
  const cr = credits.reduce((s, c) => s + Number(c.amount || 0), 0);
  const usable = f.partner_id ? usableCredits(d, f.partner_id, f.bill_date || today, bill?.id) : [];
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const curMismatch = f.partner_id && f.currency !== rcCurrency(f.partner_id);
  const orm = contracts.filter((c) => c.service === "ORM" && !lines.some((l) => l.contract_id === c.contract_id));
  const input = () => ({
    ...(bill ? { id: bill.id } : {}), partner_id: f.partner_id, bill_no: f.bill_no, bill_date: f.bill_date, due_date: f.due_date, period_start: f.period_start, period_end: f.period_end,
    total, currency: f.currency, expected_total: chk.sumExpected, attachment_url: f.attachment_url, note: f.note,
    lines: lines.map((l) => ({ contract_id: l.contract_id, amount: l.amount })), credits: credits.map((c) => ({ credit_request_id: c.credit_request_id, amount: Number(c.amount || 0) })), by: "AC",
  });
  const save = (pay: boolean) => {
    const r = saveBill(input()); if (!r.ok) { toast.error(r.error); return; }
    if (pay) { const p = markBillPaid(r.id, paidAt); if (!p.ok) { toast.error(p.error); return; } }
    toast.success(pay ? "บันทึกบิลและบันทึกว่าจ่ายแล้ว" : "บันทึกบิลแล้ว"); onClose();
  };
  const lbl = "block space-y-1 text-sm"; const cap = "text-xs text-muted-foreground";
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl" data-testid="pb-form">
        <SheetHeader><SheetTitle>{bill ? `บิล ${bill.bill_no}` : "บันทึกบิล Partner"}{bill && ` · ${BILL_VIEW_TH[billView(bill, today)]}`}</SheetTitle></SheetHeader>
        <fieldset disabled={!editable} className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={lbl}><span className={cap}>Partner</span>
              <select aria-label="Partner ของบิล" className="h-9 w-full rounded-md border bg-background px-2" value={f.partner_id} onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, partner_id: v, currency: rcCurrency(v) })); refill(v, f.period_start, f.period_end); }}>
                <option value="">— เลือก —</option>{d.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <label className={lbl}><span className={cap}>เลขบิล</span><Input aria-label="เลขบิล" value={f.bill_no} onChange={(e) => set("bill_no", e.target.value)} /></label>
            <label className={lbl}><span className={cap}>วันที่บิล</span><Input type="date" aria-label="วันที่บิล" value={f.bill_date} onChange={(e) => set("bill_date", e.target.value)} /></label>
            <label className={lbl}><span className={cap}>งวด เริ่ม</span><Input type="date" aria-label="งวด เริ่ม" value={f.period_start} onChange={(e) => { set("period_start", e.target.value); refill(f.partner_id, e.target.value, f.period_end); }} /></label>
            <label className={lbl}><span className={cap}>งวด สิ้นสุด</span><Input type="date" aria-label="งวด สิ้นสุด" value={f.period_end} onChange={(e) => { set("period_end", e.target.value); refill(f.partner_id, f.period_start, e.target.value); }} /></label>
            <label className={lbl}><span className={cap}>ครบกำหนดจ่าย</span><Input type="date" aria-label="ครบกำหนดจ่าย" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></label>
            <label className={lbl}><span className={cap}>ยอดรวมตามบิล</span><Input inputMode="decimal" aria-label="ยอดรวมตามบิล" value={f.total} onChange={(e) => set("total", e.target.value.replace(/[^\d.]/g, ""))} /></label>
            <label className={lbl}><span className={cap}>สกุลเงิน</span><Input aria-label="สกุลเงิน" value={f.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></label>
            <div className={lbl}><span className={cap}>ไฟล์แนบ (PDF / อีเมล)</span>
              {f.attachment_url ? (
                <div className="flex items-center gap-2 text-xs">
                  <button type="button" className="truncate text-primary underline" onClick={async () => { const ref = billFileRef(f.attachment_url); if (ref) { if (!(await openPartnerFile(ref))) toast.error("เปิดไฟล์ไม่ได้ · ไฟล์อยู่ในเครื่องที่อัปโหลดเท่านั้น"); } else window.open(f.attachment_url, "_blank", "noopener,noreferrer"); }}>{billFileName(f.attachment_url)}</button>
                  {billFileRef(f.attachment_url) && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground">รอส่งเข้าที่เก็บ</span>}
                  {editable && <button type="button" className="text-muted-foreground underline" onClick={() => set("attachment_url", "")}>ลบ</button>}
                </div>
              ) : (
                <div className="flex gap-1">
                  <Input type="file" aria-label="อัปโหลดไฟล์แนบ" className="text-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const r = await storeBillFile(file); if (!r.ok) toast.error(r.error); else set("attachment_url", r.url); }} />
                  <Input aria-label="ลิงก์ไฟล์แนบ" placeholder="หรือวางลิงก์ https://" onBlur={(e) => e.target.value && set("attachment_url", e.target.value.trim())} />
                </div>
              )}
            </div>
          </div>
          {curMismatch && <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">สกุลเงินไม่ตรงกับ Rate Card ({rcCurrency(f.partner_id)}) · บันทึกได้</p>}
          <label className={lbl}><span className={cap}>หมายเหตุ</span><Input aria-label="หมายเหตุบิล" value={f.note} onChange={(e) => set("note", e.target.value)} /></label>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">รายการตามสัญญา ({lines.length})</h3>
            {!lines.length && <p className="text-xs text-muted-foreground">เลือก Partner และงวด ระบบจะเติมสัญญา ORM ที่ใช้ระบบของ Partner นี้ในงวดให้</p>}
            {lines.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <table className="w-full text-xs" data-testid="pb-lines">
                  <thead className="sticky top-0 bg-muted text-left text-muted-foreground"><tr><th className="p-1.5">สัญญา</th><th className="p-1.5">โรงแรม</th><th className="p-1.5">allotment</th><th className="p-1.5 text-right">ยอดที่ควรเป็น</th><th className="p-1.5 text-right">ยอดตามบิล</th><th /></tr></thead>
                  <tbody>
                    {lines.map((l, k) => (
                      <tr key={l.contract_id} className={cn("border-t", Math.abs(l.amount - l.expected) > 0.005 && "bg-warning/10")}>
                        <td className="p-1.5 font-mono">{l.contract_id}</td><td className="p-1.5">{l.hotel}</td>
                        <td className="p-1.5">{l.allotment ?? <span className="text-warning-foreground">ยังไม่ระบุ</span>}</td>
                        <td className="p-1.5 text-right tabular-nums">{money(l.expected, f.currency)}</td>
                        <td className="p-1.5 text-right"><Input aria-label={`ยอดตามบิล ${l.contract_id}`} className="h-7 w-28 text-right text-xs" inputMode="decimal" value={String(l.amount)} onChange={(e) => { const v = Number(e.target.value.replace(/[^\d.]/g, "") || 0); setLines((x) => x.map((y, j) => (j === k ? { ...y, amount: v } : y))); }} /></td>
                        <td className="p-1.5"><button type="button" aria-label={`ลบ ${l.contract_id}`} className="text-muted-foreground hover:text-destructive" onClick={() => setLines((x) => x.filter((_, j) => j !== k))}>ลบ</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {editable && (
              <div className="flex gap-2">
                <select aria-label="เพิ่มสัญญา" className="h-8 rounded-md border bg-background px-2 text-xs" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">— เลือกสัญญา ORM —</option>{orm.map((c) => <option key={c.contract_id} value={c.contract_id}>{c.hotel} · {c.contract_id}</option>)}</select>
                <Button type="button" size="sm" variant="outline" disabled={!add} onClick={() => {
                  const c = contracts.find((x) => x.contract_id === add); if (!c) return;
                  const e = f.partner_id && f.period_start && f.period_end ? expectedLine(d, c, f.partner_id, f.period_start, f.period_end) : null;
                  const cost = getContractSystemCost(d, c, f.period_start || today);
                  setLines((x) => [...x, e ?? { contract_id: c.contract_id, hotel: c.hotel, allotment: c.allotment, expected: 0, amount: 0, currency: cost?.currency ?? f.currency, fallback: false }]); setAdd("");
                }}>+ เพิ่มสัญญา</Button>
              </div>
            )}
            {lines.length > 0 && !chk.ok && (
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground" data-testid="pb-mismatch">
                ยอดไม่ตรงกับที่ควรเป็น {money(Math.abs(chk.diff), f.currency)} (ตามบิล {money(total, f.currency)} · ควรเป็น {money(chk.sumExpected, f.currency)} · รวมรายการ {money(chk.sumLines, f.currency)})
                {chk.differing.length > 0 && <ul className="mt-1 list-disc pl-4">{chk.differing.map((l) => <li key={l.contract_id}>{l.contract_id}: ตามบิล {money(l.amount, f.currency)} · ควรเป็น {money(l.expected, f.currency)}</li>)}</ul>}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">ใช้เครดิต</h3>
            {credits.map((c, k) => (
              <div key={k} className="flex flex-wrap items-center gap-2 text-xs">
                <select aria-label="เครดิต" className="h-8 rounded-md border bg-background px-2" value={c.credit_request_id} onChange={(e) => setCredits((x) => x.map((y, j) => (j === k ? { ...y, credit_request_id: e.target.value } : y)))}>
                  <option value="">— เลือกเครดิต —</option>
                  {usable.map((u) => <option key={u.req.id} value={u.req.id}>{contracts.find((x) => x.contract_id === u.req.contract_id)?.hotel ?? u.req.contract_id} · คงเหลือ {money(u.remaining, u.req.currency)} · ใช้ได้ถึง {dmy(u.req.credit_expires_at)}</option>)}
                </select>
                <Input aria-label="ยอดเครดิตที่ใช้" className="h-8 w-28 text-xs" inputMode="decimal" value={c.amount} onChange={(e) => setCredits((x) => x.map((y, j) => (j === k ? { ...y, amount: e.target.value.replace(/[^\d.]/g, "") } : y)))} />
                <button type="button" className="text-muted-foreground underline" onClick={() => setCredits((x) => x.filter((_, j) => j !== k))}>ลบ</button>
              </div>
            ))}
            {editable && <Button type="button" size="sm" variant="outline" disabled={!usable.length} onClick={() => setCredits((x) => [...x, { credit_request_id: usable[0]?.req.id ?? "", amount: "" }])}>+ ใช้เครดิต</Button>}
            {editable && f.partner_id && !usable.length && !credits.length && <p className="text-xs text-muted-foreground">ไม่มีเครดิตที่ใช้ได้ของ {pName(f.partner_id)}</p>}
            <p className="text-sm">ยอดที่ต้องจ่ายหลังใช้เครดิต <b className="tabular-nums" data-testid="pb-net">{money(Math.max(0, total - cr), f.currency)}</b></p>
          </section>

          {editable && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button type="button" onClick={() => save(false)} data-testid="pb-save">บันทึก</Button>
              <span className="flex items-center gap-1 text-xs"><Input type="date" aria-label="วันที่จ่าย" className="h-9 w-40" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /><Button type="button" variant="outline" onClick={() => save(true)} data-testid="pb-save-paid">บันทึกว่าจ่ายแล้ว</Button></span>
              {bill && <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={() => { const r = voidBill(bill.id); if (!r.ok) toast.error(r.error); else { toast.success("ยกเลิกบิลแล้ว"); onClose(); } }}>ยกเลิกบิล</Button>}
            </div>
          )}
        </fieldset>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- §3 Cashback ---------- */
function CashbackTab({ d, contracts, today, canWrite }: { d: PartnerData; contracts: PartnerContract[]; today: string; canWrite: boolean }) {
  const blocks = cashbackBlocks(d, contracts, today);
  const [tick, setTick] = useState<{ deal: string; contract: string; at: string; amount: string; currency: string } | null>(null);
  if (!blocks.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อตกลง Cashback ที่สำเร็จ</p>;
  return (
    <div className="space-y-4 pt-2" data-testid="pb-cashback">
      {blocks.map((b) => (
        <section key={b.deal.id} className="space-y-2 rounded-xl border p-3">
          <h3 className="text-sm font-medium">{b.partner} · {b.deal.title} · {b.deal.benefit_value} {b.deal.benefit_currency ?? "THB"} / สัญญา · {dealPeriodText(b.deal, dmy)}</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-1.5">สัญญา</th><th className="p-1.5">โรงแรม</th><th className="p-1.5">วันเริ่มสัญญา</th><th className="p-1.5">ยอดที่คาด</th><th className="p-1.5">ได้รับแล้ว</th></tr></thead>
            <tbody>
              {b.rows.map(({ c, receipt }) => {
                const open = tick?.deal === b.deal.id && tick.contract === c.contract_id;
                return (
                  <tr key={c.contract_id} className="border-t align-top">
                    <td className="p-1.5 font-mono text-xs">{c.contract_id}</td><td className="p-1.5">{c.hotel}</td><td className="p-1.5">{dmy(c.start)}</td>
                    <td className="p-1.5 tabular-nums">{money(b.sum.value, b.sum.currency)}</td>
                    <td className="p-1.5">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" aria-label={`ได้รับแล้ว ${c.contract_id}`} checked={!!receipt || open} disabled={!canWrite || (!!receipt && !isUiReceipt(receipt.id))}
                          onChange={(e) => { if (e.target.checked) setTick({ deal: b.deal.id, contract: c.contract_id, at: today, amount: String(b.sum.value), currency: b.sum.currency }); else if (receipt) removeCashbackReceipt(receipt.id); else setTick(null); }} />
                        {receipt && <span className="text-xs text-muted-foreground">{dmy(receipt.received_at)} · {money(receipt.amount ?? b.sum.value, receipt.currency ?? b.sum.currency)}</span>}
                      </label>
                      {open && !receipt && (
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                          <Input type="date" aria-label="วันที่ได้รับ" className="h-7 w-36 text-xs" value={tick.at} onChange={(e) => setTick({ ...tick, at: e.target.value })} />
                          <Input aria-label="ยอดที่ได้จริง" className="h-7 w-20 text-xs" inputMode="decimal" value={tick.amount} onChange={(e) => setTick({ ...tick, amount: e.target.value.replace(/[^\d.]/g, "") })} />
                          <Input aria-label="สกุลเงินที่ได้" className="h-7 w-16 text-xs" value={tick.currency} onChange={(e) => setTick({ ...tick, currency: e.target.value.toUpperCase() })} />
                          <Button size="sm" className="h-7" onClick={() => { const r = recordCashbackReceipt({ deal_id: b.deal.id, contract_id: c.contract_id, received_at: tick.at, amount: Number(tick.amount), currency: tick.currency, by: "AC" }); if (!r.ok) toast.error(r.error); else setTick(null); }}>บันทึก</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground" data-testid="pb-cashback-foot">ได้รับแล้ว {b.sum.received} / {b.sum.eligible} สัญญา · {money(b.sum.received_amount, b.sum.currency)}</p>
        </section>
      ))}
    </div>
  );
}

/* ---------- §4.1 contracts in ปิดระบบ (collection SUSPENDED) ---------- */
function SuspendedList({ demo, d, contracts, today, canWrite }: { demo: boolean; d: PartnerData; contracts: PartnerContract[]; today: string; canWrite: boolean }) {
  const crm = useCrmOptional();
  const rows = (demo ? demoDebtRows() : liveDebtModel(crm ?? null, today).debts).filter((r) => r.status === "SUSPENDED");
  return (
    <section className="space-y-2 rounded-xl border p-4" data-testid="pb-suspended">
      <h2 className="text-sm font-medium">สัญญาที่อยู่สถานะปิดระบบ · ขอปิดระบบ</h2>
      <p className="text-xs text-muted-foreground">AC ตรวจแล้วกด ขอปิดระบบ → ส่ง ticket ถึงทีม ORM / Marcom และ PS · เมื่อลูกค้าชำระครบ ระบบเปิดคำขอเปิดระบบคืนให้อัตโนมัติ</p>
      {!rows.length ? <p className="text-sm text-muted-foreground">ไม่มีสัญญาในสถานะปิดระบบ</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-1.5">โรงแรม</th><th className="p-1.5">บริการ</th><th className="p-1.5">ยอดค้าง</th><th className="p-1.5">รอบค้าง</th><th className="p-1.5" /></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pc = contracts.find((c) => c.contract_id === r.contract_id) ?? contracts.find((c) => c.hotel === r.hotel);
              const cost = pc ? getContractSystemCost(d, pc, today) : null;
              const fix = demo && r.contract_id === AC_DEMO.chaba.contract_id ? AC_DEMO.chaba : null;
              return (
                <tr key={r.contract_id} className="border-t" data-testid={`pb-susp-${r.contract_id}`}>
                  <td className="p-1.5"><div>{r.hotel}</div><div className="text-xs text-muted-foreground">{r.contract_id}</div></td>
                  <td className="p-1.5">{r.service}</td><td className="p-1.5 tabular-nums">{money(r.outstanding, "THB")}</td><td className="p-1.5">{r.cycles}</td>
                  <td className="p-1.5 text-right"><ShutoffRequest canWrite={canWrite} input={{ contract_id: r.contract_id, hotel_id: demo ? `HP-${r.contract_id}` : r.hotel_id, hotel_name: r.hotel, service_line: r.service, partner: cost?.partner ?? fix?.partner ?? null, system_name: cost?.system ?? fix?.system_name ?? null, assigned_ae: r.ae, outstanding: r.outstanding, overdue_cycles: r.cycles }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
