/* Tab R4 §15 — DEMO additions for card ⑤ ระยะเวลา Setup and the On-board / Off-board queue table only.
 * New entries (never edits the existing Servicing demo fixture); deterministic; DEMO date = R3 demo date (28 ต.ค. 2569).
 * HANDOVER_FIX demo tickets live here in memory only — never written to the ticket store. */
import type { L0Ticket } from './tickets-l0';
import type { SetupInput, SetupVariant } from './setup-timing';
import { addDays } from './setup-timing';
import { CONTRACT_AGE_DEMO_NOW } from './contract-age-demo';

export const SETUP_DEMO_TODAY: string = CONTRACT_AGE_DEMO_NOW;
const at = (d: string) => `${d}T03:00:00.000Z`; // 10:00 Bangkok
const AE = ['Nont', 'Fern', 'Boss', 'Mild'];
const SPEC = ['Dao', 'Pim'];
const TEAM = ['A', 'B', 'C', 'D', 'E'];
const MC = ['แนน', 'บิว', 'โบว์', 'เจน'];

type InFlight = [name: string, v: SetupVariant, createdAgo: number, approved: number | null, spec: number | null, meetCreated: number | null, meeting: number | null];
/** Day numbers count from the card's created date (day 0); a meeting day past "today" is a future appointment. */
const IN_FLIGHT: InFlight[] = [
  ['อันดามัน บลู', 'ORM', 1, null, null, null, null], // day 0–1
  ['ทองหล่อ เฮาส์', 'ORM', 7, null, null, null, null], // P1 near
  ['เชียงดาว ฟอเรสต์', 'ORM', 9, 4, null, null, null], // p2s + p2o running together
  ['ศรีราชา มารีน่า', 'ORM', 12, 5, 9, null, null], // p2s done, p2o running (near)
  ['บางกระเจ้า กรีน', 'ORM', 16, 6, 11, 13, 18], // waiting for meeting · past the 14-day total
  ['แม่กลอง ริเวอร์', 'ORM', 15, 8, 12, 13, 13], // P1 late (done) · P3 running
  ['สามพันโบก ลอดจ์', 'ORM', 13, 5, null, 10, 16], // p2s late (running)
  ['เกาะกูด ไอส์แลนด์', 'MARCOM_META_TIKTOK', 3, null, null, null, null],
  ['นครพนม ริมโขง', 'MARCOM_META_TIKTOK', 10, 6, null, null, null],
  ['ตะกั่วป่า บีช', 'MARCOM_GMB', 8, 3, null, null, null], // GMB in P2
  ['ภูกระดึง วิว', 'MARCOM_META_TIKTOK', 14, 5, null, 11, 11], // P3 near
  ['บึงกาฬ เลค', 'MARCOM_META_TIKTOK', 20, 7, null, 16, 23], // p2o late (done) · waiting
];

/** Went-live per month, Oct 2567 → Oct 2569 (25 months, current month last). */
const FIRST_MONTH = '2024-10';
const ORM_PER_MONTH = [3, 2, 4, 3, 1, 2, 3, 4, 2, 3, 2, 1, 3, 4, 2, 3, 3, 2, 4, 1, 3, 2, 4, 3, 3];
const MC_PER_MONTH = [2, 1, 2, 3, 1, 2, 2, 1, 3, 2, 1, 2, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2];
const PLACES = ['ริมปิง', 'ภูเรือ', 'บ้านเพ', 'หาดเฉวง', 'แม่สาย', 'ท่าแพ', 'ดอยสุเทพ', 'หัวทะเล', 'บางปู', 'ปากน้ำ', 'เกาะช้าง', 'ภูทับเบิก', 'คลองสาน', 'เวียงกุมกาม', 'สันกำแพง', 'หาดกะรน', 'อ่าวนาง', 'ปราณบุรี', 'เขาหลัก', 'บ่อผุด'];
const KINDS = ['รีสอร์ท', 'บูทีค', 'วิลล่า', 'เรสซิเดนซ์', 'อินน์', 'โฮมสเตย์', 'ลอดจ์', 'สวีท'];
const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const pick = <T,>(xs: T[], n: number) => xs[Math.floor(rnd(n) * xs.length) % xs.length]!;
const monthAt = (i: number) => { const d = new Date(Date.UTC(+FIRST_MONTH.slice(0, 4), +FIRST_MONTH.slice(5, 7) - 1 + i, 1)); return d.toISOString().slice(0, 7); };

export type SetupDemo = { inputs: SetupInput[]; fixTickets: L0Ticket[]; counts: { inProgressOrm: number; inProgressMc: number; liveOrm: number; liveMc: number; fixTickets: number } };

let cache: SetupDemo | null = null;
export function setupDemo(): SetupDemo {
  if (cache) return cache;
  const today = SETUP_DEMO_TODAY;
  const inputs: SetupInput[] = IN_FLIGHT.map(([name, v, ago, ap, spec, mc, meet], i) => {
    const d0 = addDays(today, -ago); const day = (n: number | null) => (n == null ? null : addDays(d0, n));
    return {
      card_id: `SD-IP-${i + 1}`, hotel_id: `SD-H-IP-${i + 1}`, hotel_name: name, service_variant: v,
      created_at: at(d0), approved_at: ap == null ? null : at(day(ap)!), specialist_handover_done_at: spec == null ? null : at(day(spec)!),
      meeting_created_at: mc == null ? null : at(day(mc)!), meeting_date: day(meet), go_live_at: null,
      ae: AE[i % 4]!, specialist: v === 'ORM' ? SPEC[i % 2]! : null, orm_team: v === 'ORM' ? TEAM[i % 5]! : null, marcom_owner: v === 'ORM' ? null : MC[i % 4]!,
    };
  });
  const fixTickets: L0Ticket[] = [];
  let k = 0;
  for (let mi = 0; mi < ORM_PER_MONTH.length; mi++) {
    const month = monthAt(mi); const current = mi === ORM_PER_MONTH.length - 1;
    for (const svc of ['ORM', 'Marcom'] as const) {
      const count = (svc === 'ORM' ? ORM_PER_MONTH : MC_PER_MONTH)[mi]!;
      for (let j = 0; j < count; j++) {
        k++;
        const s = k * 7 + j;
        const v: SetupVariant = svc === 'ORM' ? 'ORM' : (mi + j) % 4 === 0 ? 'MARCOM_GMB' : 'MARCOM_META_TIKTOK';
        const gmb = v === 'MARCOM_GMB';
        const slow = current && j === 0; // current-month go-lives past the total target
        const p1 = slow ? 8 : 3 + Math.floor(rnd(s + 1) * 6);
        const p2o = slow ? 7 : 4 + Math.floor(rnd(s + 2) * 5);
        const w = gmb ? 0 : slow ? 2 : Math.floor(rnd(s + 3) * 4);
        const p3 = gmb ? 0 : slow ? 2 : 1 + Math.floor(rnd(s + 4) * 3);
        const p2s = Math.min(3 + Math.floor(rnd(s + 5) * 5), p2o + w + p3);
        const total = p1 + p2o + w + p3;
        const dom = 2 + Math.floor(rnd(s + 6) * (current ? 27 : 26));
        const live = `${month}-${String(Math.min(dom, current ? 29 : 28)).padStart(2, '0')}`;
        const d0 = addDays(live, -total), ap = addDays(d0, p1), mcAt = addDays(ap, p2o), meet = addDays(mcAt, w);
        const id = `SD-${svc === 'ORM' ? 'O' : 'M'}-${month}-${j + 1}`;
        inputs.push({
          card_id: id, hotel_id: `SD-H-${k}`, hotel_name: `${PLACES[k % PLACES.length]} ${KINDS[Math.floor(k / PLACES.length) % KINDS.length]}`, service_variant: v,
          created_at: at(d0), approved_at: at(ap), specialist_handover_done_at: svc === 'ORM' ? at(addDays(ap, p2s)) : null,
          meeting_created_at: gmb ? null : at(mcAt), meeting_date: gmb ? null : meet, go_live_at: at(live),
          ae: pick(AE, s + 7), specialist: svc === 'ORM' ? pick(SPEC, s + 8) : null, orm_team: svc === 'ORM' ? pick(TEAM, s + 9) : null, marcom_owner: svc === 'ORM' ? null : pick(MC, s + 10),
          survey1: svc === 'ORM' ? 6 + Math.floor(rnd(s + 11) * 5) : null, survey2: 5 + Math.floor(rnd(s + 12) * 6),
        });
        if (svc === 'ORM' && k % 6 === 2) {
          fixTickets.push({
            ticket_id: `TKT-HF-DEMO-${fixTickets.length + 1}`, type: 'HANDOVER_FIX', source_app: 'PS_DASHBOARD', created_by: 'ORM', target_dept: 'PS',
            subject_ref: { hotel_id: `SD-H-${k}`, hotel_name: inputs.at(-1)!.hotel_name, gap_service: '', card_id: id, checklist_item_id: `${id}-handover-1` },
            payload: { readiness_tier: '', chips: [], note: 'ขอแก้งานส่งมอบ (DEMO)' }, status: 'DONE', created_at: at(addDays(ap, Math.max(1, p2s - 1))), revision: 0, audit: [],
          });
        }
      }
    }
  }
  const ip = inputs.filter((x) => !x.go_live_at), gl = inputs.filter((x) => x.go_live_at);
  cache = {
    inputs, fixTickets,
    counts: { inProgressOrm: ip.filter((x) => x.service_variant === 'ORM').length, inProgressMc: ip.filter((x) => x.service_variant !== 'ORM').length,
      liveOrm: gl.filter((x) => x.service_variant === 'ORM').length, liveMc: gl.filter((x) => x.service_variant !== 'ORM').length, fixTickets: fixTickets.length },
  };
  return cache;
}
