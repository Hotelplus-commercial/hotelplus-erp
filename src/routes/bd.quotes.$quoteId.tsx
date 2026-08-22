import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, Download, FileText, Mail, PenLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  daysSince,
  packageLabel,
  quoteValue,
  statusLabel,
  statusTone,
  useBd,
} from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";

export const Route = createFileRoute("/bd/quotes/$quoteId")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { quoteId } = useParams({ from: "/bd/quotes/$quoteId" });
  const { quotes, deals, hydrated, siblingsOf, approveQuote, createRevision, markSent } = useBd();
  const navigate = useNavigate();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmRevise, setConfirmRevise] = useState(false);

  const quote = quotes.find((q) => q.quote_id === quoteId);

  if (!quote)
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {hydrated ? `ไม่พบใบเสนอราคา ${quoteId}` : "กำลังโหลด…"}
      </p>
    );

  const siblings = siblingsOf(quote);
  const deal = deals.find((d) => d.deal_id === quote.deal_id);
  const terminal = quote.status === "approved" || quote.status === "expired";
  const days = daysSince(quote.sent_at);

  return (
    <div className="space-y-4">
      <Link to="/bd/quotes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Quotes · {quote.hotel_name} · {quote.quote_id}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          {quote.quote_id} <Chip tone={statusTone(quote.status)}>{statusLabel[quote.status]}</Chip>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("ดาวน์โหลด PDF (จำลอง)")}>
            <Download className="size-4" /> Re-download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              markSent(quote.quote_id);
              toast.success(quote.sent_at ? "ส่งซ้ำให้ลูกค้าแล้ว (จำลอง)" : "ส่งใบเสนอราคาแล้ว — เริ่มนับ aging");
            }}
          >
            <Mail className="size-4" /> {quote.sent_at ? "Re-send" : "ส่งให้ลูกค้า"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmRevise(true)}>
            <PenLine className="size-4" /> Create Revision
          </Button>
          <Button size="sm" className="gap-1.5" disabled={terminal} onClick={() => setConfirmApprove(true)}>
            <Check className="size-4" /> Approve Quote
          </Button>
        </div>
      </div>

      {!terminal && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/8 p-4 text-sm">
          <p className="font-semibold text-destructive">การกด Approve มีผลถาวร 2 อย่าง</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
            <li>ใบนี้จะถูกล็อกเป็น Approved แก้ไขไม่ได้</li>
            <li>
              ใบเสนอราคาอื่นของ {quote.hotel_name} ประเภท {quote.type} จะหมดอายุแบบ superseded ทันที
              {siblings.length > 0 ? `: ${siblings.map((s) => s.quote_id).join(", ")}` : " (ตอนนี้ไม่มี)"}
            </li>
          </ol>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="Quote Metadata">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <Meta label="Quote ID" value={quote.quote_id} />
              <Meta label="โรงแรม" value={quote.hotel_name} />
              <Meta label="ประเภท" value={quote.type} />
              <Meta label="Package" value={packageLabel(quote)} />
              <Meta label="มูลค่า" value={thb(quoteValue(quote))} />
              <Meta
                label="One-time"
                value={quote.calculator_output.onetime_total ? thb(quote.calculator_output.onetime_total) : "—"}
              />
              <Meta label="สร้างเมื่อ" value={fmtDate(quote.created_at)} />
              <Meta label="ส่งให้ลูกค้า" value={fmtDate(quote.sent_at)} />
              <Meta label="Aging" value={days === null ? "ยังไม่ส่ง" : `${days} วัน`} />
              <Meta label="Revision" value={quote.revision_number ? `R${quote.revision_number + 1}` : "ฉบับแรก"} />
              {quote.parent_quote_id && <Meta label="แก้มาจาก" value={quote.parent_quote_id} />}
              {quote.expired_reason && <Meta label="เหตุผลหมดอายุ" value={quote.expired_reason} />}
            </dl>
          </Panel>

          <Panel title="Deal Link">
            {deal ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{deal.deal_id}</p>
                <p className="text-xs text-muted-foreground">
                  Pipedrive #{deal.pipedrive_deal_id} · {deal.contact_person.name} · {deal.contact_person.email}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {deal.linked_quote_ids.map((id) => (
                    <Chip key={id} tone={id === quote.quote_id ? "info" : "muted"}>
                      {id}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                ยังไม่ผูกดีล —{" "}
                <Link to="/bd/register-deal" className="text-primary underline">
                  Register Deal
                </Link>
              </p>
            )}
          </Panel>

          <Panel title="Activity Log">
            <ol className="space-y-2 text-xs">
              {[...quote.activity_log].reverse().map((a, i) => (
                <li key={`${a.timestamp}-${i}`} className="border-l-2 pl-3">
                  <p className="font-medium">{a.action}</p>
                  <p className="text-muted-foreground">
                    {fmtDate(a.timestamp)} · {a.actor}
                    {a.details ? ` · ${a.details}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="PDF Preview" subtitle={quote.pdf_url}>
            <div className="grid h-72 place-items-center rounded-xl border border-dashed bg-surface/50 text-center">
              <div>
                <FileText className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">{quote.quote_id}.pdf</p>
                <p className="text-xs text-muted-foreground">พรีวิวจำลอง — ของจริงมาจาก PDF template ของเครื่องมือเดิม</p>
              </div>
            </div>
          </Panel>
          <div className="rounded-xl border bg-surface/50 p-4 text-xs text-muted-foreground">
            เอกสารที่ส่งแล้วแก้ไขไม่ได้ (R5) — ถ้าต้องปรับราคาให้กด Create Revision ระบบจะสร้างฉบับใหม่โดยคงสายการแก้ไขไว้
          </div>
        </div>
      </div>

      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการ Approve {quote.quote_id}</DialogTitle>
            <DialogDescription>
              {siblings.length > 0
                ? `ใบเสนอราคาต่อไปนี้จะหมดอายุอัตโนมัติ: ${siblings.map((s) => s.quote_id).join(", ")}`
                : "ไม่มีใบเสนอราคาอื่นที่จะถูก supersede"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApprove(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                const expired = approveQuote(quote.quote_id);
                setConfirmApprove(false);
                toast.success(
                  `Approve ${quote.quote_id} แล้ว${expired.length ? ` · หมดอายุ ${expired.length} ฉบับ` : ""}`,
                );
                navigate({ to: "/bd/quotes" });
              }}
            >
              ยืนยัน Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRevise} onOpenChange={setConfirmRevise}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้าง Revision ของ {quote.quote_id}?</DialogTitle>
            <DialogDescription>
              ระบบจะสร้างใบใหม่ (ต่อท้าย -R{quote.revision_number + 2}) โดยคัดลอกข้อมูล Calculator เดิม ฉบับเก่ายังอยู่จนกว่าจะหมดอายุหรือถูก supersede
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevise(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                const id = createRevision(quote.quote_id);
                setConfirmRevise(false);
                toast.success(`สร้าง ${id} แล้ว`);
                navigate({ to: "/bd/quotes/$quoteId", params: { quoteId: id } });
              }}
            >
              สร้าง Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
