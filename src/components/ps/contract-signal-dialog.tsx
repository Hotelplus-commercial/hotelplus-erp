/* Tab R1 §6.1–§6.5 — "สร้าง Ticket" dialog. One recipient box = one CONTRACT_SIGNAL ticket (kind New).
 * Ticket numbers are reserved when a box appears and reused on resend. Writes only through Ticket L0 createTask. */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InfoButton } from "./dash-card";
import { GuidedTour } from "./guided-tour";
import { R1_DIALOG, R1_TOUR, R1_STATUS_TH } from "@/lib/ps-glossary";
import { createTask, reserveTicketId, ticketById, type Creator, type L0Ticket, type TicketAssignee } from "@/lib/tickets-l0";
import { addAeLabels } from "@/lib/contract-health-store";
import {
  SIGNAL_CATALOG, SIGNAL_GROUPS, canSend, catalogByKey, duplicateHits, isSelectable, newAeLabels, recipientDept, sendBatch, unsent, warnBdm,
  type AeLabel, type Box, type HealthRow, type RecipientRole,
} from "@/lib/contract-tab-r1";
import { cn } from "@/lib/utils";

type Recipient = TicketAssignee & { role: RecipientRole };
const thDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });

function recipientsOf(row: HealthRow): Recipient[] {
  const out: Recipient[] = [];
  out.push({ member_id: row.ae ?? "AE", display: `AE · ${row.ae_name}`, role: "AE" });
  if (row.service === "ORM" && row.orm_team) out.push({ member_id: `ORM:${row.orm_team}`, display: `ORM ทีม ${row.orm_team}`, role: "ORM" });
  if (row.service === "Marcom" && row.marcom) out.push({ member_id: `MARCOM:${row.marcom}`, display: `Marcom · ${row.marcom}`, role: "MARCOM" });
  out.push({ member_id: "HEAD_AE", display: R1_DIALOG.recipients.HEAD_AE, role: "HEAD_AE" });
  out.push({ member_id: "HEAD_ORM", display: R1_DIALOG.recipients.HEAD_ORM, role: "HEAD_ORM" });
  out.push({ member_id: "HEAD_MARCOM", display: R1_DIALOG.recipients.HEAD_MARCOM, role: "HEAD_MARCOM" });
  out.push({ member_id: "BDM", display: R1_DIALOG.recipients.BDM, role: "BDM" });
  return out;
}

export function ContractSignalDialog({ row, tickets, labels, by, creator, demo, onClose }: {
  row: HealthRow; tickets: L0Ticket[]; labels: AeLabel[]; by: TicketAssignee; creator: Creator; demo: boolean; onClose: () => void;
}) {
  const recipients = useMemo(() => recipientsOf(row), [row]);
  const batch = useRef(`B-${Date.now().toString(36)}`).current;
  const [boxes, setBoxes] = useState<Box[]>(() => [{ ticket_id: reserveTicketId(), recipient: recipients[0]!, labels: [], note: "", state: "draft" }]);
  const [sel, setSel] = useState(() => boxes[0]!.ticket_id);
  const [q, setQ] = useState("");
  const [dups, setDups] = useState<ReturnType<typeof duplicateHits> | null>(null);
  const [busy, setBusy] = useState(false);
  const [tour, setTour] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const found = useMemo(() => [...new Set([...row.signals.map((s) => s.key), ...row.ae_labels.map((l) => l.label_key)])], [row]);
  const selectable = SIGNAL_CATALOG.filter(isSelectable);
  const qn = q.trim().toLowerCase();
  const filtered = selectable.filter((e) => !qn || e.label.toLowerCase().includes(qn) || SIGNAL_GROUPS[e.group]!.toLowerCase().includes(qn));
  const sysKeys = new Set(row.signals.map((s) => s.key));
  const notFound = SIGNAL_CATALOG.filter((e) => (e.src === "A" || e.src === "MA") && !sysKeys.has(e.key));
  const locked = (b: Box) => b.state === "ok" || b.state === "sending";

  const addLabel = (boxId: string, key: string) => setBoxes((bs) => bs.map((b) => (b.ticket_id === boxId && !locked(b) && !b.labels.includes(key) ? { ...b, labels: [...b.labels, key] } : b)));
  const removeLabel = (boxId: string, key: string) => setBoxes((bs) => bs.map((b) => (b.ticket_id === boxId && !locked(b) ? { ...b, labels: b.labels.filter((l) => l !== key) } : b)));
  const addAll = () => setBoxes((bs) => bs.map((b) => (locked(b) ? b : { ...b, labels: [...new Set([...b.labels, ...found])] })));
  const addRecipient = (r: Recipient) => {
    const id = reserveTicketId();
    setBoxes((bs) => [...bs, { ticket_id: id, recipient: r, labels: [], note: "", state: "draft" }]);
    setSel(id); setAddOpen(false);
  };
  const usedRecipients = new Set(boxes.map((b) => `${b.recipient.role}|${b.recipient.member_id}`));
  const pending = unsent(boxes);
  const emptyCount = pending.filter((b) => !b.labels.length).length;
  const failed = boxes.some((b) => b.state === "fail");

  const write = (b: Box) => {
    createTask({
      type: "CONTRACT_SIGNAL", ticket_id: b.ticket_id, target_dept: recipientDept(b.recipient.role), assignee: { member_id: b.recipient.member_id, display: b.recipient.display, role: b.recipient.role },
      subject_ref: { hotel_id: row.hotel_id, hotel_name: row.hotel_name, gap_service: row.service, service_line: row.service, contract_id: row.contract_id, service: row.service },
      payload: { readiness_tier: "", chips: [], note: b.note, kind: "NEW", labels: b.labels, batch_id: batch, contract_id: row.contract_id, drive_attachments: [] },
      created_by: creator,
    });
    return !!ticketById(b.ticket_id);
  };
  const send = async (confirmed = false) => {
    if (!canSend(boxes) || busy) return;
    if (!confirmed) {
      const hits = duplicateHits(boxes, row.contract_id, tickets);
      if (hits.length) { setDups(hits); return; }
    }
    setDups(null); setBusy(true);
    setBoxes((bs) => bs.map((b) => (b.state === "ok" ? b : { ...b, state: "sending" })));
    const res = await sendBatch(boxes, write, 10_000, R1_DIALOG.timeout);
    const at = new Date().toISOString();
    let acc = [...labels];
    for (const b of res) if (b.state === "ok" && boxes.find((x) => x.ticket_id === b.ticket_id)?.state !== "ok") {
      const add = newAeLabels(b, row, acc, batch, at, by);
      acc = [...acc, ...add];
      if (add.length) addAeLabels(demo, add);
    }
    setBoxes(res); setBusy(false);
    const ok = res.filter((b) => b.state === "ok").length, bad = res.filter((b) => b.state === "fail").length;
    if (!bad) { toast.success(R1_DIALOG.toastAll(ok)); onClose(); }
    else toast.error(R1_DIALOG.toastPartial(ok, bad));
  };

  const chip = (key: string, opts: { from?: "sys" | "ae"; draggable?: boolean; onClick?: () => void; remove?: (() => void) | undefined; disabled?: boolean } = {}) => {
    const e = catalogByKey.get(key);
    if (!e) return null;
    return (
      <span key={key} role={opts.onClick ? "button" : undefined} tabIndex={opts.onClick ? 0 : undefined} title={`${e.label} · ${e.group}. ${SIGNAL_GROUPS[e.group]} · ${e.rule}`}
        draggable={opts.draggable && !opts.disabled} onDragStart={(ev) => ev.dataTransfer.setData("text/plain", key)}
        onClick={opts.disabled ? undefined : opts.onClick} onKeyDown={(ev) => { if ((ev.key === "Enter" || ev.key === " ") && opts.onClick && !opts.disabled) { ev.preventDefault(); opts.onClick(); } }}
        className={cn("r1-chip", `is-${e.dir}`, opts.from === "ae" && "is-ae", opts.disabled && "is-disabled")}>
        {e.dir === "bad" ? "▼" : e.dir === "good" ? "▲" : "★"} {e.label}
        {opts.remove && <button type="button" aria-label={`${R1_DIALOG.remove} ${e.label}`} className="r1-chip-x" onClick={(ev) => { ev.stopPropagation(); opts.remove!(); }}>×</button>}
      </span>
    );
  };

  const target = boxes.find((b) => b.ticket_id === sel && !locked(b)) ?? boxes.find((b) => !locked(b));
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy && !tour) onClose(); }}>
      <DialogContent ref={rootRef} className="r1-dialog" onEscapeKeyDown={(e) => { if (tour) e.preventDefault(); }}>
          <DialogHeader className="r1-dialog-head">
            <DialogTitle>{R1_DIALOG.title} · {row.hotel_name} · {row.service}</DialogTitle>
            <DialogDescription className="sr-only">{R1_DIALOG.toInfo}</DialogDescription>
            <button type="button" className="r1-help" onClick={() => setTour(true)}>? วิธีใช้</button>
          </DialogHeader>
          <div className="r1-dialog-body">
            <div className="r1-dialog-left">
              <section data-tour="d1" className="r1-dsec">
                <h3>{R1_DIALOG.sec1}<InfoButton info={{ read: R1_DIALOG.sec1Info }} /></h3>
                <div className="r1-dzone"><span>{R1_DIALOG.sec1System}</span><div className="r1-chips">{row.signals.length ? row.signals.map((s) => chip(s.key, { from: "sys", draggable: true, onClick: () => target && addLabel(target.ticket_id, s.key) })) : <em>—</em>}</div></div>
                <div className="r1-dzone"><span>{R1_DIALOG.sec1Ae}</span><div className="r1-chips">{row.ae_labels.length ? row.ae_labels.map((l) => chip(l.label_key, { from: "ae", draggable: true, onClick: () => target && addLabel(target.ticket_id, l.label_key) })) : <em>—</em>}</div></div>
                {found.length > 0 && <button type="button" className="r1-linkbtn" onClick={addAll}>{R1_DIALOG.addAll}</button>}
              </section>
              <section data-tour="d2" className="r1-dsec">
                <h3>{R1_DIALOG.sec2(selectable.length)}<InfoButton info={{ read: R1_DIALOG.sec2Info }} /></h3>
                <input className="r1-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={R1_DIALOG.search} aria-label={R1_DIALOG.search} />
                <div className="r1-pick">
                  {filtered.length === 0 ? <p className="r1-muted">{R1_DIALOG.noMatch}</p> : Object.keys(SIGNAL_GROUPS).map(Number).map((g) => {
                    const list = filtered.filter((e) => e.group === g);
                    if (!list.length) return null;
                    return <div key={g} className="r1-pick-group"><div className="r1-pick-head">{g}. {SIGNAL_GROUPS[g]}</div><div className="r1-chips">{list.map((e) => chip(e.key, { draggable: true, onClick: () => target && addLabel(target.ticket_id, e.key) }))}</div></div>;
                  })}
                </div>
              </section>
              <details className="r1-dsec r1-sec3">
                <summary>{R1_DIALOG.sec3(notFound.length)}<InfoButton info={{ read: R1_DIALOG.sec3Info }} /></summary>
                <ul>
                  {notFound.map((e) => (
                    <li key={e.key} title={R1_DIALOG.systemOnly}>
                      {chip(e.key, { disabled: true })}
                      <small>{e.src === "MA" ? R1_DIALOG.reasonMarcom : row.evaluated.includes(e.key) ? R1_DIALOG.reasonChecked : R1_DIALOG.reasonNoData}</small>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
            <div className="r1-dialog-right" data-tour="d3">
              <h3>{R1_DIALOG.to(boxes.length)}<InfoButton info={{ read: R1_DIALOG.toInfo }} /></h3>
              <div className="r1-boxes">
                {boxes.map((b, i) => (
                  <div key={b.ticket_id} data-testid="r1-box" role="group" aria-label={b.recipient.display}
                    className={cn("r1-box", sel === b.ticket_id && !locked(b) && "is-selected", b.state === "ok" && "is-ok", b.state === "fail" && "is-fail", dropOn === b.ticket_id && "is-drop")}
                    onClick={() => !locked(b) && setSel(b.ticket_id)}
                    onDragOver={(e) => { if (!locked(b)) { e.preventDefault(); setDropOn(b.ticket_id); } }}
                    onDragLeave={() => setDropOn(null)}
                    onDrop={(e) => { e.preventDefault(); setDropOn(null); const k = e.dataTransfer.getData("text/plain"); if (k) addLabel(b.ticket_id, k); }}>
                    <div className="r1-box-head">
                      <strong>{b.recipient.display}</strong>
                      <span className="tabular-nums">#{b.ticket_id}</span>
                      <span className="r1-new">{R1_DIALOG.newBadge}</span>
                      {b.state === "ok" && <span className="r1-ok">{R1_DIALOG.ok}</span>}
                      {b.state === "fail" && <span className="r1-fail">{R1_DIALOG.fail(b.error ?? "")}</span>}
                    </div>
                    <div className="r1-chips r1-box-chips">
                      {b.labels.length ? b.labels.map((k) => chip(k, { remove: locked(b) ? undefined : () => removeLabel(b.ticket_id, k) })) : <span className="r1-muted">{R1_DIALOG.drop}</span>}
                    </div>
                    <textarea className="r1-input" rows={2} disabled={locked(b)} value={b.note} placeholder={R1_DIALOG.note} aria-label={R1_DIALOG.note}
                      onChange={(e) => setBoxes((bs) => bs.map((x) => (x.ticket_id === b.ticket_id ? { ...x, note: e.target.value } : x)))} onClick={(e) => e.stopPropagation()} />
                    <div className="r1-box-foot">
                      <span className="r1-attach">
                        <button type="button" disabled title={R1_DIALOG.attachOff}>{R1_DIALOG.attach}</button>
                        <small>{R1_DIALOG.attachOff}</small>
                        <InfoButton info={{ read: R1_DIALOG.attachInfo }} />
                      </span>
                      {i > 0 && !locked(b) && <button type="button" className="r1-linkbtn" onClick={(e) => { e.stopPropagation(); setBoxes((bs) => bs.map((x) => (x.ticket_id === b.ticket_id ? { ...x, labels: [...boxes[0]!.labels] } : x))); }}>{R1_DIALOG.copyFirst}</button>}
                      {boxes.length > 1 && b.state === "draft" && <button type="button" className="r1-linkbtn" onClick={(e) => { e.stopPropagation(); setBoxes((bs) => bs.filter((x) => x.ticket_id !== b.ticket_id)); }}>{R1_DIALOG.remove}</button>}
                    </div>
                  </div>
                ))}
              </div>
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild><button type="button" className="r1-add" data-tour="d4">{R1_DIALOG.addRecipient}</button></PopoverTrigger>
                <PopoverContent align="start" className="r1-pop">
                  {recipients.filter((r) => !usedRecipients.has(`${r.role}|${r.member_id}`)).map((r) => (
                    <button key={`${r.role}|${r.member_id}`} type="button" className="r1-pop-item" onClick={() => addRecipient(r)}>{r.display}</button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {dups && (
            <div className="r1-dup" role="alertdialog" aria-label={R1_DIALOG.dupTitle}>
              <strong>{R1_DIALOG.dupTitle}</strong>
              <ul>{dups.map((d) => <li key={`${d.box}|${d.label}`}>{R1_DIALOG.dupLine(catalogByKey.get(d.label)?.label ?? d.label, d.recipient, thDate(d.ticket.created_at), d.ticket.ticket_id, R1_STATUS_TH[d.ticket.status] ?? d.ticket.status)}</li>)}</ul>
              <div className="r1-dup-actions">
                <button type="button" onClick={() => setDups(null)}>{R1_DIALOG.dupBack}</button>
                <button type="button" className="r1-primary" onClick={() => send(true)}>{R1_DIALOG.dupConfirm}</button>
              </div>
            </div>
          )}
          <footer className="r1-dialog-foot" data-tour="d5">
            <div className="r1-warns">
              {emptyCount > 0 && <span className="r1-warn">{R1_DIALOG.warnEmpty(emptyCount)}</span>}
              {warnBdm(boxes) && <span className="r1-warn">{R1_DIALOG.warnBdm}</span>}
              {failed && <span className="r1-warn">{R1_DIALOG.warnPartial}</span>}
            </div>
            <button type="button" onClick={onClose} disabled={busy}>{R1_DIALOG.cancel}</button>
            <button type="button" className="r1-primary" disabled={!canSend(boxes) || busy} onClick={() => send(false)}>{failed ? R1_DIALOG.resend(pending.length) : R1_DIALOG.send(pending.length)}</button>
          </footer>
          <GuidedTour open={tour} onClose={() => setTour(false)} root={rootRef.current} container={rootRef.current} steps={R1_TOUR.dialog.map((s, i) => ({ ...s, target: `d${i + 1}` }))} />
      </DialogContent>
    </Dialog>
  );
}
