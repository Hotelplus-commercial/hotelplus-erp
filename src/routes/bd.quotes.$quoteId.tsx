import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, Download, ExternalLink, Mail, PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  snapshotOf,
  statusLabel,
  statusTone,
  useBd,
  type SKUEntry,
} from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/quotes/$quoteId")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { quoteId } = useParams({ from: "/bd/quotes/$quoteId" });
  const { quotes, deals, hydrated, siblingsOf, approveQuote, createRevision, markSent } = useBd();
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
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
  const snap = quote.approved_snapshot;

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
            <Download className="size-4" /> {snap ? "Download approved PDF" : "Re-download PDF"}
          </Button>
          {snap ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/ps/contract-wizard">
                <ExternalLink className="size-4" /> View Contract in PS App
              </Link>
            </Button>
          ) : (
            <>
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
              <Button size="sm" className="gap-1.5" disabled={terminal} onClick={() => setApproveOpen(true)}>
                <Check className="size-4" /> Approve Quote (choose items)
              </Button>
            </>
          )}
        </div>
      </div>

      {snap ? (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <p className="font-semibold text-success">
            Approved {fmtDate(quote.approved_at)} by {quote.approved_by} — quote snapshot locked · handed off to PS App
          </p>
        </div>
      ) : (
        !terminal && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p>
              Quote นี้เสนอ {quote.skus.length} รายการ · เมื่อลูกค้าตัดสินใจแล้ว → Approve เพื่อเลือกเฉพาะ item ที่ออกสัญญาจริง
            </p>
          </div>
        )
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {snap ? (
            <Panel title="Approved Contract Contents">
              <div className="space-y-3">
                <div className="rounded-xl border border-success/40 bg-success/10 p-3">
                  <p className="text-xs font-semibold uppercase text-success">✓ ประกอบสัญญา (approved)</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {snap.approved_skus.map((s) => (
                      <SkuLine key={s.sku_code} sku={s} />
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-dashed bg-surface/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    ✗ ไม่ประกอบสัญญา (rejected · เก็บ audit)
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground line-through">
                    {snap.rejected_skus.map((s) => (
                      <SkuLine key={s.sku_code} sku={s} />
                    ))}
                    {snap.rejected_skus.length === 0 && <li className="not-italic no-underline">— ไม่มี</li>}
                  </ul>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Quote Contents" subtitle={`${quote.skus.length} SKU ในใบเสนอราคานี้`}>
              <ul className="space-y-1 text-sm">
                {quote.skus.map((s) => (
                  <SkuLine key={s.sku_code} sku={s} />
                ))}
                {quote.skus.length === 0 && <li className="text-xs text-muted-foreground">ไม่มีรายการ SKU</li>}
              </ul>
            </Panel>
          )}

          <Panel title="Quote Metadata">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <Meta label="โรงแรม" value={quote.hotel_name} />
              <Meta label="ประเภท" value={quote.type} />
              <Meta label="Package" value={packageLabel(quote)} />
              <Meta label="มูลค่า" value={thb(quoteValue(quote))} />
              <Meta label="สร้างเมื่อ" value={fmtDate(quote.created_at)} />
              <Meta label="ส่งให้ลูกค้า" value={quote.sent_at ? fmtDate(quote.sent_at) : "ยังไม่ส่ง"} />
              <Meta label="Aging" value={days === null ? "ยังไม่เริ่มนับ" : `${days} วัน`} />
              <Meta label="Revision" value={quote.revision_number ? `R${quote.revision_number + 1}` : "ฉบับแรก"} />
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
        </div>

        <div className="space-y-4">
          {snap && (
            <>
              <Panel title="Contract Value Summary">
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <Meta label="Monthly recurring" value={thb(snap.approved_monthly_total)} />
                  <Meta label="One-time setup" value={thb(snap.approved_onetime_total)} />
                  <Meta label="First month total" value={thb(snap.approved_first_month_total)} />
                  <Meta
                    label="Commission"
                    value={snap.approved_commission_rate ? `${Math.round(snap.approved_commission_rate * 100)}%` : "—"}
                  />
                </dl>
              </Panel>
              <Panel title="Downstream Handoff">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>✓ POST approved_snapshot → /api/ps-app/contract-wizard-input (mock)</li>
                  <li>✓ Sibling quotes ประเภทเดียวกันถูก expire แบบ superseded</li>
                  <li>✓ Activity log บันทึกการอนุมัติ</li>
                </ul>
              </Panel>
            </>
          )}

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

          {!snap && (
            <Panel title="Latest customer response">
              <div className="rounded-lg border-l-4 border-l-warning bg-surface/70 p-3 text-xs">
                “ลูกค้าขอเอาเฉพาะแพ็กเกจหลัก ส่วน setup fee ขอตัดออกก่อนครับ” — บันทึกโดย Sales (จำลอง)
              </div>
            </Panel>
          )}
        </div>
      </div>

      {approveOpen && (
        <ApproveModal
          open={approveOpen}
          onOpenChange={setApproveOpen}
          quoteId={quote.quote_id}
          hotel={quote.hotel_name}
          skus={quote.skus}
          siblings={siblings.map((s) => s.quote_id)}
          onConfirm={(codes) => {
            const expired = approveQuote(quote.quote_id, codes);
            setApproveOpen(false);
            toast.success(
              `Approve ${quote.quote_id} แล้ว · ${codes.length} รายการ${expired.length ? ` · หมดอายุ ${expired.length} ฉบับ` : ""}`,
            );
          }}
        />
      )}

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

function ApproveModal({
  open,
  onOpenChange,
  quoteId,
  hotel,
  skus,
  siblings,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  hotel: string;
  skus: SKUEntry[];
  siblings: string[];
  onConfirm: (codes: string[]) => void;
}) {
  const options = skus.filter((s) => s.is_pricing_option);
  const extras = skus.filter((s) => !s.is_pricing_option);
  const [picked, setPicked] = useState<string | null>(options[0]?.sku_code ?? null);
  const [checked, setChecked] = useState<string[]>(extras.map((s) => s.sku_code));

  const codes = useMemo(() => [...(picked ? [picked] : []), ...checked], [picked, checked]);
  const snap = snapshotOf(skus, codes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-success">✓ APPROVE QUOTE — {quoteId}</DialogTitle>
          <DialogDescription>
            {hotel} · เลือก item ที่ลูกค้ายืนยันจะซื้อ · ตัวที่ไม่เลือก = ขีดฆ่าใน contract snapshot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {options.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                1 · ORM Package · เลือก 1 อัน (mutually exclusive)
              </p>
              {options.map((s) => (
                <button
                  key={s.sku_code}
                  type="button"
                  onClick={() => setPicked(s.sku_code)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm",
                    picked === s.sku_code ? "border-2 border-success bg-success/10" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      picked === s.sku_code && "border-success bg-success",
                    )}
                  />
                  <span className="flex-1">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{s.sku_code}</code>{" "}
                    <span className="font-medium">{s.product_name}</span>
                    <span className="ml-2 text-muted-foreground">{s.billing_summary}</span>
                  </span>
                  {picked === s.sku_code && <Chip tone="success">CUSTOMER CHOICE</Chip>}
                </button>
              ))}
            </section>
          )}

          {extras.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {options.length > 0 ? "2" : "1"} · Setup fees / add-ons · เลือกได้อิสระ
              </p>
              {extras.map((s) => {
                const on = checked.includes(s.sku_code);
                return (
                  <label
                    key={s.sku_code}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm",
                      on ? "border-2 border-success bg-success/10" : "border-dashed",
                    )}
                  >
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) =>
                        setChecked((p) => (v ? [...new Set([...p, s.sku_code])] : p.filter((c) => c !== s.sku_code)))
                      }
                    />
                    <span className="flex-1">
                      <span className={cn(!on && "line-through")}>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{s.sku_code}</code>{" "}
                        <span className="font-medium">{s.product_name}</span>
                        <span className="ml-2 text-muted-foreground">{s.billing_summary}</span>
                      </span>
                      {!on && (
                        <span className="mt-1 block text-xs italic text-muted-foreground">
                          ✗ ลูกค้าไม่เอา · จะขีดฆ่าใน snapshot
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </section>
          )}

          <section className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-primary">Approved contract summary</p>
            <ul className="mt-2 space-y-1">
              {snap.approved_skus.map((s) => (
                <SkuLine key={s.sku_code} sku={s} />
              ))}
              {snap.rejected_skus.map((s) => (
                <li key={s.sku_code} className="text-xs text-muted-foreground line-through">
                  {s.product_name} · {s.billing_summary}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t pt-2 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">First month total</span>
                <span className="font-semibold tabular-nums">{thb(snap.approved_first_month_total)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Monthly recurring</span>
                <span className="font-semibold tabular-nums">{thb(snap.approved_monthly_total)}</span>
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
            <p className="font-semibold">⚠️ Auto-expire</p>
            <p className="mt-1">
              {siblings.length
                ? `ใบเสนอราคาต่อไปนี้จะหมดอายุแบบ superseded: ${siblings.join(", ")}`
                : "ไม่มีใบเสนอราคาอื่นที่จะถูก supersede"}
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={codes.length === 0} onClick={() => onConfirm(codes)}>
            ✓ Confirm Approval → Hand off to PS App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkuLine({ sku }: { sku: SKUEntry }) {
  return (
    <li className="flex flex-wrap items-baseline gap-2 text-sm">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{sku.sku_code}</code>
      <span>{sku.product_name}</span>
      <span className="text-xs text-muted-foreground">· {sku.billing_summary}</span>
    </li>
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
