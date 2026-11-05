import { Link } from "@tanstack/react-router";
import { ChevronDown, Lock, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { onDemoSessionChange, psDemoOn } from "@/lib/demo-session";
import { DEMO_EXTRA_CARDS, declineRequest, isRenewalDemo, latestRequestFor, openRequestFor, scanSourceContracts, setRenewalDemo, signedAwaitingDone, sourceContractFor, sourceMissesFor, useRenewalStore } from "@/lib/renewal-store";
import { RenewalOfferSection } from "@/components/ps/renewal-offer-section";
import { KeepCreditWarning } from "@/components/ps/ae-system-cost";
import { RenewalRequestChips, RenewalRequestPanel, SignedBadge } from "@/components/ps/renewal-request-ui";
import { RENEWAL_LABEL_TH as RL, RENEWAL_TEST_BANNER, RENEWAL_TEST_SWITCH, RN2, aeNameTh } from "@/lib/ps-glossary";
import { RenewalReasonPicker } from "@/components/ps/renewal-reason-picker";
import { recordReason, setReasonsDemo } from "@/lib/renewal-reasons";
import { isOwningAe, reasonLabel, validPick } from "@/lib/renewal-r2";
import { EARLY_PARAM, cardDaysLeft, readEarlyHandoff, scanContractById, type ScanContract } from "@/lib/renewal-scan";
import { RENEWAL_R2_DEMO_NOW, renewalR2DemoReasons, renewalR2DemoScanFeed } from "@/lib/renewal-r2-demo";
import { actingRenewalUser, isRenewalTestMode, setTestMember, useTestMember } from "@/lib/renewal-test-actor";
import { useMeetingMgmt } from "@/lib/orm-meeting";

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
  currentUser: roleUser,
  canOverride,
}: {
  scope: "my" | "team";
  currentUser: string;
  canOverride: boolean;
}) {
  const { cards: baseCards, runScan, createCard } = usePsRenewal();
  const { setRole } = useMeetingMgmt();
  /* R2.1 UF2: testing-mode acting AE member (set from the Tab R2 card); PM stays PM. */
  const member = useTestMember();
  const currentUser = actingRenewalUser(roleUser, canOverride, member);
  const [demo, setDemo] = useState(false);
  const [denied, setDenied] = useState<ScanContract | null>(null);
  useEffect(() => {
    const sync = () => { const on = new URLSearchParams(window.location.search).get("demo") === "1" || psDemoOn(); setRenewalDemo(on); setDemo(on); setReasonsDemo(on, renewalR2DemoReasons); };
    sync();
    return onDemoSessionChange(sync);
  }, []);
  useRenewalStore();
  const cards = demo ? [...baseCards, ...DEMO_EXTRA_CARDS] : baseCards;
  const [open, setOpen] = useState(false);
  useEffect(() => { if (window.location.hash === "#renewal-activities") { setOpen(true); document.getElementById("renewal-activities")?.scrollIntoView({ block: "start" }); } }, []);
  const [sortAsc, setSortAsc] = useState(true);
  const [active, setActive] = useState<{ card: RenewalCard; addMode: boolean } | null>(null);
  const today = () => (isRenewalDemo() ? RENEWAL_R2_DEMO_NOW : new Date().toISOString().slice(0, 10));
  const extraCards = () => (isRenewalDemo() ? DEMO_EXTRA_CARDS : []);
  /* Tab R2 §7: renewal-card scan (lead RENEWAL_CARD_LEAD_DAYS) + early create deep link (?createRenewal={contract_id}, owning AE only). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const on = params.get("demo") === "1" || psDemoOn();
    setReasonsDemo(on, renewalR2DemoReasons);
    const today = on ? RENEWAL_R2_DEMO_NOW : new Date().toISOString().slice(0, 10);
    const extra = on ? DEMO_EXTRA_CARDS : [];
    runScan(on ? renewalR2DemoScanFeed() : scanSourceContracts(), today, extra);
    const cid = params.get(EARLY_PARAM);
    if (!cid) return;
    const c = readEarlyHandoff(cid);
    setOpen(true);
    const me = actingRenewalUser(roleUser, canOverride);
    if (!c || !isOwningAe({ id: me, role: canOverride ? "PM" : "AE" }, c.ae)) { setDenied(c ?? { contract_id: cid, hotel_id: "", hotel_name: cid, service: "ORM", end: "", ae: null }); return; }
    const { card } = createCard(c, "AE_EARLY", today, extra);
    setActive({ card, addMode: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* UF2 testing-mode switch from the "no permission" message: role AE + the contract's owning AE, then open the card. */
  const switchToOwner = (c: ScanContract) => {
    if (!c.ae) return;
    setTestMember(c.ae); setRole("AE"); setDenied(null);
    const { card } = createCard(c, "AE_EARLY", today(), extraCards());
    setActive({ card, addMode: false });
  };

  const visible = cards
    .filter((c) => (scope === "my" ? c.owner === currentUser : true))
    .sort((a, b) => { const da = cardDaysLeft(a, today()), db = cardDaysLeft(b, today()); return sortAsc ? da - db : db - da; });

  return (
    <div id="renewal-activities" className="mt-4 scroll-mt-20 rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          Renewal Activities ({visible.length})
          {visible.some(signedAwaitingDone) && <span aria-label={RL.signedBadge} title={RL.signedBadge} className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground tabular-nums">{visible.filter(signedAwaitingDone).length}</span>}
        </button>
        <Button size="sm" variant="outline" onClick={() => setSortAsc((s) => !s)}>
          Sort: {sortAsc ? "Soonest expiry" : "Latest expiry"} ▼
        </Button>
      </div>

      {isRenewalTestMode() && member && !canOverride && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">{RENEWAL_TEST_BANNER("AE", aeNameTh(member))}</p>}
      {denied && (
        <p role="alert" className="flex flex-wrap items-center gap-2 border-t px-3 py-2 text-sm text-destructive">
          {RN2.denied}
          {isRenewalTestMode() && denied.ae && <button type="button" className="text-xs font-semibold text-primary underline-offset-2 hover:underline" onClick={() => switchToOwner(denied)}>{RENEWAL_TEST_SWITCH(aeNameTh(denied.ae))}</button>}
        </p>
      )}
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
                    {(() => { const d = cardDaysLeft(c, today()); return d < 0 ? <span className="text-xs font-medium text-destructive">· เลยกำหนด {-d} วัน ·</span> : <span className="text-xs text-muted-foreground">· {d}d left ·</span>; })()}
                    <RenewalStatusBadge status={c.status} />
                    <RenewalRequestChips cardId={c.id} />
                    <SignedBadge card={c} />
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
          extraCards={demo ? DEMO_EXTRA_CARDS : []}
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
  extraCards = [],
}: {
  cardId: string;
  startAdd?: boolean;
  currentUser: string;
  canOverride: boolean;
  onClose: () => void;
  extraCards?: RenewalCard[];
}) {
  const { cards, addActivity, markDone } = usePsRenewal();
  useRenewalStore();
  const card = [...cards, ...extraCards].find((c) => c.id === cardId);
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
  const [effectiveEnd, setEffectiveEnd] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  const [pickNote, setPickNote] = useState("");

  if (!card) return null;
  const signedReq = latestRequestFor(card.id)?.status === "SIGNED";
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
    if (outcome === "COMPLETED" && !signedReq) return setConfirmErr(RL.needSigned);
    // Tab R2 §6.2: ไม่ต่อ / ฉีกสัญญา needs exactly 3 labels (replaces the free-text reason for new entries).
    if (outcome === "CHURN" && !validPick(picks)) return setConfirmErr(RN2.picker.more(3 - picks.length));
    if (outcome === 'CHURN' && !effectiveEnd) return setConfirmErr('ระบุวันสิ้นสุดสัญญา');
    const reasonText = outcome === "CHURN" ? [...picks.map(reasonLabel), pickNote.trim()].filter(Boolean).join(" · ") : reason.trim();
    const openReq = openRequestFor(card.id);
    if (outcome === "CHURN" && openReq) { const o = declineRequest(openReq.id, reasonText); if (!o.ok) return setConfirmErr(o.error); }
    markDone(card.id, outcome, currentUser, churnType, reasonText, effectiveEnd);
    if (outcome === "CHURN") {
      const src = sourceContractFor(card.hotelId);
      const cid = card.created_source ? card.id.replace(/^RN-/, "") : src?.contract_id ?? card.id;
      const service = scanContractById(cid)?.service ?? (src?.terms.package.startsWith("Marcom") ? "Marcom" : "ORM");
      const now = isRenewalDemo() ? `${RENEWAL_R2_DEMO_NOW}T03:00:00.000Z` : new Date().toISOString();
      recordReason({ contract_id: cid, service, renewal_card_id: card.id, outcome: churnType.includes("Early") ? "LOST" : "NOT_RENEWED", picks, note: pickNote, by: { member_id: currentUser, display: currentUser, role: canOverride ? "PM" : "AE" } }, now);
    }
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
              <SignedBadge card={card} />
            </DialogTitle>
            <DialogDescription>Renewal Card · Owner {card.owner}</DialogDescription>
          </DialogHeader>

          {/* v1.4 §4 — section 1 ข้อมูลประกอบการต่อสัญญา (hotel info follows as "ข้อมูลโรงแรม") */}
          <RenewalOfferSection card={card} />
          <section className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ข้อมูลโรงแรม (read-only)
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

          <RenewalRequestPanel card={card} currentUser={currentUser} />

          {/* Section 3 — Activity Log */}
          <section className="rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              3 · Activity Log ({card.activities.length})
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {sourceMissesFor(card.id).map((m, k) => (
                <li key={`miss-${k}`} className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm" data-event={m.event}>
                  <p className="font-medium">⚠ {m.event} · {m.contract_id ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">ลองหา: {m.tried.join(" · ")}</p>
                  <p className="text-[11px] text-muted-foreground">by: system · {m.at.slice(0, 16).replace("T", " ")}</p>
                </li>
              ))}
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
                    <Button disabled={!owned || done} onClick={() => { setOutcome(signedReq ? "COMPLETED" : "CHURN"); setConfirmOpen(true); }}>
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
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
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
                  <SelectItem value="COMPLETED" disabled={!signedReq}>Completed (ต่อสัญญาสำเร็จ){signedReq ? "" : ` · ${RL.needSigned}`}</SelectItem>
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
            {outcome === "CHURN" ? (
              <div>
                <Label className="text-xs">{RN2.markDone.reasons} *</Label>
                <RenewalReasonPicker value={picks} onChange={(v) => { setPicks(v); setConfirmErr(null); }} note={pickNote} onNote={setPickNote} idPrefix="md" />
              </div>
            ) : (
            <div>
              <Label className="text-xs">
                Reason (optional)
              </Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            )}
            {outcome === 'CHURN' && <div className="space-y-1"><Label htmlFor="renewal-effective-end" className="text-xs">วันสิ้นสุดสัญญาที่มีผล *</Label><Input id="renewal-effective-end" type="date" value={effectiveEnd} onChange={e => setEffectiveEnd(e.target.value)} /><p className="text-xs text-muted-foreground">สิ้นสุดบริการตามวันที่นี้ ไม่ใช่ทันทีที่บันทึกผล</p></div>}
            {outcome === "CHURN" && churnType === "ไม่ต่อ (Non-renewal)" && <KeepCreditWarning card={card} />}
            {confirmErr && <p className="text-xs text-destructive">{confirmErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDone} disabled={outcome === "CHURN" && !validPick(picks)}>{outcome === "CHURN" ? RN2.markDone.confirm : "Confirm"}</Button>
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
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const { cards } = usePsRenewal();
  const card = cards.find((c) => c.hotelId === detail);

  useEffect(() => {
    const id = setInterval(() => setRefreshedAt(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel
      title={`📬 New Contract Updates (${unread} unread)`}
      subtitle={`อัปเดตผลการต่อสัญญาจากทีม AE · auto-refresh ทุก 30 วินาที · ล่าสุด ${refreshedAt.toLocaleTimeString("th-TH")}`}
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
