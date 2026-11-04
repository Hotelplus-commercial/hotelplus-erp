/* Tab R3 §10 — DEMO additions for card ④ อายุสัญญา (used only while DEMO is on, in memory, never stored).
 * Clock = Header R2 / Tab R1 demo "today" (28 Oct 2026). Reads the existing demo contracts as they are and ADDS beside them:
 * Go Live dates for them, ~88 active + ~47 ended service contracts, their price cycles (INITIAL + RENEWAL), non-renewal
 * reasons + AE notes and one WELCOME_BACK ticket in กำลังทำ (lock example). No existing demo entry is edited. */
import { TAB_R1_DEMO_NOW, tabR1DemoBase, tabR1DemoFlow } from './contract-tab-r1-demo';
import { headerDemoPortfolio } from './ps-header-r2-demo';
import { REASON_KEYS } from './renewal-r2';
import { editableUntil, type RenewalReason } from './renewal-reasons';
import type { PriceHistoryRow } from './renewal-rules';
import type { L0Ticket } from './tickets-l0';
import type { AgeContractSource, AgeSvc, RenewalLink, UpsellLine } from './contract-age';

export const CONTRACT_AGE_DEMO_NOW = TAB_R1_DEMO_NOW;
const addDays = (d: string, n: number) => new Date(Date.parse(d.slice(0, 10) + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const addMonths = (d: string, n: number) => { const x = new Date(d.slice(0, 10) + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
const T = (d: string) => `${d}T03:00:00.000Z`;

/* ---------- Go Live dates for the existing demo contracts (added beside them; R1-O1 / R1-M1 stay in Setup) ---------- */
const EXISTING_GO_LIVE: Record<string, string> = {
  'R2-O1': '2025-03-24', 'R2-O2': '2025-06-03', 'R2-O3': '2025-06-25', 'R2-O4': '2025-08-22', 'R2-O5': '2026-10-21', 'R2-O6': '2025-09-24',
  'R2-O7': '2025-01-27', 'R2-O8': '2024-11-25', 'R2-O9': '2025-02-24', 'R2-M1': '2025-04-25', 'R2-M2': '2025-07-28', 'R2-M3': '2025-10-27',
  'R2-M4': '2026-10-22', 'R2-M5': '2025-04-02', 'R2-M6': '2025-01-29', 'R1-O2': '2025-10-08', 'R1-O3': '2026-02-03', 'R1-O4': '2025-12-12',
  'R1-M2': '2025-12-26', 'R1-M3': '2025-06-24',
};
/** Owners / EN names for existing demo contracts that the existing exports do not carry (ended R1 additions, ended header hotels). */
const EXISTING_OWNER: Record<string, { ae: string; team: string }> = {
  'R1-O3': { ae: 'AE001-ดาว', team: 'ทีม B' }, 'R1-O4': { ae: 'AE003-ต้น', team: 'ทีม D' }, 'R1-M2': { ae: 'AE003-ต้น', team: 'บิว' },
  'R1-M3': { ae: 'AE002-มายด์', team: 'แนน' }, 'R1-M4': { ae: 'AE002-มายด์', team: 'แนน' },
};
const EN: Record<string, string> = {
  'บ้านสวนริมน้ำ รีสอร์ท': 'Baan Suan Rim Nam Resort', 'ภูผา บูทีค': 'Phupha Boutique', 'ทะเลใส พูลวิลล่า': 'Talay Sai Pool Villa', 'ลานนา เฮอริเทจ': 'Lanna Heritage',
  'สายลม บีช โฮเทล': 'Sailom Beach Hotel', 'เดอะ ซีวิว หัวหิน': 'The Seaview Hua Hin', 'นาคา ฮิลล์': 'Naka Hill', 'ริมโขง ลอดจ์': 'Rim Khong Lodge',
  'ดอยคำ เฮาส์': 'Doi Kham House', 'ชายหาด อินน์': 'Chaihad Inn', 'ชะอำ เปี่ยมสุข': 'Chaam Resort', 'ชบา แกรนด์': 'Chaba Grand', 'ที่นี่ดี โฮเทล': 'Teeneedee Hotel', 'อัญชลี': 'Anjali',
};
const EXISTING_REASONS: Record<string, [string, string, string, string?]> = {
  'R2-O7': ['PRICE_HIGH', 'REV_MISS', 'WORK_LATE', 'ลูกค้าย้ายไปใช้ทีมในเครือ'], 'R2-O9': ['OVERDUE', 'PRICE_HIGH', 'BUDGET_CUT'],
  'R2-M5': ['CAMPAIGN_MISS', 'VALUE_UNSEEN', 'MEETING_IRREGULAR'], 'R2-M6': ['VALUE_UNSEEN', 'PRICE_HIGH', 'MEETING_NO_OUTCOME'],
  'R1-O3': ['CLOSED', 'OVERDUE', 'RENOVATION'], 'R1-O4': ['COMPETITOR_CHEAPER', 'PRICE_HIGH', 'PROMISE_BROKEN'],
  'R1-M2': ['CAMPAIGN_MISS', 'BUDGET_CUT', 'WORK_LATE'], 'R1-M4': ['PRICE_HIGH', 'VALUE_UNSEEN', 'OWNER_CHURN', 'เจ้าของใหม่อยากลองทำเอง'],
};

/* ---------- R3 additions ---------- */
const PLACES: [string, string][] = [['Chiang Mai', 'เชียงใหม่'], ['Phuket', 'ภูเก็ต'], ['Krabi', 'กระบี่'], ['Samui', 'สมุย'], ['Hua Hin', 'หัวหิน'], ['Pattaya', 'พัทยา'], ['Khao Lak', 'เขาหลัก'], ['Pai', 'ปาย'], ['Kanchanaburi', 'กาญจนบุรี'], ['Ayutthaya', 'อยุธยา'],
  ['Rayong', 'ระยอง'], ['Trat', 'ตราด'], ['Nan', 'น่าน'], ['Sukhothai', 'สุโขทัย'], ['Lampang', 'ลำปาง'], ['Udon', 'อุดร'], ['Khon Kaen', 'ขอนแก่น'], ['Korat', 'โคราช'], ['Phang Nga', 'พังงา'], ['Satun', 'สตูล']];
const KINDS: [string, string][] = [['Resort', 'รีสอร์ท'], ['Boutique', 'บูทีค'], ['Villa', 'วิลล่า'], ['Hotel', 'โฮเทล'], ['Lodge', 'ลอดจ์'], ['Retreat', 'รีทรีต'], ['Inn', 'อินน์']];
const AES = ['AE001-ดาว', 'AE002-มายด์', 'AE003-ต้น'];
const ORM_TEAMS = ['A', 'B', 'C', 'D', 'E'];
const MARCOM = ['แนน', 'บิว'];
type Pkg = { name: string; fee: number | null; com: number | null; upsell?: UpsellLine[] };
const ORM_PKG: Pkg[] = [{ name: 'ORM Smart (A+B)', fee: 8500, com: 10 }, { name: 'ORM Lite', fee: 6000, com: null }, { name: 'ORM Full', fee: 15000, com: null }, { name: 'ORM Commission', fee: null, com: 12 }];
const MARCOM_PKG: Pkg[] = [{ name: 'Meta Full Package', fee: 15000, com: null, upsell: [{ sku: 'GMB + IBE', price: 2500 }] }, { name: 'Content Starter', fee: 9000, com: null }, { name: 'GMB Basic', fee: 4500, com: null }];
const NOTES = ['ลูกค้าบอกว่าถ้าราคาลงมาจะกลับมาคุยใหม่', 'GM คนใหม่อยากลองทำเองก่อน', 'ปีหน้าจะรีโนเวทเสร็จ ขอให้ติดต่อกลับ', 'เจ้าของเปลี่ยนนโยบาย ตัดงบการตลาดทั้งหมด'];

type Spec = { svc: AgeSvc; age: number; ended?: 'NOT_RENEWED' | 'LOST'; endBack?: number; may?: true };
function specs(): Spec[] {
  let seed = 23; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const span = (a: number, b: number) => Math.round(a + rnd() * (b - a));
  const out: Spec[] = [];
  const addActive = (svc: AgeSvc, n: number, a: number, b: number) => { for (let i = 0; i < n; i++) out.push({ svc, age: span(a, b) }); };
  addActive('ORM', 16, 4, 120); addActive('Marcom', 8, 6, 120);
  addActive('ORM', 18, 340, 512); addActive('Marcom', 8, 345, 510);
  addActive('ORM', 15, 600, 850); addActive('Marcom', 6, 610, 840);
  addActive('ORM', 9, 880, 1700); addActive('Marcom', 3, 900, 1500);
  // Go Live พ.ค. 68 group (RP97): 5 active · 1 ไม่ต่อ · 2 ยกเลิกก่อนกำหนด.
  for (const [svc, age] of [['ORM', 540], ['ORM', 533], ['Marcom', 528], ['ORM', 521], ['Marcom', 537]] as const) out.push({ svc, age, may: true });
  out.push({ svc: 'ORM', age: 362, ended: 'NOT_RENEWED', may: true }, { svc: 'ORM', age: 88, ended: 'LOST', may: true }, { svc: 'Marcom', age: 141, ended: 'LOST', may: true });
  const addEnded = (n: number, a: number, b: number, lostShare: number) => {
    for (let i = 0; i < n; i++) out.push({ svc: rnd() < 0.68 ? 'ORM' : 'Marcom', age: span(a, b), ended: rnd() < lostShare ? 'LOST' : 'NOT_RENEWED', endBack: span(5, 640) });
  };
  addEnded(26, 45, 210, 0.6); addEnded(15, 330, 395, 0.15); addEnded(3, 520, 820, 0.1);
  return out;
}
const MAY_GO_LIVE: Record<number, string> = { 540: '2025-05-06', 537: '2025-05-09', 533: '2025-05-13', 528: '2025-05-18', 521: '2025-05-25', 362: '2025-05-20', 88: '2025-05-08', 141: '2025-05-15' };
const isMay25 = (d: string) => d.slice(0, 7) === '2025-05';

export type ContractAgeDemo = {
  sources: AgeContractSource[]; links: RenewalLink[]; prices: PriceHistoryRow[]; upsell: Record<string, UpsellLine[]>;
  reasons: RenewalReason[]; tickets: L0Ticket[]; firstMeeting: Record<string, string>; lowSurveys: Record<string, { at: string; score: number }[]>;
};
let cache: ContractAgeDemo | null = null;
/** Deterministic DEMO feed for card ④ (existing demo contracts + R3 additions). */
export function contractAgeDemo(): ContractAgeDemo {
  if (cache) return cache;
  const today = CONTRACT_AGE_DEMO_NOW;
  const sources: AgeContractSource[] = []; const prices: PriceHistoryRow[] = []; const upsell: Record<string, UpsellLine[]> = {};
  const reasons: RenewalReason[] = []; const firstMeeting: Record<string, string> = {}; const lowSurveys: ContractAgeDemo['lowSurveys'] = {};
  /* existing demo contracts (read as they are) */
  const header = headerDemoPortfolio().contracts; const base = tabR1DemoBase();
  for (const f of tabR1DemoFlow()) {
    const h = header.find((c) => c.contract_id === f.contract_id); const b = base.find((x) => x.contract_id === f.contract_id); const own = EXISTING_OWNER[f.contract_id];
    const th = b?.hotel_name_th ?? h?.hotel_name ?? f.hotel_name;
    const ae = b?.ae ?? h?.ae ?? own?.ae ?? null;
    const team = f.service === 'ORM' ? (b?.orm_team ? `ทีม ${b.orm_team}` : h?.orm ? h.orm.replace(/^Team\s+/, 'ทีม ') : own?.team ?? null) : (b?.marcom ?? h?.marcom ?? own?.team ?? null);
    const kind = f.end_reason === 'EARLY_TERMINATION' ? 'LOST' : f.end_reason === 'NOT_RENEWED' ? 'NOT_RENEWED' : f.end_reason === 'RENEWAL' ? 'RENEWAL' : null;
    const gl = EXISTING_GO_LIVE[f.contract_id] ?? null;
    sources.push({ contract_id: f.contract_id, hotel_id: f.hotel_id, hotel_name_en: b?.hotel_name_en ?? EN[th] ?? null, hotel_name_th: th, service: f.service, ae_id: ae, ae_name: ae ? ae.replace(/^AE\d+-/, '') : null, team_label: team,
      signed_at: f.start, go_live_at: gl, renewal_of: f.renewal_of, ended_at: f.end, end_kind: kind, notice_at: f.end && kind && kind !== 'RENEWAL' ? addDays(f.end, kind === 'LOST' ? -10 : -30) : null });
    if (gl) firstMeeting[f.contract_id] = addDays(gl, 30);
    const r = EXISTING_REASONS[f.contract_id];
    if (r && f.end && kind && kind !== 'RENEWAL') reasons.push(reasonRec(`RR-R3-X-${f.contract_id}`, f.contract_id, f.service, kind, r, f.end, ae));
  }
  /* R3 additions */
  let iO = 0, iM = 0, iH = 0;
  for (const s of specs()) {
    const no = s.svc === 'ORM' ? ++iO : ++iM; const k = iH++;
    const id = `CT-${s.svc === 'ORM' ? 'ORM' : 'MAR'}-L${String(no).padStart(3, '0')}`;
    const [pe, pt] = PLACES[k % PLACES.length]!; const [ke, kt] = KINDS[Math.floor(k / PLACES.length) % KINDS.length]!;
    const suffix = k >= PLACES.length * KINDS.length ? ' II' : '';
    let ended: string | null = null; let gl: string;
    if (s.may) { gl = MAY_GO_LIVE[s.age]!; if (s.ended) ended = addDays(gl, s.age); }
    else if (s.ended) {
      ended = addDays(today, -(s.endBack ?? 30)); gl = addDays(ended, -s.age);
      if (isMay25(gl)) { ended = addDays(ended, ended > addDays(today, -60) ? -45 : 45); gl = addDays(ended, -s.age); }
    } else { gl = addDays(today, -s.age); if (isMay25(gl)) gl = addDays(gl, -20); }
    const ae = AES[k % AES.length]!;
    const team = s.svc === 'ORM' ? `ทีม ${ORM_TEAMS[k % ORM_TEAMS.length]}` : MARCOM[k % MARCOM.length]!;
    const signed = addDays(gl, -21);
    sources.push({ contract_id: id, hotel_id: `R3-H${String(k + 1).padStart(3, '0')}`, hotel_name_en: `${pe} ${ke}${suffix}`, hotel_name_th: `${pt} ${kt}${suffix}`, service: s.svc,
      ae_id: ae, ae_name: ae.replace(/^AE\d+-/, ''), team_label: team, signed_at: signed, go_live_at: gl, renewal_of: null,
      ended_at: ended, end_kind: s.ended ?? null, notice_at: ended ? addDays(ended, s.ended === 'LOST' ? -10 : -30) : null });
    firstMeeting[id] = addDays(gl, 30);
    /* price cycles: INITIAL at signing, RENEWAL every 12 months while the contract runs */
    const pkg = (s.svc === 'ORM' ? ORM_PKG : MARCOM_PKG)[k % (s.svc === 'ORM' ? ORM_PKG.length : MARCOM_PKG.length)]!;
    const stop = ended ?? today; let from = signed; let cycle = 1; let fee = pkg.fee;
    while (from <= stop && cycle < 12) {
      const to = addDays(addMonths(from, 12), -1);
      prices.push({ contract_id: id, cycle_no: cycle, fee_amount: fee, commission_pct: pkg.com, term_months: 12, package: pkg.name, effective_from: from, effective_to: to, source: cycle === 1 ? 'INITIAL' : 'RENEWAL', renewal_request_id: cycle === 1 ? null : `RR-R3-${id}-${cycle}` });
      from = addDays(to, 1); cycle++; if (fee != null) fee = Math.round((fee * 1.05) / 100) * 100;
    }
    if (pkg.upsell) upsell[id] = pkg.upsell;
    if (ended && s.ended) {
      if (k % 4 === 1) lowSurveys[id] = [{ at: addDays(gl, Math.min(120, Math.max(10, s.age - 20))), score: 4 }];
      if (k % 11 !== 3) { // ≈ 10% without reasons
        const p1 = REASON_KEYS[k % REASON_KEYS.length]!; const p2 = REASON_KEYS[(k * 3 + 1) % REASON_KEYS.length]!; const p3 = REASON_KEYS[(k * 5 + 2) % REASON_KEYS.length]!;
        const pick = [...new Set([p1, p2, p3, ...REASON_KEYS])].slice(0, 3) as [string, string, string];
        reasons.push(reasonRec(`RR-R3-${id}`, id, s.svc, s.ended, [...pick, k % 3 === 0 ? NOTES[k % NOTES.length] : undefined], ended, ae));
      }
    }
  }
  const lockTarget = sources.find((s) => s.contract_id.startsWith('CT-ORM-L') && s.end_kind === 'NOT_RENEWED' && s.ended_at && s.ended_at < '2026-09-01')!;
  const tickets: L0Ticket[] = [welcomeBackSeed('TKT-000951', lockTarget)];
  cache = { sources, links: [], prices, upsell, reasons, tickets, firstMeeting, lowSurveys };
  return cache;
}
function reasonRec(id: string, contract_id: string, service: AgeSvc, outcome: 'NOT_RENEWED' | 'LOST', r: (string | undefined)[], ended: string, ae: string | null): RenewalReason {
  const created = T(addDays(ended, 2));
  return { id, contract_id, service, renewal_card_id: null, outcome, primary: [r[0]!, r[1]!], secondary: r[2]!, ...(r[3] ? { note: r[3] } : {}),
    created_by: { member_id: ae ?? 'AE', display: ae ? ae.replace(/^AE\d+-/, '') : 'AE', role: 'AE' }, created_at: created, editable_until: editableUntil(created) };
}
function welcomeBackSeed(ticket_id: string, s: AgeContractSource): L0Ticket {
  const at = T('2026-10-20'), moved = T('2026-10-22');
  return {
    ticket_id, type: 'WELCOME_BACK', source_app: 'PS_DASHBOARD', created_by: 'PM', target_dept: 'BD',
    subject_ref: { hotel_id: s.hotel_id, hotel_name: s.hotel_name_th ?? s.hotel_id, gap_service: s.service, service_line: s.service, contract_id: s.contract_id, service: s.service },
    payload: { readiness_tier: '', chips: [], note: 'ลูกค้าเคยบอกว่าถ้าราคาเหมาะจะกลับมาคุย', contract_id: s.contract_id, timeline_shared: false, drive_attachments: [], message: 'ลูกค้าเคยบอกว่าถ้าราคาเหมาะจะกลับมาคุย' },
    assignee: { member_id: 'BDM', display: 'BDM', role: 'BDM' }, status: 'IN_PROGRESS', created_at: at, revision: 1,
    audit: [{ at, by: 'PM', from_status: null, to_status: 'NEW' }, { at: moved, by: 'BD', from_status: 'NEW', to_status: 'IN_PROGRESS' }],
  };
}
