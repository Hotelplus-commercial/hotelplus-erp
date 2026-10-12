import { Save } from "lucide-react";
import { useEffect } from 'react';
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ContactFields, Field, Section } from "@/components/hotel-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contractorTypes, emptyContact, statusMeta } from "@/lib/hotel-profile";
import { hotelStatus, useHotelStore, type HotelProfile } from "@/lib/hotel-store";
import { cn } from "@/lib/utils";
import { crmUsers, useCrm } from '@/lib/crm-store';
import { paymentSummary } from '@/lib/ac-v2-engine';

export function AcProfileForm() {
  const { selected: h, patch,cloudStatus,migrateToCloud } = useHotelStore();
  const crm=useCrm();
  const { customerId, grade, score, late, unpaidMonths, collection } = paymentSummary(crm, h);
  const set = (next: Partial<HotelProfile>) => patch(h.id, next);
  useEffect(()=>{
    if(!crm.hydrated || !customerId) return;
    if(h.overdueMonths!==unpaidMonths || h.latePayments!==late) patch(h.id,{overdueMonths:unpaidMonths,latePayments:late});
  },[crm.hydrated,customerId,h.id,h.overdueMonths,h.latePayments,unpaidMonths,late,patch]);

  const status = hotelStatus(h);
  const sm = statusMeta[status];

  const save = () => {
    if (!h.code.trim() || !h.name.trim() || !h.contractorType) {
      toast.error("กรุณากรอก รหัสโรงแรม / ชื่อโรงแรม / ประเภทผู้ทำสัญญา");
      return;
    }
    set({ acSaved: true });
    toast.success(`AC App บันทึก Hotel Profile ${h.name} แล้ว`, {
      description: "PS App สามารถกรอกข้อมูลสัญญาได้แล้ว",
    });
  };

  return (
    <Section
      code="AC App"
      title="Hotel Profile"
      subtitle="กรอกโดยทีม Accounting · เมื่อบันทึกแล้ว PS App จึงจะกรอกข้อมูลสัญญาได้"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="รหัสโรงแรม">
          <Input value={h.code} onChange={(e) => set({ code: e.target.value })} maxLength={20} />
        </Field>
        <Field label="ชื่อโรงแรม">
          <Input
            value={h.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="เช่น Grand Marina Bangkok"
            maxLength={120}
          />
        </Field>
        <Field label="ประเภทผู้ทำสัญญา">
          <Select value={h.contractorType} onValueChange={(v) => set({ contractorType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภท" />
            </SelectTrigger>
            <SelectContent>
              {contractorTypes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="จำนวนเดือนที่ค้างชำระ">
          <Input
            type="number"
            min={0}
            max={24}
            value={unpaidMonths}
            readOnly
          />
        </Field>
        <Field label="จำนวนครั้งที่ชำระล่าช้า (12 เดือน)">
          <Input
            type="number"
            min={0}
            max={24}
            value={late}
            readOnly
          />
        </Field>
        <Field
          label="PS Lifecycle"
        >
          <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3">
            <span
              className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", sm.className)}
            >
              {sm.label}
            </span>
          </div>
        </Field>
        <Field label="AC Collection"><div className="flex h-9 items-center rounded-md border bg-muted/40 px-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', collection === 'NORMAL' ? 'bg-muted text-muted-foreground' : 'bg-warning/20 text-warning-foreground')}>{collection}</span></div></Field>
      </div>

      <div className="mt-4 rounded-lg border bg-surface/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Score การชำระเงิน</span>
          <span className="font-display text-lg font-bold">
            {score} <span className="text-xs font-semibold text-muted-foreground">เกรด {grade}</span>
          </span>
        </div>
        <Progress value={score} className="mt-2 h-1.5" />
      </div>

      <div className="mt-5 space-y-3">
        <ContactFields
          title="ผู้ติดต่อหลัก"
          contact={h.mainContact}
          onChange={(next) => set({ mainContact: { ...h.mainContact, ...next } })}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">ผู้ติดต่ออื่นๆ ({h.otherContacts.length})</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ otherContacts: [...h.otherContacts, emptyContact()] })}
          >
            <Plus className="mr-1.5 size-4" />
            เพิ่มผู้ติดต่อ
          </Button>
        </div>
        {h.otherContacts.map((c, i) => (
          <ContactFields
            key={c.id}
            title={`ผู้ติดต่อ #${i + 1}`}
            contact={c}
            onChange={(next) =>
              set({
                otherContacts: h.otherContacts.map((x) => (x.id === c.id ? { ...x, ...next } : x)),
              })
            }
            onRemove={() => set({ otherContacts: h.otherContacts.filter((x) => x.id !== c.id) })}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {import.meta.env.DEV && cloudStatus==='local' && <Button variant="outline" onClick={()=>migrateToCloud()}>ย้าย Hotel Profile ไป Cloud</Button>}
        <Select value={crm.actor} onValueChange={crm.setActor}><SelectTrigger className="w-48" aria-label="ผู้บันทึกบัญชี"><SelectValue /></SelectTrigger><SelectContent>{crmUsers.map(u=><SelectItem key={u.email} value={u.email}>{u.name}</SelectItem>)}</SelectContent></Select>
        {customerId && <>{(['LEGAL','WRITTEN_OFF','REACTIVATED'] as const).map(event=><Button key={event} variant="outline" size="sm" onClick={()=>{const note=window.prompt('หมายเหตุ '+event);if(note)crm.collectionAction(customerId,event,note);}}>{event==='LEGAL'?'ส่งฟ้อง':event==='WRITTEN_OFF'?'ตัดหนี้สูญ':'คืนบริการ'}</Button>)}</>}
        {h.acSaved && (
          <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
            บันทึกแล้ว — ส่งต่อให้ PS App
          </span>
        )}
        <Button onClick={save}>
          <Save className="mr-2 size-4" />
          บันทึก Hotel Profile
        </Button>
      </div>
      {crm.contracts.filter(c=>c.customer_snapshot.customer_id===customerId).map(c=><div key={c.contract_id} className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"><span>{c.contract_id}</span><Select value={c.billing_status??'ACTIVE'} onValueChange={v=>{if(!['ACTIVE','PAUSED','TERMINATED'].includes(v))return;if(c.billing_status==='SUSPENDED' && v!=='TERMINATED'){toast.error('ต้องชำระยอดค้างครบก่อนคืนบริการ');return;}crm.patchContract(c.contract_id,{billing_status:v as 'ACTIVE'|'PAUSED'|'TERMINATED'});}}><SelectTrigger className="w-48" aria-label={'สถานะเรียกเก็บ '+c.contract_id}><SelectValue /></SelectTrigger><SelectContent>{['ACTIVE','PAUSED','SUSPENDED','TERMINATED'].map(v=><SelectItem key={v} value={v} disabled={v==='SUSPENDED'}>{v}</SelectItem>)}</SelectContent></Select></div>)}
    </Section>
  );
}
