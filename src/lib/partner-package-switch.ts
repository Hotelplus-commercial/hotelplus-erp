/* O-26 Partner follow-up (6 Nov 2026): ORM Lite uses a cheaper Partner system; PM switches it on package change.
 * Pure: signed ORM full ↔ Lite renewals → one PM to-do (kind E) per new contract until PM records a system for the hotel
 * after the signing. Never writes the Partner store; card ③ keeps the current system until PM records the new one. */
import { propertySystemOn } from './debt-partner-calc';
import type { PartnerData } from './debt-partner-types';
import { ormTierOf, type PkgLine } from './renewal-package';

export type PkgSwitchTo = 'LITE' | 'FULL';
export type PkgSwitch = { contract_id: string; hotel_id: string; hotel: string; to: PkgSwitchTo; start: string; signed_at: string };
export const PKG_SWITCH_LABEL: Record<PkgSwitchTo, string> = { LITE: 'ORM Lite', FULL: 'ORM เต็ม' };

/** ORM full → Lite = LITE · Lite → full = FULL · anything else (incl. Marcom, full ↔ full) = null. */
export function ormSystemSwitch(oldL: PkgLine[], newL: PkgLine[]): PkgSwitchTo | null {
  const a = ormTierOf(oldL), b = ormTierOf(newL);
  if (!a || !b || (a === 'LITE') === (b === 'LITE')) return null;
  return b === 'LITE' ? 'LITE' : 'FULL';
}

type Req = { status: string; package_changed?: boolean | null | undefined; old_lines?: PkgLine[] | null | undefined; new_lines?: PkgLine[] | null | undefined; new_contract_id: string | null; signed_at: string | null; hotel_id: string; hotel_name: string; new_terms: { start_date: string } };
export function packageSwitchesOf(requests: Req[]): PkgSwitch[] {
  const out: PkgSwitch[] = [];
  for (const r of requests) {
    if (r.status !== 'SIGNED' || !r.package_changed || !r.new_contract_id || !r.signed_at) continue;
    const to = ormSystemSwitch(r.old_lines ?? [], r.new_lines ?? []); if (!to) continue;
    out.push({ contract_id: r.new_contract_id, hotel_id: r.hotel_id, hotel: r.hotel_name, to, start: r.new_terms.start_date.slice(0, 10), signed_at: r.signed_at });
  }
  return out;
}
/** Stable bell / to-do key: new contract id + new start date. */
export const pkgSwitchKey = (s: Pick<PkgSwitch, 'contract_id' | 'start'>) => `PKGSYS:${s.contract_id}:${s.start}`;
/** Done once PM records any system row for the hotel after the signing. */
export const pkgSwitchDone = (d: PartnerData, s: PkgSwitch) => d.property_partner_system.some((r) => r.property_id === s.hotel_id && r.set_at >= s.signed_at);
export const pkgSwitchTitle = (s: PkgSwitch) => `เปลี่ยนระบบ Partner ให้ตรงแพ็กเกจ ${PKG_SWITCH_LABEL[s.to]}`;

export function packageSwitchTodos(d: PartnerData, switches: PkgSwitch[], today: string, demo: boolean) {
  const pName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? id;
  return switches.filter((s) => !pkgSwitchDone(d, s)).map((s) => {
    const cur = propertySystemOn(d, s.hotel_id, today);
    return {
      kind: 'E' as const, id: `E-${s.contract_id}`, trigger: s.signed_at.slice(0, 10), partner_id: cur?.partner_id ?? null, property_id: s.hotel_id, effective_from: s.start,
      title: `${pkgSwitchTitle(s)} · ${s.hotel}`,
      sub: `ระบบปัจจุบัน: ${cur ? `${pName(cur.partner_id)} · ${cur.system_name}` : 'ยังไม่ระบุระบบ'} · มีผล ${s.start}`,
      due_relative: '', route_target: `/ps/property-content/${s.hotel_id}${demo ? '?demo=1' : ''}#orm`,
    };
  });
}
