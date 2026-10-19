/* Contract Renewal v1.0 — customer signing page (renewal mode: no KYC, no payment step).
 * Same A4 renderer as the new-contract preview. Testing mode: browser-local, same machine only. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RenewalContractDoc, thDate } from "@/components/ps/renewal-contract-doc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RENEWAL_LABEL_TH as L } from "@/lib/ps-glossary";
import { usePsRenewal } from "@/lib/ps-renewal";
import { requestById, setRenewalDemo, signRequest, sourceContractById, useRenewalStore } from "@/lib/renewal-store";

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

function SignPage() {
  const { requestId } = Route.useParams();
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => { const q = new URLSearchParams(window.location.search); setRenewalDemo(q.get("demo") === "1"); setPreview(q.get("preview") === "1"); setReady(true); }, []);
  useRenewalStore();
  const { addActivity } = usePsRenewal();
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const r = ready ? requestById(requestId) : null;
  const src = r ? sourceContractById(r.source_contract_id) : null;

  if (!ready) return <Box>กำลังเปิดสัญญา…</Box>;
  if (!r || !src) return <Box>ไม่พบ link นี้ หรือ link หมดอายุแล้ว · โปรดติดต่อผู้ดูแลของคุณ</Box>;
  const signed = r.status === "SIGNED";
  if (!preview && !signed && r.status !== "LINK_SENT") return <Box>link นี้ยังไม่พร้อมให้ลงนาม หรือถูกปิดแล้ว · โปรดติดต่อผู้ดูแลของคุณ</Box>;

  const signerOk = name.trim().length >= 2;
  const locked = preview || signed;
  const doSign = () => {
    const o = signRequest(r.id); if (!o.ok) { toast.error(o.error); return; }
    addActivity(r.renewal_card_id, { type: "Contract", at: "วันนี้", note: `ลูกค้าลงนามสัญญาต่ออายุ (${name.trim()}) · เริ่ม ${o.req.new_terms.start_date}`, file: `${o.req.new_contract_id}.pdf`, by: "ลูกค้า" });
    toast.success("ลงนามเรียบร้อย");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {preview && <p role="status" className="rounded-md border border-warning/40 bg-warning/10 p-2 text-center text-sm font-medium">{L.previewBanner}</p>}
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">HotelPlus · LIVE Link</p>
        <h1 className="font-display text-2xl font-bold">ลงนามต่อสัญญา · {r.hotel_name}</h1>
        <p className="text-sm text-muted-foreground">ตรวจเงื่อนไขด้านล่าง แล้วลงนามเพื่อเริ่มสัญญารอบใหม่</p>
      </header>
      <RenewalContractDoc r={r} src={src} signer={signerOk ? name.trim() : undefined} signedDate={signed ? thDate(r.signed_at ?? "") : null} />
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">ลงนามดิจิทัล</h2>
        {signed ? (
          <p className="text-sm">ลงนามเรียบร้อยแล้ว เมื่อ {thDate(r.signed_at ?? "")} · เลขที่สัญญา {r.new_contract_id} · สัญญาใหม่เริ่ม {thDate(r.new_terms.start_date)}</p>
        ) : (
          <>
            <label className="flex items-start gap-2 text-sm"><Checkbox disabled={locked} checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" /> ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขสัญญาต่ออายุข้างต้น</label>
            <Input disabled={locked} aria-label="ชื่อผู้ลงนาม" placeholder={`ชื่อ-นามสกุลผู้ลงนาม (เช่น ${src.signatory})`} value={name} onChange={(e) => setName(e.target.value)} />
            <Button className="w-full sm:w-auto" disabled={locked || !agree || !signerOk} onClick={doSign}>ลงนามสัญญา</Button>
          </>
        )}
        {!preview && <p className="text-xs text-muted-foreground">โหมดทดสอบ: ลงนามได้บนเครื่องเดียวกับที่ส่ง link เท่านั้น</p>}
      </div>
      {signed && !preview && <Back />}
    </div>
  );
}

const Box = ({ children }: { children: React.ReactNode }) => <div className="mx-auto mt-16 max-w-lg space-y-3 rounded-xl border bg-card p-8 text-center text-sm">{children}</div>;
function Back() {
  const demo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
  return <div><Link to="/ps/ae-workspace/dashboard" search={(demo ? { demo: 1 } : {}) as never} hash="renewal-activities" className="text-primary underline">กลับ AE Workspace (ทีมงาน)</Link></div>;
}
