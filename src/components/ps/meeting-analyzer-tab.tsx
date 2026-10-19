// Meeting & Survey tab (was Meeting & Analyzer) v2.0 — read-only rework per spec. Card-month grain, Bangkok dates,
// medians only, no writes, Q8 is never NPS. Deprecated views are not read here.
import { aeNameTh, FLAG_LABEL, MEETING_STATUS_LABEL } from "@/lib/ps-glossary";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDashboardGlobal,
  selectedPeriod,
  deltaText,
  type Period,
} from "@/lib/ps-dashboard-global";
import {
  MEETING_CONFIG,
  QUESTIONS,
  RUBRIC_CATEGORIES,
  SERVICE_NAME,
  FLAG_GROUPS,
  aggregateFunnel,
  completionRatio,
  isRangeLate,
  isTierALate,
  daysToCutoff,
  cardMonthOf,
  bkkDayNum,
  median,
  fmtMedian,
  monthsInPeriod,
  meetingScope,
  type FunnelAgg,
  type MeetingReport,
  type MeetingRow,
} from "@/lib/meeting-dashboard-types";
import { DashCard, ChartHint, ChartSkeleton, toneClass } from "./dash-card";
const FLAG_RED_MAX = MEETING_CONFIG.flag_red_max;
const FLAG_WARN_SCORE = MEETING_CONFIG.flag_warn_score;

const fmt = (v: number | null, suffix = "") =>
  v == null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: 1 }) + suffix;
const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : null);
const thMonth = (ym: string) =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString("th-TH", { month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
const thDay = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

/** previous period = same span, shifted back (for "vs previous month" lines). */
function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
}
function prevPeriod(period: Period): Period {
  const months = monthsInPeriod(period).length;
  const from = new Date(`${period.from}T00:00:00Z`);
  const prevTo = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 0));
  const prevFrom = new Date(Date.UTC(prevTo.getUTCFullYear(), prevTo.getUTCMonth() - months + 1, 1));
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

/** R1 [mt3-4]: hotel name primary, service secondary; never the HTL code. */
export const hotelNameOf = (r: MeetingRow) => (r.hotel_name ? String(r.hotel_name) : "ไม่พบชื่อโรงแรม");
function HotelCell({ r, link }: { r: MeetingRow; link?: ReactNode }) {
  return <span className="inline-flex flex-col leading-tight">{link ?? <b>{hotelNameOf(r)}</b>}{r.service_line ? <span className="text-[10.5px] font-normal text-muted-foreground">{String(r.service_line)}</span> : null}</span>;
}
const normPending = (r: MeetingRow): MeetingRow => ({ ...r, ae_owner_id: r["owner_ae_id"] ?? r["ae_owner_id"] ?? null });

/* ================= KPI tiles ================= */
function KpiTile({
  label, value, sub, lines, late, compare,
}: {
  label: string; value: ReactNode; sub: ReactNode; lines: ReactNode[]; late?: boolean; compare?: ReactNode;
}) {
  return (
    <ChartHint header={label} lines={lines}>
      <button type="button" className={cn("mt-kpi", late && "mt-kpi-late")} aria-label={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
        {compare && <small>{compare}</small>}
      </button>
    </ChartHint>
  );
}

/* ================= ① Funnel ================= */
function FunnelRow({
  label, counts, base, rightTop, rightBottom, drop, tooltip, late,
}: {
  label: string;
  counts: { A: number; B: number; C: number; total: number };
  base: number;
  rightTop: ReactNode;
  rightBottom?: ReactNode | undefined;
  drop?: string | undefined;
  tooltip: ReactNode[];
  late?: boolean | undefined;
}) {
  const scale = base * MEETING_CONFIG.funnel_scale;
  const w = (n: number) => `${Math.min((n / Math.max(scale, 1)) * 100, 100)}%`;
  const over = counts.total > scale;
  return (
    <div>
      <ChartHint header={label} lines={tooltip}>
        <button type="button" className="mt-funnel-row" aria-label={label}>
          <span className="font-medium">{label}</span>
          <span className="mt-bar-track">
            {counts.A > 0 && <span className="mt-seg mt-seg-a" style={{ width: w(counts.A) }}>A {counts.A}</span>}
            {counts.B > 0 && <span className="mt-seg mt-seg-b" style={{ width: w(counts.B) }}>B {counts.B}</span>}
            {counts.C > 0 && <span className="mt-seg mt-seg-c" style={{ width: w(counts.C) }}>C {counts.C}</span>}
            <span className="mt-base-line" style={{ left: `${(base / Math.max(scale, 1)) * 100}%` }} />
            {over && <span className="mt-over-tag">เกิน</span>}
          </span>
          <span className="mt-nums">
            <b className={cn(late && "text-dash-action")}>{rightTop}</b>
            {rightBottom && <span className="block text-[11px] text-muted-foreground">{rightBottom}</span>}
          </span>
        </button>
      </ChartHint>
      {drop && <p className="mt-drop">{drop}</p>}
    </div>
  );
}

function MarcomRow({ label, count, base, drop, tooltip }: {
  label: string; count: number; base: number; drop?: string | undefined; tooltip: ReactNode[];
}) {
  return (
    <div>
      <ChartHint header={label} lines={tooltip}>
        <button type="button" className="mt-funnel-row" aria-label={label}>
          <span className="font-medium">{label}</span>
          <span className="mt-bar-track">
            {count > 0 && (
              <span className="mt-seg mt-seg-mc" style={{ width: `${Math.min((count / Math.max(base, 1)) * 100, 100)}%` }}>
                {count}
              </span>
            )}
          </span>
          <span className="mt-nums">
            <b>{count}</b>
            <span className="block text-[11px] text-muted-foreground">{fmt(pctOf(count, base), "%")} ของฐาน</span>
          </span>
        </button>
      </ChartHint>
      {drop && <p className="mt-drop">{drop}</p>}
    </div>
  );
}

const dropText = (parts: [string, number][], label: string) => {
  const nonZero = parts.filter(([, n]) => n > 0);
  if (!nonZero.length) return `${label}: —`;
  return `${label}: ${nonZero.map(([t, n]) => `${t} ${n}`).join(" · ")}`;
};

function FunnelCard({ cards, cardsB, now, months, compare }: {
  cards: MeetingRow[]; cardsB: MeetingRow[]; now: Date; months: string[]; compare: boolean;
}) {
  const orm = aggregateFunnel(cards, "ORM", now);
  const mc = aggregateFunnel(cards, "Marcom", now);
  const ormB = compare ? aggregateFunnel(cardsB, "ORM", now) : null;
  const mcB = compare ? aggregateFunnel(cardsB, "Marcom", now) : null;
  const late = isRangeLate(months, now);
  const aPct = pctOf(orm.completed.A, orm.base);
  const { filter } = useDashboardGlobal();
  const showOrm = filter.service !== "Marcom";
  const showMc = filter.service !== "ORM";

  const ormRows: { label: string; counts: FunnelAgg["scheduled"]; drop?: string; kpi?: boolean }[] = [
    { label: "การ์ดของเดือน", counts: { A: orm.base, B: 0, C: 0, total: orm.base } },
    {
      label: "นัดแล้ว", counts: orm.scheduled,
      drop: dropText([["ยังไม่นัด", orm.drops.notAssigned], ["เลื่อน", orm.drops.postponed], ["ปฏิเสธ", orm.drops.rejected]], "Tier A หลุด"),
    },
    {
      label: "ประชุมสำเร็จ", counts: orm.completed, kpi: true,
      drop: dropText([["รอวันประชุม", orm.drops.waiting], ["เลยวันนัด ยังไม่อัปเดต", orm.drops.pastNotUpdated], ["ไม่มา", orm.drops.noShow]], "ยังไม่ถึง"),
    },
    {
      label: "เก็บ survey สำเร็จ", counts: orm.surveySuccess,
      drop: dropText([[MEETING_STATUS_LABEL.aeNotSent, orm.drops.aeNotSent], [MEETING_STATUS_LABEL.surveyPending, orm.drops.surveyPending], [MEETING_STATUS_LABEL.surveyCommented, orm.drops.surveyCommented]], MEETING_STATUS_LABEL.notDone),
    },
  ];

  return (
    <DashCard
      title="① Funnel การประชุม"
      question="ฐานคือการ์ด Tier A · ไปถึงขั้นไหน หลุดที่ใด และเกินฐานหรือไม่?"
      answer={fmt(aPct, "%")}
      answerSub={`Tier A ${orm.completed.A}/${orm.base}`}
      answerTone={late && (aPct ?? 100) < 100 ? "action" : "accent"}
      noteKey="meeting.funnel"
      noteLines={[
        `ORM ประชุมสำเร็จรวม ${orm.completed.total} = ${fmt(pctOf(orm.completed.total, orm.base), "%")} ของฐาน Tier A · ในจำนวนนี้เป็น Tier A ${orm.completed.A} (${fmt(pctOf(orm.completed.A, orm.completed.total), "%")})`,
        orm.scheduled.total > orm.base
          ? `นัดแล้วเกินฐาน Tier A เป็น ${fmt(pctOf(orm.scheduled.total, orm.base), "%")} (Tier B/C เสริม ${orm.scheduled.B + orm.scheduled.C} นัด) · ดู workload ที่ ④b`
          : "นัดแล้วไม่เกินฐาน Tier A",
      ]}
      howToRead="ความกว้างแท่ง = สัดส่วนแต่ละ Tier · ตัวเลขขวาบน = ทุก Tier เทียบฐาน Tier A (เกิน 100% ได้) · ขวาล่าง = อัตราผ่าน Tier A · เหลืองเมื่อเกิน 100% = ไปดู ④b ไม่ใช่ความผิดพลาด"
      legend={
        <>
          <span><i className="mt-seg mt-seg-a" style={{ width: 10, height: 10, display: "inline-block", borderRadius: 2 }} /> Tier A</span>
          <span><i className="mt-seg mt-seg-b" style={{ width: 10, height: 10, display: "inline-block", borderRadius: 2 }} /> Tier B (เสริม)</span>
          <span><i className="mt-seg mt-seg-c" style={{ width: 10, height: 10, display: "inline-block", borderRadius: 2 }} /> Tier C (เสริม)</span>
          <span><i className="mt-seg mt-seg-mc" style={{ width: 10, height: 10, display: "inline-block", borderRadius: 2 }} /> Marcom (Tier TBD)</span>
          <span className="text-muted-foreground">┊ ฐาน 100%</span>
        </>
      }
    >
      <div className="mt-funnel-grid">
        {showOrm && (
          <div>
            <h3 className="text-sm font-semibold text-primary">{SERVICE_NAME.ORM}</h3>
            <p className="mb-2 text-xs text-muted-foreground">ฐาน = การ์ด Tier A ของเดือนนี้ทั้งหมด ({orm.base})</p>
            {ormRows.map((row) => {
              const over = pctOf(row.counts.total, orm.base);
              return (
                <FunnelRow
                  key={row.label}
                  label={row.label}
                  counts={row.counts}
                  base={orm.base}
                  late={row.kpi && late && (aPct ?? 100) < 100}
                  rightTop={
                    <>
                      {row.counts.total} <span className={cn("text-[11px]", (over ?? 0) > 100 ? "text-dash-watch" : "text-muted-foreground")}>{fmt(over, "%")}</span>
                    </>
                  }
                  rightBottom={
                    row.label === "การ์ดของเดือน" ? undefined : (
                      <>Tier A {row.counts.A}/{orm.base} ({fmt(pctOf(row.counts.A, orm.base), "%")}){row.kpi ? " = KPI #1" : ""}</>
                    )
                  }
                  drop={row.drop}
                  tooltip={[
                    `${row.label} · รวม = ${fmt(over, "%")} ของฐาน Tier A`,
                    `สัดส่วน: A ${fmt(pctOf(row.counts.A, row.counts.total), "%")} · B ${fmt(pctOf(row.counts.B, row.counts.total), "%")} · C ${fmt(pctOf(row.counts.C, row.counts.total), "%")}`,
                    `อัตราผ่าน Tier A ${row.counts.A}/${orm.base} (${fmt(pctOf(row.counts.A, orm.base), "%")})${compare && ormB ? ` · B ${row.label === "นัดแล้ว" ? ormB.scheduled.total : row.label === "ประชุมสำเร็จ" ? ormB.completed.total : row.label === "เก็บ survey สำเร็จ" ? ormB.surveySuccess.total : ormB.base}` : ""}${(over ?? 0) > 100 ? " · เกินฐาน → ดู workload ที่ ④b" : ""}`,
                  ]}
                />
              );
            })}
          </div>
        )}
        {showMc && (
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--series-2)" }}>{SERVICE_NAME.Marcom}</h3>
            <p className="mb-2 text-xs text-muted-foreground">ฐาน = ทุกโรงแรมที่มี Marcom ({mc.base})</p>
            <MarcomRow label="การ์ดของเดือน" count={mc.base} base={mc.base} tooltip={[`การ์ด Marcom ทั้งหมด ${mc.base}`]} />
            <MarcomRow
              label="นัดแล้ว" count={mc.scheduled.total} base={mc.base}
              drop={dropText([["ยังไม่นัด", mc.drops.notAssigned], ["เลื่อน", mc.drops.postponed], ["ปฏิเสธ", mc.drops.rejected]], "หลุด")}
              tooltip={[`นัดแล้ว ${mc.scheduled.total}/${mc.base} (${fmt(pctOf(mc.scheduled.total, mc.base), "%")})`, compare && mcB ? `B ${mcB.scheduled.total}` : ""]}
            />
            <MarcomRow
              label="ประชุมสำเร็จ" count={mc.completed.total} base={mc.base}
              drop={dropText([["รอวันประชุม", mc.drops.waiting], ["เลยวันนัด ยังไม่อัปเดต", mc.drops.pastNotUpdated], ["ไม่มา", mc.drops.noShow]], "ยังไม่ถึง")}
              tooltip={[`ประชุมสำเร็จ ${mc.completed.total}/${mc.base} (${fmt(pctOf(mc.completed.total, mc.base), "%")})`, compare && mcB ? `B ${mcB.completed.total}` : ""]}
            />
            <MarcomRow
              label="เก็บ survey สำเร็จ" count={mc.surveySuccess.total} base={mc.base}
              drop={dropText([[MEETING_STATUS_LABEL.aeNotSent, mc.drops.aeNotSent], [MEETING_STATUS_LABEL.surveyPending, mc.drops.surveyPending], [MEETING_STATUS_LABEL.surveyCommented, mc.drops.surveyCommented]], MEETING_STATUS_LABEL.notDone)}
              tooltip={[`survey สำเร็จ ${mc.surveySuccess.total}/${mc.completed.total} ของที่ประชุมสำเร็จ`, compare && mcB ? `B ${mcB.surveySuccess.total}` : ""]}
            />
            <p className="mt-banner">Marcom Tier ยังไม่กำหนด — ฐาน = ทุกโรงแรมที่มีผู้ดูแล Marcom (100% coverage)</p>
          </div>
        )}
      </div>
    </DashCard>
  );
}

/* ================= ② Tier A pending ================= */
const PENDING_ORDER = ["REJECTED", "NO_SHOW", "PAST", "NOT_ASSIGN", "POSTPONED", "WAITING"];
function pendingKind(row: MeetingRow, today: Date): string {
  const s = String(row["status"] ?? "");
  if (s === "REJECTED") return "REJECTED";
  if (s === "NO_SHOW") return "NO_SHOW";
  if (s === "POSTPONED") return "POSTPONED";
  if (s === "CONFIRMED") {
    const md = row["meeting_date"] ? Date.parse(`${String(row["meeting_date"]).slice(0, 10)}T00:00:00Z`) / 864e5 : null;
    return md != null && md < bkkDayNum(today) ? "PAST" : "WAITING";
  }
  return "NOT_ASSIGN";
}
const PENDING_CHIP: Record<string, [string, string]> = {
  REJECTED: ["ลูกค้าปฏิเสธ", "mt-chip-red"],
  NO_SHOW: ["ไม่มา", "mt-chip-grey"],
  PAST: ["เลยวันนัด ยังไม่อัปเดต", "mt-chip-amber"],
  NOT_ASSIGN: ["ยังไม่นัด", "mt-chip-amber"],
  POSTPONED: ["เลื่อน", "mt-chip-grey"],
  WAITING: ["รอวันประชุม", "mt-chip-teal"],
};

function TierAPending({ rows, now }: { rows: MeetingRow[]; now: Date }) {
  const month = cardMonthOf(now);
  const late = isTierALate(month, now);
  const dtc = daysToCutoff(month, now);
  const [open, setOpen] = useState(true);
  const sorted = [...rows].sort((a, b) => {
    const d = PENDING_ORDER.indexOf(pendingKind(a, now)) - PENDING_ORDER.indexOf(pendingKind(b, now));
    if (d) return d;
    return String(a["meeting_date"] ?? "9999").localeCompare(String(b["meeting_date"] ?? "9999"));
  });
  const cutoffLabel = `${MEETING_CONFIG.cutoff_day} ${thMonth(month)}`;
  return (
    <section className={cn("dash-card", late && sorted.length > 0 && "border-l-4 border-l-[var(--grade-action)]")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
          <span>
            <span className="block text-base font-semibold">② Tier A ที่ยังไม่สำเร็จ</span>
            <span className="block text-[13px] text-muted-foreground">ใบไหนยังขาด ใครดูแล ทันก่อน cutoff {cutoffLabel} ไหม?</span>
          </span>
        </span>
        <span className="text-right">
          <span className={cn("block text-2xl font-bold tabular-nums", late && sorted.length > 0 && "text-dash-action")}>{sorted.length} ใบ</span>
          <span className={cn("block text-xs", late ? "text-dash-action" : "text-muted-foreground")}>
            {late ? `ผ่าน cutoff แล้ว ${-dtc} วัน` : `เหลือ ${dtc} วันถึง cutoff ${cutoffLabel}`}
          </span>
        </span>
      </button>
      {open &&
        (sorted.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Tier A ครบทุกใบแล้ว</p>
        ) : (
          <div className="mt-table-wrap mt-4">
            <table className="mt-table">
              <thead>
                <tr>
                  <th>โรงแรม</th><th>AE</th><th>ORM ทีม</th><th>สถานะ</th><th>วันนัด</th><th>ถึง cutoff</th><th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const kind = pendingKind(r, now);
                  const [label, cls] = PENDING_CHIP[kind]!;
                  const d = Number(r["days_to_cutoff"] ?? 0);
                  return (
                    <tr key={String(r["meeting_id"])}>
                      <td className="font-semibold"><HotelCell r={r} /></td>
                      <td>{String(r["owner_ae_id"] ?? "—")}</td>
                      <td>ทีม {String(r["orm_team"] ?? "—")}</td>
                      <td><span className={cn("mt-chip", cls)}>{label}</span></td>
                      <td className="tabular-nums">{r["meeting_date"] ? thDay(String(r["meeting_date"])) : "—"}</td>
                      <td className={cn("tabular-nums", d < 0 && "text-dash-action font-semibold")}>
                        {d < 0 ? `เลย ${-d} วัน` : `${d} วัน`}
                      </td>
                      <td>
                        <Link
                          to="/ps/ae-workspace/meetings"
                          hash={String(r["meeting_id"])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          เปิดใน AE Workspace <ArrowUpRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}

/* ================= ④ owner lens ================= */
type Lens = "ORM_TEAM" | "MARCOM_PERSON" | "AE";
const ORM_TEAM_ORDER = ["A", "B", "C", "D", "E", "Re-active"];
const MARCOM_ORDER = ["แนน", "บิว", "โบว์", "เจน"];

function ownerOrder(rows: MeetingRow[], lens: Lens): string[] {
  const present = new Set(rows.map((r) => String(r["owner"])));
  const fixed = lens === "ORM_TEAM" ? ORM_TEAM_ORDER : lens === "MARCOM_PERSON" ? MARCOM_ORDER : null;
  if (fixed) return [...fixed.filter((o) => present.has(o)), ...[...present].filter((o) => !fixed.includes(o)).sort()];
  return [...present].sort((a, b) => a.localeCompare(b));
}

function OwnerCards({ rows, rowsB, lens, setLens, months, now, compare, service }: {
  rows: MeetingRow[]; rowsB: MeetingRow[]; lens: Lens; setLens: (l: Lens) => void;
  months: string[]; now: Date; compare: boolean; service: string;
}) {
  const late = isRangeLate(months, now);
  const owners = ownerOrder(rows, lens);
  const byOwner = (o: string, src: MeetingRow[]) => src.find((r) => String(r["owner"]) === o);
  const isMc = lens === "MARCOM_PERSON";
  const totalDone = rows.reduce((s, r) => s + Number(r[isMc ? "mc_completed" : "a_completed"] ?? 0), 0);
  const totalBase = rows.reduce((s, r) => s + Number(r[isMc ? "mc_base" : "a_base"] ?? 0), 0);
  const totalPct = pctOf(totalDone, totalBase);
  const totalScheduled = rows.reduce((s, r) => s + Number(r["scheduled_completed"] ?? 0) + Number(r["scheduled_waiting"] ?? 0) + Number(r["scheduled_no_show"] ?? 0), 0);
  const maxScheduled = Math.max(1, ...rows.map((r) => Number(r["scheduled_completed"] ?? 0) + Number(r["scheduled_waiting"] ?? 0) + Number(r["scheduled_no_show"] ?? 0)));
  const title4a = lens === "ORM_TEAM" ? "④a นัดประชุม Tier A สำเร็จ รายทีม" : lens === "AE" ? "④a นัดประชุม Tier A สำเร็จ ราย AE" : "④a ประชุม Marcom สำเร็จ รายคน";

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="mt-lens" role="group" aria-label="เลือกมุมมอง ④">
          {([["ORM_TEAM", "ORM ทีม"], ["MARCOM_PERSON", "Marcom รายคน"], ["AE", "AE"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={lens === key}
              disabled={(service === "ORM" && key === "MARCOM_PERSON") || (service === "Marcom" && key === "ORM_TEAM")}
              onClick={() => setLens(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard
          title={title4a}
          question={isMc ? "ประชุมสำเร็จทั้งหมดรายคน (Tier TBD)" : "แต่ละหน่วยผ่าน Tier A กี่เปอร์เซ็นต์?"}
          answer={fmt(totalPct, "%")}
          answerSub={`${totalDone}/${totalBase}`}
          answerTone={!isMc && late && (totalPct ?? 100) < 100 ? "action" : "accent"}
          noteKey={`meeting.4a.${lens}`}
          noteLines={[`รวม ${totalDone}/${totalBase} = ${fmt(totalPct, "%")}`]}
          howToRead={isMc ? "ผู้ดูแลตาม Hotel Profile ของเดือนนั้น" : late ? "ผ่าน cutoff: แถวที่ยังไม่ครบ 100% เป็นสีแดง" : "ก่อน cutoff ใช้สีกลาง"}
        >
          {isMc && <p className="mt-banner mb-3">Tier TBD — แสดงประชุมสำเร็จทั้งหมด รายคน</p>}
          <div className="space-y-1">
            {owners.map((o) => {
              const r = byOwner(o, rows);
              if (!r) return null;
              const done = Number(r[isMc ? "mc_completed" : "a_completed"] ?? 0);
              const base = Number(r[isMc ? "mc_base" : "a_base"] ?? 0);
              const pct = pctOf(done, base);
              const rowLate = !isMc && late && (pct ?? 100) < 100;
              const b = compare ? byOwner(o, rowsB) : undefined;
              const bPct = b ? pctOf(Number(b[isMc ? "mc_completed" : "a_completed"] ?? 0), Number(b[isMc ? "mc_base" : "a_base"] ?? 0)) : null;
              return (
                <ChartHint key={o} header={`${o} · ${done}/${base} (${fmt(pct, "%")})`} lines={[
                  isMc ? "ประชุมสำเร็จ ÷ ฐาน Marcom ของเดือน" : "Tier A สำเร็จ ÷ ฐาน Tier A (การ์ด − เลื่อนเดือนหน้า)",
                  late ? `ผ่าน cutoff แล้ว` : `ก่อน cutoff · ยังทัน`,
                  compare ? `A ${fmt(pct, "%")} · B ${fmt(bPct, "%")} · ${deltaText(pct, bPct, "pp")}` : "",
                ]}>
                  <button type="button" className="mt-bar-row" aria-label={`${o} ${fmt(pct, "%")}`}>
                    <span className="truncate font-medium">{o}{lens === "MARCOM_PERSON" && o === "แนน" ? " (Lead)" : ""}</span>
                    <span>
                      <span className="mt-bar-track-slim block">
                        <span className={cn("mt-bar-fill", rowLate && "mt-bar-fill-late", isMc && "mt-bar-fill-mc")} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                      </span>
                      {compare && <span className="mt-bar-b block" style={{ width: `${Math.min(bPct ?? 0, 100)}%` }} />}
                    </span>
                    <span className={cn("text-right tabular-nums", rowLate && "text-dash-action font-semibold")}>
                      {fmt(pct, "%")} · {done}/{base}
                    </span>
                  </button>
                </ChartHint>
              );
            })}
          </div>
        </DashCard>

        <DashCard
          title="④b จำนวนนัดที่ทำได้ทั้งเดือน"
          question={`วอลลุ่มและ workload ของแต่ละ${lens === "ORM_TEAM" ? "ทีม" : lens === "AE" ? "AE" : "คน"} (ทุก Tier · นัดแล้วขึ้นไป)`}
          answer={totalScheduled}
          answerSub="นัดทั้งหมด"
          answerTone="accent"
          noteKey={`meeting.4b.${lens}`}
          noteLines={[`นัดรวม ${totalScheduled} ครั้ง · ประชุมสำเร็จ ${rows.reduce((s, r) => s + Number(r["scheduled_completed"] ?? 0), 0)}`]}
          howToRead="ต่อ 10 โรงแรม = นัด ÷ จำนวนโรงแรมในพอร์ต × 10 · ใช้เทียบ workload ระหว่างพอร์ตขนาดต่างกัน"
        >
          <div className="space-y-1">
            {owners.map((o) => {
              const r = byOwner(o, rows);
              if (!r) return null;
              const done = Number(r["scheduled_completed"] ?? 0);
              const wait = Number(r["scheduled_waiting"] ?? 0);
              const noShow = Number(r["scheduled_no_show"] ?? 0);
              const total = done + wait + noShow;
              const hotels = Number(r["hotel_count"] ?? 0);
              const per10 = hotels > 0 ? (total / hotels) * 10 : null;
              const b = compare ? byOwner(o, rowsB) : undefined;
              const bTotal = b ? Number(b["scheduled_completed"] ?? 0) + Number(b["scheduled_waiting"] ?? 0) + Number(b["scheduled_no_show"] ?? 0) : null;
              return (
                <ChartHint key={o} header={`${o} · นัด ${total} ครั้ง · พอร์ต ${hotels} โรงแรม`} lines={[
                  `ประชุมสำเร็จ ${done} · รอวันประชุม ${wait} · ไม่มา ${noShow}`,
                  `ต่อ 10 โรงแรม ${fmt(per10)}`,
                  compare ? `A ${total} · B ${bTotal ?? "—"} · ${deltaText(total, bTotal)}` : "",
                ]}>
                  <button type="button" className="mt-bar-row" style={{ gridTemplateColumns: "120px minmax(0,1fr) 96px" }} aria-label={`${o} นัด ${total}`}>
                    <span className="truncate font-medium">{o}</span>
                    <span>
                      <span className="mt-stack block" style={{ width: `${(total / maxScheduled) * 100}%` }}>
                        {done > 0 && <span className="mt-stack-done" style={{ width: `${(done / total) * 100}%` }}>{done}</span>}
                        {wait > 0 && <span className="mt-stack-wait" style={{ width: `${(wait / total) * 100}%` }}>{wait}</span>}
                        {noShow > 0 && <span className="mt-stack-noshow" style={{ width: `${(noShow / total) * 100}%` }}>{noShow}</span>}
                      </span>
                      {compare && <span className="mt-bar-b block" style={{ width: `${((bTotal ?? 0) / maxScheduled) * 100}%` }} />}
                    </span>
                    <span className="text-right text-xs tabular-nums">
                      นัด {total} · <span className="text-muted-foreground">{per10 == null ? "—" : fmt(per10)}/10</span>
                    </span>
                  </button>
                </ChartHint>
              );
            })}
          </div>
        </DashCard>
      </div>
    </div>
  );
}

/* ================= ⑤ survey scores ================= */
const SCORE_CLASS = (s: number) => (s <= 5 ? "mt-hist-s1" : s === 6 ? "mt-hist-s6" : s <= 8 ? "mt-hist-s78" : "mt-hist-s910");
const scoreColor = (s: number) => (s <= 5 ? "var(--action-text)" : s === 6 ? "var(--watch-text)" : "var(--text-primary)");

function QCard({ q, label, rows, curRows, prevRows, flags, compare, prevLabel }: {
  q: string; label: string; rows: MeetingRow[]; curRows: MeetingRow[]; prevRows: MeetingRow[]; flags: MeetingRow[]; compare: boolean; prevLabel: string;
}) {
  const [pinned, setPinned] = useState<number | null>(null);
  const scores = rows.map((r) => Number(r["score"])).filter((s) => s >= 1 && s <= 10);
  const med = median(scores);
  const prevMed = median(prevRows.map((r) => Number(r["score"])).filter((s) => s >= 1 && s <= 10));
  const le6 = scores.filter((s) => s <= 6).length;
  // R1 [mt1-2]: "vs เดือนก่อน" = card month M vs M−1.
  const medM = median(curRows.map((r) => Number(r["score"])).filter((s) => s >= 1 && s <= 10));
  const le6M = curRows.filter((r) => Number(r["score"]) <= 6).length;
  const prevLe6 = prevRows.filter((r) => Number(r["score"]) <= 6).length;
  const hist = Array.from({ length: 10 }, (_, i) => scores.filter((s) => s === i + 1).length);
  const maxHist = Math.max(1, ...hist);
  const dropped = rows.filter((r) => r["prev_score"] != null && Number(r["score"]) <= 6 && Number(r["score"]) < Number(r["prev_score"]));
  const noted = rows.filter((r) => r["prev_score"] != null && Number(r["score"]) >= 7 && Number(r["prev_score"]) - Number(r["score"]) >= MEETING_CONFIG.decline_note_pts);
  const flagOf = (hotel: string) =>
    flags.find((f) => f["hotel_id"] === hotel && f["topic"] === q && f["severity"] === "FLAG") ? FLAG_LABEL.red
      : flags.find((f) => f["hotel_id"] === hotel && f["topic"] === q) ? FLAG_LABEL.warn : null;
  const delta = medM != null && prevMed != null ? medM - prevMed : null;
  const pinnedRows = pinned == null ? [] : rows.filter((r) => Number(r["score"]) === pinned);

  return (
    <div className="mt-qcard">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{q} {label}</p>
          <p className={cn("mt-0.5 text-[11.5px]", le6M > prevLe6 ? "text-dash-watch" : "text-muted-foreground")}>
            ≤6: {le6} ราย ({le6M > prevLe6 ? `▲${le6M - prevLe6}` : le6M < prevLe6 ? `▼${prevLe6 - le6M}` : "เท่าเดิม"} จาก {prevLabel}) · n {scores.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] text-muted-foreground">median</p>
          <p className="text-2xl font-bold tabular-nums leading-none">{fmtMedian(med)}</p>
          <span className={cn("mt-chip mt-1", delta == null || delta === 0 ? "mt-chip-grey" : delta < 0 ? "mt-chip-red" : "mt-chip-teal")}>
            {delta == null ? "—" : delta === 0 ? "± 0" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} จาก ${prevLabel}`}
          </span>
        </div>
      </div>
      <div className="mt-hist" role="group" aria-label={`${q} histogram`}>
        {hist.map((n, i) => (
          <ChartHint key={i} header={`คะแนน ${i + 1} · ${n} โรงแรม (${fmt(pctOf(n, scores.length), "%")})`} lines={[n ? "คลิกเพื่อดูรายชื่อ" : "ไม่มีโรงแรม"]}>
            <button
              type="button"
              className="mt-hist-btn"
              aria-pressed={pinned === i + 1}
              aria-label={`คะแนน ${i + 1} · ${n} โรงแรม`}
              onClick={() => setPinned(pinned === i + 1 ? null : i + 1)}
            >
              <span className="tabular-nums">{n || ""}</span>
              <span className={cn("mt-hist-bar", SCORE_CLASS(i + 1))} style={{ height: `${(n / maxHist) * 78}%` }} />
              <span>{i + 1}</span>
            </button>
          </ChartHint>
        ))}
      </div>
      {pinned != null && (
        <div className="mt-pin">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">คะแนน {pinned} · {pinnedRows.length} โรงแรม</p>
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setPinned(null)}>ปิด</button>
          </div>
          <ul className="space-y-1.5">
            {pinnedRows.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 text-xs">
                <Link to="/ps/ae-workspace/meetings" hash={String(r["meeting_id"])} className="font-semibold text-primary">
                  {hotelNameOf(r)}
                </Link>
                <span>{String(r["caretaker"] ?? "—")}</span>
                <span className="text-muted-foreground">AE {aeNameTh(r["ae_owner_id"])}</span>
                {r["disputed"] ? <span className="mt-chip mt-chip-amber">ลูกค้าแย้ง</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-primary">
          ▸ ดูสรุปสั้น <span className={cn("font-normal", dropped.length ? "text-dash-action" : "text-muted-foreground")}>· ลดลง {dropped.length} โรงแรม</span>
        </summary>
        <div className="mt-2 space-y-2 text-xs leading-relaxed">
          <p>
            median {fmtMedian(med)} ({delta == null || delta === 0 ? "เท่ากับ" : delta > 0 ? `เพิ่ม ${delta}` : `ลด ${Math.abs(delta)}`} จาก {prevLabel})
            {!dropped.length && !noted.length ? " · ไม่มีโรงแรมที่คะแนนลดลง" : ""}
          </p>
          <div>
            <p className="font-semibold">ตกลงเข้าเกณฑ์ (≤6) — {dropped.length} โรงแรม</p>
            {dropped.map((r, i) => {
              const badge = flagOf(String(r.hotel_id));
              return (
                <p key={i} className="mt-0.5">
                  – <HotelCell r={r} /> {String(r["prev_score"])} → {String(r["score"])} · {String(r["caretaker"])} · AE {aeNameTh(r["ae_owner_id"])}
                  {badge && <span className={cn("mt-chip ml-1", badge === FLAG_LABEL.red ? "mt-chip-red" : "mt-chip-amber")}>{badge}</span>}
                </p>
              );
            })}
          </div>
          <div>
            <p className="font-semibold">ลดลง ≥{MEETING_CONFIG.decline_note_pts} แต่ยังอยู่ ≥7 — {noted.length} โรงแรม (โน้ตเท่านั้น ไม่เข้า flag)</p>
            {noted.map((r, i) => (
              <p key={i} className="mt-0.5">– <HotelCell r={r} /> {String(r["prev_score"])} → {String(r["score"])} · {String(r["caretaker"])} · AE {aeNameTh(r["ae_owner_id"])}</p>
            ))}
          </div>
          <p className="text-muted-foreground">ป้ายธงแดง / ธงเหลือง อ่านจากธงที่ระบบสร้างไว้ (คะแนน ≤{FLAG_RED_MAX} = ธงแดง · {FLAG_WARN_SCORE} = ธงเหลือง) · ตัวเลข = คะแนน {prevLabel} → เดือนนี้</p>
        </div>
      </details>
    </div>
  );
}

function BreakdownStrip({ title, hint, rowNames, rowKey, qs, rows, prevRows, flags, footer, unit }: {
  title: string; hint: string; rowNames: string[]; rowKey: (r: MeetingRow) => string | null;
  qs: readonly [string, string][]; rows: MeetingRow[]; prevRows: MeetingRow[]; flags: MeetingRow[]; footer: string; unit: string;
}) {
  const [open, setOpen] = useState(false);
  const [cell, setCell] = useState<string | null>(null);
  const rowsWithLe6 = rowNames.filter((name) =>
    rows.some((r) => rowKey(r) === name && Number(r["score"]) <= 6),
  ).length;
  const cellRows = (name: string, q: string) => rows.filter((r) => rowKey(r) === name && r["question"] === q);
  const selected = cell?.split("|");
  const selectedRows = selected ? cellRows(selected[0]!, selected[1]!).sort((a, b) => Number(a["score"]) - Number(b["score"])) : [];

  return (
    <div className="mt-strip">
      <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); setCell(null); }}>
        <span>{open ? "▾" : "▸"} {title}</span>
        <span className={cn("text-xs font-normal", rowsWithLe6 ? "text-dash-watch" : "text-muted-foreground")}>
          {rowsWithLe6 ? `มี ≤6 อยู่ ${rowsWithLe6} ${unit}` : "ไม่มี ≤6"}
        </span>
      </button>
      {open && (
        <div className="border-t p-3">
          <div className="mt-table-wrap">
            <table className="mt-table" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th />
                  {qs.map(([q, label]) => <th key={q}>{q} {label}</th>)}
                  <th>n</th>
                  <th>≤6</th>
                </tr>
              </thead>
              <tbody>
                {rowNames.map((name) => {
                  const mine = rows.filter((r) => rowKey(r) === name);
                  const le6 = mine.filter((r) => Number(r["score"]) <= 6).length;
                  return (
                    <tr key={name}>
                      <td className="font-semibold">{name}</td>
                      {qs.map(([q]) => {
                        const cellRowsQ = cellRows(name, q);
                        const med = median(cellRowsQ.map((r) => Number(r["score"])));
                        const prevMed = median(prevRows.filter((r) => rowKey(r) === name && r["question"] === q).map((r) => Number(r["score"])));
                        const d = med != null && prevMed != null ? med - prevMed : null;
                        const small = cellRowsQ.length > 0 && cellRowsQ.length < MEETING_CONFIG.small_n;
                        return (
                          <td key={q}>
                            <button
                              type="button"
                              aria-pressed={cell === `${name}|${q}`}
                              onClick={() => setCell(cell === `${name}|${q}` ? null : `${name}|${q}`)}
                              className={cn("rounded-md px-2 py-1 text-left tabular-nums", med != null && med <= 6 && "font-bold text-dash-watch", cell === `${name}|${q}` && "outline-2 outline-[var(--text-primary)]")}
                            >
                              {fmtMedian(med)}
                              {d != null && d !== 0 && (
                                <span className={cn("ml-1 text-[10px]", d < 0 ? "text-dash-action" : "text-dash-good")}>{d > 0 ? `▲${d}` : `▼${Math.abs(d)}`}</span>
                              )}
                              {small && <span className="ml-1 text-[10px] text-muted-foreground">ฐานเล็ก</span>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="tabular-nums">{mine.length}</td>
                      <td className={cn("tabular-nums", le6 > 0 && "font-bold text-dash-action")}>{le6}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selected && (
            <div className="mt-pin">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold">{selected[0]} · {selected[1]} · {selectedRows.length} โรงแรม (เรียงคะแนนต่ำ → สูง)</p>
                <button type="button" className="text-xs font-semibold text-primary" onClick={() => setCell(null)}>ปิด</button>
              </div>
              <ul className="space-y-1.5">
                {selectedRows.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-2 text-xs">
                    <Link to="/ps/ae-workspace/meetings" hash={String(r["meeting_id"])} className="font-semibold text-primary">{hotelNameOf(r)}</Link>
                    <span className="font-bold tabular-nums" style={{ color: scoreColor(Number(r["score"])) }}>
                      {String(r["score"])}{r["prev_score"] != null ? ` (${thMonth(String(r["card_month"])) === "ก.ย. 69" ? "ส.ค." : "ก่อน"} ${String(r["prev_score"])})` : ""}
                    </span>
                    <span>{String(r["caretaker"] ?? "—")}</span>
                    <span className="text-muted-foreground">AE {aeNameTh(r["ae_owner_id"])}</span>
                    {r["disputed"] ? <span className="mt-chip mt-chip-amber">ลูกค้าแย้ง</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">{footer}</p>
        </div>
      )}
    </div>
  );
}

function SurveySection({ surveys, curSurveys, prevSurveys, flags, service, compare, prevLabel }: {
  surveys: MeetingRow[]; curSurveys: MeetingRow[]; prevSurveys: MeetingRow[]; flags: MeetingRow[]; service: string; compare: boolean; prevLabel: string;
}) {
  const groups = [
    { key: "ภาพรวม", qs: QUESTIONS.filter(([q]) => q === "Q7" || q === "Q8"), rows: surveys, cur: curSurveys, prev: prevSurveys },
    { key: "ORM", qs: QUESTIONS.filter(([, , g]) => g === "ORM"), rows: surveys.filter((r) => r.service_line === "ORM"), cur: curSurveys.filter((r) => r.service_line === "ORM"), prev: prevSurveys.filter((r) => r.service_line === "ORM") },
    { key: "Marcom", qs: QUESTIONS.filter(([, , g]) => g === "Marcom"), rows: surveys.filter((r) => r.service_line === "Marcom"), cur: curSurveys.filter((r) => r.service_line === "Marcom"), prev: prevSurveys.filter((r) => r.service_line === "Marcom") },
  ].filter((g) => g.key === "ภาพรวม" || service === "ALL" || service === g.key);

  return (
    <DashCard
      title="⑤ คะแนน Survey ราย Q"
      question="แต่ละข้อได้คะแนนเท่าไร เปลี่ยนจากเดือนก่อนแค่ไหน และโรงแรมไหนให้คะแนนต่ำ?"
      answer={fmtMedian(median(surveys.filter((r) => r["question"] === "Q7").map((r) => Number(r["score"]))))}
      answerSub="median Q7 /10"
      answerTone="accent"
      noteKey="meeting.survey"
      noteLines={[`สำรวจที่ส่งแล้ว ${new Set(surveys.map((r) => r["meeting_id"])).size} ฉบับ (รวมที่ลูกค้าแย้ง)`]}
      howToRead="ชี้แท่ง = จำนวนโรงแรม · คลิกแท่ง = ดูรายชื่อ"
      legend={
        <>
          <span><i className="mt-hist-bar mt-hist-s1" style={{ width: 10, height: 10, display: "inline-block" }} /> 1–5 (ธงแดง)</span>
          <span><i className="mt-hist-bar mt-hist-s6" style={{ width: 10, height: 10, display: "inline-block" }} /> 6 (ธงเหลือง)</span>
          <span><i className="mt-hist-bar mt-hist-s78" style={{ width: 10, height: 10, display: "inline-block" }} /> 7–8</span>
          <span><i className="mt-hist-bar mt-hist-s910" style={{ width: 10, height: 10, display: "inline-block" }} /> 9–10</span>
        </>
      }
    >
      <div className="space-y-8">
        {groups.map((g) => {
          const n = new Set(g.rows.map((r) => r["meeting_id"])).size;
          return (
            <div key={g.key}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <i className={cn("inline-block size-2.5 rounded-full", g.key === "ORM" ? "bg-primary" : g.key === "Marcom" ? "bg-series-2" : "bg-muted-foreground")} />
                {g.key === "ภาพรวม" ? "ภาพรวม" : SERVICE_NAME[g.key as "ORM" | "Marcom"]}
                <span className="font-normal text-muted-foreground">· n = {n} ฉบับ</span>
              </h3>
              <div className="mt-qgrid">
                {g.qs.map(([q, label]) => (
                  <QCard
                    key={q}
                    q={q}
                    label={label}
                    rows={g.rows.filter((r) => r["question"] === q)}
                    curRows={g.cur.filter((r) => r["question"] === q)}
                    prevRows={g.prev.filter((r) => r["question"] === q)}
                    flags={flags}
                    compare={compare}
                    prevLabel={prevLabel}
                  />
                ))}
              </div>
              {g.key === "ภาพรวม" && (
                <BreakdownStrip
                  title="ดูแยกตามบริการ (ORM / Marcom)"
                  hint=""
                  unit="บริการ"
                  rowNames={service === "ALL" ? ["ORM · Snapshot", "Marcom · Sync up"] : service === "ORM" ? ["ORM · Snapshot"] : ["Marcom · Sync up"]}
                  rowKey={(r) => (r.service_line === "ORM" ? "ORM · Snapshot" : "Marcom · Sync up")}
                  qs={[["Q7", "พึงพอใจ"], ["Q8", "แนะนำต่อ"]]}
                  rows={g.rows}
                  prevRows={g.prev}
                  flags={flags}
                  footer="คลิกตัวเลขเพื่อดูรายชื่อโรงแรม"
                />
              )}
              {g.key === "ORM" && (
                <BreakdownStrip
                  title="ดูแยก ORM ราย ทีม · 6 ทีม"
                  hint=""
                  unit="ทีม"
                  rowNames={ORM_TEAM_ORDER.map((t) => `ทีม ${t}`)}
                  rowKey={(r) => (r["orm_team"] ? `ทีม ${String(r["orm_team"])}` : null)}
                  qs={[["Q1", "เนื้อหา"], ["Q2", "เวลา"], ["Q3", "คำแนะนำ"]]}
                  rows={g.rows}
                  prevRows={g.prev}
                  flags={flags}
                  footer="ฐานเล็ก: ทีมละไม่กี่ฉบับ ให้ดู n ประกอบ · คลิกตัวเลขเพื่อดูรายชื่อโรงแรม"
                />
              )}
              {g.key === "Marcom" && (
                <BreakdownStrip
                  title={`ดูแยก Marcom รายคน · ${MARCOM_ORDER.length} คน`}
                  hint=""
                  unit="คน"
                  rowNames={MARCOM_ORDER.map((p) => (p === "แนน" ? "แนน (Lead)" : p))}
                  rowKey={(r) => {
                    const p = String(r["marcom_owner_id"] ?? "");
                    return p ? (p === "แนน" ? "แนน (Lead)" : p) : null;
                  }}
                  qs={[["Q4", "Content"], ["Q5", "Ads"], ["Q6", "สื่อสาร"]]}
                  rows={g.rows}
                  prevRows={g.prev}
                  flags={flags}
                  footer="Q4 → ผู้ดูแล Content · Q5 → ผู้ดูแล Ads · Q6 → ผู้นำเสนอ · ไม่มี sub-role → ผู้ดูแล Marcom ของ account"
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Q8 = สัญญาณการแนะนำต่อระดับการประชุม (AE กรอก) · ป้าย &quot;ลูกค้าแย้ง&quot; = ลูกค้าคอมเมนต์กลับหลังได้รับอีเมลคะแนน
      </p>
      <Q9Expander rows={surveys} />
    </DashCard>
  );
}

function Q9Expander({ rows }: { rows: MeetingRow[] }) {
  const commented = [...new Map(rows.filter((r) => r["comment"]).map((r) => [r["meeting_id"], r])).values()];
  return (
    <details className="mt-3 border-t pt-3">
      <summary className="cursor-pointer text-sm font-medium">ความเห็นอิสระ Q9 · {commented.length} รายการ</summary>
      <ul className="mt-3 space-y-3">
        {commented.map((r) => (
          <li key={String(r["meeting_id"])} className="border-l-2 pl-3 text-sm">
            <p className="text-xs text-muted-foreground">{hotelNameOf(r)} · {String(r.service_line ?? "")}</p>
            <p>{String(r["comment"])}</p>
            <Link to="/ps/ae-workspace/meetings" hash={String(r["meeting_id"])} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              เปิดต้นทาง <ArrowUpRight className="size-3" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ================= ⑥ Flag Board ================= */
function FlagBoard({ flags, period, compare, periodB, service }: {
  flags: MeetingRow[]; period: Period; compare: boolean; periodB: Period; service: string;
}) {
  const [watchOpen, setWatchOpen] = useState(false);
  const open = flags.filter((r) => !r["resolved_at"] && r["severity"] === "FLAG");
  const watch = flags.filter((r) => !r["resolved_at"] && r["severity"] === "WARNING");
  const inPeriod = (d: unknown, p: Period) => d != null && String(d).slice(0, 10) >= p.from && String(d).slice(0, 10) <= p.to;
  const newCount = flags.filter((r) => inPeriod(r["created_at"], period)).length;
  const closedCount = flags.filter((r) => inPeriod(r["resolved_at"], period)).length;
  const newB = compare ? flags.filter((r) => inPeriod(r["created_at"], periodB)).length : null;
  const closedB = compare ? flags.filter((r) => inPeriod(r["resolved_at"], periodB)).length : null;
  const visibleGroups = FLAG_GROUPS.filter(
    (g) => service === "ALL" || (service === "ORM" ? g.key !== "SYNCUP" : g.key !== "SNAPSHOT"),
  );

  return (
    <DashCard
      title="⑥ ธงแดง / ธงเหลือง"
      info={{
        formula: `ธงเกิดเมื่อ: คะแนน ≤${FLAG_RED_MAX} → ธงแดงทันที · คะแนน ${FLAG_WARN_SCORE} → ธงเหลือง · ได้ ${FLAG_WARN_SCORE} อีกครั้งใน ${MEETING_CONFIG.warning_window_months} เดือน → ธงแดง · ลูกค้าปฏิเสธนัด → ธงแดง · ธงแดง → ระบบสร้างงาน Coaching ส่งถึงหัวหน้าที่รับผิดชอบ`,
        read: "แสดงต้นทาง (ธง) เท่านั้น · จำนวนงาน Coaching ค้างดูที่แท็บ ติดตามงานผู้ให้บริการ (ไม่นับซ้ำ) · ค้าง ใช้สีกลางจนกว่าจะตั้งเกณฑ์วัน",
      }}
      question="มีปัญหาอะไรค้างอยู่ ใครต้องจัดการ?"
      answer={<span className={cn(open.length > 0 && "text-dash-action")}>{open.length}</span>}
      answerSub={`ธงแดงใหม่เดือนนี้ ${newCount} · ปิดแล้ว ${closedCount}`}
      answerTone={open.length > 0 ? "action" : "neutral"}
      noteKey="meeting.flags"
      noteLines={[`ธงแดงเปิดค้าง ${open.length} ธง · ธงเหลือง ${watch.length} รายการ`]}
      howToRead="ชี้ ⓘ ที่หัวการ์ดเพื่อดูกติกาการเกิดธง"
    >
      <div className="mt-tiles mt-4">
        {visibleGroups.map((g) => {
          const gOpen = open.filter((r) => r["group_name"] === g.key).length;
          const gNew = flags.filter((r) => r["group_name"] === g.key && inPeriod(r["created_at"], period)).length;
          const gClosed = flags.filter((r) => r["group_name"] === g.key && inPeriod(r["resolved_at"], period)).length;
          return (
            <div key={g.key} className={cn("mt-tile", g.accent === "teal" && "mt-tile-teal", g.accent === "indigo" && "mt-tile-indigo")}>
              <p className="text-sm font-semibold">{g.title}</p>
              <p className="text-[11px] text-muted-foreground">{g.sub}</p>
              <p className={cn("mt-1 text-2xl font-bold tabular-nums", gOpen > 0 ? "text-dash-action" : "text-muted-foreground")}>
                {gOpen} <span className="text-xs font-normal">เปิดค้าง</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                ใหม่เดือนนี้ {gNew} · ปิดแล้ว {gClosed}
                {compare && newB != null ? ` · B ใหม่ ${newB} · ปิด ${closedB}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">ส่งถึง: {g.routed}</p>
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold">ธงที่ยังเปิดอยู่ · เรียงตามค้างนาน <span className="font-normal text-muted-foreground">(สถานะปัจจุบัน)</span></h3>
      <div className="mt-table-wrap">
        <table className="mt-table">
          <thead>
            <tr><th>โรงแรม</th><th>หัวข้อ</th><th>คะแนน</th><th>ผู้ถูก flag</th><th>ส่งถึง</th><th>ค้าง</th><th>Coaching</th><th /></tr>
          </thead>
          <tbody>
            {[...open].sort((a, b) => Number(b["age_days"]) - Number(a["age_days"])).map((r) => {
              const group = FLAG_GROUPS.find((g) => g.key === r["group_name"]);
              const qLabel = QUESTIONS.find(([q]) => q === r["topic"])?.[1];
              return (
                <tr key={String(r["flag_id"])}>
                  <td className="font-semibold"><HotelCell r={r} /></td>
                  <td>
                    <span className="block text-[10.5px] text-muted-foreground">{group?.title}</span>
                    {r["topic"] === "REJECTED" ? "ลูกค้าปฏิเสธนัด" : `${String(r["topic"])} ${qLabel ?? ""}`}
                  </td>
                  <td>
                    {r["score"] != null ? (
                      <span className="mt-chip mt-chip-red">
                        {String(r["score"])}
                      </span>
                    ) : "—"}
                    {r["escalated_from_warning"] ? <span className="ml-1 text-[10.5px] text-muted-foreground">ธงเหลืองครั้งที่ 2</span> : null}
                  </td>
                  <td>{String(r["flagged_user"] ?? "—")}</td>
                  <td className="text-xs">{String(r["route_target"] ?? "—")}</td>
                  <td className="tabular-nums text-muted-foreground">{String(r["age_days"])} วัน</td>
                  <td>
                    {r["coaching_status"] ? (
                      <span className={cn("mt-chip", r["coaching_status"] === "รอรับงาน" ? "mt-chip-amber" : "mt-chip-teal")}>{String(r["coaching_status"])}</span>
                    ) : null}
                  </td>
                  <td>
                    <Link to="/ps/ae-workspace/coaching" hash={String(r["flag_id"])} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      เปิด Coaching <ArrowUpRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!open.length && (
              <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">ไม่มีธงที่เปิดอยู่</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-strip mt-strip-watch mt-4">
        <button type="button" aria-expanded={watchOpen} onClick={() => setWatchOpen(!watchOpen)}>
          <span>{watchOpen ? "▾" : "▸"} ธงเหลือง (คะแนน {FLAG_WARN_SCORE}) · {watch.length} รายการ</span>
          <span className="text-xs font-normal text-muted-foreground">ได้ {FLAG_WARN_SCORE} อีกครั้งก่อนวันหมดช่วง → ธงแดง</span>
        </button>
        {watchOpen && (
          <ul className="space-y-1.5 border-t p-3 text-xs">
            {watch.map((r) => (
              <li key={String(r["flag_id"])} className="flex flex-wrap gap-x-2">
                <HotelCell r={r} />
                <span>{String(r["topic"])} {QUESTIONS.find(([q]) => q === r["topic"])?.[1] ?? ""}</span>
                <span className="text-muted-foreground">{String(r["flagged_user"])}</span>
                <span className="text-dash-watch">หมดช่วงธงเหลือง {r["watch_until"] ? thDay(String(r["watch_until"])) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashCard>
  );
}

/* ================= ⑦ rubric ================= */
function RubricRow() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-rubric">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"} ⑦ Meeting Analyzer (rubric)</span>
        <span className="mt-chip mt-chip-grey">รอ rubric + engine</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">ORM-Snapshot Meeting เท่านั้น · คะแนน — /100 · ระดับ —</span>
      </button>
      {open && (
        <div className="grid gap-2 border-t p-4 sm:grid-cols-2 lg:grid-cols-3">
          {RUBRIC_CATEGORIES.map((c, i) => (
            <div key={c} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{i + 1} {c}</span>
              <span className="text-muted-foreground">—</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= tab ================= */
export function MeetingAnalyzerTab({
  report,
  loading,
  error,
}: {
  report: MeetingReport | undefined;
  loading: boolean;
  error: boolean;
}) {
  const { filter, demo, now: clock } = useDashboardGlobal();
  const now = useMemo(() => new Date(clock), [clock]);
  const [lens, setLens] = useState<Lens>("ORM_TEAM");
  const periodA = selectedPeriod(filter, now);
  const periodB = filter.compare ? selectedPeriod(filter, now, "B") : prevPeriod(periodA);
  // R1 [mt1-2]: M = latest card month in A; "vs เดือนก่อน" always compares M with M−1.
  const monthM = monthsInPeriod(periodA).at(-1) ?? periodA.to.slice(0, 7);
  const periodM = prevPeriod({ from: `${nextMonth(monthM)}-01`, to: `${nextMonth(monthM)}-01` });
  const prev = prevPeriod(periodM);
  const monthsA = monthsInPeriod(periodA);
  const effectiveLens: Lens =
    filter.service === "Marcom" && lens === "ORM_TEAM" ? "MARCOM_PERSON" : filter.service === "ORM" && lens === "MARCOM_PERSON" ? "ORM_TEAM" : lens;

  const views = report?.views;
  const cards = useMemo(() => meetingScope(views?.v_meeting_funnel ?? [], filter, periodA), [views, filter, periodA]);
  const cardsB = useMemo(() => meetingScope(views?.v_meeting_funnel ?? [], filter, periodB), [views, filter, periodB]);
  const cardsPrev = useMemo(() => meetingScope(views?.v_meeting_funnel ?? [], filter, prev), [views, filter, prev]);
  const surveys = useMemo(() => meetingScope(views?.v_meeting_survey_scores ?? [], filter, periodA), [views, filter, periodA]);
  const cardsM = useMemo(() => meetingScope(views?.v_meeting_funnel ?? [], filter, periodM), [views, filter, periodM]);
  const surveysM = useMemo(() => meetingScope(views?.v_meeting_survey_scores ?? [], filter, periodM), [views, filter, periodM]);
  const surveysPrev = useMemo(() => meetingScope(views?.v_meeting_survey_scores ?? [], filter, prev), [views, filter, prev]);
  const ownerRows = useMemo(
    () => (views?.v_meeting_by_owner ?? []).filter((r) => monthsA.includes(String(r["card_month"])) && r["lens"] === effectiveLens),
    [views, monthsA, effectiveLens],
  );
  const ownerRowsB = useMemo(
    () => (views?.v_meeting_by_owner ?? []).filter((r) => monthsInPeriod(periodB).includes(String(r["card_month"])) && r["lens"] === effectiveLens),
    [views, periodB, effectiveLens],
  );
  const pendingRows = useMemo(() => (views?.v_meeting_tierA_pending ?? []).map(normPending), [views]);
  const flags = views?.v_meeting_flags ?? [];

  if (loading) return <ChartSkeleton text="กำลังโหลดรายงานประชุม…" />;
  if (error) return <ChartSkeleton text="อ่านรายงานประชุมไม่ได้ — ลองโหลดหน้าใหม่" />;

  const empty = !cards.length && !surveys.length && !flags.length;
  const orm = aggregateFunnel(cards, "ORM", now);
  const mc = aggregateFunnel(cards, "Marcom", now);
  const ormPrev = aggregateFunnel(cardsPrev, "ORM", now);
  const mcPrev = aggregateFunnel(cardsPrev, "Marcom", now);
  const late = isRangeLate(monthsA, now);

  // tiles
  const aPct = pctOf(orm.completed.A, orm.base);
  const aPctPrev = pctOf(ormPrev.completed.A, ormPrev.base);
  const ormM = aggregateFunnel(cardsM, "ORM", now);
  const aPctM = pctOf(ormM.completed.A, ormM.base);
  const ormB = aggregateFunnel(cardsB, "ORM", now);
  const aPctB = pctOf(ormB.completed.A, ormB.base);
  const tile2 = completionRatio(cards, now);
  const tile2M = completionRatio(cardsM, now);
  const tile2B = completionRatio(cardsB, now);
  const tile2Prev = completionRatio(cardsPrev, now);
  const doneAll = orm.completed.total + mc.completed.total;
  const successAll = orm.surveySuccess.total + mc.surveySuccess.total;
  const submittedAll = doneAll - orm.drops.aeNotSent - mc.drops.aeNotSent;
  const tile3 = pctOf(successAll, doneAll);
  const oldKpi3 = pctOf(submittedAll, doneAll);
  const q7 = median(surveys.filter((r) => r["question"] === "Q7").map((r) => Number(r["score"])));
  const q7Prev = median(surveysPrev.filter((r) => r["question"] === "Q7").map((r) => Number(r["score"])));
  const q7le6 = surveys.filter((r) => r["question"] === "Q7" && Number(r["score"]) <= 6).length;
  const q7M = median(surveysM.filter((r) => r["question"] === "Q7").map((r) => Number(r["score"])));
  const q7le6M = surveysM.filter((r) => r["question"] === "Q7" && Number(r["score"]) <= 6).length;
  const q7le6Prev = surveysPrev.filter((r) => r["question"] === "Q7" && Number(r["score"]) <= 6).length;
  const openFlags = flags.filter((r) => !r["resolved_at"] && r["severity"] === "FLAG");
  const inPeriod = (d: unknown, p: Period) => d != null && String(d).slice(0, 10) >= p.from && String(d).slice(0, 10) <= p.to;
  const newFlags = flags.filter((r) => inPeriod(r["created_at"], periodA)).length;
  const closedFlags = flags.filter((r) => inPeriod(r["resolved_at"], periodA)).length;
  const oldest = openFlags.length ? Math.max(...openFlags.map((r) => Number(r["age_days"] ?? 0))) : 0;
  const cutoffLabel = `${MEETING_CONFIG.cutoff_day} ${thMonth(cardMonthOf(now))}`;
  const dtc = daysToCutoff(cardMonthOf(now), now);
  const prevLabel = thMonth(monthsInPeriod(prev)[0] ?? prev.from.slice(0, 7));

  return (
    <div data-testid="meeting-analyzer" className="min-w-0 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Meeting & Survey</h2>
        <p className="text-xs text-muted-foreground">ตัวชี้วัดของ tab{demo ? " · DEMO · 30 ก.ย. 2026" : ""}</p>
      </div>

      {empty ? (
        <>
          <ChartSkeleton text="รอ Cloud Sync seed — ยังไม่มีข้อมูลประชุม" />
          <ChartSkeleton source text="ยังไม่มีข้อมูลพอสรุป" />
        </>
      ) : (
        <>
          <div className="mt-kpis">
            <KpiTile
              label="Tier A ประชุมสำเร็จ (KPI #1)"
              value={<>{fmt(aPct, "%")} <small>{orm.completed.A}/{orm.base}</small></>}
              late={late && (aPct ?? 100) < 100}
              sub={late
                ? <span className="text-dash-action">ผ่าน cutoff · ขาด {orm.base - orm.completed.A} ใบ</span>
                : <>ระหว่างเดือน · {prevLabel} ปิดที่ {fmt(aPctPrev, "%")}</>}
              lines={[
                "base = การ์ด Tier A − เลื่อนเดือนหน้า · นับที่ COMPLETED · เป้า 100%",
                late ? `ผ่าน cutoff · ขาด ${orm.base - orm.completed.A} ใบ` : `เหลือ ${dtc} วันถึง cutoff · ค้าง ${pendingRows.length} ใบ (ดู ②)`,
                filter.compare ? deltaText(aPct, aPctB, "pp") : "",
              ]}
              compare={filter.compare ? <>A {fmt(aPct, "%")} · B {fmt(aPctB, "%")} · {deltaText(aPct, aPctB, "pp")}</> : !late ? <>เหลือ {dtc} วันถึง cutoff · ค้าง {pendingRows.length} ใบ (ดู ②)</> : aPctM != null && aPctPrev != null ? <>Δ {aPctM - aPctPrev > 0 ? "▲ +" : "▼ "}{Math.abs(aPctM - aPctPrev).toLocaleString("th-TH", { maximumFractionDigits: 1 })} จุด จาก {prevLabel}</> : null}
            />
            <KpiTile
              label="นัดสำเร็จ % (ทุกบริการ)"
              value={<>{fmt(tile2.pct, "%")} <small>{tile2.done}/{tile2.base}</small></>}
              sub={filter.compare ? <>A {fmt(tile2.pct, "%")} · B {fmt(tile2B.pct, "%")} · {deltaText(tile2.pct, tile2B.pct, "pp")}</> : <>{deltaText(tile2M.pct, tile2Prev.pct, "pp")} vs {prevLabel}</>}
              lines={[
                `ORM ${orm.completed.total}/${orm.base} · Marcom ${mc.completed.total}/${mc.base}`,
                "ORM base = Tier A · Marcom base = ทุกโรงแรม · เกิน 100% ได้",
                filter.compare ? `B ${fmt(tile2B.pct, "%")}` : "",
              ]}
            />
            <KpiTile
              label="เก็บ Survey สำเร็จ"
              value={<>{fmt(tile3, "%")} <small>{successAll}/{doneAll}</small></>}
              sub={<>ลูกค้าแย้ง {orm.drops.surveyCommented + mc.drops.surveyCommented} · รอลูกค้าตอบ {orm.drops.surveyPending + mc.drops.surveyPending}</>}
              lines={[
                "สำเร็จ = ลูกค้า CONFIRMED หรือ AUTO_CONFIRMED",
                `KPI #3 เดิม (AE ส่งแล้ว ÷ ประชุมสำเร็จ) = ${fmt(oldKpi3, "%")}`,
              ]}
            />
            <KpiTile
              label="พึงพอใจรวม (Q7)"
              value={<>{fmtMedian(q7)} <small>median /10</small></>}
              sub={<>{deltaText(q7M, q7Prev)} · ≤6: {q7le6} ราย ({q7le6M > q7le6Prev ? `▲${q7le6M - q7le6Prev}` : q7le6M < q7le6Prev ? `▼${q7le6Prev - q7le6M}` : "เท่าเดิม"})</>}
              lines={[
                `median ORM ${fmtMedian(median(surveys.filter((r) => r["question"] === "Q7" && r.service_line === "ORM").map((r) => Number(r["score"]))))} · Marcom ${fmtMedian(median(surveys.filter((r) => r["question"] === "Q7" && r.service_line === "Marcom").map((r) => Number(r["score"]))))}`,
                `≤6: ${q7le6} ราย`,
              ]}
            />
            <KpiTile
              label="ธงแดงเปิดค้าง"
              value={openFlags.length}
              sub={<>ใหม่ {newFlags} · ปิดแล้ว {closedFlags} · ค้างนานสุด {oldest} วัน</>}
              lines={[
                ...FLAG_GROUPS.map((g) => `${g.title}: ${openFlags.filter((r) => r["group_name"] === g.key).length}`),
                "งาน Coaching ค้างดูที่แท็บ ติดตามงานผู้ให้บริการ",
              ]}
            />
          </div>

          <div className="mt-section-title">
            <h2>A · นัดครบไหม</h2>
            <p>funnel · Tier A ค้าง · completion และ workload รายหน่วย</p>
          </div>
          <FunnelCard cards={cards} cardsB={cardsB} now={now} months={monthsA} compare={filter.compare} />
          <TierAPending rows={pendingRows} now={now} />
          <OwnerCards
            rows={ownerRows}
            rowsB={ownerRowsB}
            lens={effectiveLens}
            setLens={setLens}
            months={monthsA}
            now={now}
            compare={filter.compare}
            service={filter.service}
          />

          <div className="mt-section-title">
            <h2>B · ประชุมแล้วได้คุณภาพไหม</h2>
            <p>คะแนน survey รายข้อ · ธงแดง / ธงเหลือง</p>
          </div>
          <SurveySection
            surveys={surveys}
            curSurveys={surveysM}
            prevSurveys={surveysPrev}
            flags={flags}
            service={filter.service}
            compare={filter.compare}
            prevLabel={prevLabel}
          />
          <FlagBoard flags={flags} period={periodA} compare={filter.compare} periodB={periodB} service={filter.service} />
        </>
      )}

      <RubricRow />
      {demo && <p className="text-xs text-muted-foreground">DEMO · 30 ก.ย. 2026</p>}
    </div>
  );
}
