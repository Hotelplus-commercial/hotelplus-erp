import type { Answers, TemplateDef, TemplateField } from './ws2-store';
export const isInputField = (f: TemplateField) => !['heading', 'note'].includes(f.field_type);
export const normalizeRequired = (def: TemplateDef): TemplateDef => ({ ...def, sections: def.sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f, required: f.required === true })) })) });
export const requiredChanges = (before: TemplateDef, after: TemplateDef) => before.sections.flatMap(s => s.fields.flatMap(f => {
  const next = after.sections.find(x => x.id === s.id)?.fields.find(x => x.id === f.id);
  return isInputField(f) && next && Boolean(f.required) !== Boolean(next.required) ? [{ id: f.id, before: Boolean(f.required), after: Boolean(next.required) }] : [];
}));
export const applyRequiredFlags = (live: TemplateDef, draft: TemplateDef) => normalizeRequired({ ...live, sections: live.sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f, required: isInputField(f) && draft.sections.find(x => x.id === s.id)?.fields.find(x => x.id === f.id)?.required === true })) })) });
export type MissingRequired = { sectionId: string; fieldId: string; row: number; label: string; target: string };
export const fieldTarget = (section: string, row: number, field: string) => `pi-${section}-${row}-${field}`;
export function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  return typeof value === 'string' && value.trim().length > 0;
}
/** Only displayed inputs from the frozen version apply. A repeat section needs one complete row. */
export function missingRequired(def: TemplateDef, answers: Answers, visible: (field: TemplateField) => boolean = () => true, uploaded: (sectionId: string, row: number) => boolean = () => false): MissingRequired[] {
  return def.sections.flatMap(s => {
    const fields = s.fields.filter(f => isInputField(f) && f.required && visible(f));
    if (!fields.length) return [];
    const existing = answers[s.id];
    const rows = existing?.length ? existing : [{}];
    const filled = (f: TemplateField, i: number) => isFilled(rows[i]?.[f.id]) || (f.field_type === "file" && uploaded(s.id, i));
    if (s.repeat_group && rows.some((_, i) => fields.every(f => filled(f, i)))) return [];
    const row = s.repeat_group ? rows.reduce((best, entry, i) => fields.filter(f => isFilled(entry[f.id])).length > fields.filter(f => isFilled(rows[best]?.[f.id])).length ? i : best, 0) : 0;
    return fields.filter(f => !filled(f, row)).map(f => ({ sectionId: s.id, fieldId: f.id, row, label: f.label, target: fieldTarget(s.id, row, f.id) }));
  });
}
export function photoEvidence(def: TemplateDef, answers: Answers, folders: { path: string; photo_count: number }[], service: string) {
  return (sectionId: string, row: number) => {
    const section = def.sections.find(s => s.id === sectionId);
    const roomId = answers[sectionId]?.[row]?.["_rid"];
    return folders.some(folder => folder.photo_count > 0 && (section?.repeat_group === "room_type" ? Boolean(roomId) && folder.path.endsWith(`/${String(roomId)}/`) : folder.path.endsWith(service === "MARCOM_GMB" ? "/_all/" : "/_property/")));
  };
}
