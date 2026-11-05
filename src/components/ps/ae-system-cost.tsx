/* AE Workspace System Cost / Shut-off v1.0 — tile ต้นทุนค่าระบบ (AW1/AW2), Mark as Done warning (AW3/AW4),
 * My Day group 🔌 ปิด / เปิดระบบ + ticket drawer (AW5–AW8). Reads only; ticket moves via Layer 0 transition(). */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoButton } from "@/components/ps/dash-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AW_TH, aeNextAction, aeShutoffItems, cardPartnerContract, costTile, keepCreditWarning, sameAe, type AeShutoffItem } from "@/lib/ae-system-cost";
import { getContractSystemCost } from "@/lib/debt-partner-calc";
import { isPartnerDemo, setPartnerDemo, usePartnerData } from "@/lib/debt-partner-store";
import { partnerContracts } from "@/lib/partner-contracts";
import { partnerToday, seedShutoffDemo } from "@/lib/partner-todo";
import { seedAcBillsDemo } from "@/lib/partner-shutoff-ac";
import { psDemoOn } from "@/lib/demo-session";
import { STATUS_TH, TYPE_TH, setTicketDemo, transition, useTickets, type L0Ticket } from "@/lib/tickets-l0";
import { shutoffAe, shutoffTwin } from "@/lib/partner-workspace";
import { thDate } from "@/lib/contract-age";
import { useWs2 } from "@/lib/ws2-store";
import type { RenewalCard } from "@/lib/ps-renewal";

const money = (cur: string, n: number) => (cur === "THB" ? `฿${Math.round(n).toLocaleString("en-US")}` : `${cur} ${n.toLocaleString("en-US")}`);
const Amber = ({ children, testId }: { children: React.ReactNode; testId?: string }) => <span className="text-xs font-medium text-warning-foreground" data-testid={testId}>{children}</span>;

/** DEMO follows the shared DEMO state (one ticket list: the AC / PM seeds are idempotent, never a second copy). */
function useSharedDemo() {
  useEffect(() => {
    const on = psDemoOn();
    setPartnerDemo(on); setTicketDemo(on);
    if (on) { seedShutoffDemo(); seedAcBillsDemo(); }
  }, []);
}

function useCardContract(card: RenewalCard) {
  useSharedDemo();
  const d = usePartnerData();
  const c = useMemo(() => cardPartnerContract(d, isPartnerDemo(), card), [d, card]);
  return { d, c };
}

export function SystemCostTile({ card }: { card: RenewalCard }) {
  const { d, c } = useCardContract(card);
  const v = costTile(d, c, partnerToday());
  return (
    <div className="rounded-lg border p-2.5 text-sm md:w-1/2" data-testid="aw-cost-tile">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{AW_TH.tile}<InfoButton info={{ source: AW_TH.tile, count: "", read: AW_TH.info }} /></div>
      {v.kind === "MARCOM" ? <p className="mt-1 text-muted-foreground">{AW_TH.marcom}</p>
        : v.kind === "NO_SYSTEM" ? <p className="mt-1"><Amber>{AW_TH.noSystem}</Amber></p>
        : (
          <>
            <p className="mt-1"><span className="font-display text-xl font-bold tabular-nums">{money(v.currency, v.net)}</span> <span className="text-xs text-muted-foreground">/ เดือน · {v.partner} {v.system}</span></p>
            {v.est_thb != null && <p className="text-xs text-muted-foreground">estimate THB ≈ ฿{v.est_thb.toLocaleString("en-US")}</p>}
            <p className="text-xs text-muted-foreground">
              <span>ราคาปกติตามขั้น allotment </span><span className={v.discounted ? "line-through" : ""}>{money(v.currency, v.base)}</span>
              {v.discounts.map((x, i) => <span key={i}> · ส่วนลด {x.label}{x.start ? ` ตั้งแต่ ${thDate(x.start)}` : ""}</span>)}
              {v.cycle && <span> · H+ จ่าย{v.cycle}</span>}
              <span> · จ่ายถึง {v.prepaid_until ? thDate(v.prepaid_until) : "–"}</span>
            </p>
            {v.months_over > 0 && <Amber testId="aw-over">เกินวันสิ้นสุดสัญญา {v.months_over} เดือน</Amber>}
          </>
        )}
    </div>
  );
}

export function KeepCreditWarning({ card }: { card: RenewalCard }) {
  const { d, c } = useCardContract(card);
  const w = keepCreditWarning(d, c);
  if (!w) return null;
  return (
    <div className="rounded-lg border border-warning bg-warning/10 p-2.5 text-xs text-warning-foreground" data-testid="aw-keep-credit">
      ⚠ H+ จ่ายค่าระบบของสัญญานี้ไว้ถึง {thDate(w.prepaid_until)} · เกินวันสิ้นสุดสัญญา {w.months_over} เดือน (≈ ฿{w.amount.toLocaleString("en-US")}) · ระบบจะแจ้ง PM ให้ขอ {w.partner} เก็บเป็นเครดิต · AE ไม่ต้องทำอะไรเพิ่ม
    </div>
  );
}

/* ---------- My Day 🔌 ---------- */
export function AeShutoffGroup({ currentUser }: { currentUser: string }) {
  useSharedDemo();
  const all = useTickets();
  const w = useWs2();
  const [open, setOpen] = useState<string | null>(null);
  const items = useMemo(() => aeShutoffItems(all, currentUser, (h) => w.properties.find((p) => p.hotel_id === h)?.assigned_ae_id, partnerToday()), [all, currentUser, w.properties]);
  const cur = all.find((t) => t.ticket_id === open) ?? null;
  if (!items.length && !cur) return null;
  return (
    <div data-testid="aw-shutoff-group">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><span>🔌</span> {AW_TH.group} ({items.length})</p>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.t.ticket_id}>
            <button type="button" onClick={() => setOpen(it.t.ticket_id)} className="w-full rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted/60">
              <span className="flex items-center justify-between gap-2"><span className="min-w-0">• {it.title}</span><span className="shrink-0 rounded-full border px-2 text-[11px]">{STATUS_TH[it.t.status]}</span></span>
              <span className="block pl-3 text-[11px] text-muted-foreground">{it.service} · ทีม{it.team}: {it.teamState} · เปิดเมื่อ {it.days} วันก่อน</span>
            </button>
          </li>
        ))}
      </ul>
      {cur && <ShutoffDrawer t={cur} all={all} currentUser={currentUser} item={items.find((i) => i.t.ticket_id === cur.ticket_id) ?? null} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ShutoffDrawer({ t, all, currentUser, item, onClose }: { t: L0Ticket; all: L0Ticket[]; currentUser: string; item: AeShutoffItem | null; onClose: () => void }) {
  const d = usePartnerData();
  const w = useWs2();
  const [confirm, setConfirm] = useState(false);
  const s = t.payload.shutoff;
  const cid = t.subject_ref.contract_id ?? t.payload.contract_id ?? null;
  const c = partnerContracts(d, isPartnerDemo()).find((x) => x.contract_id === cid);
  const cost = c ? getContractSystemCost(d, c, partnerToday()) : null;
  const twin = shutoffTwin(all, t);
  const ae = shutoffAe(t, w.properties.find((p) => p.hotel_id === t.subject_ref.hotel_id)?.assigned_ae_id);
  const owner = sameAe(currentUser, ae.member_id, ae.nickname);
  const next = aeNextAction(t, owner);
  const isOrm = (s?.service_line ?? t.subject_ref.service_line ?? "ORM") !== "Marcom";
  const partner = cost?.partner ?? s?.partner ?? "Partner";
  const shut = t.type === "SYSTEM_SHUTOFF";
  const go = () => {
    if (!next) return;
    if (!transition(t.ticket_id, t.revision, next.to, "PS")) { toast.error("อัปเดตไม่สำเร็จ · ลองใหม่"); return; }
    toast.success(`${next.label} · ${t.subject_ref.hotel_name}`);
    if (next.to === "DONE") onClose();
  };
  const press = () => (next?.to === "DONE" && twin && twin.status !== "DONE" ? setConfirm(true) : go());
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto" data-testid="aw-drawer">
        <SheetHeader><SheetTitle>{t.ticket_id} · {TYPE_TH[t.type]}</SheetTitle></SheetHeader>
        <p className="text-sm">{t.subject_ref.hotel_name} · สัญญา {cid ?? "—"} <span className="ml-1 rounded-full border px-2 text-[11px]">{item?.service ?? (isOrm ? "ORM" : "Marcom")}</span></p>
        <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">สถานะ</dt><dd>{STATUS_TH[t.status]}</dd>
          {shut ? <>
            <dt className="text-muted-foreground">ยอดค้าง</dt><dd>{s ? `฿${s.outstanding.toLocaleString("en-US")}` : "—"}</dd>
            <dt className="text-muted-foreground">ค้างกี่รอบบิล</dt><dd>{s ? `${s.overdue_cycles} รอบ` : "—"}</dd>
          </> : <><dt className="text-muted-foreground">ชำระครบเมื่อ</dt><dd>{s?.reactivated_at ? thDate(s.reactivated_at) : "—"}</dd></>}
          {isOrm && <><dt className="text-muted-foreground">ระบบ / Partner</dt><dd>{cost ? `${cost.partner} · ${cost.system}` : s?.partner ? `${s.partner} · ${s.system_name ?? "—"}` : <Amber>ยังไม่ระบุระบบ</Amber>}</dd></>}
          <dt className="text-muted-foreground">ticket ของทีมบริการ</dt><dd>{twin ? `${twin.ticket_id} · ${STATUS_TH[twin.status]}` : "—"}</dd>
          <dt className="text-muted-foreground">หมายเหตุจาก AC</dt><dd>{t.payload.note || "—"}</dd>
        </dl>
        <p className="mt-4 text-xs font-semibold text-muted-foreground">สิ่งที่ AE ต้องทำ</p>
        <ul className="list-disc pl-5 text-sm">
          <li>{shut ? "ติดตามทีม ORM / Marcom เคลียร์ข้อมูลบนระบบ (คล้าย Off-board)" : "ติดตามทีม ORM / Marcom เปิดระบบและคืนข้อมูล"}</li>
          {isOrm && <li>ส่งอีเมลหา {partner} {shut ? "เพื่อขอปิดระบบ" : "เพื่อขอเปิดระบบคืน"}</li>}
        </ul>
        <div className="mt-4">
          {next ? <Button onClick={press}>{next.label}</Button> : !owner && <p className="text-xs text-muted-foreground">AE ผู้ดูแลเป็นผู้ปิด ticket นี้</p>}
        </div>
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{AW_TH.softConfirm}</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirm(false); go(); }}>ยืนยัน</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
