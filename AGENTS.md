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

- All Servicing surfaces (Zone 3, Property Info, My Tasks, menu 8, read-only PS Dashboard) share one store and ServicingCardDrawer; avoid duplicate work.
- Zone 3 navigates to the existing menu-8 full Pipeline with a card/mode hash before opening the shared drawer; only the drawer advances stages, preserving one working board and direct My Day entry.
- Servicing stage events are append-only and created by gated in-app actions; historical demo data remains separate from live action timestamps.
- Servicing role flags are workflow simulation only, not authentication or authorization; do not treat them as production security.
- Shared development-only Servicing UAT bypasses checklist ticking roles only, preserving read-only surfaces and all other permissions; prevent production bypass.
- Servicing stays browser-local until authenticated shared persistence is scoped; Cloud activation never migrates workflow data.
- Servicing links are service-stage-only, HTTP(S)-only and hydrate missing scaffold fields without replacing local data; preserve native work and safe navigation.

- Prop Info (display 10, lifecycle 11) uses root ServicingProvider/manual initializer; deduplicate contract reference/service before handoff, preventing shadow cards.
- Service checklists are instantiated per card from PM-managed templates by service variant and never gate stage advance; explicit handover and appointment gates are evaluated separately.
- Pipeline columns include the conditional pending stage, while drawer rails include it only for cards with a pending event or current pending stage; keeps parked cards visible without changing the default forward path.
- ORM handover uses one per-card OTA scope; Specialist row-1 (4 parts) runs in parallel from Approved to Final Setup (ceiling), Completed (Handover) sits after Final Setup for row-2 acceptance + Survey #1 before System Training; Marcom has no Completed stage. Billing start and Survey #2 fire only from the explicit customer-email action.
- WS-2 is browser-local, keyed by Hotel ID with JSON field dictionaries; it reads cards without gating Servicing, preserving the pipeline engine.
- Template Management lives only in PS Templates; card checklists are tick-only and emails snapshot rendered text at send, preserving past sends.
- AC v1 is retired; original CRM IDs/shapes use split Cloud documents with revision CAS, avoiding a parallel ledger.
- Cloud mirror writes are open in test mode (push-only, no payload reads); close before production. AC daily processing is a manual browser action on the split write-layer with no cloud I/O; the server callback is a no-op so nothing reads the deprecated combined crm document.
- AC billing uses one pure accounting engine for report arrival, AC confirmation and the authenticated daily callback; this keeps tax, grade and idempotency rules consistent across entry points.
- AC views use canonical invoices, stable hotel IDs and WS-2 service owners, never contract/subscription snapshots; retain column types and no extra sync (WS-2 SQL awaits a hotels snapshot).
- AC payment summaries use one pure recurring-grade selector; lifecycle ignores debt and collection derivation preserves manual terminal events until explicit reactivation, preventing contradictory scores and statuses.
- Canonical ingestion/backfill copies uniquely resolved hotel IDs to invoices; never guess ambiguous attribution.
- Canonical document saves use revision compare-and-swap with a retained local backup; conflicts stop synchronization rather than overwrite another writer's changes.
- The legacy /ac/operations URL redirects to the original /ac/billing page so saved links do not open a removed console.
- BD-AC charts consume only existing view projections and use a scoped theme backed by global CSS tokens; this preserves analytics, workflow writes and unrelated module styling.

- Level A pushes crm:<collection>|hotels|ws2 with revision lock; no payload pull; WS2 excludes credentials.

- PS uses safe paginated v_ps_* reports; absent mirrors stay pending, not inferred from signing status.
- Risk rules use TemplateMgmtProvider and simulated PM/Admin; dashboard never writes business state.
- Renewal effective end is forward-only; never guess contract/service linkage from hotel-only mocks.

- Dashboard filters and A/B periods share one React context and pure selectors; ownershipless aggregates stay empty under ownership lenses rather than imply attribution.
- Preview demo adapters derive PS/AC/BD-AC/portfolio/servicing from one bundled spine, with URL/state switching and no provider writes; this keeps cross-tab invariants and fresh-share rendering deterministic.
- Meeting reporting uses a publishable server client over narrow v_meeting_* projections and pure read-only selectors; absent meeting mirrors/monthly caretaker history stay empty rather than exposing private documents or guessing current attribution.
- Meeting demo derives hotel/service identities from the existing contract spine and keeps rubric empty; reporting fixtures never mutate upstream meeting, survey or coaching stores.
