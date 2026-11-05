/* Debt Partner R1.1 — section "ลูกหนี้ & การเก็บเงิน": card ① เกรดการชำระ A–D (DP6–DP9) and card ② ลูกหนี้ที่ต้องติดตาม (DP10–DP14).
 * Read-only. Rules in src/lib/debt-cards.ts; DEMO in src/lib/debt-cards-demo.ts; live = CRM store (AC App data in this browser). */
import { useEffect, useMemo, useState } from "react";
import { DashCard, ChartSkeleton } from "@/components/ps/dash-card";
import { NowChip, useCardCompare } from "./compare-control";
import { useCrmOptional } from "@/lib/crm-store";
import { collectionStatus, outstandingOf } from "@/lib/ac-v2-engine";
import { contractStateOn } from "@/lib/contract-state";
import { useTickets } from "@/lib/tickets-l0";
import { GRADE_META, COLLECTION_META, monYY } from "@/lib/ac-revenue";
import { DEMO_DAY } from "@/lib/demo-session";
import {
  DEBT_TH, debtFilter, debtSummary, deltaLine, gradeCounts, gradeList, paidHeadline, pct1, ticketCells, ticketStrip, trend,
  type DebtRowR, type DebtStatus, type Grade, type GradeRowR, type PaidInv, type Svc, type TicketLite,
} from "@/lib/debt-cards";
import { demoDebtRows, demoDebtTickets, demoGradeAt, demoGradeRows, demoPaidInvoices, onDemoInvoiceChange } from "@/lib/debt-cards-demo";
import { cn } from "@/lib/utils";

const thb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;
const GRADES: Grade[] = ["A", "B", "C", "D"];
const STATUS_KEY: Record<DebtStatus, keyof typeof COLLECTION_META> = { LEGAL: "LEGAL", SUSPENDED: "SUSPENDED", OVERDUE: "OVERDUE", WRITTEN_OFF: "WRITTEN_OFF", PAUSED: "PAUSED" };
const hhmm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/** Refresh on tab focus (DP7): bumps a tick and the "อัปเดตจาก AC App" time. */
function useFocusTick() {
  const [s, set] = useState({ tick: 0, at: new Date() });
  useEffect(() => {
    const bump = () => { if (typeof document === "undefined" || document.visibilityState !== "hidden") set((x) => ({ tick: x.tick + 1, at: new Date() })); };
    window.addEventListener("focus", bump); document.addEventListener("visibilitychange", bump);
    const off = onDemoInvoiceChange(() => {}); // DEMO changes are picked up on the next focus, like live
    return () => { window.removeEventListener("focus", bump); document.removeEventListener("visibilitychange", bump); off(); };
  }, []);
  return s;
}

type Model = { inv: PaidInv[]; grades: GradeRowR[]; gradeAt: (id: string, p: string) => Grade | null; debts: DebtRowR[]; tickets: TicketLite[] };
type Crm = NonNullable<ReturnType<typeof useCrmOptional>>;

const termEnd = (start: string, months: number) => { const d = new Date(`${start.slice(0, 10)}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + months); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
/** Live model from the CRM store: recurring invoices per service contract; grade per customer (AC App); collection status per customer. */
export function liveDebtModel(crm: Crm | null, today: string): Omit<Model, "tickets"> {
  if (!crm) return { inv: [], grades: [], gradeAt: () => null, debts: [] };
  const contracts = new Map(crm.contracts.map((c) => [c.contract_id, c]));
  const svcOf = (i: (typeof crm.invoices)[number]): Svc => (i.service_line ?? (i.lines.some((l) => l.sku_snapshot.startsWith("MARCOM")) ? "Marcom" : "ORM"));
  const rec = crm.invoices.filter((i) => i.invoice_type === "RECURRING" && !["draft", "void"].includes(i.status) && i.contract_ids[0]);
  const inv: PaidInv[] = rec.map((i) => ({ contract_id: i.contract_ids[0]!, hotel: i.customer_snapshot.legal_name, service: svcOf(i), ae: null, period: i.billing_period_start.slice(0, 7), status: i.status, paid_at: i.paid_at ?? i.settled_date ?? null }));
  const gr = crm.gradeRecords ?? [];
  const gradeFor = (cust: string, p?: string) => gr.filter((g) => g.customer_id === cust && (!p || g.billing_period.slice(0, 7) <= p)).sort((a, b) => a.billing_period.localeCompare(b.billing_period)).at(-1)?.grade as Grade | undefined ?? null;
  const custOf = new Map(rec.map((i) => [i.contract_ids[0]!, i.customer_snapshot.customer_id]));
  const lapsed = (id: string) => { const c = contracts.get(id); return !!c && contractStateOn({ contract_id: id, start: c.start_date, term_end: c.duration_months ? termEnd(c.start_date, c.duration_months) : null, end: c.inactivated_at ?? null }, today) === "LAPSED_PENDING"; };
  const latest = [...new Set(inv.map((i) => i.period))].sort().at(-1);
  const grades: GradeRowR[] = [...new Map(inv.filter((i) => i.period === latest).map((i) => [i.contract_id, i])).values()]
    .map((i) => ({ contract_id: i.contract_id, hotel: i.hotel, service: i.service, ae: null, grade: gradeFor(custOf.get(i.contract_id) ?? ""), lapsed: lapsed(i.contract_id) }));
  const debts: DebtRowR[] = [];
  for (const [cid, cust] of custOf) {
    const mine = rec.filter((i) => i.contract_ids[0] === cid);
    const due = mine.filter((i) => outstandingOf(i) > 0 && i.due_date && i.due_date < today);
    const st = collectionStatus(crm, cust, today);
    const woAmt = mine.filter((i) => i.status === "written_off").reduce((a, i) => a + Math.max(0, i.totals.total - (i.paid_amount ?? 0)), 0);
    const c = contracts.get(cid); const first = mine[0]!;
    const base = { contract_id: cid, hotel_id: first.hotel_id ?? c?.hotel_id ?? cust, hotel: first.customer_snapshot.legal_name, service: svcOf(first), ae: null, grade: gradeFor(cust), lapsed: lapsed(cid) };
    if (st === "WRITTEN_OFF" || (woAmt > 0 && !due.length)) { debts.push({ ...base, status: "WRITTEN_OFF", outstanding: woAmt || due.reduce((a, i) => a + outstandingOf(i), 0), cycles: new Set(mine.filter((i) => i.status === "written_off").map((i) => i.billing_period_start.slice(0, 7))).size }); continue; }
    if (due.length) { debts.push({ ...base, status: st === "LEGAL" ? "LEGAL" : st === "SUSPENDED" ? "SUSPENDED" : "OVERDUE", outstanding: due.reduce((a, i) => a + outstandingOf(i), 0), cycles: new Set(due.map((i) => i.billing_period_start.slice(0, 7))).size }); continue; }
    if (c?.billing_status === "PAUSED") debts.push({ ...base, status: "PAUSED", outstanding: 0, cycles: 0 });
  }
  return { inv, grades, gradeAt: (id, p) => gradeFor(custOf.get(id) ?? "", p), debts };
}

function useDebtModel(demo: boolean, today: string, tick: number): Model {
  const crm = useCrmOptional();
  const all = useTickets();
  return useMemo(() => {
    if (demo) return { inv: demoPaidInvoices(), grades: demoGradeRows(), gradeAt: (id: string) => demoGradeAt(id), debts: demoDebtRows(), tickets: demoDebtTickets() };
    const m = liveDebtModel(crm ?? null, today);
    const tickets: TicketLite[] = all.map((t) => ({ ticket_id: t.ticket_id, type: t.type, target_dept: t.target_dept, status: t.status, contract_id: t.subject_ref.contract_id ?? t.payload.contract_id ?? null, hotel_id: t.subject_ref.hotel_id ?? null, service: t.subject_ref.service_line ?? t.subject_ref.gap_service ?? null }));
    return { ...m, tickets };
  }, [demo, today, tick, crm, all]); // eslint-disable-line react-hooks/exhaustive-deps
}

const SvcPill = ({ s }: { s: Svc }) => <span className={cn("ac-pill", s === "ORM" ? "ac-pill-svc-orm" : "ac-pill-svc-marcom")}>{s}</span>;
const GradeBadge = ({ g }: { g: Grade | null }) => g ? <span className={cn("dp-grade", GRADE_META[g]!.pill)}>{g}</span> : <span className="text-muted-foreground">–</span>;
const AeCell = ({ ae }: { ae: string | null }) => ae ? <span>{ae}</span> : <span className="text-dash-watch">ยังไม่ระบุ AE</span>;
const NameCell = ({ hotel, id, lapsed }: { hotel: string; id: string; lapsed?: boolean | undefined }) => (
  <td><div>{hotel}</div><div className="text-xs text-muted-foreground">{id}{lapsed && <span className="ml-1 ac-pill ac-pill-neutral" data-testid="dp-lapsed">ขาดอายุ รอผล</span>}</div></td>
);

/** AC App Partner Bills v1.0 §6 (AX14): "อัปเดตจาก AC App" = the latest paid / status-change time of the period
 *  (the AC payment-confirm audit time; else the invoice paid_at) — not page-load time. */
function useLastPaidChange(demo: boolean, inv: PaidInv[], period: string | null): Date | null {
  const crm = useCrmOptional();
  return useMemo(() => {
    if (!period) return null;
    const ids = demo || !crm ? null : new Set(crm.invoices.filter((i) => i.billing_period_start.slice(0, 7) === period).map((i) => i.invoice_id));
    const audit = ids && crm ? crm.audit.filter((a) => a.action === "payment.confirm" && ids.has(a.target)).map((a) => a.at) : [];
    const paid = inv.filter((i) => i.period === period && i.paid_at).map((i) => i.paid_at!.length <= 10 ? `${i.paid_at}T00:00:00+07:00` : i.paid_at!);
    const all = [...audit, ...paid].map((x) => Date.parse(x)).filter((x) => Number.isFinite(x));
    return all.length ? new Date(Math.max(...all)) : null;
  }, [demo, crm, inv, period]);
}

/* ---------- ① ---------- */
export function PaidGradeCard({ demo, initialOpen = false }: { demo: boolean; initialOpen?: boolean }) {
  const today = demo ? DEMO_DAY : new Date().toISOString().slice(0, 10);
  const focus = useFocusTick();
  const k = useCardCompare("ac", "grade", today);
  const m = useDebtModel(demo, today, focus.tick);
  const [g, setG] = useState<Grade | null>(null);
  const aTo = k.a.to < today ? k.a.to : today;
  const h = paidHeadline(m.inv, aTo, k.b?.to ?? null);
  const delta = h ? deltaLine(h.now, h.prev) : null;
  const counts = gradeCounts(m.grades);
  const total = GRADES.reduce((a, x) => a + counts[x], 0);
  const list = gradeList(m.grades, g);
  const tr = h ? trend(m.inv, m.gradeAt, h.period, aTo) : [];
  const pick = (x: Grade) => setG(g === x ? null : x);
  const lapsedN = m.grades.filter((r) => r.lapsed).length;
  const upd = useLastPaidChange(demo, m.inv, h?.period ?? null);
  return (
    <DashCard
      period={k.control}
      title={<>① เกรดการชำระ A–D</>}
      info={{
        source: "AC App · ใบแจ้งหนี้ (status = paid / paid_at) · เกรดจาก AC App",
        count: "ชำระแล้ว = สัญญาที่บิลงวดล่าสุดชำระแล้ว อ่านสถานะ real-time จาก AC App · เกรดคิดราย customer ที่ AC App (เฉพาะบิล recurring) สัญญาทุกฉบับของ customer เดียวกันใช้เกรดเดียวกัน · นับเป็นสัญญาบริการ (ORM 1 · Marcom 1) · เทียบกับวันเดียวกันของช่วงก่อน (HR5)",
        read: "สัญญาขาดอายุ รอผล ที่ยังมีบิลงวดล่าสุดยังนับในการ์ดนี้ (ติดป้าย ขาดอายุ รอผล)",
      }}
      question="สัญญาไหนจ่ายตรงเวลา และสัดส่วนดีขึ้นหรือแย่ลง?"
      answer={h ? `ชำระแล้ว ${h.now.paid} สัญญา` : "—"}
      answerTone="good"
      answerSub={h ? `คิดเป็น ${pct1(h.now.paid, h.now.total)}% ของสัญญาทั้งหมด ${h.now.total} สัญญา · อัปเดตจาก AC App ${upd ? hhmm(upd) : "–"}` : undefined}
      noteKey="dp-grade"
      noteNamespace="ac"
      noteLines={h ? [`งวด ${monYY(h.period)} ชำระแล้ว ${h.now.paid} / ${h.now.total} สัญญา`, `เกรด D ${counts.D} สัญญา · C ${counts.C} สัญญา${lapsedN ? ` · ขาดอายุ รอผล ${lapsedN}` : ""}`] : ["ยังไม่มีบิลงวดล่าสุด"]}
      howToRead="กดแถบสีหรือชิปเพื่อกรองรายชื่อ · กดซ้ำเพื่อล้าง · ตัวเลขชำระแล้วอ่านสถานะบิลจริง ไม่ได้คิดจากเกรด"
    >
      {!h ? <ChartSkeleton /> : (
        <div className="flex min-w-0 flex-col gap-3" data-testid="dp-card1">
          {h.prevPeriod && <p className="text-xs text-muted-foreground">{monYY(h.period)} vs {monYY(h.prevPeriod)} · ณ วันที่ {h.offsetDay} ของงวด</p>}
          {delta && <p data-testid="dp-delta" data-tone={delta.tone} className={cn("text-sm", delta.tone === "up" ? "text-dash-good" : delta.tone === "down" ? "text-dash-action" : "text-muted-foreground")}>{delta.text}</p>}
          <div className="dp-bar" role="group" aria-label="สัดส่วนเกรด">
            {GRADES.filter((x) => counts[x]).map((x) => (
              <button key={x} type="button" data-seg={x} aria-pressed={g === x} onClick={() => pick(x)} className={cn("dp-seg", g && g !== x && "opacity-40")} style={{ flexGrow: counts[x], background: GRADE_META[x]!.bar }}>
                {counts[x] / Math.max(1, total) > 0.08 ? `${x} · ${counts[x]}` : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{GRADES.map((x) => `${x} ${counts[x]} สัญญา · ${Math.round(pct1(counts[x], total))}%`).join("   ")}</p>
          <div className="dp-trend" data-testid="dp-trend">
            {tr.map((p) => (
              <div key={p.period} className={cn("dp-trend-col", p.open && "opacity-50")}>
                <span className="text-xs tabular-nums">{p.pct}%</span>
                <div className="dp-trend-stack">{[...GRADES].reverse().map((x) => <i key={x} style={{ flexGrow: p.grades[x], background: GRADE_META[x]!.bar }} />)}</div>
                <span className="text-xs">{monYY(p.period)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{p.paid}/{p.total}</span>
              </div>
            ))}
          </div>
          <p className="ac-footnote">ตัวเลขบนแท่ง = % สัญญาที่ชำระแล้วของงวดนั้น · {monYY(h.period)} ยังไม่ปิดงวด แสดงจาง · ใบที่ยังค้างเกินงวดถัดไปนับเป็น C ไว้ก่อน</p>
          <div className="ac-chip-row" role="group" aria-label="กรองเกรด">
            {GRADES.map((x) => <button key={x} type="button" data-chip={x} aria-pressed={g === x} className={cn("ac-filter-chip", g === x && "ac-filter-chip-on")} onClick={() => pick(x)}>{x} {counts[x]} สัญญา</button>)}
            {g && <button type="button" className="ac-link text-sm" onClick={() => setG(null)}>ดูทั้งหมด</button>}
          </div>
          <div className="dp-table-wrap" data-open={initialOpen || undefined}>
            <table className="ac-table dp-table" data-testid="dp-grade-table">
              <thead><tr><th>ชื่อสัญญา</th><th>เกรดล่าสุด</th><th>สัญญาบริการ</th><th>AE ผู้ดูแล</th></tr></thead>
              <tbody>{list.map((r) => <tr key={r.contract_id} data-row={r.contract_id}><NameCell hotel={r.hotel} id={r.contract_id} lapsed={r.lapsed} /><td><GradeBadge g={r.grade} /></td><td><SvcPill s={r.service} /></td><td><AeCell ae={r.ae} /></td></tr>)}</tbody>
            </table>
          </div>
          <p className="ac-footnote">{list.length} สัญญา · เรียงตามชื่อสัญญา · เกรดคิดราย customer แสดงทุกสัญญาที่ customer ถือ</p>
        </div>
      )}
    </DashCard>
  );
}

/* ---------- ② ---------- */
const Pills = ({ c, label }: { c: { open: number; done: number }; label: string }) => (
  <div className="flex flex-wrap items-center gap-1 text-xs"><span className="text-muted-foreground">{label}</span>
    {c.open > 0 && <span className="ac-pill ac-pill-watch" data-pill="open">กำลังทำ {c.open}</span>}
    {c.done > 0 && <span className="ac-pill ac-pill-good" data-pill="done">เสร็จ {c.done}</span>}
    {!c.open && !c.done && <span className="text-muted-foreground">–</span>}
  </div>
);
export function DebtorCardR11({ demo }: { demo: boolean }) {
  const today = demo ? DEMO_DAY : new Date().toISOString().slice(0, 10);
  const focus = useFocusTick();
  const m = useDebtModel(demo, today, focus.tick);
  const [f, setF] = useState<DebtStatus | null>(null);
  const s = debtSummary(m.debts);
  const shown = debtFilter(m.debts, f);
  const strip = ticketStrip(m.debts.filter((r) => r.status !== "PAUSED"), m.tickets);
  const pick = (x: DebtStatus) => setF(f === x ? null : x);
  const cnt = (x: DebtStatus) => m.debts.filter((r) => r.status === x).length;
  const empty = !m.debts.length;
  return (
    <DashCard
      period={<NowChip />}
      title={<>② ลูกหนี้ที่ต้องติดตาม</>}
      info={{
        source: "AC App · ใบแจ้งหนี้ + สถานะ collection · ticket จากระบบ Ticket (อ่านอย่างเดียว)",
        count: "สถานะปัจจุบันจาก AC App · ไม่มีปุ่มเทียบ (HR6) · ยอดรวมไม่นับตัดสูญ · พักบริการที่ไม่ได้ค้างชำระไม่ใช่ลูกหนี้ แสดงไว้ให้เห็นเท่านั้น",
        read: "สัญญาขาดอายุ รอผล ที่ยังค้างเงิน ยังเป็นลูกหนี้ (ติดป้าย ขาดอายุ รอผล) · ticket จับคู่ด้วยเลขสัญญา ถ้า ticket ไม่มีเลขสัญญาใช้โรงแรม + บริการ",
      }}
      question="ตอนนี้มีเงินค้างเท่าไร และอยู่ขั้นไหน?"
      answer={empty ? "—" : thb(s.total)}
      answerTone="neutral"
      answerSub={empty ? undefined : `${s.n} สัญญา · ไม่รวมตัดสูญ`}
      noteKey="dp-debtor"
      noteNamespace="ac"
      noteLines={empty ? ["ยังไม่มีลูกหนี้"] : s.segments.map((x) => `${DEBT_TH[x.status]} ${x.n} สัญญา · ${thb(x.amount)}`).slice(0, 2)}
      howToRead="กดแถบสีหรือชิปเพื่อกรอง · กดซ้ำเพื่อล้าง · สถานะปัจจุบัน ไม่เปลี่ยนตามช่วงเวลา"
    >
      {empty ? <ChartSkeleton /> : (
        <div className="flex min-w-0 flex-col gap-3" data-testid="dp-card2">
          <div className="dp-bar" role="group" aria-label="ยอดค้างตามสถานะ">
            {s.segments.filter((x) => x.amount).map((x) => (
              <button key={x.status} type="button" data-seg={x.status} data-amount={x.amount} aria-pressed={f === x.status} onClick={() => pick(x.status)} className={cn("dp-seg", f && f !== x.status && "opacity-40")} style={{ flexGrow: x.amount, background: COLLECTION_META[STATUS_KEY[x.status]].bar }}>
                {x.pct > 12 ? `${DEBT_TH[x.status]} ${thb(x.amount)} · ${x.n}` : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{s.segments.map((x) => `${DEBT_TH[x.status]} ${x.n} สัญญา · ${thb(x.amount)} · ${x.pct}%`).join("   ")}</p>
          {s.writeOff.n > 0 && (
            <button type="button" className="dp-hatch" data-testid="dp-writeoff" onClick={() => pick("WRITTEN_OFF")}>ตัดสูญ {thb(s.writeOff.amount)} · {s.writeOff.n} สัญญา (นอกยอดรวม)</button>
          )}
          <div className="ac-chip-row" role="group" aria-label="กรองสถานะ">
            {(["OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((x) => <button key={x} type="button" data-chip={x} aria-pressed={f === x} className={cn("ac-filter-chip", f === x && "ac-filter-chip-on")} onClick={() => pick(x)}>{DEBT_TH[x]} {cnt(x)} สัญญา</button>)}
            <button type="button" data-chip="PAUSED" aria-pressed={f === "PAUSED"} className={cn("ac-filter-chip border-dashed text-muted-foreground", f === "PAUSED" && "ac-filter-chip-on")} onClick={() => pick("PAUSED")}>พักบริการ {s.paused} สัญญา · ไม่ใช่ลูกหนี้</button>
            {f && <button type="button" className="ac-link text-sm" onClick={() => setF(null)}>ดูทั้งหมด</button>}
          </div>
          <p className="text-xs" data-testid="dp-strip">
            ticket ปิดระบบ · ทีมบริการ ORM / Marcom กำลังทำ {strip.svc.open} · เสร็จ {strip.svc.done}   PS / AE กำลังทำ {strip.ps.open} · เสร็จ {strip.ps.done}   ticket งานอื่นที่ยังเปิด {strip.other}
          </p>
          <div className="dp-table-wrap">
            <table className="ac-table dp-table" data-testid="dp-debt-table">
              <thead><tr><th>ชื่อสัญญา</th><th>เกรดล่าสุด</th><th>สัญญาบริการ</th><th>AE ผู้ดูแล</th><th>ค้างกี่รอบบิล</th><th className="text-right">ยอดค้าง</th><th>สถานะ</th><th>ticket ปิดระบบ (จาก AC App)</th><th>ticket งานอื่น</th></tr></thead>
              <tbody>{shown.map((r) => {
                const c = ticketCells(r, m.tickets);
                return (
                  <tr key={r.contract_id} data-row={r.contract_id} data-status={r.status}>
                    <NameCell hotel={r.hotel} id={r.contract_id} lapsed={r.lapsed} />
                    <td><GradeBadge g={r.grade} /></td><td><SvcPill s={r.service} /></td><td><AeCell ae={r.ae} /></td>
                    <td className="tabular-nums">{r.cycles} รอบ</td>
                    <td className="text-right tabular-nums">{thb(r.outstanding)}</td>
                    <td><span className={cn("ac-pill", COLLECTION_META[STATUS_KEY[r.status]].pill)}>{DEBT_TH[r.status]}</span>{r.pause_note && <div className="text-xs text-muted-foreground">{r.pause_note}</div>}</td>
                    <td data-cell="shut">{c.shut ? <><Pills c={c.shut.svc} label={r.service} /><Pills c={c.shut.ps} label="PS / AE" /></> : <span className="text-muted-foreground">–</span>}</td>
                    <td data-cell="other" title={c.other.map((t) => `${t.type} · ${t.status}`).join("\n")} className={cn("tabular-nums", !c.other.length && "text-muted-foreground")}>{c.other.length}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <p className="ac-footnote">เรียง ส่งฟ้อง → ปิดระบบ → ค้างชำระ → ตัดสูญ แล้วตามยอดค้าง · ticket ปิดระบบ = ticket ขอปิดระบบของสัญญา (จาก AC App) แยกทีมบริการ (ORM / Marcom) และ PS / AE (ยกเลิกไม่นับ) · ticket งานอื่น = ticket ประเภทอื่นของสัญญาที่ยังเปิด</p>
        </div>
      )}
    </DashCard>
  );
}
