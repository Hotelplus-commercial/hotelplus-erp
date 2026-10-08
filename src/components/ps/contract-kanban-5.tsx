/* Contract Dashboard spec — 5 columns (pipeline stage 6–10), forward-only, test-trigger buttons.
 * Maps onto the existing 11-step lifecycle: 1–6 = Approved QT sub-steps, 7 = Send Contract,
 * 8 = Contract Signed, 9–10 = Set up fee beats, 11 = Prop Info (auto WON). */
import { Check, Circle, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContractLifecycle, type ContractLifecycle } from "@/lib/contract-lifecycle";
import { cn } from "@/lib/utils";

type Owner = "BD" | "AC" | "SYS";
const OWNER_CLS: Record<Owner, string> = {
  BD: "bg-primary/12 text-primary",
  AC: "bg-success/12 text-success",
  SYS: "bg-muted text-muted-foreground",
};
const OWNER_LABEL: Record<Owner, string> = { BD: "BD", AC: "AC", SYS: "ระบบ" };

const COLUMNS = [
  { n: 6, label: "Approved QT", owners: ["BD"] as Owner[], match: (s: number) => s <= 6 },
  { n: 7, label: "Send Contract", owners: ["SYS", "AC"] as Owner[], match: (s: number) => s === 7 },
  { n: 8, label: "Contract Signed", owners: ["BD", "AC"] as Owner[], match: (s: number) => s === 8 },
  { n: 9, label: "Set up fee", owners: ["SYS", "AC"] as Owner[], match: (s: number) => s === 9 || s === 10 },
  { n: 10, label: "Prop Info", owners: ["SYS", "AC"] as Owner[], match: (s: number) => s === 11 },
];

const SUBSTEPS: { label: string; owner: Owner; btn?: string }[] = [
  { label: "Approved QT", owner: "BD" },
  { label: "Draft Contract", owner: "SYS" },
  { label: "Request Invoice", owner: "SYS" },
  { label: "Create Customer ID", owner: "AC", btn: "สร้าง Customer ID" },
  { label: "Create Hotel ID", owner: "AC", btn: "สร้าง Hotel ID" },
  { label: "Create Invoice", owner: "AC", btn: "สร้าง Invoice" },
  { label: "Live Link Sent", owner: "AC", btn: "ส่ง Live Link" },
];

function OwnerBadge({ o }: { o: Owner }) {
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", OWNER_CLS[o])}>{OWNER_LABEL[o]}</span>;
}

function StepRow({ done, label, owner }: { done: boolean; label: string; owner: Owner }) {
  return (
    <li className="flex items-center gap-1.5 text-[11px]">
      {done ? <Check className="size-3.5 text-success" /> : <Circle className="size-3.5 text-muted-foreground" />}
      <span className={cn("flex-1", done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className="text-[10px] text-muted-foreground">{OWNER_LABEL[owner]}</span>
    </li>
  );
}

function Locked({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block w-full">{children}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function WonBadge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, []);
  return show ? (
    <span className="inline-flex animate-in zoom-in-50 fade-in duration-500 items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-success-foreground">
      ✅ WON <span className="font-normal opacity-80">· auto</span>
    </span>
  ) : (
    <span className="text-[11px] text-muted-foreground">ระบบกำลังตั้งสถานะ Won…</span>
  );
}

function Card({ l }: { l: ContractLifecycle }) {
  const { setStage } = useContractLifecycle();
  const s = l.current_stage;
  const [line, setLine] = useState<"ORM" | "MARCOM" | "BOTH" | "">(l.contract_service_line ?? "");
  const [identityId, setIdentityId] = useState("");
  const [contractId, setContractId] = useState(l.contract_id ?? "");
  const draftReady = Boolean(l.contract_id && l.contract_service_line);
  const step = SUBSTEPS[s];
  const go = (to: number, note: string, identity?: Parameters<typeof setStage>[2]) => setStage(l.id, to, { ...identity, notes: `Test trigger: ${note}` });
  const suffix = l.id.replace(/^lc-/, "");
  const captureStep = () => {
    if (!step) return;
    const entered = identityId.trim();
    const identity = s === 3 ? { customer_id: entered || `CU-${suffix}` }
      : s === 4 ? { hotel_id: entered || `H-${suffix}`, property_name: l.hotel_name }
      : s === 5 ? { invoice_number: entered || `INV-${suffix}` } : {};
    go(s + 1, step.label, { identity });
    setIdentityId("");
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{l.hotel_name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{l.quote_id}</p>
          <dl className="mt-1 space-y-1 break-words text-[11px]">
            {l.contract_id && <div><dt className="inline text-muted-foreground">Contract ID: </dt><dd className="inline font-mono">{l.contract_id}</dd><span className="ml-1 rounded bg-muted px-1 font-semibold">{l.contract_service_line ?? "—"}</span></div>}
            {l.customer_id && <div><dt className="inline text-muted-foreground">Customer ID: </dt><dd className="inline font-mono">{l.customer_id}</dd></div>}
            {l.hotel_id && <div><dt className="inline text-muted-foreground">Hotel ID: </dt><dd className="inline font-mono">{l.hotel_id}</dd><span className="block">{l.property_name || l.hotel_name}</span></div>}
            {l.invoice_number && <div><dt className="inline text-muted-foreground">Invoice no.: </dt><dd className="inline font-mono">{l.invoice_number}</dd></div>}
          </dl>
        </div>
        <OwnerBadge o={s <= 6 ? (s < 3 ? "BD" : "AC") : s === 8 ? "BD" : "AC"} />
      </div>

      {!draftReady && (
        <div className="space-y-2 border-t pt-2">
          <Input aria-label="Contract ID" value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="Contract ID (อัตโนมัติถ้าว่าง)" className="h-8 text-xs" />
          <Select value={line} onValueChange={(value) => { if (value === "ORM" || value === "MARCOM" || value === "BOTH") setLine(value); }}>
            <SelectTrigger aria-label="Contract service line" className="h-8 w-full"><SelectValue placeholder="เลือกบริการของสัญญา" /></SelectTrigger>
            <SelectContent><SelectItem value="ORM">ORM</SelectItem><SelectItem value="MARCOM">MARCOM</SelectItem><SelectItem value="BOTH">BOTH</SelectItem></SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="w-full" disabled={!line} onClick={() => {
            if (!line) return;
            go(Math.max(s, 3), "Draft Contract + Request Invoice", { identity: { contract_id: contractId.trim() || `CT-${line}-${suffix}`, contract_service_line: line } });
          }}>Draft Contract</Button>
        </div>
      )}
      {s <= 6 && (
        <>
          <p className="text-[11px] font-semibold text-muted-foreground">Progress {Math.max(s, 3)}/7</p>
          <ul className="space-y-1">
            {SUBSTEPS.map((st, i) => (
              <StepRow key={st.label} done={i === 1 ? draftReady : i + 1 <= s} label={st.label} owner={st.owner} />
            ))}
          </ul>
          {s >= 3 && s < 6 && step && (
            <div className="space-y-2">
              <Input key={s} aria-label={s === 3 ? "Customer ID" : s === 4 ? "Hotel ID" : "Invoice number"} value={identityId} onChange={(e) => setIdentityId(e.target.value)} placeholder={`${s === 3 ? "Customer ID" : s === 4 ? "Hotel ID" : "Invoice no."} (อัตโนมัติถ้าว่าง)`} className="h-8 text-xs" />
              <Button size="sm" variant="outline" className="w-full" disabled={!draftReady} onClick={captureStep}>{step.btn}</Button>
            </div>
          )}
          {s === 6 ? (
            <Button size="sm" className="w-full" onClick={() => go(7, "Live Link Sent")}>ส่ง Live Link</Button>
          ) : (
            <Locked tip="ต้องทำขั้น 4–6 ให้ครบก่อน">
              <Button size="sm" className="w-full" disabled>
                <Lock className="size-3" /> ส่ง Live Link
              </Button>
            </Locked>
          )}
        </>
      )}

      {s === 7 && (
        <>
          <p className="text-xs text-muted-foreground">รอลูกค้าเซ็น</p>
          <Button size="sm" className="w-full" onClick={() => go(8, "Contract Signed")}>ยืนยันลูกค้าเซ็น (Contract Signed)</Button>
        </>
      )}

      {s === 8 && (
        <>
          <p className="text-xs">เซ็นแล้ว · รอชำระเงิน</p>
          <p className="rounded bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">⚠ เซ็นแล้ว ≠ Won</p>
          <Button size="sm" className="w-full" onClick={() => go(9, "Payment Complete")}>Payment Complete</Button>
        </>
      )}

      {(s === 9 || s === 10) && (
        <>
          <ul className="space-y-1">
            <StepRow done label="Payment Complete" owner="SYS" />
            <StepRow done={s === 10} label="AC Checking Payment" owner="AC" />
          </ul>
          {s === 9 && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => go(10, "AC Checking Payment")}>
              AC Checking Payment ✓
            </Button>
          )}
          {s === 10 ? (
            <Button size="sm" className="w-full" onClick={() => go(11, "Tax/Receipt issued")}>ออก Tax/Receipt</Button>
          ) : (
            <Locked tip="รอ AC verify payment">
              <Button size="sm" className="w-full" disabled>
                <Lock className="size-3" /> ออก Tax/Receipt
              </Button>
            </Locked>
          )}
        </>
      )}

      {s === 11 && (
        <>
          <ul className="space-y-1">
            <StepRow done label="Tax/Receipt ออกแล้ว" owner="AC" />
          </ul>
          <WonBadge />
          {l.handed_off_to_onboarding && (
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              ➡ Sent to On-boarding
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function KanbanBoard5({ rows }: { rows: ContractLifecycle[] }) {
  return (
    <TooltipProvider>
      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((c) => {
            const items = rows.filter((l) => c.match(l.current_stage));
            return (
              <div key={c.n} className="w-[280px] shrink-0 rounded-xl border bg-surface/40 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold">
                    {c.label} · {items.length}
                  </p>
                  <div className="flex gap-1">
                    {c.owners.map((o) => (
                      <OwnerBadge key={o} o={o} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {items.length ? (
                    items.map((l) => <Card key={l.id} l={l} />)
                  ) : (
                    <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                      ยังไม่มีดีลในขั้นนี้
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
