/* Tab R1 §3 — card ① สัญญาเข้า–ออก (In / Out · Churn). Point-in-time (ณ วันนี้), last 12 months ending this month.
 * Two views on the same numbers: Monthly Flow (default, not remembered) and Portfolio Waterfall. Read-only. */
import { useMemo, useState } from "react";
import { InfoButton } from "./dash-card";
import { NowChip } from "./compare-control";
import { R1_INOUT, R1_REASON_TH, R1_TITLES } from "@/lib/ps-glossary";
import { TH_MONTH, beYear } from "@/lib/card-compare";
import { inOutSeries, netPill, worstMonth, type FlowMonth, type Svc, type TabR1Data } from "@/lib/contract-tab-r1";
import { cn } from "@/lib/utils";

const mLabel = (m: string) => TH_MONTH[Number(m.slice(5, 7)) - 1]!;
const mFull = (m: string) => `${TH_MONTH[Number(m.slice(5, 7)) - 1]} ${String(beYear(Number(m.slice(0, 4)))).slice(-2)}`;
const SVC_LABEL: Record<Svc, string> = { ORM: "ORM", Marcom: "Marcom" };

export function ContractInOutCard({ data }: { data: TabR1Data | undefined }) {
  const [view, setView] = useState<"flow" | "waterfall">("flow");
  const series = useMemo(() => {
    if (!data) return null;
    return { ORM: inOutSeries(data.flow, "ORM", data.today, data.activeToday.ORM), Marcom: inOutSeries(data.flow, "Marcom", data.today, data.activeToday.Marcom) };
  }, [data]);
  const worst = series ? worstMonth(series.ORM.months, series.Marcom.months) : null;
  return (
    <section className="dash-card r1-card" data-testid="r1-inout">
      <header className="dash-card-header">
        <div className="min-w-0">
          <h2>{R1_TITLES.inOut}<InfoButton info={{ read: R1_INOUT.info }} /></h2>
          <div className="dash-card-period"><NowChip /></div>
          <p className="dash-question">{R1_INOUT.question}</p>
        </div>
        <div className="r1-seg" role="tablist" aria-label="มุมมอง">
          <button type="button" role="tab" aria-selected={view === "flow"} className={cn(view === "flow" && "is-on")} onClick={() => setView("flow")}>{R1_INOUT.viewFlow}</button>
          <button type="button" role="tab" aria-selected={view === "waterfall"} className={cn(view === "waterfall" && "is-on")} onClick={() => setView("waterfall")}>{R1_INOUT.viewWaterfall}</button>
        </div>
      </header>
      {!series || !data ? <p className="dash-empty">ยังไม่มีข้อมูลสัญญา</p> : (
        <>
          <div className="r1-io-panels">
            {(["ORM", "Marcom"] as Svc[]).map((svc) => (
              <InOutPanel key={svc} svc={svc} active={data.activeToday[svc]} s={series[svc]} today={data.today} view={view} />
            ))}
          </div>
          <p className="r1-io-foot">{worst ? R1_INOUT.worst(mFull(worst.month), worst.n, worst.a, worst.b) : R1_INOUT.noWorst}</p>
        </>
      )}
    </section>
  );
}

function InOutPanel({ svc, active, s, today, view }: { svc: Svc; active: number; s: ReturnType<typeof inOutSeries>; today: string; view: "flow" | "waterfall" }) {
  const [hover, setHover] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const ms = s.months;
  const peak = Math.max(1, ...ms.map((m) => Math.max(m.ins.length, m.outs.length)));
  const lo = Math.min(...ms.map((m) => Math.min(m.start, m.end, m.start + m.ins.length)));
  const hi = Math.max(...ms.map((m) => Math.max(m.start, m.end, m.start + m.ins.length)));
  const span = Math.max(1, hi - lo);
  const yPct = (v: number) => ((v - lo) / span) * 82 + 6;
  const cur = ms[ms.length - 1]!;
  const listMonths = all ? [...ms].reverse() : [cur];
  return (
    <div className={cn("r1-io-panel", `svc-${svc.toLowerCase()}`)} data-testid={`r1-io-${svc}`}>
      <div className="r1-io-head">
        <strong>{R1_INOUT.panelHead(SVC_LABEL[svc], active)}</strong>
        <span className="tabular-nums">{R1_INOUT.panelSum(s.sumIn, s.sumOut)}</span>
      </div>
      <div className="r1-io-chart">
        {view === "flow" && <div className="r1-io-axis"><span>{R1_INOUT.axisIn}</span><span>{R1_INOUT.axisOut}</span></div>}
        {view === "waterfall" && <div className="r1-io-axis" />}
        <div className="r1-io-cols">
          {ms.map((m, i) => (
            <div key={m.month} className={cn("r1-io-col", m.current && "is-current", hover === i && "is-hover")} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${mFull(m.month)} เข้า ${m.ins.length} หลุด ${m.outs.length}`}>
              <div className="r1-io-plot">
                {view === "flow" ? (
                  <>
                    <div className="r1-io-up">
                      {m.ins.length > 0 && <span className="r1-io-n tabular-nums">+{m.ins.length}</span>}
                      {m.ins.length > 0 && <div className="r1-bar-in" style={{ height: `${(m.ins.length / peak) * 78}%` }} />}
                    </div>
                    <div className="r1-io-zero" />
                    <div className="r1-io-down">
                      {m.outs.length > 0 && <div className="r1-bar-out" style={{ height: `${(m.outs.length / peak) * 78}%` }} />}
                      {m.outs.length > 0 && <span className="r1-io-n tabular-nums">−{m.outs.length}</span>}
                    </div>
                  </>
                ) : (
                  <WaterfallCol m={m} yPct={yPct} last={i === ms.length - 1} next={ms[i + 1]} />
                )}
              </div>
              <div className="r1-io-month">{mLabel(m.month)}{m.current && <small>{R1_INOUT.upTo(Number(today.slice(8, 10)))}</small>}</div>
              {hover === i && <MonthTip m={m} />}
            </div>
          ))}
        </div>
      </div>
      <div className="r1-io-endrow">
        <span className="r1-io-endlabel">{R1_INOUT.endRow}</span>
        <div className="r1-io-cols">
          {ms.map((m) => <span key={m.month} className={cn("r1-net-pill tabular-nums", m.net > 0 ? "is-up" : m.net < 0 ? "is-down" : "is-flat")}>{netPill(m.net)}</span>)}
        </div>
      </div>
      <div className="r1-io-list">
        {listMonths.map((m) => (
          <div key={m.month} className="r1-io-listmonth">
            <div className="r1-io-listhead">{mFull(m.month)}</div>
            {m.ins.length + m.outs.length === 0 ? <div className="r1-io-none">{R1_INOUT.none}</div> : (
              <ul>
                {m.ins.map((c) => <li key={`i-${c.contract_id}`} className="is-in">{R1_INOUT.inLine(c.hotel_name)}</li>)}
                {m.outs.map((c) => <li key={`o-${c.contract_id}`} className="is-out">{R1_INOUT.outLine(c.hotel_name, R1_REASON_TH[c.end_reason as "NOT_RENEWED" | "EARLY_TERMINATION"])}</li>)}
              </ul>
            )}
          </div>
        ))}
        <button type="button" className="r1-linkbtn" onClick={() => setAll((x) => !x)}>{all ? R1_INOUT.hideOld : R1_INOUT.showAll}</button>
      </div>
    </div>
  );
}

function WaterfallCol({ m, yPct, last, next }: { m: FlowMonth; yPct: (v: number) => number; last: boolean; next?: FlowMonth | undefined }) {
  const top = m.start + m.ins.length;
  return (
    <div className="r1-wf">
      {m.ins.length === 0 && m.outs.length === 0 ? (
        <div className="r1-wf-flat" style={{ bottom: `${yPct(m.end)}%` }} />
      ) : (
        <>
          {m.ins.length > 0 && <div className="r1-wf-in" style={{ bottom: `${yPct(m.start)}%`, height: `${Math.max(1.5, yPct(top) - yPct(m.start))}%` }} />}
          {m.outs.length > 0 && <div className="r1-wf-out" style={{ bottom: `${yPct(m.end)}%`, height: `${Math.max(1.5, yPct(top) - yPct(m.end))}%` }} />}
        </>
      )}
      {!last && next && <div className="r1-wf-link" style={{ bottom: `${yPct(m.end)}%` }} />}
    </div>
  );
}

function MonthTip({ m }: { m: FlowMonth }) {
  return (
    <div className="r1-io-tip" role="tooltip">
      <strong>{mFull(m.month)} · {R1_INOUT.net(m.net)}</strong>
      {m.ins.length + m.outs.length === 0 ? <div>{R1_INOUT.none}</div> : (
        <>
          {m.ins.map((c) => <div key={`i-${c.contract_id}`}>{R1_INOUT.inLine(c.hotel_name)}</div>)}
          {m.outs.map((c) => <div key={`o-${c.contract_id}`}>{R1_INOUT.outLine(c.hotel_name, R1_REASON_TH[c.end_reason as "NOT_RENEWED" | "EARLY_TERMINATION"])}</div>)}
        </>
      )}
    </div>
  );
}
