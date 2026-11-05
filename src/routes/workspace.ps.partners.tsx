/* PM Workspace Partner v1.0 §2 → v1.2 PW23–PW34 — "จัดการ Partner": ภาพรวม (default) · หน้า Partner (#partner/{id}[/section]) ·
 * คำขอเครดิตทั้งหมด (#credit). Replaces the v1.1 four tabs; old hashes and to-do deep links map through viewOfHash().
 * Same Partner collections as PS Dashboard ③④⑤. PM edits (testing role switcher, simulation); others read only.
 * Writes only through debt-partner-store; numbers only from debt-partner-calc. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerFormDrawer, type PartnerFormMode } from "@/components/ps/partner-form-drawer";
import { AcNotice, dDMY, dealChipCounts, discountText } from "@/components/ps/partner-section";
import { addPartner, creditAnswerError, partnerAttachments, recordCreditAnswer, recordCreditRequest, saveDeal, setPartnerDemo, usePartnerData } from "@/lib/debt-partner-store";
import { creditTiles, getDealState, propertySystemHistory, propertySystemOn, rateCardRows, tiersOf, type DealState } from "@/lib/debt-partner-calc";
import { partnerContracts } from "@/lib/partner-contracts";
import { PARTNER_DEMO_EXTRA_HOTELS } from "@/lib/debt-partner-demo";
import { creditSections, daysBetween, folderLabel, hashOfView, historyTag, isStaleNegotiation, partnerHotelRows, partnerTodoItems, REMIND, viewOfHash, type PartnerHotelRow, type PartnerSection, type PartnerTodo, type PartnerView } from "@/lib/partner-workspace";
import { PartnerAttachmentsPanel } from "@/components/ps/partner-attachments";
import { DEMO_DAY } from "@/lib/demo-session";
import { setTicketDemo, useTickets } from "@/lib/tickets-l0";
import type { Partner, PartnerData, PartnerDeal } from "@/lib/debt-partner-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/ps/partners")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s["demo"] === "1" || s["demo"] === 1 ? 1 : undefined }),
  head: () => {
    const title = "จัดการ Partner — PM Workspace | Meridia Hotel ERP";
    const description = "ภาพรวม Partner ระบบ ORM ราคา ส่วนลด เอกสาร และคำขอเครดิตค่าระบบ สำหรับ PM";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: PartnerPage,
});

const thb = (n: number, cur = "THB") => (cur === "THB" ? `฿${Math.round(n).toLocaleString("en-US")}` : `${cur} ${Math.round(n).toLocaleString("en-US")}`);
const CYCLE: Record<string, string> = { MONTHLY: "รายเดือน", ADVANCE_3M: "ล่วงหน้า 3 เดือน", ADVANCE_6M: "ล่วงหน้า 6 เดือน", ANNUAL: "รายปี" };
const STATE_TH: Record<DealState, string> = { ACTIVE: "สำเร็จ · มีผลอยู่", UPCOMING: "สำเร็จ · รอเริ่ม", NEGOTIATING: "กำลังต่อรอง", EXPIRED: "หมดอายุ", FAILED: "ไม่สำเร็จ" };
const PM = "PM001-Alex";
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium";
type Contracts = ReturnType<typeof partnerContracts>;
type Focus = { req?: string | null; ans?: string | null; quick?: string | null };

/** property_id → hotel name (Partner contracts, then the DEMO extra hotels). */
function hotelNameOf(contracts: Contracts, pid: string) {
  return contracts.find((c) => c.property_id === pid)?.hotel ?? PARTNER_DEMO_EXTRA_HOTELS.find((h) => h.property_id === pid)?.hotel ?? pid;
}
function HotelLink({ pid, name, demo, children, testid }: { pid: string; name?: string; demo: boolean; children?: React.ReactNode; testid?: string }) {
  return <Link to="/ps/property-content/$hotelId" params={{ hotelId: pid }} search={{ ...(demo ? { demo: 1 as const } : {}) }} hash="orm" className="text-primary hover:underline" data-testid={testid}>{children ?? name}</Link>;
}

function PartnerPage() {
  const { demo } = Route.useSearch();
  const [ready, setReady] = useState(false);
  useEffect(() => { setPartnerDemo(!!demo); setTicketDemo(!!demo); setReady(true); }, [demo]);
  const [view, setView] = useState<PartnerView>({ v: "overview" });
  const [focus, setFocus] = useState<Focus>({});
  useEffect(() => {
    const sync = () => setView(viewOfHash(window.location.hash));
    sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, []);
  const go = (v: PartnerView, f: Focus = {}) => { setFocus(f); setView(v); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hashOfView(v)}`); };
  useEffect(() => { // scroll to a section / credit anchor
    const id = view.v === "partner" && view.section ? `sec-${view.section}` : view.v === "credit" && view.anchor ? view.anchor : null;
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 50); else window.scrollTo?.(0, 0);
  }, [view]);
  const [role, setRole] = useState<"PM" | "OTHER">("PM");
  const [help, setHelp] = useState(false);
  useTickets();
  const d = usePartnerData();
  const today = demo ? DEMO_DAY : new Date().toISOString().slice(0, 10);
  const contracts = useMemo(() => partnerContracts(d, !!demo), [d, demo]);
  const [form, setForm] = useState<PartnerFormMode>(null);
  if (!ready) return null;
  const isPm = role === "PM";
  const partner = view.v === "partner" ? d.partners.find((p) => p.id === view.id) ?? null : null;
  const common = { d, contracts, today, isPm, demo: !!demo, onForm: setForm, go };
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-4" data-testid="pm-partner-page">
      {demo && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">ข้อมูลสาธิต · 28 ตุลาคม 2569 · ไม่บันทึก</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <nav className="text-xs text-muted-foreground" data-testid="pm-breadcrumb">
            <Link to="/workspace/$dept" params={{ dept: "ps" }} search={{ demo, ticket: undefined }} className="hover:underline">PM Workspace</Link>
            {" › "}{view.v === "overview" ? <span>จัดการ Partner</span> : <button type="button" className="hover:underline" onClick={() => go({ v: "overview" })}>จัดการ Partner</button>}
            {partner && <> › <span>{partner.name}</span></>}{view.v === "credit" && <> › <span>คำขอเครดิตทั้งหมด</span></>}
          </nav>
          {view.v === "overview" && <>
            <h2 className="text-xl font-semibold">จัดการ Partner</h2>
            <p className="text-xs text-muted-foreground" data-testid="pm-partner-source">ระบบ ORM ที่ H+ ใช้ · ราคา · ส่วนลด · เอกสาร · คำขอเครดิต — แก้ไขได้ที่หน้านี้ที่เดียว ข้อมูลแสดงใน PS Dashboard แบบดูอย่างเดียว · <a href={`/ps?${demo ? "demo=1&" : ""}tab=ac`} className="text-primary hover:underline">เปิด PS Dashboard ↗</a></p>
          </>}
          {view.v === "credit" && <h2 className="text-xl font-semibold">คำขอเครดิตทั้งหมด</h2>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">สวมบท (โหมดทดสอบ)</span>
            <select aria-label="สวมบท Partner" className="rounded-md border bg-background px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as "PM" | "OTHER")}>
              <option value="PM">PM</option><option value="OTHER">ทีมอื่น · อ่านอย่างเดียว</option>
            </select>
          </label>
          {view.v === "overview" && <Button size="sm" variant="ghost" onClick={() => setHelp(!help)}>วิธีใช้</Button>}
          {view.v === "overview" && isPm && <AddPartnerButton go={go} />}
        </div>
      </div>
      {help && view.v === "overview" && (
        <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm" data-testid="pm-partner-help">
          <p><b>ภาพรวม</b> — สรุปค่าระบบ งานที่ต้องทำ และ Partner ทุกราย · กด <b>เปิดหน้า Partner</b> เพื่อดูทุกอย่างของ Partner นั้นในหน้าเดียว</p>
          <p><b>หน้า Partner</b> — เอกสาร · โรงแรมที่ใช้ระบบ · ราคา (Rate Card ขั้นบันไดตาม allotment แก้ราคา = เวอร์ชันใหม่) · ข้อเสนอ · คำขอเครดิต</p>
          <p><b>เอกสาร</b> — อัปโหลดไฟล์ได้เลย ไฟล์รอส่งเข้าที่เก็บของ Partner จนกว่าจะเชื่อม Google Drive</p>
          <p>ข้อมูลชุดเดียวกับ PS Dashboard การ์ด ③ ④ ⑤ และแถวค่าระบบในข้อมูลต่อสัญญา · แก้ไขได้เฉพาะ PM</p>
          <p>เตือนในงานที่ต้องทำ: ข้อเสนอใกล้หมดอายุ 30 วัน · คำขอเครดิตรอ Partner เกิน 7 วัน · ข้อเสนอกำลังต่อรองไม่อัปเดตเกิน 14 วัน</p>
        </div>
      )}
      {view.v === "overview" && <Overview {...common} />}
      {view.v === "partner" && (partner ? <PartnerDetail key={partner.id} {...common} partner={partner} focus={focus} /> : <p className="text-sm text-muted-foreground">ไม่พบ Partner นี้ · <button type="button" className="text-primary underline" onClick={() => go({ v: "overview" })}>กลับภาพรวม</button></p>)}
      {view.v === "credit" && <CreditTab d={d} contracts={contracts} today={today} isPm={isPm} demo={!!demo} autoReq={focus.req ?? null} autoAns={focus.ans ?? null} />}
      {isPm && <PartnerFormDrawer mode={form} onClose={() => setForm(null)} />}
    </div>
  );
}

function AddPartnerButton({ go }: { go: (v: PartnerView) => void }) {
  const [adding, setAdding] = useState(false); const [name, setName] = useState("");
  const add = () => { const r = addPartner(name, PM); if (!r.ok) { toast.error(r.error); return; } toast.success("เพิ่ม Partner แล้ว"); setName(""); setAdding(false); go({ v: "partner", id: r.id, section: null }); };
  return adding
    ? <span className="flex items-center gap-2"><Input aria-label="ชื่อ Partner" className="h-9 w-56" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ Partner" /><Button size="sm" onClick={add}>บันทึก</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>ยกเลิก</Button></span>
    : <Button size="sm" onClick={() => setAdding(true)} data-testid="pm-add-partner">+ เพิ่ม Partner</Button>;
}

type Common = { d: PartnerData; contracts: Contracts; today: string; isPm: boolean; demo: boolean; onForm: (m: PartnerFormMode) => void; go: (v: PartnerView, f?: Focus) => void };

/** Partner of a to-do item (A by name, B by request, C / D by deal). */
function todoPartner(d: PartnerData, contracts: Contracts, today: string, t: PartnerTodo): string | null {
  const ref = t.id.slice(2);
  if (t.kind === "C" || t.kind === "D") return d.partner_deals.find((x) => x.id === ref)?.partner_id ?? null;
  if (t.kind === "B") return d.system_credit_requests.find((x) => x.id === ref)?.partner_id ?? null;
  const r = creditSections(d, contracts, today).pending.find((x) => x.contract.contract_id === ref);
  return r ? d.partners.find((p) => p.name === r.partner)?.id ?? null : null;
}
const TODO_TAG: Record<PartnerTodo["kind"], [string, string, string]> = {
  A: ["ขอ keep credit", "bg-warning/15 text-warning-foreground", "ส่งคำขอ"],
  B: ["ตาม Partner", "bg-warning/15 text-warning-foreground", "บันทึกผล"],
  C: ["ใกล้หมดอายุ", "bg-primary/10 text-primary", "ต่อ / ปิดข้อเสนอ"],
  D: ["ไม่มีความคืบหน้า", "bg-primary/10 text-primary", "อัปเดตสถานะ"],
};
function runTodo(c: Common, t: PartnerTodo) {
  const ref = t.id.slice(2);
  if (t.kind === "A") c.go({ v: "credit", anchor: "credit-pending" }, { req: ref });
  else if (t.kind === "B") c.go({ v: "credit", anchor: "credit-waiting" }, { ans: ref });
  else {
    const deal = c.d.partner_deals.find((x) => x.id === ref); if (!deal) return;
    if (t.kind === "C") c.onForm({ kind: "deal", deal });
    else c.go({ v: "partner", id: deal.partner_id, section: "deals" }, { quick: deal.id });
  }
}

function useHotelCoverage(d: PartnerData, contracts: Contracts, today: string) {
  return useMemo(() => {
    const pids = new Set<string>([...d.property_partner_system.map((r) => r.property_id), ...contracts.filter((c) => c.service === "ORM" && c.property_id && (!c.end || c.end >= today)).map((c) => c.property_id!)]);
    const noSystem: string[] = [], noAllot: string[] = []; let set = 0;
    for (const pid of pids) {
      const cur = propertySystemOn(d, pid, today);
      const cps = cur ? null : contracts.find((c) => c.property_id === pid) && d.contract_partner_system.find((s) => s.contract_id === contracts.find((c) => c.property_id === pid)!.contract_id);
      if (!cur && !cps) { noSystem.push(pid); continue; }
      set++;
      if (cur && cur.allotment == null) noAllot.push(pid);
    }
    return { set, noSystem, noAllot };
  }, [d, contracts, today]);
}

function Overview(c: Common) {
  const { d, contracts, today, demo, go } = c;
  const rows = rateCardRows(d, contracts, today);
  const netThb = rows.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0), baseThb = rows.reduce((s, r) => s + (r.toThb(r.base) ?? 0), 0);
  const anyEst = rows.some((r) => r.card.currency !== "THB");
  const activeP = d.partners.filter((p) => rows.some((r) => r.card.partner_id === p.id && r.contracts > 0));
  const cov = useHotelCoverage(d, contracts, today);
  const credit = creditTiles(d);
  const todos = partnerTodoItems(d, contracts, today, "today", "PM");
  const [q, setQ] = useState("");
  const nameOf = (pid: string) => hotelNameOf(contracts, pid);
  const shown = d.partners.filter((p) => {
    const s = q.trim().toLowerCase(); if (!s) return true;
    return p.name.toLowerCase().includes(s) || partnerHotelRows(d, contracts, today, p.id, nameOf).some((h) => h.name.toLowerCase().includes(s));
  });
  return (
    <div className="space-y-4" data-testid="pm-overview">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="pm-summary">
        <Tile label="Partner ที่ใช้งาน" value={`${activeP.length} ราย`} sub={activeP.map((p) => p.name).join(" · ") || "–"} />
        <Tile label="ค่าระบบรวม / เดือน (หลังส่วนลด)" value={<span data-testid="pm-sum-net">{anyEst ? "≈ " : ""}{thb(netThb)}</span>} sub={`ก่อนส่วนลด ≈ ${thb(baseThb)}`} />
        <Tile label="โรงแรม ORM ที่ระบุระบบแล้ว" value={`${cov.set} โรงแรม`} sub={`ยังไม่ระบุ ${cov.noSystem.length} โรงแรม`} />
        <Tile label="เครดิตคงเหลือ" value={thb(credit.balance)} sub={credit.earliest ? `หมดอายุใกล้สุด ${dDMY(credit.earliest)}` : "ไม่มีเครดิต"} />
      </div>
      <section className="space-y-2" data-testid="pm-todo">
        <div className="flex flex-wrap items-baseline gap-2"><h3 className="font-medium">งานที่ต้องทำ · {todos.length} รายการ</h3><span className="text-xs text-muted-foreground">เรียงตามความเร่ง · กดเพื่อทำต่อได้ทันที</span></div>
        {todos.length ? (
          <div className="flex flex-wrap gap-2">
            {todos.map((t) => { const [tag, cls, act] = TODO_TAG[t.kind]; return (
              <div key={t.id} className="flex w-full flex-col gap-1 rounded-lg border bg-card p-2.5 text-sm sm:w-[calc(50%-0.25rem)] xl:w-[calc(25%-0.375rem)]" data-testid="pm-todo-card">
                <span className={cn(pill, "self-start", cls)}>{tag}</span>
                <span className="font-medium leading-snug">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.sub} · {t.due_relative}</span>
                {c.isPm && <button type="button" className="self-start text-xs font-medium text-primary underline" onClick={() => runTodo(c, t)} data-testid={`pm-todo-act-${t.kind}`}>{act} →</button>}
              </div>); })}
          </div>
        ) : <p className="text-sm text-muted-foreground">ไม่มีงานค้าง</p>}
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-2" data-testid="pm-partner-list">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Partner ทั้งหมด</h3>
            <Input aria-label="ค้นหา Partner" className="h-9 max-w-xs" placeholder="ชื่อ Partner หรือโรงแรม" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.map((p) => <PartnerCard key={p.id} c={c} p={p} todos={todos.filter((t) => todoPartner(d, contracts, today, t) === p.id)} />)}
          {!shown.length && <p className="text-sm text-muted-foreground">{d.partners.length ? "ไม่พบ Partner ที่ค้นหา" : "ยังไม่มี Partner"}</p>}
        </section>
        <aside className="space-y-3">
          <UpcomingChanges d={d} contracts={contracts} today={today} demo={demo} />
          <Incomplete c={c} cov={cov} />
          <section className="rounded-xl border bg-card p-3 text-sm" data-testid="pm-credit-box">
            <h3 className="mb-2 font-medium">เครดิตค่าระบบ (Keep credit)</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xs text-muted-foreground">ได้รับ</div><b className="tabular-nums">{thb(credit.gained)}</b></div>
              <div><div className="text-xs text-muted-foreground">ใช้แล้ว</div><b className="tabular-nums">{thb(credit.used)}</b></div>
              <div><div className="text-xs text-muted-foreground">คงเหลือ</div><b className="tabular-nums">{thb(credit.balance)}</b></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{credit.earliest ? `หมดอายุใกล้สุด ${dDMY(credit.earliest)}` : "ไม่มีเครดิตที่ได้รับ"}</p>
            <button type="button" className="mt-1 text-xs font-medium text-primary underline" onClick={() => go({ v: "credit", anchor: null })} data-testid="pm-credit-all">ดูคำขอเครดิตทั้งหมด →</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold tabular-nums">{value}</div><div className="truncate text-xs text-muted-foreground" title={sub}>{sub}</div></div>;
}

function partnerFacts(d: PartnerData, contracts: Contracts, today: string, p: Partner) {
  const rows = rateCardRows(d, contracts, today).filter((r) => r.card.partner_id === p.id);
  const card = rows[0]?.card ?? null;
  const base = rows.reduce((s, r) => s + r.base, 0), net = rows.reduce((s, r) => s + r.net, 0);
  const netThb = rows.reduce((s, r) => s + (r.toThb(r.net) ?? 0), 0);
  const deals = d.partner_deals.filter((x) => x.partner_id === p.id);
  const active = deals.filter((x) => getDealState(x, today) === "ACTIVE");
  const negotiating = deals.some((x) => x.status === "NEGOTIATING");
  const hotels = partnerHotelRows(d, contracts, today, p.id, (pid) => hotelNameOf(contracts, pid));
  return { rows, card, base, net, netThb, deals, active, negotiating, hotels, cur: card?.currency ?? "THB",
    systems: rows.map((r) => r.card.system_name).join(", ") || "ยังไม่มี Rate Card", cycle: card ? CYCLE[card.billing_cycle] : "–" };
}

function PartnerCard({ c, p, todos }: { c: Common; p: Partner; todos: PartnerTodo[] }) {
  const { d, contracts, today, isPm, go, onForm } = c;
  const f = partnerFacts(d, contracts, today, p);
  const att = partnerAttachments(d, p.id);
  const inUse = f.hotels.filter((h) => h.status !== "UPCOMING");
  const up = f.hotels.find((h) => h.status === "UPCOMING"), out = f.hotels.find((h) => h.status === "LEAVING");
  const noAllot = inUse.filter((h) => h.allotment == null).length;
  const status = f.active.length ? ["มีส่วนลดที่มีผล", "bg-success/15 text-success"] : f.negotiating ? ["กำลังต่อรอง", "bg-warning/15 text-warning-foreground"] : ["ไม่มีข้อเสนอ", "bg-muted text-muted-foreground"];
  const label = folderLabel(p.doc_folder_url);
  const open = (section: PartnerSection | null) => go({ v: "partner", id: p.id, section });
  return (
    <article className="space-y-3 rounded-xl border bg-card p-3" data-testid={`pm-pcard-${p.name}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 font-semibold text-primary" aria-hidden>{p.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{f.systems} · เรียกเก็บเป็น {f.cur} · {f.cycle}</div></div>
        <span className={cn(pill, status[1])}>{status[0]}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <Fig label="ค่าระบบ / เดือน (หลังส่วนลด)" value={thb(f.net, f.cur)} sub={<>ก่อนส่วนลด {thb(f.base, f.cur)}{f.active[0] ? ` · ${discountText(f.active[0])}` : ""}{f.cur !== "THB" && <span className="block">≈ {thb(f.netThb)} (estimate THB)</span>}</>} />
        <Fig label="โรงแรมที่ใช้" value={`${inUse.length} โรงแรม`} sub={up ? `รับเพิ่ม ${up.name} ${dDMY(up.date)}` : out ? `ย้ายออก ${out.name} ${dDMY(out.date)}` : noAllot ? <span className="text-warning-foreground">ยังไม่ระบุ allotment {noAllot} โรงแรม</span> : "ระบุ allotment ครบ"} />
        <Fig label="ข้อเสนอที่มีผล" value={`${f.active.length} ข้อเสนอ`} sub={f.active.map(discountText).join(" · ") || (f.negotiating ? "มีข้อเสนอกำลังต่อรอง" : "–")} />
        <Fig label="เอกสาร" value={`📎 ${att.length}`} sub={label ? `ที่เก็บ: ${label}` : <span className="font-medium text-warning-foreground">ยังไม่ตั้งที่เก็บเอกสาร</span>} />
      </div>
      {todos[0] && <p className="rounded-md bg-warning/10 px-2 py-1 text-xs text-warning-foreground" data-testid="pm-pcard-alert">⚠ {todos[0].title}{todos.length > 1 ? ` และอีก ${todos.length - 1} งาน` : ""}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => open(null)} data-testid={`pm-open-${p.name}`}>เปิดหน้า Partner</Button>
        <Button size="sm" variant="outline" onClick={() => open("docs")}>แนบเอกสาร</Button>
        {isPm && <Button size="sm" variant="outline" onClick={() => onForm({ kind: "deal", partnerId: p.id })}>เพิ่มข้อเสนอ</Button>}
        {isPm && <Button size="sm" variant="outline" onClick={() => onForm(f.card ? { kind: "rate", card: f.card } : { kind: "rate", partnerId: p.id })}>แก้ไขราคา</Button>}
      </div>
    </article>
  );
}
function Fig({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold tabular-nums">{value}</div><div className="text-xs text-muted-foreground">{sub}</div></div>;
}

function UpcomingChanges({ d, contracts, today, demo }: { d: PartnerData; contracts: Contracts; today: string; demo: boolean }) {
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const rows = d.property_partner_system.filter((x) => x.effective_from.slice(0, 10) > today).sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  return (
    <section className="rounded-xl border bg-card p-3 text-sm" data-testid="pm-upcoming-changes">
      <h3 className="mb-2 font-medium">การเปลี่ยนระบบที่กำลังจะมีผล</h3>
      <ul className="space-y-2">
        {rows.map((x) => { const old = propertySystemOn(d, x.property_id, today);
          return <li key={x.id} data-testid="pm-upcoming-row" className="text-xs">
            <HotelLink pid={x.property_id} name={hotelNameOf(contracts, x.property_id)} demo={demo} testid="pm-upcoming-hotel" />
            <div>{old ? pName(old.partner_id) : "ยังไม่ระบุระบบ"} → {pName(x.partner_id)}</div>
            <div className="text-muted-foreground">มีผล {dDMY(x.effective_from)} · อีก {daysBetween(today, x.effective_from)} วัน · <HotelLink pid={x.property_id} demo={demo}>ดูประวัติ →</HotelLink></div>
          </li>; })}
        {!rows.length && <li className="text-xs text-muted-foreground">ไม่มีการเปลี่ยนระบบที่รอมีผล</li>}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">เปลี่ยนระบบได้ที่หน้าโรงแรม (Hotel Profile › ORM) หรือในหน้า Partner › โรงแรม</p>
    </section>
  );
}

function Incomplete({ c, cov }: { c: Common; cov: { noSystem: string[]; noAllot: string[] } }) {
  const { d, contracts, demo, go } = c;
  const noFolder = d.partners.filter((p) => !p.doc_folder_url);
  const Hotels = ({ ids }: { ids: string[] }) => <span>{ids.slice(0, 3).map((pid, i) => <span key={pid}>{i ? ", " : ""}<HotelLink pid={pid} name={hotelNameOf(contracts, pid)} demo={demo} /></span>)}{ids.length > 3 ? ` และอีก ${ids.length - 3}` : ""}</span>;
  return (
    <section className="rounded-xl border bg-card p-3 text-sm" data-testid="pm-incomplete">
      <h3 className="mb-2 font-medium">ข้อมูลยังไม่ครบ</h3>
      <ul className="space-y-1.5 text-xs">
        <li><span className="font-medium text-warning-foreground">ยังไม่ระบุระบบ</span> · {cov.noSystem.length} โรงแรม{cov.noSystem.length > 0 && <> · <Hotels ids={cov.noSystem} /></>}</li>
        <li><span className="font-medium text-warning-foreground">ยังไม่ระบุ allotment (คิดราคาขั้นต่ำ)</span> · {cov.noAllot.length} โรงแรม{cov.noAllot.length > 0 && <> · <Hotels ids={cov.noAllot} /></>}</li>
        <li><span className="font-medium text-warning-foreground">Partner ยังไม่ตั้งที่เก็บเอกสาร</span> · {noFolder.length} ราย{noFolder.map((p) => <span key={p.id}> · <button type="button" className="text-primary underline" onClick={() => go({ v: "partner", id: p.id, section: "docs" })}>{p.name}</button></span>)}</li>
      </ul>
    </section>
  );
}

function PartnerDetail({ partner: p, focus, ...c }: Common & { partner: Partner; focus: Focus }) {
  const { d, contracts, today, isPm, demo, onForm } = c;
  const f = partnerFacts(d, contracts, today, p);
  const att = partnerAttachments(d, p.id);
  const inUse = f.hotels.filter((h) => h.status !== "UPCOMING").length;
  const allCredit = creditSections(d, contracts, today);
  const nCredit = allCredit.pending.filter((r) => r.partner === p.name).length + d.system_credit_requests.filter((r) => r.partner_id === p.id).length;
  const edit = () => onForm({ kind: "partner", partner: p });
  const nav: [PartnerSection, string][] = [["docs", `เอกสาร (${att.length})`], ["hotels", `โรงแรม (${inUse})`], ["price", "ราคา (Rate Card)"], ["deals", `ข้อเสนอ (${f.deals.length})`], ["credit", `คำขอเครดิต (${nCredit})`]];
  const [hist, setHist] = useState(false);
  const versions = f.card ? d.partner_rate_cards.filter((x) => x.partner_id === p.id && x.system_name === f.card!.system_name).sort((a, b) => b.effective_from.localeCompare(a.effective_from)) : [];
  return (
    <div className="space-y-4" data-testid="pm-partner-detail">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary" aria-hidden>{p.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{p.name}</h2><p className="text-xs text-muted-foreground">{f.systems} · เรียกเก็บเป็น {f.cur} · {f.cycle} · โรงแรมที่ใช้ {inUse}</p></div>
        {isPm && <Button size="sm" variant="outline" onClick={edit} data-testid="pm-edit-partner">แก้ไขข้อมูล Partner</Button>}
        <Button size="sm" onClick={() => c.go({ v: "partner", id: p.id, section: "docs" })}>แนบเอกสาร</Button>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" data-testid="pm-section-nav">
        {nav.map(([k, l]) => <button key={k} type="button" className="rounded-full border px-3 py-1 hover:bg-muted" onClick={() => c.go({ v: "partner", id: p.id, section: k })} data-testid={`pm-nav-${k}`}>{l}</button>)}
      </nav>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <section id="sec-docs" className="scroll-mt-4 space-y-2 rounded-xl border bg-card p-3" data-testid="pm-sec-docs">
            <h3 className="font-medium">เอกสาร</h3>
            <PartnerAttachmentsPanel partnerId={p.id} by={PM} isPm={isPm} onEditFolder={edit} />
          </section>
          <HotelsSection c={c} p={p} rows={f.hotels} />
          <section id="sec-deals" className="scroll-mt-4 space-y-2 rounded-xl border bg-card p-3" data-testid="pm-sec-deals">
            <h3 className="font-medium">ข้อเสนอและส่วนลด</h3>
            <DealsTab d={d} today={today} isPm={isPm} demo={demo} onForm={onForm} partnerId={p.id} quickFor={focus.quick ?? null} />
          </section>
        </div>
        <aside className="space-y-3">
          <section id="sec-price" className="scroll-mt-4 space-y-2 rounded-xl border bg-card p-3 text-sm" data-testid="pm-sec-price">
            <div className="flex items-center justify-between gap-2"><h3 className="font-medium">ค่าระบบ / เดือน</h3>{isPm && <Button size="sm" variant="outline" onClick={() => onForm(f.card ? { kind: "rate", card: f.card } : { kind: "rate", partnerId: p.id })}>แก้ไขราคา</Button>}</div>
            {f.card ? <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">ก่อนส่วนลด</dt><dd className="text-right tabular-nums">{thb(f.base, f.cur)}</dd>
                <dt className="text-muted-foreground">ส่วนลด</dt><dd className="text-right tabular-nums">{f.base > f.net ? `−${thb(f.base - f.net, f.cur)}` : "–"}{f.active.length > 0 && <span className="block text-xs text-muted-foreground">{f.active.map(discountText).join(" · ")} ของค่าระบบสัญญาที่อยู่ในข้อเสนอ</span>}</dd>
                <dt className="font-medium">สุทธิ</dt><dd className="text-right font-semibold tabular-nums" data-testid="pm-price-net">{thb(f.net, f.cur)}{f.cur !== "THB" && <span className="block text-xs font-normal text-muted-foreground">≈ {thb(f.netThb)} (estimate THB)</span>}</dd>
              </dl>
              {isPm ? <table className="w-full text-xs"><thead className="text-left text-muted-foreground"><tr><th>allotment</th><th className="text-right">ราคา / สัญญา / เดือน</th></tr></thead>
                <tbody>{tiersOf(d, f.card.id).map((t) => <tr key={t.id} className="border-t"><td>{t.allotment_min}–{t.allotment_max ?? "ขึ้นไป"}</td><td className="text-right tabular-nums">{thb(t.price_per_contract_month, f.cur)}</td></tr>)}</tbody></table>
                : <p className="text-xs text-muted-foreground">ราคาขั้นบันไดแสดงเฉพาะ PM</p>}
              <p className="text-xs text-muted-foreground">ราคาขั้นบันไดตาม allotment · ราคาชุดปัจจุบันมีผลตั้งแต่ {dDMY(f.card.effective_from)} · <button type="button" className="text-primary underline" onClick={() => setHist(!hist)}>ประวัติราคา</button></p>
              {hist && <ul className="text-xs" data-testid="pm-rate-history">{versions.map((v) => <li key={v.id}>{dDMY(v.effective_from)} – {v.superseded_at ? dDMY(v.superseded_at) : "ปัจจุบัน"} · {tiersOf(d, v.id).map((t) => thb(t.price_per_contract_month, v.currency)).join(" / ")}</li>)}</ul>}
            </> : <p className="text-xs text-muted-foreground">ยังไม่มี Rate Card</p>}
          </section>
          <section className="space-y-2 rounded-xl border bg-card p-3 text-sm" data-testid="pm-sec-info">
            <div className="flex items-center justify-between gap-2"><h3 className="font-medium">ข้อมูล Partner</h3>{isPm && <button type="button" className="text-xs text-primary underline" onClick={edit}>แก้ไข</button>}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">ผู้ติดต่อ</dt><dd>{p.contact_name || "–"}</dd>
              <dt className="text-muted-foreground">อีเมล</dt><dd>{p.contact_email || "–"}</dd>
              <dt className="text-muted-foreground">โทร</dt><dd>{p.contact_phone || "–"}</dd>
              <dt className="text-muted-foreground">สกุลเงิน</dt><dd>{f.cur}</dd>
              <dt className="text-muted-foreground">รอบเรียกเก็บ</dt><dd>{f.cycle}</dd>
              <dt className="text-muted-foreground">ที่เก็บเอกสาร</dt><dd>{folderLabel(p.doc_folder_url) ?? <span className="font-medium text-warning-foreground">ยังไม่ตั้งที่เก็บเอกสาร</span>}</dd>
              {p.note && <><dt className="text-muted-foreground">หมายเหตุ</dt><dd>{p.note}</dd></>}
            </dl>
          </section>
          <section id="sec-credit" className="scroll-mt-4 space-y-2 rounded-xl border bg-card p-3 text-sm" data-testid="pm-sec-credit">
            <h3 className="font-medium">คำขอเครดิต</h3>
            {nCredit ? <CreditTab d={d} contracts={contracts} today={today} isPm={isPm} demo={demo} partnerId={p.id} compact /> : <p className="text-xs text-muted-foreground">ไม่มีคำขอของ Partner นี้</p>}
            <button type="button" className="text-xs text-primary underline" onClick={() => c.go({ v: "credit", anchor: null })}>ดูคำขอเครดิตทั้งหมด →</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HotelsSection({ c, p, rows }: { c: Common; p: Partner; rows: PartnerHotelRow[] }) {
  const { d, demo, today } = c;
  const [q, setQ] = useState(""); const [all, setAll] = useState(false); const [histFor, setHistFor] = useState<string | null>(null);
  const pName = (id: string | null) => (id ? d.partners.find((x) => x.id === id)?.name ?? id : "ยังไม่ระบุระบบ");
  const inUse = rows.filter((r) => r.status !== "UPCOMING").length, incoming = rows.filter((r) => r.status === "UPCOMING").length;
  const filtered = rows.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = all ? filtered : filtered.slice(0, 10);
  const hist = histFor ? propertySystemHistory(d, histFor) : [];
  const tags = historyTag(hist, today);
  return (
    <section id="sec-hotels" className="scroll-mt-4 space-y-2 rounded-xl border bg-card p-3" data-testid="pm-sec-hotels">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">โรงแรมที่ใช้ระบบนี้ · {inUse}{incoming > 0 && <span className="ml-1 text-sm font-normal text-primary">+ รับเข้า {incoming}</span>}</h3>
        <Input aria-label="ค้นหาโรงแรม" className="h-8 max-w-xs" placeholder="ค้นหาโรงแรม" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="ac-table w-full text-sm" data-testid="pm-hotel-table">
          <thead><tr><th>โรงแรม</th><th>Allotment</th><th>ใช้ตั้งแต่</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.pid} data-testid={`pm-hotel-${r.pid}`}>
                <td><HotelLink pid={r.pid} name={r.name} demo={demo} /></td>
                <td className="tabular-nums">{r.allotment != null ? r.allotment : <span className="font-medium text-warning-foreground">ยังไม่ระบุ · <HotelLink pid={r.pid} demo={demo}>ระบุ</HotelLink></span>}</td>
                <td className="whitespace-nowrap">{dDMY(r.from)}</td>
                <td data-testid="pm-hotel-status">{r.status === "ACTIVE" ? <span className={cn(pill, "bg-success/15 text-success")}>ใช้งาน</span>
                  : r.status === "UPCOMING" ? <span className={cn(pill, "bg-primary/10 text-primary")}>รอมีผล · ย้ายมาจาก {pName(r.other)}</span>
                  : <span className={cn(pill, "bg-muted text-muted-foreground")}>ย้ายออก {dDMY(r.date)} → {pName(r.other)}</span>}</td>
                <td><button type="button" className="text-xs text-primary underline" onClick={() => setHistFor(histFor === r.pid ? null : r.pid)} data-testid={`pm-hist-${r.pid}`}>ประวัติระบบ</button></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5} className="text-muted-foreground">ยังไม่มีโรงแรมที่ใช้ระบบนี้</td></tr>}
          </tbody>
        </table>
      </div>
      {!all && filtered.length > 10 && <button type="button" className="text-xs text-primary underline" onClick={() => setAll(true)}>ดูทั้งหมด {filtered.length} โรงแรม →</button>}
      {histFor && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs" data-testid="pm-hist-panel">
          <div className="flex items-center justify-between"><b className="text-sm">ประวัติระบบ · {hotelNameOf(c.contracts, histFor)}</b><button type="button" className="text-muted-foreground" onClick={() => setHistFor(null)} aria-label="ปิด">✕</button></div>
          <ul className="space-y-1">{hist.map((h) => (
            <li key={h.id} data-testid="pm-hist-row">
              <span className={cn(pill, "mr-1", tags[h.id] === "FUTURE" ? "bg-warning/15 text-warning-foreground" : tags[h.id] === "CURRENT" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{tags[h.id] === "FUTURE" ? `รอมีผล ${dDMY(h.effective_from)}` : tags[h.id] === "CURRENT" ? "ใช้อยู่ตอนนี้" : "เดิม"}</span>
              {dDMY(h.effective_from)} · {pName(h.partner_id)} · {h.system_name} · allotment {h.allotment ?? "—"} · บันทึกโดย {h.set_by}{h.note ? ` · ${h.note}` : ""}
            </li>))}
            {!hist.length && <li className="text-muted-foreground">ยังไม่มีประวัติ (ระบบมาจากสัญญา)</li>}
          </ul>
          <HotelLink pid={histFor} demo={demo}>เปิด Hotel Profile › ORM ↗</HotelLink>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">{p.name}: เปลี่ยนระบบหรือ allotment ได้ที่ Hotel Profile › ORM</p>
    </section>
  );
}

type Chip = "LIVE" | "NEG" | "DONE" | "ALL";
function DealsTab({ d, today, isPm, demo, onForm, partnerId, quickFor }: { d: PartnerData; today: string; isPm: boolean; demo: boolean; onForm: (m: PartnerFormMode) => void; partnerId?: string; quickFor?: string | null }) {
  const [chip, setChip] = useState<Chip>(quickFor ? "ALL" : "LIVE");
  const [quick, setQuick] = useState<{ deal: PartnerDeal; to: "SUCCESS" | "FAILED"; start: string; end: string } | null>(null);
  useEffect(() => { const x = quickFor ? d.partner_deals.find((y) => y.id === quickFor) : null; if (x) setQuick({ deal: x, to: "SUCCESS", start: x.start_date ?? "", end: x.end_date ?? "" }); }, [quickFor]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = dealChipCounts(d, today);
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const shown = d.partner_deals.filter((x) => !partnerId || x.partner_id === partnerId).filter((x) => { const s = getDealState(x, today); return chip === "ALL" || (chip === "LIVE" ? s === "ACTIVE" || s === "UPCOMING" : chip === "NEG" ? s === "NEGOTIATING" : s === "EXPIRED" || s === "FAILED"); });
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
        {isPm && <Button size="sm" onClick={() => onForm({ kind: "deal", partnerId })}>+ เพิ่มข้อเสนอ</Button>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="ac-table w-full text-sm">
          <thead><tr><th>ประเภท</th><th>Partner</th><th>รายละเอียด</th><th>ช่วงที่มีผล</th><th>สถานะ</th><th>ส่งบัญชี</th><th>อัปเดตล่าสุด</th>{isPm && <th />}</tr></thead>
          <tbody>
            {shown.map((x) => {
              const s = getDealState(x, today);
              return (
                <tr key={x.id} data-testid={`pm-deal-${x.id}`} className={cn(s === "ACTIVE" && x.end_date && daysBetween(today, x.end_date) <= REMIND.DEAL_END_DAYS && "bg-warning/10")}>
                  <td>{x.kind === "PERK" ? "สิทธิพิเศษ" : "ลดต้นทุนค่าระบบ"}</td><td>{pName(x.partner_id)}</td><td>{x.title}</td>
                  <td className="whitespace-nowrap">{x.start_date ? `${dDMY(x.start_date)} – ${x.end_date ? dDMY(x.end_date) : "until further notice"}` : "–"}</td>
                  <td>{STATE_TH[s]}</td><td><AcNotice id={x.ac_ticket_id} demo={demo} /></td>
                  <td className={cn("whitespace-nowrap", isStaleNegotiation(x, today) && "font-medium text-warning-foreground")} data-testid="pm-deal-updated">{dDMY(x.updated_at)}</td>
                  {isPm && <td className="whitespace-nowrap"><button type="button" className="ac-link" onClick={() => onForm({ kind: "deal", deal: x })}>แก้ไข</button>
                    {x.status === "SUCCESS" && <> · <button type="button" className="ac-link" onClick={() => onForm({ kind: "deal", deal: x })}>ต่อ / ปิด</button></>}
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

function CreditTab({ d, contracts, today, isPm, demo, partnerId, autoReq, autoAns }: { d: PartnerData; contracts: ReturnType<typeof partnerContracts>; today: string; isPm: boolean; demo: boolean; partnerId?: string; autoReq?: string | null; autoAns?: string | null; compact?: boolean }) {
  const all = creditSections(d, contracts, today);
  const pName0 = partnerId ? d.partners.find((p) => p.id === partnerId)?.name : null;
  const pending = partnerId ? all.pending.filter((r) => r.partner === pName0) : all.pending;
  const waiting = partnerId ? all.waiting.filter((w) => w.req.partner_id === partnerId) : all.waiting;
  const closed = partnerId ? all.closed.filter((c) => c.req.partner_id === partnerId) : all.closed;
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  const [req, setReq] = useState<{ i: number; amount: string; note: string; att: string } | null>(null);
  const [ans, setAns] = useState<{ id: string; hotel: string; result: "APPROVED" | "REJECTED"; amount: string; exp: string; att: string; note: string } | null>(null);
  const at = demo ? `${today}T09:00:00.000Z` : undefined;
  useEffect(() => { // v1.2 PW24: a to-do action opens its form directly
    if (autoReq) { const i = pending.findIndex((r) => r.contract.contract_id === autoReq); if (i >= 0) setReq({ i, amount: String(pending[i]!.amount), note: "", att: "" }); }
    if (autoAns) { const w = waiting.find((x) => x.req.id === autoAns); if (w) setAns({ id: w.req.id, hotel: w.contract?.hotel ?? w.req.contract_id, result: "APPROVED", amount: String(w.req.amount), exp: "", att: "", note: "" }); }
  }, [autoReq, autoAns]); // eslint-disable-line react-hooks/exhaustive-deps
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

