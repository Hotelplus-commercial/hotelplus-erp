# PS Dashboard visual standard v1.0
- [ ] Apply authoritative tokens/font and shared cards, accessible tooltips and persistent deterministic summary notes.
- [ ] Replace headline with seven groups/tiles using existing values only; refresh PS visualizations and default PS entry.
- [ ] Verify unchanged report values, summaries, drill-through, compare and desktop/mobile layout; no other-tab layout changes.

# Workspace Layer 1 patch v1.1
- [x] Restore AUTO sidebar visibility using the registry; remove ORM/Marcom Overview surfaces, retaining layouts and Dashboard inboxes. Existing base URLs redirect to the corresponding Workspace.
- [x] Surface ORM/Marcom pending assignments through existing v1.1 list/modal, due rule, master and audit; no assignment data migration or new write path.
- [x] Verify all eight workspaces, AUTO sidebar/empty lanes, ORM Team/Revenue/Ecommerce and Marcom Member save → master/audit → row clears after reload and in Dashboard; not-due cards excluded and range independent. Servicing state unchanged; 3 Bun L0 tests pass; build OK. Test browser Cloud requests blocked to avoid changing shared data.
- [ ] Standalone ORM/Marcom Dashboard removal awaits Sai's explicit confirmation; retained in this patch.

# Ticket Layer 0 · supplied v1.0 delta
- [x] Add minimal BD Workspace navigation and link the existing notification rail to the same inbox records; no other workspace lanes.
- [x] Preserve demo tickets across PS → BD navigation, Thai read-only payload and role-gated lifecycle; hydration-safe browser readback.
- [x] Verify PS create → BD ACK/IN_PROGRESS/DONE, PM cancellation, dedup, pending pickup and notification deep links; live UI create/reload/lifecycle with revision 3 + audit 4. Five focused tests pass and build OK. Temporary test mirror requests blocked to avoid Cloud sample data; shared mirror delivery not re-tested.
- [ ] Cross-machine delivery requires Cloud Sync Level B (not part of this build).

# Meeting & Analyzer v1.0
- [x] Add seven safe empty v_meeting_* projections with pending columns; no tables, fields or source sync changes.
- [x] Build six sections, global filters/compare, completion headline and shared-spine demo.
- [x] Verify fixture counts, source navigation, empty states, narrow viewport and 24 PS/AC/Meeting tests; build OK.
- [ ] Live operational/survey/flag reporting and historical caretaker attribution blocked by absent Cloud meeting/survey/flag mirrors and hotel-month caretaker history. Existing actor/source fields are names and date strings, not canonical IDs/history; no current-owner fallback or guessed joins.
- [ ] Topic-filtered native Coaching/Survey drill-through blocked by existing source pages not consuming deep-link context; links open the existing queue/page and dashboard shows Q9, without modifying prohibited AE Workspace screens.
- [ ] Persisted warning-window/aging configuration and real flag escalation blocked by absent existing config source; no new fields/tables or upstream engine changes allowed. Rubric intentionally empty.

# PS Dashboard v1.2 patch
- [x] Consolidate sticky global filters and ownership scoping across reporting surfaces.
- [x] Add display-only A/B comparison, presets, custom periods and missing-history handling.
- [x] Reuse one static fixture for all tabs and URL-driven preview-safe DEMO.
- [x] Verify demo oracle, filters, comparison, reload, off-state and workflow regressions.

- Real ownership aggregates and historical deltas remain pending where existing views lack ownership/snapshots; no attribution or backward values are invented.

# PS Dashboard tab v1.0
- [x] Add PM/System Admin risk governance; verified edit, blocked AE, reload readback and strict thresholds.
- [x] Map sources; add nullable contract field and forward-only scheduled end capture on new Renewal decisions, without backfill.
- [x] Add nine safe read-only v_ps_* projections without tables or sync changes; real WS2 health rows, other sources explicitly pending.
- [x] Build seven PS panels and wire Churn/NPS; preserve Contract Overview and other tabs.
- [x] Verify seven panels, filters, empty states, no overflow, risk governance and Renewal date capture; 14 PS/AC tests pass.
- [ ] Live lifecycle/churn/renewal/cohort/NPS/attach reporting and canonical inactivation stamping blocked by absent servicing/renewal/survey Cloud snapshots and missing renewal contract/service IDs; scope prohibits new sync or guessed linkage.
- [ ] Hotel drill-through content readback blocked on machines without the corresponding browser-local WS2 property; correct native URL verified, no Cloud pull introduced.

# AC v2.0 tightening T1–T4
- [x] Consolidate grade-derived scores and separate lifecycle from collection.
- [x] Stamp stable hotel identity and rewire service-aware WS-2 attribution without Cloud sync changes; SQL owners await the separate WS-2 snapshot workstream.
- [x] Limit grades to due RECURRING invoices and enforce terminal/manual collection precedence.
- [x] Deprecate remnants in comments; nine regression tests pass, all eight views query successfully, and AC Live Link/partial/full settlement/receipt/profile flow verified in browser.

# BD-AC visual refresh v1.0
- [x] Apply scoped Teal + Graphite tokens and Thai fonts; restyle headline and six existing sections.
- [x] Visualize existing funnel, cohort, stage, cycle and aging outputs without data changes.
- [x] Verify unchanged counts, filters, read-only card navigation, desktop and mobile layout; exercise nonempty scatter/owner/paid charts in isolated browser fixtures and restore originals.

# Servicing v5.1 Phase 1
- [x] Append a view-only Servicing section after the unchanged PS Contract Overview.
- [x] Add independent dashboard stats, filters and Pipeline/Tracking/Disparity/KPI switcher.
- [x] Keep create, full Pipeline, independent filters, guided drawer and history on On-boarding Process.
- [x] Route dashboard detail actions into the matching On-boarding Process card/stage.
- [x] Verify placement, filters, workflow gates, metrics and persistence.

Scope boundary: workflow remains browser-local with role flags as specified; no production authentication, shared Cloud persistence or external survey delivery was added.

# Servicing v5.2 Phase 1
- [x] Add mapped external app and nullable destination fields, preserving existing local cards.
- [x] Add service-only team-app links to the guided drawer and dashboard Pipeline details.
- [x] Verify fallback navigation, new-tab destination links and unchanged native work.

# Contract Dashboard Fix 01
- [x] Capture and display contract/service, customer, hotel and invoice identities in existing sub-process.
- [x] Replace dormant handoff with idempotent Prop Info creation in the menu-8 store using manual-create defaults.
- [x] Verify ORM, Marcom, BOTH, missing-input guard, persistence and normal guided work.
# Servicing v5.3 Phase 1 — Surface Consolidation
- [x] One role-aware guided drawer shared by every entry point (owner role unlocks CTA; PM fallback for Approve only).
- [x] Zone 3 → per-hotel AE entry (own-only; ส่งต่อแล้ว read-only group); Zone 3 menu-8 link removed.
- [x] Property Info tab → status chips + เปิดการ์ด On-boarding (board removed); My Tasks onboarding opens drawer.
- [x] PS Dashboard pipeline spans new_property→go_live; drill-down opens drawer read-only.

# Servicing v5.4 Phase 1 — AE Workspace surface patch
- [x] Menu 8 Pipeline accepts Zone 3 card deep-link, reveals current stage and opens shared drawer; ของฉัน default off and contextual back-link.
- [x] Zone 3 ทำต่อ/ดูสถานะ navigate to menu 8; restore PS Dashboard v5.3 read-only monitoring.
- [x] Tier A Meeting Pipeline card + mock removed.
- [x] Verify actionable/read-only arrivals, close/stage focus, mine filter, normal sidebar entry, AE reachability and unchanged My Day.

## v6.0 Servicing (variants + checklists)
- [x] Phase 1: service variants, new service stages, checklist templates/items (non-gating, PM edits), ORM|Marcom toggle, dept badges, AE Collect-Data checklist
- [x] Phase 2: ORM Handover OTA 2-tick + credentials + room schema gate — approved and implemented

## v6.0 UAT test mode
- [x] Add global preview-only TEST MODE, default ON, with top-bar toggle and production hard-off.
- [x] Bypass checklist-role ticking only; preserve timestamps, gates, read-only surfaces and all non-ticking permissions.
- [x] Verify ON/OFF for Final Check, both handover columns and service checklists; confirm stage CTA remains gated.

## v6.0 two-gate correction
- [x] Remove WS-2 completion as an advance blocker; preserve role permissions and existing hard gates.
- [x] Verify Collect Data → Final Check with incomplete form/unchecked checklist, persistence and blocked Approve.

## v6.0 UI Fix Item 1
- [x] Move owner-day summary first; replace drawer stage lists with a conditional horizontal dot rail.
- [x] Default-collapse past-stage checklists and preserve current-stage expansion.
- [x] Restore Property Pending pipeline visibility; verify AE entry, Final Check-only exit and persistence.

## v6.0 UI Fix Item 2
- [x] Add contract-detected ORM-Lite with configurable per-card three-OTA selection, scoped data and completion gates.
- [x] Sequence Specialist completion then ORM acceptance; trigger survey after acceptance and add appointment gate.
- [x] Expand shared handover layout and credential columns; preserve dashboard read-only consistency.
- [x] Verify full/Lite handover flows, survey timing, appointment gate, workflow roles, dashboard read-only and persistence; existing Test Mode bypass remains unchanged.
- [x] User confirmed Specialist chooses any three OTAs per Lite card, not a fixed subset.

## WS-2 Property Information Form
- [x] Phase 1: property data layer, 3 config templates (ORM from JSON export, Marcom MT from PDF + Owner Interview, GMB 8 fields), AE Generate Form, Image Portal #1, status chip, audit log
- [x] Phase 2: customer fill page, submit routing L1/L2/L3, room folders + photo count, seed handover credentials, restricted access, template publish

## v6.2 patch — Meeting & Billing
- [x] ORM handover 4 parts (PMS/CM: Specialist tick + ORM verify), meeting-date picker at Prepare Data gates meeting stage, record URL + customer email = billing ★ (meeting date; GMB at Go Live) + Survey #2 in Thai, Marcom Completed meeting link removed

## v6.3 ORM/Marcom stage reorder
- [x] ORM: Approved → Prepare Data (Specialist + ORM) → Rate Structure ★ → Final Setup → Completed (Handover) → System Training → Go Live; ceiling at Final Setup.
- [x] Specialist handover row-1 editable Approved→Final Setup; row-2 at Completed → Survey #1 → System Training.
- [x] Split timestamps (specialist_handover_done_at, orm_prep_done_at) and split Σ Specialist / Σ ORM.
- [x] Marcom: Completed stage dropped (Approved → Prepare Data → First Sync → Go Live; GMB → Go Live); old Marcom cards at Completed move to Prepare Data.

## WS-2 v1.1 delta
- [x] Photo rows per upload (count = rows, no caption/tag); form linked to its card.
- [x] "Generate for new property" (per card, New Property, no form yet) using the same Generate logic.
- [x] Form status chip on Zone 3 cards; Marcom still cannot see private data.

## Property Content v1.0
- [x] Property Content menu: hotel folders, search, A–Z / Start year sort, My Hotel (owner AE or service assignee), Generate for new property moved here.
- [x] Internal Property Info page per hotel: service tabs, form data (template-driven, editable + audited), photo library counts, back to card; Marcom never sees private data.
- [x] 8 sample hotels with owners/assignees and mock photos.

## v6.4 Item 1
- [x] On-card line "N of M tasks completed · updated …" for the current stage (hidden when no tasks; 2-tick counts when both done; board + PS Dashboard).

## Cross-App Assignment & Alerts v1.0
- [x] HR Members roster (seeded, HR/Admin edit, deactivate keeps history).
- [x] Assignment fields on hotel master + audit; Assign dialog (ORM team -> Rev/Ecom cascade), role-gated.
- [x] PS Dashboard 5th tile + list; ORM / Marcom Dashboard inboxes; card "ผู้ดูแล Account" block.

## AC Billing Ledger + Payment Grade v1.0
- [x] Create protected shared billing tables, engines, eight read-only views and daily schedule.
- [x] Add AC Operations subscriptions, invoices, payment verification and collection console without altering PS workflows.
- [x] Verify billing idempotency, settlement, grades, suspension/reactivation and the console end to end; remove all temporary ledger test rows.
- [x] v2.0: check retained data (all v1 Cloud tables empty), remove AC Operations and its public server functions, stop the v1 daily schedule, redirect legacy links to existing Invoice & Receipt.
- [x] Superseded by tightening scope: retain retired v1 tables/functions and mark deprecated; deletion is no longer requested.
- [x] Extend existing Inquiry INV / Invoice / Receipt / Hotel Profile / Live Link with hybrid billing, AC-confirmed grades and collection lifecycle; verify partial/full confirmation and receipt readback.
- [x] Create authenticated daily callback and managed daily schedule, plus eight read-only views over canonical original entities; preserve public test routes and non-AC screens.
- [x] Provide explicit original-record migration with retained browser backup, Cloud loading and revision-safe saves; restrict privileged public prototype operations to development.
- [ ] Migrate the user's actual browser records — user must use “ย้ายข้อมูลเดิมไป Cloud” and “ย้าย Hotel Profile ไป Cloud” in their preview; sandbox cannot access their local records.
- [ ] Verify scheduled callback delivery after publication — requires user-requested publication; app is currently unpublished.

## Cloud Sync Level A v1.0
- [x] Per-collection docs, debounce + Sync now, revision lock with keep-cloud/force, views repointed
- [x] 2-tab conflict test
- [ ] One-time seed from the machine with complete data (user action)
- [x] AC daily job repointed to browser split docs; button restored

## PS Dashboard · Task tab v1.0
- [x] ticket / ticket_activity / ticket_category + 19-row seed, revision lock, no assignee/priority
- [x] Ticket UI (manage bar, table, create modal, drawer, waiting reason, reopen, timeline, actor dropdown)
- [x] Work monitor ①–④ (read-only, empty until seed), Layer 3 skeleton, 2 Headline tiles, filter/compare mapping, demo
- [ ] Monitor data — blocked: coaching/assignment/renewal/onboarding mirrors not in Cloud yet (seed + C5)
- [ ] Per-category aging thresholds — awaiting PM (O-T1); default 3 days

- [x] Account Health + 360 v1.0 (demo verified)
- [ ] Account Health live data: waits on Cloud mirrors for contract billing type, Production Report revenue, ORM tier; value-ratio cutoff + thresholds await business confirmation

## Proactive Alert BOT v1.0 (done 2026-10-17)
- [x] tickets extended: 3 BOT types (RENEWAL_DUE/GRADE_RISK/SURVEY_LOW), SYSTEM:THE_OFFICE creator, BOT payload fields — no new collection
- [x] BOT scan engine (src/lib/alert-bot.ts) as post-step of AC Daily Job button; demo trigger "ประมวลผล Alert (ชั่วคราว)" in PM Workspace
- [x] Dedup (hotel+type+event_key) + monthly grade-cycle cooldown; condition-cleared stamp, never auto-close; no CANCEL on BOT tickets
- [x] 🎫 lane query extended additively (target_dept OR watchers) — watcher rows read-only 👁 FYI; digest header ใหม่/ค้าง/รอปิด
- [x] Sidebar module links propagate ?demo=1 (demo follows navigation)
- [x] 7 BOT tests + full suite 39 pass; browser-verified demo oracle (create/FYI/dedup)
- [ ] Open: cross-machine delivery gated on Cloud Sync Level B (O-TK2); live signals fire only after Cloud Sync seed
