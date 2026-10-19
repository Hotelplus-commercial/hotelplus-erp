/* Contract Renewal v1.0 — renewal-card panel, approval list (PM / HOC·MD) and ticket attachments. Labels from ps-glossary. */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { InfoButton } from "@/components/ps/dash-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { APPROVER_ROLE_TH, RENEWAL_LABEL_TH as L, RENEWAL_RECO_TH, renewalReqStatusTh } from "@/lib/ps-glossary";
import { usePsRenewal, type RenewalCard } from "@/lib/ps-renewal";
import { isOverdue, type ApproverRole, type RecoSnapshot, type RenewalRequest } from "@/lib/renewal-rules";
import {
  approveRequest, entityClosed, isRenewalDemo, liveLinkPathFor, latestRequestFor,
  renewalConfig, renewalNow, returnBack, sendRenewalLink, signRequest, signedAwaitingDone, startRenewal, useRenewalStore,
} from "@/lib/renewal-store";
import { addAttachment, attachmentError, ticketById, useTickets, STATUS_TH, type L0Ticket } from "@/lib/tickets-l0";

const thb = (n: number) => `฿${n.toLocaleString("th-TH")}`;
export const recoLabel = (r: RecoSnapshot) => r.type === "RAISE" ? RENEWAL_RECO_TH.RAISE(r.band_min_pct ?? 0, r.band_max_pct ?? 0) : RENEWAL_RECO_TH[r.type];
const toneOf = (s: RenewalRequest["status"]) => s === "SIGNED" || s === "READY_TO_SEND" || s === "APPROVED" ? "success" : s === "RETURNED" || s === "PENDING_APPROVAL" ? "warn" : s === "DECLINED" ? "danger" : "muted";

export function RecoBox({ reco }: { reco: RecoSnapshot }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <span className="font-semibold">คำแนะนำระบบ: {recoLabel(reco)}</span>
      <InfoButton info={{ source: "กล่อง Repricing (อ่านอย่างเดียว)", count: reco.reasons.join(" · ") || "—", read: L.ruleNote }} />
      {reco.reasons.length > 0 && <span className="text-xs text-muted-foreground">{reco.reasons.join(" · ")}</span>}
    </div>
  );
}

export function RenewalRequestChips({ cardId }: { cardId: string }) {
  useRenewalStore();
  const r = latestRequestFor(cardId);
  if (!r) return null;
  return (
    <>
      <Chip tone={toneOf(r.status)}>{renewalReqStatusTh(r.status)}</Chip>
      {isOverdue(r, renewalNow(), renewalConfig) && <Chip tone="danger">{L.overdue(renewalConfig.renewal_approval_overdue_days)}</Chip>}
    </>
  );
}

/** v1.1 red "1" badge: customer signed, card waiting for Mark as Done. */
export function SignedBadge({ card }: { card: Pick<RenewalCard, "id" | "status"> }) {
  useRenewalStore();
  if (!signedAwaitingDone(card)) return null;
  return <span role="img" aria-label={L.signedBadge} title={L.signedBadge} className="inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground tabular-nums">1</span>;
}

const fmtDT = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).replace(",", "") : "—";

/** v1.1 "ต่อสัญญา" block inside the renewal card. Outcome is set only via Mark as Done; no rollback. */
export function RenewalRequestPanel({ card, currentUser }: { card: RenewalCard; currentUser: string }) {
  useRenewalStore(); useTickets();
  const navigate = useNavigate();
  const { addActivity } = usePsRenewal();
  const owner = card.owner === currentUser;
  const req = latestRequestFor(card.id);
  const done = card.status === "COMPLETED" || card.status === "CHURN";
  const search = (step?: number) => ({ ...(isRenewalDemo() ? { demo: 1 } : {}), ...(step ? { step } : {}) }) as never;
  const openWizard = (step?: number) => {
    const o = startRenewal(card);
    if (!o.ok) { toast.error(o.error); return; }
    void navigate({ to: "/ps/contract-wizard/renew/$contractId", params: { contractId: o.req.source_contract_id }, search: search(step) });
  };
  const resend = (r: RenewalRequest) => { const o = sendRenewalLink(r.id); o.ok ? toast.success(L.resendLive) : toast.error(o.error); };
  const simulate = (r: RenewalRequest) => {
    const o = signRequest(r.id); if (!o.ok) { toast.error(o.error); return; }
    addActivity(card.id, { type: "Contract", at: "วันนี้", note: `ลูกค้าเซ็นสัญญาต่ออายุ · เริ่ม ${o.req.new_terms.start_date}`, file: `${o.req.new_contract_id}.pdf`, by: "ลูกค้า" });
    toast.success(L.signedBadge);
  };
  const entityTicket = req?.entity_ticket_id ? ticketById(req.entity_ticket_id) : undefined;
  const st = req?.status;
  const liveHref = req ? liveLinkPathFor(req.id) : null;

  return (
    <section className="space-y-2 rounded-xl border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · {L.renew}</p>
      {req && st !== "CANCELLED" && st !== "LINK_SENT" && st !== "SIGNED" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip tone={toneOf(req.status)}>{renewalReqStatusTh(req.status)}</Chip>
          {isOverdue(req, renewalNow(), renewalConfig) && <Chip tone="danger">{L.overdue(renewalConfig.renewal_approval_overdue_days)}</Chip>}
          <span className="text-xs text-muted-foreground">{thb(req.old_terms.fee_amount)} → {thb(req.new_terms.fee_amount)} · เริ่ม {req.new_terms.start_date}</span>
          {st === "RETURNED" && req.return_comment && <span className="text-xs text-warning-foreground">ความเห็น: {req.return_comment}</span>}
          {entityTicket && <span className="text-xs text-muted-foreground">#{entityTicket.ticket_id} · {STATUS_TH[entityTicket.status]}</span>}
        </div>
      )}
      {(st === "LINK_SENT" || st === "SIGNED") && req && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Live link</span>
            <Chip tone={st === "SIGNED" ? "success" : "warn"}>{st === "SIGNED" ? L.signedAt(fmtDT(req.signed_at)) : L.notSigned}</Chip>
            <span className="text-xs text-muted-foreground">ส่งเมื่อ {fmtDT(req.link_sent_at)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveHref ? <Button size="sm" variant="outline" asChild><a href={liveHref} target="_blank" rel="noreferrer">{L.openLive}</a></Button> : <span className="text-xs text-warning-foreground">ไม่พบ live link · กด {L.resendLive}</span>}
            {st === "LINK_SENT" && owner && !done && <Button size="sm" variant="outline" onClick={() => resend(req)}>{L.resendLive}</Button>}
            {st === "LINK_SENT" && isRenewalDemo() && !done && <Button size="sm" variant="ghost" onClick={() => simulate(req)}>{L.simulateSign}</Button>}
          </div>
          {st === "SIGNED" && !done && <p className="text-xs text-muted-foreground">{L.signedHint}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {owner && !done && (!req || st === "CANCELLED") && <Button size="sm" onClick={() => openWizard()}>{L.renew}</Button>}
        {owner && !done && (st === "DRAFT" || st === "RETURNED") && <Button size="sm" onClick={() => openWizard()}>{L.continueEdit}</Button>}
        {st === "PENDING_APPROVAL" && <Button size="sm" variant="outline" onClick={() => openWizard(3)}>{L.viewRequest}</Button>}
        {owner && !done && (st === "APPROVED" || st === "READY_TO_SEND") && req && (
          <>
            {!entityClosed(req) && <span className="self-center text-xs text-warning-foreground">{L.waitEntity}</span>}
            <Button size="sm" disabled={!entityClosed(req)} onClick={() => openWizard(3)}>{L.reviewSend}</Button>
          </>
        )}
      </div>
    </section>
  );
}

/** ✅ lane: PM sees every pending item; The Office (HOC / MD) sees only overdue ones. First action wins. */
export function RenewalApprovalList({ scope }: { scope: "PM" | "OVERDUE" }) {
  const s = useRenewalStore(); useTickets();
  const [role, setRole] = useState<ApproverRole>(scope === "PM" ? "PM" : "HOC");
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const now = renewalNow();
  const items = s.requests.filter((r) => r.status === "PENDING_APPROVAL" && (scope === "PM" || isOverdue(r, now, renewalConfig)));
  const by = role === "PM" ? "PM001-Alex" : role;
  const act = (r: RenewalRequest, kind: "approve" | "return") => {
    const o = kind === "approve" ? approveRequest(r.id, by, role) : returnBack(r.id, by, role, comment);
    if (!o.ok) { toast.error(o.error); return; }
    setComment(""); setOpenId(null); toast.success(renewalReqStatusTh(o.req.status));
  };
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">✅ อนุมัติเงื่อนไขต่อสัญญา ({items.length})</h4>
        {scope === "OVERDUE" && (
          <select aria-label="ผู้อนุมัติ" className="rounded-md border bg-background px-2 py-1 text-xs" value={role} onChange={(e) => setRole(e.target.value as ApproverRole)}>
            {(["HOC", "MD"] as const).map((r) => <option key={r} value={r}>{APPROVER_ROLE_TH[r]}</option>)}
          </select>
        )}
      </div>
      {!items.length && <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">ไม่มีรายการรออนุมัติ</div>}
      {items.map((r) => {
        const d = r.new_terms.fee_amount - r.old_terms.fee_amount;
        const pct = r.old_terms.fee_amount ? (d / r.old_terms.fee_amount) * 100 : 0;
        const last = [...s.history].filter((h) => h.contract_id === r.source_contract_id).sort((a, b) => b.cycle_no - a.cycle_no)[0];
        const t = ticketById(r.entity_ticket_id);
        return (
          <div key={r.id} className="space-y-2 rounded-md border p-2 text-sm">
            <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              <span className="font-medium">{L.approvalItem(r.hotel_name)}</span>
              {isOverdue(r, now, renewalConfig) && <Chip tone="danger">{L.overdue(renewalConfig.renewal_approval_overdue_days)}</Chip>}
            </button>
            {openId === r.id && (
              <div className="space-y-2">
                <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-1 text-xs">
                  <dt className="text-muted-foreground">เงื่อนไข</dt><dd>{thb(r.old_terms.fee_amount)} → {thb(r.new_terms.fee_amount)} ({d >= 0 ? "+" : ""}{thb(d)} · {pct.toFixed(1)}%) · {r.changed_fields.map((f) => L.fields[f]).join(", ") || "—"}</dd>
                  <dt className="text-muted-foreground">คำแนะนำระบบ</dt><dd>{recoLabel(r.reco_snapshot)}</dd>
                  <dt className="text-muted-foreground">เหตุผล AE</dt><dd>{r.reason_code ? `${r.reason_code}${r.reason_text ? ` · ${r.reason_text}` : ""}` : "—"}</dd>
                  <dt className="text-muted-foreground">ราคาล่าสุด</dt><dd>{last ? `รอบ ${last.cycle_no} · ${thb(last.fee_amount)} · ${last.effective_from} – ${last.effective_to}` : "—"}</dd>
                  <dt className="text-muted-foreground">เปลี่ยนนิติบุคคล</dt><dd>{t ? `#${t.ticket_id} · ${STATUS_TH[t.status]}` : "ไม่มี"}</dd>
                </dl>
                <Textarea aria-label="ความเห็นเมื่อส่งกลับ" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="ความเห็น (บังคับเมื่อส่งกลับ)" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(r, "approve")}>{L.approve}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(r, "return")}>{L.returnBack}</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Ticket attachments: file name, size, uploader, time; open / download; add up to 5 (PDF/JPG/PNG ≤5 MB). */
export function TicketAttachments({ t, by, readOnly }: { t: L0Ticket; by: string; readOnly?: boolean }) {
  const list = t.payload.attachments ?? [];
  const [err, setErr] = useState<string | null>(null);
  const onFile = (f: File | undefined) => {
    if (!f) return;
    const e = attachmentError(list.length, { size: f.size, mime: f.type }); if (e) { setErr(e); return; }
    const rd = new FileReader();
    rd.onload = () => setErr(addAttachment(t.ticket_id, { name: f.name, size: f.size, mime: f.type, by, data_url: String(rd.result) }));
    rd.readAsDataURL(f);
  };
  if (!list.length && readOnly) return null;
  return (
    <div className="space-y-1 border-t pt-2 text-xs">
      <p className="font-medium">ไฟล์แนบ ({list.length}/5)</p>
      {list.map((a) => (
        <p key={a.id} className="flex flex-wrap gap-2">
          <a className="text-primary underline" href={a.data_url} download={a.name} target="_blank" rel="noreferrer">📎 {a.name}</a>
          <span className="text-muted-foreground">{(a.size / 1024).toFixed(0)} KB · {a.by} · {new Date(a.at).toLocaleString("th-TH")}</span>
        </p>
      ))}
      {!readOnly && list.length < 5 && <input aria-label="แนบไฟล์" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFile(e.target.files?.[0])} />}
      {err && <p role="alert" className="text-warning-foreground">{err}</p>}
    </div>
  );
}
