/* R3.3 WB18 — one DEMO state for this browser session + the DEMO Welcome Back tickets (simulation only, never security).
 * One sessionStorage key `meridia.demo.welcomeBack.v1` = { ps_demo, seq, items }:
 * - ps_demo: PS Dashboard's DEMO switch (written by the dashboard shell); BD App › Workspace follows it.
 * - seq / items: DEMO Welcome Back tickets shared by card ④ and BD App › Workspace (survive page loads in this tab).
 * PS DEMO off → the key is removed (DEMO tickets cleared). Ends with the browser session. Never the real ticket store. */
import type { L0Ticket } from './tickets-l0';
import type { MeetingSurveyData } from './meeting-survey-types';
import { HEADER_DEMO_NOW } from './ps-header-r2-demo';

export const DEMO_WB_KEY = 'meridia.demo.welcomeBack.v1';
export const DEMO_WB_SEQ0 = 1000;
export type DemoSession = { ps_demo: boolean; seq: number; items: L0Ticket[]; /** DEMO Layer 0 ticket store (all non-Welcome-Back DEMO tickets), same session key */ l0?: { seq: number; items: L0Ticket[] }; /** Survey v2 patch: DEMO meeting / survey / label-answer writes (overlay on the DEMO entries), same session key */ ms?: MeetingSurveyData };

const ss = (): Storage | null => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } };
export function readDemoSession(): DemoSession | null {
  const s = ss(); if (!s) return null;
  try {
    const v = JSON.parse(s.getItem(DEMO_WB_KEY) ?? 'null') as Partial<DemoSession> | null;
    if (!v || typeof v !== 'object') return null;
    return { ps_demo: v.ps_demo === true, seq: typeof v.seq === 'number' ? v.seq : DEMO_WB_SEQ0, items: Array.isArray(v.items) ? v.items : [], ...(v.l0 && Array.isArray(v.l0.items) ? { l0: v.l0 } : {}) };
  } catch { return null; }
}
function write(v: DemoSession) { try { ss()?.setItem(DEMO_WB_KEY, JSON.stringify(v)); } catch { /* quota */ } }

/** True when PS Dashboard is in DEMO for this browser session. */
export const psDemoOn = () => readDemoSession()?.ps_demo === true;
const modeListeners = new Set<() => void>();
export const onDemoSessionChange = (l: () => void) => { modeListeners.add(l); return () => { modeListeners.delete(l); }; };
/** PS Dashboard DEMO switch: on → mark (keeps DEMO tickets); off → remove the key (DEMO tickets cleared). */
export function setPsDemoSession(on: boolean) {
  const cur = readDemoSession();
  if (on) { if (!cur?.ps_demo) write({ ps_demo: true, seq: cur?.seq ?? DEMO_WB_SEQ0, items: cur?.items ?? [], ...(cur?.l0 ? { l0: cur.l0 } : {}), ...(cur?.ms ? { ms: cur.ms } : {}) }); }
  else if (cur) { try { ss()?.removeItem(DEMO_WB_KEY); } catch { /* storage optional */ } }
  else return;
  modeListeners.forEach((l) => l());
}
/** Save the DEMO Welcome Back tickets (keeps the current ps_demo flag). */
export function saveDemoTickets(seq: number, items: L0Ticket[]) {
  const cur = readDemoSession();
  write({ ps_demo: psDemoOn(), seq, items, ...(cur?.l0 ? { l0: cur.l0 } : {}), ...(cur?.ms ? { ms: cur.ms } : {}) });
}
/** DEMO Layer 0 ticket store for this session (only while the shared DEMO state is on; never the real store). */
export function readDemoL0(): { seq: number; items: L0Ticket[] } | null { const c = readDemoSession(); return c?.ps_demo && c.l0 ? c.l0 : null; }
/** DEMO meeting / survey overlay for this session (only while DEMO is on; never the real keys). */
export function readDemoMs(): MeetingSurveyData | null { const c = readDemoSession(); return c?.ps_demo && c.ms ? c.ms : null; }
export function saveDemoMs(ms: MeetingSurveyData) { const c = readDemoSession(); if (c?.ps_demo) write({ ...c, ms }); }
export function saveDemoL0(l0: { seq: number; items: L0Ticket[] }) { const c = readDemoSession(); if (c?.ps_demo) write({ ...c, l0 }); }

/** DEMO clock shared by PS Dashboard card ④ and BD App › Workspace (Header R2 / Tab R1 demo today). */
export const DEMO_DAY = HEADER_DEMO_NOW;
const thLong = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' });
/** `28 ตุลาคม 2569` in DEMO; today's Bangkok date otherwise. */
export const pageDateLabel = (demo: boolean, now: Date = new Date()) => (demo ? thLong(DEMO_DAY) : now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }));
