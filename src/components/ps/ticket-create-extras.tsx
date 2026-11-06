/* UAT Polish R2 SP14 / SP15 — create-ticket attachments (Partner upload pattern) + duplicate dialog. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PARTNER_FILE_HINT, openPartnerFile } from "@/lib/partner-files";
import { caseAttachments, checkAttachments, linkError, type PendingAttachment } from "@/lib/ticket-create-extras";
import { sendFollowUp, SVC_STATUS_TH, type ServiceTicketRow, type TicketAttachmentRef } from "@/lib/service-tickets";

export function CreateTicketAttachments({ value, onChange }: { value: PendingAttachment[]; onChange: (v: PendingAttachment[]) => void }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const addFiles = (list: FileList | null) => {
    const arr = Array.from(list ?? []);
    const { ok, errors: errs } = checkAttachments(arr);
    setErrors(errs);
    onChange([...value, ...ok.map((i) => ({ kind: "file" as const, name: arr[i]!.name, file: arr[i]! }))]);
  };
  const addLink = () => {
    const e = linkError(link); if (e) { setErrors([e]); return; }
    setErrors([]); onChange([...value, { kind: "link", name: link.trim(), url: link.trim() }]); setLink("");
  };
  return (
    <div data-testid="ticket-attach">
      <label className="text-xs font-medium">แนบไฟล์</label>
      <input type="file" multiple aria-label="แนบไฟล์" className="mt-1 block w-full text-xs" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <p className="mt-1 text-xs text-muted-foreground">{PARTNER_FILE_HINT} · แนบได้หลายไฟล์</p>
      <div className="mt-1 flex gap-2"><Input aria-label="วางลิงก์ไฟล์" placeholder="วางลิงก์ไฟล์" value={link} onChange={(e) => setLink(e.target.value)} /><Button type="button" variant="outline" size="sm" onClick={addLink}>เพิ่มลิงก์</Button></div>
      {errors.map((e) => <p key={e} className="mt-1 text-xs text-destructive" role="alert">{e}</p>)}
      {value.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs" data-testid="ticket-attach-list">
          {value.map((a, i) => <li key={`${a.name}-${i}`} className="flex justify-between rounded border px-2 py-1"><span className="truncate">{a.kind === "link" ? "🔗 " : "📎 "}{a.name}</span><button type="button" className="text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))}>ลบ</button></li>)}
        </ul>
      )}
    </div>
  );
}

export function CaseAttachmentList({ demo, caseId }: { demo: boolean; caseId: string }) {
  const [list, setList] = useState<TicketAttachmentRef[]>([]);
  useEffect(() => { setList(caseAttachments(demo, caseId)); }, [demo, caseId]);
  if (!list.length) return null;
  return (
    <div className="mt-2 space-y-1" data-testid="case-attachments">
      <p className="text-xs font-medium">ไฟล์แนบ</p>
      {list.map((a, i) => a.url
        ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-info underline">🔗 {a.name}</a>
        : <button key={i} type="button" className="block text-left text-xs text-info underline" onClick={async () => { if (!(await openPartnerFile(a.ref!))) toast.error("เปิดไฟล์ไม่ได้ · ไฟล์อยู่ในเครื่องที่แนบเท่านั้น"); }}>📎 {a.name}</button>)}
    </div>
  );
}

export function DuplicateTicketDialog({ rows, note, demo, actor, onCancel, onConfirm, onFollowedUp }: {
  rows: ServiceTicketRow[]; note: string; demo: boolean; actor: string; onCancel: () => void; onConfirm: () => void; onFollowedUp: (row: ServiceTicketRow) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const follow = (r: ServiceTicketRow) => {
    const res = sendFollowUp(r, { role: "AE", label: actor }, { demo, note: note.slice(0, 300) });
    if (!res.ok) { toast.error("error" in res ? String(res.error) : "ส่ง Follow up ไม่สำเร็จ"); return; }
    toast.success(`ส่ง Follow up ${r.ticket_no} แล้ว · ไม่ได้สร้าง ticket ใหม่`);
    onFollowedUp(r);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xl" data-testid="dup-dialog">
        <DialogHeader><DialogTitle>พบ ticket ที่เปิดอยู่ของโรงแรมนี้ {rows.length} ใบ</DialogTitle></DialogHeader>
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {rows.map((r) => {
            const id = `${r.ticket_store}:${r.ticket_id}`;
            return (
              <li key={id} className="rounded-md border p-2" data-testid="dup-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><b>#{r.ticket_no}</b> · {r.category_name_th} · {r.subject}</span>
                  <span className="text-xs text-muted-foreground">{SVC_STATUS_TH[r.display_status]} · อายุ {r.age_days} วัน · {r.assignee_label ?? "ยังไม่มีผู้รับ"}</span>
                </div>
                {r.description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
                {openId === id && <p className="mt-1 whitespace-pre-wrap text-xs">{r.description ?? "—"} · เปิดโดย {r.opened_by_label} · กำหนด {r.effective_due_date}</p>}
                <div className="mt-1 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === id ? null : id)}>ดูรายละเอียด</Button>
                  <Button size="sm" variant="outline" onClick={() => follow(r)}>Follow up ticket นี้แทน</Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>ยกเลิก</Button>
          <Button onClick={onConfirm} data-testid="dup-confirm">ยืนยันสร้าง ticket ใหม่</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
