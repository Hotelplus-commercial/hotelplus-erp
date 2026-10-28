/* Header R2 §6 — Active Portfolio (replaces the old Portfolio snapshot on the PS Dashboard page).
 * ORM boxes compare "as of today" vs "as of the same day" of the previous period (contract_price_history row in
 * force on that day); Marcom boxes compare totals within each period (Marcom App via marcomAppSource). */
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NowChip, useCardCompare, type CardCompare } from "./compare-control";
import { DeltaPill, R2Info } from "./customer-journey-scorecard";
import { delta, marcomBox, ormAsOf, activeOn, rowMatches, inScope, type HeaderSel, type PortfolioContract, type PriceRow, type Svc } from "@/lib/ps-header-r2";
import { MARCOM_NOT_CONNECTED, type MarcomRecord } from "@/lib/marcom-app-source";
import { cn } from "@/lib/utils";

const fmt = (n: number, d = 0) => n.toLocaleString("th-TH", { maximumFractionDigits: d, minimumFractionDigits: d });
const MULTI_NOTE = "1 สัญญามีได้หลายรูปแบบ ยอดรวมของกลุ่มจึงเกินจำนวนสัญญาได้";

type BoxProps = { name: string; info: string; source: string; n: number; nB: number; cmp: CardCompare; label: string; value: string; secondary: string; d: ReturnType<typeof delta>; dUnit?: string | undefined; dDigits?: number | undefined; dPrefix?: string | undefined };
function Box(p: BoxProps) {
  return (
    <div className="ap-box" data-testid={`ap-box-${p.name}`}>
      <div className="ap-name">{p.name}<R2Info title={p.name} body={p.info} source={p.source} /></div>
      <div className="ap-count"><span>{fmt(p.n)}</span><small>สัญญา</small><DeltaPill d={delta(p.n, p.nB, "neutral")} /></div>
      <div className="ap-cmp">{p.cmp.control}</div>
      <div className="ap-rows">
        <span className="ap-label">{p.label}</span>
        <span className="ap-value">{p.value}</span>
        <span className="ap-sec">{p.secondary}</span>
        <span className="ap-delta">{p.d && <DeltaPill d={p.d} unit={p.dUnit} digits={p.dDigits} prefix={p.dPrefix} tip={(b) => `ช่วงที่เทียบ ${p.dPrefix ?? ""}${fmt(b, p.dDigits ?? 0)}${p.dUnit ?? ""}`} />}</span>
      </div>
    </div>
  );
}

function Panel({ svc, n, hotels, out, children }: { svc: Svc; n: number; hotels: number; out: boolean; children: ReactNode }) {
  return (
    <section className={cn("ap-panel", svc === "ORM" ? "r2-orm ap-orm" : "r2-marcom ap-marcom")} data-testid={`ap-panel-${svc}`}>
      <header className="ap-panel-head"><h3>{svc}</h3><span>{out ? "นอกขอบเขต" : `${fmt(n)} สัญญา · ${fmt(hotels)} โรงแรม`}</span></header>
      {/* Out of the ทีม / คน scope: dimmed, never shown as 0 (same rule as the scorecard). */}
      {out ? <p className="ap-note r2-dim">—</p> : <div className="ap-boxes">{children}</div>}
      <p className="ap-note">{MULTI_NOTE}</p>
    </section>
  );
}

export function ActivePortfolio({ today, total, active, contracts: all, prices, marcom, sel, aliases }: {
  today: string; total: number | null;
  /** Same active service contracts as scorecard col 3 (per service, after ทีม / คน). */
  active: { service: Svc; hotel_id: string }[];
  contracts: PortfolioContract[]; prices: PriceRow[];
  marcom: { posts: MarcomRecord[] | null; ads: MarcomRecord[] | null; kol: MarcomRecord[] | null };
  sel: HeaderSel; aliases?: Record<string, string[]> | undefined;
}) {
  const contracts = all.filter((c) => rowMatches(c, sel, aliases));
  const flat = useCardCompare("header", "ap-flat", today), comm = useCardCompare("header", "ap-commission", today);
  const content = useCardCompare("header", "ap-content", today), ads = useCardCompare("header", "ap-ads", today), kol = useCardCompare("header", "ap-kol", today);
  const svcRows = (s: Svc) => active.filter((a) => a.service === s);
  const head = (s: Svc) => ({ n: svcRows(s).length, hotels: new Set(svcRows(s).map((a) => a.hotel_id)).size });
  const oA = (c: CardCompare) => ormAsOf(contracts, prices, c.asOfA), oB = (c: CardCompare) => ormAsOf(contracts, prices, c.asOfB);
  const fA = oA(flat).flat, fB = oB(flat).flat, cA = oA(comm).commission, cB = oB(comm).commission;
  const mb = (k: "content" | "ads" | "kol", c: CardCompare, feed: MarcomRecord[] | null) => ({ a: marcomBox(contracts, k, c.asOfA, c.a, feed), b: marcomBox(contracts, k, c.asOfB, c.b, feed) });
  const ct = mb("content", content, marcom.posts), ad = mb("ads", ads, marcom.ads), kl = mb("kol", kol, marcom.kol);
  const pct = (v: number | null) => (v == null ? "—" : `${fmt(v)}%`);
  const ormSrc = "สัญญา & บริการ (SKU) + ประวัติราคาสัญญา";
  const marcomSrc = "สัญญา (โควตา) + Marcom App (ยังไม่เชื่อมต่อ)";
  const sec = (from: number) => `จาก ${fmt(from)} สัญญา`;
  const nc = (x: { value: number | null }) => x.value == null;
  return (
    <TooltipProvider>
      <section className="r2-card" data-testid="active-portfolio" aria-label="สัญญาที่ใช้งาน · แยกตามรูปแบบบริการ">
        <header className="r2-head">
          <div>
            <p className="r2-kicker">ACTIVE PORTFOLIO</p>
            <div className="flex flex-wrap items-center gap-2"><h2 className="r2-title">สัญญาที่ใช้งาน · แยกตามรูปแบบบริการ</h2><NowChip /></div>
          </div>
          <strong className="ap-total" data-testid="ap-total">{total == null ? "" : `รวม ${fmt(total)} สัญญา`}</strong>
        </header>
        <div className="ap-panels">
          <Panel svc="ORM" out={!inScope("ORM", sel)} {...head("ORM")}>
            <Box name="Flat Rate" info="สัญญา ORM ที่มี SKU ค่าบริการรายเดือนแบบคงที่ · ค่าบริการเฉลี่ย = ค่าเฉลี่ยของค่าบริการต่อสัญญาตามราคาที่มีผล ณ วันนั้น · เทียบ ณ วันเดียวกันของช่วงก่อน" source={ormSrc}
              n={fA.n} nB={fB.n} cmp={flat} label="ค่าบริการเฉลี่ยต่อสัญญา" value={fA.value == null ? "—" : `฿${fmt(fA.value)}/เดือน`} secondary={sec(fA.from)} d={delta(fA.value, fB.value, "up")} dUnit="" dPrefix="฿" />
            <Box name="Commission" info="สัญญา ORM ที่มี SKU ค่าคอมมิชชัน · ค่าคอมเฉลี่ย = ค่าเฉลี่ยแบบธรรมดาของ % ค่าคอมต่อสัญญา (ไม่ถ่วงน้ำหนัก) · เทียบ ณ วันเดียวกันของช่วงก่อน" source={ormSrc}
              n={cA.n} nB={cB.n} cmp={comm} label="ค่าคอมเฉลี่ยต่อสัญญา" value={cA.value == null ? "—" : `${fmt(cA.value, 1)}%`} secondary={sec(cA.from)} d={delta(cA.value, cB.value, "down")} dUnit=" จุด" dDigits={1} />
          </Panel>
          <Panel svc="Marcom" out={!inScope("Marcom", sel)} {...head("Marcom")}>
            <Box name="Content" info="สัญญา Marcom ที่มี SKU Content · ส่งจริงเฉลี่ย = ชิ้นงานที่ส่งในช่วง ÷ จำนวนเดือน ÷ จำนวนสัญญา · เทียบยอดภายในแต่ละช่วง" source={marcomSrc}
              n={ct.a.n} nB={ct.b.n} cmp={content} label="ส่งจริงเฉลี่ยต่อสัญญา" value={nc(ct.a) ? "—" : `${fmt(ct.a.value!)} ชิ้น/เดือน`} secondary={nc(ct.a) ? (marcom.posts ? "ยังไม่มีชิ้นงานในช่วงนี้" : MARCOM_NOT_CONNECTED) : `ตามสัญญา ${ct.a.quota == null ? "—" : fmt(ct.a.quota)} ชิ้น · ส่งครบ ${pct(ct.a.completion)}`} d={nc(ct.a) ? null : delta(ct.a.value, ct.b.value, "up")} dUnit="" />
            <Box name="Ads" info="สัญญา Marcom ที่มี SKU Ads · เติมงบเฉลี่ย = ยอดเติมงบในช่วง ÷ จำนวนเดือน ÷ จำนวนสัญญา · เทียบยอดภายในแต่ละช่วง" source={marcomSrc}
              n={ad.a.n} nB={ad.b.n} cmp={ads} label="เติมงบเฉลี่ยต่อสัญญา" value={nc(ad.a) ? "—" : `฿${fmt(ad.a.value!)}/เดือน`} secondary={nc(ad.a) ? (marcom.ads ? "ยังไม่มีการเติมงบในช่วงนี้" : MARCOM_NOT_CONNECTED) : sec(ad.a.n)} d={nc(ad.a) ? null : delta(ad.a.value, ad.b.value, "up")} dPrefix="฿" />
            <Box name="KOL" info="สัญญา Marcom ที่มี SKU KOL · KOL เข้าเฉลี่ย = จำนวน KOL ที่เข้าในช่วง ÷ จำนวนเดือน ÷ จำนวนสัญญา · Δ = ส่งครบเทียบช่วงก่อน (จุด)" source={marcomSrc}
              n={kl.a.n} nB={kl.b.n} cmp={kol} label="KOL เข้าเฉลี่ยต่อสัญญา" value={nc(kl.a) ? "—" : `${fmt(kl.a.value!, 1)} คน/เดือน`} secondary={nc(kl.a) ? (marcom.kol ? "ยังไม่มี KOL เข้าในช่วงนี้" : MARCOM_NOT_CONNECTED) : `ตามสัญญา ${kl.a.quota == null ? "—" : fmt(kl.a.quota)} คน · ส่งครบ ${pct(kl.a.completion)}`} d={nc(kl.a) ? null : delta(kl.a.completion, kl.b.completion, "up")} dUnit=" จุด" />
          </Panel>
        </div>
      </section>
    </TooltipProvider>
  );
}
export { activeOn };
