import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, Wand2 } from "lucide-react";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { statusLabel, statusTone, useBd } from "@/lib/bd-store";

export const Route = createFileRoute("/ps/contract-wizard/")({
  component: WizardLanding,
});

/* Screen PS-7 · Wizard landing — entry is via BD Quote Detail only (R24) */
function WizardLanding() {
  const { quotes, deals } = useBd();
  const handoff = quotes.filter(
    (q) => q.status === "approved" || q.status === "contract_in_progress" || q.status === "contract_generated",
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed p-8 text-center">
        <Wand2 className="mx-auto size-8 text-[color:var(--ps,#7048A3)]" />
        <h1 className="mt-3 font-display text-xl font-semibold">Contract Wizard</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          การสร้างสัญญาต้องเริ่มจาก Quote Dashboard: เปิดใบเสนอราคาที่ approved แล้วกด “Go to Create Contract on PS App”
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild className="gap-1.5">
            <Link to="/bd/quotes">
              <FileText className="size-4" /> Open Quote Dashboard →
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/ps/contract-wizard/classic">Wizard เดิม (CRM prototype)</Link>
          </Button>
        </div>
      </div>

      <Panel title="ใบเสนอราคาที่ส่งมอบให้ PS แล้ว" subtitle="สถานะจาก BD App · ใช้ตรวจสอบว่ามีเคสรอสร้างสัญญาหรือไม่">
        <div className="space-y-2">
          {handoff.map((q) => {
            const deal = deals.find((d) => d.deal_id === q.deal_id);
            return (
              <div key={q.quote_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <div>
                  <p className="font-semibold">
                    {q.quote_id} <Chip tone={statusTone(q.status)}>{statusLabel[q.status]}</Chip>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.hotel_name} · {q.deal_id ?? "ยังไม่ผูกดีล"} · อนุมัติ {fmtDate(q.approved_at)}
                    {deal ? ` · package seq ${deal.next_package_seq}` : ""}
                  </p>
                </div>
                {q.deal_id && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/ps/contract-wizard/$dealId" params={{ dealId: q.deal_id }}>
                      เปิด Wizard ของดีลนี้
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
          {!handoff.length && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีเคสส่งมอบจาก BD</p>}
        </div>
      </Panel>
    </div>
  );
}
