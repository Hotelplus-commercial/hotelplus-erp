/* Contract Renewal v1.0 — Contract Wizard in renewal mode (3 steps). No KYC, no upload, no payment. */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { RecoBox, recoLabel } from "@/components/ps/renewal-request-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingMgmt } from "@/lib/orm-meeting";
import { RENEWAL_LABEL_TH as L, renewalReqStatusTh } from "@/lib/ps-glossary";
import { usePsRenewal } from "@/lib/ps-renewal";
import { REASON_CODES, evaluate, reasonValid, rollDates, type ReasonCode, type Terms } from "@/lib/renewal-rules";
import {
  DEMO_EXTRA_CARDS, cancelRequest, entityClosed, openRequestFor, raiseEntityChange, renewalConfig, setRenewalDemo, sourceContractById,
  startRenewal, submitRequest, updateReason, updateTerms, useRenewalStore,
} from "@/lib/renewal-store";
import { attachmentError, ticketById, STATUS_TH } from "@/lib/tickets-l0";
import { cn } from "@/lib/utils";

const STEPS = ["ข้อมูลลูกค้า", "เงื่อนไขใหม่", "ตรวจและส่ง"];
const thb = (n: number) => `฿${n.toLocaleString("th-TH")}`;

export function RenewalWizard({ contractId }: { contractId: string }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => { setRenewalDemo(new URLSearchParams(window.location.search).get("demo") === "1"); setReady(true); }, []);
  useRenewalStore();
  const { role } = useMeetingMgmt();
  const currentUser = role === "Partner Manager" ? "PM001-Alex" : "AE001-Nont";
  const { cards } = usePsRenewal();
  const src = ready ? sourceContractById(contractId) : null;
  const card = src ? [...cards, ...DEMO_EXTRA_CARDS].find((c) => c.hotelId === src.hotel_id) : undefined;
  const [step, setStep] = useState(0);
  const [entityOpen, setEntityOpen] = useState(false);
  const [what, setWhat] = useState<"นิติบุคคล" | "ผู้มีอำนาจลงนาม" | "ทั้งคู่">("ผู้มีอำนาจลงนาม");
  const [detail, setDetail] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number; mime: string; data_url: string }[]>([]);
  const owner = !!card && card.owner === currentUser;
  useEffect(() => { if (card && owner && !openRequestFor(card.id)) startRenewal(card); }, [card, owner]);
  const req = card ? openRequestFor(card.id) : null;

  if (!ready) return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">กำลังเปิด {L.renew}…</p>;
  if (!src || !card) return <Msg text={`ไม่พบสัญญา ${contractId}`} />;
  if (!owner) return <Msg text={`ดูอย่างเดียว · ${L.renew} ได้เฉพาะ AE เจ้าของการ์ด (${card.owner})`} />;
  if (!req) return <Msg text={`ไม่มีคำขอต่อสัญญาที่เปิดอยู่ · ${card.hotel}`} />;

  const editable = req.status === "DRAFT" || req.status === "RETURNED";
  const ev = evaluate(req.reco_snapshot, req.old_terms, req.new_terms, renewalConfig.renewal_reco_mode);
  const delta = req.new_terms.fee_amount - req.old_terms.fee_amount;
  const pct = req.old_terms.fee_amount ? (delta / req.old_terms.fee_amount) * 100 : 0;
  const reasonOk = !ev.reason_required || reasonValid(req.reason_code, req.reason_text);
  const setTerm = (k: keyof Terms, v: string) => {
    const n = { ...req.new_terms, [k]: k === "package" ? v : Number(v) || 0 } as Terms;
    const next = k === "term_months" ? { ...n, ...rollDates(req.old_terms.end_date, n.term_months) } : n;
    const o = updateTerms(req.id, next); if (!o.ok) toast.error(o.error);
  };
  const entityTicket = ticketById(req.entity_ticket_id);
  const addFile = (f: File | undefined) => {
    if (!f) return; const e = attachmentError(files.length, { size: f.size, mime: f.type }); if (e) return toast.error(e);
    const rd = new FileReader(); rd.onload = () => setFiles((p) => [...p, { name: f.name, size: f.size, mime: f.type, data_url: String(rd.result) }]); rd.readAsDataURL(f);
  };
  const sendEntity = () => { const o = raiseEntityChange(req.id, what, detail, files, currentUser); if (!o.ok) return toast.error(o.error); setEntityOpen(false); toast.success(L.entityItem(card.hotel)); };
  const primary = () => {
    const o = submitRequest(req.id); if (!o.ok) return toast.error(o.error);
    if (o.req.status === "DRAFT") return toast.info(L.waitEntity);
    toast.success(renewalReqStatusTh(o.req.status));
    void navigate({ to: "/ps/ae-workspace/dashboard", hash: "renewal-activities" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">{L.renew} · {card.hotel}</h1>
        <div className="flex items-center gap-2">
          <Chip tone="info">{renewalReqStatusTh(req.status)}</Chip>
          <Button variant="outline" size="sm" asChild><Link to="/ps/ae-workspace/dashboard" hash="renewal-activities">บันทึกและกลับ</Link></Button>
        </div>
      </div>
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s}><button type="button" onClick={() => (i <= 1 || reasonOk) && setStep(i)} className={cn("rounded-full border px-3 py-1", step === i ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{i + 1} · {s}</button></li>
        ))}
      </ol>
      {req.status === "RETURNED" && req.return_comment && <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-sm">ส่งกลับ: {req.return_comment}</p>}

      {step === 0 && (
        <Panel title="ข้อมูลลูกค้า (อ่านอย่างเดียว)">
          <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {[["โรงแรม", card.hotel], ["Hotel ID", src.hotel_id], ["Customer ID", src.customer_id], ["นิติบุคคล", src.legal_entity], ["ผู้มีอำนาจลงนาม", src.signatory], ["ผู้ติดต่อ", `${card.contact.name} · ${card.contact.phone}`], ["เอกสาร KYC เดิม", src.kyc_docs.join(", ") || "—"]].map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="w-36 shrink-0 text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={req.entity_change || entityOpen} disabled={req.entity_change} onCheckedChange={(v) => setEntityOpen(!!v)} /> {L.entityCheckbox}
          </label>
          {entityTicket && <p className="mt-2 text-xs text-muted-foreground">{L.entityItem(card.hotel)} · #{entityTicket.ticket_id} · {STATUS_TH[entityTicket.status]}</p>}
          {entityOpen && !req.entity_change && (
            <div className="mt-3 space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap gap-3 text-sm">
                {(["นิติบุคคล", "ผู้มีอำนาจลงนาม", "ทั้งคู่"] as const).map((w) => <label key={w} className="flex items-center gap-1"><input type="radio" checked={what === w} onChange={() => setWhat(w)} /> {w}</label>)}
              </div>
              <Textarea aria-label="รายละเอียดใหม่" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="รายละเอียดใหม่" />
              <input aria-label="แนบเอกสาร" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => addFile(e.target.files?.[0])} />
              {files.map((f) => <p key={f.name} className="text-xs">📎 {f.name} · {(f.size / 1024).toFixed(0)} KB</p>)}
              <Button size="sm" onClick={sendEntity}>ส่งให้ AC</Button>
            </div>
          )}
          <div className="mt-3 flex justify-end"><Button onClick={() => setStep(1)}>ถัดไป</Button></div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="เงื่อนไขใหม่">
          <RecoBox reco={req.reco_snapshot} />
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">เงื่อนไขเดิม</p>
              {(["fee_amount", "commission_pct", "term_months", "package", "start_date", "end_date"] as const).map((k) => <p key={k}><span className="text-muted-foreground">{L.fields[k]}:</span> {k === "fee_amount" ? thb(req.old_terms[k]) : String(req.old_terms[k])}</p>)}
            </div>
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">เงื่อนไขใหม่</p>
              {(["fee_amount", "commission_pct", "term_months", "package"] as const).map((k) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] items-center gap-2">
                  <Label htmlFor={`t-${k}`}>{L.fields[k]}</Label>
                  <Input id={`t-${k}`} disabled={!editable} type={k === "package" ? "text" : "number"} value={String(req.new_terms[k])} onChange={(e) => setTerm(k, e.target.value)} />
                </div>
              ))}
              <p className="text-muted-foreground">{L.fields.start_date} {req.new_terms.start_date} · {L.fields.end_date} {req.new_terms.end_date}</p>
              <p>Δ ค่าบริการ/เดือน: <b>{delta >= 0 ? "+" : ""}{thb(delta)}</b> ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ev.approval_required && <Chip tone="warn">{L.needApproval}</Chip>}
            {ev.reason_required && <span className="text-xs text-warning-foreground">ต้องระบุเหตุผล</span>}
          </div>
          {ev.reason_required && (
            <div className="mt-2 grid gap-2 md:grid-cols-[14rem_1fr]">
              <select aria-label="เหตุผลหลัก" disabled={!editable} className="h-9 rounded-md border bg-background px-2 text-sm" value={req.reason_code ?? ""} onChange={(e) => updateReason(req.id, (e.target.value || null) as ReasonCode | null, req.reason_text)}>
                <option value="">เลือกเหตุผล</option>
                {REASON_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input aria-label="รายละเอียดเหตุผล" disabled={!editable} value={req.reason_text} onChange={(e) => updateReason(req.id, req.reason_code, e.target.value)} placeholder={req.reason_code === "อื่นๆ" ? "ระบุเหตุผล (บังคับ)" : "รายละเอียด (ถ้ามี)"} />
            </div>
          )}
          <div className="mt-3 flex justify-between"><Button variant="outline" onClick={() => setStep(0)}>ย้อนกลับ</Button><Button disabled={!reasonOk} onClick={() => setStep(2)}>ถัดไป</Button></div>
        </Panel>
      )}

      {step === 2 && (
        <Panel title="ตรวจและส่ง">
          <dl className="grid grid-cols-[10rem_minmax(0,1fr)] gap-1 text-sm">
            <dt className="text-muted-foreground">ค่าบริการ/เดือน</dt><dd>{thb(req.old_terms.fee_amount)} → {thb(req.new_terms.fee_amount)} ({delta >= 0 ? "+" : ""}{thb(delta)} · {pct.toFixed(1)}%)</dd>
            <dt className="text-muted-foreground">เปลี่ยน</dt><dd>{ev.changed_fields.map((f) => L.fields[f]).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">ช่วงสัญญาใหม่</dt><dd>{req.new_terms.start_date} – {req.new_terms.end_date}</dd>
            <dt className="text-muted-foreground">คำแนะนำระบบ</dt><dd>{recoLabel(req.reco_snapshot)}</dd>
            <dt className="text-muted-foreground">เหตุผล</dt><dd>{req.reason_code ? `${req.reason_code}${req.reason_text ? ` · ${req.reason_text}` : ""}` : "—"}</dd>
            <dt className="text-muted-foreground">เปลี่ยนนิติบุคคล</dt><dd>{req.entity_change ? `${entityTicket ? STATUS_TH[entityTicket.status] : "—"}${entityClosed(req) ? "" : ` · ${L.waitEntity}`}` : "ไม่มี"}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>ย้อนกลับ</Button>
              {editable && <Button variant="ghost" onClick={() => { const o = cancelRequest(req.id); if (o.ok) { toast.success(renewalReqStatusTh("CANCELLED")); void navigate({ to: "/ps/ae-workspace/dashboard", hash: "renewal-activities" }); } }}>{L.cancel}</Button>}
            </div>
            {req.status === "DRAFT" && <Button disabled={!reasonOk} onClick={primary}>{ev.approval_required ? L.submitPm : L.createAndLink}</Button>}
          </div>
        </Panel>
      )}
    </div>
  );
}

const Msg = ({ text }: { text: string }) => (
  <div className="space-y-3 rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
    <p>{text}</p>
    <Button variant="outline" size="sm" asChild><Link to="/ps/ae-workspace/dashboard">กลับ AE Workspace</Link></Button>
  </div>
);
