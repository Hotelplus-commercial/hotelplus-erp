<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Servicing surfaces (Zone 3, Property Info, My Tasks, menu 8, PS Dashboard) share one store and ServicingCardDrawer; Zone 3 deep-links menu-8 Pipeline; only the drawer advances stages.
- Servicing stage events are append-only from gated in-app actions; demo history stays separate.
- Servicing role flags and UAT checklist bypass are simulation only (never production security); Servicing stays browser-local, Cloud never migrates it.
- Servicing links are service-stage-only, HTTP(S)-only, hydrate missing fields without replacing local data.
- Prop Info uses root ServicingProvider; dedupe ref/service. Why: no shadow cards.
- Checklists come from PM templates per variant and never gate stages; handover/appointment gates are separate. Pending stage is a conditional column, shown in rails only when relevant.
- ORM handover: one per-card OTA scope; Specialist row-1 parallel Approved→Final Setup; Completed (Handover) before System Training; Marcom has no Completed. Billing start + Survey #2 only from the customer-email action.
- WS-2 is browser-local keyed by Hotel ID; reads cards without gating Servicing.
- Template Management only in PS Templates; emails snapshot text at send.
- AC v1 retired; CRM docs are split Cloud documents (crm:<collection>|hotels|ws2) with revision CAS + local backup, push-only, WS2 excludes credentials; conflicts stop sync. Open test-mode writes: close before production.
- AC daily processing is a manual browser action; server callback is a no-op. One pure accounting engine for all AC entry points.
- AC views use canonical invoices, stable hotel IDs, WS-2 owners; never guess ambiguous attribution. One pure recurring-grade selector; terminal collection events persist until explicit reactivation.
- /ac/operations redirects to /ac/billing.
- Dashboard reads only existing view projections (v_ps_*, v_ac_*, v_meeting_*, v_task_*), paginated; absent mirrors stay empty, never inferred. Dashboards never write business state (except Task tickets).
- Dashboard filters/A-B periods share one context + pure selectors; ownershipless aggregates stay empty under ownership lenses.
- Demo adapters derive all tabs from one bundled spine via URL/state, no provider writes; renewal end forward-only.
- Task Cloud cases write only via ticket_create/update RPCs (revision CAS); responsible/watchers read-derived; demo in-memory. task-worklist merges cases/L0 read-only; history = pure src/lib/task-history.ts replay + configAt; only K3 reads task_backlog_snapshot (AC daily post-step). Why: no cross-store writes, one backlog source.
- Servicing dashboard reads v_servicing_* only, empty until mirror; writes reuse AssignDialog/saveAssignment or Ticket L0. Timing has one helper/config; OnboardingCardContent/PI chip are shared. Why: no duplicate rules or writes.
- Account Health dims/score/tier come only from the pure selector in src/lib/account-health.ts (count-based, TBD thresholds = not computed); Account 360 is one read-only drawer opened via useAccount360().openAccount360(hotel_id). Why: one explainable score and one shared hotel view.
- Layer 0 sales tickets use tickets-l0 createTask/transition only, browser canonical storage and existing push-only Cloud Sync; they are distinct from Task-tab Cloud cases. Why: separate lifecycles must not mutate each other or assignment/billing state.
- BD Workspace contains only /bd/tickets; notifications link to the same records, including pending pickup. Why: reuse routing, no additional inboxes or department workspaces.
- Layer 0 demo follows navigation, retains in-memory tickets between consumers, resets only on a new session. Why: PS create → BD act without live persistence.
- WorkspaceConfig + one WorkspaceShell define department workspaces: inbound tickets-l0 only, scheduled adapters unwired; assignment To Do reuses PendingAssignList/AssignDialog and existing due rule/master without date filtering. Why: reuse capabilities, no new business writes.
- Alert BOT (src/lib/alert-bot.ts) is the second Ticket L0 consumer: reads already-computed signals (gradeRecords/renewal/survey), writes only `tickets` via createTask/stampConditionCleared, runs as post-step of the AC daily button. Why: one condition = one ticket, never recompute signals, never auto-close.
- Account-risk BOT targets PS; Servicing stall targets its lane department with PS watcher. isWatcherOf keeps FYI read-only. Why: one condition = one ticket.
- Sidebar module/child links must propagate the ?demo=1 search param so the Layer 0 demo session survives navigation. Why: demo store resets whenever demo mode toggles off.

- PS uses shared summaries/tooltips; Servicing charts use measured pixels/shared quantiles and browser-only drill; AC tab math = pure selectors in src/lib/ac-revenue.ts. Why: consistent undistorted reports, unchanged logic.
- PI required validation gates final saveAnswers only; template publish freezes flags and audits changes. Why: customer/AE share one validator.
- Portfolio uses existing hotel terms, latest active start per service; missing SKU link stays placeholder. Contracts reuses the hotel list. Why: no guessed CRM joins.
