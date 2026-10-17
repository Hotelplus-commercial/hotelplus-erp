# Servicing v2 build report

## Delivered
Definitions → five stats → Pipeline/drill → owner phase timing → Overall Go-Live. The existing assignment modal and guided drawer remain the only operational paths. New stall tickets use Ticket L0; the existing manual AC daily button reads explicit Cloud stall/finished projections. Empty sources never fire or clear tickets. No scheduler, login, table, collection, stored day count or workflow gate was added.

## Field mapping
- onboarding_card = existing browser-local OnboardingCard; create_date = created_at; card/hotel = id/property_id in operations and card_id/hotel_id in reports.
- entered_at = StageEvent.entered_at; newest event for a repeated stage is selected. Operational completed maps to reporting completed_handover only.
- specialist_handover_done_at and meeting_date are the existing fields. New optional meeting_created_at is written by the existing drawer setter on first date setting, retained on edits/clear, never backfilled for an already scheduled legacy card.
- Marcom MT = MARCOM_META_TIKTOK operationally, MARCOM_MT in PI forms.
- Assignment transition log = ws2.log entries with assign.assigned_ae_id / assign.assigned_specialist_id / assign.orm_team / assign.marcom_member_id. The pure owner-at-end adapter chooses latest entry before phase end; absent entry falls back to current caretaker. Live projections must supply this attribution.
- HR acting flags = AssignRole PM / GRM / MARCOM_LEAD. HrMember has no stored member-level leadership flags. Recipient stays unassigned in the correct department, not guessed from function or the acting-role picker.

## BOT
Existing Alert BOT extended with SERVICING_STALL: red running lanes only, one event key ever, open payload refresh, explicit end/Go-Live stamps cleared without closing. Manual PM amber/red uses the same event dedup; service targets have PS watcher. BOT candidates remain empty until the Cloud mirror is supplied.

## Counts and exceptions
- Demo: 37 cards / 35 hotels / 22 Go Live / 15 in progress / red 4 / amber 4 / gaps 2. Owner ORM answer 39%, P2 median 6, P3 median 4. July 18 day hover = 27 and 11 days, median 19.
- In-progress demo meeting_created_at null: 9. Live count and owner-at-end fallback count are unavailable, not zero, because all Cloud projections are pending empty. Demo owners are explicit fixture labels (no guessed joins).
- Existing interpolated quartile helper retained. ORM IQR is 17.25–23 (document says 17–23); Marcom median is 13 and IQR 11.75–16 (document says 11.5–17). Literal fixture durations and existing formulas were not changed to force the oracle.
- Headline Onboarding is currently — and its demo uses the older spine. It remains unchanged per the hard restriction on headline logic/other tabs, so the new 15-card fixture does not silently overwrite other tabs.
- No Cloud onboarding_card table exists. Adding/syncing one would violate the explicit local-only boundary, so meeting_created_at is registered on the existing local type and pending report projection only; operational Cloud push awaits a future mirror decision.

## Verification
82 tests pass. Browser verifies desktop/390px no page overflow, eight default drill rows, PM optimistic ticket → badge/no duplicate button, Marcom in-progress four and restricted chart options, note persistence, owner dot and Go-Live day tooltips, live empty skeletons. Actual existing menu-8 drawer set/edit/clear/reload retains first meeting timestamp and reads back date. Shared OnboardingCardContent/PI chip is wired to Zone 3 and menu 8; menu-8 actual rendering checked. Zone-3 required-filled live display requires an assigned AE/form fixture and remains unverified end-to-end. All operational browser checks blocked external Cloud writes.