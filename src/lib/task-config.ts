/** Shared presentation thresholds. No case/assignment/lifecycle writes. */
export const TASK_CONFIG = { case_overdue_days: 3, coaching_aging_days: 3, unassigned_buckets: [3,7] as [number,number], renewal_buckets: [14,7] as [number,number], age_buckets: [3,7,14] as [number,number,number], survey_buckets: [7,14] as [number,number], closed_window_days: 30, list_page_size: 20 };
