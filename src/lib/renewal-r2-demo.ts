/* Tab R2 §11 — DEMO additions for the renewal card (used only while DEMO is on). Clock = 28 Oct 2026 (Header R2 / Tab R1).
 * Reads the Tab R1 demo active contracts as they are (planning rows, e.g. Q1 70) and ADDS renewal states, extra
 * service contracts (12+ months of history) and non-renewal reasons beside them. No existing demo entry is edited.
 * These additions are not fed to the header (“ใช้งาน” / “หลุด” stay as they are). */
import { TAB_R1_DEMO_NOW, tabR1DemoBase } from './contract-tab-r1-demo';
import { REASON_KEYS, type RenewalItem, type Stage, type SubStep } from './renewal-r2';
import { editableUntil, type RenewalReason } from './renewal-reasons';
import type { ScanContract } from './renewal-scan';
import type { Svc } from './contract-tab-r1';

export const RENEWAL_R2_DEMO_NOW = TAB_R1_DEMO_NOW;
const T = (d: string) => `${d}T03:00:00.000Z`;

/** States added to the existing Tab R1 demo active contracts (others stay ยังไม่เริ่ม). */
const BASE_STATE: Record<string, Partial<RenewalItem>> = {
  // Dusit Pool Villa: รอ PM อนุมัติ 3 วัน (end date kept as in the Tab R1 demo: 30 Nov 2026).
  'R1-O2': { stage: 'IN_PROGRESS', sub: 'PENDING_APPROVAL', card_id: 'RN-DEMO-R1-O2', created_source: 'BOT', request_created_at: T('2026-10-20'), pending_since: T('2026-10-25'), last_activity: { at: T('2026-10-25'), what: 'ส่งคำขอให้ PM อนุมัติ' } },
};

type Add = { id: string; en: string; th: string; svc: Svc; ae: string; team: string; end: string; stage: Stage; sub?: SubStep; lost?: boolean; effective?: string; signed?: string; req?: string; link?: string; pending?: string; act?: [string, string]; card?: 'BOT' | 'AE_EARLY'; reason?: [string, string, string, string, string?] };
const A = 'AE001-ดาว', M = 'AE002-มายด์', N = 'AE003-ต้น';
const ADDED: Add[] = [
  /* ---- Q4 69 ---- */
  { id: 'CT-MAR-Q-MAR-0388', en: 'Teeneedee Hotel', th: 'ที่นี่ดี โฮเทล', svc: 'Marcom', ae: N, team: 'บิว', end: '2026-10-12', stage: 'LOST_OR_DECLINED', card: 'BOT', act: ['2026-10-12', 'ลูกค้าแจ้งไม่ต่อสัญญา'], reason: ['PRICE_HIGH', 'CAMPAIGN_MISS', 'MEETING_IRREGULAR', '2026-10-24', N] },
  { id: 'CT-ORM-Q-ORM-0402', en: 'Chaam Resort', th: 'ชะอำ เปี่ยมสุข', svc: 'ORM', ae: A, team: 'B', end: '2027-01-14', stage: 'LOST_OR_DECLINED', lost: true, effective: '2026-10-15' },
  { id: 'CT-ORM-Q-ORM-0410', en: 'Chaba Grand', th: 'ชบา แกรนด์', svc: 'ORM', ae: N, team: 'D', end: '2026-12-07', stage: 'LINK_SENT', card: 'BOT', req: '2026-10-12', link: '2026-10-20', act: ['2026-10-20', 'ส่ง link ให้ลูกค้า'] },
  { id: 'CT-MAR-Q-MAR-0415', en: 'Anjali', th: 'อัญชลี', svc: 'Marcom', ae: M, team: 'แนน', end: '2026-12-22', stage: 'NOT_STARTED', card: 'BOT' },
  { id: 'CT-ORM-Q-ORM-0413', en: 'Seefah', th: 'ซีฟ้า', svc: 'ORM', ae: M, team: 'E', end: '2026-12-25', stage: 'IN_PROGRESS', sub: 'DRAFT', card: 'AE_EARLY', req: '2026-10-21', act: ['2026-10-21', 'สร้างคำขอต่อสัญญา'] },
  { id: 'CT-ORM-Q-ORM-0397', en: 'Baan Chiang', th: 'บ้านเชียง', svc: 'ORM', ae: A, team: 'C', end: '2026-10-25', stage: 'IN_PROGRESS', sub: 'RETURNED', card: 'BOT', req: '2026-09-05', act: ['2026-10-09', 'PM ส่งกลับให้แก้ราคา'] },
  { id: 'CT-ORM-Q-ORM-0391', en: 'Phuket Sands', th: 'ภูเก็ต แซนด์', svc: 'ORM', ae: N, team: 'A', end: '2026-10-31', stage: 'RENEWED', card: 'BOT', req: '2026-09-08', link: '2026-10-02', signed: '2026-10-10', act: ['2026-10-10', 'ลูกค้าเซ็นต่อสัญญา'] },
  { id: 'CT-MAR-Q-MAR-0392', en: 'Koh Chang Paradise', th: 'เกาะช้าง พาราไดซ์', svc: 'Marcom', ae: A, team: 'แนน', end: '2026-10-05', stage: 'RENEWED', card: 'BOT', req: '2026-08-20', link: '2026-09-15', signed: '2026-09-29' },
  { id: 'CT-ORM-Q-ORM-0405', en: 'Sukhumvit Suites', th: 'สุขุมวิท สวีท', svc: 'ORM', ae: M, team: 'B', end: '2026-11-18', stage: 'RENEWED', card: 'BOT', req: '2026-09-25', link: '2026-10-15', signed: '2026-10-22' },
  { id: 'CT-MAR-Q-MAR-0407', en: 'Hua Hin Breeze', th: 'หัวหิน บรีซ', svc: 'Marcom', ae: N, team: 'บิว', end: '2026-11-10', stage: 'IN_PROGRESS', sub: 'READY', card: 'BOT', req: '2026-10-01', act: ['2026-10-14', 'PM อนุมัติแล้ว · รอส่ง link'] },
  { id: 'CT-ORM-Q-ORM-0409', en: 'Pai Valley', th: 'ปาย วัลเลย์', svc: 'ORM', ae: A, team: 'E', end: '2026-11-25', stage: 'LINK_SENT', card: 'BOT', req: '2026-10-01', link: '2026-10-10', act: ['2026-10-10', 'ส่ง link ให้ลูกค้า'] },
  /* ---- Q1 70 planning ---- */
  { id: 'CT-MAR-Q-MAR-0420', en: 'River Kwai Retreat', th: 'ริมแคว รีทรีต', svc: 'Marcom', ae: A, team: 'แนน', end: '2027-01-20', stage: 'NOT_STARTED' },
  { id: 'CT-ORM-Q-ORM-0421', en: 'Koh Lanta Cove', th: 'เกาะลันตา โคฟ', svc: 'ORM', ae: N, team: 'C', end: '2027-03-12', stage: 'NOT_STARTED' },
  /* ---- old LOST without reason ---- */
  { id: 'CT-ORM-Q-ORM-0301', en: 'Sukho Inn', th: 'สุโข อินน์', svc: 'ORM', ae: N, team: 'C', end: '2026-12-31', stage: 'LOST_OR_DECLINED', lost: true, effective: '2026-05-10' },
  /* ---- Q3 69 ---- */
  { id: 'CT-ORM-Q-ORM-0361', en: 'Samui Palm', th: 'สมุย ปาล์ม', svc: 'ORM', ae: A, team: 'A', end: '2026-07-12', stage: 'RENEWED', signed: '2026-07-02' },
  { id: 'CT-MAR-Q-MAR-0362', en: 'Chiang Rai Hill', th: 'เชียงราย ฮิลล์', svc: 'Marcom', ae: M, team: 'แนน', end: '2026-07-20', stage: 'LOST_OR_DECLINED', reason: ['VALUE_UNSEEN', 'CAMPAIGN_MISS', 'BUDGET_CUT', '2026-07-22', M] },
  { id: 'CT-ORM-Q-ORM-0366', en: 'Krabi Bay', th: 'กระบี่ เบย์', svc: 'ORM', ae: A, team: 'B', end: '2027-02-01', stage: 'LOST_OR_DECLINED', lost: true, effective: '2026-07-25', reason: ['OVERDUE', 'PRICE_HIGH', 'IN_HOUSE', '2026-07-28', A] },
  { id: 'CT-ORM-Q-ORM-0363', en: 'Kata Beach', th: 'กะตะ บีช', svc: 'ORM', ae: N, team: 'D', end: '2026-08-15', stage: 'RENEWED', signed: '2026-08-01' },
  { id: 'CT-ORM-Q-ORM-0364', en: 'Ayutthaya Riverside', th: 'อยุธยา ริเวอร์ไซด์', svc: 'ORM', ae: M, team: 'C', end: '2026-08-30', stage: 'LOST_OR_DECLINED', reason: ['PRICE_HIGH', 'COMPETITOR_CHEAPER', 'WORK_LATE', '2026-09-02', M] },
  { id: 'CT-MAR-Q-MAR-0365', en: 'Khao Yai Lodge', th: 'เขาใหญ่ ลอดจ์', svc: 'Marcom', ae: A, team: 'บิว', end: '2026-09-18', stage: 'RENEWED', signed: '2026-09-10' },
  { id: 'CT-ORM-Q-ORM-0367', en: 'Rayong Seaside', th: 'ระยอง ซีไซด์', svc: 'ORM', ae: N, team: 'A', end: '2026-09-25', stage: 'RENEWED', signed: '2026-09-20' },
  /* ---- Q2 69 ---- */
  { id: 'CT-ORM-Q-ORM-0351', en: 'Nan Heritage', th: 'น่าน เฮอริเทจ', svc: 'ORM', ae: M, team: 'E', end: '2026-04-10', stage: 'RENEWED', signed: '2026-04-02' },
  { id: 'CT-MAR-Q-MAR-0352', en: 'Lampang Garden', th: 'ลำปาง การ์เดน', svc: 'Marcom', ae: N, team: 'แนน', end: '2026-05-05', stage: 'LOST_OR_DECLINED', reason: ['CAMPAIGN_MISS', 'VALUE_UNSEEN', 'MEETING_IRREGULAR', '2026-05-08', N] },
  { id: 'CT-ORM-Q-ORM-0353', en: 'Trang Island', th: 'ตรัง ไอส์แลนด์', svc: 'ORM', ae: A, team: 'D', end: '2026-05-28', stage: 'RENEWED', signed: '2026-05-20' },
  { id: 'CT-ORM-Q-ORM-0354', en: 'Phang Nga View', th: 'พังงา วิว', svc: 'ORM', ae: N, team: 'B', end: '2026-06-14', stage: 'LOST_OR_DECLINED', reason: ['PRICE_HIGH', 'REV_MISS', 'OWNER_CHURN', '2026-06-16', N] },
  { id: 'CT-MAR-Q-MAR-0355', en: 'Pattaya Wave', th: 'พัทยา เวฟ', svc: 'Marcom', ae: M, team: 'บิว', end: '2026-06-28', stage: 'RENEWED', signed: '2026-06-25' },
  /* ---- Q1 69 ---- */
  { id: 'CT-ORM-Q-ORM-0341', en: 'Udon Central', th: 'อุดร เซ็นทรัล', svc: 'ORM', ae: A, team: 'C', end: '2026-01-15', stage: 'RENEWED', signed: '2026-01-08' },
  { id: 'CT-ORM-Q-ORM-0342', en: 'Korat Grand', th: 'โคราช แกรนด์', svc: 'ORM', ae: M, team: 'A', end: '2026-02-12', stage: 'LOST_OR_DECLINED', reason: ['REV_MISS', 'PRICE_HIGH', 'PROMISE_BROKEN', '2026-02-14', M] },
  { id: 'CT-MAR-Q-MAR-0343', en: 'Hat Yai City', th: 'หาดใหญ่ ซิตี้', svc: 'Marcom', ae: A, team: 'แนน', end: '2026-03-08', stage: 'RENEWED', signed: '2026-03-01' },
  { id: 'CT-ORM-Q-ORM-0344', en: 'Loei Mountain', th: 'เลย เมาน์เทน', svc: 'ORM', ae: N, team: 'E', end: '2026-09-30', stage: 'LOST_OR_DECLINED', lost: true, effective: '2026-03-20', reason: ['CLOSED', 'OVERDUE', 'RENOVATION', '2026-03-22', N] },
  /* ---- Q4 68 ---- */
  { id: 'CT-ORM-Q-ORM-0331', en: 'Chanthaburi Gems', th: 'จันทบุรี เจมส์', svc: 'ORM', ae: M, team: 'D', end: '2025-10-20', stage: 'RENEWED', signed: '2025-10-12' },
  { id: 'CT-MAR-Q-MAR-0332', en: 'Nakhon Pathom Stay', th: 'นครปฐม สเตย์', svc: 'Marcom', ae: N, team: 'บิว', end: '2025-11-15', stage: 'LOST_OR_DECLINED', reason: ['VALUE_UNSEEN', 'PRICE_HIGH', 'MEETING_NO_OUTCOME', '2025-11-18', N] },
  { id: 'CT-ORM-Q-ORM-0333', en: 'Surin Silk', th: 'สุรินทร์ ซิลค์', svc: 'ORM', ae: A, team: 'B', end: '2025-12-10', stage: 'RENEWED', signed: '2025-12-02' },
  { id: 'CT-ORM-Q-ORM-0334', en: 'Mae Hong Son Mist', th: 'แม่ฮ่องสอน มิสต์', svc: 'ORM', ae: N, team: 'C', end: '2025-12-28', stage: 'LOST_OR_DECLINED', reason: ['COMPETITOR_CHEAPER', 'PRICE_HIGH', 'WORK_LATE', '2025-12-30', N] },
];

const fromAdd = (a: Add): RenewalItem => ({
  contract_id: a.id, hotel_id: `R2R-${a.en}`, hotel_name: a.th, hotel_name_th: a.th, hotel_name_en: a.en, service: a.svc, ae: a.ae, team: a.team,
  end: a.end, stage: a.stage, sub: a.sub ?? null, outcome: a.stage === 'LOST_OR_DECLINED' ? (a.lost ? 'LOST' : 'NOT_RENEWED') : null, effective: a.effective ?? null,
  card_id: a.card ? `RN-DEMO-${a.id}` : null, created_source: a.card ?? null,
  request_created_at: a.req ? T(a.req) : null, pending_since: a.pending ? T(a.pending) : null, link_sent_at: a.link ? T(a.link) : null, signed_at: a.signed ? T(a.signed) : null,
  last_activity: a.act ? { at: T(a.act[0]), what: a.act[1] } : null, legacy_reason: null,
});

export function renewalR2DemoItems(): RenewalItem[] {
  const base = tabR1DemoBase().filter((b) => b.term_end).map((b): RenewalItem => ({
    contract_id: b.contract_id, hotel_id: b.hotel_id, hotel_name: b.hotel_name_th ?? b.hotel_name, hotel_name_th: b.hotel_name_th, hotel_name_en: b.hotel_name_en,
    service: b.service, ae: b.ae, team: b.service === 'ORM' ? b.orm_team : b.marcom, end: b.term_end!.slice(0, 10), stage: 'NOT_STARTED', sub: null, outcome: null,
    ...BASE_STATE[b.contract_id],
  }));
  return [...base, ...ADDED.map(fromAdd)];
}
export function renewalR2DemoReasons(): RenewalReason[] {
  return ADDED.filter((a) => a.reason).map((a, i) => {
    const [p1, p2, s, at, by] = a.reason!; const created = T(at);
    return { id: `RR-REASON-D${String(i + 1).padStart(3, '0')}`, contract_id: a.id, service: a.svc, renewal_card_id: a.card ? `RN-DEMO-${a.id}` : null, outcome: a.lost ? 'LOST' : 'NOT_RENEWED',
      primary: [p1, p2], secondary: s, created_by: { member_id: by ?? a.ae, display: by ?? a.ae, role: 'AE' }, created_at: created, editable_until: editableUntil(created) };
  });
}
/** Scan feed for the AE Workspace while DEMO is on: open demo contracts that have no card yet. */
export function renewalR2DemoScanFeed(): ScanContract[] {
  return renewalR2DemoItems().filter((i) => i.stage === 'NOT_STARTED' && !i.card_id).map((i) => ({ contract_id: i.contract_id, hotel_id: i.hotel_id, hotel_name: i.hotel_name, service: i.service, end: i.end, ae: i.ae }));
}
export const renewalR2DemoContract = (id: string): ScanContract | null => {
  const i = renewalR2DemoItems().find((x) => x.contract_id === id);
  return i ? { contract_id: i.contract_id, hotel_id: i.hotel_id, hotel_name: i.hotel_name, service: i.service, end: i.end, ae: i.ae } : null;
};

/** DEMO-only checkbox “จำลองพอร์ต 120 สัญญา”: generated in memory only (never stored); ≥ 1 past-due open contract. */
export function renewalR2Sim(n = 120, today = RENEWAL_R2_DEMO_NOW): { items: RenewalItem[]; reasons: RenewalReason[] } {
  const AES = [A, M, N], TEAMS = ['A', 'B', 'C', 'D', 'E'], MK = ['แนน', 'บิว'];
  let seed = 11; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const day = (k: number) => new Date(Date.parse(today + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);
  const items: RenewalItem[] = []; const reasons: RenewalReason[] = [];
  for (let i = 0; i < n; i++) {
    const svc: Svc = i % 3 === 2 ? 'Marcom' : 'ORM'; const no = String(i + 1).padStart(3, '0');
    const off = i === 0 ? -6 : Math.floor(-360 + rnd() * 660); const end = day(off);
    let stage: Stage; let sub: SubStep | null = null; const r = rnd();
    if (off < -20) stage = r < 0.72 ? 'RENEWED' : 'LOST_OR_DECLINED';
    else if (off < 0) stage = i === 0 ? 'IN_PROGRESS' : r < 0.5 ? 'RENEWED' : r < 0.7 ? 'LOST_OR_DECLINED' : 'LINK_SENT';
    else if (off <= 60) stage = r < 0.25 ? 'RENEWED' : r < 0.5 ? 'LINK_SENT' : r < 0.8 ? 'IN_PROGRESS' : 'NOT_STARTED';
    else stage = r < 0.08 ? 'RENEWED' : 'NOT_STARTED';
    if (stage === 'IN_PROGRESS') sub = (['DRAFT', 'RETURNED', 'PENDING_APPROVAL', 'READY'] as SubStep[])[Math.floor(rnd() * 4)]!;
    const lost = stage === 'LOST_OR_DECLINED' && rnd() < 0.3;
    const req = stage !== 'NOT_STARTED' ? day(Math.min(off - 45, -1) + Math.floor(rnd() * 20)) : null;
    const cid = `SIM-${svc === 'ORM' ? 'ORM' : 'MAR'}-${no}`;
    const it: RenewalItem = {
      contract_id: cid, hotel_id: `SIM-H${no}`, hotel_name: `โรงแรมจำลอง ${no}`, hotel_name_th: `โรงแรมจำลอง ${no}`, hotel_name_en: `Sim Hotel ${no}`,
      service: svc, ae: AES[i % 3]!, team: svc === 'ORM' ? TEAMS[i % 5]! : MK[i % 2]!, end: lost ? day(off + 90) : end, stage, sub, outcome: stage === 'LOST_OR_DECLINED' ? (lost ? 'LOST' : 'NOT_RENEWED') : null,
      effective: lost ? end : null, card_id: stage === 'NOT_STARTED' ? null : `RN-SIM-${no}`, created_source: 'BOT',
      request_created_at: req ? T(req) : null, pending_since: sub === 'PENDING_APPROVAL' && req ? T(day(Math.min(off, 0) - Math.floor(rnd() * 5))) : null,
      link_sent_at: stage === 'LINK_SENT' || stage === 'RENEWED' ? T(day(Math.min(off - 10, -1))) : null, signed_at: stage === 'RENEWED' ? T(day(Math.min(off - 3, 0))) : null,
      last_activity: req ? { at: T(day(Math.min(off, 0) - Math.floor(rnd() * 20))), what: 'ติดตามลูกค้า' } : null,
    };
    items.push(it);
    if (stage === 'LOST_OR_DECLINED' && rnd() < 0.8 && periodOfDay(it) <= today) {
      const pick = new Set<string>(); while (pick.size < 3) pick.add(REASON_KEYS[Math.floor(rnd() * REASON_KEYS.length)]!);
      const [p1, p2, s] = [...pick] as [string, string, string]; const created = T(periodOfDay(it));
      reasons.push({ id: `RR-SIM-${no}`, contract_id: cid, service: svc, outcome: it.outcome as 'NOT_RENEWED' | 'LOST', primary: [p1, p2], secondary: s, created_by: { member_id: it.ae!, display: it.ae!, role: 'AE' }, created_at: created, editable_until: editableUntil(created) });
    }
  }
  return { items, reasons };
}
const periodOfDay = (i: RenewalItem) => (i.outcome === 'LOST' && i.effective ? i.effective : i.end);
