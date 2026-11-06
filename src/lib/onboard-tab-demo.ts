/* On-board R1 §16 — DEMO additions for tab On-board / Off-board only (DEMO on, in memory, never written).
 * New entries; the R4 card ⑤ demo and the Servicing fixture are untouched. Today = 28 ต.ค. 2569 (shared DEMO date).
 * HR demo members are an in-memory overlay on the roster — never written to the HR App store. */
import type { SetupInput, SetupVariant } from './setup-timing';
import { addDays } from './setup-timing';
import { SETUP_DEMO_TODAY } from './setup-duration-demo';
import type { HrMember } from './hr-members';

export const ONB_DEMO_TODAY: string = SETUP_DEMO_TODAY;
const at = (d: string) => `${d}T03:00:00.000Z`;
export const ONB_DEMO_AE = ['Fern', 'Nont', 'Ploy'];
export const ONB_DEMO_SPEC = ['Dao', 'Mint'];
export const ONB_DEMO_MC = ['แพร', 'บีม'];
export const ONB_DEMO_TEAMS: Record<string, string[]> = { A: ['เตย', 'นิด'], B: ['ต้น', 'แบงค์'] };

type IP = [name: string, v: SetupVariant, stage: string, ago: number, ap: number | null, spec: number | null, mc: number | null, meet: number | null, ae: number, sp: number, team: 'A' | 'B', mcp: number];
/** Lane day numbers count from the card's created date (day 0). */
const IN_FLIGHT: IP[] = [
  ['ภูผา บูทีค เชียงใหม่', 'ORM', 'collect_data', 9, null, null, null, null, 0, 0, 'A', 0], // P1 day 9 · เลย 2 วัน
  ['เดอะ ลากูน่า หัวหิน', 'ORM', 'final_check', 7, null, null, null, null, 1, 0, 'B', 0], // P1 day 7 · ครบกำหนดวันนี้
  ['ริเวอร์ไซด์ อยุธยา', 'ORM', 'orm_rate_structure', 13, 5, null, 10, 16, 2, 1, 'A', 0], // Specialist P2 day 8 · ประชุม 31 ต.ค.
  ['มณีรัตน์ เขาใหญ่', 'ORM', 'orm_rate_structure', 10, 4, 8, 9, 11, 0, 0, 'B', 0], // waiting meeting 29 ต.ค.
  ['แกรนด์ พาเลซ ขอนแก่น', 'ORM', 'orm_system_training', 21, 7, 12, 14, 17, 1, 1, 'A', 0], // P3 day 4 · total 21
  ['บ้านสวน กาญจนบุรี', 'ORM', 'new_property', 1, null, null, null, null, 2, 0, 'B', 0],
  ['ชายหาด ระยอง', 'ORM', 'introduction_sent_form', 3, null, null, null, null, 0, 1, 'A', 0],
  ['ดอยอินทนนท์ ลอดจ์', 'ORM', 'property_pending', 6, null, null, null, null, 1, 0, 'B', 0],
  ['นาคา ภูเก็ต', 'ORM', 'orm_prepare_data', 11, 5, null, null, null, 2, 1, 'A', 0],
  ['ลำปาง เฮอริเทจ', 'ORM', 'orm_final_setup', 12, 4, 8, 9, 11, 0, 0, 'B', 0],
  ['สามพราน ริเวอร์', 'ORM', 'completed_handover', 14, 4, 8, 9, 11, 1, 1, 'A', 0], // P3 day 3 · ครบกำหนดวันนี้ (old SV4: on time)
  ['สุขุมวิท สวีท 24', 'MARCOM_GMB', 'marcom_prepare_data', 11, 4, null, null, null, 2, 0, 'A', 0], // GMB P2 day 7
  ['ทะเลหมอก ปาย', 'MARCOM_META_TIKTOK', 'marcom_first_sync', 12, 5, null, 9, 10, 0, 0, 'A', 1], // First Sync P3 day 2
  ['เกาะสมุย บีช', 'MARCOM_META_TIKTOK', 'marcom_first_sync', 14, 5, null, 8, 9, 1, 0, 'A', 0], // P3 day 5
  ['ปายแคนยอน วิลล่า', 'MARCOM_META_TIKTOK', 'completed_handover', 8, 6, null, null, null, 2, 0, 'A', 1],
];
/** Go Live per month, Apr 2567 → Oct 2569 (31 months, current last). Last 6 months: ORM 14 · Marcom 8. */
const FIRST = '2024-04';
const ORM_M = [2, 3, 2, 2, 3, 2, 1, 3, 2, 2, 3, 2, 2, 1, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 2];
const MC_M = [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1];
const PLACES = ['ริมน่าน', 'ภูชี้ฟ้า', 'หาดบางแสน', 'แม่ริม', 'บ่อสร้าง', 'หาดจอมเทียน', 'ดอยช้าง', 'เกาะล้าน', 'เขาค้อ', 'ท่าช้าง', 'บางเสร่', 'หาดแม่รำพึง', 'สวนผึ้ง', 'วังน้ำเขียว', 'เกาะพะงัน', 'หัวหินเหนือ', 'ห้วยน้ำดัง', 'แหลมพรหมเทพ', 'ปากช่อง', 'อัมพวา', 'เชียงคาน', 'น่านนคร'];
const KINDS = ['รีสอร์ท', 'บูทีค', 'วิลล่า', 'อินน์', 'ลอดจ์', 'เรสซิเดนซ์'];
const rnd = (n: number) => { const x = Math.sin(n * 91.345 + 12.77) * 43758.5453; return x - Math.floor(x); };
const monthAt = (i: number) => new Date(Date.UTC(+FIRST.slice(0, 4), +FIRST.slice(5, 7) - 1 + i, 1)).toISOString().slice(0, 7);

let cache: SetupInput[] | null = null;
export function onboardDemo(): SetupInput[] {
  if (cache) return cache;
  const today = ONB_DEMO_TODAY;
  const out: SetupInput[] = IN_FLIGHT.map(([name, v, stage, ago, ap, spec, mc, meet, ae, sp, team, mcp], i) => {
    const d0 = addDays(today, -ago); const day = (n: number | null) => (n == null ? null : addDays(d0, n));
    const orm = v === 'ORM';
    return {
      card_id: `ONB-IP-${i + 1}`, hotel_id: `ONB-H-IP-${i + 1}`, hotel_name: name, service_variant: v, stage,
      created_at: at(d0), approved_at: ap == null ? null : at(day(ap)!), specialist_handover_done_at: spec == null ? null : at(day(spec)!),
      meeting_created_at: mc == null ? null : at(day(mc)!), meeting_date: day(meet), go_live_at: null,
      ae: ONB_DEMO_AE[ae]!, specialist: orm ? ONB_DEMO_SPEC[sp]! : null, orm_team: orm ? team : null, marcom_owner: orm ? null : ONB_DEMO_MC[mcp]!,
    };
  });
  let k = 0;
  const lastOrm: SetupInput[] = [];
  for (let mi = 0; mi < ORM_M.length; mi++) {
    const month = monthAt(mi); const current = mi === ORM_M.length - 1;
    for (const svc of ['ORM', 'Marcom'] as const) {
      const n = (svc === 'ORM' ? ORM_M : MC_M)[mi]!;
      for (let j = 0; j < n; j++) {
        k++; const s = k * 5 + j;
        const v: SetupVariant = svc === 'ORM' ? 'ORM' : (mi + j) % 3 === 0 ? 'MARCOM_GMB' : 'MARCOM_META_TIKTOK';
        const gmb = v === 'MARCOM_GMB';
        const p1 = 3 + Math.floor(rnd(s + 1) * 6), p2o = 3 + Math.floor(rnd(s + 2) * 6);
        const w = gmb ? 0 : Math.floor(rnd(s + 3) * 4), p3 = gmb ? 0 : 1 + Math.floor(rnd(s + 4) * 3);
        const p2s = Math.min(3 + Math.floor(rnd(s + 5) * 5), p2o + w + p3);
        const total = p1 + p2o + w + p3;
        const dom = 2 + Math.floor(rnd(s + 6) * (current ? 25 : 26));
        const live = `${month}-${String(dom).padStart(2, '0')}`;
        const d0 = addDays(live, -total), ap = addDays(d0, p1), mcAt = addDays(ap, p2o), meet = addDays(mcAt, w);
        const recent = mi >= ORM_M.length - 6;
        // §16: 2 hotels in the last 6 months have both services (Marcom card shares an ORM card's hotel)
        const share = svc === 'Marcom' && recent && lastOrm.length && (mi === ORM_M.length - 3 || mi === ORM_M.length - 1) && j === 0 ? lastOrm.at(-1)! : null;
        const input: SetupInput = {
          card_id: `ONB-${svc === 'ORM' ? 'O' : 'M'}-${month}-${j + 1}`, hotel_id: share?.hotel_id ?? `ONB-H-${k}`,
          hotel_name: share?.hotel_name ?? `${PLACES[k % PLACES.length]} ${KINDS[Math.floor(k / PLACES.length) % KINDS.length]}`, service_variant: v, stage: svc === 'ORM' ? 'orm_go_live' : 'marcom_go_live',
          created_at: at(d0), approved_at: at(ap), specialist_handover_done_at: svc === 'ORM' ? at(addDays(ap, p2s)) : null,
          meeting_created_at: gmb ? null : at(mcAt), meeting_date: gmb ? null : meet, go_live_at: at(live),
          ae: ONB_DEMO_AE[Math.floor(rnd(s + 7) * 3)]!, specialist: svc === 'ORM' ? ONB_DEMO_SPEC[Math.floor(rnd(s + 8) * 2)]! : null,
          orm_team: svc === 'ORM' ? (rnd(s + 9) < 0.5 ? 'A' : 'B') : null, marcom_owner: svc === 'ORM' ? null : ONB_DEMO_MC[Math.floor(rnd(s + 10) * 2)]!,
        };
        out.push(input);
        if (svc === 'ORM' && recent) lastOrm.push(input);
      }
    }
  }
  cache = out;
  return out;
}
/** HR demo members added in memory only when missing (AE Fern · Nont · Ploy · Specialist Dao · Mint). */
export function demoHrOverlay(members: readonly HrMember[]): HrMember[] {
  const extra: HrMember[] = [];
  const has = (n: string, f: HrMember['function']) => members.some((m) => m.nickname === n && m.function === f);
  ONB_DEMO_AE.forEach((n) => { if (!has(n, 'AE')) extra.push({ id: `onb-demo-ae-${n}`, nickname: n, function: 'AE', orm_team: null, active: true }); });
  ONB_DEMO_SPEC.forEach((n) => { if (!has(n, 'ONBOARDING_SPECIALIST')) extra.push({ id: `onb-demo-sp-${n}`, nickname: n, function: 'ONBOARDING_SPECIALIST', orm_team: null, active: true }); });
  return [...members, ...extra];
}
