/* Debt Partner R1 §8.4 — the one shared PM form (deal + rate card). Standalone so PM Workspace can mount it later.
 * PM only (testing role switcher, simulation). Writes only through debt-partner-store saveDeal / saveRateCard / addPartner. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { addPartner, saveDeal, saveRateCard, updatePartner, usePartnerData } from "@/lib/debt-partner-store";
import type { Partner, BenefitType, BillingCycle, DealKind, DealStatus, PartnerDeal, PartnerRateCard } from "@/lib/debt-partner-types";

export type PartnerFormMode = { kind: "deal"; deal?: PartnerDeal | undefined; partnerId?: string | undefined } | { kind: "rate"; card?: PartnerRateCard | undefined; partnerId?: string | undefined } | { kind: "partner"; partner: Partner } | null;
const PM_ID = "PM001-Alex";
const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-sm"><span className="font-medium">{label}</span>{children}{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</label>;
}

function PartnerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const d = usePartnerData(); const [adding, setAdding] = useState(""); 
  return (
    <div className="flex gap-2">
      <select className={sel} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Partner">
        <option value="">เลือก Partner</option>
        {d.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Input className="h-9" placeholder="+ Partner ใหม่" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Partner ใหม่" />
      <Button type="button" variant="outline" size="sm" disabled={!adding.trim()} onClick={() => { const r = addPartner(adding, PM_ID); if (r.ok) { onChange(r.id); setAdding(""); } }}>เพิ่ม</Button>
    </div>
  );
}

function DealForm({ deal, partnerId, onDone }: { deal?: PartnerDeal | undefined; partnerId?: string | undefined; onDone: () => void }) {
  const d = usePartnerData();
  const [kind, setKind] = useState<DealKind | "PROMO">(deal?.kind ?? "COST_DISCOUNT");
  const [partner, setPartner] = useState(deal?.partner_id ?? partnerId ?? "");
  const [status, setStatus] = useState<DealStatus>(deal?.status ?? "NEGOTIATING");
  const [title, setTitle] = useState(deal?.title ?? "");
  const [start, setStart] = useState(deal?.start_date ?? "");
  const [openEnd, setOpenEnd] = useState(deal ? deal.end_date == null : true);
  const [end, setEnd] = useState(deal?.end_date ?? "");
  const [bt, setBt] = useState<BenefitType>(deal?.benefit_type ?? "PERCENT");
  const [bv, setBv] = useState(deal?.benefit_value != null ? String(deal.benefit_value) : "");
  const [cur, setCur] = useState(deal?.benefit_currency ?? "THB");
  const [scope, setScope] = useState(deal?.scope ?? "ALL");
  const [ids, setIds] = useState<string[]>(deal?.contract_ids ?? []);
  const [note, setNote] = useState(deal?.note ?? "");
  const [file, setFile] = useState(deal?.attachment_url ?? "");
  const [err, setErr] = useState<string | null>(null);
  const contractsOf = d.contract_partner_system.filter((s) => s.partner_id === partner).map((s) => s.contract_id);
  const submit = () => {
    const r = saveDeal({
      ...(deal ? { id: deal.id } : {}), partner_id: partner, kind: kind === "PROMO" ? "COST_DISCOUNT" : kind, status, title,
      start_date: start || null, end_date: openEnd ? null : end || null, benefit_type: bt, benefit_value: bt === "OTHER" ? null : bv === "" ? null : Number(bv),
      benefit_currency: bt === "OTHER" ? null : cur, scope, contract_ids: scope === "SELECTED" ? ids : [], note, attachment_url: file, created_by: PM_ID,
    });
    if (!r.ok) setErr(r.error); else onDone();
  };
  return (
    <div className="flex flex-col gap-3" data-testid="dp-deal-form">
      <Field label="ประเภท"><select className={sel} value={kind} onChange={(e) => setKind(e.target.value as DealKind)} aria-label="ประเภท"><option value="COST_DISCOUNT">ลดต้นทุนค่าระบบ</option><option value="PROMO">โปรโมชั่น</option><option value="PERK">สิทธิพิเศษ</option></select></Field>
      <Field label="Partner"><PartnerPicker value={partner} onChange={setPartner} /></Field>
      <Field label="รายละเอียด"><Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="รายละเอียด" /></Field>
      <Field label="สถานะ"><select className={sel} value={status} onChange={(e) => setStatus(e.target.value as DealStatus)} aria-label="สถานะ"><option value="NEGOTIATING">กำลังต่อรอง</option><option value="SUCCESS">สำเร็จ</option><option value="FAILED">ไม่สำเร็จ</option></select></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="เริ่มมีผล"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="เริ่มมีผล" /></Field>
        <Field label="สิ้นสุด">
          <select className={sel} value={openEnd ? "open" : "date"} onChange={(e) => setOpenEnd(e.target.value === "open")} aria-label="สิ้นสุด"><option value="open">until further notice</option><option value="date">ระบุวัน</option></select>
          {!openEnd && <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="วันสิ้นสุด" />}
        </Field>
      </div>
      <Field label="สิทธิประโยชน์">
        <div className="flex gap-2">
          <select className={sel} value={bt} onChange={(e) => setBt(e.target.value as BenefitType)} aria-label="สิทธิประโยชน์"><option value="PERCENT">ส่วนลด %</option><option value="AMOUNT_PER_CONTRACT">ส่วนลดเป็นเงิน</option><option value="CASHBACK_PER_CONTRACT">Cashback ต่อสัญญา</option><option value="OTHER">อื่น ๆ</option></select>
          {bt !== "OTHER" && <Input className="h-9" inputMode="decimal" value={bv} onChange={(e) => setBv(e.target.value)} aria-label="มูลค่า" />}
          {bt !== "OTHER" && bt !== "PERCENT" && <Input className="h-9 w-20" value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} aria-label="สกุลเงิน" />}
        </div>
      </Field>
      <Field label="ใช้กับ">
        <select className={sel} value={scope} onChange={(e) => setScope(e.target.value as "ALL" | "SELECTED")} aria-label="ใช้กับ"><option value="ALL">ทุกสัญญาที่ใช้ Partner นี้</option><option value="SELECTED">เลือกบางสัญญา</option></select>
        {scope === "SELECTED" && (
          <div className="max-h-32 overflow-auto rounded border p-2 text-xs">
            {contractsOf.length ? contractsOf.map((c) => <label key={c} className="flex gap-2"><input type="checkbox" checked={ids.includes(c)} onChange={(e) => setIds(e.target.checked ? [...ids, c] : ids.filter((x) => x !== c))} />{c}</label>) : <span className="text-muted-foreground">ยังไม่มีสัญญาที่ใช้ Partner นี้</span>}
          </div>
        )}
      </Field>
      <Field label="หมายเหตุ"><Input value={note} onChange={(e) => setNote(e.target.value)} aria-label="หมายเหตุ" /></Field>
      <Field label="ไฟล์แนบ" hint="อีเมลหรือหนังสือยืนยันจาก Partner (ลิงก์ Google Drive)"><Input value={file} onChange={(e) => setFile(e.target.value)} placeholder="https://drive.google.com/…" aria-label="ไฟล์แนบ" /></Field>
      {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
      <Button type="button" onClick={submit}>บันทึกและส่งบัญชี</Button>
    </div>
  );
}

type TierRow = { min: string; max: string; price: string };
function RateForm({ card, partnerId, onDone }: { card?: PartnerRateCard | undefined; partnerId?: string | undefined; onDone: () => void }) {
  const d = usePartnerData();
  const [partner, setPartner] = useState(card?.partner_id ?? partnerId ?? "");
  const [system, setSystem] = useState(card?.system_name ?? "");
  const [cur, setCur] = useState(card?.currency ?? "THB");
  const [cycle, setCycle] = useState<BillingCycle>(card?.billing_cycle ?? "MONTHLY");
  const [fx, setFx] = useState(card?.est_fx_to_thb != null ? String(card.est_fx_to_thb) : "");
  const [from, setFrom] = useState("");
  const initTiers = card ? d.partner_rate_card_tiers.filter((t) => t.rate_card_id === card.id).sort((a, b) => a.allotment_min - b.allotment_min).map((t) => ({ min: String(t.allotment_min), max: t.allotment_max == null ? "" : String(t.allotment_max), price: String(t.price_per_contract_month) })) : [{ min: "1", max: "", price: "" }];
  const [tiers, setTiers] = useState<TierRow[]>(initTiers);
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const r = saveRateCard({
      partner_id: partner, system_name: system, currency: cur, billing_cycle: cycle, est_fx_to_thb: cur !== "THB" && fx ? Number(fx) : null,
      effective_from: from, created_by: PM_ID,
      tiers: tiers.map((t) => ({ allotment_min: Number(t.min || 0), allotment_max: t.max === "" ? null : Number(t.max), price_per_contract_month: t.price === "" ? NaN : Number(t.price) })),
    });
    if (!r.ok) setErr(r.error); else onDone();
  };
  const setT = (i: number, k: keyof TierRow, v: string) => setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  return (
    <div className="flex flex-col gap-3" data-testid="dp-rate-form">
      <Field label="Partner"><PartnerPicker value={partner} onChange={setPartner} /></Field>
      <Field label="ระบบ"><Input value={system} onChange={(e) => setSystem(e.target.value)} aria-label="ระบบ" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="สกุลเงินที่ Partner เรียกเก็บ"><Input value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} aria-label="สกุลเงิน" /></Field>
        <Field label="รอบที่ Partner เรียกเก็บ"><select className={sel} value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)} aria-label="รอบที่ Partner เรียกเก็บ"><option value="MONTHLY">รายเดือน</option><option value="ADVANCE_3M">ล่วงหน้า 3 เดือน</option><option value="ADVANCE_6M">ล่วงหน้า 6 เดือน</option><option value="ANNUAL">รายปี</option></select></Field>
      </div>
      <Field label="ราคาขั้นบันไดตาม allotment (ต่อสัญญา / เดือน)">
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="h-8" value={t.min} onChange={(e) => setT(i, "min", e.target.value)} aria-label={`allotment จาก ${i + 1}`} />–
            <Input className="h-8" value={t.max} placeholder="ขึ้นไป" onChange={(e) => setT(i, "max", e.target.value)} aria-label={`allotment ถึง ${i + 1}`} />
            <Input className="h-8" value={t.price} placeholder="ราคา" onChange={(e) => setT(i, "price", e.target.value)} aria-label={`ราคา ${i + 1}`} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setTiers([...tiers, { min: "", max: "", price: "" }])}>+ เพิ่มขั้น</Button>
      </Field>
      {cur !== "THB" && <Field label="อัตราสำหรับ estimate THB"><Input value={fx} onChange={(e) => setFx(e.target.value)} aria-label="อัตรา estimate THB" /></Field>}
      <Field label="เริ่มใช้ราคานี้" hint="เปลี่ยนราคา = บันทึกชุดใหม่พร้อมวันเริ่ม ชุดเดิมเก็บใน Timeline"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="เริ่มใช้ราคานี้" /></Field>
      {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
      <Button type="button" onClick={submit}>บันทึก Rate Card</Button>
    </div>
  );
}

/* v1.2 §3 (PW25): Edit Partner — name · contact · storage location · note (currency / billing cycle live on the Rate Card). */
function PartnerInfoForm({ partner, onDone }: { partner: Partner; onDone: () => void }) {
  const [f, setF] = useState({ name: partner.name, contact_name: partner.contact_name ?? "", contact_email: partner.contact_email ?? "", contact_phone: partner.contact_phone ?? "", doc_folder_url: partner.doc_folder_url ?? "", note: partner.note ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = () => { const r = updatePartner(partner.id, f); if (!r.ok) setErr(r.error); else onDone(); };
  return (
    <div className="flex flex-col gap-3" data-testid="dp-partner-form">
      <Field label="ชื่อ Partner"><Input value={f.name} onChange={set("name")} aria-label="ชื่อ Partner" /></Field>
      <Field label="ผู้ติดต่อ (ไม่บังคับ)"><Input value={f.contact_name} onChange={set("contact_name")} aria-label="ผู้ติดต่อ" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="อีเมล (ไม่บังคับ)"><Input value={f.contact_email} onChange={set("contact_email")} aria-label="อีเมลผู้ติดต่อ" /></Field>
        <Field label="โทร (ไม่บังคับ)"><Input value={f.contact_phone} onChange={set("contact_phone")} aria-label="โทร" /></Field>
      </div>
      <Field label="ที่เก็บเอกสาร (ลิงก์โฟลเดอร์)" hint="ต้องขึ้นต้นด้วย https:// · ไฟล์ที่อัปโหลดจะถูกส่งเข้าที่นี่เมื่อเชื่อม Google Drive แล้ว"><Input value={f.doc_folder_url} onChange={set("doc_folder_url")} placeholder="https://drive.google.com/drive/folders/…" aria-label="ที่เก็บเอกสาร" /></Field>
      <Field label="หมายเหตุ"><Input value={f.note} onChange={set("note")} aria-label="หมายเหตุ Partner" /></Field>
      <p className="text-xs text-muted-foreground">สกุลเงินและรอบเรียกเก็บแก้ที่ราคา (Rate Card)</p>
      {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
      <Button type="button" onClick={submit} data-testid="dp-partner-save">บันทึกข้อมูล Partner</Button>
    </div>
  );
}

export function PartnerFormDrawer({ mode, onClose }: { mode: PartnerFormMode; onClose: () => void }) {
  const [key, setKey] = useState(0);
  useEffect(() => setKey((k) => k + 1), [mode]);
  return (
    <Sheet open={mode != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{mode?.kind === "partner" ? "แก้ไขข้อมูล Partner" : mode?.kind === "rate" ? (mode.card ? "แก้ไข Rate Card" : "เพิ่ม Rate Card") : mode?.deal ? "แก้ไขข้อตกลง" : "บันทึกข้อตกลง"}</SheetTitle></SheetHeader>
        <div className="mt-4" key={key}>
          {mode?.kind === "deal" && <DealForm deal={mode.deal} partnerId={mode.partnerId} onDone={onClose} />}
          {mode?.kind === "rate" && <RateForm card={mode.card} partnerId={mode.partnerId} onDone={onClose} />}
          {mode?.kind === "partner" && <PartnerInfoForm partner={mode.partner} onDone={onClose} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
