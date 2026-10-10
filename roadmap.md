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
