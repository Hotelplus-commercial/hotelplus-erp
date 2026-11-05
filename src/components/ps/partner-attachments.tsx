/* PM Workspace Partner v1.1 §3.2 (PW19) — Partner supporting documents (links; Google Drive not connected yet).
 * Editable list lives only in PM Workspace › จัดการ Partner; PS Dashboard card ③ uses the read-only popover. */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addPartnerAttachment, partnerAttachments, removePartnerAttachment, updatePartnerAttachment, usePartnerData, type PartnerAttachmentInput } from "@/lib/debt-partner-store";
import { PARTNER_ATTACHMENT_KINDS, type PartnerAttachment } from "@/lib/debt-partner-types";

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const dmy = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
const blank: PartnerAttachmentInput = { name: "", kind: "", url: "", note: "" };

function AttachmentList({ items, onEdit, onRemove }: { items: PartnerAttachment[]; onEdit?: (a: PartnerAttachment) => void; onRemove?: (a: PartnerAttachment) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">ยังไม่มีเอกสาร</p>;
  return (
    <ul className="divide-y rounded-md border text-sm" data-testid="partner-att-list">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-2" data-testid="partner-att-item">
          <div className="min-w-0">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{a.name} ↗</a>
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{a.kind}</span>
            <div className="text-xs text-muted-foreground">เพิ่มโดย {a.added_by} · {dmy(a.added_at)}{a.note ? ` · ${a.note}` : ""}</div>
          </div>
          {(onEdit || onRemove) && (
            <span className="flex gap-2 text-xs">
              {onEdit && <button type="button" className="text-primary underline" onClick={() => onEdit(a)}>แก้ไข</button>}
              {onRemove && <button type="button" className="text-destructive underline" onClick={() => onRemove(a)}>ลบ</button>}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** PM editor (PM Workspace only). */
export function PartnerAttachmentsPanel({ partnerId, by, isPm }: { partnerId: string; by: string; isPm: boolean }) {
  const d = usePartnerData();
  const items = partnerAttachments(d, partnerId);
  const [f, setF] = useState<PartnerAttachmentInput>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const submit = () => {
    const r = editId ? updatePartnerAttachment(partnerId, editId, f) : addPartnerAttachment(partnerId, f, by);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(editId ? "แก้ไขเอกสารแล้ว" : "แนบเอกสารแล้ว"); setF(blank); setEditId(null);
  };
  const remove = (a: PartnerAttachment) => {
    if (!window.confirm("ลบเอกสารนี้ออกจาก Partner?")) return;
    const r = removePartnerAttachment(partnerId, a.id); if (r.ok) toast.success("ลบเอกสารแล้ว");
  };
  return (
    <div className="space-y-3" data-testid="partner-att-panel">
      {isPm && (
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2" data-testid="partner-att-form">
          <label className="grid gap-1 text-sm">ชื่อเอกสาร *<Input aria-label="ชื่อเอกสาร" className="h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">ประเภท *
            <select aria-label="ประเภทเอกสาร" className={sel} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="">— เลือก —</option>{PARTNER_ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">ลิงก์ไฟล์ (Google Drive / URL) *<Input aria-label="ลิงก์ไฟล์" className="h-9" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">หมายเหตุ<Input aria-label="หมายเหตุเอกสาร" className="h-9" value={f.note ?? ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Button size="sm" variant="outline" disabled title="ยังไม่ได้เชื่อม Google Drive" data-testid="partner-att-upload">อัปโหลดไฟล์</Button>
            {editId && <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setF(blank); }}>ยกเลิก</Button>}
            <Button size="sm" onClick={submit} data-testid="partner-att-submit">{editId ? "บันทึกเอกสาร" : "แนบเอกสาร"}</Button>
          </div>
        </div>
      )}
      <AttachmentList items={items}
        {...(isPm ? { onEdit: (a: PartnerAttachment) => { setEditId(a.id); setF({ name: a.name, kind: a.kind, url: a.url, note: a.note ?? "" }); }, onRemove: remove } : {})} />
    </div>
  );
}

/** PS Dashboard card ③ — `📎 n` with a read-only list (no edit). Renders nothing when n = 0. */
export function AttachmentCountPopover({ partnerId }: { partnerId: string }) {
  const d = usePartnerData();
  const items = partnerAttachments(d, partnerId);
  if (!items.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild><button type="button" className="ml-1 text-xs text-primary underline" data-testid="dp-att-count">📎 {items.length}</button></PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" data-testid="dp-att-popover">
        <p className="text-xs text-muted-foreground">เอกสารประกอบ · ดูอย่างเดียว · แก้ไขใน PM Workspace › จัดการ Partner</p>
        <AttachmentList items={items} />
      </PopoverContent>
    </Popover>
  );
}
