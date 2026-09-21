/* PS App v2.3 · Fix 2 — Contract Dashboard Kanban: 11 columns, redesigned card.
 * The 11-node stepper is gone: column position is the stage indicator (D-15). */
import { Link } from "@tanstack/react-router";
import { ClipboardCopy, FileText, Link2, Mail, Receipt, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OWNER_COLOR,
  SHOW_STAGE_OVERRIDE,
  STAGES,
  expiredDays,
  isExpired,
  useContractLifecycle,
  type ContractLifecycle,
} from "@/lib/contract-lifecycle";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/* ---------------- elapsed time (D-16) ---------------- */

export function ElapsedTimeBadge({ changedAt }: { changedAt: string }) {
  const ms = Date.now() - new Date(changedAt).getTime();
  const hours = ms / 3_600_000;
  const days = Math.floor(ms / DAY);
  const text = hours < 1 ? "พึ่งเข้า stage นี้" : hours < 24 ? `${Math.floor(hours)} ชม.` : `${days} วัน`;
  const tone = days > 7 ? "text-red-500" : days >= 4 ? "text-orange-500" : "text-muted-foreground";
  return <p className={cn("text-[11px] font-medium", tone)}>⏱ {text}</p>;
}

/* ---------------- identity chip (D-17) ---------------- */

export function ArtifactChip({ icon, label, id }: { icon: string; label: string; id: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">
        {icon} {label}
      </span>
      {id ? (
        <span className="flex items-center gap-1">
          <code className="font-mono">{id}</code>
          <button
            type="button"
            aria-label={`Copy ${id}`}
            className="rounded p-0.5 hover:bg-muted"
            onClick={() => {
              void navigator.clipboard?.writeText(id);
              toast.success(`Copied ${id}`);
            }}
          >
            <ClipboardCopy className="size-3" />
          </button>
        </span>
      ) : (
        <span className="text-muted-foreground">(pending…)</span>
      )}
    </div>
  );
}

/* ---------------- document button (D-18) ---------------- */

function DocumentButton({
  icon,
  label,
  onClick,
  primary,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition",
        disabled
          ? "cursor-not-allowed bg-muted/60 text-muted-foreground"
          : primary
            ? "border-transparent bg-primary text-primary-foreground hover:opacity-90"
            : "bg-background hover:bg-accent",
      )}
    >
      {icon} {label}
    </button>
  );
}

/* ---------------- card ---------------- */

const fmtTh = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export function KanbanCard({ l }: { l: ContractLifecycle }) {
  const { setStage, sendToAc, resendLiveLink, liveLinkUrl, historyOf } = useContractLifecycle();
  const stage = l.current_stage;
  const expired = isExpired(l);

  const entered = historyOf(l.id).find((h) => h.to_stage === stage)?.changed_at ?? l.created_at;
  const customerId = stage >= 4 ? `CUST-${l.quote_id.slice(-5)}` : null;
  const hotelId = stage >= 5 ? l.hotel_id : null;

  const mock = (what: string) => toast.info(`${what} · รอการเชื่อมต่อ Wave 4 (จำลอง)`);

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div>
        <p className="font-display text-sm font-semibold leading-tight">{l.hotel_name}</p>
        <p className="text-[11px] text-muted-foreground">🏨 {l.customer_legal_name}</p>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {l.quote_id}
        {l.contract_id ? ` · ${l.contract_id}` : ""}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {l.service_line} · {l.bd_owner_id} · {fmtTh(l.created_at)}
      </p>

      <ElapsedTimeBadge changedAt={entered} />

      <div className="space-y-1 rounded-lg border p-1.5">
        <p className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Identity</p>
        <ArtifactChip icon="👤" label="Customer" id={customerId} />
        <ArtifactChip icon="🏨" label="Hotel" id={hotelId} />
      </div>

      {expired && (
        <p className="rounded-lg bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground">
          🔴 ⏰ Live Link expired {expiredDays(l)} days ago
        </p>
      )}

      <div className="space-y-1.5 rounded-lg border p-1.5">
        <p className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Documents</p>

        {stage === 1 && (
          <Button asChild size="sm" className="h-8 w-full gap-1.5 text-[11px]">
            <Link to="/ps/contract-wizard/new" search={{ quote_id: l.quote_id }}>
              <Wand2 className="size-3.5" /> Create Contract
            </Link>
          </Button>
        )}
        {stage === 2 && (
          <>
            <Button
              size="sm"
              className="h-8 w-full text-[11px]"
              onClick={() => {
                sendToAc(l.id);
                toast.success("Sent to AC");
              }}
            >
              Send to AC
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 w-full gap-1.5 text-[11px]">
              <Link to="/ps/contract-wizard/new" search={{ quote_id: l.quote_id }}>
                <Wand2 className="size-3.5" /> Continue Wizard
              </Link>
            </Button>
          </>
        )}

        <DocumentButton
          icon={<Link2 className="size-3.5" />}
          label="View Live Link"
          primary={stage >= 7 && !expired}
          disabled={stage < 7}
          onClick={() => {
            void navigator.clipboard?.writeText(liveLinkUrl(l));
            mock("เปิด Live Link (คัดลอกลิงก์ให้แล้ว)");
          }}
        />
        <DocumentButton
          icon={<Receipt className="size-3.5" />}
          label="View Invoice"
          primary={stage === 6}
          disabled={stage < 6}
          onClick={() => mock("Invoice from AC App")}
        />
        <DocumentButton
          icon={<FileText className="size-3.5" />}
          label="View Contract"
          primary={stage === 3}
          disabled={stage < 2}
          onClick={() => mock("Contract PDF")}
        />
        {(stage === 7 || stage === 8) && (
          <DocumentButton
            icon={<Mail className="size-3.5" />}
            label="Resend"
            primary={expired}
            onClick={() => {
              resendLiveLink(l.id);
              toast.success("Live Link resent");
            }}
          />
        )}
      </div>

      {SHOW_STAGE_OVERRIDE && (
        <div className="space-y-1 border-t pt-1.5">
          <p className="text-[10px] text-muted-foreground">🧪 Testing mode · will be removed</p>
          <Select
            value={String(stage)}
            onValueChange={(v) => {
              setStage(l.id, Number(v), { manual: true, notes: "Manual stage override (testing mode)" });
              toast.success(`ตั้งค่า stage เป็น ${v} · บันทึกใน audit trail`);
            }}
          >
            <SelectTrigger className="h-7 w-full text-[10px]">
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
  );
}

/* ---------------- board ---------------- */

export function KanbanBoard({ rows }: { rows: ContractLifecycle[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-3" style={{ height: "calc(100vh - 20rem)" }}>
      {STAGES.map((s) => {
        const cards = rows.filter((r) => r.current_stage === s.n);
        return (
          <section key={s.n} className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-xl bg-surface">
            <header className="border-b bg-card/60 px-2 py-2" style={{ borderTop: `3px solid ${OWNER_COLOR[s.owner]}` }}>
              <p className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                <span>
                  {s.n} · {s.label}
                </span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{cards.length}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{s.owner} App</p>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {cards.map((c) => (
                <KanbanCard key={c.id} l={c} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
