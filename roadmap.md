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
- [x] PS Dashboard Pipeline accepts Zone 3 card deep-link (auto-expand stage, auto-open drawer, role-aware actionable) + ของฉัน chip (default off).
- [x] Zone 3 ทำต่อ/ดูสถานะ navigate to PS Dashboard Pipeline; back-link ← กลับงานของฉัน (Zone 3).
- [x] Tier A Meeting Pipeline card + mock removed.
