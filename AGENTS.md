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
- Service checklists are instantiated per card from PM-managed templates by service variant and never gate stage advance; keeps the two hard gates the only blockers.
- Pipeline columns include the conditional pending stage, while drawer rails include it only for cards with a pending event or current pending stage; keeps parked cards visible without changing the default forward path.
- ORM Handover (Approved→Completed) is instantiated from PM-managed 2-tick OTA templates plus per-card OTA log-ins and room mapping; all three must be complete to unlock Completed, and Marcom has no handover — keeps the hard gate data-driven.
