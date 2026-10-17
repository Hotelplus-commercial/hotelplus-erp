import { ChartHint } from './dash-card';
import { piFormCompletion } from '@/lib/pi-form-completion';
import { photoEvidence } from '@/lib/pi-form-rules';
import { serviceForVariant, useWs2 } from '@/lib/ws2-store';
import type { OnboardingCard } from '@/lib/ps-servicing';
export type PiChipData = { required_total?: number|null; required_filled?: number|null; all_pct?: number|null; status?: string|null };
export function PiFormChip({data}: {data:PiChipData}) {
 const generated=data.status!=null, complete=(data.required_total??0)>0&&data.required_filled===data.required_total;
 const text=!generated?'PI Form · ยังไม่ส่งฟอร์ม':(data.required_total??0)>0?`PI Form · Completed ${data.required_filled??0}/${data.required_total} (mandatory field)`:`PI Form · Completed form ${data.all_pct??0}%`;
 const status=data.status==='draft'?'ร่าง':data.status==='submitted'?'ลูกค้าส่งครบแล้ว':data.status==='partial'?'กรอกบางส่วน':'ส่งแล้ว';
 return <ChartHint header={`สถานะฟอร์ม: ${generated?status:'ร่าง'}`}><span tabIndex={0} className={`sv-pi-chip ${complete?'sv-tone-ok':!generated?'sv-tone-wait':''}`}>{text}</span></ChartHint>;
}
export function LocalPiFormChip({card}: {card:Pick<OnboardingCard,'property_id'|'service_variant'> & Partial<Pick<OnboardingCard,'id'|'current_stage'>>}) {
 const w=useWs2(), service=serviceForVariant(card.service_variant);
 const form=[...w.forms].reverse().find(f=>card.id&&f.card_id===card.id)??[...w.forms].reverse().find(f=>f.property_id===card.property_id&&f.service===service);
 const tpl=form?w.templateFor(form):undefined;
 if(card.current_stage==='new_property')return null;
 const answers=form?.answers??{}, folders=w.folders.filter(f=>f.property_id===card.property_id&&f.service===service);
 const counts=tpl?piFormCompletion(tpl.def,answers,photoEvidence(tpl.def,answers,folders,service)):null;
 const profile=w.profiles.find(p=>p.property_id===card.property_id&&p.service===service);
 return <PiFormChip data={{...counts,status:form?(profile?.form_completion_status==='partial'?'partial':form.status):null}}/>;
}