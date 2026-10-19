# PS dashboard components

- Account Health dims/score/tier come only from the pure selector in src/lib/account-health.ts (count-based, TBD thresholds = not computed); Account 360 is one read-only drawer via useAccount360().openAccount360(hotel_id). Why: one explainable score, one shared view.
- PS uses shared summaries/tooltips/ⓘ InfoButton (long rules go in ⓘ); dashboard labels map stored values via src/lib/ps-glossary.ts; Servicing charts use measured pixels/shared quantiles; AC math = src/lib/ac-revenue.ts (Headline grade D reuses latestGradeD); PS App menu comes from psAppMenu() in workspace-registry. Why: one label/rule source, numbers match across tabs.
- Meeting tab v2.0: reads v_meeting_* only; card-month grain + Asia/Bangkok dates via src/lib/meeting-dashboard-types.ts helpers (isTierALate, median, aggregateFunnel); demo fixture src/lib/meeting-dashboard-demo.ts is deterministic and owns §6 anchors. Why: one red-rule/median implementation, testable without the DB
