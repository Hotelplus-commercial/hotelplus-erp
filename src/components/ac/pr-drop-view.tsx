/* PR-O1 views: sender (ORM / MKT) · lead overview (ORM_LEAD / GRM / MKT_LEAD, no money) · AC panel (full page, AC / HOC / MD). */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bangkokDate } from "@/lib/ac-v2-engine";
import { AC_OPEN_NOTES } from "@/lib/ac-open-notes";
import { useCrmOptional } from "@/lib/crm-store";
import { DEMO_DAY, psDemoOn } from "@/lib/demo-session";
import { openPartnerFile } from "@/lib/partner-files";
import { leadCounters, leadRow, revenueConflict, STATUS_TONE, statusText, type PrItem, type PrService, type PrStatus } from "@/lib/pr-drop";
import { ackConflict, addFiles, itemsFor, openMonths, recordCustomer, recordSentCustomer, remindCaretaker, returnToSender, runPrBells, sendToAc, usePrDrops } from "@/lib/pr-drop-store";
import { cn } from "@/lib/utils";

const TONE: Record<ReturnType<() => (typeof STATUS_TONE)[PrStatus]>, string> = {
  grey: "bg-muted text-muted-foreground", yellow: "bg-warning/20 text-warning-foreground", red: "bg-destructive/15 text-destructive",
  orange: "bg-warning/40 text-warning-foreground", green: "bg-success/15 text-success", blue: "bg-info/15 text-info",
};
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const monthLabel = (m: string) => `${MONTH_TH[+m.slice(5, 7) - 1]} ${String(+m.slice(0, 4) + 543).slice(2)}`;
const thb = (n: number) => `฿${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function StatusChip({ i }: { i: PrItem }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs whitespace-nowrap", TONE[STATUS_TONE[i.status]])} data-testid="pr-status">{statusText(i)}</span>;
}

function usePr() {
  const crm = useCrmOptional();
  const [demo, setDemo] = useState(false);
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get("demo") === "1" || psDemoOn()); }, []);
  usePrDrops();
  const today = demo ? DEMO_DAY : bangkokDate();
  const months = openMonths(today);
  const [month, setMonth] = useState<string | null>(null);
  const m = month ?? months[0]!;
  const items = itemsFor(demo, m, today, crm ? { contracts: crm.contracts, invoices: crm.invoices } : undefined);
  return { demo, today, months, month: m, setMonth, items, crm };
}
function MonthPicker({ months, month, setMonth }: { months: string[]; month: string; setMonth: (m: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">เดือนบริการ
      <select aria-label="เดือนบริการ" className="h-9 rounded-md border bg-background px-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
        {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
    </label>
  );
}
function Banner({ demo, today }: { demo: boolean; today: string }) {
  return <p className="text-xs text-muted-foreground">ตัดรอบวันที่ 3 ของเดือนถัดไป 23:59 · ส่งไฟล์ให้ AC แล้วและลูกค้าไม่ตอบภายในวันตัดรอบ = ลูกค้ายืนยัน{demo ? ` · DEMO · วันนี้ ${today}` : ""}</p>;
}

/* ---------------- sender ---------------- */
export function PrSenderView({ service }: { service: PrService }) {
  const { demo, today, months, month, setMonth, items } = usePr();
  const mine = items.filter((i) => i.service === service);
  const people = [...new Set(mine.map((i) => i.caretaker))].sort();
  const [who, setWho] = useState("");
  const shown = mine.filter((i) => !who || i.caretaker === who);
  useEffect(() => { runPrBells(demo, items, today); }, [demo, items.length, today]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3" data-testid="pr-sender">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker months={months} month={month} setMonth={setMonth} />
        <label className="flex items-center gap-2 text-sm">ผู้ดูแล (ทดสอบ)
          <select aria-label="ผู้ดูแล" className="h-9 rounded-md border bg-background px-2 text-sm" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">ทุกคน</option>{people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <Banner demo={demo} today={today} />
      {shown.length ? <div className="grid gap-3 lg:grid-cols-2">{shown.map((i) => <SenderCard key={i.id} i={i} demo={demo} today={today} />)}</div>
        : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีรายการของเดือนนี้</p>}
    </div>
  );
}
function SenderCard({ i, demo, today }: { i: PrItem; demo: boolean; today: string }) {
  const crm = useCrmOptional();
  const [sentDate, setSentDate] = useState(today);
  const [reason, setReason] = useState("");
  const [rev, setRev] = useState(i.row?.revenue_thb != null ? String(i.row.revenue_thb) : "");
  const locked = i.status === "READY" || i.status === "BILLED";
  const done = (o: { ok: boolean; error?: string }, msg: string) => (o.ok ? toast.success(msg) : toast.error((o as { error: string }).error));
  const acRevenue = () => {
    if (!crm || !i.commission_sku) return null;
    const r = crm.reports.find((x) => x.contract_id === i.contract_id && x.sku === i.commission_sku && x.period_year === +i.month.slice(0, 4) && x.period_month === +i.month.slice(5, 7));
    return r ? r.revenue_thb : null;
  };
  return (
    <article className="space-y-2 rounded-lg border bg-card p-3 text-sm" data-testid="pr-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><div className="font-medium">{i.hotel}</div><div className="text-xs text-muted-foreground">{i.service} · {monthLabel(i.month)} · ผู้ดูแล {i.caretaker} · ตัดรอบ {i.cutoff}</div></div>
        <StatusChip i={i} />
      </div>
      {i.row?.return_reason && i.status === "RETURNED" && <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">AC ส่งกลับแก้: {i.row.return_reason}</p>}
      {i.row?.dispute_reason && i.status === "DISPUTE" && <p className="rounded bg-warning/20 px-2 py-1 text-xs">ลูกค้าแย้ง: {i.row.dispute_reason}</p>}
      {!locked && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="วันที่ส่งลูกค้าตรวจ" type="date" className="h-8 w-40" value={sentDate} onChange={(e) => setSentDate(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => done(recordSentCustomer(demo, i, sentDate, i.caretaker), "บันทึกส่งลูกค้าตรวจแล้ว")}>ส่งลูกค้าตรวจแล้ว</Button>
            {i.row?.sent_customer_at && <span className="text-xs text-muted-foreground">ส่งลูกค้า {i.row.sent_customer_at.slice(0, 10)}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => done(recordCustomer(demo, i, "CONFIRMED", "", i.caretaker), "บันทึกลูกค้ายืนยัน")}>ลูกค้ายืนยัน</Button>
            <Input aria-label="เหตุผลที่ลูกค้าแย้ง" className="h-8 w-56" placeholder="เหตุผลที่ลูกค้าแย้ง" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => done(recordCustomer(demo, i, "DISPUTED", reason, i.caretaker), "บันทึกลูกค้าแย้ง")}>ลูกค้าแย้ง</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs">ไฟล์ PDF (ไม่เกิน 20 MB)
              <input aria-label="แนบไฟล์ PDF" type="file" accept="application/pdf,.pdf" multiple className="ml-2 text-xs"
                onChange={async (e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ""; if (fs.length) done(await addFiles(demo, i, fs, i.caretaker), `แนบ ${fs.length} ไฟล์แล้ว`); }} />
            </label>
          </div>
          {i.needs_revenue && <label className="flex items-center gap-2 text-xs">รายได้ที่ใช้คิดค่าคอม (฿)<Input aria-label="รายได้ที่ใช้คิดค่าคอม" type="number" min={0} className="h-8 w-40" value={rev} onChange={(e) => setRev(e.target.value)} /></label>}
          <Button size="sm" onClick={() => done(sendToAc(demo, i, rev.trim() === "" ? null : Number(rev), i.caretaker, acRevenue()), "ส่งไฟล์ให้ AC แล้ว")} data-testid="pr-send-ac">ส่งไฟล์ให้ AC</Button>
        </div>
      )}
      <Files i={i} />
    </article>
  );
}
function Files({ i }: { i: PrItem }) {
  if (!i.row?.files.length) return <p className="text-xs text-muted-foreground">ยังไม่มีไฟล์</p>;
  return (
    <ul className="space-y-0.5 text-xs" data-testid="pr-files">
      {i.row.files.map((f) => <li key={f.ref}><button type="button" className="text-primary underline" onClick={() => void openPartnerFile(f.ref)}>v{f.version} · {f.name}</button> <span className="text-muted-foreground">· {f.at.slice(0, 10)}</span></li>)}
    </ul>
  );
}

/* ---------------- lead overview (no money) ---------------- */
export function PrLeadView({ service }: { service: PrService }) {
  const { demo, today, months, month, setMonth, items } = usePr();
  const c = leadCounters(items);
  const [team, setTeam] = useState(""); const [st, setSt] = useState("");
  const rows = items.filter((i) => i.service === service).map(leadRow);
  const teams = [...new Set(rows.map((r) => r.team))].sort();
  const statuses = [...new Set(rows.map((r) => r.status))];
  const shown = rows.filter((r) => (!team || r.team === team) && (!st || r.status === st));
  return (
    <div className="space-y-3" data-testid="pr-lead">
      <div className="flex flex-wrap items-center gap-3"><MonthPicker months={months} month={month} setMonth={setMonth} /></div>
      <Banner demo={demo} today={today} />
      <div className="grid gap-2 sm:grid-cols-2">
        {(["ORM", "Marcom"] as const).map((s) => (
          <div key={s} className={cn("rounded-lg border p-3 text-sm", s !== service && "opacity-60")} data-testid={`pr-counter-${s}`}>
            <div className="text-xs text-muted-foreground">{s}</div>
            <div className="font-semibold">ส่ง AC แล้ว {c[s].sent} / {c[s].total} · เลยตัดรอบ {c[s].late}</div>
            {c[s].dispute > 0 && <div className="text-xs text-muted-foreground">ลูกค้าแย้ง {c[s].dispute}</div>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <select aria-label="ทีม" className="h-9 rounded-md border bg-background px-2" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">ทุกทีม</option>{teams.map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="สถานะ" className="h-9 rounded-md border bg-background px-2" value={st} onChange={(e) => setSt(e.target.value)}><option value="">ทุกสถานะ</option>{statuses.map((s) => <option key={s} value={s}>{statusText({ status: s, late_days: 0, auto_confirmed: false }).replace(" 0 วัน", "")}</option>)}</select>
      </div>
      <table className="w-full text-sm" data-testid="pr-lead-table">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">โรงแรม</th><th>ทีม</th><th>ผู้ดูแล</th><th>สถานะ</th><th>ไฟล์</th><th /></tr></thead>
        <tbody>
          {shown.map((r) => { const it = items.find((x) => x.id === r.id)!; return (
            <tr key={r.id} className="border-t">
              <td className="py-1.5">{r.hotel}</td><td>{r.team}</td><td>{r.caretaker}</td><td><StatusChip i={it} /></td><td className="tabular-nums">{r.files}</td>
              <td>{!["READY", "BILLED"].includes(r.status) && <Button size="sm" variant="outline" onClick={() => toast[remindCaretaker(demo, it, today) ? "success" : "info"](remindCaretaker.length ? "เตือนผู้ดูแลแล้ว" : "")} data-testid="pr-remind">เตือนผู้ดูแล</Button>}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- AC / HOC / MD panel ---------------- */
export function PrAcPanel() {
  const { demo, today, months, month, setMonth, items, crm } = usePr();
  const [reason, setReason] = useState<Record<string, string>>({});
  const notes = useMemo(() => AC_OPEN_NOTES.filter((n) => demo ? false : (crm?.contracts ?? []).some((c) => c.contract_id === n.contract_id)), [demo, crm]);
  const inv = (i: PrItem) => crm?.invoices.find((x) => x.status !== "void" && x.contract_ids.includes(i.contract_id) && x.lines.some((l) => l.line_type === "commission" && (l.service_month ?? x.billing_period_start.slice(0, 7)) === i.month));
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" data-testid="pr-ac-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">ไฟล์ Production Report จากทีม (รอบตัด 3)</h2>
        <MonthPicker months={months} month={month} setMonth={setMonth} />
      </div>
      <Banner demo={demo} today={today} />
      {notes.map((n) => <p key={n.contract_id} className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning-foreground" data-testid="ac-open-note">⚠ {n.text}</p>)}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">โรงแรม</th><th>บริการ</th><th>สถานะ</th><th>ไฟล์</th><th className="text-right">รายได้</th><th className="text-right">ค่าคอม</th><th /></tr></thead>
        <tbody>
          {items.map((i) => { const invoice = inv(i); return (
            <tr key={i.id} className="border-t align-top" data-testid="pr-ac-row">
              <td className="py-1.5">{i.hotel}<div className="text-xs text-muted-foreground">{i.caretaker}</div>
                {revenueConflict(i.row) && <div className="mt-1 rounded bg-warning/20 px-2 py-1 text-xs" data-testid="pr-conflict">รายได้ใน Production Report ต่างจากที่ AC กรอกไว้ {thb(i.row!.ac_prev_revenue!)} → {thb(i.row!.revenue_thb!)} <button type="button" className="ml-1 underline" onClick={() => ackConflict(demo, i)}>รับทราบ</button></div>}
              </td>
              <td>{i.service}</td>
              <td><StatusChip i={i} />{invoice && <div className="text-xs text-muted-foreground">ใบแจ้งหนี้ {invoice.invoice_id}</div>}</td>
              <td><Files i={i} /></td>
              <td className="text-right tabular-nums">{i.row?.revenue_thb != null ? thb(i.row.revenue_thb) : "—"}</td>
              <td className="text-right tabular-nums">{i.row?.revenue_thb != null && i.commission_rate != null ? thb(Math.round(i.row.revenue_thb * i.commission_rate * 100) / 100) : "—"}</td>
              <td className="space-y-1">{["SENT_AC", "READY", "DISPUTE"].includes(i.status) && <>
                <Input aria-label="เหตุผลที่ส่งกลับแก้" className="h-8 w-40" placeholder="เหตุผล" value={reason[i.id] ?? ""} onChange={(e) => setReason({ ...reason, [i.id]: e.target.value })} />
                <Button size="sm" variant="outline" onClick={() => { const o = returnToSender(demo, i, reason[i.id] ?? ""); if (o.ok) toast.success("ส่งกลับแก้แล้ว"); else toast.error(o.error); }} data-testid="pr-return">ส่งกลับแก้</Button>
              </>}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </section>
  );
}
