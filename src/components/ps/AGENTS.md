# PS dashboard components

> **MUST — before editing any file below, open its rules file first (rules moved there word for word):**
>
> | Before editing | Open |
> |---|---|
> | ps-tab-r1, contract-inout-card, contract-health-card, contract-signal-dialog, contract-tab-r1* | RULES_TAB_R1.md |
> | renewal-card-r2, renewal-reason-picker, renewal-r2*, renewal-scan | RULES_TAB_R2.md |
> | contract-lifetime-card, use-contract-age, contract-age*, welcome-back*, bd-workspace-page | RULES_TAB_R3.md |
> | setup-duration-card, setup-queue-table, duration-sticky-bar, use-setup-timing, setup-* | RULES_TAB_R4.md |
> | renewal-offer-r5, renewal-offer-section, renewal-r5*, contract-state, past-due / Q58 | RULES_TAB_R5_Q58.md |
> | survey-flags*, signal-mark, Contract Health signals | RULES_CONTRACT_HEALTH.md |
> | debt-cards-r11, debt-partner*, partner-form-drawer | RULES_DEBT_PARTNER.md |
> | meeting-tab-r1, meeting-tab-r1*, coaching-* | RULES_MEETING.md |
> | service-ticket-tab (PS tab ติดตามงานผู้ให้บริการ) | RULES_SERVICE_TICKET_TAB.md |
> | onboard-tab, onboard-tab*, servicing-time, sla-onboard-settings | RULES_ONBOARD.md |
> | partner-section, partner-system-ui, partner-attachments, partner-workspace/todo/files/contracts (PM Workspace) | RULES_PM_WORKSPACE.md |
> | ae-system-cost, survey-v2-form, meeting-survey-*, survey-v2 (AE Workspace) | RULES_AE_WORKSPACE.md |
> | AC App partner bills / shut-off (src/components/ac) | src/components/ac/AGENTS.md |
> | Service tickets SLA / categories / follow up (service-tickets*, bell-items) | src/components/workspace/AGENTS.md |

- Account Health dims/score/tier come only from the pure selector in src/lib/account-health.ts (count-based, TBD thresholds = not computed); Account 360 is one read-only drawer via useAccount360().openAccount360(hotel_id). Why: one explainable score, one shared view.
- PS uses shared summaries/tooltips/ⓘ InfoButton (long rules go in ⓘ); dashboard labels map stored values via src/lib/ps-glossary.ts; Servicing charts use measured pixels/shared quantiles; AC math = src/lib/ac-revenue.ts (Headline grade D: Superseded by Header R2 (HR7–HR17), 2026-10-28); Suite menus (incl. PS App) come from SIDEBAR_REGISTRY in src/lib/sidebar-registry.ts (psAppMenu() legacy, unused by the sidebar). Why: one label/rule source, numbers match across tabs.
- Meeting tab v2.0 (Superseded by Meeting tab R1, 2026-11-05 — v2.0 layout kept unmounted as MeetingAnalyzerTabV2; v_meeting_* views/hooks and demo fixture untouched).
- R1.2 detail tabs: labels/order come only from DASHBOARD_TABS in src/lib/ps-glossary.ts (stored keys never renamed, ?tab=<key> opens a tab); AC per-contract cost/grade list read v_ac_contract_cost_monthly via pure src/lib/ac-contract-cost.ts; In/Out uses isRecurringService; pending work (PI Form / renewal ≤60d) is pendingWorkOf, never a risk dim; ticket↔contract/meeting + pre-meeting view = pure src/lib/ticket-links.ts. Why: one label source, risk stays explainable, links testable without the DB.
- BD-AC "การเงินจาก AC" = one BdacFinanceSection (reads useDashboardGlobal + use-ac-views only); ⑥–⑧ read v_bdac_contract_revenue_ranking via pure src/lib/bdac-revenue.ts (renewal chains applied there, not in SQL, because renewal records are browser-local); ⑨–⑪ mount the AC tab's own GradeCard/SystemFeeMock/DebtorCard with context="bdac" (default "ac" unchanged). BD-AC dates use src/lib/date-en.ts only. Why: one component per card, identical numbers across tabs, movable to The Office App as a unit.
- BD-AC lives only as tab 1 of The Office APP › The Office Dashboard (/the-office-app/dashboard?tab=bd-ac, Suite Sidebar R2 C, 2026-11-06; src/components/office/office-bdac-page.tsx) importing BdacTab/BdacFinanceSection from here (never forked), own filter state; deal scoping shared via src/lib/bdac-scope.ts; old /ps ?tab=bdac/#bdac, /the-office-app/bd-ac and /office/bd-ac links replace-redirect via src/lib/office-bdac.ts / src/lib/suite-r2-moves.ts. Why: one copy per card, PS and Office filters independent.

## Header R2 (2026-10-28) — supersedes old global period/Compare, All/ORM/Marcom lens, Role/Team/Person filters, 6/7-tile Headline, Portfolio snapshot and header medians
- HR1 Global filter bar: one row ทีม / คน (hierarchical บริการ → ทีม → คน · AE) · ค้นหา · สถานะโรงแรม · Clear All · DEMO. No global period, no global Compare, no All / ORM / Marcom. Clear All does not reset per-card compare choices. Why: time belongs to each card.
- HR2–HR6 Per-card time rule (every chart, every tab): no history → grey chip `ณ วันนี้`, no Δ; history → its own CompareControl เดือน · ไตรมาส · ปี · Custom (A vs B by month), default เดือน, no "no compare". Calendar quarters; unfinished periods compare equal length (to-date vs same span); rebuildable point-in-time values compare as of today vs same day of previous period. One picker per KPI row allowed (Meeting, Task); one per column in the scorecard. Choice persists per user per card (`psdash.cmp.{tab}.{card}`). Known gap: trend charts show only the selected period (one month by default) — redefined in the tab redesign; do not "fix" without a prompt. Why: each card answers its own time question.
- HR7–HR17, HR24, HR25 Customer Journey scorecard: unit = service contract; rows ORM / Marcom × cols 1 รอเริ่ม · 2a ในคิวตอนนี้ · 2b ใช้เวลา Go Live · 3 ใช้งาน · 4 คะแนนบริการ · 5 เกรดชำระเงิน · 6 หลุด (Churn) (UP2 order, 2026-11-06; internal keys c4/c5/c6 unchanged). `ณ วันนี้`: 1, 2a, 3 (3 point-in-time by decision); Compare: 2b, 4, 6; col 5 = latest billing cycle, no compare. Mode (ฐานนิยม) for days (2a, 2b) and scores (4), always with `k จาก n`, tie → lower value. Col 2b start = On-board card created date (no AE-accept timestamp exists). Totals `รวม n สัญญา` only in cols 1, 2a, 3, 6 (count only, never combined %); no total row. ทีม / คน: service team → other row dimmed `นอกขอบเขต`, totals hidden except col 1; AE → both rows filtered; col 1 never filtered. Descriptions in ⓘ only; header layers fixed: number → title + ⓘ → chip / picker → total. Why: one explainable per-contract journey.
- HR18–HR22 Active Portfolio: ORM Flat Rate (count + mean fee ฿/month) · Commission (count + simple mean %); Marcom Content (count + delivered/month vs contract quota) · Ads (count + top-up ฿/month) · KOL (count + visits/month vs contract). A contract counts in every group it has; count Δ always grey; every box has its own CompareControl. ORM compare = contracts and prices as of same day of previous period; without a `contract_price_history` row the contract price is used (known gap). Marcom delivery values come only from src/lib/marcom-app-source.ts; until connected show `รอข้อมูลจาก Marcom App`. Why: no fabricated delivery data. Marcom boxes superseded by HR30–HR32 → RULES_HEADER_R3.md.
- HR26 Month summary strip "สรุปภาพรวมเดือนนี้": hidden by flag `psdash.monthSummary=false`; its role moves to a future session scorecard zone (good / bad labels → PM / AE create tickets). Not built — do not build or remove without a prompt. Why: avoid two summary surfaces.
- Open item: new contracts don't write `contract_price_history`; history is not linked by contract ID.
- Open item: trend charts show one period only (see HR2–HR6).
- Open item: On-board summary boxes and Pipeline Go Live column still use the old 6-month window.
- Open item: demo dates differ — header and tab-bar label 28 ต.ค. 2569 (DEMO_DAY, UP12); tab data still 30 Sep 2026.
- UAT polish R1 (UP1–UP12, 2026-11-06): ใช้งาน sub-line `ขาดอายุ รอผล {n} สัญญา`; Active Portfolio Marcom stays Content · Ads · KOL (UP3 skipped, roadmap).
