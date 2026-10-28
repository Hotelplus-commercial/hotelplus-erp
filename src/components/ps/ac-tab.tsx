/* R1.2 · Tab "ลูกหนี้ & ค่าใช้จ่ายรายสัญญา" (stored key: ac) — read-only Visual Standard cards over the
 * existing v_ac_* views + v_ac_contract_cost_monthly. Revenue cards ①②③ were removed (views kept).
 * No writes, no ticket buttons, no grade/collection logic — results only. */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Search } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Input } from "@/components/ui/input";
import { ChartHint, ChartSkeleton, DashCard } from "@/components/ps/dash-card";
import { summaryRules } from "@/lib/summaryRules";
import {
  COLLECTION_META,
  GRADE_META,
  bahtFull,
  bahtShort,
  debtorRows,
  monYY,
  sortDebtors,
  type CollectionStatus,
} from "@/lib/ac-revenue";
import {
  costLines,
  costSummary,
  gradeCustomers,
  latestCostMonth,
  shiftMonth,
  toCostRows,
  type CostLine,
  type GradeCustomer,
} from "@/lib/ac-contract-cost";
import { aeNameTh } from "@/lib/ps-glossary";
import { OPEN_STATUSES, STATUS_TH, SYSTEM_CREATOR, useTickets } from "@/lib/tickets-l0";
import type { PsReportRow } from "@/lib/ps-dashboard-types";
import { cn } from "@/lib/utils";

const num = (v: unknown) => Number(v ?? 0) || 0;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

type AcViews = Record<string, PsReportRow[]>;
export type AcTabProps = {
  views: AcViews | undefined;
  loading: boolean;
  error: boolean;
  service: "ALL" | "ORM" | "Marcom";
  compare: boolean;
  periodALabel?: string;
  demo?: boolean;
  /** Global Compare periods (A / B); §2.4 selected month = latest billed month in A, compare = latest in B. */
  periodA?: { from: string; to: string };
  periodB?: { from: string; to: string } | null;
  /** Render every list expanded (used by the forbidden-string render test). */
  openLists?: boolean;
};

/** AE display for every list in this tab (§2.5). */
export const aeLabel = (id: string | null | undefined) => (id ? aeNameTh(id) : "ยังไม่ระบุ AE");

/** BD-AC v2.2 §5 — where a shared card is mounted. Default "ac" reproduces this tab exactly; "bdac" only renumbers
 *  the title (⑨ ⑩ ⑪) for Tab BD-AC. Dates on these cards are already English (`Mon YY` / `D Mon`) in both places. */
export type AcCardContext = "ac" | "bdac";

/** Inputs of the shared debtor / grade cards, derived once from the AC tab props (same numbers wherever mounted). */
export function useAcCardModel({ views, service, periodA }: { views: AcTabProps["views"]; service: AcTabProps["service"]; periodA?: { from: string; to: string } | undefined }) {
  const navigate = useNavigate();
  const openHotel = () => navigate({ to: "/ac/hotel-profile" });

  const debtors = useMemo(() => views?.["v_ac_debtors"] ?? [], [views]);
  const breakdown = useMemo(() => views?.["v_ac_invoices_breakdown"] ?? [], [views]);
  const gradeDist = useMemo(() => views?.["v_ac_grade_distribution"] ?? [], [views]);
  const costRows = useMemo(() => toCostRows(views?.["v_ac_contract_cost_monthly"]), [views]);
  const svc = (r: PsReportRow) => service === "ALL" || String(r.service_line ?? "") === service || r.service_line == null;
  const gradePeriods = useMemo(
    () => [...new Set(gradeDist.filter(svc).map((r) => String(r.billing_period).slice(0, 7)))].sort(),
    [gradeDist, service], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const chip = gradePeriods.at(-1) ? monYY(gradePeriods.at(-1)) : "—";
  const prevChip = gradePeriods.at(-2) ? monYY(gradePeriods.at(-2)) : "—";
  const gradeMonth = latestCostMonth(costRows, periodA);
  const customers = useMemo(
    () => gradeCustomers(costRows.filter((r) => service === "ALL" || r.service === service), gradeMonth),
    [costRows, gradeMonth, service],
  );
  return { openHotel, debtors, breakdown, gradeDist, costRows, svc, chip, prevChip, customers };
}

export function AcTab({ views, loading, error, service, compare, demo, periodA, periodB, openLists = false }: AcTabProps) {
  const { openHotel, debtors, breakdown, gradeDist, costRows, svc, chip, prevChip, customers } = useAcCardModel({ views, service, periodA });

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลดรายงาน…</p>;
  if (error) return <p className="text-sm text-muted-foreground">อ่านรายงาน AC ไม่ได้ — ลองโหลดหน้าใหม่</p>;

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="ac-tab" data-demo={demo || undefined}>
      <DefinitionStrip />
      <SectionHead title="ลูกหนี้ & การเก็บเงิน" desc="ค้างเท่าไร · อยู่ขั้นไหน · ใครจ่ายช้า · ต้องตามใคร" />
      <DebtorCard initialOpen={openLists} views={views} svc={svc} debtors={debtors.filter(svc)} breakdown={breakdown.filter(svc)} compare={compare} openHotel={openHotel} />
      <div className="ac-row2">
        <GradeCard gradeDist={gradeDist.filter(svc)} chip={chip} prevChip={prevChip} compare={compare} customers={customers} initialOpen={openLists} />
        <SystemFeeMock />
      </div>
      <SectionHead title="ค่าใช้จ่ายรายสัญญา" desc="แต่ละสัญญาบริการจ่ายเราเดือนละเท่าไร · ใช้เตรียมคุยราคาตอนต่อสัญญา · ไม่ใช่การจัดอันดับ" />
      <ContractCostCard initialOpen={openLists} rows={costRows} service={service} compare={compare} periodA={periodA} periodB={periodB ?? null} />
    </div>
  );
}

/* ---------- definition strip + section headers ---------- */

function DefinitionStrip() {
  return (
    <section className="dash-card ac-def-strip">
      <div className="ac-def-row">
        <span className="ac-def-label">เกรดการชำระ</span>
        {(["A", "B", "C", "D"] as const).map((g) => (
          <span key={g} className={cn("ac-pill", GRADE_META[g]!.pill)}>
            <b>{g}</b> {GRADE_META[g]!.desc}
          </span>
        ))}
        <span className="ac-def-note">· คิดเฉพาะบิลรายเดือน (RECURRING) · คำนวณที่ AC App</span>
      </div>
      <div className="ac-def-row">
        <span className="ac-def-label">Collection</span>
        {(["OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((s, i) => (
          <span key={s} className="ac-def-chain">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <span className={cn("ac-pill", COLLECTION_META[s].pill)}>
              {COLLECTION_META[s].label}
              {s === "OVERDUE" && " · เกรด C"}
              {s === "SUSPENDED" && " · เกรด D"}
            </span>
          </span>
        ))}
        <span className="ac-def-note">· พักบริการ (PAUSED) ไม่ใช่ลูกหนี้ · แยกกล่อง</span>
      </div>
      <p className="ac-def-caption">
        หน่วยนับ: เกรดและ collection นับราย customer (1 customer อาจมีหลายโรงแรม) · ค่าใช้จ่ายรายสัญญา
        นับรายสัญญาบริการ · ทั้ง tab อ่านอย่างเดียว คลิกชื่อเปิด AC App
      </p>
    </section>
  );
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="ac-section-head">
      <h2>{title}</h2>
      <p>{desc}</p>
    </header>
  );
}

const TimeChip = ({ label }: { label: string }) => <span className="ac-time-chip">{label}</span>;
const dMMM = (iso: string | null | undefined) =>
  iso ? new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }) : "—";

/* ---------- ลูกหนี้ที่ต้องติดตาม (merged ④ + ⑤ + ⑧) ---------- */

export function DebtorCard({
  context = "ac",
  initialOpen = false,
  views,
  svc,
  debtors,
  breakdown,
  compare,
  openHotel,
}: {
  context?: AcCardContext;
  initialOpen?: boolean;
  views: AcViews | undefined;
  svc: (r: PsReportRow) => boolean;
  debtors: PsReportRow[];
  breakdown: PsReportRow[];
  compare: boolean;
  openHotel: () => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [status, setStatus] = useState<CollectionStatus | "ALL">("ALL");
  const tickets = useTickets();
  const list = useMemo(() => sortDebtors(debtorRows(debtors)), [debtors]);
  const aeOf = useMemo(
    () => new Map(debtors.map((r) => [`${r.hotel_id}|${r.service_line}`, r["ae_owner_id"] == null ? null : String(r["ae_owner_id"])])),
    [debtors],
  );
  const openTickets = tickets.filter((t) => t.type === "GRADE_RISK" && OPEN_STATUSES.includes(t.status));
  const ticketOf = (hotel_id: string) => openTickets.find((t) => t.subject_ref.hotel_id === hotel_id);
  const lastBotRun = tickets
    .filter((t) => t.created_by === SYSTEM_CREATOR)
    .map((t) => t.payload.generated_round ?? t.created_at.slice(0, 10))
    .sort()
    .at(-1);
  const active = list.filter((r) => r.status !== "WRITTEN_OFF" && r.status !== "PAUSED");
  const wo = list.filter((r) => r.status === "WRITTEN_OFF");
  const paused = list.filter((r) => r.status === "PAUSED");
  const notPaused = list.filter((r) => r.status !== "PAUSED");
  const shown = status === "ALL" ? notPaused : list.filter((r) => r.status === status);
  const counts = (s: CollectionStatus) => list.filter((r) => r.status === s).length;
  const total = active.reduce((s, r) => s + r.outstanding, 0);
  const legalRows = list.filter((r) => r.status === "LEGAL");
  const gradeD = list.filter((r) => r.grade === "D" && r.status !== "WRITTEN_OFF");
  const dWithTicket = gradeD.filter((r) => ticketOf(r.hotel_id)).length;
  // Old ④ (outstanding incl. not-yet-due) and ⑤ (stage aggregates) values — moved into ⓘ, unchanged.
  const outstanding = breakdown.reduce((s, r) => s + num(r["outstanding"]), 0);
  const invCount = breakdown.reduce((s, r) => s + num(r["outstanding_count"]), 0);
  const collected = breakdown.reduce((s, r) => s + num(r["collected_count"]), 0);
  const notdueN = breakdown.reduce((s, r) => s + num(r["notdue_count"]), 0);
  const notdueAmt = breakdown.reduce((s, r) => s + num(r["notdue_amount"]), 0);
  const customers = new Set(debtors.map((r) => String(r["customer_id"] ?? ""))).size;
  const groups = (["ORM", "Marcom"] as const).flatMap((line) =>
    ([["EXISTING", "ลูกค้าเดิม"], ["NEW", "ลูกค้าใหม่"]] as const).map(([seg, label]) => {
      const rows = breakdown.filter((r) => r["service_line"] === line && r["customer_segment"] === seg);
      return `${line} · ${label} ${bahtFull(rows.reduce((s, r) => s + num(r["outstanding"]), 0))} (${rows.reduce((s, r) => s + num(r["outstanding_count"]), 0)} ใบ)`;
    }),
  );
  const agg = (key: string) => (views?.[key] ?? []).filter(svc);
  const stageLine = (["v_ac_overdue", "v_ac_suspended", "v_ac_legal"] as const)
    .map((k, i) => {
      const rows = agg(k);
      const label = COLLECTION_META[(["OVERDUE", "SUSPENDED", "LEGAL"] as const)[i]!].label;
      return `${label} ${rows.reduce((s, r) => s + num(r["customer_count"]), 0)} ราย ${bahtFull(rows.reduce((s, r) => s + num(r["outstanding"]), 0))}`;
    })
    .join(" · ");
  const empty = !list.length;
  return (
    <DashCard
      title={
        <>
          {context === "bdac" ? "⑪ " : ""}ลูกหนี้ที่ต้องติดตาม <TimeChip label="สถานะปัจจุบัน" />
        </>
      }
      info={{
        source: "AC App · ใบแจ้งหนี้ (v_ac_debtors · v_ac_overdue · v_ac_suspended · v_ac_legal)",
        count: "นับราย customer · เฉพาะใบที่เลยวันครบกำหนด · สถานะปัจจุบัน (ไม่ขึ้นกับช่วงวันที่ที่เลือก) · ตัดสูญและพักบริการไม่รวมในยอด",
        read: `ลำดับขั้น: ส่งฟ้อง → ปิดระบบ → ค้างชำระ → ตัดสูญ · ${(["OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((s) => `${COLLECTION_META[s].label}: ${COLLECTION_META[s].rule}`).join(" · ")}`,
        extra: [
          { label: "ยอดค้างทั้งหมด (รวมยังไม่ถึงกำหนด)", body: `${bahtFull(outstanding)} · ${invCount} ใบ · ${customers} ราย · เก็บแล้ว ${collected} / ${collected + invCount} ใบ (${pct(collected, collected + invCount)}%)` },
          { label: "แยกบริการ × กลุ่มลูกค้า", body: groups.join(" · ") },
          { label: "ตามขั้น collection", body: stageLine },
          { label: "ยังไม่ถึงกำหนด (ไม่นับ)", body: `${notdueN} ใบ · ${bahtFull(notdueAmt)}` },
        ],
      }}
      question="ตอนนี้มีเงินค้างเท่าไร และอยู่ขั้นไหน?"
      answer={empty ? "—" : bahtShort(total)}
      answerTone="neutral"
      answerSub={empty ? undefined : `${active.length} ราย · ไม่รวมตัดสูญ`}
      noteKey="followup"
      noteNamespace="ac"
      noteLines={
        empty
          ? summaryRules({ metric: "ลูกหนี้ติดตาม", empty: true }, ["R-EMPTY"])
          : [
              `ส่งฟ้อง ${legalRows.length} ราย รวม ${bahtFull(legalRows.reduce((s, r) => s + r.outstanding, 0))}`,
              `ticket เกรดการชำระเงินเสี่ยง เปิดอยู่ ${dWithTicket} จาก ${gradeD.length} รายเกรด D`,
            ]
      }
      howToRead="ชิปแสดงจำนวนรายตามขั้น · กดชิปเพื่อกรองรายชื่อ · สถานะปัจจุบัน ไม่เปลี่ยนตามช่วงเวลา"
    >
      {empty ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-chip-row" role="group" aria-label="สถานะ collection">
            {(["OVERDUE", "SUSPENDED", "LEGAL"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                className={cn("ac-filter-chip", status === s && "ac-filter-chip-on")}
                onClick={() => {
                  setStatus(status === s ? "ALL" : s);
                  setOpen(true);
                }}
              >
                {COLLECTION_META[s].label} {counts(s)}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={status === "WRITTEN_OFF"}
              className={cn("ac-filter-chip text-muted-foreground", status === "WRITTEN_OFF" && "ac-filter-chip-on")}
              onClick={() => {
                setStatus(status === "WRITTEN_OFF" ? "ALL" : "WRITTEN_OFF");
                setOpen(true);
              }}
            >
              ตัดสูญ {wo.length} · ไม่รวมในยอด
            </button>
            <button
              type="button"
              aria-pressed={status === "PAUSED"}
              className={cn("ac-filter-chip text-muted-foreground", status === "PAUSED" && "ac-filter-chip-on")}
              onClick={() => {
                setStatus(status === "PAUSED" ? "ALL" : "PAUSED");
                setOpen(true);
              }}
            >
              พักบริการ {paused.length} · ไม่ใช่ลูกหนี้ปัญหา
            </button>
          </div>
          <button type="button" className="ac-link text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            ดูรายชื่อ {notPaused.length} ราย {open ? "▴" : "▾"}
          </button>
          {open && (
            <>
              <div className="ac-table-wrap mt-3" style={{ maxHeight: 520 }}>
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>โรงแรม</th>
                      <th>ลูกค้า</th>
                      <th>บริการ</th>
                      <th>AE ผู้ดูแล</th>
                      <th className="text-right">฿ ค้าง</th>
                      <th className="text-right">ใบ</th>
                      <th>ค้างมาแล้ว (เดือน)</th>
                      <th>เกรด</th>
                      <th>สถานะ</th>
                      <th>ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const t = ticketOf(r.hotel_id);
                      const ae = aeOf.get(`${r.hotel_id}|${r.service_line}`) ?? null;
                      return (
                        <tr key={`${r.hotel_id}-${r.service_line}`}>
                          <td>
                            <button type="button" className="ac-link" onClick={openHotel}>
                              {r.hotel_name}
                            </button>
                          </td>
                          <td className="text-xs">{r.customer_name}</td>
                          <td>
                            <span className={cn("ac-pill", r.service_line === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>{r.service_line}</span>
                          </td>
                          <td>
                            <span className={cn(!ae && "text-dash-watch")}>{aeLabel(ae)}</span>
                            {r.caretaker && <div className="text-xs text-muted-foreground">{r.caretaker}</div>}
                          </td>
                          <td className="text-right tabular-nums">{bahtFull(r.outstanding)}</td>
                          <td className="text-right tabular-nums">{r.invoice_count}</td>
                          <td className="tabular-nums">{r.overdue_months}</td>
                          <td>
                            <span className={cn("ac-pill", GRADE_META[r.grade]?.pill ?? "ac-pill-neutral")}>{r.grade}</span>
                          </td>
                          <td>
                            <span className={cn("ac-pill", COLLECTION_META[r.status].pill)}>{COLLECTION_META[r.status].label}</span>
                          </td>
                          <td>
                            {t ? (
                              <span className="ac-pill ac-pill-svc-orm">
                                #TKT-{t.ticket_id.slice(-4)} · {STATUS_TH[t.status]}
                              </span>
                            ) : r.grade === "D" && r.status !== "WRITTEN_OFF" ? (
                              <span className="ac-pill ac-pill-watch">
                                ยังไม่มี ticket · {aeLabel(ae)} · ตรวจล่าสุด {dMMM(lastBotRun)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="ac-footnote">
                ไม่รวมใบที่ยังไม่ถึงกำหนด ({notdueN} ใบ · {bahtFull(notdueAmt)}) · เรียง ส่งฟ้อง → ปิดระบบ → ค้างชำระ →
                ตัดสูญ แล้วตามยอด ฿ · ticket อ่านจากระบบ Ticket อย่างเดียว
              </p>
            </>
          )}
          {compare && <p className="ac-footnote">การ์ดนี้แสดงสถานะปัจจุบัน จึงไม่มี Compare A/B</p>}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ค่าใช้จ่ายรายสัญญา (§2.4) ---------- */

const arrow = (d: number | null) =>
  d == null ? <span className="text-muted-foreground">—</span> : d === 0 ? <span className="text-muted-foreground">เท่าเดิม</span> : (
    <span className={d > 0 ? "text-dash-good" : "text-dash-watch"}>
      {d > 0 ? "▲" : "▼"} {bahtFull(Math.abs(d))}
    </span>
  );

function ContractCostCard({
  initialOpen = false,
  rows,
  service,
  compare,
  periodA,
  periodB,
}: {
  initialOpen?: boolean;
  rows: ReturnType<typeof toCostRows>;
  service: "ALL" | "ORM" | "Marcom";
  compare: boolean;
  periodA?: { from: string; to: string } | undefined;
  periodB: { from: string; to: string } | null;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [svcFilter, setSvcFilter] = useState<"ALL" | "ORM" | "Marcom">("ALL");
  const [ae, setAe] = useState("ALL");
  const [q, setQ] = useState("");
  const month = latestCostMonth(rows, periodA);
  const cmp = month ? (compare && periodB ? latestCostMonth(rows, periodB) : shiftMonth(month, -1)) : null;
  const lines = useMemo(() => (month ? costLines(rows, month, cmp) : []), [rows, month, cmp]);
  const scoped = lines.filter((l) => service === "ALL" || l.service === service);
  const sum = costSummary(scoped);
  const aes = [...new Set(scoped.map((l) => l.ae_owner_id ?? ""))].sort();
  const shown = scoped.filter(
    (l) =>
      (svcFilter === "ALL" || l.service === svcFilter) &&
      (ae === "ALL" || (l.ae_owner_id ?? "") === ae) &&
      (!q.trim() || l.hotel_name.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const empty = !scoped.length;
  return (
    <DashCard
      title={
        <>
          ค่าใช้จ่ายรายสัญญา <TimeChip label={month ? monYY(month) : "—"} />
        </>
      }
      info={{
        source: "AC App · บิลรายเดือน (v_ac_contract_cost_monthly)",
        count: "นับรายสัญญาบริการ (1 สัญญาที่มี ORM + Marcom = 2 แถว) · ไม่นับค่า setup และงาน one-time · ยอดหลัง VAT/WHT",
        formula: "อายุสัญญา (เดือน) = จำนวนเดือนเต็มตั้งแต่วันเริ่มสัญญาถึงสิ้นเดือนที่เลือก · เฉลี่ยต่อเดือนตลอดอายุ = ยอดบิลรวมของสัญญาบริการนี้ตั้งแต่เริ่ม ÷ จำนวนเดือนที่มีบิล",
        read: "ป้าย Guarantee = เดือนนั้นเรียกเก็บค่าการันตีแทนค่าคอม · ป้าย บิลรวม = บิลแยกบริการไม่ได้ จึงแสดงใต้ทั้งสองบริการ · เรียงตามชื่อโรงแรมเท่านั้น ไม่ใช่การจัดอันดับ",
      }}
      question="แต่ละสัญญาจ่ายเราเดือนละเท่าไร เทียบกับก่อนหน้า?"
      answer={empty ? "—" : `${sum.billed} สัญญา`}
      answerTone="accent"
      answerSub={
        empty ? undefined : `ค่าใช้จ่ายขึ้น ${sum.up} · เท่าเดิม ${sum.same} · ลด ${sum.down}${cmp ? ` · เทียบ ${monYY(cmp)}` : ""}`
      }
      noteKey="contract-cost"
      noteNamespace="ac"
      noteLines={
        empty
          ? summaryRules({ metric: "ค่าใช้จ่ายรายสัญญา", empty: true }, ["R-EMPTY"])
          : [
              `สัญญาบริการที่มีบิล ${monYY(month)} ${sum.billed} สัญญา`,
              ...(sum.noPrev ? [`ไม่มีบิลเดือนเทียบ ${sum.noPrev} สัญญา (ไม่นับในขึ้น / เท่าเดิม / ลด)`] : []),
            ]
      }
      howToRead="เปิดรายสัญญาเพื่อดูยอดเดือนที่เลือกเทียบเดือนก่อนและปีก่อน · ไม่มีคอลัมน์ค่าระบบในรอบนี้"
    >
      {empty ? (
        <ChartSkeleton />
      ) : (
        <>
          <button type="button" className="ac-link text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            ดูรายสัญญา {open ? "▴" : "▾"}
          </button>
          {open && (
            <>
              <div className="ac-chip-row mt-3">
                {(["ALL", "ORM", "Marcom"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={svcFilter === s} className={cn("ac-filter-chip", svcFilter === s && "ac-filter-chip-on")} onClick={() => setSvcFilter(s)}>
                    {s === "ALL" ? "ทุกบริการ" : s}
                  </button>
                ))}
                <select aria-label="AE ผู้ดูแล" className="ac-filter-chip" value={ae} onChange={(e) => setAe(e.target.value)}>
                  <option value="ALL">AE: ทั้งหมด</option>
                  {aes.map((a) => (
                    <option key={a} value={a}>
                      {aeLabel(a || null)}
                    </option>
                  ))}
                </select>
                <span className="relative">
                  <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="ค้นหาโรงแรม" className="h-8 w-48 pl-7 text-xs" placeholder="ค้นหาโรงแรม" value={q} onChange={(e) => setQ(e.target.value)} />
                </span>
              </div>
              <div className="ac-table-wrap" style={{ maxHeight: 560 }}>
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>สัญญา</th>
                      <th>AE ผู้ดูแล</th>
                      <th className="text-right">อายุสัญญา (เดือน)</th>
                      <th className="text-right">เฉลี่ยต่อเดือนตลอดอายุ</th>
                      <th className="text-right">ค่าบริการ · {month ? monYY(month) : "—"}</th>
                      <th className="text-right">ค่าคอม · {month ? monYY(month) : "—"}</th>
                      <th>เทียบ{compare && periodB ? ` ${cmp ? monYY(cmp) : "B"}` : "เดือนก่อน"}</th>
                      <th>เทียบเดือนเดียวกันปีก่อน</th>
                      <th>เกรดการชำระ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((l: CostLine) => (
                      <tr key={l.key}>
                        <td>
                          <div className="font-medium">{l.hotel_name}</div>
                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            {l.contract_id}
                            <span className={cn("ac-pill", l.service === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>{l.service}</span>
                            {l.combined_bill && <span className="ac-pill ac-pill-neutral">บิลรวม</span>}
                          </div>
                        </td>
                        <td>
                          <span className={cn(!l.ae_owner_id && "text-dash-watch")}>{aeLabel(l.ae_owner_id)}</span>
                          {l.caretaker && <div className="text-xs text-muted-foreground">{l.caretaker}</div>}
                        </td>
                        <td className="text-right tabular-nums">{l.age_months ?? "—"}</td>
                        <td className="text-right tabular-nums">{l.lifetime_monthly == null ? "—" : bahtFull(l.lifetime_monthly)}</td>
                        <td className="text-right tabular-nums">{l.fee == null ? "—" : bahtFull(l.fee)}</td>
                        <td className="text-right tabular-nums">
                          {l.commission == null ? "—" : bahtFull(l.commission)}
                          {l.guarantee && <span className="ac-pill ac-pill-watch ml-1">Guarantee</span>}
                        </td>
                        <td className="tabular-nums">{arrow(l.delta_prev)}</td>
                        <td className="tabular-nums">{arrow(l.delta_yoy)}</td>
                        <td>
                          {l.grade ? <span className={cn("ac-pill", GRADE_META[l.grade]?.pill ?? "ac-pill-neutral")}>{l.grade}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ac-footnote">
                {shown.length} สัญญาบริการ · เรียงตามชื่อโรงแรม · บิลรวม {sum.combined} แถว · ยอดหลัง VAT/WHT · ไม่รวมค่า setup / งาน one-time
              </p>
            </>
          )}
        </>
      )}
    </DashCard>
  );
}

/* ---------- ⑥ expandable customer list (§2.3) ---------- */

function GradeList({ customers, initialOpen = false }: { customers: GradeCustomer[]; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [grade, setGrade] = useState<"A" | "B" | "C" | "D">("D");
  const by = (g: string) => customers.filter((c) => c.grade_latest === g);
  return (
    <div className="mt-3 border-t pt-3">
      <button type="button" className="ac-link text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        ดูรายชื่อตามเกรด {open ? "▴" : "▾"}
      </button>
      {open && (
        <>
          <div className="ac-chip-row mt-2" role="tablist" aria-label="เกรด">
            {(["A", "B", "C", "D"] as const).map((g) => (
              <button key={g} type="button" role="tab" aria-selected={grade === g} className={cn("ac-filter-chip", grade === g && "ac-filter-chip-on")} onClick={() => setGrade(g)}>
                {g} · {by(g).length}
              </button>
            ))}
          </div>
          {by(grade).length ? (
            <div className="ac-table-wrap" style={{ maxHeight: 360 }}>
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>ลูกค้า</th>
                    <th>เกรดล่าสุด</th>
                    <th>เกรดแย่สุดใน 6 งวด</th>
                    <th>สัญญาที่ถืออยู่</th>
                    <th>AE ผู้ดูแล</th>
                  </tr>
                </thead>
                <tbody>
                  {by(grade).map((c) => (
                    <tr key={c.customer_id}>
                      <td className="font-medium">{c.customer_name}</td>
                      <td>
                        <span className={cn("ac-pill", GRADE_META[c.grade_latest]?.pill ?? "ac-pill-neutral")}>{c.grade_latest}</span>
                      </td>
                      <td>{c.grade_worst6 ? <span className={cn("ac-pill", GRADE_META[c.grade_worst6]?.pill ?? "ac-pill-neutral")}>{c.grade_worst6}</span> : "—"}</td>
                      <td className="text-xs">
                        {c.contracts.map((x) => (
                          <div key={`${x.contract_id}-${x.service}`}>
                            {x.hotel_name} · {x.service}
                          </div>
                        ))}
                      </td>
                      <td className="text-xs">{c.ae.length ? c.ae.map((a) => aeLabel(a)).join(", ") : <span className="text-dash-watch">{aeLabel(null)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ac-footnote">ไม่มีลูกค้าเกรด {grade} ในงวดนี้</p>
          )}
          <p className="ac-footnote">เกรดคำนวณราย customer ที่ AC App (ไม่คำนวณใหม่) · เรียงตามชื่อลูกค้า · แสดงลูกค้าที่มีสัญญาบริการใช้งาน</p>
        </>
      )}
    </div>
  );
}

/* ---------- ⑥ payment grades ---------- */

export function GradeCard({
  context = "ac",
  gradeDist,
  chip,
  prevChip,
  compare,
  customers,
  initialOpen = false,
}: {
  context?: AcCardContext;
  gradeDist: PsReportRow[];
  chip: string;
  prevChip: string;
  compare: boolean;
  customers: GradeCustomer[];
  initialOpen?: boolean;
}) {
  const [hoverGrade, setHoverGrade] = useState<string | null>(null);
  const periods = useMemo(
    () => [...new Set(gradeDist.map((r) => String(r.billing_period).slice(0, 7)))].sort(),
    [gradeDist],
  );
  const latest = periods.at(-1) ?? null;
  const prev = periods.at(-2) ?? null;
  const byPeriod = (p: string | null) =>
    (["A", "B", "C", "D"] as const).map((g) => ({
      g,
      n: gradeDist
        .filter((r) => String(r.billing_period).slice(0, 7) === p && r.grade === g)
        .reduce((s, r) => s + num(r['customer_count']), 0),
    }));
  const cur = byPeriod(latest);
  const prv = byPeriod(prev);
  const total = cur.reduce((s, x) => s + x.n, 0);
  const pTotal = prv.reduce((s, x) => s + x.n, 0);
  const ab = pct(cur[0]!.n + cur[1]!.n, total);
  const abPrev = pTotal ? pct(prv[0]!.n + prv[1]!.n, pTotal) : null;
  const dCount = cur[3]!.n;
  const last6 = periods.slice(-6);
  const hover = hoverGrade ? cur.find((x) => x.g === hoverGrade) : null;
  return (
    <DashCard
      title={
        <>
          {context === "bdac" ? "⑨" : "⑥"} เกรดการชำระ A–D <TimeChip label={chip} />
        </>
      }
      question="ลูกค้าจ่ายตรงเวลาแค่ไหน? (ราย customer)"
      answer={total ? `${ab}%` : "—"}
      answerTone="accent"
      answerSub={
        total
          ? compare && abPrev != null
            ? `A ${ab}% · B ${abPrev}% · Δ ${ab - abPrev >= 0 ? "▲ +" : "▼ "}${ab - abPrev} จุด`
            : `${abPrev != null ? `▲ +${ab - abPrev} จุด จาก ${prevChip} · ` : ""}เกรด A+B · ${cur[0]!.n + cur[1]!.n} / ${total} ราย`
          : undefined
      }
      noteKey="grades"
      noteNamespace="ac"
      noteLines={
        total
          ? [
              ...(abPrev != null && ab !== abPrev
                ? [`เกรด A+B ${ab > abPrev ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(ab - abPrev)} จุด จาก ${prevChip}`]
                : []),
              `เกรด D ${dCount} จาก ${total} ราย (${pct(dCount, total)}%)`,
            ]
          : summaryRules({ metric: "เกรด", empty: true }, ["R-EMPTY"])
      }
      howToRead="โดนัท = เกรดล่าสุดต่อ customer · แท่งซ้อน = 6 งวดล่าสุด · งวดที่ยังไม่ปิดจะจางและนับใบค้างเป็น C ไว้ก่อน"
    >
      {!total ? (
        <ChartSkeleton />
      ) : (
        <>
          <div className="ac-grade-wrap">
            <div className="ac-donut">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={cur.filter((x) => x.n)}
                    dataKey="n"
                    nameKey="g"
                    innerRadius={52}
                    outerRadius={76}
                    onMouseEnter={(d) => setHoverGrade(String((d as { g?: string }).g ?? ""))}
                    onMouseLeave={() => setHoverGrade(null)}
                  >
                    {cur.filter((x) => x.n).map((x) => (
                      <Cell key={x.g} fill={GRADE_META[x.g]!.bar} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="ac-donut-center">
                {hover ? (
                  <>
                    <b>{pct(hover.n, total)}%</b>
                    <span>
                      {hover.g} · {hover.n} จาก {total} ราย
                    </span>
                  </>
                ) : (
                  <>
                    <b>{total}</b>
                    <span>ราย customer</span>
                  </>
                )}
              </div>
            </div>
            <ul className="ac-grade-legend">
              {cur.map((x) => (
                <li
                  key={x.g}
                  onMouseEnter={() => setHoverGrade(x.g)}
                  onMouseLeave={() => setHoverGrade(null)}
                >
                  <span className="ac-dot" style={{ background: GRADE_META[x.g]!.bar }} />
                  <b>{x.g}</b> {x.n} ราย · {pct(x.n, total)}%
                </li>
              ))}
            </ul>
          </div>
          {last6.length > 1 && (
            <>
              <div className="ac-periods">
                {last6.map((p) => {
                  const rows = byPeriod(p);
                  const t = rows.reduce((s, x) => s + x.n, 0);
                  const open = p === latest;
                  return (
                    <ChartHint
                      key={p}
                      header={`${monYY(p)} · A+B ${pct(rows[0]!.n + rows[1]!.n, t)}%`}
                      lines={[`A ${rows[0]!.n} · B ${rows[1]!.n} · C ${rows[2]!.n} · D ${rows[3]!.n}`, `รวม ${t} ราย`]}
                    >
                      <div className={cn("ac-period-col", open && "ac-period-open")} tabIndex={0} role="button" aria-label={monYY(p)}>
                        <span className="ac-period-ab">{pct(rows[0]!.n + rows[1]!.n, t)}%</span>
                        <div className="ac-period-stack">
                          {(["D", "C", "B", "A"] as const).map((g) => {
                            const n = rows.find((x) => x.g === g)!.n;
                            return n ? (
                              <div key={g} style={{ height: `${(n / t) * 100}%`, background: GRADE_META[g]!.bar }} />
                            ) : null;
                          })}
                        </div>
                        <span className="ac-period-label">{monYY(p)}</span>
                      </div>
                    </ChartHint>
                  );
                })}
              </div>
              <p className="ac-footnote">
                {chip} ยังไม่ปิดงวด: ใบที่ยังค้างนับเป็น C ไว้ก่อน และเป็น D ได้หลัง {dAfter(chip)}
              </p>
            </>
          )}
          <GradeList customers={customers} initialOpen={initialOpen} />
        </>
      )}
    </DashCard>
  );
}

/* ---------- ⑦ ORM system fee — greyed mock ---------- */

export function SystemFeeMock({ context = "ac" }: { context?: AcCardContext } = {}) {
  const no = context === "bdac" ? "⑩" : "⑦";
  const rows = [
    ["Sala Riverside Hotel", "ORM", 4200, "15 Sep 26", "ชำระแล้ว"],
    ["Baan Talay Resort", "ORM", 3800, "15 Sep 26", "ชำระแล้ว"],
    ["The Bay Hotel", "ORM", 2900, "15 Sep 26", "รอชำระ"],
    ["Grand Hills Resort", "ORM", 3100, "15 Sep 26", "รอชำระ"],
    ["Chaba Grand", "ORM", 4500, "15 Aug 26", "เลยกำหนด"],
  ];
  return (
    <section className="dash-card ac-mock-wrap" aria-label={`${no} ค่าระบบ ORM · รอ email ingestion`}>
      <div className="ac-mock" aria-hidden="true">
        <header className="dash-card-header">
          <div className="min-w-0">
            <h2>{no} ค่าระบบ ORM</h2>
            <p className="dash-question">ค่าระบบเดือนนี้เท่าไร โรงแรมไหนยังไม่จ่าย?</p>
          </div>
          <div className="dash-answer-block">
            <div className="dash-answer text-primary">฿186,400</div>
            <div className="dash-answer-sub">62 โรงแรม</div>
          </div>
        </header>
        <div className="ac-answer-strip">
          {[
            ["ค่าระบบงวดนี้", "฿186,400"],
            ["ชำระแล้ว", "฿141,200"],
            ["รอชำระ", "฿32,800"],
            ["เลยกำหนด", "฿12,400"],
          ].map(([l, v]) => (
            <div key={l} className="ac-stat-box">
              <p className="ac-stat-label">{l}</p>
              <p className="ac-stat-value">{v}</p>
            </div>
          ))}
        </div>
        <div className="ac-topbar">
          <div className="ac-topbar-collected" style={{ width: "76%" }} />
          <div className="ac-topbar-outstanding" style={{ width: "17%" }} />
          <div style={{ width: "7%", background: "#C8553D" }} />
        </div>
        <table className="ac-table mt-3">
          <thead>
            <tr>
              <th>โรงแรม</th>
              <th>ระบบ</th>
              <th className="text-right">ยอด</th>
              <th>ครบกำหนด</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r[0])}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td className="text-right tabular-nums">฿{Number(r[2]).toLocaleString("th-TH")}</td>
                <td>{r[3]}</td>
                <td>{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ac-mock-overlay">
        <div className="ac-mock-label">
          <Lock className="size-5 shrink-0" />
          <div><b>{no} ค่าระบบ ORM · รอ email ingestion</b>
          <span>ตัวอย่างหน้าตาเท่านั้น · จะแสดงข้อมูลจริงเมื่อเชื่อมแหล่งข้อมูลแล้ว</span></div>
        </div>
      </div>
    </section>
  );
}

/** Text only: open period M → D after the 15th of M+2 (grade engine rule). */
function dAfter(chip: string): string {
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = /^([A-Za-z]{3}) (\d{2})$/.exec(chip.trim());
  if (!m || MON.indexOf(m[1]!) < 0) return "15 ของเดือน M+2";
  const idx = MON.indexOf(m[1]!) + 2;
  return `15 ${MON[idx % 12]} ${String((Number(m[2]) + Math.floor(idx / 12)) % 100).padStart(2, "0")}`;
}
