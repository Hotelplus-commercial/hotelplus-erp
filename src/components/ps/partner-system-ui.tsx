/* PM Workspace Partner v1.0 §1 — "ระบบที่ใช้ (ORM)" + Allotment (DP-O1) for the AE Assign modal and the Hotel Profile ORM block.
 * Reads/writes only through debt-partner-store (setPropertySystem); resolution from debt-partner-calc. */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PARTNER_DEMO_CONTRACTS, PARTNER_DEMO_EXTRA_HOTELS } from "@/lib/debt-partner-demo";
import { setPartnerDemo } from "@/lib/debt-partner-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPartnerDemo, setPropertySystem, usePartnerData } from "@/lib/debt-partner-store";
import { DEMO_DAY } from "@/lib/demo-session";
import { NO_ALLOTMENT_TH, propertySystemHistory, propertySystemOn } from "@/lib/debt-partner-calc";
import type { PartnerData } from "@/lib/debt-partner-types";

export const NO_SYSTEM_TH = "ยังไม่ระบุระบบ";
const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
export const sysKey = (partner_id: string, system_name: string) => `${partner_id}|${system_name}`;
export const parseSysKey = (k: string) => { const [partner_id = "", ...rest] = k.split("|"); return { partner_id, system_name: rest.join("|") }; };
/** Options = current rate cards (superseded_at null) as "{partner} · {system}". */
export function systemOptions(d: PartnerData) {
  return d.partner_rate_cards.filter((r) => r.superseded_at == null)
    .map((r) => ({ key: sysKey(r.partner_id, r.system_name), label: `${d.partners.find((p) => p.id === r.partner_id)?.name ?? r.partner_id} · ${r.system_name}` }));
}
export const partnerName = (d: PartnerData, id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
/* v1.1 PW21: DEMO reads the shared DEMO-state date. */
const today = () => (isPartnerDemo() ? DEMO_DAY : new Date().toISOString().slice(0, 10));
const dmy = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
const Amber = ({ children, testid }: { children: React.ReactNode; testid?: string }) => <span className="text-xs font-medium text-warning-foreground" data-testid={testid}>{children}</span>;

/** Assign modal (AE role, ORM hotels): system select + allotment. Values are lifted to the modal's one Save. */
export function AssignSystemFields({ sys, allot, onSys, onAllot, disabled }: { sys: string; allot: string; onSys: (v: string) => void; onAllot: (v: string) => void; disabled?: boolean }) {
  const d = usePartnerData();
  return (
    <div className="grid gap-2 rounded-md border border-dashed p-2" data-testid="assign-orm-system">
      <label className="grid gap-1 text-sm">
        <span className="flex flex-wrap items-center gap-2">ระบบที่ใช้ (ORM){!sys && <Amber testid="assign-no-system">{NO_SYSTEM_TH}</Amber>}</span>
        <select aria-label="ระบบที่ใช้ (ORM)" className={sel} value={sys} disabled={disabled} onChange={(e) => onSys(e.target.value)}>
          <option value="">ยังไม่ระบุ</option>
          {systemOptions(d).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="flex flex-wrap items-center gap-2">Allotment (ใช้เลือกขั้นราคา Rate Card){!allot && <Amber testid="assign-no-allotment">{NO_ALLOTMENT_TH}</Amber>}</span>
        <Input aria-label="Allotment" type="number" min={0} inputMode="numeric" className="h-9" value={allot} disabled={disabled} onChange={(e) => onAllot(e.target.value)} />
      </label>
      <p className="text-xs text-muted-foreground">สัญญา ORM ทุกฉบับของโรงแรมนี้ใช้ระบบนี้ รวมถึงสัญญาต่ออายุ · เปลี่ยนภายหลังที่ Hotel Profile</p>
    </div>
  );
}
/** Initial values for the Assign modal from the row effective today. */
export function currentSystemValues(d: PartnerData, property_id: string) {
  const r = propertySystemOn(d, property_id, today());
  return { sys: r ? sysKey(r.partner_id, r.system_name) : "", allot: r?.allotment != null ? String(r.allotment) : "" };
}
/** Save part of the modal: insert a row (effective today) only when a system is chosen and system or allotment changed. */
export function saveAssignSystem(d: PartnerData, property_id: string, sys: string, allot: string, by: string): "saved" | "unchanged" | "empty" | string {
  if (!sys) return "empty";
  const cur = currentSystemValues(d, property_id);
  const a = allot.trim() === "" ? null : Number(allot);
  if (cur.sys === sys && cur.allot === (a == null ? "" : String(a))) return "unchanged";
  const { partner_id, system_name } = parseSysKey(sys);
  const r = setPropertySystem({ property_id, partner_id, system_name, allotment: a, effective_from: today(), set_by: by });
  return r.ok ? "saved" : r.error;
}

/** Hotel Profile · ORM service block: current system + allotment, PM-only change form, history. */
export function PropertySystemBlock({ propertyId, isPm }: { propertyId: string; isPm: boolean }) {
  const d = usePartnerData();
  const cur = propertySystemOn(d, propertyId, today());
  const hist = propertySystemHistory(d, propertyId);
  const [open, setOpen] = useState(false);
  const [sys, setSys] = useState("");
  const [from, setFrom] = useState(today());
  const [allot, setAllot] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    const { partner_id, system_name } = parseSysKey(sys);
    const r = setPropertySystem({ property_id: propertyId, partner_id, system_name, effective_from: from, allotment: allot.trim() === "" ? null : Number(allot), set_by: "PM", note });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("บันทึกระบบที่ใช้แล้ว"); setOpen(false); setSys(""); setAllot(""); setNote("");
  };
  return (
    <section id="orm" className="scroll-mt-4 space-y-2 rounded-lg border p-4" aria-label="ระบบที่ใช้ (ORM)" data-testid="hp-orm-system">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">ระบบที่ใช้ (ORM)</h2>
        {isPm && <Button size="sm" variant="outline" onClick={() => { setOpen(!open); setSys(cur ? sysKey(cur.partner_id, cur.system_name) : ""); setAllot(cur?.allotment != null ? String(cur.allotment) : ""); }}>เปลี่ยนระบบ</Button>}
      </div>
      <p className="text-sm" data-testid="hp-system-current">
        ระบบที่ใช้: {cur ? `${partnerName(d, cur.partner_id)} · ${cur.system_name}` : <Amber>{NO_SYSTEM_TH}</Amber>}
        {" · "}Allotment: {cur?.allotment != null ? <b className="tabular-nums">{cur.allotment}</b> : <Amber testid="hp-no-allotment">{NO_ALLOTMENT_TH}</Amber>}
      </p>
      {open && isPm && (
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2" data-testid="hp-system-form">
          <label className="grid gap-1 text-sm">ระบบ
            <select aria-label="ระบบ" className={sel} value={sys} onChange={(e) => setSys(e.target.value)}>
              <option value="">— เลือก —</option>{systemOptions(d).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">วันที่เริ่มใช้<Input aria-label="วันที่เริ่มใช้" type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Allotment (ใช้เลือกขั้นราคา Rate Card)<Input aria-label="Allotment" type="number" min={0} className="h-9" value={allot} onChange={(e) => setAllot(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">หมายเหตุ<Input aria-label="หมายเหตุ" className="h-9" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button size="sm" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button size="sm" disabled={!sys || !from} onClick={submit}>บันทึก</Button></div>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">ประวัติ</p>
        <ul className="text-xs" data-testid="hp-system-history">
          {hist.map((h) => <li key={h.id} data-testid="hp-history-row">{h.effective_from.slice(0, 10) > today() && <span className="mr-1 rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning-foreground" data-testid="hp-pending-tag">{partnerName(d, h.partner_id)} · รอมีผล {dmy(h.effective_from)}</span>}{h.effective_from} · {partnerName(d, h.partner_id)} · {h.system_name} · allotment {h.allotment ?? "—"} · โดย {h.set_by}{h.note ? ` · ${h.note}` : ""}</li>)}
          {!hist.length && <li className="text-muted-foreground">ยังไม่มีประวัติ</li>}
        </ul>
      </div>
    </section>
  );
}

/* v1.1 PW21 — DEMO hotels of the Partner demo (not in the WS-2 hotel list; never written to real storage). */
export function partnerDemoHotels(): { property_id: string; hotel: string }[] {
  const out = new Map<string, string>();
  for (const h of PARTNER_DEMO_EXTRA_HOTELS) out.set(h.property_id, h.hotel);
  for (const c of PARTNER_DEMO_CONTRACTS) if (c.property_id && !out.has(c.property_id)) out.set(c.property_id, c.hotel);
  return [...out].map(([property_id, hotel]) => ({ property_id, hotel }));
}
export const partnerDemoHotel = (property_id: string): string | null => partnerDemoHotels().find((h) => h.property_id === property_id)?.hotel ?? null;

/** Hotel list (DEMO only): demo Partner hotels open the Hotel Profile ORM block with DEMO data. */
export function PartnerDemoHotelList() {
  useEffect(() => { setPartnerDemo(true); }, []);
  const [q, setQ] = useState("");
  const all = partnerDemoHotels();
  const rows = all.filter((h) => !q.trim() || h.hotel.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="space-y-2 rounded-lg border p-4" data-testid="pc-demo-partner-hotels">
      <h2 className="font-semibold">โรงแรมตัวอย่าง Partner (ข้อมูลสาธิต) · {all.length} โรงแรม</h2>
      <Input aria-label="ค้นหาโรงแรมตัวอย่าง" className="h-9 max-w-sm" placeholder="🔍 เช่น Mae Ping" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="grid max-h-80 gap-1 overflow-y-auto text-sm sm:grid-cols-3">
        {rows.map((h) => <li key={h.property_id}><Link to="/ps/property-content/$hotelId" params={{ hotelId: h.property_id }} search={{ demo: 1 }} hash="orm" className="text-primary hover:underline">📁 {h.hotel}</Link></li>)}
      </ul>
    </section>
  );
}
