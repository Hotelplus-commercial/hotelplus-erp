/** Shared presentation thresholds — effective-dated (v2.1 §2.3). No case/assignment/lifecycle writes. */
export type ConfigEntry<T> = { value: T; effective_from: string };
export const TASK_CASE_SYSTEM_START = '2026-01-01';
const first = <T,>(value: T): ConfigEntry<T>[] => [{ value, effective_from: TASK_CASE_SYSTEM_START }];
export const TASK_CONFIG_HISTORY = {
  case_overdue_days: first(3), coaching_aging_days: first(3), unassigned_buckets: first<[number, number]>([3, 7]), renewal_buckets: first<[number, number]>([14, 7]),
  age_buckets: first<[number, number, number]>([3, 7, 14]), survey_buckets: first<[number, number]>([7, 14]), closed_window_days: first(30), list_page_size: first(20),
  history_daily_max_months: first(3), workload_small_base: first(5), snapshot_catchup_days: first(14),
};
export type TaskConfigHistory = typeof TASK_CONFIG_HISTORY;
export type TaskConfigKey = keyof TaskConfigHistory;
/** Entry with the latest effective_from ≤ date (falls back to the earliest entry). */
export function configAt<K extends TaskConfigKey>(key: K, date: string, history: TaskConfigHistory = TASK_CONFIG_HISTORY): TaskConfigHistory[K][number]['value'] {
  const list = [...(history[key] as ConfigEntry<unknown>[])].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  const d = date.slice(0, 10);
  return (list.filter(e => e.effective_from <= d).at(-1) ?? list[0])!.value as TaskConfigHistory[K][number]['value'];
}
/** Editing appends a new entry (effective today by default); existing entries are never overwritten. */
export function appendConfig<K extends TaskConfigKey>(history: TaskConfigHistory, key: K, value: TaskConfigHistory[K][number]['value'], effective_from: string): TaskConfigHistory {
  return { ...history, [key]: [...history[key], { value, effective_from: effective_from.slice(0, 10) }] };
}
const today = () => new Date().toISOString().slice(0, 10);
export function taskConfigToday(history: TaskConfigHistory = TASK_CONFIG_HISTORY, date = today()) {
  return Object.fromEntries(Object.keys(history).map(k => [k, configAt(k as TaskConfigKey, date, history)])) as { [K in TaskConfigKey]: TaskConfigHistory[K][number]['value'] };
}
/** v2.0 call sites read configAt(key, today). */
export const TASK_CONFIG = taskConfigToday();
/** Demo: two overdue entries to exercise configAt (5 days before Aug, 3 from Aug). */
export const TASK_DEMO_CONFIG_HISTORY: TaskConfigHistory = { ...TASK_CONFIG_HISTORY, case_overdue_days: [{ value: 5, effective_from: TASK_CASE_SYSTEM_START }, { value: 3, effective_from: '2026-08-01' }] };
