/* Debt Partner R1 §6–§8 — section "ส่วนลด Partner": cards ③ Rate Card ④ deals ⑤ system credit + the shared PM form.
 * Read-only for everyone except PM (testing role switcher, simulation only). Numbers come only from src/lib/debt-partner-calc.ts. */
import { useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/ps/dash-card";
import { NowChip } from "./compare-control";
import { PartnerFormDrawer, type PartnerFormMode } from "./partner-form-drawer";
import { setPartnerDemo, usePartnerData } from "@/lib/debt-partner-store";
import { creditRows, creditTiles, getCashbackExpected, getDealState, rateCardRows, type DealState, type PartnerContract } from "@/lib/debt-partner-calc";
import { PARTNER_DEMO_CONTRACTS, PARTNER_DEMO_TICKET_STATUS } from "@/lib/debt-partner-demo";
import { DEMO_DAY } from "@/lib/demo-session";
import { ticketById, useTickets, type L0Status } from "@/lib/tickets-l0";
import type { PartnerData, PartnerDeal } from "@/lib/debt-partner-types";
import { DP_HELP } from "@/lib/ps-glossary";
import { cn } from "@/lib/utils";

const thb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;
const money = (n: number, cur: string) => (cur === "THB" ? thb(n) : `${cur} ${Math.round(n).toLocaleString("en-US")}`);
export const dDMY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }) : "–");
const CYCLE: Record<string, string> = { MONTHLY: "รายเดือน", ADVANCE_3M: "ล่วงหน้า 3 เดือน", ADVANCE_6M: "ล่วงหน้า 6 เดือน", ANNUAL: "รายปี" };
const STATE_TH: Record<DealState, string> = { ACTIVE: "สำเร็จ · มีผลอยู่", UPCOMING: "สำเร็จ · รอเริ่ม", NEGOTIATING: "กำลังต่อรอง", EXPIRED: "หมดอายุ", FAILED: "ไม่สำเร็จ" };
const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap";

/** Contracts behind the Partner cards: DEMO bundle, else the system rows (allotment unknown → lowest tier, DP-O1). */
export function partnerContracts(d: PartnerData, demo: boolean): PartnerContract[] {
  if (demo) return PARTNER_DEMO_CONTRACTS;
  return d.contract_partner_system.map((s) => ({ contract_id: s.contract_id, hotel: s.contract_id, service: "ORM", allotment: null, start: null, end: null, end_reason: null }));
}
/** AC notice status of a ticket id (real ticket store; DEMO fallback map). */
export function noticeStatus(id: string | null, demo: boolean): L0Status | null {
  if (!id) return null;
  return ticketById(id)?.status ?? (demo ? PARTNER_DEMO_TICKET_STATUS[id] ?? null : null);
}
export function AcNotice({ id, demo }: { id: string | null; demo: boolean }) {
  const s = noticeStatus(id, demo);
  if (!s || s === "CANCELLED") return <span className="text-muted-foreground" data-ac="none">{id ? "–" : "ยังไม่ส่ง"}</span>;
  if (s === "NEW") return <span data-ac="new"><i className="mr-1 inline-block size-2 rounded-full bg-dash-watch" />ส่งบัญชีแล้ว · รอ AC รับทราบ</span>;
  return <span data-ac="ack"><i className="mr-1 inline-block size-2 rounded-full bg-dash-good" />AC รับทราบ</span>;
}
const discountText = (d: PartnerDeal) => (d.benefit_type === "PERCENT" ? `−${d.benefit_value}%` : d.benefit_type === "AMOUNT_PER_CONTRACT" ? `−${money(d.benefit_value ?? 0, d.benefit_currency ?? "THB")} / สัญญา` : d.title);

export function PartnerSection({ demo }: { demo: boolean }) {
  useEffect(() => { setPartnerDemo(demo); }, [demo]);
  useTickets();
  const d = usePartnerData();
  const today = demo ? DEMO_DAY : new Date().toISOString().slice(0, 10);
  const contracts = useMemo(() => partnerContracts(d, demo), [d, demo]);
  const [role, setRole] = useState<"PM" | "OTHER">("OTHER");
  const isPm = role === "PM";
  const [form, setForm] = useState<PartnerFormMode>(null);
  return (
    <section className="flex flex-col gap-5" data-testid="dp-partner-section">
      <header className="ac-section-head">
        <h2>ส่วนลด Partner</h2>
        <p>ต้นทุนค่าระบบที่ H+ จ่าย Partner · ส่วนลดและสิทธิพิเศษที่ต่อรองได้ · เครดิตค่าระบบ · PM บันทึก AC รับทราบ</p>
        <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">สวมบท (ทดสอบ)
          <select className="rounded border border-input bg-background px-1" value={role} onChange={(e) => setRole(e.target.value as "PM" | "OTHER")} aria-label="สวมบท Partner">
            <option value="OTHER">ทีมอื่น · อ่านอย่างเดียว</option><option value="PM">PM</option>
          </select>
        </label>
      </header>
      <RateCardCard d={d} contracts={contracts} today={today} isPm={isPm} onForm={setForm} />
      <DealsCard d={d} contracts={contracts} today={today} isPm={isPm} demo={demo} onForm={setForm} />
      <CreditCard d={d} contracts={contracts} today={today} demo={demo} />
      {isPm && <PartnerFormDrawer mode={form} onClose={() => setForm(null)} />}
    </section>
  );
}

function RateCardCard({ d, contracts, today, isPm, onForm }: { d: PartnerData; contracts: PartnerContract[]; today: string; isPm: boolean; onForm: (m: PartnerFormMode) => void }) {
  const rows = rateCardRows(d, contracts, today);
  const anyEst = rows.some((r) => r.card.currency !== "THB");
  const netThb = rows.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0), baseThb = rows.reduce((s, r) => s + (r.toThb(r.base) ?? 0), 0);
  const prepaid = rows.filter((r) => r.card.billing_cycle !== "MONTHLY");
  return (
    <DashCard noteKey="dp-rate" noteLines={[`ต้นทุนรวมหลังส่วนลด ${anyEst ? "≈ " : ""}${thb(netThb)} / เดือน`, `ประหยัดจากส่วนลด ${thb(baseThb - netThb)} / เดือน`]} howToRead={DP_HELP.rate}
      period={<NowChip />} title={<span data-testid="dp-card-3">③ Rate Card ค่าระบบ Partner</span>} question="แต่ละระบบ H+ จ่ายเท่าไร และหลังส่วนลดเหลือเท่าไร?"
      info={{ source: "PM บันทึก Rate Card เป็นราคาขั้นบันไดตาม allotment ของสัญญา ในสกุลเงินที่ Partner เรียกเก็บ · ระบบคำนวณค่าระบบรวมและยอดหลังหักส่วนลดที่สำเร็จและอยู่ในช่วงมีผล · ต้นทุนรายสัญญาไปแสดงในข้อมูลประกอบการต่อสัญญา" }}
      answer={<span data-testid="dp-rate-headline">{anyEst ? "≈ " : ""}{thb(netThb)} / เดือน</span>}
      answerSub={`ต้นทุนค่าระบบรวมหลังหักส่วนลด${anyEst ? " · estimate THB" : ""} · ก่อนส่วนลด ${anyEst ? "≈ " : ""}${thb(baseThb)}`}
      right={isPm ? <button type="button" className="rn5-toggle" onClick={() => onForm({ kind: "rate" })} data-testid="dp-add-rate">+ เพิ่ม Rate Card</button> : undefined}>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div className="dash-tile">Partner ที่ใช้อยู่ <b>{new Set(rows.filter((r) => r.contracts).map((r) => r.card.partner_id)).size} ราย</b> · {rows.reduce((s, r) => s + r.contracts, 0)} สัญญา ORM</div>
        <div className="dash-tile">ประหยัดจากส่วนลด <b>{thb(baseThb - netThb)} / เดือน</b></div>
        <div className="dash-tile">ส่วนลดที่มีผลอยู่ <b>{rows.reduce((s, r) => s + r.active.length, 0)} ข้อเสนอ</b></div>
        <div className="dash-tile">ชำระล่วงหน้า <b>{prepaid.length} Partner</b>{prepaid[0] ? ` · ${CYCLE[prepaid[0].card.billing_cycle]}` : ""}</div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="ac-table w-full text-sm" data-testid="dp-rate-table">
          <thead><tr><th>Partner</th><th>ระบบ</th><th>สัญญาที่ใช้</th><th>ส่วนลดที่มีผล</th><th>มีผลบังคับใช้</th><th>ค่าระบบรวม (ปกติ)</th><th>หลังหักส่วนลด</th><th>รอบที่ Partner เรียกเก็บ</th>{isPm && <th />}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const est = (v: number) => (r.card.currency !== "THB" && r.card.est_fx_to_thb ? <div className="text-xs text-muted-foreground">estimate THB ≈ {thb(v * r.card.est_fx_to_thb)}</div> : null);
              const a = r.active[0];
              return (
                <tr key={r.card.id} data-testid={`dp-rate-${r.partner}`}>
                  <td>{r.partner}</td><td>{r.card.system_name}</td><td className="tabular-nums">{r.contracts}</td>
                  <td>{r.active.length ? r.active.map((x) => <span key={x.id} className={cn(pill, "bg-dash-good/15 text-dash-good")}>{discountText(x)}</span>) : r.negotiating ? <span className={cn(pill, "bg-dash-watch/15 text-dash-watch")}>กำลังต่อรอง</span> : "–"}</td>
                  <td>{a ? `${dDMY(a.start_date)} – ${a.end_date ? dDMY(a.end_date) : "until further notice"}` : "–"}</td>
                  <td className="tabular-nums" data-testid="dp-base">{money(r.base, r.card.currency)}{est(r.base)}</td>
                  <td className="tabular-nums" data-testid="dp-net">{r.net < r.base ? <><s className="text-muted-foreground">{money(r.base, r.card.currency)}</s> → <b>{money(r.net, r.card.currency)}</b><div className="text-xs text-dash-good">ลดลง {money(r.base - r.net, r.card.currency)}</div></> : <>{money(r.net, r.card.currency)}<div className="text-xs text-muted-foreground">ยังไม่มีส่วนลด</div></>}{r.net < r.base && est(r.net)}</td>
                  <td>{CYCLE[r.card.billing_cycle]}</td>
                  {isPm && <td><button type="button" className="ac-link" onClick={() => onForm({ kind: "rate", card: r.card })}>แก้ไข</button></td>}
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={9} className="text-muted-foreground">ยังไม่มี Rate Card</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="ac-footnote">ระบบคำนวณค่าระบบรวมจากราคาขั้นบันไดตาม allotment ของแต่ละสัญญาใน Rate Card · ไม่แสดงราคาต่อสัญญาบนตารางนี้ · ระบบที่ใช้ของแต่ละสัญญา PM บันทึกตอน assign AE ผู้ดูแลสัญญา · สัญญา Marcom ไม่มีค่าระบบ · ยอด USD เก็บเป็น USD ส่วนตัวเลขบาทเป็น estimate THB</p>
    </DashCard>
  );
}

type Chip = "LIVE" | "NEG" | "DONE" | "ALL";
export function dealChipCounts(d: PartnerData, today: string) {
  const st = d.partner_deals.map((x) => getDealState(x, today));
  return { LIVE: st.filter((s) => s === "ACTIVE" || s === "UPCOMING").length, NEG: st.filter((s) => s === "NEGOTIATING").length, DONE: st.filter((s) => s === "EXPIRED" || s === "FAILED").length, ALL: st.length };
}
function DealsCard({ d, contracts, today, isPm, demo, onForm }: { d: PartnerData; contracts: PartnerContract[]; today: string; isPm: boolean; demo: boolean; onForm: (m: PartnerFormMode) => void }) {
  const [chip, setChip] = useState<Chip>("LIVE");
  const [tl, setTl] = useState(false);
  const [tlPartner, setTlPartner] = useState<string>("");
  const counts = dealChipCounts(d, today);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const notAck = d.partner_deals.filter((x) => noticeStatus(x.ac_ticket_id, demo) === "NEW").length;
  const shown = d.partner_deals.filter((x) => { const s = getDealState(x, today); return chip === "ALL" || (chip === "LIVE" ? s === "ACTIVE" || s === "UPCOMING" : chip === "NEG" ? s === "NEGOTIATING" : s === "EXPIRED" || s === "FAILED"); });
  const saving = (x: PartnerDeal) => {
    const cs = contracts.filter((c) => d.contract_partner_system.some((s) => s.contract_id === c.contract_id && s.partner_id === x.partner_id));
    const rows = rateCardRows({ ...d, partner_deals: d.partner_deals.filter((y) => y.id !== x.id) }, cs, today);
    const with_ = rateCardRows(d, cs, today);
    const diff = rows.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0) - with_.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0);
    return diff;
  };
  const tlPartners = d.partners.map((p) => p.id);
  const tp = tlPartner || tlPartners[0] || "";
  const timeline = [
    ...d.partner_deals.filter((x) => x.partner_id === tp).map((x) => ({ at: x.start_date ?? x.created_at.slice(0, 10), text: `${x.kind === "PERK" ? "สิทธิพิเศษ" : "ลดต้นทุน"} · ${x.title} · ${STATE_TH[getDealState(x, today)]}`, tone: x.kind === "PERK" ? "bg-purple-500" : getDealState(x, today) === "NEGOTIATING" ? "bg-dash-watch" : ["FAILED", "EXPIRED"].includes(getDealState(x, today)) ? "bg-muted-foreground" : "bg-dash-good" })),
    ...d.partner_rate_cards.filter((r) => r.partner_id === tp).map((r) => {
      const ts = d.partner_rate_card_tiers.filter((t) => t.rate_card_id === r.id).map((t) => t.price_per_contract_month);
      return { at: r.effective_from, text: `Rate Card ${r.system_name} ${money(Math.min(...ts), r.currency)}–${money(Math.max(...ts), r.currency)}${r.superseded_at ? ` (เดิม ถึง ${dDMY(r.superseded_at)})` : ""}`, tone: "bg-sky-500" };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const chips: [Chip, string][] = [["LIVE", `มีผลอยู่ ${counts.LIVE} ข้อเสนอ`], ["NEG", `กำลังต่อรอง ${counts.NEG} ข้อเสนอ`], ["DONE", `หมดอายุ / ไม่สำเร็จ ${counts.DONE} ข้อเสนอ`], ["ALL", `ทั้งหมด ${counts.ALL} ข้อเสนอ`]];
  return (
    <DashCard noteKey="dp-deals" noteLines={[`มีผลอยู่ ${counts.LIVE} ข้อเสนอ · กำลังต่อรอง ${counts.NEG}`, `AC ยังไม่รับทราบ ${notAck}`]} howToRead={DP_HELP.deals}
      period={<NowChip />} title={<span data-testid="dp-card-4">④ ส่วนลดและสิทธิพิเศษจาก Partner</span>} question="ตอนนี้ได้ส่วนลดหรือสิทธิพิเศษอะไรจาก Partner บ้าง และบัญชีรับทราบแล้วหรือยัง?"
      info={{ source: "ที่มา PM Workspace › งาน Partner · PM บันทึกใน PM Workspace (งาน Partner) และแสดงที่นี่ · บันทึกแล้วระบบเปิด ticket ถึง AC ให้กดรับทราบ · ส่วนลดที่สำเร็จและอยู่ในช่วงที่มีผลจะลดต้นทุนค่าระบบอัตโนมัติ" }}
      answer={`${counts.LIVE} ข้อเสนอที่มีผล`} answerSub={`กำลังต่อรอง ${counts.NEG} · AC ยังไม่รับทราบ ${notAck}`}
      right={<span className="flex gap-2"><button type="button" className="rn5-toggle" onClick={() => setTl(!tl)} data-testid="dp-tl-toggle">{tl ? "ซ่อน Timeline" : "ดู Timeline ย้อนหลัง"}</button>{isPm && <button type="button" className="rn5-toggle" onClick={() => onForm({ kind: "deal" })} data-testid="dp-add-deal">+ บันทึกข้อตกลง</button>}</span>}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="กรองข้อเสนอ">
        {chips.map(([k, l]) => <button key={k} type="button" className={cn("ac-chip", chip === k && "is-on")} aria-pressed={chip === k} onClick={() => setChip(k)} data-testid={`dp-chip-${k}`}>{l}</button>)}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="ac-table w-full text-sm" data-testid="dp-deal-table">
          <thead><tr><th>ประเภท</th><th>Partner</th><th>รายละเอียด</th><th>ช่วงที่มีผล</th><th>สถานะ</th><th>ส่งบัญชี</th><th>ผลที่ได้</th>{isPm && <th />}</tr></thead>
          <tbody>
            {shown.map((x) => {
              const s = getDealState(x, today);
              const cb = x.benefit_type === "CASHBACK_PER_CONTRACT" ? getCashbackExpected(d, x, contracts) : null;
              return (
                <tr key={x.id} data-testid={`dp-deal-${x.id}`} data-state={s}>
                  <td>{x.kind === "PERK" ? <span className={cn(pill, "bg-purple-500/15 text-purple-700")}>สิทธิพิเศษ</span> : <span className={cn(pill, "bg-dash-good/15 text-dash-good")}>ลดต้นทุนค่าระบบ</span>}</td>
                  <td>{pName(x.partner_id)}</td><td>{x.title}</td>
                  <td className="whitespace-nowrap">{x.start_date ? `${dDMY(x.start_date)} – ${x.end_date ? dDMY(x.end_date) : "until further notice"}` : "–"}</td>
                  <td>{STATE_TH[s]}{s === "UPCOMING" && <span className={cn(pill, "ml-1 bg-dash-watch/15")}>รอเริ่ม</span>}</td>
                  <td><AcNotice id={x.ac_ticket_id} demo={demo} /></td>
                  <td>
                    {x.kind === "COST_DISCOUNT" && s === "ACTIVE" ? `ประหยัด ${thb(saving(x))} / เดือน` : cb ? (
                      <div data-testid="dp-cashback">คาดว่าจะได้ {cb.eligible} × {cb.value} = {cb.expected.toLocaleString("en-US")} {cb.currency}
                        <div className="my-1 h-1.5 w-full rounded bg-muted"><div className="h-1.5 rounded bg-dash-good" style={{ width: `${cb.eligible ? (cb.received / cb.eligible) * 100 : 0}%` }} /></div>
                        <span className="text-xs">AC ได้รับแล้ว {cb.received} / {cb.eligible} สัญญา · {cb.received_amount.toLocaleString("en-US")} {cb.currency}</span></div>
                    ) : x.note || "–"}
                  </td>
                  {isPm && <td><button type="button" className="ac-link" onClick={() => onForm({ kind: "deal", deal: x })}>แก้ไข</button></td>}
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={8} className="text-muted-foreground">ไม่มีข้อเสนอ</td></tr>}
          </tbody>
        </table>
      </div>
      {tl && (
        <div className="mt-4 rounded border p-3" data-testid="dp-timeline">
          <p className="text-xs text-muted-foreground">ทุกครั้งที่เคยต่อรอง รวมที่ไม่สำเร็จและหมดอายุ · ใช้เป็นข้อมูลตอนเจรจารอบถัดไป</p>
          <div className="my-2 flex gap-1">{tlPartners.map((p) => <button key={p} type="button" className={cn("ac-chip", tp === p && "is-on")} onClick={() => setTlPartner(p)}>{pName(p)}</button>)}</div>
          <ol className="flex flex-col gap-2">{timeline.map((t, i) => <li key={i} className="flex items-start gap-2 text-sm"><i className={cn("mt-1.5 inline-block size-2 shrink-0 rounded-full", t.tone)} /><span className="w-20 shrink-0 tabular-nums text-muted-foreground">{dDMY(t.at)}</span><span>{t.text}</span></li>)}</ol>
        </div>
      )}
    </DashCard>
  );
}

function CreditCard({ d, contracts, today, demo }: { d: PartnerData; contracts: PartnerContract[]; today: string; demo: boolean }) {
  const rows = creditRows(d, contracts, today);
  const t = creditTiles(d);
  const derived = rows.filter((r) => r.kind === "DERIVED");
  const pNames = t.partners.map((id) => d.partners.find((p) => p.id === id)?.name ?? id).join(", ");
  const endTag = (c: PartnerContract | null) => (c?.end ? `${dDMY(c.end)} · ${c.end_reason === "EARLY_TERMINATED" ? "ยกเลิก" : "ไม่ต่อ"}` : "–");
  const daysSince = (iso: string) => Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) / 86400000));
  return (
    <DashCard noteKey="dp-credit" noteLines={[`เครดิตคงเหลือ ${thb(t.balance)}`, `รอ PM ส่งคำขอ ${derived.length} สัญญา`]} howToRead={DP_HELP.credit}
      period={<NowChip />} title={<span data-testid="dp-card-5">⑤ เครดิตค่าระบบ (Keep credit)</span>} question="มีค่าระบบที่จ่ายล่วงหน้าไว้แล้วต้องขอเก็บเป็นเครดิตไหม และเหลือเครดิตเท่าไร?"
      info={{ source: "ขั้นตอน: AE ปิดงานไม่ต่อ / ยกเลิก › ระบบเช็คว่าจ่ายค่าระบบล่วงหน้าถึงวันไหน (AC บันทึกการจ่ายบิล Partner) › แจ้ง PM Workspace › PM ขอ Partner › Partner อนุมัติ / ปฏิเสธ › AC รับทราบ · ลูกค้าไม่ได้จ่ายค่าระบบ เครดิตเป็นของ H+ · การใช้เครดิตกับรอบบิลไหน AC App บันทึกเอง" }}
      answer={<span data-testid="dp-credit-balance">{thb(t.balance)}</span>} answerSub={`เครดิตคงเหลือรวม · ${pNames || "–"} · รอ PM ส่งคำขอ ${derived.length} สัญญา · ${thb(derived.reduce((s, r) => s + (r.kind === "DERIVED" ? r.amount : 0), 0))}`}>
      <div className="overflow-x-auto">
        <table className="ac-table w-full text-sm" data-testid="dp-credit-table">
          <thead><tr><th>ชื่อสัญญา</th><th>Partner</th><th>สัญญาสิ้นสุด</th><th>จ่ายค่าระบบล่วงหน้าถึง</th><th>เดือนที่เกิน</th><th>มูลค่าขอเก็บ</th><th>สถานะคำขอ</th><th>ส่งบัญชี</th></tr></thead>
          <tbody>
            {rows.map((r, i) => r.kind === "DERIVED" ? (
              <tr key={`d${i}`} data-testid="dp-credit-derived">
                <td>{r.contract.hotel}<div className="text-xs text-muted-foreground">{r.contract.contract_id}</div></td><td>{r.partner}</td><td>{endTag(r.contract)}</td><td>{dDMY(r.prepaid_until)}</td>
                <td className="tabular-nums">{r.months_over} เดือน</td><td className="tabular-nums">{money(r.amount, r.currency)}</td>
                <td><span className={cn(pill, "bg-dash-watch/15 text-dash-watch")}>รอ PM ส่งคำขอ</span>{r.notified_at && <div className="text-xs text-muted-foreground">แจ้ง PM เมื่อ {dDMY(r.notified_at)}</div>}</td><td>–</td>
              </tr>
            ) : (
              <tr key={r.req.id} data-testid="dp-credit-stored" data-status={r.req.status}>
                <td>{r.contract?.hotel ?? r.req.contract_id}<div className="text-xs text-muted-foreground">{r.req.contract_id}</div></td><td>{r.partner}</td>
                <td>{r.contract ? endTag(r.contract) : dDMY(r.req.contract_end_date)}</td><td>{dDMY(r.req.prepaid_until)}</td>
                <td className="tabular-nums">{r.req.months_over} เดือน</td><td className="tabular-nums">{money(r.req.amount, r.req.currency)}</td>
                <td>{r.req.status === "REQUESTED" ? <><span className={cn(pill, "bg-teal-500/15 text-teal-700")}>ส่งคำขอแล้ว</span><div className="text-xs text-muted-foreground">รอ Partner ตอบ · {daysSince(r.req.requested_at)} วัน</div></> : r.req.status === "APPROVED" ? <><span className={cn(pill, "bg-dash-good/15 text-dash-good")}>Partner อนุมัติ</span><div className="text-xs text-muted-foreground">เครดิตใช้ได้ถึง {dDMY(r.req.credit_expires_at)}</div></> : <span className={cn(pill, "bg-muted text-muted-foreground")}>Partner ปฏิเสธ</span>}</td>
                <td>{r.req.ac_ticket_id ? <AcNotice id={r.req.ac_ticket_id} demo={demo} /> : "–"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="text-muted-foreground">ยังไม่มีคำขอ</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="ac-footnote">แสดงคำขอ 90 วันล่าสุด · เครดิตด้านล่างรวมคำขอที่อนุมัติก่อนหน้า</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-3" data-testid="dp-credit-tiles">
        <div className="dash-tile">เครดิตที่ได้มา <b>{thb(t.gained)}</b> · {t.gained_n} สัญญา</div>
        <div className="dash-tile">ใช้ไปแล้ว <b>{thb(t.used)}</b> · AC App บันทึก{t.latestBill ? ` · บิล ${t.latestBill}` : ""}</div>
        <div className="dash-tile">คงเหลือ <b>{thb(t.balance)}</b>{t.earliest ? ` · หมดอายุเร็วสุด ${dDMY(t.earliest)}` : ""}</div>
      </div>
    </DashCard>
  );
}
