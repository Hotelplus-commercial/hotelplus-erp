import type { ReactNode } from 'react';
import { LocalPiFormChip, PiFormChip } from './pi-form-chip';
import type { OnboardingCard } from '@/lib/ps-servicing';
import type { ServicingRow } from '@/lib/servicing-dashboard-types';
/** One visual card identity for operational and report projections; actions remain supplied by their existing surface. */
export function OnboardingCardContent({card,row,children,form=true}: {card?:OnboardingCard;row?:ServicingRow;children?:ReactNode;form?:boolean}) {
 return <span className="block min-w-0 space-y-1"><span className="block text-sm font-semibold">{card?.property_name??row?.hotel_name}</span>{children}{form&&(card?<LocalPiFormChip card={card}/>:row&&row.current_stage!=='new_property'?<PiFormChip data={{required_total:row.form_required_total,required_filled:row.form_required_filled,all_pct:row.form_all_pct,status:row.form_status}}/>:null)}</span>;
}