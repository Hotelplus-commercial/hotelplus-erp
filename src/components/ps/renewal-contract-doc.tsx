/* Contract Renewal v1.1 — one renewal contract document (A4 renderer), shared by Wizard step 3 preview and the customer page. */
import { useRef, useState } from "react";

import { A4Canvas, SignatureBlock } from "@/lib/contract-renderer";
import { RENEWAL_LABEL_TH as L } from "@/lib/ps-glossary";
import type { RenewalRequest } from "@/lib/renewal-rules";
import type { SourceContract } from "@/lib/renewal-store";
import type { PreviewServiceLine } from "@/lib/template-preview-sample-data";

const thb = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const lineOf = (pkg: string): PreviewServiceLine => (/marcom/i.test(pkg) ? "MARCOM" : /prod/i.test(pkg) ? "PROD" : "ORM");
export const thDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
/** A4Canvas = cover page + one terms page. */
export const RENEWAL_DOC_PAGES = 2;

export function RenewalContractDoc({ r, src, signer, signedDate }: { r: RenewalRequest; src: SourceContract; signer?: string; signedDate?: string | null }) {
  const t = r.new_terms;
  return (
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
      <SignatureBlock customerSigner={signer || src.signatory} hpSignatory="ฝ่ายบริหารจัดการ Hotel Plus" signedDate={signedDate ?? null} />
    </A4Canvas>
  );
}

/** Wizard step 3: scrollable preview with page counter + watermark; reports when the last page is reached. */
export function RenewalContractPreview({ r, src, onReachedEnd }: { r: RenewalRequest; src: SourceContract; onReachedEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const atEnd = max <= 4 || el.scrollTop >= max - 4;
    setPage(atEnd ? RENEWAL_DOC_PAGES : Math.min(RENEWAL_DOC_PAGES, 1 + Math.floor((el.scrollTop / Math.max(1, max)) * RENEWAL_DOC_PAGES)));
    if (atEnd) onReachedEnd();
  };
  return (
    <div className="relative">
      <div ref={ref} onScroll={onScroll} data-testid="renewal-preview" className="relative h-[70vh] overflow-y-auto rounded-lg border bg-muted/40 p-3">
        <div aria-hidden className="pointer-events-none sticky top-1/3 z-10 -mb-10 h-10 text-center text-3xl font-bold text-muted-foreground/30">{L.previewWatermark}</div>
        <RenewalContractDoc r={r} src={src} />
      </div>
      <span className="absolute right-3 top-2 z-20 rounded bg-card px-2 py-0.5 text-xs tabular-nums shadow">หน้า {page} / {RENEWAL_DOC_PAGES}</span>
    </div>
  );
}
