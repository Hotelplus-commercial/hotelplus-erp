/* Tab R3 §5 — ContractHistoryDrawer (contract level; separate from Account 360). Opened by a row click and by `+ สร้าง`
 * with identical content, scrolled to the top. The only write: one WELCOME_BACK ticket via Ticket L0 createWelcomeBack(),
 * which re-checks the per-contract lock inside the write (§6.3). */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { InfoButton } from "./dash-card";
import { useAccount360 } from "./account-360";
import { CL, R1_STATUS_TH, ticketTypeTh } from "@/lib/ps-glossary";
import { createWelcomeBack, peekNextSeq, ticketIdOf, type L0Ticket } from "@/lib/tickets-l0";
import { reasonLabel } from "@/lib/renewal-r2";
import {
  ageText, lastCycle, openWelcomeBack, quarterLabel, rateText, sinceText, thDate, timelineOf, welcomeBackInput,
  type ChurnRow, type TimelineEvent, type WelcomeBackDraft,
} from "@/lib/contract-age";
import type { ContractAgeFeed } from "./use-contract-age";
import { cn } from "@/lib/utils";

export function ContractHistoryDrawer({ row, feed, draft, onDraft, onClose }: {
  row: ChurnRow; feed: ContractAgeFeed; draft: WelcomeBackDraft; onDraft: (d: WelcomeBackDraft) => void; onClose: () => void;
}) {
  const { openAccount360 } = useAccount360();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const back = useRef<HTMLElement | null>(null);
  const [role, setRole] = useState<"PM" | "PS" | "AE">("PM");
  const [reserved, setReserved] = useState(() => ticketIdOf(peekNextSeq()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    back.current = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); back.current?.focus?.(); };
  }, [onClose]);
  // Same drawer for row click and `+ สร้าง`: always scrolled to the top (never jumps to the message box).
  useEffect(() => { bodyRef.current?.scrollTo?.({ top: 0 }); bodyRef.current?.focus?.(); setErr(null); setReserved(ticketIdOf(peekNextSeq())); }, [row.contract_id]);

  const today = feed.today;
  const cycle = lastCycle(feed.history, row.chain_ids);
  const upsell = feed.upsell[row.contract_id] ?? [];
  const mine = feed.tickets.filter((t) => t.type === "WELCOME_BACK" && row.chain_ids.some((id) => t.subject_ref.contract_id === id || t.payload.contract_id === id));
  const lock = openWelcomeBack(feed.tickets, row.contract_id);
  const timeline: TimelineEvent[] = timelineOf(row, { history: feed.history, tickets: feed.tickets, firstMeeting: feed.firstMeeting[row.chain_root_contract_id] ?? feed.firstMeeting[row.contract_id] ?? null, lowSurveys: feed.lowSurveys[row.contract_id] ?? [], typeLabel: (t: L0Ticket) => ticketTypeTh(t.type) });
  const rec = row.reason;
  const outcome = CL.outcome[row.outcome ?? ""] ?? "";
  const name = row.hotel_name_en ?? row.hotel_name_th ?? row.hotel_id;
  const set = (p: Partial<WelcomeBackDraft>) => onDraft({ ...draft, ...p });
  const timelineVisible = lock ? showLocked : draft.timelineShared;

  const send = () => {
    if (busy) return;
    setBusy(true); setErr(null);
    const input = welcomeBackInput(row, { ticket_id: reserved, role, draft, cycle, upsell, reason: rec, timeline, label: reasonLabel, today });
    const o = createWelcomeBack(input, feed.seedTickets);
    setBusy(false);
    if (o.ok) {
      toast.success(CL.drawer.sent(o.ticket_id));
      onDraft({ message: "", timelineShared: false, files: [] });
      setReserved(ticketIdOf(peekNextSeq()));
      return;
    }
    if (o.locked) return; // re-renders in the locked state (the open ticket is in the list)
    setErr(o.error); toast.error(CL.drawer.failed(o.error));
  };

  const D = CL.drawer;
  return (
    <div className="cl-drawer-root" data-testid="cl-drawer">
      <button type="button" className="cl-drawer-mask" aria-label={D.close} onClick={onClose} />
      <aside className="cl-drawer" role="dialog" aria-modal="true" aria-label={`${D.kicker} · ${name}`}>
        <div className="cl-drawer-body" ref={bodyRef} tabIndex={-1}>
          {/* 1 header */}
          <header className="cl-dh" data-sec="header">
            <div className="min-w-0">
              <div className="cl-kicker">{D.kicker}</div>
              <h3>{name}</h3>
              {row.hotel_name_th && row.hotel_name_th !== name && <div className="cl-sub">{row.hotel_name_th}</div>}
              <div className="cl-sub tabular-nums">{row.contract_id} <span className={cn("r1-svc", row.service_line === "ORM" ? "svc-orm" : "svc-marcom")}>{row.service_line}</span></div>
            </div>
            <button type="button" className="cl-x" onClick={onClose} aria-label={D.close}>✕</button>
          </header>

          {/* 2 contract info */}
          <div className="cl-dsec" data-sec="info">
            <h4>{D.info}</h4>
            <dl className="cl-grid2">
              <dt>{D.signed}</dt><dd>{thDate(row.signed_at)}</dd>
              <dt>{D.goLive}</dt><dd>{thDate(row.first_go_live_at)}{row.go_live_quarter ? ` · ${quarterLabel(row.go_live_quarter)}` : ""}</dd>
              <dt>{D.renewalsLabel}</dt><dd>{D.renewals(row.renewals_count)}</dd>
              <dt>{row.outcome === "LOST" ? D.noticeLost : D.noticeNR}</dt><dd>{thDate(row.notice_at)}</dd>
              <dt>{D.ae}</dt><dd>{row.ae_name ?? "—"}</dd>
              <dt>{row.service_line === "ORM" ? D.ormTeam : D.marcom}</dt><dd>{row.team_label ?? "—"}</dd>
            </dl>
          </div>

          {/* 3 package & rate (latest cycle of contract_price_history) */}
          <div className="cl-dsec" data-sec="package">
            <h4>{D.pkg}</h4>
            {!cycle ? <p className="cl-muted">{D.noHistory}</p> : row.service_line === "ORM" ? (
              <dl className="cl-grid2"><dt>{D.pkgOrm}</dt><dd>{cycle.package}</dd><dt>{D.rateOrm}</dt><dd>{rateText(cycle)}</dd></dl>
            ) : (
              <dl className="cl-grid2">
                <dt>{D.pkgMain}</dt><dd>{cycle.package}{cycle.fee_amount ? ` · ${D.perMonth(cycle.fee_amount)}` : ""}</dd>
                {upsell.length > 0 && <><dt>{D.upsell}</dt><dd>{upsell.map((u) => <div key={u.sku}>{u.sku} · {D.perMonth(u.price)}</div>)}</dd></>}
              </dl>
            )}
          </div>

          {/* 4 timeline */}
          <div className="cl-dsec" data-sec="timeline">
            <div className="cl-dsec-head">
              <h4>{D.timeline}</h4>
              {lock ? (
                <button type="button" role="switch" aria-checked={showLocked} className={cn("rn2-switch", showLocked && "is-on")} onClick={() => setShowLocked((x) => !x)}><i aria-hidden /> {showLocked ? D.hideT : D.showT}</button>
              ) : (
                <button type="button" role="switch" aria-checked={draft.timelineShared} data-testid="cl-timeline-switch" className={cn("rn2-switch", draft.timelineShared && "is-on")} onClick={() => set({ timelineShared: !draft.timelineShared })}><i aria-hidden /> {draft.timelineShared ? D.shareOn : D.shareOff}</button>
              )}
            </div>
            {timelineVisible ? (
              <ol className="cl-tl" data-testid="cl-timeline">
                {timeline.map((e, i) => <li key={`${e.at}-${i}`} className={`tone-${e.tone}`}><span className="cl-tl-dot" aria-hidden /><span className="tabular-nums">{thDate(e.at)}</span> · {e.text}</li>)}
              </ol>
            ) : !lock && <p className="cl-muted">{D.timelineOffNote}</p>}
          </div>

          {/* 5 exit status */}
          <div className={cn("cl-exit", row.outcome === "LOST" ? "is-lost" : "is-nr")} data-sec="exit">
            <div className="cl-exit-outcome">{outcome}</div>
            <div className="cl-exit-big">{D.endedFor(sinceText(row.since_days))}</div>
            <div className="cl-sub tabular-nums">{D.endLine(thDate(row.ended_at), row.age_days ?? 0, ageText(row.age_days))}</div>
          </div>

          {/* 6 why */}
          <div className="cl-dsec" data-sec="why">
            <h4>{D.why}</h4>
            {rec ? (
              <>
                <div className="cl-chiprow"><span className="cl-chiplabel">{CL.dot.primary}</span>{rec.primary.map((k) => <span key={k} className="cl-chip is-red">{reasonLabel(k)}</span>)}</div>
                <div className="cl-chiprow"><span className="cl-chiplabel">{CL.dot.secondary}</span><span className="cl-chip is-amber">{reasonLabel(rec.secondary)}</span></div>
                {rec.note && <p className="cl-note">{D.aeNote(rec.created_by.display, rec.note)}</p>}
              </>
            ) : <p className="cl-muted">{CL.dot.noReason}</p>}
          </div>

          {lock ? (
            <div className="cl-lockbox" role="status" data-testid="cl-locked">{D.locked(lock.ticket_id, R1_STATUS_TH[lock.status] ?? lock.status)}</div>
          ) : (
            /* 7 message */
            <div className="cl-dsec" data-sec="message">
              <h4>{D.msg}</h4>
              <p className="cl-muted">{D.msgHint}</p>
              <textarea className="r1-input cl-textarea" rows={3} value={draft.message} aria-label={D.msg} placeholder={D.msgHint} onChange={(e) => set({ message: e.target.value })} />
              <div className="cl-attach">
                <button type="button" disabled title={D.attachOff}>{D.attach}</button>
                <small>{D.attachOff}</small>
                <InfoButton info={{ read: D.attachInfo }} />
              </div>
            </div>
          )}

          {/* 8 tickets of this contract + send area */}
          <div className="cl-dsec" data-sec="tickets">
            <h4>{D.tickets}</h4>
            {mine.length ? (
              <ul className="cl-tlist">
                {mine.map((t) => <li key={t.ticket_id}><span className="cl-tpill">#{t.ticket_id} · {R1_STATUS_TH[t.status] ?? t.status}</span> {D.ticketLine(thDate(t.created_at.slice(0, 10)), !!t.payload.timeline_shared, t.payload.drive_attachments?.length ?? 0)}</li>)}
              </ul>
            ) : <p className="cl-muted">{D.noTickets}</p>}
            {!lock && (
              <div className="cl-send" data-testid="cl-send">
                <div className="cl-to">
                  <strong>{D.to}</strong><span className="r1-new">{D.newBadge}</span><span className="tabular-nums">#{reserved}</span>
                  <label className="cl-role">{D.actAs}
                    <select value={role} onChange={(e) => setRole(e.target.value as "PM" | "PS" | "AE")}>{(["PM", "PS", "AE"] as const).map((r) => <option key={r} value={r}>{D.roles[r]}</option>)}</select>
                  </label>
                </div>
                <div className="cl-summary" data-testid="cl-summary">
                  <strong>{D.summary}</strong>
                  <ul>
                    <li>{D.sumItems.info}</li><li>{D.sumItems.pkg}</li>
                    {draft.timelineShared && <li>{D.sumItems.timeline}</li>}
                    <li>{D.sumItems.exit}</li><li>{D.sumItems.why}</li>
                    {draft.message.trim() && <li>{D.sumItems.msg}</li>}
                    {draft.files.length > 0 && <li>{D.sumItems.files(draft.files.length)}</li>}
                  </ul>
                  {!draft.timelineShared && <small>{D.sumItems.noTimeline}</small>}
                </div>
                {err && <p className="cl-err" role="alert">{D.failed(err)}</p>}
                <button type="button" className="cl-sendbtn" disabled={busy} onClick={send}>{busy ? D.sending : D.send}</button>
              </div>
            )}
          </div>

          {/* 9 Account 360 */}
          <button type="button" className="r1-linkbtn cl-360" onClick={() => openAccount360(row.hotel_id)}>{D.open360}</button>
        </div>
      </aside>
    </div>
  );
}
