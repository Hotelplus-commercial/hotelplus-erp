/* PM Workspace Partner v1.1 §3.2 (PW19) + v1.2 §4 (PW26–PW30) — Partner documents.
 * Upload: bytes → local file store (src/lib/partner-files.ts, never Cloud); metadata → partners collection.
 * Delivery to the Partner's storage location goes only through deliverPartnerFile() (Google Drive not connected yet → PENDING).
 * Editable list lives only in PM Workspace › จัดการ Partner; PS Dashboard card ③ uses the read-only popover. */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addPartnerAttachment, addPartnerUploads, attachmentStatus, partnerAttachments, removePartnerAttachment, updatePartnerAttachment, usePartnerData, type PartnerAttachmentInput } from "@/lib/debt-partner-store";
import { PARTNER_ATTACHMENT_KINDS, type PartnerAttachment } from "@/lib/debt-partner-types";
import { openPartnerFile, PARTNER_FILE_HINT } from "@/lib/partner-files";
import { folderLabel } from "@/lib/partner-workspace";
import { cn } from "@/lib/utils";

const sel = "h-9 rounded-md border bg-background px-2 text-sm";
const dmy = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
const blank: PartnerAttachmentInput = { name: "", kind: "", url: "", note: "" };
export const PENDING_TH = "รอส่งเข้าที่เก็บ";
const NOT_CONNECTED_TH = "ยังไม่ได้เชื่อม Google Drive";

function StatusTag({ a, short }: { a: PartnerAttachment; short?: boolean }) {
  const s = attachmentStatus(a);
  if (s === "STORED") return <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success" data-testid="att-status">เก็บแล้ว</span>;
  if (s === "LINK") return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground" data-testid="att-status">ลิงก์</span>;
  return (
    <span data-testid="att-status">
      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">{short ? PENDING_TH : `${PENDING_TH} · ${NOT_CONNECTED_TH}`}</span>
      {!short && <span className="mt-0.5 block text-[11px] text-muted-foreground">ไฟล์เก็บอยู่ในเครื่องนี้จนกว่าจะส่งเข้าที่เก็บ</span>}
    </span>
  );
}
async function openAtt(a: PartnerAttachment) {
  const s = attachmentStatus(a);
  if (s === "PENDING") { if (!a.file_ref || !(await openPartnerFile(a.file_ref))) toast.error("เปิดไฟล์ไม่ได้ · ไฟล์อยู่ในเครื่องที่อัปโหลดเท่านั้น"); return; }
  window.open(s === "STORED" ? a.stored_url : a.url, "_blank", "noopener,noreferrer");
}

function AttachmentTable({ items, onEdit, onRemove }: { items: PartnerAttachment[]; onEdit?: (a: PartnerAttachment) => void; onRemove?: (a: PartnerAttachment) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">ยังไม่มีเอกสาร</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="ac-table w-full text-sm" data-testid="partner-att-list">
        <thead><tr><th>ชื่อไฟล์</th><th>ประเภท</th><th>เพิ่มโดย</th><th>สถานะ</th><th /></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} data-testid="partner-att-item">
              <td className="font-medium">{a.name}{a.note && <div className="text-xs font-normal text-muted-foreground">{a.note}</div>}</td>
              <td><span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs">{a.kind}</span></td>
              <td className="whitespace-nowrap text-xs">{a.added_by} · {dmy(a.added_at)}</td>
              <td><StatusTag a={a} short={!onEdit} /></td>
              <td className="whitespace-nowrap text-xs">
                <button type="button" className="text-primary underline" onClick={() => void openAtt(a)} data-testid="att-open">เปิด</button>
                {onEdit && <> · <button type="button" className="text-primary underline" onClick={() => onEdit(a)}>แก้ไข</button></>}
                {onRemove && <> · <button type="button" className="text-destructive underline" onClick={() => onRemove(a)}>ลบ</button></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** PM editor (PM Workspace only). */
export function PartnerAttachmentsPanel({ partnerId, by, isPm, onEditFolder }: { partnerId: string; by: string; isPm: boolean; onEditFolder?: () => void }) {
  const d = usePartnerData();
  const partner = d.partners.find((p) => p.id === partnerId);
  const items = partnerAttachments(d, partnerId);
  const [kind, setKind] = useState<string>(PARTNER_ATTACHMENT_KINDS[0]);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [f, setF] = useState<PartnerAttachmentInput>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = editId ? items.find((x) => x.id === editId) : undefined;
  const upload = async (list: FileList | File[] | null) => {
    const files = list ? [...list] : []; if (!files.length) return;
    const r = await addPartnerUploads(partnerId, files, kind, by);
    setErrors(r.errors);
    if (r.added.length) toast.success(`แนบ ${r.added.length} ไฟล์แล้ว · ${PENDING_TH}`);
  };
  const submit = () => {
    const r = editId ? updatePartnerAttachment(partnerId, editId, f) : addPartnerAttachment(partnerId, f, by);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(editId ? "แก้ไขเอกสารแล้ว" : "แนบเอกสารแล้ว"); setF(blank); setEditId(null); setLinkOpen(false);
  };
  const remove = (a: PartnerAttachment) => {
    if (!window.confirm("ลบเอกสารนี้ออกจาก Partner?")) return;
    const r = removePartnerAttachment(partnerId, a.id); if (r.ok) toast.success("ลบเอกสารแล้ว");
  };
  const label = folderLabel(partner?.doc_folder_url);
  const isUpload = editing?.source === "UPLOAD";
  return (
    <div className="space-y-3" data-testid="partner-att-panel">
      <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="partner-folder">
        {label ? <span>ที่เก็บ: <a href={partner!.doc_folder_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{label} ↗</a></span>
          : <span className="font-medium text-warning-foreground">ยังไม่ตั้งที่เก็บเอกสาร</span>}
        {isPm && onEditFolder && <Button size="sm" variant="outline" onClick={onEditFolder} data-testid="partner-folder-edit">{label ? "เปลี่ยนที่เก็บ" : "ตั้งที่เก็บ"}</Button>}
      </div>
      {isPm && (
        <div className="space-y-2">
          <div
            className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-dashed p-4 text-sm", drag && "border-primary bg-primary/5")}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }} data-testid="partner-dropzone">
            <div>
              <p>ลากไฟล์มาวางที่นี่ หรือ <button type="button" className="font-medium text-primary underline" onClick={() => fileRef.current?.click()}>เลือกไฟล์</button></p>
              <p className="text-xs text-muted-foreground">{PARTNER_FILE_HINT}</p>
              <input ref={fileRef} type="file" multiple className="hidden" aria-label="เลือกไฟล์" data-testid="partner-file-input" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
            </div>
            <label className="flex items-center gap-2 text-sm">ประเภท
              <select aria-label="ประเภทไฟล์ที่อัปโหลด" className={sel} value={kind} onChange={(e) => setKind(e.target.value)}>
                {PARTNER_ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
          {errors.length > 0 && <ul className="text-xs text-destructive" role="alert" data-testid="partner-upload-errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <button type="button" className="text-xs text-primary underline" onClick={() => { setLinkOpen(!linkOpen); setEditId(null); setF(blank); }} data-testid="partner-link-toggle">วางลิงก์ไฟล์ที่มีอยู่แล้ว</button>
          {(linkOpen || editId) && (
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2" data-testid="partner-att-form">
              <label className="grid gap-1 text-sm">ชื่อเอกสาร *<Input aria-label="ชื่อเอกสาร" className="h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="grid gap-1 text-sm">ประเภท *
                <select aria-label="ประเภทเอกสาร" className={sel} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                  <option value="">— เลือก —</option>{PARTNER_ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              {!isUpload && <label className="grid gap-1 text-sm">ลิงก์ไฟล์ (Google Drive / URL) *<Input aria-label="ลิงก์ไฟล์" className="h-9" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>}
              <label className="grid gap-1 text-sm">หมายเหตุ<Input aria-label="หมายเหตุเอกสาร" className="h-9" value={f.note ?? ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setLinkOpen(false); setF(blank); }}>ยกเลิก</Button>
                <Button size="sm" onClick={submit} data-testid="partner-att-submit">{editId ? "บันทึกเอกสาร" : "แนบลิงก์"}</Button>
              </div>
            </div>
          )}
        </div>
      )}
      <AttachmentTable items={items}
        {...(isPm ? { onEdit: (a: PartnerAttachment) => { setEditId(a.id); setLinkOpen(false); setF({ name: a.name, kind: a.kind, url: a.url, note: a.note ?? "" }); }, onRemove: remove } : {})} />
      {items.some((a) => attachmentStatus(a) === "PENDING") && (
        <p className="text-xs text-muted-foreground" data-testid="partner-pending-foot">เมื่อเชื่อม Google Drive แล้ว ไฟล์ที่รอจะถูกส่งเข้าที่เก็บให้อัตโนมัติ และสถานะเปลี่ยนเป็น “เก็บแล้ว”</p>
      )}
    </div>
  );
}

/** PS Dashboard card ③ — `📎 n` with a read-only list (only เปิด). Renders nothing when n = 0. */
export function AttachmentCountPopover({ partnerId }: { partnerId: string }) {
  const d = usePartnerData();
  const items = partnerAttachments(d, partnerId);
  if (!items.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild><button type="button" className="ml-1 text-xs text-primary underline" data-testid="dp-att-count">📎 {items.length}</button></PopoverTrigger>
      <PopoverContent className="w-96 space-y-2" data-testid="dp-att-popover">
        <p className="text-xs text-muted-foreground">เอกสารประกอบ · ดูอย่างเดียว · แก้ไขใน PM Workspace › จัดการ Partner</p>
        <AttachmentTable items={items} />
      </PopoverContent>
    </Popover>
  );
}
