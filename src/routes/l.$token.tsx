import { createFileRoute, useParams } from "@tanstack/react-router";
import { Check, PenLine, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Chip, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { thb } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";

export const Route = createFileRoute("/l/$token")({
  head: () => ({
    meta: [
      { title: "ยืนยันสัญญาและชำระเงิน — HotelPlus LIVE Link" },
      { name: "description", content: "ตรวจสอบสัญญา ลงนามดิจิทัล และชำระเงินผ่านลิงก์ปลอดภัยของ HotelPlus" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "HotelPlus LIVE Link" },
      { property: "og:description", content: "ลงนามสัญญาและชำระเงินออนไลน์" },
    ],
  }),
  component: LiveLinkPage,
});

function LiveLinkPage() {
  const { token } = useParams({ from: "/l/$token" });
  const { liveLinkByToken, contracts, invoices, signLiveLink, payLiveLink, hydrated } = useCrm();
  const link = liveLinkByToken(token);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);

  if (!hydrated) return <p className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด…</p>;
  if (!link)
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-bold">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="mt-2 text-sm text-muted-foreground">กรุณาติดต่อทีม HotelPlus เพื่อขอลิงก์ใหม่</p>
      </div>
    );

  const cs = contracts.filter((c) => link.contract_ids.includes(c.contract_id));
  const invoice = invoices.find((i) => i.invoice_id === link.invoice_id);
  const signed = link.events.some((e) => e.type === "signed");
  const paid = link.events.some((e) => e.type === "paid") || invoice?.status === "paid";
  const party = cs[0]?.customer_snapshot ?? invoice?.customer_snapshot ?? null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 pb-16">
      <header className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-xs opacity-80">HotelPlus · LIVE Link</p>
        <h1 className="font-display text-xl font-bold">{party?.hotel_name ?? "ยืนยันเอกสาร"}</h1>
        <p className="mt-1 text-xs opacity-90">เคส {link.case_number}</p>
        <div className="mt-3 flex gap-2 text-[11px]">
          <Chip tone={signed ? "success" : "muted"}>{signed ? "ลงนามแล้ว" : "รอลงนาม"}</Chip>
          <Chip tone={paid ? "success" : "muted"}>{paid ? "ชำระแล้ว" : "รอชำระ"}</Chip>
        </div>
      </header>

      <section className="card-elevated p-4">
        <h2 className="font-display text-base font-semibold">สัญญา</h2>
        <div className="mt-3 space-y-3">
          {cs.map((c) => (
            <div key={c.contract_id} className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">{c.contract_id}</p>
              <p className="text-xs text-muted-foreground">
                เริ่ม {fmtDate(c.start_date)} · {c.duration_months} เดือน · เทมเพลต {c.template_snapshot.template_id} v
                {c.template_snapshot.version}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {c.lines.map((l) => (
                  <li key={l.line_id} className="flex justify-between gap-3">
                    <span>{l.name_snapshot}</span>
                    <span className="tabular-nums">{thb(l.unit_price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {invoice && (
        <section className="card-elevated p-4">
          <h2 className="font-display text-base font-semibold">ใบแจ้งหนี้ {invoice.invoice_id}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {invoice.lines.map((l) => (
              <li key={l.line_id} className="flex justify-between gap-3">
                <span className="truncate">{l.name_snapshot}</span>
                <span className="tabular-nums">{thb(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            <Row label="ยอดก่อนภาษี" value={thb(invoice.totals.subtotal)} />
            <Row label="VAT 7%" value={thb(invoice.totals.vat)} />
            <Row label="หัก ณ ที่จ่าย 3%" value={invoice.totals.wht ? `- ${thb(invoice.totals.wht)}` : "—"} />
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold">
              <span>ยอดชำระ</span>
              <span>{thb(invoice.totals.total)}</span>
            </div>
          </div>
        </section>
      )}

      <section className="card-elevated p-4">
        <h2 className="font-display text-base font-semibold">ลงนามดิจิทัล</h2>
        {signed ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
            <Check className="size-4" /> ลงนามเรียบร้อยแล้ว
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              className="mt-3 w-full touch-none rounded-xl border bg-card"
              onPointerDown={(e) => {
                drawing.current = true;
                const ctx = canvasRef.current!.getContext("2d")!;
                const { x, y } = pos(e);
                ctx.beginPath();
                ctx.moveTo(x, y);
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const ctx = canvasRef.current!.getContext("2d")!;
                const { x, y } = pos(e);
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.strokeStyle = "#0f172a";
                ctx.lineTo(x, y);
                ctx.stroke();
                setDrawn(true);
              }}
              onPointerUp={() => (drawing.current = false)}
              onPointerLeave={() => (drawing.current = false)}
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const c = canvasRef.current!;
                  c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
                  setDrawn(false);
                }}
              >
                ล้างลายเซ็น
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={!drawn}
                onClick={() => {
                  signLiveLink(token, canvasRef.current!.toDataURL());
                  toast.success("บันทึกลายเซ็นเรียบร้อย");
                }}
              >
                <PenLine className="size-4" /> ยืนยันลงนาม
              </Button>
            </div>
          </>
        )}
      </section>

      {invoice && (
        <section className="card-elevated p-4">
          <h2 className="font-display text-base font-semibold">ชำระเงิน</h2>
          {paid ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
              <Check className="size-4" /> ได้รับการชำระเงินแล้ว — ระบบออกใบเสร็จ/ใบกำกับภาษีให้อัตโนมัติ
            </div>
          ) : (
            <Button
              className="mt-3 w-full"
              disabled={!signed}
              onClick={() => {
                payLiveLink(token);
                toast.success("ชำระเงินสำเร็จ (จำลอง)");
              }}
            >
              ชำระ {thb(invoice.totals.total)}
            </Button>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" /> ต้นแบบสาธิต — ยังไม่เชื่อมต่อระบบชำระเงินจริง
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
