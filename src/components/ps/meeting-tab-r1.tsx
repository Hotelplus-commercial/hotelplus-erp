// PS Dashboard · Tab "การประชุม & เซอร์เวย์" R1 (MS1–MS40). Read-only: meetings / surveys / label answers / survey flags come only
// from meeting-survey-store (+ tab DEMO additions) through the pure helpers in src/lib/meeting-tab-r1.ts. Writes nothing.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TH_MONTH } from "@/lib/card-compare";
import { monthsInPeriod, MEETING_CONFIG } from "@/lib/meeting-dashboard-types";
import { msNow, useMeetingSurveyData } from "@/lib/meeting-survey-store";
import { MEETING_R1 } from "@/lib/ps-glossary";
import {
  getMeetingTabData, tabMeetings, vMeetingFunnel, vMeetingFunnelDetail, vMeetingTierAPending, vMeetingByOwner, vMeetingSurveyCoverage,
  vMeetingSurveyScores, vMeetingSurveyByOwner, vMeetingSurveyLabels, vMeetingSurveySilent, vMeetingSignalCounts, vMeetingFreeComments,
  versionsIn, band, SET1_TOPICS, type Svc, type TabMeeting, type Funnel, type DetailRow, type OwnerLens, type ScoreRow, type ScoreCell,
} from "@/lib/meeting-tab-r1";
import { median } from "@/lib/meeting-dashboard-types";
import { ANALYZER_DEMO } from "@/lib/meeting-tab-r1-demo";
import { useCardCompare } from "./compare-control";
import { DashCard, InfoButton, type InfoBlocks } from "./dash-card";
import { SignalMark } from "./signal-mark";

const T = MEETING_R1;
const SVC_NAME: Record<Svc, string> = { ORM: "ORM-Snapshot Meeting", MARCOM: "Marcom-Sync up Meeting" };
const SVC_CHIP: Record<Svc, string> = { ORM: "ORM", MARCOM: "Marcom" };
const monthTh = (ym: string) => `${TH_MONTH[+ym.slice(5, 7) - 1] ?? ""} ${String((+ym.slice(0, 4) + 543) % 100).padStart(2, "0")}`;
const dayTh = (d: string | null) => (d ? `${+d.slice(8, 10)} ${TH_MONTH[+d.slice(5, 7) - 1] ?? ""}` : "—");
/** MS6 — Δ always carries the unit. */
export const dMeet = (a: number, b: number) => (a > b ? `▲ ${a - b} ประชุม` : a < b ? `▼ ${b - a} ประชุม` : "± 0 ประชุม");
const dNum = (a: number | null, b: number | null) => (a == null || b == null ? "Δ —" : a > b ? `▲ ${+(a - b).toFixed(1)}` : a < b ? `▼ ${+(b - a).toFixed(1)}` : "± 0");
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const fmtMed = (m: number | null) => (m == null ? "—" : Number.isInteger(m) ? String(m) : m.toFixed(1));
const medTone = (m: number | null) => (m == null ? "" : m <= 6 ? "ms-low-t" : m < 8 ? "ms-mid-t" : "ms-sat-t");

function useTabRows() {
  const { data, demo } = useMeetingSurveyData();
  const today = msNow(demo).slice(0, 10);
  const tab = useMemo(() => getMeetingTabData(demo, data), [data, demo]);
  const rows = useMemo(() => tabMeetings(tab, demo), [tab, demo]);
  return { rows, tab, demo, today };
}

/* =============================== tab =============================== */
export function MeetingTabR1() {
  const { rows, tab, demo, today } = useTabRows();
  const kHead = useCardCompare("meeting", "r1-head", today);
  const mA = monthsInPeriod(kHead.a), mB = monthsInPeriod(kHead.b);
  const fA = { ORM: vMeetingFunnel(rows, "ORM", mA, today), MARCOM: vMeetingFunnel(rows, "MARCOM", mA, today) };
  const fB = { ORM: vMeetingFunnel(rows, "ORM", mB, today), MARCOM: vMeetingFunnel(rows, "MARCOM", mB, today) };
  const monthLabel = monthTh(mA.at(-1) ?? today.slice(0, 7));
  const noChannel = !rows.some((r) => r.online === false) && !tab.meetings.some((m) => m.channel);
  return (
    <div className="space-y-5" data-testid="meeting-tab-r1">
      {/* 1 · Hero */}
      <section className="ms-hero" data-testid="ms-hero">
        <header className="ms-hero-head">
          <h2>{T.heroTitle} · {monthLabel}<InfoButton info={{ count: T.info.quota, read: T.info.unit }} /></h2>
          <div>{kHead.control}</div>
        </header>
        <div className="ms-two">
          {(["ORM", "MARCOM"] as Svc[]).map((s) => (
            <div key={s} className={cn("ms-hero-half", s === "ORM" ? "is-orm" : "is-mc")}>
              <span className="ms-svc-chip">{SVC_CHIP[s]}</span>
              <strong>{fA[s].quota}</strong> <span>Online Meeting</span> <em>{dMeet(fA[s].quota, fB[s].quota)}</em>
              <p>{s === "ORM" ? T.heroOrm : `${T.heroMc} ${fA[s].pnm_excluded}`}</p>
            </div>
          ))}
        </div>
        {noChannel && <p className="ms-amber-note">{T.noChannel}</p>}
      </section>

      {/* 2 · tiles */}
      <div className="ms-two">
        {(["ORM", "MARCOM"] as Svc[]).map((s) => <ServiceTiles key={s} svc={s} a={fA[s]} b={fB[s]} rows={rows} mA={mA} mB={mB} />)}
      </div>

      {/* 3 · นัดครบไหม */}
      <h3 className="ms-section">{T.sectionA}</h3>
      <div className="ms-two">
        <FunnelCard svc="ORM" f={fA.ORM} detail={vMeetingFunnelDetail(rows, "ORM", mA, today)} />
        <FunnelCard svc="MARCOM" f={fA.MARCOM} detail={vMeetingFunnelDetail(rows, "MARCOM", mA, today)} />
      </div>
      <TierAPendingCard rows={rows} months={mA} f={fA.ORM} today={today} />
      <OwnerQuotaCard rows={rows} today={today} />
      <WorkloadCard rows={rows} today={today} />

      {/* 4 · ประชุมแล้วได้ผลแค่ไหน */}
      <h3 className="ms-section">{T.sectionB}</h3>
      <p className="ms-amber-note">{T.templateNote}</p>
      <SurveyPair rows={rows} tab={tab} today={today} />
      <AnalyzerCard demo={demo} />
    </div>
  );
}

/* =============================== header tiles =============================== */
function Tile({ label, big, delta, lines, info }: { label: string; big: ReactNode; delta: string; lines: ReactNode; info: InfoBlocks }) {
  return (
    <div className="mt-kpi ms-tile" data-testid="ms-tile">
      <span>{label}<InfoButton info={info} /></span>
      <strong>{big}</strong>
      <small className="ms-delta">{delta}</small>
      <div className="ms-tile-lines">{lines}</div>
    </div>
  );
}
function ServiceTiles({ svc, a, b, rows, mA, mB }: { svc: Svc; a: Funnel; b: Funnel; rows: TabMeeting[]; mA: string[]; mB: string[] }) {
  const cA = vMeetingSurveyCoverage(rows, svc, mA), cB = vMeetingSurveyCoverage(rows, svc, mB);
  const medA = median(cA.overall), medB = median(cB.overall);
  const bands = { low: cA.overall.filter((n) => band(n) === "low").length, mid: cA.overall.filter((n) => band(n) === "mid").length, sat: cA.overall.filter((n) => band(n) === "sat").length };
  const quotaLine = a.over_quota ? `โควตา ${a.quota} ประชุม · เกินโควตา +${a.over_quota} ประชุม` : a.short_quota ? `โควตา ${a.quota} ประชุม · ขาด ${a.short_quota} ประชุมจากโควตา` : `โควตา ${a.quota} ประชุม · เต็มโควตา`;
  const seg = (n: number, cls: string, label: string) => { const p = pct(n, a.booked.total); return p ? <span key={label} className={cls} style={{ width: `${p}%` }}>{p >= 10 ? `${p}%` : ""}</span> : null; };
  return (
    <div className={cn("ms-col", svc === "ORM" ? "is-orm" : "is-mc")}>
      <div className="ms-col-head">{SVC_NAME[svc]}</div>
      <div className="ms-tiles">
        <Tile label="นัดได้" big={<>{a.booked.total} <small>Online Meeting</small></>} delta={dMeet(a.booked.total, b.booked.total)} info={{ count: T.info.booked }}
          lines={svc === "ORM" ? (
            <>
              <div className="ms-stack" aria-label="สัดส่วน Tier">{seg(a.booked.A, "ms-seg-a", "A")}{seg(a.booked.B, "ms-seg-b", "B")}{seg(a.booked.C, "ms-seg-c", "C")}</div>
              <div>Tier A {a.booked.A} ประชุม ({pct(a.booked.A, a.booked.total)}%)</div>
              <div>แทนด้วย Tier B {a.booked.B} ประชุม ({pct(a.booked.B, a.booked.total)}%)</div>
              <div>แทนด้วย Tier C {a.booked.C} ประชุม ({pct(a.booked.C, a.booked.total)}%)</div>
              <div>{quotaLine}</div>
            </>
          ) : <><div>ยังไม่มี Tier</div><div>{quotaLine}</div></>} />
        <Tile label="Meeting Completed" big={<>{a.completed.total} <small>Online Meeting</small></>} delta={dMeet(a.completed.total, b.completed.total)} info={{ count: T.info.completed }}
          lines={svc === "ORM" && a.chain ? <div>Tier A {a.chain.completed} จาก {a.chain.quota} ประชุม (KPI #1) · Tier A ยังไม่จบ {a.chain.quota - a.chain.completed} ประชุม <a href="#ms-tiera">ดู ②</a></div> : <div>ทุกโรงแรมที่มีผู้ดูแล Marcom</div>} />
        <Tile label="ทำ Survey แล้ว" big={<>{cA.scored} <small>จาก {cA.completed} ประชุม</small></>} delta={dMeet(cA.scored, cB.scored)} info={{ count: T.info.surveyed }}
          lines={<div>ลูกค้าไม่ให้คะแนน {cA.customer_no_score} · {T.surveyPending} {cA.survey_pending} · ลูกค้าแย้ง {cA.disputed}</div>} />
        <Tile label="คะแนน Survey (พึงพอใจรวม)" big={<span className={medTone(medA)}>{fmtMed(medA)} <small>/10 median</small></span>} delta={`${dNum(medA, medB)}`} info={{ count: T.info.score }}
          lines={<div><span className="ms-sat-t">พอใจ {bands.sat}</span> · <span className="ms-mid-t">กลาง {bands.mid}</span> · <span className="ms-low-t">ต่ำ {bands.low}</span> · ไม่ให้คะแนน {cA.customer_no_score}</div>} />
      </div>
    </div>
  );
}

/* =============================== ① funnel =============================== */
const EVENT_TH: Record<string, string> = {
  NOT_BOOKED: "ยังไม่นัด", POSTPONED: "เลื่อน", REJECTED: "ปฏิเสธนัด", WAITING: "รอวันประชุม", OVERDUE_NO_UPDATE: "เลยวันนัด ยังไม่อัปเดต", NO_SHOW: "ไม่มา",
  SURVEY_PENDING: "รอทำ Survey", CUSTOMER_NO_SCORE: "ลูกค้าไม่ให้คะแนน ⚑ ธงเหลือง", SUBSTITUTE_B: "นัดแทนด้วย Tier B", SUBSTITUTE_C: "นัดแทนด้วย Tier C", TIER_A_BOOKED: "Tier A นัดได้", OVER_QUOTA: "เกินโควตา",
};
function Group({ title, items, sub }: { title: string; items?: DetailRow[]; sub?: ReactNode }) {
  if (items && !items.length && !sub) return null;
  return (
    <div className="ms-tip-group">
      <b>{title}</b>
      {sub}
      {items && items.length > 0 && <div className="ms-tip-hotels">{items.map((r) => `${r.hotel}${r.over ? " (เกินโควตา)" : ""}`).join(" · ")}</div>}
    </div>
  );
}
function tipContent(svc: Svc, stage: 1 | 2 | 3, f: Funnel, detail: DetailRow[]) {
  const d = (s: 1 | 2 | 3, ev?: string) => detail.filter((r) => r.stage === s && (!ev || r.event === ev));
  if (stage === 1) {
    const nb = [...d(1, "NOT_BOOKED"), ...d(1, "POSTPONED"), ...d(1, "REJECTED")];
    if (svc === "ORM") {
      const aNb = nb.filter((r) => r.tier === "A");
      return (<>
        <Group title={`Tier A นัดได้ ${f.booked.A}`} />
        <Group title={`Tier A นัดไม่ได้ ${aNb.length}`} sub={<>{(["NOT_BOOKED", "POSTPONED", "REJECTED"] as const).map((ev) => { const it = aNb.filter((r) => r.event === ev); return it.length ? <div key={ev} className="ms-tip-sub">{EVENT_TH[ev]} {it.length}: {it.map((r) => r.hotel).join(" · ")}</div> : null; })}</>} />
        <Group title={`นัดแทนด้วย Tier B ${d(1, "SUBSTITUTE_B").length}`} items={d(1, "SUBSTITUTE_B")} />
        <Group title={`นัดแทนด้วย Tier C ${d(1, "SUBSTITUTE_C").length}`} items={d(1, "SUBSTITUTE_C")} />
      </>);
    }
    return (<>
      <Group title={`นัดได้ ${f.booked.total} จาก ${f.quota}`} />
      <Group title={`ขาดโควตา ${f.short_quota}`} sub={<>{(["NOT_BOOKED", "POSTPONED", "REJECTED"] as const).map((ev) => { const it = nb.filter((r) => r.event === ev); return it.length ? <div key={ev} className="ms-tip-sub">{EVENT_TH[ev]} {it.length}: {it.map((r) => r.hotel).join(" · ")}</div> : null; })}</>} />
      <Group title={`เกินโควตา ${d(1, "OVER_QUOTA").length}`} items={d(1, "OVER_QUOTA")} />
    </>);
  }
  const s = stage;
  const list = d(s);
  const evs = s === 2 ? ["WAITING", "OVERDUE_NO_UPDATE", "NO_SHOW"] : ["SURVEY_PENDING", "CUSTOMER_NO_SCORE"];
  return (
    <Group title={`หลุดจาก${s === 2 ? "นัดได้" : " Completed"} ${list.length}`} sub={<>{evs.map((ev) => { const it = list.filter((r) => r.event === ev); return it.length ? <div key={ev} className="ms-tip-sub">{EVENT_TH[ev]} {it.length}: {it.map((r) => `${r.hotel}${svc === "ORM" ? ` (Tier ${r.tier})` : ""}${ev === "OVERDUE_NO_UPDATE" ? ` · นัด ${dayTh(r.date)}` : ""}`).join(" · ")}</div> : null; })}</>} />
  );
}
/** UP10 summary row parts — same numbers as `summary`. */
function summaryParts(f: Funnel): { label: string; value: string; bad?: boolean }[] {
  const q = f.over_quota ? { label: "เกินโควตา", value: `+${f.over_quota}` } : f.short_quota ? { label: "ขาดโควตา", value: String(f.short_quota), bad: true } : { label: "เต็มโควตา", value: "" };
  return [q, { label: "หลุดก่อน Completed", value: String(f.booked.total - f.completed.total) }, { label: "หลุดก่อนได้คะแนน", value: String(f.completed.total - f.scored.total) }];
}
function FunnelCard({ svc, f, detail }: { svc: Svc; f: Funnel; detail: DetailRow[] }) {
  const [open, setOpen] = useState<{ stage: 1 | 2 | 3; pinned: boolean } | null>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const scale = Math.max(f.quota, f.booked.total, 1);
  const stages: { stage: 1 | 2 | 3; label: string; s: { total: number; A: number; B: number; C: number }; right: ReactNode }[] = [
    { stage: 1, label: "นัดได้", s: f.booked, right: <>{f.over_quota ? <span className="ms-sat-t">+{f.over_quota} เกินโควตา</span> : f.short_quota ? <span className="ms-low-t">ขาด {f.short_quota} จากโควตา</span> : <span className="ms-sat-t">เต็มโควตา</span>}{svc === "ORM" && <small>Tier A {f.booked.A} · แทน {f.booked.B + f.booked.C}</small>}</> },
    { stage: 2, label: "Meeting Completed", s: f.completed, right: <><b className="ms-f-pct">{pct(f.completed.total, f.booked.total)}%</b><small>ของนัดได้</small>{svc === "ORM" && <small>Tier A {f.completed.A} · แทน {f.completed.B + f.completed.C}</small>}</> },
    { stage: 3, label: "ได้คะแนน Survey", s: f.scored, right: <><b className="ms-f-pct">{pct(f.scored.total, f.booked.total)}%</b><small>ของนัดได้</small>{svc === "ORM" && <small>Tier A {f.scored.A} · แทน {f.scored.B + f.scored.C}</small>}</> },
  ];
  const summary = svc === "ORM"
    ? `${f.over_quota ? `เกินโควตา +${f.over_quota}` : `ขาดโควตา ${f.short_quota}`} · หลุดก่อน Completed ${f.booked.total - f.completed.total} · หลุดก่อนได้คะแนน ${f.completed.total - f.scored.total}`
    : `${f.short_quota ? `ขาดโควตา ${f.short_quota}` : `เกินโควตา +${f.over_quota}`} · หลุดก่อน Completed ${f.booked.total - f.completed.total} · หลุดก่อนได้คะแนน ${f.completed.total - f.scored.total}`;
  return (
    <DashCard title={<>① Funnel การประชุม · <span className={cn("ms-svc-chip", svc === "ORM" ? "is-orm" : "is-mc")}>{SVC_CHIP[svc]}</span></>} question="นัดได้เท่าไร ประชุมจบเท่าไร ได้คะแนนเท่าไร?"
      answer={`${f.booked.total} Online Meeting`} answerSub={`โควตา ${f.quota}`} noteKey={`meeting.r1.funnel.${svc}`} noteLines={[summary]} howToRead={T.info.funnel} info={{ count: T.info.funnel, read: T.info.hover }}
      legend={svc === "ORM" ? <span className="ms-legend"><i className="ms-sw ms-sw-solid" /> Tier A <i className="ms-sw ms-sw-hatch" /> นัดแทนด้วย Tier B / C <i className="ms-sw ms-sw-dash" /> โควตา</span> : <span className="ms-legend"><i className="ms-sw ms-sw-solid" /> Online Meeting <i className="ms-sw ms-sw-dash" /> โควตา</span>}>
      <div className={cn("ms-funnel", svc === "ORM" ? "is-orm" : "is-mc")} data-testid={`ms-funnel-${svc}`}>
        {stages.map((st, i) => {
          const w = (st.s.total / scale) * 100; const aW = st.s.total ? (st.s.A / st.s.total) * 100 : 0;
          const isOpen = open?.stage === st.stage;
          const bw = (x: number) => Math.max((x / scale) * 100, 6);
          const next = stages[i + 1];
          /* UAT polish UP10: trapezoid connector from this bar's bottom edge to the next bar's top edge. */
          const conn = next ? (() => { const u = bw(st.s.total), l = bw(next.s.total); return `polygon(${(100 - u) / 2}% 0, ${(100 + u) / 2}% 0, ${(100 + l) / 2}% 100%, ${(100 - l) / 2}% 100%)`; })() : null;
          return (
            <Fragment key={st.stage}>
            <div className="ms-f-row">
              <div className="ms-f-label">{st.label}</div>
              <div className="ms-f-track">
                {st.stage === 1 && <div className="ms-quota-frame" style={{ width: `${(f.quota / scale) * 100}%` }} data-testid="ms-quota-frame"><span>โควตา {f.quota}</span></div>}
                <button type="button" className={cn("ms-f-bar", `lv${i}`)} style={{ width: `${Math.max(w, 6)}%` }} data-testid={`ms-bar-${svc}-${st.stage}`} data-width={w.toFixed(1)}
                  aria-expanded={isOpen} aria-label={`${st.label} ${st.s.total} Online Meeting`}
                  onMouseEnter={() => setOpen((o) => (o?.pinned ? o : { stage: st.stage, pinned: false }))}
                  onMouseLeave={() => setOpen((o) => (o?.pinned ? o : null))}
                  onFocus={() => setOpen((o) => (o?.pinned ? o : { stage: st.stage, pinned: false }))}
                  onBlur={() => setOpen(null)}
                  onClick={() => setOpen((o) => (o?.stage === st.stage && o.pinned ? null : { stage: st.stage, pinned: true }))}>
                  {svc === "ORM" && <span className="ms-f-solid" style={{ width: `${aW}%` }} />}
                  <span className="ms-f-num"><b>{st.s.total}</b> <small>Online Meeting</small></span>
                </button>
                {isOpen && (
                  <div className="ms-tip" role="tooltip" data-testid="ms-tip">
                    <div className="ms-tip-title">{st.label} · {st.s.total} Online Meeting</div>
                    {tipContent(svc, st.stage, f, detail)}
                  </div>
                )}
              </div>
              <div className="ms-f-right">{st.right}</div>
            </div>
            {conn && <div className="ms-f-row ms-f-connrow" aria-hidden><span /><div className={cn("ms-f-conn", `lv${i}`)} data-testid={`ms-conn-${svc}-${st.stage}`} style={{ clipPath: conn }} /><span /></div>}
            </Fragment>
          );
        })}
        <div className="ms-f-summary"><span data-testid={`ms-summary-${svc}`}>{summaryParts(f).map((x, j) => <span key={j} className="ms-f-sumitem">{x.label} <b className={x.bad ? "ms-low-t" : undefined}>{x.value}</b></span>)}</span><span className="ms-hint">ชี้ที่แถบเพื่อดูรายละเอียด</span></div>
        {svc === "ORM" && f.chain && (
          <div className="ms-chain">Tier A · KPI #1: ต้องนัด {f.chain.quota} › นัดได้ {f.chain.booked} › Completed {f.chain.completed} › ได้คะแนน {f.chain.scored} · Tier A ยังไม่จบ {f.chain.quota - f.chain.completed} ประชุม <a href="#ms-tiera">ดู ②</a></div>
        )}
      </div>
    </DashCard>
  );
}

/* =============================== ② Tier A pending =============================== */
const PENDING_TH: Record<string, string> = { REJECTED: "ปฏิเสธนัด", NO_SHOW: "ไม่มา", CONFIRMED: "รอวันประชุม", NOT_BOOKED: "ยังไม่นัด", POSTPONED: "เลื่อน", OTHER: "อื่น ๆ" };
function TierAPendingCard({ rows, months, f, today }: { rows: TabMeeting[]; months: string[]; f: Funnel; today: string }) {
  const list = vMeetingTierAPending(rows, months);
  const ym = months.at(-1) ?? today.slice(0, 7);
  const cutoff = `${ym}-${String(MEETING_CONFIG.cutoff_day).padStart(2, "0")}`;
  const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(cutoff)) / 864e5));
  return (
    <div id="ms-tiera">
      <DashCard title="② Tier A ที่ยังไม่สำเร็จ" question="Tier A รายไหนยังไม่จบประชุม?" answer={`${list.length} ประชุม`}
        answerSub={`ผ่าน cutoff ${dayTh(cutoff)} แล้ว ${days} วัน · นัดได้ทั้งหมด ${f.booked.total} จากโควตา ${f.quota} Online Meeting`}
        noteKey="meeting.r1.tierA" noteLines={[`${list.length} ประชุม`]} howToRead={T.info.tierA} info={{ count: T.info.tierA }}>
        {list.length ? (
          <table className="ms-table"><thead><tr><th>โรงแรม</th><th>สถานะ</th><th>วันประชุม</th><th>ทีม ORM</th><th>AE</th></tr></thead>
            <tbody>{list.map((r) => <tr key={r.id}><td><b>{r.hotel}</b></td><td><span className={cn("mt-chip", r.status === "REJECTED" || r.status === "NO_SHOW" ? "mt-chip-red" : "mt-chip-amber")}>{r.status === "CONFIRMED" && r.date && r.date < today ? "เลยวันนัด ยังไม่อัปเดต" : PENDING_TH[r.status]}</span></td><td>{dayTh(r.date)}</td><td>{r.team}</td><td>{r.ae}</td></tr>)}</tbody></table>
        ) : <p className="ms-empty">ยังไม่มีข้อมูล</p>}
      </DashCard>
    </div>
  );
}

/* =============================== ③ quota by owner =============================== */
function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="ms-seg" role="tablist">{options.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={value === k} className={cn(value === k && "is-on")} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
function OwnerQuotaCard({ rows, today }: { rows: TabMeeting[]; today: string }) {
  const k = useCardCompare("meeting", "r1-owner", today);
  const [lens, setLens] = useState<OwnerLens>("ORM_TEAM");
  const list = vMeetingByOwner(rows, lens, monthsInPeriod(k.a));
  const listB = vMeetingByOwner(rows, lens, monthsInPeriod(k.b));
  const sum = (l: typeof list, f: (o: (typeof list)[number]) => number) => l.reduce((a, o) => a + f(o), 0);
  const done = (o: (typeof list)[number]) => (lens === "MARCOM_PERSON" ? o.completed_all : o.tierA_completed + o.sub_completed);
  const quota = sum(list, (o) => o.quota), comp = sum(list, done), compB = sum(listB, done);
  const title = lens === "ORM_TEAM" ? "นัดประชุมสำเร็จเทียบโควตา รายทีม" : lens === "AE" ? "นัดประชุมสำเร็จเทียบโควตา ราย AE" : "ประชุม Marcom สำเร็จ รายคน";
  return (
    <DashCard title={`③ ${title}`} question="แต่ละทีม / คน ประชุมสำเร็จครบโควตาไหม?" period={k.control} answer={`${comp} จาก ${quota} ประชุม`}
      answerSub={<>{lens === "MARCOM_PERSON" ? "Marcom ยังไม่มี Tier" : `Tier A ${sum(list, (o) => o.tierA_completed)} (KPI #1) · นัดแทน ${sum(list, (o) => o.sub_completed)} · ยังขาด ${Math.max(0, quota - comp)}`} · {dMeet(comp, compB)}</>}
      noteKey="meeting.r1.owner" noteLines={[title]} howToRead={T.info.owner} info={{ count: T.info.owner }}>
      <Seg value={lens} onChange={setLens} options={[["ORM_TEAM", "ORM ทีม"], ["AE", "AE"], ["MARCOM_PERSON", "Marcom รายคน"]]} />
      <div className="ms-rows" data-testid="ms-owner-rows">
        {list.map((o) => {
          const d = done(o); const q = Math.max(o.quota, 1);
          const aW = Math.min(100, ((lens === "MARCOM_PERSON" ? o.completed_all : o.tierA_completed) / q) * 100);
          const sW = lens === "MARCOM_PERSON" ? 0 : Math.min(100 - aW, (o.sub_completed / q) * 100);
          const ok = o.quota > 0 && d >= o.quota;
          return (
            <div key={o.name} className="ms-row">
              <span className="ms-row-name">{o.name}</span>
              <div className="ms-qbar"><span className="ms-q-solid" style={{ width: `${aW}%` }} /><span className="ms-q-hatch" style={{ width: `${sW}%` }} /></div>
              <span className={cn("ms-row-val", ok && "ms-sat-t")}>{d}/{o.quota} ประชุม{ok ? " ✓" : ""}</span>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}

/* =============================== ④ workload =============================== */
function WorkloadCard({ rows, today }: { rows: TabMeeting[]; today: string }) {
  const k = useCardCompare("meeting", "r1-workload", today);
  const [lens, setLens] = useState<OwnerLens>("ORM_TEAM");
  const list = vMeetingByOwner(rows, lens, monthsInPeriod(k.a));
  const listB = vMeetingByOwner(rows, lens, monthsInPeriod(k.b));
  const booked = list.reduce((a, o) => a + o.booked, 0), bookedB = listB.reduce((a, o) => a + o.booked, 0);
  const max = Math.max(1, ...list.map((o) => o.booked));
  return (
    <DashCard title="④ จำนวนนัดที่ทำได้ทั้งเดือน" question="แต่ละทีม / คน มีงานประชุมเท่าไร?" period={k.control} answer={`${booked} ประชุม`}
      answerSub={<>{dMeet(booked, bookedB)}{lens === "AE" ? " · ORM + Marcom ของพอร์ต AE" : ""}</>} noteKey="meeting.r1.workload" noteLines={[`${booked} ประชุม`]} howToRead={T.info.workload} info={{ count: T.info.workload }}
      legend={<span className="ms-legend"><i className="ms-sw ms-sw-done" /> ประชุมแล้ว <i className="ms-sw ms-sw-wait" /> รอวันประชุม / เลยวันนัด <i className="ms-sw ms-sw-ns" /> ไม่มา</span>}>
      <Seg value={lens} onChange={setLens} options={[["ORM_TEAM", "ORM ทีม"], ["MARCOM_PERSON", "Marcom รายคน"], ["AE", "AE รายคน"]]} />
      <table className="ms-table" data-testid="ms-workload"><thead><tr><th>ชื่อ</th><th>สัดส่วน</th><th>นัด</th><th>พอร์ต</th><th>ต่อ 10 โรงแรม</th></tr></thead>
        <tbody>{list.map((o) => (
          <tr key={o.name}>
            <td><b>{o.name}</b>{lens === "AE" && <div className="ms-chips"><span className="ms-svc-chip is-orm">ORM {o.booked_orm}</span> <span className="ms-svc-chip is-mc">Marcom {o.booked_mc}</span></div>}</td>
            <td><div className="ms-wbar" style={{ width: `${(o.booked / max) * 100}%` }}>
              {o.completed > 0 && <span className="ms-w-done" style={{ flex: o.completed }}>{o.completed}</span>}
              {o.waiting > 0 && <span className="ms-w-wait" style={{ flex: o.waiting }}>{o.waiting}</span>}
              {o.no_show > 0 && <span className="ms-w-ns" style={{ flex: o.no_show }}>{o.no_show}</span>}
            </div></td>
            <td>{o.booked}</td><td>{o.portfolio_hotels}</td><td>{o.portfolio_hotels ? ((o.booked / o.portfolio_hotels) * 10).toFixed(1) : "—"}</td>
          </tr>
        ))}</tbody></table>
    </DashCard>
  );
}

/* =============================== ⑤ survey =============================== */
function SurveyPair({ rows, tab, today }: { rows: TabMeeting[]; tab: ReturnType<typeof getMeetingTabData>; today: string }) {
  const k = useCardCompare("meeting", "r1-survey", today);
  return (
    <div className="ms-two">
      {(["ORM", "MARCOM"] as Svc[]).map((s) => <SurveyCard key={s} svc={s} rows={rows} tab={tab} mA={monthsInPeriod(k.a)} mB={monthsInPeriod(k.b)} control={k.control} />)}
    </div>
  );
}
function SegBar({ row, onPick, picked }: { row: ScoreRow; picked: string | null; onPick: (k: string | null) => void }) {
  const base = row.low.length + row.mid.length + row.sat.length + row.no_score.length;
  const segs: [string, number, string, string][] = [["low", row.low.length, "ms-b-low", "ต่ำ"], ["mid", row.mid.length, "ms-b-mid", "กลาง"], ["sat", row.sat.length, "ms-b-sat", "พอใจ"], ["no", row.no_score.length, "ms-b-no", "ลูกค้าไม่ให้คะแนน"]];
  return (
    <div className="ms-sbar">
      {segs.map(([k, n, cls, l]) => n ? <button key={k} type="button" className={cn(cls, picked === k && "is-picked", k === "no" && "ms-gap")} style={{ flex: n }} title={`${l} ${n}`} aria-label={`${row.name} ${l} ${n}`} onClick={() => onPick(picked === k ? null : k)}>{n}</button> : null)}
      {!base && <span className="ms-empty">ยังไม่มีข้อมูล</span>}
    </div>
  );
}
function SurveyCard({ svc, rows, tab, mA, mB, control }: { svc: Svc; rows: TabMeeting[]; tab: ReturnType<typeof getMeetingTabData>; mA: string[]; mB: string[]; control: ReactNode }) {
  const here = versionsIn(rows, svc, mA), before = versionsIn(rows, svc, mB);
  const versions = [...new Set([...here, ...before])].sort();
  const [pickV, setPickV] = useState<number | null>(null);
  const version = pickV && versions.includes(pickV) ? pickV : here.at(-1) ?? versions.at(-1) ?? 1;
  // set without data in the chosen month → show the latest month of that set (never mixed across sets)
  const months = here.includes(version) ? mA : before.includes(version) ? mB : mA;
  const prevMonths = months === mA ? mB : mB.map((m) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 2, 1)); return d.toISOString().slice(0, 7); });
  const cov = vMeetingSurveyCoverage(rows, svc, mA);
  const scoreRows = vMeetingSurveyScores(rows, svc, months, prevMonths, version);
  const main = scoreRows[0];
  const sig = vMeetingSignalCounts(tab.flags ?? [], svc, mA);
  const silent = vMeetingSurveySilent(rows, svc, mA);
  const byOwner = vMeetingSurveyByOwner(rows, svc, months, prevMonths, version);
  const comments = vMeetingFreeComments(rows, svc, months);
  const labels = version === 2 ? vMeetingSurveyLabels(rows, tab, svc, months) : null;
  const [picked, setPicked] = useState<{ topic: string; seg: string } | null>(null);
  const pickedCells: ScoreCell[] = picked ? ((r) => (r ? (picked.seg === "no" ? r.no_score : r[picked.seg as "low" | "mid" | "sat"]) : []))(scoreRows.find((r) => r.key === picked.topic)) : [];
  const covBase = Math.max(1, cov.completed);
  return (
    <DashCard title={<>⑤ คะแนน Survey รายหัวข้อ · <span className={cn("ms-svc-chip", svc === "ORM" ? "is-orm" : "is-mc")}>{SVC_CHIP[svc]}</span></>} question="ข้อไหนลูกค้าให้ต่ำ และใครไม่ให้คะแนน?" period={control}
      answer={<span className={medTone(main?.median ?? null)}>{fmtMed(main?.median ?? null)} /10 พึงพอใจรวม</span>} answerSub={`ต่ำ ${main?.low.length ?? 0} · ไม่ให้คะแนน ${main?.no_score.length ?? 0}`}
      noteKey={`meeting.r1.survey.${svc}`} noteLines={[`median ${fmtMed(main?.median ?? null)}`]} howToRead={T.info.survey} info={{ count: T.info.survey, read: T.info.bands }}
      legend={<span className="ms-legend"><i className="ms-sw ms-b-low" /> ต่ำ ≤6 <i className="ms-sw ms-b-mid" /> กลาง 7 <i className="ms-sw ms-b-sat" /> พอใจ ≥8 <i className="ms-sw ms-b-no" /> ลูกค้าไม่ให้คะแนน</span>}>
      <div data-testid={`ms-survey-${svc}`}>
        {versions.length > 1 && <Seg value={String(version)} onChange={(v) => setPickV(+v)} options={versions.map((v) => [String(v), `ชุดที่ ${v}`] as [string, string])} />}
        {months !== mA && <p className="ms-amber-note">ชุดที่ {version} · แสดงข้อมูลเดือน {monthTh(months.at(-1)!)} (เดือนล่าสุดที่มีชุดนี้) · ไม่เทียบหัวข้อต่างชุด</p>}
        <div className="ms-cov">
          <div>Meeting Completed {cov.completed} ประชุม · ได้คะแนน {cov.scored} ประชุม · ลูกค้าไม่ให้คะแนน {cov.customer_no_score} ประชุม · {T.surveyPending} {cov.survey_pending} ประชุม</div>
          <div className="ms-cov-bar"><span className="ms-c-sc" style={{ width: `${pct(cov.scored, covBase)}%` }} /><span className="ms-b-no" style={{ width: `${pct(cov.customer_no_score, covBase)}%` }} /><span className="ms-c-pe" style={{ width: `${pct(cov.survey_pending, covBase)}%` }} /></div>
        </div>
        <div className="ms-topics">
          {scoreRows.map((r) => (
            <div key={r.key} className={cn("ms-topic", r.main && "is-main")}>
              <span className="ms-topic-name">{r.name}</span>
              <SegBar row={r} picked={picked?.topic === r.key ? picked.seg : null} onPick={(seg) => setPicked(seg ? { topic: r.key, seg } : null)} />
              <span className={cn("ms-topic-med", medTone(r.median))}>{fmtMed(r.median)}<small>{r.delta == null ? "" : ` ${dNum(r.median, r.median! - r.delta)} จากเดือนก่อน`}</small></span>
            </div>
          ))}
          {labels && labels.topics.map((t) => {
            const base = t.good + t.unsure + t.bad;
            return (
              <div key={t.key} className="ms-topic">
                <span className="ms-topic-name">{t.name}<small>ดี: {t.goodLabel || "—"} · ไม่ดี: {t.badLabel || "—"}</small></span>
                <div className="ms-sbar">{t.good > 0 && <span className="ms-b-sat" style={{ flex: t.good }}>{t.good}</span>}{t.unsure > 0 && <span className="ms-b-uns" style={{ flex: t.unsure }}>{t.unsure}</span>}{t.bad > 0 && <span className="ms-b-low" style={{ flex: t.bad }}>{t.bad}</span>}{t.no_score > 0 && <span className="ms-b-no ms-gap" style={{ flex: t.no_score }}>{t.no_score}</span>}{!base && <span className="ms-empty">ยังไม่มีข้อมูล</span>}</div>
                <span className={cn("ms-topic-med", t.badShare >= 0.2 ? "ms-low-t" : "ms-sat-t")}>{t.pctGood == null ? "—" : `${t.pctGood}%`}<small> ป้ายดี</small></span>
              </div>
            );
          })}
        </div>
        {picked && (
          <div className="ms-pick" data-testid="ms-pick">
            <div className="ms-pick-head"><b>{scoreRows.find((r) => r.key === picked.topic)?.name}</b><button type="button" aria-label="ปิด" onClick={() => setPicked(null)}>✕</button></div>
            <table className="ms-table"><thead><tr><th>โรงแรม</th><th>คะแนน</th><th>ผู้ดูแล</th><th>AE</th></tr></thead>
              <tbody>{pickedCells.map((c, i) => <tr key={i}><td>{c.hotel}</td><td>{c.score ?? "ไม่ให้คะแนน"}</td><td>{c.team}</td><td>{c.ae}</td></tr>)}</tbody></table>
          </div>
        )}
        {labels && (
          <div className="ms-opp">
            <span className="r1-chip is-opp"><SignalMark dir="opp" />ลูกค้าพร้อมแนะนำต่อ (≥9) {labels.opp.recommend}</span>
            <span className="r1-chip is-opp"><SignalMark dir="opp" />พร้อมขยายแพ็กเกจ {labels.opp.expand}</span>
            <span className="r1-chip is-opp"><SignalMark dir="opp" />มีโรงแรมในเครือ / เปิดสาขาใหม่ {labels.opp.group}</span>
            <p className="ms-note">AE กรอกระหว่างประชุม {labels.resp.ae} ฉบับ · ลูกค้าตอบเองผ่านลิงก์ {labels.resp.customer} ฉบับ</p>
          </div>
        )}
        <div className="ms-signals" data-testid={`ms-signals-${svc}`}>
          <span>ส่งเป็นป้ายสัญญาณไปที่สุขภาพสัญญา + งาน Coaching (Workspace หัวหน้า + ผู้ดูแล):</span>
          <span className="r1-chip is-bad"><SignalMark dir="bad" />ธงแดง · คะแนนต่ำ ≤6 (ข้อใดข้อหนึ่ง) {sig.low} โรงแรม</span>
          <span className="r1-chip is-amber"><SignalMark dir="bad" />ธงเหลือง · ลูกค้าไม่ให้คะแนน {sig.no_score} โรงแรม</span>
          <span className="r1-chip is-bad"><SignalMark dir="bad" />ธงแดง · เงียบ ≥2 เดือน {sig.silent} โรงแรม</span>
        </div>
        <details open className="ms-exp"><summary>Meeting Completed ที่ไม่มีคะแนน · {silent.length} ประชุม</summary>
          <table className="ms-table"><thead><tr><th>โรงแรม</th><th>เหตุ</th><th>ไม่มีคะแนนติดกัน</th><th>ผู้ดูแล</th><th>AE</th></tr></thead>
            <tbody>{silent.map((r, i) => <tr key={i}><td>{r.hotel}</td><td><span className={cn("mt-chip", r.reason === "no_score" ? "mt-chip-red" : "mt-chip-grey")}>{r.reason === "no_score" ? "ลูกค้าไม่ให้คะแนน" : T.surveyPending}</span></td><td className={cn(r.streak >= 2 && "ms-mid-t font-bold")}>{r.streak} เดือน</td><td>{r.caretaker}</td><td>{r.ae}</td></tr>)}</tbody></table>
          <p className="ms-note">ลูกค้าไม่ให้คะแนน = ธงเหลือง · ไม่มีคะแนนติดกัน ≥ 2 เดือน = ธงแดง “เงียบ ≥2 เดือน” · {T.surveyPending} ยังไม่เป็นธง</p>
        </details>
        <details open className="ms-exp"><summary>{svc === "ORM" ? "ดูแยก ORM รายทีม" : "ดูแยก Marcom รายคน"}</summary>
          <table className="ms-table"><thead><tr><th>ชื่อ</th>{(version === 1 ? SET1_TOPICS[svc] : [SET1_TOPICS[svc][0]!]).map((t) => <th key={t.key}>{t.short}</th>)}<th>≤6</th><th>ไม่ให้คะแนน</th></tr></thead>
            <tbody>{byOwner.map((o) => <tr key={o.name}><td>{o.name}</td>{o.topics.map((t) => <td key={t.key} className={cn(t.median != null && t.median <= 6 && "ms-low-t font-bold", t.median === 7 && "ms-mid-t")}>{fmtMed(t.median)}{t.delta ? <small> {t.delta > 0 ? `▲${t.delta}` : `▼${-t.delta}`}</small> : null}</td>)}<td>{o.low}</td><td>{o.no_score}</td></tr>)}</tbody></table>
          <p className="ms-note">ตัวเลข = median · ▲▼ = เทียบเดือนก่อน · ฐานต่อแถวเล็ก (n &lt; 5) อ่านด้วยความระวัง · ไม่ใช่อันดับ</p>
        </details>
        <details open className="ms-exp"><summary>ความเห็นอิสระ · {comments.length} รายการ</summary>
          {comments.length ? comments.map((c) => <div key={c.id} className="ms-comment"><b>{c.hotel}</b> “{c.comment}” <a href="/ps/ae-workspace/meetings">เปิดประชุม ›</a></div>) : <p className="ms-empty">ยังไม่มีข้อมูล</p>}
        </details>
      </div>
    </DashCard>
  );
}

/* =============================== ⑥ analyzer =============================== */
function AnalyzerCard({ demo }: { demo: boolean }) {
  const d = demo ? ANALYZER_DEMO : null;
  const tiles: [string, string][] = [["เวลาประชุมเฉลี่ย", d ? `${d.avgMin} นาที` : "—"], ["ลูกค้าพูด %", d ? `${d.customerTalkPct}%` : "—"], ["คำขอของลูกค้า", d ? `${d.requests} (ticket ${d.requestTickets})` : "—"], ["คำรับปากของทีม", d ? `${d.promises} (เลยกำหนด ${d.promisesLate})` : "—"]];
  return (
    <DashCard title={<>⑥ Meeting Analyzer <span className="mt-chip mt-chip-grey">{demo ? "Coming soon · ตัวอย่างข้อมูล" : "Coming soon"}</span></>} question="ในประชุมคุยอะไร ใครพูดมาก รับปากอะไรไว้?"
      answer={d ? `${d.analysed} ประชุม` : "—"} noteKey="meeting.r1.analyzer" noteLines={["Coming soon"]} howToRead={T.info.analyzer} info={{ source: T.info.analyzer }}>
      <div className="ms-tiles">{tiles.map(([l, v]) => <div key={l} className="mt-kpi ms-tile"><span>{l}</span><strong>{v}</strong></div>)}</div>
      <table className="ms-table"><thead><tr><th>โรงแรม</th><th>บริการ</th><th>นาที</th><th>สัดส่วนการพูด ลูกค้า / H+</th><th>คำขอของลูกค้า</th><th>คำรับปากของทีม</th><th>Ticket</th></tr></thead>
        <tbody>{d ? d.rows.map((r) => <tr key={r.hotel}><td>{r.hotel}</td><td>{r.service}</td><td>{r.min}</td><td>{r.talk}</td><td>{r.req}</td><td>{r.promise}</td><td>{r.ticket}</td></tr>) : <tr><td colSpan={7} className="ms-empty">ยังไม่มีข้อมูล</td></tr>}</tbody></table>
    </DashCard>
  );
}
