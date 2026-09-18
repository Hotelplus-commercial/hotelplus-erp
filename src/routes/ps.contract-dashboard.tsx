/* PS App v2.2 · Fix 2 — Contract Dashboard: 11-stage lifecycle tracking. */
import { Link, createFileRoute } from "@tanstack/react-router";
import { Copy, RefreshCw, Search, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Kpi, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OWNER_COLOR,
  SHOW_STAGE_OVERRIDE,
  STAGES,
  expiredDays,
  isExpired,
  stageOf,
  useContractLifecycle,
  type ContractLifecycle,
} from "@/lib/contract-lifecycle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/contract-dashboard")({
  head: () => ({
    meta: [
      { title: "Contract Dashboard — PS App | Meridia Hotel ERP" },
      { name: "description", content: "ติดตามสถานะสัญญา 11 ขั้นตอน ตั้งแต่ Quote Approved ถึงใบกำกับภาษี" },
      { property: "og:title", content: "Contract Dashboard — PS App" },
      { property: "og:description", content: "ติดตามสถานะสัญญา 11 ขั้นตอนแบบครบวงจร" },
    ],
  }),
  component: ContractDashboard,
});

const SERVICE_LINES = ["ORM", "MARCOM", "PROD", "PP"] as const;

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        const color = OWNER_COLOR[s.owner];
        return (
          <div key={s.n} className="flex items-center gap-0.5">
            <span
              title={`${s.n} · ${s.label}`}
              className={cn("block rounded-full", active ? "size-3 animate-pulse" : "size-2.5")}
              style={{ background: done || active ? color : "hsl(var(--muted))" }}
            />
            {i < STAGES.length - 1 && (
              <span className="block h-px w-3" style={{ background: done ? color : "hsl(var(--border))" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ l }: { l: ContractLifecycle }) {
  const { setStage, sendToAc, resendLiveLink, liveLinkUrl } = useContractLifecycle();
  const st = stageOf(l.current_stage);
  const expired = isExpired(l);

  const actions = () => {
    switch (l.current_stage) {
      case 1:
        return (
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/ps/contract-wizard/new" search={{ quote_id: l.quote_id }}>
              <Wand2 className="size-4" /> Create Contract
            </Link>
          </Button>
        );
      case 2:
        return (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/ps/contract-wizard/new" search={{ quote_id: l.quote_id }}>
              <Wand2 className="size-4" /> Continue Wizard
            </Link>
          </Button>
        );
      case 3:
        return (
          <Button size="sm" className="gap-1.5" onClick={() => { sendToAc(l.id); toast.success(`ส่งให้ AC App แล้ว · ${l.quote_id} (mock)`); }}>
            Send to AC
          </Button>
        );
      case 8:
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                void navigator.clipboard?.writeText(liveLinkUrl(l));
                toast.success("คัดลอก Live Link แล้ว");
              }}
            >
              <Copy className="size-4" /> Copy Live Link
            </Button>
            <Button size="sm" variant={expired ? "default" : "outline"} className="gap-1.5" onClick={() => { resendLiveLink(l.id); toast.success("ส่ง Live Link ใหม่ · อายุลิงก์ 7 วัน"); }}>
              <RefreshCw className="size-4" /> Resend
            </Button>
          </div>
        );
      case 11:
        return <span className="text-xs text-muted-foreground">View Signed PDF · View Invoices in AC (pending AC integration)</span>;
      default:
        return <span className="text-xs text-muted-foreground">View Draft</span>;
    }
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{l.hotel_name}</p>
          <p className="text-xs text-muted-foreground">
            {l.quote_id}
            {l.contract_id ? ` · ${l.contract_id}` : ""} · {l.customer_legal_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Service: {l.service_line} · BD: {l.bd_owner_id} · Created: {fmtDate(l.created_at)}
          </p>
        </div>
        <Chip tone={l.current_stage === 11 ? "success" : expired ? "danger" : "info"}>
          Stage {l.current_stage} · {st.label}
        </Chip>
      </div>

      <Stepper current={l.current_stage} />

      {l.current_stage >= 4 && l.current_stage <= 7 && (
        <p className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30">
          ⚠ Pending AC integration (stages 4-7, 10-11) · ยังเป็นการจำลอง
        </p>
      )}
      {(l.current_stage === 8 || l.current_stage === 9) && (
        <p className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] text-blue-700 dark:bg-blue-950/30">
          ⚠ Pending Live Link integration (stages 8-9) · ยังเป็นการจำลอง
        </p>
      )}
      {l.current_stage === 10 && (
        <p className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30">
          ⚠ AC ต้องตรวจสอบการชำระเงินด้วยตนเอง (manual verification)
        </p>
      )}
      {expired && (
        <p className="rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
          🔴 ⏰ Live Link expired {expiredDays(l)} days ago
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        {actions()}
        {SHOW_STAGE_OVERRIDE && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">🧪 Testing mode</span>
            <Select
              value={String(l.current_stage)}
              onValueChange={(v) => {
                setStage(l.id, Number(v), { manual: true, notes: "Manual stage override (testing mode)" });
                toast.success(`ตั้งค่า stage เป็น ${v} · บันทึกใน audit trail`);
              }}
            >
              <SelectTrigger className="h-8 w-[15rem] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.n} value={String(s.n)} className="text-[11px]">
                    {s.n} · {s.label} ({s.owner})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractDashboard() {
  const { lifecycles, hydrated } = useContractLifecycle();
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [line, setLine] = useState("all");
  const [owner, setOwner] = useState("all");
  const [showSigned, setShowSigned] = useState(false);
  const [showExpired, setShowExpired] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const owners = useMemo(() => [...new Set(lifecycles.map((l) => l.bd_owner_id))], [lifecycles]);

  const rows = lifecycles.filter((l) => {
    if (stage !== "all" && String(l.current_stage) !== stage) return false;
    if (line !== "all" && l.service_line !== line) return false;
    if (owner !== "all" && l.bd_owner_id !== owner) return false;
    if (!showSigned && l.current_stage === 11) return false;
    if (!showExpired && isExpired(l)) return false;
    const hay = `${l.hotel_name} ${l.quote_id} ${l.contract_id ?? ""} ${l.customer_legal_name}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const stats = {
    total: lifecycles.length,
    awaiting: lifecycles.filter((l) => l.current_stage <= 2).length,
    inProgress: lifecycles.filter((l) => l.current_stage >= 3 && l.current_stage <= 10).length,
    signed: lifecycles.filter((l) => l.current_stage === 11).length,
    expired: lifecycles.filter(isExpired).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="ทั้งหมด" value={stats.total} />
        <Kpi label="Awaiting contract" value={stats.awaiting} hint="stage 1-2" />
        <Kpi label="In progress" value={stats.inProgress} hint="stage 3-10" />
        <Kpi label="Completed" value={stats.signed} hint="stage 11" />
        <Kpi label="Live Link expired" value={stats.expired} />
      </div>

      <Panel
        title="Contract Dashboard"
        subtitle="ติดตาม 11 ขั้นตอน · ฟิลเตอร์ทำงานแบบ AND · ค้นหาหน่วง 300ms"
        right={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="ค้นหาโรงแรม / quote / สัญญา / ชื่อนิติบุคคล"
              className="h-9 w-72 pl-8"
            />
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-[15rem]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก stage</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.n} value={String(s.n)}>
                  {s.n} · {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={line} onValueChange={setLine}>
            <SelectTrigger className="h-9 w-[11rem]">
              <SelectValue placeholder="Service line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก service line</SelectItem>
              {SERVICE_LINES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9 w-[17rem]">
              <SelectValue placeholder="BD owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก BD owner</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={showSigned} onChange={(e) => setShowSigned(e.target.checked)} /> แสดงที่เสร็จแล้ว (stage 11)
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> แสดงลิงก์หมดอายุ
          </label>
        </div>

        <div className="space-y-3">
          {rows.map((l) => (
            <Row key={l.id} l={l} />
          ))}
          {!rows.length && (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {!hydrated
                ? "กำลังโหลด…"
                : lifecycles.length
                  ? "ไม่มีรายการตรงกับฟิลเตอร์ · ลองล้างฟิลเตอร์หรือคำค้น"
                  : "ยังไม่มีสัญญาในระบบ · อนุมัติใบเสนอราคาใน BD App แล้วรายการจะขึ้นที่นี่อัตโนมัติ"}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
