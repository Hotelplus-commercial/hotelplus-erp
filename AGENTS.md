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

- Servicing has one data store and one role-aware guided drawer (ServicingCardDrawer); every surface (AE Zone 3, Property Info, My Tasks, menu 8, PS Dashboard read-only) opens that drawer instead of its own board, so work is never duplicated.
- Zone 3 navigates to the existing menu-8 full Pipeline with a card/mode hash before opening the shared drawer; only the drawer advances stages, preserving one working board and direct My Day entry.
- Servicing stage events are append-only and created by gated in-app actions; historical demo data remains separate from live action timestamps.
- Servicing role flags are workflow simulation only, not authentication or authorization; do not treat them as production security.
- Servicing UAT test mode lives in the shared provider and is hard-disabled outside development; it bypasses checklist ticking roles only, preserving read-only surfaces and every other workflow permission to prevent production bypass.
- Servicing remains a browser-local prototype until authenticated shared persistence is explicitly scoped; Cloud activation alone does not migrate workflow data.
- Servicing cross-app links share one service-stage-only control, hydrate missing scaffold fields without replacing local data, and allow only HTTP(S) destinations; this keeps native work intact and prevents unsafe navigation.

- Contract Prop Info (display stage 10, lifecycle step 11) uses the root ServicingProvider and the manual-card initializer; deduplicate by contract reference/service line before recording handoff so menu 8 reads the same cards and no legacy shadow write can double-create.
- Service checklists are instantiated per card from PM-managed templates by service variant and never gate stage advance; explicit handover and appointment gates are evaluated separately.
- Pipeline columns include the conditional pending stage, while drawer rails include it only for cards with a pending event or current pending stage; keeps parked cards visible without changing the default forward path.
- ORM handover uses one per-card OTA scope; Specialist row-1 (4 parts) runs in parallel from Approved to Final Setup (ceiling), Completed (Handover) sits after Final Setup for row-2 acceptance + Survey #1 before System Training; Marcom has no Completed stage. Billing start and Survey #2 fire only from the explicit customer-email action.
- WS-2 property form data lives in its own browser-local store (src/lib/ws2-store.tsx) keyed by Hotel ID, with templates generated as JSON field dictionaries under src/lib/ws2/templates; it only reads cards and never gates Servicing stages, keeping the pipeline engine untouched.
- Template Management lives only in the PS Templates menu (src/components/ps/template-catalogue.tsx + src/lib/email-templates.tsx); cards show checklists tick-only, and emails snapshot rendered text at send so past sends never change.
- AC v1 duplicate ledger is retired; original CRM entities and IDs are persisted in one versioned Cloud document with compare-and-swap transactions, preserving existing entity shapes and avoiding a second parallel accounting model.
- Public accounting migration/access is development-only on the server; published routes stay public but privileged prototype data operations are rejected to prevent public access to real financial records.
- AC billing uses one pure accounting engine for report arrival, AC confirmation and the authenticated daily callback; this keeps tax, grade and idempotency rules consistent across entry points.
- AC reporting views project canonical invoices with stable hotel IDs and service-aware WS-2 profile owners; retain legacy view column types, and never use contract/subscription owner snapshots as the assignment master. WS-2 SQL projection awaits a future snapshot within the hotels document; this pass never adds sync.
- AC payment summaries use one pure recurring-grade selector; lifecycle ignores debt and collection derivation preserves manual terminal events until explicit reactivation, preventing contradictory scores and statuses.
- Stable hotel IDs are resolved uniquely at canonical contract ingestion/backfill and copied to invoices; unresolved or ambiguous identity is never guessed in attribution.
- Canonical document saves use revision compare-and-swap with a retained local backup; conflicts stop synchronization rather than overwrite another writer's changes.
- The legacy /ac/operations URL redirects to the original /ac/billing page so saved links do not open a removed console.
- BD-AC charts consume only existing view projections and use a scoped theme backed by global CSS tokens; this preserves analytics, workflow writes and unrelated module styling.
