/* Alert BOT data sources — gathers already-computed signals (grade / renewal / survey) and the
 * v1.1 assignment master (read-only) into a BotScanInput. Live reads browser-local stores;
 * demo uses a bundled fixture spine with the fixed 2026-09-30 clock. Never fabricates: an
 * empty source simply fires nothing. */
import type { BotScanInput, BotRouting } from './alert-bot';
import type { Dept } from './tickets-l0';
import type { CrmData } from './crm-store';
import type { RenewalCard } from './ps-renewal';
import { DEMO_NOW } from './ps-demo-fixture';
import { demoServicingRows, SERVICING_DEMO_NOW } from './servicing-demo';
import { servicingLanes } from './servicing-time';

type Ws2State = {
  properties?: { hotel_id: string; hotel_name_th: string; assigned_ae_id?: string | null }[];
  profiles?: { property_id: string; service: string; revenue_member_id?: string | null; ecommerce_member_id?: string | null; marcom_member_id?: string | null }[];
};
type HrState = { members?: { id: string; nickname: string }[] };

const readJson = <T>(key: string): T | null => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
};

/** Read the v1.1 assignment master (ws2 browser store) + HR roster nicknames. Read-only. */
export function liveRouting(): (hotel_id: string) => BotRouting {
  const ws2 = readJson<Ws2State>('ps-ws2-v1');
  const hr = readJson<HrState>('meridia.hr.members.v1');
  const nick = (id: string | null | undefined) => hr?.members?.find((m) => m.id === id)?.nickname ?? (id || '—');
  return (hotel_id) => {
    const prop = ws2?.properties?.find((p) => p.hotel_id === hotel_id);
    const profiles = ws2?.profiles?.filter((p) => p.property_id === hotel_id) ?? [];
    const orm = profiles.find((p) => p.service === 'ORM');
    const marcom = profiles.find((p) => p.service.startsWith('MARCOM'));
    const watchers: BotRouting['watchers'] = [];
    if (orm) {
      for (const id of [orm.revenue_member_id, orm.ecommerce_member_id])
        if (id) watchers.push({ dept: 'ORM' as Dept, member_id: id, nickname: nick(id) });
      if (!watchers.some((w) => w.dept === 'ORM')) watchers.push({ dept: 'ORM', member_id: null, nickname: 'ทีม ORM' });
    }
    if (marcom) watchers.push({ dept: 'MARCOM', member_id: marcom.marcom_member_id ?? null, nickname: marcom.marcom_member_id ? nick(marcom.marcom_member_id) : 'ทีม Marcom' });
    const ae = prop?.assigned_ae_id;
    return { assigned_ae: ae ? { member_id: ae, nickname: nick(ae) } : null, watchers };
  };
}

/** Live scan input from the browser stores. Grade: latest monthly gradeRecords (RECURRING basis only). */
export function liveScanInput(crm: Pick<CrmData, 'gradeRecords' | 'customers'>, renewals: RenewalCard[], now: string): BotScanInput {
  const hotelIdByName = new Map<string, string>();
  try {
    const hotels = readJson<{ id: string; name: string }[]>('meridia.hotel-profiles.v1') ?? [];
    hotels.forEach((h) => hotelIdByName.set(h.name, h.id));
  } catch { /* ignore */ }
  const idFor = (name: string) => hotelIdByName.get(name) ?? name;

  const grades = (crm.gradeRecords ?? [])
    .filter((g) => g.basis.length > 0)
    .map((g) => {
      const cust = crm.customers.find((c) => c.customer_id === g.customer_id);
      const name = cust?.hotels[0]?.name ?? cust?.legal_name ?? g.customer_id;
      return { hotel_id: idFor(name), hotel_name: name, billing_period: g.billing_period, grade: g.grade };
    });
  const renewalRows = renewals.map((c) => ({
    hotel_id: c.hotelId, hotel_name: c.hotel,
    renewal_due_date: parseThaiDate(c.contractEnd), status: c.status,
  })).filter((r) => r.renewal_due_date);
  return { now, renewals: renewalRows, grades, surveys: [], route: liveRouting() };
}

/** "24 Sep 2026" → "2026-09-24" ('' when unparseable). */
function parseThaiDate(s: string): string {
  const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim());
  if (!m) return '';
  const mm = months[m[2]!];
  return mm ? `${m[3]}-${mm}-${m[1]!.padStart(2, '0')}` : '';
}

/* ---------------- demo fixture (preview-safe · clock 2026-09-30) ---------------- */
/** Demo scan: one firing case per type + one unassigned owner, on the shared demo spine names. */
export function demoScanInput(): BotScanInput {
  const route = (hotel_id: string): BotRouting => {
    if (hotel_id === 'DEMO-CHABA') return {
      assigned_ae: { member_id: 'hr-1', nickname: 'Nont' },
      watchers: [
        { dept: 'ORM', member_id: 'hr-6', nickname: 'A-Rev-01' },
        { dept: 'ORM', member_id: 'hr-7', nickname: 'A-Ecom-01' },
        { dept: 'MARCOM', member_id: 'hr-4', nickname: 'แนน' },
      ],
    };
    if (hotel_id === 'DEMO-SEEFAH') return { assigned_ae: null, watchers: [] }; // unassigned owner → amber hint
    return { assigned_ae: { member_id: 'hr-2', nickname: 'Fern' }, watchers: [] };
  };
  return {
    now: DEMO_NOW,
    renewals: [
      { hotel_id: 'DEMO-OCEAN', hotel_name: 'Ocean View Phuket', renewal_due_date: '2026-10-10', status: 'ON_PROCESS' },
      { hotel_id: 'DEMO-CITY', hotel_name: 'City Center Bangkok', renewal_due_date: '2026-10-23', status: 'ON_PROCESS' },
    ],
    grades: [
      { hotel_id: 'DEMO-CHABA', hotel_name: 'Chaba Grand', billing_period: '2026-09-30', grade: 'D' },
      { hotel_id: 'DEMO-CHAAM', hotel_name: 'Chaam Peumsuk', billing_period: '2026-09-30', grade: 'A' },
    ],
    surveys: [
      { hotel_id: 'DEMO-SEEFAH', hotel_name: 'Seefah', survey_id: 'SV-2026-09-SEEFAH', score: 2.5 },
      { hotel_id: 'DEMO-CHAAM', hotel_name: 'Chaam Peumsuk', survey_id: 'SV-2026-09-CHAAM', score: 4.5 },
    ],
    route,
    servicing: demoServicingRows().filter(r=>!r.go_live_at).flatMap(row=>servicingLanes(row,SERVICING_DEMO_NOW).filter(l=>l.state==='running'&&l.tone==='red').map(lane=>({row,lane}))),
  };
}
