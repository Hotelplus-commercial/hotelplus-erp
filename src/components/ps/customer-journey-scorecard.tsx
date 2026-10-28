/* Header R2 §3–§5 — Customer Journey scorecard (replaces the old Headline strip on the PS Dashboard page).
 * Unit = service contract, rows ORM / Marcom. Pure numbers come from src/lib/ps-header-r2.ts. */
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NowChip, useCardCompare } from "./compare-control";
import { TH_MONTH, beYear } from "@/lib/card-compare";
import { journeyScorecard, selLabel, type Delta, type GradeRow, type HeaderSel, type JourneyInput, type ScoreRowOut } from "@/lib/ps-header-r2";
import { cn } from "@/lib/utils";

const fmt = (n: number, d = 0) => n.toLocaleString("th-TH", { maximumFractionDigits: d, minimumFractionDigits: d });
export const monthTh = (m: string | null) => (m ? `${TH_MONTH[+m.slice(5, 7) - 1]} ${String(beYear(+m.slice(0, 4))).slice(-2)}` : "—");

/** Δ pill: arrow + value only; the comparison value lives in its tooltip. */
export function DeltaPill({ d, unit = "", digits = 0, tip }: { d: Delta; unit?: string; digits?: number; tip?: (b: number) => string }) {
  if (!d) return null;
  const txt = d.d === 0 ? "เท่าเดิม" : `${d.d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d.d), digits)}${unit}`;
  return <span data-testid="delta-pill" className={cn("r2-delta", `r2-delta-${d.tone}`)} title={tip ? tip(d.b) : `ช่วงที่เทียบ ${fmt(d.b, digits)}${unit}`}>{txt}</span>;
}

export function R2Info({ title, body, source }: { title: string; body: string; source: string }) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button type="button" className="r2-info" aria-label={`นิยาม ${title}`}><Info className="size-3.5" aria-hidden /></button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="r2-tip"><strong>{title}</strong><p>{body}</p><p className="r2-tip-src">ที่มา: {source}</p></TooltipContent>
    </Tooltip>
  );
}

type Phase = "pre" | "active" | "risk";
type Col = { key: string; num: number; phase: Phase; title: string; info: string; source: string };
const COLS: Col[] = [
  { key: "c1", num: 1, phase: "pre", title: "รอเริ่ม", info: "สัญญาบริการที่ BD ปิดได้แล้ว (stage 6–9) แยก ORM / Marcom ตาม SKU ของ Service Line ในสัญญา · ยังไม่มีผู้ดูแล จึงไม่ถูกกรองด้วย ทีม / คน", source: "Contract Dashboard (ดีลฝั่ง BD)" },
  { key: "c2a", num: 2, phase: "pre", title: "ในคิวตอนนี้", info: "On-board · สัญญาบริการที่อยู่ในคิว ณ วันนี้ · บรรทัดล่าง = จำนวนวันที่รอ ค่าที่พบบ่อยที่สุด พร้อมความถี่", source: "การ์ด On-board" },
  { key: "c2b", num: 2, phase: "pre", title: "ใช้เวลา Go Live", info: "On-board · จำนวนวันจาก AE รับคิว New Property (หลัง AC ออกใบเสร็จ) ถึง Go Live · เฉพาะสัญญาที่ Go Live ในช่วงที่เลือก · ค่าที่พบบ่อยที่สุด พร้อมความถี่ · ไม่มียอดรวม เพราะเป็นค่าของแต่ละบริการ", source: "การ์ด On-board (วันที่สร้างการ์ด → วัน Go Live)" },
  { key: "c3", num: 3, phase: "active", title: "ใช้งาน", info: "สัญญาบริการสถานะใช้งาน ณ วันนี้ · โรงแรมที่ใช้ 2 บริการนับ 2 สัญญา", source: "สัญญา & บริการ" },
  { key: "c4", num: 4, phase: "risk", title: "หลุด (Churn)", info: "สัญญาบริการที่สิ้นสุดและไม่ต่อ ในช่วงที่เลือก · % = สัดส่วนของฐานสัญญา · ยอดรวมแสดงเฉพาะจำนวน ไม่รวม %", source: "สัญญา & บริการ (วันที่สัญญาสิ้นสุด)" },
  { key: "c5", num: 5, phase: "risk", title: "คะแนนบริการ", info: "คะแนนเซอร์เวย์ 0–10 ที่พบบ่อยที่สุด พร้อมความถี่ · ป้ายแดง \"ต่ำ n\" = จำนวนคะแนน 5 ลงไป · ไม่มียอดรวม", source: "เซอร์เวย์ลูกค้า (ยังไม่มีข้อมูลคะแนน)" },
  { key: "c6", num: 6, phase: "risk", title: "เกรดชำระเงิน", info: "จำนวนสัญญาบริการเกรด C และ D · เกรดคิดรายลูกค้า (ชุดเดียวกับแท็บ AC) แสดงที่ทุกสัญญาของลูกค้า ลูกค้าที่ใช้ 2 บริการนับทั้ง 2 แถว", source: "AC Billing · เกรดล่าสุด (ชุดเดียวกับแท็บ ลูกหนี้ & ค่าใช้จ่ายรายสัญญา)" },
];
const PHASES: { phase: Phase; label: string; span: number }[] = [
  { phase: "pre", label: "ก่อนใช้งาน", span: 3 },
  { phase: "active", label: "ใช้งาน", span: 1 },
  { phase: "risk", label: "สุขภาพ / เสี่ยง", span: 3 },
];

function GradeList({ rows, up }: { rows: GradeRow[]; up: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild><button type="button" className="r2-link">ดูรายชื่อ ›</button></PopoverTrigger>
      <PopoverContent side={up ? "top" : "bottom"} align="start" className="r2-grade-pop">
        {rows.length ? (
          <ul data-testid="grade-list">
            {rows.map((g, i) => (
              <li key={i}><span className={cn("r2-grade", g.grade === "D" ? "r2-grade-d" : "r2-grade-c")}>{g.grade}</span><span className="r2-grade-hotel">{g.hotel_name}</span><span className="r2-grade-meta">AE {g.ae_name} · ค้าง {g.overdue ?? "—"} งวด</span></li>
            ))}
          </ul>
        ) : <p className="r2-muted">ไม่มีสัญญาเกรด C หรือ D ในงวดนี้</p>}
      </PopoverContent>
    </Popover>
  );
}

export function CustomerJourneyScorecard({ input, sel, aliases }: { input: JourneyInput; sel: HeaderSel; aliases?: Record<string, string[]> }) {
  const golive = useCardCompare("header", "golive", input.today);
  const churn = useCardCompare("header", "churn", input.today);
  const score = useCardCompare("header", "score", input.today);
  const sc = journeyScorecard(input, sel, { golive, churn, score }, aliases);
  const [hover, setHover] = useState<number | null>(null);
  const filtered = sel.kind !== "ALL";
  const slot = (c: Col): ReactNode =>
    c.key === "c2b" ? golive.control : c.key === "c4" ? churn.control : c.key === "c5" ? score.control
      : c.key === "c6" ? <span className="cmp-now-chip">งวดบิลล่าสุด · {monthTh(sc.gradeMonth)}</span> : <NowChip />;
  const total = (c: Col) => {
    const v = c.key === "c1" ? sc.totals.upcoming : c.key === "c2a" ? sc.totals.queue : c.key === "c3" ? sc.totals.active : c.key === "c4" ? sc.totals.churn : undefined;
    return v == null ? "" : `รวม ${fmt(v)} สัญญา`;
  };
  const main = (v: ReactNode, unit?: string) => <div className="r2-main">{v}{unit && <small>{unit}</small>}</div>;
  const cell = (r: ScoreRowOut, c: Col): ReactNode => {
    if (!r.scoped && c.key !== "c1") return <div className="r2-main r2-out" aria-label="นอกขอบเขต">—</div>;
    switch (c.key) {
      case "c1": return main(fmt(r.upcoming), "สัญญา");
      case "c2a": return <>{main(fmt(r.queue.n), "สัญญา")}<p className="r2-sub">{r.queue.wait ? `รอ ${fmt(r.queue.wait.value)} วัน · ${r.queue.wait.k} จาก ${r.queue.wait.n}` : "ไม่มีงานในคิว"}</p></>;
      case "c2b": return r.golive.mode ? <>{main(fmt(r.golive.mode.value), "วัน")}<p className="r2-sub">{r.golive.mode.k} จาก {r.golive.mode.n} สัญญา</p><DeltaPill d={r.golive.d} unit=" วัน" /></> : <>{main("—")}<p className="r2-sub">ยังไม่มีสัญญาที่ Go Live ในช่วงนี้</p></>;
      case "c3": return main(fmt(r.active), "สัญญา");
      case "c4": return <>{main(fmt(r.churn.out), "สัญญา")}<p className="r2-sub">{r.churn.pct == null ? "ยังไม่มีฐานสัญญา" : `${fmt(r.churn.pct, 1)}% ของฐาน`}</p><DeltaPill d={r.churn.d} /></>;
      case "c5": return r.score?.mode ? <>{main(fmt(r.score.mode.value), "คะแนน")}<p className="r2-sub">{r.score.mode.k} จาก {r.score.mode.n} ราย</p><div className="r2-pills"><DeltaPill d={r.score.d} />{r.score.low > 0 && <span className="r2-low">ต่ำ {r.score.low}</span>}</div></> : <>{main("—")}<p className="r2-sub">รอข้อมูล</p></>;
      default: return <><div className="r2-grade-lines"><span><b className="r2-grade-c-text">Grade C</b> {fmt(r.grades.c.length)}</span><span><b className="r2-grade-d-text">Grade D</b> {fmt(r.grades.d.length)}</span></div><GradeList rows={[...r.grades.c, ...r.grades.d]} up={r.service === "Marcom"} /></>;
    }
  };
  return (
    <TooltipProvider>
      <section className="r2-card" data-testid="journey-scorecard" aria-label="เส้นทางลูกค้า · สัญญาบริการ">
        <header className="r2-head">
          <div>
            <p className="r2-kicker">CUSTOMER JOURNEY</p>
            <h2 className="r2-title">เส้นทางลูกค้า · สัญญาบริการ</h2>
          </div>
          <div className="r2-head-right">
            {filtered && <span className="r2-scope-pill" data-testid="scope-pill">เฉพาะสัญญาของ {selLabel(sel)} (ยกเว้นรอเริ่ม)</span>}
            <span className="r2-legend">ⓘ ชี้เพื่อดูนิยาม · 📅 เลือกการเทียบได้ · ณ วันนี้ = ข้อมูลปัจจุบัน</span>
          </div>
        </header>
        <div className="r2-scroll">
          <div className="r2-grid" role="table" aria-label="ตัวชี้วัดเส้นทางลูกค้า">
            <div className="r2-sticky r2-phase-blank" />
            {PHASES.map((p) => <div key={p.phase} className={cn("r2-phase", `r2-ph-${p.phase}`)} style={{ gridColumn: `span ${p.span}` }}>{p.label}</div>)}
            <div className="r2-sticky r2-colhead-blank" role="columnheader" />
            {COLS.map((c, i) => (
              <div key={c.key} role="columnheader" data-testid="r2-colhead" className={cn("r2-colhead", `r2-ph-${c.phase}`, hover === i && "r2-hover")} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className="r2-track"><span className="r2-dot">{c.num}</span></div>
                <div className="r2-col-title" data-testid="r2-col-title">{c.title}<R2Info title={c.title} body={c.info} source={c.source} /></div>
                <div className="r2-slot">{slot(c)}</div>
                <div className="r2-total" data-testid={`total-${c.key}`}>{total(c)}</div>
              </div>
            ))}
            {sc.rows.map((r) => (
              <div key={r.service} role="row" className="r2-row" data-testid={`r2-row-${r.service}`}>
                <div className={cn("r2-sticky r2-rowlabel", r.service === "ORM" ? "r2-orm" : "r2-marcom")} role="rowheader">
                  <span className="r2-tag">{r.service}</span>
                  {!r.scoped && <span className="r2-outscope">นอกขอบเขต</span>}
                </div>
                {COLS.map((c, i) => (
                  <div key={c.key} role="cell" data-col={c.key} className={cn("r2-cell", r.service === "ORM" ? "r2-orm" : "r2-marcom", !r.scoped && c.key !== "c1" && "r2-dim", hover === i && "r2-hover", i === COLS.length - 1 && "r2-cell-last")} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    {cell(r, c)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
