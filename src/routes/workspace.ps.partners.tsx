/* PM Workspace Partner v1.0 §2 — "จัดการ Partner": Rate Card · ข้อเสนอ · คำขอเครดิต. Same Partner collections as PS Dashboard ③④⑤.
 * PM edits (testing role switcher, simulation); others read only. Writes only through debt-partner-store. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerFormDrawer, type PartnerFormMode } from "@/components/ps/partner-form-drawer";
import { AcNotice, dDMY, dealChipCounts } from "@/components/ps/partner-section";
import { creditAnswerError, recordCreditAnswer, recordCreditRequest, saveDeal, setPartnerDemo, usePartnerData } from "@/lib/debt-partner-store";
import { getDealState, rateCardRows, tiersOf, propertySystemOn, type DealState } from "@/lib/debt-partner-calc";
import { partnerContracts } from "@/lib/partner-contracts";
import { PARTNER_DEMO_EXTRA_HOTELS } from "@/lib/debt-partner-demo";
import { creditSections, isStaleNegotiation, tabOfHash, type PartnerTab } from "@/lib/partner-workspace";
import { DEMO_DAY } from "@/lib/demo-session";
import { setTicketDemo, useTickets } from "@/lib/tickets-l0";
import type { PartnerData, PartnerDeal } from "@/lib/debt-partner-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/ps/partners")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined }),
  head: () => {
    const title = "จัดการ Partner — PM Workspace | Meridia Hotel ERP";
    const description = "Rate Card ค่าระบบ ข้อเสนอจาก Partner และคำขอเก็บเครดิตค่าระบบ สำหรับ PM";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: PartnerPage,
});

const thb = (n: number, cur = "THB") => (cur === "THB" ? `฿${Math.round(n).toLocaleString("en-US")}` : `${cur} ${Math.round(n).toLocaleString("en-US")}`);
const CYCLE: Record<string, string> = { MONTHLY: "รายเดือน", ADVANCE_3M: "ล่วงหน้า 3 เดือน", ADVANCE_6M: "ล่วงหน้า 6 เดือน", ANNUAL: "รายปี" };
const STATE_TH: Record<DealState, string> = { ACTIVE: "สำเร็จ · มีผลอยู่", UPCOMING: "สำเร็จ · รอเริ่ม", NEGOTIATING: "กำลังต่อรอง", EXPIRED: "หมดอายุ", FAILED: "ไม่สำเร็จ" };
const TABS: { key: PartnerTab; label: string }[] = [{ key: "rate", label: "Rate Card" }, { key: "deals", label: "ข้อเสนอ" }, { key: "credit", label: "คำขอเครดิต" }];
const PM = "PM001-Alex";

function PartnerPage() {
  const { demo } = Route.useSearch();
  const [ready, setReady] = useState(false);
  useEffect(() => { setPartnerDemo(!!demo); setTicketDemo(!!demo); setReady(true); }, [demo]);
  const [tab, setTab] = useState<PartnerTab>("rate");
  useEffect(() => {
    const sync = () => setTab(tabOfHash(window.location.hash));
    sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, []);
  const go = (k: PartnerTab) => { setTab(k); window.history.replaceState(null, "", `#${k}`); };
  const [role, setRole] = useState<"PM" | "OTHER">("PM");
  const [help, setHelp] = useState(false);
  useTickets();
  const d = usePartnerData();
  const today = demo ? DEMO_DAY : new Date().toISOString().slice(0, 10);
  const contracts = useMemo(() => partnerContracts(d, !!demo), [d, demo]);
  const [form, setForm] = useState<PartnerFormMode>(null);
  if (!ready) return null;
  const isPm = role === "PM";
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-4" data-testid="pm-partner-page">
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">ข้อมูลสาธิต · 28 ตุลาคม 2569 · ไม่บันทึก</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/workspace/$dept" params={{ dept: "ps" }} search={{ demo, ticket: undefined }} className="text-xs text-muted-foreground hover:underline">← PM Workspace</Link>
          <h2 className="text-xl font-semibold">🤝 จัดการ Partner</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setHelp(!help)}>?วิธีใช้</Button>
          <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
            <select aria-label="สวมบท Partner" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as "PM" | "OTHER")}>
              <option value="PM">PM</option><option value="OTHER">ทีมอื่น · อ่านอย่างเดียว</option>
            </select>
          </label>
        </div>
      </div>
      {help && (
        <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm" data-testid="pm-partner-help">
          <p><b>Rate Card</b> — ราคาค่าระบบขั้นบันไดตาม allotment ของแต่ละ Partner · แก้ราคา = สร้างเวอร์ชันใหม่ เก็บประวัติไว้</p>
          <p><b>ข้อเสนอ</b> — ส่วนลดและสิทธิพิเศษที่ต่อรองกับ Partner · บันทึกผลสำเร็จ / ไม่สำเร็จแล้วระบบเปิด ticket ให้ AC รับทราบ</p>
          <p><b>คำขอเครดิต</b> — สัญญา ORM ที่ปิดไม่ต่อ / ยกเลิก แต่จ่ายค่าระบบล่วงหน้าเกินวันสิ้นสุด · ส่งคำขอ แล้วบันทึกผลจาก Partner (อนุมัติ / ปฏิเสธ แจ้ง AC ทุกครั้ง)</p>
          <p>ข้อมูลชุดเดียวกับ PS Dashboard การ์ด ③ ④ ⑤ และแถวค่าระบบในข้อมูลต่อสัญญา · แก้ไขได้เฉพาะ PM</p>
          <p>เตือนใน ✅ งาน Partner: ข้อเสนอใกล้หมดอายุ 30 วัน · คำขอเครดิตรอ Partner เกิน 7 วัน · ข้อเสนอกำลังต่อรองไม่อัปเดตเกิน 14 วัน</p>
        </div>
      )}
      <div role="tablist" className="inline-flex rounded-md border p-0.5">
        {TABS.map((t) => <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} data-testid={`pm-tab-${t.key}`} onClick={() => go(t.key)}
          className={cn("rounded px-3 py-1 text-sm", tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{t.label}</button>)}
      </div>
      {tab === "rate" && <RateTab d={d} contracts={contracts} today={today} isPm={isPm} demo={!!demo} onForm={setForm} />}
      {tab === "deals" && <DealsTab d={d} today={today} isPm={isPm} demo={!!demo} onForm={setForm} />}
      {tab === "credit" && <CreditTab d={d} contracts={contracts} today={today} isPm={isPm} demo={!!demo} />}
      {isPm && <PartnerFormDrawer mode={form} onClose={() => setForm(null)} />}
    </div>
  );
}

function RateTab({ d, contracts, today, isPm, demo, onForm }: { d: PartnerData; contracts: ReturnType<typeof partnerContracts>; today: string; isPm: boolean; demo: boolean; onForm: (m: PartnerFormMode) => void }) {
  const rows = rateCardRows(d, contracts, today);
  const [hist, setHist] = useState<string | null>(null);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  return (
    <div className="space-y-3" data-testid="pm-rate-tab">
      {isPm && <div className="flex justify-end"><Button size="sm" onClick={() => onForm({ kind: "rate" })}>+ เพิ่ม Rate Card</Button></div>}
      {rows.map((r) => {
        const versions = d.partner_rate_cards.filter((x) => x.partner_id === r.card.partner_id && x.system_name === r.card.system_name).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
        return (
          <section key={r.card.id} className="space-y-2 rounded-xl border bg-card p-3" data-testid={`pm-rate-${r.partner}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{r.partner} · {r.card.system_name}</h3>
              <span className="flex gap-2">
                {isPm && <Button size="sm" variant="outline" onClick={() => onForm({ kind: "rate", card: r.card })}>แก้ไขราคา</Button>}
                <Button size="sm" variant="ghost" onClick={() => setHist(hist === r.card.id ? null : r.card.id)}>ประวัติราคา</Button>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{r.card.currency} · {CYCLE[r.card.billing_cycle]} · มีผลตั้งแต่ {dDMY(r.card.effective_from)} · {r.hotels} โรงแรม · {r.contracts} สัญญา ORM</p>
            {isPm ? (
              <table className="w-full max-w-md text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th>allotment</th><th className="text-right">ราคา / สัญญา / เดือน</th></tr></thead>
                <tbody>{tiersOf(d, r.card.id).map((t) => <tr key={t.id} className="border-t"><td>{t.allotment_min}–{t.allotment_max ?? "ขึ้นไป"}</td><td className="text-right tabular-nums">{thb(t.price_per_contract_month, r.card.currency)}</td></tr>)}</tbody></table>
            ) : <p className="text-xs text-muted-foreground">ราคาขั้นบันไดแสดงเฉพาะ PM</p>}
            {hist === r.card.id && <ul className="text-xs" data-testid="pm-rate-history">{versions.map((v) => <li key={v.id}>{dDMY(v.effective_from)} – {v.superseded_at ? dDMY(v.superseded_at) : "ปัจจุบัน"} · {tiersOf(d, v.id).map((t) => thb(t.price_per_contract_month, v.currency)).join(" / ")}</li>)}</ul>}
          </section>
        );
      })}
      {!rows.length && <p className="text-sm text-muted-foreground">ยังไม่มี Rate Card</p>}
      {demo && (
        <section className="rounded-xl border p-3 text-sm" data-testid="pm-demo-hotels">
          <h3 className="mb-1 font-medium">ระบบที่ใช้ของโรงแรม ORM (ตัวอย่าง)</h3>
          <ul className="text-xs">{PARTNER_DEMO_EXTRA_HOTELS.map((h) => { const s = propertySystemOn(d, h.property_id, today); const next = d.property_partner_system.find((x) => x.property_id === h.property_id && x.effective_from > today);
            return <li key={h.property_id}>{h.hotel} · {s ? `${pName(s.partner_id)} · ${s.system_name}` : <span className="font-medium text-warning-foreground">ยังไม่ระบุระบบ</span>}{next && ` · เปลี่ยนเป็น ${pName(next.partner_id)} ตั้งแต่ ${dDMY(next.effective_from)}`}</li>; })}</ul>
        </section>
      )}
    </div>
  );
}

type Chip = "LIVE" | "NEG" | "DONE" | "ALL";
function DealsTab({ d, today, isPm, demo, onForm }: { d: PartnerData; today: string; isPm: boolean; demo: boolean; onForm: (m: PartnerFormMode) => void }) {
  const [chip, setChip] = useState<Chip>("LIVE");
  const [quick, setQuick] = useState<{ deal: PartnerDeal; to: "SUCCESS" | "FAILED"; start: string; end: string } | null>(null);
  const counts = dealChipCounts(d, today);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const shown = d.partner_deals.filter((x) => { const s = getDealState(x, today); return chip === "ALL" || (chip === "LIVE" ? s === "ACTIVE" || s === "UPCOMING" : chip === "NEG" ? s === "NEGOTIATING" : s === "EXPIRED" || s === "FAILED"); });
  const chips: [Chip, string][] = [["LIVE", `มีผลอยู่ ${counts.LIVE} ข้อเสนอ`], ["NEG", `กำลังต่อรอง ${counts.NEG} ข้อเสนอ`], ["DONE", `หมดอายุ / ไม่สำเร็จ ${counts.DONE} ข้อเสนอ`], ["ALL", `ทั้งหมด ${counts.ALL} ข้อเสนอ`]];
  const applyQuick = () => {
    if (!quick) return;
    const { id, ac_ticket_id: _a, created_at: _c, updated_at: _u, ...rest } = quick.deal; void _a; void _c; void _u;
    const r = saveDeal({ ...rest, id, status: quick.to, start_date: quick.start || rest.start_date, end_date: quick.end || rest.end_date });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("บันทึกสถานะแล้ว · แจ้ง AC แล้ว"); setQuick(null);
  };
  return (
    <div className="space-y-3" data-testid="pm-deals-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">{chips.map(([k, l]) => <button key={k} type="button" className={cn("ac-chip", chip === k && "is-on")} aria-pressed={chip === k} onClick={() => setChip(k)} data-testid={`pm-chip-${k}`}>{l}</button>)}</div>
        {isPm && <Button size="sm" onClick={() => onForm({ kind: "deal" })}>+ บันทึกข้อตกลง</Button>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="ac-table w-full text-sm">
          <thead><tr><th>ประเภท</th><th>Partner</th><th>รายละเอียด</th><th>ช่วงที่มีผล</th><th>สถานะ</th><th>ส่งบัญชี</th><th>อัปเดตล่าสุด</th>{isPm && <th />}</tr></thead>
          <tbody>
            {shown.map((x) => {
              const s = getDealState(x, today);
              return (
                <tr key={x.id} data-testid={`pm-deal-${x.id}`}>
                  <td>{x.kind === "PERK" ? "สิทธิพิเศษ" : "ลดต้นทุนค่าระบบ"}</td><td>{pName(x.partner_id)}</td><td>{x.title}</td>
                  <td className="whitespace-nowrap">{x.start_date ? `${dDMY(x.start_date)} – ${x.end_date ? dDMY(x.end_date) : "until further notice"}` : "–"}</td>
                  <td>{STATE_TH[s]}</td><td><AcNotice id={x.ac_ticket_id} demo={demo} /></td>
                  <td className={cn("whitespace-nowrap", isStaleNegotiation(x, today) && "font-medium text-warning-foreground")} data-testid="pm-deal-updated">{dDMY(x.updated_at)}</td>
                  {isPm && <td className="whitespace-nowrap"><button type="button" className="ac-link" onClick={() => onForm({ kind: "deal", deal: x })}>แก้ไข</button>
                    {x.status === "NEGOTIATING" && <> · <button type="button" className="ac-link" onClick={() => setQuick({ deal: x, to: "SUCCESS", start: x.start_date ?? "", end: x.end_date ?? "" })}>เปลี่ยนสถานะ</button></>}</td>}
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={8} className="text-muted-foreground">ไม่มีข้อเสนอ</td></tr>}
          </tbody>
        </table>
      </div>
      {quick && isPm && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3 text-sm" data-testid="pm-quick-status">
          <span className="font-medium">{quick.deal.title}</span>
          <label className="grid gap-1">ผล<select className="h-9 rounded-md border bg-background px-2" value={quick.to} onChange={(e) => setQuick({ ...quick, to: e.target.value as "SUCCESS" | "FAILED" })}><option value="SUCCESS">สำเร็จ</option><option value="FAILED">ไม่สำเร็จ</option></select></label>
          {quick.to === "SUCCESS" && <><label className="grid gap-1">วันเริ่มมีผล<Input type="date" className="h-9" value={quick.start} onChange={(e) => setQuick({ ...quick, start: e.target.value })} /></label>
            <label className="grid gap-1">วันสิ้นสุด (ไม่ใส่ = until further notice)<Input type="date" className="h-9" value={quick.end} onChange={(e) => setQuick({ ...quick, end: e.target.value })} /></label></>}
          <Button size="sm" variant="outline" onClick={() => setQuick(null)}>ยกเลิก</Button><Button size="sm" onClick={applyQuick}>บันทึก</Button>
        </div>
      )}
    </div>
  );
}

function CreditTab({ d, contracts, today, isPm, demo }: { d: PartnerData; contracts: ReturnType<typeof partnerContracts>; today: string; isPm: boolean; demo: boolean }) {
  const { pending, waiting, closed } = creditSections(d, contracts, today);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const [req, setReq] = useState<{ i: number; amount: string; note: string; att: string } | null>(null);
  const [ans, setAns] = useState<{ id: string; hotel: string; result: "APPROVED" | "REJECTED"; amount: string; exp: string; att: string; note: string } | null>(null);
  const at = demo ? `${today}T09:00:00.000Z` : undefined;
  const sendReq = () => {
    if (!req) return; const r = pending[req.i]; if (!r) return;
    const out = recordCreditRequest({ contract_id: r.contract.contract_id, partner_id: d.partners.find((p) => p.name === r.partner)?.id ?? r.partner, contract_end_date: r.contract.end ?? "", prepaid_until: r.prepaid_until, months_over: r.months_over, amount: Number(req.amount), currency: r.currency, note: req.note, attachment_url: req.att, by: PM, ...(at ? { at } : {}) });
    if (!out.ok) { toast.error(out.error); return; } toast.success("บันทึกว่าส่งคำขอแล้ว"); setReq(null);
  };
  const answerInput = ans ? { id: ans.id, hotel: ans.hotel, result: ans.result, approved_amount: ans.amount === "" ? null : Number(ans.amount), credit_expires_at: ans.exp || null, answer_attachment_url: ans.att, note: ans.note, by: PM, ...(at ? { at } : {}) } : null;
  const sendAns = () => {
    if (!answerInput) return; const out = recordCreditAnswer(answerInput);
    if (!out.ok) { toast.error(out.error); return; } toast.success(`บันทึกผลแล้ว · ส่ง ticket #${out.ticket_id} ถึง AC`); setAns(null);
  };
  const ansErr = answerInput ? creditAnswerError(answerInput) : null;
  return (
    <div className="space-y-4" data-testid="pm-credit-tab">
      <section id="credit-pending" className="space-y-2" data-testid="pm-credit-pending">
        <h3 className="font-medium">1 · รอส่งคำขอ ({pending.length})</h3>
        <div className="overflow-x-auto rounded-md border"><table className="ac-table w-full text-sm">
          <thead><tr><th>สัญญา</th><th>Partner</th><th>สัญญาสิ้นสุด / ยกเลิก</th><th>จ่ายล่วงหน้าถึง</th><th>เดือนที่เกิน</th><th>มูลค่าที่ขอได้</th><th>แจ้งเมื่อ</th>{isPm && <th />}</tr></thead>
          <tbody>{pending.map((r, i) => (
            <tr key={r.contract.contract_id}><td>{r.contract.hotel}<div className="text-xs text-muted-foreground">{r.contract.contract_id}</div></td><td>{r.partner}</td>
              <td>{dDMY(r.contract.end)} · {r.contract.end_reason === "EARLY_TERMINATED" ? "ยกเลิก" : "ไม่ต่อ"}</td><td>{dDMY(r.prepaid_until)}</td><td>{r.months_over} เดือน</td><td className="tabular-nums">{thb(r.amount, r.currency)}</td><td>{dDMY(r.notified_at)}</td>
              {isPm && <td><button type="button" className="ac-link" onClick={() => setReq({ i, amount: String(r.amount), note: "", att: "" })}>บันทึกว่าส่งคำขอแล้ว</button></td>}</tr>
          ))}{!pending.length && <tr><td colSpan={8} className="text-muted-foreground">ไม่มีสัญญารอส่งคำขอ</td></tr>}</tbody>
        </table></div>
        {req && isPm && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3 text-sm" data-testid="pm-req-form">
            <label className="grid gap-1">มูลค่าที่ขอ<Input type="number" className="h-9" value={req.amount} onChange={(e) => setReq({ ...req, amount: e.target.value })} /></label>
            <label className="grid gap-1">หมายเหตุ<Input className="h-9" value={req.note} onChange={(e) => setReq({ ...req, note: e.target.value })} /></label>
            <label className="grid gap-1">ไฟล์แนบ (ลิงก์อีเมลถึง Partner)<Input className="h-9" value={req.att} onChange={(e) => setReq({ ...req, att: e.target.value })} /></label>
            <Button size="sm" variant="outline" onClick={() => setReq(null)}>ยกเลิก</Button><Button size="sm" onClick={sendReq}>บันทึก</Button>
          </div>
        )}
      </section>
      <section id="credit-waiting" className="space-y-2" data-testid="pm-credit-waiting">
        <h3 className="font-medium">2 · รอ Partner ตอบ ({waiting.length})</h3>
        <div className="overflow-x-auto rounded-md border"><table className="ac-table w-full text-sm">
          <thead><tr><th>สัญญา</th><th>Partner</th><th>มูลค่าที่ขอ</th><th>ส่งคำขอเมื่อ</th><th>รอมา</th>{isPm && <th />}</tr></thead>
          <tbody>{waiting.map((w) => (
            <tr key={w.req.id}><td>{w.contract?.hotel ?? w.req.contract_id}<div className="text-xs text-muted-foreground">{w.req.contract_id}</div></td><td>{pName(w.req.partner_id)}</td><td className="tabular-nums">{thb(w.req.amount, w.req.currency)}</td><td>{dDMY(w.req.requested_at)}</td>
              <td className={cn(w.days > 7 && "font-medium text-warning-foreground")} data-testid="pm-wait-days">รอมา {w.days} วัน</td>
              {isPm && <td><button type="button" className="ac-link" onClick={() => setAns({ id: w.req.id, hotel: w.contract?.hotel ?? w.req.contract_id, result: "APPROVED", amount: String(w.req.amount), exp: "", att: "", note: "" })}>บันทึกผลจาก Partner</button></td>}</tr>
          ))}{!waiting.length && <tr><td colSpan={6} className="text-muted-foreground">ไม่มีคำขอรอตอบ</td></tr>}</tbody>
        </table></div>
        {ans && isPm && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3 text-sm" data-testid="pm-ans-form">
            <label className="grid gap-1">ผล<select className="h-9 rounded-md border bg-background px-2" value={ans.result} onChange={(e) => setAns({ ...ans, result: e.target.value as "APPROVED" | "REJECTED" })}><option value="APPROVED">อนุมัติ</option><option value="REJECTED">ปฏิเสธ</option></select></label>
            {ans.result === "APPROVED" && <><label className="grid gap-1">มูลค่าที่ได้จริง<Input type="number" className="h-9" value={ans.amount} onChange={(e) => setAns({ ...ans, amount: e.target.value })} /></label>
              <label className="grid gap-1">เครดิตใช้ได้ถึง<Input type="date" className="h-9" value={ans.exp} onChange={(e) => setAns({ ...ans, exp: e.target.value })} /></label></>}
            <label className="grid gap-1">ไฟล์แนบ<Input className="h-9" value={ans.att} onChange={(e) => setAns({ ...ans, att: e.target.value })} /></label>
            <label className="grid gap-1">หมายเหตุ<Input className="h-9" value={ans.note} onChange={(e) => setAns({ ...ans, note: e.target.value })} /></label>
            {ansErr && <span className="text-xs text-warning-foreground">{ansErr}</span>}
            <Button size="sm" variant="outline" onClick={() => setAns(null)}>ยกเลิก</Button><Button size="sm" disabled={!!ansErr} onClick={sendAns}>บันทึก</Button>
          </div>
        )}
      </section>
      <section className="space-y-2" data-testid="pm-credit-closed">
        <h3 className="font-medium">3 · ปิดแล้ว (180 วันล่าสุด)</h3>
        <div className="overflow-x-auto rounded-md border"><table className="ac-table w-full text-sm">
          <thead><tr><th>สัญญา</th><th>Partner</th><th>ผล</th><th>มูลค่าที่ได้</th><th>เครดิตใช้ได้ถึง</th><th>ใช้ไป / คงเหลือ</th><th>AC</th></tr></thead>
          <tbody>{closed.map((c) => (
            <tr key={c.req.id}><td>{c.contract?.hotel ?? c.req.contract_id}</td><td>{pName(c.req.partner_id)}</td><td>{c.req.status === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"}</td>
              <td className="tabular-nums">{c.req.status === "APPROVED" ? thb(c.req.approved_amount ?? c.req.amount, c.req.currency) : "–"}</td><td>{dDMY(c.req.credit_expires_at)}</td>
              <td className="tabular-nums">{c.req.status === "APPROVED" ? `${thb(c.used, c.req.currency)} / ${thb(c.remaining, c.req.currency)}` : "–"}</td><td><AcNotice id={c.req.ac_ticket_id} demo={demo} /></td></tr>
          ))}{!closed.length && <tr><td colSpan={7} className="text-muted-foreground">ยังไม่มี</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  );
}
