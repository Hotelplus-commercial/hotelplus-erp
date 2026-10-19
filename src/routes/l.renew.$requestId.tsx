/* Contract Renewal v1.0 — customer signing page (renewal mode: no KYC, no payment step).
 * Same A4 renderer as the new-contract preview. Testing mode: browser-local, same machine only. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { A4Canvas, SignatureBlock } from "@/lib/contract-renderer";
import { usePsRenewal } from "@/lib/ps-renewal";
import { requestById, setRenewalDemo, signRequest, sourceContractById, useRenewalStore } from "@/lib/renewal-store";
import type { PreviewServiceLine } from "@/lib/template-preview-sample-data";

export const Route = createFileRoute("/l/renew/$requestId")({
  head: () => ({
    meta: [
      { title: "ลงนามต่อสัญญา | Hotel Plus" },
      { name: "description", content: "ตรวจเงื่อนไขและลงนามสัญญาต่ออายุบริการ Hotel Plus" },
      { property: "og:title", content: "ลงนามต่อสัญญา | Hotel Plus" },
      { property: "og:description", content: "ตรวจเงื่อนไขและลงนามสัญญาต่ออายุบริการ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

const thb = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const lineOf = (pkg: string): PreviewServiceLine => (/marcom/i.test(pkg) ? "MARCOM" : /prod/i.test(pkg) ? "PROD" : "ORM");
const thDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

function SignPage() {
  const { requestId } = Route.useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => { setRenewalDemo(new URLSearchParams(window.location.search).get("demo") === "1"); setReady(true); }, []);
  useRenewalStore();
  const { addActivity, markDone } = usePsRenewal();
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const r = ready ? requestById(requestId) : null;
  const src = r ? sourceContractById(r.source_contract_id) : null;

  if (!ready) return <Box>กำลังเปิดสัญญา…</Box>;
  if (!r || !src) return <Box>ไม่พบ link นี้ หรือ link หมดอายุแล้ว · โปรดติดต่อผู้ดูแลของคุณ</Box>;
  if (r.status === "SIGNED") return <Box>ลงนามเรียบร้อยแล้ว เมื่อ {thDate(r.signed_at ?? "")} · เลขที่สัญญา {r.new_contract_id} · สัญญาใหม่เริ่ม {thDate(r.new_terms.start_date)}<Back /></Box>;
  if (r.status !== "LINK_SENT") return <Box>link นี้ยังไม่พร้อมให้ลงนาม · โปรดติดต่อผู้ดูแลของคุณ</Box>;

  const t = r.new_terms;
  const signerOk = name.trim().length >= 2;
  const doSign = () => {
    const o = signRequest(r.id); if (!o.ok) { toast.error(o.error); return; }
    addActivity(r.renewal_card_id, { type: "Contract", at: "วันนี้", note: `ลูกค้าลงนามสัญญาต่ออายุ (${name.trim()}) · เริ่ม ${o.req.new_terms.start_date}`, file: `${o.req.new_contract_id}.pdf`, by: "ลูกค้า" });
    markDone(r.renewal_card_id, "COMPLETED", r.ae_owner_id);
    toast.success("ลงนามเรียบร้อย");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">ลงนามต่อสัญญา · {r.hotel_name}</h1>
        <p className="text-sm text-muted-foreground">ตรวจเงื่อนไขด้านล่าง แล้วลงนามเพื่อเริ่มสัญญารอบใหม่ · ไม่มีขั้นตอนชำระเงินในหน้านี้</p>
      </header>
      <A4Canvas serviceLine={lineOf(t.package)} contractCode={`${r.source_contract_id} · ต่ออายุ`} hotelName={r.hotel_name}>
        <section className="a4-block">
          <h3 className="a4-block-title">คู่สัญญา</h3>
          <p>{src.legal_entity} (เจ้าของโครงการ) · โรงแรม {r.hotel_name} · รหัสลูกค้า {r.customer_id}</p>
          <p>สัญญานี้เป็นการต่ออายุสัญญาเลขที่ {r.source_contract_id} ซึ่งสิ้นสุดวันที่ {thDate(r.old_terms.end_date)}</p>
        </section>
        <section className="a4-block">
          <h3 className="a4-block-title">เงื่อนไขสัญญารอบใหม่</h3>
          <table className="w-full text-sm"><tbody>
            <tr><td>แพ็กเกจ</td><td>{t.package}</td></tr>
            <tr><td>ค่าบริการรายเดือน</td><td>{thb(t.fee_amount)}</td></tr>
            <tr><td>ค่าคอมมิชชัน</td><td>{t.commission_pct}%</td></tr>
            <tr><td>ระยะสัญญา</td><td>{t.term_months} เดือน · {thDate(t.start_date)} – {thDate(t.end_date)}</td></tr>
          </tbody></table>
          <p>ข้อกำหนดและเงื่อนไขอื่นเป็นไปตามสัญญาฉบับเดิม</p>
        </section>
        <SignatureBlock customerSigner={signerOk ? name.trim() : src.signatory} hpSignatory="ฝ่ายบริหารจัดการ Hotel Plus" signedDate={null} />
      </A4Canvas>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" /> ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขสัญญาต่ออายุข้างต้น</label>
        <Input aria-label="ชื่อผู้ลงนาม" placeholder={`ชื่อ-นามสกุลผู้ลงนาม (เช่น ${src.signatory})`} value={name} onChange={(e) => setName(e.target.value)} />
        <Button className="w-full sm:w-auto" disabled={!agree || !signerOk} onClick={doSign}>ลงนามสัญญา</Button>
        <p className="text-xs text-muted-foreground">โหมดทดสอบ: ลงนามได้บนเครื่องเดียวกับที่ส่ง link เท่านั้น</p>
      </div>
    </div>
  );
}

const Box = ({ children }: { children: React.ReactNode }) => <div className="mx-auto mt-16 max-w-lg space-y-3 rounded-xl border bg-card p-8 text-center text-sm">{children}</div>;
function Back() {
  const demo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
  return <div><Link to="/ps/ae-workspace/dashboard" search={(demo ? { demo: 1 } : {}) as never} hash="renewal-activities" className="text-primary underline">กลับ AE Workspace (ทีมงาน)</Link></div>;
}
