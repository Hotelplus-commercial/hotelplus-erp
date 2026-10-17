import { isInputField, isFilled, missingRequired } from './pi-form-rules';
import type { Answers, TemplateDef, TemplateField } from './ws2-store';
export function piFormCompletion(def: TemplateDef, answers: Answers, uploaded: (section: string,row: number)=>boolean = ()=>false, visible: (f:TemplateField)=>boolean = ()=>true) {
  // Credentials and assignments never contribute to this display-only form counter.
  const included = (f:TemplateField) => visible(f) && !['ota_login','hotel_email','pms'].includes(f.restricted_category??'') && !/^(assigned_|caretaker)/.test(f.id);
  const fields=def.sections.flatMap(s=>s.fields.filter(f=>isInputField(f)&&included(f)).map(f=>({s,f})));
  const total=fields.filter(({f})=>f.required).length;
  const missing=missingRequired(def,answers,included,uploaded).length;
  const filled=fields.filter(({s,f})=>(answers[s.id]??[{}]).some((row,i)=>isFilled(row[f.id])||(f.field_type==='file'&&uploaded(s.id,i)))).length;
  return { required_total:total,required_filled:total-missing,all_pct:fields.length?Math.round(filled/fields.length*100):0 };
}