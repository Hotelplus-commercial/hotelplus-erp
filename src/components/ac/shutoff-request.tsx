/* AC App Partner Bills v1.0 §4.1 (AX10) — "ขอปิดระบบ" on a SUSPENDED contract. AC role only (testing switcher). */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_TH, useTickets } from "@/lib/tickets-l0";
import { openShutoffs, requestShutoff, type ShutoffInput } from "@/lib/partner-shutoff-ac";
import { money } from "@/lib/partner-bills";

export function ShutoffRequest({ input, canWrite }: { input: Omit<ShutoffInput, "note">; canWrite: boolean }) {
  const all = useTickets();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const live = openShutoffs(all, input.contract_id);
  if (live.length) return (
    <span className="flex flex-wrap gap-1 text-xs" data-testid="shutoff-ref">
      {live.map((t) => <span key={t.ticket_id} className="rounded border px-1.5 py-0.5">#{t.ticket_id} · {t.target_dept === "PS" ? "PS" : t.target_dept === "MARCOM" ? "Marcom" : "ORM"} · {STATUS_TH[t.status]}</span>)}
    </span>
  );
  if (!canWrite) return <span className="text-xs text-muted-foreground">AC เป็นผู้ขอปิดระบบ</span>;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} data-testid="shutoff-btn">ขอปิดระบบ</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ขอปิดระบบ · {input.hotel_name}</DialogTitle></DialogHeader>
          <dl className="grid grid-cols-[8rem_1fr] gap-1 text-sm">
            <dt className="text-muted-foreground">สัญญา</dt><dd>{input.contract_id}</dd>
            <dt className="text-muted-foreground">บริการ</dt><dd>{input.service_line}</dd>
            <dt className="text-muted-foreground">ยอดค้าง</dt><dd>{money(input.outstanding, "THB")}</dd>
            <dt className="text-muted-foreground">ค้างชำระ</dt><dd>{input.overdue_cycles} รอบบิล</dd>
            <dt className="text-muted-foreground">Partner / ระบบ</dt><dd>{input.partner ? `${input.partner} · ${input.system_name ?? ""}` : <span className="text-warning-foreground">ยังไม่ระบุระบบ</span>}</dd>
            <dt className="text-muted-foreground">AE ผู้ดูแล</dt><dd>{input.assigned_ae ?? <span className="text-warning-foreground">ยังไม่ได้ระบุผู้ดูแล</span>}</dd>
          </dl>
          <Textarea aria-label="หมายเหตุ" placeholder="หมายเหตุ (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-xs text-muted-foreground">ส่ง ticket 2 ใบ: ทีม{input.service_line === "Marcom" ? " Marcom" : " ORM"} + PS</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button data-testid="shutoff-confirm" onClick={() => {
              const r = requestShutoff({ ...input, note: note.trim() });
              if (!r.ok) { toast.error(r.error); return; }
              toast.success(`ส่งคำขอปิดระบบแล้ว #${r.team} · #${r.ps}`); setOpen(false); setNote("");
            }}>ยืนยันขอปิดระบบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
