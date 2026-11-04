/* R2.1 UF2 — testing-mode acting AE member for the renewal flow (no login exists; simulation only, never security).
 * The Tab R2 card's own "สวมบท" picker can choose a specific AE; this carries that member into the AE Workspace
 * renewal section and the renewal Wizard (same browser tab, sessionStorage). The global default role is unchanged:
 * nothing is set until a tester picks an AE / presses the owner button or the switch link. */
import { useSyncExternalStore } from 'react';
import { aeDirectory } from './ps-renewal';
import { aeCode } from './renewal-scan';

const KEY = 'meridia.renewal-test-member';
let testMode = true;
/** Testing mode = no real login. Kept as a switch so a future login build hides the test link / banner. */
export const isRenewalTestMode = () => testMode;
export const setRenewalTestMode = (on: boolean) => { testMode = on; emit(); };

const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
export function getTestMember(): string | null {
  if (!testMode || typeof sessionStorage === 'undefined') return null;
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}
export function setTestMember(member: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  try { if (member) sessionStorage.setItem(KEY, member); else sessionStorage.removeItem(KEY); } catch { /* storage optional */ }
  emit();
}
/** Directory id used by renewal cards (owner field) for an AE member id (matched by AE code). */
export const directoryAe = (member: string) => aeDirectory.find((a) => aeCode(a) === aeCode(member)) ?? member;
/** The user renewal UI acts as: PM stays PM; an AE role uses the testing-mode member when one is set. */
export function actingRenewalUser(roleUser: string, isPm: boolean, member: string | null = getTestMember()): string {
  return isPm || !member ? roleUser : directoryAe(member);
}
/** Hydration-safe hook: null on the server and during hydration, then the stored member. */
export function useTestMember(): string | null {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => -1);
  return typeof window === 'undefined' ? null : getTestMember();
}
