/* PS Dashboard · Tab สัญญา & ราคา R4 §4 — versioned Setup KPI settings (`setup_kpi_settings`).
 * Values are team KPIs set by a PM; they are never derived from historical data.
 * Storage: new browser-local collection (live) / in-memory (DEMO). No login exists, so the PM gate is the
 * card's test-mode "สวมบท" switch — simulation only, never production security. */
import { useSyncExternalStore } from 'react';

export type KpiKey = 'total_orm' | 'total_mc' | 'p1' | 'p2s' | 'p2o_orm' | 'p3_orm' | 'p2o_mc' | 'p3_mc';
export const KPI_KEYS: readonly KpiKey[] = ['total_orm', 'total_mc', 'p1', 'p2s', 'p2o_orm', 'p3_orm', 'p2o_mc', 'p3_mc'];
export const KPI_LABEL: Record<KpiKey, string> = {
  total_orm: 'รวม On-board → Go Live · ORM',
  total_mc: 'รวม On-board → Go Live · Marcom',
  p1: 'ช่วง AE',
  p2s: 'ช่วงเตรียมระบบ · Specialist (ORM)',
  p2o_orm: 'ช่วงเตรียมระบบ · ORM',
  p3_orm: 'ช่วงก่อน Go Live · ORM',
  p2o_mc: 'ช่วงเตรียมระบบ · Marcom',
  p3_mc: 'ช่วงก่อน Go Live · Marcom MT',
};
export type Thr = { ok: number; due: number };
export type KpiValues = Record<KpiKey, Thr>;
export type SetupKpiVersion = { id: string; effective_from: string; values: KpiValues; created_by: string; created_at: string; note: string };

export const DEFAULT_KPI_VALUES: KpiValues = {
  total_orm: { ok: 11, due: 14 }, total_mc: { ok: 11, due: 14 }, p1: { ok: 5, due: 7 }, p2s: { ok: 5, due: 7 },
  p2o_orm: { ok: 5, due: 7 }, p3_orm: { ok: 2, due: 3 }, p2o_mc: { ok: 5, due: 7 }, p3_mc: { ok: 2, due: 3 },
};
/** Before the first On-board card of the live store and of the DEMO history. */
export const DEFAULT_EFFECTIVE_FROM = '2024-01-01';
export const DEFAULT_KPI_NOTE = 'ค่าเริ่มต้น (เกณฑ์ Servicing เดิม · รวม 14 วัน)';
export const DEFAULT_KPI_VERSION: SetupKpiVersion = {
  id: 'skpi-default', effective_from: DEFAULT_EFFECTIVE_FROM, values: DEFAULT_KPI_VALUES,
  created_by: 'SYSTEM', created_at: `${DEFAULT_EFFECTIVE_FROM}T00:00:00.000Z`, note: DEFAULT_KPI_NOTE,
};

/** §10.2 config flag — FTR stays `รอข้อมูล` until the HANDOVER_FIX creation flow is enabled (DEMO: on). */
export const SETUP_CONFIG = { handover_fix_enabled: false } as const;
export const handoverFixEnabled = (demo: boolean) => (demo ? true : SETUP_CONFIG.handover_fix_enabled);

const byDate = (a: SetupKpiVersion, b: SetupKpiVersion) => a.effective_from.localeCompare(b.effective_from);
/** §4.3 latest version with effective_from ≤ date (the earliest version when none is earlier). */
export function versionFor(versions: readonly SetupKpiVersion[], date: string): SetupKpiVersion {
  const list = [...versions].sort(byDate);
  let v = list[0] ?? DEFAULT_KPI_VERSION;
  for (const x of list) if (x.effective_from <= date.slice(0, 10)) v = x;
  return v;
}

/** §4.2 validation: ok < due, both integers 0–60. Returns the first error (naming the row) or null. */
export function validateKpi(values: KpiValues): string | null {
  for (const k of KPI_KEYS) {
    const { ok, due } = values[k];
    const bad = [ok, due].some((n) => !Number.isInteger(n) || n < 0 || n > 60);
    if (bad || ok >= due) return `${KPI_LABEL[k]}: “ทันกำหนดถึง” ต้องน้อยกว่า “กำหนดเสร็จ” และอยู่ระหว่าง 0–60 วัน`;
  }
  return null;
}

/** Auto note listing changed keys: `แก้ไขโดย PM · {label} {due} วัน · …`. */
export function kpiNote(prev: KpiValues, next: KpiValues): string {
  const changed = KPI_KEYS.filter((k) => prev[k].ok !== next[k].ok || prev[k].due !== next[k].due);
  if (!changed.length) return 'แก้ไขโดย PM · ไม่มีค่าที่เปลี่ยน';
  return ['แก้ไขโดย PM', ...changed.map((k) => `${KPI_LABEL[k]} ${next[k].due} วัน`)].join(' · ');
}

export type SaveResult = { ok: true; versions: SetupKpiVersion[] } | { ok: false; error: string };
/** §4.2 save: insert a version effective today; a second save on the same day updates that version instead. */
export function saveKpiVersion(versions: readonly SetupKpiVersion[], values: KpiValues, today: string, by: string, nowIso: string): SaveResult {
  const error = validateKpi(values);
  if (error) return { ok: false, error };
  const day = today.slice(0, 10);
  const earlier = versions.filter((v) => v.effective_from < day);
  const prev = earlier.length ? versionFor(earlier, day).values : DEFAULT_KPI_VALUES;
  const copy = JSON.parse(JSON.stringify(values)) as KpiValues;
  const same = versions.find((v) => v.effective_from === day);
  const record: SetupKpiVersion = { id: same?.id ?? `skpi-${day}`, effective_from: day, values: copy, created_by: by, created_at: nowIso, note: kpiNote(prev, copy) };
  const list = same ? versions.map((v) => (v === same ? record : v)) : [...versions, record];
  return { ok: true, versions: [...list].sort(byDate) };
}

/* ---------------- store: live = new browser collection, DEMO = in memory ---------------- */
const KEY = 'psdash.setup_kpi_settings.v1';
const SERVER: SetupKpiVersion[] = [DEFAULT_KPI_VERSION];
let live: SetupKpiVersion[] | null = null;
let demoList: SetupKpiVersion[] = [DEFAULT_KPI_VERSION];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readLive(): SetupKpiVersion[] {
  if (live) return live;
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SetupKpiVersion[]) : null;
    live = parsed && parsed.length ? parsed : [DEFAULT_KPI_VERSION];
    if (!parsed?.length && typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(live));
  } catch { live = [DEFAULT_KPI_VERSION]; }
  return live;
}
export function getKpiVersions(demo: boolean): SetupKpiVersion[] { return demo ? demoList : readLive(); }
export function setKpiVersions(demo: boolean, list: SetupKpiVersion[]) {
  if (demo) demoList = list;
  else { live = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage optional */ } }
  emit();
}
/** Test helper: back to the default version only. */
export function resetKpiVersions() { demoList = [DEFAULT_KPI_VERSION]; live = null; emit(); }
/** Hydration-safe: the server snapshot is the default version. */
export function useSetupKpiVersions(demo: boolean): SetupKpiVersion[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => getKpiVersions(demo),
    () => SERVER,
  );
}
