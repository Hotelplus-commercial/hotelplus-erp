import { Link } from "@tanstack/react-router";
import { ChevronDown, Download, Eye, FileText, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  activityIcon,
  activityTypes,
  renewalStatusLabel,
  truncate,
  usePsRenewal,
  type ActivityType,
  type ChurnType,
  type RenewalCard,
  type RenewalStatus,
} from "@/lib/ps-renewal";
import { cn } from "@/lib/utils";

const statusTone: Record<RenewalStatus, "muted" | "info" | "success" | "danger"> = {
  NOT_STARTED: "muted",
  ON_PROCESS: "info",
  COMPLETED: "success",
  CHURN: "danger",
};

export function RenewalStatusBadge({ status }: { status: RenewalStatus }) {
  return <Chip tone={statusTone[status]}>{renewalStatusLabel[status]}</Chip>;
}

/* ---------------- Zone 1 Row 2: collapsible renewal activity cards --------------- */

export function RenewalActivityCards({
  scope,
  currentUser,
  canOverride,
}: {
  scope: "my" | "team";
  currentUser: string;
  canOverride: boolean;
}) {
  const { cards } = usePsRenewal();
  const [open, setOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [active, setActive] = useState<{ card: RenewalCard; addMode: boolean } | null>(null);

  const visible = cards
    .filter((c) => (scope === "my" ? c.owner === currentUser : true))
    .sort((a, b) => (sortAsc ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft));

  return (
    <div className="mt-4 rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          Renewal Activities ({visible.length})
        </button>
        <Button size="sm" variant="outline" onClick={() => setSortAsc((s) => !s)}>
          Sort: {sortAsc ? "Soonest expiry" : "Latest expiry"} ▼
        </Button>
      </div>

      {open && (
        <ul className="divide-y border-t">
          {visible.map((c) => {
            const owned = c.owner === currentUser || canOverride;
            const last = c.activities[0];
            return (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">🏨 {c.hotel}</span>
                    <span className="text-xs text-muted-foreground">· {c.daysLeft}d left ·</span>
                    <RenewalStatusBadge status={c.status} />
                    {!owned && (
                      <Chip tone="muted">
                        <Lock className="mr-1 size-3" /> view only
                      </Chip>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Contract End: {c.contractEnd} · Owner: {c.owner}
                  </p>
                  {last ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-1 cursor-help text-xs">
                            Last: {activityIcon[last.type]} {last.type} · {last.at} ·{" "}
                            <span className="text-muted-foreground">
                              &quot;{truncate(last.note)}&quot;
                            </span>
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{last.note}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">ยังไม่มี activity</p>
                  )}
                  <p className="text-xs text-muted-foreground">Next: {c.nextActivity ?? "—"}</p>
                </div>
                <Button
                  size="sm"
                  variant={c.activities.length ? "outline" : "default"}
                  onClick={() => setActive({ card: c, addMode: !c.activities.length })}
                >
                  {c.activities.length ? "View Card →" : "Start Activity →"}
                </Button>
              </li>
            );
          })}
          {!visible.length && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              ไม่มีสัญญาที่ต้องต่อในขอบเขตนี้
            </li>
          )}
        </ul>
      )}

      {active && (
        <RenewalCardModal
          cardId={active.card.id}
          startAdd={active.addMode}
          currentUser={currentUser}
          canOverride={canOverride}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Renewal Card Detail Modal (4 sections) --------------- */

export function RenewalCardModal({
  cardId,
  startAdd,
  currentUser,
  canOverride,
  onClose,
}: {
  cardId: string;
  startAdd?: boolean;
  currentUser: string;
  canOverride: boolean;
  onClose: () => void;
}) {
  const { cards, addActivity, markDone } = usePsRenewal();
  const card = cards.find((c) => c.id === cardId);
  const [type, setType] = useState<ActivityType | null>(startAdd ? "Call" : null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState<"COMPLETED" | "CHURN">("COMPLETED");
  const [churnType, setChurnType] = useState<ChurnType>("ไม่ต่อ (Non-renewal)");
  const [reason, setReason] = useState("");
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  if (!card) return null;
  const owned = card.owner === currentUser || canOverride;
  const done = card.status === "COMPLETED" || card.status === "CHURN";

  const save = () => {
    if (!type) return;
    if ((type === "Meeting" || type === "Call") && (!date || !time || !note.trim()))
      return setErr("กรอก Date, Time และ Note ให้ครบ");
    if ((type === "Email" || type === "LINE") && !note.trim()) return setErr("กรอก Note");
    if (type === "Documents" && !file.trim()) return setErr("แนบไฟล์ก่อนบันทึก");
    if (type === "Contract" && !file.trim()) return setErr("แนบไฟล์สัญญาที่เซ็นแล้ว (PDF)");
    addActivity(card.id, {
      type,
      at: date && time ? `${date} ${time}` : "วันนี้",
      note: note.trim() || "—",
      file: file.trim() || undefined,
      by: currentUser,
    });
    toast.success(`บันทึก ${type} activity — ${card.hotel}`);
    setType(null);
    setDate("");
    setTime("");
    setNote("");
    setFile("");
    setErr(null);
  };

  const confirmDone = () => {
    if (outcome === "COMPLETED" && !card.signedFile)
      return setConfirmErr("ต้องมี Contract activity พร้อมไฟล์ที่เซ็นแล้วก่อน");
    if (outcome === "CHURN" && !reason.trim()) return setConfirmErr("กรอกเหตุผล");
    markDone(card.id, outcome, currentUser, churnType, reason.trim());
    setConfirmOpen(false);
    onClose();
    toast.success(
      outcome === "COMPLETED"
        ? "✅ Renewal marked as Complete — PM has been notified"
        : "บันทึก Churn แล้ว — แจ้ง PM เรียบร้อย",
    );
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              🏨 {card.hotel} · Contract End: {card.contractEnd}
              <RenewalStatusBadge status={card.status} />
            </DialogTitle>
            <DialogDescription>Renewal Card · Owner {card.owner}</DialogDescription>
          </DialogHeader>

          {/* Section 1 — Hotel Info */}
          <section className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              1 · ข้อมูลโรงแรม (read-only)
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {[
                ["Hotel ID", card.hotelId],
                ["Hotel Name", card.hotel],
                ["Contract End Date", card.contractEnd],
                ["Contact Person", card.contact.name],
                ["Phone", card.contact.phone],
                ["Email", card.contact.email],
                ["LINE ID", card.contact.line],
              ].map(([k, v]) => (
                <div key={k} className="flex min-w-0 gap-2">
                  <dt className="w-36 shrink-0 text-muted-foreground">{k}:</dt>
                  <dd className="min-w-0 truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Section 2 — Contract */}
          <section className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              2 · สัญญา
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Chip tone="info">
                <FileText className="mr-1 size-3" /> {card.contractFile}
              </Chip>
              <Button size="sm" variant="outline" onClick={() => toast.info("ดาวน์โหลดสัญญา")}>
                <Download className="size-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.info("เปิด preview สัญญา")}>
                <Eye className="size-3.5" /> Preview
              </Button>
              <span className="text-xs text-muted-foreground">
                (last generated: {card.contractGeneratedAt})
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" asChild>
                <Link to="/ps/contract-wizard">Generate from สร้างสัญญา →</Link>
              </Button>
              <span className="text-xs text-muted-foreground">Signed Contract:</span>
              {card.signedFile ? (
                <>
                  <Chip tone="success">{card.signedFile}</Chip>
                  <Button size="sm" variant="outline" onClick={() => toast.info("ดาวน์โหลดไฟล์เซ็น")}>
                    <Download className="size-3.5" /> Download
                  </Button>
                </>
              ) : (
                <Chip tone="muted">Not yet uploaded</Chip>
              )}
            </div>
          </section>

          {/* Section 3 — Activity Log */}
          <section className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              3 · Activity Log ({card.activities.length})
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {card.activities.map((a) => (
                <li key={a.id} className="rounded-lg border bg-muted/30 p-2.5 text-sm">
                  <p className="font-medium">
                    {activityIcon[a.type]} {a.type} · {a.at}
                  </p>
                  <p className="text-muted-foreground">&quot;{a.note}&quot;</p>
                  {a.file && <p className="text-xs text-muted-foreground">📎 {a.file}</p>}
                  <p className="text-[11px] text-muted-foreground">by: {a.by}</p>
                </li>
              ))}
              {!card.activities.length && (
                <li className="text-sm text-muted-foreground">ยังไม่มี activity</li>
              )}
            </ul>

            {owned && !done && (
              <div className="mt-3 rounded-lg border p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">
                    <Plus className="mr-1 inline size-3" /> Add Activity
                  </span>
                  <Select
                    value={type ?? ""}
                    onValueChange={(v) => {
                      setType(v as ActivityType);
                      setErr(null);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[190px]">
                      <SelectValue placeholder="เลือกประเภท ▼" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {activityIcon[t]} {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {type && (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {(type === "Meeting" || type === "Call") && (
                      <>
                        <div>
                          <Label className="text-xs">Date *</Label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Time *</Label>
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </>
                    )}
                    {(type === "Documents" || type === "Contract" || type === "Email" || type === "LINE") && (
                      <div className="sm:col-span-2">
                        <Label className="text-xs">
                          {type === "Contract"
                            ? "Upload Signed File * (PDF)"
                            : type === "Documents"
                              ? "Upload File *"
                              : "Attachment / link (optional)"}
                        </Label>
                        <Input
                          value={file}
                          onChange={(e) => setFile(e.target.value)}
                          placeholder="เช่น signed_contract_2026.pdf"
                          className="h-9"
                        />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Label className="text-xs">
                        Note {type === "Documents" || type === "Contract" ? "(optional)" : "*"}
                      </Label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="รายละเอียดการติดต่อ"
                      />
                    </div>
                    {err && <p className="text-xs text-destructive sm:col-span-2">{err}</p>}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button size="sm" onClick={save}>
                        Save Activity
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setType(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 4 — footer */}
          <DialogFooter className="border-t pt-3">
            {done && (
              <span className="mr-auto text-xs text-muted-foreground">
                Marked as {renewalStatusLabel[card.status]} · {card.markedBy} · {card.markedAt}
                {card.churnType ? ` · ${card.churnType}` : ""}
              </span>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled={!owned || done} onClick={() => setConfirmOpen(true)}>
                      Mark as Done
                    </Button>
                  </span>
                </TooltipTrigger>
                {!owned && <TooltipContent>Only owner AE can action</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-confirm modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>โปรด Re-confirm สถานะการต่อสัญญาอีกครั้ง</DialogTitle>
            <DialogDescription>{card.hotel} · {card.hotelId}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select
                value={outcome}
                onValueChange={(v) => {
                  setOutcome(v as "COMPLETED" | "CHURN");
                  setConfirmErr(null);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed (ต่อสัญญาสำเร็จ)</SelectItem>
                  <SelectItem value="CHURN">Churn (ต่อสัญญาไม่สำเร็จ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {outcome === "CHURN" && (
              <div>
                <Label className="text-xs">Churn Type *</Label>
                <Select value={churnType} onValueChange={(v) => setChurnType(v as ChurnType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ฉีกสัญญา (Early Termination)">
                      ฉีกสัญญา (Early Termination)
                    </SelectItem>
                    <SelectItem value="ไม่ต่อ (Non-renewal)">ไม่ต่อ (Non-renewal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">
                Reason {outcome === "CHURN" ? "*" : "(optional)"}
              </Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            {confirmErr && <p className="text-xs text-destructive">{confirmErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDone}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- PS Dashboard: New Contract Updates (PM only) --------------- */

export function NewContractUpdates() {
  const { updates, unread, markAllRead } = usePsRenewal();
  const [detail, setDetail] = useState<string | null>(null);
  const { cards } = usePsRenewal();
  const card = cards.find((c) => c.hotelId === detail);

  return (
    <Panel
      title={`📬 New Contract Updates (${unread} unread)`}
      subtitle="อัปเดตผลการต่อสัญญาจากทีม AE · auto-refresh ทุก 30 วินาที"
      right={
        <Button size="sm" variant="outline" onClick={markAllRead}>
          Mark all read
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {updates.map((u) => (
          <li
            key={u.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3",
              u.read ? "bg-muted/40" : "border-l-4 border-l-primary bg-card",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {u.outcome === "COMPLETED" ? "✅ ต่อสัญญาสำเร็จ" : "❌ ต่อสัญญาไม่สำเร็จ"} —{" "}
                {u.hotelId} — {u.hotel}
                {u.churnType ? ` (${u.churnType})` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Marked by {u.by} · {u.ago}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDetail(u.hotelId)}>
              See Details →
            </Button>
          </li>
        ))}
        {!updates.length && (
          <li className="text-sm text-muted-foreground">ยังไม่มีอัปเดตใน 24 ชั่วโมงที่ผ่านมา</li>
        )}
      </ul>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{card ? `${card.hotel} · ${card.hotelId}` : "Renewal detail"}</DialogTitle>
            <DialogDescription>
              {card ? `Status: ${renewalStatusLabel[card.status]} · owner ${card.owner}` : ""}
            </DialogDescription>
          </DialogHeader>
          {card && (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {card.activities.map((a) => (
                  <li key={a.id} className="rounded-lg border p-2.5 text-sm">
                    <p className="font-medium">
                      {activityIcon[a.type]} {a.type} · {a.at}
                    </p>
                    <p className="text-muted-foreground">&quot;{a.note}&quot;</p>
                    {a.file && <p className="text-xs text-muted-foreground">📎 {a.file}</p>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Signed file: {card.signedFile ?? "—"}
                {card.churnReason ? ` · เหตุผล: ${card.churnReason}` : ""}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button asChild>
              <Link to="/ps/contracts">Open in สัญญา &amp; บริการ →</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
