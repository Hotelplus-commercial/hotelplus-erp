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

- Servicing uses two existing surfaces: PS Dashboard is view-only monitoring after Contract Overview, while On-boarding Process owns creation and guided work; this prevents duplicate actions.
- Servicing stage events are append-only and created by gated in-app actions; historical demo data remains separate from live action timestamps.
- Servicing role flags are workflow simulation only, not authentication or authorization; do not treat them as production security.
- Servicing remains a browser-local prototype until authenticated shared persistence is explicitly scoped; Cloud activation alone does not migrate workflow data.
- Servicing cross-app links share one service-stage-only control, hydrate missing scaffold fields without replacing local data, and allow only HTTP(S) destinations; this keeps native work intact and prevents unsafe navigation.

- Contract Prop Info (display stage 10, lifecycle step 11) uses the root ServicingProvider and the manual-card initializer; deduplicate by contract reference/service line before recording handoff so menu 8 reads the same cards and no legacy shadow write can double-create.
